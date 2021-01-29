describe.skip("SQL Executor Test", function() {
    let oldUpdateHistory;

    before(function(done) {
        oldUpdateHistory = SQLHistorySpace.Instance.update;
        SQLHistorySpace.Instance.update = function() {};

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    let createExecutor = function() {
        let tableInfo = new PbTblInfo({
            name: "TEST",
            columns: [{
                name: "col",
                type: ColumnType.string
            }]
        });
        let oldMap = PTblManager.Instance.getTableMap;
        PTblManager.Instance.getTableMap = function() {
            let map = new Map();
            map.set(tableInfo.name, tableInfo);
            return map;
        };

        let executor = new SQLDagExecutor({
            sql: "select * from TEST",
            command: {
                args: [],
                type: "select"
            },
            identifiers: ["TEST"]
        });
        PTblManager.Instance.getTableMap = oldMap;
        return executor;
    };

    it("should set/get/delete tab", function() {
        let dagTab = new DagTabUser();
        let id = dagTab.getId();
        SQLDagExecutor.setTab(id, dagTab);
        expect(SQLDagExecutor.getTab(id)).to.equal(dagTab);

        SQLDagExecutor.deleteTab(id);
        expect(SQLDagExecutor.getTab(id)).to.equal(undefined);
    });

    it("should be an instance of SQLDagExecutor", function() {
        let executor = createExecutor();
        expect(executor).to.be.an.instanceof(SQLDagExecutor);
    });

    it("should throw error in invalid case", function() {
        let oldMap = PTblManager.Instance.getTableMap;
        PTblManager.Instance.getTableMap = function() {
            return new Map();
        };
        try {
            new SQLDagExecutor({
                sql: "select * from TEST",
                command: {
                    args: [],
                    type: "select"
                },
                identifiers: ["TEST"]
            });
        } catch (e) {
            expect(e).to.be.an.instanceof(Error);
        }
        PTblManager.Instance.getTableMap = oldMap;
    });

    describe("set status test", function() {
        let executor;

        before(function() {
            executor = createExecutor();
        });

        it("should get status", function() {
            let status = executor.getStatus();
            expect(status).to.equal(SQLStatus.None);
        });

        it("should set to to running status", function() {
            executor.setStatus(SQLStatus.Running);
            let status = executor.getStatus();
            expect(status).to.equal(SQLStatus.Running);
        });

        it("set cancel status should cancel execute", function() {
            executor._tempGraph = new DagGraph();
            let oldFunc = executor._tempGraph.cancelExecute;
            let called = false;
            executor._tempGraph.cancelExecute = function() {
                called = true;
            };

            executor.setStatus(SQLStatus.Cancelled);
            let status = executor.getStatus();
            expect(status).to.equal(SQLStatus.Cancelled);
            expect(called).to.be.true;

            executor._tempGraph.cancelExecute = oldFunc;
            delete executor._tempGraph;
        });

        it("should not set cancelled status", function() {
            executor.setStatus(SQLStatus.Done);
            let status = executor.getStatus();
            expect(status).to.equal(SQLStatus.Cancelled);
        });
    });

    describe("compile executor test", function() {
        it("should reject cancel status", function(done) {
            let executor = createExecutor();
            executor.setStatus(SQLStatus.Cancelled);
            let called = false;
            let callback = function() {
                called = true;
            };

            executor.compile(callback)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(SQLStatus.Cancelled);
                expect(called).to.equal(true);
                done();
            });
        });

        it("should configure sql node and compile", function(done) {
            let executor = createExecutor();
            let called = 0;

            let oldAddCache = DagTabManager.Instance.addTabCache;
            let oldInspect = DagViewManager.Instance.inspectSQLNode;

            DagTabManager.Instance.addTabCache = function() {
                called++;
            };

            DagViewManager.Instance.inspectSQLNode = function() {
                called++;
                return PromiseHelper.resolve();
            };

            executor._sqlNode.compileSQL = function() {
                called++;
                return PromiseHelper.resolve();
            };

            executor.compile()
            .then(function() {
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DagTabManager.Instance.addTabCache = oldAddCache;
                DagViewManager.Instance.inspectSQLNode = oldInspect;
            });
        });

        it("should cancel after configure sql node", function(done) {
            let executor = createExecutor();
            let called = 0;

            executor._sqlNode.compileSQL = function() {
                called++;
                executor._status = SQLStatus.Cancelled;
                return PromiseHelper.resolve();
            };

            executor.compile()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(SQLStatus.Cancelled);
                expect(called).to.equal(1);
                done();
            });
        });

        it("should reject fail compile case", function(done) {
            let executor = createExecutor();
            let called = 0;

            executor._sqlNode.compileSQL = function() {
                called++;
                return PromiseHelper.reject("test");
            };

            executor.compile()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect(called).to.equal(1);
                expect(executor.getStatus()).to.equal(SQLStatus.Failed);
                done();
            });
        });
    });

    describe("execute sql test", function() {
        it("should reject in cancel status", function(done) {
            let executor = createExecutor();
            executor.setStatus(SQLStatus.Cancelled);

            let called = false;
            let callback = function() {
                called = true;
            };

            executor.execute(callback)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.be.true;
                expect(error).to.equal(SQLStatus.Cancelled);
                done();
            });
        });

        it("should reject in fail status", function(done) {
            let executor = createExecutor();
            executor.setStatus(SQLStatus.Failed);

            executor.execute()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(SQLStatus.Failed);
                done();
            });
        });

        it("should execute", function(done) {
            let executor = createExecutor();
            let called = 0;

            executor._tempGraph.execute = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor._inspectSQLNodeAndAddToList = function() {
                called++;
                return PromiseHelper.resolve();
            };
            let oldRemove = DagTabManager.Instance.removeTabCache;
            let oldClean = DagViewManager.Instance.cleanupClosedTab;
            DagTabManager.Instance.removeTabCache = function() {
                called++;
            };
            DagViewManager.Instance.cleanupClosedTab = function() {
                called++;
            };

            executor.execute()
            .then(function() {
                expect(called).to.equal(5);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DagTabManager.Instance.removeTabCache = oldRemove;
                DagViewManager.Instance.cleanupClosedTab = oldClean;
            });
        });

        it("should reject execute", function(done) {
            let executor = createExecutor();
            let called = 0;

            executor._tempGraph.execute = function() {
                called++;
                return PromiseHelper.reject("test");
            };
            executor._inspectSQLNodeAndAddToList = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor._sqlTabCached = false;
            let oldAddSQL = DagTabManager.Instance.addTabCache;
            DagTabManager.Instance.addTabCache = function() {
                called++;
            };

            executor.execute()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.equal(4);
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                DagTabManager.Instance.addTabCache = oldAddSQL;            });
        });
    });

    describe("restoreDataflow test", function() {
        it("should restore with inspect sql node", function(done) {
            let executor = createExecutor();
            let called = 0;
            executor._configureSQLNode = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor._inspectSQLNodeAndAddToList = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor.restoreDataflow()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should restore with expand sql node", function(done) {
            let executor = createExecutor();
            let called = 0;
            executor._advancedDebug = true;
            executor._configureSQLNode = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor._expandSQLNodeAndAddToList = function() {
                called++;
                return PromiseHelper.resolve();
            };
            executor.restoreDataflow()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject error restore case", function(done) {
            let executor = createExecutor();
            let called = 0;
            executor._configureSQLNode = function() {
                called++;
                return PromiseHelper.reject("test");
            };
            executor.restoreDataflow()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.equal(1);
                expect(error).to.equal("test")
                done();
            });
        });
    });

    it("should inspect sql node", function(done) {
        let executor = createExecutor();
        let called = 0;
        let oldFunc = DagList.Instance.addDag;

        DagList.Instance.addDag = function() {
            called++;
        };

        executor._sqlNode.subGraph = new DagGraph();
        executor._tempTab.save = function() {
            called++;
            return PromiseHelper.resolve();
        };

        executor._inspectSQLNodeAndAddToList()
        .then(function() {
            expect(called).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            DagList.Instance.addDag = oldFunc;
        });
    });

    it("should not expand if no sub graph", function(done) {
        let executor = createExecutor();
        let called = 0;
        let oldFunc = DagList.Instance.addDag;

        DagList.Instance.addDag = function() {
            called++;
        };

        executor._sqlNode.subGraph = null;
        executor._tempTab.save = function() {
            called++;
            return PromiseHelper.resolve();
        };

        executor._inspectSQLNodeAndAddToList()
        .then(function() {
            expect(called).to.equal(0);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            DagList.Instance.addDag = oldFunc;
        });
    });

    it("should expand sql node", function(done) {
        let executor = createExecutor();
        let called = 0;
        let oldExpand = DagViewManager.Instance.expandSQLNodeInTab;
        let oldAutoAlign = DagViewManager.Instance.autoAlign;
        let oldAddDag = DagList.Instance.addDag;

        DagViewManager.Instance.expandSQLNodeInTab = function() {
            called++;
            return PromiseHelper.resolve();
        };

        DagViewManager.Instance.autoAlign = function() {
            called++;
        };
        DagList.Instance.addDag = function() {
            called++;
        };

        executor._sqlNode.subGraph = new DagGraph();
        executor._tempTab.save = function() {
            called++;
            return PromiseHelper.resolve();
        };

        executor._expandSQLNodeAndAddToList()
        .then(function() {
            expect(called).to.equal(4);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            DagViewManager.Instance.expandSQLNodeInTab = oldExpand;
            DagViewManager.Instance.autoAlign = oldAutoAlign;
            DagList.Instance.addDag = oldAddDag;
        });
    });

    it("should not expand if no subgraph", function(done) {
        let executor = createExecutor();
        let called = 0;
        let oldExpand = DagViewManager.Instance.expandSQLNodeInTab;
        let oldAutoAlign = DagViewManager.Instance.autoAlign;
        let oldAddDag = DagList.Instance.addDag;

        DagViewManager.Instance.expandSQLNodeInTab = function() {
            called++;
            return PromiseHelper.resolve();
        };

        DagViewManager.Instance.autoAlign = function() {
            called++;
        };
        DagList.Instance.addDag = function() {
            called++;
        };

        executor._sqlNode.subGraph = null;
        executor._tempTab.save = function() {
            called++;
            return PromiseHelper.resolve();
        };

        executor._expandSQLNodeAndAddToList()
        .then(function() {
            expect(called).to.equal(0);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            DagViewManager.Instance.expandSQLNodeInTab = oldExpand;
            DagViewManager.Instance.autoAlign = oldAutoAlign;
            DagList.Instance.addDag = oldAddDag;
        });
    });

    after(function() {
        SQLHistorySpace.Instance.update = oldUpdateHistory;
    });
});