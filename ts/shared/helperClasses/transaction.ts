namespace Transaction {
    const txCache = {};
    const canceledTxCache = {};
    const disabledCancels = {};
    let txIdCount = 1;
    let isDeleting = false;
    let _saveDelay: number = 1000;
    let _hasPendingSave: boolean = false;

    const has_require = (typeof require !== "undefined" && typeof nw === "undefined");

    export interface TransactionStartOptions {
        operation?: string,
        msg?: string,
        simulate?: boolean,
        sql?: SQLInfo,
        track?: boolean,
        steps?: number,
        cancelable?: boolean,
        exportName?: string,
        nodeIds?: DagNodeId[],
        trackDataflow?: boolean,
        tabId?: string,
        parentTxId?: number,
        udfUserName?: string;
        udfSessionName?: string;
        queryMeta?: string;
        parentNodeInfo?: DagTagInfo
    }

    export interface TransactionDoneOptions {
        noNotification?: boolean,
        msgTable?: TableId,
        msgOptions?: object,
        noCommit?: boolean,
        noLog?: boolean,
        sql?: object,
        title?: string,
        queryStateOutput?: any
    }

    export interface TransactionFailOptions {
        failMsg?: string,
        sql?: SQLInfo,
        error?: string,
        title?: string,
        noAlert?: boolean,
        queryStateOutput?: any
        noNotification?: boolean
    }

    export interface TransactionCancelOptions {
        sql?: SQLInfo,
        title?: string
    }

    interface TXLogOptions {
        curId: number;
        msgId?: number;
        operation: string;
        sql?: SQLInfo;
        nodeIds?: DagNodeId[];
        trackDataflow?: boolean;
        tabId?: string;
        parentTxId?: number;
        udfUserName?: string;
        udfSessionName?: string;
        parentNodeInfo?: DagTagInfo;
    }

    // tx is short for transaction
   export class TXLog {
        curId: number;
        msgId: number;
        operation: string;
        cli: string;
        sql: SQLInfo;
        nodeIds: DagNodeId[];
        trackDataflow?: boolean;
        tabId: string;
        parentTxId: number;
        udfUserName?: string;
        udfSessionName?: string;
        currentNodeInfo?: DagTagInfo;
        parentNodeInfo?: DagTagInfo;
        cachedTables: Map<string, string>;
        queries: Map<string, string>;
        currentNodeName?: string;
        parentNodeName?: string;

        constructor(options: TXLogOptions) {
            this.curId = options.curId;
            this.msgId = options.msgId || null;
            this.operation = options.operation;
            this.cli = "";
            this.sql = options.sql || null;
            this.nodeIds = options.nodeIds || null;
            this.trackDataflow = options.trackDataflow || false;
            this.tabId = options.tabId || null;
            this.parentTxId = options.parentTxId || null;
            this.udfUserName = options.udfUserName;
            this.udfSessionName = options.udfSessionName;
            this.cachedTables = new Map();
            this.parentNodeInfo = options.parentNodeInfo;
        }


        getMsgId(): number {
            return this.msgId;
        }

        getCli(): string {
            return this.cli;
        }

        getSQL(): SQLInfo {
            return this.sql;
        }

        getOperation(): string {
            return this.operation;
        }

        addCli(cli: string): void {
            this.cli += cli;
            if (cli.slice(-1) !== "," && cli !== "") {
                this.cli += ",";
            }
        }

        setCurrentNodeInfo(nodeId: DagNodeId, tabId: string): void {
            this.currentNodeInfo = { nodeId, tabId };
        }

        resetCurrentNodeInfo(): void {
            delete this.currentNodeInfo;
        }

        setParentNodeInfo(nodeId: DagNodeId, tabId: string): void {
            this.parentNodeInfo = { nodeId, tabId };
        }

        resetParentNodeInfo(): void {
            delete this.parentNodeInfo;
        }

        setStoredQueryDest(nodeId: string, tabId: string, destTable: string) {
            let key = nodeId + "#" + tabId;
            this.cachedTables.set(key, destTable);
        }

        getStoredQueryDest(nodeId: string, tabId: string): string {
            let key = nodeId + "#" + tabId;
            return this.cachedTables.get(key);
        }
    }

    // if you want to track the transaction in the monitor panel, pass in
    // "track" in options with a value of true
    /**
     * Transaction.start
     * @param options
     */
    export function start(options: TransactionStartOptions): number {
        options = options || {};

        let msgId: number;
        let operation: string = options.operation;

        if (options.msg != null) {
            msgId = StatusMessage.addMsg({
                "msg": options.msg,
                "operation": operation
            });
        }

        let curId: number = txIdCount;
        if (options.simulate) {
            curId = curId + 0.5; // use float to mark simulate case
        }

        const txLog = new TXLog({
            "curId": curId,
            "msgId": msgId,
            "operation": operation,
            "sql": options.sql,
            "nodeIds": options.nodeIds,
            "trackDataflow": options.trackDataflow,
            "tabId": options.tabId,
            "parentTxId": options.parentTxId,
            "udfUserName": options.udfUserName,
            "udfSessionName": options.udfSessionName,
            "parentNodeInfo": options.parentNodeInfo
        });

        txCache[curId] = txLog;

        let numSubQueries: number;
        if (!has_require && options.track) {
            if (!isNaN(options.steps) || options.steps < 1) {
                numSubQueries = options.steps;
            } else {
                numSubQueries = -1;
            }
            if (options.sql && options.sql.retName) {
                operation += " " + options.sql.retName;
            }
            const queryOptions: QueryManager.AddQueryOptions = {
                numSteps: numSubQueries,
                cancelable: options.cancelable,
                exportName: options.exportName,
                srcTables: getSrcTables(options.sql),
                queryMeta: options.queryMeta,
                dataflowId: options.tabId
            };

            QueryManager.addQuery(curId, operation, queryOptions);
        }

        txIdCount++;
        return curId;
    };

    /**
     * Transaction.update
     * @param txId
     * @param queryStateOutput
     */
    export function update(txId: number, queryStateOutput: any): void {
        if (!isValidTX(txId) || Transaction.isSimulate(txId)) {
            return;
        }
        if (!has_require) {
            const txLog: TXLog = txCache[txId] || canceledTxCache[txId];
            if (txLog && txLog.trackDataflow) {
                try {
                    DagViewManager.Instance.updateDFProgress(txLog.tabId, queryStateOutput);
                    const parentTxId: number = txLog.parentTxId;
                    if (parentTxId != null) { // if this query is nested inside a custom node
                        Transaction.update(parentTxId, queryStateOutput);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    export function get(txId: number): TXLog {
        return txCache[txId] || {};
    }

    /**
     * Transaction.getRootTx
     * @param txId
     */
    export function getRootTx(txId): TXLog {
        let parentTxId = _getParentTxId(txId);

        function _getParentTxId(txId) {
            let isValid = isValidTX(txId);
            if (!isValid) {
                return null;
            }
            const txLog = Transaction.get(txId);
            if (txLog.parentTxId != null) {
                return _getParentTxId(txLog.parentTxId);
            } else {
                return txId;
            }
        }
        if (isValidTX(parentTxId)) {
            return Transaction.get(parentTxId);
        } else {
            return null;
        }
    }

    /**
     * Transaction.done
     * @param txId
     * @param options
     */
    export function done(txId: number, options?: TransactionDoneOptions): string | null {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            // if canceled, Transaction.cancel already took care of the cleanup
            // and messages
            if (!has_require) {
                QueryManager.cleanUpCanceledTables(txId);
            }
            return;
        }

        options = options || {};

        const txLog: TXLog = txCache[txId];
        // add success msg
        const msgId = txLog.getMsgId();

        if (msgId != null && !has_require) {
            const noNotification: boolean = options.noNotification || false;
            const tableId: TableId = options.msgTable;
            const msgOptions: object = options.msgOptions;
            StatusMessage.success(msgId, noNotification, tableId, msgOptions);
        }

        // add sql
        const willCommit = !options.noCommit;
        const cli: string = txLog.getCli();
        let title: string = options.title || txLog.getOperation();
        title = xcStringHelper.capitalize(title);
        // if has new sql, use the new one, otherwise, use the cached one
        const sql: SQLInfo = options.sql || txLog.getSQL();
        if (options.noLog) {
            if (typeof mixpanel !== "undefined") {
                xcMixpanel.transactionLog({
                    title: title,
                    info: sql,
                    cli: cli
                });
            }
        } else if (!has_require) {
            Log.add(title, sql, cli, willCommit);
        }

        if (!has_require) {
            QueryManager.queryDone(txId);

            // check if we need to update monitorGraph's table usage
            const dstTables: string[] = QueryManager.getAllDstTables(txId);
            let hasTableChange = false;
            for (let i = 0; i < dstTables.length; i++) {
                if (dstTables[i].indexOf(gDSPrefix) === -1) {
                    hasTableChange = true;
                    break;
                }
            }
            // XcalarDeleteTable also triggers tableUsageChange
            if (hasTableChange && typeof MonitorPanel !== "undefined") {
                MonitorPanel.tableUsageChange();
            }
        }

        // remove transaction
        removeTX(txId);
        if (canceledTxCache[txId]) {
            canceledTxCache[txId] = {}; // removes any meta
        }
        // commit
        if (willCommit && !has_require) {
            // will wait before commiting. Any additional commit calls made
            // from Transaction.done during wait period will be ignored
            if (!_hasPendingSave) {
                setTimeout(() => {
                    _hasPendingSave = false;
                    KVStore.commit();
                }, _saveDelay);
            }
            _hasPendingSave = true;
        }

        transactionCleaner();
        if (Transaction.isSimulate(txId)) {
            return txLog.getCli();
        } else {
            return null;
        }
    };

    /**
     * Transaction.fail
     * @param txId
     * @param options
     */
    export function fail(txId: number, options?: TransactionFailOptions): string | null {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            // transaction failed due to a cancel
            if (!has_require) {
                QueryManager.cleanUpCanceledTables(txId);
            }
            return;
        }

        options = options || {};

        const txLog: TXLog = txCache[txId];
        // add fail msg
        const msgId: number = txLog.getMsgId();
        const failMsg: string = options.failMsg;

        if (msgId != null) {
            let srcTableId = null;
            if (options && options.sql && options.sql.tableId) {
                srcTableId = options.sql.tableId;
            }
            if (!has_require) {
                if (options.noNotification) {
                    StatusMessage.remove(msgId);
                } else {
                    StatusMessage.fail(failMsg, msgId, srcTableId);
                }
            }
        }

        // add error sql
        let error: string | any = options.error;
        const sql: SQLInfo = options.sql || txLog.getSQL();
        const cli: string = txLog.getCli(); //
        let title: string = options.title || failMsg;
        if (!title) {
            title = txLog.getOperation();
        }
        title = xcStringHelper.capitalize(title);

        if (error && error["node"] && typeof error["node"] === "object") {
            error = {...error};
            delete error["node"];
        }

        if (!has_require) {
            Log.errorLog(title, sql, cli, error);
            QueryManager.fail(txId, error);

            // add alert(optional)
            if (!options.noAlert) {
                const alertTitle = failMsg || CommonTxtTstr.OpFail;
                Alert.error(alertTitle, error);
            }
        }

        transactionCleaner();
        removeTX(txId);
        if (canceledTxCache[txId]) {
            canceledTxCache[txId] = {}; // removes any meta
        }

        if (Transaction.isSimulate(txId)) {
            console.warn("simuldate in fail", cli);
            return cli;
        } else {
            return null;
        }
    };

    /**
     * Transaction.disableCancel
     * @param txId
     */
    export function disableCancel(txId): void {
        // when a replaceTable is called in the worksheet, we disable the
        // ability to cancel because it's too late at this point
        if (isValidTX(txId)) {
            disabledCancels[txId] = true;
            // this is used in Transaction.isCancelable to check if a transaction
            // can be canceled
        }
    };

    /**
     * Transaction.isCancelable
     * @param txId
     */
    export function isCancelable(txId): boolean {
        return (isValidTX(txId) && !disabledCancels.hasOwnProperty(txId));
    };

    /**
     * Transaction.isSimulate
     * @param txId
     */
    export function isSimulate(txId: number): boolean {
        return (txId && !Number.isInteger(txId));
    };

    /**
     * Transaction.cancel
     * @param txId
     * @param options
     */
    export function cancel(txId: number, options?: TransactionCancelOptions): void {
        if (!isValidTX(txId)) {
            return;
        }
        if (txId in canceledTxCache) {
            console.error("cancel on transaction " + txId + " already done.");
            return;
        }
        options = options || {};

        const txLog: TXLog = txCache[txId];
        // cancel msg
        const msgId: number = txLog.getMsgId();
        if (msgId != null) {
            StatusMessage.cancel(msgId);
        }

        // add sql
        // We always commit when there is a cancel.
        // Usually the operations that have a noCommit option are
        // front end operations that don't even have a cancel option.
        // And we actually don't know if we should commit
        // when transactions.cancel() is called.
        const willCommit = true;
        const cli: string = txLog.getCli();

        if (cli !== "") {
            // if cli is empty, no need to log
            const sql: SQLInfo = options.sql || txLog.getSQL();
            let title: string = options.title || txLog.getOperation();
            title = xcStringHelper.capitalize(title);

            Log.errorLog(title, sql, cli, SQLType.Cancel);
        }

        cancelTX(txId);
        removeTX(txId);

        QueryManager.confirmCanceledQuery(txId);

        // commit
        if (willCommit && !has_require) {
            KVStore.commit();
        }

        transactionCleaner();
    };


    // dstTableName is optional - only needed to trigger subQueryDone
    /**
     * Transaction.log
     * @param txId
     * @param query
     * @param dstTableName
     * @param timeObj
     * @param options
     */
    export function log(txId: number, query: string, dstTableName?: string, timeObj?, options?): void {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            return;
        }

        const tx: TXLog = txCache[txId];
        tx.addCli(query);

        if (!has_require && (dstTableName || timeObj != null)) {
            QueryManager.subQueryDone(txId, dstTableName, timeObj, options);
        }
    }

    /**
     * Transaction.startSubQuery
     * @param txId
     * @param name
     * @param dstTable
     * @param query
     * @param options
     */
    export function startSubQuery(
        txId: number,
        name: string,
        dstTable: string,
        query: string,
        options?
    ): void {
        if (has_require) {
            return;
        }
        if (!isValidTX(txId)) {
            return;
        }
        options = options || {};
        const subQueries = QueryManager.parseQuery(query);
        if (dstTable && subQueries.length === 1 && !options.retName) {
            options.exportFileName = subQueries[0].exportFileName;
            QueryManager.addSubQuery(txId, name, dstTable, query, options);
        } else if (subQueries.length) {
            if (options.retName) {
                options.queryName = dstTable;
            } else {
                options.queryName = name;
            }
            for (let i = 0; i < subQueries.length; i++) {
                QueryManager.addSubQuery(txId, subQueries[i].name,
                                            subQueries[i].dstTable,
                                            subQueries[i].query, options);
            }
        }
    }

    /**
     * Transaction.checkCanceled
     * @param txId
     */
    export function checkCanceled(txId): boolean {
        return (txId in canceledTxCache);
    }

    /**
     * Transaction.cleanUpCanceledTables
     * @param txId
     */
    export function cleanUpCanceledTables(txId): void {
        if (!has_require) {
            QueryManager.cleanUpCanceledTables(txId);
        }
    }

    /**
     * Transaction.getCache
     */
    export function getCache(id?: number): {[key: string]: TXLog} {
        if (id == null) {
            return txCache;
        } else {
            return txCache[id];
        }
    }

    /**
     * Transaction.getParentNodeInfos
     * @param txId
     */
    export function getParentNodeInfos(txId: number): DagTagInfo[] {
        let nodeInfos: DagTagInfo[] = [];
        const txLog = Transaction.get(txId);
        if (!txLog) {
            return nodeInfos;
        }

        if (txLog.parentNodeInfo) {
            nodeInfos = [txLog.parentNodeInfo];
        }
        if (txLog.parentTxId) {
            nodeInfos = [
                ...Transaction.getParentNodeInfos(txLog.parentTxId),
                ...nodeInfos
            ];
        }
        return nodeInfos;
    }

    function isValidTX(txId: number): boolean {
        if (txId == null) {
            console.error("transaction does't exist!");
            return false;
        }
        if (!txCache.hasOwnProperty(txId) &&
            !canceledTxCache.hasOwnProperty(txId)) {
            console.error("transaction does't exist!");
            return false;
        }

        return true;
    }

    function cancelTX(txId: number): void {
        canceledTxCache[txId] = txCache[txId] || {};
    }

    function removeTX(txId: number): void {
        delete disabledCancels[txId];
        delete txCache[txId];
    }

    function transactionCleaner(): void {
        if (!has_require && gAlwaysDelete && !isDeleting) {
            isDeleting = true;

            TblManager.refreshOrphanList()
            .then(function() {
                console.info("drop", gOrphanTables);
                return TblManager.deleteTables(gOrphanTables, TableType.Orphan, true, false);
            })
            .fail(function(error) {
                console.error("drop table failed", error);
            })
            .always(function() {
                isDeleting = false;
            });
        }
    }

    // only used to determine which tables to unlock when canceling
    function getSrcTables(sql: SQLInfo): string[] {
        const tables = [];
        if (!sql) {
            return tables;
        }
        if (sql.srcTables) {
            for (let i = 0; i < sql.srcTables.length; i++) {
                tables.push(sql.srcTables[i]);
            }
        } else if (sql.tableName) {
            tables.push(sql.tableName);
        } else if (sql.tableNames) {
            for (let i = 0; i < sql.tableNames.length; i++) {
                tables.push(sql.tableNames[i]);
            }
        } else if (sql.tableId != null && gTables[sql.tableId]) {
            tables.push(gTables[sql.tableId].getName());
        } else if (sql.lTableName) {
            tables.push(sql.lTableName);
            if (sql.rTableName && sql.rTableName !== sql.lTableName) {
                tables.push(sql.rTableName);
            }
        }
        return tables;
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.getAll = function() {
            return {
                txCache: txCache,
                canceledTxCache: canceledTxCache,
                disabledCancels: disabledCancels,
                txIdCount: txIdCount,
                isDeleting: isDeleting
            };
        };
        __testOnly__.transactionCleaner = transactionCleaner;
        __testOnly__.getSrcTables = getSrcTables;
    }
}
if (typeof exports !== "undefined") {
    exports.Transaction = Transaction;
}