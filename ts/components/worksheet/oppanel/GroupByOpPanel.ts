class GroupByOpPanel extends GeneralOpPanel {
    private _tableId: TableId;
    protected _dagNode: DagNodeGroupBy;
    protected _opCategories: number[] = [FunctionCategoryT.FunctionCategoryAggregate];

    public constructor() {
        super();
        this._operatorName = "groupBy";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#groupByOpPanel");

        // adds field to group on input
        this._$panel.on("click", ".addGroupArg", function() {
            self.model.addGroupOnArg();
            self._focusNextInput(0);
        });

        this._functionsInputEvents();

        // icv, includeSample
        this._$panel.on('click', '.checkboxSection', function() {
            const $section = $(this);
            const $checkbox = $section.find('.checkbox');
            let checked: boolean = $checkbox.hasClass("checked");
            if (self.model.getModel().groupAll && !checked &&
                ($section.hasClass("incSample") ||
                $section.hasClass("joinBack"))) {
                xcTooltip.transient($section,
                    {title: "Unavailable when 'Fields to group on' is set to 'None'"},
                    3000);
                return;
            }
            $checkbox.toggleClass("checked");
            checked = !checked;

            if ($section.hasClass("incSample")) {
                self.model.toggleIncludeSample(checked);
                self._$panel.find(".joinBack .checkbox").removeClass("checked");
            } else if ($section.hasClass("icvMode")) {
                self.model.toggleICV(checked);
            } else if ($section.hasClass("joinBack")) {
                self.model.toggleJoinBack(checked);
                self._$panel.find(".incSample .checkbox").removeClass("checked");
            }

            self._checkIfStringReplaceNeeded();
        });

        // for group by advanced options
        this._$panel.find('.advancedTitle').click(function() {
            const $advancedSection = $(this).closest(".advancedSection");
            if ($advancedSection.hasClass('collapsed')) {
                $advancedSection.addClass('expanded').removeClass('collapsed');
            } else {
                $advancedSection.addClass('collapsed').removeClass('expanded');
            }
        });

        this._$panel.on("click", ".distinct", function() {
            const $checkbox = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
            const $group = $checkbox.closest(".group");
            const groupIndex = self._$panel.find(".group").index($group);
            self.model.toggleDistinct($checkbox.hasClass("checked"), groupIndex);
        });

        this._$panel.on("click", ".groupByAll", function() {
            const $checkbox = $(this).find(".checkbox");
            self._toggleGroupAll($checkbox);
            self.model.toggleGroupAll($checkbox.hasClass("checked"));
        });
    }

    /**
     *
     * @param node
     */
    public show(node: DagNode, options: ShowPanelInfo): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        super.show(node, options)
        .then(() => {
            this.model = new GroupByOpPanelModel(this._dagNode, (all) => {
                this._render(all);
            }, options);

            super._panelShowHelper(this.model);
            this._render(true);
            this._focusNextInput(0);
            this._checkPanelOpeningError();
            deferred.resolve();
        })
        .fail(() => {
            deferred.reject();
        });
        return deferred.promise();
    };

    // functions that get called after list udfs is called during op view show
    protected _render(updateAll?: boolean) {
        const self = this;
        const model = this.model.getModel();
        const scrollTop = this._$panel.find(".opSection").scrollTop();
        this._resetForm();

        const icv = model.icv;
        const includeSample = model.includeSample;
        const joinBack = model.joinBack;
        const groupAll = model.groupAll;
        const $ul = this._$panel.find('.gbOnArg').first().siblings(".list");
        this._addSuggestListForGroupOnArg($ul);

        if (updateAll) {
            this._$panel.find('.gbOnArg').val("");
        }

        for (let i = 0; i < model.groupOnCols.length; i++) {
            if (i > 0) {
                this._addGroupOnArg();
            }
            let name = model.groupOnCols[i];
            if (name) {
                name = gColPrefix + name
            }
            this._$panel.find('.gbOnArg').last().val(name);
            this._checkHighlightTableCols(this._$panel.find('.gbOnArg').last());
        }
        this._$panel.find('.gbOnArg').last().blur();

        for (let i = 0; i < model.groups.length; i++) {
            if (i > 0) {
                this._addExtraGroup();
            }
            const $group = this._$panel.find('.group').eq(i);
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const operObj = self._getOperatorObj(operator);
            if (!operObj) {
                return;
            }

            const $funcInput: JQuery = $group.find(".functionsInput");
            $funcInput.val(operator);
            $funcInput.data("value", operator.trim().toLowerCase());

            if (this._isOperationValid(i)) {
                self._updateArgumentSection(i);
            }

            const $args = $group.find(".argsSection").find(".arg").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            let allColTypes = []; // for casting
            let inputNums = []; // for casting
            let inputNumAdjustment = 0;
            if (i === 0) {
                inputNumAdjustment = model.groupOnCols.length;
            }
            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg:  OpPanelArg = model.groups[i].args[j];
                let argVal: string = arg.getValue();
                if ($args.eq(j).length) {
                    if (updateAll && arg.isCast()) {
                        let colType = self.model.getColumnTypeFromArg(arg.getFormattedValue());
                        let requiredTypes = self._parseType(arg.getTypeid());
                        allColTypes.push({
                            inputTypes: [colType],
                            requiredTypes: requiredTypes,
                            inputNum: j + inputNumAdjustment,
                            cast: arg.getCast()
                        });
                        inputNums.push(j + inputNumAdjustment);
                    }
                    $args.eq(j).val(argVal);
                    if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                        if (argVal === "true") {
                            $args.eq(j).closest(".row")
                                    .find(".boolArgWrap .checkbox")
                                    .addClass("checked");
                        }
                    }
                }
            }
            if (inputNums.length) {
                this._showCastRow(allColTypes, i, inputNums, true);
            }

            $group.find(".resultantColNameRow .arg")
                  .val(model.groups[i].newFieldName);
            if (model.groups[i].distinct) {
                $group.find(".distinct .checkbox").addClass("checked");
            }
        }

        if (icv) {
            this._$panel.find(".icvMode .checkbox").addClass("checked");
        }

        if (includeSample) {
            this._$panel.find(".incSample .checkbox").addClass("checked");
        }

        if (joinBack) {
            this._$panel.find(".joinBack .checkbox").addClass("checked");
        }

        if (groupAll) { // must come after includeSample and joinBack
            // to uncheck those checkbox if needed
            this._toggleGroupAll(this._$panel.find(".groupByAll .checkbox"));
        }

        this._$panel.find(".opSection").scrollTop(scrollTop);
        this._formHelper.refreshTabbing();
        self._checkIfStringReplaceNeeded(true);
    }

    private _functionsInputEvents() {
        const self = this;

        this._$panel.on("mousedown", ".functionsInput", function() {
            const $list = $(this).siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
            }
        });

        this._$panel.on("click", ".functionsInput", function() {
            const $input = $(this);
            const $list = $input.siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
                self._$panel.find('li.highlighted')
                                .removeClass('highlighted');
                // show all list options when use icon to trigger
                $list.show().find('li').sort(self._sortHTML)
                                        .prependTo($list.children('ul'))
                                        .show();
                const fnInputNum = parseInt($input.data('fninputnum'));

                self._functionsListScrollers[fnInputNum]
                            .showOrHideScrollers();

            }
        });

        this._$panel.on("keydown", ".functionsInput", function(event) {
            const $input = $(this);
            if (event.which === keyCode.Enter || event.which ===
                keyCode.Tab) {
                const $li = $input.siblings(".list:visible").find("li.highlighted");
                if ($li.length === 1) {
                    self._fnListMouseup(event, $li);
                    return false;
                }

                const value = $input.val().trim().toLowerCase();
                const prevValue = $input.data("value");
                $input.data("value", value);

                if (value === "") {
                    self._clearFunctionsInput($input.data('fninputnum'));
                    return;
                }
                $input.blur();
                self._hideDropdowns();

                if (prevValue === value && event.which === keyCode.Tab) {
                    return;
                }

                self._enterFunctionsInput($input.data('fninputnum'));
                // prevent modal tabbing
                return (false);
            } else if (event.which === keyCode.Escape) {
                self._hideDropdowns();
                return false;
            }
        });

        this._$panel.on("input", ".functionsInput", function() {
            if (!$(this).is(":visible")) return; // ENG-8642
            self._suggest($(this));
        });

        this._$panel.on("change", ".functionsInput", function() {
            if (!self._allowInputChange) {
                return;
            }

            const $input = $(this);
            const value = $input.val().trim().toLowerCase();
            $input.data("value", value);

            // find which element caused the change event;
            const $changeTarg = gMouseEvents.getLastMouseDownTarget();

            // if change caused by submit btn, don't clear the input and
            // enterFunctionsInput() will do a check for validity
            const onChange = !$changeTarg.closest('.submit').length;

            self._enterFunctionsInput($input.data('fninputnum'), onChange);
        });

        // click icon to toggle functions list
        this._$panel.on('click', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            self._hideDropdowns();

            self._$panel.find('li.highlighted')
                            .removeClass('highlighted');
            // show all list options when use icon to trigger
            $list.show().find('li').sort(self._sortHTML)
                                    .prependTo($list.children('ul'))
                                    .show();
            $list.siblings('input').focus();

            const fnInputNum = parseInt($list.siblings('input')
                                            .data('fninputnum'));
            self._functionsListScrollers[fnInputNum].showOrHideScrollers();
        });

        this._$panel.on('mousedown', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                self._allowInputChange = false;
            } else {
                self._allowInputChange = true;
            }
        });

        // only for category list and function menu list
        this._$panel.on({
            'mousedown': function() {
                // do not allow input change
                self._allowInputChange = false;
            },
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                self._fnListMouseup(event, $(this));
            }
        }, '.functionsList .list li');

        const $functionsList = this._$panel.find('.functionsList');
        let functionsListScroller = new MenuHelper($functionsList, {
            bounds: self._panelContentSelector,
            bottomPadding: 5
        });
        this._functionsListScrollers = [functionsListScroller];
    }

    protected _onArgChange($input) {
        const val = $input.val();
        const $group = $input.closest(".group");
        const groupIndex = this._$panel.find(".group").index($group);

        if ($input.closest(".colNameSection").length) {
            this.model.updateNewFieldName(val, groupIndex);
        } else if ($input.closest(".gbOnArg").length) {
            const argIndex = $group.find(".groupOnSection .arg").index($input);
            this.model.updateGroupOnArg(val, argIndex);
        } else {
            const argIndex = $group.find(".argsSection").find(".arg").index($input);
            this.model.updateArg(val, groupIndex, argIndex);
        }
    }

    protected _populateInitialCategoryField() {
        this._populateFunctionsListUl(0);
    }

    protected _populateFunctionsListUl(groupIndex) {
        const ops = this._getOperatorsLists();
        let html: HTML = "";
        for (let i = 0; i < ops.length; i++) {
            const opsArray = ops[i];
            for (let j = 0, numOps = opsArray.length; j < numOps; j++) {
                html += '<li class="textNoCap">' + opsArray[j].displayName + '</li>';
            }
        }

        this._$panel.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }

    //suggest value for .functionsInput
    protected _suggest($input) {
        const value = $input.val().trim().toLowerCase();
        const $list = $input.siblings('.list');

        this._$panel.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        const $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(this._sortHTML).prependTo($list.find('ul'));
        $visibleLis.eq(0).addClass('highlighted');


        const fnInputNum = parseInt($list.siblings('input')
                                        .data('fninputnum'));
        this._functionsListScrollers[fnInputNum].showOrHideScrollers();

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order
        for (let i = $visibleLis.length; i >= 0; i--) {
            const $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
    }

    // index is the argument group numbers
    protected _enterFunctionsInput(index: number, onChange?: boolean) {
        const func = $.trim(this._$panel.find('.group').eq(index)
                                      .find('.functionsInput').val());
        const operObj = this._getOperatorObj(func);
        if (!operObj) {
            if (!onChange) {
                this._showFunctionsInputErrorMsg(index);
            }
            this._clearFunctionsInput(index, onChange);
        } else {
            this.model.enterFunction(func, operObj, index);
            this._focusNextInput(index);
            this._scrollToGroup(index, true);
        }
    }

    protected _clearFunctionsInput(groupNum, keep?: boolean) {
        const $argsGroup = this._$panel.find('.group').eq(groupNum);
        const $input = $argsGroup.find(".functionsInput");
        if (!keep) {
            $argsGroup.find('.functionsInput')
                      .val("").attr('placeholder', "");
        }
        const val = $input.val().trim();

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').addClass('inactive');
        $argsGroup.find('.argsSection').empty();
        this._$panel.find('.gbCheckboxes').addClass('inactive');
        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find(".advancedSection").addClass("inactive");
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data("value", "");
        this._hideDropdowns();
        this.model.enterFunction(val, null, groupNum);
        this._checkIfStringReplaceNeeded(true);
    }

    protected _showFunctionsInputErrorMsg(groupNum) {
        let text = ErrTStr.NoSupportOp;
        let $target;
        groupNum = groupNum || 0;
        $target = this._$panel.find('.group').eq(groupNum)
                              .find(".functionsInput");

        if ($.trim($target.val()) === "") {
            text = ErrTStr.NoEmpty;
        }

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                                preventImmediateHide: true});
    }


    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex) {
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);
        const categoryNum = FunctionCategoryT.FunctionCategoryAggregate;
        const func = $argsGroup.find('.functionsInput').val().trim();
        const ops = GeneralOpPanel.getOperatorsMap()[categoryNum];

        const operObj = ops[func];
        const $argsSection = $argsGroup.find('.argsSection');
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);

        this._$panel.find(".advancedSection").removeClass("inactive");
        this._$panel.find('.icvMode').removeClass('inactive');
        this._$panel.find('.gbCheckboxes').removeClass('inactive');

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs + 1;

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows);

        const strPreview = this._groupByArgumentsSetup(numArgs, operObj, $rows);
        numArgs += 2;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<span>' + OpFormTStr.Descript + ':</span> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        const $strPreview = this._$panel.find('.strPreview');
        if ($strPreview.text() === "") {
            const initialText = '<span class="prevTitle">' + OpFormTStr.CMD +
                               ':<br></span>' +
                               '<span class="aggColSection"></span>' +
                               'GROUP BY (' +
                     '<span class="groupByCols"></span>)';
            $strPreview.html(initialText);
        }
        $strPreview.find(".aggColSection").append(strPreview);
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection = $argsGroup.find('.argsSection');
        let argsHtml: HTML = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        if (groupIndex > 0) {
            this._suggestLists[groupIndex] = [];
        }

        this._$panel.find('.list.hint.new').each(function() {
            const scroller = new MenuHelper($(this), {
                bounds: self._panelContentSelector,
                bottomPadding: 5
            });
            self._suggestLists[groupIndex].push(scroller);
            $(this).removeClass('new');
        });
    }


   // sets up the args generated by backend, not front end arguments
    protected _setupBasicArgInputsAndDescs(numArgs, operObj, $rows) {
        let description;
        let typeId;
        let types;
        for (let i = 0; i < numArgs; i++) {
            if (operObj.argDescs[i]) {
                description = operObj.argDescs[i].argDesc;
                typeId = operObj.argDescs[i].typesAccepted;
            } else {
                description = "";
                const keyLen = Object.keys(DfFieldTypeT).length;
                typeId = Math.pow(2, keyLen + 1) - 1;
            }
            types = this._parseType(typeId);
            const $input = $rows.eq(i).find('.arg');

            $input.val("");

            $input.data("typeid", typeId);

            // special case to ignore removing autoquotes from
            // function-like arguments if it is 2nd regex input
            if (operObj.displayName === "regex" && i === 1) {
                $input.data("nofunc", true);
            }

            const $row = $rows.eq(i);

            $row.find('.description').text(description + ':');

            // automatically show empty checkbox if optional detected
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.OptionalArg)
            {
                if (types.length === 1 && types[0] === ColumnType.boolean ||
                    (types.length === 2 &&
                        types.indexOf(ColumnType.boolean) > -1 &&
                        types.indexOf(ColumnType.undefined) > -1)) {
                    // one case is the "contains" function
                    this._addBoolCheckbox($input);
                } else if (i !== 1 || operObj.displayName !== "listAgg") {
                    this._showEmptyOptions($input);
                }
            } else {
                $row.addClass("required").find(".noArgWrap").remove();
            }

            if (types.indexOf(ColumnType.string) === -1) {
                $row.find('.emptyStrWrap').remove();
            }

            // add "addArg" button if *arg is found in the description
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.VariableArg ||
                (description.indexOf("*") === 0 &&
                description.indexOf("**") === -1)) {
                $input.addClass("variableArgs");
                $row.after(BaseOpPanel.createAddClauseButton(typeId));
                if (description.indexOf("*") === 0 &&
                    description.indexOf("**") === -1) {
                    const $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

    private _autoGenNewGroupByName($aggArg) {
        const $argSection = $aggArg.closest(".argsSection");
        const $newColName = $argSection.find(".colNameSection .arg");
        if ($newColName.hasClass("touched")) {
            // when user have touched it, don't autoRename
            return;
        }

        const fnName = $argSection.closest(".groupbyGroup")
                                .find(".functionsList input").val();
        let autoGenColName = $aggArg.val().trim();
        if (xcHelper.hasValidColPrefix(autoGenColName)) {
            autoGenColName = this._parseColPrefixes(autoGenColName);
        }
        autoGenColName = xcHelper.parsePrefixColName(autoGenColName).name;
        autoGenColName = this._getAutoGenColName(autoGenColName + "_" + fnName);
        autoGenColName = xcHelper.stripColName(autoGenColName);

        $argSection.find(".colNameSection .arg").val(autoGenColName);
        this._onArgChange($newColName);
    }

    private _groupByArgumentsSetup(numArgs, operObj, $rows) {
        // agg input
        const $gbOnRow = $rows.eq(0);
        $gbOnRow.find(".arg").addClass("gbAgg").focus();
        $gbOnRow.before('<div class="row checkboxWrap distinct">' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-11"></i>' +
                '<i class="icon xi-ckbox-selected fa-11"></i>' +
            '</div>' +
            '<div class="text">Distinct ' +
                '<i class="hint qMark icon xi-unknown new" ' +
                xcTooltip.Attrs + ' data-original-title="' +
                TooltipTStr.Distinct + '"></i>' +
            '</div>' +
        '</div>');

        if (operObj.fnName === "listAgg" && operObj.argDescs[1] &&
            operObj.argDescs[1].argDesc === "delim") {
            // hide column suggest dropdown for delim field
            $rows.eq(1).find(".dropDownList").addClass("noSuggest");
        }

        const description = OpFormTStr.NewColName + ":";
        // new col name field
        const $newColRow = $rows.eq(numArgs);
        const icon = xcUIHelper.getColTypeIcon(operObj.outputType);

        $newColRow.addClass("resultantColNameRow")
                .find(".dropDownList").addClass("colNameSection")
                .prepend('<div class="iconWrapper"><i class="icon ' + icon +
                       '"></i></div>')
                .end()
                .find(".description").text(description);

        $newColRow.find(".arg").on("change", function() {
            $(this).addClass("touched");
        });

        const strPreview = '<span class="aggColStrWrap">' + operObj.displayName + '(' +
                        '<span class="aggCols">' +
                            $rows.eq(1).find(".arg").val() +
                        '</span>' +
                        '), </span>';
        return (strPreview);
    }


    private _checkArgsHasCol(colName) {
        let found = false;
        this._$panel.find(".arg").each(function() {
            const $arg = $(this);
            if ($arg.data("colname") === colName) {
                found = true;
                return false;
            }
        });
        return found;
    }

    private _checkHighlightTableCols($input) {
        let arg = $input.val().trim();
        const prevColName = $input.data("colname");
        $input.data("colname", null);
        const $table = $("#xcTable-" + this._tableId);
        if (prevColName && !this._checkArgsHasCol(prevColName)) {
            const colNum = this._getColNum(prevColName);
            $table.find(".col" + colNum).removeClass("modalHighlighted");
        }

        // XXX TODO fix this
        return;

        if (xcHelper.hasValidColPrefix(arg)) {
            arg = this._parseColPrefixes(arg);
            const colNum = this.model.getColumnNumByName(arg);
            if (colNum > -1) {
                $input.data("colname", arg);
                $table.find(".col" + colNum).addClass("modalHighlighted");
            }
        }
    }

    private _getAutoGenColName(name) {
        const limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        let newName = name;

        let tries = 0;
        while (tries < limit && (this.model.getColumnByName(newName) ||
            this._checkColNameUsedInInputs(newName))) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    private _checkColNameUsedInInputs(name, $inputToIgnore?: JQuery) {
        name = xcHelper.stripColName(name);
        const $inputs = this._$panel.find(".resultantColNameRow")
                                      .find("input");
        let dupFound = false;
        $inputs.each(function() {
            if ($inputToIgnore && $(this).is($inputToIgnore)) {
                return;
            }
            const val = $(this).val();
            if (val === name) {
                dupFound = true;
                return false;
            }
        });
        return dupFound;
    }

    protected _updateStrPreview(noHighlight?: boolean) {
        const self = this;
        const $description = this._$panel.find(".strPreview");
        let tempText;
        let $groups;

        const $activeArgs = this._$panel.find(".group").filter(function() {
            return !$(this).find(".argsSection").hasClass("inactive");
        });
        if (!$activeArgs.length) {
            this._$panel.find('.strPreview').empty();
            return;
        }

        $groups = this._$panel.find(".group").filter(function() {
            return (!$(this).find('.argsSection.inactive').length);
        });

        const aggColNewText = [];
        $groups.each(function() {
            let aggCol = $(this).find('.argsSection').find('.arg').eq(0).val().trim();
            aggCol = self._parseAggPrefixes(aggCol);
            aggCol = self._parseColPrefixes(aggCol);
            aggColNewText.push(aggCol);
        });

        const gbColOldText = $description.find(".groupByCols").text();
        let gbColNewText = "";
        const $args = this._$panel.find('.groupOnSection').find('.arg');
        $args.each(function() {
            if ($(this).val().trim() !== "") {
                gbColNewText += ", " + $(this).val().trim();
            }
        });
        if (gbColNewText) {
            gbColNewText = gbColNewText.slice(2);
        }

        gbColNewText = this._parseAggPrefixes(gbColNewText);
        gbColNewText = this._parseColPrefixes(gbColNewText);

        if (noHighlight) {
            let html = "";
            $groups.each(function(groupNum) {
                const fnName = $(this).find(".argsSection").data("fnname");
                html += '<span class="aggColStrWrap">' +fnName + '(<span class="aggCols">' +
                                self._wrapText(aggColNewText[groupNum]) +
                                '</span>), </span>';
            });

            $description.find(".aggColSection").html(html);

            gbColNewText = this._wrapText(gbColNewText);
            $description.find(".groupByCols").html(gbColNewText);
        } else {
            $groups.each(function(groupNum) {
                const $aggColWrap = $description.find(".aggCols").eq(groupNum);
                const $aggColSpans = $aggColWrap.find('span.char');
                const aggColOldText = $aggColWrap.text();

                self._modifyDescText(aggColOldText, aggColNewText[groupNum],
                                $aggColWrap, $aggColSpans);
            });
            const $gbColWrap = $description.find(".groupByCols");
            const $gbColSpans = $gbColWrap.find('span.char');
            this._modifyDescText(gbColOldText, gbColNewText, $gbColWrap,
                            $gbColSpans);
        }
        return (tempText);
    }

    protected _validate(isSubmit?: boolean): boolean {
        const self = this;
        if (this._isAdvancedMode()) {
            const error: {error: string} = this.model.validateAdvancedMode(this._editor.getValue(), isSubmit);
            if (error != null) {
                StatusBox.show(error.error, this._$panel.find(".advancedEditor"));
                return false;
            }
        } else {
            let error = this.model.validateGroupOnCols();
            if (!error) {
                error = this.model.validateGroups();
            }
            if (!error) {
                error = this.model.validateNewFieldNames();
            }
            if (error) {
                const model = this.model.getModel();
                const groups = model.groups;
                const $group = this._$panel.find(".group").eq(error.group);
                let $input = $group.find(".argsSection").find(".arg").eq(error.arg);
                let inputNumAdjustment = 0;
                if (error.group === 0) {
                    inputNumAdjustment = model.groupOnCols.length;
                }
                switch (error.type) {
                    case ("groupOnCol"):
                        $input = this._$panel.find(".groupOnSection")
                                            .find(".arg").eq(error.arg);
                        self._statusBoxShowHelper(error.error, $input);
                        break;
                    case ("function"):
                        self._showFunctionsInputErrorMsg(error.group);
                        break;
                    case ("blank"):
                        self._handleInvalidBlanks([$input]);
                        break;
                    case ("other"):
                        self._statusBoxShowHelper(error.error, $input);
                        break;
                    case ("columnType"):
                        let allColTypes = [];
                        let inputNums = [];
                        const group = groups[error.group];

                        for (var i = 0; i < group.args.length; i++) {
                            let arg = group.args[i];
                            if (arg.getType() === "column") {
                                let colType = self.model.getColumnTypeFromArg(arg.getFormattedValue());
                                let requiredTypes = self._parseType(arg.getTypeid());
                                allColTypes.push({
                                    inputTypes: [colType],
                                    requiredTypes: requiredTypes,
                                    inputNum: i + inputNumAdjustment
                                });
                                if (!arg.checkIsValid() && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                                    inputNums.push(i + inputNumAdjustment);
                                }
                            }
                        }
                        self._handleInvalidArgs(true, $input, error.error, error.group, allColTypes, inputNums);
                        break;
                    case ("valueType"):
                        self._handleInvalidArgs(false, $input, error.error);
                        break;
                    case ("newField"):
                        StatusBox.show(error.error, $group.find(".colNameSection .arg"), false, {preventImmediateHide: true});
                        break;
                    case ("missingFields"):
                    default:
                        StatusBox.show(error.error, $group);
                        console.warn("unhandled error found", error, false, {preventImmediateHide: true});
                        break;
                }
                return false;
            }
        }

        return true;
    }

    private _getColNum(backColName: string): number {
        return this.model.getColumnNumByName(backColName);
    }

    protected _handleInvalidBlanks(invalidInputs) {
        const $input = invalidInputs[0];
        const hasEmptyOption = !$input.closest('.colNameSection').length &&
                            !$input.closest('.gbOnRow').length &&
                            (!$input.closest(".required").length ||
                                $input.closest(".row").find(".emptyStr").length);
        let errorMsg;
        if (hasEmptyOption) {
            this._showEmptyOptions($input);
            errorMsg = ErrTStr.NoEmptyOrCheck;
        } else {
            errorMsg = ErrTStr.NoEmpty;
        }
        this._statusBoxShowHelper(errorMsg, $input);
        this._formHelper.enableSubmit();
    }

    protected _resetForm() {
        const self = this;
        super._resetForm();

        this._$panel.find(".gbOnRow").show();
        this._$panel.find(".addGroupArg").show();
        const $groupAllBox = this._$panel.find(".groupByAll .checkbox");
        if ($groupAllBox.hasClass("checked")) {
            this._toggleGroupAll($groupAllBox);
        }

        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find('.gbCheckboxes').addClass('inactive');
        this._$panel.find(".advancedSection").addClass("inactive");

        this._$panel.find('.group').each(function(i) {
            if (i !== 0) {
                self._removeGroup($(this), true);
            }
        });
    }

    private _getArgInputHtml(typeId?) {
        if (typeId == null) {
            typeId = -1;
        }

        const html =
            '<div class="row gbOnRow extraArg clearfix">' +
                '<div class="inputWrap">' +
                    '<div class="dropDownList">' +
                      '<input class="arg gbOnArg' +
                      '" type="text" tabindex="10" ' +
                        'spellcheck="false" data-typeid="' + typeId + '">' +
                      '<div class="list hint new">' +
                       '<ul></ul>' +
                        '<div class="scrollArea top">' +
                          '<i class="arrow icon xi-arrow-up"></i>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                          '<i class="arrow icon xi-arrow-down"></i>' +
                        '</div>' +
                     '</div>' +
                    '</div>' +
                    '<i class="icon xi-cancel"></i>' +
                '</div>' +
                '<div class="cast new">' +
                    '<span class="label">Cast: </span>' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list"></ul>' +
                    '</div>' +
                '</div>' +
            '</div>';
        return html;
    }

    private _getGroupbyGroupHtml(index) {
        const html =
        '<div class="group groupbyGroup">' +
            '<div class="catFuncHeadings clearfix subHeading">' +
              '<div class="groupbyFnTitle">' +
                'Aggregate Function:</div>' +
              '<div class="altFnTitle">Aggregate Function</div>' +
              '<i class="icon xi-close removeExtraGroup"></i>' +
            '</div>' +
            '<div class="dropDownList firstList functionsList" ' +
                'data-fnlistnum="' + index + '">' +
              '<input class="text inputable autocomplete functionsInput" ' +
                    'data-fninputnum="' + index + '" tabindex="10" ' +
                    'spellcheck="false">' +
              '<div class="iconWrapper dropdown">' +
                '<i class="icon xi-arrow-down"></i>' +
              '</div>' +
              '<div class="list genFunctionsMenu">' +
                '<ul data-fnmenunum="' + index + '"></ul>' +
                '<div class="scrollArea top">' +
                  '<i class="arrow icon xi-arrow-up"></i>' +
                '</div>' +
                '<div class="scrollArea bottom">' +
                  '<i class="arrow icon xi-arrow-down"></i>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="descriptionText"></div>' +
            '<div class="argsSection inactive"></div>' +
        '</div>';
        return html;
    }

    protected _removeExtraArgEventHandler($btn) {
        const $row: JQuery = $btn.closest(".gbOnRow");
        const index: number = this._$panel.find(".gbOnRow").index($row);
        this.model.removeGroupOnArg(index);
        this._$panel.find("input").blur();
    }

    protected _addExtraGroupEventHandler() {
        this.model.addGroup();
        this._$panel.find('.group').last().find('.functionsInput').focus();
        this._scrollToGroup(this._$panel.find(".group").length - 1);
    }

    private _addExtraGroup() {
        const self = this;
        const newGroupIndex = this._$panel.find('.group').length;
        this._$panel.find('.group').last()
                        .after(this._getGroupbyGroupHtml(newGroupIndex));
        this._populateFunctionsListUl(newGroupIndex);

        const functionsListScroller = new MenuHelper(
            this._$panel.find('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                bounds: self._panelContentSelector,
                bottomPadding: 5
            }
        );

        this._functionsListScrollers.push(functionsListScroller);
        this._suggestLists.push([]);// array of groups, groups has array of inputs

        if (this._$panel.find(".strPreview .aggColSection").length) {
            this._$panel.find(".strPreview .aggColSection").append('<span class="aggColStrWrap"></span>');
        } else {
            this._$panel.find(".strPreview").append('<span class="aggColStrWrap"></span>');
        }
    }

    private _addGroupOnArg() {
        const html = this._getArgInputHtml();
        const $group = this._$panel.find(".group").eq(0);
        $group.find('.gbOnRow').last().after(html);
        $group.find('.gbOnArg').last().focus();

        const $ul = $group.find('.gbOnArg').last().siblings(".list");
        this._addSuggestListForGroupOnArg($ul);
        this._addCastDropDownListener();
    }

    private _addSuggestListForGroupOnArg($ul) {
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($ul.closest('.group'));
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        const scroller = new MenuHelper($ul, {
            bounds: this._panelContentSelector,
            bottomPadding: 5
        });
        if (!this._suggestLists[groupIndex]) {
            this._suggestLists[groupIndex] = [];
        }

        this._suggestLists[groupIndex].splice(argIndex, 0, scroller);
        $ul.removeClass('new');
    }

    private _toggleGroupAll($checkbox: JQuery): void {
        $checkbox.toggleClass("checked");
        if ($checkbox.hasClass("checked")) {
            this._$panel.find(".gbOnRow").hide();
            this._$panel.find(".addGroupArg").hide();
            this._$panel.find(".joinBack .checkbox").removeClass("checked");
            this._$panel.find(".incSample .checkbox").removeClass("checked");
        } else {
            this._$panel.find(".gbOnRow").show();
            this._$panel.find(".addGroupArg").show();
        }
    }

    protected _applyArgSuggest($li, val) {
        const $list = $li.closest(".list");
        const menu = this._getArgSuggestMenu($list);
        if (menu != null) {
            menu.hideDropdowns();
        }
        const $input = $list.siblings(".arg");
        $input.val(val);
        this._checkIfStringReplaceNeeded();
        const $group = $input.closest(".group");
        const groupIndex = this._$panel.find(".group").index($group);
        if ($input.closest(".gbOnArg").length) {
            const argIndex = $group.find(".groupOnSection .arg").index($input);
            this.model.updateGroupOnArg(val, argIndex);
        } else {
            const argIndex = $group.find(".argsSection").find(".arg").index($input);
            this.model.updateArg(val, groupIndex, argIndex);
        }
    }

    protected columnPickerCallback($target: JQuery) {
        const options: any = {};
        const $focusedEl = $(document.activeElement);
        if (($focusedEl.is("input") &&
            !$focusedEl.is(this._$lastInputFocused)) ||
            this._$lastInputFocused.closest(".semiHidden").length) {
            return;
        }
        if (this._$lastInputFocused.closest(".row")
                                .siblings(".addArgWrap").length
            || this._$lastInputFocused.hasClass("variableArgs")) {
            options.append = true;
        }
        if (xcUIHelper.fillInputFromCell($target, this._$lastInputFocused,
                                    gColPrefix, options)) {
            this._onArgChange(this._$lastInputFocused);
        }
        this._checkHighlightTableCols(this._$lastInputFocused);
        if (this._$lastInputFocused.hasClass("gbAgg")) {
            this._autoGenNewGroupByName(this._$lastInputFocused);
        }
    }
}