// for map,filter,groupby, and aggregate
abstract class GeneralOpPanelModel {
    protected dagNode: DagNode;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[]; // TODO fix
    protected andOrOperator: string;
    protected _opCategories: number[];
    protected cachedBasicModeParam: string;
    protected _originalParam: any;
    protected _needsParamReset: boolean;
    protected autofillColumns: ProgCol[];
    public modelError: string;

    public constructor(
        dagNode: DagNode,
        event: Function,
        options: {autofillColumnNames?: string[]} = {autofillColumnNames: null}
    ) {
        this.dagNode = dagNode;
        this.event = event;
        this.groups = [];
        this.andOrOperator = "and";
        this.tableColumns = this.refreshColumns();
        this._opCategories = [];
        const autofillColumnNames = options.autofillColumnNames;
        if (autofillColumnNames) {
            this.autofillColumns = [];
            autofillColumnNames.forEach(colName => {
                let progCol = this.tableColumns.find((progCol) => {
                    return progCol.getBackColName() === colName;
                });
                if (progCol == null) {
                    // nested columns pulled from result set view
                    // may not in the lineage
                    let frontName = xcHelper.parsePrefixColName(colName).name;
                    progCol = ColManager.newPullCol(frontName, colName);
                }
                if (progCol) {
                    this.autofillColumns.push(progCol);
                }
            });
            if (!this.autofillColumns.length) {
                this.autofillColumns = null;
            }
        }
        let params: any = this.dagNode.getParam();
        this._originalParam = params;
        try {
            this._initialize(params, this.dagNode.getState() !== DagNodeState.Unused);
            this.modelError = null;
        } catch (e) {
            this.modelError = xcHelper.parseJSONError(e).error;
        }
    }

    /**
     * Return the whole model info
     */
    public abstract getModel(): any;

    public getColumns(): ProgCol[] {
        return this.tableColumns;
    }

    public refreshColumns(): ProgCol[] {
        this.tableColumns = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(false, true);
        })[0] || [];
        return this.tableColumns;
    }

    public getColumnByName(name: string): ProgCol {
        return this.tableColumns.find((progCol) => {
            return progCol.getBackColName() === name;
        }) || null;
    }

    public getColumnNumByName(name: string): number {
        for (let i = 0; i < this.tableColumns.length; i++) {
            if (this.tableColumns[i].getBackColName() === name) {
                return i;
            }
        }
        return -1;
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: []
        });
        this._update();
    }

    public removeGroup(index: number): void {
        this.groups.splice(index, 1);
        this._update();
    }

    public clearFunction(index: number): void {
        this.groups[index].operator = "";
        this.groups[index].args = [];
        this._update();
    }

    public abstract enterFunction(_value: string, _opInfo, _index: number): void;

    public updateArg(
        value: string,
        groupIndex: number,
        argIndex: number,
        options?: any
    ): void {
        options = options || {};
        const group = this.groups[groupIndex];
        while (group.args.length <= argIndex) {
            group.args.push(new OpPanelArg("", -1));
        }
        // no arg if boolean is not true
        if ((options.boolean && value === "") || options.isEmptyArg) {
            group.args.splice(argIndex, 1);
        } else {
            const arg: OpPanelArg = group.args[argIndex];
            arg.setValue(value);
            if (options.typeid != null) {
                arg.setTypeid(options.typeid);
            }
            if (options.isNone) {
                arg.setIsNone(true);
            } else if (arg.hasOwnProperty("isNone")) {
                arg.setIsNone(false);
            }
            if (options.isEmptyString) {
                arg.setIsEmptyString(true);
            } else if (arg.hasOwnProperty("isEmptyString")) {
                arg.setIsEmptyString(false);
            }
            this._formatArg(arg);
            this._validateArg(arg);
            // if value is changed, remove autofill column
            if (groupIndex == 0 && this.autofillColumns &&
                this.autofillColumns[argIndex] &&
                arg.getFormattedValue() !== this.autofillColumns[argIndex].getBackColName()) {
                this.autofillColumns[argIndex] = null;
            }
        }
    }

    public removeArg(groupIndex: number, argIndex: number): void {
        const group = this.groups[groupIndex];
        group.args.splice(argIndex, 1);
    }

    public updateCast(
        type: ColumnType,
        groupIndex: number,
        argIndex: number
    ): void {
        const arg: OpPanelArg = this.groups[groupIndex].args[argIndex];
        arg.setCast(type);
        this._validateArg(arg);
    }
    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: any = this._getParam();
        this.dagNode.setParam(param);
    }

    public getParam() {
        return this._getParam();
    }

    public resetDagNodeParam() {
        if (!this._needsParamReset) {
            return;
        }
        this.dagNode.setParam(this._originalParam, true);
    }

    protected abstract _initialize(_paramsRaw, strictCheck?: boolean): void;

    protected _update(all?: boolean): void {
        if (this.event != null) {
            this.event(all);
        }
    }

    protected abstract _getParam(): any;

    // TODO: instead of storing formattedValue, calculate when needed based on
    // type
    protected _formatArg(arg: OpPanelArg): void {
        let val: string = arg.getValue();
        const trimmedVal: string = val.trim();
        let formattedValue: string;

        if (trimmedVal === "") {
            if (arg.hasNoneChecked()) {
                formattedValue = "None";
            } else if (arg.checkIsEmptyString()) {
                formattedValue = "\"\"";
            } else {
                formattedValue = GeneralOpPanelModel.formatArgumentInput(val, arg.getTypeid()).value;
            }
            arg.setType("value");
        } else if (arg.checkIsRegex()) {
            formattedValue = "\"" + val + "\"";
            arg.setType("regex");
        } else if (GeneralOpPanelModel.hasFuncFormat(trimmedVal)) {
            formattedValue = GeneralOpPanelModel.parseColPrefixes(trimmedVal);
            arg.setType("function");
        } else if (xcHelper.hasValidColPrefix(trimmedVal)) {
            formattedValue = GeneralOpPanelModel.parseColPrefixes(trimmedVal);
            arg.setType("column");
        } else if (this._isAgg(trimmedVal)) {
            formattedValue = trimmedVal;
            arg.setType("aggregate");
        } else {
            formattedValue = GeneralOpPanelModel.formatArgumentInput(val, arg.getTypeid()).value;
            arg.setType("value");
        }
        arg.setFormattedValue(formattedValue.toString());
    }

    protected _isAgg(arg: string) {
        if (arg[0] != "\^") {
            return false;
        }
        return DagAggManager.Instance.hasAggregate(arg);
    }

    protected _validateArg(arg: OpPanelArg) {
        const self = this;
        let val: string = arg.getFormattedValue();
        let trimmedVal: string = val.trim();
        arg.clearError();

        if (trimmedVal === "" && !arg.checkIsOptional()) {
            arg.setError("No value");
            return;
        }

        if (arg.hasNoneChecked()) {
            return;
        }

        if (arg.getType() === "column") {
            if (val.includes(",")) {
                arg.setError("Multiple columns");
                return;
            }
            let colName = val;
            if (trimmedVal.length > 0) {
                colName = trimmedVal;
            }
            const progCol: ProgCol = self.tableColumns.find((progCol) => {
                return progCol.getBackColName() === colName;
            });
            if (progCol == null) { // if cannot find column, pass
                return;
            } else {
                let colType: string = progCol.getType();
                if (colType === ColumnType.integer && !progCol.isKnownType()) {
                    // for fat potiner, we cannot tell float or integer
                    // so for integer, we mark it
                    colType = ColumnType.number;
                }
                if (!arg.isCast()) {
                    if (colType == null) {
                        console.error("colType is null/col not " +
                            "pulled!");
                        arg.setError("No type");
                    } else {
                        const validTypes = GeneralOpPanelModel.parseType(arg.getTypeid());
                        let errorText = self._validateColInputType(validTypes, colType, arg.isUnknownTypeValid());
                        if (errorText != null) {
                            arg.setError(errorText);
                            return;
                        }
                    }
                }
            }
        } else if (arg.getType() === "value") {
            const checkRes = self._checkArgTypes(trimmedVal, arg.getTypeid());
            if (checkRes != null) {
                let error;
                if (checkRes.currentType === "string" &&
                    self._hasUnescapedParens(val)) {
                    // function-like string found but invalid format
                    error = ErrTStr.InvalidFunction;
                } else {
                    error = ErrWRepTStr.InvalidOpsType;
                    error = xcStringHelper.replaceMsg(error, {
                        "type1": checkRes.validType.join("/"),
                        "type2": checkRes.currentType
                    });
                }

                arg.setError(error);
            }
        } else if (arg.getType() === "function") {
            const parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(val);
            const error = this._validateEval(parsedEval, arg.getTypeid());
            if (error) {
                arg.setError(error);
            } else {
                let operatorInfo = self._getFnOperatorInfo(parsedEval.fnName);
                if (operatorInfo) {
                    let outputType = xcHelper.convertFieldTypeToColType(operatorInfo.outputType);
                    arg.setValueType(outputType);
                }
            }
        }
    }

    // used when an operator argument is a function and not a value or column
    // example - if the operator is "add", and the first argument is "sub(3,4)"
    // we evaluate that sub(3,4) is formatted correctly and that it's output type
    // matches the expect input type of the first argument for "add"
    private _validateEval(func: ParsedEval, expectedTypeid: number) {
        const self = this;
        const errorObj = {error: null};
        if (func.error) {
            errorObj.error = func.error;
        } else {
            validateEvalHelper(func, expectedTypeid, errorObj);
        }

        return errorObj.error;

        function validateEvalHelper(func: ParsedEval, expectedTypeid: number, errorObj) {

            const opInfo = validateFnName(func.fnName, expectedTypeid, errorObj);
            if (!errorObj.error && opInfo) {
                const numArgsCheck = _checkNumArgs(func, opInfo);
                if (numArgsCheck) {
                    errorObj.error = numArgsCheck;
                }
            }
            for (let i = 0; i < func.args.length; i++) {
                if (errorObj.error) {
                    return errorObj;
                }
                // if arg is a function, validate the operator outputs the correct type
                // otherwise arg is a value so check that the value has the correct type
                // for it's respective operator
                if (func.args[i].type === "fn") {

                    validateEvalHelper(<ParsedEval>func.args[i], opInfo.argDescs[i].typesAccepted,
                                        errorObj);
                } else {
                    if (!opInfo.argDescs[i]) {
                        // XXX handle variable arguments
                        break;
                    }
                    const typeCheck = checkInvalidTypes(func.args[i].type,
                                            opInfo.argDescs[i].typesAccepted,
                                        (<ParsedEvalArg>func.args[i]).value,
                                        (opInfo.category === FunctionCategoryT.FunctionCategoryCast));
                    if (typeCheck) {
                        errorObj.error = typeCheck;
                    }
                }
            }
        }

        function _checkNumArgs(func, opInfo) {
            if (func.args.length > opInfo.argDescs.length) {
                let lastArg = opInfo.argDescs[opInfo.argDescs.length - 1];
                if (lastArg.argType === XcalarEvalArgTypeT.VariableArg ||
                    (lastArg.argDesc.indexOf("*") === 0 &&
                    lastArg.argDesc.indexOf("**") === -1)) {
                    // no error
                } else {
                    return "\"" + func.fnName + "\" only accepts " +
                        opInfo.argDescs.length + " arguments.";
                }
            } else if (func.args.length < opInfo.argDescs.length) {
                const diff = opInfo.argDescs.length - func.args.length;
                for (let j = opInfo.argDescs.length - diff; j < opInfo.argDescs.length; j++) {
                    const arg = opInfo.argDescs[j];
                    if ((arg.argDesc.indexOf("*") !== 0 ||
                            arg.argDesc.indexOf("**") !== -1)
                        && !self._isOptional(opInfo, j)) {
                        return  "\"" + func.fnName + "\" expects " +
                                        opInfo.argDescs.length + " arguments.";
                    }
                }
            }
        }

        function validateFnName(operator, expectedTypeid: number, errorObj) {
            let operatorInfo = self._getFnOperatorInfo(operator);
            let outputType: ColumnType;
            if (operatorInfo) {
                outputType = xcHelper.convertFieldTypeToColType(operatorInfo.outputType);
            }
            if (outputType == null) {
                errorObj.error = "\"" + operator + "\" is not a supported function.";
                if (operator && self._getFnOperatorInfo(operator.toLowerCase())) {
                    errorObj.error += " Did you mean \"" + operator.toLowerCase() + "\"?";
                }
            } else {
                const typeCheck = checkInvalidTypes(outputType, expectedTypeid);
                if (typeCheck) {
                    errorObj.error = typeCheck;
                }
            }
            return operatorInfo;
        }

        function checkInvalidTypes(
            outputType: string,
            expectedTypeid: number,
            value?: string,
            allowUnknownType?: boolean
        ) {
            const types: string[] = GeneralOpPanelModel.parseType(expectedTypeid);
            if (outputType.endsWith("Literal")) {
                outputType = outputType.slice(0, outputType.lastIndexOf("Literal"));
            }
            if (outputType === "decimal" || outputType === "aggValue") {
                outputType = ColumnType.float;
            } else if (outputType === "columnArg") {
                outputType = self.getColumnTypeFromArg(value);
            }

            if (outputType == null) {
                return false; // XXX column was not found, we just pass for now
            } else if (outputType === "paramArg") {
                return false; // ignore check on parameter
            } else if (outputType === ColumnType.number && (types.indexOf(ColumnType.float) > -1 ||
                types.indexOf(ColumnType.integer) > -1)) {
                return false;
            } else if (types.indexOf(outputType) > -1) {
                return false;
            } else if (outputType === ColumnType.unknown && allowUnknownType) {
                return false;
            } else {
                return xcStringHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                    "type1": types.join("/"),
                    "type2": outputType
                });
            }
        }
    }

    protected _getFnOperatorInfo(operator) {
        const opsMap = XDFManager.Instance.getOperatorsMap();
        let operatorInfo = null;
        for (let category in opsMap) {
            const ops = opsMap[category];
            if (ops[operator]) {
                operatorInfo = ops[operator];
                break;
            }
        }
        return operatorInfo;
    }

     // checks to see if value has at least one parentheses that's not escaped
    // or inside quotes
    private _hasUnescapedParens(val: string): boolean {
        let inQuotes: boolean = false;
        for (let i = 0; i < val.length; i++) {
            if (inQuotes) {
                if (val[i] === '"') {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === "(" || val[i] === ")") {
                return (true);
            }
        }
        return (false);
    }

     // used for args with column names provided like $col1, and not "hey" or 3
    protected _validateColInputType(
        requiredTypes: string[],
        inputType: string,
        allowUnknownType: boolean
    ): string {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            return null;
        } else if (requiredTypes.includes(inputType)) {
            return null;
        } else if (inputType === ColumnType.number &&
                    (requiredTypes.includes(ColumnType.float) ||
                        requiredTypes.includes(ColumnType.integer))) {
            return null;
        } else if (inputType === ColumnType.unknown && allowUnknownType) {
            return null;
        } else {
            return xcStringHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                "type1": requiredTypes.join("/"),
                "type2": inputType
            });
        }
    }

    public getColumnTypeFromArg(value): string {
        let colType: string;

        const progCol: ProgCol = this.tableColumns.find((progCol) => {
            return progCol.getBackColName() === value;
        });
        if (progCol == null) {
            console.error("cannot find col", value);
            return null;
        }

        colType = progCol.getType();
        if (colType === ColumnType.integer && !progCol.isKnownType()) {
            // for fat potiner, we cannot tell float or integer
            // so for integer, we mark it
            colType = ColumnType.number;
        }
        return colType;
    }

    public restoreBasicModeParams(editor: CodeMirror.EditorFromTextArea) {
        editor.setValue(this.cachedBasicModeParam);
    }

    public switchMode(
        toAdvancedMode: boolean,
        editor: CodeMirror.EditorFromTextArea
    ): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeFilterInputStruct = this._getParam();
            const paramStr = JSON.stringify(param, null, 4);
            this.cachedBasicModeParam = paramStr;
            editor.setValue(paramStr);
        } else {
            try {
                const paramStr = JSON.stringify(JSON.parse(editor.getValue()), null, 4);
                if (paramStr === this.cachedBasicModeParam) {
                    // advanced mode matches basic mode so go to basic mode
                    // regardless of errors
                    return;
                }
            } catch (e) {
                // validation will handle the error
            }
            const error = this.validateAdvancedMode(editor.getValue());
            if (error) {
                return error;
            }
            this.modelError = null;
            this._update(true);
        }
        return null;
    }

    public validateAdvancedMode(
        _paramStr: string,
        _isSubmit?: boolean
    ): {error: string} {
        return null;
    }

    public static hasFuncFormat(val: string): boolean {
        if (typeof val !== ColumnType.string) {
            return false;
        }
        val = val.trim();
        const valLen: number = val.length;

        if (valLen < 3) { // must be at least this long: a()
            return false;
        }

        //check if has opening and closing parens
        if (val.indexOf("(") > -1 && val.indexOf(")") > -1) {
            // check that val doesnt start with parens and that it does end
            // with parens
            if (val.indexOf("(") !== 0 &&
                val.lastIndexOf(")") === (valLen - 1)) {
                return (GeneralOpPanel.checkMatchingBrackets(val).index === -1);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public static parseColPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gColPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                } else if (this.isActualPrefix(str, i)) {
                    str = str.slice(0, i) + str.slice(i + 1);
                }
            }
        }
        return (str);
    }

    public static replaceColPrefixes(str: string, replacement: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gColPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + replacement + str.slice(i);
                } else if (this.isActualPrefix(str, i)) {
                    str = str.slice(0, i) + replacement + str.slice(i + 1);
                }
            }
        }
        return (str);
    }

    public static parseAggPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gAggVarPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                }
            }
        }
        return (str);
    }

    // returns true if previous character, not including spaces, is either
    // a comma, a (, or the very beginning
    private static isActualPrefix(str: string, index: number): boolean {
        for (let i = index - 1; i >= 0; i--) {
            if (str[i] === ",") {
                return (true);
            } else if (str[i] === "(") {
                return (true);
            } else if (str[i] !== " ") {
                return (false);
            }
        }
        return (true);
    }

    protected _checkArgTypes(arg: string, typeid: number) {
        const types: string[] = GeneralOpPanelModel.parseType(typeid);
        let argType: string = "string";

        if (types.indexOf(ColumnType.string) > -1 ||
            types.indexOf(ColumnType.mixed) > -1)
        {
            // if it accepts string/mixed, any input should be valid
            return null;
        }

        let tmpArg: string | number = arg.toLowerCase();
        const isNumber: boolean = !isNaN(Number(arg));
        let canBeBooleanOrNumber: boolean = false;

        // boolean is a subclass of number
        if (GeneralOpPanelModel.isBoolean(tmpArg) || isNumber)
        {
            canBeBooleanOrNumber = true;
            argType = "string/boolean/integer/float";
        }

        if (types.indexOf(ColumnType.boolean) > -1) {
            // if arg doesn't accept strings but accepts booleans,
            // then the provided value needs to be a booleanOrNumber
            if (canBeBooleanOrNumber) {
                return null;
            } else {
                return {
                    "error": true,
                    "validType": types,
                    "currentType": argType
                };
            }
        }

        // the remaining case is float and integer, both is number
        tmpArg = Number(arg);

        if (!isNumber) {
            return {
                "error": true,
                "validType": types,
                "currentType": argType
            };
        }

        if (types.indexOf(ColumnType.float) > -1) {
            // if arg is integer, it could be a float
            return null;
        }

        if (types.indexOf(ColumnType.integer) > -1) {
            if (tmpArg % 1 !== 0) {
                return {
                    "error": true,
                    "validType": types,
                    "currentType": ColumnType.float
                };
            } else {
                return null;
            }
        }

        if (types.length === 1 && types[0] === ColumnType.undefined) {
            return {
                "error": true,
                "validType": types,
                "currentType": argType
            };
        }

        return null; // no known cases for this
    }

    public static formatArgumentInput(value: string, typeid: number) {
        const strShift: number = 1 << DfFieldTypeT.DfString;
        const numberShift: number =
                        (1 << DfFieldTypeT.DfInt32) |
                        (1 << DfFieldTypeT.DfUInt32) |
                        (1 << DfFieldTypeT.DfInt64) |
                        (1 << DfFieldTypeT.DfUInt64) |
                        (1 << DfFieldTypeT.DfFloat32) |
                        (1 << DfFieldTypeT.DfFloat64);
        const boolShift: number = 1 << DfFieldTypeT.DfBoolean;

        // when field accept
        let shouldBeString: boolean = (typeid & strShift) > 0;
        const shouldBeNumber: boolean = (typeid & numberShift) > 0;
        const shouldBeBoolean: boolean = (typeid & boolShift) > 0;
        let isNumberAsString: boolean;
        let isBoolAsString: boolean;

        if (shouldBeString) {
            // handle edge case
            const parsedVal: number = parseFloat(value);
            if (!isNaN(parsedVal) &&
                parsedVal === Number(value) &&
                shouldBeNumber)
            {
                shouldBeString = false;
                value = <any>parsedVal;
            } else if (this.isNumberInQuotes(value)) {
                if (shouldBeNumber) {
                    isNumberAsString = true;
                }
                // keep value as is
            } else if (this.isBoolInQuotes(value)) {
                if (shouldBeBoolean) {
                    isBoolAsString = true;
                }
            } else if (shouldBeBoolean) {
                const valLower = ("" + value).toLowerCase();
                if (this.isBoolean(valLower)) {
                    shouldBeString = false;
                }
            }
        }

        value = this.parseAggPrefixes(value);
        value = this.parseColPrefixes(value);
        if (shouldBeString) {
            if (!isNumberAsString && !isBoolAsString) {
                // add quote if the field support string
                value = "\"" + value + "\"";
                // stringify puts in too many slashes
            }
        } else if (shouldBeNumber) {
            const tempValue = "" + value; // Force string to provide indexOf
            if (tempValue.indexOf(".") === 0) {
                value = "0" + value;
            }
        } else {
            if (typeof value === ColumnType.string) {
                value = value.trim();
            }
        }

        return ({value: value, isString: shouldBeString});
    }

    // take a value from the eval string and decide whether quotes need
    // to be stripped when dispalying in form input or if we need to add
    // a $ prefix if we detect a column
    protected formatArgToUI(value: string, typeid: number) {
        if (value.charAt(0) !== ("'") && value.charAt(0) !== ('"')) {
            if (this._isArgAColumn(value)) {
                // it's a column
                if (value.charAt(0) !== gAggVarPrefix) {
                    // do not prepend colprefix if has aggprefix
                    value = gColPrefix + value;
                }
            }
        } else {
            const quote = value.charAt(0);
            if (value.lastIndexOf(quote) === value.length - 1) {
                const strShift: number = 1 << DfFieldTypeT.DfString;
                const numberShift: number =
                                (1 << DfFieldTypeT.DfInt32) |
                                (1 << DfFieldTypeT.DfUInt32) |
                                (1 << DfFieldTypeT.DfInt64) |
                                (1 << DfFieldTypeT.DfUInt64) |
                                (1 << DfFieldTypeT.DfFloat32) |
                                (1 << DfFieldTypeT.DfFloat64);
                const shouldBeString: boolean = (typeid & strShift) > 0;
                const shouldBeNumber: boolean = (typeid & numberShift) > 0;
                // if string is in quotes, then strip the quotes if
                // input only accepts strings, or leave quotes if
                if (!GeneralOpPanelModel.isNumberInQuotes(value) || (shouldBeString && !shouldBeNumber)) {
                    value = value.slice(1, -1); // remove surrounding quotes
                    value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                }
            }
        }
        return value;
    }

     // used in cases where arg could be type string and number
     public static isNumberInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1);
                // same check as xcSuggest.suggestType, but also
                // allow string like "000123" be detect as number
                const letterRex: RegExp = /[a-z]/i;
                const parsedVal: number = Number(arg);
                if (!isNaN(parsedVal) &&
                    !letterRex.test(arg)
                    // !(arg.length > 1 && arg[0] === "0" && arg[1] !== ".")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    // used in cases where arg could be type string and bool
    public static isBoolInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1);
                if (this.isBoolean(arg)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    public static parseType(typeId: number): ColumnType[] {
        const types: ColumnType[] = [];
        let typeShift: number;

        // string
        typeShift = 1 << DfFieldTypeT.DfString;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.string);
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.integer);
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.float);
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.boolean);
        }

        // timestamp
        typeShift = 1 << DfFieldTypeT.DfTimespec;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.timestamp);
        }

        // money
        typeShift = 1 << DfFieldTypeT.DfMoney;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.money);
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.mixed);
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.undefined);
        }

        return (types);
    }

    protected _isArgAColumn(arg: string) {
        return (isNaN(<any>arg) &&
                arg.indexOf("(") === -1 &&
                !GeneralOpPanelModel.isBoolean(arg) &&
                arg !== "None");
    }

    protected _isOperationValid(groupNum): boolean {
        const groups = this.groups;
        const operator = groups[groupNum].operator;
        return this._getOperatorObj(operator) != null;
    }

    protected _getOperatorObj(operatorName: string): {
        argDescs: {
            argDesc: string,
            argType: number,
            isSingletonValue: true,
            maxArgs: number,
            minArgs: number,
            typesAccepted: number
        }[],
        category: number,
        displayName: string,
        fnDesc: string,
        numArgs: number,
        outputType: number
    } {
        for (let i = 0; i < this._opCategories.length; i++) {
            let ops = GeneralOpPanel.getOperatorsMap()[this._opCategories[i]];
            const op = ops[operatorName];
            if (op) {
                return op;
            }
        }
        return null;
    }

    protected _getAutoGenColName(name) {
        const limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        let newName = name;

        let tries = 0;
        while (tries < limit && (this.getColumnByName(newName) ||
            this._checkColNameUsedInInputs(newName))) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    protected _checkColNameUsedInInputs(name) {
        name = xcHelper.stripColName(name);
        let dupFound = false;
        for (let i = 0; i < this.groups.length; i++) {
            if (this.groups[i].newFieldName === name) {
                dupFound = true;
                break;
            }
        }
        return dupFound;
    }

    public validateGroups(isSubmit?: boolean) {
        const self = this;
        const groups = this.groups;
        const paramFns = [];
        // function name error
        for (let i = 0; i < groups.length; i++) {
            if (isSubmit && DagNodeInput.checkValidParamBrackets(groups[i].operator, true)) {
                paramFns.push(true);
                continue;
            } else {
                paramFns.push(false);
            }
            if (!this.groups[i].operator) {
                return {error: ErrTStr.NoEmpty,
                    group: i,
                    arg: -1,
                    type: "function"};
            }
            if (!self._isOperationValid(i)) {
                return {error: ErrTStr.NoSupportOp,
                        group: i,
                        arg: -1,
                        type: "function"};
            }
        }
        // correct number of arguments for each operator
        for (let i = 0; i < groups.length; i++) {
            if (paramFns[i]) {
                continue;
            }
            const group = groups[i];
            const opInfo = this._getOperatorObj(group.operator);
            if (group.args.length < opInfo.argDescs.length) {
                const diff = opInfo.argDescs.length - group.args.length;
                for (let j = opInfo.argDescs.length - diff; j < opInfo.argDescs.length; j++) {
                    const arg = opInfo.argDescs[j];
                    if ((arg.argDesc.indexOf("*") !== 0 ||
                            arg.argDesc.indexOf("**") !== -1)
                        && !this._isOptional(opInfo, j)) {
                        return {error: "\"" + group.operator + "\" expects " +
                                        opInfo.argDescs.length + " arguments.",
                            group: i,
                            arg: -1,
                            type: "missingFields"};
                    }
                }
            }
        }

        // look for blank inputs, then errors aside from type,
        // then column type errors, then value type errors

        // blank inputs
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid()) {
                    if (arg.getError() === "No value") {
                        return {error: arg.getError(),
                                group: i,
                                arg: j,
                                type: "blank"};
                    }
                }
            }
        }

        // other errors aside from wrong type
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() &&
                    !arg.getError().includes(ErrWRepTStr.InvalidOpsType
                                                        .substring(0, 20))) {
                    return {error: arg.getError(),
                            group: i,
                            arg: j,
                            type: "other"};
                }
            }
        }

        // wrong type on column
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() && arg.getType() === "column" &&
                    arg.getError().includes(ErrWRepTStr.InvalidOpsType
                                                       .substring(0, 20))) {
                    return {error: arg.getError(),
                            group: i,
                            arg: j,
                            type: "columnType"};
                }
            }
        }

        // wrong type on value
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() &&
                    arg.getError().includes(ErrWRepTStr.InvalidOpsType
                                                       .substring(0, 20))) {
                    return {error: arg.getError(),
                            group: i,
                            arg: j,
                            type: "valueType"};
                }
            }
        }

        // arguments in the Conditional Category should have matching types
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const opInfo = this._getOperatorObj(group.operator);
            if (opInfo && opInfo.category === FunctionCategoryT.FunctionCategoryCondition) {
                let colTypes = BaseOpPanel.getBasicColTypes();
                colTypes.push(ColumnType.number);
                let baseType = null;
                let baseValue = null;
                let diffType = null;
                let diffTypeValue = null;
                let diffTypeArgNum = null;
                let hasMixed = false;
                for (let j = 0; j < group.args.length; j++) {
                    if (opInfo.argDescs[j] &&
                        opInfo.argDescs[j].argType === XcalarEvalArgTypeT.OptionalArg) {
                        // ignore optional arguments
                        continue;
                    }
                    const arg = group.args[j];
                    let type = arg.getType();
                    let valueType;
                    let value = arg.getValue();
                    let formattedValue = arg.getFormattedValue();
                    if (arg.isCast()) {
                        valueType = arg.getCast();
                    } else if (type === "column") {
                        valueType = this.getColumnTypeFromArg(GeneralOpPanelModel.parseColPrefixes(value));
                    } else if (type === "value") {
                        let lowerVal = formattedValue.toLowerCase();
                        if (lowerVal.startsWith("\"") || lowerVal.startsWith("'")) {
                            valueType = ColumnType.string;
                        } else if (GeneralOpPanelModel.isBoolean(formattedValue)) {
                            valueType = ColumnType.boolean;
                        } else {
                            valueType = ColumnType.number;
                        }
                    } else if (type === "regex") {
                        valueType = ColumnType.string;
                    } else if (type === "aggregate") {
                        //XXX could be number or string so ignore for now
                    } else if (type === "function") {
                        valueType = arg.getValueType();
                    }
                    if (valueType === ColumnType.integer || valueType === ColumnType.float) {
                        valueType = ColumnType.number;
                    }
                    if (valueType === ColumnType.mixed) {
                        hasMixed = true;
                        break;
                    }
                    // ignores mixed
                    if (!baseType && colTypes.includes(valueType)) {
                        baseType = valueType;
                        baseValue = value;
                    } else if (!diffType && baseType && colTypes.includes(valueType) && valueType !== baseType) {
                        diffType = valueType;
                        diffTypeValue = value;
                        diffTypeArgNum = j;
                    }
                }
                if (!hasMixed && diffType) {
                    return {
                        error: `Arguments should be of the same type. Expected ${baseValue} (${baseType}) to match ${diffTypeValue} (${diffType}).`,
                        group: i,
                        arg: diffTypeArgNum,
                        type: "mismatchType"
                    };
                }
            }
        }
        return null;
    }

    public static isBoolean(arg) {
        arg = ("" + arg).toLowerCase();
        return (arg === "true" || arg === "false");
    }

    protected _translateAdvancedErrorMessage(error) {
        let groups = this.groups;
        let text: string= "";
        let operator: string = "";
        if (groups[error.group]) {
            operator = groups[error.group].operator;
        }
        switch (error.type) {
            case ("function"):
                if (!operator) {
                    text = ErrTStr.NoEmpty;
                } else {
                    text = "\"" + operator + "\" is not a supported function."
                }
                break;
            case ("blank"):
                text = ErrTStr.NoEmpty;
                text = "Argument " + (error.arg + 1) + " in " + operator +
                       " function is empty.";
                break;
            case ("other"):
                text = error.error + ": " + groups[error.group].args[error.arg].getValue();
                if (error.errorDetail) {
                    text += " " + error.errorDetail;
                }
                break;
            case ("columnType"):
            case ("valueType"):
                const arg = groups[error.group].args[error.arg].getValue();
                text = "Value: " + arg + ". " + error.error;
                break;
            case ("mismatchType"):
                text = error.error;
                break;
            case ("newField"):
                text = "New field name is invalid: " + error.error;
                break;
            default:
                text = error.error;
                if (error.errorDetail) {
                    text += " " + error.errorDetail;
                }
                break;
        }
        return {error: text};
    }

    protected _isOptional(opInfo, argIndex): boolean {
        return (opInfo.category !== FunctionCategoryT.FunctionCategoryUdf) &&
                opInfo.argDescs[argIndex] != null &&
                (opInfo.argDescs[argIndex].argType === XcalarEvalArgTypeT.OptionalArg);
    }
}