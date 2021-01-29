class DagNodeIMDTable extends DagNodeIn {
    protected input: DagNodeIMDTableInput;
    protected columns: ProgCol[];
    private elapsedTime: number;
    private _subGraph: DagSubGraph;

    public constructor(options: DagNodeIMDTableInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.IMDTable;
        this.maxParents = 0;
        this.minParents = 0;
        this.display.icon = "&#xe910;";
        this.input = this.getRuntime().accessible(new DagNodeIMDTableInput(options.input));
        this._subGraph = this.getRuntime().accessible(new DagSubGraph());

        if (options && options.subGraph) {
          this._subGraph.initFromJSON(options.subGraph);
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
            "maxItems": 0,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The schema Schema",
            "minItems": 0,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/schema/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "name",
                "type"
              ],
              "properties": {
                "name": {
                  "$id": "#/properties/schema/items/properties/name",
                  "type": "string",
                  "minLength": 1,
                  "title": "The name Schema",
                  "default": "",
                  "examples": ["column name"],
                  "pattern": "^(.*)$"
                },
                "type": {
                  "$id": "#/properties/schema/items/properties/type",
                  "type": ["string", "null"],
                  "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp,
                        ColumnType.money,
                        ColumnType.mixed,
                        ColumnType.object,
                        ColumnType.array,
                        ColumnType.unknown,
                        null
                    ],
                  "title": "The type Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              }
            }
          }
        }
    };

    /**
     * Set dataset node's parameters
     * @param input {DagNodeIMDTableInputStruct}
     */
    public setParam(input: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>{}, noAutoExecute?: boolean): void {
        const source: string = input.source;
        const version: number = input.version;
        const filterString: string = input.filterString;
        const schema: ColSchema[] = input.schema;
        const limitedRows: number = input.limitedRows;
        this.setSchema(schema);
        this.input.setInput({
            source: source,
            version: version,
            filterString: filterString,
            schema: schema,
            limitedRows: limitedRows,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    public setSubgraph(subGraph: DagGraphInfo): void {
      try {
          this._subGraph = this.getRuntime().accessible(new DagSubGraph());
          this._subGraph.initFromJSON(subGraph);
        } catch (e) {
          console.error("get published table graph failed", e);
      }
    }

    public getSubGraph(): DagSubGraph {
        return this._subGraph;
    }

    public async fetchAndSetSubgraph(tableName: string): Promise<DagSubGraph> {
        try {
          if (typeof PbTblInfo !== "undefined") {
              const pbTblInfo = new PbTblInfo({name: tableName});
              const subGraph = await pbTblInfo.getDataflow();
              this.setSubgraph(subGraph);
              return this._subGraph;
          }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    public getLoadArgs(): object {
        // This function should be refactored as it doesn't return LoadArgs.
        // This returns sourceArgsList. LoadArgs contains parseArgs as well.
        let loadArgs = {};
        try {
            if (!this._subGraph) {
                return loadArgs;
            }
            const nodes = this._subGraph.getNodesByType(DagNodeType.Dataset);
            nodes.forEach((node) => {
                const parsedLoadArgs = JSON.parse(node.getParam().loadArgs);
                loadArgs[node.getId()] = parsedLoadArgs.args.loadArgs.sourceArgsList;
            });
        } catch (e) {
            console.error("get load args fails", e);
        }

        return loadArgs;
    }

    public setLoadArgs(loadArgs): boolean {
        try {
            if (!this._subGraph) {
                return false;
            }
            const nodes = this._subGraph.getNodesByType(DagNodeType.Dataset);
            nodes.forEach((node) => {
                const param = node.getParam();
                const parsedLoadArgs = JSON.parse(param.loadArgs);
                parsedLoadArgs.args.loadArgs.sourceArgsList = loadArgs[node.getId()];
                node.setParam({
                    ...param,
                    loadArgs: JSON.stringify(parsedLoadArgs)
                }, true);
            });
            return true;
        } catch (e) {
            console.error("set load args fails");
            return false;
        }
    }

    public getUsedLoaderUDFModules(): Set<string> {
        let set: Set<string> = new Set();
        Object.values(this.getFullLoadArgs()).forEach((loadArgs) => {
            const parserArguments = JSON.parse(loadArgs.parseArgs.parserArgJson);
            if (parserArguments.hasOwnProperty('loader_name')) {
                this._getUDFFromParseArgs(loadArgs.parseArgs, set);
            }
        });
        return set;
    }

    public getFullLoadArgs(): object {
        // Ideally, we should refactor the other function as it returns "sourceArgList"
        // not the full load args.
        let fullLoadArgs = {};
        try {
            if (!this._subGraph) {
                return fullLoadArgs;
            }
            const nodes = this._subGraph.getNodesByType(DagNodeType.Dataset);
            nodes.forEach((node) => {
                const parsedLoadArgs = JSON.parse(node.getParam().loadArgs);
                fullLoadArgs[node.getId()] = parsedLoadArgs.args.loadArgs;
            });
        } catch (e) {
            console.error("get load args failed", e);
        }

        return fullLoadArgs;
    }

    public getSource(): string {
        return this.getParam().source;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Source Table";
    }


    /**
     * executing an IMDTable node involves doing a XcalarRestoreTable and XcalarRefreshTable
     * which do not go through XcalarQuery so we get stats via XIApi.getTableMeta
     * instead of XcalarQueryState
     * @override
     */
    public async updateStepThroughProgress(): Promise<void> {
        return super._updateProgressFromTable(XcalarApisT.XcalarApiSelect, this.elapsedTime);
    }

    public setElapsedTime(elapsedTime) {
        this.elapsedTime = elapsedTime;
    }

    public markActivating() {
        this.events.trigger(DagNodeEvents.ActivatingTable, {
            node: this
        });
    }

    public markActivatingDone() {
        this.events.trigger(DagNodeEvents.DoneActivatingTable, {
            node: this
        });
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeIMDTableInputStruct = this.getParam();
        if (input.source) {
            hint = `Source: ${input.source}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    /**
     * @override
     * @param includeStats
     */
    protected _getSerializeInfo(includeStats?: boolean): DagNodeIMDTableInfo {
        const serializedInfo: DagNodeIMDTableInfo = <DagNodeIMDTableInfo>super._getSerializeInfo(includeStats);
        serializedInfo.subGraph = this._subGraph.getSerializableObj();
        return serializedInfo;
    }

    private _getUDFFromParseArgs(parseArgs: object, moduleSet: Set<string>): void {
        const fnName: string = parseArgs["parserFnName"];
        if (fnName == null) {
            // No function specified
            return;
        }
        const splits: string[] = fnName.split(':');
        if (splits.length === 1) {
            // There is just a function name
            return;
        }
        const moduleName: string = splits[0];
        moduleSet.add(moduleName);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIMDTable = DagNodeIMDTable;
};
