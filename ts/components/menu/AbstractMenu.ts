abstract class AbstractMenu {
    private menuMap: Map<string, string>;
    private menuId;
    private subMenuId;

    public constructor(
        menuId: string,
        subMenuId: string
    ) {
        this.menuId = menuId;
        this.subMenuId = subMenuId;
        this._setupHotKeys();
        xcMenu.add(this._getMenu(), {
            // hotkeys: this._hotKeyTrigger.bind(this)
        });
        this._addMenuActions();
    }

    protected abstract _getHotKeyEntries(): ReadonlyArray<[string, string]>;
    protected abstract _addMenuActions(): void;

    protected _getMenu(): JQuery {
        return this.menuId ? $("#" + this.menuId) : null;
    }

    protected _getSubMenu(): JQuery {
        return this.subMenuId ? $("#" + this.subMenuId) : null;
    }

    protected _copyToClipboard(
        valArray: string[],
        stringify: boolean = false
    ): void {
        let str: string = "";
        if (stringify) {
            str = JSON.stringify(valArray);
        } else {
            str = valArray.join(", ");
        }

        xcUIHelper.copyToClipboard(str);
        xcUIHelper.showSuccess("Copied.");
    }

    protected _isInvalidTrigger(event: JQueryEventObject): boolean {
        return event.which !== 1 || $(event.currentTarget).hasClass('unavailable');
    }

    protected _isProgressTab(node: DagNode): boolean {
        const tabId = this._getTabId();
        const dagView = DagViewManager.Instance.getDagViewById(tabId);
        if (node.getMaxChildren() === 0 || (dagView && dagView.isProgressGraph())
        ) {
            return true;
        } else {
            return false;
        }
    }

    protected _getCurrentNode(): DagNode {
        const tabId = this._getTabId();
        const dagView = DagViewManager.Instance.getDagViewById(tabId);
        if (dagView != null) {
            const nodeId: DagNodeId = DagTable.Instance.getBindNodeId();
            return dagView.getGraph().getNode(nodeId);
        } else {
            return null;
        }
    }

    protected _addNode(
        type: DagNodeType,
        input: object,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
        configured?: boolean
    ): Promise<DagNode | null> {
        const tabId = this._getTabId();
        DagTabManager.Instance.switchTab(tabId);
        parentNodeId = parentNodeId || DagTable.Instance.getBindNodeId();
        return DagViewManager.Instance.autoAddNode(type,
            subType, parentNodeId, input, {
                configured: configured,
                forceAdd: true
            });
    }

    protected _openOpPanel(node: DagNode, colNames: string[], allNodes: DagNode[]): void {
        const tabId: string = this._getTabId();
        DagNodeMenu.execute("configureNode", {
            node: node,
            autofillColumnNames: colNames,
            exitCallback: function() {
                DagViewManager.Instance.removeNodes(allNodes.map(node=>node.getId()), tabId);
            }
        });
    }

    private _setupHotKeys(): void {
        const entries: ReadonlyArray<[string, string]> = this._getHotKeyEntries();
        if (entries != null) {
            this.menuMap = new Map(entries);
        }
    }

    private _hotKeyTrigger(event: JQueryEventObject, $menu: JQuery): void {
        const key: number = event.which;
        const letter: string = letterCode[key];
        if (event.which === keyCode.Alt) {
            // toggle hot keys
            event.preventDefault();
            if ($menu.hasClass("showingHotKeys")) {
                this._hideHotKeys($menu);
            } else {
                this._showHotKeys($menu);
            }
        }

        if (letter && this.menuMap.has(letter)) {
            const menuAction: string = this.menuMap.get(letter);

            const $li: JQuery = $menu.find("." + menuAction +
                            ":visible:not('.unavailable')").eq(0);
            if (!$li.length) {
                return;
            }
            event.preventDefault();
            if ($li.hasClass("parentMenu")) {
                $li.trigger(fakeEvent.mouseenter);
            } else {
                $li.trigger(fakeEvent.mouseup);
            }
        }
    }

    protected _getTabId(): string {
        let tabId: string = DagTable.Instance.getBindTabId();
        if (tabId == null) {
            // use current tab when no binded tab
            tabId = DagViewManager.Instance.getActiveTab().getId();
        }
        return tabId;
    }

    private _showHotKeys($menu: JQuery): void {
        for (let [letter, menuAction] of this.menuMap) {
            const $labels: JQuery = $menu.find("." + menuAction).find(".label");
            $labels.each(function() {
                const $label: JQuery = $(this);
                if ($label.find(".underline").length) {
                    return true;
                }
                const text: string = $label.text();
                const keyIndex: number = text.toLowerCase().indexOf(letter);
                if (keyIndex === -1) {
                    return true;
                }
                var html = text.slice(0, keyIndex) +
                            '<span class="underline">' + text[keyIndex] +
                            '</span>' + text.slice(keyIndex + 1);
                $label.html(html);
            });
        }
        $menu.addClass("showingHotKeys");
    };

    private _hideHotKeys($menu: JQuery): void {
        for (let menuAction of this.menuMap.values()) {
            const $labels: JQuery = $menu.find("." + menuAction).find(".label");
            $labels.each(function() {
                const $label: JQuery = $(this);
                $label.text($label.text());
            });
        }
        $menu.removeClass("showingHotKeys");
    }

    // being used by column menu to create dataflow nodes
    private _restoreDataflow(sql: string): XDPromise<DagNode[]> {
        try {
            const deferred: XDDeferred<DagNode[]> = PromiseHelper.deferred();
            SQLUtil.getSQLStruct(sql)
            .then((sqlStruct) => {
                try {
                    let executor = new SQLDagExecutor(sqlStruct);
                    return executor.restoreDataflow();
                } catch (e) {
                    return PromiseHelper.reject(e.message);
                }
            })
            .then((dagNodes: DagNode[]) => {
                deferred.resolve(dagNodes);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject(e.message);
        }
    }

    protected async _createFromSQLTable(callback) {
        /*
            check if sql statement exists, if so then we create a dataflow, and copy
            and paste the nodes from this dataflow into the active dataflow in
            the dataflow panel, then we attach a node from whatever operation
            is triggered by the column menu. The callback function then configures
            that node and opens the operation panel or executes
            If sql statement doesn't exist, we just create a published table node
            from the table
        */
        try {
            const $menu: JQuery = this._getMenu();
            const tableId: TableId = $menu.data('tableId');
            const table: TableMeta = gTables[tableId];
            let tableName: string;
            let sqlString: string;
            if (table) {
                tableName = table.getName();
                sqlString = SqlQueryHistory.getInstance().getSQLFromTableName(tableName);
            }

            if (sqlString) {
                this._restoreDataflow(sqlString)
                .then((newNodes) => {
                    if (DagTabManager.Instance.getNumTabs() === 0) {
                        DagTabManager.Instance.newTab();
                    }

                    let parentNodeId;
                    newNodes.forEach((node) => {
                        if (node.getChildren().length === 0) {
                            parentNodeId = node.getId();
                        }
                    });
                    callback.bind(this)(newNodes, parentNodeId);
                })
                .fail((e) => {
                    console.error("error", e);
                    Alert.error(ErrTStr.Error, ErrTStr.Unknown);
                });
            } else {
                // sql string may not exist so we just create a published
                // table node as the start point
                DagTabManager.Instance.newTab();

                const input = {
                    "source": xcHelper.getTableName(tableName),
                    "schema": table.getAllCols(true).map((progCol) => {
                                    return {
                                        name: progCol.getBackColName(),
                                        type: progCol.getType()
                                    }
                            })
                };

                let parentNode = await DagViewManager.Instance.autoAddNode(DagNodeType.IMDTable,
                    null, null, input, {
                        configured: true,
                        forceAdd: true
                });
                if (parentNode) {
                    parentNode.setParam(input, true);
                    callback.bind(this)([parentNode], parentNode.getId());
                } else {
                    Alert.error(ErrTStr.Error, "Module not found");
                }
            }
        }  catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }
}
