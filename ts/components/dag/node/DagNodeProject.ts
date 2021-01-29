class DagNodeProject extends DagNode {
    protected input: DagNodeProjectInput;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Project;
        this.minParents = 1;
        this.display.icon = "&#xe9d7;";
        this.input = this.getRuntime().accessible(new DagNodeProjectInput(options.input));
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

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Projection";
    }

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInputStruct}
     * @param input.columns {string[]} An array of column names to project
     */
    public setParam(input: DagNodeProjectInputStruct = <DagNodeProjectInputStruct>{}, noAutoExecute?: boolean) {
        this.input.setInput({
            columns: input.columns,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(
        sourceColumns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const finalCols: ProgCol[] = [];
        const prefixSet: Set<string> = new Set();
        const derivedSet: Set<string> = new Set();
        const sourceColumnsMap: Map<string, ProgCol> = new Map();

        if (sourceColumns != null) {
            sourceColumns.forEach((progCol) => {
                const colName: string = progCol.getBackColName();
                sourceColumnsMap.set(colName, progCol);
            });
        }

        this.input.getInput(replaceParameters).columns.forEach((colName) => {
            if (sourceColumnsMap.has(colName)) {
                finalCols.push(sourceColumnsMap.get(colName));
            }
            sourceColumnsMap.delete(colName);
            derivedSet.add(colName);
        });

        sourceColumnsMap.forEach((progCol) => {
            changes.push({
                from: progCol,
                to: null
            });
        });

        let hiddenColumns = this.lineage.getHiddenColumns();
        hiddenColumns.forEach((progCol, colName) => {
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            const keep: boolean = parsed.prefix ?
                        prefixSet.has(parsed.prefix) : derivedSet.has(colName);
            if (!keep) {
                hiddenColumns.delete(colName);
                changes.push({
                    from: progCol,
                    to: null,
                    hidden: true
                });
            }
        });

        return {
            columns: finalCols,
            changes: changes
        }
    }

    public applyColumnMapping(renameMap): void {
        const input = this.input.getInput();
        try {
            input.columns.forEach((columnName, i) => {
                if (renameMap.columns[columnName]) {
                    input.columns[i] = renameMap.columns[columnName];
                }
            });
            this.input.setColumns(input.columns);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeProjectInputStruct = this.getParam();
        const len: number = input.columns.length;
        if (len) {
            hint = "Keep ";
            hint += " " + len + " ";
            hint += (len > 1) ? "Columns" : "Column";
        }
        return hint;
    }

    // not doing any check here because specify some non-existing columns
    // here does't really affect anything
    protected _getColumnsUsedInInput(): Set<string> {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeProject = DagNodeProject;
};
