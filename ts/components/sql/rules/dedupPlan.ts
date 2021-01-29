class DedupPlan {
    static dedup(
        node: XcOpNode,
        visitedMap: {[name: string]: XcOpNode},
        options: {
            structs: {
                nodeHashMap: {},
                aggregateNameMap: {}
            }
        }
    ): XcOpNode {
        const {nodeHashMap, aggregateNameMap} = options.structs;
        if (visitedMap[node.name]) {
            return visitedMap[node.name];
        }
        // We probably don't need the level attribute as long as we have hash
        // Same hash means same source => same level
        for (let i = 0; i < node.children.length; i++) {
            node.children[i] = DedupPlan.dedup(node.children[i], visitedMap, options);
        }

        // Fix column names in this node, should rename if that creates new collision
        DedupPlan.__replaceColName(node, aggregateNameMap);

        // Check duplicate with hash
        const nodeHash = DedupPlan.__generateHash(node);
        if (node.value.operation === "XcalarApiJoin") {
            if (nodeHashMap[nodeHash]) {
                let find = false;
                for (let i = 0; i < nodeHashMap[nodeHash].length; i++) {
                    if (DedupPlan.__isSameJoinFilter(nodeHashMap[nodeHash][i], node)) {
                        node.dupOf = nodeHashMap[nodeHash][i];
                        DedupPlan.__generateColNameMap(nodeHashMap[nodeHash][i], node, aggregateNameMap);
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    nodeHashMap[nodeHash].push(node);
                    DedupPlan.__updateColNameMap(node);
                }
            } else {
                nodeHashMap[nodeHash] = [node];
                DedupPlan.__updateColNameMap(node);
            }
        } else if (nodeHashMap[nodeHash]) {
            DedupPlan.__generateColNameMap(nodeHashMap[nodeHash], node, aggregateNameMap);
            node.dupOf = nodeHashMap[nodeHash];
        } else {
            nodeHashMap[nodeHash] = node;
            DedupPlan.__updateColNameMap(node);
        }
        const retNode = DedupPlan.__pushUpColNameMap(node);
        visitedMap[node.name] = retNode;
        return retNode;
    }

    static __isSameJoinFilter(baseNode: XcOpNode, node: XcOpNode): boolean {
        const crossCheckMap = {};
        for (let i = 0; i < node.value.args.columns[1].length; i++) {
            if (node.value.args.columns[1][i].destColumn !=
                    baseNode.value.args.columns[1][i].destColumn) {
                crossCheckMap[node.value.args.columns[1][i].destColumn] =
                                    baseNode.value.args.columns[1][i].destColumn;
            }
        }
        node.crossCheckMap = crossCheckMap;
        return baseNode.value.args.evalString === XDParser.XEvalParser
                .replaceColName(node.value.args.evalString, crossCheckMap, {}, true);
    }


    static __generateHash(node: XcOpNode): string {
        const value = jQuery.extend(true, {}, node.value);
        delete value.args.dest;
        const opName = value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
            case ("XcalarApiGroupBy"):
                for (let i = 0; i < value.args.eval.length; i++) {
                    delete value.args.eval[i].newField;
                }
                break;
            case ("XcalarApiSynthesize"):
                for (let i = 0; i < value.args.columns.length; i++) {
                    delete value.args.columns[i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                delete value.args.newField;
                break;
            case ("XcalarApiJoin"):
                for (let i = 0; i < value.args.columns[0].length; i++) {
                    delete value.args.columns[0][i].destColumn;
                }
                for (let i = 0; i < value.args.columns[1].length; i++) {
                    delete value.args.columns[1][i].destColumn;
                }
                delete value.args.evalString;
                break;
            case ("XcalarApiUnion"):
                for (let i = 0; i < value.args.columns.length; i++) {
                    for (let j = 0; j < value.args.columns[i].length; j++) {
                        delete value.args.columns[i][j].destColumn;
                    }
                }
                break;
            case ("XcalarApiAggregate"):
            case ("XcalarApiProject"):
            case ("XcalarApiIndex"):
            case ("XcalarApiFilter"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
        return jQuery.md5(JSON.stringify(value));
    }

    static __generateColNameMap(
        baseNode: XcOpNode,
        node: XcOpNode,
        aggregateNameMap: {}
    ): void {
        node.indexOn = baseNode.indexOn;
        const opName = node.value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
            case ("XcalarApiGroupBy"):
                const newColList = [];
                for (let i = 0; i < node.value.args.eval.length; i++) {
                    newColList.push(node.value.args.eval[i].newField);
                }
                for (const item in node.colNameMaps[0]) {
                    if (newColList.indexOf(item) != -1) {
                        delete node.colNameMaps[0][item];
                    }
                }
                for (let i = 0; i < node.value.args.eval.length; i++) {
                    node.colNameMaps[0][node.value.args.eval[i].newField] =
                                            baseNode.value.args.eval[i].newField;
                }
                if (opName === "XcalarApiGroupBy") {
                    for (const item in node.colNameMaps[0]) {
                        let find = false;
                        if (node.indexOn.indexOf(node.colNameMaps[0][item]) != -1) {
                            find = true;
                        }
                        for (let j = 0; j < node.value.args.eval.length; j++) {
                            if (node.value.args.eval[j].newField === item) {
                                find = true;
                                break;
                            }
                        }
                        if (!find) {
                            delete node.colNameMaps[0][item];
                        }
                    }
                }
                break;
            case ("XcalarApiProject"):
                node.colNameMaps[0] = {};
                for (let i = 0; i < node.projectListCopy.length; i++) {
                    if (node.projectListCopy[i] != baseNode.value.args.columns[i]) {
                        node.colNameMaps[0][node.projectListCopy[i]] =
                                            baseNode.value.args.columns[i];
                    }
                }
                break;
            case ("XcalarApiSynthesize"):
                node.colNameMaps[0] = {};
                for (let i = 0; i < node.value.args.columns.length; i++) {
                    node.colNameMaps[0][node.value.args.columns[i].destColumn]
                                    = baseNode.value.args.columns[i].destColumn;
                }
                break;
            case ("XcalarApiAggregate"):
                node.colNameMaps[0] = {};
                aggregateNameMap["^" + node.value.args.dest] = "^" + baseNode.value.args.dest;
                break;
            case ("XcalarApiJoin"):
                // Here keep all from left because those in right with collision will be renamed
                node.colNameMaps[0] = jQuery.extend(true, {},
                                                    node.colNameMaps[1],
                                                    node.colNameMaps[0]);
                for (let i = 0; i < node.value.args.columns[0].length; i++) {
                    node.colNameMaps[0][node.value.args.columns[0][i].destColumn] =
                                    baseNode.value.args.columns[0][i].destColumn;
                }
                for (let i = 0; i < node.value.args.columns[1].length; i++) {
                    node.colNameMaps[0][node.value.args.columns[1][i].destColumn] =
                                    baseNode.value.args.columns[1][i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                node.colNameMaps[0][node.value.args.newField] = baseNode.value.args.newField;
                break;
            case ("XcalarApiUnion"):
                node.colNameMaps[0] = {};
                for (let i = 0; i < node.value.args.columns[0].length; i++) {
                    if (node.value.args.columns[0][i].destColumn !=
                                baseNode.value.args.columns[0][i].destColumn) {
                        node.colNameMaps[0][node.value.args.columns[0][i].destColumn] =
                                        baseNode.value.args.columns[0][i].destColumn;
                    }
                }
            case ("XcalarApiIndex"):
            case ("XcalarApiFilter"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    static __updateColNameMap(node: XcOpNode): void {
        if (!node.indexOn) {
            node.indexOn = [];
        }
        const opName = node.value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
                const newColList = [];
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    newColList.push(node.value.args.eval[i].newField);
                    node.colNameMaps[0][node.value.args.eval[i].newField] =
                                               node.value.args.eval[i].newField;
                }
                for (const item in node.colNameMaps[0]) {
                    if (newColList.indexOf(node.colNameMaps[0][item]) != -1
                        && item != node.colNameMaps[0][item]) {
                        delete node.colNameMaps[0][item];
                    }
                }
                break;
            case ("XcalarApiGroupBy"):
                if (node.indexOn.length != 0 || node.value.args.groupAll) {
                    node.colNameMaps[0] = {};
                    for (let i = 0; i < node.indexOn.length; i++) {
                        node.colNameMaps[0][node.indexOn[i]] = node.indexOn[i];
                    }
                }
                for (let i = 0; i < node.value.args.eval.length; i++) {
                    node.colNameMaps[0][node.value.args.eval[i].newField]
                                        = node.value.args.eval[i].newField;
                }
                break;
            case ("XcalarApiProject"): {
                const colNameList = node.value.args.columns;
                const newIndexOn = [];
                for (const item in node.colNameMaps[0]) {
                    if (colNameList.indexOf(item) === -1) {
                        delete node.colNameMaps[0][item];
                    }
                }
                for (const col in node.indexOn) {
                    if (colNameList.indexOf(col) != -1) {
                        newIndexOn.push(col);
                    }
                }
                node.indexOn = newIndexOn;
                break;
            }
            case ("XcalarApiSelect"):
            case ("XcalarApiSynthesize"): {
                const newColNameMaps = [{}];
                const newIndexOn = [];
                node.value.args.columns.forEach(function(col) {
                    newColNameMaps[0][col.destColumn] = col.destColumn;
                    if (node.indexOn.indexOf(col.sourceColumn) != -1) {
                        newIndexOn.push(col.destColumn);
                    }
                });
                node.colNameMaps = newColNameMaps;
                node.indexOn = newIndexOn;
                break;
            }
            case ("XcalarApiAggregate"):
                node.colNameMaps[0] = {};
                node.indexOn = [];
                break;
            case ("XcalarApiJoin"):
                // Here keep all from left because those in right with collision will be renamed
                node.colNameMaps[0] = jQuery.extend(true, {},
                                                    node.colNameMaps[1],
                                                    node.colNameMaps[0]);
                for (let i = 0; i < node.value.args.columns[1].length; i++) {
                    node.colNameMaps[0][node.value.args.columns[1][i].destColumn]
                                    = node.value.args.columns[1][i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                node.colNameMaps[0][node.value.args.newField] = node.value.args.newField;
                break;
            case ("XcalarApiIndex"):
                node.indexOn = [];
                for (let i = 0; i < node.value.args.key.length; i++) {
                    node.indexOn.push(node.value.args.key[i].keyFieldName);
                }
                break;
            case ("XcalarApiFilter"):
            case ("XcalarApiUnion"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    static __pushUpColNameMap(node: XcOpNode): XcOpNode {
        for (let i = 0; i < node.parents.length; i++) {
            const opName = node.parents[i].value.operation;
            if (!node.parents[i].colNameMaps[0]) {
                node.parents[i].colNameMaps[0] = {};
            }
            switch (opName) {
                case ("XcalarApiMap"):
                case ("XcalarApiGroupBy"):
                case ("XcalarApiAggregate"):
                case ("XcalarApiGetRowNum"):
                case ("XcalarApiProject"):
                case ("XcalarApiIndex"):
                case ("XcalarApiFilter"):
                case ("XcalarApiSynthesize"):
                    for (let j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            if (node.value.operation != "XcalarApiAggregate") {
                                node.parents[i].colNameMaps[0] = jQuery.extend(true, {}, node.colNameMaps[0]);
                            }
                            if (node.dupOf) {
                                node.parents[i].children[j] = node.dupOf;
                            }
                        }
                    }
                    if (node.dupOf) {
                        for (let j = 0; j < node.parents[i].sources.length; j++) {
                            if (node.parents[i].sources[j] === node.name) {
                                node.parents[i].sources[j] = node.dupOf.name;
                            }
                        }
                        if (node.value.operation != "XcalarApiAggregate") {
                            node.parents[i].value.args.source = node.dupOf.value.args.dest;
                        }
                    }
                    node.parents[i].indexOn = node.indexOn;
                    break;
                case ("XcalarApiJoin"):
                case ("XcalarApiUnion"):
                    for (let j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            node.parents[i].colNameMaps[j] = jQuery.extend(true, {}, node.colNameMaps[0]);
                            if (node.dupOf) {
                                node.parents[i].children[j] = node.dupOf;
                            }
                        }
                    }
                    if (node.dupOf) {
                        for (let j = 0; j < node.parents[i].sources.length; j++) {
                            if (node.parents[i].sources[j] === node.name) {
                                node.parents[i].sources[j] = node.dupOf.name;
                            }
                        }
                        for (let j = 0; j < node.parents[i].value.args.source.length; j++) {
                            if (node.parents[i].value.args.source[j] === node.name
                                && node.value.operation != "XcalarApiAggregate") {
                                node.parents[i].value.args.source[j] = node.dupOf.value.args.dest;
                            }
                        }
                    }
                    break;
                case ("XcalarApiExecuteRetina"):
                case ("XcalarApiRenameNode"):
                case ("XcalarApiSelect"):
                case ("XcalarApiBulkLoad"):
                case ("XcalarApiExport"):
                case ("XcalarApiDeleteObjects"):
                default:
                    console.error("Unexpected parent operation: " + opName
                                + " of node: " + node.value.operation);
                    break;
            }
        }
        if (node.dupOf) {
            for (let i = 0; i < node.children.length; i++) {
                node.children[i].parents.splice(node.children[i].parents.indexOf(node), 1);
            }
            node.dupOf.parents = node.dupOf.parents.concat(node.parents);
        }
        return node.dupOf || node;
    }

    static __replaceColName(node: XcOpNode, aggregateNameMap: {}): void {
        // For operators that have only one child, simply replace name
        // If join node, need to detect extra collision
        const opName = node.value.operation;
        node.colNameMaps = node.colNameMaps || [{}];
        switch (opName) {
            case ("XcalarApiGroupBy"):
                node.value.args.newKeyField = node.colNameMaps[0][node.value.args.newKeyField]
                                            || node.value.args.newKeyField;
            case ("XcalarApiMap"):
            case ("XcalarApiFilter"):
            case ("XcalarApiAggregate"):
                for (let i = 0; i < node.value.args.eval.length; i++) {
                    node.value.args.eval[i].evalString = XDParser.XEvalParser
                                .replaceColName(node.value.args.eval[i].evalString,
                                node.colNameMaps[0], aggregateNameMap, true);
                }
                break;
            case ("XcalarApiProject"):
                node.projectListCopy = node.value.args.columns;
                for (let i = 0; i < node.value.args.columns.length; i++) {
                    node.value.args.columns[i] = node.colNameMaps[0][node.value
                                .args.columns[i]] || node.value.args.columns[i];
                }
                break;
            case ("XcalarApiSynthesize"):
                for (let i = 0; i < node.value.args.columns.length; i++) {
                    node.value.args.columns[i].sourceColumn = node.colNameMaps[0]
                                    [node.value.args.columns[i].sourceColumn] ||
                                        node.value.args.columns[i].sourceColumn;
                }
                break;
            case ("XcalarApiIndex"):
                for (let i = 0; i < node.value.args.key.length; i++) {
                    node.value.args.key[i].name = node.colNameMaps[0][node.value
                        .args.key[i].name] || node.value.args.key[i].name;
                    node.value.args.key[i].keyFieldName = node.colNameMaps[0][node.value
                        .args.key[i].keyFieldName] || node.value.args.key[i].keyFieldName;
                }
                break;
            case ("XcalarApiJoin"):
                // Depend on the assertion that we never have collision on
                // the temp columns/renames generated during compilation
                // and we never rename left table column
                // Here only replacing right table renames
                node.colNameMaps[0] = node.colNameMaps[0] || {};
                node.colNameMaps[1] = node.colNameMaps[1] || {};
                // Replace names in key
                for (const i in node.value.args.key) {
                    if (node.value.args.key[i]) {
                        node.value.args.key[i] = node.value.args.key[i].map(colName => {
                            return node.colNameMaps[i][colName] || colName;
                        });
                    }
                }
                if (node.value.args.joinType === "leftSemiJoin" ||
                    node.value.args.joinType === "leftAntiJoin") {
                    node.colNameMaps[1] = {};
                }
                const leftCols = [];
                // We don't always rename right table, so need to also check left rename
                for (let i = 0; i < node.value.args.columns[0].length; i++) {
                    if (node.colNameMaps[0][node.value.args.columns[0][i].sourceColumn]) {
                        const rename = node.colNameMaps[0][node.value.args.columns[0][i].sourceColumn];
                        delete node.colNameMaps[0][node.value.args.columns[0][i].sourceColumn];
                        node.colNameMaps[0][node.value.args.columns[0][i].destColumn]
                                    = node.value.args.columns[0][i].destColumn;
                        node.value.args.columns[0][i].sourceColumn = rename;
                    }
                }
                Object.keys(node.colNameMaps[0]).forEach(function(col) {
                    leftCols.push(node.colNameMaps[0][col]);
                })
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    if (node.colNameMaps[1][node.value.args.columns[1][i].sourceColumn]) {
                        var rename = node.colNameMaps[1][node.value.args.columns[1][i].sourceColumn];
                        delete node.colNameMaps[1][node.value.args.columns[1][i].sourceColumn];
                        node.colNameMaps[1][node.value.args.columns[1][i].destColumn]
                                    = node.value.args.columns[1][i].destColumn;
                        node.value.args.columns[1][i].sourceColumn = rename;
                    }
                }
                if (node.value.args.keepAllColumns) {
                    Object.keys(node.colNameMaps[1]).forEach(function(col) {
                        if (leftCols.indexOf(node.colNameMaps[1][col]) !== -1) {
                            var newColRename = node.colNameMaps[1][col] +
                                            Authentication.getHashId().substring(2);
                            node.value.args.columns[1].push({
                                sourceColumn: node.colNameMaps[1][col],
                                destColumn: newColRename
                            });
                            node.colNameMaps[1][col] = newColRename;
                        }
                    });
                }
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMaps[0], aggregateNameMap, true);
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMaps[1], {}, true);
                break;
            case ("XcalarApiUnion"):
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.colNameMaps[i] = node.colNameMaps[i] || {};
                    for (var j = 0; j < node.value.args.columns[i].length; j++) {
                        node.value.args.columns[i][j].sourceColumn =
                            node.colNameMaps[i][node.value.args.columns[i][j].sourceColumn]
                            || node.value.args.columns[i][j].sourceColumn;
                    }
                }
                // Replace names in key
                for (const i in node.value.args.key) {
                    if (node.value.args.key[i]) {
                        node.value.args.key[i] = node.value.args.key[i].map(colName => {
                            return node.colNameMaps[i][colName] || colName;
                        });
                    }
                }
                break;
            case ("XcalarApiGetRowNum"):
                break;
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiRenameNode"):
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
}
if (typeof exports !== "undefined") {
    exports.DedupPlan = DedupPlan;
}
