class DagNodeMap extends DagNode {
    protected input: DagNodeMapInput;

    public constructor(options: DagNodeMapInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Map;
        this.allowAggNode = true;
        this.minParents = 1;
        this.display.icon = "&#xe9da;";
        this.input = this.getRuntime().accessible(new DagNodeMapInput(options.input));
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "enum": [DagNodeSubType.Cast, null]
          }
        }
    };

    /**
     * Set map node's parameters
     * @param input {DagNodeMapInputStruct}
     * @param input.eval {Array} array of {evalString, newFieldName}
     */
    public setParam(input: DagNodeMapInputStruct = <DagNodeMapInputStruct>{}, noAutoExecute?: boolean): boolean | void {
        this.input.setInput({
            eval: input.eval,
            icv: input.icv,
            outputTableName: input.outputTableName
        });
        return super.setParam(null, noAutoExecute);
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const params = this.input.getInput(replaceParameters);
        const colMap: Map<string, number> = new Map();
        columns.forEach((col, i) => {
            colMap.set(col.getBackColName(), i);
        });

        params.eval.forEach((evalInput) => {
            const colName: string = evalInput.newField;
            if (xcHelper.parsePrefixColName(colName).prefix) {
                throw new Error("columns generated by map cannot have prefix");
            }

            const func = XDParser.XEvalParser.parseEvalStr(evalInput.evalString);
            if (func.error) {
                console.error(func.error);
                return;
            }
            const colType: ColumnType = this._getOpType(func);
            const progCol = ColManager.newPullCol(colName, colName, colType);

            // check if newCol is replacing an old column and if so, splice
            // out the old column
            let fromCol = null;
            if (colMap.has(colName) || this.subType === DagNodeSubType.Cast) {
                let fromColName = colName;
                if (this.subType === DagNodeSubType.Cast) {
                    fromColName = (<ParsedEvalArg>func.args[0]).value;
                }
                const index = colMap.get(fromColName);
                if (index == null) {
                    columns.push(progCol);
                } else {
                    fromCol = columns[index];
                    columns[index] = progCol;
                }
            } else {
                columns.push(progCol);
            }

            changes.push({
                from: fromCol,
                to: progCol
            });
        });
        return {
            columns: columns,
            changes: changes
        };
    }

    /**
     * replaces the column names used in eval strings
     * @param renameMap {previousColName1: newColName1, prevColName2: newColName2}
     */
    public applyColumnMapping(renameMap: {columns: any}): void {
        try {
            const evals = this.input.getInput().eval;
            evals.forEach(evalObj => {
                evalObj.evalString = this._replaceColumnInEvalStr(evalObj.evalString, renameMap.columns);
            });
            this.input.setEvals(evals);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        if (this.type === DagNodeType.Map && this.getSubType() == null) {
            return "Scalar Function";
        } else {
            return super.getDisplayNodeType();
        }
    }

    /**
     * Get the used UDF modules in the node
     */
    public getUsedUDFModules(): Set<string> {
        const set: Set<string> = new Set();
        this.input.getInput().eval.forEach((evalArg) => {
            try {
                const arg = XDParser.XEvalParser.parseEvalStr(evalArg.evalString);
                this._getUDFFromArg(arg, set);
            } catch (e) {
                console.error(e);
            }
        });
        return set;
    }

    /**
     * Get the resolutions of used UDF modules
     */
    public getModuleResolutions(): XDPromise<Map<string, string>> {
        const taskList = [];
        this.getUsedUDFModules().forEach((moduleName) => {
            taskList.push(
                XcalarUdfGetRes(
                    XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession,
                    moduleName
                ).then((ret) => ({
                    name: moduleName, resolution: ret
                })).fail(() => null)
            );
        });

        return PromiseHelper.when(...taskList)
        .then((rets: any[]) => {
            const result: Map<string, string> = new Map();
            for (const ret of rets) {
                if (ret != null) {
                    result.set(ret.name, ret.resolution);
                }
            }
            return result;
        });
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeMapInputStruct = this.getParam();
        if (input.icv) {
            hint = "ERRORS";
        } else if (input.eval.length) {
            const evalStrs: string[] = input.eval.map((evalInfo) => evalInfo.evalString);
            hint = evalStrs.join(",");
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        this.input.getInput().eval.forEach((evalArg) => {
            const arg = XDParser.XEvalParser.parseEvalStr(evalArg.evalString);
            this._getColumnFromEvalArg(arg, set);
        });
        return set;
    }

    private _getOpType(func: ParsedEval): ColumnType {
        const operator: string = func.fnName;
        let colType: ColumnType = null;
        const opsMap = this.getRuntime().getXDFService().getOperatorsMap();
        for (let category in opsMap) {
            const ops = opsMap[category];
            const opInfo = ops[operator];
            if (opInfo) {
                colType = xcHelper.convertFieldTypeToColType(opInfo.outputType);
                break;
            }
        }
        return colType;
    }

    private _getUDFFromArg(arg: object, set: Set<string>): void {
        const fnName: string = arg["fnName"];
        if (fnName == null) {
            return;
        }
        const splits: string[] = fnName.split(":");
        if (splits.length === 2) {
            const moduleName: string = splits[0];
            set.add(moduleName);
        }
        // recusrive check the arg
        if (arg["args"] != null) {
            arg["args"].forEach((subArg) => {
                this._getUDFFromArg(subArg, set);
            });
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeMap = DagNodeMap;
};