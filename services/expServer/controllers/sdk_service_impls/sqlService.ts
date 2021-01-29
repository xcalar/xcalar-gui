import * as xcalar from "xcalar";
import sqlManager from "../sqlManager";
// sql.proto / sql_pb.js
const sql_pb: any = proto.xcalar.compute.localtypes.Sql;

function executeSql(sqlQueryReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let optimizationMsg: any = sqlQueryReq.getOptimizations();
    let optimizations: SQLOptimizations = {
        dropAsYouGo: optimizationMsg.getDropasyougo(),
        dropSrcTables: optimizationMsg.getDropsrctables(),
        randomCrossJoin: optimizationMsg.getRandomcrossjoin(),
        pushToSelect: optimizationMsg.getPushtoselect()
    };
    let params: SQLQueryInput = {
        userName: sqlQueryReq.getUsername(),
        userId: sqlQueryReq.getUserid(),
        sessionName: sqlQueryReq.getSessionname(),
        resultTableName: sqlQueryReq.getResulttablename(),
        queryString: sqlQueryReq.getQuerystring(),
        tablePrefix: sqlQueryReq.getTableprefix(),
        queryName: sqlQueryReq.getQueryname(),
        optimizations: optimizations
    }
    sqlManager.executeSql(params)
    .then(function(executionOutput): void {
        let queryResp: any = new sql_pb.SQLQueryResponse();
        queryResp.setTablename(executionOutput.tableName);
        let orderedColumns: any =
            executionOutput.columns.map(function(col: any): any{
                let colMsg: any = new sql_pb.SQLQueryResponse.ColInfo();
                colMsg.setColname(col.colName);
                colMsg.setColid(col.colId);
                colMsg.setColtype(col.colType);
                colMsg.setRename(col.rename);
                return colMsg;
            });
        queryResp.setOrderedcolumnsList(orderedColumns);
        deferred.resolve(queryResp);
    })
    .fail(function(err){
        deferred.reject(err);
    });
    return deferred.promise();
}

export { executeSql as ExecuteSQL }
