declare var StatusBox;
declare var PTblManager;
declare var xcHelper;
declare var xcUIHelper;
declare var PatternCategory;
declare var PatternAction;
declare var xcStringHelper;
declare var LoadScreen;
declare var DSTargetManager;
declare var Alert;
declare var HomeScreen;
declare var UrlToTab;
declare var DragDropUploader;
declare var UploadTStr;
declare var PromiseHelper;
declare var CloudFileBrowser;
declare var Xcrpc;
declare var Transaction;
declare var PromiseHelper;
declare var proto;
declare var ColumnType;
declare var XcalarOrderingT;
declare var WorkbookManager;
declare var xcSuggest;

// Constructors
declare function XcalarApiKeyT(...params: any): void;
declare function PbTblInfo(...params: any): void;

// Global variables
declare var gDSPrefix: string;
declare var sessionName: string;
declare var tHandle;
declare var userIdName: string;
declare var userIdUnique: number;

// Global functions
declare function setSessionName(sessionName: string): void;
declare function setUserIdAndName(name: string, id: number, hashFunc: (str: string) => string): boolean;

// APIs
declare function XcalarListFiles(...params: any): Promise<any>;
declare function XcalarDatasetLoad(...params: any): Promise<any>;
declare function XcalarGetDatasetsInfo(...params: any): Promise<any>;
declare function xcalarIndex(...params: any): Promise<any>;
declare function xcalarApiMap(...params: any): Promise<any>;
declare function xcalarApiGetRowNum(...params: any): Promise<any>;
declare function xcalarProject(...params: any): Promise<any>;
declare function XcalarDatasetDeactivate(...params: any): Promise<any>;
declare function XcalarRestoreTable(...params: any): Promise<any>;
declare function XcalarPublishTable(...params: any): Promise<any>;
declare function XcalarGenRowNum(...params: any): Promise<any>;
declare function XcalarIndexFromTable(...params: any): Promise<any>;
declare function XcalarRenameTable(...params: any): Promise<any>;
declare function XcalarDeleteTable(...params: any): Promise<any>;
declare function XcalarGetTableMeta(...params: any): Promise<any>;
declare function XcalarMakeResultSetFromTable(...params: any): Promise<any>;
declare function XcalarSetAbsolute(...params: any): Promise<any>;
declare function XcalarGetNextPage(...params: any): Promise<any>;
declare function XcalarSetFree(...params: any): Promise<any>;
declare function XcalarNewWorkbook(...params: any): Promise<any>;
declare function XcalarDeleteWorkbook(...params: any): Promise<any>;
declare function XcalarActivateWorkbook(...params: any): Promise<any>;
declare function XcalarDeactivateWorkbook(...params: any): Promise<any>;
declare function XcalarListPublishedTables(...params: any): Promise<any>;
declare function XcalarQueryWithCheck(...params: any): Promise<any>;
declare function XcalarImportRetina(...params: any): Promise<any>;
declare function XcalarExecuteRetina(...params: any): Promise<any>;
declare function XcalarDeleteRetina(...params: any): Promise<any>;
declare function XcalarDeletePython(...params: any): Promise<any>;
declare function XcalarTargetDelete(...params: any): any;
declare function XcalarQueryCancel(...params: any): Promise<any>;
declare function XcalarPreview(...params: any): Promise<any>;