class SQLTableLister extends AbstractSQLResultView {
    private _attributes: {key: string, text: string}[];
    private _tableInfos: PbTblInfo[];
    private _sortKey: string;
    private _reverseSort: boolean;

    public constructor(container: string) {
        super(container);
        this._tableInfos = [];
        this._setupArrtibutes();
        this._initializeMainSection();
        this._addEventListeners();
    }

    /**
     *
     * @param reset
     */
    public show(reset: boolean): XDPromise<void> {
        const $container = this._getContainer();
        $container.removeClass("xc-hidden");
        if (reset) {
            this._reset();
            return this._listTables(false);
        } else {
            return PromiseHelper.resolve();
        }
    }

    /**
     *
     */
    public close(): void {
        this._getContainer().addClass("xc-hidden");
    }

    public refresh(fetch?: boolean):  XDPromise<void> {
        const $container = this._getContainer();
        if (!$container.hasClass("xc-hidden") || fetch) {
            return this._listTables(fetch || false);
        } else {
            return PromiseHelper.resolve();
        }
    }

    public getAvailableTables(): PbTblInfo[] {
        return this._getAvailableTables();
    }

    private _reset(): void {
        this._getSearchInput().val("");
        this._getMainContent().empty();
        this._tableInfos = [];
        this._sortKey = null;
        this._reverseSort = null;
    }

    private _setupArrtibutes(): void {
        this._attributes = [{
            key: "name",
            text: CommonTxtTstr.Name
        }, {
            key: "createTime",
            text: CommonTxtTstr.CreateTime,
        }, {
            key: "rows",
            text: CommonTxtTstr.Rows
        }, {
            key: "size",
            text: CommonTxtTstr.Size
        }, {
            key: "status",
            text: CommonTxtTstr.Status
        }];
    }

    private _getTableInfoFromRowEl($row: JQuery): PbTblInfo {
        let index = Number($row.data("index"));
        return this._getTableInfoFromIndex(index);
    }

    private _getAvailableTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = PTblManager.Instance.getTables();
        tables = tables.filter((table) => {
            if (table.state === PbTblState.BeDataset) {
                return false;
            }
            if (table.name == null ||
                table.name.toUpperCase() !== table.name) {
                return false;
            }
            return true;
        });
        return tables;
    }

    private _getTableInfoFromIndex(index: number): PbTblInfo {
        for (let i = 0; i < this._tableInfos.length; i++) {
            let table = this._tableInfos[i];
            if (table.index === index) {
                return table;
            }
        }
        return null;
    }

    private _listTables(refresh: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $content = this._getMainSection().find(".content");
        const promise = deferred.promise();
        this._onLoadingMode();

        let timer = setTimeout(() => {
            xcUIHelper.showRefreshIcon($content, true, promise);
        }, 800);

        PTblManager.Instance.getTablesAsync(refresh)
        .then(() => {
            this._tableInfos = this._getAvailableTables();
            this._render(refresh);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            clearTimeout(timer);
            this._offLoadingMode();
        });
        return promise;
    }

    private _onLoadingMode(): void {
        this._getContainer().addClass("loading");
    }

    private _offLoadingMode(): void {
        this._getContainer().removeClass("loading");
    }

    private _activateTable($row: JQuery): XDPromise<void> {
        if ($row.length === 0) {
            return PromiseHelper.resolve();
        }

        let tableInfo = this._getTableInfoFromRowEl($row);
        if (tableInfo == null) {
            return PromiseHelper.reject();
        }
        let copyTableInfo = xcHelper.deepCopy(tableInfo);
        copyTableInfo.state = PbTblState.Activating;
        copyTableInfo = new PbTblInfo(copyTableInfo);
        this._replaceRowContent($row, copyTableInfo);

        return PTblManager.Instance.activateTables([tableInfo.name]);
    }

    private _deactivateTable($row: JQuery): XDPromise<void> {
        if ($row.length === 0) {
            return PromiseHelper.resolve();
        }

        let tableInfo = this._getTableInfoFromRowEl($row);
        if (tableInfo == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let copyTableInfo = xcHelper.deepCopy(tableInfo);
        copyTableInfo.state = PbTblState.Deactivating;
        copyTableInfo = new PbTblInfo(copyTableInfo);
        this._replaceRowContent($row, copyTableInfo);

        PTblManager.Instance.deactivateTables([tableInfo.name])
        .then(deferred.resolve)
        .fail((error) => {
            this._replaceRowContent($row, tableInfo);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _initializeMainSection(): void {
        const html: HTML =
        '<div class="header">' +
            '<div class="row"></div>' +
        '</div>' +
        '<div class="content"></div>';
        this._getMainSection().html(html);
    }

    private _render(refresh: boolean = false): void {
        let rowWidth: number[] = null;
        if (refresh) {
            this._getColumnsWidth(this._getMainSection().find(".header .row"));
        }
        this._renderHeader();
        let tableInfos = this._sortTables(this._tableInfos);
        let html: HTML = tableInfos.map((tableInfo) => {
            let row: HTML =
            `<div class="row" data-index="${tableInfo.index}">` +
                this._renderRowContent(tableInfo) +
            '</div>';
            return row;
        }).join("");

        if (!html) {
            html =
            '<div class="hintWrap">' +
                '<div class="hint">' +
                    '<button class="btn btn-submit createTable">' +
                        TblTStr.New +
                    '</button>'
                '</div>' +
            '</div>';
        }

        this._getMainContent().html(html);
        this._filterTables();
        this._updateActions(null);
        this._resizeEvents();
        if (refresh) {
            this._resizeColums(rowWidth, true);
        }
    }

    private _renderHeader(): void {
        let header: HTML = this._attributes.map((attr) => {
            let key: string = attr.key;
            let upIcon = '<i class="icon fa-7 xi-arrow-up"></i>';
            let downIcon = '<i class="icon fa-7 xi-arrow-down"></i>';
            let sortIcon = "";
            if (key === this._sortKey) {
                sortIcon = this._reverseSort ? downIcon : upIcon;
            } else {
                sortIcon = '<span class="sortIconWrap">' +
                                upIcon +
                                downIcon +
                            '</span>';
            }
            let html: HTML =
            `<div class="${key} title" data-key="${key}">` +
                '<div class="label">' +
                    attr.text +
                '</div>' +
                '<div class="sort">' +
                    sortIcon +
                '</div>' +
            "</div>";
            return html;
        }).join("");
        this._getMainSection().find(".header .row").html(header);
    }

    private _renderRowContent(tableInfo: PbTblInfo): HTML {
        let displayInfo: PbTblDisplayInfo = PTblManager.Instance.getTableDisplayInfo(tableInfo);
        let html: HTML = this._attributes.map((attr) => {
            let key: string = xcStringHelper.escapeHTMLSpecialChar(attr.key);
            let val: string = displayInfo[attr.key];
            let text: string = xcStringHelper.escapeHTMLSpecialChar(val);
            let title = text;
            if (key === "status") {
                text = this._getStatusCellContent(tableInfo, text);
            }
            if (key === "name") {
                text = '<span>' + text + '</span>';
            }
            let tooltip: string =
            'data-toggle="tooltip" ' +
            'data-container="body" ' +
            'data-title="' + title + '"';
            return `<div class="${key} tooltipOverflow" ${tooltip}>${text}</div>`;
        }).join("");
        return html;
    }

    private _replaceRowContent($row: JQuery, tableInfo: PbTblInfo): void {
        let html = this._renderRowContent(tableInfo);
        $row.html(html);
    }

    private _getStatusCellContent(
        tableInfo: PbTblInfo,
        text: string
    ): HTML {
        let html: HTML = "";
        if (tableInfo.state === PbTblState.Activating) {
            html = this._getInActionHTML(DSTStr.DSActivating);
        } else if (tableInfo.state === PbTblState.Deactivating) {
            html = this._getInActionHTML(DSTStr.DSDeactivating);
        } else {
            let isActive: boolean = tableInfo.active;
            let title = (isActive ? TblTStr.ToDeactivate : TblTStr.ToActivate);
            let action = (isActive ? "deactivate" : "activate");
            html =
            '<span class="' + action + '"' +
            ' data-toggle="tooltip"' +
            ' data-container="body"' +
            ' data-title="' + title + '"' +
            '">' +
                text +
            '</span>';
        }
        return html;
    }

    private _getInActionHTML(text: string): HTML {
        let html: string =
        '<div class="animatedEllipsisWrapper">' +
            '<div class="text">' +
                text +
            '</div>' +
            '<div class="wrap">' +
                '<div class="hiddenEllipsis">....</div>' +
                '<div class="animatedEllipsis staticEllipsis">....</div>' +
            '</div>' +
        '</div>';
        return html;
    }

    private _unSelectTableList(): void {
        this._getMainContent().find(".row.selected").removeClass("selected");
    }

    private _selectTableList($row: JQuery): void {
        if ($row.hasClass("selected")) {
            return;
        }
        this._unSelectTableList();
        $row.addClass("selected");

        let tableInfo = this._getTableInfoFromRowEl($row);
        this._updateActions(tableInfo);
    }

    private _updateActions(tableOnFocus: {active: boolean}): void {
        const $section = this._getTopSection();
        const $btns = $section.find(".viewSchema");

        if (!tableOnFocus) {
            // no table
            $btns.addClass("xc-disabled");
            xcTooltip.add($btns.parent(".tooltipWrapper"),
                { "title": TooltipTStr.SelectToViewSchema});
        } else {
            $btns.removeClass("xc-disabled");
            xcTooltip.remove($btns.parent(".tooltipWrapper"));
        }
    }

    private _showSchema(): void {
        const $row = this._getMainContent().find(".row.selected");
        this._showSchemaFromRow($row);
    }

    private _showSchemaFromRow($row: JQuery): void {
        if ($row.length === 0) {
            return;
        }
        const index: number = Number($row.data("index"));
        const tableInfo = this._getTableInfoFromIndex(index);
        SQLResultSpace.Instance.showSchema(tableInfo);
    }

    private _sortAction(sortKey): void {
        if (sortKey !== this._sortKey) {
            this._sortKey = sortKey;
            this._reverseSort = false; // asc sort
        } else if (this._reverseSort === false) {
            this._reverseSort = true; // des sort
        } else {
            this._reverseSort = null; // no sort
            this._sortKey = null;
        }
        let $row: JQuery = this._getMainSection().find(".header .row");
        let rowWidth: number[] = this._getColumnsWidth($row);
        this._render();
        this._resizeColums(rowWidth, false);
    }

    private _sortTables(tableInfos: PbTblInfo[]): PbTblInfo[] {
        if (this._sortKey == null) {
            return tableInfos;
        }
        let tables = tableInfos.map((table) => table);
        // sort by name first
        tables.sort((a, b) => {
            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        });

        let key = this._sortKey;
        if (key === "createTime" ||
            key === "rows" ||
            key === "size"
        ) {
            tables.sort((a, b) => {
                let aVal = a[key];
                let bVal = b[key];
                if (aVal == null && bVal == null) {
                    return 0;
                }
                if (bVal == null) {
                    return 1;
                }
                if (aVal == null) {
                    return -1;
                }
                return aVal - bVal;
            });
        } else if (key === "status") {
            tables.sort((a, b) => {
                let aVal = a.active ? 1 : 0;
                let bVal = b.active ? 1 : 0;
                return aVal - bVal;
            });
        }

        if (this._reverseSort) {
            tables = tables.reverse();
        }
        return tables;
    }

    private _resizeEvents(): void {
        const $mainSection = this._getMainSection();
        $mainSection.find(".row").each((_i, el) => {
            let $row = $(el);
            $row.find("> div").each((index, el) => {
                if (index !== 0) {
                    this._addResizeEvent($(el));
                }
            });
        });
    }

    protected _addEventListeners(): void {
        super._addEventListeners();
        const $mainSection = this._getMainSection();
        $mainSection.find(".header").on("click", ".title .label, .title .sort", (event) => {
            let sortKey = $(event.currentTarget).closest(".title").data("key");
            this._sortAction(sortKey);
        });

        const $mainContent = this._getMainContent();
        $mainContent.on("click", ".row", (event) => {
            this._selectTableList($(event.currentTarget));
        });

        $mainContent.on("click", ".activate", (event) => {
            xcTooltip.hideAll();
            let $row = $(event.currentTarget).closest(".row");
            this._activateTable($row);
        });

        $mainContent.on("click", ".deactivate", (event) => {
            xcTooltip.hideAll();
            let $row = $(event.currentTarget).closest(".row");
            this._deactivateTable($row);
        });

        $mainContent.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $mainContent.on("click", ".createTable", (event) => {
            $(event.currentTarget).blur();
            HomeScreen.switch(UrlToTab.load);
        });

        $mainContent.on("click", ".name span", (event) => {
            let $row = $(event.currentTarget).closest(".row");
            this._showSchemaFromRow($row);
        });

        const $topSection = this._getTopSection();
        $topSection.find(".refresh").click(() => {
            this._listTables(true);
        });

        $topSection.find(".viewSchema").click(() => {
            this._showSchema();
        });
    }
}