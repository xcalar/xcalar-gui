declare enum ColumnType {
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

declare enum DfFieldType {
    DfUnknown,
    DfString,
    DfInt32,
    DfUInt32,
    DfInt64,
    DfUInt64,
    DfFloat32,
    DfFloat64,
    DfBoolean,
    DfTimespec,
    DfBlob,
    DfNull,
    DfMixed,
    DfFatptr,
    DfScalarPtr,
    DfScalarObj,
    DfOpRowMetaPtr,
    DfArray,
    DfObject,
    DfMoney
}

interface XcalarApiPublishInput {
	source: string;
	dest: string;
	unixTS: number;
	dropSrc: boolean;
}

interface XcalarApiUpdateInfo {
	source: string;
	startTS: number;
	batchId: number;
	size: number;
	numRows: number;
	numInserts: number;
	numUpdates: number;
    numDeletes: number;
}

interface XcalarApiSelectInput {
	source: string;
	dest: string;
	minBatchId: number;
    maxBatchId: number;
    limitRows: number;
}

interface XcalarApiColumnInfo {
	name: string;
    type: string;
}

interface XcalarApiTime {
    milliseconds: number;
}

interface XcalarApiIndexInfo {
	key: XcalarApiColumnInfo;
	sizeEstimate: number;
    uptime: XcalarApiTime;
}

interface XcalarApiTableInfo {
	name: string;
	numPersistedUpdates: number;
	source: XcalarApiPublishInput;
	updates: XcalarApiUpdateInfo[];
	selects: XcalarApiSelectInput[];
	oldestBatchId: number;
	nextBatchId: number;
	keys: XcalarApiColumnInfo[];
	values: XcalarApiColumnInfo[];
	active: boolean;
	indices: XcalarApiIndexInfo[];
}

interface XcalarApiListTablesOutput {
	numTables: number;
    tables: XcalarApiTableInfo[];
}

interface XcalarDeleteQuery {
    operation: string,
    args: {
        namePattern: string,
        srcType: string
    }
}

interface XcalarTableColumn {
    sourceColumn: string,
    destColumn: string,
    columnType: string
}

interface XcalarSelectQuery {
    operation: string,
    args: {
        source: string,
        dest: string,
        minBatchId: number,
        maxBatchId: number,
        columns: XcalarTableColumn[]
    }
}

interface XcalarApiGetVersionOutput {
	version: string;
	apiVersionSignatureFull: string;
    apiVersionSignatureShort: number;
}

interface XcalarApiSession {
	name: string;
	state: string;
	info: string;
	activeNode: number;
	sessionId: string;
    description: string;
}

interface XcalarApiSessionGenericOutput {
	outputAdded: boolean;
	nodeId: number;
	ipAddr: string;
    errorMessage: string;
}

interface XcalarApiSessionListOutput {
	numSessions: number;
	sessions: XcalarApiSession[];
    sessionGenericOutput: XcalarApiSessionGenericOutput;
}

interface DfFieldAttrHeader {
	name: string;
	type: number;
	valueArrayIndex: number;
    ordering: string;
}

interface XcalarApiGetTableMetaOutput {
	numDatasets: number;
	datasets: string[];
	numResultSets: number;
	resultSetIds: string[];
	numKeys: number;
	keyAttr: DfFieldAttrHeader[];
	numValues: number;
	numImmediates: number;
	valueAttrs: DfFieldAttrHeader[];
	ordering: number;
	numMetas: number;
    metas: XcalarApiTableMetaT[];
}

interface ColRenameInfo {
    orig: string;
    new: string;
    type: DfFieldType;
}