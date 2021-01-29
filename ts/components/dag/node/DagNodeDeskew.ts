class DagNodeDeskew extends DagNode {
    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.minParents = 1;
        this.input = this.getRuntime().accessible(new DagNodeDeskewInput(options.input));
        this.display.icon = "&#xea6e;";
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

    public setParam(
        input: DagNodeDeskewInputStruct = <DagNodeDeskewInputStruct>{},
        noAutoExecute?: boolean
    ) {
        this.input.setInput({
            column: input.column,
            newKey: input.newKey,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const allCols: ProgCol[] = [];
        const input: DagNodeDeskewInputStruct = this.input.getInput(replaceParameters);
        const newKey: string = this.updateNewKey(input.newKey);
        const column: string = input.column;

        columns.forEach((progCol) => {
            if (progCol.getBackColName() === column && column !== newKey) {
                // a rename occurred during the sort
                const colType: ColumnType = progCol.getType();
                const newCol: ProgCol = ColManager.newPullCol(newKey, newKey, colType);
                allCols.push(newCol);
                changes.push({
                    from: progCol,
                    to: newCol
                });
            } else {
                allCols.push(progCol);
            }
        });

        return {
            columns: allCols,
            changes: changes
        };
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "De-skew";
    }

    public applyColumnMapping(renameMap): void {
        let newRenameMap = xcHelper.deepCopy(renameMap);
        try {
            let input: DagNodeDeskewInputStruct = this.input.getInput();
            let column = input.column;
            if (renameMap.columns[column]) {
                let newColumn = renameMap.columns[column];
                this.input.setInput({
                    column: newColumn,
                    newKey: input.newKey
                });
                delete newRenameMap.columns[column];
            }
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
        return newRenameMap;
    }

    public updateNewKey(key: string): string {
        if (key) {
            return key; // if user manually specify the key
        }
        const input: DagNodeDeskewInputStruct = this.input.getInput();
        const parsedCol: PrefixColInfo = xcHelper.parsePrefixColName(input.column);
        if (parsedCol.prefix) {
            // prefix
            return xcHelper.stripColName(parsedCol.name, false);
        } else  {
            // immediate
            return parsedCol.name;
        }
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDeskewInputStruct = this.getParam();
        if (input.column && input.column.length) {
            hint = `Index on: ${input.column}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        const column: string = this.input.getInput().column;
        if (column) {
            set.add(column);
        }
        return set;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDeskew = DagNodeDeskew;
};
