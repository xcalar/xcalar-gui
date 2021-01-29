interface SQLColumn {
    colName?: string,
    colId?: number,
    rename?: string,
    colType?: SQLColumnType,
    udfColName?: string
}

interface SQLRenameColumns {
    [colId: number]: string // renamed column name
}

interface SQLDupColumns {
    [colId: number]: number // duplicated times
}

interface SQLSchema {
    tableName: string,
    tableColumns: {}[], // {column: type}[]
    xcTableName: string
}

interface SQLParserIdentifierStruct {
    name: string,
    rawName: string,
    sourceList: string[],
    target?: string
}

interface SQLParserStruct {
    sql: string,
    command?: {type: string, args: string[]},
    identifiers?: string[],
    newIdentifiers?: string[],
    functions?: {},
    newSql?: string,
    nonQuery?: boolean,
    parameters?: string[],
    SFTables?: string[],
    connector?: string,
    predicateTargets?: any,
    identifierMap?: {[key: string]: SQLParserIdentifierStruct}
}

interface SQLEvalStruct {
    newColName?: string;
    evalStr?: string;
    numOps?: number;
    colId?: number;
    countType?: string;
    colType?: SQLColumnType;
    isDistinct?: boolean;
    operator?: string;
    arguments?: string[]; // for first/last argument ignoreNulls, it's not used now
    // For group by
    groupBy?: boolean;
    aggColName?: string;
}

interface SQLAggEvalStruct {
    aggEvalStr: string;
    aggVarName: string;
    numOps: number;
    countType: string;
    colType: SQLColumnType;
}

interface SQLSubqueryStruct {
    subqueryTree: TreeNode
}

interface SQLOption {
    extractAggregates?: boolean;
    renamedCols?: SQLRenameColumns;
    groupBy?: boolean;
    prefix?: string;
    xcAggregate?: boolean;
    operator?: string;
    tableName?: string;
}

interface SQLAccumulator {
    evalStructArray?: SQLEvalStruct[];
    aggEvalStructArray?: SQLAggEvalStruct[];
    subqueryArray?: SQLSubqueryStruct[];
    numOps?: number;
    udfs?: string[];
    params?: string[];
    isDistinct?: boolean;
    noAssignOp?: boolean;
    operator?: string;
    arguments?: string[]; // for first/last argument ignoreNulls, it's not used now
}

interface SQLLoopStruct {
    // For windowing
    // XXX Give it a better name if possible
    cli: string;
    node: TreeNode;
    groupByCols?: SQLColumn[];
    sortColsAndOrder?: SQLSortStruct[];
    indexColStruct?: SQLColumn;
}

interface SQLSortStruct {
    name: string;
    type?: ColumnType;
    ordering: XcalarOrderingT;
    colId?: number;
}

interface SQLWindowOpStruct {
    newColStruct: SQLColumn;
    opName: string;
    args: SQLWindowOperatorArg[];
    frameInfo: SQLFrameInfo;
}

interface SQLWindowOperatorArg {
    colStruct?: SQLColumn;
    literalEval?: string;
    argType: SQLColumnType;
}

interface SQLFrameInfo {
    typeRow: boolean;
    lower: number;
    upper: number;
}

interface SQLWindowArgument {
    newCols: SQLColumn[];
    // For aggregate
    aggCols?: SQLWindowOperatorArg[]; // SQLColumn | string
    ops?: string[];
    frameInfo?: SQLFrameInfo;
    // For first/last
    ignoreNulls?: string[];
    // For nTile
    groupNums?: number[];
    // For lead/lag
    keyCols?: SQLWindowOperatorArg[]; // SQLColumn | string
    defaults?: SQLWindowOperatorArg[]; // SQLColumn | string
    offset?: number;
    tempColsToKeep?: SQLColumn[];
    colStructTrack?: SQLColumn[];
}

interface SQLWindowLeadMap {
    [key: number]: SQLWindowArgument;
}

interface SQLWindowStruct {
    agg?: SQLWindowArgument[];
    first?: SQLWindowArgument[];
    last?: SQLWindowArgument[];
    lead?: SQLWindowLeadMap;
    nTile?: SQLWindowArgument;
    rowNumber?: SQLWindowArgument;
    rank?: SQLWindowArgument;
    percentRank?: SQLWindowArgument;
    denseRank?: SQLWindowArgument;
    cumeDist?: SQLWindowArgument;
}

interface SQLWindowMapStruct {
    mainMapStr?: string;
    noWindow?: boolean;
    nestMapStrs?: string[];
    nestMapNames?: string[];
    windowColStructs?: SQLColumn[];
    noMap?: boolean;
    nestMapTypes?: SQLColumnType[];
    tempColsToKeep?: SQLColumn[];
}

interface SQLOptimization {
    dropAsYouGo?: boolean;
    dropSrcTables?: boolean;
    randomCrossJoin?: boolean;
    pushToSelect?: boolean;
    dedup?: boolean;
    combineProjectWithSynthesize?: boolean;
}

interface CliStruct {
    newTableName?: string;
    newColumns?: string[];
    renamedColumns?: string[];
    tempCols?: string[];
    cli?: string;
    newCols?: SQLColumn[]; // Used in SQLJoin
}

// Optimzier structs
interface SQLSelectStruct {
    operation?: string,
    args?: {
        source?: string,
        dest?: string,
        minBatchId?: number,
        maxBatchId?: number,
        columns?: {
            sourceColumn: string,
            destColumn?: string,
            columnType?: string
        }[],
        eval?: {
            Maps?: any,
            Filter?: string,
            GroupBy?: any
        }
    },
    colNameMap?: {}
}

interface SQLOptimizedStruct {
    optimizedQueryString: string;
    aggregates: string[];
}

interface XcOperator {
    operation: string;
    args: any;
    state?: string;
}
