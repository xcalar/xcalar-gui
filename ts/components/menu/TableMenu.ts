class TableMenu extends AbstractMenu {
    public constructor() {
        const menuId: string = "tableMenu";
        const subMenuId: string = "tableSubMenu";
        super(menuId, subMenuId);
    }

    public setUnavailableClasses(isSqlTable: boolean): void {
        try {
            const $menu: JQuery = this._getMenu();
            $menu.find("li").removeClass('xc-hidden');
            if (isSqlTable) {
                $menu.find(".exportTable, .saveTable").addClass("xc-hidden");
                return;
            } else {
                $menu.find(".exportTableFromSQL, .saveTableFromSQL").addClass("xc-hidden");
            }
            const node: DagNode = DagTable.Instance.getBindNode();
            let $lis: JQuery = $menu.find(".exportTable, .multiCast, .advancedOptions");
            if (node == null || this._isProgressTab(node) || node.isHidden()) {
                // when it's progress tab or it's dest node
                $lis.addClass("xc-hidden");
            } else {
                $lis.removeClass("xc-hidden");
            }
            if (node != null) {
                this._toggleTableMenuOptions(node);
            }
        } catch (e) {
            console.error(e);
        }
    }

    protected _getHotKeyEntries(): ReadonlyArray<[string, string]> {
        return [
            ["a", "advancedOptions"],
            ["b", "createDf"],
            ["c", "corrAgg"],
            ["d", "deleteTable"],
            ["e", "exportTable"],
            ["s", "multiCast"],
            ["x", "exitOp"],
        ];
    }

    protected _addMenuActions(): void {
        this._addMainMenuActions();
        this._addSubMenuActions();
    }

    private _toggleTableMenuOptions(node: DagNode): void {
        const $menu: JQuery = this._getSubMenu();
        // handle icv
        const $genIcvLi: JQuery = $menu.find(".generateIcv");
        const nodeType: DagNodeType = node.getType();
        if (nodeType === DagNodeType.Map && node.getSubType() == null ||
            nodeType === DagNodeType.GroupBy
        ) {
            let icv: boolean = node.getParam().icv;
            if (icv) {
                xcUIHelper.disableMenuItem($genIcvLi, {
                    title: TooltipTStr.AlreadyIcv
                });
            } else {
                xcUIHelper.enableMenuItem($genIcvLi);
            }
        } else {
            xcUIHelper.disableMenuItem($genIcvLi, {
                title: TooltipTStr.IcvRestriction
            });
        }

        // handle complement
        const $complimentLi: JQuery = $menu.find(".complementTable");
        if (node.getType() === DagNodeType.Filter) {
            xcUIHelper.enableMenuItem($complimentLi);
        } else {
            xcUIHelper.disableMenuItem($complimentLi, {
                title: TooltipTStr.ComplementRestriction
            });
        }
    }

    private _addMainMenuActions(): void {
        const $tableMenu: JQuery = this._getMenu();

        $tableMenu.on('mouseup', '.deleteTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const tableName: string = gTables[tableId].getName();
            // TblManager.sendTablesToTrash(tableId, TableType.Active);

            const msg: string = xcStringHelper.replaceMsg(ResultSetTStr.DelMsgReplace, {"name": tableName});
            Alert.show({
                "title": ResultSetTStr.Del,
                "msg": msg,
                "onConfirm": () => {
                    TblManager.deleteTables([tableId], TableType.Active, false, false)
                    .then(() => {
                        MemoryAlert.Instance.check(true);
                    });
                }
            });
        });

        $tableMenu.on('mouseup', '.exportTable', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            this._createNodeAndShowForm(DagNodeType.Export);
        });

        $tableMenu.on('mouseup', '.exitOp', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            DagConfigNodeModal.Instance.closeForms();
        });

        $tableMenu.on('mouseup', '.copyTableName', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            const valArray: string[] = [];
            try {
                valArray.push(gTables[tableId].getName());
            } catch (e) {
                console.error(e);
            }

            this._copyToClipboard(valArray);
        });

        $tableMenu.on('mouseup', '.copyColNames', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            let getAllColNames = (tableId): string[] => {
                const colNames: string[] = [];
                gTables[tableId].tableCols.forEach((progCol: ProgCol) => {
                    if (!progCol.isDATACol()) {
                        colNames.push(progCol.getFrontColName(false));
                    }
                });
                return colNames;
            };

            const tableId: TableId = $tableMenu.data('tableId');
            let allColNames: string[] = [];
            try {
                allColNames = getAllColNames(tableId);
            } catch(e) {
                console.error(e);
            }

            this._copyToClipboard(allColNames, true);
        });

        $tableMenu.on('mouseup', '.multiCast', async (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            if ($tableMenu.hasClass("fromSQL")) {
                this._createFromSQLTable((newNodes, parentNodeId) => {
                    this._createNodeAndShowForm(DagNodeType.Map, tableId, {
                        subType: DagNodeSubType.Cast,
                        parentNodeId: parentNodeId
                    });
                });
            } else {
                this._createNodeAndShowForm(DagNodeType.Map, tableId, {
                    subType: DagNodeSubType.Cast
                });
            }
        });

        $tableMenu.on('mouseup', '.corrAgg', (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            AggModal.Instance.corrAgg(tableId);
        });

        $tableMenu.on("mouseup", ".exportTableFromSQL", (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }
            let tableName = SQLResultSpace.Instance.getSQLTable().getTable();
            try {
                if (tableName == null) {
                    return;
                }
                let tableId = xcHelper.getTableId(tableName);
                let table = gTables[tableId];
                if (table == null) {
                    return;
                }
                let progCols = table.getAllCols().filter((progCol) => {
                    return !progCol.isDATACol();
                });
                ExportSQLTableModal.Instance.show(tableName, progCols);
            }
            catch (e) {
                console.error(e);
            }
        });

        $tableMenu.on("mouseup", ".saveTableFromSQL, .saveTable", (event) => {
            if (this._isInvalidTrigger(event)) {
                return;
            }

            try {
                let tableName = SQLResultSpace.Instance.getSQLTable().getTable();
                if (!tableName) {
                    const tableId: TableId = $tableMenu.data('tableId');
                    tableName = gTables[tableId].getName();
                }

                if (tableName == null) {
                    return;
                }
                let tableId = xcHelper.getTableId(tableName);
                let table = gTables[tableId];
                if (table == null) {
                    return;
                }
                let progCols = table.getAllCols().filter((progCol) => {
                    return !progCol.isDATACol();
                });
                CreatePublishTableModal.Instance.show(tableName, progCols);
            }
            catch (e) {
                console.error(e);
            }
        });
    }

    private _addSubMenuActions(): void {
        const $tableMenu: JQuery = this._getMenu();
        const $subMenu: JQuery = this._getSubMenu();

       new MenuHelper($subMenu.find(".dropDownList"), {
            onSelect: ($li) => {
                const $input: JQuery = $li.closest(".dropDownList").find(".wsName");
                $input.val($li.text()).focus();
            }
        }).setupListeners();

        $subMenu.on("mouseup", ".sortByName li", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._sortHelper(ColumnSortType.name, $(event.currentTarget));
        });

        $subMenu.on("mouseup", ".sortByType li", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._sortHelper(ColumnSortType.type, $(event.currentTarget));
        });

        $subMenu.on('mouseup', '.resizeCols li', (event) => {
            if (event.which !== 1) {
                return;
            }

            const $li: JQuery = $(event.currentTarget);
            const tableId: TableId = $tableMenu.data('tableId');
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
                TblManager.resizeColumns(tableId, resizeTo);
            }, 0);
        });

        $subMenu.find(".generateIcv").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const currentNode: DagNode = this._getCurrentNode();
            if (currentNode != null) {
                const input = xcHelper.deepCopy(currentNode.getParam());
                input.icv = true;
                const parents = currentNode.getParents();
                if (parents.length > 0) {
                    this._createNodeAndShowForm(currentNode.getType(), null, {
                        input: input,
                        parentNodeId: parents[0].getId()
                    });
                }
            }
        });

        $subMenu.find(".complementTable").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const currentNode: DagNode = this._getCurrentNode();
            if (currentNode != null && currentNode instanceof DagNodeFilter) {
                const param: DagNodeFilterInputStruct = currentNode.getParam();
                const input = xcHelper.deepCopy(param);
                let evalString = param.evalString;
                // remove or add not() for complement
                if (evalString.indexOf("not(") === 0 &&
                    evalString[evalString.length - 1] === ")"
                ) {
                    evalString = evalString.slice(4, -1);
                } else {
                    evalString = "not(" + evalString + ")";
                }
                input.evalString = evalString;

                const parents = currentNode.getParents();
                if (parents.length > 0) {
                    this._createNodeAndShowForm(DagNodeType.Filter, null, {
                        input: input,
                        parentNodeId: parents[0].getId()
                    });
                }
            }
        });

        $subMenu.find(".skewDetails").mouseup((event) => {
            if (this._isInvalidTrigger(<JQueryEventObject>event)) {
                return;
            }
            const tableId: TableId = $tableMenu.data('tableId');
            SkewInfoModal.Instance.show(gTables[tableId]);
        });
    }

    private _sortHelper(sortKey: ColumnSortType, $li: JQuery): void {
        let direction: string;
        if ($li.hasClass("sortForward")) {
            direction = "forward";
        } else {
            direction = "reverse";
        }
        const tableId: TableId = this._getMenu().data("tableId");
        // could be long process so we allow the menu to close first
        setTimeout(() => {
            TblManager.sortColumns(tableId, sortKey, direction);
        }, 0);
    }

    private async _createNodeAndShowForm(
        type: DagNodeType,
        tableId?: TableId,
        options?: {
            subType?: DagNodeSubType
            input?: object,
            parentNodeId?: DagNodeId
        }
    ): Promise<void> {
        DagPanel.Instance.toggleDisplay(true);
        try {
            options = options || {};
            const input: object = options.input || this._getNodeParam(type, tableId, options);
            const node: DagNode = await this._addNode(type, input, options.subType, options.parentNodeId);
            if (node != null) {
                this._openOpPanel(node, [], [node]);
            }
        } catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }

    private _getNodeParam(
        type: DagNodeType,
        tableId: TableId,
        options: {
            subType?: DagNodeSubType
        }
    ): object {
        switch (type) {
            case DagNodeType.Export:
                return null;
            case DagNodeType.Map:
                if (options.subType === DagNodeSubType.Cast) {
                    return {
                        eval: this._smartSuggestTypes(tableId),
                        icv: false
                    };
                } else {
                    return null;
                }
            default:
                throw new Error("Unsupported type!");
        }
    }

    private _smartSuggestTypes(tableId: TableId): {
        evalString: string, newField: string
    }[] {
        try {
            const evals: {evalString: string, newField: string}[] = [];
            const $table: JQuery = $("#xcTable-" + tableId);
            const $tbody: JQuery = $table.find("tbody").clone(true);
            $tbody.find("tr:gt(17)").remove();
            $tbody.find(".col0").remove();
            $tbody.find(".jsonElement").remove();

            const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
            gTables[tableId].tableCols.forEach((progCol: ProgCol, index) => {
                const colType: ColumnType = progCol.getType();
                if (validTypes.includes(colType)) {
                    const colNum: number = index + 1;
                    const newType: ColumnType = this._suggestColType($tbody, colNum, colType);
                    if (colType !== newType) {
                        const colName: string = progCol.getBackColName();
                        const mapStr: string = xcHelper.castStrHelper(colName, newType);
                        const newColName = xcHelper.parsePrefixColName(colName).name;
                        evals.push({
                            evalString: mapStr,
                            newField: newColName
                        });
                    }
                }
            });

            return evals;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    private _suggestColType(
        $tbody: JQuery,
        colNum: number,
        origginalType: ColumnType
    ): ColumnType {
        if (origginalType === ColumnType.float ||
            origginalType === ColumnType.boolean ||
            origginalType === ColumnType.mixed
        ) {
            return origginalType;
        }

        const $tds: JQuery = $tbody.find("td.col" + colNum);
        const datas: string[] = [];

        $tds.each(function() {
            const val: string = $(this).find('.originalData').text();
            datas.push(val);
        });
        return xcSuggest.suggestType(datas, origginalType);
    }
}