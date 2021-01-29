class SQLLocalRelation {
    static compile(node: TreeNode): XDPromise<any> {
        // Now only support empty localrelation, which represent tables
        // can be evaluated to empty from sql query without data on server
        SQLUtil.assert(node.value.data.length === 0, SQLErrTStr.NonEmptyLR);
        // Spark will replace operators after localrelation except union
        // Project/.../Filter => localrelation
        // inner/semi join => localrelation
        // outer join => project (add empty columns)
        // anti join => the other table (all rows are kept)
        // table intersect localrelation => localrelation
        // table except localrelation => table
        SQLUtil.assert(node.parent != null, SQLErrTStr.SingleLR);
        SQLUtil.assert(node.parent.value.class ===
                       "org.apache.spark.sql.catalyst.plans.logical.Union",
                       SQLErrTStr.LRParent +node.parent.value.class);
        node.xcCli = "";
        node.usrCols = [];
        node.renamedCols = {};
        node.value.output.forEach((array) => {
            node.usrCols.push(SQLCompiler.genSQLColumn(array[0], {renamedCols: node.renamedCols}));
        })
        return PromiseHelper.resolve();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLLocalRelation = SQLLocalRelation;
}