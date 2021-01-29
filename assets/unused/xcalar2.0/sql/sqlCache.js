(function() {
    var root = this;
    // This class is a singleton

    var queryCache = {};
    function SQLCache() {
        return this;
    }

    function cleanse(statement) {
        return statement.replace(/\s/g, " ")
                        .replace(/ +/g, " ")
                        .replace(/^ /, "")
                        .replace(/; *$/, "")
                        .replace(/ $/, "");
    }

    SQLCache.getCached = function(statement) {
        // Remove extraneous spaces and remove trailing ;
        var cleansed = cleanse(statement);
        if (cleansed in queryCache) {
            return queryCache[cleansed];
        }
        return undefined;
    };

    SQLCache.deleteCached = function(statement) {
        var cleansed = cleanse(statement);
        if (cleansed in queryCache) {
            delete queryCache[cleansed];
        }
    };

    SQLCache.isCached = function(statement) {
        var cleansed = cleanse(statement);
        if (cleansed in queryCache) {
            return true;
        }
        return false;
    };

    // cacheObj contains: plan, starting tables, number of original operations
    SQLCache.cacheQuery = function(statement, cacheObj) {
        var cleansed = cleanse(statement);
        queryCache[cleansed] = cacheObj;
    };

    function getNewTableName(oldName) {
        return xcHelper.getTableName(oldName) + Authentication.getHashId();
    }

    SQLCache.setNewTableNames = function(plan, startingTables, finalTable) {
        // Since the plans are cached with the old table names, we need to
        // make sure that new table names are used instead of the old ones.
        var newTableNameLookup = {};
        var newFinalTable;
        for (var i = 0; i < plan.length; i++) {
            var operation = plan[i];
            var source = operation.args.source;
            var dest = operation.args.dest;
            if (typeof(source) === "string") {
                source = [source];
            }
            var newName;
            for (var j = 0; j < source.length; j++) {
                if (source[j] in startingTables) {
                    continue;
                }
                if (!(source[j] in newTableNameLookup)) {
                    newName = getNewTableName(source[j]);
                    newTableNameLookup[source[j]] = newName;
                }
                if (source.length === 1) {
                    operation.args.source = newTableNameLookup[source[j]];
                } else {
                    operation.args.source[j] = newTableNameLookup[source[j]];
                }
            }
            if (!(dest in startingTables)) {
                if (!(dest in newTableNameLookup)) {
                    newName = getNewTableName(dest);
                    newTableNameLookup[dest] = newName;
                }
                if (operation.args.dest === finalTable) {
                    newFinalTable = newName;
                }
                operation.args.dest = newName;
            }
        }
        return newFinalTable;
    };

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = SQLCache;
        }
        exports.SQLCache = SQLCache;
    } else {
        root.SQLCache = SQLCache;
    }
}());