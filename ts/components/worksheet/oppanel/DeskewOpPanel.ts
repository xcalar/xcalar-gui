class DeskewOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeDeskew;
    private _newKey: string;
    private _outputTableName: string;
    protected codeMirrorOnlyColumns = true;

    public constructor() {
        super();
        super.setup($("#deskewOpPanel"));
        this._addEventListeners();
    }

    public show(dagNode: DagNodeDeskew, options: ShowPanelInfo): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagNode = dagNode;
        // Show panel
        super.showPanel("De-skew", options)
        .then(() => {
            this._restorePanel(this._dagNode.getParam());
            if (BaseOpPanel.isLastModeAdvanced) {
                this._startInAdvancedMode();
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public close(isSubmit?: boolean): boolean {
        if (!this.isOpen()) {
            return false;
        }
        this._clear();
        super.hidePanel(isSubmit);
        return true;
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeDeskewInputStruct = this._validate(true) || {
                column: "",
                newKey: this._newKey || "",
                outputTableName: this._outputTableName || ""
            };
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._convertAdvConfigToModel(true);
                this._restorePanel(param);
                return;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _clear(): void {
        this._dagNode = null;
        this._newKey = null;
        this._outputTableName = null;
    }

    private _getDropdownList(): JQuery {
        return this._getPanel().find(".columnName .dropDownList");
    }

    private _restorePanel(param: DagNodeDeskewInputStruct): void {
        this._getDropdownList().find("input").val(param.column);
        this._newKey = param.newKey;
        this._outputTableName = param.outputTableName;
    }

    protected _submitForm() {
        let args: DagNodeDeskewInputStruct;
        if (this._isAdvancedMode()) {
            args = this._validateAdvancedMode();
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }

        this._dagNode.setParam(args);
        this.close(true);
        return true;
    }

    protected _preview() {
        let args: DagNodeDeskewInputStruct;
        if (this._isAdvancedMode()) {
            args = this._validateAdvancedMode();
        } else {
            args = this._validate();
        }

        if (args == null) {
            // invalid case
            return;
        }

        super._preview(args);
    }

    private _validate(ingore: boolean = false): DagNodeDeskewInputStruct {
        const $input: JQuery = this._getDropdownList().find("input");
        let isValid: boolean = false;
        if (ingore) {
            isValid = true;
        } else {
            isValid = xcHelper.validate([{
                $ele: $input
            }]);
        }

        if (!isValid) {
            return null;
        }

        return {
            column: $input.val().trim(),
            newKey: this._newKey || "",
            outputTableName: this._outputTableName || ""
        }
    }

    private _validateAdvancedMode(): DagNodeDeskewInputStruct {
        let args: DagNodeDeskewInputStruct;
        let error: string;
        try {
            args = this._convertAdvConfigToModel();
        } catch (e) {
            error = e.message;
        }

        if (error == null) {
            return args;
        } else {
            StatusBox.show(error, this.$panel.find(".advancedEditor"));
            return null;
        }
    }

    private _convertAdvConfigToModel(ignore: boolean = false): DagNodeDeskewInputStruct {
        const input = JSON.parse(this._editor.getValue());
        let error;
        if (!ignore) {
            error = this._dagNode.validateParam(input);
        }
        if (error) {
            throw new Error(error.error);
        }
        return input;
    }

    private _populateHintDropdown(
        $dropdown: JQuery,
        keyword: string = ""
    ): void {
        let html: HTML = "";
        let parent = this._dagNode.getParents()[0];
        try {
            if (parent) {
                parent.getLineage().getColumns(false, true).forEach((progCol) => {
                    const colName = progCol.getBackColName();
                    const type = progCol.getType();
                    if (!keyword || colName.toLowerCase().includes(keyword)) {
                        html +=
                        '<li data-type="' + type + '">' +
                            BaseOpPanel.craeteColumnListHTML(type, colName) +
                        '</li>';
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _addEventListenersForDropdown($dropdown: JQuery): void {
        const selector: string = `#${this._getPanel().attr("id")}`;
        const hintDropdown = new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateHintDropdown($curDropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    $dropdown.find("input").val($li.text()).trigger("change");
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();

        // colName hint dropdown
        let hintTimer: number;
        $dropdown.on("input", "input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            if (!$input.is(":visible")) return; // ENG-8642
            clearTimeout(hintTimer);
            hintTimer = window.setTimeout(() => {
                this._populateHintDropdown($dropdown, $input.val().trim());
                hintDropdown.openList();
            }, 200);
        });
    }

    private _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        $panel.on("click", ".btn.preview", () => {
            this._preview();
        });

        const $dropdownList: JQuery = this._getDropdownList();
        this._addEventListenersForDropdown($dropdownList);
    }
}