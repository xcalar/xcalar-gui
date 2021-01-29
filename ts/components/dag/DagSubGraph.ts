class DagSubGraph extends DagGraph {
    private startTime: number;
    protected _tableNameToDagIdMap;
    protected _dagIdToTableNamesMap;// id to tableName map stores all the tables related to the dag node
    // in topological order
    private isComplete: boolean = false;
    private elapsedTime: number;
    private state;

    public constructor(tableNameToDagIdMap?, dagIdToTableNamesMap?) {
        super();
        this.startTime = Date.now();
        this._tableNameToDagIdMap = tableNameToDagIdMap;
        this._dagIdToTableNamesMap = dagIdToTableNamesMap;
    }
    /**
     * Get the JSON representing the graph(without all the ids), for copying a graph
     */
    public getGraphCopyInfo(): DagGraphInfo {
        return this._getGraphJSON(true);
    }

    /**
     * Get the JSON representing the graph, for cloning/serializing a graph
     */
    public getGraphInfo(): DagGraphInfo {
        return this._getGraphJSON(false);
    }

    public getState() {
        return this.state;
    }

    /**
     * Initialize the graph from JSON
     * @param graphInfo
     * @description This method supports both JSON w/ or w/o ids
     */
    public initFromJSON(graphInfo: DagGraphInfo): Map<string, DagNodeId> {
        if (graphInfo == null) {
            return null;
        }

        // Create & Add dag nodes
        const connections: NodeConnection[] = [];
        const nodeIdMap = new Map<string, DagNodeId>();
        graphInfo.nodes.forEach((nodeInfo) => {
            // Create dag node
            const node = DagNodeFactory.create(nodeInfo, this.getRuntime());
            if (this._isNodeCopyInfo(nodeInfo)) {
                nodeIdMap.set(nodeInfo.nodeId, node.getId());
            }
            // Figure out connections
            const childId = node.getId();
            nodeInfo['parents'].forEach((parentId: DagNodeId, i) => {
                connections.push({
                    parentId: parentId, childId: childId, pos: i
                });
            });
            // Add node to graph
            this.addNode(node);
        })

        // Update the node ids in the connection
        let newConnections: NodeConnection[] = [];
        if (nodeIdMap.size > 0) {
            for (const oldConnection of connections) {
                newConnections.push({
                    parentId: nodeIdMap.has(oldConnection.parentId)
                        ? nodeIdMap.get(oldConnection.parentId)
                        : oldConnection.parentId,
                    childId: nodeIdMap.has(oldConnection.childId)
                        ? nodeIdMap.get(oldConnection.childId)
                        : oldConnection.childId,
                    pos: oldConnection.pos
                });
            }
        } else {
            newConnections = connections;
        }

        // Cleanup the connections whose node is not in the graph
        for (const connection of newConnections) {
            if (!this.hasNode(connection.parentId)) {
                connection.parentId = null;
            }
            if (!this.hasNode(connection.childId)) {
                connection.childId = null;
            }
        }

        // restore edges
        this.restoreConnections(newConnections);

        // XXX TODO: create comments

        // Set graph dimensions
        this.setDimensions(graphInfo.display.width, graphInfo.display.height);

        return nodeIdMap;
    }

    public setTableDagIdMap(tableNameToDagIdMap) {
        this._tableNameToDagIdMap = tableNameToDagIdMap;
    }

    public getTableDagIdMap() {
        return this._tableNameToDagIdMap;
    }

    public setDagIdToTableNamesMap(dagIdToTableNamesMap) {
        this._dagIdToTableNamesMap = dagIdToTableNamesMap;
    }

    // should be called right before the xcalarQuery gets executed
    // sets the nodes to be in running state
    public startExecution(queryNodes, executor: DagGraphExecutor): void {
        this.currentExecutor = executor;
        this.startTime = Date.now();
        queryNodes.forEach((queryNode) => {
            let args;
            if (queryNode.args) {
                args = queryNode.args;
            } else {
                args = xcHelper.getXcalarInputFromNode(queryNode);
            }
            if (queryNode.operation !== XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects] &&
                queryNode.api !== XcalarApisT.XcalarApiDeleteObjects) {
                let tableName = args.dest;
                if ((queryNode.operation === XcalarApisTStr[XcalarApisT.XcalarApiAggregate] ||
                    queryNode.api === XcalarApisT.XcalarApiAggregate) &&
                    !tableName.startsWith(gAggVarPrefix)) {
                    tableName = gAggVarPrefix + tableName;
                }
                let nodeId: DagNodeId = this._tableNameToDagIdMap[tableName];
                let node: DagNode = this.getNode(nodeId);
                if (node != null) { // could be a drop table node
                    node.beRunningState();
                }
            }
        });
    }

    public stopExecution(): void {
        this.currentExecutor = null;
    }

    /**
     * Should be called after _tableNameToDagIdMap is set but
     * before xcalarQuery gets executed.
     * Loop through all tables, update all tables in the node ids
     * then loop through all the tables
     */
    public initializeProgress(): void {
        const nodeIdToTableNamesMap = new Map();

        for (let tableName in this._tableNameToDagIdMap) {
            const nodeId = this._tableNameToDagIdMap[tableName];
            if (!nodeIdToTableNamesMap.has(nodeId)) {
                nodeIdToTableNamesMap.set(nodeId, [])
            }
            const nodeTableNames: string[] = nodeIdToTableNamesMap.get(nodeId);
            nodeTableNames.push(tableName);
        }
        nodeIdToTableNamesMap.forEach((tableNames, nodeId) => {
            let node: DagNode = this.getNode(nodeId);
            if (node != null) {
                node.initializeProgress(tableNames);
            }
        });
    }


    // /**
    //  *
    //  * @param nodeInfos queryState info
    // */
    // only being used for optimized / abandoned dataflows
    public updateSubGraphProgress(
        queryNodeInfos: XcalarApiDagNodeT[],
        storeTablesToNode: boolean
    ): void {
        const nodeIdInfos: Map<DagNodeId, Map<string, XcalarApiDagNodeT>>  = new Map();

        queryNodeInfos.forEach((queryNodeInfo: XcalarApiDagNodeT) => {
            let tableName: string = queryNodeInfo.name.name;
            let nodeId = this._tableNameToDagIdMap[tableName];

            // optimized datasets name gets prefixed with xcalarlrq and an id
            // so we strip this to find the corresponding UI dataset name
            if (!nodeId && queryNodeInfo.api === XcalarApisT.XcalarApiBulkLoad &&
                tableName.startsWith(".XcalarLRQ.") &&
                tableName.indexOf(gDSPrefix) > -1) {
                tableName = tableName.slice(tableName.indexOf(gDSPrefix));
                nodeId = this._tableNameToDagIdMap[tableName];
            } else if (queryNodeInfo.api === XcalarApisT.XcalarApiAggregate &&
                !tableName.startsWith(gAggVarPrefix)) {
                tableName = gAggVarPrefix + tableName;
                nodeId = this._tableNameToDagIdMap[tableName];
            }

            if (!nodeId) {// could be a drop table node
                return;
            }
            let nodeIdMap: Map<string, XcalarApiDagNodeT> = nodeIdInfos.get(nodeId);
            if (!nodeIdMap) {
                nodeIdMap = new Map();
                nodeIdInfos.set(nodeId, nodeIdMap);
            }
            nodeIdMap.set(tableName, queryNodeInfo);
            // _dagIdToTableNamesMap has operations in the correct order
            queryNodeInfo["index"] = this._dagIdToTableNamesMap[nodeId].indexOf(tableName);
        });

        for (let [nodeId, queryNodesMap] of nodeIdInfos) {
            let node: DagNode = this.getNode(nodeId);
            if (node != null) {
                node.updateProgress(queryNodesMap, true, true);

                if (node.getState() === DagNodeState.Complete) {
                    if (storeTablesToNode) {
                        let destTable: string = this._dagIdToTableNamesMap[nodeId][this._dagIdToTableNamesMap[nodeId].length - 1];
                        if (destTable) {
                            node.setTable(destTable, true);
                        }
                    } else if (node.getChildren().length === 0 && node instanceof DagNodeSynthesize) {
                        // look for the last synthesize node. It's parent node
                        // should store the outputTableName in a comment
                        let parentNode = node.getParents()[0];
                        let parentId = parentNode.getId();
                        let tableNames = this._dagIdToTableNamesMap[parentId]
                        let targetTable = tableNames[tableNames.length - 1];
                        let nodeInfo = nodeIdInfos.get(parentId)[targetTable];
                        let destTable: string;
                        try {
                            destTable = JSON.parse(nodeInfo.comment).outputTableName;
                        } catch (e) {
                            // do nothing
                        }
                        if (destTable) {
                            node.setTable(destTable, true);
                        }
                    }
                }
                if (node.getState() === DagNodeState.Complete ||
                    node.getState() === DagNodeState.Error) {
                    let nodeInfo = queryNodesMap.values().next().value;
                    if (DagGraphExecutor.hasUDFError(nodeInfo)) {
                        node.setUDFError(nodeInfo.opFailureInfo);
                    }
                }
            }
        }
    }


    public getElapsedTime(): number {
        if (this.isComplete) {
            return this.elapsedTime;
        } else {
            return Date.now() - this.startTime;
        }
    }

    public endProgress(state, time) {
        this.elapsedTime = time;
        this.isComplete = true;
        this.state = state;
    }

    // used for sql sub graph to ensure that left and right rename properties
    // of the join nodes have columns declared so that when executed in
    // optimized mode, they're not automatically dropped
    public keepAllJoinColumns() {
        const joinNodes = this.getNodesByType(DagNodeType.Join);
        joinNodes.forEach((joinNode: DagNodeJoin) => {
            let leftParentNode = joinNode.getParents()[0];
            let rightParentNode = joinNode.getParents()[1];

            let params = joinNode.getParam();
            let keepAllColumns = params.keepAllColumns;
            if (keepAllColumns == null) {
                keepAllColumns = true;
            }
            if (leftParentNode) {
                const leftColNamesToKeep = keepAllColumns
                    ? leftParentNode.getLineage()
                        .getColumns(false, true).map((col) => col.getBackColName())
                    : params.left.keepColumns;
                const leftRename  = DagNodeJoin.joinRenameConverter(leftColNamesToKeep, params.left.rename, true);
                params.left.rename = leftRename;
            }

            if (rightParentNode) {
               const rightColNamesToKeep = keepAllColumns
                ? rightParentNode.getLineage()
                    .getColumns(false, true).map((col) => col.getBackColName())
                : params.right.keepColumns;
                const rightRename  = DagNodeJoin.joinRenameConverter(rightColNamesToKeep, params.right.rename, true);
                params.right.rename = rightRename;
            }

            joinNode.setParam({
                joinType: params.joinType,
                left: params.left,
                right: params.right,
                evalString: params.evalString,
                nullSafe: params.nullSafe,
                keepAllColumns: params.keepAllColumns
            }, true);
        });
    }

    // when sql tableNames are changed, change the node description as well
    public updateNodeDescriptions(newTableMap) {
        this.getAllNodes().forEach((node: DagNode) => {
            let desc = node.getDescription();
            try {
                let newDesc = desc;
                for (let oldTableName in newTableMap) {
                    let re = new RegExp(oldTableName, "g");
                    newDesc = newDesc.replace(re, newTableMap[oldTableName]);
                }
                node.setDescription(newDesc, true);
            } catch (e) {
                // ignore
            }
        });
    }

    private _getGraphJSON(
        isCopyInfo: boolean = false
    ): DagGraphInfo {
        const nodes: DagNodeInfo[] = [];
        this.getAllNodes().forEach((node: DagNode, _key: DagNodeId) => {
            nodes.push(isCopyInfo ? node.getNodeCopyInfo() : node.getNodeInfo());
        });
        // XXX TODO: comment.getInfo()
        return {
            nodes: nodes,
            comments: [],
            display: this.getDimensions(),
            operationTime: this.operationTime
        };
    }

    private _isNodeCopyInfo(nodeInfo: DagNodeInfo): nodeInfo is DagNodeCopyInfo {
        return (nodeInfo.id == null);
    }

}

if (typeof exports !== 'undefined') {
    exports.DagSubGraph = DagSubGraph;
}