class DagNodeSQLSubInput extends DagNode {
    private _container: DagNodeSQL;

    public constructor(options?: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.SQLSubInput;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xea5e;";
    }

    /**
     * Set the container node, which the input belongs to
     * @param dagNode
     */
    public setContainer(dagNode: DagNodeSQL) {
        this._container = dagNode;
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     * @description
     * The input node doesn't change any columns, and is only a bridge between sub graph and parents
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        if (this._container == null) {
            return { columns: [], changes: [] };
        }
        const inputParent = this._container.getInputParent(this);
        if (inputParent == null || inputParent.getLineage() == null) {
            return { columns: [], changes: [] };
        }
        return {
            columns: inputParent.getLineage().getColumns(),
            changes: []
        };
    }

    public getHiddenColumns() {
        if (this._container == null) {
            return new Map();
        }
        const inputParent = this._container.getInputParent(this);
        if (inputParent == null || inputParent.getLineage() == null) {
            return new Map();
        }
        return new Map(inputParent.getLineage().getHiddenColumns());
    }

    /**
     * Get input node's name for display
     */
    public getPortName(inheritName?: boolean): string {
        if (this._container == null) {
            return 'Input';
        }
        if (inheritName) {
            return this.getInputParent().getDisplayNodeType();
        } else {
            return `Input#${this._container.getInputIndex(this) + 1}`;
        }
    }

    /**
     * Return a short hint of the param, it should be one line long
     */
    public getParamHint(inheritHint?: boolean): {hint: string, fullHint: string} {
        if (inheritHint && this._container != null) {
            return this.getInputParent().getParamHint();
        }
        let hint: string = "";
        let ellipsis: string[] = [];
        try {
            hint = this._genParamHint();
            const maxLen: number = 20;
            // each line cannot be more than maxLen
            ellipsis = hint.split("\n").map((str) => {
                if (str.length > maxLen) {
                    str = str.substring(0, maxLen) + "...";
                }
                return str;
            });
        } catch (e) {
            console.error(e);
        }
        return {
            hint: ellipsis.join("\n"),
            fullHint: hint
        };
    }

    public getInputParent(): DagNode {
        if (this._container) {
            return this._container.getInputParent(this);
        } else {
            return null;
        }
    }

    /**
     * @override
     * Get input parent's table
     * @returns {Table} return id of the table of input parent
     */
    public getTable(): string {
        if (this._container == null) {
            console.error('DagNodeSubGraphInput.getTable: No container');
            return null;
        }
        const inputParent =  this._container.getInputParent(this);
        if (inputParent == null) {
            return null;
        }
        return inputParent.getTable();
    }

    /**
     * @override
     * Get input parent's state
     * @returns {DagNodeState} the state of input parent
     */
    public getState(): DagNodeState {
        if (this._container == null) {
            console.error('DagNodeSubGraphInput.getState: No container');
            return DagNodeState.Unused;
        }
        const inputParent =  this._container.getInputParent(this);
        if (inputParent == null) {
            return DagNodeState.Unused;
        }
        return inputParent.getState();
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQLSubInput = DagNodeSQLSubInput;
};
