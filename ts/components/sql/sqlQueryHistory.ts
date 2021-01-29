type SqlQueryMap = { [key: string]: SqlQueryHistory.QueryInfo };

class SqlQueryHistory {
    private static _instance = null;
    public static getInstance(): SqlQueryHistory {
        return this._instance || (this._instance = new this());
    }

    private _storageKey: string;
    private _queryMap: SqlQueryMap = {};
    private _isLoaded: boolean = false;
    private _tableNameToSQLMap: Map<string, string> = new Map();

    private constructor() {
        // The query keys in KVStore are folder like
        // ie. gSQLQueries/<queryId>
        this._storageKey = KVStore.getKey("gSQLQueries") || "gSQLQueries-1";
    }

    public isLoaded(): boolean {
        return this._isLoaded;
    }

    /**
     * Get a copy of queryMap
     */
    public getQueryMap(): SqlQueryMap {
        let map = {};
        for (let key in this._queryMap) {
            if (this._queryMap[key]) {
                map[key] = this._queryMap[key];
            }
        }
        return xcHelper.deepCopy(map);
    }

    /**
     * Get the copy of a query from queryMap
     * @param queryId QueryID
     * @returns The QueryInfo associated with QueryID. null if the QueryID doesn't exist in the queryMap
     */
    public getQuery(queryId: string): SqlQueryHistory.QueryInfo {
        const query = this._queryMap[queryId];
        if (query != null) {
            return xcHelper.deepCopy(this._queryMap[queryId]);
        }
        return null;
    }

    public getSQLFromTableName(tableName: string): string {
        return this._tableNameToSQLMap.get(tableName);
    }

    /**
     * Add/Set a query in queryMap
     * @param queryInfo QueryInfo object
     * @returns true: new query; false: existing query
     */
    public setQuery(queryInfo: SqlQueryHistory.QueryInfo): boolean {
        const isNewQuery = (this.getQuery(queryInfo.queryId) == null);
        this._queryMap[queryInfo.queryId] = xcHelper.deepCopy(queryInfo);
        this._tableNameToSQLMap.set(queryInfo.tableName, queryInfo.queryString);
        return isNewQuery;
    }

    /**
     * Read query map from KV Store, and cache in the class
     * @param refresh if this is a manual refresh triggered by click on icon
     * @returns The copy of queryMap
     */
    public readStore(refresh: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        // Read the keys of sql queries
        KVStore.list(this._getKVStoreKeyPattern(), gKVScope.WKBK)
        .then(({keys}) => {
            // XXX TODO: Must be deleted in the next major release!!!
            // Added in 2.0.0
            if (keys.length === 0 && XVM.getVersion().indexOf('2.') === 0) {
                return this.convertKVStore();
            } else {
                return PromiseHelper.resolve({keys: keys});
            }
        })
        .then(({keys}) => {
            // Read sql queries
            const getQueries = keys.map((key) => {
                const kvStore = new KVStore(key, gKVScope.WKBK);
                return kvStore.get()
                .then((ret) => {
                    try {
                        const queryInfo: SqlQueryHistory.QueryInfo = JSON.parse(ret);
                        const queryId = queryInfo.queryId;
                        if (!this._queryMap.hasOwnProperty(queryId) &&
                            !refresh &&
                            (queryInfo.status === SQLStatus.Compiling ||
                             queryInfo.status === SQLStatus.Running)
                            ) {
                            queryInfo.status = SQLStatus.Interrupted;
                            this._queryMap[queryId] = queryInfo;
                            this._tableNameToSQLMap.set(queryInfo.tableName, queryInfo.queryString);
                            return kvStore.put(JSON.stringify(queryInfo), true);
                        }
                        this._queryMap[queryId] = queryInfo;
                        this._tableNameToSQLMap.set(queryInfo.tableName, queryInfo.queryString);
                    } catch(e) {
                        deferred.reject();
                    }
                })
                .fail(deferred.reject);
            });
            return PromiseHelper.when(...getQueries);
        })
        .then(() => {
            this._isLoaded = true;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Serialize one query and write to KV Store
     */
    public writeQueryStore(
        queryId: string,
        updateInfo: SqlQueryHistory.QueryInfo,
        scopeInfo?:{userName:string, workbookName:string}
    ): XDPromise<void> {
        const queryKvStore = this._getKVStoreFromQueryId(queryId);
        return queryKvStore.put(JSON.stringify(updateInfo), true, false, scopeInfo);
    }

    /**
     * Add/Set a query in queryMap, and persist in KV Store
     * @param updateInfo
     */
    public upsertQuery(
        updateInfo: SqlQueryHistory.QueryUpdateInfo,
        scopeInfo?: {userName:string, workbookName: string}
    ): XDPromise<{isNew: boolean, queryInfo: SqlQueryHistory.QueryInfo}> {
        let queryInfo = this.getQuery(updateInfo.queryId);
        const isNewQuery = (queryInfo == null);
        if (isNewQuery) {
            queryInfo = new SqlQueryHistory.QueryInfo();
        }

        let status: SQLStatus = updateInfo.status;
        if (status !== SQLStatus.Done &&
            status !== SQLStatus.Running
        ) {
            updateInfo.skew = null;
            updateInfo.rows = null;
        }
        SqlQueryHistory.mergeQuery(queryInfo, updateInfo);
        this.setQuery(queryInfo);

        // update KVStore
        return this.writeQueryStore(queryInfo.queryId, queryInfo, scopeInfo)
        .then( () => ({
            isNew: isNewQuery,
            queryInfo: queryInfo
        }));
    }

    public deleteQuery(queryId: string): XDPromise<void> {
        const queryKvStore = this._getKVStoreFromQueryId(queryId);
        this._deleteDataflow(this._queryMap[queryId].dataflowId);
        this._tableNameToSQLMap.delete(this._queryMap[queryId].tableName);
        delete this._queryMap[queryId];

        return queryKvStore.delete();
    }

    private _deleteDataflow(dataflowId: string): XDPromise<void> {
        if (!dataflowId) {
            return PromiseHelper.resolve();
        }
        let dag = new DagTabUser({
            name: null,
            id: dataflowId
        });
        return dag.delete();
    }

    // TODO: For test only, should be deleted!!!
    public clearStore() {
        return KVStore.list(this._getKVStoreKeyPattern(), gKVScope.WKBK)
        .then( ({keys}) => {
            const tasks = keys.map( (key) => {
                const kvStore = new KVStore(key, gKVScope.WKBK);
                return kvStore.delete();
            });
            return PromiseHelper.when(...tasks);
        })
        .then(()=> console.info('clear done'))
        .fail(()=> console.error('clear fail'));
    }

    // XXX TODO: Must be deleted in the next major release!!!
    // Added in 2.0.0
    public convertKVStore(): XDPromise<{keys: string[]}> {
        const oldKey = 'gSQLQuery';
        const keysToDelete: string[] = [];

        const deferred: XDDeferred<{keys: string[]}> = PromiseHelper.deferred();
        (new KVStore(KVStore.getKey(oldKey), gKVScope.WKBK)).get()
        .then((ret) => {
            // Copy all the old queries to new keys
            if (ret == null) {
                return PromiseHelper.resolve();
            }
            const getQueries = ret.split(",").map((queryId) => {
                return (new KVStore(queryId, gKVScope.WKBK)).get()
                .then((ret) => {
                    keysToDelete.push(queryId);
                    if (ret == null) {
                        return PromiseHelper.resolve(null);
                    }
                    const newKVStore = this._getKVStoreFromQueryId(queryId);
                    return newKVStore.put(ret, true);
                })
            });
            return PromiseHelper.when(...getQueries)
        })
        .then(() => {
            // Delete old query list key
            const kvStore = new KVStore(KVStore.getKey(oldKey), gKVScope.WKBK);
            return kvStore.delete();
        })
        .then(() => {
            // Delete old query keys
            const deleteKeys = keysToDelete.map((key) => {
                const kvStore = new KVStore(key, gKVScope.WKBK);
                return kvStore.delete();
            });
            return PromiseHelper.when(...deleteKeys);
        })
        .then(() => {
            console.info('Convert success');
        })
        .fail(() => {
            console.error('Convert failed')
        })
        .always(() => {
            KVStore.list(this._getKVStoreKeyPattern(), gKVScope.WKBK)
            .then(({keys}) => {
                deferred.resolve({keys: keys});
            })
        });

        return deferred.promise();
    }

    private _getKVStoreFromQueryId(queryId: string): KVStore {
        return new KVStore(`${this._storageKey}/${queryId}`, gKVScope.WKBK);
    }

    private _getKVStoreKeyPattern(): string {
        return `^${this._storageKey}/.+`;
    }
}

namespace SqlQueryHistory {

    export interface QueryUpdateInfo {
        queryId: string;
        status?: SQLStatus;
        queryString?: string;
        startTime?: number | Date;
        endTime?: number | Date;
        newTableName?: string;
        errorMsg?: string;
        dataflowId?: string;
        rows?: number;
        skew?: number;
        columns?: {name: string, backName: string, type: ColumnType}[];
        statementType?: SQLStatementType;
    }

    export class QueryInfo {
        public queryId: string = '';
        public status: SQLStatus = SQLStatus.None;
        public queryString: string = '';
        public startTime: number = Date.now();
        public endTime: number = null;
        public tableName: string = '';
        public errorMsg: string = '';
        public dataflowId: string = '';
        public rows: number = null;
        public skew: number = null;
        public columns?: {name: string, backName: string, type: ColumnType}[];
        public statementType: SQLStatementType = SQLStatementType.Select;
    }

    export class QueryExtInfo extends QueryInfo {
        public rows: number = 0;
        public skew: number = 0;
    }

    export function mergeQuery(
        mergeTo: SqlQueryHistory.QueryInfo,
        updateInfo: QueryUpdateInfo
    ) {
        mergeTo.queryId = updateInfo.queryId;
        if (updateInfo.endTime != null) {
            mergeTo.endTime = (new Date(updateInfo.endTime)).getTime();
        }
        if (updateInfo.queryString != null) {
            mergeTo.queryString = updateInfo.queryString;
        }
        if (updateInfo.startTime != null) {
            mergeTo.startTime = (new Date(updateInfo.startTime)).getTime();
        }
        if (updateInfo.status != null) {
            mergeTo.status = updateInfo.status;
        }
        if (updateInfo.newTableName != null) {
            mergeTo.tableName = updateInfo.newTableName;
        }
        if (updateInfo.errorMsg != null) {
            mergeTo.errorMsg = updateInfo.errorMsg;
        }
        if (updateInfo.dataflowId != null) {
            mergeTo.dataflowId = updateInfo.dataflowId;
        }
        if (updateInfo.rows != null) {
            mergeTo.rows = updateInfo.rows;
        }
        if (updateInfo.skew != null) {
            mergeTo.skew = updateInfo.skew;
        }
        if (updateInfo.columns != null) {
            mergeTo.columns = updateInfo.columns;
        }
        if (updateInfo.statementType != null) {
            mergeTo.statementType = updateInfo.statementType;
        }
    }

    // export function getQueryList() {
    //     const statusList = [
    //         SQLStatus.Running,
    //         SQLStatus.Compiling,
    //         SQLStatus.Failed,
    //         SQLStatus.Done,
    //         SQLStatus.Cancelled,
    //     ];
    //     const queryMap = {};
    //     for (let i = 0; i < 200; i ++) {
    //         const queryInfo = new QueryInfo();
    //         queryInfo.queryId = `${i}`;
    //         queryInfo.status = statusList[i % statusList.length];
    //         queryInfo.queryString = `SELECT * FROM table${i} WHERE 1 = 1;`;
    //         queryInfo.startTime = Date.now() - 1000*i;
    //         if (queryInfo.status !== SQLStatus.Running && queryInfo.status !== SQLStatus.Compiling) {
    //             queryInfo.endTime = queryInfo.startTime + 1000 * i;
    //         }
    //         if (queryInfo.status === SQLStatus.Failed) {
    //             queryInfo.errorMsg = `Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error #${i}`;
    //         } else {
    //             queryInfo.tableName = `Table#${i}`;
    //         }

    //         queryMap[queryInfo.queryId] = queryInfo;
    //     }
    //     return queryMap;
    // }
}
if (typeof exports !== "undefined") {
    exports.SqlQueryHistory = SqlQueryHistory;
}