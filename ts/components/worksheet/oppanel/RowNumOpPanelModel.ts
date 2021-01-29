class RowNumOpPanelModel extends BaseOpPanelModel {
    private _destColumn: string = '';
    private _outputTableName: string = "";

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeRowNum, ignoreError?: boolean): RowNumOpPanelModel {
        try {
            const colMap: Map<string, ProgCol> = this._createColMap(dagNode);
            return this.fromDagInput(colMap, dagNode.getParam(), ignoreError);
        } catch(e) {
            throw e;
        }
    }

    /**
     * Create data model instance from column list & DagNodeInput
     * @param colMap
     * @param dagInput
     * @description use case: advanced from
     */
    public static fromDagInput(
        colMap: Map<string, ProgCol>, dagInput: DagNodeRowNumInputStruct, ignoreError?: boolean
    ): RowNumOpPanelModel {
        const model = new this();

        model._title = OpPanelTStr.RowNumPanelTitle;
        model._instrStr = OpPanelTStr.RowNumPanelInstr;
        model._allColMap = colMap;

        try {
            // input validation
            if (dagInput.newField == null) {
                throw new Error('Dest column cannot be null');
            }
        } catch (e) {
            if (!ignoreError) {
                throw e;
            }
        }

        model._destColumn = dagInput.newField;
        model._outputTableName = dagInput.outputTableName;
        return model;
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeRowNumInputStruct {
        const param: DagNodeRowNumInputStruct = {
            newField: this.getDestColumn(),
            outputTableName: this._outputTableName
        };
        return param;
    }

    /**
     * Validate data fields related to DagNodeInput
     */
    public validateInputData(): void {
        const destColumn = this.getDestColumn();
        if (destColumn == null || destColumn.length === 0) {
            throw new Error('New column name cannot be empty');
        }
        if (xcHelper.parsePrefixColName(destColumn).prefix.length > 0) {
            throw new Error(`New column name cannot have prefix`);
        }
        if (this.getColNameSet().has(destColumn)) {
            throw new Error(`Duplicate column ${destColumn}`);
        }
    }

    public getColNameSet(): Set<string> {
        return new Set(this._allColMap.keys());
    }

    public getDestColumn(): string {
        return this._destColumn;
    }

    public setDestColumn(colName: string): void {
        this._destColumn = colName;
    }
}