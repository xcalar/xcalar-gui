class DagNodeAggregateInput extends DagNodeInput {
    protected input: DagNodeAggregateInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "evalString",
          "dest"
        ],
        "properties": {
          "evalString": {
            "$id": "#/properties/evalString",
            "type": "string",
            "title": "The Evalstring Schema",
            "default": "",
            "examples": [
              "avg(a::class_id)"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "dest": {
            "$id": "#/properties/dest",
            "type": "string",
            "title": "The Dest Schema",
            "default": "",
            "examples": [
              "^aggName"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          }
        }
    };

    public getInput(replaceParameters?: boolean) {
        const input = super.getInput(replaceParameters);
        return {
            evalString: input.evalString || "",
            dest: input.dest || ""
        };
    }

    public setEval(evalString) {
        this.input.evalString = evalString;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeAggregateInput = DagNodeAggregateInput;
}
