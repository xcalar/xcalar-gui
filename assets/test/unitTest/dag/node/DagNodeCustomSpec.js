describe('DagNodeCustom Test', () => {
    describe('constructor() should work', () => {
        it('Case: Basic parameters', () => {
            const node = new DagNodeCustom();

            expect(node.getType()).to.equal(DagNodeType.Custom);
            expect(node._subGraph != null).to.be.true;
            expect(node._input.length).to.equal(0);
            expect(node._output.length).to.equal(0);
            expect(node.maxParents).to.equal(0);
            expect(node.minParents).to.equal(0);
            expect(node.maxChildren).to.equal(0);
        });
    
        it('Case: With options', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);

            // check subGraph
            expect(node._subGraph != null).to.be.true;
            expect(node._subGraph.getAllNodes().size).to.equal(3);
            // check input
            expect(node._input.length).to.equal(1);
            expect(node._subGraph.hasNode(node._input[0].getId())).to.be.true;
            // check output
            expect(node._output.length).to.equal(1);
            expect(node._subGraph.hasNode(node._output[0].getId())).to.be.true;
            // check name
            expect(node._customName).to.equal('TestCustomName');
        });
    });

    describe('addInputNode() should work', () => {
        it('Case: new input node', () => {
            const { nodeInfo, internalNodeId } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);
            const inPortIdx = node.addInputNode({
                node: node.getSubGraph().getNode(internalNodeId), portIdx: 0
            });

            // Check subGraph
            expect(node.getSubGraph().getAllNodes().size).to.equal(2);
            // Check input
            expect(inPortIdx).to.equal(0);
            expect(node._input.length).to.equal(1);
        });

        it('Case: link input node', () => {
            const { nodeInfo, internalNodeId } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);
            const inputNode = DagNodeFactory.create({ type: DagNodeType.CustomInput });
            const inPortIdx = node._setInputPort(inputNode);
            const internalNode = node.getSubGraph().getNode(internalNodeId);
            node.addInputNode({
                node: internalNode, portIdx: 0
            }, inPortIdx);

            // Check link
            expect(internalNode.getParents().length).to.equal(1);
            expect(internalNode.getParents()[0].getId()).to.equal(inputNode.getId());
        });
    });

    describe('addOutputNode() should work', () => {
        it('Case: new output node', () => {
            const { nodeInfo, internalNodeId } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);
            const outPortIdx = node.addOutputNode(node.getSubGraph().getNode(internalNodeId));

            // Check subGraph
            expect(node.getSubGraph().getAllNodes().size).to.equal(2);
            // Check input
            expect(outPortIdx).to.equal(0);
            expect(node._output.length).to.equal(1);
        });

        it('Case: link input node', () => {
            const { nodeInfo, internalNodeId } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);
            const outputNode = DagNodeFactory.create({ type: DagNodeType.CustomOutput });
            const outPortIdx = node._setOutputPort(outputNode);
            const internalNode = node.getSubGraph().getNode(internalNodeId);
            node.addOutputNode(internalNode, outPortIdx);

            // Check link
            expect(outputNode.getParents().length).to.equal(1);
            expect(outputNode.getParents()[0].getId()).to.equal(internalNode.getId());
        });
    });

    describe('input getters should work', () => {
        it('getInputNodes()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            expect(node.getInputNodes().length).to.equal(1);
        });

        it('getInputIndex()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);

            // Normal case
            expect(node.getInputIndex(node._input[0])).to.equal(0);
            // Non-exist input
            expect(node.getInputIndex(null)).to.equal(-1);
        });

        it('getInputParent()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);

            // No parent
            expect(node.getInputParent(node._input[0]) == null).to.be.true;
            // Input node not found
            expect(node.getInputParent(
                DagNodeFactory.create({ type: DagNodeType.CustomOutput })
            ) == null).to.be.true;
            // Normal case
            node.parents.push(DagNodeFactory.create({ type: DagNodeType.Map }));
            expect(node.getInputParent(node._input[0]) != null).to.be.true;
        });
    });

    describe('state changes should work', () => {
        it('beConfiguredState()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            const configuredNodes = new Set();
            node.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.beConfiguredState = () => {
                    configuredNodes.add(nodeId);
                }
            });

            // Not updateing sub graph
            node.beConfiguredState(false);
            expect(configuredNodes.size).to.equal(0);
            // Updating sub graph
            node.beConfiguredState(true);
            expect(configuredNodes.size).to.equal(3);
        });

        it('beErrorState()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            const errorNodes = new Set();
            node.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.beErrorState = () => {
                    errorNodes.add(nodeId);
                }
            });

            // Not updating sub graph
            // Expecting no node is updated
            node.beErrorState('error', false);
            expect(errorNodes.size).to.equal(0);
            errorNodes.clear();
            // Updating sub graph w/o parent
            // Expecting input node is updated
            node.beErrorState('error', true);
            expect(errorNodes.size).to.equal(1);
            errorNodes.clear();
            // Updating sub graph w/ parent
            // Expecting no node is updated
            node.parents.push(DagNodeFactory.create({ type: DagNodeType.Map }));
            node.beErrorState('error', true);
            expect(errorNodes.size).to.equal(0);
            errorNodes.clear();
        });

        it('beCompleteState()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            const completeNodes = new Set();
            node.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.beCompleteState = () => {
                    completeNodes.add(nodeId);
                }
            });

            node.beCompleteState();
            expect(completeNodes.size).to.equal(1);
        });
    });

    describe('Serialize should work', () => {
        it('getNodeInfo()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            const testNodeInfo = node.getNodeInfo();

            expect(testNodeInfo.subGraph).to.deep.equal(nodeInfo.subGraph);
            expect(testNodeInfo.inPorts).to.deep.equal(nodeInfo.inPorts);
            expect(testNodeInfo.outPorts).to.deep.equal(nodeInfo.outPorts);
            expect(testNodeInfo.customName).to.deep.equal(nodeInfo.customName);
        });

        it('getNodeCopyInfo()', () => {
            const { nodeInfo } = createDefaultNodeInfo();
            const node = new DagNodeCustom(nodeInfo);
            const testNodeInfo = node.getNodeCopyInfo();

            expect(testNodeInfo.subGraph).to.not.deep.equal(nodeInfo.subGraph);
            expect(testNodeInfo.inPorts).to.deep.equal(nodeInfo.inPorts);
            expect(testNodeInfo.outPorts).to.deep.equal(nodeInfo.outPorts);
            expect(testNodeInfo.customName).to.deep.equal(nodeInfo.customName);
        });
    });

    describe('lineageChange() should work', () => {
        it('Case: no output node', () => {
            const { nodeInfo } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);

            expect(node.lineageChange()).to.deep.equal({ columns: [], changes: [] });
        });

        it('Case: normal case', () => {
            const { nodeInfo } = createDefaultNodeInfo(false);
            const node = new DagNodeCustom(nodeInfo);

            const columns = [1,2,3,4].map(
                (v) => ColManager.newPullCol(`col#${v}`, `col#${v}`, ColumnType.string)
            );
            node._output[0].getLineage = () => ({ getColumns: () => columns });
            expect(node.lineageChange()).to.deep.equal({
                columns: columns, changes: []
            });
        });
    });

    describe('validateParam() should work', () => {
        it('test', () => {
            const { nodeInfo } = createDefaultNodeInfo(false);
            const node = new DagNodeCustom(nodeInfo);
            const validatedNodes = new Set();
            node.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.validateParam = () => { validatedNodes.add(nodeId); };
            });

            node.validateParam();
            expect(validatedNodes.size).to.equal(3);
        });
    });

    describe('isConfigured() should work', () => {
        it('test', () => {
            const { nodeInfo } = createDefaultNodeInfo(false);
            const node = new DagNodeCustom(nodeInfo);
            const checkedNodes = new Set();
            node.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.isConfigured = () => { checkedNodes.add(nodeId); return true; };
            });

            node.isConfigured();
            expect(checkedNodes.size).to.equal(3);
        });
    });

    describe('connectToParent() should work', () => {
        it('Case: no input', () => {
            const { nodeInfo } = createDefaultNodeInfo(true);
            const node = new DagNodeCustom(nodeInfo);
            const parentNode = DagNodeFactory.create({ type: DagNodeType.Map });

            let error = null;
            try {
                node.connectToParent(parentNode, 0);
            } catch(e) {
                error = e;
            }
            expect(error != null).to.be.true;
        });

        it('Case: has input', () => {
            const { nodeInfo } = createDefaultNodeInfo(false);
            const node = new DagNodeCustom(nodeInfo);
            const parentNode = DagNodeFactory.create({ type: DagNodeType.Map });

            let error = null;
            try {
                node.connectToParent(parentNode, 0);
            } catch(e) {
                error = e;
            }
            expect(error == null).to.be.true;
            expect(node.getParents().length).to.equal(1);
        });
    });

    function createDefaultNodeInfo(noIO = false) {
        const nodeInfo = { type: DagNodeType.Custom };

        let internalNode;
        if (noIO) {
            // Sub graph
            const subGraph = new DagSubGraph();
            // Internal node
            const dagNode = DagNodeFactory.create({ type: DagNodeType.Project });
            internalNode = dagNode;
            subGraph.addNode(dagNode);

            // Construct the nodeInfo JSON
            nodeInfo.subGraph = subGraph.getGraphInfo();
            nodeInfo.inPorts = [];
            nodeInfo.outPorts = [];
            nodeInfo.customName = 'TestCustomName';
        } else {
            // Sub graph
            const subGraph = new DagSubGraph();
            // Input node
            const inputNode = new DagNodeCustomInput();
            subGraph.addNode(inputNode);
            // Internal node
            const dagNode = DagNodeFactory.create({ type: DagNodeType.Project });
            internalNode = dagNode;
            subGraph.addNode(dagNode);
            subGraph.connect(inputNode.getId(), dagNode.getId());
            // Output ndoe
            const outputNode = new DagNodeCustomOutput();
            subGraph.addNode(outputNode);
            subGraph.connect(dagNode.getId(), outputNode.getId());        

            // Construct the nodeInfo JSON
            nodeInfo.subGraph = subGraph.getGraphInfo();
            nodeInfo.inPorts = [{ parentId: inputNode.getId(), pos: 0 }];
            nodeInfo.outPorts = [{ childId: outputNode.getId(), pos: 0 }];
            nodeInfo.customName = 'TestCustomName';
        }

        return { nodeInfo: nodeInfo, internalNodeId: internalNode.getId() };
    }
});