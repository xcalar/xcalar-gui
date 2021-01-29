class ColAssignmentView {
    private modelData: ColAssignmentModel;
    private _panelSelector;
    private options;
    private instanceOptions;

    public constructor(panelSelector, options?) {
        this._panelSelector = panelSelector;
        this.options = options || {};
        this.instanceOptions = {};
        this._setup();
    }

    private _getView() {
        return $(this._panelSelector);
    }
    /**
     *
     * @param dagNode {DagNodeSet} show the view based on the set type node
     */
    public show(
        allColSets: ProgCol[][],
        selectedColSets: {
            sourceColumn: string,
            destColumn: string,
            columnType: ColumnType,
            cast: boolean
        }[][],
        options?
    ): ColAssignmentModel {
        this._reset();
        const event: Function = () => { this._render() };
        options = options || {};
        this.instanceOptions = $.extend({}, this.options, options);
        this.modelData = new ColAssignmentModel(allColSets, selectedColSets,
            event, this.instanceOptions);
        this._render();
        return this.modelData;
    }

    public getModel() {
        return this.modelData.getModel();
    }

    public getParam(): {columns: {
        sourceColumn: string,
        destColumn: string,
        columnType: ColumnType,
        cast: boolean
    }[][]} {
        return this.modelData.getParam();
    }

    private _setup(): void {
        this._addEventListeners();
        if (this.options.autoDetect) {
            const html: HTML =
                '<div class="detect checkboxSection">' +
                    '<div class="text">' +
                        UnionTStr.Detect +
                    '</div>' +
                    '<div class="checkbox checked">' +
                        '<i class="icon xi-ckbox-empty"></i>' +
                        '<i class="icon xi-ckbox-selected"></i>' +
                    '</div>' +
                '</div>';
            this._getView().find(".tableSection .header").append(html);
        }
    }

    protected _reset(): void {
        const $view = this._getView();
        $view.find(".listSection").empty();
        $view.find(".searchArea input").val("");
        $view.find(".highlight").removeClass("highlight");
    }

    private _addEventAddAll(): void {
        if (!this.options.showActions) {
            return;
        }
        const $section = this._getView();
        $section.on("click.candidateSection", ".candidateSection .actionSection .action-icon", (event) => {
            const $iconObj = $(event.target).closest(".action-icon");
            const listIndex: number = this._getListIndex($iconObj);
            const autoDetect: boolean = this.options.autoDetect &&
                this._getView().find(".tableSection .detect .checkbox").hasClass("checked");
            this.modelData.addAllColumns(listIndex, autoDetect);
            xcTooltip.hideAll();
        });
    }

    private _addEventListeners(): void {
        const $section = this._getView();

        $section.on("click.candidateSection", ".candidateSection .inputCol", (event) => {
            const $col: JQuery = $(event.target).closest(".inputCol");
            const listIndex: number = this._getListIndex($col);
            const colIndex: number = this._getColIndex($col);
            const autoDetect: boolean = this.options.autoDetect &&
            this._getView().find(".tableSection .detect .checkbox").hasClass("checked");
            this.modelData.addColumn(listIndex, colIndex, autoDetect);
            xcTooltip.hideAll();
        });

        this._addEventAddAll();

        if (this.options.showActions) {
            $section.on('click', '.tableSection .action-icon.remove', (event) => {
                const $iconObj = $(event.target).closest(".action-icon");
                const listIndex: number = this._getListIndex($iconObj);
                this.modelData.removeAllColumnsInList(listIndex);
                xcTooltip.hideAll();
            });
        }
        // Keep it, in case we enable removeAll for resultant columns in the future
        // if (this.options.showActions) {
        //     $section.on("click", ".resultSection .lists.newTable  .action-icon", (event) => {
        //         this.modelData.removeAllColumns();
        //         xcTooltip.hideAll();
        //     });
        // }

        $section.on("click", ".removeColInRow", (event) => {
            const $col: JQuery = $(event.target).closest(".resultCol");
            const colIndex: number = this._getColIndex($col);
            this.modelData.removeColumnForAll(colIndex);
        });

        $section.on("input", ".searchArea input", (event) => {
            if (!$section.find(".searchArea input").is(":visible")) return; // ENG-8642
            const $input: JQuery = $(event.target);
            const keyword: string = $input.val();
            const listIndex: number = this._getListIndex($input);
            this._searchColumn(keyword, listIndex);
        });

        $section.on("input", ".resultInput", (event) => {
            const $input: JQuery = $(event.target);
            if (!$input.is(":visible")) return; // ENG-8642
            const colIndex = this._getColIndex($input.closest(".resultCol"));
            this.modelData.setResult(colIndex, $input.val().trim(), null);
        });

        $section.on("click", ".addRowBtn", () => {
            this.modelData.addBlankRow();
        });

        $section.on("click", ".tableSection .detect", (event) => {
            $(event.currentTarget).find(".checkbox").toggleClass("checked");
        });
    }

    public toggleCandidateSectionAdd(on?: boolean): void {
        const $section = this._getView();
        $section.off("click.candidateSection");
        if (on) {
            $section.on("click.candidateSection", ".candidateSection .inputCol", (event) => {
                const $col: JQuery = $(event.target).closest(".inputCol");
                const listIndex: number = this._getListIndex($col);
                const colIndex: number = this._getColIndex($col);
                this.modelData.addColumn(listIndex, colIndex);
                xcTooltip.hideAll();
            });
            this._addEventAddAll();
            $section.removeClass("candidateAddDisabled");
        } else {
            $section.addClass("candidateAddDisabled");
        }
    }

    private _getListIndex($ele: JQuery): number {
        const index: string = $ele.closest(".lists").data("index");
        return Number(index);
    }

    private _getColIndex($el: JQuery): number {
        return Number($el.data("index"));
    }

    private _render(): void {
        const $view: JQuery = this._getView();
        const $nodeList: JQuery = $view.find(".tableSection .listSection");
        const $result: JQuery = $view.find(".resultSection .listSection");
        const $candidate: JQuery = $view.find(".candidateSection .listSection");
        const $candidateAction: JQuery = $view.find(".candidateSection .actionSection");
        const candidateHint = this.instanceOptions.candidateText || UnionTStr.CandidateHint;
        const candidateTitle = this.instanceOptions.candidateTitle;
        const model = this.modelData.getModel();
        let result = model.result;
        let selected = model.selected;
        let candidates = model.candidate;

        let nodeListHTML: string = "";
        let resultHTML: string = "";
        let candidateHTML: string = "";
        const candidateActionProp = {
            title: candidateTitle,
            actionList: [],
            tip: this.instanceOptions.candidateTip
        };
        let nodeListHeader: string = '<div class="lists newTable"></div>';
        const nodeListActionProp = {
            actionList: []
        };
        let resultCol: string = this._getResultList(result, selected);
        let candidateTextCol: string = '<div class="lists newTable">' +
                                            candidateHint +
                                        '</div>';

        // model.selected.forEach((selectedCols, index) => {
        selected.forEach((selectedCols, index) => {
            // nodeListHTML += this._getNodeList(index);
            resultHTML += this._getSelectedList(selectedCols, index);
            const candidateCols = candidates[index] || [];
            candidateHTML += this._getCandidateList(candidateCols, index);
            if (this.options.showActions) {
                candidateActionProp.actionList.push({
                    isAdd: true,
                    isDisabled: candidateCols.length === 0,
                    isShowIcon: true
                });
            }
            nodeListActionProp.actionList.push({
                isAdd: false,
                isDisabled: selectedCols.filter((col) => (col != null)).length === 0,
                isShowIcon: this.options.showActions,
                label: this._getNodeLabel(index),
                tip: this._getNodeLabelTip(index),
                // tip: "The connector identification label between the input data table and the Set Operator."
            });
        });
        nodeListHTML += this._getActionSection(nodeListActionProp);

        if (this.instanceOptions.resultColPosition === -1) {
            nodeListHTML += nodeListHeader;
            resultHTML += resultCol;
            candidateHTML += candidateTextCol;
        } else {
            nodeListHTML = nodeListHeader + nodeListHTML;
            resultHTML = resultCol + resultHTML;
            candidateHTML = candidateTextCol + candidateHTML;
        }

        $view.find(".addRowBtn").remove();
        if (this.instanceOptions.addRowBtn) {
            const btnHTML =  '<button class="addRowBtn btn btn-rounded">' +
                            '<i class="icon xi-plus fa-12"></i>Add Column</button>';
            $view.find(".candidateSection").prepend(btnHTML);
        }

        $nodeList.html(nodeListHTML);
        $result.html(resultHTML);
        $candidate.html(candidateHTML);
        $candidateAction.html(this._getActionSection(candidateActionProp));

        this._setupDropdownList();

        result.forEach((col, index) => {
            if (this.instanceOptions.showCast || col.type != null) {
                this._showCast(index);
            }
        });
    }

    private _getNodeLabel(index: number): string {
        let label;
        if (this.instanceOptions.labels && this.instanceOptions.labels[index] != null) {
            label = this.instanceOptions.labels[index];
        } else {
            label = "#" + (index + 1);
        }
        return label;
    }

    private _getNodeLabelTip(index: number): string {
        let tip = "";
        if (this.instanceOptions.labelTips && this.instanceOptions.labelTips[index] != null) {
            tip = this.instanceOptions.labelTips[index];
        } else if (this.instanceOptions.allLabelsTip) {
            tip = this.instanceOptions.allLabelsTip;
        }
        return tip;
    }


    private _getResultList(resultCols: ProgCol[], selectedCols): string {
        let resultColHTML: string = "";
        const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes(false);
        const lis: HTML = validTypes.map((colType) => `<li>${colType}</li>`).join("");

        resultCols.forEach((resultCol, listIndex) => {
            let colName: string = resultCol.getBackColName();
            colName = xcStringHelper.escapeHTMLSpecialChar(colName);
            const cast: string = resultCol.type || "";
            const selectedCol = selectedCols[0][listIndex];
            let listClasses = "";
            if (selectedCol && selectedCol.getType() === resultCol.type) {
                listClasses += " originalType";
            }
            let resultInputAttr = "";
            if (this.instanceOptions.lockResultInputs) {
                resultInputAttr = " disabled";
            }
            resultColHTML +=
                '<div class="resultCol"' +
                ' data-index="' + listIndex + '">' +
                    '<input class="resultInput" type="text"' +
                    ' value="' + colName + '"' +
                    ' placeholder="' + UnionTStr.NewColName + '" spellcheck="false" ' +
                    resultInputAttr + '>' +
                    '<i class="removeColInRow icon xi-close-no-circle' +
                    ' xc-action fa-10"></i>' +
                    '<div class="dropDownList typeList' + listClasses + '">' +
                        '<input class="text" value="' + cast + '"' +
                        ' placeholder="' + UnionTStr.ChooseType + '" disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul>' +
                                lis +
                            '</ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });

        // const actionProp = this.options.showActions
        //     ? { isActionDisabled: resultCols.length === 0 }
        //     : null;
        const actionProp = null; // Keep it here, in case we enable the remove all for result columns in the future
        const titleHTML = this._getResultTitle(actionProp);

        return '<div class="lists newTable" ' + xcTooltip.Attrs +
                ' data-title="A list that contains the Xcalar supported data types.">' +
                    titleHTML +
                    resultColHTML +
                '</div>';
    }

    private _getResultTitle(actionProp: {
        isActionDisabled?: boolean,
        actionTooltip?: string
    }): string {
        const { isActionDisabled = false, actionTooltip = UnionTStr.RemoveAllTooltip } = actionProp || {};
        const cssActionDisabled = isActionDisabled ?  'xc-disabled' : '';

        const actionHTML = actionProp == null
            ? ''
            : `<div class="action-icon ${cssActionDisabled}" data-toggle="tooltip" data-container="body" data-placement="auto top" data-original-title="${actionTooltip}">
                <i class="icon xi-select-none fa-14"></i>
                </div>`;
        return `<div class="flexContainer">
            <div class="searchArea placeholder"></div>${actionHTML}
            </div>`;
    }

    private _getSelectedList(selectedCols: ProgCol[], index: number): string {
        let lists: string = '<div class="searchArea">' +
                                '<input type="text" spellcheck="false"' +
                                'placeholder="' + UnionTStr.SearchCol + '">' +
                                '<i class="icon xi-search fa-13" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-original-title="' + TooltipTStr.UnionSearch +
                                '"></i>' +
                            '</div>';

        selectedCols.forEach(function(selectedCol, colIndex) {
            let innerHTML: string = "";
            if (selectedCol != null) {
                const colName: string = xcStringHelper.escapeHTMLSpecialChar(selectedCol.getBackColName());
                innerHTML = '<div class="text">' +
                                BaseOpPanel.craeteColumnListHTML(selectedCol.getType(), colName) +
                            '</div>';
            } else {
                innerHTML = '<div class="text"></div>';
            }
            // add dropdown list
            innerHTML += '<div class="iconWrapper down xc-action">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<div class="list">' +
                            '<ul></ul>' +
                            '<div class="scrollArea top">' +
                                '<i class="arrow icon xi-arrow-up"></i>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                                '<i class="arrow icon xi-arrow-down"></i>' +
                            '</div>' +
                        '</div>';

            lists += '<div class="inputCol dropDownList columnList" ' +
                     'data-index="' + colIndex + '">' +
                        innerHTML +
                    '</div>';
        });

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    private _getCandidateList(
        candidateCols: ProgCol[],
        index: number
    ): string {
        candidateCols = candidateCols || [];
        const lists: string = candidateCols.map((col, index) => {
            const colName: string = xcStringHelper.escapeHTMLSpecialChar(col.getBackColName());
            return '<div class="inputCol" data-index="' + index + '">' +
                        '<i class="addCol icon xi-plus"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto top"' +
                        ' data-title="' + UnionTStr.AddCol + '"' +
                        '></i>' +
                        BaseOpPanel.craeteColumnListHTML(col.getType(), colName) +
                    '</div>';
        }).join("");

        return ('<div class="lists" data-index="' + index + '">' +
                    lists +
                '</div>');
    }

    private _getActionSection(actionProp: {
        title?: string,
        actionList?: {
            isAdd: boolean,
            isDisabled: boolean,
            isShowIcon?: boolean,
            label?: string,
            tip?: string
        } [],
        tip?: string
    }): string {
        const { title, actionList = [], tip } = actionProp;
        let tipIcon = "";
        if (tip) {
            tipIcon = ` <i class="qMark icon xi-unknown"
            data-toggle="tooltip"
            data-container="body"
            data-placement="auto top"
            data-title="${tip}">
            </i>`
        }
        const titleHTML = title != null
            ? `<div class="lists newTable">
                <span class="text">${title}${tipIcon}</span>
                </div>`
            : '';
        const actionHTML = actionList.map((prop, index) => {
            const { isAdd = false, isDisabled = true, label = '', isShowIcon = false, tip = "" } = prop || {};
            const cssActionIcon = isAdd ? 'xi-select-all' : 'xi-select-none';
            const cssActionDisabled = isDisabled ?  'xc-disabled' : '';
            const tooltip = isAdd ? UnionTStr.AddAllTooltip : UnionTStr.RemoveAllTooltip;
            const cssActionType = isAdd ? 'add' : 'remove';
            const labelTip = tip;
            const iconHTML = isShowIcon
                ? `<div class="action-icon ${cssActionDisabled} ${cssActionType}" data-toggle="tooltip" data-container="body" data-placement="auto top" data-original-title="${tooltip}">
                    <i class="icon ${cssActionIcon} fa-14"></i>
                    </div>`
                : '';

            return `<div class="lists" data-index="${index}"><div class="flexContainer">
                ${iconHTML}<div class="action-label" data-toggle="tooltip" data-container="body" data-placement="auto top" data-original-title="${labelTip}">${label}</div>
                </div></div>`;
        }).join('');

        return titleHTML + actionHTML;
    }

    private _setupDropdownList(): void {
        const $section: JQuery = this._getView();
        const self = this;
        const container: string = this._panelSelector;

        $section.find(".columnList").each(function() {
            const $dropDownList: JQuery = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    self._getCandidateDropdownList($dropDownList);
                },
                onSelect: function($li) {
                    if ($li.hasClass("search") || $li.hasClass("searchHint")) {
                        // on search or hint
                        return true; // keep open
                    }
                    const colName: string = $li.find(".colName").text();
                    const text: string = $dropDownList.find(".text").text();
                    const isRemove: boolean = $li.hasClass("removeCol");
                    if (colName === text || !text && isRemove) {
                        return;
                    }
                    const listIndex: number = self._getListIndex($dropDownList);
                    const colIndex: number = self._getColIndex($dropDownList);
                    if (isRemove) {
                        self.modelData.removeColumn(listIndex, colIndex);
                    } else {
                        const indexToSelect = Number($li.data("index"));
                        self.modelData.selectColumn(listIndex, colIndex, indexToSelect);
                    }
                    xcTooltip.hideAll();
                },
                container: container,
                bounds: container
            }).setupListeners();

            $dropDownList.on("input", ".search input", function(event) {
                const $searchInput: JQuery = $(event.currentTarget);
                if (!$searchInput.is(":visible")) return; // ENG-8642
                const keyword: string = $searchInput.val().trim();
                const $dropDown: JQuery = $searchInput.closest(".dropDownList");
                self._filterCandidateDropwn($dropDown, keyword);
            });
        });

        $section.find(".typeList").each(function() {
            const $dropDownList: JQuery = $(this);
            new MenuHelper($dropDownList, {
                onOpen: function() {
                    const colIndex: number = self._getColIndex($dropDownList.closest(".resultCol"));
                    const selectedCol = self.modelData.getModel().selected[0][colIndex];
                    $dropDownList.find("li").removeClass("originalType");
                    if (selectedCol && selectedCol.getType()) {
                        const colType = selectedCol.getType();
                        $dropDownList.find("li").filter(function() {
                            return $(this).text() === colType;
                        }).addClass("originalType");
                    }
                },
                onSelect: function($li) {
                    const type: ColumnType = $li.text();
                    const colIndex: number = self._getColIndex($dropDownList.closest(".resultCol"));
                    $dropDownList.find(".text").val(type);
                    self.modelData.setResult(colIndex, null, type);
                    xcTooltip.hideAll();
                    const selectedCol = self.modelData.getModel().selected[0][colIndex];

                    if (selectedCol && selectedCol.getType() === type) {
                        $dropDownList.addClass("originalType");
                    } else {
                        $dropDownList.removeClass("originalType");
                    }
                },
                container: container,
                bounds: container
            }).setupListeners();
        });
    }

    private _getCandidateDropdownList($dropDownList: JQuery): void {
        const listIndex: number = this._getListIndex($dropDownList);
        const model = this.modelData.getModel();
        const selectedCols: ProgCol[] = model.selected[listIndex];
        const resultCols: ProgCol[] = model.result;
        const allCols: ProgCol[] = model.all[listIndex];

        const map: Map<string, number> = new Map();
        selectedCols.forEach((col, colIndex) => {
            if (col != null) {
                map.set(col.getBackColName(), colIndex);
            }
        });
        const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes(true);
        let list: string = allCols.map(function(col, index) {
            const colName: string = col.getBackColName();
            const isUsed: boolean = map.has(colName);
            let extraClass: string;
            let title: string;
            if (isUsed) {
                let colIndex: number = map.get(colName);
                extraClass = "used";
                title = xcStringHelper.replaceMsg(UnionTStr.UsedFor, {
                    col: resultCols[colIndex].getBackColName()
                });
            } else {
                extraClass = "tooltipOverflow";
                title = "";
            }
            const colType: ColumnType = col.getType();
            if (!validTypes.includes(colType)) {
                return "";
            }
            return '<li class="li type-' + colType + ' ' + extraClass + '"' +
                    ' data-index="' + index + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-title="' + xcStringHelper.escapeHTMLSpecialChar(title) + '"' +
                    ' data-container="body"' +
                    ' data-placement="auto top"' +
                    '>' +
                        BaseOpPanel.craeteColumnListHTML(colType, colName, isUsed) +
                    '</li>';
        }).join("");

        if (allCols.length === 0) {
            list = '<div class="hint">' +
                        UnionTStr.EmptyList +
                    '</div>';
        } else {
            list = '<li class="removeCol">' +
                        UnionTStr.NoMatch +
                    '</li>' +
                    '<li class="search">' +
                        '<input placeholder="search columns">' +
                    '</li>' +
                    '<li class="hint searchHint xc-hidden">' +
                        UnionTStr.EmptyList +
                    '</div>' +
                    list;
        }
        $dropDownList.find("ul").html(list);
    }

    private _filterCandidateDropwn($dropDown: JQuery, keyword: string) {
        const $lis: JQuery = $dropDown.find(".li");
        const $hint: JQuery = $dropDown.find(".hint");
        $hint.addClass("xc-hidden");
        if (!keyword) {
            $lis.removeClass("xc-hidden");
            return;
        }
        const $filterLis: JQuery = $lis.filter(function () {
            return $(this).find(".colName").text().includes(keyword);
        });
        $lis.addClass("xc-hidden");
        $filterLis.removeClass("xc-hidden");
        if ($filterLis.length === 0) {
            $hint.removeClass("xc-hidden");
        }
    }

    // case insensitive - lowercase keyword and matches
    private _searchColumn(keyword: string, index: number): void {
        const $inputs: JQuery = this._getView().find('.lists[data-index="' + index + '"]')
                                        .find(".inputCol .colName");
        $inputs.removeClass("highlight");
        if (!keyword) {
            return;
        }
        keyword = keyword.toLowerCase();
        $inputs.filter(function() {
            return $(this).text().toLowerCase().includes(keyword);
        }).addClass("highlight");
    }

    private _showCast(colIndex: number) {
        const $view: JQuery = this._getView();
        $view.find('.resultCol[data-index="' + colIndex + '"]').addClass("cast");
        $view.find('.columnList[data-index="' + colIndex + '"]').addClass("cast");
    }
}