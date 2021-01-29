class DagNodeSort extends DagNode {
    protected input: DagNodeSortInput;
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Sort;
        this.minParents = 1;
        this.input = this.getRuntime().accessible(new DagNodeSortInput(options.input));
        this.display.icon = "&#xe921;";
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
     * Set sort node's parameters
     * @param input {DagNodeSortInputStruct}
     */
    public setParam(input: DagNodeSortInputStruct = <DagNodeSortInputStruct>{}, noAutoExecute?: boolean) {
        this.input.setInput({
            columns: input.columns,
            newKeys: input.newKeys,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const input = this.input.getInput(replaceParameters);
        const allCols: ProgCol[] = [];
        const newKeys: string[] = this.updateNewKeys(input.newKeys, true);
        const orderedCols: Map<string, string> = new Map();
        input.columns.forEach((col, index) => {
            orderedCols.set(col.columnName, newKeys[index]);
        });

        columns.forEach((oldProgCol) => {
            const oldName: string = oldProgCol.getBackColName();

            if (orderedCols.has(oldName)) {
                const newKey: string = orderedCols.get(oldName);
                if (oldName !== newKey) {
                    // a rename occurred during the sort
                    const colType: ColumnType = oldProgCol.getType();
                    const progCol: ProgCol = ColManager.newPullCol(newKey, newKey, colType);
                    allCols.push(progCol);
                    changes.push({
                        from: oldProgCol,
                        to: progCol
                    });
                } else {
                    // column name stays the same
                    allCols.push(oldProgCol);
                }
                orderedCols.delete(oldName);
            } else {
                allCols.push(oldProgCol);
            }
        });

        // sorted columns that weren't found amongst existing columns
        // either through a new name or param
        orderedCols.forEach((newName, _oldName) => {
            const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, ColumnType.unknown);
            allCols.push(newProgCol);
            changes.push({
                from: null,
                to: newProgCol
            });
        });

        return {
            columns: allCols,
            changes: changes
        }
    }

    public applyColumnMapping(renameMap): void {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        try {
            const cols = this.input.getInput().columns;
            cols.forEach(col => {
                if (renameMap.columns[col.columnName]) {
                    col.columnName = renameMap.columns[col.columnName];
                    delete newRenameMap.columns[col.columnName];
                }
            });
            this.input.setColumns(cols);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
        return newRenameMap;
    }


    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeSortInputStruct = this.getParam();
        if (input.columns.length) {
            const colInfos = input.columns.map((col) => col.columnName + ": " + col.ordering);
            hint = colInfos.join(", ");
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        this.input.getInput().columns.forEach((colInfo) => {
            if (colInfo != null) {
                set.add(colInfo.columnName);
            }
        });
        return set;
    }

    // loop through sort columns and make sure there's a corresponding
    // output name for each one that is not taken by another column
    public updateNewKeys(keys: string[], escapeColName?: boolean): string[] {
        const takenNames: Set<string> = new Set();
        const input = <DagNodeSortInputStruct>this.input.getInput();
        let oldNewKeys = keys || [];
        if (escapeColName) {
            // replace . with _
            oldNewKeys = oldNewKeys.map((oldNewKey) => {
                return xcHelper.escapeColName(oldNewKey);
            });
        }
        oldNewKeys.forEach((key) => {
            takenNames.add(key);
        });

        const parsedCols: PrefixColInfo[] = input.columns.map((col) => {
            return xcHelper.parsePrefixColName(col.columnName);
        });
        parsedCols.forEach((parsedCol) => {
            if (!parsedCol.prefix) {
                takenNames.add(parsedCol.name);
            }
        });

        // don't allow existing column names to be reused in new keys
        const parents = this.getParents();
        if (parents != null) {
            for (const parent of parents) {
                if (parent == null) {
                    continue;
                }
                for (const col of parent.getLineage().getColumns()) {
                    takenNames.add(col.getBackColName());
                }
            }
        }

        const seen: Set<string> = new Set();
        const newKeys: string[] = parsedCols.map((parsedCol, index) => {
            if (oldNewKeys[index] && !seen.has(oldNewKeys[index])) {
                seen.add(oldNewKeys[index]);
                return oldNewKeys[index];
            }
            if (!parsedCol.prefix && !seen.has(parsedCol.name)) {
                // immediate
                seen.add(parsedCol.name);
                return parsedCol.name;
            } else {
                // prefix
                let name: string = xcHelper.stripColName(parsedCol.name, false);
                if (!takenNames.has(name) && !seen.has(name)) {
                    seen.add(name);
                    return name;
                }

                name = xcHelper.convertPrefixName(parsedCol.prefix, name);
                let newName: string = name;
                if (!takenNames.hasOwnProperty(newName) && !seen.has(newName)) {
                    seen.add(newName);
                    return newName;
                }
                const finalName = xcHelper.randName(name);
                seen.add(finalName);
                return finalName;
            }
        });
        return newKeys;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSort = DagNodeSort;
};
