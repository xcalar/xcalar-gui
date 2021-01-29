class XcDagTableViewer extends XcTableViewer {
    private dataflowTabId: string;
    private dagNode: DagNode;

    public static getTableFromDagNode(dagNode: DagNode): TableMeta {
        const tableName: string = dagNode.getTable();
        // XXX this code should be change after refine the table meta structure
        const tableId: TableId = xcHelper.getTableId(tableName);
        let table: TableMeta = gTables[tableId];
        if (!table || table.getName() !== tableName) {
            // link in node can let user randomaly specify the tableName,
            // so same id doesn't guarantee the same table
            table = new TableMeta({
                tableName: tableName,
                tableId: tableId,
                tableCols: [ColManager.newDATACol()]
            });
            gTables[tableId] = table;
            // clear cached tableId that may cause errors
            Profile.deleteCache(tableId);
        }
        let columns: ProgCol[] = dagNode.getLineage().getColumns(true);
        if (dagNode instanceof DagNodeSet) {
            // special case, hide internal generated columns
            const deltas = dagNode.getColumnDeltas();
            if (deltas.size === 0) {
                let resProgCol: ProgCol = null;
                for (let progCol of columns) {
                    const colName = progCol.getBackColName();
                    if (colName.startsWith("XC_UNION_INDEX")) {
                        resProgCol = progCol;
                        break;
                    }
                }
                if (resProgCol != null) {
                    dagNode.columnChange(DagColumnChangeType.Hide, [resProgCol.getBackColName()], [resProgCol.getType()]);
                    columns = dagNode.getLineage().getColumns(true); // refresh column
                }
            }
        }
        let hiddenColumns: Map<string, ProgCol> = dagNode.getLineage().getHiddenColumns();
        if (columns != null && (columns.length > 0 || hiddenColumns.size)) {
            columns = columns.concat(ColManager.newDATACol());
            table.addAllCols(columns);
        }
        if (hiddenColumns.size) {
            table.addToColTypeCache(hiddenColumns);
        }
        return table;
    }

    public constructor(tabId: string, dagNode: DagNode, table: TableMeta) {
        const tableName: string = table.getName();
        super(table);
        this.dataflowTabId = tabId;
        this.dagNode = dagNode;
        DagTblManager.Instance.resetTable(tableName);
    }

    public getTitle(): string {
        return this.table.getName() + " from " + this.dagNode.getTitle();
    }

    /**
     * Clear Table Preview
     */
    public clear(): XDPromise<void> {
        this._removeTableIconOnDagNode();
        return super.clear();
    }

    /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        this._showTableIconOnDagNode();
        return super.render($container);
    }

    public getDataflowTabId(): string {
        return this.dataflowTabId;
    }

    public getNode(): DagNode {
        return this.dagNode;
    }

    public getNodeId(): DagNodeId {
        return this.dagNode.getId();
    }

    public replace(table: TableMeta): XcDagTableViewer {
        return new XcDagTableViewer(this.dataflowTabId, this.dagNode, table);
    }

    protected _afterBuild(): void {
        super._afterBuild();
        const tableId: TableId = this.table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.removeClass("noOperation fromSQL");
    }

    private _getNodeEl(): JQuery {
        return DagViewManager.Instance.getNode(this.dagNode.getId(), this.dataflowTabId);
    }

    private _showTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length && !$node.find(".tableIcon").length) {
            DagView.addTableIcon($node, "tableIcon", TooltipTStr.ViewingTable);
        }
    }

    private _removeTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length) {
            DagView.removeTableIcon($node, "tableIcon");
        }
    }
}