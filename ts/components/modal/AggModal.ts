class AggModal {
    private static _instance: AggModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;

    private _aggFunctions: AggrOp[];
    private _aggCols: {col: ProgCol, colNum: number}[];

    // UI cache, not saving to kvStore
    private _aggCache;
    private _corrCache;
    private _aggOpMap;

    private _cachedTableId;
    private _cachedVertColNums;
    private _cachedHorColNums;
    private _cachedProfileColNum;

    private constructor() {
        this._aggFunctions = [AggrOp.Sum, AggrOp.Avg, AggrOp.Min, AggrOp.Max, AggrOp.Count];
        this._aggCols = [];
        this._aggCache = {};
        this._corrCache = {};
        this._setupAggOpMap();

        this._modalHelper = new ModalHelper(this._getModal(), {
            "sizeToDefault": true
        });
        this._addEventListeners();
    }

    /**
     * AggModal.Instance.corrAgg
     * @param tableId
     * @param vertColNums
     * @param horColNums
     * @param profileColNum
     */
    public corrAgg(
        tableId: TableId,
        vertColNums?: number[],
        horColNums?: number[],
        profileColNum?: number
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let table = gTables[tableId];
        let tableName = table.getName();
        // If this is triggered from a column profile then we want to track
        // this to be able to go back to the profile.
        // Else profileColNum is empty
        if (profileColNum != null) {
            this._getModal().addClass("profileMode");
            this._cachedProfileColNum = profileColNum;
        }

        this._cachedTableId = tableId;
        this._cachedVertColNums = vertColNums;
        this._cachedHorColNums = horColNums;
        this._show("corrTab");

        this._aggColsInitialize(table);
        if (this._isTooManyColumns(vertColNums, horColNums)) {
            return PromiseHelper.resolve();
        }
        this._corrTableInitialize();

        let sql = {
            "operation": SQLOps.Corr,
            "tableId": tableId,
            "tableName": tableName,
            "vertColNums": vertColNums,
            "horColNums": horColNums
        };
        let txId = Transaction.start({
            "operation": SQLOps.Corr,
            "sql": sql,
            "track": true
        });

        // will always resolve
        let $corr = this._getCorrSection();
        $corr.attr("data-state", "pending");
        this._calcCorr(table, txId)
        .always(() => {
            $corr.attr("data-state", "finished");
            Transaction.done(txId, {});
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     * AggModal.Instance.quickAgg
     * @param tableId
     * @param horColNums use horColNums to match the horColumns in corr
     */
     public quickAgg(tableId: TableId, horColNums: number[]): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let table: TableMeta = gTables[tableId];
        let tableName = table.getName();

        this._cachedTableId = tableId;
        this._cachedHorColNums = horColNums;
        this._show("aggTab");

        this._aggColsInitialize(table);
        if (this._isTooManyColumns(horColNums)) {
            return PromiseHelper.resolve();
        }
        this._aggTableInitialize();

        let sql = {
            "operation": SQLOps.QuickAgg,
            "tableId": tableId,
            "tableName": tableName,
            "horColNums": horColNums
        };
        let txId = Transaction.start({
            "operation": SQLOps.QuickAgg,
            "sql": sql,
            "track": true
        });
        let $quickAgg = this._getQuickAggSection();
        $quickAgg.attr("data-state", "pending");
        // will always resolve
        this._calcAgg(table, txId)
        .always(() => {
            $quickAgg.attr("data-state", "finished");
            Transaction.done(txId, {});
            deferred.resolve();
        });

        return deferred.promise();
    }

    private _isTooManyColumns(vertCols?: number[], horCols?: number[]): boolean {
        const limit = 50;
        if (vertCols && vertCols.length > limit ||
            horCols && horCols.length > limit ||
            !vertCols && !horCols && this._aggCols.length > limit
        ) {
            Alert.show({
                title: "Too many columns",
                msg: "Please select less columns and trigger correlation from column meanu",
                isAlert: true
            });
            return true;
        } else {
            return false;
        }
    }

    private _getModal(): JQuery {
        return $("#aggModal");
    }

    private _getQuickAggSection(): JQuery {
        return $("#aggModal-quickAgg");
    }

    private _getCorrSection(): JQuery {
        return $("#aggModal-corr");
    }

    private _getBackProfileBtn(): JQuery {
        return $("#aggModal-backToProfile");
    }

    private _setupAggOpMap(): void {
        this._aggOpMap = {};
        this._aggOpMap[AggrOp.Sum] = 0;
        this._aggOpMap[AggrOp.Avg] = 1;
        this._aggOpMap[AggrOp.Min] = 2;
        this._aggOpMap[AggrOp.Max] = 3;
        this._aggOpMap[AggrOp.Count] = 4;
    }

    private _close(): void {
        this._modalHelper.clear();
        this._cachedTableId = null;
        this._cachedVertColNums = null;
        this._cachedHorColNums = null;
        this._cachedProfileColNum = null;
        this._getModal().removeClass("profileMode");
    }

    private _show(mode: string): void {
        let $modal = this._getModal();
        let $quickAgg = this._getQuickAggSection();
        let $corr = this._getCorrSection();

        if (mode === "aggTab") {
            // when it's quick aggregation
            $("#aggTab").addClass("active")
                    .siblings().removeClass("active");
            $quickAgg.show();
            $corr.hide();
            $modal.find(".modalInstruction .text").text(AggTStr.AggTopInstr);
        } else if (mode === "corrTab") {
            // when it's correlation
            $("#corrTab").addClass("active")
                    .siblings().removeClass("active");
            $quickAgg.hide();
            $corr.show();
            $modal.find(".modalInstruction .text").text(AggTStr.CorrInstr);
        } else {
            // error case
            throw "Invalid mode in quick agg!";
        }

        if (!$modal.is(":visible")) {
            this._modalHelper.setup()
            .always(() => {
                $modal.find(".aggContainer")
                        .scrollTop(0)
                        .scrollLeft(0);
            });
        }
    }

    private _aggColsInitialize(table: TableMeta) {
        this._aggCols = [];
        let tableCols: ProgCol[] = table.getAllCols();
        for (let i = 0, colLen = tableCols.length; i < colLen; i++) {
            let progCol = tableCols[i];
            // skip all columns that are not number
            if (progCol.isNumberCol()) {
                let colNum = i + 1;
                this._aggCols.push({
                    "col": progCol,
                    "colNum": colNum
                });
            }
        }
    }

    private _aggTableInitialize(): void {
        let colLen = this._aggCols.length;
        let funLen = this._aggFunctions.length;
        let wholeTable: string = "";
        let colLabels: {colName: string, prefix: string}[] = [];

        for (let col = 0; col < colLen; col++) {
            let aggCol = this._aggCols[col];
            if (this._cachedHorColNums != null &&
                !this._cachedHorColNums.includes(aggCol.colNum))
            {
                continue;
            }

            let progCol: ProgCol = aggCol.col;
            colLabels.push({
                colName: progCol.getFrontColName(),
                prefix: progCol.getPrefix() || CommonTxtTstr.Immediates
            });
            wholeTable += '<div class="aggCol">';

            for (let row = 0; row < funLen; row++) {
                wholeTable += '<div class="aggTableField cell" ' +
                               'data-col=' + col + ' data-row=' + row + '>';

                if (progCol.isNumberCol()) {
                    wholeTable += '<div class="spinny"></div>';
                } else {
                    wholeTable += "N/A";
                }

                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        if (wholeTable === "") {
            wholeTable =
                '<div class="hint">' +
                    AggTStr.NoAgg +
                '</div>';
        }

        let $quickAgg = this._getQuickAggSection();
        $quickAgg.find(".headerContainer").html(this._getColLabelHTML(colLabels));
        $quickAgg.find(".labelContainer").html(this._getRowLabelHTML(this._aggFunctions));
        $quickAgg.find(".aggContainer").html(wholeTable);
    }

    private _corrTableInitialize(): void {
        let colLen: number = this._aggCols.length;
        let wholeTable: string = "";

        // column's order is column0, column1...columnX
        // row's order is columnX, column(X-1).....column1
        let colLabels: {colName: string, prefix: string}[] = [];

        for (let col = 0; col < colLen; col++) {
            let aggCol = this._aggCols[col];
            var progCol = aggCol.col;

            if (this._cachedVertColNums != null &&
                !this._cachedVertColNums.includes(aggCol.colNum)
            ) {
                continue;
            }

            colLabels.push({
                colName: progCol.getFrontColName(),
                prefix: progCol.getPrefix() || CommonTxtTstr.Immediates
            });
            wholeTable += '<div class="aggCol">';

            for (let row = 0; row < colLen; row++) {
                let aggRow = this._aggCols[colLen - row - 1];

                if (this._cachedHorColNums != null &&
                    !this._cachedHorColNums.includes(aggRow.colNum)
                ) {
                    continue;
                }
                let cell = '<div class="aggTableField aggTableFlex cell" ' +
                            'data-col=' + col + ' data-row=' + row + '>';

                wholeTable += cell + '<img class="loadingBar" src="' +
                                        paths.loadBarIcon + '">';

                wholeTable += "</div>";
            }
            wholeTable += "</div>";
        }

        let rowLabels: {colName: string, prefix: string}[] = [];
        for (let i = colLen - 1; i >= 0; i--) {
            if (this._cachedHorColNums != null &&
                !this._cachedHorColNums.includes(this._aggCols[i].colNum))
            {
                continue;
            }

            rowLabels.push({
                colName: this._aggCols[i].col.getFrontColName(),
                prefix: this._aggCols[i].col.getPrefix() || CommonTxtTstr.Immediates
            });
        }

        let $corr = this._getCorrSection();
        if (wholeTable === "") {
            wholeTable = '<div class="hint">' +
                                AggTStr.NoCorr +
                            '</div>';
            $corr.addClass("empty");
        } else {
            $corr.removeClass("empty");
        }

        $corr.find(".headerContainer").html(this._getColLabelHTML(colLabels));
        $corr.find(".labelContainer").html(this._getRowLabelHTML(rowLabels));
        $corr.find(".aggContainer").html(wholeTable);
        this._setupResize();
    }

    private _setupResize(): void {
        const defaultWidth: number = 120;
        let $corr = this._getCorrSection();
        let $header = $corr.find(".headerContainer");
        let $padding = $header.find(".padding");
        let $eles = $header.find(".blankSpace")
                    .add($corr.find(".tableContainer .labelContainer"));
        $eles.css("flex", "0 0 " + defaultWidth + "px");

        $padding.resizable({
            "handles": "e, w",
            "minWidth": defaultWidth,
            "resize": function(_event, ui) {
                let width = ui.size.width;
                width = Math.min(width, $header.width() * 0.5);
                $eles.css("flex", "0 0 " + width + "px");
                $padding.width(width);
            }
        });
    }

    private _getRowLabelHTML(
        operations: {colName: string, prefix: string}[] | string[]
    ): HTML {
        let html: HTML = '<div class="aggCol labels">';
        let prefixLabel: string = "";
        for (let i = 0, len = operations.length; i < len; i++) {
            let name: string;
            if (typeof operations[i] === "string") {
                name = <string>operations[i];
            } else {
                let prefClass: string = "";
                let operation = <{colName: string, prefix: string}>operations[i];
                if (operation.prefix === CommonTxtTstr.Immediates) {
                    prefClass = " derived";
                }
                prefixLabel =
                '<span data-original-title="' +
                operation.prefix + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body" ' +
                'class="textOverflow tooltipOverflow prefix '
                + prefClass + '">' +
                    operation.prefix +
                '</span>';
                name = operation.colName;
            }
            name = xcStringHelper.escapeHTMLSpecialChar(name);
            html +=
            '<div class="aggTableField rowLabel">' +
                prefixLabel +
                '<span data-original-title="' +
                xcStringHelper.escapeDblQuoteForHTML(
                xcStringHelper.escapeHTMLSpecialChar(name)) + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body" ' +
                'class="textOverflow tooltipOverflow">' +
                    name +
                '</span>' +
            '</div>';
        }

        html += '</div>';
        return html;
    }

    private _getColLabelHTML(
        labels: {colName: string, prefix: string}[]
    ): HTML {
        let html: HTML = '<div class="padding"></div>' +
                   '<div class="aggTableField colLabel blankSpace"></div>';
        let prefClass: string = "";
        for (let i = 0, len = labels.length; i < len; i++) {
            if (labels[i].prefix === CommonTxtTstr.Immediates) {
                prefClass = " derived";
            } else {
                prefClass = "";
            }
            let colName = xcStringHelper.escapeHTMLSpecialChar(labels[i].colName);
            html +=
            '<div class="aggTableField colLabel">' +
                '<span data-original-title="' + labels[i].prefix + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body" ' +
                'class="prefix textOverflow tooltipOverflow ' +
                prefClass + '">' +
                    labels[i].prefix +
                '</span>' +
                '<span data-original-title="' +
                xcStringHelper.escapeDblQuoteForHTML(
                xcStringHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body" ' +
                'class="textOverflow tooltipOverflow">' +
                    colName +
                '</span>' +
            '</div>';
        }
        return html;
    }

    private _updateRunProgress(curr: number, total: number, isCorr: boolean): void {
        // do not update number display if not in the correct view
        if ((isCorr && $("#aggTab").hasClass("active")) ||
            (!isCorr && !$("#aggTab").hasClass("active")) ) {
            return;
        }
        this._getModal().find(".progressValue").text(curr + "/" + total);
    }

    private _checkDupCols(colNo: number): number[] {
        let args = this._aggCols[colNo].col.getBackColName();
        let dups: number[] = [];

        for (let i = colNo + 1, len = this._aggCols.length; i < len; i++) {
            let progCol: ProgCol = this._aggCols[i].col;
            if (!progCol.isDATACol() && progCol.getBackColName() === args) {
                dups.push(i);
            }
        }
        return dups;
    }

    private _calcCorr(table: TableMeta, txId: number): XDPromise<void> {
        let promises: XDPromise<number>[] = [];
        let colLen: number = this._aggCols.length;
        let dupCols: boolean[] = [];
        let total: number = this._getCorrSection().find(".cell").length;
        let cellCount: number = 0;
        this._updateRunProgress(cellCount, total, true);
        // First we need to determine if this is a dataset-table
        // or just a regular table

        let corrString: string =
        "div(sum(mult(sub($arg1, avg($arg1)), sub($arg2," +
        "avg($arg2)))), sqrt(mult(sum(pow(sub($arg1, " +
        "avg($arg1)), 2)), sum(pow(sub($arg2, avg($arg2)), " +
        "2)))))";
        // the display order is column's order is column0, column1...columnX
        // row's order is columnX, column(X-1).....column1
        // but for simplity to handle duplicate col case,
        // we assume row's order is still column0, column1...columnX, then do
        // the corr, and when display, use getCorrCell() to get the correct cell
        for (let col = 0; col < colLen; col++) {
            let aggCol = this._aggCols[col];
            let progCol = aggCol.col;
            // the diagonal is always 1
            cellCount += this._applyCorrResult(col, col, 1, [], null);

            if (dupCols[col]) {
                // for duplicated columns, no need to trigger thrift call
                continue;
            }

            let dups = this._checkDupCols(col);
            for (let t = 0; t < dups.length; t++) {
                let dupColNum = dups[t];
                dupCols[dupColNum] = true;

                if (dupColNum > col) {
                    cellCount += this._applyCorrResult(col, dupColNum, 1, [], null);
                }
            }
            this._updateRunProgress(cellCount, total, true);

            for (let row = 0; row < col; row++) {
                let aggRow = this._aggCols[row];
                let isValid = true;
                let cachedHorColNums = this._cachedHorColNums;
                let cachedVertColNums = this._cachedVertColNums;
                if (cachedHorColNums != null && cachedVertColNums != null) {
                    isValid = cachedHorColNums.includes(aggRow.colNum) &&
                              cachedVertColNums.includes(aggCol.colNum) ||
                              cachedHorColNums.includes(aggCol.colNum) &&
                              cachedVertColNums.includes(aggRow.colNum);
                } else if (cachedHorColNums != null) {
                    isValid = cachedHorColNums.includes(aggRow.colNum) ||
                              cachedHorColNums.includes(aggCol.colNum);
                } else if (cachedVertColNums != null) {
                    isValid = cachedVertColNums.includes(aggRow.colNum) ||
                              cachedVertColNums.includes(aggCol.colNum);
                }

                if (!isValid) {
                    continue;
                }

                let sub = corrString.replace(/[$]arg1/g,
                                             progCol.getBackColName());
                sub = sub.replace(/[$]arg2/g,
                                    aggRow.col.getBackColName());
                // Run correlation function
                let promise = this._runCorr(table, sub, row, col, dups, txId);
                promise.then((numDone: number) => {
                    cellCount += numDone;
                    this._updateRunProgress(cellCount, total, true);
                });
                promises.push(promise);
            }
        }

        return PromiseHelper.when(...promises);
    }

    private _runCorr(
        table: TableMeta,
        evalStr: string,
        row: number,
        col: number,
        colDups: number[],
        txId: number
    ): XDPromise<number> {
        let tableId = table.getId();
        if (this._corrCache.hasOwnProperty(tableId)) {
            let corrRes = this._corrCache[tableId][evalStr];

            if (corrRes != null) {
                let error: string = null;
                if (typeof(corrRes) === "string" &&
                    corrRes.indexOf("<span") > -1
                ) {
                    error = "(" + AggTStr.DivByZeroExplain + ")";
                }
                let numDupCells = this._applyCorrResult(row, col, corrRes, colDups, error);
                return PromiseHelper.resolve(numDupCells);
            }
        }

        let deferred: XDDeferred<number> = PromiseHelper.deferred();
        let tableName = table.getName();

        XIApi.aggregateWithEvalStr(txId, evalStr, tableName)
        .then(({value}) => {
            // cache value
            this._corrCache[tableId] = this._corrCache[tableId] || {};
            this._corrCache[tableId][evalStr] = value;
            // end of cache value

            let numDupCells = this._applyCorrResult(row, col, value, colDups, null);
            deferred.resolve(numDupCells);
        })
        .fail((error) => {
            if (error.status === StatusT.StatusXdfDivByZero) {
                this._corrCache[tableId] = this._corrCache[tableId] || {};
                this._corrCache[tableId][evalStr] = '<span class="dash">--</span>';
                error.error += "(" + AggTStr.DivByZeroExplain + ")";
            }

            let numDupCells = this._applyCorrResult(row, col,
                '<span class="dash">--</span>', colDups, error.error);
            // still resolve
            deferred.resolve(numDupCells);
        });

        return deferred.promise();
    }

    private _applyCorrResult(
        row: number,
        col: number,
        value: any,
        colDups: number[],
        error: string
    ): number {
        let isNumeric: boolean = jQuery.isNumeric(value);
        let cellCount: number = 0;

        let title: string = (error == null) ? value : error;
        // error case force to have tooltip
        let spanClass: string = (error == null) ?
        "textOverflow tooltipOverflow" : "textOverflow";
        let html = '<span class="' + spanClass + '" ' +
                    'data-original-title="' + title +
                    '" data-toggle="tooltip" data-placement="auto top" ' +
                    'data-container="body">' +
                        (isNumeric ? value.toFixed(3) : value) +
                    '</span>';
        let $cells: [JQuery, JQuery, boolean] = this._getCorrCell(row, col);
        cellCount += this._updateCorrCell($cells, html);

        let bg: string;
        if (isNumeric) {
            bg = this._getBgColorFromValue(parseFloat(value));
            $cells[0].css("background-color", bg);
            $cells[1].css("background-color", bg);
        }

        let rowDups = this._checkDupCols(row);
        rowDups.forEach((rowNum) => {
            let newRow = col;
            let newCol = rowNum;

            if (newCol > newRow) {
                $cells = this._getCorrCell(newRow, newCol);
                cellCount += this._updateCorrCell($cells, html);

                if (isNumeric) {
                    $cells[0].css("background-color", bg);
                    $cells[1].css("background-color", bg);
                }
            }
        });

        let allRows = [row].concat(rowDups);
        colDups.forEach((colNum) => {
            for (let i = 0, len = allRows.length; i < len; i++) {
                let newRow = allRows[i];
                $cells = this._getCorrCell(newRow, colNum);
                cellCount += this._updateCorrCell($cells, html);

                if (isNumeric) {
                    $cells[0].css("background-color", bg);
                    $cells[1].css("background-color", bg);
                }
            }
        });

        return cellCount;
    }

    private _getBgColorFromValue(value: number): string {
        // base color is hsl(197, 61%, 67%)
        let h: number = 197;
        let s: number = 61;
        let l: number = 67;

        if (value > 0) {
            // when value is 1, color is hsl(215, 49%, 29%),
            h = 197 + Math.round(18 * value);
            s = 61 - Math.round(12 * value);
            l = 67 - Math.round(38 * value);
            // bg = "hsl(203, 75%, " + l + "%)";
        } else if (value < 0) {
            // when value is -1, color is hsl(197, 0, 40%),
            h = 197;
            s = 61 + Math.round(61 * value);
            l = 67 + Math.round(17 * value);
        }

        return "hsl(" + h + ", " + s + "%, " + l + "%)";
    }

    private _updateCorrCell(
        $cells: [JQuery, JQuery, boolean],
        html: HTML
    ): number {
        let cellCount: number = 0;
        if ($cells[0].length) {
            $cells[0].html(html);
            cellCount++;
        }

        // if diagonal, $cells[2] === true
        if ($cells[1].length && !$cells[2]) {
            $cells[1].html(html);
            cellCount++;
        }

        return cellCount;
    }

    private _getCorrCell(row: number, col: number): [JQuery, JQuery, boolean] {
        let colNum: number = row;
        let rowNum = this._aggCols.length - 1 - col;

        let diagColNum: number = col;
        let digaRowNum: number = this._aggCols.length - 1 - row;
        let $corr = this._getCorrSection();
        let $cell = $corr.find('.cell[data-col=' + colNum + ']' +
                                '[data-row=' + rowNum + ']');
        // the diagonal one
        let $cell2 = $corr.find('.cell[data-col=' + diagColNum + ']' +
                                '[data-row=' + digaRowNum + ']');
        let isSameCell = (row === col);
        return [$cell, $cell2, isSameCell];
    }

    private _calcAgg(table: TableMeta, txId: number): XDPromise<void> {
        let promises: XDPromise<number>[] = [];

        let colLen: number = this._aggCols.length;
        let funLen: number = this._aggFunctions.length;
        let total: number = this._getQuickAggSection().find(".cell").length;
        let cellCount: number = 0;
        this._updateRunProgress(cellCount, total, false);
        // First we need to determine if this is a dataset-table
        // or just a regular table
        let dupCols: boolean[] = [];
        for (let col = 0; col < colLen; col++) {
            let aggCol = this._aggCols[col];
            if (this._cachedHorColNums != null &&
                !this._cachedHorColNums.includes(aggCol.colNum)
            ) {
                continue;
            }

            let progCol = aggCol.col;
            if (progCol.isNumberCol()) {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[col]) {
                    continue;
                }

                let dups = this._checkDupCols(col);
                for (let t = 0; t < dups.length; t++) {
                    let dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                }

                for (let row = 0; row < funLen; row++) {
                    let promise = this._runAgg(table, progCol.getBackColName(),
                    this._aggFunctions[row], row, col, dups, txId);
                    promise.then((numDone: number) => {
                        cellCount += numDone;
                        this._updateRunProgress(cellCount, total, false);
                    });
                    promises.push(promise);
                }
            }
        }

        return PromiseHelper.when(...promises);
    }

    private _runAgg(
        table: TableMeta,
        fieldName: string,
        opString: string,
        row: number,
        col: number,
        dups: number[],
        txId: number
    ): XDPromise<number> {
        let tableId = table.getId();
        if (this._aggCache.hasOwnProperty(tableId)) {
            let tableAgg = this._aggCache[tableId];
            if (tableAgg.hasOwnProperty(fieldName)) {
                let colAgg = tableAgg[fieldName];
                var aggRes = colAgg[this._aggOpMap[opString]];
                if (aggRes != null) {
                    this._applyAggResult(row, col, aggRes, dups, null);
                    return PromiseHelper.resolve(dups.length + 1);
                }
            }
        }

        let deferred: XDDeferred<number> = PromiseHelper.deferred();
        let tableName = table.getName();

        XIApi.aggregate(txId, opString, fieldName, tableName)
        .then(({value}) => {
            // cache value
            this._aggCache[tableId] = this._aggCache[tableId] || {};
            let tableAgg = this._aggCache[tableId];
            tableAgg[fieldName] = tableAgg[fieldName] || [];
            let colAgg = tableAgg[fieldName];
            colAgg[this._aggOpMap[opString]] = value;
            // end of cache value

            this._applyAggResult(row, col, value, dups, null);
            deferred.resolve(dups.length + 1);
        })
        .fail((error) => {
            this._applyAggResult(row, col,
            '<span class="dash">--</span>', dups, error.error);
            // still resolve
            deferred.resolve(dups.length + 1);
        });

        return deferred.promise();
    }

    private _applyAggResult(
        row: number,
        col: number,
        value: any,
        dups: number[],
        error: string
    ): void {
        let title: string = (error == null) ? value : error;
        // error case force to have tooltip
        let spanClass: string = (error == null) ?
        "textOverflow tooltipOverflow" : "textOverflow";
        let html =
        '<span class="' + spanClass + '" ' +
        'data-original-title="' + title +
        '" data-toggle="tooltip" data-placement="auto top" ' +
        'data-container="body">' +
            (jQuery.isNumeric(value) ? value.toFixed(3) : value) +
        '</span>';
        this._updateAggCell(row, col, html);

        dups.forEach((colNum) => {
            this._updateAggCell(row, colNum, html);
        });
    }

    private _updateAggCell(row: number, col: number, html: HTML): void {
        let $quickAgg = this._getQuickAggSection();
        let $cell = $quickAgg.find('.cell[data-col=' + col + ']' +
                                   '[data-row=' + row + ']');
        if ($cell.length) {
            $cell.html(html);
        }
    }

    private _highlightLabel(row: number, col: number): void {
        let $corr = this._getCorrSection();
        $corr.find(".rowLabel").eq(row).addClass("active");
        $corr.find(".colLabel:not(.blankSpace)").eq(col).addClass("active");
    }

    private _deHighlightLabel(row: number, col: number): void {
        let $corr = this._getCorrSection();
        $corr.find(".rowLabel").eq(row).removeClass("active");
        $corr.find(".colLabel:not(.blankSpace)").eq(col).removeClass("active");
    }

    private _scrollHelper($container: JQuery, $mainAgg: JQuery): void {
        let scrollTop = $container.scrollTop();
        let scrollLeft = $container.scrollLeft();
        $mainAgg.find(".labelContainer").scrollTop(scrollTop);
        $mainAgg.find(".headerContainer").scrollLeft(scrollLeft);
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });

        $modal.on("click", ".tab", (event) => {
            let mode = $(event.currentTarget).attr("id");
            if (mode === "aggTab") {
                this.quickAgg(this._cachedTableId, this._cachedHorColNums);
            } else {
                this.corrAgg(this._cachedTableId, this._cachedVertColNums,
                this._cachedHorColNums, this._cachedProfileColNum);
            }
        });

        let $quickAgg = this._getQuickAggSection();
        $quickAgg.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });

        $quickAgg.find(".aggContainer").scroll((event) => {
            this._scrollHelper($(event.currentTarget), this._getQuickAggSection());
        });

        let $corr = this._getCorrSection();
        $corr.find(".aggContainer").scroll((event) => {
            this._scrollHelper($(event.currentTarget), this._getCorrSection());
        });

        $corr.on("mouseenter", ".aggTableFlex", (event) => {
            let $cell = $(event.currentTarget);
            this._highlightLabel($cell.data("row"), $cell.data("col"));
        });

        $corr.on("mouseleave", ".aggTableFlex", (event) => {
            let $cell = $(event.currentTarget);
            this._deHighlightLabel($cell.data("row"), $cell.data("col"));
        });

        this._getBackProfileBtn().on("click", (event) => {
            $(event.currentTarget).hide();
            let tableId = this._cachedTableId;
            let colNum = this._cachedProfileColNum;
            let tmp = gMinModeOn;
            gMinModeOn = true;
            this._close();
            Profile.show(tableId, colNum);
            gMinModeOn = tmp;

        });
    }
}
