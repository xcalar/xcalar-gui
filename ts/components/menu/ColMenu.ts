class ColMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "colMenu";
        const subMenuId: string = "colSubMenu";
        super(menuId, subMenuId);
        this._renderMenuContent();
    }

    /**
     *
     * @param colType
     * @param isNewCol
     */
    public setUnavailableClassesAndTips(
        colType: ColumnType,
        isNewCol: boolean
    ): void {
        const $menu: JQuery = this._getMenu();
        const node: DagNode = DagTable.Instance.getBindNode();
        if (node == null) {
            return;
        }
        let $lis: JQuery = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .map, .operations," +
                ".changeDataType, .format, .roundToFixed, .round," +
                ".project, .set, .splitCol");
        $lis.removeClass("unavailable");
        $lis.removeClass("xc-hidden");
        xcTooltip.remove($lis);
        // hide most menu options if published tab, terminal node, or view only
        if (this._isProgressTab(node) || node.isHidden()) {
            // when it's out node or published tab
            $lis.addClass("xc-hidden");
        }

        if (colType === ColumnType.object || colType === ColumnType.array) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, .join, " +
                ".map, .operations, .profile, .corrAgg, " +
                ".changeDataType, .format, .roundToFixed, .round, .set");
            $lis.addClass("unavailable");
            if (colType === ColumnType.object) {
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateObject
                });
            } else if (colType === ColumnType.array) {
                xcTooltip.add($lis, {
                    title: ColTStr.NoOperateArray
                });
            }
        } else if (isNewCol) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .operations, .profile, .corrAgg, " +
                ".changeDataType, .format, .roundToFixed, .round, .project, .set");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ErrTStr.InvalidOpNewColumn
            });
        } else if (colType === ColumnType.mixed) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                ".join, .operations, .profile, .corrAgg, " +
                ".roundToFixed, .round");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        }  else if (colType === ColumnType.undefined || colType == null) {
            $lis = $menu.find(".groupby, .sort, .aggregate, .filter, " +
                    ".join, .operations, .profile, .corrAgg, " +
                    ".format, .roundToFixed, .round, " +
                    ".project, .set");
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        } else if (![ColumnType.integer, ColumnType.float, ColumnType.string,
            ColumnType.boolean, ColumnType.number, ColumnType.timestamp, ColumnType.money]
                    .includes(colType)
        ) {
            $lis.addClass("unavailable");
            xcTooltip.add($lis, {
                title: ColTStr.NoOperateGeneral
            });
        }

        const $roundLi = $menu.find('.round');
        if (colType === ColumnType.float) {
            $roundLi.removeClass('unavailable');
            xcTooltip.remove($roundLi);
        } else {
            $roundLi.addClass('unavailable');
            xcTooltip.add($roundLi, {
                title: ColTStr.NoOperateGeneral
            });
        }
    }

    protected _getHotKeyEntries(): ReadonlyArray<[string, string]> {
        return [
            ["a", "aggregate"],
            ["c", "corrAgg"],
            ["d", "hideColumn.newColumn"],
            ["f", "filter"],
            ["g", "groupby"],
            ["h", "hideColumn"],
            ["j", "join"],
            ["m", "map"],
            ["p", "profile"],
            ["s", "sort"],
            ["t", "changeDataType"],
            ["x", "exitOp"],
            ["u", "set"],
        ];
    }

    protected _addMenuActions(): void {
        this._addMainMenuActions();
        this._addSubMenuActions();
    }

    private _addMainMenuActions(): void {
        const $colMenu: JQuery = this._getMenu();

        // add new column
        // $colMenu.on('mouseup', '.addColumn', (event) => {
        //     if (this._isInvalidTrigger(event)) {
        //         return;
        //     }
        //     const colNum: number = $colMenu.data('colNum');
        //     const tableId: TableId = $colMenu.data('tableId');
        //     ColManager.addNewCol(colNum, tableId, ColDir.Right);
        // });

        $colMenu.on('mouseup', '.hideColumn', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.hideCol(colNums, tableId);
        });

        $colMenu.on('mouseup', '.minimize', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.minimizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.maximize', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.maximizeCols(colNums, tableId);
        });

        $colMenu.on('mouseup', '.corrAgg', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            AggModal.Instance.corrAgg(tableId, colNums, colNums);
        });

        $colMenu.on('mouseup', '.join', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            this._createNodeAndShowForm(DagNodeType.Join, tableId, colNums);
        });

        $colMenu.on('mouseup', '.functions', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const tableId: TableId = $colMenu.data('tableId');
            const func: string = $li.data('func');
            const colNums: number[] = $colMenu.data("colNums");
            let type: DagNodeType = <DagNodeType>func;
            if (func === "group by") {
                type = DagNodeType.GroupBy;
            } else if (func === "aggregate") {
                type = DagNodeType.Aggregate;
            }
            this._createNodeAndShowForm(type, tableId, colNums);
        });


        $colMenu.on('mouseup', '.splitCol', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            // XXX TODO: suggest smart split delimiter here
            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data("colNums");
            this._createNodeAndShowForm(DagNodeType.Split, tableId, colNums);
        });

        $colMenu.on('mouseup', '.round', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data("colNums");
            this._createNodeAndShowForm(DagNodeType.Round, tableId, colNums);
        });

        $colMenu.on('mouseup', '.profile', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNum: number = $colMenu.data('colNum');
            const tableId: TableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum);
        });

        $colMenu.on('mouseup', '.barChart', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNum: number = $colMenu.data('colNum');
            const tableId: TableId = $colMenu.data('tableId');
            Profile.show(tableId, colNum, true);
        });

        $colMenu.on('mouseup', '.project', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data("colNums");
            this._createNodeAndShowForm(DagNodeType.Project, tableId, colNums);
        });

        $colMenu.on('mouseup', '.exitOp', (event) => {
            if (event.which !== 1) {
                return;
            }
            DagConfigNodeModal.Instance.closeForms();
        });
    }

    private _addSubMenuActions(): void {
        const $colMenu: JQuery = this._getMenu();
        const $subMenu: JQuery = this._getSubMenu();
        $subMenu.on('mouseup', '.changeFormat', (event) => {
            if (event.which !== 1) {
                return;
            }
            const tableId: TableId = $colMenu.data('tableId');
            const format: string = $(event.currentTarget).data("format");
            const formats: string[] = [];
            const colNums: number[] = [];
            const allColNums: number[] = $colMenu.data('colNums');
            const table: TableMeta = gTables[tableId];

            allColNums.forEach((colNum) => {
                const progCol: ProgCol = table.getCol(colNum);
                if (progCol.isNumberCol()) {
                    formats.push(format);
                    colNums.push(colNum);
                }
            });

            ColManager.format(colNums, tableId, formats);
        });

        $subMenu.on('mouseup', 'li.textAlign', (event) => {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.textAlign(colNums, tableId, $li.attr("class"));
        });

        $subMenu.on('mouseup', '.resize', (event) => {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            const colNums: number[] = $colMenu.data('colNums');
            const tableId: TableId = $colMenu.data('tableId');
            let resizeTo: string;

            if ($li.hasClass('sizeToHeader')) {
                resizeTo = 'header';
            } else if ($li.hasClass('sizeToFitAll')) {
                resizeTo = 'all';
            } else {
                resizeTo = 'contents';
            }

            // could be long process so we allow the menu to close first
            setTimeout(() => {
                TblManager.resizeColumns(tableId, resizeTo, colNums);
            }, 0);
        });

        $subMenu.on('mouseup', '.typeList', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const $li: JQuery = $(event.currentTarget);

            // XXX TODO: need to use data or class instead of text in case of language
            const newType: ColumnType = <ColumnType>$li.find(".label").text().toLowerCase();
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            this._createNodeAndShowForm(DagNodeType.Map, tableId, colNums, {
                subType: DagNodeSubType.Cast,
                newType: newType
            });
        });

        // XXX TODO: change to DF 2.0
        $subMenu.on('mouseup', 'li.sort', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingAscending, this._getTabId());
        });

        // XXX TODO: change to DF 2.0
        $subMenu.on('mouseup', 'li.revSort', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            ColManager.sortColumn(colNums, tableId, XcalarOrderingT.XcalarOrderingDescending, this._getTabId());
        });

          // XXX TODO: change to DF 2.0
        $subMenu.on('mouseup', '.sortView', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            const tableId: TableId = $colMenu.data('tableId');
            const colNums: number[] = $colMenu.data("colNums");
            this._createNodeAndShowForm(DagNodeType.Sort, tableId, colNums);
        });

        $subMenu.on('mouseup', '.union, .intersect, .except', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const colNums: number[] = $colMenu.data("colNums");
            const tableId: TableId = $colMenu.data('tableId');
            let subType: DagNodeSubType = DagNodeSubType.Union;
            const $li = $(event.currentTarget);
            if ($li.hasClass("intersect")) {
                subType = DagNodeSubType.Intersect;
            } else if ($li.hasClass("except")) {
                subType = DagNodeSubType.Except;
            }

            this._createNodeAndShowForm(DagNodeType.Set, tableId, colNums, {
                subType: subType
            });
        });
    }

    private async _createNodeAndShowForm(
        type: DagNodeType,
        tableId: TableId,
        colNums: number[],
        options?: {
            subType?: DagNodeSubType
            newType?: ColumnType
        }
    ): Promise<void> {
        const $colMenu: JQuery = this._getMenu();
        const callback = async(newNodes: DagNode[], parentNodeId?: string) => {
            try {
                DagPanel.Instance.toggleDisplay(true);
                options = options || {};
                const table: TableMeta = gTables[tableId];
                const progCols: ProgCol[] = colNums.map((colNum) => table.getCol(colNum));
                const input: object = this._getNodeParam(type, progCols, options);
                const node: DagNode = await this._addNode(type, input, options.subType, parentNodeId);
                if (node != null) {
                    const colNames: string[] = progCols.map(progCol => progCol.getBackColName());
                    this._openOpPanel(node, colNames, newNodes.concat(node));
                }
            } catch (e) {
                console.error("error", e);
                Alert.error(ErrTStr.Error, ErrTStr.Unknown);
            }
        }
        if ($colMenu.hasClass("fromSQL")) {
            this._createFromSQLTable(callback);
        } else {
            callback([]);
        }
    }

    private _getNodeParam(
        type: DagNodeType,
        progCols: ProgCol[],
        options: any
    ): object {
        const columns: string [] = progCols.map(progCol => {
            return progCol.getBackColName()
        });
        switch (type) {
            case DagNodeType.Aggregate:
            case DagNodeType.Filter:
                return null;
            case DagNodeType.Map:
                if (options.subType === DagNodeSubType.Cast) {
                    return this._getCastParam(progCols, options.newType);
                }
                return null;
            case DagNodeType.Split:
                return {
                    eval: [{ evalString: `cut(${columns[0]},1,"")`, newField: "" }],
                    icv: false
                };
            case DagNodeType.GroupBy:
                return {
                    groupBy: columns
                }
            case DagNodeType.Project:
                return {
                    columns: columns
                };
            case DagNodeType.Round:
                return {
                    eval: [{
                        evalString: `round(${columns[0]},0)`,
                        newField: xcHelper.parsePrefixColName(columns[0]).name
                    }],
                    icv: false
                };
            case DagNodeType.Sort:
                return this._getSortParam(columns);
            case DagNodeType.Join:
                return this._getJoinParam(columns);
            case DagNodeType.Set:
                return this._getSetParam(progCols);
            default:
                throw new Error("Unsupported type!");
        }
    }

    private _getCastParam(progCols: ProgCol[], newType: ColumnType): object {
        const basicColTypes: ColumnType[] = BaseOpPanel.getBasicColTypes(true);
        const evals: {evalString: string, newField: string}[] = [];
        progCols.forEach((progCol) => {
            const colType: ColumnType = progCol.getType();
            // when pulled out unnested column, the type is null
            if (colType == null || basicColTypes.includes(colType)) {
                const colName: string = progCol.getBackColName();
                const mapStr = xcHelper.castStrHelper(colName, newType);
                const newColName = xcHelper.parsePrefixColName(colName).name;
                evals.push({
                    evalString: mapStr,
                    newField: newColName
                });
            }
        });
        return {
            eval: evals,
            icv: false
        };
    }

    private _getJoinParam(columns: string[]): object {
       return {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: columns,
                casts: [],
                rename: []
            },
            right: {
                columns: [],
                casts: [],
                rename: []
            }
        };
    }

    private _getSortParam(columns: string[]): object {
        return {
            columns: columns.map((colName) => {
                return {
                    columnName: colName,
                    ordering: XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]
                }
            })
        }
    }

    private _getSetParam(progCols: ProgCol[]): object {
        const basicColTypes: ColumnType[] = BaseOpPanel.getBasicColTypes(true);
        const sourColumns = [];
        progCols.forEach((progCol) => {
            const colType: ColumnType = progCol.getType();
            if (basicColTypes.includes(colType)) {
                const colName: string = progCol.getBackColName();
                const parsedName: string = xcHelper.parsePrefixColName(colName).name;
                sourColumns.push({
                    sourceColumn: colName,
                    destColumn: parsedName,
                    columnType: colType
                });
            }
        });
        return {
            columns: [sourColumns],
            dedup: false
        };
    }

    private _renderMenuContent(): void {
        let types: ColumnType[] = BaseOpPanel.getBasicColTypes();
        types.sort();
        let html: HTML = types.map((type) => {
            let li: HTML =
            '<li class="flexContainer flexRow typeList type-' + type + '">' +
                '<div class="flexWrap flex-left">' +
                    '<span class="type icon"></span>' +
                '</div>' +
                '<div class="flexWrap flex-right">' +
                    '<span class="label">' +
                        xcStringHelper.capitalize(type) +
                    '</span>' +
                '</div>' +
                '<i class="icon xi-tick fa-11 blue"></i>' +
            '</li>';
            return li;
        }).join("");

        this._getSubMenu().find(".changeDataType").html(html);
    }
}