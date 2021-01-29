class SQLGlobalLimit {
    static compile(node: TreeNode): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        SQLUtil.assert(node.children.length === 1,
                       SQLErrTStr.GLChild + node.children.length);
        SQLUtil.assert(node.value.limitExpr.length === 1,
                       SQLErrTStr.GLLength + node.value.limitExpr.length);
        let limit;
        if (node.value.limitExpr[0].class ===
            "org.apache.spark.sql.catalyst.expressions.Literal") {
            SQLUtil.assert(node.value.limitExpr[0].dataType === "integer",
                       SQLErrTStr.GLDataType + node.value.limitExpr[0].dataType);
            limit = parseInt(node.value.limitExpr[0].value);
        } else {
            SQLUtil.assert(node.value.limitExpr[0].class ===
                "org.apache.spark.sql.catalyst.expressions.XCEParameter",
                SQLErrTStr.GLLimitClass + node.value.limitExpr[0].class);
            if (node.value.limitExpr[0].paramType === "integer") {
                limit = node.value.limitExpr[0].name;
            } else {
                limit = "int(" + node.value.limitExpr[0].name + ")";
            }
        }
        const tableName = node.children[0].newTableName;
        let tableId = xcHelper.getTableId(tableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        const colName = "XC_ROW_COL_" +
                        Authentication.getHashId().substring(3) + "_" + tableId;
        let cli = "";

        SQLSimulator.genRowNum(tableName, colName)
        .then(function(ret) {
            const newTableName = ret.newTableName;
            cli += ret.cli;
            node.xcCols.push({colName: colName, colType: SQLColumnType.Integer});
            const filterString = "le(" + colName + "," + limit + ")";
            return SQLSimulator.filter(filterString, newTableName);
        })
        .then(function(ret) {
            const newTableName = ret.newTableName;

            cli += ret.cli;
            // If any descendents are sorted, sort again. Else return as is.

            const sortObj = SQLGlobalLimit.__getPreviousSortOrder(node);
            if (sortObj && limit > 1) {
                SQLSimulator.sort([{ordering: sortObj.ordering,
                                    name: sortObj.name}], newTableName)
                .then(function(ret2) {
                    cli += ret2.cli;
                    deferred.resolve({newTableName: ret2.newTableName,
                                      cli: cli});
                })
                .fail(deferred.reject);
            } else {
                deferred.resolve({newTableName: newTableName,
                                  cli: cli});
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    static __getPreviousSortOrder(
        curNode: TreeNode
    ): {
        name: string,
        ordering: XcalarOrderingT,
        type?: ColumnType
    } {
        if (!curNode) {
            return;
        }
        if (curNode.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Sort") {
            return {ordering: curNode.order, name: curNode.sortColName};
        } else {
            if (curNode.children.length > 1) {
                // Sort order doesn't make sense if > 1 children
                return;
            } else {
                return this.__getPreviousSortOrder(curNode.children[0]);
            }
        }
    }
}

if (typeof exports !== "undefined") {
    exports.SQLGlobalLimit = SQLGlobalLimit;
}