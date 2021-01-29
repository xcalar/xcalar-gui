class SelectPushDown {
    static pushToSelect(
        opNode: XcOpNode
    ): XcOpNode {
        const selectNodes = [];
        SelectPushDown.findSelects(opNode, {}, selectNodes);
        for (let i = 0; i < selectNodes.length; i++) {
            SelectPushDown.__pushUpSelect(selectNodes[i], {});
        }
        if (opNode.replaceWith) {
            opNode = opNode.replaceWith;
        }
        return opNode;
    }

    static findSelects(
        node: XcOpNode,
        visitedMap: {[name: string]: boolean},
        selectNodes: XcOpNode[]
    ): void {
        if (visitedMap[node.name]) {
            return;
        } else if (node.value.operation === "XcalarApiSelect") {
            selectNodes.push(node);
        } else {
            for (let i = 0; i < node.children.length; i++) {
                this.findSelects(node.children[i], visitedMap, selectNodes);
            }
        }
        visitedMap[node.name] = true;
    }

    static __pushUpSelect(
        curNode: XcOpNode,
        selectStruct: SQLSelectStruct
    ): boolean {
        let newTableName;
        let newSelectStruct;
        let newSelectNode;
        if (curNode.children.length > 1) {
            return true;
        }
        if (!selectStruct.args) {
            selectStruct.args = {};
        }
        if (!selectStruct.args.eval) {
            selectStruct.args.eval = {};
        }
        if (curNode.value.operation === "XcalarApiSelect") {
            selectStruct = curNode.value;
            selectStruct.colNameMap = {};
            for (let i = 0; i < selectStruct.args.columns.length; i++) {
                selectStruct.colNameMap[selectStruct.args.columns[i].destColumn]
                                    = selectStruct.args.columns[i].sourceColumn;
            }
        } else if (curNode.value.operation === "XcalarApiFilter") {
            if (selectStruct.args.eval.Maps) {
                return true;
            }
            // XXX should re-enable it when Select supports UDF
            if (curNode.value.args.eval[0].evalString.indexOf(":") > -1) {
                return true;
            }
            const filterString = XDParser.XEvalParser.replaceColName(
                                          curNode.value.args.eval[0].evalString,
                                          selectStruct.colNameMap, {}, true);
            if (selectStruct.args.eval.Filter && selectStruct.args.eval.Filter != "") {
                console.error("Multiple consecutive filters found!");
                selectStruct.args.eval.Filter = "and(" +
                                                selectStruct.args.eval.Filter +
                                                "," + filterString + ")";
            } else {
                selectStruct.args.eval.Filter = filterString;
            }
        } else if (curNode.value.operation === "XcalarApiMap") {
            if (selectStruct.args.eval.Maps) {
                console.error("Multiple consecutive maps found!");
                console.log(selectStruct.args.eval.Maps);
                console.log(curNode.value.args.eval);
                return true;
            } else {
                const maps = jQuery.extend(true, [], curNode.value.args.eval);
                for (let i = 0; i < maps.length; i++) {
                    // XXX should re-enable it when Select supports UDF
                    if (maps[i].evalString.indexOf(":") > -1) {
                        return true;
                    }
                    maps[i].evalString = XDParser.XEvalParser.replaceColName(
                                                  maps[i].evalString,
                                                  selectStruct.colNameMap,
                                                  {}, true);
                }
                for (let i = 0; i < maps.length; i++) {
                    if (selectStruct.colNameMap[maps[i].newField]) {
                        selectStruct.colNameMap[maps[i].newField] = maps[i].newField;
                        for (let j = 0; j < selectStruct.args.columns.length; j++) {
                            if (selectStruct.args.columns[j].destColumn ===
                                maps[i].newField) {
                                selectStruct.args.columns[j].sourceColumn =
                                                               maps[i].newField;
                                delete selectStruct.args.columns[j].destColumn;
                            }
                            break;
                        }
                    } else {
                        selectStruct.colNameMap[maps[i].newField] = maps[i].newField;
                        selectStruct.args.columns.push(
                                              {sourceColumn: maps[i].newField});
                    }
                }
                selectStruct.args.eval.Maps = maps;
            }
        } else if (curNode.value.operation === "XcalarApiProject") {
            const columns = [];
            const newColNameMap = {};
            for (let i = 0; i < curNode.value.args.columns.length; i++) {
                if (selectStruct.colNameMap[curNode.value.args.columns[i]]) {
                    newColNameMap[curNode.value.args.columns[i]] =
                        selectStruct.colNameMap[curNode.value.args.columns[i]];
                    columns.push({
                        sourceColumn: selectStruct.colNameMap[curNode.value.
                                                              args.columns[i]],
                        destColumn: curNode.value.args.columns[i]
                    });
                } else {
                    newColNameMap[curNode.value.args.columns[i]] =
                                                curNode.value.args.columns[i];
                    columns.push({sourceColumn: curNode.value.args.columns[i]});
                }
            }
            selectStruct.colNameMap = newColNameMap;
            selectStruct.args.columns = columns;
        } else if (curNode.value.operation === "XcalarApiSynthesize") {
            const columns = [];
            const newColNameMap = {};
            for (let i = 0; i < curNode.value.args.columns.length; i++) {
                const curColumn = curNode.value.args.columns[i];
                if (selectStruct.colNameMap[curColumn.sourceColumn]) {
                    newColNameMap[curColumn.destColumn] =
                        selectStruct.colNameMap[curColumn.sourceColumn];
                    columns.push({
                        sourceColumn: selectStruct.colNameMap[curColumn.
                                                              sourceColumn],
                        destColumn: curColumn.destColumn
                    });
                } else {
                    newColNameMap[curColumn.destColumn] = curColumn.sourceColumn;
                    columns.push({sourceColumn: curColumn.sourceColumn,
                                  destColumn: curColumn.destColumn});
                }
            }
            selectStruct.colNameMap = newColNameMap;
            selectStruct.args.columns = columns;
        } else {
            console.error("Invalid push up node: " + curNode.value.operation);
        }

        newTableName = xcHelper.getTableName(curNode.name) +
                                                     Authentication.getHashId();
        newSelectStruct = jQuery.extend(true, {}, selectStruct);
        newSelectStruct.args.dest = newTableName;

        delete newSelectStruct.colNameMap;
        newSelectNode = new XcOpNode(newTableName, newSelectStruct,
                                     newSelectStruct.args.source);

        if (curNode.parents.length === 0) {
            newSelectNode.value.args.dest = curNode.value.args.dest;
            curNode.replaceWith = newSelectNode;
            return;
        }

        const parentsAfterPush = [];
        for (let i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents[i].value.operation === "XcalarApiIndex") {
                SelectPushDown.__duplicateIndex(curNode.parents[i]);
            }
        }
        for (let i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents.indexOf(curNode.parents[i]) < i) {
                if (parentsAfterPush.indexOf(curNode.parents[i]) !== -1) {
                    parentsAfterPush.push(curNode.parents[i]);
                }
                continue;
            } else if (curNode.parents[i].value.operation === "XcalarApiIndex") {
                const innerStruct = jQuery.extend(true, {}, selectStruct);
                if (!SelectPushDown.__pushGBHelper(curNode.parents[i], innerStruct)) {
                    continue;
                }
            } else if (curNode.parents[i].value.operation === "XcalarApiGroupBy"
                && curNode.parents[i].value.args.groupAll) {
                const innerStruct = jQuery.extend(true, {}, selectStruct);
                if (!SelectPushDown.__pushGBHelper(curNode.parents[i], innerStruct)) {
                    continue;
                }
            } else if (curNode.parents[i].value.operation != "XcalarApiFilter"
                && curNode.parents[i].value.operation != "XcalarApiMap" &&
                curNode.parents[i].value.operation != "XcalarApiSynthesize"
                && curNode.parents[i].value.operation != "XcalarApiProject") {
                if (curNode.value.operation === "XcalarApiSelect") {
                    parentsAfterPush.push(curNode.parents[i]);
                    continue;
                }
            } else {
                const innerStruct = jQuery.extend(true, {}, selectStruct);
                if ((selectStruct.args.eval && selectStruct.args.eval.GroupBy)
                    || !this.__pushUpSelect(curNode.parents[i], innerStruct)) {
                    continue;
                }
            }
            for (let j = 0; j < curNode.parents[i].children.length; j++) {
                if (curNode.parents[i].children[j] === curNode) {
                    if (typeof curNode.parents[i].value.args.source === "string") {
                        curNode.parents[i].value.args.source = newTableName;
                    } else {
                        curNode.parents[i].value.args.source[j] = newTableName;
                    }
                    curNode.parents[i].sources[j] = newTableName;
                    curNode.parents[i].children[j] = newSelectNode;
                    newSelectNode.parents.push(curNode.parents[i]);
                }
            }
        }
        curNode.parents = parentsAfterPush;
    }

    // For every group by parent, make a copy of current index node for pushing select
    static __duplicateIndex(curNode: XcOpNode): void {
        const GBParents = [];
        const otherParents = [];
        for (let i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents[i].value.operation === "XcalarApiGroupBy") {
                // If there is only one parent, keep the node as it is
                if (i === curNode.parents.length - 1 && otherParents.length === 0) {
                    otherParents.push(curNode.parents[i]);
                } else {
                    GBParents.push(curNode.parents[i]);
                }
            } else {
                otherParents.push(curNode.parents[i]);
            }
        }
        if (GBParents.length === 0) {
            return;
        }
        for (let i = 0; i < GBParents.length; i++) {
            const indexStructCopy = jQuery.extend(true, {}, curNode.value);
            const indexTableCopyName = xcHelper.getTableName(curNode.name)
                                     + "_COPY_" + Authentication.getHashId();
            const indexNodeCopy = new XcOpNode(indexTableCopyName,
                                               indexStructCopy,
                                               [curNode.sources[0]]);
            indexNodeCopy.parents = [GBParents[i]];
            indexNodeCopy.children = [curNode.children[0]];
            indexNodeCopy.value.args.dest = indexTableCopyName;
            GBParents[i].children[GBParents[i].children.indexOf(curNode)] = indexNodeCopy;
            GBParents[i].sources[GBParents[i].sources.indexOf(curNode.name)] = indexNodeCopy.name;
            GBParents[i].value.args.source = indexNodeCopy.name;
            curNode.children[0].parents.push(indexNodeCopy);
        }
        curNode.parents = otherParents;
    }

    static __pushGBHelper(curNode: XcOpNode, selectStruct: SQLSelectStruct) {
        let indexCols = [];
        let gbNode;
        if (!selectStruct.args.eval) {
            selectStruct.args.eval = {};
        }
        const UniqueParents = [];
        for (let i = 0; i < curNode.parents.length; i++) {
            if (curNode.value.operation === "XcalarApiIndex" &&
                UniqueParents.indexOf(curNode.parents[i]) === -1) {
                UniqueParents.push(curNode.parents[i]);
            }
        }
        if (UniqueParents.length > 1) {
            return true;
        }
        if (curNode.value.operation === "XcalarApiGroupBy") {
            gbNode = curNode;
        } else if (curNode.parents.length === 0 ||
            curNode.parents[0].value.operation != "XcalarApiGroupBy") {
            return true;
        } else {
            gbNode = curNode.parents[0];
            indexCols = curNode.value.args.key.map(function(keyStruct) {
                return keyStruct.name;
            })
        }
        let valid = true;
        let hasAvg = false;
        // Change gb, add select gb, check & handle avg, create project to drop temp columns
        const newEvals = jQuery.extend(true, [], gbNode.value.args.eval);
        const selectGBs = [];
        const extraMapEvals = [];
        const annotations = curNode.value.args.groupAll ? [] :
            curNode.value.args.key.map(function(keyStruct) {
                return {sourceColumn: keyStruct.name,
                        destColumn: keyStruct.name,
                        columnType: keyStruct.type};
            });
        const selectColumns = annotations.map(function(col) {
            if (selectStruct.colNameMap[col.sourceColumn]) {
                return {sourceColumn: selectStruct.colNameMap[col.sourceColumn],
                        destColumn: col.sourceColumn};
            } else {
                return col;
            }
        })
        for (let j = 0; j < gbNode.value.args.eval.length; j++) {
            const curEval = gbNode.value.args.eval[j];
            if (curEval.evalString.indexOf("(") !== curEval.evalString.lastIndexOf("(")) {
                valid = false;
                break;
            }
            let opName = curEval.evalString.substring(0,curEval.evalString.indexOf("("));
            const aggColName = curEval.evalString.substring(
                curEval.evalString.indexOf("(") + 1, curEval.evalString.length - 1);
            if (opName === "listAgg") {
                console.warn("listAgg is not supported in push down group by to select");
                return true;
            } else if (opName === "avg" || opName === "avgNumeric") {
                hasAvg = true;
                let numericPart = "";
                const tempSelectCNTColName = "TMPSCNT_" + curEval.newField;
                const tempGBCNTColName = "TMPGCNT_" + curEval.newField;
                const tempSelectSUMColName = "TMPSSUM_" + curEval.newField;
                const tempGBSUMColName = "TMPGSUM_" + curEval.newField;
                newEvals[j].evalString = "sumInteger(" + tempSelectCNTColName + ")";
                newEvals[j].newField = tempGBCNTColName;
                if (opName === "avgNumeric") {
                    numericPart = "Numeric";
                }
                newEvals.push({evalString: "sum" + numericPart + "(" + tempSelectSUMColName + ")",
                               newField: tempGBSUMColName});
                selectGBs.push({func: "count", arg: selectStruct.colNameMap
                    [aggColName] || aggColName, newField: tempSelectCNTColName});
                selectGBs.push({func: "sum" + numericPart, arg: selectStruct.colNameMap
                    [aggColName] || aggColName, newField: tempSelectSUMColName});
                annotations.push({sourceColumn: curEval.newField,
                                  destColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempSelectCNTColName});
                selectColumns.push({sourceColumn: tempSelectSUMColName});
                extraMapEvals.push({evalString: "div" + numericPart + "("
                                    + tempGBSUMColName + "," + tempGBCNTColName + ")",
                                    newField: curEval.newField});
            } else if (opName === "count") {
                var tempColName = "TMPCNT_" + curEval.newField;
                newEvals[j].evalString = "sumInteger(" + tempColName + ")";
                selectGBs.push({func: "count", arg: selectStruct.colNameMap
                        [aggColName] || aggColName, newField: tempColName});
                annotations.push({sourceColumn: curEval.newField,
                                  destColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempColName});
            } else {
                const opNameTrunc = opName.substring(0,3);
                if (opNameTrunc === "max" || opNameTrunc === "min") {
                    opName = opNameTrunc;
                }
                const tempColName = "TMPGB_" + curEval.newField;
                newEvals[j].evalString = opName + "(" + tempColName + ")";
                selectGBs.push({func: opName, arg: selectStruct.colNameMap
                        [aggColName] || aggColName, newField: tempColName});
                annotations.push({sourceColumn: curEval.newField,
                                  destColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempColName});
            }
        }
        if (!valid) {
            return true;
        }
        const newProStruct = {dest: gbNode.name,
                              columns: annotations.map(function(col) {
                                  return col.sourceColumn;
                              })};
        const newProNode = new XcOpNode(gbNode.name,
                                        {operation: "XcalarApiProject",
                                         args: newProStruct},
                                        []);
        gbNode.value.args.eval = newEvals;
        if (hasAvg) {
            const newGBTableName = xcHelper.getTableName(gbNode.name)
                                    + "_GBCOPY_" + Authentication.getHashId();
            const newMapTableName = xcHelper.getTableName(gbNode.name)
                                        + "_GBMAP_" + Authentication.getHashId();
            const newMapStruct = {source: newGBTableName,
                                dest: newMapTableName,
                                eval: extraMapEvals,
                                icv: false};
            const newMapNode = new XcOpNode(newMapTableName,
                                            {operation: "XcalarApiMap",
                                             args: newMapStruct},
                                            [newGBTableName]);
            newMapNode.children = [gbNode];
            newMapNode.parents = [newProNode];
            newProNode.children = [newMapNode];
            newProNode.sources = [newMapTableName];
            newProNode.value.args.source = newMapTableName;
            if (gbNode.parents.length === 0) {
                // GB node is root
                gbNode.replaceWith = newProNode;
            } else {
                newProNode.parents = gbNode.parents;
                newProNode.parents.forEach(function(node) {
                    while (node.children.indexOf(gbNode) != -1) {
                        const index = node.children.indexOf(gbNode);
                        node.children[index] = newProNode;
                    }
                });
            }
            gbNode.value.args.dest = newGBTableName;
            gbNode.name = newGBTableName;
            gbNode.parents = [newMapNode];
        } else {
            const newGBTableName = xcHelper.getTableName(gbNode.name)
                                    + "_GBCOPY_" + Authentication.getHashId();
            newProNode.children = [gbNode];
            newProNode.sources = [newGBTableName];
            newProNode.value.args.source = newGBTableName;
            if (gbNode.parents.length === 0) {
                // GB node is root
                gbNode.replaceWith = newProNode;
            } else {
                newProNode.parents = gbNode.parents;
                newProNode.parents.forEach(function(node) {
                    while (node.children.indexOf(gbNode) != -1) {
                        const index = node.children.indexOf(gbNode);
                        node.children[index] = newProNode;
                    }
                });
            }
            gbNode.value.args.dest = newGBTableName;
            gbNode.name = newGBTableName;
            gbNode.parents = [newProNode];
        }
        const newTableName = xcHelper.getTableName(curNode.name) + "_SELECTCOPY_"
                                + Authentication.getHashId();
        const newSelectStruct = jQuery.extend(true, {}, selectStruct);
        newSelectStruct.args.dest = newTableName;
        newSelectStruct.args.eval.GroupByKeys = indexCols.map(function(colName) {
            return selectStruct.colNameMap[colName] || colName;
        })
        newSelectStruct.args.eval.GroupBys = selectGBs;
        newSelectStruct.args.columns = selectColumns;
        delete newSelectStruct.colNameMap;
        const newSelectNode = new XcOpNode(newTableName, newSelectStruct,
                                           [newSelectStruct.args.source]);
        if (curNode.value.operation === "XcalarApiIndex") {
            const newIndexTableName = xcHelper.getTableName(curNode.name) +
                                      "_INDEXCOPY_" + Authentication.getHashId();
            const newIndexStruct = jQuery.extend(true, {}, curNode.value);
            newIndexStruct.args.dest = newIndexTableName;
            newIndexStruct.args.source = newTableName;
            const newIndexNode = new XcOpNode(newIndexTableName, newIndexStruct,
                                              [newTableName]);
            newIndexNode.parents = [gbNode];
            newIndexNode.children = [newSelectNode];
            newSelectNode.parents.push(newIndexNode);
            gbNode.children = [newIndexNode];
            gbNode.sources = [newIndexTableName];
            gbNode.value.args.source = newIndexTableName;
        } else {
            newSelectNode.parents.push(gbNode);
            gbNode.children = [newSelectNode];
            gbNode.sources = [newTableName];
            gbNode.value.args.source = newTableName;
        }
    }
}
if (typeof exports !== "undefined") {
    exports.SelectPushDown = SelectPushDown;
}