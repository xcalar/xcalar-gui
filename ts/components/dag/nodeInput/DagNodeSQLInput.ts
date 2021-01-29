class DagNodeSQLInput extends DagNodeInput {
    protected input: DagNodeSQLInputStruct;
    public static readonly schema =  {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "required": [
          "sqlQueryStr",
          "dropAsYouGo"
        ],
        "optional" : [
            "outputTableName",
            "identifiers",
            "identifiersOrder",
            "mapping"
        ],
        "properties": {
          "sqlQueryStr": {
            "$id": "#/properties/sqlQueryStr",
            "type": "string",
            "title": "The Sqlquerystr Schema",
            "default": "",
            "examples": [
              "SELECT * from t"
            ]
          },
          "mapping": {
            "$id": "#/properties/mapping",
            "type": "array",
            "title": "The Mapping Schema",
            "minItems": 1,
            "additionalItems": false,
            "examples": ["{\"identifier\": \"tableName\", \"source\": null}"],
            "items": {
                "$id": "#/properties/mapping/items",
                "type": "object",
                "title": "The Mapping Item Schema",
                "required": [
                    "identifier",
                    "source"
                ],
                "properties": {
                    "identifier": {
                        "$id": "#/properties/mapping/items/properties/identifier",
                        "type": ["string", "null"],
                        "title": "The identifier schema",
                        "description": "An explanation about the purpose of this instance.",
                        "default": "",
                        "minLength": 1
                    },
                    "source": {
                        "$id": "#/properties/mapping/items/properties/source",
                        "type": ["integer", "null"],
                        "title": "The source schema",
                        "description": "An explanation about the purpose of this instance.",
                        "default": 0,
                        "minimum": 0
                    }
                },

            }
          },
          "identifiers": {
            "$id": "#/properties/identifiers",
            "type": "object",
            "title": "The Identifiers Schema",
            "properties": {
              "1": {
                "$id": "#/properties/identifiers/properties/1",
                "type": "string",
                "title": "TheSchema",
                "default": "",
                "examples": [
                  "t1"
                ],
                "pattern": "^(.*)$"
              },
              "2": {
                "$id": "#/properties/identifiers/properties/2",
                "type": "string",
                "title": "TheSchema",
                "default": "",
                "examples": [
                  "t2"
                ],
                "pattern": "^(.*)$"
              }
            }
          },
          "identifiersOrder": {
            "$id": "#/properties/identifiersOrder",
            "type": "array",
            "title": "The Identifiersorder Schema",
            "items": {
              "$id": "#/properties/identifiersOrder/items",
              "type": "integer",
              "title": "The Items Schema",
              "default": 0,
              "examples": [
                2,
                1
              ]
            }
          },
          "dropAsYouGo": {
            "$id": "#/properties/dropAsYouGo",
            "type": "boolean",
            "title": "The Dropasyougo Schema",
            "default": true,
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
          },
        }
    };

    public getInput(replaceParameters?: boolean): DagNodeSQLInputStruct {
        const input = super.getInput(replaceParameters);
        let dropAsYouGo: boolean = input.dropAsYouGo;
        if (dropAsYouGo == null) {
            dropAsYouGo = true; // default is true
        }
        return {
            sqlQueryStr: input.sqlQueryStr || "",
            identifiers: input.identifiers || {},
            dropAsYouGo: dropAsYouGo,
            outputTableName: input.outputTableName || "",
            mapping: input.mapping || []
        };
    }

    public setInput(input) {
        this.lastInput = this.input;
        this.input = input;
    }

    public setParameter(params) {
        this.parameters = params;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQLInput = DagNodeSQLInput;
}