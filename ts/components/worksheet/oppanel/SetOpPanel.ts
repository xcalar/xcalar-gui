class SetOpPanel extends BaseOpPanel {
    private setOpData: SetOpPanelModel;
    public static d;
    private colAssignmentSection: ColAssignmentView;
    protected _dagNode: DagNodeSet = null;

    public constructor() {
        super();
        this._setup();
    }
    /**
     *
     * @param dagNode {DagNodeSet} show the view based on the set type node
     */
    public show(dagNode: DagNodeSet, options?): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._dagNode = dagNode;

        super.showPanel(null, options)
        .then(() => {
            let hasError;
            try {
                this._initialize(dagNode);
                this._updateColumns();
                if (gMinModeOn) {
                    this._autoResizeView(false);
                } else {
                    setTimeout(() => {
                        this._autoResizeView(false);
                    }, 1);
                }
            } catch (e) {
                hasError = true;
                this._startInAdvancedMode(e);
            }
            if (!hasError && BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }

            this._formHelper.setup({});
            deferred.resolve();
        })
        .fail(() => {
            deferred.reject();
        });
        return deferred.promise();
    }

    /**
     * Close the view
     */
    public close(isSubmit?): void {
        if (!super.hidePanel(isSubmit)) {
            return;
        }

        StatusBox.forceHide(); // hides any error boxes;
        xcTooltip.hideAll();
        this._autoResizeView(true);
    }

    public refreshColumns(info): void {
        this.setOpData.refreshColumns(info);
        this._updateColumns();
    }

    protected _reset(): void {
        super._reset();
        const $panel = this._getPanel();
        $panel.find(".listSection").empty();
        $panel.find(".searchArea input").val("");
        $panel.find(".highlight").removeClass("highlight");
    }

    protected _updateColumns(): ProgCol[] {
        this.allColumns = [];
        const seen = {};
        if (!this.setOpData) {
            // baseOpPanel calls before initialize
            return;
        }
        this.setOpData.getModel().all.forEach(colSet => {
            colSet.forEach(progCol => {
                if (!seen[progCol.getBackColName()]) {
                    seen[progCol.getBackColName()] = true;
                    this.allColumns.push(progCol);
                }
            });
        });
        return this.allColumns;
    }

    private _setup(): void {
        super.setup($("#setOpPanel"));
        this._addEventListeners();
        const selector: string = "#setOpPanel .columnAssignmentSection";
        this.colAssignmentSection = new ColAssignmentView(selector, {
            autoDetect: true,
            showActions: true,
            allLabelsTip: "The connector identification label between the input data table and the Set Operator.",
            candidateTitle: UnionTStr.CandidateTitle,
            candidateTip: "Displays the columns that are no longer required in the result."
        });
    }

    private _initialize(dagNode: DagNodeSet): void {
        const event: Function = () => {};
        this.setOpData = new SetOpPanelModel(dagNode, event);
        const colInfo = this.setOpData.getColData();
        const colModel = this.colAssignmentSection.show(colInfo.allColSets,
        colInfo.selectedColSets);
        this.setOpData.setColModel(colModel);
        const model = this.setOpData.getModel();
        this._selectDedup(model.dedup);
        this._selectType(model.subType);
        this._updateInstr(model.subType);
    }

    private _getDedupSection(): JQuery {
        return this._getPanel().find(".dedupSection");
    }

    private _addEventListeners(): void {
        const $panel = this._getPanel();
        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".submit", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        // change dedup option
        xcUIHelper.optionButtonEvent(this._getDedupSection(), (option) => {
            const dedup: boolean = (option === "no") ? true : false;
            this.setOpData.setDedup(dedup);
        });

        $panel.find(".btn.preview").on("click", () => this._preview());
    }

    private _selectDedup(dedup): void {
        // it's asking include dedup rows or not
        const option: string = dedup? "no" : "yes";
        this._getDedupSection().find(".radioButton." + option).click();
    }

    private _selectType(subType: DagNodeSubType): void {
        const typeMap = {};
        typeMap[DagNodeSubType.Union] = OpPanelTStr.Union;
        typeMap[DagNodeSubType.Intersect] = OpPanelTStr.Intersect;
        typeMap[DagNodeSubType.Except] = OpPanelTStr.Except;
        this._getPanel().find(".modeList").text(typeMap[subType]);
    }

    private _updateInstr(subType: DagNodeSubType): void {
        const typeMap = {};
        typeMap[DagNodeSubType.Union] = SetOpTStr.UnionInstr;
        typeMap[DagNodeSubType.Intersect] = SetOpTStr.IntersectInstr;
        typeMap[DagNodeSubType.Except] = SetOpTStr.ExceptInstr;
        this._getPanel().find(".setInstr").text(typeMap[subType]);
    }

    private _showCast(colIndex: number) {
        const $panel: JQuery = this._getPanel();
        $panel.find('.resultCol[data-index="' + colIndex + '"]').addClass("cast");
        $panel.find('.columnList[data-index="' + colIndex + '"]').addClass("cast");
    }

    protected _submitForm(): void {
        if (!this._validate()) {
            return;
        }

        this.setOpData.submit();
        this.close(true);
    }


    protected _preview() {
        if (this._validate()) {
            super._preview(this.setOpData.getParam());
        }
    }


    private _validate(): boolean {
        const $panel: JQuery = this._getPanel();
        if (this._isAdvancedMode()) {
            const advancedErr: {error: string} = this.setOpData.validateAdvancedMode(this._editor.getValue());
            if (advancedErr != null) {
                StatusBox.show(advancedErr.error, $panel.find(".advancedEditor"));
                return false;
            } else {
                return true;
            }
        }
        // validate more than one parent nodes
        const numNodeErr: {error: string} = this.setOpData.validateNodes();
        if (numNodeErr != null) {
            StatusBox.show(numNodeErr.error, $panel.find(".tableSection"));
            return false;
        }

        // validate result column
        const $resultInputs = $panel.find(".resultInput");
        const resultErr: {index: number, error: string} = this.setOpData.validateResult();
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, $panel.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }

        // validate type selection
        const typeValids: any[] = [];
        $panel.find(".resultCol.cast .typeList .text").each(function() {
            typeValids.push({$ele: $(this)});
        });
        if (!xcHelper.validate(typeValids)) {
            return false;
        }

        // validate type cast
        const castValid: {index: number, error: string} = this.setOpData.validateCast();
        if (castValid != null) {
            const index: number = castValid.index;
            const $resultCol: JQuery = $panel.find('.resultCol[data-index="' + index + '"]');
            this._showCast(index);
            StatusBox.show(UnionTStr.Cast, $resultCol.find(".typeList"));
            return false;
        }

        return true;
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.setOpData.switchMode(toAdvancedMode, this._editor);
    }

    protected _restoreBasicModeParams() {
        return this.setOpData.restoreBasicModeParams(this._editor);
    }

    protected _autoResizeView(reset: boolean) {
        const $panel: JQuery = this._getPanel();
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = MainMenu.defaultWidth;
        return;
        if (reset) {
            // MainMenu.resize(0);
        } else {
            const numList: number = this.setOpData.getNumList();
            let width: number = minWidth + Math.max(0, numList - 1) * sectionW;
            width = Math.min(width, $("#sqlWorkSpacePanel").width() * 0.5);
            // MainMenu.resize(width);
        }
    }
}