import { ServiceInfo } from "xcalar";
import * as xcConsole from "../../utils/expServerXcConsole";
import TransactionManager from "../transactionManager";

class SDKServiceMgr {
    private static _instance = null;
    public static get getInstance(): SDKServiceMgr {
        return this._instance || (this._instance = new this());
    }

    private _SERVICEREGISTRY: any = {
        Dataflow: require(__dirname + "/dataflowService"),
        Sql: require(__dirname + "/sqlService"),
        Workbook: require(__dirname + "/workbookService"),
    }
    private _SERVICEINFO: any = ServiceInfo;

    private constructor() {}

    private serializeResponse(serviceResponse: any): string {
        let msg: any = new proto.ProtoMsg();
        msg.setType(proto.ProtoMsgType.PROTOMSGTYPERESPONSE);
        msg.setResponse(new proto.ProtoResponseMsg());
        msg.getResponse().setRequestid(0);
        msg.getResponse().setStatus(0);
        msg.getResponse().setServic(serviceResponse);

        let responseBytes: Buffer = msg.serializeBinary();
        let resBase64: string = Buffer.from(responseBytes).toString("base64");
        return resBase64;
    }

    private unpackTo(anyReq: any, serviceName: string, methodName: string): any {
        let reqType: string  = this._SERVICEINFO[serviceName][methodName][0]
                                .split("\.").pop();
        let aReqObj: any = proto.xcalar.compute.localtypes[serviceName][reqType];
        return aReqObj.deserializeBinary(anyReq);
    }

    private packFrom(anyRes: any, serviceName: string, methodName: string): any {
        let resType: string = this._SERVICEINFO[serviceName][methodName][1];
        if (resType == "google.protobuf.Empty") {
            return;
        }
        let anyWrapper: any = new proto.google.protobuf.Any();
        anyWrapper.setValue(anyRes.serializeBinary());
        let typeUrl: string = `type.googleapis.com/${resType}`
        anyWrapper.setTypeUrl(typeUrl);
        return anyWrapper;
    }

    handleService(protoReqMsg: Buffer): XDPromise<any> {
        let deferred: any = PromiseHelper.deferred();
        let pMsg: any = proto.ProtoMsg.deserializeBinary(
                                            Array.from(protoReqMsg));
        let serviceReqMsg: any = pMsg.getRequest().getServic();
        let serviceName: string = serviceReqMsg.getServicename();
        if (!(serviceName in this._SERVICEREGISTRY)) {
            //The service is not implemented in expserver
            //need to route it to backend
            deferred.resolve({reqHandled: false, resp: null});
            return deferred.promise();
        }
        let methodName: string = serviceReqMsg.getMethodname();
        let serviceHandle: any = this._SERVICEREGISTRY[serviceName];
        let methodHandle: any = serviceHandle[methodName];
        if (methodHandle == null || typeof methodHandle != 'function') {
            //The method is not implemented in expserver
            //need to route it to backend
            deferred.resolve({reqHandled: false, resp: null});
            return deferred.promise();
        }
        xcConsole.log(`Service name:: ${serviceName}, ` +
                    `Method name:: ${methodName}`);
        let aReqMsg: any = this.unpackTo(serviceReqMsg.getBody().getValue(),
                                serviceName, methodName);
        let txId: number = TransactionManager.start(serviceName + ":" + methodName);
        methodHandle(aReqMsg)
        .then((res: any): void => {
            var anyRes = this.packFrom(res, serviceName, methodName);
            var serviceResponse = new proto.ServiceResponse();
            serviceResponse.setBody(anyRes);
            deferred.resolve({reqHandled: true,
                resp: this.serializeResponse(serviceResponse)});
        })
        .fail((err: any): void => {
            deferred.reject(err);
        })
        .always(() => {
            TransactionManager.done(txId);
        });
        return deferred.promise();
    }
}

const serviceMgr = SDKServiceMgr.getInstance;
export default serviceMgr;
