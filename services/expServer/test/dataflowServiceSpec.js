const { expect, assert } = require('chai');

describe("sdk dataflow service Test", () => {
    require('xcalar');
    require('../utils/dag/dagUtils.js');
    require('../utils/sqlUtils.js');

    const df_pb = proto.xcalar.compute.localtypes.Dataflow;
    const dfManager = require(__dirname +
        '/../../expServer/controllers/sdk_service_impls/dataflowService.js');

    oldIndexFunc = XIApi.getIndexTable;

    describe("Functional Test", () => {
        before(() => {
            XIApi.getIndexTable = () => null;
        })

        // example
        it("indexFromDataset should work", async () => {
            let indexFromDatasetResp;
            const oldFunc = XIApi.indexFromDataset;

            const ret = {
                newTableName: "UnitTestTable",
                prefix: "UnitTestPrefix"
            }
            XIApi.indexFromDataset = () => PromiseHelper.resolve(ret);
            let req = new df_pb.IndexFromDatasetRequest();

            try {
                indexFromDatasetResp = await convertPromise(
                    dfManager.IndexFromDataset(req));
                expect(indexFromDatasetResp != null).to.be.true;
                expect(indexFromDatasetResp.getNewtablename()).to.eq(ret.newTableName);
                expect(indexFromDatasetResp.getPrefix()).to.eq(ret.prefix);
            } catch(e) {
                errorHandling(e);
            } finally {
                XIApi.indexFromDataset = oldFunc;
            }
        });
        it("indexFromDataset should fail", async () => {
            const oldFunc = XIApi.indexFromDataset;

            const error = "Error";
            XIApi.indexFromDataset = () => PromiseHelper.reject(error);
            let req = new df_pb.IndexFromDatasetRequest();

            try {
                await convertPromise(
                    dfManager.IndexFromDataset(req));
                assert.fail("indexFromDataset should fail!");
            } catch(e) {
                expect(e).to.eq(error)
            } finally {
                XIApi.indexFromDataset = oldFunc
            }
        });

        const testCases = [
            {
                name: "Filter",
                exec: dfManager.Filter,
                stepOut: XIApi.filter,
                fakeEval: "XIApi.filter = fakeFunc",
                resumeEval: "XIApi.filter = oldFunc",
                req: df_pb.FilterRequest,
                ret: "newTableName",
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    }
                ]
            },
            {
                name: "Aggregate",
                exec: dfManager.Aggregate,
                stepOut: XIApi.aggregate,
                fakeEval: "XIApi.aggregate = fakeFunc",
                resumeEval: "XIApi.aggregate = oldFunc",
                req: df_pb.AggregateRequest,
                ret: "aggVal",
                resp_results: [
                    {
                        eval: "resp.getAggval()",
                        res: "aggVal"
                    },
                    {
                        eval: "resp.getDstaggname()",
                        res: ""
                    },
                    {
                        eval: "resp.getTodelete()",
                        res: false
                    }
                ]
            },
            {
                name: "Map",
                exec: dfManager.Map,
                stepOut: XIApi.map,
                fakeEval: "XIApi.map = fakeFunc",
                resumeEval: "XIApi.map = oldFunc",
                req: df_pb.MapRequest,
                ret: "dstTable",
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "dstTable"
                    }
                ]
            },
            {
                name: "GenRowNum",
                exec: dfManager.GenRowNum,
                stepOut: XIApi.genRowNum,
                fakeEval: "XIApi.genRowNum = fakeFunc",
                resumeEval: "XIApi.genRowNum = oldFunc",
                req: df_pb.GenRowNumRequest,
                ret: "dstTable",
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "dstTable"
                    }
                ]
            },
            {
                name: "Project",
                exec: dfManager.Project,
                stepOut: XIApi.project,
                fakeEval: "XIApi.project = fakeFunc",
                resumeEval: "XIApi.project = oldFunc",
                req: df_pb.ProjectRequest,
                ret: "dstTable",
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "dstTable"
                    }
                ]
            },
            {
                name: "UnionOp",
                exec: dfManager.UnionOp,
                stepOut: XIApi.union,
                fakeEval: "XIApi.union = fakeFunc",
                resumeEval: "XIApi.union = oldFunc",
                req: df_pb.UnionRequest,
                reqSetEval: "let tableInfo = new df_pb.UnionTableInfo();" +
                    "let colInfo = new df_pb.UnionColInfo();" +
                    "tableInfo.setColumnsList([colInfo]);" +
                    "req.setTableinfosList([tableInfo]);",
                ret: {
                    newTableName: "newTableName",
                    newTableCols: [
                        {
                            rename: "retRename",
                            type: ["type"]
                        }
                    ]
                },
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    }
                ]
            },
            {
                name: "Join",
                exec: dfManager.Join,
                stepOut: XIApi.join,
                fakeEval: "XIApi.join = fakeFunc",
                resumeEval: "XIApi.join = oldFunc",
                req: df_pb.JoinRequest,
                reqSetEval: "let tableInfo = new df_pb.JoinTableInfo();" +
                    "let colInfo = new df_pb.ColRenameInfo();" +
                    "tableInfo.setRenameList([colInfo]);" +
                    "req.setLtableinfo(tableInfo);" +
                    "req.setRtableinfo(tableInfo);" +
                    "let options = new df_pb.JoinOptions();" +
                    "req.setOptions(options);",
                ret: {
                    newTableName: "newTableName",
                    // this fit getColRenameMsg2
                    lRename: {
                            orig: "lorig",
                            new: "lnew",
                            type: "ltype"
                    },
                    rRename: {
                            orig: 'rorig',
                            new: 'rnew',
                            type: 'rtype'
                    }
                    // this fit getColRenameMsg
                    // lRename: [
                    //     {
                    //         orig: "lorig",
                    //         new: "lnew",
                    //         type: "ltype"
                    //     }
                    // ],
                    // rRename: [
                    //     {
                    //         orig: 'rorig',
                    //         new: 'rnew',
                    //         type: 'rtype'
                    //     }
                    // ]
                },
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    },
                    {
                        eval: "resp.getLrename()",
                        res: eval("let tmp = new df_pb.ColRenameInfo();" +
                            "tmp.setOrig('lorig');" +
                            "tmp.setNew('lnew');" +
                            "tmp.setType('ltype');" +
                            "tmp")
                    },
                    {
                        eval: 'resp.getRrename()',
                        res: eval("let tmp = new df_pb.ColRenameInfo();" +
                            "tmp.setOrig('rorig');" +
                            "tmp.setNew('rnew');" +
                            "tmp.setType('rtype');" +
                            "tmp")
                    }
                ]
            },
            {
                name: "GroupBy",
                exec: dfManager.GroupBy,
                stepOut: XIApi.groupBy,
                fakeEval: "XIApi.groupBy = fakeFunc",
                resumeEval: "XIApi.groupBy = oldFunc",
                req: df_pb.GroupByRequest,
                reqSetEval: "let aggColInfo = new df_pb.AggColInfo();" +
                    "req.setAggargsList([aggColInfo]);" +
                    "let options = new df_pb.GroupByOptions();" +
                    "req.setOptions(options)",
                ret: {
                    finalTable: "finalTable",
                    newKeyFieldName: "newKeyFieldName",
                    newKeys: ["newKeys"],
                },
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "finalTable"
                    },
                    {
                        eval: "resp.getNewkeyfieldname()",
                        res: "newKeyFieldName"
                    },
                    {
                        eval: "resp.getNewkeysList()",
                        res: ["newKeys"]
                    }
                ]
            },
            {
                name: "Index",
                exec: dfManager.Index,
                stepOut: XIApi.index,
                fakeEval: "XIApi.index = fakeFunc",
                resumeEval: "XIApi.index = oldFunc",
                req: df_pb.IndexRequest,
                ret: {
                    newTableName: "newTableName",
                    isCache: true,
                    newKeys: ["newKeys"]
                },
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    },
                    {
                        eval: "resp.getIscache()",
                        res: true
                    },
                    {
                        eval: "resp.getNewkeysList()",
                        res: ["newKeys"]
                    }
                ]
            },
            {
                name: "Sort",
                exec: dfManager.Sort,
                stepOut: XIApi.sort,
                fakeEval: "XIApi.sort = fakeFunc",
                resumeEval: "XIApi.sort = oldFunc",
                req: df_pb.SortRequest,
                reqSetEval: "let keyInfo = new df_pb.SortRequest.keyInfo();" +
                    "req.setKeyinfosList([keyInfo]);",
                ret: {
                    newTableName: "newTableName",
                    newKeys: "newKeys"
                },
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    },
                    {
                        eval: "resp.getNewkeysList()",
                        res: "newKeys"
                    }
                ]
            },
            {
                name: "Synthesize",
                exec: dfManager.Synthesize,
                stepOut: XIApi.synthesize,
                fakeEval: "XIApi.synthesize = fakeFunc",
                resumeEval: "XIApi.synthesize = oldFunc",
                req: df_pb.SynthesizeRequest,
                reqSetEval: "let colInfo = new df_pb.ColRenameInfo();" +
                    "req.setColinfosList([colInfo])",
                ret: "newTableName",
                resp_results: [
                    {
                        eval: "resp.getNewtablename()",
                        res: "newTableName"
                    }
                ]
            },
        ]

        for (let testCase of testCases) {
            it(`dfManager.${testCase.name} should work`, async () => {
                let resp;
                const oldFunc = testCase.stepOut;
                const fakeFunc = () => PromiseHelper.resolve(testCase.ret);

                let req = new testCase.req();
                // set up nested request structure
                eval(testCase.reqSetEval);
                eval(testCase.fakeEval);
                try {
                    resp = await convertPromise(testCase.exec(req));
                    expect(resp != null).to.be.true;
                    for (resp_result of testCase.resp_results) {
                        expect(JSON.stringify(eval(resp_result.eval))).to
                            .eq(JSON.stringify(resp_result.res));
                    }
                } catch(e) {
                    console.log(e);
                    errorHandling(e);
                } finally {
                    eval(testCase.resumeEval);
                }
            });
            it(`dfManager.${testCase.name} should fail`, async () => {
                const oldFunc = testCase.stepOut;
                const fakeFunc = () => PromiseHelper.reject("Error");

                let req = new testCase.req();
                // set up nested request structure
                eval(testCase.reqSetEval);
                eval(testCase.fakeEval);
                try {
                    await convertPromise(testCase.exec(req));
                    assert.fail(`dfManager.${testCase.name} should fail`);
                } catch(e) {
                    expect(e).to.eq("Error")
                } finally {
                    eval(testCase.resumeEval);
                }
            });
        }

        after(() => {
            XIApi.getIndexTable = oldIndexFunc;
        })
    })
})

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
