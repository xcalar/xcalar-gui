class DagNodeRowNumInput extends DagNodeInput {
    protected input: DagNodeRowNumInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": ["newField"],
        "optional": ["outputTableName"],
        "properties": {
            "newField": {
                "$id": "#/properties/newField",
                "type": "string",
                "title": "The newField Schema",
                "default": "",
                "examples": ["col1"],
                "minLength": 1,
                "pattern": "^(.*)$"
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

    public constructor(inputStruct: DagNodeRowNumInputStruct) {
        if (inputStruct == null) {
            inputStruct = { newField: '' };
        }
        if (inputStruct.newField == null) {
            inputStruct.newField = '';
        }
        super(inputStruct);
    }

    public getInput(replaceParameters?: boolean): DagNodeRowNumInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            newField: input.newField,
            outputTableName: input.outputTableName || ""
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeRowNumInput = DagNodeRowNumInput;
}
