class JupyterOpPanelModel extends BaseOpPanelModel {
    private _numExportRows: number;
    private _numMaxRows: number;
    private _numMinRows: number;
    private _renames: { sourceColumn: string, destColumn: string }[];
    private _fixedNames: string[];

    public constructor() {
        super();
        const maxRows = 1000;
        this._numMaxRows = maxRows;
        this._numMinRows = 1;
        this._numExportRows = maxRows;
        this._renames = [];
        this._fixedNames = [];
        this._allColMap = new Map();
    }

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeJupyter): JupyterOpPanelModel {
        try {
            const colMap: Map<string, ProgCol> = this._createColMap(dagNode);
            return this.fromDagInput(colMap, dagNode.getParam());
        } catch(e) {
            console.error(e);
            return new this();
        }
    }

    /**
     * Create data model instance from column list & DagNodeInput
     * @param colMap
     * @param dagInput
     * @description use case: advanced from
     */
    public static fromDagInput(
        colMap: Map<string, ProgCol>, dagInput: DagNodeJupyterInputStruct
    ): JupyterOpPanelModel {
        const model = new this();

        model._title = OpPanelTStr.JupyterPanelTitle;
        model._instrStr = OpPanelTStr.JupyterPanelInstr;
        model._allColMap = colMap;

        model._numExportRows = dagInput.numExportRows;

        // Figure out columns can/cannot be renamed, according to the current lineage
        const colsCanRename = new Set<string>();
        const existingNameCount = new Map<string, number>();
        for (const [colName, colInfo] of colMap.entries()) {
            if (!model._canRename(colInfo)) {
                model._fixedNames.push(colName);
                existingNameCount.set(colName, 1);
            } else {
                colsCanRename.add(colName);
            }
        }

        // Apply renames
        const renameMap = new Map<string, string>();
        for (const { sourceColumn, destColumn } of dagInput.renames) {
            renameMap.set(sourceColumn, destColumn);
        }
        for (const origName of colsCanRename) {
            const newName = renameMap.get(origName)
                || xcHelper.parsePrefixColName(origName).name;
            model._renames.push({
                sourceColumn: origName, destColumn: newName
            });
            const nameCount = existingNameCount.get(newName);
            if (nameCount == null) {
                existingNameCount.set(newName, 1);
            } else {
                existingNameCount.set(newName, nameCount + 1);
            }
        }
        for (let i = 0; i < model._renames.length; i ++) {
            const rename = model._renames[i];
            const nameCount = existingNameCount.get(rename.destColumn);
            if (nameCount > 1) {
                const newName = model._genColumnName(
                    rename.destColumn, new Set(existingNameCount.keys()));
                existingNameCount.set(rename.destColumn, nameCount - 1);
                existingNameCount.set(newName, 1);
                rename.destColumn = newName;
            }
        }

        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeJupyterInputStruct {
        const allRenames: { sourceColumn: string, destColumn: string }[] = [];
        for (const colName of this._fixedNames) {
            allRenames.push({ sourceColumn: colName, destColumn: colName });
        }
        for (const rename of this._renames) {
            allRenames.push({
                sourceColumn: rename.sourceColumn, destColumn: rename.destColumn
            });
        }

        const param: DagNodeJupyterInputStruct = {
            numExportRows: this.getNumExportRows(),
            renames: allRenames
        };

        return param;
    }

    /**
     * Validate data fields related to DagNodeInput
     */
    public validateInputData(): void {
        // number of rows
        const numExportRows = this.getNumExportRows();
        const numMaxRows = this.getNumMaxRows();
        const numMinRows = this.getNumMinRows();
        if (numExportRows == null || numExportRows < numMinRows || numExportRows > numMaxRows) {
            throw new Error(`Number of resultant rows must greater than or equal to ${numMinRows}, and less than or equal to ${numMaxRows}`);
        }

        // Renames
        const allSourceColumns = this.getColumnMap();
        const colNameSet = new Set<string>();
        // Columns don't rename
        for (const colName of this._fixedNames) {
            colNameSet.add(colName);
        }
        // Columns after rename
        for (const { sourceColumn, destColumn } of this._renames) {
            // source column name
            if (sourceColumn == null || sourceColumn.length === 0) {
                throw new Error('Source column name cannot be empty');
            }
            if (!allSourceColumns.has(sourceColumn)) {
                throw new Error(`Source column ${sourceColumn} doesn't exist`);
            }
            if (sourceColumn !== destColumn
                && !this._canRename(allSourceColumns.get(sourceColumn))) {
                throw new Error(`Cannot rename column ${sourceColumn}`);
            }

            // dest column name
            if (destColumn == null || destColumn.length === 0) {
                throw new Error('Resultant column name cannot be empty');
            }
            if (xcHelper.parsePrefixColName(destColumn).prefix.length > 0) {
                throw new Error(`Resultant column name cannot have prefix`);
            }
            if (colNameSet.has(destColumn)) {
                throw new Error(`Duplicate column ${destColumn}`);
            }

            colNameSet.add(destColumn);
        }
    }

    public getNumMaxRows(): number {
        return this._numMaxRows;
    }

    public getNumMinRows(): number {
        return this._numMinRows;
    }

    public getNumExportRows(): number {
        return this._numExportRows;
    }

    public setNumExportRows(num: number): void {
        this._numExportRows = num;
    }

    public getFixedColumns(): { name: string, type: ColumnType }[] {
        const colMap = this.getColumnMap();
        return this._fixedNames.map((colName) => ({
            name: colName, type: colMap.get(colName).getType()
        }));
    }

    public getRenames(): {
        sourceColumn: { name: string, type: ColumnType },
        destColumn: string
    }[] {
        const colMap = this.getColumnMap();
        return this._renames.map((rename) => ({
            sourceColumn: {
                name: rename.sourceColumn,
                type: colMap.get(rename.sourceColumn).getType()
            },
            destColumn: rename.destColumn
        }));
    }

    public setRename(idx: number, destName: string): void {
        if (idx >= this._renames.length) {
            return;
        }
        this._renames[idx].destColumn = destName;
    }

    public getColNameSet(): Set<string> {
        return new Set(this.getColumnMap().keys());
    }

    public getColumnsAfterRename(exceptRenameIdx: number): Set<string> {
        const colNameSet = new Set<string>();
        // Columns don't rename
        for (const col of this.getFixedColumns()) {
            colNameSet.add(col.name);
        }
        // Columns after rename
        this.getRenames().forEach(({ destColumn }, idx) => {
            if (idx !== exceptRenameIdx) {
                colNameSet.add(destColumn);
            }
        });
        return colNameSet;
    }

    public static refreshColumns(model, dagNode: DagNode) {
        model._allColMap = this._createColMap(dagNode);

        // Figure out columns can/cannot be renamed, according to the current lineage
        const colsCanRename = new Set<string>();
        const existingNameCount = new Map<string, number>();
        model._fixedNames = [];
        for (const [colName, colInfo] of model._allColMap.entries()) {
            if (!model._canRename(colInfo)) {
                model._fixedNames.push(colName);
                existingNameCount.set(colName, 1);
            } else {
                colsCanRename.add(colName);
            }
        }
        const allRenames: { sourceColumn: string, destColumn: string }[] = [];
        for (const colName of model._fixedNames) {
            allRenames.push({ sourceColumn: colName, destColumn: colName });
        }
        for (const rename of model._renames) {
            allRenames.push({
                sourceColumn: rename.sourceColumn, destColumn: rename.destColumn
            });
        }

        // Apply renames
        const renameMap = new Map<string, string>();
        for (const { sourceColumn, destColumn } of allRenames) {
            renameMap.set(sourceColumn, destColumn);
        }
        model._renames = [];
        for (const origName of colsCanRename) {
            const newName = renameMap.get(origName)
                || xcHelper.parsePrefixColName(origName).name;
            model._renames.push({
                sourceColumn: origName, destColumn: newName
            });
            const nameCount = existingNameCount.get(newName);
            if (nameCount == null) {
                existingNameCount.set(newName, 1);
            } else {
                existingNameCount.set(newName, nameCount + 1);
            }
        }
        for (let i = 0; i < model._renames.length; i ++) {
            const rename = model._renames[i];
            const nameCount = existingNameCount.get(rename.destColumn);
            if (nameCount > 1) {
                const newName = model._genColumnName(
                    rename.destColumn, new Set(existingNameCount.keys()));
                existingNameCount.set(rename.destColumn, nameCount - 1);
                existingNameCount.set(newName, 1);
                rename.destColumn = newName;
            }
        }

        return model;
    }

    private _genColumnName(
        origName: string, existingColNames: Set<string>
    ): string {
        const limit = 20; // we won't try more than 20 times
        origName = origName.replace(/\s/g, '');
        origName = xcHelper.parsePrefixColName(origName).name;

        let newName = origName;
        let tries = 0;
        while (tries < limit && existingColNames.has(newName)) {
            tries++;
            newName = `${origName}${tries}`;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(origName);
        }

        return newName;

    }

    private _canRename(_colInfo: ProgCol): boolean {
        // Keep this function, in case we want to recover the old hehavior
        return true;
        // const colType = colInfo.getType();
        // return colType !== ColumnType.array && colType !== ColumnType.object;
    }
}