describe("sqlRestApi Test", function() {
    const { expect, assert } = require('chai');
    const request = require('request');
    require(__dirname + '/../expServer.js');
    const sqlManager = require(__dirname + '/../controllers/sqlManager.js').default;
    const support = require(__dirname + "/../utils/expServerSupport.js").default;
    const sqlUser = "xcalar-internal-sql";
    const sqlId = 4193719;
    const sqlWkbk = "xcalar_test_wkbk";
    const resolveStr = "fake test resolve";
    const rejectStr = "fake test reject";
    const sessionInfo = {
        userName: sqlUser,
        userId: sqlId,
        sessionName: sqlWkbk,
    }
    let fakeFunc;
    let fakeRejectFunc;
    let oldUpsertQuery;
    let oldCheckAuth;
    this.timeout(10000);

    function postRequest(action, url, req) {
        var deferred = jQuery.Deferred();
        // this ensures that returned JSON is parsed
        if (!req) {
            req = {};
        }
        var options = {
            "method": action,
            "uri": "http://localhost:12224" + url,
            "json": req,
        };

        request(options, function(error, response, body) {
            if (response.statusCode === httpStatus.OK) {
                deferred.resolve(response);
            } else {
                deferred.reject(response);
            }
        });
        return deferred.promise();
    }

    before(() => {
        sqlTable = xcHelper.randName("SQL") + Authentication.getHashId();
        path = __dirname.substring(0, __dirname.lastIndexOf("expServerSpec")) +
               "config/sqlTestDataset";
        sampleResult = {"execid": "0",
                        "schema": [{"R_REGIONKEY": "float"},
                                   {"R_NAME": "string"},
                                   {"_1": "integer"}],
                        "result": [[0, "AFRICA", 1],
                                   [1, "AMERICA", 1],
                                   [2, "ASIA", 1],
                                   [3, "EUROPE", 1],
                                   [4, "MIDDLE EAST", 1]]};
        nullPromise = function() {
            return PromiseHelper.resolve(null);
        };
        fakeFunc = function() {
            return PromiseHelper.resolve(resolveStr);
        };
        fakeRejectFunc = function() {
            return PromiseHelper.reject(rejectStr);
        };
        fakeCheck = function(req, res, next) {
            next();
        }
        tablePrefix = "XC_TABLENAME_";
        testSession = "testSession_";

        oldUpsertQuery = SqlQueryHistory.getInstance().upsertQuery;
        SqlQueryHistory.getInstance().upsertQuery = fakeFunc;
        oldCheckAuth = support.checkAuthImpl;
        support.checkAuthImpl = fakeCheck;
    });
    after(() => {
        SqlQueryHistory.getInstance().upsertQuery = oldUpsertQuery;
        support.checkAuthImpl = oldCheckAuth;
    })

    describe("Functional Test", function() {
        it("sqlManager.generateTablePrefix should work", () => {
            const expectedRe = new RegExp(`${sqlUser}_wkbk_${sqlWkbk}_[0-9]+_${sqlManager._idNum}`);
            const ret = sqlManager.generateTablePrefix(sqlUser, sqlWkbk);
            expect(expectedRe.test(ret)).to.be.true;
        });

        it("sqlManager.getUserIdUnique should work", () => {
            const hashFunc = (str) => {
                return "10000000000000";
            }
            expect(sqlManager.getUserIdUnique(sqlUser, hashFunc))
            .to.equal(4065536);
        })

        it("sqlManager.connect should work", (done) => {
            const oldGetVersion = XcalarGetVersion;
            XcalarGetVersion = fakeFunc;
            sqlManager.connect("localhost")
            .then((res) => {
                expect(res).not.to.be.null;
                expect(res.xcalarVersion).to.deep.equal(resolveStr);
                expect(res.newThrift).not.to.be.false;
                done();
            })
            .fail((err) => {
                done("sqlManager connect fails " + err);
            })
            .always(() => {
                XcalarGetVersion = oldGetVersion;
            })
        })

        it("sqlManager.activateWkbk should work", (done) => {
            const oldActivate = XcalarActivateWorkbook;
            XcalarActivateWorkbook = fakeFunc;

            let activeSessionNames = []
            sqlManager.activateWkbk(activeSessionNames, sessionInfo)
            .then((res) => {
                console.log("first res " + res);
                expect(res).to.equal("newly activated");
                activeSessionNames.push(sqlWkbk);
                sqlManager.activateWkbk(activeSessionNames, sessionInfo)
                .then((res) => {
                    console.log("second res " + res);
                    expect(res).to.equal("already activated");
                    done();
                })
                .fail(() => {
                    done("fail");
                })
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarActivateWorkbook = oldActivate;
            })
        });

        it("sqlManager.activateWkbk should fail when thrift call fails", (done) => {
            const oldActivate = XcalarActivateWorkbook;
            XcalarActivateWorkbook = fakeRejectFunc;

            sqlManager.activateWkbk([], sessionInfo)
            .then(() => {
                done("fail");
            })
            .fail((err) => {
                expect(err).to.equal("activation failed");
                done();
            })
            .always(() => {
                XcalarActivateWorkbook = oldActivate;
            })
        });

        it("sqlManager.goToSqlWkbk should work with the active wkbk", (done) => {
            const oldList = XcalarListWorkbooks;
            const oldActivate = sqlManager.activateWkbk;
            const oldSetSession = setSessionName;

            XcalarListWorkbooks = () => {
                const res = {
                    sessions: [{
                        name: sqlWkbk,
                        state: "Active",
                    }]
                }
                return PromiseHelper.resolve(res);
            };
            sqlManager.activateWkbk = fakeFunc;
            setSessionName = fakeFunc;

            sqlManager.goToSqlWkbk(sessionInfo)
            .then((res) => {
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarListWorkbooks = oldList;
                sqlManager.activateWkbk = oldActivate;
                setSessionName = oldSetSession;
            })
        })

        it("sqlManager.goToSqlWkbk should work without the active wkbk", (done) => {
            const oldList = XcalarListWorkbooks;
            const oldNewWkbk = XcalarNewWorkbook;
            const oldActivate = sqlManager.activateWkbk;
            const oldSetSession = setSessionName;

            XcalarListWorkbooks = () => {
                const res = {
                    sessions: [],
                }
                return PromiseHelper.resolve(res);
            };
            XcalarNewWorkbook = fakeFunc;
            sqlManager.activateWkbk = fakeFunc;
            setSessionName = fakeFunc;

            sqlManager.goToSqlWkbk(sessionInfo)
            .then((res) => {
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarListWorkbooks = oldList;
                XcalarNewWorkbook = oldNewWkbk;
                sqlManager.activateWkbk = oldActivate;
                setSessionName = oldSetSession;
            })
        })

        it("sqlManager.goToSqlWkbk should work with the StatusSessionExists Error wkbk", (done) => {
            const oldList = XcalarListWorkbooks;
            const oldNewWkbk = XcalarNewWorkbook;
            const oldActivate = sqlManager.activateWkbk;
            const oldSetSession = setSessionName;

            XcalarListWorkbooks = () => {
                const res = {
                    sessions: [],
                }
                return PromiseHelper.resolve(res);
            };
            XcalarNewWorkbook = () => {
                const res = {
                    status: StatusT.StatusSessionExists,
                }
                return PromiseHelper.reject(res);
            };
            sqlManager.activateWkbk = fakeFunc;
            setSessionName = fakeFunc;

            sqlManager.goToSqlWkbk(sessionInfo)
            .then((res) => {
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarListWorkbooks = oldList;
                XcalarNewWorkbook = oldNewWkbk;
                sqlManager.activateWkbk = oldActivate;
                setSessionName = oldSetSession;
            })
        })

        it("sqlManager.goToSqlWkbk should fail when new wkbk thrift call fails", (done) => {
            const oldList = XcalarListWorkbooks;
            const oldNewWkbk = XcalarNewWorkbook;
            const oldActivate = sqlManager.activateWkbk;
            const oldSetSession = setSessionName;
            const failError = {
                status: rejectStr,
            }

            XcalarListWorkbooks = () => {
                const res = {
                    sessions: [],
                }
                return PromiseHelper.resolve(res);
            };
            XcalarNewWorkbook = () => { return PromiseHelper.reject(failError); };
            sqlManager.activateWkbk = fakeFunc;
            setSessionName = fakeFunc;

            sqlManager.goToSqlWkbk(sessionInfo)
            .then(() => {
                done("fail");
            })
            .fail((err) => {
                expect(err).to.deep.equal(failError);
                done();
            })
            .always(() => {
                XcalarListWorkbooks = oldList;
                XcalarNewWorkbook = oldNewWkbk;
                sqlManager.activateWkbk = oldActivate;
                setSessionName = oldSetSession;
            })
        })

        it("sqlManager.setupConnection should work", (done) => {
            const oldConn = sqlManager.connect;
            const oldWkbk = sqlManager.goToSqlWkbk;

            sqlManager.connect = fakeFunc;
            sqlManager.goToSqlWkbk = fakeFunc;

            sqlManager.setupConnection(sqlUser, sqlId,sqlWkbk)
            .then((res) => {
                expect(res).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                sqlManager.connect = oldConn;
                sqlManager.goToSqlWkbk = oldWkbk;
            })
        })

        it("sqlManager.listAllTables should work", (done) => {
            const oldListPubs = XcalarListPublishedTables;
            const oldGetTbls = XcalarGetTables;
            const pubtbls = {
                tables: [
                    {
                        name: "pubTbl1",
                        active: true,
                    },
                    {
                        name: "pubTbl2",
                        active: false,
                    },
                ]
            };
            const xdtbls = {
                nodeInfo: [
                    {
                        name: "xdTbl1",
                    }
                ]
            };
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve(pubtbls);
            };
            XcalarGetTables = () => {
                return PromiseHelper.resolve(xdtbls);
            }

            let pubTables = new Map();
            let xdTables = new Map();
            sqlManager.listAllTables("*", pubTables, xdTables, sessionInfo)
            .then((res) => {
                expect(res).not.to.be.null;
                expect(res.pubTablesRes).to.deep.equal(pubtbls);
                expect(pubTables.has("PUBTBL1")).to.be.true;
                expect(xdTables.has("XDTBL1")).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarListPublishedTables = oldListPubs;
                XcalarGetTables = oldGetTbls;
            });

        })

        it("sqlManager.listAllTables should fail when errors", (done) => {
            const oldListPubs = XcalarListPublishedTables;
            const oldGetTbls = XcalarGetTables;
            const rejectFunc = () => {
                return PromiseHelper.reject();
            }
            const errorArg = StatusTStr[StatusT.StatusCanceled];
            XcalarListPublishedTables = fakeFunc;
            XcalarGetTables = () => { return PromiseHelper.reject(errorArg); };

            let pubTables = new Map();
            let xdTables = new Map();
            sqlManager.listAllTables("*", pubTables, xdTables, sessionInfo)
            .then(() => {
                done("fail");
            })
            .fail((err) => {
                expect(err).to.be.equal(StatusTStr[StatusT.StatusCanceled]);
                done();
            })
            .always(() => {
                XcalarListPublishedTables = oldListPubs;
                XcalarGetTables = oldGetTbls;
            });
        })

        it("sqlManager.listPublishedTables should work", (done) => {
            const oldListPubs = XcalarListPublishedTables;
            const pubtbls = {
                tables: [
                    {
                        name: "pubTbl3",
                        active: true,
                    },
                    {
                        name: "pubTbl4",
                        active: false,
                    },
                ]
            };
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve(pubtbls);
            }

            sqlManager.listPublishedTables("*")
            .then((res) => {
                expect(res).not.to.be.null;
                expect(res.pubTablesRes).to.deep.equal(pubtbls);
                expect(res.publishedTables).to.deep.equal(["pubTbl3"]);
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarListPublishedTables = oldListPubs;
            })
        })

        it("sqlManager.getTablesFromParserResult should work", () => {
            const setOfPubTables = new Map([
                ['PUBTBL1', 'v1'],
                ['PUBTBL2', 'v2'],
            ]);
            const setOfXDTables = new Map([
                ['XDTBL3', 'v3'],
                ['XDTBL4', 'v4'],
            ]);
            const identifiers = ["pubtbl1", "`pubtbl2`", "xdtbl3", "`xdtbl4`"];

            const res = sqlManager.getTablesFromParserResult(identifiers, {},
                setOfPubTables, setOfXDTables);
            expect(res).to.be.instanceOf(Array);
            expect(res[0]).to.deep.equal([{"identifier": "pubtbl1", "table": "v1"},
                                            {"identifier": "pubtbl2", "table": "v2"}]);
            expect(res[1]).to.deep.equal([{"identifier": "xdtbl3", "table": "v3"},
                                            {"identifier": "xdtbl4", "table": "v4"}]);
        })

        it("sqlManager.getTablesFromParserResult should work", () => {
            const setOfPubTables = new Map([
                ['PUBTBL1', 'v1'],
                ['PUBTBL2', 'v2'],
            ]);
            const setOfXDTables = new Map([
                ['XDTBL3', 'v3'],
                ['XDTBL4', 'v4'],
            ]);
            const identifiers = ["newPubtbl1", "`pubtbl2`", "xdtbl3", "`newXdtbl4`"];
            const identifiersMap = {"`newXdtbl4`": "`xdtbl4`", "newPubtbl1": "pubtbl1"}
            const res = sqlManager.getTablesFromParserResult(identifiers, identifiersMap,
                setOfPubTables, setOfXDTables);
            expect(res).to.be.instanceOf(Array);
            expect(res[0]).to.deep.equal([{"identifier": "newPubtbl1", "table": "v1"},
                                            {"identifier": "pubtbl2", "table": "v2"}]);
            expect(res[1]).to.deep.equal([{"identifier": "xdtbl3", "table": "v3"},
                                            {"identifier": "newXdtbl4", "table": "v4"}]);
        })

        it("sqlManager.getInfoForPublishedTable shoud work", () => {
            const pubTblReturn = {
                tables: [{
                    name: 'pubtbl1',
                    values: [{
                        name: "col1",
                        type: "DfInt32",
                    },{
                        name: "col2",
                        type: "DfBoolean",
                    },{
                        name: "col3",
                        type: "DfMoney",
                    }],
                }],
            };
            const resultTbl = {
                name: 'pubtbl1',
                values: [{
                    name: "col1",
                    type: "DfInt32",
                },{
                    name: "col2",
                    type: "DfBoolean",
                },{
                    name: "col3",
                    type: "DfMoney",
                }],
                schema: [{
                    "col1": "integer",
                },{
                    "col2": "boolean",
                },{
                    "col3": "money",
                }],
            };
            const res = sqlManager.getInfoForPublishedTable(pubTblReturn,
                "pubtbl1")
            expect(res).to.deep.equal(resultTbl);
        })

        it("sqlManager.getInfoForXdTable should work", (done) => {
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldGetTbl = XcalarGetTableMeta;
            const oldSyn = XIApi.synthesize;
            const oldDone = Transaction.done;
            const sessionInfo = {
                userName: sqlUser,
                userId: sqlId,
                sessionName: sqlWkbk,
            }
            const expectedRes = {
                pubTableName: "pubtbl",
                tableName: "testFinalTbl",
                query: {
                    value: "testQuery",
                },
                schema: [
                    {
                        "COL1": "integer",
                    },
                    {
                        "COL2": "string",
                    },
                ],
                isIMD: false,
            }

            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            XcalarGetTableMeta = () => {
                const ret = {
                    valueAttrs: [
                        {
                            name: "col1",
                            type: DfFieldTypeT.DfInt32,
                        },
                        {
                            name: "col2",
                            type: DfFieldTypeT.DfString,
                        }
                    ],
                }
                return PromiseHelper.resolve(ret);
            }
            XIApi.synthesize = () => {
                return PromiseHelper.resolve("testFinalTbl");
            }
            Transaction.done = () => {return JSON.stringify(expectedRes.query)};

            sqlManager.getInfoForXDTable(expectedRes.tableName, expectedRes.pubTableName, sessionInfo)
            .then((res) => {
                expect(res).to.deep.equal(expectedRes);
                done()
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                XcalarGetTableMeta = oldGetTbl;
                XIApi.synthesize = oldSyn;
                Transaction.done = oldDone;
            })
        })

        it("sqlManager.getInfoForXdTable should fail when error", (done) => {
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldGetTbl = XcalarGetTableMeta;
            const sessionInfo = {
                userName: sqlUser,
                userId: sqlId,
                sessionName: sqlWkbk,
            }

            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            XcalarGetTableMeta = fakeRejectFunc;

            sqlManager.getInfoForXDTable("pubtbl", "pubtbl", sessionInfo)
            .then((res) => {
                done("fail")
            })
            .fail((err) => {
                expect(err).to.equal(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                XcalarGetTableMeta = oldGetTbl;
            })
        })

        it("sqlManager.selectPublishedTables", () => {
            const args = [
                {
                    publishName: "pub1",
                    importTable: "import1",
                },
                {
                    publishName: "pub2",
                    importTable: "import2",
                },
            ];
            const allSchemas = {
                pub1: [
                    {
                        col1: "integer",
                    },
                    {
                        col2: "string",
                    },
                ],
                pub2: [
                    {
                        xcalarrankover: "integer",
                    },
                    {
                        col3: "boolean",
                    },
                ],
            }
            const expectedRes = [
                {
                    operation: "XcalarApiSelect",
                    args: {
                        source: args[0].publishName,
                        dest: args[0].importTable,
                        minBatchId: -1,
                        maxBatchId: -1,
                        columns: [
                            {
                                sourceColumn: "col1",
                                destColumn: "COL1",
                                columnType: "DfInt64",
                            },
                            {
                                sourceColumn: "col2",
                                destColumn: "COL2",
                                columnType: "DfString",
                            }
                        ]
                    }
                },
                {
                    operation: "XcalarApiSelect",
                    args: {
                        source: args[1].publishName,
                        dest: args[1].importTable,
                        minBatchId: -1,
                        maxBatchId: -1,
                        columns: [
                            {
                                sourceColumn: "col3",
                                destColumn: "COL3",
                                columnType: "DfBoolean",
                            },
                        ]
                    }
                }
            ]

            res = sqlManager.selectPublishedTables(args, allSchemas);
            expect(res).to.deep.equal(expectedRes);
        });

        it("sqlManager.collectTablesMetaInfo should work with odbc type", (done) => {
            const query = 'select * from test';
            const oldGetMeta = XcalarGetTableMeta;
            const oldListPub = sqlManager.listPublishedTables;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldGetTable = sqlManager.getTablesFromParserResult;
            const oldGetInfoPub = sqlManager.getInfoForPublishedTable;
            const oldGetInfoXd = sqlManager.getInfoForXDTable;
            const oldSelect = sqlManager.selectPublishedTables;
            const oldRand = xcHelper.randName;
            const oldHash = Authentication.getHashId;
            let id = 0;
            const sessionInfo = {
                userName: sqlUser,
                userId: sqlId,
                sessionName: sqlWkbk,
            }

            XcalarGetTableMeta = fakeFunc;
            sqlManager.listPublishedTables = () => {
                const ret = {
                    pubTablesRes: "pubTablesRes",
                    publishedTables: ['pub1', 'pub2'],
                }
                return PromiseHelper.resolve(ret);
            }
            sqlManager.sendToPlanner = () => {
                const data = {
                    ret: [{identifiers: "identifier"}],
                }
                return PromiseHelper.resolve(data);
            }
            sqlManager.getTablesFromParserResult = () => {
                const ret = [
                    [{"identifier": "imdtbl1", "table": "imdtbl1"},
                     {"identifier": "imdtbl2", "table": "imdtbl2"}],
                    [{"identifier": "xdtbl1", "table": "xdtbl1"},
                     {"identifier": "xdtbl2", "table": "xdtbl2"}]
                ]
                return ret;
            }
            sqlManager.getInfoForPublishedTable = () => {
                const ret = {
                    schema: "schema",
                    nextBatchId: 1,
                    selects: [
                        {
                            maxBatchId: 0,
                            minBatchId: 0,
                            dest: "selectTbl",
                        },
                    ]
                }
                return ret;
            }
            sqlManager.getInfoForXDTable = (name) => {
                const ret = {
                    pubTableName: name.toUpperCase(),
                    tableName: name,
                    query: query,
                    schema: "schema",
                    isIMD: false
                }
                return PromiseHelper.resolve(ret);
            }
            xcHelper.randName = () => { return "randName#"; }
            Authentication.getHashId = () => { return id++; }
            sqlManager.selectPublishedTables = () => { return []; }

            sqlManager.collectTablesMetaInfo(query, "tablePrefix", "odbc",
                sessionInfo)
            .then((query_array, allSchemas, allSelects) => {
                expect(query_array).to.be.instanceOf(Array);
                expect(query_array[0]).to.equal("select * from test");
                expect(allSchemas).to.deep.equal({
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                })
                expect(allSelects).to.deep.equal({
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                })
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarGetTableMeta = oldGetMeta;
                sqlManager.listPublishedTables = oldListPub;
                sqlManager.sendToPlanner = oldSend2Planner;
                sqlManager.getTablesFromParserResult = oldGetTable;
                sqlManager.getInfoForPublishedTable = oldGetInfoPub;
                sqlManager.getInfoForXDTable = oldGetInfoXd;
                sqlManager.selectPublishedTables = oldSelect;
                xcHelper.randName = oldRand;
                Authentication.getHashId = oldHash;
            })
        })

        it("sqlManager.collectTablesMetaInfo should work with odbc type", (done) => {
            const query = 'select * from test';
            const oldGetMeta = XcalarGetTableMeta;
            const oldListPub = sqlManager.listPublishedTables;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldGetTable = sqlManager.getTablesFromParserResult;
            const oldGetInfoPub = sqlManager.getInfoForPublishedTable;
            const oldGetInfoXd = sqlManager.getInfoForXDTable;
            const sessionInfo = {
                userName: sqlUser,
                userId: sqlId,
                sessionName: sqlWkbk,
            }
            const error = {
                error: "test error",
            }

            XcalarGetTableMeta = fakeFunc;
            sqlManager.listPublishedTables = () => {
                const ret = {
                    pubTablesRes: "pubTablesRes",
                    publishedTables: ['pub1', 'pub2'],
                }
                return PromiseHelper.resolve(ret);
            }
            sqlManager.sendToPlanner = () => {
                const data = {
                    ret: [{identifiers: "identifier"}],
                }
                return PromiseHelper.resolve(data);
            }
            sqlManager.getTablesFromParserResult = () => {
                const ret = [
                    [{"identifier": "imdtbl1", "table": "imdtbl1"},
                     {"identifier": "imdtbl2", "table": "imdtbl2"}],
                    [{"identifier": "xdtbl1", "table": "xdtbl1"},
                     {"identifier": "xdtbl2", "table": "xdtbl2"}]
                ]
                return ret;
            }
            sqlManager.getInfoForPublishedTable = () => {
                const ret = {
                    schema: "schema",
                    nextBatchId: 1,
                    selects: [
                        {
                            maxBatchId: 0,
                            minBatchId: 0,
                            dest: "selectTbl",
                        },
                    ]
                }
                return ret;
            }
            sqlManager.getInfoForXDTable = (name) => {
                return PromiseHelper.reject(error);
            }

            sqlManager.collectTablesMetaInfo(query, "tablePrefix", "odbc",
                sessionInfo)
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.deep.equal(error);
                done();
            })
            .always(() => {
                XcalarGetTableMeta = oldGetMeta;
                sqlManager.listPublishedTables = oldListPub;
                sqlManager.sendToPlanner = oldSend2Planner;
                sqlManager.getTablesFromParserResult = oldGetTable;
                sqlManager.getInfoForPublishedTable = oldGetInfoPub;
                sqlManager.getInfoForXDTable = oldGetInfoXd;
            })
        });

        it("sqlManager.executeSql should work with type odbc", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldCompile = SQLCompiler.compile;
            const oldAddPrefix = sqlManager.SqlUtil.addPrefix;
            const oldSQLExec = SQLExecutor.execute;
            const oldGetResults = sqlManager.SqlUtil.getResults;
            const oldDeleteTbl = XcalarDeleteTable;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: true,
                },
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                const sqlQuery = '{}';
                const schemas = {
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                }
                const selects = {
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                }
                return PromiseHelper.resolve(sqlQuery, schemas, selects);
            }
            sqlManager.sendToPlanner = () => {
                return PromiseHelper.resolve("sqldfPlan");
            }
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            SQLCompiler.compile = () => {
                const obj = {
                    xcQueryString: ',{}"',
                }
                return PromiseHelper.resolve(obj);
            }
            sqlManager.SqlUtil.addPrefix = () => {
                const prefix = {
                    query: "select * from test",
                    tableName: "sqlTbl",
                }
                return prefix;
            }
            SQLExecutor.execute = (obj) => {
                obj.status = SQLStatus.Done;
                obj.allColumns = "allColumns";
            };
            sqlManager.SqlUtil.getResults = fakeFunc;
            XcalarDeleteTable = fakeFunc;

            sqlManager.executeSql(params, "odbc")
            .then((res) => {
                expect(res).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
                sqlManager.sendToPlanner = oldSend2Planner;
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                SQLCompiler.compile = oldCompile;
                sqlManager.SqlUtil.addPrefix = oldAddPrefix;
                SQLExecutor.execute = oldSQLExec;
                sqlManager.SqlUtil.getResults = oldGetResults;
                XcalarDeleteTable = oldDeleteTbl;
            })
        })

        it("sqlManager.executeSql should work other type in optimized mode", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldCompile = SQLCompiler.compile;
            const oldOptimizer = LogicalOptimizer.optimize;
            const oldAddPrefix = sqlManager.SqlUtil.addPrefix;
            const oldSQLExec = SQLExecutor.execute;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: false,
                },
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                const sqlQuery = '{}';
                const schemas = {
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                }
                const selects = {
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                }
                return PromiseHelper.resolve(sqlQuery, schemas, selects);
            }
            sqlManager.sendToPlanner = () => {
                return PromiseHelper.resolve("sqldfPlan");
            }
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            SQLCompiler.compile = () => {
                const obj = {
                    xcQueryString: 'select * from test',
                }
                return PromiseHelper.resolve(obj);
            }
            LogicalOptimizer.optimize = () => {
                return {optimizedQueryString: "{}"};
            };
            sqlManager.SqlUtil.addPrefix = () => {
                const prefix = {
                    query: "select * from test",
                    tableName: "sqlTbl",
                }
                return prefix;
            }
            SQLExecutor.execute = (obj) => {
                obj.status = SQLStatus.Done;
                obj.allColumns = "allColumns";
                obj.newTableName = "sqlTbl";
                obj.orderColumns = "orderColumns";
            };

            sqlManager.executeSql(params)
            .then((res) => {
                expect(res).to.deep.equal({
                    tableName: "sqlTbl",
                    columns: "allColumns",
                    orderColumns: "orderColumns"
                });
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
                sqlManager.sendToPlanner = oldSend2Planner;
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                SQLCompiler.compile = oldCompile;
                LogicalOptimizer.optimize = oldOptimizer;
                sqlManager.SqlUtil.addPrefix = oldAddPrefix;
                SQLExecutor.execute = oldSQLExec;
            })
        });

        it("sqlManager.executeSql should fail when optimize error", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldCompile = SQLCompiler.compile;
            const oldOptimizer = LogicalOptimizer.optimize;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: false,
                },
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                const sqlQuery = '{}';
                const schemas = {
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                }
                const selects = {
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                }
                return PromiseHelper.resolve(sqlQuery, schemas, selects);
            }
            sqlManager.sendToPlanner = () => {
                return PromiseHelper.resolve("sqldfPlan");
            }
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            SQLCompiler.compile = () => {
                const obj = {
                    xcQueryString: 'select * from test',
                }
                return PromiseHelper.resolve(obj);
            }
            LogicalOptimizer.optimize = () => {
                throw rejectStr;
            };

            sqlManager.executeSql(params)
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.equal(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
                sqlManager.sendToPlanner = oldSend2Planner;
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                SQLCompiler.compile = oldCompile;
                LogicalOptimizer.optimize = oldOptimizer;
            })
        });

        it("sqlManager.executeSql should fail when connection errors", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldSetSession = sqlManager.SqlUtil.setSessionInfo;
            const oldDeleteTbl = XcalarDeleteTable;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: true,
                },
            }

            sqlManager.setupConnection = fakeRejectFunc;
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            XcalarDeleteTable = fakeFunc;

            sqlManager.executeSql(params, "odbc")
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).not.to.be.null;
                expect(err.error).to.equal(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.SqlUtil.setSessionInfo = oldSetSession;
                XcalarDeleteTable = oldDeleteTbl;
            })
        })

        it("sqlManager.getXCquery should work with type odbc", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldCompile = SQLCompiler.compile;
            const oldAddPrefix = sqlManager.SqlUtil.addPrefix;
            const oldOptimizer = LogicalOptimizer.optimize;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: true,
                },
            }
            const expectedRes = {
                prefixedQuery: "select * from test",
                orderedColumns: "allColumns",
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                const sqlQuery = '{}';
                const schemas = {
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                }
                const selects = {
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                }
                return PromiseHelper.resolve(sqlQuery, schemas, selects);
            }
            sqlManager.sendToPlanner = () => {
                return PromiseHelper.resolve("sqldfPlan");
            }
            SQLCompiler.compile = () => {
                const obj = {
                    xcQueryString: '',
                    allColumns: "allColumns",
                }
                return PromiseHelper.resolve(obj);
            }
            LogicalOptimizer.optimize = () => {
                return {optimizedQueryString: "{}"};
            };
            sqlManager.SqlUtil.addPrefix = () => {
                const prefix = {
                    query: "select * from test",
                    tableName: "sqlTbl",
                }
                return prefix;
            }

            sqlManager.getXCquery(params, "odbc")
            .then((res) => {
                expect(res).to.deep.equal(expectedRes);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
                sqlManager.sendToPlanner = oldSend2Planner;
                SQLCompiler.compile = oldCompile;
                sqlManager.SqlUtil.addPrefix = oldAddPrefix;
                LogicalOptimizer.optimize = oldOptimizer;
            })
        });

        it("sqlManager.getXCquery should fail when optimize errors", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;
            const oldSend2Planner = sqlManager.sendToPlanner;
            const oldCompile = SQLCompiler.compile;
            const oldAddPrefix = sqlManager.SqlUtil.addPrefix;
            const oldOptimizer = LogicalOptimizer.optimize;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: true,
                },
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                const sqlQuery = '{}';
                const schemas = {
                    imdtbl1: 'schema',
                    imdtbl2: 'schema',
                    XDTBL1: 'schema',
                    XDTBL2: 'schema',
                }
                const selects = {
                    imdtbl1: 'randName#0',
                    imdtbl2: 'randName#1',
                    XDTBL1: 'xdtbl1',
                    XDTBL2: 'xdtbl2',
                }
                return PromiseHelper.resolve(sqlQuery, schemas, selects);
            }
            sqlManager.sendToPlanner = () => {
                return PromiseHelper.resolve("sqldfPlan");
            }
            SQLCompiler.compile = () => {
                const obj = {
                    xcQueryString: '',
                    allColumns: "allColumns",
                }
                return PromiseHelper.resolve(obj);
            }
            LogicalOptimizer.optimize = () => { throw rejectStr; };
            sqlManager.SqlUtil.addPrefix = () => {
                const prefix = {
                    query: "select * from test",
                    tableName: "sqlTbl",
                }
                return prefix;
            }

            sqlManager.getXCquery(params, "odbc")
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.equal(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
                sqlManager.sendToPlanner = oldSend2Planner;
                SQLCompiler.compile = oldCompile;
                LogicalOptimizer.optimize = oldOptimizer;
                sqlManager.SqlUtil.addPrefix = oldAddPrefix;
            })
        });

        it("sqlManager.getXCquery should fail when errors", (done) => {
            const oldSetConn = sqlManager.setupConnection;
            const oldCollect = sqlManager.collectTablesMetaInfo;

            const params = {
                userName: sqlUser,
                sessionName: sqlWkbk,
                userId: sqlId,
                queryString: "select * from test",
                optimizations: {
                    noOptimize: true,
                },
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.collectTablesMetaInfo = () => {
                return PromiseHelper.reject(SQLErrTStr.Cancel);
            }

            sqlManager.getXCquery(params, "odbc")
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                console.log(err);
                expect(err).not.to.be.null;
                expect(err.error).to.equal(SQLErrTStr.Cancel);
                expect(err.isCancelled).to.be.true;
                done();
            })
            .always(() => {
                sqlManager.setupConnection= oldSetConn;
                sqlManager.collectTablesMetaInfo = oldCollect;
            })
        });

        it("sqlManager.cancelQuery should work", (done) => {
            const oldCancel = XcalarQueryCancel;

            XcalarQueryCancel = fakeFunc;
            sqlManager.cancelQuery("query", sessionInfo)
            .then(() => {
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarQueryCancel = oldCancel;
            })
        })

        it("sqlManager.cancelQuery should fail when errors", (done) => {
            const oldCancel = XcalarQueryCancel;

            XcalarQueryCancel = fakeRejectFunc;
            sqlManager.cancelQuery("query", sessionInfo)
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).not.to.be.null;
                expect(err.error).to.equal(rejectStr);
                done();
            })
            .always(() => {
                XcalarQueryCancel = oldCancel;
            })
        })

        it("sqlManager.result should works", (done) => {
            const oldConn = sqlManager.setupConnection;
            const oldFetch = sqlManager.SqlUtil.fetchData;
            const oldParse = sqlManager.SqlUtil.parseRows;

            sqlManager.setupConnection = fakeFunc;
            sqlManager.SqlUtil.fetchData = () => {return resolveStr;};
            sqlManager.SqlUtil.parseRows = () => {return resolveStr;};

            sqlManager.result("", 0, 0, 0, {}, {}, {})
            .then((res) => {
                expect(res).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
                sqlManager.SqlUtil.fetchData = oldFetch;
                sqlManager.SqlUtil.parseRows = oldParse;
            })
        });

        it("sqlManager.result should fail when error", (done) => {
            const oldConn = sqlManager.setupConnection;

            sqlManager.setupConnection = fakeRejectFunc;

            sqlManager.result("", 0, 0, 0, {}, {}, {})
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.be.eq(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
            })
        });

        it("sqlManager.getTable should work", (done) => {
            const oldConn = sqlManager.setupConnection;
            const oldGetRows = sqlManager.SqlUtil.getRows;

            const expectedRes = {
                value: resolveStr,
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.SqlUtil.getRows = () => {
                return PromiseHelper.resolve([JSON.stringify(expectedRes)]);
            };

            sqlManager.getTable("", 0, 0, {})
            .then((res) => {
                expect(res).to.be.instanceOf(Array);
                expect(res[0]).to.deep.equal(expectedRes);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
                sqlManager.SqlUtil.getRows = oldGetRows;
            })
        });

        it("sqlManager.getTable should fail when error", (done) => {
            const oldConn = sqlManager.setupConnection;

            sqlManager.setupConnection = fakeRejectFunc;

            sqlManager.getTable("", 0, 0, {})
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.be.eq(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
            })
        });

        it("sqlManager.clean should work", (done) => {
            const oldConn = sqlManager.setupConnection;
            const oldSetSess = sqlManager.SqlUtil.setSessionInfo;
            const oldDelete = XcalarDeleteTable;

            sqlManager.setupConnection = fakeFunc;
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            XcalarDeleteTable = fakeFunc;

            sqlManager.clean("", "", {})
            .then((res) => {
                expect(res).to.eq(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
                sqlManager.SqlUtil.setSessionInfo = oldSetSess;
                XcalarDeleteTable = oldDelete;
            })
        });

        it("sqlManager.clean should fail when error", (done) => {
            const oldConn = sqlManager.setupConnection;

            sqlManager.setupConnection = fakeRejectFunc;

            sqlManager.clean("", "", {})
            .then(() => {
                done("fail");
            })
            .fail((err) => {
                expect(err).to.eq(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
            })
        });

        it("sqlManager.list should work", (done) => {
            const oldConn = sqlManager.connect;
            const oldList = sqlManager.listPublishedTables;
            const oldGetInfo = sqlManager.getInfoForPublishedTable;

            const expectedRes = [
                {
                    tableName: 'pub1',
                    tableColumns: 'schema',
                }
            ]

            sqlManager.connect = fakeFunc;
            sqlManager.listPublishedTables = () => {
                const res = {
                    publishedTables: ['pub1'],
                }
                return PromiseHelper.resolve(res);
            }
            sqlManager.getInfoForPublishedTable = () => {
                const res = {
                    schema: "schema",
                }
                return res
            }

            sqlManager.list("")
            .then((res) => {
                expect(res).to.deep.equal(expectedRes);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.connect = oldConn;
                sqlManager.listPublishedTables = oldList;
                sqlManager.getInfoForPublishedTable = oldGetInfo;
            })
        });

        it("sqlManager.list should fail when error", (done) => {
            const oldConn = sqlManager.connect;

            sqlManager.connect = fakeRejectFunc;
            sqlManager.list("")
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.eq(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.connect = oldConn;
            })
        });

        it("sqlManager.cancel should work", (done) => {
            const oldConn = sqlManager.setupConnection;
            const oldSetSess = sqlManager.SqlUtil.setSessionInfo;
            const oldCancel = sqlManager.cancelQuery;

            sqlManager.setupConnection = fakeFunc;
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            sqlManager.cancelQuery = fakeFunc;

            sqlManager.cancel("", {})
            .then((res) => {
                expect(res).to.eq(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
                sqlManager.SqlUtil.setSessionInfo = oldSetSess;
                sqlManager.cancelQuery = oldCancel;
            })
        });

        it("sqlManager.cancel should fail when error", (done) => {
            const oldConn = sqlManager.setupConnection;

            sqlManager.setupConnection = fakeRejectFunc;

            sqlManager.cancel("", {})
            .then(() => {
                done('fail');
            })
            .fail((err) => {
                expect(err).to.eq(rejectStr);
                done();
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
            })
        });
    });

    describe("Router Test", function() {
        it("Router should support /xcsql/query", function(done) {
            const oldExec = sqlManager.executeSql;
            sqlManager.executeSql = fakeFunc

            postRequest("POST", "/xcsql/query")
            .then((res) => {
                expect(res.body).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.executeSql = oldExec;
            })
        });

        it("Router should support /xcsql/queryWithPublishedTables", function(done) {
            const oldExec = sqlManager.executeSqlShared;
            sqlManager.executeSqlShared = fakeFunc

            const req = {
                sessionId: "test-session-id",
            }

            postRequest("POST", "/xcsql/queryWithPublishedTables", req)
            .then((res) => {
                expect(res.body).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.executeSqlShared = oldExec;
            })
        });

        it("Router should support /xcsql/getXCqueryWithPublishedTables", function(done) {
            const oldGetQuery = sqlManager.getXCquery;
            sqlManager.getXCquery = fakeFunc

            const req = {
                sessionId: "test-session-id",
            }

            postRequest("POST", "/xcsql/getXCqueryWithPublishedTables", req)
            .then((res) => {
                expect(res.body).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.getXCquery = oldGetQuery;
            })
        });

        it("Router should support /xcsql/result", function(done) {
            const oldResult = sqlManager.result;

            sqlManager.result = fakeFunc;

            const req = {
                rowPosition: "0",
                rowsToFetch : "0",
                totalRows: "0",
                schema: "{}",
                renameMap: "{}",
            }
            postRequest("POST", "/xcsql/result", req)
            .then((res) => {
                expect(res.body).to.equal(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.result = oldResult;
            })
        });

        it("Router should support /xcsql/getTable", function(done) {
            const oldGet = sqlManager.getTable;

            sqlManager.getTable = fakeFunc;
            const req = {
                rowPosition: "0",
                rowsToFetch : "0",
            }
            postRequest("POST", "/xcsql/getTable", req)
            .then((res) => {
                expect(res.body).to.eq(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.getTable = oldGet;
            })
        });

        it("router should support /xcsql/clean", function(done) {
            const oldClean = sqlManager.clean;

            sqlManager.clean = fakeFunc;

            postRequest("post", "/xcsql/clean")
            .then((res) => {
                expect(res.body).not.to.be.null;
                expect(res.body.success).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.clean = oldClean ;
            })
        });

        it("Router should support /xcsql/list", function(done) {
            const oldList = sqlManager.list;

            sqlManager.list = fakeFunc;

            postRequest("POST", "/xcsql/list")
            .then((res) => {
                expect(res.body).to.eq(resolveStr);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.lsit = oldList;
            })
        });

        it("Router should support /xcsql/cancel", function(done) {
            const oldConn = sqlManager.setupConnection;
            const oldSetSess = sqlManager.SqlUtil.setSessionInfo;
            const oldCancel = sqlManager.cancelQuery;

            const expectedRes = {
                log: "query cancel issued: testQuery",
            }

            sqlManager.setupConnection = fakeFunc;
            sqlManager.SqlUtil.setSessionInfo = fakeFunc;
            sqlManager.cancelQuery = fakeFunc;

            const req = {
                queryName: "testQuery",
            }
            postRequest("POST", "/xcsql/cancel", req)
            .then((res) => {
                expect(res.body).to.deep.eq(expectedRes);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                sqlManager.setupConnection = oldConn;
                sqlManager.SqlUtil.setSessionInfo = oldSetSess;
                sqlManager.cancelQuery = oldCancel;
            })
        });
    });
});
