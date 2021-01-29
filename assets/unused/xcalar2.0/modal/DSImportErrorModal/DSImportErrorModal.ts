class DSImportErrorModal {
    private static _instance: DSImportErrorModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _modalId: number;
    private _curResultSetId: string;
    private _curDSName: string;
    private _scrollMeta: {currentRowNumber: number, numRecords: number};
    private _files: any;
    private _activePath: string;
    private _hasRecordErrors: boolean;

    private readonly _numRecordsToFetch = 10; // num to fetch at a time when scrolling
    private readonly _numRecordsToShow = 20; // num to fetch initially on show
    private readonly _rowHeight = 44;

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal());
        this._modalId = null;
        this._activePath = null;
        this._hasRecordErrors = false;
        this._scrollMeta = {
            currentRowNumber: undefined,
            numRecords: undefined
        };
        this._files = {};
        this._setupScrollBar();
        this._addEventListeners();
    }

    /**
     * DSImportErrorModal.Instance.show
     * @param dsName
     * @param numErrors
     * @param isRecordError
     */
    public show(
        dsName: string,
        numErrors: number,
        isRecordError: boolean
    ): void {
        if (this._modalId != null) {
            // already open
            return;
        }

        this._curResultSetId = null;
        this._modalHelper.setup();
        this._modalId = Date.now();
        this._hasRecordErrors = isRecordError;
        this._curDSName = dsName;

        let $modal = this._getModal();
        $modal.find(".infoTotalFiles").find(".value").text("N/A");

        let numErrorsStr: string = numErrors ? xcStringHelper.numToStr(numErrors) : "N/A";
        $modal.find(".infoTotalErrors").find(".value").text(numErrorsStr);

        let numEntries: number;
        XcalarMakeResultSetFromDataset(dsName, true)
        .then((result) => {
            this._curResultSetId = result.resultSetId;
            numEntries = result.numEntries;
            let numRowsToFetch = Math.min(numEntries, this._numRecordsToShow);

            this._refreshScrollBar(numEntries);
            return this._fetchRows(0, numRowsToFetch);
        })
        .then((ret) => {
            if (!numErrors) {
                let numTotalErrors: number = 0;
                for (let i = 0; i < ret.length; i++) {
                    numTotalErrors += ret[i].errors.length;
                }
                let numTotalErrorsStr: string = xcStringHelper.numToStr(numTotalErrors);
                if (numEntries > this._numRecordsToShow) {
                    numTotalErrorsStr += "+";
                }

                $modal.find(".infoTotalErrors").find(".value").text(numTotalErrorsStr);
            }

            $modal.find(".errorFileList .row").eq(0).removeClass("active").click();
        })
        .fail(() => {
            // only fails if modal has been closed or changed
        });
    }

    private _getModal(): JQuery {
        return $("#dsImportErrorModal");
    }

    private _getRecordListEl(): JQuery {
        return this._getModal().find(".recordMessageList");
    }

    private _getFileListEl(): JQuery {
        return this._getModal().find(".errorFileList");
    }

    private _close(): void {
        let $fileList = this._getFileListEl();
        let $recordList = this._getRecordListEl();
        $fileList.find(".row").remove();
        $recordList.empty();
        $recordList.removeClass("scrolling");
        $fileList.removeClass("scrolling full");
        this._scrollMeta = {
            currentRowNumber: undefined,
            numRecords: undefined
        };
        this._getModal().find(".fileListSection").find(".scrollBar").scrollTop(0);
        this._activePath = null;

        this._modalHelper.clear();
        if (this._curResultSetId) {
            XcalarSetFree(this._curResultSetId);
        }
        this._files = {};
        this._curResultSetId = null;
        this._modalId = null;
    }

    private _setupScrollBar(): void {
        let $fileList = this._getFileListEl();
        $fileList.scroll(() => {
            if (this._isScrollBarAtBottom()) {
                this._scrollDown();
            }
        });
    }

    private _isScrollBarAtBottom(): boolean {
        try {
            let $fileList = this._getFileListEl();
            return ($fileList[0].scrollHeight - $fileList.scrollTop() -
                   $fileList.outerHeight() <= (this._rowHeight * 8));
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private _scrollDown(): void {
        let $fileList = this._getFileListEl();
        if ($fileList.hasClass("scrolling") || $fileList.hasClass("full")) {
            return;
        }
        let scrollMeta = this._scrollMeta;
        if (scrollMeta.currentRowNumber < scrollMeta.numRecords) {
            let numRowsToAdd: number = Math.min(this._numRecordsToFetch,
                scrollMeta.numRecords - scrollMeta.currentRowNumber);
            this._fetchRows(scrollMeta.currentRowNumber, numRowsToAdd);
        }
    }

    private _showPathInfo(path: string): void {
        this._activePath = path;
        let file = this._files[path];
        let $modal = this._getModal();
        $modal.find(".recordErrorSection, .fileErrorSection").addClass("xc-hidden");
        let html: HTML = "";
        if (file.type === "record") {
            for (let i = 0; i < file.errors.length; i++) {
                html += '<div class="row collapsed row' + i + '">' +
                            '<div class="recordNum">' +
                                '<i class="icon xi-arrow-down arrow"></i>' +
                                '<span class="num">' + file.errors[i].recordNumber + '</span>' +
                            '</div>' +
                            '<div class="errorMsg">' + file.errors[i].error + '</div>' +
                        '</div>';
            }
            this._getRecordListEl().html(html);
            $modal.find(".recordErrorSection").removeClass("xc-hidden");
        } else {
            $modal.find(".fileErrorSection").removeClass("xc-hidden").html(file.msg);
        }
    }

    private _download(): void {
        let errorData = [];
        let numRecords: number = this._scrollMeta.numRecords;
        let resultSetId: string = null;
        let dsName: string = this._curDSName;

        XcalarMakeResultSetFromDataset(dsName, true)
        .then((result) => {
            resultSetId = result.resultSetId;
            return XcalarFetchData(resultSetId, 0, numRecords, numRecords, [], 0, 0);
        })
        .then((msgs) => {
            for (let row = 0; row < msgs.length; row++) {
                try {
                    let fileInfo = JSON.parse(msgs[row]);
                    for (let index = 0; index < fileInfo.errors.length; index++) {
                        errorData.push({
                            "fileName": fileInfo.fullPath,
                            "recordNumber": fileInfo.errors[index].recordNumber,
                            "error": fileInfo.errors[index].error
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            let fileName: string = dsName + "_err.json";
            let content: string = JSON.stringify(errorData, null, 2);
            xcHelper.downloadAsFile(fileName, content);
        })
        .fail((error) => {
            Alert.error(ErrTStr.ErrorModalDownloadFailure, error);
        })
        .always(() => {
            if (resultSetId != null) {
                XcalarSetFree(resultSetId);
            }
        })
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });

        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".recordMessageList .recordNum", (event) => {
            let $row = $(event.currentTarget).closest(".row");
            if ($row.hasClass("expanded")) {
                $row.removeClass("expanded").addClass("collapsed");
            } else {
                $row.addClass("expanded").removeClass("collapsed");
            }
        });

        $modal.on("click", ".errorFileList .row", (event) => {
            let $row = $(event.currentTarget);
            if ($row.hasClass("active")) {
                return;
            }
            $modal.find(".errorFileList .row").removeClass("active");
            $row.addClass("active");
            let path: string = $row.data("path");
            this._showPathInfo(path);
        });

        $modal.on('click', '.downloadErrorModal', () => {
            this._download();
        });
    }

    private _refreshScrollBar(numRecords: number): void {
        this._scrollMeta = {
            currentRowNumber: 0,
            numRecords: numRecords
        };
    }

    private _fetchRows(
        startIndex: number,
        numRowsToAdd: number
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let curId = this._modalId;
        let $fileList = this._getFileListEl();
        $fileList.addClass("scrolling");

        this._fetchHelper(this._curResultSetId, startIndex, numRowsToAdd)
        .always((msgs) => {
            if (this._modalId == null || curId !== this._modalId) {
                return;
            }
            let html: HTML = "";
            for (let i = 0; i < msgs.length; i++) {
                let fileInfo = msgs[i];
                this._files[fileInfo.fullPath] = fileInfo;
                let rowNum = i + startIndex;
                html += this._getFileRowHtml(fileInfo, rowNum);
            }

            $fileList.find(".tempRow").before(html);

            $fileList.removeClass("scrolling");
            let scrollMeta = this._scrollMeta;
            if (scrollMeta.currentRowNumber >= scrollMeta.numRecords) {
                $fileList.addClass("full");
            }
            let numFiles: string = Object.keys(this._files).length + "";
            if (scrollMeta.currentRowNumber < scrollMeta.numRecords) {
                numFiles += "+";
            }
            this._getModal().find(".infoTotalFiles").find(".value").text(numFiles);
            deferred.resolve(msgs);
        });

        return deferred.promise();
    }

    private _fetchHelper(
        curResultSetId: string,
        startIndex: number,
        totalNumRowsNeeded: number
    ): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let numRowsFound: number = 0;
        let allFiles = [];
        let fetch = (sIndex, numRowsToFetch): XDPromise<void> => {
            let innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let curId = this._modalId;
            let scrollMeta = this._scrollMeta;

            XcalarFetchData(curResultSetId, sIndex, numRowsToFetch,
                            scrollMeta.numRecords, [], 0, 0)
            .then((files) => {
                if (this._modalId == null || curId !== this._modalId) {
                    return PromiseHelper.reject();
                }

                let i: number;
                for (i = 0; i < files.length; i++) {
                    try {
                        let fileInfo = JSON.parse(files[i]);
                        if (!fileInfo.numErrors) {
                            continue;
                        }

                        fileInfo.type = "record";
                        allFiles.push(fileInfo);
                        numRowsFound++;
                        if (numRowsFound === totalNumRowsNeeded) {
                            i++
                            break;
                        }
                    } catch (e) {
                        console.error(e);
                        return PromiseHelper.reject();
                    }
                }
                scrollMeta.currentRowNumber += i;
                let endIndex = sIndex + i;
                let numMoreNeeded = totalNumRowsNeeded - numRowsFound;
                numMoreNeeded = Math.min(numMoreNeeded,
                                         scrollMeta.numRecords - endIndex);

                if (numMoreNeeded) {
                    // if fewer than 5 rows are needed, fetch at least 5 if
                    // possible so we don't have to do repeated fetches of 1 or
                    // 2 rows at a time that keep returning no errors
                    let numMoreToFetch = Math.min(5, scrollMeta.numRecords - endIndex);
                    numMoreToFetch = Math.max(numMoreNeeded, numMoreToFetch);
                    return fetch(endIndex, numMoreToFetch);
                } else {
                    return;
                }
            })
            .then(innerDeferred.resolve)
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        fetch(startIndex, totalNumRowsNeeded)
        .always(() => {
            deferred.resolve(allFiles);
        });

        return deferred.promise();
    }

    private _getFileRowHtml(
        fileInfo: {fullPath: string},
        rowNum: number
    ): HTML {
        let activeClass: string = "";
        let fullPath: string = fileInfo.fullPath;
        if (this._activePath && fullPath === this._activePath) {
            activeClass += " active";
        }
        let type: string;
        let tooltip: string;
        if (this._hasRecordErrors) {
            type = "record";
            tooltip = DSTStr.RecordError;
        } else {
            type = "file";
            tooltip = DSTStr.FileError;
        }
        let html: HTML =
        '<div class="row type-' + type + ' row' + rowNum + activeClass +
        '" data-path="' + fullPath + '">' +
            '<i class="icon xi-error"' + xcTooltip.Attrs +
            ' data-original-title="' + tooltip + '"></i>' +
            '<span class="filePath" data-toggle="tooltip" ' +
                'data-placement="auto top" data-container="body" ' +
                'data-original-title="' + fullPath + '">' +
                '<span class="hiddenChar">a</span>' +
                fullPath +
            '</span>' +
        '</div>';
        return html;
    }
}
