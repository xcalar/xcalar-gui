describe("Transaction Test", function() {
    var id;
    describe("transaction start", function(){
        it("Query manager should not receive addQuery call if not tracking", function() {
            var called1 = false;
            var cacheFn = QueryManager.addQuery;
            QueryManager.addQuery = function(curId, operation, queryOptions) {
                called1 = true;
            };

            id = Transaction.start({
                operation: "test operation",
                msg: "msg",
                steps: 3,
                sql: {
                    retName: "myret",
                    tableNames: ["mytable"]
                },
                track: false
            });

            expect(isNaN(id)).to.be.false;
            expect(id).to.be.gt(0);
            expect(called1).to.be.false;

            var txCache = Transaction.getCache();
            delete txCache[id];
            QueryManager.addQuery = cacheFn;
        });

        it("Query manager should receive addQuery call", function() {
            var called1 = false;
            var called2 = false;
            var cacheFn = QueryManager.addQuery;

            QueryManager.addQuery = function(curId, operation, queryOptions) {
                expect(isNaN(curId)).to.be.false;
                expect(curId).to.be.gt(0);
                expect(operation).to.equal("test operation myret");
                expect(queryOptions.srcTables.length).to.equal(1);
                expect(queryOptions.srcTables[0]).to.equal("mytable");
                expect(queryOptions.numSteps).to.equal(3);
                called1 = true;
            }

            var cacheFn2 = StatusMessage.addMsg;
            StatusMessage.addMsg = function(info) {
                expect(info.msg).to.equal("msg");
                expect(info.operation).to.equal("test operation");
                called2 = true;
                return 99;
            };

            id = Transaction.start({
                operation: "test operation",
                msg: "msg",
                steps: 3,
                track: true,
                sql: {
                    retName: "myret",
                    tableNames: ["mytable"]
                }
            });

            expect(isNaN(id)).to.be.false;
            expect(id).to.be.gt(0);
            expect(called1).to.be.true;
            expect(called2).to.be.true;

            var txs = Transaction.getCache();
            expect(txs[id].operation).to.equal("test operation");
            expect(txs[id].msgId).to.equal(99);
            expect(txs[id].sql.retName).to.equal("myret");
            expect(txs[id].sql.tableNames[0]).to.equal("mytable");
            QueryManager.addQuery = cacheFn;
            StatusMessage.addMsg = cacheFn2;
        });

        it("startSubQuery with invalid txid should return", function() {
            var called1 = false;
            var cacheFn = QueryManager.addSubQuery;
            QueryManager.addSubQuery = function(curId, operation, queryOptions) {
                called1 = true;
            }

            Transaction.startSubQuery(-1);
            expect(called1).to.be.false;
            QueryManager.addSubQuery = cacheFn;
        });

        it("startSubQuery with valid txid should return", function() {
            var called1 = false;
            var cacheFn = QueryManager.addSubQuery;
            QueryManager.addSubQuery = function(txId, name, dstTable, query, options) {

                expect(txId).to.equal(id);
                expect(name).to.equal("map");
                expect(dstTable).to.equal("table2");
                expect(query.args).to.equal("somequery");
                expect(options.exportFileName).to.equal("expName");
                called1 = true;
            }

            var cacheFn2 = QueryManager.parseQuery;
            QueryManager.parseQuery = function() {
                called1 = true;
                return [{exportFileName: "expName"}];
            };

            Transaction.startSubQuery(id, "map", "table2", {args: "somequery"});
            expect(called1).to.be.true;
            QueryManager.addSubQuery = cacheFn;
            QueryManager.parseQuery = cacheFn2;
        });

        it("startSubQuery with valid txid should call addSubQuery with queryName", function() {
            var called1 = false;
            var cacheFn = QueryManager.addSubQuery;
            var count = 0;
            QueryManager.addSubQuery = function(txId, name, dstTable, query, options) {
                expect(txId).to.equal(id);
                expect(name).to.equal("a");
                expect(dstTable).to.equal("b");
                expect(query).to.equal("c");
                expect(options.queryName).to.equal("map");
                count++;
                called1 = true;
            }

            var called2 = false;
            var cacheFn2 = QueryManager.parseQuery;
            QueryManager.parseQuery = function() {
                called2 = true;
                return [{name: "a", dstTable:"b", query:"c"}, {name: "a", dstTable:"b", query:"c"}];
            };

            Transaction.startSubQuery(id, "map", "table2", {args: "somequery"});
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            expect(count).to.equal(2);
            QueryManager.addSubQuery = cacheFn;
            QueryManager.parseQuery = cacheFn2;
        });

        it("invalid transaction.log should not call subquerydone", function() {
            var called = false;
            var cacheFn = QueryManager.subQueryDone;
            QueryManager.subQueryDone = function(txId, dstTableName, timeObj, options) {
                called = true;
            };

            Transaction.log(-1, "table1", {time: 2}, {empty: true});
            expect(called).to.be.false;

            QueryManager.subQueryDone = cacheFn;
        });

        it("transaction.log should call subquerydone", function() {
            var called = false;
            var cacheFn = QueryManager.subQueryDone;
            QueryManager.subQueryDone = function(txId, dstTableName, timeObj, options) {
                expect(txId).to.equal(id);
                expect(dstTableName).to.equal("table1");
                expect(timeObj.time).to.equal(2);
                expect(options.empty).to.be.true;
                called = true;
            };

            Transaction.log(id, "",  "table1", {time: 2}, {empty: true});
            expect(called).to.be.true;

            QueryManager.subQueryDone = cacheFn;
        });
    });

    describe("transaction done", function() {
        it("invalid txId in done should not call QueryManager.queryDone", function() {
            var called1 = false;
            var cacheFn1 = QueryManager.queryDone;
            QueryManager.queryDone = function() {
                called1 = true;
            }
            Transaction.done(-1);
            expect(called1).to.be.false;
            QueryManager.queryDone = cacheFn1;
        });

        it("canceled detection should work", function() {
            var called1 = false;
            var cacheFn1 = QueryManager.queryDone;
            QueryManager.queryDone = function() {
                called1 = true;
            }

            var called2 = false;
            var cacheFn2 = QueryManager.cleanUpCanceledTables;
            QueryManager.cleanUpCanceledTables = function() {
                called2 = true;
            };

            var info = Transaction.__testOnly__.getAll();
            info.canceledTxCache[id] = true;

            Transaction.done(id);

            expect(called1).to.be.false;
            expect(called2).to.be.true;

            delete info.canceledTxCache[id];
            QueryManager.queryDone = cacheFn1;
            QueryManager.cleanUpCanceledTables = cacheFn2;
        });

        it("QueryManager.queryDone should be called", function() {
            var called1 = false;
            var cacheFn1 = QueryManager.queryDone;
            QueryManager.queryDone = function() {
                called1 = true;
            };

            var called2 = false;
            var cacheFn2 = StatusMessage.success;
            StatusMessage.success = function(msgId, noNotification, tableId, msgOptions) {
                called2 = true;
            };

            var cacheFn3 = QueryManager.getAllDstTables;
            QueryManager.getAllDstTables = function(txId) {
                return ["t1"];
            };

            var cacheFn4 = MonitorPanel.tableUsageChange;
            var called4 = false;
            MonitorPanel.tableUsageChange = function() {
                called4 = true;
            };

            var info = Transaction.__testOnly__.getAll();
            expect(info.txCache[id]).to.not.be.empty;

            Transaction.done(id);

            expect(info.txCache[id]).to.be.undefined;
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            expect(called4).to.be.true;
            QueryManager.queryDone = cacheFn1;
            StatusMessage.success = cacheFn2;
            QueryManager.getAllDstTables = cacheFn3;
            MonitorPanel.tableUsageChange = cacheFn4;
        });
    });
    describe("transaction fail", function() {
        var id;
        before(function() {
            var cacheFn = QueryManager.addQuery;
            QueryManager.addQuery = function(curId, operation, queryOptions) {
            }

            var cacheFn2 = StatusMessage.addMsg;
            StatusMessage.addMsg = function(info) {
                return 99;
            };

            id = Transaction.start({
                operation: "test operation",
                msg: "msg",
                steps: 3,
                track: true,
                sql: {
                    retName: "myret",
                    tableNames: ["mytable"]
                }
            });

            QueryManager.addQuery = cacheFn;
            StatusMessage.addMsg = cacheFn2;
        });

        it ("fail should return if invalid id", function() {
            var cacheFn1 = Log.errorLog;
            var called1 = false;
            Log.errorLog  = function(title, sql, cli, error) {
                called1 = true;
            };

            Transaction.fail(-1);
            expect(called1).to.be.false;
            Log.errorLog = cacheFn1;
        });

        it("canceled detection should work", function() {
            var cacheFn1 = Log.errorLog;
            var called1 = false;
            Log.errorLog  = function(title, sql, cli, error) {
                called1 = true;
            };

            var called2 = false;
            var cacheFn2 = QueryManager.cleanUpCanceledTables;
            QueryManager.cleanUpCanceledTables = function() {
                called2 = true;
            };

            var info = Transaction.__testOnly__.getAll();
            info.canceledTxCache[id] = true;

            Transaction.fail(id, {});

            expect(called1).to.be.false;
            expect(called2).to.be.true;

            delete info.canceledTxCache[id];
            Log.errorLog = cacheFn1;
            QueryManager.cleanUpCanceledTables = cacheFn2;
        });

        it ("should succeed", function() {
            var cacheFn1 = Log.errorLog;
            var called1 = false;
            Log.errorLog  = function(title, sql, cli, error) {
                called1 = true;
            };

            var called2 = false;
            var cacheFn2 = StatusMessage.fail;
            StatusMessage.fail = function(msg, msgId, srcTableId) {
                expect(srcTableId).to.equal("someId");
                called2 = true;
            };

            var info = Transaction.__testOnly__.getAll();
            expect(info.txCache[id]).to.not.be.empty;

            Transaction.fail(id, {sql: {
                tableId: "someId"
            }});

            expect(info.txCache[id]).to.be.undefined;
            UnitTest.hasAlertWithTitle(CommonTxtTstr.OpFail);
            expect(called1).to.be.true;
            expect(called2).to.be.true;

            Log.errorLog = cacheFn1;
            StatusMessage.fail = cacheFn2;
        });
    });

    describe("transaction cancel", function() {
        var id;
        before(function() {
            var cacheFn = QueryManager.addQuery;
            QueryManager.addQuery = function(curId, operation, queryOptions) {
            }

            var cacheFn2 = StatusMessage.addMsg;
            StatusMessage.addMsg = function(info) {
                return 99;
            };

            id = Transaction.start({
                operation: "test operation",
                msg: "msg",
                steps: 3,
                track: true,
                sql: {
                    retName: "myret",
                    tableNames: ["mytable"]
                }
            });

            QueryManager.addQuery = cacheFn;
            StatusMessage.addMsg = cacheFn2;
        });

        it ("cancel should return if invalid id", function() {
            var cacheFn1 = QueryManager.confirmCanceledQuery;
            var called1 = false;
            QueryManager.confirmCanceledQuery = function(title, sql, cli, error) {
                called1 = true;
            };

            Transaction.cancel(-1);
            expect(called1).to.be.false;
            QueryManager.confirmCanceledQuery = cacheFn1;
        });

        it("canceled detection should work", function() {
            var cacheFn1 = QueryManager.confirmCanceledQuery;
            var called1 = false;
            QueryManager.confirmCanceledQuery = function(title, sql, cli, error) {
                called1 = true;
            };

            Transaction.cancel(-1);
            expect(called1).to.be.false;
            QueryManager.confirmCanceledQuery = cacheFn1;
        });

        it("cancel should work", function() {
            var called1 = false;
            var cacheFn1 =  StatusMessage.cancel;
            StatusMessage.cancel = function(msgId) {
                called1 = true;
            };

            var called2 = false;
            var cacheFn2 =  Log.errorLog;
            Log.errorLog = function(msgId) {
                called2 = true;
            };

            var cacheFn3 = QueryManager.confirmCanceledQuery;
            var called3 = false;
            QueryManager.confirmCanceledQuery = function(title, sql, cli, error) {
                called3 = true;
            };

            var cacheFn4 = KVStore.commit;
            var called4 = false;
            KVStore.commit = function(title, sql, cli, error) {
                called4 = true;
            };


            var info = Transaction.__testOnly__.getAll();
            expect(info.txCache[id]).to.not.be.empty;
            expect(info.canceledTxCache[id]).to.be.undefined;
            expect(info.txCache[id].cli).to.equal("");
            info.txCache[id].cli = "something";

            Transaction.cancel(id);

            expect(info.txCache[id]).to.be.undefined;
            expect(info.canceledTxCache[id]).to.not.be.empty;

            expect(called1).to.be.true;
            expect(called2).to.be.true;
            expect(called3).to.be.true;
            expect(called4).to.be.true;

            StatusMessage.cancel = cacheFn1;
            Log.errorLog = cacheFn2;
            QueryManager.confirmCanceledQuery = cacheFn3;
            KVStore.commit = cacheFn4;
        });

        it("checkCanceled should work", function() {
            expect(Transaction.checkCanceled(id)).to.be.true;
        });

        it("cleanup canceledtables should work", function() {
            var called = false;
            var cachedFn = QueryManager.cleanUpCanceledTables;
            QueryManager.cleanUpCanceledTables = function() {
                called = true;
            }
            Transaction.cleanUpCanceledTables(id);
            expect(called).to.be.true;
            QueryManager.cleanUpCanceledTables = cachedFn;
        });
    });

    describe("transaction cleaner", function() {
        it("should call delete tables", function() {
            var deleteCache = gAlwaysDelete;
            gAlwaysDelete = true;
            var called1 = false;
            var cachedFn1 = TblManager.refreshOrphanList;
            TblManager.refreshOrphanList = function() {
                called1 = true;
                return PromiseHelper.resolve();
            }

            var called2 = false;
            var cachedFn2 = TblManager.deleteTables;
            TblManager.deleteTables = function() {
                called2 = true;
                return PromiseHelper.resolve();
            }

            Transaction.__testOnly__.transactionCleaner();

            TblManager.refreshOrphanList = cachedFn1;
            TblManager.deleteTables = cachedFn2;

            gAlwaysDelete = deleteCache;
        });
    });
    describe("getSrcTables", function() {
        it("should work", function() {
            var fn = Transaction.__testOnly__.getSrcTables;

            expect(fn().length).to.equal(0);

            expect(fn({srcTables: ["a", "b"]}).length).to.equal(2);
            expect(fn({srcTables: ["a", "b"]})[0]).to.equal("a");
            expect(fn({srcTables: ["a", "b"]})[1]).to.equal("b");

            expect(fn({tableName: "a"}).length).to.equal(1);
            expect(fn({tableName: "a"})[0]).to.equal("a");

            expect(fn({tableNames: ["a", "b"]}).length).to.equal(2);
            expect(fn({tableNames: ["a", "b"]})[0]).to.equal("a");
            expect(fn({tableNames: ["a", "b"]})[1]).to.equal("b");

            var table = new TableMeta({
                "tableName": "test#99999",
                "tableId": 99999,
                "tableCols": []
            });
            gTables[99999] = table;
            expect(fn({tableId: "99999"}).length).to.equal(1);
            expect(fn({tableId: "99999"})[0]).to.equal("test#99999");
            delete gTables[99999];

            expect(fn({lTableName: "a", rTableName: "b"}).length).to.equal(2);
            expect(fn({lTableName: "a", rTableName: "b"})[0]).to.equal("a");
            expect(fn({lTableName: "a", rTableName: "b"})[1]).to.equal("b");
        });
    });

    describe("Transaction.update", () => {
        let oldAddProgress;
        let oldUpdateProgress;
        let oldRemoveProgress;
        const nodeId = 1;
        let pct;

        before(() => {
            oldAddProgress = DagViewManager.Instance.addProgress;
            oldUpdateProgress = DagViewManager.Instance.calculateAndUpdateProgress;
            oldRemoveProgress = DagViewManager.Instance.removeProgress

            DagViewManager.Instance.addProgress = (dagNodeId) => {
                expect(dagNodeId).to.equal(nodeId);
            };

            DagViewManager.Instance.removeProgress = (dagNodeId) => {
                expect(dagNodeId).to.equal(nodeId);
            };
        });

        beforeEach(() => {
            pct = null;
        });

        it("should handle error case", () => {
            const txId = Transaction.start({
                track: true,
                nodeId: nodeId
            });

            Transaction.update(txId, 10);
            expect(pct).to.equal(null);
            Transaction.done(txId);
        });

        it("should update progress", () => {
            const txId = Transaction.start({
                track: true,
                nodeId: nodeId
            });
            const queryStateOutput = {
                queryGraph: {
                    node: [{
                        state: DgDagStateT.DgDagStateProcessing,
                        numWorkCompleted: 10,
                        numWorkTotal: 20
                    }, {
                        state: DgDagStateT.DgDagStateProcessing,
                        numWorkCompleted: 30,
                        numWorkTotal: 80
                    }]
                }
            }
            Transaction.update(txId, queryStateOutput);
            Transaction.done(txId);
        });

        after(() => {
            DagViewManager.Instance.addProgress = oldAddProgress;
            DagViewManager.Instance.removeProgress = oldRemoveProgress;
        });
    });


    describe("NodeInfo in transaction", function() {
        let txLog, txId;

        before(function() {
            txId = Transaction.start({
                operation: "test"
            });
            txLog = Transaction.getCache(txId);
        });

        it("setCurrentNodeInfo should set currentNodeInfo", function() {
            txLog.setCurrentNodeInfo("nodeId", "tabId");
            expect(txLog.currentNodeInfo).to.deep.equal({nodeId: "nodeId", tabId: "tabId"});
        });

        it("resetCurrentNodeInfo should reset currentNodeInfo", function() {
            txLog.resetCurrentNodeInfo();
            expect(txLog.currentNodeInfo).to.equal(undefined);
        });

        it("setParentNodeInfo should set parentNodeInfo", function() {
            txLog.setParentNodeInfo("nodeId", "tabId");
            expect(txLog.parentNodeInfo).to.deep.equal({nodeId: "nodeId", tabId: "tabId"});
        });

        it("resetParentNodeInfo should reset parentNodeInfo", function() {
            txLog.resetParentNodeInfo();
            expect(txLog.parentNodeInfo).to.equal(undefined);
        });

        after(function() {
            Transaction.done(txId);
        });
    });
});