/**
 * The operation editing panel for Export operator
 */
class ExportOpPanel extends BaseOpPanel implements IOpPanel {
    private _$elemPanel: JQuery = null; // $('#exportOpPanel');
    private _$exportDest: JQuery = null; // $("#exportDriver");
    private _$exportDestList: JQuery = null; // $("#exportDriverList");
    private _$exportColList: JQuery = null; // $("#exportOpColumns .cols");
    private _$exportArgSection: JQuery = null; // $("#exportOpPanel .argsSection");
    protected _dagNode: DagNodeExport = null;
    protected _dataModel: ExportOpPanelModel = null;
    private _currentDriver: string = "";
    protected codeMirrorOnlyColumns = true;

    // *******************
    // Constants
    // *******************
    private static readonly _eventNamespace = 'exportOpPanel';


    /**
     * Initialization, should be called only once by xcManager
     */
    public setup(): void {
        // HTML elements binding
        let self = this;
        this._mainModel = ExportOpPanelModel;
        this._$elemPanel = $("#exportOpPanel");
        this._$exportDest = $("#exportDriver");
        this._$exportDestList = $("#exportDriverList");
        this._$exportColList = $("#exportOpColumns .cols");
        this._$exportArgSection = $("#exportOpPanel .argsSection");
        super.setup(this._$elemPanel);

        let dropdownHelper: MenuHelper = new MenuHelper(this._$exportDestList, {
            "container": "#exportDriverList",
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
        dropdownHelper.setupListeners();
        new InputDropdownHint(self._$exportDestList, {
            "menuHelper": dropdownHelper,
            "preventClearOnBlur": true,
            "onEnter": function (val) {
                self._changeDriver(null, val);
            },
            "order": false
        });

        $("#exportOpColumns .searchArea .searchInput").on("input", function(event) {
            const $searchInput: JQuery = $(event.currentTarget);
            if (!$searchInput.is(":visible")) return; // ENG-8642
            const keyword: string = $searchInput.val().trim();
            self._filterColumns(keyword);
        });

        this._setupEventListener();
    }

    private _changeDriver(driverName: string, driverText: string) {
        if (!driverName) {
            driverName = ExportOpPanelModel.convertPrettyName(driverText) || driverText;
        }
        this._$exportDest.val(driverText);
        this._$exportDest.data("name", driverName);
        this.renderDriverArgs();
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == driverName;
        });
        this._currentDriver = driverName;
        this._dataModel.setUpParams(driver, this._$elemPanel);
    }

    private _filterColumns(keyword: string) {
        if (keyword == "") {
            this._$elemPanel.find(".columnsToExport .filterHint").addClass("xc-hidden");
        } else {
            this._$elemPanel.find(".columnsToExport .filterHint").removeClass("xc-hidden");
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
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }
        this._dataModel.hideCols(keyword);
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
                let index: number = $("#exportOpPanel .exportArg").index($($li.closest(".exportArg")));
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
     *
     */
    private _convertAdvConfigToModel(): ExportOpPanelModel {
        const dagInput: DagNodeExportInputStruct = <DagNodeExportInputStruct>JSON.parse(this._editor.getValue());
        const allColMap: Map<string, ProgCol> = this._mainModel.getColumnsFromDag(this._dagNode);
        const error = this._dataModel.verifyDagInput(dagInput);
        if (error != "") {
            throw new Error(error);
        }
        return this._mainModel.fromDagInput(dagInput, allColMap, this._dataModel.exportDrivers);
    }

    /**
     * @override BaseOpPanel._switchMode
     * @param toAdvancedMode
     */
    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        if (toAdvancedMode) {
            const param: DagNodeExportInputStruct = this._dataModel.toDag();
            this._editor.setValue(JSON.stringify(param, null, 4));
            this._dataModel.setAdvMode(true);
            this._updateUI();
        } else {
            try {
                this._dataModel.setAdvMode(false); // in case we don't produce a new model due to error
                const newModel: ExportOpPanelModel = this._convertAdvConfigToModel();
                newModel.setAdvMode(false);
                this._dataModel = newModel;
                let driverName: string = this._dataModel.currentDriver.name;
                this._$exportDest.data("name",driverName);
                this._$exportDest.val(ExportOpPanelModel.getDriverDisplayName(driverName));
                this._currentDriver = driverName;
                this._updateUI();
                this.panelResize();
                return;
            } catch (e) {
                StatusBox.show(e, $("#exportOpPanel .modalTopMain"),
                    false, {'side': 'right'});
                this.panelResize();
                return;
            }
        }
        return null;
    }

    /**
     * Show the panel with information from dagNode
     * @param dagNode DagNode object
     */
    public show(dagNode: DagNodeExport, options?): void {
        this._dagNode = dagNode;
        // Show panel
        super.showPanel(null, options)
        .then(() => {
            try {
                this._dataModel = this._mainModel.fromDag(dagNode);
            } catch (e) {
                this._dataModel = new ExportOpPanelModel();
                DagConfigNodeModal.Instance.setFormOpen();
                this._dataModel.setAdvMode(true);
                this._startInAdvancedMode(e);
                return;
            }
            if (BaseOpPanel.isLastModeAdvanced) {
                this._dataModel.setAdvMode(true);
                this._startInAdvancedMode();
            } else {
                this._dataModel.setAdvMode(false);
            }

            if (this._dataModel.loadedName == "") {
                this._currentDriver = "";
            }

            const $waitIcon = xcUIHelper.disableScreen(this._$elemPanel.find(".opSection"));

            this._dataModel.loadDrivers()
            .then(() => {
                this._dataModel.driverArgs =
                    this._dataModel.constructParams(this._dataModel.currentDriver,
                    this._dagNode.getParam().driverArgs);
                this._updateUI();
            })
            .fail((error) => {
                console.error(error);
                this._dataModel.exportDrivers = [];
                StatusBox.show("Unable to load drivers", $("#exportOpPanel .modalTopMain .exportDriver"),
                        false, {'side': 'right'});
            })
            .always(() => {
                DagConfigNodeModal.Instance.setFormOpen();
                this._$elemPanel.find(".searchBox .searchInput").val("");
                this._$elemPanel.find(".columnsToExport .filterHint").addClass("xc-hidden");
                this.panelResize();
                xcUIHelper.enableScreen($waitIcon);

            });
        });
    }

    protected _updateUI(): void {
        this._renderColumns();
        this._renderDriverList();
        this.renderDriverArgs(true);
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == this._currentDriver;
        });
        if (driver == null) {
            let inputDriverName: string = $("#exportDriverList #exportDriver").val();
            StatusBox.show(ExportTStr.DriverNotFound + inputDriverName, this._$exportArgSection,
                false, {'side': 'right'});
            this._dagNode.beErrorState(ExportTStr.DriverNotFound + inputDriverName);
            return;
        }
        this._dataModel.setUpParams(driver, this._$elemPanel);
    }

    private _renderColumns(): void {
        const columnList = this._dataModel.columnList;
        if (columnList.length == 0) {
            this._$exportColList.empty();
            $("#exportOpColumns .noColsHint").show();
            $("#exportOpColumns .selectAllWrap").hide();
            return;
        }

        // Render column list
        let html: string = "";
        columnList.forEach((column, index) => {
            const colName: string = xcStringHelper.escapeHTMLSpecialChar(
                column.sourceColumn);
            const colNum: number = (index + 1);
            let checked = column.isSelected ? " checked" : "";

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
        this._$exportColList.html(html);
        $("#exportOpColumns .selectAllWrap").show();
        $("#exportOpColumns .noColsHint").hide();
        if (this._$exportColList.find('.col .checked').length
            == this._$exportColList.find('.checkbox').length) {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
        } else {
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        }
    }

    private _renderDriverList() {
        let $list: JQuery = $("#exportDriverList .exportDrivers");
        $list.empty();
        const drivers: ExportDriver[] = this._dataModel.exportDrivers;
        let html: string = this._dataModel.createDriverListHtml(drivers);
        $list.append(html);
    }

    /**
     * Renders the current driver arguments on XD
     */
    public renderDriverArgs(force?: boolean): void {
        let driverName: string = this._$exportDest.val();
        driverName = ExportOpPanelModel.convertPrettyName(driverName) || driverName;
        if (driverName == "") {
            driverName = "fast_csv";
            this._$exportDest.val(ExportDriverPrettyNames.FastCSV);
            this._$exportDest.data("name", "fast_csv");
        } else if (driverName == this._currentDriver && !force) {
            return;
        }
        const driver: ExportDriver = this._dataModel.exportDrivers.find((driver) => {
            return driver.name == driverName;
        });
        if (driver == null) {
            // restore input value to last saved driver
            this._$exportDest.data(this._currentDriver);
            // todo val
            this._$exportDest.val(ExportOpPanelModel.getDriverDisplayName(this._currentDriver));
            return;
        }
        this._currentDriver = driverName;
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
            container = "#exportOpPanel .argsSection ." + paramName + " .dropDownList"
            $targetList = $(container);
            this._activateDropDown($targetList, container);
        });
    }

    /**
     * Hide the panel
     */
    public close(isSubmit?: boolean): void {
        super.hidePanel(isSubmit);
        DagConfigNodeModal.Instance.setFormClose();
    }

    /**
     * called when the user resizes the panel
     */
    public panelResize(): void {
        let $collapseOption = this.$panel.find(".toggleColumnCollapse");
        let wasMinimized = this._$exportColList.hasClass("minimized");
        this._$exportColList.addClass("minimized");
        $collapseOption.addClass("minimized");

        // + 1 due to 1px padding-top in .cols
        if (this._$exportColList[0].scrollHeight > this._$exportColList.height() + 1) {
            $collapseOption.removeClass("xc-hidden");
        } else {
            $collapseOption.addClass("xc-hidden");
        }
        if (!wasMinimized) {
            this._$exportColList.removeClass("minimized");
            $collapseOption.removeClass("minimized");
        }
    }

    /**
     * Attach event listeners for static elements
     */
    private _setupEventListener(): void {
        // Clear existing event handlers
        this._$elemPanel.off(`.${ExportOpPanel._eventNamespace}`);
        const self: ExportOpPanel = this;

        // Close icon & Cancel button
        this._$elemPanel.on(
            `click.close.${ExportOpPanel._eventNamespace}`,
            '.close, .cancel',
            () => { this.close(false) }
        );

        // Submit button
        this._$elemPanel.on(
            `click.submit.${ExportOpPanel._eventNamespace}`,
            '.submit',
            () => {
                if (this._dataModel.isAdvMode()) {
                    try {
                        const newModel: ExportOpPanelModel = this._convertAdvConfigToModel();
                        this._dataModel = newModel;
                    } catch (e) {
                        StatusBox.show(e, $("#exportOpPanel .advancedEditor"),
                            false, {'side': 'right'});
                        return;
                    }
                }
                if (this._dataModel.saveArgs(this._dagNode)) {
                    this.close(true);
                }
            }
        );

        this._$elemPanel.on({
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                $("#exportDriverList #exportDriver").data("value", $(this).text().trim());
            }
        }, '#exportDriverList .list li');

        this._$exportDest.change(function() {
            self.renderDriverArgs();
            const driver: ExportDriver = self._dataModel.exportDrivers.find((driver) => {
                return driver.name == self._currentDriver;
            });
            self._dataModel.setUpParams(driver, self._$elemPanel);
        });

        $('#exportOpColumns .selectAllWrap').click(function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            event.stopPropagation();
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._$exportColList.find('.checked').not(".xc-hidden").removeClass("checked");
                self._dataModel.setAllCol(false);
            } else {
                $box.addClass("checked");
                self._$exportColList.find('.col').not(".xc-hidden").addClass("checked");
                self._$exportColList.find('.checkbox').not(".xc-hidden").addClass("checked");
                self._dataModel.setAllCol(true);
            }
        });

        $('#exportOpColumns .columnsWrap').on("click", ".col", function(event) {
            let $box: JQuery = $(this).find(".checkbox");
            let $col: JQuery = $(this);
            event.stopPropagation();
            self._changeCheckbox($box, $col);
        });

        $('#exportOpPanel .argsSection').on("click", ".checkbox", function(event) {
            event.stopPropagation();
            let $box: JQuery = $(this);
            let $arg: JQuery = $(this).parent();
            let paramIndex: number = $("#exportOpPanel .exportArg").index($arg);
            if ($box.hasClass("checked")) {
                $box.removeClass("checked");
                self._dataModel.setParamValue(false, paramIndex);
            } else {
                $box.addClass("checked");
                self._dataModel.setParamValue(true, paramIndex);
            }
        });

        $('#exportOpPanel .argsSection').on("change", "input", function(event) {
            event.stopPropagation();
            let $input = $(this);
            let $arg = $(this).closest('.exportArg');
            let paramIndex = $("#exportOpPanel .exportArg").index($arg);
            self._dataModel.setParamValue($input.val(), paramIndex);
        });

        this.$panel.find(".toggleColumnCollapse").on("click", function() {
            if ($(this).hasClass("minimized")) {
                $(this).removeClass("minimized");
                self._$exportColList.removeClass("minimized");
            } else {
                $(this).addClass("minimized");
                self._$exportColList.addClass("minimized");
            }
        });
    }

    private _changeCheckbox($box, $col) {
        if ($col.hasClass("checked")) {
            $col.removeClass("checked");
            $box.removeClass("checked");
            this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).removeClass("checked");
        } else {
            $col.addClass("checked");
            $box.addClass("checked");
            if (this._$exportColList.find('.col .checked').length == this._$exportColList.find('.checkbox').length) {
                this._$elemPanel.find(".selectAllWrap .checkbox").eq(0).addClass("checked");
            }
        }
        let colIndex = $("#exportOpColumns .columnsToExport .cols .col").index($col);
        this._dataModel.toggleCol(colIndex);
    }

}