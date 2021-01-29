const { parentPort, workerData } = require('worker_threads');
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js');
    var sqlUtil = require("../utils/sqlUtils.js").SqlUtil;
    // Worker's job starts from here
    const compilerObject = new SQLCompiler();
    parentPort.on("message", (data) => {
        const {
            sqlQueryObj,
            optimizations,
            selectQuery,
            allSelects,
            params,
            type
        } = data;
        let finalTable;
        compilerObject.compile(sqlQueryObj)
        .then(function() {
            let queryWithDrop;
            try {
                queryWithDrop = LogicalOptimizer.optimize(
                                    sqlQueryObj.xcQueryString, optimizations,
                                    JSON.stringify(selectQuery))
                                    .optimizedQueryString;
            } catch(e) {
                if (e.error && typeof e.error === "string") {
                    return PromiseHelper.reject(e.error);
                } else {
                    return PromiseHelper.reject(e);
                }
            }
            const prefixStruct = sqlUtil.addPrefix(
                JSON.parse(queryWithDrop),
                allSelects,
                newTableName,
                params.sessionPrefix,
                params.usePaging);
            sqlQueryObj.xcQueryString = prefixStruct.query;
            sqlQueryObj.newTableName = prefixStruct.tableName || newTableName;
            parentPort.postMessage({success: true, data: sqlQueryObj});
        })
        .fail(function(err) {
            parentPort.postMessage({success: false, error: err});
        });
    });
});