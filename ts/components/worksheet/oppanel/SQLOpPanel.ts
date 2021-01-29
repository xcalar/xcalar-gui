
/**
 * The operation editing panel for SQL operator
 */
class SQLOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery; // The DOM element of the panel
    protected _dataModel: SQLOpPanelModel; // The key data structure
    protected _dagNode: DagNodeSQL;
    private _identifiers: string[] = [];
    private _parsedIdentifiers: string[] = [];
    private _queryStr = "";
    private _graph: DagGraph;
    private _labelCache: Set<string>;
    private _snippetId: string;
    private _queryStrHasError = false;
    private _outputTableName = "";
    private noUpdate = false; ; // prevents updateNodeParents from being called
    private _sourceMapping: {identifier: string, source: number}[] = [];
    private _alertOff: boolean = false;
    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        this._$elemPanel = $('#sqlOpPanel');
        super.setup(this._$elemPanel);

        this._setupDropAsYouGo();
        const advancedEditor = this.getEditor();
        let timer;
        advancedEditor.on("change", (_cm, e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                advancedEditor.getValue();
                try {
                    const advancedParams = JSON.parse(advancedEditor.getValue());
                    if (!advancedParams.hasOwnProperty("sqlQueryStr")) {
                        return;
                    }
                    let queryStr = advancedParams.sqlQueryStr;
                    SQLSnippet.Instance.update(this._snippetId, queryStr);
                    if (SQLEditorSpace.Instance.getCurrentSnippetId() === this._snippetId) {
                        const editor = SQLEditorSpace.Instance.getEditor();
                        editor.setValue(queryStr);
                        editor.refresh();
                    }
                } catch(e) {}
            }, 500);
        });
    }

        /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeSQL, options?): void {
        this._dagNode = dagNode;
        this._dataModel = new SQLOpPanelModel(dagNode);
        this._queryStr = "";
        this._queryStrHasError = false;
        let error: string;
        this._graph = DagViewManager.Instance.getActiveDag();
        this._identifiers = [];
        this._parsedIdentifiers = [];
        this._labelCache = new Set();
        this._outputTableName = this._dataModel.getOutputTableName();

        this._sourceMapping = this._dataModel.getSourceMapping();
        this._reconcileSourceMapping();

        try {
            this._updateUI();
        } catch (e) {
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }

        super.showPanel(null, options)
        .then(() => {
            if (error) {
                this._startInAdvancedMode(error);
            } else if (BaseOpPanel.isLastModeAdvanced) {
                this._switchModes(true);
                this._updateMode(true);
            }
        });
    }
    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean, noTab?: boolean): void {
        if (!this.isOpen()) {
            return;
        }
        super.hidePanel(isSubmit);
        this._identifiers = [];
        this._parsedIdentifiers = [];
        this._graph = null;
        this._queryStrHasError = false;
        this._sourceMapping = [];
        this._updateIdentifiersList();
        if (!noTab) {
            SQLTabManager.Instance.closeTempTab();
        }
    }

    public getAlertOff(): boolean {
        return this._alertOff;
    }

    public setAlertOff(alertOff: boolean = false): void {
        this._alertOff = alertOff;
    }

    private _selectQuery(snippetId: string, queryStr?: string): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
        if (snippet) {
            if (queryStr == null) {
                queryStr = snippet.snippet;
            }
        }
        queryStr = queryStr || "";
        this.$panel.find(".editorWrapper").text(queryStr);
        this._queryStr = queryStr;
        this._$elemPanel.find(".identifiersSection").addClass("disabled");
        SQLUtil.getSQLStruct(queryStr)
        .then((ret) => {
            if (this.isOpen() && this._queryStr === queryStr) {
                this._queryStrHasError = false;
                if (!ret.identifiers.length && this._identifiers.length &&
                    (ret.sql.toLowerCase().includes(" from ") ||
                    (queryStr.toLowerCase().includes("from") &&
                    queryStr.toLowerCase().includes("select")))) {
                    return;
                }
                this._parsedIdentifiers = ret.identifiers;
                this._identifiers.length = Math.min(this._parsedIdentifiers.length, this._identifiers.length);
                const identifiers = [];
                this._identifiers.forEach((identifier, i) => {
                    if (i >= this._parsedIdentifiers.length) {
                        return;
                    }
                    identifiers.push(identifier);
                });

                this._parsedIdentifiers.forEach((identifier, i) => {
                    if (this._identifiers[i]) {
                        return;
                    }
                    identifiers.push(identifier);
                });

                this._reconcileSourceMapping();

                for (let i = 0; i < this._sourceMapping.length; i++) {
                    const connector = this._sourceMapping[i];
                    if (i >= identifiers.length) {
                        connector.identifier = null;
                    } else if (!this._identifiers[i] && this._parsedIdentifiers[i]) {
                        connector.identifier = this._parsedIdentifiers[i];
                    } else if (identifiers[i] && !connector.identifier) {
                        connector.identifier = identifiers[i];
                    }
                    if (!connector.identifier && connector.source === null) {
                        this._sourceMapping.splice(i, 1);
                        i--;
                    }
                }

                this._dagNode.getParents().forEach((parentNode, index) => {
                    let match = this._sourceMapping.find((connector) => {
                        return connector.source === (index + 1)
                    });
                    if (!match) {
                        let sourceSet = false;
                        this._sourceMapping.forEach((connector) => {
                            if (!connector.source) {
                                connector.source = index + 1;
                                sourceSet = true;
                            }
                        });
                        if (!sourceSet) {
                            this._sourceMapping.push({
                                "identifier": null,
                                "source": index + 1
                            });
                        }
                    }
                });

                identifiers.forEach((identifier, i) => {
                    if (!this._sourceMapping[i]) {
                        this._sourceMapping.push({
                            "identifier": identifier,
                            "source": null
                        });
                    } else {
                        // this._sourceMapping[i].identifier = identifier;
                    }
                });
                this._updateIdentifiersList();
            }
        })
        .fail((e) => {
            if (!this.isOpen() || this._queryStr !== queryStr) {
                return;
            }
            if (this._identifiers.length && queryStr &&
                (queryStr.toLowerCase().includes("from") &&
                queryStr.toLowerCase().includes("select"))) {
                    this._queryStrHasError = true;
                    this._updateHintMessage();
                return;
            }
            if (queryStr.trim().length) {
                this._queryStrHasError = true;
            } else {
                this._queryStrHasError = false;
            }
            this._identifiers = [];
            this._parsedIdentifiers = [];
            this._sourceMapping.forEach(connector => {
                connector.identifier = null;
            });
            this._updateIdentifiersList();
            console.error(e);
        })
        .always(() => {
            this._$elemPanel.find(".identifiersSection").removeClass("disabled");
            deferred.resolve();
        });
        return deferred.promise();
    }

    private _getDropAsYouGoSection(): JQuery {
        return this.$panel.find(".dropAsYouGo");
    }

    private _isDropAsYouGo(): boolean {
        let $checkboxSection = this._getDropAsYouGoSection();
        return $checkboxSection.find(".checkbox").hasClass("checked");
    }

    private _toggleDropAsYouGo(checked: boolean): void {
        let $checkbox = this._getDropAsYouGoSection().find(".checkbox");
        if (checked == null) {
            checked = !$checkbox.hasClass("checked");
        }

        if (checked === true) {
            $checkbox.addClass("checked");
        } else if (checked === false) {
            $checkbox.removeClass("checked");
        }
    }

    private _setupDropAsYouGo(): void {
        let $dropAsYouGo = this._getDropAsYouGoSection();
        $dropAsYouGo.on("click", ".checkbox, .text", () =>{
            this._toggleDropAsYouGo(null);
        });
    }

    public updateSnippet(snippetId: string) {
        if (!this._hasActiveSnippet(snippetId)) {
            return;
        }
        this._selectQuery(snippetId);
    }


    private _hasActiveSnippet(snippetId) {
        return (this.isOpen() && this._snippetId === snippetId);
    }

    private configureSQL(
        sql?: string,
        identifiers?: Map<number, string>
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        sql = sql || "";

        const dropAsYouGo: boolean = this._isDropAsYouGo();

        if (!sql) {
            this._dataModel.setDataModel("", this._sourceMapping, dropAsYouGo, this._outputTableName);
            this._dataModel.submit();

            return PromiseHelper.resolve();
        }
        const queryId = xcHelper.randName("sql", 8);
        try {
            SQLUtil.lockProgress();
            const options = {
                identifiers: identifiers,
                dropAsYouGo: dropAsYouGo,
                sourceMapping: this._sourceMapping
            };

            this._dagNode.compileSQL(sql, queryId, options)
            .then(() => {
                this._dataModel.setDataModel(sql, this._sourceMapping, dropAsYouGo, this._outputTableName);
                this._dataModel.submit();
                deferred.resolve();
            })
            .fail((err) => {
                this._dataModel.setDataModel(sql, this._sourceMapping, dropAsYouGo, this._outputTableName);
                this._dataModel.submit(true);
                deferred.reject(err);
            })
            .always(() => {
                SQLUtil.resetProgress();
            });
        } catch (e) {
            SQLUtil.resetProgress();
            deferred.reject(e);
        }
        return deferred.promise();
    };

    // currently only called whenever the form opens
    protected _updateUI() {
        // Setup event listeners
        this._setupEventListener();
        this._renderSnippet();
        this._renderDropAsYouGo();
    }

    public updateNodeParents(node, index, adding) {
        if (!this.isOpen()) return;
        if (this.noUpdate) return;
        if (node !== this._dagNode) return;
        if (adding) {
            let added = false;
            for (let i = 0; i < this._sourceMapping.length; i++) {
                if (this._sourceMapping[i].source >= (index + 1)) {
                    this._sourceMapping[i].source++;
                }
            }
            for (let i = 0; i < this._sourceMapping.length; i++) {
                if (!this._sourceMapping[i].source) {
                    this._sourceMapping[i].source = index + 1;
                    added = true;
                    break;
                }
            }
            if (!added) {
                this._sourceMapping.push({
                    identifier: null,
                    source: index + 1
                });
            }
        } else {
            for (let i = 0; i < this._sourceMapping.length; i++) {
                if (this._sourceMapping[i].source === (index + 1)) {
                    this._sourceMapping[i].source = null;
                    if (!this._sourceMapping[i].identifier) {
                        this._sourceMapping.splice(i, 1);
                    }
                    break;
                }
            }
            for (let i = 0; i < this._sourceMapping.length; i++) {
                if (this._sourceMapping[i].source > index) {
                    this._sourceMapping[i].source--;
                }
            }
        }
        this._updateIdentifiersList();
    }

    private _updateIdentifiersList() {
        let leftCol = "";
        let rightCol = "";

        this._sourceMapping.forEach(row => {
            if (!row.identifier) {
                leftCol += `<div class="source notSpecified">
                             Not Found
                     </div>`;
            } else {
                leftCol += this._getIdentifierHTML(row.identifier);
            }
            let connectorName = "";
            if (row.source) {
                let parentNode = this._dagNode.getParents()[row.source - 1];
                connectorName = parentNode.getTitle();
            } else {
                connectorName = `None
                <i class="qMark icon xi-unknown"
                data-toggle="tooltip"
                data-container="body"
                data-placement="auto top"
                data-title="If no plan input is selected, the SQL statement table name will be used"></i>`;
            }
            rightCol += this._getConnectorHTML(connectorName);
        });

        let html = `<div class="col">${leftCol}</div><div class="col">${rightCol}</div>`;
        this._$elemPanel.find(".identifiersList").html(html);

        this._$elemPanel.find(".identifiersList .source").each((index, el) => {
            const $dropDownList: JQuery = $(el).find(".dropDownList");
            new MenuHelper($dropDownList, {
                fixedPosition: {
                    selector: "input"
                },
                onOpen: () => {
                    let html = "";
                    this._parsedIdentifiers.forEach((identifier) => {
                        html += `<li>${identifier}</li>`;
                    });

                    if (!this._parsedIdentifiers.length) {
                        html += `<li data-id="" class="hint">No tables found</li>`
                    }
                    $dropDownList.find("ul").html(html);
                },
                onSelect: ($li) => {
                    let val;
                    if ($li.hasClass("hint")) {
                        return;
                    } else {
                        val = $li.text().trim();
                    }
                    $dropDownList.find("input").val(val);
                    this._identifiers[index] = val;
                    this._sourceMapping[index].identifier = val;
                }
            }).setupListeners();
        });

        this._$elemPanel.find(".identifiersList .dest").each((index, el) => {
            const $dropDownList: JQuery = $(el).find(".dropDownList");
            new MenuHelper($dropDownList, {
                fixedPosition: {
                    selector: "div.text"
                },
                onOpen: () => {
                    const nodes = this._graph.getAllNodes();
                    let html = "";
                    let nodeInfos = [];
                    let nodeInfosInUse = [];
                    let connectorNodeIds = new Map();

                    this._sourceMapping.forEach((connector) => {
                        if (connector.source) {
                            connectorNodeIds.set(this._dagNode.getParents()[connector.source - 1].getId(), connector);
                        }
                    });
                    let connectorIndex = this._dagNode.getNextOpenConnectionIndex();
                    let cachedLabels = [];
                    nodes.forEach(node => {
                        if (node === this._dagNode || node.isHidden()) {
                            return;
                        }
                        if (!this._graph.canConnect(node.getId(), this._dagNode.getId(),
                            connectorIndex)) {
                            return;
                        }
                        if (connectorNodeIds.has(node.getId())) {
                            nodeInfosInUse.push({
                                id: node.getId(),
                                label: node.getTitle()
                            });
                        } else if (this._labelCache.has(node.getId())) {
                            cachedLabels.push({
                               id: node.getId(),
                               label: node.getTitle()
                            });
                        } else {
                            nodeInfos.push({
                                id: node.getId(),
                                label: node.getTitle()
                            });
                        }
                    });
                    nodeInfosInUse.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    cachedLabels.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    nodeInfos.sort((a, b) => {
                        if (a.label < b.label) {
                            return -1;
                        } else {
                            return 1;
                        }
                    });
                    nodeInfos = [...nodeInfosInUse, ...cachedLabels, ...nodeInfos];

                    nodeInfos.forEach((nodeInfo) => {
                        html += `<li data-id="${nodeInfo.id}">${xcStringHelper.escapeHTMLSpecialChar(nodeInfo.label)}</li>`;
                    });
                    html =  `<li class="pubTable" data-id="pubTable">None <i class="qMark icon xi-unknown"
                    data-toggle="tooltip"
                    data-container="body"
                    data-placement="auto top"
                    data-title="If no plan input is selected, the SQL statement table name will be used"></i></li>` + html;
                    if (!nodeInfos.length) {
                        html += `<li data-id="" class="hint">No tables found</li>`
                    }
                    $dropDownList.find("ul").html(html);
                },
                onSelect: ($li) => {
                    if (this.$panel.hasClass("locked")) {
                        return;
                    }
                    let val;
                    if ($li.hasClass("hint")) {
                        return;
                    } else {
                        val = $li.text().trim();
                    }
                    if (this._sourceMapping[index] && this._sourceMapping[index].source) {
                        this._labelCache.add(this._dagNode.getParents()[this._sourceMapping[index].source - 1].getId());
                    }
                    if ($li.hasClass("pubTable")) {
                        $dropDownList.find(".text").html(val +
                            `<i class="qMark icon xi-unknown"
                            data-toggle="tooltip"
                            data-container="body"
                            data-placement="auto top"
                            data-title="If no plan input is selected, the SQL statement table name will be used"></i>`);
                    } else {
                        $dropDownList.find(".text").text(val);
                    }
                    this._setConnector(index, val, $li.data('id'));
                }
            }).setupListeners();
        });

        this._updateHintMessage();
    }

    private _updateHintMessage() {
        if (this._queryStrHasError) {
            this._$elemPanel.find(".noSQLHint").removeClass("xc-hidden");
            this._$elemPanel.find(".noTableHint").addClass("xc-hidden");
        } else {
            if (this._parsedIdentifiers.length === 0) {
                this._$elemPanel.find(".noTableHint").removeClass("xc-hidden");
                this._$elemPanel.find(".noSQLHint").addClass("xc-hidden");
            } else {
                this._$elemPanel.find(".noTableHint").addClass("xc-hidden");
                this._$elemPanel.find(".noSQLHint").addClass("xc-hidden");
            }
        }
    }

    private _getIdentifierHTML(identifier: string): HTML {
        return `<div class="source">
                <div class="dropDownList">
                    <input class="text" type="text" value="${identifier}" spellcheck="false" readonly>
                    <div class="iconWrapper">
                        <i class="icon xi-arrow-down"></i>
                    </div>
                    <div class="list">
                        <ul>
                        </ul>
                        <div class="scrollArea top stopped" style="display: none;">
                            <i class="arrow icon xi-arrow-up"></i>
                        </div>
                        <div class="scrollArea bottom" style="display: none;">
                            <i class="arrow icon xi-arrow-down"></i>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    private _getConnectorHTML(connectorName: string): HTML {
        return `<div class="dest">
            <div class="dropDownList">
                <div class="text">${connectorName}</div>
                <div class="iconWrapper">
                    <i class="icon xi-arrow-down"></i>
                </div>
                <div class="list">
                    <ul>
                    </ul>
                    <div class="scrollArea top stopped" style="display: none;">
                        <i class="arrow icon xi-arrow-up"></i>
                    </div>
                    <div class="scrollArea bottom" style="display: none;">
                        <i class="arrow icon xi-arrow-down"></i>
                    </div>
                </div>
            </div>
        </div>`;
    }

    public getAutoCompleteList() {
        const acTables = {};
        this._dagNode.getParents().forEach((parent, index) => {
            let tableName = this._identifiers[index];
            if (!tableName) {
                tableName = this._parsedIdentifiers[index];
            }
            let tableColumns = [];
            if (tableName) {
                acTables[tableName] = tableColumns;
            }

            parent.getLineage().getColumns(false, true).forEach((parentCol) => {
                let colName = xcHelper.cleanseSQLColName(parentCol.name);
                if (colName != "DATA" && !xcHelper.isInternalColumn(colName)) {
                    tableColumns.push(colName);
                    if (!acTables[colName]) {
                        acTables[colName] = [];
                    }
                }
            });
        });
        return acTables;
    }

    public getColumnHintList(): Set<string> {
        const columnSet: Set<string> = new Set();
        this._dagNode.getParents().forEach((parent, index) => {
            let tableName = this._identifiers[index];
            if (!tableName) {
                tableName = this._parsedIdentifiers[index];
            }
            if (tableName) {
                tableName += ".";
            } else {
                tableName = "";
            }

            parent.getLineage().getColumns(false, true).forEach((parentCol) => {
                let colName = xcHelper.cleanseSQLColName(parentCol.name);
                if (colName != "DATA" && !xcHelper.isInternalColumn(colName)) {
                    columnSet.add(tableName + colName); // includes "."
                }
            });
        });
        return columnSet;
    }

    private _setConnector(index, label, newParentNodeId) {
        let needsConnection = true;
        this.noUpdate = true; // prevents updateNodeParents from being called
        let oldConnector = this._sourceMapping[index];
        let oldConnectorSource = oldConnector.source;
        if (oldConnector && oldConnectorSource) {
            let oldNodeId = this._dagNode.getParents()[oldConnectorSource - 1].getId();
            DagViewManager.Instance.disconnectNodes(oldNodeId, this._dagNode.getId(),
                    oldConnectorSource - 1, this._graph.getTabId());
            oldConnector.source = null;
            this._sourceMapping.forEach((connector, i) => {
                if (connector.source && connector.source > oldConnectorSource) {
                    connector.source--;
                }
            });
            if (newParentNodeId && (newParentNodeId !== this._dagNode.getId()) &&
                this._graph.getNode(newParentNodeId)) {
                DagViewManager.Instance.connectNodes(newParentNodeId, this._dagNode.getId(),
                oldConnectorSource - 1, this._graph.getTabId(), false, true);
                needsConnection = false;
                this._sourceMapping.forEach((connector, i) => {
                    if (connector.source && connector.source >= oldConnectorSource) {
                        connector.source++;
                    }
                });
                oldConnector.source = oldConnectorSource;

            }
        }
        if (needsConnection && newParentNodeId && (newParentNodeId !== this._dagNode.getId()) &&
            this._graph.getNode(newParentNodeId)) {
            let index = this._dagNode.getNextOpenConnectionIndex();
            DagViewManager.Instance.connectNodes(newParentNodeId, this._dagNode.getId(),
                index, this._graph.getTabId());
            this._sourceMapping.forEach((connector, i) => {
                if (connector.source && connector.source > index) {
                    connector.source++;
                }
            });
            oldConnector.source = index + 1;
        }

        let rerender = false;
        for (let i = 0; i < this._sourceMapping.length; i++) {
            const connector = this._sourceMapping[i];
            if (!connector.identifier && connector.source === null) {
                this._sourceMapping.splice(i, 1);
                i--;
                rerender = true;
            }
        }

        if (rerender) {
            this._updateIdentifiersList();
        }
        this.noUpdate = false;
    }

    private _renderSnippet() {
        const queryStr: string = this._dataModel.getSqlQueryString() || null;
        const snippetId = SQLTabManager.Instance.newTempTab("SQL Graph Node", queryStr || "");
        this._snippetId = snippetId;
        this._selectQuery(snippetId, queryStr);
    }

    private _renderDropAsYouGo(): void {
        let dropAsYouGo: boolean = this._dataModel.isDropAsYouGo();
        this._toggleDropAsYouGo(dropAsYouGo);
    }

    private _extractIdentifiers(): Map<number, string> {
        let identifiers = new Map<number, string>();
        this._sourceMapping.forEach((connector, index) => {
            if (!connector.identifier) return;
            identifiers.set(index + 1, connector.identifier);
        });

        return identifiers;
    }

    public getSourceMapping() {
        return this._sourceMapping;
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        // Clear existing event handlers
        this._$elemPanel.off();

        // Close icon & Cancel button
        this._$elemPanel.on('click', '.close, .cancel:not(.confirm)', () => {
            this.close(false);
        });

        // Submit button
        this._$elemPanel.on('click', '.submit', () => {
            this._submit();
        });

        this._$elemPanel.on("click", ".preview", () => {
            this._preview();
        })
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchModes(toAdvancedMode: boolean): XDPromise<any> {
        if (toAdvancedMode) {
            let sqlQueryStr = this._queryStr;
            const advancedParams = {
                sqlQueryStr: sqlQueryStr,
                mapping: this._sourceMapping,
                dropAsYouGo: this._isDropAsYouGo(),
                outputTableName: this._outputTableName
            };
            const paramStr = JSON.stringify(advancedParams, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            return PromiseHelper.resolve();
        } else {
            return this._switchToStandardMode();
        }
    }

    protected _switchToStandardMode() {
        try {
            const advancedParams: DagNodeSQLInputStruct = JSON.parse(this._editor.getValue());
            if (JSON.stringify(advancedParams, null, 4) === this._cachedBasicModeParam) {
                return PromiseHelper.resolve();
            }
            let errorMsg = this._validateAdvancedParams(advancedParams);
            if (errorMsg) {
                return PromiseHelper.reject(errorMsg);
            }
            this._outputTableName = advancedParams.outputTableName;

            if (advancedParams.dropAsYouGo != null) {
                this._toggleDropAsYouGo(advancedParams.dropAsYouGo);
            }

            this._reconcileSourceMapping();

            let queryStr = advancedParams.sqlQueryStr;
            SQLSnippet.Instance.update(this._snippetId, queryStr);
            if (SQLEditorSpace.Instance.getCurrentSnippetId() === this._snippetId) {
                const editor = SQLEditorSpace.Instance.getEditor();
                editor.setValue(queryStr);
                editor.refresh();
            }

            this._updateHintMessage();

            this._identifiers = [];
            this._sourceMapping = advancedParams.mapping;
            return this._selectQuery(this._snippetId, queryStr);
        } catch (e) {
            return PromiseHelper.reject(e);
        }
    }

    protected _handleModeSwitch($panel: JQuery, event) {
        const $switch: JQuery = $(event.target).closest(".switch");
        const toAdvanceMode: boolean = $switch.hasClass("on") ? false : true;
        this._switchModes(toAdvanceMode)
        .then(() => {
            this._updateMode(toAdvanceMode);
        })
        .fail((error) => {
            const $e = toAdvanceMode ? $panel.find(".opSection") : $panel.find(".advancedEditor");
            StatusBox.show(error, $e);
        });
    }

    private _submit() {
        let modePromise = PromiseHelper.resolve();
        if (this._isAdvancedMode()) {
            modePromise = this._switchModes(false);
        }

        modePromise
        .then(() => {
            let identifiers;
            try {
                identifiers = this._extractIdentifiers();
                this._validateIdentifierNames(identifiers);
            } catch (e) {
                StatusBox.show(e, this._$elemPanel.find(".btn-submit"));
                return;
            }
            const query = this._queryStr.replace(/;+$/, "");

            this.configureSQL(query, identifiers)
            .then(() => {
                this.close(true);
            })
            .fail((err) => {
                if (err !== "Cancel" && err !== "cancel") {
                    Alert.show({
                        title: SQLErrTStr.Err,
                        msg:  "Error details: " + xcHelper.parseError(err),
                        isAlert: true
                    });
                    this._dagNode.beErrorState();
                }
            });
        })
        .fail((error) => {
            StatusBox.show(error, this._$elemPanel.find(".advancedEditor"));
        });
    }

    private _validateIdentifierNames(identifiers) {
        let identiferSet = new Set();
        for (let [key, identifier] of identifiers) {
            if (!this._parsedIdentifiers.includes(identifier)) {
                throw(`Table ${identifier} not found in SQL statement`);
            }
            if (identiferSet.has(identifier)) {
                throw(`Duplicate table found: ${identifier}`)
            }
            identiferSet.add(identifier);
        }
        this._parsedIdentifiers.forEach(identifier => {
            if (!identiferSet.has(identifier)) {
                throw(`Specify a corresponding plan table for '${identifier}'`);
            }
        });
    }

    private _validateSourceMapping(sourceMapping) {
        for (let i = 0; i < sourceMapping.length; i++) {

        }
    }

    private _validateAdvancedParams(advancedParams: DagNodeSQLInputStruct): string {
        let error = this._dagNode.validateParam(advancedParams);
        if (error != null && error.error) {
            return error.error;
        }

    }

    protected _updateColumns(): ProgCol[] {
        this.allColumns = [];
        return this.allColumns;
    }

    protected _preview() {
        let modePromise;
        if (this._isAdvancedMode()) {
            modePromise = this._switchModes(false);
        } else {
            modePromise = PromiseHelper.resolve();
        }
        modePromise
        .then(() => {
            let identifiers;
            try {
                identifiers = this._extractIdentifiers();
                this._validateIdentifierNames(identifiers);
            } catch (e) {
                StatusBox.show(e, this._$elemPanel.find(".preview"));
                return;
            }

            let sql = this._queryStr.replace(/;+$/, "");
            if (!sql.toUpperCase().includes("LIMIT")) {
                sql += ` LIMIT ${UserSettings.Instance.getPref("dfPreviewLimit")}`;
            }

            const queryId = xcHelper.randName("sql", 8);
            try {
                const graph = this._tab.getGraph();
                if (this._previewNodes.length) {
                    let table;
                    this._previewNodes.forEach(previewNode => {
                        table = previewNode.getTable();
                        graph.removeNode(previewNode.getId());
                    });
                    TableTabManager.Instance.deleteTab(table);
                    this._previewNodes = [];
                }

                const nodeInfo = this._dagNode.getNodeCopyInfo(true, false, true);
                delete nodeInfo.id;
                nodeInfo.isHidden = true;
                const lastNode: DagNodeSQL = graph.newNode(nodeInfo);

                this.noUpdate = true;
                this._dagNode.getParents().forEach((parent, index) => {
                    if (!parent) return;
                    graph.connect(parent.getId(), lastNode.getId(), index, false, false);
                });

                this._previewNodes = [lastNode];
                this.noUpdate = false;

                this._lockPreview();
                const options = {
                    identifiers: identifiers,
                    dropAsYouGo: true,
                    sourceMapping: this._sourceMapping
                };

                lastNode.compileSQL(sql, queryId, options)
                .then(() => {
                    lastNode.setIdentifiers(identifiers);
                    lastNode.setParam({
                        sqlQueryStr: sql,
                        mapping: this._sourceMapping,
                        dropAsYouGo: true,
                        outputTableName: "xcPreview"
                    }, true);
                    const dagView = DagViewManager.Instance.getDagViewById(this._tab.getId());

                    return dagView.run([lastNode.getId()])
                })
                .then(() => {
                    if (!UserSettings.Instance.getPref("dfAutoPreview")) {
                        DagViewManager.Instance.viewResult(lastNode, this._tab.getId());
                    }
                })
                .fail((err) => {
                    if (err !== "Cancel" && err !== "cancel" &&
                        err !== StatusTStr[StatusT.StatusCanceled]) {
                        Alert.show({
                            title: SQLErrTStr.Err,
                            msg:  "Error details: " + xcHelper.parseError(err),
                            isAlert: true
                        });
                    }
                })
                .always(() => {
                    this._unlockPreview();
                });
            } catch (e) {
                this._unlockPreview();
            }
        })
        .fail((error) => {
            StatusBox.show(error, this._$elemPanel.find(".advancedEditor"));
            this._unlockPreview();
        });

        return true;
    }


    protected _lockPreview() {
        this._$elemPanel.find('.preview').addClass("xc-disabled");
        this._previewInProgress = true;
    }

    protected _unlockPreview() {
        this._$elemPanel.find('.preview').removeClass("xc-disabled");
        this._previewInProgress = false;
    }

    // makes sure source numbers == number of dag node parents
    private _reconcileSourceMapping() {
        let numParents = this._dagNode.getParents().length;
        // remove any sources that are greater than number of parents
        let sortedSourceMapping = [...this._sourceMapping];
        sortedSourceMapping.sort((a, b) => {
            if (a.source == null) {
                return 1;
            } else if (b.source == null) {
                return -1;
            }
            return a.source - b.source;
        });

        sortedSourceMapping.forEach((connector, index) => {
            if (index >= numParents) {
                connector.source = null;
            } else {
                connector.source = (index + 1);
            }
        });
    }
}