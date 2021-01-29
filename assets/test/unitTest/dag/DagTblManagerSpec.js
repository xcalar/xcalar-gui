describe("DagTblManager Test", function() {
    var tableManager;
    var oldDeleteTable;
    var oldXcalarKeyPut;
    var oldGetTables;
    var oldXcalarKeyLookup;
    var oldTransaction;



    before (function() {
        oldXcalarKeyLookup = XcalarKeyLookup;
        oldXcalarKeyPut = XcalarKeyPut;
        oldGetTables = XcalarGetTables;
        oldDeleteTable = XIApi.deleteTables;
        oldTransaction = Transaction;

        Transaction = {
            "start": () => {},
            "done": () => {},
            "fail": () => {}
        };
        XcalarKeyLookup = function() {
            return PromiseHelper.resolve("");
        };
        XcalarKeyPut = function(key) {
            return PromiseHelper.resolve();
        };
        XcalarGetTables = function(regex) {
            return PromiseHelper.resolve({numNodes: 0, nodeInfo: []});
        }

        XIApi.deleteTables = function(tx, query, time) {
            return PromiseHelper.resolve();
        }

        tableManager = DagTblManager.Instance;
        tableManager.setup();
        // It will only sleep when we tell it to.
        tableManager.disableTimer();
        tableManager.setClockTimeout(10000);
    });

    it("Should add a new table, and should tell is if its in the cashe.", function () {
        expect(tableManager.hasTable("test1")).to.be.false;
        tableManager.addTable("test1");
        expect(tableManager.hasTable("test1")).to.be.true;
    });

    it("Should reset a table's clock count.", function () {
        tableManager.addTable("test2");
        tableManager.resetTable("test2");
        expect(tableManager.cache["test2"].markedForReset).to.be.true;
    });

    it("Should set a table's delete flag.", function () {
        tableManager.addTable("test3");
        tableManager.deleteTable("test3", false);
        expect(tableManager.cache["test3"].markedForDelete).to.be.true;
    });

    it("Should be able to unlock and lock a table.", function () {
        let cachePin = XcalarPinTable;
        let called = false;
        XcalarPinTable = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        let cacheUnpin = XcalarUnpinTable;
        let called2 = false;
        XcalarUnpinTable = () => {
            called2 = true;
            return PromiseHelper.resolve();
        }

        tableManager.addTable("test4");
        expect(tableManager.cache["test4"].locked).to.be.false;
        tableManager.pinTable("test4");
        expect(tableManager.cache["test4"].locked).to.be.true;
        expect(called).to.be.true;
        tableManager.unpinTable("test4");
        expect(tableManager.cache["test4"].locked).to.be.false;
        expect(called2).to.be.true;

        XcalarPinTable = cachePin;
        XcalarUnpinTable = cacheUnpin;
    });

    it("Should tell us if a table has a lock.", function () {
        let cachePin = XcalarPinTable;
        XcalarPinTable = () => {
            return PromiseHelper.resolve();
        };

        tableManager.addTable("test5");
        expect(tableManager.isPinned("test5")).to.be.false;
        tableManager.pinTable("test5");
        expect(tableManager.isPinned("test5")).to.be.true;
        XcalarPinTable = cachePin;
    });


    it("Should not set a locked tables delete flag.", function () {
        let cachePin = XcalarPinTable;
        XcalarPinTable = () => {
            return PromiseHelper.resolve();
        }

        tableManager.addTable("test6");
        tableManager.pinTable("test6");
        tableManager.deleteTable("test6", false);
        expect(tableManager.cache["test6"].markedForDelete).to.be.false;
        XcalarPinTable = cachePin;
    });


    it("Should be able to force delete a locked table.", function () {
        let cachePin = XcalarPinTable;
        XcalarPinTable = () => {
            return PromiseHelper.resolve();
        };
        tableManager.addTable("test7");
        tableManager.pinTable("test7");
        tableManager.deleteTable("test7", true);
        expect(tableManager.cache["test7"].markedForDelete).to.be.true;
        XcalarPinTable = cachePin;
    });

    it("Should get a tables timestamp", function () {
        tableManager.addTable("test10");
        expect(tableManager.getTimeStamp("test10")).to.be.an('number');
    });


    it("Should empty the cache successfully", function (done) {
        let cachePin = XcalarPinTable;
        XcalarPinTable = () => {
            return PromiseHelper.resolve();
        };
        tableManager.addTable("testEmpty");
        tableManager.addTable("testEmpty2");
        tableManager.pinTable("testEmpty2");
        tableManager.emptyCache(true)
        .then(() => {
            expect(tableManager.hasTable("testEmpty")).to.be.false;
            expect(tableManager.hasTable("testEmpty2")).to.be.false;
            XcalarPinTable = cachePin;
            done();
        })
    });

    it("Should support force-resetting the flags", function () {
        let cachePin = XcalarPinTable;
        XcalarPinTable = () => {
            return PromiseHelper.resolve();
        };
        tableManager.addTable("test11");
        tableManager.pinTable("test11");
        expect(tableManager.isPinned("test11")).to.be.true;
        tableManager.forceReset(true);
        expect(tableManager.isPinned("test11")).to.be.false;
        XcalarPinTable = cachePin;
    });

    describe("sweep", function() {
        it("Should sync with the backend to add tables", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testAddedSweep"}]});
            }
            expect(tableManager.hasTable("testAddedSweep")).to.be.false;
            tableManager.sweep()
            .then(() => {
                expect(tableManager.hasTable("testAddedSweep")).to.be.true;
                done();
            });
        });

        it("Should sync with the backend to remove tables", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: []});
            }
            tableManager.addTable("testRemove");
            tableManager.sweep()
            .then(() => {
                expect(tableManager.hasTable("testRemove")).to.be.false;
                done();
            });
        });

        it("Should delete a table if the delete flag is set", function (done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepDel"}]});
            }
            tableManager.addTable("testSweepDel");
            tableManager.deleteTable("testSweepDel", true);
            tableManager.sweep()
            .then(() => {
                expect(tableManager.hasTable("testSweepDel")).to.be.false;
                done();
            });
        });

        it("Should increment a table's clock count", function (done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepInc"}]});
            }
            tableManager.addTable("testSweepInc");
            expect(tableManager.cache["testSweepInc"].clockCount).to.equal(0);
            tableManager.sweep()
            .then(() => {
                expect(tableManager.cache["testSweepInc"].clockCount).to.equal(1);
                done();
            });
        });

        it("Should delete a table if clocklimit is reached and it is not locked", function (done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepClock"}]});
            }
            tableManager.addTable("testSweepClock");
            expect(tableManager.hasTable("testSweepClock")).to.be.true;
            tableManager.setClockTimeout(1);
            tableManager.sweep()
            .then(() => {
                expect(tableManager.hasTable("testSweepClock")).to.be.false;
                tableManager.setClockTimeout(10000);
                done();
            });
        });

        it("Should not delete a table if clocklimit is reached and it is locked", function (done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepClock2"}]});
            }
            let cachePin = XcalarPinTable;
            XcalarPinTable = () => {
                return PromiseHelper.resolve();
            };
            tableManager.addTable("testSweepClock2");
            tableManager.pinTable("testSweepClock2");
            expect(tableManager.hasTable("testSweepClock2")).to.be.true;
            tableManager.setClockTimeout(1);
            tableManager.sweep()
            .then(() => {
                expect(tableManager.hasTable("testSweepClock2")).to.be.truee;
                tableManager.setClockTimeout(10000);
                XcalarPinTable = cachePin;
                done();
            });
        });

        it("Should reset clockCount if a table is marked for reset.", function (done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepCount"}]});
            }
            tableManager.addTable("testSweepCount");
            tableManager.sweep()
            .then(() => {
                tableManager.resetTable("testSweepCount")
                return tableManager.sweep();
            })
            .then(() => {
                expect(tableManager.cache["testSweepCount"].clockCount).to.equal(0);
                done();
            });
        });
    })



    it("Should support a force delete sweep", function (done) {
        XcalarGetTables = function(regex) {
            return PromiseHelper.resolve({numNodes: 1, nodeInfo: [{name: "testSweepDel2"}]});
        }
        tableManager.addTable("testSweepDel2");
        tableManager.deleteTable("testSweepDel2", true);
        tableManager.forceDeleteSweep()
        .then(() => {
            expect(tableManager.hasTable("testSweepDel2")).to.be.false;
            done();
        });
    });


    describe("emergencyClear", function() {
        var oldActiveDag;
        var oldResultID;

        before(function() {
            oldActiveDag = DagViewManager.Instance.getActiveDag;
            oldResultID = SQLResultSpace.Instance.getShownResultID;

            SQLResultSpace.Instance.getShownResultID = function() {
                return "table_DF2_test";
            }

            DagViewManager.Instance.getActiveDag = function() {
                return null;
            }
        });

        it("Should not be safe to delete the sql result table", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_test"}]});
            }

            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_test")).to.be.true;
                done();
            });
        });

        it("Should be safe to delete a table if no graph", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_nograph"}]});
            }
            tableManager.addTable("table_DF2_nograph");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_nograph")).to.be.false;
                done();
            });
        });

        it("Should be not safe to delete a locked table", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_lock",
                                            "pinned": true}]});
            }
            DagViewManager.Instance.getActiveDag = function() {
                return new DagGraph();
            }
            let cachePin = XcalarPinTable;
            XcalarPinTable = () => {
                return PromiseHelper.resolve();
            };
            tableManager.addTable("table_DF2_lock");
            tableManager.pinTable("table_DF2_lock");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_lock")).to.be.true;
                XcalarPinTable = cachePin;
                done();
            });
        });

        it("Should be safe to delete a marked for delete table", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_mark"}]});
            }
            DagViewManager.Instance.getActiveDag = function() {
                return new DagGraph();
            }
            tableManager.addTable("table_DF2_mark");
            tableManager.deleteTable("table_DF2_mark", true);
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_mark")).to.be.false;
                done();
            });
        });

        it("Should be safe to delete a table in another graph", function(done) {
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_graph_dag_wh.dsf#"}]});
            }
            DagViewManager.Instance.getActiveDag = function() {
                return new DagGraph();
            }
            tableManager.addTable("table_DF2_graph_dag_wh.dsf#");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_graph_dag_wh.dsf#")).to.be.false;
                done();
            });
        });

        it("Should be safe to delete a table without a dagnode", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_tab1_dag_wh.dsf#"}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable("table_DF2_tab1_dag_wh.dsf#");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_tab1_dag_wh.dsf#")).to.be.false;
                done();
            });
        });

        it("Should be not safe to delete a SQL table if in a sql node graph", function(done) {
            var graph = new DagGraph();
            graph.setTabId("dag_tab1");
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: "table_DF2_tab1_dag_tab1.sql#"}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable("table_DF2_tab1_dag_tab1.sql#");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable("table_DF2_tab1_dag_tab1.sql#")).to.be.false;
                done();
            });
        });

        it("Should determine safety based on running status", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var runNode = new DagNode({});
            var confNode = new DagNode({});
            runNode.beRunningState();
            graph.addNode(runNode);
            graph.addNode(confNode);
            var t1 = "table_DF2_tab1_" + runNode.getId() + "#";
            var t2 = "table_DF2_tab1_" + confNode.getId() + "#";;
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}, {name: t2}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable(t1);
            tableManager.addTable(t2);
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.true;
                expect(tableManager.hasTable(t2)).to.be.false;
                done();
            });
        });

        it("Should be safe to delete a table with no children", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            node.beCompleteState();
            graph.addNode(node);
            var t1 = "table_DF2_tab1_" + node.getId() + "#";
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable(t1);
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.false;
                done();
            });
        });

        it("Should not be safe to delete a table for a completed node with uncompleted children", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            var t1 = "table_DF2_tab1_" + node.getId() + "#";
            node.setTable(t1);
            var child = new DagNode({});
            node.beCompleteState();
            child.beRunningState();
            graph.addNode(node);
            graph.addNode(child);
            graph.connect(node.getId(), child.getId(), 0)
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable(t1);
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.true;
                done();
            });
        });

        it("Should be safe to delete a table for a completed node with a different table", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            var t1 = "table_DF2_tab1_" + node.getId() + "#";
            node.setTable("Different");
            var child = new DagNode({});
            node.beCompleteState();
            child.beRunningState();
            graph.addNode(node);
            graph.addNode(child);
            graph.connect(node.getId(), child.getId(), 0)
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}]});
            }
            tableManager.addTable(t1);
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.false;
                done();
            });
        });

        it("Should not be safe to delete an indextable for a completed node", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            var t1 = "table_DF2_tab1_" + node.getId() + "#.index";
            node.setTable("Different");
            var child = new DagNode({});
            node.beCompleteState();
            child.beRunningState();
            graph.addNode(node);
            graph.addNode(child);
            graph.connect(node.getId(), child.getId(), 0)
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}, {name: "Different"}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable(t1);
            tableManager.addTable("Different");
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.true;
                done();
            });
        });

        it("Should not be safe to delete a newer table", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            var t1 = "table_DF2_tab1_" + node.getId() + "#";
            node.setTable("Different");
            var child = new DagNode({});
            node.beCompleteState();
            child.beRunningState();
            graph.addNode(node);
            graph.addNode(child);
            graph.connect(node.getId(), child.getId(), 0)
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}, {name: "Different"}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable("Different");
            tableManager.addTable(t1);
            tableManager.emergencyClear()
            .then(() => {
                expect(tableManager.hasTable(t1)).to.be.true;
                done();
            });
        });

        it("Should be safe to delete a older table", function(done) {
            var graph = new DagGraph();
            graph.setTabId("tab1");
            var node = new DagNode({});
            var t1 = "table_DF2_tab1_" + node.getId() + "#";
            node.setTable("Different");
            var child = new DagNode({});
            node.beCompleteState();
            child.beRunningState();
            graph.addNode(node);
            graph.addNode(child);
            graph.connect(node.getId(), child.getId(), 0)
            XcalarGetTables = function(regex) {
                return PromiseHelper.resolve({numNodes: 0, nodeInfo: [{name: t1}, {name: "Different"}]});
            }
            DagViewManager.Instance.getActiveDag = (() => {
                return graph;
            });
            tableManager.addTable(t1);
            setTimeout(function() {
                tableManager.addTable("Different");
                tableManager.emergencyClear()
                .then(() => {
                    expect(tableManager.hasTable(t1)).to.be.false;
                    done();
                });
            }, 300)
        });

        after(function() {
            SQLResultSpace.Instance.getShownResultID = oldResultID;
            DagViewManager.Instance.getActiveDag = oldActiveDag;
        })
    });

    after(function(done) {
        XcalarKeyLookup = oldXcalarKeyLookup;
        XcalarKeyPut = oldXcalarKeyPut;
        XcalarGetTables = oldGetTables;
        XIApi.deleteTables = oldDeleteTable;
        Transaction = oldTransaction;
        done();
    });
});