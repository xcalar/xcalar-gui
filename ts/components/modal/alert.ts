namespace Alert {
    let modalHelper: ModalHelper;
    let hasSetup: boolean = false;

    interface AlertButton {
        name: string; // name of the button
        func: Function; // callback to trigger when click,
        className?: string; // class of the button
        tooltip?: string; // tooltip to add
    }

    interface BasicAlertOptions {
        onConfirm?: Function; // callback to trigger when click confirm button
        onCancel?:  Function; // callback to trigger when click cancel button
        lockScreen?: boolean; // if screen should be frozen
        browserError?: boolean; // if screen should be frozen
        highZindex?: boolean; // if true then will set z-index above locked background modal,
        ultraHighZindex?: boolean; // if true then will set z-index above locked waiting screen
        align?: string; // it is left, with do left align,
        preSpace?: boolean; // if true then set white-space:pre to preserve whitespaces
        sizeToText?: boolean; // when set true, size the modal to align text
        noLogout?: boolean; // remove log out button when  set true
        noCancel?: boolean; // remove cancel button
        expired?: boolean; // expire license case
        logout?: boolean; // want user to logout case
        msgTemplate?: string; // can include html tags
        buttons?: AlertButton[]; // buttons to show instead of confirm button,
        isInfo? : boolean; // show nice info icon and not a warning icon
        links?: any; // map of links and callbacks when clicked
    }

    export interface AlertOptions extends BasicAlertOptions {
        title: string; // title of the alert
        instr?: string; // instruction information
        instrTemplate?: string; // instead of change instr text, change it's html
        msg?: string; // alert content
        detail?: string; // detail of the error/message
        isAlert?: boolean; // if it is an alert or a confirm. Alerts use "close" btns instead of cancel
        isCheckBox?: boolean; // if checkbox is enabled or disabled
        hideButtons?: string[]; // array of button class names to hide, values can be: logout, downloadLog, or cancel
        size?: string; // "small", "medium", "large" (widths)
    }

    export interface AlertErrorOptions extends BasicAlertOptions {
        isCheckBox?: boolean; // if checkbox is enabled or disabled
        detail?: string; // detail of the error/message
    }
    /**
     * Alert.setup
     */
    export function setup(): void {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        const $modal: JQuery = getModal();
        modalHelper = new ModalHelper($modal, {
            "center": {"verticalQuartile": true},
            "sizeToDefault": true
        });

        $("#alertDetail .detailAction").click(() => {
            $modal.toggleClass("expandDetail");
        });
    }

    /**
     * Alert.show
     * @param options
     */
    export function show(options: AlertOptions = <AlertOptions>{}): string {
        if (!hasSetup) {
            setup();
        }
        const $modal = getModal();
        if (options.noLogout) {
            $modal.find(".btn.logout").remove();
        }

        if (isModalLocked($modal)) {
            return $modal.data("id");
        }

        const id: string = setModalId($modal);

        // call it here because Alert.show() may be called when another alert is visible
        reset();
        setTitle(options.title);
        setInfoIcon(false, options.isInfo);
        setMessage(options.msg, options.msgTemplate);
        setDetail($modal, options.detail);
        setInstruction($modal, options.instr, options.instrTemplate);
        setCheckBox($modal, options.isCheckBox);
        setButtons($modal, options);
        setLinks($modal, options);

        if (options.lockScreen) {
            setLockScreen($modal);
        }
        setZIndex($modal, options);
        setTextAlign(options.align, options.preSpace);
        modalHelper.setup(getExtraOptions(options));

        setButtonSize($modal);
        setModalSize($modal, options.sizeToText, options);
        modalHelper.center({verticalQuartile: true});
        return id;
    }

    /**
     * Alert.error
     * @param title
     * @param error
     * @param options
     */
    export function error(
        title: string,
        error: string | object,
        options: AlertErrorOptions = {}
    ): string {
        let msg: string;
        let log: string = null;

        if (error != null && typeof error === "object") {
            const e: any = <any>error;
            // if it's an try/catch error, code will also goes here
            if (e.error && typeof e.error === "string") {
                msg = e.error;
            } else {
                if (e instanceof Error) {
                    msg = e.message;
                }
                if (!msg) {
                    msg = AlertTStr.ErrorMsg;
                }
            }
            log = e.log;
            if (!e.log) {
                log = e.stack;
            }
        } else {
            msg = <string>error;
            log = options.detail;
        }

        if (msg === undefined) {
            msg = title;
        }

        const alertOptions: AlertOptions = $.extend(options, {
            title: title,
            msg: msg,
            detail: log,
            isAlert: true
        });
        const $modal = getModal();
        if (isModalLocked($modal)) {
            return $modal.data("id");
        }

        const id: string = Alert.show(alertOptions);
        setInfoIcon(true, false);
        if (typeof mixpanel !== "undefined") {
            let errorMsg: string = msg;
            if (msg == null && options && options.msgTemplate) {
                msg = JSON.stringify(options.msgTemplate);
            }
            xcMixpanel.errorEvent("alertError", {
                title: title || AlertTStr.Title,
                errorMsg: errorMsg
            });
        }
        return id;
    }

    /**
     * Alert.forceClose
     */
    export function forceClose() {
        closeModal();
        const $modal: JQuery = getModal();
        const $modalBg: JQuery = getModalBg();
        $modal.removeClass("locked");
        $modalBg.removeClass("locked");
    }

    /**
     * Alert.hide
     * hides the alert modal but doesn't close/reset it
     */
    export function hide() {
        const $modal: JQuery = getModal();
        $modal.addClass("xc-hidden");
    }

    /**
     * Alert.unhide
     */
    export function unhide() {
        const $modal: JQuery = getModal();
        $modal.removeClass("xc-hidden");
    }

    /**
     * Alert.updateMsg
     * @param id
     * @param msg
     */
    export function updateMsg(id: string, msg: string): boolean {
        const $modal: JQuery = getModal();
        if (id == null || $modal.data("id") !== id) {
            console.error("wrong alert id!");
            return false;
        }
        $("#alertContent .text").text(msg);
        return true
    }

    /**
     * Alert.isOpen
     */
    export function isOpen(): boolean {
        const $modal: JQuery = getModal();
        return $modal.is(":visible");
    }

    function closeModal(): void {
        modalHelper.clear({"close": () => {
            // alert modal has its own closer
            return closeHelper();
        }});
        const $modal: JQuery = getModal();
        $modal.removeData("id");
    }

    function closeHelper(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $modal: JQuery = getModal();
        if (hasOtherModalOpen()) {
            // apart from alert modal, other modal is on
            $modal.hide();
            deferred.resolve();
        } else {
            const fadeOutTime: number = gMinModeOn ? 0 : 300;
            const $modalBg: JQuery = getModalBg();
            $modal.hide();
            $modalBg.fadeOut(fadeOutTime, deferred.resolve);
        }

        return deferred.promise();
    }

    function reset(): void {
        const $modal = getModal();
        const $btnSection = getButtonSection();
        $btnSection.find(".funcBtn").remove();
        $btnSection.find(".support").remove();
        // remove all event listener
        $modal.off(".alert");
        $modal.find(".confirm, .cancel, .close").show();
    }

    function getModal(): JQuery {
        return  $("#alertModal");
    }

    function getModalBg(): JQuery {
        return $("#modalBackground");
    }

    function getButtonSection(): JQuery {
        return $("#alertActions");
    }

    function getAlertContent(): JQuery {
        return $("#alertContent");
    }

    function getCheckBox(): JQuery {
        return $("#alertCheckBox");
    }

    function getExtraOptions(options: AlertOptions): object {
        const extraOptions: object = {};
        if (options.lockScreen) {
            extraOptions['noEsc'] = true;
        }
        return extraOptions;
    }

    function isModalLocked($modal: JQuery): boolean {
        if ($modal.hasClass("locked")) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            const $modalBg: JQuery = getModalBg();
            $modalBg.show();
            $modalBg.addClass("locked");
            // alert modal is already opened and locked due to connection error
            return true;
        } else {
            return false;
        }
    }

    function hasOtherModalOpen(): boolean {
        return $(".modalContainer:visible:not(#alertModal):" +
        "not(.noBackground)").length > 0 &&
        $(".modalBackground:not(#modalBackground)").length === 0; // XXX a hack to exclude react modal
    }

    // set modal id
    function setModalId($modal: JQuery): string {
        const id: string = "alert" + new Date().getTime();
        $modal.data("id", id);
        return id;
    }

    function setLockScreen($modal: JQuery): void {
        const $modalBg: JQuery = getModalBg();
        $modal.addClass("locked");
        $modalBg.addClass("locked");
        $("#container").addClass("locked");
        // should not show initial screen
        $("#initialLoadScreen").hide();
    }

    function setZIndex($modal: JQuery, options: AlertOptions): void {
        if (options.highZindex) {
            $modal.addClass("highZindex");
        } else {
            $modal.removeClass("highZindex");
        }
        if (options.ultraHighZindex) {
            $modal.addClass("ultraHighZindex");
        } else {
            $modal.removeClass("ultraHighZindex");
        }
    }

    function setTextAlign(align: string, preSpace: boolean): void {
        const $text: JQuery = $("#alertContent .text");
        if (align === "left") {
            $text.addClass("left-align");
        } else {
            $text.removeClass("left-align");
        }
        if (preSpace) {
            $text.addClass("preSpace")
        }
    }

    function setButtonSize($modal) {
        if ($modal.find("button:visible").length > 3) {
            $modal.addClass("flex");
        } else {
            $modal.removeClass("flex");
        }
    }

    function setModalSize($modal: JQuery, sizeToText: boolean, options): void {
        if (options.size && options.size === "large") {
            $modal.width(800);
        }
        if (typeof isBrowserIE !== 'undefined' && isBrowserIE) { // all text will be on 1 line otherwise
            const width: number = $modal.width();
            setTimeout(() => {
                $modal.width(parseInt(<any>width) + 1);
                setTimeout(() => {
                    $modal.width(width);
                });
            });
        } else if (sizeToText) {
            const $section: JQuery = $("#alertContent");
            const diff: number = $section.find(".text").outerHeight() - $section.height();
            if (diff > 0) {
                const height: number = Math.min($modal.height() + diff + 10, $(window).height() - 100);
                $modal.height(height);
                modalHelper.center({verticalQuartile: true});
            }
        } else if ($modal.find(".modalBottom button").length >= 4) {
            // make it larger size
            $modal.width(650);
            $modal.resizable( "option", "minWidth", 650);
        } else {
            $modal.width(500);
            $modal.resizable( "option", "minWidth", 500);
        }
    }

    function setTitle(title: string): void {
        const modalTitle: string = title || AlertTStr.Title;
        $("#alertHeader").find(".text").html(modalTitle);
    }

    function setInfoIcon(isError: boolean, isInfo: boolean) {
        let $infoIcon = $("#alertHeader").find(".infoIcon");
        $infoIcon.removeClass("info error xi-info-circle-outline xi-warning");
        if (isError) {
            $infoIcon.addClass("error xi-info-circle-outline");
        } else {
            if (isInfo) {
                $infoIcon.addClass("info xi-info-circle-outline");
            } else {
                $infoIcon.addClass("xi-warning");
            }
        }
    }

    function setMessage(msg: string | null, msgTemplate?: string): void {
        const $alertContent: JQuery = getAlertContent();
        if (msgTemplate) {
            // put inside span so innerHtml isn't affected by flexbox
            $alertContent.find(".text").html('<span>' + msgTemplate + '</span>');
        } else {
            $alertContent.find(".text").empty().text(msg || '');
        }
    }

    function setDetail($modal: JQuery, detail: string): void {
        const $text = $("#alertDetail").find(".detailContent");
        if (detail) {
            $modal.addClass("hasDetail").removeClass("expandDetail");
            $text.text(detail);
        } else {
            $modal.removeClass("hasDetail").removeClass("expandDetail");
            $text.text("");
        }
    }

    function setInstruction(
        $modal: JQuery,
        instr: string,
        instrTemplate: string
    ): void {
        const $alertInstr: JQuery = $("#alertInstruction");
        if (instr || instrTemplate) {
            if (instrTemplate) {
                $alertInstr.find(".text").html(instrTemplate);
            } else {
                $alertInstr.find(".text").text(instr);
            }
            $alertInstr.show();
            $modal.addClass("hasInstr");
        } else {
            $alertInstr.hide();
            $modal.removeClass("hasInstr");
        }
    }

    function setCheckBox($modal: JQuery, isCheckBox: boolean): void {
        // set checkbox,  default is unchecked
        const $checkbox: JQuery = getCheckBox();
        $checkbox.find(".checkbox").removeClass("checked");
        if (isCheckBox) {
            $modal.on("click.alert", ".checkboxSection", function(event) {
                event.stopPropagation();
                $(this).find(".checkbox").toggleClass("checked");
            });
            $checkbox.show();
            $modal.addClass("hasCheckbox");
        } else {
            $checkbox.hide();
            $modal.removeClass("hasCheckbox");
        }
    }

    function isCheckBoxChecked(options: AlertOptions): boolean {
        let hasChecked = null;
        if (options.isCheckBox) {
            const $checkbox: JQuery = getCheckBox();
            hasChecked = $checkbox.find(".checkbox").hasClass("checked");
        }
        return hasChecked;
    }


    function setButtons($modal: JQuery, options: AlertOptions): void {
        // set close and cancel button
        $modal.on("click.alert", ".close, .cancel", (event) => {
            event.stopPropagation();
            closeModal();
            if (options.onCancel instanceof Function) {
                let hasChecked = isCheckBoxChecked(options);
                options.onCancel(hasChecked);
            }
        });

        // set confirm button
        $modal.on("click.alert", ".confirm", (event) => {
            event.stopPropagation();
            closeModal();
            if (options.onConfirm instanceof Function) {
                let hasChecked = isCheckBoxChecked(options);
                options.onConfirm(hasChecked);
            }
        });

        const $btnSection: JQuery = getButtonSection();
        const $confirmBtn: JQuery = $btnSection.find(".confirm");

        if (options.noCancel) {
            $modal.find(".close, .cancel").hide();
        }

        if (options.buttons) {
            if (options.isAlert) {
                $modal.find(".cancel").text(AlertTStr.Close);
            } else {
                $modal.find(".cancel").text(AlertTStr.Cancel);
            }

            $confirmBtn.hide();
            options.buttons.forEach((btnOption: AlertButton) => {
                let className: string = "funcBtn";
                if (btnOption.className) {
                    className += " " + btnOption.className;
                }

                const $btn: JQuery = $confirmBtn.clone();
                $btnSection.prepend($btn);

                $btn.show()
                    .text(btnOption.name)
                    .addClass(className);
                $btn.click((event) => {
                    event.stopPropagation();
                    closeModal();
                    if (btnOption.func instanceof Function) {
                        let hasChecked = isCheckBoxChecked(options);
                        btnOption.func(hasChecked);
                    }
                });
                if (btnOption.tooltip) {
                    xcTooltip.add($btn, {title: btnOption.tooltip});
                }
            });
        } else if (options.isAlert) {
            $modal.find(".cancel").text(AlertTStr.Close);
            $confirmBtn.hide();
        } else {
            $modal.find(".cancel").text(AlertTStr.Cancel);
        }

        // lock screen if necessary
        if (options.lockScreen) {
            $modal.find(".close").hide();
        }

        if (options.lockScreen || options.browserError) {
            $modal.find(".cancel").hide();
            $confirmBtn.hide();

            const $downloadLogBtn: JQuery = supportButton("log");
            const $logoutBtn: JQuery = supportButton(null);
            const $supportBtn: JQuery = supportButton("support");
            let $adminBtn: JQuery = $();
            let $resetBtn: JQuery = $();

            if (Admin.hasSetup() && Admin.isAdmin()) {
                $adminBtn = supportButton("admin");
            }

            if (XVM.isCloud()) {
                $resetBtn = supportButton('reset');
            }

            if (options.expired) {
                $btnSection.prepend($adminBtn, $logoutBtn);
            } else if (options.logout) {
                $btnSection.prepend($adminBtn, $logoutBtn, $downloadLogBtn, $resetBtn, $supportBtn);
            } else if (options.noLogout) {
                $btnSection.prepend($adminBtn, $downloadLogBtn, $resetBtn, $supportBtn);
            } else {
                $btnSection.prepend($adminBtn, $downloadLogBtn, $resetBtn, $logoutBtn, $supportBtn);
            }
        }

        if (options.hideButtons) {
            for (var i = 0; i < options.hideButtons.length; i++) {
                $modal.find("." + options.hideButtons[i]).hide();
            }
        }
    }

    function setLinks($modal: JQuery, options: AlertOptions) {
        $modal.on("click.alert", ".actionLink", (event) => {
            if (!options.links) {
                return;
            }
            let callbackName = $(event.target).closest(".actionLink").data("name");
            let callback = options.links[callbackName];
            if (callback instanceof Function) {
                callback();
                closeModal();
            }
        });
    }

    /**
     *
     * @param type
     */
    function supportButton(type: string): JQuery {
        let $btn: JQuery;
        let html: string;

        switch (type) {
            case 'log':
                // download log button
                html = '<button type="button" class="btn btn-secondary support downloadLog">' +
                            CommonTxtTstr.DownloadLog +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();

                    const logCaches: {
                        logs: XcLog[],
                        errors: XcLog[],
                        overwrittenLogs: XcLog[],
                        version?: string
                    } = Log.getAllLogs();
                    let log: string;
                    if (logCaches['logs'].length === 0 &&
                        logCaches['errors'].length === 0)
                    {
                        log = Log.getLocalStorage() || Log.getBackup() || "";
                    } else {
                        log = JSON.stringify(logCaches);
                    }

                    xcHelper.downloadAsFile("xcalar.log", log);
                    xcUIHelper.showSuccess(SuccessTStr.Copy);
                });
                break;
            case 'support':
                // generate bundle button
                html = '<button type="button" class="btn btn-secondary support genSub" ' +
                        'data-toggle="tooltip" title="' +
                        TooltipTStr.FileTicket + '">' +
                            CommonTxtTstr.FileTicket +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    SupTicketModal.Instance.show();
                    $(this).blur();
                    MonitorPanel.stop();
                });
                break;
            case 'admin':
                html = '<button type="button" class="btn btn-secondary support adminTool">' +
                            CommonTxtTstr.AdminTool +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    Alert.forceClose();
                    Admin.showModal(true);
                });
                break;
            case 'reset':
                html = '<button type="button" class="btn btn-secondary support reset">' +
                            CommonTxtTstr.Reset +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    LogoutModal.Instance.show();
                });
                break;
            default:
                // log out button
                html = '<button type="button" class="btn btn-secondary support logout">' +
                            CommonTxtTstr.LogOut +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();
                    if (XcUser.CurrentUser != null) {
                        XcUser.CurrentUser.logout();
                    } else {
                        xcManager.unload();
                    }
                });
                break;
        }

        return $btn;
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.supportButton = supportButton;
    }
}
