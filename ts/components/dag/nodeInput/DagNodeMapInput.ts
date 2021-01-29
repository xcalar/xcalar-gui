class DagNodeMapInput extends DagNodeInput {
    protected input: DagNodeMapInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "eval",
          "icv"
        ],
        "optional": [
            "outputTableName"
        ],
        "properties": {
          "eval": {
            "$id": "#/properties/eval",
            "type": "array",
            "title": "The Eval Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/eval/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "evalString",
                "newField"
              ],
              "properties": {
                "evalString": {
                  "$id": "#/properties/eval/items/properties/evalString",
                  "type": "string",
                  "minLength": 1,
                  "title": "The Evalstring Schema",
                  "default": "",
                  "examples": [
                    "add(colName, 2)"
                  ],
                  "pattern": "^(.*)$"
                },
                "newField": {
                  "$id": "#/properties/eval/items/properties/newField",
                  "type": "string",
                  "minLength": 1,
                  "title": "The Newfield Schema",
                  "default": "",
                  "examples": [
                    "newColumn"
                  ],
                  "pattern": "^(.*)$"
                }
              }
            }
          },
          "icv": {
            "$id": "#/properties/icv",
            "type": "boolean",
            "title": "The Icv Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "outputTableName": {
            "$id": "#/properties/outputTableName",
            "type": "string",
            "title": "The outputTableName Schema",
            "maxLength": XcalarApisConstantsT.XcalarApiMaxTableNameLen - 10,
            "pattern": "^[a-zA-Z][a-zA-Z\\d\\_\\-]*$|^$"
          }
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeMapInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            eval: input.eval || [{evalString: "", newField: ""}],
            icv: input.icv || false,
            outputTableName: input.outputTableName || ""
        };
    }

    public setEvals(evals) {
        this.input.eval = evals;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeMapInput = DagNodeMapInput;
};
