interface ModalHelperOptions {
    defaultWidth?: number,
    defaultHeight?: number,
    beforeResize?: JQueryUI.ResizableEvent,
    minWidth?: number,
    minHeight?: number,
    resizeCallback?: JQueryUI.ResizableEvent,
    afterResize?: JQueryUI.ResizableEvent,
    sizeToDefault?: boolean,
    noTabFocus?: boolean,
    noCenter?: boolean,
    noEsc?: boolean,
    noEnter?: boolean,
    noBackground?: boolean,
    center?: ModalHelperCenterOptions,
    open?: Function,
    close?: Function,
    noResize?: boolean,
    sizeCallBack?: Function,
    dragHandle?: string,
    offscreenDraggable?: boolean,
    noAnim?: boolean // no fade in/out
}

interface ModalHelperCenterOptions {
    horizontalOnly?: boolean; // if true, only horizontal cenater
    verticalQuartile?: boolean; // if true, vertical top will be 1/4
    maxTop?: number; // max top it could be
    noLimitTop?: boolean //  if true, it will always center
                    // with equal space on top and bottom,
                    // if false, top will be minimum 0 and bottom will overfolw
                    // when modal height is larger then window height
}

// options:
// time - fade out or fade in time in ms
// opSection - if operations section is opening
interface ModalHelperBGOptions {
    time?: number;
    opSection?: boolean;
}

interface ModalSpec {
    $modal: JQuery;
    top: number;
    left: number;
}


/* Modal Helper */
// an object used for global Modal Actions
class ModalHelper {

    public static isModalOn() {
        return $("#modalBackground").is(":visible");
    }

    private $modal: JQuery;
    private options: ModalHelperOptions;
    private id: string;
    private defaultWidth: number;
    private defaultHeight: number;
    private minWidth: number;
    private minHeight: number;

    /* options include:
     * noResize: if set true, will not reszie the modal
     * sizeToDefault: if set true, will set to initial width and height when open
     * defaultWidth: integer, optional
     * defaultHeight: integer, optional
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noEnter: if set true, no event listener on key enter,
     * noBackground: if set true, no darkened modal background
     * beforeResize: funciton called before modal resizing
     * resizeCallback: function called during modal resizing
     * afterResize: funciton called after modal resizing
     */
    public constructor($modal: JQuery, options?: ModalHelperOptions) {
        this.$modal = $modal;
        this.id = $modal.attr("id");
        this.reset(options);
        this.__init();
    }

    /**
    * xcHelper.repositionModalOnWinResize
    * @param modalSpecs {$modal: $modal, top: int, left: int}
    * @param windowSpecs {winWidth: int, winHeight: int}
    */
    public static repositionModalOnWinResize(
       modalSpecs: ModalSpec,
       windowSpecs: WindowSpec
    ): void {
        const $modal: JQuery = modalSpecs.$modal;
        const modalWidth: number = $modal.width();
        const modalHeight: number = $modal.height();
        const prevWinWidth: number = windowSpecs.winWidth;
        const prevWinHeight: number = windowSpecs.winHeight;
        // this will be used as the starting window width/height for the
        // next window resize rather than measuring at the beginning of the
        // next resize because the maximize/minimize button will not show
        // the starting window size during the resize event
        windowSpecs.winHeight = $(window).height();
        windowSpecs.winWidth = $(window).width();

        const curWinHeight: number = windowSpecs.winHeight;
        const curWinWidth: number = windowSpecs.winWidth;
        const prevWidthAround: number = prevWinWidth - modalWidth;
        const prevHeightAround: number = prevWinHeight - modalHeight;
        let left: number;
        let top: number;

        if (modalWidth > curWinWidth) {
            left = curWinWidth - modalWidth;
        } else if (prevWidthAround < 10) {
            left = (curWinWidth - modalWidth) / 2;
        } else {
            const widthAroundChangeRatio = (curWinWidth - modalWidth) /
                                            prevWidthAround;
            left = modalSpecs.left * widthAroundChangeRatio;
        }

        if (modalHeight > curWinHeight) {
            top = 0;
        } else if (prevHeightAround < 10) {
            top = (curWinHeight - modalHeight) / 2;
        } else {
            const heightAroundChangeRatio: number = (curWinHeight - modalHeight) /
                                                    prevHeightAround;
            top = modalSpecs.top * heightAroundChangeRatio;
        }

        if ($modal.hasClass("react-draggable")) {
            // XXX when it's react-rnd module
            $modal.css("transform", "translate(" + left + "px, " + top + "px)");
        } else {
            $modal.css('left', left);
            $modal.css('top', top);
        }
    }

    private __init(): void {
        const self = this;
        const $modal: JQuery = self.$modal;
        const options: ModalHelperOptions = self.options;

        // full screen and exit full screen buttons
        const $fullScreenBtn: JQuery = $modal.find(".fullScreen");
        const $exitFullScreenBtn: JQuery = $modal.find(".exitFullScreen");
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize(null, null);
                }
                const winWidth: number = $(window).width();
                const winHeight: number = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top": 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
                self.__resizeCallback();
            });

        }
        if ($exitFullScreenBtn.length) {
            $exitFullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize(null, null);
                }
                const minWidth: number  = options.minWidth || 0;
                const minHeight: number = options.minHeight || 0;
                $modal.width(minWidth);
                $modal.height(minHeight);
                self.center();
                self.__resizeCallback();
            });
        }

        // draggable
        if (options.offscreenDraggable) {
            let minLeft = -40;
            let maxLeft: number;
            let maxTop: number;
            $modal.draggable({
                "handle": options.dragHandle || ".modalHeader",
                "cursor": "-webkit-grabbing",
                "containment": "",
                start: () => {
                    let winWidth = window.innerWidth;
                    let winHeight = window.innerHeight;
                    maxLeft = winWidth - 40;
                    maxTop = winHeight - 30;
                },
                drag: (_event, ui) => {
                    if (ui.position.left < minLeft) {
                        ui.helper.css("left", minLeft);
                        ui.position.left = minLeft;
                    } else if (ui.position.left > maxLeft) {
                        ui.helper.css("left", maxLeft);
                        ui.position.left = maxLeft;
                    }
                    if (ui.position.top < 1) {
                        ui.helper.css("top", 1);
                        ui.position.top = 1;
                    } else if (ui.position.top > maxTop) {
                        ui.helper.css("top", maxTop);
                        ui.position.top = maxTop;
                    }
                }
            });
        } else {
            $modal.draggable({
                "handle": options.dragHandle || ".modalHeader",
                "cursor": "-webkit-grabbing",
                "containment": "window"
            });
        }

        if (!options.noResize) {
            const resizeOptions: JQueryUI.ResizableOptions = {
                "handles": "n, e, s, w, se",
                "minHeight": self.minHeight,
                "minWidth": self.minWidth,
                "containment": "document",
                "start": options.beforeResize || null,
                "resize": options.resizeCallback || null,
                "stop": options.afterResize || null,

            };
            $modal.resizable(resizeOptions);
        }
    }

    private __resizeCallback(): void {
        const self: ModalHelper = this;
        const $modal: JQuery = self.$modal;
        const options: ModalHelperOptions = self.options;
        if (options.resizeCallback) {
            const resizeInfo: JQueryUI.ResizableUIParams = {
                size: {width: $modal.width(), height: $modal.height()},
                element: null,
                helper: null,
                originalElement: null,
                originalPosition: null,
                originalSize: null,
                position: null
            }
            options.resizeCallback(null, resizeInfo);
        }
        if (options.afterResize) {
            options.afterResize(null, null);
        }
    }

    public setup(extraOptions?: ModalHelperOptions): XDPromise<any> {
        const self = this;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const $modal: JQuery = this.$modal;
        const options: ModalHelperOptions = $.extend(this.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcUIHelper.removeSelectionRange();
        // hide tooltip when open the modal
        xcTooltip.hideAll();

        // resize modal
        if (options.sizeCallBack) {
            options.sizeCallBack();
        } else if (options.sizeToDefault) {
            self.__resizeToDefault();
        } else {
            self.__resizeToFitScreen();
        }

        // center modal
        if (!options.noCenter) {
            const centerOptions: ModalHelperCenterOptions = options.center || {};
            this.center(centerOptions);
        }

        // Note: to find the visible btn, must show the modal first
        if (!options.noTabFocus) {
            this.refreshTabbing();
        }

        $(document).on("keydown.xcModal" + this.id, (event) => {
            return self.__keyDownHandler(event, options, $modal);
        });

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else if (options.noBackground) {
            $modal.addClass("noBackground").show();
            $modal.addClass("visible");
            deferred.resolve();
        } else {
            const $modalBg: JQuery = $("#modalBackground");
            if (window.gMinModeOn || options.noAnim) {
                $modalBg.show();
                $modal.show();
                deferred.resolve();
            } else {
                $modal.fadeIn(180);

                $modalBg.fadeIn(300, function() {
                    deferred.resolve();
                    $modalBg.css('display', 'block'); // when alert modal opens
                    // and drop table modal is open
                });
            }
            $modal.addClass("visible");
        }

        return deferred.promise();
    }

    public reset(options?: ModalHelperOptions): void {
        let $modal = this.$modal;
        options = options || {};
        this.options = options;
        this.defaultWidth = options.defaultWidth || $modal.width();
        this.defaultHeight = options.defaultHeight || $modal.height();
        this.minWidth = options.minWidth ||
                        parseFloat($modal.css("min-width")) ||
                        this.defaultWidth;
        this.minHeight = options.minHeight ||
                         parseFloat($modal.css("min-height")) ||
                         this.defaultHeight;
    }

    // resize modal back to it's default width and height
    private __resizeToDefault(): void {
        const $modal: JQuery = this.$modal;
        $modal.width(this.defaultWidth);
        $modal.height(this.defaultHeight);
    }

    private __resizeToFitScreen(): void {
        const $modal: JQuery = this.$modal;
        const winWidth: number = $(window).width();
        const winHeight: number = $(window).height();
        const minWidth: number = this.minWidth;
        const minHeight: number = this.minHeight;
        let width: number = $modal.width();
        let height: number = $modal.height();

        if (width > winWidth - 10) {
            width = Math.max(winWidth - 40, minWidth);
        }

        if (height > winHeight - 10) {
            height = Math.max(winHeight - 40, minHeight);
        }

        $modal.width(width).height(height);
        $modal.css({
            "minHeight": minHeight,
            "minWidth": minWidth
        });
    }

    // This function prevents the user from clicking the submit button multiple
    // times
    public disableSubmit(): void {
        xcUIHelper.disableSubmit(this.$modal.find(".confirm"));
    }

    // This function reenables the submit button after the checks are done
    public enableSubmit(): void {
        xcUIHelper.enableSubmit(this.$modal.find(".confirm"));
    }

    public clear(extraOptions?: ModalHelperOptions): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const options: ModalHelperOptions = $.extend(this.options, extraOptions) || {};
        const $modal: JQuery = this.$modal;
        let $openModals = $('.modalContainer:visible:not(.noBackground)').filter((_i, el) => {
            return $(el).closest("#root").length === 0; // filter out react modals
        });
        const numModalsOpen: number = $openModals.length;
        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.removeClass("noBackground");
        $modal.removeClass("visible");
        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");
        xcTooltip.hideAll();
        this.enableSubmit();
        if (numModalsOpen < 2) {
            $("body").removeClass("no-selection");
        }
        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            const $modalBg: JQuery = $("#modalBackground");
            const fadeOutTime: number = gMinModeOn ? 0 : 300;
            $modal.hide();

            if (numModalsOpen < 2) {
                if (options.noBackground || options.noAnim) {
                    $modalBg.hide();
                } else {
                    $modalBg.fadeOut(fadeOutTime, function() {
                        deferred.resolve();
                    });
                }

            } else {
                deferred.resolve();
            }

        }

        return deferred.promise();
    }

    public center(options?: ModalHelperCenterOptions): void {
        /*
         * to position modal in the center of the window
        */
        options = options || {};

        const $window: JQuery = $(window);
        const $modal: JQuery = this.$modal;
        const winWidth: number = $window.width();
        const modalWidth: number = $modal.width();
        const left: number = (winWidth - modalWidth) / 2;

        if (options.horizontalOnly) {
            $modal.css({"left": left});
            return;
        }

        const winHeight: number = $window.height();
        const modalHeight: number = $modal.height();
        let top: number;

        if (options.verticalQuartile) {
            top = (winHeight - modalHeight) / 4;
        } else {
            top = (winHeight - modalHeight) / 2;
        }

        if (options.maxTop && top < options.maxTop) {
            top = options.maxTop;
            const bottom: number = top + modalHeight;
            if (bottom > winHeight) {
                top -= (bottom - winHeight);
            }
        }

        if (!options.noLimitTop) {
            top = Math.max(top, 0);
        }

        $modal.css({
            "left": left,
            "top": top
        });
    }

    public toggleBG(
        tableId: TableId | string,
        isHide?: boolean,
        options?: ModalHelperBGOptions
    ): void {
        const $modalBg: JQuery = $("#modalBackground");
        let $tableWrap: JQuery;
        let $tableContainer: JQuery = $("#sqlTbleArea .viewWrap");

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
        }

        options = options || {};

        if (isHide) {
            let fadeOutTime: number;
            if (options.time == null) {
                fadeOutTime = 150;
            } else {
                fadeOutTime = options.time;
            }

            // when close the modal
            if (gMinModeOn) {
                $modalBg.hide();
                $modalBg.removeClass('light');
                $tableContainer.removeClass("modalOpen");
            } else {
                $modalBg.fadeOut(fadeOutTime, function() {
                    $modalBg.removeClass('light');
                    $tableContainer.removeClass("modalOpen");
                });
            }

            if (tableId != null) {
                $tableWrap.removeClass('modalOpen');
            }
        } else {
            // when open the modal
            if (tableId != null) {
                $tableWrap.addClass('modalOpen');
            }
            $tableContainer.addClass("modalOpen");
            let fadeInTime: number;
            if (options.time == null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
            if (gMinModeOn) {
                $modalBg.addClass('light');
                $modalBg.show();
            } else {
                $modalBg.addClass('light').fadeIn(fadeInTime);
            }
        }
    }

    public addWaitingBG(): void {
        const $modal: JQuery = this.$modal;
        const waitingBg: HTML = '<div id="modalWaitingBG">' +
                                    '<div class="waitingIcon"></div>' +
                                '</div>';
        $modal.append(waitingBg);
        const $waitingBg: JQuery =  $('#modalWaitingBG');
        const modalHeaderHeight: number = $modal.find('.modalHeader').outerHeight();
        const modalHeight: number = $modal.outerHeight();

        $waitingBg.height(modalHeight - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        if (gMinModeOn) {
            $waitingBg.find(".waitingIcon").show();
        } else {
            setTimeout(function() {
                $waitingBg.find('.waitingIcon').fadeIn();
            }, 200);
        }
    }

    public removeWaitingBG(): void {
        if (gMinModeOn) {
            $('#modalWaitingBG').remove();
        } else {
            $('#modalWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    }

    public refreshTabbing(): void {
        const $modal: JQuery = this.$modal;

        $(document).off("keydown.xcModalTabbing" + this.id);

        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");

        const eleLists: JQuery[] = [
            $modal.find(".btn"),     // buttons
            $modal.find("input")     // input
        ];

        let focusIndex: number = 0;
        const $focusables: JQuery[] = [];

        // make an array for all focusable element
        eleLists.forEach(function($eles) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });
        let len: number = $focusables.length;
        for (let i = 0; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        $(document).on("keydown.xcModalTabbing" + this.id, function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        function addFocusEvent($focusable: JQuery, index: number): void {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcModal", function() {
                const $ele: JQuery = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            // the current ele is not active, should no by focused
            if (!isActive($focusables[focusIndex])) {
                const start: number  = focusIndex;
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

        function focusOn(index: number):  void {
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
                    $ele.css('visibility') !== "hidden");
        }
    }


    private __keyDownHandler(event, options, $modal) {
        if (event.which === keyCode.Escape) {
            if (options.noEsc || $modal.hasClass("locked")) {
                return true;
            }
            $modal.find(".modalHeader .close").click();
            return false;
        } else if (event.which === keyCode.Enter) {
            if (options.noEnter || ($(":focus").hasClass('btn') &&
                $(":focus").closest('#' + this.id).length)) {
                // let default behavior take over
                return true;
            }
            const $btn: JQuery = $modal.find('.modalBottom .btn:visible')
                            .filter(function() {
                                return (!$(this).hasClass('cancel') &&
                                        !$(this).hasClass('close'));
                            });
            if ($btn.length === 0) {
                // no confirm button so treat as close
                if (!$modal.hasClass('locked')) {
                    $modal.find(".modalHeader .close").click();
                }
            } else if ($btn.length === 1) {
                // trigger confirm
                $btn.click();
            } else {
                // multiple confirm buttons
                StatusBox.show(ErrTStr.SelectOption,
                                $modal.find('.modalBottom'), false, {
                                    "type": "info",
                                    "highZindex": true,
                                    "offsetY": 12
                                });
            }
            return false;
        }
    }
}
/* End modalHelper */