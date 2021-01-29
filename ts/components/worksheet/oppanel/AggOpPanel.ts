class AggOpPanel extends GeneralOpPanel {
    protected _dagNode: DagNodeAggregate;
    protected _opCategories: number[] = [FunctionCategoryT.FunctionCategoryAggregate];
    protected codeMirrorNoAggs = true;

    public constructor() {
        super();
        this._operatorName = "aggregate";
    }

    public setup(): void {
        super.setupPanel("#aggOpPanel");
        this._functionsInputEvents();
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    // prefill: object, used to prefill the form
    // public show = function(currTableId, currColNums, operator,
    //                                options) {
    public show(node: DagNodeAggregate, options: ShowPanelInfo): XDPromise<void> {
        return super.show(<DagNode>node, options)
        .then(() => {
            this.model = new AggOpPanelModel(this._dagNode, () => {
                this._render();
            }, options);
            super._panelShowHelper(this.model);
            this._render();
            this._$panel.find('.functionsInput').focus();
            this._checkPanelOpeningError();
        });
    }

  // functions that get called after list udfs is called during op view show
    protected _render(): void {
        const self = this;
        const model = this.model.getModel();

        this._resetForm();
        const $groups = this._$panel.find('.group')
        for (let i = 0; i < model.groups.length; i++) {
            let $group = $groups.eq(i);
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const $funcInput: JQuery = $group.find(".functionsInput");
            $funcInput.val(operator);
            $funcInput.data("value", operator.trim().toLowerCase());

            if (this._isOperationValid(i)) {
                self._updateArgumentSection(i);
            }

            const $args = $group.find(".arg").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg = model.groups[i].args[j].getValue();

                $args.eq(j).val(arg);
                if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                    if (arg === "true") {
                        $args.eq(j).closest(".row")
                                .find(".boolArgWrap .checkbox")
                                .addClass("checked");
                    }
                }
            }
        }

        this._$panel.find(".colNameSection .arg").val(model.dest);
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
            if (!self._$panel.find(".functionsInput").is(":visible")) return; // ENG-8642
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
        const $group = $input.closest(".group")
        const groupIndex = this._$panel.find(".group").index($group);
        const argIndex = $group.find(".arg").index($input);
        if ($input.closest(".colNameSection").length) {
            this.model.updateAggName(val);
        } else {
            this.model.updateArg(val, groupIndex, argIndex);
        }
    }

    protected _populateInitialCategoryField() {
        this._populateFunctionsListUl(0);
    }

    protected _populateFunctionsListUl(groupIndex) {
        const operatorsLists = this._getOperatorsLists();
        let html: HTML = "";
        operatorsLists.forEach((category: any[]) => {
            category.forEach((op) => {
                html += '<li class="textNoCap">' + op.displayName + '</li>';
            })
        });
        this._$panel.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }

    // suggest value for .functionsInput
    protected _suggest($input): void {
        const value: string = $input.val().trim().toLowerCase();
        const $list: JQuery = $input.siblings('.list');

        this._$panel.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        const $visibleLis: JQuery = $list.find('li').filter(function() {
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
            this._scrollToGroup(index);
        }
    }

    protected _clearFunctionsInput(groupNum, keep?: boolean) {
        const $group = this._$panel.find('.group').eq(groupNum);
        const $input = $group.find(".functionsInput");
        if (!keep) {
            $input.val("").attr('placeholder', "");
        }
        const val = $input.val().trim();
        $group.find('.genFunctionsMenu').data('category', 'null');
        $group.find('.argsSection').last().addClass('inactive');
        $group.find(".argsSection").empty();
        $group.find('.descriptionText').empty();
        $group.find('.functionsInput').data("value", "");
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

        const $argsSection = $argsGroup.find('.argsSection').last();
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        this._addArgRows(numArgs + 1, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, "");

        this._aggArgumentsSetup(numArgs, $rows, operObj);
        numArgs++;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").remove();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<span>' + OpFormTStr.Descript + ':</span> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        this._checkIfStringReplaceNeeded(true);
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection: JQuery = $argsGroup.find('.argsSection').last();
        let argsHtml: HTML = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        this._suggestLists[groupIndex] = [];

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
    protected _setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue)
    {
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

            if (i === 0) {
                $input.val(defaultValue);
            } else {
                $input.val("");
            }

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
                } else {
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

    private _aggArgumentsSetup(numArgs, $rows, operObj) {
        const description = OpModalTStr.AggNameReq;
        if (operObj.fnName === "listAgg" && operObj.argDescs[1] &&
            operObj.argDescs[1].argDesc === "delim") {
            // hide column suggest dropdown for delim field
            $rows.eq(1).find(".dropDownList").addClass("noSuggest");
        }
        $rows.eq(numArgs).addClass('resultantColNameRow')
                        .find('.dropDownList')
                        .addClass('colNameSection')
                        .end()
                        .find('.arg').val("")
                        .end()
                        .find('.description').text(description);

        const $nameInput = $rows.eq(numArgs).find('.arg');
        BaseOpPanel.addAggInputEvents($nameInput);
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
            const error = this.model.validateGroups();
            if (error) {
                const model = this.model.getModel();
                const groups = model.groups;
                const $group = this._$panel.find(".group").eq(error.group);
                const $input = $group.find(".arg").eq(error.arg);
                switch (error.type) {
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
                                    inputNum: i
                                });
                                if (!arg.checkIsValid() && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                                    inputNums.push(i);
                                }
                            }
                        }
                        self._handleInvalidArgs(true, $input, error.error, error.group, allColTypes, inputNums);
                        break;
                    case ("valueType"):
                        self._handleInvalidArgs(false, $input, error.error);
                        break;
                    case ("missingFields"):
                        default:
                            StatusBox.show(error.error, $group, false, {preventImmediateHide: true});
                            console.warn("unhandled error found", error);
                            break;
                }
                return false;
            }

            const aggNameError = this.model.validateAggName();
            if (aggNameError) {
                StatusBox.show(aggNameError.error, this._$panel.find(".group").find(".colNameSection .arg"), false, {preventImmediateHide: true});
                return false;
            }
        }

        return true;
    }

    protected _resetForm() {
        super._resetForm();
    }

    protected _preview() {
        if (!this._validate(true)) return;
        const graph = this._tab.getGraph();
        if (this._previewNodes.length) {
            let table;
            this._previewNodes.forEach(previewNode => {
                table = previewNode.getTable();
                if (previewNode instanceof DagNodeAggregate) {
                    let aggName = previewNode.getAggName();
                    graph.removeNode(previewNode.getId());
                    DagAggManager.Instance.bulkNodeRemoval([aggName]);
                } else {
                    graph.removeNode(previewNode.getId());
                }
            });
            TableTabManager.Instance.deleteTab(table);
            this._previewNodes = [];
        }

        const nodeInfo = this._dagNode.getNodeCopyInfo(true, false, true);
        delete nodeInfo.id;
        nodeInfo.isHidden = true;
        const lastNode = graph.newNode(nodeInfo);

        let rowNumName =  "XC_ROW_COL_" + Date.now();
        let rowNumNode = graph.newNode({
            type: DagNodeType.RowNum,
            input: {
                newField: rowNumName
            },
            isHidden: true,
            state: DagNodeState.Configured
        });
        let filterNode = graph.newNode({
            type: DagNodeType.Filter,
            input: {
                evalString: `le(${rowNumName}, ${UserSettings.Instance.getPref("dfPreviewLimit")})`
            },
            isHidden: true,
            state: DagNodeState.Configured
        });
        this._dagNode.getParents().forEach((parent, index) => {
            if (!parent) return;
            graph.connect(parent.getId(), rowNumNode.getId(), index, false, false);
        });
        graph.connect(rowNumNode.getId(), filterNode.getId(), 0, false, false);
        graph.connect(filterNode.getId(), lastNode.getId(), 0, false, false);
        this._previewNodes = [rowNumNode, filterNode, lastNode];

        const param = this.model.getParam();
        param.outputTableName = "xcPreview";
        lastNode.setParam(param, true);
        const dagView = DagViewManager.Instance.getDagViewById(this._tab.getId());
        this._lockPreview();
        dagView.run([lastNode.getId()])
        .then(() => {
            if (!UserSettings.Instance.getPref("dfAutoPreview")) {
                DagViewManager.Instance.viewResult(lastNode, this._tab.getId());
            }
        })
        .always(() => {
            this._unlockPreview();
            const aggName = (<DagNodeAggregate>lastNode).getAggName();
            graph.removeNode(lastNode.getId());
            DagAggManager.Instance.bulkNodeRemoval([aggName]);
            let table;
            this._previewNodes.forEach(previewNode => {
                table = previewNode.getTable();
                graph.removeNode(previewNode.getId());
            });
            TableTabManager.Instance.deleteTab(table);
            this._previewNodes = [];
        });
    }
}
