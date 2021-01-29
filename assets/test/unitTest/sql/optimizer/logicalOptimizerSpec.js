describe("SQL Optimizer Test", () => {
    /* XXX need more test
    it("optimize should work", () => {});
    it("genOpGraph should work", () => {});
    it("insertOperators should work", () => {});
    */

    it("getCliFromOpGraph should work", () => {
        let root = {
            "name": "test1",
            "value": {
                "operation": "testop1",
                "args": {
                    a: "b"
                }
            },
            "children": [
                {
                    "name": "test2",
                    "value": {
                        value: "testInnerV"
                    },
                    "children": []
                }
            ],
            "toDrop": [
                "testDrop"
            ]
        };
        let cli = [];
        let visitedMap = {};
        LogicalOptimizer.getCliFromOpGraph(root, cli, true, visitedMap);
        expect(cli).to.deep.equal(['{"value":"testInnerV"}', '{"operation":"testop1","args":{"a":"b"}}', '{"operation":"XcalarApiDeleteObjects","args":{"namePattern":"testDrop","srcType":"Table","deleteCompletely":true}}']);
        expect(Object.keys(visitedMap).length).to.equal(2);
    });

    it("should reorder children", () => {
        let root = {
            name: "test1",
            sources: ["test3", "test2"],
            children: [
                {
                    name: "test2",
                    sources: [],
                    children: []
                },
                {
                    name: "test3",
                    sources: [],
                    children: []
                }
            ]
        };
        let nodes = [root];
        let nodeMap = {};
        LogicalOptimizer.reorderChildren(root, nodes, nodeMap);
        expect(root.children[0].name).to.equal("test3");
        expect(root.children[1].name).to.equal("test2");
        expect(Object.keys(nodeMap).length).to.equal(3);
    });

    it("addAggSource should work", () => {
        let oldParse = XDParser.XEvalParser.getAggNames;
        XDParser.XEvalParser.getAggNames = function(input) {
            return [input];
        }
        let node = {
            operation: "XcalarApiMap",
            args: {
                eval: [
                    {evalString: "test1"},
                    {evalString: "test2"}
                ]
            }
        };
        LogicalOptimizer.addAggSource(node);
        expect(node.args.aggSource.length).to.equal(2);
        expect(node.args.aggSource[0]).to.equal("test1");
        expect(node.args.aggSource[1]).to.equal("test2");
        XDParser.XEvalParser.getAggNames = oldParse;
    });

    it("should find aggregates", () => {
        let root = {
            value: {
                operation: "test",
                args: {
                    dest: "test1"
                }
            },
            children: [
                {
                    value: {
                        operation: "XcalarApiAggregate",
                        args: {
                            dest: "test2"
                        }
                    },
                    children: []
                }
            ]
        };
        let aggs = [];
        LogicalOptimizer.findAggs(aggs, root);
        expect(aggs.length).to.equal(1);
        expect(aggs[0]).to.equal("test2");
    });

    it("should find leaf nodes", () => {
        let root = {
            name: "test1",
            children: [
                {
                    name: "test2",
                    children: []
                },
                {
                    name: "test3",
                    children: []
                }
            ]
        };
        let visitedMap = {};
        let leafNodes = [];
        LogicalOptimizer.findLeafNodes(root, visitedMap, leafNodes);
        expect(Object.keys(visitedMap).length).to.equal(3);
        expect(visitedMap["test1"]).to.be.true;
        expect(visitedMap["test2"]).to.be.true;
        expect(visitedMap["test3"]).to.be.true;
        expect(leafNodes.length).to.equal(2);
        expect(leafNodes[0].name).to.equal("test2");
        expect(leafNodes[1].name).to.equal("test3");
    });
});