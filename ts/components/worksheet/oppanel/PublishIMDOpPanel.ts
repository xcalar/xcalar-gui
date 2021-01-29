class PublishIMDOpPanel extends BaseOpPanel {
    private _$elemPanel: JQuery = null; // $('#PublishIMDOpPanel');
    private _advMode: boolean;
    protected _dagNode: DagNodePublishIMD;
    private _columns: ProgCol[];
    private _$nameInput: JQuery; // $('#publishIMDOpPanel .IMDNameInput')
    private _$primaryKeys: JQuery; // $('#publishIMDOpPanel .IMDKey')
    private _$publishColList: JQuery; // $('#publishIMDOpPanel .publishColumnsSection .cols')
    private _currentKeys: string[];
    private _selectedCols: Set<string>;
    protected codeMirrorOnlyColumns = true;

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'publishIMDOpPanel';

    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        this._$elemPanel = $('#publishIMDOpPanel');
        this._advMode = false;
        super.setup(this._$elemPanel);
        this._$nameInput = $('#publishIMDOpPanel .IMDNameInput');
        this._$primaryKeys = $('#publishIMDOpPanel .IMDKey');
        this._$publishColList = $('#publishIMDOpPanel .publishColumnsSection .cols');
        this._setupEventListener();
        this._currentKeys = [];
        this._selectedCols = new Set();
    }


    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodePublishIMD, options?): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._dagNode = dagNode;
        // Show panel
        super.showPanel("Publish Table", options)
        .then(() => {
            this._advMode = false;
            this._columns = dagNode.getParents().map((parentNode) => {
                return parentNode.getLineage().getColumns(false, true);
            })[0] || [];
            // hide xcalar imd columns
            let validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
            this._columns = this._columns.filter((col: ProgCol) => {
                let name = col.getFrontColName();
                let type: ColumnType = col.getType();
                return !PTblManager.InternalColumns.includes(name) &&
                    validTypes.includes(type) ||
                    type === ColumnType.unknown ||
                    type === ColumnType.undefined;
            });
            this._setupColumnHints();
            this._restorePanel(dagNode.getParam());
            if (BaseOpPanel.isLastModeAdvanced) {
                this._switchMode(true);
                this._updateMode(true);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
    }

    public refreshColumns(): void {
        let param: DagNodePublishIMDInputStruct = this._getParams();

        let columns: string[] = [];
        let $cols = this._$publishColList.find(".col.checked");
        let checkedColumnsSet = new Set();
        for (let i = 0; i < $cols.length; i++) {
            let col: ProgCol = this._columns[$cols.eq(i).data("colnum") - 1];
            checkedColumnsSet.add(col.getBackColName());
        }
        this._columns = this._dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns(false, true);
        })[0] || [];
        // hide xcalar imd columns
        this._columns = this._columns.filter((col: ProgCol) => {
            let name = col.getFrontColName();
            return !PTblManager.InternalColumns.includes(name);
        });

        this._columns.forEach(progCol => {
            let colName = progCol.getBackColName()
            if (checkedColumnsSet.has(colName)) {
                columns.push(progCol.getFrontColName());
            }
        });

        param.columns = columns;
        this._setupColumnHints();
        this._restorePanel(param);
    }

    private _getOverwriteCheckbox(): JQuery {
        return this._$elemPanel.find(".IMDOverwrite .checkbox");
    }

    private _convertAdvConfigToModel() {
        const dagInput = <DagNodePublishIMDInputStruct>JSON.parse(this._editor.getValue());

        if (JSON.stringify(dagInput, null, 4) !== this._cachedBasicModeParam) {
            // don't validate if no changes made, just allow to go to basic
            const error = this._dagNode.validateParam(dagInput);
            if (error) {
                throw new Error(error.error);
            }
        }
        return dagInput;
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            let param: DagNodePublishIMDInputStruct = this._getParams();
            const paramStr = JSON.stringify(param, null, 4);
            this._cachedBasicModeParam = paramStr;
            this._editor.setValue(paramStr);
            this._advMode = true;
        } else {
            try {
                const newModel: DagNodePublishIMDInputStruct = this._convertAdvConfigToModel();
                this._restorePanel(newModel);
                this._advMode = false;
                return;
            } catch (e) {
                return {error: e.message || e.error};
            }
        }
        return null;
    }

    private _getKeyValues(): string[] {
        let keys: string[] = [];
        if (!this._$elemPanel.find('.IMDKey .disableKey .checkbox').hasClass('checked')) {
            let $inputs: JQuery = this._$primaryKeys.find(".primaryKeyInput");
            for (let i = 0; i < $inputs.length; i++) {
                let val: string = $inputs.eq(i).val();
                if (val != "") {
                    keys.push(val);
                }
            }
        }
        return keys;
    }

    private _getParams(): DagNodePublishIMDInputStruct {
        let keys: string[] = this._getKeyValues();
        let columns: string[] = [];
        let $cols = this._$publishColList.find(".col.checked");
        for (let i = 0; i < $cols.length; i++) {
            let col: ProgCol = this._columns[$cols.eq(i).data("colnum") - 1];
            columns.push(col.getFrontColName());
        }
        return {
            pubTableName: typeof(this._$nameInput.val()) === "string" ? this._$nameInput.val().toUpperCase() : this._$nameInput.val(),
            primaryKeys: keys,
            operator: "",
            columns: columns,
            overwrite: this._isOverwrite()
        }
    }

    private _restoreKeys(keyList: string[]) {
        if (keyList.length == 0) {
            keyList = [""];
        }
        let $keys: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        let rowsLen = $keys.length;
        if (rowsLen < keyList.length) {
            let numNew: number = keyList.length - $keys.length;
            for (let i = 0; i < numNew; i++) {
                this._addKeyField();
            }
        } else if (rowsLen > keyList.length) {
            let numRem: number = rowsLen - keyList.length;
            for (let i = 0; i < numRem; i++) {
                $keys.eq(rowsLen - 1 - i).remove();
            }
        }
        $keys = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns li').removeClass("unavailable");
        for (let i = 0; i < keyList.length; i++) {
            $keys.eq(i).find(".primaryKeyInput").val(keyList[i]);
            $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + keyList[i] + "']").addClass("unavailable");
        }
        this._currentKeys = keyList;
    }

    private _restorePanel(input: DagNodePublishIMDInputStruct): void {
        this._$nameInput.val(typeof(input.pubTableName) === "string" ? input.pubTableName.toUpperCase() : input.pubTableName);
        let keyList: string[] = input.primaryKeys || [];
        //process
        this._restoreKeys(keyList);
        this._selectedCols.clear();
        input.columns.forEach((col: string) => {
            this._selectedCols.add(col);
        });

        this._renderColumns();
        for(let i = 0; i < keyList.length; i++) {
            this._toggleColumnKey(keyList[i].substr(1), true, true);
        }
        if (input.operator != "") {
            this._toggleColumnKey(input.operator.substr(1), true, false);
        }
        this._toggleOverwrite(input.overwrite);
    }

    private _replicateColumnHints(): void {
        let $list: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns');
        let toCopy: string = $list.eq(0).html();
        $list.empty();
        $list.append(toCopy);
    }

    private _setupColumnHints(): void {
        let $list: JQuery = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns');
        let html = '';
        this._columns.forEach((column: ProgCol) => {
            html += '<li data-value="$' + column.getBackColName() + '">' +
                column.getBackColName() + '</li>';
        });
        $list.empty();
        $list.append(html);
    }

    private _addKeyField(): void {
        let html = '<div class="primaryKeyList dropDownList">' +
            '<input class="text primaryKeyInput" type="text" value="" spellcheck="false">' +
            '<i class="icon xi-cancel"></i>' +
            '<div class="iconWrapper">' +
                '<i class="icon xi-arrow-down"></i>' +
            '</div>' +
            '<div class="list">' +
                '<ul class="primaryKeyColumns"></ul>' +
                '<div class="scrollArea top stopped" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-up"></i>' +
                '</div>' +
                '<div class="scrollArea bottom" style="display: none;">' +
                    '<i class="arrow icon xi-arrow-down"></i>'
                '</div>' +
            '</div>' +
        '</div>';
        this._$primaryKeys.append(html);
        this._replicateColumnHints();
        let $list = $('#publishIMDOpPanel .IMDKey .primaryKeyList').last();
        this._activateDropDown($list, '.IMDKey .primaryKeyList');
        this._currentKeys.push("");
    }

    private _checkOpArgs(keys: string[], operator: string): boolean {
        let $location: JQuery = null;
        let error: string = "";


        if (!xcHelper.tableNameInputChecker(this._$nameInput)) {
            error = ErrTStr.InvalidPublishedTableName;
            $location = this._$nameInput;
        }
        const $keys = $(".IMDKey .primaryKeyList")
        keys.forEach(((key, index) => {
            if (!xcHelper.hasValidColPrefix(key)) {
                error = ErrTStr.ColInModal;
                $location = $keys.eq(index);
            }
        }))
        if (operator != "" && !xcHelper.hasValidColPrefix(operator)) {
            error = ErrTStr.ColInModal;
        }
        if (error != "") {
            if (this._advMode) {
                $location = $("#publishIMDOpPanel .advancedEditor");
            }
            StatusBox.show(error, $location, false, {'side': 'right'});
            return false;
        }
        return true;
    }

    private _isOverwrite(): boolean {
        return this._getOverwriteCheckbox().hasClass("checked");
    }

    private _toggleOverwrite(overwrite: boolean): void {
        const $checkbox: JQuery = this._getOverwriteCheckbox();
        if (overwrite) {
            $checkbox.addClass("checked");
        } else {
            $checkbox.removeClass("checked");
        }
    }

    private _setupEventListener(): void {
        const self = this;
        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${PublishIMDOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(); }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${PublishIMDOpPanel._eventNamespace}`,
            '.submit',
            () => { this._submitForm(this._dagNode); }
        );

        this._$elemPanel.on("click", ".addKeyArg", function() {
            $(this).blur();
            self._addKeyField();
        });

        this._$elemPanel.on('click', '.IMDOverwrite .checkboxWrap', (event) => {
            const $checkbox = $(event.currentTarget).find(".checkbox");
            this._toggleOverwrite(!$checkbox.hasClass("checked"));
        });

        this._$elemPanel.on('click', '.IMDKey .disableKey', (event) => {
            let $box: JQuery = $(event.currentTarget).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                this._$elemPanel.find('.IMDKey .primaryKeyList').removeClass("xc-disabled");
                this._$elemPanel.find('.addArgWrap').removeClass("xc-disabled");
            } else {
                $box.addClass("checked");
                this._$elemPanel.find('.IMDKey .primaryKeyList').addClass("xc-disabled");
                this._$elemPanel.find('.addArgWrap').addClass("xc-disabled");
            }
        });

        this._$elemPanel.on('click', '.primaryKeyList .xi-cancel', function() {
            const $key: JQuery = $(this).closest(".primaryKeyList");
            let oldVal = $key.find(".primaryKeyInput").val();
            if (oldVal != "") {
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                self._toggleColumnKey(oldVal.substr(1), false, true);
            }
            $key.remove();
        });

        this._$elemPanel.find(".primaryKeyList").on('blur', '.primaryKeyInput', function() {
            let $input = $(this);
            let index = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyInput').index($input);
            let oldVal = self._currentKeys[index];
            if (oldVal != $input.val()) {
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                self._currentKeys[index] = $input.val();
                if (oldVal.charAt(0) === '$') {
                    oldVal = oldVal.substr(1);
                }
                self._toggleColumnKey(oldVal, false, true);
            }
        });

        let $list = $('#publishIMDOpPanel .IMDKey .primaryKeyList');
        this._activateDropDown($list, '#publishIMDOpPanel .IMDKey .primaryKeyList');
        let expList: MenuHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $('#publishIMDOpPanel .IMDKey .primaryKeyList').eq(0).find('.primaryKeyInput');
                let oldVal = $primaryKey.val();
                if (oldVal != "") {
                    $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                    self._toggleColumnKey(oldVal.substr(1), false, true);
                }
                $primaryKey.val("$" + $li.text());
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
                let index = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyInput').index($primaryKey);
                self._currentKeys[index] = $li.data("value");
                let colName: string = $li.text();
                self._toggleColumnKey(colName, true, true);
            }
        });
        expList.setupListeners();

        $('#publishIMDColumns .selectAllWrap').click(function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("active")) {
                return;
            }
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$publishColList.find('.checked').not(".active").removeClass("checked");
            } else {
                $box.addClass("checked");
                self._$publishColList.find('.col').addClass("checked");
                self._$publishColList.find('.checkbox').addClass("checked");
            }
        });

        $('#publishIMDColumns .columnsWrap').on("click", ".col", function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            let $col: JQuery = $(this);
            event.stopPropagation();
            if ($box.hasClass("active")) {
                return;
            }
            if ($col.hasClass("checked")) {
                $col.removeClass("checked");
                $box.removeClass("checked");
                self._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
            } else {
                $col.addClass("checked");
                $box.addClass("checked");
                if (self._$publishColList.find('.col .checked').length == self._$publishColList.find('.checkbox').length) {
                    self._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
                }
            }
        });
    }

    private _toggleColumnKey(colName: string, checked: boolean, isKey: boolean) {
        if (colName.includes("::")) {
            colName = colName.split("::")[1];
        }
        let colClass: string = isKey ? " primaryKeyActive" : " opCodeActive";

        let $col = $('#publishIMDOpPanel .publishColumnsSection .cols')
            .find("[data-original-title='" + colName + "']");
        if ($col.length == 0) {
            return;
        }
        let $colDiv = $col.parent();
        if (checked) {
            $colDiv.addClass("checked active " + colClass);
            $col.siblings(".checkbox").addClass("checked active" + colClass)
            if (this._$publishColList.find('.col .checked').length == this._$publishColList.find('.checkbox').length) {
                this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked active" + colClass);
            }
        } else if ($colDiv.hasClass("primaryKeyActive") && $colDiv.hasClass("opCodeActive")) {
            $colDiv.removeClass(colClass);
            $col.siblings(".checkbox").removeClass(colClass)
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass(colClass);
        } else {
            $colDiv.removeClass("checked active" + colClass);
            $col.siblings(".checkbox").removeClass("checked active" + colClass)
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked active" + colClass);
        }
    }

    private _activateDropDown($list: JQuery, container: string) {
        let dropdownHelper: MenuHelper = new MenuHelper($list, {
            "onOpen": function() {
                var $lis = $list.find('li').sort(xcUIHelper.sortHTML);
                $lis.prependTo($list.find('ul'));
            },
            "onSelect": ($li) => {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                let $primaryKey = $('#publishIMDOpPanel .IMDKey .primaryKeyList').eq(0).find('.primaryKeyInput');
                let oldVal = $primaryKey.val();
                if (oldVal != "") {
                    $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                        .find("[data-value='" + oldVal + "']").removeClass("unavailable");
                    this._toggleColumnKey(oldVal.substr(1), false, true);
                }
                $primaryKey.val("$" + $li.text());
                $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyColumns')
                    .find("[data-value='" + $li.data("value") + "']").addClass("unavailable");
                let index = $('#publishIMDOpPanel .IMDKey .primaryKeyList .primaryKeyInput').index($primaryKey);
                this._currentKeys[index] = $li.data("value");
                let colName: string = $li.text();
                this._toggleColumnKey(colName, true, true);
            },
            "container": container
        });
        dropdownHelper.setupListeners();
        new InputDropdownHint($list, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val, $input) {
                if (val === $.trim($input.val())) {
                    return;
                }
                $input.val(val);
            },
            "order": true
        });
    }


    private _renderColumns(): void {
        const columnList = this._columns;
        if (columnList.length == 0) {
            this._$publishColList.empty();
            $("#publishIMDColumns .noColsHint").show();
            $("#publishIMDColumns .selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcStringHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            const checked = this._selectedCols.has(colName) ? " checked" : "";
            html += '<li class="col' + checked +
                '" data-colnum="' + colNum + '">' +
                '<span class="text tooltipOverflow" ' +
                'data-original-title="' +
                    xcStringHelper.escapeDblQuoteForHTML(
                        xcStringHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body">' +
                    colName +
                '</span>' +
                '<div class="checkbox' + checked + '">' +
                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                '</div>' +
            '</li>';
        });
        this._$publishColList.html(html);
        $("#publishIMDColumns .selectAllWrap").show();
        $("#publishIMDColumns .noColsHint").hide();
        if (this._$publishColList.find('.col .checked').length == this._$publishColList.find('.checkbox').length) {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }

        if (columnList.length > 9) {
            this._$publishColList.css("overflow-y", "auto");
        } else {
            this._$publishColList.css("overflow-y", "hidden");
        }
    }


    protected _submitForm(dagNode: DagNodePublishIMD): void {
        let keys: string[] = [];
        let operator: string = "";
        let name: string = "";
        let columns: string[] = [];
        let overwrite: boolean;

        if (this._advMode) {
            try {
                const newModel: DagNodePublishIMDInputStruct = this._convertAdvConfigToModel();
                keys = newModel.primaryKeys;
                operator = newModel.operator;
                name = typeof(newModel.pubTableName) === "string" ? newModel.pubTableName.toUpperCase() : newModel.pubTableName;
                columns = newModel.columns;
                overwrite = newModel.overwrite;
                this._$nameInput.val(name);
            } catch (e) {
                StatusBox.show(e, $("#publishIMDOpPanel .advancedEditor"),
                    false, {'side': 'right'});
                return;
            }
        } else {
            keys = this._getKeyValues();
            name = typeof(this._$nameInput.val()) === "string" ? this._$nameInput.val().toUpperCase() : this._$nameInput.val();
            this._$nameInput.val(name);
            overwrite = this._isOverwrite();
            let $cols = this._$publishColList.find(".col.checked");
            for (let i = 0; i < $cols.length; i++) {
                columns.push(this._columns[$cols.eq(i).data("colnum") - 1].getFrontColName());
            }
        }
        if (!columns || !columns.length) {
            StatusBox.show(ErrTStr.NoColumns, this._$publishColList);
            return;
        }
        if (!this._checkOpArgs(keys, operator)) {
            return;
        }

        dagNode.setParam({
            pubTableName: name,
            primaryKeys: keys,
            operator: operator,
            columns: columns,
            overwrite: overwrite
        });
        this.close(true);
    }

}