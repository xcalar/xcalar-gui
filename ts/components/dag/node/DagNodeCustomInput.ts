class DagNodeCustomInput extends DagNode {
    private _container: DagNodeCustom;

    public constructor(options?: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.CustomInput;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xea5e;";
    }

    /**
     * Set the custom node, which the input belongs to
     * @param dagNode
     */
    public setContainer(dagNode: DagNodeCustom) {
        this._container = dagNode;
    }

    public getContainer(): DagNodeCustom {
        return this._container;
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     * @description
     * The input node doesn't change any columns, and is only a bridge between custom operator's sub graph and parents
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        const inputParent = this._container.getInputParent(this);
        if (inputParent == null || inputParent.getLineage() == null) {
            return { columns: [], changes: [] };
        }
        return {
            columns: inputParent.getLineage().getColumns(),
            changes: []
        };
    }

    /**
     * Get input node's name for display
     */
    public getPortName(_inheritName?: boolean): string {
        if (this._container == null) {
            return 'Input';
        }
        return `Input#${this._container.getInputIndex(this) + 1}`;
    }

    /**
     * @override
     * No configuration needed
     */
    public isConfigured(): boolean {
        return true;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return this.getPortName();
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    protected _removeTable(): void {
        if (this.table) {
            let tableName: string = this.table;
            delete this.table;
            this.events.trigger(DagNodeEvents.TableRemove, {
                table: tableName,
                nodeId: this.getId(),
                node: this
            });

        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeCustomInput = DagNodeCustomInput;
};
