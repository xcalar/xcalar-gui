class SQLFilter {
    static compile(node: TreeNode): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        SQLUtil.assert(node.children.length === 1,
                       SQLErrTStr.FilterLength + node.children.length);
        let tree = SQLCompiler.genTree(undefined, node.value.condition.slice(0),
                                       node.tablePrefix);
        tree = SQLFilter.__removeExtraExists(tree, node.usedColIds);
        if (tree == undefined) {
            deferred.resolve({
                "newTableName": node.children[0].newTableName,
                "cli": ""
            });
            return deferred.promise();
        }
        const treeNode = SQLCompiler.secondTraverse(tree,
                                            {extractAggregates: true}, true,
                                            node.tablePrefix);

        const aggEvalStructArray: SQLAggEvalStruct[] = [];
        const subqueryArray: SQLSubqueryStruct[] = [];
        const options: SQLOption = {
            renamedCols: node.renamedCols,
            xcAggregate: true,
            prefix: node.tablePrefix
        };
        const filterString = SQLCompiler.genEvalStringRecur(treeNode,
                                        {aggEvalStructArray: aggEvalStructArray,
                                         subqueryArray: subqueryArray}, options);

        let cliStatements = "";

        const tableName = node.children[0].newTableName;
        SQLCompiler.produceAggregateCli(aggEvalStructArray, tableName)
        .then(function(cli) {
            cliStatements += cli;
            return SQLCompiler.produceSubqueryCli(subqueryArray);
        })
        .then(function(cli) {
            cliStatements += cli;
            return SQLSimulator.filter(filterString, tableName);
        })
        .then(function(retStruct) {
            cliStatements += retStruct.cli;
            deferred.resolve({
                "newTableName": retStruct.newTableName,
                "cli": cliStatements
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __removeExtraExists(node: TreeNode, usedColIds: number[]): TreeNode {
        function getFragments(node: TreeNode, subtrees: TreeNode[]) {
            const opName = node.value.class.substring(
                            node.value.class.lastIndexOf(".") + 1);
            if (opName === "IsNotNull") {
                if (node.children[0].value.class !=
                "org.apache.spark.sql.catalyst.expressions.AttributeReference"
                || usedColIds.indexOf(node.children[0].value.exprId.id) === -1) {
                    subtrees.push(node);
                }
            } else if (opName === "And") {
                getFragments(node.children[0], subtrees);
                getFragments(node.children[1], subtrees);
            } else {
                subtrees.push(node);
            }
        }
        const subtrees = [];
        getFragments(node, subtrees);
        if (subtrees.length === 0) {
            return undefined;
        } else if (subtrees.length === 1) {
            return subtrees[0];
        } else {
            const retNode = TreeNodeFactory.getAndNode();
            let curNode = retNode;
            curNode.children[0] = subtrees[0];
            for (let i = 1; i < subtrees.length - 1; i++) {
                const tempNode = TreeNodeFactory.getAndNode();
                curNode.children[1] = tempNode;
                tempNode.children[0] = subtrees[i];
                curNode = tempNode;
            }
            curNode.children[1] = subtrees[subtrees.length - 1];
            return retNode;
        }
    }
}

if (typeof exports !== "undefined") {
    exports.SQLFilter = SQLFilter;
}