class DagNodeIndex extends DagNode {
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.minParents = 1;
        this.input = this.getRuntime().accessible(new DagNodeIndexInput(options.input));
        this.display.icon = "&#xe936;";
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

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeIndexInfo {
        const serializedInfo: DagNodeIndexInfo = <DagNodeIndexInfo>super._getSerializeInfo(includeStats);
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeIndexInputStruct = this.getParam();
        if (input.columns && input.columns.length) {
            hint = `Index on: ${input.columns.join(", ")}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIndex = DagNodeIndex;
};
