class SupTicketModal {
    private static _instance: SupTicketModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _tickets: any[];
    private _firstTouch: boolean;
    private _updatedTickets; // holds recently submitted/updated tickets that
    // may not show up when all tickets are fetched
    private readonly _subjectLimit: number = 100;
    private readonly _descLimit: number = 10000;

    private constructor() {
        this._firstTouch = true;
        this._tickets = [];
        this._updatedTickets = {};
        this._modalHelper = new ModalHelper(this._getModal(), {
            noEnter: true
        });
        this._addEventListeners();
    }

    /**
     * SupTicketModal.Instance.show
     */
    public show(): void {
        let $modal = this._getModal();
        $modal.addClass('flex-container');
        this._modalHelper.setup();

        if ($("#modalBackground").hasClass('locked')) {
            $modal.addClass('locked');
            Alert.hide();
        }
        this._updateTimes();
        $modal.find(".emailArea").removeClass("xc-hidden");
    }

    /**
     * SupTicketModal.Instance.restore
     */
    public restore(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._modalHelper.addWaitingBG();
        // always resolves
        this._getTickets()
        .then((oldTickets) => {
            return this._getComments(oldTickets);
        })
        .then((oldTickets) => {
            this._tickets = oldTickets;
            this._includeUpdatedTickets();
            this._listTickets();
            this._modalHelper.removeWaitingBG();
            deferred.resolve();
        });

        return deferred.promise();
    }

    /**
     * SupTicketModal.getTicket
     * @param ticketId
     */
    public getTicket(ticketId: number): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let reqStr = JSON.stringify({ticketId: ticketId});

        adminTools.getTickets(reqStr)
        .then((ret) => {
            let ticket = [];
            try {
                if (ret.logs) {
                    ticket = JSON.parse(ret.logs).comments;
                }
            } catch (e) {
                console.error(e);
            }
            deferred.resolve(ticket);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * stringify logs and take up to 100KB worth of logs and errors
     * SupTicketModal.Instance.trimRecentLogs
     */
    public trimRecentLogs(): string {
        let xiLogs = Log.getAllLogs(true);
        let strLogs = JSON.stringify(xiLogs);
        let errorLimit: number = 50 * KB;
        let totalLimit: number = 100 * KB;

        // if more than 100kb, take 50kb worth of errors, then take
        // 50kb worth of logs, and if there aren't 50kb worth of logs, take
        // overwritten logs, and if space still remains, take the remaining
        // error logs
        if (strLogs.length > totalLimit) {
            let strErrors: string = "";
            let strOverwrites: string = "";
            let numErrorsAdded: number = 0;
            for (let i = xiLogs.errors.length - 1; i >= 0; i--) {
                let strError = JSON.stringify(xiLogs.errors[i]);
                if (strErrors.length + strError.length < errorLimit) {
                    if (strErrors.length) {
                        strErrors += ",";
                    }
                    strErrors += strError;
                    numErrorsAdded = xiLogs.errors.length - i;
                } else {
                    numErrorsAdded = xiLogs.errors.length - 1 - i;
                    break;
                }
            }

            let lenRemaining: number = totalLimit - strErrors.length;
            strLogs = "";
            for (let i = xiLogs.logs.length - 1; i >= 0; i--) {
                let strLog = JSON.stringify(xiLogs.logs[i]);
                if (strLogs.length + strLog.length < lenRemaining) {
                    if (strLogs.length) {
                        strLogs += ",";
                        lenRemaining--;
                    }
                    strLogs += strLog;
                    lenRemaining -= strLog.length;
                } else {
                    break;
                }
            }

            for (let i = xiLogs.overwrittenLogs.length - 1; i >= 0; i--) {
                let strLog = JSON.stringify(xiLogs.overwrittenLogs[i]);
                if (strOverwrites.length + strLog.length < lenRemaining) {
                    if (strOverwrites.length) {
                        strOverwrites += ",";
                        lenRemaining--;
                    }
                    strOverwrites += strLog;
                    lenRemaining -= strLog.length;
                } else {
                    break;
                }
            }

            for (let i = xiLogs.errors.length - (1 + numErrorsAdded); i >= 0; i--) {
                let strError = JSON.stringify(xiLogs.errors[i]);
                if (strError.length < lenRemaining) {
                    if (strErrors.length) {
                        strErrors += ",";
                        lenRemaining--;
                    }
                    strErrors += strError;
                    lenRemaining -= strError.length;
                } else {
                    break;
                }
            }
            strLogs = '{"version":"' + xiLogs.version + '",' +
                         '"logs":[' + strLogs + '],' +
                         '"overwrittenLogs":[' + strOverwrites + '],' +
                         '"errors":[' + strErrors + ']}';
        } else {
            // make most recent logs at top
            strLogs = JSON.stringify(this._reverseLogs(xiLogs));
        }
        return strLogs;
    }

    /**
     * SupTicketModal.Instance.submitTicket
     * @param ticketObj
     * @param licenseObj
     * @param noTop
     * @param noLog
     */
    public submitTicket(
        ticketObj: any,
        licenseObj: any,
        noTop: boolean,
        noLog: boolean
    ): XDPromise<any> {
        ticketObj.license = licenseObj;
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let ticketStr: string;
        PromiseHelper.alwaysResolve(XcalarApiTop(1000))
        .then((ret) => {
            if (!noTop) {
                ticketObj.topInfo = ret;
            }
            ticketStr = JSON.stringify(ticketObj);
            if (!noLog) {
                let logStr = this.trimRecentLogs();
                ticketStr = ticketStr.slice(0, -1);
                ticketStr += ',"xiLog":' + logStr + "}";
            }
            return adminTools.fileTicket(ticketStr);
        })
        .then(deferred.resolve)
        .fail(() => {
            adminTools.submitTicketBrowser(ticketStr)
            .then(deferred.resolve)
            .fail(deferred.reject);
        });

        return deferred.promise();
    }

    public fetchLicenseInfo(): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        adminTools.getLicense()
        .then((data) => {
            return adminTools.finishGettingLicense(data);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _getId(): string {
        return "supTicketModal";
    }

    private _getModal(): JQuery {
        return $("#" + this._getId());
    }

    private _getIssueList(): JQuery {
        return this._getModal().find('.issueList');
    }

    private _getServerityList(): JQuery {
        return this._getModal().find('.severityList');
    }

    private _getTicketIdSection(): JQuery {
        return this._getModal().find('.ticketIDSection');
    }

    private _getSeveritySection(): JQuery {
        return this._getModal().find('.severitySection');
    }

    private _getCommentSection(): JQuery {
        return this._getModal().find('.commentSection');
    }

    private _getTicketIdInput(): JQuery {
        return this._getModal().find(".customTicketRow input");
    }

    private _close(): void {
        this._modalHelper.clear();
        let $modal = this._getModal();
        $modal.find('.genBundleRow .checkbox').removeClass('checked');
        $modal.find('.xc-textArea').val("");
        $modal.find('.issueList .text').val("New");

        let $ticketIdSection = this._getTicketIdSection();
        $ticketIdSection.addClass("xc-hidden");
        this._getSeveritySection().removeClass("xc-hidden");
        $modal.find(".subjectArea").removeClass("xc-hidden");
        $modal.find(".subjectInput").val("").trigger("input");
        $modal.find(".genBundleRow").find(".label").text("2. " + MonitorTStr.AdditionalInfo + ":");
        this._getTicketIdInput().val("");

        $modal.removeClass('downloadMode downloadSuccess bundleError');
        $ticketIdSection.removeClass("expanded").removeClass("inactive");
        this._getCommentSection().removeClass("inactive");
        $modal.removeClass("expanded");
        $ticketIdSection.removeClass("fetching");
        $modal.find(".row.expanded").removeClass("expanded");
        $modal.find(".confirm").text(CommonTxtTstr.FileTicket);

        Alert.unhide();
        StatusBox.forceHide();
    }

    private _getRemaining(val: string): number {
        let count: number = val.length;
        let remaining: number = this._subjectLimit - count;
        return remaining;
    }

    private _setupIssueList(): void {
        // type dropdown
        new MenuHelper(this._getIssueList(), {
            "onSelect": ($li) => {
                let newVal: string = $li.text().trim();
                let $input = this._getIssueList().find('.text');
                let inputVal: string = $input.val();
                if (newVal === inputVal) {
                    return;
                }

                $input.val(newVal);
                let $ticketIdSection = this._getTicketIdSection();
                let $severitySection = this._getSeveritySection();
                let $modal = this._getModal();
                let $commentSection = this._getCommentSection();

                if (newVal === CommonTxtTstr.Existing) {
                    $ticketIdSection.removeClass("xc-hidden");
                    $severitySection.addClass("xc-hidden");
                    $modal.find(".subjectArea").addClass("xc-hidden");
                    $modal.find(".emailArea").addClass("xc-hidden");
                    $commentSection.addClass("inactive");
                    $ticketIdSection.removeClass("inactive");
                    $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
                    $modal.find(".confirm").text(CommonTxtTstr.UpdateTicket);
                    if (this._firstTouch) {
                        this.restore()
                        .then(() => {
                            this._firstTouch = false;
                        });
                    }
                } else { // New
                    $ticketIdSection.addClass("xc-hidden");
                    $severitySection.removeClass("xc-hidden");
                    $modal.find(".subjectArea").removeClass("xc-hidden");
                    $modal.find(".emailArea").removeClass("xc-hidden");
                    $commentSection.removeClass("inactive");
                    $modal.find(".confirm").text(CommonTxtTstr.FileTicket);
                }
            },
            "container": "#" + this._getId()
        }).setupListeners();
    }

    private _setupServerityList(): void {
        new MenuHelper(this._getServerityList(), {
            "onSelect": ($li) => {
                let newVal: string = $li.data("val");
                let textVal: string = $li.text().trim();
                let $severityList: JQuery = this._getServerityList();
                $severityList.find(".text").val(textVal);
                $severityList.find(".text").data("val", newVal);
                let $modal = this._getModal();
                if ($modal.find(".subjectInput").val().trim() === "") {
                    $modal.find(".subjectInput").focus();
                } else {
                    $modal.find(".xc-textArea").focus();
                }
            }
        }).setupListeners();
    }

    private _setupTicketSection(): void {
        // ticket id radio buttons
        xcUIHelper.optionButtonEvent(this._getTicketIdSection(), (_option, $btn) => {
            let $ticketIdSection = this._getTicketIdSection();
            $ticketIdSection.addClass("inactive");
            this._getCommentSection().removeClass("inactive");

            this._getTicketIdInput().val("");

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
            $btn.closest(".row").removeClass("xc-hidden");
            this._getModal().find("textArea").focus();

        }, {deselectFromContainer: true});

        this._getTicketIdInput().on("input", (e) => {
            if (!this._getTicketIdInput().is(":visible")) return; // ENG-8642
            if ($(e.currentTarget).val()) {
                this._getTicketIdSection().find(".radioButton").removeClass("active");
            }
        });

        // expand comment section in table
        this._getTicketIdSection().on("click", ".subjectWrap, .expand", (e) => {
            let $row = $(e.currentTarget).closest(".row");
            if ($row.hasClass("expanded")) {
                $row.removeClass("expanded");
                this._getTicketIdSection().removeClass("expanded");
            } else {
                $row.addClass("expanded");
                this._resizeModal($row);
            }
        });
    }

    private _setupTogglingActiveSections(): void {
        let $ticketIdSection = this._getTicketIdSection();
        $ticketIdSection.click((e) => {
            if (!$(e.target).closest(".radioButtonGroup").length) {
                this._toggleTicketIdSection();
            }
        });
        $ticketIdSection.on("mousedown", ".radioButtonGroup", () => {
            this._toggleTicketIdSection();
        });

        this._getCommentSection().mousedown(() => {
            this._toggleCommentSection();
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        this._setupIssueList();
        this._setupServerityList();
        // toggling active sections
        this._setupTogglingActiveSections();
        this._setupTicketSection();

        // support bundle checkboxes
        $modal.find(".genBundleRow .checkboxSection").click((e) => {
            let $section = $(e.currentTarget);
            let $checkbox = $section.find(".checkbox");
            if ($section.hasClass("inactive")) {
                return;
            }
            $checkbox.toggleClass("checked");
        });

        $modal.find(".subjectInput").keypress((e) => {
            let val: string = $(e.currentTarget).val();
            let remaining: number = this._getRemaining(val);

            if (remaining <= 0) {
                e.preventDefault();
            }
        });

        $modal.find(".subjectInput").on("input", (e) => {
            if (!$modal.find(".subjectInput").is(":visible")) return; // ENG-8642
            let $input = $(e.currentTarget);
            let val = $input.val();
            let remaining = this._getRemaining(val);

            if (remaining < 0) {
                $input.val(val.slice(0, this._subjectLimit));
                remaining = 0;
            }
            $modal.find(".remainingChar").text(remaining);
        });

        // submit buttons
        $modal.find('.confirm').click(() => {
            this._submitForm(false);
        });

        $modal.find('.download').click(() => {
            this._submitForm(true);
        });

        $modal.find(".refresh").click(() => {
            this.restore();
        });
    }

    private _getTickets(): XDPromise<any[]> {
        let deferred: XDDeferred<any[]> = PromiseHelper.deferred();
        let reqStr: string = JSON.stringify({userId: userIdUnique});

        adminTools.getTickets(reqStr)
        .then((ret) => {
            var oldTickets = [];

            if (ret.logs) {
                var logs = JSON.parse(ret.logs);
                if (logs.tickets) {
                    oldTickets = this._parseTicketList(logs.tickets);
                }
            }

            let sortFunc = this._sortTicket(true);
            oldTickets.sort(sortFunc);
            deferred.resolve(oldTickets);
        })
        .fail((err) => {
            console.error(err);
            deferred.resolve([]); // still resolve it
        });
        return deferred.promise();
    }

    private _parseTicketList(ticketList: any[]): any[] {
        ticketList.forEach((ticket) => {
            ticket.created_at = Date.parse(ticket.created_at);
            if (ticket.updated_at) {
                ticket.updated_at = Date.parse(ticket.updated_at);
                if (ticket.created_at !== ticket.updated_at) {
                    ticket.hasUpdate = true;
                }
            }
            ticket.author = "user";
            ticket.author_id = ticket.submitter_id;
        });

        return ticketList;
    }

    private _sortTicket(reverse: boolean): (a, b) => number {
        let flag: number = reverse ? 1 : -1;
        return (a, b) => {
            if (a.created_at < b.created_at) {
                return flag;
            } else if (a.created_at > b.created_at) {
                return -flag;
            } else {
                return 0;
            }
        }
    }

    private _getComments(oldTickets: any[]): XDPromise<any[]> {
        let deferred: XDDeferred<any[]> = PromiseHelper.deferred();
        let promises: XDPromise<string>[] = [];
        for (let i = 0; i < oldTickets.length; i++) {
            let ticket = oldTickets[i];
            if (ticket.hasUpdate) {
                promises.push(this.getTicket(ticket.id));
            } else {
                promises.push(PromiseHelper.resolve(ticket));
            }
        }

        PromiseHelper.when(...promises)
        .then((tixs: any[]) => {
            let allTix = [];
            for (let i = 0; i < tixs.length; i++) {
                if (!tixs[i]) {
                    continue;
                }
                let tixGroup = tixs[i];
                let userId = oldTickets[i].author_id;
                let modifiedTicket = [];
                modifiedTicket.push(oldTickets[i]);

                for (let j = 1; j < tixGroup.length; j++) {
                    tixGroup[j].created_at = Date.parse(tixGroup[j].created_at);
                    if (tixGroup[j].author_id === userId ||
                        tixGroup[j].from === "user") {
                        tixGroup[j].author = "user";
                    } else {
                        tixGroup[j].author = "xcalar";
                    }
                    modifiedTicket.push(tixGroup[j]);
                }

                allTix.push(modifiedTicket);
            }
            deferred.resolve(allTix);
        })
        .fail((...args) => {
            console.error(args);
            deferred.reject(args);
        });

        return deferred.promise();
    }

    private _listTickets(): void {
        let html: HTML = "";
        let tickets = this._tickets;
        for (let i = 0; i < tickets.length; i++) {
            html += this._getTicketRowHtml(tickets[i]);
        }
        // append empty row if no tickets found
        if (!tickets.length) {
            html = '<div class="row empty">' +
                        '<div class="td">' + MonitorTStr.NoTickets + '</div>' +
                    '</div>';
        }
        let $ticketIdSection = this._getTicketIdSection();
        $ticketIdSection.find(".tableBody").html(html);
        $ticketIdSection.find(".tableBody").scrollTop(0);
    }

    private _toggleTicketIdSection(): void {
        let $ticketIdSection = this._getTicketIdSection();
        if ($ticketIdSection.hasClass("inactive")) {
            $ticketIdSection.removeClass("inactive");
            $ticketIdSection.find(".tableBody .row").removeClass("xc-hidden");
            this._getCommentSection().addClass("inactive");
        }
    }

    private _toggleCommentSection(): void {
        let $commentSection = this._getCommentSection();
        if ($commentSection.hasClass("inactive")) {
            $commentSection.removeClass("inactive");
            let $ticketIdSection = this._getTicketIdSection();
            $ticketIdSection.addClass("inactive");

            let $selectedRow = $ticketIdSection.find(".radioButton.active").closest(".row");
            if ($selectedRow.length) {
                $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");
                $selectedRow.removeClass("xc-hidden");
            }
        }
    }

    // increase modal size when expanding a row
    private _resizeModal($row: JQuery): void {
        const maxHeight: number = 250;
        let rowHeight: number = $row.height();
        let tbodyHeight: number = $row.closest(".tableBody").height();
        if (rowHeight - tbodyHeight > 0 && tbodyHeight < maxHeight) {
            let $modal = this._getModal();
            let diff: number = maxHeight - tbodyHeight;
            let distFromBottom: number = $(window).height() -
                                 $modal[0].getBoundingClientRect().bottom;
            distFromBottom = Math.max(0, distFromBottom);

            $modal.height("+=" + Math.min(diff, distFromBottom));
            this._getTicketIdSection().addClass("expanded");
        }
    }

    protected _submitForm(download: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let genBundle: boolean = false;
        let issueType = this._getIssueType();
        let ticketId;
        let needsOrgCheck = false;
        let $ticketIdInput = this._getTicketIdInput();

        if (issueType === CommonTxtTstr.Existing) {
            let $radio = this._getTicketIdSection().find(".radioButton.active");
            if ($radio.length) {
                ticketId = parseInt($radio.find(".label").text());
            } else if ($ticketIdInput.val()) {
                ticketId = parseInt($ticketIdInput.val());
                needsOrgCheck = true;
            } else {
                StatusBox.show(MonitorTStr.SelectExistingTicket, this._getTicketIdSection().find(".tableBody"));
                return PromiseHelper.reject();
            }
        } else {
            ticketId = null;
        }

        let $modal = this._getModal();
        if ($modal.find('.genBundleBox .checkbox').hasClass('checked')) {
            genBundle = true;
        }
        let email = $modal.find(".emailInput").val().trim();
        if (ticketId) {
            email = null;
        }
        let subject = $modal.find(".subjectInput").val().trim();
        let comment = $modal.find('.xc-textArea').val().trim();
        let severity = this._getServerityList().find(".text").data("val");

        if (comment.length > this._descLimit) {
            StatusBox.show(xcStringHelper.replaceMsg(MonitorTStr.CharLimitErr, {
                "limit": xcStringHelper.numToStr(this._descLimit)
            }), $modal.find(".xc-textArea"));
            return PromiseHelper.reject();
        }

        let ticketObj: any = {
            "type": issueType,
            "ticketId": ticketId,
            "server": document.location.href,
            "email": email,
            "subject": subject,
            "comment": comment,
            "severity": severity,
            "needsOrgCheck": needsOrgCheck,
            "userIdName": userIdName,
            "userIdUnique": userIdUnique,
            "sessionName": WorkbookManager.getActiveWKBK(),
            "version": {
                "backendVersion": XVM.getBackendVersion(),
                "frontendVersion": XVM.getGitVersion(),
                "thriftVersion": XVM.getSHA()
            }
        };
        if (XVM.isDataMart()) {
            ticketObj.isDataMart = true;
            // allows for handling of aws marketplace
        }

        if (download) {
            ticketObj.xiLog = this._reverseLogs(Log.getAllLogs(true));
            this._downloadTicket(ticketObj);
            $modal.addClass("downloadSuccess");
            $modal.removeClass("downloadMode");
            xcUIHelper.showSuccess(SuccessTStr.DownloadTicket);
            return PromiseHelper.resolve();
        } else {
            this._modalHelper.disableSubmit();
            this._modalHelper.addWaitingBG();

            let time = Date.now();
            let bundleSendAttempted: boolean = false;
            let errHandled: boolean = false;

            this.fetchLicenseInfo()
            .then((licenseObj) => {
                if (needsOrgCheck && (!licenseObj || !licenseObj.organization)) {
                    this._ticketIDError(genBundle, bundleSendAttempted, {noOrg: true});
                    errHandled = true;
                    return PromiseHelper.reject();
                } else {
                    return this.submitTicket(ticketObj, licenseObj, false, false);
                }
            })
            .then((ret) => {
                if (ret.logs.indexOf("error") > -1) {
                    this._ticketError(genBundle, bundleSendAttempted, ret.logs);
                    errHandled = true;
                    return PromiseHelper.reject();
                }

                let ticketId: number | string;
                let admin: string;

                try {
                    var logs = JSON.parse(ret.logs);
                    ticketId = logs.ticketId;
                    admin = logs.admin;
                } catch (err) {
                    console.error(err);
                }

                if (!ticketId) {
                    ticketId = "N/A";
                }
                if (!admin) {
                    admin = "N/A";
                }

                if (genBundle) {
                    this._submitBundle(ticketId);
                    bundleSendAttempted = true;
                }

                let ticket = {
                    id: ticketId,
                    comment: comment,
                    created_at: time,
                    severity: severity,
                    subject: subject
                };
                this._appendTicketToList(ticket);
                let msg: string = MonitorTStr.TicketSuccess + "<br/>" +
                                MonitorTStr.TicketId + ": " + ticketId +
                                "<br/>" + MonitorTStr.AcctAdmin + ": " + admin;

                Alert.show({
                    title: SuccessTStr.SubmitTicket,
                    msgTemplate: msg,
                    isAlert: true,
                    isInfo: true
                });

                if (!$modal.hasClass("bundleError")) {
                    this._close();
                }
                deferred.resolve();
            })
            .fail(() => {
                if (!errHandled) {
                    this._ticketError(genBundle, bundleSendAttempted, null);
                }
                deferred.reject();
            })
            .always(() => {
                this._modalHelper.enableSubmit();
                this._modalHelper.removeWaitingBG();
            });
        }

        return deferred.promise();
    }

    private _ticketError(
        genBundle: boolean,
        bundleSendAttempted: boolean,
        logs: any
    ): void {
        let detail: string = "";
        if (logs) {
            try {
                let parsedLog = JSON.parse(logs);
                let error = parsedLog.error;
                if (error && typeof error === "object") {
                    detail = JSON.stringify(error);
                } else if (parsedLog.errorMessage) {
                    detail = parsedLog.errorMessage;
                } else {
                    detail = error;
                }
            } catch (err) {
                detail = "";
                console.warn(err);
            }
        }
        if (typeof detail === "string") {
            if (detail.indexOf("User does not belong") > -1) {
                this._ticketIDError(genBundle, bundleSendAttempted, {orgMisMatch: true});
                return;
            } else if (detail.indexOf("Ticket could not be found") > -1) {
                this._ticketIDError(genBundle, bundleSendAttempted, {ticketNotFound: true});
                return;
            }
        }

        let $modal = this._getModal();
        $modal.addClass('downloadMode');
        var msg = "Ticket failed, try downloading and uploading to " +
                  "ZenDesk.";
        if ($modal.is(":visible")) {
            StatusBox.show(msg, $modal.find('.download'), false, {
                highZindex: $modal.hasClass('locked'),
                detail: detail
            });
        } else {
            Alert.error('Submit Ticket Failed', msg + " " + detail);
        }
        if (genBundle && !bundleSendAttempted) {
            this._submitBundle(0);
        }
    }

    private _ticketIDError(
        genBundle: boolean,
        bundleSendAttempted: boolean,
        errorType: {
            noOrg?: boolean,
            orgMisMatch?: boolean,
            ticketNotFound?: boolean
        }
    ) {
        let msg: string;
        if (errorType.noOrg) {
            msg = MonitorTStr.TicketErr1;
        } else if (errorType.orgMisMatch) {
            msg = MonitorTStr.TicketErr2;
        } else if (errorType.ticketNotFound) {
            msg = MonitorTStr.TicketErr2;
        }

        let $modal = this._getModal();
        if ($modal.is(":visible")) {
            StatusBox.show(msg, $modal.find('.customTicketRow'), false, {
                highZindex: $modal.hasClass('locked')
            });
        } else {
            Alert.error('Submit Ticket Failed', msg);
        }
        if (genBundle && !bundleSendAttempted) {
            this._submitBundle(0);
        }
    }

    private _appendTicketToList(ticket: any): void {
        let ticketId: string = ticket.id;
        let groupFound: boolean = false;
        ticket.author = "user";
        let tickets = this._tickets;
        for (let i = 0; i < tickets.length; i++) {
            let curId = tickets[i][0].id;
            if (curId === ticketId) {
                tickets[i].push(ticket);
                this._updatedTickets[ticketId] = tickets[i];
                groupFound = true;
                break;
            }
        }
        if (!groupFound) {
            ticket.status = "new";
            tickets.unshift([ticket]);
            this._updatedTickets[ticketId] = tickets[0];
        }
        this._listTickets();
    }

    // after a fetch of all tickets, add in recently submitted tickets that are
    // not yet showing up as part of fetched tickets
    private _includeUpdatedTickets(): void {
        let ticketsToAdd = [];
        for (let ticketId in this._updatedTickets) {
            ticketsToAdd.push(this._updatedTickets[ticketId]);
        }
        // this is the opposite order of "tickets"
        let sortFunc = this._sortTicket(false);
        ticketsToAdd.sort(sortFunc);

        let tickets = this._tickets;
        for (let i = 0; i < ticketsToAdd.length; i++) {
            let ticket = null;
            let ticketIndex;
            for (let j = 0; j < tickets.length; j++) {
                if (tickets[j][0].id === ticketsToAdd[i][0].id) {
                    ticket = tickets[j];
                    ticketIndex = j;
                    break;
                }
            }
            if (ticket) {
                if (ticket.length < ticketsToAdd[i].length) {
                    // if updated ticket has more comments then replace old
                    // ticket with new one
                    tickets[ticketIndex] = ticketsToAdd[i];
                } else {
                    // current ticket is updated, so we can remove this ticket
                    // from updatedTickets
                    delete this._updatedTickets[ticketsToAdd[i][0].id];
                }
            } else {
                tickets.unshift(ticketsToAdd[i]);
            }
        }
    }

    private _getIssueType(): string {
        return this._getModal().find('.issueList .text').val();
    }

    private _submitBundleSuccess(alertMsg: string): void {
        Alert.show({
            title: SuccessTStr.BundleGenerated,
            msg: alertMsg,
            isAlert: true,
            isInfo: true
        });
    }

    private _submitBundle(ticketId: number | string): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        $("#helpAreaMenu").find(".supTicket").addClass("xc-disabled");
        let mgmtdRet;
        let prevConfig = Admin.getConfigParam("SendSupportBundle");
        let restoreConfig = false;
        if (prevConfig && prevConfig.paramValue === "false") {
            restoreConfig = true;
        }
        PromiseHelper.alwaysResolve(XcalarSetConfigParams("SendSupportBundle", "true"))
        .then(() => {
            // xcalarSupportGenerate has an alert on success
            return XcalarSupportGenerate(false, ticketId);
        })
        .then((ret) => {
            mgmtdRet = ret;
            deferred.resolve(ret);
        }, () => {
            let innerDeferred = PromiseHelper.deferred();
            HTTPService.Instance.ajax({
                "type": "POST",
                "contentType": "application/json",
                "url": xcHelper.getAppUrl() + "/service/bundle",
                success: (data) => {
                    data = this._parseSuccessData(data);
                    innerDeferred.resolve(data.logs);
                },
                error: (xhr) => {
                    let data = this._parseErrorData(xhr);
                    innerDeferred.reject(data.logs);
                }
            });
            return innerDeferred.promise();
        })
        .then((ret) => {
            if (mgmtdRet != null) {
                let msg: string = SuccessTStr.BundleUploaded + mgmtdRet.supportBundleSent;
                this._submitBundleSuccess(msg);
            } else {
                this._submitBundleSuccess(ret);
                deferred.resolve(ret);
            }
        })
        .fail((err) => {
            let $modal = this._getModal();
            if ($modal.is(":visible")) {
                this._modalHelper.removeWaitingBG();
                $modal.addClass("bundleError");
                let error: string = "";
                if (err && err.error) {
                    error = " " + err.error;
                }
                $modal.find(".errorText").text(ErrTStr.BundleFailed + error);
            } else {
                Alert.error(ErrTStr.BundleFailed, err);
            }
            deferred.reject(err);
        })
        .always(() => {
            $("#helpAreaMenu").find(".supTicket").removeClass("xc-disabled");
            if (restoreConfig) {
                XcalarSetConfigParams("SendSupportBundle", "false");
            }
        });

        return deferred.promise();
    }

    private _downloadTicket(ticketObj): void {
        ticketObj.time = new Date();
        xcHelper.downloadAsFile("xcalarTicket.txt", JSON.stringify(ticketObj));
    }

    // ticket consists of a group of tickets with the same id;
    private _getTicketRowHtml(ticket: any): HTML {
        let className: string = "";
        let isClosed: boolean = false;
        if (ticket[0] && isNaN(parseInt(ticket[0].id))) {
            className += " invalid";
        }
        if (ticket[0] && ticket[0].status === "closed") {
            className += " closed ";
            isClosed = true;
        }
        let html: HTML = '<div class="row ' + className + '">';
        for (let i = 0; i < ticket.length; i++) {
            let time = moment(ticket[i].created_at).format("M-D-Y h:mm A");
            html += '<div class="innerRow">' +
              '<div class="td">';
            if (i === 0) {
                let radioTip: string = "";
                if (isClosed) {
                    radioTip = 'data-toggle="tooltip" data-container="body" ' +
                               'data-placement="auto top" data-original-title="' +
                               MonitorTStr.ClosedTicket + '"';
                }
                html += '<div class="radioButtonGroup" ' + radioTip + '>' +
                          '<div class="radioButton" data-option="blank">' +
                            '<div class="radio">' +
                              '<i class="icon xi-radio-selected"></i>' +
                              '<i class="icon xi-radio-empty"></i>' +
                            '</div>' +
                            '<div class="label">' + ticket[i].id + '</div>' +
                          '</div>' +
                        '</div>';
            }

            html += '</div>';

            let commentSection: string = "";
            let comment = xcStringHelper.escapeHTMLSpecialChar(ticket[i].comment);
            if (i === 0) {
                let status: string = ticket[i].status || "open";
                html += '<div class="td status">' + status + '</div>';
                commentSection = '<div class="subject"><span class="semibold">' +
                                 MonitorTStr.Subject + ': </span>' +
                                 ticket[i].subject + '</div>';
                let severity: string = "";
                if (ticket[i].severity != null &&
                    MonitorTStr["Severity" + ticket[i].severity]) {
                    severity = '<div class="severity" data-toggle="tooltip" ' +
                            'data-placement="auto top" data-container="body" ' +
                            'data-original-title="' + MonitorTStr["Severity" +
                            ticket[i].severity] + '"><span class="semibold">' +
                            MonitorTStr.Severity + ': </span> ' +
                            ticket[i].severity + '</div>';
                } else {
                    severity = '<div class="severity unavailable"></div>';
                }
                commentSection += severity;
                commentSection = '<div class="subjectWrap">' + commentSection + '</div>';
                commentSection += '<div class="comment"><span class="semibold">' + OpFormTStr.Descript + ':</span> ' + comment + '</div>';

            } else {
                html += '<div class="td status"></div>';
                if (ticket[i].author === "user") {
                    comment = "<span class='semibold'>Comment</span> (You): " + comment;
                } else {
                    comment = "<span class='semibold'>Comment</span> (Xcalar): " + comment;
                }
                commentSection = '<div class="comment">' + comment + '</div>';
            }

            html += '<div class="td time" data-toggle="tooltip" ' +
            'data-container="body" data-placement="auto top" data-original-title="' +
                time + '" data-time="' + ticket[i].created_at + '">'+
                moment(ticket[i].created_at).fromNow() + '</div>' +
              '<div class="td details">' +
                '<div class="text">' + commentSection + '</div>';
            if (i === 0) {
                html += '<span class="expand xc-action">' +
                            '<i class="icon xi-arrow-down fa-7"></i>' +
                        '</span>';
            }
            html += '</div>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    private _updateTimes(): void {
        this._getModal().find(".time").each((_i, el) => {
            let time = $(el).data("time");
            $(el).html(moment(time).fromNow());
        });
    }

    private _parseSuccessData(data: {logs: any}): {logs: any} {
        if (data.logs) {
            data.logs = atob(data.logs);
        }
        return data;
    }

    private _parseErrorData(xhr: JQueryXHR): any {
        let data;
        if (xhr.responseJSON) {
            data = xhr.responseJSON;
            if (data.logs) {
                data.logs = atob(data.logs);
            }
        } else {
            data = {
                "status": xhr.status,
                "logs": xhr.statusText,
                "unexpectedError": true
            };
        }
        return data;
    }

    private _reverseLogs(logs: any): any {
        try {
            for (var key in logs) {
                if (logs[key] instanceof Array) {
                    logs[key] = logs[key].reverse();
                }
            }
            return logs;
        } catch (e) {
            console.error(e);
            return logs;
        }
    }
}