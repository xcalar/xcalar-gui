class ParquetPushDown {
    static pushToLoad(opNode: XcOpNode): XcOpNode {
        // Two parts: 1. columns of interests 2. filters
        const leafNodes = [];
        LogicalOptimizer.findLeafNodes(opNode, {}, leafNodes);
        leafNodes.forEach((node) => {
            if (node.value.operation === "XcalarApiBulkLoad" &&
                node.value.args.loadArgs.parseArgs.parserFnName.indexOf(
                    "default:parseParquet") > -1) {
                const parseArgsJson = JSON.parse(node.value.args.loadArgs
                                                  .parseArgs.parserArgJson);
                const upperColumnMap = {};
                const partitionKeys = parseArgsJson.partitionKeys;
                // push synthesize
                const finalColumns = [];
                const synthesizeNode = ParquetPushDown.__findFirstOperator(node,
                                                     "XcalarApiSynthesize", {});
                if (synthesizeNode != null) {
                    synthesizeNode.value.args.columns.forEach((column) => {
                        const colName = xcHelper.parsePrefixColName(column
                                                        .sourceColumn).name;
                        upperColumnMap[colName.toUpperCase()] = colName;
                        finalColumns.push(colName);
                    });
                }
                if (finalColumns.length > 0) {
                    parseArgsJson.columns = finalColumns;
                }
                // push filter
                if (partitionKeys && Object.keys(partitionKeys).length > 0) {
                    const filterNode = ParquetPushDown.__findFirstOperator(node,
                                                         "XcalarApiFilter", {});
                    filterNode.value.args.eval.forEach((evalStruct) => {
                        const retStruct = ParquetPushDown.__getPartitionKey(
                                                         evalStruct.evalString);
                        for (const key in retStruct) {
                            const origName = upperColumnMap[key.toUpperCase()];
                            if (origName &&
                                partitionKeys.hasOwnProperty(origName)) {
                                partitionKeys[origName] = retStruct[key];
                            }
                        }
                    });
                }
                node.value.args.loadArgs.parseArgs.parserArgJson =
                                              JSON.stringify(parseArgsJson);
            }
        });
        return opNode;
    }

    static __findFirstOperator(
        node: XcOpNode,
        opName: string,
        visitedMap: {[name: string]: boolean}
    ): XcOpNode {
        if (visitedMap[node.name]) {
            return;
        } else if (node.value.operation === opName) {
            return node;
        } else if (node.parents.length === 1) {
            visitedMap[node.name] = true;
            return this.__findFirstOperator(node.parents[0], opName, visitedMap);
        } else {
            return null;
        }
    }

    static __getPartitionKey(evalStr: string): {[name: string]: string[]} {
        let evalStruct;
        const partitionStruct = {};
        evalStruct = XDParser.XEvalParser.parseEvalStr(evalStr, true);
        ParquetPushDown.__getPartitionHelper(evalStruct, partitionStruct);
        return partitionStruct;
    }

    static __getPartitionHelper(
        evalStruct: ParsedEval,
        partitionStruct: {[name: string]: string[]}
    ): void  {
        function getValueFromString(arg: {value: string, type: string}): any {
            let curValue: any = arg.value;
            switch (arg.type) {
                case ("stringLiteral"): {
                    curValue = curValue.substring(1, curValue.length - 1);
                    break;
                }
                case ("booleanLiteral"): {
                    curValue = curValue === "true";
                    break;
                }
                default: {
                    curValue = Number(curValue);
                    break;
                }
            }
            return curValue;
        }
        if (evalStruct.type === "fn") {
            if (evalStruct.fnName === "and") {
                this.__getPartitionHelper(evalStruct.args[0] as ParsedEval,
                                          partitionStruct);
                this.__getPartitionHelper(evalStruct.args[1] as ParsedEval,
                                          partitionStruct);
            } else if (evalStruct.fnName === "in") {
                if (evalStruct.args[0].type !== "columnArg") {
                    return;
                }
                const valueList = [];
                for (let i = 1; i < evalStruct.args.length; i++) {
                    if (evalStruct.args[i].type.indexOf("Literal") === -1) {
                        return;
                    } else {
                        const curValue = getValueFromString(
                                           evalStruct.args[i] as ParsedEvalArg);
                        if (partitionStruct[evalStruct.args[0]["value"]]) {
                            if (partitionStruct[evalStruct.args[0]["value"]]
                                        .indexOf(curValue) !== -1) {
                                valueList.push(curValue);
                            }
                        } else {
                            valueList.push(curValue);
                        }
                    }
                }
                if (valueList.length !== 0) {
                    partitionStruct[evalStruct.args[0]["value"]] = valueList;
                }
            } else if (evalStruct.fnName === "eq" || evalStruct.fnName === "eqNonNull") {
                if (evalStruct.args[0].type === "columnArg" &&
                evalStruct.args[1].type.indexOf("Literal") !== -1) {
                    const curValue = getValueFromString(
                                           evalStruct.args[1] as ParsedEvalArg);
                    partitionStruct[evalStruct.args[0]["value"]] = [curValue];
                } else if (evalStruct.args[1].type === "columnArg" &&
                    evalStruct.args[0].type.indexOf("Literal") !== -1) {
                    const curValue = getValueFromString(
                                           evalStruct.args[0] as ParsedEvalArg);
                    partitionStruct[evalStruct.args[1]["value"]] = [curValue];
                }
            }
        }
        return;
    }
}
if (typeof exports !== "undefined") {
    exports.ParquetPushDown = ParquetPushDown;
}