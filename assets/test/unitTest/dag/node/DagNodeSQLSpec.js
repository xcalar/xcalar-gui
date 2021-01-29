describe("SQL Dag Node Test", () => {
    let node;

    // XXX needs more tests
    before((done) => {
        console.log("SQL node test");
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeSQL({});
            done();
        });
    });

    describe("check initial node properties", () => {
        it("should have the correct properties", () => {
            let nodes = [
                {
                    "version": 1,
                    "type": "sql",
                    "subType": null,
                    "display": {
                        "x": 40,
                        "y": 80
                    },
                    "description": "",
                    "title": "Node 4",
                    "input": {
                        "sqlQueryStr": "",
                        "identifiers": {},
                        "dropAsYouGo": true
                    },
                    "id": "dag_5D38D6453793C52F_1564011822433_39",
                    "state": "Unused",
                    "configured": false,
                    "aggregates": [],
                    "parents": []
                }
            ];

            expect(node.type).to.equal(DagNodeType.SQL);
            expect(node.tableSrcMap).to.be.undefined;
            expect(node.columns).to.be.undefined;
            expect(node.maxParents).to.equal(-1);
            expect(node.minParents).to.equal(0);
            expect(node.identifiers.size).to.equal(0);
            expect(node.subInputNodes.length).to.equal(0);
            expect(node.subOutputNodes.length).to.equal(0);
            expect(node.SQLName.startsWith("SQLTab_")).to.be.true;
            expect(node._queryObj.queryId.startsWith("sqlQuery")).to.be.true;
            expect(node.aggregatesCreated.length).to.equal(0);
            expect(node.subGraphNodeIds).to.be.undefined;
        });
    });

    describe("various functions", () => {
        it("getSerializeInfo should work", () => {
            let res = node._getSerializeInfo();
            let id = node.getId();
            console.log(res);
            expect(res).to.deep.equal({
                "version": 1,
                "type": "sql",
                "columns": undefined,
                "error": undefined,
                "table": undefined,
                "tableSrcMap": undefined,
                "identifiersNameMap": {},
                "subType": null,
                "display": {
                    "x": -1,
                    "y": -1
                },
                "description": "",
                "title": "",
                "input": {
                    "sqlQueryStr": "",
                    "identifiers": {},
                    "mapping": [],
                    "dropAsYouGo": true,
                    "outputTableName": ""
                },
                "id": id,
                "state": "Unused",
                "configured": false,
                "aggregates": [],
                "tag": [],
                "isHidden": undefined,
                "udfErrors": {},
                "udfError": undefined,
                "headName": null,
                "schema": [],
                "complementNodeId": undefined
            });
        });

        it("replaceSQLTableName should work", () => {
            let queryString = JSON.stringify([
                {
                    "operation": "XcalarApiSynthesize",
                    "args": {
                        "source": "a",
                        "dest": "b",
                        "columns": [
                            {
                                "sourceColumn": "classes::class_name",
                                "destColumn": "CLASS_NAME",
                                "columnType": "DfString"
                            },
                            {
                                "sourceColumn": "classes::class_id",
                                "destColumn": "CLASS_ID",
                                "columnType": "DfInt64"
                            }
                        ],
                        "sameSession": true,
                        "numColumns": 2
                    }
                }
            ]);
            let tableSrcMap = {"a": 1};
            let replaceMap = {"1": "a"};
            let oldTableName = "b";
            let tabId = "tabId";
            let res = node.replaceSQLTableName(queryString, oldTableName, tabId, tableSrcMap, replaceMap);
            let newTableName = res.newDestTableName;

            expect(res.newTableMap).to.deep.equal({a:"a", b: newTableName});
            expect(res.newTableSrcMap).to.deep.equal({a:1});
            expect(JSON.parse(res.newQueryStr)).to.deep.equal([
                {
                    "operation": "XcalarApiSynthesize",
                    "args": {
                        "source": "a",
                        "dest": newTableName,
                        "columns": [
                            {
                                "sourceColumn": "classes::class_name",
                                "destColumn": "CLASS_NAME",
                                "columnType": "DfString"
                            },
                            {
                                "sourceColumn": "classes::class_id",
                                "destColumn": "CLASS_ID",
                                "columnType": "DfInt64"
                            }
                        ],
                        "sameSession": true,
                        "numColumns": 2
                    }
                }
            ]);
        });
    });
    describe("saving config", () => {
        let oldAuth;
        let authId = "1";
        let compileId;
        before(() => {
            oldAuth = Authentication.getHashId;
            Authentication.getHashId = () => {
                return authId;
            }
            compileId = "_sql" + authId;
        });
        describe("compile", () => {
            it("should try to compile and fail", (done) => {
                Alert.forceClose();
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    expect(id).to.equal(node.getId() + compileId);
                    expect(type).to.equal("parse");
                    expect(struct.sqlQuery).to.equal("SELECT * FROM a");
                    expect(struct.isMulti).to.be.true;
                    expect(struct.ops).to.deep.equal(["identifier", "sqlfunc", "parameters"]);
                    called = true;
                    return PromiseHelper.reject("Test");
                }
                let identifiers = new Map();
                identifiers.set(1, "a");

                node.compileSQL("SELECT * FROM a", "sql123", {
                    dropAsYoGo: true,
                    identifiers: identifiers,
                    sourceMapping: [
                        {
                            "identifier": "a",
                            "source": 1
                        }
                    ],
                }, true)
                .then(() => {
                    done('fail');
                })
                .fail(() => {
                    expect(called).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});
                    expect(node.input.input.mapping).to.deep.equal([]);
                    SQLUtil.sendToPlanner = cache;
                    done();
                })
            });
            it("should try to compile and fail due to columns", (done) => {
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    called = true;
                    return PromiseHelper.reject("cannot resolve '`test`' given input columns: [b.DEPTIME, b.DEPDELAY]; line 1 pos 7;\n'Project ['test]\n+- SubqueryAlias `b`\n+- LogicalRDD [DEPTIME#2195, DEPDELAY#2206], false");
                }
                let identifiers = new Map();
                identifiers.set(1, "a");
                node.compileSQL("SELECT * FROM a", "sql123", {dropAsYoGo: true, identifiers: identifiers,sourceMapping: [
                    {
                        "identifier": "a",
                        "source": 1
                    }
                ]}, true)
                .then(() => {
                    done('fail');
                })
                .fail(() => {
                    expect(called).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});

                    SQLUtil.sendToPlanner = cache;
                    done();
                })
            });
            it("should try to compile but fail when sending schema", (done) => {
                Alert.forceClose();
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    called = true;
                    return PromiseHelper.resolve('{"status":0,"msg":"OK","ret":[{"identifiers":["b"],"sql":"SELECT * FROM b"}]}');
                }
                let cache2 = node.sendSchema;
                let called2 = false;
                node.sendSchema = (identifiers, pubTablesInfo, sqlFunctions, usedTables) => {
                    expect(identifiers.size).to.equal(1);
                    expect(identifiers.get(1)).to.equal("a");
                    expect(pubTablesInfo).to.be.undefined;
                    expect(sqlFunctions).to.be.undefined;
                    expect(usedTables).to.deep.equal(["B"]);
                    called2 = true;
                    return PromiseHelper.reject("Test");
                }

                let identifiers = new Map();
                identifiers.set(1, "a");
                node.compileSQL("SELECT * FROM a", "sql123", {dropAsYoGo: true, identifiers: identifiers, sourceMapping: [
                    {
                        "identifier": "a",
                        "source": 1
                    }
                ]}, true)
                .then(() => {
                    done('fail');
                })
                .fail(() => {
                    expect(called).to.be.true;
                    expect(called2).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});

                    SQLUtil.sendToPlanner = cache;
                    node.sendSchema = cache2;
                    done();
                });
            });
            it("should call SendToPlanner twice", (done) => {
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                let calledTwice = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    if (called) {
                        calledTwice = true;
                        expect(id).to.equal(node.getId() + compileId);
                        expect(type).to.equal("query");
                        expect(struct.sqlQuery).to.equal("SELECT * FROM a");
                        expect(struct.ops).to.be.undefined;
                    } else {
                        expect(id).to.equal(node.getId() + compileId);
                        expect(type).to.equal("parse");
                        expect(struct.sqlQuery).to.equal("SELECT * FROM a");
                        expect(struct.isMulti).to.be.true;
                        expect(struct.ops).to.deep.equal(["identifier", "sqlfunc", "parameters"]);
                    }
                    called = true;
                    if (calledTwice) {
                        return PromiseHelper.reject('Test');
                    } else {
                        return PromiseHelper.resolve('{"status":0,"msg":"OK","ret":[{"identifiers":["b"],"sql":"SELECT * FROM b"}]}');
                    }
                }
                let cache2 = node.sendSchema;
                let called2 = false;
                node.sendSchema = (identifiers, pubTablesInfo, sqlFunctions, usedTables) => {
                    expect(identifiers.size).to.equal(1);
                    expect(identifiers.get(1)).to.equal("a");
                    expect(pubTablesInfo).to.be.undefined;
                    expect(sqlFunctions).to.be.undefined;
                    expect(usedTables).to.deep.equal(["B"]);
                    called2 = true;
                    return PromiseHelper.resolve({tableSrcMap: {"a": "b"}});
                }

                let identifiers = new Map();
                identifiers.set(1, "a");

                node.compileSQL("SELECT * FROM a", "sql123", {dropAsYoGo: true, identifiers: identifiers, sourceMapping: [
                    {
                        "identifier": "a",
                        "source": 1
                    }
                ]}, true)
                .then(() => {
                    done('fail');
                })
                .fail(() => {
                    expect(called).to.be.true;
                    expect(called2).to.be.true;
                    expect(calledTwice).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});

                    SQLUtil.sendToPlanner = cache;
                    node.sendSchema = cache2;
                    done();
                });
            });
            it("should call SQLCompile and fail", (done) => {
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                let calledTwice = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    if (called) {
                        calledTwice = true;
                    }
                    called = true;
                    if (calledTwice) {
                        let plannerVar = {"sqlQuery":'[{"class":"org.apache.spark.sql.execution.LogicalRDD","num-children":0,"output":[[{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","num-children":0,"name":"CHECKSUM","dataType":"integer","nullable":true,"metadata":{},"exprId":{"product-class":"org.apache.spark.sql.catalyst.expressions.ExprId","id":3261,"jvmId":"eb2f7691-06fa-4695-855c-86c43c5b80bd"},"qualifier":[]}]],"rdd":null,"outputPartitioning":{"product-class":"org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning","numPartitions":0},"outputOrdering":[],"isStreaming":false,"xcTableName":"sqlTable74245#t_1564193987209_1","session":null}]'};
                        return PromiseHelper.resolve(JSON.stringify(plannerVar));
                    } else {
                        return PromiseHelper.resolve('{"status":0,"msg":"OK","ret":[{"identifiers":["b"],"sql":"SELECT * FROM b"}]}');
                    }
                }
                let cache2 = node.sendSchema;
                let called2 = false;
                node.sendSchema = (identifiers, pubTablesInfo, sqlFunctions, usedTables) => {
                    called2 = true;
                    return PromiseHelper.resolve({tableSrcMap: {"a": "b"}});
                }

                let cache3 = SQLCompiler.compile;
                let called3 = true;
                SQLCompiler.compile = (ret) => {
                    expect(ret.queryString).to.equal("SELECT * FROM a");
                    expect(ret.optimizations).to.deep.equal({
                        combineProjectWithSynthesize: true,
                        dropAsYouGo: true
                    });
                    expect(ret.queryId).to.equal("sql123");
                    expect(ret.logicalPlan.length).to.equal(1);
                    called3 = true;
                    return PromiseHelper.reject("Test");
                };

                let identifiers = new Map();
                identifiers.set(1, "a");

                node.compileSQL("SELECT * FROM a", "sql123", {dropAsYoGo: true, identifiers: identifiers, sourceMapping: [
                    {
                        "identifier": "a",
                        "source": 1
                    }
                ]}, true)
                .then(() => {
                    done('fail');
                })
                .fail(() => {

                    expect(called).to.be.true;
                    expect(called2).to.be.true;
                    expect(calledTwice).to.be.true;
                    expect(called3).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});

                    SQLUtil.sendToPlanner = cache;
                    node.sendSchema = cache2;
                    SQLCompiler.compile = cache3;
                    done();
                });
            });
            it("should call SQLCompile and succeed", (done) => {
                let cache = SQLUtil.sendToPlanner;
                let called = false;
                let calledTwice = false;
                SQLUtil.sendToPlanner = (id, type, struct) => {
                    if (called) {
                        calledTwice = true;
                    }
                    called = true;
                    if (calledTwice) {
                        let plannerVar = {"sqlQuery":'[{"class":"org.apache.spark.sql.execution.LogicalRDD","num-children":0,"output":[[{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","num-children":0,"name":"CHECKSUM","dataType":"integer","nullable":true,"metadata":{},"exprId":{"product-class":"org.apache.spark.sql.catalyst.expressions.ExprId","id":3261,"jvmId":"eb2f7691-06fa-4695-855c-86c43c5b80bd"},"qualifier":[]}]],"rdd":null,"outputPartitioning":{"product-class":"org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning","numPartitions":0},"outputOrdering":[],"isStreaming":false,"xcTableName":"sqlTable74245#t_1564193987209_1","session":null}]'};
                        return PromiseHelper.resolve(JSON.stringify(plannerVar));
                    } else {
                        return PromiseHelper.resolve('{"status":0,"msg":"OK","ret":[{"identifiers":["b"],"sql":"SELECT * FROM b"}]}');
                    }
                }
                let cache2 = node.sendSchema;
                let called2 = false;
                node.sendSchema = (identifiers, pubTablesInfo, sqlFunctions, usedTables) => {
                    called2 = true;
                    return PromiseHelper.resolve({tableSrcMap: {"a": "b"}});
                }

                let cache3 = SQLCompiler.compile;
                let called3 = true;
                SQLCompiler.compile = (ret) => {
                    called3 = true;
                    return PromiseHelper.resolve({
                        allColumns:  [],
                        logicalPlan: [],
                        newTableName: "x#1",
                        optimizations: {combineProjectWithSynthesize: true, dropAsYouGo: true},
                        orderColumns: [],
                        queryId: "sql47071917",
                        queryString: "SELECT * FROM a",
                        xcQueryString: '[{"operation":"XcalarApiSynthesize", "args":{"dest": "here"}}]'
                    });
                };

                let cache4 = LogicalOptimizer.optimize;
                let called4 = false;
                LogicalOptimizer.optimize = () => {
                    called4 = true;
                    return  {
                        optimizedQueryString: "myQuery",
                        aggregates: "agg"
                    }
                }

                let cache5 = node.updateSubGraph;
                node.updateSubGraph = () => {};

                let cache6 = node.replaceSQLTableName;
                node.replaceSQLTableName = (query, tName) => {
                    return {
                        newQueryStr: query,
                        newDestTableName: tName,
                        newTableSrcMap: {},
                        newTableMap: {}
                    };
                }

                let identifiers = new Map();
                identifiers.set(1, "a");

                node.compileSQL("SELECT * FROM a", "sql123", {dropAsYoGo: true, identifiers: identifiers, sourceMapping: [
                    {
                        "identifier": "a",
                        "source": 1
                    }
                ]}, true)
                .then(() => {
                    expect(node.aggregatesCreated).to.equal("agg");
                    expect(node.getNewTableName()).to.equal("x#1");
                    expect(node.getXcQueryString()).to.equal("myQuery");
                    expect(called).to.be.true;
                    expect(called2).to.be.true;
                    expect(calledTwice).to.be.true;
                    expect(called3).to.be.true;
                    expect(called4).to.be.true;
                    expect(node.input.input.identifiers).to.deep.equal({1: "a"});

                    SQLUtil.sendToPlanner = cache;
                    node.sendSchema = cache2;
                    SQLCompiler.compile = cache3;
                    LogicalOptimizer.optimize = cache4;
                    node.updateSubGraph = cache5;
                    node.replaceSQLTableName = cache6;
                    done();
                })
                .fail(() => {
                    done('fail');
                });
            });
        });

        after(() => {
            Authentication.getHashId = oldAuth;
        });
    });

    describe("getter/setter functions", () => {
        before(() => {
            node = new DagNodeSQL({});
        });
        it("get/setSQLName should work", () => {
            node.setSQLName("myName");
            expect(node.getSQLName()).to.equal("myName");
        });
        it("get/setColumns should work", () => {
            node.setRawColumns(["testColumn"]);
            expect(node.getColumns()).to.deep.equal(["testColumn"]);
        });
        it("get/setRawXcQueryString should work", () => {
            node.setRawXcQueryString ("testQuery");
            expect(node.getRawXcQueryString ()).to.equal("testQuery");
        });
    });

    describe("lineage change",  () => {
        before(()=> {
            const columns = genProgCols('prefix::col', 2);
            node.parents = [{
                getLineage: () => ({ getColumns: () => columns,
                    getHiddenColumns: () => []
                 })
            }];
        })
        it("lineageChange should work with no renames", () => {
            let columns =   [{
                name: "col1",
                backName: "col1",
                type: "string"
            },
            {
                name: "col2",
                backName: "col2",
                type: "float"
            }

            ];
            node.setRawColumns(columns);
            let res = node.lineageChange();
            expect(res.changes.length).to.equal(4);
            expect(res.changes[0].from.backName).to.equal("prefix::col#1");
            expect(res.changes[0].to).to.be.null;
            expect(res.changes[1].from.backName).to.equal("prefix::col#2");
            expect(res.changes[1].to).to.be.null;
            expect(res.changes[2].from).to.be.null;
            expect(res.changes[2].to.backName).to.equal("col1");
            expect(res.changes[3].from).to.be.null;
            expect(res.changes[3].to.backName).to.equal("col2");

            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].backName).to.equal("col1");
            expect(res.columns[1].backName).to.equal("col2");
        });
        it("lineageChange should work with renames", () => {
            let cache = node._backTraverseColumnChanges;
            node._backTraverseColumnChanges = (colMap) => {
                const newColumnMap = Object.assign({}, colMap[0]);
                newColumnMap["colA#1"] = newColumnMap["col1"];
                newColumnMap["colA#1"][1] = true;
                delete newColumnMap["col1"];
                colMap[0] = newColumnMap;
            }
            node.subOutputNodes = [null];

            node.parents = [{
                getLineage: () => ({ getColumns: () =>  genProgCols('colA', 2) })
            }];
            let columns =   [{
                name: "col1",
                backName: "col1",
                type: "string"
            },
            {
                name: "col2",
                backName: "col2",
                type: "float"
            }

            ];
            node.setRawColumns(columns);
            let res = node.lineageChange();

            expect(res.changes.length).to.equal(3);
            expect(res.changes[0].from.backName).to.equal("colA#1");
            expect(res.changes[0].to.backName).to.equal("col1");
            expect(res.changes[1].from.backName).to.equal("colA#2");
            expect(res.changes[1].to).to.be.null;
            expect(res.changes[2].from).to.be.null;
            expect(res.changes[2].to.backName).to.equal("col2");

            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].backName).to.equal("col1");
            expect(res.columns[1].backName).to.equal("col2");

            node._backTraverseColumnChanges = cache;
        });
    });

    // XXX needs more tests
    describe("updateSubGraph", () => {
        before(() => {
            node = new DagNodeSQL({});
            node.setXcQueryString('[{"operation":"XcalarApiSynthesize","args":{"source":"table_DF2_1","dest":"table_DF2_2","columns":[{"sourceColumn":"books1::author","destColumn":"AUTHOR","columnType":"DfString"}],"sameSession":true,"numColumns":1}}]');
        });
        it("updateSubGraph should create subgraph", () => {
            expect(node.subGraph).to.be.undefined;
            node.updateSubGraph();
            expect(node.subGraph instanceof DagSubGraph).to.be.true;
            expect(node.subGraph.nodesMap.size).to.equal(1);
            expect(node.subGraphNodeIds.length).to.equal(1);
            expect(Object.keys(node.tableNewDagIdMap).length).to.equal(1);
            expect(node.getTableNewDagIdMap()["table_DF2_2"]).to.equal(node.subGraphNodeIds[0]);
        });
    });
    // XXX needs more tests
    describe("finalize table", () => {
        before(() => {
            node = new DagNodeSQL({});
            node.getParents = () => [new DagNodeFilter({})];
        });
        it("should fail finalize empty table", (done) => {
            node._finalizeTable(1, "table")
            .then((ret) => {
                done("fail");
            })
            .fail(() => {
                done()
            });
        });
    });
    function genProgCols(colPrefix, count) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});

// when saving sql node:
// compile
// set identifiers
// send schema
// finalizeandGetschema
// finalizetable
// getsynthesize
// setNewTableName
// setNewColumns
//lineageChange
//backtraversecolumnchanges
// setIdentifiers (again)

// in sqlOpPanel, after submitting and compiling
// these get called:
// this._dagNode.setXcQueryString(this._xcQueryString);
// this._dagNode.setIdentifiers(this._identifiers);
// this._dagNode.setTableSrcMap(this._tableSrcMap);
// this._dagNode.setNewTableName(this._newTableName);
// this._dagNode.setParam(param);

// test replaceParam in compileSQL


/*
updateSubGraph

 updateStatsInSQLQuery


    getSubGraph() {
        return this.subGraph;
    }


      getTableSrcMap() {
        return this.tableSrcMap;
    }

    _backTraverseColumnChanges(
            lineageChange // with parents

            addInputNode

  _setInputPort(inputNode, in
    _getInputPort(inPortIdx
getInputParent(inputNode) {
addOutputNode(outN
    eConfiguredState(isUpd
         _getColumnsUsedInInput() {
        return null;
    }
    _setOutputPort

     _getColumnsUsedInInput() {
        return null;
    }
    _setOutputPort
_getDerivedCol(col)
 _getSynthesize(colI
     _finalizeTable(sourc
        _finalizeAndGetSchema(
            sendSchema(identifi
_getSchemasAndQueriesFromSqlFuncs(
    _replaceSubGraphNodeIds(retStruc
*/