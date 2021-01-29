class DatasetColRenamePanel {
    private $view: JQuery;
    protected _dagNode: DagNodeDataset;
    private sourceNode: DagNodeDataset;
    private colRenameView;
    private viewOptions;
    private isOpen = false;
    private noSourceCols: boolean = false;
    private static _instance;
    private _model;

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    constructor() {
        this.$view = $("#datasetOpColumnAssignment");

        this.colRenameView = new ColAssignmentView("#datasetOpColumnAssignment",
            {
                labels: [OpFormTStr.PreviousColumns, OpFormTStr.NewColumns],
                preventAutoRemoveCol: true,
                resultColPosition: -1,
                candidateText: "Columns in this section will not be reassigned to a new name." +
                " To match them with a new name, select the column from the list above.",
                candidateTitle: `${OpFormTStr.NotRenamed}:`
            });
        this._modifyColRenameSection();
        this._registerHandlers();
    }

    public show(dagNode, oldColumns, options): void {
        this._dagNode = dagNode;
        this.isOpen = true;
        this.$view.removeClass("xc-hidden");
        this.sourceNode = dagNode;
        this.viewOptions = options || {};

        const newColumns: ProgCol[] = dagNode.getLineage().getColumns(false, true);
        this.noSourceCols = newColumns.length === 0;

        // if no columns, allow the ability to add candidate columns
        this.colRenameView.toggleCandidateSectionAdd(this.noSourceCols);

        if (this.noSourceCols) {
            this.$view.addClass("noSourceCols");
        } else {
            this.$view.removeClass("noSourceCols");
        }

        const selectedCols = [];
        newColumns.forEach(function(col: ProgCol) {
            selectedCols.push({
                sourceColumn: null,
                destColumn: col.getBackColName(),
                columnType: col.getType(),
                cast: false
            });
        });

        // will have at least 1 row by default
        if (!selectedCols.length) {
            selectedCols.push({
                sourceColumn: null,
                destColumn: "",
                columnType: null,
                cast: false
            });
        }

        this._model = this.colRenameView.show([oldColumns], [selectedCols], {
            lockResultInputs: !this.noSourceCols,
            addRowBtn: this.noSourceCols,
            showCast: this.noSourceCols,
            validateType: this.noSourceCols
        });
        this._modifyColRenameSection(this.noSourceCols);
        this._autoResizeView(false);
    }

    public close(): void {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        this.$view.addClass("xc-hidden");
        this._autoResizeView(true);
        this._model = null;
        if (typeof this.viewOptions.onClose === "function") {
            this.viewOptions.onClose();
        }
    }

    private _modifyColRenameSection(allowCandidateAdd?: boolean): void {
        this.colRenameView.toggleCandidateSectionAdd(allowCandidateAdd);
        this.$view.find(".tableSection .header .text")
                  .text(OpFormTStr.SelectColRename);
    }

    private _registerHandlers(): void {
        this.$view.on("click", ".confirmRename", () => {
            this._submit();
        });
    }

    private _submit() {
        const param = this.colRenameView.getParam();
        const renameMap = {
            columns: {},
            prefixes: {}
        };

        param.columns[0].forEach((colInfo) => {
            if (!colInfo.sourceColumn) return;
            renameMap.columns[colInfo.sourceColumn] = colInfo.destColumn;
        });

        const keys = Object.keys(renameMap.columns);
        let oldPrefix;
        let newPrefix;
        const model = this.colRenameView.getModel();
        if (keys.length) {
            oldPrefix = xcHelper.parsePrefixColName(keys[0]).prefix;
            newPrefix = xcHelper.parsePrefixColName(renameMap.columns[keys[0]]).prefix;
            renameMap.prefixes[oldPrefix] = newPrefix;
        } else {
            if (model.all[0].length && model.result[0].length) {
                oldPrefix = model.all[0][0].getPrefix();
                newPrefix = model.result[0].getPrefix();
                if (oldPrefix !== newPrefix) {
                    renameMap.prefixes[oldPrefix] = newPrefix;
                }
            }
        }

        // if no panel opened without sourcecols, assign new ones to the dagNode
        if (this.noSourceCols) {
            if (!this._validateNewColNames()) {
                return false;
            }
            const prefix = this._dagNode.getParam().prefix;
            const schema: ColSchema[] = model.result.map((progCol) => {
                progCol.prefix = prefix;
                return {
                    name: progCol.getBackColName(),
                    type: progCol.getType()
                };
            });

            this._dagNode.setSchema(schema, true);
        }

        if (Object.keys(renameMap.prefixes).length) {
            const dagGraph = DagViewManager.Instance.getActiveDag();
            dagGraph.applyColumnMapping(this.sourceNode.getId(), renameMap);
        }
        this.close();
    }

    private _validateNewColNames(): boolean {
        // validate result column
        const $resultInputs = this.$view.find(".resultInput");
        const resultErr: {index: number, error: string} = this._model.validateResult();
        if (resultErr != null) {
            if (resultErr.index == null) {
                StatusBox.show(resultErr.error, this.$view.find(".resultSection"));
            } else {
                StatusBox.show(resultErr.error, $resultInputs.eq(resultErr.index), true);
            }

            return false;
        }
        return true;
    }

    private _autoResizeView(reset: boolean) {
        const $panel: JQuery = this.$view;
        const sectionW: number = parseFloat($panel.find(".lists").eq(0).css("min-width")) + 5;
        const minWidth: number = MainMenu.defaultWidth;
        return;
        if (reset) {
            // MainMenu.resize(0);
        } else {
            let width: number = minWidth + sectionW;
            width = Math.min(width, $("#sqlWorkSpacePanel").width() * 0.5);
            // MainMenu.resize(width);
        }
    }
}