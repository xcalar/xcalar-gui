class TreeNode {
    public usrCols: SQLColumn[];
    public xcCols: SQLColumn[];
    public sparkCols: SQLColumn[];
    public renamedCols: SQLRenameColumns; // val is col name
    public orderCols: SQLColumn[];
    public dupCols: SQLDupColumns; // val is duplicated times;
    public newTableName: string;
    public value: any; // XXX should be specific when moving to scala
    public parent?: TreeNode;
    public children: TreeNode[];
    public colType?: SQLColumnType;
    public xcCli?: string;
    public tablePrefix: string;
    public usedColIds?: number[];
    public visited?: boolean;

    // For Aggregate
    public aggTree?: TreeNode;
    public subqueryTree?: TreeNode;
    public aggVariable?: string;
    public aggType?: SQLColumnType;
    public subqVarName?: string;
    
    // For Join
    public emptyProject?: boolean;
    public xcRemoveNull?: boolean;
    public nullSafe?: boolean;

    // For Expand
    public expand?: {
        groupingCols: SQLColumn[],
        groupingIds: number[],
        groupingColStruct: SQLColumn
    };

    // For Limit
    public order?: XcalarOrderingT;
    public sortColName?: string;

    // For predicate pushdown
    public targetName?: string;

    constructor(value: any, tablePrefix?: string) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            this.usrCols = [];
            this.xcCols = [];
            this.sparkCols = [];
            this.renamedCols = {};
            this.orderCols = [];
            this.dupCols = {};
            this.newTableName = value.xcTableName;
            this.tablePrefix = tablePrefix || "";
            const rdds = value.output;
            for (let i = 0; i < rdds.length; i++) {
                const acc = {numOps: 0};
                const options: SQLOption = {
                    prefix: this.tablePrefix
                }
                const evalStr = SQLCompiler.genEvalStringRecur(
                                SQLCompiler.genTree(undefined, rdds[i].slice(0),
                                this.tablePrefix), acc, options);
                if (acc.numOps > 0) {
                    console.info(rdds[i]);
                }
                const col = {colName: evalStr,
                             colId: rdds[i][0].exprId.id,
                             colType: SQLCompiler.convertSparkTypeToXcalarType(
                                                          rdds[i][0].dataType)};
                this.usrCols.push(col);
            }
        } else if (value.class == "org.apache.spark.sql.execution.PushDownPlanWrapper") {
            // These are leaf nodes
            this.usrCols = [];
            this.xcCols = [];
            this.sparkCols = [];
            this.renamedCols = {};
            this.orderCols = [];
            this.dupCols = {};
            this.targetName = "";
        }
        this.value = value;
        this.parent;
        this.children = [];
    }
}

if (typeof exports !== "undefined") {
    exports.TreeNode = TreeNode;
}