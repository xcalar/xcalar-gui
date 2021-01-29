class FilterPushUp {
    static pushFromJoin(
        opNode: XcOpNode,
        visitedMap: {[name: string]: XcOpNode}
    ): XcOpNode {
        if (visitedMap[opNode.name]) {
            return visitedMap[opNode.name];
        }
        for (let i = 0; i < opNode.children.length; i++) {
            FilterPushUp.pushFromJoin(opNode.children[i], visitedMap);
        }
        let retNode: XcOpNode = opNode;
        if (opNode.value.operation === "XcalarApiJoin" &&
            FilterPushUp.__findUDFInEvalString(opNode.value.args.evalString)) {
            const newEvalStruct = {
                "evalString": opNode.value.args.evalString,
                "newField": null
            };
            const newTableName = xcHelper.getTableName(opNode.value.args.dest) +
                                 "_TMPJOIN" + Authentication.getHashId();
            const filterObj = {
                "operation": "XcalarApiFilter",
                "args": {
                    "source": newTableName,
                    "dest": opNode.value.args.dest,
                    "eval": [newEvalStruct]
                }
            };
            const filterNode = new XcOpNode(opNode.name, filterObj,
                                            [newTableName]);
            filterNode.parents = opNode.parents;
            filterNode.children = [opNode];
            for (let i = 0; i < opNode.parents.length; i++) {
                const parent = opNode.parents[i];
                parent.children[parent.children.indexOf(opNode)] = filterNode;
            }
            opNode.value.args.evalString = "";
            opNode.parents = [filterNode];
            opNode.value.args.dest = newTableName;
            opNode.name = newTableName;
            visitedMap[newTableName] = opNode;
            retNode = filterNode;
        }
        visitedMap[retNode.name] = retNode;
        return retNode;
    }

    static __findUDFInEvalString(evalString: string): boolean {
        if (!evalString) return false;
        const evalStruct = XDParser.XEvalParser.parseEvalStr(evalString);
        return dfs(evalStruct);

        function dfs(evalStruct): boolean {
            if (evalStruct.type === "fn" &&
                evalStruct.fnName.indexOf(":") !== -1) return true;
            if (evalStruct.args) {
                for (const arg of evalStruct.args) {
                    if (dfs(arg)) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
}
if (typeof exports !== "undefined") {
    exports.FilterPushUp = FilterPushUp;
}