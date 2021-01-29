class DagGraphExecutor {
    private _nodes: DagNode[];
    private _graph: DagGraph;
    private _optimizedExecuteInProgress = false;
    private _isOptimized: boolean;
    private _isOptimizedActiveSession: boolean;
    private _allowNonOptimizedOut: boolean;
    private _optimizedLinkOutNode: DagNodeDFOut;
    private _optimizedExportNodes: DagNodeExport[];
    private _optimizedPublishNode: DagNodePublishIMD;
    private _isNoReplaceParam: boolean;
    private _currentTxId: number;
    private _isCanceled: boolean;
    private _queryName: string; // for retinas
    private _parentTxId: number;
    private _sqlNodes: Map<string, DagNodeSQL>;
    private _hasProgressGraph: boolean; // has a separate graph in different tab
    private _dagIdToDestTableMap: Map<DagNodeId, string>;
    private _currentNode: DagNode; // current node in progress if stepExecute
    private _finishedNodeIds: Set<DagNodeId>;
    private _isRestoredExecution: boolean; // if restored after browser refresh
    private _internalAggNames: Map<string, string>; // aggs created in this graph.
    private _synthesizeDFOut: boolean; // if true, will treat link out as synthesize op. only happen in optimized DF
    private _isLinkInBatch: boolean;
    private _isSDK: boolean;

    public static readonly stepThroughTypes = new Set([DagNodeType.PublishIMD,
        DagNodeType.IMDTable,
        DagNodeType.Custom, DagNodeType.CustomInput, DagNodeType.CustomOutput,
        DagNodeType.Module]);

    public static hasUDFError(queryNode: XcalarApiDagNodeT): boolean {
        // for udfError to be true, numRowsFailedTotal must be > 0 and
        // node must not have icv
        return (queryNode &&
                queryNode.opFailureInfo &&
                queryNode.opFailureInfo.numRowsFailedTotal > 0 &&
                    !(queryNode.input &&
                    queryNode.input.mapInput &&
                    queryNode.input.mapInput.icv === true)
                );
    }

    public constructor(
        nodes: DagNode[],
        graph: DagGraph,
        options: {
            optimized?: boolean,
            noReplaceParam?: boolean,
            queryName?: string,
            parentTxId?: number,
            allowNonOptimizedOut?: boolean,
            sqlNodes?: Map<string, DagNodeSQL>,
            hasProgressGraph?: boolean,
            isRestoredExecution?: boolean
            synthesizeDFOut?: boolean,
            isLinkInBatch?: boolean
        } = {}
    ) {
        this._nodes = nodes;
        this._graph = graph;
        this._isOptimized = options.optimized || false;
        this._allowNonOptimizedOut = options.allowNonOptimizedOut || false;
        this._isNoReplaceParam = options.noReplaceParam || false;
        this._synthesizeDFOut = options.synthesizeDFOut || false;
        this._isLinkInBatch = options.isLinkInBatch || false;
        this._isCanceled = false;
        this._queryName = options.queryName;
        this._parentTxId = options.parentTxId;
        this._sqlNodes = options.sqlNodes;
        this._hasProgressGraph = this._isOptimized || options.hasProgressGraph;
        this._dagIdToDestTableMap = new Map();
        this._finishedNodeIds = new Set();
        this._isRestoredExecution = options.isRestoredExecution || false;
        this._internalAggNames = new Map();
        this._isSDK = xcHelper.isNodeJs();
    }

    public validateAll(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let validateResult = this.checkCanExecuteAll();

        if (!validateResult.hasError && this._isOptimized) {
            validateResult = this._checkValidOptimizedDataflow();
        }

        return validateResult;
    }


    /**
     * Static check if the nodes to run are executable
     */
    public checkCanExecuteAll(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };

        for (let i = 0; i < this._nodes.length; i++) {
            let node: DagNode = this._nodes[i];
            if (node == null) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.NoNode;
                break;
            }
            if (node.getType() === DagNodeType.CustomInput) {
                continue;
            }
            let aggs = node.getAggregates();
            if (node.getState() === DagNodeState.Unused) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.Unconfigured;
                errorResult.node = node;
                break;
            } else if (node.getNumParent() < node.getMinParents()) {
                // check if nodes do not have enough parents
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.MissingSource;
                errorResult.node = node;
                break;
            } else if (node.getType() === DagNodeType.DFIn) {
                const linkInNode: DagNodeDFIn = <DagNodeDFIn>node;
                if (linkInNode.hasSource()) {
                    // skip check if has source
                    break;
                }
                const res = this._checkLinkInResult(linkInNode);
                if (res.hasError) {
                    errorResult = res;
                    break;
                }
                // check if the linked node has executed
                const linkoutNode: DagNodeDFOut = linkInNode.getLinkedNodeAndGraph().node;
                if (linkoutNode.shouldLinkAfterExecution() &&
                    linkoutNode.getState() !== DagNodeState.Complete
                ) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.LinkOutNotExecute;
                    errorResult.node = node;
                    break;
                } else if (this._isOptimized && node.hasNoChildren()) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                }
            } else if (node.getType() === DagNodeType.Dataset) {
                const error: DagNodeErrorType = this._validateDataset(<DagNodeDataset>node);
                if (error != null) {
                    errorResult.hasError = true;
                    errorResult.type = error;
                    errorResult.node = node;
                    break;
                } else if (this._isOptimized && node.hasNoChildren()) {
                    // if this is just a dataset node, we need to error
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                }
            } else if (this._isOptimized && node.hasNoChildren()) {
                let nodeType = node.getType();
                if (!node.isOutNode() ||
                    (nodeType !== DagNodeType.Export &&
                    nodeType !== DagNodeType.DFOut &&
                    nodeType !== DagNodeType.CustomOutput &&
                    nodeType !== DagNodeType.Aggregate) &&
                    !this._allowNonOptimizedOut
                ) {
                    if (this._isSDK && nodeType === DagNodeType.PublishIMD) {
                        // publish node only allowed in SDK case
                        continue;
                    }
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
                    errorResult.node = node;
                    break;
                }
            } else if (aggs.length > 0) {
                const error: DagNodeErrorType = this._validateAggregates(aggs);
                if (error != null) {
                    errorResult.hasError = true;
                    errorResult.type = error;
                    errorResult.node = node;
                    break;
                }
            }
        }

        return errorResult;
    }

    private _validateAggregates(aggs: string[]): DagNodeErrorType {
        for(let i = 0; i < aggs.length; i++) {
            let agg: string = aggs[i];
            let aggNode: DagNodeAggregate =
                <DagNodeAggregate>this._nodes.find((node) => {return node.getParam().dest == agg})
            if (aggNode == null) {
                let aggInfo = this.getRuntime().getDagAggService().getAgg(agg);
                if (aggInfo && aggInfo.value != null) {
                    // It has a value, we're alright.
                    continue
                }
                return DagNodeErrorType.NoAggNode;
            }
        }
        return null;
    }

    // checks to see if dataflow is invalid due to export node + link out node
    // or multiple link out nodes and sets
    private _checkValidOptimizedDataflow(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        let numExportNodes = 0;
        let numLinkOutNodes = 0;
        let numPublishNodes = 0;
        let linkOutNode: DagNodeDFOut;
        let exportNodes: DagNodeExport[] = [];
        let exportNodesSources = new Set();
        for (let i = 0; i < this._nodes.length; i++) {
            const node: DagNode = this._nodes[i];
            const nodeType = node.getType();
            if (nodeType === DagNodeType.Export) {
                exportNodes.push(<DagNodeExport>node);
                let sourceId = node.getParents()[0].getId();
                if (exportNodesSources.has(sourceId)) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedDuplicateExport;
                    errorResult.node = node;
                    break;
                } else {
                    exportNodesSources.add(sourceId);
                }
                numExportNodes++;
            }
            if (nodeType === DagNodeType.DFOut) {
                numLinkOutNodes++;
                linkOutNode = <DagNodeDFOut>node;
            }
            if (this._isSDK && nodeType === DagNodeType.PublishIMD) {
                numPublishNodes++;
                this._optimizedPublishNode = <DagNodePublishIMD>node;
            }
            if (numLinkOutNodes > 0 && numExportNodes > 0) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedOutNodeCombo;
                errorResult.node = node;
                break;
            }
            if (numLinkOutNodes > 1) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedLinkOutCount;
                errorResult.node = node;
                break;
            }
            if (numPublishNodes > 1) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedPublishCount;
                errorResult.node = node;
                break;
            }
        }
        if (!errorResult.hasError) {
            if (numPublishNodes === 1) {
                if (numLinkOutNodes > 0 || numExportNodes > 0) {
                    errorResult.hasError = true;
                    errorResult.type = DagNodeErrorType.InvalidOptimizedPublishNode;
                }
            } else if (numLinkOutNodes === 1) {
                this._isOptimizedActiveSession = true;
                this._optimizedLinkOutNode = linkOutNode;
            } else if (numLinkOutNodes === 0 && numExportNodes === 0) {
                errorResult.hasError = true;
                errorResult.type = DagNodeErrorType.InvalidOptimizedOutNode;
            } else {
                this._isOptimizedActiveSession = false;
                this._optimizedExportNodes = exportNodes;
            }
        }
        return errorResult;
    }

    // XXX NO LONGER BLOCKING USERS FROM EXECUTING DISJOINT GRAPHS FOR OPTIMIZED DATAFLOWS
    // first traverses all the ancestors of the endNode and puts them into a tree
    // then traverses all the nodes left out and puts them into a new tree
    // while doing the traversing, if we encounter a node that already belongs to
    // another tree, we later combine the 2 trees into the first and delete the latter
    // if the result ends in more than 1 tree, we return an error
    private _checkDisjoint(): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        const self = this;
        let count = 0;
        let treeIndex = count;
        const notSeen = {};
        const allSeen = {};
        const trees = {};
        let currentTree = {};
        let aggregateNodes: Set<DagNodeAggregate> = new Set();
        let nodes: Map<DagNodeId, DagNode> = new Map();
        // 1. add all nodes to nodes map, add aggregate nodes to it's own set
        this._nodes.forEach(node => {
            nodes.set(node.getId(), node);
            if (node instanceof DagNodeAggregate) {
                aggregateNodes.add(node);
            }
        });
        // 2. remove all aggregate nodes and their parents from the nodes map
        // so we can ignore these nodes when checking for disjoint dataflows
        aggregateNodes.forEach((node) => {
            nodes.delete(node.getId());
            self._graph.traverseParents(node, (parentNode)=> {
                nodes.delete(parentNode.getId());
            });
        })
        nodes.forEach(node => {
            notSeen[node.getId()] = node;
        });
        const endNode = this._nodes[this._nodes.length - 1];
        currentTree[endNode.getId()] = true;
        // mark traversed nodes as seen
        createFirstTree();

        // for any notSeen nodes, traverse and they should intersect
        // seen nodes
        for (let i in notSeen) {
            count++;
            currentTree = {};
            treeIndex = count;
            const seen = {};
            const seenTreeIndexes = {};
            currentTree[notSeen[i].getId()] = true;
            const curNode = notSeen[i];

            this._graph.traverseParents(curNode, (parent) => {
                const id = parent.getId();
                delete notSeen[id];
                if (seen[id]) {
                    return false;
                } else {
                    if (allSeen[id] != null) {
                        seenTreeIndexes[allSeen[id]] = true;
                        treeIndex = Math.min(allSeen[id], treeIndex);
                    }
                    seen[id] = true;
                    currentTree[id] = true;
                }
            });
            allSeen[curNode.getId()] = treeIndex;
            delete notSeen[i];
            trees[count] = currentTree; // add to trees
            for (let i in currentTree) {
                allSeen[i] = treeIndex;
            }
            // if this tree is connected with another tree, combine them both
            // and delete the current tree
            if (treeIndex !== count) {
                trees[treeIndex] = $.extend(currentTree[treeIndex], currentTree);
                delete trees[count];
            }

            // go through other trees and connect them to other trees if they
            // qualify
            for (let i in seenTreeIndexes) {
                if (parseInt(i) === 0) {
                    continue;
                }
                const tree = trees[i];
                for (let j in tree) {
                    allSeen[j] = treeIndex;
                }
                if (parseInt(i) !== treeIndex) {
                    tree[treeIndex] = $.extend(tree[treeIndex], tree);
                    delete trees[i];
                }
            }
        }

        function createFirstTree() {
            self._graph.traverseParents(endNode, (parent) => {
                delete notSeen[parent.getId()];
                if (allSeen[parent.getId()] == null) {
                    currentTree[parent.getId()] = true;
                    allSeen[parent.getId()] = treeIndex;
                }
            });
            allSeen[endNode.getId()] = treeIndex;
            delete notSeen[endNode.getId()];
            trees[count] = currentTree;
        }

          // if there's more than 1 tree, return an error
        if (Object.keys(trees).length > 1) {
            return {hasError: true, type: DagNodeErrorType.Disjoint, node: endNode};
        } else {
            return errorResult;
        }
    }

    /**
     * Execute nodes
     */
    public run(): XDPromise<any> {
        const self: DagGraphExecutor = this;
        const deferred = PromiseHelper.deferred();

        if (this._isCanceled) {
            deferred.reject(DFTStr.Cancel);
        } else if (this._isOptimized) {
            // XXX TODO: deprecate this part
            this.getRetinaArgs(true)
            .then(({ retina }) => {
                if (this._isCanceled) {
                    return PromiseHelper.reject(DFTStr.Cancel);
                }
                return this._createAndExecuteRetina(retina);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            const nodes: DagNode[] = this._nodes.filter((node) => {
                if (node instanceof DagNodePublishIMD && node.getState() === DagNodeState.Complete) {
                    return !PTblManager.Instance.hasTable(node.getParam(true).pubTableName);
                } else if (node instanceof DagNodeAggregate && node.getState() === DagNodeState.Complete) {
                    const param: DagNodeAggregateInputStruct = node.getParam(true);
                    const agg: AggregateInfo = this.getRuntime().getDagAggService().getAgg(param.dest);
                    return (!agg || agg.value == null);
                }
                return (node.getState() !== DagNodeState.Complete || !DagTblManager.Instance.hasTable(node.getTable()));
            });

            if (nodes.length === 0 && this._nodes.length !== 0) {
                return PromiseHelper.reject(DFTStr.AllExecuted);
            }
            let nodeIds = nodes.map(node => node.getId());

            let operation: string = SQLOps.DataflowExecution;
            let queryMeta: string = null;
            if (nodes.length === 1) {
                operation = nodes[0].getType();
                if (nodes[0] instanceof DagNodeSQL) {
                    let node = <DagNodeSQL>nodes[0];
                    let sqlQuery = node.getSQLQuery();
                    if (sqlQuery) {
                        queryMeta = sqlQuery.queryString;
                    }
                }
            }

            const tabId: string = this._graph.getTabId();
            const udfContext = this._getUDFContext();
            const txId: number = Transaction.start({
                operation: operation,
                trackDataflow: true,
                sql: {operation: operation},
                track: true,
                tabId: tabId,
                nodeIds: nodeIds,
                parentTxId: this._parentTxId,
                udfUserName: udfContext.udfUserName,
                udfSessionName: udfContext.udfSessionName,
                queryMeta: queryMeta
            });
            this._currentTxId = txId;
            this._getAndExecuteBatchQuery(txId, nodes)
            .then((_res) => {
                self._optimizedExecuteInProgress = false;
                let hasIncomplete = false;
                nodes.forEach((node) => {
                    if (node instanceof DagNodeDFOut) {
                        let destTable;
                        if (node.getNumParent() === 1) {
                            destTable = node.getParents()[0].getTable();
                        }
                        if (destTable) {
                            node.setTable(destTable, true);
                            DagTblManager.Instance.addTable(destTable);
                        }
                        node.updateStepThroughProgress();
                        node.beCompleteState();
                    } else if (node instanceof DagNodeDFIn) {
                        let destTable: string;
                        if (node.hasSource()) {
                            destTable = node.getSource();
                        } else {
                            const res = node.getLinkedNodeAndGraph();
                            const linkOutNode: DagNodeDFOut = res.node;
                            destTable = linkOutNode.getTable();
                            if (!destTable && !linkOutNode.shouldLinkAfterExecution()) {
                                // edge case where linkIn node uses a cached
                                // table that's created by another linkIn node
                                destTable = linkOutNode.getStoredQueryDest(tabId);
                            }
                        }
                        if (destTable) {
                            node.setTable(destTable, true);
                            DagTblManager.Instance.addTable(destTable);
                        }
                    } else if (node.getState() === DagNodeState.Running) {
                        console.error(node.getTitle() + " " + node.getDisplayNodeType() + " did not finish running");
                        console.error(JSON.stringify(node.getIndividualStats()));
                        hasIncomplete = true;
                    }
                });
                if (hasIncomplete) {
                    console.error(JSON.stringify(_res, null, 4));
                }
                Transaction.done(txId, {
                    noLog: true,
                });

                DagTblManager.Instance.update(); // sync backtables with cache
                return PromiseHelper.alwaysResolve(MemoryAlert.Instance.check());
            })
            .then(() => deferred.resolve())
            .fail((error) => {
                let transactionError = error;
                if (error && error.node) {
                    // remove node from transaction.log due to cyclical error
                    const node = error.node;
                    delete error.node;
                    transactionError = xcHelper.deepCopy(error);
                    error.node = node;

                }
                this._nodes.forEach((node) => {
                    if (node.getState() === DagNodeState.Running) {
                        node.beConfiguredState();
                    }
                });
                Transaction.fail(txId, {
                    error: transactionError,
                    noAlert: true
                });
                deferred.reject(error);
            });
        }
        return deferred.promise();
    }

    // cancel execution
    public cancel(): void {
        this._isCanceled = true;
        if (this._hasProgressGraph) {
            XcalarQueryCancel(this._queryName);
        } else {
            QueryManager.cancelQuery(this._currentTxId);
        }
    }

    public isCanceled(): boolean {
        return this._isCanceled;
    }

    // returns a query string representing all the operations needed to run
    // the dataflow
    // also stores a map of new table names to their corresponding nodes
    // reuseCompletedNodes: boolean if true, will reuse tables/aggregates if they exist
    public getBatchQuery(
        reuseCompletedNodes: boolean = false
    ): XDPromise<{queryStr: string, destTables: string[]}> {
        let nodes: DagNode[] = this._nodes;
        if (!this._synthesizeDFOut) {
            // get rid of link out node to get the correct query and destTable
            nodes = this._nodes.filter((node) => {
                return node.getType() !== DagNodeType.DFOut ||
                node.getSubType() === DagNodeSubType.DFOutOptimized;
            });
        }

        if (reuseCompletedNodes) {
            // the case of linkInWithBatch should reuse aggregate tables
            // instead of creating a duplicate aggregate
            nodes = nodes.filter((node) => {
                if (node instanceof DagNodeAggregate) {
                    const param: DagNodeAggregateInputStruct = node.getParam(true);
                    const agg: AggregateInfo = this.getRuntime().getDagAggService().getAgg(param.dest);
                    return (!agg || agg.value == null);
                } else {
                    return true;
                }
            });
        }

        const deferred: XDDeferred<{queryStr: string, destTables: string[]}> = PromiseHelper.deferred();
        const promises = [];
        const udfContext = this._getUDFContext();
        // chain batchExecute calls while storing their destTable results
        const destTables: string[] = []; // accumulates tables
        let allQueries = []; // accumulates queries
        for (let i = 0; i < nodes.length; i++) {
            promises.push(this._getQueryFromNode.bind(this, udfContext, nodes[i], allQueries, destTables, false));
        }

        PromiseHelper.chain(promises)
        .then(() => {
            nodes.forEach((node) => {
                node.setTable(null); // these table are only fake names
            });
            deferred.resolve({
                queryStr: JSON.stringify(allQueries),
                destTables: destTables
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public restoreExecution(queryName): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarQueryState(queryName)
        .then((queryStateOutput: XcalarApiQueryStateOutputT) => {
            let nodeIdsSet: Set<DagNodeId> = new Set();
            queryStateOutput.queryGraph.node.forEach((queryNode) => {
                // query's tag contains a list of dagNodeIds it's linked to
                let nodeIdCandidates = [];
                try {
                    nodeIdCandidates = JSON.parse(queryNode.comment).graph_node_locator || [];
                } catch (e) {}
                nodeIdCandidates.forEach((nodeInfo) => {
                    if (nodeInfo && nodeInfo.nodeId) {
                        nodeIdsSet.add(nodeInfo.nodeId);
                    }
                });
            });
            const nodeIds: DagNodeId[] = [...nodeIdsSet];
            this._graph.lockGraph(nodeIds, this);
            const txId: number = Transaction.start({
                operation: SQLOps.DataflowExecution,
                trackDataflow: true,
                sql: {operation: SQLOps.DataflowExecution},
                track: true,
                tabId: this._graph.getTabId(),
                nodeIds: nodeIds
            });
            this._currentTxId = txId;
            let queryStr = JSON.stringify(queryStateOutput.queryGraph.node);
            Transaction.startSubQuery(txId, queryName, null, queryStr);
            Transaction.update(txId, queryStateOutput);

            XcalarQueryCheck(queryName, false, txId)
            .then((ret) => {
                const timeElapsed = ret.elapsed.milliseconds;
                Transaction.log(txId, queryStr, undefined, timeElapsed, {
                    queryName: queryName
                });
                Transaction.done(txId, { noLog: true});
                MemoryAlert.Instance.check();
                deferred.resolve();
            })
            .fail((err) => {
                Transaction.fail(txId, {
                    error: err,
                    noAlert: true
                });
                deferred.reject();
            })
            .always(() => {
                this._graph.unlockGraph(nodeIds);
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * go through each node, if it can be executed as part of a query, add to larger query
     * if not, execute previous built up query, execute as a step, then create new query array
     * should have [queryFn, queryFn query], op, [query , query]
     */
    private _getAndExecuteBatchQuery(txId: number, nodes: DagNode[]): XDPromise<{queryStr: string, destTables: string[]}> {
        if (!this._synthesizeDFOut) {
            // get rid of link out node to get the correct query and destTable
            nodes = nodes.filter((node) => {
                return node.getType() !== DagNodeType.DFOut ||
                node.getSubType() === DagNodeSubType.DFOutOptimized;
            });
        }

        const promises = [];
        const udfContext = this._getUDFContext();
        // chain batchExecute calls while storing their destTable results
        let destTables = [];
        let partialQueries: {operation: string, args: any}[] = [];
        let queryPromises = [];
        let partialNodes = [];
        nodes.forEach(node => {
            if (DagGraphExecutor.stepThroughTypes.has(node.getType())) {
                if (queryPromises.length) {
                    promises.push(this._executeQueryPromises.bind(this, txId, queryPromises, partialNodes, destTables, partialQueries));
                    queryPromises = [];
                    partialQueries = [];
                    partialNodes = [];
                    destTables = [];
                }
                promises.push(this._stepExecute.bind(this, txId, node));
            } else {
                partialNodes.push(node);
                queryPromises.push(this._getQueryFromNode.bind(this, udfContext, node, partialQueries, destTables, true));
            }
        });
        if (queryPromises.length) {
            promises.push(this._executeQueryPromises.bind(this, txId, queryPromises, partialNodes, destTables, partialQueries));
        }
        setTimeout(() => {
            // save node running statuses, ok if not saved at correct time
            this._graph.save();
        }, 1000);

        return PromiseHelper.chain(promises);
    }

    // query promises are
    private _executeQueryPromises(txId, queryPromises, nodes, destTables, allQueries) {
        const deferred: XDDeferred<{queryStr: string, destTables: string[]}> = PromiseHelper.deferred();

        PromiseHelper.chain(queryPromises)
        .then(() => {
            let queryStr = JSON.stringify(allQueries);
            if (queryStr === "[]") { // can be empty if link out node
                // don't reset tables, keep the ones that are set
                return PromiseHelper.resolve();
            } else {
                nodes.forEach((node) => {
                    // some nodes that didn't have queries, such as module nodes
                    // with cached references are complete and shouldn't
                    // lose their tables
                    if (node.getState() !== DagNodeState.Complete) {
                        node.setTable(null); // these table are only fake names
                    }
                });
                let queryName = destTables[destTables.length - 1];
                if (queryName.startsWith("DF2_")) {
                    queryName = "table_" + queryName;
                } else {
                    const txLog = Transaction.get(txId);
                    if (txLog && txLog.tabId) {
                        queryName = "table_" + txLog.tabId + queryName;
                    }
                }
                if (!queryName.includes("#t_")) {
                    queryName += "#t_" + Date.now() + "_0";
                }
                return XIApi.query(txId, queryName, queryStr);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getQueryFromNode(udfContext: {
            udfUserName: string;
            udfSessionName: string;
        },
        node: DagNode,
        allQueries: any[],
        destTables: string[],
        forExecution?: boolean
    ): XDPromise<void> {
        const simulateId: number = Transaction.start({
            operation: "Simulate",
            simulate: true,
            tabId: this._graph.getTabId(),
            parentTxId: this._parentTxId,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName,
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._beforeSimulateExecute(node, forExecution)
        .then(() => {
            return this._simulateExecute(simulateId, node, forExecution);
        })
        .then((destTable) => {
            let queryStr: string = Transaction.done(simulateId, {
                noNotification: true,
                noLog: true,
                noCommit: true
            });
            let queries: {operation: string, comment: string}[];
            try {
                if (!queryStr.startsWith("[")) {
                    // when query is not in the form of JSON array
                    if (queryStr.endsWith(",")) {
                        queryStr = queryStr.substring(0, queryStr.length - 1);
                    }
                    queryStr = "[" + queryStr + "]";
                }
                queries = JSON.parse(queryStr);
            } catch (e) {
                return PromiseHelper.reject(e);
            }

            let parentNodeInfos = Transaction.getParentNodeInfos(this._currentTxId);
            queries.forEach((query) => {
                query = xcHelper.addNodeLineageToQueryComment(query, parentNodeInfos, {
                    nodeId: node.getId(),
                    tabId: this._graph.getTabId()
                });
                allQueries.push(query);
            });
            if (destTable != null) {
                this._dagIdToDestTableMap.set(node.getId(), destTable);
            }

            destTables.push(destTable);
            deferred.resolve();
        })
        .fail((err) => {
            Transaction.fail(simulateId, {
                error: err,
                noAlert: true
            });
            deferred.reject(err);
        });
        return deferred.promise();
    }


    // for dfout
    private _stepExecute(
        txId: number,
        node: DagNode
    ): XDPromise<void> | void {
        if (this._isCanceled) {
            return PromiseHelper.reject(DFTStr.Cancel);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tabId: string = this._graph.getTabId();

        let sqlNode: DagNodeSQL;
        if (node instanceof DagNodeSQL && this._sqlNodes) {
            // send copy and original sql node to executor because we
            // may need to modify the original
            sqlNode = this._sqlNodes.get(node.getId());
        } else if (node instanceof DagNodeAggregate) {
            // It was created in this graph so we note it.
            this._addToAggMap(node);
        }

        const dagNodeExecutor: DagNodeExecutor = new DagNodeExecutor(node, txId, tabId, {
            noReplaceParam: false,
            originalSQLNode: sqlNode,
            isBatchExecution: false,
            aggNames: this._internalAggNames,
            isLinkInBatch: this._isLinkInBatch
        });
        this._currentNode = node;
        dagNodeExecutor.run()
        .then((_destTable) => {
            this._currentNode = null;
            if (node.getType() === DagNodeType.IMDTable) {
                return PromiseHelper.convertToJQuery(node.updateStepThroughProgress());
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            return MemoryAlert.Instance.check();
        })
        .then(deferred.resolve)
        .fail((e) => {
            this._currentNode = null;
            deferred.reject(e);
        });

        return deferred.promise();
    }

    public updateProgress(queryNodes: XcalarApiDagNodeT[]) {
        const nodeIdInfos: Map<DagNodeId, Map<string, XcalarApiDagNodeT>> = new Map();
        // GROUP THE QUERY NODES BY THEIR CORRESPONDING DAG NODE
        queryNodes.forEach((queryNodeInfo: XcalarApiDagNodeT) => {
            if (queryNodeInfo["operation"] === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects] ||
                queryNodeInfo.api === XcalarApisT.XcalarApiDeleteObjects) {
                return;
            }
            let tableName: string = queryNodeInfo.name.name;
            let nodeId: DagNodeId = this._getDagNodeIdFromQueryInfo(queryNodeInfo);
            if (!nodeId) {
                return;
            }
            let nodeIdMap: Map<string, XcalarApiDagNodeT> = nodeIdInfos.get(nodeId);
            if (!nodeIdMap) {
                nodeIdMap = new Map();
                nodeIdInfos.set(nodeId, nodeIdMap);
            }
            nodeIdMap.set(tableName, queryNodeInfo);
            queryNodeInfo["index"] = parseInt(queryNodeInfo.dagNodeId);
        });

        for (let [nodeId, queryNodesMap] of nodeIdInfos) {
            // queryNodesMap are those queries belonging to a dagNodeId
            let node: DagNode = this._graph.getNode(nodeId);
            if (node != null) {
                // DO THE ACTUAL PROGRESS UPDATE HERE
                node.updateProgress(queryNodesMap, this._currentNode == null, this._currentNode == null);

                if (node.getState() === DagNodeState.Complete) {
                    let destTable: string;
                    if (this._dagIdToDestTableMap.has(nodeId)) {
                        destTable = this._dagIdToDestTableMap.get(nodeId);
                    } else if (this._isRestoredExecution) {
                        let lastNode;
                        let latestId = -1;
                        // find the last queryNode belonging to a dagNode
                        // that is not a deleteNode and get it's destTable
                        queryNodesMap.forEach((queryNode) => {
                            let curId = parseInt(queryNode.dagNodeId);
                            if (curId > latestId) {
                                latestId = curId;
                                lastNode = queryNode;
                            }
                        });
                        if (lastNode) {
                            destTable = lastNode.name.name;
                        }
                    }

                    if (node instanceof DagNodeAggregate) {
                        this._resolveAggregates(this._currentTxId, node, queryNodesMap.keys().next().value);
                    } else if (node instanceof DagNodeDFIn && !node.hasSource()) {
                        // remove tables created from link in batch except for last
                        try {
                            let nodeAndGraph = node.getLinkedNodeAndGraph();
                            if (nodeAndGraph.node && !nodeAndGraph.node.shouldLinkAfterExecution()) {
                                queryNodesMap.forEach((_queryNode, tableName) => {
                                    if (tableName !== destTable) {
                                        DagUtil.deleteTable(tableName);
                                    }
                                });
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }

                    if (destTable) {
                        node.setTable(destTable, true);
                        DagTblManager.Instance.addTable(destTable);

                        const tabId: string = this._graph.getTabId();
                        const tab: DagTab = DagServiceFactory.getDagListService().getDagTabById(tabId);
                        if (tab != null) {
                            tab.save(true); // save destTable to node
                        }
                    }
                    if (node instanceof DagNodeModule) {
                        node.updateInnerNodeTables();
                    }
                }

                if (node.getState() === DagNodeState.Complete ||
                    node.getState() === DagNodeState.Error) {
                    // log completed nodes so we no longer update them
                    this._finishedNodeIds.add(nodeId);
                    this._dagIdToDestTableMap.delete(nodeId);
                    let nodeInfo = queryNodesMap.values().next().value;
                    if (DagGraphExecutor.hasUDFError(nodeInfo)) {
                        node.setUDFError(nodeInfo.opFailureInfo);
                    }
                }
            }
        }
    }

    private _simulateExecute(
        txId: number,
        node: DagNode,
        forExecution: boolean = false
    ): XDPromise<string> {
        let sqlNode: DagNodeSQL;
        if (node instanceof DagNodeSQL && this._sqlNodes) {
            // send copy and original sql node to executor because we
            // may need to modify the original
            sqlNode = this._sqlNodes.get(node.getId());
        } else if (node instanceof DagNodeAggregate) {
            // It was created in this graph so we note it.
            this._addToAggMap(node);
        }
        const dagNodeExecutor: DagNodeExecutor = this.getRuntime().accessible(
            new DagNodeExecutor(node, txId, this._graph.getTabId(), {
                noReplaceParam: this._isNoReplaceParam,
                originalSQLNode: sqlNode,
                isBatchExecution: forExecution,
                aggNames: this._internalAggNames,
                isLinkInBatch: this._isLinkInBatch
            })
        );
        return dagNodeExecutor.run(this._isOptimized);
    }

    private _checkLinkInResult(node: DagNodeDFIn): {
        hasError: boolean,
        type: DagNodeErrorType,
        node: DagNode
    } {
        let errorResult: {
            hasError: boolean,
            type: DagNodeErrorType,
            node: DagNode
        } = {
            hasError: false,
            type: null,
            node: null
        };
        try {
            const linkOutNodes = this._findRelatedLinkOutNodesInGraph(node);
            const visited: Set<DagNodeId> = new Set();
            linkOutNodes.forEach((linkOutNode) => {
                visited.add(linkOutNode.getId());
            });
            let stack: DagNode[] = [node];
            while (stack.length > 0) {
                const currentNode: DagNode = stack.pop();
                if (currentNode.getType() === DagNodeType.DFOut) {
                    if (visited.has(currentNode.getId())) {
                        errorResult.hasError = true;
                        errorResult.type = DagNodeErrorType.CycleInLink
                        errorResult.node = node;
                        break;
                    }
                } else {
                    stack = stack.concat(currentNode.getChildren());
                }
            }
        } catch (e) {
            errorResult.hasError = true;
            errorResult.type = e.message;
            errorResult.node = node;
        }

        return errorResult;
    }

    private _validateDataset(node: DagNodeDataset): DagNodeErrorType {
        try {
            if (this._isOptimized) {
                // optimized dataflow don't need to do this check
                return null;
            }

            const source: string = node.getDSName();
            if (typeof DS !== "undefined" && !DS.isAccessible(source)
                && node.getSubType() !== DagNodeSubType.Snowflake) {
                return DagNodeErrorType.NoAccessToSource;
            } else {
                return null;
            }
        } catch (e) {
            return e.message;
        }
    }

    /**
     * It's a recusive search to find the linked out nodes that assiciate with
     * the linked in node.
     * If the link out the node is in another graph, search that graph's source
     * to check if it reference any node from current graph.
     * @param node
     */
    private _findRelatedLinkOutNodesInGraph(node: DagNodeDFIn): DagNodeDFOut[] {
        const linkOutNodes: DagNodeDFOut[] = [];
        let stack: DagNodeDFIn[] = [node];

        while (stack.length > 0) {
            const currentNode: DagNodeDFIn = stack.pop();
            const res = currentNode.getLinkedNodeAndGraph();
            let graph: DagGraph = res.graph;
            let dfOutNode: DagNodeDFOut = res.node;
            if (graph === this._graph) {
                linkOutNodes.push(dfOutNode);
            } else {
                const dfInNodes: DagNodeDFIn[] = DagGraph.getFuncInNodesFromDestNodes([dfOutNode], !this._isOptimized);
                stack = stack.concat(dfInNodes);
            }
        }
        return linkOutNodes;
    }

    private _getUDFContext(): {
        udfUserName: string,
        udfSessionName: string
    } {
        return {
            udfUserName: undefined,
            udfSessionName: undefined
        }
    }

    // XXX TODO: make the retinaName arg mandatory and fix the call in DagGraph
    public getRetinaArgs(isDeprecatedCall: boolean): XDPromise<{retina: any}> {
        const deferred: XDDeferred<{retina: any}> = PromiseHelper.deferred();
        const nodeIds: DagNodeId[] = this._nodes.map(node => node.getId());
        const simulateId: number = Transaction.start({
            operation: "Simulate",
            simulate: true
        });

        this._graph.getOptimizedQuery(nodeIds, this._isNoReplaceParam, simulateId)
        .then((ret) => {
            try {
                let { queryStr, destTables } = ret;
                let retinaName = this._getRetinaName(isDeprecatedCall);
                this._queryName = retinaName;
                const retinaParameters = this._getImportRetinaParameters(retinaName, queryStr, destTables);
                if (retinaParameters == null) {
                    deferred.reject('Invalid retina args');
                } else {
                    deferred.resolve(retinaParameters);
                }
            } catch (e) {
                console.error(e);
                deferred.reject(e.message);
            }
            Transaction.done(simulateId, {
                noNotification: true,
                noLog: true,
                noCommit: true
            });
        })
        .fail((e) => {
            Transaction.done(simulateId, {
                noNotification: true,
                noLog: true,
                noCommit: true
            });
            deferred.reject(e);
        });
        return deferred.promise();
    }

    // XXX Currently if we just to create retina here
    // the dest node cannot update from export to synthesize
    // so for a temp better UX, we do execute retina after the creation
    public generateOptimizedDataflow(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // const tabName: string = this._getOptimizedDataflowTabName();

        if (this._isCanceled) {
            deferred.reject(DFTStr.Cancel);
        } else if (this._isOptimized) {
            this.getRetinaArgs(false)
            .then(({ retina }) => {
                if (this._isCanceled) {
                    return PromiseHelper.reject(DFTStr.Cancel);
                }

                return this._createAndExecuteRetina(retina);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    public getGraph(): DagGraph {
        return this._graph;
    }

    public executeRetina(
        dagTab: DagTabOptimized,
        retinaName: string,
        outputTableName: string,
        delayCheck?: number
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        // retina name will be the same as the graph/tab's ID
        const udfContext = this._getUDFContext();

        let txId: number = Transaction.start({
            operation: "Execute optimized plan",
            sql: {
                operation: "Execute optimized plan",
                retName: dagTab.getName()
            },
            track: true,
            udfUserName: udfContext.udfUserName,
            udfSessionName: udfContext.udfSessionName
        });

        this._currentTxId = txId;
        let subGraph: DagSubGraph = dagTab.getGraph();

        XcalarExecuteRetina(retinaName, [], {
            activeSession: this._isOptimizedActiveSession,
            newTableName: outputTableName,
            udfUserName: udfContext.udfUserName || userIdName,
            udfSessionName: udfContext.udfSessionName || sessionName,
            delayCheck: delayCheck
        }, this._currentTxId)
        .then(() => {
            this._optimizedExecuteInProgress = false;
            // get final stats on each node
            dagTab.endStatusCheck()
            .always(() => {
                deferred.resolve(outputTableName);
            });

            Transaction.done(txId, {
                noNotification: true,
                noLog: true,
                noCommit: true
            });
        })
        .fail((error) => {
            if (error &&
                error.status === StatusT.StatusRetinaAlreadyExists
            ) {
                error.error = "The optimized plan already exists\nReset the export/function output operator and re-execute";
            }
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });

            dagTab.endStatusCheck()
            .always(() => {
                deferred.reject(error);
            });
        })
        .always(() => {
            if (subGraph != null) {
                subGraph.stopExecution();
            }
        });

        return deferred.promise();
    }

    // given retinaParameters, we create the retina, then create a tab which
    // becomes focused and checks and updates node progress
    private _createAndExecuteRetina(retinaParameters: {
        destTables: any[],
        retinaName: string,
        retina: string,
        sessionName: string,
        userName: string
    }): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        // retina name will be the same as the graph/tab's ID
        let retinaName: string = retinaParameters.retinaName;
        const tabName: string = this._getOptimizedDataflowTabName();

        let outputTableName: string = DagTabOptimized.getOutputTableName(retinaName);
        if (!this._isOptimizedActiveSession) {
            outputTableName = "";
        }
        this._createRetina(retinaParameters, tabName, outputTableName)
        .then((dagTab) => {
            this._optimizedExecuteInProgress = true;
            return this.executeRetina(dagTab, retinaName, outputTableName);
        })
        .then(() => {
            this._optimizedExecuteInProgress = false;

            if (this._isOptimizedActiveSession) {
                DagTblManager.Instance.addTable(outputTableName);
                if (this._optimizedLinkOutNode.isOptimized()) {
                    this._optimizedLinkOutNode.setTable(outputTableName, true);
                    this._optimizedLinkOutNode.beCompleteState();
                }
            } else if (this._optimizedPublishNode) {
                // do nothing, should only happen in SDK
            } else {
                this._optimizedExportNodes.forEach((node) => {
                    if (node.isOptimized()) {
                        node.beCompleteState();
                    }
                });
            }
            deferred.resolve(outputTableName);
        })
        .fail((error) => {
            if (this._optimizedExecuteInProgress) {
                this._optimizedExecuteInProgress = false;
                let msg = "";
                if (error) {
                    msg = error.error;
                }
                if (this._isOptimizedActiveSession) {
                    this._optimizedLinkOutNode.beErrorState(msg, true);
                } else if (this._optimizedPublishNode) {
                    this._optimizedPublishNode.beErrorState(msg);
                } else {
                    this._optimizedExportNodes.forEach((node) => {
                        node.beErrorState(msg, true);
                    });
                }
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _getOptimizedDataflowTabName() {
        const parentTabId: string = this._graph.getTabId();
        const parentTab: DagTab = DagTabManager.Instance.getTabById(parentTabId);
        let dfOutName: string = this._isOptimizedActiveSession ?
                        this._optimizedLinkOutNode.getParam().name : "export";
        let tabName: string = parentTab.getName() + " " + dfOutName + " optimized plan";
        return tabName;
    }

    private _dedupLoads(operations: any[]): any[] {
        let res = [];
        let dsNameSet: Set<string> = new Set();
        try {
            operations.forEach((op) => {
                let isDup: boolean = false;
                if (op.operation === "XcalarApiBulkLoad") {
                    let dest: string = op.args.dest;
                    if (dsNameSet.has(dest)) {
                        isDup = true;
                    } else {
                        dsNameSet.add(dest);
                    }
                }
                if (!isDup) {
                    res.push(op);
                }
            });
            return res;
        } catch(e) {
            console.error(e);
            return operations;
        }
    }

    private _getImportRetinaParameters(
        retinaName: string,
        queryStr: string,
        destTables: string[]
    ): {
        retina: {
            retinaName: string,
            retina: string,
            userName: string,
            sessionName: string
        },
        publishedMaps?: Map<string, string>
    } {
        let operations;
        try {
            operations = JSON.parse(queryStr);
        } catch(e) {
            console.error(e);
            return null;
        }
        operations = this._dedupLoads(operations);
        let { tables, publishedMaps } = this._getRetinaTableParams(destTables);
        const retina = JSON.stringify({
            tables: tables,
            query: JSON.stringify(operations)
        });
        const udfContext = this._getUDFContext();
        const uName = udfContext.udfUserName || userIdName;
        const sessName = udfContext.udfSessionName || sessionName;
        return {
            retina: {
                retinaName: retinaName,
                retina: retina,
                userName: uName,
                sessionName: sessName
            },
            publishedMaps
        }
    }

    private _getRetinaTableParams(destTables: string[]): {
        tables: {
            name: string
            columns: {
                columnName: string,
                headerAlias: string
            }[]
        }[],
        publishedMaps?: Map<string, string>
    } {
        if (this._optimizedPublishNode) {
            let param: DagNodePublishIMDInputStruct = <DagNodePublishIMDInputStruct>this._optimizedPublishNode.getParam(true);
            let pbName: string = param.pubTableName;
            let relDestTable: string = destTables[destTables.length - 1];
            let columns = param.columns.map((column) => {
                return {
                    columnName: column,
                    headerAlias: column
                }
            });
            // XXX This is hack to include the XcalarRankOver
            if (param.primaryKeys.length === 0) {
                columns.push({
                    columnName: "XcalarRankOver",
                    headerAlias: "XcalarRankOver"
                });
            }

            let tables = [{
                name: relDestTable,
                columns: columns
            }];
            let publishedMaps = new Map();
            publishedMaps.set(relDestTable, pbName);
            return {
                tables,
                publishedMaps
            }
        } else {
            const realDestTables: string[] = [];
            let outNodes: DagNodeOutOptimizable[];
            // create tablename and columns property in retina for each outnode
            if (this._isOptimizedActiveSession) {
                realDestTables.push(destTables[destTables.length - 1]);
                outNodes = <DagNodeOutOptimizable[]>[this._nodes[this._nodes.length - 1]];
            } else {
                outNodes = <DagNodeOutOptimizable[]>this._nodes.filter((node, i) => {
                    if (node.getType() === DagNodeType.Export) {
                        realDestTables.push(destTables[i]);
                        return true;
                    }
                });
            }
            const tables: {
                name: string,
                columns: {
                    columnName: string,
                    headerAlias: string
                }[]
            }[] = outNodes.map((outNode, i) => {
                const destTable: string = realDestTables[i];
                return {
                    name: destTable,
                    columns: outNode.getOutColumns(!this._isNoReplaceParam)
                };
            });
            return {
                tables
            };
        }
    }

    private _createRetina(
        params: {
            retinaName: string,
            retina: string,
            userName: string,
            sessionName: string
        },
        tabName: string,
        outputTableName: string
    ): XDPromise<DagTabOptimized> {
        const deferred: XDDeferred<DagTabOptimized> = PromiseHelper.deferred();
        if (this._isOptimizedActiveSession) {
            this._storeOutputTableNameInNode(outputTableName, params);
        }
        let retinaName: string = params.retinaName;
        XcalarImportRetina(retinaName, true, null, params.retina, params.userName, params.sessionName)
        .then(() => {
            return XcalarGetRetinaJson(retinaName);
        })
        .then((retina) => {
            // remove any existing tab if it exists (tabs can remain open even
            // if the retina was deleted)
            DagTabManager.Instance.removeTab(retinaName);

            // create tab and pass in nodes to store for progress updates
            let tab = DagTabManager.Instance.newOptimizedTab(retinaName,
                                                tabName, retina.query, this);
            deferred.resolve(tab);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected getRuntime(): DagRuntime {
        return DagRuntime.getDefaultRuntime();
    }

    private _beforeSimulateExecute(node: DagNode, forExecution: boolean) {
        if (forExecution) {
            if (node instanceof DagNodeAggregate) {
                return PromiseHelper.alwaysResolve((<DagNodeAggregate>node).resetAgg());
            } else {
                node.beRunningState();
                return PromiseHelper.resolve();
            }
        } else {
            return PromiseHelper.resolve();
        }
    }

    private async _resolveAggregates(txId, node, dstAggName) {
        if (node.getState() !== DagNodeState.Complete) {
            return Promise.resolve();
        }
        if (!dstAggName) {
            return Promise.reject();
        }
        let value;
        try {
            value = await node.fetchAggVal(txId, dstAggName);
        } catch (e) {
            return Promise.resolve();
        }
        if (value) {
            let unwrappedName = node.getParam(true).dest;
            const tableName: string = node.getParents()[0].getTable();
            const aggRes: AggregateInfo = {
                value: value,
                dagName: dstAggName,
                aggName: unwrappedName,
                tableId: tableName,
                backColName: null,
                op: null,
                node: node.getId(),
                graph: this._graph.getTabId()
            };
            try {
                await this.getRuntime().getDagAggService().addAgg(unwrappedName, aggRes);
            } catch (e) {
                return Promise.resolve();
            }
        }
    }

    // for retinas, we store the outputTableName as a comment in the last
    // operator of the retina query so that we can use it later to perform a result
    // set preview
    private _storeOutputTableNameInNode(outputTableName: string, retinaParameters: {
        retinaName: string,
        retina: string,
        sessionName: string,
        userName: string
    }) {
        try {
            // store outputTableName in last operator
            const retinaStruct = JSON.parse(retinaParameters.retina);
            const operators = JSON.parse(retinaStruct.query);
            let lastNode; // get last node that is not a Delete operation
            for (let i = operators.length - 1; i >= 0; i--) {
                lastNode = operators[i];
                if (lastNode.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    break;
                }
            }
            let oldComment = {outputTableName: ""};
            try {
                oldComment = JSON.parse(lastNode.comment);
            } catch (e) {console.error(e)}
            oldComment.outputTableName = outputTableName;
            lastNode.comment = JSON.stringify(oldComment);
            retinaStruct.query = JSON.stringify(operators);
            retinaParameters.retina = JSON.stringify(retinaStruct);
        } catch (e) {
            // ok to fail
        }
    }

    private _getRetinaName(isDeprecatedCall: boolean): string {
        let parentTabId: string = this._graph.getTabId();
        let outNodeId: DagNodeId = this._getOptimizedNodeId();

        return isDeprecatedCall
        ? DagTabOptimized.getId_deprecated(parentTabId, outNodeId)
        : DagTabOptimized.getId(parentTabId, outNodeId);
    }

    private _getOptimizedNodeId(): DagNodeId {
        let outNodeId: DagNodeId;
        if (this._optimizedPublishNode) {
            // should only happen in SDK
            outNodeId = this._optimizedPublishNode.getId();
        } else if (this._isOptimizedActiveSession) {
            outNodeId = this._optimizedLinkOutNode.getId();
        } else {
            // XXX arbitrarily storing retina in the last export nodes
            outNodeId = this._optimizedExportNodes[this._optimizedExportNodes.length - 1].getId();
        }
        return outNodeId;
    }

    // Looks at query's tag for list of dagNodeIds it belongs to. Then checks
    // to see if the graph has that node id.
    private _getDagNodeIdFromQueryInfo(queryNodeInfo: XcalarApiDagNodeT): DagNodeId {
        let nodeCandidates: DagTagInfo[] = [];
        try {
            nodeCandidates = JSON.parse(queryNodeInfo.comment).graph_node_locator || [];
            let nodeId: DagNodeId;
            for (let i = 0; i < nodeCandidates.length; i++) {
                nodeId = nodeCandidates[i].nodeId;
                if (this._graph.hasNode(nodeId)) {
                    if (this._finishedNodeIds.has(nodeId)) {
                        return null;
                    } else {
                        return nodeId;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }

        return null;
    }

    // Agg was created in this graph so we note it.
    private _addToAggMap(node: DagNodeAggregate) {
        let aggName = node.getParam().dest;
        let renamedAggName = aggName;
        if (renamedAggName.startsWith(gAggVarPrefix)) {
            renamedAggName = aggName.slice(1);
        }
        renamedAggName = gAggVarPrefix + renamedAggName + Authentication.getHashId();
        this._internalAggNames.set(aggName, renamedAggName);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagGraphExecutor = DagGraphExecutor;
};