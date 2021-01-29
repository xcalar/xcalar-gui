(function($) {
    console.log("dynamic path loaded");
    // Insert patch code here. Remembmer that all js files will be minified and
    // uglified
    function lowerVersion(v1str, v2str) {
        var v1 = v1str.split(".");
        var v2 = v2str.split(".");
        if (1 * v1[0] !== 1 * v2[0]) {
            return (1 * v1[0] < 1 * v2[0]);
        }
        if (1 * v1[1] !== 1 * v2[1]) {
            return (1 * v1[1] < 1 * v2[1]);
        }
        if (1 * v1[2] !== 1 * v2[2]) {
            return (1 * v1[2] < 1 * v2[2]);
        }
    }

    function exactVersion(v1str, v2str) {
        return (v1str === v2str);
    }

    var version = XVM.getVersion();
    if (version && lowerVersion(version.split("-")[0], "1.3.0")) {
        // Make sure our patch only applies to certain versions
        // Change the second argument above as we need
        // Just wrap our patches with functions and call them here
        try {
            patchMixpanel();
        } catch (error) {
            console.log("mixpanel patching fails");
        }
    }
    if (version && (version.split("-")[0] === "1.3.1" || version.split("-")[0] === "1.3.0")) {
        try {
            patchSynthesizeNodeStructTag();
        } catch (error) {
            console.log("export node struct patch fails");
        }
    }
    if (version && lowerVersion(version.split("-")[0], "1.3.1")) {
        try {
            patchDSPreview();
        } catch (error) {
            console.log("ds preview fails");
        }
        if (version && exactVersion(version.split("-")[0], "1.3.0")) {
            try {
                patchJoin();
                patchThrift();
                console.log("Successfully patched 1.3.0 xcalarApi");
            } catch (error) {
                console.log("Patching 1.3.0 xcalarApi failed.");
            }
        }
    }
    if (version && version.split("-")[0] === "1.2.4") {
        try {
            patchExportNodeStruct();
        } catch (error) {
            console.log("export node struct patch fails");
        }
    }

    function patchThrift() {
        // will only make a backend call if unsorted source table is found but is inactive
        getUnsortedTableName = function(tableName, otherTableName, txId) {
            // XXX this may not right but have to this
            // or some intermediate table cannot be found
            if (txId != null && Transaction.isSimulate(txId)) {
                return PromiseHelper.resolve(tableName, otherTableName);
            }

            var getUnostedTableHelper = function(table) {
                var deferred = jQuery.Deferred();
                var originalTableName = table;
                var srcTableName = table;

                XcalarGetDag(table)
                .then(function(nodeArray) {
                    // Check if the last one is a sort. If it is, then use the unsorted
                    // one
                    // If it isn't then just return the original
                    if (XcalarApisTStr[nodeArray.node[0].api] === "XcalarApiIndex") {
                        var indexInput = nodeArray.node[0].input.indexInput;
                        var primeKey = indexInput.key[0];
                        // no matter it's sorted or multi sorted, first key must be sorted
                        if (primeKey.ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                            primeKey.ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                            // Find parent and return parent's name
                            var node = DagFunction.construct(nodeArray.node).tree;
                            srcTableName = node.getSourceNames()[0];
                            var hasReadyState = checkIfTableHasReadyState(node
                                                                          .parents[0]);

                            if (!hasReadyState) {
                                var newId = Authentication.getHashId().split("#")[1];
                                srcTableName = originalTableName.split("#")[0] + "#" + newId;
                                var keys = indexInput.key.map(function(keyAttr) {
                                    return {
                                        name: keyAttr.name,
                                        ordering: XcalarOrderingT.XcalarOrderingUnordered
                                    };
                                });
                                return XcalarIndexFromTable(originalTableName, keys,
                                                            srcTableName, null, true);
                            } else {
                                return PromiseHelper.resolve(null);
                            }
                            console.log("Using unsorted table instead:", srcTableName);
                        }
                    }
                    return PromiseHelper.resolve(null);
                })
                .then(function() {
                    deferred.resolve(srcTableName);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            if (!otherTableName) {
                return getUnostedTableHelper(tableName);
            } else {
                var def1 = getUnostedTableHelper(tableName);
                var def2 = getUnostedTableHelper(otherTableName);
                return PromiseHelper.when(def1, def2);
            }
        };
    }

    function patchJoin() {
        (function() {
            var XIApi = {};
            var aggOps = null;

            var root = this;

            XIApi.filter = function(txId, fltStr, tableName, newTableName) {
                if (txId == null || fltStr == null || tableName == null) {
                    return PromiseHelper.reject("Invalid args in filter");
                }

                var deferred = jQuery.Deferred();

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(tableName);
                }

                XcalarFilter(fltStr, tableName, newTableName, txId)
                .then(function() {
                    deferred.resolve(newTableName);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.genAggStr = function(fieldName, op) {
                var deferred = jQuery.Deferred();
                if (op && op.length) {
                    op = op.slice(0, 1).toLowerCase() + op.slice(1);
                }

                getAggOps()
                .then(function(aggs) {
                    var evalStr = "";
                    if (!aggs.hasOwnProperty(op)) {
                        deferred.resolve(evalStr);
                        return;
                    }

                    evalStr += op + "(" + fieldName + ")";
                    deferred.resolve(evalStr);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            function getAggOps() {
                if (aggOps != null) {
                    return PromiseHelper.resolve(aggOps);
                }

                var deferred = jQuery.Deferred();
                var index = FunctionCategoryT.FunctionCategoryAggregate;
                var category = FunctionCategoryTStr[index];
                XcalarListXdfs("*", category)
                .then(function(res) {
                    aggOps = parseAggOps(res);
                    deferred.resolve(aggOps);
                })
                .fail(function(error) {
                    console.error("get category error", error);
                    aggOps = getLocalAggOps();
                    // still resolve
                    deferred.resolve(aggOps);
                });

                return deferred.promise();
            }

            function parseAggOps(aggXdfs) {
                var res = {};
                try {
                    var funcs = aggXdfs.fnDescs;
                    funcs.forEach(function(func) {
                        res[func.fnName] = true;
                    });
                } catch (e) {
                    console.error("get category error", e);
                    res = getLocalAggOps();
                }
                return res;
            }

            function getLocalAggOps() {
                var res = {};
                for (var key in AggrOp) {
                    var op = AggrOp[key];
                    if (op && op.length) {
                        op = op.slice(0, 1).toLowerCase() + op.slice(1);
                    }
                    res[op] = true;
                }

                return res;
            }

            // dstAggName is optional and can be left blank (will autogenerate)
            // and new agg table will be deleted
            XIApi.aggregate = function(txId, aggOp, colName, tableName, dstAggName) {
                if (colName == null || tableName == null ||
                    aggOp == null || txId == null)
                {
                    return PromiseHelper.reject("Invalid args in aggregate");
                }

                var deferred = jQuery.Deferred();

                XIApi.genAggStr(colName, aggOp)
                .then(function(evalStr) {
                    return XIApi.aggregateWithEvalStr(txId, evalStr,
                                                     tableName, dstAggName);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);

                return deferred.promise();
            };

            // dstAggName is optional and can be left blank (will autogenerate)
            // and new agg table will be deleted
            XIApi.aggregateWithEvalStr = function(txId, evalStr, tableName, dstAggName) {
                if (evalStr == null || tableName == null || txId == null) {
                    return PromiseHelper.reject("Invalid args in aggregate");
                }

                var deferred = jQuery.Deferred();
                var toDelete = false;

                if (!isValidAggName(dstAggName)) {
                    if (dstAggName != null) {
                        console.error("invalid agg name");
                    }
                    var nameRoot = xcHelper.getTableName(tableName);
                    dstAggName = xcHelper.randName(nameRoot + "-agg");
                    toDelete = true;
                }

                XcalarAggregate(evalStr, dstAggName, tableName, txId)
                .then(function(val, dstDagName) {
                    deleteHelper(dstDagName)
                    .always(function() {
                        var passed = false;
                        var err;
                        try {
                            passed = true;
                        } catch (error) {
                            err = error;
                        }
                        if (passed) {
                            deferred.resolve(val.Value, dstAggName, toDelete);
                        } else {
                            deferred.reject({"error": err});
                        }
                    });
                })
                .fail(deferred.reject);

                return deferred.promise();

                function deleteHelper(tableToDelete) {
                    if (toDelete) {
                        return XIApi.deleteTable(txId, tableToDelete);
                    } else {
                        return PromiseHelper.resolve();
                    }
                }
            };

            XIApi.checkOrder = function(tableName, txId) {
                if (tableName == null) {
                    return PromiseHelper.reject("Invalid args in checkOrder");
                }

                var tableId = xcHelper.getTableId(tableName);
                var table = gTables[tableId];

                if (table != null) {
                    var keys = table.getKeys();
                    var order = table.getOrdering();
                    if (keys != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                        return PromiseHelper.resolve(order, keys);
                    }
                }

                if (txId != null && Transaction.isSimulate(txId)) {
                    return PromiseHelper.resolve(null, []);
                }

                var deferred = jQuery.Deferred();

                XcalarGetTableMeta(tableName)
                .then(function(tableMeta) {
                    var keys = xcHelper.getTableKeyInfoFromMeta(tableMeta);
                    deferred.resolve(tableMeta.ordering, keys);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.load = function(dsArgs, formatArgs, dsName, txId) {
                // dsArgs is as follows:
                // url, isRecur, maxSampleSize, skipRows, isRegex, pattern,
                // formatArgs is as follows:
                // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
                // fieldDelim, recordDelim, schemaMode, quoteChar
                // moduleName, funcName, udfQuery
                if (txId == null || !dsArgs || !formatArgs || !dsArgs.url ||
                    !formatArgs.format) {
                    return PromiseHelper.reject("Invalid args in load");
                }
                var url = dsArgs.url;
                var isRecur = dsArgs.isRecur || false;
                var format = formatArgs.format;
                var maxSampleSize = dsArgs.maxSampleSize || 0;
                var skipRows = dsArgs.skipRows || 0;
                var isRegex = dsArgs.isRegex || false;
                var pattern = xcHelper.getFileNamePattern(dsArgs.pattern, isRegex);

                var fieldDelim;
                var recordDelim;
                var schemaMode = CsvSchemaModeT.CsvSchemaModeNoneProvided;
                var quoteChar;
                var typedColumns = [];
                var schemaFile = ""; // Not implemented yet. Wait for backend
                if (format === "CSV") {
                    fieldDelim = formatArgs.fieldDelim || "";
                    recordDelim = formatArgs.recordDelim || "\n";
                    schemaMode = formatArgs.schemaMode || CsvSchemaModeT.CsvSchemaModeNoneProvided;
                    quoteChar = formatArgs.quoteChar || '"';
                    typedColumns = formatArgs.typedColumns || [];
                }

                var moduleName = formatArgs.moduleName || "";
                var funcName = formatArgs.funcName || "";
                var udfQuery = formatArgs.udfQuery;

                var options = {
                    "targetName": dsArgs.targetName,
                    "path": url,
                    "format": format,
                    "fieldDelim": fieldDelim,
                    "recordDelim": recordDelim,
                    "schemaMode": schemaMode,
                    "moduleName": moduleName,
                    "funcName": funcName,
                    "isRecur": isRecur,
                    "maxSampleSize": maxSampleSize,
                    "quoteChar": quoteChar,
                    "skipRows": skipRows,
                    "fileNamePattern": pattern,
                    "udfQuery": udfQuery,
                    "typedColumns": typedColumns,
                    "schemaFile": schemaFile
                };

                return XcalarLoad(dsName, options, txId);
            };

            XIApi.indexFromDataset = function(txId, dsName, newTableName, prefix) {
                var deferred = jQuery.Deferred();
                if (txId == null || dsName == null) {
                    return PromiseHelper.reject("Invalid args in indexFromDataset");
                }

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(newTableName);
                }

                if (!isValidPrefix(prefix)) {
                    prefix = getNewPrefix(prefix);
                }

                XcalarIndexFromDataset(dsName, "xcalarRecordNum", newTableName, prefix,
                                       txId)
                .then(function() {
                    deferred.resolve(newTableName, prefix);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            /*
                resolve: 1. indexTable: (string)
                         2. indexArgs: (object) see checckTableIndex
             */
            XIApi.index = function(txId, colToIndex, tableName) {
                if (txId == null || colToIndex == null || tableName == null) {
                    return PromiseHelper.reject("Invalid args in index");
                }
                var deferred = jQuery.Deferred();
                colToIndex = (colToIndex instanceof Array) ? colToIndex : [colToIndex];
                checkTableIndex(colToIndex, tableName, txId, true)
                .then(function(res) {
                    deferred.resolve(res.indexTable, res);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.sort = function(txId, sortColsAndOrder, tableName, newTableName)
            {
                if (txId == null || sortColsAndOrder == null || tableName == null ||
                    !(sortColsAndOrder instanceof Array)) {
                    return PromiseHelper.reject("Invalid args in multisort");
                }

                var deferred = jQuery.Deferred();
                var tableId = xcHelper.getTableId(tableName);
                for (var i = 0; i < sortColsAndOrder.length; i++) {
                    if (!sortColsAndOrder[i].type) {
                        var table = gTables[tableId];
                        if (table && table.tableCols[sortColsAndOrder[i].colNum]) {
                            var progCol = gTables[tableId].
                                      tableCols[sortColsAndOrder[i].colNum - 1];
                            sortColsAndOrder[i].name = progCol.backName;
                            sortColsAndOrder[i].type = progCol.type;
                            if (progCol.type === "number") {
                                sortColsAndOrder[i].type = "float";
                            }
                        }

                    }
                }

                // Check for case where table is already sorted
                XIApi.checkOrder(tableName, txId)
                .then(function(sortOrder, sortKeys) {
                    if (sortKeys.length === sortColsAndOrder.length) {
                        var diffFound = false;
                        for (var i = 0; i < sortKeys.length; i++) {
                            if (sortKeys[i].name !== sortColsAndOrder[i].name ||
                                sortKeys[i].ordering !==
                                XcalarOrderingTStr[sortColsAndOrder[0].ordering]) {
                                diffFound = true;
                                break;
                            }
                        }
                        if (!diffFound) {
                            return PromiseHelper.reject(null, true);
                        }
                    }
                    if (!isValidTableName(newTableName)) {
                        newTableName = getNewTableName(tableName);
                    }

                    return XcalarIndexFromTable(tableName, sortColsAndOrder, newTableName, txId);
                })
                .then(function(res) {
                    deferred.resolve(newTableName, res.newKeys);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.sortAscending = function(txId, colName, tableName, newTableName) {
                // a quick function to sort ascending
                var colInfo = [{
                    name: colName,
                    ordering: XcalarOrderingT.XcalarOrderingAscending
                }];
                return XIApi.sort(txId, colInfo, tableName, newTableName);
            };

            XIApi.sortDescending = function(txId, colName, tableName, newTableName) {
                // a quick function to sort descending
                var colInfo = [{
                    name: colName,
                    ordering: XcalarOrderingT.XcalarOrderingDescending
                }];
                return XIApi.sort(txId, colInfo, tableName, newTableName);
            };

            XIApi.map = function(txId, mapStrs, tableName, newColNames, newTableName,
                                 icvMode) {
                if (txId == null || mapStrs == null ||
                    tableName == null || newColNames == null)
                {
                    return PromiseHelper.reject("Invalid args in map");
                }

                var deferred = jQuery.Deferred();

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(tableName);
                }

                XcalarMap(newColNames, mapStrs, tableName, newTableName, txId, false,
                          icvMode)
                .then(function() {
                    deferred.resolve(newTableName);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            /*
                lTableInfo/rTableInfo: object with the following attrs:
                    columns: array of back colum names to join,
                    casts: array of cast types ["string", "boolean", null] etc
                    pulledColumns: columns to pulled out (front col name)
                    tableName: table's name
                    rename: array of rename object
                    otherImmediates: array of immediate names that are not being renamed
                                     and not part of the join. This is for collision
                                     resolution later because of index
                                     otherImmediates + columns(imm) == all immediates

                rename map: object generate by
                xcHelper.getJoinRenameMap(oldName, newName, type)
                if it's fat ptr, pass in DfFieldTypeT.DfFatptr, othewise, pass in null

                    sample:
                        var lTableInfo = {
                            "tableName": "test#ab123",
                            "columns": ["test::colA", "test::colB"],
                            "pulledColumns": ["test::colA", "test::colB"],
                            "rename": [{
                                "new": "test2",
                                "orig": "test",
                                "type": DfFieldTypeT.DfFatptr
                            }],
                            "otherImmediates": ["a", "b", "c"]
                        }

                options:
                    newTableName: string, final table's name, optional
                    clean: boolean, remove intermediate table if set true
                    evalString: cross join filter's eval string
            */
            XIApi.join = function(txId, joinType, lTableInfo, rTableInfo, options) {
                if (!(lTableInfo instanceof Object) ||
                    !(rTableInfo instanceof Object))
                {
                    return PromiseHelper.reject("Invalid args in join");
                }

                var lTableName = lTableInfo.tableName;
                var lColNames = lTableInfo.columns;
                var lCasts = lTableInfo.casts;
                var pulledLColNames = lTableInfo.pulledColumns;

                lTableInfo.rename = lTableInfo.rename || [];
                var lRename = lTableInfo.rename;
                // var lOthers = lTableInfo.otherImmediates;
                var lOthers = [];

                var rTableName = rTableInfo.tableName;
                var rColNames = rTableInfo.columns;
                var rCasts = rTableInfo.casts;
                var pulledRColNames = rTableInfo.pulledColumns;

                rTableInfo.rename = rTableInfo.rename || [];
                var rRename = rTableInfo.rename;
                // var rOthers = lTableInfo.otherImmediates;
                var rOthers = [];

                if (lColNames == null || lTableName == null ||
                    rColNames == null || rTableName == null ||
                    joinType == null || txId == null ||
                    !(joinType in JoinOperatorTStr || joinType in JoinCompoundOperator))
                {
                    return PromiseHelper.reject("Invalid args in join");
                }

                if (!(lColNames instanceof Array)) {
                    lColNames = [lColNames];
                    lTableInfo.columns = lColNames;
                }

                if (!(rColNames instanceof Array)) {
                    rColNames = [rColNames];
                    rTableInfo.columns = rColNames;
                }
                if (!lCasts) {
                    lCasts = new Array(lColNames.length).fill(null);
                    rCasts = new Array(lColNames.length).fill(null);
                }

                if (!(lCasts instanceof Array)) {
                    lCasts = [lCasts];
                }

                if (!(rCasts instanceof Array)) {
                    rCasts = [rCasts];
                }

                lTableInfo.casts = lCasts;
                rTableInfo.casts = rCasts;

                if ((joinType !== JoinOperatorT.CrossJoin && lColNames.length < 1) ||
                    lColNames.length !== rColNames.length) {
                    return PromiseHelper.reject("Invalid args in join");
                }

                var checkDupColNames = function(colNames) {
                    var nameMap = {};
                    var inValidColName = null;
                    colNames.forEach(function(colName) {
                        if (nameMap.hasOwnProperty(colName)) {
                            inValidColName = colName;
                            return false; // stop loop
                        } else {
                            nameMap[colName] = true;
                        }
                    });
                    return inValidColName;
                };
                var inValidlCol = checkDupColNames(lColNames);
                if (inValidlCol != null) {
                    return PromiseHelper.reject("Table " + lTableName +
                                                " has duplicate column " + inValidlCol);
                }

                var inValidrCol = checkDupColNames(rColNames);
                if (inValidrCol != null) {
                    return PromiseHelper.reject("Table " + rTableName +
                                                " has duplicate column " + inValidrCol);
                }

                options = options || {};

                var newTableName = options.newTableName;
                var clean = options.clean || false;
                var deferred = jQuery.Deferred();
                var tempTables = [];
                var joinedCols;

                // var lIndexColNames;
                var rIndexColNames;
                // Step 1: cast columns, and if it's a multi join,
                // auto cast the remaining columns to derived feidls
                var lCastInfo = {
                    tableName: lTableName,
                    columns: lColNames,
                    casts: lCasts
                };
                var rCastInfo = {
                    tableName: rTableName,
                    columns: rColNames,
                    casts: rCasts
                };
                getImmediatesNotInJoin(lTableInfo, rTableInfo, lOthers, rOthers)
                .then(function() {
                    return joinCast(txId, lCastInfo, rCastInfo);
                })
                .then(function(res) {
                    tempTables = tempTables.concat(res.tempTables);
                    // Step 2: index the left table and right table
                    // lIndexColNames = res.lColNames;
                    rIndexColNames = res.rColNames;
                    return joinIndexCheck(res, lTableInfo.removeNulls, txId);
                })
                .then(function(lRes, rRes, tempTablesInIndex) {
                    var lIndexedTable = lRes.tableName;
                    var rIndexedTable = rRes.tableName;
                    resolveJoinIndexColRename(lRename, rRename, lRes, rRes, lOthers,
                                              rOthers);
                    tempTables = tempTables.concat(tempTablesInIndex);

                    if (!isValidTableName(newTableName)) {
                        var leftPart = lTableName.split("#")[0];
                        var rightPart = rTableName.split("#")[0];
                        newTableName = getNewTableName(leftPart.substring(0, 5) +
                                                       "-" +
                                                       rightPart.substring(0, 5));
                    }

                    // Step 3: Check if semi join
                    if (joinType in JoinCompoundOperator) {
                        // This call will call Xcalar Join because it will swap the
                        // left and right tables
                        return semiJoinHelper(lIndexedTable, rIndexedTable,
                                              rIndexColNames,
                                              newTableName, joinType, lRename, rRename,
                                              tempTables,
                                              txId);
                    } else if (joinType === JoinOperatorT.CrossJoin) {
                        var joinOptions;
                        if (options && options.evalString) {
                            joinOptions = {evalString: options.evalString};
                        }
                        return XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
                                          joinType, lRename, rRename, joinOptions,
                                          txId);
                    } else {
                        // Step 3: join left table and right table
                        return XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
                                          joinType, lRename, rRename, undefined, txId);
                    }
                })
                .then(function() {
                    var lTableId = xcHelper.getTableId(lTableName);
                    var rTableId = xcHelper.getTableId(rTableName);
                    joinedCols = createJoinedColumns(lTableId, rTableId,
                                                    pulledLColNames,
                                                    pulledRColNames,
                                                    lRename,
                                                    rRename);
                    if (clean) {
                        return XIApi.deleteTableAndMetaInBulk(txId, tempTables, true);
                    }
                })
                .then(function() {
                    deferred.resolve(newTableName, joinedCols);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            /*
             * gbArgs: an array of objects with operator, aggColName, distinct, and newColName
             *         properties - for multi group by operations
             * options:
             *  isIncSample: true/false, include sample or not,
             *               not specified is equal to false
             *  sampleCols: array, sampleColumns to keep,
             *              only used when isIncSample is true
             *  icvMode: true/false, icv mode or not,
             *  newTableName: string, dst table name, optional
             *  clean: true/false, if set true, will remove intermediate tables
             */

            XIApi.groupBy = function(txId, gbArgs, groupByCols, tableName, options) {
                if (txId == null || gbArgs == null || groupByCols == null ||
                    tableName == null || gbArgs[0].newColName == null ||
                    gbArgs[0].aggColName.length < 1)
                {
                    return PromiseHelper.reject("Invalid args in groupby");
                }

                options = options || {};
                var isIncSample = options.isIncSample || false;
                var sampleCols = options.sampleCols || [];
                var icvMode = options.icvMode || false;
                var finalTableName = options.newTableName || null;
                var clean = options.clean || false;

                if (!(groupByCols instanceof Array)) {
                    groupByCols = [groupByCols];
                }

                // Split gbArgs into 2 arrays, one array with operators and
                // Another array that's just aliasing
                var opArray = [];
                var distinctColArray = [];

                for (var i = 0; i < gbArgs.length; i++) {
                    if (gbArgs[i].isDistinct) {
                        distinctColArray.push(gbArgs[i]);
                    } else {
                        opArray.push(gbArgs[i]);
                    }
                }

                var tempCols = [];
                // XXX This is one extra groupby that can be avoided. But for code
                // cleanliness, we're going to use this workaround for now. Eventually
                // If opArray.length === 0, we want to skip until after the first
                // XcalarGroupBy call
                if (opArray.length === 0) {
                    var tempColName = "XC_COUNT_" + xcHelper.getTableId(tableName);
                    opArray = [{operator: "count", aggColName: "1", newColName:
                                tempColName}];
                    tempCols.push(tempColName);
                }

                gbArgs = opArray;

                var deferred = jQuery.Deferred();

                var tempTables = [];
                var indexedTable;
                var finalTable;
                var isMultiGroupby = (groupByCols.length !== 1);
                var renamedGroupByCols = [];
                var finalCols;
                // tableName is the original table name that started xiApi.groupby
                getGroupbyIndexedTable(txId, tableName, groupByCols)
                .then(function(resTable, resCols, tempTablesInIndex) {
                    // table name may have changed after sort!
                    indexedTable = resTable;
                    var indexedColName = xcHelper.stripColName(resCols[0]);
                    tempTables = tempTables.concat(tempTablesInIndex);

                    // get name from src table
                    if (finalTableName == null) {
                        finalTableName = getNewTableName(tableName, "-GB");
                    }
                    var gbTableName = finalTableName;
                    // incSample does not take renames, multiGroupby already handle
                    // the name in index stage
                    var newKeyFieldName = (isIncSample || isMultiGroupby) ? null
                                          : xcHelper.parsePrefixColName(indexedColName)
                                                    .name;
                    var operators = [];
                    var newColNames = [];
                    var aggColNames = [];

                    gbArgs.forEach(function(gbArg) {
                        operators.push(gbArg.operator);
                        newColNames.push(gbArg.newColName);
                        aggColNames.push(gbArg.aggColName);
                    });

                    return XcalarGroupBy(operators, newColNames, aggColNames,
                                        indexedTable, gbTableName, isIncSample,
                                        icvMode, newKeyFieldName, false, txId);
                })
                .then(function() {
                    return getFinalGroupByCols(tableName, finalTableName, groupByCols,
                                                gbArgs, isIncSample, sampleCols,
                                                renamedGroupByCols);
                })
                .then(function(resCols) {
                    finalCols = resCols;
                    var resTable = finalTableName;
                    // XXX Check whether tempTables is well tracked
                    return distinctGroupby(tableName, groupByCols, distinctColArray,
                                           resTable, tempTables, tempCols, txId);
                })
                .then(function(resTable) {
                    finalTable = resTable;
                    if (clean) {
                        // remove intermediate table
                        return XIApi.deleteTableAndMetaInBulk(txId, tempTables, true);
                    }
                })
                .then(function() {
                    deferred.resolve(finalTable, finalCols, renamedGroupByCols,
                                     tempCols);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            /*
               tableInofs: array of table info, each table info object has
                   tableName: table's name
                   columns an array of column infos which contains:
                       name: column's name
                       rename: rename
                       type: column's type
                       cast: need a cast to the type or not

                sample:
                        var tableInfos = [{
                            tableName: "test#ab123",
                            columns: [{
                                name: "test2",
                                rename: "test",
                                type: "string"
                                cast: true
                            }]
                        }]
             */
            XIApi.union = function(txId, tableInfos, dedup, newTableName) {
                dedup = dedup || false;

                var deferred = jQuery.Deferred();
                var tempTables = [];

                if (txId == null || tableInfos == null ||
                    !(tableInfos instanceof Array) || tableInfos.length < 2) {
                    return PromiseHelper.reject("Invalid args in union");
                }

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(tableInfos[0].tableName);
                }

                var colLen = tableInfos[0].columns.length;
                for (var i = 0; i < colLen; i++) {
                    for (var j = 0; j < tableInfos.length; j++) {
                        if (tableInfos[j].columns[i].name == null) {
                            // this is for no match case
                            tableInfos[j].columns[i].name = xcHelper.randName("XCALAR_FNF");
                        }

                        if (j > 0) {
                            // type and rename need to match
                            if (tableInfos[j].columns[i].rename == null ||
                                tableInfos[j].columns[i].rename !==
                                tableInfos[0].columns[i].rename ||
                                tableInfos[j].columns[i].type == null ||
                                tableInfos[j].columns[i].type !==
                                tableInfos[0].columns[i].type) {
                                return PromiseHelper.reject("Invalid args in union");
                            }
                        }
                    }
                }

                unionCast(txId, tableInfos)
                .then(function(resTableInfos, resTempTables) {
                    tempTables = tempTables.concat(resTempTables);

                    if (dedup) {
                        return unionAllIndex(txId, resTableInfos);
                    } else {
                        return PromiseHelper.resolve(resTableInfos, []);
                    }
                })
                .then(function(resTableInfos, resTempTables) {
                    tempTables = tempTables.concat(resTempTables);

                    var tableNames = [];
                    var colInfos = [];
                    resTableInfos.forEach(function(tableInfo) {
                        tableNames.push(tableInfo.tableName);
                        colInfos.push(tableInfo.renames);
                    });
                    return XcalarUnion(tableNames, newTableName, colInfos, dedup, txId);
                })
                .then(function() {
                    var finalTableCols = tableInfos[0].columns.map(function(col) {
                        return ColManager.newPullCol(col.rename, null, col.type);
                    });
                    finalTableCols.push(ColManager.newDATACol());
                    deferred.resolve(newTableName, finalTableCols);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            function unionCast(txId, tableInfos) {
                var deferred = jQuery.Deferred();
                var castRes = [];
                var tempTables = [];
                var caseHelper = function(tableInfo, index) {
                    var innerDeferred = jQuery.Deferred();
                    var tableName = tableInfo.tableName;
                    var columns = tableInfo.columns;
                    var colNames = [];
                    var casts = [];

                    columns.forEach(function(colInfo) {
                        colNames.push(colInfo.name);
                        casts.push(colInfo.cast ? colInfo.type : null);
                    });

                    var options = {
                        castPrefix: true,
                        handleNull: true
                    };
                    castMap(txId, tableName, colNames, casts, options)
                    .then(function(res) {
                        if (res.newTable) {
                            tempTables.push(res.tableName);
                        }
                        var renames = res.colNames.map(function(colName, i) {
                            var newName = columns[i].rename;
                            var type = res.types[i] ? res.types[i] : columns[i].type;
                            var fieldType = xcHelper.convertColTypeToFeildType(type);
                            return xcHelper.getJoinRenameMap(colName, newName, fieldType);
                        });

                        castRes[index] = {
                            tableName: res.tableName,
                            renames: renames
                        };
                        innerDeferred.resolve();
                    })
                    .fail(innerDeferred.reject);

                    return innerDeferred.promise();
                };

                var promises = tableInfos.map(caseHelper);
                PromiseHelper.when.apply(this, promises)
                .then(function() {
                    deferred.resolve(castRes, tempTables);
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function unionAllIndex(txId, tableInfos) {
                var deferred = jQuery.Deferred();
                var tempTables = [];
                var promises = [];
                var indexColName = xcHelper.randName("XC_UNION_INDEX");
                for (var i = 0, len = tableInfos.length; i < len; i++) {
                    var tableInfo = tableInfos[i];
                    promises.push(unionAllIndexHelper(txId, tableInfo,
                                                      tempTables, indexColName));
                }


                PromiseHelper.when.apply(this, promises)
                .then(function() {
                    deferred.resolve(tableInfos, tempTables);
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function unionAllIndexHelper(txId, tableInfo, tempTables, indexColName) {
                // step 1: change all columns to type string(null will become FNF)
                // step 2: concat all columns
                // step 3: index on the concat column
                var deferred = jQuery.Deferred();
                var tableName = tableInfo.tableName;
                var curTableName = tableName;
                var colNames = [];
                var newColNames = [];
                var mapStrs = [];
                var suffix = xcHelper.randName("_xc_");
                var concatColName;

                var getConcatMapStr = function(args) {
                    var mapStr = "";
                    var len = args.length;
                    var val;
                    for (var i = 0; i < len - 1; i++) {
                        val = 'ifStr(exists(' + args[i] + '), ' +
                                    args[i] + ', "XC_FNF")';
                        mapStr += 'concat(string(' + val + '), concat(".Xc.", ';
                    }

                    val = 'ifStr(exists(' + args[len - 1] + '), ' +
                            args[len - 1] + ', "XC_FNF")';
                    mapStr += 'string(' + val + ')';
                    mapStr += "))".repeat(len - 1);
                    return mapStr;
                };

                tableInfo.renames.forEach(function(rename) {
                    var colName = rename.orig;
                    colNames.push(colName);
                    // this will change all null to FNF
                    mapStrs.push("string(" + colName + ")");
                    var newColName = xcHelper.parsePrefixColName(colName).name + suffix;
                    newColNames.push(newColName);
                });

                XIApi.map(txId, mapStrs, curTableName, newColNames)
                .then(function(tableAfterMap) {
                    var mapStr = getConcatMapStr(newColNames);
                    concatColName = xcHelper.randName("XC_CONCAT");
                    tempTables.push(curTableName);
                    curTableName = tableAfterMap;

                    return XIApi.map(txId, [mapStr], curTableName, [concatColName]);
                })
                .then(function(tableAfterMap) {
                    tempTables.push(curTableName);
                    curTableName = tableAfterMap;
                    return XIApi.index(txId, concatColName, curTableName);
                })
                .then(function(finalTableName) {
                    tempTables.push(curTableName);
                    tableInfo.tableName = finalTableName;
                    var type = xcHelper.convertColTypeToFeildType(ColumnType.string);
                    var rename = xcHelper.getJoinRenameMap(concatColName, indexColName, type);
                    tableInfo.renames.push(rename);
                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            /*
                columns: an array of column names (back column name)
                tableName: table's name
                newTableName(optional): new table's name
            */
            XIApi.project = function(txId, columns, tableName, newTableName) {
                if (txId == null || columns == null || tableName == null)
                {
                    return PromiseHelper.reject("Invalid args in project");
                }

                var deferred = jQuery.Deferred();

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(tableName);
                }

                XcalarProject(columns, tableName, newTableName, txId)
                .then(function() {
                    deferred.resolve(newTableName);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.query = function(txId, queryName, queryStr) {
                if (txId == null || queryName == null || queryStr == null) {
                    return PromiseHelper.reject("Invalid args in query");
                }
                return XcalarQueryWithCheck(queryName, queryStr, txId);
            };

            /*
             *   attribute in options:
             *      splitType
             *      headerType,
             *      format,
             *      createRule,
             *      handleName
             */
            XIApi.export = function(txId, tableName, exportName, targetName, numCols,
                                    backColumns, frontColumns, keepOrder, options) {
                if (txId == null || tableName == null || exportName == null) {
                    return PromiseHelper.reject("Invalid args in export");
                }
                return XcalarExport(tableName, exportName, targetName, numCols,
                                backColumns, frontColumns, keepOrder, options, txId);
            };

            XIApi.genRowNum = function(txId, tableName, newColName, newTableName) {
                if (txId == null || tableName == null || newColName == null) {
                    return PromiseHelper.reject("Invalid args in get row num");
                }

                var deferred = jQuery.Deferred();

                if (!isValidTableName(newTableName)) {
                    newTableName = getNewTableName(tableName);
                }

                XcalarGenRowNum(tableName, newTableName, newColName, txId)
                .then(function() {
                    deferred.resolve(newTableName);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.getNumRows = function(tableName, options) {
                if (tableName == null) {
                    return PromiseHelper.reject("Invalid args in getNumRows");
                }
                options = options || {};
                if (options.useConstant) {
                    // when use constant
                    var txId = options.txId;
                    var colName = options.colName;
                    var aggOp = AggrOp.Count;
                    var dstAggName = options.constantName;
                    if (dstAggName == null) {
                        return PromiseHelper.reject("Invalid args in getNumRows");
                    }

                    return XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName);
                }

                var tableId = xcHelper.getTableId(tableName);
                if (tableId != null && gTables[tableId] &&
                    gTables[tableId].resultSetCount > -1) {
                    return PromiseHelper.resolve(gTables[tableId].resultSetCount);
                }
                return XcalarGetTableCount(tableName);
            };

            XIApi.fetchData = function(tableName, startRowNum, rowsToFetch) {
                if (tableName == null || startRowNum == null ||
                    rowsToFetch == null || rowsToFetch <= 0)
                {
                    return PromiseHelper.reject("Invalid args in fetch data");
                }

                var deferred = jQuery.Deferred();
                var resultSetId;
                var finalData;

                XcalarMakeResultSetFromTable(tableName)
                .then(function(res) {
                    resultSetId = res.resultSetId;
                    var totalRows = res.numEntries;

                    if (totalRows == null || totalRows === 0) {
                        return PromiseHelper.reject("No Data!");
                    }

                    // startRowNum starts with 1, rowPosition starts with 0
                    var rowPosition = startRowNum - 1;
                    rowsToFetch = Math.min(rowsToFetch, totalRows);
                    return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                                           totalRows, [], 0);
                })
                .then(function(result) {
                    // Can clean up here
                    finalData = [];
                    for (var i = 0, len = result.length; i < len; i++) {
                        finalData.push(result[i]);
                    }
                    return XcalarSetFree(resultSetId);
                })
                .then(function() {
                    deferred.resolve(finalData);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.fetchDataAndParse = function(tableName, startRowNum, rowsToFetch) {
                // similar with XIApi.fetchData, but will parse the value
                var deferred = jQuery.Deferred();

                XIApi.fetchData(tableName, startRowNum, rowsToFetch)
                .then(function(data) {
                    var parsedData = [];

                    for (var i = 0, len = data.length; i < len; i++) {
                        try {
                            parsedData.push(JSON.parse(data[i]));
                        } catch (error) {
                            console.error(error, data[i]);
                            deferred.reject(error);
                            return;
                        }
                    }

                    deferred.resolve(parsedData);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.fetchColumnData = function(colName, tableName, startRowNum, rowsToFetch) {
                if (colName == null) {
                    // other args with check in XIApi.fetchData
                    return PromiseHelper.reject("Invalid args in fetch data");
                }

                var deferred = jQuery.Deferred();

                XIApi.fetchData(tableName, startRowNum, rowsToFetch)
                .then(function(data) {
                    var result = [];
                    var failed = false;
                    var err;
                    for (var i = 0, len = data.length; i < len; i++) {
                        try {
                            var row = JSON.parse(data[i]);
                            result.push(row[colName]);
                        } catch (error) {
                            console.error(error, data[i]);
                            err = error;
                            failed = true;
                        }
                        if (failed) {
                            deferred.reject(err);
                            return;
                        }
                    }

                    deferred.resolve(result);
                })
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.appSet = function(txId, name, hostType, duty, execStr) {
                // appName: name for app, doesn't have to match any name in execStr
                // hostType: python for python app, presumably cpp for cpp app
                // duty: leave blank, or possibly "load"
                // execStr: body of the app
                var deferred = jQuery.Deferred();
                if (txId == null || name == null) {
                    return PromiseHelper.reject("Invalid args in appSet");
                }

                // TODO: check for valid hostType, duty, execStr
                // SUBTODO: What are valid hostTypes?
                // SUBTODO: What are valid duties?
                // SUBTODO: If execStr has, for instance, syntax error,
                //          should we check that here or wait until backend
                //          catches it.
                XcalarAppSet(name, hostType, duty, execStr)
                .then(deferred.resolve)
                .fail(deferred.reject);

                return deferred.promise();
            };

            XIApi.appRun = function(txId, name, isGlobal, inStr) {
                if (txId == null || name == null) {
                    return PromiseHelper.reject("Invalid args in appSet");
                }
                return XcalarAppRun(name, isGlobal, inStr);
            };

            XIApi.appReap = function(txId, name, appGroupId) {
                if (txId == null || name == null) {
                    return PromiseHelper.reject("Invalid args in appReap");
                }
                return XcalarAppReap(name, appGroupId);
            };

            XIApi.appExecute = function(txId, name, isGlobal, inStr) {
                if (txId == null || name == null) {
                    return PromiseHelper.reject("Invalid args in appRun");
                }
                return XcalarAppExecute(name, isGlobal, inStr);
            };

            // toIgnoreError: boolean, if set true, will always resolve
            // the promise even the call fails.
            XIApi.deleteTable = function(txId, tableName, toIgnoreError) {
                if (txId == null || tableName == null) {
                    return PromiseHelper.reject("Invalid args in delete table");
                }

                var deferred = jQuery.Deferred();

                XcalarDeleteTable(tableName, txId)
                .then(deferred.resolve)
                .fail(function(error) {
                    if (toIgnoreError) {
                        deferred.resolve();
                    } else {
                        deferred.reject(error);
                    }
                });

                return deferred.promise();
            };

            XIApi.deleteTableAndMeta = function(txId, tableName, toIgnoreError) {
                var deferred = jQuery.Deferred();

                XIApi.deleteTable(txId, tableName, toIgnoreError)
                .then(function() {
                    var tableId = xcHelper.getTableId(tableName);
                    if (tableId != null && gTables[tableId] != null) {
                        delete gTables[tableId];
                    }
                    deferred.resolve();
                })
                .fail(function(error) {
                    console.error("Drop Table Failed!", error);
                    deferred.reject(error);
                });

                return deferred.promise();
            };

            XIApi.deleteTableAndMetaInBulk = function(txId, tables, toIgnoreError) {
                var promises = [];
                for (var i = 0, len = tables.length; i < len; i++) {
                    var def = XIApi.deleteTableAndMeta(txId, tables[i], toIgnoreError);
                    promises.push(def);
                }
                return PromiseHelper.when.apply(this, promises);
            };

            XIApi.createDataTarget = function(targetType, targetName, targetParams) {
                return XcalarTargetCreate(targetType, targetName, targetParams);
            };

            XIApi.deleteDataTarget = function (targetName) {
                return XcalarTargetDelete(targetName);
            };

            function getImmediatesNotInJoin(lTableInfo, rTableInfo, lOthers, rOthers) {
                var deferred = jQuery.Deferred();
                // This is a temporary work around
                var lTableId = xcHelper.getTableId(lTableInfo.tableName);
                var rTableId = xcHelper.getTableId(rTableInfo.tableName);

                var lImm;
                var rImm;
                if (gTables[lTableId]) {
                    // get the information cached in gTables
                    try {
                        var all = gTables[lTableId].backTableMeta.valueAttrs;
                        lImm = all.filter(function(o) {
                            return (o.type !== DfFieldTypeT.DfFatptr);
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
                if (gTables[rTableId]) {
                    // get the information cached in gTables
                    try {
                        var all = gTables[rTableId].backTableMeta.valueAttrs;
                        rImm = all.filter(function(o) {
                            return (o.type !== DfFieldTypeT.DfFatptr);
                        });
                    } catch (e) {
                        console.error(e);
                    }
                }
                var lDef = PromiseHelper.resolve();
                if (!lImm) {
                    lDef = XcalarGetTableMeta(lTableInfo.tableName)
                    .then(function(r) {
                        var all = r.valueAttrs;
                        lImm = all.filter(function(o) {
                            return (o.type !== DfFieldTypeT.DfFatptr);
                        });
                    });
                }
                var rDef = PromiseHelper.resolve();
                if (!rImm) {
                    rDef = XcalarGetTableMeta(rTableInfo.tableName)
                    .then(function(r) {
                        var all = r.valueAttrs;
                        rImm = all.filter(function(o) {
                            return (o.type !== DfFieldTypeT.DfFatptr);
                        });
                    });
                }
                PromiseHelper.when(lDef, rDef)
                .then(function() {
                    lImm = lImm.map(function(ele) {
                        return ele.name;
                    });
                    rImm = rImm.map(function(ele) {
                        return ele.name;
                    });

                    // Remove all columns that are part of rename and join
                    lTableInfo.columns.forEach(function(ele) {
                        var idx = lImm.indexOf(ele);
                        if (idx > -1) {
                            lImm.splice(idx, 1);
                        }
                    });
                    lTableInfo.rename.forEach(function(ele) {
                        var idx = lImm.indexOf(ele.orig);
                        if (idx > -1) {
                            lImm.splice(idx, 1);
                        }
                    });
                    rTableInfo.columns.forEach(function(ele) {
                        var idx = rImm.indexOf(ele);
                        if (idx > -1) {
                            rImm.splice(idx, 1);
                        }
                    });
                    rTableInfo.rename.forEach(function(ele) {
                        var idx = rImm.indexOf(ele.orig);
                        if (idx > -1) {
                            rImm.splice(idx, 1);
                        }
                    });
                    for (var i = 0; i < lImm.length; i++) {
                        lOthers[i] = lImm[i];
                    }
                    for (var i = 0; i < rImm.length; i++) {
                        rOthers[i] = rImm[i];
                    }
                    deferred.resolve();
                });
                return deferred.promise();
            }

            function joinCast(txId, lInfo, rInfo) {
                var deferred = jQuery.Deferred();

                var lColNames = lInfo.columns;
                var lTableName = lInfo.tableName;
                var lCasts = lInfo.casts;

                var rColNames = rInfo.columns;
                var rTableName = rInfo.tableName;
                var rCasts = rInfo.casts;

                var def1;
                var def2;
                if (lInfo.length === 0 && rInfo.length === 0) {
                    // cross join
                    def1 = PromiseHelper.resolve({
                        tableName: lTableName,
                        colNames: lColNames
                    });

                    def2 = PromiseHelper.resolve({
                        tableName: rTableName,
                        colNames: rColNames
                    });
                } else {
                    def1 = castMap(txId, lTableName, lColNames, lCasts);
                    def2 = castMap(txId, rTableName, rColNames, rCasts);
                }

                PromiseHelper.when(def1, def2)
                .then(function(lRes, rRes) {
                    var tempTables = [];
                    if (lRes.newTable) {
                        tempTables.push(lRes.tableName);
                    }

                    if (rRes.newTable) {
                        tempTables.push(rRes.tableName);
                    }

                    deferred.resolve({
                        "lTableName": lRes.tableName,
                        "lColNames": lRes.colNames,
                        "rTableName": rRes.tableName,
                        "rColNames": rRes.colNames,
                        "tempTables": tempTables
                    });
                })
                .fail(function() {
                    deferred.reject(xcHelper.getPromiseWhenError(arguments));
                });

                return deferred.promise();
            }

            /*
                casts: an array of type to cast
             */
            function castMap(txId, tableName, colNames, casts, options) {
                var deferred = jQuery.Deferred();
                var castInfo = getCastInfo(tableName, colNames, casts, options);
                var newColNames = castInfo.newColNames;
                var newTypes = castInfo.newTypes;

                if (castInfo.mapStrs.length === 0) {
                    deferred.resolve({
                        tableName: tableName,
                        colNames: newColNames,
                        types: newTypes
                    });
                } else {
                    var tableId = xcHelper.getTableId(tableName);
                    // ok if null, only being used for setorphantablemeta
                    var progCols = gTables[tableId] ? gTables[tableId].tableCols : null;
                    var newTableName = getNewTableName(tableName);
                    XcalarMap(castInfo.newFields, castInfo.mapStrs,
                              tableName, newTableName, txId)
                    .then(function() {
                        TblManager.setOrphanTableMeta(newTableName, progCols);

                        deferred.resolve({
                            tableName: newTableName,
                            colNames: newColNames,
                            types: newTypes,
                            newTable: true
                        });
                    })
                    .fail(deferred.reject);
                }

                return deferred.promise();
            }

            /*
              options:
                overWrite: (boolean)overWrite old column name or not
                handleNull: (boolean) handle null case or not
                castPrefix: (boolean) cast prefix field or not
             */
            function getCastInfo(tableName, colNames, casts, options) {
                options = options || {};
                var tableId = xcHelper.getTableId(tableName);
                var mapStrs = [];
                var newFields = []; // this is for map
                var newColNames = []; // this is for index
                var nameMap = {};

                var overWrite = options.overWrite || false;
                var handleNull = options.handleNull || false;
                var castPrefix = options.castPrefix || false;

                colNames.forEach(function(name) {
                    nameMap[name] = true;
                });

                var newTypes = [];

                casts.forEach(function(typeToCast, index) {
                    var colName = colNames[index];
                    var parsedCol = xcHelper.parsePrefixColName(colName);
                    var name = xcHelper.stripColName(parsedCol.name);
                    var newType = null;
                    var newField = colName;

                    if (!typeToCast && castPrefix && parsedCol.prefix) {
                        // when it's a fatptr and no typeToCast specified
                        try {
                            newType = gTables[tableId].getColByBackName(colName).getType();
                        } catch (e) {
                            console.error(e);
                            // when fail to get the col type from meta, cast to string
                            // XXX this is a hack util backend support auto cast when indexing
                            newType = "string";
                        }
                        newField = overWrite
                                   ? name
                                   : parsedCol.prefix + "--" + name;
                        // handle name conflict case
                        if (nameMap.hasOwnProperty(newField)) {
                            newField = parsedCol.prefix + "--" + name;
                            newField = xcHelper.getUniqColName(tableId, newField);
                        }
                    } else if (typeToCast != null) {
                        newType = typeToCast;
                        newField = name;
                    }

                    if (newType != null) {
                        newField = overWrite ? newField : xcHelper.randName(newField);
                        mapStrs.push(xcHelper.castStrHelper(colName, newType, handleNull));
                        newFields.push(newField);
                    }
                    newColNames.push(newField);
                    newTypes.push(newType);
                });

                return {
                    mapStrs: mapStrs,
                    newFields: newFields,
                    newColNames: newColNames,
                    newTypes: newTypes
                };
            }

            function joinIndexCheck(joinInfo, removeNulls, txId) {
                var deferred = jQuery.Deferred();
                var deferred1;
                var deferred2;
                var lColNames = joinInfo.lColNames;
                var rColNames = joinInfo.rColNames;
                var lTableName = joinInfo.lTableName;
                var rTableName = joinInfo.rTableName;

                // for cross joins where no col names should be provided
                if (lColNames.length === 0) {
                    if (rColNames.length !== 0) {
                        return PromiseHelper.reject("Both lColNames and rColNames " +
                                                    "must be empty for outer joins");
                    }
                    var lInfo = {
                        tableName: lTableName,
                        oldKeys: [],
                        newKeys: []
                    };
                    var rInfo = {
                        tableName: rTableName,
                        oldKeys: [],
                        newKeys: []
                    };
                    return PromiseHelper.resolve(lInfo, rInfo, []);
                }

                if (lTableName === rTableName &&
                    isSameKey(lColNames, rColNames))
                {
                    // when it's self join
                    var defs = selfJoinIndex(lColNames, lTableName, txId);
                    deferred1 = defs[0];
                    deferred2 = defs[1];
                } else {
                    deferred1 = checkTableIndex(lColNames, lTableName, txId);
                    deferred2 = checkTableIndex(rColNames, rTableName, txId);
                }

                var lIndexedTable;
                var rIndexedTable;
                var tempTables;
                var lNewKeys;
                var rNewKeys;
                PromiseHelper.when(deferred1, deferred2)
                .then(function(res1, res2) {
                    lIndexedTable = res1.indexTable;
                    rIndexedTable = res2.indexTable;
                    lNewKeys = res1.indexKeys;
                    rNewKeys = res2.indexKeys;
                    tempTables = res1.tempTables.concat(res2.tempTables);

                    if (removeNulls) {
                        var newTableName = getNewTableName(tableName, ".noNulls");
                        tempTables.push(newTableName);
                        return XcalarFilter("exists(" + lColNames[0] + ")", lIndexedTable,
                                            newTableName, txId);
                    } else {
                        return PromiseHelper.resolve();
                    }
                })
                .then(function() {
                    var lInfo = {
                        tableName: lIndexedTable,
                        oldKeys: lColNames,
                        newKeys: lNewKeys
                    };
                    var rInfo = {
                        tableName: rIndexedTable,
                        oldKeys: rColNames,
                        newKeys: rNewKeys
                    };
                    deferred.resolve(lInfo, rInfo, tempTables);
                })
                .fail(function() {
                    var error = xcHelper.getPromiseWhenError(arguments);
                    deferred.reject(error);
                });

                return deferred.promise();
            }

            function resolveJoinIndexColRename(lRename, rRename, lInfo, rInfo, lOthers,
                                               rOthers) {
                var getNewKeySet = function(keys) {
                    var res = {};
                    keys.forEach(function(key) {
                        res[key] = true;
                    });
                    return res;
                };

                var resolveDupName = function(keyInfo, rename, otherKeySet, suffix) {
                    var oldKeys = keyInfo.oldKeys;
                    var newKeys = keyInfo.newKeys;

                    oldKeys.forEach(function(oldKey, index) {
                        var newKey = newKeys[index];
                        if (oldKey !== newKey && otherKeySet.hasOwnProperty(newKey)) {
                            // when it's fatptr convert to immediate
                            var oldName = newKey;
                            var newName = newKey + suffix;
                            rename.push(xcHelper.getJoinRenameMap(oldName, newName));
                        }
                    });
                };

                var lSuffix = xcHelper.randName("_l_index");
                var rSuffix = xcHelper.randName("_r_index");
                var lKeySet = getNewKeySet(xcHelper.arrayUnion(lInfo.newKeys, lOthers));
                var rKeySet = getNewKeySet(xcHelper.arrayUnion(rInfo.newKeys, rOthers));

                resolveDupName(lInfo, lRename, rKeySet, lSuffix);
                resolveDupName(rInfo, rRename, lKeySet, rSuffix);
            }

            function selfJoinIndex(colNames, tableName, txId) {
                var deferred1 = jQuery.Deferred();
                var deferred2 = jQuery.Deferred();

                checkTableIndex(colNames, tableName, txId)
                .then(function(res) {
                    deferred1.resolve(res);
                    deferred2.resolve(res);
                })
                .fail(function() {
                    deferred1.reject.apply(this, arguments);
                    deferred2.reject.apply(this, arguments);
                });

                return [deferred1.promise(), deferred2.promise()];
            }

            function isSameKey(key1, key2) {
                if (key1.length !== key2.length) {
                    return false;
                }

                for (var i = 0, len = key1.length; i < len; i++) {
                    if (key1[i] !== key2[i]) {
                        return false;
                    }
                }

                return true;
            }

            function checkIfNeedIndex(colsToIndex, tableName, tableKeys, order, txId) {
                var deferred = jQuery.Deferred();
                var shouldIndex = false;
                var tempTables = [];

                getUnsortedTableName(tableName, null, txId)
                .then(function(unsorted) {
                    if (unsorted !== tableName) {
                        // this is sorted table, should index a unsorted one
                        XIApi.checkOrder(unsorted, txId)
                        .then(function(parentOrder, parentKeys) {
                            var parentKeyNames = parentKeys.map(function(key) {
                                return key.name;
                            });
                            if (!isSameKey(parentKeyNames, colsToIndex)) {
                                var tableKeyNames = tableKeys.map(function(key) {
                                    return key.name;
                                });
                                if (!isSameKey(parentKeyNames, tableKeyNames)) {
                                    // if current is sorted, the parent should also
                                    // index on the tableKey to remove "FNF"
                                    // var fltTable = getNewTableName(tableName,
                                    //                               ".fltParent", true);

                                    // XXX this is correct This is correct, but there are some backend issues with excluding FNFs for now 7071, 7622
                                    // So for now, we will have to use the old method in trunk. But for the demo, since we are not sorting, we will not run into this :) Also there are no FNFs
                                    // var fltStr = "exists(" + tableKey + ")";
                                    // XIApi.filter(txId, fltStr, unsorted, fltTable)
                                    // .then(function(tblAfterFlt) {
                                    //     // must index
                                    //     shouldIndex = true;
                                    //     tempTables.push(tblAfterFlt);
                                    //     deferred.resolve(shouldIndex, tblAfterFlt,
                                    //                      tempTables);
                                    // })
                                    // .fail(deferred.reject);

                                    var indexTable = getNewTableName(tableName,
                                                                  ".indexParent", true);
                                    var keyInfos = tableKeyNames.map(function(key) {
                                        return {
                                            name: key,
                                            ordering: XcalarOrderingT.XcalarOrderingUnordered
                                        };
                                    });
                                    XcalarIndexFromTable(unsorted, keyInfos,
                                                         indexTable, txId)
                                    .then(function() {
                                        if (isSameKey(tableKeyNames, colsToIndex)) {
                                            // when the parent has right index
                                            shouldIndex = false;
                                        } else {
                                            // when parent need another index on colName
                                            shouldIndex = true;
                                        }
                                        tempTables.push(indexTable);
                                        deferred.resolve(shouldIndex, indexTable,
                                                         tempTables);
                                    })
                                    .fail(deferred.reject);
                                } else {
                                    // when parent is indexed on tableKeys,
                                    // still need another index on colNames
                                    shouldIndex = true;
                                    deferred.resolve(shouldIndex, unsorted, tempTables);
                                }
                            } else {
                                // because FAJS will automatically find parent table
                                // so if parent table is already index on colName
                                // no need to do another index
                                shouldIndex = false;
                                deferred.resolve(shouldIndex, unsorted, tempTables);
                            }
                        })
                        .fail(deferred.reject);
                    } else {
                        // this is the unsorted table
                        var tableKeyNames = tableKeys.map(function(key) {
                            return key.name;
                        });
                        if (!isSameKey(tableKeyNames, colsToIndex)) {
                            shouldIndex = true;
                        } else if (!XcalarOrderingTStr.hasOwnProperty(order) ||
                                  order === XcalarOrderingT.XcalarOrderingInvalid) {
                            console.error("invalid ordering");
                            shouldIndex = true;
                        }

                        deferred.resolve(shouldIndex, tableName, tempTables);
                    }
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function semiJoinHelper(lIndexedTable, rIndexedTable, rIndexedColNames,
                                    newTableName, joinType, lRename, rRename,
                                    tempTables, txId) {
                var deferred = jQuery.Deferred();
                // TODO: switch left and right and support right semi joins
                var antiJoinTableName;
                var newColName = xcHelper.randName("XC_GB_COL");
                var newGbTableName = getNewTableName(rIndexedTable);

                function doJoin() {
                    if (joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                        joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin) {
                        antiJoinTableName = getNewTableName(rIndexedTable);
                        return XcalarJoin(lIndexedTable, newGbTableName,
                                          antiJoinTableName,
                                          JoinOperatorT.LeftOuterJoin,
                                          lRename, rRename, undefined, txId);
                    } else {
                        return XcalarJoin(lIndexedTable, newGbTableName, newTableName,
                            JoinOperatorT.InnerJoin, lRename, rRename, undefined, txId);
                    }
                }

                // XXX FIXME rIndexedColNames[0] is wrong in the cases where it is
                // called a::b, and there's another immediate called b
                // This is because a::b will becomes b.
                XcalarGroupByWithEvalStrings([newColName], ["count(1)"], rIndexedTable,
                              newGbTableName, false, false, rIndexedColNames[0], false,
                              txId)
                .then(doJoin)
                .then(function() {
                    if (joinType === JoinCompoundOperatorTStr.LeftAntiSemiJoin ||
                        joinType === JoinCompoundOperatorTStr.RightAntiSemiJoin) {
                        tempTables.push(antiJoinTableName);
                        return XcalarFilter("not(exists(" + rIndexedColNames[0] + "))",
                               antiJoinTableName, newTableName, txId);
                    } else {
                        return PromiseHelper.resolve();
                    }
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
                return deferred.promise();
            }

            /* check if table has correct index
                resolve: {
                    indexTable: (string) table to idnex
                    indexKeys: (string) keys indexed on
                    tempTables: (array) list of temp tables
                    hasIndexed: (boolean) has indexed or not
                    isCache: (boolean) is cache or not
                }
             */
            function checkTableIndex(colNames, tableName, txId, isApiCall) {
                var deferred = jQuery.Deferred();
                var tableId = xcHelper.getTableId(tableName);
                var tableCols = null;
                var table = null;
                var indexCache;

                if (Transaction.isSimulate(txId)) {
                    indexCache = SQLApi.getIndexTable(tableName, colNames);
                    if (indexCache != null) {
                        deferred.resolve({
                            indexTable: indexCache.tableName,
                            indexKeys: indexCache.keys,
                            tempTables: [],
                            hasIndexed: true,
                            isCache: true
                        });
                        return deferred.promise();
                    }
                } else if (tableId == null || !gTables.hasOwnProperty(tableId)) {
                    // in case we have no meta of the table
                    console.warn("cannot find the table");
                } else {
                    table = gTables[tableId];
                    tableCols = table.tableCols;
                    indexCache = table.getIndexTable(colNames);
                    if (indexCache != null) {
                        // XXX Note: here the assume is if index table has meta,
                        // it should exists
                        // more reliable might be use XcalarGetTables to check, but it's
                        // async
                        var indexTableId = xcHelper.getTableId(indexCache.tableName);
                        if (gTables.hasOwnProperty(indexTableId)) {
                            console.log("has cached of index table", indexCache.tableName);
                            QueryManager.addIndexTable(txId, indexCache.tableName);
                            deferred.resolve({
                                indexTable: indexCache.tableName,
                                indexKeys: indexCache.keys,
                                tempTables: [],
                                hasIndexed: true,
                                isCache: true
                            });
                            return deferred.promise();
                        } else {
                            console.log("cached index table", indexCache.tableName, "not exists");
                            table.removeIndexTable(colNames);
                        }
                    }
                }

                XIApi.checkOrder(tableName, txId)
                .then(function(order, keys) {
                    return checkIfNeedIndex(colNames, tableName, keys, order, txId);
                })
                .then(function(shouldIndex, unsortedTable, tempTables) {
                    if (shouldIndex) {
                        console.log(tableName, "not indexed correctly!");
                        // XXX In the future,we can check if there are other tables that
                        // are indexed on this key. But for now, we reindex a new table
                        var newTableName = getNewTableName(tableName, ".index");
                        var keyInfos = colNames.map(function(colName) {
                            return {
                                name: colName,
                                ordering: XcalarOrderingT.XcalarOrderingUnordered
                            };
                        });
                        XcalarIndexFromTable(unsortedTable, keyInfos, newTableName, txId)
                        .then(function(res) {
                            var newKeys = res.newKeys;
                            if (!isApiCall) {
                                tempTables.push(newTableName);
                                TblManager.setOrphanTableMeta(newTableName, tableCols);
                            }
                            if (Transaction.isSimulate(txId)) {
                                SQLApi.cacheIndexTable(tableName, colNames,
                                                       newTableName, newKeys);
                            } else if (table != null) {
                                table.setIndexTable(colNames, newTableName, newKeys);
                            }
                            deferred.resolve({
                                indexTable: newTableName,
                                indexKeys: newKeys,
                                tempTables: tempTables,
                                hasIndexed: shouldIndex
                            });
                        })
                        .fail(function(error) {
                            if (error.code === StatusT.StatusAlreadyIndexed) {
                                deferred.resolve({
                                    indexTable: unsortedTable,
                                    indexKeys: colNames,
                                    tempTables: tempTables,
                                    hasIndexed: false
                                });
                            } else {
                                deferred.reject(error);
                            }
                        });
                    } else {
                        console.log(tableName, "indexed correctly!");
                        deferred.resolve({
                            indexTable: unsortedTable,
                            indexKeys: colNames,
                            tempTables: tempTables,
                            hasIndexed: shouldIndex
                        });
                    }
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function getTableKeys(tableName, txId) {
                var deferred = jQuery.Deferred();
                XIApi.checkOrder(tableName, txId)
                .then(function(ordering, keys) {
                    if (keys.length === 0) {
                        deferred.resolve(null);
                    } else {
                        deferred.resolve(keys);
                    }
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function replacePrefix(col, rename) {
                // for each fat ptr rename, find whether a column has this fat ptr as
                // a prefix. If so, fix up all fields in colStruct that pertains to the
                // prefix
                for (var i = 0; i < rename.length; i++) {
                    if (rename[i].type === DfFieldTypeT.DfFatptr) {
                        if (!col.immediate && col.prefix === rename[i].orig) {
                            col.backName = col.backName.replace(rename[i].orig,
                                                                rename[i].new);
                            col.func.args[0] = col.func.args[0].replace(rename[i].orig,
                                                                        rename[i].new);
                            col.prefix = col.prefix.replace(rename[i].orig,
                                                            rename[i].new);
                            col.userStr = '"' + col.name + '" = pull(' + rename[i].new +
                                          '::' + col.name + ')';
                            if (col.sizedTo === "header") {
                                col.width = xcHelper.getDefaultColWidth(col.name,
                                                                        col.prefix);
                            }
                        }
                    }
                }
            }

            function getPulledColsAfterJoin(tableId, pulledColNames, renames) {
                var pulledCols = [];
                if (tableId == null || gTables[tableId] == null ||
                    gTables[tableId].tableCols == null) {
                    return pulledCols;
                }

                var table = gTables[tableId];
                var cols = xcHelper.deepCopy(table.tableCols);
                if (pulledColNames) {
                    for (var i = 0; i < pulledColNames.length; i++) {
                        var colNum = table.getColNumByBackName(pulledColNames[i]) - 1;
                        var col = cols[colNum];
                        if (renames && renames.length > 0) {
                            for (var j = 0; j < renames.length; j++) {
                                // when backName === srcColName, it's a derived field
                                if (renames[j].orig === col.backName) {
                                    var newName = renames[j].new;
                                    col.backName = newName;
                                    col.name = newName;
                                    if (col.sizedTo === "header") {
                                        col.width = xcHelper.getDefaultColWidth(newName);
                                    }
                                }
                            }
                            replacePrefix(col, renames);
                        }
                        pulledCols.push(col);
                    }
                } else {
                    pulledCols = cols;
                }
                return pulledCols;
            }

            function excludeDataCol(col) {
                return col.name !== "DATA";
            }

            // For xiApi.join, deep copy of right table and left table columns
            function createJoinedColumns(lTableId, rTableId, pulledLColNames,
                                        pulledRColNames, lRename, rRename) {
                // Combine the columns from the 2 current tables
                // Note that we have to create deep copies!!
                var lCols = getPulledColsAfterJoin(lTableId, pulledLColNames, lRename);
                var rCols = getPulledColsAfterJoin(rTableId, pulledRColNames, rRename);

                var lNewCols = lCols.filter(excludeDataCol);
                var rNewCols = rCols.filter(excludeDataCol);
                var newTableCols = lNewCols.concat(rNewCols);
                newTableCols.push(ColManager.newDATACol());

                return newTableCols;
            }

            function getGroupbyIndexedTable(txId, tableName, groupByCols) {
                var deferred = jQuery.Deferred();
                var groupByFields;
                var tempTables = [];

                // cast all keys into immediates first
                var casts = new Array(groupByCols.length).fill(null);
                castMap(txId, tableName, groupByCols, casts, {overWrite: true})
                .then(function(res) {
                    if (res.newTable) {
                        tempTables.push(res.tableName);
                    }
                    groupByFields = res.colNames;
                    return checkTableIndex(groupByFields, res.tableName, txId);
                })
                .then(function(res) {
                    tempTables = tempTables.concat(res.tempTables);
                    deferred.resolve(res.indexTable, groupByFields, tempTables);
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function getFinalGroupByCols(tableName, finalTableName, groupByCols, gbArgs,
                                         isIncSample, sampleCols, renamedGroupByCols) {
                var dataCol = ColManager.newDATACol();
                var tableId = xcHelper.getTableId(tableName);
                var newColNames = {};
                var newProgCols = [];
                var numNewCols = gbArgs.length;
                var numGroupByCols = groupByCols.length;
                var finalCols;

                for (var i = 0; i < groupByCols.length; i++) {
                    renamedGroupByCols.push(groupByCols[i]);
                }

                if (tableId == null || !gTables.hasOwnProperty(tableId)) {
                    // We really should clean up this function to remove the requirement
                    // of gTables
                    finalCols = [];
                    gbArgs.forEach(function(gbArg) {
                        var name = gbArg.newColName;
                        newColNames[name] = true;
                        newProgCols.push(ColManager.newPullCol(name, name));
                    });

                    groupByCols.forEach(function(name) {
                        if (!newColNames[name]) {
                            newColNames[name] = true;
                            newProgCols.push(ColManager.newPullCol(name, name));
                        }
                    });

                    console.warn("Cannot find table. Not handling sampleCols");

                    newProgCols.push(dataCol);
                    return PromiseHelper.resolve(newProgCols);
                }

                var table = gTables[tableId];
                var tableCols = table.tableCols;

                gbArgs.forEach(function(gbArg) {
                    var name = gbArg.newColName;
                    newColNames[name] = true;
                    newProgCols.push(ColManager.newPullCol(name, name));
                });

                if (isIncSample) {
                    var newCols = [];
                    var newProgColPosFound = false;
                    sampleCols.forEach(function(colNum) {
                        var backCol = tableCols[colNum].getBackColName();
                        if (!newProgColPosFound) {
                            for (var j = 0; j < numGroupByCols; j++) {
                                if (backCol === groupByCols[j]) {
                                    for (var k = 0; k < numNewCols; k++) {
                                        newCols.push(newProgCols[k]);
                                    }
                                    newProgColPosFound = true;
                                    break;
                                }
                            }
                        }

                        newCols.push(tableCols[colNum]);
                    });

                    if (!newProgColPosFound) {
                        newProgCols.forEach(function(progCol) {
                            newCols.unshift(progCol);
                        });
                    }
                    // Note that if include sample,
                    // a.b should not be escaped to a\.b
                    var dataColNum = gTables[tableId].getColNumByBackName("DATA") - 1;
                    newCols.push(tableCols[dataColNum]);
                    finalCols = newCols.map(function(col) {
                        return new ProgCol(col);
                    });
                    return PromiseHelper.resolve(finalCols);
                } else {
                    var deferred = jQuery.Deferred();
                    getTableKeys(finalTableName)
                    .then(function(keys) {
                        keys.forEach(function(key, index) {
                            newProgCols.push(ColManager.newPullCol(key.name));
                            renamedGroupByCols[index] = key.name;
                        });
                        newProgCols.push(dataCol);
                        deferred.resolve(newProgCols);
                    })
                    .fail(function() {
                        newProgCols.push(dataCol);
                        deferred.resolve(newProgCols); // still resolve
                    });
                    return deferred.promise();
                }
            }

            /* an array of objects with operator, aggColName, distinct, and newColName
             *         properties - for multi group by operations
             */
            function distinctGroupby(tableName, groupOnCols, distinctColArray, curTable,
                                     tempTableArray, tempCols, txId)
                {
                // The below is an optimization. If multiple aggOps are operating on the
                // same column, we only need do that groupby once
                var deferred = jQuery.Deferred();
                var aggCols = {};
                for (var i = 0; i < distinctColArray.length; i++) {
                    var aggCol = distinctColArray[i].aggColName;
                    if (aggCol in aggCols) {
                        aggCols[aggCol].push(distinctColArray[i]);
                    } else {
                        aggCols[aggCol] = [distinctColArray[i]];
                    }
                }

                var promiseArray = [];
                var distinctGbTables = [];
                for (var key in aggCols) {
                    promiseArray.push(computeDistinctGroupby(tableName,
                                                             groupOnCols,
                                                             key, aggCols[key],
                                                             tempTableArray, tempCols,
                                                             distinctGbTables,
                                                             txId));
                }
                PromiseHelper.when.apply($, promiseArray)
                .then(function() {
                    // Now we want to do cascading joins on the newTableNames
                    return cascadingJoins(distinctGbTables, curTable, groupOnCols,
                                          tempTableArray, tempCols, txId);
                })
                .then(function(finalJoinedTable) {
                    deferred.resolve(finalJoinedTable, tempTableArray, tempCols);
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function computeDistinctGroupby(origTableName, groupOnCols, distinctCol,
                                            aggEvalStrArray, tempTableArray, tempCols,
                                            distinctGbTableNames, txId) {
                var deferred = jQuery.Deferred();
                var reuseIndex = false;

                if (groupOnCols.indexOf(distinctCol) === -1) {
                    newGroupOnArray = groupOnCols.concat([distinctCol]);
                } else {
                    reuseIndex = true;
                    newGroupOnArray = groupOnCols;
                }
                var gbDistinctTableName = getNewTableName(origTableName, "gbDistinct");
                var gbTableName = getNewTableName(origTableName, "gb");
                tempTableArray.push(gbDistinctTableName);
                tempTableArray.push(gbTableName);

                var newIndexTable;

                checkTableIndex(newGroupOnArray, origTableName, txId)
                .then(function(indexedTableName, shouldIndex, tempTables) {
                    tempTableArray = tempTableArray.concat(tempTables);
                    var newCountColName = "XC_COUNT_" + xcHelper.getTableId(gbTableName);
                    tempCols.push(newCountColName);
                    return XcalarGroupByWithEvalStrings([newCountColName],
                                                        ["count(1)"],
                                                        indexedTableName,
                                                        gbDistinctTableName, false, false,
                                                        newGroupOnArray[0], false, txId);
                    // XXX [0] argument needs to be fixed once bohan's fix goes in
                })
                .then(function() {
                    if (reuseIndex) {
                        newIndexTable = gbDistinctTableName;
                        return PromiseHelper.resolve();
                    } else {
                        newIndexTable = getNewTableName(origTableName, "index");
                        tempTableArray.push(newIndexTable);
                        var keyInfos = groupOnCols.map(function(colName) {
                            return {
                                name: colName,
                                ordering: XcalarOrderingT.XcalarOrderingUnordered
                            };
                        });
                        return XcalarIndexFromTable(gbDistinctTableName, keyInfos,
                                                    newIndexTable, txId);
                    }
                })
                .then(function(res) {
                    var aggEvalStrFlattened = [];
                    var newColNames = [];
                    for (var i = 0; i < aggEvalStrArray.length; i++) {
                        aggEvalStrFlattened.push(aggEvalStrArray[i].operator + "(" +
                                                 aggEvalStrArray[i].aggColName + ")");
                        newColNames.push(aggEvalStrArray[i].newColName);
                    }
                    // This is to optimize the join later so that it doesn't have to
                    // re-index
                    if (Transaction.isSimulate(txId)) {
                        SQLApi.cacheIndexTable(gbTableName, groupOnCols,
                                                newIndexTable, res.newKeys);
                    }
                    // TODO add the same cacheIndexTable for interactive
                    return XcalarGroupByWithEvalStrings(newColNames,
                                                        aggEvalStrFlattened,
                                                        newIndexTable,
                                                        gbTableName, false, false,
                                                        newGroupOnArray[0],
                                                        false, txId);
                })
                .then(function() {
                    distinctGbTableNames.push(gbTableName);
                    deferred.resolve();
                })
                .fail(deferred.reject);

                return deferred.promise();
            }

            function cascadingJoins(distinctGbTablenames, origGbTable, joinCols,
                                    tempTableArray, tempCols, txId) {
                if (distinctGbTablenames.length === 0) {
                    return PromiseHelper.resolve(origGbTable);
                }

                var promiseArray = [];
                var deferred = jQuery.Deferred();
                tempTableArray.push(origGbTable);

                var finalJoinedTable;
                var curTableName = origGbTable;
                for (var i = 0; i < distinctGbTablenames.length; i++) {
                    // The index cols will collide for sure. So we must rename these
                    // The newly generated columns cannot collide because they will
                    // be renamed earlier on XXX add asserts / fixme
                    var rRename = [];
                    var rTableId = xcHelper.getTableId(distinctGbTablenames[i]);
                    for (var j = 0; j < joinCols.length; j++) {
                        rRename.push({
                            new: joinCols[j] + "_" + rTableId,
                            orig: joinCols[j],
                            type: DfFieldTypeT.DfUnknown
                        });
                        tempCols.push(joinCols[j] + "_" + rTableId);
                    }
                    var newTableName = getNewTableName(origGbTable, "join");
                    if (i < distinctGbTablenames.length - 1) { // Don't push final table
                        tempTableArray.push(newTableName);
                    }

                    promiseArray.push(
                        XcalarJoin.bind($, curTableName, distinctGbTablenames[i],
                                        newTableName, JoinOperatorT.InnerJoin,
                                        [], rRename, undefined, txId));
                    curTableName = newTableName;
                }

                finalJoinedTable = curTableName;

                PromiseHelper.chain(promiseArray)
                .then(function() {
                    deferred.resolve(finalJoinedTable);
                })
                .fail(deferred.reject);
                return deferred.promise();
            }

            function isValidTableName(tableName) {
                var isValid = isCorrectTableNameFormat(tableName);
                if (!isValid) {
                    if (tableName != null) {
                        console.error("incorrect table name format");
                    }
                    return false;
                }

                var namePart = xcHelper.getTableName(tableName);
                // allow table name to start with dot
                isValid = xcHelper.isValidTableName(namePart);
                if (!isValid) {
                    // we allow name that has dot internally
                    namePart = namePart.replace(/\./g, "");
                    isValid = xcHelper.isValidTableName(namePart);
                }
                if (!isValid) {
                    if (tableName != null) {
                        console.error("incorrect table name format");
                    }
                }
                return isValid;
            }

            function isValidAggName(aggName) {
                if (isCorrectTableNameFormat(aggName)) {
                    // allow aggName to have the table name format
                    return isValidTableName(aggName);
                } else {
                    // no blanks, must start with alpha, cannot have any special chars
                    // other than _ and - and #
                    return xcHelper.isValidTableName(aggName);
                }
            }

            function isCorrectTableNameFormat(tableName) {
                if (tableName == null || tableName === "") {
                    return false;
                }
                if (typeof sqlMode !== "undefined" && sqlMode) {
                    return true;
                }
                var regex = "^.*#[a-zA-Z0-9]{2}[0-9]+$";
                var regexp = new RegExp(regex);
                return regexp.test(tableName);
            }

            function isValidPrefix(prefix) {
                if (!prefix || prefix === "") {
                    console.error("invalid prefix");
                    return false;
                }
                return xcHelper.checkNamePattern("prefix", "check", prefix);
            }

            function getNewTableName(tableName, affix, rand) {
                var nameRoot = xcHelper.getTableName(tableName);

                if (affix != null) {
                    nameRoot += affix;
                }

                if (rand) {
                    nameRoot = xcHelper.randName(nameRoot);
                }

                return (nameRoot + Authentication.getHashId());
            }

            function getNewPrefix(dsName) {
                return xcHelper.normalizePrefix(dsName);
            }

            if (typeof exports !== "undefined") {
                if (typeof module !== "undefined" && module.exports) {
                    exports = module.exports = XIApi;
                }
                exports.XIApi = XIApi;
            } else {
                root.XIApi = XIApi;
            }
        }());
    }

    function patchMixpanel() {
        console.log("patched");
        xcMixpanel.addListeners = function() {
            var lastFocus;
            $(window).load(function() {
                var name = XcSupport.getUser();
                if (name){
                    mixpanel.identify(name);
                    mixpanel.people.set({
                        "$last_name": name
                    });
                }
                var version = "No version info";
                if (XVM.getVersion()) {
                    version = XVM.getVersion().split("-")[0];
                }
                mixpanel.track("LoginEvent", {
                    "Username": name,
                    "Version": version,
                    "Timestamp": (new Date()).getTime()
                });
                emailNotification(name, version);
                lastFocus = (new Date()).getTime();
            });

            function emailNotification(username, version) {
                var emailOpts = {
                    "username": username,
                    "timestamp": (new Date()).getTime(),
                    "host": window.location.hostname,
                    "version": version
                };
                $.ajax({
                    "type": "POST",
                    "url": "https://kura8uu67a.execute-api.us-west-2.amazonaws.com/prod/mixpanel",
                    "data": JSON.stringify(emailOpts),
                    "contentType": "application/json",
                    success: function(data) {
                        console.log(data);
                    },
                    error: function(error) {
                        console.log(error);
                    }
                });
            }

            $(window).focus(function() {
                lastFocus = (new Date()).getTime();
            });
            $(window).blur(function() {
                var timestamp = (new Date()).getTime();
                var time = (timestamp - lastFocus)/1000 + " s";
                mixpanel.track("focusEvent", {
                    "Time": time,
                    "Timestamp": timestamp,
                    "Username": XcSupport.getUser(),
                    "Host": window.location.hostname
                });
            });
        };
    }

    function patchDSPreview() {
        var targetNode = document.getElementById('previewTable');
        // Options for the observer (which mutations to observe)
        var config = {childList: true};
        var observer;
        // Callback function to execute when mutations are observed
        var callback = function(mutationsList) {
            if (window.isBrowserSafari) {
                for (var i = 0; i < mutationsList.length; i++) {
                    var mutation = mutationsList[i];
                    if (mutation.type === 'childList') {
                        if (!$("#previewTable tbody").hasClass("patch")) {
                            console.log("patch preview!");
                            $("#previewTable tbody").addClass("patch");
                            $("#previewTable").removeClass("dataTable");
                            setTimeout(function() {$("#previewTable").addClass("dataTable");}, 0);
                            break;
                        }
                    }
                }
            } else {
                observer.disconnect();
            }
        };

        // Create an observer instance linked to the callback function
        observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
    }

    function patchExportNodeStruct() {
        window.XcalarListExportTargets = function(typePattern, namePattern) {
            if ([null, undefined].indexOf(tHandle) !== -1) {
                return PromiseHelper.resolve(null);
            }
            var deferred = jQuery.Deferred();
            if (insertError(arguments.callee, deferred)) {
                return deferred.promise();
            }
            xcalarListExportTargets(tHandle, typePattern, namePattern)
            .then(function(ret) {
                var numTargets = ret.numTargets;
                var target;
                for (var i = 0; i < numTargets; i++) {
                    target = ret.targets[i];
                    if (target.specificInput) {
                        if (!target.specificInput.sfInput) {
                            target.specificInput.sfInput = new ExAddTargetSFInputT();
                            target.specificInput.sfInput.url = "";
                        }
                        if (!target.specificInput.udfInput) {
                            target.specificInput.udfInput = new ExAddTargetUDFInputT();
                        }
                    }
                }
                deferred.resolve(ret);
            })
            .fail(function(error) {
                var thriftError = thriftLog("XcalarListExportTargets", error);
                deferred.reject(thriftError);
            });
            return deferred.promise();
        };

        window.XcalarGetRetina = function(retName) {
            if (retName === "" || retName == null || [null, undefined].indexOf(tHandle) !== -1) {
                return PromiseHelper.resolve(null);
            }
            var deferred = jQuery.Deferred();
            if (insertError(arguments.callee, deferred)) {
                return deferred.promise();
            }
            xcalarGetRetina(tHandle, retName)
            .then(function(ret){
                var retina = ret.retina;
                if (retina && retina.retinaDag) {
                    var node;
                    for (var i = 0; i < retina.retinaDag.numNodes; i++) {
                        node = retina.retinaDag.node[i];
                        if (node.api === XcalarApisT.XcalarApiExport) {
                            var exportStruct = node.input.exportInput;
                            if (exportStruct.meta && exportStruct.meta.specificInput) {
                                if (!exportStruct.meta.specificInput.sfInput) {
                                    exportStruct.meta.specificInput.sfInput = new ExInitExportSFInputT();
                                }
                                if (!exportStruct.meta.specificInput.udfInput) {
                                    exportStruct.meta.specificInput.udfInput = new ExInitExportUDFInputT();
                                }
                            }
                        }
                    }
                }
                deferred.resolve(ret);
            })
            .fail(function(error) {
                var thriftError = thriftLog("XcalarGetRetina", error);
                Log.errorLog("Get Retinas", null, null, thriftError);
                deferred.reject(thriftError);
            });
            return deferred.promise();
        };
    }
    function patchSynthesizeNodeStructTag() {
        window.XcalarGetRetina = function(retName) {
            if (retName === "" || retName == null || [null, undefined].indexOf(tHandle) !== -1) {
                return PromiseHelper.resolve(null);
            }
            var deferred = PromiseHelper.deferred();
            if (insertError(arguments.callee, deferred)) {
                return deferred.promise();
            }
            xcalarGetRetina(tHandle, retName)
            .then(function(ret){
                var retina = ret.retina;
                if (retina && retina.retinaDag) {
                    var node;
                    for (var i = 0; i < retina.retinaDag.numNodes; i++) {
                        node = retina.retinaDag.node[i];
                        if (node.api === XcalarApisT.XcalarApiSynthesize) {
                            node.tag = "";
                        }
                    }
                }
                deferred.resolve(ret);
            })
            .fail(function(error) {
                var thriftError = thriftLog("XcalarGetRetina", error);
                Log.errorLog("Get Retinas", null, null, thriftError);
                deferred.reject(thriftError);
            });
            return deferred.promise();
        };
    }
}(jQuery));
