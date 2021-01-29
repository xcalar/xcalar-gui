class DagNodeDFOut extends DagNodeOutOptimizable {
    protected input: DagNodeDFOutInput;

    private _queries: Map<string, string>; // non-persist

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.DFOut;
        this.display.icon = "&#xe955;"; // XXX TODO: UI design
        this.input = this.getRuntime().accessible(new DagNodeDFOutInput(options.input));
        this.optimized = this.subType === DagNodeSubType.DFOutOptimized;
        this._queries = new Map<string, string>();
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
            "enum": [DagNodeSubType.DFOutOptimized, null]
          }
        }
    };

    public setParam(input: DagNodeDFOutInputStruct = <DagNodeDFOutInputStruct>{}, noAutoExecute?: boolean): void {
        this.input.setInput({
            name: input.name,
            linkAfterExecution: input.linkAfterExecution
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(columns: ProgCol[] ): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    public shouldLinkAfterExecution(): boolean {
        return this.input.getInput().linkAfterExecution;
    }

    /**
     * @override
     */
    public getOutColumns(replaceParameters?: boolean): {columnName: string, headerAlias: string}[] {
        let parentNode: DagNode = this.getParents()[0];
        let columns: ProgCol[] = parentNode
        ? parentNode.getLineage().getColumns(replaceParameters, true)
        : [];

        const validTypes = xcHelper.getBasicColTypes(true);
        columns = columns.filter((col) => {
            return col && validTypes.includes(col.getType());
        });
        return columns.map((col) => {
            const backColName = col.getBackColName();
            return {
                columnName: backColName,
                headerAlias: backColName
            };
        });
    }

    /**
     * @override
     */
    public beRunningState(): void {
        this._queries.clear();
        super.beRunningState();
    }

    /**
     * Linke out node don't run XcalarQuery, have to maunally update progress
     * @override
     */
    public async updateStepThroughProgress(): Promise<void> {
        return super._updateProgressFromTable(null, null);
    }

    /**
     * Stores the query and destable for a specific tabid's request
     * @param tabId the tab making the request
     * @param destTable destination table
     */
    public setStoredQueryDest(tabId: string, destTable: string): void{
        this._queries.set(tabId, destTable);
    }

    /**
     * Returns stored query info
     * @param tabId
     */
    public getStoredQueryDest(tabId: string): string {
        return this._queries.get(tabId);
    }

    /**
     * Removes stored query info
     * @param tabId
     */
    public deleteStoredQuery(tabId: string) {
        this._queries.delete(tabId);
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return this.optimized ? "Link Out Optimized" : "Function Output";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFOutInputStruct = this.getParam();
        if (input.name) {
            hint = `Name: ${input.name}`;
        }
        return hint;
    }


    protected _getColumnsUsedInInput() {
        return null;
    }

    protected _clearConnectionMeta(keepRetina?: boolean): void {
        super._clearConnectionMeta(keepRetina);
        this._queries.clear();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDFOut = DagNodeDFOut;
};
