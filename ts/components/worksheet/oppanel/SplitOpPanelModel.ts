class SplitOpPanelModel extends BaseOpPanelModel {
    private _delimiter: string = '';
    private _sourceColName: string = '';
    private _destColNames: string[] = [];
    private _includeErrRow: boolean = false;
    private _outputTableName: string = "";
    private static _funcName = 'cut';

    /**
     * Create data model instance from DagNode
     * @param dagNode
     */
    public static fromDag(dagNode: DagNodeSplit, ignoreError?: boolean): SplitOpPanelModel {
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
        colMap: Map<string, ProgCol>, dagInput: DagNodeMapInputStruct,
        ignoreError?: boolean
    ): SplitOpPanelModel {

        const model = new this();
        model._title = OpPanelTStr.SplitPanelTitle;
        model._instrStr = OpPanelTStr.SplitPanelInstr;
        model._allColMap = colMap;

        try {
            // Validate inputs
            if (dagInput.eval == null) {
                throw new Error('Eval string cannot be null');
            }

            let sourceColumn: string = '';
            let delimiter: string = '';
            const destColumns: Map<string, string> = new Map(); // cutIndex => columnName
            let maxIndex = 0;
            for (const evalObj of dagInput.eval) {
                if (evalObj.evalString.trim().length == 0) {
                    continue;
                }
                const evalFunc = XDParser.XEvalParser.parseEvalStr(evalObj.evalString);

                if (evalFunc["error"]) {
                    throw evalFunc.error;
                }

                // Function name should be 'cut'
                if (evalFunc.fnName !== this._funcName) {
                    throw new Error(`Invalid function name(${evalFunc.fnName})`);
                }

                // Source column
                let evalParam = evalFunc.args[0];
                if (!isTypeEvalArg(evalParam)) {
                    throw new Error('Invalid column name');
                }
                if (sourceColumn == null || sourceColumn.length === 0) {
                    // First evalObj in eval list
                    sourceColumn = evalParam.value;
                } else if (sourceColumn !== evalParam.value) {
                    // The rest column name should match the first one
                    throw new Error('Multiple source columns');
                }

                // Index
                // The index of dest column depends on the arg in the cut function
                // Ex. cut(books::title, 2, 'title2') => _destColNames[1] = 'title2'
                evalParam = evalFunc.args[1];
                if (!isTypeEvalArg(evalParam)) {
                    throw new Error('Invalid index');
                }
                const index = Number(evalParam.value);
                if (index <= 0) {
                    throw new Error('Index out of range');
                }

                // Delimiter
                evalParam = evalFunc.args[2];
                if (!isTypeEvalArg(evalParam)) {
                    throw new Error('Invalid delimiter');
                }
                let dem = evalParam.value;
                dem = dem.substring(1, dem.length - 1);
                dem = dem.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                if (delimiter == null || delimiter.length === 0) {
                    delimiter = dem;
                } else if (delimiter !== dem) {
                    throw new Error('Multiple delimiters');
                }

                // Dest column
                maxIndex = Math.max(maxIndex, index);
                destColumns.set(`${index}`, evalObj.newField);
            }

            // Source column
            model._sourceColName = sourceColumn;
            // Delimiter
            model._delimiter = delimiter;
            // Dest columns
            model._destColNames = new Array(maxIndex).fill('');
            for (const [strIndex, colName] of destColumns.entries()) {
                model._destColNames[Number(strIndex) - 1] = colName || '';
            }
            // icv
            model._includeErrRow = dagInput.icv;
            model._outputTableName = dagInput.outputTableName;
        } catch(e) {

            // If anything goes wrong, reset the model and popup the error(for adv. form)
            model._sourceColName = '';
            model._delimiter = '';
            model._destColNames = [''];
            model._includeErrRow = false;
            model._outputTableName = "";
            if (!ignoreError) {
                throw e;
            }
        }

        if (model._destColNames.length === 0) {
            model._destColNames = [''];
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
        const func = SplitOpPanelModel._funcName;
        const sourceColumn = this.getSourceColName();
        const delimiter = this.getDelimiter()
            .replace(/\\/g, '\\\\')
            .replace(/\"/g, '\\"');

        const evalList = [];
        const destColumns = this.getDestColNames();
        for (let index = 0; index < destColumns.length; index ++) {
            const destColumn = destColumns[index];
            if (destColumn == null || destColumn.length === 0) {
                continue; // Skip empty dest columns
            }
            evalList.push({
                evalString: `${func}(${sourceColumn},${index + 1},"${delimiter}")`,
                newField: destColumn
            });
        }

        const param: DagNodeMapInputStruct = {
            eval: evalList,
            icv: this.isIncludeErrRow(),
            outputTableName: this._outputTableName
        };

        return param;
    }

    public getColNameSetWithNew(excludeIndex: number): Set<string> {
        const nameSet = new Set(this.getColumnMap().keys());
        this.getDestColNames().forEach((name, i) => {
            if (i !== excludeIndex) {
                nameSet.add(name);
            }
        })
        return nameSet;
    }

    /**
     * Validate the data fields related to the DagNodeInput
     */
    public validateInputData(): void {
        // source column
        const sourceColumn = this.getSourceColName();
        if (sourceColumn == null || sourceColumn.length === 0) {
            throw new Error('Source column cannot be empty');
        }
        if (!this.getColumnMap().has(sourceColumn)) {
            throw new Error(`Source column(${sourceColumn}) does not exist`);
        }

        // delimiter
        const delimiter = this.getDelimiter();
        if (delimiter == null || delimiter.length === 0) {
            throw new Error('Delimiter cannot be empty');
        }

        // dest columns
        this.getDestColNames().forEach((colName, i) => {
            if (colName.trim().length === 0) {
                return;
            }
            if (xcHelper.parsePrefixColName(colName).prefix.length > 0) {
                throw new Error(`Dest column(${colName}) cannot have prefix`);
            }
            if (this.getColNameSetWithNew(i).has(colName)) {
                throw new Error(`Duplicate column "${colName}"`);
            }
        });
    }

    public getDelimiter(): string {
        return this._delimiter;
    }

    public setDelimiter(dem: string): void {
        this._delimiter = dem;
    }

    public getSourceColName(): string {
        return this._sourceColName;
    }

    public setSourceColName(name: string): void {
        this._sourceColName = name;
    }

    public getNumDestCols(): number {
        return this._destColNames.length;
    }

    /**
     * Set number of dest columns
     * @param count
     * @description auto-generated column names if needed
     */
    public setNumDestCols(count: number): void {
        const namesCount = this._destColNames.length;
        if (count === namesCount) {
            return;
        }

        if (count < namesCount) {
            this._destColNames.splice(count);
        } else {
            const startIndex = namesCount;
            const genCount = count - namesCount;

            const autoNames = this._genColNames(
                xcHelper.parsePrefixColName(this.getSourceColName()).name,
                startIndex, genCount
            );
            for (const name of autoNames) {
                this._destColNames.push(name);
            }
        }
        this.autofillEmptyColNames();
    }

    public getDestColNameByIndex(index: number): string {
        return this._destColNames[index];
    }

    public getDestColNames(): string[] {
        return this._destColNames.map((v) => v);
    }

    public setDestColName(index: number, colName: string): void {
        if (index < this._destColNames.length) {
            this._destColNames[index] = colName;
        }
    }

    public setIncludeErrRow(isInclude: boolean): void {
        this._includeErrRow = isInclude;
    }

    public isIncludeErrRow(): boolean {
        return this._includeErrRow;
    }

    public autofillEmptyColNames(): void {
        if (this.getSourceColName().length === 0) {
            return
        }

        const colPrefix = xcHelper.parsePrefixColName(this.getSourceColName()).name;
        for (let colIndex = 0; colIndex < this.getNumDestCols(); colIndex ++) {
            if (this.getDestColNameByIndex(colIndex).length === 0) {
                const autoName = this._genColNames(colPrefix, colIndex, 1)[0];
                this.setDestColName(colIndex, autoName);
            }
        }
    }

    private _genColNames(prefix: string, colIndex: number, count: number): string[] {
        if (prefix.length === 0) {
            return new Array(count).fill('');
        }

        const allCols = this.getColNameSetWithNew(-1);

        let result: string[];
        for (let retry = 1; retry <= 50; retry ++) {
            result = [];
            const baseIndex = retry * count + colIndex;
            for (let i = 0; i < count; i ++) {
                const name = `${prefix}-split-${baseIndex + i}`;
                result.push(name);
            }

            let hasDup = false;
            for (const name of result) {
                if (allCols.has(name)) {
                    hasDup = true;
                    break;
                }
            }

            if (!hasDup) {
                break;
            }
        }

        return result;
    }
}