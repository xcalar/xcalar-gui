const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const Xcrpc = require('xcalarsdk');
const sleep = require('util').promisify(setTimeout)
exports.testSuite = function(DagNodeService, DAGSCOPE) {
    describe("DagNodeService test: ", function () {
        this.timeout(60000);
        // XXX TODO: test all DagNodeService APIs
        // Need session implemented to access the workbook scope
        const id = (Math.floor(Math.random() * 90000) + 10000);
        const testUserName = "testUserSession" + id;
        const testSessionName = "testSessionSession" + id;
        const testCreateDSName = testUserName + "." + id + ".nation";
        const testCreateDSArgs = {"sourceArgsList":[{"targetName":"Default Shared Root","path":"/netstore/datasets/tpch_sf1_notrail/nation.tbl","fileNamePattern":"","recursive":false}],"parseArgs":{"parserFnName":"default:parseCsv","parserArgJson":"{\"recordDelim\":\"\\n\",\"fieldDelim\":\"|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}","allowRecordErrors":false,"allowFileErrors":false,"fileNameFieldName":"","recordNumFieldName":"","schema":[{"sourceColumn":"N_NATIONKEY","destColumn":"N_NATIONKEY","columnType":4},{"sourceColumn":"N_NAME","destColumn":"N_NAME","columnType":1},{"sourceColumn":"N_REGIONKEY","destColumn":"N_REGIONKEY","columnType":4},{"sourceColumn":"N_COMMENT","destColumn":"N_COMMENT","columnType":1}]},"size":10737418240};
        const testLoadArgs = '{"sourceArgsList":null,"parseArgs":null,"size":null}';
        const testLoadDSName = ".XcalarDS." + testCreateDSName;
        const testQueryName = "testXcalarQuery" + id;
        const testTableName = "table_DF2_5D324A043B307F6D_1563577542673_0_dag_5D324A043B307F6D_1563930449950_37#t_1563930487120_0";
        const testConstName = "testAgg_" + id;
        const testXcalarQuery = [
            {"operation": "XcalarApiIndex",
             "args": {
                 "source": testLoadDSName,
                 "dest": testTableName,
                 "key": [{"name":"xcalarRecordNum","type":"DfUnknown","keyFieldName":"","ordering":"Unordered"}],
                 "prefix": "nation",
                 "dhtName":"",
                 "delaySort": false,
                 "broadcast": false
                },
             "tag":"dag_5D324A043B307F6D_1563930449950_37"
            },
            {"operation": "XcalarApiAggregate",
             "args": {
                 "source": testTableName,
                 "dest": testConstName,
                 "eval": [{"evalString":"avg(nation::N_NATIONKEY)","newField":null}]
                },
                "tag":"dag_5D3902AF2FF1E96E_1564182762419_37"
            }
        ];

        before(async () => {
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSessionService().create({
                sessionName: testSessionName,
                fork: false,
                forkedSessionName: "",
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSessionService().activate({
                sessionName: testSessionName,
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getDatasetService().create({
                datasetName: testCreateDSName,
                loadArgs: testCreateDSArgs,
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getOperatorService().opBulkLoad({
                datasetName: testLoadDSName,
                loadArgs: JSON.parse(testLoadArgs),
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getQueryService().execute({
                queryName: testQueryName,
                queryString: JSON.stringify(testXcalarQuery),
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await sleep(2000);
         });

         it("pin() should work with table", async() => {
            try {
                // deleting table
                let result = await DagNodeService.pin({
                    tableName: testTableName,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result).to.be.undefined;
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });

        it("pin again should fail", async() => {
            try {
                // deleting table
                let result = await DagNodeService.pin({
                    tableName: testTableName,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });

                expect.fail(null, null, "should not pin an already pinned table");
            } catch(err) {
                expect(err.error).to.equal("Already pinned");
            }
        });

        it("delete() should not work with pinned table", async () => {
            try {
                // deleting table
                let result = await DagNodeService.delete({
                    namePattern: testTableName,
                    srcType: 2, //SourceTypeT.SrcTable
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect.fail(null, null, "should not delete a pinned table");
            } catch(err) {
                expect(err.error).to.equal('Pinned and cannot be dropped');
            }
        });

        it("unpin() should work with table", async() => {
            try {
                // deleting table
                let result = await DagNodeService.unpin({
                    tableName: testTableName,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result).to.be.undefined;
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });

        it("unpin again should fail", async() => {
            try {
                // deleting table
                let result = await DagNodeService.unpin({
                    tableName: testTableName,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });

                expect.fail(null, null, "should not unpin an already unpinned table");
            } catch(err) {
                expect(err.error).to.equal("Not pinned to unpin it");
            }
        });

        it("delete() should work with table", async () => {
            try {
                // deleting table
                let result = await DagNodeService.delete({
                    namePattern: testTableName,
                    srcType: 2, //SourceTypeT.SrcTable
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result.numNodes).to.equal(1);
                let statuses = result.statuses;
                expect(statuses.length === 1);
                expect(statuses[0].status).to.equal(Xcrpc.Error.status.STATUS_OK);
                expect(statuses[0].nodeInfo.name).to.equal(testTableName);
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });

        it("delete() should work with dataset", async() => {
            try {
                // deleting dataset
                let result = await DagNodeService.delete({
                    namePattern: testLoadDSName,
                    srcType: 1, //SourceTypeT.SrcDataset
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result.numNodes).to.equal(1);
                let statuses = result.statuses;
                expect(statuses.length === 1);
                expect(statuses[0].status).to.equal(Xcrpc.Error.status.STATUS_OK);
                expect(statuses[0].nodeInfo.name).to.equal(testLoadDSName);
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });

        it("delete() should work with constant", async() => {
            try {
                // deleting constant
                let result = await DagNodeService.delete({
                    namePattern: testConstName,
                    srcType: 3, //SourceTypeT.SrcConstant
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result.numNodes).to.equal(1);
                let statuses = result.statuses;
                expect(statuses.length === 1);
                expect(statuses[0].status).to.equal(Xcrpc.Error.status.STATUS_OK);
                expect(statuses[0].nodeInfo.name).to.equal(testConstName);
            } catch(err) {
                expect.fail(null, null, JSON.stringify(err));
            }
        });

        it("delet() should fail if dag node doesn't exist", async () => {
            let error;
            try {
                // deleting table that no longer exists
                let result = await DagNodeService.delete({
                    namePattern: testTableName + "_non_existing",
                    srcType: 2, //SourceTypeT.SrcTable
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
            } catch(err) {
                error = err
            }
            if (error == null) {
                expect.fail(null, null, "delet() doesn't fail when dag node doesn't exist");
            }
            expect(error.type).to.equal(Xcrpc.Error.ErrorType.XCALAR);
            expect(error.status).to.equal(Xcrpc.Error.status.STATUS_DAG_NODE_NOT_FOUND);
            expect(error.error).to.equal(Xcrpc.EnumMap.StatusToStr[Xcrpc.Error.status.STATUS_DAG_NODE_NOT_FOUND]);
        });
    });
}