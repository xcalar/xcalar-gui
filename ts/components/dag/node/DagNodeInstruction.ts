class DagNodeInstruction extends DagNode {
    protected columns: ProgCol[];
    protected name: string;

    public constructor(options: any, runtime?: DagRuntime) {
        super(options, runtime);
        this.maxParents = 1;
        this.minParents = 1;
        this.input = this.getRuntime().accessible(new DagNodePlaceholderInput(options.input));
        this.display.icon = "&#xe990;"; // xi-plus
        this.title = "Click to add\n an operator node";
        // this.description = "Click this node to select an operator node," +
        //                 "or drag and drop a node from the operators bar above";
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

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "+";
    }


    protected _getSerializeInfo(_includeStats?: boolean): DagNodeInfo {
        return {
            type: undefined
        };
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeInstruction = DagNodeInstruction;
};
