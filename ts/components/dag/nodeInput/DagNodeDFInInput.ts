class DagNodeDFInInput extends DagNodeInput {
    protected input: DagNodeDFInInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        // "required": [
        //   "dataflowId"
        // ],
        "properties": {
            "linkOutName": {
                "$id": "#/properties/linkOutName",
                "type": "string",
                "title": "The linkOutName Schema",
                "default": "",
                "examples": ["linkOutName"],
                "minLength": 0,
                "pattern": "^(.*)$"
            },
            "dataflowId": {
                "$id": "#/properties/dataflowId",
                "type": "string",
                "title": "The dataflowId Schema",
                "default": "",
                "examples": ["dataflowId"],
                "minLength": 0,
                "pattern": "^(.*)$"
            },
            "source": {
              "$id": "#/properties/source",
              "type": "string",
              "title": "The source Schema",
              "default": "",
              "examples": ["source"],
              "minLength": 0,
              "pattern": "^(.*)$"
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
                      "$id": "#/properties/eval/schema/properties/type",
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
                      "examples": [
                        "integer"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    }
                  }
                }
              },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeDFInInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            dataflowId: input.dataflowId || "",
            linkOutName: input.linkOutName || "",
            source: input.source || ""
          };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDFInInput = DagNodeDFInInput;
}
