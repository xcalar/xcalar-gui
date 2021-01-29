// XXX TODO: make it a instance of ds.js
class DSTable {
    private static lastDSToSample: string; // used to track the last table to samle in async call
    private static _viewer: XcDatasetViewer;

    /**
     * DSTable.setup
     */
    public static setup(): void {
        this._setupSampleTable();
    }

    /**
     * DSTable.showError
     * @param dsId
     * @param error
     * @param isFetchError
     * @param noRetry
     * @param isImportError
     */
    public static showError(
        dsId: string,
        error: string,
        isFetchError: boolean,
        noRetry: boolean,
        isImportError: boolean
    ) {
        this._toggleButtonInDisplay(false);
        let dsObj: DSObj | null = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case
            return;
        }
        this._showTableView(dsId, false);
        this._updateTableInfoDisplay(dsObj, false, false);
        this._setupViewAfterError(error, isFetchError, noRetry, isImportError);
    }

    /**
     * DSTable.show
     * @param dsId
     * @param isLoading
     */
    public static show(dsId: string, isLoading: boolean): XDPromise<void> {
        this._toggleButtonInDisplay(false);
        let dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("No DS");
        }

        let viewer = this._newViewer(dsObj);
        let notLastDSError: string = "not last ds";

        this._showTableView(dsId, isLoading);
        // update date part of the table info first to make UI smooth
        this._updateTableInfoDisplay(dsObj, true, false);

        if (isLoading) {
            this.setupViewBeforeLoading(dsObj);
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let timer;

        if (this._viewer == null ||
            this._viewer.getId() !== viewer.getId()
        ) {
            // when not the case of already focus on this ds and refresh again
            // only when the loading is slow, show load section
            timer = setTimeout(() => {
                this._resetLoading();
            }, 300);
        }
        this.clear();
        this._viewer = viewer;
        this.lastDSToSample = viewer.getId();
        if (dsObj.activated) {
            this._toggleButtonInDisplay(true);
        }

        viewer.render(this._getContainer())
        .then(() => {
            if (this.lastDSToSample !== viewer.getId()) {
                // when network is slow and user trigger another
                // get sample table code will goes here
                return PromiseHelper.reject(notLastDSError);
            }
            clearTimeout(timer);
            this._setupViewAfterLoading(dsObj);
            this.refresh(true);

            deferred.resolve();
        })
        .fail((error) => {
            clearTimeout(timer);
            let noRetry: boolean = false;
            if (error === notLastDSError ||
                this.lastDSToSample !== viewer.getId())
            {
                deferred.reject(error);
                return;
            }

            error = dsObj.getError() || error;
            let errorMsg: string;
            if (typeof error === "object" && error.error != null) {
                errorMsg = error.error;
                if (error.status === StatusT.StatusDatasetAlreadyDeleted) {
                    noRetry = true;
                }
            } else if (error instanceof Error){
                errorMsg = String(error);
            } else if (typeof error === "string") {
                errorMsg = error;
            } else {
                // unhanled type of error;
                errorMsg = ErrTStr.Unknown;
            }

            this._setupViewAfterError(errorMsg, true, noRetry, false);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * DSTable.setupViewBeforeLoading
     * this is called sometimes when we're not focusing on the dataset table
     * but we want to initialize the progress circle, so containerId and dsId
     * may not match in that case
     * @param dsObj
     */
    public static setupViewBeforeLoading(dsObj: DSObj): void {
        let $dsTableContainer = this._getContainer();
        let containerId: string = this._getPreviewDSId();
        if (!dsObj || containerId === dsObj.getId()) {
            this._resetLoading();
        }

        if (dsObj) {
            let txId: number = DS.getGrid(dsObj.getId()).data("txid");
            let $lockIcon: JQuery = $dsTableContainer.find('.lockedTableIcon[data-txid="' + txId + '"]');
            if ($lockIcon.length && containerId === dsObj.getId()) {
                $lockIcon.removeClass("xc-hidden");
                return;
            }
            let withText: boolean = true;
            let progressAreaHtml = xcUIHelper.getLockIconHtml(txId, 0, withText);
            $dsTableContainer.find(".loadSection").append(progressAreaHtml);
            let progressCircle = new ProgressCircle(txId, 0, withText);
            $dsTableContainer.find('.cancelLoad[data-txid="' + txId + '"]')
                            .data("progresscircle", progressCircle);
        }
    }

    public static getViewWrap(): JQuery {
        return this._getTableWrapEl();
    }

    private static _setupViewAfterError(
        error: any,
        isFetchError: boolean,
        noRetry: boolean,
        isImportError: boolean
    ): void {
        error = this._parseError(error);
        // backend might return this: "<string>"
        error = xcStringHelper.escapeHTMLSpecialChar(error);
        var startError = "";
        if (isFetchError) {
            startError = StatusMessageTStr.DSFetchFailed;
        } else if (isImportError) {
            startError = StatusMessageTStr.ImportDSFailed;
        }
        if (startError) {
            startError += ". ";
        }
        error = startError + error;

        this.clear();
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("loading");
        $dsTableContainer.addClass("error");

        let $errorSection = $dsTableContainer.find(".errorSection");
        $errorSection.find(".error").html(error);

        let dsId: string = this._getPreviewDSId();
        let dsObj = DS.getDSObj(dsId);
        if (!noRetry &&
            dsObj != null &&
            isImportError &&
            dsObj.getUser() === XcUser.getCurrentUserName()
        ) {
            $errorSection.find(".suggest").removeClass("xc-hidden");
        } else {
            $errorSection.find(".suggest").addClass("xc-hidden");
        }
    }

    /**
     * DSTable.hide
     */
    public static hide(): void {
        this._getDSTableViewEl().addClass("xc-hidden");
        this.clear();
        DS.unFocus();
        this._getContainer().removeData("id");
    }

    /**
     * DSTable.getId
     */
    public static getId(): string | null {
        let $table = this._getDSTableEl();
        if ($table.is(":visible")) {
            return $table.data("dsid");
        } else {
            // when not visible
            return null;
        }
    }

    /**
     * DSTable.clear
     */
    public static clear(): void {
        if (this._viewer != null) {
            this._viewer.clear();
            this._viewer = null;
        }
    }

    /**
     * DSTable.refresh
     * @param resize
     */
    public static refresh(resize: boolean = false): void {
        // size tableWrapper so borders fit table size
        // As user can maunally resize to have/not have scrollbar
        // we always need the scrollBarpadding
        let $dsTable = this._getDSTableEl();
        let tableHeight = $dsTable.height();
        this._getTableWrapEl().width($dsTable.width());

        if (resize) {
            this.resize();
        }
        const scrollBarPadding: number = 10;
        this._getContainer().height(tableHeight + scrollBarPadding);
    }

    public static resize(): void {
        if (this._viewer != null) {
            this._viewer.resize();
        }
    }

    private static _getContainer(): JQuery {
        return  $("#dsTableContainer");
    }

    private static _getTableWrapEl(): JQuery {
        if (this._viewer) {
            return this._viewer.getView();
        } else {
            return $();
        }
    }

    private static _getDSInfoPathEl(): JQuery {
        return $("#dsInfo-path");
    }

    private static _getDSTableEl(): JQuery {
        return this. _getTableWrapEl().find("table");
    }

    private static _getDSTableViewEl(): JQuery {
        return $("#dsTableView");
    }

    private static _getDSInfoRecordEl(): JQuery {
        return $("#dsInfo-records");
    }

    private static _getDSInfoColEl(): JQuery {
        return $("#dsInfo-cols");
    }

    private static _getDSInfoErrorEl(): JQuery {
        return $("#dsInfo-error");
    }

    private static _getCreateDFEl(): JQuery {
        return $("#createDF");
    }

    private static _getPreviewDSId(): string | null {
        return this._getContainer().data("id");
    }

    private static _toggleButtonInDisplay(enable: boolean) {
        let $btns = this._getCreateDFEl().add($("#showFileListBtn"));
        if (enable) {
            $btns.removeClass("xc-disabled");
        } else {
            $btns.addClass("xc-disabled");
        }
    }

    private static _newViewer(dsObj: DSObj): XcDatasetViewer {
        let viewer = new XcDatasetViewer(dsObj);
        viewer.registerEvents("onResize", ($view) =>  {
            $view.width($view.find("table").width());
        });
        return viewer;
    }

    private static _showTableView(dsId: string, isLoading: boolean): void {
        this._getDSTableViewEl().removeClass("xc-hidden");
        this._getContainer().data("id", dsId);
        DSForm.hide();
        if (isLoading) {
            DataSourceManager.switchStep(DataSourceManager.ImportSteps.Result);
        } else {
            DataSourceManager.switchStep(null);
        }
    }

    private static _resetLoading(): void {
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("error");
        $dsTableContainer.addClass("loading");
        $dsTableContainer.find(".lockedTableIcon").addClass("xc-hidden");
        this._getTableWrapEl().html("");
    }

    private static _setupViewAfterLoading(dsObj: DSObj): void {
        // update info here
        this._updateTableInfoDisplay(dsObj, false, true);
        let $dsTableContainer = this._getContainer();
        $dsTableContainer.removeClass("error");
        $dsTableContainer.removeClass("loading");
    }

    private static _parseError(error: any): string {
        try {
            if (error && typeof error === "object") {
                var errorStr;
                var log = error.log || "";
                var output = error.output ? JSON.stringify(error.output) : "";
                if (error.status === StatusT.StatusUdfExecuteFailed) {
                    errorStr = log;
                } else {
                    errorStr = error.error + " " + log
                }
                errorStr = errorStr + "\n" + output;
                return errorStr;
            } else {
                return xcHelper.parseError(error);
            }
        } catch (e) {
            return xcHelper.parseError(error);
        }
    }

    private static _updateTableInfoDisplay(
        dsObj: DSObj,
        preFetch: boolean,
        postFetch: boolean
    ): void {
        let dsName = dsObj.getName();
        let numEntries = dsObj.getNumEntries();
        let path = dsObj.getPathWithPattern() || CommonTxtTstr.NA;
        let target = dsObj.getTargetName();
        let $dsInfoPath = this._getDSInfoPathEl();
        $dsInfoPath.text(path);

        xcTooltip.changeText($dsInfoPath, target + "\n" + path);
        xcTooltip.enable($dsInfoPath);
        $("#dsInfo-title").text(dsName);
        $("#dsInfo-author").text(dsObj.getUser());
        // there is no fail case
        $("#dsInfo-size").text(dsObj.getDisplaySize());
        $("#dsInfo-date").text(dsObj.getDate());

        this._updateFormatInfo(dsObj);
        var $dsInfoUdf = $("#dsInfo-udf");
        if (dsObj.moduleName && dsObj.moduleName.trim() !== "") {
            var titleJSON = {
                "UDF Module": dsObj.moduleName,
                "UDF Function": dsObj.funcName
            };
            if (dsObj.udfQuery) {
                titleJSON["UDF Query"] = dsObj.udfQuery;
            }
            xcTooltip.add($dsInfoUdf, {title: JSON.stringify(titleJSON)});
            $dsInfoUdf.removeClass("xc-hidden");
        } else {
            xcTooltip.remove($dsInfoUdf);
            $dsInfoUdf.addClass("xc-hidden");
        }
        // XXX TODO tooltip with query
        let numEntriesStr: string;
        if (typeof numEntries === "number") {
            numEntriesStr = xcStringHelper.numToStr(numEntries);
        } else {
            numEntriesStr = CommonTxtTstr.NA;
        }

        let numColumnsStr: string;
        if (dsObj.getColumns() != null) {
            numColumnsStr = xcStringHelper.numToStr(dsObj.getColumns().length);
        } else {
            numColumnsStr = CommonTxtTstr.NA;
        }

        this._getDSInfoColEl().text(numColumnsStr);
        this._getDSInfoRecordEl().text(numEntriesStr);
        if (preFetch || postFetch) {
            this._toggleErrorIcon(dsObj);
        } else {
            this._getDSInfoErrorEl().addClass("xc-hidden");
        }
    }

    private static _updateFormatInfo(dsObj: DSObj): XDPromise<void> {
        let format = dsObj.getFormat();
        if (format != null) {
            $("#dsInfo-format").text(format);
            return PromiseHelper.resolve();
        } else {
            $("#dsInfo-format").text(CommonTxtTstr.NA);
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            DS.getFormatFromDS(dsObj)
            .then((format) => {
                if (format != null) {
                    $("#dsInfo-format").text(format);
                }
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    }

    // event set up for the module
    private static _setupSampleTable() {
        let $dsInfoPath = this._getDSInfoPathEl();
        $dsInfoPath.on("click", () => {
            // copies filepath to clipboard
            let value = $dsInfoPath.text();
            xcUIHelper.copyToClipboard(value);

            $dsInfoPath.parent().addClass("copiableText");
            setTimeout(() => {
                $dsInfoPath.parent().removeClass("copiableText");
            }, 1800);
        });

        let $dsTableView = this._getDSTableViewEl();
        // reload ds with new preview size
        $dsTableView.on("click", ".errorSection .retry", () => {
            let dsId = this._getPreviewDSId();
            if (dsId == null) {
                console.error("cannot find ds");
                return;
            }

            this._rePointDS(dsId);
        });

        let $dsTableContainer = this._getContainer();
        $dsTableContainer.on("click", ".cancelLoad", function() {
            var txId = $(this).data("txid");
            QueryManager.cancelDS(txId);
        });

        $("#showFileListBtn").click((event) => {
            $(event.currentTarget).blur();
            let dsId = this._getPreviewDSId();
            let dsObj = DS.getDSObj(dsId);
            let isFileError : boolean = false;
            let dsName: string = "";
            if (dsObj && dsObj.advancedArgs) {
                isFileError = dsObj.advancedArgs.allowFileErrors &&
                             !dsObj.advancedArgs.allowRecordErrors;
                dsName = dsObj.getName();
            }
            FileListModal.Instance.show(dsId, dsName, isFileError);
        });

        this._getCreateDFEl().click(() => {
            this._createDF();
        });

        this._getDSInfoErrorEl().click(() => {
            let dsId = this._getPreviewDSId();
            let dsObj = DS.getDSObj(dsId);
            let isRecordError: boolean = false;
            let numTotalErrors: number;
            if (!dsObj || !dsObj.advancedArgs) {
                isRecordError = true;
            } else {
                isRecordError = dsObj.advancedArgs.allowRecordErrors;
                numTotalErrors = dsObj.numErrors;
            }
            DSImportErrorModal.Instance.show(dsId, numTotalErrors, isRecordError);
        });
    }

    private static _createDF() {
        let dsId = this._getPreviewDSId();
        let dsObj = DS.getDSObj(dsId);
        if (dsObj) {
            DagView.newTabFromSource(DagNodeType.Dataset, {
                source: dsObj.getId(),
                prefix: xcHelper.normalizePrefix(dsObj.getName())
            });
        }
    }

    private static _rePointDS(dsId: string): void {
        // maybe it's a succes point but ds table has error
        let dsObj = DS.getErrorDSObj(dsId);
        if (dsObj != null) {
            DS.removeErrorDSObj(dsId);
        } else {
            dsObj = DS.getDSObj(dsId);
        }

        if (!dsObj) {
            Alert.error(DSTStr.NotFindDS, null);
            return;
        }

        let sources = dsObj.getSources();
        let files = sources.map(function(source) {
            return {
                "path": source.path,
                "recursive": source.recursive,
                "dsToReplace": dsId
            };
        });
        DSConfig.show({
            "targetName": dsObj.getTargetName(),
            "files": files,
            "format": dsObj.getFormat(),
            "dsName": dsObj.getName(),
            "skipRows": dsObj.skipRows,
            "moduleName": dsObj.moduleName,
            "funcName": dsObj.funcName,
            "hasHeader": dsObj.hasHeader,
            "fieldDelim": dsObj.fieldDelim,
            "lineDelim": dsObj.lineDelim,
            "quoteChar": dsObj.quoteChar,
            "typedColumns": dsObj.typedColumns,
            "udfQuery": dsObj.udfQuery,
            "advancedArgs": dsObj.advancedArgs
        }, null, true);
    }

    private static _toggleErrorIcon(dsObj: DSObj) {
        let $dsInfoError = this._getDSInfoErrorEl();
        $dsInfoError.addClass("xc-hidden");
        if (!dsObj.numErrors) {
            return;
        }

        if (!dsObj.advancedArgs) {
            let datasetName = dsObj.getFullName();
            dsObj.addAdvancedArgs()
            .then(() => {
                if (this.lastDSToSample !== datasetName) {
                    return;
                }
                this._showIcon(dsObj);
            }); // if fail, keep hidden
        } else {
            this._showIcon(dsObj);
        }
    }

    private static _showIcon(dsObj: DSObj): void {
        let $dsInfoError = this._getDSInfoErrorEl();
        $dsInfoError.removeClass("xc-hidden");
        let numErrors: string = xcStringHelper.numToStr(dsObj.numErrors);
        let text: string;
        if (dsObj.advancedArgs.allowRecordErrors) {
            $dsInfoError.removeClass("type-file");
            if (numErrors === "1") {
                text = DSTStr.ContainsRecordError;
            } else {
                text = xcStringHelper.replaceMsg(DSTStr.ContainsRecordErrors, {
                    num: numErrors
                });
            }
        } else {
            $dsInfoError.addClass("type-file");
            if (numErrors === "1") {
                text = DSTStr.ContainsFileError;
            } else {
                text = xcStringHelper.replaceMsg(DSTStr.ContainsFileErrors, {
                    num: numErrors
                });
            }
        }
        xcTooltip.changeText($dsInfoError, text);
    }
}
