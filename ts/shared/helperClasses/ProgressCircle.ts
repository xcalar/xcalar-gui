/* Progress circle for locked tables */
// options:
//  steps: number,
interface ProgressCircleOptions {
    steps?: number;
}

class ProgressCircle  {
    private txId: string | number;
    private iconNum: number;
    private options: ProgressCircleOptions;
    private status: string;
    public progress: number;
    private hasText: boolean;
    private prevPct: number;
    private step: number;
    private svg: d3;
    private arc: Function;
    private pie: Function;

    public constructor(
        txId: number | string,
        iconNum: number,
        hasText?: boolean,
        options?: object) {
        this.txId = txId;
        this.iconNum = iconNum;
        this.options = options || {};
        this._reset();
        this.status = "inProgress";
        this.progress = 0;
        this.hasText = hasText;
    }

    public update(pctOrStep: number, duration?: number): void {
        if (this.status === "done") {
            return;
        }
        let pct: number;
        let step: number;
        if (this.options.steps) {
            step = pctOrStep;
            pct = Math.floor(100 * step / this.options.steps);
        } else {
            pct = pctOrStep;
            if (isNaN(pct)) {
                pct = 0;
            }
        }
        pct = Math.max(Math.min(pct, 100), 0);
        const prevPct: number = this.prevPct;
        this.prevPct = pct;
        this.step = step;

        if (prevPct > pct) {
            this._reset();
        } else if (prevPct === pct) {
            // let the animation continue/finish
            return;
        }

        const svg: d3 = this.svg;
        const pie: Function = this.pie;
        const arc: Function = this.arc;
        const paths = svg.selectAll("path").data(pie([pct, 100 - pct]));
        duration = (duration == null) ? 2000 : duration;

        paths.transition()
            .ease("linear")
            .duration(duration)
            .attrTween("d", function(a) {
                const i = d3.interpolate(this._current, a);
                this._current = i(0);
                return (function(t) {
                    return (arc(i(t)));
                });
            });

        if (this.hasText) {
            this._updateText(pct, step, duration);
        }
    }

    public increment(): void {
        this.update(++this.step);
    }

    public done(): void {
        this.status = "completing";
        this.update(100, 500);
        this.status = "done";
    }

    private _updateText(pct, step, duration) {
        let destNum = pct;
        let selector = '.lockedTableIcon[data-txid="' + this.txId +
                        '"] .pctText .num';
        if (this.options.steps) {
            destNum = step;
            selector = '.lockedTableIcon[data-txid="' + this.txId +
                        '"] .stepText .currentStep';
        }

        d3.select(selector)
        .transition()
        .duration(duration)
        .ease("linear")
        .tween("text", function() {
            const num: number = this.textContent || 0;
            const i: Function = d3.interpolateNumber(num, destNum);
            return (function(t) {
                this.textContent = Math.ceil(i(t));
            });
        });
    }

    private _reset(): void {
        const radius: number = 32;
        const diam: number = radius * 2;
        const thick: number = 7;
        $('.progressCircle[data-txid="' + this.txId + '"][data-iconnum="' +
            this.iconNum + '"] .progress').empty();
        const arc: Function = d3.svg.arc()
                    .innerRadius(radius - thick)
                    .outerRadius(radius);
        const pie: Function = d3.layout.pie().sort(null);
        const svg: d3 = d3.select('.progressCircle[data-txid="' + this.txId +
                            '"][data-iconnum="' + this.iconNum + '"] .progress')
                    .append("svg")
                    .attr({"width": diam, "height": diam})
                    .append("g")
                    .attr("transform", "translate(" + radius + ", " +
                            radius + ")");
        svg.selectAll("path")
            .data(pie([0, 100]))
            .enter()
            .append("path")
            .attr("d", arc)
            .each(function(d) {
                this._current = d;
            });

        if (this.options.steps) {
            this.step = 0;
            $('.progressCircle[data-txid="' + this.txId + '"][data-iconnum="' +
            this.iconNum + '"]').find(".totalSteps").text(this.options.steps);
        }

        this.svg = svg;
        this.pie = pie;
        this.arc = arc;
        this.prevPct = 0;
    }

};