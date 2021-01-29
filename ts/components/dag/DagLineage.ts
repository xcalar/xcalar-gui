class DagLineage {
    /**
     * Example:
     * Add New column: {, from: null, to: progCol}
     * Remove columns: {from: progCol, to: null}
     * Change of columns(name/type): {from: oldProgCol, to: newProgCol}
     */
    private changes: DagColumnChange[];
    private node: DagNode;
    private columns: ProgCol[];
    private columnsWithParamsReplaced: ProgCol[];
    private hiddenColumns: Map<string, ProgCol>; // name: ProgCol
    private columnHistory;
    private columnParentMaps: {
        sourceColMap: {
            removed: Map<string, number[]>, // source columns removed
            renamed: Map<string, Map<string, number>>, // source columns renamed
            hidden: Map<string, number[]>,
            hiddenThisNode: Map<string, number[]>
        },
        destColMap: {
            added: Set<string>, // New columns
            renamed: Map<string, {from: string, parentIndex: number}>, // Dest columns renamed
            kept: Map<string, number>, // Dest columns kept
            pulled: Map<string, number>
        }
    };

    public constructor(node: DagNode) {
        this.node = node;
        this.columns = undefined;
        this.changes = [];
        this.hiddenColumns = undefined;
    }

    /**
     * Be called when has the column meta
     * For example, if it's a source node,
     * or it has executed and has the table meta
     * @param columns
     */
    public setColumns(columns: ProgCol[]): void {
        this.columns = columns;
    }

    /**
     * Reset when disconnect from parent, update params
     * or column meta from table is dropped
     */
    public reset(): void {
        this.columns = undefined;
        this.hiddenColumns = undefined;
        this.columnsWithParamsReplaced = undefined;
        this.columnParentMaps = undefined;
    }

    /**
     * If getting columns with parameters replaced with values, get columns
     * without caching them so we don't overwrite the parameterized version of
     * the columns
     * @param {boolean} replaceParameters
     * @return {ProgCol[]} get a list of columns
     */
    public getColumns(
        replaceParameters: boolean = false,
        includeHiddenCols: boolean = false
    ): ProgCol[] {
        let columns: ProgCol[];
        if (replaceParameters) {
            if (this.columnsWithParamsReplaced == null) {
                const updateRes = this._update(replaceParameters);
                this.columnsWithParamsReplaced = updateRes.columns;
            }
            columns = this.columnsWithParamsReplaced;
        } else {
            if (this.columns == null) {
                const updateRes = this._update(replaceParameters);
                this.columns = updateRes.columns;
                this.changes = updateRes.changes;
            }
            columns = this.columns;
        }
        if (includeHiddenCols) {
            let hiddenColsMap = this.getHiddenColumns();
            let hiddenCols = hiddenColsMap.values();
            columns = [...columns, ...hiddenCols];
        }
        return columns;
    }


    public getHiddenColumns(): Map<string, ProgCol> {
        if (this.hiddenColumns == null) {
            const columnDeltas: Map<string, any> = this.node.getColumnDeltas();
            let hiddenColumns: Map<string, ProgCol> = new Map();
            let pulledColumns: Set<string> = new Set();
            columnDeltas.forEach((colInfo, colName) => {
                if (colInfo.isHidden) {
                    let frontName = xcHelper.parsePrefixColName(colName);
                    hiddenColumns.set(colName, ColManager.newCol({name: frontName.name, backName: colName, type: colInfo.type}));
                } else if (colInfo.isPulled) {
                    pulledColumns.add(colName);
                }
            });

            let node = this.node;
            if (!node.isSourceNode() && node.getType() !== DagNodeType.Aggregate) {
                // aggregate has no columns. just a value
                node.getParents().forEach((parentNode) => {
                    if (parentNode == null) {
                        return;
                    }
                    // clone because we will remove pulled columns and we don't want to affect
                    // parent node's hiddenColumns map
                    const parentHiddenColumns = new Map(parentNode.getLineage().getHiddenColumns());
                    pulledColumns.forEach(colName => {
                        if (parentHiddenColumns.has(colName)) {
                            parentHiddenColumns.delete(colName);
                        }
                    });

                    hiddenColumns = new Map([...parentHiddenColumns, ...hiddenColumns]);
                });
            } else if (node instanceof DagNodeDFIn) {
                 // if link in node, use it's linkOut node as reference for hidden columns
                try {
                    let linkOutNode = node.getLinkedNodeAndGraph().node;
                    if (linkOutNode) {
                        hiddenColumns = new Map(linkOutNode.getLineage().getHiddenColumns());
                        pulledColumns.forEach(colName => {
                            if (hiddenColumns.has(colName)) {
                                hiddenColumns.delete(colName);
                            }
                        });
                    }
                } catch (e) {

                }
            } else if (node instanceof DagNodeSQLSubInput) {
                hiddenColumns = node.getHiddenColumns();
                pulledColumns.forEach(colName => {
                    if (hiddenColumns.has(colName)) {
                        hiddenColumns.delete(colName);
                    }
                });
            }
            this.hiddenColumns = hiddenColumns;
        }

        return this.hiddenColumns;
    }

    /**
     * @return {string[]} Get A list of prefix columns names
     */
    public getPrefixColumns(): string[] {
        const prefixColumns: string[] = [];
        this.getColumns().forEach((progCol) => {
            const colName: string = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix) {
                prefixColumns.push(colName);
            }
        });
        return prefixColumns;
    }

    /**
     * @return {string[]} Get A list of devired columns names
     */
    public getDerivedColumns(): string[] {
        const derivedColumns: string[] = [];
        this.getColumns().forEach((progCol) => {
            const colName: string = progCol.getBackColName();
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (!parsed.prefix) {
                derivedColumns.push(parsed.name);
            }
        });
        return derivedColumns;
    }

    /**
     * @returns {{from: ProgCol, to: ProgCol}[]}
     */
    public getChanges(): DagColumnChange[] {
        // if no columns, then no changes, so update
        if (this.columns == null) {
            const updateRes = this._update();
            this.columns = updateRes.columns;
            this.changes = updateRes.changes;
        }
        return this.changes;
    }

    /**
     * @returns {object[]} // returns an array. Each element in an array
     * corresponds to 1 node the column is present in.
     * @param colName sourceColumn or destColumn
     * @param childId
     * @param destColName must be specified if colName is sourceColumn
     */
    public getColumnHistory(colName: string, childId?: DagNodeId, destColName?: string): {
        id: DagNodeId,
        childId: DagNodeId,
        change: DagColumnChange,
        type: "add" | "rename" | "remove" | "hide" | "pull",
        colName: string
    }[] {
        const nodeId = this.node.getId();
        const changeInfo:{
            id: DagNodeId,
            childId: DagNodeId,
            change: DagColumnChange,
            type: "add" | "rename" | "remove" | "hide" | "pull",
            colName: string
        } = {
            id: nodeId,
            childId: childId || null,
            change: null,
            type: null,
            colName: colName
        };
        this.columnHistory = [changeInfo];

        const { sourceColMap, destColMap } = this._getColumnMaps();
        // populate change information
        let parentIndexList: number[];
        if (destColName == null) { // We are looking for a dest column
            if (destColMap.added.has(colName)) {
                changeInfo.type = 'add';
            } else if (destColMap.renamed.has(colName)) {
                const colRenameInfo = destColMap.renamed.get(colName);
                changeInfo.type = 'rename';
                parentIndexList = [colRenameInfo.parentIndex];
                colName = colRenameInfo.from;
            } else if (destColMap.pulled.has(colName)) {
                changeInfo.type = 'pull';
                // check if pulled from origin column
                let nestedName = ColManager.parseColFuncArgs(colName).nested[0];
                if (destColMap.kept.has(nestedName)) {
                    colName = nestedName;
                    parentIndexList = [destColMap.kept.get(colName)];
                } else if (destColMap.pulled.get(colName) != null) {
                    parentIndexList = [destColMap.pulled.get(colName)];
                }
            } else if (sourceColMap.hiddenThisNode.has(colName)) {
                changeInfo.type = 'hide';
                parentIndexList = sourceColMap.hidden.get(colName).map((v) => v);
            } else if (sourceColMap.hidden.has(colName)) {
                parentIndexList = sourceColMap.hidden.get(colName).map((v) => v);
            } else if (destColMap.kept.has(colName)) {
                parentIndexList = [destColMap.kept.get(colName)];
            } else {
                // This should never happen
                console.error(`Source column not found: ${colName}`);
            }
        } else { // We are looking for a source column
            if (sourceColMap.removed.has(colName)) {
                changeInfo.type = 'remove';
                parentIndexList = sourceColMap.removed.get(colName).map((v) => v); // XXX TODO: How to distinguish?
            }
            if (sourceColMap.renamed.has(colName)) {
                changeInfo.type = 'rename';
                const parentIndex = sourceColMap.renamed.get(colName).get(destColName);
                if (parentIndex != null) {
                    parentIndexList = [parentIndex];
                } else {
                    // This should never happen
                    console.error(`Dest column not found: ${destColName}`);
                }
            }
            if (sourceColMap.hidden.has(colName)) {
                changeInfo.type = 'hide';
                parentIndexList = sourceColMap.hidden.get(colName).map((v) => v);
            }
        }

        if (parentIndexList == null) {
            return this.columnHistory;
        }
        // recursively call getColumnHistory on parents
        const parents = this.node.getParents();
        for (const i of parentIndexList) {
            const parentNode = parents[i];
            if (!parentNode) {
                continue;
            }
            this.columnHistory = this.columnHistory.concat(parentNode.getLineage().getColumnHistory(colName, nodeId));
        }

        return this.columnHistory;
    }

    /**
     * Figure out the parent of each columns in this.changes and this.columns
     */
    private _getColumnMaps(): {
        sourceColMap: {
            removed: Map<string, number[]>, // source columns removed
            renamed: Map<string, Map<string, number>> // source columns renamed
            hidden: Map<string, number[]>,
            hiddenThisNode: Map<string, number[]>
        },
        destColMap: {
            added: Set<string>, // New columns
            renamed: Map<string, {from: string, parentIndex: number}>, // Dest columns renamed
            kept: Map<string, number>, // Dest columns kept
            pulled: Map<string, number>
        }
    } {
        if (this.columnParentMaps != null) {
            return this.columnParentMaps;
        }

        const sourceColMap = {
            removed: new Map<string, number[]>(), // source columns removed
            renamed: new Map<string, Map<string, number>>(), // source columns renamed
            hidden: new Map<string, number[]>(),
            hiddenThisNode: new Map<string, number[]>()
        };
        const destColMap = {
            added: new Set<string>(), // New columns
            renamed: new Map<string, {from: string, parentIndex: number}>(), // Dest columns renamed
            kept: new Map<string, number>(), // Dest columns kept
            pulled: new Map<string, number>()
        }
        // Columns changed by this node
        for (const {from, to, hiddenCol, parentIndex = 0} of this.getChanges()) {
            if (to) {
                const destColName = to.getBackColName();
                if (from) { // to != null && from != null: renamed columns
                    const sourceColName = from.getBackColName();
                    destColMap.renamed.set(destColName, { from: sourceColName, parentIndex: parentIndex });

                    if (!sourceColMap.renamed.has(sourceColName)) {
                        sourceColMap.renamed.set(sourceColName, new Map());
                    }
                    sourceColMap.renamed.get(sourceColName).set(destColName, parentIndex);
                } else { // to != null && from == null: new columns
                    destColMap.added.add(destColName);
                }
            } else if (from) { // to == null && from != null: removed columns
                const sourceColName = from.getBackColName();
                if (!sourceColMap.removed.has(sourceColName)) {
                    sourceColMap.removed.set(sourceColName, []);
                }
                sourceColMap.removed.get(sourceColName).push(parentIndex);
            } else if (hiddenCol) {
                const colName = hiddenCol.getBackColName();
                if (!sourceColMap.hidden.has(colName)) {
                    sourceColMap.hidden.set(colName, []);
                }
                if (!sourceColMap.hiddenThisNode.has(colName)) {
                    sourceColMap.hiddenThisNode.set(colName, []);
                }
                sourceColMap.hidden.get(colName).push(parentIndex);
                sourceColMap.hiddenThisNode.get(colName).push(parentIndex);
            }
        }

        // Columns kept from parents
        // Where all the source columns come from. The map could be empty if it's a input node.
        const sourceParentMap = new Map<string, Set<number>>();
        const hiddenSourceParentMap = new Map<string, Set<number>>();
        const parents = this.node.getParents();
        for (let i = 0; i < parents.length; i ++) {
            const parent = parents[i];
            if (parent == null) {
                continue;
            }
            for (const progCol of parent.getLineage().getColumns()) {
                const colName = progCol.getBackColName();
                if (!sourceParentMap.has(colName)) {
                    sourceParentMap.set(colName, new Set<number>());
                }
                sourceParentMap.get(colName).add(i);
            }

            for (const [_str, progCol] of parent.getLineage().getHiddenColumns()) {
                const colName = progCol.getBackColName();
                if (!hiddenSourceParentMap.has(colName)) {
                    hiddenSourceParentMap.set(colName, new Set<number>());
                }
                hiddenSourceParentMap.get(colName).add(i);
            }
        }

        let hiddenColsMap = this.getHiddenColumns();
        let hiddenCols = hiddenColsMap.values();
        let cols = [...this.getColumns(), ...hiddenCols];
        const columnDeltas: Map<string, any> = this.node.getColumnDeltas();
        let pulledColumns: Set<string> = new Set();
        columnDeltas.forEach((colInfo, colName) => {
            if (colInfo.isPulled) {
                pulledColumns.add(colName);
            }
        });

        // Columns = add + rename + keep
        for (const col of cols) {
            let colName = col.getBackColName();
            if (!destColMap.added.has(colName) && !destColMap.renamed.has(colName) &&
                !destColMap.pulled.has(colName)) {
                // This column is kept from one of the parents.
                // There might be more than one parents having columns with the same name,
                // but other columns must have been renamed or removed except this one.
                // So the parent where this column comes from is: parents expose this column - (parents renamed + removed)
                const parentsRemoved = sourceColMap.removed.get(colName) || [];
                const parentsRenamed = [];
                if (sourceColMap.renamed.has(colName)) {
                    sourceColMap.renamed.get(colName).forEach((parentIndex) => {
                        parentsRenamed.push(parentIndex);
                    });
                }

                let potentialParents = sourceParentMap.get(colName);
                if (potentialParents == null) {
                    // Nodes w/o parents(ex. dataset) will go here
                    // XXX also if column is pulled -- but this could change
                    // if we make the "pull" action considered to be a "change"
                    if (pulledColumns.has(colName)) {
                        if (hiddenSourceParentMap.has(colName)) {
                            destColMap.pulled.set(colName, hiddenSourceParentMap.get(colName).values().next().value);
                        } else {
                            destColMap.pulled.set(colName, null);
                        }
                    } else if (hiddenColsMap.has(colName)) {
                        sourceColMap.hidden.set(colName, [0]);
                    } else {
                        destColMap.added.add(colName);
                    }
                } else {
                    // Remove the parents renamed/removed
                    for (const changedParentIndex of parentsRemoved.concat(parentsRenamed)) {
                        potentialParents.delete(changedParentIndex);
                    }
                    // The parent remaining in the set is the one where the column comes from
                    if (potentialParents.size === 1) {
                        if (hiddenColsMap.has(colName)) {
                            sourceColMap.hidden.set(colName, [0]);
                        } else {
                            destColMap.kept.set(colName, potentialParents.values().next().value);
                        }
                    } else {
                        // Should never happen!
                        console.error(`Column ${colName} comes from ${potentialParents.size} parents`);
                    }
                }
            }
        }

        this.columnParentMaps = {
            sourceColMap: sourceColMap,
            destColMap: destColMap
        };
        return this.columnParentMaps;
    }

    // get column lineage according to parents, pulled columns, changes in the node,
    private _update(replaceParameters?: boolean): DagLineageChange {
        let colInfo: DagLineageChange;
        // Step 1. get columns based off of parents and node input
        if (this.node.isSourceNode()) {
            // source node
            colInfo = this._applyChanges(replaceParameters);
        } else if (this.node.getType() === DagNodeType.Aggregate) {
            colInfo = {columns:[], changes:[]}; // aggregate has no columns. just a value
        } else {
            let columns: ProgCol[] = [];
            this.node.getParents().forEach((parentNode) => {
                columns = columns.concat(parentNode.getLineage().getColumns(replaceParameters));
            });

            colInfo = this._applyChanges(replaceParameters, columns);
        }
        let columns: ProgCol[] = colInfo.columns;
        let changes: DagColumnChange[] = colInfo.changes;

        // Step 2. add Pulled columns
        const columnDeltas: Map<string, any> = this.node.getColumnDeltas();
        // check if node has "pulled columns" action and add these to
        // colInfo.columns if they aren't already there
        const colNames: Set<string> = new Set(columns.map(col => col.getBackColName()));
        let hiddenCols: Map<string, ProgCol> = this.getHiddenColumns();
        let colsHiddenInThisNode: Set<string> = new Set();
        columnDeltas.forEach((colInf, colName) => {
            // add pulled columns
            if (colInf.isPulled && !colNames.has(colName)) {
                let frontName = xcHelper.parsePrefixColName(colName);
                if (hiddenCols.has(colName)) {
                    columns.push(hiddenCols.get(colName));
                } else {
                    columns.push(ColManager.newCol({name: frontName.name, backName: colName, type: colInf.type}));
                }
            } else if (colInf.isHidden) {
                colsHiddenInThisNode.add(colName);
            }
        });

        // Step 3. modify column deltas and remove hidden columns
        // replace "colInfo.columns" with "updatedColumns" that contain
        // updated widths and text alignment
        let updatedColumns: ProgCol[] = [];
        let hiddenColumns: Set<ProgCol> = new Set();
        columns.forEach((column) => {
            if (columnDeltas.has(column.getBackColName())) {
                let columnInfo = columnDeltas.get(column.getBackColName());
                if (columnInfo.isHidden) {
                    hiddenColumns.add(column);
                } else {
                    let colReplaced = false;
                    if (columnInfo.widthChange) {
                        // do not change original column width, create a new column
                        // and change that width instead
                        if (!colReplaced) {
                            column = new ProgCol(<any>column);
                            colReplaced = true;
                        }

                        column.width = columnInfo.widthChange.width;
                        column.sizedTo = columnInfo.widthChange.sizedTo;
                        column.isMinimized = columnInfo.widthChange.isMinimized;
                    }
                    if (columnInfo.textAlign) {
                        if (!colReplaced) {
                            column = new ProgCol(<any>column);
                            colReplaced = true;
                        }
                        column.setTextAlign(columnInfo.textAlign);
                    }
                    updatedColumns.push(column);
                }
            } else {
                updatedColumns.push(column);
            }
        });

        // Step 4. adjust changes.from/to due to hidden columns
        // for hidden columns
        let updatedChanges: DagColumnChange[] = [];
        let changedColumnsSet: Set<string> = new Set();
        changes.forEach((change) => {
            if (change.from && columnDeltas.has(change.from.getBackColName()) &&
                columnDeltas.get(change.from.getBackColName()).isHidden) {
                    if (colsHiddenInThisNode.has(change.from.getBackColName()) &&
                        change.to && change.to.getBackColName() !== change.from.getBackColName()) {
                        // if column was hidden in this node, do not hide a
                        // column that used to have that name but is different now
                    } else {
                        change.hidden = true;
                    }
            }
            if (change.to && columnDeltas.has(change.to.getBackColName()) &&
                columnDeltas.get(change.to.getBackColName()).isHidden) {
                    if (change.from && colsHiddenInThisNode.has(change.from.getBackColName()) &&
                        change.to.getBackColName() !== change.from.getBackColName()) {
                        // if column was hidden in this node, do not hide a
                        // column that used to have that name but is different now
                    } else {
                        change.hidden = true;
                    }
            }

            updatedChanges.push(change);
            if (change.from) {
                changedColumnsSet.add(change.from.getBackColName());
            }
            if (change.to) {
                changedColumnsSet.add(change.to.getBackColName());
            }
        });


        hiddenCols.forEach((column) => {
            let name = column.getBackColName();
            if (!changedColumnsSet.has(name)) {
                let change: DagColumnChange = {to: null, from: null, hidden: true};
                if (colsHiddenInThisNode.has(name)) {
                    change.hiddenCol = column;
                    updatedChanges.push(change);
                }
            }
        });


        // Step 5. reorder columns if necessary
        // if columns are reordered, create map of colName:progCol so that we
        // can rebuild the correctly ordered array of progCols
        let columnOrdering = this.node.getColumnOrdering();
        if (columnOrdering.length) {
            let reorderedCols: ProgCol[] = [];
            let colNameMap: Map<string, ProgCol> = new Map();
            updatedColumns.forEach(col => colNameMap.set(col.getBackColName(), col));

            columnOrdering.forEach((colName) => {
                if (colNameMap.has(colName)) {
                    reorderedCols.push(colNameMap.get(colName));
                    colNameMap.delete(colName);
                }
            });
            // left over columns not found in columnOrdering array
            colNameMap.forEach(col => {
                reorderedCols.push(col);
            });
            updatedColumns = reorderedCols;
        }

        colInfo.columns = updatedColumns;
        colInfo.changes = updatedChanges;
        return colInfo;
    }

    private _applyChanges(replaceParameters?: boolean, columns?: ProgCol[]): DagLineageChange {
        let lineageChange: DagLineageChange;
        columns = columns || this.columns;
        try {
            lineageChange = this.node.lineageChange(columns, replaceParameters);
        } catch (e) {
            console.error("get lineage error", e);
            lineageChange = {
                columns: [],
                changes: []
            };
        }
        return lineageChange;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagLineage = DagLineage;
};
