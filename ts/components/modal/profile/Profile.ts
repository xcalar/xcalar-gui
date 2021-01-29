/*
    Known Issues:
    - Cannot filter by 'Other' in piechart
    - How to handle Bucketing with 'Other'
*/
namespace Profile {
    let $modal: JQuery;        // $("#profileModal");
    let $rangeSection: JQuery; // $modal.find(".rangeSection");
    let $rangeInput: JQuery;   // $("#profile-range");
    let $skipInput: JQuery;    // $("#profile-rowInput")

    let modalHelper: ModalHelper;

    // constants
    const aggKeys: string[] = ["min", "average", "max", "count", "sum", "sd"];
    const statsKeyMap: {[key: string]: string} = {
        "zeroQuartile": "zeroQuartile",
        "lowerQuartile": "lowerQuartile",
        "median": "median",
        "upperQuartile": "upperQuartile",
        "fullQuartile": "fullQuartile"
    };
    const sortMap: {[key: string]: string} = {
        "asc": "asc",
        "origin": "origin",
        "desc": "desc",
        "ztoa": "ztoa"
    };
    let statsColName: string = "statsGroupBy";
    const bucketColName: string = "bucketGroupBy";
    const defaultRowsToFetch: number = 20;
    const minRowsToFetch: number = 10;
    const maxRowsToFetch: number = 100;
    const decimalLimit: number = 5;

    let statsInfos = {};
    let baseStatsInfos = {};
    let bucketCache = {};

    // data with initial value
    let curTableId: TableId = null;
    let curColNum: number = null;
    let groupByData = [];
    let bucketNum: number = 0;
    let decimalNum: number = -1;
    let order: string = sortMap.origin;
    let statsCol: ProfileInfo = null;
    let percentageLabel: boolean = false;
    let numRowsToFetch: number = defaultRowsToFetch;
    let chartType: string = "bar";
    let chartBuilder: AbstractChartBuilder;
    let _profileEngine: ProfileEngine = null;
    let _profileSelector: ProfileSelector = null;
    let _isBarChart = false;

    /**
     * Profile.setup
     */
    export function setup(): void {
        $modal = $("#profileModal");
        $rangeSection = $modal.find(".rangeSection");
        $rangeInput = $("#profile-range");
        $skipInput = $("#profile-rowInput");

        let modalWidth: number;
        let statsWidth: number;
        modalHelper = new ModalHelper($modal, {
            beforeResize: function() {
                modalWidth = $modal.width();
                statsWidth = $("#profile-stats").width();
            },
            resizeCallback: function(_event, ui) {
                if ($modal.hasClass("collapse")) {
                    resizeChart();
                    return;
                }

                const minWidth: number = getMinStatsPanelWidth();
                let width: number = minWidth;
                if (statsWidth > minWidth) {
                    width = ui.size.width / modalWidth * statsWidth;
                }
                width = Math.min(width, getMaxStatsPanelWidth());
                width = Math.max(width, minWidth);
                adjustStatsPanelWidth(width);
            },
            noEnter: true
        });
        addEventListeners();
    }

    export function restore(oldInfos): void {
        let oldStats = oldInfos || {};
        let newStats = {};
        for (let tableId in oldStats) {
            newStats[tableId] = {};
            let colInfos = oldStats[tableId] || {};
            for (let colName in colInfos) {
                let oldInfo = colInfos[colName];
                newStats[tableId][colName] = new ProfileInfo(oldInfo);
            }
        }

        baseStatsInfos = newStats;
    }

    /**
     * Profile.getCache
     */
    export function getCache() {
        return baseStatsInfos;
    }

    /**
     * Profile.deleteCache
     * @param tableId
     */
    export function deleteCache(tableId: TableId): void {
        delete baseStatsInfos[tableId];
    }

    /**
     * Profile.copy
     * @param oldTableId
     * @param newTableId
     */
    export function copy(oldTableId: TableId, newTableId: TableId): boolean {
        let statsInfos = baseStatsInfos;
        if (statsInfos[oldTableId] == null ||
            gTables[oldTableId] == null ||
            gTables[newTableId] == null
        ) {
            return false;
        }
        // because the exploadString xdf,map can also change the total row num
        // so need to do a check first
        try {
            let oldTotalRow: number = gTables[newTableId].resultSetCount;
            let newTotalRow: number = gTables[newTableId].resultSetCount;
            if (newTotalRow == null ||
                oldTotalRow !== newTotalRow
            ) {
                return false;
            }

            statsInfos[newTableId] = {};
            for (let colName in statsInfos[oldTableId]) {
                let options = statsInfos[oldTableId][colName];
                statsInfos[newTableId][colName] = new ProfileInfo(options);
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // XXX TODO: change to start from a table, not tableId
    /**
     * Profile.show
     * @param tableId
     * @param colNum
     */
    export function show(tableId: TableId, colNum: number, isBarChart?: boolean): XDPromise<void> {
        let table: TableMeta = gTables[tableId];
        if (table == null) {
            return PromiseHelper.reject("No table!");
        }
        let progCol = table.getCol(colNum);
        if (progCol == null) {
            return PromiseHelper.reject("No column!");
        }
        let colName: string = progCol.getBackColName();
        if (colName == null) {
            return PromiseHelper.reject("No backend col name!");
        }
        if (isBarChart) {
            statsInfos = {};
            _isBarChart = true;
        } else {
            statsInfos = baseStatsInfos;
            _isBarChart = false;
        }

        curTableId = tableId;
        curColNum = colNum;

        statsInfos[tableId] = statsInfos[tableId] || {};
        statsCol = statsInfos[tableId][colName];

        if (statsCol == null) {
            statsCol = statsInfos[tableId][colName] = new ProfileInfo({
                "colName": colName,
                "type": progCol.getType(),
                "version": undefined,
                "id": undefined,
                "aggInfo": undefined,
                "frontColName": undefined,
                "groupByInfo": undefined,
                "statsInfo": undefined
            });
        } else if (statsCol.getId() === $modal.data("id")) {
            // when same modal open twice
            return PromiseHelper.resolve();
        }

        checkIsSamplePublishedTable(table);

        getProfileEngine();
        getProfileSelector();
        // update front col name
        statsCol.frontColName = progCol.getFrontColName(true);

        showProfile();
        $modal.attr("data-state", "pending");

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        generateProfile(table)
        .then(() => {
            if (_isBarChart) {
                refreshInstrText();
            }
            $modal.attr("data-state", "finished");
            deferred.resolve();
        })
        .fail((error) => {
            $modal.attr("data-state", "failed");
            console.error("Profile failed", error);
            deferred.resolve();
        });

        return deferred.promise();
    }

    // XXX TODO: ProfileEngine should not call it direcly
    /**
     * Profile.getNumRowsToFetch
     */
    export function getNumRowsToFetch(): number {
        return numRowsToFetch;
    }

    // XXX TODO: ProfileEngine should not call it direcly
    /**
     * Profile.refreshAgg
     * @param profileInfo
     * @param aggkey
     */
    export function refreshAgg(profileInfo: ProfileInfo, aggkey: string): void {
        // modal is open and is for that column
        if (isModalVisible(profileInfo)) {
            refreshAggInfo(aggkey, profileInfo, false);
        }
    }

    function addEventListeners() {
        $modal.on("click", ".close", function() {
            closeProfileModal();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        // show tootip in barArea and do not let in blink in padding
        $modal.on("mouseover", ".area", function(event) {
            event.stopPropagation();
            let rowToHover = null;
            if (!$modal.hasClass("drawing") && isBarChart()) {
                rowToHover = d3.select(this).attr("data-rowNum");
            }
            resetTooltip(this, rowToHover);
        });

        $modal.on("mouseout", ".pieChart .area", function() {
            resetTooltip(null, null);
        });

        $modal.on("mouseover", function() {
            resetTooltip(null, null);
        });

        // only trigger in padding area btw bars
        $modal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $modal.on("click", ".graphSwitch", function() {
            let $el = $(this);
            if ($el.hasClass("on")) {
                $el.removeClass("on");
            } else {
                $el.addClass("on");
            }

            if (chartType === "bar") {
                chartType = "pie";
            } else if (chartType === "pie") {
                $("#profile-chart .groupbyChart")
                    .removeAttr("viewBox")
                    .removeAttr("preserveAspectRatio");
                chartType = "bar";
            }
            clearProfileSelector(false);
            buildGroupGraphs(statsCol, true, false);
        });

        let $groupbySection: JQuery = $modal.find(".groupbyInfoSection");
        $groupbySection.on("click", ".clickable", function(event) {
            if (event.which !== 1) {
                return;
            }

            let profileSelector = getProfileSelector();
            if (profileSelector.isOn()) {
                profileSelector.off();
                return;
            }
            percentageLabel = !percentageLabel;
            $(this).tooltip("hide");
            buildGroupGraphs(statsCol, false, false);
        });

        $groupbySection.on("mousedown", ".arrow", function(event) {
            if (event.which !== 1) {
                return;
            }

            let isLeft: boolean = $(this).hasClass("left-arrow");
            clickArrowEvent(isLeft);
            return false;
        });

        $("#profile-chart").on("mousedown", function(event) {
            if (event.which !== 1 || _isBarChart) {
                return;
            }
            let profileSelector = getProfileSelector();
            profileSelector.select({
                "chartBuilder": chartBuilder,
                "x": event.pageX,
                "y": event.pageY
            });
        });

        // event on sort section
        let $sortSection = $modal.find(".sortSection");
        xcUIHelper.optionButtonEvent($sortSection, function(option) {
            if (option === "asc") {
                sortData(sortMap.asc, statsCol);
            } else if (option === "desc") {
                sortData(sortMap.desc, statsCol);
            } else if (option === "ztoa") {
                sortData(sortMap.ztoa, statsCol);
            } else {
                sortData(sortMap.origin, statsCol);
            }
        });

        let skipInputTimer;
        $skipInput.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                let $input: JQuery = $(this);
                let num: number = Number($input.val());
                let totalRows = getTotalRowNums();

                if (!isNaN(num)) {
                    clearTimeout(skipInputTimer);
                    skipInputTimer = setTimeout(function() {
                        num = Math.min(num, totalRows);
                        num = Math.max(num, 1);
                        positionScrollBar(null, num, false)
                        .then(function(finalRowNum) {
                            highlightBar(finalRowNum);
                        });
                    }, 100);
                } else {
                    // when input is invalid
                    $input.val($input.data("rowNum"));
                }
                $input.blur();
            }
        });

        // event on displayInput
        $modal.find(".displayInput").on("click", ".action", function() {
            let diff: number = 10;
            let newRowsToFetch: number;

            if ($(this).hasClass("more")) {
                // 52 should return 60, 50 should reutrn 60
                newRowsToFetch = (Math.floor(numRowsToFetch / diff) + 1) * diff;
            } else {
                // 52 should return 50, 50 should return 40
                newRowsToFetch = (Math.ceil(numRowsToFetch / diff) - 1) * diff;
            }

            updateRowsToFetch(newRowsToFetch);
        });

        // event on decimalInput
        let $decimalInput = $modal.find(".decimalInput");
        $decimalInput.on("click", ".action", function() {
            if ($(this).hasClass("more")) {
                decimalNum++;
            } else {
                decimalNum--;
            }

            updateDecimalInput(decimalNum, false);
        });

        $decimalInput.on("keydown", "input", function(event) {
            if (event.which === keyCode.Enter) {
                let $input: JQuery = $(this);
                let val: string = $input.val();
                if (val === "") {
                    decimalNum = -1;
                } else {
                    let val_num: number = Number(val);
                    if (val_num < 0 ||
                        val_num > decimalLimit ||
                        !Number.isInteger(val_num
                    )) {
                        var err = xcStringHelper.replaceMsg(ErrWRepTStr.IntInRange, {
                            "lowerBound": 0,
                            "upperBound": decimalLimit
                        });
                        StatusBox.show(err, $input, true);
                        return;
                    } else {
                        decimalNum = val_num;
                    }
                }
                updateDecimalInput(decimalNum, false);
            }
        });

        $("#profile-filterOption").on("mousedown", ".option", function(event) {
            if (event.which !== 1) {
                return;
            }
            event.stopPropagation();
            let $option: JQuery = $(this);
            if ($option.hasClass("filter")) {
                filterSelectedValues(FltOp.Filter);
            } else if ($option.hasClass("exclude")) {
                filterSelectedValues(FltOp.Exclude);
            } else {
                clearProfileSelector(false);
            }
        });

        $("#profile-download").click(function() {
            let $btn: JQuery = $(this);
            xcUIHelper.disableSubmit($btn);
            downloadProfileAsPNG()
            .always(function() {
                xcUIHelper.enableSubmit($btn);
            });
        });

        new MenuHelper($modal.find(".xAxisList"), {
            "onOpen": () => {
                let table: TableMeta = gTables[curTableId];
                let progCols = table.getAllCols(true);
                let html = "";
                for (let i = 0; i < progCols.length; i++) {
                    html += "<li>" + xcStringHelper.escapeHTMLSpecialChar(
                                    progCols[i].getBackColName()) + "</li>";

                }
                $modal.find(".xAxisList ul").html(html);
            },
            "onSelect": ($li) => {
                let val = $li.text();
                $modal.find(".xAxisValue").val(val);
                buildGroupGraphs(statsCol, false, false);
            },
            bottomPadding: 5,
            fixedPosition: {
                selector: "input"
            }
        }).setupListeners();

        setupRangeSection();
        setupStatsSection();
    }

    function setupRangeSection(): void {
        //set up dropdown for worksheet list
        new MenuHelper($rangeSection.find(".dropDownList"), {
            "onSelect": function($li: JQuery) {
                let oldRange: string = $rangeSection.find(".dropDownList input").val();
                if ($li.text() === oldRange) {
                    return;
                }
                let option: string = $li.attr("name");
                toggleRange(option, false);
            },
            "container": "#profileModal",
            "bounds": "#profileModal"
        }).setupListeners();

        $rangeInput.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                let val: number = Number($rangeInput.val());
                let rangeOption = getRangeOption();
                // Note that because the input type is number,
                // any no-numeric string in the input will get ""
                // when do $rangeInput.val()
                let isValid: boolean = xcHelper.validate([
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyPositiveNumber
                    },
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyPositiveNumber,
                        "check": function() {
                            return (Number(val) <= 0);
                        }
                    },
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyInt,
                        "check": function() {
                            return (rangeOption !== "range" &&
                                    !Number.isInteger(val));
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }
                let bucketSize = (rangeOption === "range")
                                 ? val
                                 : -val;
                bucketData(bucketSize, statsCol, false);
                cacheBucket(bucketSize);
            }
        });
    }

    function restoreOldBucket(): void {
        if (bucketCache[curTableId] != null &&
            bucketCache[curTableId][curColNum] != null
        ) {
            let oldBucket = bucketCache[curTableId][curColNum];
            $rangeInput.val(oldBucket);
        }
    }

    function cacheBucket(bucket): void {
        bucketCache[curTableId] = bucketCache[curTableId] || {};
        bucketCache[curTableId][curColNum] = bucket;
    }

    function setupStatsSection(): void {
        let $statsSection: JQuery = $("#profile-stats");
        $statsSection.on("click", ".popBar", function() {
            if ($modal.hasClass("collapse")) {
                // when collapse
                $modal.removeClass("collapse");
                $statsSection.width(getMinStatsPanelWidth());
            } else {
                // expand
                $statsSection.css("width", "");
                $modal.find(".modalLeft").css("width", "");
                $modal.addClass("collapse");
            }
            resizeChart();
        });

        // do agg
        $statsSection.on("click", ".genAgg", function() {
            let $btn: JQuery = $(this);
            $btn.addClass("xc-disabled");
            generateAggs()
            .always(function() {
                $btn.removeClass("xc-disabled");
            });
        });

        // do stats
        $statsSection.on("click", ".genStats", function() {
            genStats(true);
        });

        // do correlation
        $("#profile-corr").click(function() {
            let tableId: TableId = curTableId;
            let colNum: number = curColNum;
            let tmp: boolean = gMinModeOn;
            // use gMinMode to aviod blink in open/close modal
            gMinModeOn = true;
            closeProfileModal();
            AggModal.Instance.corrAgg(tableId, null, [colNum], colNum);
            gMinModeOn = tmp;
        });

        $statsSection.resizable({
            handles: "w",
            minWidth: getMinStatsPanelWidth(),
            containment: "#profileModal",
            resize: function(_event, ui) {
                let width: number = Math.min(ui.size.width, getMaxStatsPanelWidth());
                adjustStatsPanelWidth(width);
            }
        });
    }

    function getMaxStatsPanelWidth(): number {
        // left part need 555px at least
        return ($modal.width() - 555);
    }

    function getMinStatsPanelWidth(): number {
        return parseFloat($("#profile-stats").css("minWidth"));
    }

    function adjustStatsPanelWidth(width: number): void {
        $("#profile-stats").outerWidth(width)
                           .css("left", "");
        $modal.find(".modalLeft").outerWidth($modal.outerWidth() - width);
        resizeChart();
    }

    function closeProfileModal(): void {
        modalHelper.clear();
        $modal.find(".groupbyChart").empty();
        clearProfileEngine();

        curTableId = null;
        curColNum = null;
        groupByData = [];
        bucketNum = 0;
        order = sortMap.origin;
        statsCol = null;
        percentageLabel = false;
        $modal.removeData("id");
        toggleRange("single", true); // reset the range

        $modal.find(".min-range .text").off();
        $("#modalBackground").off("mouseover.profileModal");
        // turn off scroll bar event
        $modal.find(".scrollBar").off();
        $(document).off(".profileModal");

        numRowsToFetch = defaultRowsToFetch;
        clearProfileSelector(true);
        resetRowsInfo();
        resetDecimalInput();
        if (_isBarChart) {
            $modal.removeClass("isBarChart");
            statsInfos = baseStatsInfos;
        }
    }

    function generateProfile(table: TableMeta): XDPromise<void> {
        let promises: XDPromise<void>[] = [];
        let curStatsCol: ProfileInfo = statsCol;

        checkAgg(curStatsCol);
        promises.push(genStats(false));

        // do group by
        if (_isBarChart) {
            promises.push(runGroupby(table, curStatsCol, bucketNum));
        } else if (curStatsCol.groupByInfo.isComplete === true) {
            // check if the groupbyTable is not deleted
            // use XcalarGetTables because XcalarSetAbsolute cannot
            // return fail if resultSetId is not free
            let innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let groupbyTable = curStatsCol.groupByInfo.buckets[bucketNum].table;
            let profileEngine = getProfileEngine();
            profileEngine.checkProfileTable(groupbyTable)
            .then((exist) => {
                if (exist) {
                    refreshGroupbyInfo(curStatsCol, false);
                    innerDeferred.resolve();
                } else {
                    curStatsCol.groupByInfo.isComplete = false;
                    curStatsCol.groupByInfo.buckets[bucketNum] = <any>{};

                    runGroupby(table, curStatsCol, bucketNum)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                }
            })
            .fail((error) => {
                failureHandler(curStatsCol, error);
                innerDeferred.reject(error);
            });

            promises.push(innerDeferred.promise());
        } else if (curStatsCol.groupByInfo.isComplete !== "running") {
            promises.push(runGroupby(table, curStatsCol, bucketNum));
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...promises)
        .then(() => {
            deferred.resolve();
        })
        .fail((args) => {
            let error;
            for (let t = 0; t < args.length; t++) {
                error = error || args[t];
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function showProfile(): void {
        $modal.removeClass("type-number")
              .removeClass("type-boolean")
              .removeClass("type-string");

        if (isTypeNumber(statsCol.type)) {
            $modal.addClass("type-number");
        } else if (isTypeBoolean(statsCol.type)) {
            $modal.addClass("type-boolean");
        } else if (isTypeString(statsCol.type)) {
            $modal.addClass("type-string");
        }

        // hide scroll bar first
        $modal.addClass("noScrollBar");
        $modal.data("id", statsCol.getId());

        modalHelper.setup();

        resetDecimalInput();
        refreshProfile();
        setupScrollBar();
        $("#modalBackground").on("mouseover.profileModal", function() {
            resetTooltip(null, null);
        });
        if (_isBarChart) {
            $modal.addClass("isBarChart");
        } else {
            $modal.removeClass("isBarChart");
        }
    }

    // refresh profile
    function refreshProfile(): void {
        refreshInstrText();
        refreshAggInfo(aggKeys, statsCol, true);
        refreshStatsInfo(statsCol, false);
        resetGroupbySection(false);
        restoreOldBucket();
    }

    function refreshInstrText() {
        let instr;
        if (_isBarChart) {
            instr = xcStringHelper.replaceMsg(ProfileTStr.ChartInfo, {
                "col": xcStringHelper.escapeHTMLSpecialChar(statsCol.frontColName),
                "type": statsCol.type
            });
        } else {
            instr = xcStringHelper.replaceMsg(ProfileTStr.Info, {
                "col": xcStringHelper.escapeHTMLSpecialChar(statsCol.frontColName),
                "type": statsCol.type
            });
        }

        // update instruction
        if (statsCol.groupByInfo.isComplete === true) {
            instr += " " + ProfileTStr.Instr;
        } else {

            instr += " " + ProfileTStr.LoadInstr;
        }

        $modal.find(".subHeader").html(instr);
        $modal.find(".yAxisName").text(statsCol.frontColName);
    }

    function resetGroupbySection(resetRefresh: boolean): void {
        $modal.addClass("loading");

        let $loadHiddens = $modal.find(".loadHidden");
        let $loadDisables = $modal.find(".loadDisabled");
        let $errorSection = $modal.find(".errorSection");

        if (resetRefresh) {
            $loadHiddens.addClass("disabled");
        } else {
            $loadHiddens.addClass("hidden");
        }

        $modal.removeClass("allNull");
        $loadDisables.addClass("disabled");
        $errorSection.addClass("hidden").find(".text").text("");
    }

    function refreshGroupbyInfo(
        curStatsCol: ProfileInfo,
        resetRefresh: boolean
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $loadHiddens = $modal.find(".loadHidden");
        let $loadDisables = $modal.find(".loadDisabled");

        // This function never deferred.reject
        resetGroupbySection(resetRefresh);

        // update groupby info
        if (curStatsCol.groupByInfo.isComplete === true) {
            // data is ready
            groupByData = [];

            if (curStatsCol.groupByInfo.allNull) {
                $modal.addClass("allNull");
            }

            let tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
            let tableName: string;

            if (order === sortMap.asc) {
                tableName = tableInfo.ascTable;
            } else if (order === sortMap.desc) {
                tableName = tableInfo.descTable;
            } else if (order === sortMap.ztoa) {
                tableName = tableInfo.ztoaTable;
            } else {
                tableName = tableInfo.table;
            }
            let profileEngine = getProfileEngine();
            profileEngine.setProfileTable(tableName, numRowsToFetch)
            .then((data) => {
                $modal.removeClass("loading");
                $loadHiddens.removeClass("hidden").removeClass("disabled");
                $loadDisables.removeClass("disabled");

                resetGroupbyInfo();

                groupByData = addNullValue(curStatsCol, data);
                buildGroupGraphs(curStatsCol, true, false);
                setArrows(1, false);
                deferred.resolve();
            })
            .fail((error) => {
                failureHandler(curStatsCol, error);
                // Since we have already cleaned up here, we no longer need our
                // caller to clean up for us. So we can resolve here
                deferred.resolve();
            });
        } else {
            // the data is loading, show loadingSection and hide groupby section
            deferred.resolve();
        }

        return deferred.promise();
    }

    function refreshAggInfo(
        aggKeysToRefesh: string | string[],
        curStatsCol: ProfileInfo,
        isStartUp: boolean
    ): void {
        // update agg info
        var $infoSection = $("#profile-stats");
        if (!(aggKeysToRefesh instanceof Array)) {
            aggKeysToRefesh = [aggKeysToRefesh];
        }

        aggKeysToRefesh.forEach(function(aggkey) {
            var aggVal = curStatsCol.aggInfo[aggkey];
            var $agg = $infoSection.find("." + aggkey);

            if (aggVal == null && !isStartUp) {
                // when aggregate is still running
                $agg.html("...")
                      .addClass("animatedEllipsis");
                xcTooltip.changeText($agg, "...");
            } else {
                var text = (aggVal != null) ? xcStringHelper.numToStr(aggVal) : "N/A";
                $agg.removeClass("animatedEllipsis")
                      .text(text);
                xcTooltip.changeText($agg, text);
            }
        });

        // update the section
        let notRunAgg: boolean = false;
        aggKeys.forEach(function(aggkey) {
            if (aggkey !== "count" && curStatsCol.aggInfo[aggkey] == null) {
                notRunAgg = true;
                return false; // end loop
            }
        });

        let $section = $("#profile-stats").find(".aggInfo");
        if (isStartUp) {
            $section.find(".genAgg").removeClass("xc-disabled");
        }

        if (notRunAgg) {
            $section.removeClass("hasAgg");
        } else {
            $section.addClass("hasAgg");
        }
    }

    function refreshStatsInfo(
        curStatsCol: ProfileInfo,
        forceShow: boolean
    ): void {
        // update stats info
        let $infoSection = $("#profile-stats");
        let $statsInfo = $infoSection.find(".statsInfo");

        if (curStatsCol.statsInfo.unsorted && !forceShow) {
            $statsInfo.removeClass("hasStats");
        } else {
            $statsInfo.addClass("hasStats");

            for (let key in statsKeyMap) {
                let statsKey = statsKeyMap[key];
                let statsVal = curStatsCol.statsInfo[statsKey];
                let $stats = $infoSection.find("." + statsKey);

                if (statsVal == null) {
                    // when stats is still running
                    $stats.html("...")
                          .addClass("animatedEllipsis");
                    xcTooltip.changeText($stats, "...");
                } else {
                    let text = xcStringHelper.numToStr(statsVal);
                    $stats.removeClass("animatedEllipsis")
                          .text(text);
                    xcTooltip.changeText($stats, text);
                }
            }
        }
    }

    function checkAgg(curStatsCol: ProfileInfo): void {
        var isStr = isTypeString(curStatsCol.type);
        aggKeys.forEach(function(aggkey) {
            if (aggkey === "count") {
                if (curStatsCol.aggInfo[aggkey] == null &&
                    gTables.hasOwnProperty(curTableId) &&
                    gTables[curTableId].resultSetCount != null) {
                    var count = gTables[curTableId].resultSetCount;
                    curStatsCol.aggInfo[aggkey] = count;
                    refreshAggInfo(aggkey, curStatsCol, false);
                }
            } else if (isStr) {
                curStatsCol.aggInfo[aggkey] = "--";
                refreshAggInfo(aggkey, curStatsCol, false);
            }
        });
    }

    function generateAggs(): XDPromise<void> {
        // show ellipsis as progressing
        refreshAggInfo(aggKeys, statsCol, false);
        let tableName: string = gTables[curTableId].getName();
        let profileEngine = getProfileEngine();
        return profileEngine.genAggs(tableName, aggKeys, statsCol);
    }

    function genStats(sort: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let curStatsCol: ProfileInfo = statsCol;
        let table: TableMeta = gTables[curTableId];
        let tableName: string = table.getName();

        if (sort) {
            // when trigger from button
            refreshStatsInfo(curStatsCol, true);
        }
        var profileEngine = getProfileEngine();
        profileEngine.genStats(tableName, curStatsCol, sort)
        .then(() => {
            if (isModalVisible(curStatsCol)) {
                refreshStatsInfo(curStatsCol, false);
            }
            deferred.resolve();
        })
        .fail((error) => {
            if (isModalVisible(curStatsCol)) {
                xcUIHelper.showFail(FailTStr.ProfileStats);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function runGroupby(
        table: TableMeta,
        curStatsCol: ProfileInfo,
        curBucketNum: number
    ): XDPromise<void> {
        if (curBucketNum !== 0) {
            return PromiseHelper.reject("Invalid bucket num");
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let profileEngine = getProfileEngine();
        let promise;
        if (_isBarChart) {
            promise = profileEngine.genBarChartInfo(curStatsCol, table);
        } else {
            promise = profileEngine.genProfile(curStatsCol, table);
        }
        promise
        .then(() => {
            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                return refreshGroupbyInfo(curStatsCol, false);
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function addNullValue(
        curStatsCol: ProfileInfo,
        data: any[]
    ): any[] {
        // add col info for null value
        let nullCount: number = curStatsCol.groupByInfo.nullCount || 0;
        if (nullCount === 0) {
            return data;
        }

        let nullData = {
            "rowNum": 0,
            "type": "nullVal"
        };
        let colName = curStatsCol.groupByInfo.buckets[bucketNum].colName;
        nullData[colName] = "FNF";

        if (bucketNum === 0) {
            nullData[statsColName] = nullCount;
        } else {
            nullData[bucketColName] = nullCount;
        }

        data.unshift(nullData);
        return data;
    }

    function buildGroupGraphs(
        curStatsCol: ProfileInfo,
        initial: boolean,
        resize: boolean
    ): void {
        if (!isModalVisible(curStatsCol)) {
            return;
        }

        let tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
        let resizeDelay: number = null;
        if (resize) {
            resizeDelay = 60 / defaultRowsToFetch * numRowsToFetch;
        }

        let xName;
        let yName;
        if (_isBarChart) {
            yName = tableInfo.colName;
            xName = $modal.find(".xAxisValue").val() || "rowNum";
            let hasXName = false;
            let max = 0;
            groupByData.forEach((data) => {
                let val = data[yName];
                if (!isNaN(val)) {
                    max = Math.max(parseFloat(val), max);
                }
                if (data.hasOwnProperty(xName)) {
                    hasXName = true;
                }
            });
            if (!hasXName) {
                xName = "rowNum";
                $modal.find(".xAxisValue").val("");
            }
            tableInfo.max = max;
        } else {
            xName = tableInfo.colName;
            yName = getYName();
        }

        chartBuilder = ProfileChart.get(chartType, {
            "data": groupByData,
            "bucketSize": bucketNum,
            "xName": xName,
            "yName": yName,
            "sorted": (order !== sortMap.origin),
            "nullCount": curStatsCol.groupByInfo.nullCount,
            "max": tableInfo.max,
            "sum": tableInfo.sum,
            "percentage": percentageLabel,
            "decimal": decimalNum,
            "initial": initial,
            "resize": resize,
            "resizeDelay": resizeDelay,
            "isBarChart": _isBarChart
        });
        chartBuilder.build();
    }

    function getYName(): string {
        let noBucket = (bucketNum === 0) ? 1 : 0;
        return noBucket ? statsColName : bucketColName;
    }

    function getChart(): d3 {
        return d3.select("#profile-chart .groupbyChart");
    }

    function resizeChart(): void {
        if (statsCol.groupByInfo &&
            statsCol.groupByInfo.isComplete === true
        ) {
            buildGroupGraphs(statsCol, null, true);
            let $scroller: JQuery = $modal.find(".scrollSection .scroller");
            resizeScroller();
            let curRowNum: number = Number($skipInput.val());
            // if not add scolling class,
            // will have a transition to cause a lag
            $scroller.addClass("scrolling");
            positionScrollBar(null, curRowNum, false);
            // without setTimout will still have lag
            setTimeout(() => {
                $scroller.removeClass("scrolling");
            }, 1);
        }
    }

    function resetScrollBar(updateRowInfo: boolean): void {
        let totalRows = getTotalRowNums();
        if (totalRows <= numRowsToFetch) {
            $modal.addClass("noScrollBar");
        } else {
            $modal.removeClass("noScrollBar");
        }

        if (!updateRowInfo) {
            $modal.find(".scroller").css("left", 0);
        }

        resizeScroller();
    }

    function resizeScroller(): void {
        let $section = $modal.find(".scrollSection");
        let $scrollBar = $section.find(".scrollBar");
        let $scroller = $scrollBar.find(".scroller");
        let totalRows = getTotalRowNums();

        // the caculation is based on: if totalRows === numRowsToFetch,
        // then scrollerWidth == scrollBarWidth
        let scrollBarWidth: number = $scrollBar.width();
        let scrollerWidth: number = Math.floor(scrollBarWidth * numRowsToFetch / totalRows);
        scrollerWidth = Math.min(scrollerWidth, scrollBarWidth);
        scrollerWidth = Math.min(scrollBarWidth - 10, scrollerWidth);
        scrollerWidth = Math.max(25, scrollerWidth);
        $scroller.width(scrollerWidth);
    }

    function setupScrollBar(): void {
        let $section = $modal.find(".scrollSection");
        let $scrollerArea = $section.find(".rowScrollArea");
        // move scroll bar event, setup it here since we need statsCol info
        let $scrollerBar = $scrollerArea.find(".scrollBar");
        let $scroller = $scrollerArea.find(".scroller");
        let isDragging: boolean = false;
        let xDiff: number = 0;

        // this use mousedown and mouseup to mimic click
        $scrollerBar.on("mousedown", function() {
            isDragging = true;
            xDiff = 0;
        });

        // mimic move of scroller
        $scrollerBar.on("mousedown", ".scroller", function(event) {
            event.stopPropagation();
            isDragging = true;
            $scroller.addClass("scrolling");
            $modal.addClass("dragging");
            // use xDiff to get the position of the most left of scroller
            xDiff = event.pageX - $scroller.offset().left;
        });

        $(document).on({
            "mouseup.profileModal": function(event) {
                if (isDragging === true) {
                    $scroller.removeClass("scrolling");
                    let mouseX = event.pageX - $scrollerBar.offset().left - xDiff;
                    let rowPercent = mouseX / $scrollerBar.width();
                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));

                    if (xDiff !== 0) {
                        let totalRows = getTotalRowNums();
                        // when it's dragging the scroller,
                        // not clicking on scrollbar
                        let scrollerRight = $scroller.offset().left +
                                            $scroller.width();
                        let scrollBarRight = $scrollerBar.offset().left +
                                             $scrollerBar.width();
                        if (scrollerRight >= scrollBarRight) {
                            rowPercent = 1 - numRowsToFetch / totalRows;
                        }
                    }

                    positionScrollBar(rowPercent, null, false);
                    $modal.removeClass("dragging");
                }
                isDragging = false;
            },
            "mousemove.profileModal": function(event) {
                if (isDragging) {
                    let mouseX = event.pageX - $scrollerBar.offset().left - xDiff;
                    let rowPercent = mouseX / $scrollerBar.width();
                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));
                    let left = getPosition(rowPercent);
                    $scroller.css("left", left);
                }
            }
        });
    }

    function getPosition(percent: number): string {
        percent = Math.min(99.9, Math.max(0, percent * 100)) / 100;

        let $section = $modal.find(".scrollSection");
        let $scrollBar = $section.find(".scrollBar");
        let $scroller = $scrollBar.find(".scroller");

        let barWidth: number = $scrollBar.width();
        let position: number = barWidth * percent;

        position = Math.max(0, position);
        position = Math.min(position, barWidth - $scroller.width());

        return (position + "px");
    }

    function positionScrollBar(
        rowPercent: number,
        rowNum: number,
        forceUpdate: boolean
    ): XDPromise<number> {
        let deferred: XDDeferred<number> = PromiseHelper.deferred();
        let isFromInput: boolean = false;
        let $section: JQuery = $modal.find(".scrollSection");
        let $scrollBar: JQuery = $section.find(".scrollBar");
        let $scroller: JQuery = $scrollBar.find(".scroller");
        let totalRows: number = getTotalRowNums();

        if (rowNum != null) {
            isFromInput = true;
            rowPercent = (totalRows === 1) ? 0 : (rowNum - 1) / (totalRows - 1);
        } else {
            rowNum = Math.ceil(rowPercent * (totalRows - 1)) + 1;
        }

        let tempRowNum: number = rowNum;

        if ($skipInput.data("rowNum") === rowNum) {
            // case of going to same row
            // put the row scoller in right place
            $skipInput.val(rowNum);
            let left: string = getPosition(rowPercent);
            $scroller.css("left", left);

            if (!forceUpdate) {
                return PromiseHelper.resolve(rowNum);
            }
        }

        let rowsToFetch: number = totalRows - rowNum + 1;
        if (rowsToFetch < numRowsToFetch) {
            if (numRowsToFetch < totalRows) {
                // when can fetch numRowsToFetch
                rowNum = totalRows - numRowsToFetch + 1;
                rowsToFetch = numRowsToFetch;
            } else {
                // when can only fetch totalRows
                rowNum = 1;
                rowsToFetch = totalRows;
            }

            let oldLeft: string = getPosition(rowPercent);
            if (isFromInput) {
                rowPercent = (totalRows === 1) ?
                                            0 : (rowNum - 1) / (totalRows - 1);

                let left: string = getPosition(rowPercent);
                $scroller.addClass("scrolling")
                    .css("left", oldLeft);

                // use setTimout to have the animation
                setTimeout(function() {
                    $scroller.removeClass("scrolling")
                        .css("left", left);
                }, 1);
            } else {
                $scroller.css("left", oldLeft);
            }
        } else {
            let left: string = getPosition(rowPercent);
            $scroller.css("left", left);

            rowsToFetch = numRowsToFetch;
        }

        $skipInput.val(tempRowNum).data("rowNum", tempRowNum);

        // disable another fetching data event till this one done
        $section.addClass("disabled");

        let loadTimer = setTimeout(function() {
            // if the loading time is long, show the waiting icon
            $modal.addClass("loading");
        }, 500);

        let rowPosition: number = rowNum - 1;
        setArrows(null, true);

        let curStatsCol: ProfileInfo = statsCol;
        let profileEngine = getProfileEngine();
        profileEngine.fetchProfileData(rowPosition, rowsToFetch)
        .then((data) => {
            clearProfileSelector(false);

            groupByData = addNullValue(curStatsCol, data);
            buildGroupGraphs(curStatsCol, forceUpdate, false);
            $modal.removeClass("loading");
            clearTimeout(loadTimer);
            setArrows(tempRowNum, false);
            deferred.resolve(tempRowNum);
        })
        .fail((error) => {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        })
        .always(() => {
            $section.removeClass("disabled");
        });

        return deferred.promise();
    }

    function setArrows(rowNum: number, fetchingData: boolean): void {
        let $groupbySection = $modal.find(".groupbyInfoSection");
        let $leftArrow = $groupbySection.find(".left-arrow");
        let $rightArrow = $groupbySection.find(".right-arrow");

        if (fetchingData) {
            $leftArrow.addClass("disabled");
            $rightArrow.addClass("disabled");
            return;
        }

        $leftArrow.removeClass("disabled");
        $rightArrow.removeClass("disabled");
        let totalRows = getTotalRowNums();
        if (totalRows <= numRowsToFetch) {
            $leftArrow.hide();
            $rightArrow.hide();
        } else if (rowNum <= 1) {
            $leftArrow.hide();
            $rightArrow.show();
        } else if (rowNum > totalRows - numRowsToFetch) {
            $leftArrow.show();
            $rightArrow.hide();
        } else {
            $leftArrow.show();
            $rightArrow.show();
        }
    }

    function clickArrowEvent(isLeft: boolean): void {
        let curRowNum: number = Number($skipInput.val());
        let totalRows = getTotalRowNums();
        if (isLeft) {
            curRowNum -= numRowsToFetch;
        } else {
            curRowNum += numRowsToFetch;
        }

        curRowNum = Math.max(1, curRowNum);
        curRowNum = Math.min(curRowNum, totalRows);

        positionScrollBar(null, curRowNum, false);
    }

    function updateRowsToFetch(newRowsToFetch: number): void {
        newRowsToFetch = Math.max(newRowsToFetch, minRowsToFetch);
        newRowsToFetch = Math.min(newRowsToFetch, maxRowsToFetch);

        numRowsToFetch = newRowsToFetch;

        let curRowNum: number = Number($skipInput.val());
        resetRowsInfo();
        resetScrollBar(true);
        positionScrollBar(null, curRowNum, true);
    }

    function resetGroupbyInfo(): void {
        resetScrollBar(false);
        resetRowInput();
        resetSortInfo();
        clearProfileSelector(false);
        resetRowsInfo();
    }

    function resetRowsInfo(): void {
        let $displayInput: JQuery = $modal.find(".displayInput");
        let $activeRange: JQuery = $rangeSection.find(".radioButton.active");
        let $moreBtn: JQuery = $displayInput.find(".more").removeClass("xc-disabled");
        let $lessBtn: JQuery = $displayInput.find(".less").removeClass("xc-disabled");
        let totalRows: number = getTotalRowNums();
        let rowsToShow: number;

        if ($activeRange.data("option") === "fitAll" ||
            totalRows <= minRowsToFetch
        ) {
            // case that cannot show more or less results
            rowsToShow = totalRows;
            $moreBtn.addClass("xc-disabled");
            $lessBtn.addClass("xc-disabled");
        } else {
            numRowsToFetch = Math.min(numRowsToFetch, totalRows);

            if (numRowsToFetch <= minRowsToFetch) {
                $lessBtn.addClass("xc-disabled");
            }

            if (numRowsToFetch >= maxRowsToFetch ||
                numRowsToFetch >= totalRows
            ) {
                $moreBtn.addClass("xc-disabled");
            }

            rowsToShow = numRowsToFetch;
        }

        $displayInput.find(".numRows").val(rowsToShow);
    }

    function resetDecimalInput(): void {
        decimalNum = -1;
        updateDecimalInput(decimalNum, true);
    }

    function updateDecimalInput(decimal: number, isReset: boolean): void {
        let $decimalInput = $modal.find(".decimalInput");
        let $moreBtn = $decimalInput.find(".more").removeClass("xc-disabled");
        let $lessBtn = $decimalInput.find(".less").removeClass("xc-disabled");
        let $input = $decimalInput.find("input");

        if (decimal < 0) {
            $lessBtn.addClass("xc-disabled");
            $input.val("");
        } else {
            $input.val(decimal);
            if (decimal >= decimalLimit) {
                $moreBtn.addClass("xc-disabled");
            }
        }

        if (!isReset) {
            buildGroupGraphs(statsCol, false, false);
        }
    }

    function resetRowInput(): void {
        // total row might be 0 in error case
        let totalRows: number = getTotalRowNums();
        let rowNum: number = (totalRows <= 0) ? 0 : 1;
        $skipInput.val(rowNum).data("rowNum", rowNum);
        let $maxRange = $skipInput.siblings(".max-range");

        // set width of elements
        $maxRange.text(xcStringHelper.numToStr(totalRows));
        $skipInput.width($maxRange.width() + 5); // 5 is for input padding
    }

    function resetSortInfo(): void {
        let $sortSection: JQuery = $modal.find(".sortSection");
        let $activeSort: JQuery = $sortSection.find(".active");
        $activeSort.removeClass("active");

        $sortSection.find("." + order).addClass("active");
    }

    function sortData(newOrder: string, curStatsCol: ProfileInfo): void {
        if (order === newOrder) {
            return;
        }

        $modal.attr("data-state", "pending");

        let refreshTimer = setTimeout(() => {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshGroupbyInfo(curStatsCol, true);
            }
        }, 500);
        let profileEngine = getProfileEngine();
        profileEngine.sort(newOrder, bucketNum, curStatsCol)
        .then(() => {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            if (!isModalVisible(curStatsCol)) {
                return PromiseHelper.reject("old data");
            }

            order = newOrder;
            return refreshGroupbyInfo(curStatsCol, true);
        })
        .then(() => {
            $modal.attr("data-state", "finished");
        })
        .fail((error) => {
            clearTimeout(refreshTimer);
            failureHandler(curStatsCol, error);
        });
    }

    function getRangeOption(): string {
        let $rangeOption = $rangeSection.find(".dropDownList input");
        let rangeOption = ($rangeOption.val().toLowerCase() === "range")
                          ? "range"
                          : "rangeLog";
        return rangeOption;
    }

    function toggleRange(rangeOption: string, reset: boolean): void {
        let $dropdown = $rangeSection.find(".dropDownList");
        let $li = $dropdown.find('li[name="' + rangeOption + '"]');
        $dropdown.find("input").val($li.text());
        $rangeInput.addClass("xc-disabled");

        if (reset) {
            $rangeInput.val("");
            return;
        }

        let bucketSize: number;
        let isFitAll: boolean = false;
        let input: number = Number($rangeInput.val());

        switch (rangeOption) {
            case "range":
                // go to range
                bucketSize = input;
                $rangeInput.removeClass("xc-disabled");
                break;
            case "rangeLog":
                // Note: as it's hard to explain what't range size in log
                // now only allow size to be 1
                $rangeInput.addClass("xc-disabled");
                bucketSize = -1;
                break;
            case "fitAll":
                // fit all
                // it need async all, will get it in bucketData
                bucketSize = null;
                isFitAll = true;
                break;
            case "single":
                // go to single
                var curBucketNum = Number($rangeInput.val());
                if (isNaN(curBucketNum) || curBucketNum <= 0) {
                    // for invalid case or original case(bucketNum = 0)
                    // clear input
                    $rangeInput.val("");
                }
                bucketSize = 0;
                break;
            default:
                console.error("Error Case");
                return;
        }
        bucketData(bucketSize, statsCol, isFitAll);
        if (!$rangeInput.hasClass("xc-disabled")) {
            $rangeInput.focus();
        }
    }

    // UDF for log scale bucketing
    function bucketData(
        newBucketNum: number,
        curStatsCol: ProfileInfo,
        fitAll: boolean
    ): void {
        if (newBucketNum === bucketNum) {
            return;
        }

        $modal.attr("data-state", "pending");
        let refreshTimer = setTimeout(() => {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshGroupbyInfo(curStatsCol, true);
            }
        }, 500);

        let tableName = gTables[curTableId].getName();
        let profileEngine = getProfileEngine();
        profileEngine.bucket(newBucketNum, tableName, curStatsCol, fitAll)
        .then((bucketSize) => {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            bucketNum = bucketSize;

            if (!isModalVisible(curStatsCol)) {
                return PromiseHelper.reject("old data");
            }

            order = sortMap.origin; // reset to normal order
            return refreshGroupbyInfo(curStatsCol, true);
        })
        .then(() => {
            $modal.attr("data-state", "finished");
        })
        .fail((error) => {
            clearTimeout(refreshTimer);
            failureHandler(curStatsCol, error);
        });
    }

    function highlightBar(rowNum: number): void {
        if (rowNum == null) {
            rowNum = Number($skipInput.val());
        }
        if (rowNum < 1) {
            // 0 is nullVal, < 0 is invalid value
            return;
        }

        let chart = getChart();
        chart.selectAll(".area")
        .each(function(d) {
            let bar = d3.select(this);
            if (d.rowNum === rowNum) {
                bar.classed("highlight", true);
            } else {
                bar.classed("highlight", false);
            }
        });
    }

    function isBarChart(): boolean {
        return (chartType === "bar");
    }

    function resetTooltip(area, rowToHover): void {
        if (rowToHover != null) {
            rowToHover = Number(rowToHover);
        }

        $modal.find(".groupbyInfoSection .area").tooltip("hide");

        var chart = getChart();

        chart.selectAll(".area")
        .each(function(d) {
            var ele = d3.select(this);
            if (rowToHover != null && d.rowNum === rowToHover) {
                ele.classed("hover", true);
            } else {
                ele.classed("hover", false);
            }
        });

        if (area != null) {
            $(area).tooltip("show");
        }
    }

    function filterSelectedValues(operator: FltOp): void {
        // in case close modal clear curTableId
        let profileSelector = getProfileSelector();
        let options = profileSelector.filter(operator, statsCol);
        if (options != null && options.filterString) {
            closeProfileModal();
            let cellMenu = TableMenuManager.Instance.getCellMenu();
            cellMenu.filter(options.filterString);
        }
    }

    function isTypeNumber(type: string): boolean {
        // boolean is also a num in backend
        return (type === ColumnType.integer || type === ColumnType.float);
    }

    function isTypeBoolean(type: string): boolean {
        return (type === ColumnType.boolean);
    }

    function isTypeString(type: string): boolean {
        return (type === ColumnType.string);
    }

    function isModalVisible(curStatsCol: ProfileInfo): boolean {
        return ($modal.is(":visible") &&
                curStatsCol != null &&
                $modal.data("id") === curStatsCol.getId());
    }

    function failureHandler(curStatsCol: ProfileInfo, error: any): void {
        console.error("Profile error", error);
        curStatsCol.groupByInfo.isComplete = false;
        if (isModalVisible(curStatsCol)) {
            if (error && typeof error === "object") {
                error = error.error;
            }

            $modal.attr("data-state", "failed");
            $modal.removeClass("loading");
            $modal.find(".loadHidden").removeClass("hidden")
                                    .removeClass("disabled");
            // keep $modal.find(".loadDisabled") disabled
            $modal.find(".groupbyInfoSection").addClass("hidden");
            $modal.find(".errorSection").removeClass("hidden")
                .find(".text").text(error);

            resetGroupbyInfo();
        }
    }

    function downloadProfileAsPNG(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let node = $modal.get(0);

        domtoimage.toPng(node, {
            "width": $modal.width(),
            "height": $modal.height(),
            "style": {
                "left": 0,
                "top": 0
            }
        })
        .then(function(dataUrl) {
            let download = document.createElement("a");
            download.href = dataUrl;
            download.download = "profile.png";
            download.click();
            xcUIHelper.showSuccess(SuccessTStr.Profile);
            deferred.resolve();
        })
        .catch(function(error) {
            console.error(error);
            xcUIHelper.showFail(FailTStr.Profile);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function getProfileEngine(): ProfileEngine {
        if (_profileEngine == null) {
            _profileEngine = new ProfileEngine({
                "sortMap": sortMap,
                "aggKeys": aggKeys,
                "statsKeyMap": statsKeyMap,
                "statsColName": statsColName,
                "bucketColName": bucketColName,
                "baseTableName": gTables[curTableId] ? gTables[curTableId].getName() : null,
                "isBarChart": _isBarChart
            });
        }
        return _profileEngine;
    }

    function clearProfileEngine(): void {
        _profileEngine.clear();
        _profileEngine = null;
    }

    function getProfileSelector(): ProfileSelector {
        if (_profileSelector == null) {
            _profileSelector = new ProfileSelector("profileModal", "profile-chart");
        }
        return _profileSelector;
    }

    function clearProfileSelector(reset: boolean): void {
        if (_profileSelector != null) {
            _profileSelector.clear();
        }
        if (reset) {
            _profileSelector = null;
        }
    }

    function getTotalRowNums(): number {
        let profileEngine = getProfileEngine();
        return profileEngine.getTableRowNum();
    }

    // Note: this is a workaround solution for ENG-8021
    function checkIsSamplePublishedTable(table: TableMeta): void {
        try {
            const viewer = SQLResultSpace.Instance.getSQLTable().getViewer();
            if (viewer instanceof XcPbTableViewer && viewer.getId() === table.getName()) {
                const pbInfo = PTblManager.Instance.getTableByName(viewer.getPbTableName());
                if (pbInfo && pbInfo.rows > table.resultSetCount) {
                    const msg = xcStringHelper.replaceMsg(SQLTStr.SelectWholeTable, {
                        table: pbInfo.name
                    });
                    Alert.show({
                        title: AlertTStr.Title,
                        msg,
                        isAlert: true
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.getStatsCol = function() {
            return statsCol;
        };
        __testOnly__.addNullValue = addNullValue;
        __testOnly__.profileEngine = _profileEngine
    }
    /* End Of Unit Test Only */
}