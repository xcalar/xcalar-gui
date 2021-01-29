const { expect, assert } = require('chai');
describe("sdk service Test", () => {
    require('xcalar');
    require(__dirname + '/../utils/dag/dagUtils.js');
    require(__dirname + '/../expServer.js')

    const wb_pb = proto.xcalar.compute.localtypes.Workbook
    const sdkService = require(__dirname +
        '/../controllers/sdk_service_impls/SDKServiceMgr.js').default;
    const xcrpcRouter = require(__dirname + '/../route/xcrpc.js');
    const request = require("request")

    function fakeServiceRegistry(fakeRegistry) {
        const oldRegistry = sdkService._SERVICEREGISTRY;
        sdkService._SERVICEREGISTRY = fakeRegistry;
        return oldRegistry;
    }
    function fakeServiceInfo(fakeInfo) {
        const oldInfo = sdkService._SERVICEINFO;
        sdkService._SERVICEINFO = fakeInfo;
        return oldInfo;
    }


    describe("Functional Test", () => {
        // XXX add functional test for xcrpcManager

        const fakeRegistry = {
            Workbook: {
                testMethod: () => {
                    let resp = new wb_pb.ConvertKvsToQueryResponse();
                    resp.setResultstring("test return");
                    return PromiseHelper.resolve(resp);
                },
                failMethod: () => PromiseHelper.reject("test error")
            },
            nullService: {
                nullMethod: null
            }
        }
        const fakeInfo = {
            Workbook: {
                testMethod: ["xcalar.compute.localtypes.Workbook.ConvertKvsToQueryRequest",
                    "xcalar.compute.localtypes.Workbook.ConvertKvsToQueryResponse"],
                failMethod: ["xcalar.compute.localtypes.Workbook.ConvertKvsToQueryRequest",
                    "xcalar.compute.localtypes.Workbook.ConvertKvsToQueryResponse"]
            }
        }
        let oldRegistry;
        let oldInfo;
        let sdkServiceResp;

        before(() => {
            oldRegistry = fakeServiceRegistry(fakeRegistry);
            oldInfo = fakeServiceInfo(fakeInfo);
        })

        after(() => {
            fakeServiceRegistry(oldRegistry);
            fakeServiceInfo(oldInfo);
        })

        it("SDKService.handleService should work", async () => {
            let req = new proto.ServiceRequest();
            req.setServicename("Workbook");
            req.setMethodname("testMethod");
            let body = new proto.google.protobuf.Any();
            req.setBody(body);
            req = serializeRequest(req);

            let reqBuf = Buffer.from(req, 'base64');

            try {
                sdkServiceResp = await convertPromise(
                    sdkService.handleService(reqBuf));
                expect(sdkServiceResp != null).to.be.true;
                expect(sdkServiceResp.reqHandled).to.be.true;
                let resp = proto.ProtoMsg.deserializeBinary(sdkServiceResp.resp)
                    .getResponse().getServic().getBody().getValue();
                resp = wb_pb.ConvertKvsToQueryResponse.deserializeBinary(resp);
                expect(resp.getResultstring()).to.eq("test return");
            } catch(e) {
                errorHandling(e);
            }
        });

        it("SDKService.handleService should return null with non-exist service",
            async () => {

            let req = new proto.ServiceRequest();
            req.setServicename("NonExist");
            req = serializeRequest(req);

            let reqBuf = Buffer.from(req, "base64");

            try {
                sdkServiceResp = await convertPromise(
                    sdkService.handleService(reqBuf));
                expect(sdkServiceResp != null).to.be.true;
                expect(sdkServiceResp.reqHandled).to.be.false;
                expect(sdkServiceResp.resp).to.be.null;
            } catch(e) {
                errorHandling(e);
            }
        })

        it("SDKService.handleService should return null with non-exist method",
            async () => {

            let req = new proto.ServiceRequest();
            req.setServicename("nullService");
            req.setMethodname("nullMethod");
            req = serializeRequest(req);

            let reqBuf = Buffer.from(req, "base64");

            try {
                sdkServiceResp = await convertPromise(
                    sdkService.handleService(reqBuf));
                expect(sdkServiceResp != null).to.be.true;
                expect(sdkServiceResp.reqHandled).to.be.false;
                expect(sdkServiceResp.resp).to.be.null;
            } catch(e) {
                errorHandling(e);
            }
        })

        it("SDKService.handleService should fail", async () => {
            let req = new proto.ServiceRequest();
            req.setServicename("Workbook");
            req.setMethodname("failMethod");
            let body = new proto.google.protobuf.Any();
            req.setBody(body);
            req = serializeRequest(req);

            let reqBuf = Buffer.from(req, 'base64');

            try {
                sdkServiceResp = await convertPromise(
                    sdkService.handleService(reqBuf));
                assert.fail("SDK Service should fail");
            } catch(e) {
                expect(e).to.eq("test error");
            }
        });
    })

    describe("Router Test", () => {
        const fakeRouteToXceFunc = (reqBuf, res) => {
            res.status(200).json({data: "route to xce"});
        };

        let data;
        let req
        let oldRouteToXceFunc;

        before(() => {
            oldRouteToXceFunc = xcrpcRouter.fakeRouteToXce(fakeRouteToXceFunc);
            data = {data: "test data"};
            req = {
                url: "http://localhost:12224/service/xce",
                json: data
            }
        })

        after(() => {
            xcrpcRouter.fakeRouteToXce(oldRouteToXceFunc);
        })

        it("expServer xcrpc router should work with handled service", (done) => {
            const fakeFunc = () => PromiseHelper.resolve({
                reqHandled: true,
                resp: "test return"
            })
            const oldFunc = sdkService.handleService;
            sdkService.handleService = fakeFunc;
            request.post(req, (err, res, body) => {
                sdkService.handleService = oldFunc;
                expect(body != null).to.be.true;
                expect(body.data).to.eq("test return");
                done();
            })
        })

        it("expServer xcrpc router should work with un-handled service",
            (done) => {
            const fakeFunc = () => PromiseHelper.resolve({
                reqHandled: false,
                resp: "test return"
            })
            const oldFunc = sdkService.handleService;
            sdkService.handleService = fakeFunc;
            request.post(req, (err, res, body) => {
                sdkService.handleService= oldFunc;
                expect(body != null).to.be.true;
                expect(body.data).to.eq("route to xce");
                done();
            })
        })
    })
})

function serializeRequest(serviceReq) {
    let msg = new proto.ProtoMsg();
    msg.setType(1);
    let request = new proto.ProtoRequestMsg();
    request.setRequestid(0);
    request.setChild(0);
    request.setTarget(4);
    request.setServic(serviceReq);
    msg.setRequest(request);
    return msg.serializeBinary();
}

function errorHandling(e) {
    if (e != null && e.type != null && typeof e.type === 'string') {
        assert.fail(e.type);
    } else {
        console.log(e);
        assert.fail(JSON.stringify(e || "unknown error"));
    }
}

function convertPromise(promise) {
    if (promise.fail != null) {
        // JQuery promise
        return new Promise((resolve, reject) => {
            try {
                promise.then((ret) => resolve(ret)).fail((e) => reject(e));
            } catch(e) {
                reject(e);
            }
        });
    } else {
        // Native promise
        return promise;
    }
}
