class SQLUtil {

    /**
     * SQLUtil.sendToPlanner
     * @param sessionPrefix
     * @param type
     * @param struct
     */
    public static sendToPlanner(
        sessionPrefix: string,
        type: string,
        struct?: any
    ): XDPromise<any> {
        const session = WorkbookManager.getActiveWKBK();
        let url;
        let action;
        switch (type) {
            case ("update"):
                url = planServer + "/schemasupdate/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session));
                action = "PUT";
                break;
            case ("dropAll"):
                url = planServer + "/schemadrop/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session));
                action = "DELETE";
                break;
            case ("query"):
                url = planServer + "/sqlquery/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session)) +
                      "/true/true";
                action = "POST";
                break;
            case ("parse"):
                url = planServer + "/sqlparse";
                action = "POST";
                break;
            case("listSFTables"):
                url = planServer + "/snowflake/listtables";
                action = "POST";
                break;
            case("createSFTables"):
                url = planServer + "/snowflake/createtables/" +
                      encodeURIComponent(encodeURIComponent(sessionPrefix + session));
                action = "PUT";
                break;
            default:
                return PromiseHelper.reject("Invalid type for updatePlanServer");
        }
        const deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: action,
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            url: url,
            dataType: "text", // XXX remove this when the planner bug is fixed
                              // it wrongly returns error when no schema to drop
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                console.error(error);
                let errorMsg = SQLUtil._parseError(error);
                deferred.reject(errorMsg);
            }
        });
        return deferred.promise();
    }

    /**
     * SQLUtil.getSQLStruct
     * @param sql
     */
    public static getSQLStruct(sql: string): XDPromise<SQLParserStruct> {
        const deferred: XDDeferred<SQLParserStruct> = PromiseHelper.deferred();
        const struct = {
            sqlQuery: sql,
            ops: ["identifier", "sqlfunc", "parameters"],
            isMulti: true
        };
        SQLUtil.sendToPlanner("", "parse", struct)
        .then((ret) => {
            try {
                const sqlParseRet = JSON.parse(ret).ret;
                let sqlStructArray: SQLParserStruct[];
                if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                    if (sqlParseRet.errorMsg) {
                        return PromiseHelper.reject(sqlParseRet.errorMsg);
                    }
                    sqlStructArray = sqlParseRet.parseStructs;
                } else {
                    sqlStructArray = sqlParseRet;
                }
                if (sqlStructArray.length > 1) {
                    return PromiseHelper.reject(SQLErrTStr.MultiQueries);
                }
                let sqlStruct: SQLParserStruct = sqlStructArray[0];
                deferred.resolve(sqlStruct);
            } catch (e) {
                return PromiseHelper.reject(e);
            }
        })
        .fail((e) => {
            console.error(e);
            let error: string;
            if (e instanceof Error) {
                error = e.message;
            } else if (typeof e === "string") {
                error = e;
            } else {
                error = JSON.stringify(e);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public static throwError(errStr) {
        this.resetProgress();
        Alert.show({
            title: "Compilation Error",
            msg: "Error details: " + errStr,
            isAlert: true
        });
    };

    /**
     * SQLUtil.lockProgress
     */
    public static lockProgress(): void {
        $(".sqlOpPanel").find(".btn-submit").addClass("btn-disabled");
    }

    /**
     * SQLUtil.resetProgress
     */
    public static resetProgress(): void {
        $(".sqlOpPanel").find(".btn-submit").removeClass("btn-disabled");
    }

    private static _parseError(error: any): string {
        let errorMsg: string;
        if (error && error.responseText) {
            try {
                errorMsg = JSON.parse(error.responseText).exceptionMsg;
            } catch (e) {
                errorMsg = SQLErrTStr.PlannerFailure + ". Failed to parse error message: " + JSON.stringify(error);
            }
        } else if (error && error.status === 0) {
            errorMsg = SQLErrTStr.FailToConnectPlanner;
        } else if (error) {
            errorMsg = JSON.stringify(error);
        } else {
            errorMsg = SQLErrTStr.PlannerFailure;
        }
        return errorMsg;
    }

    public static assert(st: boolean, message: string): void {
        if (!st) {
            console.error("SQL ASSERTION FAILURE!");
            if (!message) {
                message = "Compilation Error";
            }
            throw "SQL Assertion Failure: " + message;
        }
    }
}

if (typeof exports !== "undefined") {
    exports.SQLUtil = SQLUtil;
}