class DagNodeFilterInput extends DagNodeInput {
    protected input: DagNodeFilterInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "required": [
          "evalString"
        ],
        "optional": [
            "outputTableName"
        ],
        "additionalProperties": false,
        "properties": {
          "evalString": {
            "$id": "#/properties/evalString",
            "type": "string",
            "title": "The Evalstring Schema",
            "default": "",
            "examples": [
              "eq(colName, 3)"
            ],
            "pattern": "^(.*)$",
            "minLength": 1
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

    public getInput(replaceParameters?: boolean): DagNodeFilterInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            evalString: input.evalString || "",
            outputTableName: input.outputTableName || ""
        };
    }

    public setEvalStr(evalStr) {
        this.input.evalString = evalStr;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeFilterInput = DagNodeFilterInput;
};
