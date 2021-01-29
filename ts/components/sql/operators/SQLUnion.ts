class SQLUnion {
    static compile(node: TreeNode): XDPromise<any> {
        // Union has at least two children
        SQLUtil.assert(node.children.length > 1,
                       SQLErrTStr.UnionChildren + node.children.length);
        // If only 1 of children is not localrelation,
        // skip the union and handle column info
        let unionType = UnionOperatorT.UnionStandard;
        if (node.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Intersect") {
            unionType = UnionOperatorT.UnionIntersect;
        } else if (node.value.class ===
                   "org.apache.spark.sql.catalyst.plans.logical.Except") {
            unionType = UnionOperatorT.UnionExcept;
        }
        const validChildrenIds = SQLUnion.__findValidChildren(node);
        if (validChildrenIds.length === 1 && validChildrenIds[0] != 0) {
            const lrChild = node.children[0];
            const validChild = node.children[validChildrenIds[0]];
            node.newTableName = validChild.newTableName;
            node.usrCols = jQuery.extend(true, [], validChild.usrCols);
            node.xcCols = jQuery.extend(true, [], validChild.xcCols);
            node.sparkCols = jQuery.extend(true, [], validChild.sparkCols);
            node.renamedCols = {};
            for (let i = 0; i < lrChild.usrCols.length; i++) {
                const newColName = lrChild.usrCols[i].colName;
                const newColId = lrChild.usrCols[i].colId;
                node.usrCols[i].colId = newColId;
                if (SQLCompiler.getCurrentName(node.usrCols[i]) != newColName) {
                    node.usrCols[i].rename = newColName;
                    node.renamedCols[newColId] = newColName;
                } else if (node.usrCols[i].rename) {
                    node.renamedCols[newColId] = node.usrCols[i].rename;
                }
            }
            return PromiseHelper.resolve();
        } else {
            const validChild = node.children[0];
            node.usrCols = jQuery.extend(true, [], validChild.usrCols);
            node.xcCols = jQuery.extend(true, [], validChild.xcCols);
            node.sparkCols = jQuery.extend(true, [], validChild.sparkCols);
            node.renamedCols = jQuery.extend(true, {}, validChild.renamedCols);
            if (validChildrenIds.length === 1) {
                node.newTableName = validChild.newTableName;
                return PromiseHelper.resolve();
            }
        }
        const tableInfos = [];
        const colRenames = node.children[0].usrCols;
        for (let i = 0; i < node.children.length; i++) {
            const unionTable = node.children[i];
            if (unionTable.value.class ===
                "org.apache.spark.sql.catalyst.plans.logical.LocalRelation") {
                continue;
            }
            const unionCols = unionTable.usrCols;
            const columns = [];
            if (node.children[i].emptyProject) {
                columns.push({
                    name: "xcalarRecordNum",
                    rename: "xcalarRecordNum",
                    type: ColumnType.integer,
                    cast: false
                });
            } else {
                for (let j = 0; j < unionCols.length; j++) {
                    const colType = xcHelper.convertSQLTypeToColType(
                                                            unionCols[j].colType);
                    columns.push({
                        name: SQLCompiler.getCurrentName(unionCols[j]),
                        rename: SQLCompiler.getCurrentName(colRenames[j]),
                        type: colType,
                        cast: false // Should already be casted by spark
                    });
                }
            }
            tableInfos.push({
                tableName: unionTable.newTableName,
                columns: columns
            });
        }
        // We now support union w/ deduplication as Spark converts it into a
        // groupBy without aggregation on all columns we need.
        // XXX Since we support dedup flag, we may consider optimization.
        // It will save us one groupBy.
        return SQLSimulator.union(tableInfos, false, undefined, unionType);
    }

    static __findValidChildren(node: TreeNode): number[] {
        const validIds = [];
        for (let i = 0; i < node.children.length; i++) {
            if (node.children[i].value.class !=
                "org.apache.spark.sql.catalyst.plans.logical.LocalRelation") {
                validIds.push(i);
            }
        }
        return validIds;
    }
}

if (typeof exports !== "undefined") {
    exports.SQLUnion = SQLUnion;
}