class DagNodeDatasetInput extends DagNodeInput {
    protected input: DagNodeDatasetInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "prefix",
          "source"
        ],
        "properties": {
          "prefix": {
            "$id": "#/properties/prefix",
            "type": "string",
            "title": "The Prefix Schema",
            "default": "",
            "examples": [
              "a"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "source": {
            "$id": "#/properties/source",
            "type": "string",
            "title": "The Source Schema",
            "default": "",
            "examples": [
              "DF2_5BC3F08E2DA3BFF3_1539568312810_0"
            ],
            "minLength": 1,
            "pattern": "^(.*)$"
          },
          "synthesize": {
            "$id": "#/properties/synthesize",
            "type": "boolean",
            "title": "The Synthesize Schema",
            "default": false
          },
          "loadArgs": {
            "$id": "#/properties/loadArgs",
            "type": "string",
            "title": "The LoadArgs Schema",
            "default": ""
          },
          "schema": {
            "$id": "#/properties/schema",
            "type": "array",
            "title": "The schema Schema",
            "minItems": 0,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/schema/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "name",
                "type"
              ],
              "properties": {
                "name": {
                  "$id": "#/properties/schema/items/properties/name",
                  "type": "string",
                  "minLength": 1,
                  "title": "The name Schema",
                  "default": "",
                  "examples": ["column name"],
                  "pattern": "^(.*)$"
                },
                "type": {
                  "$id": "#/properties/eval/schema/properties/type",
                  "type": ["string", "null"],
                  "enum": [
                        ColumnType.integer,
                        ColumnType.float,
                        ColumnType.string,
                        ColumnType.boolean,
                        ColumnType.timestamp,
                        ColumnType.money,
                        ColumnType.mixed,
                        ColumnType.object,
                        ColumnType.array,
                        ColumnType.unknown,
                        null
                    ],
                  "title": "The type Schema",
                  "default": "",
                  "examples": [
                    "integer"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              }
            }
          },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeDatasetInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            source: input.source || "",
            prefix: input.prefix || "",
            synthesize: input.synthesize || false,
            loadArgs: input.loadArgs || ""
        };
    }

    /**
     * @override
     */
    public hasParametersChanges(): boolean {
        try {
            let oldInput = this.lastInput;
            let input = this.input
            // ingore loadArgs change
            if (oldInput.source === input.source &&
                oldInput.prefix === input.prefix &&
                oldInput.synthesize === input.synthesize
            ) {
                return false;
            } else {
                return true;
            }
        } catch (e) {
            console.error(e);
            return true;
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDatasetInput = DagNodeDatasetInput;
};
