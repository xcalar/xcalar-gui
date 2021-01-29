class DagNodeSetInput extends DagNodeInput {
    protected input: DagNodeSetInputStruct;

    constructor(inputStruct: DagNodeSetInputStruct, dagNode) {
        if (inputStruct == null) {
            inputStruct = {
                columns: null,
                dedup: false
            };
        }

        if (inputStruct.columns == null) {
            inputStruct.columns = dagNode.getParents().map(() => {
                return [{
                    sourceColumn: "",
                    destColumn: "",
                    columnType: ColumnType.string,
                    cast: false
                }]
            });
        } else {
            DagNodeSetInput.fillInMissingColumns(inputStruct);
        }

        inputStruct.dedup = inputStruct.dedup || false;

        super(inputStruct);
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "dedup",
          "columns"
        ],
        "optional": [
            "outputTableName"
        ],
        "properties": {
          "dedup": {
            "$id": "#/properties/dedup",
            "type": "boolean",
            "title": "The Dedup Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "The Columns Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/columns/items",
              "type": "array",
              "title": "The Items Schema",
              "minItems": 1,
              "additionalItems": false,
              "items": {
                "$id": "#/properties/columns/items/items",
                "type": "object",
                "title": "The Items Schema",
                "additionalProperties": false,
                "required": [
                  "sourceColumn",
                  "destColumn",
                  "columnType",
                  "cast"
                ],
                "properties": {
                  "sourceColumn": {
                    "$id": "#/properties/columns/items/items/properties/sourceColumn",
                    "type": ["string", "null"],
                    "title": "The Sourcecolumn Schema",
                    "default": "",
                    "examples": [
                      "a1::class_id"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "destColumn": {
                    "$id": "#/properties/columns/items/items/properties/destColumn",
                    "type": "string",
                    "title": "The Destcolumn Schema",
                    "default": "",
                    "examples": [
                      "class_id"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "columnType": {
                    "$id": "#/properties/columns/items/items/properties/columnType",
                    "type": "string",
                    "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp,
                        ColumnType.money
                    ],
                    "title": "The Columntype Schema",
                    "default": "",
                    "examples": [
                      "integer"
                    ],
                    "minLength": 1,
                    "pattern": "^(.*)$"
                  },
                  "cast": {
                    "$id": "#/properties/columns/items/items/properties/cast",
                    "type": "boolean",
                    "title": "The Cast Schema",
                    "default": false,
                    "examples": [
                      false
                    ]
                  }
                }
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

    public getInput(replaceParameters?: boolean): DagNodeSetInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns,
            dedup: input.dedup,
            outputTableName: input.outputTableName || ""
        };
    }

    public insertColumn(column, connectorIndex: number) {
        this.input.columns.splice(connectorIndex, 0, column);
        DagNodeSetInput.fillInMissingColumns(this.input);
    }

    // fill in missing columns so all list lengths are equal
    private static fillInMissingColumns(input) {
        if (!input.columns || !input.columns.length) {
            return;
        }
        const largestCol = input.columns.reduce((prev, current) => {
            return (prev.length > current.length) ? prev : current
        });

        input.columns.forEach((col) => {
            if (col.length < largestCol.length) {
                const colLen = col.length;
                for (let i = colLen; i < largestCol.length; i++) {
                    col.push({
                        sourceColumn: "",
                        destColumn: largestCol[i].destColumn,
                        columnType: largestCol[i].columnType,
                        cast: false
                    });
                }
            }
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSetInput = DagNodeSetInput;
}
