class ExportSQLTableModal {
    private static _instance: ExportSQLTableModal;
    private _$modal: JQuery; // $("#exportSQLTableModal")
    private _$exportDest: JQuery = null; // $("#exportSQLTableDriver");
    private _$exportDestList: JQuery = null; // $("#exportSQLTableDriverList");
    private _$exportColList: JQuery = null; // $("#exportSQLTableColumns .cols");
    private _$exportArgSection: JQuery = null; // $("#exportSQLTableModal .argsSection");
    private _modalHelper: ModalHelper;
    private _columns: ProgCol[];
    private _selectedDriver: string;
    protected _dataModel: ExportOpPanelModel;
    private _tableName: string;
    private _id: string;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const self = this;
        this._$modal = $("#exportSQLTableModal");
        this._$exportDest = $("#exportSQLTableDriver");
        this._$exportDestList = $("#exportSQLTableDriverList");
        this._$exportColList = $("#exportSQLTableColumns .cols");
        this._$exportArgSection = $("#exportSQLTableModal .argsSection");
        this._columns = [];
        this._modalHelper = new ModalHelper(this._$modal, {
            noEnter: true
        });
        self._dataModel = new ExportOpPanelModel();
        let dropdownHelper: MenuHelper = new MenuHelper(this._$exportDestList, {
            "container": "#exportSQLTableDriverList"
        });
        dropdownHelper.setupListeners();
        new InputDropdownHint(self._$exportDestList, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val) {
                self._changeDriver(null, val);
            },
            "order": false
        });

        let expList: MenuHelper = new MenuHelper($("#exportSQLTableDriverList"), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }

                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }

                let name = $li.data("name");
                let text = $li.text();

                self._changeDriver(name, text);
            }
        });
        expList.setupListeners();


        $("#exportSQLTableColumns .searchInput").on("input", (event)  => {
            if (! $("#exportSQLTableColumns .searchInput").is(":visible")) return; // ENG-8642
            const $searchInput: JQuery = $(event.currentTarget);
            const keyword: string = $searchInput.val().trim();
            this._filterColumns(keyword);
        });

        this._addEventListeners();
    }

    private _changeDriver(driverName: string, driverText: string) {
        if (!driverName) {
            driverName = ExportOpPanelModel.convertPrettyName(driverText) || driverText;
        }
        this._$exportDest.val(driverText);
        this._$exportDest.data("name", driverName);
        this.renderDriverArgs();
    }

    private _filterColumns(keyword: string) {
        if (keyword == "") {
            this._$modal.find(".columnsToExport .filterHint").addClass("xc-hidden");
        } else {
            this._$modal.find(".columnsToExport .filterHint").removeClass("xc-hidden");
        }
        keyword = keyword.toLocaleLowerCase();
        let cols = this._$exportColList.find(".col");
        for (let i = 0; i < cols.length; i++) {
            let col = cols.eq(i);
            if (col.text().toLocaleLowerCase().includes(keyword)) {
                col.removeClass("xc-hidden");
                col.find(".checkbox").removeClass("xc-hidden");
            } else {
                col.addClass("xc-hidden");
                col.find(".checkbox").addClass("xc-hidden");
            }
        }
        if (this._$exportColList.find('.col .checked').not(".xc-hidden").length
                == this._$exportColList.find('.checkbox').not(".xc-hidden").length) {
                this._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
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

                $li.closest('.dropDownList').find('input').val($li.text());
                let index: number = $("#exportSQLTableModal .exportArg").index($($li.closest(".exportArg")));
                this._dataModel.setParamValue($li.text(), index);
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

    /**
     * ExportSQLTableModal.Instance.show
     * @returns {boolean}
     * @param table
     */
    public show(tableName: string, columns: ProgCol[]): boolean {
        if (this._$modal.is(":visible")) {
            return false;
        }
        this._tableName = tableName;
        this._columns = columns;
        this._dataModel = new ExportOpPanelModel();
        this._selectedDriver = "";
        this._modalHelper.setup();
        this._id = xcHelper.randName("modal");
        this._$modal.find(".columnsToExport .filterHint").addClass("xc-hidden");
        $("#exportSQLTableColumns .searchBox .searchInput").val("");
        this._dataModel.loadDrivers()
        .then(() => {
            this._renderColumns();
            this._renderDriverList();
            this.renderDriverArgs();
        })
        .fail((error) => {
            console.error(error);
            this._dataModel.exportDrivers = [];
            StatusBox.show("Unable to load drivers", $("#exportSQLTableDriver"),
                    false, {'side': 'right'});
        });
        return true;
    };

    /**
     * Renders the current driver arguments on XD
     */
    public renderDriverArgs(): void {
        let driverName: string = this._$exportDest.val();
        driverName = ExportOpPanelModel.convertPrettyName(driverName) || driverName;
        if (driverName == "") {
            driverName = "fast_csv";
            this._$exportDest.val(ExportDriverPrettyNames.FastCSV);
            this._$exportDest.data("name", "fast_csv");
        } else if (driverName == this._selectedDriver) {
            return;
        }
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == driverName;
        });
        if (driver == null) {
            return;
        }
        this._selectedDriver = driverName;
        this._dataModel.constructParams(driver);
        let html: string = "";
        if (driver.description) {
            html = "<div class='exportDescription'>" + driver.description + "</div>";
        }
        this._$exportArgSection.empty();
        let targetParams: string[] = [];
        driver.params.forEach((param: ExportParam) => {
            html += this._dataModel.createParamHtml(param);
            if (param.type == "target") {
                targetParams.push(param.name.replace(/ /g,"_"));
            }
        });
        this._$exportArgSection.append(html);
        let $targetList: JQuery = null;
        let container: string = "";
        targetParams.forEach((paramName) => {
            container = "#exportSQLTableModal .argsSection ." + paramName + " .dropDownList"
            $targetList = $(container);
            this._activateDropDown($targetList, container);
        });
        this._dataModel.setUpParams(driver, this._$modal);
        $("#exportSQLTableModal .argsSectionBox").removeClass("xc-hidden");
    }

    private _getTypeIcon(type: ColumnType): string {
        return '<i class="icon type ' +
            xcUIHelper.getColTypeIcon(xcHelper.convertColTypeToFieldType(type)) +
            '"></i>';
    }

    private _renderColumns(): void {
        const columnList = this._columns;
        if (columnList.length == 0) {
            this._$exportColList.empty();
            $("#exportSQLTableColumns .noColsHint").show();
            $("#exportSQLTableColumns .selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcStringHelper.escapeHTMLSpecialChar(
                column.name);
            const colNum: number = (index + 1);
            html += '<li class="col' +
                '" data-colnum="' + colNum + '">' +
                this._getTypeIcon(column.getType()) +
                '<span class="text tooltipOverflow" ' +
                'data-original-title="' +
                    xcStringHelper.escapeDblQuoteForHTML(
                        xcStringHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                'data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="body">' +
                    colName +
                '</span>' +
                '<div class="checkbox' + '">' +
                    '<i class="icon xi-ckbox-empty fa-13"></i>' +
                    '<i class="icon xi-ckbox-selected fa-13"></i>' +
                '</div>' +
            '</li>';
        });
        this._$exportColList.html(html);
        $("#exportSQLTableColumns .selectAllWrap").show();
        $("#exportSQLTableColumns .noColsHint").hide();
        if (this._$exportColList.find('.col .checked').length == this._$exportColList.find('.checkbox').length) {
            this._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }

        if (columnList.length > 9) {
            this._$exportColList.css("overflow-y", "auto");
        } else {
            this._$exportColList.css("overflow-y", "hidden");
        }
    }

    private _renderDriverList() {
        let $list: JQuery = $("#exportSQLTableDriverList .exportDrivers");
        $list.empty();
        const drivers: ExportDriver[] = this._dataModel.exportDrivers;
        let html: string = this._dataModel.createDriverListHtml(drivers);
        $list.append(html);
    }

    private _addEventListeners(): void {
        const self = this;
        this._$modal.on("click", ".close, .cancel", function() {
            self._closeModal();
        });

        this._$modal.on("click", ".confirm", function() {
            self._submitForm();
        });

        $('#exportSQLTableColumns .selectAllWrap').click(function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("active")) {
                return;
            }
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$exportColList.find('.checked').not(".active").not(".xc-hidden").removeClass("checked");
            } else {
                $box.addClass("checked");
                self._$exportColList.find('.col').not(".xc-hidden").addClass("checked");
                self._$exportColList.find('.checkbox').not(".xc-hidden").addClass("checked");
            }
        });

        $('#exportSQLTableColumns .columnsWrap').on("click", ".checkbox", function(event) {
            let $box: JQuery = $(this);
            let $col: JQuery = $(this).parent();
            event.stopPropagation();
            self._changeCheckbox($box, $col);
        });

        $('#exportSQLTableModal .argsSection').on("click", ".checkbox", function(event) {
            event.stopPropagation();
            let $box: JQuery = $(this);
            let $arg: JQuery = $(this).parent();
            let paramIndex: number = $("#exportSQLTableModal .exportArg").index($arg);
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._dataModel.setParamValue(false, paramIndex);
            } else {
                $box.addClass("checked");
                self._dataModel.setParamValue(true, paramIndex);
            }
        });

        $('#exportSQLTableModal .argsSection').on("change", "input", function(event) {
            event.stopPropagation();
            let $input = $(this);
            let $arg = $(this).closest('.exportArg');
            let paramIndex = $("#exportSQLTableModal .exportArg").index($arg);
            self._dataModel.setParamValue($input.val(), paramIndex);
        });
    }

    private _changeCheckbox($box, $col) {
        if ($box.hasClass("active")) {
            return;
        }
        if ($col.hasClass("checked")) {
            $col.removeClass("checked");
            $box.removeClass("checked");
            this._$modal.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        } else {
            $col.addClass("checked");
            $box.addClass("checked");
            if (this._$exportColList.find('.col .checked').not(".xc-hidden").length
                == this._$exportColList.find('.checkbox').not(".xc-hidden").length) {
                this._$modal.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
            }
        }
    }

    private _closeModal(): void {
        this._modalHelper.clear();
        this._reset();
        this._$modal.removeClass("creating");
        this._id = null;
    }

    private _reset(): void {
        this._columns = [];
        this._selectedDriver = "";
        this._$exportDest.val("");
        this._$modal.find(".argsSectionBox").addClass("xc-hidden");
        this._$modal.find(".argsSectionBox .argsSection").empty();
    }

    protected _submitForm(): void {
        if (!this._dataModel.validateDriverArgs(this._$modal)) {
            return;
        }
        let $cols = this._$exportColList.find(".col.checked");
        let columns: ProgCol[] = [];
        for (let i = 0; i < $cols.length; i++) {
            columns.push(this._columns[$cols.eq(i).data("colnum") - 1]);
        }
        if (!this._validateColumns(columns)) {
            return;
        }

        const driverArgs = this._dataModel.getDriverArgs();
        const txId: number = Transaction.start({
            operation: "export",
            sql: {operation: "export"},
            track: true,
        });
        const exportTableName = this._tableName + '_export_' + Authentication.getHashId();
        const driverColumns: XcalarApiExportColumnT[] = columns.map((selectedCol) => {
            let col = new XcalarApiExportColumnT();
            col.headerName = selectedCol.getFrontColName();
            col.columnName = selectedCol.getBackColName();
            return col;
        });

        let id = this._id;
        this._$modal.addClass("creating");
        XIApi.exportTable(txId, this._tableName, this._selectedDriver,
            driverArgs, driverColumns, exportTableName)
        .then(() => {
            Transaction.done(txId, {
                noNotification: true,
                noLog: true,
                noCommit: true
            });
            if (id === this._id) {
                this._closeModal();
            }
            return;
        })
        .fail((err) => {
            Transaction.fail(txId, {
                error: err,
                noAlert: true
            });
            if (id === this._id) {
                this._$modal.removeClass("creating");
            }
            Alert.error(null, err);
            return;
        })
    }

    private _validateColumns(columns) {
        if (!columns.length) {
            let $errorLocation: JQuery = this._$modal.find(".columnsToExport");
            StatusBox.show("Cannot export empty result.", $errorLocation,
            false, {'side': 'right'});
            return false;
        }
        return true;
    }
}
