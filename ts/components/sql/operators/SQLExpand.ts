class SQLExpand {
    static compile(node: TreeNode): XDPromise<any> {
        // Only support expand followed by aggregate node
        SQLUtil.assert(node.parent.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Aggregate",
            SQLErrTStr.ExpandWithoutAgg + node.parent.value.class);
        node.orderCols = [];
        node.newTableName = node.children[0].newTableName;
        const groupingCols = [];
        const projections = node.value.projections;
        node.value.output.forEach(function(item) {
            groupingCols.push(SQLCompiler.genSQLColumn(item[0],
                                              {renamedCols: node.renamedCols}));
        });
        // Last element of expand-output should be spark_grouping_id
        SQLUtil.assert(groupingCols[groupingCols.length - 1].colName ===
                "SPARK_GROUPING_ID", SQLErrTStr.IllegalGroupingCols +
                groupingCols[groupingCols.length - 1].colName);
        const groupingIds = [];
        const idChangeMap = {};

        for (let i = 0; i < projections.length; i++) {
            for (let j = 0; j < projections[i].length; j++) {
                SQLUtil.assert(projections[i][j].length === 1,
                               SQLErrTStr.ExpandMap);
                if (projections[i][j][0].exprId) {
                    SQLUtil.assert(groupingCols[j],
                                   SQLErrTStr.ExpandColLengthMismatch);
                    idChangeMap[projections[i][j][0].exprId.id]
                                                = groupingCols[j].colId;
                }
            }
            const idStruct = projections[i][projections[i].length - 1][0];
            SQLUtil.assert(idStruct.class ===
                        "org.apache.spark.sql.catalyst.expressions.Literal" &&
                        idStruct.dataType === "integer",
                        SQLErrTStr.NotLiteralGroupingId + idStruct.class);
            groupingIds.push(Number(idStruct.value));
        }
        node.sparkCols.push(groupingCols[groupingCols.length - 1]);
        // Assign new column id to usrCols
        for (let i = 0; i < node.usrCols.length; i++) {
            if (idChangeMap[node.usrCols[i].colId]) {
                node.usrCols[i].colId = idChangeMap[node.usrCols[i].colId];
            }
        }
        const newRenames = SQLCompiler.resolveCollision([], node.usrCols
                                .concat(node.xcCols).concat(node.sparkCols), [],
                                [], "", node.newTableName);
        node.renamedCols = SQLCompiler.combineRenameMaps([node.renamedCols,
                                                                   newRenames]);
        node.parent.expand = {
                        groupingCols: groupingCols,
                        groupingIds: groupingIds,
                        groupingColStruct: groupingCols[groupingCols.length - 1]
        };
        return PromiseHelper.resolve();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLExpand = SQLExpand;
}