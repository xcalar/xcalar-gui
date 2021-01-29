import { Router } from "express"
export const router = Router()
import * as xcConsole from "../utils/expServerXcConsole";
import sqlManager from "../controllers/sqlManager"
import support from "../utils/expServerSupport"

// set default timeout to 4 hrs(caddy default timeout)
const defaultSQLTimeout: number = process.env.XCE_EXP_TIMEOUT &&
                        !isNaN(parseInt(process.env.XCE_EXP_TIMEOUT)) ?
                        parseInt(process.env.XCE_EXP_TIMEOUT) : 14400000;

router.post("/xcsql/query", function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        dropSrcTables: !req.body.keepOri,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    }
    let params: SQLQueryInput = {
        userName: req.body.userIdName,
        userId: req.body.userIdUnique,
        sessionName: req.body.wkbkName,
        resultTableName: req.body.newSqlTableName,
        queryString: req.body.queryString,
        tablePrefix: req.body.queryTablePrefix,
        queryName: req.body.queryTablePrefix,
        optimizations: optimizations
    }
    sqlManager.executeSql(params)
    .then(function(executionOutput) {
        xcConsole.log("Sent schema for resultant table");
        res.send(executionOutput);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

// XXX Some parameters need to be renamed
// apply similar code to /sql/query, or even simply merge them into one router
// Only difference is they take different parameters
router.post("/xcsql/queryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    let tablePrefix: string = req.body.sessionId;
    let usePaging: boolean = req.body.usePaging === "true";
    // jdbc only passes string to us
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    const type: string = "odbc";
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect,
        dedup: req.body.dedup,
        noOptimize: req.body.noOptimize
    };
    optimizations.dropAsYouGo =
        optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin =
        optimizations.randomCrossJoin == undefined ?
        false : optimizations.randomCrossJoin;
    optimizations.pushToSelect =
        optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    let params: SQLQueryInput = {
        userName: req.body.userName,
        sessionName: req.body.wkbkName,
        execid: req.body.execid,
        queryString: req.body.queryString,
        limit: req.body.limit,
        tablePrefix: tablePrefix,
        checkTime: checkTime,
        queryName: req.body.queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    sqlManager.executeSqlShared(params, type)
    .then(function(output): void {
        res.send(output);
    })
    .fail(function(error): void {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/getXCqueryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    let tablePrefix: string = req.body.sessionId;
    let usePaging: boolean = req.body.usePaging === "true";
    // jdbc only passes string to us
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    let type: string = "odbc";
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    };
    optimizations.dropAsYouGo =
        optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin =
        optimizations.randomCrossJoin == undefined ?
        false: optimizations.randomCrossJoin;
    optimizations.pushToSelect =
        optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    let params: SQLQueryInput = {
        userName: req.body.userName,
        sessionName: req.body.wkbkName,
        execid: req.body.execid,
        queryString: req.body.queryString,
        limit: req.body.limit,
        tablePrefix: tablePrefix,
        checkTime: checkTime,
        queryName: req.body.queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    sqlManager.getXCquery(params, type)
    .then(function(output: any): void {
        xcConsole.log("get xcalar query finishes");
        res.send(output);
    })
    .fail(function(error: any): void {
        xcConsole.log("get xcalar query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/result", [support.checkAuth], function(req, res) {
    let resultSetId: string = req.body.resultSetId;
    let rowPosition: number = parseInt(req.body.rowPosition);
    let rowsToFetch: number = parseInt(req.body.rowsToFetch);
    let totalRows: number = parseInt(req.body.totalRows);
    let schema: any = JSON.parse(req.body.schema);
    let renameMap: SQLColumn = JSON.parse(req.body.renameMap);
    let sessionInfo: SessionInfo = {
        userName: req.body.userName,
        userId: req.body.userId,
        sessionName: req.body.sessionName
    }

    sqlManager.result(resultSetId, rowPosition, rowsToFetch, totalRows,
                            schema, renameMap, sessionInfo)
    .then(function(result: any): void {
        let endRow: number = rowPosition + rowsToFetch;
        xcConsole.log("fetched data from " + rowPosition + " to " + endRow);
        res.send(result);
    })
    .fail(function(error): void {
        xcConsole.log("fetching data error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/getTable", [support.checkAuth], function (req, res) {
    let tableName: string = req.body.tableName;
    let rowPosition: number = parseInt(req.body.rowPosition); // 1 indexed
    let rowsToFetch: number = parseInt(req.body.rowsToFetch);
    let sessionInfo: SessionInfo = {
        userName: req.body.userName,
        userId: req.body.userId,
        sessionName: req.body.sessionName,
    }
    sqlManager.getTable(tableName, rowPosition, rowsToFetch, sessionInfo)
    .then(function(data: any): void {
        res.send(data);
    })
    .fail(function(error: any): void {
        xcConsole.log("getTable error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/clean", [support.checkAuth], function(req, res) {
    let tableName: string = req.body.tableName;
    let resultSetId: string = req.body.resultSetId;
    let sessionInfo: SessionInfo = {
        userName: req.body.userName,
        userId: req.body.userId,
        sessionName: req.body.sessionName,
    }
    sqlManager.clean(tableName, resultSetId, sessionInfo)
    .then(function(): void {
        xcConsole.log("cleaned table and free result set for: ", tableName);
        res.send({success: true});
    })
    .fail(function(error): void {
        xcConsole.log("failed to drop table: ", tableName, error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/list", [support.checkAuth], function(req, res) {
    let pattern: string = req.body.pattern;

    sqlManager.list(pattern)
    .then(function(ret: any) {
        xcConsole.log("List published tables schema");
        res.send(ret);
    })
    .fail(function(error) {
        xcConsole.log("get published tables error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/cancel", [support.checkAuth], function(req, res) {
    let queryName: string = req.body.queryName;
    let sessionInfo: SessionInfo = {
        userName: req.body.userName,
        userId: req.body.userId,
        sessionName: req.body.sessionName,
    }
    sqlManager.cancel(queryName, sessionInfo)
    .then(function(): void {
        xcConsole.log("query cancelled");
        res.send({log: "query cancel issued: " + queryName});
    })
    .fail(function(error: any): void {
        xcConsole.log("cancel query error: ", error);
        res.send(error);
    });
})