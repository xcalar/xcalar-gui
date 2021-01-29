declare enum Operations {
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
declare class EvalArgs {
    evalString: string;
    newField: string;
    constructor(args?: {
        evalString?: string,
        newField?: string,
    });
}
declare class KeyArgs {
    name: string;
    type: string;
    keyFieldName: string;
    ordering: string;
    constructor(args?: {
        name?: string,
        type?: string,
        keyFieldName?: string,
        ordering?: string,
    });
}
declare class ColumnArgs {
    sourceColumn: string;
    destColumn: string;
    columnType: string;
    constructor(args?: {
        sourceColumn?: string,
        destColumn?: string,
        columnType?: string,
    });
}
declare class SelectGroupByEvalArgs {
    func: string;
    arg: string;
    newField: string;
    constructor(args?: {
        func?: string,
        arg?: string,
        newField?: string,
    });
}
declare class SelectEvalArgs {
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

declare class OperationNode {
    operation: string;
    comment: string;
    tag: string;
    state: string;
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
declare class AggregateArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
    });
}
declare class MapArgs {
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
declare class FilterArgs {
    source: string;
    dest: string;
    eval: EvalArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        eval?: EvalArgs[],
    });
}
declare class LoadArgs {
    dest: string;
    loadArgs: XcalarApiDfLoadArgsT;
    dagNodeId: string;
    constructor(args?: {
        dest?: string,
        loadArgs?: XcalarApiDfLoadArgsT,
        dagNodeId?: string,
    });
}
declare class IndexArgs {
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
declare class ProjectArgs {
    source: string;
    dest: string;
    columns: string[];
    constructor(args?: {
        source?: string,
        dest?: string,
        columns?: string[],
    });
}
declare class GetRowNumArgs {
    source: string;
    dest: string;
    newField: string;
    constructor(args?: {
        source?: string,
        dest?: string,
        newField?: string,
    });
}
declare class GroupByArgs {
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
declare class JoinArgs {
    source: string[];
    dest: string;
    joinType: string;
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
declare class UnionArgs {
    source: string[];
    dest: string;
    dedup: boolean;
    columns: ColumnArgs[][];
    unionType: string;
    constructor(args?: {
        source?: string[],
        dest?: string,
        dedup?: boolean,
        columns?: ColumnArgs[][],
        unionType?: string,
    });
}
declare class SynthesizeArgs {
    source: string;
    dest: string;
    columns: ColumnArgs[];
    constructor(args?: {
        source?: string,
        dest?: string,
        columns?: ColumnArgs[],
    });
}
declare class ExecuteRetinaArgs {
    retinaName: string;
    queryName: string;
    dest: string;
    parameters: XcalarApiParameterT[];
    schedName: string;
    constructor(args?: {
        retinaName?: string,
        queryName?: string,
        dest?: string,
        parameters?: XcalarApiParameterT[],
        schedName?: string,
    });
}
declare class ExportArgs {
    source: string;
    driverName: string;
    driverParams: {};
    columns: XcalarApiExportColumnT[];
    dest: string;
    constructor(args?: {
        source?: string,
        driverName?: string,
        driverParams?: {},
        columns?: XcalarApiExportColumnT[],
        dest?: string,
    });
}
declare class DropArgs {
    namePattern: string;
    srcType: number;
    deleteCompletely: boolean;
    constructor(args?: {
        namePattern?: string,
        srcType?: number,
        deleteCompletely?: boolean
    });
}
declare class SelectArgs {
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
