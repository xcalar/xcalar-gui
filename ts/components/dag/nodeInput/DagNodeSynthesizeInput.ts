class DagNodeSynthesizeInput extends DagNodeInput {
    protected input: DagNodeSynthesizeInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": ["colsInfo"],
        "optional": ["outputTableName"],
        "properties": {
            "colsInfo": {
                "$id": "#/properties/colsInfo",
                "type": "array",
                "title": "The colsInfo Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                    "$id": "#/properties/colsInfo/items",
                    "type": "object",
                    "title": "The colsInfo Items Schema",
                    "additionalProperties": false,
                    "required": [
                      "sourceColumn",
                      "destColumn",
                      "columnType"
                    ],
                    "properties": {
                        "sourceColumn": {
                            "$id": "#/properties/colsInfo/items/properties/sourceColumn",
                            "type": "string",
                            "title": "The SourceColumn Schema",
                            "default": "",
                            "examples": ["col1"],
                            "minLength": 1,
                            "pattern": "^(.*)$"
                        },
                        "destColumn": {
                            "$id": "#/properties/colsInfo/items/properties/destColumn",
                            "type": "string",
                            "title": "The DestColumn Schema",
                            "default": "",
                            "examples": ["col1"],
                            "minLength": 1,
                            "pattern": "^(.*)$"
                        },
                        "columnType": {
                            "$id": "#/properties/colsInfo/items/properties/columnType",
                            "type": ["string", "null"],
                            "title": "The ColumnType Schema",
                            "examples": ["integer"],
                            "minLength": 1,
                            "pattern": "^(.*)$"
                        },
                    }
                }
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

    public getInput(replaceParameters?: boolean): DagNodeSynthesizeInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            colsInfo: input.colsInfo || [],
            outputTableName: input.outputTableName || ""
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSynthesizeInput = DagNodeSynthesizeInput;
}
