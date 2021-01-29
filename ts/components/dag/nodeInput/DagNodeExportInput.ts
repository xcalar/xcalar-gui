class DagNodeExportInput extends DagNodeInput {
    protected input: DagNodeExportInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "required": [
          "columns",
          "driver",
          "driverArgs"
        ],
        "additionalProperties": false,
        "properties": {
            "columns": {
                "$id": "#/properties/columns",
                "type": "array",
                "minItems": 1,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/columns/items",
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "sourceColumn",
                    "destColumn"
                  ],
                  "properties": {
                    "sourceColumn": {
                      "$id": "#/properties/columns/items/properties/sourceColumn",
                      "type": "string",
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "destColumn": {
                      "$id": "#/properties/columns/items/properties/destColumn",
                      "type": "string",
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                  }
                }
            },
            "driver": {
                "$id": "#/properties/driver",
                "type": "string",
                "minLength": 1
            },
            "driverArgs": {
                "$id": "#/properties/driverArgs",
                "type": "object"
            },
        }
    };


    public getInput(replaceParameters?: boolean): DagNodeExportInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            driver: input.driver || "",
            driverArgs: input.driverArgs || {}
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeExportInput = DagNodeExportInput;
};
