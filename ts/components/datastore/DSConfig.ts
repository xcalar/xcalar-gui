interface DSPreviewOptions {
    dsName?: string;
    format?: string;
    hasHeader?: boolean;
    fieldDelim?: string;
    lineDelim?: string;
    quoteChar?: string;
    skipRows?: number;
    files: any[];
    moduleName?: string;
    funcName?: string;
    udfQuery?: any;
    typedColumns?: {colName: string, colType: string}[];
    advancedArgs?: any;
    targetName?: string;
    multiDS?: boolean;
}

namespace DSConfig {
    let $previewCard: JQuery;   // $("#dsForm-config");
    let $previewWrap: JQuery;    // $("#dsPreviewWrap")
    let $previewTable: JQuery;  // $("#previewTable")
    let $previewTableWrap: JQuery; //$("dsPreviewTableWrap")

    let $highlightBtns: JQuery; // $("#dsForm-highlighter");

    let $form: JQuery;          // $("#importDataForm")
    let $formatText: JQuery;    // $("#fileFormat .text")

    let $fieldText: JQuery;     // $("#fieldText");
    let $lineText: JQuery;      // $("#lineText");
    let $quote: JQuery;         // $("#dsForm-quote");

    let $udfModuleList: JQuery; // $("#udfArgs-moduleList")
    let $udfFuncList: JQuery;   // $("#udfArgs-funcList")
    let udfModuleHint: InputDropdownHint;
    let udfFuncHint: InputDropdownHint;

    let $headerCheckBox: JQuery; // $("#promoteHeaderCheckbox") promote header checkbox
    let componentDBFormat;
    let componentJsonFormat;
    let componentXmlFormat;
    let componentConfluentFormat;
    let componentSnowflakeFormat;
    let componentParquetFileFormat;
    let dataSourceSchema: DataSourceSchema;

    let tableName: string = null;
    let rawData = null;
    let previewOffset: number = 0;

    let highlighter: string = "";

    let loadArgs: DSFormController;
    let detectArgs: any = {};

    // UI cache
    let lastUDFModule: string = null;
    let lastUDFFunc: string = null;
    let rowsToFetch: number = 40;
    let previewId: number;
    let createTableMode: boolean = null;
    let _backCB: Function = null; // go back callback
    let previewHiddenForParquet: boolean = false;

    // constant
    const defaultRowsToFech: number = 40;
    const minRowsToShow: number = 20;
    const numBytesRequest: number = 15000;
    const maxBytesRequest: number = 500000;
    const defaultModule: string = "/sharedUDFs/default";
    const excelModule: string = defaultModule;
    const excelFunc: string = "openExcel";
    const parquetModule: string = defaultModule;
    const parquetFunc: string = "parseParquet";
    const colGrabTemplate: string = '<div class="colGrab" data-sizedtoheader="false"></div>';
    const oldPreviewError: string = "old preview error";

    const formatMap = {
        "JSON": "JSON",
        "JSONL": "JSONL",
        "CSV": "CSV",
        "TEXT": "TEXT",
        "EXCEL": "Excel",
        "UDF": "UDF",
        "XML": "XML",
        "PARQUET": "PARQUET",
        "PARQUETFILE": "PARQUETFILE",
        "DATABASE": "DATABASE",
        "CONFLUENT": "CONFLUENT",
        "SNOWFLAKE": "SNOWFLAKE",
    };

    /**
     * DSConfig.setup
     */
    export function setup(): void {
        $previewCard = $("#dsForm-config");
        $previewWrap = $("#dsPreviewWrap");
        $previewTable = $("#previewTable");
        $previewTableWrap = $("#dsPreviewTableWrap");
        $highlightBtns = $("#dsForm-highlighter");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");
        $quote = $("#dsForm-quote");

        // form part
        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox");
        loadArgs = new DSFormController();

        componentDBFormat = createDatabaseFormat({
            udfModule: defaultModule,
            udfFunction: 'ingestFromDatabase',
            sqlID: 'dsForm-dbSQL',
            containerID: 'importDataForm-content',
        });
        componentJsonFormat = createJsonFormat({
            $container: $form,
            udfModule: defaultModule,
            udfFunction: 'extractJsonRecords'
        });
        createPreviewLoader({
            $container: $previewCard,
            refreshPreviewFunc: () => {
                refreshPreview(true, true);
            }
        });
        componentXmlFormat = createXMLFormat({
            $container: $form,
            udfModule: defaultModule,
            udfFunction: 'xmlToJsonWithExtraKeys'
        });
        componentConfluentFormat = createConfluentFormat({
            $container: $form,
            udfModule: defaultModule,
            udfFunction: 'ingestFromConfluent'
        });
        componentSnowflakeFormat = createSnowflakeFormat({
            $container: $form,
            udfModule: defaultModule,
            udfFunction: 'snowflakeTableLoad'
        });

        setupDataSourceSchema();
        setupDataMartConfig();

        // select a char as candidate delimiter
        $previewTable.mouseup(function(event) {
            if ($previewTable.hasClass("has-delimiter")) {
                return;
            }
            if ($(event.target).hasClass('truncMessage')) {
                return;
            }

            let selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if ((<any>document).selection) {
                selection = (<any>document).selection.createRange();
            }

            applyHighlight(selection.toString());
        });

        $previewTable.on("mousedown", ".editableHead", function() {
            $("#importColRename").trigger("blur");
            if ($("#importColRename").length) {
                return false;
            }
            let $input = $(this);
            $input.removeClass("error");
            let rect = this.getBoundingClientRect();
            let val = xcStringHelper.escapeDblQuoteForHTML($input.val());
            const maxWidth: number = 400;
            let width = rect.width;
            let html: HTML = '<input class="xc-input" id="importColRename" ' +
                            'spellcheck="false" type="text" value="' + val +
                            '" ' + ' style="width:' + width + 'px;top:' +
                            rect.top + 'px;left:' + rect.left + 'px;">';

            $previewWrap.append(html);
            let $renameInput = $("#importColRename");
            $renameInput.data("$input", $input);
            let scrollWidth = $renameInput[0].scrollWidth;
            if (scrollWidth > (width - 2)) {
                width = Math.min($previewCard.find(".previewSection").width(),
                                scrollWidth + 80);
                $renameInput.outerWidth(width);
            }

            if (width > $previewCard.find(".previewSection").width()) {
                $renameInput.outerWidth($previewCard.find(".previewSection")
                            .width());
            }

            rect = $renameInput[0].getBoundingClientRect();
            let winRight = $(window).width() - 5;
            let diff = rect.right - winRight;
            if (diff > 0) {
                var newLeft = rect.left - diff;
                $renameInput.css("left", newLeft);
            } else if (rect.left < $previewCard.offset().left) {
                $renameInput.css("left", $previewCard.offset().left);
            }

            $previewCard.find(".previewSection").scroll(function() {
                cleanupColRename();
            });

            $renameInput.on("keydown", function(event) {
                if (event.which === keyCode.Enter) {
                    $renameInput.trigger("blur");
                }
            });

            let scrollTimeout;

            $renameInput.on("input", function() {
                $renameInput.removeClass("error");
                $renameInput.tooltip("destroy");
                clearTimeout(scrollTimeout);
                let scrollWidth = $renameInput[0].scrollWidth;
                if (scrollWidth < maxWidth &&
                    scrollWidth > ($renameInput.outerWidth() - 2)) {
                    $renameInput.outerWidth(scrollWidth + 80);
                    rect = $renameInput[0].getBoundingClientRect();
                    let winRight = $(window).width() - 5;
                    let diff = rect.right - winRight;
                    if (diff > 0) {
                        let newLeft = rect.left - diff;
                        $renameInput.css("left", newLeft);
                    }
                }
            });

            // if we don't use a timeout, editablehead blur is triggered and
            // renameInput is removed immediately so we never see it
            setTimeout(function() {
                $renameInput.focus();
                $renameInput.selectAll();

                // if scroll is triggered, don't validate, just return to old
                // value
                $renameInput.on("blur", function() {
                    let val = $renameInput.val();
                    $renameInput.tooltip("destroy");
                    clearTimeout(scrollTimeout);
                    if (isCreateTableMode()) {
                        val = val.toUpperCase();
                    }
                    let nameErr = xcHelper.validateColName(val);
                    if (!nameErr && checkIndividualDuplicateName(val,
                                    $input.closest("th").index())) {
                        nameErr = ErrTStr.ColumnConflict;
                    }
                    if (nameErr) {
                        $renameInput.focus().addClass("error");

                        xcTooltip.transient($renameInput, {
                            "title": nameErr,
                            "template": xcTooltip.Template.Error
                        });

                        scrollTimeout = setTimeout(function() {
                            $renameInput.tooltip('destroy');
                        }, 5000);

                        return false;
                    }

                    $input.val(val);
                    $renameInput.remove();
                    $previewCard.find(".previewSection").off("scroll");
                    hideHeadersWarning();

                    // sync up schema
                    updateSchema();
                });
            });
        });

        xcMenu.add($previewCard.find(".castDropdown"));

        $previewTable.on("click", ".flex-left", function() {
            let $dropdown = $previewCard.find(".castDropdown");
            $dropdown.data('th', $(this).closest("th"));
            let types: ColumnType[] = BaseOpPanel.getBasicColTypes();
            let typesStr = types.map((type) => `type-${type}`).join(" ");
            $dropdown.removeClass(typesStr);
            $dropdown.addClass("type-" + $(this).closest("th").data("type"));
            $(this).addClass("selected");
            positionAndShowCastDropdown($(this));
        });

        $previewCard.find(".castDropdown").find("li").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            let type: string = $(this).data("type");
            let $th = $previewCard.find(".castDropdown").data("th");
            let types: ColumnType[] = BaseOpPanel.getBasicColTypes();
            let typesStr = types.map((type) => `type-${type}`).join(" ");
            let $header: JQuery = $th.find(".header");
            $header.removeClass(typesStr);
            $header.addClass("type-" + type);
            $th.data("type", type);
            xcTooltip.changeText($th.find(".flex-left"),
                                    xcStringHelper.capitalize(type) +
                                    '<br>' + DSTStr.ClickChange);
            hideHeadersWarning();
            updateSchema();
        });

        $highlightBtns.on("click", ".highlight", function() {
            if (highlighter === "") {
                return;
            }
            applyFieldDelim(highlighter);
            getPreviewTable();
        });

        $highlightBtns.on("click", ".rmHightLight", function() {
            // case of remove highlighter
            applyHighlight("");
        });

        // resize column
        $previewTable.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            $("#importColRename").trigger("blur");
            if ($("#importColRename").length) {
                return;
            }

            // prevent resize from letting the table get smaller than 175px
            const minTableWidth: number = 175;
            let curWidth: number = $(this).closest("th").outerWidth();
            let tableWidth: number = $previewTable.outerWidth();
            let extraTableWidth: number = tableWidth - minTableWidth;
            let minColWidth: number = Math.max(25, curWidth - extraTableWidth);
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: minColWidth,
                onResize: function() {
                    // size line divider to fit table
                    let tableWidth = $previewTable.width();
                    $previewTable.find('.divider').width(tableWidth - 10);
                }
            });
        });

        $previewWrap.on("mouseenter", ".tooltipOverflow", function() {
            let text: string = $(this).is("input") ? $(this).val() : $(this).text();
            xcTooltip.add($(this), {"title": xcStringHelper.escapeHTMLSpecialChar(text)});
            xcTooltip.auto(this);
        });

        $previewCard.find(".previewHeader").click(function(event) {
            if ($(event.target).closest(".refresh").length) {
                return;
            }
            if ($previewCard.hasClass("hidingPreview")) {
                showPreview();
            } else {
                $previewCard.addClass("hidingPreview");
            }
        });

        // set up format dropdownlist
        let menuHepler: MenuHelper = new MenuHelper($("#preview-file"), {
            onSelect: function($li) {
                let index: number;
                if ($li.hasClass("mainPath") && !$li.hasClass("singlePath")) {
                    index = Number($li.data("index"));
                    if ($li.hasClass("collapse")) {
                        // expand case
                        previewFileSelect(index, false);
                        $li.removeClass("collapse");
                    } else {
                        $("#preview-file").find('.subPathList[data-index="' + index + '"]').empty();
                        $li.addClass("collapse");
                    }
                    menuHepler.showOrHideScrollers();
                    return true; // keep the menu open
                } else if ($li.hasClass("hint")) {
                    return true;
                } else {
                    $("#preview-file").find("li.active").removeClass("active");
                    $li.addClass("active");
                    let path: string = $li.data("path");
                    if ($li.hasClass("mainPath")) {
                        index = Number($li.data("index"));
                    } else {
                        let $subPathList = $li.closest(".subPathList");
                        index = Number($subPathList.data("index"));
                    }
                    changePreviewFile(index, path);
                }
            },
            onOpen: setActivePreviewFile,
            "container": "#dsForm-config",
            "bounds": "#dsForm-config",
            "bottomPadding": 5
        }).setupListeners();

        $previewWrap.on("click", ".cancelLoad", function() {
            let txId: number = $(this).data("txid");
            QueryManager.cancelQuery(txId);
        });

        let contentScrollTimer;
        let contentIsScrolling: boolean = false;
        $("#importDataForm-content").scroll(function() {
            if (!contentIsScrolling) {
                StatusBox.forceHide();
            }
            contentIsScrolling = true;
            clearInterval(contentScrollTimer);
            contentScrollTimer = setTimeout(function() {
                contentIsScrolling = false;
            }, 500);
        });

        // preview
        let $previewBottom = $previewWrap.find(".previewBottom");
        $previewBottom.on("click", ".action", function() {
            showMoreRows();
        });

        setupForm();

        let $bottomCard = $previewCard.find(".cardBottom");
        let bottomCardTop: number = 0;
        $bottomCard .on('mousedown', '.ui-resizable-n', function() {
            bottomCardTop = $bottomCard.position().top;
        });
        let cardHeight: number;

        $bottomCard.resizable({
            handles: "n",
            containment: 'parent',
            start: function(_event, ui) {
                $bottomCard.css('top', bottomCardTop);
                ui.originalPosition.top = bottomCardTop;
                ui.position.top = bottomCardTop;
                cardHeight = $previewCard.height();
                $previewWrap.outerHeight('100%');
                $previewWrap.addClass("dragging");
                // if resize is triggered, don't validate, just return to old
                // value
                if ($("#importColRename").length) {
                    $("#importColRename").val($("#importColRename")
                                         .data("$input").val());
                    $("#importColRename").trigger("blur");
                }
            },
            resize: function(_event, ui) {
                if (ui.position.top < 40) {
                    $bottomCard.css("top", "40px");
                    $bottomCard.height(cardHeight - 40);
                }
            },
            stop: function() {
                let containerHeight: number = $previewCard.find(".cardWrap").height();
                bottomCardTop = $bottomCard.position().top;

                let topPct: number = 100 * (bottomCardTop / containerHeight);

                $bottomCard.css('top', topPct + '%');
                $bottomCard.outerHeight((100 - topPct) + '%');
                $previewWrap.outerHeight(topPct + '%');
                setTimeout(function() {
                    $previewWrap.removeClass("dragging");
                });
            }
        });

        $("#importDataForm-content").on("click", ".inputPart .row label", function() {
            // copies filepath to clipboard
            let $filepathLabel = $(this);
            let value: string = $filepathLabel.attr("data-original-title") || $filepathLabel.text();
            xcUIHelper.copyToClipboard(value);

            $filepathLabel.parent().addClass("copiableText");
            setTimeout(function() {
                $filepathLabel.parent().removeClass("copiableText");
            }, 1800);
        });

        setupPreviewErrorSection();
    }

    function setupPreviewErrorSection(): void {
        $previewCard.find(".errorSection").on("click", ".suggest", function() {
            let format: string = $(this).data("format");
            changeFormat(format);
        });
    }

    /**
     * DSConfig.show
     * @param options
     * options:
     * pattern: pattern of the path (can only be one path, not supported yet)
     * should be generated by xcStringHelper.getFileNamePattern(pattern, isRegex)
     * @param lastPath
     * @param restore // set to true if restoring after an error
     */
    export function show(
        options: DSPreviewOptions,
        backCB: Function,
        restore: boolean
    ) {
        xcUIHelper.enableSubmit($form.find(".confirm"));
        DataSourceManager.switchView(DataSourceManager.View.Preview);

        if (isCreateTableMode()) {
            $previewCard.addClass("createTable");
        } else {
            $previewCard.removeClass("createTable");
        }

        resetPreviewFile();
        hideHeadersWarning();
        resetForm();

        _backCB = backCB;
        if (restore) {
            restoreForm(options);
        } else {
            loadArgs.set(options);
        }

        setDefaultDSName();

        var udfModule = null;
        var func = null;
        var typedColumns = null;
        if (restore) {
            udfModule = options.moduleName;
            func = options.funcName;
            typedColumns = options.typedColumns;
        } else {
            // all other rest format first
            // otherwise, cannot detect speical format(like special json)
            loadArgs.setFormat(null);
        }

        hideDataFormatsByTarget(loadArgs.getTargetName());

        setTargetInfo(loadArgs.getTargetName());
        setPreviewPaths();

        return previewData({
            "udfModule": udfModule,
            "udfFunc": func,
            "isFirstTime": true,
            "typedColumns": typedColumns,
            "isRestore": restore
        });
    }

    /**
     * DSConfig.setMode
     */
    export function setMode(flag: boolean): void {
        createTableMode = flag;
    }

    /**
     * DSConfig.isCreateTableMode
     */
    export function isCreateTableMode(): boolean {
        if (DataSourceManager.isCreateTableMode()) {
            return true;
        } else if (createTableMode != null) {
            return createTableMode;
        } else {
            return $("#sourceTblButton").hasClass("active");
        }
    }

    /**
     * DSConfig.update
     */
    export function update(listXdfsObj?: any): void {
        let moduleName = $udfModuleList.find("input").data("module");
        let funcName = $udfFuncList.find("input").val();

        listUDFSection(listXdfsObj)
        .always(() => {
            selectUDF(moduleName, funcName);
        });
    }

    /**
     * DSConfig.clear
     */
    export function clear(): XDPromise<boolean> {
        if ($("#dsForm-config").hasClass("xc-hidden")) {
            // when preview table not shows up
            return PromiseHelper.resolve(null);
        } else {
            createTableMode = null;
            cancelRunningPreview();
            return clearPreviewTable(tableName);
        }
    }

    /**
     * DSConfig.cancelRunningPreview
     */
    export function cancelLaod(): void {
        cancelRunningPreview();
    }

    /**
     * DSConfig.getFormatFromParserFnName
     * @param parserFnName
     */
    export function getFormatFromParserFnName(parserFnName: string): string {
        let format = null;
        switch (parserFnName) {
            case "default:parseCsv":
                format = formatMap.CSV;
                break;
            case "default:parseJson":
            case "default:extractJsonRecords":
                format = formatMap.JSON;
                break;
            case "default:openExcel":
                format = formatMap.EXCEL;
                break;
            case "default:xmlToJsonWithExtraKeys":
                format = formatMap.XML;
                break;
            case "default:parseParquet":
                format = formatMap.PARQUET;
                break;
            case "default:ingestFromDatabase":
                format = formatMap.DATABASE;
                break;
            default:
                break;
        }
        if (format == null &&
            parserFnName &&
            !parserFnName.startsWith("default:")
        ) {
            format = formatMap.UDF;
        }
        return format;
    }

    function positionAndShowCastDropdown($div: JQuery): void {
        let $menu = $previewCard.find(".castDropdown");
        const topMargin: number = 1;
        let top: number = $div[0].getBoundingClientRect().bottom + topMargin;
        let left: number = $div[0].getBoundingClientRect().left;

        $menu.css({'top': top, 'left': left});
        xcMenu.show($menu, function() {
            $menu.data("th").find(".flex-left").removeClass("selected");
        });
        let rightBoundary: number = $(window).width() - 5;

        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $menu.width();
            $menu.css('left', left);
        }
        xcTooltip.hideAll();
    }

    function cleanupColRename(): void {
        $("#importColRename").tooltip("destroy");
        $("#importColRename").remove();
        $previewCard.find(".previewSection").off("scroll");
    }

    function setupDataSourceSchema(): void {
        dataSourceSchema = new DataSourceSchema(getSchemaRow(), true);
        dataSourceSchema
        .registerEvent(DataSourceSchemaEvent.GetHintSchema, function() {
            return getHintSchema();
        })
        .registerEvent(DataSourceSchemaEvent.ChangeSchema, function(arg){
            applySchemaChangeToPreview(arg.schema, arg.newNames, arg.autoDetect);
        })
        .registerEvent(DataSourceSchemaEvent.ValidateSchema, function(schema) {
            return validateMatchOfSchemaAndHeaders(schema);
        })
        .registerEvent(DataSourceSchemaEvent.ToggleAutoDetect, function(arg) {
            if (arg.autoDetect) {
                csvArgChange();
                getPreviewTable();
                arg.callback(getHintSchema());
            }
        });
    }

    function setupDataMartConfig(): void {
        const whiteList: string[] = [formatMap.CSV, formatMap.JSON, formatMap.JSONL, formatMap.PARQUETFILE, formatMap.PARQUET, formatMap.EXCEL.toUpperCase(), formatMap.UDF];
        $("#fileFormatMenu li").each((_index, el) => {
            const $li = $(el);
            const name: string = $li.attr("name");
            if (!whiteList.includes(name)) {
                $li.addClass("xc-hidden");
            }
        });
    }

    function updateSchema(): void {
        var schema = getSchemaFromPreviewTable();
        dataSourceSchema.setSchema(schema, true);
    }

    function getHintSchema(): ColSchema[] {
        let schema = getSchemaFromPreviewTable();
        if (loadArgs.getFormat() === formatMap.CSV) {
            return schema;
        } else {
            let basicTypes = BaseOpPanel.getBasicColTypes();
            let recTypes = suggestColumnHeadersType(true);
            let newSchema = [];
            schema.forEach((colInfo, i) => {
                let type = recTypes[i];
                if (basicTypes.includes(type)) {
                    newSchema.push({
                        name: colInfo.name,
                        type: type
                    });
                }
            });
            return newSchema;
        }
    }

    function getHeadersFromSchema(
        schema: ColSchema[],
        newNames: string[],
    ): {colName: string, colType: ColumnType}[] | null {
        newNames = newNames || [];
        let headers: {colName: string, colType: ColumnType}[] = null;
        if (schema && schema.length) {
            headers = schema.map((colInfo, index) => {
                return {
                    colName: newNames[index] || colInfo.name,
                    colType: colInfo.type
                };
            });
        }
        return headers;
    }

    function getSchemaFromHeader(
        headers: {colName: string, colType: string}[]
    ): ColSchema[] {
        let schema = headers.map((header) => {
            return {
                name: header.colName,
                type: <ColumnType>header.colType
            };
        });
        return schema;
    }

    function validateMatchOfSchemaAndHeaders(schema: ColSchema[]): string | null {
        if (isCreateTableMode() || loadArgs.getFormat() !== formatMap.CSV) {
            return null; // only check CSV case in import dataset
        }
        let validSchema = getSchemaFromPreviewTable();
        if (schema.length !== validSchema.length) {
            return "Schema should include " + validSchema.length + " columns";
        }
    }

    function applySchemaChangeToPreview(
        schema: ColSchema[],
        newNames: string[],
        autoDetect: boolean
    ): void {
        let isCSV: boolean = (loadArgs.getFormat() === formatMap.CSV);
        let isCreateTable = isCreateTableMode();
        if (!isCSV && !isCreateTable) {
            return;
        }

        let sourceIndex = loadArgs.getPreivewIndex();
        if (sourceIndex == null) {
            return;
        }
        let headers = null;
        if (autoDetect) {
            headers = loadArgs.getSuggestHeaders(sourceIndex);
        } else {
            headers = getHeadersFromSchema(schema, newNames);
        }

        if (headers != null) {
            loadArgs.setPreviewHeaders(sourceIndex, headers);
            if (isCSV) {
                restoreColumnHeaders(sourceIndex, headers);
            }
            if (isCreateTable) {
                syncHeaderWithSchemaSection();
            }
        }
    }

    function autoFillDataSourceSchema(autoDetect: boolean): void {
        try {
            if (autoDetect) {
                dataSourceSchema.setAutoSchema();
            } else if (loadArgs.getFormat() === formatMap.CSV) {
                let sourceIndex = loadArgs.getPreivewIndex();
                let headers = loadArgs.getPreviewHeaders(sourceIndex);
                let schema;
                if (headers) {
                    schema = getSchemaFromHeader(headers);
                } else {
                    schema = getSchemaFromPreviewTable();
                }
                dataSourceSchema.setSchema(schema);
            } else {
                let schema = getHintSchema();
                dataSourceSchema.setSchema(schema);
                applySchemaChangeToPreview(schema, [], false);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function setupForm(): void {
        $form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $form.on("click", ".topSection .actionPart", function() {
            $(this).closest(".topSection").toggleClass("collapse");
        });


        // set up format drop down list
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                changeFormat(format);
            },
            "onOpen": function() {
                // XXX check if multiple files and enable/disable parquet option
                //$("#fileFormatMenu").find('li[name="PARQUET"]');
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        // setUp line delimiter and field delimiter
        new MenuHelper($("#lineDelim"), {
            "onSelect": selectDelim,
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        new MenuHelper($("#fieldDelim"), {
            "onSelect": selectDelim,
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        let $csvDelim = $("#lineDelim, #fieldDelim");
        $csvDelim.on("input", "input", function() {
            let $input = $(this);
            $input.removeClass("nullVal");

            let isFieldDelimiter = ($input.attr("id") === "fieldText");
            changeDelimiter(isFieldDelimiter);
        });

        $csvDelim.on("click", ".iconWrapper", function() {
            $(this).closest(".dropDownList").find(".text").focus();
        });

        // quote
        $quote.on("input", function() {
            let hasChangeQuote = setQuote();
            if (hasChangeQuote) {
                csvArgChange();
                getPreviewTable();
            }
        });

        // header
        $headerCheckBox.on("click", function() {
            let $checkbox = $headerCheckBox.find(".checkbox");
            if ($checkbox.hasClass("checked")) {
                // remove header
                $checkbox.removeClass("checked");
                toggleHeader(false);
            } else {
                $checkbox.addClass("checked");
                toggleHeader(true);
            }
            csvArgChange();
            getPreviewTable();
        });

        // skip rows
        $("#dsForm-skipRows").on("input", function() {
            csvArgChange();
            getPreviewTable();
        });

        // back button
        $form.on("click", ".cancel", function() {
            let backCB = _backCB;
            // cancels udf load
            cancelRunningPreview();
            resetForm();
            clearPreviewTable(tableName);
            createTableMode = null;
            if (typeof backCB === "function") {
                // XXX changet to support multiple of paths
                backCB();
            } else {
                DataSourceManager.startImport(null);
            }
        });

        // submit the form
        $form.on("click", ".confirm, .createTable", function() {
            let $submitBtn = $(this).blur();
            let createTable = $submitBtn.hasClass("createTable");
            $("#importColRename").tooltip("destroy");
            $("#importColRename").remove();
            submitForm(createTable);
        });

        $form.submit(function(event) {
            // any button click will trigger submit
            event.preventDefault();
        });

        $("#dsForm-snowflake-table").on("blur", function() {
            const name = $("#dsForm-snowflake-table").val().trim();
            if (name) {
                $form.find(".dsName").eq(0).val(PTblManager.Instance.getUniqName(name.toUpperCase()));
            }
        });

        setupUDFSection();
        setupXMLSection();
        setupAdvanceSection();
        setupParquetSection();

        componentParquetFileFormat = ParquetFileForm.Instance;
        componentParquetFileFormat.setup();
    }

    function setupUDFSection() {
        $("#dsForm-applyUDF").click(function() {
            $(this).blur();
            refreshPreview(true);
            showPreview();
        });

        // dropdown list for udf modules and function names
        let moduleMenuHelper = new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                let udfModule: string = $li.data("module");
                selectUDFModule(udfModule);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        });

        let funcMenuHelper = new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        });

        udfModuleHint = new InputDropdownHint($udfModuleList, {
            "menuHelper": moduleMenuHelper,
            "onEnter": selectUDFModuleOnEnter
        });

        udfFuncHint = new InputDropdownHint($udfFuncList, {
            "menuHelper": funcMenuHelper,
            "onEnter": selectUDFFunc
        });
    }

    function setupXMLSection(): void {
        $form.on("click", ".row.xml .checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });
    }

    function setupAdvanceSection(): void {
        // advance section
        let $advanceSection = $form.find(".advanceSection");
        $advanceSection.on("click", ".listWrap", function() {
            $advanceSection.toggleClass("active");
            $(this).toggleClass("active");
        });

        let $extraCols = $advanceSection.find(".extraCols");
        $extraCols.on("click", ".checkboxSection", function() {
            let $part = $(this).closest(".part");
            let $checkbox = $part.find(".checkbox");

            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
                $part.removeClass("active");
            } else {
                $checkbox.addClass("checked");
                $part.addClass("active");
                $part.find("input").focus();
            }
            addAdvancedRows();
        });

        let $fileName = $advanceSection.find(".fileName");
        $fileName.on("input", "input", function() {
            let text = $(this).val().trim();
            $previewTable.find(".extra.fileName .text").text(text);
        });

        let $rowNumber = $advanceSection.find(".rowNumber");
        $rowNumber.on("input", "input", function() {
            let text = $(this).val().trim();
            $previewTable.find(".extra.rowNumber .text").text(text);
        });

        $advanceSection.find(".performance").on("click", ".checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        xcUIHelper.optionButtonEvent($advanceSection, null);
    }

    function initParquetForm(path: string, targetName: string): XDPromise<void> {
        let $parquetSection = $form.find(".parquetSection");
        let $partitionList = $parquetSection.find(".partitionList");
        let $availableColList = $parquetSection.find(".availableColSection " +
                                  ".colList");
        let $selectedColList = $parquetSection.find(".selectedColSection " +
                                 ".colList");
        $partitionList.empty();
        $availableColList.empty();
        $selectedColList.empty();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        getParquetInfo(path, targetName)
        .then((ret: any) => {
            for (let schemaKey in ret.schema) {
                let dfType = DfFieldTypeTFromStr[ret.schema[schemaKey].xcalarType];
                let xcTypeIcon: string = "xi-unknown";
                if (dfType) {
                    xcTypeIcon = xcUIHelper.getColTypeIcon(dfType);
                } else {
                    switch (ret.schema[schemaKey].xcalarType) {
                        case ("DfObject"):
                            xcTypeIcon = "xi-object";
                            break;
                        case ("DfArray"):
                            xcTypeIcon = "xi-array";
                            break;
                    }
                }
                $availableColList.append(
                  '<li>' +
                  '  <div class="iconWrap">' +
                  '    <i class="icon ' + xcTypeIcon + '"></i>' +
                  '  </div>' +
                  '  <span class="colName">' + schemaKey + '</span>' +
                  '  <i class="icon xi-plus"></i>' +
                  '</li>'
                );
            }
            ret.partitionKeys.map(function(elem) {
                $partitionList.append(
                '<div class="row">' +
                '  <label>' + elem + ':</label>' +
                '  <div class="inputWrap">' +
                '    <input class="large" type="text" value="*">' +
                '  </div>' +
                '</div>');
                let $li = $availableColList.find("li").filter(function() {
                    return $(this).find(".colName").text() === elem;
                });
                $li.addClass("mustSelect").find(".xi-plus").click();
                $li.find(".xi-minus").remove();
                xcTooltip.add($li, {
                    title: TooltipTStr.ParquetCannotRemovePartition
                });
            });
            deferred.resolve();

        })
        .fail((error) => {
            let errorS = {
                error: "The dataset that you have selected cannot be " +
                             "parsed as a parquet dataset. Click the " +
                             "BACK button and select another folder.",
                log: null
            };
            try {
                errorS.log = error.output.errStr;
            } catch (e) {
            }

            Alert.error("Error Parsing Parquet Dataset", errorS, {
                buttons: [{
                    name: "BACK",
                    className: "confirm",
                    func: function() {
                        $form.find(".cancel").click();
                    }
                }]
            });
            deferred.reject();
        });
        return deferred.promise();
    }

    function getParquetInfo(path: string, targetName: string): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let appName = "XcalarParquet";
        let pathToParquetDataset = path;
        let args = {
            func: "getInfo",
            targetName: targetName,
            path: pathToParquetDataset
        };
        XcalarAppExecute(appName, false, JSON.stringify(args))
        .then((result) => {
            let outStr = result.outStr;
            let appResult = JSON.parse(JSON.parse(outStr)[0][0]);
            if (!appResult.validParquet) {
                // TODO handle error
                deferred.reject();
            } else {
                deferred.resolve({
                    partitionKeys: appResult.partitionKeys,
                    schema: appResult.schema
                });
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function setupParquetSection(): void {
        $("#fileFormatMenu").find('li[name="PARQUET"]');

        let $parquetSection = $form.find(".parquetSection");
        let $availableColList = $parquetSection.find(".availableColSection " +
                                  ".colList");
        let $selectedColList = $parquetSection.find(".selectedColSection " +
                                 ".colList");
        $parquetSection.on("click", ".listWrap", function() {
            $parquetSection.toggleClass("active");
            $(this).toggleClass("active");
        });

        $parquetSection.on("click", ".columnSearch .iconWrapper", function() {
            $(this).closest(".columnSearch").find("input").focus();
        });

        $parquetSection.on("input", ".columnSearch input", function() {
            let $input = $(this);
            let keyword = $input.val();
            let keywordClean = keyword.trim();
            let index = $(this).closest(".columnHalf").index();
            searchColumn(keywordClean, index);
            if (keyword.length) {
                $input.closest(".columnSearch").addClass("hasVal");
            } else {
                $input.closest(".columnSearch").removeClass("hasVal");
            }
        });

        $parquetSection.on("blur", ".columnSearch input", function() {
            let $input = $(this);
            let keyword = $input.val();
            if (keyword.length) {
                $input.closest(".columnSearch").addClass("hasVal");
            } else {
                $input.closest(".columnSearch").removeClass("hasVal");
            }
        });

        $parquetSection.on("mousedown", ".columnSearch .clear", function(event) {
            let $input = $(this).closest(".columnSearch").find("input");
            if ($input.val() !== "") {
                $input.val("").trigger("input").focus(); // triggers search
                event.preventDefault(); // prevent input from blurring
            }
        });

        $availableColList.on("click", "li .colName", function() {
            $(this).next(".xi-plus").click();
        });

        $availableColList.on("click", ".xi-plus", function() {
            let $colPill = $(this).closest("li");
            $colPill.remove();
            $selectedColList.append($colPill);
            $colPill.find(".xi-plus").removeClass("xi-plus")
                                      .addClass("xi-minus");
            resetSearch($selectedColList);
        });

        $selectedColList.on("click", "li .colName", function() {
            $(this).next(".xi-minus").click();
        });

        $selectedColList.on("click", ".xi-minus", function() {
            let $colPill = $(this).closest("li");
            $colPill.remove();
            $availableColList.append($colPill);
            $colPill.find(".xi-minus").removeClass("xi-minus")
                                      .addClass("xi-plus");
            resetSearch($availableColList);
        });

        $parquetSection.on("click", ".removeAllCols", function() {
            let $allPills = $selectedColList.find("li:not(.filteredOut)");
            for (let i = 0; i< $allPills.length; i++) {
                $allPills.eq(i).find(".xi-minus").click();
            }
            // TODO handle clearing search
            // TODO only one can be searched at a time. Can't have both filters
        });

        $parquetSection.on("click", ".addAllCols", function() {
            let $allPills = $availableColList.find("li:not(.filteredOut)");
            for (let i = 0; i< $allPills.length; i++) {
                $allPills.eq(i).find(".xi-plus").click();
            }
        });

        function resetSearch($colList: JQuery): void {
            let $lis = $colList.find("li");
            $lis.removeClass("filteredOut");
            $colList.closest(".columnHalf").find(".columnSearch input").val("");
        }

        function searchColumn(keyword: string, index: number): void {
            let $colList = $parquetSection.find(".colList").eq(index);
            let $lis = $colList.find("li");
            $lis.removeClass("filteredOut");
            if (!keyword) {
                if (!$lis.length) {
                    $colList.addClass("empty");
                } else {
                    $colList.removeClass("empty");
                }
                return;
            }
            $lis.filter(function() {
                return !$(this).text().includes(keyword);
            }).addClass("filteredOut");

            if ($lis.length === $lis.filter(".filteredOut").length) {
                $colList.addClass("empty");
            } else {
                $colList.removeClass("empty");
            }
        }
    }

    function listUDFSection(listXdfsObj?: any): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!listXdfsObj) {
            // update python module list
            UDFFileManager.Instance.list()
            .then((res) => {
                UDFFileManager.Instance.filterWorkbookAndSharedUDF(res);
                updateUDFList(res);
                deferred.resolve();
            })
            .fail((error) => {
                console.error("List UDF Fails!", error);
                deferred.reject(error);
            });
        } else {
            updateUDFList(listXdfsObj);
            deferred.resolve();
        }

        return deferred.promise();
    }

    function updateUDFList(listXdfsObj: any): void {
        let udfObj: any = xcHelper.getUDFList(listXdfsObj);
        $udfModuleList.find("ul").html(udfObj.moduleLis);
        $udfFuncList.find("ul").html(udfObj.fnLis);
    }

    function validateUDFModule(udfModule: string): boolean {
        // check if udf module exists
        let $li = $udfFuncList.find(".list li").filter(function() {
            return ($(this).data("module") === udfModule);
        });
        return ($li.length > 0);
    }

    function validateUDFFunc(udfModule: string, func: string): boolean {
        // check if udf exists
        let $li = $udfFuncList.find(".list li").filter(function() {
            let $el = $(this);
            return ($el.data("module") === udfModule &&
                    $el.text() === func);
        });
        return ($li.length > 0);
    }

    function resetUdfSection(options?): void {
        // restet the udf lists, otherwise the if clause in
        // selectUDFModule() and selectUDFFunc() will
        // stop the reset from triggering
        // only when cached moduleName and funcName is not null
        // we restore it
        if (lastUDFModule != null && lastUDFFunc != null &&
            validateUDFFunc(lastUDFModule, lastUDFFunc)) {

            selectUDFModule(lastUDFModule);
            selectUDFFunc(lastUDFFunc);
        } else {
            // when cannot restore it
            lastUDFModule = null;
            lastUDFFunc = null;

            selectUDFModule("");
            selectUDFFunc("");
        }

        let $textArea = $("#dsForm-udfExtraArgs");
        if (options && options.udfQuery) {
            $textArea.val(JSON.stringify(options.udfQuery));
        } else {
            $textArea.val("");
        }
    }

    function selectUDF(moduleName: string, funcName: string): void {
        if (validateUDFModule(moduleName)) {
            selectUDFModule(moduleName);
            if (!validateUDFFunc(moduleName, funcName)) {
                funcName = "";
            }
            selectUDFFunc(funcName);
        } else {
            // if udf module not exists
            selectUDFModule("");
            selectUDFFunc("");
        }
    }

    function selectUDFModuleOnEnter(displayedModuleName: string): void {
        let moduleName = $udfModuleList.find("li").filter(function() {
            return $(this).text() === displayedModuleName;
        }).data("module") || "";
        selectUDFModule(moduleName);
    }

    function selectUDFModule(moduleName: string): void {
        if (moduleName == null) {
            moduleName = "";
        }
        var displayedModuleName = $udfModuleList.find("li").filter(function() {
                                    return $(this).data("module") === moduleName;
                                }).text() || "";
        $udfModuleList.find("input").data("module", moduleName);
        udfModuleHint.setInput(displayedModuleName);

        if (moduleName === "") {
            $udfFuncList.addClass("disabled")
                    .find("input").attr("disabled", "disabled");
            selectUDFFunc("");

            $udfFuncList.parent().tooltip(<any>{
                "title": TooltipTStr.ChooseUdfModule,
                "placement": "top",
                "container": "#dsFormView"
            });
        } else {
            $udfFuncList.parent().tooltip("destroy");
            $udfFuncList.removeClass("disabled")
                        .find("input").removeAttr("disabled");
            let $funcLis = $udfFuncList.find(".list li").addClass("hidden")
                            .filter(function() {
                                return $(this).data("module") === moduleName;
                            }).removeClass("hidden");
            if ($funcLis.length === 1) {
                selectUDFFunc($funcLis.eq(0).text());
            } else {
                selectUDFFunc("");
            }
        }
    }

    function selectUDFFunc(func: string): void {
        func = func || "";
        let $button = $("#dsForm-applyUDF");
        if (func) {
            $button.removeClass("xc-disabled");
            udfFuncHint.setInput(func);
        } else {
            $button.addClass("xc-disabled");
            udfFuncHint.clearInput();
        }
    }

    function cacheUDF(udfModule: string, udfFunc: string): boolean {
        // cache udf module and func name
        if (udfModule && udfFunc) {
            lastUDFModule = udfModule;
            lastUDFFunc = udfFunc;
            return true;
        } else {
            return false;
        }
    }

    function isUseUDF(): boolean {
        return (loadArgs.getFormat() === "UDF");
    }

    function isUseUDFWithFunc(): boolean {
        if (isUseUDF()) {
            let $funcInput = $udfFuncList.find("input");
            if ($funcInput.val() !== "") {
                return true;
            }
        }

        return false;
    }

    function resetRowsToPreview(): void {
        rowsToFetch = defaultRowsToFech;
    }

    function getRowsToPreview(): number {
        return rowsToFetch;
    }

    function addRowsToPreview(extraRowsToAdd: number): void {
        rowsToFetch += extraRowsToAdd;
    }

    function resetForm(): void {
        $form.find("input").val("");
        $("#dsForm-skipRows").val("0");
        $("#dsForm-excelIndex").val("0");
        componentXmlFormat.resetState();
        componentJsonFormat.reset();
        componentParquetFileFormat.reset();
        componentConfluentFormat.reset();
        componentSnowflakeFormat.reset();
        dataSourceSchema.reset();
        $("#dsForm-udfExtraArgs").val("");
        $form.find(".checkbox.checked").removeClass("checked");
        $form.find(".collapse").removeClass("collapse");
        $previewWrap.find(".inputWaitingBG").remove();
        $previewWrap.find(".url").removeClass("xc-disabled");
        $previewCard.removeClass("format-parquet");

        let $advanceSection = $form.find(".advanceSection").removeClass("active");
        $advanceSection.find(".active").removeClass("active");
        $advanceSection.find(".radioButton").eq(0).addClass("active");
        cleanupColRename();

        loadArgs.reset();
        detectArgs = {
            "fieldDelim": "",
            "lineDelim": "\n",
            "hasHeader": false,
            "skipRows": 0,
            "quote": "\""
        };
        resetUdfSection();
        toggleFormat(null);
        // enable submit
        xcUIHelper.enableSubmit($form.find(".confirm"));

        // reset delimiter fields
        // to show \t, \ should be escaped
        $("#fieldText").val("Null").addClass("nullVal");
        $("#lineText").val("\\n").removeClass("nullVal");

        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");
        $previewWrap.find(".loadHidden").removeClass("hidden");
        toggleSubmitButton(false);
        _backCB = null;
    }

    function resetPreviewRows(): void {
        resetRowsToPreview();
        $previewWrap.find(".previewBottom")
                   .removeClass("load")
                   .removeClass("end");
    }

    function restoreForm(options: DSPreviewOptions): void {
        $form.find("input").not($formatText).val("");
        $form.find(".checkbox.checked").removeClass("checked");

        // dsName
        $form.find(".dsName").eq(0).val(options.dsName);

        // format
        var format = options.format;
        if (format === formatMap.UDF) {
            cacheUDF(options.moduleName, options.funcName);
            resetUdfSection(options);
        } else if (format === formatMap.EXCEL) {
            $("#dsForm-excelIndex").val(0);
            $("#dsForm-skipRows").val(0);
            if (options.udfQuery) {
                if (options.udfQuery.sheetIndex) {
                    $("#dsForm-excelIndex").val(options.udfQuery.sheetIndex);
                }
                if (options.udfQuery.skipRows) {
                    options.skipRows = options.udfQuery.skipRows;
                    // This gets populated later
                }
            }
        } else if (format === formatMap.XML) {
            componentXmlFormat.restore({ udfQuery: options.udfQuery });
        } else if (format === formatMap.PARQUETFILE) {
            componentParquetFileFormat.restore(options.udfQuery);
        } else if (format === formatMap.PARQUET) {
            // Restore partitions based on the url
            try {
                var partitions = options.files[0].path.split("?")[1].split("&");
                for (var i = 0; i < partitions.length; i++) {
                    var value = partitions[i].split("=")[1];
                    // partition keys must be in order
                    $form.find(".partitionAdvanced .partitionList .row input").eq(i)
                        .val(decodeURIComponent(value));
                }
            } catch (e) {
                console.error(e);
            }
        } else if (format === formatMap.CSV) {
            // CSV preview don't use UDF
            delete options.moduleName;
            delete options.funcName;
        } else if (format == formatMap.DATABASE) {
            componentDBFormat.restore({
                dsn: options.udfQuery.dsn,
                query: options.udfQuery.query
            });
            delete options.moduleName;
            delete options.funcName;
        } else if (format == formatMap.CONFLUENT) {
            componentConfluentFormat.restore(options.udfQuery);
            delete options.moduleName;
            delete options.funcName;
        } else if (format === formatMap.SNOWFLAKE) {
            componentSnowflakeFormat.restore(options.udfQuery);
            delete options.moduleName;
            delete options.funcName;
        } else if (format === formatMap.JSON || format === formatMap.JSONL) {
            const useUDF = componentJsonFormat.restore(
                {udfQuery: options.udfQuery});
            if (!useUDF) {
                delete options.moduleName;
                delete options.funcName;
            }
        }
        // Nothing to do for PARQUET FILE since it's just one thing
        options.format = format;
        loadArgs.set(options);
        toggleFormat(format);

        // header
        if (options.hasHeader) {
            toggleHeader(true);
        }

        //delims
        applyFieldDelim(options.fieldDelim || "");
        applyLineDelim(options.lineDelim || "");

        // quote char
        applyQuote(options.quoteChar || "");

        // skip rows
        $("#dsForm-skipRows").val(options.skipRows || 0);

        detectArgs = {
            "fieldDelim": options.fieldDelim,
            "lineDelim": options.lineDelim,
            "hasHeader": options.hasHeader,
            "skipRows": options.skipRows,
            "quote": options.quoteChar
        };

        if (options.advancedArgs) {
            restoreAdvancedArgs(options.advancedArgs);
        }
    }

    function restoreAdvancedArgs(
        advancedArgs: {
            fileName: string,
            rowNumName: string,
            allowRecordErrors: boolean,
            allowFileErrors: boolean
        }
    ): void {
        try {
            var hasAdvancedArg;
            advancedArgs = advancedArgs || <any>{};
            if (advancedArgs.fileName) {
                restoreExtraCols("fileName", advancedArgs.fileName);
                hasAdvancedArg = true;
            }
            if (advancedArgs.rowNumName) {
                restoreExtraCols("rowNumber", advancedArgs.rowNumName);
                hasAdvancedArg = true;
            }
            if (restoreTerminationOptions(advancedArgs.allowRecordErrors, advancedArgs.allowFileErrors)) {
                hasAdvancedArg = true;
            }

            if (hasAdvancedArg) {
                openAdvanceSection();
            }
        } catch (e) {
            console.error(e);
        }
    }

    function restoreExtraCols(fieldName: string, value: string): void {
        let $advanceSection = $form.find(".advanceSection");
        let $field = $advanceSection.find("." + fieldName);
        $field.find(".checkboxSection").click();
        $field.find("input").val(value);
    }

    function restoreTerminationOptions(
        allowRecordErrors: boolean,
        allowFileErrors: boolean
    ): boolean {
        let $advanceSection = $form.find(".advanceSection");
        let $row = $advanceSection.find(".termination");
        let option: string;
        let hasAdvancedArg: boolean = false;

        if (allowRecordErrors === true && allowFileErrors === true) {
            option = "continue";
            hasAdvancedArg = true;
        } else if (allowRecordErrors === false && allowFileErrors === true) {
            option = "stoprecord";
            hasAdvancedArg = true;
        } else {
            option = "stop";
        }

        if (hasAdvancedArg) {
            $row.find(".radioButton.active").removeClass("active");
            $row.find('.radioButton[data-option="' + option + '"]').addClass("active");
        }
        return hasAdvancedArg;
    }

    function submitForm(createTable: boolean): XDPromise<void> {
        let res = validateForm();
        if (res == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let dsNames = res.dsNames;
        let format = res.format;

        let udfModule = res.udfModule;
        let udfFunc = res.udfFunc;
        let udfQuery = res.udfQuery;

        let fieldDelim = res.fieldDelim;
        let lineDelim = res.lineDelim;

        let quote = res.quote;
        let skipRows = res.skipRows;

        let header = loadArgs.useHeader();

        let rowNumName = res.rowNum || "";
        let fileName = res.fileName || "";
        let allowRecordErrors = res.allowRecordErrors || false;
        let allowFileErrors = res.allowFileErrors || false;

        let advancedArgs = {
            rowNumName: rowNumName,
            fileName: fileName,
            allowRecordErrors: allowRecordErrors,
            allowFileErrors: allowFileErrors
        };

        let typedColumns = getColumnHeaders(null);

        cacheUDF(udfModule, udfFunc);
        xcUIHelper.disableSubmit($form.find('.confirm'));
        // enableSubmit is done during the next showing of the form
        // If the form isn't shown, there's no way it can be submitted
        // anyway
        let dsArgs = {
            "format": format,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "hasHeader": header,
            "moduleName": udfModule,
            "funcName": udfFunc,
            "quoteChar": quote,
            "skipRows": skipRows,
            "udfQuery": udfQuery,
            "advancedArgs": advancedArgs,
            "schema": res.schema,
            "newNames": res.newNames,
            "primaryKeys": res.primaryKeys
        };
        let curPreviewId = previewId;

        invalidHeaderDetection(typedColumns)
        .then(() => {
            return getTypedColumnsList(typedColumns, dsArgs);
        })
        .then((typedColumnsList) => {
            if (isValidPreviewId(curPreviewId)) {
                FileBrowser.clear();
            }

            return importDataHelper(dsNames, dsArgs, typedColumnsList, createTable);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getTypedColumnsList(
        typedColumns: {colType: string, colName: string}[],
        dsArgs: any
    ): XDPromise<{colType: string, colName: string}[][]> {
        let format: string = dsArgs.format;
        if (format !== formatMap.CSV) {
            // no cast for other formats
            return PromiseHelper.resolve([]);
        }

        let sourceIndex = loadArgs.getPreivewIndex();
        let prevTypedCols = loadArgs.getOriginalHeaders(sourceIndex);
        typedColumns = normalizeTypedColumns(prevTypedCols, typedColumns);

        let multiDS = loadArgs.multiDS;
        if (!multiDS) {
            return PromiseHelper.resolve([typedColumns]);
        }

        let deferred: XDDeferred<{colType: string, colName: string}[][]> = PromiseHelper.deferred();
        let typedColumnsList = getCacheHeadersList(sourceIndex, typedColumns);

        slowPreviewCheck()
        .then(() => {
            return getTypedColumnsListHelper(typedColumnsList, dsArgs);
        })
        .then(() => {
            deferred.resolve(typedColumnsList);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function normalizeTypedColumns(
        prevTypedCols: {colType: string, colName: string}[],
        typedColumns: {colType: string, colName: string}[]
    ): {colType: string, colName: string}[] | null {
        if (!hasTypedColumnChange(prevTypedCols, typedColumns)) {
            return null;
        }
        return typedColumns;
    }

    function hasTypedColumnChange(
        prevTypedCols: {colType: string, colName: string}[],
        currTypedCols: {colType: string, colName: string}[]
    ): boolean {
        prevTypedCols = prevTypedCols || [];
        currTypedCols = currTypedCols || [];
        for (var i = 0; i < currTypedCols.length; i++) {
            if (!prevTypedCols[i]) {
                return true;
            }
            if ((currTypedCols[i].colName !== prevTypedCols[i].colName) ||
                (currTypedCols[i].colType !== prevTypedCols[i].colType)) {
                return true;
            }
        }
        return false;
    }

    function getCacheHeadersList(
        sourceIndex: number,
        typedColumns: {colType: string, colName: string}[]
    ): {colType: string, colName: string}[][] {
        let typedColumnsList: {colType: string, colName: string}[][] = [];
        typedColumnsList[sourceIndex] = typedColumns;
        let cachedHeaders = loadArgs.headersList;
        for (let i = 0; i < cachedHeaders.length; i++) {
            if (i !== sourceIndex && cachedHeaders[i] != null) {
                let originalHeaders = loadArgs.getOriginalHeaders(i);
                typedColumnsList[i] = normalizeTypedColumns(originalHeaders, cachedHeaders[i]);
            }
        }
        return typedColumnsList;
    }

    function slowPreviewCheck(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        const previewLimit: number = 10;
        let targetName: string = loadArgs.getTargetName();
        let shouldAlert: boolean = true;
        let msg: string;

        if (loadArgs.files.length > previewLimit) {
            msg = xcStringHelper.replaceMsg(DSFormTStr.TooManyPreview, {
                num: loadArgs.files.length
            });
        } else if (DSTargetManager.isSlowPreviewTarget(targetName)) {
            msg = xcStringHelper.replaceMsg(DSFormTStr.SlowTargetPreview, {
                target: targetName
            });
        } else {
            shouldAlert = false;
        }

        if (shouldAlert) {
            Alert.show({
                title: DSFormTStr.ImportMultiple,
                msg: msg,
                onCancel: () => {
                    xcUIHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                },
                onConfirm: () => {
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    function getTypedColumnsListHelper(
        typedColumnsList: {colType: string, colName: string}[][],
        dsArgs: any
    ): XDPromise<{colType: string, colName: string}[][]> {
        let deferred: XDDeferred<{colType: string, colName: string}[][]> = PromiseHelper.deferred();
        let files = loadArgs.files;
        let targetName = loadArgs.getTargetName();
        let promises = [];

        for (let i = 0; i < files.length; i++) {
            if (typedColumnsList[i] !== undefined) {
                // null is a valid case
                continue;
            }

            let def = autoDetectSourceHeaderTypes(files[i], targetName, dsArgs, typedColumnsList, i);
            promises.push(def);
        }

        PromiseHelper.when(...promises)
        .always(() => {
            deferred.resolve(typedColumnsList); // always resolve
        });

        return deferred.promise();
    }

    function autoDetectSourceHeaderTypes(
        file: {path: string, autoCSV: boolean},
        targetName: string,
        dsArgs: any,
        typedColumnsList: {colType: string, colName: string}[][],
        index: number
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        // fetch data
        let args = {
            targetName: targetName,
            path: file.path,
        };
        XcalarPreview(args, numBytesRequest, 0)
        .then((res) => {
            if (res && res.buffer) {
                typedColumnsList[index] = getTypedColumnsFromData(res.buffer, dsArgs, file);
            }
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function getTypedColumnsFromData(
        data: string,
        dsArgs: any,
        file: {path: string, autoCSV: boolean}
    ): {colType: string, colName: string}[] | null {
        let lineDelim: string = dsArgs.lineDelim;
        let fieldDelim: string = dsArgs.fieldDelim;
        let hasHeader: boolean = dsArgs.hasHeader;
        let quoteChar: string = dsArgs.quoteChar;

        try {
            let strippedData = xcStringHelper.replaceInsideQuote(data, quoteChar);
            let rows = strippedData.split(lineDelim);
            let originalHeaders: string[] = [];
            let headers: string[] = [];

            if (hasHeader) {
                var header = rows[0];
                rows = rows.slice(1);
                originalHeaders = header.split(fieldDelim).filter(function(name, index) {
                    return name || autoHeaderName(index);
                });
                headers = getValidNameSet(originalHeaders);
            }

            let columns: string[][] = [];
            rows.forEach(function(row) {
                let splits = row.split(fieldDelim);
                splits.forEach((cell, colIndex) => {
                    columns[colIndex] = columns[colIndex] || [];
                    columns[colIndex].push(cell);
                });
            });

            if (columns.length > gMaxDSColsSpec) {
                // auto detect case
                file.autoCSV = true;
                return null;
            }

            let columTypes: ColumnType[] = columns.map((datas) => {
                return xcSuggest.suggestType(datas, null);
            });
            let originalTypedColumns: {colName: string, colType: string}[] = [];
            let typedColumns: {colName: string, colType: string}[] = [];

            columTypes.forEach((colType, index) => {
                let originalColName: string = originalHeaders[index] || autoHeaderName(index);
                let colName: string = headers[index] || originalColName;
                typedColumns.push({
                    colName: colName,
                    colType: colType
                });

                originalTypedColumns.push({
                    colName: originalColName,
                    colType: ColumnType.string
                });
            });

            return normalizeTypedColumns(originalTypedColumns, typedColumns);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    function importDataHelper(
        dsNames: string[],
        dsArgs: any,
        typedColumnsList: {colType: string, colName: string}[][],
        createTable: boolean
    ): XDPromise<void> {
        let multiDS: boolean = loadArgs.multiDS;
        let files = loadArgs.files;
        let targetName: string = loadArgs.getTargetName();
        let promises: XDPromise<void>[] = [];
        let getSource = function(file) {
            return {
                targetName: targetName,
                path: file.path,
                recursive: file.recursive,
                fileNamePattern: file.fileNamePattern
            };
        };

        let getAutoDetectUDFArgs = function(dsArgs, file) {
            if (dsArgs.format !== formatMap.CSV || !file.autoCSV) {
                return null;
            }

            return {
                moduleName: defaultModule,
                funcName: "standardizeColumnNamesAndTypes",
                udfQuery: {
                    withHeader: dsArgs.hasHeader,
                    skipRows: dsArgs.skipRows,
                    field: dsArgs.fieldDelim,
                    record: dsArgs.lineDelim,
                    quote: dsArgs.quoteChar,
                    allowMixed: false
                }
            };
        };

        if (multiDS) {
            files.forEach(function(file, index) {
                // need {} to create a different copy than poinArgs
                let source = getSource(file);
                let extraUDFArgs = getAutoDetectUDFArgs(dsArgs, file);
                let args = $.extend({}, dsArgs, {
                    "name": dsNames[index],
                    "sources": [source],
                    "typedColumns": typedColumnsList[index]
                }, extraUDFArgs);
                let promise;
                if (createTable) {
                    promise =  PromiseHelper.convertToJQuery(TblSource.Instance.import(args.name, args, null));
                } else{
                    promise = DS.load(args, {});
                }
                promises.push(promise);
            });
            return PromiseHelper.when(...promises);
        } else {

            let sources = files.map(getSource);
            let previewIndex = loadArgs.getPreivewIndex();
            let extraUDFArgs = getAutoDetectUDFArgs(dsArgs, files[previewIndex]);
            let multiLoadArgs = $.extend(dsArgs, {
                "name": dsNames[0],
                "sources": sources,
                "typedColumns": typedColumnsList[0]
            }, extraUDFArgs);
            let dsToReplace = files[0].dsToReplace || null;
            let promise;
            if (createTable) {
                const newLoadSchema = _translateSchema(dsArgs);
                promise = PromiseHelper.convertToJQuery(TblSource.Instance.import(multiLoadArgs.name, multiLoadArgs, newLoadSchema));
            } else {
                promise = DS.load(multiLoadArgs, {
                    "dsToReplace": dsToReplace
                });
            }
            return promise;
        }
    }

    // XXX TODO: return ColSchema[]
    function getColumnHeaders(isCSV: boolean): {colType: string, colName: string}[] {
        let headers: {colType: string, colName: string}[] = [];
        let $ths = $previewTable.find("th:not(.rowNumHead):not(.extra)");
        if (isCSV || loadArgs.getFormat() === formatMap.CSV) {
            $ths.each(function() {
                let $th = $(this);
                let type: ColumnType = $th.data("type") || ColumnType.string;
                let header = {
                    colType: type,
                    colName: $th.find(".text").val()
                };
                headers.push(header);
            });
        } else {
            $ths.each(function() {
                let header = {
                    colType: "",
                    colName: $(this).find(".text").text()
                };
                headers.push(header);
            });
        }

        return headers;
    }

    function getSchemaFromPreviewTable() {
        let headers = getColumnHeaders(null);
        return getSchemaFromHeader(headers);
    }

    function validateDSNames(): string[] | null {
        let isValid: boolean = true;
        let dsNames: string[] = [];
        let files = loadArgs.files;

        // validate name
        $form.find(".dsName").each(function(index) {
            let $dsName = $(this);
            let dsName: string = $dsName.val().trim();
            if (isCreateTableMode()) {
                dsName = dsName.toUpperCase();
            }
            isValid = xcHelper.validate([
                {
                    "$ele": $dsName
                },
                {
                    "$ele": $dsName,
                    "error": ErrTStr.TooLong,
                    "formMode": true,
                    "check": function() {
                        return (dsName.length >=
                                XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                    }
                },
                {
                    "$ele": $dsName,
                    "error": isCreateTableMode() ? ErrTStr.TableStartsWithLetter : ErrTStr.DSStartsWithLetter,
                    "formMode": true,
                    "check": function() {
                        return !xcStringHelper.isStartWithLetter(dsName);
                    }
                },
                {
                    "$ele": $dsName,
                    "formMode": true,
                    "error": isCreateTableMode() ? ErrTStr.TableConflict : ErrTStr.DSNameConfilct,
                    "check": function(name) {
                        // dsId is the same as dsName
                        var dsToReplace = files[index].dsToReplace || null;
                        if (dsToReplace &&
                            name === xcHelper.parseDSName(dsToReplace).dsName) {
                            return false;
                        }
                        let hasName = PTblManager.Instance.hasTable(name);
                        return hasName || dsNames.includes(dsName); // already used
                    }

                },
                {
                    "$ele": $dsName,
                    "formMode": true,
                    "error": isCreateTableMode() ? ErrTStr.InvalidPublishedTableName : ErrTStr.NoSpecialCharOrSpace,
                    "check": function() {
                        let invalid = isCreateTableMode() ?
                        !xcHelper.checkNamePattern(PatternCategory.PTbl, PatternAction.Check, dsName):
                        !xcHelper.checkNamePattern(PatternCategory.Dataset, PatternAction.Check, dsName);
                        return invalid;
                    }
                }
            ]);

            dsNames.push(dsName);

            if (!isValid) {
                return false; // stop looping
            }
        });

        return isValid ? dsNames : null;
    }

    function validateFormat(): string | null {
        let format: string = loadArgs.getFormat();
        let isValid: boolean = xcHelper.validate([{
            "$ele": $formatText,
            "error": ErrTStr.NoEmptyList,
            "check": function() {
                return (format == null);
            }
        }]);
        return isValid ? format : null;
    }

    function validateUDF(): [string, string, string] | null {
        let $moduleInput = $udfModuleList.find("input");
        let $funcInput = $udfFuncList.find("input");
        let isValid = xcHelper.validate([
            {
                "$ele": $moduleInput,
                "error": ErrTStr.NoEmptyList
            },
            {
                "$ele": $funcInput,
                "error": ErrTStr.NoEmptyList
            }
        ]);

        if (!isValid) {
            return null;
        }

        let udfModule = $moduleInput.data("module");
        let udfFunc = $funcInput.val();
        let udfQuery = null;

        let $textArea = $("#dsForm-udfExtraArgs");
        let udfQueryStr = $textArea.val();
        if (udfQueryStr !== "") {
            try {
                udfQuery = JSON.parse(udfQueryStr);
            } catch (e) {
                StatusBox.show(DSFormTStr.UDFQueryError, $textArea);
                return null;
            }
        }

        return [udfModule, udfFunc, udfQuery];
    }

    function delimiterTranslate(
        $input: JQuery,
        val: string
    ): string | object {
        if ($input.hasClass("nullVal")) {
            return "";
        }
        let delim: string = $input.length ? $input.val() : val;
        // this change " to \", otherwise cannot use json parse
        for (let i = 0; i < delim.length; i++) {
            if (delim[i] === '\"' && !xcHelper.isCharEscaped(delim, i)) {
                delim = delim.slice(0, i) + '\\' + delim.slice(i);
                i++;
            }
        }

        // hack to turn user's escaped string into its actual value
        let objStr: string = '{"val":"' + delim + '"}';
        try {
            delim = JSON.parse(objStr).val;
            return delim;
        } catch (err) {
            console.error(err);
            return {fail: true, error: err};
        }
    }

    function validateCSVArgs(isCSV: boolean): [string, string, string, number] | null {
        // validate delimiter
        let fieldDelim = loadArgs.getFieldDelim();
        let lineDelim = loadArgs.getLineDelim();
        let quote = loadArgs.getQuote();
        let skipRows = getSkipRows();
        let isValid = xcHelper.validate([
            {
                "$ele": $fieldText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    // for Text foramt don't check field delim
                    let res = delimiterTranslate($fieldText, null);
                    return (isCSV && typeof res === "object");
                }
            },
            {
                "$ele": $lineText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    let res = delimiterTranslate($lineText, null);
                    return (typeof res === "object");
                }
            },
            {
                "$ele": $lineText,
                "error": DSFormTStr.InvalidLineDelim,
                "check": function() {
                    return lineDelim &&
                           lineDelim.length > 1 &&
                           lineDelim !== "\r\n";
                },
            },
            {
                "$ele": $quote,
                "error": DSFormTStr.InvalidQuote,
                "formMode": true,
                "check": function() {
                    let res = delimiterTranslate($quote, null);
                    return (typeof res === "object") || (res.length > 1);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        return [fieldDelim, lineDelim, quote, skipRows];
    }

    function validateExcelArgs(): {
        skipRows: number,
        sheetIndex: number,
        withHeader: boolean
    } | null {
        let excelIndex: number = parseInt($("#dsForm-excelIndex").val());
        let skipRows: number = parseInt($("#dsForm-skipRows").val());
        let isValid = xcHelper.validate([
            {
                "$ele": $("#dsForm-skipRows"),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $("#dsForm-skipRows").val().trim().length === 0;
                }
            },
            {
                "$ele": $("#dsForm-skipRows"),
                "error": ErrTStr.NoNegativeNumber,
                "formMode": true,
                "check": function() {
                    return skipRows < 0;
                }
            },
            {
                "$ele": $("#dsForm-excelIndex"),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $("#dsForm-excelIndex").val().trim().length === 0;
                }
            },
            {
                "$ele": $("#dsForm-excelIndex"),
                "error": ErrTStr.NoNegativeNumber,
                "formMode": true,
                "check": function() {
                    return excelIndex < 0;
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        return {
            skipRows: skipRows,
            sheetIndex: excelIndex,
            withHeader: loadArgs.useHeader()
        };
    }

    function validateParquetArgs(): {columns: string[], partitionKeys: {}} | null {
        let $parquetSection = $form.find(".parquetSection");
        let $selectedColList = $parquetSection.find(".selectedColSection .colList");
        let $cols = $selectedColList.find("li");
        let names: string[] = [];
        let hasNonPartition: boolean = false;
        for (let i = 0; i < $cols.length; i++) {
            if (!$cols.eq(i).hasClass("mustSelect")) {
                hasNonPartition = true;
            }
            names.push($cols.eq(i).find(".colName").text());
        }

        if (!hasNonPartition) {
            xcHelper.validate([{
                "$ele": $selectedColList,
                "error": ErrTStr.ParquetMustSelectNonPartitionCol,
                "formMode": true,
                "check": function() {
                    return true;
                }
            }]);
            return null;
        }

        let isValid: boolean = true;
        let $inputs = $parquetSection.find(".partitionList input");
        for (let i = 0; i < $inputs.length; i++) {
            isValid = xcHelper.validate([{
                "$ele": $inputs.eq(i),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $inputs.eq(i).val().trim().length === 0;
                }
            }]);

            if (!isValid) {
                return null;
            }
        }
        let $availableColList = $parquetSection.find(".availableColSection .colList");
        if ($availableColList.find("li").length === 0) {
            // when select all columns, let backend handle it
            names = null;
        }
        let partitionValues = {};
        let $partitions = $parquetSection.find(".partitionAdvanced .row");
        for (let i = 0; i < $partitions.length; i++) {
            let label = $partitions.eq(i).find("label").text();
            label = label.substring(0, label.length - 1);
            let paramValues = $partitions.eq(i).find("input").val();
            partitionValues[label] = paramValues.split(",");
        }

        return {columns: names, partitionKeys: partitionValues};
    }

    function validateAdvancedArgs(): {
        rowNum: string,
        fileName: string,
        unsorted: boolean,
        allowRecordErrors: boolean,
        allowFileErrors: boolean
    } | null {
        let $advanceSection = $form.find(".advanceSection");
        let $colNames = $("#previewTable .editableHead");
        let colNames: string[] = [];

        for (let i = 0; i < $colNames.length; i++) {
            colNames.push($colNames.eq(i).val());
        }

        let validateExtraColumnArg = function($ele) {
            let isValid: boolean = true;
            if ($ele.find(".checkbox").hasClass("checked")) {
                isValid = xcHelper.validate([{
                    $ele: $ele.find("input"),
                    check: function(val) {
                        return (xcHelper.validateColName(val) != null);
                    },
                    onErr: function() {
                        openAdvanceSection();
                    },
                    error: ErrTStr.InvalidColName,
                    delay: 300 // there is a forceHide event on scroll, so need delay to show the statusbox
                }, {
                    $ele: $ele.find("input"),
                    check: function(val) {
                        if (colNames.indexOf(val) > -1) {
                            return true;
                        } else {
                            colNames.push(val);
                        }
                    },
                    onErr: function() {
                        openAdvanceSection();
                    },
                    error: ErrTStr.ColumnConflict,
                    delay: 300 // there is a forceHide event on scroll, so need delay to show the statusbox
                }]);
            }
            return isValid;
        };

        let $fileName = $advanceSection.find(".fileName");
        let $rowNum = $advanceSection.find(".rowNumber");

        if (!validateExtraColumnArg($fileName) ||
            !validateExtraColumnArg($rowNum)) {
            return null;
        }

        let rowNum = getAdvancedRowNumber() || null;
        let fileName = getAdvancedFileName() || null;
        let unsorted = $advanceSection.find(".performance .checkbox")
                                      .hasClass("checked");
        let terminationOptions = getTerminationOptions();
        return {
            rowNum: rowNum,
            fileName: fileName,
            unsorted: unsorted,
            allowRecordErrors: terminationOptions.allowRecordErrors,
            allowFileErrors: terminationOptions.allowFileErrors
        };
    }

    function openAdvanceSection(): void {
        let $advanceSection = $form.find(".advanceSection");
        if (!$advanceSection.hasClass("active")) {
            $advanceSection.find(".listWrap").click();
        }
    }

    function getAdvancedRowNumber(): string | null {
        return getAdvancedField("rowNumber");
    }

    function getAdvancedFileName(): string | null {
        return getAdvancedField("fileName");
    }

    function getAdvancedField(fieldName: string): string | null {
        let $advanceSection = $form.find(".advanceSection");
        let $field = $advanceSection.find("." + fieldName);
        if ($field.find(".checkbox").hasClass("checked")) {
            return $field.find("input").val().trim();
        } else {
            return null;
        }
    }

    function getTerminationOptions(): {
        allowRecordErrors: boolean,
        allowFileErrors: boolean
    } {
        let $advanceSection = $form.find(".advanceSection");
        let termination = $advanceSection.find(".termination")
                                         .find(".radioButton.active")
                                         .data("option");
        let allowRecordErrors: boolean = false;
        let allowFileErrors: boolean = false;

        switch (termination) {
            case ("stop"):
                allowRecordErrors = false;
                allowFileErrors = false;
                break;
            case ("continue"):
                allowRecordErrors = true;
                allowFileErrors = true;
                break;
            case ("stopfile"): // Not used
                allowRecordErrors = true;
                allowFileErrors = false;
                break;
            case ("stoprecord"):
                allowRecordErrors = false;
                allowFileErrors = true;
                break;
            default:
                console.error("error case");
                break;
        }
        return {
            allowRecordErrors: allowRecordErrors,
            allowFileErrors: allowFileErrors
        };
    }

    function validatePreview( {isChangeFormat = false} = {} ): {
        format: string,
        udfModule: string,
        udfFunc: string,
        udfQuery: string,
        allowRecordErrors: boolean,
        allowFileErrors: boolean
    } | null {
        let format = validateFormat();
        if (format == null) {
            // error case
            return null;
        }

        let hasUDF = isUseUDF();
        let udfModule: string = "";
        let udfFunc: string = "";
        let udfQuery: any = null;

        if (hasUDF) {
            let udfArgs = validateUDF();
            if (udfArgs == null) {
                // error case
                return null;
            }
            [udfModule, udfFunc, udfQuery] = udfArgs;
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
            udfQuery = validateExcelArgs();
            if (udfQuery == null) {
                return null;
            } else {
                // preview case always use false
                udfQuery.withHeader = false;
            }
        } else if (format === formatMap.PARQUETFILE) {
            udfModule = parquetModule;
            udfFunc = parquetFunc;
            udfQuery = componentParquetFileFormat.getParser();
        } else if (format == formatMap.XML) {
            let xmlArgs = componentXmlFormat.validateValues({
                isShowError: !isChangeFormat,
                isCleanupModel: !isChangeFormat
            });
            if (xmlArgs != null) {
                let udfDef = componentXmlFormat.getUDFDefinition({
                    xPaths: xmlArgs.xPaths,
                    isWithPath: xmlArgs.isWithPath,
                    isMatchedPath: xmlArgs.isMatchedPath,
                    delimiter: xmlArgs.delimiter
                });
                udfModule = udfDef.udfModule;
                udfFunc = udfDef.udfFunc;
                udfQuery = udfDef.udfQuery;
            }
        } else if (format === formatMap.JSON || format === formatMap.JSONL) {
            let validRes = componentJsonFormat.validateValues();
            if (validRes == null) {
                return null;
            }

            let udfDef = componentJsonFormat.getUDFDefinition({
                jmespath: validRes.jmespath
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.DATABASE) {
            let dbArgs = componentDBFormat.validateValues();
            if (dbArgs == null) {
                return null;
            }
            let udfDef = componentDBFormat.getUDFDefinition({
                query: dbArgs.query
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.CONFLUENT) {
            let args = componentConfluentFormat.validateValues(true);
            if (args == null) {
                return null;
            }

            let udfDef = componentConfluentFormat.getUDFDefinition({
                numRows: args.numRows
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.SNOWFLAKE) {
            let args = componentSnowflakeFormat.validateValues(true);
            if (args == null) {
                return null;
            }

            let udfDef = componentSnowflakeFormat.getUDFDefinition({
                table_name: args.table_name
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        }

        let terminationOptions = getTerminationOptions();

        return {
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "udfQuery": udfQuery,
            "allowRecordErrors": terminationOptions.allowRecordErrors,
            "allowFileErrors": terminationOptions.allowFileErrors
        };
    }

    function validateForm(): any {
        let dsNames = validateDSNames();
        if (dsNames == null) {
            // error case
            return null;
        }

        let format = validateFormat();
        if (format == null) {
            // error case
            return null;
        }

        let hasUDF = isUseUDF();
        let udfModule = "";
        let udfFunc = "";
        let udfQuery = null;
        let fieldDelim = null;
        let lineDelim = null;
        let quote = null;
        let skipRows = null;
        let parquetArgs = {};

        if (hasUDF) {
            let udfArgs = validateUDF();
            if (udfArgs == null) {
                // error case
                return null;
            }
            [udfModule, udfFunc, udfQuery] = validateUDF();
        } else if (format === formatMap.TEXT || format === formatMap.CSV) {
            let isCSV = (format === formatMap.CSV);
            let csvArgs = validateCSVArgs(isCSV);
            if (csvArgs == null) {
                // error case
                return null;
            }
            fieldDelim = isCSV ? csvArgs[0] : null;
            lineDelim = csvArgs[1];
            quote = csvArgs[2];
            skipRows = csvArgs[3];
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
            udfQuery = validateExcelArgs();
            if (udfQuery == null) {
                return null;
            }
        } else if (format === formatMap.XML) {
            let xmlArgs = componentXmlFormat.validateValues();
            if (xmlArgs == null) {
                return null;
            }
            let udfDef = componentXmlFormat.getUDFDefinition({
                xPaths: xmlArgs.xPaths,
                isWithPath: xmlArgs.isWithPath,
                isMatchedPath: xmlArgs.isMatchedPath,
                delimiter: xmlArgs.delimiter
            });

            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.PARQUET) {
            parquetArgs = validateParquetArgs();
            if (parquetArgs == null) {
                return null;
            }
            udfModule = parquetModule;
            udfFunc = parquetFunc;
            udfQuery = parquetArgs;
        } else if (format === formatMap.PARQUETFILE) {
            udfModule = parquetModule;
            udfFunc = parquetFunc;
            udfQuery = componentParquetFileFormat.getParser();
        } else if (format === formatMap.DATABASE) {
            let dbArgs = componentDBFormat.validateValues();
            if (dbArgs == null) {
                return null;
            }

            let udfDef = componentDBFormat.getUDFDefinition({
                query: dbArgs.query
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.CONFLUENT) {
            let args = componentConfluentFormat.validateValues();
            if (args == null) {
                return null;
            }

            let udfDef = componentConfluentFormat.getUDFDefinition({
                numRows: args.numRows
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.SNOWFLAKE) {
                let args = componentSnowflakeFormat.validateValues();
                if (args == null) {
                    return null;
                }

                let udfDef = componentSnowflakeFormat.getUDFDefinition({
                    table_name: args.table_name
                });
                udfModule = udfDef.udfModule;
                udfFunc = udfDef.udfFunc;
                udfQuery = udfDef.udfQuery;
        } else if (format === formatMap.JSON || format === formatMap.JSONL) {
            let jsonArgs = componentJsonFormat.validateValues();
            if (jsonArgs == null) {
                return null;
            }
            let udfDef = componentJsonFormat.getUDFDefinition({
                jmespath: jsonArgs.jmespath
            });
            udfModule = udfDef.udfModule;
            udfFunc = udfDef.udfFunc;
            udfQuery = udfDef.udfQuery;
        }

        let schemaArgs = isCreateTableMode() ?
        dataSourceSchema.validate() : {schema: null, primaryKeys: null, newNames: null};
        if (schemaArgs == null) {
            // error case
            return null;
        }

        let advanceArgs = validateAdvancedArgs();
        if (advanceArgs == null) {
            // error case
            return null;
        }

        let schema = addExtrColToSchema(schemaArgs.schema,  advanceArgs)
        let args = {
            "dsNames": dsNames,
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "udfQuery": udfQuery,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "quote": quote,
            "skipRows": skipRows,
            "schema": schema,
            "newNames": schemaArgs.newNames,
            "primaryKeys": schemaArgs.primaryKeys
        };

        return $.extend(args, advanceArgs);
    }

    function addExtrColToSchema(
        schema: ColSchema[],
        advanceArgs: {rowNum: string, fileName: string}
    ): ColSchema[] {
        if (!isCreateTableMode() || schema == null) {
            return schema;
        }

        if (advanceArgs.rowNum) {
            schema.push({
                name: advanceArgs.rowNum,
                type: ColumnType.integer
            });
        }
        if (advanceArgs.fileName) {
            schema.push({
                name: advanceArgs.fileName,
                type: ColumnType.string
            });
        }
        return schema;
    }

    function getNameFromPath(path: string): string {
        if (path.charAt(path.length - 1) === "/") {
            // remove the last /
            path = path.substring(0, path.length - 1);
        }

        let paths = path.split("/");
        let splitLen = paths.length;
        let name = paths[splitLen - 1];

        // strip the suffix dot part and only keep a-zA-Z0-9.
        let category = null;
        if (isCreateTableMode()) {
            name = name.toUpperCase();
            category = PatternCategory.PTblFix;
        } else {
            category = PatternCategory.Dataset;
        }
        name = <string>xcHelper.checkNamePattern(category,
            PatternAction.Fix, name.split(".")[0], "_");

        if (!xcStringHelper.isStartWithLetter(name) && splitLen > 1) {
            // when starts with number
            let folderName: string = paths[splitLen - 2];
            if (isCreateTableMode()) {
                folderName = folderName.toUpperCase();
            }
            let prefix: string = <string>xcHelper.checkNamePattern(category,
                PatternAction.Fix, folderName, "_");
            if (xcStringHelper.isStartWithLetter(prefix)) {
                name = prefix + name;
            }
        }

        if (!xcStringHelper.isStartWithLetter(name)) {
            // if still starts with number
            name = "source" + name;
        }
        if (isCreateTableMode()) {
            // name may have prefix appended
            name = name.toUpperCase();
        }
        return PTblManager.Instance.getUniqName(name);
    }

    function getSkipRows(): number {
        let skipRows: number = Number($("#dsForm-skipRows").val());
        if (isNaN(skipRows) || skipRows < 0) {
            skipRows = 0;
        }
        return skipRows;
    }

    function autoFillNumberFields($input: JQuery): void {
        let num: number = Number($input.val());
        if (isNaN(num) || num < 0) {
            $input.val(0);
        }
    }

    function applyFieldDelim(strToDelimit: string): void {
        // may have error case
        strToDelimit = strToDelimit.replace(/\t/g, "\\t")
                                   .replace(/\n/g, "\\n")
                                   .replace(/\r/g, "\\r");
        highlighter = "";

        if (strToDelimit === "") {
            $fieldText.val("Null").addClass("nullVal");
        } else {
            $fieldText.val(strToDelimit).removeClass("nullVal");
        }

        setFieldDelim();
    }

    function applyLineDelim(strToDelimit: string): void {
        strToDelimit = strToDelimit.replace(/\t/g, "\\t")
                                   .replace(/\n/g, "\\n")
                                   .replace(/\r/g, "\\r");

        if (strToDelimit === "") {
            $lineText.val("Null").addClass("nullVal");
        } else {
            $lineText.val(strToDelimit).removeClass("nullVal");
        }

        setLineDelim();
    }

    function applyQuote(quote: string): void {
        $quote.val(quote);
        setQuote();
    }

    function changeDelimiter(isFieldDelimiter: boolean): void {
        let hasChangeDelimiter: boolean = false;
        if (isFieldDelimiter) {
            hasChangeDelimiter = setFieldDelim();
        } else {
            hasChangeDelimiter = setLineDelim();
        }

        if (hasChangeDelimiter) {
            csvArgChange();
            getPreviewTable();
        }
    }

    function selectDelim($li: JQuery): void {
        let $input = $li.closest(".dropDownList").find(".text");
        let isFieldDelimiter = ($input.attr("id") === "fieldText");
        $input.removeClass("nullVal");

        switch ($li.attr("name")) {
            case "tab":
                $input.val("\\t");
                break;
            case "comma":
                $input.val(",");
                break;
            case "LF":
                $input.val("\\n");
                break;
            case "CR":
                $input.val("\\r");
                break;
            case "CRLF":
                $input.val("\\r\\n");
                break;
            case "null":
                $input.val("Null").addClass("nullVal");
                break;
            default:
                console.error("error case");
                break;
        }

        $input.focus();
        changeDelimiter(isFieldDelimiter);
    }

    function setFieldDelim(): boolean {
        let fieldDelim = delimiterTranslate($fieldText, null);

        if (typeof fieldDelim === "object") {
            // error case
            return false;
        }

        loadArgs.setFieldDelim(fieldDelim);
        return true;
    }

    function setLineDelim(): boolean {
        let lineDelim = delimiterTranslate($lineText, null);

        if (typeof lineDelim === "object") {
            // error case
            return false;
        }

        loadArgs.setLineDelim(lineDelim);
        return true;
    }

    function setQuote(): boolean {
        let quote = delimiterTranslate($quote, null);

        if (typeof quote === "object") {
            // error case
            return false;
        }

        if (quote.length > 1) {
            return false;
        }

        loadArgs.setQuote(quote);
        return true;
    }

    function toggleFormat(format: string): boolean {
        if (format && $formatText.data("format") === format.toUpperCase()) {
            return false;
        }

        $form.find(".format").addClass("xc-hidden");
        if ($previewCard.hasClass("format-parquet")) {
            $previewCard.removeClass("format-parquet");
            // restore height of bottom card as parquet sets it to 100%
            var top = $previewCard.data("prevtop");
            $previewCard.find(".cardBottom").css("top", top);
            top = parseFloat(top);
            $previewCard.find(".cardMain").css("top", 100 - top);
        }

        xcTooltip.remove($previewCard.find(".ui-resizable-n"));
        xcTooltip.add($previewCard.find(".previewHeader span"), {
            title: "Toggle preview"
        });

        if (format == null) {
            // reset case
            $formatText.data("format", "").val("");
            loadArgs.setFormat(null);
            dataSourceSchema.hide();
            return false;
        }

        format = format.toUpperCase();
        let text: string = $('#fileFormatMenu li[name="' + format + '"]').text();
        $formatText.data("format", format).val(text);

        if (isCreateTableMode()) {
            dataSourceSchema.show();

            if (format === formatMap.CSV) {
                dataSourceSchema.toggleCaseInsensitive(true);
            } else {
                dataSourceSchema.toggleCaseInsensitive(false);
            }
        } else if (format === formatMap.CSV) {
            // import csv dataset case
            dataSourceSchema.show();
            dataSourceSchema.toggleCaseInsensitive(false);
        } else {
            dataSourceSchema.hide();
        }

        if (format !== "PARQUET" && previewHiddenForParquet) {
            $previewCard.removeClass("hidingPreview");
            previewHiddenForParquet = false;
        }

        switch (format) {
            case "CSV":
                $form.find(".format.csv").removeClass("xc-hidden");
                setFieldDelim();
                autoFillNumberFields($("#dsForm-skipRows"));
                break;
            case "TEXT":
                $form.find(".format.text").removeClass("xc-hidden");
                loadArgs.setFieldDelim("");
                break;
            case "EXCEL":
                autoFillNumberFields($("#dsForm-excelIndex"));
                autoFillNumberFields($("#dsForm-skipRows"));
                $form.find(".format.excel").removeClass("xc-hidden");
                break;
            case "JSON":
            case "JSONL":
                componentJsonFormat.show();
                break;
            case "PARQUETFILE":
                $form.find(".format.parquetfile").removeClass("xc-hidden");
                break;
            case "PARQUET":
                // For parquet, there can only be one sourceArg
                let filePath = loadArgs.files[0].path;
                let targetName = loadArgs.targetName;
                let el: HTMLElement = <HTMLElement>$previewCard.find(".cardBottom")[0];
                let prevTop = el.style.top;
                // store previous top % for if we switch back to other format
                $previewCard.data("prevtop", prevTop);
                $form.find(".format.parquet").removeClass("xc-hidden");
                $previewCard.addClass("format-parquet");
                xcTooltip.add($previewCard.find(".ui-resizable-n"), {
                    title: "Dataset preview is not available"
                });
                xcTooltip.add($previewCard.find(".previewHeader span"), {
                    title: "Dataset preview is not available"
                });
                initParquetForm(filePath, targetName);
                previewHiddenForParquet = !$previewCard.hasClass("hidingPreview");
                $previewCard.addClass("hidingPreview");
                break;
            case "UDF":
                $form.find(".format.udf").removeClass("xc-hidden");
                break;
            case "XML":
                componentXmlFormat.show();
                break;
            case "DATABASE":
                componentDBFormat.show();
                break;
            case "CONFLUENT":
                componentConfluentFormat.show();
                break;
            case "SNOWFLAKE":
                componentSnowflakeFormat.show();
                break;
            default:
                throw ("Format Not Support");
        }

        loadArgs.setFormat(formatMap[format]);
        return true;
    }

    function changeFormat(format: string): void {
        let oldFormat = loadArgs.getFormat();
        let hasChangeFormat = toggleFormat(format);
        let changeWithExcel = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "EXCEL" ||
                    formatNew.toUpperCase() === "EXCEL");
        };

        let changeWithParquetFile = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "PARQUETFILE" ||
                    formatNew.toUpperCase() === "PARQUETFILE");
        };

        let changeWithXml = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "XML" ||
                    formatNew.toUpperCase() === "XML");
        };
        let changeWithJson = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "JSON" ||
                    formatNew.toUpperCase() === "JSON");
        };

        if (hasChangeFormat) {
            if (oldFormat === formatMap.CSV) {
                showHeadersWarning(true);
            } else {
                hideHeadersWarning();
            }

            if (format === formatMap.UDF) {
                getPreviewTable(true);
            } else if (changeWithExcel(oldFormat, format) ||
                changeWithParquetFile(oldFormat, format) ||
                changeWithJson(oldFormat, format) ||
                changeWithXml(oldFormat, format) ||
                oldFormat === formatMap.UDF) {
                refreshPreview(true, true, true);
            } else {
                getPreviewTable();
            }
        }
    }

    function errorHandler(
        error: any,
        isUDFError: boolean,
        isCancel: boolean
    ): void {
        if (error && typeof error === "object") {
            if (error.status === StatusT.StatusNoEnt ||
                error.status === StatusT.StatusIsDir ||
                error.status === StatusT.StatusAllFilesEmpty)
            {
                error = xcStringHelper.escapeHTMLSpecialChar(error.error) + ", " + DSFormTStr.GoBack + ".";
            } else if (error.status === StatusT.StatusUdfExecuteFailed) {
                error = error.log ? error.log : error.error;
                error = xcStringHelper.escapeHTMLSpecialChar(error);
            } else {
                error = (error.error ? error.error : "") +
                        (error.log ?  "\nLog: " + error.log : "");
                error = xcStringHelper.escapeHTMLSpecialChar(error);
            }
        }

        error = error || ErrTStr.Unknown;

        $previewWrap.find(".waitSection").addClass("hidden")
                    .removeClass("hasUdf")
                   .find(".progressSection").empty();
        $previewWrap.find(".loadHidden").addClass("hidden");
        $previewWrap.find(".url").removeClass("xc-disabled");
        $previewTable.empty();
        xcTooltip.hideAll();

        let $errorSection = $previewWrap.find(".errorSection");
        let $bottomSection = $errorSection.find(".bottomSection");

        if (error && error.startsWith("Error:")) {
            error = error.slice("Error:".length).trim();
        }
        if (isUDFError) {
            $bottomSection.removeClass("xc-hidden");
            error = DSFormTStr.UDFError + "\n" + error;
        } else {
            $bottomSection.addClass("xc-hidden");
        }

        $errorSection.removeClass("hidden");

        if (isCancel) {
            $errorSection.addClass("cancelState");
        } else {
            $errorSection.find(".content").html(error);
        }
    }

    function cancelRunningPreview() {
        try {
            let $cancelLoad = $previewWrap.find(".cancelLoad");
            if ($cancelLoad.length) {
                let txId: number = $cancelLoad.data("txid");
                QueryManager.cancelQuery(txId);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // prevTableName is optional, if not provided will default to tableName
    // if provided, then will not reset tableName
    function clearPreviewTable(prevTableName: string): XDPromise<boolean> {
        let deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        applyHighlight(""); // remove highlighter
        $previewTable.removeClass("has-delimiter").empty();
        rawData = null;
        previewOffset = 0;
        resetPreviewRows();
        resetPreviewId();
        if (prevTableName) {
            let dsName: string = prevTableName;
            if (prevTableName === tableName) {
                tableName = null;
            }

            let sql = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName": dsName
            };
            let txId = Transaction.start({
                "operation": SQLOps.DestroyPreviewDS,
                "sql": sql,
                "track": true
            });

            XIApi.deleteDataset(txId, dsName)
            .then(() => {
                Transaction.done(txId, {
                    "noCommit": true,
                    "noLog": true
                });
                deferred.resolve(true);
            })
            .fail((error) => {
                Transaction.fail(txId, {
                    "error": error,
                    "noAlert": true
                });
                // fail but still resolve it because
                // it has no effect to other operations
                deferred.resolve(false);
            });
        } else {
            deferred.resolve(false);
        }

        return deferred.promise();
    }

    function updatePreviewId(): number {
        previewId = new Date().getTime();
        return previewId;
    }

    function resetPreviewId(): void {
        previewId = null;
    }

    function isValidPreviewId(id: number): boolean {
        return (id === previewId);
    }

    function previewData(
        options: any,
        clearPreview = false
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        options = options || <any>{};
        let isFirstTime: boolean = options.isFirstTime || false;
        let isRestore: boolean = options.isRestore || false;
        let noDetect: boolean = isRestore || options.noDetect || false;
        let isSuggestDetect: boolean = options.isSuggestDetect || false;
        let udfModule: string = options.udfModule || null;
        let udfFunc: string = options.udfFunc || null;
        let udfQuery: any = options.udfQuery || null;
        let format: string;

        let targetName: string = loadArgs.getTargetName();
        let dsName: string = $form.find(".dsName").eq(0).val();
        let hasUDF: boolean = false;
        let shouldNotPreview: boolean = false;

        if (udfModule && udfFunc) {
            hasUDF = true;
        } else if (!udfModule && !udfFunc) {
            hasUDF = false;
        } else {
            // when udf module == null or udf func == null
            // it's an error case
            return PromiseHelper.reject("Error Case!");
        }

        let cachedTableName: string = tableName;
        if (clearPreview && !hasUDF) {
            clearPreviewTable(tableName); // async remove the old ds
        }

        // cache what was not hidden and only unhide these sections
        // if operation canceled
        let $visibleLoadHiddenSection = $previewWrap.find(".loadHidden:not('" +
                                                  ".hidden')");
        let $loadHiddenSection = $previewWrap.find(".loadHidden")
                                            .addClass("hidden");
        let $waitSection = $previewWrap.find(".waitSection")
                                    .removeClass("hidden");
        $previewWrap.find(".url").addClass("xc-disabled");
        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");

        let sql: any = {"operation": SQLOps.PreviewDS};
        let txId = Transaction.start({
            "operation": SQLOps.PreviewDS,
            "sql": sql,
            "track": true,
            "steps": 1
        });

        let curPreviewId = updatePreviewId();
        let initialLoadArgStr: string;
        toggleSubmitButton(true);
        getURLToPreview()
        .then((ret: {sourceIndex: number, url: string}) => {
            const {sourceIndex, url} = ret;
            setPreviewFile(sourceIndex, url);

            if (isRestore) {
                loadArgs.setPreviewHeaders(sourceIndex, options.typedColumns);
            }

            if (isFirstTime && !hasUDF) {
                if (isExcel(url)) {
                    hasUDF = true;
                    udfModule = excelModule;
                    udfFunc = excelFunc;
                    toggleFormat("EXCEL");
                } else if (isParquetFile(url)) {
                    hasUDF = true;
                    udfModule = parquetModule;
                    udfFunc = parquetFunc;
                    toggleFormat("PARQUETFILE");
                 } else if (DSTargetManager.isGeneratedTarget(targetName)) {
                    // special case
                    hasUDF = true;
                    noDetect = true;
                    udfModule = defaultModule;
                    udfFunc = "convertNewLineJsonToArrayJson";
                    seletNewLineJSONToArrayUDF();
                } else if (DSTargetManager.isDatabaseTarget(targetName)) {
                    if (isRestore) {
                        // Restore from error on dataset preview screen
                        componentDBFormat.setDefaultSQL({ sourceSelected: loadArgs.getPreviewFile(), replaceExisting: false });

                        let dbArgs = componentDBFormat.validateValues();
                        if (dbArgs == null) {
                            // This should never happen, because we already did validateFrom
                            return PromiseHelper.reject('Error case');
                        }
                        let udfDef = componentDBFormat.getUDFDefinition({
                            query: dbArgs.query
                        });
                        hasUDF = true;
                        udfModule = udfDef.udfModule;
                        udfFunc = udfDef.udfFunc;
                        udfQuery = udfDef.udfQuery;
                    } else {
                        // Comes from dsForm
                        componentDBFormat.setDefaultSQL({ sourceSelected: loadArgs.getPreviewFile(), replaceExisting: false });

                        const dbArgs = componentDBFormat.validateValues();
                        // Preview with default SQL, which is provided by dsn_connector
                        let udfDef = componentDBFormat.getUDFDefinition({
                            query: dbArgs.query
                        });
                        hasUDF = true;
                        noDetect = true;
                        udfModule = udfDef.udfModule;
                        udfFunc = udfDef.udfFunc;
                        udfQuery = udfDef.udfQuery;
                        toggleFormat("DATABASE");
                    }
                } else if (DSTargetManager.isConfluentTarget(targetName)) {
                    const args = componentConfluentFormat.validateValues(true);
                    let udfDef = componentConfluentFormat.getUDFDefinition({
                        numRows: args.numRows
                    });
                    hasUDF = true;
                    noDetect = true;
                    udfModule = udfDef.udfModule;
                    udfFunc = udfDef.udfFunc;
                    udfQuery = udfDef.udfQuery;
                    if (!isRestore) {
                        toggleFormat("CONFLUENT");
                    }
                } else if (DSTargetManager.isSnowflakeTarget(targetName)) {
                    const args = componentSnowflakeFormat.validateValues(true);
                    let udfDef = componentSnowflakeFormat.getUDFDefinition({
                        table_name: args.table_name
                    });
                    shouldNotPreview = true;
                    hasUDF = true;
                    noDetect = true;
                    udfModule = udfDef.udfModule;
                    udfFunc = udfDef.udfFunc;
                    udfQuery = udfDef.udfQuery;
                    if (!isRestore) {
                        toggleFormat("SNOWFLAKE");
                        dataSourceSchema.setManualSchema();
                    }
                }
            }

            if (!noDetect || isSuggestDetect) {
                initialLoadArgStr = loadArgs.getArgStr();
            }

            let args: any = {};
            format = loadArgs.getFormat();

            if (shouldNotPreview) {
                return "";
            } else if (hasUDF) {
                showProgressCircle(txId);
                args.sources = [{
                    targetName: targetName,
                    path: url
                }];
                args.moduleName = udfModule;
                args.funcName = udfFunc;
                args.udfQuery = udfQuery;
                args.advancedArgs = {
                    allowRecordErrors: options.allowRecordErrors,
                    allowFileErrors: options.allowFileErrors,
                };
                sql.args = args;
                return loadDataWithUDF(txId, dsName, args);
            } else {
                args.targetName = targetName;
                args.path = url;
                sql.args = args;
                return loadData(args);
            }
        })
        .then((result) => {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject({
                    "error": oldPreviewError
                });
            }

            if (!result && !shouldNotPreview) {
                let error = DSTStr.NoRecords + '\n' + DSTStr.NoRecrodsHint;
                return PromiseHelper.reject(error);
            }

            if (clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }
            xcTooltip.hideAll();
            rawData = result;
            if (noDetect && isSuggestDetect) {
                let detectRes = smartDetect(rawData);
                return suggestDetect(detectRes);
            }
        })
        .then((shouldDetect) => {
            $waitSection.addClass("hidden").removeClass("hasUdf")
                        .find(".progressSection").empty();
            $previewWrap.find(".url").removeClass("xc-disabled");


            $loadHiddenSection.removeClass("hidden");

            let hasSmartDetect = false;
            let notGetPreviewTable = false;
            if (!noDetect || shouldDetect) {
                let currentLoadArgStr = loadArgs.getArgStr();
                // when user not do any modification, then do smart detect
                if (initialLoadArgStr === currentLoadArgStr) {
                    hasSmartDetect = true;
                    let detectRes = smartDetect(rawData);
                    notGetPreviewTable = applySmartDetect(detectRes);
                }
            }
            // check
            if (!notGetPreviewTable &&
                !shouldNotPreview &&
                (hasSmartDetect || loadArgs.getFormat() === format)
            ) {
                getPreviewTable(false, hasUDF);
            }

            // not cache to sql log, only show when fail
            Transaction.done(txId, {
                "noCommit": true,
                "noLog": true
            });

            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true,
                "sql": sql
            });

            if (!isValidPreviewId(curPreviewId)) {
                // not in preview screen anymore
                deferred.reject(error);
                return;
            }

            if (Transaction.checkCanceled(txId)) {
                $visibleLoadHiddenSection.removeClass("hidden");
                if (isFirstTime) {
                    // if first time, show error message since there's no
                    // previous table to show
                    errorHandler(error, false, true);
                } else {
                // if canceled and still has valid preview id, restore state
                // and show previous table
                    $waitSection.addClass("hidden").removeClass("hasUdf")
                        .find(".progressSection").empty();
                    $previewWrap.find(".url").removeClass("xc-disabled");
                }
                deferred.reject(error);
                return;
            }

            if (clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }

            if (error &&
                typeof error === "object" &&
                error.error === oldPreviewError)
            {
                console.error(error);
            } else {
                if (format === formatMap.UDF) {
                    errorHandler(error, true, false);
                } else if (format == null || detectArgs.format == null ||
                            format === detectArgs.format) {
                    errorHandler(error, false, false);
                } else {
                    error = getParseError(format, detectArgs.format);
                    errorHandler(error, false, false);
                }
            }

            deferred.reject(error);
        })
        .always(() => {
            if (previewId == null || isValidPreviewId(curPreviewId)) {
                // in error case or current preview case
                toggleSubmitButton(false);
            }
        });

        return deferred.promise();
    }

    function isExcel(url: string): boolean {
        if (loadArgs.getFormat() === formatMap.EXCEL ||
            xcHelper.getFormat(url) === formatMap.EXCEL) {
            return true;
        } else {
            return false;
        }
    }

    function isParquetFile(url: string): boolean {
        if (loadArgs.getFormat() === formatMap.PARQUETFILE ||
            xcHelper.getFormat(url) === formatMap.PARQUETFILE) {
            return true;
        } else {
            return false;
        }
    }

    function setDefaultDSName(): string[] {
        let $title = $form.find(".row.title label");
        if (isCreateTableMode()) {
            $title.eq(1).text(DSTStr.TableName + ":")
        } else {
            $title.eq(1).text(DSTStr.DSName + ":");
        }

        let files = loadArgs.files;
        if (!loadArgs.multiDS) {
            // only multiDS mode will show multiple path
            files = [files[0]];
        }

        let dsNames = [];
        let html: HTML = "";
        let $inputPart = $form.find(".topSection .inputPart");

        files.forEach(function(file) {
            let path = file.path;
            let dsName = getNameFromPath(path);
            dsNames.push(dsName);

            html += '<div class="row">' +
                        '<label>' +
                            path +
                        '</label>' +
                        '<i class="icon xi-copy-clipboard"></i>' +
                        '<i class="icon xi-tick"></i>' +
                        '<div class="inputWrap">' +
                            '<input class="large dsName" type="text"' +
                            ' autocomplete="off" spellcheck="false"' +
                            ' value="' + dsName + '">' +
                        '</div>' +
                    '</div>';
        });
        $inputPart.html(html);
        if (files.length > 1) {
            $form.addClass("multiFiles");
        } else {
            $form.removeClass("multiFiles");
        }
        autoResizeLabels($inputPart);
        return dsNames;
    }

    function autoResizeLabels($inputPart: JQuery): void {
        let $labels = $inputPart.find("label");
        let $label = $labels.eq(0);
        let maxWidth: number = $label.width();

        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        ctx.font = "600 14px Open Sans";
        $labels.each(function() {
            let $ele = $(this);
            let originalText = $ele.text();
            let ellipsis = xcHelper.leftEllipsis(originalText, $ele, maxWidth - 5, ctx);
            if (ellipsis) {
                xcTooltip.add($ele, {
                    title: originalText
                });
            }
            $ele.data("path", originalText)
        });
    }

    function hideDataFormatsByTarget(targetName: string): void {
        const isAWSConnector = DSTargetManager.isAWSConnector(targetName) &&
                              !xcGlobal.isLegacyLoad;
        let exclusiveFormats = {
            PARQUET: DSTargetManager.isSparkParquet(targetName),
            DATABASE: DSTargetManager.isDatabaseTarget(targetName),
            CONFLUENT: DSTargetManager.isConfluentTarget(targetName),
            SNOWFLAKE: DSTargetManager.isSnowflakeTarget(targetName),
        };

        if (isAWSConnector) {
            // hide JSON, UDF and EXCEL in aws connector
            exclusiveFormats['JSON'] = false;
            exclusiveFormats['UDF'] = false;
            exclusiveFormats['EXCEL'] = false;
        } else {
            // hide JSONL in non-aws connector;
            exclusiveFormats['JSONL'] = false;
        }

        let exclusiveFormat = null;
        for (let [format, isCurrentTarget] of Object.entries(exclusiveFormats)) {
            if (isCurrentTarget) {
                exclusiveFormat = format;
                break;
            }
        }

        if (exclusiveFormat != null) {
            $(`#fileFormatMenu li:not([name=${exclusiveFormat}])`).hide();
            $(`#fileFormatMenu li[name=${exclusiveFormat}]`).show();
        } else {
            $('#fileFormatMenu li').show();
            for (let format of Object.keys(exclusiveFormats)) {
                $(`#fileFormatMenu li[name=${format}]`).hide();
            }
        }
    }

    function setTargetInfo(targetName: string): void {
        xcTooltip.add($previewWrap.find(".previewTitle"), {
            title: targetName
        });
    }

    function setPreviewFile(index: number, file: string): void {
        var $file = $("#preview-file");
        $file.find(".text").val(file);
        if (loadArgs.getPreviewFile() == null) {
            // set the path to be preview file if not set yet
            loadArgs.setPreviewingSource(index, file);
        }
    }

    function changePreviewFile(index: number, file: string): void {
        let previewingSource = loadArgs.getPreviewingSource();
        if (previewingSource == null || index === previewingSource.index
            && file === previewingSource.file
        ) {
            return;
        }
        let headers = getColumnHeaders(null);
        loadArgs.setPreviewHeaders(previewingSource.index, headers);
        loadArgs.setPreviewingSource(index, file);
        let noDetect = true;
        let isSuggestDetect = true;

        // BUG fix for 14378 (XD-322) where first file is empty
        // and if select second file should trigger auto detection
        let $errorSection = $previewWrap.find(".errorSection");
        if (!$errorSection.hasClass("hidden") &&
            $errorSection.find(".content").text().includes(DSTStr.NoRecords) &&
            loadArgs.getFormat() == null
        ) {
            noDetect = false;
        }
        let promise = PromiseHelper.resolve();
        if (loadArgs.getFormat() === formatMap.DATABASE) {
            isSuggestDetect = false;
            promise = componentDBFormat.setDefaultSQL({ sourceSelected: file });
        }
        promise.then(() => {
            return refreshPreview(noDetect, true, false, isSuggestDetect);
        });
    }

    function resetPreviewFile(): void {
        let $file = $("#preview-file");
        $file.find(".text").val("");
        xcTooltip.remove($file.find(".text"));
    }

    function getURLToPreview() {
        var previewingSource = loadArgs.getPreviewingSource();
        var targetName = loadArgs.getTargetName();
        var index = 0;

        if (previewingSource != null) {
            return PromiseHelper.resolve({sourceIndex: previewingSource.index, url: previewingSource.file});
        } else if (DSTargetManager.isGeneratedTarget(targetName)) {
            // target of type Generated is a special case
            return PromiseHelper.resolve({sourceIndex: index, url: loadArgs.files[index].path});
        }

        var deferred = PromiseHelper.deferred();
        var firstFile = loadArgs.files[index];

        previewFileSelect(index, true)
        .then(function(paths) {
            var path = paths[index];
            if (path == null) {
                deferred.reject(xcStringHelper.replaceMsg(DSFormTStr.ResucriveErr, {
                    path: firstFile.path
                }));
            } else {
                deferred.resolve({sourceIndex: index, url: path});
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setPreviewPaths() {
        var html = "";
        var targetName = loadArgs.getTargetName();
        var isGeneratedTarget = DSTargetManager.isGeneratedTarget(targetName);
        loadArgs.files.forEach(function(file, index) {
            var classes = "mainPath";
            var icons = '<i class="icon xi-arrow-down"></i>' +
                        '<i class="icon xi-arrow-right"></i>';
            var data = 'data-index="' + index + '"';
            var path = xcStringHelper.escapeDblQuoteForHTML(file.path);
            if (index !== 0) {
                classes += " collapse";
            }
            if (file.isFolder === false ||
                isGeneratedTarget
            ) {
                classes += " singlePath";
                icons = '<i class="icon xi-radio-empty"></i>' +
                        '<i class="icon xi-radio-selected"></i>';
                data += ' data-path="' + path + '"';
            }
            let pattern = file.fileNamePattern || "";
            html += '<li class="' + classes + '" ' + data + '>' +
                        '<div class="label tooltipOverflow"' +
                        ' data-toggle="tooltip"' +
                        ' data-container="body"' +
                        ' data-placement="auto top"' +
                        ' data-title="' + path + '">' +
                            icons +
                            path + pattern +
                        '</div>' +
                    '</li>' +
                    '<div class="subPathList" data-index="' + index + '"' + '>' +
                    '</div>';
        });
        $("#preview-file").find("ul").html(html);
    }

    function setActivePreviewFile(): void {
        let previewFile = loadArgs.getPreviewFile();
        if (previewFile != null) {
            previewFile = xcStringHelper.escapeDblQuote(previewFile);
            var $previewFile = $("#preview-file");
            $previewFile.find("li.active").removeClass("active");
            $previewFile.find('li[data-path="' + previewFile + '"]')
                        .addClass("active");
        }
    }

    function showPreview() {
        if (loadArgs.getFormat() === formatMap.PARQUET) {
            return;
        }
        $previewCard.removeClass("hidingPreview");
        if ($previewWrap.height() < 140) {
            let $bottomCard = $previewCard.find(".cardBottom");
            $bottomCard.css('top', '50%');
            $bottomCard.outerHeight('50%');
            $previewWrap.outerHeight('calc(50% - 40px)');
        }
    }

    function loadFiles(
        url: string,
        index: number,
        files: {name: string, attr: {isDirectory: boolean}}[],
        isFolder: boolean
    ): string[] {
        let file = loadArgs.files[index];
        let $previewFile = $("#preview-file");
        let paths: string[] = [];
        const targetName: string = loadArgs.getTargetName();
        if (files.length === 1 && url.endsWith(files[0].name) ||
            DSTargetManager.isS3(targetName) && !isFolder // hack way to check is folder or file for s3 until ENG-6634 is fixed
        ) {
            // when it's a single file
            isFolder = false;
            paths[0] = url;
            let $mainPath = $previewFile.find('.mainPath[data-index="' + index + '"]');
            $mainPath.addClass("singlePath")
                     .data("path", url)
                     .attr("data-path", url);
            $mainPath.find(".icon").remove();
            $mainPath.find(".label").prepend('<i class="icon xi-radio-empty"></i>' +
                                            '<i class="icon xi-radio-selected"></i>');
        } else {
            isFolder = true;
            let html: HTML = "";
            let nameMap = {};
            // when it's a folder
            if (!url.endsWith("/")) {
                url += "/";
            }

            files.forEach(function(file) {
                // XXX temporary skip folder, later may enable it
                if (!file.attr.isDirectory) {
                    let path = url + file.name;
                    paths.push(path);
                    nameMap[path] = file.name;
                }
            });

            paths.sort();

            for (let i = 0, len = paths.length; i < len; i++) {
                let originalPath = paths[i];
                let path = xcStringHelper.escapeDblQuoteForHTML(originalPath);
                let fileName = xcStringHelper.escapeDblQuoteForHTML(nameMap[originalPath]);
                html +=
                    '<li class="subPath"' +
                    'data-path="' + path + '">' +
                        '<div class="label tooltipOverflow"' +
                        ' data-toggle="tooltip"' +
                        ' data-container="body"' +
                        ' data-placement="auto top"' +
                        ' data-title="' + fileName + '">' +
                        '<i class="icon xi-radio-empty"></i>' +
                        '<i class="icon xi-radio-selected"></i>' +
                            path +
                        '</div>' +
                    '</li>';
            }
            if (!html) {
                // when no path
                html = '<li class="hint">' +
                            DSFormTStr.NoFileInFolder +
                        '</li>';
            }

            let $subPathList = $previewFile.find('.subPathList[data-index="' + index + '"]');
            $subPathList.html(html);
        }

        if (file.isFolder == null) {
            file.isFolder = isFolder;
        }
        setActivePreviewFile();
        return paths;
    }

    function previewFileSelect(
        fileIndex: number,
        noWaitBg: boolean
    ): XDPromise<string[]> {
        let deferred: XDDeferred<string[]> = PromiseHelper.deferred();

        $previewWrap.find(".inputWaitingBG").remove();
        let waitingBg: HTML =
            '<div class="inputWaitingBG">' +
                '<div class="waitingIcon"></div>' +
            '</div>';
        $previewWrap.find(".url").append(waitingBg);
        let $waitingBg = $previewWrap.find(".inputWaitingBG");

        if (noWaitBg) {
            $waitingBg.remove();
        } else if (gMinModeOn) {
            $waitingBg.find(".waitingIcon").show();
        } else {
            setTimeout(function() {
                $waitingBg.find(".waitingIcon").fadeIn();
            }, 200);
        }

        let file = loadArgs.files[fileIndex];
        let path = file.path;
        let curPreviewId = previewId;

        loadArgs.listFileInPath(path, file.recursive, file.fileNamePattern)
        .then((res) => {
            if (!isValidPreviewId(curPreviewId)) {
                deferred.reject();
                return;
            } else {
                let paths = loadFiles(path, fileIndex, res.files, file.isFolder);
                deferred.resolve(paths);
            }
        })
        .fail(deferred.reject)
        .always(() => {
            $waitingBg.remove();
        });

        return deferred.promise();
    }

    function loadData(args: any): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let curPreviewId: number = previewId;
        let buffer;
        let totalDataSize: number = null;

        previewOffset = 0;

        XcalarPreview(args, numBytesRequest, 0)
        .then((res) => {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject();
            }

            if (res && res.buffer) {
                buffer = res.buffer;
                totalDataSize = res.totalDataSize;
                previewOffset = res.thisDataSize;
                var rowsToShow = getRowsToPreview();
                return getDataFromPreview(args, buffer, rowsToShow);
            }
        })
        .then((ret) => {
            if (!isValidPreviewId(curPreviewId)) {
                deferred.reject();
                return;
            }

            if (ret && ret.buffer) {
                buffer += ret.buffer;
            }
            if (!totalDataSize || totalDataSize <= previewOffset) {
                disableShowMoreRows();
            }
            deferred.resolve(buffer);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getDataFromPreview(
        args: any,
        buffer: any,
        rowsToShow: number
    ): XDPromise<any> {
        let bytesNeed: number = getBytesNeed(buffer, rowsToShow);
        if (bytesNeed <= 0) {
            // when has enough cache to show rows
            return PromiseHelper.resolve({
                buffer: null,
                hasEnoughDataInCache: true
            });
        }

        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let offSet: number = previewOffset;
        let curPreviewId: number = previewId;

        console.info("too small rows, request", bytesNeed);
        XcalarPreview(args, bytesNeed, offSet)
        .then((res) => {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject();
            }

            var extraBuffer = null;
            if (res && res.buffer) {
                extraBuffer = res.buffer;
                previewOffset += res.thisDataSize;
            }
            deferred.resolve({buffer: extraBuffer});
        })
        .fail(deferred.reject);

        return deferred.promise();

        function getBytesNeed(data: any, totalRows: number): number {
            let format = loadArgs.getFormat();
            let lineDelim = loadArgs.getLineDelim();
            let rowData;

            if (format !== "JSON") {
                rowData = lineSplitHelper(data, lineDelim, null);
            } else {
                rowData = parseJSONByRow(data);
            }

            if (rowData == null) {
                return 0;
            }

            let lines = rowData.length;
            if (lines >= totalRows) {
                return 0;
            }

            let maxBytesInLine: number = 0;
            rowData.forEach((d) => {
                maxBytesInLine = Math.max(maxBytesInLine, d.length);
            });
            let bytes = maxBytesInLine * (totalRows - lines);
            return Math.min(bytes, maxBytesRequest);
        }
    }

    function getDataFromLoadUDF(
        datasetName: string,
        startRow: number,
        rowsToShow: number
    ): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let resultSetId: string;
        let rowPosition: number = startRow - 1;

        // XXX TODO: this only work when there is no session to it doesn't mess up things
        // here we don't the regular way to set to a different session and rest back immediately
        // because XcalarFetchData has several api calls inside
        _setSession();

        XcalarMakeResultSetFromDataset(datasetName)
        .then((result) => {
            resultSetId = result.resultSetId;
            let totalEntries: number = result.numEntries;
            if (totalEntries <= 0 || rowPosition > totalEntries) {
                return PromiseHelper.resolve(null);
            } else {
                if (totalEntries <= rowsToShow) {
                    disableShowMoreRows();
                }
                return XcalarFetchData(resultSetId, rowPosition, rowsToShow,
                                        totalEntries, [], 0, 0);
            }
        })
        .then((res) => {
            // no need for resultSetId as we only need 40 samples
            XcalarSetFree(resultSetId);
            return parseResult(res);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            _resetSession();
        });

        return deferred.promise();

        function parseResult(result: any): XDPromise<void> {
            let innerDeferred: XDDeferred<void> = PromiseHelper.deferred();

            if (!result) {
                innerDeferred.resolve(null);
                return innerDeferred.promise();
            }
            let passed;
            let buffer;
            try {
                let rows = parseRows(result);
                buffer = JSON.stringify(rows);
                passed = true;
            } catch (err) {
                console.error(err.stack);
            }

            if (passed) {
                innerDeferred.resolve(buffer);
            } else {
                innerDeferred.reject({"error": DSTStr.NoParse});
            }

            return innerDeferred.promise();
        }

        function parseRows(data: any): any[] {
            let rows = [];

            for (let i = 0, len = data.length; i < len; i++) {
                let value = data[i];
                let row = $.parseJSON(value);
                delete row[gXcalarRecordNum];
                rows.push(row);
            }

            return rows;
        }
    }


    // load with UDF always return JSON format
    function loadDataWithUDF(
        txId: number,
        dsName: string,
        options: any
    ): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        var tempDSName = getPreviewTableName(dsName);
        tableName = tempDSName;

        _setSession();
        const promise = XcalarDatasetLoad(tempDSName, options, txId);
        _resetSession();
        // don't call XIApi.loadDataset because XcalarDatasetCreate
        // will move the UDF into shared space, which should not happen for temp preview
        promise
        .then(() => {
            return getDataFromLoadUDF(tempDSName, 1, rowsToFetch);
        })
        .then(deferred.resolve)
        .fail((error) => {
            let displayError;
            if (error && error.error) {
                displayError = error.error;
                if (error.log) {
                    displayError += ". " + error.log
                }
            } else {
                displayError = error;
            }
            deferred.reject(displayError);
        });

        return deferred.promise();
    }

    function disableShowMoreRows(): void {
        $previewTable.closest(".datasetTbodyWrap")
                     .find(".previewBottom")
                     .addClass("end");
    }

    function showMoreRows(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let rowsToAdd: number = minRowsToShow;
        let $section = $previewTable.closest(".datasetTbodyWrap");
        let scrollPos: number = $section.scrollTop();
        let $previewBottom = $section.find(".previewBottom").addClass("load");

        fetchMoreRowsHelper(rowsToAdd)
        .then((ret) => {
            const newBuffer = ret.buffer;
            const hasEnoughDataInCache = ret.hasEnoughDataInCache;
            if (newBuffer) {
                rawData += newBuffer;
            }

            if (!newBuffer && !hasEnoughDataInCache) {
                // has no data to fetch case
                disableShowMoreRows();
            } else {
                // update preview
                addRowsToPreview(rowsToAdd);
                getPreviewTable(false, (tableName != null));
                $previewTable.closest(".datasetTbodyWrap").scrollTop(scrollPos);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            $previewBottom.removeClass("load");
        });

        return deferred.promise();
    }

    function fetchMoreRowsHelper(rowsToAdd: number): XDPromise<any> {
        let isFromLoadUDF: boolean = (tableName != null);
        if (isFromLoadUDF) {
            const deferred = PromiseHelper.deferred();
            fetchMoreRowsFromLoadUDF(rowsToAdd)
            .then((buffer) => {
                deferred.resolve({buffer});
            })
            .fail(deferred.reject);
            return deferred.promise();
        } else {
            return fetchMoreRowsFromPreview(rowsToAdd);
        }
    }

    function fetchMoreRowsFromLoadUDF(rowsToAdd: number): XDPromise<any> {
        let datasetName: string = tableName;
        let startRow: number = getRowsToPreview() + 1;
        return getDataFromLoadUDF(datasetName, startRow, rowsToAdd);
    }

    function fetchMoreRowsFromPreview(rowsToAdd: number): XDPromise<any> {
        let targetName: string = loadArgs.getTargetName();
        let path = loadArgs.getPreviewFile();
        let buffer = rawData;
        let rowsToShow: number = getRowsToPreview() + rowsToAdd;
        let args = {
            targetName: targetName,
            path: path
        };
        return getDataFromPreview(args, buffer, rowsToShow);
    }

    function refreshPreview(
        noDetect: boolean,
        isPreview: boolean = false,
        isChangeFormat: boolean = false,
        isSuggestDetect: boolean = false
    ): XDPromise<any> {
        let formOptions = {
            noDetect: null,
            isSuggestDetect: null
        };
        if (noDetect) {
            formOptions = isPreview ?
            validatePreview( {isChangeFormat: isChangeFormat} ) : validateForm();
            if (formOptions == null) {
                return null;
            }
        }
        formOptions.noDetect = noDetect;
        formOptions.isSuggestDetect = isSuggestDetect;
        return previewData(formOptions, true);
    }

    function showUDFHint(): void {
        $previewTableWrap.addClass("UDFHint");
        $previewTable.html('<div class="hint">' +
                                DSFormTStr.UDFHint +
                            '</div>');
    }

    function isInError(): boolean {
        return !$previewWrap.find(".errorSection").hasClass("hidden");
    }

    function getPreviewTable(
        udfHint: boolean = false,
        hasUDF: boolean = false
    ) : void{
        if (rawData == null && !udfHint) {
            // error case
            if (isInError()) {
                errorHandler(DSFormTStr.NoData, false, false);
            }
            return;
        }

        cleanupColRename();
        $previewCard.find(".previewSection").off("scroll");
        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");
        $previewWrap.find(".loadHidden").removeClass("hidden");
        $highlightBtns.addClass("hidden");
        $previewTableWrap.removeClass("XMLTableFormat");
        $previewTableWrap.removeClass("UDFHint");
        $previewTable.removeClass("has-delimiter");

        let format = loadArgs.getFormat();

        if (udfHint) {
            showUDFHint();
            return;
        }

        if (isUseUDFWithFunc() ||
            format === formatMap.JSON ||
            format === formatMap.JSONL ||
            format === formatMap.PARQUETFILE
        ) {
            getJSONTable(rawData);
            autoFillDataSourceSchema(false);
            return;
        }

        var isSuccess = false;
        if (isUseUDFWithFunc() ||
            format === formatMap.JSON ||
            format === formatMap.JSONL
        ) {
            isSuccess = getJSONTable(rawData);
        } else if (format === formatMap.EXCEL) {
            isSuccess = getJSONTable(rawData, getSkipRows());
            if (isSuccess && loadArgs.useHeader()) {
                toggleHeader(true, true);
            }
        } else if (format === formatMap.XML) {
            isSuccess = hasUDF ? getJSONTable(rawData) : getXMLTable(rawData);
        } else if (format === formatMap.DATABASE ||
                format === formatMap.CONFLUENT ||
                format === formatMap.SNOWFLAKE
        ) {
            isSuccess = getJSONTable(rawData);
        } else {
            isSuccess = getCSVTable(rawData, format);
        }

        if (!isSuccess) {
            return;
        } else {
            if (format === formatMap.CSV) {
                initialSuggest();
            } else {
                autoFillDataSourceSchema(false);
            }
        }

        addAdvancedRows();
        syncHeaderWithSchemaSection();
        if (typeof isBrowserSafari !== "undefined" && isBrowserSafari) {
            $previewTable.removeClass("dataTable");
            setTimeout(function() {$previewTable.addClass("dataTable");}, 0);
        }
    }

    function getTh(header: string, classes: string): HTML {
        header = header || "";
        var th = '<th class="' + classes + '">' +
                    '<div class="header">' +
                        colGrabTemplate +
                        '<div class="text">' +
                            header +
                        '</div>' +
                    '</div>' +
                '</th>';
        return th;
    }

    function getTd(text: string, classes: string): HTML {
        var td = '<td class="cell ' + classes + '">' +
                    '<div class="innerCell">' +
                        text +
                    '</div>' +
                '</td>';
        return td;
    }

    function addAdvancedRows(): void {
        if (isInError()) {
            return;
        } else if (loadArgs.getFormat() === formatMap.XML) {
            // XXX don't have a good UX for it, so disable it first
            return;
        }

        $previewTable.find(".extra").remove();
        let fileName = getAdvancedFileName()
        let rowNumber = getAdvancedRowNumber()
        let hasFileName: boolean = (fileName != null);
        let hasRowNumber: boolean = (rowNumber != null);
        if (!hasFileName && !hasRowNumber) {
            return;
        }

        let previewFile = loadArgs.getPreviewFile() || "";
        let extraTh: HTML = "";
        if (hasFileName) {
            extraTh += getTh(fileName, "extra fileName");
        }
        if (hasRowNumber) {
            extraTh += getTh(rowNumber, "extra rowNumber");
        }

        $previewTable.find("thead tr").append(extraTh);
        $previewTable.find("tbody tr").each(function(index) {
            let extraTd = "";
            if (hasFileName) {
                extraTd += getTd(previewFile, "extra");
            }
            if (hasRowNumber) {
                extraTd += getTd(String(index + 1), "extra");
            }
            $(this).append(extraTd);
        });
    }

    function syncHeaderWithSchemaSection(): void {
        $previewTable.find(".unused").removeClass("unused");
        $previewTable.find(".newAdded").remove();
        if (!isCreateTableMode() || isInError()) {
            return;
        } else if (loadArgs.getFormat() === formatMap.XML) {
            // XXX don't have a good UX for it, so disable it first
            return;
        }
        // only for create table
        let sourceIndex = loadArgs.getPreivewIndex();
        let headers = loadArgs.getPreviewHeaders(sourceIndex);
        if (headers == null) {
            return;
        }
        let set: Set<string> = new Set();
        headers.forEach((header) => {
            set.add(header.colName);
        });
        let $ths = $previewTable.find("th");
        let $trs = $previewTable.find("tbody tr");
        $ths.each((index, el) => {
            let $th = $(el);
            if ($th.hasClass("rowNumHead") || $th.hasClass("extra")) {
                // skip row num and extr column
                return;
            }
            let $text = $th.find(".text");
            let colName: string = $text.val() || $text.text();
            if (set.has(colName)) {
                set.delete(colName);
            } else {
                $ths.eq(index).addClass("unused");
                $trs.each(function() {
                    $(this).find("td").eq(index).addClass("unused");
                });
            }
        });

        let extraColumns = [];
        headers.forEach((header) => {
            let colName = header.colName;
            if (set.has(colName)) {
                extraColumns.push(colName);
            }
        });

        addExtraColumns(extraColumns);
    }

    function addExtraColumns(extraColumns: string[]): void {
        if (extraColumns.length === 0) {
            return;
        }
        let extraTh: HTML = "";
        let extraTd: HTML = "";
        extraColumns.forEach((name) => {
            extraTh += getTh(name, "newAdded");
            extraTd += getTd("Unavailable in preview", "newAdded");
        });

        $previewTable.find("thead tr").append(extraTh);
        $previewTable.find("tbody tr").each(function() {
            $(this).append(extraTd);
        });
    }

    function toggleHeader(
        promote: boolean,
        changePreview: boolean = false
    ): void {
        loadArgs.setHeader(promote);
        let hasHeader = loadArgs.useHeader();
        if (hasHeader) {
            $headerCheckBox.find(".checkbox").addClass("checked");
        } else {
            $headerCheckBox.find(".checkbox").removeClass("checked");
        }

        if (!changePreview) {
            return;
        }

        let $trs = $previewTable.find("tbody tr");
        let $tds = $trs.eq(0).find("td"); // first row tds
        let $headers = $previewTable.find("thead tr .header");
        let html: HTML;

        if (hasHeader) {
            // promote header
            for (let i = 1, len = $tds.length; i < len; i++) {
                let headerHtml: HTML = $tds.eq(i).html();
                let headerText: string = $tds.eq(i).text();
                let $th: JQuery = $headers.eq(i).parent();
                let width: number = Math.max(ProgCol.NewCellWidth,
                                 xcUIHelper.getTextWidth($th, headerText) + 8);
                $th.width(width);
                $headers.eq(i).find(".text").html(headerHtml);
            }

            // change line marker
            for (let i = 1, len = $trs.length; i < len; i++) {
                $trs.eq(i).find(".lineMarker").text(i);
            }

            $trs.eq(0).remove();
            $previewTable.find("th.col0").html('<div class="header"></div>');
        } else {
            // change line marker
            for (let i = 0, j = 2, len = $trs.length; i < len; i++, j++) {
                $trs.eq(i).find(".lineMarker").text(j);
            }

            // undo promote
            html = '<tr><td class="lineMarker">1</td>';

            for (let i = 1, len = $headers.length; i < len; i++) {
                let $text = $headers.eq(i).find(".text");
                html += '<td class="cell"><div class="innerCell">' +
                            $text.html() + '</div></td>';
                $text.html("column" + (i - 1));
            }

            html += '</tr>';

            $trs.eq(0).before(html);
            $headers.eq(0).empty()
                    .closest("th").removeClass("undo-promote");
        }
    }

    function getSchemaRow(): JQuery {
        return $form.find(".row.schema");
    }

    function applyHighlight(str: string): void {
        $previewTable.find(".highlight").removeClass("highlight");
        highlighter = str;

        if (highlighter === "") {
            // when remove highlighter
            $highlightBtns.find("button").addClass("xc-disabled");
        } else {
            $highlightBtns.find("button").removeClass("xc-disabled");
            xcUIHelper.removeSelectionRange();
            // when has valid delimiter to highlight
            let $cells = $previewTable.find("thead .text, tbody .cell");
            highlightHelper($cells, highlighter);
        }
    }

    function highlightHelper(
        $cells: JQuery,
        strToHighlight: string
    ): void {
        let dels = strToHighlight.split("");
        let delLen = dels.length;

        $cells.each(function() {
            let $tds = $(this).find(".td");
            let len = $tds.length;

            for (let i = 0; i < len; i++) {
                let j = 0;
                while (j < delLen && i + j < len) {
                    if ($tds.eq(i + j).text() === dels[j]) {
                        ++j;
                    } else {
                        break;
                    }
                }

                if (j === delLen && i + j <= len) {
                    for (j = 0; j < delLen; j++) {
                        $tds.eq(i + j).addClass("highlight");
                    }
                }
            }
        });
    }

    function getPreviewTableName(dsName: string): string {
        let name;
        if (dsName) {
            name = xcHelper.randName(dsName + "-");
        } else {
            // when name is empty
            name = xcHelper.randName("previewTable");
        }
        // specific format for preview table
        name = xcHelper.wrapDSName(name) + "-xcalar-preview";
        return name;
    }

    function getJSONTable(data: string, skipRows: number = 0): boolean {
        let json = parseJSONData(data);
        if (json == null) {
            // error case
            return false;
        }
        if (json.length === 0 && data.length > 0) {
            // Possibly multi-line json, which we are not able to parse
            // Show the raw data
            return getXMLTable(data);
        }
        json = json.splice(skipRows);

        showJSONTable(json);

        return true;
    }

    function showJSONTable(jsonData: any): void {
        $previewTable.html(getJSONTableHTML(jsonData))
        .addClass("has-delimiter");
    }

    function parseJSONByRow(data: string): string[] {
        let startIndex: number = data.indexOf("{");
        let endIndex: number = data.lastIndexOf("}");
        if (startIndex === -1 || endIndex === -1) {
            return null;
        }

        let record: string[] = [];
        let bracketCnt: number = 0;
        let hasBackSlash: boolean = false;
        let hasQuote: boolean = false;

        for (let i = startIndex; i <= endIndex; i++) {
            let c = data.charAt(i);
            if (hasBackSlash) {
                // skip
                hasBackSlash = false;
            } else if (c === '\\') {
                hasBackSlash = true;
            } else if (c === '"') {
                // toggle escape of quote
                hasQuote = !hasQuote;
            } else if (!hasBackSlash && !hasQuote) {
                if (c === "{") {
                    if (startIndex === -1) {
                        startIndex = i;
                    }
                    bracketCnt++;
                } else if (c === "}") {
                    bracketCnt--;
                    if (bracketCnt === 0) {
                        record.push(data.substring(startIndex, i + 1));
                        startIndex = -1;
                        // not show too much rows
                        if (record.length >= rowsToFetch) {
                            break;
                        }
                    } else if (bracketCnt < 0) {
                        // error cse
                        errorHandler(getParseJSONError(), false, false);
                        return null;
                    }
                }
            }
        }

        if (bracketCnt === 0 && startIndex >= 0 && startIndex <= endIndex) {
            record.push(data.substring(startIndex, endIndex + 1));
        }
        return record;
    }

    function parseJSONData(data: string): any {
        let record = parseJSONByRow(data);
        if (record == null) {
            errorHandler(getParseJSONError(), false, false);
            return null;
        }

        let string = "[" + record.join(",") + "]";
        let json;

        try {
            json = $.parseJSON(string);
        } catch (error) {
            console.error(error);
            errorHandler(getParseJSONError(), false, false);
            return null;
        }

        return json;
    }

    function getParseError(format: string, suggest: string): string {
        return xcStringHelper.replaceMsg(DSFormTStr.ParseError, {
            format: format,
            suggest: '<span class="suggest" data-format="' + suggest + '">' +
                        suggest +
                    '</span>'
        });
    }

    function getXMLTable(xmlData: string): boolean {
        if (xmlData == null){
            return false;
        }

        let data = lineSplitHelper(xmlData, '\n', null);
        let html = getXMLTbodyHTML(data);

        $previewTableWrap.addClass("XMLTableFormat");
        $previewTable.html(html);
        return true;
    }


    function getParseJSONError(): string {
        return getParseError(formatMap.JSON, formatMap.CSV);
    }

    function getJSONHeaders(json: object[]): string[] {
        let rowLen: number = json.length;
        let keys = {};
        for (let i = 0; i < rowLen; i++) {
            for (let key in json[i]) {
                keys[key] = true;
            }
        }

        let headers = Object.keys(keys);
        return headers;
    }

    function getJSONTableHTML(json: any): HTML {
        let headers = getJSONHeaders(json);
        let rowLen = json.length;
        let colLen = headers.length;
        let html: HTML = '<thead><tr>' +
                    '<th class="rowNumHead">' +
                        '<div class="header"></div>' +
                    '</th>';
        for (let i = 0; i < colLen; i++) {
            let cellWidth = xcUIHelper.getTextWidth(null, headers[i]) - 36;
            let width: number = Math.max(ProgCol.NewCellWidth + 5, cellWidth);
            html += '<th style="width:' + width + 'px;">' +
                        '<div class="header">' +
                            colGrabTemplate +
                            '<div class="text">' +
                                headers[i] +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead><tbody>';

        for (let i = 0; i < rowLen; i++) {
            html += '<tr>' +
                        '<td class="lineMarker">' +
                            (i + 1) +
                        '</td>';
            let jsonRow = json[i];
            for (let j = 0; j < colLen; j++) {
                let val = jsonRow[headers[j]];
                let fnf = false;
                if (val === undefined) {
                    fnf = true;
                }
                val = xcHelper.parseJsonValue(val, fnf);
                html += '<td class="cell"><div class="innerCell">' + val +
                        '</div></td>';
            }

            html += '</tr>';
        }

        html += '</tbody>';

        return html;
    }

    function getCSVTable(csvData: string, format: string): boolean {
         // line delimiter
        let lineDelim = loadArgs.getLineDelim();
        let data: string[] = lineSplitHelper(csvData, lineDelim, null);
        if (data == null) {
            return false;
        }

        let splitData: string[][] = data.map((d) => d.split(""));
        let fieldDelim = loadArgs.getFieldDelim();
        if (format === formatMap.CSV && fieldDelim === "") {
            $highlightBtns.removeClass("hidden")
                          .find("button").addClass("xc-disabled");
        }

        let $tbody = $(getTbodyHTML(splitData, fieldDelim));
        let $trs = $tbody.find("tr");
        let maxTdLen: number = 0;
        // find the length of td
        $trs.each(function() {
            maxTdLen = Math.max(maxTdLen, $(this).find("td").length);
        });

        // fill up empty space
        let fnf = xcHelper.parseJsonValue(null, true);
        appendExtraTds($trs, maxTdLen, fnf);

        let $tHead = $(getTheadHTML(splitData, fieldDelim, maxTdLen));
        let $tHrow = $tHead.find("tr");
        let thLen = $tHead.find("th").length;
        if (maxTdLen > thLen) {
            appendExtraThs($tHrow, maxTdLen - thLen);
        } else if (thLen > maxTdLen) {
            // fill in extra tds
            appendExtraTds($trs, thLen, "");
        }

        // add class
        $tHrow.find("th").each(function(index) {
            $(this).addClass("col" + index);
        });

        $previewTable.empty().append($tHead, $tbody);
        $previewTable.closest(".datasetTbodyWrap").scrollTop(0);
        loadArgs.setOriginalHeaders(getColumnHeaders(null));

        if (fieldDelim !== "") {
            $previewTable.addClass("has-delimiter");
        }
        return true;
    }

    function getTheadHTML(
        datas: string[][],
        delimiter: string,
        tdLen: number
    ): HTML {
        let thead: HTML = "<thead><tr>";
        let colGrab: HTML = colGrabTemplate;
        let isEditable: boolean = false;
        if (loadArgs.getFormat() === formatMap.CSV) {
            isEditable = true;
        }
        // when has header
        if (loadArgs.useHeader()) {
            thead +=
                '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>' +
                parseTdHelper(datas[0], delimiter, true, isEditable);
        } else {
            thead +=
               '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>';

            for (let i = 0; i < tdLen - 1; i++) {
                let header = autoHeaderName(i);
                if (isEditable) {
                    thead += '<th class="editable" data-type="string">' +
                            '<div class="header type-string">' +
                                colGrab +
                                '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="auto top" ' +
                                    'data-original-title="' +
                                    xcStringHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                        '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text tooltipOverflow ' +
                                        'editableHead th col' + i +
                                        '" value="' + header +
                                        '" data-original-title="' + header +
                                        '" data-container="body" data-toggle="tooltip">' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '</th>';
                } else {
                    thead +=
                        '<th>' +
                            '<div class="header">' +
                                colGrab +
                                '<div class="text">' + header + '</div>' +
                            '</div>' +
                        '</th>';
                }

            }
        }

        thead += "</tr></thead>";

        return thead;
    }

    function getTbodyHTML(datas: string[][], delimiter: string): HTML {
        var tbody = "<tbody>";
        var i = loadArgs.useHeader() ? 1 : 0;
        // not showing too much rows
        var len = Math.min(datas.length, rowsToFetch);
        for (var j = 0; i < len; i++, j++) {
            tbody += '<tr>' +
                        '<td class="lineMarker">' +
                            (j + 1) +
                        '</td>';
            tbody += parseTdHelper(datas[i], delimiter, false, false) + '</tr>';
        }

        tbody += "</tbody>";

        return tbody;
    }

    function appendExtraTds($trs: JQuery, maxTdLen: number, val: string): void {
        $trs.each(function() {
            let $tr = $(this);
            let $tds = $tr.find("td");
            let trs: HTML = "";

            for (let j = 0, l = maxTdLen - $tds.length; j < l; j++) {
                trs += "<td>" + val + "</td>";
            }

            $tr.append(trs);
        });
    }

    function appendExtraThs($tHrow: JQuery, numThs: number): void {
        let thHtml: HTML;
        if (loadArgs.getFormat() === formatMap.CSV) {
            thHtml = '<th class="editable" data-type="string">' +
                        '<div class="header type-string">' +
                            colGrabTemplate +
                            '<div class="flexContainer flexRow">' +
                                '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-placement="auto top" data-original-title="' +
                                xcStringHelper.capitalize(ColumnType.string) +
                                '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                    '<span class="type icon"></span>' +
                                    '<div class="dropdownBox"></div>' +
                                '</div>' +
                                '<div class="flexWrap flex-mid">' +
                                    '<input spellcheck="false" ' +
                                    'class="text tooltipOverflow ' +
                                    'editableHead" value="">' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</th>';
        } else {
            thHtml = '<th>' +
                '<div class="header">' +
                    colGrabTemplate +
                    '<div class="text"></div>' +
                '</div>' +
            '</th>';
        }

        let ths = "";
        for (let i = 0; i < numThs; i++) {
            ths += thHtml;
        }
        $tHrow.append(ths);
    }

    function autoHeaderName(index: number): string {
        return "column" + index;
    }

    function getXMLTbodyHTML(data: string[]): HTML {
        let tbody: HTML = "<tbody><tr><td>";
        // not showing too much rows
        let len: number = Math.min(data.length, rowsToFetch);

        //get the html of table
        for (let i = 0; i < len; i++) {
            tbody += '<span class="XMLContentSpan">' + xcStringHelper.escapeHTMLSpecialChar(data[i]) + '</span>' + '<br>';
        }

        tbody += "</td></tr></tbody>";

        return tbody;
    }

    function lineSplitHelper(
        data: string,
        delim: string,
        rowsToSkip: number
    ): string[] {
        let quote: string = loadArgs.getQuote();
        let res = splitLine(data, delim, quote);

        if (rowsToSkip == null || isNaN(rowsToSkip)) {
            rowsToSkip = getSkipRows();
        }

        if (rowsToSkip > 0 && rowsToSkip >= res.length) {
            errorHandler(DSTStr.SkipRowsError, false ,false);
            return null;
        }

        res = res.slice(rowsToSkip);

        return res;
    }

    function splitLine(
        data: string,
        delim: string,
        quote: string
    ): string[] {
        // XXX this O^2 plus the fieldDelim O^2 may be too slow
        // may need a better way to do it
        let dels: string[] = delim.split("");
        let delLen = dels.length;
        if (delLen === 0) {
            return [data];
        }

        let hasQuote: boolean = false;
        let hasBackSlash: boolean = false;
        let dataLen = data.length;
        let res: string[] = [];
        let i: number = 0;
        let startIndex: number = 0;
        while (i < dataLen) {
            let c = data.charAt(i);
            let isDelimiter: boolean = false;

            if (!hasBackSlash && !hasQuote && c === dels[0]) {
                isDelimiter = true;

                for (var j = 1; j < delLen; j++) {
                    if (i + j >= dataLen || data.charAt(i + j) !== dels[j]) {
                        isDelimiter = false;
                        break;
                    }
                }
            }

            if (isDelimiter) {
                res.push(data.substring(startIndex, i));
                i = i + delLen;
                startIndex = i;
            } else {
                if (hasBackSlash) {
                    // when previous char is \. espace this one
                    hasBackSlash = false;
                } else if (c === '\\') {
                    hasBackSlash = true;
                } else if (c === quote) {
                    // toggle escape of quote
                    hasQuote = !hasQuote;
                }
                i++;
            }
        }

        if (i === dataLen && startIndex !== dataLen) {
            res.push(data.substring(startIndex, dataLen));
        }
        return res;
    }

    function parseTdHelper(
        data: string[],
        strToDelimit: string,
        isTh: boolean,
        isEditable: boolean
    ): HTML {
        let hasQuote: boolean = false;
        let hasBackSlash: boolean = false;
        let dels = strToDelimit.split("");
        let delLen = dels.length;
        let quote = loadArgs.getQuote();

        let hasDelimiter = (delLen !== 0);
        let colGrab = hasDelimiter ? colGrabTemplate : "";
        let html: HTML;
        if (isEditable) {
            if (isTh) {
                html = '<th class="editable" data-type="string">' +
                    '<div class="header type-string">' +
                    colGrab +
                    '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="auto top" ' +
                                    'data-original-title="' +
                                    xcStringHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text cell tooltipOverflow ' +
                                        'editableHead th' +
                                        '" value="';
            } else {
                html = '<td class="cell"><div class="innerCell">';
            }
        } else {
            if (isTh) {
                html = '<th><div class="header">' + colGrab +
                            '<div class="text cell">';
            } else {
                html = '<td class="cell"><div class="innerCell">';
            }
        }

        let dataLen = data.length;
        const rawStrLimit: number = 1000; // max number of characters in undelimited column
        const maxColumns: number = 1100; // max number of columns
        const colStrLimit: number = 250; // max number of characters in delimited column
        let i: number = 0;
        let d;
        let tdData = []; // holds acculumated chars until delimiter is reached
                        // and then these chars are added to html
        let val;

        if (hasDelimiter) {
            // when has delimiter
            let columnCount = 0;
            let strLen = 0;
            let hiddenStrLen = 0;
            while (i < dataLen && columnCount < maxColumns) {
                d = data[i];
                let isDelimiter = false;

                if (!hasBackSlash && !hasQuote && d === dels[0]) {
                    isDelimiter = true;

                    for (let j = 1; j < delLen; j++) {
                        if (i + j >= dataLen || data[i + j] !== dels[j]) {
                            isDelimiter = false;
                            break;
                        }
                    }
                }

                if (isDelimiter) {
                    tdData = stripQuote(tdData, quote);

                    val = tdData.join("");
                    val = xcStringHelper.escapeDblQuoteForHTML(xcStringHelper.escapeHTMLSpecialChar(val));
                    html += val;
                    tdData = [];
                    // skip delimiter
                    if (hiddenStrLen) {
                        html += "<span class='truncMessage'>...(" +
                                xcStringHelper.numToStr(hiddenStrLen) + " " +
                                TblTStr.Truncate + ")</span>";
                    }
                    if (isTh) {
                        if (isEditable) {
                            html += '"></div></div></div></th>' +
                                '<th class="editable" data-type="string">' +
                                    '<div class="header type-string">' +
                                        colGrab +
                                '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="auto top" ' +
                                    'data-original-title="' +
                                    xcStringHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text cell tooltipOverflow ' +
                                        'editableHead th' +
                                        '" value="';
                        } else {
                            html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text cell">';
                        }
                    } else {
                        html += '</div></td><td class="cell">' +
                                    '<div class="innerCell">';
                    }

                    i = i + delLen;
                    columnCount++;
                    strLen = 0;
                    hiddenStrLen = 0;
                } else {
                    if (hasBackSlash) {
                        // when previous char is \. espace this one
                        hasBackSlash = false;
                    } else if (d === '\\') {
                        hasBackSlash = true;
                    } else if (d === quote) {
                        // toggle escape of quote
                        hasQuote = !hasQuote;
                    }
                    if (strLen > colStrLimit) {
                        hiddenStrLen++;
                    } else {
                        tdData.push(d);
                    }

                    strLen++;
                    ++i;
                }
            }

            tdData = stripQuote(tdData, quote);
            val = tdData.join("");
            val = xcStringHelper.escapeDblQuoteForHTML(xcStringHelper.escapeHTMLSpecialChar(val));
            // escape before we call styleNewLineChar because this function
            // may add html tags which we don't want escaped
            if (strToDelimit !== "\n" && !isTh) {
                val = xcUIHelper.styleNewLineChar(val);
            }

            html += val;
            tdData = [];
        } else {
            // when not apply delimiter
            data = stripQuote(data, quote);
            dataLen = Math.min(rawStrLimit, data.length); // limit to 1000 characters
            for (i = 0; i < dataLen; i++) {
                d = data[i];

                let cellClass = "td";
                let escaped = xcStringHelper.escapeHTMLSpecialChar(d);

                if (d === "\t") {
                    cellClass += " has-margin has-tab";
                } else if (d === ",") {
                    cellClass += " has-margin has-comma";
                } else if (d === "|") {
                    cellClass += " has-pipe";
                } else if (d === "\'" || d === "\"") {
                    cellClass += " has-quote";
                } else if (/\W/.test(d)) {
                    cellClass += " has-specialChar";
                    if (d === "\n") {
                        cellClass += " newLine";
                    } else if (d === "\r") {
                        cellClass += " carriageReturn";
                    }
                }

                if (isEditable && isTh) {
                    html += xcStringHelper.escapeDblQuoteForHTML(escaped);
                } else {
                    html += '<span class="' + cellClass + '">' +
                                escaped +
                            '</span>';
                }
            }
            var lenDiff = data.length - dataLen;
            if (lenDiff > 0) {
                html += "<span class='truncMessage'>...(" +
                        xcStringHelper.numToStr(lenDiff) + " " +
                        TblTStr.Truncate + ")</span>";
            }
        }

        if (isTh) {
            if (isEditable) {
                html += '"></div></div></div></th>';
            } else {
                html += '</div></div></th>';
            }

        } else {
            html += '</div></td>';
        }
        return html;
    }

    // Note: that's how backend to the import, only handle the ting in the quote
    function stripQuote(content: string[], quote: string): string[] {
        if (!quote) {
            return content;
        }

        var endQuote = content.length - 1;
        while (endQuote >= 0 && content[endQuote] !== quote) {
            endQuote--;
        }

        if (endQuote >= 0) {
            var startQuote = endQuote - 1;
            while (startQuote >= 0 && content[startQuote] !== quote) {
                startQuote--;
            }

            if (startQuote >= 0) {
                content = content.slice(startQuote + 1, endQuote);
            }
        }

        return content;
    }

    function seletNewLineJSONToArrayUDF(): void {
        toggleFormat("UDF");
        selectUDFModule(defaultModule);
        selectUDFFunc("convertNewLineJsonToArrayJson");
    }

    function suggestDetect(
        detectRes: {
            format: string,
            lineDelim: string,
            fieldDelim: string,
            hasHeader: boolean,
        }
    ): XDPromise<boolean> {
        let deferred: XDDeferred<boolean> = PromiseHelper.deferred();

        let format: string = detectRes.format;
        if (format === DSFormat.SpecialJSON) {
            format = formatMap.UDF;
        }

        let shouldAlert = false;
        let arg = "";
        if (format !== loadArgs.getFormat()) {
            shouldAlert = true
            arg = "format";
        } else if (detectRes.hasHeader !== loadArgs.useHeader()) {
            shouldAlert = true;
            arg = "header promotion";
        } else if (format === formatMap.CSV) {
            if (detectRes.lineDelim !== loadArgs.getLineDelim()) {
                shouldAlert = true;
                arg = "line delimiter";
            } else if (detectRes.fieldDelim !== loadArgs.getFieldDelim()) {
                shouldAlert = true;
                arg = "field delimiter";
            }
        }

        if (shouldAlert) {
            let msg = xcStringHelper.replaceMsg(DSTStr.DetectWithDiffConfig, {
                "arg": arg
            });
            Alert.show({
                title: AlertTStr.Title,
                msgTemplate: msg,
                buttons: [{
                    name: DSTStr.KeepConfig,
                    className: "larger3",
                    func: () => {
                        deferred.resolve(false);
                    }
                },
                {
                    name: DSTStr.ApplyNewConfig,
                    className: "larger3",
                    func: () => {
                        deferred.resolve(true);
                    }
                }],
                noCancel: true
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function smartDetect(data: string): {
        format: string,
        lineDelim: string,
        fieldDelim: string,
        hasHeader: boolean,
    } {
        let detectRes = {
            format: undefined,
            lineDelim: undefined,
            fieldDelim: undefined,
            hasHeader: undefined,
        }
        if (data == null) {
            return detectRes;
        }
        // step 1: detect format
        let lineDelim = loadArgs.getLineDelim();
        detectRes.format = detectFormat(data, lineDelim);

        if (detectRes.format === DSFormat.SpecialJSON) {
            return detectRes;
        }

        // ste 2: detect line delimiter
        if (detectRes.format === formatMap.CSV) {
            detectRes.lineDelim = xcSuggest.detectLineDelimiter(data,
                                                        loadArgs.getQuote());
        }

        // step 3: detect field delimiter
        if (detectRes.format === formatMap.CSV) {
            detectRes.fieldDelim = xcSuggest.detectFieldDelimiter(data,
                detectRes.lineDelim, loadArgs.getQuote());
            // step 4: detect header
            lineDelim = loadArgs.getLineDelim(); // get the update linDelim
            detectRes.hasHeader = detectHeader(data, lineDelim,
                detectRes.fieldDelim);
        } else if (detectRes.format === formatMap.EXCEL) {
            detectRes.hasHeader = detectExcelHeader(data);
        } else {
            detectRes.hasHeader = false;
        }
        return detectRes;
    }

    function applySmartDetect(
        detectRes: {
            format: string,
            lineDelim: string,
            fieldDelim: string,
            hasHeader: boolean,
        }
    ): boolean {
        if (rawData == null) {
            return false;
        }

        applyQuote("\"");

        // step 1: detect format
        detectArgs.format = detectRes.format;

        if (detectArgs.format === DSFormat.SpecialJSON) {
            detectArgs.format = formatMap.UDF;
            seletNewLineJSONToArrayUDF();
            refreshPreview(true, true);
            return true;
        }

        let formatText: string;
        for (let key in formatMap) {
            if (formatMap[key] === detectArgs.format) {
                formatText = key;
                break;
            }
        }

        toggleFormat(formatText);

        // ste 2: detect line delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.lineDelim = detectRes.lineDelim;
            applyLineDelim(detectArgs.lineDelim);
        } else {
            applyLineDelim("\n");
        }

        // step 3: detect field delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.fieldDelim = detectRes.fieldDelim;
            if (detectArgs.fieldDelim !== "") {
                applyFieldDelim(detectArgs.fieldDelim);
            }
        }
        detectArgs.hasHeader = detectRes.hasHeader;

        if (detectArgs.hasHeader) {
            toggleHeader(true);
        } else {
            toggleHeader(false);
        }
        return false;
    }

    function detectFormat(data: string, lineDelim: string): string {
        if (DSTargetManager.isSparkParquet(loadArgs.getTargetName())) {
            return formatMap.PARQUET;
        }
        var path = loadArgs.getPreviewFile();
        var format = xcHelper.getFormat(path);
        if (format === formatMap.EXCEL || format === formatMap.XML ||
            format === formatMap.PARQUETFILE) {
            return format;
        } else {
            // XXX this information doesn't really work because smartDetect
            // is called after loadWithUdf been called. We need to add another
            // step in the preview if we want to enable this
            // if (data.substring(0, 4) == "PAR1" &&
            //     !isAscii(data.substring(4, 100))) {
            //     return formatMap.PARQUETFILE;
            // }
            let rows = lineSplitHelper(data, lineDelim, 0);
            let detectRes = xcSuggest.detectFormat(rows);

            if (DSTargetManager.isAWSConnector(loadArgs.getTargetName()) &&
                !xcGlobal.isLegacyLoad &&
                (detectRes === DSFormat.JSON || detectRes === DSFormat.SpecialJSON)
            ) {
                // use JSONL
                return formatMap.JSONL;
            }

            if (detectRes === DSFormat.JSON) {
                return formatMap.JSON;
            } else if (!isUseUDF() && detectRes === DSFormat.SpecialJSON) {
                // special json should use udf to parse,
                // so if already use udf, cannot be special json
                return DSFormat.SpecialJSON;
            } else if (detectRes === DSFormat.XML) {
                return formatMap.XML;
            } else {
                return formatMap.CSV;
            }
        }
    }

    function detectHeader(
        data: string,
        lineDelim: string,
        fieldDelim: string
    ): boolean {
        var rows = lineSplitHelper(data, lineDelim, null);
        var rowLen = Math.min(rowsToFetch, rows.length);
        var parsedRows = [];

        for (var i = 0; i < rowLen; i++) {
            parsedRows[i] = lineSplitHelper(rows[i], fieldDelim, 0);
        }

        return xcSuggest.detectHeader(parsedRows);
    }

    function detectExcelHeader(data: string): boolean {
        let rows = null;
        try {
            rows = JSON.parse(data);
        } catch (error) {
            console.error(error);
            return false;
        }
        let headers = getJSONHeaders(rows);
        let rowLen = rows.length;
        let colLen = headers.length;
        let parsedRows = [];

        for (let i = 0; i < rowLen; i++) {
            parsedRows[i] = [];
            for (let j = 0; j < colLen; j++) {
                parsedRows[i][j] = rows[i][headers[j]];
            }
        }

        return xcSuggest.detectHeader(parsedRows);
    }

    function invalidHeaderDetection(
        headers: {colType: string, colName: string}[]
    ): XDPromise<void> {
        if (headers == null || headers.length > gMaxDSColsSpec) {
            return PromiseHelper.resolve();
        }
        let $ths = $previewTable.find("th");
        let invalidHeaders = [];
        headers.forEach((header, i) => {
            let error = xcHelper.validateColName(header.colName);
            if (error) {
                let $th = $ths.eq(i + 1);
                if (!$th.hasClass("unused")) {
                    invalidHeaders.push({
                        text: invalidHeadersConversion(header, error),
                        index: i,
                        error: error
                    });
                    $ths.eq(i + 1).find(".text").addClass("error");
                }
            }
        });

        if (invalidHeaders.length === 0) {
            return checkBulkDuplicateNames(headers);
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let msg: HTML;
        if (loadArgs.getFormat() === formatMap.CSV) {
            msg = '<span class="tableTitle">' + DSTStr.DetectInvalidColMsgFix +
                  ':</span>';
        } else {
            msg = '<span class="tableTitle">' + DSTStr.DetectInvalidColMsg +
                  ':</span>';
        }

        let table: HTML = '<div id="invalidDSColTable">' + msg +
        '<div class="row header">' +
        '<span class="colNum">No.</span><span class="colName">Name</span></div>';
        invalidHeaders.forEach(function(err) {
            table += '<div class="row">' +
                        '<span class="colNum">' + (err.index + 1) +
                        '</span>' +
                        '<span class="colName">' + err.text + '</span>' +
                    '</div>';
        });
        table += '</div>';

        if (loadArgs.getFormat() === formatMap.CSV) {
            Alert.show({
                "title": DSTStr.DetectInvalidCol,
                "instr": DSTStr.DetectInvalidColInstrForce,
                "msgTemplate": table,
                "sizeToText": true,
                "onCancel": function() {
                    xcUIHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                },
                "buttons": [{
                    name: CommonTxtTstr.Fix,
                    func: function() {
                        xcUIHelper.enableSubmit($form.find(".confirm"));
                        deferred.reject();
                    }
                }]
            });
        } else {
            Alert.show({
                "title": DSTStr.DetectInvalidCol,
                "instr": DSTStr.DetectInvalidColInstr,
                "msgTemplate": table,
                "sizeToText": true,
                "onConfirm": deferred.resolve,
                "onCancel": function() {
                    xcUIHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                }
            });
        }

        return deferred.promise();
    }

    function invalidHeadersConversion(
        header: {colName: string},
        error: string
    ): HTML {
        let text: HTML = '<span>';
        if (error === ColTStr.RenameStartInvalid) {
            text += '<span class="semibold highlight">' + header.colName.slice(0, 1) +
                    '</span>' + header.colName.slice(1);

        } else if (error === ErrTStr.NoEmpty) {
            text += '<span class="empty">' + CommonTxtTstr.empty + '</span>';
        } else {
            text += Array.from(header.colName).map(function(ch) {
                return xcHelper.hasInvalidCharInCol(ch, false) ?
                       '<span class="semibold highlight">' + ch + '</span>' : ch;
            }).join("");
        }

        text += '</span>';
        return text;
    }

    function checkIndividualDuplicateName(name: string, index: number): boolean {
        let dupFound: boolean = false;
        $previewTable.find("th:not(.rowNumHead)").each(function(i) {
            if ((i + 1) === index) {
                return true;
            }
            let $th = $(this);
            let colName: string = $th.find(".text").val();
            if (colName === name) {
                dupFound = true;
                return false;
            }

        });
        return dupFound;
    }

    function checkBulkDuplicateNames(headers: {colName: string}[]): XDPromise<void> {
        let nameMap = {};
        let isCreateTable = isCreateTableMode();
        for (let i = 0; i < headers.length; i++) {
            let header = headers[i].colName;
            if (isCreateTable) {
                header = header.toUpperCase();
            }
            if (!nameMap.hasOwnProperty(header)) {
                nameMap[header] = [i + 1];
            } else {
                nameMap[header].push(i + 1);
            }
        }
        let errorNames = [];
        let $ths = $previewTable.find("th");
        for (let name in nameMap) {
            if (nameMap[name].length > 1) {
                errorNames.push({colName: name, indices: nameMap[name]});
                for (let i = 1; i < nameMap[name].length; i++) {
                    $ths.eq(nameMap[name][i]).find(".text").addClass("error");
                }
            }
        }
        if (!errorNames.length) {
            return PromiseHelper.resolve();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        errorNames.sort(function(a, b) {
            if (a.indices[0] >= b.indices[0]) {
                return 1;
            } else {
                return -1;
            }
        });

        let table: HTML = '<div id="duplicateDSColTable"><span class="tableTitle">' +
        ErrTStr.DuplicateColNames + ':</span><div class="row header">' +
        '<span class="colName">Name</span><span class="colNums">Column Nos.' +
        '</span></div>';
        errorNames.forEach(function(name) {
            table += '<div class="row">' +
                        '<span class="colName">' + name.colName +
                        '</span>' +
                        '<span class="colNums">' + name.indices.join(",") +
                        '</span>' +
                    '</div>';
        });
        table += '</div>';

        Alert.show({
            "title": DSTStr.DetectInvalidCol,
            "instr": DSTStr.DetectInvalidColInstrForce,
            "msgTemplate": table,
            "sizeToText": true,
            "onConfirm": deferred.resolve,
            "onCancel": function() {
                xcUIHelper.enableSubmit($form.find(".confirm"));
                deferred.reject();
            },
            "buttons": [{
                name: CommonTxtTstr.Fix,
                func: function() {
                    xcUIHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                }
            }]
        });

        return deferred.promise();
    }

    function showProgressCircle(txId: number): void {
        let $waitSection = $previewWrap.find(".waitSection");
        $waitSection.addClass("hasUdf");
        let withText: boolean = true;
        let progressAreaHtml = xcUIHelper.getLockIconHtml(txId, 0, withText);
        $waitSection.find(".progressSection").html(progressAreaHtml);
        let progressCircle = new ProgressCircle(txId, 0, withText);
        $waitSection.find(".cancelLoad").data("progresscircle",
                                                progressCircle);
    }

    function toggleSubmitButton(disable: boolean): void {
        let $btn: JQuery = $form.find(".btn-submit");
        if (disable) {
            $btn.addClass("xc-disabled");
        } else {
            $btn.removeClass("xc-disabled");
        }
    }

    // currently only being used for CSV
    function initialSuggest(): void {
        let sourceIndex = loadArgs.getPreivewIndex();
        let cachedHeaders = loadArgs.getPreviewHeaders(sourceIndex);
        let autoDetectSchema: boolean = false;
        if ($previewTable.find(".editableHead").length > gMaxDSColsSpec) {
            $previewTable.find("th").addClass("nonEditable");
            let msg: string = "Data source has more than " + gMaxDSColsSpec +
            " fields. You can import data source but cannot change column names or cast data types during the import.";

            Alert.show({
                title: ErrTStr.ColumnLimitExceeded,
                msg: msg,
                isAlert: true
            });

            loadArgs.files[sourceIndex].autoCSV = true;
            autoDetectSchema = true;
        } else if (cachedHeaders && cachedHeaders.length > 0) {
            restoreColumnHeaders(sourceIndex, cachedHeaders);
        } else {
            let recTypes = suggestColumnHeadersType(false);
            let recNames = suggestColumnHeadersNames();
            changeColumnHeaders(recTypes, recNames);
            loadArgs.setSuggestHeaders(sourceIndex, recNames, recTypes);
        }
        autoFillDataSourceSchema(autoDetectSchema);
    }

    function restoreColumnHeaders(
        sourceIndex: number,
        typedColumns: {colName: string, colType: string}[]
    ): void {
        try {
            typedColumns = typedColumns || [];

            let originalTypedColumns = loadArgs.getOriginalHeaders(sourceIndex);
            let len = Math.max(originalTypedColumns.length, typedColumns.length);
            let types = [];
            let colNames = [];

            for (let i = 0; i < len; i++) {
                let colInfo = typedColumns[i] || <any>{};
                let originalColInfo = originalTypedColumns[i] || <any>{};
                let colType = colInfo.colType || originalColInfo.colType || ColumnType.unknown;
                let colName = colInfo.colName || autoHeaderName(i); // not use original col name
                types.push(colType);
                colNames.push(colName);
            }
            changeColumnHeaders(types, colNames);
        } catch (e) {
            console.error(e);
        }
    }

    function changeColumnHeaders(types: ColumnType[], colNames: string[]): void {
        types = types || [];
        colNames = colNames || [];
        $previewTable.find("th:gt(0)").each(function(colNum) {
            if (colNum >= gMaxDSColsSpec) {
                return false;
            }
            let type = types[colNum];
            let name = colNames[colNum];
            let $th = $(this);
            let $header = $th.find(".header");
            if (type) {
                $header.removeClass()
                        .addClass("header type-" + type);
                $th.data("type", type);
                xcTooltip.changeText($th.find(".flex-left"),
                                    xcStringHelper.capitalize(type) +
                                    '<br>' + DSTStr.ClickChange);
            }
            if (name) {
                let $input = $header.find("input");
                $input.val(name);
                xcTooltip.changeText($input, name);
            }
        });
    }

    function suggestColumnHeadersType(detectJSON: boolean): ColumnType[] {
        let $tbody = $previewTable.find("tbody").clone(true);
        let recTypes: ColumnType[] = [];
        let suggestType = function($tr, colNum) {
            let datas: string[] = [];
            let hasObject: boolean = false;
            let hasArray: boolean = false;
            let hasNormalVal: boolean = false;
            $tr.find("td:nth-child(" + colNum + ")").each(function() {
                var val = $(this).text();
                datas.push(val);
                if (val.startsWith("{") && val.endsWith("}")) {
                    hasObject = true;
                } else if (val.startsWith("[") && val.endsWith("]")) {
                    hasArray = true;
                } else {
                    hasNormalVal = true;
                }
            });
            if (detectJSON) {
                if (hasObject || hasArray) {
                    if (hasNormalVal || hasObject && hasArray) {
                        return ColumnType.mixed;
                    } else if (hasObject) {
                        return ColumnType.object;
                    } else if (hasArray) {
                        return ColumnType.array;
                    }
                }
            }
            return xcSuggest.suggestType(datas, null);
        };

        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".lineMarker").remove();

        let $tr = $tbody.find("tr");
        $tr.eq(0).find("td").each(function(colIndex) {
            let colType = suggestType($tr, colIndex + 1);
            recTypes[colIndex] = colType;
        });
        return recTypes;
    }

    function suggestColumnHeadersNames(): string[] {
        let allNames: string[] = [];
        let isCreateTable = isCreateTableMode();
        $previewTable.find(".editableHead").each(function() {
            let name: string = $(this).val().trim();
            if (isCreateTable) {
                name = name.toUpperCase();
            }
            allNames.push(name);
        });

        let newNames = getValidNameSet(allNames);
        return newNames;
    }

    function csvArgChange(): void {
        if (loadArgs.getFormat() !== formatMap.CSV) {
            return;
        }
        showHeadersWarning(null);
    }

    function showHeadersWarning(isCSV: boolean): void {
        if (shouldShowHeadersWarning(isCSV)) {
            $("#dsForm-warning").removeClass("xc-hidden");
        } else {
            hideHeadersWarning();
        }

        loadArgs.resetCachedHeaders();
    }

    function hideHeadersWarning(): void {
        $("#dsForm-warning").addClass("xc-hidden");
    }

    function shouldShowHeadersWarning(isCSV: boolean): boolean {
        if (loadArgs.hasPreviewMultipleFiles()) {
            // multi DS case and other files has been previewed
            return true;
        }
        // other case, detect if header has been changed
        let headers = getColumnHeaders(isCSV);
        let sourceIndex = loadArgs.getPreivewIndex();
        let suggestHeaders = loadArgs.getSuggestHeaders(sourceIndex);
        return hasTypedColumnChange(suggestHeaders, headers);
    }

    function getValidNameSet(allNames: string[]): string[] {
        let delim: string = "_";
        let invalidNames: {name: string, error: string, index: number}[] = [];
        let usedNames = {};
        let newNames: string[] = [];
        allNames.forEach(function(name, index) {
            var error = xcHelper.validateColName(name);
            if (error) {
                invalidNames.push({
                    name: name,
                    error: error,
                    index: index
                });
            } else if (usedNames[name]) {
                invalidNames.push({
                    name: name,
                    error: "duplicate",
                    index: index
                });
        } else {
                usedNames[name] = true;
                newNames[index] = name;
            }
        });

        invalidNames.forEach(function(name) {
            var candidate;
            switch (name.error) {
                case ("duplicate"):
                    candidate = name.name;// xcHelper.autoname will take care
                    break;
                case (ErrTStr.NoEmpty):
                case (ErrTStr.PreservedName):
                    candidate = "column" + name.index;
                    break;
                case (ColTStr.RenameStartInvalid):
                    candidate = xcHelper.stripColName(delim + name.name);
                    break;
                case (ColTStr.ColNameInvalidChar):
                    candidate = xcHelper.stripColName(name.name);
                    break;
                case (ColTStr.LongName):
                    candidate = name.name.substring(0,
                                XcalarApisConstantsT.XcalarApiMaxFieldNameLen -
                                6); // leave some space
                    candidate = xcHelper.stripColName(candidate);
                    break;
                default:
                    candidate = "column" + name.index;
                    break;
            }

            candidate = xcHelper.autoName(candidate, usedNames, null, delim);
            usedNames[candidate] = true;
            newNames[name.index] = candidate;
        });

        return newNames;
    }

    // Start === JsonFormat component factory
    function createJsonFormat({
        $container,
        udfModule,
        udfFunction
    }) {
        // Dependencies
        // const libs = { keyCode: keyCode };

        // Contants
        const DEFAULT_JMESPATH = '[*]';
        const ID_JMESPATH = 'dsForm-jsonJmespath';

        // Private variables
        const $elementPath = $(`#${ID_JMESPATH}`);

        // Private methods
        function init() {
            // Component initialization code goes here
        }

        // Initialize
        init();

        // Public methods
        return {
            show: function() {
                $container.find('.format.json').removeClass("xc-hidden");
            },

            validateValues: function() {
                try {
                    const strJemspath = $elementPath.val().trim();
                    return { jmespath: strJemspath };
                } catch(e) {
                    return null;
                }
            },

            restore: function({udfQuery}) {
                let jmespath;
                try {
                    jmespath = udfQuery.structsToExtract;
                    jmespath = (jmespath == null) ? '' : jmespath;
                } catch(e) {
                    jmespath = '';
                }
                if (jmespath === DEFAULT_JMESPATH) {
                    jmespath = '';
                }
                $elementPath.val(jmespath);

                const useUDF = (jmespath !== DEFAULT_JMESPATH)
                    && (jmespath.length > 0);
                return useUDF;
            },

            reset: function() {
                $elementPath.val('');
            },

            getUDFDefinition: function( { jmespath = '' } = {} ) {
                let udfDef;
                if (jmespath.length > 0) {
                    // Use UDF, in case jmespath is provided
                    udfDef = {
                        udfModule: udfModule,
                        udfFunc: udfFunction,
                        udfQuery: { structsToExtract: jmespath }
                    };
                } else {
                    // no UDF, in case jmespath is not provided
                    udfDef = {
                        udfModule: '',
                        udfFunc: '',
                        udfQuery: null
                    };
                }
                return udfDef;
            }
        };
    }
    // End === JsonFormat component factory

    // Start === ConfluentFormat component factory
    function createConfluentFormat(options: {
        udfModule: string,
        udfFunction: string,
        $container: JQuery
    }) {
        const { udfModule, udfFunction } = options;

        // Constants
        // const ID_NUMROWS = 'dsForm-cfNumRows';
        // Private variables
        // const $elementNumRows = $container.find(`#${ID_NUMROWS}`);

        return {
            show: function() {
                // $container.find('.format.confluent').removeClass("xc-hidden");
            },

            validateValues: function(isPreview: Boolean): { numRows: number } {
                const numRows = isPreview ? 20 : -1;
                return { numRows: numRows };
                // try {
                //     const numRows = Number.parseInt($elementNumRows.val().trim());
                //     return { numRows: Number.isNaN(numRows) ? -1 : numRows };
                // } catch(e) {
                //     return null;
                // }
            },

            restore: function() {
                // const { numRows = null } = udfQuery || {};
                // if (numRows != null) {
                //     $elementNumRows.val(`${numRows < 0 ? '': numRows}`);
                // }
            },

            reset: function() {
                // $elementNumRows.val('20');
            },

            getUDFDefinition: function(params: {
                numRows: number
            }): {
                udfModule: string, udfFunc: string, udfQuery: {
                    numRows: number
                }
            } {
                const { numRows = -1 } = params || {};
                return {
                    udfModule: udfModule,
                    udfFunc: udfFunction,
                    udfQuery: { numRows: numRows }
                };
            }
        };
    }
    // End === ConfluentFormat component factory

    // Start === SnowflakeFormat component factory
    function createSnowflakeFormat(options: {
        udfModule: string,
        udfFunction: string,
        $container: JQuery,
    }) {
        const { udfModule, udfFunction, $container } = options;
        const $tableName = $('#dsForm-snowflake-table');

        return {
            show: function() {
                $container.find('.format.snowflake').removeClass("xc-hidden");
            },

            validateValues: function(): { table_name: string } {
                const tableName = $tableName.val().trim();
                return { table_name: tableName };
            },

            restore: function({ table_name }) {
                if (table_name != null) {
                    $tableName.val(table_name);
                }
            },

            reset: function() {
                // $elementNumRows.val('20');
            },

            getUDFDefinition: function({table_name = ''} = {}) {
                return {
                    udfModule: udfModule,
                    udfFunc: udfFunction,
                    udfQuery: { table_name }
                };
            },
        };
    }
    // End === SnowflakeFormat component factory

    // Start === DatabaseFormat component factory
    function createDatabaseFormat({
        udfModule,
        udfFunction,
        sqlID = 'dsForm-dbSQL',
        containerID = 'importDataForm-content',
    }) {
        // Dependencies
        // const libs = {
        //     xcHelper: xcHelper,
        //     ErrTStr: ErrTStr,
        // };

        // Constants

        // Private variables
        const $elementSQL = $('#' + sqlID);
        const $container = $('#' + containerID);

        // Private methods
        function init() {
            // Component initialize code goes here
        }

        function parseSource(source) {
            // source = /<target>/<schema>/<table>
            const parseList = source.split('/').filter((v) => v.length > 0);
            return { table: parseList[2], schema: parseList[1] };
        }
        // Initialize
        init();

        // Public methods
        return {
            restore: function({query}) {
                if (query != null) {
                    $elementSQL.val(query);
                }
            },
            validateValues: function() {
                const strSQL = $elementSQL.val().trim();
                return { query: strSQL };
            },
            getUDFDefinition: function({query = ''} = {}) {
                return {
                    udfModule: udfModule,
                    udfFunc: udfFunction,
                    udfQuery: { query: query }
                };
            },
            setDefaultSQL: function({sourceSelected = '', replaceExisting = true } = {}) {
                const strSQL = $elementSQL.val().trim();
                const { table, schema } = parseSource(sourceSelected);
                const defaultSQL = table == null ? strSQL : `select * from ${schema}.${table}`;
                // Replace the empty SQL with default SQL in anyway
                if (strSQL.length === 0) {
                    $elementSQL.val(defaultSQL);
                    return PromiseHelper.resolve();
                }
                // In case we don't want to replace an existing SQL, we are done here
                if (!replaceExisting) {
                    return PromiseHelper.resolve();
                }
                // In case the SQL doesn't change, we are done here
                if (strSQL === defaultSQL) {
                    return PromiseHelper.resolve();
                }
                // We are overwriting the existing SQL with the default one
                const deferred = PromiseHelper.deferred();
                Alert.show({
                    title: DSFormTStr.ReplaceSQLTitle,
                    msgTemplate: xcStringHelper.replaceMsg(DSFormTStr.ReplaceSQLMessage, {
                        sql: defaultSQL
                    }),
                    onCancel: () => {
                        deferred.resolve();
                    },
                    onConfirm: () => {
                        $elementSQL.val(defaultSQL);
                        deferred.resolve();
                    }
                });
                return deferred.promise();
            },
            show: function() {
                $container.find(".format.database").removeClass("xc-hidden");
            },
        };
    }
    // End === DatabaseFormat component factory

    // Start === XMLFormat component factory
    function createXMLFormat({
        $container,
        udfModule,
        udfFunction
    }) {
        // Dependencies
        const libs = {
            keyCode: keyCode,
            xcHelper: xcHelper,
            ErrTStr: ErrTStr,
            PromiseHelper: PromiseHelper
        };

        // Constants
        const XPATH_TEMPLATE_CLASS = 'xpath_template';
        const EXTRAKEY_TEMPLATE_CLASS = 'xtrakey_template';
        const XPATH_CONTAINER_CLASS = 'xpath_container';
        // const EXTRAKEY_CONTAINER_CLASS = 'extrakey_list';
        const XCID_NEWXPATH = 'xml.newXPath';
        const XCID_MATCHEDPATH = 'xml.matchedPath';
        const XCID_WITHPATH = 'xml.withPath';
        const XCID_DELIMITER = 'xml.delimiter';

        // private variables
        let xPathTemplate = '';
        let extraKeyTemplate = '';
        let $xPathContainer;
        let state = getDefaultState();
        let validateOptions = [];

        // Event handlers
        function onXPathClose(xpathIndex) {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths.splice(xpathIndex, 1);
                    setStateInternal(newState);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onXPathChange(xpathIndex) {
            return (event) => {
                try {
                    const newXPathValue = event.target.value;
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex].xPath.value = newXPathValue.trim();
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onXPathNameChange(xpathIndex) {
            return (event) => {
                try {
                    const newXPathName = event.target.value;
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex].xPath.name = newXPathName.trim();
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onNewKeyClick(xpathIndex) {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex].extraKeys.push(getDefaultExtrakey());
                    setStateInternal(newState);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onExtrakeyClose(xpathIndex, extrakeyIndex) {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex].extraKeys.splice(extrakeyIndex, 1);
                    setStateInternal(newState);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onExtrakeyNameChange(xpathIndex, extrakeyIndex) {
            return (event) => {
                try {
                    const newName = event.target.value;
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex]
                        .extraKeys[extrakeyIndex].name = newName;
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onExtrakeyValueInput(xpathIndex, extrakeyIndex, $elemName) {
            return (event) => {
                const keyName =
                    state.xPaths[xpathIndex].extraKeys[extrakeyIndex].name;
                if (keyName.length === 0) {
                    // auto-fill the key name field
                    const keyValue = event.target.value.trim();
                    $elemName.val(keyValue.length > 0
                        ? xcHelper.stripColName(keyValue, false, true).trim()
                        : keyValue
                    );
                }
            };
        }

        function onExtrakeyValueBlur(xpathIndex, extrakeyIndex, $elemName) {
            return (_event) => {
                try {
                    const key = state.xPaths[xpathIndex].extraKeys[extrakeyIndex];
                    const keyName = $elemName.val();
                    if (key.name !== keyName) {
                        // data model is out of sync with UI, caused by autofill intensionally
                        const newState = libs.xcHelper.deepCopy(state);
                        newState.xPaths[xpathIndex]
                            .extraKeys[extrakeyIndex].name = keyName;
                        setStateInternal(newState, true);
                    }
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onExtrakeyValueChange(xpathIndex, extrakeyIndex) {
            return (event) => {
                try {
                    const newValue = event.target.value;
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths[xpathIndex]
                        .extraKeys[extrakeyIndex].value = newValue;
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onNewXPathClick() {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.xPaths.push(getDefaultXPath());
                    setStateInternal(newState);
                } catch(e) {
                    console.error(e);
                }
            };
        }

        function onMatchedPathClick() {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.isMatchedPath = !newState.isMatchedPath;
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            }
        }

        function onWithPathClick() {
            return () => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.isWithPath = !newState.isWithPath;
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            }
        }

        function onInputKeydown() {
            return (event) => {
                if (event.which === libs.keyCode.Enter) {
                    $(event.target).trigger('change', event);
                    event.preventDefault();
                }
            }
        }

        function onDelimiterChange() {
            return (event) => {
                try {
                    const newState = libs.xcHelper.deepCopy(state);
                    newState.delimiter = event.target.value;
                    setStateInternal(newState, true);
                } catch(e) {
                    console.error(e);
                }
            }
        }

        // private methods
        function init() {
            xPathTemplate = $container.find(`.${XPATH_TEMPLATE_CLASS}`).html();
            extraKeyTemplate = $container.find(`.${EXTRAKEY_TEMPLATE_CLASS}`).html();
            $xPathContainer = $container.find(`.${XPATH_CONTAINER_CLASS}`);
            // Setup newXPath button
            const $elementNewXPath = findXCElement($container, XCID_NEWXPATH);
            $elementNewXPath.off('click');
            $elementNewXPath.on('click', onNewXPathClick());
            // Setup matchedPath checkbox
            const $elementMatchedPath = findXCElement($container, XCID_MATCHEDPATH);
            $elementMatchedPath.off('click.xml');
            $elementMatchedPath.on('click.xml', onMatchedPathClick());
            // Setup elementPath checkbox
            const $elementWithPath = findXCElement($container, XCID_WITHPATH);
            $elementWithPath.off('click.xml');
            $elementWithPath.on('click.xml', onWithPathClick());
            // Setup delimiter inputBox
            const $elementDelimiter = findXCElement($container, XCID_DELIMITER);
            $elementDelimiter.off();
            $elementDelimiter.on('change', onDelimiterChange());
        }

        function getDefaultExtrakey() {
            return { name: '', value: '' };
        }

        function getDefaultXPath() {
            return { xPath: { name: '', value: '' }, extraKeys: [] };
        }

        function getDefaultState() {
            return { xPaths: [ getDefaultXPath() ], isWithPath: false, isMatchedPath: false, delimiter: '|' };
        }

        function htmlToElement(htmlStr) {
            return $($.trim(htmlStr));
        }

        function findXCElement($container, xcid) {
            return $container.find(`[data-xcid="${xcid}"]`);
        }

        function createExtraKey({
            keyName,
            keyValue,
            onNameChange,
            onValueInput,
            onValueChange,
            onValueBlur,
            onInputKeydown,
            onClose,
            isShowTooltip = true }) {
            const $dom = htmlToElement(extraKeyTemplate);

            // Setup ExtrakeyName input
            const $elementName = findXCElement($dom, 'xtrakey.name')
            $elementName.val(keyName);
            $elementName.on('change', onNameChange);
            $elementName.on('keydown', onInputKeydown)
            addValidateOption({
                $element: $elementName,
                errorMessage: libs.ErrTStr.InvalidColName,
                checkFunc: () => CheckFunctions.isInvalidColName($elementName)
            });
            // Setup ExtrakeyValue input
            const $elementValue = findXCElement($dom, 'xtrakey.value');
            $elementValue.val(keyValue);
            $elementValue.on('change', onValueChange);
            $elementValue.on('keydown', onInputKeydown);
            $elementValue.on('input', onValueInput($elementName));
            $elementValue.on('blur', onValueBlur($elementName));
            addValidateOption({
                $element: $elementValue,
                errorMessage: libs.ErrTStr.NoEmpty,
                checkFunc: () => CheckFunctions.isInputEmpty($elementValue)
            });
            // Setup close buttun
            const $elementClose = findXCElement($dom, 'xtrakey.close');
            $elementClose.on('click', onClose);
            // Setup tooltip
            if (!isShowTooltip) {
                const $elementTooltip = findXCElement($dom, 'xtrakey.tooltip');
                $elementTooltip.css('visibility', 'hidden');
            }

            return $dom;
        }

        function setStateInternal(newState = {}, noRender = false) {
            return setStateAsync({ newState: newState, noRender: noRender });
        }

        function setStateAsync( { newState = {}, noRender = false }) {
            const deferred = libs.PromiseHelper.deferred();
            state = <any>newState;
            if (!noRender) {
                setTimeout( () => { render(); deferred.resolve(); }, 0);
            } else {
                deferred.resolve();
            }
            return deferred.promise();
        }

        function setStateSync( { newState = {}, noRender = false }) {
            state = <any>newState;
            if (!noRender) {
                render();
            }
        }

        function clearValidateOptions() {
            validateOptions = [];
        }

        function addValidateOption({ $element, errorMessage, checkFunc }) {
            validateOptions.push({
                "$ele": $element,
                "error": errorMessage,
                "formMode": true,
                "check": checkFunc
            });
        }

        function validateElements() {
            if (validateOptions.length === 0) {
                return true;
            }
            return libs.xcHelper.validate(validateOptions);
        }

        const CheckFunctions = {
            isInputEmpty: ($element) => ($element.val().trim().length === 0),
            isInvalidColName: ($element) => {
                const colName = $element.val().trim();
                if (colName.length === 0) {
                    return true;
                }
                return xcHelper.validateColName(colName, false, true) != null;
            },
            isNotEmptyInvalidColName: ($element) => {
                const colName = $element.val().trim();
                if (colName.length === 0) {
                    return false;
                }
                return xcHelper.validateColName(colName, false, true) != null;
            },
        };

        // Cleanup data model
        // Remove the data in cases:
        // #1 keyName and keyValue are both empty
        // #2 xPath and extraKey list are both empty
        function cleanupState() {
            let hasEmpty = false;
            const xPaths = state.xPaths.reduce( (resXPath, xPath) => {
                const result = getDefaultXPath();
                result.xPath.value = xPath.xPath.value.trim();
                result.xPath.name = xPath.xPath.name.trim();
                const isXPathEmpty = (result.xPath.value.length === 0);

                let hasEmptyKey = false;
                result.extraKeys = xPath.extraKeys.reduce( (resKey, key) => {
                    const name = key.name.trim();
                    const isNameEmpty = (name.length === 0);
                    const value = key.value.trim();
                    const isValueEmpty = (value.length === 0);

                    // name and/or value are not empty, keep it
                    if (!isNameEmpty || !isValueEmpty) {
                        const result = getDefaultExtrakey();
                        result.name = name;
                        result.value = value;
                        resKey.push(result);
                        hasEmptyKey = hasEmptyKey || (isNameEmpty || isValueEmpty);
                    }

                    return resKey;
                }, []);

                // XPath and/or extraKeys is not empty, keep it
                const isAllKeysEmpty = (result.extraKeys.length === 0);
                if (!isXPathEmpty || !isAllKeysEmpty) {
                    resXPath.push(result);
                    hasEmpty = hasEmpty || (isXPathEmpty || hasEmptyKey);
                }
                return resXPath;
            }, []);

            const newState = getDefaultState();
            if (xPaths.length > 0) { // We need at least 1 xPath
                newState.xPaths = xPaths;
            }
            newState.isMatchedPath = state.isMatchedPath;
            newState.isWithPath = state.isWithPath;
            newState.delimiter = state.delimiter;

            return { state: newState, hasEmpty: hasEmpty };
        }

        function render() {
            // Reset the list of elements need to validate
            clearValidateOptions();

            // Static sections (newXPath button, checkboxes ...)
            // Update UI only ... setup event handlers in init()
            const $elementMatchedPath = findXCElement($container, XCID_MATCHEDPATH);
            state.isMatchedPath ?
                $elementMatchedPath.addClass('checked') :
                $elementMatchedPath.removeClass('checked');
            const $elementWithPath = findXCElement($container, XCID_WITHPATH);
            state.isWithPath ?
                $elementWithPath.addClass('checked') :
                $elementWithPath.removeClass('checked');
            const $elementDelimiter = findXCElement($container, XCID_DELIMITER);
            $elementDelimiter.val(state.delimiter);

            // Dynamic sections (xPath list /w extraKey list)
            // Update UI & setup event handlers
            const xPathCount = state.xPaths.length;
            const domList = state.xPaths.map( (xPath, xPathIndex) => {
                const $dom = htmlToElement(xPathTemplate);

                // Setup xPath close button
                const $elementClose = findXCElement($dom, 'xpath.close');
                if (xPathCount > 1) {
                    $elementClose.on('click', onXPathClose(xPathIndex));
                } else {
                    // This is the only xpath, and it cannot be deleted
                    $elementClose.css('visibility', 'hidden');
                }
                // Setup xPath value input
                const $elementXPath = findXCElement($dom, 'xpath.xpath');
                $elementXPath.on('change', onXPathChange(xPathIndex));
                $elementXPath.on('keydown', onInputKeydown());
                $elementXPath.val(xPath.xPath.value);
                addValidateOption({
                    $element: $elementXPath,
                    errorMessage: libs.ErrTStr.NoEmpty,
                    checkFunc: () => CheckFunctions.isInputEmpty($elementXPath)
                });
                // Setup xPath name input
                const $elementXPathName = findXCElement($dom, 'xpath.name');
                $elementXPathName.on('change', onXPathNameChange(xPathIndex));
                $elementXPathName.on('keydown', onInputKeydown());
                $elementXPathName.val(xPath.xPath.name);
                addValidateOption({
                    $element: $elementXPathName,
                    errorMessage: libs.ErrTStr.InvalidColName,
                    checkFunc: () => CheckFunctions.isNotEmptyInvalidColName($elementXPathName)
                });
                // Setup new key button
                const $elementNewKey = findXCElement($dom, 'xpath.newKey');
                $elementNewKey.on('click', onNewKeyClick(xPathIndex));
                // Setup ExtraKey list
                const extrakeyList = xPath.extraKeys.map(
                    (key, keyIndex) => createExtraKey({
                        keyName: key.name,
                        keyValue: key.value,
                        onNameChange: onExtrakeyNameChange(xPathIndex, keyIndex),
                        onValueInput: onExtrakeyValueInput.bind(null, xPathIndex, keyIndex),
                        onValueChange: onExtrakeyValueChange(xPathIndex, keyIndex),
                        onValueBlur: onExtrakeyValueBlur.bind(null, xPathIndex, keyIndex),
                        onInputKeydown: onInputKeydown(),
                        onClose: onExtrakeyClose(xPathIndex, keyIndex),
                        isShowTooltip: true
                    })
                );
                const $elementKeyList = findXCElement($dom, 'xpath.extrakeyList');
                if (extrakeyList.length === 0) {
                    // Hide empty container
                    $elementKeyList.addClass('xc-hidden');
                } else {
                    $elementKeyList.removeClass('xc-hidden');
                    $elementKeyList.append(extrakeyList);
                }

                return $dom;
            });

            $xPathContainer.empty();
            $xPathContainer.append(domList);
        }

        // Initialize
        init();

        // public methods
        return {
            getTestHelper: function() {
                return {
                    getDefaultExtrakey: () => getDefaultExtrakey(),
                    getDefaultXPath: () => getDefaultXPath(),
                    getDefaultState: () => getDefaultState(),
                    setState: (newState) => setStateInternal(newState),
                    getState: () => libs.xcHelper.deepCopy(state),
                };
            },
            resetState: function() {
                return setStateInternal(getDefaultState());
            },
            show: function() {
                render();
                $container.find('.format.xml').removeClass("xc-hidden");
            },
            restore: function({udfQuery}) {
                const newState = getDefaultState();
                newState.isWithPath = udfQuery.withPath;
                newState.isMatchedPath = udfQuery.matchedPath;
                newState.delimiter = udfQuery.delimiter;
                if (udfQuery.allPaths != null && udfQuery.allPaths.length > 0) {
                    newState.xPaths = udfQuery.allPaths.map( (xPath) => {
                        const res = getDefaultXPath();
                        res.xPath.name = xPath.xPath.name;
                        res.xPath.value = xPath.xPath.value;
                        res.extraKeys = Object.keys(xPath.extraKeys).map(
                            (keyName) => ({
                                name: keyName,
                                value: xPath.extraKeys[keyName]})
                        );
                        return res;
                    });
                }
                setStateInternal(newState);
            },
            getUDFDefinition: function({isWithPath, isMatchedPath, delimiter, xPaths}) {
                return {
                    udfModule: udfModule,
                    udfFunc: udfFunction,
                    udfQuery: {
                        allPaths: xPaths,
                        withPath: isWithPath,
                        matchedPath: isMatchedPath,
                        delimiter: delimiter
                    }
                };
            },
            validateValues: function({
                isShowError = true,
                isCleanupModel = true
            } = {} ) {
                const { state: newState, hasEmpty } = cleanupState();
                if (isCleanupModel) {
                    setStateSync({ newState: newState, noRender: !isShowError });
                }
                if (isShowError) {
                    if (!validateElements()) {
                        return null;
                    }
                }
                if (hasEmpty) {
                    // Incomplete data model
                    return null;
                }

                // Convert data model to udf query format
                const xPaths = state.xPaths.reduce( (resXPath, xPath) => {
                    const result = getDefaultXPath();
                    result.xPath = {
                        name: xPath.xPath.name,
                        value: xPath.xPath.value
                    };

                    result.extraKeys = xPath.extraKeys.reduce( (resKey, key) => {
                        const name = key.name.trim();
                        const value = key.value.trim();
                        if (name.length > 0 && value.length > 0) {
                            resKey[name] = value;
                        }
                        return resKey;
                    }, {});

                    if (result.xPath.value.length > 0) {
                            resXPath.push(result);
                    }
                    return resXPath;
                }, []);

                return xPaths.length === 0 ? null : {
                    isWithPath: state.isWithPath,
                    isMatchedPath: state.isMatchedPath,
                    delimiter: state.delimiter,
                    xPaths: xPaths
                };
            }
        };
    }
    // End === XMLFormat component factory

    // Start === PreviewLoader component factory
    function createPreviewLoader({
        $container,
        refreshPreviewFunc
    }) {
        // Constants
        const XCID_BTN_REFRESH = 'format.refresh';

        // Private methods
        function init() {
            const $elementRefresh = $container.find(`[data-xcid="${XCID_BTN_REFRESH}"]`);
            $elementRefresh.off('click');
            $elementRefresh.on('click', refreshPreviewFunc);
        }

        // Initialize
        init();

        // Public methods
        return {};
    }
    // End === PreviewLoader component factory

    function _setSession(): void {
        WorkbookManager.switchToXDInternalSession();
    }

    function _resetSession(): void {
        WorkbookManager.resetXDInternalSession();
    }

    function _translateSchema(dsArgs) {
        if (xcGlobal.isLegacyLoad) return dsArgs;
        let schema = dsArgs.schema;
        let newNames = dsArgs.newNames || [];
        // output {"rowpath":"$","columns":[{"name":"BASE_NUMBER","mapping":"$.\"base_number\"","type":"DfString"}]}
        // mapping can look like "$.\"entities\".\"user_mentions\"[0].\"id_str\"",
        const newSchemaObj = {"rowpath":"$", "columns": []};
        let sourceIndex = loadArgs.getPreivewIndex();
        let prevTypedCols = loadArgs.getOriginalHeaders(sourceIndex);

        if (!schema) { // when num columns > 1000
            schema = prevTypedCols.map(({colType, colName}, i) => {
                return {
                    name: colName,
                    type: colType
                }
            });
        }

        schema.forEach((col, i) => {
            let mapping;
            if (dsArgs.format === formatMap.CSV && prevTypedCols[i]) {
                mapping = prevTypedCols[i].colName;
            } else {
                mapping = col.name;
            }
            // translate "a.b[0].c" into '"a".
            let colPathInfo = ColManager.parseColFuncArgs(mapping);
            for (let i = 0; i < colPathInfo.nested.length; i++) {
                if (colPathInfo.types[i - 1] === "array") {
                    colPathInfo.nested[i] = "[" + colPathInfo.nested[i] + "]";
                } else {
                    colPathInfo.nested[i] = '"' + colPathInfo.nested[i] + '"';
                }
            }
            mapping = colPathInfo.nested.join(".");

            newSchemaObj.columns.push({
                name: newNames[i] || col.name,
                mapping:  "$." + mapping,
                type: DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(col.type)]
            });
        });

        console.log(newSchemaObj);
        return newSchemaObj;
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.getPreviewTable = getPreviewTable;
        __testOnly__.parseTdHelper = parseTdHelper;
        __testOnly__.getTbodyHTML = getTbodyHTML;
        __testOnly__.getTheadHTML = getTheadHTML;
        __testOnly__.getPreviewTableName = getPreviewTableName;
        __testOnly__.highlightHelper = highlightHelper;
        __testOnly__.toggleHeader = toggleHeader;
        __testOnly__.detectFormat = detectFormat;
        __testOnly__.detectHeader = detectHeader;
        __testOnly__.detectExcelHeader = detectExcelHeader;
        __testOnly__.applyHighlight = applyHighlight;
        __testOnly__.clearPreviewTable = clearPreviewTable;
        __testOnly__.getDataFromLoadUDF = getDataFromLoadUDF;
        __testOnly__.getURLToPreview = getURLToPreview;
        __testOnly__.loadDataWithUDF = loadDataWithUDF;
        __testOnly__.invalidHeaderDetection = invalidHeaderDetection;
        __testOnly__.checkBulkDuplicateNames = checkBulkDuplicateNames;
        __testOnly__.changePreviewFile = changePreviewFile;
        __testOnly__.resetForm = resetForm;
        __testOnly__.restoreForm = restoreForm;
        __testOnly__.getNameFromPath = getNameFromPath;
        __testOnly__.getSkipRows = getSkipRows;
        __testOnly__.applyFieldDelim = applyFieldDelim;
        __testOnly__.applyLineDelim = applyLineDelim;
        __testOnly__.applyQuote = applyQuote;
        __testOnly__.toggleFormat = toggleFormat;
        __testOnly__.isUseUDF = isUseUDF;
        __testOnly__.isUseUDFWithFunc = isUseUDFWithFunc;
        __testOnly__.selectUDFModule = selectUDFModule;
        __testOnly__.selectUDFFunc = selectUDFFunc;
        __testOnly__.validateUDFModule = validateUDFModule;
        __testOnly__.validateUDFFunc = validateUDFFunc;
        __testOnly__.resetUdfSection = resetUdfSection;
        __testOnly__.listUDFSection = listUDFSection;
        __testOnly__.slowPreviewCheck = slowPreviewCheck;
        __testOnly__.autoDetectSourceHeaderTypes = autoDetectSourceHeaderTypes;
        __testOnly__.getTypedColumnsList = getTypedColumnsList;
        __testOnly__.getTerminationOptions = getTerminationOptions;
        __testOnly__.validatePreview = validatePreview;
        __testOnly__.validateForm = validateForm;
        __testOnly__.submitForm = submitForm;
        __testOnly__.getParquetInfo = getParquetInfo;
        __testOnly__.initParquetForm = initParquetForm;
        __testOnly__.errorHandler = errorHandler;
        __testOnly__.previewData = previewData;
        __testOnly__.importDataHelper = importDataHelper;
        __testOnly__.suggestDetect = suggestDetect;
        __testOnly__.componentXmlFormat = () => componentXmlFormat;
        __testOnly__.get = function() {
            return {
                "loadArgs": loadArgs,
                "highlighter": highlighter,
                "detectArgs": detectArgs,
                "id": previewId,
                "tableName": tableName
            };
        };

        __testOnly__.set = function(newData, newHighlight) {
            highlighter = newHighlight || "";
            rawData = newData || null;
        };

        __testOnly__.setCB = function(cb) {
            _backCB = cb;
        }

        var oldIsCreateTableMode;
        __testOnly__.setIsCreateTableMode = function(flag) {
            oldIsCreateTableMode = isCreateTableMode;
            DSConfig.isCreateTableMode = function() {
                return flag;
            };
        }

        __testOnly__.resetIsCreateTableMode = function() {
            DSConfig.isCreateTableMode = oldIsCreateTableMode;
        };
        __testOnly__.validateParquetArgs = validateParquetArgs;
        __testOnly__.delimiterTranslate = delimiterTranslate;
    }
    /* End Of Unit Test Only */
}
