describe("DagNodeExecutor Test", () => {
    let txId = 1;
    const symTxId = 1.5;
    let symTxIdCount;
    let cachedTransactionGet;
    before(function(done){
        cachedTransactionGet = Transaction.get;
        symTxIdCount = Transaction.__testOnly__.getAll().txIdCount;
        console.log(symTxIdCount, "count");
        Transaction.get = () => {
            return {
                setCurrentNodeInfo: () => {},
                setParentNodeInfo: ()=> {},
                resetCurrentNodeInfo: () => {},
                resetParentNodeInfo: () => {},
                getStoredQueryDest: () => {},
                setStoredQueryDest: ()=> {}
            }
        }
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });
    let createNode = (type, tableName, subType) => {
        if (tableName == null) {
            tableName = "testTable";
        }
        return DagNodeFactory.create({
            type: type || DagNodeType.Dataset,
            subType: subType || null,
            table: tableName
        });
    };

    it("should be a class", () => {
        const node = new DagNode();
        const executor = new DagNodeExecutor(node, txId);
        expect(executor).to.be.an.instanceof(DagNodeExecutor)
    });

    it("getTableNamePrefix", () => {
        let cache = DagTabManager.Instance.getTabById;
        DagTabManager.Instance.getTabById = () => {
            return {
                getName: () => "tabName"
            };
        }
        expect(DagNodeExecutor.getTableNamePrefix("sampleId")).to.equal("table_published_tabName");
        DagTabManager.Instance.getTabById = cache;
    });

    it("should load dataset", (done) => {
        const node = createNode(DagNodeType.Dataset);
        node.setParam({source: "test", prefix: "prefix"});
        const executor = new DagNodeExecutor(node, txId);
        const oldIndex = XIApi.indexFromDataset;

        XIApi.indexFromDataset = (txId, dsName, newTableName, prefix) => {
            expect(txId).to.equal(1);
            expect(dsName).to.equal("test");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(prefix).to.equal("prefix");
            return PromiseHelper.resolve({newTableName, prefix});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.indexFromDataset = oldIndex;
        });
    });

    it("_getOptimizedDSName should work", function() {
        let executor = new DagNodeExecutor();
        let res = executor._getOptimizedDSName("test");
        expect(res).not.to.equal("test");
        expect(res.startsWith("Optimized")).to.be.true;
    });

    it("_getOptimizedLoadArg should work", function() {
        let node = createNode(DagNodeType.Dataset);
        let loadArgs = {
            args: {
                dest: "test"
            }
        };
        node.setParam({
            loadArgs: JSON.stringify(loadArgs)
        });
        let executor = new DagNodeExecutor();
        let res = executor._getOptimizedLoadArg(node, "test2");
        let parsed = JSON.parse(res);
        expect(parsed.args.dest).to.equal("test2");
    });

    it("should load dataset optimized", (done) => {

        let loadArgs = {
            args: {
                dest: "test"
            }
        };
        const node = createNode(DagNodeType.Dataset);
        node.setParam({source: "test", prefix: "prefix", loadArgs: JSON.stringify(loadArgs)});
        const executor = new DagNodeExecutor(node, symTxId);
        const oldIndex = XIApi.indexFromDataset;

        XIApi.indexFromDataset = (symTxId, dsName, newTableName, prefix) => {
            expect(symTxId).to.equal(1.5);
            expect(dsName.startsWith("Optimized.")).to.be.true;
            expect(dsName.endsWith(".test")).to.be.true;
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(prefix).to.equal("prefix");
            return PromiseHelper.resolve({newTableName, prefix});
        };

        executor.run(true)
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.indexFromDataset = oldIndex;
        });
    });

    it("should load dataset optimized and fail", (done) => {
        const node = createNode(DagNodeType.Dataset);
        node.setParam({source: "test", prefix: "prefix"});
        const executor = new DagNodeExecutor(node, symTxId);
        const oldIndex = XIApi.indexFromDataset;

        XIApi.indexFromDataset = (symTxId, dsName, newTableName, prefix) => {
            expect(symTxId).to.equal(1.5);
            expect(dsName.startsWith("Optimized.")).to.be.true;
            expect(dsName.endsWith(".test")).to.be.true;
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(prefix).to.equal("prefix");
            return PromiseHelper.resolve({newTableName, prefix});
        };

        executor.run(true)
        .then(() => {
            console.error("fail", error);
            done("fail");
        })
        .fail((error) => {
            expect(error.detail).to.equal("Cannot read property 'args' of null");
            expect(error.error).to.equal("Parse load args error");
            done();
        })
        .always(() => {
            XIApi.indexFromDataset = oldIndex;
        });
    });

    it("should synthesize dataset", (done) => {
        const node = createNode(DagNodeType.Dataset);
        const executor = new DagNodeExecutor(node, txId);
        let oldSynthesize = XIApi.synthesize;
        let called = false;
        XIApi.synthesize = (txId, colInfos, dsName, desTable, sameSession) => {
            expect(colInfos).to.deep.equal([{
                orig: "name",
                new: "name",
                type: 0
            }]);
            expect(dsName).to.equal(".XcalarDS.dsName");
            expect(desTable.startsWith("dsName")).to.be.true;
            expect(sameSession).to.be.true;
            called = true;
            return PromiseHelper.resolve();
        };
        executor._synthesizeDataset("dsName", [{name: "name", type: DfFieldTypeT.DfString}])
        .then(() => {
            expect(called).to.be.true;
            XIApi.synthesize = oldSynthesize
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("should aggregate", (done) => {
        const node = createNode(DagNodeType.Aggregate);
        const parentNode = createNode();
        node.setParam({evalString: "count(col)", dest: "testConstant"});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldAggregate = XIApi.aggregateWithEvalStr;

        XIApi.aggregateWithEvalStr = (txId, evalStr, tableName, dstAggName) => {
            expect(txId).to.equal(1);
            expect(evalStr).to.equal("count(col)");
            expect(tableName).to.equal("testTable");
            expect(dstAggName).to.equal("testConstant");
            return PromiseHelper.resolve({value:100});
        };

        executor.run()
        .then(() => {
            expect(node.getAggVal()).to.equal(100);
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.aggregateWithEvalStr = oldAggregate;
        });
    });

    it("should filter", (done) => {
        const node = createNode(DagNodeType.Filter);
        const parentNode = createNode();
        node.setParam({evalString: "eq(col, 1)"});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldFilter = XIApi.filter;

        XIApi.filter = (txId, fltStr, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(fltStr).to.equal("eq(col, 1)");
            expect(tableName).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.filter = oldFilter;
        });
    });

    it("should group by", (done) => {
        const node = createNode(DagNodeType.GroupBy);
        const parentNode = createNode();
        node.setParam({
            groupBy: ["groupCol"],
            aggregate: [{
                operator: "count",
                sourceColumn: "aggCol",
                destColumn: "count_aggCol",
                distinct: true
            }],
            icv: false,
            groupAll: false,
            includeSample: false
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGroupBy = XIApi.groupBy;

        XIApi.groupBy = (txId, aggArgs, groupByCols, tableName, options) => {
            expect(txId).to.equal(1);
            expect(aggArgs.length).to.equal(1);
            expect(aggArgs[0]).to.deep.equal({
                operator: "count",
                aggColName: "aggCol",
                newColName: "count_aggCol",
                isDistinct: true,
                delim: undefined
            });
            expect(groupByCols.length).to.equal(1);
            expect(groupByCols[0]).to.equal("groupCol");
            expect(tableName).to.equal("testTable");
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.isIncSample).to.be.false;
            expect(options.icvMode).to.be.false;
            expect(options.groupAll).to.be.false;
            return PromiseHelper.resolve({finalTable: tableName});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.groupBy = oldGroupBy;
        });
    });

    it("should group by with join", (done) => {
        const node = createNode(DagNodeType.GroupBy);
        const parentNode = createNode();
        node.setParam({
            groupBy: ["groupCol"],
            aggregate: [{
                operator: "count",
                sourceColumn: "aggCol",
                destColumn: "count_aggCol",
                distinct: true
            }],
            icv: false,
            groupAll: false,
            includeSample: false,
            joinBack: true
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGroupBy = XIApi.groupBy;

        XIApi.groupBy = (txId, aggArgs, groupByCols, tableName, options) => {
            expect(txId).to.equal(1);
            expect(aggArgs.length).to.equal(1);
            expect(aggArgs[0]).to.deep.equal({
                operator: "count",
                aggColName: "aggCol",
                newColName: "count_aggCol",
                isDistinct: true,
                delim: undefined
            });
            expect(groupByCols.length).to.equal(1);
            expect(groupByCols[0]).to.equal("groupCol");
            expect(tableName).to.equal("testTable");
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.isIncSample).to.be.false;
            expect(options.icvMode).to.be.false;
            expect(options.groupAll).to.be.false;
            return PromiseHelper.resolve({finalTable: tableName});
        };
        const oldJoin = XIApi.join;
        let called = false;
        XIApi.join = (txId, type, lTableInfo, rTableInfo, joinOpts) => {
            expect(txId).to.equal(1);
            expect(type).to.equal(3);
            expect(lTableInfo).to.deep.equal({
                "tableName": "testTable",
                "columns": [
                    "groupCol"
                ]}
            )
            expect(rTableInfo.tableName).to.equal("testTable")
            expect(rTableInfo.columns).to.deep.equal([
                    "groupCol"
                ]
            );
            expect(joinOpts.keepAllColumns).to.be.true;
            expect(joinOpts.newTableName.startsWith("testTable")).to.be.true;
            called = true;
            return PromiseHelper.resolve("newTableName");
        };

        executor.run()
        .then(() => {
            expect(called).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.groupBy = oldGroupBy;
            XIApi.join = oldJoin;
        });
    });

    it("should group by with cast", (done) => {
        const node = createNode(DagNodeType.GroupBy);
        const parentNode = createNode();
        node.setParam({
            groupBy: ["groupCol"],
            aggregate: [{
                operator: "count",
                sourceColumn: "aggCol",
                destColumn: "count_aggCol",
                distinct: true
            },
            {
                operator: "avg",
                sourceColumn: "aggCol2",
                destColumn: "avg_aggCol",
                distinct: true,
                cast: "integer"
            }],
            icv: false,
            groupAll: false,
            includeSample: false
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGroupBy = XIApi.groupBy;

        XIApi.groupBy = (txId, aggArgs, groupByCols, tableName, options) => {
            expect(txId).to.equal(1);
            expect(aggArgs.length).to.equal(2);
            expect(aggArgs[0]).to.deep.equal({
                operator: "count",
                aggColName: "aggCol",
                newColName: "count_aggCol",
                isDistinct: true,
                delim: undefined
            });
            expect(aggArgs[1]).to.deep.equal({
                operator: "avg",
                aggColName: "aggCol2",
                newColName: "avg_aggCol",
                isDistinct: true,
                delim: undefined
            });
            expect(groupByCols.length).to.equal(1);
            expect(groupByCols[0]).to.equal("groupCol");
            expect(tableName).to.equal("destTable");
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.isIncSample).to.be.false;
            expect(options.icvMode).to.be.false;
            expect(options.groupAll).to.be.false;
            return PromiseHelper.resolve({finalTable: tableName});
        };

        let oldMap = XIApi.map;
        let called = false;
        XIApi.map = (txId, mapStrs, srcTable, newCastNames, tableName) => {
            expect(srcTable).to.equal("testTable");
            expect(mapStrs).to.deep.equal(["int(aggCol2, 10)"]);
            expect(newCastNames).to.deep.equal(["aggCol2"]);
            called = true;
            return PromiseHelper.resolve("destTable");
        };

        executor.run()
        .then(() => {
            expect(called).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.groupBy = oldGroupBy;
            XIApi.map = oldMap;
        });
    });

    it("should join", (done) => {
        const node = createNode(DagNodeType.Join);
        const lparentNode = createNode(null, "left");
        const rParentNode = createNode(null, "right");
        node.setParam({
            joinType: "innerJoin",
            left: {
                columns: ["lCol"],
                keepColumns: ["lCol", "lCol2"],
                casts: ["string"],
                rename: [{sourceColumn: "lCol2", destColumn: "joinCol", prefix: false}]
            },
            right: {
                columns: ["x::rCol"],
                keepColumns: ["x::rCol", "x::rCol2"],
                casts: [null],
                rename: [{sourceColumn: "x", destColumn: "x2", prefix: true}]
            },
            evalString: "",
            keepAllColumns: false
        });
        node.connectToParent(lparentNode, 0);
        node.connectToParent(rParentNode, 1);

        const executor = new DagNodeExecutor(node, txId);
        const oldJoin = XIApi.join;

        XIApi.join = (txId, joinType, lTableInfo, rTableInfo, options) => {
            expect(txId).to.equal(1);
            expect(joinType).to.equal(JoinOperatorT.InnerJoin);
            expect(lTableInfo).to.deep.equal({
                tableName: "left",
                columns: ["lCol"],
                casts: null,
                rename: [{
                    "orig": "lCol",
                    "new": "lCol",
                    "type": DfFieldTypeT.DfUnknown
                },{
                    "orig": "lCol2",
                    "new": "joinCol",
                    "type": DfFieldTypeT.DfUnknown
                }],
                allImmediates: []
            });

            expect(rTableInfo).to.deep.equal({
                tableName: "right",
                columns: ["x::rCol"],
                casts: null,
                rename: [{
                    "orig": "x",
                    "new": "x2",
                    "type": DfFieldTypeT.DfFatptr
                }],
                allImmediates: []
            });
            expect(options).to.be.an("object");
            expect(options.newTableName).not.to.be.empty;
            expect(options.newTableName).to.be.a("string");
            expect(options.evalString).to.equal("");
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.join = oldJoin;
        });
    });

    it("should map", (done) => {
        const node = createNode(DagNodeType.Map);
        const parentNode = createNode();
        node.setParam({eval: [{evalString: "add(col, 1)", newField: "newCol"}]});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldMap = XIApi.map;

        XIApi.map = (txId, mapStrs, tableName, newColNames, newTableName, icvMode) => {
            expect(txId).to.equal(1);
            expect(mapStrs.length).to.equal(1);
            expect(mapStrs[0]).to.equal("add(col, 1)");
            expect(tableName).to.equal("testTable");
            expect(newColNames.length).to.equal(1);
            expect(newColNames[0]).to.equal("newCol");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.map = oldMap;
        });
    });

    it("should project", (done) => {
        const node = createNode(DagNodeType.Project);
        const parentNode = createNode();
        node.setParam({columns: ["col", "prefix"]});
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldProject = XIApi.project;

        XIApi.project = (txId, columns, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(columns).to.deep.equal(["col", "prefix"]);
            expect(tableName).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.project = oldProject;
        });
    });

    it("should do set operation", (done) => {
        const node = createNode(DagNodeType.Set, null, DagNodeSubType.Union);
        const parentNode1 = createNode(null, "parent1");
        const ParentNode2 = createNode(null, "parent2");
        node.setParam({
            columns: [
                [{
                    sourceColumn: "col1",
                    destColumn: "destCol",
                    columnType: ColumnType.string,
                    cast: false
                }],
                [{
                    sourceColumn: "col2",
                    destColumn: "destCol",
                    columnType: ColumnType.string,
                    cast: true
                }]
            ],
            dedup: true
        });
        node.connectToParent(parentNode1, 0);
        node.connectToParent(ParentNode2, 1);

        const executor = new DagNodeExecutor(node, txId);
        const oldSet = XIApi.union;

        XIApi.union = (txId, tableInfos, dedup, newTableName, unionType) => {
            expect(txId).to.equal(1);
            expect(unionType).to.equal(UnionOperatorT["UnionStandard"]);
            expect(dedup).to.be.true;
            expect(tableInfos.length).to.equal(2);
            expect(tableInfos[0]).to.deep.equal({
                tableName: "parent1",
                columns: [{
                    name: "col1",
                    rename: "destCol",
                    type: ColumnType.string,
                    cast: false
                }]
            });
            expect(tableInfos[1]).to.deep.equal({
                tableName: "parent2",
                columns: [{
                    name: "col2",
                    rename: "destCol",
                    type: ColumnType.string,
                    cast: true
                }]
            });
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.union = oldSet;
        });
    });

    it("should export", (done) => {
        const node = createNode(DagNodeType.Export);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol])
        node.setParam({
            columns: [{
                sourceColumn: "test",
                destColumn: "test"
            }],
            driver: "testDriver",
            driverArgs: {"arg1": "val1"}
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldExport = XIApi.exportTable;

        XIApi.exportTable = (txId, tableName, driverName, driverParams, driverColumns, exportName) => {
            expect(txId).to.equal(1);
            expect(tableName).to.equal("testTable");
            expect(driverName).to.equal("testDriver");
            expect(driverParams).to.be.an("object");
            expect(driverParams["arg1"]).to.equal("val1");
            expect(driverColumns.length).to.equal(1);
            expect(driverColumns[0].headerName).to.equal("test");
            expect(driverColumns[0].columnName).to.equal("test");
            expect(exportName).not.to.be.empty;
            expect(exportName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.exportTable = oldExport;
        });
    });

    it("should work for link out", (done) => {
        const node = createNode(DagNodeType.DFOut);
        const parentNode = createNode();
        node.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);

        executor.run()
        .then(() => {
            expect(node.getTable()).to.equal("testTable");
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should publish IMD", (done) => {
        const node = createNode(DagNodeType.PublishIMD);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("parentTable");
        node.setParam({
            pubTableName: "testTable2",
            primaryKeys: ["pk"],
            operator: "testCol",
            columns: ["test"]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldPublish = XIApi.publishTable;

        XIApi.publishTable = (txId, primaryKeys, srcTableName, pubTableName, colInfo, imdCol) => {
            expect(txId).to.equal(1);
            expect(primaryKeys.length).to.equal(1);
            expect(primaryKeys[0]).to.equal("pk");
            expect(srcTableName).to.equal("parentTable");
            expect(pubTableName).to.equal("testTable2");
            expect(colInfo.length).to.equal(1);
            expect(colInfo[0]).to.deep.include({
                orig: "test",
                new: "test",
                type: 4
            });
            expect(imdCol).to.equal("testCol")
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.publishTable = oldPublish;
        });
    });

    it("should work for get IMDTable", (done) => {
        const node = createNode(DagNodeType.IMDTable);
        node.setParam({
            source: "testTable",
            version: 1,
            schema: [{name: "testCol", type: ColumnType.integer}],
            filterString: "eq(testCol, 1)"
        });

        const executor = new DagNodeExecutor(node, txId);
        const oldRestore = PTblManager.Instance.activateTables;
        const oldRefresh = XcalarRefreshTable;
        const oldGetMeta = XIApi.getTableMeta;

        XIApi.getTableMeta = () => {
            return PromiseHelper.resolve({metas: []});
        }

        PTblManager.Instance.activateTables = (tables) => {
            expect(tables[0]).to.equal("testTable");
            return PromiseHelper.resolve();
        };


        XcalarRefreshTable = (source, newTableName, minBatch, maxBatch, txId, filterString, columnInfo) => {
            expect(source).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(minBatch).to.equal(-1);
            expect(maxBatch).to.equal(1);
            expect(txId).to.equal(1);
            expect(filterString).to.equal("eq(testCol, 1)");
            expect(columnInfo.length).to.equal(1);
            expect(columnInfo[0]).to.deep.equal({
                sourceColumn: "testCol",
                destColumn: "testCol",
                columnType: "DfInt64"
            });
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            PTblManager.Instance.activateTables = oldRestore;
            XcalarRefreshTable = oldRefresh;
            XIApi.getTableMeta = oldGetMeta;
        });
    });

    it("should work for rowNum", (done) => {
        const node = createNode(DagNodeType.RowNum);
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.setParam({
            newField: "testCol",
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldGenRowNum = XIApi.genRowNum;

        XIApi.genRowNum = (txId, tableName, newColName, newTableName) => {
            expect(txId).to.equal(1);
            expect(tableName).to.equal("testTable");
            expect(newColName).to.equal("testCol");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.genRowNum = oldGenRowNum;
        });
    });

    it("should work for index", (done) => {
        const node = DagNodeFactory.create({
            type: DagNodeType.Index,
            input: {
                columns: [{
                    name: "testCol",
                    keyFieldName: "newKey"
                }],
                dhtName: "dht"
            }
        });
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldIndex = XIApi.index;

        XIApi.index = (txId, colNames, tableName, newTableName, newKeys, dhtName) => {
            expect(txId).to.equal(1);
            expect(colNames.length).to.equal(1);
            expect(colNames[0]).to.equal("testCol");
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.be.undefined;
            expect(newKeys.length).to.equal(1);
            expect(newKeys[0]).to.equal("newKey");
            expect(dhtName).to.equal("dht");
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.index = oldIndex;
        });
    });

    it("should work for sort", (done) => {
        const node = createNode(DagNodeType.Sort);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("testCol", "testCol", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.getLineage().columnsWithParamsReplaced = [progCol];
        parentNode.setTable("testTable");
        node.setParam({
            columns: [{
                columnName: "testCol",
                ordering: "Ascending"
            }],
            newKeys: ["newKey"]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSort = XIApi.sort;

        XIApi.sort = (txId, keyInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(keyInfos.length).to.equal(1);
            expect(keyInfos[0]).to.deep.equal({
                keyFieldName: "newKey",
                name: "testCol",
                ordering: 3,
                type: 4
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.sort = oldSort;
        });
    });

    it("should work for deskew", (done) => {
        const node = createNode(DagNodeType.Deskew);
        const parentNode = createNode();
        let progCol = ColManager.newPullCol("testCol", "testCol", ColumnType.integer);
        parentNode.getLineage().setColumns([progCol]);
        parentNode.setTable("testTable");
        node.setParam({
            column: "testCol"
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldIndex = XIApi.index;

        XIApi.index = (txId, colNames, tableName, newTableName, newKeys) => {
            expect(txId).to.equal(1);
            expect(colNames.length).to.equal(1);
            expect(colNames[0]).to.equal("testCol");
            expect(tableName).to.equal("testTable");
            expect(newKeys.length).to.equal(1);
            expect(newKeys[0]).to.equal("testCol");
            return PromiseHelper.resolve({});
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.index = oldIndex;
        });
    });

    it("should work for placeholder", (done) => {
        const node = createNode(DagNodeType.Placeholder);
        const executor = new DagNodeExecutor(node, txId);
        executor.run()
        .then(() => {
            expect(node.getTable()).to.be.undefined;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should work for synthesize", (done) => {
        const node = DagNodeFactory.create({
            type: DagNodeType.Synthesize,
            input: {
                colsInfo: [{
                    sourceColumn: "testCol",
                    destColumn: "newCol",
                    columnType: "DfString"
                }],
            }
        });
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize = XIApi.synthesize;

        XIApi.synthesize = (txId, colInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(colInfos.length).to.equal(1);
            expect(colInfos[0]).to.deep.equal({
                orig: "testCol",
                new: "newCol",
                type: 1
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.synthesize = oldSynthesize;
        });
    });

    it("should work for SQLFuncIn", (done) => {
        const node = createNode(DagNodeType.SQLFuncIn);
        node.setParam({
            source: "testTable"
        });
        node.setSchema([{name: "testCol", type: ColumnType.integer}]);
        const executor = new DagNodeExecutor(node, txId);
        const oldRefresh = XcalarRefreshTable;

        XcalarRefreshTable = (pubTableName, dstTableName, minBatch, maxBatch, txId, filterString, columnInfo) => {
            expect(pubTableName).to.equal("testTable");
            expect(dstTableName).to.not.to.be.empty;
            expect(dstTableName).to.be.a("string");
            expect(minBatch).to.equal(-1);
            expect(maxBatch).to.equal(-1);
            expect(txId).to.equal(1);
            expect(filterString).to.equal("");
            expect(columnInfo.length).to.equal(1);
            expect(columnInfo[0]).to.deep.equal({
                sourceColumn: "testCol",
                destColumn: "testCol",
                columnType: "DfInt64"
            });
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XcalarRefreshTable = oldRefresh;
        });
    });

    it("should work for SQLFuncOut", (done) => {
        const node = createNode(DagNodeType.SQLFuncOut);
        const parentNode = createNode();
        parentNode.setTable("testTable");
        node.setParam({
            schema: [{name: "testCol", type: ColumnType.integer}]
        });
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize = XIApi.synthesize;

        XIApi.synthesize = (txId, colInfos, tableName, newTableName) => {
            expect(txId).to.equal(1);
            expect(colInfos.length).to.equal(1);
            expect(colInfos[0]).to.deep.equal({
                orig: "testCol",
                new: "TESTCOL",
                type: 4
            });
            expect(tableName).to.equal("testTable");
            expect(newTableName).to.not.to.be.empty;
            expect(newTableName).to.be.a("string");
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.synthesize = oldSynthesize;
        });
    });
    it("should work for custom", (done) => {
        let customNodeInfo = {
                "version": 1,
                "type": "custom",
                "subType": null,
                "display": {
                    "x": 610,
                    "y": 120
                },
                "description": "",
                "title": "Node 11",
                "input": {},
                "id": "dag_5D38D6453793C52F_1564545230115_91",
                "state": "Error",
                "error": "Requires 1 parents",
                "configured": false,
                "aggregates": [],
                "inPorts": [
                    {
                        "parentId": "dag_5D38D6453793C52F_1564545230117_94",
                        "pos": 0
                    }
                ],
                "outPorts": [
                    {
                        "childId": "dag_5D38D6453793C52F_1564545230117_95",
                        "pos": 0
                    }
                ],
                "customName": "Custom",
                "parents": [],
                "subGraph": {
                    "nodes": [
                        {
                            "version": 1,
                            "type": "map",
                            "subType": null,
                            "display": {
                                "x": 180,
                                "y": 40
                            },
                            "description": "",
                            "title": "Node 9",
                            "input": {
                                "eval": [
                                    {
                                        "evalString": "add(1, 2)",
                                        "newField": "three"
                                    }
                                ],
                                "icv": false
                            },
                            "state": "Error",
                            "error": "Requires 1 parents",
                            "configured": true,
                            "aggregates": [],
                            "udfError": null,
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230117_94"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230116_92"
                        },
                        {
                            "version": 1,
                            "type": "filter",
                            "subType": null,
                            "display": {
                                "x": 320,
                                "y": 40
                            },
                            "description": "",
                            "title": "Node 10",
                            "input": {
                                "evalString": "eq(1, 1)"
                            },
                            "state": "Configured",
                            "configured": true,
                            "aggregates": [],
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230116_92"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230116_93"
                        },
                        {
                            "version": 1,
                            "type": "customInput",
                            "subType": null,
                            "display": {
                                "x": 40,
                                "y": 40
                            },
                            "description": "",
                            "title": "",
                            "input": {},
                            "state": "Error",
                            "error": "Requires 1 parents",
                            "configured": false,
                            "aggregates": [],
                            "parents": [],
                            "nodeId": "dag_5D38D6453793C52F_1564545230117_94"
                        },
                        {
                            "version": 1,
                            "type": "customOutput",
                            "subType": null,
                            "display": {
                                "x": 460,
                                "y": 40
                            },
                            "description": "",
                            "title": "",
                            "input": {},
                            "state": "Unused",
                            "configured": false,
                            "aggregates": [],
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230116_93"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230117_95"
                        }
                    ],
                    "comments": [],
                    "display": {
                        "width": 660,
                        "height": 140
                    },
                    "operationTime": 0
                }
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(customNodeInfo);
        const parentNode = createNode();
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, txId);
        const oldFilter = XIApi.filter;
        let called = false;

        XIApi.filter = (txId, fltStr, tableName, newTableName) => {
            expect(txId).to.equal(symTxIdCount + 3.5);
            expect(fltStr).to.equal("eq(1, 1)");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            called = true;
            return PromiseHelper.resolve();
        };

        const oldMap = XIApi.map;
        let called2 = false;
        XIApi.map = (txId, mapStr, tableName) => {
            expect(txId).to.equal(symTxIdCount + 2.5);
            expect(mapStr).to.deep.equal(["add(1, 2)"]);
            expect(tableName).to.equal("testTable");
            called2 = true;
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            expect(called).to.be.true;
            expect(called2).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.filter = oldFilter;
            XIApi.map = oldMap;
        });
    });

    it("should work for custom simulate", (done) => {
        let customNodeInfo = {
                "version": 1,
                "type": "custom",
                "subType": null,
                "display": {
                    "x": 610,
                    "y": 120
                },
                "description": "",
                "title": "Node 11",
                "input": {},
                "id": "dag_5D38D6453793C52F_1564545230115_91",
                "state": "Error",
                "error": "Requires 1 parents",
                "configured": false,
                "aggregates": [],
                "inPorts": [
                    {
                        "parentId": "dag_5D38D6453793C52F_1564545230117_94",
                        "pos": 0
                    }
                ],
                "outPorts": [
                    {
                        "childId": "dag_5D38D6453793C52F_1564545230117_95",
                        "pos": 0
                    }
                ],
                "customName": "Custom",
                "parents": [],
                "subGraph": {
                    "nodes": [
                        {
                            "version": 1,
                            "type": "map",
                            "subType": null,
                            "display": {
                                "x": 180,
                                "y": 40
                            },
                            "description": "",
                            "title": "Node 9",
                            "input": {
                                "eval": [
                                    {
                                        "evalString": "add(1, 2)",
                                        "newField": "three"
                                    }
                                ],
                                "icv": false
                            },
                            "state": "Error",
                            "error": "Requires 1 parents",
                            "configured": true,
                            "aggregates": [],
                            "udfError": null,
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230117_94"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230116_92"
                        },
                        {
                            "version": 1,
                            "type": "filter",
                            "subType": null,
                            "display": {
                                "x": 320,
                                "y": 40
                            },
                            "description": "",
                            "title": "Node 10",
                            "input": {
                                "evalString": "eq(1, 1)"
                            },
                            "state": "Configured",
                            "configured": true,
                            "aggregates": [],
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230116_92"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230116_93"
                        },
                        {
                            "version": 1,
                            "type": "customInput",
                            "subType": null,
                            "display": {
                                "x": 40,
                                "y": 40
                            },
                            "description": "",
                            "title": "",
                            "input": {},
                            "state": "Error",
                            "error": "Requires 1 parents",
                            "configured": false,
                            "aggregates": [],
                            "parents": [],
                            "nodeId": "dag_5D38D6453793C52F_1564545230117_94"
                        },
                        {
                            "version": 1,
                            "type": "customOutput",
                            "subType": null,
                            "display": {
                                "x": 460,
                                "y": 40
                            },
                            "description": "",
                            "title": "",
                            "input": {},
                            "state": "Unused",
                            "configured": false,
                            "aggregates": [],
                            "parents": [
                                "dag_5D38D6453793C52F_1564545230116_93"
                            ],
                            "nodeId": "dag_5D38D6453793C52F_1564545230117_95"
                        }
                    ],
                    "comments": [],
                    "display": {
                        "width": 660,
                        "height": 140
                    },
                    "operationTime": 0
                }
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(customNodeInfo);
        const parentNode = createNode();
        node.connectToParent(parentNode);

        const executor = new DagNodeExecutor(node, symTxId);
        const oldFilter = XIApi.filter;
        let called = false;

        XIApi.filter = (txId, fltStr, tableName, newTableName) => {
            expect(txId).to.equal(symTxIdCount + 6.5);
            expect(fltStr).to.equal("eq(1, 1)");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            called = true;
            return PromiseHelper.resolve();
        };

        const oldMap = XIApi.map;
        let called2 = false;
        XIApi.map = (txId, mapStr, tableName) => {
            expect(txId).to.equal(symTxIdCount + 5.5);
            expect(mapStr).to.deep.equal(["add(1, 2)"]);
            expect(tableName).to.equal("testTable");
            called2 = true;
            return PromiseHelper.resolve();
        };
        const oldQuery =  XIApi.query;
        let called3 = false;
        XIApi.query = (txId, destTable, queryStr) => {
            expect(txId).to.equal(1.5);
            expect(queryStr).to.equal("[]");
            called3 = true;
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            expect(called).to.be.true;
            expect(called2).to.be.true;
            expect(called3).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.filter = oldFilter;
            XIApi.map = oldMap;
            XIApi.query = oldQuery;
        });
    });

    it("should work for _dfIn _linkWithBatch", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": ""
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);
        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: createNode(DagNodeType.DFOut, "")
            }
        };
        txId = Transaction.start({
            operation: "test"
        });

        const executor = new DagNodeExecutor(node, txId);

        const oldQuery =  XIApi.query;
        let called = false;

        XIApi.query = (newTxId, destTable, queryStr) => {
            expect(txId).to.equal(newTxId);
            expect(queryStr).to.equal("[]");
            called = true;
        };

        executor.run()
        .then(() => {
            expect(called).to.be.false;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.query = oldQuery;
        });
    });

    it.skip("should work for _dfIn _linkWithExecuteParentGraph", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": ""
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);
        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: createNode(DagNodeType.DFOut)
            }
        }

        txId = Transaction.start({
            operation: "test"
        });

        const executor = new DagNodeExecutor(node, txId);

        const oldQuery =  XIApi.query;
        let called = false;

        XIApi.query = (newTxId, destTable, queryStr) => {
            expect(txId).to.equal(newTxId);
            expect(queryStr).to.equal("[]");
            called = true;
        };


        executor.run()
        .then(() => {
            expect(called).to.be.false; // reuse cache
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.query = oldQuery;
        });
    });

    it("should work for _dfIn _synthesizeDFOutInBatch", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": ""
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);
        let outNode = createNode(DagNodeType.DFOut, "", DagNodeSubType.DFOutOptimized);
        const parentNode = createNode();
        outNode.connectToParent(parentNode);
        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: outNode
            }
        }

        const executor = new DagNodeExecutor(node, txId);

         const oldQuery =  XIApi.query;
        let called = false;
        XIApi.query = (newTxId, destTable, queryStr) => {
            expect(txId).to.equal(newTxId);
            expect(queryStr).to.equal("[]");
            called = true;
            return PromiseHelper.resolve();
        };

        let oldSynthesize = XIApi.synthesize;
        let called2 = false;
        XIApi.synthesize = () => {
            called2 = true;
            return PromiseHelper.resolve();
        }

        executor.run(true)
        .then(() => {
            expect(called).to.be.false;
            expect(called2).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.query = oldQuery;
            XIApi.synthesize = oldSynthesize;
        });
    });

    it("should work for _dfIn _linkWithExecution", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": ""
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);
        let outNode =  createNode(DagNodeType.DFOut);
        outNode.shouldLinkAfterExecution = () => true;
        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: outNode
            }
        }

        const executor = new DagNodeExecutor(node, txId);

        executor.run()
        .then(() => {
            expect(node.getState()).to.equal(DagNodeState.Complete);
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should work for _dfIn _linkWithExecution synthesize", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": ""
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);
        node.getTable = () => "testTable";
        let outNode =  createNode(DagNodeType.DFOut);
        outNode.shouldLinkAfterExecution = () => true;
        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: outNode
            }
        }

        const executor = new DagNodeExecutor(node, txId);
        const oldSynthesize =  XIApi.synthesize;
        let called = false;
        XIApi.synthesize = (newTxId, colInfos, tableName, newTableName, sameSession) => {
            expect(txId).to.equal(newTxId);
            expect(tableName).to.equal("testTable");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(sameSession).to.be.false;
            called = true;
            return PromiseHelper.resolve();
        };
        executor.run(true)
        .then(() => {
            expect(called).to.be.true;
            XIApi.synthesize = oldSynthesize;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        });
    });

    it("should work for _dfIn _linkWithSource", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": "testSource"
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);

        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: createNode(DagNodeType.DFOut)
            }
        }

        const executor = new DagNodeExecutor(node, txId);
        let oldAddTable = DagTblManager.Instance.addTable;
        let called = false;
        DagTblManager.Instance.addTable = () => {
            called = true;
        };

        let oldMeta = XIApi.getTableMeta;
        let called2 = false;
        XIApi.getTableMeta = () => {
            called2 = true;
            return PromiseHelper.resolve("testSource");
        }


        executor.run()
        .then(() => {
            expect(called).to.be.true;
            expect(called2).to.be.true;
            expect(node.getState()).to.equal(DagNodeState.Complete);
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            DagTblManager.Instance.addTable = oldAddTable;
            XIApi.getTableMeta = oldMeta;
        });
    });

    it("should work for _dfIn _linkWithSource optimized", (done) => {
        let nodeInfo =
            {
                "version": 1,
                "type": "link in",
                "subType": null,
                "display": {
                    "x": 320,
                    "y": 240
                },
                "description": "",
                "title": "Node 12",
                "input": {
                    "dataflowId": "self",
                    "linkOutName": "a",
                    "source": "testSource"
                },
                "id": "dag_5D38D6453793C52F_1564551809791_101",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "flight5016::CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(nodeInfo);

        node.getLinkedNodeAndGraph = () => {
            return {
                graph: new DagGraph(),
                node: createNode(DagNodeType.DFOut)
            }
        }

        const executor = new DagNodeExecutor(node, txId);

        const oldSynthesize =  XIApi.synthesize;
        let called = false;
        XIApi.synthesize = (newTxId, colInfos, tableName, newTableName, sameSession) => {
            expect(txId).to.equal(newTxId);
            expect(tableName).to.equal("testSource");
            expect(newTableName).not.to.be.empty;
            expect(newTableName).to.be.a("string");
            expect(sameSession).to.be.false;
            called = true;
            return PromiseHelper.resolve();
        };


        executor.run(true)
        .then(() => {
            txId = 1;
            expect(called).to.be.true;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {
            XIApi.synthesize = oldSynthesize;
        });
    });

    // XXX need more thorough testing
    it("should work for sql", (done) => {
        let sqlNodeInfo = {
                "version": 1,
                "type": "sql",
                "subType": null,
                "display": {
                    "x": 100,
                    "y": 200
                },
                "description": "",
                "title": "Node 4",
                "input": {
                    "sqlQueryStr": "SELECT * FROM b",
                    "identifiers": {
                        "1": "b"
                    },
                    "identifiersOrder": [
                        1
                    ],
                    "dropAsYouGo": true
                },
                "id": "dag_5D38D6453793C52F_1564163314149_38",
                "state": "Error",
                "error": "Unknown Error",
                "configured": true,
                "aggregates": [],
                "tableSrcMap": {},
                "columns": [
                    {
                        "name": "CHECKSUM",
                        "backName": "CHECKSUM",
                        "type": "integer"
                    }
                ],
                "parents": [
                    "dag_5D38D6453793C52F_1564163432905_39"
                ]
        };
        let datasetNodeInfo = {
                "version": 1,
                "type": "dataset",
                "subType": null,
                "display": {
                    "x": 20,
                    "y": 120
                },
                "description": "",
                "title": "Node 5",
                "input": {
                    "source": "admin.97128.flight5016",
                    "prefix": "flight5016",
                    "synthesize": false,
                    "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"admin.97128.flight5016\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/flight/airlines/\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\n\\\",\\\"fieldDelim\\\":\\\",\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CheckSum\",\n                        \"destColumn\": \"CheckSum\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Timestamp\",\n                        \"destColumn\": \"Timestamp\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Category\",\n                        \"destColumn\": \"Category\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Towers\",\n                        \"destColumn\": \"Towers\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"TypeOfInformation\",\n                        \"destColumn\": \"TypeOfInformation\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Year\",\n                        \"destColumn\": \"Year\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Month\",\n                        \"destColumn\": \"Month\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DayofMonth\",\n                        \"destColumn\": \"DayofMonth\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DayOfWeek\",\n                        \"destColumn\": \"DayOfWeek\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"DepTime\",\n                        \"destColumn\": \"DepTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSDepTime\",\n                        \"destColumn\": \"CRSDepTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"ArrTime\",\n                        \"destColumn\": \"ArrTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSArrTime\",\n                        \"destColumn\": \"CRSArrTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"UniqueCarrier\",\n                        \"destColumn\": \"UniqueCarrier\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"FlightNum\",\n                        \"destColumn\": \"FlightNum\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TailNum\",\n                        \"destColumn\": \"TailNum\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"ActualElapsedTime\",\n                        \"destColumn\": \"ActualElapsedTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CRSElapsedTime\",\n                        \"destColumn\": \"CRSElapsedTime\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"AirTime\",\n                        \"destColumn\": \"AirTime\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"ArrDelay\",\n                        \"destColumn\": \"ArrDelay\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"DepDelay\",\n                        \"destColumn\": \"DepDelay\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Origin\",\n                        \"destColumn\": \"Origin\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Dest\",\n                        \"destColumn\": \"Dest\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Distance\",\n                        \"destColumn\": \"Distance\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TaxiIn\",\n                        \"destColumn\": \"TaxiIn\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"TaxiOut\",\n                        \"destColumn\": \"TaxiOut\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"Cancelled\",\n                        \"destColumn\": \"Cancelled\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CancellationCode\",\n                        \"destColumn\": \"CancellationCode\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"Diverted\",\n                        \"destColumn\": \"Diverted\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CarrierDelay\",\n                        \"destColumn\": \"CarrierDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"WeatherDelay\",\n                        \"destColumn\": \"WeatherDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"NASDelay\",\n                        \"destColumn\": \"NASDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"SecurityDelay\",\n                        \"destColumn\": \"SecurityDelay\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"LateAircraftDelay\",\n                        \"destColumn\": \"LateAircraftDelay\",\n                        \"columnType\": \"DfInt64\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                },
                "id": "dag_5D38D6453793C52F_1564163432905_39",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "schema": [
                    {
                        "name": "CheckSum",
                        "type": "integer"
                    }
                ],
                "parents": []
            };
        let node = DagViewManager.Instance.getActiveDag().newNode(sqlNodeInfo);
        node.getXcQueryString = () => {
            return "testQuery";
        };
        node.subGraph = new DagSubGraph();

        const executor = new DagNodeExecutor(node, txId);
        let called = false;
        node.replaceSQLTableName = (queryStr) => {
            expect(queryStr).to.equal("testQuery");
            called = true;
            return {
                newQueryStr: "[]",
                newTableSrcMap: {},
                newTableMap: {}
            };
        }

        let oldQuery = XIApi.query;
        let called2 = false;
        XIApi.query = (txId, queryId, finalQueryStr, options) => {
            called2  = true;
            expect(txId).to.equal(1);
            expect(queryId.startsWith("sqlQuery")).to.be.true;
            expect(finalQueryStr).to.equal("[]");
            expect(options.checkTime).to.equal(500);
            return PromiseHelper.resolve();
        };

        executor.run()
        .then(() => {
            expect(called).to.be.true;
            expect(called2).to.be.true;
            XIApi.query = oldQuery;
            done();
        })
        .fail((error) => {
            console.error("fail", error);
            done("fail");
        })
        .always(() => {

        });
    });

    it("_mapEvalStrAggs", () => {
        const node = createNode(DagNodeType.Map);
        const executor = new DagNodeExecutor(node, txId);
        executor.isOptimized = true;
        let aggs = ["^test"];
        executor.aggNames = new Set(["^test"]);
        let res = executor._mapEvalStrAggs("add(^test, 3)", aggs);
        expect(res).to.equal("add(^batch_undefined_test, 3)");
    });

    after(function() {
        Transaction.get = cachedTransactionGet;
    });
});
