class TblSourcePreview {
    private static _instance: TblSourcePreview;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private readonly _container: string = "pTblView";
    private _tableInfo: PbTblInfo;
    private _viewer: XcViewer;
    private _schemaSection: PTblSchema;
    private _dataSourceSchema: DataSourceSchema;

    private constructor() {
        this._initializeSchemaSection();
        this._setupDataSourceSchema();
        this._addEventListeners();
    }

    /**
     * TblSourcePreview.Instance.show
     * @param tableInfo
     * @param msg
     */
    public show(tableInfo: PbTblInfo, msg: string): void {
        let $container = this._getContainer();
        let $tableArea = this._getTableArea();
        let oldTableInfo = this._tableInfo;
        let isViewTable = ($container.hasClass("table") &&
        !$tableArea.hasClass("error") && !$tableArea.hasClass("loading"));
        this._tableInfo = tableInfo;
        DSForm.hide();
        $container.removeClass("xc-hidden")
                .removeClass("dataset")
                .removeClass("table")
                .removeClass("loading");

        let isLoading = msg != null;
        this._updateInstruction(tableInfo);
        this._updateTableInfos(tableInfo, isLoading);
        if (msg) {
            $container.addClass("loading");
            this._setupLoadingView(msg);
            window["reactHack"]["setLoadResultsPageVisible"](true);
        } else if (tableInfo.state === PbTblState.Error) {
            this._setErrorView(tableInfo.errorMsg || 'Load table error');
        } else if (tableInfo.state === PbTblState.BeDataset) {
            $container.addClass("dataset");
            this._viewDatasetTable(tableInfo);
        } else {
            $container.addClass("table");
            let isSameTable: boolean = isViewTable &&
            (oldTableInfo != null && oldTableInfo.name === tableInfo.name);
            this._viewTableResult(tableInfo, isSameTable);
        }
    }

    public refresh(tableInfo: PbTblInfo): void {
        if (!this.isOnTable(tableInfo.name)) {
            return;
        }
        this.show(tableInfo, tableInfo.loadMsg);
    }

    /**
     * TblSourcePreview.Instance.close
     */
    public close(): void {
        const $container = this._getContainer();
        $container.addClass("xc-hidden");
        this._getInfoSection().empty();
        this._schemaSection.clear();
        this._closeTable();

        this._tableInfo = null;
    }

    /**
     * TblSourcePreview.Instance.isOnTable
     * @param tableName
     */
    public isOnTable(tableName: string): boolean {
        const $container = this._getContainer();
        if ($container.is(":visible") &&
            this._tableInfo != null &&
            this._tableInfo.name === tableName
        ) {
            return true;
        } else {
            return false;
        }
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getSchemaSection(): JQuery {
        return this._getContainer().find(".schemaSection");
    }

    private _getInfoSection(): JQuery {
        return this._getContainer().find(".infoSection");
    }

    private _getTableArea(): JQuery {
        return this._getContainer().find(".tableArea");
    }

    private _initializeSchemaSection(): void {
        const $section = this._getContainer().find(".schemaSection");
        this._schemaSection = new PTblSchema($section);
    }

    private _setupDataSourceSchema() {
        let $section = this._getContainer().find(".tblSchema");
        this._dataSourceSchema = new DataSourceSchema($section);
        this._dataSourceSchema
        .registerEvent(DataSourceSchemaEvent.GetHintSchema, () => {
            return this._getSchemaForWizard(this._viewer);
        })
        .registerEvent(DataSourceSchemaEvent.ChangeSchema, (args) => {
            let schema = args.schema;
            if (this._viewer instanceof XcDatasetViewer) {
                this._viewer.setDisplaySchema(schema);
            }
        });
    }

    private _setupLoadingView(msg: string): void {
        this._showSchemaSection();
        const $section = this._getSchemaSection();
        let html: HTML = null;
        if (this._tableInfo && this._tableInfo.loadApp) {
            html = this._tableInfo.loadApp.getStatusHTML();
        } else {
            html = this._loadHTMLTemplate(msg);
        }
        $section.find(".content").html(html);
    }

    private _setErrorView(error: string): void {
        this._showSchemaSection();
        const $section = this._getSchemaSection();
        const html: HTML = `<div style="color: #F46D73; white-space: pre-wrap; padding: 1rem;">${error}</div>`;
        $section.find(".content").html(html);
    }

    private _loadHTMLTemplate(text: string): HTML {
        const html: HTML =
        '<div class="loadingContainer">' +
            '<div class="loading animatedEllipsisWrapper">' +
                '<div class="text">' +
                text +
                '</div>' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        return html;
    }

    private _updateInstruction(tableInfo: PbTblInfo): void {
        const $instr: JQuery = this._getContainer().find(".cardInstruction .text span");
        let instr: string;
        if (tableInfo.state === PbTblState.BeDataset) {
            instr = xcStringHelper.replaceMsg(TblTStr.MultipleSchema, {
                name: tableInfo.name
            });
        } else {
            instr = TblTStr.PreviewInstr;
        }
        $instr.text(instr);
    }

    private _updateTableInfos(
        tableInfo: PbTblInfo,
        isLoading: boolean
    ): void {
        let divider: HTML = '<span class="divider">|</span>';
        let infos: {key: string, text: string}[] = [{
            key: "name",
            text: CommonTxtTstr.Name
        }, {
            key: "createTime",
            text: CommonTxtTstr.CreateTime,
        }, {
            key: "rows",
            text: CommonTxtTstr.Rows
        }, {
            key: "cols",
            text: CommonTxtTstr.Columns
        },  {
            key: "size",
            text: CommonTxtTstr.Size
        }, {
            key: "status",
            text: CommonTxtTstr.Status
        }];
        let tableDisplayInfo = PTblManager.Instance.getTableDisplayInfo(tableInfo);
        let html: HTML = infos.map((info) => {
            let key: string = info.key;
            let value: string = tableDisplayInfo[key];
            let content: HTML =
            `<span class="label ${key}">` +
                info.text + ":" +
            '</span>' +
            '<span class="value">' +
                value +
            '</span>';

            if (key === "rows" && value.startsWith("~")) {
                // the table has updates which cause row count not accurate
                content +=
                '<span class="hint">' +
                    '<i class="qMark icon xi-unknown" ' +
                    'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'data-placement="auto top" ' +
                    'data-original-title="' + TblTStr.EstimatedRowCountHint + '">' +
                    '</i>' +
                '</span>';
            }

            return content;
        }).join(divider);

        if (!isLoading &&
            tableInfo.state == null
        ) {
            // when it's a normal table
            html += '<span class="action xc-action"></span>';
        }

        this._getInfoSection().html(html);

        if (isLoading) {
            DataSourceManager.switchStep(DataSourceManager.ImportSteps.Result);
        } else {
            DataSourceManager.switchStep(null);
        }
    }

    private _updateTableAction(toViewTable: boolean): void {
        let $action = this._getInfoSection().find(".action");
        if (toViewTable) {
            $action.removeClass("viewSchema")
                    .addClass("viewTable")
                    .text(TblTStr.Viewdata);
        } else {
            $action.addClass("viewSchema")
                    .removeClass("viewTable")
                    .text(TblTStr.Viewschema);
        }
    }

    private _showSchemaSection(): void {
        this._getTableArea().addClass("xc-hidden");
        this._getSchemaSection().removeClass("xc-hidden");
    }

    private _showTableSection(): void {
        this._getTableArea().removeClass("xc-hidden");
        this._getSchemaSection().addClass("xc-hidden");
    }

    private _viewSchema(tableInfo: PbTblInfo): void {
        this._updateTableAction(true);
        this._showSchemaSection();
        const columns: PbTblColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
        this._schemaSection.render(columns);
    }

    private _viewTableResult(
        tableInfo: PbTblInfo,
        isSameTable: boolean
    ): XDPromise<void> {
        // const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._updateTableAction(false);
        this._showTableSection();
        let $tableArea = this._getTableArea();
        if (!tableInfo.active) {
            // inactive table should show error
            this._showTableViewError(ErrTStr.InactivateTable);
            return PromiseHelper.resolve();
        }
        if (isSameTable) {
            return PromiseHelper.resolve();
        }

        $tableArea.addClass("loading").removeClass("error");
        if (this._tableInfo && this._tableInfo.loadApp) {
            $tableArea.find(".loadingSection").html(this._tableInfo.loadApp.getStatusHTML());
        } else {
            $tableArea.find(".loadingSection").html("Table is created! Please go into a notebook project and check.");
        }
        return PromiseHelper.resolve();

        // if (WorkbookManager.getActiveWKBK() == null) {
        //     $tableArea.addClass("loading").removeClass("error");
        //     $tableArea.find(".loadingSection").html("Table is created! Please go into a project and check.");
        //     return PromiseHelper.resolve();
        // }

        // $tableArea.addClass("loading").removeClass("error");
        // let loadingHTML = this._loadHTMLTemplate(StatusMessageTStr.Loading);
        // $tableArea.find(".loadingSection").html(loadingHTML);

        // let hasSelectTable: boolean = false;
        // PTblManager.Instance.selectTable(tableInfo, 100)
        // .then((resultName) => {
        //     hasSelectTable = true;
        //     if (tableInfo == this._tableInfo) {
        //         $tableArea.removeClass("loading");
        //         let schema: ColSchema[] = PTblManager.Instance.getTableSchema(tableInfo);
        //         let table: TableMeta = this._getResultMeta(resultName, schema);
        //         let viewer = new XcTableViewer(table);
        //         return this._showTable(viewer);
        //     }
        // })
        // .then(() => {
        //     deferred.resolve();
        // })
        // .fail((error) => {
        //     if (tableInfo === this._tableInfo && !hasSelectTable) {
        //         $tableArea.removeClass("loading")
        //                 .addClass("error");
        //         let errorMsg = xcHelper.parseError(error);
        //         $tableArea.find(".errorSection").text(errorMsg);
        //     }
        //     deferred.reject(error);
        // });

        // return deferred.promise();
    }

    private _viewDatasetTable(tableInfo: PbTblInfo): XDPromise<void> {
        let dsName: string = tableInfo.dsName;
        let dsObj: DSObj = new DSObj({
            fullName: dsName
        });
        let $tableArea = this._getTableArea();
        $tableArea.removeClass("error").removeClass("loading");
        let viewer = new XcDatasetViewer(dsObj);

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._showTable(viewer)
        .then((isSameViewer: boolean) => {
            let schema = this._getSchemaForWizard(viewer);
            if (!isSameViewer && schema != null) {
                this._dataSourceSchema.setSchema(schema);
                viewer.setDisplaySchema(schema);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getResultMeta(name: string, schema: ColSchema[]): TableMeta {
        let progCols: ProgCol[] = schema.map((colInfo) => {
            return ColManager.newPullCol(colInfo.name, colInfo.name, colInfo.type);
        });
        progCols.push(ColManager.newDATACol());
        let tableId = xcHelper.getTableId(name);
        let table = new TableMeta({
            tableId: tableId,
            tableName: name,
            tableCols: progCols
        });
        table.allImmediates = true;
        gTables[tableId] = table;
        return table;
    }

    // XXX TODO: combine show table related logic with SQLTable, DagTable...
    private _showTable(viewer: XcViewer): XDPromise<any> {
        this._showTableSection();

        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve(true);
        }

        this._clearViewer();
        this._viewer = viewer;
        return this._showViewer();
    }

    private _showViewer(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getTableArea();
        $container.removeClass("xc-hidden").addClass("loading");
        const viewer = this._viewer;
        const $tableSection: JQuery = $container.find(".tableSection");
        viewer.render($tableSection)
        .then(() => {
            if (viewer === this._viewer) {
                $container.removeClass("loading");
                TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            }
            $("#pTblView .xcTableWrap").addClass("undraggable").addClass('pTblViewPreview');
            deferred.resolve();
        })
        .fail((error) => {
            if (viewer === this._viewer) {
                this._showTableViewError(error);
            }
            deferred.reject(error);
        });

        const promise = deferred.promise();
        xcUIHelper.showRefreshIcon($tableSection, true, promise);
        return promise;
    }

    private _closeTable(): void {
        this._getContainer().removeClass("datast");
        this._getTableArea().addClass("xc-hidden");
        this._clearViewer();
    }

    private _isSameViewer(viewer: XcViewer): boolean {
        const currentViewer = this._viewer;
        if (currentViewer == null) {
            return false;
        }
        if (currentViewer.getId() != viewer.getId()) {
            return false;
        }
        return true;
    }

    private _clearViewer(): void {
        if (this._viewer != null) {
            this._viewer.clear();
            this._viewer = null;
        }
        let $tableArea: JQuery = this._getTableArea();
        $tableArea.removeClass("loading").removeClass("error");
        $tableArea.find(".errorSection").empty();
    }

    private _showTableViewError(error: any): void {
        const $container: JQuery = this._getTableArea();
        $container.removeClass("loading").addClass("error");
        const errStr: string = (typeof error === "string") ?
        error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }

    private _getSchemaForWizard(viewer: XcViewer): ColSchema[] {
        if (viewer instanceof XcDatasetViewer) {
            let schemaArray = viewer.getSchemaArray() || [];
            let initialSchema: ColSchema[] = [];
            let schemaToSelect: ColSchema[] = [];
            let validTyes: ColumnType[] = BaseOpPanel.getBasicColTypes();
            schemaArray.forEach((schemas) => {
                if (schemas.length === 1) {
                    let schema = schemas[0];
                    if (validTyes.includes(schema.type)) {
                        initialSchema.push(schema);
                        schemaToSelect.push(schema);
                    }
                } else {
                    schemaToSelect.push({
                        name: schemas[0].name,
                        type: null
                    });
                }
            });
            return schemaToSelect;
        } else {
            return null;
        }
    }

    private async _cancelLoad(): Promise<void> {
        if (this._tableInfo && this._tableInfo.loadApp) {
            try {
                const canceled = await this._tableInfo.loadApp.cancel();
                if (canceled) {
                    this._tableInfo.state = PbTblState.Canceling;
                    this.show(this._tableInfo, "Canceling");
                }
            } catch (e) {
                console.error(e);
            }
        }
    }

    private _createICV() {
        if (this._tableInfo && this._tableInfo.loadApp) {
            this._tableInfo.loadApp.createICVTable();
        }
    }

    private _addEventListeners(): void {
        const $infoSection = this._getInfoSection();
        $infoSection.on("click", ".viewTable", () => {
            this._viewTableResult(this._tableInfo, false);
        });

        $infoSection.on("click", ".viewSchema", () => {
            this._viewSchema(this._tableInfo);
        });

        const $schemaSection = this._getSchemaSection();
        $schemaSection.on("click", ".loadingContainer .cancel", () => {
            this._cancelLoad();
        });

        this._getContainer().on("click", ".createICV", () => {
            this._createICV();
        });
    }
}

if (typeof runEntity !== "undefined") {
    runEntity.TblSourcePreview = TblSourcePreview;
}