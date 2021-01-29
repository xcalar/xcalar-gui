class DagNodeJupyter extends DagNodeOut {
    protected input: DagNodeJupyterInput;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Jupyter;
        this.maxParents = 1;
        this.display.icon = "&#xe955;";
        this.input = this.getRuntime().accessible(new DagNodeJupyterInput(<DagNodeJupyterInputStruct>options.input));
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    public setParam(input: DagNodeJupyterInputStruct = <DagNodeJupyterInputStruct>{}) {
        this.input.setInput({
            numExportRows: input.numExportRows,
            renames: input.renames.map((v) => ({
                sourceColumn: v.sourceColumn,
                destColumn: v.destColumn
            }))
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[], replaceParameters?: boolean
    ): DagLineageChange {
        const sourceColumnMap: Map<string, ProgCol> = new Map();
        for (const col of columns) {
            sourceColumnMap.set(col.getBackColName(), col);
        }

        const params = this.input.getInput(replaceParameters);
        const resultColumns: ProgCol[] = [];
        const changes: { from: ProgCol, to: ProgCol }[] = [];
        for (const { sourceColumn, destColumn } of params.renames) {
            const sourceCol = sourceColumnMap.get(sourceColumn);
            const destCol = ColManager.newPullCol(
                destColumn, destColumn, sourceCol.getType()
            );
            resultColumns.push(destCol);
            changes.push({
                from: sourceCol, to: destCol
            });
        }
        return {
            columns: resultColumns,
            changes: changes
        };
    }

    /**
     * Append code stub to current/new Jupyter notebook, and bring up the JupyterPanel
     * @description The resultant table must be generated before calling this method
     */
    public showJupyterNotebook(): void {
        const tableName = this.getTable();
        if (tableName == null || tableName.length === 0) {
            return;
        }
        // XXX TODO: temp fix, should be removed
        this.checkGlobalTable(<string>xcHelper.getTableId(tableName));

        const params: DagNodeJupyterInputStruct = this.getParam();
        JupyterPanel.publishTable(tableName, params.numExportRows);
    }

    /**
     * Should be removed after decoupling jupyterPanel with gTables
     */
    protected checkGlobalTable(tableId: string): void {
        if (gTables[tableId] == null) {
            // Rebuild TableMeta and put it in gTables
            XcDagTableViewer.getTableFromDagNode(this);
        }
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeJupyterInputStruct = this.getParam();
        if (input.renames.length) {
            const columns: string[] = input.renames.map((col) => col.sourceColumn);
            hint = `Columns: ${columns.join(",")}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeJupyter = DagNodeJupyter;
};
