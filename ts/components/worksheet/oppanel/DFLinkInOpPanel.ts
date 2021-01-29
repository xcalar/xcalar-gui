class DFLinkInOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeDFIn;
    private _dataflows: {tab: DagTab, displayName: string}[];
    private _linkOutNodes: {node: DagNodeDFOut, displayName: string}[];
    private _schemaSection: ColSchemaSection;
    private _source: string;
    private _app: string;

    public constructor() {
        super();
        this._setup();
        this._schemaSection = new ColSchemaSection(this._getSchemaSection());
    }

    /**
     * DFLinkInOpPanel.Instance.show
     * @param dagNode
     * @param options
     */
    public show(dagNode: DagNodeDFIn, options: ShowPanelInfo): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagNode = dagNode;
        this._app = options ? options.app : null;
        super.showPanel("Func Input", options)
        .then(() => {
            this._initialize(dagNode);
            const model = $.extend(this._dagNode.getParam(), {
                schema: this._dagNode.getSchema()
            });
            this._restorePanel(model);
            if (model.schema != null && model.schema.length !== 0) {
                // Already linked to a source, so we update the panel to pick up any possible lineage change
                this._autoDetectSchema(false);
            }
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Close the view
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
            const param: DagNodeDFInInputStruct = this._validate(true) || {
                linkOutName: "",
                dataflowId: "",
                source: "",
                schema: []
            };
            param.dataflowId = param.dataflowId || "";
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._convertAdvConfigToModel();
                this._restorePanel(param);
                return null;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _setup(): void {
        super.setup($("#dfLinkInPanel"));
        this._addEventListeners();
    }

    private _clear(): void {
        this._dagNode = null;
        this._dataflows = null;
        this._linkOutNodes = null;
        this._source = null;
        this._app = null;
        this._schemaSection.clear();
        let $panel = this._getPanel();
        const $drdopwonList: JQuery = $panel.find(".dropDownList");
        $drdopwonList.find("input").val("");
        $drdopwonList.find("ul").empty();
        $panel.removeClass("withSource");
        this._toggleTableNameOption(false);
    }

    private _initialize(dagNode: DagNodeDFIn): void {
        this._dagNode = dagNode;
        this._initializeDataflows();
    }

    private _initializeDataflows(): void {
        const tabs: DagTab[] = DagTabManager.Instance.getTabs();
        const dataflows: {tab: DagTab, displayName: string}[] = [];
        tabs.forEach((tab) => {
            // don't show sql tab, custom tab, or optimized tab
            if (tab.getType() !== DagTabType.User ||
                tab.getApp() !== this._app
            ) {
                return;
            }
            let hasLinkOutNode: boolean = false;
            try {
                const nodes: Map<DagNodeId, DagNode> = tab.getGraph().getAllNodes();
                for (let node of nodes.values()) {
                    if (node.getType() === DagNodeType.DFOut) {
                        hasLinkOutNode = true;
                        break;
                    }
                }
            } catch (e) {
                console.error(e);
            }
            if (!hasLinkOutNode) {
                // exclude dataflow that don't have link out node
                return;
            }
            const name: string = tab.getName();
            dataflows.push({
                tab: tab,
                displayName: name
            });
        });

        this._dataflows = dataflows;
    }

    private _initializeLinkOutNodes(dataflowName: string): void {
        this._linkOutNodes = [];
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        if (dataflow.length === 1) {
            const nodes: Map<DagNodeId, DagNode> = dataflow[0].tab.getGraph().getAllNodes();
            nodes.forEach((node) => {
                if (node.getType() === DagNodeType.DFOut) {
                    const name: string = (<DagNodeDFOut>node).getParam().name;
                    if (name) {
                        this._linkOutNodes.push({
                            node: <DagNodeDFOut>node,
                            displayName: name
                        });
                    }
                }
            });
        }
    }

    private _setSource(source: string): void {
        this._source = source;
        let $panel = this._getPanel();
        if (this._source) {
            $panel.addClass("withSource");
        } else {
            $panel.removeClass("withSource");
        }
        $panel.find(".sourceTableName input").val(this._source);
        this._toggleTableNameOption(this._source != null && this._source != "");
    }

    private _restorePanel(param: {
        linkOutName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
    }): void {
        this._setSource(param.source);
        const dataflowName: string = this._dataflowIdToName(param.dataflowId);
        this._getDFDropdownList().find("input").val(dataflowName);
        this._getLinkOutDropdownList().find("input").val(param.linkOutName);
        this._initializeLinkOutNodes(dataflowName);
        this._schemaSection.render(param.schema);
    }

    protected _submitForm(): void {
        let args: {linkOutName: string, dataflowId: string, source: string, schema: ColSchema[]};
        if (this._isAdvancedMode()) {
            args = this._validAdvancedMode();
            if (args != null) {
                this._setSource(args.source || "");
            }
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }

        this._dagNode.setSchema(args.schema);
        this._dagNode.setParam(args);
        this.close(true);
    }

    protected _preview(): void {
        let args: {linkOutName: string, dataflowId: string, source: string, schema: ColSchema[]};
        if (this._isAdvancedMode()) {
            args = this._validAdvancedMode();
        } else {
            args = this._validate();
        }

        if (args) {
            super._preview(args, (node) => {
                node.setSchema(args.schema);
            });
        }
    }

    private _validate(ignore: boolean = false): {
        linkOutName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
    } {
        const $dfInput: JQuery = this._getDFDropdownList().find("input");
        const $linkOutInput: JQuery = this._getLinkOutDropdownList().find("input");
        const dataflowId: string = this._dataflowNameToId($dfInput.val().trim());
        const linkOutName: string = $linkOutInput.val().trim();
        let isValid: boolean = false;
        if (ignore) {
            isValid = true;
        } else if (this._source) {
            isValid = true;
        } else {
            // only check when there is no source
            isValid = xcHelper.validate([{
                $ele: $dfInput
            }, {
                $ele: $dfInput,
                error: OpPanelTStr.DFLinkInNoDF,
                check: () => dataflowId == null
            }, {
                $ele: $linkOutInput
            }]);
        }


        if (!isValid) {
            return null;
        }

        const schema = this._schemaSection.getSchema(ignore);
        if (isValid && schema != null) {
            if (!ignore) {
                if (this._getSourceOptions().filter(`[data-option="node"]`).hasClass("active")) {
                    this._source = null;
                }
            }
            return {
                dataflowId: dataflowId,
                linkOutName: linkOutName,
                source: this._source,
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

    private _populateList(
        $dropdown: JQuery,
        names: {displayName: string}[]
    ): void {
        let html: HTML = null;
        names = names || [];
        html = names.map((name) => `<li>${name.displayName}</li>`).join("");
        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _searchDF(keyword?: string): void {
        let dataflows = this._dataflows;
        if (keyword) {
            keyword = keyword.toLowerCase();
            dataflows = dataflows.filter((df) => {
                return df.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getDFDropdownList(), dataflows);
    }

    private _searchLinkOutNodeName(keyword?: string): void {
        let linkOutNodes = this._linkOutNodes;
        if (keyword) {
            keyword = keyword.toLowerCase();
            linkOutNodes = linkOutNodes.filter((node) => {
                return node.displayName.toLowerCase().includes(keyword);
            });
        }
        this._populateList(this._getLinkOutDropdownList(), linkOutNodes);
    }

    private _dataflowIdToName(dataflowId: string): string {
        if (!dataflowId) {
            return "";
        }
        if (dataflowId === DagNodeDFIn.SELF_ID) {
            dataflowId = DagViewManager.Instance.getActiveTab().getId();
        }
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.tab.getId() === dataflowId;
        });
        return dataflow.length === 1 ? dataflow[0].displayName : "";
    }

    private _dataflowNameToId(dataflowName: string): string {
        if (!dataflowName) {
            return null;
        }
        const dataflow = this._dataflows.filter((dataflow) => {
            return dataflow.displayName === dataflowName;
        });
        return dataflow.length === 1 ? dataflow[0].tab.getId() : null;
    }

    private _getDFDropdownList(): JQuery {
        return this._getPanel().find(".dataflowName .dropDownList");
    }

    private _getLinkOutDropdownList(): JQuery {
        return this._getPanel().find(".linkOutNodeName .dropDownList");
    }

    private _getSchemaSection(): JQuery {
        return this._getPanel().find(".colSchemaSection");
    }

    private _getSourceOptions(): JQuery {
        return this._getPanel().find(".sourceSection .radioButton");
    }

    private _autoDetectSchema(
        isOverwriteConfig: boolean = true
    ): {error: string} | null {
        try {
            const $dfInput: JQuery = this._getDFDropdownList().find("input");
            const $linkOutInput: JQuery = this._getLinkOutDropdownList().find("input");
            const dataflowId: string = this._dataflowNameToId($dfInput.val().trim());
            const linkOutName: string = $linkOutInput.val().trim();
            if (!dataflowId) {
                return {error: OpPanelTStr.DFLinkInNoDF};
            }
            if (!linkOutName) {
                return {error: OpPanelTStr.DFLinkInNoOut};
            }
            const fakeLinkInNode: DagNodeDFIn = <DagNodeDFIn>DagNodeFactory.create({
                type: DagNodeType.DFIn
            });
            fakeLinkInNode.setParam({
                dataflowId: dataflowId,
                linkOutName: linkOutName,
                source: ""
            });
            const dfOutNode: DagNodeDFOut = fakeLinkInNode.getLinkedNodeAndGraph().node;
            const progCols: ProgCol[] = dfOutNode.getLineage().getColumns(false, true);
            const schema: ColSchema[] = progCols.map((progCol) => {
                return {
                    name: progCol.getBackColName(),
                    type: progCol.getType()
                }
            });
            this._schemaSection.setInitialSchema(schema);
            if (isOverwriteConfig) {
                this._schemaSection.render(schema);
            }
            return null;
        } catch (e) {
            return {error: e.message};
        }
    }

    private _autoDetectSchemaFromSource(): XDPromise<ColSchema[]> {
        let deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        try {
            // use fake node to do parameterization replacement
            const fakeLinkInNode: DagNodeDFIn = <DagNodeDFIn>DagNodeFactory.create({
                type: DagNodeType.DFIn
            });
            fakeLinkInNode.setParam({
                dataflowId: "",
                linkOutName: "",
                source: this._source
            });

            let source: string = fakeLinkInNode.getSource();
            let schemaFromNode: ColSchema[] = this._getSchemaFromSourceNode(source);
            let promise: XDPromise<ColSchema[]>;
            if (schemaFromNode != null) {
                promise = PromiseHelper.resolve(schemaFromNode);
            } else {
                promise = this._getSchemaFromResultSet(source);
            }

            promise
            .then((schema) => {
                this._schemaSection.setInitialSchema(schema);
                this._schemaSection.render(schema);
                deferred.resolve(schema);
            })
            .fail(deferred.reject);
        } catch (e) {
            deferred.reject({error: e.message});
        }

        let promise = deferred.promise();
        xcUIHelper.showRefreshIcon(this._getSchemaSection(), false, promise);
        return promise;
    }

    private _getSchemaFromSourceNode(wholeName: string): ColSchema[] | null {
        let colSchema: ColSchema[] = null;
        try {
            let tableName: string = xcHelper.getTableName(wholeName);
            let nodeIndex: number = tableName.indexOf(DagNode.KEY);
            let tabIndex: number = tableName.indexOf(DagTab.KEY);
            if (nodeIndex >= 0 && tabIndex >= 0) {
                let tabId: string = tableName.substring(tabIndex, nodeIndex - 1);
                let tab: DagTab = DagTabManager.Instance.getTabById(tabId);
                if (tab != null) {
                    let nodeId: string = tableName.substring(nodeIndex);
                    let node = tab.getGraph().getNode(nodeId);
                    if (node != null) {
                        colSchema = node.getLineage().getColumns(true, true).map((progCol) => {
                            return {
                                name: progCol.getBackColName(),
                                type: progCol.getType()
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("cannot find node from table", e);
        }
        return colSchema;
    }

    // XXX put it into TableMeta.ts
    private _getSchemaFromResultSet(source: string): XDPromise<ColSchema[]> {
        let deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();

        // since id doesn't really useful here, just make sure it's not empty
        let id = xcHelper.getTableId(source) || source;
        let table = new TableMeta({
            tableName: source,
            tableId: id
        });

        table.getMetaAndResultSet()
        .then(() => {
            let rowManager = new RowManager(table, null);
            rowManager.setAlert(false);
            return rowManager.getFirstPage();
        })
        .then((jsons) => {
            let schema: ColSchema[] = table.getImmediates().map((info) => {
                let name: string = info.name;
                let type: ColumnType = xcHelper.convertFieldTypeToColType(info.type);
                return {
                    name: name,
                    type: type
                };
            });

            let set: Set<string> = new Set();
            jsons.forEach((json) => {
                try {
                    let row = JSON.parse(json);
                    for (let colName in row) {
                        let parsed = xcHelper.parsePrefixColName(colName);
                        if (parsed.prefix && !set.has(colName)) {
                            // track fat-ptr columns
                            set.add(colName);
                            schema.push({
                                name: colName,
                                type: ColumnType.unknown
                            });
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            });
            schema.sort((schemaA, schemB) => {
                let aName = schemaA.name;
                let bName = schemB.name;
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
            deferred.resolve(schema);
        })
        .fail(deferred.reject)
        .always(() => {
            table.freeResultset();
        });

        return deferred.promise();
    }

    private _convertAdvConfigToModel(): {
        linkOutName: string,
        dataflowId: string,
        source: string,
        schema: ColSchema[]
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

    private _addEventListenersForDropdown(
        $dropdown: JQuery,
        searchCallback: Function
    ): void {
        const selector: string = `#${this._getPanel().attr("id")}`;
        new MenuHelper($dropdown, {
            onOpen: () => {
                searchCallback.call(this);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    $dropdown.find("input").val($li.text()).trigger("change");
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        $dropdown.find("input")
        .on("input", (event) => {
            if (!$dropdown.is(":visible")) return; // ENG-8642
            const keyword: string = $(event.currentTarget).val().trim();
            searchCallback.call(this, keyword);
        });


    }

    protected _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        $panel.on("change", ".dataflowName input", (event) => {
            const dataflowName: string = $(event.currentTarget).val().trim();
            this._initializeLinkOutNodes(dataflowName);
        });

        $panel.on("change", ".linkOutNodeName input", () => {
            this._autoDetectSchema();
        });

        $panel.on("click", ".sourceSection .radioButton", (event) => {
            const $btn: JQuery = $(event.currentTarget);
            this._toggleTableNameOption($btn.data("option") === "table");
        });

        $panel.find(".sourceTableName input").change(() =>{
            this._source = $(event.currentTarget).val().trim();
        });

        // dropdown for dataflowName
        const $dfList: JQuery = this._getDFDropdownList();
        this._addEventListenersForDropdown($dfList, this._searchDF);
        // dropdown for linkOutNodeName
        const $linkOutDropdownList: JQuery = this._getLinkOutDropdownList();
        this._addEventListenersForDropdown($linkOutDropdownList, this._searchLinkOutNodeName);


        // auto detect listeners for schema section
        const $schemaSection: JQuery = this._getSchemaSection();
        $schemaSection.on("click", ".detect", (event) => {
            let $button = $(event.currentTarget);
            if (this._source) {
                this._autoDetectSchemaFromSource()
                .fail((error) => {
                    StatusBox.show(ErrTStr.DetectSchema, $button, false, {
                        detail: error.error
                    });
                })
            } else {
                const error: {error: string} = this._autoDetectSchema();
                if (error != null) {
                    StatusBox.show(ErrTStr.DetectSchema, $button, false, {
                        detail: error.error
                    });
                }
            }
        });

        $panel.find(".btn.preview").on("click", () => this._preview());
    }

    private _toggleTableNameOption(withSource: boolean): void {
        let $panel: JQuery = this._getPanel();
        let $options: JQuery = this._getSourceOptions();
        $options.removeClass("active");
        if (withSource) {
            $panel.addClass("withSource");
            $options.filter(`[data-option="table"]`).addClass("active");
        } else {
            $panel.removeClass("withSource");
            $options.filter(`[data-option="node"]`).addClass("active");
        }
    }

}