interface FormHelperScrollOptions {
    paddingTop?: number;
}

interface FormHelperOptions {
    focusOnOpen?: Function;
    noTabFocus?: boolean;
    noEsc?: boolean;
    beforeClose?: Function;
    columnPicker?: ColumnPickerOptions,
    allowAllColPicker?: boolean;
    open?: Function;
    close?: Function;
}

interface ColumnPickerOptions {
    state?: string;
    noEvent?: boolean;
    keepFocus?: boolean;
    colCallback?: Function;
    headCallback?: Function;
    dagCallback?: Function;
    validTypeException?: Function;
    validColTypes?: ColumnType[];
}

interface FormHelperBGOptions {
    heightAdjust?:  number;
    transparent?: boolean;
}

/* Form Helper */
// an object used for global Form Actions
class FormHelper {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open form
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * columnPicker: a object with column picker options, has attrs:
     *      state: the column picker's state
     *      noEvent: if set true, no picker event handler
     *      colCallback: called when click on column
     *      headCallback: called when click on table head
     *      dagCallback: called when click on dagtable icon
     *      validColTypes: (optional) array of valid column types
     */

    public static activeForm: BaseOpPanel;
    public static activeFormName: string;

    private $form: JQuery;
    private $container: JQuery;
    private options: FormHelperOptions;
    private id: string;
    private state: string;
    private openTime: number;
    private isFormOpen: boolean;
    private _isWaitingForSetup: boolean;

    public constructor($form: JQuery, options?: FormHelperOptions) {
        this.$form = $form;
        this.options = options || {};
        this.id = $form.attr("id");
        this.state = null;
        this.openTime = null;
        this.isFormOpen = false;
        this.$container = $();
        this.__init();
    }

    public static Template: {[key: string]: HTML} = {
        "rename": '<div class="rename">' +
                    '<input class="columnName origName arg" type="text" ' +
                    'spellcheck="false" disabled/>' +
                    '<div class="middleIcon renameIcon">' +
                        '<div class="iconWrapper">' +
                            '<i class="icon xi-play-outline fa-14"></i>' +
                        '</div>' +
                    '</div>' +
                    '<input class="columnName newName arg" type="text" ' +
                      'spellcheck="false"/>' +
                '</div>'
    }

    public static updateColumns(options): void {
        if (FormHelper.activeForm && FormHelper.activeForm.refreshColumns) {
            FormHelper.activeForm.refreshColumns(options);
        }
    }

    // used for forms in the left panel
    // options: paddingTop: integer, pixels from the top to position
    public static scrollToElement($el: JQuery, options?: FormHelperScrollOptions): void {
        options = options || {};
        const paddingTop: number = options.paddingTop || 0;
        const $container: JQuery = $el.closest(".mainContent");
        const containerTop: number = $container.offset().top;
        const elTop: number = $el.offset().top;
        // only scrolls if top of $el is not visible
        if (elTop > containerTop + $container.height() ||
            elTop < containerTop) {
            const newScrollTop: number = elTop + $container.scrollTop() - containerTop;
            $container.scrollTop(newScrollTop - paddingTop);
        }
    }

     // called only once per form upon creation
    private __init(): void {
        // tooltip overflow setup
        this.$form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    }

    // called everytime the form opens
    public setup(extraOptions: FormHelperOptions): XDPromise<any> {
        this.$container = $("#sqlTableArea"); // currently only used for column picker

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const self: FormHelper = this;
        const $form: JQuery = self.$form;
        const options: FormHelperOptions = $.extend(self.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcUIHelper.removeSelectionRange();
        // hide tooltip when open the form
        xcTooltip.hideAll();
        $(".selectedCell").removeClass("selectedCell");

        // Note: to find the visible btn, must show the form first
        if (!options.noTabFocus) {
            self.refreshTabbing();
        }

        $(document).on("keydown.xcForm", function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                if (!$form.is(":visible")) {
                    return true;
                }
                if (StatusBox.isOpen()) {
                    $("#statusBoxClose").trigger(fakeEvent.mousedown);
                    return;
                }
                if (typeof options.beforeClose === "function" &&
                    options.beforeClose()
                ) {
                    return;
                }

                $form.find(".close").click();
                return false;
            }
        });

        // setup columnPicker
        const columnPicker: ColumnPickerOptions = options.columnPicker || {};
        self.state = "columnPicker";
        if (columnPicker.state != null) {
            self.state += " " + columnPicker.state;
            $("#container").addClass(self.state);
        }

        // see table.less of the class
        // it stop some default events
        $(".xcTableWrap").addClass('columnPicker');

        // add noColumnPicker class to array and object columns
        if (!options.allowAllColPicker) {
            const $headers: JQuery = $(".xcTable").find(".header");
            const $arrayHeaders: JQuery = $headers.filter(function() {
                return $(this).hasClass("type-array");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");
            const $objHeaders: JQuery = $headers.filter(function() {
                return $(this).hasClass("type-object");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($arrayHeaders, {
                title: ColTStr.NoOperateArray,
                container: "body",
                placement: "bottom"
            });

            xcTooltip.add($objHeaders, {
                title: ColTStr.NoOperateObject,
                container: "body",
                placement: "bottom"
            });
        }

        if (columnPicker.validColTypes) {
            const validTypes: ColumnType[] = columnPicker.validColTypes;
            let $otherHeaders: JQuery = $();

            $(".xcTable").each(function() {
                const $table: JQuery = $(this);
                const table: TableMeta = gTables[TblManager.parseTableId($table)];
                const $invalidHeaders: JQuery = $table.find(".header").filter(function() {
                    const $header: JQuery = $(this);
                    if ($header.hasClass("noColumnPicker")) {
                        return false;
                    }
                    const colNum: number = ColManager.parseColNum($header.parent());
                    if (colNum != null && colNum > 0) {
                        const type: ColumnType = table.getCol(colNum).getType();
                        return (validTypes.indexOf(type) === -1);
                    } else {
                        return false;
                    }
                });
                $otherHeaders = $otherHeaders.add($invalidHeaders);
            });

            $otherHeaders.addClass("noColumnPicker");
            $otherHeaders.attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($otherHeaders, {
                title: ColTStr.NoOperateGeneral,
                container: "body",
                placement: "bottom"
            });
        }

        if (!columnPicker.noEvent) {
            const colSelector: string = ".xcTable .header, .xcTable td.clickable";
            if (columnPicker.keepFocus) {
                this.$container.on("mousedown.columnPicker", colSelector, function(event: JQueryEventObject) {
                    event.preventDefault();
                    event.stopPropagation();
                });
            }
            this.$container.on("click.columnPicker", colSelector, function(event: JQueryEventObject) {
                const callback: Function = columnPicker.colCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                const $target: JQuery = $(event.target);
                if ($target.closest('.dataCol').length ||
                    $target.closest('.jsonElement').length ||
                    $target.closest('.dropdownBox').length) {
                    return;
                }

                // check to see if cell has a valid type
                const $td: JQuery = $target.closest('td');
                let $header: JQuery;
                if ($td.length) {
                    const colNum: number = ColManager.parseColNum($td);
                    $header = $td.closest('.xcTable').find('th.col' + colNum)
                                                     .find('.header');
                } else {
                    $header = $(this);
                }

                if ($header.hasClass('noColumnPicker')) {
                    if (!columnPicker.validTypeException ||
                        !columnPicker.validTypeException()) {
                        return;
                    }
                }

                callback($target, event);
            });
        }

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            PromiseHelper.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            $form.show();
            deferred.resolve();
        }

        if ($form.closest('#configNodeContainer').length) {
            DagConfigNodeModal.Instance.setFormOpen();
        }

        return deferred.promise();
    }

    public showView(formName: string, formPanel: BaseOpPanel): boolean {
        this.isFormOpen = true;
        this.openTime = Date.now();
        FormHelper.activeForm = formPanel;
        this.$form.removeClass("xc-hidden");

        $("#container").addClass("formOpen");

        let name: string = formName || this.id;
        name = name.toLowerCase();
        const viewIndex: number = name.indexOf("view");
        if (viewIndex > -1) {
            name = name.slice(0, viewIndex);
        }
        const oppanelIndex: number = name.indexOf("oppanel");
        if (oppanelIndex > -1) {
            name = name.slice(0, oppanelIndex);
        }
        name = $.trim(name);
        const tblMenu: TableMenuManager = TableComponent.getMenu();
        tblMenu.updateExitOptions("#tableMenu", name);
        tblMenu.updateExitOptions("#colMenu", name);
        let displayName = xcStringHelper.capitalize(name);
        displayName = xcStringHelper.camelCaseToRegular(displayName);
        FormHelper.activeFormName = displayName;
        DagNodeMenu.updateExitOptions(displayName);
        return true;
    }

    public hideView(): void {
        this.isFormOpen = false;
        FormHelper.activeForm = null;
        FormHelper.activeFormName = null;
        this.$form.addClass('xc-hidden');
        $("#container").removeClass("formOpen");
        const tblMenu: TableMenuManager = TableComponent.getMenu();
        tblMenu.updateExitOptions("#tableMenu");
        tblMenu.updateExitOptions("#colMenu");

        StatusBox.forceHide();
        xcTooltip.hideAll();
    }

    public checkBtnFocus(): boolean {
        // check if any button is on focus
        return (this.$form.find(".btn:focus").length > 0);
    }

    // This function prevents the user from clicking the submit button multiple
    // times
    public disableSubmit(): void {
        xcUIHelper.disableSubmit(this.$form.find(".confirm"));
    }

    // This function reenables the submit button after the checks are done
    public enableSubmit(): void {
        xcUIHelper.enableSubmit(this.$form.find(".confirm"));
    }

    public clear(extraOptions?: FormHelperOptions): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const self: FormHelper = this;
        extraOptions = extraOptions || {};
        const options: FormHelperOptions = $.extend(self.options, extraOptions) || {};
        const $form: JQuery = self.$form;

        $(document).off("keydown.xcForm");
        $(document).off("keydown.xcFormTabbing");
        $form.find(".focusable").off(".xcForm")
                                  .removeClass("focusable");
        $(".xcTableWrap").removeClass("columnPicker");
        const $noColPickers: JQuery = $(".xcTable").find('.noColumnPicker')
                                         .removeClass('noColumnPicker')
                                         .removeAttr("data-tipClasses");
        xcTooltip.remove($noColPickers);
        this.$container.off("click.columnPicker");
        $("#container").removeClass(self.state);
        self.state = null;
        self.enableSubmit();

        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }

        if ($form.closest('#configNodeContainer').length) {
            DagConfigNodeModal.Instance.setFormClose();
        }

        return deferred.promise();
    }

    public addWaitingBG(options?: FormHelperBGOptions): void {
        options = options || {};
        const heightAdjust: number = options.heightAdjust || 0;
        const transparent: boolean = options.transparent || false;
        const $form: JQuery = this.$form;
        const waitingBg: HTML = '<div id="formWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $form.append(waitingBg);
        const $waitingBg: JQuery =  $('#formWaitingBG');
        if (transparent) {
            $waitingBg.addClass('transparent');
        } else {
            $waitingBg.removeClass('transparent');
        }
        const modalHeaderHeight: number = $form.children('header').height() || 0;
        const modalHeight: number = $form.height();

        $waitingBg.height(modalHeight + heightAdjust - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    }

    public removeWaitingBG(): void {
        if (gMinModeOn) {
            $('#formWaitingBG').remove();
        } else {
            $('#formWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    }

    public refreshTabbing(): void {
        const $form: JQuery = this.$form;

        $(document).off("keydown.xcFormTabbing");

        $form.find(".focusable").off(".xcForm")
                                 .removeClass("focusable");

        let eleLists: JQuery[] = [
            $form.find("button.btn, input:visible")
        ];

        let $focusables: JQuery[] = [];
        // make an array for all focusable element
        eleLists.forEach(function($eles: JQuery) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });

        // check if element already has focus and set focusIndex;
        let focusIndex: number;
        if (eleLists[0].index($(':focus')) > -1) {
            focusIndex = eleLists[0].index($(':focus')) + 1;
        } else {
            focusIndex = 0;
        }

        let len: number = $focusables.length
        for (let i = 0; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        // focus on the right most button
        if (this.options.focusOnOpen) {
            getEleToFocus();
        }

        $(document).on("keydown.xcFormTabbing", function(event: JQueryEventObject) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();
                return false;
            }
        });

        function addFocusEvent($focusable, index) {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcForm", function() {
                const $ele: JQuery = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus(): void {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            if ($(".CodeMirror-focused").length) {
                return;
            }
            // the current ele is not active, should no by focused
            if (!isActive($focusables[focusIndex])) {
                const start: number = focusIndex;
                focusIndex = (focusIndex + 1) % len;

                while (focusIndex !== start &&
                        !isActive($focusables[focusIndex]))
                {
                    focusIndex = (focusIndex + 1) % len;
                }
                // not find any active ele that could be focused
                if (focusIndex === start) {
                    focusIndex = -1;
                }
            }

            if (focusIndex >= 0) {
                $focusables[focusIndex].focus();
            } else {
                focusIndex = 0; // reset
            }
        }

        function focusOn(index: number) {
            focusIndex = index;
            // go to next index
            focusIndex = (focusIndex + 1) % len;
        }

        function isActive($ele: JQuery): boolean {
            if ($ele == null) {
                console.error("undefined element!");
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden" &&
                    window.getComputedStyle($ele[0])
                    .getPropertyValue("pointer-events") !== "none");
        }
    }

    public listHighlight(
        $input: JQuery,
        event: JQueryEventObject,
        isArgInput?: boolean
    ): boolean {
        return xcUIHelper.listHighlight($input, event, isArgInput);
    }

    public getOpenTime(): number {
        return this.openTime;
    }

    public isOpen(): boolean {
        return this.isFormOpen;
    }

    public focusOnColumn(
        tableId: TableId,
        colNum: number,
        noSelect: boolean
    ): void {
        if (tableId == null || colNum == null) {
            // error case
            return;
        }

        TblManager.centerFocusedColumn(tableId, colNum, true, noSelect);

        const $th: JQuery = $("#xcTable-" + tableId).find("th.col" + colNum);
        xcTooltip.transient($th, {
            "title": TooltipTStr.FocusColumn,
            "container": "#container",
        }, 1000);
    }

    public waitForSetup() {
        this._isWaitingForSetup = true;
        this.addWaitingBG({});
    }

    public unwaitForSetup() {
        this._isWaitingForSetup = false;
        this.removeWaitingBG();
    }

    public isWaitingForSetup() {
        return this._isWaitingForSetup;
    }
}
/* End of FormHelper */