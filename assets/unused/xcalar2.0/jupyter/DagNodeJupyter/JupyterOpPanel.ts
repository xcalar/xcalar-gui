class JupyterOpPanel extends BaseOpPanel implements IOpPanel {
    private _componentFactory: OpPanelComponentFactory;
    protected _dagNode: DagNodeJupyter = null;
    protected _dataModel: JupyterOpPanelModel;
    protected codeMirrorOnlyColumns = true;

    /**
     * @override
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        const panelHtmlSelector = '#jupyterOpPanel';
        this._componentFactory = new OpPanelComponentFactory(panelHtmlSelector);
        this._mainModel = JupyterOpPanelModel;
        super.setup($(panelHtmlSelector));
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeJupyter, options?): void {
        this._dagNode = dagNode;
        this._dataModel = this._mainModel.fromDag(dagNode);
        this._updateUI();
        super.showPanel(null, options);
        if (BaseOpPanel.isLastModeAdvanced) {
            this._startInAdvancedMode();
        }
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    protected _updateUI(): void {
        this._clearValidationList();

        const $header = this._getPanel().find('header');
        $header.empty();
        $header.append(this._componentFactory.createHeader({
            text: this._dataModel.getTitle(),
            nodeTitle: this._dagNode.getTitle(),
            onClose: () => this.close()
        }));

        const $opSection = this._getPanel().find('.opSection');
        const opSectionDom = this._componentFactory.createOpSection({
            instrStr: this._dataModel.getInstrStr(),
            args: this._getArgs()
        });
        this._componentFactory.getTemplateMgr().updateDOM(
            <any>$opSection[0], <NodeDefDOMElement[]>opSectionDom);
        this._registerEventListeners();
    }

    private _registerEventListeners(): void {
        const $submitBtn = this._getPanel().find('.btn.submit');
        $submitBtn.off();
        $submitBtn.on('click', () => this._submitForm());
    }

    private _getArgs(): AutogenSectionProps[] {
        const args: AutogenSectionProps[] = [];

        // Number of rows
        const range = {
            min: this._dataModel.getNumMinRows(),
            max: this._dataModel.getNumMaxRows()};
        const numRowsProps: SimpleInputProps<number> = {
            type: 'number',
            name: OpPanelTStr.JupyterPanelFieldNameNumRows,
            inputVal: this._dataModel.getNumExportRows(),
            placeholder: `range: >=${range.min} and <=${range.max}`,
            valueCheck: { checkType: 'integerRange', args: [range] },
            onChange: (count: number) => {
                this._dataModel.setNumExportRows(count);
                this._updateUI();
            },
            onElementMountDone: (elem) => {
                this._addValidation(elem, () => {
                    // XXX TODO: better not access the internal elements of a component
                    return this._componentFactory.checkFunctions.integerRange(
                        range, $(elem).find('.selInput').val()
                    ).errMsg;
                });
            }
        }
        args.push(numRowsProps);

        // Rename section
        const renameRowList: RenameProps[] = [];
        for (const { name, type } of this._dataModel.getFixedColumns()) {
            renameRowList.push({
                colFrom: { colName: name, colType: type },
                colTo: name,
                disableChange: true
            });
        }

        this._dataModel.getRenames().forEach(({ sourceColumn, destColumn }, idx) => {
            renameRowList.push({
                colFrom: { colName: sourceColumn.name, colType: sourceColumn.type },
                colTo: destColumn,
                valueCheck: {
                    checkType: 'stringColumnNameNoEmptyPrefixValue',
                    args: () => [this._dataModel.getColumnsAfterRename(idx)]
                },
                onNameToChange: (newName) => {
                    this._dataModel.setRename(idx, newName);
                },
                onElementMountDone: (elem) => {
                    this._addValidation(elem, () => {
                        return this._componentFactory.checkFunctions.stringColumnNameNoEmptyPrefix(
                            this._dataModel.getColumnsAfterRename(idx),
                            $(elem).find('.selTo').val()
                        ).errMsg
                    });
                }
            })
        });

        const renameProps: RenameListProps = {
            type: 'renameList', name: OpPanelTStr.JupyterPanelFieldNameRename,
            renames: renameRowList
        };
        args.push(renameProps);

        return args;
    }

    private _submitForm() {
        if (this._isAdvancedMode()) {
            const $elemEditor = this._getPanel().find(".advancedEditor");
            try {
                const advConfig = <DagNodeJupyterInputStruct>JSON.parse(this._editor.getValue());
                this._dataModel = this._convertAdvConfigToModel(advConfig);
            } catch(e) {
                StatusBox.show(e, $elemEditor);
                return;
            }
        } else {
            if (!this._runValidation()) {
                return;
            }
        }

        this._dagNode.setParam(this._dataModel.toDagInput());
        this.close(true);
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
                const advConfig = <DagNodeJupyterInputStruct>JSON.parse(this._editor.getValue());
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

    private _convertAdvConfigToModel(advConfig: DagNodeJupyterInputStruct) {
        const error = this._dagNode.validateParam(advConfig);
        if (error) {
            throw new Error(error.error);
        }

        const colMap = this._dataModel.getColumnMap();
        const model = this._mainModel.fromDagInput(colMap, advConfig);
        model.validateInputData();

        return model;
    }

}