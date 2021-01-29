// General Class for Dest Node
abstract class DagNodeOut extends DagNode {
    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe955;";
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
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeOut = DagNodeOut;
};
