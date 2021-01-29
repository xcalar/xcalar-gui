describe('DagSubGraph Test', () => {
    describe('initFromJSON() should work', () => {
        it('Case: json with node info', () => {
            const expectedGraphInfo = createDefaultGraph().getGraphInfo();

            const testGraph = new DagSubGraph();
            const nodeIdMap = testGraph.initFromJSON(expectedGraphInfo);

            expect(testGraph.getGraphInfo()).to.deep.equal(expectedGraphInfo);
            expect(nodeIdMap.size).to.equal(0);
        });

        it('Case: json with copy info', () => {
            const expectedGraphInfo = createDefaultGraph().getGraphCopyInfo();

            const testGraph = new DagSubGraph();
            const nodeIdMap = testGraph.initFromJSON(expectedGraphInfo);
            for (const node of expectedGraphInfo.nodes) {
                node.id = nodeIdMap.get(node.nodeId);
                delete node.nodeId;
                for (let i = 0; i < node.parents.length; i ++) {
                    node.parents[i] = nodeIdMap.get(node.parents[i]);
                }
            }

            expect(testGraph.getGraphInfo()).to.deep.equal(expectedGraphInfo);
            expect(nodeIdMap.size).to.equal(expectedGraphInfo.nodes.length);
        });
    });

    describe('getGraphCopyInfo/getGraphInfo() should work', () => {
        it('Case: regular info', () => {
            const graph = createDefaultGraph();
            const expectedDimension = { width: 100, height: 100 };
            const expectedOperationTime = 100;
            const expectedCopyInfos = [];
            const expectedNodeInfos = [];

            graph.getAllNodes().forEach((node) => {
                const nodeId = node.getId();
                node.getNodeCopyInfo = () => {
                    expectedCopyInfos.push(nodeId);
                    return nodeId;
                };
                node.getNodeInfo = () => {
                    expectedNodeInfos.push(nodeId);
                    return nodeId;
                };
            });
            graph.getDimensions = () => expectedDimension;
            graph.operationTime = expectedOperationTime;

            expect(graph.getGraphInfo()).to.deep.equal({
                nodes: expectedNodeInfos,
                comments: [],
                display: expectedDimension,
                operationTime: expectedOperationTime
            });
            expect(expectedCopyInfos.length).to.equal(0);
        });

        it('Case: copy info', () => {
            const graph = createDefaultGraph();
            const expectedDimension = { width: 100, height: 100 };
            const expectedOperationTime = 100;
            const expectedCopyInfos = [];
            const expectedNodeInfos = [];

            graph.getAllNodes().forEach((node) => {
                const nodeId = node.getId();
                node.getNodeCopyInfo = () => {
                    expectedCopyInfos.push(nodeId);
                    return nodeId;
                };
                node.getNodeInfo = () => {
                    expectedNodeInfos.push(nodeId);
                    return nodeId;
                };
            });
            graph.getDimensions = () => expectedDimension;
            graph.operationTime = expectedOperationTime;

            expect(graph.getGraphCopyInfo()).to.deep.equal({
                nodes: expectedCopyInfos,
                comments: [],
                display: expectedDimension,
                operationTime: expectedOperationTime
            });
            expect(expectedNodeInfos.length).to.equal(0);
        });
    });

    function createDefaultGraph() {
        const graph = new DagSubGraph();

        // Input chain #1
        const inputNodes1 = createSimpleNodes(3, DagNodeType.Project);
        linkAndAddNodes(inputNodes1, graph);
        // Input chain #2
        const inputNodes2 = createSimpleNodes(2, DagNodeType.Map);
        linkAndAddNodes(inputNodes2, graph);
        // Output chain
        const outputNodes = createSimpleNodes(2, DagNodeType.Filter);
        // Join them together
        joinNodes(
            inputNodes1[inputNodes1.length - 1],
            inputNodes2[inputNodes2.length - 1],
            outputNodes[0],
            graph
        );

        return graph;
    }

    function createSimpleNodes(num, dagNodeType) {
        const result = [];
        for (let i = 0; i < num; i ++) {
            result.push(DagNodeFactory.create({ type: dagNodeType }));
        }
        return result;
    }

    function linkAndAddNodes(dagNodes, graph) {
        for (let i = 0; i < dagNodes.length; i ++) {
            graph.addNode(dagNodes[i]);
            if (i > 0) {
                graph.connect(dagNodes[i - 1].getId(), dagNodes[i].getId());
            }
        }
    }

    function joinNodes(inputNode1, inputNode2, outputNode, graph) {
        const joinNode = DagNodeFactory.create({ type: DagNodeType.Join });
        graph.addNode(joinNode);
        graph.connect(inputNode1.getId(), joinNode.getId(), 0);
        graph.connect(inputNode2.getId(), joinNode.getId(), 1);
        graph.connect(joinNode.getId(), outputNode.getId());
    }
});