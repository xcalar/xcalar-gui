
class GroupByOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeGroupBy;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: GroupByOpPanelFunctionGroup[];
    protected icv: boolean;
    protected includeSample: boolean;
    protected joinBack: boolean;
    protected groupAll: boolean;
    protected groupOnCols: string[];
    protected newKeys: string[];
    protected dhtName: string;
    protected outputTableName: string;

    public constructor(dagNode: DagNodeGroupBy, event: Function, options) {
        super(dagNode, event, options);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        groupOnCols: string[],
        groups: GroupByOpPanelFunctionGroup[],
        includeSample: boolean,
        joinBack: boolean,
        icv: boolean,
        groupAll: boolean,
        outputTableName: string
    } {
        return {
            groupOnCols: this.groupOnCols,
            groups: this.groups,
            includeSample: this.includeSample,
            joinBack: this.joinBack,
            icv: this.icv,
            groupAll: this.groupAll,
            outputTableName: this.outputTableName
        }
    }

    public addGroupOnArg(): void {
        this.groupOnCols.push("");
        this._update();
    }

    public removeGroupOnArg(index: number): void {
        this.groupOnCols.splice(index, 1);
        this._update();
    }

    public updateGroupOnArg(value: string, index: number): void {
        if (value[0] === gColPrefix) {
            value = value.slice(1);
        }
        this.groupOnCols[index] = value;
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: [],
            newFieldName: "",
            distinct: false
        });
        this._update();
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
                                            opInfo.argDescs[i].typesAccepted,
                                            isOptional);
                                        });
        } else {
            this.groups[index].args = [];
        }

        this._update();
    }

    public updateNewFieldName(newFieldName: string, groupIndex: number): void {
        this.groups[groupIndex].newFieldName = newFieldName;
    }

    public toggleICV(isICV: boolean): void {
        this.icv = isICV;
    }

    public toggleIncludeSample(isIncludeSample: boolean): void {
        this.includeSample = isIncludeSample;
        if (this.includeSample) {
            this.joinBack = false;
        }
    }

    public toggleJoinBack(isJoinBack: boolean): void {
        this.joinBack = isJoinBack;
        if (this.joinBack) {
            this.includeSample = false;
        }
    }

    public toggleDistinct(distinct: boolean, groupIndex: number): void {
        this.groups[groupIndex].distinct = distinct;
    }

    public toggleGroupAll(groupAll: boolean): void {
        this.groupAll = groupAll;
        if (this.groupAll) {
            this.joinBack = false;
            this.includeSample = false;
        }
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeGroupByInputStruct = this._getParam();
        let aggs: string[] = this._findAggregates(param);
        this.dagNode.setAggregates(aggs);
        this.dagNode.setParam(param);
    }

    protected _initialize(paramsRaw, _strictCheck?: boolean, isSubmit?: boolean) {
        this.icv = paramsRaw.icv || false;
        this.outputTableName = paramsRaw.outputTableName;
        this.includeSample = paramsRaw.includeSample || false;
        this.joinBack = paramsRaw.joinBack || false;
        this.groupAll = paramsRaw.groupAll || false;
        this.groupOnCols = paramsRaw.groupBy || [];
        this.newKeys = paramsRaw.newKeys || null;
        this.dhtName = paramsRaw.dhtName || "";
        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryAggregate];
        }
        let argGroups = [];
        // XXX check for all properties

        for (let i = 0; i < paramsRaw.aggregate.length; i++) {
            argGroups.push(paramsRaw.aggregate[i]);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args = [];
            const opInfo = this._getOperatorObj(argGroup.operator);
            if (isSubmit && argGroup.operator.includes(gParamStart)) {
                // ok to submit when parameter is found
                const argInfo: OpPanelArg = new OpPanelArg(argGroup.sourceColumn,
                    -2049, true , true);
                argInfo.setCast(argGroup.cast);
                args.push(argInfo);
            } else if (!opInfo && argGroup.sourceColumn) {
                if (argGroup.operator.length) {
                    throw({error: "\"" + argGroup.operator + "\" is not a" +
                            " valid group by function."});
                } else {
                    throw({error: "Function not selected."});
                }
            } else if (opInfo) {
                let isOptional = this._isOptional(opInfo, 0);
                let argInfo: OpPanelArg = new OpPanelArg(argGroup.sourceColumn,
                                        opInfo.argDescs[0].typesAccepted,
                                        isOptional, true);

                argInfo.setCast(argGroup.cast);
                args.push(argInfo);
                if (opInfo.argDescs[1]) { // listAggs accepts a 2nd argument
                    isOptional = this._isOptional(opInfo, 1);
                    argInfo = new OpPanelArg(argGroup.delim, opInfo.argDescs[1].typesAccepted, isOptional, true);
                    args.push(argInfo);
                }
            }

            args.forEach((arg, index) => {
                const rawValue = arg.getValue();
                let value;
                if (index === 1) {
                    value = rawValue;
                } else {
                    value = this.formatArgToUI(rawValue, arg.getTypeid());
                }
                arg.setValue(value);
                arg.setFormattedValue(rawValue);
                this._formatArg(arg);
                this._validateArg(arg);
            });

            groups.push({
                operator: argGroup.operator,
                args: args,
                newFieldName: argGroup.destColumn,
                distinct: argGroup.distinct
            });
        }

        this.groups = groups;

    }

    protected _getParam(): DagNodeGroupByInputStruct {
        const aggregates = [];
        this.groups.forEach(group => {
            let sourceColumn: string;
            let cast: string;
            if (group.args[0]) {
                sourceColumn = group.args[0].getFormattedValue();
                cast = group.args[0].getCast();
            } else {
                sourceColumn = "";
                cast = null;
            }
            let aggregateInfo: any = {
                operator: group.operator,
                sourceColumn: sourceColumn,
                destColumn: group.newFieldName,
                distinct: group.distinct,
                cast: cast
            };
            if (group.args[1]) {
                aggregateInfo.delim = group.args[1].getValue();
            }
            aggregates.push(aggregateInfo);
        });

        if (this.groupAll) {
            this.groupOnCols = [];
        } else {
            this.groupOnCols.map((colName) => {
                if (colName[0] === gColPrefix) {
                    return colName.slice(1);
                } else {
                    return colName;
                }
            });
        }

        return {
            groupBy: this.groupOnCols,
            aggregate: aggregates,
            icv: this.icv,
            groupAll: this.groupAll,
            includeSample: this.includeSample,
            joinBack: this.joinBack,
            newKeys: this.newKeys || null,
            dhtName: this.dhtName || "",
            outputTableName: this.outputTableName
        }
    }

    public validateAdvancedMode(
        paramStr: string,
        isSubmit?: boolean
    ): {error: string} {
        try {
            const param: DagNodeGroupByInput = <DagNodeGroupByInput>JSON.parse(paramStr);

            let error = this.dagNode.validateParam(param);
            if (error != null) {
                return error;
            }

            this._initialize(param, true, isSubmit);
            error = this.validateGroupOnCols();
            if (!error) {
                error = this.validateGroups(isSubmit);
            }
            if (!error) {
                error = this.validateNewFieldNames();
            }
            if (!error) {
                error = this._validateNewKeys();
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

    public validateGroupOnCols() {
        if (this.groupAll) {
            return;
        }
        if (!this.groupOnCols.length) {
            return {
                error: "Please provide one or more fields to group by",
                group: 0,
                arg: 0,
                type: "groupOnCol"
            };
        }
        for (let i = 0; i < this.groupOnCols.length; i++) {
            const name = this.groupOnCols[i];
            if (name.indexOf(",") > -1) {
                return {
                    error: xcStringHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                                    "name": name
                            }),
                    group: 0,
                    arg: i,
                    type: "groupOnCol"
                };
            } else if (!name.trim().length) {
                return {
                    error: "Field to group by is empty",
                    group: 0,
                    arg: i,
                    type: "groupOnCol"
                };
            } else {
                const match = this.tableColumns.find((progCol) => {
                    return progCol.getBackColName() === name;
                });
                if (!match) {
                    // if not found, let pass
                    console.warn(name, "column not found");
                }
            }
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
            const match = this.tableColumns.find((col) => {
                return col.getBackColName() === name;
            });
            if (match != null || nameMap[name]) {
                return {
                    error: "Duplicate field name",
                    group: i,
                    arg: -1,
                    type: "newField"
                };
            }
            nameMap[name] = true;
        }
        return  null;
    }

    private _validateNewKeys() {
        const newKeys: string[] = this.newKeys;
        const groups = this.groups;
        let error: string;
        const nameMap = {};
        for ( let i = 0; i < groups.length; i++) {
            nameMap[groups[i].newFieldName] = true;
        }
        for (let newKey of newKeys) {
            const parseRes = xcHelper.parsePrefixColName(newKey);
            if (parseRes.prefix) {
                error = ErrTStr.NoPrefixColumn;
                break;
            }
            error = xcHelper.validateColName(newKey, true);
            if (error) {
                break;
            }
            if (nameMap[newKey]) {
                error = newKey + " is already in use";
                break;
            }
            nameMap[newKey] = true;
        }

        return error ? {error: "Error in newKeys: " + error} : null;
    }

    private _findAggregates(param: DagNodeGroupByInputStruct): string[] {
        const aggArgs: AggColInfo[] = param.aggregate.map((aggInfo) => {
            return {
                operator: aggInfo.operator,
                aggColName: aggInfo.sourceColumn,
                newColName: aggInfo.destColumn,
                isDistinct: aggInfo.distinct
            }
        });
        let evalStrs: {}[] = aggArgs.map((aggArg: AggColInfo) => {
            return { evalString: DagNode.getGroupByAggEvalStr(aggArg)};
        });
        return DagNode.getAggsFromEvalStrs(evalStrs);
    }
}