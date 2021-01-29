// This file is for stubs for sqlUtils and dagUtils functionality

function hackFunction() {
    var request = require('request');

    // Some browsers and node.js don't support Object.values
    if (!Object.values) Object.values = o=>Object.keys(o).map(k=>o[k]);

    var CurrentUser = {
        commitCheck: function() {
            return PromiseHelper.resolve();
        }
    };

    global.userIdName = undefined;
    global.sessionName = undefined;

    global.planServer = 'http://localhost:27000/xcesql';

    global.XcUser = {
        CurrentUser: CurrentUser
    };

    global.TblManager = {
        setOrphanTableMeta: function() {}
    };

    global.Alert = {
        setup: function() {},
        show: function() {},
        error: function() {},
        forceClose: function() {},
        isOpen: function() { return true }
    };

    global.SQLHistorySpace = {
        Instance: {
            update: function() {}
        }
    };

    global.ColManager = {
        newCol: function(options) {
            return new ProgCol(options);
        },

        newPullCol: function(colName, backColName, type) {
            if (backColName == null) {
                backColName = colName;
            }
            return new ProgCol ( {
                "backName": backColName,
                "name": colName,
                "type": type || null,
                "width": 100,
                "isNewCol": false,
                "userStr": '"' + colName + '" = pull(' + backColName + ')',
                "func": {
                    "name": "pull",
                    "args": [backColName]
                },
                "sizedTo": "header"
            } )
        },

        newDATACol: function() {
            return {
                "backName": "DATA",
                "name": "DATA",
                "type": "object",
                "width": "auto",// to be determined when building table
                "userStr": "DATA = raw()",
                "func": {
                    "name": "raw",
                    "args": []
                },
                "isNewCol": false
            };
        }
    };

    global.authCount = 0;

    global.Authentication = {
        getHashId: function() {
            // return xcHelper.randName("#", 8);
            idCount = "#" + new Date().getTime() + "_" + authCount;
            authCount++;
            return idCount;
        }
    };

    global.MonitorGraph = {
        tableUsageChange: function() {}
    };

    global.Log = Log = {
        errorLog: function() { xcConsole.log(arguments); }
    };

    global.gKVScope = gKVScope = {
        "GLOB": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
        "USER": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
        "WKBK": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession,
    };

    global.Admin = Admin = {
        addNewUser: function(username) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var kvStore = new KVStore("gUserListKey", gKVScope.GLOB);

            kvStore.get()
            .then(function(value) {
                if (value == null) {
                    xcConsole.log("Adding user to admin panel: " + username);
                    return self.storeUsername(kvStore, username);
                } else {
                    var userList = self.parseStrIntoUserList(value);
                    // usernames are case sensitive
                    if (userList.indexOf(username) === -1) {
                        xcConsole.log("Adding user to admin panel: " + username);
                        return self.storeUsername(kvStore, username, true);
                    } else {
                        xcConsole.log("User exists in admin panel: " + username);
                        return PromiseHelper.resolve();
                    }
                }
            })
            .then(deferred.resolve)
            .fail(function(err) {
                xcConsole.log(err);
                deferred.reject(err);
            });

            return deferred.promise();
        },
        storeUsername: function (kvStore, username, append) {
            var deferred = PromiseHelper.deferred();
            var entry = JSON.stringify(username) + ",";
            if (append) {
                return kvStore.append(entry, true, true);
            } else {
                return kvStore.put(entry, true, true);
            }
        },
        parseStrIntoUserList: function (value) {
            var len = value.length;
            if (value.charAt(len - 1) === ",") {
                value = value.substring(0, len - 1);
            }
            var arrayStr = "[" + value + "]";
            var userList;
            try {
                userList = JSON.parse(arrayStr);
            } catch (err) {
                userList = [];
                xcConsole.log("Parsing user list failed! ", err);
            }
            userList.sort(xcHelper.sortVals);
            return userList;
        }
    };

    var sendToPlanner = function(sessionPrefix, type, struct) {
        // XXX TODO: Should share the same function with sqlRestApi.sendToPlanner
        // XXX TODO: Get rid of the singleton, so that we can use DagRuntime to pass in the real userName/wkbkName
        const session = 'sdkUser-anyWkbk';
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
            default:
                return PromiseHelper.reject("Invalid type for updatePlanServer");
        }
        const deferred = PromiseHelper.deferred();

        request(
            {
                method: action,
                url: url,
                json: false,
                body: JSON.stringify(struct),
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    deferred.resolve(body);
                } else {
                    if(body && body.exceptionName && body.exceptionMsg) {
                        error = {errorType: body.exceptionName, errorMsg: body.exceptionMsg};
                    }
                    deferred.reject(error);
                }
            }
        );
        return deferred.promise();
    };

    if (global.SQLUtil != null) {
        global.SQLUtil.sendToPlanner = sendToPlanner;
    } else {
        global.SQLUtil = {
            sendToPlanner: sendToPlanner
        }
    }

    class ProgCol {
        constructor(options) {
            options = options || {};
            this.name = options.name || "";
            this.backName = options.backName || this.name;
            this.prefix = xcHelper.parsePrefixColName(this.backName).prefix;
            this.type = options.type || null;
            this.width = 100;
            this.isNewCol = false;
            this.userStr = options.userStr;
            this.func = options.func;
            this.sizedTo = options.sizedTo
        }

        getFrontColName(includePrefix = false) {
            let name = this.name || "";
            if (includePrefix) {
                name = xcHelper.getPrefixColName(this.prefix, name);
            }
            return name;
        }

        getBackColName() {
            return this.backName
        }
        getType() {
            return this.type == null ? ColumnType.unknown : this.type;
        }
    };
    if (global.ProgCol == null) {
        global.ProgCol = ProgCol;
    }
}

exports.hackFunction = hackFunction;
