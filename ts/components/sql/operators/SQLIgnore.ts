class SQLIgnore {
    static compile(node: TreeNode): XDPromise<any> {
        SQLUtil.assert(node.children.length === 1,
            SQLErrTStr.IgnoreOneChild + node.children.length);
        return PromiseHelper.resolve({
            "newTableName": node.children[0].newTableName,});
    }
}

if (typeof exports !== "undefined") {
    exports.SQLIgnore = SQLIgnore;
}