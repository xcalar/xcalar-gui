
class MapOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeMap;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[];
    protected icv: boolean;
    private outputTableName: string;

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        icv: boolean
        outputTableName: string
    } {
        return {
            groups: this.groups,
            icv: this.icv,
            outputTableName: this.outputTableName
        }
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: [],
            newFieldName: ""
        });

        this._update();
    }

    public enterFunction(value: string, opInfo, index: number): void {
        if (!this.groups.length) {
            this.addGroup();
        }
        this.groups[index].operator = value;
        if (opInfo) {
            // allow unknown type for cast operations
            const allowUnknownType = (opInfo.category === FunctionCategoryT.FunctionCategoryCast) ? true : false;
            const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
            this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                    const arg = opInfo.argDescs[i];
                    const isOptional = this._isOptional(opInfo, i);
                    return new OpPanelArg("", arg.typesAccepted, isOptional, null, allowUnknownType);
                });
            if (this.autofillColumns && index === 0) {
                for (let i = 0; i < this.groups[index].args.length; i++) {
                    if (this.autofillColumns[i]) {
                        this.updateArg(gColPrefix + this.autofillColumns[i].getBackColName(), 0, i);
                    }
                }
            }
            if (value === "regex" && numArgs === 2) {
                this.groups[index].args[1].setRegex(true);
            }
        } else {
            this.groups[index].args = [];
        }

        this.updateNewFieldName("", index, false);
        if (opInfo && index === 0 && this.autofillColumns && this.autofillColumns[0]) {
            let autoGenColName: string = xcHelper.parsePrefixColName(this.autofillColumns[0].getBackColName()).name;
            if (opInfo.displayName.indexOf(":") > -1) {
                autoGenColName += "_" + opInfo.displayName.slice(opInfo.displayName.indexOf(":") + 1);
            } else {
                autoGenColName += "_" + opInfo.displayName;
            }

            autoGenColName = xcHelper.stripColName(autoGenColName);
            autoGenColName = this._getAutoGenColName(autoGenColName);
            this.updateNewFieldName(autoGenColName, index);
        }
        this._update();
    }

    public updateNewFieldName(newFieldName: string, groupIndex: number, userEdit?: boolean): void {
        this.groups[groupIndex].newFieldName = newFieldName;
        if (userEdit != null) {
            this.groups[groupIndex].newFieldNameUserEdited = userEdit;
        }
    }

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
            if (argIndex === 0 && !group.newFieldNameUserEdited && arg.getType() === "column") {
                let autoGenColName = arg.getFormattedValue();
                if (autoGenColName.indexOf("::") > -1) {
                    autoGenColName = autoGenColName.split("::")[1];
                }
                if (group.operator.indexOf(":") > -1) {
                    autoGenColName += "_" + group.operator.slice(group.operator.indexOf(":") + 1);
                } else {
                    autoGenColName +=  "_" + group.operator;
                }
                group.newFieldName = "";
                autoGenColName = xcHelper.stripColName(autoGenColName, true, true);
                autoGenColName = this._getAutoGenColName(autoGenColName);
                this.updateNewFieldName(autoGenColName, groupIndex);
                this._update();
            }
        }
    }

    public toggleICV(isICV: boolean): void {
        this.icv = isICV;
    }

    protected _initialize(paramsRaw, strictCheck?: boolean, isSubmit?: boolean): void {
        const self = this;
        if (!this._opCategories.length) {
            const operatorsMap = GeneralOpPanel.getOperatorsMap();
            for (let i in operatorsMap) {
                if (parseInt(i) !== FunctionCategoryT.FunctionCategoryAggregate) {
                    this._opCategories.push(parseInt(i));
                }
            }
        }
        let argGroups = [];
        let newFieldNames = [];
        for (let i = 0; i < paramsRaw.eval.length; i++) {
            let parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(
                paramsRaw.eval[i].evalString);

            if (parsedEval["error"]) {
                if (strictCheck) {
                    throw(parsedEval);
                } else {
                    parsedEval = {fnName:"", args: [], type: "fn", error: null};
                }
            }
            argGroups.push(parsedEval);
            newFieldNames.push(paramsRaw.eval[i].newField);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args: OpPanelArg[] = [];
            const opInfo = this._getOperatorObj(argGroup.fnName);
            let lastArg;
            let hasVariableArg = false;
            let hasParamFn = false;
            if (argGroup.args.length) {
                if (!opInfo) {
                    if (isSubmit && argGroup.fnName.includes(gParamStart)) {
                        hasParamFn = true;
                        // ok to submit when parameter is found
                    } else if (argGroup.fnName.length) {
                        if (argGroup.fnName.includes(":")) {
                            throw({error: "This function was not found: " + argGroup.fnName });
                        } else {
                            throw({error: "\"" + argGroup.fnName + "\" is not a" +
                                " valid map function."});
                        }
                    } else {
                        throw({error: "Function not selected."});
                    }
                } else if (argGroup.args.length > opInfo.argDescs.length) {
                    lastArg = opInfo.argDescs[opInfo.argDescs.length - 1];
                    if (lastArg.argType === XcalarEvalArgTypeT.VariableArg ||
                        (lastArg.argDesc.indexOf("*") === 0 &&
                        lastArg.argDesc.indexOf("**") === -1)) {
                        hasVariableArg = true;
                    } else {
                        throw ({error: "\"" + argGroup.fnName + "\" only accepts " +
                            opInfo.argDescs.length + " arguments."});
                    }
                }
            }

            for (var j = 0; j < argGroup.args.length; j++) {
                let arg = argGroup.args[j].value;
                if (argGroup.args[j].type === "fn") {
                    arg = DagNodeInput.stringifyEval(argGroup.args[j]);
                }
                let typesAccepted;
                let isOptional;
                if (hasParamFn) {
                    typesAccepted = -2049;
                    isOptional = true;
                } else if (hasVariableArg) {
                    typesAccepted = lastArg.typesAccepted
                    isOptional = this._isOptional(opInfo, j);
                } else {
                    typesAccepted = opInfo.argDescs[j].typesAccepted;
                    isOptional = this._isOptional(opInfo, j);
                }
                // allow unknown type for cast operations
                const allowUnknownType = (!opInfo ||
                    (opInfo && opInfo.category === FunctionCategoryT.FunctionCategoryCast)) ? true : false;
                const argInfo: OpPanelArg = new OpPanelArg(arg, typesAccepted,
                                                           isOptional, true, allowUnknownType);
                args.push(argInfo);
            }
            args.forEach((arg, index) => {
                const rawValue = arg.getValue();
                let value = self.formatArgToUI(rawValue, arg.getTypeid());
                if (argGroup.fnName === "regex" && args.length === 2 &&
                    index === 1) {
                    arg.setRegex(true);
                }
                if (rawValue === "\"\"") {
                    arg.setIsEmptyString(true);
                }
                if (rawValue === "None") {
                    value = "";
                    arg.setIsNone(true);
                }
                arg.setValue(value);
                arg.setFormattedValue(rawValue);
                self._formatArg(arg);
                self._validateArg(arg);
            });

            groups.push({
                operator: argGroup.fnName,
                args: args,
                newFieldName: newFieldNames[i],
                newFieldNameUserEdited: newFieldNames[i] != null && newFieldNames[i] != ""
            });
        }

        this.groups = groups;
        this.icv = paramsRaw.icv;
        this.outputTableName = paramsRaw.outputTableName;
    }

    protected _getParam(): DagNodeMapInputStruct {
        const evals = [];
        this.groups.forEach(group => {
            const evalString: string = GeneralOpPanel.formulateEvalString([group]);
            evals.push({
                evalString: evalString,
                newField: group.newFieldName
            });
        });

        return {
            eval: evals,
            icv: this.icv,
            outputTableName: this.outputTableName
        }
    }

    public validateAdvancedMode(
        paramStr: string,
        isSubmit?: boolean
    ): {error: string} {
        try {
            const param: DagNodeMapInputStruct = <DagNodeMapInputStruct>JSON.parse(paramStr);

            let error = this.dagNode.validateParam(param);
            if (error != null) {
                return error;
            }

            this._initialize(param, true, isSubmit);
            error = this.validateGroups(isSubmit);
            if (!error) {
                error = this.validateNewFieldNames();
            }

            if (error == null) {
                return null;
            } else {
                return this._translateAdvancedErrorMessage(error);
            }
        } catch (e) {
            return xcHelper.parseJSONError(e);
        }
    }

    public validateNewFieldNames() {
        const groups = this.groups;
        const nameMap = {};
        // new field name
        for (let i = 0; i < groups.length; i++) {
            const name = this.groups[i].newFieldName;
            let error = xcHelper.validateColName(name, true);
            if (error) {
                return {error: error, group: i, arg: -1, type: "newField"};
            }

            if (nameMap[name]) {
                return {
                    error: "Duplicate field name",
                    group: i,
                    arg: -1,
                    type: "newField"
                };
            }
            nameMap[name] = true;
        }
    }

    // checks new field names again table columns
    // not each other
    public checkDuplicateNewFieldNames() {
        const dupes = [];
        this.groups.forEach((group) => {
            const name = group.newFieldName;
            if (this.getColumnByName(name)) {
                dupes.push(name);
            }
        });
        return dupes;
    }

    public submit() {
        let param: DagNodeMapInputStruct = this._getParam();
        let aggs: string[] = DagNode.getAggsFromEvalStrs(param.eval);
        this.dagNode.setAggregates(aggs);
        super.submit();
    }
}