class DagNodeFilter extends DagNode {
    protected input: DagNodeFilterInput;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
        this.minParents = 1;
        this.display.icon = "&#xe938;";
        this.input = this.getRuntime().accessible(new DagNodeFilterInput(options.input));
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

    /**
     * Set filter node's parameters
     * @param input {DagNodeFilterInputStruct}
     * @param input.evalString {string} The filter eval string
     */
    public setParam(input: DagNodeFilterInputStruct = <DagNodeFilterInputStruct>{}, noAutoExecute?: boolean) {
        this.input.setInput({
            evalString: input.evalString,
            outputTableName: input.outputTableName
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            const evalStr = this.input.getInput().evalString;
            this.input.setEvalStr(this._replaceColumnInEvalStr(evalStr,
                                                            renameMap.columns));
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeFilterInputStruct = this.getParam();
        if (input.evalString) {
            hint = input.evalString;
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
}

if (typeof exports !== 'undefined') {
    exports.DagNodeFilter = DagNodeFilter;
};
