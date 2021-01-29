//
// Autogenerated by Thrift Compiler (0.10.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


XcalarApisT = {
  'XcalarApiUnknown' : 0,
  'XcalarApiGetVersion' : 1,
  'XcalarApiBulkLoad' : 2,
  'XcalarApiIndex' : 3,
  'XcalarApiGetTableMeta' : 4,
  'XcalarApiShutdown' : 5,
  'XcalarApiGetStat' : 6,
  'XcalarApiGetStatByGroupId' : 7,
  'XcalarApiResetStat' : 8,
  'XcalarApiGetStatGroupIdMap' : 9,
  'XcalarApiListDagNodeInfo' : 10,
  'XcalarApiListDatasets' : 11,
  'XcalarApiShutdownLocal' : 12,
  'XcalarApiMakeResultSet' : 13,
  'XcalarApiResultSetNext' : 14,
  'XcalarApiJoin' : 15,
  'XcalarApiProject' : 16,
  'XcalarApiGetRowNum' : 17,
  'XcalarApiFilter' : 18,
  'XcalarApiGroupBy' : 19,
  'XcalarApiResultSetAbsolute' : 20,
  'XcalarApiFreeResultSet' : 21,
  'XcalarApiDeleteObjects' : 22,
  'XcalarApiGetTableRefCount' : 23,
  'XcalarApiMap' : 24,
  'XcalarApiAggregate' : 25,
  'XcalarApiQuery' : 26,
  'XcalarApiQueryState' : 27,
  'XcalarApiQueryCancel' : 28,
  'XcalarApiQueryDelete' : 29,
  'XcalarApiListExportTargets' : 30,
  'XcalarApiExport' : 31,
  'XcalarApiGetDag' : 32,
  'XcalarApiListFiles' : 33,
  'XcalarApiMakeRetina' : 34,
  'XcalarApiListRetinas' : 35,
  'XcalarApiGetRetina' : 36,
  'XcalarApiDeleteRetina' : 37,
  'XcalarApiUpdateRetina' : 38,
  'XcalarApiListParametersInRetina' : 39,
  'XcalarApiExecuteRetina' : 40,
  'XcalarApiImportRetina' : 41,
  'XcalarApiKeyLookup' : 42,
  'XcalarApiKeyAddOrReplace' : 43,
  'XcalarApiKeyDelete' : 44,
  'XcalarApiGetNumNodes' : 45,
  'XcalarApiTop' : 46,
  'XcalarApiListXdfs' : 47,
  'XcalarApiRenameNode' : 48,
  'XcalarApiSessionNew' : 49,
  'XcalarApiSessionList' : 50,
  'XcalarApiSessionRename' : 51,
  'XcalarApiSessionDelete' : 52,
  'XcalarApiSessionInact' : 53,
  'XcalarApiSessionPersist' : 54,
  'XcalarApiGetQuery' : 55,
  'XcalarApiCreateDht' : 56,
  'XcalarApiKeyAppend' : 57,
  'XcalarApiKeySetIfEqual' : 58,
  'XcalarApiDeleteDht' : 59,
  'XcalarApiSupportGenerate' : 60,
  'XcalarApiUdfAdd' : 61,
  'XcalarApiUdfUpdate' : 62,
  'XcalarApiUdfGet' : 63,
  'XcalarApiUdfDelete' : 64,
  'XcalarApiCancelOp' : 65,
  'XcalarApiGetPerNodeOpStats' : 66,
  'XcalarApiGetOpStats' : 67,
  'XcalarApiPreview' : 68,
  'XcalarApiExportRetina' : 69,
  'XcalarApiStartFuncTests' : 70,
  'XcalarApiListFuncTests' : 71,
  'XcalarApiGetConfigParams' : 72,
  'XcalarApiSetConfigParam' : 73,
  'XcalarApiAppSet' : 74,
  'XcalarApiAppRun' : 75,
  'XcalarApiAppReap' : 76,
  'XcalarApiPacked' : 77,
  'XcalarApiGetMemoryUsage' : 78,
  'XcalarApiLogLevelSet' : 79,
  'XcalarApiGetIpAddr' : 80,
  'XcalarApiTagDagNodes' : 81,
  'XcalarApiCommentDagNodes' : 82,
  'XcalarApiListDatasetUsers' : 83,
  'XcalarApiLogLevelGet' : 84,
  'XcalarApiPerNodeTop' : 85,
  'XcalarApiKeyList' : 86,
  'XcalarApiListUserDatasets' : 87,
  'XcalarApiUnion' : 88,
  'XcalarApiTarget' : 89,
  'XcalarApiSynthesize' : 90,
  'XcalarApiGetRetinaJson' : 91,
  'XcalarApiGetDatasetsInfo' : 92,
  'XcalarApiArchiveTables' : 93,
  'XcalarApiSessionDownload' : 94,
  'XcalarApiSessionUpload' : 95,
  'XcalarApiPublish' : 96,
  'XcalarApiUpdate' : 97,
  'XcalarApiSelect' : 98,
  'XcalarApiUnpublish' : 99,
  'XcalarApiListTables' : 100,
  'XcalarApiRestoreTable' : 101,
  'XcalarApiCoalesce' : 102,
  'XcalarApiSessionActivate' : 103,
  'XcalarApiPtChangeOwner' : 104,
  'XcalarApiDriver' : 105,
  'XcalarApiRuntimeSetParam' : 106,
  'XcalarApiRuntimeGetParam' : 107,
  'XcalarApiDatasetCreate' : 108,
  'XcalarApiDatasetDelete' : 109,
  'XcalarApiDatasetUnload' : 110,
  'XcalarApiDatasetGetMeta' : 111,
  'XcalarApiUdfGetResolution' : 112,
  'XcalarApiQueryList' : 113,
  'XcalarApiAddIndex' : 114,
  'XcalarApiRemoveIndex' : 115,
  'XcalarApiFunctionInvalid' : 116
};
XcalarApisTStr = {
  0 : 'XcalarApiUnknown',
  1 : 'XcalarApiGetVersion',
  2 : 'XcalarApiBulkLoad',
  3 : 'XcalarApiIndex',
  4 : 'XcalarApiGetTableMeta',
  5 : 'XcalarApiShutdown',
  6 : 'XcalarApiGetStat',
  7 : 'XcalarApiGetStatByGroupId',
  8 : 'XcalarApiResetStat',
  9 : 'XcalarApiGetStatGroupIdMap',
  10 : 'XcalarApiListDagNodeInfo',
  11 : 'XcalarApiListDatasets',
  12 : 'XcalarApiShutdownLocal',
  13 : 'XcalarApiMakeResultSet',
  14 : 'XcalarApiResultSetNext',
  15 : 'XcalarApiJoin',
  16 : 'XcalarApiProject',
  17 : 'XcalarApiGetRowNum',
  18 : 'XcalarApiFilter',
  19 : 'XcalarApiGroupBy',
  20 : 'XcalarApiResultSetAbsolute',
  21 : 'XcalarApiFreeResultSet',
  22 : 'XcalarApiDeleteObjects',
  23 : 'XcalarApiGetTableRefCount',
  24 : 'XcalarApiMap',
  25 : 'XcalarApiAggregate',
  26 : 'XcalarApiQuery',
  27 : 'XcalarApiQueryState',
  28 : 'XcalarApiQueryCancel',
  29 : 'XcalarApiQueryDelete',
  30 : 'XcalarApiListExportTargets',
  31 : 'XcalarApiExport',
  32 : 'XcalarApiGetDag',
  33 : 'XcalarApiListFiles',
  34 : 'XcalarApiMakeRetina',
  35 : 'XcalarApiListRetinas',
  36 : 'XcalarApiGetRetina',
  37 : 'XcalarApiDeleteRetina',
  38 : 'XcalarApiUpdateRetina',
  39 : 'XcalarApiListParametersInRetina',
  40 : 'XcalarApiExecuteRetina',
  41 : 'XcalarApiImportRetina',
  42 : 'XcalarApiKeyLookup',
  43 : 'XcalarApiKeyAddOrReplace',
  44 : 'XcalarApiKeyDelete',
  45 : 'XcalarApiGetNumNodes',
  46 : 'XcalarApiTop',
  47 : 'XcalarApiListXdfs',
  48 : 'XcalarApiRenameNode',
  49 : 'XcalarApiSessionNew',
  50 : 'XcalarApiSessionList',
  51 : 'XcalarApiSessionRename',
  52 : 'XcalarApiSessionDelete',
  53 : 'XcalarApiSessionInact',
  54 : 'XcalarApiSessionPersist',
  55 : 'XcalarApiGetQuery',
  56 : 'XcalarApiCreateDht',
  57 : 'XcalarApiKeyAppend',
  58 : 'XcalarApiKeySetIfEqual',
  59 : 'XcalarApiDeleteDht',
  60 : 'XcalarApiSupportGenerate',
  61 : 'XcalarApiUdfAdd',
  62 : 'XcalarApiUdfUpdate',
  63 : 'XcalarApiUdfGet',
  64 : 'XcalarApiUdfDelete',
  65 : 'XcalarApiCancelOp',
  66 : 'XcalarApiGetPerNodeOpStats',
  67 : 'XcalarApiGetOpStats',
  68 : 'XcalarApiPreview',
  69 : 'XcalarApiExportRetina',
  70 : 'XcalarApiStartFuncTests',
  71 : 'XcalarApiListFuncTests',
  72 : 'XcalarApiGetConfigParams',
  73 : 'XcalarApiSetConfigParam',
  74 : 'XcalarApiAppSet',
  75 : 'XcalarApiAppRun',
  76 : 'XcalarApiAppReap',
  77 : 'XcalarApiPacked',
  78 : 'XcalarApiGetMemoryUsage',
  79 : 'XcalarApiLogLevelSet',
  80 : 'XcalarApiGetIpAddr',
  81 : 'XcalarApiTagDagNodes',
  82 : 'XcalarApiCommentDagNodes',
  83 : 'XcalarApiListDatasetUsers',
  84 : 'XcalarApiLogLevelGet',
  85 : 'XcalarApiPerNodeTop',
  86 : 'XcalarApiKeyList',
  87 : 'XcalarApiListUserDatasets',
  88 : 'XcalarApiUnion',
  89 : 'XcalarApiTarget',
  90 : 'XcalarApiSynthesize',
  91 : 'XcalarApiGetRetinaJson',
  92 : 'XcalarApiGetDatasetsInfo',
  93 : 'XcalarApiArchiveTables',
  94 : 'XcalarApiSessionDownload',
  95 : 'XcalarApiSessionUpload',
  96 : 'XcalarApiPublish',
  97 : 'XcalarApiUpdate',
  98 : 'XcalarApiSelect',
  99 : 'XcalarApiUnpublish',
  100 : 'XcalarApiListTables',
  101 : 'XcalarApiRestoreTable',
  102 : 'XcalarApiCoalesce',
  103 : 'XcalarApiSessionActivate',
  104 : 'XcalarApiPtChangeOwner',
  105 : 'XcalarApiDriver',
  106 : 'XcalarApiRuntimeSetParam',
  107 : 'XcalarApiRuntimeGetParam',
  108 : 'XcalarApiDatasetCreate',
  109 : 'XcalarApiDatasetDelete',
  110 : 'XcalarApiDatasetUnload',
  111 : 'XcalarApiDatasetGetMeta',
  112 : 'XcalarApiUdfGetResolution',
  113 : 'XcalarApiQueryList',
  114 : 'XcalarApiAddIndex',
  115 : 'XcalarApiRemoveIndex',
  116 : 'XcalarApiFunctionInvalid'
};
XcalarApisTFromStr = {
  'XcalarApiUnknown' : 0,
  'XcalarApiGetVersion' : 1,
  'XcalarApiBulkLoad' : 2,
  'XcalarApiIndex' : 3,
  'XcalarApiGetTableMeta' : 4,
  'XcalarApiShutdown' : 5,
  'XcalarApiGetStat' : 6,
  'XcalarApiGetStatByGroupId' : 7,
  'XcalarApiResetStat' : 8,
  'XcalarApiGetStatGroupIdMap' : 9,
  'XcalarApiListDagNodeInfo' : 10,
  'XcalarApiListDatasets' : 11,
  'XcalarApiShutdownLocal' : 12,
  'XcalarApiMakeResultSet' : 13,
  'XcalarApiResultSetNext' : 14,
  'XcalarApiJoin' : 15,
  'XcalarApiProject' : 16,
  'XcalarApiGetRowNum' : 17,
  'XcalarApiFilter' : 18,
  'XcalarApiGroupBy' : 19,
  'XcalarApiResultSetAbsolute' : 20,
  'XcalarApiFreeResultSet' : 21,
  'XcalarApiDeleteObjects' : 22,
  'XcalarApiGetTableRefCount' : 23,
  'XcalarApiMap' : 24,
  'XcalarApiAggregate' : 25,
  'XcalarApiQuery' : 26,
  'XcalarApiQueryState' : 27,
  'XcalarApiQueryCancel' : 28,
  'XcalarApiQueryDelete' : 29,
  'XcalarApiListExportTargets' : 30,
  'XcalarApiExport' : 31,
  'XcalarApiGetDag' : 32,
  'XcalarApiListFiles' : 33,
  'XcalarApiMakeRetina' : 34,
  'XcalarApiListRetinas' : 35,
  'XcalarApiGetRetina' : 36,
  'XcalarApiDeleteRetina' : 37,
  'XcalarApiUpdateRetina' : 38,
  'XcalarApiListParametersInRetina' : 39,
  'XcalarApiExecuteRetina' : 40,
  'XcalarApiImportRetina' : 41,
  'XcalarApiKeyLookup' : 42,
  'XcalarApiKeyAddOrReplace' : 43,
  'XcalarApiKeyDelete' : 44,
  'XcalarApiGetNumNodes' : 45,
  'XcalarApiTop' : 46,
  'XcalarApiListXdfs' : 47,
  'XcalarApiRenameNode' : 48,
  'XcalarApiSessionNew' : 49,
  'XcalarApiSessionList' : 50,
  'XcalarApiSessionRename' : 51,
  'XcalarApiSessionDelete' : 52,
  'XcalarApiSessionInact' : 53,
  'XcalarApiSessionPersist' : 54,
  'XcalarApiGetQuery' : 55,
  'XcalarApiCreateDht' : 56,
  'XcalarApiKeyAppend' : 57,
  'XcalarApiKeySetIfEqual' : 58,
  'XcalarApiDeleteDht' : 59,
  'XcalarApiSupportGenerate' : 60,
  'XcalarApiUdfAdd' : 61,
  'XcalarApiUdfUpdate' : 62,
  'XcalarApiUdfGet' : 63,
  'XcalarApiUdfDelete' : 64,
  'XcalarApiCancelOp' : 65,
  'XcalarApiGetPerNodeOpStats' : 66,
  'XcalarApiGetOpStats' : 67,
  'XcalarApiPreview' : 68,
  'XcalarApiExportRetina' : 69,
  'XcalarApiStartFuncTests' : 70,
  'XcalarApiListFuncTests' : 71,
  'XcalarApiGetConfigParams' : 72,
  'XcalarApiSetConfigParam' : 73,
  'XcalarApiAppSet' : 74,
  'XcalarApiAppRun' : 75,
  'XcalarApiAppReap' : 76,
  'XcalarApiPacked' : 77,
  'XcalarApiGetMemoryUsage' : 78,
  'XcalarApiLogLevelSet' : 79,
  'XcalarApiGetIpAddr' : 80,
  'XcalarApiTagDagNodes' : 81,
  'XcalarApiCommentDagNodes' : 82,
  'XcalarApiListDatasetUsers' : 83,
  'XcalarApiLogLevelGet' : 84,
  'XcalarApiPerNodeTop' : 85,
  'XcalarApiKeyList' : 86,
  'XcalarApiListUserDatasets' : 87,
  'XcalarApiUnion' : 88,
  'XcalarApiTarget' : 89,
  'XcalarApiSynthesize' : 90,
  'XcalarApiGetRetinaJson' : 91,
  'XcalarApiGetDatasetsInfo' : 92,
  'XcalarApiArchiveTables' : 93,
  'XcalarApiSessionDownload' : 94,
  'XcalarApiSessionUpload' : 95,
  'XcalarApiPublish' : 96,
  'XcalarApiUpdate' : 97,
  'XcalarApiSelect' : 98,
  'XcalarApiUnpublish' : 99,
  'XcalarApiListTables' : 100,
  'XcalarApiRestoreTable' : 101,
  'XcalarApiCoalesce' : 102,
  'XcalarApiSessionActivate' : 103,
  'XcalarApiPtChangeOwner' : 104,
  'XcalarApiDriver' : 105,
  'XcalarApiRuntimeSetParam' : 106,
  'XcalarApiRuntimeGetParam' : 107,
  'XcalarApiDatasetCreate' : 108,
  'XcalarApiDatasetDelete' : 109,
  'XcalarApiDatasetUnload' : 110,
  'XcalarApiDatasetGetMeta' : 111,
  'XcalarApiUdfGetResolution' : 112,
  'XcalarApiQueryList' : 113,
  'XcalarApiAddIndex' : 114,
  'XcalarApiRemoveIndex' : 115,
  'XcalarApiFunctionInvalid' : 116
};