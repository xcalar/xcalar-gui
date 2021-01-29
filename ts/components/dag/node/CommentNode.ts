class CommentNode {
    public static readonly KEY: string = "comment";
    private static uid: XcUID;

    private id: CommentNodeId;
    private text: string;
    private display: {x: number, y: number, height: number, width: number};

    public static generateId(): string {
        this.uid = this.uid || new XcUID(CommentNode.KEY, true);
        return this.uid.gen();
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": true,
        "required": [
          "id",
          "text"
        ],
        "properties": {
          "id": {
            "$id": "#/properties/id",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "nodeId": {
            "$id": "#/properties/nodeId",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "display": {
            "$id": "#/properties/display",
            "type": "object",
            "additionalProperties": true,
            "required": [
              "x",
              "y"
            ],
            "properties": {
              "x": {
                "$id": "#/properties/display/properties/x",
                "type": "number",
                "minimum": 0
              },
              "y": {
                "$id": "#/properties/display/properties/y",
                "type": "number",
                "minimum": -20
              },
              "width": {
                "$id": "#/properties/display/properties/width",
                "type": "number",
                "minimum": 20,
                "maximum": 20000
              },
              "height": {
                "$id": "#/properties/display/properties/height",
                "type": "number",
                "minimum": 20,
                "maximum": 20000
              }
            }
          },
          "text": {
            "$id": "#/properties/text",
            "type": "string"
          }
        }
    };

     /**
     * @returns schema with id replaced with nodeId (used for validating copied nodes)
     */
    public static getCopySchema() {
        let schema = xcHelper.deepCopy(CommentNode.schema);
        schema.required.splice(schema.required.indexOf("id"), 1);
        return schema;
    }


    public constructor(options: CommentInfo) {
        this.id = options.id || CommentNode.generateId();
        this.text = options.text || "";
        const display = options.display || {x: -1, y: -1};
        this.display = {
            x: display.x || 0,
            y: display.y || 0,
            width: display.width || 180,
            height: display.height || 80,
        };
    }

    public getId(): string {
        return this.id;
    }

    public setText(text): void {
        this.text = text;
    }

    public getText(): string {
        return this.text;
    }

    public clear(): void {
        this.text = "";
    }

    public setPosition(display: Coordinate): void {
        this.display.x = display.x;
        this.display.y = display.y;
    }

    public getPosition(): Coordinate {
        return {
            x: this.display.x,
            y: this.display.y
        };
    }

    public setDimensions(dimensions: Dimensions) {
        this.display.width = dimensions.width;
        this.display.height = dimensions.height;
    }

    public getDimensions(): Dimensions {
        return {
            width: this.display.width,
            height: this.display.height
        };
    }

    public getDisplay() {
        return this.display;
    }

    /**
     * Generates the serializable info
     */
    public getSerializableObj(): CommentInfo {
        return {
            id: this.id,
            text: this.text,
            display: this.display
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.CommentNode = CommentNode;
};
