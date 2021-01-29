class IMDTableOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#IMDTableOpPanel');
    private _advMode: boolean;
    protected _dagNode: DagNodeIMDTable;
    private _$pubTableInput: JQuery; // $('#IMDTableOpPanel .pubTableInput')
    private _$columns: JQuery; // $('#IMDTableOpColumns')
    private _selectedTable: PbTblInfo;
    private _schemaSection: ColSchemaSection;
    private _limitedRows: number;
    private _outputTableName: string;
    private _pbDataFlowCache: Map<string, DagGraphInfo>

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'IMDTableOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._$elemPanel = $('#IMDTableOpPanel');
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._$pubTableInput = $('#IMDTableOpPanel .pubTableInput');
        this._$columns = $('#IMDTableOpPanel #IMDTableOpColumns .cols');
        this._schemaSection = new ColSchemaSection(this._$elemPanel.find(".colSchemaSection"));
        this._addEventListeners();
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     * @param options
     */
    public show(dagNode: DagNodeIMDTable, options?): void {
        this._dagNode = dagNode;
        this._pbDataFlowCache = new Map();
        // Show panel
        super.showPanel("Table", options)
        .then(() => {
            this._selectedTable = null;
            this._$columns.empty();

            this._restorePanel(this._dagNode.getParam());
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
        super.hidePanel(isSubmit);
        this._advMode = false;
        this._limitedRows = null;
        this._pbDataFlowCache = new Map();
    }

    private _convertAdvConfigToModel() {
        let args: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>JSON.parse(this._editor.getValue());
        if (JSON.stringify(args, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(args);
            if (error) {
                throw new Error(error.error);
            }
            if (this._checkOpArgs(args)) {
                return args;
            }
        } else {
            return args;
        }
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            let param: DagNodeIMDTableInputStruct = this._getParams(true);
            this._addLoadArgsToAdvMod(param);
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodeIMDTableInputStruct = this._convertAdvConfigToModel();
                if (newModel == null) {
                    this._advMode = false;
                    return;
                }
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                return {error: e.message || e.error};
            }
        }
        return null;
    }

    private _getParams(ingoreError = false): DagNodeIMDTableInputStruct {
        return {
            source: this._$pubTableInput.val(),
            version: -1,
            schema: this._schemaSection.getSchema(ingoreError),
            filterString: "",
            limitedRows: this._limitedRows,
            outputTableName: this._outputTableName
        }
    }

    private _changeSelectedTable(source: string): void {
        if (source == "") {
            return;
        }
        this._selectedTable = PTblManager.Instance.getAvailableTables().find((table) => table.name === source);
        this._fetchPbTableSubGraph(source);
    }

    private async _fetchPbTableSubGraph(source: string): Promise<void> {
        this.$panel.addClass("loading");
        try {
            if (this._pbDataFlowCache.has(source)) {
                // cache exist
                return;
            }
            const pbTblInfo = new PbTblInfo({name: source});
            const subGraph = await pbTblInfo.getDataflow();
            this._pbDataFlowCache.set(source, subGraph);
          } catch (e) {
            console.error("get published table graph failed", e);
        } finally {
            this.$panel.removeClass("loading");
        }

    }

    private _restorePanel(input: DagNodeIMDTableInputStruct): void {
        this._limitedRows = input.limitedRows;
        this._$pubTableInput.val(input.source);
        this._changeSelectedTable(input.source);
        this._schemaSection.setInitialSchema(this._getInitialSchema(input.source) || input.schema);
        this._schemaSection.render(input.schema);
        this._outputTableName = input.outputTableName;
    }

    private _getInitialSchema(source: string): ColSchema[] | null {
        let schema: ColSchema[] = null;
        try {
            const pTblInfo = PTblManager.Instance.getTableByName(source);
            if (pTblInfo) {
                schema = pTblInfo.getSchema();
            }
        } catch (e) {
            console.error(e);
        }

        return schema;
    }

    private _updateTableList($ul: JQuery): void {
        let html = '';
        const tableNames: string[] = PTblManager.Instance.getAvailableTables().map((pTblInfo) => pTblInfo.name);
        tableNames.sort();
        tableNames.forEach((name) => {
            html += '<li>' + name + '</li>';
        });
        $ul.html(html);
    }

    private _checkOpArgs(input: DagNodeIMDTableInputStruct): boolean {
        let $location: JQuery = this._$elemPanel.find(".btn-submit");
        let error: string = "";
        if (input == null) {
            return false;
        }
        if (input.source == "") {
            error = "Input must have a source";
        }
        if (input.version < -1) {
            error = "Version cannot be less than -1 (latest).";
        }
        if (input.schema == null || input.schema.length == 0) {
            error = "Table must have columns.";
            $location = this._$elemPanel.find(".colSchemaSection");
        }

        if (error != "") {
            if (this._advMode) {
                $location = $("#IMDTableOpPanel .advancedEditor");
            }
            StatusBox.show(error, $location, false, {'side': 'right'});
            return false;
        }
        return true;
    }


    private _addEventListeners(): void {
        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${IMDTableOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${IMDTableOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        this._addTableListDropDown();

        this._$pubTableInput.on('blur', () => {
            this._changeSelectedTable(this._$pubTableInput.val());
            this._autoDetectSchema(true);
        });

        this._$elemPanel.find(".detect").click(() => {
            this._autoDetectSchema(false);
        });

        this._$elemPanel.find(".btn.preview").on("click", () => this._preview());
    }

    private _addTableListDropDown() {
        let $list = $('#pubTableList');
        let dropdownHelper: MenuHelper = new MenuHelper($list, {
            onOpen: () => {
                this._updateTableList($list.find(".pubTables"));
            },
            onSelect: ($li) => {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                this._$pubTableInput.val($li.text());
                this._changeSelectedTable($li.text());
                this._autoDetectSchema(true);
            },
            container: "#IMDTableOpPanel",
            bounds: "#IMDTableOpPanel"
        });
        new InputDropdownHint($list, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val, $input) {
                if (val === $.trim($input.val())) {
                    return;
                }
                $input.val(val);
            },
            "order": true
        });
    }


    protected _submitForm(dagNode: DagNodeIMDTable): void {
        let params: DagNodeIMDTableInputStruct = null;
        if (this._advMode) {
            try {
                params = this._convertAdvConfigToModel();
            } catch (e) {
                StatusBox.show(e, $("#IMDTableOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            params = this._getParams();
        }
        if (!this._checkOpArgs(params)) {
            return;
        }
        this._limitedRows = params.limitedRows;
        if (params.source !== dagNode.getSource()) {
            dagNode.setSubgraph(this._pbDataFlowCache.get(params.source));
        }
        if (this._advMode) {
            dagNode.setLoadArgs(params["loadArgs"]);
        }
        dagNode.setParam(params);
        this.close(true);
    }

    protected _preview() {
        let params: DagNodeIMDTableInputStruct = null;
        if (this._advMode) {
            try {
                params = this._convertAdvConfigToModel();
            } catch (e) {
                StatusBox.show(e, $("#IMDTableOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            params = this._getParams();
        }
        if (!this._checkOpArgs(params)) {
            return;
        }
        super._preview(params);
    }

    private _autoDetectSchema(userOldSchema: boolean): {error: string} {
        const oldParam: DagNodeIMDTableInputStruct = this._dagNode.getParam();
        let oldSchema: ColSchema[] = null;
        if (userOldSchema &&
            this._selectedTable != null &&
            this._selectedTable.name === oldParam.source
        ) {
            // when only has prefix change
            oldSchema = this._schemaSection.getSchema(true);
        }
        let schema: ColSchema[] = this._selectedTable ? this._selectedTable.getSchema() : [];
        this._schemaSection.setInitialSchema(schema);
        this._schemaSection.render(oldSchema || schema);
        return null;
    }

    private _addLoadArgsToAdvMod(param: DagNodeIMDTableInputStruct): void {
        const source = param.source;
        let loadArgs;
        if (source === this._dagNode.getSource()) {
            loadArgs = this._dagNode.getLoadArgs();
        } else {
            loadArgs = this._getLoadArgsFromPbGraph(this._pbDataFlowCache.get(source));
        }
        param["loadArgs"] = loadArgs;
    }

    private _getLoadArgsFromPbGraph(graph: DagGraphInfo): any {
        const node: DagNodeIMDTable = <DagNodeIMDTable>DagNodeFactory.create({type: DagNodeType.IMDTable});
        node.setSubgraph(graph);
        return node.getLoadArgs();
    }
}