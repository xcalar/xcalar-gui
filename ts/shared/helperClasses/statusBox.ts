// StatusBox Modal
namespace StatusBox {
    let statusDisplayer: StatusDisplayer;
    let hasSetup: boolean = false;

     /*
     * options:
     *      type: string, "error", "info"
     *      offsetX: int,
     *      offsetY: int,
     *      side: 'top', 'bottom', 'left', 'right' (if not provided, box will
     *      default to the right side of the $target)
     *      highZindex: boolean, if true will add class to bring statusbox
     *                  z-index above locked background z-index,
     *      html: boolean, text is html or pure text
     *      preventImmediateHide: boolean, if true, will set timeout that will
     *                          prevent closing for a split second (useful if
     *                          scroll event tries to close status box)
     *      persist: if set true, the box will not hide unless click
     *               on close button,
     *      detail: string, extra information text to display
     *      delayHide: number of milliseconds to delay ability to hide box
     *      title: Text that is bold at the top, will default to Error or Information
     */
    export interface StatusDisplayerOpions {
        type?: "info" | "error";
        highZindex?: boolean;
        side?: string; // "left" | "right" | "top" | "bottom";
        offsetX?: number;
        offsetY?: number;
        html?: boolean;
        preventImmediateHide?: boolean;
        persist?: boolean;
        detail?: string;
        delayHide?: number;
        title?: string,
        coordinates?: {// relative to page, coordinates of target
            bottom: number,
            left: number,
            right?: number,
            top: number,
            width?: number,
            height?: number
        }
    }

    class StatusDisplayer {
        private $statusBox: JQuery; // $("#statusBox");
        private $target: JQuery;
        private open: boolean;
        private type: "info" | "error";
        private side: string; // "left" | "right" | "top" | "bottom";
        private coordinates: {
            bottom: number,
            left: number,
            right?: number,
            top: number,
            width?: number,
            height?: number
        };

        constructor() {
            this.$statusBox = $("#statusBox");
            this.open = false;
            this.$target = $();
            this.setupListeners();
            this.type = "error";
            this.side = "right";
        }

        public show(text: string, $target: JQuery, formMode?: boolean, options: StatusDisplayerOpions = <StatusDisplayerOpions>{}): void {
            if (!options.coordinates && !$target.length) {
                // XXX this shouldn't happen but it has before
                console.error($target, "statusBox target not found");
                return;
            } else if ($target && $target.length > 1) {
                $target = $target.eq(0);
            }
            if (options.coordinates) {
                $target = $();
            }

            this.$target = $target;
            this.type = options.type || "error";
            this.side = options.side || "right";
            this.coordinates = options.coordinates || null;
            this.setupBasicClasses(options);
            this.setupTargetEvents(formMode, options.persist);
            this.addTitle(options.title);
            this.addText(text, options.html);
            this.addDetail(options.detail);
            $target.scrollintoview({duration: 0});
            this.setupPosition(options.offsetX, options.offsetY);
            this.setupHideOption(options.preventImmediateHide, options.delayHide);
            if (typeof mixpanel !== "undefined") {
                xcMixpanel.errorEvent("statusBoxError", {
                    text: text,
                    $target: $target
                });
            }
        }

        public forceHide(): void {
            if (this.open) {
                this.$target.off("keydown.statusBox").removeClass(this.type);
                this.clear();
            }
        }

        public isOpen(): boolean {
            return this.open;
        }

        private setupListeners() {
            $("#statusBox").mousedown(this._mousedownEvent.bind(this));
            $("#statusBox .detailAction").mousedown(function(event) {
                event.preventDefault();
                event.stopPropagation();
                $("#statusBox .detail").toggleClass("expand");
            });
        }

        private _mousedownEvent(event: JQueryEventObject) {
            if (this.notPersist() &&
                $(event.target).closest("#statusBox").length === 0) {
                event.stopPropagation();
                event.preventDefault();
                this.forceHide();
            }
        }

        private setupBasicClasses(options: StatusDisplayerOpions): void {
            const $statusBox: JQuery = this.$statusBox;
            $statusBox.removeClass()
                      .addClass("active") // shows the box
                      .addClass(this.type)
                      .addClass(this.side);
            if (options.highZindex) {
                $statusBox.addClass("highZindex");
            }
        }

        private setupTargetEvents(formMode: boolean, persist: boolean): void {
            const $target: JQuery = this.$target;
            const $doc: JQuery = $(document);
            const self = this;

            // focus moves scroll bar position so focus first before we get
            // the position of the input
            $target.focus();
            if (formMode) {
                $doc.on("mousedown.statusBox", {"target": $target, "type": this.type}, function(event) {
                    if ($(event.target).closest("#statusBox").length && !$(event.target).closest("#statusBoxClose").length) {
                        return;
                    }
                    self.hideStatusBox(event);
                });
                $target.on("keydown.statusBox", {"target": $target, "type": this.type}, function(event) {
                    if (!xcHelper.isCMDKey(event)) {
                        self.hideStatusBox(event);
                    }
                });
                $target.addClass(self.type);
            } else {
                $doc.on("mousedown.statusBox", function(event) {
                    if ($(event.target).closest("#statusBox").length && !$(event.target).closest("#statusBoxClose").length) {
                        return;
                    }
                    self.hideStatusBox(event);
                });
                $doc.on("keydown.statusBox", function(event) {
                    if (!xcHelper.isCMDKey(event)) {
                        self.hideStatusBox(event);
                    }
                });
            }

            if (persist) {
                self.$statusBox.addClass("persist");
            } else {
                self.$statusBox.removeClass("persist");
                $(window).on("blur.statusBox", function(event) {
                    self.hideStatusBox(event);
                });
            }
        }

        private addTitle(title?: string): void {
            // add more title if type is extended
            if (!title) {
                title = (this.type === "info") ? "Information" : "Error";
            }
            this.$statusBox.find(".titleText").text(title);
        }

        private addText(text: string, html: boolean): void {
            if (html) {
                this.$statusBox.find(".message").html(text);
            } else {
                try {
                    if (text as any instanceof Error) {
                        text = (text as any).message;
                    }
                    if (typeof text === "string" && text.toLowerCase().startsWith("error: ") &&
                        this.$statusBox.find(".titleText").text() === "Error") {
                        // remove duplicate "error: " text
                        text = text.slice("error: ".length);
                    }
                } catch (e) {
                    console.error(e);
                }
                this.$statusBox.find(".message").text(text);
            }
        }

        private addDetail(detail: string): void {
            if (detail) {
                this.$statusBox.addClass("hasDetail");
                this.$statusBox.find(".detailContent").text(detail);
            }
        }

        // position the message
        private setupPosition(offsetX: number = 0, offsetY: number = 0): void {
            let $target: JQuery = this._findTarget();
            const $statusBox: JQuery = this.$statusBox;
            const target = $target[0];
            if (target == null) {
                if (!this.coordinates) {
                    return;
                }
            }
            let bound: ClientRect;
            if (this.coordinates) {
                bound = {
                    left: this.coordinates.left,
                    right: this.coordinates.right,
                    top: this.coordinates.top,
                    bottom: this.coordinates.bottom,
                    height: this.coordinates.top - this.coordinates.bottom,
                    width: this.coordinates.right - this.coordinates.left
                };
            } else {
                bound = target.getBoundingClientRect();
            }
            const winWidth: number = <number>$(window).width();
            const winHeight: number = <number>$(window).height();
            const arrowWidth: number = 12;
            const statusBoxWidth: number = <number>$statusBox.width() + arrowWidth;
            const statusBoxHeight: number = $statusBox.outerHeight();
            let top: number = bound.top - 30;
            let right: number = winWidth - bound.right - statusBoxWidth;
            let left: number = bound.left - statusBoxWidth;

            if (this.side === "right" && bound.left > (winWidth - statusBoxWidth)) {
                // if status box is to be positioned on the right but the target
                // is too far to the right, the status box would obscure it, so
                // position it to the left
                this.side = "left";
                $statusBox.removeClass("right");
                $statusBox.addClass("left");
            }

            if (this.side === "right") {
                right += offsetX;
            } else {
                left += offsetX;
            }
            if (this.side !== "top" && this.side !== "bottom") {
                const heightDiff = bound.height - statusBoxHeight;
                top = Math.max(top, bound.top + (heightDiff / 2));
            }
            top += offsetY;

            if (this.side === "top") {
                left = (bound.left + (<number>$target.outerWidth() / 2) -
                        (statusBoxWidth / 2)) + offsetX;
                left = Math.min(left, winWidth - statusBoxWidth);
                top = bound.top - statusBoxHeight - 15 + offsetY;
            } else if (this.side === "bottom") {
                left = (bound.left + (<number>$target.outerWidth() / 2) -
                        (statusBoxWidth / 2)) + offsetX;
                top = bound.bottom + offsetY;
            }

            // prevent too far left
            left = Math.min(left, winWidth - statusBoxWidth);
            // prevent too far right
            right = Math.max(right, 5);
            // prevent too far top
            top = Math.max(top, 0);
            top = Math.min(top, winHeight - statusBoxHeight);

            if (this.side === "right") {
                $statusBox.css({top: top, right: right, left: "auto"});
            } else {
                $statusBox.css({top: top, left: left, right: "auto"});
            }
        }

        // returns target but if not found, then returns nearest element that's
        // visible
        private _findTarget(): JQuery {
            if (!this.$target.is(":visible") ) {
                return this.$target.closest(":visible");
            } else {
                return this.$target;
            }
        }

        private setupHideOption(preventImmediateHide: boolean, delayHide: number = 0): void {
            let self  = this;
            if (preventImmediateHide) {
                setTimeout(function() {
                    self.open = true;
                }, delayHide);
            } else {
                self.open = true;
            }
        }

        private hideStatusBox(event: any): void {
            var id = $(event.target).attr('id');
            if (event.data && event.data.target) {
                if (id === "statusBoxClose" ||
                    !$(event.target).is(event.data.target) ||
                    this.notPersist() && event.type === "keydown")
                {
                    event.data.target.off("keydown.statusBox")
                                     .removeClass(event.data.type);
                    this.clear();
                }
            } else if (id === "statusBoxClose" || this.notPersist() &&
                $(event.target).closest("#statusBox").length === 0) {
                this.clear();
            }
        }

        private notPersist(): boolean {
            return !this.$statusBox.hasClass("persist");
        }

        private clear(): void {
            const $statusBox = this.$statusBox;
            const $doc = $(document);
            this.open = false;
            $doc.off("mousedown.statusBox");
            $doc.off("keydown.statusBox");
            $(window).off("blur.statusBox");
            $statusBox.removeClass();
            $statusBox.find(".titleText").text("");
            $statusBox.find(".message").text("");
            $statusBox.find(".detail").removeClass("expand")
                      .find(".detailContent").text("");
        }
    }

    /**
     * StatusBox.setup
     */
    export function setup(): void {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        statusDisplayer = new StatusDisplayer();
    }

    /**
     * StatusBox.show
     * @param text
     * @param $target
     * @param isFormMode
     * @param options
     */
    export function show(
        text: string,
        $target: JQuery,
        isFormMode?: boolean,
        options: StatusDisplayerOpions = <StatusDisplayerOpions>{}
    ): void {
        statusDisplayer.show(text, $target, isFormMode, options);
    };

    /**
     * StatusBox.forceHide
     */
    export function forceHide(): void {
        statusDisplayer.forceHide();
    }

    export function isOpen(): boolean {
        return statusDisplayer.isOpen();
    }
}