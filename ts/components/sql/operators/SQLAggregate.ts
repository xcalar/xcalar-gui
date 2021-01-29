class SQLAggregate {
    static compile(node: TreeNode): XDPromise<any> {
        // This is for Xcalar Aggregate which produces a single value
        SQLUtil.assert(node.subqVarName != null, SQLErrTStr.SubqueryName);
        const tableName = node.children[0].newTableName;
        let evalStr;
        if (node.value.aggregateExpressions) {
            SQLUtil.assert(node.value.aggregateExpressions.length === 1,
                           SQLErrTStr.SubqueryOneColumn +
                           node.value.aggregateExpressions.length);
            node.orderCols = [];
            // Edge case:
            // SELECT col FROM tbl GROUP BY col1

            // This is dangerous but Spark still compiles it to ScalarSubquery
            // It seems that Spark expects user to enforce the "single val" rule
            // In this case, col1 has a 1 to 1 mappping relation with col2.
            // Thus we can give it an aggOperator, such as max.
            const index = node.value.aggregateExpressions[0][0].class ===
                      "org.apache.spark.sql.catalyst.expressions.Alias" ? 1 : 0;
            const treeNode = SQLCompiler.genExpressionTree(undefined,
                                node.value.aggregateExpressions[0].slice(index),
                                undefined, node.tablePrefix);
            const options = {renamedCols: node.renamedCols, xcAggregate: true};
            const acc = {};
            evalStr = SQLCompiler.genEvalStringRecur(treeNode, acc, options);
            if (!acc["operator"]) {
                evalStr = "max(" + evalStr + ")";
            }
            node.colType = SQLCompiler.getColType(treeNode);
        } else {
            SQLUtil.assert(node.usrCols.length === 1,
                           SQLErrTStr.SubqueryOneColumn + node.usrCols.length);
            const colName = SQLCompiler.getCurrentName(node.usrCols[0]);
            evalStr = "max(" + colName + ")";
            node.colType = node.usrCols[0].colType;
        }
        return SQLSimulator.aggregateWithEvalStr(evalStr,
                                                tableName,
                                                node.subqVarName);
    }
}

if (typeof exports !== "undefined") {
    exports.SQLAggregate = SQLAggregate;
}