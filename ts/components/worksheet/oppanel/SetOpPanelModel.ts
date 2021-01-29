class SetOpPanelModel {
    private dagNode: DagNodeSet;
    private dedup: boolean;
    private outputTableName: string;
    private event: Function;
    private colModel: ColAssignmentModel;
    private _cachedBasicModeParam: string;

    public constructor(dagNode: DagNodeSet, event: Function) {
        this.dagNode = dagNode;
        this.event = event;
        const params: DagNodeSetInputStruct = this.dagNode.getParam();
        this._initialize(params);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        dedup: boolean,
        subType: DagNodeSubType,
        result: ProgCol[],
        selected: ProgCol[][],
        candidate: ProgCol[][],
        all: ProgCol[][];
        outputTableName: string
    } {
        return $.extend({
            dedup: this.dedup,
            subType: this.dagNode.getSubType(),
            outputTableName: this.outputTableName
        }, this.colModel.getModel());
    }

    public setColModel(colModel): void {
        this.colModel = colModel;
    }

    public getColData() {
        const allCols = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(false, true);
        });
        return {
            allColSets: allCols,
            selectedColSets: this.dagNode.getParam().columns
        }
    }

    /**
     * @returns {number} get the number of lists in the model
     */
    public getNumList(): number {
        return this.colModel.getModel().all.length;
    }

    /**
     *
     * @param dedup {boolean} Specify shuld dedup rows or not
     */
    public setDedup(dedup: boolean) {
        this.dedup = dedup || false;
    }

    /**
     * Validate if the num of parent is valid,
     * @return {error: string} Return error string if invalid
     */
    public validateNodes(): {error: string} {
        if (this.colModel.getModel().all.length <= 1 &&
            this.dagNode.getSubType() !== DagNodeSubType.Union &&
            this.dedup === true
        ) {
            return {error: UnionTStr.OneTableToUnion2};
        } else {
            return null;
        }
    }

    /**
     * @return {object} Return error when no result col or col name is invalid
     */
    public validateResult(advancedMode: boolean = false): {index: number, error: string} {
        return this.colModel.validateResult(advancedMode);
    }

    /**
     * @return {object} Return error type is not match
     */
    public validateCast(): {index: number, error: string} {
        return this.colModel.validateCast();
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        try {
            const param = JSON.parse(paramStr);
            const error = this.dagNode.validateParam(param);
            this._initialize(param);
            if (error) {
                throw new Error(error.error);
            }
            return null;
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (!msg) {
                msg = "invalid configuration";
            }
            return {error: msg};
        }
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeSetInputStruct = this._getParam();
        this.dagNode.setParam(param);
    }

    public getParam(): DagNodeSetInputStruct {
        return this._getParam();
    }

    public switchMode(
        toAdvancedMode: boolean,
        editor: CodeMirror.EditorFromTextArea
    ): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeSetInputStruct = this._getParam();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            editor.setValue(paramStr);
        } else {
            try {
                const param: DagNodeSetInputStruct = <DagNodeSetInputStruct>JSON.parse(editor.getValue());
                if (JSON.stringify(param, null, 4) === this._cachedBasicModeParam) {
                    // advanced mode matches basic mode so go to basic mode
                    // regardless of errors
                } else {
                    const error = this.dagNode.validateParam(param);
                    if (error) {
                        return error;
                    }
                }
                this._initialize(param);
                this._update();
            } catch (e) {
                return {error: e};
            }
        }
        return null;
    }

    public restoreBasicModeParams(editor: CodeMirror.EditorFromTextArea) {
        editor.setValue(this._cachedBasicModeParam);
    }

    public refreshColumns(refreshInfo): void {
        const allCols = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(false, true);
        });
        const removedSets = [];
        if (allCols.length < this.colModel.getModel().all.length) {
            for (var i in refreshInfo.removeInfo.childIndices) {
                if (i === this.dagNode.getId()) {
                    removedSets.push(refreshInfo.removeInfo.childIndices[i]);
                }
            }
        }

        this.colModel.refreshColumns(allCols, removedSets);
    }

    private _initialize(param: DagNodeSetInputStruct) {
        this.dedup = param.dedup;
        this.outputTableName = param.outputTableName;
        if (this.colModel) {
            // colModel not set during the first time
            const allCols = this.dagNode.getParents().map((parentNode) => {
                return parentNode.getLineage().getColumns(false, true);
            });

            this.colModel.initialize(allCols, param.columns);
        }
    }

    private _getParam(): DagNodeSetInputStruct {
        return {
            dedup: this.dedup,
            columns: this.colModel.getParam().columns,
            outputTableName: this.outputTableName
        }
    }

    private _update(): void {
        this.colModel.update();
        if (this.event != null) {
            this.event();
        }
    }
}