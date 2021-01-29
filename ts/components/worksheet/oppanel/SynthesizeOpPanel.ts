class SynthesizeOpPanel extends BaseOpPanel {
    protected _dagNode: DagNodeSynthesize;
    protected codeMirrorOnlyColumns = true;

    public constructor() {
        super();
        super.setup($("#synthesizeOpPanel"));
        this._addEventListeners();
    }

    public show(dagNode: DagNodeSynthesize, options: ShowPanelInfo) {
        this._dagNode = dagNode;
        // Show panel
        super.showPanel("Synthesize", options)
        .then(() => {
            this._updateMode(true);
            let param = this._dagNode.getParam();
            this._restorePanel(param);
        });
    }

    public close(isSubmit?: boolean): boolean {
        if (!this.isOpen()) {
            return false;
        }
        this._clear();
        super.hidePanel(isSubmit);
        return true;
    }

    public refreshColumns(): void {
        this._updateColumns();
    }

    private _clear(): void {
        this._dagNode = null;
    }

    private _restorePanel(param: DagNodeSynthesizeInput): void {
        const paramStr = JSON.stringify(param, null, 4);
        this._cachedBasicModeParam = paramStr;
        this._editor.setValue(paramStr);
    }

    protected _submitForm() {
        let args: DagNodeSynthesizeInputStruct = this._validateAdvancedMode();
        if (args == null) {
            // invalid case
            return;
        }

        this._dagNode.setParam(args);
        this.close(true);
        return true;
    }

    protected _preview() {
        let args: DagNodeSynthesizeInputStruct = this._validateAdvancedMode();
        if (args == null) {
            // invalid case
            return;
        }

        super._preview(args);
    }

    private _validateAdvancedMode(): DagNodeSynthesizeInputStruct {
        let args: DagNodeSynthesizeInputStruct;
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

    private _convertAdvConfigToModel(): DagNodeSynthesizeInputStruct {
        const input = JSON.parse(this._editor.getValue());
        const error = this._dagNode.validateParam(input);
        if (error) {
            throw new Error(error.error);
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

        $panel.find(".btn.preview").on("click", () => this._preview());
    }
}