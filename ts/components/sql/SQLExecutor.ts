class SQLExecutor {
    static execute(sqlQueryObj: SQLQuery, scopeInfo: Xcrpc.Query.ScopeInfo): XDPromise<any> {
        if (!sqlQueryObj.fromExpServer) {
            // Currently SQLExecutor is only used by expServer
            return PromiseHelper.reject(SQLErrTStr.NeedSQLMode);
        }
        if (sqlQueryObj.status === SQLStatus.Cancelled){
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        sqlQueryObj.setStatus(SQLStatus.Running);
        const deferred = PromiseHelper.deferred();

        const txId = !sqlQueryObj.fromExpServer && Transaction.start({
            "operation": "Execute SQL",
            "track": true
        });
        sqlQueryObj.runTxId = txId;
        const options = {
            checkTime: sqlQueryObj.checkTime || 200
        };
        XIApi.query(txId, sqlQueryObj.queryId, sqlQueryObj.xcQueryString, options, scopeInfo)
        .then(function() {
            // jdbc will resolve with cancel status here
            if (arguments && arguments[0] &&
                arguments[0].queryState === QueryStateT.qrCancelled) {
                return PromiseHelper.reject(SQLErrTStr.Cancel);
            }
            sqlQueryObj.setStatus(SQLStatus.Done);
        })
        .then(function() {
            deferred.resolve(sqlQueryObj);
        })
        .fail(function(error) {
            if ((error instanceof Object && error.error ===
                "Error: " + SQLErrTStr.Cancel) || error === SQLErrTStr.Cancel) {
                sqlQueryObj.setStatus(SQLStatus.Cancelled);
                deferred.reject(SQLErrTStr.Cancel);
            } else {
                sqlQueryObj.setStatus(SQLStatus.Failed);
                sqlQueryObj.errorMsg = JSON.stringify(error);
                deferred.reject(sqlQueryObj.errorMsg);
            }
        });
        return deferred.promise();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLExecutor = SQLExecutor;
}