class DagNodeAggregate extends DagNode {
    protected input: DagNodeAggregateInput;
    private aggVal: string | number; // non-persistent
    private graph: DagGraph; // non-persistent
    private fetchValPromimse: Promise<void>; // non-persistent

    public constructor(options: DagNodeAggregateInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
        this.aggVal = options.aggVal || null;
        this.graph = options.graph || null;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe939;";
        this.input = this.getRuntime().accessible(new DagNodeAggregateInput(options.input));
        let dest: string = this.input.getInput().dest;
        let backname: string = dest;
        if (dest.startsWith(gAggVarPrefix)) {
            backname = dest.substring(1);
        }
        let tabId: string = this.graph ? this.graph.getTabId() : "";
        if (tabId == null) {tabId = ""};
        if (dest != "" &&
                !this.getRuntime().getDagAggService().hasAggregate(dest) &&
                tabId != "" && !DagTabUser.idIsForSQLFolder(tabId) ) {
            // If we upload a dataflow we need to add the relevant aggregates to the agg manager
            // But we dont add sql aggregates
            this.getRuntime().getDagAggService().addAgg(dest, {
                value: null,
                dagName: backname,
                aggName: dest,
                tableId: null,
                backColName: null,
                op: null,
                node: this.getId(),
                graph: tabId
            });
        }
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
          }
        }
    };

    public static deleteAgg(aggNames: string[], ignoreError?: boolean): XDPromise<void> {
        if (aggNames.length == 0) {
            return PromiseHelper.resolve();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promises: XDPromise<void>[] = [];
        let sql = {
            "operation": SQLOps.DeleteAgg,
            "aggs": aggNames
        };
        let txId = Transaction.start({
            "operation": SQLOps.DeleteAgg,
            "sql": sql,
            "track": true
        });

        for (let i = 0; i < aggNames.length; i++) {
            promises.push(XIApi.deleteTable(txId, aggNames[i], ignoreError));
        }

        PromiseHelper.when(...promises)
        .then(() => {
            Transaction.done(txId, {noLog: true});
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {noAlert: true, noNotification: true});
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * Set aggregate node's parameters
     * @param input {DagNodeAggregateInputStruct}
     * @param input.evalString {string} The aggregate eval string
     */
    public setParam(
        input: DagNodeAggregateInputStruct = <DagNodeAggregateInputStruct>{},
        noAutoExecute?: boolean
    ): boolean | void {
        this.input.setInput({
            evalString: input.evalString,
            dest: input.dest
        });
        let promise: XDPromise<any> = PromiseHelper.resolve();
        let oldAggName = this.getParam().dest;
        if (oldAggName != null && oldAggName != input.dest &&
                DagAggManager.Instance.hasAggregate(oldAggName)) {
            let oldAgg = DagAggManager.Instance.getAgg(oldAggName);
            promise = DagAggManager.Instance.removeAgg(oldAgg.dagName);

        } else if (oldAggName != null && oldAggName == input.dest &&
                DagAggManager.Instance.hasAggregate(oldAggName)) {
            let oldAgg = DagAggManager.Instance.getAgg(oldAggName);
            if (oldAgg.value != null) {
                // We're replacing the value so we need to delete it
                promise = DagAggManager.Instance.removeAgg(oldAggName, true);
            }
        }
        PromiseHelper.alwaysResolve(promise)
        .then(() => {
            let tabId = this.graph ? this.graph.getTabId() : null;
            let aggName = input.dest;
            if (aggName.startsWith(gAggVarPrefix)) {
                aggName = aggName.substring(1);
            }
            return DagAggManager.Instance.addAgg(input.dest, {
                value: null,
                dagName: aggName,
                aggName: input.dest,
                tableId: null,
                backColName: null,
                op: null,
                node: this.getId(),
                graph: tabId
            });
        });

        return super.setParam(null, noAutoExecute);
    }

    public resetAgg(): XDPromise<void> {
        try {
            let aggName = this.getAggName();
            if (!aggName) {
                return PromiseHelper.resolve();
            } else if (typeof DagAggManager !== "undefined") {
                let agg = DagAggManager.Instance.getAgg(aggName);
                if (agg && this.graph && agg.graph == this.graph.getTabId()) {
                    return DagAggManager.Instance.removeValue(aggName);
                } else {
                    return PromiseHelper.resolve();
                }
            } else {
                return DagNodeAggregate.deleteAgg([aggName]);
            }
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject();
        }
    }

    /**
     *
     * @param aggVal {string | number} Set the aggregate result
     */
    public setAggVal(aggVal: string | number): void {
        this.aggVal = aggVal;
    }

    /**
     * @returns {string | number} Return the aggreate result
     */
    public getAggVal(): string | number {
        return this.aggVal;
    }

    public async fetchAggVal(txId, dstAggName: string): Promise<void> {
        let value;
        const promise = XIApi.getAggValue(txId, dstAggName);
        this.fetchValPromimse = promise;
        try {
            value = await promise;
            this.setAggVal(value);
        } catch (e) {
            throw e;
        } finally {
            this.fetchValPromimse = undefined;
        }
        return value;
    }

    public async waitForFetchingAggVal(): Promise<void> {
        if (this.fetchValPromimse != null) {
            try {
                await this.fetchValPromimse;
            } catch (e) {
                console.error(e);
            }
        }
    }

    public getAggName(): string {
        return this.input.getInput().dest;
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [],
            changes: []
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            this.input.setEval(this._replaceColumnInEvalStr(this.input.getInput().evalString,
                                                            renameMap.columns));
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
        return "Single Value";
    }


    /* @override */
    protected _validateConfiguration(): {error: string} {
        const error = super._validateConfiguration();
        if (error != null) {
            return error;
        }

        if (this.getRuntime().getDagAggService().hasAggregate(this.getParam().dest)) {
            let agg = this.getRuntime().getDagAggService().getAgg(this.getParam().dest);
            if (!this.graph || agg.graph != this.graph.getTabId()) {
                return {
                    error: xcStringHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        name: this.getParam().dest,
                        aggPrefix: ""
                    })
                };
            }
        }
    }

    protected _clearConnectionMeta(): void {
        super._clearConnectionMeta();
        this.setAggVal(null);
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeAggregateInfo {
        const serializedInfo: DagNodeAggregateInfo = <DagNodeAggregateInfo>super._getSerializeInfo(includeStats);
        if (this.aggVal != null) {
            serializedInfo.aggVal = this.aggVal;
        }
        return serializedInfo;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeAggregateInputStruct = this.getParam();
        if (input.evalString && input.dest) {
            hint = `${input.dest}: ${input.evalString}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const evalString: string = this.input.getInput().evalString;
        const arg = XDParser.XEvalParser.parseEvalStr(evalString);
        const set: Set<string> = new Set();
        this._getColumnFromEvalArg(arg, set);
        return set;
    }

    protected _removeTable(): void {
        this.resetAgg();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeAggregate = DagNodeAggregate;
};
