class DagNodeJupyterInput extends DagNodeInput {
    protected input: DagNodeJupyterInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": ["numExportRows", "renames"],
        "properties": {
            "numExportRows": {
                "$id": "#/properties/numExportRows",
                "type": "integer",
                "title": "The numExportRows Schema",
                "default": 1,
                "examples": [1],
                "minimum": 1,
                "maximum": 1000
            },
            "renames": {
                "$id": "#/properties/renames",
                "type": "array",
                "title": "The renames Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                    "$id": "#/properties/renames/items",
                    "type": "object",
                    "title": "The renames Items Schema",
                    "additionalProperties": false,
                    "required": [
                      "sourceColumn",
                      "destColumn"
                    ],
                    "properties": {
                        "sourceColumn": {
                            "$id": "#/properties/renames/items/properties/sourceColumn",
                            "type": "string",
                            "title": "The SourceColumn Schema",
                            "default": "",
                            "examples": ["col1"],
                            "minLength": 1,
                            "pattern": "^(.*)$"
                        },
                        "destColumn": {
                            "$id": "#/properties/renames/items/properties/destColumn",
                            "type": "string",
                            "title": "The DestColumn Schema",
                            "default": "",
                            "examples": ["col1"],
                            "minLength": 1,
                            "pattern": "^(.*)$"
                        },
                    }
                }
            }
        }
    };

    public constructor(inputStruct: DagNodeJupyterInputStruct) {
        if (inputStruct == null) {
            inputStruct = {
                numExportRows: null,
                renames: null
            };
        }
        if (inputStruct.numExportRows == null) {
            inputStruct.numExportRows = 1000;
        }
        if (inputStruct.renames == null) {
            inputStruct.renames = [];
        }

        super(inputStruct);
    }

    public getInput(replaceParameters?: boolean): DagNodeJupyterInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            numExportRows: input.numExportRows,
            renames: xcHelper.deepCopy(input.renames)
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeJupyterInput = DagNodeJupyterInput;
}
