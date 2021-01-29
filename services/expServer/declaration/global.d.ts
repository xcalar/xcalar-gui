type XDPromise<T> = JQueryPromise<T>;
type XDDeferred<T> = JQueryDeferred<T>;

declare namespace PromiseHelper {
    export function deferred<T>(): XDDeferred<T>;
    export function reject<T>(...args): XDPromise<T>;
    export function resolve<T>(...args): XDPromise<T>;
    export function alwaysResolve<T>(...args): XDPromise<T>;
    export function when<T>(...args): XDPromise<T>;
    export function chain<T>(...args): XDPromise<T>;
    export function convertToNative<T>(promise: XDPromise<T>): Promise<T>;
    export function convertToJQuery<T>(promise: Promise<T>): XDPromise<T>;
}

declare namespace Admin {
    export function addNewUser(username: string): XDPromise<void>
}

declare namespace Xcrpc {
    export const DEFAULT_CLIENT_NAME = 'DEFAULT';
    export function createClient(name: string, endpoint: string): ServiceClient
}

declare namespace xcalarApi {
    export function setUserIdAndName(
        name: string,
        id: string | number,
        hashFunc: any
    ): boolean
}


declare namespace Transaction {
    export function start(options: TransactionStartOptions): number
    export function done(
        txId: number,
        options?: TransactionDoneOptions
    ): string | null
}

declare namespace XIApi {
    export function synthesize(
        txId: number,
        colInfos: ColRenameInfo[],
        tableName: string,
        newTableName?: string,
        sameSession?: boolean,
    ): XDPromise<string>
    export function load(
        dsArgs: DSArgs,
        formatArgs: FormatArgs,
        dsName: string,
        txId: number
    ): XDPromise<void>
    export function indexFromDataset(
        txId: number,
        dsName: string,
        newTableName: string,
        prefix: string
    ): XDPromise<{newTableName: string, prefix: string}>
    export function deleteTable(
        txId: number,
        tableName: string,
        toIgnoreError?: boolean,
        deleteCompletely?: boolean
    ): XDPromise<void>
    export function deleteTables(
        txId: number,
        arrayOfQueries: object[],
        checkTime: number
    ): XDPromise<any>
    export function map(
        txId: number,
        mapStrs: string[],
        tableName: string,
        newColNames: string[],
        newTableName?: string,
        icvMode?: boolean,
    ): XDPromise<string>
    export function project(
        txId: number,
        columns: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string>
}

declare namespace xcHelper {
    export function randName(name: string, digits?: number);
    export function convertFieldTypeToColType(type: DfFieldTypeT): ColumnType
    export function getJoinRenameMap(
        oldName: string,
        newName: string,
        type?: DfFieldTypeT,
    ): ColRenameInfo
    export function convertColTypeToFieldType(colType: ColumnType): DfFieldTypeT
    export function parsePrefixColName(colName: string): PrefixColInfo
    export function isInternalColumn(colName: string): boolean
}

declare interface PrefixColInfo {
    prefix: string;
    name: string;
}

declare interface TransactionDoneOptions {
    noNotification?: boolean,
    msgTable?: string | number,
    msgOptions?: object,
    noCommit?: boolean,
    noLog?: boolean,
    sql?: object,
    title?: string,
    queryStateOutput?: any
}

declare interface TransactionStartOptions {
    operation?: string,
    msg?: string,
    simulate?: boolean,
    sql?: SQLInfo,
    track?: boolean,
    steps?: number,
    cancelable?: boolean,
    exportName?: string,
    nodeIds?: string[],
    trackDataflow?: boolean,
    tabId?: string,
    parentTxId?: number,
    udfUserName?: string;
    udfSessionName?: string;
}

declare interface RequestInput {
    type: string,
    method: string,
    data?: any
}
declare interface CastResult {
    tableName: string;
    colNames: string[];
    types: ColumnType[];
    newTable?: boolean;
}
declare interface DSArgs {
    url: string;
    isRecur: boolean;
    format: string;
    maxSampleSize: number;
    skipRows: number;
    pattern: string;
    targetName: string;
}
declare interface FormatArgs {
    format: string;
    fieldDelim: string;
    recordDelim: string;
    schemaMode: number;
    quoteChar: string;
    typedColumns: object[];
    moduleName: string;
    funcName: string;
    udfQuery: string;
}

declare const XcalarGetVersion: any;
declare const XcalarSetFree: any;
declare const XcalarActivateWorkbook: any;
declare const XcalarListPublishedTables: any;
declare const XcalarListTablesXcrpc: any;
declare const XcalarDeleteTable: any;
declare const XcalarGetTables: any;
declare const XcalarGetTableMeta: any;
declare const XcalarQueryCancel: any;
declare const XcalarListWorkbooks: any;
declare const XcalarNewWorkbook: any;
declare const setSessionName: any;
declare const setupThrift: any;
declare const getTHandle: any;

declare const StatusTStr: { [key: string]: string };
declare const DfFieldTypeTStr: { [key: string]: string };
declare const DfFieldTypeTFromStr: { [key: string]: number };
declare const DfFormatTypeTStr: { [key: string]: string };
declare const DfFormatTypeTFromStr: { [key: string]: number };

declare enum StatusT {
    StatusCanceled,
    StatusAlreadyIndexed,
    StatusCannotReplaceKey,
    StatusSessionUsrAlreadyExists,
    StatusDsODBCTableExists,
    StatusExist,
    StatusExportSFFileExists,
    StatusSessionNotFound,
    StatusKvEntryNotEqual,
    StatusOperationHasFinished,
    StatusQrQueryNotExist,
    StatusDagNodeNotFound,
    StatusUdfExecuteFailed,
    StatusOk,
    StatusConnReset,
    StatusConnRefused,
    StatusDgNodeInUse,
    StatusKvEntryNotFound,
    StatusKvStoreNotFound,
    StatusUdfModuleAlreadyExists,
    StatusUdfModuleEmpty,
    StatusQrQueryAlreadyExists,
    StatusInvalidResultSetId,
    StatusNoBufs,
    StatusUdfModuleNotFound,
    StatusDatasetNameAlreadyExists,
    StatusSessListIncomplete,
    StatusRetinaAlreadyExists,
    StatusRetinaInUse,
    StatusDsNotFound,
    StatusJsonQueryParseError,
    StatusRetinaNotFound,
    StatusDatasetAlreadyDeleted,
    StatusDsDatasetInUse,
    StatusNsNotFound,
    StatusNoEnt,
    StatusIsDir,
    StatusAllFilesEmpty,
    StatusUdfModuleInUse,
    StatusIO,
    StatusXdfDivByZero,
    StatusSessionExists,
}

declare enum DfFieldTypeT {
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

declare enum DfFormatTypeT {
    DfFormatUnknown,
    DfFormatJson,
    DfFormatCsv,
    DfFormatSql,
    DfFormatInternal
}


declare class Authentication {
    public static getHashId(excludeHash?: boolean): string;
}

declare class LogicalOptimizer{
    static optimize(
        queryString: string,
        options: {},
        prependQueryString: string
    ): SQLOptimizedStruct
}

declare class XceClient {
    constructor(endpoint: string);
}

declare class KVStoreService {}
declare class LicenseService {}
declare class PublishedTableService {}
declare class QueryService {}
declare class UDFService {}
declare class TableService {}
declare class ServiceClient {
    private _apiClient: XceClient
    constructor(endpoint: string)
    public getKVStoreService(): KVStoreService
    public getLicenseService(): LicenseService
    public getPublishedTableService(): PublishedTableService
    public getQueryService(): QueryService
    public getUDFService(): UDFService
    public getTableService(): TableService
}
