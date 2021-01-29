describe("DagNodeDFIn Test", function() {
    let createGraph = () => {
        let id = xcHelper.randName("id");
        let graph = new DagGraph();
        graph.setTabId(id);
        return graph;
    };

    let createLinkOutNode = (name) => {
        let node = new DagNodeDFOut({});
        node.setParam({"name": name});
        return node;
    };
    
    it("should be a correct instance", function() {
        let node = new DagNodeDFIn({});
        expect(node).to.be.an.instanceof(DagNodeDFIn);
    });

    it("should set param", function() {
        let graph = createGraph();
        let dataflowId = graph.getTabId();
        let node = new DagNodeDFIn({"graph": graph});
        node.setParam({
            "dataflowId": dataflowId,
            "linkOutName": "test"
        });

        let param = node.getParam();
        expect(param.dataflowId).to.equal(DagNodeDFIn.SELF_ID);
        expect(param.linkOutName).to.equal("test");
    });

    describe("find linked node and graph test", function() {
        describe("_findLinkedOutNodeInGraph test", function() {            
            it("should throw error if no graph", function() {
                try {
                    let node = new DagNodeDFIn({});
                    node._findLinkedOutNodeInGraph(null);
                } catch (e) {
                    expect(e.message).to.equal(DagNodeErrorType.NoGraph);
                }
            });

            it("should return link out nodes", function() {
                let graph = createGraph();
                let linkOut = createLinkOutNode("test");
                let filterNode = new DagNodeFilter({});
                graph.addNode(linkOut);
                graph.addNode(filterNode);
                let node = new DagNodeDFIn({});
                let res = node._findLinkedOutNodeInGraph(graph, "test");
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal(linkOut);
            });
        });

        describe("_findLinkedGraph test", function() {
            it("should return itself", function() {
                let graph = createGraph();
                let node = new DagNodeDFIn({"graph": graph});
                let res = node._findLinkedGraph(DagNodeDFIn.SELF_ID);
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal(graph);
            });

            it("should return dataflow by id", function() {
                let graph = createGraph();
                let tab = new DagTabUser({
                    dagGraph: graph
                });
                let oldFunc = DagTabManager.Instance.getTabById;
                DagTabManager.Instance.getTabById = () => tab;

                let node = new DagNodeDFIn({});
                let res = node._findLinkedGraph(tab.getId());
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal(graph);

                DagTabManager.Instance.getTabById = oldFunc;
            });

            it("should seach all tabs and return graph", function() {
                let graph = createGraph();
                let tab = new DagTabUser({dagGraph: graph});
                let oldFunc = DagTabManager.Instance.getTabs;
                DagTabManager.Instance.getTabs = () => [tab];

                let node = new DagNodeDFIn({});
                let res = node._findLinkedGraph(null);
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal(graph);

                DagTabManager.Instance.getTabs = oldFunc;
            });
        });

        describe("getLinkedNodeAndGraph should work", function() {
            it("should throw error if no graph", function() {
                let node = new DagNodeDFIn({});
                node.setParam({
                    "dataflowId": DagNodeDFIn.SELF_ID
                });
                try {
                    node.getLinkedNodeAndGraph();
                } catch (e) {
                    expect(e.message).to.equal(DagNodeLinkInErrorType.NoGraph);
                }
            });

            it("should throw error if no link out nodes", function() {
                let graph = createGraph();
                let node = new DagNodeDFIn({"graph": graph});
                node.setParam({
                    "dataflowId": DagNodeDFIn.SELF_ID,
                    "linkOutName": "test"
                });
                try {
                    node.getLinkedNodeAndGraph();
                } catch (e) {
                    expect(e.message).to.equal(DagNodeLinkInErrorType.NoLinkInGraph);
                }
            });

            it("should throw error if has more than 1 link out node", function() {
                let graph = createGraph();
                let linkOut1 = createLinkOutNode("test");
                let linkOut2 = createLinkOutNode("test");
                graph.addNode(linkOut1);
                graph.addNode(linkOut2);

                let node = new DagNodeDFIn({"graph": graph});
                node.setParam({
                    "dataflowId": DagNodeDFIn.SELF_ID,
                    "linkOutName": "test"
                });
                try {
                    node.getLinkedNodeAndGraph();
                } catch (e) {
                    expect(e.message).to.equal(DagNodeLinkInErrorType.MoreLinkGraph);
                }
            });

            it("should find link out node", function() {
                let graph = createGraph();
                let linkOut = createLinkOutNode("test");
                graph.addNode(linkOut);
                let node = new DagNodeDFIn({"graph": graph});
                node.setParam({
                    "dataflowId": DagNodeDFIn.SELF_ID,
                    "linkOutName": "test"
                });

                let res = node.getLinkedNodeAndGraph();
                expect(res.graph).to.equal(graph);
                expect(res.node).to.equal(linkOut);
            });

            it("should find link out node with parameterization", function() {
                let graph = createGraph();
                let linkOut = createLinkOutNode("test");
                graph.addNode(linkOut);
                let node = new DagNodeDFIn({"graph": graph});
                node.setParam({
                    "dataflowId": DagNodeDFIn.SELF_ID,
                    "linkOutName": "<a>"
                });

                let oldGetParamMap = DagParamManager.Instance.getParamMap;
                DagParamManager.Instance.getParamMap = () => {
                    return {
                        "a": "test"
                    };
                };
                let res = node.getLinkedNodeAndGraph();
                expect(res.graph).to.equal(graph);
                expect(res.node).to.equal(linkOut);
                DagParamManager.Instance.getParamMap = oldGetParamMap;
            });
        });

        it("lineageChange should work", function() {
            let node = new DagNodeDFIn({});
            let schema = [{"name": "test", type: ColumnType.string}];
            node.setSchema(schema);
            let res = node.lineageChange();
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("test");
            expect(res.changes.length).to.equal(0);
        });

        it("isLinkingError should work", function() {
            let node = new DagNodeDFIn({});
            expect(node.isLinkingError()).to.equal(false);

            // case 2
            node.error = DagNodeLinkInErrorType.NoGraph;
            expect(node.isLinkingError()).to.equal(true);
        });

        it("_genParamHint should work", function() {
            let node = new DagNodeDFIn({});
            node.setParam({
                "dataflowId": DagNodeDFIn.SELF_ID,
                "linkOutName": "test"
            });
            let res = node._genParamHint();
            expect(res).include("test");
        });

        it("_getColumnsUsedInInput should work", function() {
            let node = new DagNodeDFIn({});
            expect(node._getColumnsUsedInInput()).to.be.null;
        });
    });

    it("when link in node call updateStepThroughProgress(), it should update stats with table meta", async function(done) {
        // arrange
        const oldFunc = XIApi.getTableMeta;
        const node = new DagNodeDFIn({});
        node.setTable(xcHelper.randName("test"));
        const numRows = Math.floor(Math.random() * 1000) + 1;
        const size = Math.floor(Math.random() * 1000) + 1;
        XIApi.getTableMeta = () => {
            return Promise.resolve({
                metas: [{
                    numRows,
                    size
                }]
            });
        };

        try {
            // act
            await node.updateStepThroughProgress();
            const stats = node.getIndividualStats();
            // assert
            expect(stats.length).to.equal(1);
            expect(stats[0].type).to.equal(null);
            expect(stats[0].elapsedTime).to.equal(null);
            expect(stats[0].size).to.equal(size);
            expect(stats[0].rows).to.deep.equal([numRows]);
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.getTableMeta = oldFunc;
        }
    });
});