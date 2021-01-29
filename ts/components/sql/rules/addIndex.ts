class AddIndex {
    static addIndexForCrossJoin(
        opNode: XcOpNode,
        visitedMap: {[name: string]: XcOpNode}
    ): XcOpNode {
        if (visitedMap[opNode.name]) {
            return visitedMap[opNode.name];
        }
        for (let i = 0; i < opNode.children.length; i++) {
            opNode.children[i] = AddIndex.addIndexForCrossJoin(opNode.children[i],
                                                               visitedMap);
        }
        if (opNode.value.operation === "XcalarApiJoin" &&
            opNode.value.args.joinType === "crossJoin") {
            for (let i = 0; i < opNode.children.length; i++) {
                const childNode = opNode.children[i];
                if (childNode.value.args.operation !== XcalarApisT.XcalarApiIndex) {
                    const newTableName = xcHelper.getTableName(
                                            childNode.value.args.dest) +
                                            "_index" +
                                            Authentication.getHashId();
                    const indexObj = {
                        "operation": "XcalarApiIndex",
                        "args": {
                            "source": childNode.name,
                            "dest": newTableName,
                            "key": [
                                {
                                    "name": "xcalarRecordNum",
                                    "keyFieldName": "xcalarRecordNum",
                                    "type": "DfInt64",
                                    "ordering": "Unordered"
                                }
                            ],
                            "prefix": "",
                            "dhtName": "systemRandomDht",
                            "delaySort": false,
                            "broadcast": false
                        }
                    };
                    const indexNode = new XcOpNode(newTableName, indexObj,
                                                   childNode.value.args.dest);
                    indexNode.parents = [opNode];
                    indexNode.children = [childNode];
                    childNode.parents = [indexNode];
                    opNode.children[i] = indexNode;
                    opNode.value.args.source[i] = newTableName;
                }
            }
        }
        visitedMap[opNode.name] = opNode;
        return opNode;
    }
}
if (typeof exports !== "undefined") {
    exports.AddIndex = AddIndex;
}