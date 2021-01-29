
class FilterOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeFilter;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[]; // TODO fix
    protected andOrOperator: string;
    protected outputTableName: string;

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        andOrOperator: string,
        outputTableName: string
    } {
        return {
            groups: this.groups,
            andOrOperator: this.andOrOperator,
            outputTableName: this.outputTableName
        }
    }

    public enterFunction(value: string, opInfo, index: number): void {
        if (!this.groups.length) {
            this.addGroup();
        }
        this.groups[index].operator = value;
        if (opInfo) {
            const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
            this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                const isOptional = this._isOptional(opInfo, i);
                                            return new OpPanelArg("",
                                            opInfo.argDescs[i].typesAccepted, isOptional);
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

        this._update();
    }

    public toggleAndOr(wasAnd) {
        this.andOrOperator = wasAnd ? "or" : "and";
        this._update();
    }

    // strict check is true when saving/ validating form
    // and false when first opening the form
    protected _initialize(paramsRaw, strictCheck?: boolean, isSubmit?: boolean) {
        const self = this;
        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryCondition];
        }
        let parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(
                                                    paramsRaw.evalString);
        if (parsedEval["error"]) {
            if (strictCheck) {
                throw(parsedEval);
            } else {
                parsedEval = {fnName:"", args: [], type: "fn", error: null};
            }
        }

        let groups = [];
        let argGroups = [];

        if (self._isValidAndOr(parsedEval, "and")) {
            detectAndOr(parsedEval, "and");
        } else {
            detectAndOr(parsedEval, "or");
        }
        if (self._isValidAndOr(parsedEval, "or")) {
            this.andOrOperator = "or";
        } else {
            this.andOrOperator = "and";
        }

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args: OpPanelArg[] = [];
            let opInfo = this._getOperatorObj(argGroup.fnName);
            let lastArg;
            let hasVariableArg = false;
            let hasParamFn = false;
            if (argGroup.args.length) {
                if (!opInfo) {
                    if (isSubmit && argGroup.fnName.includes(gParamStart)) {
                        hasParamFn = true;
                        // ok to submit when parameter is found
                    } else if (argGroup.fnName.length) {
                        throw({error: `"${argGroup.fnName}" is not a valid filter function.`});
                    } else if (!argGroup.fnName.length) {
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
                            opInfo.argDescs.length + " arguments."})
                    }
                }
            }

            for (let j = 0; j < argGroup.args.length; j++) {
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

                const argInfo: OpPanelArg = new OpPanelArg(arg, typesAccepted,
                                                           isOptional, true);
                args.push(argInfo);
            }
            args.forEach((arg: OpPanelArg, index) => {
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

            groups.push({operator: argGroup.fnName, args: args});
        }
        this.outputTableName = paramsRaw.outputTableName;
        this.groups = groups;

        function detectAndOr(func, operator) {
            let split = self._isValidAndOr(func, operator);
            if (split) {
                detectAndOr(func.args[0], operator);
                detectAndOr(func.args[1], operator);
            } else {
                argGroups.push(func);
            }
        }
    }

    private _isValidAndOr(func, operator) {
        return (func.fnName === operator &&
                func.args.length === 2 &&
                func.args[0].type === "fn" &&
                func.args[1].type === "fn"  &&
                this._getOperatorObj(func.args[0].fnName) &&
                this._getOperatorObj(func.args[1].fnName));
    }

    protected _getParam(): DagNodeFilterInputStruct {
        const evalString = GeneralOpPanel.formulateEvalString(this.groups,
                                                             this.andOrOperator);
        return {
            evalString: evalString,
            outputTableName: this.outputTableName
        }
    }

    public validateAdvancedMode(paramStr: string, isSubmit?: boolean): {error: string} {
        try {
            const param: DagNodeFilterInputStruct = <DagNodeFilterInputStruct>JSON.parse(paramStr);

            let error = this.dagNode.validateParam(param);
            if (error != null) {
                return error;
            }

            this._initialize(param, true, isSubmit);
            error = this.validateGroups(isSubmit);
            if (error == null) {
                return null;
            } else {
                return this._translateAdvancedErrorMessage(error);
            }
        } catch (e) {
            return xcHelper.parseJSONError(e);
        }
    }

    public submit() {
        let param: DagNodeFilterInputStruct= this._getParam();
        let aggs: string[] = DagNode.getAggsFromEvalStrs([param]);
        this.dagNode.setAggregates(aggs);
        super.submit();
    }
}