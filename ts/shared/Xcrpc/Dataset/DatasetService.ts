import { DataSetService as ApiDataset, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import { SCOPE, ScopeInfo, createScopeMessage } from '../Common/Scope';
import { XcalarApiDfLoadArgs as LoadArgs, DataSourceArgs, ParseArgs, ColumnArgs } from '../Operator/XcalarProtoQueryInput';
import ProtoTypes = proto.xcalar.compute.localtypes;

class DatasetService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    async create(param: {
        datasetName: string,
        loadArgs?: LoadArgs,
        scope: SCOPE,
        scopeInfo: ScopeInfo
    }): Promise<{success: boolean}> {
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

            const dsService = new ApiDataset(this._apiClient);
            await dsService.create(request);

            return {success: true};
        } catch(e) {
            throw parseError(e);
        }
    }
}

export { DatasetService, SCOPE, ScopeInfo, LoadArgs, DataSourceArgs, ParseArgs, ColumnArgs }
