class XcTableViewer extends XcViewer {
    protected table: TableMeta;
    protected rowInput: RowInput;
    protected skew: TableSkew;
    protected rowManager: RowManager;
    private $container: JQuery;
    private _options: any

    public constructor(table: TableMeta, options: any = {}) {
        const tableName: string = table.getName(); // use table name as unique id
        super(tableName);
        this._initializeColumnWidth(table);
        this.table = table;
        this.rowManager = new RowManager(table, this.getView());
        this.rowInput = new RowInput(this.rowManager);
        this.skew = new TableSkew(this.table);
        this._options = options;
    }

    public getTitle(): string {
        return "";
    }

    /**
     * Clear Table Preview
     */
    public clear(isRefresh: boolean = false): XDPromise<void> {
        super.clear();
        this.rowInput.clear();
        this.skew.clear();
        if (isRefresh) {
            return PromiseHelper.resolve();
        }
        return this.table.freeResultset();
    }

    public setContainer($container): void {
        this.$container = $container;
    }

    /**
     * Render the view of the data
     */
    public render($section: JQuery, autoAddCols: boolean = false): XDPromise<void> {
        this._addEventListeners();
        let table = this.table;
        gTables[table.getId()] = table;
        super.render($section);
        let $container = this.$container || $section;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.table.getMetaAndResultSet()
        .then(() => {
            if (autoAddCols) {
                this._autoAddCols();
            }
            return this._startBuildTable();
        })
        .then(() => {
            this._afterBuild();
            this._renderSkew($container.parent());
            this._renderRowInput($container.parent());
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }
    /**
     * Return the rowManager instacne
     */
    public getRowManager(): RowManager {
        return this.rowManager;
    }

    // XXX TODO: remove the protected functions, no use anymore
    protected _afterGenerateTableShell(): void {};
    protected _afterBuildInitialTable(_tableId: TableId): void {};

    private _addEventListeners(): void {
        // XXX this is still buggy, need update!
        this.$view.off("scroll");
        this.$view.scroll((event) => {
            $(event.target).scrollTop(0);
            TblFunc.moveFirstColumn(null);
            TblFunc.alignLockIcon();
        });
    }

    private _initializeColumnWidth(table: TableMeta): void {
        if (table.tableCols == null) {
            return;
        }
        table.tableCols.forEach((progCol: ProgCol) => {
            if (progCol.width == null) {
                let colName: string = progCol.getFrontColName();
                let prefix: string = progCol.getPrefix();
                let width: number = xcHelper.getDefaultColWidth(colName, prefix);
                progCol.width = width;
            }
        });
    }

    private _autoAddCols(): void {
        let table = this.table;
        if (table.getAllCols() != null) {
            return; // only add when no cols
        }
        let progCols = [];
        try {
            table.backTableMeta.valueAttrs.forEach((valueAttr) => {
                let name = valueAttr.name;
                let progCol: ProgCol = ColManager.newPullCol(name, name);
                progCol.setImmediateType(valueAttr.type);
                progCols.push(progCol);
            });
        } catch (e) {
            console.error(e);
        }
        progCols.push(ColManager.newDATACol());
        table.tableCols = progCols;
        this._initializeColumnWidth(table);
    }

    private _startBuildTable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const table: TableMeta = this.table;
        const tableId: TableId = table.getId();
        let initialTableBuilt: boolean = false;

        this.rowManager.getFirstPage()
        .then((jsonData) => {
            let isEmpty: boolean = false;
            table.currentRowNumber = jsonData.length;
            if (table.resultSetCount === 0) {
                isEmpty = true;
            }

            this._generateTableShell(tableId);
            this._buildInitialTable(table, jsonData, isEmpty);
            initialTableBuilt = true;

            const $table: JQuery = $('#xcTable-' + tableId);
            const requiredNumRows: number = Math.min(TblManager.maxEntriesPerPage,
                                              table.resultSetCount);
            const numRowsStillNeeded: number = requiredNumRows - $table.find('tbody tr').length;
            if (numRowsStillNeeded > 0) {
                const info = {
                    "bulk": false,
                    "dontRemoveRows": true,
                    "numRowsAdded": null,
                    "numRowsToAdd": null,
                    "missingRows": []
                };

                return this.rowManager.addRows(table.currentRowNumber,
                                            numRowsStillNeeded,
                                            RowDirection.Bottom, info);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (!initialTableBuilt) {
                console.error("startBuildTable fails!", error);
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    // creates thead and cells but not the body of the table
    private _generateTableShell(tableId: TableId): void {
        const xcTableShell: string =
                '<div id="xcTbodyWrap-' + tableId + '" class="xcTbodyWrap" ' +
                'data-id="' + tableId + '"></div>' +
                '<div class="tableScrollBar">' +
                    '<div class="sizer"></div>' +
                '</div>';
        const $view: JQuery = this.getView();
        const xcTableWrap: string =
        '<div id="xcTableWrap-' + tableId + '"' +
            ' class="xcTableWrap tableWrap building" ' +
            'data-id="' + tableId + '">' +
            xcTableShell +
        '</div>';
        $view.html(xcTableWrap);

        const tableShell: string = TblManager.generateTheadTbody(tableId);
        const tableHtml: string =
            '<table id="xcTable-' + tableId + '" class="xcTable dataTable" ' +
            'style="width:0px;" data-id="' + tableId + '">' +
                tableShell +
            '</table>' +
            '<div class="rowGrab last"></div>';

        this.getView().find(".xcTbodyWrap").append(tableHtml);
        this._afterGenerateTableShell();
    }

    private _buildInitialTable(
        table: TableMeta,
        jsonData: string[],
        isEmpty: boolean
    ): void {
        const numRows: number = jsonData.length;
        const tableId: TableId = table.getId();
        const $table: JQuery = $("#xcTable-" + tableId);
        this._addScrollbar();

        if (isEmpty && numRows === 0) {
            console.warn('no rows found, ERROR???');
            $table.addClass('emptyTable');
            jsonData = [""];
        }

        TblManager.pullRowsBulk(table, jsonData, 0);
        this._addTableListeners(tableId);
        TblManager.addColListeners($table, tableId);

        if (numRows === 0) {
            $table.find('.idSpan').text("");
        }
        this._afterBuildInitialTable(tableId);
    }

    protected _afterBuild(): void {
        const tableId: TableId = this.table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        const table: TableMeta = this.table;
        const $lastRow: JQuery = $table.find('tr:last');
        const lastRowNum: number = RowManager.parseRowNum($lastRow);
        table.currentRowNumber = lastRowNum + 1;

        const $xcTableWrap: JQuery = $('#xcTableWrap-' + tableId);
        $xcTableWrap.removeClass("building");
        this._autoSizeDataCol(tableId);
        if (this._options.fromSQL) {
            $table.addClass("fromSQL");
        } else {
            $table.addClass("noOperation");
        }

        if (table.allImmediates) {
            $table.addClass("allImmediates");
        }
    }

    private _autoSizeDataCol(tableId: TableId): void {
        const progCols: ProgCol[] = this.table.tableCols;
        let dataCol: ProgCol;
        let dataColIndex: number;
        for (let i = 0; i < progCols.length; i++) {
            if (progCols[i].isDATACol()) {
                dataCol = progCols[i];
                dataColIndex = i + 1;
                break;
            }
        }
        if (dataCol.width === "auto") {
            const winWidth: number = $(window).width();
            let maxWidth: number = 200;
            let minWidth: number = 150;
            if (winWidth > 1400) {
                maxWidth = 300;
            } else if (winWidth > 1100) {
                maxWidth = 250;
            }
            if (dataCol.hasMinimized()) {
                dataCol.width = minWidth;
                return;
            } else {
                dataCol.width = minWidth;
            }
            const $th: JQuery = $('#xcTable-' + tableId).find('th.col' + dataColIndex);
            TblFunc.autosizeCol($th, {
                fitAll: true,
                minWidth: minWidth,
                maxWidth: maxWidth,
                datastore: false,
                dblClick: false,
                unlimitedWidth: false,
                multipleCols: false,
                includeHeader: false
            });
        }
    }

    protected _addTableListeners(tableId: TableId): void {
        const $xcTableWrap: JQuery = $("#xcTableWrap-" + tableId);
        $xcTableWrap.on("mousedown", ".lockedTableIcon", function() {
            // handlers fire in the order that it's bound in.
            // So we are going to handle this, which removes the background
            // And the handler below will move the focus onto this table
            const txId: number = $(this).data("txid");
            if (txId == null) {
                return;
            }
            xcTooltip.refresh($(".lockedTableIcon .iconPart"), 100);
            QueryManager.cancelQuery(txId);
            xcTooltip.hideAll();
        });

        $xcTableWrap.scroll(function() {
            $(this).scrollLeft(0); // prevent scrolling when colmenu is open
            $(this).scrollTop(0); // prevent scrolling when colmenu is open
        });

        const $rowGrab: JQuery = $("#xcTbodyWrap-" + tableId).find(".rowGrab.last");
        $rowGrab.mousedown(function(event) {
            if (event.which === 1) {
                TblAnim.startRowResize($(this), event);
            }
        });
    }

    private _addScrollbar(): void {
        this._setupScrollMeta();
        this._setupScrollbar();
        this._infScrolling();
    }

    // TODO XXX move this into the table constructor
    private _setupScrollMeta() {
        this.table.scrollMeta = {
            isTableScrolling: false,
            isBarScrolling: false,
            base: 0,
            scale: null
        };
    }

    private _setupScrollbar(): void {
        const $view: JQuery = this.getView();
        const $table = $view.find(".xcTable");

        this.rowManager.setSizerHeight();

        const $scrollBar: JQuery = $view.find(".tableScrollBar");
        $scrollBar.width(gScrollbarWidth - 1);

        let isMouseDown: boolean = false;
        const visibleRows: number = this._getVisibleRows();
        $scrollBar.scroll(() => {
            if (isMouseDown) {
                return;
            }
            const table = this.table;
            const scrollMeta = table.scrollMeta;
            if (scrollMeta.isTableScrolling) {
                scrollMeta.isTableScrolling = false;
            } else {
                scrollMeta.isBarScrolling = true;
                let top: number = $scrollBar.scrollTop() + scrollMeta.base;
                const numRowsAbove: number = table.currentRowNumber - visibleRows;
                const rowsAboveHeight: number = this.rowManager.getRowsAboveHeight(numRowsAbove);
                top -= rowsAboveHeight;
                this.getView().find(".xcTbodyWrap").scrollTop(top);
            }
        });

        $scrollBar.on("mousedown", (event) => {
            if (event.which !== 1) {
                return;
            }
            isMouseDown = true;
            $(document).on("mouseup.tableScrollBar", () => {
                isMouseDown = false;
                $(document).off("mouseup.tableScrollBar");

                if ($table.hasClass("scrolling")) {
                    return;
                }

                const table: TableMeta = this.table;
                const scrollMeta = table.scrollMeta;
                const scrollTop: number = $scrollBar.scrollTop();
                const outerHeight: number = $scrollBar.outerHeight();
                let top: number = scrollTop * scrollMeta.scale;

                // if scrollbar is all the way at the bottom
                if (scrollMeta.scale > 1 && ($scrollBar[0].scrollHeight -
                    scrollTop - outerHeight <= 1)) {
                    top += outerHeight * scrollMeta.scale;
                }

                let rowNum: number = Math.ceil((top / gRescol.minCellHeight));
                const defaultRowNum: number = rowNum;

                let numPages: number = Math.ceil(rowNum / TableMeta.NumEntriesPerPage);
                let extraHeight: number = 0;
                for (let pageNumStr in table.rowHeights) {
                    const pageNum: number = Number(pageNumStr);
                    if (pageNum < numPages) {
                        const page = table.rowHeights[pageNum];
                        for (let row in page) {
                            if (Number(row) <= rowNum) {
                                const height: number = page[row] - gRescol.minCellHeight;
                                extraHeight += height;
                                rowNum = Math.ceil(defaultRowNum -
                                    (extraHeight / gRescol.minCellHeight));

                                numPages = Math.ceil(rowNum / TableMeta.NumEntriesPerPage);
                                if (pageNum >= numPages) {
                                    extraHeight -= height;
                                    rowNum = Math.ceil(defaultRowNum -
                                        (extraHeight / gRescol.minCellHeight));
                                    break;
                                }
                            }
                        }
                    }
                }

                rowNum += 1;
                rowNum = Math.round(rowNum);
                scrollMeta.base = top - (top / scrollMeta.scale);
                this.rowInput.skipTo(rowNum);
            });
        });
    }

    private _infScrolling(): void {
        const table: TableMeta = this.table;
        if (table.resultSetCount <= 0) {
            return;
        }
        const $xcTbodyWrap: JQuery = this.getView().find(".xcTbodyWrap");
        const visibleRows: number = this._getVisibleRows();
        let needsFocusing: boolean = true;
        let focusTimer: number;
        $xcTbodyWrap.scroll(() => {
            if (TblAnim.mouseStatus === "movingTable") {
                return;
            }

            const $table: JQuery = this.getView().find(".xcTable");

            if ($table.hasClass('autoScroll')) {
                $table.removeClass('autoScroll');
                return;
            }

            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const tableId: TableId = this.table.getId();
            if (needsFocusing) {
                needsFocusing = false;
                clearElements();
            }

            clearTimeout(focusTimer);
            focusTimer = window.setTimeout(scrollingEnd, 200);

            this.rowInput.updateCurrentRowNum();

            const scrollTop: number = $xcTbodyWrap.scrollTop();
            const scrollMeta = table.scrollMeta;
            if (scrollMeta.isBarScrolling) {
                scrollMeta.isBarScrolling = false;
            } else {
                scrollMeta.isTableScrolling = true;
                const numRowsAbove: number = table.currentRowNumber - visibleRows;
                const rowsAboveHeight: number = this.rowManager.getRowsAboveHeight(numRowsAbove);
                let scrollBarTop: number = scrollTop + rowsAboveHeight;
                scrollBarTop -= scrollMeta.base;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }

            const $firstRow: JQuery = $table.find('tbody tr:first');
            const topRowNum: number = RowManager.parseRowNum($firstRow);
            let fetched: boolean = false;

            // gets this class from rowManager.addRows
            if ($table.hasClass("scrolling") || $firstRow.length === 0) {
                deferred.resolve();
            } else if (scrollTop === 0 && !$firstRow.hasClass('row0')) {
                // scrolling to top
                const numRowsToAdd: number = Math.min(TableMeta.NumEntriesPerPage, topRowNum, table.resultSetMax);
                const rowNumber: number = topRowNum - numRowsToAdd;
                if (rowNumber < table.resultSetMax) {
                    fetched = true;
                    this.rowManager.addRows(rowNumber, numRowsToAdd, RowDirection.Top, {
                        bulk: false,
                        numRowsToAdd: null,
                        numRowsAdded: null,
                        dontRemoveRows: false,
                        missingRows: null
                    })
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
            } else if (isScrollBarAtBottom()) {
                // scrolling to bottom
                if (table.currentRowNumber < table.resultSetMax) {
                    const numRowsToAdd: number = Math.min(TableMeta.NumEntriesPerPage,
                                    table.resultSetMax -
                                    table.currentRowNumber);
                    fetched = true;
                    this.rowManager.addRows(table.currentRowNumber, numRowsToAdd, RowDirection.Bottom, {
                        bulk: false,
                        numRowsToAdd: null,
                        numRowsAdded: null,
                        dontRemoveRows: false,
                        missingRows: null
                    })
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.resolve();
            }

            deferred
            .always(() => {
                if (fetched) {
                    if ($table.find('.jsonElement.modalHighlighted').length) {
                        JSONModal.Instance.rehighlightTds($table);
                    }
                    if (!$.isEmptyObject(table.highlightedCells)) {
                        TblManager.rehighlightCells(tableId);
                    }
                }

                this.rowInput.updateCurrentRowNum();
            });
        });

        function scrollingEnd() {
            needsFocusing = true;
        }

        function isScrollBarAtBottom() {
            return ($xcTbodyWrap[0].scrollHeight - $xcTbodyWrap.scrollTop() -
                       $xcTbodyWrap.outerHeight() <= 1);
        }

        function clearElements() {
            $(".menu:visible").hide();
            xcMenu.removeKeyboardNavigation();
        }
    }

    private _getVisibleRows(): number {
        return Math.min(TblManager.maxEntriesPerPage, this.table.resultSetCount);
    }

    private _renderRowInput($container: JQuery): void {
        const $rowInputArea = $container.find(".rowInputArea");
        this.rowInput.render($rowInputArea);
    }

    private _renderSkew($container: JQuery): void {
        const $skewInfoArea = $container.find(".skewInfoArea");
        this.skew.render($skewInfoArea);
    }
}