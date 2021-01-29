describe("Dag Agg Manager Test", () => {
    var oldXcalarGetConstants;
    var oldDeleteTable;
    var oldXcalarKeyPut;
    var oldXcalarKeyLookup;
    var oldGetTabID;

    before(function() {
        oldXcalarKeyLookup = XcalarKeyLookup;
        oldXcalarKeyPut = XcalarKeyPut;
        oldXcalarGetConstants = XcalarGetConstants;
        oldDeleteTable = DagNodeAggregate.deleteAgg;
        oldGetTabID = DagTabManager.Instance.getTabById;
        XcalarKeyLookup = function() {
            return PromiseHelper.resolve("");
        };
        XcalarKeyPut = function(key) {
            return PromiseHelper.resolve();
        };
        XcalarGetConstants = function(str) {
            return PromiseHelper.resolve([]);
        };
        DagNodeAggregate.deleteAgg = function(aggs) {
            return PromiseHelper.resolve();
        };
        DagTabManager.Instance.getTabById = function(id) {
            return new DagTab();
        };
        DagAggManager.Instance.setup();
    });


    it ("Should get and add an aggregate correctly", () => {
        expect(DagAggManager.Instance.getAgg("test-agg_agg1")).to.be.undefined;
        let aggInfo = {
            value: 4,
            dagName: "test-agg_agg1",
            aggName: "agg1",
            tableId: "tableId",
            backColName: "test-agg_agg1",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("test-agg_agg1", aggInfo);
        expect(DagAggManager.Instance.getAgg("test-agg_agg1")).to.deep.equal(aggInfo);
    });

    it ("Should replace an old agg correctly", () => {
        let aggInfo = {
            value: 4,
            dagName: "test-agg_agg1",
            aggName: "agg1",
            tableId: "tableId",
            backColName: "test-agg_agg1",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("test-agg_agg1", aggInfo);
        expect(DagAggManager.Instance.getAgg("test-agg_agg1")).to.deep.equal(aggInfo);
        aggInfo.value = 5;
        DagAggManager.Instance.addAgg("test-agg_agg1", aggInfo);
        expect(DagAggManager.Instance.getAgg("test-agg_agg1")).to.deep.equal(aggInfo);
    })

    it ("Should bulk add aggregates correctly", () => {
        expect(DagAggManager.Instance.getAgg("test-agg_agg2")).to.be.undefined;
        expect(DagAggManager.Instance.getAgg("test-agg_agg3")).to.be.undefined;
        let aggInfos = [{
            value: 4,
            dagName: "test-agg_agg2",
            aggName: "test-agg_agg2",
            tableId: "tableId",
            backColName: "test-agg_agg2",
            op: 5,
            node: "node1",
            graph: "test"
        },
        {
            value: 4,
            dagName: "test-agg_agg3",
            aggName: "test-agg_agg3",
            tableId: "tableId",
            backColName: "test-agg_agg3",
            op: 5,
            node: "node1",
            graph: "test"
        }];
        DagAggManager.Instance.bulkAdd(aggInfos);
        expect(DagAggManager.Instance.getAgg("test-agg_agg2")).to.deep.equal(aggInfos[0]);
        expect(DagAggManager.Instance.getAgg("test-agg_agg3")).to.deep.equal(aggInfos[1]);
    });

    it ("Should get the aggmap correctly", () => {
        let aggInfo = {
            value: 4,
            dagName: "test-agg_agg5",
            aggName: "agg5",
            tableId: "tableId",
            backColName: "test-agg_agg5",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("test-agg_agg5", aggInfo);
        let map = DagAggManager.Instance.getAggMap();
        expect(map["test-agg_agg5"]).to.deep.equal(aggInfo);
    });

    it ("Should check if an aggregate exists correctly", () => {
        expect(DagAggManager.Instance.hasAggregate("test-agg_agg6")).to.be.false;
        let aggInfo = {
            value: 4,
            dagName: "test-agg_agg6",
            aggName: "agg6",
            tableId: "tableId",
            backColName: "test-agg_agg6",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("test-agg_agg6", aggInfo);
        expect(DagAggManager.Instance.hasAggregate("test-agg_agg6")).to.be.true;
    });

    // XXX TODO To be moved to the aggservice test, when it is made
    /*describe("Find Aggregate Sources tests", () => {
        it ("Should not find a source for a non existing aggregate", () => {
            expect(DagAggManager.Instance.findAggSource("nonexistagg")).to.be.null;
        });

        it ("Should throw an error if the aggregate doesnt have a node", () => {
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: null,
                graph: ""
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);
            try {
                DagAggManager.Instance.findAggSource("test-agg_source");
            } catch(e) {
                console.log(e);
                expect(e).to.be.an.instanceof(Error);
            }
        });

        it ("Should throw an error if the aggregate doesnt have a tab", () => {
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: "5",
                graph: null
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);
            try {
                DagAggManager.Instance.findAggSource("test-agg_source");
            } catch(e) {
                expect(e).to.be.an.instanceof(Error);
            }
        });

        it ("Should throw an error if the aggregate's tab doesn't exist", () => {
            DagTabManager.Instance.getTabById = function(id) {
                return null;
            };
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: "5",
                graph: "6"
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);
            try {
                DagAggManager.Instance.findAggSource("test-agg_source");
            } catch(e) {
                expect(e).to.be.an.instanceof(Error);            }
        });

        it ("Should throw an error if the aggregate's graph doesn't exist", () => {
            let tab = new DagTab({name: "name"});
            DagTabManager.Instance.getTabById = function(id) {
                return tab;
            };
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: "5",
                graph: "6"
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);

            try {
                DagAggManager.Instance.findAggSource("test-agg_source");
            } catch(e) {
                expect(e).to.be.an.instanceof(Error);
            }
        });

        it ("Should throw an error if the aggregate's node doesn't exist in the graph", () => {
            let tab = new DagTab({name: "name"});
            let graph = new DagGraph();
            tab.setGraph(graph);
            DagTabManager.Instance.getTabById = function(id) {
                return tab;
            };
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: "5",
                graph: "6"
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);

            try {
                DagAggManager.Instance.findAggSource("test-agg_source");
            } catch(e) {
                expect(e).to.be.an.instanceof(Error);
            }
        });

        it ("Should return a valid node on success", () => {
            let tab = new DagTab({name: "name"});
            let graph = new DagGraph();
            let node = new DagNodeAggregate({});
            graph.addNode(node);
            tab.setGraph(graph);
            DagTabManager.Instance.getTabById = function(id) {
                return tab;
            };
            let aggInfo = {
                value: 4,
                dagName: "test-agg_source",
                aggName: "source",
                tableId: "",
                backColName: "test-agg_source",
                op: 5,
                node: node.getId(),
                graph: "6"
            }
            DagAggManager.Instance.addAgg("test-agg_source", aggInfo);

            expect(DagAggManager.Instance.findAggSource("test-agg_source").getId()).to.equal(node.getId());

        });
    });*/

    describe("Removing Aggregate Tests", () => {

        it ("Should remove a list of aggregates through removeAgg", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: 4,
                dagName: "remove-agg_agg1",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg1",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg1", aggInfo);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg1")).to.be.true;
            let aggInfo2 = {
                value: 4,
                dagName: "remove-agg_agg2",
                aggName: "agg2",
                tableId: "tableId",
                backColName: "remove-agg_agg2",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg2", aggInfo2);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg2")).to.be.true;
            DagAggManager.Instance.removeAgg(["remove-agg_agg1","remove-agg_agg2"]);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg1")).to.be.false;
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg2")).to.be.false;
            expect(calledDelete).to.be.true;
        });

        it ("Should forcibly remove an aggregate without a value through removeAgg", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: null,
                dagName: "remove-agg_agg3",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg3",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg3", aggInfo);
            DagAggManager.Instance.removeAgg(["remove-agg_agg3"], true);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg3")).to.be.false;
            expect(calledDelete).to.be.true;
        });

        it ("Should not delete an aggregate without a value without force", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: null,
                dagName: "remove-agg_agg4",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg4",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg4", aggInfo);
            DagAggManager.Instance.removeAgg(["remove-agg_agg4"], false);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg4")).to.be.false;
            expect(calledDelete).to.be.false;
        });

        it ("Should remove aggregates/values through removeValue", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: 5,
                dagName: "remove-agg_agg5",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg5",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg5", aggInfo);
            DagAggManager.Instance.removeValue(["remove-agg_agg5"]);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg5")).to.be.true;
            expect(DagAggManager.Instance.getAgg("remove-agg_agg5").value).to.be.null;
            expect(calledDelete).to.be.true;
        });

        it ("Should not do anything when removing a value for a null value aggregate", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: null,
                dagName: "remove-agg_agg6",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg6",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg6", aggInfo);
            DagAggManager.Instance.removeValue(["remove-agg_agg6"]);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg6")).to.be.true;
            expect(DagAggManager.Instance.getAgg("remove-agg_agg6").value).to.be.null;
            expect(calledDelete).to.be.false;
        });

        it ("Should delete when removing a value for a null value aggregate with force", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length != 0) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: null,
                dagName: "remove-agg_agg7",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg7",
                op: 5,
                node: "node1",
                graph: "test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg7", aggInfo);
            DagAggManager.Instance.removeValue(["remove-agg_agg7"], true);
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg7")).to.be.true;
            expect(DagAggManager.Instance.getAgg("remove-agg_agg7").value).to.be.null;
            expect(calledDelete).to.be.true;
        });

        it ("Should remove aggregates when a graph is deleted correctly", () => {
            var calledDelete = false;
            DagNodeAggregate.deleteAgg = function(aggs) {
                if (aggs.length == 2) {
                    calledDelete = true;
                }
                return PromiseHelper.resolve();
            };
            let aggInfo = {
                value: 5,
                dagName: "remove-agg_agg8",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg8",
                op: 5,
                node: "node1",
                graph: "remove-graph-test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg8", aggInfo);
            let aggInfo2 = {
                value: 5,
                dagName: "remove-agg_agg9",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "remove-agg_agg9",
                op: 5,
                node: "node1",
                graph: "remove-graph-test"
            }
            DagAggManager.Instance.addAgg("remove-agg_agg9", aggInfo2);
            let aggInfo3 = {
                value: 5,
                dagName: "ignore-agg_agg10",
                aggName: "agg1",
                tableId: "tableId",
                backColName: "ignore-agg_agg10",
                op: 5,
                node: "node1",
                graph: "ignore"
            }
            DagAggManager.Instance.addAgg("ignore-agg_agg10", aggInfo3);
            DagAggManager.Instance.graphRemoval("remove-graph-test");
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg8")).to.be.false;
            expect(DagAggManager.Instance.hasAggregate("remove-agg_agg9")).to.be.false;
            expect(DagAggManager.Instance.hasAggregate("ignore-agg_agg10")).to.be.true;
            expect(calledDelete).to.be.true;
        });
    });

    it ("Should remove nodes correctly", () => {
        let aggInfo = {
            value: null,
            dagName: "node-agg_agg1",
            aggName: "agg1",
            tableId: "tableId",
            backColName: "node-agg_agg1",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("node-agg_agg1", aggInfo);
        let aggInfo2 = {
            value: 5,
            dagName: "node-agg_agg2",
            aggName: "agg1",
            tableId: "tableId",
            backColName: "node-agg_agg2",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("node-agg_agg2", aggInfo2);
        DagAggManager.Instance.bulkNodeRemoval(["node-agg_agg1", "node-agg_agg2"]);
        expect(DagAggManager.Instance.hasAggregate("node-agg_agg1")).to.be.false;
        expect(DagAggManager.Instance.hasAggregate("node-agg_agg2")).to.be.true;
        expect(DagAggManager.Instance.getAgg("node-agg_agg2").node).to.equal("");
    });

    it ("Should update nodes correctly", () => {
        let aggInfo = {
            value: null,
            dagName: "node-agg_agg3",
            aggName: "agg1",
            tableId: "tableId",
            backColName: "node-agg_agg3",
            op: 5,
            node: "node1",
            graph: "test"
        }
        DagAggManager.Instance.addAgg("node-agg_agg3", aggInfo);
        let nodemap = new Map();
        nodemap.set("node-agg_agg3", "node2");
        DagAggManager.Instance.updateNodeIds(nodemap);
        expect(DagAggManager.Instance.getAgg("node-agg_agg3").node).to.equal("node2");
    });



    after(() => {
        XcalarGetConstants = oldXcalarGetConstants;
        DagNodeAggregate.deleteAgg = oldDeleteTable;
        XcalarKeyPut = oldXcalarKeyPut;
        XcalarKeyLookup = oldXcalarKeyLookup;
        DagTabManager.Instance.getTabById = oldGetTabID;
    });
});