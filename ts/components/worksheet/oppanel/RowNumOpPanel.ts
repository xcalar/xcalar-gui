class RowNumOpPanel extends BaseOpPanel implements IOpPanel {
    protected _componentFactory: OpPanelComponentFactory;
    protected _dagNode: DagNodeRowNum = null;
    protected _dataModel: RowNumOpPanelModel;
    protected codeMirrorOnlyColumns = true;

    /**
     * @override
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._componentFactory = new OpPanelComponentFactory('#rownumOpPanel');
        this._mainModel = RowNumOpPanelModel;
        super.setup($('#rownumOpPanel'));
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeRowNum, options?): void {
        this._dagNode = dagNode;
        this._dataModel = null;

        let error: string;
        try {
            this._dataModel = this._mainModel.fromDag(dagNode, !dagNode.isConfigured());
            this._updateUI();
        } catch (e) {
            if (!this._dataModel) {
                this._dataModel = this._mainModel.fromDag(dagNode, true);
                this._updateHeader();
            }
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            error = e;
        }
        super.showPanel(null, options)
        .then(() => {
            if (error || BaseOpPanel.isLastModeAdvanced) {
                this._startInAdvancedMode(error);
            }
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    protected _updateUI(): void {
        this._updateHeader();

        const $opSection = this._getPanel().find('.opSection');
        const opSectionDom = this._componentFactory.createOpSection({
            instrStr: this._dataModel.getInstrStr(),
            args: this._getArgs()
        });
        this._componentFactory.getTemplateMgr().updateDOM(
            <any>$opSection[0], <NodeDefDOMElement[]>opSectionDom);
    }

    private _getArgs(): AutogenSectionProps[] {
        const args: AutogenSectionProps[] = [];

        // Dest column
        const destColProp: SimpleInputProps<string> = {
            type: 'string',
            name: OpPanelTStr.RowNumPanelFieldNameDestColumn + ":",
            iconTip: OpPanelTStr.RowNumPanelFieldNameDestColumnTip,
            inputVal: this._dataModel.getDestColumn(), placeholder: '',
            valueCheck: {
                checkType: 'stringColumnNameNoEmptyValue',
                args: () => [this._dataModel.getColNameSet()]
            },
            onChange: (colNameStr: string) => {
                this._dataModel.setDestColumn(colNameStr);
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    return this._componentFactory.checkFunctions.stringColumnNameNoEmptyValue(
                        this._dataModel.getColNameSet(),
                        this._dataModel.getDestColumn()
                    ).errMsg;
                });
            }
        };
        args.push(destColProp);

        return args;
    }

    protected _submitForm() {
        if (!this._validate()) return;

        this._dagNode.setParam(this._dataModel.toDagInput());
        this.close(true);
    }

    protected _preview() {
        if (!this._validate()) return;
        super._preview(this._dataModel.toDagInput());
    }

    private _validate(): boolean {
        if (this._isAdvancedMode()) {
            const $elemEditor = this._getPanel().find(".advancedEditor");
            try {
                const advConfig = <DagNodeRowNumInputStruct>JSON.parse(this._editor.getValue());
                this._dataModel = this._convertAdvConfigToModel(advConfig);
            } catch(e) {
                StatusBox.show(e, $elemEditor);
                return false;
            }
        } else {
            if (!this._runValidation()) {
                return false;
            }
        }
        return true;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param = this._dataModel.toDagInput();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
        } else {
            try {
                const advConfig = <DagNodeRowNumInputStruct>JSON.parse(this._editor.getValue());
                if (JSON.stringify(advConfig, null, 4) !== this._cachedBasicModeParam) {
                    this._dataModel = this._convertAdvConfigToModel(advConfig);
                    this._updateUI();
                }
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    private _convertAdvConfigToModel(advConfig: DagNodeRowNumInputStruct) {
        const error = this._dagNode.validateParam(advConfig);
        if (error) {
            throw new Error(error.error);
        }

        const colMap = this._dataModel.getColumnMap();
        const model = this._mainModel.fromDagInput(colMap, advConfig);
        model.validateInputData();

        return model;
    }

    protected _updateColumns(): ProgCol[] {
        this.allColumns = [];
        return this.allColumns;
    }
}