class DagNodeSQLFuncOut extends DagNodeOut {
    protected input: DagNodeSQlFuncOutInput;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.SQLFuncOut;
        this.display.icon = "&#xe955;";
        this.input = this.getRuntime().accessible(new DagNodeSQlFuncOutInput(options.input));
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
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    /**
     * Set node's parameters
     * @param input {DagNodeExportInputStruct}
     */
    public setParam(
        input: DagNodeSQLFuncOutInputStruct = <DagNodeSQLFuncOutInputStruct>{},
        noAutoExecute?: boolean
    ) {
        this.input.setInput({
            schema: input.schema,
        });
        super.setParam(null, noAutoExecute);
    }

    public updateSchema(): void {
        try {
            const parents: DagNode[] = this.getParents();
            if (parents && parents[0]) {
                const parent: DagNode = parents[0];
                const schema = parent.getLineage().getColumns(false, true).map((progCol) => {
                    return {
                        name: progCol.getBackColName(),
                        type: progCol.getType()
                    }
                });
                this.setParam({ schema }, true);
            }
        } catch (e) {
            console.error("update schema failed", e);
        }
    }

    /**
     * Override
     */
    public getTitle(): string {
        return "output";
    }

    public getSchema(): ColSchema[] {
        return this.getParam().schema;
    }

    public getColRenameInfo(): {
        hasError: boolean,
        colInfos: ColRenameInfo[]
        error: string
    } {
        const params: DagNodeSQLFuncOutInputStruct = this.getParam();
        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(params.schema);
        const nameSet: Set<string> = new Set();
        let hasDupName: boolean = false;
        colInfos.forEach((colInfo) => {
            let newName = colInfo.new.toUpperCase(); // need to make the name be uppercase for sql
            colInfo.new = newName;
            if (nameSet.has(newName)) {
                hasDupName = true;
            } else {
                nameSet.add(newName);
            }
        });

        let hasError: boolean = false;
        let error: string;
        if (hasDupName) {
            hasError = true;
            error = DagNodeErrorType.SQLFuncOutDupCol;
        }
        return {
            hasError,
            colInfos,
            error
        }
    }

    /**
     * @override
     * @param input
     */
    public validateParam(input?: any): {error: string} {
        const res = super.validateParam(input);
        if (res != null) {
            return res;
        }
        const colRenameRes = this.getColRenameInfo();
        if (colRenameRes.hasError) {
            return {
                error: colRenameRes.error
            }
        }
    }

    public lineageChange(
        _columns: ProgCol[],
        _replaceParameters?: boolean
    ): DagLineageChange {
        // there should be only one parent
        const schema: ColSchema[] = this.getSchema(); // DagNodeDataset overide the function
        const colNameCache: {[key: string]: ProgCol} = {};
        const columns: ProgCol[] = schema.map((colInfo) => {
            const colName: string = colInfo.name;
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            const proglCol = ColManager.newPullCol(frontName.toUpperCase(), colName.toUpperCase(), colInfo.type);
            colNameCache[colName] = proglCol;
            return proglCol;
        });

        const changes: DagColumnChange[] = [];
        _columns.forEach((progCol) => {
            let name: string = progCol.getBackColName();
            if (colNameCache.hasOwnProperty(name)) {
                let newProgCol = colNameCache[name];
                delete colNameCache[name];
                // check if has case insensitive change
                let newName: string = newProgCol.getBackColName();
                if (name !== newName) {
                    changes.push({
                        from: progCol,
                        to: newProgCol
                    });
                }
            } else {
                changes.push({
                    from: progCol,
                    to: null
                });
            }
        });

        for (let name in colNameCache) {
            changes.push({
                from: null,
                to: colNameCache[name]
            });
        }

        let hiddenColumns = this.lineage.getHiddenColumns();
        hiddenColumns.forEach((progCol, colName) => {
            hiddenColumns.delete(colName);
            changes.push({
                from: progCol,
                to: null,
                hidden: true
            });
        });

        return {
            columns: columns,
            changes: changes
        };
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        // the multiple space is for the _formatOpTitle to split it into two lines
        return "Output    Table";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
      let hint: string = "";
      const input: DagNodeSQLFuncOutInputStruct = this.getParam();
      if (input.schema && input.schema.length) {
          hint = `Schema: ${JSON.stringify(input.schema)}`;
      }
      return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSQLFuncOut = DagNodeSQLFuncOut;
};
