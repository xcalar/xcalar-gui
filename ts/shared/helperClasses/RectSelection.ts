/*
 * options:
    id: id of the rect element
    $container: container
    onStart: trigger when start move
    onDraw: trigger when drawing
    onEnd: trigger when mouse up
 */
interface RectSelectionOptions {
    id?: string;
    $container?: JQuery;
    onStart?: Function;
    onDraw?: Function;
    onEnd?: Function;
    onMouseup?: Function;
    $scrollContainer?: JQuery;
    scale?: number
}

class RectSelection {
    private x: number;
    private y: number;
    private id: string;
    private $container: JQuery;
    private $scrollContainer: JQuery;
    private bound: ClientRect;
    private scrollBound: ClientRect;
    private onStart: Function;
    private onDraw: Function;
    private onEnd: Function;
    private onMouseup: Function;
    private isDragging: boolean;
    private mouseCoors: Coordinate;
    private initialX: number;
    private initialY: number;
    private scale: number;

    public constructor(x: number, y: number, options?: RectSelectionOptions) {
        options = options || {};
        const self: RectSelection = this;
        // move it 1px so that the filterSelection
        // not stop the click event to toggle percertageLabel
        // to be trigger
        self.x = x + 1;
        self.y = y;
        self.id = options.id;
        self.$container = options.$container;
        self.bound = self.$container.get(0).getBoundingClientRect();
        self.onStart = options.onStart;
        self.onDraw = options.onDraw;
        self.onEnd = options.onEnd;
        self.onMouseup = options.onMouseup;
        self.$scrollContainer = options.$scrollContainer || self.$container;
        self.scrollBound = self.$scrollContainer.get(0).getBoundingClientRect();
        self.isDragging = false;
        self.mouseCoors = {x:0, y:0};
        self.scale = options.scale || 1;
        const bound: ClientRect = self.bound;
        let left: number = self.x - bound.left;
        let top: number = self.y - bound.top;

        self.initialX = left;
        self.initialY = top;
        left /= self.scale;
        top /= self.scale;

        const html: HTML = '<div id="' + self.id + '" class="rectSelection" style="' +
                    'pointer-events: none; left:' + left +
                    'px; top:' + top + 'px; width:0; height:0;"></div>';
        self.__getRect().remove();
        self.$container.append(html);
        self.__addSelectRectEvent();
        xcUIHelper.removeSelectionRange();
    }

    public __addSelectRectEvent() {
        const self: RectSelection = this;
        self.isDragging = true;
        $(document).on("mousemove.checkMovement", function(event) {
            // check for mousemovement before actually calling draw
            self.checkMovement(event.pageX, event.pageY);
        });

        $(document).on("mouseup.selectRect", function(event: JQueryEventObject) {
            self.end(event);
            $(document).off(".selectRect");
            $(document).off("mousemove.checkMovement");
            if (typeof self.onMouseup === "function") {
                self.onMouseup();
            }
        });
    }

    public __getRect(): JQuery {
        return $("#" + this.id);
    }

    public checkMovement(x: number, y: number): void {
        const self: RectSelection = this;
        if (Math.abs(x - self.x) > 0 || Math.abs(y - self.y) > 0) {
            if (typeof self.onStart === "function") {
                self.onStart();
            }

            $(document).off('mousemove.checkMovement');
            $(document).on("mousemove.selectRect", function(event) {
                self.mouseCoors.x = event.pageX;
                self.mouseCoors.y = event.pageY;
                self.draw(event.pageX, event.pageY);
            });
            self.mouseCoors.x = x;
            self.mouseCoors.y = y;

            self.adjustScrollBar();
        }
    }

    public draw(x: number, y: number): void {
        const self: RectSelection = this;

        self.bound = self.$container.get(0).getBoundingClientRect();
        const bound: ClientRect = self.bound;

        // x should be within bound.left and bound.right
        x = Math.max(0, Math.min(x - bound.left, bound.width / self.scale));
        // y should be within bound.top and bound.bottom
        y = Math.max(0, Math.min(y - bound.top, bound.height / self.scale));

        // update rect's position
        let left: number;
        let top: number;
        let w: number = x - self.initialX;
        let h: number = y - self.initialY;
        const $rect: JQuery = self.__getRect();

        if (w >= 0) {
            left = self.initialX;
        } else {
            left = self.initialX + w;
            w = -w;
        }

        if (h >= 0) {
            top = self.initialY;
        } else {
            top = self.initialY + h;
            h = -h;
        }

        const bottom: number = top + h;
        const right: number = left + w;
        $rect.css("left", left / self.scale)
            .css("top", top / self.scale)
            .width(w / self.scale)
            .height(h / self.scale);

        if (typeof self.onDraw === "function") {
            self.onDraw(bound, top, right, bottom, left);
        }
    }

    public end(event): void {
        const self: RectSelection = this;
        self.__getRect().remove();
        if (typeof self.onEnd === "function") {
            self.onEnd(event);
        }
        self.isDragging = false;
    }

    private adjustScrollBar(): void {
        if (!this.isDragging) {
            return;
        }
        const self = this;
        const pxToIncrement = 20;
        const horzPxToIncrement = 40;
        const timer = 40;
        let scrollLeft;
        let scrollTop;

        if (this.mouseCoors.x < this.scrollBound.left) {
            scrollLeft = this.$scrollContainer.scrollLeft();
            scrollLeft -= pxToIncrement;
            this.$scrollContainer.scrollLeft(scrollLeft);
        } else if (this.mouseCoors.y < this.scrollBound.top) {
            scrollTop = this.$scrollContainer.scrollTop();
            scrollTop -= pxToIncrement;
            this.$scrollContainer.scrollTop(scrollTop);
        } else if (this.mouseCoors.y  > this.scrollBound.bottom) {
            scrollTop = this.$scrollContainer.scrollTop();
            scrollTop += pxToIncrement;
            this.$scrollContainer.scrollTop(scrollTop);
        } else if (this.mouseCoors.x > this.scrollBound.right) {
            scrollLeft = this.$scrollContainer.scrollLeft();
            scrollLeft += horzPxToIncrement;
            this.$scrollContainer.scrollLeft(scrollLeft);
        }

        setTimeout(function() {
            self.adjustScrollBar();
        }, timer);
    }
}