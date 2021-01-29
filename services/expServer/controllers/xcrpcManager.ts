import * as net from "net";
import TransactionManager from "./transactionManager";

interface ResponseMsg {
    error?: string,
    data?: string
}

class XcrpcManager {
    private static _instance = null;
    public static get getInstance(): XcrpcManager {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    routeToXce(reqBuf: Buffer, res: any): void {
        let reqSizeBuf: Buffer = Buffer.alloc(8);
        let respSizeBuf: Buffer = Buffer.alloc(0);
        let respSize: number = undefined; // number of bytes currently in respBuf
        let respBuf: Buffer = undefined;
        let response: ResponseMsg = {"error": "Unknown error occurred"};

        let udsPath: string = `/tmp/xcalar_sock/usrnode`;
        let timeoutMs: number = 5 * 60 * 60 * 1000; // 5 hours

        reqSizeBuf.writeUInt32LE(reqBuf.length, 0);
        reqSizeBuf.writeUInt32LE(0, 4); // Assume that our message size fits in 4 bytes
        let operationName = "xcrpc";
        let noTransaction = false;
        try {
            // find operation name
            // if request is kvStore lookup gInfo-1-commitKey then do not track
            // transaction as it's an auto-generated (by XD) api call
            let reqBody = proto.ProtoMsg.deserializeBinary(Array.from(reqBuf)).getRequest().getServic().getBody();
            operationName = reqBody.getTypeName() || "xcrpc";
            if (operationName === "xcalar.compute.localtypes.KvStore.LookupRequest") {
                let bodyValue = proto.xcalar.compute.localtypes.KvStore.LookupRequest.deserializeBinary(reqBody.getValue());
                noTransaction = (bodyValue.getKey().getName() === "gInfo-1-commitKey");
            } else if (operationName === "xcalar.compute.localtypes.Query.ListRequest") {
                noTransaction = true;
            }
        } catch (e) {
            // ignore errors, it's ok
        }
        let txId;
        if (!noTransaction) {
            txId = TransactionManager.start(operationName);
        }
        let socket: net.Socket = net.createConnection({ path: udsPath });
        socket.setTimeout(timeoutMs);
        socket.setKeepAlive(true);
        socket.on('connect', function() {
            socket.write(reqSizeBuf);
            socket.write(reqBuf);
        });
        socket.on('data', function(data) {
            // The response comes in 2 parts:
            //   1. 8 bytes for the size of the rest of the response
            //   2. The rest of the response
            // We're going to receive the response in some number of data events.
            // There is no guarantee about the size of the data events, so we have
            // to do extra work to make sure the first 8 bytes get processed as the
            // size, and that size is respected by the body of the response.
            //
            // If sizeBuf not full, fill it.
            // For remaining bytes, fill into response
            let sizeBytes: number = Math.min(8 - respSizeBuf.length, data.length);
            let respBytes: number = data.length - sizeBytes;
            if (sizeBytes > 0) {
                // We use Buffer.concat here for simplicity. Normally this will
                // come in a single message, bundled along with some data as well.
                let incrementalSizeBuf: Buffer = data.slice(0, sizeBytes);
                respSizeBuf = Buffer.concat([respSizeBuf, incrementalSizeBuf]);
                if (respSizeBuf.length === 8) {
                    // We now have the full length so we can deserialize it
                    // Assume that our message size fits in 4 bytes
                    let totalRespSize: number = respSizeBuf.readUInt32LE(0);
                    // Now that we know our expected response size, we can allocate
                    // the response buffer and start to fill it with the response
                    respBuf = Buffer.alloc(totalRespSize);
                    respSize = 0;
                }
            }
            if (respBytes > 0) {
                // We have bytes to read into our response
                // Check if this overflows our expected number of bytes
                if (respSize + respBytes > respBuf.length) {
                    // The server sent us more data than it promised
                    socket.destroy(new Error("Incorrect XCE response header"));
                } else {
                    // Copy from `data` into the response buffer and increment
                    // our current position within the response buffer
                    respSize += data.copy(respBuf, respSize, sizeBytes);
                    if (respBuf.length == respSize) {
                        response = {"data": respBuf.toString("base64")};
                        socket.destroy();
                    }
                }
            }
        });
        socket.on('error', function(err) {
            response = {"error": err.name + ": " + err.message};
        });
        socket.on('timeout', function() {
            if (!noTransaction) {
                TransactionManager.done(txId);
            }
            socket.destroy(new Error("XCE connection timed out"));
        });
        socket.on('close', function(hadError) {
            if (!noTransaction) {
                TransactionManager.done(txId);
            }
            let errCode: number = hadError ? 500 : 200;
            res.status(errCode).json(response);
        });
    }
}
const xcrpcManager = new XcrpcManager();
export default xcrpcManager;
