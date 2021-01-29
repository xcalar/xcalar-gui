class DagTblManager {
    private clockLimit;
    private cache: {[key: string]: DagTblCacheInfo};
    private _kvStore: KVStore;
    private timer: number;
    private timerDisabled: boolean;
    // The interval determines how fast tables are deleted, locked, or reset.
    // A lower interval will cause more kvstore interactions but will keep the cache as up-to-date
    // as possible. A low interval can be compensated with a higher clockLimit.
    private interval: number;
    private configured: boolean;
    // Wire in reading a heuristic/setting for how many times we retry

    private static _instance: DagTblManager;
    public static get Instance() {
        return this._instance || (this._instance = new DagTblManager(-1));
    }

    public constructor(clockLimit: number) {
        this.clockLimit = clockLimit;
        let key: string = KVStore.getKey("gDagTableManagerKey");
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this.cache = {};
        this.interval = 30000;
        this.configured = false;
        this.timerDisabled = false;
        // disable the sweep
        this.timerDisabled = true
    }

    /**
     * DagTblManager.Instance.setup
     */
    public setup(): XDPromise<void> {
        if (this.configured) {
            return PromiseHelper.resolve();
        }
        if (!WorkbookManager.getActiveWKBK()) {
            const thriftError = thriftLog("Setup", "Invalid Session");
            Log.errorLog("Dag Table Manager", null, null, thriftError);
            return PromiseHelper.reject(thriftError);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((res) => {
            if (res == null) {
                this._kvStore.put("{}", true, true);
                this.cache = {};
            } else {
                this.cache = res;
            }
            return XcalarGetTables("*");
        })
        .then((res: XcalarApiListDagNodesOutputT) => {
                this._synchWithBackend(res);
                this._setSweepInterval(this.interval);
                this.configured = true;
                deferred.resolve();
        })
        .fail((error) => {
            console.error(AlertTStr.AutoTblManagerError, error);
            this.configured = false;
            this.cache = {};
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     * DagTblManager.Instance.disableTimer
     * Disables the sweep timer. Do not do this unless you are totally sure about it.
     */
    public disableTimer(): void {
        this.timerDisabled = true;
        window.clearInterval(this.timer);
    }

    /**
     * DagTblManager.Instance.setClockTimeout
     * Sets clocklimit
     * @param limit Number of timeouts before a table is deleted.
     */
    public setClockTimeout(limit: number): void {
        if (!this.configured) {
            return;
        }
        this.clockLimit = limit;
    }

    /**
     * DagTblManager.Instance.sweep
     * Does one sweep through the cache.
     * A sweep raises clockCount and deals with marked flags.
     * If clockCount == limit, an object is deleted.
     */
    public sweep(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured || !WorkbookManager.getActiveWKBK()) {
            return PromiseHelper.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            let toDelete: string[] = [];
            let cacheInfo: DagTblCacheInfo;
            Object.keys(this.cache).forEach((key) => {
                cacheInfo = this.cache[key];
                if (cacheInfo.markedForReset) {
                    cacheInfo.clockCount = 0;
                    cacheInfo.markedForReset = false;
                } else {
                    cacheInfo.clockCount++;
                }

                if ((this.clockLimit != -1 &&
                        cacheInfo.clockCount >= this.clockLimit &&
                        !cacheInfo.locked) ||
                        cacheInfo.markedForDelete) {
                    delete this.cache[key];
                    toDelete.push(key);
                }
            });
            return this._queryDelete(toDelete);
        })
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Adds a table to the table cache
     * @param name Table name
     */
    public addTable(name: string): void {
        if (!this.configured) {
            return;
        }
        this.cache[name] = {
            name: name,
            locked: false,
            markedForReset: false,
            markedForDelete: false,
            clockCount: 0,
            timestamp: xcTimeHelper.getCurrentTimeStamp()
        };
    }

    /**
     * Resets a table's clock count to 0. Should be atomic
     * @param name: name of the table used
     */
    public resetTable(name: string): boolean {
        if (!this.configured || this.cache[name] == null) {
            return false;
        }
        this.cache[name].markedForReset = true;
        this.cache[name].timestamp = xcTimeHelper.getCurrentTimeStamp();
        return true;
    }

    /**
     * DagTblManager.Instance.deleteTable
     * Deletes table(s) (if a regex is specified) from the
     * @param name Table name
     * @param forceDelete if true, deletes locked tables. if false, ignores locked tables
     * @param regEx If true, uses "name" to patternmatch
     */
    public deleteTable(name: string, forceDelete: boolean): string[] {
        if (!this.configured) {
            return [];
        }
        let tablesToDelete = [];
        if (!this.cache[name]) {
            // table deleted through deleteTableModal may not be in this
            // cache so we add it so we can delete it
            this.cache[name] = {
                name: name,
                locked: false,
                markedForReset: false,
                markedForDelete: true,
                clockCount: 0,
                timestamp: -1
            };
            return [name];
        }
        if (!this.cache[name].locked || forceDelete) {
            this.cache[name].markedForDelete = true;
            tablesToDelete.push(name);
        }
        return tablesToDelete;
    }

    // returns list of table names
    public getAllTables(): string[] {
        let tableNames: string[] = [];
        for (let name in this.cache) {
            if (!this.cache[name].markedForDelete) {
                tableNames.push(name);
            }
        }
        return tableNames;
    }

    /**
     * Returns if the table still exists
     * @param name Table name
     */
    public hasTable(name: string): boolean {
        return (this.configured && this.cache[name] != null && !this.cache[name].markedForDelete) ||
            xcHelper.isGlobalTable(name);
    }

    /**
     * DagTblManager.Instance.hasTables
     */
    public hasTables(): boolean {
        return (this.configured && this.cache && Object.keys(this.cache).length > 0);
    }

    /**
     * Returns if the table is pinned
     * @param name Table name
     */
    public isPinned(name: string): boolean {
        return (this.configured && this.cache[name] != null &&
            this.cache[name].locked && !this.cache[name].markedForDelete);
    }

    /**
     * Adds lock on a table
     * @param name Table name
     * @returns {boolean}
     */
    public pinTable(name: string): XDPromise<void> {
        if (!this.configured || this.cache[name] == null || this.cache[name].markedForDelete) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        let wasLocked = this.cache[name].locked;
        this.cache[name].locked = true;
        XcalarPinTable(name)
        .then(() => {
            this.cache[name].locked = true;
            deferred.resolve();
        })
        .fail((e) => {
            this.cache[name].locked = wasLocked;
            deferred.reject(e);
        });
        return deferred.promise();
    }


    /**
     * Removes lock on a table
     * @param name Table name
     * @returns {boolean}
     */
    public unpinTable(name: string): XDPromise<void> {
        if (!this.configured || this.cache[name] == null || this.cache[name].markedForDelete) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        XcalarUnpinTable(name)
        .then(() => {
            this.cache[name].locked = false;
            deferred.resolve();
        })
        .fail((e) => {
            if (e && (e.status === StatusT.StatusDagNodeNotFound ||
                e.status === StatusT.StatusTableNotPinned)) {
                if (this.cache[name]) {
                    this.cache[name].locked = false;
                }
                deferred.resolve();
            } else {
                deferred.reject(e);
            }
        });
        return deferred.promise();
    }

    /**
     * Returns the timestamp for a table.
     * @param name Table name
     * @returns {number}
     */
    public getTimeStamp(name: string): number {
        if (!this.configured || this.cache[name] == null || this.cache[name].markedForDelete) {
            return -1;
        }
        return this.cache[name].timestamp;
    }

    /**
     * Forces a sweep that only deletes tables marked for deletion.
     */
    public forceDeleteSweep(): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return PromiseHelper.resolve();
        }
        let tables: string[] = [];
        for (let key in this.cache) {
            if (this.cache[key].markedForDelete) {
                delete this.cache[key];
                tables.push(key);
            }
        }
        this._queryDelete(tables)
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this._setSweepInterval(this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Clears out the cache of tables.
     * @param force if true, deletes locked tables as well
     */
    public emptyCache(force: boolean): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured) {
            return PromiseHelper.resolve();
        }
        let tables: string[] = [];
        if (force) {
            tables = Object.keys(this.cache);
            this.cache = {};
        } else {
            for (let key in this.cache) {
                if (!this.cache[key].locked) {
                    delete this.cache[key];
                    tables.push(key);
                }
            }
        }
        this._queryDelete(tables)
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this._setSweepInterval(this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /** resets the cache so that all tables have clockCycle of 0.
     * @param removeLocks if true, removes all table locks.
    */
    public forceReset(removeLocks: boolean): XDPromise<void> {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured || !WorkbookManager.getActiveWKBK()) {
            return PromiseHelper.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            Object.keys(this.cache).forEach((name: string) => {
                this.cache[name].clockCount = 0;
                if (removeLocks) {
                    this.cache[name].locked = false;
                }
            });
            let jsonStr: string = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true)
        })
        .then(() => {
            this._setSweepInterval(this.interval);
            deferred.resolve;
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // Tells us if table "table" is safe to delete.
    private _safeToDeleteTable(table: string): boolean {
        const self = DagTblManager.Instance;
        // Mode doesnt matter, an advanced dataflow can run while in sql mode.
        // First, check if it's open as a table in SQL Mode
        if (table == SQLResultSpace.Instance.getShownResultID()) {
            return false;
        }

        // Otherwise, we see if it's part of an active graph.
        const graph: DagGraph = DagViewManager.Instance.getActiveDag();
        if (graph == null) {
            // We havent opened advanced mode yet, or it doesnt have an active graph.
            // Any table starting with table_DF2_ can be deleted
            return table.startsWith("table_DF2_");
        }
        const dagID: string = graph.getTabId();
        const dataflowMatch: RegExp = new RegExp(dagID);
        if (self.cache[table].locked) {
            // Keep locked tables to ensure a consistent lock table usage
            return false;
        }
        // It's safe to delete the table if not in the current dataflow
        // or if it's already marked for deletion
        if (!dataflowMatch.test(table) || self.cache[table].markedForDelete) {
            return true;
        }
        // It's safe to delete the table if
        let info: DagTblCacheInfo = self.cache[table];
        let dagNodeID: string = self._getNodeId(info.name);
        // It's safe to delete the table if made from outside methods
        if (dagNodeID == "") {
            return true;
        }
        if (table.includes(".sql")) {
            // We check if this is a running sql subgraph or not.
            if (graph.getTabId() == dagNodeID) {
                // The active dag graph is a currently executing sql graph.
                // Since we can assume drop as you go, we must be keeping this
                // for later execution.
                return false;
            } else {
                // This sql node has been executed and is an old result set.
                // It's safe to delete.
                return true;
            }
        }

        let node: DagNode;
        node = graph.getNode(dagNodeID);
        if (!node) {
            // node doesn't exist, we can delete the table
            return true;
        }
        if (node.getState() == DagNodeState.Running) {
            // This table should be kept because we are still executing this node
            return false;
        } else if (node.getState() != DagNodeState.Complete) {
            // Table was an error table, or somehow survived a previous purge, so get rid of it
            return true;
        }

        // We know the node was successful, so the table can
        // only be deleted if it won't foreseeably be reused.
        let childrenComplete: boolean = true;
        let children: DagNode[] = node.getChildren();
        for (let i = 0; i < children.length; i++) {
            let child: DagNode = children[i];
            if (child.getState() != DagNodeState.Complete &&
                child.getState() != DagNodeState.Unused) {
                childrenComplete = false;
                break;
            }
        }
        let nodeTable = node.getTable();
        if (childrenComplete) {
            return true;
        }

        if (nodeTable == info.name) {
            // This table will probably be re-used, as it's the "final" table of the node.
            return false;
        }
        let nodeTableInfo = self.cache[nodeTable];
        if (!nodeTableInfo) {
            // Since the info doesnt exist, we're probably going to be
            // re-running this node, we just aren't in the process of re-running yet
            // Thus this table doesnt matter.
            return true;
        }

        // Finally, we check if this table was used in the creation process
        // of its current node, or one of its children. If children, we have to keep
        // it since they are not complete yet. We also keep indexes
        const indexMatch: RegExp = new RegExp(".index");
        return (nodeTableInfo.timestamp > info.timestamp &&
            !indexMatch.test(info.name));
    }

    /**
     * To be used in the case of running out of memory. Deletes all tables except the ones
     * in the current dataflow tab.
     */
    public emergencyClear() {
        window.clearInterval(this.timer);
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!this.configured || !WorkbookManager.getActiveWKBK()) {
            return PromiseHelper.resolve();
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
            this.cache = this.cache || {}; // XXX TODO: check why this.cache can be undefined
            let toDelete: string[] = Object.keys(this.cache).filter(this._safeToDeleteTable);
            toDelete.forEach((key) => {
                delete this.cache[key];
            })
            return this._queryDelete(toDelete);
        })
        .then(() => {
            let jsonStr = JSON.stringify(this.cache);
            return this._kvStore.put(jsonStr, true, true);
        })
        .then(() => {
            this._setSweepInterval(this.interval);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // one use is when a dataflow finishes executing, we
    // sync up with the tables that were created
    public update(): void {
        if (!this.configured) {
            return;
        }
        XcalarGetTables("*")
        .then((res: XcalarApiListDagNodesOutputT) => {
            this._synchWithBackend(res);
        })
        .fail((e) => {
            console.error(e);
        });
    }

     /**
     * Resets the Sweep interval
     * @param interval Number of milliseconds before each sweep happens
     */
    private _setSweepInterval(interval: number): void {
        if (!this.configured || this.timerDisabled) {
            return;
        }
        this.interval = interval;
        window.clearInterval(this.timer);
        this.timer = window.setInterval(() => {DagTblManager.Instance.sweep()}, this.interval);
    }

    /**
     * Updates the cache based off the results from a XcalarGetTables call
     * @param res Tables currently in the backend
     */
    private _synchWithBackend(res: XcalarApiListDagNodesOutputT) {
        const backendTables: Map<string, boolean> = new Map();
        res.nodeInfo.forEach((node: XcalarApiDagNodeInfoT) => {
            backendTables.set(node.name, node.pinned);
        });
        let backTableNames: string[] = [...backendTables.keys()];
        let cacheTableNames: string[] = Object.keys(this.cache);
        let removedTables: string[] = cacheTableNames.filter(x => !backendTables.has(x));
        this._synchGTables(backTableNames);
        removedTables.forEach((name: string) => {
            if (!this.cache[name].markedForDelete) {
                // console.error("The table " + name + " was deleted in a way that XD does not support.");
            }
            delete this.cache[name];
        });
        backendTables.forEach((pinned, name) => {
            if (!this.cache[name]) {
                // add backend tables that are not in the cache
                this.cache[name] = {
                    name: name,
                    clockCount: 0,
                    locked: pinned,
                    markedForDelete: false,
                    markedForReset: false,
                    timestamp: xcTimeHelper.getCurrentTimeStamp()
                };
            } else {
                this.cache[name].locked = pinned;
            }
        });
    }

    // removes tables from gTables that are not in backend
    private _synchGTables(backTableNames) {
        if (!gTables) return;
        let tableNames = new Set(backTableNames);
        for (let tableId in gTables) {
            let tableName = gTables[tableId].getName();
            if (!tableNames.has(tableName) && !xcHelper.isGlobalTable(tableName)) {
                const visibleTable = DagTable.Instance.getTable();
                if (visibleTable === tableName) {
                    DagTable.Instance.close();
                }
                delete gTables[tableId];
            }
        }
    }

    private _getNodeId(name: string): string {
        let matches: string[] = name.match("table_DF2_.*_(dag_.*?)(.index)?#");
        if (matches && matches.length > 0) {
            return matches[1];
        }
        return "";
    }

    private _queryDelete(tables: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (tables.length == 0) {
            return PromiseHelper.resolve();
        }
        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables": tables,
            "tableType": TableType.Unknown
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql": sql,
            "steps": tables.length,
            "track": true
        });
        const visibleTable = DagTable.Instance.getTable();
        let deleteQuery: {}[] = tables.map((name: string) => {
            if (name == visibleTable) {
                DagTable.Instance.close();
            }
            return {
                operation: "XcalarApiDeleteObjects",
                args: {
                    namePattern: name,
                    srcType: "Table"
                }
            }
        });
        XIApi.deleteTables(txId, deleteQuery, null)
        .then(() => {
            Transaction.done(txId, {noLog: true});
            deferred.resolve()
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "failMsg": "Deleting Tables Failed",
                "error": error,
                "noAlert": true,
                "title": "Table Manager"
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagTblManager = DagTblManager;
};

if (typeof runEntity !== "undefined") {
    runEntity.DagTblManager = DagTblManager;
}