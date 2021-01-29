
const optimizationDriver = {
    pushToSelect: SelectPushDown.pushToSelect,
    dedup: DedupPlan.dedup,
    combineLastSynthesize: SynthesizePushDown.combineLastSynthesize,
    randomCrossJoin: AddIndex.addIndexForCrossJoin,
    combineProjectWithSynthesize: SynthesizePushDown.
                                    combineProjectWithSynthesize,
    dropAsYouGo: DropAsYouGo.addDrops,
    udfFilter: FilterPushUp.pushFromJoin,
    synchronizeBulkLoad: SynthesizePushDown.synchronizeBulkLoad
};
// Order matters
const optimizationOrder = ["pushToSelect", "dedup", "combineLastSynthesize",
                           "randomCrossJoin", "udfFilter",
                           "combineProjectWithSynthesize", "dropAsYouGo",
                           "synchronizeBulkLoad"];
class LogicalOptimizer {
    static optimize(
        queryString: string,
        options: {},
        prependQueryString: string
    ): SQLOptimizedStruct {
        let opArray;
        let prepArray = [];
        let opGraph = new XcOpGraph();

        opArray = JSON.parse(queryString);
        if (opArray.length === 0) {
            // Empty query edge case
            const retStruct: SQLOptimizedStruct = {
                optimizedQueryString: queryString,
                aggregates: []
            }
            return retStruct;
        }
        if (prependQueryString) {
            prepArray = JSON.parse(prependQueryString);
        }
        // First traversal - build operator graph
        // the queryString is in mix order of BFS & DFS :(
        const opIdxMap = {};
        for (let i = 0; i < opArray.length; i++) {
            if (opArray[i].args.dest) {
                opIdxMap[opArray[i].args.dest] = i;
            }
            LogicalOptimizer.addAggSource(opArray[i]);
        }
        for (let i = 0; i < prepArray.length; i++) {
            LogicalOptimizer.addAggSource(prepArray[i]);
        }
        let index = opArray.length - 1;
        while (opArray[index].operation === "XcalarApiDeleteObjects") {
            index -= 1;
        }
        opGraph.root = LogicalOptimizer.genOpGraph(opArray, index, opIdxMap, {});

        // Special case for parquet. This is optimizing the dataflow not sql
        // execution. So it only does this one optimization and then returns
        if (options["parquetPushDown"]) {
            opGraph.root = ParquetPushDown.pushToLoad(opGraph.root);
            const cliArray = [];
            LogicalOptimizer.getCliFromOpGraph(opGraph.root, cliArray, false, {});
            const optimizedQueryString = "[" + cliArray.join(",") + "]";
            return {optimizedQueryString: optimizedQueryString,
                    aggregates: opGraph.aggregates};
        }
        // add synthesize to get minimum number of columns before prepending
        SynthesizePushDown.addMinProject(opGraph.root);
        // Second (optional) traversal - add prepended operators to the correct place
        if (prepArray) {
            const prepIdxMap = {};
            for (let i = 0; i < prepArray.length; i++) {
                prepIdxMap[prepArray[i].args.dest] = i;
                if (prepArray[i].operation === "XcalarApiSynthesize") {
                    for (let j = 0; j < prepArray[i].args.columns.length; j++) {
                        if (prepArray[i].args.columns[j].destColumn !=
                            prepArray[i].args.columns[j].destColumn.toUpperCase()) {
                            prepArray[i].args.columns[j].destColumn =
                            prepArray[i].args.columns[j].destColumn.toUpperCase();
                            console.error("Lower case column found: " +
                                    prepArray[i].args.columns[j].destColumn);
                        }
                    }
                }
            }
            const nodesNeedReorder = [];
            LogicalOptimizer.insertOperators(opGraph.root, prepArray, prepIdxMap,
                                             {}, {}, nodesNeedReorder);
            const nodeMap = {};
            for (let i = 0; i < nodesNeedReorder.length; i++) {
                LogicalOptimizer.reorderChildren(nodesNeedReorder[i],
                                                 nodesNeedReorder, nodeMap);
            }
        }
        // Optimize by augmenting the graph (value must be valid json format)
        // All optimizations go from here
        options["dedup"] = options["dedup"] != null ? options["dedup"] : true;
        options["combineLastSynthesize"] = options["combineLastSynthesize"] !=
                                 null ? options["combineLastSynthesize"] : true;
        options["udfFilter"] = options["udfFilter"] != null ?
                               options["udfFilter"] : true;
        options["synchronizeBulkLoad"] = options["synchronizeBulkLoad"] != null ?
                                         options["synchronizeBulkLoad"] : true;
        const structs = {
            nodeHashMap: opGraph.nodeHashMap,
            aggregateNameMap: opGraph.aggregateNameMap
        }
        optimizationOrder.forEach((optimizationRule) => {
            if (options[optimizationRule]) {
                opGraph.root = optimizationDriver[optimizationRule].call(this,
                                                        opGraph.root, {},
                                                        {optimizations: options,
                                                         structs: structs});
            }
        })
        if (!options["dropAsYouGo"]) {
            LogicalOptimizer.findAggs(opGraph.aggregates, opGraph.root);
        }
        // Final traversal - get the result
        const cliArray = [];
        LogicalOptimizer.getCliFromOpGraph(opGraph.root, cliArray,
                                           options["deleteCompletely"], {});
        const optimizedQueryString = "[" + cliArray.join(",") + "]";
        const retStruct: SQLOptimizedStruct = {
            optimizedQueryString: optimizedQueryString,
            aggregates: opGraph.aggregates
        }
        return retStruct;
    }

    static genOpGraph(
        opArray: XcOperator[],
        index: number,
        opIdxMap: {[source: string]: number},
        visitedMap: {[name: string]: XcOpNode},
        parent?: XcOpNode
    ): XcOpNode {
        const operator = opArray[index];
        let sources = operator.args.source? (typeof operator.args.source === "string" ?
                        [operator.args.source] : operator.args.source) : [];
        const dest = operator.args.dest;
        if (operator.args.aggSource) {
            sources = sources.concat(operator.args.aggSource);
            delete operator.args.aggSource;
        }
        let newNode = new XcOpNode(dest, operator, sources);
        if (visitedMap[newNode.name]) {
            // replace with cached one
            newNode = visitedMap[newNode.name];
        }
        if (parent) {
            newNode.parents.push(parent);
        }
        if (visitedMap[newNode.name]) {
            return newNode;
        }
        for (let i = 0; i < newNode.sources.length; i++) {
            const index = opIdxMap[newNode.sources[i]];
            if (index >= 0) {
                const childNode = this.genOpGraph(opArray, index,
                                                  opIdxMap, visitedMap, newNode);
                newNode.children.push(childNode);
            }
        }
        visitedMap[newNode.name] = newNode;
        return newNode;
    }

    static insertOperators(
        opNode: XcOpNode,
        prepArray: XcOperator[],
        prepIdxMap: {[name: string]: number},
        prepNodeMap: {[name: string]: XcOpNode},
        visitedMap: {[name: string]: boolean},
        nodesNeedReorder: XcOpNode[]
    ): void {
        if (visitedMap[opNode.name]) {
            return;
        }
        for (let i = 0; i < opNode.sources.length; i++) {
            if (opNode.children[i]) {
                this.insertOperators(opNode.children[i], prepArray, prepIdxMap,
                                     prepNodeMap, visitedMap, nodesNeedReorder);
            }
            if (prepNodeMap[opNode.sources[i]]) {
                const prepNode = prepNodeMap[opNode.sources[i]];
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
                if (nodesNeedReorder.indexOf(opNode) === -1) {
                    nodesNeedReorder.push(opNode);
                }
            } else if (prepIdxMap[opNode.sources[i]] >= 0) {
                const operator = prepArray[prepIdxMap[opNode.sources[i]]];
                let sources = typeof operator.args.source === "string" ?
                                [operator.args.source] : operator.args.source;
                const dest = operator.args.dest;
                if (operator.args.aggSource) {
                    sources = sources.concat(operator.args.aggSource);
                    delete operator.args.aggSource;
                }
                const prepNode = new XcOpNode(dest, operator, sources);
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
                prepNodeMap[opNode.sources[i]] = prepNode;
                if (nodesNeedReorder.indexOf(opNode) === -1) {
                    nodesNeedReorder.push(opNode);
                }
                this.insertOperators(prepNode, prepArray, prepIdxMap,
                                     prepNodeMap, visitedMap, nodesNeedReorder);
            }
        }
        visitedMap[opNode.name] = true;
    }
    static getCliFromOpGraph(
        opNode: XcOpNode,
        cliArray: string[],
        deleteCompletely: boolean,
        visitedMap: {[name: string]: boolean}
    ): void {
        if (visitedMap[opNode.name]) {
            return;
        }
        for (let i = 0; i < opNode.children.length; i++) {
            this.getCliFromOpGraph(opNode.children[i], cliArray,
                                   deleteCompletely, visitedMap);
        }
        cliArray.push(JSON.stringify(opNode.value));
        if (opNode.toDrop) {
            opNode.toDrop.forEach(function(namePattern) {
                const deleteObj = {
                    "operation": "XcalarApiDeleteObjects",
                    "args": {
                        "namePattern": namePattern,
                        "srcType": namePattern.includes('.XcalarDS.Optimized.ds') ? "Dataset": "Table",
                        "deleteCompletely": deleteCompletely || false
                    }
                };
                cliArray.push(JSON.stringify(deleteObj));
            });
        }
        visitedMap[opNode.name] = true;
    }

    static reorderChildren(
        opNode: XcOpNode,
        nodesNeedReorder: XcOpNode[],
        nodeMap: {[name: string]: XcOpNode}
    ): void {
        if (nodeMap[opNode.name]) {
            return;
        }
        if (nodesNeedReorder.indexOf(opNode) === -1) {
            nodeMap[opNode.name] = opNode;
            return;
        }
        for (let i = 0; i < opNode.children.length; i++) {
            this.reorderChildren(opNode.children[i], nodesNeedReorder, nodeMap);
        }
        const reorderList = [];
        for (let i = 0; i < opNode.sources.length; i++) {
            if (nodeMap[opNode.sources[i]]) {
                reorderList.push(nodeMap[opNode.sources[i]]);
            }
        }
        opNode.children = reorderList;
        nodeMap[opNode.name] = opNode;
    }

    static addAggSource(cliStruct: XcOperator): void {
        const opName = cliStruct.operation;
        switch (opName) {
            case ("XcalarApiGroupBy"):
            case ("XcalarApiMap"):
                cliStruct.args.aggSource = [];
                for (let i = 0; i < cliStruct.args.eval.length; i++) {
                    XDParser.XEvalParser.getAggNames(cliStruct.args.eval[i]
                        .evalString, true).forEach(function (aggName) {
                        if (cliStruct.args.aggSource.indexOf(aggName) === -1) {
                            cliStruct.args.aggSource.push(aggName);
                        }
                    })
                }
                break;
            case ("XcalarApiFilter"):
            case ("XcalarApiAggregate"):
                cliStruct.args.aggSource = XDParser.XEvalParser
                        .getAggNames(cliStruct.args.eval[0].evalString, true);
                break;
            case ("XcalarApiJoin"):
                cliStruct.args.aggSource = XDParser.XEvalParser
                                .getAggNames(cliStruct.args.evalString, true);
                break;
            case ("XcalarApiProject"):
            case ("XcalarApiIndex"):
            case ("XcalarApiUnion"):
            case ("XcalarApiGetRowNum"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSynthesize"):
            case ("XcalarApiSelect"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    static findAggs(aggregates: string[], node: XcOpNode): void {
        if (node.value.operation === "XcalarApiAggregate") {
            aggregates.push(node.value.args.dest);
        }
        for (let i = 0; i < node.children.length; i++) {
            this.findAggs(aggregates, node.children[i]);
        }
    }

    static findLeafNodes(
        node: XcOpNode,
        visitedMap: {[name: string]: boolean},
        leafNodes: XcOpNode[]
    ): void {
        if (visitedMap[node.name]) {
            return;
        } else if (node.children.length === 0) {
            leafNodes.push(node);
        } else {
            for (let i = 0; i < node.children.length; i++) {
                this.findLeafNodes(node.children[i], visitedMap, leafNodes);
            }
        }
        visitedMap[node.name] = true;
    }
}
if (typeof exports !== "undefined") {
    exports.LogicalOptimizer = LogicalOptimizer;
}