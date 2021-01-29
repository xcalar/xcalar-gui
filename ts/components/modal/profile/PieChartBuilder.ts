class PieChartBuilder extends AbstractChartBuilder {
    private _radius: number;
    
    public constructor(
        id: string,
        options: any
    ) {
        super(id, options);
        this.type = "pie";
    }
    
    // there should be a way to only only re-render the text/polylines
    // when a rezie happens, right now everything gets
    // re-rendered during resize
    public build(): void {
        let $section = this._getSection();
        let sectionWidth = $section.width();
        let sectionHeight = $section.height();
        let pieData = this.getPieData();
        let radius = (Math.min(sectionWidth, sectionHeight) / 2) * 0.9;

        this._setRadius(radius);
        // could change to only regenerate/color piechart if initial
        this._emptyChart();
        let self = this;
        let transform: string = "translate(" + (sectionWidth / 2) + "," +
                        Math.min(sectionWidth, sectionHeight) / 2 + ")";
        let chart = d3.select(self._getChartSelector())
                    .attr("width", sectionWidth)
                    .attr("height", sectionHeight)
                    .attr("style", "")
                    .append("g")
                        .attr("class", "pieChart")
                        .attr("transform", transform);

        this._addPathToChart(chart, pieData, radius);
        this._addTextToChart(chart, pieData, radius);
    }

    public getRadius(): number {
        return this._radius;
    }

    public getPieData(): any {
        let options = this._options;
        let data = this.getData();
        let total = options.sum;
        let yName = this.getYName();
        let gbd = data.slice(); // make a deepCopy

        let sum = 0;
        for (let i = 0; i < gbd.length; i++) {
            sum += gbd[i][yName];
        }

        let otherSum = total - sum;
        if (otherSum > 0) {
            let other = {
                "column2": "Other",
                "section": "other"
            };
            other[yName] = otherSum;
            gbd.push(other);
        }

        let pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) {
                        return d[yName];
                    });
        return pie(gbd);
    }

    private _setRadius(radius: number): void {
        this._radius = radius;
    }

    // appends arcs to 'path' and colors them
    private _addPathToChart(chart: d3, pieData: any, radius: number): d3 {
        let self = this;
        let arc = this._getArc(radius);
        let isFirstColor: boolean = true;
        let nextColor: number = 0;
        let path: d3 = chart.selectAll("path")
            .data(pieData)
            .enter()
            .append("path")
            .attr("d", arc)
            .attr("class", function(d, i) {
                var ele = this;
                var className = self._getTooltpAndClass(ele, d.data);
                className += " clickable ";
                if (nextColor === 10) {
                    nextColor = 0;
                }
                if (pieData[i].data.type === "nullVal") {
                    return className + "nullVal";
                } else if (i === pieData.length - 1 &&
                    pieData[i].data.section === "other")
                {
                    return className + "other";
                } else if (!isFirstColor && nextColor === 0) {
                    return className +
                            self._getColorClass(nextColor += 2);
                } else {
                    isFirstColor = false;
                    return className + self._getColorClass(++nextColor);
                }
            });

        return path;
    }

    // chooses which labels to display
    private _addTextToChart(chart: d3, pieData: any, radius: number): void {
        let maxLabels = this._getMaxLabels();

        let labelPositions: number[] = [];
        let usedPieData: any[] = [];

        let rightCount: number = 0;
        let leftCount: number = 0;

        pieData.forEach(function(d) {
            if (d.startAngle <= Math.PI) {
                rightCount++;
            } else {
                leftCount++;
            }
        });

        if (rightCount > maxLabels) {
            rightCount = maxLabels;
        }
        if (leftCount > maxLabels) {
            leftCount = maxLabels;
        }
        let rightArcDiv = Math.PI / rightCount;
        let leftArcDiv = Math.PI / leftCount;
        let lastArc = pieData[0];

        let r: number = 0;
        let l: number = 0;
        for (let i = 0; i < pieData.length; i++) {
            if (i > 0 &&
                !this._roomForLabel(lastArc, rightArcDiv,
                                    leftArcDiv, pieData, i))
            {
                continue;
            }
            let currMid = this._midAngle(pieData[i]);
            if ((currMid <= Math.PI && r < maxLabels) ||
                (currMid > Math.PI && l < maxLabels)) {
                let pos = this._addLabels(chart, pieData[i], radius);
                labelPositions.push(pos);
                if (pieData[i].startAngle <= Math.PI) {
                    r++;
                } else {
                    l++;
                }
                lastArc = pieData[i];
                usedPieData.push(pieData[i]);
            }
        }

        let labelInfo = this._moveOverlappingLabels(labelPositions, usedPieData);
        this._addLineToLabel(chart, labelInfo, radius);
    }

    private _addLineToLabel(
        chart: d3,
        labelInfo: [number[], any],
        radius: number
    ): void {
        let [positions, data] = labelInfo;
        let arc = this._getArc(radius);
        let outerArc = this._getOuterArc(radius);
        this._addPolyLine(chart, positions, data, arc, outerArc);
        this._addCircle(chart, data, arc);
    }

    private _addPolyLine(
        chart: d3,
        positions: number[],
        data: any,
        arc: any,
        outerArc: any
    ): void {
        // adds lines from pie chart to labels
        chart.selectAll("polyline")
            .data(data)
            .enter()
            .append("polyline")
            .attr("points", function(d, i) {
                let arcCent = arc.centroid(d);
                let outerArcCent = outerArc.centroid(d);
                arcCent[0] *= 1.1;
                arcCent[1] *= 1.1;
                positions[i][1] += 3;
                outerArcCent[1] = positions[i][1];
                if (positions[i][0] > 0) {
                    positions[i][0] += 3;
                } else {
                    positions[i][0] -= 3;
                }

                return [arcCent, outerArcCent, positions[i]];
            });
    }

    private _addCircle(chart: d3, data: any, arc: any): void {
        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function(d) {
                var arcCent = arc.centroid(d);
                return arcCent[0] *= 1.1;
            })
            .attr("cy", function(d) {
                var arcCent = arc.centroid(d);
                return arcCent[1] *= 1.1;
            })
            .attr("r", 2);
    }

    /*
        appends labels to 'g'
        groups the 'value' and 'frequency' together
    */
    private _addLabels(chart: d3, data: any, radius: number): number {
        let self = this;
        const fontSize: number = 13;
        const charLenToFit: number = 18;

        let g = chart.append("g").classed("pieLabel", true);
        let labelPos: number;
        g.append("text")
            .style("font-size", fontSize + "px")
            .attr("class", function() {
                if (data.data && data.data.type === "nullVal") {
                    return "tick nullVal";
                }
                return "tick";
            })
            .attr("transform", function() {
                let pos = self._getLabelPosition(data, radius, fontSize, 1.7, false);
                labelPos = pos;
                return "translate(" + pos + ")";
            })
            .text(function() {
                if (data.data.section === "other") {
                    return "Other";
                }
                return self._getXAxis(data.data, charLenToFit);
            });

        g.append("text")
            .style("font-size", (fontSize - 1) + "px")
            .attr("class", "xlabel")
            .attr("transform", function() {
                let pos = self._getLabelPosition(data, radius, fontSize, 1.5, true);
                return "translate(" + pos + ")";
            })
            .text(function() {
                return self._getLabel(data.data, charLenToFit);
            });

        return labelPos;
    }

    /*
        decides if there is room for a label on an arc
        based on where the last label was placed
    */
    private _roomForLabel(
        lastArc,
        rightArcDiv,
        leftArcDiv,
        pieData,
        i: number
    ): boolean {
        let currArc = pieData[i];
        let lastMid = this._midAngle(lastArc);
        let currMid = this._midAngle(currArc);

        if ((lastMid < Math.PI && currMid < Math.PI) ||
            (lastMid >= Math.PI && currMid >= Math.PI)
        ) {
            let rightSpace = (lastMid + rightArcDiv);
            let leftSpace = (lastMid + leftArcDiv);

            if (currMid < Math.PI &&
                i < pieData.length - 1 &&
                currArc.endAngle < rightSpace) {
                return false;
            }
            if (currMid >= Math.PI &&
                i < pieData.length - 1 &&
                currArc.endAngle < leftSpace) {
                return false;
            }
        }
        return true;
    }

    // moves labels that overlap
    private _moveOverlappingLabels(
        labelPositions: number[],
        usedPieData: any
    ): [number[], any] {
        let self = this;
        let $section = this._getSection();
        let $labels = $section.find(".pieLabel");
        let sectionBound = $section.get(0).getBoundingClientRect();

        let prevRect: Element;
        let prevPos: number;
        let maxWidth = this._maxLabelWidth($labels) * 2;
        let i: number = 0;
        // method could be cleaner,
        // some code in 'labels.each' should be moved to separate functions
        $labels.each(function() {
            let currRect: Element = this;
            let currPos: number = labelPositions[i];
            let ele = d3.select(this);
            const padding: number = 30;

            if (currPos[0] > 0) {
                ele.attr("text-anchor", "end");
                let currRectBound: ClientRect = currRect.getBoundingClientRect();
                var maxRightMove = sectionBound.right -
                                    currRectBound.right - padding;
                maxWidth = Math.min(maxWidth, maxRightMove);
                let move: number[] = [maxWidth, 0];
                labelPositions[i][0] += maxWidth;
                ele.attr("transform", "translate(" + move + ")");
            } else if (currPos[0] < 0) {
                ele.attr("text-anchor", "start");
                let currRectBound: ClientRect = currRect.getBoundingClientRect();
                var maxLeftMove = currRectBound.left -
                                    sectionBound.left - padding;
                maxWidth = Math.min(maxWidth, maxLeftMove);
                let move: number[] = [-1 * maxWidth, 0];
                labelPositions[i][0] -= maxWidth;
                ele.attr("transform", "translate(" + move + ")");
            }
            let groupByBox: ClientRect = $(self._getChartSelector()).get(0).getBoundingClientRect();
            if (i > 0) {
                prevPos = labelPositions[i - 1];
                d3.select(this).attr("transform");

                // getting location of top and bottom of current and previous text labels
                let prevBottom = prevRect.getBoundingClientRect().bottom;
                let prevTop = prevRect.getBoundingClientRect().top;
                let currBottom = currRect.getBoundingClientRect().bottom;
                let currTop = currRect.getBoundingClientRect().top;

                if (currPos[0] > 0 && prevPos[0] > 0 && prevBottom > currTop) {
                    let intersectionLength: number = currTop - prevBottom;
                    currPos[1] -= intersectionLength;
                    let move: number[] = [maxWidth, -1 * intersectionLength];
                    d3.select(this)
                        .attr("transform", "translate(" + move + ")");
                    // updates position value in array
                    labelPositions[i] = currPos;
                } else if (currPos[0] < 0 && prevPos[0] < 0 && prevTop < currBottom) {
                    let intersectionLength: number = currBottom - prevTop;
                    currPos[1] -= intersectionLength;
                    let move: number[] = [-1 * maxWidth, -1 * intersectionLength];
                    d3.select(this)
                        .attr("transform", "translate(" + move + ")");
                    // updates position value in array
                    labelPositions[i] = currPos;
                }
            }
            if (this.getBoundingClientRect().top < groupByBox.top) {
                this.remove();
                labelPositions.splice(i, 1);
                usedPieData.splice(i, 1);
            } else {
                prevRect = this;
                i++;
            }
        });
        return [labelPositions, usedPieData];
    }

    private _midAngle(d: {startAngle: number, endAngle: number}): number {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    private _getColorClass(num: number): string {
        return "color-" + num;
    }

    private _getArc(radius: number): any {
        return d3.svg.arc()
                .innerRadius(0)
                .outerRadius(radius);
    }

    private _getOuterArc(radius: number): any {
        return d3.svg.arc()
                .innerRadius(radius * 0.8)
                .outerRadius(radius * 0.8);
    }

    // returns max number of labels that will fit
    private _getMaxLabels(): number {
        let height = this._getSection().height();
        const fontSize: number = 13;
        return Math.floor(height / (fontSize * 3));
    }

    private _getLabelPosition(
        data: any,
        radius: number,
        fontSize: number,
        zoom: number,
        padding: boolean
    ): number {
        let mid = this._midAngle(data);
        let outerArc = this._getOuterArc(radius);
        let pos = outerArc.centroid(data);
        pos[0] = radius * (mid < Math.PI ? 1 : -1);
        if (mid < Math.PI) {
            pos[1] -= (fontSize * zoom);
        } else {
            pos[1] -= fontSize * zoom;
        }

        if (padding) {
            pos[1] += fontSize;
        }
        return pos;
    }

    private _maxLabelWidth($labels: JQuery): number {
        let maxWidth: number = 0;
        $labels.each(function() {
            let labelWidth = this.getBoundingClientRect().width;
            maxWidth = Math.max(maxWidth, labelWidth);
        });
        return maxWidth;
    }
}