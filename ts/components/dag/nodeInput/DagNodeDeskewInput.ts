class DagNodeDeskewInput extends DagNodeInput {
    protected input: DagNodeDeskewInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "required": [
          "column"
        ],
        "optional": [
            "outputTableName"
        ],
        "additionalProperties": false,
        "properties": {
          "column": {
            "$id": "#/properties/column",
            "type": "string",
            "title": "The Column Schema",
            "default": "",
            "examples": [
              "column"
            ],
            "pattern": "^(.*)$",
            "minLength": 1
          },
          "newKey": {
            "$id": "#/properties/newKey",
            "type": "string",
            "title": "The newKey Schema",
            "default": "",
            "examples": [
              "newKey"
            ],
            "pattern": "^(.*)$",
            "minLength": 0
          },
          "outputTableName": {
            "$id": "#/properties/outputTableName",
            "type": "string",
            "title": "The outputTableName Schema",
            "maxLength": XcalarApisConstantsT.XcalarApiMaxTableNameLen - 10,
            "pattern": "^[a-zA-Z][a-zA-Z\\d\\_\\-]*$|^$"
          }
        }
    }

    public getInput(replaceParameters?: boolean): DagNodeDeskewInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            column: input.column || "",
            newKey: input.newKey || "",
            outputTableName: input.outputTableName || ""
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDeskewInput = DagNodeDeskewInput;
}
