class DagNodePublishIMDInput extends DagNodeInput {
    protected input: DagNodePublishIMDInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "pubTableName",
          "primaryKeys",
          "operator",
          "columns"
        ],
        "properties": {
          "pubTableName": {
            "$id": "#/properties/pubTableName",
            "type": "string",
            "title": "The Pubtablename Schema",
            "default": "",
            "examples": [
              ""
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "primaryKeys": {
            "$id": "#/properties/primaryKeys",
            "type": "array",
            "title": "The Primarykeys Schema",
            "minItems": 0,
            "items": {
              "$id": "#/properties/primaryKeys/items",
              "type": "string",
              "title": "The PrimaryKey Schema",
              "default": "",
              "examples": [
                "a::class_id"
              ],
              "minLength": 0,
              "pattern": "^(.*)$"
            }
          },
          "operator": {
            "$id": "#/properties/operator",
            "type": "string",
            "title": "The Operator Schema",
            "default": "",
            "examples": [
              ""
            ],
            "minLength": 0,
            "pattern": "^(.*)$"
          },
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "Column Schema",
            "minItems": 1,
            "items": {
              "$id": "#/properties/columns/items",
              "type": "string",
              "title": "Column Schema",
              "default": "",
              "examples": [
                "colName"
              ],
              "minLength": 0,
              "pattern": "^(.*)$"
            }
          },
          "overwrite": {
            "$id": "#/properties/overwrite",
            "type": "boolean",
            "title": "Overwrite Schema",
            "default": false
          },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodePublishIMDInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            pubTableName: input.pubTableName || "",
            primaryKeys: input.primaryKeys || [],
            operator: input.operator || "",
            columns: input.columns || [],
            overwrite: input.overwrite || false
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodePublishIMDInput = DagNodePublishIMDInput;
}
