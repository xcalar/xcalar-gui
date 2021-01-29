class DagNodeJoinInput extends DagNodeInput {
    protected input: DagNodeJoinInputStruct;
    private dagNode: DagNode;

    public constructor(inputStruct: DagNodeJoinInputStruct, dagNode: DagNode) {
      if (inputStruct == null) {
        inputStruct = {
          joinType: DagNodeJoinInput._convertSubTypeToJoinType(dagNode.getSubType())
            || JoinOperatorTStr[JoinOperatorT.InnerJoin],
          left: null, right: null, evalString: null, nullSafe: false, keepAllColumns: true
        };
      }
      if (inputStruct.left == null) {
        inputStruct.left = DagNodeJoinInput._getDefaultTableInfo();
      }
      // if (inputStruct.left.casts == null || inputStruct.left.casts.length === 0) {
      //   inputStruct.left.casts = inputStruct.left.columns.map(() => null);
      // }
      if (inputStruct.left.keepColumns == null) {
        inputStruct.left.keepColumns = [];
      }
      if (inputStruct.right == null) {
        inputStruct.right = DagNodeJoinInput._getDefaultTableInfo();
      }
      // if (inputStruct.right.casts == null || inputStruct.right.casts.length === 0) {
      //   inputStruct.right.casts = inputStruct.right.columns.map(() => null);
      // }
      if (inputStruct.right.keepColumns == null) {
        inputStruct.right.keepColumns = [];
      }
      if (inputStruct.evalString == null) {
        inputStruct.evalString = '';
      }
      if (inputStruct.nullSafe == null) {
        inputStruct.nullSafe = false;
      }
      if (inputStruct.keepAllColumns == null) {
        inputStruct.keepAllColumns = true;
      }

      super(inputStruct);
      this.dagNode = dagNode;
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "joinType",
          "left",
          "right",
          "evalString",
          // "keepAllColumns"
        ],
        "optional": [
            "outputTableName"
        ],
        "properties": {
          "joinType": {
            "$id": "#/properties/joinType",
            "type": "string",
            "enum": Object.values(JoinOperatorTStr),
            "title": "The Jointype Schema",
            "default": "",
            "examples": [
              "innerJoin"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "left": {
            "$id": "#/properties/left",
            "type": "object",
            "title": "The Left Schema",
            "additionalProperties": false,
            "required": [
              "columns",
              // "casts",
              "rename"
            ],
            "properties": {
              "columns": {
                "$id": "#/properties/left/properties/columns",
                "type": "array",
                "title": "The Columns Schema",
                "minItems": 0, // crossJoin can have an empty list
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/columns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::class_id"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "keepColumns": {
                "$id": "#/properties/left/properties/keepColumns",
                "type": "array",
                "title": "The KeepColumns Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/keepColumns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::class_id"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "casts": {
                "$id": "#/properties/left/properties/casts",
                "type": "array",
                "title": "The Casts Schema",
                "minItems": 0, // we support join w/o casts
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/casts/items",
                  "type": ["string", "null"],
                  "enum": [
                    ColumnType.integer,
                    ColumnType.float,
                    ColumnType.string,
                    ColumnType.boolean,
                    ColumnType.timestamp,
                    ColumnType.money,
                    null
                  ],
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "rename": {
                "$id": "#/properties/left/properties/rename",
                "type": "array",
                "title": "The Rename Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/left/properties/rename/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "additionalProperties": false,
                  "required": [
                    "sourceColumn",
                    "destColumn",
                    "prefix"
                  ],
                  "properties": {
                    "sourceColumn": {
                      "$id": "#/properties/left/properties/rename/items/properties/sourceColumn",
                      "type": "string",
                      "title": "The Sourcecolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "destColumn": {
                      "$id": "#/properties/left/properties/rename/items/properties/destColumn",
                      "type": "string",
                      "title": "The Destcolumn Schema",
                      "default": "",
                      "examples": [
                        "a1"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "prefix": {
                      "$id": "#/properties/left/properties/rename/items/properties/prefix",
                      "type": "boolean",
                      "title": "The Prefix Schema",
                      "default": false,
                      "examples": [
                        true
                      ]
                    }
                  }
                }
              }
            }
          },
          "right": {
            "$id": "#/properties/right",
            "type": "object",
            "title": "The Right Schema",
            "additionalProperties": false,
            "required": [
              "columns",
              // "casts",
              "rename"
            ],
            "properties": {
              "columns": {
                "$id": "#/properties/right/properties/columns",
                "type": "array",
                "title": "The Columns Schema",
                "minItems": 0, // CrossJoin can have an empty list
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/columns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::duration"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "keepColumns": {
                "$id": "#/properties/right/properties/keepColumns",
                "type": "array",
                "title": "The KeepColumns Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/keepColumns/items",
                  "type": "string",
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "a::class_id"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "casts": {
                "$id": "#/properties/right/properties/casts",
                "type": "array",
                "title": "The Casts Schema",
                "minItems": 0, // we support join w/o casts
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/casts/items",
                  "type": ["string", "null"],
                  "enum": [
                    ColumnType.integer,
                    ColumnType.float,
                    ColumnType.string,
                    ColumnType.boolean,
                    ColumnType.timestamp,
                    ColumnType.money,
                    null
                  ],
                  "title": "The Items Schema",
                  "default": "",
                  "examples": [
                    "string"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              },
              "rename": {
                "$id": "#/properties/right/properties/rename",
                "type": "array",
                "title": "The Rename Schema",
                "minItems": 0,
                "additionalItems": false,
                "items": {
                  "$id": "#/properties/right/properties/rename/items",
                  "type": "object",
                  "title": "The Items Schema",
                  "additionalProperties": false,
                  "required": [
                    "sourceColumn",
                    "destColumn",
                    "prefix"
                  ],
                  "properties": {
                    "sourceColumn": {
                      "$id": "#/properties/right/properties/rename/items/properties/sourceColumn",
                      "type": "string",
                      "title": "The Sourcecolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "destColumn": {
                      "$id": "#/properties/right/properties/rename/items/properties/destColumn",
                      "type": "string",
                      "title": "The Destcolumn Schema",
                      "default": "",
                      "examples": [
                        "a"
                      ],
                      "minLength": 1,
                      "pattern": "^(.*)$"
                    },
                    "prefix": {
                      "$id": "#/properties/right/properties/rename/items/properties/prefix",
                      "type": "boolean",
                      "title": "The Prefix Schema",
                      "default": false,
                      "examples": [
                        true
                      ]
                    }
                  }
                }
              }
            }
          },
          "evalString": {
            "$id": "#/properties/evalString",
            "type": "string",
            "title": "The Evalstring Schema",
            "default": "",
            "examples": [
              ""
            ],
            "pattern": "^(.*)$"
          },
          "keepAllColumns": {
            "$id": "#/properties/keepAllColumns",
            "type": "boolean",
            "title": "The KeepAllColumns Schema",
            "default": true,
            "examples": [
              true
            ]
          },
          "nullSafe": {
            "$id": "#/properties/nullSafe",
            "type": "boolean",
            "title": "The nullSafe Schema",
            "default": false,
            "examples": [
              true
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

    public getInput(replaceParameters?: boolean): DagNodeJoinInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString,
            nullSafe: input.nullSafe,
            keepAllColumns: input.keepAllColumns == null ? true: input.keepAllColumns,
            outputTableName: input.outputTableName || ""
        };
    }

    public setEval(evalString: string) {
        this.input.evalString = evalString;
    }

    /**
     * Check if the joinType is converted from node subType
     */
    public isJoinTypeConverted(): boolean {
      return DagNodeJoinInput._convertSubTypeToJoinType(this.dagNode.getSubType()) != null;
    }

    private static _convertSubTypeToJoinType(subType: DagNodeSubType): string {
      if (subType == null) {
          return null;
      }

      const typeMap = {};
      typeMap[DagNodeSubType.LookupJoin] = JoinOperatorTStr[JoinOperatorT.LeftOuterJoin];
      typeMap[DagNodeSubType.FilterJoin] = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];

      return typeMap[subType];
    }

    private static _getDefaultTableInfo(): DagNodeJoinTableInput {
        return {
            columns: [""],
            keepColumns: [],
            // casts: [null],
            rename: [{sourceColumn: "", destColumn: "", prefix: false}]
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeJoinInput = DagNodeJoinInput;
}
