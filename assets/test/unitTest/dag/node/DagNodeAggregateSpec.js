describe("Aggregate Dag Node Test", () => {
    let node;
    let oldAggManagerAdd;
    let oldAggManagerHas;
    let oldAggManagerRemove;
    let oldAggManagerGet;

    before(() => {
        console.log("Aggregate Dag Node Test");
        node = new DagNodeAggregate({});
        oldAggManagerAdd = DagAggManager.Instance.addAgg;
        oldAggManagerHas = DagAggManager.Instance.hasAggregate;
        oldAggManagerRemove = DagAggManager.Instance.removeAgg;
        oldAggManagerGet = DagAggManager.Instance.getAgg;
        DagAggManager.Instance.addAgg = function (name, info) {
            return PromiseHelper.resolve();
        }
        DagAggManager.Instance.hasAggregate = function (name) {
            return false;
        }
        DagAggManager.Instance.removeAgg = function (name, force) {
            return PromiseHelper.resolve();
        }

        DagAggManager.Instance.getAgg = function(id, name) {
            return {};
        }
    });

    it("should be an aggregate node", () => {
        expect(node.getType()).to.equal(DagNodeType.Aggregate);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            evalString: "",
            dest: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            evalString: "count(column)",
            dest: "constantName"
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("Should be able to get and set aggVal", () => {
        expect(node.getAggVal()).to.equal(null);
        node.setAggVal(5);
        expect(node.getAggVal()).to.equal(5);
        node.setAggVal("cat");
        expect(node.getAggVal()).to.equal("cat");
    });

    it("Should be able to get backName", () => {
        const testParam = {
            evalString: "count(column)",
            dest: "constantName"
        };
        node.setParam(testParam);
        const name = node.getAggName();
        expect(name).to.equal(testParam.dest);
    });

    it("Should be able to accept a column remapping", () => {
        const testParam = {
            evalString: "count(column1)",
            dest: "constantName"
        };
        node.setParam(testParam);

        node.applyColumnMapping({columns: {
            "column1": "renamedCol"
        }});

        param = node.getParam();
        expect(param.evalString).to.equal("count(renamedCol)")
    });

    describe("DagAggManager Specific Tests", () => {
        describe("Should Not Add Aggregates under specific circumstances", () => {
            it("Should not add an aggregate if the graph is null", () => {
                let addAggCalled = false;
                const nodeInfo = {
                    input: {
                        evalString: "count(column)",
                        dest: "constantName"
                    }
                }
                DagAggManager.Instance.addAgg = (name, info) => {
                    addAggCalled = true;
                    return PromiseHelper.resolve();
                }

                let testNode = new DagNodeAggregate(nodeInfo);

                UnitTest.testFinish(function(){
                    return addAggCalled === false;
                });
            });

            it("Should not add an aggregate if the aggregate is a sql agg", () => {
                let addAggCalled = false;
                const graph = new DagGraph();
                graph.setTabId("213.sql");
                const nodeInfo = {
                    input: {
                        evalString: "count(column)",
                        dest: "constantName"
                    },
                    graph: graph
                }
                DagAggManager.Instance.addAgg = (name, info) => {
                    addAggCalled = true;
                    return PromiseHelper.resolve();
                }

                new DagNodeAggregate(nodeInfo);

                UnitTest.testFinish(function(){
                    return addAggCalled === false;
                });
            });
        });

        it("Should add an aggregate elsewise", () => {
            let addAggCalled = false;
            const graph = new DagGraph();
            graph.setTabId("213");
            const nodeInfo = {
                input: {
                    evalString: "count(column)",
                    dest: "constantName"
                },
                graph: graph
            }
            DagAggManager.Instance.addAgg = (name, info) => {
                addAggCalled = true;
                return PromiseHelper.resolve();
            }

            new DagNodeAggregate(nodeInfo);

            UnitTest.testFinish(function(){
                return addAggCalled === true;
            });
        });

        it("should delete an aggregate if setting a new aggregate when it previously set one", () => {
            let addAggCalled = false;
            let removeAggCalled = false;
            const testParam = {
                evalString: "count(column)",
                dest: "constantName"
            };
            DagAggManager.Instance.addAgg = (name, info) => {
                addAggCalled = true;
                return PromiseHelper.resolve();
            }
            DagAggManager.Instance.removeAgg = function (name, force) {
                removeAggCalled = true;
                return PromiseHelper.resolve();
            }
            DagAggManager.Instance.hasAggregate = function (name) {
                return true;
            }
            DagAggManager.Instance.getAgg = function(id, name) {
                return {
                    value: 5,
                    dagName: "oldName"
                };
            }

            let newNode = new DagNodeAggregate({});

            newNode.setParam(testParam)

            UnitTest.testFinish(function(){
                return (addAggCalled === true && removeAggCalled === true);
            });
        });

        it("Should have the correct backname when under certain creation circumstances", () => {
            const nodeInfo = {
                input: {
                    evalString: "count(column)",
                    dest: "constantNameBack"
                }
            }

            let testNode = new DagNodeAggregate(nodeInfo);
            expect(testNode.getAggName()).to.equal("constantNameBack");
        });
    })

    after(() => {
        DagAggManager.Instance.addAgg = oldAggManagerAdd;
        DagAggManager.Instance.hasAggregate = oldAggManagerHas;
        DagAggManager.Instance.removeAgg= oldAggManagerRemove;
        DagAggManager.Instance.getAgg = oldAggManagerGet;
    });

});