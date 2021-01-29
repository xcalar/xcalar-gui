class TblManager {

    public static maxEntriesPerPage = 60;
    private static minRowsPerScreen = 60;
    public static firstRowPositionTop = 60;
    /**
     * TblManager.refreshTable
     * @param newTableNames
     * @param tableCols
     * @param oldTableNames
     * @param worksheet
     * @param txId
     */
    public static refreshTable(
        newTableNames: string[],
        tableCols: ProgCol[] | null,
        oldTableNames: string[] | string,
        txId?: number,
        isSqlTable?: boolean
    ): XDPromise<XcViewer> {
        if (txId != null) {
            if (Transaction.checkCanceled(txId)) {
                return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
            } else {
                // we cannot allow transactions to be canceled if
                // we're about to add a table to the worksheet
                Transaction.disableCancel(txId);
            }
        }

        if (typeof oldTableNames === "string") {
            oldTableNames = [oldTableNames];
        } else {
            oldTableNames = oldTableNames || [];
        }

        // must get worksheet to add before async call,
        // otherwise newTable may add to wrong worksheet
        const newTableName: string = newTableNames[0];
        const newTableId: TableId = xcHelper.getTableId(newTableName);
        const tablesToRemove: TableId[] = [];
        const tablesToReplace: string[] = [];
        if (oldTableNames.length > 0) {
            // figure out which old table we will replace
            TblManager._setTablesToReplace(oldTableNames, tablesToReplace, tablesToRemove);
        }

        // lock tables in case not locked during an undo/redo
        const tableLockStatuses: boolean[] = [];
        tablesToRemove.forEach((tableId) => {
            const isLocked: boolean = gTables[tableId].hasLock();
            tableLockStatuses.push(isLocked);
            if (!isLocked) {
                TblFunc.lockTable(tableId);
            }
        });

        TblManager._setTableMeta(newTableName, tableCols);
        if (isSqlTable) {
            const sqlTable = SQLResultSpace.Instance.getSQLTable();
            return sqlTable ? sqlTable.replaceTable(gTables[newTableId]) : PromiseHelper.resolve();
        } else {
            return DagTable.Instance.replaceTable(gTables[newTableId]);
        }
    }

    /**
     * TblManager.parseTableId
     * looks for xcTable-AB12 or $('#xcTable-AB12'),
     * or $('#xcTable-AB12').get(0) and returns AB12
     * @param idOrEl
     */
    public static parseTableId(
        idOrEl: string | JQuery | HTMLElement
    ): number | string | null {
        // can pass in a string or jQuery element or HTMLElement
        let id;
        if (idOrEl instanceof jQuery) {
            const $ele: JQuery = <JQuery>idOrEl;
            id = $ele.attr('id');
        } else if (typeof (idOrEl) === 'object') {
            id = $(idOrEl).attr('id');
        } else {
            id = idOrEl;
        }

        if (id == null) {
            console.error("cannot find the id");
            return null;
        }

        const idSplit = id.split('-');
        if (idSplit.length < 2) {
            console.error('Unexpected id/ele to parse', id, idOrEl);
            return null;
        }
        if (idSplit.length > 2) {
            idSplit[1] =  id.substring(id.indexOf('-') + 1 );
        }

        id = idSplit[1];
        if (isNaN(id)) {
            return id;
        } else {
            return parseInt(id);
        }

    }

    /**
     * TblManager.getBackTableSet
     */
    public static getBackTableSet(): XDPromise<any> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();

        XcalarGetTables()
        .then((backEndTables) => {
            const backTables: object = backEndTables.nodeInfo;
            const numBackTables: number = backEndTables.numNodes;
            const backTableSet: object = {};

            for (let i = 0; i < numBackTables; i++) {
                // record the table
                backTableSet[backTables[i].name] = true;
            }

            if (numBackTables === 0) {
                gDroppedTables = {}; // no need to keep meta when no tables
            }
            deferred.resolve(backTableSet);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _setTableMeta(tableName: string, tableCols: ProgCol[] | null): void {
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (!gTables.hasOwnProperty(tableId)) {
            if (tableCols == null || tableCols.length === 0) {
                 // at last have data col
                tableCols = [ColManager.newDATACol()];
            }

            // tableCols get deep copied in TableMeta constructor
            let table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "tableCols": tableCols,
                "status": TableType.Orphan
            });
            table.addAllCols(table.tableCols); // restore the colTypeCache
            gTables[tableId] = table;
        }
    }

    private static _setTablesToReplace(
        oldTableNames: string[],
        tablesToReplace: string[],
        tablesToRemove: TableId[]
    ): void {
        const oldTableIds = oldTableNames.map(xcHelper.getTableId);
        if (oldTableNames.length === 1) {
            // only have one table to remove
            tablesToReplace.push(oldTableNames[0]);
        } else if (oldTableNames.length > 1) {
            throw new Error("Cannot repalce multiple tables when refresh");
        }

        oldTableIds.forEach((oldTableId) => {
            if (!tablesToRemove.includes(oldTableId)) {
                // if oldTableId alredy exists (like self join)
                // not add again
                tablesToRemove.push(oldTableId);
                const progressCircle = $("#xcTableWrap-" + oldTableId)
                                        .find(".lockedTableIcon")
                                        .data("progresscircle");
                if (progressCircle) {
                    progressCircle.done();
                }
            }
        });
    }

    private static _removeOldTables(tablesToRemove: TableId[]): void {
        if (!tablesToRemove) {
            return;
        }
        for (let i = 0; i < tablesToRemove.length; i++) {
            const tableId: TableId = tablesToRemove[i];
            $("#xcTableWrap-" + tableId).remove();
        }
    }

    private static _tagOldTables(tablesToRemove: TableId[]): void {
        if (!tablesToRemove) {
            return;
        }

        tablesToRemove.forEach((tableId) => {
            $("#xcTableWrap-" + tableId).addClass("tableToRemove");
        });
    }

    private static _removeTableDisplay(tableId: TableId): void {
        $("#xcTableWrap-" + tableId).remove();
        if (gActiveTableId === tableId) {
            gActiveTableId = null;
        }
    }

    /**
     * TblManager.refreshOrphanList
     */
    public static refreshOrphanList(onlyInGTables?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        TblManager.getBackTableSet()
        .then(function(backTableMap) {
            // if onlyInGTables is true, we start with blank map and
            // add orphaned tables to it
            // otherwise we have a map of backTableNames and we remove
            // tables that are not active so all we're left with is orphaned tables
            let tableMap;
            if (onlyInGTables) {
                tableMap = {};
            } else {
                tableMap = backTableMap;
            }
            for (var tableId in gTables) {
                var table = gTables[tableId];
                var tableName = table.getName();
                var tableType = table.getType();
                if (tableType === TableType.Active) {
                    delete tableMap[tableName];
                } else if (onlyInGTables && backTableMap[tableName]) {
                    tableMap[tableName] = true;
                }
            }

            TblManager.setOrphanedList(tableMap);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    /**
     * TblManager.setOrphanedList
     * @param tableMap
     */
    private static setOrphanedList(tableMap: object): void {
        const tables: string[] = [];
        for (let table in tableMap) {
            tables.push(table);
        }
        gOrphanTables = tables;
    }

   /**
    * TblManager.setOrphanTableMeta
    * Sets gTable meta data, specially for orphan table
    * @param tableName
    * @param tableCols
    */
    public static setOrphanTableMeta(
        tableName: string,
        tableCols: ProgCol[]
    ): TableMeta {
        if (tableCols == null) {
            // at least have data col
            tableCols = [ColManager.newDATACol()];
        }

        // tableCols get deep copied in TableMeta constructor
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "tableCols": tableCols,
            "status": TableType.Orphan
        });

        gTables[tableId] = table;
        return table;
    }

    /**
     * TblMangager.centerFocusedColumn
     * @param tableId
     * @param colNum
     * @param animate {boolean} - indicating whether to animate the scrolling
     * @param noSelect
     */
    public static centerFocusedColumn(
        tableId: TableId,
        colNum: number,
        animate: boolean,
        noSelect: boolean
    ): void {
        let $container: JQuery = DagTable.Instance.getView();
        const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
        if ($container == null) {
            // table view in sql mode
            $container = $tableWrap.closest(".xc-tableArea");
        }
        const containerWidth: number = $container.width();
        const currentScrollPosition: number = $container.scrollLeft();
        const $th: JQuery = $tableWrap.find('th.col' + colNum);
        if ($th.length === 0) {
            return;
        }
        const columnOffset: number = $th.offset().left;
        const colWidth: number = $th.width();
        const leftPosition: number = currentScrollPosition + columnOffset -
                                     $container.offset().left;
        const scrollPosition: number = leftPosition -
            ((containerWidth - colWidth) / 2);

        if (!noSelect) {
            $th.find('.flex-mid').mousedown();
        }

        if (animate && !gMinModeOn) {
            $container.animate({
                scrollLeft: scrollPosition
            }, 500, () => {
                TblManager.alignTableEls();
                xcUIHelper.removeSelectionRange();
            });
        } else {
            $container.scrollLeft(scrollPosition);
            TblManager.alignTableEls();
        }
    }

    /**
     * TblManager.isTableInScreen
     * @param tableId
     * @param winWidth
     */
    public static isTableInScreen(tableId: TableId, winWidth?: number): boolean {
        const $tableWrap: JQuery = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return false;
        }

        const windowWidth: number = winWidth || $(window).width();
        const tableLeft: number = $tableWrap.offset().left;
        const tableRight: number = tableLeft + $tableWrap.width();
        const mainFrameOffsetLeft: number = MainMenu.getOffset();

        return (tableRight >= mainFrameOffsetLeft) && (tableLeft <= windowWidth);
    }

    // XXX consider passing in table names instead of tableIds to simplify
    // orphan name vs active table id determination
     // XXX not tested yet!!!
    /**
     * TblManager.deleteTables
     * will resolve if at least 1 table passes, even if others fail
     * if no failures, will not return info, but if partial or full fail
     * then it will return array of failures
     * @param tables
     * @param tableType
     * @param noAlert
     * @param noLog if we are deleting undone tables, we do not log this transaction
     */
    public static deleteTables(
        tables: (TableId | string)[],
        tableType: string,
        noAlert: boolean,
        noLog: boolean,
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        // tables is an array, it might be modifed
        // example: pass in gOrphanTables
        if (!(tables instanceof Array)) {
            tables = [tables];
        }

        tables = tables.filter((tableIdOrName) => {
            return TblManager._verifyTableType(tableIdOrName, tableType);
        });

        const splitTables = TblManager._splitDroppableTables(tables, tableType);
        tables = splitTables.deleteable;
        const noDeleteTables: (TableId | string)[] = splitTables.noDelete;

        let txId: number;
        const sql = {
            operation: SQLOps.DeleteTable,
            tables: xcHelper.deepCopy(tables),
            tableType: tableType
        };
        if (!noLog) {
            txId = Transaction.start({
                operation: SQLOps.DeleteTable,
                sql: sql,
                steps: tables.length,
                track: true
            });
        }

        let tableNames: string[] = [];
        let promise: XDPromise<void>;
        //Calls deletes in these heper functions
        if (tableType === TableType.Orphan) {
            // delete orphaned
            tableNames = <string[]>tables;
            promise = TblManager._delOrphanedHelper(tableNames, txId);
        } else {
            tableNames = tables.map((tableId) =>  gTables[tableId].getName());
            promise = TblManager._delActiveTableHelper(tables, txId);
        }

        const rejectHandler = (args): void => {
            const res = TblManager._tableDeleteFailHandler(args, tableNames, noDeleteTables);
            res.errors = args;
            if (res.hasSuccess) {
                if (!noLog) {
                    sql.tables = res.successTables;
                    Transaction.done(txId, {
                        sql: sql,
                        title: ResultSetTStr.Del
                    });

                    if (res.fails && !noAlert) {
                        Alert.error(StatusMessageTStr.PartialDeleteResultSetFail,
                                    res.errorMsg);
                    }
                }

                deferred.resolve(res);
            } else {
                if (!noLog) {
                    Transaction.fail(txId, {
                        error: res.errorMsg,
                        failMsg: StatusMessageTStr.DeleteResultSets,
                        noAlert: noAlert
                    });
                }
                deferred.reject(res);
            }
        };

        promise
        .then(() => {
            // resolves if all tables passed
            if (noDeleteTables.length) {
                rejectHandler(tableNames);
            } else {
                if (!noLog) {
                    Transaction.done(txId, {
                        title: ResultSetTStr.Del
                    });
                }
                deferred.resolve(tableNames);
            }
        })
        .fail((...arg) => {
            // fails if at least 1 table failed
            rejectHandler(arg);
        });

        return deferred.promise();
    }

    private static _tableDeleteFailHandler(
        results: any[],
        tables: (TableId | string)[],
        noDeleteTables: (TableId | string)[]
    ): {
        hasSuccess: boolean,
        fails: {tables: (TableId | string), error: string}[],
        errorMsg: string,
        successTables: (TableId | string)[]
        errors: any[]
    } {
        let hasSuccess: boolean = false;
        const fails: {tables: (TableId | string), error: string}[] = [];
        let numActualFails: number = 0; // as opposed to noDeleteTables
        let errorMsg: string = "";
        let tablesMsg: string = "";
        let noDeleteMsg: string = "";
        let failedTablesStr: string = "";
        let successTables: (TableId | string)[] = [];

        for (let i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: tables[i], error: results[i].error});
                failedTablesStr += tables[i] + ", ";
                numActualFails++;
            } else {
                hasSuccess = true;
                successTables.push(tables[i]);
            }
        }

        if (noDeleteTables.length) {
            noDeleteTables.forEach((tIdOrName) => {
                let tableName: string;
                if (gTables[tIdOrName]) {
                    tableName = gTables[tIdOrName].getName();
                } else {
                    tableName = <string>tIdOrName;
                }
                noDeleteMsg += tableName + ", ";
                fails.push({
                    "tables": tableName,
                    "error": ErrTStr.CannotDropLocked
                });
            });
            // remove last comma
            noDeleteMsg = noDeleteMsg.substr(0, noDeleteMsg.length - 2);
            if (noDeleteTables.length === 1) {
                noDeleteMsg = "Table " + noDeleteMsg + " was locked.\n";
            } else {
                noDeleteMsg = "Tables " + noDeleteMsg + " were locked.\n";
            }
        }

        const numFails: number = fails.length + noDeleteTables.length;
        if (numFails) {
            // remove last comma
            failedTablesStr = failedTablesStr.substr(0,
                              failedTablesStr.length - 2);
            if (numActualFails === 1) {
                tablesMsg += xcStringHelper.replaceMsg(ErrWRepTStr.ResultSetNotDeleted, {
                    "name": failedTablesStr
                });
            } else if (numActualFails > 1) {
                tablesMsg += ErrTStr.ResultsetsNotDeleted + " " + failedTablesStr;
            }

            if (hasSuccess || noDeleteTables.length) {
                if (!numActualFails) {
                    errorMsg = noDeleteMsg;
                } else {
                    errorMsg = noDeleteMsg + fails[0].error + ". " + tablesMsg;
                }
            } else {
                errorMsg = fails[0].error + ". " + ErrTStr.NoResultSetDeleted;
            }
        }

        return {
            hasSuccess: hasSuccess,
            fails: fails,
            errorMsg: errorMsg,
            successTables: successTables,
            errors: null
        };
    }

    private static _getFakeQuery(tableName: string): object {
        return {
            operation: "XcalarApiDeleteObjects",
            args: {
                namePattern: tableName,
                srcType: "Table"
            }
        };
    }

    // for deleting active tables
    private static _delActiveTableHelper(
        tableIds: TableId[],
        txId: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const defArray: XDPromise<void>[] = [];
        const tableJSON: object[] = [];
        const names: string[] = [];
        const resolveTable = (tableId: TableId): void => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            TblManager._removeTableDisplay(tableId);

            if (gActiveTableId === tableId) {
                gActiveTableId = null;
            }
            if ($('.xcTableWrap:not(.inActive)').length === 0) {
                TableComponent.empty();
            }
            TblManager._removeTableMeta(tableName);
            TblFunc.unlockTable(tableId);
        }

        tableIds.forEach((tableId) => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            names.push(tableName);
            TblFunc.lockTable(tableId);

            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);

            defArray.push(table.freeResultset());
        });
        // Free the result set pointer that is still pointing to it
        let whenPassed = false;
        PromiseHelper.when.apply(window, defArray)
        .then(() => {
            whenPassed = true;
            if (names.length === 1) {
                // XIAPi.deleteTable has the fail handler for dag in use case
                // which XIAPI.deleteTables doesn't have
                return XIApi.deleteTable(txId, names[0]);
            } else {
                return XIApi.deleteTables(txId, tableJSON, null);
            }
        })
        .then((...arg) => {
            tableIds.forEach(resolveTable);
            TblManager.alignTableEls();
            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            let args = arg;
            if (!whenPassed) {
                args = arg[0];
            }

            for (let i = 0; i < args.length; i++) {
                const tableId: TableId = tableIds[i];
                if (args[i] == null) {
                    resolveTable(tableId);
                } else {
                    TblFunc.unlockTable(tableId);
                }
            }

            TblManager.alignTableEls();
            deferred.reject.apply(this, args);
        });

        return deferred.promise();
    }

    private static _delOrphanedHelper(tables: string[], txId: number): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const names: string[] = [];
        const tableJSON: object[] = [];
        let resolve = (arg) => {
            for (let i = 0; i < arg.length; i++) {
                const tableName: string = names[i];
                if (arg[i] == null) {
                    const tableIndex: number = gOrphanTables.indexOf(tableName);
                    gOrphanTables.splice(tableIndex, 1);
                    TblManager._removeTableMeta(tableName);
                }
            }
        }

        tables.forEach((tableName) => {
            // Note Placeholder replace strings with constants
            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);
            names.push(tableName);
        });
        XIApi.deleteTables(txId, tableJSON, null)
        .then((...arg) => {
            resolve(arg);
            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            resolve(arg);
            deferred.reject.apply(this, arg);
        });

        return deferred.promise();
    }

    private static _delUndoneTableHelper(
        tables: TableId[],
        txId: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const names: string[] = [];
        const tableJSON: object[] = [];
        tables.forEach((tableId) => {
            const table: TableMeta = gTables[tableId];
            const tableName: string = table.getName();
            const query: object = TblManager._getFakeQuery(tableName);
            tableJSON.push(query);
            names.push(tableName);
        });

        XIApi.deleteTables(txId, tableJSON, null)
        .then((...arg) => {
            names.forEach((tableName) => {
                TblManager._removeTableMeta(tableName);
            });
            deferred.resolve.apply(this, arg);
        })
        .fail((...arg) => {
            for (let i = 0; i < arg.length; i++) {
                const tableName: string = names[i];
                TblManager._removeTableMeta(tableName);
            }
            deferred.reject.apply(this, arg);
        });

        return deferred.promise();
    }

    private static _removeTableMeta(tableName: string): void {
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] != null) {
            TblManager._sendTableToDropped(gTables[tableId]);
            delete gTables[tableId];
            Profile.deleteCache(tableId);
        }
    }

    private static _sendTableToDropped(table: TableMeta): void {
        table.beDropped();
        gDroppedTables[table.tableId] = table;
    }

    // returns arrays of deletable and non-deletable tables
    private static _splitDroppableTables(
        tables: (TableId | string)[],
        tableType: string
    ): {
        deleteable: (TableId | string)[],
        noDelete: (TableId | string)[]
    } {
        const deleteables: (TableId | string)[] = [];
        const nonDeletables: (TableId | string)[] = [];

        tables.forEach((tIdOrName) => {
            let tId: TableId;
            if (tableType === TableType.Orphan) {
                tId = xcHelper.getTableId(<string>tIdOrName);
            } else {
                tId = tIdOrName;
            }
            if (gTables[tId] &&
                (gTables[tId].hasLock())
            ) {
                nonDeletables.push(tIdOrName);
            } else {
                deleteables.push(tIdOrName);
            }
        });
        return {deleteable: deleteables, noDelete: nonDeletables};
    }

    private static _verifyTableType(
        tableIdOrName: TableId | string,
        expectTableType: string
    ): boolean {
        let tableId: TableId;
        if (expectTableType === TableType.Orphan) {
            tableId = xcHelper.getTableId(<string>tableIdOrName);
        } else {
            tableId = tableIdOrName;
        }

        let currentTableType: string;
        if (tableId != null && gTables.hasOwnProperty(tableId)) {
            currentTableType = gTables[tableId].getType();
        } else {
            currentTableType = TableType.Orphan;
        }

        if (currentTableType === expectTableType) {
            return true;
        } else {
            console.warn("Table", tableIdOrName, "'s' type mismatch",
                        "type is", currentTableType,
                        "expected type is", expectTableType);
            return false;
        }
    }

    /**
     * TblManager.restoreTableMeta
     * @param tables
     */
    public static restoreTableMeta(tables: {[key: string]: TableDurable}): void {
        // will delete older dropped tables if storing more than 1MB of
        // dropped table data
        let cleanUpDroppedTables = () => {
            const limit: number = 1 * MB;
            const droppedTablesStr: string = JSON.stringify(gDroppedTables);
            if (droppedTablesStr.length < limit) {
                return;
            }

            const pctToReduce: number = limit / droppedTablesStr.length;
            const dTableArray: TableMeta[] = [];
            let numTotalCols: number = 0;
            const hashTagLen: number = 2;

            for (let id in gDroppedTables) {
                dTableArray.push(gDroppedTables[id]);
                numTotalCols += gDroppedTables[id].tableCols.length;
            }

            // estimate table size by column length
            const colLimit: number = Math.floor(numTotalCols * pctToReduce);
            dTableArray.sort((a, b) => {
                let idNumA;
                let idNumB;
                if (isNaN(<number>a.tableId)) {
                    idNumA = (<string>a.tableId).slice(hashTagLen);
                } else {
                    idNumA = a.tableId;
                }
                if (isNaN(<number>b.tableId)) {
                    idNumB = (<string>b.tableId).slice(hashTagLen);
                } else {
                    idNumB = b.tableId;
                }
                return parseInt(idNumB) - parseInt(idNumA);
            });

            let colCount: number = 0;
            gDroppedTables = {};
            for (let i = 0; i < dTableArray.length; i++) {
                colCount += dTableArray[i].tableCols.length;
                if (colCount > colLimit) {
                    break;
                } else {
                    gDroppedTables[dTableArray[i].tableId] = dTableArray[i];
                }
            }
        };

        for (let tableId in tables) {
            let tableDurable: TableDurable = tables[tableId];
            const table: TableMeta = new TableMeta(tableDurable);
            if (table.hasLock()) {
                table.unlock();
                table.beOrphaned();
            }

            if (table.isDropped()) {
                table.beDropped(); // strips unnecessary data
                gDroppedTables[tableId] = table;
            } else {
                gTables[tableId] = table;
            }
        }

        cleanUpDroppedTables();
    }

    /**
     * TblManager.pullRowsBulk
     * @param tableId
     * @param jsonData
     * @param startIndex
     * @param direction
     * @param rowToPrependTo
     */
    public static pullRowsBulk(
        table: TableMeta,
        jsonData: string[],
        startIndex: number = 0,
        direction?: RowDirection,
        rowToPrependTo?: number
    ): void {
        const tableId: TableId = table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        const $trs: JQuery = ColManager.pullAllCols(startIndex, jsonData, table,
                                            direction, rowToPrependTo);
        TblManager._addRowListeners($trs);
        TblManager.adjustRowHeights($trs, startIndex, table);

        const idColWidth: number = xcUIHelper.getTextWidth($table.find('tr:last td:first'));
        const newWidth: number = Math.max(idColWidth, 22);
        const padding: number = 6;
        $table.find('th:first-child').width(newWidth + padding);
        TblFunc.matchHeaderSizes($table);
    }

    private static _addRowListeners($trs: JQuery): void {
        const $jsonEle: JQuery = $trs.find(".jsonElement");
        $jsonEle.on("click", ".pop", (event) => {
            const $el: JQuery = $(event.currentTarget);
            if (ModalHelper.isModalOn() &&
                !$el.closest('.xcTableWrap').hasClass('jsonModalOpen'))
            {
                return;
            }
            JSONModal.Instance.show($el.closest(".jsonElement"), null);
        });

        $trs.find(".rowGrab").mousedown((event) => {
            if (event.which === 1) {
                TblAnim.startRowResize($(event.currentTarget), event);
            }
        });
    }

    /**
     * TblManager.adjustRowHeights
     * @param $trs
     * @param rowIndex
     * @param table
     */
    public static adjustRowHeights(
        $trs: JQuery,
        rowIndex: number,
        table: TableMeta
    ): void {
        const rowObj: object[] = table.rowHeights;
        const numRows: number = $trs.length;
        const pageNum: number = Math.floor(rowIndex / TableMeta.NumEntriesPerPage);
        const lastPageNum: number = pageNum + Math.ceil(numRows / TableMeta.NumEntriesPerPage);
        const padding: number = 4;

        for (let i = pageNum; i < lastPageNum; i++) {
            if (rowObj[i]) {
                for (let row in rowObj[i]) {
                    const $row: JQuery = $trs.filter((_index, el) => {
                        return $(el).hasClass('row' + (Number(row) - 1));
                    });
                    const $firstTd: JQuery = $row.find('td.col0');
                    $firstTd.outerHeight(rowObj[i][row]);
                    $row.find('td > div')
                        .css('max-height', rowObj[i][row] - padding);
                    $firstTd.children('div').css('max-height', rowObj[i][row]);
                    $row.addClass('changedHeight');
                }
            }
        }
    }

    /**
     * TblManager.getColHeadHTML
     * @param colNum
     * @param tableId
     * @param options
     */
    public static getColHeadHTML(
        colNum: number,
        tableId: TableId,
        options: {
            columnClass: string
        } = {
            columnClass: ""
        }
    ): string {
        const table: TableMeta = gTables[tableId];
        xcAssert(table != null);

        const progCol: ProgCol = table.getCol(colNum);
        xcAssert(progCol != null);

        const keys: {name: string, ordering: string}[] = table.getKeys();
        const sortedColAlias: string = progCol.getSortedColAlias();
        const indexed: {name: string, ordering: string} = keys.find((k) => {
            return k.name === sortedColAlias;
        });

        let width = progCol.getWidth();
        let columnClass: string = options.columnClass || "";
        if (progCol.hasMinimized()) {
            width = 15;
            columnClass += " userHidden";
        }
        const type: ColumnType = progCol.getType();
        const validTypes: ColumnType[] = [ColumnType.integer, ColumnType.float,
            ColumnType.string, ColumnType.boolean, ColumnType.number, ColumnType.timestamp, ColumnType.money];
        if (validTypes.includes(type) && !progCol.isEmptyCol()) {
            columnClass += " sortable ";
        }

        let sortIcon: string =
            '<div class="sortIcon">' +
                '<div class="sortAsc sortHalf" data-toggle="tooltip" ' +
                'data-container="body" ' +
                'data-placement="auto top" data-original-title="' +
                TooltipTStr.ClickToSortAsc + '"></div>' +
                '<div class="sortDesc sortHalf" data-toggle="tooltip"' +
                'data-container="body" ' +
                'data-placement="auto top" data-original-title="' +
                TooltipTStr.ClickToSortDesc + '"></div>' +
                '<i class="icon xi-sort fa-12"></i>' +
            '</div>'; // placeholder

        if (indexed) {
            columnClass += " indexedColumn";
            if (!table.showIndexStyle()) {
                columnClass += " noIndexStyle";
            }
            const order: string = indexed.ordering;
            let sorted: boolean = false;
            if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]) {
                sortIcon = '<div class="sortIcon"  data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-placement="auto top" data-original-title="' +
                        TooltipTStr.ClickToSortDesc + '"' +
                            '><i class="icon xi-arrowtail-up fa-9"></i>';
                sorted = true;
            } else if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                sortIcon = '<div class="sortIcon" data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="auto top" data-original-title="' +
                            TooltipTStr.ClickToSortAsc + '"><i class="icon ' +
                            'xi-arrowtail-down fa-9"></i>';
                sorted = true;
            }

            if (sorted) {
                const keyNames: string[] = table.getKeyName();
                if (keyNames.length > 1) {
                    let sortNum: number = keyNames.indexOf(sortedColAlias);
                    sortIcon += '<span class="sortNum">' + (sortNum + 1) + '</span>';
                }
                sortIcon += '</div>';
            }

        } else if (progCol.isEmptyCol()) {
            columnClass += " newColumn";
        }

        // remove the beginning and end space
        columnClass = columnClass.trim();

        let disabledProp: string;
        let editableClass: string;
        let colName: string = progCol.getFrontColName();
        if (colName === "") {
            disabledProp = "";
            editableClass = " editable";
        } else {
            disabledProp = "disabled";
            editableClass = "";
        }
        colName = colName.replace(/"/g, "&quot;");

        let prefix: string = progCol.getPrefix();
        let prefixClass: string = "prefix";

        if (prefix === "") {
            prefix = table.allImmediates ? "" : CommonTxtTstr.Immediates;
            prefixClass += " immediate";
        }

        const th: string =
            '<th class="th ' + columnClass + ' col' + colNum + '"' +
            ' style="width:' + width + 'px;">' +
                '<div class="header' + editableClass + ' ">' +
                    '<div class="dragArea">' +
                        '<div class="iconHelper" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="auto top" ' +
                            'data-container="body">' +
                        '</div>' +
                    '</div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="topHeader">' +
                        '<div class="' + prefixClass + '">' +
                            prefix +
                        '</div>' +
                    '</div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left">' +
                            '<div class="iconHidden"></div>' +
                            '<span class="type icon"></span>' +
                        '</div>' +
                        '<div class="flexWrap flex-mid' + editableClass +
                            '">' +
                            '<input class="editableHead tooltipOverflow ' +
                                'col' + colNum + '"' +
                                ' type="text"  value="' + colName + '"' +
                                ' size="15" spellcheck="false" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="auto top" ' +
                                'data-container="body" ' +
                                'data-original-title="' + xcTooltip.escapeHTML(colName) + '" ' +
                                disabledProp + '/>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                            sortIcon +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return th;
    }

    /**
     * TblManager.sortColumns
     * @param tableId
     * @param sortKey
     * @param direction
     */
    public static sortColumns(
        tableId: TableId,
        sortKey: ColumnSortType,
        direction: string
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const order: ColumnSortOrder = (direction === "reverse") ?
        ColumnSortOrder.descending : ColumnSortOrder.ascending;

        let numCols: number = table.getNumCols();
        let dataCol: ProgCol = null;
        if (table.getCol(numCols).isDATACol()) {
            dataCol = table.removeCol(numCols);
            numCols--;
        }

        const colNumMap: object = {};
        const thLists: object = {};
        const noNameCols: number[] = [];
        const $table: JQuery = $("#xcTable-" + tableId);
        // record original position of each column
        for (let colNum = 1; colNum <= numCols; colNum++) {
            const progCol: ProgCol = table.getCol(colNum);
            const colName: string = progCol.getFrontColName(true);

            // can't use map for columns with no name because of duplicates
            if (colName === "") {
                noNameCols.push(colNum);
            } else {
                colNumMap[colName] = colNum;
            }

            const $th: JQuery = $table.find("th.col" + colNum);
            thLists[colNum] = $th;
        }

        table.sortCols(sortKey, order);

        const $rows: JQuery = $table.find('tbody tr');
        const numRows: number = $rows.length;
        let noNameIndex: number = 0;
        const oldOrder: number[] = []; // to save the old column order
        // loop through each column
        for (let i = 0; i < numCols; i++) {
            const newColNum: number = i + 1;
            const newProgCol: ProgCol = table.getCol(newColNum);
            const newColName: string = newProgCol.getFrontColName(true);
            let oldColNum: number;
            if (newColName === "") {
                oldColNum = noNameCols[noNameIndex];
                noNameIndex++;
            } else {
                oldColNum = colNumMap[newColName];
            }
            const $thToMove: JQuery = thLists[oldColNum];
            $thToMove.removeClass("col" + oldColNum)
                    .addClass("col" + newColNum)
                .find(".col" + oldColNum)
                .removeClass("col" + oldColNum)
                .addClass("col" + newColNum);

            // after move th, the position is different from the oldColNum
            const oldPos: number = $thToMove.index();
            $table.find("th").eq(i).after($thToMove);
            // loop through each row and order each td
            for (let j = 0; j < numRows; j++) {
                const $row: JQuery = $rows.eq(j);
                const $tdToMove: JQuery = $row.find("td").eq(oldPos);
                $tdToMove.removeClass("col" + oldColNum)
                         .addClass("col" + newColNum);
                $row.find("td").eq(i).after($tdToMove);
            }

            oldOrder.push(oldColNum - 1);
        }

        if (dataCol != null) {
            // if data col was removed from sort, put it back
            table.addCol(numCols + 1, dataCol);
            oldOrder.push(numCols);
        }

        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            let colNames = table.getAllCols().map(col => col.getBackColName());
            node.columnChange(DagColumnChangeType.Reorder, colNames);
        }

        Log.add(SQLTStr.SortTableCols, {
            "operation": SQLOps.SortTableCols,
            "tableName": table.getName(),
            "tableId": tableId,
            "sortKey": sortKey,
            "direction": direction,
            "originalOrder": oldOrder,
            "htmlExclude": ['originalOrder']
        });
    }

    /**
     * TblManager.orderAllColumns
     * @param tableId
     * @param order ex. [2, 0, 3, 1]
     */
    public static orderAllColumns(tableId: TableId, order: number[]): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const newCols: ProgCol[] = [];
        const $table: JQuery = $('#xcTable-' + tableId);
        const $ths: JQuery = $table.find('th');
        let thHtml: string = $ths.eq(0)[0].outerHTML;
        const progCols: ProgCol[] = table.tableCols;
        const indices: number[] = [];
        const numCols: number = order.length;
        // column headers
        for (let i = 0; i < numCols; i++) {
            const index: number = order.indexOf(i);
            indices.push(index);
            newCols.push(progCols[index]);
            const $th: JQuery = $ths.eq(index + 1);
            $th.removeClass('col' + (index + 1));
            $th.addClass('col' + (i + 1));
            $th.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                .addClass('col' + (i + 1));
            thHtml += $th[0].outerHTML;
        }

        // column rows and tds
        let tdHtml: string = "";
        $table.find('tbody tr').each((rowNum, el) => {
            tdHtml += '<tr class="row' + rowNum + '">';
            const $tds: JQuery = $(el).find('td');
            tdHtml += $tds.eq(0)[0].outerHTML;
            for (let i = 0; i < numCols; i++) {
                const index: number = indices[i];
                const $td: JQuery = $tds.eq(index + 1);
                $td.removeClass('col' + (index + 1));
                $td.addClass('col' + (i + 1));
                $td.find('.col' + (index + 1)).removeClass('col' + (index + 1))
                   .addClass('col' + (i + 1));
                tdHtml += $td[0].outerHTML;
            }
            tdHtml += '</tr>';
        });

        // update everything
        table.tableCols = newCols;
        $table.find('thead tr').html(thHtml);
        $table.find('tbody').html(tdHtml);

        TblManager._addRowListeners($table.find('tbody'));

        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            let colNames = table.getAllCols().map(col => col.getBackColName());
            node.columnChange(DagColumnChangeType.Reorder, colNames);
        }
    }

    /**
     * TblManager.resizeColumns
     * @param tableId
     * @param resizeTo
     * @param columnNums
     */
    public static resizeColumns(
        tableId: TableId,
        resizeTo: string,
        columnNums?: number[]
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        let columns: ProgCol[] = [];
        let colNums: number[] = [];
        let allCols: boolean = false;
        if (columnNums !== undefined) {
            if (typeof columnNums !== "object") {
                colNums.push(columnNums);
            } else {
                colNums = columnNums;
            }
            columns = colNums.map((colNum) => {
                let col = ColManager.newCol(table.getCol(colNum));
                table.tableCols[colNum - 1] = col;
                return col;
            });
        } else {
            allCols = true;
            columns = table.tableCols.map((col, i) => {
                col = ColManager.newCol(col);
                table.tableCols[i] = col;
                return col;
            });
            colNums = columns.map((_col, index) => (index + 1));
        }

        const $table: JQuery = $('#xcTable-' + tableId);
        const oldColumnWidths: number[] = [];
        const newWidths: number[] = [];
        const oldSizedTo: string[] = [];
        const wasHidden: boolean[] = [];
        const columnNames: string[] = [];

        for (let i = 0, numCols = columns.length; i < numCols; i++) {
            const $th: JQuery = $table.find('th.col' + colNums[i]);
            columnNames.push(columns[i].getBackColName());
            columns[i].maximize();
            oldColumnWidths.push(<number>columns[i].width);
            oldSizedTo.push(columns[i].sizedTo);
            columns[i].sizedTo = resizeTo;
            wasHidden.push($th.hasClass("userHidden"));
            const $tds: JQuery = $table.find("td.col" + colNums[i]);
            $th.removeClass("userHidden");
            $tds.removeClass("userHidden");

            newWidths.push(TblFunc.autosizeCol($th, {
                "dblClick": true,
                "minWidth": 17,
                "maxWidth": null,
                "unlimitedWidth": false,
                "includeHeader": (resizeTo === "header" || resizeTo === "all"),
                "fitAll": resizeTo === "all",
                "multipleCols": true,
                "datastore": false
            }));
        }

        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            const colInfo = columnNames.map((_colName, i) => {
                return {
                    width: newWidths[i],
                    sizedTo: columns[i].sizedTo,
                    isMinimized: columns[i].hasMinimized()

                }
            });
            node.columnChange(DagColumnChangeType.Resize, columnNames, colInfo);
        }

        TblFunc.matchHeaderSizes($table);

        Log.add(SQLTStr.ResizeCols, {
            "operation": SQLOps.ResizeTableCols,
            "tableName": table.tableName,
            "tableId": tableId,
            "sizeTo": resizeTo,
            "columnNums": colNums,
            "oldColumnWidths": oldColumnWidths,
            "newColumnWidths": newWidths,
            "oldSizedTo": oldSizedTo,
            "wasHidden": wasHidden,
            "allCols": allCols,
            "htmlExclude": ["columnNums", "oldColumnWidths", "newColumnWidths",
                            "oldSizedTo", "wasHidden", "allCols"]
        });
    }

    /**
     * only used for undo / redos sizeToHeader/content/all
     * TblManager.resizeColsToWidth
     * @param tableId
     * @param colNums
     * @param widths
     * @param sizeTo
     * @param wasHidden
     */
    public static resizeColsToWidth(
        tableId: TableId,
        colNums: number[],
        widths: (number| string)[],
        sizeTo: string[],
        wasHidden?: boolean[]
    ): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.find('.userHidden').removeClass('userHidden');
        const numCols: number = colNums.length;
        const columns: ProgCol[] = [];
        const columnNames: string[] = [];
        for (let i = 0; i < numCols; i++) {
            const colNum: number = colNums[i];
            if (!widths[i]) {
                console.warn('not found');
            }
            const $th: JQuery = $table.find('th.col' + colNum);
            let width: number | string = widths[i];
            const progCol: ProgCol = new ProgCol(<any>table.getCol(colNum));
            table.tableCols[colNum - 1] = progCol;
            if (wasHidden && wasHidden[i]) {
                $th.addClass("userHidden");
                $table.find("td.col" + colNum).addClass("userHidden");
                progCol.minimize();
                width = gHiddenColumnWidth;
            } else {
                progCol.maximize();
            }
            $th.outerWidth(width);
            progCol.width = widths[i];
            progCol.sizedTo = sizeTo[i];
            columns.push(progCol);
            columnNames.push(progCol.getBackColName());
        }
        TblFunc.matchHeaderSizes($table);
        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            const colInfo = colNums.map((_colNum, i) => {
                return {
                    width: columns[i].getWidth(),
                    sizedTo: columns[i].sizedTo,
                    isMinimized: columns[i].hasMinimized()
                }
            });
            node.columnChange(DagColumnChangeType.Resize, columnNames, colInfo);
        }

    }

    // XXX TODO: update it
    /**
     * TblManager.adjustRowFetchQuantity
     */
    public static adjustRowFetchQuantity(): number {
        // cannot calculate frame's height directly because sometimes
        // it may not be visible
        try {
            const $topBar: JQuery = $('.mainPanel.active').find('.topBar');
            if (!$topBar[0]) {
                return;
            }
            const frameTop: number = $topBar[0].getBoundingClientRect().bottom;
            const frameBottom: number = $('#statusBar')[0].getBoundingClientRect().top;
            const frameHeight: number = frameBottom - frameTop;
            const tableAreaHeight: number = frameHeight - TblManager.firstRowPositionTop;
            const maxVisibleRows: number = Math.ceil(tableAreaHeight / gRescol.minCellHeight);
            const buffer: number = 5;
            const rowsNeeded: number = maxVisibleRows + TableMeta.NumEntriesPerPage + buffer;
            TblManager.maxEntriesPerPage = Math.max(rowsNeeded, TblManager.minRowsPerScreen);
            TblManager.maxEntriesPerPage = Math.ceil(TblManager.maxEntriesPerPage / 10) * 10;
        } catch (e) {
            console.error("adjustRowFetchQuantity error", e);
        }
        return TblManager.maxEntriesPerPage;
    }

    /**
     * TblManager.highlightCell
     * @param $td
     * @param tableId
     * @param rowNum
     * @param colNum
     * @param options
     * -jsonModal: if it's jsonModal
     * -isShift: if press shiftKey or not
     */
    public static highlightCell(
        $td: JQuery,
        tableId: TableId,
        rowNum: number,
        colNum: number,
        options: {
            jsonModal: boolean
            isShift: boolean
        } = {
            jsonModal: false,
            isShift: false
        }
    ) {
        // draws a new div positioned where the cell is, intead of highlighting
        // the actual cell
        if (options.jsonModal &&
            $td.find('.jsonModalHighlightBox').length !== 0)
        {
            $td.find('.jsonModalHighlightBox').data().count++;
            return;
        }

        let divClass: string;
        if (options.jsonModal) {
            divClass = "jsonModalHighlightBox";
        } else {
            divClass = "highlightBox " + tableId;
        }

        if (options.isShift) {
            divClass += " shiftKey";
        } else {
            // this can be used as a base cell when user press shift
            // to select multi rows
            divClass += " noShiftKey";
        }

        const border: number = 5;
        const width: number = $td.outerWidth() - border;
        const height: number = $td.outerHeight();
        const styling: string = 'width:' + width + 'px;' +
                      'height:' + height + 'px;';
        // can't rely on width/height 100% because of IE

        const $highlightBox: JQuery = $('<div class="' + divClass + '" ' +
                                        'style="' + styling + '" data-count="1">' +
                                        '</div>');

        $highlightBox.data("rowNum", rowNum)
                     .data("colNum", colNum)
                     .data("tableId", tableId);

        $td.append($highlightBox);
        $td.addClass("highlightedCell");
        if (!options.jsonModal && gTables[tableId] != null) {
            const cells = gTables[tableId].highlightedCells;
            if (cells[rowNum] == null) {
                cells[rowNum] = {};
            }
            const cellInfo = {
                colNum: colNum,
                rowNum: rowNum,
                isUndefined: $td.find(".undefined").length > 0,
                val: $td.find(".originalData").text(),
                isNull: $td.find(".null").length > 0,
                isBlank: $td.find(".blank").length > 0,
                isMixed: false,
                type: null
            };
            var $header = $("#xcTable-" + tableId)
                                        .find("th.col" + colNum + " .header");
            if ($header.hasClass("type-mixed")) {
                cellInfo.isMixed = true;
                cellInfo.type = ColManager.getCellType($td, tableId);
            }

            cells[rowNum][colNum] = cellInfo;
        }
    }

    /**
     * TblManager.rehighlightCells
     */
    public static rehighlightCells(tableId: TableId): void {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error table");
            return;
        }
        const $table: JQuery = $("#xcTable-" + tableId);
        const lastRow: number = table.currentRowNumber - 1;
        const firstRow: number = lastRow - ($table.find("tbody tr").length - 1);
        for (let rowStr in table.highlightedCells) {
            const row: number = parseInt(rowStr);
            if (row <= lastRow && row >= firstRow) {
                for (let colNumStr in table.highlightedCells[row]) {
                    const colNum: number = Number(colNumStr);
                    const $td: JQuery = $table.find(".row" + row + " .col" + colNum);
                    if (!$td.hasClass("highlightedCell")) {
                        TblManager.highlightCell($td, tableId, row, colNum);
                    }
                }
            }
        }
    }

    /**
     * TblManager.unHighlightCells
     * if no tableId is passed in, will unhighlight all cells in any table
     */
    public static unHighlightCells(tableId?: TableId): void {
        if (tableId != null) {
            $("#xcTable-" + tableId).find(".highlightedCell")
                                    .removeClass("highlightedCell")
                                    .find(".highlightBox").remove();
            const table: TableMeta = gTables[tableId];
            if (table != null) {
                table.highlightedCells = {};
            }
            return;
        }

        const $highlightBoxs: JQuery = $(".highlightBox");
        if (!$highlightBoxs.length) {
            if (gTables[gActiveTableId] &&
                !$.isEmptyObject(gTables[gActiveTableId].highlightedCells)) {
                // some highlight boxes may not be visible if scrolled
                gTables[gActiveTableId].highlightedCells = {};
            } else {
                return;
            }
        }

        const tIds: object = {};
        $highlightBoxs.each((_index, el) => {
            tIds[$(el).data("tableId")] = true;
        });

        $(".highlightedCell").removeClass("highlightedCell");
        $highlightBoxs.remove();

        for (let tId in tIds) {
            const table: TableMeta = gTables[tId];
            if (table != null) {
                table.highlightedCells = {};
            }
        }
    }

    /**
     * TblManager.highlightColumn
     * @param $el
     * @param keepOthersSelected
     * @param modalHighlight
     */
    public static highlightColumn(
        $el: JQuery,
        keepOthersSelected: boolean = false,
        modalHighlight: boolean = false
    ): void {
        const index: number = ColManager.parseColNum($el);
        const tableId: TableId = TblManager.parseTableId($el.closest('.dataTable'));
        const $table: JQuery = $('#xcTable-' + tableId);
        if (!keepOthersSelected) {
            $('.selectedCell').removeClass('selectedCell');
        }
        $table.find('th.col' + index).addClass('selectedCell');
        $table.find('td.col' + index).addClass('selectedCell');
        if (modalHighlight) {
            $table.find('th.col' + index).addClass("modalHighlighted");
            $table.find('td.col' + index).addClass("modalHighlighted");
        }
    }

    // XXX TODO, deprecate this function
    /**
     * TblManager.updateHeaderAndListInfo
     */
    public static updateHeaderAndListInfo(tableId: TableId): void {
        const $table: JQuery = $('#xcTable-' + tableId);
        TblFunc.alignScrollBar($table);
    }

    /**
     * TblManager.alignTableEls
     * @param $tableWrap
     */
    public static alignTableEls(): void {
        TblFunc.moveFirstColumn(null);
    }

    /**
     * TblManager.addWaitingCursor
     * @param tableId
     */
    public static addWaitingCursor(tableId: TableId): void {
        $('#xcTableWrap-' + tableId).append('<div class="tableCoverWaiting"></div>');
    }

    /**
     * TblManager.removeWaitingCursor
     * @param tableId
     */
    public static removeWaitingCursor(tableId: TableId): void {
        $('#xcTableWrap-' + tableId).find('.tableCoverWaiting').remove();
    }

    /**
     * TblManager.freeAllResultSetsSync
     */
    public static freeAllResultSetsSync(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const promises: XDPromise<void>[] = [];
        // check backend table name to see if it exists
        TblManager.getBackTableSet()
        .then((backTableSet) => {
            for (let tableId in gTables) {
                const table: TableMeta = gTables[tableId];
                const tableName: string = table.getName();

                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.error("Table not in backend!");
                    continue;
                }

                promises.push(table.freeResultset.bind(table));
            }
            return PromiseHelper.chain(promises);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * TblManager.addColListeners
     * @param $table
     * @param tableId
     */
    public static addColListeners(
        $table: JQuery,
        tableId: TableId,
    ): void {
        const $thead: JQuery = $table.find('thead tr');
        const $tbody: JQuery = $table.find("tbody");
        let lastSelectedCell: JQuery;

        gTables[tableId].highlightedCells = {};

        // listeners on thead
        $thead.on("mousedown", ".flexContainer, .dragArea", (event: any) => {
            const $el: JQuery = $(event.currentTarget);
            if ($("#container").hasClass("columnPicker") || $("#datastorePanel").hasClass("active")) {
                // not focus when in modal unless bypassModa is true
                return;
            } else if ($el.closest('.dataCol').length !== 0) {
                return;
            }

            let $editableHead: JQuery;
            if ($el.is('.dragArea')) {
                $editableHead = $el.closest('.header').find('.editableHead');
            } else {
                $editableHead = $el.find('.editableHead');
            }

            const colNum: number = ColManager.parseColNum($editableHead);
            const $target: JQuery = $(event.target);
            const notDropDown: boolean = $target.closest('.dropdownBox').length === 0;
            if ($table.find('.selectedCell').length === 0) {
                $('.selectedCell').removeClass('selectedCell');
                lastSelectedCell = $editableHead;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey) {
                 // do not unhighlight column if right-clicking
                if ($el.closest('.selectedCell').length > 0 &&
                    event.which !== 3) {
                    if (notDropDown) {
                        TblManager._unhighlightColumn($editableHead);
                        return;
                    }
                } else {
                    TblManager.highlightColumn($editableHead, true, false);
                }
            } else if (event.shiftKey) {
                if (lastSelectedCell && lastSelectedCell.length > 0) {
                    const preColNum: number = ColManager.parseColNum(lastSelectedCell);
                    const lowNum: number = Math.min(preColNum, colNum);
                    const highNum: number = Math.max(preColNum, colNum);
                    const select: boolean = !$el.closest('th').hasClass('selectedCell');

                    // do not unhighlight column if right-clicking
                    if (!(event.which === 3 && !select)) {
                        for (let i = lowNum; i <= highNum; i++) {
                            const $th: JQuery = $table.find('th.col' + i);
                            const $col: JQuery = $th.find('.editableHead');
                            if ($col.length === 0) {
                                continue;
                            }

                            if (select) {
                                TblManager.highlightColumn($col, true, false);
                            } else if (notDropDown) {
                                TblManager._unhighlightColumn($col);
                            }
                        }
                    }
                }
            } else {
                if ($el.closest('.selectedCell').length > 0) {
                    // when not on dropdown and is left click
                    if (notDropDown && event.which === 1) {
                        TblManager.highlightColumn($editableHead, false, false);
                        lastSelectedCell = null;
                    } else {
                        TblManager.highlightColumn($editableHead, true, false);
                    }
                } else {
                    TblManager.highlightColumn($editableHead, false, false);
                    lastSelectedCell = null;
                }
            }

            xcUIHelper.removeSelectionRange();
            lastSelectedCell = $editableHead;
        });

        $thead.contextmenu((event) => {
            const $evTarget: JQuery = $(event.target);
            const $header: JQuery = $evTarget.closest('.header');
            if ($header.length) {
                const $target: JQuery = $header.find('.dropdownBox');
                const click: any = $.Event("click");
                click.rightClick = true;
                click.pageX = event.pageX;
                $target.trigger(click);
                event.preventDefault();
            }
        });

        $thead.on("mousedown", ".sortIcon", (event) => {
            const $th: JQuery = $(event.currentTarget).closest('th');
            TblManager.highlightColumn($th, false, false);
            lastSelectedCell = $th;
        });

        $thead.on("click", ".sortIcon", (event) => {
            const $th: JQuery = $(event.currentTarget).closest("th");
            if (!$th.hasClass("sortable")) {
                return;
            }
            const colNum: number = ColManager.parseColNum($th);
            const table: TableMeta = gTables[tableId];
            if (table == null) {
                return;
            }
            const progCol: ProgCol = table.getCol(colNum);
            const sortedColAlias: string = progCol.getSortedColAlias();
            const keyNames: string[] = table.getKeyName();
            let keyIndex: number = keyNames.indexOf(sortedColAlias);
            let order: XcalarOrderingT = XcalarOrderingT.XcalarOrderingAscending;
            if (keyIndex > -1) {
                var keys = table.backTableMeta.keyAttr;
                if (XcalarOrderingTFromStr[keys[keyIndex].ordering] ===
                    XcalarOrderingT.XcalarOrderingAscending) {
                    order = XcalarOrderingT.XcalarOrderingDescending;
                }
            } else if ($(event.target).closest(".sortDesc").length) {
                order = XcalarOrderingT.XcalarOrderingDescending;
            }
            ColManager.sortColumn([colNum], tableId, order, DagTable.Instance.getBindTabId());
        });

        $thead.find(".rowNumHead").mousedown(() => {
            if ($thead.closest('.modalOpen').length ||
                $("#container").hasClass('columnPicker')
            ) {
                return;
            }
            $thead.find('.editableHead').each((_index, el) => {
                TblManager.highlightColumn($(el), true, false);
            });
        });

        $thead.on("click", ".dropdownBox", (event: any) => {
            const $el: JQuery = $(event.currentTarget);
            const isRightClick: boolean = event.rightClick;
            TblManager._dropboxClickHandler($el, $table, tableId, isRightClick, event.pageX);
        });

        $thead.on('mousedown', '.colGrab', (event) => {
            if (event.which !== 1) {
                return;
            }

            TblAnim.startColResize($(event.currentTarget), event, null);
        });

        $thead.on('mousedown', '.dragArea', (event) => {
            if (event.which !== 1) {
                return;
            }
            if (event.ctrlKey || event.shiftKey || event.metaKey) {
                if ($(event.target).is('.iconHelper')) {
                    return;
                }
            }
            const $target = $(event.currentTarget);
            if ($target.closest(".emptyTable").length) {
                return;
            }
            const $headCol: JQuery = $target.parent().parent();
            TblAnim.startColDrag($headCol, event);
        });

        $thead.on('mousedown', '.editableHead', (event: any) => {
            if (event.which !== 1) {
                return;
            }
            const $el: JQuery = $(event.currentTarget);
            if ($el.closest('.editable').length) {
                return;
            }
            if ($("#container").hasClass('columnPicker')) {
                // not focus when in modal unless bypassModa is true
                return;
            }
            if (isSystemMac && event.ctrlKey) {
                return;
            }

            if ($el.closest(".emptyTable").length) {
                return;
            }
            const headCol: JQuery = $el.closest('th');
            TblAnim.startColDrag(headCol, event);
        });

        $thead.on("keydown", ".editableHead", (event) => {
            const $input: JQuery = $(event.target);
            if (event.which === keyCode.Enter && !$input.prop("disabled")) {
                const colName: string = $input.val().trim();
                const colNum: number = ColManager.parseColNum($input);

                if (colName === "" ||
                    ColManager.checkColName($input, tableId, colNum, null)
                ) {
                    return false;
                } else {
                    StatusBox.forceHide(); // hide previous error mesage if any
                }

                ColManager.renameCol(colNum, tableId, colName);
            }
        });

        $thead.on("blur", ".editableHead", (event) => {
            const $input: JQuery = $(event.target);
            if (!$input.prop("disabled") &&
                $input.closest('.selectedCell').length === 0
            ) {
                $input.val("");
            }
        });

        // listeners on tbody
        $tbody.on("mousedown", "td", (event) => {
            const $td: JQuery = $(event.currentTarget);
            const $el: JQuery = $td.children('.clickable');
            $tbody.closest(".xcTable").find(".selectedCell").removeClass("selectedCell");
            let extraClasses = "";
            if (ModalHelper.isModalOn()) {
                return;
            }
            if (event.which !== 1 || $el.length === 0) {
                return;
            }
            if ($td.hasClass('jsonElement')) {
                TblManager.unHighlightCells();
                if ($(event.target).closest(".pop").length) {
                    return;
                }
            }

            let $table = $tbody.closest(".xcTable");
            const colNum: number = ColManager.parseColNum($td);
            const rowNum: number = RowManager.parseRowNum($td.closest("tr"));
            let isUnSelect: boolean = false;

            xcTooltip.hideAll();
            TblManager._resetColMenuInputs($el);

            let $highlightBoxs: JQuery = $(".highlightBox");
            const otherTIds: object = {};
            $highlightBoxs.each((_index, el) => {
                const $el: JQuery = $(el);
                const cellTId: TableId = $el.data("tableId");
                if (cellTId !== tableId) {
                    otherTIds[cellTId] = true;
                    $el.closest("td").removeClass("highlightedCell");
                    $el.remove();
                }
            });

            for (let tId in otherTIds) {
                gTables[tId].highlightedCells = {};
            }

            $highlightBoxs = $(".highlightBox");

            const singleSelection = () => {
                if ($highlightBoxs.length === 1 &&
                    $td.find('.highlightBox').length > 0)
                {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        TblManager._unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    TblManager.unHighlightCells();
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            };

            const multiSelection = () => {
                // remove old shiftKey and noShiftKey class
                $highlightBoxs.removeClass("shiftKey")
                            .removeClass("noShiftKey");

                if ($td.find('.highlightBox').length > 0) {
                    if ($("#cellMenu").is(":visible")) {
                        // deselect
                        TblManager._unHighlightCell($td);
                        isUnSelect = true;
                    }
                } else {
                    const $jsonElement: JQuery = $highlightBoxs.filter((_index, el) => {
                        return $(el).closest(".jsonElement").length !== 0;
                    });
                    if ($jsonElement.length) {
                        TblManager.unHighlightCells();
                    }
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
            };

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey)
            {
                // ctrl key: multi selection
                multiSelection();
            } else if (event.shiftKey) {
                // shift key: multi selection from minIndex to maxIndex
                const $lastNoShiftCell: JQuery = $highlightBoxs.filter((_index, el) => {
                    return $(el).hasClass("noShiftKey");
                });

                if ($lastNoShiftCell.length === 0) {
                    singleSelection();
                } else {
                    const lastColNum: number = $lastNoShiftCell.data("colNum");
                    if (lastColNum !== colNum) {
                        // when colNum changes
                        multiSelection();
                    } else {
                        // re-hightlight shift key cell
                        $highlightBoxs.each((_index, el) => {
                            const $el: JQuery = $(el);
                            if ($el.hasClass("shiftKey")) {
                                TblManager._unHighlightCell($el);
                            }
                        });

                        const $curTable: JQuery = $td.closest(".xcTable");
                        const baseRowNum: number = $lastNoShiftCell.data("rowNum");

                        const minIndex: number = Math.min(baseRowNum, rowNum);
                        const maxIndex: number = Math.max(baseRowNum, rowNum);
                        for (let r = minIndex; r <= maxIndex; r++) {
                            const $cell: JQuery = $curTable.find(".row" + r + " .col" + colNum);
                            // in case double added hightlight to same cell
                            TblManager._unHighlightCell($cell);

                            if (r === baseRowNum) {
                                TblManager.highlightCell($cell, tableId, r, colNum);
                            } else {
                                TblManager.highlightCell($cell, tableId, r, colNum, {
                                    "isShift": true,
                                    "jsonModal": false
                                });
                            }
                        }
                    }
                }
            } else {
                // select single cell
                singleSelection();
            }

            if ($table.hasClass("noOperation")) {
                extraClasses += " noOperation";
            }
            if ($table.hasClass("fromSQL")) {
                extraClasses += " fromSQL";
            }

            MenuHelper.dropdownOpen($el, $("#cellMenu"), {
                "colNum": colNum,
                "rowNum": rowNum,
                "classes": "tdMenu" + extraClasses, // specify classes to update colmenu's class attr
                "mouseCoors": {"x": event.pageX, "y": event.pageY},
                "shiftKey": event.shiftKey,
                "isMultiCol": TblManager._isMultiColumn(),
                "isUnSelect": isUnSelect,
                "floating": true
            });
        });

        let clicks: number = 0;
        let dblClickTimer: number;
        let $lastTd: JQuery;

        // used for double clicks
        $tbody.on("mousedown", "td", (event) => {
            if (event.which !== 1) {
                return;
            }

            const $td: JQuery = $(event.currentTarget);
            if ($("#container").hasClass("formOpen") &&
                !$td.hasClass("jsonElement")) {
                // no json modal for regular tds if form is open
                return;
            }

            clicks++;
            if (clicks === 2 && $td.is($lastTd)) {
                clicks = 0;
                clearTimeout(dblClickTimer);
                const colNum: number = ColManager.parseColNum($td);
                if (colNum === 0 || colNum == null) {
                    return;
                }
                const progCol: ProgCol = gTables[tableId].getCol(colNum);
                const type: ColumnType = progCol.getType();
                let showModal: boolean = false;
                if (type === ColumnType.object || type === ColumnType.array ||
                    $td.hasClass("truncated")) {
                    showModal = true;
                } else if (type === ColumnType.mixed) {
                    const cellType: ColumnType = ColManager.getCellType($td, tableId);
                    if (cellType === ColumnType.object ||
                        cellType === ColumnType.array) {
                        showModal = true;
                    }
                }
                if (showModal) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                    JSONModal.Instance.show($td, {type: type});
                }
            } else {
                clicks = 1;
                $lastTd = $td;
                dblClickTimer = window.setTimeout(() => {
                    clicks = 0;
                }, 500);
            }
        });

        if ($tbody[0] != null) {
            let el: HTMLElement = <HTMLElement>$tbody[0];
            el.oncontextmenu = (event) => {
                const $el: JQuery = $(event.target);
                const $td: JQuery = $el.closest("td");
                const $div: JQuery = $td.children('.clickable');
                const isDataTd: boolean = $td.hasClass('jsonElement');
                if ($div.length === 0) {
                    // when click sth like row marker cell, rowGrab
                    return false;
                }
                if ($("#container").hasClass('columnPicker') ||
                    ModalHelper.isModalOn()
                ) {
                    $el.trigger('click');
                    // not focus when in modal
                    return false;
                }

                let $table = $tbody.closest(".xcTable");
                const colNum: number = ColManager.parseColNum($td);
                const rowNum: number = RowManager.parseRowNum($td.closest("tr"));

                xcTooltip.hideAll();
                TblManager._resetColMenuInputs($el);

                if ($td.find(".highlightBox").length === 0) {
                    // same as singleSelection()
                    TblManager.unHighlightCells();
                    TblManager.highlightCell($td, tableId, rowNum, colNum);
                }
                let extraClasses = "";
                if ($table.hasClass("noOperation")) {
                    extraClasses += " noOperation"
                }
                if ($table.hasClass("fromSQL")) {
                    extraClasses += " fromSQL";
                }

                MenuHelper.dropdownOpen($div, $("#cellMenu"), {
                    "colNum": colNum,
                    "rowNum": rowNum,
                    "classes": "tdMenu" + extraClasses, // specify classes to update colmenu's class attr
                    "mouseCoors": {"x": event.pageX, "y": event.pageY},
                    "isMultiCol": TblManager._isMultiColumn(),
                    "isDataTd": isDataTd,
                    "floating": true
                });

                return false;
            };
        } else {
            console.error("set up table col listeners error!");
        }

        $thead.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });
    }

    private static _unHighlightCell($td: JQuery): void {
        if (!$td.hasClass("highlightedCell")) {
            return;
        }
        $td.removeClass("highlightedCell");
        $td.find(".highlightBox").remove();
        const tableId: TableId = TblManager.parseTableId($td.closest(".xcTable"));
        const colNum: number = ColManager.parseColNum($td);
        const rowNum: number = RowManager.parseRowNum($td.closest("tr"));
        const cells: object = gTables[tableId].highlightedCells;

        if (cells[rowNum]) {
            delete cells[rowNum][colNum];
            if ($.isEmptyObject(cells[rowNum])) {
                delete cells[rowNum];
            }
        }
    }

    private static _dropboxClickHandler($el: JQuery, $table: JQuery, tableId: TableId,
            isRightClick: boolean, pageX?: number) {
        if (ModalHelper.isModalOn()) {
            // not focus when in modal
            return;
        }
        if ($table.hasClass("noOperation")) {
            return;
        }
        const $th: JQuery = $el.closest("th");

        const colNum: number = ColManager.parseColNum($th);
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("no table meta");
            return;
        }
        const progCol: ProgCol = table.getCol(colNum);
        const colType: ColumnType = progCol.getType();
        let isNewCol: boolean = false;

        xcTooltip.hideAll();
        TblManager._resetColMenuInputs($el);
        const options = {
            colNum: colNum,
            classes: $el.closest('.header').attr('class'),
            multipleColNums: null,
            mouseCoors: null,
            offsetX: null
        };

        if ($th.hasClass('indexedColumn')) {
            options.classes += " type-indexed";
            const keys: {name: string, ordering: string}[] = table.getKeys();
            const sortedColAlias: string = progCol.getSortedColAlias();
            const index: {name: string, ordering: string} = keys.find((k) => {
                return k.name === sortedColAlias;
            });
            const order: string = index.ordering;
            if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]) {
                options.classes += " sortedAsc";
            } else if (order === XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                options.classes += " sortedDesc";
            }
        }

        if ($th.hasClass('dataCol')) {
            $('.selectedCell').removeClass('selectedCell');
        }

        if ($th.hasClass('newColumn') ||
            options.classes.indexOf('type') === -1) {
            options.classes += " type-newColumn";
            isNewCol = true;
            if ($el.closest('.flexWrap').siblings('.editable').length) {
                options.classes += " type-untitled";
            }
        }
        if ($th.hasClass("userHidden")) {
            // column is hidden
            options.classes += " type-hidden";
        }

        if ($el.closest('.xcTable').hasClass('emptyTable')) {
            options.classes += " type-emptyTable";
        }

        options.classes += " textAlign" + progCol.textAlign;
        if (progCol.format) {
            options.classes += " format-" + progCol.format;
        }

        options.classes += " sizedTo" + progCol.sizedTo;

        if ($('th.selectedCell').length > 1) {
            options.classes += " type-multiColumn";
            options.multipleColNums = [];
            const types: object = {};
            let tempType: string = "type-" + colType;
            types[tempType] = true;

            let hiddenDetected: boolean = false;
            $('th.selectedCell').each((_index, el) => {
                const $el: JQuery = $(el);
                const tempColNum: number = ColManager.parseColNum($el);
                options.multipleColNums.push(tempColNum);
                if (!hiddenDetected && $el.hasClass("userHidden")) {
                    hiddenDetected = true;
                    options.classes += " type-hidden";
                }

                tempType = "type-" + table.getCol(tempColNum).getType();
                if (!types.hasOwnProperty(tempType)) {
                    types[tempType] = true;
                    options.classes += " " + tempType;
                }
            });
        } else {
            options.classes += " type-singleColumn";
        }

        if ($table.hasClass("fromSQL")) {
            options.classes += " fromSQL";
        }

        if (isRightClick) {
            options.mouseCoors = {
                "x": pageX,
                "y": $el.offset().top + 34
            };
        } else {
            options.offsetX = 5;
        }
        const colMenu: ColMenu = TableComponent.getMenu().getColMenu();
        colMenu.setUnavailableClassesAndTips(colType, isNewCol);
        const $menu: JQuery = $("#colMenu");
        MenuHelper.dropdownOpen($el, $menu, options);
    }

    private static _resetColMenuInputs($el: JQuery): void {
        const tableId: TableId = TblManager.parseTableId($el.closest('.xcTableWrap'));
        const $menu: JQuery = $('#colMenu-' + tableId);
        $menu.find('.gb input').val("groupBy");
        $menu.find('.numFilter input').val(0);
        $menu.find('.strFilter input').val("");
        $menu.find('.mixedFilter input').val("");
        $menu.find('.regex').next().find('input').val("*");
    }

    private static _unhighlightColumn($el: JQuery): void {
        const colNum: number = ColManager.parseColNum($el);
        const tableId: TableId = TblManager.parseTableId($el.closest('.dataTable'));
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.find('th.col' + colNum).removeClass('selectedCell');
        $table.find('td.col' + colNum).removeClass('selectedCell');
    }

    /**
     * TblManager.generateTheadTbody
     * @param tableId
     */
    public static generateTheadTbody(tableId: TableId): string {
        const table: TableMeta = gTables[tableId];
        let newTableHtml: string =
            '<thead>' +
              '<tr>' +
                '<th style="width: 46px;" class="col0 th rowNumHead">' +
                  '<div class="header">' +
                    '<input value="" spellcheck="false" disabled title="' +
                    TooltipTStr.SelectAllColumns + '" ' +
                    'data-toggle="tooltip"' +
                    ' data-placement="auto top" data-container="body">' +
                  '</div>' +
                '</th>';

        const numCols: number = table.getNumCols();
        for (let colNum = 1; colNum <= numCols; colNum++) {
            const progCol: ProgCol = table.getCol(colNum);
            if (progCol.isDATACol()) {
                let width: number | string;
                let thClass: string = "";
                if (progCol.hasMinimized()) {
                    width = gHiddenColumnWidth;
                    thClass = " userHidden";
                } else {
                    width = progCol.getWidth();
                }
                if (!progCol.hasMinimized() && <string>width === 'auto') {
                    width = 400;
                }
                newTableHtml += TblManager._generateDataHeadHTML(colNum, thClass, width);
            } else {
                newTableHtml += TblManager.getColHeadHTML(colNum, tableId);
            }
        }

        newTableHtml += '</tr></thead><tbody></tbody>';

        return newTableHtml;
    }

    private static _generateDataHeadHTML(
        colNum: number,
        thClass: string,
        width: number | string
    ): string {
        const newTable: string =
            '<th class="col' + colNum + ' th dataCol' + thClass + '" ' +
                'style="width:' + width + 'px;">' +
                '<div class="header type-data">' +
                    '<div class="dragArea"></div>' +
                    '<div class="colGrab"></div>' +
                    '<div class="flexContainer flexRow">' +
                        '<div class="flexWrap flex-left"></div>' +
                        '<div class="flexWrap flex-mid">' +
                            '<input value="DATA" spellcheck="false" ' +
                                ' class="dataCol col' + colNum + '"' +
                                ' data-container="body"' +
                                ' data-toggle="tooltip" data-placement="auto top" ' +
                                '" title="raw data" disabled>' +
                        '</div>' +
                        '<div class="flexWrap flex-right">' +
                            '<div class="dropdownBox" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + TooltipTStr.ViewColumnOptions +
                                '">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</th>';

        return newTable;
    }

    private static _isMultiColumn(): boolean {
        let tableName;
        const isSqlTable: boolean = !$("#sqlTableArea").hasClass("dagTableMode");
        if (isSqlTable) {
            let sqlTable = SQLResultSpace.Instance.getSQLTable();
            if (sqlTable) {
                tableName = sqlTable.getTable();
            }
        } else {
            tableName = DagTable.Instance.getTable();
        }
        let tableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];
        if (!table) {
            return false;
        }

        let lastColNum: number;
        let multiCol: boolean = false;
        for (let row in table.highlightedCells) {
            for (let colNum in table.highlightedCells[row]) {
                if (lastColNum == null) {
                    lastColNum = Number(colNum);
                } else if (lastColNum !== Number(colNum)) {
                    multiCol = true;
                    break;
                }
            }
        }
        return multiCol;
    }

    /* Unit Test Only */
    public static __testOnly__ = (function() {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            return {
                vefiryTableType: TblManager._verifyTableType,
                setTablesToReplace: TblManager._setTablesToReplace,
                tagOldTables: TblManager._tagOldTables,
                removeOldTables: TblManager._removeOldTables,
                dropboxClickHandler: TblManager._dropboxClickHandler
            }
        }
    }());
    /* End Of Unit Test Only */
}

interface CentFocusedTableOptions {
    onlyIfOffScreen: boolean;
    alignLeft: boolean;
    noClear: boolean;
}