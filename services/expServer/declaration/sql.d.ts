declare namespace SqlQueryHistory {
    export interface QueryUpdateInfo {
        queryId: string;
        status?: SQLStatus;
        queryString?: string;
        startTime?: number | Date;
        endTime?: number | Date;
        newTableName?: string;
        errorMsg?: string;
        dataflowId?: string;
        rows?: number;
        skew?: number;
        columns?: {name: string, backName: string, type: ColumnType}[];
    }

    export class QueryInfo {
        public queryId: string;
        public status: SQLStatus;
        public queryString: string;
        public startTime: number;
        public endTime: number;
        public tableName: string;
        public errorMsg: string;
        public dataflowId: string;
        public rows: number;
        public skew: number;
        public columns?: {name: string, backName: string, type: ColumnType}[];
    }
}

declare enum SQLErrTStr {
    LikeTwoChildren,
    CaseWhenOdd,
    CaseWhenElse,
    CaseWhenLastNode,
    CaseWhenParent,
    CaseWhenIdx,
    InChildrenLength,
    AggregateExpressionOne,
    AggregateFirstChildClass,
    AggregateChildrenLength,
    SubqueryAggregate,
    YMDLength,
    YMDCast,
    YMDDataType,
    YMDChildLength,
    YMDString,
    YMDGrandCast,
    YMDGrandLength,
    YMDIllegal,
    IgnoreOneChild,
    ProjectOneChild,
    ProjectAggAgg,
    GLChild,
    GLLength,
    GLDataType,
    GLLimitClass,
    FilterLength,
    NotAliasWindowExpr,
    NoWENode,
    BadGenGBArray,
    BadGenColStruct,
    NotARAgg,
    NoSortFirst,
    ExprInNtile,
    InvalidNtile,
    UnsupportedWindow,
    NoTable,
    NoKey,
    Cancel,
    NoSchema,
    Err,
    DecimalNodeChildren,
    ExpandWithoutAgg,
    IllegalGroupingCols,
    UnionChildren,
    WindowChildren,
    NonEmptyLR,
    SingleLR,
    LRParent,
    NameCollision,
    UnknownType,
    SortStructOrder,
    IllegalSortOrder,
    NullDefaultLead,
    BadGBCol,
    ProjectMismatch,
    ProjectRenameMistmatch,
    SortOneChild,
    CoalesceTwoChildren,
    XcAggOneChild,
    XcAggOneColumn,
    SubqueryName,
    SubqueryOneColumn,
    SubqueryNotAllowedInGroupBy,
    AggNotAllowedInGroupBy,
    GroupByNoReplacement,
    GrouyByFailure,
    JoinTwoChildren,
    JoinAndTreeTwoChildren,
    NoLeftTblForJoin,
    NoRightTblForJoin,
    UnsupportedJoin,
    UnexpectedTableName,
    NoNewTableName,
    NoLeftRowNumCol,
    NoLeftRowNumTableName,
    NoExistCol,
    JoinEqTreeTwoChildren,
    JoinConditionMismatch,
    AggTreeShouldCut,
    AggTreeShouldHaveAcc,
    AccShouldHaveEval,
    CondTreeChildren,
    SubqueryNoChild,
    SubqueryTree,
    AccSubqueryArray,
    UDFNoName,
    NonOpShouldHaveNoChildren,
    FirstChildAlias,
    NoDataType,
    EvalOnlyChildAttr,
    UnsupportedColType,
    UDFColumnMismatch,
    InvalidLogicalPlan,
    InvalidXcalarQuery,
    InvalidPageInfo,
    InvalidSQLTable,
    InvalidSQLQuery,
    InvalidSnippetMeta,
    FinalizingFailed,
    FailToConnectPlanner,
    InvalidColTypeForFinalize,
    SnippetNameExists,
    IdentifierExists,
    NoSnippet,
    NoResult,
    ResultDropped,
    InvalidEditorName,
    InvalidOuterType,
    FailedToRepublish,
    InvalidSnippetName,
    InvalidSourceId,
    InvalidParams,
    InvalidIdentifier,
    InvalidIdentifierMapping,
    SourceUsed,
    EmptySQL,
    NeedConfiguration,
    NoPublishedTable,
    NeedSQLMode,
    IdentifierMismatch,
    XdfExplodeString,
    ExpandMap,
    ExpandColLengthMismatch,
    NotLiteralGroupingId,
    PlannerFailure,
    XDFNotSupport,
    NoSupport,
    RangeWindowMultipleCol,
    UnsupportedOperator,
    DateTimeOneChild,
    UnixTimeTwoChildren,
    TimeIntervalTwoChildren,
    TimeIntervalType,
    UnsupportedIntervalType,
    DateFormatTwoChildren,
    DateFormatNotColumn,
    DateSubTwoChildren,
    SingleOperatorQueryMultipleSource,
    GroupByFailure,
    AggregateOneChild,
    NoRightRowNumTableName,
    NoRightRowNumCol,
    Warning,
    MultiQueries,
    DuplicateParamNames,
    NoInputColumn,
    CalendarIntervalFrame,
    BadBulkLoad
}

declare enum SQLStatus {
    Compiling = "Compiling",
    Running = "Running",
    Done = "Done",
    Cancelled = "Cancelled",
    Failed = "Failed",
    None = "None",
    Interrupted = "Interrupted"
}

declare enum SQLColumnType {
    "String" = "string",
    "Money" = "money",
    "Float" = "float",
    "Integer" = "int",
    "Boolean" = "bool",
    "Timestamp" = "timestamp"
}

interface SQLOptimizations {
    dropAsYouGo: boolean,
    randomCrossJoin: boolean,
    pushToSelect: boolean,
    dropSrcTables?: boolean,
    noOptimize?: boolean,
    deleteCompletely?: boolean,
    dedup?: boolean,
    combineProjectWithSynthesize?: boolean
}

interface SQLQueryInput {
    userName?: string,
    userId?: number,
    sessionName?: string,
    resultTableName?: string,
    queryString?: string,
    modifiedQueryString?: string,
    tablePrefix?: string,
    queryName?: string,
    optimizations?: SQLOptimizations,
    usePaging?: boolean,
    checkTime?: number,
    rowsToFetch?: number,
    execid?: number,
    limit?: any
}

interface SQLHistoryObj {
    queryId: string,
    status: SQLStatus,
    queryString?: string,
    startTime?: Date,
    endTime?: Date,
    tableName?: string
}

interface SQLWorkerData {
    sqlQueryObj: any,
    selectQuery: any,
    allSelects: any,
    params: SQLQueryInput,
    type: string
}

interface ScopeInfo {
    userName: string,
    workbookName: string
}

interface SQLAddPrefixReturnMsg {
    query: string,
    tableName: string
}

interface SQLColumn {
    colName?: string,
    colId?: number,
    rename?: string,
    colType?: SQLColumnType,
    udfColName?: string
}

interface SQLResult {
    tableName: string,
    columns: SQLColumn[],
    orderColumns: SQLColumn[]
}

interface SQLLoadInput {
    importTable: string,
    dsArgs: DSArgs,
    formatArgs: FormatArgs,
    txId: number,
    sqlDS: string
}

interface SQLLoadReturnMsg {
    tableName: string,
    xcTableName: string,
    schema: any
}

interface SQLPublishInput {
    importTable: string,
    publishName: string,
    txId?: number,
    sqlTable?: string,
    sessionInfo?: SessionInfo
}

interface SQLPublishReturnMsg {
    table: string,
    xcTableName: string,
    schema: any
}

interface SessionInfo {
    userName: string,
    userId: number,
    sessionName: string
}

interface XDTableInfo {
    pubTableName: string,
    tableName: string,
    isIMD: boolean,
    query?: XcalarSelectQuery,
    schema?: any,
    found?: boolean
}

interface SQLConnectResp {
    xcalarVersion: XcalarApiGetVersionOutput,
    newThrift: boolean,
}

interface TableInfo extends XcalarApiTableInfo {
    schema?: any
}
interface SQLOptimization {
    dropAsYouGo?: boolean;
    dropSrcTables?: boolean;
    randomCrossJoin?: boolean;
    pushToSelect?: boolean;
    dedup?: boolean;
    combineProjectWithSynthesize?: boolean;
}

interface SQLInfo {
    retName?: string,
    tableId?: string | number,
    srcTables?: string[],
    tableName?: string,
    tableNames?: string[],
    lTableName?: string,
    rTableName?: string,
    operation?: string
}

interface SQLOptimizedStruct {
    optimizedQueryString: string;
    aggregates: string[];
}
declare class SQLCompiler {
    static compile(sqlQueryObj: SQLQuery): XDPromise<any>
}

declare class SQLQuery {
    public queryId: string;
    public queryString: string;
    public logicalPlan: any;
    public optimizations: SQLOptimization;
    public xcQueryString?: string;
    public newTableName?: string;
    public runTxId?: number;
    public allColumns?: SQLColumn[];
    // For sql history
    public status?: SQLStatus;
    public startTime?: Date;
    public endTime?: Date;
    public errorMsg?: string;
    public dataflowId?: string;
    public dataSkew?: string;
    // For ExpServer invocation
    public fromExpServer?: boolean;
    public tablePrefix?: string;
    public checkTime?: number;

    constructor (
        queryId: string,
        queryString: string,
        logicalPlan: any,
        optimizations: SQLOptimization
    )
}

declare class SqlQueryHistory {
    public static getInstance(): SqlQueryHistory
    public upsertQuery(
        updateInfo: SqlQueryHistory.QueryUpdateInfo,
        scopeInfo?: {userName:string, workbookName: string}
    ): XDPromise<{isNew: boolean, queryInfo: SqlQueryHistory.QueryInfo}>
}

declare class SQLExecutor {
    static execute(sqlQueryObj: SQLQuery, scodeInfo: ScopeInfo): XDPromise<any>
}