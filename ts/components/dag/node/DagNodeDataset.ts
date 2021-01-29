class DagNodeDataset extends DagNodeIn {
    protected input: DagNodeDatasetInput;
    public xcQueryString: string;

    public constructor(options: DagNodeInInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Dataset;
        this.display.icon = "&#xe90f";
        this.input = this.getRuntime().accessible(new DagNodeDatasetInput(options.input));
        this.xcQueryString = options.xcQueryString;
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 0,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
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
                  "$id": "#/properties/schema/items/properties/type",
                  "type": ["string", "null"],
                  "subType": {
                    "$id": "#/properties/subType",
                    "type": ["string", "null"],
                    "enum": [DagNodeSubType.Snowflake, null]
                  },
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
          }
        }
    };

    /**
     * Set dataset node's parameters
     * @param input {DagNodeDatasetInputStruct}
     * @param input.source {string} Dataset source path
     * @param intpu.prefix {string} Prefix for the created table
     */
    public setParam(
        input: DagNodeDatasetInputStruct = <DagNodeDatasetInputStruct>{},
        noAutoExecute?: boolean
    ): boolean {
        const source: string = input.source;
        const prefix: string = input.prefix;
        const synthesize: boolean = input.synthesize;
        const loadArgs: string = input.loadArgs;

        this.input.setInput({
            source: source,
            prefix: prefix,
            synthesize: synthesize || false,
            loadArgs: loadArgs || ""
        });
        return super.setParam(null, noAutoExecute) || false;
    }

    /**
     * Get the dataset name
     */
    public getDSName(replaceParam?: boolean): string {
        return this.input.getInput(replaceParam).source || null;
    }

    public getLoadArgs(): string {
        return this.input.getInput().loadArgs || null;
    }

    /**
     * @override
     */
    public getSchema(noPrefix: boolean = false): ColSchema[] {
        if (noPrefix) {
            return this.schema;
        }
        const input = this.input.getInput(true);
        const prefix: string = input.synthesize ? null : input.prefix;
        const schema = this.schema.map((colInfo) => {
            return {
                name: xcHelper.getPrefixColName(prefix, colInfo.name),
                type: colInfo.type
            }
        });
        return schema;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDatasetInputStruct = this.getParam();
        if (input.source) {
            const dsName: string = xcHelper.parseDSName(input.source).dsName;
            hint += `Source: ${dsName}`;
        }
        return hint;
    }

    protected _getSerializeInfo(includeStats?: boolean, forCopy?: boolean):DagNodeInInfo {
      const serializedInfo: DagNodeInInfo = <DagNodeInInfo>super._getSerializeInfo(includeStats);
      serializedInfo.xcQueryString = this.xcQueryString;
      return serializedInfo;
    }

    protected _getColumnsUsedInInput() {
        return null
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDataset = DagNodeDataset;
};
