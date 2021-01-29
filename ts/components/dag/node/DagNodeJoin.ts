class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options?: DagNodeInfo, runtime?: DagRuntime) {
        options = options || <DagNodeInfo>{};
        super(options, runtime);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
        this.minParents = 2;
        this.display.icon = "&#xe93e;";
        this.input = this.getRuntime().accessible(new DagNodeJoinInput(<DagNodeJoinInputStruct>options.input, this));
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
            "maxItems": 2,
            "items": {
              "$id": "#/properties/parents/items",
              "type": ["string", "null"],
              "pattern": "^(.*)$"
            }
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "enum": [DagNodeSubType.LookupJoin, DagNodeSubType.FilterJoin, null]
          }
        }
    };

    /**
     * Set join node's parameters
     * @param input {DagNodeJoinInputStruct}
     * @param input.joinType {string} Join type
     * @param input.columns column infos from left table and right table
     * @param input.evalString {string} Optional, eavlString in join
     */
    public setParam(input: DagNodeJoinInputStruct = <DagNodeJoinInputStruct>{}, noAutoExecute?: boolean) {
        this.input.setInput({
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString,
            nullSafe: input.nullSafe,
            keepAllColumns: input.keepAllColumns,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    // XXX TODO: verify it's correctness
    public lineageChange(
        _columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        try {
            const param: DagNodeJoinInputStruct = this.input.getInput(replaceParameters);
            const parents: DagNode[] = this.getParents();
            const lCols: ProgCol[] = parents[0].getLineage()
                .getColumns(replaceParameters, true);
            const lChanges: DagLineageChange = this._getColAfterJoin(
                lCols,
                param.left,
                param.keepAllColumns,
                0);
            const hiddenCols = this.getLineage().getHiddenColumns();
            if (this._isSkipRightTable(param.joinType)) {
                lChanges.changes.forEach((change) => {
                    if (change.from && change.to == null) {
                        hiddenCols.delete(change.from.getBackColName());
                    }
                });
                return {
                    columns: lChanges.columns,
                    changes: lChanges.changes
                };
            } else {
                const rCols: ProgCol[] = parents[1].getLineage()
                    .getColumns(replaceParameters, true);
                const rChanges: DagLineageChange = this._getColAfterJoin(
                    rCols,
                    param.right,
                    param.keepAllColumns,
                    1);
                lChanges.changes.forEach((change) => {
                    if (change.from && change.to == null) {
                        hiddenCols.delete(change.from.getBackColName());
                    }
                });
                rChanges.changes.forEach((change) => {
                    if (change.from && change.to == null) {
                        hiddenCols.delete(change.from.getBackColName());
                    }
                });
                return {
                    columns: lChanges.columns.concat(rChanges.columns),
                    changes: lChanges.changes.concat(rChanges.changes)
                };
            }
        } catch {
            return { columns: [], changes: [] };
        }
    }

    // provided a renameMap, change the name of columns used in arguments
    public applyColumnMapping(renameMap, index: number): {} {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        const input = this.input.getInput();
        try {
            let side: string;
            if (index === 0) {
                side = "left";
            } else {
                side = "right";
            }
            input.evalString = this._replaceColumnInEvalStr(input.evalString, renameMap.columns);
            input[side].columns.forEach((columnName, i) => {
                if (renameMap.columns[columnName]) {
                    input[side].columns[i] = renameMap.columns[columnName];
                }
            });
            input[side].rename.forEach((renameInfo) => {
                if (renameInfo.prefix) {
                    const originalPrefix = renameInfo.sourceColumn;
                    if (renameMap.prefixes[originalPrefix]) {
                        delete newRenameMap.prefixes[renameInfo.sourceColumn];
                        renameInfo.sourceColumn = renameMap.prefixes[originalPrefix];
                        const originalRenamedPrefix = renameInfo.destColumn;

                        // mapping: a::classid -> x::teacherId
                        // join renamed prefix "a" to "b"
                        // new mapping: b::classId -> b::teacherId

                        // go through each column that matches same prefix
                        // and updated the new renameMap with the
                        // renamed prefix
                        for (let oldColName in newRenameMap.columns) {
                            const oldParsedColName = xcHelper.parsePrefixColName(oldColName);
                            if (oldParsedColName.prefix === originalPrefix) {
                                const newParsedColName = xcHelper.parsePrefixColName(newRenameMap.columns[oldColName]);
                                const prevColName = xcHelper.getPrefixColName(originalRenamedPrefix, oldParsedColName.name);// "b::classId"
                                const newDestColName = xcHelper.getPrefixColName(originalRenamedPrefix, newParsedColName.name);// "b::teacherId"
                                delete newRenameMap.columns[oldColName];
                                newRenameMap.columns[prevColName] = newDestColName;
                            }
                        }
                    }
                } else {
                    if (renameMap.columns[renameInfo.sourceColumn]) {
                        const prevColName = renameInfo.sourceColumn;
                        renameInfo.sourceColumn = renameMap.columns[prevColName];
                        delete newRenameMap.columns[prevColName];
                    }
                }
            });
            this.input.setInput(input);
        } catch(err) {
            console.error(err);
        }

        super.setParam(null, true);
        return newRenameMap;
    }

    /**
     * Check if the joinType is converted from node subType
     */
    public isJoinTypeConverted(): boolean {
        return this.input.isJoinTypeConverted();
    }

    public static joinRenameConverter(
        colNamesToKeep: string[],
        renameInput: { sourceColumn: string, destColumn: string, prefix: boolean }[],
        useJoinRenameStruct?: boolean
    ): ColRenameInfo[] {
        // Convert rename list => map, for fast lookup
        const colRenameMap: Map<string, string> = new Map();
        const prefixRenameMap: Map<string, string> = new Map();
        renameInput.forEach(({ prefix, sourceColumn, destColumn }) => {
            if (prefix) {
                prefixRenameMap.set(sourceColumn, destColumn);
            } else {
                colRenameMap.set(sourceColumn, destColumn);
            }
        });

        // Apply rename to the columns need to keep
        const prefixSet: Set<string> = new Set();
        const rename = [];
        for (const colName of colNamesToKeep) {
            const parsed = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix.length > 0) {
                // Prefixed column: put the prefix in the rename list
                const oldPrefix = parsed.prefix;
                if (prefixSet.has(oldPrefix)) {
                    continue; // This prefix has already been renamed
                }
                prefixSet.add(oldPrefix);
                const newPrefix = prefixRenameMap.get(oldPrefix) || oldPrefix;
                if (useJoinRenameStruct) {
                    rename.push({
                        sourceColumn: oldPrefix, destColumn: newPrefix, prefix: true
                    });
                } else {
                    rename.push({
                        orig: oldPrefix, new: newPrefix, type: DfFieldTypeT.DfFatptr
                    });
                }

            } else {
                // Derived column: put column name in the rename list
                const newName = colRenameMap.get(colName) || colName;
                if (useJoinRenameStruct) {
                    rename.push({
                        sourceColumn: colName, destColumn: newName, prefix: false
                    });
                } else {
                    rename.push({
                        orig: colName, new: newName, type: DfFieldTypeT.DfUnknown
                    });
                }
            }
        }

        return rename;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        if (this.subType === DagNodeSubType.LookupJoin) {
            return "Lookup Join";
        } else if (this.subType === DagNodeSubType.FilterJoin) {
            return "Filter Join";
        } else {
            return super.getDisplayNodeType();
        }
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeJoinInputStruct = this.getParam();
        if (input.joinType && typeof input.joinType === "string") {
            hint = xcStringHelper.capitalize(input.joinType);
            hint += " " + input.left.columns.join(", ") + "\n";
            hint += "with " + input.right.columns.join(", ") + "\n";
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        const input: DagNodeJoinInputStruct = this.getParam();
        this._getColumnsFromJoinTableInput(input.left, set);
        this._getColumnsFromJoinTableInput(input.right, set);
        return set;
    }

    private _isSkipRightTable(joinType: string) {
        const noRenameType: Set<string> = new Set([
            JoinOperatorTStr[JoinOperatorT.LeftSemiJoin],
            JoinOperatorTStr[JoinOperatorT.LeftAntiJoin]
        ]);
        return noRenameType.has(joinType);
    }

    private _getColAfterJoin(
        allColumns: ProgCol[],
        joinInput: DagNodeJoinTableInput,
        isKeepAllColumns: boolean,
        parentIndex: number
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const hiddenColumns = this.lineage.getHiddenColumns();
        const colMap: Map<string, ProgCol> = new Map();
        allColumns.forEach((progCol) => {
            colMap.set(progCol.getBackColName(), progCol);
        });

        const columnDeltas: Map<string, any> = this.getColumnDeltas();
        let columnsHiddenThisNode: Set<string> = new Set();
        columnDeltas.forEach((colInfo, colName) => {
            if (colInfo.isHidden) {
                columnsHiddenThisNode.add(colName);
            }
        });

        // 1. Get columns should be in the resultant table
        const finalCols: ProgCol[] = [];
        const finalHiddenCols: ProgCol[] = [];
        const removeCols: ProgCol[] = [];
        if (isKeepAllColumns) {
            allColumns.forEach((col) => {
                if (hiddenColumns.has(col.getBackColName())) {
                    finalHiddenCols.push(col);
                } else {
                    finalCols.push(col);
                }
            });
        } else {
            const keepColNameSet = new Set(joinInput.keepColumns.filter(
                (colName) => colMap.has(colName)
            ));
            allColumns.forEach((progCol) => {
                if (keepColNameSet.has(progCol.getBackColName())) {
                    if (hiddenColumns.has(progCol.getBackColName())) {
                        finalHiddenCols.push(progCol);
                    } else {
                        finalCols.push(progCol);
                    }

                } else {
                    removeCols.push(progCol);
                }
            });
        }

        // 2. rename columns
        const prefixRenameMap: Map<string, string> = new Map(); // Prefix rename map
        const columnRenameMap: Map<string, string> = new Map(); // Derived column rename map
        for (const renameInfo of joinInput.rename) {
            const { sourceColumn, destColumn, prefix } = renameInfo;
            if (sourceColumn === destColumn) {
                continue; // Do not show the changes with no name change
            }
            if (prefix) {
                prefixRenameMap.set(sourceColumn, destColumn);
            } else {
                columnRenameMap.set(sourceColumn, destColumn);
            }
        }
        for (let i = 0; i < finalCols.length; i++) { // Apply rename to every columns
            const progCol: ProgCol = finalCols[i];
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(progCol.getBackColName());
            if (parsed.prefix.length > 0) {
                // Prefixed column
                const prefixAfterRename = prefixRenameMap.get(parsed.prefix);
                if (prefixAfterRename != null) {
                    const newName = xcHelper.getPrefixColName(prefixAfterRename, parsed.name);
                    const newProgCol: ProgCol = ColManager.newPullCol(parsed.name, newName, progCol.getType());
                    finalCols[i] = newProgCol;
                    changes.push({ from: progCol, to: newProgCol, parentIndex: parentIndex });
                }
            } else {
                // Derived column
                const newName = columnRenameMap.get(parsed.name);
                if (newName != null) {
                    const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, progCol.getType());
                    finalCols[i] = newProgCol;
                    changes.push({ from: progCol, to: newProgCol, parentIndex: parentIndex });
                }
            }
        }

        // 2.b rename hidden columns
        for (let i = 0; i < finalHiddenCols.length; i++) { // Apply rename to every columns
            const progCol: ProgCol = finalHiddenCols[i];
            const prevName = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(prevName);
            if (parsed.prefix.length > 0) {
                // Prefixed column
                const prefixAfterRename = prefixRenameMap.get(parsed.prefix);
                if (prefixAfterRename != null) {
                    const newName = xcHelper.getPrefixColName(prefixAfterRename, parsed.name);
                    const newProgCol: ProgCol = ColManager.newPullCol(parsed.name, newName, progCol.getType());
                    let hidden = false;
                    if (newName !== prevName && !columnsHiddenThisNode.has(prevName)) {
                        // if renamed and column was hidden before, add
                        // the new column name to the set
                        hidden = true;
                        hiddenColumns.set(newName, newProgCol);
                    }
                    changes.push({ from: progCol, to: newProgCol, hidden: hidden, parentIndex: parentIndex });
                }
            } else {
                // Derived column
                const newName = columnRenameMap.get(parsed.name);
                if (newName != null) {
                    const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, progCol.getType());
                    let hidden = false;
                    if (newName !== prevName && !columnsHiddenThisNode.has(prevName)) {
                        // if renamed and column was hidden before, add
                        // the new column name to the set
                        hidden = true;
                        hiddenColumns.set(newName, newProgCol);
                    }
                    changes.push({ from: progCol, to: newProgCol, hidden: hidden, parentIndex: parentIndex });
                    hiddenColumns.set(newName, newProgCol);
                }
            }
        }

        // 3. remove columns
        for (const progCol of removeCols) {
            let hidden = false;
            if (hiddenColumns.has(progCol.getBackColName())) {
                hidden = true;
            }
            changes.push({ from: progCol, to: null, hidden: hidden, parentIndex: parentIndex });
        }

        return {
            columns: finalCols,
            changes: changes
        };
    }

    private _getColumnsFromJoinTableInput(
        tableInput: DagNodeJoinTableInput,
        set: Set<string>
    ): void {
        if (tableInput == null) {
            return;
        }
        if (tableInput.columns != null) {
            tableInput.columns.forEach((colName) => {
                set.add(colName);
            });
        }

        if (tableInput.rename != null) {
            tableInput.rename.forEach((renameInfo) => {
                if (renameInfo != null && !renameInfo.prefix) {
                    set.add(renameInfo.sourceColumn);
                }
            });
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeJoin = DagNodeJoin;
};
