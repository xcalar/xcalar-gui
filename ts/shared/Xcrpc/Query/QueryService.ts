import { QueryService as ApiQuery, XceClient as ApiClient, EnumMap } from 'xcalar';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';
import { parseError } from '../ServiceError';
import { perfAsync } from '../Common/Debug';
import ProtoTypes = proto.xcalar.compute.localtypes;

class QueryService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async list(param: {
        namePattern: string
    }): Promise<QueryInfo[]> {
        try {
            // Deconstruct arguments
            const { namePattern } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Query.ListRequest();
            request.setNamePattern(namePattern);

            // Step #2: Call xcrpc service
            const queryService = new ApiQuery(this._apiClient);
            const response = await queryService.list(request);

            // Step #3: Parse xcrpc service response
            return response.getQueriesList().map((queryInfo) => {
                return {
                    name: queryInfo.getName(),
                    millisecondsElapsed: queryInfo.getMillisecondsElapsed(),
                    state: EnumMap.QueryStateToStr[queryInfo.getState()]
                };
            });
        } catch (e) {
            throw parseError(e);
        }
    }

    @perfAsync('Query.execute')
    public async execute(param: {
        queryName: string,
        queryString: string,
        scheduledName?: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo,
        options?: {
            udfUserName?: string,
            udfSessionName?: string,
            isSameSession?: boolean,
            isBailOnError?: boolean,
            isAsync?: boolean
        }
    }): Promise<string> {
        try {
            const {
                queryName, queryString, scheduledName = '',
                scope, scopeInfo,
                options = {}
            } = param;
            const {
                udfUserName, udfSessionName,
                isSameSession = true, isBailOnError = true, isAsync = true
            } = options;

            const request = new ProtoTypes.Query.ExecuteRequest();
            request.setQueryName(queryName);
            request.setQueryStr(queryString);
            request.setSchedName(scheduledName);
            request.setUdfUserName(udfUserName);
            request.setUdfSessionName(udfSessionName);
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo}));
            request.setSameSession(isSameSession);
            request.setBailOnError(isBailOnError);
            request.setIsAsync(isAsync);

            const queryService = new ApiQuery(this._apiClient);
            const response = await queryService.execute(request);

            return response.getQueryName();
        } catch (e) {
            throw parseError(e);
        }
    }
}

type QueryInfo = {
    name: string,
    millisecondsElapsed: number,
    state: string
}

export { QueryService, QueryInfo, SCOPE, ScopeInfo };