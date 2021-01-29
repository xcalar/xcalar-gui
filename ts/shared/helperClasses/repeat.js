window.Repeat = (function($, Repeat) {
    var repeatFuncs = {};
    var tableOperations = [SQLOps.DeleteTable, SQLOps.SortTableCols,
                           SQLOps.ResizeTableCols];

    Repeat.run = function(xcLog) {
        return PromiseHelper.reject("repeat temporarily disabled");
        xcAssert((xcLog != null), "invalid log");

        var deferred = PromiseHelper.deferred();

        var options = xcLog.getOptions();
        var operation = xcLog.getOperation();
        var colNums = [];
        var tableId;

        if (repeatFuncs.hasOwnProperty(operation)) {
            var minModeCache = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;

            repeatFuncs[operation](options, colNums, tableId)
            .then(function(){
                deferred.resolve();
            })
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("repeat failed");
            })
            .always(function() {
                gMinModeOn = minModeCache;
            });
        } else {
            console.warn("Unknown operation cannot repeat", operation);
            deferred.reject("Unknown operation");
        }

        return (deferred.promise());
    };

    Repeat.isValidOperation = function(opName) {
        return opName in repeatFuncs;
    };

    /* START BACKEND OPERATIONS */
    repeatFuncs[SQLOps.Sort] = function(options, colNums, tableId) {
        var validTypes = [ColumnType.boolean, ColumnType.float,
                          ColumnType.integer, ColumnType.number,
                          ColumnType.string, ColumnType.timestamp, ColumnType.money];
        var order = options.orders[0];
        for (var i = 0; i < colNums.length; i++) {
            var progCol = gTables[tableId].getCol(colNums[i]);
            var type = progCol.getType();
            if (validTypes.indexOf(type) === -1) {
                return PromiseHelper.resolve(null);
            }
            if (options.orders[i] !== order) {
                // only allow repeating of 1 order, not mixed orders
                return PromiseHelper.resolve(null);
            }
        }
        // XXX return if columns have different orders
        return ColManager.sortColumn(colNums, tableId, order);
    };
    /* END BACKEND OPERATIONS */

    /* USER STYLING/FORMATING OPERATIONS */

    repeatFuncs[SQLOps.MinimizeCols] = function(options, colNums, tableId) {
        return ColManager.minimizeCols(colNums, tableId);
    };

    repeatFuncs[SQLOps.MaximizeCols] = function(options, colNums, tableId) {
        return ColManager.maximizeCols(colNums, tableId);
    };

    repeatFuncs[SQLOps.HideCol] = function(options, colNums, tableId) {
        return (ColManager.hideCol(colNums, tableId));
    };

    repeatFuncs[SQLOps.TextAlign] = function(options, colNums, tableId) {
        ColManager.textAlign(colNums, tableId, options.cachedAlignment);
        return PromiseHelper.resolve(null);
    };

    repeatFuncs[SQLOps.ChangeFormat] = function(options, colNums, tableId) {
        ColManager.format(colNums, tableId, options.formats);
        return PromiseHelper.resolve(null);
    };

    /* END USER STYLING/FORMATING OPERATIONS */

    /* Table Operations */
    repeatFuncs[SQLOps.DeleteTable] = function (options, colNums, tableId) {
        var deferred = PromiseHelper.deferred();
        var table = gTables[tableId];
        var tableName = table.tableName;

        var msg = xcStringHelper.replaceMsg(ResultSetTStr.DelMsgReplace, {"name": tableName});
        Alert.show({
            "title": ResultSetTStr.Del,
            "msg": msg,
            "onConfirm": function() {
                TblManager.deleteTables(tableId, TableType.Active)
                .then(function() {
                    MemoryAlert.Instance.check(true);
                })
                .always(function() {
                    deferred.resolve(null);
                });
            },
            "onCancel": function() {
                deferred.resolve(null);
            }
        });
        return deferred.promise();
    };

    repeatFuncs[SQLOps.SortTableCols] = function(options, colNums, tableId) {
        TblManager.sortColumns(tableId, options.sortKey, options.direction);
        return PromiseHelper.resolve(null);
    };

    repeatFuncs[SQLOps.ResizeTableCols] = function(options, colNums, tableId) {
        if (!colNums.length) {
            if (!options.allCols) {
                return PromiseHelper.resolve(null);
            }
            colNums = undefined;
        }
        TblManager.resizeColumns(tableId, options.sizeTo, colNums);
        return PromiseHelper.resolve(null);
    };
    // /* End of Table Operations */
    return (Repeat);
}(jQuery, {}));
