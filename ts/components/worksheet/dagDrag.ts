interface DragHelperOptions {
    $container: JQuery,
    $dropTarget: JQuery,
    $element: JQuery,
    $elements?: JQuery,
    onDragStart?: Function,
    onDrag?: Function,
    onDragEnd: Function,
    onDragFail: Function,
    copy?: boolean,
    move?: boolean,
    event: JQueryEventObject
    offset?: Coordinate,
    noCursor?: boolean,
    round?: number,
    scale?: number,
    elOffsets?: Coordinate[],
    padding?: number,
    isDragginNodeConnector?: boolean
}

interface DragHelperCoordinate {
    left: number,
    top: number,
    height: number,
    width: number
}

class DragHelper {
    protected $container: JQuery;
    protected $dropTarget: JQuery;
    protected onDragStartCallback: Function;
    protected onDragCallback: Function;
    protected onDragEndCallback: Function;
    protected onDragFailCallback: Function;
    protected $el: JQuery;
    protected $els: JQuery;
    protected $draggingEl: JQuery;
    protected $draggingEls: JQuery;
    protected mouseDownCoors: Coordinate;
    protected isDragging: boolean;
    protected targetRect: ClientRect;
    protected isOffScreen: boolean;
    protected offset: Coordinate;
    protected copying: boolean;
    protected origPositions: Coordinate[];
    protected currentDragCoor: DragHelperCoordinate;
    protected customOffset: Coordinate;
    protected dragContainerItemsPositions: Coordinate[];
    protected noCursor: boolean;
    protected lastX: number;
    protected lastY: number;
    protected currX: number;
    protected currY: number;
    protected scrollUpCounter: number;
    protected scrollTop: number;
    protected scrollLeft: number;
    protected round: number;
    protected scale: number;
    protected elOffsets: Coordinate[]
    protected padding: number;
    protected horzScrollDirection: number;
    protected containerOffset: Coordinate;
    protected isDraggingNodeConnector: boolean;
    protected scrollAreas: {width: number, height: number};// width/height of area inside parent target
    // where you can hover over and expect to cause a scroll

    public constructor(options: DragHelperOptions) {
        const self = this;
        this.$container = options.$container;
        this.$dropTarget = options.$dropTarget;
        this.$el = options.$element;
        if (options.$elements) {
            this.$els = options.$elements;
        } else {
            this.$els = this.$el;
        }
        this.onDragStartCallback = options.onDragStart;
        this.onDragCallback = options.onDrag;
        this.onDragEndCallback = options.onDragEnd;
        this.onDragFailCallback = options.onDragFail;
        this.copying = options.copy || false;
        this.$draggingEl = null;
        this.mouseDownCoors = {x: 0, y: 0};
        this.targetRect = {bottom: 0, height: 0, left: 0, right: 0, top: 0,
                            width: 0};
        this.isOffScreen = false;
        this.origPositions = [];
        this.currentDragCoor = {left: 0, top: 0, height: 0, width: 0};
        this.isDragging = false;
        this.customOffset = options.offset || {x: 0, y: 0};
        this.dragContainerItemsPositions = [];
        this.noCursor = options.noCursor || false;
        this.isDraggingNodeConnector = options.isDragginNodeConnector || false;
        this.scrollUpCounter = 0;
        this.horzScrollDirection = 0;
        this.scrollLeft = this.$dropTarget.parent().scrollLeft();
        this.scrollTop = this.$dropTarget.parent().scrollTop();
        this.round = options.round || 0;
        this.scale = options.scale || 1;
        this.round *= this.scale;
        this.mouseDownCoors = {
            x: options.event.pageX,
            y: options.event.pageY
        };
        this.lastX = this.mouseDownCoors.x;
        this.lastY = this.mouseDownCoors.y;
        this.currX = this.lastX;
        this.currY = this.lastY;
        this.elOffsets = options.elOffsets || [];
        this.padding = options.padding || 0;
        this.containerOffset = {
            x: this.$container.offset().left,
            y: this.$container.offset().top
        };
        this.scrollAreas = {width: 80, height: 40};

        $(document).on("mousemove.checkDrag", function(event: JQueryEventObject) {
            self.checkDrag(event);
        });

        $(document).on("mouseup.endDrag", function(event: JQueryEventObject) {
            self.endDrag(event);
        });
    }

    private checkDrag(event: JQueryEventObject): void {
        if (Math.abs(this.mouseDownCoors.x - event.pageX) < 2 &&
            Math.abs(this.mouseDownCoors.y - event.pageY) < 2) {
                return;
        }
        this.isDragging = true;
        $(document).off("mousemove.checkDrag");
        this.onDragStart(event);
    }

    private onDragStart(event: JQueryEventObject): void {
        const self = this;

        const cursorStyle = '<div id="moveCursor"></div>';
        $("body").addClass("tooltipOff").append(cursorStyle);
        if (this.noCursor) {
            $("#moveCursor").addClass("arrowOnly");
        }

        this.targetRect = this.$dropTarget.parent()[0].getBoundingClientRect();
        this.scrollAreas.height = (this.targetRect.height / 10);
        let minX = 20;
        let maxX = 60;
        if (this.isDraggingNodeConnector) {
            minX = 12;
            maxX = 30;
        }
        this.scrollAreas.height = Math.min(this.scrollAreas.height, maxX);
        this.scrollAreas.height = Math.max(this.scrollAreas.height, minX);

        this.createClone();
        this.positionDraggingEl(event);
        this.adjustScrollBar();

        $(document).on("mousemove.onDrag", function(event) {
            self.onDrag(event);
        });
        if (this.onDragStartCallback) {
            this.onDragStartCallback(this.$els, event);
        }
    }

    private onDrag(event: JQueryEventObject): void {
        this.currX = event.pageX;
        this.currY = event.pageY;
        if (this.currX !== this.lastX) {
            this.horzScrollDirection = this.currX - this.lastX;
        }
        this.positionDraggingEl(event);
        if (this.onDragCallback) {
            this.onDragCallback({
                x: this.currentDragCoor.left + this.containerOffset.x,
                y: this.currentDragCoor.top + this.containerOffset.y
            });
        }
    }

    private adjustScrollBar(): void {
        if (!this.isDragging) {
            return;
        }
        const self = this;
        const pxToIncrement = 20;
        const horzPxToIncrement = 40;
        const deltaY = this.currY - this.lastY;
        const timer = 40;
        const idleTimeLimit = 400;
        const currLeft = this.currX - this.scrollAreas.width;
        const currRight = this.currX + this.scrollAreas.width;
        const currTop = this.currY - this.scrollAreas.height;
        const currBottom = this.currY + this.scrollAreas.height;
        if (deltaY < 1) {
            this.scrollUpCounter++;
        } else {
            this.scrollUpCounter = 0;
        }

        if (currLeft < this.targetRect.left && this.horzScrollDirection < 0) {
            this.scrollLeft = this.$dropTarget.parent().scrollLeft();
            this.scrollLeft -= pxToIncrement;
            this.scrollLeft = Math.max(0, this.scrollLeft);
            this.$dropTarget.parent().scrollLeft(this.scrollLeft);
            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if (currTop < this.targetRect.top) {
            // only scroll up if staying still or mouse is moving up
            if (this.scrollUpCounter * timer > idleTimeLimit) {
                this.scrollTop = this.$dropTarget.parent().scrollTop();
                this.scrollTop -= pxToIncrement;
                this.scrollTop = Math.max(0, this.scrollTop);
                this.$dropTarget.parent().scrollTop(this.scrollTop);
            }

            if (!this.isOffScreen) {
                this.isOffScreen = true;
                this.$draggingEl.addClass("isOffScreen");
            }
        } else if (currBottom > this.targetRect.bottom) {
            this.scrollTop = this.$dropTarget.parent().scrollTop();
            if (this.$dropTarget.parent()[0].scrollHeight - this.scrollTop -
            this.$dropTarget.parent().outerHeight() <= 1) {
                const height: number = this.$dropTarget.height();
                this.$dropTarget.css("min-height", height + 10);
            }
            this.scrollTop += pxToIncrement;
            this.scrollTop = Math.max(0, this.scrollTop);
            this.$dropTarget.parent().scrollTop(this.scrollTop);
        } else if (currRight > this.targetRect.right && this.horzScrollDirection > 0) {
            this.scrollLeft = this.$dropTarget.parent().scrollLeft();
            if (this.$dropTarget.parent()[0].scrollWidth - this.scrollLeft -
            this.$dropTarget.parent().outerWidth() <= 1) {
                const width: number = this.$dropTarget.width();
                this.$dropTarget.css("min-width", width + 20);
            }
            this.scrollLeft += horzPxToIncrement;
            this.scrollLeft = Math.max(0, this.scrollLeft);
            this.$dropTarget.parent().scrollLeft(this.scrollLeft);

        } else if (this.isOffScreen) {
            this.isOffScreen = false;
            this.$draggingEl.removeClass("isOffScreen");
        }

        this.lastX = this.currX;
        this.lastY = this.currY;

        setTimeout(function() {
            self.adjustScrollBar();
        }, timer);
    }

    private createClone(): void {
        const self = this;
        let minX: number = this.targetRect.right;
        let maxX: number = 0;
        let minY: number = this.targetRect.bottom;
        let maxY: number = 0;
        let origPositions: Coordinate[] = [];

        // find the left most element, right most, top-most, bottom-most
        // so we can create a div that's sized to encapsulate all dragging elements
        // and append these to the div
        this.$els.find(".topNodeIcon").hide();// prevent nodeIcons from interfering with position
        this.$els.find(".graphHead").hide();// prevent nodeIcons from interfering with position
        this.$els.each(function(i) {
            const elOffset = self.elOffsets[i] || {x: 0, y: 0};
            let rect = this.getBoundingClientRect();
            let left = rect.left + elOffset.x;
            let top = rect.top + elOffset.y;
            origPositions.push({
                x: left,
                y: top
            });
            minX = Math.min(minX, left);
            maxX = Math.max(maxX, rect.right);
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, rect.bottom);
        });
        this.$els.find(".topNodeIcon").show();
        this.$els.find(".graphHead").show();
        let width: number = maxX - minX;
        let height: number = maxY - minY;
        const left: number = minX;
        const top: number = minY;

        let html = '<div class="dragContainer" style="width:' +
                        width + 'px;height:' + height + 'px;left:' + left +
                        'px;top:' + top + 'px;transform:scale(' + this.scale + ')">' +
                        '<div class="innerDragContainer"></div>' +
                        '<svg version="1.1" class="dragSvg" ' +
                        'width="100%" height="100%"></svg>' +
                    '</div>';
        this.$draggingEl = $(html);
        this.currentDragCoor = {
            left: left,
            top: top,
            width: width,
            height: height
        };

        // offset should not exceed the cloned element's width or height
        this.offset = {
            x: Math.max(-this.currentDragCoor.width * self.scale,
                        (left - this.mouseDownCoors.x + this.customOffset.x)),
            y: Math.max(-this.currentDragCoor.height * self.scale,
                        (top - this.mouseDownCoors.y + this.customOffset.y))
        };

        const $clones: JQuery = this.$els.clone();
        $clones.each(function() {
            let $clone = $(this);
            if ($clone.is("g") || $clone.is("rect") || $clone.is("polygon") ||
                $clone.is("svg")) {
                if ($clone.hasClass("connIn")) {
                    $clone.children().each(function() {
                        const $child = $(this);
                        $child.attr("x", 0);
                        $child.attr("y", 0);
                    });
                }

                self.$draggingEl.find(".dragSvg").append($(this));
            } else {
                self.$draggingEl.find(".innerDragContainer").append($clones);
            }
        });

        $clones.each(function(i: number) {
            let $clone = $(this);
            let cloneLeft = (origPositions[i].x - left) / self.scale;
            let cloneTop = (origPositions[i].y - top) / self.scale;

            if ($clone.is("g")) {
                $clone.attr("transform", "translate(" + cloneLeft + ", " +
                                                        cloneTop + ")");
            } else if ($clone.is("rect") || $clone.is("polygon") ||
                $clone.is("svg")) {
                $(this).attr("x", cloneLeft)
                        .attr("y", cloneTop);
            } else {
                $clone.css({
                    left: cloneLeft,
                    top: cloneTop
                });
            }

            self.dragContainerItemsPositions.push({
                x: cloneLeft,
                y: cloneTop
            });
        });
        this.$container.append(this.$draggingEl);

        if (this.copying) {
            this.$draggingEls = $clones;
            this.$draggingEl.addClass("clone");
        } else {
            this.$draggingEls = this.$els;
            this.$draggingEls.addClass("dragSelected");
        }
    }

    private positionDraggingEl(
        event: JQueryEventObject
    ): void {
        this.currentDragCoor.left = event.pageX + this.offset.x;
        this.currentDragCoor.top = event.pageY + this.offset.y;
        if (this.round) {
            const curOffsetLeft = this.currentDragCoor.left - (this.targetRect.left - this.scrollLeft);
            const leftRounded = Math.round(curOffsetLeft / this.round) * this.round;
            const leftDiff = leftRounded - curOffsetLeft;
            this.currentDragCoor.left += leftDiff;

            const curOffsetTop = this.currentDragCoor.top - (this.targetRect.top - this.scrollTop);
            const topRounded = Math.round(curOffsetTop / this.round) * this.round;
            const topDiff = topRounded - curOffsetTop;
            this.currentDragCoor.top += topDiff;
        }
        this.currentDragCoor.left -= this.containerOffset.x;
        this.currentDragCoor.top -= this.containerOffset.y;
        this.$draggingEl.css({
            left: this.currentDragCoor.left,
            top: this.currentDragCoor.top
        });
    }

    protected endDrag(event: JQueryEventObject): void {
        $("body").removeClass("tooltipOff");
        $("#moveCursor").remove();
        $(document).off("mousemove.checkDrag");
        $(document).off("mousemove.onDrag");
        $(document).off("mouseup.endDrag");
        if (!this.isDragging) {
            this.onDragFailCallback();
            return;
        }
        this.positionDraggingEl(event);
        this.isDragging = false;
        this.$draggingEl.removeClass("dragging clone");

        let deltaX: number = this.currentDragCoor.left - this.targetRect.left + this.scrollLeft + this.containerOffset.x;
        let deltaY: number = this.currentDragCoor.top - this.targetRect.top + this.scrollTop + this.containerOffset.y;
        let coors: Coordinate[] = [];
        // check if item was dropped within left and top boundaries of drop target
        if (deltaX >= this.padding && deltaY >= this.padding) {
            this.dragContainerItemsPositions.forEach(pos => {
                coors.push({
                    x: Math.round((deltaX / this.scale) + pos.x),
                    y: Math.round((deltaY / this.scale) + pos.y)
                });
            });
        }

        this.$draggingEls.removeClass("dragSelected");
        this.$draggingEl.remove();

        if (coors.length) {
            this.onDragEndCallback(this.$draggingEls, event, {coors: coors});
        } else {
            this.onDragFailCallback(true);
        }
    }
}