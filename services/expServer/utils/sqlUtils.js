var SqlUtil = {};
global.Xcrpc = Xcrpc = require('xcalarsdk');
global.Thrift = Thrift = require("../../../assets/js/thrift/thrift.js").Thrift;
global.hackFunction = require("./hackFunction.js").hackFunction

var enumsPath = "../../../assets/js/thrift/";
var normalizedPath = require("path").join(__dirname, enumsPath);
var sqlHelpers;
require("fs").readdirSync(normalizedPath).forEach(function(file) {
    if (file.indexOf("_types") > -1) {
        require("../../../assets/js/thrift/" + file);
    }
});

try {
    sqlHelpers = require("../sqlHelpers/sqlHelpers.js");
} catch(error) {
    require("../sqlHelpers/enums.js");
    require("../sqlHelpers/SQLEnum.js");
}
// XXX We should switch to webpack to take care of all these
global.xcHelper = xcHelper = sqlHelpers ? sqlHelpers.xcHelper :
                             require("../sqlHelpers/xcHelper.js").xcHelper;
global.xcStringHelper = xcStringHelper = sqlHelpers ? sqlHelpers.xcStringHelper :
                             require("../sqlHelpers/xcStringHelper.js").xcStringHelper;
global.xcTimeHelper = xcTimeHelper = sqlHelpers ? sqlHelpers.xcTimeHelper :
                             require("../sqlHelpers/xcTimeHelper.js").xcTimeHelper;
global.xcGlobal = xcGlobal = sqlHelpers ? sqlHelpers.xcGlobal :
                             require("../sqlHelpers/xcGlobal.js").xcGlobal;
global.xcConsole = xcConsole = require("./expServerXcConsole.js");
xcGlobal.setup();
require("../../../assets/js/thrift/XcalarApiService.js");
require("../../../assets/js/thrift/XcalarApiVersionSignature_types.js");
require("../../../assets/js/thrift/XcalarApiServiceAsync.js");
require("../../../assets/js/thrift/XcalarEvalEnums_types.js");
global.xcalarApi = xcalarApi = require("../../../assets/js/thrift/XcalarApi.js");

global.PromiseHelper = PromiseHelper = require("../../../assets/js/promiseHelper.js");
global.Transaction = Transaction = sqlHelpers ? sqlHelpers.Transaction :
                                   require("../sqlHelpers/transaction.js").Transaction;

require("../../../assets/js/XcalarThrift.js");
global.XIApi = XIApi = sqlHelpers ? sqlHelpers.XIApi :
                       require("../sqlHelpers/xiApi.js").XIApi;
// All SQL Files
global.TreeNode = TreeNode = sqlHelpers ? sqlHelpers.TreeNode :
                                  require("../sqlHelpers/treeNode.js").TreeNode;
global.TreeNodeFactory = TreeNodeFactory = sqlHelpers ? sqlHelpers.TreeNodeFactory :
                    require("../sqlHelpers/treeNodeFactory.js").TreeNodeFactory;
global.XcOpNode = XcOpNode = sqlHelpers ? sqlHelpers.XcOpNode :
                                  require("../sqlHelpers/xcOpNode.js").XcOpNode;
global.XcOpGraph = XcOpGraph = sqlHelpers ? sqlHelpers.XcOpGraph :
                    require("../sqlHelpers/xcOpGraph.js").XcOpGraph;
global.SQLAggregate = SQLAggregate = sqlHelpers ? sqlHelpers.SQLAggregate :
                          require("../sqlHelpers/SQLAggregate.js").SQLAggregate;
global.SQLExpand = SQLExpand = sqlHelpers ? sqlHelpers.SQLExpand :
                                require("../sqlHelpers/SQLExpand.js").SQLExpand;
global.SQLFilter = SQLFilter = sqlHelpers ? sqlHelpers.SQLFilter :
                                require("../sqlHelpers/SQLFilter.js").SQLFilter;
global.SQLGlobalLimit = SQLGlobalLimit = sqlHelpers ? sqlHelpers.SQLGlobalLimit :
                      require("../sqlHelpers/SQLGlobalLimit.js").SQLGlobalLimit;
global.SQLGroupBy = SQLGroupBy = sqlHelpers ? sqlHelpers.SQLGroupBy :
                              require("../sqlHelpers/SQLGroupBy.js").SQLGroupBy;
global.SQLIgnore = SQLIgnore = sqlHelpers ? sqlHelpers.SQLIgnore :
                                require("../sqlHelpers/SQLIgnore.js").SQLIgnore;
global.SQLJoin = SQLJoin = sqlHelpers ? sqlHelpers.SQLJoin :
                                    require("../sqlHelpers/SQLJoin.js").SQLJoin;
global.SQLLocalRelation = SQLLocalRelation = sqlHelpers ? sqlHelpers.SQLLocalRelation :
                  require("../sqlHelpers/SQLLocalRelation.js").SQLLocalRelation;
global.SQLProject = SQLProject = sqlHelpers ? sqlHelpers.SQLProject :
                              require("../sqlHelpers/SQLProject.js").SQLProject;
global.SQLSort = SQLSort = sqlHelpers ? sqlHelpers.SQLSort :
                            require("../sqlHelpers/SQLSort.js").SQLSort;
global.SQLUnion = SQLUnion = sqlHelpers ? sqlHelpers.SQLUnion :
                                  require("../sqlHelpers/SQLUnion.js").SQLUnion;
global.SQLWindow = SQLWindow = sqlHelpers ? sqlHelpers.SQLWindow :
                                require("../sqlHelpers/SQLWindow.js").SQLWindow;
global.SnowflakePredicate = SnowflakePredicate = sqlHelpers ? sqlHelpers.SnowflakePredicate :
                require("../sqlHelpers/SnowflakePredicate.js").SnowflakePredicate;

// optimizer rules
global.AddIndex = AddIndex = sqlHelpers ? sqlHelpers.AddIndex :
                                require("../sqlHelpers/addIndex.js").AddIndex;
global.DedupPlan = DedupPlan = sqlHelpers ? sqlHelpers.DedupPlan :
                                require("../sqlHelpers/dedupPlan.js").DedupPlan;
global.DropAsYouGo = DropAsYouGo = sqlHelpers ? sqlHelpers.DropAsYouGo :
                            require("../sqlHelpers/dropAsYouGo.js").DropAsYouGo;
global.ParquetPushDown = ParquetPushDown = sqlHelpers ? sqlHelpers.ParquetPushDown :
                    require("../sqlHelpers/parquetPushDown.js").ParquetPushDown;
global.SelectPushDown = SelectPushDown = sqlHelpers ? sqlHelpers.SelectPushDown :
                      require("../sqlHelpers/selectPushDown.js").SelectPushDown;
global.SynthesizePushDown = SynthesizePushDown = sqlHelpers ?
              sqlHelpers.SynthesizePushDown :
              require("../sqlHelpers/synthesizePushDown.js").SynthesizePushDown;
global.FilterPushUp = FilterPushUp = sqlHelpers ? sqlHelpers.FilterPushUp :
                          require("../sqlHelpers/filterPushUp.js").FilterPushUp;

global.SQLCompiler = SQLCompiler = sqlHelpers ? sqlHelpers.SQLCompiler :
                            require("../sqlHelpers/SQLCompiler.js").SQLCompiler;
global.SQLExecutor = SQLExecutor = sqlHelpers ? sqlHelpers.SQLExecutor :
                            require("../sqlHelpers/SQLExecutor.js").SQLExecutor;
global.LogicalOptimizer = LogicalOptimizer = sqlHelpers ? sqlHelpers.LogicalOptimizer :
                require("../sqlHelpers/logicalOptimizer.js").LogicalOptimizer;
global.SQLUtil = SQLUtil = sqlHelpers ? sqlHelpers.SQLUtil :
                            require("../sqlHelpers/SQLUtil.js").SQLUtil;
global.SQLDagExecutor = SQLDagExecutor = sqlHelpers ? sqlHelpers.SQLDagExecutor :
                            require("../sqlHelpers/SQLDagExecutor.js").SQLDagExecutor;
global.SQLQuery = SQLQuery = sqlHelpers ? sqlHelpers.SQLQuery :
                            require("../sqlHelpers/SQLQuery.js").SQLQuery;
global.SQLSimulator = SQLSimulator = sqlHelpers ? sqlHelpers.SQLSimulator :
                            require("../sqlHelpers/SQLSimulator.js").SQLSimulator;
require("../../../assets/lang/en/jsTStr.js");

hackFunction();

global.antlr4 = antlr4 = require('antlr4/index');
global.KVStore = KVStore = sqlHelpers ? sqlHelpers.KVStore :
                           require("../sqlHelpers/kvStore.js").KVStore;
global.SqlQueryHistory = SqlQueryHistory = sqlHelpers ? sqlHelpers.SqlQueryHistory :
                         require("../sqlHelpers/sqlQueryHistory.js").SqlQueryHistory;
global.httpStatus = httpStatus = require("../../../assets/js/httpStatus.js").httpStatus;

// Antlr4 SQL Parser
// global.SqlBaseListener = SqlBaseListener = require("../sqlParser/SqlBaseListener.js").SqlBaseListener;
// global.SqlBaseParser = SqlBaseParser = require("../sqlParser/SqlBaseParser.js").SqlBaseParser;
// global.SqlBaseLexer = SqlBaseLexer = require("../sqlParser/SqlBaseLexer.js").SqlBaseLexer;
// global.SqlBaseVisitor = SqlBaseVisitor = require("../sqlParser/SqlBaseVisitor.js").SqlBaseVisitor;
// global.TableVisitor = TableVisitor = require("../sqlParser/TableVisitor.js").TableVisitor;
global.XDParser = XDParser = {};
XDParser.XEvalParser = require("./xEvalParser/index.js").XEvalParser;

// Default session info for jdbc
var defaultUserName = 'xcalar-internal-sql';
var jdbcWkbkName = 'sql-workbook';

// Set session info every time we make a thrift call
// TODO might refactor this later
SqlUtil.setSessionInfo = function(userName, userId, sessionName) {
    const sessionInfo = {
        userName: userName || defaultUserName,
        sessionName: sessionName || jdbcWkbkName
    };
    sessionInfo.userId = userId || this.getUserIdUnique(sessionInfo.userName, jQuery.md5)
    xcalarApi.setUserIdAndName(sessionInfo.userName, sessionInfo.userId, jQuery.md5);
    setSessionName(sessionInfo.sessionName);
    return sessionInfo;
}
// Generate unique user id
SqlUtil.getUserIdUnique = function(name, hashFunc) {
    // XXX This should be removed when we don't need userIdUnique
    // after xcrpc migration is done
    const hash = hashFunc(name);
    const len = 5;
    const id = parseInt("0x" + hash.substring(0, len)) + 4000000;
    return id;
}
// Table prefix validation
// Replace every illegal character with _ and make sure it starts with a letter
SqlUtil.cleansePrefix = function(prefix) {
    prefix = prefix.replace(/[\W]/g, "_");
    if (prefix[0].match(/[\d_]/g)) {
        prefix = "fixPrefix_" + prefix;
    }
    return prefix;
}
SqlUtil.addPrefix = function(plan, selectTables, finalTable, prefix, usePaging, newSqlTable) {
    var retStruct = {};
    var newTableMap = {};
    for (var i = 0; i < plan.length; i++) {
        var operation = plan[i];
        if (operation.operation === "XcalarApiDeleteObjects") {
            const namePattern = operation.args.namePattern;
            if (namePattern && newTableMap[namePattern]) {
                operation.args.namePattern = newTableMap[namePattern];
            }
            continue;
        }
        var source = operation.args.source;
        var dest = operation.args.dest;
        if (typeof(source) === "string") {
            source = [source];
        }
        for (var j = 0; j < source.length; j++) {
            if (source[j] in selectTables) {
                continue;
            }
            if (!source[j].startsWith(prefix) && newTableMap[source[j]]) {
                if (source.length === 1) {
                    operation.args.source = newTableMap[source[j]];
                } else {
                    operation.args.source[j] = newTableMap[source[j]];
                }
            }
        }
        var newTableName = dest;
        if (!dest.startsWith(prefix) && operation.operation !== "XcalarApiAggregate") {
            newTableName = prefix + newTableName;
            if (newTableName.length > 255 / 2) {
                newTableName = newTableName.substring(0, newTableName.length - 255 / 2) +
                      Authentication.getHashId();
            }
        }
        if (dest === finalTable) {
            if (usePaging) {
                newTableName = "res_" + newTableName;
            } else if (newSqlTable) {
                newTableName = newSqlTable;
            }
            retStruct.tableName = newTableName;
        }
        newTableMap[dest] = newTableName;
        operation.args.dest = newTableName;
    }
    retStruct.query = JSON.stringify(plan);
    return retStruct;
}
SqlUtil.getRows = function(tableName, startRowNum, rowsToFetch, usePaging, sessionInfo) {
    if (tableName == null || startRowNum == null || rowsToFetch <= 0) {
        return PromiseHelper.reject("Invalid args in fetch data");
    }
    var deferred = PromiseHelper.deferred();
    var resultMeta = {};
    var {userName, userId, sessionName} = sessionInfo;

    const sessInfo = SqlUtil.setSessionInfo(userName, userId, sessionName);
    XcalarMakeResultSetFromTable(tableName, { userName: sessInfo.userName,
        workbookName: sessInfo.sessionName })
    .then(function(res) {
        resultMeta.resultSetId = res.resultSetId;
        resultMeta.totalRows = res.numEntries;
        if (usePaging) {
            return PromiseHelper.resolve(resultMeta);
        }

        if (resultMeta.totalRows == null || resultMeta.totalRows === 0) {
            return PromiseHelper.resolve([]);
        }

        // startRowNum starts with 1, rowPosition starts with 0
        var rowPosition = startRowNum - 1;
        if (rowsToFetch == null) {
            rowsToFetch = resultMeta.totalRows;
        }
        rowsToFetch = Math.min(rowsToFetch, resultMeta.totalRows);
        return SqlUtil.fetchData(resultMeta.resultSetId, rowPosition, rowsToFetch,
                         resultMeta.totalRows, sessionInfo);
    })
    .then(function(ret) {
        if (!usePaging && resultMeta.resultSetId != null) {
            const sessInfo = SqlUtil.setSessionInfo(userName, userId, sessionName);
            XcalarSetFree(resultMeta.resultSetId, { userName: sessInfo.userName,
                workbookName: sessInfo.sessionName })
            .then(deferred.resolve(ret))
            .fail(deferred.reject);
        } else {
            deferred.resolve(ret);
        }
    })
    .fail(function(ret) {
        const sessInfo = SqlUtil.setSessionInfo(userName, userId, sessionName);
        XcalarSetFree(resultMeta.resultSetId, { userName: sessInfo.userName,
            workbookName: sessInfo.sessionName })
        .always(deferred.reject(ret));
    });

    return deferred.promise();
};

SqlUtil.fetchData = function(resultSetId, rowPosition, rowsToFetch, totalRows, sessionInfo) {
    var deferred = PromiseHelper.deferred();
    var finalData = [];
    var {userName, userId, sessionName} = sessionInfo;
    const sessInfo = SqlUtil.setSessionInfo(userName, userId, sessionName);
    XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRows, [], 0, 0,
        { userName: sessInfo.userName, workbookName: sessInfo.sessionName })
    .then(function(result) {
        for (var i = 0, len = result.length; i < len; i++) {
            finalData.push(result[i]);
        }
        deferred.resolve(finalData);
    })
    .fail(deferred.reject);
    return deferred.promise();
}
SqlUtil.getResults = function(finalTable, orderedColumns, rowsToFetch, execid, usePaging, sessionInfo) {
    var deferred = jQuery.Deferred();
    var schema;
    var renameMap;
    SqlUtil.getSchema(finalTable, orderedColumns, sessionInfo)
    .then(function(res) {
        schema = res.schema;
        renameMap = res.renameMap;
        return SqlUtil.getRows(finalTable, 1, rowsToFetch, usePaging, sessionInfo);
    })
    .then(function(data) {
        var res = {
            execid: execid,
            schema: schema,
            tableName: finalTable
        };
        if (usePaging) {
            res.resultSetId = data.resultSetId;
            res.totalRows = data.totalRows;
            res.renameMap = renameMap;
        } else {
            var result = SqlUtil.parseRows(data, schema, renameMap);
            xcConsole.log("Final table schema: " + JSON.stringify(schema));
            res.result = result;
        }
        deferred.resolve(res);
    })
    .fail(deferred.reject);
    return deferred.promise();
}
SqlUtil.getSchema = function(tableName, orderedColumns, sessionInfo) {
    // If orderedColumns gets passed in, it's for running a SQL query
    var deferred = PromiseHelper.deferred();
    var promise;
    var {userName, userId, sessionName} = sessionInfo;
    SqlUtil.setSessionInfo(userName, userId, sessionName);
    XcalarGetTableMeta(tableName)
    .then(function(res) {
        try {
            var colMap = {};
            var headers = [];
            var orderedHeaders = [];
            var renameMap = {};
            var tableMeta = res;
            if (tableMeta == null || tableMeta.valueAttrs == null) {
                deferred.reject("Failed to get table meta for final result");
                return;
            }
            var valueAttrs = tableMeta.valueAttrs;
            for (var i = 0; i < valueAttrs.length; i++) {
                var colName = valueAttrs[i].name;
                var type = SqlUtil.getColType(valueAttrs[i].type);

                if (colName.startsWith("XC_ROW_COL_") ||
                    xcHelper.isInternalColumn(colName)) {
                    // this is auto-generated by xcalar
                    continue;
                }
                colMap[colName] = type;
                headers.push(colName);
            }
            var colNameSet = new Set();
            for (var i = 0; i < orderedColumns.length; i++) {
                var found = false;
                if (colNameSet.has(orderedColumns[i].colName)) {
                    var k = 1;
                    while (colNameSet.has(orderedColumns[i].colName + "_" + k)) {
                        k++;
                    }
                    if (!orderedColumns[i].rename) {
                        orderedColumns[i].rename = orderedColumns[i].colName
                    }
                    orderedColumns[i].colName = orderedColumns[i].colName + "_" + k;
                }
                colNameSet.add(orderedColumns[i].colName);
                var colName = orderedColumns[i].colName;
                if (orderedColumns[i].rename) {
                    renameMap[colName] = orderedColumns[i].rename;
                    colName = orderedColumns[i].rename;
                }
                if (colName.startsWith("XC_ROW_COL_") ||
                    xcHelper.isInternalColumn(colName)) {
                    // this is auto-generated by xcalar
                    continue;
                }
                var prefix = colName;
                if (colName.indexOf("::") > 0) {
                    prefix = colName.split("::")[0];
                    colName = colName.split("::")[1];
                }
                for (var j = 0; j < headers.length; j++) {
                    var name = headers[j];
                    if (name === colName || name === prefix) {
                        found = true;
                        orderedHeaders.push(orderedColumns[i].colName);
                        break;
                    }
                }
                if (!found) {
                    deferred.reject("Columns don't match after compilation");
                }
            }

            var schema = orderedHeaders.map(function(header) {
                var cell = {};
                cell[header] = renameMap[header] ? colMap[renameMap[header]] :
                                                   colMap[header];
                return cell;
            });
            deferred.resolve({schema: schema, renameMap: renameMap});
        } catch (e) {
            xcConsole.error("parse error", e);
            deferred.reject(e);
        }
    })
    .fail(deferred.reject);

    return deferred.promise();
}
SqlUtil.getColType = function(typeId) {
    // XXX TODO generalize it with setImmediateType()
    if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
        // error case
        console.error("Invalid typeId");
        return null;
    }
    return xcHelper.convertFieldTypeToColType(typeId);
}
SqlUtil.parseRows = function(data, schema, renameMap) {
    try {
        var typeMap = {};
        var headers = schema.map(function(cell) {
            typeMap[Object.keys(cell)[0]] = cell[Object.keys(cell)[0]];
            return Object.keys(cell)[0];
        });
        var rows = data.map(function(row) {
            row = JSON.parse(row);
            return headers.map(function(header) {
                var value = renameMap[header] ? row[renameMap[header]] : row[header];
                if (typeMap[header] !== "string" && (value === "inf" || value === "-inf")) {
                    value = null;
                }
                return value;
            });
        });
        return rows;
    } catch (e) {
        console.error(e);
        return null;
    }
}
exports.SqlUtil = SqlUtil;
