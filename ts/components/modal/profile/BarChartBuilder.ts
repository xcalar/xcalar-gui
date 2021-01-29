class BarChartBuilder extends AbstractChartBuilder {
    private _textColor =  "#000000";

    public constructor(
        id: string,
        options: any
    ) {
        super(id, options);
        this.type = "bar";
        if (xcGlobal.darkMode) {
            this._textColor = "#FFFFFF";
        }
    }

    public build() {
        let options = this._options;
        let initial = options.initial;
        let resize = options.resize;

        let xName = this.getXName();
        let yName = this.getYName();

        let nullCount = options.nullCount;

        let max = options.max;

        let noSort = !this.isSorted();
        let noBucket = this.isNoBucket();

        let data = options.data;

        let $section: JQuery = this._getSection();
        let dataLen: number = data.length;

        let sectionWidth: number = $section.width();
        const marginBottom: number = 20;
        const marginLeft: number = 20;

        let maxRectW: number = Math.floor(sectionWidth / 706 * 70);
        let chartWidth: number = Math.min(sectionWidth, maxRectW * data.length
                                    + marginLeft * 2);
        let chartHeight: number = $section.height();

        let height: number = chartHeight - marginBottom;
        let width: number = chartWidth - marginLeft * 2;

        let tickHeight: number = height + marginBottom / 2;

        // x range and y range
        let maxHeight: number = Math.max(max, nullCount);

        let x = (_d, i) => {
            return i * (width / dataLen);
        };
        let y = d3.scale.linear()
                    .range([height, 0])
                    .domain([-(maxHeight * 0.02), maxHeight]);

        let xWidth = 0.9 * (width / dataLen);

        // let xWidth = x.rangeBand();
        // 6.2 is the width of a char in .xlabel
        let charLenToFit = Math.max(1, Math.floor(xWidth / 6.2) - 1);
        let left: any = (sectionWidth - chartWidth) / 2;
        let chart;
        let barAreas;
        let self = this;

        let getLabel = (d) => this._getLabel(d, charLenToFit);
        let getXAxis = (d) => this._getXAxis(d);
        let getLastBucketTick = () => this._getLastBucketTick();
        let getTooltipAndClass = function(d) {
            let ele = this;
            return self._getTooltpAndClass(ele, d);
        };
        let wrapXAxis = (textNodes) => this._wrapXAxis(textNodes, charLenToFit);
        let updateTicks = function(areas: d3, isLast: boolean) {
            let textFunc = isLast ? getLastBucketTick : getXAxis;
            let selecttor: string = ".tick";
            selecttor += isLast ? ".last" : "";
            areas.select(selecttor)
                    .text(textFunc)
                    .call(wrapXAxis);
        };
        let getTickX = (d, i) => {
            if (!noBucket && noSort) {
                return x(d[xName], i) + (i === 0 ? marginLeft / 2 : 0);
            } else {
                return x(d[xName], i) + xWidth / 2;
            }
        };
        let getLastTickX = (d) => {
            return x(d[xName], dataLen - 1) + xWidth;
        };


        if (initial) {
            this._emptyChart();
            chart = d3.select(self._getChartSelector())
                .attr("width", chartWidth)
                .attr("height", chartHeight + 2)
                .style("position", "relative")
                .style("left", left + "px")
                .style("overflow", "visible")
            .append("g")
                .attr("class", "barChart")
                .attr("transform", "translate(" + marginLeft + ", 0)");

            $(".chartTip").remove();
        } else if (resize) {
            chart = d3.select(self._getBarChartSelector());
            d3.select(self._getChartSelector())
                .attr("width", chartWidth)
                .attr("height", chartHeight + 2)
                .style("left", left);

            let time = options.resizeDelay || 0;
            barAreas = chart.selectAll(".area");

            barAreas.select(".bar")
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) { return height - y(d[yName]); })
                .transition()
                .duration(time)
                .attr("x", function(d, i) { return x(d[xName], i); })
                .attr("width", xWidth);

            barAreas.select(".bar-extra")
                .attr("height", height)
                .transition()
                .duration(time)
                .attr("x", function(d, i) { return x(d[xName], i); })
                .attr("width", xWidth);

            barAreas.select(".bar-border")
                .attr("height", height)
                .transition()
                .duration(time)
                .attr("x", function(d, i) { return x(d[xName], i); })
                .attr("width", xWidth);

            // label
            barAreas.select(".xlabel")
                .transition()
                .duration(time)
                .attr("x", function(d, i) {
                    return x(d[xName], i) + xWidth / 2;
                })
                .attr("width", xWidth)
                .text(getLabel);

            // tick
            barAreas.select(".tick")
                .attr("y", tickHeight)
                .text(getXAxis)
                .transition()
                .call(self._endTransition, function() {
                    updateTicks(barAreas, false);
                })
                .duration(time)
                .attr("x", getTickX)
                .attr("width", xWidth);

            if (!noBucket && noSort) {
                barAreas.select(".tick.last")
                    .text(getLastBucketTick)
                    .attr("y", tickHeight)
                    .transition()
                    .call(self._endTransition, function() {
                        updateTicks(barAreas, true);
                    })
                    .duration(time)
                    .attr("x", getLastTickX);
            }
            barAreas.selectAll(".tick")
                            .call(wrapXAxis);
            return;
        }

        chart = d3.select(self._getBarChartSelector());
        // rect bars
        barAreas = chart.selectAll(".area").data(data);
        // update
        barAreas.attr("class", getTooltipAndClass)
                .attr("data-rowNum", function(d) { return d.rowNum; });

        barAreas.select(".bar")
                .transition()
                .duration(150)
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) {
                    return height - y(d[yName]);
                })
                .attr("width", xWidth);

        barAreas.select(".xlabel")
                .text(getLabel);

        barAreas.select(".tick")
                .text(getXAxis);

        if (!noBucket && noSort) {
            barAreas.select(".tick.last")
                .text(getLastBucketTick);
        }
        barAreas.selectAll(".tick")
                .call(wrapXAxis);
        // enter
        let newbars: d3 = barAreas.enter().append("g")
                    .attr("class", getTooltipAndClass)
                    .attr("data-rowNum", function(d) {
                        return d.rowNum;
                    });

        // gray area
        newbars.append("rect")
            .attr("class", "bar-extra clickable")
            .attr("x", function(d, i) { return x(d[xName], i); })
            .attr("y", 0)
            .attr("height", height)
            .attr("width", xWidth);

        // bar area
        newbars.append("rect")
            .attr("class", function(d, i) {
                if (i === 0 && d.type === "nullVal") {
                    return "bar bar-nullVal clickable";
                }
                return "bar clickable";
            })
            .attr("x", function(d, i) { return x(d[xName], i); })
            .attr("height", 0)
            .attr("y", height)
            .transition()
            .delay(function(_d, index) { return 25 * index; })
            .duration(250)
            .attr("y", function(d) { return y(d[yName]); })
            .attr("height", function(d) {
                return height - y(d[yName]);
            })
            .attr("width", xWidth);

        // for bar border
        newbars.append("rect")
            .attr("class", "bar-border")
            .attr("x", function(d, i) { return x(d[xName], i); })
            .attr("y", 0)
            .attr("height", height)
            .attr("width", xWidth);

        // label
        newbars.append("text")
            .attr("class", "xlabel clickable")
            .attr("width", xWidth)
            .attr("x", function(d, i) { return x(d[xName], i) + xWidth / 2; })
            .attr("y", 11)
            .text(getLabel);

        // xAxis
        newbars.append("text")
            .attr("class", function(d, i) {
                if (i === 0 && d.type === "nullVal") {
                    return "tick nullVal";
                }
                return "tick";
            })
            .attr("width", xWidth)
            .attr("x", getTickX)
            .attr("y", tickHeight)
            .text(getXAxis);


        if (!noBucket && noSort) {
            newbars.filter(function(_d, i) { return i === dataLen - 1; })
                .append("text")
                .attr("class", "tick last")
                .attr("width", xWidth)
                .attr("x", getLastTickX)
                .attr("y", tickHeight)
                .text(getLastBucketTick);
        }


        newbars.selectAll(".tick")
                .call(wrapXAxis);

        // exit
        barAreas.exit().remove();
    }

    private _getBarChartSelector(): string {
        return `${this._getChartSelector()} .barChart`;
    }

    private _getLastBucketTick(): any {
        let bucketSize = this.getBuckSize();
        let xName = this.getXName();
        let data = this.getData();
        let dataLen: number = data.length;
        let obj = {};
        obj[xName] = data[dataLen - 1][xName] +
                        Math.abs(bucketSize);
        return this._getXAxis(obj);
    }

    private _wrapXAxis(textNodes: any, charLenToFit: number) {
        textNodes.each(function() {
            let textNode: any = d3.select(this);
            let text = textNode.text();
            let lineHeight = 1; // ems
            let maxLine = 2;
            let x = textNode.attr("x");
            let y = textNode.attr("y");
            let dy = parseFloat(textNode.attr("dy")) || 0;
            textNode.text(null);

            for (let lineNum = 0; lineNum < maxLine; lineNum++) {
                let word;
                if (lineNum === maxLine - 1 &&
                    !(text.length <= charLenToFit))
                {
                    word = "..." +
                    text.substring(text.length - charLenToFit, text.length);
                } else {
                    word = text.substring(0, charLenToFit);
                }

                textNode.append("tspan")
                .attr("x", x)
                .attr("y", y).attr("dy", lineNum * lineHeight + dy + "em")
                .text(word);

                text = text.slice(charLenToFit);
                if (!text.length) {
                    break;
                }
            }
        });
    }

    private _endTransition(transition, callback) {
        if (typeof callback !== "function") {
            throw new Error("Wrong callback in endall");
        }
        if (transition.size() === 0) {
            callback();
        }
        let n = 0;
        transition
        .each(function() { ++n; })
        .each("end", function() {
            if (!--n) {
                callback.apply(this, arguments);
            }
        });
    }
}