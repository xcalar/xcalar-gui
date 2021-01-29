class DagNodePublishIMD extends DagNode {
    protected input: DagNodePublishIMDInput;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.PublishIMD;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe910;";
        this.input = this.getRuntime().accessible(new DagNodePublishIMDInput(options.input));
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
     * Set dataset node's parameters
     * @param input {DagNodePublishIMDInputStruct}

     */
    public setParam(input: DagNodePublishIMDInputStruct, noAutoExecute?: boolean): void {
        this.input.setInput({
            pubTableName: input.pubTableName,
            primaryKeys: input.primaryKeys,
            operator: input.operator,
            columns: input.columns,
            overwrite: input.overwrite || false
        });
        super.setParam(null, noAutoExecute);
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [], // export node no need to know lineage
            changes: []
        }
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Publish Table";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodePublishIMDInputStruct = this.getParam();
        if (input.pubTableName) {
            hint = `Publish Table: ${input.pubTableName}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodePublishIMD = DagNodePublishIMD;
};
