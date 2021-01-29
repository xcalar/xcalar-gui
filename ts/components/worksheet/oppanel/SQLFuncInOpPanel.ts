/**
 * The operation editing panel for SQLFuncIn operator
 */
class SQLFuncInOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeSQLFuncIn;
    private _tables: Map<string, PbTblInfo>;
    private _schemaSection: ColSchemaSection;

    public constructor() {
        super();
        this._setup();
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
        this._schemaSection.setValidTypes(BaseOpPanel.getBasicColTypes());
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQLFuncIn, options?) {
        this._dagNode = dagNode;
        // Show panel
        super.showPanel(null, options)
        .then(() => {
            this._updateTables();
            const model = $.extend(this._dagNode.getParam(), {
                schema: this._dagNode.getSchema()
            });
            this._restorePanel(model);
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        if (!this.isOpen()) {
            return;
        }
        this._clear();
        super.hidePanel(isSubmit);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param = this._validate(true) || {
                source: "",
                schema: []
            };
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._convertAdvConfigToModel();
                this._restorePanel(param);
                return;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _setup(): void {
        super.setup($("#sqlFuncInPanel"));
        this._addEventListeners();
        this._setupDropdown();
    }

    private _clear(): void {
        this._dagNode = null;
        this._tables = null;
        this._schemaSection.clear();
    }

    private _updateTables(): void {
        let tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
        this._tables = new Map();
        tables.forEach((table) => {
            if (table.active) {
                this._tables.set(table.name, table);
            }
        });
    }

    private _getSchemaSection(): JQuery {
        return this.$panel.find(".colSchemaSection");
    }

    private _getSourceSection(): JQuery {
        return this.$panel.find(".argsSection .row.source");
    }

    private _convertAdvConfigToModel(): {
        source: string,
        schema: ColSchema[],
    } {
        const input = JSON.parse(this._editor.getValue());
        if (JSON.stringify(input, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(input);
            if (error) {
                throw new Error(error.error);
            }
        }
        return input;
    }

    private _autoDetectSchema(): {error: string} {
        const source: string = this._getSourceSection().find("input").val().trim();
        const table: PbTblInfo = this._tables.get(source);
        let schema = [];

        if (!table || !table.active) {
            return {error: ErrTStr.NoTable};
        } else {
            schema = PTblManager.Instance.getTableSchema(table);
            this._schemaSection.setInitialSchema(schema);
            this._schemaSection.render(schema);
        }
    }

    private _restorePanel(
        input: {
            source: string,
            schema: ColSchema[]
        }
    ): void {
        this._getSourceSection().find("input").val(input.source);
        this._schemaSection.render(input.schema);
    }

    protected _submitForm(): void {
        let args: {source: string, schema: ColSchema[]};
        if (this._isAdvancedMode()) {
            args = this._validAdvancedMode();
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }

        const oldParam = this._dagNode.getParam();
        if (this._dagNode.getState() !== DagNodeState.Unused &&
            oldParam.source === args.source
        ) {
            // when configured and has only schema changes
            // oldParam.source === args.source is not enough
            // because we allow source be empty
            this._dagNode.setSchema(args.schema, true);
        } else {
            this._dagNode.setSchema(args.schema);
            this._dagNode.setParam(args);
        }
        this.close(true);
    }

    /*
     * Note: we don't check if source if empty because
     * it's allowed to set with empty source but have schema only
     */
    private _validate(ingore: boolean = false): {
        source: string,
        schema: ColSchema[]
    } {
        const $sourceInput: JQuery = this._getSourceSection().find("input");
        const source: string = $sourceInput.val().trim();
        const schema = this._schemaSection.getSchema(ingore);
        if (schema != null) {
            return {
                source: source,
                schema: schema
            }
        } else {
            return null
        }
    }

    private _validAdvancedMode() {
        let args;
        let error: string;
        try {
            args = this._convertAdvConfigToModel();
            if (args.schema.length === 0) {
                error = ErrTStr.NoEmptySchema;
            }
        } catch (e) {
            error = e;
        }

        if (error == null) {
            return args;
        } else {
            StatusBox.show(error, this.$panel.find(".advancedEditor"));
            return null;
        }
    }

    private _searchSource(keyword?: string): void {
        let tableNames: string[] = [];
        this._tables.forEach((_table, tableName) => {
            tableNames.push(tableName);
        });
        if (keyword) {
            keyword = keyword.toLowerCase();
            tableNames = tableNames.filter((tableName) => {
                return tableName.toLowerCase().includes(keyword);
            });
        }
        this._populateSourceList(tableNames);
    }

    private _populateSourceList(names: string[]): void {
        const $dropdown: JQuery = this._getSourceSection().find(".dropDownList");
        const html: HTML = names.map((name) => `<li>${name}</li>`).join("");
        $dropdown.find("ul").html(html);
    }

    private _addEventListeners() {
        const $panel: JQuery = this.$panel;
        $panel.on("click", ".close, .cancel", () => {
            this.close();
        });

        $panel.on("click", ".submit", () => {
            this._submitForm();
        });

        $panel.on("change", ".source input", () => {
            this._autoDetectSchema();
        });
        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", (event) => {
            this._updateTables();
            const error = this._autoDetectSchema();
            if (error != null) {
                StatusBox.show(ErrTStr.DetectSchema, $(event.currentTarget), false, {
                    detail: error.error
                });
            }
        });
    }

    private _setupDropdown(): void {
        const $section = this._getSourceSection();
        const $dropdown = $section.find(".dropDownList");
        const selector: string = `#${this._getPanel().attr("id")}`;
        new MenuHelper($dropdown, {
            onOpen: () => {
                this._updateTables();
                this._searchSource();
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    $dropdown.find("input").val($li.text()).trigger("change");
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        $dropdown.find("input").on("input", (event) => {
            if (!$dropdown.find("input").is(":visible")) return; // ENG-8642
            const keyword: string = $(event.currentTarget).val().trim();
            this._searchSource(keyword);
        });
    }
}