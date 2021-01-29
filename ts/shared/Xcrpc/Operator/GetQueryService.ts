// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
// import ApiQuery = xce.QueryService;
// import ApiClient = xce.XceClient;
// import ProtoTypes =  proto.xcalar.compute.localtypes;
// import ServiceError = Xcrpc.ServiceError;

import ProtoTypes = proto.xcalar.compute.localtypes;
import * as queryInput from './XcalarProtoQueryInput';
import { EnumMap } from 'xcalar';

interface I2DArrayObj {
    columns: Array<{
        cols: Array<any>
    } | any>
}

class GetQueryService {
    constructor() {}

    /**
     * Get a JSON query string from aggregate request arguments
     * @param tableName
     * @param dstAggName
     * @param evalString
     */
    public getAggregate(
        tableName: string,
        dstAggName: string,
        evalString: string
    ): string {
        const aggRequest: ProtoTypes.Operator.AggRequest
                = new ProtoTypes.Operator.AggRequest();
        aggRequest.setSource(tableName);
        aggRequest.setDest(dstAggName);
        const aggEval: ProtoTypes.Operator.XcalarApiEval
                = new ProtoTypes.Operator.XcalarApiEval();
        aggEval.setEvalString(evalString);
        aggRequest.setEvalList([aggEval]);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_AGGREGATE, aggRequest);
    }

    /**
     * Get a JSON query string from index request arguments
     * @param tableName
     * @param newTableName
     * @param keys
     * @param prefix
     * @param dhtName
     * @param delaySort
     * @param broadcast
     */
    public getIndex(
        tableName: string,
        newTableName: string,
        keys: Array<queryInput.KeyArgs>,
        prefix: string,
        dhtName: string,
        delaySort: boolean,
        broadcast: boolean
    ): string {
        const indexRequest: ProtoTypes.Operator.IndexRequest
                = new ProtoTypes.Operator.IndexRequest();
        indexRequest.setSource(tableName);
        indexRequest.setDest(newTableName);
        for (let key of keys) {
            const indexKey: ProtoTypes.Operator.XcalarApiKey
                = new ProtoTypes.Operator.XcalarApiKey();
            indexKey.setName(key.name);
            indexKey.setType(key.type);
            indexKey.setKeyFieldName(key.keyFieldName);
            indexKey.setOrdering(key.ordering);
            indexRequest.addKey(indexKey);
        }
        indexRequest.setPrefix(prefix);
        indexRequest.setDhtName(dhtName);
        indexRequest.setDelaySort(delaySort);
        indexRequest.setBroadcast(broadcast);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_INDEX, indexRequest);
    }

    /**
     * Get a JSON query string from project request arguments
     * @param tableName
     * @param newTableName
     * @param columns
     */
    public getProject(
        tableName: string,
        newTableName: string,
        columns: Array<string>
    ): string {
        const projectRequest: ProtoTypes.Operator.ProjectRequest
                = new ProtoTypes.Operator.ProjectRequest();
        projectRequest.setSource(tableName);
        projectRequest.setDest(newTableName);
        projectRequest.setColumnsList(columns);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_PROJECT, projectRequest);
    }

    /**
     * Get a JSON query string from getRowNum request arguments
     * @param tableName
     * @param newTableName
     * @param newColName
     */
    public getGetRowNum(
        tableName: string,
        newTableName: string,
        newColName: string
    ): string {
        const getRowNumRequest: ProtoTypes.Operator.GetRowNumRequest
                = new ProtoTypes.Operator.GetRowNumRequest();
        getRowNumRequest.setSource(tableName);
        getRowNumRequest.setDest(newTableName);
        getRowNumRequest.setNewField(newColName);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_GET_ROW_NUM, getRowNumRequest);
    }

    /**
     * Get a JSON query string from filter request arguments
     * @param tableName
     * @param newTableName
     * @param evalString
     */
    public getFilter(
        tableName: string,
        newTableName: string,
        evalString: string
    ): string {
        const filterRequest: ProtoTypes.Operator.FilterRequest
                = new ProtoTypes.Operator.FilterRequest();
        filterRequest.setSource(tableName);
        filterRequest.setDest(newTableName);
        const filterEval: ProtoTypes.Operator.XcalarApiEval
                = new ProtoTypes.Operator.XcalarApiEval();
        filterEval.setEvalString(evalString);
        filterRequest.setEvalList([filterEval]);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_FILTER, filterRequest);
    }

    /**
     * Get a JSON query string from join request arguments
     * @param tableNames
     * @param newTableName
     * @param joinType
     * @param columnInfos
     * @param evalString
     * @param keepAllColumns
     */
    public getJoin(
        tableNames: Array<string>,
        newTableName: string,
        joinType: number,
        columnInfos: Array<Array<queryInput.ColumnArgs>>,
        evalString: string,
        keepAllColumns: boolean
    ): string {
        const joinRequest: ProtoTypes.Operator.JoinRequest
                = new ProtoTypes.Operator.JoinRequest();
        joinRequest.setSourceList(tableNames);
        joinRequest.setDest(newTableName);
        joinRequest.setJoinType(joinType);
        for (const columnInfo of columnInfos) {
            const columns: ProtoTypes.Operator.Columns
                    = new ProtoTypes.Operator.Columns();
            for (const col of columnInfo) {
                const colObj: ProtoTypes.Operator.XcalarApiColumn
                    = new ProtoTypes.Operator.XcalarApiColumn();
                colObj.setSourceColumn(col.sourceColumn);
                colObj.setDestColumn(col.destColumn);
                colObj.setColumnType(col.columnType);
                columns.addCols(colObj);
            }
            joinRequest.addColumns(columns);
        }
        joinRequest.setEvalString(evalString)
        joinRequest.setKeepAllColumns(keepAllColumns);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_JOIN, joinRequest);
    }

    /**
     * Get a JSON query string from map request arguments
     * @param tableName
     * @param newTableName
     * @param evals
     * @param icv
     */
    public getMap(
        tableName: string,
        newTableName: string,
        evals: Array<queryInput.EvalArgs>,
        icv: boolean
    ): string {
        const mapRequest: ProtoTypes.Operator.MapRequest
                = new ProtoTypes.Operator.MapRequest();
        mapRequest.setSource(tableName);
        mapRequest.setDest(newTableName);
        for (const evalStruct of evals) {
            const curEval: ProtoTypes.Operator.XcalarApiEval
                = new ProtoTypes.Operator.XcalarApiEval();
            curEval.setEvalString(evalStruct.evalString);
            curEval.setNewField(evalStruct.newField);
            mapRequest.addEvals(curEval);
        }
        mapRequest.setIcv(icv);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_MAP, mapRequest);
    }

    /**
     * Get a JSON query string from groupBy request arguments
     * @param tableName
     * @param newTableName
     * @param evals
     * @param newKeyFieldName
     * @param includeSample
     * @param icv
     * @param groupAll
     */
    public getGroupBy(
        tableName: string,
        newTableName: string,
        evals: Array<queryInput.EvalArgs>,
        newKeyFieldName: string,
        includeSample: boolean,
        icv: boolean,
        groupAll: boolean
    ): string {
        const groupByRequest: ProtoTypes.Operator.GroupByRequest
                = new ProtoTypes.Operator.GroupByRequest();
        groupByRequest.setSource(tableName);
        groupByRequest.setDest(newTableName);
        for (const evalStruct of evals) {
            const curEval: ProtoTypes.Operator.XcalarApiEval
                = new ProtoTypes.Operator.XcalarApiEval();
            curEval.setEvalString(evalStruct.evalString);
            curEval.setNewField(evalStruct.newField);
            groupByRequest.addEvals(curEval);
        }
        groupByRequest.setNewKeyField(newKeyFieldName);
        groupByRequest.setIncludeSample(includeSample);
        groupByRequest.setIcv(icv);
        groupByRequest.setGroupAll(groupAll);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_GROUP_BY, groupByRequest);
    }

    /**
     * Get a JSON query string from union request arguments
     * @param tableNames
     * @param newTableName
     * @param unionType
     * @param columnInfos
     * @param dedup
     */
    public getUnion(
        tableNames: Array<string>,
        newTableName: string,
        unionType: number,
        columnInfos: Array<Array<queryInput.ColumnArgs>>,
        dedup: boolean
    ): string {
        const unionRequest: ProtoTypes.Operator.UnionRequest
                = new ProtoTypes.Operator.UnionRequest();
        unionRequest.setSourceList(tableNames);
        unionRequest.setDest(newTableName);
        unionRequest.setUnionType(unionType);
        for (const columnInfo of columnInfos) {
            const columns: ProtoTypes.Operator.Columns
                = new ProtoTypes.Operator.Columns();
            for (const col of columnInfo) {
                const colObj: ProtoTypes.Operator.XcalarApiColumn
                    = new ProtoTypes.Operator.XcalarApiColumn();
                colObj.setSourceColumn(col.sourceColumn);
                colObj.setDestColumn(col.destColumn);
                colObj.setColumnType(col.columnType);
                columns.addCols(colObj);
            }
            unionRequest.addColumns(columns);
        }
        unionRequest.setDedup(dedup);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_UNION, unionRequest);
    }

    /**
     * Get a JSON query string from bulkLoad request arguments
     * @param destName
     * @param loadArgs
     * @param dagNodeId
     */
    public getBulkLoad(
        destName: string,
        loadArgs: queryInput.XcalarApiDfLoadArgs,
        dagNodeId: string
    ): string {
        const bulkLoadRequest: ProtoTypes.Operator.BulkLoadRequest
                = new ProtoTypes.Operator.BulkLoadRequest();
        bulkLoadRequest.setDest(destName);
        const bulkLoadArgs: ProtoTypes.Operator.DfLoadArgs
                = new ProtoTypes.Operator.DfLoadArgs();
        for (const sourceArgs of loadArgs.sourceArgsList) {
            const sourceArgsMessage: ProtoTypes.Operator.DataSourceArgs
                = new ProtoTypes.Operator.DataSourceArgs();
            sourceArgsMessage.setTargetName(sourceArgs.targetName);
            sourceArgsMessage.setPath(sourceArgs.path);
            sourceArgsMessage.setFileNamePattern(sourceArgs.fileNamePattern);
            sourceArgsMessage.setRecursive(sourceArgs.recursive);
            bulkLoadArgs.addSourceArgsList(sourceArgsMessage);
        }
        const parseArgs: ProtoTypes.Operator.ParseArgs
                = new ProtoTypes.Operator.ParseArgs();
        parseArgs.setParserFnName(loadArgs.parseArgs.parserFnName);
        parseArgs.setParserArgJson(loadArgs.parseArgs.parserArgJson);
        parseArgs.setFileNameFieldName(loadArgs.parseArgs.fileNameFieldName);
        parseArgs.setRecordNumFieldName(loadArgs.parseArgs.recordNumFieldName);
        parseArgs.setAllowRecordErrors(loadArgs.parseArgs.allowRecordErrors);
        parseArgs.setAllowFileErrors(loadArgs.parseArgs.allowFileErrors);
        for (const col of loadArgs.parseArgs.schema) {
            const colObj: ProtoTypes.Operator.XcalarApiColumn
                = new ProtoTypes.Operator.XcalarApiColumn();
            colObj.setSourceColumn(col.sourceColumn);
            colObj.setDestColumn(col.destColumn);
            colObj.setColumnType(col.columnType);
            parseArgs.addSchema(colObj);
        }
        bulkLoadArgs.setParseArgs(parseArgs);
        bulkLoadArgs.setSize(loadArgs.size);
        bulkLoadRequest.setLoadArgs(bulkLoadArgs);
        bulkLoadRequest.setDagNodeId(dagNodeId);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_BULK_LOAD, bulkLoadRequest);
    }

    /**
     * Get a JSON query string from export request arguments
     * @param tableName
     * @param destName
     * @param columnInfo
     * @param driverName
     * @param driverParams
     */
    public getExport(
        tableName: string,
        destName: string,
        columnInfo: Array<queryInput.XcalarApiExportColumn>,
        driverName: string,
        driverParams: string
    ): string {
        const exportRequest: ProtoTypes.Operator.ExportRequest
                = new ProtoTypes.Operator.ExportRequest();
        exportRequest.setSource(tableName);
        exportRequest.setDest(destName);
        for (const column of columnInfo) {
            const expCol: ProtoTypes.Operator.XcalarApiExportColumn
                = new ProtoTypes.Operator.XcalarApiExportColumn();
            expCol.setColumnName(column.columnName);
            expCol.setHeaderName(column.headerName);
            exportRequest.addColumns(expCol);
        }
        exportRequest.setDriverName(driverName);
        exportRequest.setDriverParams(driverParams);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_EXPORT, exportRequest);
    }

    /**
     * Get a JSON query string from deleteObjects request arguments
     * @param namePattern
     * @param srcType
     * @param deleteCompletely
     */
    public getDeleteObjects(
        namePattern: string,
        srcType: number,
        deleteCompletely: boolean
    ): string {
        const deleteObjectsRequest: ProtoTypes.DagNode.DeleteRequest
                = new ProtoTypes.DagNode.DeleteRequest()
        deleteObjectsRequest.setNamePattern(namePattern);
        deleteObjectsRequest.setSrcType(srcType);
        deleteObjectsRequest.setDeleteCompletely(deleteCompletely);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_DELETE_OBJECTS, deleteObjectsRequest);
    }

    /**
     * Get a JSON query string from renameNode request arguments
     * @param oldName
     * @param newName
     */
    public getRenameNode(
        oldName: string,
        newName: string
    ): string {
        const renameNodeRequest: ProtoTypes.DagNode.RenameRequest
                = new ProtoTypes.DagNode.RenameRequest();
        renameNodeRequest.setOldName(oldName);
        renameNodeRequest.setNewName(newName);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_RENAME_NODE, renameNodeRequest);
    }

    /**
     * Get a JSON query string from synthesize request arguments
     * @param tableName
     * @param newTableName
     * @param columnInfo
     * @param sameSession
     */
    public getSynthesize(
        tableName: string,
        newTableName: string,
        columnInfo: Array<queryInput.ColumnArgs>,
        sameSession: boolean
    ): string {
        const synthesizeRequest: ProtoTypes.Operator.SynthesizeRequest
                = new ProtoTypes.Operator.SynthesizeRequest();
        synthesizeRequest.setSource(tableName);
        synthesizeRequest.setDest(newTableName);
        for (const col of columnInfo) {
            const colObj: ProtoTypes.Operator.XcalarApiColumn
                = new ProtoTypes.Operator.XcalarApiColumn();
            colObj.setSourceColumn(col.sourceColumn);
            colObj.setDestColumn(col.destColumn);
            colObj.setColumnType(col.columnType);
            synthesizeRequest.addColumns(colObj);
        }
        synthesizeRequest.setSameSession(sameSession);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_SYNTHESIZE, synthesizeRequest);
    }

    /**
     * Get a JSON query string from select request arguments
     * @param tableName
     * @param newTableName
     * @param minBatchId
     * @param maxBatchId
     * @param selectEval
     * @param columnInfo
     * @param limitRows
     */
    public getSelect(
        tableName: string,
        newTableName: string,
        minBatchId: number,
        maxBatchId: number,
        selectEval: SelectEvalArgs,
        columnInfo: Array<queryInput.ColumnArgs>,
        limitRows: number
    ): string {
        const selectRequest: ProtoTypes.PublishedTable.SelectRequest
                = new ProtoTypes.PublishedTable.SelectRequest();
        selectRequest.setSource(tableName);
        selectRequest.setDest(newTableName);
        selectRequest.setMinBatchId(minBatchId);
        selectRequest.setMaxBatchId(maxBatchId);
        const evalMessage: ProtoTypes.PublishedTable.SelectEvalArgs
                = new ProtoTypes.PublishedTable.SelectEvalArgs();
        evalMessage.setFilter(selectEval.Filter);
        evalMessage.setGroupByKeyList(selectEval.GroupByKeys);
        selectEval.Maps = selectEval.Maps || [];
        for (const mapArgs of selectEval.Maps) {
            const mapMessage: ProtoTypes.Operator.XcalarApiEval
                = new ProtoTypes.Operator.XcalarApiEval();
            mapMessage.setEvalString(mapArgs.evalString);
            mapMessage.setNewField(mapArgs.newField);
            evalMessage.addMap(mapMessage);
        }
        for (const gbArgs of selectEval.GroupBys) {
            const gbMessage: ProtoTypes.PublishedTable.SelectGroupByEvalArg
                = new ProtoTypes.PublishedTable.SelectGroupByEvalArg();
            gbMessage.setFunc(gbArgs.func);
            gbMessage.setArg(gbArgs.arg);
            gbMessage.setNewField(gbArgs.newField);
            evalMessage.addGroupBy(gbMessage);
        }
        selectRequest.setEval(evalMessage);
        for (const col of columnInfo) {
            const colObj: ProtoTypes.Operator.XcalarApiColumn
                = new ProtoTypes.Operator.XcalarApiColumn();
            colObj.setSourceColumn(col.sourceColumn);
            colObj.setDestColumn(col.destColumn);
            colObj.setColumnType(col.columnType);
            selectRequest.addColumns(colObj);
        }
        selectRequest.setLimitRows(limitRows);
        return this.getQueryFromRequest(ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_SELECT, selectRequest);
    }

    /**
     * Convert protobuf message to string
     * @param operatorType
     * @param req
     */
    private getQueryFromRequest(
        operatorType: number,
        req: any
    ): string {
        let reqObj: any = req.toObject();
        reqObj = this.removeList(reqObj);
        switch (operatorType) {
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_INDEX:
                for (const key of reqObj.key) {
                    key.type = EnumMap.DfFieldTypeToStr[key.type];
                    key.ordering = EnumMap.XcalarOrderingToStr[key.ordering];
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_JOIN:
                this.handle2DArray(reqObj);
                reqObj.joinType = EnumMap.JoinOperatorToStr[reqObj.joinType];
                for (const colList of reqObj.columns) {
                    for (const col of colList) {
                        col.columnType = EnumMap.DfFieldTypeToStr[col.columnType];
                    }
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_UNION:
                this.handle2DArray(reqObj);
                reqObj.unionType = EnumMap.UnionOperatorToStr[reqObj.unionType];
                for (const colList of reqObj.columns) {
                    for (const col of colList) {
                        col.columnType = EnumMap.DfFieldTypeToStr[col.columnType];
                    }
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_BULK_LOAD:
                for (const col of reqObj.loadArgs.parseArgs.schema) {
                    col.columnType = EnumMap.DfFieldTypeToStr[col.columnType];
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_DELETE_OBJECTS:
                reqObj.srcType = EnumMap.SourceTypeToStr[reqObj.srcType];
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_SYNTHESIZE:
                for (const col of reqObj.columns) {
                    col.columnType = EnumMap.DfFieldTypeToStr[col.columnType];
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_SELECT:
                for (const col of reqObj.columns) {
                    col.columnType = EnumMap.DfFieldTypeToStr[col.columnType];
                }
                if (reqObj.eval) {
                    reqObj.eval.Maps = reqObj.eval.map;
                    delete reqObj.eval.map;
                    reqObj.eval.Filter = reqObj.eval.filter;
                    delete reqObj.eval.filter;
                    reqObj.eval.GroupByKeys = reqObj.eval.groupByKey;
                    delete reqObj.eval.groupByKey;
                    reqObj.eval.GroupBys = reqObj.eval.groupBy;
                    delete reqObj.eval.groupBy;
                }
                break;
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_AGGREGATE:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_PROJECT:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_GET_ROW_NUM:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_FILTER:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_MAP:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_GROUP_BY:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_EXPORT:
            case ProtoTypes.XcalarEnumType.XcalarApis.XCALAR_API_RENAME_NODE:
                break;
            default:
                throw "Invalid operator type: " + operatorType;
        }
        delete reqObj.scope;
        const queryObj: any = {operation: EnumMap.XcalarApisToStr[operatorType],
                               args: reqObj};
        return JSON.stringify(queryObj);
    }

    /**
     * Reconstruct nested object to 2D array for join/union
     * @param obj
     * @description
     * Protobuf doesn't support 2D array so we use nested message instead
     * This function modifies input object and returns nothing
     * {columns: Array<{cols: any}>} => {columns: Array<Array<any>>}
     */
    private handle2DArray(
        obj: I2DArrayObj
    ): void {
        if (obj.columns && obj.columns.length > 0) {
            for (const i in obj.columns) {
                if (obj.columns[i] != null) {
                    obj.columns[i] = obj.columns[i].cols;
                }
            }
        }
    }

    /**
     * Remove substring "List" from attributes
     * @param obj
     * @description
     * In proto toObject result, lists would have "List" appended
     * This function modifies input object and returns it
     * {columnsList: Array<any>} => {columns: Array<any>}
     */
    private removeList(
        obj: Object
    ): Object {
        for (const attr in obj) {
            if (Array.isArray(obj[attr])) {
                obj[attr.substring(0, attr.length - 4)] = this.removeList(obj[attr]);
                delete obj[attr];
            } else if (typeof obj[attr] === "object") {
                obj[attr] = this.removeList(obj[attr]);
            }
        }
        return obj;
    }
}

export { GetQueryService };