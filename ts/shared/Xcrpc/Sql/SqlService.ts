import { SqlService as ApiSql, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class SqlService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    public async executeSql(param: {
        sqlQuery: string,
        queryName: string,
        tableName?: string,
        userName: string,
        userId: number,
        sessionName: string
    }): Promise<string> {
        try {
            // Deconstruct arguments
            const { sqlQuery, tableName, queryName, userName, userId, sessionName } = param;

            // Construct xcrpc service request
            const optimization = new ProtoTypes.Sql.SQLQueryRequest.Optimizations();
            optimization.setDropasyougo(true);
            optimization.setDropsrctables(false);
            optimization.setRandomcrossjoin(false);
            optimization.setPushtoselect(true);
            const request = new ProtoTypes.Sql.SQLQueryRequest();
            request.setUsername(userName);
            request.setUserid(userId);
            request.setSessionname(sessionName);
            if (tableName != null) {
                request.setResulttablename(tableName);
            }
            request.setQuerystring(sqlQuery);
            request.setQueryname(queryName);
            request.setOptimizations(optimization);

            // Call xcrpc service
            const sqlService = new ApiSql(this._apiClient);
            const response = await sqlService.executeSQL(request);

            // Parse xcrpc response
            return response.getTablename();
        } catch(e) {
            // XXX TODO: The error of SQL service is quite different from others
            // e.g. Error('500 - {"error": {"errorType": "org.antlr.v4.runtime...", "errorMsg": "line 1:0 ..."}}')
            // Need to either 1) Parse the error string here; or 2) Modify the service code to re-format the error
            throw parseError(e);
        }
    }
}

export { SqlService }