namespace TblAnim {
    // This module consists of column resizing, row resizing,
    // column drag and dropping, and table drag and dropping
    let dragInfo: {
        mouseX: number,
        $el: JQuery,
        $tableWrap: JQuery,
        $container: JQuery,
        pageX: number,
        colNum: number,
        $table: JQuery,
        tableId: TableId,
        element: JQuery,
        colIndex: number,
        offsetTop: number,
        grabOffset: number,
        docHeight: number,
        val: string,
        inFocus: boolean,
        selected: boolean,
        isMinimized: boolean,
        colWidth: number,
        windowWidth: number,
        mainFrameLeft: number,
        offsetLeft: number,
        fauxCol: JQuery
    } = {
        mouseX: undefined,
        $el: undefined,
        $tableWrap: undefined,
        $container: undefined,
        pageX: undefined,
        colNum: undefined,
        $table: undefined,
        tableId: undefined,
        element: undefined,
        colIndex: undefined,
        offsetTop: undefined,
        grabOffset: undefined,
        docHeight: undefined,
        val: undefined,
        inFocus: undefined,
        selected: undefined,
        isMinimized: undefined,
        colWidth: undefined,
        windowWidth: undefined,
        mainFrameLeft: undefined,
        offsetLeft: undefined,
        fauxCol: undefined
    };
    let rowInfo: {
        mouseStart: number,
        $el: JQuery,
        $table: JQuery
        actualTd: JQuery,
        $container: JQuery,
        targetTd: JQuery,
        startHeight: number,
        tableId: TableId,
        rowIndex: number
        $divs: JQuery
    } = {
        mouseStart: undefined,
        $el: undefined,
        $table: undefined,
        actualTd: undefined,
        $container: undefined,
        targetTd: undefined,
        startHeight: undefined,
        tableId: undefined,
        rowIndex: undefined,
        $divs: undefined
    };

    export let mouseStatus = null;

    /* START COLUMN RESIZING */
    /**
     * TblAnim.startColResize
     * @param $el
     * @param event
     * @param options
     */
    export function startColResize(
        $el: JQuery,
        event: JQueryEventObject,
        options: {
            minWidth?: number,
            target: string,
            onResize: Function
        }
    ): void {
        options = options || {target: undefined, onResize: undefined};

        let rescol = gRescol;
        let $table: JQuery = $el.closest('.dataTable');
        let target: string = options.target;
        let colNum: number = null;
        let $th: JQuery = $el.closest('th');
        rescol.$th = $th;
        rescol.onResize = options.onResize;

        if (target === "datastore") {
            rescol.isDatastore = true;
        } else {
            rescol.tableId = TblManager.parseTableId($table);
            colNum = ColManager.parseColNum($th);
        }

        event.preventDefault();
        rescol.mouseStart = event.pageX;
        rescol.startWidth = rescol.$th.outerWidth();

        rescol.index = colNum;
        rescol.newWidth = rescol.startWidth;
        rescol.table = $table;
        if (options.minWidth != null) {
            rescol.minResizeWidth = options.minWidth;
        } else {
            rescol.minResizeWidth = rescol.cellMinWidth;
        }
        rescol.leftDragMax = rescol.minResizeWidth - rescol.startWidth;

        if (!rescol.$th.hasClass('selectedCell')) {
            $('.selectedCell').removeClass('selectedCell');
        }

        mouseStatus = "checkingResizeCol";
        $(document).on('mousemove.checkColResize', checkColResize);
        $(document).on('mouseup.endColResize', endColResize);

        dblClickResize($el, target, options.minWidth);
    }

    function checkColResize(event: JQueryEventObject): void {
        let rescol = gRescol;
        rescol.pageX = event.pageX;
        // mouse must move at least 3 pixels horizontally to trigger draggin
        if (Math.abs(rescol.mouseStart - rescol.pageX) > 2) {
            $(document).off('mousemove.checkColResize', checkColResize);
            $(document).on('mousemove.onColResize', onColResize);
            mouseStatus = "resizingCol";

            let $table: JQuery = rescol.$th.closest('.dataTable');
            let colNum: number = rescol.index;
            if (rescol.$th.hasClass("userHidden")) {
                // This is a hidden column! we need to unhide it
                $table.find("th.col" + colNum + ",td.col" + colNum)
                      .removeClass("userHidden");
                gTables[rescol.tableId].tableCols[colNum - 1].isMinimized = false;
            }

            $table.addClass('resizingCol');
            $table.closest(".xcTableWrap").addClass("resizingCol");

            let cursorStyle: string = '<div id="resizeCursor"></div>';
            $('body').addClass('tooltipOff').append(cursorStyle);
        }
    }

    function onColResize(event: JQueryEventObject): void {
        let rescol = gRescol;
        let dragDist: number = (event.pageX - rescol.mouseStart);
        let newWidth: number;
        if (dragDist > rescol.leftDragMax) {
            newWidth = rescol.startWidth + dragDist;
        } else {
            // resizing too small so we set with to the minimum allowed
            newWidth = rescol.minResizeWidth;
        }
        rescol.$th.outerWidth(newWidth);
        rescol.newWidth = newWidth;

        if (typeof rescol.onResize === "function") {
            rescol.onResize();
        }
    }

    function endColResize(): void {
        $(document).off('mousemove.onColResize');
        $(document).off('mouseup.endColResize');
        let newMouseStatus = mouseStatus;
        mouseStatus = null;
        if (newMouseStatus === "checkingResizeCol") {
            $(document).off('mousemove.checkColResize');
            return;
        }

        let rescol = gRescol;
        let isDatastore: boolean = rescol.isDatastore;
        $('#resizeCursor').remove();
        $('body').removeClass('tooltipOff');
        rescol.table.closest('.xcTableWrap').find('.rowGrab')
                                            .width(rescol.table.width());
        rescol.table.removeClass('resizingCol');
        rescol.table.closest(".xcTableWrap").removeClass("resizingCol");
        $('.tooltip').remove();
        if (!isDatastore) {
            if (rescol.newWidth !== rescol.startWidth) {
                TblAnim.resizeColumn(rescol.tableId, rescol.index, rescol.startWidth, rescol.newWidth, null);
            }
        } else {
            rescol.isDatastore = false;
            if (Math.abs(rescol.newWidth - rescol.startWidth) > 1) {
                // set autoresize to header only if column moved at least 2 pixels
                rescol.$th.find('.colGrab').data('sizedtoheader', false);
            }
        }

        // for tableScrollBar
        TblFunc.moveFirstColumn();
    }

    function dblClickResize($el: JQuery, target: string, minWidth: number): void {
        minWidth = minWidth || 17;
        // $el is the colGrab div inside the header
        gRescol.clicks++;  //count clicks
        if (gRescol.clicks === 1) {
            gRescol.timer = <any>setTimeout(function() {
                gRescol.clicks = 0; //after action performed, reset counter
            }, gRescol.delay);
        } else {
            $('#resizeCursor').remove();
            $('body').removeClass('tooltipOff');
            $el.tooltip('destroy');
            mouseStatus = null;
            $(document).off('mousemove.checkColResize');
            $(document).off('mousemove.onColResize');
            $(document).off('mouseup.endColResize');
            xcUIHelper.reenableTextSelection();
            clearTimeout(gRescol.timer);    //prevent single-click action
            gRescol.clicks = 0;      //after action performed, reset counter

            let tableId: TableId;
            let $th: JQuery = $el.closest('th');
            let $table: JQuery = $th.closest('.dataTable');
            $table.removeClass('resizingCol');

            // check if unhiding
            if (target !== "datastore" && $th.outerWidth() === gRescol.cellMinWidth) {
                tableId = $table.data('id');
                let index: number = ColManager.parseColNum($th);
                $th.addClass('userHidden');
                $table.find('td.col' + index).addClass('userHidden');

                gTables[tableId].tableCols[index - 1].isMinimized = true;
                ColManager.maximizeCols([index], tableId, true);
                return;
            }

            let oldColumnWidths: number[] = [];
            let newColumnWidths: number[] = [];
            let oldSizedTo: string[] = [];

            xcTooltip.remove($table.find('.colGrab'));

            let $selectedCols: JQuery;
            if (target === "datastore") {
                if ($th.hasClass('selectedCol')) {
                    $selectedCols = $table.find('th.selectedCol');
                } else {
                    $selectedCols = $th;
                }
            } else {
                $selectedCols = $table.find('th.selectedCell');
            }
            let numSelectedCols: number = $selectedCols.length;
            if (numSelectedCols === 0) {
                $selectedCols = $th;
                numSelectedCols = 1;
            }
            let indices: number[] = [];
            let colNums: number[] = [];
            $selectedCols.each(function() {
                indices.push($(this).index() - 1);
                colNums.push($(this).index());
            });

            let includeHeader: boolean = false;
            let sizeTo: string = ColSizeTo.Contents;
            let selectedCols = [];
            let selectedColNames = [];

            if (target === "datastore") {
                $selectedCols.find('.colGrab').each(function() {
                    if (!$(this).data('sizedtoheader')) {
                        includeHeader = true;
                        return false;
                    }
                });

                $selectedCols.find('.colGrab').each(function() {
                    $(this).data('sizedtoheader', includeHeader);
                });

            } else {
                tableId = $table.data('id');
                let columns: ProgCol[] = gTables[tableId].tableCols;
                for (let i = 0; i < numSelectedCols; i++) {
                    gTables[tableId].tableCols[indices[i]] = new ProgCol(<any>columns[indices[i]]);
                    selectedCols.push(columns[indices[i]]);
                    selectedColNames.push(columns[indices[i]].getBackColName());
                    if (columns[indices[i]].sizedTo !== ColSizeTo.Header &&
                        columns[indices[i]].sizedTo !== ColSizeTo.All) {
                        includeHeader = true;
                        sizeTo = ColSizeTo.Header;
                        break;
                    }
                }
                for (let i = 0; i < numSelectedCols; i++) {
                    oldColumnWidths.push(<any>columns[indices[i]].width);
                    oldSizedTo.push(columns[indices[i]].sizedTo);
                    columns[indices[i]].sizedTo = sizeTo;
                }
            }

            $selectedCols.each(function() {
                newColumnWidths.push(TblFunc.autosizeCol($(this), {
                    "dblClick": true,
                    "minWidth": minWidth,
                    "unlimitedWidth": true,
                    "includeHeader": includeHeader,
                    "datastore": target === "datastore"
                }));
            });

            if (target !== "datastore") {
                let node = DagTable.Instance.getBindNode();
                if (node) {
                    const colInfo = selectedCols.map((col, i) => {
                        return {
                            width: newColumnWidths[i],
                            sizedTo: sizeTo,
                            isMinimized: col.hasMinimized()
                        };
                    });
                    node.columnChange(DagColumnChangeType.Resize, selectedColNames, colInfo);
                }

                let tableName = gTables[tableId].tableName;

                Log.add(SQLTStr.ResizeCols, {
                    "operation": SQLOps.ResizeTableCols,
                    "tableName": tableName,
                    "tableId": tableId,
                    "sizeTo": sizeTo,
                    "oldSizedTo": oldSizedTo,
                    "columnNums": colNums,
                    "oldColumnWidths": oldColumnWidths,
                    "newColumnWidths": newColumnWidths,
                    "htmlExclude": ["columnNums", "oldColumnWidths",
                                    "newColumnWidths", "oldSizedTo"]
                });
            }
        }
    }

    /**
     * TblAnim.resizeColumn
     * used for replaying and redo/undo
     * @param tableId
     * @param colNum
     * @param fromWidth
     * @param toWidth
     * @param sizeTo
     */
    export function resizeColumn(
        tableId: TableId,
        colNum: number,
        fromWidth: number,
        toWidth: number,
        sizeTo: string
    ) {
        let $table: JQuery = $('#xcTable-' + tableId);
        let progCol: ProgCol = new ProgCol(gTables[tableId].tableCols[colNum - 1]);
        gTables[tableId].tableCols[colNum - 1] = progCol;

        let $th = $table.find('th.col' + colNum);
        let $allCells = $table.find("th.col" + colNum + ",td.col" + colNum);
        if ($th.hasClass("userHidden")) {
            // This is a hidden column! we need to unhide it

            $allCells.removeClass("userHidden");
            progCol.isMinimized = false;
        }
        if (toWidth <= gRescol.cellMinWidth) {
            $allCells.addClass("userHidden");
            progCol.isMinimized = true;
        } else {
            progCol.width = toWidth;
        }
        $th.outerWidth(toWidth);
        TblFunc.matchHeaderSizes($table);

        let oldSizedTo = progCol.sizedTo;
        if (sizeTo == null) {
            if (Math.abs(toWidth - fromWidth) > 1) {
                // set autoresize to header only if
                // column moved at least 2 pixels
                progCol.sizedTo = "auto";
            }
        } else {
            progCol.sizedTo = sizeTo;
        }

        let node = DagTable.Instance.getBindNode();
        if (node) {
            node.columnChange(DagColumnChangeType.Resize, [progCol.getBackColName()], [{
                width: toWidth,
                sizedTo: progCol.sizedTo,
                isMinimized: progCol.isMinimized
            }]);
        }

        Log.add(SQLTStr.ResizeCol, {
            "operation": SQLOps.DragResizeTableCol,
            "tableName": gTables[tableId].tableName,
            "tableId": tableId,
            "colNum": colNum,
            "fromWidth": fromWidth,
            "toWidth": toWidth,
            "oldSizedTo": oldSizedTo,
            "sizedTo": sizeTo,
            "htmlExclude": ["colNum", "fromWidth", "toWidth", "oldSizedTo",
                            "sizedTo"]
        });
    }
    /* END COLUMN RESIZING */

    /* START ROW RESIZING */
    /**
     * TblAnim.startRowResize
     * @param $el
     * @param event
     */
    export function startRowResize(
        $el: JQuery,
        event: JQueryMouseEventObject
    ): void {
        rowInfo.mouseStart = event.pageY;
        mouseStatus = "checkingRowMove";
        rowInfo.$el = $el;
        let $table = $el.closest('.xcTbodyWrap');
        rowInfo.$table = $table;
        rowInfo.actualTd = $el.closest('td');
        rowInfo.$container = $table.closest(".xcTableWrap").parent();
        // we actually target the td above the one we're grabbing.
        if ($el.hasClass('last')) {
            rowInfo.targetTd = $table.find('tr:last').find('td').eq(0);
            rowInfo.actualTd = rowInfo.targetTd;
        } else {
            rowInfo.targetTd = $el.closest('tr').prev().find('td').eq(0);
        }

        rowInfo.startHeight = rowInfo.targetTd.outerHeight();

        $(document).on('mousemove.checkRowResize', checkRowResize);
        $(document).on('mouseup.endRowResize', endRowResize);
    };

    function checkRowResize(event: JQueryMouseEventObject): void {
        let mouseDistance: number = event.pageY - rowInfo.mouseStart;
        if (mouseDistance + rowInfo.startHeight > gRescol.minCellHeight) {
            $(document).off('mousemove.checkRowResize');
            $(document).on('mousemove.onRowResize', onRowResize);
            mouseStatus = "rowMove";

            let $table: JQuery = rowInfo.$table;
            rowInfo.tableId = TblManager.parseTableId($table);

            rowInfo.rowIndex = rowInfo.targetTd.closest('tr').index();
            rowInfo.$divs = $table.find('tbody tr:eq(' + rowInfo.rowIndex +
                                        ') td > div');
            xcUIHelper.disableTextSelection();

            $('body').addClass('tooltipOff')
                     .append('<div id="rowResizeCursor"></div>');
            rowInfo.targetTd.closest('tr').addClass('changedHeight');
            rowInfo.actualTd.closest('tr').addClass('dragging');
            rowInfo.$divs.css('max-height', rowInfo.startHeight - 4);
            rowInfo.$divs.eq(0).css('max-height', rowInfo.startHeight);
            rowInfo.targetTd.outerHeight(rowInfo.startHeight);

            $table.find('tr:not(.dragging)').addClass('notDragging');
            lockScrolling(rowInfo.$container, 'horizontal');
            $table.siblings(".tableScrollBar").hide();
        }
    }

    function onRowResize(event: JQueryMouseEventObject): void {
        let mouseDistance: number = event.pageY - rowInfo.mouseStart;
        let newHeight: number = rowInfo.startHeight + mouseDistance;
        const padding: number = 4; // top + bottom padding in td
        if (newHeight < gRescol.minCellHeight) {
            rowInfo.targetTd.outerHeight(gRescol.minCellHeight);
            rowInfo.$divs.css('max-height', gRescol.minCellHeight - padding);
            rowInfo.$divs.eq(0).css('max-height', gRescol.minCellHeight);
        } else {
            rowInfo.targetTd.outerHeight(newHeight);
            rowInfo.$divs.css('max-height', newHeight - padding);
            rowInfo.$divs.eq(0).css('max-height', newHeight);
        }
    }

    function endRowResize(): void {
        $(document).off('mouseup.endRowResize');

        if (mouseStatus === "checkingRowMove") {
            $(document).off('mousemove.checkRowResize');
            mouseStatus = null;
            return;
        }

        $(document).off('mousemove.onRowResize');
        mouseStatus = null;

        let newRowHeight = rowInfo.targetTd.outerHeight();
        let rowNum = RowManager.parseRowNum(rowInfo.targetTd.parent()) + 1;
        let rowObj = gTables[rowInfo.tableId].rowHeights;
        // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
        let pageNum = Math.floor((rowNum - 1) / TableMeta.NumEntriesPerPage);
        xcUIHelper.reenableTextSelection();
        $('body').removeClass('tooltipOff');
        $('#rowResizeCursor').remove();
        rowInfo.$table.siblings(".tableScrollBar").show();
        unlockScrolling(rowInfo.$container, 'horizontal');
        let $table = $('#xcTable-' + rowInfo.tableId);
        $table.find('tr').removeClass('notDragging dragging');

        if (newRowHeight !== gRescol.minCellHeight) {
            if (rowObj[pageNum] == null) {
                rowObj[pageNum] = {};
            }
            rowObj[pageNum][rowNum] = newRowHeight;
        } else {
            // remove this rowNumber from gTables and
            //if no other rows exist in the page, remove the pageNumber as well
            if (rowObj[pageNum] != null) {
                delete rowObj[pageNum][rowNum];
                if ($.isEmptyObject(rowObj[pageNum])) {
                    delete rowObj[pageNum];
                }
            }
            rowInfo.targetTd.parent().removeClass('changedHeight');
            rowInfo.targetTd.parent().find('.jsonElement >  div')
                                     .css('max-height', 16);
        }

        let rowManger = new RowManager(gTables[rowInfo.tableId], $("#xcTableWrap-" + rowInfo.tableId));
        rowManger.setSizerHeight();

        Log.add(SQLTStr.ResizeRow, {
            "operation": SQLOps.DragResizeRow,
            "tableName": gTables[rowInfo.tableId].tableName,
            "tableId": rowInfo.tableId,
            "rowNum": rowNum - 1,
            "fromHeight": rowInfo.startHeight,
            "toHeight": newRowHeight,
            "htmlExclude": ["rowNum", "fromHeight", "toHeight"]
        });
    }

    /**
     * TblAnim.resizeRow
     * @param rowNum
     * @param tableId
     * @param fromHeight
     * @param toHeight
     */
    export function resizeRow(
        rowNum: number,
        tableId: TableId,
        fromHeight: number,
        toHeight: number
    ): void {
        const padding: number = 4; // top + bottom padding in td
        let $table: JQuery = $('#xcTable-' + tableId);
        let $targetRow: JQuery = $table.find('.row' + rowNum);
        let $targetTd: JQuery = $targetRow.find('.col0');

        let $divs = $targetRow.find('td > div');
        if (toHeight < gRescol.minCellHeight) {
            toHeight = gRescol.minCellHeight;
        }

        $targetTd.outerHeight(toHeight);
        $divs.css('max-height', toHeight - padding);
        $divs.eq(0).css('max-height', toHeight);

        let rowObj = gTables[tableId].rowHeights;
        let pageNum = Math.floor((rowNum) / TableMeta.NumEntriesPerPage);

        if (toHeight !== gRescol.minCellHeight) {
            if (rowObj[pageNum] == null) {
                rowObj[pageNum] = {};
            }
            rowObj[pageNum][rowNum + 1] = toHeight;
            $targetRow.addClass('changedHeight');
        } else {
            // remove this rowNumber from gTables and
            //if no other rows exist in the page, remove the pageNumber as well
            if (rowObj[pageNum] != null) {
                delete rowObj[pageNum][rowNum + 1];
                if ($.isEmptyObject(rowObj[pageNum])) {
                    delete rowObj[pageNum];
                }
            }
            $targetTd.parent().removeClass('changedHeight');
            $targetTd.parent().find('.jsonElement >  div')
                                     .css('max-height', 16);
        }

        Log.add(SQLTStr.ResizeRow, {
            "operation": SQLOps.DragResizeRow,
            "tableName": gTables[tableId].tableName,
            "tableId": tableId,
            "rowNum": rowNum,
            "fromHeight": fromHeight,
            "toHeight": toHeight,
            "htmlExclude": ["rowNum", "fromHeight", "toHeight"]
        });
    }
    /* END ROW RESIZING */

    /* START COLUMN DRAG DROP */
    /**
     * TblAnim.startColDrag
     * @param $el
     * @param event
     */
    export function startColDrag(
        $el: JQuery,
        event: JQueryEventObject
    ): void {
        let $tableWrap: JQuery = $el.closest('.xcTableWrap');
        if ($tableWrap.hasClass('undraggable')) {
            return;
        }

        mouseStatus = "checkingMovingCol";
        dragInfo.mouseX = event.pageX;
        dragInfo.$el = $el;
        dragInfo.$tableWrap = $tableWrap;
        dragInfo.$container = $tableWrap.parent();

        $el.closest("th").addClass("colDragging");
        let cursorStyle: string = '<div id="moveCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);
        $tableWrap.addClass("checkingColDrag");

        TblManager.unHighlightCells();

        $(document).on('mousemove.checkColDrag', checkColDrag);
        $(document).on('mouseup.endColDrag', endColDrag);
    }

    // checks if mouse has moved and will initiate the column dragging
    function checkColDrag(event: JQueryEventObject): void {
        dragInfo.pageX = event.pageX;
        // mouse must move at least 2 pixels horizontally to trigger draggin
        if (Math.abs(dragInfo.mouseX - dragInfo.pageX) < 2) {
            return;
        }
        dragInfo.$tableWrap.removeClass("checkingColDrag");

        $(document).off('mousemove.checkColDrag');
        $(document).on('mousemove.onColDrag', onColDrag);
        mouseStatus = "dragging";
        let el = dragInfo.$el;
        let pageX = event.pageX;
        dragInfo.colNum = ColManager.parseColNum(el);
        let $tableWrap = dragInfo.$tableWrap;

        let $table = el.closest('.xcTable');
        let $tbodyWrap = $table.parent();
        let $editableHead = el.find('.editableHead');
        dragInfo.$table = $tableWrap;
        dragInfo.tableId = TblManager.parseTableId($table);
        dragInfo.element = el;
        dragInfo.colIndex = parseInt(<any>el.index());
        dragInfo.offsetTop = el.offset().top;
        dragInfo.grabOffset = pageX - el.offset().left;
        // dragInfo.grabOffset = distance from the left side of dragged column
        // to the point that was grabbed
        dragInfo.docHeight = $(document).height();
        dragInfo.val = $editableHead.val();
        let shadowDivHeight = $tbodyWrap.height();
        let shadowTop = $tableWrap.find('.header').position().top - 3;

        dragInfo.inFocus = $editableHead.is(':focus');
        dragInfo.selected = el.hasClass('selectedCell');
        dragInfo.isMinimized = el.hasClass('userHidden');
        dragInfo.colWidth = el.width();
        dragInfo.windowWidth = $(window).width();
        dragInfo.mainFrameLeft = dragInfo.$container[0].getBoundingClientRect().left;
        dragInfo.offsetLeft = dragInfo.$container.offset().left - dragInfo.$container.position().left;
        let timer;
        if (gTables[dragInfo.tableId].tableCols.length > 50) {
            timer = 100;
        } else {
            timer = 40;
        }
        dragdropMoveMainFrame(dragInfo, timer);

        // the following code deals with hiding non visible tables and locking the
        // scrolling when we reach the left or right side of the table

        let mfWidth: number = dragInfo.$container.width();

        let mfScrollLeft: number = dragInfo.$container.scrollLeft();
        let tableLeft: number = dragInfo.$table.offset().left - MainMenu.getOffset();
        dragInfo.$container.addClass('scrollLocked');

        let leftLimit: number = mfScrollLeft + tableLeft;
        leftLimit = Math.min(leftLimit, mfScrollLeft);
        let rightLimit: number = mfScrollLeft + tableLeft + $tableWrap.width() - mfWidth +
                         dragInfo.grabOffset;
        rightLimit = Math.max(rightLimit, mfScrollLeft);


        let scrollLeft: number;
        dragInfo.$container.on('scroll.draglocked', function() {
            TblFunc.moveFirstColumn(null, true);
        });

        // create a fake transparent column by cloning
        createTransparentDragDropCol(pageX);

        // create a replica shadow with same column width, height,
        // and starting position
        xcUIHelper.disableTextSelection();
        $tableWrap.append('<div id="shadowDiv" style="width:' +
                        dragInfo.colWidth +
                        'px;height:' + (shadowDivHeight) + 'px;left:' +
                        (dragInfo.element.position().left) +
                        'px;top:' + shadowTop + 'px;"></div>');
        createDropTargets(null, null);
    }

    function onColDrag(event: JQueryEventObject): void {
        let pageX = event.pageX;
        dragInfo.pageX = pageX;
        dragInfo.fauxCol.css('left', pageX - dragInfo.offsetLeft);
    }

    function endColDrag(): void {
        $(document).off('mouseup.endColDrag');
        $('#moveCursor').remove();
        setTimeout(function() {
            dragInfo.$el.closest("th").removeClass("colDragging");
        });

        setTimeout(function() {
            dragInfo.$tableWrap.removeClass("checkingColDrag");
            $('body').removeClass('tooltipOff');
            // without timeout, tooltip will flicker on and off
        }, 0);

        if (mouseStatus === "checkingMovingCol") {
            // endColDrag is called on mouseup but if there was no mouse movement
            // then just clean up and exit
            mouseStatus = null;
            $(document).off('mousemove.checkColDrag');
            return;
        }
        $(document).off('mousemove.onColDrag');

        mouseStatus = null;
        let $tableWrap: JQuery = dragInfo.$table;
        let $th: JQuery = dragInfo.element;
        dragInfo.$container.off('scroll.draglocked');
        dragInfo.$container.removeClass('scrollLocked');
        if (gMinModeOn) {
            $('#shadowDiv, #fauxCol').remove();
        } else {
            // slide column into place
            $tableWrap.addClass('undraggable');
            let slideLeft: number = $th.offset().left -
                            parseInt(dragInfo.fauxCol.css('margin-left')) -
                            dragInfo.offsetLeft;
            let currentLeft: number = parseInt(dragInfo.fauxCol.css('left'));
            let slideDistance: number = Math.max(2, Math.abs(slideLeft - currentLeft));
            let slideDuration: number = Math.log(slideDistance * 4) * 90 - 200;

            // unhiding non visible tables is slow and interrupts column sliding
            // animation so we delay the animation with the timout
            setTimeout(function() {
                dragInfo.fauxCol.animate({left: slideLeft}, slideDuration, "linear",
                    function() {
                        $('#shadowDiv, #fauxCol').remove();
                        $tableWrap.removeClass('undraggable');
                    }
                );
            }, 0);
        }

        $('#dropTargets').remove();
        dragInfo.$container.off('scroll', mainFrameScrollDropTargets)
                       .scrollTop(0);
        xcUIHelper.reenableTextSelection();
        if (dragInfo.inFocus) {
            dragInfo.element.find('.editableHead').focus();
        }

        // only pull col if column is dropped in new location
        if ((dragInfo.colIndex) !== dragInfo.colNum) {
            let tableId: TableId = dragInfo.tableId;
            let oldColNum: number = dragInfo.colNum;
            let newColNum: number = dragInfo.colIndex;

            ColManager.reorderCol(tableId, oldColNum, newColNum, null);
        }
    }

    function cloneCellHelper(el: Element): HTML {
        let trClass: string = "";
        if ($(el).hasClass("changedHeight")) {
            trClass = "changedHeight";
        }
        let $td = $(el).children().eq(dragInfo.colIndex);

        let $clone: JQuery = $td.clone();
        let cloneHeight: number = $td.outerHeight();
        let cloneColor = $td.css('background-color');
        $clone.css('height', cloneHeight + 'px');
        $clone.outerWidth(dragInfo.colWidth);
        $clone.css('background-color', cloneColor);
        let cloneHTML: HTML = $clone[0].outerHTML;
        cloneHTML = '<tr class="' + trClass + '">' + cloneHTML + '</tr>';
        return cloneHTML;
    }

    function createTransparentDragDropCol(pageX: number): void {
        let $tableWrap: JQuery = dragInfo.$table;
        let $table: JQuery = $tableWrap.find('table');
        dragInfo.$container.append('<div id="fauxCol" style="left:' +
                        (pageX - dragInfo.offsetLeft) + 'px;' +
                        'width:' + (dragInfo.colWidth) + 'px;' +
                        'margin-left:' + (-dragInfo.grabOffset) + 'px;">' +
                            '<table id="fauxTable" ' +
                            'class="dataTable xcTable" ' +
                            'style="width:' + (dragInfo.colWidth) + 'px">' +
                            '</table>' +
                        '</div>');
        dragInfo.fauxCol = $('#fauxCol');
        let $fauxTable: JQuery = $('#fauxTable');

        let rowHeight: number = gRescol.minCellHeight;
        // turn this into binary search later
        let topPx: number = $table.find('.header').offset().top - rowHeight;
        let topRowIndex: number = -1;
        let topRowEl: JQuery;
        $table.find('tbody tr').each(function() {
            let $el = $(this);
            if ($el.offset().top > topPx) {
                topRowIndex = $el.index();
                topRowEl = $el.find('td');
                return false;
            }
        });

        let cloneHTML = "";
        // check to see if topRowEl was found;
        if (topRowIndex === -1) {
            console.error("BUG! Cannot find first visible row??");
            // Clone entire shit and be.then.
            $table.find('tr').each(function(_i, ele) {
                cloneHTML += cloneCellHelper(ele);
            });
            $fauxTable.append(cloneHTML);
            return;
        }

        // Clone head

        $table.find('tr:first').each(function(_i, ele) {
            cloneHTML += cloneCellHelper(ele);
        });

        if (dragInfo.selected) {
            $fauxTable.addClass('selectedCol');
        }
        if (dragInfo.isMinimized) {
            $fauxTable.addClass('userHidden');
        }
        if ($table.hasClass("allImmediates")) {
            $fauxTable.addClass("allImmediates");
        }

        let totalRowHeight: number = $tableWrap.height() -
                            $table.find('th:first').outerHeight();
        let numRows: number = Math.ceil(totalRowHeight / rowHeight);

        $table.find('tr:gt(' + (topRowIndex) + ')').each(function(i, ele) {
            cloneHTML += cloneCellHelper(ele);
            if (i >= numRows + topRowIndex) {
                return (false);
            }
        });
        $fauxTable.append(cloneHTML);

        // Ensure rows are offset correctly
        let fauxTableHeight: number = $fauxTable.height() +
                              $fauxTable.find('tr:first').outerHeight();
        let tableTitleHeight: number = $tableWrap.find('.tableTitle').height();

        let xcTableWrapHeight: number = $tableWrap.height();
        let fauxColHeight: number = Math.min(fauxTableHeight, xcTableWrapHeight);
        dragInfo.fauxCol.height(fauxColHeight);
        let firstRowOffset: number = $(topRowEl).offset().top - topPx - rowHeight;
        $fauxTable.css('margin-top', firstRowOffset);
        $fauxTable.find('tr:first-child').css({'margin-top':
                                    -(firstRowOffset + tableTitleHeight)});
    }

    function createDropTargets(
        dropTargetIndex: number,
        swappedColIndex: number
    ): void {
        let dragMargin: number = 30;
        if (dragInfo.isMinimized) {
            dragMargin = 10;
        }
        let colLeft: number;
        // targets extend this many pixels to left of each column

        if (!dropTargetIndex) {
            // create targets that will trigger swapping of columns on hover
            let dropTargets: string = "";
            dragInfo.$table.find('tr').eq(0).find('th').each(function(i) {
                if (i === 0 || i === dragInfo.colIndex) {
                    return true;
                }
                colLeft = $(this).position().left;
                let targetWidth: number;

                if ((dragInfo.colWidth - dragMargin) <
                    Math.round(0.5 * $(this).width())
                ) {
                    targetWidth = dragInfo.colWidth;
                } else {
                    targetWidth = Math.round(0.5 * $(this).outerWidth()) + dragMargin;
                }
                dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                                'style="left:' +
                                (colLeft - dragMargin + dragInfo.grabOffset) + 'px;' +
                                'width:' + targetWidth + 'px;height:' +
                                dragInfo.docHeight + 'px;">' +
                                    i +
                                '</div>';
            });
            let scrollLeft: number = dragInfo.$container.scrollLeft();
            // may have issues with table left if dragInfo.$table isn't correct
            let tableLeft: number = dragInfo.$table[0].getBoundingClientRect().left + scrollLeft;
            $('body').append('<div id="dropTargets" style="' +
                    'margin-left:' + tableLeft + 'px;' +
                    'left:' + (-scrollLeft) + 'px;">' + dropTargets + '</div>');
            $('#dropTargets').on('mouseenter', '.dropTarget', function() {
                dragdropSwapColumns($(this));
            });
            dragInfo.$container.scroll(mainFrameScrollDropTargets);
        } else {
            // targets have already been created, so just adjust the one
            // corresponding to the column that was swapped
            let swappedCol: JQuery = dragInfo.$table.find('th:eq(' + swappedColIndex + ')');
            colLeft = swappedCol.position().left;
            $('#dropTarget' + dropTargetIndex).attr('id', 'dropTarget' + swappedColIndex);
            let dropTarget: JQuery = $('#dropTarget' + swappedColIndex);
            dropTarget.css({
                'left': (colLeft - dragMargin + dragInfo.grabOffset) + 'px'
            });
            if (isBrowserSafari) {
                // safari has a display issue, use this to resolve T_T
                let $header: JQuery = swappedCol.find(".header");
                $header.height($header.height() + 1);
                setTimeout(function() {
                    $header.height($header.height() - 1);
                }, 1);
            }
        }
    }

    function mainFrameScrollDropTargets(event: JQueryEventObject): void {
        let left: number = -$(event.target).scrollLeft();
        $('#dropTargets').css('left', left);
    }

    function dragdropSwapColumns($el: JQuery): void {
        let dropTargetId: number = parseInt(($el.attr('id')).substring(10));
        let nextCol: number = dropTargetId - Math.abs(dropTargetId - dragInfo.colIndex);
        let prevCol: number = dropTargetId + Math.abs(dropTargetId - dragInfo.colIndex);
        let movedCol: number;
        if (dropTargetId > dragInfo.colIndex) {
            dragInfo.$table.find('tr').each(function() {
                $(this).children(':eq(' + dropTargetId + ')').after(
                    $(this).children(':eq(' + nextCol + ')')
                );
            });
            movedCol = nextCol;
        } else {
            dragInfo.$table.find('tr').each(function() {
                $(this).children(':eq(' + dropTargetId + ')').before(
                    $(this).children(':eq(' + prevCol + ')')
                );
            });
            movedCol = prevCol;
        }

        let left: number = dragInfo.element.position().left;
        $('#shadowDiv').css('left', left);
        dragInfo.colIndex = dropTargetId;
        createDropTargets(dropTargetId, movedCol);
    }

    /* END COLUMN DRAG DROP */

    /* Start Helper Functions */

    // scrolls #mainFrame while draggin column or table
    function dragdropMoveMainFrame(dragInfo, timer) {
        // essentially moving the horizontal mainframe scrollbar if the mouse is
        // near the edge of the viewport
        let $mainFrame = dragInfo.$container;
        if (mouseStatus === 'dragging') {
            if (dragInfo.pageX > dragInfo.windowWidth - 30) { // scroll right
                let left: number = $mainFrame.scrollLeft() + 40;
                $mainFrame.scrollLeft(left);
            } else if (dragInfo.pageX < dragInfo.mainFrameLeft + 30) { // scroll left;
                let left: number = $mainFrame.scrollLeft() - 40;
                $mainFrame.scrollLeft(left);
            }

            setTimeout(function() {
                dragdropMoveMainFrame(dragInfo, timer);
            }, timer);
        }
    }

    // prevents screen from scrolling during drag or resize
    function lockScrolling($target: JQuery, direction: string): void {
        if (direction === "horizontal") {
            let scrollLeft: number = $target.scrollLeft();
            $target.addClass('scrollLocked');
            $target.on('scroll.locked', function() {
                $target.scrollLeft(scrollLeft);
            });
        }
    }

    function unlockScrolling($target: JQuery, direction: string): void {
        $target.off('scroll.locked');
        if (direction === "horizontal") {
            $target.removeClass('scrollLocked');
        }
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.checkColResize = checkColResize;
        __testOnly__.onColResize = onColResize;
        __testOnly__.endColResize = endColResize;
        __testOnly__.rowInfo = rowInfo;
        __testOnly__.dragInfo = dragInfo;
        __testOnly__.checkRowResize = checkRowResize;
        __testOnly__.onRowResize = onRowResize;
        __testOnly__.endRowResize = endRowResize;
        __testOnly__.checkColDrag = checkColDrag;
        __testOnly__.onColDrag = onColDrag;
        __testOnly__.endColDrag = endColDrag;
        __testOnly__.dragdropSwapColumns = dragdropSwapColumns;
        __testOnly__.dblClickResize = dblClickResize;

    }
    /* End Of Unit Test Only */
}
