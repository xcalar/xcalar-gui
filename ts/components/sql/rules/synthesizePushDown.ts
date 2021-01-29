class SynthesizePushDown {
    static addMinProject(opNode: XcOpNode): void {
        const visitedMap = {};
        const leafNodes = [];
        LogicalOptimizer.findLeafNodes(opNode, visitedMap, leafNodes);
        for (let i = 0; i < leafNodes.length; i++) {
            const colList = [];
            const createdColList = [];
            if (leafNodes[i].value.operation !== "XcalarApiProject" &&
                SynthesizePushDown.__getMinColumns(leafNodes[i],
                                                   colList, createdColList)) {
                // If none of the columns are used, skip the project
                if (colList.length === 0) {
                    return;
                }
                // Add a project node before leaf
                // in most cases it will be combined to prepended synthesize or select later
                const tempTableName = xcHelper.getTableName(leafNodes[i].value.args.source)
                                        + "_tmp" + Authentication.getHashId();
                const projectArgStruct = {source: leafNodes[i].value.args.source,
                                          dest: tempTableName,
                                          columns: colList};
                const projectNode = new XcOpNode(tempTableName,
                                            {operation: "XcalarApiProject",
                                             args: projectArgStruct},
                                             leafNodes[i].sources);
                projectNode.parents = [leafNodes[i]];
                leafNodes[i].children = [projectNode];
                leafNodes[i].sources = [tempTableName];
                leafNodes[i].value.args.source = tempTableName;
            }
        }
    }

    static combineLastSynthesize(node: XcOpNode): XcOpNode {
        if (node.parents.length === 0 &&
            node.value.operation === "XcalarApiSynthesize" &&
            node.children.length > 0) {
            // last node is synthesize
            const renameMap = {};
            for (let colStruct of node.value.args.columns) {
                renameMap[colStruct.sourceColumn] = colStruct.destColumn;
            }
            const child = node.children[0];
            const operation = child.value.operation;
            let allColumns = [];
            switch (operation) {
                case "XcalarApiSynthesize":
                    child.value.args.columns.forEach(function(col) {
                        if (renameMap[col.destColumn]) {
                            col.destColumn = renameMap[col.destColumn];
                            allColumns.push(col);
                        }
                    });
                    break;
                case "XcalarApiUnion":
                case "XcalarApiIntersect":
                case "XcalarApiExcept":
                case "XcalarApiJoin":
                    allColumns = jQuery.extend(true, [], child.value.args.columns);
                    for (let i = 0; i < allColumns.length; i++) {
                        const newColList = [];
                        for (let colStruct of allColumns[i]) {
                            if (renameMap.hasOwnProperty(colStruct.destColumn)) {
                                colStruct.destColumn = renameMap[colStruct.destColumn];
                                newColList.push(colStruct);
                            } else {
                                // we can't push then bc column might be used as key
                                return node;
                            }
                        }
                        allColumns[i] = newColList;
                    }
                    if (operation === "XcalarApiJoin") {
                        child.value.args.evalString = XDParser.XEvalParser
                                .replaceColName(child.value.args.evalString,
                                                renameMap, {}, true);
                    }
                    break;
                default:
                    return node;
            }
            child.parents = [];
            child.value.args.dest = node.value.args.dest;
            child.name = node.name;
            child.value.args.columns = allColumns;
            return child;
        } else {
            return node;
        }
    }

    static combineProjectWithSynthesize(
        opNode: XcOpNode,
        visitedMap: {[name: string]: XcOpNode}
    ): XcOpNode {
        if (visitedMap[opNode.name]) {
            return visitedMap[opNode.name];
        }
        let retNode = opNode;
        if (opNode.value.operation === "XcalarApiProject" &&
            opNode.children.length > 0 &&
            opNode.children[0].value.operation === "XcalarApiSynthesize") {
            if (opNode.children[0].parents.length === 1) {
                const synList = opNode.children[0].value.args.columns;
                const projectedList = [];
                for (let i = 0; i < synList.length; i++) {
                    if (opNode.value.args.columns.indexOf(synList[i].destColumn) != -1) {
                        projectedList.push(synList[i]);
                    }
                }
                opNode.children[0].value.args.columns = projectedList;
                opNode.children[0].value.args.numColumns = projectedList.length;
                opNode.children[0].value.args.dest = opNode.value.args.dest;
                opNode.children[0].name = opNode.value.args.dest;
                opNode.children[0].parents = opNode.parents;
                retNode = opNode.children[0];
                if (retNode.children.length > 0) {
                    retNode = SynthesizePushDown.combineProjectWithSynthesize(
                                                    retNode, visitedMap);
                }
            } else {
                const synNodeCopy = new XcOpNode(opNode.value.args.dest,
                            jQuery.extend(true, {}, opNode.children[0].value),
                            opNode.children[0].sources);
                synNodeCopy.parents = opNode.parents;
                synNodeCopy.children = opNode.children[0].children;
                const synList = synNodeCopy.value.args.columns;
                const projectedList = [];
                for (let i = 0; i < synList.length; i++) {
                    if (opNode.value.args.columns.indexOf(synList[i].destColumn) != -1) {
                        projectedList.push(synList[i]);
                    }
                }
                synNodeCopy.value.args.columns = projectedList;
                synNodeCopy.value.args.numColumns = projectedList.length;
                synNodeCopy.value.args.dest = opNode.value.args.dest;
                retNode = synNodeCopy;
                opNode.children[0].parents.splice(opNode.children[0]
                                                .parents.indexOf(opNode),1);
                if (retNode.children.length > 0) {
                    retNode = SynthesizePushDown.combineProjectWithSynthesize(
                                                    retNode, visitedMap);
                }
            }
        } else if (opNode.value.operation === "XcalarApiSynthesize" &&
                    opNode.children.length > 0 &&
                    opNode.children[0].value.operation === "XcalarApiSynthesize") {
            if (opNode.children[0].parents.length === 1) {
                const synReverseMap = {};
                const synTypeMap = {};
                opNode.children[0].value.args.columns.forEach(function(col) {
                    synReverseMap[col.destColumn] = col.sourceColumn;
                    synTypeMap[col.destColumn] = col.columnType;
                });
                const synList = opNode.value.args.columns;
                for (let i = 0; i < synList.length; i++) {
                    if (!synList[i].columnType && synTypeMap[synList[i].sourceColumn]) {
                        synList[i].columnType = synTypeMap[synList[i].sourceColumn];
                    }
                    synList[i].sourceColumn = synReverseMap[synList[i].sourceColumn]
                                                || synList[i].sourceColumn;
                }
                opNode.children[0].value.args.columns = synList;
                opNode.children[0].value.args.numColumns = synList.length;
                opNode.children[0].value.args.dest = opNode.value.args.dest;
                opNode.children[0].name = opNode.value.args.dest;
                opNode.children[0].parents = opNode.parents;
                retNode = SynthesizePushDown.combineProjectWithSynthesize(
                                                opNode.children[0], visitedMap);
            } else {
                const synNodeCopy = new XcOpNode(opNode.value.args.dest,
                                jQuery.extend(true, {}, opNode.value),
                                jQuery.extend([], opNode.children[0].sources));
                synNodeCopy.parents = opNode.parents;
                synNodeCopy.children = jQuery.extend([], opNode.children[0].children);
                const synReverseMap = {};
                const synTypeMap = {};
                opNode.children[0].value.args.columns.forEach(function(col) {
                    synReverseMap[col.destColumn] = col.sourceColumn;
                    synTypeMap[col.destColumn] = col.columnType;
                });
                const synList = synNodeCopy.value.args.columns;
                for (let i = 0; i < synList.length; i++) {
                    if (!synList[i].columnType && synTypeMap[synList[i].sourceColumn]) {
                        synList[i].columnType = synTypeMap[synList[i].sourceColumn];
                    }
                    synList[i].sourceColumn = synReverseMap[synList[i].sourceColumn]
                                                || synList[i].sourceColumn;
                }
                synNodeCopy.value.args.columns = synList;
                synNodeCopy.value.args.numColumns = synList.length;
                synNodeCopy.value.args.dest = opNode.value.args.dest;
                synNodeCopy.value.args.source = opNode.children[0].value.args.source;
                retNode = SynthesizePushDown.combineProjectWithSynthesize(
                                                        synNodeCopy, visitedMap);
                opNode.children[0].parents.splice(opNode.children[0]
                                                .parents.indexOf(opNode),1);
            }
        } else {
            for (let i = 0; i < opNode.children.length; i++) {
                opNode.children[i] = SynthesizePushDown.
                                                combineProjectWithSynthesize(
                                                opNode.children[i], visitedMap);
            }
        }
        visitedMap[opNode.name] = retNode;
        return retNode;
    }

    static __getMinColumns(
        node: XcOpNode,
        colList: string[],
        createdColList: string[]
    ): boolean {
        if (node.parents.length > 1) {
            return false;
        }
        const opName = node.value.operation;
        switch (opName) {
            case "XcalarApiGroupBy":
            case "XcalarApiAggregate": {
                const newCreatedCols = [];
                for (const evalStruct of node.value.args.eval) {
                    const evalColumnList = XDParser.XEvalParser.getAllColumnNames(
                                                    evalStruct.evalString, true);
                    for (const colName of evalColumnList) {
                        if (colList.indexOf(colName) === -1 &&
                            createdColList.indexOf(colName) === -1 &&
                            colName !== "None") {
                            colList.push(colName);
                        }
                    }
                    newCreatedCols.push(evalStruct.newField);
                }
                createdColList = createdColList.concat(newCreatedCols);
                if (node.value.args.includeSample && node.parents.length > 0) {
                    return this.__getMinColumns(node.parents[0], colList, createdColList);
                } else if (node.value.args.includeSample) {
                    return false;
                } else {
                    return true;
                }
            }
            case "XcalarApiGetRowNum": {
                createdColList.push(node.value.args.newField);
                if (node.parents.length > 0) {
                    return this.__getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            }
            case "XcalarApiMap":
            case "XcalarApiFilter": {
                const newCreatedCols = [];
                for (const evalStruct of node.value.args.eval) {
                    const evalColumnList = XDParser.XEvalParser.getAllColumnNames(
                                                    evalStruct.evalString, true);
                    for (const colName of evalColumnList) {
                        if (colList.indexOf(colName) === -1 &&
                            createdColList.indexOf(colName) === -1 &&
                            colName !== "None") {
                            colList.push(colName);
                        }
                    }
                    newCreatedCols.push(evalStruct.newField); // Might be undefined here but it doesn't matter
                }
                createdColList = createdColList.concat(newCreatedCols);
                if (node.parents.length > 0) {
                    return this.__getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            }
            case "XcalarApiIndex": {
                for (const keyStruct of node.value.args.key) {
                    if (colList.indexOf(keyStruct.name) === -1 &&
                        createdColList.indexOf(keyStruct.name) === -1) {
                        colList.push(keyStruct.name);
                    }
                }
                if (node.parents.length > 0) {
                    return this.__getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            }
            case "XcalarApiProject": {
                for (const colName of node.value.args.columns) {
                    if (colList.indexOf(colName) === -1 &&
                        createdColList.indexOf(colName) === -1) {
                        colList.push(colName);
                    }
                }
                return true;
            }
            case "XcalarApiSynthesize": {
                for (const colStruct of node.value.args.columns) {
                    if (colList.indexOf(colStruct.sourceColumn) === -1 &&
                        createdColList.indexOf(colStruct.sourceColumn) === -1) {
                        colList.push(colStruct.sourceColumn);
                    }
                }
                return true;
            }
            case "XcalarApiJoin":
            case "XcalarApiUnion":
            case "XcalarApiBulkLoad":
                return false;
            case "XcalarApiExecuteRetina":
            case "XcalarApiExport":
            case "XcalarApiDeleteObjects":
            case "XcalarApiSelect":
            default:
                console.error("Unexpected parent operation: " + opName
                              + " when adding minimum synthesize");
                return false;
        }
    }

    static synchronizeBulkLoad(opNode: XcOpNode) {
        const visitedMap = {};
        const leafNodes = [];
        LogicalOptimizer.findLeafNodes(opNode, visitedMap, leafNodes);
        for (let i = 0; i < leafNodes.length; i++) {
            if (leafNodes[i].value.operation === "XcalarApiBulkLoad") {
                SQLUtil.assert(leafNodes[i].parents.length === 1 &&
                    leafNodes[i].parents[0].value.operation ===
                    "XcalarApiSynthesize", SQLErrTStr.BadBulkLoad +
                    leafNodes[i].parents[0].value.operation);
                leafNodes[i].value.args.loadArgs.parseArgs.schema
                    = leafNodes[i].parents[0].value.args.columns;
            }
        }
        return opNode;
    }
}
if (typeof exports !== "undefined") {
    exports.SynthesizePushDown = SynthesizePushDown;
}