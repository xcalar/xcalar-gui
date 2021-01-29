class DagNodeDFOutInput extends DagNodeInput {
    protected input: DagNodeDFOutInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "name",
          "linkAfterExecution"
        ],
        "properties": {
            "name": {
                "$id": "#/properties/name",
                "type": "string",
                "title": "The Name Schema",
                "default": "",
                "examples": ["name"],
                "minLength": 1,
                "pattern": "^(.*)$"
            },
            "linkAfterExecution": {
                "$id": "#/properties/linkAfterExecution",
                "type": "boolean",
                "title": "The linkAfterExecution Schema",
                "default": false,
            },
            "columns": {
                "$id": "#/properties/columns",
                "type": "array",
                "title": "The columns Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/columns/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "required": [
                    "sourceName",
                    "destName"
                  ],
                  "properties": {
                    "name": {
                      "$id": "#/properties/schema/items/properties/sourceName",
                      "type": "string",
                      "minLength": 1,
                      "title": "The sourceName Schema",
                      "default": "",
                      "examples": ["sourceName"],
                      "pattern": "^(.*)$"
                    },
                    "type": {
                      "$id": "#/properties/eval/schema/properties/destName",
                      "type": "string",
                      "minLength": 1,
                      "title": "The destName Schema",
                      "default": "",
                      "examples": ["destName"],
                      "pattern": "^(.*)$"
                    }
                  }
                }
            },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeDFOutInputStruct {
        const input = super.getInput(replaceParameters);
        let linkAfterExecution: boolean = input.linkAfterExecution;
        if (linkAfterExecution == null) {
            // default to be false
            linkAfterExecution = false;
        }
        return {
            name: input.name || "",
            linkAfterExecution: linkAfterExecution
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDFOutInput = DagNodeDFOutInput;
}
