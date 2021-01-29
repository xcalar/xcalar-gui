class DagNodePlaceholder extends DagNode {
    protected columns: ProgCol[];
    protected name: string;

    public constructor(options: DagNodePlaceholderInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.maxParents = -1;
        this.minParents = 1;
        this.input = this.getRuntime().accessible(new DagNodePlaceholderInput(options.input));
        this.name = options.name || DagNodeType.Placeholder;
        // this.display.icon = "&#xe936;";
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

    protected _getSerializeInfo(includeStats?: boolean): DagNodeInfo {
        const serializedInfo: DagNodePlaceholderInfo = <DagNodePlaceholderInfo>super._getSerializeInfo(includeStats);
        serializedInfo.name = this.name;
        return serializedInfo;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodePlaceholder = DagNodePlaceholder;
};
