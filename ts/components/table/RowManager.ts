class RowManager {
    private table: TableMeta;
    private $view: JQuery;
    private alert: boolean;

    /**
     * RowManager.parseRowNum
     * @param $el
     */
    public static parseRowNum($tr: JQuery): number | null {
        const keyword: string = 'row';
        const classNames: string = $tr.attr('class');

        if (classNames == null) {
            console.error('Unexpected element to parse row', $tr);
            return null;
        }
        const substring: string = classNames.substring(keyword.length);
        const rowNum: number = parseInt(substring);

        if (isNaN(rowNum)) {
            console.error('Unexpected element to parse row', $tr);
            return null;
        }

        return rowNum;
    }

    public constructor(table: TableMeta, $view: JQuery) {
        this.table = table;
        this.$view = $view;
        this.alert = true;
    }

    public setAlert(alert: boolean): void {
        this.alert = alert;
    }

    /**
     * @return {XDPromise}
     */
    public getFirstPage(): XDPromise<string[]> {
        const table: TableMeta = this.table;
        // XXX TODO: this need to update
        TblManager.adjustRowFetchQuantity();
        const numRowsToAdd: number = Math.min(TblManager.maxEntriesPerPage, table.resultSetCount);
        return this._getDataColumnJson(null, numRowsToAdd);
    }

    /**
     *
     * @param startIndex the row number we're starting from
     * if our table has rows 0-60 and we're scrolling downwards, startIndex = 60
     * if our table has rows 60-120 and we're scrolling upwards, startIndex = 40
     * assuming we're fetching 20 rows
     * @param numRowsToAdd
     * @param direction
     * @param info
     */
    public addRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: RowDirection,
        info: {
            bulk: boolean,
            numRowsToAdd: number,
            numRowsAdded: number,
            dontRemoveRows: boolean
            missingRows: number[]
        }
    ): XDPromise<any> {
        // rowNumber is checked for validity before calling addRows
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const table: TableMeta = this.table;

        if (startIndex >= table.resultSetCount) { // already at the end
            return PromiseHelper.resolve(null);
        } else if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        this._prepTableForAddingRows(startIndex, numRowsToAdd, direction, info);
        this._fetchRows(startIndex, numRowsToAdd, direction, info)
        .then(() => {
            TblFunc.moveFirstColumn(null);

            if (info.missingRows && info.missingRows.length) {
                console.warn('some rows were too large to be retrieved,' +
                            'rows:', info.missingRows);
            }
            this._tableCleanup(info);
            deferred.resolve(info);
        })
        .fail((error) => {
            this._tableCleanup(info);
            console.error("goToPage fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public canScroll(): boolean {
        const table: TableMeta = this.table;
        if (!table || table.hasLock()) {
            return false;
        }
        const $table: JQuery = this.$view.find(".xcTable");
        if ($table.hasClass('scrolling')) {
            return false;
        }
        return true;
    }

    public normalizeRowNum(targetRow: number): [number, boolean] {
        if (isNaN(targetRow) || targetRow % 1 !== 0) {
            return [null, false];
        }

        const table: TableMeta = this.table;
        // note that resultSetCount is the total num of rows
        // resultSetMax is the max row that can fetch
        const tableId: TableId = table.getId();
        const maxRow: number = table.resultSetMax;
        const maxCount: number = table.resultSetCount;

        if (!TblFunc.isTableScrollable(tableId)) {
            if (maxRow === 0) {
                // when table has no rows
                return [0, false];
            } else {
                return [1, false];
            }
        }

        targetRow = Math.max(1, targetRow);
        targetRow = Math.min(targetRow, maxCount);
        return [targetRow, true];
    }

    public skipToRow(
        backRow: number,
        targetRow: number,
        rowOnScreen: number,
        noScrollBar: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const table: TableMeta = this.table;
        const tableId: TableId = table.getId();
        const maxCount: number = table.resultSetCount;

        const $table: JQuery = this.$view.find(".xcTable");
        if (isNaN(rowOnScreen)) {
            rowOnScreen = RowManager.parseRowNum($table.find('tr:last'));
        }
        // divide evenly on both top and bottom buffer
        const rowToBuffer: number = Math.floor((TblManager.maxEntriesPerPage - rowOnScreen) / 2);

        targetRow = Math.max(1, targetRow);
        targetRow = Math.min(targetRow, maxCount);

        backRow = Math.min(table.resultSetMax - TblManager.maxEntriesPerPage,
                            targetRow - rowToBuffer);
        backRow = Math.max(backRow, 0);

        const numRowsToAdd: number = Math.min(TblManager.maxEntriesPerPage, table.resultSetMax);
        const info = {
            "bulk": true,
            "dontRemoveRows": false,
            "numRowsAdded": null,
            "numRowsToAdd": null,
            "missingRows": []
        };
        this.addRows(backRow, numRowsToAdd, RowDirection.Bottom, info)
        .always(() => {
            TblManager.removeWaitingCursor(tableId);
            const rowToScrollTo: number = Math.min(targetRow, table.resultSetMax);
            this._positionScrollbar(rowToScrollTo, !noScrollBar);
            deferred.resolve();
        });

        return deferred.promise();
    }


    /**
     * calculates the height of all the top rows that are not visible
     * @param numRowsAbove
     */
    public getRowsAboveHeight(numRowsAbove: number): number {
        const table: TableMeta = this.table;
        const numPages: number = Math.ceil(numRowsAbove / TableMeta.NumEntriesPerPage);
        let height: number = numRowsAbove * gRescol.minCellHeight;
        for (let pageNumStr in table.rowHeights) {
            const pageNum: number = parseInt(pageNumStr);
            if (pageNum < numPages) {
                const page = table.rowHeights[pageNum];
                if (pageNum === numPages - 1) {
                    for (let rowStr in page) {
                        const row: number = parseInt(rowStr);
                        if (row <= numRowsAbove) {
                            height += (page[row] - gRescol.minCellHeight);
                        }
                    }
                } else {
                    for (let row in page) {
                        height += (page[row] - gRescol.minCellHeight);
                    }
                }
            }
        }
        return height;
    }

    /**
     * Set Table's sizer's height
     */
    public setSizerHeight(): void {
        let sizerHeight: number = this._getSizerHeight();
        let scale: number = 1;
        if (sizerHeight > gMaxDivHeight) {
            scale = sizerHeight / gMaxDivHeight;
            sizerHeight = gMaxDivHeight;
        }
        this.table.scrollMeta.scale = scale;
        this.$view.find(".sizer").height(sizerHeight);
    }

    /**
     * Get total row nu
     */
    public getTotalRowNum(): number {
        return this.table.resultSetCount;
    }

    /**
     * Get the firt visible row in the table
     */
    public getFirstVisibleRowNum(): number {
        if (this.getTotalRowNum() === 0) {
            return 0;
        }
        if (!document.elementFromPoint) {
            return 0;
        }

        const $table: JQuery = this.$view.find(".xcTable");
        if ($table.length === 0) {
            return 0;
        }
        const tableLeft: number = $table.offset().left + 10;
        const tdXCoor: number = Math.max(0, tableLeft);
        const rect: ClientRect = $table.find("th.col0 input")[0].getBoundingClientRect();
        const tdYCoor: number = rect.top + rect.height + 15;
        // var tdYCoor = 160; //top rows's distance from top of window
        const firstEl: Element = document.elementFromPoint(tdXCoor, tdYCoor);
        const firstId: string = $(firstEl).closest('tr').attr('class');

        if (firstId && firstId.length > 0) {
            const firstRowNum: number = parseInt(firstId.substring(3)) + 1;
            if (!isNaN(firstRowNum)) {
                return firstRowNum;
            } else {
                return (this.table.resultSetCount === 0) ? 0 : 1;
            }
        } else {
            const $trs: JQuery = $table.find('tbody tr');
            let rowNum: number = (this.table.resultSetCount === 0) ? 0 : 1;
            $trs.each((_index, el) => {
                const $tr: JQuery = $(el);
                if ($tr[0].getBoundingClientRect().bottom > tdYCoor) {
                    rowNum = RowManager.parseRowNum($tr) + 1;
                    return false; // stop loop
                }
            });
            return rowNum;
        }
    }

    public getLastVisibleRowNum(): number {
        const $view: JQuery = this.$view;
        let $tableWrap: JQuery = $view.hasClass("xcTableWrap") ?
        $view : $view.find(".xcTableWrap");
        if ($tableWrap.length === 0) {
            return null;
        }
        const tableWrapTop: number = $tableWrap.offset().top;
        let tableBottom: number = $tableWrap.offset().top + $tableWrap.height();
        const minTableBottom: number = tableWrapTop + TblManager.firstRowPositionTop +
                             gRescol.minCellHeight;
        tableBottom = Math.max(tableBottom, minTableBottom);
        const $trs: JQuery = $tableWrap.find(".xcTable tbody tr");
        for (let i = $trs.length - 1; i >= 0; i--) {
            const $tr: JQuery = $trs.eq(i);
            if ($tr.offset().top < tableBottom) {
                const rowNum: number = RowManager.parseRowNum($tr) + 1;
                return rowNum;
            }
        }
        return null;
    }

    private _getTable(): JQuery {
        return this.$view.find(".xcTable");
    }

    // produces an array of all the td values that will go into the DATA column
    private _getDataColumnJson(
        rowPosition: number,
        numRowsToFetch: number
    ): XDPromise<string[]> {
        const jsons: string[] = [];
        if (numRowsToFetch === 0) {
            return PromiseHelper.resolve(jsons);
        }

        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        let promise: XDPromise<void>;
        if (rowPosition == null) {
            promise = PromiseHelper.resolve();
        } else {
            promise = this._setAbsolute(rowPosition, false);
        }

        promise
        .then(() => {
            return this._getNextPage(numRowsToFetch, false);
        })
        .then((tableOfEntries) => {
            const numValues: number = tableOfEntries.numValues;
            const numRows: number = Math.min(numRowsToFetch, numValues);
            const values: string[] = tableOfEntries.values;
            for (let i = 0; i < numRows; i++) {
                jsons.push(values[i]);
            }
            deferred.resolve(jsons);
        })
        .fail((error) => {
            if (error.status === StatusT.StatusNoBufs) {
                numRowsToFetch = Math.floor(numRowsToFetch / 2);
                this._getDataColumnJson(rowPosition, numRowsToFetch)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                console.error("getDataColumnJson fails!", error);
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    // resets invalid resultsetIds
    private _setAbsolute(
        rowPosition,
        retry
    ): XDPromise<void> {
        const table: TableMeta = this.table;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const resultSetId: string = String(table.resultSetId);

        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(deferred.resolve)
        .fail((error) => {
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                table.updateResultset()
                .then(() => {
                    return this._setAbsolute(rowPosition, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                if (this.alert) {
                    Alert.error(ErrTStr.NotDisplayRows, error);
                }
            }
        });

        return deferred.promise();
    }

     // resets invalid resultsetIds
     private _getNextPage(
        numRowsToFetch: number,
        retry: boolean
    ): XDPromise<{values: string[], numValues: number}> {
        const table: TableMeta = this.table;
        const deferred: XDDeferred<{values: string[], numValues: number}> = PromiseHelper.deferred();

        XcalarGetNextPage(table.resultSetId, numRowsToFetch)
        .then(deferred.resolve)
        .fail((error) => {
            // invalid result set ID may need to be refreshed
            if (!retry && error.status === StatusT.StatusInvalidResultSetId) {
                table.updateResultset()
                .then(() => {
                    return this._getNextPage(numRowsToFetch, true);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
                if (this.alert) {
                    Alert.error(ErrTStr.NotDisplayRows, error);
                }
            }
        });

        return deferred.promise();
    }

    private _prepTableForAddingRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: number,
        info: {
            bulk: boolean,
            numRowsToAdd: number,
            numRowsAdded: number,
            dontRemoveRows: boolean
        }
    ): void {
        gIsTableScrolling = true;

        const table: TableMeta = this.table;
        const $table: JQuery = this._getTable();
        $table.addClass('scrolling');
        info.numRowsToAdd = numRowsToAdd;
        info.numRowsAdded = 0;

        if (info.bulk) {
            const tableId: TableId = this.table.getId();
            TblManager.addWaitingCursor(tableId);
            table.currentRowNumber = startIndex + numRowsToAdd;
        } else {
            if (direction === RowDirection.Bottom) {
                table.currentRowNumber += numRowsToAdd;
            } else {
                table.currentRowNumber -= numRowsToAdd;
            }

            this._addTempRows(startIndex, numRowsToAdd, direction);
            if (!info.dontRemoveRows && !info.bulk) {
                this._removeRows(numRowsToAdd, direction);
            }
        }
    }

    private _addTempRows(
        startIndex: number = 0,
        numRowsToAdd: number,
        direction: RowDirection
    ): void {
        const table: TableMeta = this.table;
        const numCols: number = table.getNumCols();
        const $table: JQuery = this._getTable();
        const dataColNum: number = table.getColNumByBackName('DATA') - 1;
        let tBodyHTML: string = "";

        for (let row = 0; row < numRowsToAdd; row++) {
            const rowNum: number = row + startIndex;
            tBodyHTML += '<tr class="row' + rowNum + ' tempRow">' +
                            '<td align="center" class="col0">' +
                                '<div class="idWrap">' +  // Line Marker Column
                                    '<span class="idSpan">' +
                                        (rowNum + 1) +
                                    '</span>' +
                                '</div>' +
                            '</td>';


            // loop through table tr's tds
            for (let col = 0; col < numCols; col++) {
                let tdClass: string;
                if (col === dataColNum) {
                    tdClass = " jsonElement";
                } else {
                    tdClass = "";
                }
                tBodyHTML += '<td class="col' + (col + 1) + tdClass + '"></td>';
            }
            // end of loop through table tr's tds
            tBodyHTML += '</tr>';
        }
        const $rows: JQuery = $(tBodyHTML);
        const oldTableHeight: number = $table.height();
        if (direction === RowDirection.Top) {
            $table.find('tbody').prepend($rows);
        } else {
            $table.find('tbody').append($rows);
        }

        const tableId: TableId = table.getId();
        TblManager.adjustRowHeights($rows, startIndex, table);

        if (direction === RowDirection.Top) {
            const heightDiff: number = $table.height() - oldTableHeight;
            const scrollTop: number = Math.max(1, heightDiff);
            const $xcTbodyWrap: JQuery = $('#xcTbodyWrap-' + tableId);
            $xcTbodyWrap.scrollTop(scrollTop);
        }
        TblFunc.moveFirstColumn(null);
    }

    private _removeRows(
        numRowsToRemove: number,
        direction: RowDirection
    ): void {
        const $table: JQuery = this._getTable();
        if (direction === RowDirection.Bottom) {
            const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
            const distFromBottom: number = $xcTbodyWrap[0].scrollHeight -
                          $xcTbodyWrap.scrollTop() - $xcTbodyWrap.outerHeight();

            $table.find("tbody tr").slice(0, numRowsToRemove).remove();

            let newScrollTop: number = $xcTbodyWrap.scrollTop();
            const newDist: number = $xcTbodyWrap[0].scrollHeight -
                          $xcTbodyWrap.scrollTop() - $xcTbodyWrap.outerHeight();
            if (distFromBottom > newDist) {
                // this doesn't happen in chrome
                newScrollTop -= (distFromBottom - newDist);
                $xcTbodyWrap.scrollTop(newScrollTop);
            }
        } else {
            $table.find("tbody tr").slice(TblManager.maxEntriesPerPage).remove();
        }
    }

    private _fetchRows(
        startIndex: number,
        numRowsToAdd: number,
        direction: RowDirection,
        info: {
            numRowsAdded: number,
            bulk: boolean,
            missingRows: number[]
        },
        rowToPrependTo?: number
    ): XDPromise<void> {
        const table: TableMeta = this.table;

        if (startIndex >= table.resultSetCount) {
            // already at the end
            return PromiseHelper.resolve();
        }
        if (startIndex < 0) {
            numRowsToAdd += startIndex;
            startIndex = 0;
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getDataColumnJson(startIndex, numRowsToAdd)
        .then((jsonData) => {
            let jsonLen: number = jsonData.length;
            let emptyReturn: boolean = false;
            if (!jsonLen) {
                emptyReturn = true;
                jsonLen = 1;
            }
            info.numRowsAdded += jsonLen;
            const numRowsLacking: number = numRowsToAdd - jsonLen;

            if (emptyReturn) {
                if (info.bulk) {
                    this._addTempRows(startIndex, 1, direction);
                }
                this._cleanupMissingRows(info, startIndex);
            } else {
                if (!info.bulk && rowToPrependTo != null) {
                    rowToPrependTo -= numRowsLacking;
                }
                TblManager.pullRowsBulk(table, jsonData, startIndex,
                                        direction, rowToPrependTo);
            }
            TblFunc.moveFirstColumn(null);

            if (numRowsLacking > 0) {
                const newStartIndex: number = startIndex + Math.max(1, jsonLen);
                if (direction === RowDirection.Bottom) {
                    return this._scrollDownHelper(newStartIndex, numRowsLacking, info);
                } else {
                     // fetches more rows when scrolling up
                    return this._fetchRows(newStartIndex, numRowsLacking, direction,
                                            info, newStartIndex + numRowsLacking);
                }
            } else {
                return PromiseHelper.resolve(null);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _cleanupMissingRows(
        info: {
            missingRows: number[]
        },
        rowPosition
    ): void {
        if (!info.missingRows) {
            info.missingRows = [];
        }
        this._getTable().find(".tempRow.row" + rowPosition)
                    .removeClass("tempRow")
                    .addClass("empty");
        info.missingRows.push(rowPosition + 1);
    }

    // fetches more rows when scrolling down
    private _scrollDownHelper(
        position: number,
        numRowsStillNeeded: number,
        info: {
            numRowsAdded: number,
            bulk: boolean,
            missingRows: number[]
        }
    ): XDPromise<void> {
        const table: TableMeta = this.table;
        if (position < table.resultSetCount) {
            const newStartIndex: number = Math.min(position, table.resultSetCount);
            const numRowsToFetch: number = Math.min(numRowsStillNeeded,
                        (table.resultSetCount - newStartIndex));

            return this._fetchRows(newStartIndex, numRowsToFetch,
                                    RowDirection.Bottom, info);
        } else {
            // reached the very end of table
            return PromiseHelper.resolve(null);
        }
    }

    // for bulk, also handles the scroll position
    private _removeOldRows(
        info: {
            numRowsAdded: number,
            numRowsToAdd: number
        }
    ): void {
        const $table: JQuery = this._getTable();
        const prevTableHeight: number = $table.height();
        const table: TableMeta = this.table;
        const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
        const numRowsToRemove: number = $table.find("tbody tr").length -
                              info.numRowsAdded;

        const prevScrollTop: number = $xcTbodyWrap.scrollTop();
        $table.find("tbody tr").slice(0, numRowsToRemove).remove();
        const scrollTop: number = Math.max(2, prevScrollTop - (prevTableHeight -
                                                    $table.height()));
        $xcTbodyWrap.scrollTop(scrollTop);
        const numMissingRows: number = info.numRowsToAdd - info.numRowsAdded;
        if (numMissingRows) {
            const startIndex: number = table.currentRowNumber - numMissingRows;
            this._addTempRows(startIndex, numMissingRows, RowDirection.Bottom);
        }
    }

    private _tableCleanup(
        info: {
            bulk: boolean,
            numRowsAdded: number,
            numRowsToAdd: number
        }
    ): void {
        if (info.bulk) {
            this._removeOldRows(info);
        }
        const $table: JQuery = this._getTable();
        $table.find('.tempRow')
                .removeClass("tempRow")
                .addClass("empty");
        const table: TableMeta = this.table;
        const $xcTbodyWrap: JQuery = $table.closest(".xcTbodyWrap");
        let scrollTop: number = $xcTbodyWrap.scrollTop();
        if (scrollTop < 2) {
            // leave some space for scrolling up
            scrollTop = 2;
            $xcTbodyWrap.scrollTop(scrollTop);
        } else if ($xcTbodyWrap[0].scrollHeight - scrollTop -
                       $xcTbodyWrap.outerHeight() <= 1) {
            // leave some space for scrolling down
            scrollTop -= 2;
            $xcTbodyWrap.scrollTop(scrollTop);
        }

        const tableId: TableId = table.getId();
        if (!info.bulk) {
            const visibleRows: number = Math.min(TblManager.maxEntriesPerPage,
                                       table.resultSetCount);
            const numRowsAbove: number = table.currentRowNumber - visibleRows;
            const rowsAboveHeight: number = this.getRowsAboveHeight(numRowsAbove);
            const scrollBarTop: number = scrollTop + rowsAboveHeight -
                               table.scrollMeta.base;
            const curTop: number = $xcTbodyWrap.siblings(".tableScrollBar").scrollTop();
            if (curTop !== scrollBarTop) {
                table.scrollMeta.isTableScrolling = true;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }
        }

        $table.removeClass('scrolling');
        TblManager.removeWaitingCursor(tableId);
        gIsTableScrolling = false;
    }

    private _getSizerHeight(): number {
        const table: TableMeta = this.table;
        let sizerHeight: number = table.resultSetCount * gRescol.minCellHeight;
        for (let pageNum in table.rowHeights) {
            const page = table.rowHeights[pageNum];
            for (let row in page) {
                sizerHeight += (page[row] - gRescol.minCellHeight);
            }
        }
        return sizerHeight;
    }

    private _positionScrollbar(row, adjustTableScroller) {
        let canScroll: boolean = true;
        const $view: JQuery = this.$view;
        const $table: JQuery = $view.find(".xcTable");
        const theadHeight: number = $table.find('thead').height();
        const positionScrollToRow = () => {
            if (!$table.find('.row' + (row - 1)).length) {
                return;
            }
            const $tableWrap: JQuery = $view.find('.xcTableWrap');
            const $tbodyWrap: JQuery = $view.find('.xcTbodyWrap');

            const el: HTMLElement = <HTMLElement>$table.find('.row' + (row - 1))[0];
            const tdTop: number = el.offsetTop;
            const scrollPos: number = Math.max((tdTop - theadHeight), 1);
            if (canScroll && scrollPos >
                ($table.height() - $tableWrap.height())
            ) {
                canScroll = false;
            }
            $table.addClass('autoScroll');
            $tbodyWrap.scrollTop(scrollPos);

            if (adjustTableScroller) {
                // adjust tableScrollBar;
                const table: TableMeta = this.table;
                const scrollMeta = table.scrollMeta;
                scrollMeta.isTableScrolling = true;
                const numRowsAbove: number = table.currentRowNumber -
                        Math.min(TblManager.maxEntriesPerPage, table.resultSetCount);
                const rowsAboveHeight: number = this.getRowsAboveHeight(numRowsAbove);
                const scrollBarTop: number = scrollPos + rowsAboveHeight;
                const newTop: number = scrollBarTop / scrollMeta.scale;
                $tbodyWrap.siblings(".tableScrollBar").scrollTop(newTop);
                scrollMeta.base = scrollBarTop - (scrollBarTop / scrollMeta.scale);
            }
        };

        positionScrollToRow();
        if (!canScroll) {
            // this means we can't scroll to page without moving scrollbar all the
            // way to the bottom, which triggers another getpage and thus we must
            // try to position the scrollbar to the proper row again
            setTimeout(positionScrollToRow, 1);
        }
    }
}