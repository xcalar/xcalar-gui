import { DataflowService as ApiDataflow, XceClient as ApiClient } from 'xcalar';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class DataflowService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Execute an optimized(retine) dataflow, which has already been imported into backend
     * @param params
     */
    public async executeOptimized(params: {
        dataflowName: string,
        parameters?: Map<string, string>,
        scope: SCOPE,
        scopeInfo: ScopeInfo
        options?: {
            scheduledName?: string,
            queryName?: string,
            udfUserName?: string,
            udfSessionName?: string,
            isAsync?: boolean,
            isExportToActiveSession?: boolean,
            destTableName?: string
        }
    }): Promise<string> {
        try {
            const { dataflowName, parameters = new Map<string, string>(), scope, scopeInfo, options = {}} = params;
            const {
                scheduledName = '',
                queryName,
                udfUserName, udfSessionName,
                isAsync = false,
                isExportToActiveSession = false,
                destTableName = ''
            } = options;

            const request = new ProtoTypes.Dataflow.ExecuteRequest();
            request.setDataflowName(dataflowName);
            const parameterList = new Array<ProtoTypes.Dataflow.Parameter>();
            parameters.forEach((value, key) => {
                const parameter = new ProtoTypes.Dataflow.Parameter();
                parameter.setName(key);
                parameter.setValue(value);
                parameterList.push(parameter);
            });
            request.setParametersList(parameterList);
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));
            request.setSchedName(scheduledName);
            if (queryName != null) {
                request.setQueryName(queryName);
            }
            if (udfUserName != null && udfSessionName != null) {
                request.setUdfUserName(udfUserName);
                request.setUdfSessionName(udfSessionName);
            }
            request.setIsAsync(isAsync);
            request.setExportToActiveSession(isExportToActiveSession);
            if (isExportToActiveSession) {
                // If isExportToActiveSession is true, it exports to the
                // current active session and creates a table
                // with destTableName
                request.setDestTable(destTableName);
            }

            const dataflowService = new ApiDataflow(this._apiClient);
            const response = await dataflowService.execute(request);

            return response.getQueryName();
        } catch(error) {
            throw parseError(error);
        }
    }
}

export { DataflowService, SCOPE, ScopeInfo }