class SQLTable {
    private _container: string;
    private _searchBar: TableSearchBar;
    private _currentViewer: XcTableViewer;
    private _listScroller: ListScroller;

    public constructor(container: string) {
        this._container = container;
        this._addEventListeners();
        this._searchBar = new TableSearchBar(this._container);
    }

    public show(
        table: TableMeta,
        columns: {name: string, backName: string, type: ColumnType}[],
        callback?: Function
    ): XDPromise<XcPbTableViewer> {
        const deferred: XDDeferred<XcPbTableViewer> = PromiseHelper.deferred();
        this._addColumnsToTable(table, columns);
        const viewer: XcTableViewer = new XcTableViewer(table, {
            fromSQL: true
        });

        this._show(viewer)
        .then(deferred.resolve)
        .fail((error) => {
            if (error &&
                typeof error === "object" &&
                error.status === StatusT.StatusDsNotFound &&
                typeof callback === "function"
            ) {
                callback();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public async showPublishedTable(tableName: string): Promise<void> {
        // XXX TODO: copy the whole behavior of TblSource.ts
        let tableInfo: PbTblInfo = PTblManager.Instance.getTableByName(tableName);
        const resultName: string = await PTblManager.Instance.selectTable(tableInfo, 100);
        tableInfo = PTblManager.Instance.getTableByName(tableName); // num rows get updated
        let tableId = xcHelper.getTableId(resultName);
        if (!tableId) {
            throw new Error(SQLErrTStr.NoResult);
        }
        const table = new TableMeta({
            tableId: tableId,
            tableName: resultName
        });
        const schema = tableInfo.getSchema();
        const columns = schema.map((col) => {
            return {
                name: col.name,
                backName: col.name,
                type: col.type
            };
        });
        this._addColumnsToTable(table, columns);
        gTables[table.getId()] = table;
        const viewer: XcPbTableViewer = new XcPbTableViewer(table, tableName);
        await this._show(viewer);
        viewer.updateTotalNumRows(tableInfo.rows);
    }

    public getViewer(): XcViewer {
        return this._currentViewer;
    }

    public getTable(): string {
        return this._currentViewer ? this._currentViewer.getId() : null;
    }

    public getView(): JQuery {
        return this._currentViewer ? this._currentViewer.getView() : null;
    }

    public getSearchBar(): TableSearchBar {
        return this._searchBar;
    }

    /**
     * close the preview
     */
    public close(): void {
        this._close();
    }

    public replaceTable(table: TableMeta): XDPromise<XcPbTableViewer | XcTableViewer> {
        if (!(this._currentViewer instanceof XcPbTableViewer)) {
            return PromiseHelper.resolve(this._currentViewer); // invalid case
        }
        const currentViewer: XcPbTableViewer = <XcPbTableViewer>this._currentViewer;
        const viewer = currentViewer.replace(table);
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }
        let deferred:XDDeferred<XcPbTableViewer | XcTableViewer>  = PromiseHelper.deferred();

        this._show(viewer)
        .then(() => {
             viewer.updateTotalNumRows(table.resultSetCount);
            deferred.resolve(viewer);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _show(viewer: XcTableViewer): XDPromise<XcPbTableViewer | XcTableViewer> {
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }

        this._reset();
        this._currentViewer = viewer;
        return this._showViewer();
    }

    private _close(): void {
        this._getContainer().addClass("xc-hidden");
        this._reset();
    }

    private _showViewer(): XDPromise<XcPbTableViewer | XcTableViewer> {
        DagTable.Instance.close();

        const deferred: XDDeferred<XcPbTableViewer | XcTableViewer> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.removeClass("xc-hidden").addClass("loading");

        this._addLoadingText();
        const viewer = this._currentViewer;
        const $tableSection: JQuery = $container.find(".tableSection");
        viewer.setContainer($container);
        this._renderTableNameArea(viewer);

        viewer.render($tableSection, true)
        .then(() => {
            $container.removeClass("loading");
            TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            deferred.resolve(viewer);
        })
        .fail((error) => {
            this._error(error);
            deferred.reject(error);
        });

        const promise = deferred.promise();
        xcUIHelper.showRefreshIcon($tableSection, true, promise);
        return promise;
    }

    private _addLoadingText(): void {
        let html: HTML =
            '<div class="animatedEllipsisWrapper">' +
                '<div class="text">Loading</div>' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>';
        const $container: JQuery = this._getContainer();
        $container.find(".loadingSection").html(html);
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        $container.on("click", ".close", () => {
            this.close();
        });
        this._listScroller = new ListScroller(
            $container.find(".tableBar"),
            $container.find(".tableBarWrap"),
            false,
            {
                bounds: `#sqlTableArea`,
                noPositionReset: true
            });
        $container.mouseenter(() => {
            this._listScroller.showOrHideScrollers();
        });

    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _reset(): void {
        this._resetViewer();
        this._clearTableNameArea();
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").removeClass("error");
        $container.find(".errorSection").empty();
    }

    private _resetViewer(): void {
        if (this._currentViewer != null) {
            this._currentViewer.clear();
            this._currentViewer = null;
        }
    }

    private _error(error: any): void {
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").addClass("error");
        const errStr: string = (typeof error === "string") ?
        error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }

    private _isSameViewer(viewer: XcViewer): boolean {
        const currentViewer = this._currentViewer;
        if (currentViewer == null) {
            return false;
        }
        if (currentViewer.getId() != viewer.getId()) {
            return false;
        }
        return true;
    }

    private _getTableNameArea(): JQuery {
        return this._getContainer().find(".tableNameArea");
    }

    private _renderTableNameArea(viewer: XcViewer) {
        const $nameArea: JQuery = this._getTableNameArea();
        if (viewer instanceof XcPbTableViewer) {
            this._clearTableNameArea();
        } else {
            $nameArea.removeClass("xc-hidden");
            $nameArea.find(".name").text(viewer.getId());
        }
    }

    private _clearTableNameArea(): void {
        const $nameArea = this._getTableNameArea();
        $nameArea.addClass("xc-hidden");
        $nameArea.find(".name").empty();
    }

    private _addColumnsToTable(
        table: TableMeta,
        columns: {name: string, backName: string, type: ColumnType}[]
    ): void {
        table.allImmediates = true;

        if (columns) {
            let tableCols: ProgCol[] = [];
            columns.forEach((col) => {
                tableCols.push(ColManager.newPullCol(col.name,
                                     col.backName, col.type));
            });
            tableCols.push(ColManager.newDATACol());
            table.addAllCols(tableCols);
        }
    }
}