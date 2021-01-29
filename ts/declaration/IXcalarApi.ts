/// <reference path = './ILibApisCommon_types.ts' />

type WorkItem = XcalarApiWorkItemT;

interface XcalarApiError {
    xcalarStatus?: StatusT,
    httpStatus?: number,
    status?: StatusT,
    output?: any,
    log?: string,
    error?: string
}

// TODO: figure out types
interface ThriftHandler {
    transport: any,
    protocol: any,
    client: any
}

class XcalarApiPreivewInputSource {
    public targetName: string = '';
    public path: string = '';
    public fileNamePattern: string = '';
    public recursive: boolean = false;
}

/* ===== XcalarApi API functions ===== */
declare function xcalarConnectThrift(hostname: string): ThriftHandler;

declare function xcalarDag(
    handler: ThriftHandler,
    tableName: string
): XDPromise<XcalarApiDagOutputT>;

declare function xcalarIndexWorkItem(
    source: string,
    dest: string,
    keys: XcalarApiKeyT[],
    prefix: string,
    dhtName: string
): WorkItem;

declare function xcalarIndex(
    thriftHandle: ThriftHandler,
    source: string,
    dest: string,
    keys: XcalarApiKeyT[],
    prefix: string,
    dhtName: string
): XDPromise<XcalarApiNewTableOutputT>;

declare function xcalarAddIndexWorkItem(
    tableName: string,
    keyName: string
): WorkItem;

declare function xcalarAddIndex(
    thriftHandle: ThriftHandler,
    tableName: string,
    keyName: string
): XDPromise<any>;

declare function xcalarRemoveIndexWorkItem(
    tableName: string,
    keyName: string
): WorkItem;

declare function xcalarRemoveIndex(
    thriftHandle: ThriftHandler,
    tableName: string,
    keyName: string
): XDPromise<any>;

declare function xcalarApiGetQuery(
    thriftHandle: ThriftHandler,
    workItem: WorkItem
): string;

declare function xcalarGetTableMeta(
    thriftHandle: ThriftHandler,
    tableName: string,
    isPrecise?: boolean
): XDPromise<XcalarApiGetTableMetaOutputT>;

declare function xcalarGetVersion(
    thriftHandle: ThriftHandler
): XDPromise<XcalarApiGetVersionOutputT>;

declare function xcalarGetLicense(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarGetIpAddr(
    thriftHandle: ThriftHandler,
    nodeId: number
): XDPromise<XcalarApiGetIpAddrOutputT>;

declare function xcalarPreview(
    thriftHandle: ThriftHandler,
    sourceArgs: XcalarApiPreivewInputSource,
    numBytesRequested: number,
    offset: number
): XDPromise<XcalarApiPreviewOutputT>;

declare function xcalarListDatasets(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarLoad(
    thriftHandle: ThriftHandler,
    name: string,
    sourceArgsList?: DataSourceArgsT[],
    parseArgs?: ParseArgsT,
    size?: number
): XDPromise<any>;

declare function xcalarLoadWorkItem(
    name: string,
    sourceArgsList?: DataSourceArgsT[],
    parseArgs?: ParseArgsT,
    size?: number
): WorkItem;

declare function xcalarAddExportTarget(
    thriftHandle: ThriftHandler,
    target: ExExportTargetT
): XDPromise<StatusT>;

declare function xcalarRemoveExportTarget(
    thriftHandle: ThriftHandler,
    targetHdr: ExExportTargetHdrT
): XDPromise<StatusT>;

declare function xcalarListExportTargets(
    thriftHandle: ThriftHandler,
    typePattern: string,
    namePattern: string
): XDPromise<any>;

declare function xcalarExportWorkItem(
    tableName: string,
    driverName: string,
    driverParams: {},
    columns: XcalarApiExportColumnT[],
    exportName: string
): WorkItem;

declare function xcalarExport(
    tHandle: ThriftHandler,
    srcTable: string,
    driverName: string,
    driverParams: {},
    columns: XcalarApiExportColumnT[],
    exportName: string
): XDPromise<{ status: StatusT }>;

declare function xcalarDriverCreate(
    thriftHandle: ThriftHandler,
    driverName: string,
    driverSource: string
): XDPromise<any>;

declare function xcalarDriverDelete(
    thriftHandle: ThriftHandler,
    driverName: string
): XDPromise<any>;

declare function xcalarDriverList(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarDeleteDagNodes(
    thriftHandle: ThriftHandler,
    namePattern: string,
    srcType: number,
    deleteCompletely?: boolean
): XDPromise<XcalarApiDeleteDagNodeOutputT>;

declare function xcalarDriverCreate(
    thriftHandle: ThriftHandler,
    driverName: string,
    driverSource: string
): XDPromise<any>;

declare function xcalarDriverDelete(
    thriftHandle: ThriftHandler,
    driverName: string
): XDPromise<any>;

declare function xcalarDriverList(
    thriftHandle: ThriftHandler
): XDPromise<any>;


declare function xcalarDatasetCreateWorkItem(
    name: string,
    sourceArgsList: {},
    parseArgs: {},
    size: number
): WorkItem;

declare function xcalarDatasetCreate(
    thriftHandle: ThriftHandler,
    name: string,
    sourceArgsList: {},
    parseArgs: {},
    size: number
): XDPromise<any>;

declare function xcalarDatasetDeleteWorkItem(
    name: string
): WorkItem;

declare function xcalarDatasetDelete(
    thriftHandle: ThriftHandler,
    name: string
): XDPromise<any>;

declare function xcalarDatasetGetMetaWorkItem(
    name: string
): WorkItem;

declare function xcalarDatasetGetMeta(
    thriftHandle: ThriftHandler,
    name: string
): XDPromise<any>;

declare function xcalarDatasetUnloadWorkItem(
    datasetNamePattern: string
): WorkItem;

declare function xcalarDatasetUnload(
    thriftHandle: ThriftHandler,
    datasetNamePattern: string
): XDPromise<any>;

declare function xcalarApiUdfGetResWorkItem(
    scope: number,
    moduleName: string
): WorkItem;

declare function xcalarApiUdfGetRes(
    thriftHandle: ThriftHandler,
    scope: number,
    moduleName: string
): XDPromise<any>;


declare function xcalarDeleteDagNodesWorkItem(
    namePattern: string,
    srcType: SourceTypeT,
    deleteCompletely?: boolean
): WorkItem;

declare function xcalarGetDatasetMeta(
    thriftHandle: ThriftHandler,
    datasetName: string
): XDPromise<any>;

declare function xcalarRenameNodeWorkItem(
    oldName: string,
    newName: string
): WorkItem;

declare function xcalarRenameNode(
    thriftHandle: ThriftHandler,
    oldName: string,
    newName: string
): XDPromise<StatusT>;

declare function xcalarResultSetAbsolute(
    thriftHandle: ThriftHandler,
    resultSetId: string,
    position: number
): XDPromise<StatusT>;

declare function xcalarResultSetNext(
    thriftHandle: ThriftHandler,
    resultSetId: string,
    numRecords: number
): XDPromise<any>;

declare function xcalarFreeResultSet(
    thriftHandle: ThriftHandler,
    resultSetId: string
): XDPromise<StatusT>;

declare function xcalarFilterWorkItem(
    srcTableName: string,
    dstTableName: string,
    filterStr: string
): WorkItem;

declare function xcalarFilter(
    thriftHandle: ThriftHandler,
    filterStr: string,
    srcTableName: string,
    dstTableName: string
): XDPromise<any>;

declare function xcalarApiMapWorkItem(
    evalStrs: string[],
    srcTableName: string,
    dstTableName: string,
    newFieldNames: string[],
    icvMode?: boolean
): WorkItem;

declare function xcalarApiMapWithWorkItem(
    thriftHandle: ThriftHandler,
    workItem: WorkItem
): XDPromise<any>;

declare function xcalarApiMap(
    thriftHandle: ThriftHandler,
    newFieldNames: string[],
    evalStrs: string[],
    srcTableName: string,
    dstTableName: string,
    icvMode: boolean
): XDPromise<any>;

declare function xcalarAggregateWorkItem(
    srcTableName: string,
    dstTableName: string,
    aggregateEvalStr: string
): WorkItem;

declare function xcalarAggregate(
    thriftHandle: ThriftHandler,
    srcTableName: string,
    dstTableName: string,
    aggregateEvalStr: string
): XDPromise<any>;

declare function xcalarJoinWorkItem(
    leftTableName: string,
    rightTableName: string,
    joinTableName: string,
    joinType: JoinOperatorT,
    leftColumns: XcalarApiColumnT[],
    rightColumns: XcalarApiColumnT[],
    evalString: string,
    keepAllColumns: boolean,
    nullSafe: boolean
): WorkItem;

declare function xcalarGetConfigParams(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarSetConfigParam(
    thriftHandle: ThriftHandler,
    paramName: string,
    paramValue: string
): XDPromise<any>;

declare function xcalarRuntimeGetParam(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarRuntimeSetParam(
    thriftHandle: ThriftHandler,
    schedParams: XcalarApiSchedParamT[]
): XDPromise<any>;

declare function xcalarListDatasetUsers(
    thriftHandle: ThriftHandler,
    datasetName: string
): XDPromise<XcalarApiListDatasetUsersOutputT>;

declare function xcalarListUserDatasets(
    thriftHandle: ThriftHandler,
    userIdName: string
): XDPromise<XcalarApiListUserDatasetsOutputT>;

declare function xcalarGetDatasetsInfo(
    thriftHandle: ThriftHandler,
    datasetsNamePattern: string
): XDPromise<any>;

declare function xcalarListTables(
    thriftHandle: ThriftHandler,
    patternMatch: string,
    srcType: number
): XDPromise<any>;

declare function xcalarShutdown(
    thriftHandle: ThriftHandler,
    force: boolean
): XDPromise<StatusT>;

declare function xcalarGetStats(
    thriftHandle: ThriftHandler,
    nodeId: number
): XDPromise<any>;

declare function xcalarGetTableRefCount(
    thriftHandle: ThriftHandler,
    tableName: string
): XDPromise<any>;

declare function xcalarMakeResultSetFromTable(
    thriftHandle: Thrift,
    tableName: string
): XDPromise<XcalarApiMakeResultSetOutputT>;

declare function xcalarMakeResultSetFromDataset(
    thriftHandle: ThriftHandler,
    datasetName: string,
    errorDs: boolean
): XDPromise<XcalarApiMakeResultSetOutputT>;

declare function xcalarJoin(
    thriftHandle: ThriftHandler,
    leftTableName: string,
    rightTableName: string,
    joinTableName: string,
    joinType: JoinOperatorT,
    leftColumns: XcalarApiColumnT[],
    rightColumns: XcalarApiColumnT[],
    evalString: string,
    keepAllColumns: boolean
): XDPromise<any>;

declare function xcalarGroupByWorkItem(
    srcTableName: string,
    dstTableName: string,
    evalStrs: string[],
    newFieldNames: string[],
    includeSrcSample?: boolean,
    icvMode?: boolean,
    newKeyFieldName?: string,
    groupAll?: boolean
): WorkItem;

declare function xcalarGroupByWithWorkItem(
    thriftHandle: ThriftHandler,
    workItem: WorkItem
): XDPromise<any>;

declare function xcalarGroupBy(
    thriftHandle: ThriftHandler,
    srcTableName: string,
    dstTableName: string,
    groupByEvalStrs: string[],
    newFieldNames: string[],
    includeSrcSample: boolean,
    icvMode: boolean,
    newKeyFieldName: string,
    groupAll: boolean
): XDPromise<any>;

declare function xcalarProjectWorkItem(
    numColumns: number,
    columns: string[],
    srcTableName: string,
    dstTableName: string
): WorkItem;

declare function xcalarProject(
    thriftHandle: ThriftHandler,
    numColumns: number,
    columns: string[],
    srcTableName: string,
    dstTableName: string
): XDPromise<any>;

declare function xcalarUnionWorkItem(
    sources: string[],
    dest: string,
    columns: XcalarApiColumnT[][],
    dedup: boolean,
    unionType: UnionOperatorT
): WorkItem;

declare function xcalarUnion(
    thriftHandle: ThriftHandler,
    sources: string[],
    dest: string,
    columns: XcalarApiColumnT[][],
    dedup: boolean,
    unionType: UnionOperatorT
): XDPromise<any>;

declare function xcalarApiGetRowNumWorkItem(
    srcTableName: string,
    dstTableName: string,
    newFieldName: string
): WorkItem;

declare function xcalarApiGetRowNum(
    thriftHandle: ThriftHandler,
    newFieldName: string,
    srcTableName: string,
    dstTableName: string
): XDPromise<any>;

declare function xcalarArchiveTablesWorkItem(
    tableNames: string[],
    archive: boolean
): WorkItem;

declare function xcalarArchiveTables(
    thriftHandle: ThriftHandler,
    tableNames: string[]
): XDPromise<any>;

declare function xcalarQueryListWorkItem(
    namePattern: string
): WorkItem;

declare function xcalarQueryList(
    thriftHandle: ThriftHandler,
    namePattern: string
): XDPromise<any>;

declare function xcalarQuery(
    thriftHandle: ThriftHandler,
    queryName: string,
    queryStr: string,
    sameSession: boolean,
    bailOnError: boolean,
    schedName: string,
    isAsync: boolean,
    udfUserName: string,
    udfSessionName: string
): XDPromise<any>;

declare function xcalarQueryState(
    thriftHandle: ThriftHandler,
    queryName: string,
    detailedStats: boolean
): XDPromise<any>;

declare function xcalarQueryDelete(
    thriftHandle: ThriftHandler,
    queryName: string
): XDPromise<StatusT>;

declare function xcalarQueryCancel(
    thriftHandle: ThriftHandler,
    queryName: string
): XDPromise<StatusT>;

declare function xcalarApiCancelOp(
    thriftHandle: ThriftHandler,
    dstDagName: string
): XDPromise<StatusT>;

declare function xcalarTagDagNodes(
    thriftHandle: ThriftHandler,
    tag: string,
    nodes: XcalarApiNamedInputT[]
): XDPromise<StatusT>;

declare function xcalarCommentDagNodes(
    thriftHandle: ThriftHandler,
    comment: string,
    numNodes: number,
    nodeNames: string[]
): XDPromise<StatusT>;

declare function xcalarListFiles(
    thriftHandle: ThriftHandler,
    sourceArgs: DataSourceArgsT
): XDPromise<any>;

declare function xcalarApiSynthesizeWorkItem(
    srcTableName: string,
    dstTableName: string,
    columns: XcalarApiColumnT[],
    sameSession: boolean
): WorkItem;

declare function xcalarApiSynthesize(
    thriftHandle: ThriftHandler,
    srcTableName: string,
    dstTableName: string,
    columns: XcalarApiColumnT[]
): XDPromise<any>;

declare function xcalarMakeRetina(
    thriftHandle: ThriftHandler,
    retinaName: string,
    tableArray: XcalarApiRetinaDstT[],
    srcTables: XcalarApiRetinaSrcTableT[]
): XDPromise<StatusT>;

declare function xcalarListRetinas(
    thriftHandle: ThriftHandler,
    namePattern: string
): XDPromise<any>;

declare function xcalarGetRetina(
    thriftHandle: ThriftHandler,
    retinaName: string
): XDPromise<any>;

declare function xcalarGetRetinaJson(
    thriftHandle: ThriftHandler,
    retinaName: string
): XDPromise<any>;

declare function xcalarUpdateRetina(
    thriftHandle: ThriftHandler,
    retinaName: string,
    retinaJson: string
): XDPromise<StatusT>;

declare function xcalarExecuteRetinaWorkItem(
    retinaName: string,
    parameters: XcalarApiParameterT[],
    exportToActiveSession: boolean,
    newTableName: string,
    queryName: string,
    schedName?: string,
    udfUserName?: string,
    udfSessionName?: string,
): WorkItem;

declare function xcalarExecuteRetina(
    thriftHandle: ThriftHandler,
    retinaName: string,
    parameters: XcalarApiParameterT[],
    exportToActiveSession: boolean,
    newTableName: string,
    queryName: string,
    schedName?: string,
    udfUserName?: string,
    udfSessionName?: string
): XDPromise<any>;

declare function xcalarListParametersInRetina(
    thriftHandle: ThriftHandler,
    retinaName: string
): XDPromise<any>;

declare function xcalarApiDeleteRetina(
    thriftHandle: ThriftHandler,
    retinaName: string
): XDPromise<StatusT>;

declare function xcalarApiImportRetina(
    thriftHandle: ThriftHandler,
    retinaName: string,
    overwrite: boolean,
    retina: string,
    loadRetinaJson?: boolean,
    retinaJson?: string,
    udfUserName?: string,
    udfSessionName?: string
): XDPromise<any>;

declare function xcalarApiExportRetina(
    thriftHandle: ThriftHandler,
    retinaName: string
): XDPromise<any>;

declare function xcalarAppRun(
    thriftHandle: ThriftHandler,
    name: string,
    isGlobal: boolean,
    inStr: string
): XDPromise<XcalarApiAppRunOutputT>;

declare function xcalarAppReap(
    thriftHandle: ThriftHandler,
    appGroupId: string,
    cancel: boolean
): XDPromise<XcalarApiAppReapOutputT>;

declare function xcalarKeyLookup(
    thriftHandle: ThriftHandler,
    scope: number,
    key: string
): XDPromise<XcalarApiKeyLookupOutputT>;

declare function xcalarKeyList(
    thriftHandle: ThriftHandler,
    scope: number,
    keyRegex: string
): XDPromise<XcalarApiKeyListOutputT>;

declare function xcalarKeyAddOrReplace(
    thriftHandle: ThriftHandler,
    scope: number,
    key: string,
    value: string,
    persist: boolean
): XDPromise<StatusT>;

declare function xcalarKeyDelete(
    thriftHandle: ThriftHandler,
    scope: number,
    key: string
): XDPromise<StatusT>;

declare function xcalarKeySetIfEqual(
    thriftHandle: ThriftHandler,
    scope: number,
    persist: boolean,
    keyCompare: string,
    valueCompare: string,
    valueReplace: string,
    keySecondary?: string,
    valueSecondary?: string
): XDPromise<{res: StatusT, noKV: boolean}>;

declare function xcalarKeyAppend(
    thriftHandle: ThriftHandler,
    scope: number,
    key: string,
    suffix: string
): XDPromise<StatusT>;

declare function xcalarApiGetOpStats(
    thriftHandle: ThriftHandler,
    dstDagName: string
): XDPromise<XcalarApiOpStatsOutT>;

declare function xcalarApiTop(
    thriftHandle: ThriftHandler,
    measureIntervalInMs: number,
    ext?: number
): XDPromise<XcalarApiTopOutputT>;

declare function xcalarApiGetMemoryUsage(
    thriftHandle: ThriftHandler,
    userName: string,
    userId: number
): XDPromise<XcalarApiGetMemoryUsageOutputT>;

declare function xcalarApiListXdfs(
    thriftHandle: ThriftHandler,
    fnNamePattern: string,
    categoryPattern: string
): XDPromise<XcalarApiListXdfsOutputT>;

declare function xcalarApiUdfAdd(
    thriftHandle: ThriftHandler,
    type: number,
    moduleName: string,
    source: string
): XDPromise<StatusT>;

declare function xcalarApiUdfUpdate(
    thriftHandle: ThriftHandler,
    type: number,
    moduleName: string,
    source: string
): XDPromise<StatusT>;

declare function xcalarApiUdfDelete(
    thriftHandle: ThriftHandler,
    moduleName: string
): XDPromise<StatusT>;

declare function xcalarApiUdfGet(
    thriftHandle: ThriftHandler,
    moduleName: string
): XDPromise<UdfModuleSrcT>;

declare function xcalarApiSessionNew(
    thriftHandle: ThriftHandler,
    sessionName: string,
    fork: boolean,
    forkedSessionName: string
): XDPromise<any>;

declare function xcalarApiSessionDelete(
    thriftHandle: ThriftHandler,
    pattern: string
): XDPromise<any>;

declare function xcalarApiSessionInact(
    thriftHandle: ThriftHandler,
    name: string,
    noCleanup: boolean
): XDPromise<any>;

declare function xcalarApiSessionList(
    thriftHandle: ThriftHandler,
    pattern: string
): XDPromise<XcalarApiSessionListOutputT>;

declare function xcalarApiSessionPersist(
    thriftHandle: ThriftHandler,
    pattern: string
): XDPromise<XcalarApiSessionListOutputT>;

declare function xcalarApiSessionActivate(
    thriftHandle: ThriftHandler,
    sessionName: string
): XDPromise<any>;

declare function xcalarApiSessionRename(
    thriftHandle: ThriftHandler,
    sessionName: string,
    origSessionName: string
): XDPromise<any>;

declare function xcalarApiSessionUpload(
    thriftHandle: ThriftHandler,
    sessionName: string,
    sessionContent: string,
    pathToAdditionalFiles: string
): XDPromise<any>;

declare function xcalarApiSessionDownload(
    thriftHandle: ThriftHandler,
    sessionName: string,
    pathToAdditionalFiles: string
): XDPromise<XcalarApiSessionDownloadOutputT>;

declare function xcalarApiUserDetach(
    thriftHandle: ThriftHandler,
    userName: string
): XDPromise<any>;

declare function xcalarGetStatGroupIdMap(
    thriftHandle: ThriftHandler,
    nodeId: number,
    numGroupId: number
): XDPromise<XcalarApiGetStatGroupIdMapOutputT>;

declare function xcalarApiSupportGenerate(
    thriftHandle: ThriftHandler,
    generateMiniBundle: boolean,
    supportCaseId: number
): XDPromise<XcalarApiSupportGenerateOutputT>;

declare function xcalarAppSet(
    thriftHandle: ThriftHandler,
    name: string,
    hostType: string,
    duty: string,
    execStr: string
): XDPromise<any>;

declare function xcalarLogLevelGet(
    thriftHandle: ThriftHandler,
): XDPromise<XcalarApiLogLevelGetOutputT>;

declare function xcalarLogLevelSet(
    thriftHandle: ThriftHandler,
    logLevel: number,
    logFlushLevel: number,
    logFlushPeriod?: number
): XDPromise<StatusT>;

declare function xcalarTargetCreate(
    thriftHandle: ThriftHandler,
    targetTypeId: any,
    targetName: any,
    targetParams: any
): XDPromise<any>;

declare function xcalarTargetDelete(
    thriftHandle: ThriftHandler,
    targetName: string
): XDPromise<any>;

declare function xcalarTargetList(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarTargetTypeList(
    thriftHandle: ThriftHandler
): XDPromise<any>;

declare function xcalarListPublishedTables(
    thriftHandle: ThriftHandler,
    patternMatch: string,
    getUpdates: boolean,
    updateStartBatchId: number,
    getSelects: boolean
): XDPromise<XcalarApiListTablesOutputT>;

declare function xcalarUnpublish(
    thriftHandle: ThriftHandler,
    tableName: string,
    inactivateOnly: boolean
): XDPromise<StatusT>;

declare function xcalarApiPublishWorkItem(
    srcTableName: string,
    dstTableName: string,
    unixTS: number,
    dropSrc: boolean
): WorkItem;

declare function xcalarApiPublish(
    thriftHandle: ThriftHandler,
    srcTableName: string,
    dstTableName: string,
    unixTS: number,
    dropSrc: boolean
): XDPromise<StatusT>;

declare function xcalarApiUpdate(
    thriftHandle: ThriftHandler,
    srcTableNames: string[] | string,
    dstTableNames: string[] | string,
    times: number[],
    dropSrc: boolean
): XDPromise<XcalarApiUpdateOutputT>;

declare function xcalarApiSelectWorkItem(
    srcTableName: string,
    dstTableName: string,
    batchIdMax: number,
    batchIdMin: number,
    filterString: string,
    columns: XcalarApiColumnT[],
    limitRows: number
): WorkItem;

declare function xcalarApiSelect(
    thriftHandle: ThriftHandler,
    srcTableName: string,
    dstTableName: string,
    batchIdMax: number,
    batchIdMin: number,
    filterString: string,
    columns: XcalarApiColumnT[],
    limitRows: number
): XDPromise<XcalarApiNewTableOutputT>;

declare function xcalarRestoreTable(
    thriftHandle: ThriftHandler,
    tableName: string
): XDPromise<StatusT>;

declare function xcalarCoalesce(
    thriftHandle: ThriftHandler,
    tableName: string
): XDPromise<StatusT>;

declare function xcalarPtChangeOwner(
    thriftHandle: ThriftHandler,
    publishTableName: string,
    userIdName: string,
    sessionName: string
): XDPromise<StatusT>;

declare function xcalarDriverList(
    thriftHandle: ThriftHandler,
): XDPromise<StatusT>;

declare function xcalarDriverCreate(
    thriftHandle: ThriftHandler,
    driverName: string,
    driverSource: string,
): XDPromise<StatusT>;

declare function xcalarDriverDelete(
    thriftHandle: ThriftHandler,
    driverName: string,
): XDPromise<StatusT>;

declare function setSessionName(
    name: string
): void;
