class DagQueryConverter {
    static readonly globalKVDatasetPrefix = "/globalKvsDataset/";
    static readonly workbookKVPrefix = "/workbookKvs/";
    static readonly gridSpacing = 20;
    static readonly horzNodeSpacing = 160;// spacing between nodes when auto-aligning
    static readonly vertNodeSpacing = 80;

    static idCount = 0; // used to give ids to dataflow nodes
    static dataflowCount = 0;
    private currentDataflowId; // if retina, will use this dataflowId - we'll create it
    // at the start so linkedIn nodes can point to it from the start
    private currentUserName = "";
    private originalInput;
    private destSrcMap = {};
    private dagIdParentMap = {}; // {DagNodeId: [{index(parentIdx): ..., srcId(sourceId)}], ...}
    private tableNewDagIdMap = {}; // {oldTableName: newDagId}
    private dagIdToTableNamesMap = {}; // {newDagId: [oldTableName1, oldTableName2]} stores the topological order of the tables per dagNode
    private outputDagId: string;
    private isUpgrade: boolean;
    private globalState: DagNodeState; // state to give dag nodes
    private tableSrcMap;
    private finalTableName;
    private upgradeResult;
    private convertResult;

    constructor(dataflowInfo, isUpgrade?: boolean, globalState?: DagNodeState, tableSrcMap?, finalTableName?: string) {
        this.isUpgrade = isUpgrade;
        this.globalState = globalState;
        this.tableSrcMap = tableSrcMap;
        this.finalTableName = finalTableName;

        if (isUpgrade) {
            this.upgradeResult = this._upgradeQuery(dataflowInfo);
        } else {
            this.convertResult = this._convertHelper(dataflowInfo);
        }
    }

    public getResult() {
        if (this.isUpgrade) {
            return this.upgradeResult;
        } else {
            return this.convertResult;
        }
    }

    public static convertStats(nodes) {
        let queryNodes = nodes.map((node) => {
            // let inputName = xcHelper.getXcalarInputNameFromApiString(node.operater_name);
            // let input = JSON.parse(node.input_parameters)[inputName];
            let numRowsPerNode = node.rows_per_node_in_cluster.split(":");
            numRowsPerNode = numRowsPerNode.map(rows => parseInt(rows));
            let numRowsTotal = numRowsPerNode.reduce((total, curr) => {
                return total + curr;
            });
            let queryNode = {
                // operation: node.operator_name,
                name: {name: node.node_name},
                api: XcalarApisT[node.operator_name],
                input: JSON.parse(node.input_parameters),
                comment: node.user_comment,
                tag: "",
                numNodes: node.total_node_count_in_cluster,
                numWorkCompleted: numRowsTotal,
                numWorkTotal: numRowsTotal,
                numRowsTotal: numRowsTotal,
                numRowsPerNode: numRowsPerNode,
                state: DgDagStateT[node.operator_state],
                status: StatusT[node.operator_status],
                elapsed: {milliseconds: node.node_time_elapsed_millisecs}
            }
            return queryNode;
        });
        return queryNodes;
    }

    private _upgradeQuery(dataflowInfo, nestedPrefix?, nodes?) {
        try {
            return this._convertHelper(dataflowInfo, nestedPrefix, nodes);
        } catch (e) {
            let isRetina = false;
            if (this.isUpgrade && dataflowInfo && typeof dataflowInfo === "object" &&
                dataflowInfo.workbookVersion == null && (!dataflowInfo.header || dataflowInfo.header.workbookVersion == null)) {
                isRetina = true;
            }
            console.error(e);
            return this._getFailedDataflowRet("Error: " + xcHelper.parseJSONError(e).error, isRetina);
        }
    }

    public convertToSubGraph(optimizedGraph?: boolean, oldGraph?: DagOptimizedGraph): DagSubGraph {
        const nameIdMap = {};
        const idToNamesMap = {};
        const retStruct = this.getResult();

        const nodeJsons = retStruct.dagInfoList;
        const nodeInfos = [];
        nodeJsons.forEach((nodeJson) => {
            idToNamesMap[nodeJson.id] = [];
            nameIdMap[nodeJson.table] = nodeJson.id;
            if (nodeJson.subGraphNodes) {
                // map the index nodes to the containing dagNodeId
                nodeJson.subGraphNodes.forEach((subGraphNodeJson) => {
                    nameIdMap[subGraphNodeJson.table] = nodeJson.id;
                    idToNamesMap[nodeJson.id].push(subGraphNodeJson.table);
                });
            }

            idToNamesMap[nodeJson.id].push(nodeJson.table);
            nodeInfos.push({
                node: DagNodeFactory.create(nodeJson),
                parents: nodeJson.parents
            });
        });
        const comments: CommentInfo[] = [];
        const graphInfo = {
            comments: comments,
            display: <Dimensions>{scale: 1},
            nodes: nodeInfos,
            operationTime: null
        };
        let graph: DagSubGraph | DagOptimizedGraph;
        if (oldGraph) {
            graph = oldGraph;
        } else if (optimizedGraph) {
            graph = new DagOptimizedGraph();
        } else {
            graph = new DagSubGraph();
        }
        graph.setTableDagIdMap(retStruct.tableNewDagIdMap);
        graph.setDagIdToTableNamesMap(retStruct.dagIdToTableNamesMap);
        graph.rebuildGraph(graphInfo);
        return graph;
    }

    /**
     *
     * @param globalState optional state to assign to all nodes
     * @param tableSrcMap
     * @param finalTableName
     */


    private _convertHelper(dataflowInfo, nestedPrefix?, otherNodes?) {
        if (!nestedPrefix) {
            this.currentDataflowId = "DF2_" + new Date().getTime() + "_" + DagQueryConverter.dataflowCount++;
        }
        const nodes = new Map();
        const datasets = [];
        try {
            if (typeof dataflowInfo === "string") {
                dataflowInfo = JSON.parse(dataflowInfo);
            }
        } catch (e) {
            return this._getFailedDataflowRet("Cannot parse plan: " + JSON.stringify(dataflowInfo));
        }
        if (typeof dataflowInfo !== "object" || dataflowInfo == null || (dataflowInfo instanceof Array)) {
            return this._getFailedDataflowRet("Invalid plan structure: " + JSON.stringify(dataflowInfo));
        }
        this._modifyOriginalInput(dataflowInfo);
        if (!nestedPrefix) {
            this.originalInput = xcHelper.deepCopy(dataflowInfo);
        }

        // check for header indicating if the dataflow
        // is a regular workbook dataflow or retina dataflow
        let isRetina = false;
        if (this.isUpgrade && dataflowInfo.workbookVersion == null && (!dataflowInfo.header || dataflowInfo.header.workbookVersion == null)) {
            isRetina = true;
        }
        let isChainedRetina = false;
        let query = dataflowInfo.query;
        let sourcePrefix = "";
        let udfPrefix = "";
        if (nestedPrefix) {
            sourcePrefix = nestedPrefix + ":";
            udfPrefix = nestedPrefix + "-";
        }
        let hasTableInfo = (!nestedPrefix && !isRetina && dataflowInfo["gInfo-1"] &&
                            dataflowInfo["gInfo-1"].worksheets && dataflowInfo["gInfo-1"].TILookup);
        let tables = {};
        if (hasTableInfo) {
            // loop through worksheets and add tables with worksheet name
            // these tables will have an "active" styling
            for (let i in dataflowInfo["gInfo-1"].worksheets.wsInfos) {
                let ws = dataflowInfo["gInfo-1"].worksheets.wsInfos[i];
                ws.tables.forEach((tId) => {
                    if (dataflowInfo["gInfo-1"].TILookup[tId]) {
                        tables[tId] = {
                            worksheet: ws.name
                        }
                    }
                });
            }
        }

        for (let i = 0; i < query.length; i++) {
            let rawNode = query[i];
            let args;
            let api: number;
            if (rawNode.args) {
                args = rawNode.args;
                api = XcalarApisTFromStr[rawNode.operation];
            } else {
                args = xcHelper.getXcalarInputFromNode(rawNode);
                api = rawNode.api;
            }
            if (!args) {
                continue;
            }

            let name = sourcePrefix + args.dest;
            // name gets renamed and prefixed in the switch statement
            const node: {
                name: string,
                parents: any[],
                children: any[],
                rawNode: any,
                args: any,
                api: number,
                indexedFields: string[],
                isActive?: boolean,
                worksheet?: string,
                aggregates?: string[],
                xcQueryString?: string
            } = {
                name: name,
                parents: [],
                children: [],
                rawNode: rawNode,
                args: args,
                api: api,
                indexedFields: []
            };

            if (hasTableInfo) {
                // this is the first layer of the workbook
                const tId = xcHelper.getTableId(args.dest);
                if (tId != null && tables[tId]) {
                    node.isActive = true;
                    node.worksheet = tables[tId].worksheet;
                }
            }

            // set up the parents and prefix the parent names if we're inside
            // an executeRetina
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                    if (args.source.startsWith(gDSPrefix)) {
                        if (this.currentUserName && nestedPrefix) {
                            // if we're in a nested executeRetina node, replace the
                            // old user name in the dataset with the proper user name
                            let oldParsedDSName = xcHelper.parseDSName(args.source);
                            let prevUserName = oldParsedDSName.user;
                            let re = new RegExp(prevUserName);
                            args.source = args.source.replace(re, this.currentUserName);
                        }
                        args.source = gDSPrefix + sourcePrefix + args.source.slice(gDSPrefix.length);
                    } else {
                        args.source = sourcePrefix + args.source;
                    }
                    node.parents = [args.source];
                    break;
                case (XcalarApisT.XcalarApiProject):
                case (XcalarApisT.XcalarApiGetRowNum):
                case (XcalarApisT.XcalarApiExport):
                case (XcalarApisT.XcalarApiAggregate):
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiMap):
                case (XcalarApisT.XcalarApiGroupBy):
                    args.source = sourcePrefix + args.source;
                    node.parents = [args.source];
                    break;
                case (XcalarApisT.XcalarApiSynthesize):
                    // sometimes the synthesize node will point to itself for it's
                    // source
                    if (args.source === args.dest) {
                        if (query[i - 1] && query[i - 1].args) {
                            args.source = query[i - 1].args.dest;
                        } else {
                            args.source = "noSource" + Date.now() + Math.floor(Math.random() * 10000);
                        }
                    }
                    if (args.source) {
                        args.source = sourcePrefix + args.source;
                        node.parents = [args.source];
                    } else {
                        node.parents = [];
                    }
                    break;
                case (XcalarApisT.XcalarApiJoin):
                case (XcalarApisT.XcalarApiUnion):
                    args.source = args.source.map((source) => {
                        return sourcePrefix + source;
                    });
                    node.parents = xcHelper.deepCopy(args.source);
                    break;
                case (XcalarApisT.XcalarApiSelect):
                case (XcalarApisT.XcalarApiExecuteRetina):
                case (XcalarApisT.XcalarApiBulkLoad):
                    node.parents = [];
                    break;
                default:
                    break;
            }

            // prefix udfs and aggregates in eval strings
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                case (XcalarApisT.XcalarApiProject):
                case (XcalarApisT.XcalarApiGetRowNum):
                case (XcalarApisT.XcalarApiExport):
                case (XcalarApisT.XcalarApiSynthesize):
                case (XcalarApisT.XcalarApiUnion):
                case (XcalarApisT.XcalarApiExecuteRetina):
                case (XcalarApisT.XcalarApiBulkLoad):
                    break;
                case (XcalarApisT.XcalarApiSelect):
                    if (node.args.filterString) {
                        node.args.filterString = this._substitutePrefixInEval(node.args.filterString, udfPrefix);
                    } else if (node.args.evalString) {
                        node.args.evalString = this._substitutePrefixInEval(node.args.evalString, udfPrefix);
                    }
                    break;
                case (XcalarApisT.XcalarApiGroupBy):
                case (XcalarApisT.XcalarApiAggregate):
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiMap):
                    node.args.eval.forEach((evalStruct) => {
                        evalStruct.evalString = this._substitutePrefixInEval(evalStruct.evalString, udfPrefix)
                    });
                    break;
                case (XcalarApisT.XcalarApiJoin):
                    node.args.evalString = this._substitutePrefixInEval(node.args.evalString, udfPrefix)
                    break;
                default:
                    break;
            }

            let isIgnoredApi = false;
            // set up the dest and aggregates and prefix if needed
            switch (node.api) {
                case (XcalarApisT.XcalarApiIndex):
                case (XcalarApisT.XcalarApiProject):
                case (XcalarApisT.XcalarApiGetRowNum):
                case (XcalarApisT.XcalarApiExport):
                case (XcalarApisT.XcalarApiUnion):
                case (XcalarApisT.XcalarApiSelect):
                case (XcalarApisT.XcalarApiSynthesize):
                case (XcalarApisT.XcalarApiExecuteRetina):
                    args.dest = sourcePrefix + args.dest;
                    break;
                case (XcalarApisT.XcalarApiAggregate):
                    args.dest = gAggVarPrefix + udfPrefix + args.dest;
                    node.aggregates = this._getAggsFromEvalStrs(args.eval);
                    break;
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiMap):
                case (XcalarApisT.XcalarApiGroupBy):
                    args.dest = sourcePrefix + args.dest;
                    node.aggregates = this._getAggsFromEvalStrs(args.eval);
                    break;
                case (XcalarApisT.XcalarApiJoin):
                    args.dest = sourcePrefix + args.dest;
                    node.aggregates = this._getAggsFromEvalStrs([args]);
                    break;
                case (XcalarApisT.XcalarApiBulkLoad):
                    if (!this.currentUserName && !nestedPrefix) {
                        let parsedDsName = xcHelper.parseDSName(args.dest);
                        this.currentUserName = parsedDsName.user;
                    } else if (this.currentUserName && nestedPrefix) {
                        // if we're in a nested executeRetina node, replace the
                        // old user name in the dataset with the proper user name
                        let oldParsedDSName =  xcHelper.parseDSName(args.dest);
                        let prevUserName = oldParsedDSName.user;
                        let re = new RegExp(prevUserName);
                        args.dest = args.dest.replace(re, this.currentUserName);
                    }

                    if (args.dest.startsWith(gDSPrefix)) {
                        args.dest = gDSPrefix + sourcePrefix + args.dest.slice(gDSPrefix.length);
                    } else {
                        args.dest = sourcePrefix + args.dest;
                    }
                    if (args.sourceType === "Snowflake") {
                        xcAssert(i + 2 < query.length);
                        xcAssert(query[i + 1].operation === "XcalarApiSynthesize");
                        xcAssert(query[i + 2].operation === "XcalarApiDeleteObjects");
                        node.xcQueryString = JSON.stringify([query[i], query[i + 1], query[i + 2]]);
                        node.name = query[i + 1].args.dest;
                        i += 2;
                    }
                    let datasetBeforeXDChange = xcHelper.deepCopy(rawNode);
                    args.loadArgs = this._updateLoadArgsForXD(args);
                    datasets.push(datasetBeforeXDChange);
                    break;
                default:
                    isIgnoredApi = true;
                    break;
            }
            if (nestedPrefix && node.api === XcalarApisT.XcalarApiSynthesize &&
                args.sameSession === false) {
                isChainedRetina = true;
            }

            if (args.sourceType !== "Snowflake") {
                node.name = args.dest; // reset name because we've prefixed it
            }
            if (!isIgnoredApi) {
                nodes.set(node.name, node);
            }
        }

        for (let [_name, node] of nodes) {
            this._setParents(node, nodes, otherNodes);
        }

        for (let [_name, node] of nodes) {
            this._setIndexedFields(node);
        }

        for (let [_name, node] of nodes) {
            this._collapseIndexNodes(node);
        }

        if (this.isUpgrade) {
            return this._formUpgradeDataflows(nodes, datasets, isRetina, nestedPrefix, isChainedRetina);
        } else {
            return {
                dagInfoList: this._finalConvertIntoDagNodeInfoArray(nodes),
                dagIdParentMap: this.dagIdParentMap,
                outputDagId: this.outputDagId,
                tableNewDagIdMap: this.tableNewDagIdMap,
                dagIdToTableNamesMap: this.dagIdToTableNamesMap
            }
        }
    }

    private _formUpgradeDataflows(nodes, datasets, isRetina, nestedPrefix, isChainedRetina) {
        const dataflows = [];
        const dataflowsList = [];
        let treeGroups = {};
        let seen = {};
        let nodeCount = 0;
        // group nodes into separate trees
        for (let [_name, node] of nodes) {
            if (node.children.length === 0) {
                this._splitIntoTrees(node, seen, treeGroups, nodeCount);
            }
            nodeCount++;
        }

        let allDagNodeInfos = {};
        let inactiveDagNodeInfos = {};
        for (let i in treeGroups) {
            const group = treeGroups[i];
            const endNodes = [];
            for (let j in group) {
                const node = group[j];
                if (node.children.length === 0) {
                    endNodes.push(node);
                }
            }

            const dagNodeInfos = {};
            endNodes.forEach(node => {
                this._recursiveGetDagNodeInfoForUpgrade(node, nodes, dagNodeInfos, isRetina, nestedPrefix);
            });
            let hasActiveNodeInTree = false;
            if (!isRetina && !nestedPrefix) {
                for (var j in dagNodeInfos) {
                    const node = dagNodeInfos[j];
                    if (node.isActive) {
                        hasActiveNodeInTree = true;
                        break;
                    }
                }
            }

            if (!isRetina && !nestedPrefix && !hasActiveNodeInTree) {
                inactiveDagNodeInfos = $.extend(inactiveDagNodeInfos, dagNodeInfos);
            } else {
                allDagNodeInfos = $.extend(allDagNodeInfos, dagNodeInfos);
            }
        }
        if (nestedPrefix) {
            return {
                nodes: allDagNodeInfos,
                isChainedRetina: isChainedRetina
            }
        } else {
            const graphDimensions = this._setPositions(allDagNodeInfos);
            const nodes = [];
            const comments = [];
            for (var j in allDagNodeInfos) {
                const node = allDagNodeInfos[j];
                node.parents = node.parentIds;
                // should not persist .parentIds and .children
                delete node.parentIds;
                delete node.children;
                nodes.push(node);
                if (node.isActive) {
                    let comment: CommentInfo = {
                        "id": CommentNode.generateId(),
                        "display": {
                            "x": node.display.x - 40,
                            "y": node.display.y - 40,
                            "width": 180,
                            "height": 60
                        },
                        "text": "Active in worksheet: " + node.worksheet
                    };
                    comment["nodeId"] = comment.id;
                    comments.push(comment);
                    delete node.isActive;
                    delete node.worksheet;
                }
            }
            let name;
            if (isRetina) {
                name = xcHelper.randName(".temp/rand") + "/" + "Module " + DagQueryConverter.dataflowCount;
            } else {
                name = "Module " + DagQueryConverter.dataflowCount;
                dataflowsList.push({
                    name: name,
                    id: this.currentDataflowId,
                    createdTime: Date.now()
                });
            }

            const dataflow = {
                id: this.currentDataflowId,
                name: name,
                dag: {
                    "nodes": nodes,
                    "comments": comments,
                    "display": {
                        "width": graphDimensions.maxX,
                        "height": graphDimensions.maxY,
                        "scale": 1
                    }
                },
                autosave: false
            }
            if (!isRetina) {
                dataflow.autosave = true;
            }

            dataflows.push(dataflow);

            // graphs that contain only inactive tables
            if (!$.isEmptyObject(inactiveDagNodeInfos)) {
                const graphDimensions = this._setPositions(inactiveDagNodeInfos);
                const nodes = [];
                for (var j in inactiveDagNodeInfos) {
                    const node = inactiveDagNodeInfos[j];
                    node.parents = node.parentIds;
                    // should not persist .parentIds and .children
                    delete node.parentIds;
                    delete node.children;
                    nodes.push(node);
                }
                let name = "Inactive Nodes";
                dataflowsList.push({
                    name: name,
                    id: this.currentDataflowId + "_0",
                    createdTime: Date.now()
                });

                const dataflow = {
                    id: this.currentDataflowId + "_0",
                    name: name,
                    dag: {
                        "nodes": nodes,
                        "comments": [],
                        "display": {
                            "width": graphDimensions.maxX,
                            "height": graphDimensions.maxY,
                            "scale": 1
                        }
                    },
                    autosave: true
                }
                dataflows.push(dataflow);
            }
        }

        return this._createKVStoreKeys(dataflows, dataflowsList, datasets, isRetina);
    }

    private _finalConvertIntoDagNodeInfoArray(nodes) {
        const finalNodeInfos = [];
        const dagNodeInfos = {};
        for (let [_name, node] of nodes) {
            if (node.children.length === 0) {
                this._recursiveGetDagNodeInfo(node, dagNodeInfos);
            }
        }
        let count = 0;
        for (let i in dagNodeInfos) {
            if (!dagNodeInfos[i].title) {
                dagNodeInfos[i].title = "Label " + (++count);
            }
            delete dagNodeInfos[i].table; // new dag nodes don't need tables
            finalNodeInfos.push(dagNodeInfos[i]);
        }

        return finalNodeInfos;
    }

    private _createKVStoreKeys(dataflows, dataflowsList, datasets, isRetina) {
        const kvPairs = {};
        if (isRetina) {
            kvPairs[DagQueryConverter.workbookKVPrefix + "DF2Optimized"] = JSON.stringify({
                retinaName: "retina-" + Date.now(),
                retina: JSON.stringify({
                    tables: this.originalInput.tables,
                    query: JSON.stringify(this.originalInput.query)
                }),
                userName: "",
                sessionName: ""
            });
            kvPairs[DagQueryConverter.workbookKVPrefix + "DF2"] = JSON.stringify(dataflows[0]);
        } else {
            dataflows.forEach((dataflow) => {
                kvPairs[DagQueryConverter.workbookKVPrefix + dataflow.id] = JSON.stringify(dataflow);
            });
            // add key for daglist
            kvPairs[DagQueryConverter.workbookKVPrefix + "gDagListKey-1"] = JSON.stringify({
                dags: dataflowsList
            });
            datasets.forEach(dataset => {
                kvPairs[DagQueryConverter.globalKVDatasetPrefix + "sys/datasetMeta/" + dataset.args.dest] = JSON.stringify(dataset, null, 4);
            });
        }

        return JSON.stringify(kvPairs, null, 4);
    }

    private _getFailedDataflowRet(errorStr, isRetina?) {
        const kvPairs = {};
        let commentId = CommentNode.generateId();
        const comment = {
            "id": commentId,
            "nodeId": commentId,
            "display": {
                "x": 40,
                "y": 40,
                "width": 300,
                "height": 200
            },
            "text": errorStr
        };

        const dataflow = {
            "name":"Error",
            "id":  this.currentDataflowId,
            "dag":{
                "nodes":[],
                "comments":[comment],
                "display":{"width":400,"height":300,"scale":1}
            }
        }
        if (isRetina) {
            kvPairs[DagQueryConverter.workbookKVPrefix + "DF2"] = JSON.stringify(dataflow);
        } else {
            kvPairs[DagQueryConverter.workbookKVPrefix +  this.currentDataflowId] = JSON.stringify(dataflow);
        }

        return JSON.stringify(kvPairs, null, 4);
    }

    // sets node positions and returns graph dimensions
    private _setPositions(nodeMap) {
        const nodesArray = [];
        for (let i in nodeMap) {
            nodesArray.push(nodeMap[i]);
        }

        let treeGroups = {};
        let seen = {};
        for (let i = nodesArray.length - 1; i >= 0; i--) {
            if (nodesArray[i].children.length === 0) {
                // group nodes into trees
                this._splitIntoTrees(nodesArray[i], seen, treeGroups, i);
            }
        }
        let startingWidth = 0;
        let overallMaxDepth = 0;

        for (let i in treeGroups) {
            const group = treeGroups[i];
            const nodeInfos = {};

            for (let j in group) {
                if (group[j].children.length === 0) {
                    this._alignNodes(group[j], nodeInfos, startingWidth);
                    break;
                }
            }

            for (let j in group) {
                if (group[j].parents.length === 0) {
                    // adjust positions of nodes so that children will never be
                    // to the left of their parents
                    this._adjustPositions(group[j], nodeInfos, {});
                }
            }

            let maxDepth = 0;
            let maxWidth = 0;
            let minDepth = 0;
            for (let j in nodeInfos) {
                maxDepth = Math.max(nodeInfos[j].depth, maxDepth);
                minDepth = Math.min(nodeInfos[j].depth, minDepth);
                maxWidth = Math.max(nodeInfos[j].width, maxWidth);
            }
            overallMaxDepth = Math.max(maxDepth - minDepth, overallMaxDepth);

            for (let j in nodeInfos) {
                const node = nodeInfos[j].node;
                node.display = {
                    x: ((maxDepth - nodeInfos[j].depth) * DagQueryConverter.horzNodeSpacing) + (DagQueryConverter.gridSpacing * 2),
                    y: (nodeInfos[j].width * DagQueryConverter.vertNodeSpacing) + (DagQueryConverter.gridSpacing * 2)
                }
            }
            startingWidth = (maxWidth + 1);
        }
        const graphHeight = DagQueryConverter.vertNodeSpacing * (startingWidth - 1) + (DagQueryConverter.vertNodeSpacing * 3);
        const graphWidth = DagQueryConverter.horzNodeSpacing * overallMaxDepth + DagQueryConverter.horzNodeSpacing + (DagQueryConverter.gridSpacing * 2);

        return {
            maxX: graphWidth,
            maxY: graphHeight
        };
    }

    // groups individual nodes into trees and joins branches with main tree
    // the node passed in will be an end node (no children)
    private _splitIntoTrees(node, seen, treeGroups, groupId) {
        let treeGroup = {};
        formTreesHelper(node);

        function formTreesHelper(node) {
            let id = node.id;
            if (id == null) {
                id = node.name;
            }
            if (treeGroup[id]) { // already done
                return;
            }
            if (seen[id] != null) { // we've encountered this node and it's
                // part of another group so lets join its children to that group
                const mainGroupId = seen[id];
                if (groupId === mainGroupId) {
                    // already part of the same tree
                    return;
                }
                let mainGroup = treeGroups[mainGroupId];

                for (let i in treeGroup) {
                    seen[i] = mainGroupId; // reassigning nodes from current
                    // group to the main group that has the id of "mainGroupId"
                    mainGroup[i] = treeGroup[i];
                }

                delete treeGroups[groupId];

                groupId = mainGroupId;
                treeGroup = mainGroup;
                return;
            }
            treeGroup[id] = node;
            seen[id] = groupId;

            if (!treeGroups[groupId]) {
                treeGroups[groupId] = {};
            }
            treeGroups[groupId][id] = node;

            const parents = node.parents;
            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null) {
                    formTreesHelper(parents[i]);
                }
            }
        }
    }

    // sets endpoint to have depth:0, width:0. If endpoint is a join,
    // then left parent will have depth:1, width:0 and right parent will have
    // depth: 1, width: 1 and so on.
    private _alignNodes(node, seen, width) {
        let greatestWidth = width;
        _alignHelper(node, 0, width);

        function _alignHelper(node, depth, width) {
            const nodeId = node.id;
            if (seen[nodeId] != null) {
                return;
            }
            seen[nodeId] = {
                depth: depth,
                width: width,
                node: node
            };

            greatestWidth = Math.max(width, greatestWidth);
            const parents = node.parents;

            let numParentsDrawn = 0;
            for (let i = 0; i < parents.length; i++) {
                if (seen[parents[i].id] != null) {
                    numParentsDrawn++;
                }
            }

            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null &&
                    seen[parents[i].id] == null) {
                    let newWidth;
                    if (numParentsDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(parents[i], depth + 1, newWidth);
                    numParentsDrawn++;
                }
            }
            const children = node.children;

            let numChildrenDrawn = 0;
            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].id] != null) {
                    numChildrenDrawn++;
                }
            }

            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].id] == null) {
                    let newWidth;
                    if (numChildrenDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(children[i], depth - 1, newWidth);
                    numChildrenDrawn++;
                }
            }
        }
    }

    // adjust positions of nodes so that children will never be
    // to the left of their parents
    private _adjustPositions(node, nodes, seen) {
        seen[node.id] = true;
        const children = node.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            let diff = nodes[node.id].depth - nodes[child.id].depth;
            let adjustmentNeeded = false;
            if (diff <= 0) {
                let adjustment = diff - 1;
                nodes[child.id].depth += adjustment;
                adjustmentNeeded = true;
            }
            if (adjustmentNeeded || seen[child.id] == null) {
                this._adjustPositions(child, nodes, seen);
            }
        }
    }

    private _recursiveGetDagNodeInfoForUpgrade(node, nodes, dagNodeInfos, isRetina?, nestedPrefix?) {
        if (dagNodeInfos[node.name]) {
            return dagNodeInfos[node.name];
        }
        let dagNodeInfo = this._getDagNodeInfo(node, nodes, dagNodeInfos, isRetina, nestedPrefix);
        dagNodeInfos[node.name] = dagNodeInfo;

        if (dagNodeInfo.name === "Execute Retina") {
            for (let i in dagNodeInfo["nodes"]) {
                // reconnect retina with the parents of the dfout node
                if (dagNodeInfo["nodes"][i].type === DagNodeType.DFOut) {
                    dagNodeInfo["parentIds"] = dagNodeInfo["nodes"][i].parentIds;
                    dagNodeInfo.parents = dagNodeInfo["nodes"][i].parents;
                    dagNodeInfo["nodes"][i].parents.forEach((parent) => {
                        parent.children.forEach((child, j) => {
                            if (child.id === dagNodeInfo["nodes"][i].id) {
                                parent.children[j] = dagNodeInfo;
                            }
                        })
                    });
                }
            }
            delete dagNodeInfo["nodes"]; // we're done with this
        }

        node.parents.forEach(child => {
            const childInfo = this._recursiveGetDagNodeInfoForUpgrade(child, nodes, dagNodeInfos, isRetina, nestedPrefix);
            let targetDagNodeInfo = dagNodeInfo;
            if (dagNodeInfo["linkOutNode"]) {
                // if node is a dfIn (synthesize), assign it's children to the dfOut node
                targetDagNodeInfo = dagNodeInfo["linkOutNode"];
            }

            targetDagNodeInfo["parentIds"].push(childInfo.id);
            targetDagNodeInfo.parents.push(childInfo);
            childInfo.children.push(targetDagNodeInfo);
        });
        return dagNodeInfo;
    }

    private _recursiveGetDagNodeInfo(node, dagNodeInfos) {
        if (dagNodeInfos[node.name]) {
            return dagNodeInfos[node.name];
        }
        const dagNodeInfo = this._getDagNodeInfo(node);
        dagNodeInfos[node.name] = dagNodeInfo;

        node.parents.forEach(child => {
            let childInfoId;
            if (child) {
                const childInfo = this._recursiveGetDagNodeInfo(child, dagNodeInfos);
                childInfoId = childInfo.id;
            }
            dagNodeInfo.parents.push(childInfoId);
        });
        return dagNodeInfo;
    }

    // does the main conversion of a xcalarQueryStruct into a dataflow2 node
    private _getDagNodeInfo(node, nodes?, dagNodeInfos?, isRetina?, nestedPrefix?, hiddenSubGraphNode?: boolean) {
        let dagNodeInfo: DagNodeInfo;
        let linkOutNode = null;
        if (node.subGraphNodes) {
            const subGraphNodes = [];
            node.subGraphNodes.forEach((subGraphNode) => {
                subGraphNodes.push(this._getDagNodeInfo(subGraphNode, nodes, dagNodeInfos, isRetina, nestedPrefix, true));
            });
            node.subGraphNodes = subGraphNodes;
        }

        switch (node.api) {
            case (XcalarApisT.XcalarApiIndex):
                if (node.createTableInput) {
                    dagNodeInfo = <DagNodeInInfo>{
                        type: DagNodeType.Dataset,
                        input: <DagNodeDatasetInputStruct>node.createTableInput
                    };
                    if (node.subGraphNodes[0] && node.subGraphNodes[0].subType) {
                        dagNodeInfo.subType = node.subGraphNodes[0].subType;
                        dagNodeInfo.xcQueryString = node.subGraphNodes[0].xcQueryString;
                    }
                    if (node.schema) {
                        dagNodeInfo["schema"] = node.schema;
                    }
                } else {
                    // probably a sort node
                    dagNodeInfo = {
                        type: DagNodeType.Sort,
                        input: <DagNodeSortInputStruct>{
                            columns: node.args.key.map((key) => {
                                return {columnName: key.name, ordering: key.ordering}
                            }),
                            newKeys: node.args.key.map((key) => {
                                return key.keyFieldName
                            })
                        }
                    }
                }
                break;
            case (XcalarApisT.XcalarApiAggregate):
                dagNodeInfo = {
                    type: DagNodeType.Aggregate,
                    input: <DagNodeAggregateInputStruct>{
                        evalString: node.args.eval[0].evalString,
                        dest: node.name
                    }
                };
                break;
            case (XcalarApisT.XcalarApiProject):
                dagNodeInfo = {
                    type: DagNodeType.Project,
                    input: <DagNodeProjectInputStruct>{
                        columns: node.args.columns
                    }
                };
                break;
            case (XcalarApisT.XcalarApiGroupBy):
                const aggs = node.args.eval.map((evalStruct) => {
                    const evalStr = evalStruct.evalString;
                    const parenIndex = evalStr.indexOf("(");
                    return {
                        operator: evalStr.substring(0, parenIndex),
                        sourceColumn: evalStr.substring(parenIndex + 1, evalStr.length - 1),
                        destColumn: evalStruct.newField,
                        distinct: false,
                        cast: null
                    }
                });
                let groupBy = node.indexedFields[0].map(key => {
                    return key.name;
                });

                let newKeys = node.indexedFields[0].map(key => {
                    return key.keyFieldName;
                });
                if (!groupBy.length && node.args.key) {
                    groupBy = node.args.key.map((key) => {
                        return key.name || key.keyFieldName;
                    });
                    newKeys = node.args.key.map((key) => {
                        return key.keyFieldName || key.name;
                    });
                }
                dagNodeInfo = {
                    type: DagNodeType.GroupBy,
                    input: <DagNodeGroupByInputStruct>{
                        groupBy: groupBy,
                        newKeys: newKeys,
                        aggregate: aggs,
                        includeSample: node.args.includeSample,
                        icv: node.args.icv,
                        groupAll: node.args.groupAll,
                        dhtName: "",
                        joinBack: false
                    }
                };
                break;
            case (XcalarApisT.XcalarApiGetRowNum):
                dagNodeInfo = {
                    type: DagNodeType.RowNum,
                    input: <DagNodeRowNumInputStruct>{
                        newField: node.args.newField
                    }
                };
                break;
            case (XcalarApisT.XcalarApiFilter):
                dagNodeInfo = {
                    type: DagNodeType.Filter,
                    input: <DagNodeFilterInputStruct>{
                        evalString: node.args.eval[0].evalString
                    }
                };
                break;
            case (XcalarApisT.XcalarApiMap):
                dagNodeInfo = {
                    type: DagNodeType.Map,
                    input: <DagNodeMapInputStruct>{
                        eval: node.args.eval,
                        icv: node.args.icv
                    }
                };
                break;
            case (XcalarApisT.XcalarApiJoin):
                const leftRenames = node.args.columns[0].map(colInfo => {
                    return {
                        sourceColumn: colInfo.sourceColumn,
                        destColumn: colInfo.destColumn,
                        prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                    }
                });
                const rightRenames = node.args.columns[1].map(colInfo => {
                    return {
                        sourceColumn: colInfo.sourceColumn,
                        destColumn: colInfo.destColumn,
                        prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                    }
                });

                let input: DagNodeJoinInputStruct = {
                    joinType: node.args.joinType,
                    left: {
                        columns: node.indexedFields[0].map(key => {
                            return key.name;
                        }),
                        rename: leftRenames,
                        keepColumns: undefined
                    },
                    right: {
                        columns: node.indexedFields[1].map(key => {
                            return key.name;
                        }),
                        rename: rightRenames,
                        keepColumns: undefined
                    },
                    keepAllColumns: true,
                    evalString: node.args.evalString,
                    nullSafe: false
                };
                dagNodeInfo = {
                    type: DagNodeType.Join,
                    input: input
                };
                if (!this.isUpgrade && node.args.keepAllColumns != null) {
                    input.keepAllColumns = node.args.keepAllColumns;
                    if (!node.args.keepAllColumns) {
                        // if keepAllColumns is false, then we will declare
                        // which columns to keep in the keepColumns property
                        // by using the columns included in the rename property
                        input.left.keepColumns = input.left.rename.map((rename) => {
                            return rename.sourceColumn;
                        });
                        input.right.keepColumns = input.right.rename.map((rename) => {
                            return rename.sourceColumn;
                        });
                    }
                }
                break;
            case (XcalarApisT.XcalarApiUnion):
                const setType = <DagNodeSubType>xcHelper.unionTypeToXD(node.args.unionType) || "union";
                const columns = this._getUnionColumns(node.args.columns);
                dagNodeInfo = {
                    type: DagNodeType.Set,
                    subType: <DagNodeSubType>xcStringHelper.capitalize(setType),
                    input: <DagNodeSetInputStruct>{
                        columns: columns,
                        dedup: node.args.dedup
                    }
                };
                break;
            case (XcalarApisT.XcalarApiExport):
                if (this.isUpgrade) {
                    if (nestedPrefix) {
                        dagNodeInfo = {
                            type: DagNodeType.DFOut,
                            subType: DagNodeSubType.DFOutOptimized,
                            input: {
                                name: node.args.dest,
                                linkAfterExecution: true,
                                columns: node.args.columns.map((col) => {
                                    return {
                                        "sourceName": col.columnName,
                                        "destName": col.headerName
                                    }
                                })
                            }
                        };
                    } else { // would only occur in a retina
                        let driverArgs;
                        try {
                            driverArgs = JSON.parse(node.args.driverParams);
                        } catch (e) {
                            console.error(e);
                            driverArgs = node.args.driverParams || "";
                        }
                        dagNodeInfo = {
                            type: DagNodeType.Export,
                            subType: DagNodeSubType.ExportOptimized,
                            description: JSON.stringify(node.args),
                            input: {
                                columns: node.args.columns.map((col) => {
                                    return {
                                        sourceColumn: col.columnName,
                                        destColumn: col.headerName
                                    }
                                }),
                                driver: node.args.driverName,
                                driverArgs: driverArgs
                            }
                        };
                    }
                } else {
                    let driverArgs;
                    try {
                        driverArgs = JSON.parse(node.args.driverParams);
                    } catch (e) {
                        driverArgs = {};
                    }
                    dagNodeInfo = {
                        type: DagNodeType.Export,
                        input: <DagNodeExportInputStruct>{
                            columns: [],
                            driver: node.args.driverName || "",
                            driverArgs: driverArgs
                        }
                    };
                }
                break;
            case (XcalarApisT.XcalarApiExecuteRetina):
                let retinaName = node.args.retinaName.replace(/#/g, "$");
                const nestedRetInfo = this._upgradeQuery(node.args.retinaBuf, retinaName, nodes);
                dagNodeInfos = $.extend(dagNodeInfos, nestedRetInfo["nodes"]);

                if (nestedRetInfo["isChainedRetina"]) {
                    // use a placeholder for the case that retina has parents
                    dagNodeInfo = <DagNodePlaceholderInfo>{
                        type: DagNodeType.Placeholder,
                        name: "Execute Retina",
                        title: "Execute Retina",
                        input: {
                            args: node.args
                        },
                        nodes: nestedRetInfo["nodes"]
                    };
                } else {
                // executeRetina contains a subGraph, so we create the nodes
                // and assign the linkout node's name to current node's linkOutName property
                    for (let name in nestedRetInfo["nodes"]) {
                        let nestedDagNodeInfo = nestedRetInfo["nodes"][name];
                        if (nestedDagNodeInfo.type === DagNodeType.DFOut) {
                            linkOutNode = nestedDagNodeInfo;
                            break;
                        }
                    }
                    dagNodeInfo = <DagNodeDFInInfo>{
                        type: DagNodeType.DFIn,
                        input: {
                            dataflowId: this.currentDataflowId,
                            linkOutName: linkOutNode.input.name
                        },
                        linkOutNode: linkOutNode
                    };
                }

                break;
            case (XcalarApisT.XcalarApiSynthesize):
                if (this.isUpgrade) {
                    if (isRetina || nestedPrefix) {
                        // create dfOut node (this node doesn't really exist in the original query)
                        linkOutNode = {
                            type: DagNodeType.DFOut,
                            subType: DagNodeSubType.DFOutOptimized,
                            input: {
                                name: node.args.source,
                                linkAfterExecution: true,
                                columns: node.args.columns.map((col) => {
                                    return {
                                        "sourceName": col.sourceColumn,
                                        "destName": col.destColumn
                                    }
                                })
                            }
                        };
                        const comment = this._parseUserComment(node.rawNode.comment);
                        linkOutNode.description = comment.userComment || "";
                        linkOutNode.table = node.args.source;
                        linkOutNode.id = DagNode.generateId();
                        linkOutNode.nodeId = linkOutNode.id;
                        linkOutNode.parents = [];
                        linkOutNode.parentIds = [];
                        linkOutNode.children = [];
                        linkOutNode.state =  "Configured";
                        linkOutNode.configured = true;
                        // need to create a new name as this node doesn't exist in query
                        dagNodeInfos[node.args.source + "_" + DagQueryConverter.idCount++] = linkOutNode;
                    }

                    let linkOutDataflowId = null;
                    // if synthesize node doesn't have parents because they
                    // are in another dataflow, then linkOutDataflowId will be null
                    // and XD will try to find it
                    if (node.parents.length) {
                        linkOutDataflowId = this.currentDataflowId;
                    }
                    dagNodeInfo = <DagNodeDFInInfo>{
                        type: DagNodeType.DFIn,
                        input: {
                            dataflowId: linkOutDataflowId,
                            linkOutName: node.args.source
                        },
                        linkOutNode: linkOutNode
                    };
                } else {
                    // when executing optimized dataflow with synthesize=true
                    // on the dataset node, the synthesize node should appear
                    // as a dataset node
                    if (node.parents.length === 0 && node.args.source.startsWith(gDSPrefix)) {
                        dagNodeInfo = <DagNodeInInfo>{
                           type: DagNodeType.Dataset,
                           input: <DagNodeDatasetInputStruct>{
                               source:  node.args.source.slice(gDSPrefix.length),
                               prefix: "",
                               synthesize: true
                           },
                           schema: this._getSelectColumns(node.args.columns)
                       };
                    } else {
                        dagNodeInfo = {
                           type: DagNodeType.Synthesize,
                           input: <DagNodeSynthesizeInputStruct>{
                               colsInfo: xcHelper.deepCopy(node.args.columns)
                           }
                       };
                   }
                }

                break;
            case (XcalarApisT.XcalarApiSelect):
                // older versinos of apiSelect do not have columns
                let selectColumns = this._getSelectColumns(node.args.columns);
                dagNodeInfo = <DagNodeInInfo>{
                    type: DagNodeType.IMDTable,
                    input: <DagNodeIMDTableInputStruct>{
                        source: node.args.source,
                        version: node.args.minBatchId,
                        filterString: node.args.filterString || node.args.evalString,
                        schema: selectColumns
                    },
                    schema: selectColumns
                };
                break;
            case (XcalarApisT.XcalarApiBulkLoad): // should not have any
            // as the "createTable" index node should take it's place
            // unless snowflake
                let loadArgs = node.args.loadArgs;
                if (typeof loadArgs === "object") {
                    loadArgs = JSON.stringify(loadArgs);
                }
                let synthesize = false;
                if (node.children && node.children.length) {
                    node.children.forEach((child) => {
                        if (child && child.api === XcalarApisT.XcalarApiSynthesize) {
                            synthesize = true;
                        }
                    })
                }
                let createTableInput = {
                    source: xcHelper.stripPrefixFromDSName(node.args.dest),
                    prefix: "",
                    synthesize: synthesize,
                    loadArgs: loadArgs
                }
                const subType = this._getDatasetSubtype(node);
                dagNodeInfo = <DagNodeInInfo>{
                    type: DagNodeType.Dataset,
                    subType: subType,
                    input: createTableInput,
                    xcQueryString: node.xcQueryString
                };
                let schema = this._getSchemaFromLoadArgs(loadArgs);
                if (schema) {
                    dagNodeInfo["schema"] = schema;
                }

                break;
            default:
                dagNodeInfo = {
                    type: DagNodeType.Placeholder,
                    name: XcalarApisTStr[node.api],
                    title: XcalarApisTStr[node.api],
                    input: {
                        args: node.args
                    }
                };
                break;
        }

        const comment = this._parseUserComment(node.rawNode.comment);
        if (this.isUpgrade) {
            dagNodeInfo.description = dagNodeInfo.description || comment.userComment || "";
            dagNodeInfo.title = node.name.slice(node.name.lastIndexOf(":") + 1); // slice out retina prefix
        } else {
            dagNodeInfo.description = JSON.stringify(node.args, null, 4);
        }
        dagNodeInfo.subGraphNodes = node.subGraphNodes;
        dagNodeInfo.aggregates = node.aggregates;
        dagNodeInfo.table = node.name;
        dagNodeInfo.id = DagNode.generateId();
        dagNodeInfo["nodeId"] = dagNodeInfo.id;
        dagNodeInfo["children"] = [];
        dagNodeInfo.parents = [];
        dagNodeInfo["parentIds"] = [];
        dagNodeInfo.display = {x: 0, y: 0};
        if (this.globalState) {
            dagNodeInfo.state = this.globalState;
        } else {
            dagNodeInfo.state =  DagNodeState.Configured;
        }

        if (node.rawNode && node.rawNode.comment) {
            try {
                dagNodeInfo.tag = JSON.parse(node.rawNode.comment).graph_node_locator || [];
            } catch (e) {}
        }

        dagNodeInfo.configured = true;
        if (node.isActive) {
            dagNodeInfo["isActive"] = true;
            dagNodeInfo["worksheet"] = node.worksheet;
        }

        if (!this.isUpgrade) {
            // create dagIdParentMap so that we can add input nodes later
            const srcTables = this.destSrcMap[node.name];
            if (srcTables) {
                srcTables.forEach((srcTable) => {
                    const srcTableName = srcTable.srcTableName;
                    const obj = {
                        index: srcTable.index,
                        srcId: this.tableSrcMap[srcTableName]
                    }
                    if (!this.dagIdParentMap[dagNodeInfo.id]) {
                        this.dagIdParentMap[dagNodeInfo.id] = [];
                    }
                    this.dagIdParentMap[dagNodeInfo.id].push(obj);
                });
            }

            if (node.name === this.finalTableName) {
                this.outputDagId = dagNodeInfo.id;
            }
            if (!hiddenSubGraphNode) {
                this.tableNewDagIdMap[dagNodeInfo.table] = dagNodeInfo.id;
                this.dagIdToTableNamesMap[dagNodeInfo.id] = [];
            }

            if (node.subGraphNodes) {
                node.subGraphNodes.forEach(subGraphNode => {
                    this.tableNewDagIdMap[subGraphNode.table] = dagNodeInfo.id;
                    this.dagIdToTableNamesMap[dagNodeInfo.id].push(subGraphNode.table);
                });
            }
            if (!hiddenSubGraphNode) {
                this.dagIdToTableNamesMap[dagNodeInfo.id].push(dagNodeInfo.table);
            }
        }

        return dagNodeInfo;
    }

    // return {userComment: string, meta: object}
    private _parseUserComment(comment) {
        let commentObj;
        try {
            commentObj = JSON.parse(comment);
            if (typeof commentObj !== "object") {
                commentObj = {
                    userComment: commentObj,
                    meta: {}
                };
            }
        } catch (e) {
            commentObj = {
                userComment: comment || "",
                meta: {}
            };
        }
        return commentObj;
    };

    private _substitutePrefixInEval(oldEvalStr, prefix) {
        if (!oldEvalStr || !prefix) {
            return oldEvalStr;
        }
        let parsedEval = XDParser.XEvalParser.parseEvalStr(oldEvalStr);
        _replace(parsedEval);
        let evalStr = _rebuild(parsedEval);

        // inserts prefixes in udfs: udfName:udfModule -> prefix-udfName:udfModule
        // also prefixes aggs: ^myAgg -> ^prefix-myAgg
        function _replace(parsedEval) {
            if (parsedEval.fnName && parsedEval.fnName.includes(":")) {
                parsedEval.fnName = prefix + parsedEval.fnName;
            } else if (parsedEval.value && parsedEval.value.startsWith(gAggVarPrefix)) {
                parsedEval.value =  gAggVarPrefix+ prefix + parsedEval.value.slice(1);
            }
            if (parsedEval.args) {
                parsedEval.args.forEach((arg) => {
                    _replace(arg);
                });
            }
        }

        // turns evalStruct into a string
        function _rebuild(parsedEval) {
            let str = "";
            if (parsedEval.fnName) {
                str += parsedEval.fnName + "(";
            }
            parsedEval.args.forEach((arg, i) => {
                if (i > 0) {
                    str += ",";
                }
                if (arg.type === "fn") {
                    str += _rebuild(arg);
                } else {
                    str += arg.value;
                }
            });
            if (parsedEval.fnName) {
                str += ")";
            }
            return str;
        }

        return evalStr;
    }

    // turns    filter->index->join    into   filter->join
    // and setups up a "create table" node to be a dataset node
    private _collapseIndexNodes(node) {
        if (node.api === XcalarApisT.XcalarApiIndex) {
            const parent = node.parents[0];
            // XXX Here use hard coded SF type but in the future we need
            // to use some general way for checking instead
            if (parent && parent.api === XcalarApisT.XcalarApiBulkLoad &&
                parent.args.sourceType !== "Snowflake" && !node.createTableInput) {
                let loadArgs = parent.args.loadArgs;
                if (typeof loadArgs === "object") {
                    loadArgs = JSON.stringify(loadArgs);
                }
                node.createTableInput = <DagNodeDatasetInputStruct>{
                    source: xcHelper.stripPrefixFromDSName(node.args.source),
                    prefix: node.args.prefix,
                    synthesize: false,
                    loadArgs: loadArgs
                }
                node.schema = this._getSchemaFromLoadArgs(loadArgs);
                node.parents = [];
                node.subGraphNodes = [parent];
            }
            return;
        }
        for (let i = 0; i < node.parents.length; i++) {
            const parent = node.parents[i];
            if (!parent || parent.api !== XcalarApisT.XcalarApiIndex || parent.createTableInput) {
                // join nodes may have null parents
                // or if createTableInput exists, then index parent belongs to dataset
                continue;
            }
            // ignore if sort node found
            let hasSort: boolean = false;
            if (parent.rawNode && parent.rawNode.args && parent.rawNode.args.key &&
                typeof parent.rawNode.args.key === "object") {
                for (let j = 0; j < parent.rawNode.args.key.length; j++) {
                    let key = parent.rawNode.args.key[j];
                    if (key.ordering !== XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingUnordered]) {
                        hasSort = true;
                        break;
                    }
                }
            }

            if (hasSort) {
                continue;
            }
            // parent is an index
            if (!parent.parents.length ||
                parent.parents[0].api === XcalarApisT.XcalarApiBulkLoad) {
                // if parent.createTableInput exists, then we've already taken care of
                // this index node
                if (parent.args.source.startsWith(gDSPrefix)) {
                    // if index resulted from dataset
                    // then that index needs to take the role of the dataset node
                    let loadArgs= "";
                    if (parent.parents.length) {
                        loadArgs = parent.parents[0].args.loadArgs;
                        if (typeof loadArgs === "object") {
                            loadArgs = JSON.stringify(loadArgs);
                        }
                    }
                    parent.createTableInput = <DagNodeDatasetInputStruct>{
                        source: xcHelper.stripPrefixFromDSName(parent.args.source),
                        prefix: parent.args.prefix,
                        synthesize: false,
                        loadArgs: loadArgs,
                        schema: this._getSchemaFromLoadArgs(loadArgs)
                    }

                    parent.schema = parent.createTableInput.schema;
                    parent.parents = [];
                    if (parent.parents[0]) {
                        parent.subGraphNodes =  [parent.parents[0]];
                    } else {
                        parent.subGraphNodes = [];
                    }
                }
                continue;
            }

            const subGraphNodes = [parent];
            const nonIndexParent = getNonIndexParent(parent, subGraphNodes);
            if (!nonIndexParent && node.api !== XcalarApisT.XcalarApiJoin) {
                node.parents.splice(i, 1);
                i--;
                continue;
            }
            if (!node.subGraphNodes) {
                node.subGraphNodes = subGraphNodes;
            } else {
                node.subGraphNodes = node.subGraphNodes.concat(subGraphNodes);
            }
            node.parents[i] = nonIndexParent;

            // remove indexed children and push node
            if (nonIndexParent) {
                nonIndexParent.children = nonIndexParent.children.filter((child) => {
                    return child.api !== XcalarApisT.XcalarApiIndex;
                });
                nonIndexParent.children.push(node);
            } else if (this.tableSrcMap && node.api === XcalarApisT.XcalarApiJoin) {
                // since index no longer exists, assign it's destSrcMap
                // to the current node
                if (this.destSrcMap[parent.name]) {
                    if (!this.destSrcMap[node.name]) {
                        this.destSrcMap[node.name] = [];
                    }
                    const destSrcObj = this.destSrcMap[parent.name][0]
                    this.destSrcMap[node.name].push(destSrcObj);
                    destSrcObj.index = i;
                    delete this.destSrcMap[parent.name];
                }
            }

        }

        function getNonIndexParent(node, subGraphNodes) {
            const parentOfIndex = node.parents[0];
            if (!parentOfIndex) {
                return null;
            } else if (parentOfIndex.api === XcalarApisT.XcalarApiIndex) {
                // if source is index but that index resulted from dataset
                // then that index needs to take the role of the dataset node
                if (parentOfIndex.args.source.includes(gDSPrefix)) {
                    return parentOfIndex;
                }

                subGraphNodes.push(parentOfIndex);
                return getNonIndexParent(parentOfIndex, subGraphNodes);
            } else {
                return parentOfIndex;
            }
        }
    }

    private _setParents(node, nodes, otherNodes) {
        node.realParents = [];
        const newParents = [];
        for (let i = 0; i < node.parents.length; i++) {
            let parentName = node.parents[i];
            let parent = nodes.get(parentName);
            if (!parent && parentName.startsWith(gDSPrefix + "Optimized")) {
                parentName = parentName.slice(gDSPrefix.length);
                parent = nodes.get(parentName);
            }
            if (!parent && otherNodes) {
                parent = otherNodes.get(parentName);
            }
            if (parent) {
                parent.children.push(node);
                node.parents[i] = parent;
                node.realParents[i] = parent;
                newParents.push(parent);
            } else {
                if (this.tableSrcMap) {
                    // This is a starting node in the sub graph, store it bc
                    // later we'll create the dagNodeId -> srcId(parentIdx) map
                    const obj = {
                        srcTableName: node.parents[i],
                        index: i
                    }
                    if (!this.destSrcMap[node.name]) {
                        this.destSrcMap[node.name] = [];
                    }
                    this.destSrcMap[node.name].push(obj);
                } else {
                    console.error(node.parents[i] + " not found", node.rawNode.operation);
                }
                if (node.api === XcalarApisT.XcalarApiJoin ||
                    node.api === XcalarApisT.XcalarApiUnion) {
                    newParents.push(null);
                }
            }
        }
        node.parents = newParents;
    }

    private _setIndexedFields(node) {
        if (node.api === XcalarApisT.XcalarApiGroupBy) {
            node.indexedFields = this._getIndexedFields(node);
        } else if (node.api === XcalarApisT.XcalarApiJoin) {
            node.indexedFields = getJoinSrcCols(node);
        } else {
            return;
        }

        function getJoinSrcCols(node) {
            let lSrcCols = [];
            let rSrcCols = [];
            let parents = node.parents;

            if (node.args.joinType === JoinOperatorTStr[JoinOperatorT.CrossJoin]) {
                return [lSrcCols, rSrcCols];
            }

            for (let i = 0; i < parents.length; i++) {
                if (i === 0) {
                    lSrcCols = getSrcIndex(parents[i]);
                } else {
                    rSrcCols = getSrcIndex(parents[i]);
                }
            }

            return [lSrcCols, rSrcCols];

            function getSrcIndex(node) {
                if (!node) { // join case when 1 parent is null
                    return [];
                }
                if (node.api === XcalarApisT.XcalarApiIndex) {
                    return node.args.key;
                } else {
                    if (!node.parents.length) {
                        // one case is when we reach a retina project node
                        return [];
                    }
                    return getSrcIndex(node.parents[0]);
                }
            }
        }
    }

    private _getSchemaFromLoadArgs(loadArgs) {
        if (!loadArgs) {
            return null;
        }
        try {
            loadArgs = JSON.parse(loadArgs);
            if (loadArgs.args && loadArgs.args.loadArgs) {
                loadArgs = loadArgs.args.loadArgs;
                if (loadArgs.parseArgs  && loadArgs.parseArgs.schema &&
                    Array.isArray(loadArgs.parseArgs.schema)) {
                    const schema = loadArgs.parseArgs.schema.map((col) => {
                        return {
                            name: col.destColumn,
                            type: xcHelper.convertFieldTypeToColType(DfFieldTypeTFromStr[col.columnType])
                        }
                    });
                    return schema;
                }
            }

            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    // remove isCRLF from loadArgs.parseArgs.parserArgJson
    private _removeCRLF(node) {
        let originalLoadArgs = node.args.loadArgs;
        let loadArgs = originalLoadArgs;
        if (!loadArgs) {
            return originalLoadArgs;
        }
        try {
            let parsed = false;
            if (typeof loadArgs === "string") {
                loadArgs = JSON.parse(loadArgs);
                parsed = true;
            }
            if (loadArgs.parseArgs && loadArgs.parseArgs.parserArgJson) {
                const parserArgJson = JSON.parse(loadArgs.parseArgs.parserArgJson);
                delete parserArgJson.isCRLF;
                loadArgs.parseArgs.parserArgJson = JSON.stringify(parserArgJson);
            }

            if (parsed) {
                loadArgs = JSON.stringify(loadArgs);
            }
            return loadArgs;
        } catch (e) {
            console.error(e);
            return originalLoadArgs;
        }
    }
    // format loadArgs into the way dataflow 2.0 dataset node expects
    private _updateLoadArgsForXD(args) {
        let originalLoadArgs = args.loadArgs;
        let loadArgs = originalLoadArgs;
        if (!loadArgs) {
            return originalLoadArgs;
        }
        try {
            if (typeof loadArgs === "string") {
                loadArgs = JSON.parse(loadArgs);
            }
            loadArgs = {
                operation: XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad],
                args: {
                    dest: args.dest,
                    loadArgs: loadArgs
                }
            }
            return JSON.stringify(loadArgs);
        } catch (e) {
            console.error(e);
            return originalLoadArgs;
        }
    }

    private _modifyOriginalInput(originalInput) {
        let query = originalInput.query;

        for (let i = 0; i < query.length; i++) {
            const rawNode = query[i];
            if (XcalarApisTFromStr[rawNode.operation] === XcalarApisT.XcalarApiBulkLoad) {
                rawNode.args.loadArgs = this._removeCRLF(rawNode);
            }
        }
    }

    private _getAggsFromEvalStrs(evalStrs) {
        const aggs = [];
        for (let i = 0; i < evalStrs.length; i++) {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalStrs[i].evalString);
            if (!parsedEval.args) {
                parsedEval.args = [];
            }
            getAggs(parsedEval);
        }
        function getAggs(parsedEval) {
            for (let i = 0; i < parsedEval.args.length; i++) {
                if (parsedEval.args[i].type === "aggValue") {
                    aggs.push(parsedEval.args[i].value);
                } else if (parsedEval.args[i].type === "fn") {
                    getAggs(parsedEval.args[i]);
                }
            }
        }
        return aggs;
    }

    private _getIndexedFields(node) {
        var cols = [];
        search(node);
        function search(node) {
            // if parent node is join, it's indexed by left parent, ignore right
            var numParents = Math.min(node.realParents.length, 1);
            for (var i = 0; i < numParents; i++) {
                var parentNode = node.realParents[i];
                if (!parentNode) {
                    continue;
                }
                if (parentNode.api === XcalarApisT.XcalarApiIndex) {
                    cols = parentNode.args.key;
                } else {
                    search(parentNode);
                }
            }
        }

        return [cols];
    }

    private _getUnionColumns(columns) {
        let maxLength = 0;
        let maxColSet;
        const newCols = columns.map((colSet) => {
            const newColSet = colSet.map((col) => {
                return {
                    "sourceColumn": col.sourceColumn,
                    "destColumn": col.destColumn,
                    "cast": false,
                    "columnType": xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[col.columnType])
                }
            });
            if (newColSet.length > maxLength) {
                maxLength = newColSet.length;
                maxColSet = newColSet;
            }
            return newColSet;
        });

        newCols.forEach((colSet) => {
            const currLen = colSet.length;
            const diff = maxLength - currLen;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    colSet.push({
                        "sourceColumn": null,
                        "destColumn": maxColSet[currLen + i].destColumn,
                        "cast": false,
                        "columnType": maxColSet[currLen + i].columnType
                    });
                }
            }
        })

        return newCols;
    }

    private _getSelectColumns(columns: RefreshColInfo[]): ColSchema[] {
        try {
            return columns.map((column) => {
                let fileType: DfFieldTypeT = DfFieldTypeTFromStr[column.columnType];
                return {
                    name: column.destColumn || column.sourceColumn,
                    type: xcHelper.convertFieldTypeToColType(fileType)
                }
            });
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    private _getDatasetSubtype(node): string {
        if (node.rawNode && node.rawNode.args) {
            switch (node.rawNode.args.sourceType) {
                case "Snowflake":
                    return DagNodeSubType.Snowflake;
                default:
                    return null;
            };
        } else {
            return null;
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagQueryConverter = DagQueryConverter;
}
