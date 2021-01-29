// This is the Typescript shape of xcrpc JS client code(assets/js/xcrpc/*)

// === Service definitions: Begin ===
declare module 'xcalar' {
    import ProtoTypes = proto.xcalar.compute.localtypes;

    export class XceClient {
        constructor(endpoint: string);
    }

    export * from 'xcalarEnumMap';

    export class KvStoreService {
        constructor(client: XceClient);
        lookup(request: proto.xcalar.compute.localtypes.KvStore.LookupRequest): Promise<proto.xcalar.compute.localtypes.KvStore.LookupResponse>;
        addOrReplace(request: proto.xcalar.compute.localtypes.KvStore.AddOrReplaceRequest): Promise<void>;
        multiAddOrReplace(request: ProtoTypes.KvStore.MultiAddOrReplaceRequest): Promise<void>;
        deleteKey(request: proto.xcalar.compute.localtypes.KvStore.DeleteKeyRequest): Promise<void>;
        append(request:proto.xcalar.compute.localtypes.KvStore.AppendRequest): Promise<void>;
        setIfEqual(request:proto.xcalar.compute.localtypes.KvStore.SetIfEqualRequest): Promise<{noKV:boolean}>;
        list(request: proto.xcalar.compute.localtypes.KvStore.ListRequest): Promise<proto.xcalar.compute.localtypes.KvStore.ListResponse>

    }

    export class LicenseService {
        constructor(client: XceClient);
        get(request: proto.xcalar.compute.localtypes.License.GetRequest): Promise<proto.xcalar.compute.localtypes.License.GetResponse>;
        update(request: proto.xcalar.compute.localtypes.License.UpdateRequest): Promise<void>;
    }

    export class QueryService {
        constructor(client: XceClient);
        list(request: proto.xcalar.compute.localtypes.Query.ListRequest): Promise<proto.xcalar.compute.localtypes.Query.ListResponse>;
        execute(request: proto.xcalar.compute.localtypes.Query.ExecuteRequest): Promise<proto.xcalar.compute.localtypes.Query.ExecuteResponse>;
    }

    export class OperatorService {
        constructor(client: XceClient);
        opExport(request: proto.xcalar.compute.localtypes.Operator.ExportRequest): Promise<proto.xcalar.compute.localtypes.Operator.ExportResponse>;
        opBulkLoad(request: proto.xcalar.compute.localtypes.Operator.BulkLoadRequest): Promise<proto.xcalar.compute.localtypes.Operator.BulkLoadResponse>;
    }

    export class ResultSetService {
        constructor(client: XceClient);
        make(request: ProtoTypes.ResultSet.ResultSetMakeRequest): Promise<ProtoTypes.ResultSet.ResultSetMakeResponse>;
        release(request: ProtoTypes.ResultSet.ResultSetReleaseRequest): Promise<void>;
        next(request: ProtoTypes.ResultSet.ResultSetNextRequest): Promise<ProtoTypes.ResultSet.ResultSetNextResponse>;
        seek(request: ProtoTypes.ResultSet.ResultSetSeekRequest): Promise<void>;
    }

    export class UserDefinedFunctionService {
        constructor(client: XceClient);
        getResolution(request: proto.xcalar.compute.localtypes.UDF.GetResolutionRequest): Promise<proto.xcalar.compute.localtypes.UDF.GetResolutionResponse>;
        // XXX TO-DO Need backend to migrate from thrift to protobuf first
        // get(request: proto.xcalar.compute.localtypes.UDF.GetRequest): Promise<proto.xcalar.compute.localtypes.UDF.GetResponse>;
        // add(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): Promise<void>;
        // update(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): Promise<void>;
        // delete(request: proto.xcalar.compute.localtypes.UDF.DeleteRequest): Promise<void>;
    }

    export class PublishedTableService {
        constructor(client: XceClient)
        select(request: ProtoTypes.PublishedTable.SelectRequest): Promise<ProtoTypes.PublishedTable.SelectResponse>;
        listTables(request: ProtoTypes.PublishedTable.ListTablesRequest): Promise<ProtoTypes.PublishedTable.ListTablesResponse>;
    }

    export class XDFService {
        constructor(client: XceClient);
        listXdfs(request: ProtoTypes.XDF.ListXdfsRequest): ProtoTypes.XDF.ListXdfsResponse;
    }

    export class DataflowService {
        constructor(client: XceClient);
        execute(request: proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest): Promise<proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse>;
    }

    export class DataSetService {
        constructor(client: XceClient);
        create(request: proto.xcalar.compute.localtypes.Operator.BulkLoadRequest): Promise<proto.google.protobuf.Empty>;
    }

    export class TableService {
        constructor(client: XceClient);
        addIndex(request: proto.xcalar.compute.localtypes.Table.IndexRequest): Promise<proto.google.protobuf.Empty>;
        publishTable(request: proto.xcalar.compute.localtypes.Table.PublishRequest): Promise<proto.xcalar.compute.localtypes.Table.PublishResponse>;
        unpublishTable(request: proto.xcalar.compute.localtypes.Table.UnpublishRequest): Promise<proto.google.protobuf.Empty>;
        listTables(request: proto.xcalar.compute.localtypes.Table.ListTablesRequest): Promise<proto.xcalar.compute.localtypes.Table.ListTablesResponse>;
    }

    export class TargetService {
        constructor(client: XceClient);
        run(request: proto.xcalar.compute.localtypes.Target.TargetRequest): Promise<proto.xcalar.compute.localtypes.Target.TargetResponse>;
    }

    export class DagNodeService {
        constructor(client: XceClient);
        deleteObjects(request: proto.xcalar.compute.localtypes.DagNode.DeleteRequest): Promise<proto.xcalar.compute.localtypes.DagNode.DeleteResponse>;
        pin(request: proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg): Promise<proto.google.protobuf.Empty>;
        unpin(request: proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg): Promise<proto.google.protobuf.Empty>;
    }

    export class VersionService {
        constructor(client:XceClient);
        getVersion(request: proto.google.protobuf.Empty): Promise<proto.xcalar.compute.localtypes.Version.GetVersionResponse>;
    }

    export class SchemaLoadService {
        constructor(client:XceClient);
        appRun(request: proto.xcalar.compute.localtypes.SchemaLoad.AppRequest): Promise<proto.xcalar.compute.localtypes.SchemaLoad.AppResponse>;
    }

    export class SessionService {
        constructor(client: XceClient);
        create(request: proto.xcalar.compute.localtypes.Session.CreateRequest): Promise<proto.xcalar.compute.localtypes.Session.CreateResponse>;
        activate(request: proto.xcalar.compute.localtypes.Session.ActivateRequest): Promise<proto.xcalar.compute.localtypes.Session.ActivateResponse>;
        upload(request: proto.xcalar.compute.localtypes.Session.UploadRequest): Promise<proto.xcalar.compute.localtypes.Session.UploadResponse>;
        list(request: proto.xcalar.compute.localtypes.Session.ListRequest): Promise<proto.xcalar.compute.localtypes.Session.ListResponse>;
        deleteSession(request: proto.xcalar.compute.localtypes.Session.DeleteRequest): Promise<proto.google.protobuf.Empty>;
    }

    export class SqlService {
        constructor(client: XceClient);
        executeSQL(request: proto.xcalar.compute.localtypes.Sql.SQLQueryRequest): Promise<proto.xcalar.compute.localtypes.Sql.SQLQueryResponse>;
    }

    export class ConnectorsService {
        constructor(client: XceClient);
        listFiles(request: proto.xcalar.compute.localtypes.Connectors.ListFilesRequest): Promise<proto.xcalar.compute.localtypes.Connectors.ListFilesResponse>;
    }
}
// === Service definitions: End ===

// === Data structure definitions: Begin ===
declare namespace proto.xcalar.compute.localtypes {
    export namespace XcalarEnumType {
        export enum QueryState {
            QR_NOT_STARTED,
            QR_PROCESSING,
            QR_FINISHED,
            QR_ERROR,
            QR_CANCELLED
        }

        export enum DfFieldType {
            DF_UNKNOWN,
            DF_STRING,
            DF_INT32,
            DF_U_INT32,
            DF_INT64,
            DF_U_INT64,
            DF_FLOAT32,
            DF_FLOAT64,
            DF_BOOLEAN,
            DF_TIMESPEC,
            DF_BLOB,
            DF_NULL,
            DF_MIXED,
            DF_FATPTR,
            DF_SCALAR_PTR,
            DF_SCALAR_OBJ,
            DF_OP_ROW_META_PTR,
            DF_ARRAY,
            DF_OBJECT,
            DF_MONEY
        }

        export enum XcalarOrdering {
            XCALAR_ORDERING_UNORDERED,
            XCALAR_ORDERING_ASCENDING,
            XCALAR_ORDERING_DESCENDING,
            XCALAR_ORDERING_PARTIAL_ASCENDING,
            XCALAR_ORDERING_PARTIAL_DESCENDING,
            XCALAR_ORDERING_RANDOM,
            XCALAR_ORDERING_INVALID
        }

        export enum JoinOperator {
            INNER_JOIN,
            LEFT_OUTER_JOIN,
            RIGHT_OUTER_JOIN,
            FULL_OUTER_JOIN,
            CROSS_JOIN,
            LEFT_SEMI_JOIN,
            LEFT_ANTI_JOIN
        }

        export enum UnionOperator {
            UNION_STANDARD,
            UNION_INTERSECT,
            UNION_EXCEPT
        }

        export enum XcalarEvalArgType {
            OPTIONAL_ARG, REQUIRED_ARG, VARIABLE_ARG, UDF_ARG
        }

        export enum FunctionCategory {
            FUNCTION_CATEGORY_ARITHMETIC,
            FUNCTION_CATEGORY_BITWISE,
            FUNCTION_CATEGORY_TRIGONOMETRY,
            FUNCTION_CATEGORY_CONVERSION,
            FUNCTION_CATEGORY_STRING,
            FUNCTION_CATEGORY_MISC,
            FUNCTION_CATEGORY_CONDITION,
            FUNCTION_CATEGORY_AGGREGATE,
            FUNCTION_CATEGORY_CAST,
            FUNCTION_CATEGORY_UDF,
            FUNCTION_CATEGORY_TIMESTAMP
        }

        export enum XcalarApis {
            XCALAR_API_UNKNOWN,
            XCALAR_API_GET_VERSION,
            XCALAR_API_BULK_LOAD,
            XCALAR_API_INDEX,
            XCALAR_API_GET_TABLE_META,
            XCALAR_API_SHUTDOWN,
            XCALAR_API_GET_STAT,
            XCALAR_API_GET_STAT_BY_GROUP_ID,
            XCALAR_API_RESET_STAT,
            XCALAR_API_GET_STAT_GROUP_ID_MAP,
            XCALAR_API_LIST_DAG_NODE_INFO,
            XCALAR_API_LIST_DATASETS,
            XCALAR_API_SHUTDOWN_LOCAL,
            XCALAR_API_MAKE_RESULT_SET,
            XCALAR_API_RESULT_SET_NEXT,
            XCALAR_API_JOIN,
            XCALAR_API_PROJECT,
            XCALAR_API_GET_ROW_NUM,
            XCALAR_API_FILTER,
            XCALAR_API_GROUP_BY,
            XCALAR_API_RESULT_SET_ABSOLUTE,
            XCALAR_API_FREE_RESULT_SET,
            XCALAR_API_DELETE_OBJECTS,
            XCALAR_API_GET_TABLE_REF_COUNT,
            XCALAR_API_MAP,
            XCALAR_API_AGGREGATE,
            XCALAR_API_QUERY,
            XCALAR_API_QUERY_STATE,
            XCALAR_API_QUERY_CANCEL,
            XCALAR_API_QUERY_DELETE,
            XCALAR_API_ADD_EXPORT_TARGET,
            XCALAR_API_REMOVE_EXPORT_TARGET,
            XCALAR_API_LIST_EXPORT_TARGETS,
            XCALAR_API_EXPORT,
            XCALAR_API_GET_DAG,
            XCALAR_API_LIST_FILES,
            XCALAR_API_START_NODES,
            XCALAR_API_MAKE_RETINA,
            XCALAR_API_LIST_RETINAS,
            XCALAR_API_GET_RETINA,
            XCALAR_API_DELETE_RETINA,
            XCALAR_API_UPDATE_RETINA,
            XCALAR_API_LIST_PARAMETERS_IN_RETINA,
            XCALAR_API_EXECUTE_RETINA,
            XCALAR_API_IMPORT_RETINA,
            XCALAR_API_KEY_LOOKUP,
            XCALAR_API_KEY_ADD_OR_REPLACE,
            XCALAR_API_KEY_DELETE,
            XCALAR_API_GET_NUM_NODES,
            XCALAR_API_TOP,
            XCALAR_API_MEMORY,
            XCALAR_API_LIST_XDFS,
            XCALAR_API_RENAME_NODE,
            XCALAR_API_SESSION_NEW,
            XCALAR_API_SESSION_LIST,
            XCALAR_API_SESSION_RENAME,
            XCALAR_API_SESSION_SWITCH,
            XCALAR_API_SESSION_DELETE,
            XCALAR_API_SESSION_INFO,
            XCALAR_API_SESSION_INACT,
            XCALAR_API_SESSION_PERSIST,
            XCALAR_API_GET_QUERY,
            XCALAR_API_CREATE_DHT,
            XCALAR_API_KEY_APPEND,
            XCALAR_API_KEY_SET_IF_EQUAL,
            XCALAR_API_DELETE_DHT,
            XCALAR_API_SUPPORT_GENERATE,
            XCALAR_API_UDF_ADD,
            XCALAR_API_UDF_UPDATE,
            XCALAR_API_UDF_GET,
            XCALAR_API_UDF_DELETE,
            XCALAR_API_CANCEL_OP,
            XCALAR_API_GET_PER_NODE_OP_STATS,
            XCALAR_API_GET_OP_STATS,
            XCALAR_API_ERRORPOINT_SET,
            XCALAR_API_ERRORPOINT_LIST,
            XCALAR_API_PREVIEW,
            XCALAR_API_EXPORT_RETINA,
            XCALAR_API_START_FUNC_TESTS,
            XCALAR_API_LIST_FUNC_TESTS,
            XCALAR_API_DELETE_DATASETS,
            XCALAR_API_GET_CONFIG_PARAMS,
            XCALAR_API_SET_CONFIG_PARAM,
            XCALAR_API_APP_SET,
            XCALAR_API_GET_LICENSE,
            XCALAR_API_APP_RUN,
            XCALAR_API_APP_REAP,
            XCALAR_API_DEMO_FILE,
            XCALAR_API_UPDATE_LICENSE,
            XCALAR_API_LIST_FUNC_TEST,
            XCALAR_API_QUERY_NAME,
            XCALAR_API_START_FUNC_TEST,
            XCALAR_API_STAT,
            XCALAR_API_STAT_BY_GROUP_ID,
            XCALAR_API_TABLE,
            XCALAR_STRESS_SET_KEY_TYPE,
            XCALAR_API_DAG_TABLE_NAME,
            XCALAR_API_LICENSE_UPDATE,
            XCALAR_API_SESSION_LIST_SCALAR,
            XCALAR_API_SESSION_LIST_ARRAY,
            XCALAR_API_EX_EXPORT_TARGET,
            XCALAR_API_EX_EXPORT_TARGET_HDR,
            XCALAR_API_PACKED,
            XCALAR_API_DAG_NODE_NAME_PATTERN,
            XCALAR_API_DAG_NODE_NAME_PATTERN_DELETE,
            XCALAR_API_ADD_PARAMETER_TO_RETINA,
            XCALAR_API_GET_MEMORY_USAGE,
            XCALAR_API_LOG_LEVEL_SET,
            XCALAR_API_UPDATE_RETINA_EXPORT,
            XCALAR_API_GET_IP_ADDR,
            XCALAR_API_TAG_DAG_NODES,
            XCALAR_API_COMMENT_DAG_NODES,
            XCALAR_API_LIST_DATASET_USERS,
            XCALAR_API_LOG_LEVEL_GET,
            XCALAR_API_LOCK_DATASET,
            XCALAR_API_PER_NODE_TOP,
            XCALAR_API_KEY_LIST,
            XCALAR_API_GET_CURRENT_XEM_CONFIG,
            XCALAR_API_LIST_USER_DATASETS,
            XCALAR_API_UNION,
            XCALAR_API_TARGET,
            XCALAR_API_SYNTHESIZE,
            XCALAR_API_GET_RETINA_JSON,
            XCALAR_API_GET_DATASETS_INFO,
            XCALAR_API_ARCHIVE_TABLES,
            XCALAR_API_SESSION_DOWNLOAD,
            XCALAR_API_SESSION_UPLOAD,
            XCALAR_API_PUBLISH,
            XCALAR_API_UPDATE,
            XCALAR_API_SELECT,
            XCALAR_API_UNPUBLISH,
            XCALAR_API_LIST_TABLES,
            XCALAR_API_RESTORE_TABLE,
            XCALAR_API_COALESCE,
            XCALAR_API_USER_DETACH,
            XCALAR_API_SESSION_ACTIVATE,
            XCALAR_API_PT_CHANGE_OWNER,
            XCALAR_API_DRIVER,
            XCALAR_API_RUNTIME_SET_PARAM,
            XCALAR_API_RUNTIME_GET_PARAM,
            XCALAR_API_PT_SNAPSHOT,
            XCALAR_API_DATASET_CREATE,
            XCALAR_API_DATASET_DELETE,
            XCALAR_API_DATASET_UNLOAD,
            XCALAR_API_DATASET_GET_META,
            XCALAR_API_UDF_GET_RESOLUTION,
            XCALAR_API_CGROUP,
            XCALAR_API_QUERY_LIST,
            XCALAR_API_ADD_INDEX,
            XCALAR_API_REMOVE_INDEX,
            XCALAR_API_FUNCTION_INVALID
        }

        export enum Status {
            STATUS_OK,
            STATUS_PERM,
            STATUS_NO_ENT,
            STATUS_SRCH,
            STATUS_INTR,
            STATUS_IO,
            STATUS_NX_IO,
            STATUS2_BIG,
            STATUS_NO_EXEC,
            STATUS_BAD_F,
            STATUS_CHILD,
            STATUS_AGAIN,
            STATUS_NO_MEM,
            STATUS_ACCESS,
            STATUS_FAULT,
            STATUS_NOT_BLK,
            STATUS_BUSY,
            STATUS_EXIST,
            STATUS_EOF,
            STATUS_X_DEV,
            STATUS_NO_DEV,
            STATUS_NOT_DIR,
            STATUS_IS_DIR,
            STATUS_INVAL,
            STATUS_N_FILE,
            STATUS_M_FILE,
            STATUS_NO_TTY,
            STATUS_TXT_BSY,
            STATUS_F_BIG,
            STATUS_NO_SPC,
            STATUS_S_PIPE,
            STATUS_ROFS,
            STATUS_M_LINK,
            STATUS_PIPE,
            STATUS_DOM,
            STATUS_RANGE,
            STATUS_DEAD_LK,
            STATUS_NAME_TOO_LONG,
            STATUS_NO_LCK,
            STATUS_NO_SYS,
            STATUS_NOT_EMPTY,
            STATUS_LOOP,
            STATUS_NO_MSG,
            STATUS_ID_RM,
            STATUS_CH_RNG,
            STATUS_L2_N_SYNC,
            STATUS_L3_HLT,
            STATUS_L3_RST,
            STATUS_LN_RNG,
            STATUS_UNATCH,
            STATUS_NO_CSI,
            STATUS_L2_HLT,
            STATUS_BAD_E,
            STATUS_BAD_R,
            STATUS_X_FULL,
            STATUS_NO_ANO,
            STATUS_BAD_RQ_C,
            STATUS_BAD_SLT,
            STATUS_B_FONT,
            STATUS_NO_STR,
            STATUS_NO_DATA,
            STATUS_TIME,
            STATUS_NO_SR,
            STATUS_NO_NET,
            STATUS_NO_PKG,
            STATUS_REMOTE,
            STATUS_NO_LINK,
            STATUS_ADV,
            STATUS_SR_MNT,
            STATUS_COMM,
            STATUS_PROTO,
            STATUS_MULTIHOP,
            STATUS_DOT_DOT,
            STATUS_BAD_MSG,
            STATUS_OVERFLOW,
            STATUS_NOT_UNIQ,
            STATUS_BAD_FD,
            STATUS_REM_CHG,
            STATUS_LIB_ACC,
            STATUS_LIB_BAD,
            STATUS_LIB_SCN,
            STATUS_LIB_MAX,
            STATUS_LIB_EXEC,
            STATUS_IL_SEQ,
            STATUS_RESTART,
            STATUS_STR_PIPE,
            STATUS_USERS,
            STATUS_NOT_SOCK,
            STATUS_DEST_ADDR_REQ,
            STATUS_MSG_SIZE,
            STATUS_PROTOTYPE,
            STATUS_NO_PROTO_OPT,
            STATUS_PROTO_NO_SUPPORT,
            STATUS_SOCK_T_NO_SUPPORT,
            STATUS_OP_NOT_SUPP,
            STATUS_PF_NO_SUPPORT,
            STATUS_AF_NO_SUPPORT,
            STATUS_ADDR_IN_USE,
            STATUS_ADDR_NOT_AVAIL,
            STATUS_NET_DOWN,
            STATUS_NET_UNREACH,
            STATUS_NET_RESET,
            STATUS_CONN_ABORTED,
            STATUS_CONN_RESET,
            STATUS_NO_BUFS,
            STATUS_IS_CONN,
            STATUS_NOT_CONN,
            STATUS_SHUTDOWN,
            STATUS_TOO_MANY_REFS,
            STATUS_TIMED_OUT,
            STATUS_CONN_REFUSED,
            STATUS_HOST_DOWN,
            STATUS_HOST_UNREACH,
            STATUS_ALREADY,
            STATUS_IN_PROGRESS,
            STATUS_STALE,
            STATUS_U_CLEAN,
            STATUS_NOT_NAM,
            STATUS_N_AVAIL,
            STATUS_IS_NAM,
            STATUS_REMOTE_IO,
            STATUS_D_QUOT,
            STATUS_NO_MEDIUM,
            STATUS_MEDIUM_TYPE,
            STATUS_CANCELED,
            STATUS_NO_KEY,
            STATUS_KEY_EXPIRED,
            STATUS_KEY_REVOKED,
            STATUS_KEY_REJECTED,
            STATUS_OWNER_DEAD,
            STATUS_NOT_RECOVERABLE,
            STATUS_RF_KILL,
            STATUS_HW_POISON,
            STATUS_TRUNC,
            STATUS_UNIMPL,
            STATUS_UNKNOWN,
            STATUS_MSG_LIB_DELETE_FAILED,
            STATUS_THR_CREATE_FAILED,
            STATUS_THR_ABORTED,
            STATUS_CONFIG_LIB_DEV_OPEN_FAILED,
            STATUS_CONFIG_LIB_DEV_L_SEEK_FAILED,
            STATUS_CONFIG_LIB_FLASH_DEV_OPEN_FAILED,
            STATUS_CONFIG_LIB_FLASH_DEV_L_SEEK_FAILED,
            STATUS_CONFIG_LIB_DELETE_FAILED,
            STATUS_USR_NODE_INCORRECT_PARAMS,
            STATUS_UNICODE_UNSUPPORTED,
            STATUS_EAI_BAD_FLAGS,
            STATUS_EAI_NO_NAME,
            STATUS_EAI_FAIL,
            STATUS_EAI_SERVICE,
            STATUS_EAI_NO_DATA,
            STATUS_EAI_ADDR_FAMILY,
            STATUS_EAI_NOT_CANCEL,
            STATUS_EAI_ALL_DONE,
            STATUS_EAIIDN_ENCODE,
            STATUS_LAST,
            STATUS_MORE,
            STATUS_CLI_UNKNOWN_CMD,
            STATUS_CLI_PARSE_ERROR,
            STATUS_SCHED_QUEUE_LEN_EXCEEDED,
            STATUS_MSG_FAIL,
            STATUS_MSG_OUT_OF_MESSAGES,
            STATUS_MSG_SHUTDOWN,
            STATUS_NO_SUCH_NODE,
            STATUS_NEW_TABLE_CREATED,
            STATUS_NO_SUCH_RESULT_SET,
            STATUS_DF_APPEND_UNSUPPORTED,
            STATUS_DF_REMOVE_UNSUPPORTED,
            STATUS_DF_PARSE_ERROR,
            STATUS_DF_RECORD_CORRUPT,
            STATUS_DF_FIELD_NO_EXIST,
            STATUS_DF_UNKNOWN_FIELD_TYPE,
            STATUS_DF_RECORD_NOT_FOUND,
            STATUS_DF_VAL_NOT_FOUND,
            STATUS_DF_INVALID_FORMAT,
            STATUS_DF_LOCAL_FATPTR_ONLY,
            STATUS_DF_VALUES_BUF_TOO_SMALL,
            STATUS_DF_MAX_VALUES_PER_FIELD_EXCEEDED,
            STATUS_DF_FIELD_TYPE_UNSUPPORTED,
            STATUS_DF_MAX_DICTIONARY_SEGMENTS_EXCEEDED,
            STATUS_DF_BAD_RECORD_ID,
            STATUS_DF_MAX_RECORDS_EXCEEDED,
            STATUS_DF_TYPE_MISMATCH,
            STATUS_DS_TOO_MANY_KEY_VALUES,
            STATUS_DS_NOT_FOUND,
            STATUS_DS_LOAD_ALREADY_STARTED,
            STATUS_DS_URL_TOO_LONG,
            STATUS_DS_INVALID_URL,
            STATUS_DS_CREATE_NOT_SUPPORTED,
            STATUS_DS_UNLINK_NOT_SUPPORTED,
            STATUS_DS_RENAME_NOT_SUPPORTED,
            STATUS_DS_WRITE_NOT_SUPPORTED,
            STATUS_DS_SEEK_NOT_SUPPORTED,
            STATUS_DS_SEEK_FAILED,
            STATUS_DS_MK_DIR_NOT_SUPPORTED,
            STATUS_DS_RM_DIR_NOT_SUPPORTED,
            STATUS_DS_LOAD_FAILED,
            STATUS_DS_DATASET_IN_USE,
            STATUS_DS_FORMAT_TYPE_UNSUPPORTED,
            STATUS_DS_MYSQL_INIT_FAILED,
            STATUS_DS_MYSQL_CONNECT_FAILED,
            STATUS_DS_MYSQL_QUERY_FAILED,
            STATUS_EX_ODBC_CONNECT_FAILED,
            STATUS_EX_ODBC_CLEANUP_FAILED,
            STATUS_EX_ODBC_ADD_NOT_SUPPORTED,
            STATUS_EX_ODBC_BIND_FAILED,
            STATUS_EX_ODBC_TABLE_CREATION_FAILED,
            STATUS_EX_ODBC_EXPORT_FAILED,
            STATUS_EX_ODBC_TABLE_EXISTS,
            STATUS_EX_ODBC_TABLE_DOESNT_EXIST,
            STATUS_EX_TARGET_LIST_RACE,
            STATUS_EX_TARGET_ALREADY_EXISTS,
            STATUS_DS_GET_FILE_ATTR_NOT_SUPPORTED,
            STATUS_DS_GET_FILE_ATTR_COMPRESSED,
            STATUS_REALLOC_SHRINK_FAILED,
            STATUS_NS_OBJ_ALREADY_EXISTS,
            STATUS_TABLE_ALREADY_EXISTS,
            STATUS_CLI_UNCLOSED_QUOTES,
            STATUS_RANGE_PART_ERROR,
            STATUS_NEW_FIELD_NAME_IS_BLANK,
            STATUS_NO_DATA_DICT_FOR_FORMAT_TYPE,
            STATUS_B_TREE_NOT_FOUND,
            STATUS_B_TREE_KEY_TYPE_MISMATCH,
            STATUS_B_TREE_DATASET_MISMATCH,
            STATUS_CMD_NOT_COMPLETE,
            STATUS_INVALID_RESULT_SET_ID,
            STATUS_POSITION_EXCEED_RESULT_SET_SIZE,
            STATUS_HANDLE_IN_USE,
            STATUS_CLI_LINE_TOO_LONG,
            STATUS_CLI_ERROR_READ_FROM_FILE,
            STATUS_INVALID_TABLE_NAME,
            STATUS_NS_OBJ_NAME_TOO_LONG,
            STATUS_API_UNEXPECTED_EOF,
            STATUS_STATS_INVALID_GROUP_ID,
            STATUS_STATS_INVALID_GROUP_NAME,
            STATUS_INVALID_HANDLE,
            STATUS_THRIFT_PROTOCOL_ERROR,
            STATUS_B_TREE_HAS_NO_ROOT,
            STATUS_B_TREE_KEY_NOT_FOUND,
            STATUS_QA_KEY_VALUE_PAIR_NOT_FOUND,
            STATUS_AST_MALFORMED_EVAL_STRING,
            STATUS_AST_NO_SUCH_FUNCTION,
            STATUS_AST_WRONG_NUMBER_OF_ARGS,
            STATUS_FIELD_NAME_TOO_LONG,
            STATUS_FIELD_NAME_ALREADY_EXISTS,
            STATUS_XDF_WRONG_NUMBER_OF_ARGS,
            STATUS_XDF_UNARY_OPERAND_EXPECTED,
            STATUS_XDF_TYPE_UNSUPPORTED,
            STATUS_XDF_DIV_BY_ZERO,
            STATUS_XDF_FLOAT_NAN,
            STATUS_XDF_MIXED_TYPE_NOT_SUPPORTED,
            STATUS_XDF_AGGREGATE_OVERFLOW,
            STATUS_KV_NOT_FOUND,
            STATUS_XDB_SLOT_PRETTY_VACANT,
            STATUS_NO_DATA_IN_XDB,
            STATUS_XDB_LOAD_IN_PROGRESS,
            STATUS_XDB_NOT_FOUND,
            STATUS_XDB_UNINITIALIZED_CURSOR,
            STATUS_QR_TASK_FAILED,
            STATUS_QR_ID_NON_EXIST,
            STATUS_QR_JOB_NON_EXIST,
            STATUS_QR_JOB_RUNNING,
            STATUS_API_TASK_FAILED,
            STATUS_ALREADY_INDEXED,
            STATUS_EVAL_UNSUBSTITUTED_VARIABLES,
            STATUS_KV_DST_FULL,
            STATUS_MODULE_NOT_INIT,
            STATUS_MAX_JOIN_FIELDS_EXCEEDED,
            STATUS_XDB_KEY_TYPE_ALREADY_SET,
            STATUS_JOIN_TYPE_MISMATCH,
            STATUS_JOIN_DHT_MISMATCH,
            STATUS_FAILED,
            STATUS_ILLEGAL_FILE_NAME,
            STATUS_EMPTY_FILE,
            STATUS_EVAL_STRING_TOO_LONG,
            STATUS_TABLE_DELETED,
            STATUS_FAIL_OPEN_FILE,
            STATUS_QUERY_FAILED,
            STATUS_QUERY_NEEDS_NEW_SESSION,
            STATUS_CREATE_DAG_NODE_FAILED,
            STATUS_DELETE_DAG_NODE_FAILED,
            STATUS_RENAME_DAG_NODE_FAILED,
            STATUS_CHANGE_DAG_NODE_STATE_FAILED,
            STATUS_AGGREGATE_NO_SUCH_FIELD,
            STATUS_AGGREGATE_LOCAL_FN_NEED_ARGUMENT,
            STATUS_AGGREGATE_ACC_NOT_INITED,
            STATUS_AGGREGATE_RETURN_VALUE_NOT_SCALAR,
            STATUS_NS_MAXIMUM_OBJECTS_REACHED,
            STATUS_NS_OBJ_IN_USE,
            STATUS_NS_INVALID_OBJ_NAME,
            STATUS_NS_NOT_FOUND,
            STATUS_DAG_NODE_NOT_FOUND,
            STATUS_UPDATE_DAG_NODE_OPERATION_NOT_SUPPORTED,
            STATUS_MSG_MAX_PAYLOAD_EXCEEDED,
            STATUS_KV_ENTRY_NOT_FOUND,
            STATUS_KV_ENTRY_NOT_EQUAL,
            STATUS_STATS_COULD_NOT_GET_MEM_USED_INFO,
            STATUS_STATUS_FIELD_NOT_INITED,
            STATUS_AGG_NO_SUCH_FUNCTION,
            STATUS_WAIT_KEY_TIMEOUT,
            STATUS_VARIABLE_NAME_TOO_LONG,
            STATUS_DG_DAG_NOT_FOUND,
            STATUS_DG_INVALID_DAG_NAME,
            STATUS_DG_DAG_NAME_TOO_LONG,
            STATUS_DG_DAG_ALREADY_EXISTS,
            STATUS_DG_DAG_EMPTY,
            STATUS_DG_DAG_NOT_EMPTY,
            STATUS_DG_DAG_NO_MORE,
            STATUS_DG_DAG_RESERVED,
            STATUS_DG_NODE_IN_USE,
            STATUS_DG_DAG_NODE_ERROR,
            STATUS_DG_OPERATION_NOT_SUPPORTED,
            STATUS_DG_DAG_NODE_NOT_READY,
            STATUS_DG_FAIL_TO_DESTROY_HANDLE,
            STATUS_DS_DATASET_LOADED,
            STATUS_DS_DATASET_NOT_READY,
            STATUS_SESSION_NOT_FOUND,
            STATUS_SESSION_EXISTS,
            STATUS_SESSION_NOT_INACT,
            STATUS_SESSION_USR_NAME_INVALID,
            STATUS_SESSION_ERROR,
            STATUS_SESSION_USR_ALREADY_EXISTS,
            STATUS_DG_DELETE_OPERATION_NOT_PERMITTED,
            STATUS_UDF_MODULE_LOAD_FAILED,
            STATUS_UDF_MODULE_ALREADY_EXISTS,
            STATUS_UDF_MODULE_NOT_FOUND,
            STATUS_UDF_MODULE_EMPTY,
            STATUS_UDF_MODULE_INVALID_NAME,
            STATUS_UDF_MODULE_INVALID_TYPE,
            STATUS_UDF_MODULE_INVALID_SOURCE,
            STATUS_UDF_MODULE_SOURCE_TOO_LARGE,
            STATUS_UDF_FUNCTION_LOAD_FAILED,
            STATUS_UDF_FUNCTION_NOT_FOUND,
            STATUS_UDF_FUNCTION_NAME_TOO_LONG,
            STATUS_UDF_FUNCTION_TOO_MANY_PARAMS,
            STATUS_UDF_VAR_NAME_TOO_LONG,
            STATUS_UDF_UNSUPPORTED_TYPE,
            STATUS_UDF_PERSIST_INVALID,
            STATUS_UDF_PY_CONVERT,
            STATUS_UDF_EXECUTE_FAILED,
            STATUS_UDF_INVAL,
            STATUS_UDF_DELETE_PARTIAL,
            STATUS_XCALAR_EVAL_TOKEN_NAME_TOO_LONG,
            STATUS_NO_CONFIG_FILE,
            STATUS_COULD_NOT_RESOLVE_SCHEMA,
            STATUS_DHT_EMPTY_DHT_NAME,
            STATUS_DHT_UPPER_BOUND_LESS_THAN_LOWER_BOUND,
            STATUS_LOG_CHECKSUM_FAILED,
            STATUS_DHT_DOES_NOT_PRESERVE_ORDER,
            STATUS_LOG_MAXIMUM_ENTRY_SIZE_EXCEEDED,
            STATUS_LOG_CORRUPT_HEADER,
            STATUS_LOG_CORRUPT,
            STATUS_LOG_VERSION_MISMATCH,
            STATUS_KV_INVALID_KEY_CHAR,
            STATUS_DHT_PROTECTED,
            STATUS_KV_STORE_NOT_FOUND,
            STATUS_SSE42_UNSUPPORTED,
            STATUS_PY_BAD_UDF_NAME,
            STATUS_LIC_INPUT_INVALID,
            STATUS_LIC_FILE_OPEN,
            STATUS_LIC_FILE_READ,
            STATUS_LIC_FILE_WRITE,
            STATUS_LIC_PUB_KEY_MISSING,
            STATUS_LIC_PUB_KEY_ERR,
            STATUS_LIC_PUB_KEY_IDX,
            STATUS_LIC_MISSING,
            STATUS_LIC_ERR,
            STATUS_LIC_SIGNATURE_INVALID,
            STATUS_LIC_BASE32_MAP_INVALID,
            STATUS_LIC_BASE32_VAL_INVALID,
            STATUS_LIC_MD5_INVALID,
            STATUS_LIC_UNK_ERROR,
            STATUS_LIC_INVALID,
            STATUS_LIC_WRONG_SIZE,
            STATUS_LIC_EXPIRED,
            STATUS_LIC_OLD_VERSION,
            STATUS_LIC_INSUFFICIENT_NODES,
            STATUS_LOG_HANDLE_CLOSED,
            STATUS_LOG_HANDLE_INVALID,
            STATUS_SHUTDOWN_IN_PROGRESS,
            STATUS_ORDERING_NOT_SUPPORTED,
            STATUS_HDFS_NO_CONNECT,
            STATUS_HDFS_NO_DIRECTORY_LISTING,
            STATUS_CLI_CANVAS_TOO_SMALL,
            STATUS_DAG_PARAM_INPUT_TYPE_MISMATCH,
            STATUS_PARAMETER_TOO_LONG,
            STATUS_EXCEED_MAX_SCHEDULE_TIME,
            STATUS_EXCEED_MAX_SCHEDULE_PERIOD,
            STATUS_XCALAR_API_NOT_PARAMETERIZABLE,
            STATUS_QR_NOT_FOUND,
            STATUS_JOIN_ORDERING_MISMATCH,
            STATUS_INVALID_USER_COOKIE,
            STATUS_ST_TOO_MANY_SCHED_TASK,
            STATUS_ROW_UNFINISHED,
            STATUS_INPUT_TOO_LARGE,
            STATUS_CONFIG_INVALID,
            STATUS_INVAL_NODE_ID,
            STATUS_NO_LOCAL_NODES,
            STATUS_DS_FALLOCATE_NOT_SUPPORTED,
            STATUS_NO_EXTENSION,
            STATUS_EXPORT_TARGET_NOT_SUPPORTED,
            STATUS_EXPORT_INVALID_CREATE_RULE,
            STATUS_EXPORT_NO_COLUMNS,
            STATUS_EXPORT_TOO_MANY_COLUMNS,
            STATUS_EXPORT_COLUMN_NAME_TOO_LONG,
            STATUS_EXPORT_EMPTY_RESULT_SET,
            STATUS_EXPORT_UNRESOLVED_SCHEMA,
            STATUS_EXPORT_SF_FILE_EXISTS,
            STATUS_EXPORT_SF_FILE_DOESNT_EXIST,
            STATUS_MON_PORT_INVALID,
            STATUS_EXPORT_SF_FILE_DIR_DUPLICATE,
            STATUS_EXPORT_SF_FILE_CORRUPTED,
            STATUS_EXPORT_SF_FILE_RULE_NEEDS_NEW_FILE,
            STATUS_EXPORT_SF_FILE_RULE_SIZE_TOO_SMALL,
            STATUS_EXPORT_SF_SINGLE_SPLIT_CONFLICT,
            STATUS_EXPORT_SF_APPEND_SEP_CONFLICT,
            STATUS_EXPORT_SF_APPEND_SINGLE_HEADER,
            STATUS_EXPORT_SF_INVALID_HEADER_TYPE,
            STATUS_EXPORT_SF_INVALID_SPLIT_TYPE,
            STATUS_EXPORT_SF_MAX_SIZE_ZERO,
            STATUS_VERSION_MISMATCH,
            STATUS_FILE_CORRUPT,
            STATUS_API_FUNCTION_INVALID,
            STATUS_LIB_ARCHIVE_ERROR,
            STATUS_SEND_SOCKET_FAIL,
            STATUS_NODE_SKIPPED,
            STATUS_DF_CAST_TRUNCATION_OCCURRED,
            STATUS_EVAL_CAST_ERROR,
            STATUS_LOG_UNALIGNED,
            STATUS_STR_ENCODING_NOT_SUPPORTED,
            STATUS_SHMSG_INTERFACE_CLOSED,
            STATUS_OPERATION_HAS_FINISHED,
            STATUS_OPSTATISTICS_NOT_AVAIL,
            STATUS_RETINA_PARSE_ERROR,
            STATUS_RETINA_TOO_MANY_COLUMNS,
            STATUS_UDF_MODULE_OVERWRITTEN_SUCCESSFULLY,
            STATUS_SUPPORT_FAIL,
            STATUS_SHMSG_PAYLOAD_TOO_LARGE,
            STATUS_NO_CHILD,
            STATUS_CHILD_TERMINATED,
            STATUS_XDB_MAX_SG_ELEMS_EXCEEDED,
            STATUS_AGGREGATE_RESULT_NOT_FOUND,
            STATUS_MAX_ROW_SIZE_EXCEEDED,
            STATUS_MAX_DIRECTORY_DEPTH_EXCEEDED,
            STATUS_DIRECTORY_SUBDIR_OPEN_FAILED,
            STATUS_INVALID_DATASET_NAME,
            STATUS_MAX_STATS_GROUP_EXCEEDED,
            STATUS_LRQ_DUPLICATE_USER_DEFINED_FIELDS,
            STATUS_TYPE_CONVERSION_ERROR,
            STATUS_NOT_SUPPORTED_IN_PROD_BUILD,
            STATUS_OUT_OF_FAULT_INJ_MODULE_SLOTS,
            STATUS_NO_SUCH_ERRORPOINT_MODULE,
            STATUS_NO_SUCH_ERRORPOINT,
            STATUS_ALL_FILES_EMPTY,
            STATUS_STATS_GROUP_NAME_TOO_LONG,
            STATUS_STATS_NAME_TOO_LONG,
            STATUS_MAX_STATS_EXCEEDED,
            STATUS_STATS_GROUP_IS_FULL,
            STATUS_NO_MATCHING_FILES,
            STATUS_FIELD_NOT_FOUND,
            STATUS_IMMEDIATE_NAME_COLLISION,
            STATUS_FATPTR_PREFIX_COLLISION,
            STATUS_LIST_FILES_NOT_SUPPORTED,
            STATUS_ALREADY_LOAD_DONE,
            STATUS_SKIP_RECORD_NEEDS_DELIM,
            STATUS_NO_PARENT,
            STATUS_REBUILD_DAG_FAILED,
            STATUS_STACK_SIZE_TOO_SMALL,
            STATUS_TARGET_DOESNT_EXIST,
            STATUS_EX_ODBC_REMOVE_NOT_SUPPORTED,
            STATUS_FUNCTIONAL_TEST_DISABLED,
            STATUS_FUNCTIONAL_TEST_NUM_FUNC_TEST_EXCEEDED,
            STATUS_TARGET_CORRUPTED,
            STATUS_UDF_PY_CONVERT_FROM_FAILED,
            STATUS_HDFS_WR_NOT_SUPPORTED,
            STATUS_FUNCTIONAL_TEST_NO_TABLES_LEFT,
            STATUS_FUNCTIONAL_TEST_TABLE_EMPTY,
            STATUS_REGEX_COMPILE_FAILED,
            STATUS_UDF_NOT_FOUND,
            STATUS_APIS_WORK_TOO_MANY_OUTSTANDING,
            STATUS_INVALID_USER_NAME_LEN,
            STATUS_UDF_PY_INJECT_FAILED,
            STATUS_USR_NODE_INITED,
            STATUS_FILE_LIST_PARSE_ERROR,
            STATUS_LOAD_ARGS_INVALID,
            STATUS_ALL_WORK_DONE,
            STATUS_UDF_ALREADY_EXISTS,
            STATUS_UDF_FUNCTION_TOO_FEW_PARAMS,
            STATUS_DG_OPERATION_IN_ERROR,
            STATUS_APP_NAME_INVALID,
            STATUS_APP_HOST_TYPE_INVALID,
            STATUS_APP_EXEC_TOO_BIG,
            STATUS_RCC_INIT_ERR,
            STATUS_RCC_DEFAULT,
            STATUS_RCC_NOT_FOUND,
            STATUS_RCC_ELEM_NOT_FOUND,
            STATUS_RCC_INCOMPATIBLE_STATE,
            STATUS_GVM_INVALID_ACTION,
            STATUS_GLOBAL_VARIABLE_NOT_FOUND,
            STATUS_CORRUPTED_OUTPUT_SIZE,
            STATUS_DATASET_NAME_ALREADY_EXISTS,
            STATUS_DATASET_ALREADY_DELETED,
            STATUS_RETINA_NOT_FOUND,
            STATUS_DHT_NOT_FOUND,
            STATUS_TABLE_NOT_FOUND,
            STATUS_RETINA_TOO_MANY_PARAMETERS,
            STATUS_CONFIG_PARAM_IMMUTABLE,
            STATUS_OPERATION_IN_ERROR,
            STATUS_OPERATION_CANCELLED,
            STATUS_QR_QUERY_NOT_EXIST,
            STATUS_DG_PARENT_NODE_NOT_EXIST,
            STATUS_LOAD_APP_NOT_EXIST,
            STATUS_APP_OUT_PARSE_FAIL,
            STATUS_FAULT_INJECTION,
            STATUS_FAULT_INJECTION2_PC,
            STATUS_EXPORT_APP_NOT_EXIST,
            STATUS_SESSION_USR_IN_USE,
            STATUS_NO_XDB_PAGE_BC_MEM,
            STATUS_APP_FLAGS_INVALID,
            STATUS_QUERY_JOB_PROCESSING,
            STATUS_TWO_PC_BAR_MSG_INVALID,
            STATUS_TWO_PC_BAR_TIMEOUT,
            STATUS_TOO_MANY_CHILDREN,
            STATUS_MAX_FILE_LIMIT_REACHED,
            STATUS_API_WOULD_BLOCK,
            STATUS_EXPORT_SF_SINGLE_HEADER_CONFLICT,
            STATUS_AGG_FN_IN_CLASS1_AST,
            STATUS_DAG_NODE_DROPPED,
            STATUS_XDB_SLOT_HAS_ACTIVE_CURSOR,
            STATUS_PROTOBUF_DECODE_ERROR,
            STATUS_APP_LOAD_FAILED,
            STATUS_APP_DOES_NOT_EXIST,
            STATUS_NOT_SHARED,
            STATUS_PROTOBUF_ENCODE_ERROR,
            STATUS_JSON_ERROR,
            STATUS_MSG_STREAM_NOT_FOUND,
            STATUS_UNDERFLOW,
            STATUS_PAGE_CACHE_FULL,
            STATUS_SCHED_TASK_FUNCTIONALITY_REMOVED,
            STATUS_PENDING_REMOVAL,
            STATUS_APP_FAILED_TO_GET_OUTPUT,
            STATUS_APP_FAILED_TO_GET_ERROR,
            STATUS_NS_INTERNAL_TABLE_ERROR,
            STATUS_NS_STALE,
            STATUS_DUR_HANDLE_NO_INIT,
            STATUS_DUR_VER_ERROR,
            STATUS_DUR_DIRTY_WRITER,
            STATUS_MAX_FIELD_SIZE_EXCEEDED,
            STATUS_QR_QUERY_ALREADY_EXISTS,
            STATUS_UDF_MODULE_IN_USE,
            STATUS_TARGET_IN_USE,
            STATUS_OPERATION_OUTSTANDING,
            STATUS_DHT_ALREADY_EXISTS,
            STATUS_DHT_IN_USE,
            STATUS_TOO_MANY_RESULT_SETS,
            STATUS_RETINA_ALREADY_EXISTS,
            STATUS_RETINA_IN_USE,
            STATUS_COMPRESS_FAILED,
            STATUS_DE_COMPRESS_FAILED,
            STATUS_QR_QUERY_NAME_INVALID,
            STATUS_QR_QUERY_ALREADY_DELETED,
            STATUS_QR_QUERY_IN_USE,
            STATUS_XDB_SER_ERROR,
            STATUS_XDB_DES_ERROR,
            STATUS_XDB_RESIDENT,
            STATUS_XDB_NOT_RESIDENT,
            STATUS_SESSION_ALREADY_INACT,
            STATUS_SESSION_INACT,
            STATUS_SESSION_USR_ALREADY_DELETED,
            STATUS_SESSION_USR_NOT_EXIST,
            STATUS_NO_SHUTDOWN_PRIVILEGE,
            STATUS_SERIALIZATION_LIST_EMPTY,
            STATUS_APP_ALREADY_EXISTS,
            STATUS_APP_NOT_FOUND,
            STATUS_APP_IN_USE,
            STATUS_INVALID_STREAM_CONTEXT,
            STATUS_INVALID_STATS_PROTOCOL,
            STATUS_STAT_STREAM_PARTIAL_FAILURE,
            STATUS_LOG_LEVEL_SET_INVALID,
            STATUS_CONNECTION_WRONG_HANDSHAKE,
            STATUS_QUERY_ON_ANOTHER_NODE,
            STATUS_APP_INSTANCE_START_ERROR,
            STATUS_APIS_RECV_TIMEOUT,
            STATUS_IP_ADDR_TOO_LONG,
            STATUS_SUPPORT_BUNDLE_NOT_SENT,
            STATUS_INVALID_BLOB_STREAM_PROTOCOL,
            STATUS_STREAM_PARTIAL_FAILURE,
            STATUS_UNKNOWN_PROC_MEM_INFO_FILE_FORMAT,
            STATUS_APIS_WORK_INVALID_SIGNATURE,
            STATUS_APIS_WORK_INVALID_LENGTH,
            STATUS_LMDB_ERROR,
            STATUS_XPU_NO_BUFS_TO_RECV,
            STATUS_JOIN_INVALID_ORDERING,
            STATUS_DATASET_ALREADY_LOCKED,
            STATUS_USRNODE_STILL_ALIVE,
            STATUS_BUFFER_ON_FAILED,
            STATUS_CANT_UNBUFFER_LOGS,
            STATUS_LOG_FLUSH_PERIOD_FAILURE,
            STATUS_INVALID_LOG_LEVEL,
            STATUS_NO_DS_USERS,
            STATUS_JSON_QUERY_PARSE_ERROR,
            STATUS_XEM_NOT_CONFIGURED,
            STATUS_NO_DATASET_MEMORY,
            STATUS_TABLE_EMPTY,
            STATUS_USR_ADD_IN_PROG,
            STATUS_SESSION_NOT_ACTIVE,
            STATUS_USR_SESS_LOAD_FAILED,
            STATUS_PROTOBUF_ERROR,
            STATUS_RECORD_ERROR,
            STATUS_CANNOT_REPLACE_KEY,
            STATUS_SERIALIZATION_IS_DISABLED,
            STATUS_FIELD_LIMIT_EXCEEDED,
            STATUS_WRONG_NUMBER_OF_ARGS,
            STATUS_MISSING_XCALAR_OP_CODE,
            STATUS_MISSING_XCALAR_RANK_OVER,
            STATUS_INVALID_XCALAR_OP_CODE,
            STATUS_INVALID_XCALAR_RANK_OVER,
            STATUS_INVALID_RUNTIME_PARAMS,
            STATUS_INV_PUB_TABLE_NAME,
            STATUS_EXISTS_PUB_TABLE_NAME,
            STATUS_UNLICENSED_FEATURE_IN_USE,
            STATUS_LIC_PRIV_KEY_MISSING,
            STATUS_LIC_PRIV_KEY_ERR,
            STATUS_LIC_PASSWD_MISSING,
            STATUS_LIC_LICENSE_MISSING,
            STATUS_LIC_SIGNATURE_MISSING,
            STATUS_LIC_BUF_TOO_SMALL,
            STATUS_LIC_PASSWORD_ERROR,
            STATUS_LIC_VALUE_OUT_OF_RANGE,
            STATUS_LIC_DECOMPRESS_INIT,
            STATUS_LIC_DECOMPRESS_ERR,
            STATUS_LIC_LICENSE_TOO_LARGE,
            STATUS_LIC_COMPRESS_INIT,
            STATUS_LIC_UNSUPPORTED_OPERATION,
            STATUS_LIC_OP_DISABLED_UNLICENSED,
            STATUS_WORKBOOK_INVALID_VERSION,
            STATUS_PUB_TABLE_NAME_NOT_FOUND,
            STATUS_PUB_TABLE_UPDATE_NOT_FOUND,
            STATUS_UPGRADE_REQUIRED,
            STATUS_UDF_NOT_SUPPORTED_IN_CROSS_JOINS,
            STATUS_RETINA_NAME_INVALID,
            STATUS_NO_DEMAND_PAGING_PATH,
            STATUS_EVAL_INVALID_TOKEN,
            STATUS_XDF_INVALID_ARRAY_INPUT,
            STATUS_BUF_CACHE_THICK_ALLOC_FAILED,
            STATUS_DUR_BAD_SHA,
            STATUS_DUR_BAD_IDL_VER,
            STATUS_SESS_LIST_INCOMPLETE,
            STATUS_PUB_TABLE_INACTIVE,
            STATUS_PUB_TABLE_RESTORING,
            STATUS_SELF_SELECT_REQUIRED,
            STATUS_SESSION_NAME_MISSING,
            STATUS_XPU_CONN_ABORTED,
            STATUS_PT_UPDATE_PERM_DENIED,
            STATUS_PT_COALESCE_PERM_DENIED,
            STATUS_PT_OWNER_NODE_MISMATCH,
            STATUS_NS_REF_TO_OBJECT_DENIED,
            STATUS_CHECKSUM_NOT_FOUND,
            STATUS_CHECKSUM_MISMATCH,
            STATUS_RUNTIME_SET_PARAM_INVALID,
            STATUS_RUNTIME_SET_PARAM_NOT_SUPPORTED,
            STATUS_PUBLISH_TABLE_SNAPSHOT_IN_PROGRESS,
            STATUS_UDF_OWNER_NODE_MISMATCH,
            STATUS_UDF_SOURCE_MISMATCH,
            STATUS_UDF_UPDATE_FAILED,
            STATUS_UDF_BAD_PATH,
            STATUS_DS_META_DATA_NOT_FOUND,
            STATUS_DATASET_ALREADY_UNLOADED,
            STATUS_UDF_MODULE_FULL_NAME_REQUIRED,
            STATUS_CGROUPS_DISABLED,
            STATUS_CGROUP_APP_IN_PROGRESS,
            STATUS_JSON_SESS_SERIALIZE_ERROR,
            STATUS_SESS_MDATA_INCONSISTENT,
            STATUS_RUNTIME_CHANGE_IN_PROGRESS,
            STATUS_SELECT_LIMIT_REACHED,
            STATUS_LEGACY_TARGET_NOT_FOUND,
            STATUS_DFP_ERROR,
            STATUS_CGROUP_IN_PROGRESS,
            STATUS_CONFIG_CHANGE_IN_PROGRESS,
            STATUS_KV_INVALID_KEY,
            STATUS_KV_INVALID_VALUE,
            STATUS_INV_TABLE_NAME,
            STATUS_EXISTS_TABLE_NAME,
            STATUS_TABLE_NAME_NOT_FOUND,
            STATUS_COMPLEX_TYPE_NOT_SUPPORTED,
            STATUS_PARQUET_PARSER_ERROR,
            STATUS_UN_SUPPORTED_DECIMAL_TYPE,
            STATUS_UN_SUPPORTED_LOGICAL_TYPE,
            STATUS_CLUSTER_NOT_READY
        }
    }

    export namespace Workbook {
        export class WorkbookScope {
            setGlobl(value: GlobalSpecifier): void;
            setWorkbook(value: WorkbookSpecifier): void;
        }

        export class GlobalSpecifier {}

        export class WorkbookSpecifier {
            setName(value: WorkbookSpecifier.NameSpecifier): void;
        }
        export namespace WorkbookSpecifier {
            export class NameSpecifier {
                setUsername(value: string): void;
                setWorkbookname(value: string): void;
            }
        }

        export const ScopeType: {
            GLOBALSCOPETYPE: number,
            WORKBOOKSCOPETYPE: number
        }
    }

    export namespace KvStore {
        export class LookupRequest {
            setKey(value: ScopedKey): void;
        }
        export class LookupResponse {
            getValue(): KeyValue;
        }
        export class KeyValue {
            setText(value: string): void;
            getText(): string;
        }
        export class ScopedKey {
            setName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class AddOrReplaceRequest {
            setKey(value: ScopedKey): void;
            setPersist(value: boolean): void;
            setValue(value: KeyValue): void;
        }

        export class MultiAddOrReplaceRequest {
            setKeysList(value: Array<string>): void;
            setScope(value: Workbook.WorkbookScope): void;
            setPersist(value: boolean): void;
            setValuesList(value: Array<KeyValue>): void;
        }

        export class DeleteKeyRequest {
            setKey(value: ScopedKey): void;
        }
        export class AppendRequest {
            setKey(value: ScopedKey): void;
            setSuffix(value: string):void;
        }

        export class SetIfEqualRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setPersist(value: boolean): void;
            setCountSecondaryPairs(value: number): void;
            setKeyCompare(value: string): void;
            setValueCompare(value: string); void;
            setValueReplace(value:string): void;
            setKeySecondary(value: string): void;
            setValueSecondary(value: string): void;
        }

        export class ListRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setKeyRegex(value: string):void;
        }

        export class ListResponse {
            getKeysList(): Array<string>;
        }
    }

    export namespace License {
        export class GetRequest {}
        export class GetResponse {
            getLoaded(): boolean;
            getExpired(): boolean;
            getPlatform(): string;
            getProduct(): string;
            getProductFamily(): string;
            getProductVersion(): string;
            getExpiration(): string;
            getNodeCount(): number;
            getUserCount(): number;
            getAttributes(): string;
            getLicensee(): string;
            getCompressedLicenseSize(): number;
            getCompressedLicense(): string;
        }
        export class UpdateRequest {
            setLicenseValue(value: LicenseValue): void;
        }
        export class LicenseValue {
            setValue(value: string): void;
        }
    }

    export namespace ResultSet {
        export class ResultSetMakeRequest {
            setName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
            setErrorDataset(value: boolean): void;
            setMakeType(value: number): void
        }

        export class ResultSetMakeResponse {
            getResultSetId(): number;
            getNumRows(): number;
            getGetTableMeta(): TableMeta.GetTableMetaProto;
        }

        export class ResultSetReleaseRequest {
            setResultSetId(value: number): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class ResultSetNextRequest {
            setResultSetId(value: number): void;
            setNumRows(value: number): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class ResultSetNextResponse {
            /// XXX: TODO: Define the types for RowMeta and ProtoRow
            getMetasList(): {array: string}[]; // RowMeta
            getRowsList(): any[]; // ProtoRow
        }

        export class ResultSetSeekRequest {
            setResultSetId(value: number): void;
            setRowIndex(value: number): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export const MakeType: {
            TABLE: number, DATASET: number
        }
    }

    export namespace TableMeta {
        export class TableMetaProto {
            getStatus(): string;
            getNumRows(): number;
            getNumPages(): number;
            getNumSlots(): number;
            getSize(): number;
            getRowsPerSlotMap(): Map<number, number>;
            getPagesPerSlotMap(): Map<number, number>;
            getPagesConsumedInBytes(): number;
            getPagesAllocatedInBytes(): number;
            getPagesSent(): number;
            getPagesReceived(): number;
        }
        export class GetTableMetaProto {
            getDatasetsList(): string[];
            getResultSetIdsList(): number[];
            getColumnAttributesMap(): Map<string, ColumnAttribute.ColumnAttributeProto>;
            getKeyAttributesMap(): Map<string, ColumnAttribute.KeyAttributeProto>;
            getTableMetaMap(): Map<number, TableMeta.TableMetaProto>;
            getNumImmediates(): number;
            getOrdering(): string;
        }
    }

    export namespace Query {
        export class ListRequest {
            setNamePattern(value: string): void;
        }
        export class ListResponse {
            getQueriesList(): QueryInfo[];
        }
        export class DeleteRequest{
            setQueryName(value: string): void;
        }
        export class DeleteResponse{
        }
        export class CancelRequest{
            setQueryName(value: string): void;
        }
        export class CancelResponse{
        }

        export class QueryInfo {
            getName(): string;
            getMillisecondsElapsed(): number;
            getState(): proto.xcalar.compute.localtypes.XcalarEnumType.QueryState;
        }

        export class ExecuteRequest {
            setSameSession(value: boolean): void;
            setQueryName(value: string): void;
            setQueryStr(value: string): void;
            setBailOnError(value: boolean): void;
            setSchedName(value: string): void;
            setIsAsync(value: boolean): void;
            setUdfUserName(value: string): void;
            setUdfSessionName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class ExecuteResponse {
            getQueryName(): string
        }
    }

    export namespace PublishedTable {
        export class SelectRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setMinBatchId(value: number): void;
            setMaxBatchId(value: number): void;
            setEval(value: SelectEvalArgs): void;
            setColumnsList(value: Operator.XcalarApiColumn[]): void;
            addColumns(value: Operator.XcalarApiColumn): void;
            setLimitRows(value: number): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class SelectResponse {
            getTableName(): string;
        }

        export class SelectGroupByEvalArg {
            setFunc(value: string): void;
            setArg(value: string): void;
            setNewField(value: string): void;
        }

        export class SelectEvalArgs {
            setMapList(value: Operator.XcalarApiEval[]): void;
            addMap(value: Operator.XcalarApiEval): void;
            setFilter(value: string): void;
            setGroupByKeyList(value: string[]): void;
            addGroupByKey(value: string): void;
            setGroupByList(value: SelectGroupByEvalArg[]): void;
            addGroupBy(value: SelectGroupByEvalArg): void;
        }

        export class ListTablesRequest {
            setNamePattern(value: string): void;
            setUpdateStartBatchId(value: number): void;
            setMaxUpdateCount(value: number): void;
            setMaxSelectCount(value: number): void;
        }

        export class ListTablesResponse {
            getTablesList(): Array<ListTablesResponse.TableInfo>
        }

        export namespace ListTablesResponse {
            export class UpdateInfo {
                getSrcTableName(): string;
                getBatchId(): number;
                getStartTs(): number;
                getNumRows(): number;
                getNumInserts(): number;
                getNumUpdates(): number;
                getNumDeletes(): number;
                getSize(): number;
            }

            export class SelectInfo {
                getDstTableName(): string;
                getMinBatchId(): number;
                getMaxBatchId(): number;
            }

            export class IndexInfo {
                getKey(): ColumnAttribute.ColumnAttributeProto;
                getUptimeMs(): number;
                getSizeEstimate(): number;
            }

            export class TableInfo {
                getName(): string;
                getNumPersistedUpdates(): number;
                getSizeTotal(): number;
                getNumRowsTotal(): number;
                getOldestBatchId(): number;
                getNextBatchId(): number;
                getSrcTableName(): string;
                getActive(): boolean;
                getRestoring(): boolean;
                getUserIdName(): string;
                getSessionName(): string;
                getKeysList(): Array<ColumnAttribute.ColumnAttributeProto>;
                getValuesList(): Array<ColumnAttribute.ColumnAttributeProto>;
                getUpdatesList(): Array<UpdateInfo>;
                getSelectsList(): Array<SelectInfo>;
                getIndexesList(): Array<IndexInfo>;
            }
        }
    }

    export namespace ColumnAttribute {
        export class ColumnAttributeProto {
            getName(): string;
            getType(): string;
            getValueArrayIdx(): number;
        }

        export class KeyAttributeProto {
            getName(): string;
            getType(): string;
            getValueArrayIdx(): number;
            getOrdering(): string;
        }
    }

    export namespace Operator {
        // Requests & Responses
        export class AggRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalList(value: XcalarApiEval[]): void;
            addEval(value: XcalarApiEval): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class AggResponse {
            getTableName(): string;
            getJsonAnswer(): string;
        }
        export class IndexRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setKeyList(value: XcalarApiKey[]): void;
            addKey(value: XcalarApiKey): void;
            setPrefix(value: string): void;
            setDhtName(value: string): void;
            setDelaySort(value: boolean): void;
            setBroadcast(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class IndexResponse {
            getTableName(): string;
        }
        export class ProjectRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: string[]): void;
            addColumns(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class ProjectResponse {
            getTableName(): string;
        }
        export class GetRowNumRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setNewField(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class GetRowNumResponse {
            getTableName(): string;
        }
        export class FilterRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalList(value: XcalarApiEval[]): void;
            addEval(value: XcalarApiEval): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class FilterResponse {
            getTableName(): string;
        }
        export class JoinRequest {
            setSourceList(value: string[]): void;
            addSource(value: string): void;
            setDest(value: string): void;
            setJoinType(value: XcalarEnumType.JoinOperator): void;
            setColumnsList(value: Columns[]): void;
            addColumns(value: Columns): void;
            setEvalString(value: string): void;
            setKeepAllColumns(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class JoinResponse {
            getTableName(): string;
        }
        export class MapRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalsList(value: XcalarApiEval[]): void;
            addEvals(value: XcalarApiEval): void;
            setIcv(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class MapResponse {
            getTableName(): string;
        }
        export class GroupByRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalsList(value: XcalarApiEval[]): void;
            addEvals(value: XcalarApiEval): void;
            setNewKeyField(value: string): void;
            setIncludeSample(value: boolean): void;
            setIcv(value: boolean): void;
            setGroupAll(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class GroupByResponse {
            getTableName(): string;
        }
        export class UnionRequest {
            setSourceList(value: string[]): void;
            addSource(value: string): void;
            setDest(value: string): void;
            setDedup(value: boolean): void;
            setColumnsList(value: Columns[]): void;
            addColumns(value: Columns): void;
            setUnionType(value: XcalarEnumType.UnionOperator): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class UnionResponse {
            getTableName(): string;
        }
        export class BulkLoadRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setDest(value: string): void;
            setLoadArgs(value: DfLoadArgs): void;
            setDagNodeId(value: string): void;
        }
        export class BulkLoadResponse {
            getDataSet(): XcalarDataSet;
            getNumFiles(): number;
            getNumBytes(): number;
            getErrorString(): string;
            getErrorFile(): string;
        }
        export class ExportRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: XcalarApiExportColumn[]): void;
            addColumns(value: XcalarApiExportColumn): void;
            setDriverName(value: string): void;
            setDriverParams(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class ExportResponse {
        }
        export class SynthesizeRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: XcalarApiColumn[]): void;
            addColumns(value: XcalarApiColumn): void;
            setSameSession(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class SynthesizeResponse {
            getTableName(): string;
        }

        // Struct messages
        export class XcalarApiEval {
            setEvalString(value: string): void;
            setNewField(value: string): void;
        }
        export class XcalarApiKey {
            setName(value: string): void;
            setType(value: XcalarEnumType.DfFieldType): void;
            setKeyFieldName(value: string): void;
            setOrdering(value: XcalarEnumType.XcalarOrdering): void;
        }
        export class XcalarApiColumn {
            setSourceColumn(value: string): void;
            setDestColumn(value: string): void;
            setColumnType(value: XcalarEnumType.DfFieldType): void;
        }
        export class Columns {
            setColsList(value: XcalarApiColumn[]): void;
            addCols(value: XcalarApiColumn): void;
        }
        export class DataSourceArgs {
            setTargetName(value: string): void;
            getTargetName(): string;
            setPath(value: string): void;
            getPath(): string;
            setFileNamePattern(value: string): void;
            getFileNamePattern(): string;
            setRecursive(value: boolean): void;
            getRecursive(): boolean;
        }
        export class ParseArgs {
            setParserFnName(value: string): void;
            getParserFnName(): string;
            setParserArgJson(value: string): void;
            getParserArgJson(): string;
            setFileNameFieldName(value: string): void;
            getFileNameFieldName(): string;
            setRecordNumFieldName(value: string): void;
            getRecordNumFieldName(): string;
            setAllowRecordErrors(value: boolean): void;
            getAllowRecordErrors(): boolean;
            setAllowFileErrors(value: boolean): void;
            getAllowFileErrors(): boolean;
            setSchemaList(value: XcalarApiColumn[]): void;
            addSchema(value: XcalarApiColumn): void;
            getSchemaList(): XcalarApiColumn[];
        }
        export class DfLoadArgs {
            setSourceArgsListList(value: DataSourceArgs[]): void;
            addSourceArgsList(value: DataSourceArgs): void;
            getSourceArgsListList(): DataSourceArgs[];
            setParseArgs(value: ParseArgs): void;
            getParseArgs(): ParseArgs;
            setSize(value: number): void;
            getSize(): number;
        }
        export class XcalarDataSet {
            getLoadArgs(): DfLoadArgs;
            getDatasetId(): string;
            getName(): string;
            getLoadIsComplete(): boolean;
            getIsListable(): boolean;
            getUdfName(): string;
        }
        export class XcalarApiExportColumn {
            setColumnName(value: string): void;
            setHeaderName(value: string): void;
            getColumnName() : string;
            getHeaderName(): string;
        }
    }

    export namespace Table {
        export class IndexRequest {
            setKeyName(value: string): void;
            setTableName(value: string): void;
        }

        export class PublishRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setTableName(value: string): void;
        }

        export class PublishResponse {
            getFullyQualTableName(): string;
        }

        export class UnpublishRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setTableName(value: string): void;
        }

        export class ListTablesRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setPattern(value: string): void;
        }

        export class ListTablesResponse {
            getScope(): Workbook.WorkbookScope;
            getTableNamesList(): string[];
            getTableMetaMapMap(): Map<string, TableMetaResponse>;
        }

        export class TableStatsPerNode {
            getStatus(): string;
            getNumRows(): number;
            getNumPages(): number;
            getNumSlots(): number;
            getSizeInBytes(): number;
            getRowsPerSlotMap(): Map<number, number>;
            getPagesPerSlotMap(): Map<number, number>;
            getPagesConsumedInBytes(): number;
            getPagesAllocatedInBytes(): number;
            getPagesSent(): number;
            getPagesReceived(): number;
        }

        export class TableAttributes {
            getTableName(): string;
            getTableId(): number;
            getXdbId(): number;
            getState(): string;
            getPinned(): boolean;
            getShared(): boolean;
            getDatasetsList(): string[];
            getResultSetIdsList(): number[];
        }

        export class TableAggregatedStats {
            getTotalRecordsCount(): number;
            getTotalSizeInBytes(): number;
            getRowsPerNodeList(): number[];
            getSizeInBytesPerNodeList(): number[];
        }

        export class TableSchema {
            getColumnAttributesList(): ColumnAttribute.ColumnAttributeProto[];
            getKeyAttributesList(): ColumnAttribute.KeyAttributeProto[];
        }

        export class TableMetaResponse {
            getAttributes(): TableAttributes;
            getSchema(): TableSchema;
            getAggregatedStats(): TableAggregatedStats;
            getStatsPerNodeMap(): Map<string, TableStatsPerNode>;
            getStatus(): string;
        }
    }

    export namespace DagNode {
        export class XcalarApiDagNodeInfo {
            getName(): string;
            getDagNodeId(): number;
            getState(): string;
            getSize(): number;
            getApi(): string;
        }
        export class DagRef {
            getType(): string;
            getName(): string;
            getXid(): string;
        }
        export class XcalarApiDeleteDagNodeStatus {
            getNodeInfo(): XcalarApiDagNodeInfo;
            getStatus(): number;
            getNumRefs(): number;
            getRefsList(): DagRef[];
        }
        export class DeleteRequest {
            setNamePattern(value: string): void;
            setSrcType(value: number): void;
            setDeleteCompletely(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class DeleteResponse {
            getNumNodes(): number;
            getStatusesList(): XcalarApiDeleteDagNodeStatus[];
        }
        export class RenameRequest {
            setOldName(value: string): void;
            setNewName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class DagNodeInputMsg {
            setDagNodeName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
    }

    export namespace Dataflow {
        export class Parameter {
            setName(value: string): void;
            setValue(value: string): void;
        }
        export class ExecuteRequest {
            setDataflowName(value: string): void;
            setQueryName(value: string): void;
            setScope(value: proto.xcalar.compute.localtypes.Workbook.WorkbookScope): void;
            setUdfUserName(value: string): void;
            setUdfSessionName(value: string): void;
            setIsAsync(value: boolean): void;
            setSchedName(value: string): void;
            setParametersList(value: Array<proto.xcalar.compute.localtypes.Dataflow.Parameter>): void;
            setExportToActiveSession(value: boolean): void;
            setDestTable(value: string): void;
        }

        export class ExecuteResponse {
            getQueryName(): string;
        }
    }

    export namespace XDF {
        export class ListXdfsRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setFnnamePattern(value: string): void;
            setCategoryPattern(value: string): void;
        }

        export class ListXdfsResponse {
            getNumXdfs(): number;
            getFndescsList(): Array<ListXdfsResponse.XcalarEvalFnDesc>;
        }

        export namespace ListXdfsResponse {
            export class XcalarEvalArgDesc {
                getArgdesc(): string;
                getTypesAccepted(): number;
                getIsSingletonValue(): boolean;
                getArgType(): XcalarEnumType.XcalarEvalArgType;
                getMinArgs(): number;
                getMaxArgs(): number;
            }

            export class XcalarEvalFnDesc {
                getFnname(): string;
                getFndesc(): string;
                getCategory(): XcalarEnumType.FunctionCategory;
                getNumArgs(): number;
                getArgdescsList(): Array<XcalarEvalArgDesc>;
                getIsSingletonOutput(): boolean;
                getOutputType(): XcalarEnumType.DfFieldType;
            }
        }
    }

    export namespace UDF {
        export class UdfModule {
            setScope(scope: proto.xcalar.compute.localtypes.Workbook.WorkbookScope): void;
            setName(name: string): void;
            setType(type: UdfTypeT): void;
            setSourceCode(source: string): void;
        }
        export class UdfModuleSrc {
            getType(): string;
            getIsBuiltin(): boolean;
            getModuleName(): string;
            getModulePath(): string;
            getSourceSize(): number;
            getSource(): string;
        }
        export class FQname {
            getText(): string;
        }
        export class GetResolutionRequest {
            setUdfModule(value: UdfModule): void;
        }
        export class GetResolutionResponse {
            getFqModName(): FQname;
        }
        // XXX TO-DO Need backend to migrate from thrift to protobuf first
        // export class GetRequest {
        //     setUdfModule(value: UdfModule): void;
        // }
        // export class GetResponse {
        //     getUdfModuleSrc(): UdfModuleSrc;
        // }
        // export class AddUpdateRequest {
        //     setUdfModule(value: UdfModule): void;
        //     setType(value: string): void;
        //     setSource(value: string): void;
        // }
        // export class DeleteRequest {
        //     setUdfModule(value: UdfModule): void;
        // }
    }

    export namespace Target {
        export class TargetRequest {
            setInputJson(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class TargetResponse {
            getOutputJson(): string;
        }
    }

    export namespace Version {
        export class GetVersionResponse {
            getVersion(): string;
            getThriftVersionSignatureFull(): string;
            getThriftVersionSignatureShort(): number;
            getXcrpcVersionSignatureFull(): string;
            getXcrpcVersionSignatureShort(): number;
        }
    }

    export namespace SchemaLoad {
        export class AppRequest {
            setJson(value: string): void;
        }

        export class AppResponse {
            getJson(): string;
        }
    }

    export namespace Session {
        export class SessionArg {
            getSessionId(): number;
            getName(): string;
            getState(): string;
            getInfo(): string;
            getActiveNode(): number;
            getDescription(): string;
        }

        export class SessionGenericOutput {
            getOutputAdded(): boolean;
            getNodeId(): number;
            getIpAddr(): string;
            getErrorMessage(): string;
        }

        export class SessionNewInput {
            setSessionName(value: string): void;
            setFork(value: boolean): void;
            setForkedSessionName(value: string): void;
        }

        export class SessionInfoInput {
            setSessionId(value: number): void;
            setSessionName(value: string): void;
        }

        export class SessionNewOutput {
            getSessionGenericOutput(): SessionGenericOutput;
            getSessionId(): number;
            getError(): string;
        }

        export class SessionUploadPayload {
            setPathToAdditionalFiles(value: string): void;
            setSessionContent(value: string): void;
        }

        export class CreateRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setSessionNewInput(value: SessionNewInput): void;
        }

        export class CreateResponse {
            getSessionNewOutput(): SessionNewOutput;
        }

        export class ActivateRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setSessionInfoInput(value: SessionInfoInput): void;
        }

        export class ActivateResponse {
            getSessionGenericOutput(): SessionGenericOutput;
        }

        export class UploadRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setSessionNewInput(value: SessionNewInput): void;
            setSessionUploadPayload(value: SessionUploadPayload): void;
        }

        export class UploadResponse {
            getSessionNewOutput(): SessionNewOutput;
        }

        export class ListRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setPattern(value: string): void;
        }

        export class ListResponse {
            getSessionGenericOutput(): SessionGenericOutput;
            getNumSessions(): number;
            getSessionsList(): Array<SessionArg>;
        }

        export class DeleteRequest {
            // TODO
        }
    }

    export namespace Sql {
        export class SQLQueryRequest {
            setUsername(value: string): void;
            setUserid(value: number): void;
            setSessionname(value: string): void;
            setResulttablename(value: string): void;
            setQuerystring(value: string): void;
            setQueryname(value: string): void;
            setOptimizations(value: SQLQueryRequest.Optimizations): void;
        }

        export namespace SQLQueryRequest {
            export class Optimizations {
                setDropasyougo(value: boolean): void;
                setDropsrctables(value: boolean): void;
                setRandomcrossjoin(value: boolean): void;
                setPushtoselect(value: boolean): void;
            }
        }

        export class SQLQueryResponse {
            getTablename(): string;
        }
    }

    export namespace Connectors {
        export class DataSourceArgs {
            setTargetname(value: string): void;
            setPath(value: string): void;
            setFilenamepattern(value: string): void;
            setRecursive(value: boolean): void;
        }

        export class ListFilesRequest {
            setSourceargs(value: DataSourceArgs): void;
            setPaged(value: boolean): void;
            setContinuationtoken(value: string): void;
        }

        export class File {
            getName(): string;
            getIsdir(): boolean;
            getMtime(): number;
            getSize(): number;
        }

        export class ListFilesResponse {
            getFilesList(): Array<File>;
            getContinuationtoken(): string;
        }
    }
}

// === Data structure definitions: End ===

declare namespace proto.google.protobuf {
    export class Empty {}
}
