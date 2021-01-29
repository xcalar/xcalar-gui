export declare enum Operations {
    Aggregate = "XcalarApiAggregate",
    Map = "XcalarApiMap",
    Filter = "XcalarApiFilter",
    Load = "XcalarApiBulkLoad",
    Index = "XcalarApiIndex",
    Project = "XcalarApiProject",
    GetRowNum = "XcalarApiGetRowNum",
    GroupBy = "XcalarApiGroupBy",
    Join = "XcalarApiJoin",
    Union = "XcalarApiUnion",
    Synthesize = "XcalarApiSynthesize",
    ExecuteRetina = "XcalarApiExecuteRetina",
    Export = "XcalarApiExport",
    Drop = "XcalarApiDeleteObjects",
    Select = "XcalarApiSelect",
}

// helper structs
export declare class EvalArgs {
    evalString: string;
    newField: string;
    constructor(args?: {
        evalString?: string,
        newField?: string,
    });
}
export declare class KeyArgs {
    name: string;
    type: number;
    keyFieldName: string;
    ordering: number;
    constructor(args?: {
        name?: string,
        type?: string,
        keyFieldName?: string,
        ordering?: string,
    });
}
export declare type ColumnArgs = {
    sourceColumn: string;
    destColumn: string;
    columnType: number;
}
export declare type DataSourceArgs = {
	targetName: string;
	path: string;
	fileNamePattern: string;
	recursive: boolean;
}
export declare type ParseArgs = {
	parserFnName: string;
	parserArgJson: string;
	fileNameFieldName: string;
	recordNumFieldName: string;
	allowRecordErrors: boolean;
	allowFileErrors: boolean;
	schema: ColumnArgs[];
}
export declare type XcalarApiDfLoadArgs = {
	sourceArgsList: DataSourceArgs[];
	parseArgs: ParseArgs;
	size: number;
}
export declare class XcalarApiExportColumn {
	columnName: string;
	headerName: string;
	constructor(args?: {
		columnName?: string,
		headerName?: string,
	});
}
export declare class SelectGroupByEvalArgs {
    func: string;
    arg: string;
    newField: string;
    constructor(args?: {
        func?: string,
        arg?: string,
        newField?: string,
    });
}
export declare class SelectEvalArgs {
    Maps: EvalArgs[];
    Filter: string;
    GroupByKeys: string[];
    GroupBys: SelectGroupByEvalArgs[];
    constructor(args?: {
        Maps?: EvalArgs[],
        Filter?: string,
        GroupByKeys?: string[],
        GroupBys?: SelectGroupByEvalArgs[],
    });
}

// Operator node

export declare class OperationNode {
    operation: string;
    comment: string;
    tag: string;
    state: number;
    args: object;
    constructor(args?: {
        operation?: string,
        comment?: string,
        tag?: string,
        state?: string,
        args?: object,
    });
}

// Operator args
export declare class AggregateArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
    });
}
export declare class MapArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    icv: boolean;
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
        icv?: boolean,
    });
}
export declare class FilterArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
    });
}
export declare type LoadArgs = {
    dest: string;
    loadArgs: XcalarApiDfLoadArgs;
    dagNodeId: string;
}
export declare class IndexArgs {
    source: string;
    dest: string;
    key: KeyArgs[];
    prefix: string;
    dhtName: string;
    delaySort: boolean;
    broadcast: boolean;
    constructor(args?: {
        source?: string,
        dest?: string,
        key?: KeyArgs[],
        prefix?: string,
        dhtName?: string,
        delaySort?: boolean,
        broadcast?: boolean,
    });
}
export declare class ProjectArgs {
    source: string;
    dest: string;
    columns: string[];
    constructor(args?: {
        source?: string,
        dest?: string,
        columns?: string[],
    });
}
export declare class GetRowNumArgs {
    source: string;
    dest: string;
    newField: string;
    constructor(args?: {
        source?: string,
        dest?: string,
        newField?: string,
    });
}
export declare class GroupByArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    key: KeyArgs[];
    includeSample: boolean;
    icv: boolean;
    groupAll: boolean;
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
        key?: KeyArgs[],
        includeSample?: boolean,
        icv?: boolean,
        groupAll?: boolean,
    });
}
export declare class JoinArgs {
    source: string[];
    dest: string;
    joinType: number;
    columns: ColumnArgs[][];
    evalString: string;
    keepAllColumns: boolean;
    constructor(args?: {
        source?: string[],
        dest?: string,
        joinType?: string,
        columns?: ColumnArgs[][],
        evalString?: string,
        keepAllColumns?: boolean,
    });
}
export declare class UnionArgs {
    source: string[];
    dest: string;
    dedup: boolean;
    columns: ColumnArgs[][];
    unionType: number;
    constructor(args?: {
        source?: string[],
        dest?: string,
        dedup?: boolean,
        columns?: ColumnArgs[][],
        unionType?: string,
    });
}
export declare class SynthesizeArgs {
    source: string;
    dest: string;
    columns: ColumnArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        columns?: ColumnArgs[],
    });
}
// export declare class ExecuteRetinaArgs {
//     retinaName: string;
//     queryName: string;
//     dest: string;
//     parameters: XcalarApiParameterT[];
//     schedName: string;
//     constructor(args?: {
//         retinaName?: string,
//         queryName?: string,
//         dest?: string,
//         parameters?: XcalarApiParameterT[],
//         schedName?: string,
//     });
// }
export declare class ExportArgs {
    source: string;
    driverName: string;
    driverParams: {};
    columns: XcalarApiExportColumn[];
    dest: string;
    constructor(args?: {
        source?: string,
        driverName?: string,
        driverParams?: {},
        columns?: XcalarApiExportColumn[],
        dest?: string,
    });
}
export declare class DropArgs {
    namePattern: string;
    srcType: number;
    deleteCompletely: boolean;
    constructor(args?: {
        namePattern?: string,
        srcType?: number,
        deleteCompletely?: boolean
    });
}
export declare class SelectArgs {
    source: string;
    dest: string;
    minBatchId: number;
    maxBatchId: number;
    columns: ColumnArgs[];
    eval: SelectEvalArgs;
    constructor(args?: {
        source?: string,
        dest?: string,
        minBatchId?: number,
        maxBatchId?: number,
        columns?: ColumnArgs[],
        eval?: SelectEvalArgs,
    });
}
