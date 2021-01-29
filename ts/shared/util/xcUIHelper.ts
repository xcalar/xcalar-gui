namespace xcUIHelper {

    export interface PrettifyOptions {
        inArray?: any;
        comparison?: boolean;
        checkboxes?: boolean;
        noQuotes?: boolean;
    }

   interface FillInputFromCellOptions {
        type: string;
        append: boolean;
    }

    export interface RadioButtonOption {
        deselectFromContainer: boolean;
    }

    export interface SuccessTimer {
        step1: any;
        step2: any;
        step3: any;
        step4: any;
    }

    /**
     * xcUIHelper.disableSubmit
     * @param $submitBtn
     */
    export function disableSubmit($submitBtn: JQuery) {
        if ($submitBtn.is('button')) {
            $submitBtn.prop('disabled', true);
        } else {
            $submitBtn.addClass('xc-disabled');
        }
    }

    /**
     * xcUIHelper.enableSubmit
     * @param $submitBtn
     */
    export function enableSubmit($submitBtn: JQuery) {
        $submitBtn.prop('disabled', false);
        if ($submitBtn.is('button')) {
            $submitBtn.prop('disabled', false);
        } else {
            $submitBtn.removeClass('xc-disabled');
        }
    }

    /**
     * xcUIHelper.disableElement
     * @param $el
     * @param tooltip
     */
    export function disableElement($el: JQuery, tooltip?: string, isEmpty?: boolean): void {
        $el.addClass("unavailable");
        if (!isEmpty) {
            tooltip = (tooltip == null)? StatusMessageTStr.PleaseWait : tooltip;
        }

        if (tooltip != null) {
            const oldTooltip = $el.attr("data-original-title") || $el.attr("data-title") || $el.attr("title");
            if (oldTooltip) {
                $el.data("lastmessage", oldTooltip);
                xcTooltip.changeText($el, tooltip);
            } else {
                $el.data("lastmessage", null);
                xcTooltip.add($el, {title: tooltip});
            }
            $el.data("hasdisabledtooltip", true);
        } else {
            $el.data("lastmessage", null);
        }
    }

        /**
     * xcUIHelper.enableElement
     * @param $el
     */
    export function enableElement($el): void {
        $el.removeClass("unavailable");
        if ($el.data("hasdisabledtooltip")) {
            const lastMessage = $el.data("lastmessage");
            if (lastMessage) {
                xcTooltip.changeText($el, lastMessage);
            } else {
                xcTooltip.remove($el);
            }
            $el.removeData("hasdisabledtooltip");
            $el.removeData("lastmessage");
        }
    }

    /**
     * xcUIHelper.disableScreen
     * @param $area
     */
    export function disableScreen($area: JQuery, options?): JQuery {
        options = options || {};
        let classes = options.classes || "";
        classes = "xc-waitingBG " + classes;
        const $waitingBg: JQuery = $('<div class="' +  classes + '">' +
            '<div class="waitingIcon"></div>' +
        '</div>');
        let selector;
        if (options.id) {
            $waitingBg.attr("id", options.id);
            selector = "#" + options.id;
        } else {
            selector = ".classes";
        }
        if (options.styles) {
            for (let attr in options.styles) {
                $waitingBg.css(attr, options.styles[attr]);
            }
        }
        // check if the element exists
        let $prevElement = $(selector);
        if ($prevElement.length) {
            // if already exists, increase the lock count by 1. Later, if we try to
            // remove and lock count is > 0, then we decrease the lock count
            // and don't remove until count is set to 0
            if (!$prevElement.data("bglock")) {
                $prevElement.data("bglock", 1);
            } else {
                $prevElement.data("bglock", $prevElement.data("bglock" + 1));
            }
            return;
        }

        $area.append($waitingBg);
        setTimeout(() => {
            $waitingBg.find(".waitingIcon").fadeIn();
        }, 200);
        return $waitingBg;
    }

    /**
     * xcUIHelper.enableScreen
     * @param $waitingBg
     */
    export function enableScreen($waitingBg: JQuery): XDPromise<any> {
        if ($waitingBg.data("bglock")) {
            // bg has a lock count, which means it needs to wait for more
            // enableScreen calls to get unlocked
            $waitingBg.data("bglock", $waitingBg.data("bglock") - 1);
            return;
        }
        const deferred = PromiseHelper.deferred();
        $waitingBg.fadeOut(200, function() {
            $(this).remove();
            deferred.resolve();
        });
        return deferred.promise();
    }

    var successTimers: SuccessTimer = <SuccessTimer>{};

    /**
     * xcUIHelper.hideSuccessBox
     */
    export function hideSuccessBox(): void {
        const $successMessage: JQuery = $('#successMessageWrap');
        $successMessage.removeClass("active");
        for (let timer in successTimers) {
            clearTimeout(successTimers[timer]);
        }
    }


     /**
     * xcUIHelper.showSuccess
     * @param msg
     */
    export function showSuccess(msg: string): void {
        showSuccessBoxMessage(true, msg);
    }

    /**
     * xcUIHelper.showFail
     * @param msg
     */
    export function showFail(msg: string): void {
        showSuccessBoxMessage(false, msg);
    }

    function showSuccessBoxMessage(isSuccess: boolean, msg: string): void {
        const $successMessage: JQuery = $('#successMessageWrap');
        xcUIHelper.hideSuccessBox();
        if (!isSuccess) {
            $successMessage.addClass('failed');
        } else {
            $successMessage.removeClass("failed");
        }
        $successMessage.addClass("active");
        if (msg) {
            $successMessage.find('.msg').text(msg);
        } else {
            $successMessage.find(".msg").text("");
        }

        successTimers.step4 = setTimeout(function() {
            xcUIHelper.hideSuccessBox();
        }, 2200);
    }

    /**
     * xcUIHelper.scrollIntoView
     * for scrolling list items vertically into view, expecting $list to have
     * position relative or absolute
     * @param $item
     * @param $list
     */
    export function scrollIntoView($item: JQuery, $list: JQuery) {
        // outer to include padding
        const listHeight: number = $list.outerHeight();
        const scrollTop: number = $list.scrollTop();
        const itemOffsetTop: number = $item.position().top;
        if (itemOffsetTop > (listHeight - 25)) {
            $list.scrollTop(itemOffsetTop + scrollTop - (listHeight / 2) + 30);
        } else if (itemOffsetTop < -5) {
            $list.scrollTop(scrollTop + itemOffsetTop - (listHeight / 2));
        }
    }

    /**
     * xcUIHelper.scrollToBottom
     * @param $target
     */
    export function scrollToBottom($target: JQuery): void {
        const scrollDiff: number = $target[0].scrollHeight - $target.height();
        if (scrollDiff > 0) {
            // at least 11 pixels for scrollbar
            const horzScrollBar: number = 20;
            $target.scrollTop(scrollDiff + horzScrollBar);
        }
    }

    /**
     * xcUIHelper.hasSelection
     */
    export function hasSelection(): boolean {
        let selection: Selection;
        if (window.getSelection) {
            selection = window.getSelection();
        } else if (document['selection']) {
            selection = document['selection'].createRange();
        }
        return (selection.toString().length > 0);
    }

    /**
     * xcUIHelper.removeSelectionRange
     */
    export function removeSelectionRange(): void {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * xcUIHelper.disableTextSelection
     * lobally prevents all text from being selected and disables all inputs
     */
    export function disableTextSelection() {
        xcUIHelper.removeSelectionRange();
        const style: string =
            '<style id="disableSelection" type="text/css">*' +
                '{ -ms-user-select:none;-moz-user-select:-moz-none;' +
                '-khtml-user-select:none;' +
                '-webkit-user-select:none;user-select:none;}' +
                'div[contenteditable]{pointer-events:none;}' +
            '</style>';
        $(document.head).append(style);
        $('.tooltip').remove();
        $('input:enabled').prop('disabled', true).addClass('tempDisabledInput');
    }

    /**
     * xcUIHelper.reenableTextSelection
     */
    export function reenableTextSelection(): void {
        $('#disableSelection').remove();
        $('.tempDisabledInput').removeClass('tempDisabledInput')
                               .prop('disabled', false);
    }

    /**
    * xcUIHelper.fillInputFromCell
    * @param  {$element} $target $element you're picking/clicking
    * @param  {$element} $input  input to be filled in with picked text
    * @param  {string} prefix  prefix to prepend to picked text
    * @param  {object} options:
    *         type: string, if "table", will pick from table header
    *         append: boolean, if true, will append text rather than replace
    */
    export function fillInputFromCell(
        $target: JQuery,
        $input: JQuery,
        prefix: string = "",
        options: FillInputFromCellOptions = <FillInputFromCellOptions>{}
    ) {
        if ($target == null || $input == null || !$input.is(":visible")) {
            // if user tries to select column without focusing on input
            return false;
        }
        // $input needs class "argument"
        if ((!$input.hasClass('argument') && !$input.hasClass('arg')) ||
            $input.closest('.colNameSection').length !== 0 ||
            $input.attr('type') !== 'text'
        ) {
            return false;
        }

        const value = getValueFromCell($target, prefix, options);
        xcUIHelper.insertText($input, value, options.append);
        gMouseEvents.setMouseDownTarget($input);
        return true;
    }

     /**
     * xcUIHelper.getValueFromCell
     * @param  {$element} $target $element you're picking/clicking
     * @param  {string} prefix  prefix to prepend to picked text
     * @param  {object} options:
     *         type: string, if "table", will pick from table header
     *         append: boolean, if true, will append text rather than replace
     */
    export function getValueFromCell(
        $target: JQuery,
        prefix: string = '',
        options: FillInputFromCellOptions = <FillInputFromCellOptions>{}
    ) {
        if ($target == null || $target.length === 0) {
            return '';
        }
        let value: string;
        if (options.type === 'table') {
            $target = $target.find('.text');
            value = prefix + $target.data('title');
        } else if (options.type === "dag") {
            value = $target.data('tablename');
        } else {
            let $header: JQuery = $target.closest('.header');
            if ($header.length) {
                $target = $target.closest('.header').find('.editableHead');
            } else {
                var colNum = ColManager.parseColNum($target.closest('td'));
                $target = $target.closest('table')
                                .find('.editableHead.col' + colNum);
                $header = $target.closest('.header');
            }
            const $prefixDiv: JQuery = $header.find('.topHeader .prefix');
            const colPrefix: string = $prefixDiv.hasClass('immediate') ?
                                        "" : $prefixDiv.text();
            value = xcHelper.getPrefixColName(colPrefix, $target.val());
            value = prefix + value;
        }
        return value;
    }

        // inserts text into an input field and adds commas
    // detects where the current cursor is and if some text is already selected
    /**
     * xcUIHelper.insertText
     * @param $input
     * @param textToInsert
     * @param append
     */
    export function insertText(
        $input: JQuery,
        textToInsert: string,
        append: boolean = false
    ): void {
        const inputType: string = $input.attr('type');
        if (inputType !== 'text') {
            console.warn('inserting text on inputs of type: "' + inputType +
                        '" is not supported');
            return;
        }

        if (!append) {
            $input.val(textToInsert).trigger('input', {insertText: true});
            // fires input event in case any listeners react to it
            $input.focus();
            return;
        }

        const value: string = $input.val();
        const valLen: number = value.length;

        const initialScrollPosition: number = $input.scrollLeft();
        let currentPos: number = (<HTMLInputElement>$input[0]).selectionStart;
        const selectionEnd: number = (<HTMLInputElement>$input[0]).selectionEnd;
        const numCharSelected: number = selectionEnd - currentPos;

        let strLeft: string;
        let newVal: string;
        let resVal: string = "";

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            resVal = newVal;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            resVal = strLeft + newVal + value.substring(selectionEnd);
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            if (value.endsWith(",")) {
                // value ends with ",""
                newVal = " " + textToInsert;
            } else if (value.trimRight().endsWith(",")) {
                // value ends with sth like ",  "
                newVal = textToInsert;
            } else {
                newVal = ", " + textToInsert;
            }
            resVal = value + newVal;

            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            if (value.trimLeft().startsWith(",")) {
                // value start with sth like "  ,"
                newVal = textToInsert;
            } else {
                newVal = textToInsert + ", ";
            }
            resVal = newVal + value;

            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            resVal = strLeft + newVal + value.substring(selectionEnd);

            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val(resVal);
        }

        const inputText: string = $input.val().substring(0, currentPos);
        const textWidth: number = xcUIHelper.getTextWidth($input, inputText);
        const newValWidth: number = xcUIHelper.getTextWidth($input, newVal);
        const inputWidth: number = $input.width();
        const widthDiff: number = textWidth - inputWidth;
        if (widthDiff > 0) {
            $input.scrollLeft(initialScrollPosition + newValWidth);
        }
    }

    /**
     * xcUIHelper.disableMenuItem
     * @param $menuLi
     * @param tooltipOptions
     */
    export function disableMenuItem(
        $menuLi: JQuery,
        tooltipOptions: xcTooltip.TooltipOptions
    ): void {
        $menuLi.addClass('unavailable');
        xcTooltip.add($menuLi, tooltipOptions);
    }

    /**
     * xcUIHelper.enableMenuItem
     * @param $menuLi
     */
    export function enableMenuItem($menuLi: JQuery): void {
        $menuLi.removeClass('unavailable');
        xcTooltip.remove($menuLi);
    }

    /* ================= prettify json ============================ */
    function getIndent(num: number): string {
        const singleIndent: string = "&nbsp;&nbsp;";
        let totalIndent: string = "";
        for (let i = 0; i < num; i++) {
            totalIndent += singleIndent;
        }
        return totalIndent;
    }

    function getCheckbox(indent: number, options: PrettifyOptions): string {
        if (!options.checkboxes) {
            return "";
        }
        const originalLeft: number = -19;
        const left: number = originalLeft + (16.8 * indent);
        const html: string =
        '<div class="checkbox jsonCheckbox" style="left: ' + left + 'px;">' +
            '<i class="icon xi-ckbox-empty fa-11"></i>' +
            '<i class="icon xi-ckbox-selected fa-11"></i>' +
        '</div>';
        return html;
    }

    function prettify(
        obj: object,
        indent: number = 0,
        mainKey: boolean,
        options: PrettifyOptions = <PrettifyOptions>{},
        isArrayEl: boolean = false
    ): string {
        if (typeof obj !== "object") {
            return JSON.stringify(obj);
        }

        let result: string = "";
        options.inArray = options.inArray || 0;
        let quote = options.noQuotes ? '': '"';

        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            let value: any = obj[key];
            key = xcStringHelper.escapeHTMLSpecialChar(key);
            const dataKey: string = xcStringHelper.escapeDblQuoteForHTML(key);
            const arrayElClass: string = isArrayEl ? " arrayEl" : "";

            switch (typeof value) {
                case ('string'):
                    value = xcStringHelper.escapeHTMLSpecialChar(value, true);
                    value = quote + '<span class="jString text ' + arrayElClass +
                            '">' + value + '</span>' + quote;
                    break;
                case ('number'):
                    value = '<span class="jNum text ' + arrayElClass +
                            '">' + value + '</span>';
                    break;
                case ('boolean'):
                    value = '<span class="jBool text ' + arrayElClass +
                            '">' + value + '</span>';
                    break;
                case ('object'):
                    // divs are used in css selectors so careful with changing
                    if (value == null) {
                        value = '<span class="jNull text ' + arrayElClass +
                                '">' + value + '</span>';
                    } else if (value.constructor === Array) {
                        ++options.inArray;
                        const emptyArray = value.length === 0 ?
                                            " emptyArray" : "";
                        value =
                        '[<div class="jArray ' + emptyArray + '" ' + '>' +
                            prettify(value, indent + 1, null, options, true) +
                        '</div>' +
                        getIndent(indent) + ']';
                    } else {
                        const object: string = prettify(value, indent + 1, null, {
                            checkboxes: options.checkboxes
                        });
                        const emptyObj: string = (object === "") ?
                                                " emptyObj" : "";
                        value = '{<div class="jObj' + emptyObj + '">' +
                                    object +
                                '</div>' +
                                getIndent(indent) + '}';
                    }
                    break;
                default:
                    value = '<span class="jUndf text">' + value + '</span>';
                    break;
            }

            if (options.inArray) {
                value += ",";
                result +=
                        '<div class="jsonBlock jInfo arrayVal' +
                        '" data-key="' + dataKey + '">' +
                            getCheckbox(indent, options) +
                            getIndent(indent) +
                            value +
                        '</div>';
            } else {
                const classNames = mainKey ? " mainKey" : "";
                value = value.replace(/,$/, "");
                result +=
                    '<div class="jsonBlock jInfo objVal' + classNames +
                    '" data-key="' + dataKey + '">' +
                        getCheckbox(indent, options) +
                        getIndent(indent) +
                        '"<span class="jKey text">' + dataKey + '</span>": ' +
                        value + ',' +
                    '</div>';
            }
        }

        --options.inArray;

        if (options.comparison) {
            // removes last comma unless inside div
            return result.replace(/\, $/, "").replace(/\,$/, "");
        } else {
            // .replace used to remove comma if last value in object
            return result.replace(/\,<\/div>$/, "</div>")
                        .replace(/\, $/, "")
                        .replace(/\,$/, "");

        }
    }

    /**
     * xcUIHelper.prettifyJson
     * @param obj
     * @param indent
     * @param mainKey
     * @param options
     * @param isArrayEl
     */
    export function prettifyJson(
        obj: object,
        indent: number,
        mainKey: boolean,
        options: PrettifyOptions,
        isArrayEl: boolean
    ): string {
        return prettify(obj, indent, mainKey, options, isArrayEl);
    }

    /* ================= end of prettify json ============================ */

    /**
     * xcUIHelper.getColTypeIcon
     * @param type
     */
    export function getColTypeIcon(type: DfFieldTypeT): string {
        const colType: ColumnType = xcHelper.convertFieldTypeToColType(type);
        return xcUIHelper.getTypeIconFromColumnType(colType);
    }

    /**
     * xcUIHelper.getTypeIconFromColumnType
     */
    export function getTypeIconFromColumnType(colType: ColumnType): string {
        switch (colType) {
            case ColumnType.integer:
                return 'xi-integer';
            case ColumnType.float:
                return 'xi-float';
            case ColumnType.string:
                return 'xi-string';
            case ColumnType.boolean:
                return 'xi-boolean';
            case ColumnType.timestamp:
                return 'xi-timestamp';
            case ColumnType.money:
                return 'xi-money';
            case ColumnType.mixed:
                return 'xi-mixed';
            default:
                // other cases
                return 'xi-unknown';
        }
    }

    /**
     *  xcUIHelper.toggleListGridBtn
     * @param $btn
     * @param toListView
     * @param noRefresh
     */
    export function toggleListGridBtn(
        $btn: JQuery,
        toListView: boolean,
        noRefresh: boolean
    ): void {
        const $icon: JQuery = $btn.hasClass('icon') ? $btn : $btn.find('.icon');
        const listIcon: string = "xi-view-as-list-2";
        const gridIcon: string = "xi-grid-view";
        if (toListView) {
            // toggle to list view
            $btn.removeClass('gridView').addClass('listView');
            $icon.removeClass(listIcon).addClass(gridIcon);
            // suggest become 'to grid view'
            xcTooltip.changeText($btn, TooltipTStr.ToGridView, false);
        } else {
            // toggle to grid view
            $btn.removeClass("listView").addClass("gridView");
            $icon.removeClass(gridIcon).addClass(listIcon);
            xcTooltip.changeText($btn, TooltipTStr.ToListView, false);
        }
        // refresh tooltip
        if (!noRefresh) {
            $btn = $btn.filter((_index, el) => $(el).is(":visible"));
            xcTooltip.refresh($btn, null);
        }
    }

    /**
     * xcUIHelper.showRefreshIcon
     * @param $location
     * @param manualClose
     * @param promise
     */
    export function showRefreshIcon(
        $location: JQuery,
        manualClose: boolean,
        promise: XDPromise<any> | null,
        lock?: boolean
    ): JQuery {
        const $waitingIcon: JQuery = $('<div class="refreshIcon"><img src=""' +
                            'style="display:none;height:0px;width:0px;' +
                            '"></div>');
        if (lock) {
            $waitingIcon.addClass("locked");
        }
        const spinTime: number = 1500;
        $location.append($waitingIcon);
        $waitingIcon.find('img').show();
        setTimeout(() => {
            $waitingIcon.find('img')
                .attr('src', paths.waitIcon)
                .height(37)
                .width(35);
        }, 0);

        if (promise != null) {
            // guarantees waitingIcon shows for at least 1.5 seconds
            const startTime: number = Date.now();
            promise.always(() => {
                const elapsedTime: number = Date.now() - startTime;
                const timeout: number = Math.max(0, spinTime - elapsedTime);
                setTimeout(() => {
                    $waitingIcon.fadeOut(100, () => {
                        $waitingIcon.remove();
                    });
                }, timeout);
            });
        } else if (!manualClose) {
            setTimeout(() => {
                $waitingIcon.fadeOut(100, () => {
                    $waitingIcon.remove();
                });
            }, spinTime);
        }

        return $waitingIcon;
    }

    /**
     * xcUIHelper.toggleBtnInProgress
     * @param $btn
     * @param success
     */
    export function toggleBtnInProgress($btn: JQuery, success: boolean): void {
        if ($btn.hasClass('btnInProgress')) {
            let oldHtml: string = $btn.data('oldhtml');
            $btn.removeClass('btnInProgress');
            if (success) {
                let html: string =
                    '<span class="text center-button-text">' +
                        oldHtml +
                    '</span>' +
                    '<i class="icon xi-tick xi-tick-fade-in"></i>';
                $btn.html(html);
                setTimeout(() => {
                    $btn.html(oldHtml)
                        .removeData('oldhtml');
                }, 2700);
            } else {
                $btn.html(oldHtml)
                    .removeData('oldhtml');
            }
        } else {
            const text: string = $btn.text();
            let oldhtml: string = $btn.html();
            let html: string =
                    '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' + text + '</div>' +
                        '<div class="wrap">' +
                            '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                            '<div class="animatedEllipsis staticEllipsis">....</div>' +
                        '</div>' +
                    '</div>';
            $btn.html(html)
                .addClass('btnInProgress')
                .data('oldhtml', oldhtml);
        }
    }

    /**
     * xcUIHelper.optionButtonEvent
     * @param $container
     * @param callback
     * @param options - deselectFromContainer, boolean, if true will deselect
     * all radios from $container instead of from nearest .radioButtonGroup
     */
    export function optionButtonEvent(
        $container: JQuery,
        callback: Function | null,
        options: RadioButtonOption = <RadioButtonOption>{}
    ): void {
        $container.on('click', '.radioButton', function() {
            var $radioButton = $(this);
            if ($radioButton.hasClass('active') ||
                $radioButton.hasClass('disabled') ||
                $radioButton.hasClass('unavailable')
            ) {
                return;
            }
            if (options.deselectFromContainer) {
                $container.find('.radioButton.active').removeClass('active');
            } else {
                $radioButton.closest('.radioButtonGroup')
                        .find('.radioButton.active').removeClass('active');
            }

            $radioButton.addClass('active');

            const option: string = $radioButton.data('option');
            if (typeof callback === 'function') {
                callback(option, $radioButton);
            }
        });
    }

    /**
     * xcUIHelper.expandListEvent
     * @param $section
     */
    export function expandListEvent($section: JQuery): void {
        $section.on("click", ".listInfo .expand", (e) => {
            $(e.currentTarget).closest(".listWrap").toggleClass("active");
        });
    }

    /**
     * xcUIHelper.copyToClipboard
     * @param text
     */
    export function copyToClipboard(text: string): void {
        //use textarea to preserve new line characters
        const $hiddenInput: JQuery = $('<textarea class="xcClipboardArea"></textarea>');
        $('body').append($hiddenInput);
        $hiddenInput.val(text).select();
        document.execCommand('copy');
        $hiddenInput.remove();
    }

    /**
     * xcUIHelper.getLockIconHtml
     * @param txId
     * @param iconNum
     * @param withText
     * @param withSteps
     * @param forFileSearch
     */
    export function getLockIconHtml(
        txId: number | string,
        iconNum: number,
        withText: boolean = false,
        withSteps: boolean = false,
        forFileSearch: boolean = false
    ): string {
        let cancelType: string = forFileSearch ? "cancelSearch" : "cancelLoad";
        let html: string =
            '<div class="progressCircle ' + cancelType + ' lockedTableIcon"';
        if (!forFileSearch) {
            html += ' data-txid="' + txId + '" data-iconnum="' + iconNum + '"';
        }
        let title: string = forFileSearch ? TooltipTStr.CancelSearch :
                                            TooltipTStr.CancelQuery;
        html += '>' +
                '<div class="iconPart" data-toggle="tooltip" ' +
                'data-original-title="' + title + '" ' +
                'data-placement="auto top" data-container="body">' +
                    '<div class="leftPart"></div>' +
                    '<div class="rightPart"></div>' +
                    '<i class="icon xi-clock"></i>' +
                    '<i class="icon xi-close"></i>';
        if (!forFileSearch) {
            html += '<div class="progress"></div>';
        }
        html += '</div>';
        if (withSteps) {
            html += '<div class="textPart stepText">' +
            '<span class="currentStep">0</span>' + ' / ' +
            '<span class="totalSteps">1</span>' +
            '</div>' +
                '<div class="textPart cancelText">' + AlertTStr.Cancel + '</div>';
        } else if (withText) {
            html += '<div class="textPart pctText">' +
            '<span class="num">0</span>' + '<span class="unit">%</span>' +
            '</div>' +
                '<div class="textPart cancelText">' + AlertTStr.Cancel + '</div>';
        }
        html += '</div>';
        return html;
    }


    /**
     * xcUIHelper.listHighlight
     * @param $input
     * @param event
     * @param isArgInput
     */
    export function listHighlight(
        $input: JQuery,
        event: JQueryEventObject,
        isArgInput: boolean
    ): boolean {
        let direction: number;
        const keyCodeNum: number = event.which;
        if (keyCodeNum === keyCode.Up) {
            direction = -1;
        } else if (keyCodeNum === keyCode.Down) {
            direction = 1;
        } else {
            // key code not supported
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const $menu: JQuery = $input.siblings('.list');
        let $lis: JQuery = $menu.find('li:visible');
        if ($menu.hasClass("hasSubList")) {
            $lis = $menu.find("li li:visible");
        }
        const numLis: number = $lis.length;

        if (numLis === 0) {
            return;
        }

        let $highlightedLi: JQuery = $lis.filter(function() {
            return ($(this).hasClass('highlighted'));
        });

        if ($highlightedLi.length !== 0) {
            // When a li is highlighted
            const highlightIndex: number = $lis.index($highlightedLi);
            $highlightedLi.removeClass('highlighted');

            const newIndex: number = (highlightIndex + direction + numLis) % numLis;
            $highlightedLi = $lis.eq(newIndex);
        } else {
            let index: number = (direction === -1) ? (numLis - 1) : 0;
            $highlightedLi = $lis.eq(index);
        }

        let val: string = $highlightedLi.text();
        if (isArgInput && val[0] !== gAggVarPrefix) {
            val = gColPrefix + val;
        }
        $highlightedLi.addClass('highlighted');
        $input.val(val);

        const menuHeight: number = $menu.height();
        const liTop: number = $highlightedLi.position().top;
        const liHeight: number = 26;

        if (liTop > menuHeight - liHeight) {
            let currentScrollTop: number = $menu.find('ul').eq(0).scrollTop();
            let newScrollTop: number = liTop - menuHeight + liHeight +
                                        currentScrollTop;
            $menu.find('ul').eq(0).scrollTop(newScrollTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        } else if (liTop < 0) {
            let currentScrollTop: number = $menu.find('ul').eq(0).scrollTop();
            $menu.find('ul').scrollTop(currentScrollTop + liTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        }
    }

    var $tempDiv = $('<div style="position:absolute;display:inline-block;' +
                     'white-space:pre;"></div>');
    $tempDiv.appendTo($("body"));
    /**
     * xcUIHelper.getTextWidth
     * @param $el [${}] - optional if val is provided
     * @param val - optional if $el is provided
     */
    export function getTextWidth($el?: JQuery, val?: string): number {
        let extraSpace: number = 0;
        let text: string;
        let defaultStyle: any;
        if (!$el) {
            defaultStyle = { // styling we use for column header
                fontFamily: "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
                fontSize: "13px",
                fontWeight: "600",
                padding: 48
            };
            $el = $();
        } else {
            defaultStyle = {padding: 0};
        }

        if (val == null) {
            if ($el.is("input")) {
                text = $.trim($el.val() + " ");
            } else {
                if ($el.find(".displayedData").length) {
                    $el = $el.find(".displayedData");
                }
                text = $.trim($el.text());
            }
            // \n and \r have 3 pixels of padding
            extraSpace = $el.find(".lineChar").length * 3;
        } else {
            text = val;
        }

        $tempDiv.text(text);
        $tempDiv.css({
            "font-family": defaultStyle.fontFamily || $el.css("font-family"),
            "font-size": defaultStyle.fontSize || $el.css("font-size"),
            "font-weight": defaultStyle.fontWeight || $el.css("font-weight")
        });

        const width: number = $tempDiv.width() + defaultStyle.padding +
                            extraSpace;
        $tempDiv.empty();
        return width;
    }

    /**
     * Bolds part of the suggested text
     * Note: also clears it of any tags inside
     * @param $suggestion The JQUERY for the suggestion
     * @param searchKey The searchKey we want to bold
     */
    export function boldSuggestedText($suggestion: JQuery, searchKey: string): void {
        searchKey = xcStringHelper.escapeRegExp(searchKey);
        // The following pattern looks for "searchkey" exclusively outside of a <>.
        // This prevents it from replacing values within a tag, and replacing the tags themselves.
        // const pattern: RegExp = new RegExp('((^|>)[^<]?)(' + searchKey + ')', 'gi');
        const pattern: RegExp = new RegExp('(' + searchKey + ')(?![^<]*>|[^<>]*<\/)', 'i');
        // Remove old strong tabs
        let innerCleanHtml: string = $suggestion.html().replace('<strong>','').replace('</strong>','');
        $suggestion.html(
            // innerCleanHtml.replace(pattern,'$1<strong>$3</strong>')
            innerCleanHtml.replace(pattern,'<strong>$1</strong>')
        );
    }

    /**
     * xcUIHelper.styleNewLineChar
     * @param text
     */
    export function styleNewLineChar(text): string {
        return text.replace(/\n/g, '<span class="newLine lineChar">\\n</span>')
            .replace(/\r/g, '<span class="carriageReturn lineChar">\\r</span>');
    }

    /**
     * xcUIHelper.sortHTML
     * @param a
     * @param b
     */
    export function sortHTML(a: string, b: string): number {
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    /**
     * xcUIHelper.getLoadingSectionHTML
     * @param text
     */
    export function getLoadingSectionHTML(
        text: string,
        sectionClass?: string // use "ellipsisSpace" for the ellipsis to take up space
    ): HTML {
        sectionClass = sectionClass || "";
        let html: HTML =
        '<div class="' + sectionClass + '">' +
            '<div class="animatedEllipsisWrapper">' +
                '<div class="text">' + text + '</div>' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        return html;
    }
}
if (typeof exports !== "undefined") {
    exports.xcUIHelper = xcUIHelper;
}