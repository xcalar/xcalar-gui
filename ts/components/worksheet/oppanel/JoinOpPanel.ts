class JoinOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null;
    private _componentFirstStep: JoinOpPanelStep1 = null;
    private _componentSecondStep: JoinOpPanelStep2 = null;
    private _templateMgr = new OpPanelTemplateManager();
    protected _dataModel: JoinOpPanelModel = null;
    protected _dagNode: DagNodeJoin = null;
    private static _templateIDs = { navButton: 'navButton' };
    private static _templates = {
        'navButton':
            `<button class="btn btn-secondary submit {{cssType}} {{cssDisabled}}" type="button" (click)="onClick">{{btnText}}</button>`
    };

    public setup(): void {
        this._$elemPanel = $('#joinOpPanel');
        this._mainModel = JoinOpPanelModel;
        this._componentFirstStep = new JoinOpPanelStep1({
            container: this._$elemPanel
        });
        this._componentSecondStep = new JoinOpPanelStep2({
            container: this._$elemPanel
        });
        const navButtonId = JoinOpPanel._templateIDs.navButton;
        this._templateMgr.loadTemplateFromString(
            navButtonId,
            JoinOpPanel._templates[navButtonId]
        );
        super.setup(this._$elemPanel);
    }

    public show(
        dagNode: DagNodeJoin,
        options: { isNoCast?: boolean, exitCallback?: Function }
    ): void {

        const { isNoCast = true } = (options || {});
        this._dagNode = dagNode;
        // Setup data model
        this._dataModel = this._mainModel.fromDag(dagNode, {
            currentStep: 1,
            isAdvMode: false,
            isNoCast: isNoCast
        });
        if (this._dataModel.getColumnPairsLength() === 0) {
            this._dataModel.addColumnPair();
        }
        this._updateColumns();

        // Update UI according to the data model
        let error: string;
        try {
            this._updatePanelTitle(dagNode);
            this._updatePanelInstr(dagNode);
            this._updateUI();
        } catch (e) {
            error = e;
        }
        super.showPanel(null, options)
        .then(() => {
            this._setupColumnPicker(dagNode.getType());
            // handle error after we call showPanel so that the rest of the form
            // gets setup
            if (error) {
                this._startInAdvancedMode(error);
            } else if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
        });
    }

    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        this._dagNode = null;
        this._dataModel = null;
        this._cachedBasicModeParam = null;
    }

    // XXX TODO: this is a quick solution to update the header
    // better solution should not use JQuery but the React way
    private _updatePanelTitle(dagNode: DagNodeJoin): void {
        let header: string = dagNode.getDisplayNodeType();
        $("#joinOpPanel .opPanelHeader .title").text(header);
    }

    // XXX TODO: this is a quick solution to update the header
    // better solution should not use JQuery but the React way
    private _updatePanelInstr(dagNode: DagNodeJoin): void {
        let instr: string = "";
        switch (dagNode.getSubType()) {
            case DagNodeSubType.FilterJoin:
                instr = JoinTStr.FilterJoinInstr;
                break;
            case DagNodeSubType.LookupJoin:
                instr = JoinTStr.LookupJoinInstr;
                break;
            default:
                instr = JoinTStr.JoinInstr;
                break;
        }
        $("#joinOpPanel .joinInstr").text(instr);
    }

    protected _updateUI() {
        this._clearColumnPickerTarget();
        // Event handlers for the container panel
        this._$elemPanel.off();
        // Close icon & Cancel button
        this._$elemPanel.on(
            'click',
            '.close, .cancel',
            () => this.close()
        );

        // Child components
        this._componentFirstStep.updateUI({
            modelRef: this._dataModel,
            onDataChange: () => {
                this._updateUI();
            },
            setColumnPickerTarget: this._setColumnPickerTarget.bind(this)
        });
        let errorElement: HTMLElement;
        this._componentSecondStep.updateUI({
            modelRef: this._dataModel,
            onDataChange: () => {
                this._updateUI();
            },
            onError: (elem: HTMLElement) => {
                errorElement = elem;
            }
        });
        this._updateUINavButtons(() => errorElement);
    }

    protected _updateUINavButtons(getErrorElement: () => HTMLElement): void {
        const findXCElement = BaseOpPanel.findXCElement;

        const $bottomSection = findXCElement(this._$elemPanel, 'bottomSection');
        const $navButtons = findXCElement($bottomSection, 'navButtons');

        let elemNavButtons: NodeDefDOMElement[];
        if (this._dataModel.isAdvMode()) {
            elemNavButtons = this._buildAdvancedButtons();
        } else {
            const currentStep = this._dataModel.getCurrentStep();
            if (currentStep === 1) {
                elemNavButtons = this._buildJoinClauseNavButtons();
            } else if (currentStep === 2) {
                elemNavButtons = this._buildRenameNavButtons(getErrorElement);
            } else {
                // Should never happen, possibly a bug
                console.error(`Invalid currentStep value(${currentStep})`);
            }
        }
        this._templateMgr.updateDOM(<any>$navButtons[0], elemNavButtons);

    }

    private _buildAdvancedButtons(): NodeDefDOMElement[] {
        let elements: NodeDefDOMElement[] = [];

        // Save button
        elements = elements.concat(this._buildNavButton({
            type: 'submit',
            text: CommonTxtTstr.Save,
            onClick: () => {
                const $elemEditor = this._$elemPanel.find(".advancedEditor");
                try {
                    const model = this._convertAdvConfigToModel(this._dataModel);
                    this._validateJoinClauses(model);
                    this._validateRenames(model);
                    this._submitForm(model);
                } catch(e) {
                    StatusBox.show(this._getErrorMessage(e), $elemEditor);
                    return false;
                }
            }
        }));


        // preview button
        elements = elements.concat(this._buildNavButton({
            type: 'preview',
            disabled: false,
            text: CommonTxtTstr.Preview,
            onClick: () => {
                const $elemEditor = this._$elemPanel.find(".advancedEditor");
                try {
                    const model = this._convertAdvConfigToModel(this._dataModel);
                    this._validateJoinClauses(model);
                    this._validateRenames(model);
                    this._preview(this._dataModel);
                } catch(e) {
                    // Focus to the error message
                    StatusBox.show(this._getErrorMessage(e), $elemEditor);
                }
            }
        }));

        return elements;
    }

    private _buildRenameNavButtons(getErrorElement: () => HTMLElement): NodeDefDOMElement[] {
        let elements: NodeDefDOMElement[] = [];

        // Save button
        elements = elements.concat(this._buildNavButton({
            type: 'submit',
            // disabled: !this._isEnableSave(),
            disabled: false,
            text: CommonTxtTstr.Save,
            onClick: () => {
                if (this._isEnableSave()) {
                    this._submitForm(this._dataModel);
                } else {
                    // Focus to the error message
                    const errElement = getErrorElement();
                    if (errElement != null) {
                        $(errElement).scrollintoview({duration: 0});
                    }
                }
            }
        }));

        // preview button
        elements = elements.concat(this._buildNavButton({
            type: 'preview',
            disabled: false,
            text: CommonTxtTstr.Preview,
            onClick: () => {
                if (this._isEnableSave()) {
                    this._preview(this._dataModel);
                } else {
                    // Focus to the error message
                    const errElement = getErrorElement();
                    if (errElement != null) {
                        $(errElement).scrollintoview({duration: 0});
                    }
                }
            }
        }));

        // Back button
        elements = elements.concat(this._buildNavButton({
            type: 'back',
            text: CommonTxtTstr.Back,
            onClick: () => {
                this._dataModel.setCurrentStep(1);
                this._updateUI();
            }
        }));

        return elements;
    }

    private _buildJoinClauseNavButtons(): NodeDefDOMElement[] {
        const elements = this._buildNavButton({
            type: 'next',
            disabled: !this._isEnableNextToRename(),
            text: CommonTxtTstr.Next,
            onClick: () => {
                this._dataModel.setCurrentStep(2);
                this._updateUI();
            }
        });
        return elements;
    }

    private _buildNavButton(props: {
        type: string, disabled?: boolean, text: string, onClick: () => void
    }): NodeDefDOMElement[] {
        if (props == null) {
            return [];
        }

        const { type, disabled = false, text, onClick } = props;
        return this._templateMgr.createElements(JoinOpPanel._templateIDs.navButton, {
            cssType: `btn-${type}`,
            cssDisabled: disabled ? 'btn-disabled': '',
            btnText: text,
            onClick: () => onClick()
        });
    }

    protected _submitForm(model: JoinOpPanelModel) {
        if (this._dagNode != null) {
            let param: DagNodeJoinInputStruct = model.toDag();
            const aggs: string[] = DagNode.getAggsFromEvalStrs([param]);
            this._dagNode.setAggregates(aggs);
            this._dagNode.setParam(
                xcHelper.deepCopy(param)
            );
            this.close(true);
        }
    }

    protected _preview(model: JoinOpPanelModel) {
        if (this._dagNode != null) {
            let param: DagNodeJoinInputStruct = model.toDag();
            super._preview(param);
        }
    }

    private _isEnableNextToRename() {
        try {
            this._validateJoinClauses(this._dataModel);
            return true;
        } catch(e) {
            return false;
        }
    }

    private _isEnableSave() {
        try {
            this._validateJoinClauses(this._dataModel);
            this._validateRenames(this._dataModel);
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        this._dataModel.setAdvMode(toAdvancedMode);
        if (toAdvancedMode) {
            const param: DagNodeJoinInputStruct = this._dataModel.toDag();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._updateUI();
        } else {
            try {
                const newModel = this._convertAdvConfigToModel(this._dataModel);
                if (newModel.getColumnPairsLength() === 0) {
                    newModel.addColumnPair();
                }
                this._dataModel = newModel;
                this._updateUI();
            } catch (e) {
                return {error: this._getErrorMessage(e)};
            }
        }
        return null;
    }

    /**
     * Convert config string to data model, throw JoinOpError/JS exception if any errors
     */
    private _convertAdvConfigToModel(oldModel: JoinOpPanelModel) {
        const dagInput: DagNodeJoinInputStruct = <DagNodeJoinInputStruct>JSON.parse(this._editor.getValue());

        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(dagInput);
            if (error) {
                throw new Error(error.error);
            }
        }

        const {
            left: leftCols,
            right: rightCols
        } = this._mainModel.getColumnsFromDag(this._dagNode);
        const {
            left: leftTableName,
            right: rightTableName
        } = this._mainModel.getPreviewTableNamesFromDag(this._dagNode);
        const newModel = this._mainModel.fromDagInput(
            leftCols, rightCols, dagInput, leftTableName, rightTableName,
            {
                currentStep: oldModel.getCurrentStep(),
                isAdvMode: oldModel.isAdvMode(),
                isNoCast: oldModel.isNoCast(),
                isFixedType: oldModel.isFixedType()
            }
        );

        if (newModel.isFixedType()
            && newModel.getJoinType() !== oldModel.getJoinType()
        ) {
            // Cannot change sub category operator's join type
            throw new Error(JoinOpError.InvalidJoinType);
        }

        return newModel;
    }

    /**
     * Validate data model, and throw JoinOpError if any errors
     * @param dataModel
     */
    private _validateJoinClauses(dataModel: JoinOpPanelModel): void {
        if (!dataModel.isCrossJoin()) {
            if (dataModel.getColumnPairsLength() === 0) {
                throw new Error(JoinOpError.InvalidJoinClause);
            }
            for (const pair of dataModel.getColumnPairs()) {
                // if (this._dataModel.isColumnDetached(pair.leftName, true)) {
                //     return false;
                // }
                // if (this._dataModel.isColumnDetached(pair.rightName, false)) {
                //     return false;
                // }
                if (dataModel.isCastNeed(pair)) {
                    throw new Error(JoinOpError.NeedTypeCast);
                }
            }
        }
        if (!dataModel.isValidEvalString()) {
            throw new Error(JoinOpError.InvalidEvalString);
        }
    }

    /**
     * Validate data model, and throw JoinOpError if any errors
     * @param dataModel
     */
    private _validateRenames(dataModel: JoinOpPanelModel): void {
        const {
            columnLeft: columnCollisionLeft, prefixLeft: prefixCollisionLeft,
            columnRight: columnCollisionRight, prefixRight: prefixCollisionRight
        } = dataModel.getCollisionNames();

        if (columnCollisionLeft.size > 0 || columnCollisionRight.size > 0) {
            throw new Error(JoinOpError.ColumnNameConflict);
        }
        if (prefixCollisionLeft.size > 0 || prefixCollisionRight.size > 0) {
            throw new Error(JoinOpError.PrefixConflict);
        }

        // Validate prefix name
        const { left: prefixNameLeft = [], right: prefixNameRight = [] } = dataModel.getResolvedNames(true);
        for (const name of prefixNameLeft) {
            const error = xcHelper.validatePrefixName(name.dest || name.source);
            if (error != null) {
                throw new Error(error);
            }
        }
        for (const name of prefixNameRight) {
            const error = xcHelper.validatePrefixName(name.dest || name.source);
            if (error != null) {
                throw new Error(error);
            }
        }
        // Validate derived name
        const { left: colNameLeft = [], right: colNameRight = [] } = dataModel.getResolvedNames(false);
        for (const name of colNameLeft) {
            const error = xcHelper.validateColName(name.dest || name.source);
            if (error != null) {
                throw new Error(error);
            }
        }
        for (const name of colNameRight) {
            const error = xcHelper.validateColName(name.dest || name.source);
            if (error != null) {
                throw new Error(error);
            }
        }
    }

    private _getErrorMessage(e: Error): string {
        if (e == null || e.message == null) {
            return '';
        }

        switch (e.message) {
            case JoinOpError.ColumnTypeLenMismatch:
            case JoinOpError.InvalidJoinClause:
                return JoinTStr.InvalidClause;
            case JoinOpError.ColumnNameConflict:
                return ErrTStr.ColumnConflict2;
            case JoinOpError.InvalidEvalString:
                return ErrTStr.InvalidEvalStr;
            case JoinOpError.NeedTypeCast:
                return JoinTStr.TypeMistch;
            case JoinOpError.PrefixConflict:
                return ErrTStr.PrefixConflict;
            case JoinOpError.InvalidJoinType:
                return JoinTStr.InvalidJoinType;
            default:
                return e.message;
        }
    }
}