class SQLSort {
    static compile(node: TreeNode): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let sortCli = "";
        SQLUtil.assert(node.children.length === 1,
                       SQLErrTStr.SortOneChild + node.children.length);
        const options: SQLOption = {renamedCols: node.renamedCols,
                                    tableName: node.children[0].newTableName,
                                    prefix: node.tablePrefix};
        const evalStructArray: SQLEvalStruct[] = [];
        const sortColsAndOrder = SQLSort.genSortStruct(node.value.order,
                                                      evalStructArray, options);
        const tableName = node.children[0].newTableName;
        const mapCols = [];
        node.orderCols = [];
        evalStructArray.forEach(function(tempColInfo) {
            const tempColStruct = {colName: tempColInfo.newColName,
                                   colType: tempColInfo.colType};
            mapCols.push(tempColStruct);
            node.orderCols.push(tempColStruct);
        });
        sortColsAndOrder.forEach(function(col) {
            for (let i = 0; i < node.usrCols.length; i++) {
                if (node.usrCols[i].colId === col.colId) {
                    node.orderCols.push(node.usrCols[i]);
                    break;
                }
            }
        });
        SQLSort.__handleSortMap(node, evalStructArray, tableName)
        .then(function(ret) {
            sortCli += ret.cli;
            return SQLSimulator.sort(sortColsAndOrder, ret.newTableName);
        })
        .then(function(ret) {
            ret.cli = sortCli + ret.cli;
            node.xcCols = node.xcCols.concat(mapCols);
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __handleSortMap(
        node: TreeNode,
        maps: SQLEvalStruct[],
        tableName: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        if (maps.length === 0) {
            deferred.resolve({newTableName: tableName, cli: ""});
        } else {
            const newTableName = xcHelper.getTableName(tableName) +
                                            Authentication.getHashId();
            const colNameSet: Set<string> = new Set();
            node.usrCols.concat(node.xcCols).concat(node.sparkCols)
            .map(function (col) {
                colNameSet.add(SQLCompiler.getCurrentName(col));
            });
            SQLWindow.windowMapHelper(node, maps.map((item) => {
                                    return item.evalStr;
                                }), tableName, maps.map((item) => {
                                    return item.newColName;
                                }), newTableName, colNameSet)
            .then(deferred.resolve)
            .fail(deferred.reject);
        }
        return deferred.promise();
    }

    static genSortStruct(
        orderArray: any[],
        evalStructArray: SQLEvalStruct[],
        options: SQLOption
    ): SQLSortStruct[] {
        const sortColsAndOrder: SQLSortStruct[] = [];
        const colNameSet = new Set();
        for (let i = 0; i < orderArray.length; i++) {
            let order = orderArray[i][0].direction.object;
            SQLUtil.assert(orderArray[i][0].class ===
                    "org.apache.spark.sql.catalyst.expressions.SortOrder",
                    SQLErrTStr.SortStructOrder + orderArray[i][0].class);
            order = order.substring(order.lastIndexOf(".") + 1);
            if (order === "Ascending$") {
                order = XcalarOrderingT.XcalarOrderingAscending;
            } else if (order === "Descending$") {
                order = XcalarOrderingT.XcalarOrderingDescending;
            } else {
                console.error("Unexpected sort order");
                SQLUtil.assert(false, SQLErrTStr.IllegalSortOrder + order);
            }
            let colName, type, id;
            if (orderArray[i][1].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                colName = SQLCompiler.cleanseColName(orderArray[i][1].name);
                id = orderArray[i][1].exprId.id;
                if (options && options.renamedCols && options.renamedCols[id]) {
                    colName = options.renamedCols[id];
                }
                type = SQLCompiler.convertSparkTypeToXcalarType(
                                                     orderArray[i][1].dataType);
            } else {
                // Here don't check duplicate expressions, need optimization
                let tableId = xcHelper.getTableId(options.tableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                colName = "XC_SORT_COL_" + i + "_"
                        + Authentication.getHashId().substring(3) + "_"
                        + tableId;
                const orderNode = SQLCompiler.genExpressionTree(undefined,
                                                        orderArray[i].slice(1),
                                                        undefined,
                                                        options.prefix);
                type = SQLCompiler.getColType(orderNode);
                evalStructArray.push({
                    newColName: colName,
                    evalStr: SQLCompiler.genEvalStringRecur(orderNode,
                                                            undefined, options),
                    colType: type
                });
            }

            if (!colNameSet.has(colName)) {
                colNameSet.add(colName);
                sortColsAndOrder.push({name: colName,
                                       type: xcHelper.convertSQLTypeToColType(type),
                                       ordering: order,
                                       colId: id});
            }
        }
        return sortColsAndOrder;
    }
}

if (typeof exports !== "undefined") {
    exports.SQLSort = SQLSort;
}