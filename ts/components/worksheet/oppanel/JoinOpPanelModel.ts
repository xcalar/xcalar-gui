class JoinOpPanelModel extends BaseOpPanelModel {
    // UI states
    private _currentStep: number = 1;
    private _isAdvMode: boolean = false;
    private _isNoCast: boolean = true;
    private _isFixedType: boolean = false;
    // Lineage data
    private _columnMeta: {
        left: JoinOpColumnInfo[],
        leftMap: Map<string, JoinOpColumnInfo>,
        right: JoinOpColumnInfo[],
        rightMap: Map<string, JoinOpColumnInfo>
    } = { left: [], leftMap: new Map(), right: [], rightMap: new Map() };
    private _prefixMeta: {
        left: string[],
        leftMap: Map<string, string>,
        right: string[],
        rightMap: Map<string, string>
    } = { left: [], leftMap: new Map(), right: [], rightMap: new Map() };
    // DagNode configurations
    private _joinType: string = JoinOperatorTStr[JoinOperatorT.InnerJoin];
    private _joinColumnPairs: JoinOpColumnPair[] = [];
    private _columnRename: {
        left: JoinOpRenameInfo[],
        right: JoinOpRenameInfo[]
    } = { left: [], right: [] };
    private _evalString = '';
    private _previewTableNames: {
        left: string, right: string
    } = { left: null, right: null };
    private _selectedColumns: { // Columns selected by user
        left: string[], right: string[]
    } = { left: [], right: [] };
    private _nullSafe: boolean = false;
    private _outputTableName: string = "";

    public static fromDag(
        dagNode: DagNodeJoin,
        uiOptions: {
            currentStep: number,
            isAdvMode: boolean,
            isNoCast: boolean
        }
    ): JoinOpPanelModel {
        try {
            const {left: leftCols, right: rightCols} = this.getColumnsFromDag(dagNode);
            const {
                left: leftTableName, right: rightTableName
            } = this.getPreviewTableNamesFromDag(dagNode);

            // Override the join type with sub type(sub category)
            const dagConfig = dagNode.getParam();

            return this.fromDagInput(
                leftCols,rightCols, dagConfig,
                leftTableName, rightTableName,
                {
                    currentStep: uiOptions.currentStep,
                    isAdvMode: uiOptions.isAdvMode,
                    isNoCast: uiOptions.isNoCast,
                    isFixedType: dagNode.isJoinTypeConverted()
                }
            );
        } catch(e) {
            console.error(e);
            return new JoinOpPanelModel();
        }
    }

    public static getColumnsFromDag(
        dagNode: DagNodeJoin
    ): { left: ProgCol[], right: ProgCol[] } {
        const [leftParent, rightParent] = dagNode.getParents();
        return {
            left: this._getColumnsFromDagNode(leftParent),
            right: this._getColumnsFromDagNode(rightParent)
        };
    }

    public static getPreviewTableNamesFromDag(
        dagNode: DagNodeJoin
    ): { left: string, right: string } {
        const [leftParent, rightParent] = dagNode.getParents();
        return {
            left: this._getPreviewTableNameFromDagNode(leftParent),
            right: this._getPreviewTableNameFromDagNode(rightParent)
        };
    }

    /**
     * Create JoinOpPanelModel instance from DagNode configuration and column meta
     * @param leftColList Could be null/empty
     * @param rightColList Could be null/empty
     * @param config DagNodeJoinInputStruct object
     * @throws JS exception/JoinOpError
     */
    public static fromDagInput(
        leftColList: ProgCol[],
        rightColList: ProgCol[],
        config: DagNodeJoinInputStruct,
        leftPreviewTableName: string,
        rightPreviewTableName: string,
        uiOptions: {
            currentStep: number,
            isAdvMode: boolean,
            isNoCast: boolean,
            isFixedType: boolean
        }
    ) {
        const model = new JoinOpPanelModel();
        if (config == null) {
            return model;
        }

        const {
            left: configLeft, right: configRight,
            joinType: configJoinType, evalString: configEvalString,
            nullSafe: configNullSafe = false,
            // This flag is only effective when converting dagInput to model
            keepAllColumns: configKeepAllColumns,
            outputTableName: configOutputTableName = ""
        } = <DagNodeJoinInputStruct>xcHelper.deepCopy(config);

        // === UI States ====
        model.setCurrentStep(uiOptions.currentStep);
        model.setAdvMode(uiOptions.isAdvMode);
        model.setNoCast(uiOptions.isNoCast);
        model.setFixedType(uiOptions.isFixedType);

        // === DagLineage ===
        // Candidate columns & prefixes
        const {
            columnMeta: leftColumnMeta,
            prefixMeta: leftPrefixMeta,
            columnLookup: leftColLookupMap,
            prefixLookup: leftPrefixLookupMap
        } = this._parseColumnPrefixMeta(leftColList);
        model._columnMeta.left = leftColumnMeta;
        model._columnMeta.leftMap = leftColLookupMap;
        model._prefixMeta.left = leftPrefixMeta;
        model._prefixMeta.leftMap = leftPrefixLookupMap;

        const {
            columnMeta: rightColumnMeta,
            prefixMeta: rightPrefixMeta,
            columnLookup: rightColLookupMap,
            prefixLookup: rightPreixLookupMap
        } = this._parseColumnPrefixMeta(rightColList);
        model._columnMeta.right = rightColumnMeta;
        model._columnMeta.rightMap = rightColLookupMap;
        model._prefixMeta.right = rightPrefixMeta;
        model._prefixMeta.rightMap = rightPreixLookupMap;

        // === DagNode configuration ===
        // Join Type
        model.setJoinType(configJoinType);
        // Eval String
        model.setEvalString(configEvalString);
        // nullSafe
        model.setNullSafe(configNullSafe);
        model.setOutputTableName(configOutputTableName);

        // Normalize JoinOn input
        // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
        // if (configLeft.casts == null) {
        //     configLeft.casts = [];
        // }
        // if (configRight.casts == null) {
        //     configRight.casts = [];
        // }
        const joinOnCount = Math.max(
            configLeft.columns.length,
            configRight.columns.length);
        for (let i = 0; i < joinOnCount; i ++) {
            // joinOn left column
            const leftColName = configLeft.columns[i];
            if (leftColName == null || leftColName.length === 0) {
                configLeft.columns[i] = '';
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // configLeft.casts[i] = ColumnType.undefined;
            }
            // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
            // } else {
            //     const colInfo = leftColLookupMap.get(leftColName);
            //     configLeft.casts[i] = colInfo == null
            //         ? ColumnType.undefined : colInfo.type;
            // }
            // joinOn right column
            const rightColName = configRight.columns[i];
            if (rightColName == null || rightColName.length === 0) {
                configRight.columns[i] = '';
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // configRight.casts[i] = ColumnType.undefined;
            }
            // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
            // } else {
            //     const colInfo = rightColLookupMap.get(rightColName);
            //     configRight.casts[i] = colInfo == null
            //         ? ColumnType.undefined : colInfo.type;
            // }
        }

        // JoinOn pairs
        const pairLen = configLeft.columns.length;
        for (let i = 0; i < pairLen; i ++) {
            // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
            // const [leftName, leftCast, rightName, rightCast] = [
            //     configLeft.columns[i], configLeft.casts[i],
            //     configRight.columns[i], configRight.casts[i]
            // ];
            const [leftName, rightName] = [
                configLeft.columns[i], configRight.columns[i]
            ];
            const [leftCol, rightCol] = [
                leftColLookupMap.get(leftName), rightColLookupMap.get(rightName)
            ];
            model._joinColumnPairs.push({
                leftName: leftName,
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // leftCast: leftCast,
                leftCast: leftCol == null ? ColumnType.undefined : leftCol.type,
                rightName: rightName,
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // rightCast: rightCast,
                rightCast: rightCol == null ? ColumnType.undefined : rightCol.type
            });
        }

        // Selected Columns
        const selection = model._buildSelectedColumns({
            leftColumnMetaMap: model._columnMeta.leftMap,
            rightColumnMetaMap: model._columnMeta.rightMap,
            joinType: model._joinType,
            joinOnPairs: model._joinColumnPairs,
            leftSelected: configKeepAllColumns
                ? model._columnMeta.left.map((colInfo) => colInfo.name)
                : configLeft.keepColumns,
            rightSelected: configKeepAllColumns
                ? model._columnMeta.right.map((colInfo) => colInfo.name)
                : configRight.keepColumns
        });
        model._selectedColumns.left = selection.leftSelectable.map((v) => v);
        model._selectedColumns.right = selection.rightSelectable.map((v) => v);

        // Renames
        if (model._needRenameByType(model.getJoinType())) {
            const renamePrefixMapLeft = {};
            const renameColMapLeft = {};
            for (const rename of configLeft.rename) {
                if (rename.sourceColumn.length === 0) {
                    continue;
                }
                if (rename.prefix) {
                    if (leftPrefixLookupMap.has(rename.sourceColumn)) {
                        renamePrefixMapLeft[rename.sourceColumn] = rename.destColumn;
                    }
                } else {
                    if (leftColLookupMap.has(rename.sourceColumn)) {
                        renameColMapLeft[rename.sourceColumn] = rename.destColumn;
                    }
                }
            }
            const renamePrefixMapRight = {};
            const renameColMapRight = {};
            for (const rename of configRight.rename) {
                if (rename.sourceColumn.length === 0) {
                    continue;
                }
                if (rename.prefix) {
                    if (rightPreixLookupMap.has(rename.sourceColumn)) {
                        renamePrefixMapRight[rename.sourceColumn] = rename.destColumn;
                    }
                } else {
                    if (rightColLookupMap.has(rename.sourceColumn)) {
                        renameColMapRight[rename.sourceColumn] = rename.destColumn;
                    }
                }
            }
            model._buildRenameInfo({
                colDestLeft: renameColMapLeft,
                colDestRight: renameColMapRight,
                prefixDestLeft: renamePrefixMapLeft,
                prefixDestRight: renamePrefixMapRight
            });
        } else {
            model._clearRenames();
        }

        model._previewTableNames.left = leftPreviewTableName;
        model._previewTableNames.right = rightPreviewTableName;
        return model;
    }

    public toDag(): DagNodeJoinInputStruct {
        const dagData: DagNodeJoinInputStruct = {
            joinType: this._joinType,
            left: { columns: [], keepColumns: [], rename: [] },
            right: { columns: [], keepColumns: [], rename: [] },
            evalString: this._evalString,
            nullSafe: this.isNullSafe(),
            // All selected columns are already in keepColumns
            // Keep it here to let user be able to access in adv. form/json
            keepAllColumns: false,
            outputTableName: this._outputTableName
        };

        // JoinOn columns
        if (!this.isCrossJoin()) {
            for (const colPair of this._joinColumnPairs) {
                // Left JoinOn column
                dagData.left.columns.push(colPair.leftName);
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // dagData.left.casts.push(colPair.leftCast);
                // Right JoinOn column
                dagData.right.columns.push(colPair.rightName);
                // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
                // dagData.right.casts.push(colPair.rightCast);
            }
        }

        // Selected Columns
        const selection = this._buildSelectedColumns({
            leftColumnMetaMap: this._columnMeta.leftMap,
            rightColumnMetaMap: this._columnMeta.rightMap,
            joinType: this._joinType,
            joinOnPairs: this._joinColumnPairs,
            leftSelected: this._selectedColumns.left,
            rightSelected: this._selectedColumns.right
        });
        // keepColumns = joinOn(vary as joinType) + selected
        dagData.left.keepColumns = selection.leftFixed
            .concat(selection.leftSelectable);
        dagData.right.keepColumns = selection.rightFixed
            .concat(selection.rightSelectable);

        // Renamed left prefixes & columns
        const {
            colDestLeft, colDestRight, prefixDestLeft, prefixDestRight
        } = this._getRenameMap();
        for (const source of Object.keys(colDestLeft)) {
            dagData.left.rename.push({
                sourceColumn: source,
                destColumn: colDestLeft[source],
                prefix: false
            });
        }
        for (const source of Object.keys(colDestRight)) {
            dagData.right.rename.push({
                sourceColumn: source,
                destColumn: colDestRight[source],
                prefix: false
            });
        }
        for (const source of Object.keys(prefixDestLeft)) {
            dagData.left.rename.push({
                sourceColumn: source,
                destColumn: prefixDestLeft[source],
                prefix: true
            });
        }
        for (const source of Object.keys(prefixDestRight)) {
            dagData.right.rename.push({
                sourceColumn: source,
                destColumn: prefixDestRight[source],
                prefix: true
            });
        }

        return dagData;
    }

    /**
     * Update the column/prefix rename list by checking conflicts in source columns
     * @param removeSet All column names(comprehensive) in the set will be removed from rename list, if they are optional(ie. no collision)
     * @description
     * This function does not take the current rename rules into account.
     * Call this function after joinType/source column changing
     */
    public updateRenameInfo(param?: { removeSet?: Set<string> }): void {
        if (this._needRenameByType(this.getJoinType())) {
            const { removeSet = new Set<string>() } = param || {};

            // Create sets of derived/prefix names, which will be ignored in optional rename list
            // It doesn't matter they are left or right, because
            // 1. If a name has collision: not in optional list
            // 2. If a name has no collision and remove from left: (no collision => not in right, remove from left => not in left) => not in list
            // 3. If a name has no collision and remove from right: (no collision => not in left, remove from right => not in right) => not in list
            // This is based on an assumption: columns not selected will not in rename list
            // If the assumption is broken, we have to revisit the code here.
            const removeCol = new Set<string>();
            const removePrefix = new Set<string>();
            removeSet.forEach((colName) => {
                const colMeta = this._columnMeta.leftMap.get(colName) || this._columnMeta.rightMap.get(colName);
                if (colMeta != null) {
                    if (colMeta.isPrefix) {
                        removePrefix.add(colMeta.prefix);
                    } else {
                        removeCol.add(colMeta.name);
                    }
                }
            });

            const colDestLeft = {};
            const prefixDestLeft = {};
            for (const rename of this._columnRename.left) {
                if (rename.isPrefix) {
                    prefixDestLeft[rename.source] = rename.dest;
                } else {
                    colDestLeft[rename.source] = rename.dest;
                }
            }

            const colDestRight = {};
            const prefixDestRight = {};
            for (const rename of this._columnRename.right) {
                if (rename.isPrefix) {
                    prefixDestRight[rename.source] = rename.dest;
                } else {
                    colDestRight[rename.source] = rename.dest;
                }
            }

            this._buildRenameInfo({
                colDestLeft: colDestLeft,
                prefixDestLeft: prefixDestLeft,
                colDestRight: colDestRight,
                prefixDestRight: prefixDestRight,
                ignoredNames: {
                    column: removeCol, prefix: removePrefix
                }
            });
        } else {
            this._clearRenames();
        }
    }

    /**
     * Update the selected columns according to current joinType and joinOn
     */
    public updateSelectedColumnInfo(): void {
        const { leftSelectable, rightSelectable } = this._buildSelectedColumns({
            leftColumnMetaMap: this._columnMeta.leftMap,
            rightColumnMetaMap: this._columnMeta.rightMap,
            joinType: this._joinType,
            joinOnPairs: this._joinColumnPairs,
            leftSelected: this._selectedColumns.left,
            rightSelected: this._selectedColumns.right
        });
        this._selectedColumns.left = leftSelectable;
        this._selectedColumns.right = rightSelectable;
    }

    public autoRenameColumn(
        renameInfo: JoinOpRenameInfo, orignName: string, isLeft: boolean
    ) {

        const nameMap = {};
        const {
            left: leftNames, right: rightNames
        } = this.getResolvedNames(renameInfo.isPrefix);

        if (isLeft) {
            removeName(leftNames, orignName);
        } else {
            removeName(rightNames, orignName);
        }
        const nameList = leftNames.concat(rightNames);
        for (const name of nameList) {
            nameMap[name.dest] = true;
        }

        const newName = xcHelper.autoName(orignName, nameMap,
            Object.keys(nameMap).length);
        renameInfo.dest = newName;

        function removeName(list, name) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].source === name) {
                    list.splice(i, 1);
                    return;
                }
            }
        }
    }

    /**
     * Get the list of conflicted names(based on origin name) and modified names
     * @param isPrefix true: return prefix names; false: return column names
     * @returns left and right name lists. In each lists, source is the origin name, dest is the modified name
     * @description the result list is sorted by dest ascending
     */
    public getResolvedNames(
        isPrefix: boolean
    ): {
        left: { source: string, dest: string }[],
        right: { source: string, dest: string }[]
    } {
        const result = { left: null, right: null };

        // Apply column selection
        const {
            leftColMetaMap, leftPrefixMetaMap,
            rightColMetaMap, rightPrefixMetaMap
        } = this._getMetaAfterColumnSelection();
        // Apply rename
        if (isPrefix) {
            const { prefixDestLeft, prefixDestRight } = this._getRenameMap(false);
            result.left = this._applyPrefixRename(
                leftPrefixMetaMap, prefixDestLeft
            ).map((r)=>({ source: r.source, dest: r.dest }));
            result.right = this._applyPrefixRename(
                rightPrefixMetaMap, prefixDestRight
            ).map((r)=>({ source: r.source, dest: r.dest }));
        } else {
            const { colDestLeft, colDestRight } = this._getRenameMap(false);
            result.left = this._applyColumnRename(
                leftColMetaMap, colDestLeft
            ).map((r)=>({ source: r.source, dest: r.dest }));
            result.right = this._applyColumnRename(
                rightColMetaMap, colDestRight
            ).map((r)=>({ source: r.source, dest: r.dest }));
        }

        return result;
    }

    /**
     * Get the conflicted names of columns and prefixes
     * @returns conflicted name map of column and prefix, the key is the origin name, the value is always true
     * @description The function checks name collision in each table and between tables
     */
    public getCollisionNames() {
        const result = {
            columnLeft: new Map<string, boolean>(),
            columnRight: new Map<string, boolean>(),
            prefixLeft: new Map<string, boolean>(),
            prefixRight: new Map<string, boolean>(),
        };
        if (!this._needRenameByType(this.getJoinType())) {
            return result;
        }

        const {
            colDestLeft, colDestRight, prefixDestLeft, prefixDestRight
        } = this._getRenameMap();

        // Apply column selection
        const {
            leftColMetaMap, leftPrefixMetaMap,
            rightColMetaMap, rightPrefixMetaMap
        } = this._getMetaAfterColumnSelection();

        // Apply renaming to left columns
        const leftColNames = this._applyColumnRename(
            leftColMetaMap, colDestLeft
        );
        // Check name conflicting inbetween left columns
        for (const [_, indexList] of this._checkCollisionInListByKey(leftColNames).entries()) {
            for (const index of indexList) {
                result.columnLeft.set(leftColNames[index].source, true);
            }
        }
        // Apply renaming to right columns
        const rightColNames = this._applyColumnRename(
            rightColMetaMap, colDestRight
        );
        // Check name conflicting inbetween right columns
        for (const [_, indexList] of this._checkCollisionInListByKey(rightColNames).entries()) {
            for (const index of indexList) {
                result.columnRight.set(rightColNames[index].source, true);
            }
        }
        // Check name conflicting between left and right
        for (const {i1, i2} of this._checkCollisionByKey(leftColNames, rightColNames)) {
            result.columnLeft.set(leftColNames[i1].source, true);
            result.columnRight.set(rightColNames[i2].source, true);
        }

        // Apply renaming to left prefixes
        const leftPrefixNames = this._applyPrefixRename(
            leftPrefixMetaMap, prefixDestLeft
        );
        // Check name conflicting inbetween left prefixes
        for (const [_, indexList] of this._checkCollisionInListByKey(leftPrefixNames).entries()) {
            for (const index of indexList) {
                result.prefixLeft.set(leftPrefixNames[index].source, true);
            }
        }
        // Apply renaming to right prefixes
        const rightPrefixNames = this._applyPrefixRename(
            rightPrefixMetaMap, prefixDestRight
        );
        // Check name conflicting inbetween left prefixes
        for (const [_, indexList] of this._checkCollisionInListByKey(rightPrefixNames).entries()) {
            for (const index of indexList) {
                result.prefixRight.set(rightPrefixNames[index].source, true);
            }
        }
        // Check name conflicting between left and right
        for (const {i1, i2} of this._checkCollisionByKey(leftPrefixNames, rightPrefixNames)) {
            result.prefixLeft.set(leftPrefixNames[i1].source, true);
            result.prefixRight.set(rightPrefixNames[i2].source, true);
        }

        return result;
    }

    public batchRename(options: {
        isLeft: boolean, isPrefix: boolean, suffix?: string
    }) {
        const { isLeft, isPrefix, suffix = '' } = options;
        const renameList = isLeft ? this._columnRename.left : this._columnRename.right;
        for (const renameInfo of renameList) {
            if (renameInfo.isPrefix === isPrefix) {
                renameInfo.dest = `${renameInfo.source}${suffix}`;
            }
        }
    }

    public addColumnPair(colPair?: JoinOpColumnPair) {
        let pairToAdd;
        if (colPair != null) {
            pairToAdd = Object.assign({}, colPair);
        } else {
            pairToAdd = this._getDefaultColumnPair();
        }
        this._joinColumnPairs.push(pairToAdd);
    }

    public removeColumnPair(index: number) {
        return this._joinColumnPairs.splice(index, 1);
    }

    public getColumnPairsLength() {
        return this._joinColumnPairs.length;
    }

    public getColumnPairs() {
        return this._joinColumnPairs.map( (pair) => {
            return Object.assign({}, pair);
        });
    }

    public getColumnMetaLeft() {
        return this._columnMeta.left.map( (col) => {
            return Object.assign({}, col);
        })
    }

    public getColumnMetaRight() {
        return this._columnMeta.right.map( (col) => {
            return Object.assign({}, col);
        })
    }

    /**
     * Get selected columns, which consist of selectable columns(user selected) and fixed columns(according to joinType)
     * @param selection
     * @description
     * All columns in the result are guaranteed to exist in columnMeta
     */
    public getSelectedColumns(): {
        leftSelectable: JoinOpColumnInfo[], rightSelectable: JoinOpColumnInfo[],
        leftFixed: JoinOpColumnInfo[], rightFixed: JoinOpColumnInfo[]
    } {
        const selected = this._getCleanSelectedColumns({
            leftColumnMetaMap: this._columnMeta.leftMap,
            rightColumnMetaMap: this._columnMeta.rightMap,
            joinOnPairs: this._joinColumnPairs,
            leftSelected: this._selectedColumns.left,
            rightSelected: this._selectedColumns.right
        });
        const fixed = this._getUnselectableColumns({
            joinType: this._joinType,
            leftJoinOn: selected.leftJoinOn,
            rightJoinOn: selected.rightJoinOn
        });

        return {
            leftSelectable: selected.leftSelected.map(nameToMetaLeft.bind(this)),
            leftFixed: fixed.left.map(nameToMetaLeft.bind(this)),
            rightSelectable: selected.rightSelected.map(nameToMetaRight.bind(this)),
            rightFixed: fixed.right.map(nameToMetaRight.bind(this))
        };

        function nameToMetaLeft(name: string): JoinOpColumnInfo {
            return Object.assign({}, this._columnMeta.leftMap.get(name));
        }
        function nameToMetaRight(name: string): JoinOpColumnInfo {
            return Object.assign({}, this._columnMeta.rightMap.get(name));
        }
    }

    /**
     * Get columns not selected
     * @description
     * All columns in the result are guaranteed to exist in columnMeta
     */
    public getUnSelectedColumns(): {
        leftSelectable: JoinOpColumnInfo[], rightSelectable: JoinOpColumnInfo[]
    } {
        const selectedCols = this.getSelectedColumns();
        const selectedLeft = new Set(selectedCols.leftFixed
            .concat(selectedCols.leftSelectable)
            .map((col)=>col.name));
        const selectedRight = new Set(selectedCols.rightFixed
            .concat(selectedCols.rightSelectable)
            .map((col)=>col.name));

        const result = { leftSelectable: [], rightSelectable: [] };
        for (const col of this._columnMeta.left) {
            if (!selectedLeft.has(col.name)) {
                result.leftSelectable.push(Object.assign({}, col));
            }
        }
        for (const col of this._columnMeta.right) {
            if (!selectedRight.has(col.name)) {
                result.rightSelectable.push(Object.assign({}, col));
            }
        }
        return result;
    }

    /**
     * Get selected columns, which consist of selectable columns(user selected) and fixed columns(according to joinType)
     * @param selection
     * @description
     * 1. All columns in the result are guaranteed to exist in columnMetaMaps
     * 2. Dup columns between fixed and selectable are removed from selectable list
     */
    private _buildSelectedColumns(param: {
        leftColumnMetaMap: Map<string, JoinOpColumnInfo>,
        rightColumnMetaMap: Map<string, JoinOpColumnInfo>,
        joinType: string,
        joinOnPairs: JoinOpColumnPair[],
        leftSelected: string[],
        rightSelected: string[],
    }): {
        leftSelectable: string[], rightSelectable: string[],
        leftFixed: string[], rightFixed: string[]
    } {
        // Deconstruct arguments
        const {
            leftColumnMetaMap, rightColumnMetaMap,
            joinType, joinOnPairs,
            leftSelected: leftSelectedRaw, rightSelected: rightSelectedRaw
        } = param;

        // Cleanup the joinOn and selected columns
        const {
            leftJoinOn, leftSelected, rightJoinOn, rightSelected
        } = this._getCleanSelectedColumns({
            leftColumnMetaMap: leftColumnMetaMap,
            rightColumnMetaMap: rightColumnMetaMap,
            joinOnPairs: joinOnPairs,
            leftSelected: leftSelectedRaw,
            rightSelected: rightSelectedRaw
        });

        // Get the fixed columns
        const {
            left: leftFixed, right: rightFixed
        } = this._getUnselectableColumns({
            joinType: joinType,
            leftJoinOn: leftJoinOn,
            rightJoinOn: rightJoinOn
        });

        return {
            leftSelectable: exclude(leftSelected, leftFixed),
            rightSelectable: exclude(rightSelected, rightFixed),
            leftFixed: leftFixed,
            rightFixed: rightFixed
        };

        // Helper functions
        function exclude(list: string[], excludeList: string[]) {
            // Return all items in list, except those in excludeList
            const nameSet = new Set(excludeList);
            return list.filter((v) => (!nameSet.has(v)))
                .map((v) => v);
        }
    }

    private _getUnselectableColumns(param: {
        joinType: string,
        leftJoinOn: string[],
        rightJoinOn: string[]
    }): { left: string[], right: string[] } {
        const { joinType, leftJoinOn, rightJoinOn } = param;
        const result = { left: [], right: [] };

        // XXX TODO: All columns should be selectable (wait for backend change)
        result.right = rightJoinOn.map((v) => v);
        result.left = leftJoinOn.map((v) => v);
        return result;
    }

    /**
     * Get selected columns after removing duplicate names in joinOn and columnSelected, and those not in column metadata
     * @param param
     */
    private _getCleanSelectedColumns(param: {
        leftColumnMetaMap: Map<string, JoinOpColumnInfo>,
        rightColumnMetaMap: Map<string, JoinOpColumnInfo>,
        joinOnPairs: JoinOpColumnPair[],
        leftSelected: string[],
        rightSelected: string[],
    }): {
        leftSelected: string[], rightSelected: string[],
        leftJoinOn: string[], rightJoinOn: string[]
    } {
        const {
            leftColumnMetaMap, rightColumnMetaMap,
            joinOnPairs,
            leftSelected, rightSelected
        } = param;

        const result = {
            leftSelected: [], rightSelected: [],
            leftJoinOn: [], rightJoinOn: []
        };
        const leftNameSet: Set<string> = new Set();
        const rightNameSet: Set<string> = new Set();
        for (const { leftName, rightName } of joinOnPairs) {
            if (leftColumnMetaMap.has(leftName) && !leftNameSet.has(leftName)) {
                result.leftJoinOn.push(leftName);
                leftNameSet.add(leftName);
            }
            if (rightColumnMetaMap.has(rightName) && !rightNameSet.has(rightName)) {
                result.rightJoinOn.push(rightName);
                rightNameSet.add(rightName);
            }
        }
        leftNameSet.clear();
        for (const colName of leftSelected) {
            if (leftColumnMetaMap.has(colName) && !leftNameSet.has(colName)) {
                result.leftSelected.push(colName);
                leftNameSet.add(colName);
            }
        }
        rightNameSet.clear();
        for (const colName of rightSelected) {
            if (rightColumnMetaMap.has(colName) && !rightNameSet.has(colName)) {
                result.rightSelected.push(colName);
                rightNameSet.add(colName);
            }
        }
        return result;
    }

    public addSelectedColumn(colName: { left?: string, right?: string }): void {
        const { left, right } = colName;

        if (left != null) {
            this._selectedColumns.left.push(left);
        }
        if (right != null) {
            this._selectedColumns.right.push(right);
        }
    }

    public removeSelectedColumn(colName: { left?: string, right?: string }): void {
        const { left, right } = colName;

        if (left != null) {
            const index = this._selectedColumns.left.indexOf(left);
            if (index >= 0) {
                this._selectedColumns.left.splice(index, 1);
            }
        }
        if (right != null) {
            const index = this._selectedColumns.right.indexOf(right);
            if (index >= 0) {
                this._selectedColumns.right.splice(index, 1);
            }
        }
    }

    public isCrossJoin() {
        return this.getJoinType() === JoinOperatorTStr[JoinOperatorT.CrossJoin];
    }

    public isValidEvalString() {
        const evalStr = this.getEvalString();
        return evalStr.length === 0
            || (evalStr.length > 0
                && evalStr.indexOf("(") >= 0
                && evalStr.indexOf(")") > 0);
    }

    public getPreviewTableNames() {
        return {
            left: this._previewTableNames.left,
            right: this._previewTableNames.right
        };
    }

    public getCurrentStep() {
        return this._currentStep;
    }

    public setCurrentStep(step: number) {
        this._currentStep = step;
    }

    public isNoCast() {
        return this._isNoCast;
    }

    public setNoCast(noCast: boolean) {
        this._isNoCast = noCast;
    }

    public setFixedType(fixedType: boolean) {
        this._isFixedType = fixedType;
    }

    public isFixedType(): boolean {
        return this._isFixedType;
    }

    public isAdvMode() {
        return this._isAdvMode;
    }

    public setAdvMode(advMode: boolean) {
        this._isAdvMode = advMode;
    }

    public getJoinType() {
        return this._joinType;
    }

    public setJoinType(type: string) {
        this._joinType = type;
    }

    /**
     * Set the joinType and rebuild related data.
     * (Note: Don't call this in the procedure of constructing an instance, as this function relies on other data and partial data could cause issue)
     * @param type the new joinType
     * @description
     * 1. JoinType will be changed
     * 2. rename will be changed(according to joinType)
     * 3. columnsToKeep will be changed(according to joinType)
     */
    public setJoinTypeAndRebuild(type: string) {
        const oldType = this.getJoinType();
        this.setJoinType(type);

        if (this._needRenameByType(type)) {
            if (!this._needRenameByType(oldType)) {
                // Rebuild rename infos when switching from noRename -> rename
                this._buildRenameInfo({
                    colDestLeft: {},
                    colDestRight: {},
                    prefixDestLeft: {},
                    prefixDestRight: {}
                });
            }
        } else {
            this._clearRenames();
        }

        // Rebuild the columnsToKeep according to different joinType
        // to make sure columnsToKeep only contains the selectable columns
        this.updateSelectedColumnInfo();
    }

    public getEvalString() {
        return this._evalString;
    }

    public setEvalString(str: string) {
        this._evalString = str;
    }

    public isNullSafe(): boolean {
        return this._nullSafe;
    }

    public setNullSafe(nullSafe: boolean): void {
        this._nullSafe = nullSafe;
    }

    public setOutputTableName(outputTableName: string): void {
        this._outputTableName = outputTableName;
    }
    // public isKeepAllColumns(): boolean {
    //     return this._keepAllColumns;
    // }

    // public setKeepAllColumns(keepAllColumns: boolean): void {
    //     this._keepAllColumns = keepAllColumns;
    // }

    public isLeftColumnsOnly(): boolean {
        const leftOnlyType: Set<string> = new Set([
            JoinOperatorTStr[JoinOperatorT.LeftSemiJoin],
            JoinOperatorTStr[JoinOperatorT.LeftAntiJoin]
        ]);
        return leftOnlyType.has(this.getJoinType());

    }

    public isCastNeed(colPair: JoinOpColumnPair) {
        if (this.isNoCast()) {
            return false;
        }
        if (colPair.leftName.length === 0 || colPair.rightName.length === 0) {
            return false;
        }
        return (colPair.leftCast !== colPair.rightCast);
    }

    public modifyColumnPairName(
        pairIndex: number,
        pairInfo: { left: string, right: string }
    ) {
        if (pairIndex >= this._joinColumnPairs.length) {
            console.error(`JoinOpPanelModel.modifyColumnPairName: pairIndex out of range(${pairIndex})`);
            return;
        }
        const { left: leftName, right: rightName } = pairInfo;
        if (leftName != null) {
            const colMeta = this._columnMeta.leftMap.get(leftName);
            if (colMeta != null) {
                this._joinColumnPairs[pairIndex].leftName = leftName;
                this._joinColumnPairs[pairIndex].leftCast = colMeta.type;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairName: lcolumn not exists(${leftName})`);
            }
        }
        if (rightName != null) {
            const colMeta = this._columnMeta.rightMap.get(rightName);
            if (colMeta != null) {
                this._joinColumnPairs[pairIndex].rightName = rightName;
                this._joinColumnPairs[pairIndex].rightCast = colMeta.type;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairName: rcolumn not exists(${rightName})`);
            }
        }
    }

    public modifyColumnPairCast(
        pairIndex: number,
        pairInfo: { left: ColumnType, right: ColumnType }
    ) {
        if (pairIndex >= this._joinColumnPairs.length) {
            console.error(`JoinOpPanelModel.modifyColumnPairCast: pairIndex out of range(${pairIndex})`);
            return;
        }
        const { left: leftCast, right: rightCast } = pairInfo;
        if (leftCast != null) {
            if (leftCast !== ColumnType.undefined) {
                this._joinColumnPairs[pairIndex].leftCast = leftCast;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairCast: lcast unknown(${leftCast})`);
            }
        }
        if (rightCast != null) {
            if (rightCast !== ColumnType.undefined) {
                this._joinColumnPairs[pairIndex].rightCast = rightCast;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairCast: rcast unknown(${rightCast})`);
            }
        }
    }

    public getRenames(options: {
        isLeft: boolean,
        isPrefix: boolean
    }) {
        const { isLeft, isPrefix } = options;
        const renames = isLeft ? this._columnRename.left : this._columnRename.right;
        return renames.filter( (v) => (v.isPrefix === isPrefix));
    }

    public isColumnDetached(colName: string, isLeft: boolean) {
        if (colName.length === 0) {
            return false;
        }
        return isLeft
            ? !this._columnMeta.leftMap.has(colName)
            : !this._columnMeta.rightMap.has(colName);
    }

    public isPrefixDetached(prefix: string, isLeft: boolean) {
        if (prefix.length === 0) {
            return false;
        }
        return isLeft
            ? !this._prefixMeta.leftMap.has(prefix)
            : !this._prefixMeta.rightMap.has(prefix);
    }

    private static _parseColumnPrefixMeta(
        columnList: ProgCol[]
    ) {
        const result:  {
            columnMeta: JoinOpColumnInfo[],
            prefixMeta: string[],
            columnLookup: Map<string, JoinOpColumnInfo>,
            prefixLookup: Map<string, string>
        } = {
            columnMeta: [],
            prefixMeta: [],
            columnLookup: new Map(),
            prefixLookup: new Map()
        };

        if (columnList == null || columnList.length === 0) {
            return result;
        }

        const prefixSet = {}; // Consists of all unique prefixes

        // List of columns
        for (const colInfo of columnList) {
            const isPrefix = (colInfo.prefix != null && colInfo.prefix.length > 0);
            result.columnMeta.push({
                name: colInfo.getBackColName(),
                type: colInfo.getType(),
                isPrefix: isPrefix,
                prefix: isPrefix ? colInfo.prefix : ''
            });
            if (isPrefix) {
                prefixSet[colInfo.prefix] = 1;
            }
        }
        this._sortColumnMeta(result.columnMeta);

        // List of prefixes
        for (const prefix of Object.keys(prefixSet)) {
            result.prefixMeta.push(prefix);
        }
        this._sortPrefixMeta(result.prefixMeta);

        // column name => index of columnMeta, for quick lookup
        for (const col of result.columnMeta) {
            result.columnLookup.set(col.name, col);
        }
        // prefix => index of prefixMeta, for quick lookup
        for (const prefix of result.prefixMeta) {
            result.prefixLookup.set(prefix, prefix);
        }

        return result;
    }

    private static _getColumnsFromDagNode(dagNode: DagNode) {
        const colList: ProgCol[] = [];
        try {
            if (dagNode != null) {
                for (const col of dagNode.getLineage().getColumns(false, true)) {
                    colList.push(col);
                }
            }
            return colList;
        } catch(e) {
            return colList;
        }
    }

    private static _getPreviewTableNameFromDagNode(dagNode: DagNode) {
        try {
            return dagNode.getTable();
        } catch {
            return null;
        }
    }

    private static _sortPrefixMeta(
        prefixList: string[]
    ) {
        prefixList.sort( (a, b) => {
            return (a > b) ? 1 : ( a < b ? -1 : 0);
        });
    }

    private static _sortColumnMeta(
        colList: JoinOpColumnInfo[]
    ) {
        colList.sort( (a, b) => {
            if (a.isPrefix === b.isPrefix) {
                return (a.name > b.name) ? 1 : ( a.name < b.name ? -1 : 0);
            } else {
                return a.isPrefix ? 1 : -1;
            }
        });
    }

    private _getDefaultColumnPair(): JoinOpColumnPair {
        return {
            leftName: '',
            leftCast: ColumnType.undefined ,
            rightName: '',
            rightCast: ColumnType.undefined
        };
    }

    private _needRenameByType(type: string): boolean {
        const noRenameType: Set<string> = new Set([
            JoinOperatorTStr[JoinOperatorT.LeftSemiJoin],
            JoinOperatorTStr[JoinOperatorT.LeftAntiJoin]
        ]);
        return !noRenameType.has(type);
    }
    /**
     * Abstracted algorithm of finding same values between two sorted arrays
     * @param list1
     * @param list2
     * @param checkFunc
     * @description Double pointers algorithm
     */
    private _checkCollision<T>(
        list1: T[],
        list2: T[],
        checkFunc: (a: T, b: T) => { eq: boolean, d1: number, d2: number }
    ): { i1: number, i2: number }[] {
        let index1 = 0;
        let index2 = 0;
        const len1 = list1.length;
        const len2 = list2.length;
        const result: {i1: number, i2: number}[] = [];
        while (index1 < len1 && index2 < len2) {
            const {eq, d1, d2} = checkFunc(list1[index1], list2[index2]);
            if (eq) {
                result.push({i1: index1, i2: index2});
            }
            index1 += d1;
            index2 += d2;
        }
        return result;
    }

    private _getRenameMap(isRenameEmpty: boolean = true) {
        const colDestLeft: { [source: string]: string } = {};
        const colDestRight: { [source: string]: string } = {};
        const prefixDestLeft: { [source: string]: string } = {};
        const prefixDestRight: { [source: string]: string } = {};

        for (const renameInfo of this._columnRename.left) {
            if (renameInfo.isPrefix) {
                prefixDestLeft[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            } else {
                colDestLeft[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            }
        }

        for (const renameInfo of this._columnRename.right) {
            if (renameInfo.isPrefix) {
                prefixDestRight[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            } else {
                colDestRight[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            }
        }

        return {
            colDestLeft: colDestLeft, colDestRight: colDestRight,
            prefixDestLeft: prefixDestLeft, prefixDestRight: prefixDestRight
        }
    }

    /**
     * Get the dest name of a renaming
     * @param renameInfo
     * @param isRenameEmpty true: fill an empty destName with sourceName
     * @returns The name after renaming. If renaming to ""(user didn't do renaming), returns the source name.
     */
    private _getRenameDest(renameInfo: JoinOpRenameInfo, isRenameEmpty: boolean = true): string {
        const { source, dest } = renameInfo;
        if (isRenameEmpty) {
            return (dest == null || dest.length === 0) ? source : dest;
        } else {
            return dest || '';
        }
    }

    private _applyColumnRename(
        columnMetaMap: Map<string, JoinOpColumnInfo>,
        colRename: { [source: string]: string },
        isApplyToKey: boolean = true
    ) {
        const renameMap = Object.assign({}, colRename);
        const result: { source: string, dest: string, key: string }[] = [];
        if (columnMetaMap != null) {
            for (const [source, colMeta] of columnMetaMap.entries()) {
                if (!colMeta.isPrefix) {
                    const dest = renameMap[source];
                    if (dest != null) {
                        result.push({
                            source: source,
                            dest: dest,
                            key: isApplyToKey? dest: source
                        });
                        delete renameMap[source];
                    } else {
                        result.push({
                            source: source,
                            dest: '',
                            key: source
                        });
                    }
                }
            }
        }
        result.sort( (a, b) => {
            const av = a.key;
            const bv = b.key;
            return av > bv ? 1 : (av < bv ? -1 : 0);
        });

        return result;
    }

    private _applyPrefixRename(
        prefixMetaMap: Map<string, string>,
        prefixRename: { [source: string]: string },
        isApplyToKey: boolean = true
    ) {
        const renameMap = Object.assign({}, prefixRename);
        const result: { source: string, dest: string, key: string }[] = [];
        if (prefixMetaMap != null) {
            for (const [source] of prefixMetaMap.entries()) {
                const dest = renameMap[source];
                if (dest != null) {
                    result.push({
                        source: source,
                        dest: dest,
                        key: isApplyToKey? dest: source
                    });
                    delete renameMap[source];
                } else {
                    result.push({
                        source: source,
                        dest: '',
                        key: source
                    });
                }
            }
        }
        result.sort( (a, b) => {
            const av = a.key;
            const bv = b.key;
            return av > bv ? 1 : (av < bv ? -1 : 0);
        });

        return result;
    }

    private _checkCollisionInListByKey(list: { key: string }[]): Map<string, number[]> {
        const keyIndexMap = new Map<string, number[]>();
        list.forEach(({ key }, index) => {
            if (keyIndexMap.has(key)) {
                keyIndexMap.get(key).push(index);
            } else {
                keyIndexMap.set(key, [index]);
            }
        });

        const result = new Map<string, number[]>();
        for (const [key, indexList] of keyIndexMap.entries()) {
            if (indexList.length > 1) {
                result.set(key, [].concat(indexList));
            }
        }
        return result;
    }

    private _checkCollisionByKey(
        list1: { key: string }[],
        list2: { key: string }[]
    ): { i1: number, i2: number }[] {
        return this._checkCollision(list1, list2,
            (a, b) => {
                const av = a.key;
                const bv = b.key;
                const result = { eq: false, d1: 0, d2: 0 };
                if (av > bv) {
                    result.d2 = 1;
                } else if (av < bv) {
                    result.d1 = 1;
                } else {
                    result.d1 = 1;
                    result.d2 = 1;
                    result.eq = true;
                }
                return result;
            }
        );
    }

    private _clearRenames(): void {
        this._columnRename = { left: [], right: [] };
    }

    private _getMetaAfterColumnSelection(): {
        leftColMetaMap: Map<string, JoinOpColumnInfo>,
        rightColMetaMap: Map<string, JoinOpColumnInfo>,
        leftPrefixMetaMap: Map<string, string>,
        rightPrefixMetaMap: Map<string, string>
    } {
        // ColumnMeta&PrefixMeta map after column selection
        const leftColMetaMap: Map<string, JoinOpColumnInfo> = new Map();
        const rightColMetaMap: Map<string, JoinOpColumnInfo> = new Map();
        const leftPrefixMetaMap: Map<string, string> = new Map();
        const rightPrefixMetaMap: Map<string, string> = new Map();

        // Get selected columns and unselectable(always selected) columns
        const {
            leftSelected, leftJoinOn, rightSelected, rightJoinOn
        } = this._getCleanSelectedColumns({
            leftColumnMetaMap: this._columnMeta.leftMap,
            rightColumnMetaMap: this._columnMeta.rightMap,
            joinOnPairs: this._joinColumnPairs,
            leftSelected: this._selectedColumns.left,
            rightSelected: this._selectedColumns.right
        });
        const {
            left: leftFixed, right: rightFixed
        } = this._getUnselectableColumns({
            joinType: this._joinType,
            leftJoinOn: leftJoinOn,
            rightJoinOn: rightJoinOn
        });

        // Left columns
        for (const colName of leftSelected.concat(leftFixed)) {
            const colInfo = this._columnMeta.leftMap.get(colName);
            if (colInfo != null) {
                leftColMetaMap.set(colName, Object.assign({}, colInfo));
                if (colInfo.isPrefix) {
                    leftPrefixMetaMap.set(colInfo.prefix, colInfo.prefix);
                }
            }
        }
        // Right columns
        for (const colName of rightSelected.concat(rightFixed)) {
            const colInfo = this._columnMeta.rightMap.get(colName);
            if (colInfo != null) {
                rightColMetaMap.set(colName, Object.assign({}, colInfo));
                if (colInfo.isPrefix) {
                    rightPrefixMetaMap.set(colInfo.prefix, colInfo.prefix);
                }
            }
        }

        return {
            leftColMetaMap: leftColMetaMap,
            rightColMetaMap: rightColMetaMap,
            leftPrefixMetaMap: leftPrefixMetaMap,
            rightPrefixMetaMap: rightPrefixMetaMap
        };
    }

    /**
     * Rebuild the column rename list by comparing the source columns
     * @param dest
     */
    private _buildRenameInfo(dest: { // This argument is ignored right now!!!
        colDestLeft: { [source: string]: string },
        colDestRight: { [source: string]: string },
        prefixDestLeft: { [source: string]: string },
        prefixDestRight: { [source: string]: string },
        ignoredNames?: {
            column?: Set<string>, prefix?: Set<string>,
        }
    }): void {
        const {
            colDestLeft,
            colDestRight,
            prefixDestLeft,
            prefixDestRight,
            ignoredNames = {}
        } = dest;
        const {
            column: ignoredColumn = new Set<string>(),
            prefix: ignoredPrefix = new Set<string>(),
        } = ignoredNames;

        // Cleanup
        this._columnRename = { left: [], right: [] };

        // ColumnMeta & PrefixMeta map after column selection
        const {
            leftColMetaMap, rightColMetaMap,
            leftPrefixMetaMap, rightPrefixMetaMap
        } = this._getMetaAfterColumnSelection();

        // Columns need to rename
        const leftColNames = this._applyColumnRename(
            leftColMetaMap, colDestLeft, false
        );
        const rightColNames = this._applyColumnRename(
            rightColMetaMap, colDestRight, false
        );
        // Now we only check duplicate source column names, instead of those after renaming
        // Change isApplyToKey = true when calling _applyColumnRename(),
        // in case we want to check dup names after renaming.
        const leftColRenamed = new Set<string>();
        const rightColRenamed = new Set<string>();
        const columnCollisions = this._checkCollisionByKey(
            leftColNames, rightColNames
        );
        for (const { i1, i2 } of columnCollisions) {
            const { source: leftSource, dest: leftDest } = leftColNames[i1];
            this._columnRename.left.push({
                source: leftSource,
                dest: leftDest,
                isPrefix: false
            });
            leftColRenamed.add(leftSource);
            const { source: rightSource, dest: rightDest } = rightColNames[i2];
            this._columnRename.right.push({
                source: rightSource,
                dest: rightDest,
                isPrefix: false
            });
            rightColRenamed.add(rightSource);
        }
        // Optional columns:
        // not having collision, but still need to rename
        // ex. manually added in advanced form
        Object.entries(colDestLeft).forEach(([source, dest]) => {
            if (ignoredColumn.has(source)) {
                return;
            }
            if (!leftColRenamed.has(source) && leftColMetaMap.has(source)) {
                this._columnRename.left.push({
                    source: source, dest: dest, isPrefix: false
                });
            }
        });
        Object.entries(colDestRight).forEach(([source, dest]) => {
            if (ignoredColumn.has(source)) {
                return;
            }
            if (!rightColRenamed.has(source) && rightColMetaMap.has(source)) {
                this._columnRename.right.push({
                    source: source, dest: dest, isPrefix: false
                });
            }
        })

        // Prefixes need to rename
        const leftPrefixNames = this._applyPrefixRename(
            leftPrefixMetaMap, prefixDestLeft, false
        );
        const rightPrefixNames = this._applyPrefixRename(
            rightPrefixMetaMap, prefixDestRight, false
        );
        // Now we only check duplicate prefixes, instead of those after renaming
        // Change isApplyToKey = true when calling _applyPrefixRename(),
        // in case we want to check dup names after renaming.
        const leftPrefixRenamed = new Set<string>();
        const rightPrefixRenamed = new Set<string>();
        const prefixCollisions = this._checkCollisionByKey(
            leftPrefixNames, rightPrefixNames
        );
        for (const { i1, i2 } of prefixCollisions) {
            const { source: leftSource, dest: leftDest } = leftPrefixNames[i1];
            this._columnRename.left.push({
                source: leftSource,
                dest: leftDest,
                isPrefix: true
            });
            leftPrefixRenamed.add(leftSource);
            const { source: rightSource, dest: rightDest } = rightPrefixNames[i2];
            this._columnRename.right.push({
                source: rightSource,
                dest: rightDest,
                isPrefix: true
            });
            rightPrefixRenamed.add(rightSource);
        }
        // Optional prefixes
        Object.entries(prefixDestLeft).forEach(([source, dest]) => {
            if (ignoredPrefix.has(source)) {
                return;
            }
            if (!leftPrefixRenamed.has(source) && leftPrefixMetaMap.has(source)) {
                this._columnRename.left.push({
                    source: source, dest: dest, isPrefix: true
                });
            }
        });
        Object.entries(prefixDestRight).forEach(([source, dest]) => {
            if (ignoredPrefix.has(source)) {
                return;
            }
            if (!rightPrefixRenamed.has(source) && rightPrefixMetaMap.has(source)) {
                this._columnRename.right.push({
                    source: source, dest: dest, isPrefix: true
                });
            }
        });


        // Auto-rename everything in the rename list
        this._columnRename.left.forEach((renameInfo) => {
            if (!renameInfo.dest || renameInfo.dest.length === 0) {
                this.autoRenameColumn(renameInfo, renameInfo.source, true);
            }
        });
        this._columnRename.right.forEach((renameInfo) => {
            if (!renameInfo.dest || renameInfo.dest.length === 0) {
                this.autoRenameColumn(renameInfo, renameInfo.source, false);
            }
        });
    }

    public static refreshColumns(oldModel, dagNode: DagNodeJoin) {
        const oldDagData = oldModel.toDag();
        const {left: leftCols, right: rightCols} = this.getColumnsFromDag(dagNode);
        const {
            left: leftTableName, right: rightTableName
        } = this.getPreviewTableNamesFromDag(dagNode);

        const model = this.fromDagInput(
            leftCols,rightCols, oldDagData,
            leftTableName, rightTableName,
            {
                currentStep: oldModel._currentStep,
                isAdvMode: oldModel._isAdvMode,
                isNoCast: oldModel._isNoCast,
                isFixedType: oldModel._isFixedType
            }
        );

        if (model.getColumnPairsLength() === 0) {
            model.addColumnPair();
        }

        return model;
    }
}

enum JoinOpError {
    ColumnTypeLenMismatch = 'ColumnTypeLenMismatch',
    InvalidEvalString = 'InvalidEvalString',
    NeedTypeCast = 'NeedTypeCast',
    InvalidJoinClause = 'InvalidJoinClause',
    ColumnNameConflict = 'ConlumnNameConflict',
    PrefixConflict = 'PrefixConflict',
    InvalidJoinType = 'InvalidJoinType',
}