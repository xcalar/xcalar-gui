class DagNodeSortInput extends DagNodeInput {
    protected input: DagNodeSortInputStruct;

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": false,
        "required": [
          "columns",
          "newKeys"
        ],
        "optional": [
            "outputTableName"
        ],
        "properties": {
          "columns": {
            "$id": "#/properties/columns",
            "type": "array",
            "title": "The Columns Schema",
            "minItems": 1,
            "uniqueItems": true,
            "additionalItems": false,
            "items": {
              "$id": "#/properties/columns/items",
              "type": "object",
              "title": "The Items Schema",
              "required": [
                "columnName",
                "ordering"
              ],
              "properties": {
                "columnName": {
                  "$id": "#/properties/columns/items/properties/columnName",
                  "type": "string",
                  "title": "The Columnname Schema",
                  "default": "",
                  "examples": [
                    "students::student_name"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                },
                "ordering": {
                  "$id": "#/properties/columns/items/properties/ordering",
                  "type": "string",
                  "enum": [
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending],
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]
                  ],
                  "title": "The Ordering Schema",
                  "default": "",
                  "examples": [
                    "Ascending"
                  ],
                  "minLength": 1,
                  "pattern": "^(.*)$"
                }
              }
            }
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
          "outputTableName": {
            "$id": "#/properties/outputTableName",
            "type": "string",
            "title": "The outputTableName Schema",
            "maxLength": XcalarApisConstantsT.XcalarApiMaxTableNameLen - 10,
            "pattern": "^[a-zA-Z][a-zA-Z\\d\\_\\-]*$|^$"
          }
        }
      }


    public getInput(replaceParameters?: boolean): DagNodeSortInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            newKeys: input.newKeys || [],
            outputTableName: input.outputTableName || ""
        };
    }

    public setColumns(columns) {
        this.input.columns = columns;
    }

    public setNewKeys(newKeys) {
        this.input.newKeys = newKeys;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSortInput = DagNodeSortInput;
}
