class ProfileSelector {
    private _container: string;
    private _chartId: string;
    private _filterDragging;
    private _chartBuilder: AbstractChartBuilder;

    public constructor(container, chartId) {
        this._container = container;
        this._chartId = chartId;
        this._filterDragging = false;
    }

    /**
     *
     * @param options
     */
    public select(
        options: {
            chartBuilder: any,
            x: number,
            y: number
        }
    ) {
        this._chartBuilder = options.chartBuilder;
        this._createFilterSelection(options.x, options.y);
    }

    /**
     *
     */
    public isOn(): boolean {
        return this._filterDragging;
    }

    /**
     *
     */
    public off(): void {
        this._toggleDargging(false);
    }

    public filter(
        operator: FltOp,
        profileInfo: ProfileInfo
    ): {
        operator: FltOp,
        filterString: string
    } {
        let chartBuilder = this._chartBuilder;
        let noBucket: boolean = chartBuilder.isNoBucket();
        let noSort: boolean = !chartBuilder.isSorted();
        let xName: string = chartBuilder.getXName();
        let colName: string = profileInfo.colName;
        let uniqueVals = {};
        let isExist: boolean = false;
        let isString: boolean = (profileInfo.type === ColumnType.string);
        let chartType: string = chartBuilder.getType();

        let prevRowNum: number = null;
        let groups: string[][] = [];
        let groupIdx: number = -1;

        this._getChart().selectAll(".area.selected").each(function(d) {
            if (chartType === "pie") {
                d = d.data;
            }

            var rowNum = d.rowNum;
            if (isNaN(rowNum)) {
                console.error("invalid row num!");
            } else if (d.type === "nullVal") {
                    isExist = true;
            } else {
                var val = d[xName];
                if (isString) {
                    val = JSON.stringify(val);
                }

                uniqueVals[val] = true;

                if (prevRowNum == null || (rowNum - 1 !== prevRowNum)) {
                    groupIdx++;
                }
                groups[groupIdx] = groups[groupIdx] || [];
                groups[groupIdx].push(val);
                prevRowNum = rowNum;
            }
        });

        let hasContinousGroup: boolean = false;
        groups = groups.filter(function(group) {
            let hasVal = (group != null);
            if (hasVal && group.length > 1) {
                hasContinousGroup = true;
            }
            return hasVal;
        });

        if (this._isTypeNumber(profileInfo.type) &&
            noSort &&
            hasContinousGroup
        ) {
            // this suit for numbers
            return this._getNumFltOpt(operator, colName, groups, isExist);
        } else if (noBucket) {
            return xcHelper.getFilterOptions(operator, colName, uniqueVals, isExist, false);
        } else {
            return this._getBucketFltOpt(operator, colName, uniqueVals, isExist);
        }
    }

    /**
     *
     */
    public clear(): void {
        this._toggleFilterOption(true);
        this._chartBuilder = null;
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getChartSection(): JQuery {
        return $("#" + this._chartId);
    }

    private _getChart(): d3 {
        return d3.select(`#${this._container} .groupbyChart`);
    }

    private _getFilterOptionEl(): JQuery {
        // return $("#profile-filterOption");
        return this._getContainer().find(".filterOption");
    }

    private _toggleDargging(isDragging: boolean): void {
        this._filterDragging = isDragging;
    }

    private _toggleFilterOption(isHidden: boolean): void {
        let $filterOption = this._getFilterOptionEl();
        let bars = this._getChart().selectAll(".area.selected");
        let barsSize = bars.size();

        if (barsSize === 0) {
            isHidden = true;
        } else if (barsSize === 1) {
            $filterOption.find(".filter .text").addClass("xc-hidden");
            $filterOption.find(".single").removeClass("xc-hidden");
        } else {
            $filterOption.find(".filter .text").addClass("xc-hidden");
            $filterOption.find(".plural").removeClass("xc-hidden");
        }

        if (isHidden) {
            bars.each(function() {
                d3.select(this)
                .classed("selected", false)
                .classed("unselected", false);
            });
            $filterOption.fadeOut(200);
        } else {
            var bound = $("#profile-chart").get(0).getBoundingClientRect();
            var barBound;
            bars.each(function(_d, i) {
                if (i === barsSize - 1) {
                    barBound = this.getBoundingClientRect();
                }
            });

            var right = bound.right - barBound.right;
            var bottom = bound.bottom - barBound.bottom + 30;
            var w = $filterOption.width();

            if (w + 5 < right) {
                // when can move right,
                // move the option label as right as possible
                right -= (w + 5);
            }

            $filterOption.css({
                "right": right,
                "bottom": bottom
            }).show();
        }
    }

    private _isTypeNumber(type) {
        // boolean is also a num in backend
        return (type === ColumnType.integer || type === ColumnType.float);
    }

    private _createFilterSelection(x: number, y: number): RectSelection {
        this._getFilterOptionEl().fadeOut(200);
        this._getContainer().addClass("drawing")
        .addClass("selecting");

        return new RectSelection(x, y, {
            "id": "profile-filterSelection",
            "$container": $("#profile-chart"),
            "onStart": () => {
                this._toggleDargging(true);
            },
            "onDraw": (bound, top, right, bottom, left) => {
                this._drawFilterRect(bound, top, right, bottom, left);
            },
            "onEnd": () => {
                this._endDrawFilterRect();
            }
        });
    }

    private _drawFilterRect(
        bound: ClientRect,
        top: number,
        right: number,
        bottom: number,
        left: number
    ): void {
        if (!this._chartBuilder) {
            return;
        }
        let areasToSelect = this._getAreaToSelect(bound, top, right, bottom, left);
        let chart = this._getChart();
        chart.selectAll(".area").each(function(_d, i) {
            var area = d3.select(this);
            area.classed("highlight", false);
            if (areasToSelect[i]) {
                area.classed("selecting", true);
            } else {
                area.classed("selecting", false);
            }
        });
    }

    private _getAreaToSelect(
        bound: ClientRect,
        top: number,
        right: number,
        bottom: number,
        left: number
    ): boolean[] {
        let type: string = this._chartBuilder.getType();
        switch (type) {
            case "bar":
                return this._getSelectedBars(bound, right, bottom, left);
            case "pie":
                return this._getSelectedArcs(top, right, bottom, left);
            default:
                console.error("error case");
                return [];
        }
    }

    private _getSelectedBars(
        bound: ClientRect,
        right: number,
        bottom: number,
        left: number
    ): boolean[] {
        let selectedBars: boolean[] = [];
        this._getChart().selectAll(".area").each(function(_d, i) {
            var barArea = this;
            var barBound = barArea.getBoundingClientRect();
            var barTop = barBound.top - bound.top;
            var barLeft = barBound.left - bound.left;
            var barRight = barBound.right - bound.left;
            var select;

            if (bottom < barTop || right < barLeft || left > barRight) {
                select = false;
            } else {
                select = true;
            }

            selectedBars[i] = select;
        });
        return selectedBars;
    }

    // main function for deciding which arcs are selected by the rectangle
    private _getSelectedArcs(
        top: number,
        right: number,
        bottom: number,
        left: number
    ): boolean[] {
        let chartBuilder: PieChartBuilder = <PieChartBuilder>this._chartBuilder;
        let pieData = chartBuilder.getPieData();
        let topLeftCorner = [left, top];
        let topRightCorner = [right, top];
        let bottomLeftCorner = [left, bottom];
        let bottomRightCorner = [right, bottom];
        let rectDimensions = [top, bottom, left, right];

        let corners = [topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner];
        let circleCenter = this._getCenterOfCircle();
        let intersectsWithRect = [];

        for (let i = 0; i < pieData.length; i++) {
            // initially set all indicies in array to false
            intersectsWithRect[i] = false;
            if (pieData[i].data.section === "other") {
                // XXX temp fix as "other" part's filter str is hard to built
                continue;
            }

            // checks if center of circle is selected
            if (left <= circleCenter[0] && right >= circleCenter[0] &&
                top <= circleCenter[1] && bottom >= circleCenter[1]) {
                intersectsWithRect[i] = true;
                continue;
            }
            var sectorPointsIntersect = this._checkSectorLines(rectDimensions,
                                                         pieData[i],
                                                         circleCenter);
            if (sectorPointsIntersect) {
                intersectsWithRect[i] = true;
                continue;
            }
            if (this._lineIsInArc(rectDimensions, circleCenter, pieData[i])) {
                intersectsWithRect[i] = true;
                continue;
            }
            for (let j = 0; j < corners.length; j++) {
                if (this._pointLiesInArc(corners[j], circleCenter, pieData[i])) {
                    intersectsWithRect[i] = true;
                    break;
                }
            }
        }
        return intersectsWithRect;
    }

    // gets center of circle by calculating its position
    // relative to the 'graphBox'
    private _getCenterOfCircle(): number[] {
        let $charSection = this._getChartSection();
        let profileChart = $charSection.get(0).getBoundingClientRect();
        let graphBox = $charSection.find(".groupbyChart").get(0).getBoundingClientRect();
        let circleBox = $charSection.find(".groupbyInfoSection").get(0).getBoundingClientRect();
        let x = (circleBox.left - graphBox.left) + ((circleBox.right - circleBox.left) / 2);
        let y = ((graphBox.bottom + graphBox.top) / 2) - profileChart.top;

        return [x, y];
    }

    private _endDrawFilterRect(): void {
        this._getContainer().removeClass("drawing").removeClass("selecting");
        let chart = this._getChart();
        let areaToSelect = chart.selectAll(".area.selecting");
        let areas = chart.selectAll(".area");
        if (areaToSelect.size() === 0) {
            areas.each(function() {
                d3.select(this)
                .classed("unselected", false)
                .classed("selected", false);
            });
        } else {
            areas.each(function() {
                var area = d3.select(this);
                if (area.classed("selecting")) {
                    area.classed("selecting", false)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else if (!area.classed("selected")) {
                    area.classed("unselected", true)
                        .classed("selected", false);
                }
            });
        }

        // allow click event to occur before setting filterdrag to false
        setTimeout(() => {
            this._toggleDargging(false);
        }, 10);

        this._toggleFilterOption(false);
    }

    private _getRadius(): number {
        let chartBuilder: PieChartBuilder = <PieChartBuilder>this._chartBuilder;
        return chartBuilder.getRadius();
    }

    // returns the quadrant of the pie that a point lies in
    private _getCornerQuadrant(corner: number[], circleCenter: number[]): number {
        if (corner[0] > circleCenter[0] && corner[1] < circleCenter[1]) {
            return 1;
        } else if (corner[0] > circleCenter[0] && corner[1] > circleCenter[1]) {
            return 2;
        } else if (corner[0] < circleCenter[0] && corner[1] > circleCenter[1]) {
            return 3;
        }
        return 4;
    }

    // checks if/where the side of the selection box intersects with the piechart
    private _closestRectSideToCircle(rectDimensions, circleCenter) {
        var radius = this._getRadius();
        var topDistance = Math.abs(circleCenter[1] - rectDimensions[0]);
        var bottomDistance = Math.abs(circleCenter[1] - rectDimensions[1]);
        var leftDistance = Math.abs(circleCenter[0] - rectDimensions[2]);
        var rightDistance = Math.abs(circleCenter[0] - rectDimensions[3]);
        var cornerQuadrants = [
            this._getCornerQuadrant([rectDimensions[2], rectDimensions[0]], circleCenter),
            this._getCornerQuadrant([rectDimensions[3], rectDimensions[0]], circleCenter),
            this._getCornerQuadrant([rectDimensions[2], rectDimensions[1]], circleCenter),
            this._getCornerQuadrant([rectDimensions[3], rectDimensions[1]], circleCenter)
        ];

        if (rightDistance <= radius &&
            cornerQuadrants[1] === 4 &&
            cornerQuadrants[3] === 3)
        {
            return 3 * Math.PI / 2;
        } else if (leftDistance <= radius &&
                    cornerQuadrants[1] === 1 &&
                    cornerQuadrants[3] === 2)
        {
            return Math.PI / 2;
        } else if (topDistance <= radius &&
                    cornerQuadrants[0] === 3 &&
                    cornerQuadrants[1] === 2)
        {
            return Math.PI;
        } else if (bottomDistance <= radius &&
                    cornerQuadrants[2] === 4 &&
                    cornerQuadrants[3] === 1)
        {
            return 2 * Math.PI;
        }

        return -1;
    }

    // returns true if a side of the rectangle (a line) intersects with the arc
    private _lineIsInArc(
        rectDimensions: number[],
        circleCenter: number[],
        currArc: {
            startAngle: number,
            endAngle: number
        }
    ): boolean {
        let closestRectSide = this._closestRectSideToCircle(rectDimensions, circleCenter);
        if (closestRectSide !== -1) {
            if (currArc["startAngle"] <= closestRectSide &&
                currArc["endAngle"] >= closestRectSide)
            {
                return true;
            }
        }

        return false;
    }

    // checks if a point (corner of selection box) lies in an arc
    private _pointLiesInArc(
        corner: number[],
        circleCenter: number[],
        currArc: {
            startAngle: number,
            endAngle: number
        }
    ): boolean {
        var quadrant = this._getCornerQuadrant(corner, circleCenter);
        var xDistance = Math.abs(corner[0] - circleCenter[0]);
        var yDistance = Math.abs(corner[1] - circleCenter[1]);
        var distance = Math.sqrt(Math.pow(xDistance, 2) +
                       Math.pow(yDistance, 2));
        var radius = this._getRadius();
        var calcAngle;
        var actualAngle;

        if (quadrant === 4) {
            calcAngle = Math.abs(Math.atan(yDistance / xDistance));
            actualAngle = calcAngle + (3 * Math.PI / 2);
        } else if (quadrant === 3) {
            calcAngle = Math.abs(Math.atan(xDistance / yDistance));
            actualAngle = calcAngle + Math.PI;
        } else if (quadrant === 2) {
            calcAngle = Math.abs(Math.atan(yDistance / xDistance));
            actualAngle = calcAngle + (Math.PI / 2);
        } else {
            calcAngle = Math.abs(Math.atan(xDistance / yDistance));
            actualAngle = calcAngle;
        }
        if (distance <= radius && actualAngle >= currArc["startAngle"] &&
            actualAngle <= currArc["endAngle"])
        {
            return true;
        }

        return false;
    }

    // returns the quadrant the 'currArc' is in
    private _getPointQuadrant(currArc: number): number {
        if (currArc >= 3 * Math.PI / 2) {
            return 4;
        } else if (currArc >= Math.PI) {
            return 3;
        } else if (currArc >= Math.PI / 2) {
            return 2;
        } else {
            return 1;
        }
    }

    // sets a points location to be relative to the location of the circle on the page
    private _accountForCircleCenter(
        point: number[],
        currArc: number,
        circleCenter: number[]
    ): number[] {
        let quad = this._getPointQuadrant(currArc);
        if (quad === 1) {
            point[0] = Math.abs(circleCenter[0] + point[0]);
            point[1] = Math.abs(circleCenter[1] - point[1]);
        } else if (quad === 2) {
            point[0] += circleCenter[0];
            point[1] += circleCenter[1];
        } else if (quad === 3) {
            point[0] = Math.abs(circleCenter[0] - point[0]);
            point[1] = Math.abs(circleCenter[1] + point[1]);
        } else {
            point[0] = circleCenter[0] - point[0];
            point[1] = circleCenter[1] - point[1];
        }
        return point;
    }

    // checks if selection box intersects with sector lines
    private _checkSectorLines(
        rectDimensions: number[],
        currArc: {
            startAngle: number,
            endAngle: number
        },
        circleCenter: number[]
    ): boolean {
        let radius = this._getRadius();
        let xPos1 = Math.abs(radius * Math.sin(currArc["startAngle"]));
        let yPos1 = Math.abs(radius * Math.cos(currArc["startAngle"]));
        let xPos2 = Math.abs(radius * Math.sin(currArc["endAngle"]));
        let yPos2 = Math.abs(radius * Math.cos(currArc["endAngle"]));
        let p1 = [xPos1, yPos1];
        let p2 = [xPos2, yPos2];

        p1 = this._accountForCircleCenter(p1, currArc["startAngle"], circleCenter);
        p2 = this._accountForCircleCenter(p2, currArc["endAngle"], circleCenter);
        if (this._checkAllLineIntersections(circleCenter, p1, p2, rectDimensions)) {
            return true;
        }
        return false;
    }

    // checks possible line intersections between sector lines and selection box lines
    private _checkAllLineIntersections(
        circleCenter: number[],
        p1: number[],
        p2: number[],
        rectDimensions: number[]
    ): boolean {
        var topLeft = [rectDimensions[2], rectDimensions[0]];
        var topRight = [rectDimensions[3], rectDimensions[0]];
        var bottomLeft = [rectDimensions[2], rectDimensions[1]];
        var bottomRight = [rectDimensions[3], rectDimensions[1]];

        var rectLines = [
            [topLeft, bottomLeft],
            [topLeft, topRight],
            [topRight, bottomRight],
            [bottomLeft, bottomRight]
        ];
        for (var i = 0; i < rectLines.length; i++) {
            if (this._lineSegmentsIntersect(circleCenter, p1, rectLines[i][0], rectLines[i][1]) ||
                this._lineSegmentsIntersect(circleCenter, p2, rectLines[i][0], rectLines[i][1])
            ) {
                return true;
            }
        }
        return false;
    }

    // checks if two line segments intersect
    private _lineSegmentsIntersect(
        p1: number[],
        p2: number[],
        p3: number[],
        p4: number[]
    ): boolean {
        let xDifference1 = p2[0] - p1[0];
        let yDifference1 = p2[1] - p1[1];
        let xDifference2 = p4[0] - p3[0];
        let yDifference2 = p4[1] - p3[1];

        let s = (-yDifference1 * (p1[0] - p3[0]) + xDifference1 * (p1[1] - p3[1])) / (-xDifference2 * yDifference1 + xDifference1 * yDifference2);
        let t = (xDifference2 * (p1[1] - p3[1]) - yDifference2 * (p1[0] - p3[0])) / (-xDifference2 * yDifference1 + xDifference1 * yDifference2);

        return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
    }

    private _fltExist(
        operator: string,
        colName: string,
        fltStr: string
    ): string {
        if (operator === FltOp.Filter) {
            if (fltStr === "" || fltStr == null) {
                fltStr = "not(exists(" + colName + "))";
            } else {
                fltStr = "or(" + fltStr + ", not(exists(" + colName + ")))";
            }
        } else if (operator === FltOp.Exclude) {
            if (fltStr === "" || fltStr == null) {
                fltStr = "exists(" + colName + ")";
            } else {
                fltStr = "and(" + fltStr + ", exists(" + colName + "))";
            }
        }

        return fltStr;
    }

    private _getBucketFltOpt(
        operator: string,
        colName: string,
        uniqueVals: object,
        isExist: boolean
    ): {
        operator: FltOp,
        filterString: string
    } {
        let colVals: number[] = [];
        for (let val in uniqueVals) {
            colVals.push(Number(val));
        }

        let str = "";
        let len = colVals.length;
        let lowerBound;
        let upperBound;
        let chartBuilder = this._chartBuilder;
        let i;
        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (i = 0; i < len - 1; i++) {
                    lowerBound = chartBuilder.getLowerBound(colVals[i]);
                    upperBound = chartBuilder.getUpperBound(colVals[i]);
                    str += "or(and(ge(" + colName + ", " + lowerBound + "), " +
                                  "lt(" + colName + ", " + upperBound + ")), ";
                }

                lowerBound = chartBuilder.getLowerBound(colVals[i]);
                upperBound = chartBuilder.getUpperBound(colVals[i]);
                str += "and(ge(" + colName + ", " + lowerBound + "), " +
                           "lt(" + colName + ", " + upperBound + ")";

                for (i = 0; i < len; i++) {
                    str += ")";
                }
            }
        } else if (operator === FltOp.Exclude) {
            if (len > 0) {
                for (i = 0; i < len - 1; i++) {
                    lowerBound = chartBuilder.getLowerBound(colVals[i]);
                    upperBound = chartBuilder.getUpperBound(colVals[i]);
                    str += "and(or(lt(" + colName + ", " + lowerBound + "), " +
                                  "ge(" + colName + ", " + upperBound + ")), ";
                }

                lowerBound = chartBuilder.getLowerBound(colVals[i]);
                upperBound = chartBuilder.getUpperBound(colVals[i]);
                str += "or(lt(" + colName + ", " + lowerBound + "), " +
                          "ge(" + colName + ", " + upperBound + ")";

                for (i = 0; i < len; i++) {
                    str += ")";
                }
            }
        } else {
            console.error("error case");
            return null;
        }

        if (isExist) {
            if (len > 0) {
                str = this._fltExist(operator, colName, str);
            } else {
                str = this._fltExist(operator, colName, null);
            }
        }

        return {
            "operator": operator,
            "filterString": str
        };
    }

    private _getNumFltOpt(
        operator: FltOp,
        colName: string,
        groups: string[][],
        isExist: boolean
    ): {
        operator: FltOp,
        filterString: string
    } {
        let str: string = "";
        groups.forEach((group) => {
            let fltStr = this._getNumFltOptHelper(operator, colName, group);
            if (!str) {
                str = fltStr;
            } else if (operator === FltOp.Filter) {
                str = "or(" + str + ", " + fltStr + ")";
            } else if (operator === FltOp.Exclude) {
                str = "and(" + str + ", " + fltStr + ")";
            }
        });

        if (isExist) {
            str = this._fltExist(operator, colName, str);
        }

        return {
            "operator": operator,
            "filterString": str
        };
    }

    private _getNumFltOptHelper(
        operator: FltOp,
        colName: string,
        vals: string[]
    ): string {
        // this suit for numbers that are unsorted by count
        let min: number = Number.MAX_VALUE;
        let max: number = -Number.MAX_VALUE;
        let str: string = "";
        let count: number = 0;
        let chartBuilder = this._chartBuilder;
        let bucketSize: number = chartBuilder.getBuckSize() || 0;

        vals.forEach(function(val) {
            let num: number = Number(val);
            let lowerBound = chartBuilder.getLowerBound(num);
            let upperBound = chartBuilder.getUpperBound(num);
            min = Math.min(lowerBound, min);
            max = Math.max(upperBound, max);
            count++;
        });

        if (bucketSize === 0) {
            if (operator === FltOp.Filter) {
                if (count > 1) {
                    // [min, max]
                    str = "and(ge(" + colName + ", " + min + "), " +
                              "le(" + colName + ", " + max + "))";
                } else if (count === 1) {
                    str = "eq(" + colName + ", " + min + ")";
                }
            } else if (operator === FltOp.Exclude) {
                if (count > 1) {
                    // exclude [min, max]
                    str = "or(lt(" + colName + ", " + min + "), " +
                              "gt(" + colName + ", " + max + "))";
                } else if (count === 1) {
                    str = "neq(" + colName + ", " + min + ")";
                }
            } else {
                return "";
            }
        } else {
            // bucket case
            if (operator === FltOp.Filter) {
                if (count > 0) {
                    // should be [min, max)
                    str = "and(ge(" + colName + ", " + min + "), " +
                              "lt(" + colName + ", " + max + "))";
                }
            } else if (operator === FltOp.Exclude) {
                // should exclude [min, max)
                if (count > 0) {
                    str = "or(lt(" + colName + ", " + min + "), " +
                              "ge(" + colName + ", " + max + "))";
                }
            } else {
                return "";
            }
        }

        return str;
    }
}