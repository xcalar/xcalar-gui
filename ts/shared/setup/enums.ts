enum RowDirection {
    Top = 1,
    Bottom = 2
}

enum TableType {
    Active = "active",
    Orphan = "orphaned",
    WSHidden = "hidden",
    Unknown = "unknown source",
    Trash = "trashed",
    Aggregate = "aggregate",
    Dropped = "dropped"
}

enum ColDir {
    Left = "L",
    Right = "R"
}

enum ColFormat {
    Default = "default",
    Percent = "percent"
}

enum ColTextAlign {
    Left = "Left",
    Right = "Right",
    Center = "Center",
    Wrap = "Wrap"
}

enum ColSizeTo {
    All = "all",
    Header = "header",
    Contents = "contents",
    Auto = "auto"
}

enum ColumnType {
    array = "array",
    boolean = "boolean",
    float = "float",
    integer = "integer",
    mixed = "mixed",
    number = "number",
    object = "object",
    string = "string",
    timestamp = "timestamp",
    money = "money",
    undefined = "undefined",
    unknown = "unknown"
}

enum ColumnSortType {
    name = "name",
    type = "type",
    prefix = "prefix"
}

enum ColumnSortOrder {
    ascending = -1,
    descending = 1
}

enum DSObjTerm {
    homeDir = ".",
    homeDirId = ".",
    homeParentId = ".parent",
    SharedFolder = "Shared",
    SharedFolderId = ".shared",
}

enum DSFormat {
    JSON ="JSON",
    JSONL="JSONL",
    SpecialJSON = "SpecialJSON",
    CSV = "CSV",
    XML = "XML"
}

var fakeEvent: any = {
    "click"     : {"type": "click", "which": 1},
    "dblclick"  : {"type": "click", "which": 1},
    "mouseup"   : {"type": "mouseup", "which": 1},
    "mousedown" : {"type": "mousedown", "which": 1},
    "mouseenter": {"type": "mouseenter", "which": 1},
    "mouseleave": {"type": "mouseleave", "which": 1},
    "enter"     : {"type": "keypress", "which": 13},
    "enterKeydown": {"type": "keydown", "which": 13},
    "enterKeyup": {"type": "keyup", "which": 13},
    "input": {"type": "input"}
};

enum keyCode {
    Backspace = 8,
    Tab = 9,
    Enter = 13,
    Shift = 16,
    Ctrl = 17,
    Alt = 18,
    PauseBreak = 19,
    Caps = 20,
    Escape = 27,
    Space = 32,
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
    Insert = 45,
    Delete = 46,
    Zero = 48,
    One = 49,
    Two = 50,
    Three = 51,
    Four = 52,
    Five = 53,
    Six = 54,
    Seven = 55,
    Eight = 56,
    Nine = 57,
    Multiply = 106,
    Add = 107,
    Subtract = 109,
    DecimalPoint = 110,
    Divide = 111,
    SemiColon = 186,
    Equal = 187,
    Comma = 188,
    Dash = 189,
    Period = 190,
    SingleQuote = 222,
    PageDown = 34,
    PageUp = 33,
    Home = 36,
    End = 35,
    S = 83, // for save
    Y = 89, // for redo
    Z = 90
}

var letterCode: any = {
    "65": "a",
    "66": "b",
    "67": "c",
    "68": "d",
    "69": "e",
    "70": "f",
    "71": "g",
    "72": "h",
    "73": "i",
    "74": "j",
    "75": "k",
    "76": "l",
    "77": "m",
    "78": "n",
    "79": "o",
    "80": "p",
    "81": "q",
    "82": "r",
    "83": "s",
    "84": "t",
    "85": "u",
    "86": "v",
    "87": "w",
    "88": "x",
    "89": "y",
    "90": "z"
};

enum FltOp {
    Filter  = "Filter",
    Exclude = "Exclude"
}

enum AggrOp {
    Max = "Max",
    Min = "Min",
    Avg = "Avg",
    Count = "Count",
    Sum = "Sum",
    MaxInteger = "MaxInteger",
    MinInteger = "MinInteger",
    SumInteger = "SumInteger",
    ListAgg = "ListAgg"
}

enum QueryStatus {
    Run = "processing",
    Done = "done",
    Error = "error",
    Cancel = "canceled",
    RM = "removed"
}

enum PatternCategory {
    Dataset = "dataset",
    Export = "export",
    Dataflow = "dataflow",
    Folder = "folder",
    Param = "param", // batch dataflow
    Param2 = "param2", // dataflow 2.0
    Prefix = "prefix",
    PTbl = "publishedTable",
    PTblFix = "publishedTableFix",
    UDF = "udf",
    UDFFn = "udfFn",
    UDFParam = "udfParam",
    UDFFnParam = "udfFnParam",
    UDFFileName = "udfFileName",
    Workbook = "workbook",
    WorkbookFix = "workbookFix",
    Target = "target",
    SQLSnippet = "sqlSnippet",
    SQLFunc = "sqlFunc",
    SQLIdentifier = "sqlIdentifier"
}

enum ParserPatternCategory {
    UDFModule = "UDFModule",
    UDFFn = "UDFFn",
    TablePrefix = "prefix",
    ColumnName = "colName",
    ColumnProperty = "property",
    AggValue = "aggValue"
}

enum PatternAction {
    Fix = "fix",
    Check = "check",
    Get = "get"
}

enum SQLType {
    Fail = "fail handler",
    Error = "error",
    Cancel = "cancel"
}

enum SQLOps {
    DSImport = "importDataSource",
    TableFromDS = "createTableFromDataSource",
    TableFromView = "createTableFromView",
    RestoreTable = "restoreTable",
    Sort = "sort",
    Filter = "filter",
    Aggr = "aggregate",
    Map = "map",
    Join = "join",
    Union = "union",
    GroupBy = "groupBy",
    Project = "project",
    RenameOrphanTable = "renameTemporaryTable",
    DeleteTable = "deleteTable",
    DeleteAgg = "deleteAggregate",
    PreviewDS = "previewDataset",
    DestroyPreviewDS = "destroyPreviewDataset",
    DestroyDS = "destroyDataset",
    ExportTable = "exportTable",
    Query = "xcalarQuery",
    Retina = "runBatchDataflow",
    // XD operation
    AddNewCol = "addNewCol",
    HideCol = "hideCol",
    MinimizeCols = "minimizeCols",
    MaximizeCols = "unminimizeCols",
    TextAlign = "textAlign",
    ReorderCol = "reorderCol",
    RenameCol = "renameCol",
    PullCol = "pullCol",
    PullMultipleCols = "pullMultipleCols",
    SortTableCols = "sortTableCols",
    ResizeTableCols = "resizeTableCols",
    DragResizeTableCol = "dragResizeTableCol",
    DragResizeRow = "dragResizeRow",
    CreateFolder = "createFolder",
    DSRename = "dsRename",
    DSDropIn = "dsDropIn",
    DSInsert = "dsInsert",
    DSToDir = "goToDir",
    DSDropBack = "dsBack",
    DelFolder = "deleteFolder",
    Profile = "profile",
    ProfileAgg = "profileAggregate",
    ProfileStats = "profileStatistics",
    ProfileSort = "profileSort",
    ProfileBucketing = "profileBucketing",
    QuickAgg = "quickAgg",
    Corr = "correlation",
    SplitCol = "splitCol",
    ChangeType = "changeType",
    ChangeFormat = "changeFormat",
    Round = "round",
    ExecSQL = "Execute SQL",
    RefreshTables = "refreshTables",
    // DF 2.0 operations
    DisconnectOperations = "disconnectOperations",
    ConnectOperations = "connectOperations",
    RemoveOperations = "removeOperations",
    AddOperation = "addOperation",
    CopyOperations = "copyOperations",
    PasteOperations = "pasteOperations",
    MoveOperations = "moveOperations",
    NewDagTab = "newDagTab",
    DupDagTab = "dupDagTab",
    RemoveDagTab = "removeDagTab",
    RemoveOtherDagTab = "removeOtherDagTab",
    EditDescription = "editDescription",
    NewComment = "newComment",
    EditComment = "editComment",
    EditNodeTitle = "editNodeTitle",
    DagBulkOperation = "dagBulkOperation",
    DeleteDataflow = "deleteDataflow",
    DataflowExecution = "Application Execution",
    DebugPlan = "debugPlan"
}

enum XcalarMode {
    Oper = "operational",
    Mod = "modeling",
    Unlic = "unlicensed",
}

enum MLSetting {
    SuggestJoinKey = "SuggestJoinKey"
}

// system Param
enum systemParams {
    N = 0,
}

// Global predefined keys
enum GlobalKVKeys {
    InitFlag = "alreadyInit",
    XdFlag = "xdGlobalKey"
}

enum InitFlagState {
    AlreadyInit = "inited",
    NotYetInit = "not inited"
}

enum ConcurrencyEnum {
    NoKey = "Key seems non-existent",
    NoLock = "Lock cannot be undefined",
    AlreadyInit = "Mutex already initialized",
    OverLimit = "Limit exceeded",
    NoKVStore = "kvStore / kvEntry not found"
}

enum JoinCompoundOperator {
    "Right Semi Join" = 11,
    "Right Anti Semi Join" = 13,
    "Existence Join" = 14,
}

enum JoinCompoundOperatorTStr {
    RightSemiJoin = "Right Semi Join",
    RightAntiSemiJoin = "Right Anti Semi Join",
    ExistenceJoin = "Existence Join",
}

enum UnionTypeTStr {
    "Union",
    "Intersect",
    "Except"
}

enum UnionType {
    Union = "union",
    Intersect = "intersect",
    Except = "except"
}
enum SetupStatus {
    Success = "Success",
    Fail = "Fail",
    Setup = "Setup"
}

enum SQLStatus {
    Compiling = "Compiling",
    Running = "Running",
    Done = "Done",
    Cancelled = "Cancelled",
    Failed = "Failed",
    None = "None",
    Interrupted = "Interrupted"
}

enum SQLStatementType {
    Select = "Select",
    Create = "Create",
    Drop = "Drop",
    Show = "Show",
    Describe = "Describe"
}

enum FileManagerField {
    Name = "Name",
    Date = "Date",
    Size = "Size"
}

enum FileManagerAction {
    Open = "Open",
    Download = "Download",
    Rename = "Rename",
    Delete = "Delete",
    Duplicate = "Duplicate",
    CopyTo = "Copy to...",
    Share = "Share"
}

enum PbTblState {
    Loading = "Loading",
    BeDataset = "BeDataset",
    Error = "Error",
    Canceling = "Canceling",
    Activating = "Recreating",
    Deactivating = "Deleting"
}

enum PbTblStatus {
    Active = "Resident",
    Inactive = "Non-Resident"
}

enum DataSourceSchemaEvent {
    GetHintSchema = "GetHintSchema",
    ChangeSchema = "ToggleSchema",
    ValidateSchema = "ValidateSchema",
    ToggleAutoDetect = "ToggleAutoDetect"
}

enum ExportDriverPrettyNames {
    SingleCSV = "Single CSV file",
    MultipleCSV = "Multiple CSV files",
    FastCSV = "Multiple CSV files using only ASCII delimiters",
    LegacyUDF = "Custom export using a UDF (deprecated)",
    Snowflake = "Snowflake Export"
}

enum VersionComparison {
    Invalid = "invalid",
    Smaller = "smaller",
    Bigger = "bigger",
    Equal = "equal"
}

enum TabToUrl {
    home = "home",
    load = "load",
    notebook = "notebook",
}

enum UrlToTab {
    home = "home",
    load = "load",
    notebook = "notebook",
}

enum NotificationEnum {
    refreshTable = 'refreshTable'
}


if (typeof global !== 'undefined') {
    global.RowDirection = RowDirection;
    global.TableType = TableType;
    global.ColDir = ColDir;
    global.ColFormat = ColFormat;
    global.ColTextAlign = ColTextAlign;
    global.ColumnType = ColumnType;
    global.ColSizeTo = ColSizeTo;
    global.ColumnSortType = ColumnSortType;
    global.ColumnSortOrder = ColumnSortOrder;
    global.DSObjTerm = DSObjTerm;
    global.DSFormat = DSFormat;
    global.keyCode = keyCode;
    global.FltOp = FltOp;
    global.AggrOp = AggrOp;
    global.QueryStatus = QueryStatus;
    global.PatternCategory = PatternCategory;
    global.ParserPatternCategory = ParserPatternCategory;
    global.PatternAction = PatternAction;
    global.SQLType = SQLType;
    global.SQLOps = SQLOps;
    global.XcalarMode = XcalarMode;
    global.MLSetting = MLSetting;
    global.systemParams = systemParams;
    global.GlobalKVKeys = GlobalKVKeys;
    global.InitFlagState = InitFlagState;
    global.ConcurrencyEnum = ConcurrencyEnum;
    global.JoinCompoundOperator = JoinCompoundOperator;
    global.JoinCompoundOperatorTStr = JoinCompoundOperatorTStr;
    global.SetupStatus = SetupStatus;
    global.SQLStatus = SQLStatus;
    global.SQLStatementType = SQLStatementType;
    global.NotificationEnum = NotificationEnum;
}
