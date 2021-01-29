import { OperatorService as ApiOperator, XceClient as ApiClient } from 'xcalar';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';
import { parseError } from '../ServiceError';
import * as queryInput from './XcalarProtoQueryInput';
import { XcalarApiDfLoadArgs as BulkLoadArgs } from './XcalarProtoQueryInput';
import ProtoTypes = proto.xcalar.compute.localtypes;

class OperatorService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    public async opBulkLoad(param: {
        datasetName: string,
        loadArgs?: BulkLoadArgs,
        scope: SCOPE,
        scopeInfo: ScopeInfo
    }): Promise<{}> {
        try {
            const {
                datasetName, loadArgs,
                scope, scopeInfo
            } = param;

            const request = new ProtoTypes.Operator.BulkLoadRequest();
            request.setDest(datasetName);
            if (loadArgs != null) {
                const { sourceArgsList, parseArgs, size } = loadArgs;
                const loadArgMsg = new ProtoTypes.Operator.DfLoadArgs();
                if (sourceArgsList != null) {
                    const sourceArgsListMsg: Array<ProtoTypes.Operator.DataSourceArgs> =
                        sourceArgsList.map((arg) => {
                            const argMsg = new ProtoTypes.Operator.DataSourceArgs();
                            argMsg.setFileNamePattern(arg.fileNamePattern);
                            argMsg.setPath(arg.path);
                            argMsg.setRecursive(arg.recursive);
                            argMsg.setTargetName(arg.targetName);
                            return argMsg;
                        });
                    loadArgMsg.setSourceArgsListList(sourceArgsListMsg);
                }
                if (parseArgs != null) {
                    const parseArgsMsg = new ProtoTypes.Operator.ParseArgs();
                    parseArgsMsg.setAllowFileErrors(parseArgs.allowFileErrors);
                    parseArgsMsg.setAllowRecordErrors(parseArgs.allowRecordErrors);
                    parseArgsMsg.setFileNameFieldName(parseArgs.fileNameFieldName);
                    parseArgsMsg.setParserArgJson(parseArgs.parserArgJson);
                    parseArgsMsg.setParserFnName(parseArgs.parserFnName);
                    parseArgsMsg.setRecordNumFieldName(parseArgs.recordNumFieldName);
                    parseArgsMsg.setSchemaList(parseArgs.schema.map((colArgs) => {
                        const colMsg = new ProtoTypes.Operator.XcalarApiColumn();
                        colMsg.setSourceColumn(colArgs.sourceColumn);
                        colMsg.setDestColumn(colArgs.destColumn);
                        colMsg.setColumnType(colArgs.columnType); // XXX TODO: validate the number is in enum
                        return colMsg;
                    }));
                    loadArgMsg.setParseArgs(parseArgsMsg);
                }
                if (size != null) {
                    loadArgMsg.setSize(size);
                }
                request.setLoadArgs(loadArgMsg);
            }
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));

            const opService = new ApiOperator(this._apiClient);
            await opService.opBulkLoad(request);

            return {};
        } catch(e) {
            throw parseError(e, (resp: Object): BulkLoadErrorResponse => {
                if (resp != null && (resp instanceof ProtoTypes.Operator.BulkLoadResponse)) {
                    return {
                        errorString: resp.getErrorString() || '',
                        errorFile: resp.getErrorFile() || ''
                    };
                } else {
                    return null;
                }
            });
        }
    }

    /**
     * Export xcalar table to target
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async export(param: {
        tableName: string,
        driverName: string,
        driverParams: {},
        columns: queryInput.XcalarApiExportColumn[],
        exportName: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<{}> {
        try {
            // Deconstruct arguments
            const { tableName, driverName, driverParams, columns, exportName, scope, scopeInfo } = param;
            let columnInfo: ProtoTypes.Operator.XcalarApiExportColumn[] = columns.map(function(col) {
                let ret = new ProtoTypes.Operator.XcalarApiExportColumn;
                ret.setColumnName(col.columnName);
                ret.setHeaderName(col.headerName);
                return ret;
            });

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Operator.ExportRequest();
            request.setSource(tableName);
            request.setDest(exportName);
            request.setDriverName(driverName);
            request.setDriverParams(JSON.stringify(driverParams));
            request.setColumnsList(columnInfo);
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });
            request.setScope(apiScope);

            // Step #2: Call xcrpc service
            const operatorService = new ApiOperator(this._apiClient);
            await operatorService.opExport(request);

            // Step #3: Parse xcrpc service response
            return {}; // XXX TODO: return timeElapsed once backend is ready
        } catch (e) {
            throw parseError(e);
        }
    }
}

type BulkLoadErrorResponse = {
    errorString: string, errorFile: string
};
function isBulkLoadErrorResponse(errorResp: Object): errorResp is BulkLoadErrorResponse {
    return errorResp != null &&
        errorResp.hasOwnProperty('errorString') &&
        errorResp.hasOwnProperty('errorFile') &&
        (errorResp["errorString"] || errorResp["errorFile"]);
}

export { OperatorService, SCOPE, ScopeInfo, isBulkLoadErrorResponse };