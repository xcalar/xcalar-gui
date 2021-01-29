class PTblManager {
    private static _instance: PTblManager;
    public static readonly DSSuffix: string = "-xcalar-ptable";
    public static readonly InternalColumns: string[] = ["XcalarRankOver", "XcalarOpCode", "XcalarBatchId"];
    public static readonly PKPrefix: string = "XcalarRowNumPk";
    public static readonly IMDDependencyKey = "/sys/imd_dependencies";
    public static readonly LoadColumns: string[] = ["XCALAR_ICV", "XCALAR_FILE_RECORD_NUM", "XCALAR_SOURCEDATA", "XCALAR_PATH"];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tableMap: Map<string, PbTblInfo>;
    private _tables: PbTblInfo[];
    private _initizlied: boolean;
    private _cachedSelectTableResult: {[key: string]: string};
    private _loadingTables: {[key: string]: PbTblInfo};
    private _datasetTables: {[key: string]: PbTblInfo};

    public constructor() {
        this._tableMap = new Map();
        this._tables = [];
        this._initizlied = false;
        this._loadingTables = {};
        this._datasetTables = {};
        this._cachedSelectTableResult = {};
    }

    public createTableInfo(name: string): PbTblInfo {
        return new PbTblInfo({
            name: name,
            index: null,
            keys: null,
            updates: [],
            size: 0,
            createTime: null,
            active: true,
            columns: null,
            rows: 0,
            batchId: null
        });
    }

    /**
     * PTblManager.Instance.addTable
     * @param tableName
     */
    public addTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._addOneTable(tableName)
        .then(() => {
            delete this._loadingTables[tableName]; // delete before
            // onTableChange or newList will contain loading table
            this._onTableChange({
                "action": "add",
                "tables": [tableName]
            });
            deferred.resolve();
        })
        .fail(() => {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    public getTableMap(): Map<string, PbTblInfo> {
        return this._tableMap;
    }

    public getTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = this.getAvailableTables();
        for (let table in this._loadingTables) {
            tables.push(this._loadingTables[table]);
        }
        for (let table in this._datasetTables) {
            tables.push(this._datasetTables[table]);
        }
        return tables;
    }

    /**
     * PTblManager.Instance.getAvailableTables
     */
    public getAvailableTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = this._tables.map((table) => table);
        return tables;
    }

    public getTableByName(tableName: string): PbTblInfo | null {
        let table = this._tableMap.get(tableName);
        if (table != null) {
            return table;
        }
        table = this._loadingTables[tableName];
        if (table != null) {
            return table;
        }
        table = this._datasetTables[tableName];
        if (table != null) {
            return table;
        }
        return null;
    }

    /**
     * PTblManager.Instance.hasTable
     * @param tableName
     * @param checkCache
     */
    public hasTable(tableName): boolean {
        if (this.getTableByName(tableName) != null) {
            return true;
        }
        return false;
    }

    /**
     * PTblManager.Instance.getUniqName
     * @param name
     */
    public getUniqName(name: string, nameSet?: Set<string>): string {
        var originalName = name;
        var tries = 1;
        var validNameFound = false;
        nameSet = nameSet || new Set();
        while (!validNameFound && tries < 20) {
            if (this.hasTable(name) || nameSet.has(name)) {
                validNameFound = false;
            } else {
                validNameFound = true;
            }

            if (!validNameFound) {
                name = originalName + tries;
                tries++;
            }
        }

        if (!validNameFound) {
            while (
                (this.hasTable(name) || nameSet.has(name))
                && tries < 100
            ) {
                name = xcHelper.randName(name, 4);
                tries++;
            }
        }
        return name;
    }

    /**
     * PTblManager.Instance.getTablesAsync
     * @param refresh
     */
    public getTablesAsync(refresh?: boolean): XDPromise<PbTblInfo[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let promise: XDPromise<PublishTable[]>;
        if (this._initizlied && !refresh) {
            promise = PromiseHelper.resolve(this._tables);
        } else {
            promise = this._listTables();
        }

        promise
        .then(() => {
            this._initizlied = true;
            deferred.resolve(this.getTables());
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getTableDisplayInfo(tableInfo: PbTblInfo): PbTblDisplayInfo {
        let tableDisplayInfo: PbTblDisplayInfo = {
            index: null,
            name: null,
            rows: "N/A",
            cols: "N/A",
            size: "N/A",
            createTime: "N/A",
            status: null
        };

        try {
            tableDisplayInfo.index = tableInfo.index;
            tableDisplayInfo.name = tableInfo.name;

            let active: boolean = tableInfo.active;
            tableDisplayInfo.status = active ? PbTblStatus.Active : PbTblStatus.Inactive;
            tableDisplayInfo.rows = tableInfo.getRowCountStr();
            tableDisplayInfo.cols = tableInfo.getColCountStr();
            tableDisplayInfo.size = active && tableInfo.size ? <string>xcHelper.sizeTranslator(tableInfo.size) : "N/A";
            tableDisplayInfo.createTime = active && tableInfo.createTime ? moment(tableInfo.createTime * 1000).format("HH:mm:ss MM/DD/YYYY") : "N/A";
        } catch (e) {
            console.error(e);
        }
        return tableDisplayInfo;
    }

    public getTableSchema(tableInfo: PbTblInfo): PbTblColSchema[] {
        if (!tableInfo) {
            return [];
        }
        return tableInfo.getSchema();
    }

    /**
     * PTblManager.Instance.getSchemaArrayFromDataset
     * @param dsName
     */
    public getSchemaArrayFromDataset(dsName): XDPromise<{schemaArray: ColSchema[][], hasMultipleSchema: boolean}> {
        return this._getSchemaArrayFromDataset(dsName);
    }

    /**
     * PTblManager.Instance.addLoadingTable
     * @param tableName
     */
    public addLoadingTable(tableName: string): void {
        const tableInfo = new PbTblInfo({name: tableName});
        tableInfo.state = PbTblState.Loading;
        this._loadingTables[tableName] = tableInfo;
    }

    /**
     * PTblManager.Instance.removeLoadingTable
     * @param tableName
     */
    public removeLoadingTable(tableName: string): void {
        delete this._loadingTables[tableName];
    }

    /**
     * PTblManager.Instance.createTableFromSource
     * @param tableInfo
     * @param args
     * @param primaryKeys
     */
    public createTableFromSource(
        tableInfo: PbTblInfo,
        args: {
            name: string,
            sources: {
                targetName: string,
                path: string,
                recursive: boolean,
                fileNamePattern: string
            }[],
            typedColumns: any[],
            moduleName: string,
            funcName: string,
            udfQuery: object,
            schema: ColSchema[],
            newNames: string[],
            primaryKeys: string[]
        }
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let dsOptions = $.extend({}, args);
        let tableName: string = tableInfo.name;
        let dsName: string = this._getDSNameFromTableName(tableName);
        dsOptions.name = tableName + PTblManager.DSSuffix;
        dsOptions.fullName = dsName;
        let dsObj = new DSObj(dsOptions);
        let sourceArgs = dsObj.getImportOptions();

        const totalStep: number = 3;
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": totalStep
        });

        let hasDataset: boolean = false;
        let schema: ColSchema[] = args.schema;
        let newNames: string[] = args.newNames || [];
        let primaryKeys: string[] = args.primaryKeys;
        this._loadingTables[tableName] = tableInfo;
        tableInfo.state = PbTblState.Loading;

        let currentStep: number = 1;
        let currentMsg: string = TblTStr.Importing;
        this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
        tableInfo.txId = txId;

        WorkbookManager.switchToXDInternalSession();
        this._createDataset(txId, dsName, sourceArgs)
        .then(() => {
            hasDataset = true;
            currentStep = 2;
            currentMsg = TblTStr.CheckingSchema;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._checkSchemaInDatasetCreation(dsName, schema);
        })
        .then((finalSchema) => {
            currentStep = 3;
            currentMsg = TblTStr.Creating;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._createTable(txId, dsName, tableName, finalSchema, newNames, primaryKeys);
        })
        .then(() => {
            delete this._loadingTables[tableName];
            return PTblManager.Instance.addTable(tableName);
        })
        .then(() => {
            Transaction.done(txId, {
                noNotification: true,
                noCommit: true
            });
            deferred.resolve(tableName);
        })
        .fail((ret) => {
            const error = ret.error || ret;
            const isSchemaError = ret && ret.fromDatasetCreation;
            let noAlert: boolean = false;
            delete this._loadingTables[tableName];
            tableInfo.state = PbTblState.Error;
            if (hasDataset) {
                if (isSchemaError === true) {
                    noAlert = true;
                    this.addDatasetTable(dsName);
                } else {
                    XIApi.deleteDataset(txId, dsName);
                }
            }
            Transaction.fail(txId, {
                noAlert: noAlert,
                noNotification: true,
                error: error
            });
            deferred.reject({error, hasDataset});
        })
        .always(() => {
            delete tableInfo.txId;
            WorkbookManager.resetXDInternalSession();
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.createTableFromView
     * @param pks
     * @param columns
     * @param viewName
     * @param tableName
     * @param overwrite
     */
    public createTableFromView(
        pks: string[],
        columns: ProgCol[],
        viewName: string,
        tableName: string,
        overwrite: boolean = false
    ): XDPromise<void> {
        const deferred:XDDeferred<void> = PromiseHelper.deferred();
        const txId: number = Transaction.start({
            operation: SQLOps.TableFromView,
            msg: TblTStr.Creating,
            track: true,
        });

        let tableInfo = this.createTableInfo(tableName);
        tableInfo.state = PbTblState.Loading;
        // Load message tells anyone looking at the table info that
        // this table isnt created yet
        // Primarily used when checking for duplicates
        tableInfo.loadMsg = "Creating Table";
        this._loadingTables[tableName] = tableInfo;
        XIApi.publishTable(txId, pks, viewName, tableName, xcHelper.createColInfo(columns), undefined, overwrite)
        .then(() => {
            // need to update the status and activated tables
            return PTblManager.Instance.addTable(tableName);
        })
        .then(() => {
            delete this._loadingTables[tableName];
            Transaction.done(txId, {
                noCommit: true
            });
            deferred.resolve();
        })
        .fail((error) => {
            delete this._loadingTables[tableName];
            Transaction.fail(txId, {
                noAlert: true,
                noNotification: true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.restoreTableFromNode
     * @param node
     */
    public async restoreTableFromNode(node: DagNodeIMDTable): Promise<void> {
        let txId: number;
        try {
            const pbTableName: string = node.getSource();
            if (this.hasTable(pbTableName)) {
                return;
            }
            txId = Transaction.start({
                "msg": "Restore: " + pbTableName,
                "operation": SQLOps.RestoreTable,
                "track": true,
                "steps": 2
            });
            const subGraph = node.getSubGraph();
            if (!subGraph || subGraph.getAllNodes().size === 0) {
                throw(new Error("Table could not be found or is missing source details."));
            }
            const res = await subGraph.getRetinaArgs(null, false);
            const retinaInfo = res.retina;
            const tables = JSON.parse(retinaInfo.retina).tables;
            const destTable = tables[tables.length - 1].name;
            await XIApi.executeQueryOptimized(
                txId,
                retinaInfo.retinaName,
                retinaInfo.retina,
                destTable,
                {
                    udfUserName: retinaInfo.userName,
                    udfSessionName: retinaInfo.sessionName
                }
            );
            await XcalarPublishTable(destTable, pbTableName, txId);
            await XIApi.deleteTable(txId, destTable, true);
            await this.addTable(pbTableName);
            node.beConfiguredState();
            Transaction.done(txId);
        } catch (e) {
            console.error(e);
            if (txId) {
                Transaction.fail(txId, {
                    error: e.message || e,
                    failMsg: "Restore table failed"
                });
            }
        }
    }

    /**
     * PTblManager.Instance.addDatasetTable
     * @param dsName
     */
    public addDatasetTable(dsName: string): void {
        if (!dsName.endsWith(PTblManager.DSSuffix)) {
            return;
        }
        let tableName: string = this._getTableNameFromDSName(dsName);
        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        tableInfo.beDatasetState(dsName);
        this._datasetTables[tableName] = tableInfo;
    }

    /**
     * PTblManager.Instance.activateTables
     * @param tableNames
     * @param noAlert: if true, will not display error message and let caller handle it
     * @param tableNodeMapping: allows graph nodes to know when activation is done
     */
    public activateTables(tableNames: string[], noAlert?: boolean, tableNodeMapping?: Map<string, DagNodeIMDTable>): XDPromise<void> {
        tableNames = tableNames.filter((tableName) => {
            // skip already activated table
            const pbTableInfo = this.getTableByName(tableName);
            return !pbTableInfo || (!pbTableInfo.active && !pbTableInfo.state);
        });
        if (tableNames.length === 0) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const succeeds: string[] = [];
        const failures: string[] = [];

        const activateFunc = (tableName, succeeds, failures, tableNodeMapping): XDPromise<void> => {
            let dagNode;
            if (tableNodeMapping && tableNodeMapping.has(tableName)) {
                dagNode = tableNodeMapping.get(tableName);
            }
            return this._activateOneTable(tableName, succeeds, failures, dagNode);
        };

        tableNames.forEach((tableName) => {
            const tableInfo: PbTblInfo = this._tableMap.get(tableName);
            if (tableInfo) {
                TblSource.Instance.markActivating(tableName);
                tableInfo.state = PbTblState.Activating;
            }
        });

        this._getIMDDependency()
        .then((imdDenendencies) => {
            let set: Set<string> = new Set();
            const promises = [];
            const noDependencyTables: string[] = [];
            tableNames.forEach((tableName) => {
                if (!set.has(tableName)) {
                    const tablesToActivate: string[] = this._checkActivateDependency(tableName, imdDenendencies);
                    if (tablesToActivate.length === 1) {
                        noDependencyTables.push(tableName);
                    } else {
                        const chains = [];
                        tablesToActivate.forEach((tableName) => {
                            set.add(tableName);
                            chains.push(activateFunc.bind(this, tableName, succeeds, failures, tableNodeMapping));
                        });
                        // group when dependency set as one chain
                        promises.push(PromiseHelper.chain(chains));
                    }
                }
            });

            let count = 1;
            let chains = [];
            noDependencyTables.forEach((tableName) => {
                if (!set.has(tableName)) {
                    chains.push(activateFunc.bind(this, tableName, succeeds, failures, tableNodeMapping));
                    if (count % 32 === 0) {
                        // only send 32 threads at one time
                        promises.push(PromiseHelper.chain(chains));
                        chains = [];
                    }
                    count++;
                }
            });
            promises.push(PromiseHelper.chain(chains));

            return PromiseHelper.when.apply(this, promises);
        })
        .then(() => {
            if (failures.length > 0 && !noAlert) {
                let error: string = failures.join("\n");
                Alert.error(IMDTStr.ActivatingFail, error);
            }
            this._onTableChange({
                "action": "activate",
                "tables": succeeds
            });
            deferred.resolve();
        })
        .fail((error) => {
            if (!noAlert) {
                Alert.error(IMDTStr.ActivatingFail, error);
            }
            tableNames.forEach((tableName) => {
                const tableInfo: PbTblInfo = this._tableMap.get(tableName);
                if (tableInfo) {
                    tableInfo.state = null;
                }
            });
            TblSource.Instance.refresh();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.deactivateTables
     * @param tableNames
     */
    public deactivateTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        Alert.show({
            'title': IMDTStr.DeactivateTable,
            'msg': xcStringHelper.replaceMsg(IMDTStr.DeactivateTablesMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this._deactivateTables(tableNames)
                .then(({succeeds, failures}) => {
                    if (failures.length > 0) {
                        let error: string = failures.join("\n");
                        Alert.error(IMDTStr.DeactivateTableFail, error);
                    }
                    this._onTableChange({
                        "action": "deactivate",
                        "tables": succeeds
                    });
                    deferred.resolve();
                })
                .fail((error) => {
                    Alert.error(IMDTStr.DeactivateTableFail, error);
                    deferred.reject(error);
                });
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.deleteTables
     * @param tableNames
     */
    public deleteTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        Alert.show({
            'title': IMDTStr.DelTable,
            'msg': xcStringHelper.replaceMsg(IMDTStr.DelTableMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this.deleteTablesOnConfirm(tableNames, true, false)
                .then(deferred.resolve)
                .fail(deferred.reject);
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    public deleteTablesOnConfirm(
        tableNames: string[],
        showError: boolean = false,
        forceDelete: boolean = false,
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._deleteTables(tableNames, forceDelete)
        .then((ret) => {
            const {succeeds, failures} = ret;
            if (failures.length > 0) {
                let error: string = failures.map((message, i) => `${(i + 1)}. ${message}`).join("\n");
                error = TblTStr.CannotDeletePrefix + ":\n" + error;
                if (showError) {
                    let tablesToForceDelete: string[] = forceDelete ?
                    null :
                    this._getTablesToForceDelete(tableNames, succeeds);
                    this._handleDeleteTableFailures(error, tablesToForceDelete);
                }
            }
            this._onTableChange({
                "action": "delete",
                "tables": succeeds
            });
            deferred.resolve();
        })
        .fail((error) => {
            if (showError) {
                this._handleDeleteTableFailures(error, null);
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * PTblManager.Instance.selectTable
     */
    public selectTable(tableInfo: PbTblInfo, limitedRows: number): XDPromise<string> {
        return tableInfo.viewResultSet(limitedRows);
    }

    public updateInfo(arg: {"action": string, "tables": string[]}): void {
        try {
            let action = arg.action;
            let tables = arg.tables;
            switch (action) {
                case "activate":
                    this._updateActivated(tables);
                    break;
                case "deactivate":
                    this._updateDeactivated(tables);
                    break;
                case "delete":
                    this._updateDeleted(tables);
                    break;
                case "add":
                    this._updateAdded(tables);
                    break;
                default:
                    console.error("unsupported update action", action);
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _updateActivated(tables: string[]): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promies = [];
        tables.forEach((tableName) => {
            let tableInfo: PbTblInfo = this._tableMap.get(tableName);
            if (tableInfo != null) {
                tableInfo.beActivated();
            }
            promies.push(this._listOneTable(tableName));
        });

        PromiseHelper.when(...promies)
        .always(() => {
            deferred.resolve();
            TblSource.Instance.refresh();
        });

        return deferred.promise();
    }

    private _updateDeactivated(tables: string[]): void {
        tables.forEach((tableName) => {
            let tableInfo: PbTblInfo = this._tableMap.get(tableName);
            if (tableInfo != null) {
                tableInfo.beDeactivated();
            }
        });
        TblSource.Instance.refresh();
    }

    private _updateDeleted(tables: string[]): void {
        tables.forEach((tableName) => {
            this._tableMap.delete(tableName);
        });

        this._tables = this._tables.filter((tableInfo) => {
            let tableName = tableInfo.name;
            return this._tableMap.has(tableName);
        });
        TblSource.Instance.refresh();
    }

    private _updateAdded(tables: string[]): void {
        this._addOneTable(tables[0]);
        TblSource.Instance.refresh();
    }

    private _addOneTable(tableName: string): XDPromise<void> {
        // cached tableInfo first in case list fails
        if (tableName) {
            tableName = tableName.toUpperCase();
        }

        if (!this._tableMap.has(tableName)) {
            let tableInfo = this.createTableInfo(tableName);
            tableInfo.index = this._tables.length;
            this._tables.push(tableInfo);
            this._tableMap.set(tableName, tableInfo);
        }
        return this._listOneTable(tableName);
    }

    private _deactivateTables(tableNames: string[]): XDPromise<{succeeds: string[], failures: any[]}> {
        const deferred: XDDeferred<{succeeds: string[], failures: any[]}> = PromiseHelper.deferred();
        const succeeds: string[] = [];
        const failures: string[] = [];
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deactivateOneTable(tableName, succeeds, failures);
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve({succeeds, failures});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deactivateOneTable(
        tableName: string,
        succeeds: string[],
        failures: string[]
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || !tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        tableInfo.deactivate()
        .then(() => {
            succeeds.push(tableName);
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _activateOneTable(
        tableName: string,
        succeeds: string[],
        failures: string[],
        dagNode?: DagNodeIMDTable
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // mark activating in case any table
        // that has dependency need to be activated
        TblSource.Instance.markActivating(tableName);
        if (dagNode) {
            dagNode.markActivating();
        }

        tableInfo.activate()
        .then(() => {
            return PromiseHelper.alwaysResolve(this._listOneTable(tableName));
        })
        .then(() => {
            succeeds.push(tableName);
            if (dagNode) {
                dagNode.markActivatingDone();
            }
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            if (dagNode) {
                dagNode.markActivatingDone();
            }
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _deleteTables(
        tableNames: string[],
        forceDelete: boolean
    ): XDPromise<{succeeds: string[], failures: any[]}> {
        const deferred: XDDeferred<{succeeds: string[], failures: any[]}> = PromiseHelper.deferred();
        const succeeds: string[] = [];
        const failures: string[] = [];
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deleteOneTable(tableName, forceDelete, succeeds, failures);
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve({succeeds: succeeds, failures: failures});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deleteOneTable(
        tableName: string,
        forceDelete: boolean,
        succeeds: string[],
        failures: string[]
    ): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (tableInfo == null) {
            return this._deleteDSTable(tableName, failures);
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const checkDeleteDependency: XDPromise<void> = forceDelete ?
                                        PromiseHelper.resolve() :
                                        this._checkDeleteDependency(tableName);
        checkDeleteDependency
        .then(() => {
            return tableInfo.delete();
        })
        .then(() => {
            this._tableMap.delete(tableName);
            for (let i = 0; i < this._tables.length; i++) {
                if (this._tables[i] === tableInfo) {
                    this._tables.splice(i, 1);
                }
            }
            delete this._cachedSelectTableResult[tableName];
            succeeds.push(tableName);
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg: string = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _getTablesToForceDelete(
        tableNames: string[] = [],
        succeedTables: string[] = []
    ): string[] {
        let cache = {};
        succeedTables.forEach(table => cache[table] = true);
        return tableNames.filter(table => !cache[table]);
    }

    private _handleDeleteTableFailures(
        error: string,
        tablesToForceDelete: string[]
    ): void {
        if (tablesToForceDelete == null || tablesToForceDelete.length === 0) {
            Alert.error(IMDTStr.DelTableFail, error);
        } else {
            error = error + "\n\n" + IMDTStr.DelTableFailMsg;
            Alert.show({
                title: IMDTStr.DelTableFail,
                msg: error,
                sizeToText: true,
                hideButtons: ["cancel"],
                buttons: [{
                    "name": "Force Delete",
                    "className": "btn-submit",
                    "func": () => {
                        this.deleteTablesOnConfirm(tablesToForceDelete, true, true)
                        .always(() => {
                            TblSource.Instance.refresh();
                        });
                    }
                }, {
                    "name": AlertTStr.Close,
                    "func": () => {}
                }]
            });
        }
    }

    private _deleteDSTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._datasetTables[tableName];
        if (tableInfo == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        tableInfo.delete()
        .then(() => {
            delete this._datasetTables[tableName];
            deferred.resolve();
        })
        .fail((error) => {
            let errorMsg = this._getErrorMsg(tableName, error);
            failures.push(errorMsg);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _getDSNameFromTableName(tableName: string): string {
        return xcHelper.wrapDSName(tableName) + PTblManager.DSSuffix;
    }

    private _getTableNameFromDSName(dsName: string): string {
        let parseRes = xcHelper.parseDSName(dsName);
        let tableName: string = parseRes.dsName;
        // remove the suffix
        if (tableName.endsWith(PTblManager.DSSuffix)) {
            tableName = tableName.substring(0, tableName.length - PTblManager.DSSuffix.length);
        }
        return tableName;
    }

    private _createDataset(txId: number, dsName: string, sourceArgs: any): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        XIApi.loadDataset(txId, dsName, sourceArgs)
        .then(deferred.resolve)
        .fail((error) => {
            if (error) {
                error = error.error || error;
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _checkSchemaInDatasetCreation(
        dsName: string,
        schema: ColSchema[]
    ): XDPromise<ColSchema[]> {
        if (schema != null) {
            return PromiseHelper.resolve(schema);
        }
        const deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        this._getSchemaArrayFromDataset(dsName)
        .then((ret) => {
            const {schemaArray, hasMultipleSchema} = ret;
            if (hasMultipleSchema) {
                let error: string = xcStringHelper.replaceMsg(TblTStr.MultipleSchema, {
                    name: this._getTableNameFromDSName(dsName)
                })
                deferred.reject({
                    error: error,
                    fromDatasetCreation: true
                });
            } else {
                let schema: ColSchema[] = schemaArray.map((schemas) => schemas[0]);
                deferred.resolve(schema);
            }
        })
        .fail((error) => {
            deferred.reject({error: error.error, fromDatasetCreation: false});
        });

        return deferred.promise();
    }

    // XXX TODO combine with getSchemaMeta in ds.js
    private _getSchemaArrayFromDataset(
        dsName: string,
    ): XDPromise<{schemaArray: ColSchema[][], hasMultipleSchema: boolean}> {
        const deferred: XDDeferred<{schemaArray: ColSchema[][], hasMultipleSchema: boolean}> = PromiseHelper.deferred();
        XcalarGetDatasetsInfo(dsName)
        .then((res) => {
            try {
                let hasMultipleSchema: boolean = false;
                let schemaArray: ColSchema[][] = [];
                let dataset = res.datasets[0];
                let indexMap: {[key: string]: number} = {};
                dataset.columns.forEach((colInfo) => {
                    // if the col name is a.b, in XD it should be a\.b
                    const name = xcHelper.escapeColName(colInfo.name);
                    const type = xcHelper.convertFieldTypeToColType(<any>DfFieldTypeT[colInfo.type]);
                    let index = indexMap[name];
                    if (index == null) {
                        // new columns
                        index = schemaArray.length;
                        indexMap[name] = index;
                        schemaArray[index] = [{
                            name: name,
                            type: type
                        }];
                    } else {
                        // has multiple schema
                        hasMultipleSchema = true;
                        schemaArray[index].push({
                            name: name,
                            type: type
                        });
                    }
                });
                deferred.resolve({schemaArray, hasMultipleSchema});
            } catch (e) {
                console.error(e);
                deferred.reject({
                    error: "Parse Schema Error"
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Step 1: synthesize dataset to xcalar table
     * Step 2: generate row num as primary key if not specified
     * Step 3: Create publish table
     */
    private _createTable(
        txId: number,
        dsName: string,
        tableName: string,
        schema: ColSchema[],
        newNames: string[],
        primaryKeys: string[],
        noDatasetDeletion?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
        schema = schema.filter((colInfo) => {
            return validTypes.includes(colInfo.type);
        });

        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        const pbColInfos: ColRenameInfo[] = [];
        colInfos.forEach((colInfo, index) => {
            let newName = newNames[index] || colInfo.new;
            // make sure column is uppercase
            let upperCaseCol: string = newName.toUpperCase();
            colInfo.new = upperCaseCol;
            pbColInfos.push({
                orig: upperCaseCol,
                new: upperCaseCol,
                type: colInfo.type
            });
        });
        const parsedDsName = parseDS(dsName);
        let synthesizeTable: string = tableName + Authentication.getHashId();
        let tableToDelete: string = null;
        if (primaryKeys == null || primaryKeys.length === 0) {
            primaryKeys = [];
        }

        // Synthesize is necessary in the event we are publishing straight from a dataset
        XIApi.synthesize(txId, colInfos, parsedDsName, synthesizeTable)
        .then((resTable) => {
            tableToDelete = resTable;
            return XIApi.publishTable(txId, primaryKeys, resTable, tableName, pbColInfos);
        })
        .then(() => {
            // Dataset need to be delete at the end in case fail case
            // need to restore the dataset
            if (!noDatasetDeletion) {
                XIApi.deleteDataset(txId, dsName);
            }
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            if (tableToDelete != null) {
                XIApi.deleteTable(txId, tableToDelete);
            }
        });

        return deferred.promise();
    }

    private _listOneTable(tableName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarListPublishedTables(tableName, false, true)
        .then((result) => {
            try {
                let oldTableInfo = this._tableMap.get(tableName);
                let index: number = oldTableInfo ? oldTableInfo.index : this._tables.length;
                if (!result.tables[0]) {
                    throw(`Published Table "${tableName}" not found.`);
                }
                let tableInfo: PbTblInfo = this._tableInfoAdapter(result.tables[0], index);
                this._tableMap.set(tableName, tableInfo);
                this._tables[index] = tableInfo;
            } catch (e) {
                console.error(e);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _listTables(): XDPromise<PublishTable[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let oldTables = this._tables || [];

        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            try {
                this._tables = result.tables.map(this._tableInfoAdapter);
                this._updateTableMap();
                this._updateTablesInAction(oldTables);
            } catch (e) {
                console.error(e);
            }
            deferred.resolve(this._tables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateTablesInAction(oldTables: PbTblInfo[]): void {
        try {
            oldTables.forEach((oldTableInfo) => {
                let oldState = oldTableInfo.state;
                if (oldState === PbTblState.Activating ||
                    oldState === PbTblState.Deactivating
                ) {
                    let name = oldTableInfo.name;
                    if (this._tableMap.has(name)) {
                        let tableInfo = this._tableMap.get(name);
                        if (oldState === PbTblState.Activating &&
                            !tableInfo.state
                        ) {
                            // still activating
                            tableInfo.state = oldState;
                        } else if (oldState === PbTblState.Deactivating &&
                            tableInfo.active
                        ) {
                            // still deactivating
                            tableInfo.state = oldState;
                        }
                    }
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    private _updateTableMap(): void {
        this._tableMap.clear();
        this._tables.forEach((tableInfo) => {
            this._tableMap.set(tableInfo.name, tableInfo);
        });
    }

    private _tableInfoAdapter(table: PublishTable, index: number): PbTblInfo {
        let tableInfo: PbTblInfo = new PbTblInfo({
            index: index,
            batchId: null,
            name: null,
            active: null,
            rows: null,
            size: null,
            createTime: null,
            columns: [],
            keys: [],
            updates: []
        });
        tableInfo.restoreFromMeta(table);
        return tableInfo;
    }

    private _refreshTblView (
        tableInfo: PbTblInfo,
        text: string,
        step: number,
        totalStep: number
    ): void {
        if (tableInfo == null) {
            // tableInfo is null when tutorial workbooks are being set up
            return;
        }
        let msg: string = `Step ${step}/${totalStep}: ${text}`;
        tableInfo.loadMsg = msg;
        TblSourcePreview.Instance.refresh(tableInfo);
    }

    private _getErrorMsg(tableName: string, error: ThriftError): string {
        let errorMsg: string = "";
        if (error && typeof error === "object") {
            errorMsg = error.log || error.error;
        } else {
            errorMsg = <any>error || ErrTStr.Unknown;
        }
        return tableName + ": " + errorMsg;
    }

    private _getIMDDependencyKVStore(): KVStore {
        let kvStore = new KVStore(PTblManager.IMDDependencyKey, gKVScope.GLOB);
        return kvStore;
    }

    private _getIMDDependency(): XDPromise<object> {
        let deferred: XDDeferred<object> = PromiseHelper.deferred();
        let kvStore = this._getIMDDependencyKVStore();
        kvStore.getAndParse()
        .then((res) => {
            deferred.resolve(res || {});
        })
        .fail(() => {
            deferred.resolve({}); // still resolve it
        });
        return deferred.promise();
    }

    private _checkDeleteDependency(tableName): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getIMDDependency()
        .then((imdDenendencies) => {
            try {
                let dependendcy = imdDenendencies[tableName];
                if (dependendcy != null) {
                    let children: string[] = Object.keys(dependendcy.children);
                    if (children.length > 0) {
                        let error: string = IMDTStr.DeleteHasDependency + " (" + children.join(", ") + ")";
                        return PromiseHelper.reject({
                            error: error
                        });
                    }
                }
                deferred.resolve();
            } catch (e) {
                console.error(e);
                deferred.resolve(); // still reolsve
            }

        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _checkActivateDependency(
        tableName: string,
        imdDenendencies: object
    ): string[] {
        try {
            let graph = this._getGraphConnectionFromDependency(tableName, imdDenendencies);
            return this._topologicalSortDependencyGraph(graph, tableName);
        } catch (e) {
            console.error(e);
            return [tableName];
        }
    }

    private _getParentsFromDependency(
        name: string,
        imdDenendencies: object
    ): string[] {
        let dependendcy = imdDenendencies[name];
        let parents: string[] = [];
        if (dependendcy != null) {
            parents = Object.keys(dependendcy.parents);
        }
        return parents;
    }

    private _getGraphConnectionFromDependency(
        startNodeName: string,
        imdDenendencies: object
    ): {[key: string]: {numChildren: number, parents: string[]}} {
        let graph = {};
        let visited = {};
        let queue: string[] = [startNodeName];
        graph[startNodeName] = {numChildren: 0};

        while (queue.length) {
            let nodeName: string = queue.shift();
            if (visited[nodeName]) {
                // have visited
                continue;
            }

            visited[nodeName] = true;
            let parents: string[] = this._getParentsFromDependency(nodeName, imdDenendencies);
            graph[nodeName] = graph[nodeName] || {};
            graph[nodeName].parents = parents;

            parents.forEach((parentName) => {
                graph[parentName] = graph[parentName] || {numChildren: 0};
                graph[parentName].numChildren++;
                if (!visited[parentName]) {
                    queue.push(parentName);
                }
            });
        }
        return graph;
    }

    private _topologicalSortDependencyGraph(
        graph: {[key: string]: {numChildren: number, parents: string[]}},
        startNodeName: string
    ): string[] {
        let sortedNodes: string[] = [];
        let queue: string[] = [startNodeName];
        while (queue.length) {
            let nodeName: string = queue.shift();
            sortedNodes.push(nodeName);
            let node = graph[nodeName];
            if (node == null) {
                // error case
                throw new Error("Table has cyclic dependency");
            }
            let parents: string[] = node.parents || [];
            parents.forEach((parentName) => {
                let parentNode = graph[parentName];
                parentNode.numChildren--;
                if (parentNode.numChildren === 0) {
                    queue.push(parentName);
                }
            });
            delete graph[nodeName];
        }

        if (Object.keys(graph).length > 0) {
            // when there is node remaining, cyclic case
            throw new Error("Table has cyclic dependency");
        }
        return sortedNodes.reverse();
    }

    private _onTableChange(
        event: {
            action: string,
            tables: string[]
        }
    ): void {
        SQLResultSpace.Instance.refresh();
        TblSource.Instance.refresh();
        XcSocket.Instance.sendMessage("refreshIMD", event, null);
    }
}

if (typeof exports !== 'undefined') {
    exports.PTblManager = PTblManager;
};

if (typeof runEntity !== "undefined") {
    runEntity.PTblManager = PTblManager;
}