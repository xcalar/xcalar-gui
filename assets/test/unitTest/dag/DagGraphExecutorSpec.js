describe("DagGraphExecutor Test", () => {
    // XXX needs more tests
    before((done) => {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(() => {
            done();
        });
    });

    describe("constructor", () => {
        it("normal executor should have correct properties", () => {
            let mapNode = new DagNodeMap({});
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});

            expect(executor._isOptimized).to.be.false;
            expect(executor._graph).to.equal(graph);
            expect(executor._nodes.length).to.equal(1);
            expect(executor._nodes[0]).to.equal(mapNode);
            expect(executor._allowNonOptimizedOut).to.be.false;
            expect(executor._isNoReplaceParam).to.be.false;
            expect(executor._isCanceled).to.be.false;
            expect(executor._queryName).to.be.undefined;
            expect(executor._parentTxId).to.be.undefined;
            expect(executor._sqlNodes).to.be.undefined;
            expect(executor._hasProgressGraph).to.be.undefined;
            expect(executor._dagIdToDestTableMap).to.be.empty;
            expect(executor._finishedNodeIds.size).to.equal(0);
            expect(executor._isRestoredExecution).to.be.false;
            expect(executor._internalAggNames.size).to.equal(0);
        });
        it("executor with all options should have correct properties", () => {
            let mapNode = new DagNodeMap({});
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let sqlNodes = new Map();
            let sqlNode = new DagNodeSQL({});
            sqlNodes.set("sqlNode", sqlNode);

            let executor = new DagGraphExecutor([mapNode], graph, {
                optimized: true,
                noReplaceParam: true,
                queryName: "queryName",
                parentTxId: 25,
                allowNonOptimizedOut: true,
                sqlNodes: sqlNodes,
                hasProgressGraph: true,
                isRestoredExecution: true
            });

            expect(executor._isOptimized).to.be.true;
            expect(executor._graph).to.equal(graph);
            expect(executor._nodes.length).to.equal(1);
            expect(executor._nodes[0]).to.equal(mapNode);
            expect(executor._allowNonOptimizedOut).to.be.true;
            expect(executor._isNoReplaceParam).to.be.true;
            expect(executor._isCanceled).to.be.false;
            expect(executor._queryName).to.equal("queryName")
            expect(executor._parentTxId).to.equal(25);
            expect(executor._sqlNodes.size).to.equal(1);
            expect(executor._sqlNodes.get("sqlNode")).to.equal(sqlNode);
            expect(executor._hasProgressGraph).to.be.true;
            expect(executor._dagIdToDestTableMap).to.be.empty;
            expect(executor._finishedNodeIds.size).to.equal(0);
            expect(executor._isRestoredExecution).to.be.true;
            expect(executor._internalAggNames.size).to.equal(0);
        });
    });

    describe("validation functions", () => {
        it("checkCanExecuteAll - should fail due to unconfigured node", () => {
            let mapNode = new DagNodeMap({});
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal("Unconfigured");
            expect(res.node).to.equal(mapNode);
        });
        it("checkCanExecuteAll - should fail due to missing source", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal("Missing Source");
            expect(res.node).to.equal(mapNode);
        });
        it("checkCanExecuteAll - should fail due to null node", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([null], graph, {});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.NoNode);
            expect(res.node).to.be.null;
        });
        it("checkCanExecuteAll - should fail due to invalid dataset", () => {
            let datasetNode = new DagNodeDataset({});
            datasetNode.setParam({});
            datasetNode.beConfiguredState();
            let graph = new DagGraph();
            graph.addNode(datasetNode);
            let executor = new DagGraphExecutor([datasetNode], graph, {});
            let res = executor.checkCanExecuteAll();

            expect(res.hasError).to.be.true;
            expect(res.type).to.equal("Cannot read property 'indexOf' of null");
            expect(res.node).to.equal(datasetNode);
        });
        it("checkCanExecuteAll - should fail due to optimized dataset with no children", () => {
            let datasetNode = new DagNodeDataset({});
            datasetNode.setParam({});
            datasetNode.beConfiguredState();
            let graph = new DagGraph();
            graph.addNode(datasetNode);
            let executor = new DagGraphExecutor([datasetNode], graph, {optimized: true});
            executor._validateDataset = () => null;
            let res = executor.checkCanExecuteAll();

            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedOutNode);
            expect(res.node).to.equal(datasetNode);
        });

        it("checkCanExecuteAll - should fail due to DFIn not having source", () => {
            let linkInNode = new DagNodeDFIn({});
            linkInNode.setParam({linkOutName: Date.now()});
            linkInNode.beConfiguredState();
            let graph = new DagGraph();
            graph.addNode(linkInNode);
            let executor = new DagGraphExecutor([linkInNode], graph, {});

            let res = executor.checkCanExecuteAll();

            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeLinkInErrorType.NoLinkInGraph);
            expect(res.node).to.equal(linkInNode);
        });



        it("checkCanExecuteAll - terminal map node in optimized should fail", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {optimized: true});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedOutNode);
            expect(res.node).to.equal(mapNode);
        });

        it("checkCanExecuteAll - map node with invalid Agg should fail", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            mapNode.getAggregates = () => ["fakeAgg123"];
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.NoAggNode);
            expect(res.node).to.equal(mapNode);
        });

        it("checkCanExecuteAll - map node with valid Agg should pass", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            mapNode.getAggregates = () => ["fakeAgg123"];
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});
            let cacheGetAgg = DagAggManager.Instance.getAgg;
            DagAggManager.Instance.getAgg = () => {
                return {value: 5};
            };
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.false;
            expect(res.type).to.be.null;
            expect(res.node).to.be.null;
            DagAggManager.Instance.getAgg = cacheGetAgg;
        });

        it("checkCanExecuteAll - 1 node should pass", () => {
            let mapNode = new DagNodeMap({});
            mapNode.setParam({});
            mapNode.beConfiguredState();
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([mapNode], graph, {});
            let res = executor.checkCanExecuteAll();
            expect(res.hasError).to.be.false;
            expect(res.type).to.be.null;
            expect(res.node).to.be.null;
        });

        it("checkDisjoint should pass", () => {
            let mapNode = new DagNodeMap({});
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([datasetNode, mapNode], graph, {});
            let res = executor._checkDisjoint();
            expect(res.hasError).to.be.false;
        });

        it("checkDisjoint should return error", () => {
            let graph = new DagGraph();
            let mapNode = new DagNodeMap({});
            let datasetNode = new DagNodeDataset({});
            let filterNode = new DagNodeFilter({});
            graph.addNode(mapNode);
            graph.addNode(datasetNode);
            graph.addNode(filterNode);
            mapNode.connectToParent(datasetNode);

            let executor = new DagGraphExecutor([datasetNode, mapNode, filterNode], graph, {});
            let res = executor._checkDisjoint();
            expect(res.hasError).to.be.true;
            expect(res.node).to.equal(filterNode);
            expect(res.type).to.equal(DagNodeErrorType.Disjoint);
        });

        it("checkValidOptimizedDataflow - fail due to export/link out combo", () => {
            let graph = new DagGraph();
            let datasetNode = new DagNodeDataset({});
            let exportNode = new DagNodeExport({});
            let linkOutNode = new DagNodeDFOut({});
            linkOutNode.setParam({
                columns: [{sourceName: "test"}]
            });
            graph.addNode(datasetNode);
            graph.addNode(exportNode);
            graph.addNode(linkOutNode);
            exportNode.connectToParent(datasetNode);
            linkOutNode.connectToParent(datasetNode);

            let executor = new DagGraphExecutor([datasetNode, exportNode, linkOutNode], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedOutNodeCombo);
            expect(res.node).to.equal(linkOutNode);
        });
        it("checkValidOptimizedDataflow - fail due to 2 link out nodes", () => {
            let graph = new DagGraph();
            let datasetNode = new DagNodeDataset({});
            let linkOutNode = new DagNodeDFOut({});
            let linkOutNode2 = new DagNodeDFOut({});
            graph.addNode(datasetNode);
            graph.addNode(linkOutNode);
            graph.addNode(linkOutNode2);
            linkOutNode.connectToParent(datasetNode);
            linkOutNode2.connectToParent(datasetNode);
            linkOutNode.setParam({
                columns: [{sourceName: "test"}]
            });
            linkOutNode2.setParam({
                columns: [{sourceName: "test"}]
            });
            let executor = new DagGraphExecutor([datasetNode, linkOutNode, linkOutNode2], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedLinkOutCount);
            expect(res.node).to.equal(linkOutNode2);
        });
        it("checkValidOptimizedDataflow - fail due to no out nodes", () => {
            let mapNode = new DagNodeMap({});
            let datasetNode = new DagNodeDataset({});
            mapNode.connectToParent(datasetNode);
            let graph = new DagGraph();
            graph.addNode(mapNode);
            let executor = new DagGraphExecutor([datasetNode, mapNode], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedOutNode);
            expect(res.node).to.be.null;
        });
        it("checkValidOptimizedDataflow - fail due to 2 export nodes with same parent", () => {
            let graph = new DagGraph();
            let datasetNode = new DagNodeDataset({});
            let exportNode1 = new DagNodeExport({});
            let exportNode2 = new DagNodeExport({});
            graph.addNode(datasetNode);
            graph.addNode(exportNode1);
            graph.addNode(exportNode2);
            exportNode1.connectToParent(datasetNode);
            exportNode2.connectToParent(datasetNode);

            let executor = new DagGraphExecutor([datasetNode, exportNode1, exportNode2], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.true;
            expect(res.type).to.equal(DagNodeErrorType.InvalidOptimizedDuplicateExport);
            expect(res.node).to.equal(exportNode2);
        });

        it("checkValidOptimizedDataflow - link out should work", () => {
            let graph = new DagGraph();
            let datasetNode = new DagNodeDataset({});
            let linkOutNode = new DagNodeDFOut({});
            graph.addNode(datasetNode);
            graph.addNode(linkOutNode);
            linkOutNode.connectToParent(datasetNode);
            linkOutNode.setParam({
                columns: [{sourceName: "test"}]
            });
            let executor = new DagGraphExecutor([datasetNode, linkOutNode], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.false;
            expect(executor._isOptimizedActiveSession).to.be.true;
            expect(executor._optimizedLinkOutNode).to.equal(linkOutNode);
        });

        it("checkValidOptimizedDataflow - export should work", () => {
            let graph = new DagGraph();
            let datasetNode = new DagNodeDataset({});
            let exportNode = new DagNodeExport({});
            graph.addNode(datasetNode);
            graph.addNode(exportNode);
            exportNode.connectToParent(datasetNode);

            let executor = new DagGraphExecutor([datasetNode, exportNode], graph, {optimized: true});
            let res = executor._checkValidOptimizedDataflow();
            expect(res.hasError).to.be.false;
            expect(executor._isOptimizedActiveSession).to.be.false;
            expect(executor._optimizedExportNodes).to.deep.equal([exportNode]);
        });
    });

    it("restore execution should work", (done) => {
        let tab = new DagTabUser();
        let graph = new DagGraph();
        graph.setTabId(tab.getId());
        let cache1 = XcalarQueryState;
        let cache3 = DagViewManager.Instance.updateDFProgress;
        called1 = false;

        called3 = false;
        let txId;

        XcalarQueryState = () => {
            called1 = true;
            return PromiseHelper.resolve({
                numCompletedWorkItem: 0,
                elapsed: {milliseconds: 5},
                queryState: QueryStateT.qrFinished,
                queryGraph: {node: [{
                comment: JSON.stringify({graph_node_locator: [{nodeId: "nodeId1"},{nodeId: "nodeId2"}]})
            }]}})
        };

        DagViewManager.Instance.updateDFProgress = (tabId, queryStateOutput) => {
            expect(tabId).to.equal(tab.getId());
            expect(queryStateOutput).to.deep.equal({
                "numCompletedWorkItem": 0,
                "elapsed": {
                  "milliseconds": 5
                },
                "queryState": 2,
                "queryGraph": {
                  "node": [
                    {
                      "comment": JSON.stringify({graph_node_locator: [{nodeId: "nodeId1"},{nodeId: "nodeId2"}]})
                    }
                  ]
                }
              });
            let txInfo = Transaction.__testOnly__.getAll();
            expect(txInfo.txIdCount).to.be.gt(0);
            let txLog = Transaction.get(txInfo.txIdCount - 1);
            expect(txLog.nodeIds).to.deep.equal(["nodeId1", "nodeId2"]);
            expect(txLog.tabId).to.equal(tab.getId());
            called3 = true;
        };

        const executor = new DagGraphExecutor([], graph, {isRestoredExecution: true});
        executor.restoreExecution("myQuery");
        expect(called1).to.be.true;
        UnitTest.testFinish(() => called3)
        .always(() => {
            expect(called3).to.be.true;
            XcalarQueryState = cache1;
            DagViewManager.Instance.updateDFProgress = cache3;
            done();
        });
    });
});