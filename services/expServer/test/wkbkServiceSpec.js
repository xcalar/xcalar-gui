const { expect, assert } = require('chai');

describe("sdk workbook service Test", () => {
    require('../../expServer/utils/dag/dagUtils.js');

    require('xcalar');
    const wkbk_pb = proto.xcalar.compute.localtypes.Workbook;
    const wkbkManager = require(__dirname +
        '/../../expServer/controllers/sdk_service_impls/workbookService.js');

    describe("Functional Test", () => {
        let oldFunc;
        const ret_query = "Workbook Service Unit Test";
        const fail_error = {
            type: "FAIL",
            node: {
                title: "WORKBOOK_SERVICE",
                type: "UNITTEST"
            }
        }
        const fail_query = fail_error.node.title + " (" +
            fail_error.node.type + ") - " + fail_error.type;
        let req = new wkbk_pb.ConvertKvsToQueryRequest();

        before(() => {
            oldFunc = DagHelper.convertKvs;
            req.setKvsstringList(["test"]);
            req.setDataflowname("testDF");
            req.setListxdfsoutput("testXdf");
            req.setUsername("testUser");
            req.setSessionid("testSession");
            req.setWorkbookname("testWorkbook");
        })
        it("ConvertKvsToQuery should work with Non-optimized DF", async () => {
            let convertKvsToQueryResp;
            req.setOptimized(false);

            DagHelper.convertKvs = () => PromiseHelper.resolve(ret_query);
            try {
                convertKvsToQueryResp = await convertPromise(
                    wkbkManager.ConvertKvsToQuery(req))
                expect(convertKvsToQueryResp != null).to.be.true;
                expect(convertKvsToQueryResp.getResultstring()).to.eq(ret_query);
            } catch(e) {
                if (e != null && e.type != null && typeof e.type === 'string') {
                    assert.fail(e.type);
                } else {
                    assert.fail(JSON.stringify(e || "unknown error"));
                }
            } finally {
                DagHelper.convertKvs = oldFunc;
            }
        });
        it("ConvertKvsToQuery should work with optimized DF", async () => {
            let convertKvsToQueryResp;
            req.setOptimized(true);

            DagHelper.convertKvs = () => PromiseHelper.resolve({
                retina: ret_query
            });
            try {
                convertKvsToQueryResp = await convertPromise(
                    wkbkManager.ConvertKvsToQuery(req))
                expect(convertKvsToQueryResp != null).to.be.true;
                expect(convertKvsToQueryResp.getResultstring()).to.
                    eq(JSON.stringify(ret_query))
            } catch(e) {
                console.log(e);
                if (e != null && e.type != null && typeof e.type === 'string') {
                    assert.fail(e.type);
                } else {
                    assert.fail(JSON.stringify(e || "unknown error"));
                }
            } finally {
                DagHelper.convertKvs = oldFunc;
            }
        });
        it('ConvertKvsToQuery should fail with xcrpc error', async() => {
            let convertKvsToQueryResp;

            DagHelper.convertKvs = () => PromiseHelper.reject(fail_error);
            try {
                convertKvsToQueryResp = await convertPromise(
                    wkbkManager.ConvertKvsToQuery(req))
                expect(convertKvsToQueryResp).not.to.be.null;
                expect(convertKvsToQueryResp.getResultstring()).to.eq(fail_query);
            } catch(e) {
                if (e != null && e.type != null && typeof e.type === 'string') {
                    assert.fail(e.type);
                } else {
                    assert.fail(JSON.stringify(e || "unknown error"));
                }
            } finally {
                DagHelper.convertKvs = oldFunc;
            }
        });
        it('ConvertKvsToQuery should fail with internal error', async() => {
            let convertKvsToQueryResp;
            const internal_error = {
                error: "Unit Test Error"
            }

            DagHelper.convertKvs = () => PromiseHelper.reject(internal_error);
            try {
                convertKvsToQueryResp = await convertPromise(
                    wkbkManager.ConvertKvsToQuery(req))
                assert.fail("ConvertKvsToQuery should fail with internal error");
            } catch(e) {
                expect(e).not.to.be.null;
            }
        });
    })
})

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