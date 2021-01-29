class TblSource {
    private static _instance: TblSource;
    private _loadApps: Map<string, LoadApp> = new Map();

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * TblSource.Instance.refresh
     */
    public refresh(): void {
        return this._refresh();
    }

    /**
     * TblSource.Instance.import
     * @param args
     * @param schema
     */
    public async import(
        tableName: string,
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
            primaryKeys: string[],
            format: string,
            fieldDelim: string,
            lineDelim: string,
            quoteChar: string,
            hasHeader: boolean,
            skipRows: number
        },
        newLoadSchema: any
    ): Promise<void> {
        if (PTblManager.Instance.hasTable(tableName)) {
            throw {
                error: "Table: " + tableName + " already exists"
            }
        }
        let loadApp = null;
        try {
            const tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
            this._focusOnTable(tableInfo, true);
            if (this._shouldUseNewLoad(args)) {
                loadApp = await this._newLoad(tableName, args, newLoadSchema, tableInfo);
            } else {
                await PTblManager.Instance.createTableFromSource(tableInfo, args);
            }
        } catch (e) {
            console.error("create table failed", e);
            this._refresh(); // update to remove loading icon
        } finally {
            const tableInfo: PbTblInfo = PTblManager.Instance.getTableByName(tableName);
            tableInfo.loadApp = loadApp;
            this._focusOnTable(tableInfo, false);
        }
    }

    private _shouldUseNewLoad(args) {
        const { sources } = args;
        const { targetName } = sources[0];
        return !xcGlobal.isLegacyLoad && DSTargetManager.isAWSConnector(targetName);
    }

    /**
     *
     * @param tableName
     * var a = {
    filePattern: "GlobalLandTemperaturesByCity_200lines.csv",
    CSV: {
        AllowQuotedRecordDelimiter: false,
        FieldDelimiter: ",",
        FileHeaderInfo: "USE",
        QuoteCharacter: "\"",
        QuoteEscapeCharacter: "\"",
        RecordDelimiter: "\r\n",
    },
    isRecursive: false,
    path: "/    xcfield/instantdatamart/tests/",
    progressCB: () => {},
    schema: {rowpath: "$", columns: [{
        name: '...',
        mapping: '...',
        type: 'DfString'
    }]}
}
     * @param args
     */
    private async _newLoad(
        tableName: string,
        args,
        newLoadSchema,
        tableInfo: PbTblInfo
    ): Promise<LoadApp> {
        LoadScreen.switchTab("loadHistory");
        return window["reactHack"]["newLoad"](tableName, args, newLoadSchema, tableInfo);

        const cleanupCancelledJobs = [];
        const SchemaLoadService = window.LoadServices['SchemaLoadService'];
        try {
            tableInfo.state = PbTblState.Loading;
            const { path, filePattern, isRecursive, connector } = this._adaptNewSourceArg(args);
            const inputSerialization = this._adaptInputSerialization(args);
            const schema = newLoadSchema;

            const app = await SchemaLoadService.createDiscoverApp({
                targetName: connector
            });

            const appId = app.appId;
            const loadAppObj = new LoadApp(app, tableInfo);
            tableInfo.loadApp = loadAppObj;
            this._loadApps.set(appId, loadAppObj);

            // // Get create table dataflow
            const { cancel: getQueryCancel, done: getQueryDone, cleanup: getQueryCleanup } = app.getCreateTableQueryWithCancel({
                path,
                filePattern,
                inputSerialization,
                isRecursive,
                schema,
                progressCB: (progress) => {
                    loadAppObj.updateProgress(progress, [0, 30]);
                }
            });
            loadAppObj.setCancelEvent(getQueryCancel);
            cleanupCancelledJobs.push(getQueryCleanup);
            const query = await getQueryDone();

            // Create data session tables
            const { cancel: createCancel, done: createDone } = app.createResultTablesWithCancel(query, (progress) => {
                loadAppObj.updateProgress(progress, [30, 95]);
            });
            loadAppObj.setCancelEvent(createCancel);
            const tables = await createDone();

            // Publish tables
            try {
                const dataTableName = await this._publishDataTable(tables.load, tableName, query.dataQueryComplete);
                loadAppObj.setDataTableName(dataTableName);
                tableInfo.state = null;
                console.log("_publishDataTable", dataTableName)
            } catch (e) {
                await Promise.all([
                    tables.load.destroy(),
                    // tables.data.destroy(),
                    // tables.comp.destroy()
                ]);
                throw e;
            }

            return loadAppObj;
        } catch (e) {
            console.error(e);
            for (const job of cleanupCancelledJobs) {
                await job();
            }
            tableInfo.state = PbTblState.Error;
            if (e !== SchemaLoadService.JobCancelExeption) {
                let error = e.message || e.error || e;
                error = xcHelper.parseError(error);
                tableInfo.errorMsg = error;
                this._focusOnTable(tableInfo, false);
                throw new Error(error);
            } else {
                tableInfo.errorMsg = xcHelper.parseError(e);
                this._focusOnTable(tableInfo, false);
                throw e;
            }

            return null;
        }
    }

    private _adaptNewSourceArg(args): {
        path: string,
        filePattern: string,
        isRecursive: boolean,
        connector: string
    } {
        const { sources, } = args;
        const source = sources[0];
        let { path, fileNamePattern, recursive, targetName } = source;
        if (!fileNamePattern && !path.endsWith('/')) {
            // when it's a single file
            const fullPath = path;
            const index = fullPath.lastIndexOf('/');
            path = fullPath.substring(0, index + 1);
            fileNamePattern = fullPath.substring(index + 1);
        } else {
            fileNamePattern = fileNamePattern || '*';
        }
        return {
            path,
            filePattern: fileNamePattern,
            isRecursive: recursive,
            connector: targetName
        };
    }

    private _adaptInputSerialization(args) {
        const format = args.format;
        if (format === 'CSV') {
            const { quoteChar, fieldDelim, lineDelim, hasHeader } = args;
            return {
                CSV: {
                    AllowQuotedRecordDelimiter: false,
                    FieldDelimiter: fieldDelim,
                    FileHeaderInfo: hasHeader ? "USE" : "NONE",
                    QuoteCharacter: quoteChar,
                    QuoteEscapeCharacter: quoteChar,
                    RecordDelimiter: lineDelim,
                }
            }
        } else if (format === "JSON" || format === "JSONL") {
            return {
                JSON: {
                    Type: "LINES"
                }
            }
        } else if (format === "PARQUETFILE") {
            return {
                Parquet: {}
            }
        }
    }

    async _publishDataTable(srcTable, publishTableName, creationQuery) {
        const dataName = PTblManager.Instance.getUniqName(publishTableName.toUpperCase());

        try {
            PTblManager.Instance.addLoadingTable(dataName);
            await srcTable.publishWithQuery(dataName, JSON.parse(creationQuery), {
                isDropSrc: true
            });

            // XD table operations
            PTblManager.Instance.removeLoadingTable(dataName);
            PTblManager.Instance.addTable(dataName);

            return  dataName;
        } catch(e) {
            PTblManager.Instance.removeLoadingTable(dataName);
            throw e;
        }
    }

    /**
     * TblSource.Instance.markActivating
     * @param tableName
     */
    public markActivating(tableName: string): void {
        return this._markActivating(tableName);
    }

    public activateTable(tableName: string): void {
        return this._activateTables([tableName]);
    }

    public deactivateTable(tableName: string): void {
        return this._deactivateTables([tableName]);
    }

    public async deleteTable(tableName: string): Promise<void> {
        return this._deleteTables([tableName]);
    }

    private _getGridByName(name): JQuery {
        return $("#dagListSection .tableList .table").filter((_index, el) => $(el).find(".name").text() === name);
    }

    private _refresh(): void {
        ResourceMenu.Instance.render(ResourceMenu.KEY.Table);
        this._updateTablesInAction();
    }

    private _focusOnTable(tableInfo: PbTblInfo, isLoading: boolean): void {
        if (tableInfo) {
            let loadMsg: string = null;
            if (isLoading) {
                loadMsg = tableInfo.loadMsg || TblTStr.Creating;
            }
            TblSourcePreview.Instance.show(tableInfo, loadMsg);
        }
    }

    private _activateTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            this._markActivating(name);
        });
        PTblManager.Instance.activateTables(tableNames)
        .fail(() => {
            this._refresh();
        });
    }

    private _markActivating(tableName: string): void {
        let $grid: JQuery = this._getGridByName(tableName);
        if (!$grid.hasClass("activating")) {
            this._addLoadingIcon($grid);
            $grid.addClass("activating");
        }
    }

    private _deactivateTables(tableNames: string[]): void {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
        });
        PTblManager.Instance.deactivateTables(tableNames)
        .fail(() => {
            // update UI
            this._refresh();
        });
    }

    private async _deleteTables(
        tableNames: string[]
    ): Promise<void> {
        tableNames.forEach((name) => {
            let $grid: JQuery = this._getGridByName(name);
            this._addDeactivateIcon($grid);
            this._addLoadingIcon($grid);
            $grid.addClass("deleting");
        });

        try {
            await PTblManager.Instance.deleteTables(tableNames);
        } catch (e) {
            console.error("drop table failed", e);
            this._refresh(); // update to remove loading/deleting icon
        }
    }

    private _addDeactivateIcon($grid: JQuery): void {
        let deactivateIcon: HTML =
        '<div class="deactivatingIcon" >' +
            '<i class="icon xi-forbid deactivating fa-15" ' +
            ' data-toggle="tooltip"' +
            ' data-container="body"' +
            ' data-title="' + DSTStr.DSDeactivating + '">' +
            '</i>' +
        '</div>';
        $grid.append(deactivateIcon);
        $grid.addClass("deactivating");
    }

    private _addLoadingIcon($grid: JQuery): void {
        $grid.addClass('inactive')
        .append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.addClass('loading');
    }

    private _updateTablesInAction(): void {
        PTblManager.Instance.getAvailableTables().forEach((tableInfo, tableName) => {
            if (tableInfo.state === PbTblState.Activating ||
                tableInfo.state === PbTblState.Deactivating ||
                tableInfo.state === PbTblState.Loading
            ) {
                let $grid = this._getGridByName(tableName);
                this._addLoadingIcon($grid);

                if (tableInfo.state === PbTblState.Deactivating) {
                    this._addDeactivateIcon($grid);
                }
            }
        });
    }
}

if (typeof runEntity !== "undefined") {
    runEntity.TblSource = TblSource;
}