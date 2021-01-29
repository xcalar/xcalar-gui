class DagNodeSQLFuncInInput extends DagNodeInput {
    protected input: DagNodeSQLFuncInInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "properties": {
          "source": {
            "$id": "#/properties/source",
            "type": "string",
            "title": "The Source Schema",
            "default": "",
            "examples": [
              "Table"
            ],
            "minLength": 0, // allow empty source
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
                  "default": "",
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

    public getInput(replaceParameters?: boolean): DagNodeSQLFuncInInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source || ""
        };
    }
}