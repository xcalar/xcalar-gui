class JSONModal {
    private static _instance: JSONModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _matchIndex: number;
    private _isDataCol: boolean;
    private _comparisonObjs;
    private _jsonData;
    private _modalHelper: ModalHelper;
    private _searchHelper: SearchBar;
    private _isSaveModeOff: boolean = false;
    private _refCounts = {}; // to track clicked json tds
    private _$lastKeySelected: JQuery;
    private _lastMode;
    private _selectedCols = []; // holds arrays of cols selected by user, 1 array per
                        // split json panel
    private _table: TableMeta;

    // constant
    private readonly _jsonAreaMinWidth: number = 340;
    private readonly _minHeight: number = 300;
    private readonly _minWidth: number = 300;
    private readonly _modes = {
        single: 'single',
        multiple: 'multiple'
    };

    private constructor() {
        this._comparisonObjs = {};
        this._jsonData = [];
        this._isSaveModeOff = false;
        this._lastMode = this._modes.single;

        this._modalHelper = new ModalHelper(this._getModal(), {
            "minHeight": this._minWidth,
            "minWidth": this._minHeight,
            "noResize": true, // use it's own resize function
            "noTabFocus": true,
            "noEsc": true
        });

        this._addEventListeners();
        this._addMenuActions();
    }

    /**
     * JSONModal.Instance.show
     * @param $jsonTd
     * @param options
     */
    public show(
        $jsonTd: JQuery,
        options?: {
            type?: ColumnType, // column data type, only included if not a typical array or object
            saveModeOff?: boolean // if true, will not save projectState
        }
    ): void {
        if ($jsonTd.text().trim().length === 0) {
            return;
        }
        options = options || {};
        let tableId = TblManager.parseTableId($jsonTd.closest('table'));
        this._table = gTables[tableId];
        let type: ColumnType = options.type;
        this._isSaveModeOff = options.saveModeOff || false;

        xcUIHelper.removeSelectionRange();
        let $modal = this._getModal();
        let isModalOpen = $modal.is(':visible');
        this._isDataCol = $jsonTd.hasClass('jsonElement');
        if (this._isDataCol) {
            $modal.removeClass('singleView');
        } else {
            $modal.addClass('singleView');
        }

        if (!isModalOpen) {
            xcTooltip.hideAll();
            TblManager.unHighlightCells();
            this._getJSONSerachInput().val("");

            this._modalHelper.setup({
                "open": function() {
                    // json modal use its own opener
                    return PromiseHelper.resolve();
                }
            });
            this._addModalDocumentEvent();
        }

        // shows json modal
        this._refreshJsonModal($jsonTd, isModalOpen, type);

        if (isModalOpen) {
            this._updateSearchResults();
            this._searchText();
        }

        this._increaseModalSize();
    }

    /**
     * JSONModal.Instance.rehighlightTds
     * @param $table
     */
    public rehighlightTds($table: JQuery): void {
        $table.find('.jsonElement').addClass('modalHighlighted');
        let tableId: TableId = TblManager.parseTableId($table);
        this._getModal().find('.jsonWrap').each(function() {
            let data = $(this).data();
            let jsonTableId = data.tableid;
            if (jsonTableId === tableId) {
                let $td = $table.find('.row' + data.rownum).find('.jsonElement');
                if ($td.length && !$td.find('.jsonModalHighlightBox').length) {
                    TblManager.highlightCell($td, jsonTableId,
                    data.rownum, data.colnum, {jsonModal: true, isShift: false});
                }
            }
        });
    }

    private _getModal(): JQuery {
        return $("#jsonModal");
    }

    private _getJSONArea(): JQuery {
        return this._getModal().find(".jsonArea");
    }

    private _getJSONText(): JQuery {
        return this._getModal().find('.prettyJson:visible');
    }

    private _getJSONSearchEl(): JQuery {
        return $("#jsonSearch");
    }

    private _getJSONSerachInput(): JQuery {
        return this._getJSONSearchEl().find('input');
    }

    private _getCounterEl(): JQuery {
        return this._getJSONSearchEl().find('.counter');
    }

    private _getModalBg(): JQuery {
        return $("#modalBackground");
    }

    private _close(mode?): void {
        this._modalHelper.clear({"close": () => {
            // json modal use its own closer
            if (!$("#container").hasClass("columnPicker")) {
                $('.modalHighlighted').removeClass('modalHighlighted');
            } else {
                $(".jsonElement").removeClass("modalHighlighted");
            }

            $('.jsonModalHighlightBox').remove();
            $(".highlightedCell").removeClass("highlightedCell");
            this._refCounts = {};
            this._toggleModal(null, true, 200);

            let $modalBg = this._getModalBg();
            $modalBg.removeClass('light');
            if ($('.modalContainer:visible:not(#aboutModal)').length < 2) {
                $modalBg.hide();
            }
            this._getModal().hide().width(500);
            $(".xcTable").find(".jsonModalOpen").removeClass("jsonModalOpen");
            xcTooltip.hideAll();
        }});

        if (!this._isSaveModeOff) {
            this._saveLastMode(mode);
        }
        this._isSaveModeOff = false;

        $(document).off(".jsonModal");
        this._searchHelper.clearSearch(() => {
            this._clearSearch(false);
        });
        $('#jsonSearch').addClass('closed');
        this._getJSONArea().empty();

        this._jsonData = [];
        this._comparisonObjs = {};
        this._$lastKeySelected = null;
        this._selectedCols = [];
        this._table = null;
    }

    private _selectTab($tab: JQuery): void {
        if ($tab.hasClass('active')) {
            return;
        }

        let isImmediate: boolean = $tab.hasClass('immediates');
        let isSeeAll: boolean = $tab.hasClass('seeAll');
        let $jsonWrap = $tab.closest('.jsonWrap');
        let $prefixGroups = $jsonWrap.find('.primary').find('.prefixGroup');
        $tab.closest('.tabs').find('.tab').removeClass('active');
        $tab.addClass('active');
        $jsonWrap.find(".brace").removeClass("empty");

        if ($jsonWrap.find(".compareIcon.selected").length) {
            // when switching tabs, uncompare, then recompare
            this._compareIconSelect($jsonWrap.find(".compareIcon"));
            this._compareIconSelect($jsonWrap.find(".compareIcon"));
        }

        if (isSeeAll) {
            $prefixGroups.removeClass('xc-hidden');
            $prefixGroups.find('.prefix').removeClass('xc-hidden');
            $jsonWrap.removeClass('tabFiltered');
            $jsonWrap.find('.groupType').removeClass('xc-hidden');
            $jsonWrap.find(".missingImmediatesSection").removeClass("xc-hidden");
        } else {
            $jsonWrap.addClass('tabFiltered');
            $prefixGroups.addClass('xc-hidden');
            $prefixGroups.find('.prefix').addClass('xc-hidden');
            if (isImmediate) {
                $prefixGroups.filter('.immediatesGroup').removeClass('xc-hidden');
                $jsonWrap.find('.prefixedType').addClass('xc-hidden');
                $jsonWrap.find('.immediatesType').removeClass('xc-hidden');
                $jsonWrap.find(".missingImmediatesSection").removeClass("xc-hidden");
                if (!$prefixGroups.filter('.immediatesGroup').length) {
                    $jsonWrap.find(".brace").addClass("empty");
                }
            } else {
                var prefix = $tab.data('id');
                $prefixGroups.find('.prefix').filter(function() {
                    return $(this).text() === prefix;
                }).parent().removeClass('xc-hidden');
                $jsonWrap.find('.prefixedType').removeClass('xc-hidden');
                $jsonWrap.find('.immediatesType').addClass('xc-hidden');
                $jsonWrap.find(".missingImmediatesSection").addClass("xc-hidden");
            }
        }
        this._searchHelper.clearSearch(() => {
            this._clearSearch(false);
        });
    }

    private _compareIconSelect($compareIcon: JQuery): void {
        let $jsonArea = this._getJSONArea();
        let $compareIcons: JQuery = $jsonArea.find('.compareIcon.selected');
        let numComparisons: number = $compareIcons.length;
        let isSearchUpdateNeeded: boolean = true;
        let multipleComparison: boolean = false;

        if ($compareIcon.hasClass('selected')) {
            // uncheck this jsonwrap
            $compareIcon.removeClass('selected');
            $jsonArea.find('.comparison').find('.prettyJson.secondary')
                                         .empty();
            $compareIcon.closest('.jsonWrap').removeClass('active comparison');
            $jsonArea.find('.comparison').removeClass('comparison');
            this._comparisonObjs = {}; // empty any saved comparisons
        } else {
            // check this jsonWrap
            if (numComparisons === 0) {
                isSearchUpdateNeeded = false;
            } else if (numComparisons > 1) {
                multipleComparison = true;
            }
            $compareIcon.addClass('selected');
            $compareIcon.closest('.jsonWrap').addClass('active');
        }

        $compareIcons = $jsonArea.find('.compareIcon.selected');
        // only run comparison if more than 2 compareIcons are selected
        if ($compareIcons.length > 1) {
            if (multipleComparison) {
                let $jsonWrap = $compareIcon.closest('.jsonWrap');
                let index: number = $jsonWrap.index();
                let data = this._getDataObj($jsonWrap, index);
                this._compare(data, index, multipleComparison);
            } else {
                let indices: number[] = [];
                let objs: any[] = [];
                $compareIcons.each((_index, el) => {
                    let $curJsonWrap = $(el).closest('.jsonWrap');
                    let index = $curJsonWrap.index();
                    indices.push(index);
                    let data = this._getDataObj($curJsonWrap, index);
                    objs.push(data);
                });

                this._compare(objs, indices);
            }
            this._displayComparison(this._comparisonObjs);
        }

        if (isSearchUpdateNeeded && $compareIcons.length) {
            this._updateSearchResults();
            this._searchText();
        }
    }

    private _getDataObj($jsonWrap: JQuery, index: number): any {
        let $activeTab = $jsonWrap.find(".tab.active");
        let data = this._jsonData[index];
        if ($activeTab.hasClass("seeAll")) {
            return data.full;
        } else if ($activeTab.hasClass('immediates')) {
            return data.immediates;
        } else {
            let prefix = $activeTab.data("id");
            return data.prefixed[prefix];
        }
    }

    private _selectAllFields($jsonWrap: JQuery): void {
        let index: number = $jsonWrap.index();
        $jsonWrap.find(".jInfo").each((_index, el) => {
            let $el = $(el);
            if ($el.hasClass("pulled")) {
                return true;
            }
            let $checkbox = $el.children(".jsonCheckbox");
            let wasNotChecked: boolean = false;
            if (!$checkbox.hasClass("checked")) {
                wasNotChecked = true;
                $checkbox.addClass("checked");
            }

            let $key = $checkbox.siblings('.jKey, .arrayEl');
            if (!$key.length) {
                $key = $checkbox.siblings();
            }

            $key.addClass("keySelected");
            if (wasNotChecked) {
                let nameInfo = this._createJsonSelectionExpression($key);
                let colName = nameInfo.escapedName;
                this._selectedCols[index].push(colName);
            }
        });

        $jsonWrap.find('.submitMultiPull').removeClass('disabled');
        $jsonWrap.find('.clearAll').removeClass('disabled');
        this._updateNumPullColsSelected($jsonWrap);
        this._$lastKeySelected = null;
    }

    private _clearAllSelectedCols($jsonWrap): void {
        $jsonWrap.find('.keySelected').removeClass('keySelected');
        $jsonWrap.find('.jsonCheckbox').removeClass('checked');
        $jsonWrap.find('.submitMultiPull').addClass('disabled');
        $jsonWrap.find('.clearAll').addClass('disabled');
        $jsonWrap.find('.selectAll').removeClass('disabled');
        this._$lastKeySelected = null;
        let $section = $jsonWrap.find('.multiSelectModeBar .numColsSelected');
        let numTotalFields: number = $section.data('numTotalFields');
        if (numTotalFields === 0) {
            $section.text(JsonModalTStr.AllFieldsPulled);
        } else {
            $section.text('0/' + numTotalFields + ' ' + JsonModalTStr.FieldsPull);
        }
        this._selectedCols[$jsonWrap.index()] = [];
    }

    private _updateNumPullColsSelected($jsonWrap: JQuery): void {
        let numSelected: number = $jsonWrap.find('.keySelected').length;
        let $section = $jsonWrap.find('.multiSelectModeBar .numColsSelected');
        let numTotalFields: number = $section.data('numTotalFields');
        if (numTotalFields === 0) {
            $section.text(JsonModalTStr.AllFieldsPulled);
        } else {
            $section.text(numSelected + '/' + numTotalFields + ' ' + JsonModalTStr.FieldsPull);
        }

        if (numSelected === 0) {
            $jsonWrap.find('.submitMultiPull').addClass('disabled');
            $jsonWrap.find('.clearAll').addClass('disabled');
            $jsonWrap.find('.selectAll').removeClass('disabled');
        } else if (numSelected === numTotalFields) {
            $jsonWrap.find('.selectAll').addClass('disabled');
        } else {
            $jsonWrap.find('.selectAll').removeClass('disabled');
        }
    }

    private _selectJsonKey($el: JQuery, event: JQueryEventObject): void {
        let $jsonWrap: JQuery = $el.closest('.jsonWrap');
        if ($jsonWrap.hasClass('multiSelectMode')) {
            let index: number = $jsonWrap.index();
            let toSelect: boolean = false;
            if (!$el.hasClass('keySelected')) {
                toSelect = true;
            }

            if (event.shiftKey && this._$lastKeySelected) {
                let $cboxes = $jsonWrap.find('.jsonCheckbox');
                let $els = $();
                $cboxes.each(function() {
                    var $checkbox = $(this);
                    if ($checkbox.parent().hasClass("pulled")) {
                        return true;
                    }
                    var $key = $checkbox.siblings('.jKey, .arrayEl');
                    if (!$key.length) {
                        $key = $checkbox.siblings();
                    }
                    if ($key.length === 1) {
                        // exclude prefix checkbox
                        $els = $els.add($key);
                    }
                });

                let lastIndex: number = $els.index(this._$lastKeySelected);
                let curIndex: number = $els.index($el);
                let start: number = Math.min(lastIndex, curIndex);
                let end: number = Math.max(lastIndex, curIndex);

                // select in the correct order
                if (curIndex > lastIndex) {
                    for (let i = start; i <= end; i++) {
                        if (toSelect) {
                            this._selectField($els.eq(i), $jsonWrap, index);
                        } else {
                            this._deselectField($els.eq(i), $jsonWrap, index);
                        }
                    }
                } else {
                    for (let i = end - 1; i >= start; i--) {
                        if (toSelect) {
                            this._selectField($els.eq(i), $jsonWrap, index);
                        } else {
                            this._deselectField($els.eq(i), $jsonWrap, index);
                        }
                    }
                }
            }

            if (toSelect) {
                this._selectField($el, $jsonWrap, index);
            } else {
                this._deselectField($el, $jsonWrap, index);
            }

            this._$lastKeySelected = $el;

            if ($jsonWrap.hasClass('multiSelectMode')) {
                this._updateNumPullColsSelected($jsonWrap);
            }
        } else {
            let tableId: TableId = $jsonWrap.data('tableid');
            let table: TableMeta = this._table;
            let colNum: number = $jsonWrap.data('colnum');
            let isArray: boolean = $jsonWrap.data('isarray');

            let nameInfo = this._createJsonSelectionExpression($el);
            let animation: boolean = !gMinModeOn;
            let backColName: string;

            if (this._isDataCol) {
                backColName = nameInfo.escapedName;
                colNum = $("#xcTable-" + tableId).find('th.dataCol').index();
            } else {
                let symbol: string = isArray ? "" : ".";
                let colName: string = table.getCol(colNum).getBackColName();
                backColName = colName + symbol + nameInfo.escapedName;
                nameInfo.name = colName.replace(/\\\./g, ".") + symbol +
                                nameInfo.name;
            }

            let checkedColNum: number = table.getColNumByBackName(backColName);
            if (checkedColNum >= 0) {
                // if the column already exists
                this._close(this._modes.single);
                TblManager.centerFocusedColumn(tableId, checkedColNum, animation, false);
                return;
            }

            let options = {
                "direction": this._isDataCol ? ColDir.Left : ColDir.Right,
                "fullName": nameInfo.name,
                "escapedName": backColName,
                "defaultWidth": true
            };

            ColManager.pullCol(colNum, tableId, options)
            .always((newColNum) => {
                this._close(this._modes.single);
                TblManager.centerFocusedColumn(tableId, newColNum, animation, false);
            });
        }
    }

    private _selectField($el: JQuery, $jsonWrap: JQuery, index: number): void {
        if ($el.hasClass("keySelected")) {
            return;
        }

        $el.addClass('keySelected');
        $el.siblings('.jsonCheckbox').addClass('checked');
        $jsonWrap.find('.submitMultiPull').removeClass('disabled');
        $jsonWrap.find('.clearAll').removeClass('disabled');

        let nameInfo = this._createJsonSelectionExpression($el);
        let colName: string = nameInfo.escapedName;
        this._selectedCols[index].push(colName);
    }

    private _deselectField($el: JQuery, $jsonWrap: JQuery, index: number): void {
        if (!$el.hasClass("keySelected")) {
            return;
        }
        $el.removeClass('keySelected');
        $el.siblings('.jsonCheckbox').removeClass('checked');
        if ($jsonWrap.find('.keySelected').length === 0) {
            $jsonWrap.find('.submitMultiPull').addClass('disabled');
            $jsonWrap.find('.clearAll').addClass('disabled');
        }
        let nameInfo = this._createJsonSelectionExpression($el);
        let colName: string = nameInfo.escapedName;
        let pos: number = this._selectedCols[index].indexOf(colName);
        this._selectedCols[index].splice(pos, 1);
    }

    private _sortData($icon: JQuery): void {
        let order: ColumnSortOrder;
        let tooltipText: string;
        let sortGroups = (a, b) => {
            return xcHelper.sortVals($(a).children('.prefix').text(),
                                     $(b).children('.prefix').text(), order);
        };
        let sortList = (a, b) => {
            return xcHelper.sortVals($(a).data('key'), $(b).data('key'), order);
        };

        if ($icon.hasClass('desc')) {
            $icon.removeClass('desc');
            tooltipText = JsonModalTStr.SortAsc;
            order = ColumnSortOrder.descending;
        } else {
            $icon.addClass('desc');
            tooltipText = JsonModalTStr.SortDesc;
            order = ColumnSortOrder.ascending;
        }
        xcTooltip.changeText($icon, tooltipText);
        xcTooltip.refresh($icon);

        let $jsonWrap = $icon.closest('.jsonWrap');
        let $groups: JQuery;
        if (this._isDataCol) {
            $groups = $jsonWrap.find('.prefixedType .prefixGroup');
            $groups.sort(sortGroups).appendTo($jsonWrap.find('.prefixedType'));

            $groups = $groups.add($jsonWrap.find('.immediatesGroup'));
        } else {
            $groups = this._getModal().find('.prettyJson');
        }

        $groups.each(function() {
            let $group = $(this);
            $group.find('.mainKey')
            .sort(sortList)
            .prependTo($group.children('.jObject'));
        });

        this._searchHelper.clearSearch(() => {
            this._clearSearch(false);
        });
    }

    private _increaseModalSize(): void {
        let $modal = this._getModal();
        let numJsons: number = this._jsonData.length;
        let winWidth: number = $(window).width();
        let currentWidth: number = $modal.width();
        let offsetLeft: number = $modal.offset().left;
        let maxWidth: number = winWidth - offsetLeft;
        let desiredWidth: number = Math.min(numJsons * 200, maxWidth);

        if (currentWidth < desiredWidth) {
            let newWidth: number = Math.min(desiredWidth, currentWidth + 200);
            this._getModal().width(newWidth);

            // center modal only if already somewhat centered
            if ((winWidth - currentWidth) / 2 + 100 > offsetLeft &&
                (winWidth - currentWidth) / 2 - 100 < offsetLeft
            ) {
                this._modalHelper.center({"horizontalOnly": true});
            }
        }
        this._checkTabSizes();
    }

    private _decreaseModalSize(): void {
        let $modal = this._getModal();
        let currentWidth: number = $modal.width();
        let minW: number = Math.min(500, currentWidth);
        let desiredWidth: number = Math.max(this._jsonData.length * 200, minW);
        let winWidth: number = $(window).width();
        let offsetLeft: number = $modal.offset().left;

        if (currentWidth > desiredWidth) {
            let newWidth: number = Math.max(desiredWidth, currentWidth - 100);
            $modal.width(newWidth);
            if ((winWidth - currentWidth) / 2 + 100 > offsetLeft &&
                (winWidth - currentWidth) / 2 - 100 < offsetLeft
            ) {
                this._modalHelper.center({"horizontalOnly": true});
            }
        }
        this._checkTabSizes();
    }

    private _checkTabSizes(): void {
        let $modal = this._getModal();
        let $jsonWraps = $modal.find('.jsonWrap');
        let $tabSets = $jsonWraps.find('.tabs');
        let modalMinWidth: number = $jsonWraps.length * this._jsonAreaMinWidth;
        let currentModalWidth: number = $modal.width();

        if (currentModalWidth < modalMinWidth) {
            $tabSets.addClass('small');
        } else if (currentModalWidth > modalMinWidth) {
            $tabSets.removeClass('small');
        }
    }

    // updates search after split or remove jsonWrap
    private _updateSearchResults() {
        let $jsonText = this._getJSONText();
        this._searchHelper.$matches = $jsonText.find('.highlightedText');
        this._searchHelper.numMatches = this._searchHelper.$matches.length;

        //XXX this isn't complete, not handling case of middle json being removed
        if (this._matchIndex > this._searchHelper.numMatches) {
            this._matchIndex = 0;
        }

        if (this._getJSONSerachInput().val().length !== 0) {
            let $counter = this._getCounterEl();
            $counter.find('.total').text("of " + this._searchHelper.numMatches);

            if (this._searchHelper.numMatches > 0) {
                $counter.find('.position').text(this._matchIndex + 1);
            } else {
                $counter.find('.position').text(0);
            }
        }
    }

    private _searchText(): void {
        let $jsonText = this._getJSONText();
        $jsonText.find('.highlightedText').contents().unwrap();
        let text: string = this._getJSONSerachInput().val().toLowerCase();
        let searchHelper = this._searchHelper;
        if (text === "") {
            searchHelper.clearSearch();
            return;
        }
        let $targets = $jsonText.find('.text').filter(function() {
            return ($(this).is(':visible') &&
                    $(this).text().toLowerCase().indexOf(text) !== -1);
        });

        text = xcStringHelper.escapeRegExp(text);
        let regex = new RegExp(text, "gi");

        $targets.each(function() {
            let foundText = $(this).text();
            foundText = foundText.replace(regex, function (match) {
                return ('<span class="highlightedText">' + match +
                        '</span>');
            });
            $(this).html(foundText);
        });
        searchHelper.updateResults($jsonText.find('.highlightedText'));
        this._matchIndex = 0;

        if (searchHelper.numMatches !== 0) {
            this._scrollMatchIntoView(searchHelper.$matches.eq(0));
        }
    }

    private _clearSearch(focus: boolean): void {
        let $jsonText = this._getJSONText();
        if ($jsonText.length) {
            $jsonText.find('.highlightedText').contents().unwrap();
        }

        let $searchInput = this._getJSONSerachInput();
        if (focus) {
            $searchInput.focus();
        }
        $searchInput.val("");
    }

    private _scrollMatchIntoView($match: JQuery): void {
        let $modalWindow: JQuery = $match.closest('.prettyJson');
        let modalHeight: number = $modalWindow.outerHeight();
        let scrollTop: number = $modalWindow.scrollTop();
        let modalWindowTop: number = $modalWindow.offset().top;
        let matchOffset: number = $match.offset().top - modalWindowTop;

        if (matchOffset > modalHeight - 15 || matchOffset < 0) {
            $modalWindow.scrollTop(scrollTop + matchOffset - (modalHeight / 2));
        }
    }

    // if mode isn't provided, will default to single "select mode" if a single
    // jsonWrap without multiSelect mode is found
    private _saveLastMode(mode: string): string {
        if (mode) {
            this._lastMode = mode;
            return this._lastMode;
        }
        let $jsonArea = this._getJSONArea();
        $jsonArea.find('.jsonWrap').each((_index, el) => {
            let $wrap = $(el);
            if ($wrap.hasClass("multiSelectMode")) {
                this._lastMode = this._modes.multiple;
            } else {
                this._lastMode = this._modes.single;
                return false;
            }
        });

        return this._lastMode;
    }

    private _refreshJsonModal(
        $jsonTd: JQuery,
        isModalOpen: boolean,
        type: ColumnType
    ): void {
        let text: string = $jsonTd.find('.originalData').text();
        let jsonObj: any;
        let allMultiMode: boolean = false;
        let $modal = this._getModal();
        if (type &&
            (type !== ColumnType.array &&
            type !== ColumnType.object &&
            type !== ColumnType.mixed)
        ) {
            jsonObj = text;
            $modal.addClass('truncatedText');
        } else {
            $modal.removeClass('truncatedText');

            try {
                jsonObj = JSON.parse(text);
            } catch (error) {
                let rowNum: number = RowManager.parseRowNum($jsonTd.closest('tr')) + 1;
                let msg: string = xcStringHelper.replaceMsg(JsonModalTStr.SyntaxErrorDesc, {
                    row: rowNum
                });
                let err = {error: msg, log: "Data: " + text};
                this._close();
                Alert.error(JsonModalTStr.SyntaxErrorTitle, err);
                return;
            }
            if (type === ColumnType.mixed) {
                if (jsonObj instanceof Array) {
                    type = ColumnType.array;
                } else {
                    type = ColumnType.object;
                }
            }
        }

        if (type === ColumnType.array) {
            $modal.addClass('isArray');
        } else {
            $modal.removeClass('isArray');
        }

        let dataObj = {
            full: jsonObj,
            immediates: {},
            prefixed: {},
            missingImmediates: {}
        };
        if (this._isDataCol) {
            this._removeHiddenSortedColumns(jsonObj);
            let groups = this._splitJsonIntoGroups(jsonObj);
            for (let i = 0; i < groups.length; i++) {
                if (groups[i].prefix === gPrefixSign) {
                    dataObj.immediates = groups[i].objs;
                } else if (groups[i].prefix === gPrefixSign + "-") {
                    dataObj.missingImmediates = groups[i].objs;
                } else {
                    dataObj.prefixed[groups[i].prefix] = groups[i].objs;
                }
            }
        }

        this._jsonData.push(dataObj);
        this._selectedCols.push([]);

        let $jsonArea = this._getJSONArea();
        if (!isModalOpen) {
            let height: number = Math.min(500, $(window).height());
            $modal.height(height).width(500);

            if (gMinModeOn) {
                this._getModalBg().show();
                $modal.show();
                this._toggleModal($jsonTd, false, 0);
            } else {
                this._toggleModal($jsonTd, false, 200);
            }
        } else if ($jsonArea.find('.jsonWrap.multiSelectMode').length &&
            ($jsonArea.find('.jsonWrap').length ===
            $jsonArea.find('.jsonWrap.multiSelectMode').length)
        ) {
            allMultiMode = true;
        }

        this._fillJsonArea(jsonObj, $jsonTd, type);

        if (gMinModeOn || isModalOpen) {
            if (!isModalOpen) {
                let $jsonText = this._getJSONText();
                this._searchHelper.$matches = $jsonText.find('.highlightedText');
            }
        } else {
            // wait for jsonModal to become visible
            setTimeout(() => {
                let $jsonText = this._getJSONText();
                this._searchHelper.$matches = $jsonText.find('.highlightedText');
            }, 250);
        }

        let $jsonWrap = $jsonArea.find('.jsonWrap').last();
        if (isModalOpen) {
            let $compareIcons = $jsonArea.find('.compareIcon')
                                      .removeClass('single');
            $compareIcons.each(function() {
                xcTooltip.changeText($(this), JsonModalTStr.Compare);
            });
            if (allMultiMode) {
                $jsonWrap.addClass('multiSelectMode');
            }
        } else if (this._lastMode === this._modes.multiple &&
            (this._isDataCol || type === ColumnType.object)
        ) {
            $jsonWrap.addClass('multiSelectMode');
        }
    }

    private _fillJsonArea(
        jsonObj: any,
        $jsonTd: JQuery,
        type: ColumnType
    ): void {
        let rowNum: number = RowManager.parseRowNum($jsonTd.closest('tr')) + 1;
        let prettyJson: string = "";
        let isArray: boolean = (type === ColumnType.array);
        let groups: {prefix: string, objs: object}[]= null;

        if (type && (type !== ColumnType.object && type !== ColumnType.array)) {
            let typeClass: string = "";
            switch (type) {
                case (ColumnType.string):
                    typeClass = "jString";
                    break;
                case (ColumnType.integer):
                    typeClass = "jNum";
                    break;
                case (ColumnType.float):
                    typeClass = "jNum";
                    break;
                case (ColumnType.boolean):
                    typeClass = "jBool";
                    break;
                case (ColumnType.timestamp):
                    typeClass ="jTimestamp";
                    break;
                case (ColumnType.money):
                    typeClass ="jMoney";
                    break;
                default:
                    typeClass = "jUndf";
                    break;
            }
            prettyJson = '<span class="previewText text ' + typeClass + '">' +
                            jsonObj + '</span>';
            if (type === "string") {
                prettyJson = '"' + prettyJson + '"';
            }
        } else {
            if (isArray) {
                prettyJson = '<div class="brace">[</div>';
            } else {
                prettyJson = '<div class="brace">{</div>';
            }

            if (this._isDataCol) {
                groups = this._splitJsonIntoGroups(jsonObj);
                prettyJson += this._getJsonHtmlForDataCol(groups);
            } else {
                prettyJson += this._getJsonHtmlForNonDataCol(jsonObj, isArray);
            }

            if (isArray) {
                prettyJson += '<div class="brace">]</div>';
            } else {
                prettyJson += '<div class="brace">}</div>';
            }
        }
        if (this._isDataCol &&
            groups &&
            Object.keys(groups[groups.length - 1].objs).length &&
            groups[groups.length - 1].prefix === gPrefixSign + "-"
        ) {
            prettyJson += this._getMissingImmediatesHtml(groups[groups.length - 1].objs);
        }

        let location: string;
        let table: TableMeta = this._table;
        if (this._isDataCol) {
            location = table.getName();
        } else {
            let colNum: number = ColManager.parseColNum($jsonTd);
            location = table.getCol(colNum).getBackColName();
        }

        let $jsonArea = this._getJSONArea();
        $jsonArea.append(this._getJsonWrapHtml(prettyJson, rowNum));
        if (this._isDataCol) {
            this._setPrefixTabs(groups);
        }

        this._markPulledCols($jsonArea, isArray, location);
        this._addDataToJsonWrap($jsonTd, isArray);
    }

    private _getJsonHtmlForDataCol(groups: any[]): HTML {
        let checkboxes: boolean = true;
        let isArray: boolean = false;
        let prettyJson: HTML = '<div class="groupWrap">';

        let prefixFound: boolean;
        let immediatesGroup: string = "";
        let prefixedGroup: HTML =
            '<div class="groupType prefixedType">' +
                '<h3 class="prefixGroupTitle">' +
                   '<div class="checkbox jsonCheckbox prefixCheckbox">' +
                    '<i class="icon xi-ckbox-empty fa-11"></i>' +
                    '<i class="icon xi-ckbox-selected fa-11"></i>' +
                  '</div>' +
                  JsonModalTStr.PrefixedField +
                '</h3>';
        for (let i = 0; i < groups.length - 1; i++) {
            let tempJson = xcUIHelper.prettifyJson(groups[i].objs, null, checkboxes, {
                "inArray": isArray,
                "checkboxes": true
            }, false);
            tempJson = '<div class="jObject">' +
                            tempJson +
                        '</div>';

            if (groups[i].prefix === gPrefixSign) {
                immediatesGroup =
                    '<div class="groupType immediatesType">' +
                        '<h3 class="prefixGroupTitle">' +
                            CommonTxtTstr.ImmediatesPlural +
                        '</h3>' +
                        '<div class="prefixGroup immediatesGroup">' +
                            tempJson +
                        '</div>' +
                    '</div>';
            } else {
                prefixFound = true;
                prefixedGroup +=
                    '<div class="prefixGroup">' +
                        '<div class="prefix">' +
                            groups[i].prefix +
                        '</div>' +
                        tempJson +
                    '</div>';
            }
        }

        prettyJson += immediatesGroup;
        if (prefixFound) {
            prettyJson += prefixedGroup + '</div>';
        }
        prettyJson += '</div>';

        return prettyJson;
    }

    private _getJsonHtmlForNonDataCol(jsonObj: any, isArray: boolean): HTML {
        let prettyJson = xcUIHelper.prettifyJson(jsonObj, null, true, {
            inArray: isArray,
            checkboxes: true
        }, isArray);
        prettyJson = '<div class="jObject">' + prettyJson + '</div>';
        return prettyJson;
    }

    private _getMissingImmediatesHtml(immediates: object): HTML {
        let html = '<div class="missingImmediatesSection">' +
                    '<div class="subHeading">' +
                        JsonModalTStr.ImmediatesNotPresent +
                    '</div>' +
                    '<div class="jObject">' +
                    xcUIHelper.prettifyJson(immediates, 0, true, {
                        noQuotes: true,
                        checkboxes: true
                    }, false) +
                    '</div>' +
                '</div>';

        return html;
    }

    private _removeHiddenSortedColumns(jsonObj: object): void {
        let table: TableMeta = this._table;
        let hiddenSortCols = table.getHiddenSortCols();
        for (let colName in hiddenSortCols){
            delete jsonObj[colName];
        }
    }

    // splits json into array, grouped by prefix
    private _splitJsonIntoGroups(
        jsonObj: object
    ): {
        prefix: string,
        objs: object
    }[] {
        let groups = {};
        let table: TableMeta = this._table;
        let knownImmediatesArray = table.getImmediates();
        let hiddenSortCols = table.getHiddenSortCols();
        let knownImmediates = {};
        knownImmediatesArray.forEach((imm) => {
            if (hiddenSortCols[imm.name]) {
                return; // do not add hidden sorted columns
            }
            knownImmediates[imm.name] = xcHelper.convertFieldTypeToColType(imm.type);
        });

        for (let key in jsonObj) {
            let splitName = xcHelper.parsePrefixColName(key);
            if (!splitName.prefix) {
                if (!groups[gPrefixSign]) {
                    // use :: for immediates since it's not allowed and can't be taken
                    groups[gPrefixSign] = {};
                }
                groups[gPrefixSign][splitName.name] = jsonObj[key];
                delete knownImmediates[splitName.name];
            } else {
                if (!groups[splitName.prefix]) {
                    groups[splitName.prefix] = {};
                }
                groups[splitName.prefix][splitName.name] = jsonObj[key];
            }
        }

        let groupsArray: {prefix: string, objs: object}[] = [];
        for (var i in groups) {
            if (i !== gPrefixSign) {
                groupsArray.push({
                    prefix: i,
                    objs: groups[i]
                });
            }
        }
        groupsArray.sort((a, b) => {
            let aPrefix = a.prefix;
            let bPrefix = b.prefix;
            return (aPrefix < bPrefix ? -1 : (aPrefix > bPrefix ? 1 : 0));
        });
        if (groups[gPrefixSign]) {
            groupsArray.unshift({
                prefix: gPrefixSign,
                objs: groups[gPrefixSign]
            });
        }

        groupsArray.push({
            prefix: gPrefixSign + "-",
            objs: knownImmediates
        });

        return groupsArray;
    }

    private _setPrefixTabs(
        groups: {
            prefix: string,
            objs: object
        }[]
    ): void {
        let $jsonArea = this._getJSONArea();
        let $jsonWrap: JQuery = $jsonArea.find('.jsonWrap').last();
        let $tabWrap: JQuery = $jsonWrap.find('.tabBar .tabs');
        let html: HTML = "";
        let immediatesFound: boolean = false;

        for (let i = 0; i < groups.length; i++) {
            let classNames: string = "";
            let prefix: string = groups[i].prefix;
            let prefixText: string = prefix;
            if (prefix === gPrefixSign + "-" &&
                !Object.keys(groups[i].objs).length) {
                continue;
            }
            if (prefix === gPrefixSign || prefix === gPrefixSign + "-") {
                if (immediatesFound) {
                    continue;
                } else {
                    immediatesFound = true;
                }
                prefix = "Derived";
                prefixText = JsonModalTStr.Derived;
                classNames += " immediates";
            }
            html += '<div class="tab tooltipOverflow' + classNames + '" ' +
                    'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'data-original-title="' + prefix + '" ' +
                    'data-id="' + prefix + '" >' +
                        '<span class="text">' + prefixText +
                        '</span>' +
                    '</div>';
        }
        $tabWrap.append(html);
    }

    private _compare(jsonObjs: any[], indices: any, multiple = false): void {
        if (!multiple && jsonObjs.length < 2) {
            return;
        }

        jsonObjs = xcHelper.deepCopy(jsonObjs);
        let comparisonObjs = this._comparisonObjs;
        let numExistingComparisons: number = Object.keys(comparisonObjs).length;

        if (multiple) {
            let obj = Object.keys(comparisonObjs);
            let matches = comparisonObjs[obj[0]].matches;
            let partials = comparisonObjs[obj[0]].partial;
            let nonMatches = comparisonObjs[obj[0]].unmatched;
            let activeObj = {matches: [], partial: [], unmatched: []};
            let tempPartials = [];
            let numMatches = matches.length;
            let numPartials = partials.length;

            for (let i = 0; i < numMatches; i++) {
                let possibleMatch = matches[i];
                let tempActiveObj = {};
                let key = Object.keys(matches[i])[0];
                let compareResult = xcHelper.deepCompare(possibleMatch[key], jsonObjs[key]);
                if (compareResult) {
                    activeObj.matches.push(possibleMatch);
                } else if (jsonObjs.hasOwnProperty(key)) {
                    for (let j in comparisonObjs) {
                        let tempObj = comparisonObjs[j].matches.splice(i, 1)[0];
                        comparisonObjs[j].partial.push(tempObj);
                    }
                    tempActiveObj[key] = jsonObjs[key];
                    tempPartials.push(tempActiveObj);

                    numMatches--;
                    i--;
                } else {
                    for (let j in comparisonObjs) {
                        let tempObj = comparisonObjs[j].matches.splice(i, 1)[0];
                        comparisonObjs[j].unmatched.push(tempObj);
                    }
                    numMatches--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (let i = 0; i < numPartials; i++) {
                let key = Object.keys(partials[i])[0];
                let tempActiveObj = {};

                if (jsonObjs.hasOwnProperty(key)) {
                    tempActiveObj[key] = jsonObjs[key];
                    activeObj.partial.push(tempActiveObj);
                } else {
                    for (let j in comparisonObjs) {
                        let tempObj = comparisonObjs[j].partial.splice(i, 1)[0];
                        comparisonObjs[j].unmatched.push(tempObj);
                    }
                    tempActiveObj[key] = jsonObjs[key];
                    numPartials--;
                    i--;
                }
                delete jsonObjs[key];
            }
            for (let i = 0; i < nonMatches.length; i++) {
                let key = Object.keys(nonMatches[i])[0];
                let tempActiveObj = {};
                if (jsonObjs.hasOwnProperty(key)) {
                    tempActiveObj[key] = jsonObjs[key];
                    activeObj.unmatched.push(tempActiveObj);
                    delete jsonObjs[key];
                }
            }
            activeObj.partial = activeObj.partial.concat(tempPartials);
            activeObj.unmatched = activeObj.unmatched.concat(jsonObjs);
            comparisonObjs[indices] = activeObj;
        } else {
            let numObjs = jsonObjs.length + numExistingComparisons;
            let keys = Object.keys(jsonObjs[0]);
            let numKeys = keys.length;
            let matchedJsons = []; // when both objs have same key and values
            let unmatchedJsons = [];
            let partialMatchedJsons = []; // when both objs have the same key but different values

            for (let i = 0; i < numObjs; i++) {
                matchedJsons.push([]);
                unmatchedJsons.push([]);
                partialMatchedJsons.push([]);
            }
            for (let i = 0; i < numKeys; i++) {
                let key = keys[i];
                let compareResult = xcHelper.deepCompare(jsonObjs[0][key], jsonObjs[1][key]);
                let obj = {};
                let obj2 = {};
                obj[key] = jsonObjs[0][key];
                obj2[key] = jsonObjs[1][key];

                if (compareResult) { // perfect match
                    matchedJsons[0].push(obj);
                    matchedJsons[1].push(obj2);
                    delete jsonObjs[1][key];
                } else if (jsonObjs[1].hasOwnProperty(key)) {
                    // keys match but values do not
                    partialMatchedJsons[0].push(obj);
                    partialMatchedJsons[1].push(obj2);
                    delete jsonObjs[1][key];
                } else {
                    // no match
                    unmatchedJsons[0].push(obj);
                }
            }

            for (let key in jsonObjs[1]) {
                let obj = {};
                obj[key] = jsonObjs[1][key];
                unmatchedJsons[1].push(obj);
            }

            for (let i = 0; i < indices.length; i++) {
                comparisonObjs[indices[i]] = {
                    matches: matchedJsons[i],
                    partial: partialMatchedJsons[i],
                    unmatched: unmatchedJsons[i]
                };
            }
            for (let i = 2; i < numObjs; i++) {
                this._compare(jsonObjs[i], indices[i], true);
            }
        }
    }

    private _displayComparison(jsons: object): void {
        for (let obj in jsons) {
            let html: HTML = "";
            for (let matchType in jsons[obj]) {
                let arrLen = jsons[obj][matchType].length;
                if (matchType === 'matches') {
                    html += '<div class="matched">';
                } else if (matchType === 'partial') {
                    html += '<div class="partial">';
                } else if (matchType === 'unmatched') {
                    html += '<div class="unmatched">';
                }
                for (let k = 0; k < arrLen; k++) {
                    html += xcUIHelper.prettifyJson(jsons[obj][matchType][k],
                    0, null, {comparison: true}, false);
                }
                html += '</div>';
            }
            html = html.replace(/,([^,]*)$/, '$1');// remove last comma
            html = '{<div class="jObject">' + html + '</div>}';

            let $jsonArea = this._getJSONArea();
            let $missingImmediates = $jsonArea.find('.jsonWrap').eq(<any>obj).find(".missingImmediatesSection");
            if ($missingImmediates.length) {
                html += $missingImmediates[0].outerHTML;
            }

            $jsonArea.find('.jsonWrap').eq(<any>obj)
                                       .addClass('comparison')
                                       .find('.prettyJson.secondary')
                                       .html(html);
        }
    }

    private _addDataToJsonWrap($jsonTd: JQuery, isArray: boolean): void {
        let $jsonArea = this._getJSONArea();
        let $jsonWrap = $jsonArea.find('.jsonWrap:last');
        let rowNum = RowManager.parseRowNum($jsonTd.closest('tr'));
        let colNum = ColManager.parseColNum($jsonTd);
        let tableId = TblManager.parseTableId($jsonTd.closest('table'));

        $jsonWrap.data('rownum', rowNum);
        $jsonWrap.data('colnum', colNum);
        $jsonWrap.data('tableid', tableId);
        $jsonWrap.data('isarray', isArray);

        if (this._isDataCol) {
            TblManager.highlightCell($jsonTd, tableId, rowNum, colNum, {
                jsonModal: true,
                isShift: false
            });
            let id = <string>tableId + rowNum + colNum;
            if (this._refCounts[id] == null) {
                this._refCounts[id] = 1;
            } else {
                this._refCounts[id]++;
            }
        }

        let numTotalFields: number = $jsonWrap.find('.primary').find('.jInfo').length;
        numTotalFields -= $jsonWrap.find(".pulled").length;

        $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                 .data('numTotalFields', numTotalFields)
                 .text('0/' + numTotalFields + ' ' + JsonModalTStr.FieldsPull);
        if (numTotalFields === 0) {
            $jsonWrap.find('.multiSelectModeBar .numColsSelected')
                    .text(JsonModalTStr.AllFieldsPulled);
        }
    }

    private _markPulledCols(
        $jsonArea: JQuery,
        isArray: boolean,
        colName: string
    ): void {
        let $jsonWrap: JQuery = $jsonArea.find('.jsonWrap:last');
        let table: TableMeta = this._table;
        let cols: ProgCol[] = table.getAllCols(true);
        $jsonWrap.find(".jsonCheckbox").each((_index, el) => {
            let $checkbox = $(el);
            if ($checkbox.hasClass('prefixCheckbox')) {
                return true;
            } else {
                let $key = $checkbox.siblings('.jKey, .arrayEl');
                if (!$key.length) {
                    $key = $checkbox.siblings();
                }
                if ($key.length) {
                    let backName = this._createJsonSelectionExpression($key).escapedName;
                    backName = xcStringHelper.escapeDblQuoteForHTML(backName);
                    if (!this._isDataCol) {
                        backName = this._parseUnnestTd(backName, colName, isArray);
                    }
                    $checkbox.closest(".jsonBlock").attr("data-backname", backName);
                }
            }
        });

        cols.forEach((progCol) => {
            let backName = progCol.getBackColName();
            backName = xcStringHelper.escapeDblQuoteForHTML(backName);
            backName = xcHelper.escapeColName(backName);
            let $checkbox = $jsonWrap.find('.jsonBlock[data-backname="' + backName + '"]')
                                    .addClass("pulled")
                                    .children(".jsonCheckbox");
            let left = parseInt($checkbox.css("left")) + 5;
            $checkbox.after('<i class="icon xi-tick" style="left:' + left + 'px;"></i>');
        });
    }

    private _parseUnnestTd(
        name: string,
        colName: string,
        isArray: boolean
    ): string {
        let openSymbol: string = "";
        if (!isArray) {
            openSymbol = ".";
        }

        let escapedColName: string = colName + openSymbol + name;
        return escapedColName;
    }

    private _getJsonWrapHtml(prettyJson, rowNum): HTML {
        let html: HTML =
        '<div class="jsonWrap">'+
             '<div class="optionsBar bar">' +
                '<div class="dragHandle jsonDragHandle" data-toggle="tooltip" ' +
                'data-container="body" data-original-title="' +
                CommonTxtTstr.HoldToDrag + '">' +
                    '<i class="icon xi-drag-handle"></i>' +
                '</div>' +
                '<div class="btn btn-small remove" data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.RemoveCol + '">' +
                    '<i class="icon xi-close"></i>' +
                '</div>' +
                '<div class="vertLine"></div>' +
                '<div class="compareIcon single checkbox" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SelectOther + '">' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="btn btn-small sort single" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SortAsc + '">' +
                    '<i class="icon xi-sort"></i>' +
                '</div>' +
                '<div class="btn btn-small pullAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'title="' + JsonModalTStr.PullAll + '">' +
                    '<i class="icon xi-pull-all-field"></i>' +
                '</div>' +
                '<div class="btn btn-small clearAll disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.DeselectAll + '">' +
                    '<i class="icon xi-select-none"></i>' +
                '</div>' +
                '<div class="btn btn-small selectAll" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SelectAll + '">' +
                    '<i class="icon xi-select-all"></i>' +
                '</div>' +
                '<div class="btn btn-small submitMultiPull disabled" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + JsonModalTStr.SubmitPull + '">' +
                    '<i class="icon xi-back-to-worksheet"></i>' +
                    '<i class="icon xi-pull-all-field"></i>' +
                '</div>' +
                '<div class="flexArea">' +
                    '<div class="infoArea">' +
                        '<div class="rowNum">Row:' +
                            '<span class="text">' +
                                xcStringHelper.numToStr(rowNum) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="dropdownBox btn btn-small" ' +
                ' data-toggle="tooltip" data-container="body" ' +
                'data-original-title="' + JsonModalTStr.ToggleMode + '">' +
                    '<i class="icon xi-down"></i>' +
                '</div>' +
            '</div>' +
            '<div class="multiSelectModeBar bar">' +
                '<div class="text numColsSelected">' +
                '</div>' +
            '</div>';
        if (this._isDataCol) {
            html +=
            '<div class="tabBar bar">' +
                '<div class="tabs">' +
                    '<div class="tab seeAll active" ' +
                    'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'title="' + JsonModalTStr.ViewAllTip + '">' +
                        '<span class="text">' + JsonModalTStr.ViewAll +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="prettyJson primary">' +
                prettyJson +
            '</div>' +
            '<div class="prettyJson secondary"></div>';
        } else {
            html += '<div class="prettyJson primary">' +
                prettyJson +
            '</div>';
        }
        html += '<ul class="jsonModalMenu menu">' +
                '<li class="selectionOpt" data-action="selectMode">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">' + JsonModalTStr.SelectionMode +
                    '</span>' +
                '</li>' +
                '<li class="multiSelectionOpt" data-action="multiSelectMode">' +
                    '<i class="check icon xi-tick fa-10"></i>' +
                    '<span class="text">' + JsonModalTStr.MultiSelectMode +
                    '</span>' +
                '</li>'
            '</ul>' +
        '</div>';

        return html;
    }

    // adjusting positions after drag and drop
    private _resortJsons(initialIndex: number, newIndex: number): void {
        let json = this._jsonData.splice(initialIndex, 1)[0];
        this._jsonData.splice(newIndex, 0, json);

        let cols = this._selectedCols.splice(initialIndex, 1)[0];
        this._selectedCols.splice(newIndex, 0, cols);

        if (initialIndex === newIndex) {
            return;
        }

        let comparisonObjs = this._comparisonObjs;
        let tempObj = comparisonObjs[initialIndex];
        delete comparisonObjs[initialIndex];

        if (initialIndex > newIndex) {
            for (let i = initialIndex - 1; i >= newIndex; i--) {
                if (comparisonObjs[i]) {
                    comparisonObjs[i + 1] = comparisonObjs[i];
                    delete comparisonObjs[i];
                }
            }
        } else if (initialIndex < newIndex) {
            for (let i = initialIndex + 1; i <= newIndex; i++) {
                if (comparisonObjs[i]) {
                    comparisonObjs[i - 1] = comparisonObjs[i];
                    delete comparisonObjs[i];
                }
            }
        }
        if (tempObj) {
            comparisonObjs[newIndex] = tempObj;
        }
    }

    private _toggleModal($jsonTd: JQuery, isHide: boolean, time: number): void {
        if (this._isDataCol && !isHide) {
            this._modalHelper.toggleBG("all", false, {"time": time});
        }
        let noTimer: boolean = false;
        if (time === 0) {
            noTimer = true;
        }

        let $modal = this._getModal();
        let $table: JQuery;
        let $tableWrap: JQuery;
        if (isHide) {
            $table = $('.xcTable').removeClass('jsonModalOpen');
            $tableWrap = $('.xcTableWrap').removeClass('jsonModalOpen');
            if (!$("#container").hasClass("columnPicker")) {
                $table.find('.modalHighlighted')
                  .removeClass('modalHighlighted jsonModalOpen');
            } else {
                $(".jsonElement").removeClass("modalHighlighted");
            }
            $('.modalOpen').removeClass('modalOpen');
            $('.tableCover.jsonCover').remove();
            $tableWrap.find('.xcTbodyWrap').off('scroll.preventScrolling');
        } else {
            if (this._isDataCol) {
                $tableWrap = $('.xcTableWrap:visible:not(.tableLocked)')
                                  .addClass('jsonModalOpen');
                $table = $tableWrap.find('.xcTable').addClass('jsonModalOpen');

                $table.find('.jsonElement').addClass('modalHighlighted');
                let $tableCover = $('<div class="tableCover jsonCover" style="opacity:0;"></div>');

                $tableWrap.find('.xcTbodyWrap').append($tableCover);
                $tableWrap.each(function() {
                    let tbodyHeight = $(this).find('.xcTable tbody').height();
                    $(this).find('.tableCover.jsonCover').height(tbodyHeight + 1);
                });

                $tableWrap.find('.tableCover.jsonCover').addClass('visible');
                $modal.addClass('hidden').show();

                let hiddenClassTimer: number = 50;
                if (noTimer) {
                    hiddenClassTimer = 0;
                }
                setTimeout(function() {
                    $modal.removeClass('hidden');
                }, hiddenClassTimer);
            } else {
                let shortTimer = 200;
                let longTimer = 300;
                if (noTimer) {
                    shortTimer = 0;
                    longTimer = 0;
                }

                this._getModalBg().addClass('light').fadeIn(longTimer);
                setTimeout(function() {
                    $modal.fadeIn(shortTimer);
                }, shortTimer);

                $jsonTd.addClass('modalHighlighted');
                setTimeout(function() {
                    $jsonTd.addClass('jsonModalOpen');
                });

                // prevent vertical scrolling on the table
                $jsonTd.closest('.xcTbodyWrap').each(function() {
                    let $tbody = $(this);
                    let scrollTop = $tbody.scrollTop();
                    $tbody.on('scroll.preventScrolling', function() {
                        $tbody.scrollTop(scrollTop);
                    });
                });
            }
        }
    }

    private _createJsonSelectionExpression(
        $el: JQuery
    ): {
        name: string,
        escapedName: string
    } {
        let name: string = "";
        let escapedName: string = "";

        // .parents() is different with .closest()
        $el.parents(".jInfo").each(function(){
            let $jInfo = $(this);
            let key: string = "";
            let escapedKey: string = "";
            let needsBrackets: boolean = false;
            let needsDot: boolean = false;

            if ($jInfo.hasClass('arrayVal')) {
                key = $jInfo.data('key');
                needsBrackets = true;

            } else {
                key = $jInfo.data('key');
                needsDot = true;
            }
            key += "";
            escapedKey = xcHelper.escapeColName(key);

            if (needsBrackets) {
                key = "[" + key + "]";
                escapedKey = "[" + escapedKey + "]";
            } else if (needsDot) {
                key = "." + key;
                escapedKey = "." + escapedKey;
            }

            name = key + name;
            escapedName = escapedKey + escapedName;
        });

        if (name.charAt(0) === '.') {
            name = name.substr(1);
            escapedName = escapedName.substr(1);
        }

        let $prefixType = $el.closest('.prefixedType');
        if ($prefixType.length) {
            let $prefixGroup = $el.closest('.prefixGroup');
            let $prefix = $prefixGroup.find('.prefix');
            name = $prefix.text() + gPrefixSign + name;
            escapedName = $prefix.text() + gPrefixSign + escapedName;
        }

        return {
            "name": name,
            "escapedName": escapedName
        };
    }

    private _submitPullSome($jsonWrap: JQuery, index: number): void {
        let rowNum: number = $jsonWrap.data('rownum');
        let tableId: TableId = $jsonWrap.data('tableid');
        let colNum: number = $jsonWrap.data('colnum');
        let rowExists: boolean = $('#xcTable-' + tableId).find('.row' + rowNum).length === 1;

        if (!rowExists) {
            // the table is scrolled past the selected row, so we just
            // take the jsonData from the first visibile row
            let rowManager = new RowManager(this._table, $("#xcTableWrap-" + tableId));
            rowNum = rowManager.getFirstVisibleRowNum() - 1;
        }
        let colNames = [];
        for (let i = 0; i < this._selectedCols[index].length; i++) {
            colNames.push(this._selectedCols[index][i]);
        }

        this._close(this._modes.multiple);
        //set timeout to allow modal to close before unnesting many cols
        setTimeout(function() {
            ColManager.unnest(tableId, colNum, rowNum, colNames);
        }, 0);
    }

    private _addMenuActions(): void {
        let $jsonArea = this._getJSONArea();
        $jsonArea.on("mouseup", ".menu li", (event) => {
            if (event.which !== 1) {
                return;
            }
            let $li = $(event.currentTarget);
            if ($li.hasClass('selected')) {
                return;
            }
            $jsonArea.find('.menu li').removeClass('liSelected');
            $li.addClass('liSelected');

            let $menu = $li.closest('.menu');
            let $jsonWrap = $menu.closest('.jsonWrap');
            $jsonWrap.removeClass('multiSelectMode');
            this._clearAllSelectedCols($jsonWrap);

            if ($li.hasClass('multiSelectionOpt')) {
                $jsonWrap.addClass('multiSelectMode');
                this._selectTab($jsonWrap.find('.seeAll'));
                xcTooltip.changeText($jsonWrap.find('.submitMultiPull'),
                                     JsonModalTStr.SubmitPull);
                if ($jsonWrap.find('.compareIcon.selected').length) {
                    this._compareIconSelect($jsonWrap.find('.compareIcon'));
                }
            }
            $menu.hide();
        });

        $jsonArea.on("mouseenter", ".menu li", function() {
            $(this).addClass("hover");
        });

        $jsonArea.on("mouseleave", ".menu li", function() {
            $(this).removeClass("hover");
        });
    }

    private _removeJSONWrap($el: JQuery): void {
        let $jsonWrap = $el.closest('.jsonWrap');
        let jsonWrapData = $jsonWrap.data();

        // remove highlightbox if no other jsonwraps depend on it
        let id = jsonWrapData.tableid + jsonWrapData.rownum + jsonWrapData.colnum;
        this._refCounts[id]--;
        if (this._refCounts[id] === 0) {
            let $highlightBox = $('#xcTable-' + jsonWrapData.tableid)
                                .find('.row' + jsonWrapData.rownum)
                                .find('td.col' + jsonWrapData.colnum)
                                .find('.jsonModalHighlightBox');
            $highlightBox.closest("td").removeClass("highlightedCell");
            $highlightBox.remove();
            delete this._refCounts[id];
        }

        // handle removal of comparisons
        let index = $jsonWrap.index();
        $jsonWrap.find('.remove').tooltip('destroy');
        if ($jsonWrap.find('.compareIcon.selected').length) {
            $jsonWrap.find('.compareIcon').click();
        }

        $jsonWrap.remove();

        let $jsonArea = this._getJSONArea();
        if ($jsonArea.find('.jsonWrap').length === 1) {
            let $compareIcons = $jsonArea.find('.compareIcon')
                                      .addClass('single');
            $compareIcons.each(function() {
                xcTooltip.changeText($el, JsonModalTStr.SelectOther);
            });
        }

        this._jsonData.splice(index, 1);
        this._selectedCols.splice(index, 1);
        delete this._comparisonObjs[index];

        let numJsons = this._jsonData.length;
        for (let i = index; i <= numJsons; i++) {
            if (this._comparisonObjs[i]) {
                this._comparisonObjs[i - 1] = this._comparisonObjs[i];
                delete this._comparisonObjs[i];
            }
        }
        if (this._comparisonObjs[numJsons]) {
            delete this._comparisonObjs[numJsons];
        }

        this._decreaseModalSize();
        this._updateSearchResults();
        this._searchText();
    }

    private _addModalDocumentEvent(): void {
        $(document).on("keydown.jsonModal", (event) => {
            if (event.which === keyCode.Escape) {
                this._close();
                return false;
            }
        });
    }

    private _addEventListeners(): void {
        this._addCloseEvents();
        this._addResizableEvents();
        this._addSortableEvents();
        this._addSearchEvents();
        this._addJSONAreaEvents();
    }

    private _addCloseEvents(): void {
        let $modal = this._getModal();
        $modal.find(".closeJsonModal").click(() => {
            if (this._getModal().css('display') === 'block') {
                this._close();
            }
        });

        this._getModalBg().click(() => {
            if (!this._isDataCol && this._getModal().css('display') === 'block') {
                this._close();
            }
        });
    }

    private _addResizableEvents(): void {
        let modalMinWidth: number;
        let $tabSets: JQuery;
        let small: boolean = false;

        this._getModal().resizable({
            handles: "n, e, s, w, se",
            minHeight: this._minHeight,
            minWidth: this._minWidth,
            containment: "document",
            start: () => {
                let $jsonWraps = this._getModal().find('.jsonWrap');
                $tabSets = $jsonWraps.find('.tabs');
                modalMinWidth = $jsonWraps.length * this._jsonAreaMinWidth;
            },
            resize: (_event, ui) => {
                if (!small && ui.size.width < modalMinWidth) {
                    $tabSets.addClass('small');
                    small = true;
                } else if (small && ui.size.width > modalMinWidth) {
                    $tabSets.removeClass('small');
                    small = false;
                }
            }
        });
    }

    private _addSortableEvents(): void {
        let initialIndex: number;
        this._getJSONArea().sortable({
            revert: 300,
            axis: "x",
            handle: ".jsonDragHandle",
            start: (_event, ui) => {
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
            },
            stop: (_event, ui) => {
                this._resortJsons(initialIndex, $(ui.item).index());
                $(ui.item).css('top', 'auto');
            }
        });
    }

    private _addSearchEvents(): void {
        let $searchArea = this._getJSONSearchEl();
        this._searchHelper = new SearchBar($searchArea, {
            "removeSelected": () => {
                this._getJSONText().find('.selected').removeClass('selected');
            },
            "highlightSelected": ($match) => {
                $match.addClass('selected');
            },
            "scrollMatchIntoView": ($match) => {
                this._scrollMatchIntoView($match);
            },
            "toggleSliderCallback": () => {
                this._searchText();
            },
            "onInput": () => {
                this._searchText();
            }
        });

        this._getModal().find('.closeBox').click(() => {
            if (this._getJSONSerachInput().val() === "") {
                this._searchHelper.toggleSlider();
            } else {
                this._searchHelper.clearSearch(() => {
                    this._clearSearch(true);
                });
            }
        });
    }

    private _addJSONAreaEvents(): void {
        let self = this;
        let $jsonArea = this._getJSONArea();
        $jsonArea.on({
            "click": (event) => {
                let $el = $(event.currentTarget);
                this._selectJsonKey($el, event);
            }
        }, ".jKey, .arrayEl");

        $jsonArea.on('click', '.jsonCheckbox', (event) => {
            let $checkbox = $(event.currentTarget);
            if (!$checkbox.hasClass('prefixCheckbox')) {
                let $key = $checkbox.siblings('.jKey, .arrayEl');
                if (!$key.length) {
                    $key = $checkbox.siblings();
                }
                if ($key.length) {
                    this._selectJsonKey($key, event);
                }
            }
        });

        $jsonArea.on("click", ".compareIcon", (event) => {
            this._compareIconSelect($(event.currentTarget));
        });

        $jsonArea.on("click", ".sort", (event) => {
            this._sortData($(event.currentTarget));
        });

        $jsonArea.on("click", ".pullAll", (event) => {
            let $jsonWrap = $(event.currentTarget).closest('.jsonWrap');
            let rowNum: number = $jsonWrap.data('rownum');
            let colNum: number = $jsonWrap.data('colnum');
            let tableId: TableId = $jsonWrap.data('tableid');
            let rowExists = $('#xcTable-' + tableId).find('.row' + rowNum).length === 1;

            if (!rowExists) {
                // the table is scrolled past the selected row, so we just
                // take the jsonData from the first visibile row
                let rowManager = new RowManager(self._table, $("#xcTableWrap-" + tableId));
                rowNum = rowManager.getFirstVisibleRowNum() - 1;
            }

            this._close(this._modes.single);
            //set timeout to allow modal to close before unnesting many cols
            setTimeout(() => {
                ColManager.unnest(tableId, colNum, rowNum, null);
            }, 0);
        });

        $jsonArea.on("click", ".remove", (event) => {
            let $el = $(event.currentTarget);
            this._removeJSONWrap($el);
        });

        $jsonArea.on("click", ".clearAll", (event) => {
            this._clearAllSelectedCols($(event.currentTarget).closest('.jsonWrap'));
        });

        $jsonArea.on("click", ".selectAll", (event) => {
            this._selectAllFields($(event.currentTarget).closest('.jsonWrap'));
        });

        $jsonArea.on("click", ".dropdownBox", (event) => {
            let $icon = $(event.currentTarget);
            let $menu = $icon.closest('.jsonWrap').find('.menu');
            let isVisible = $menu.is(":visible");
            $jsonArea.find('.menu').hide();
            if (isVisible) {
                $menu.hide();
            } else {
                $menu.show();
            }
        });

        $jsonArea.on("click", ".submitMultiPull", (event) => {
            let $jsonWrap = $(event.currentTarget).closest('.jsonWrap');
            let index = $jsonWrap.index();
            this._submitPullSome($jsonWrap, index);
        });

        $jsonArea.on("mousedown", ".tab", (event) => {
            this._selectTab($(event.currentTarget));
        });

        $jsonArea.on('mouseenter', '.tooltipOverflow', (evet) => {
            xcTooltip.auto(<any>evet.currentTarget, <any>$(evet.currentTarget).find('.text')[0]);
        });

        $jsonArea.on("mousedown", ".jsonDragHandle", () => {
            let cursorStyle =
                '<style id="moveCursor" type="text/css">*' +
                    '{cursor:move !important; ' +
                    'cursor: -webkit-grabbing !important;' +
                    'cursor: -moz-grabbing !important;}' +
                    '.tooltip{display: none !important;}' +
                '</style>';
            $(document.head).append(cursorStyle);

            $(document).on("mouseup.dragHaFndleMouseUp", () => {
                $('#moveCursor').remove();
                $(document).off('.dragHandleMouseUp');
            });
        });
    }
}
