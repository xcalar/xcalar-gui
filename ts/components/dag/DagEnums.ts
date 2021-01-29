enum DagNodeType { 
    Aggregate = "singleValue",
    Custom = "custom",
    CustomInput = "customInput",
    CustomOutput = "customOutput",
    Dataset = "dataset",
    DFIn = "link in",
    DFOut = "link out",
    Explode = "explode",
    Export = "export",
    Filter = "filter",
    GroupBy = "groupBy",
    IMDTable = "IMDTable",
    Index = "index",
    Join = "join",
    Map = "map",
    Project = "project",
    PublishIMD = "publishIMD",
    Round = "round",
    RowNum = "rowNum",
    Set = "set",
    Sort = "sort",
    Source = "source",
    Split = "split",
    SQL = "sql",
    SQLSubInput = "SQLSubInput",
    SQLSubOutput = "SQLSubOutput",
    SubGraph = "subGraph",
    Placeholder = "placeholder",
    Instruction = "instruction",
    Synthesize = "synthesize",
    SQLFuncIn = "SQLFuncIn",
    SQLFuncOut = "SQLFuncOut",
    Deskew = "Deskew",
    Module = "Module"
}

enum DagNodeSubType {
    Cast = "cast",
    LookupJoin = "LookupJoin",
    FilterJoin = "FilterJoin",
    Union = "Union",
    Intersect = "Intersect",
    Except = "Except",
    ExportOptimized = "Export Optimized",
    DFOutOptimized = "link out Optimized",
    Snowflake = "Snowflake"
}

enum DagNodeState {
    Unused = "Unused",
    Configured = "Configured",
    Running = "Running",
    Complete = "Complete",
    Error = "Error"
}

enum DagNodeErrorType {
    Unconfigured = "Unconfigured",
    MissingSource = "Missing Source",
    Invalid = "Invalid Configuration",
    NoGraph = "Cannot find linked function",
    NoNode = "Invalid operator that is not in the graph specified",
    NoAggNode = "Corresponding aggregate operator either does not exist or has not been executed",
    AggNotExecute = "Must execute the aggregate manually before using it",
    CycleInLink = "Cycle In Link",
    LinkOutNotExecute = "The linked operator only allow linking after execution",
    InvalidOptimizedOutNode = "Valid terminal operators must be either Export or Function Output",
    InvalidOptimizedOutNodeCombo = "Optimized plan cannot have both Export and Function Output operators",
    InvalidOptimizedLinkOutCount = "Optimized plan cannot have multiple Function Output operators",
    InvalidOptimizedLinkOutOptimizedCount = "Optimized plan cannot have multiple Function Output operators",
    InvalidOptimizedDuplicateExport = "Optimized plan cannot have multiple export operators originating from the same operator.",
    InvalidOptimizedPublishNode = "Optimized plan that publishing the final table cannot have Export or Function Output operators",
    InvalidOptimizedPublishCount = "Optimized plan cannot have multiple Publish Table operators",
    Disjoint = "Multiple disjoint plans detected. Optimized execution can only occur on 1 continuous plan.",
    NoColumn = "Invalid column in the schema:\n",
    NoColumns = "Invalid columns in the schema:\n",
    NoAccessToSource = "Dataset does not exist or you have no rights to access it. Please change the configuration or restore the dataset.",
    InvalidSQLFunc = "Invalid Table Function",
    SQLFuncOutDupCol = "Table function's output has duplicate column name (the output's column name is case insensitive)",
    SQLFuncInNoSource = "Table function's input must have source configured to run",
}

enum DagNodeLinkInErrorType {
    NoGraph = "Cannot find linked function",
    NoLinkInGraph = "Cannot find the linked operator",
    MoreLinkGraph = "More than one function output with the same name specified by the function input operator are found"
}

enum DagGraphEvents {
    LockChange = "GraphLockChange",
    TurnOffSave = "TurnOffSave",
    TurnOnSave = "TurnOnSave",
    Save = "Save",
    AddSQLFuncInput = "AddSQLFuncInput",
    RemoveSQLFucInput = "RemoveSQLFuncInput",
    AddBackSQLFuncInput = "AddBackSQLFuncInput",
    DeleteGraph = "DeleteGraph",
    NewNode = "NewNode",
    RemoveNode = "RemoveNode",
    CreateWithValidate = "CreateWithValidate",
    Rerender = "Reerender",
    ReexecuteStart = "ReexecuteStart",
}

enum DagNodeEvents {
    AggregateChange = "DagNodeAggregateChange",
    ConnectionChange = "ConnectionChange",
    DescriptionChange = "DescriptionChange",
    LineageSourceChange = "DagNodeLineageSourceChange",
    LineageChange = "DagNodeLineageChange",
    LineageReset = "DagNodeLineageReset",
    ParamChange = "DagNodeParamChange",
    StateChange = "DagNodeStateChange",
    ResultSetChange = "DagNodeResultSetChange",
    ProgressChange = "DagNodeProgressChange",
    SubGraphConfigured = "SubGraphConfigured",
    SubGraphError = "SubGraphError",
    TableRemove = "TableRemove",
    TitleChange = "TitleChange",
    HeadChange = "HeadChange",
    AutoExecute = "AutoExecute",
    RetinaRemove = "RetinaRemove",
    StartSQLCompile = "StartSQLCompile",
    EndSQLCompile = "EndSQLCompile",
    UDFErrorChange = "UDFErrorChange",
    SubGraphUDFErrorChange = "SubGraphUDFErrorChange",
    SubGraphActivatingTable = "SubGraphActivatingTable",
    SubGraphDoneActivatingTable = "SubGraphDoneActivatingTable",
    PreTablePin = "PreTablePin",
    PostTablePin = "PostTablePin",
    PreTableUnpin = "PreTableUnpin",
    PostTableUnpin = "PostTableUnpin",
    Hide = "Hide",
    Save = "Save",
    UpdateProgress = "DagNodeUpdateProgress",
    ActivatingTable = "ActivatingTable",
    DoneActivatingTable = "DoneActivatingTable",
}

enum DagCategoryType {
    In = "in",
    Out = "out",
    SQL = "SQL",
    ColumnOps = "columnOps",
    RowOps = "rowOps",
    Join = "join",
    Set = "set",
    Aggregates = "aggregates",
    Custom = "custom",
    Hidden = "hidden"
}

enum DagTabType {
    User = "Normal",
    SQLFunc = "Table Function",
    Custom = "Custom",
    Optimized = "Optimized",
    Query = "Query",
    SQL = "SQL",
    SQLExecute = "SQL Execute Graph",
    ScalarFnTest = "Scalar Fn Test",
    Stats = "Stats",
    Main = "Main"
}

const DagNodeTooltip = {};

DagNodeTooltip[DagNodeType.Aggregate] = "Returns a single value that was calculated by an aggregate function on the values of the rows in the selected column";
DagNodeTooltip[DagNodeType.Custom] = "These compound operators are user-defined";
// DagNodeTooltip[DagNodeType.CustomInput] = "customInput";
// DagNodeTooltip[DagNodeType.CustomOutput] = "customOutput";
DagNodeTooltip[DagNodeType.Dataset] = "Sources data from a dataset";
DagNodeTooltip[DagNodeType.DFIn] = "Enables the input of data from another function.";
DagNodeTooltip[DagNodeType.DFOut] = "Enables access to a function's data by a Function Input operator";
DagNodeTooltip[DagNodeType.Explode] = "Divides a string data type column into multiple rows";
DagNodeTooltip[DagNodeType.Export] = "Saves and sends the final results of the function as a file or files to an external data repository.";
DagNodeTooltip[DagNodeType.Filter] = "Selects fields based on a condition on one or multiple columns";
DagNodeTooltip[DagNodeType.GroupBy] = "Groups rows and summarizes data using aggregate functions";
DagNodeTooltip[DagNodeType.IMDTable] = "Provides input data from a Table";
// DagNodeTooltip[DagNodeType.Index] = "index";
DagNodeTooltip[DagNodeType.Join] = "Returns columns and records from one or two tables based on a matching field";
DagNodeTooltip[DagNodeType.Map] = "Applies one or multiple operations on column values";
DagNodeTooltip[DagNodeType.Project] = "Removes columns from the table";
DagNodeTooltip[DagNodeType.PublishIMD] = "Generates the results of the operators it is connected to as a Publish Table, which is queryable by third-party BI software.";
DagNodeTooltip[DagNodeType.Round] = "Applies a fixed number of decimal places to columns whose data type is float";
DagNodeTooltip[DagNodeType.RowNum] = "Generates a row numbering column";
// DagNodeTooltip[DagNodeType.Set] = "set";
DagNodeTooltip[DagNodeType.Sort] = "Sorts the values within one or more columns";
// DagNodeTooltip[DagNodeType.Source] = "source";
DagNodeTooltip[DagNodeType.Split] = "Divides a string data type column into multiple columns";
DagNodeTooltip[DagNodeType.SQL] = "This operator applies one SQL statement  to the input data from an intermediate table";
DagNodeTooltip[DagNodeType.Deskew] = "Redistributes the data evenly across all cluster nodes";
// DagNodeTooltip[DagNodeType.SQLSubInput] = "SQLSubInput";
// DagNodeTooltip[DagNodeType.SQLSubOutput] = "SQLSubOutput";
// DagNodeTooltip[DagNodeType.SubGraph] = "subGraph";
// DagNodeTooltip[DagNodeType.Placeholder] = "placeholder";
// DagNodeTooltip[DagNodeType.Synthesize] = "synthesize";
// DagNodeTooltip[DagNodeType.SQLFuncIn] = "SQLFuncIn";
// DagNodeTooltip[DagNodeType.SQLFuncOut] = "SQLFuncOut";

DagNodeTooltip[DagNodeSubType.Cast] = "Changes the data type of a column";
DagNodeTooltip[DagNodeSubType.LookupJoin] = "Returns columns from both tables and the matching records from the left table";
DagNodeTooltip[DagNodeSubType.FilterJoin] = "Returns columns from the left table and the rows from the left table that have a matching row in the right table";
DagNodeTooltip[DagNodeSubType.Union] = "Combines the results from two or more tables";
DagNodeTooltip[DagNodeSubType.Intersect] = "Returns rows within the selected tables whose columns match";
DagNodeTooltip[DagNodeSubType.Except] = "Returns the columns of Table #1 that are not in the column results of the other selected tables";
DagNodeTooltip[DagNodeSubType.ExportOptimized] = "Exports the results of a optimized plan via an export driver";
DagNodeTooltip[DagNodeSubType.DFOutOptimized] = "Exports the results of a optimized plan to another plan";



const DagCategoryTooltip = {};

DagCategoryTooltip[DagCategoryType.In] = "These operators provide the plan's input data";
DagCategoryTooltip[DagCategoryType.Out] = "These operators output data from the plan";
DagCategoryTooltip[DagCategoryType.SQL] = "These operators apply SQL";
DagCategoryTooltip[DagCategoryType.ColumnOps] = "These operators target columns";
DagCategoryTooltip[DagCategoryType.RowOps] = "These operators target rows";
DagCategoryTooltip[DagCategoryType.Join] = "These operators join tables";
DagCategoryTooltip[DagCategoryType.Set] = "These operators combine the results of two or more input tables";
DagCategoryTooltip[DagCategoryType.Aggregates] = "These operators returns values from a calculation on a set of column values";
DagCategoryTooltip[DagCategoryType.Custom] = "User-defined operators for frequently applied operations";

enum DagColumnChangeType {
    Hide = "hide",
    Pull = "pull",
    Resize = "resize",
    TextAlign = "textAlign",
    Reorder = "reorder"
}


if (typeof exports !== 'undefined') {
    exports.DagNodeType = DagNodeType;
    exports.DagNodeSubType = DagNodeSubType;
    exports.DagNodeState = DagNodeState;
    exports.DagNodeEvents = DagNodeEvents;
    exports.DagGraphEvents = DagGraphEvents;
    exports.DagNodeErrorType = DagNodeErrorType;
    exports.DagNodeLinkInErrorType = DagNodeLinkInErrorType;
    exports.DagNodeTooltip = DagNodeTooltip;
    exports.DagTabType = DagTabType;
}