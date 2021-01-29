class DagNodeGroupByInput extends DagNodeInput {
    protected input: DagNodeGroupByInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "groupBy",
          "aggregate",
          "icv",
          "groupAll",
          "includeSample",
          "newKeys",
          "dhtName",
        ],
        "optional": [
            "outputTableName"
        ],
        "properties": {
          "groupBy": {
            "$id": "#/properties/groupBy",
            "type": "array",
            "title": "The Groupby Schema",
            "minItems": 1,
            "additionalItems": false,
            "uniqueItems": true,
            "items": {
              "$id": "#/properties/groupBy/items",
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
          "aggregate": {
            "$id": "#/properties/aggregate",
            "type": "array",
            "title": "The Aggregate Schema",
            "minItems": 1,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/aggregate/items",
              "type": "object",
              "title": "The Items Schema",
              "additionalProperties": false,
              "required": [
                "operator",
                "sourceColumn",
                "destColumn",
                "distinct",
                "cast"
              ],
              "properties": {
                "operator": {
                  "$id": "#/properties/aggregate/items/properties/operator",
                  "type": "string",
                  "title": "The Operator Schema",
                  "default": "",
                  "examples": [
                    "count"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                },
                "sourceColumn": {
                  "$id": "#/properties/aggregate/items/properties/sourceColumn",
                  "type": "string",
                  "title": "The Sourcecolumn Schema",
                  "default": "",
                  "examples": [
                    "a::duration"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                },
                "delim": {
                    "$id": "#/properties/aggregate/items/properties/delim",
                    "type": "string",
                    "title": "The Delim Schema",
                    "default": ""
                },
                "destColumn": {
                  "$id": "#/properties/aggregate/items/properties/destColumn",
                  "type": "string",
                  "title": "The Destcolumn Schema",
                  "default": "",
                  "examples": [
                    "newCol"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                },
                "distinct": {
                  "$id": "#/properties/aggregate/items/properties/distinct",
                  "type": "boolean",
                  "title": "The Distinct Schema",
                  "default": false,
                  "examples": [
                    false
                  ]
                },
                "cast": {
                  "$id": "#/properties/aggregate/items/properties/cast",
                  "type": ["null", "string"],
                  "enum": [
                      ColumnType.integer,
                      ColumnType.float,
                      ColumnType.string,
                      ColumnType.boolean,
                      ColumnType.timestamp,
                      ColumnType.money,
                      null
                    ],
                  "title": "The Cast Schema",
                  "default": null,
                  "examples": [
                    null
                  ]
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
          "groupAll": {
            "$id": "#/properties/groupAll",
            "type": "boolean",
            "title": "The Groupall Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "includeSample": {
            "$id": "#/properties/includeSample",
            "type": "boolean",
            "title": "The Includesample Schema",
            "default": false,
            "examples": [
              false
            ]
          },
          "joinBack": {
            "$id": "#/properties/joinBack",
            "type": "boolean",
            "default": false,
            "examples": [
              false
            ]
          },
          "newKeys": {
            "$id": "#/properties/newKeys",
            "type": ["null", "array"], // XXX need to specify array of strings
            "title": "The Newkeys Schema",
            "default": null,
            "uniqueItems": true,
            "examples": [
              null
            ]
          },
          "dhtName": {
            "$id": "#/properties/dhtName",
            "type": "string",
            "title": "The DHT Name",
            "default": "",
            "examples": [
              ""
            ],
            "minLength": 0,
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

    public getInput(replaceParameters?: boolean): DagNodeGroupByInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            groupBy: input.groupBy || [""],
            aggregate: input.aggregate || [{operator: "", sourceColumn: "", destColumn: "", distinct: false, cast: null}],
            includeSample: input.includeSample || false,
            joinBack: input.joinBack || false,
            icv: input.icv || false,
            groupAll: input.groupAll || false,
            newKeys: input.newKeys || [],
            dhtName: input.dhtName || "",
            outputTableName: input.outputTableName || ""
        };
    }

    public setNewKeys(newKeys) {
        this.input.newKeys = newKeys;
    }

    public setGroupBy(groupBy) {
        this.input.groupBy = groupBy;
    }

    public setAggregate(aggregate) {
        this.input.aggregate = aggregate;
    }

    public validate(input?): {error: string} {
        input = input || this.input;
        const ajv = new Ajv(); //TODO: try to reuse
        const validate = ajv.compile(this.constructor["schema"]);
        let valid = validate(input);

        // if invalid solely because there's no groupBy columns and
        // groupAll is true, then should be valid
        if (!valid &&
            input.groupAll &&
            validate.errors.length === 1 &&
            validate.errors[0].dataPath === ".groupBy" &&
            validate.errors[0].keyword === "minItems" &&
            input.groupAll) {
            valid = true;
        }

        if (!valid) {
            // only saving first error message
            const msg = this._parseValidationErrMsg(validate.errors[0]);
            return {error: msg};
        } else {
            const paramCheck = this.validateParameters(input);
            if (paramCheck) {
                return paramCheck;
            }
            return null;
        }
  }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeGroupByInput = DagNodeGroupByInput;
}
