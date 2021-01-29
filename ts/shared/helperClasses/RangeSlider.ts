interface RangeSliderOptions {
    minVal?: number;
    maxVal?: number;
    minWidth?: number;
    maxWidth?: number;
    onChangeEnd?: Function;
}

class RangeSlider {
    private minVal: number;
    private maxVal: number;
    private halfSliderWidth: number;
    private minWidth: number;
    private maxWidth: number;
    private valRange: number;
    private widthRange: number;
    private $rangeSliderWrap: JQuery;
    private $rangeInput: JQuery;
    private prefName: string;
    private options: RangeSliderOptions;

    public constructor($rangeSliderWrap, prefName, options?: RangeSliderOptions) {
        options = options || {};
        const self: RangeSlider = this;
        this.minVal = options.minVal || 0;
        this.maxVal = options.maxVal || 0;
        this.halfSliderWidth = Math.round($rangeSliderWrap.find('.slider').width() / 2);
        this.minWidth = options.minWidth || this.halfSliderWidth;
        this.maxWidth = options.maxWidth || $rangeSliderWrap.find('.rangeSlider').width();
        this.valRange = this.maxVal - this.minVal;
        this.widthRange = this.maxWidth - this.minWidth;
        this.$rangeSliderWrap = $rangeSliderWrap;
        this.$rangeInput = $rangeSliderWrap.find('input');
        this.prefName = prefName;
        this.options = options;

        $rangeSliderWrap.find('.leftArea').resizable({
            "handles": "e",
            "minWidth": self.minWidth,
            "maxWidth": self.maxWidth,
            "stop": function(_event, ui) {
                const val: number = self.updateInput(ui.size.width);
                UserSettings.Instance.setPref(prefName, val, true);
                if (options.onChangeEnd) {
                    options.onChangeEnd(val);
                }
            },
            "resize": function(_event, ui) {
                self.updateInput(ui.size.width);
            }
        });


        $rangeSliderWrap.find('.leftArea').on('mousedown', function(event: JQueryEventObject) {
            if (!$(event.target).hasClass('leftArea')) {
                // we don't want to respond to slider button being clicked
                return;
            }
            self.handleClick(event);
        });

        $rangeSliderWrap.find('.rightArea').on('mousedown', function(event: JQueryEventObject) {
            self.handleClick(event);
        });

        $rangeSliderWrap.find('input').on('input', function() {
            if (!$(this).is(":visible")) return; // ENG-8642
            let val: number = parseFloat($(this).val());
            val = Math.min(self.maxVal, Math.max(val, self.minVal));
            self.updateSlider(val);
        });

        $rangeSliderWrap.find('input').on('change', function() {
            let val: number = parseFloat($(this).val());
            val = Math.min(self.maxVal, Math.max(val, self.minVal));
            $(this).val(val);
            UserSettings.Instance.setPref(self.prefName, val, true);
            if (options.onChangeEnd) {
                options.onChangeEnd(val);
            }
        });

        $rangeSliderWrap.find('input').on('keydown', function(event: JQueryEventObject) {
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });
    }

    public updateInput(uiWidth: number): number {
        const width: number = uiWidth - this.minWidth;
        let val: number = (width / this.widthRange) * this.valRange + this.minVal;
        val = Math.round(val);
        this.$rangeInput.val(val);
        return val;
    }

    public updateSlider(val: number): void {
        let width: number = ((val - this.minVal) / this.valRange) * this.widthRange +
                    this.minWidth;

        width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
        this.$rangeSliderWrap.find('.leftArea').width(width);
    }

    public handleClick(event: JQueryEventObject): void {
        if (event.which !== 1) {
            return;
        }
        const self: RangeSlider = this;
        const $rangeSlider: JQuery = $(event.target).closest('.rangeSlider');
        let mouseX: number = event.pageX - $rangeSlider.offset().left +
                     self.halfSliderWidth;
        mouseX = Math.min(self.maxWidth, Math.max(self.minWidth, mouseX));
        const val: number = self.updateInput(mouseX);
        self.updateSlider(val);
        UserSettings.Instance.setPref(self.prefName, val, true);
        if (self.options.onChangeEnd) {
            self.options.onChangeEnd(val);
        }
    }

    public setSliderValue(val: number): void {
        this.updateSlider(val);
        this.$rangeInput.val(val);
    }
}