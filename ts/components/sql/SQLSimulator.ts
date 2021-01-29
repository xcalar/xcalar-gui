/**
 * This is a static class which simulates SQL execution to get xcalar query for
 * each operator
 */
class SQLSimulator {
    static start(): number {
        const txId = Transaction.start({
            "operation": "SQL Simulate",
            "simulate": true
        });
        return txId;
    }

    static end(txId: number): string {
        const query = Transaction.done(txId, {
            "noNotification": true,
            "noLog": true
        });
        return query;
    }

    static fail(txId: number): void {
        Transaction.fail(txId, {
            "noAlert": true,
            "noNotification": true
        });
    }

    static addSynthesize(
        xcQueryString: string,
        tableName: string,
        newCols: SQLColumn[],
        orderCols: SQLColumn[],
        needToDropCols: boolean
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const colNameSet = new Set();
        const colIdSet = new Set();
        const colInfos = [];
        let needRename = false;
        const txId = SQLSimulator.start();
        const allCols = [];
        orderCols = orderCols || [];
        for (let column of newCols) {
            colIdSet.add(column.colId);
            allCols.push(column);
        }
        for (let orderColumn of orderCols) {
            if (!colIdSet.has(orderColumn.colId)) {
                colIdSet.add(orderColumn.colId);
                allCols.push(orderColumn);
            }
        }
        for (let column of allCols) {
            const colName = column.rename || column.colName;
            let displayName = column.udfColName || column.colName;
            if (colNameSet.has(displayName)) {
                let k = 1;
                while (colNameSet.has(displayName + "_" + k)) {
                    k++;
                }
                displayName = displayName + "_" + k;
            }
            colNameSet.add(displayName);
            colInfos.push({
                orig: colName,
                new: displayName,
                type: xcHelper.convertColTypeToFieldType(xcHelper.convertSQLTypeToColType(column.colType))
            });
            if (colName !== displayName) {
                needRename = true;
                // this will change newCols & orderCols as well
                column.rename = displayName;
            }
        }
        if (needRename || needToDropCols) {
            XIApi.synthesize(txId, colInfos, tableName)
            .then((finalTable) => {
                const cli = SQLSimulator.end(txId);
                const synthesizeQuery = cli.endsWith(",") ? cli.slice(0, -1) : cli;
                xcQueryString = xcQueryString.slice(0, -1) + "," + synthesizeQuery + "]";
                deferred.resolve({
                    xcQueryString: xcQueryString,
                    newTableName: finalTable,
                    allColumns: newCols,
                    orderColumns: orderCols
                });
            })
            .fail((err) => {
                SQLSimulator.fail(txId);
                deferred.reject(err)
            });
        } else {
            SQLSimulator.end(txId);
            deferred.resolve({
                xcQueryString: xcQueryString,
                newTableName: tableName,
                allColumns: newCols,
                orderColumns: orderCols
            });
        }
        return deferred.promise();
    }

    static project(
        columns: SQLColumn[],
        tableName: string,
        newTableName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        const colNames = [];
        for (let col of columns) {
            colNames.push(col.rename || col.colName);
        }
        XIApi.project(txId, colNames, tableName, newTableName)
        .then((finalTable) => {
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": finalTable,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // dstAggName is optional and can be left blank (will autogenerate)
    static aggregate(
        aggOp: string,
        colName: string,
        tableName: string,
        dstAggName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName)
        .then((ret) => {
            const val  = ret.value;
            const finalDstDagName = ret.aggName;
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "val": val,
                "newTableName": finalDstDagName,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    static aggregateWithEvalStr(
        evalStr: string,
        tableName: string,
        dstAggName: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName)
        .then((ret) => {
            const val = ret.value;
            const finalDstDagName  = ret.aggName;
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "val": val,
                "newTableName": finalDstDagName,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    static sort(
        sortColsAndOrder: SQLSortStruct[],
        tableName: string,
        newTableName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();
        const sortColsAndOrderCopy = jQuery.extend(true, [], sortColsAndOrder);
        sortColsAndOrderCopy.forEach(function(col) {
            delete col.colId;
        })

        XIApi.sort(txId, sortColsAndOrderCopy, tableName, newTableName)
        .then((ret) => {
            const finalTable = ret.newTableName;
            let cli = SQLSimulator.end(txId);
            cli = cli.replace(/\\t/g, "\\\\t");
            deferred.resolve({
                "newTableName": finalTable,
                "cli": cli,
                "sortColName": sortColsAndOrderCopy[0].name,
                "order": sortColsAndOrderCopy[0].ordering
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    static map(
        mapStr: string[],
        tableName: string,
        newColName: string[],
        newTableName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.map(txId, mapStr, tableName, newColName, newTableName)
        .then((finalTable) => {
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": finalTable,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // newTableName is optional
    static filter(
        filterString: string,
        tableName: string,
        newTableName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.filter(txId, filterString, tableName, newTableName)
        .then((finalTable) => {
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": finalTable,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }
    /*
        lTableInfo/rTableInfo: object with the following attrs:
            columns: array of back colum names to join
            pulledColumns: columns to pulled out (front col name)
            tableName: table's name
            reaname: array of rename object

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
                    }]
                }

        options:
            newTableName: string, final table's name, optional
            clean: boolean, remove intermediate table if set true
            evalString: for crossJoins only. filter string after crossjoin
    */
    static join(
        joinType: JoinType,
        lTableInfo: JoinTableInfo,
        rTableInfo: JoinTableInfo,
        options: JoinOptions = <JoinOptions>{}
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
        .then((ret) => {
            const dstTable = ret.newTableName;
            const tempCols = ret.tempCols;
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": dstTable,
                "tempCols": tempCols,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

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
    static union(
        tableInfos: UnionTableInfo[],
        dedup: boolean = false,
        newTableName?: string,
        unionType?: UnionOperatorT
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.union(txId, tableInfos, dedup, newTableName, unionType)
        .then((ret) => {
            const dstTable = ret.newTableName;
            const dstCols = ret.newTableCols;
            const cli = SQLSimulator.end(txId);
            const newTableCols = dstCols.map((col) => {
                return ColManager.newPullCol(col.rename, null, col.type);
            });
            newTableCols.push(ColManager.newDATACol());
            deferred.resolve({
                "newTableName": dstTable,
                "newColumns": newTableCols,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /*
        * options:
        *  isIncSample: true/false, include sample or not,
        *               not specified is equal to false
        *  icvMode: true/false, icv mode or not
        *  newTableName: string, dst table name, optional
        *  clean: true/false, if set true, will remove intermediate tables
        */
    static groupBy(
        groupByCols: string[],
        gbArgs: AggColInfo[],
        tableName: string,
        options: GroupByOptions = <GroupByOptions>{}
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        options = options || {};
        options.icvMode = false;
        if (groupByCols.length === 0) {
            options.groupAll = true;
        }

        XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
        .then(function({finalTable, tempCols}) {
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": finalTable,
                "tempCols": tempCols,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    static genRowNum(
        tableName: string,
        newColName: string,
        newTableName?: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const txId = SQLSimulator.start();

        XIApi.genRowNum(txId, tableName, newColName, newTableName)
        .then(function(finalTable) {
            const cli = SQLSimulator.end(txId);
            deferred.resolve({
                "newTableName": finalTable,
                "cli": cli
            });
        })
        .fail((error) => {
            SQLSimulator.fail(txId);
            deferred.reject(error);
        });

        return deferred.promise();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLSimulator = SQLSimulator;
}