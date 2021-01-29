class DagNodeSQLFuncIn extends DagNodeIn {
    protected input: DagNodeSQLFuncInInput;
    private order: number;

    public constructor(options: DagNodeSQLFuncInInfo, runtime?: DagRuntime) {
        super(<DagNodeInInfo>options, runtime);
        this.type = DagNodeType.SQLFuncIn;
        this.display.icon = "&#xe90f";
        this.input = this.getRuntime().accessible(new DagNodeSQLFuncInInput(options.input));
        this.order = options.order;
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
     * Set node's parameters
     * @param input {DagNodeSQLFuncInInputStruct}
     */
    public setParam(
        input: DagNodeSQLFuncInInputStruct = <DagNodeSQLFuncInInputStruct>{},
        noAutoExecute?: boolean
    ): void {
        this.input.setInput({
            source: input.source
        });
        super.setParam(null,noAutoExecute);
    }

    public setOrder(order): void {
        this.order = order;
    }

    public getOrder(): number {
        return this.order;
    }

    /**
     * Override
     */
    public getTitle(): string {
        let order: number = this.order + 1;
        return `Input #${order || "Invalid"}`;
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const schema: ColSchema[] = this.getSchema(); // DagNodeDataset overide the function
        const columns: ProgCol[] = schema.map((colInfo) => {
            const colName: string = colInfo.name;
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            return ColManager.newPullCol(frontName, colName, colInfo.type);
        });
        return {
            columns: columns,
            changes: []
        };
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Input Table";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeSQLFuncInInputStruct = this.getParam();
        if (input.source) {
            hint += `Test Source: ${input.source}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeSQLFuncInInfo {
      const serializedInfo: DagNodeSQLFuncInInfo = <DagNodeSQLFuncInInfo>super._getSerializeInfo(includeStats);
      serializedInfo.order = this.order; // should save the schema directly, should not call getSchema
      return serializedInfo;
  }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQLFuncIn = DagNodeSQLFuncIn;
};
