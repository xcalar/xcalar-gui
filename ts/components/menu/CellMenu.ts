class CellMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "cellMenu";
        super(menuId, null);
    }

    public filter(evalString): Promise<void> {
        return this._createNodeAndShowForm(evalString);
    }

    protected _getHotKeyEntries(): ReadonlyArray<[string, string]> {
        return [
            ["c", "tdCopy"],
            ["e", "tdJsonModal"],
            ["f", "tdFilter"],
            ["p", "tdUnnest"],
            ["x", "tdExclude"]
        ];
    }

    protected _addMenuActions(): void {
        const $cellMenu: JQuery = this._getMenu();
        $cellMenu.on('mouseup', '.tdFilter, .tdExclude', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const op: FltOp = $(event.currentTarget).hasClass("tdFilter") ?
            FltOp.Filter : FltOp.Exclude;
            const colNum: number = $cellMenu.data('colNum');
            const tableId: TableId = $cellMenu.data('tableId');
            this._tdFilter(colNum, tableId, op);
        });

        $cellMenu.on('mouseup', '.tdJsonModal', (event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $cellMenu.data('tableId');
            const rowNum: number = $cellMenu.data('rowNum');
            const colNum: number = $cellMenu.data('colNum');
            const isTruncated: boolean = $cellMenu.data('istruncatedtext');
            this._openTdJSONModal(rowNum, colNum, tableId, isTruncated);
        });

        $cellMenu.on('mouseup', '.tdUnnest', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const tableId: TableId = $cellMenu.data('tableId');
            const rowNum: number = $cellMenu.data('rowNum');
            const colNum: number = $cellMenu.data('colNum');

            TblManager.unHighlightCells();
            setTimeout(() => {
                ColManager.unnest(tableId, colNum, rowNum);
            }, 0);
        });

        $cellMenu.on('mouseup', '.tdCopy', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $cellMenu.data('tableId');
            this._tdCopy(tableId);
        });
    }

    private _tdFilter(colNum: number, tableId: TableId, op: FltOp): void {
        const $table: JQuery = $("#xcTable-" + tableId);
        const $header: JQuery = $table.find("th.col" + colNum + " .header");
        const colName: string = gTables[tableId].getCol(colNum).getBackColName();

        let notValid: boolean = false;
        let isExist: boolean = false;
        let isNull: boolean = false;
        const uniqueVals: object = {};
        const cells = gTables[tableId].highlightedCells;

        for (let row in cells) {
            const cellInfo = cells[row][colNum];
            if (cellInfo.isUndefined) {
                isExist = true;
                continue;
            }
            if (cellInfo.isNull) {
                isNull = true;
                continue;
            }
            let colVal: any = cellInfo.val;

            if ($header.hasClass("type-" + ColumnType.integer)) {
                if (colVal == null || colVal === "") {
                    isExist = true;
                    continue; // continue to next iteration
                }
                colVal = parseInt(colVal);
            } else if ($header.hasClass("type-" + ColumnType.float)) {
                if (colVal == null || colVal === "") {
                    isExist = true;
                    continue; // continue to next iteration
                }
                colVal = parseFloat(colVal);
            } else if ($header.hasClass("type-" + ColumnType.string)) {
                // XXX for string, text is more reliable
                // since data-val might be messed up
                colVal = JSON.stringify(colVal);
            } else if ($header.hasClass("type-" + ColumnType.boolean)) {
                if (colVal === "true") {
                    colVal = true;
                } else {
                    colVal = false;
                }
            } else if ($header.hasClass("type-" + ColumnType.timestamp)) {
                colVal = ColumnType.timestamp + "(" + JSON.stringify(colVal) + ")";
            } else if ($header.hasClass("type-" + ColumnType.money)) {
                colVal = ColumnType.money + "(" + JSON.stringify(colVal) + ")";
            } else if ($header.hasClass("type-" + ColumnType.mixed)) {
                const type: ColumnType = cellInfo.type;
                if (type === ColumnType.string) {
                    colVal = JSON.stringify(colVal);
                } else if (type === ColumnType.integer ||
                    type === ColumnType.float) {
                    colVal = parseFloat(colVal);
                } else if (type === ColumnType.boolean) {
                    if (colVal === "true") {
                        colVal = true;
                    } else {
                        colVal = false;
                    }
                } else {
                    // should not be filtering anything else in mixed col
                    notValid = true;
                    break;
                }
            } else {
                notValid = true;
                break;
            }

            uniqueVals[colVal] = true;
        }

        if (!notValid) {
            const options: xcHelper.FilterOption = xcHelper.getFilterOptions(op, colName,
                uniqueVals, isExist, isNull);

            if (options != null) {
                this._createNodeAndShowForm(options.filterString);
            }
        }

        TblManager.unHighlightCells();
    }

    private async _createNodeAndShowForm(evalString: string): Promise<void> {
        const $menu: JQuery = this._getMenu();
        if ($menu.hasClass("fromSQL")) {
            this._createFromSQLTable(callback);
        } else {
            callback.bind(this)();
        }
        async function callback(_allNodes?: DagNode[], parentNodeId?: string) {
            try {
                const type: DagNodeType = DagNodeType.Filter;
                const input: DagNodeFilterInputStruct = {
                    evalString: evalString
                };
                const node: DagNodeFilter = <DagNodeFilter>await this._addNode(type, input, undefined, parentNodeId, true);
                if (node != null) {
                    DagViewManager.Instance.run([node.getId()], false)
                    .then(() => {
                        if (!UserSettings.Instance.getPref("dfAutoPreview")) {
                            DagViewManager.Instance.viewResult(node);
                        }
                    });
                }
            } catch (e) {
                console.error("error", e);
                Alert.error(ErrTStr.Error, ErrTStr.Unknown);
            }
        }
    }

    private _openTdJSONModal(
        rowNum: number,
        colNum: number,
        tableId: TableId,
        isTruncated: boolean
    ): void {
        const $table: JQuery = $("#xcTable-" + tableId);
        const $td: JQuery = $table.find(".row" + rowNum + " .col" + colNum);
        let colType: ColumnType = gTables[tableId].getCol(colNum).getType();
        if (isTruncated) {
            // if showing modal due to truncated text, treat it as a string
            colType = ColumnType.string;
        }
        TblManager.unHighlightCells();
        JSONModal.Instance.show($td, {type: colType});
    }

    private _tdCopy(tableId: TableId) {
        let cells: any[] = [];
        const table: TableMeta = gTables[tableId];
        for (let row in table.highlightedCells) {
            for (let col in table.highlightedCells[row]) {
                const cellInfo = table.highlightedCells[row][col];
                cells.push(cellInfo);
            }
        }

        cells = this._sortHighlightCells(cells);

        const valArray: string[] = cells.map((cell) => cell.val);
        this._copyToClipboard(valArray)
        TblManager.unHighlightCells();
    }

    private _sortHighlightCells(
        cells: {colNum: number, rowNum: number}[]
    ):  {colNum: number, rowNum: number}[] {
        cells.sort(function(a, b) {
            // first sort by colNum, then sort by rowNum if in same col
            let res: number = a.colNum - b.colNum;
            if (res === 0) {
                res = a.rowNum - b.rowNum;
            }
            return res;
        });

        return cells;
    }
}