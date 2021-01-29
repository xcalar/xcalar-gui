abstract class AbstractChartBuilder {
    protected _id: string;
    protected type: string;
    protected _options: {
        data: any,
        xName: string,
        yName: string,
        sorted: boolean,
        bucketSize: number,
        percentage: string,
        decimal: number,
        nullCount: number,
        sum: number,
        max: number,
        initial: boolean,
        resize: boolean,
        resizeDelay: number,
        isBarChart: boolean
    };
    private _tooltipOptions: object
    protected _isBarChart: boolean;

    public constructor(
        id: string,
        options: any
    ) {
        this._id = id;
        this._options = options || {};
        this._tooltipOptions = {
            "trigger": "manual",
            "animation": false,
            "placement": "top",
            "container": "body",
            "html": true,
            "template": '<div class="chartTip tooltip" role="tooltip">' +
                            '<div class="tooltip-arrow"></div>' +
                            '<div class="tooltip-inner"></div>' +
                        '</div>'
        };
        this._isBarChart = this._options.isBarChart;
    }

    public abstract build(): void;

    public getType(): string {
        return this.type;
    }

    public getXName(): string {
        return this._options.xName;
    }

    public getYName(): string {
        return this._options.yName;
    }

    public getBuckSize(): number {
        return this._options.bucketSize;
    }

    public getData(): any {
        return this._options.data;
    }

    public isNoBucket(): boolean {
        let bucketSize = this.getBuckSize();
        return (bucketSize === 0);
    }

    public isSorted(): boolean {
        return this._options.sorted;
    }

    public getLowerBound(num: number): number {
        let bucketSize = this.getBuckSize();
        let isLogScale = (bucketSize < 0);
        return this._getNumInScale(num, isLogScale);
    }

    public getUpperBound(num): number {
        let bucketSize = this.getBuckSize();
        let isLogScale = (bucketSize < 0);
        return this._getNumInScale(num + Math.abs(bucketSize), isLogScale);
    }

    protected _getModal(): JQuery {
        return $("#" + this._id);
    }

    protected _getSection(): JQuery {
        return this._getModal().find(".groupbyInfoSection");
    }

    protected _getChartSelector(): string {
        return `#${this._id} .groupbyChart`;
    }

    protected _emptyChart(): void {
        let $modal = this._getModal();
        $modal.find(".groupbyChart").empty();
    }

    protected _getLabel(d: object, charLenToFit: number): string {
        let options = this._options;
        let yName = options.yName;
        let sum = options.sum;
        let percentageLabel = options.percentage;

        if (percentageLabel && sum !== 0) {
            let num: number = d[yName];
            let nullCount = options.nullCount;
            // show percentage
            num = (num / (sum + nullCount) * 100);

            var intLenth = String(Math.floor(num)).length;
            // charFit - integer part - dot - % - 1charPadding
            var fixLen = Math.max(1, charLenToFit - intLenth - 3);
            // XXX that's for Citi's request to have maxium 2 digits
            // in decimal, used to be 3, can change back
            fixLen = Math.min(fixLen, 2);
            return (num.toFixed(fixLen) + "%");
        } else {
            let num = this._formatNumber(d[yName], false, null, false);
            if (num.length > charLenToFit) {
                return (num.substring(0, charLenToFit) + "..");
            } else {
                return num;
            }
        }
    }

    protected _getXAxis(d: any, charLenToFit?: number): string {
        let options = this._options;
        let bucketSize = this.getBuckSize();
        let noBucket = this.isNoBucket();
        let sorted = this.isSorted();
        let xName = this.getXName();
        let decimalNum = options.decimal;

        let isFNF = (d.type === "nullVal");
        let isLogScale = (bucketSize < 0);
        let lowerBound = this.getLowerBound(d[xName]);
        let name = this._formatNumber(lowerBound, isLogScale, decimalNum, isFNF);

        if (!noBucket && sorted && !isFNF) {
            let upperBound = this.getUpperBound(d[xName]);
            upperBound = this._formatNumber(upperBound, isLogScale, decimalNum, false);
            name = name + "-" + upperBound;
        }

        if (charLenToFit != null && name.length > charLenToFit) {
            return (name.substring(0, charLenToFit) + "..");
        } else {
            return name;
        }
    }

    protected _getTooltpAndClass(ele: string, d: any): string {
        // a little weird method to setup tooltip
        // may have better way
        let options = this._options;
        let nullCount = options.nullCount;
        let bucketSize = this.getBuckSize();
        let noBucket = this.isNoBucket();
        let xName = this.getXName();
        let yName = this.getYName();
        let sum = options.sum;
        let decimalNum = options.decimal;
        let percentageLabel = options.percentage;

        let isLogScale: boolean = (bucketSize < 0);
        let lowerBound = this.getLowerBound(d[xName]);
        let isFNF: boolean = (d.type === "nullVal");
        let title: string;
        let label = this._isBarChart ? "" : "Value: ";
        if (d.section === "other") {
            title = label + "Other<br>";
        } else if (noBucket || isFNF) {
            // xName is the backColName, may differenet with frontColName
            title = label +
                    this._formatNumber(lowerBound, isLogScale, decimalNum, isFNF) +
                    "<br>";
        } else {
            var upperBound = this.getUpperBound(d[xName]);
            title = label + "[" +
                    this._formatNumber(lowerBound, isLogScale, decimalNum, false) +
                    ", " +
                    this._formatNumber(upperBound, isLogScale, decimalNum, false) +
                    ")<br>";
        }

        if (percentageLabel && sum !== 0) {
            let num: number = d[yName] / (sum + nullCount) * 100;
            let per: string = num.toFixed(3);

            if (num < 0.001) {
                // when the percentage is too small
                per = num.toExponential(2) + "%";
            } else {
                per += "%";
            }
            title += "Percentage: " + per;
        } else {
            let label = this._isBarChart ? "Value" : "Frequency";
            title += label += ": " + this._formatNumber(d[yName], false, null, false);
        }
        let tipOptions = $.extend({}, this._tooltipOptions, {
            "title": title
        });
        $(ele).tooltip("destroy");
        $(ele).tooltip(tipOptions);
        return "area";
    }

    private _getNumInScale(num: number, isLogScale: boolean): number {
        if (!isLogScale) {
            return num;
        }
        // log scale;
        if (num === 0) {
            return 0;
        }

        let absNum = Math.abs(num);
        absNum = Math.pow(10, absNum - 1);
        return (num > 0) ? absNum : -absNum;
    }

    private _formatNumber(
        num: number,
        isLogScale: boolean,
        decimal: number,
        isFNF: boolean
    ): any {
        if (num == null) {
            console.warn("cannot format empty or null value");
            return "";
        } else if (isFNF) {
            return "FNF";
        } else if (typeof(num) === "string") {
            if (this._isBarChart) {
                return num;
            }
            return "\"" + num + "\"";
        } else if (typeof(num) === "boolean") {
            return num;
        } else if (isNaN(num)) {
            if (typeof num === "object") {
                return JSON.stringify(num);
            }
            return num;
        } else if (isLogScale) {
            if (num <= 1 && num >= -1) {
                return num;
            } else {
                return num.toExponential();
            }
        } else if (decimal != null && decimal > -1) {
            return num.toFixed(decimal);
        }
        // if not speify maximumFractionDigits, 168711.0001 will be 168,711
        return xcStringHelper.numToStr(num, 5);
    }
}