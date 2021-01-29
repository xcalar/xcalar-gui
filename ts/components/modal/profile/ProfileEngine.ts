class ProfileEngine {
    private _statsColName: string;
    private _bucketColName: string;

    private _sortMap: {[key: string]: string};
    private _statsKeyMap: {[key: string]: string};

    private _profileResultSetId: string;
    private _totalRows: number;
    private _isBarChart: boolean;

    private readonly aggMap = {
        "min": AggrOp.Min,
        "average": AggrOp.Avg,
        "max": AggrOp.Max,
        "count": AggrOp.Count,
        "sum": AggrOp.Sum,
        "sd": "sd"
    };

    public constructor(options) {
        options = options || {};
        this._profileResultSetId = null;
        this._totalRows = null;
        this._sortMap = options.sortMap;
        this._statsKeyMap = options.statsKeyMap;
        this._statsColName = options.statsColName;
        this._bucketColName = options.bucketColName;
        this._isBarChart = options.isBarChart;
    }

    public genBarChartInfo(
        profileInfo: ProfileInfo,
        table: TableMeta
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        profileInfo.groupByInfo.isComplete = "running";
        profileInfo.groupByInfo.nullCount = 0;
        profileInfo.addBucket(0, {
            "max": 1000,
            "sum": 0,
            "table": table.getName(),
            "colName": profileInfo.colName,
            "bucketSize": 0
        });

        profileInfo.groupByInfo.isComplete = true;
        deferred.resolve();

        return deferred.promise();
    }

    /**
     *
     * @param profileInfo
     * @param table
     */
    public genProfile(
        profileInfo: ProfileInfo,
        table: TableMeta
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        let finalTable: string;
        let tableName: string = table.getName();
        let colName: string = profileInfo.colName;
        let tablesToDelete = {};

        profileInfo.groupByInfo.isComplete = "running";

        let sql = {
            "operation": SQLOps.Profile,
            "tableName": table.getName(),
            "tableId": table.getId(),
            "colName": colName,
            "id": profileInfo.getId()
        };

        let txId = Transaction.start({
            "msg": StatusMessageTStr.Profile + " " +
                   xcStringHelper.escapeHTMLSpecialChar(colName),
            "operation": SQLOps.Profile,
            "sql": sql,
            "track": true
        });

        // filter out fnf
        let fltStr = "exists(" + colName + ")";
        let srcTable: string;
        XIApi.filter(txId, fltStr, tableName)
        .then((tableAfterFilter) => {
            srcTable = tableAfterFilter;
            tablesToDelete[tableAfterFilter] = true;
            return XIApi.index(txId, [colName], tableAfterFilter);
        })
        .then((ret) => {
            const indexedTableName = ret.newTableName;
            const isCache = ret.isCache;
            if (!isCache) {
                tablesToDelete[indexedTableName] = true;
            }
            return this._getNumRows(indexedTableName);
        })
        .then((val: number) => {
            // the table.resultSetCount should eqaul to the
            // totalCount after right index, if not, a way to resolve
            // is to get resulSetCount from the right src table
            let nullCount: number = table.resultSetCount - val;
            let allNull: boolean = (val === 0);

            profileInfo.groupByInfo.nullCount = nullCount;
            if (allNull) {
                profileInfo.groupByInfo.allNull = true;
            }
            let aggArgs = {
                operator: AggrOp.Count,
                aggColName: colName,
                newColName: this._statsColName
            };
            let options = {
                newTableName: this._getNewName(srcTable, ".profile.GB", true),
                clean: true
            };
            return XIApi.groupBy(txId, [aggArgs], [colName], srcTable, options);
        })
        .then((ret) => {
            const groupbyTable = ret.finalTable;
            const newKeyFieldName = ret.newKeyFieldName;
            if (profileInfo.groupByInfo.allNull) {
                finalTable = groupbyTable;
                return PromiseHelper.resolve({maxVal: 0, sumVal: 0});
            }

            finalTable = this._getNewName(tableName, ".profile.final", true);
            colName = newKeyFieldName;

            return this._sortGroupby(txId, colName, groupbyTable, finalTable);
        })
        .then((ret: {maxVal:number, sumVal: number}) => {
            const {maxVal, sumVal} = ret;
            profileInfo.addBucket(0, {
                "max": maxVal,
                "sum": sumVal,
                "table": finalTable,
                "colName": colName,
                "bucketSize": 0
            });

            profileInfo.groupByInfo.isComplete = true;
            for (let tableToDelete in tablesToDelete) {
                // delete temp tables
                XIApi.deleteTable(txId, tableToDelete, true);
            }

            Transaction.done(txId, {
                "noNotification": true
            });
            deferred.resolve();
        })
        .fail((error) => {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     *
     * @param tableName
     */
    public checkProfileTable(tableName: string): XDPromise<boolean> {
        let deferred: XDDeferred<boolean> = PromiseHelper.deferred();

        XcalarGetTables(tableName)
        .then((res) => {
            let exist: boolean = (res != null && res.numNodes !== 0);
            deferred.resolve(exist);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     *
     * @param tableName
     * @param rowsToFetch
     */
    public setProfileTable(
        tableName: string,
        rowsToFetch: number
    ): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();

        this.clear()
        .then(() => {
            return XcalarMakeResultSetFromTable(tableName);
        })
        .then((resultSet) => {
            this._setProfileTable(resultSet);
            return this.fetchProfileData(0, rowsToFetch);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     *
     * @param rowPosition
     * @param rowsToFetch
     */
    public fetchProfileData(
        rowPosition: number,
        rowsToFetch: number
    ): XDPromise<any[]> {
        let totalRowNum: number = this._totalRows;
        let profileData = [];

        if (totalRowNum == null || totalRowNum === 0) {
            return PromiseHelper.resolve(profileData);
        }

        let deferred: XDDeferred<any[]> = PromiseHelper.deferred();
        let resultSetId = this._profileResultSetId;

        XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRowNum, [], 0, 0)
        .then((data) => {
            let numRows: number = Math.min(rowsToFetch, data.length);
            let failed: boolean = false;
            let errStr: string = "";

            for (let i = 0; i < numRows; i++) {
                try {
                    let value = JSON.parse(data[i]);
                    if (this._isBarChart) {
                        value.rowNum = "row " + (rowPosition + 1 + i);
                    } else {
                        value.rowNum = rowPosition + 1 + i;
                    }

                    profileData.push(value);
                } catch (error) {
                    console.error(error, data[i]);
                    failed = true;
                    errStr = error.message;
                }
                if (failed) {
                    deferred.reject(errStr);
                    return;
                }
            }

            deferred.resolve(profileData);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     *
     */
    public getTableRowNum(): number {
        return this._totalRows;
    }

    /**
     *
     * @param order
     * @param bucketNum
     * @param profileInfo
     */
    public sort(
        order: string,
        bucketNum: number,
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        profileInfo.groupByInfo.isComplete = "running";

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let sql = {
            "operation": SQLOps.ProfileSort,
            "order": order,
            "colName": profileInfo.colName,
            "bucketSize": bucketNum,
            "id": profileInfo.getId()
        };
        let txId = Transaction.start({
            "operation": SQLOps.ProfileSort,
            "sql": sql,
            "track": true
        });

        this._runSort(txId, order, bucketNum, profileInfo)
        .then(() => {
            profileInfo.groupByInfo.isComplete = true;
            Transaction.done(txId, {});
            deferred.resolve();
        })
        .fail((error) => {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public bucket(
        bucketNum: number,
        tableName: string,
        profileInfo: ProfileInfo,
        fitAll: boolean
    ): XDPromise<number> {
        profileInfo.groupByInfo.isComplete = "running";

        let deferred: XDDeferred<number> = PromiseHelper.deferred();
        let sql = {
            "operation": SQLOps.ProfileBucketing,
            "tableName": tableName,
            "colName": profileInfo.colName,
            "id": profileInfo.getId()
        };
        let txId = Transaction.start({
            "operation": SQLOps.ProfileBucketing,
            "sql": sql,
            "track": true
        });

        let bucketSizeDef: XDPromise<number> = fitAll ?
        this._getFitAllBucketSize(txId, tableName, profileInfo) :
        PromiseHelper.resolve(bucketNum);

        bucketSizeDef
        .then((bucketSize) => {
            bucketNum = bucketSize;
            if (!this._isValidBucketSize(bucketNum)) {
                return PromiseHelper.reject(ProfileTStr.InvalidBucket);
            }
            return this._runBucketing(txId, bucketNum, profileInfo);
        })
        .then(() => {
            sql["bucketSize"] = bucketNum;
            profileInfo.groupByInfo.isComplete = true;

            Transaction.done(txId, {"sql": sql});
            deferred.resolve(bucketNum);
        })
        .fail((error) => {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });

            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     *
     * @param tableName
     * @param profileInfo
     */
    public genAggs(
        tableName: string,
        aggKeys: string[],
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let sql = {
            "operation": SQLOps.ProfileAgg,
            "tableName": tableName,
            "colName": profileInfo.colName,
            "id": profileInfo.getId()
        };

        let txId = Transaction.start({
            "operation": SQLOps.ProfileAgg,
            "sql": sql,
            "track": true,
            "steps": ((aggKeys.length - 1) * 2)
        });

        let promises: XDPromise<void>[] = aggKeys.map((aggkey) => {
            return this._runAgg(txId, aggkey, tableName, profileInfo);
        });

        PromiseHelper.when(...promises)
        .always(() => {
            Transaction.done(txId, {});
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     *
     * @param tableName
     * @param profileInfo
     * @param sort
     */
    public genStats(
        tableName: string,
        profileInfo: ProfileInfo,
        sort: boolean
    ): XDPromise<void> {
        if (!sort) {
            return this._runStats(tableName, profileInfo);
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let colName: string = profileInfo.colName;
        let sortTable: string = null;
        let sql = {
            "operation": SQLOps.ProfileStats,
            "tableName": tableName,
            "colName": colName,
            "id": profileInfo.getId()
        };
        let txId = Transaction.start({
            "operation": SQLOps.ProfileStats,
            "sql": sql,
            "steps": 1,
            "track": true
        });

        XIApi.sortAscending(txId, [colName], tableName)
        .then((ret) => {
            const tableAfterSort = ret.newTableName;
            const newKeys = ret.newKeys;
            sortTable = tableAfterSort;
            profileInfo.statsInfo.unsorted = false;
            profileInfo.statsInfo.key = newKeys[0];
            return this._runStats(sortTable, profileInfo);
        })
        .then(() => {
            Transaction.done(txId, {});
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        })
        .always(() => {
            if (sortTable != null) {
                XIApi.deleteTable(txId, sortTable, true);
            }
        });

        return deferred.promise();
    }

    /**
     *
     */
    public clear(): XDPromise<void> {
        let resultSetId = this._profileResultSetId;
        this._resetProfileTable();

        if (resultSetId == null) {
            return PromiseHelper.resolve();
        } else {
            let promise = XcalarSetFree(resultSetId);
            return PromiseHelper.alwaysResolve(promise);
        }
    }

    private _setProfileTable(
        resultSet: {resultSetId: string, numEntries: number}
    ): void {
        this._profileResultSetId = resultSet.resultSetId;

        // this._profileResultSetId = gTables[xcHelper.getTableId(this._baseTableName)].resultSetId;
        this._totalRows = resultSet.numEntries;
    }

    private _resetProfileTable(): void {
        this._profileResultSetId = null;
        this._totalRows = 0;
    }

    private _getNewName(oldName: string, affix: string, rand: boolean): string {
        let name: string = xcHelper.getTableName(oldName);
        name = name + affix;

        if (rand) {
            name = xcHelper.randName(name);
        }

        name += Authentication.getHashId();

        return name;
    }

    private _sortGroupby(
        txId: number,
        sortCol: string,
        srcTable: string,
        finalTable: string
    ): XDPromise<{maxVal:number, sumVal: number}> {
        let deferred: XDDeferred<{maxVal:number, sumVal: number}> = PromiseHelper.deferred();
        XIApi.sortAscending(txId, [sortCol], srcTable, finalTable)
        .then(() => {
            // return PromiseHelper.resolve({
            //     maxVal: 5,
            //     sumVal: 5
            // });
            return this._aggInGroupby(txId, this._statsColName, finalTable);
            // return this._aggInGroupby(txId, sortCol, finalTable);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _aggInGroupby(
        txId: number,
        colName: string,
        tableName: string
    ): XDPromise<{maxVal: number, sumVal: number}> {
        let deferred: XDDeferred<{maxVal:number, sumVal: number}> = PromiseHelper.deferred();
        let aggMap = this.aggMap;
        let def1 = this._getAggResult(txId, aggMap.max, colName, tableName);
        let def2 = this._getAggResult(txId, aggMap.sum, colName, tableName);

        PromiseHelper.when(def1, def2)
        .then((ret) => {
            const ret1 = ret[0];
            const ret2 = ret[1];
            let maxVal: number = ret1.value;
            let sumVal: number = ret2.value;
            deferred.resolve({maxVal: maxVal, sumVal: sumVal});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getAggResult(
        txId: number,
        aggOp: string,
        colName: string,
        tableName: string
    ): XDPromise<{value: string | number, aggName: string, toDelete: boolean}> {
        if (aggOp === "sd") {
            // standard deviation
            var evalStr = "sqrt(div(sum(pow(sub(" + colName + ", avg(" +
                          colName + ")), 2)), count(" + colName + ")))";
            return XIApi.aggregateWithEvalStr(txId, evalStr, tableName);
        } else {
            return XIApi.aggregate(txId, aggOp, colName, tableName);
        }
    }

    private _runAgg(
        txId: number,
        aggkey: string,
        tableName: string,
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        // pass in statsCol beacuse close modal may clear the global statsCol
        if (profileInfo.aggInfo[aggkey] != null) {
            // when already have cached agg info
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let fieldName: string = profileInfo.colName;
        let aggrOp: string = this.aggMap[aggkey];
        let res: string | number;

        this._getAggResult(txId, aggrOp, fieldName, tableName)
        .then((val) => {
            res = val.value;
        })
        .fail((error) => {
            res = "--";
            console.error(error);
        })
        .always(() => {
            profileInfo.aggInfo[aggkey] = res;
            Profile.refreshAgg(profileInfo, aggkey);
            deferred.resolve();
        });

        return deferred.promise();
    }

    private _runStats(
        tableName: string,
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        let hasStatsInfo: boolean = true;
        let statsKeys = this._statsKeyMap;
        if (!profileInfo.statsInfo.unsorted) {
            for (let key in statsKeys) {
                let stats: string = statsKeys[key];
                if (profileInfo.statsInfo[stats] === '--') {
                    // when it's caused by fetch error
                    profileInfo.statsInfo[stats] = null;
                }

                if (profileInfo.statsInfo[stats] == null) {
                    hasStatsInfo = false;
                    break;
                }
            }
        }

        if (hasStatsInfo) {
            return PromiseHelper.resolve();
        }
        if (this._isBarChart) {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._checkOrder(tableName)
        .then((ret) => {
            const {tableOrder, tableKeys} = ret;
            return this._getStats(tableName, tableOrder, tableKeys, profileInfo);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _checkOrder(tableName: string): XDPromise<{tableOrder: number, tableKeys: any}> {
        let tableId: TableId = xcHelper.getTableId(tableName);
        let table: TableMeta = gTables[tableId];
        if (table != null) {
            let keys = table.getKeys();
            let order = table.getOrdering();
            if (keys != null && XcalarOrderingTStr.hasOwnProperty(order)) {
                return PromiseHelper.resolve({tableOrder: order, tableKeys: keys});
            }
        }
        return XIApi.checkOrder(tableName);
    }

    private _getStats(
        tableName: string,
        tableOrder: number,
        tableKeys: {name: string}[],
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        if (tableOrder === XcalarOrderingT.XcalarOrderingUnordered ||
            tableKeys.length < 1 ||
            tableKeys[0].name !== profileInfo.statsInfo.key &&
            tableKeys[0].name !== profileInfo.colName
        ) {
            // when table is unsorted
            profileInfo.statsInfo.unsorted = true;
            return PromiseHelper.resolve();
        } else if (tableKeys.length === 1 &&
                profileInfo.statsInfo.key == null &&
                tableKeys[0].name === profileInfo.colName
        ) {
            profileInfo.statsInfo.key = profileInfo.colName;
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let statsKeys = this._statsKeyMap;
        let zeroKey = statsKeys.zeroQuartile;
        let lowerKey = statsKeys.lowerQuartile;
        let medianKey = statsKeys.median;
        let upperKey = statsKeys.upperQuartile;
        let fullKey = statsKeys.fullQuartile;


        let tableResultsetId: string;
        XcalarMakeResultSetFromTable(tableName)
        .then((res) => {
            tableResultsetId = res.resultSetId;
            let defs = [];
            let numEntries: number = res.numEntries;
            let lowerRowEnd: number;
            let upperRowStart: number;

            if (numEntries % 2 !== 0) {
                // odd rows or not number
                lowerRowEnd = (numEntries + 1) / 2;
                upperRowStart = lowerRowEnd;
            } else {
                // even rows
                lowerRowEnd = numEntries / 2;
                upperRowStart = lowerRowEnd + 1;
            }

            defs.push(this._getMedian.bind(this, tableResultsetId, tableKeys,
            1, 1, zeroKey, profileInfo));
            defs.push(this._getMedian.bind(this, tableResultsetId, tableKeys,
            1, numEntries, medianKey, profileInfo));
            defs.push(this._getMedian.bind(this, tableResultsetId, tableKeys,
            1, lowerRowEnd, lowerKey, profileInfo));
            defs.push(this._getMedian.bind(this, tableResultsetId, tableKeys,
            upperRowStart, numEntries, upperKey, profileInfo));
            defs.push(this._getMedian.bind(this, tableResultsetId, tableKeys,
            numEntries, numEntries, fullKey, profileInfo));
            return PromiseHelper.chain(defs);
        })
        .then(() => {
            XcalarSetFree(tableResultsetId);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getMedian(
        tableResultsetId: string,
        tableKeys: {name: string}[],
        startRow: number,
        endRow: number,
        statsKey: string,
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let isNum: boolean = (profileInfo.type === ColumnType.integer ||
            profileInfo.type === ColumnType.float);
        let numRows: number = endRow - startRow + 1;
        let rowNum: number;
        let rowsToFetch: number;

        if (!isNum) {
            rowsToFetch = 1;
            rowNum = (numRows % 2 === 0) ? startRow + numRows / 2 - 1 :
            startRow + (numRows + 1) / 2 - 1;
        } else if (numRows % 2 !== 0) {
            // odd rows or not number
            rowNum = startRow + (numRows + 1) / 2 - 1;
            rowsToFetch = 1;
        } else {
            // even rows
            rowNum = startRow + numRows / 2 - 1;
            rowsToFetch = 2;
        }

        // row position start with 0
        let rowPosition: number = rowNum - 1;
        XcalarFetchData(tableResultsetId, rowPosition, rowsToFetch, endRow, [], 0, 0)
        .then((data) => {
            let tableKey: string = tableKeys[0].name;
            let numRows: number = data.length;
            if (numRows === rowsToFetch) {
                if (isNum) {
                    let sum: number = 0;
                    for (let i = 0; i < rowsToFetch; i++) {
                        try {
                            let row: number = JSON.parse(data[i]);
                            sum += Number(row[tableKey]);
                        } catch (e) {
                            console.error(e);
                            profileInfo.statsInfo[statsKey] = '--';
                        }
                    }

                    if (isNaN(rowsToFetch)) {
                        // handle case
                        console.warn("Invalid median");
                        profileInfo.statsInfo[statsKey] = '--';
                    } else {
                        let median: number = sum / rowsToFetch;
                        profileInfo.statsInfo[statsKey] = median;
                    }
                } else {
                    try {
                        profileInfo.statsInfo[statsKey] = JSON.parse(data[0])[tableKey];
                    } catch (e) {
                        console.error(e);
                        profileInfo.statsInfo[statsKey] = '--';
                    }
                }
            } else {
                // when the data not return correctly, don't recursive try.
                console.warn("Not fetch correct rows");
                profileInfo.statsInfo[statsKey] = '--';
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error("Run stats failed", error);
            profileInfo.statsInfo[statsKey] = '--';
            deferred.resolve();
        });

        return deferred.promise();
    }

    private _runSort(
        txId: number,
        order: string,
        bucketNum: number,
        profileInfo: ProfileInfo
    ): XDPromise<void> {
        if (order === this._sortMap.origin) {
            // already have this table
            return PromiseHelper.resolve();
        }

        let bucketInfo = profileInfo.groupByInfo.buckets[bucketNum];
        let tableKey: string | null = this._getSortKey(order);

        if (tableKey == null) {
            return PromiseHelper.reject("error case");
        } else if (bucketInfo[tableKey] != null) {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        let tableName: string = bucketInfo.table;
        let newTableName: string = this._getNewName(tableName, "." + order, false);
        let xcOrder = this._getXcOrder(order);

        let colName: string;
        if (order === this._sortMap.ztoa) {
            colName = bucketInfo.colName;
        } else {
            colName = (bucketNum === 0) ? this._statsColName : this._bucketColName;
        }
        let keyInfos = [{
            name: colName,
            ordering: xcOrder
        }];
        XIApi.sort(txId, keyInfos, tableName, newTableName)
        .then(() => {
            bucketInfo[tableKey] = newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getSortKey(sortOrder: string): string | null {
        let sortMap = this._sortMap;
        switch (sortOrder) {
            case sortMap.asc:
                return "ascTable";
            case sortMap.desc:
                return "descTable";
            case sortMap.ztoa:
                return "ztoaTable";
            default:
                return null;
        }
    }

    private _getXcOrder(sortOrder: string): XcalarOrderingT {
        if (sortOrder === this._sortMap.desc ||
            sortOrder === this._sortMap.ztoa
        ) {
            return XcalarOrderingT.XcalarOrderingDescending;
        } else {
            return XcalarOrderingT.XcalarOrderingAscending;
        }
    }

    private _getFitAllBucketSize(
        txId: number,
        tableName: string,
        profileInfo: ProfileInfo
    ): XDPromise<number> {
        let deferred: XDDeferred<number> = PromiseHelper.deferred();
        let numRowsToFetch: number = Profile.getNumRowsToFetch();
        let maxAgg = this._runAgg(txId, "max", tableName, profileInfo);
        let minAgg = this._runAgg(txId, "min", tableName, profileInfo);
        PromiseHelper.when(maxAgg, minAgg)
        .then(() => {
            let max: number = <number>profileInfo.aggInfo.max;
            let min: number = <number>profileInfo.aggInfo.min;
            let bucketSize: number = this._calcFitAllBucketSize(numRowsToFetch, max, min);
            deferred.resolve(bucketSize);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _calcFitAllBucketSize(
        numRowsToFetch: number,
        max: number,
        min: number
    ): number {
        // if max = 100, min = 0, numRowsToFetch = 20,
        // (max - min) / numRowsToFetch will get bucketSize 5
        // but range [100, 105) is the 21th size,
        // so we should do (max + min + numRowsToFetch) / numRowsToFetch
        let bucketSize: number = (max - min + numRowsToFetch) / numRowsToFetch;
        if (bucketSize >= 1) {
            bucketSize = xcHelper.roundToSignificantFigure(bucketSize, numRowsToFetch, max, min);
        } else if (bucketSize >= 0.01) {
            // have mostly two digits after decimal
            bucketSize = Math.round(bucketSize * 100) / 100;
        }
        return bucketSize;
    }

    private _isValidBucketSize(bucketSize: any): boolean {
        if (isNaN(bucketSize)) {
            return false;
        } else {
            return true;
        }
    }

    private _getNumRows(tableName: string): XDPromise<number> {
        let tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] &&
            gTables[tableId].resultSetCount > -1) {
            return PromiseHelper.resolve(gTables[tableId].resultSetCount);
        }
        return XIApi.getNumRows(tableName);
    }

    /*
    import math

    def logBuckets(n):
        if n >= 0 and n < 1:
            return 0
        elif n < 0 and n >= -1:
            return -1
        elif n < 0:
            res = math.ceil(math.log(abs(n), 10)) + 1
            return -1 * int(res)
        else:
            # to fix the inaccuracy of decimal, example, log(1000, 10) = 2.9999999999999996
            res = math.floor(math.log(n, 10) + 0.0000000001) + 1
            return int(res)
    */

    private _runBucketing(
        txId: number,
        bucketNum: number,
        profileInfo: ProfileInfo,
        retry: boolean = false
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        var buckets = profileInfo.groupByInfo.buckets;
        var curBucket = buckets[bucketNum];

        if (!retry && curBucket != null && curBucket.table != null) {
            this.checkProfileTable(curBucket.table)
            .then((exist) => {
                if (!exist) {
                    curBucket.table = null;
                    return this._runBucketing(txId, bucketNum, profileInfo, true);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }

        // bucket based on original groupby table
        let tableName = buckets[0].table;
        let mapTable = this._getNewName(tableName, ".bucket", false);

        let colName: string = xcHelper.stripColName(profileInfo.colName);
        colName = xcHelper.parsePrefixColName(colName).name;
        let mapCol: string = xcHelper.randName("bucketMap", 4);

        // example map(mult(floor(div(review_count, 10)), 10))
        let mapString: string;
        let step: number;
        if (bucketNum >= 0) {
            mapString = colName;
            step = bucketNum;
        } else {
            mapString = "int(default:logBuckets(" + colName + "))";
            step = -1 * bucketNum;
        }
        mapString = "mult(floor(div(" + mapString + ", " + step +
                        ")), " + step + ")";

        let finalTable: string;

        XIApi.map(txId, [mapString], tableName, [mapCol], mapTable)
        .then(() => {
            let groupbyTable = this._getNewName(mapTable, ".groupby", true);
            let aggArg = {
                operator: AggrOp.Sum,
                aggColName: this._statsColName,
                newColName: this._bucketColName
            };
            let options = {
                newTableName: groupbyTable,
                clean: true
            };
            return XIApi.groupBy(txId, [aggArg], [mapCol], mapTable, options)
        })
        .then((ret) => {
            const tableAfterGroupby = ret.finalTable;
            let newTableName = this._getNewName(mapTable, ".final", true);
            return XIApi.sortAscending(txId, [mapCol], tableAfterGroupby, newTableName);
        })
        .then((ret) => {
            const tableAfterSort = ret.newTableName;
            finalTable = tableAfterSort;
            return this._aggInGroupby(txId, this._bucketColName, finalTable);
        })
        .then((ret) => {
            const {maxVal, sumVal} = ret;
            profileInfo.addBucket(bucketNum, {
                "max": maxVal,
                "sum": sumVal,
                "table": finalTable,
                "colName": mapCol,
                "bucketSize": bucketNum
            });
            // delete intermediate table
            // Note that grouby table can not delete because when
            // sort bucket table it looks for the unsorted table,
            // which is this one
            return PromiseHelper.alwaysResolve(XIApi.deleteTable(txId, mapTable));
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}