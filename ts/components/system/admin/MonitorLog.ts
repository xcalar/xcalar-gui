class SystemLog {
    private _id: string;
    private _hosts;
    private _hasError;
    private _logs;
    private _flushIntervalId: number;
    private readonly _defaultXcalarLogPath: string = "/var/log/xcalar/";
    private readonly _tabLength: number = 50;

    public constructor(id: string) {
        this._id = id;
        this._hosts = {};
        this._hasError = {};
        this._logs = {};
        this._addEventListeners();
    }

    public adjustTabNumber(): void {
        let $card = this._getCard();
        if ($card.is(":visible") &&
            $card.find(".tab").length > 0
        ) {
            this._arrowStatusCheck();
        }
    }

    private _getCard(): JQuery {
        return $(`#${this._id}`);
    }

    private _getInputSection(): JQuery {
        return this._getCard().find(".inputSection");
    }

    private _getStremBtns(): JQuery {
        return this._getCard().find(".streamBtns");
    }

    private _addTabs(): void {
        let hosts = this._hosts;
        let keys: string[] = Object.keys(hosts);
        if (keys.length === 0) {
            return;
        }

        let $card = this._getCard();
        let $tabArea = $card.find('.tabArea');
        let html: HTML = "";

        keys.sort((a, b) => {
            return Number(hosts[a]) - Number(hosts[b]);
        });
        for (let i = 0; i < keys.length; i++) {
            let hostName: string = keys[i];
            let nodeId: string = hosts[hostName];
            html += '<div class="tab ' + (this._hasError[hostName] ? "error" : "") +
                    '" id="' + nodeId + '" data-toggle="tooltip" ' +
                    'data-container="body" data-original-title="' + hostName +
                    '">' + '<div class="tabLabel">Node ' + nodeId + '</div>' +
                    '<div class="tabClose">' +
                    '<i class="icon xi-cancel fa-10"></i></div></div>';
        }
        $tabArea.html(html);

        if (keys.length !== 0) {
            $card.find(".tabSection").addClass("withTabs");
        }
        let $tabs = $card.find('.tab');
        if ($tabs.length > 0) {
            this._focusTab($tabs.eq(0));
        }
        this._arrowStatusCheck();
        this._showBarSection();
    }

    private _getHostNameFromTab($tab: JQuery): string {
        return $tab.data('original-title');
    }

    private _focusTab($tab: JQuery): void {
        let $card = this._getCard();
        let $tabs = $card.find('.tab');
        $tabs.removeClass("focus");
        $tab.addClass("focus");
        let hostName: string = this._getHostNameFromTab($tab);
        let $content = $card.find(".content");
        $content.html(this._logs[hostName]);
    }

    private _closeTab($tab: JQuery): void {
        xcTooltip.hideAll();
        if ($tab.hasClass("focus")) {
            if ($tab.next().length !== 0) {
                this._focusTab($tab.next());
            } else if ($tab.prev().length !== 0) {
                this._focusTab($tab.prev());
            } else {
                this._clearAll();
                this._stopMonitorLog();
                return;
            }
        }
        this._deleteTab($tab);
        this._arrowStatusCheck();
    }

    private _deleteTab($tab: JQuery): void {
        let host = this._getHostNameFromTab($tab);
        delete this._hosts[host];
        delete this._hasError[host];
        delete this._logs[host];
        $tab.remove();
    }

    private _clearAll(): void {
        this._hosts = {};
        this._hasError = {};
        this._logs = {};
        let $card = this._getCard();
        $card.find(".tabSection").removeClass("withTabs");
        $card.find(".tabArea").html("");
        $card.find(".content").html("");
        this._hideBarSection();
    }

    private _clearLogs(): void  {
        this._getCard().find(".content").empty();
        for (let host in this._logs) {
            this._logs[host] = "";
        }
    }

    private _scrollToRight(): void {
        var checkPosition = this._tabAreaPositionCheck();
        if (checkPosition.canRight) {
            this._getCard().find(".tabArea").offset(<any>{
                "left": checkPosition.nextRightStart
            });
            this._arrowStatusCheck();
        }
    }

    private _scrollToLeft(): void {
        var checkPosition = this._tabAreaPositionCheck();
        if (checkPosition.canLeft) {
            this._getCard().find(".tabArea").offset(<any>{
                "left": checkPosition.nextLeftStart
            });
            this._arrowStatusCheck();
        }
    }

    private _arrowStatusCheck(): void {
        let checkPosition = this._tabAreaPositionCheck();
        let $card = this._getCard();
        if (checkPosition.canLeft) {
            $card.find(".leftEnd").removeClass("xc-disabled");
        } else {
            $card.find(".leftEnd").addClass("xc-disabled");
        }

        if (checkPosition.canRight) {
            $card.find(".rightEnd").removeClass("xc-disabled");
        } else {
            $card.find(".rightEnd").addClass("xc-disabled");
        }
    }

    private _tabAreaPositionCheck(): {
        canRight: boolean,
        nextRightStart: number,
        canLeft: boolean,
        nextLeftStart: number
    } {
        let res = {
            canRight: undefined,
            nextRightStart: undefined,
            canLeft: undefined,
            nextLeftStart: undefined
        };
        let $card = this._getCard();
        let beginPosition: number = $card.find(".leftEnd").offset().left +
        $card.find(".leftEnd").width() + 1;
        let totalLength: number = $card.find(".tab").length * this._tabLength;
        let visibleLength: number = $card.find(".tabArea").width();
        let pageLength: number = Math.floor(visibleLength / this._tabLength) * this._tabLength;
        let currentPosition: number = $card.find(".tabArea").offset().left;
        if (Math.abs(currentPosition - beginPosition) + pageLength < totalLength) {
            res.canRight = true;
            res.nextRightStart = currentPosition - pageLength;
        } else {
            res.canRight = false;
        }
        if (currentPosition !== beginPosition) {
            res.canLeft = true;
            if (currentPosition + pageLength >= beginPosition) {
                res.nextLeftStart = beginPosition;
            } else {
                res.nextLeftStart = currentPosition + pageLength;
            }
        } else {
            res.canLeft = false;
        }
        return res;
    }

    private _addEventListeners(): void {
        let $card = this._getCard();
        this._getInputSection().find(".xc-input").on("keydown", (e) => {
            if (e.which === keyCode.Enter) {
                this._getRecentLogs();
            }
        });

        $card.find(".getRecentLogs").click(() => {
            this._getRecentLogs();
        });

        $card.on("click", ".streamBtns .btn", (e) => {
            let $el = $(e.currentTarget);
            $el.blur();
            if ($el.parent().hasClass("xc-disabled")) {
                return;
            }
            if ($el.hasClass("stopStream")) {
                this._stopMonitorLog();
            } else {
                this._startMonitorLog();
            }
            return false;
        });

        $card.find(".clear").click((e) => {
            $(e.currentTarget).blur();
            this._clearLogs();
        });

        $card.on('click', '.tab', (e) => {
            this._focusTab($(e.currentTarget));
            return false;
        });

        $card.find(".leftEnd").click(() => {
            this._scrollToLeft();
            return false;
        });

        $card.find(".rightEnd").click(() => {
            this._scrollToRight();
            return false;
        });

        $card.on('click', '.tabClose .icon', (e) => {
            this._closeTab($(e.currentTarget).closest('.tab'));
            return false;
        });

        $card.on('click', '.downloadLog', () => {
            this._downloadLog();
            return false;
        });

        $card.on('click', '.copyLog', (e) => {
            let logs = this._getLogText();
            xcUIHelper.copyToClipboard(logs);
            let $btn: JQuery = $(e.currentTarget).find(".icon");
            let oldTitle: string = $btn.attr("data-original-title");
            xcTooltip.changeText($btn, CommonTxtTstr.LogCopied);
            xcTooltip.refresh($btn);
            // the change back of text will not reflect unil user move mouse
            // out and back
            xcTooltip.changeText($btn, oldTitle, false, true);
            return false;
        });

        const $logNameDropdown = this._getInputSection().find(".logName").find(".dropDownList");
        new MenuHelper($logNameDropdown, {
            onSelect: ($li) => {
                $logNameDropdown.find(".text")
                .text($li.text())
                .data("option", $li.data("option"));
            },
            container: `#${this._id}`,
            bounds: `#${this._id}`
        }).setupListeners();
    }

    private _getHost(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $inputSection = this._getInputSection()
        let hostnamePattern: string = $inputSection.find(".hostnamePattern .xc-input").val().trim();

        adminTools.getMatchHosts(hostnamePattern)
        .then((ret) => {
            this._updateHosts(ret);
            if (Object.keys(this._hosts).length === 0) {
                deferred.reject({"logs": MonitorTStr.GetHostsFail});
            } else {
                deferred.resolve();
            }
        })
        .fail((error) => {
            this._clearAll();
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _getLogNameFromOption(option: string): string {
        switch (option) {
            case "node":
                return "node.*.log";
            case "xpu":
                return "xpu.out";
            case "xcmonitor":
                return "xcmonitor.log";
            case "expserver":
                return "expserver.out";
            case "caddy":
                return "caddy.out";
            default:
                return null;
        }
    }

    private _validateFileName(): string | null {
        let $inputSection = this._getInputSection();
        let $fileName = $inputSection.find(".logName .dropDownList .text");
        let fileName: string = this._getLogNameFromOption($fileName.data("option"));
        let isValid: boolean = xcHelper.validate([
            {
                "$ele": $fileName // check if it"s empty
            }
        ]);
        if (!isValid) {
            return null;
        }
        return fileName;
    }

    private _validate(): {
        lastNRow: number,
        fileName: string
    } | null {
        let $inputSection = this._getInputSection();
        let $lastNRow = $inputSection.find(".numLogs .xc-input");
        let lastNRow: number = parseInt($inputSection.find(".numLogs .xc-input").val().trim());
        $lastNRow.blur();

        let fileName = this._validateFileName();
        if (fileName == null) {
            // invalid case
            return null;
        }

        let isValid: boolean = xcHelper.validate([
            {
                "$ele": $lastNRow // check if it"s empty
            },
            {
                "$ele": $lastNRow,
                "error": "Please enter a value between 1 and 500",
                "check": function() {
                    return (!(lastNRow > 0 && lastNRow < 501));
                }
            }
        ]);
        if (!isValid) {
            return null;
        }
        return {
            lastNRow: lastNRow,
            fileName: fileName
        };
    }

    private _getRecentLogs(): XDPromise<void> {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return PromiseHelper.reject();
        }
        let lastNRow: number = res.lastNRow;
        let fileName: string = res.fileName;
        let filePath: string = this._getFilePath();
        let $inputSection = this._getInputSection();
        $inputSection.addClass("xc-disabled");
        this._clearAll();

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._flushLog()
        .then(() => {
            return this._getHost();
        })
        .then(() => {
            return adminTools.getRecentLogs(lastNRow, filePath, fileName, this._hosts);
        })
        .then((ret) => {
            xcUIHelper.showSuccess(SuccessTStr.RetrieveLogs);
            this._appendLog(ret.results, false);
            deferred.resolve();
        })
        .fail((err) => {
            if (err && err.results) {
                xcUIHelper.showSuccess(SuccessTStr.RetrieveLogs);
                this._appendLog(err.results, false);
            } else {
                var msg = ErrTStr.Unknown;
                if (err && err.logs && err.logs !== "error") {
                    msg = err.logs;
                }
                Alert.error(MonitorTStr.GetLogsFail, msg);
            }
            deferred.reject(err);
        })
        .always(() => {
            $inputSection.removeClass("xc-disabled");
            $inputSection.find(".numLogs .xc-input").blur();
            xcTooltip.hideAll();
        });

        return deferred.promise();
    }

    private _getFilePath(): string {
        let filePath: string = this._defaultXcalarLogPath;
        // XXX TODO: use monitorConfig
        $("#configCard .formRow .paramName").each(function() {
            if ($(this).val() === "XcalarLogCompletePath") {
                filePath = $(this).closest(".formRow").find(".curVal").val();
                // stop loop
                return false;
            }
        });
        return filePath;
    }

    private _toggleDisableInputs(disable: boolean): void {
        this._getInputSection().find(".xc-input").prop('disabled', disable);
    }

    private _startMonitorLog(): XDPromise<void> {
        let fileName = this._validateFileName();
        if (fileName == null) {
            // invalid case
            return PromiseHelper.reject();
        }
        let $streamBtns = this._getStremBtns();
        this._toggleDisableInputs(true);
        $streamBtns.addClass("streaming");
        let filePath: string = this._getFilePath();

        this._clearAll();

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._flushLog()
        .then(() => {
            return this._getHost();
        })
        .then(() => {
            this._startFlushPeriod();
            adminTools.monitorLogs(filePath, fileName, this._hosts, (err) => {
                this._onMonitorError(err);
            }, (ret) => {
                this._onMonitorSuccess(ret);
            });
            deferred.resolve();
        })
        .fail((err) => {
            let msg: string = MonitorTStr.GetHostsFail;
            if (err && err.logs) {
                msg = err.logs;
            }
            Alert.error(MonitorTStr.StartStreamFail, msg);
            this._stopMonitorLog();
            deferred.reject(err);
        });

        return deferred.promise();
    }

    private _onMonitorError(err): void {
        if (err && err.results) {
            this._appendLog(err.results, true);
        } else {
            let msg: string = ErrTStr.Unknown;
            if (err && err.logs && err.logs !== "error") {
                msg = err.logs;
            }
            Alert.error(MonitorTStr.StartStreamFail, msg);
            this._stopMonitorLog();
        }
    }

    private _onMonitorSuccess(ret): void {
        if (ret && ret.results) {
            this._appendLog(ret.results, true);
        }
    }

    private _stopMonitorLog(): void {
        let $streamBtns = this._getStremBtns();
        $streamBtns.removeClass("streaming");
        this._toggleDisableInputs(false);
        this._stopFlushPeriod();
        adminTools.stopMonitorLogs();
    }

    private _appendLog(
        results: {[key: string]: {status: number, error: string, logs: string}},
        isMonitoring: boolean
    ): void {
        this._saveResults(results);
        if (isMonitoring && this._getCard().find(".tabSection").hasClass("withTabs")) {
            this._appendResultToFocusTab(results);
        } else {
            this._addTabs();
        }
    }

    private _getTabByHostName(hostName: string): JQuery {
        let selector: string ='[data-original-title="' + hostName + '"]';
        return this._getCard().find(".tab").find(selector);
    }

    private _saveResults(
        results: {[key: string]: {status: number, error: string, logs: string}}
    ): void {
        let logs = this._logs;
        for (let host in results) {
            if (this._hosts[host]) {
                let result = results[host];
                if (result.status === 200) {
                    if (result.logs) {
                        logs[host] += '<div class="msgRow">' + result.logs + '</div>';
                    }
                } else {
                    if (result.error) {
                        if ((logs[host]).indexOf(result.error) === -1) {
                            logs[host] += '<div class="msgRow error">' + result.error +
                                          '</div>';
                        }
                    } else {
                        if ((logs[host]).indexOf(MonitorTStr.GetLogsFail) === -1) {
                            logs[host] += '<div class="msgRow error">' + MonitorTStr.GetLogsFail +
                                          '</div>';
                        }
                    }
                    this._hasError[host] = true;
                    let $tab = this._getTabByHostName(host);
                    if ($tab) {
                        $tab.addClass("error");
                    }
                }
            }
        }
    }

    private _appendResultToFocusTab(
        results: {[key: string]: {status: number, error: string, logs: string}}
    ) {
        let $card = this._getCard();
        let host: string = $card.find(".tab.focus").data("original-title");
        let result = results[host];
        if (result.status === 200) {
            if (result.logs) {
                $card.find(".content")
                .append('<div class="msgRow">' + result.logs + '</div>');
            }
        } else {
            let logs = this._logs;
            if (result.error) {
                if (logs[host].indexOf(result.error) === -1) {
                    $card.find(".content")
                    .append('<div class="msgRow error">' + result.error + '</div>');
                }
            } else {
                if (logs[host].indexOf(MonitorTStr.GetLogsFail) === -1) {
                    $card.find(".content")
                    .append('<div class="msgRow error">' + MonitorTStr.GetLogsFail + '</div>');
                }
            }
        }
    }

    private _updateHosts(
        ret: {
            matchHosts: string[],
            matchNodeIds: string[]
        }
    ): void {
        let matchHosts = ret.matchHosts;
        let matchNodeIds = ret.matchNodeIds;
        let duplicateHosts: boolean = false;
        for (let i = 0; i < matchHosts.length; i++) {
            let host = matchHosts[i];
            let nodeId = matchNodeIds[i];
            if (host in this._hosts) {
                duplicateHosts = true;
                continue;
            }
            this._hosts[host] = nodeId;
            this._logs[host] = "";
        }
        if (duplicateHosts) {
            Alert.error(MonitorTStr.GetLogsFail, MonitorTStr.GetDuplicateHost);
        }
    }

    private _flushLog(): XDPromise<void> {
        let def = XcalarLogLevelSet(9, 1);
        return PromiseHelper.alwaysResolve(def);
    }

    private _startFlushPeriod(): void {
        this._stopFlushPeriod();
        this._flushIntervalId = <any>setInterval(() => {
            this._flushLog();
        }, 5000);
    }

    private _stopFlushPeriod(): void {
        clearInterval(this._flushIntervalId);
        this._flushIntervalId = null;
    }

    private _downloadLog(): void {
        let logs = this._getLogText();
        let fileName = this._getCard().find(".tab.focus").data("original-title") + "-logs.txt";
        xcHelper.downloadAsFile(fileName, logs);
    }

    private _getLogText(): string {
        let logs: string = "";
        let msgRows = this._getCard().find(".logSection .content .msgRow");
        for (let i = 0; i < msgRows.length; i++) {
            logs += msgRows.eq(i).html();
        }
        return logs;
    }

    private _showBarSection(): void {
        this._getCard().find(".barSection").removeClass("xc-hidden");
    }

    private _hideBarSection(): void {
        this._getCard().find(".barSection").addClass("xc-hidden");
    }
}