class DFLinkOutOpPanel extends BaseOpPanel {
    private dagNode: DagNodeDFOut;
    private dagGraph: DagGraph;
    private linkAfterExecution: boolean;

    public constructor() {
        super();
        this._setup();
    }

    public show(dagNode: DagNodeDFOut, options?) {
        this._dagNode = dagNode;
        super.showPanel("Func Output", options)
        .then(() => {
            this._initialize(dagNode);
            this._restorePanel(this.dagNode.getParam());
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    public close(isSubmit?: boolean): void {
        if (!this.isOpen()) {
            return;
        }
        super.hidePanel(isSubmit);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeDFOutInputStruct = this._validate(true) || {
                "name": "",
                "linkAfterExecution": false
            };
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const param = this._validateAdvancedMode();
                if (param["error"]) {
                    return <{error: string}>param;
                }
                this._restorePanel(<DagNodeDFOutInputStruct>param);
                return null;
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _setup(): void {
        super.setup($("#dfLinkOutPanel"));
        this._addEventListeners();
    }

    private _initialize(dagNode: DagNodeDFOut): void {
        this.dagNode = dagNode;
        this.dagGraph = DagViewManager.Instance.getActiveDag();
        if (!this.dagGraph.hasNode(this.dagNode.getId())) {
            throw new Error("Invalid dag node");
        }
    }

    private _restorePanel(param: DagNodeDFOutInputStruct): void {
        this._getLinkOutNameInput().val(param.name);
        this.linkAfterExecution = param.linkAfterExecution;
    }

    private _convertAdvConfigToModel(): DagNodeDFOutInputStruct {
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

    private _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();
        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });
    }

    protected _submitForm(): void {
        let args: DagNodeDFOutInputStruct | {error: any};
        if (this._isAdvancedMode()) {
            try {
                args = this._validateAdvancedMode();
            } catch (e) {
                return;
            }
        } else {
            args = this._validate();
        }
        if (args == null || args["error"]) {
            // invalid case
            return;
        }
        this.dagNode.setParam(<DagNodeDFOutInputStruct>args);
        this.close(true);
    }

    private _validate(ignore: boolean = false): DagNodeDFOutInputStruct {
        const $input: JQuery = this._getLinkOutNameInput();
        const name: string = $input.val().trim();
        let isValid: boolean = true;
        if (!ignore) {
            isValid = xcHelper.validate([{
                $ele: $input
            }, {
                $ele: $input,
                check: () => {
                    return this._isNonUniqueName(name);
                },
                error: OpPanelTStr.DFLinkOutNameDup
            }]);
        }

        if (isValid) {
            return {
                name: name,
                linkAfterExecution: this.linkAfterExecution
            };
        } else {
            return null;
        }
    }

    private _validateAdvancedMode() {
        let args: DagNodeDFOutInputStruct;
        let error: string;
        try {
            args = this._convertAdvConfigToModel();
        } catch (e) {
            error = e;
        }

        if (error == null) {
            return args;
        } else {
            StatusBox.show(error, this.$panel.find(".advancedEditor"));
            return {error: error};
        }
    }

    private _isNonUniqueName(name: string): boolean {
        const nodes: DagNode[] = this.dagGraph.filterNode((node: DagNode) => {
            return node.getType() === DagNodeType.DFOut &&
            (<DagNodeDFOut>node).getParam().name === name &&
            node !== this.dagNode;
        });
        return nodes.length !== 0;
    }

    private _getLinkOutNameInput(): JQuery {
        return this._getPanel().find(".linkOutName input");
    }
}