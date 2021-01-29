describe("Dag Graph Test", () => {
    it("should deserialize a graph correctly", () => {
        const graph = new DagGraph();
        const n1 = DagNodeFactory.create({type: DagNodeType.Join});
        const n2 = DagNodeFactory.create({type: DagNodeType.Join});
        graph.addNode(n1);
        graph.addNode(n2);
        graph.connect(n1.getId(),n2.getId());
        // Note: Relies on fake graph used by construct().
        const serializableGraph = graph.getSerializableObj();
        var desGraph = new DagGraph();
        desGraph.create(serializableGraph)
        expect(desGraph.hasNode(n1.getId())).to.be.true;
        expect(desGraph.hasNode(n2.getId())).to.be.true;
        const possibleN2 = desGraph.getNode(n2.getId());
        const parents = possibleN2.getParents();
        expect(parents).to.not.equal(undefined);
        expect(parents.length).to.equal(1);
        const parent = parents[0];
        expect(parent.getId()).to.equal(n1.getId());
    });

     // XXX fix test once reset works
    it.skip("should reest node", () => {
        const graph = new DagGraph();
        const n1 = DagNodeFactory.create({
            type: DagNodeType.Join,
            state: DagNodeState.Complete
        });
        const n2 = DagNodeFactory.create({
            type: DagNodeType.Join,
            state: DagNodeState.Complete
        });
        graph.addNode(n1);
        graph.addNode(n2);
        graph.connect(n1.getId(),n2.getId());

        graph.reset([n2.getId()]);
        expect(n1.getState()).to.equal(DagNodeState.Complete);
        expect(n2.getState()).to.equal(DagNodeState.Error);
    });

     // XXX fix test once reset works
    it.skip("should reest all node", () => {
        const graph = new DagGraph();
        const n1 = DagNodeFactory.create({
            type: DagNodeType.Join,
            state: DagNodeState.Complete
        });
        const n2 = DagNodeFactory.create({
            type: DagNodeType.Join,
            state: DagNodeState.Complete
        });
        graph.addNode(n1);
        graph.addNode(n2);

        graph.reset();
        expect(n1.getState()).to.equal(DagNodeState.Error);
        expect(n2.getState()).to.equal(DagNodeState.Error);
    });

    it("resolveNodeConflict should work", function() {
        let graph = new DagGraph();
        let node1 = DagNodeFactory.create({
            type: DagNodeType.DFOut
        });
        node1.setParam({name: "a"});
        graph.addNode(node1);

        let node2 = DagNodeFactory.create({
            type: DagNodeType.DFOut
        });
        let node3 = DagNodeFactory.create({
            type: DagNodeType.DFOut
        });
        node2.setParam({name: "a"});
        node3.setParam({name: "b"});

        let res = graph.resolveNodeConflict([node2, node3]);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(node2);
        expect(node2.getParam().name).to.equal("a_1");
    });

    it("resolveAggConflict should work", function() {
        let graph = new DagGraph();
        let oldGetAgg = graph.getRuntime().getDagAggService().getAgg;
        let oldHasAgg = graph.getRuntime().getDagAggService().hasAggregate;

        // Assume "constantName" already exists
        

        graph.getRuntime().getDagAggService().hasAggregate = function(myAggName) {
            return (myAggName == "constantName");
        }

        let node2 = DagNodeFactory.create({
            type: DagNodeType.Aggregate
        });
        let node3 = DagNodeFactory.create({
            type: DagNodeType.Aggregate
        });
        graph.getRuntime().getDagAggService().getAgg = function(myAggName) {
            return {
                node: node3.getId()
            };
        }
        node2.setParam({evalString: "count(column)",
            dest: "constantName"});
        node3.setParam({evalString: "count(column)",
            dest: "constantName2"});

        let res = graph.resolveAggConflict([node2, node3]);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(node2);
        expect(node2.getParam().dest).to.equal("constantName_1");
        graph.getRuntime().getDagAggService().hasAggregate = oldHasAgg;
        graph.getRuntime().getDagAggService().getAgg = oldGetAgg;
    });

    describe ("getSortedNodes Test", () => {
        var graph;
        var n1, n2, n3, n4, n5, n6, n7;

        before (function() {
            graph = new DagGraph();
            n1 = DagNodeFactory.create({type: DagNodeType.Dataset});
            n2 = DagNodeFactory.create({type: DagNodeType.Map});
            n3 = DagNodeFactory.create({type: DagNodeType.Filter});
            n4 = DagNodeFactory.create({type: DagNodeType.Export});
            n5 = DagNodeFactory.create({type: DagNodeType.Join});
            graph.addNode(n1);
            graph.addNode(n2);
            graph.addNode(n3);
            graph.addNode(n4);
            graph.addNode(n5);
            graph.connect(n1.getId(),n2.getId());
            graph.connect(n1.getId(),n3.getId());
            graph.connect(n3.getId(),n5.getId());
            graph.connect(n2.getId(),n5.getId(),1);
            graph.connect(n5.getId(),n4.getId());
            
        });

        it("should order standard nodes in an acceptable way", () => {
            var nodes = graph.getSortedNodes();
            expect(nodes[0].getId()).to.equal(n1.getId());
            expect(nodes[3].getId()).to.equal(n5.getId());
            expect(nodes[4].getId()).to.equal(n4.getId());
        });


        it("should order aggregate nodes in an acceptable way if the graph doesnt make the agg", () => {
            n3.setAggregates(["^nonExistAgg"]);
            var nodes = graph.getSortedNodes();
            expect(nodes[0].getId()).to.equal(n1.getId());
            expect(nodes[3].getId()).to.equal(n5.getId());
            expect(nodes[4].getId()).to.equal(n4.getId());
        });

        it("should order aggregate nodes to run before nodes that use those aggregates", () => {
            n6 = DagNodeFactory.create({type: DagNodeType.Aggregate});
            n6.setParam({
                evalString: "",
                dest: "^testAgg"
            });
            graph.addNode(n6);
            graph.connect(n2.getId(),n6.getId());
            n3.setAggregates(["^testAgg"]);
            var nodes = graph.getSortedNodes();
            expect(nodes[0].getId()).to.equal(n1.getId());
            expect(nodes[1].getId()).to.equal(n2.getId());
            expect(nodes[2].getId()).to.equal(n3.getId());
            expect(nodes[3].getId()).to.equal(n6.getId());
            expect(nodes[4].getId()).to.equal(n5.getId());
            expect(nodes[5].getId()).to.equal(n4.getId());
        });

        it("should order linkin nodes in an acceptable way if the graph doesnt make the linkout", () => {
            n7 = DagNodeFactory.create({type: DagNodeType.DFIn});
            n7.setParam({
                dataflowId: "",
                linkOutName: "nonExistOut",
                schema: []
            });
            n7.getLinkedNodeAndGraph = function() {
                return {
                    graph: graph,
                    node: DagNodeFactory.create({type: DagNodeType.DFOut})
                }
            }
            graph.addNode(n7);
            graph.disconnect(n1.getId(),n3.getId());
            graph.connect(n7.getId(),n3.getId());
            var nodes = graph.getSortedNodes();
            expect(nodes[0].getId()).to.equal(n1.getId());
            expect(nodes[1].getId()).to.equal(n7.getId());
            expect(nodes[2].getId()).to.equal(n2.getId());
            expect(nodes[3].getId()).to.equal(n3.getId());
            expect(nodes[4].getId()).to.equal(n6.getId());
            expect(nodes[5].getId()).to.equal(n5.getId());
            expect(nodes[6].getId()).to.equal(n4.getId());
        });

        it("should order linkout nodes to run before linkin nodes that use that out", () => {
            n8 = DagNodeFactory.create({type: DagNodeType.DFOut});
            n8.setParam({
                name: "testDFOut",
                linkAfterExecution: false,
                columns: []
            });
            graph.addNode(n8);
            graph.connect(n2.getId(),n8.getId());
            n7.setParam({
                dataflowId: "",
                linkOutName: "testDFOut",
                schema: []
            });
            n7.getLinkedNodeAndGraph = function() {
                return {
                    graph: graph,
                    node: n8
                }
            }
            var nodes = graph.getSortedNodes();
            // Anything before the filter that uses the aggregate is a grab bag
            expect(nodes[5].getId()).to.equal(n3.getId());
            expect(nodes[6].getId()).to.equal(n5.getId());
            expect(nodes[7].getId()).to.equal(n4.getId());
            // But we still check to see if linkout goes before linkin
            var outIndex = nodes.findIndex((node) => {
                return (node.getId() == n8.getId());
            });
            var inIndex = nodes.findIndex((node) => {
                return (node.getId() == n7.getId());
            });
            expect(outIndex < inIndex).to.be.true;
        });

        it ('should fail if circular loop exists due to linkout', () => {
            var n9 = DagNodeFactory.create({type: DagNodeType.DFOut});
            n9.setParam({
                name: "testDFOutFail",
                linkAfterExecution: false,
                columns: []
            });
            graph.addNode(n9);
            graph.connect(n3.getId(),n9.getId());
            n7.setParam({
                dataflowId: "",
                linkOutName: "testDFOutFail",
                schema: []
            });
            n7.getLinkedNodeAndGraph = function() {
                return {
                    graph: graph,
                    node: n9
                }
            }
            try {
                graph.getSortedNodes();
            } catch (e) {
                expect(e.error).to.equal("Function input is dependent on function output made after it.");
                expect(e.node.getId()).to.equal(n7.getId());
            }
            n7.setParam({
                dataflowId: "",
                linkOutName: "testDFOut",
                schema: []
            });
            n7.getLinkedNodeAndGraph = function() {
                return {
                    graph: graph,
                    node: n8
                }
            }
        });

        it ('should fail if circular loop exists due to aggregate', () => {
            n10 = DagNodeFactory.create({type: DagNodeType.Aggregate});
            n10.setParam({
                evalString: "",
                dest: "^testAggFail"
            });
            graph.addNode(n10);
            graph.connect(n3.getId(),n10.getId());
            n3.setAggregates(["^testAggFail"]);
            try {
                graph.getSortedNodes();
            } catch (e) {
                expect(e.error).to.equal("Map/Filter node is dependent on aggregate made after it.");
                expect(e.node.getId()).to.equal(n3.getId());
            }
            n3.setAggregates(["^testAgg"]);
        });

    });

    it ("DagGraph.getFuncInNodesFromDestNodes should work", function() {
        const funcInNode = new DagNodeDFIn({});
        const filterNode = new DagNodeFilter({});
        filterNode.connectToParent(funcInNode);
        let oldFunc = funcInNode.hasResult;
        // case 1, stopAtExistingResult when input node have no result
        funcInNode.hasResult = () => false;
        let res = DagGraph.getFuncInNodesFromDestNodes([filterNode], true);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(funcInNode);
        // case 2
        funcInNode.hasResult = () => true;
        res = DagGraph.getFuncInNodesFromDestNodes([filterNode], true);
        expect(res.length).to.equal(0);
        // case 3
        res = DagGraph.getFuncInNodesFromDestNodes([filterNode], false);
        expect(res.length).to.equal(1);

        funcInNode.hasResult = oldFunc;
    });
});