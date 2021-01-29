class RoundOpPanelModel extends BaseOpPanelModel {
    private _sourceColumn: string = '';
    private _destColumn: string = '';
    private _numDecimals: number = 0;
    private _includeErrRow: boolean = false;
    private _outputTableName: string = "";
    private static _funcName = 'round';

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeRound, ignoreError?: boolean): RoundOpPanelModel {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeMapInputStruct, ignoreError?: boolean
    ): RoundOpPanelModel {

        const model = new this();

        model._title = OpPanelTStr.RoundPanelTitle;
        model._instrStr = OpPanelTStr.RoundPanelInstr;
        model._instrStrTip = OpPanelTStr.RoundPanelInstrTip;
        model._allColMap = colMap;

        try {
             // input validation
            if (dagInput.eval == null) {
                throw new Error('Eval string cannot be null');
            }

            const evalObj = dagInput.eval[0];
            const evalFunc = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);

            if (evalFunc["error"]) {
                throw evalFunc.error;
            }

            // Function name should be 'round'
            if (evalFunc.fnName !== this._funcName) {
                throw new Error(`Invalid function name(${evalFunc.fnName})`);
            }

            // Source column
            let evalParam = evalFunc.args[0];
            if (!isTypeEvalArg(evalParam)) {
                throw new Error('Invalid column name');
            }
            model._sourceColumn = evalParam.value;

            // Num decimals
            evalParam = evalFunc.args[1];
            if (!isTypeEvalArg(evalParam)) {
                throw new Error('Invalid num decimals');
            }
            model._numDecimals = Number(evalParam.value);
            if (Number.isNaN(model._numDecimals)) {
                throw new Error('Invalid num decimals');
            }

            // Dest column
            model._destColumn = evalObj.newField;

            // icv
            model._includeErrRow = dagInput.icv;
            model._outputTableName = dagInput.outputTableName;
        } catch(e) {
            model._sourceColumn = '';
            model._numDecimals = 0;
            model._destColumn = '';
            model._includeErrRow = false;
            model._outputTableName = "";
            if (!ignoreError) {
                throw e;
            }
        }

        return model;

        function isTypeEvalArg(arg: ParsedEvalArg|ParsedEval): arg is ParsedEvalArg {
            return arg != null && arg.type !== 'fn';
        }
    }

    /**
     * Generate DagNodeInput from data model
     */
    public toDagInput(): DagNodeMapInputStruct {
        const param: DagNodeMapInputStruct = {
            eval: [{
                evalString: `${RoundOpPanelModel._funcName}(${this.getSourceColumn()},${this.getNumDecimals()})`,
                newField: this.getDestColumn()
            }],
            icv: this.isIncludeErrRow(),
            outputTableName: this._outputTableName
        };

        return param;
    }

    public autofillEmptyDestColumn(): void {
        if (this.getSourceColumn().length === 0 || this.getDestColumn().length > 0) {
            return
        }

        const colPrefix = xcHelper.parsePrefixColName(this.getSourceColumn()).name;
        // const autoName = this._genColName(colPrefix);
        this.setDestColumn(colPrefix);
    }

    /**
     * Validate the data fields related to the DagNodeInput
     */
    public validateInputData(): void {
        // source column
        const sourceColumn = this.getSourceColumn();
        if (sourceColumn == null || sourceColumn.length === 0) {
            throw new Error('Source column cannot be empty');
        }
        if (!this.getColNameSet().has(sourceColumn)) {
            throw new Error('Source column does not exist');
        }

        // Num of decimals
        const numDecimals = this.getNumDecimals();
        if (numDecimals == null || numDecimals < 0) {
            throw new Error('Invalid num of decimals');
        }

        // Dest columns
        const destColumn = this.getDestColumn();
        if (destColumn == null || destColumn.length === 0) {
            throw new Error('Dest column cannot be empty');
        }
        if (xcHelper.parsePrefixColName(destColumn).prefix.length > 0) {
            throw new Error('Dest column cannot have prefix');
        }
    }

    public getColNameSet(): Set<string> {
        return new Set(this.getColumnMap().keys());
    }

    public getSourceColumn(): string {
        return this._sourceColumn;
    }

    public setSourceColumn(colName: string): void {
        this._sourceColumn = colName;
    }

    public getDestColumn(): string {
        return this._destColumn;
    }

    public setDestColumn(colName: string): void {
        this._destColumn = colName;
    }

    public getNumDecimals(): number {
        return this._numDecimals;
    }

    public setNumDecimals(num: number): void {
        this._numDecimals = num;
    }

    public setIncludeErrRow(isInclude: boolean): void {
        this._includeErrRow = isInclude;
    }

    public isIncludeErrRow(): boolean {
        return this._includeErrRow;
    }

    // private _genColName(prefix: string) {
    //     const allCols = this.getColNameSet();

    //     let result: string = '';
    //     for (let retry = 1; retry <= 50; retry ++) {
    //         result = `${prefix}-round-${retry}`;
    //         if (!allCols.has(result)) {
    //             break;
    //         }
    //     }

    //     return result;
    // }
}