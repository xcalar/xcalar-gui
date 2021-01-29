class MonitorGraph {
    private _id: string;
    private _intervalTime: number; // update interval in milliseconds
    private _yAxis;
    private _xScale;
    private _yScale;
    private _datasets = [];
    private _xGridVals;
    private _svg;
    private _graphCycle;

    private readonly _memIndex: number = 0; // the index of the ram or memUsed donut
    private readonly _swapIndex: number = 1;
    private readonly _cpuIndex: number = 2;
    private readonly _xGridWidth: number = 60; // space between each x-axis grid line
    private readonly _height: number = 210;
    private _shiftWidth: number;

    private _count: number;
    private _gridRight: number;
    private _newWidth: number;
    private _svgWrap;
    private _freshData;
    private _numXGridMarks: number;
    private _timeStamp: string;
    private _failCount: number;
    private _curIteration: number;
    private _tableUsage: number;
    private _hasTableUsageChange: boolean;
    private _lastTableUsageTime: number; // when greater than 10s, ok to fetch new data
    private _event: XcEvent;

    public constructor(id: string) {
        this._id = id;
        this._intervalTime = 60000;

        let pointsPerGrid: number = 10;
        this._shiftWidth = this._xGridWidth / pointsPerGrid;

        this._count = 0;
        this._failCount = 0;
        this._curIteration = 0;
        this._tableUsage = 0;
        this._hasTableUsageChange = true;
        this._lastTableUsageTime = 0;
        this._addEventListeners();
        this._event = new XcEvent();
    }

    public on(event: string, callback: Function): void {
        this._event.addEventListener(event, callback);
    }

    public start(): void {
        this._datasets = [[], [], []];
        this._setupLabelsPathsAndScales();
        this._updateSVGWrapHeight(300);

        this._createTempGrid(); // initial grid that gets pushed off
        this._startCycle();
    }

    public clear(): void {
        let $graph = this._getGraph();
        $graph.find('svg').remove();
        $graph.find('.xLabels').empty();
        this._getMemYAxis().empty();
        this._stopCycle();
        this._datasets = [];
    }

    public stop(): void {
        this._stopCycle();
    }

    public updateInterval(time: number): void {
        this._intervalTime = time;
        this._stopCycle();
        this._cycle();
    }

    public tableUsageChange(): void {
        this._hasTableUsageChange = true;
    }

    private _getPanel(): JQuery {
        return $(`#${this._id}`);
    }

    private _getGraphWrap(): JQuery {
        return $("#graphWrap");
    }

    private _getGraph(): JQuery {
        return $("#graph");
    }

    private _getGraphTimeEl(): JQuery {
        return $("#graphTime");
    }

    private _getUpTimeEl(): JQuery {
        return $("#upTime");
    }

    private _getMemYAxis(): JQuery {
        return $("#memYAxis");
    }

    private _addEventListeners(): void {
        this._getGraph().on('click', '.area', (e) => {
            let $area = $(e.currentTarget);
            let $line = $area.prev();

            if (Number($area.css('opacity')) > 0.6) {
                $area.css('opacity', 0.4);
            } else {
                $area.css('opacity', 0.8);
            }

            // move graphs in front of others
            this._getGraph().find(".mainSvg").children().append($line, $area);
        });
    }

    private _setupLabelsPathsAndScales(): void {
        let $graph = this._getGraph();
        $graph.find('svg').remove();

        this._xGridVals = [];
        for (let i = 0; i < 300; i += 60) {
            this._xGridVals.push(i);
        }

        let xGridWidth: number = this._xGridWidth;
        let height: number = this._height;
        this._xScale = d3.scale.linear()
                   .domain([0, 10])
                   .range([0, xGridWidth]);

        this._yScale = d3.scale.linear()
                    .range([height, 0]);

        let xScale = this._xScale;
        let yScale = this._yScale;
        let xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .innerTickSize(-height)
                    .ticks(1);

        this._yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .innerTickSize(-xGridWidth);

        this._svg = d3.select("#graph .svgWrap").append("svg")
                    .attr("width", xGridWidth)
                    .attr("height", height)
                    .attr("class", "mainSvg")
                    .append("g");

        // part of the left gray area
        this._svg.append("g")
            .attr("class", "leftBlock")
            .append("rect")
            .attr("width", xGridWidth)
            .attr("height", height);

        this._svg.append("g")
           .attr("class", "x axis")
           .attr("transform", "translate(0," + height + ")")
           .call(xAxis);

        this._svg.append("g")
           .attr("class", "y axis")
           .call(this._yAxis);

        let datasets = this._datasets;
        for (let i = 0; i < datasets.length; i++) {
            let line = d3.svg.line()
                        .x(function(_d, j) {
                            return xScale(j);
                        })
                        .y(function(d) {
                            return yScale(d);
                        });

            let area = d3.svg.area()
                        .x(function(_d, j) {
                            return (xScale(j));
                        })
                        .y0(height)
                        .y1(function(d) {
                            return (yScale(d));
                        });

            this._svg.append("path")
               .data([datasets[i]])
               .attr("class", "line line" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", line);

            this._svg.append("path")
               .data([datasets[i]])
               .attr("class", "area area" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", area);
        }
    }

    // monitor graph is made up of 2 grids, with "tempGrid" being one of them.
    // tempGrid is the initial grid you see, it is later pushed out by a new
    // grid that contains the colored graphs
    private _createTempGrid(): void {
        const maxScreenSize: number = 4020; // grid has static size so we pick 4020
        let height: number = this._height;
        // because it's wide enough to accomodate most screens
        let tempGridWrap = d3.select('#grids').append("svg");
        let gridSvg = tempGridWrap.attr("width", maxScreenSize)
                                .attr("height", height)
                                .attr("class", "gridSvg")
                                .append("g");
        let tempXGridVals: number[] = [];
        for (let i = 0; i < maxScreenSize; i += 60) {
            tempXGridVals.push(i);
        }

        let xScale = d3.scale.linear()
                          .domain([0, maxScreenSize])
                          .range([0, maxScreenSize]);

        let tempXAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .innerTickSize(-height)
                        .tickValues(tempXGridVals);

        gridSvg.append("g")
               .attr("class", "x axis")
               .attr("transform", "translate(0," + height + ")")
               .call(tempXAxis);

        this._yAxis.innerTickSize(-maxScreenSize);

        gridSvg.append("g")
               .attr("class", "y axis")
               .call(this._yAxis);
    }

    private _startCycle(): void {
        this._count = 0;
        this._newWidth = this._xGridWidth + this._shiftWidth - 4;
        this._numXGridMarks = 5;
        this._gridRight = this._shiftWidth - 4;
        this._svgWrap = this._svg.select(function() {
            return (this.parentNode);
        });
        this._freshData = true;
        this._intervalTime = (UserSettings.Instance.getPref('monitorGraphInterval') * 1000) || this._intervalTime;

        this._stopCycle();
        this._oneCycleUpdate();
    }

    // adjustTime is the time to subtract from the interval time due to the
    // length of time it takes for the backend call to return
    private _cycle(adjustTime?: number): void {
        let intTime = this._intervalTime;
        if (adjustTime) {
            intTime = Math.max(200, this._intervalTime - adjustTime);
        }

        this._graphCycle = setTimeout(() => {
            this._oneCycleUpdate();
        }, intTime);
    }

    private _stopCycle(): void {
        this._curIteration++;
        clearTimeout(this._graphCycle);
        this._graphCycle = undefined;
    }

    private _oneCycleUpdate(): void {
        let prevIteration = this._curIteration;
        let startTime = Date.now();

        this._getStatsAndUpdateGraph()
        .always(() => {
            if (prevIteration === this._curIteration) {
                let elapsedTime = Date.now() - startTime;
                this._cycle(elapsedTime);
            }
        });
    }

    private _getStatsAndUpdateGraph(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (this._count % 10 === 0) {
            this._xGridVals.push(this._numXGridMarks * this._xGridWidth);
            this._numXGridMarks++;

            if (this._count % 40 === 0) {
                this._timeStamp = '<span>' + moment().format("h:mm:ss A") + '</span>';
            }
        }

        this._getGraphTimeEl().text(moment().format("h:mm:ss A"));

        let prevIteration = this._curIteration;

        this._getMemUsage()
        .then(() => {
            return XcalarApiTop();
        })
        .then((apiTopResult) => {
            let upTime = xcTimeHelper.timeStampConvertSeconds(apiTopResult.topOutputPerNode[0].uptimeInSeconds, true);
            this._getUpTimeEl().text(upTime);
            if (prevIteration !== this._curIteration) {
                deferred.resolve();
                return;
            }
            let numNodes = apiTopResult.numNodes;
            if (!numNodes) {
                deferred.reject();
                return;
            }
            let allStats = this._processNodeStats(apiTopResult, numNodes);
            this._updateGraph(allStats);
            this._event.dispatchEvent("update", allStats, apiTopResult);
            this._failCount = 0;
            this._toggleErrorScreen(null, null);
            deferred.resolve();
        })
        .fail((error) => {
            console.error("get status fails", error);
            this._failCount++;
            // if it fails twice in a row, we show error screen
            if (this._failCount === 2) {
                console.error("failed to get stats twice in a row");
                this._toggleErrorScreen(true, error);
            }
            deferred.reject();
        });

        this._count++;
        this._updateSVGWrapHeight(150)

        return deferred.promise();
    }

    private _updateSVGWrapHeight(time: number): void {
        setTimeout(() => {
            // XXX Hack - the graph refuses to move unless I change more
            // of its attributes
            let rand = Math.random() * 0.1;
            this._svgWrap.attr("height", this._height + rand);
        }, time);
    }

    private _getMemUsage(): XDPromise<void> {
        if (!this._needsTableUsageCall()) {
            return PromiseHelper.resolve();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._hasTableUsageChange = false;
        XcalarGetMemoryUsage(userIdName, userIdUnique)
        .then((userMemory) => {
            this._lastTableUsageTime = Date.now();
            this._tableUsage = this._getTableUsage(userMemory.userMemory.sessionMemory);
            deferred.resolve();
        })
        .fail(() => {
            this._tableUsage = 0; // still resolve it
            deferred.resolve();
        });
        return deferred.promise();
    }

    private _needsTableUsageCall(): boolean {
        // only update memusage if change detected AND
        // first time, screen is visible, or interval is infrequent
        // AND it's been at least 10 seconds since last call
        return ($("#monitor-system").is(":visible") ||
                this._freshData ||
                this._intervalTime > 19999) &&
                (Date.now() - this._lastTableUsageTime > 10000);
    }

    private _getTableUsage(sessions: any): number {
        let bytes: number = 0;
        try {
            for (let i = 0; i < sessions.length; i++) {
                let tables = sessions[i].tableMemory;
                for (let j = 0; j < tables.length; j++) {
                    bytes += tables[j].totalBytes;
                }
            }
        } catch (e) {
            console.error(e);
        }
        return bytes;
    }

    private _processNodeStats(apiTopResult: any, numNodes: number): StatsObj[] {
        let tableUsage = this._tableUsage;
        let mem: StatsObjMem = new StatsObjMem();
        let swap: StatsObj = new StatsObjSwap();
        let usrCpu: StatsObj = new StatsObjCPU();
        let network: StatsObj = new StatsObjNetwork(); // For network, send is used, recv is total

        for (let i = 0; i < numNodes; i++) {
            let node = apiTopResult.topOutputPerNode[i];

            usrCpu.addNodeStats(node, i);
            mem.addNodeStats(node, i);
            swap.addNodeStats(node, i);
            network.addNodeStats(node, i);
        }

        usrCpu.updateOverallStats(numNodes);
        mem.updateOverallStats(tableUsage);

        let allStats = [mem, swap, usrCpu, network];
        // Make sure no values exceed total
        for (let i = 0; i < allStats.length; i++) {
            if (i === this._cpuIndex) {
                // cpu percentage may be over 100%
                allStats[i].used = Math.min(allStats[i].used, 100);
            } else {
                for (let attr in allStats[i]) {
                    if (attr !== "nodes" && attr !== "total") {
                        allStats[i][attr] = Math.min(allStats[i][attr], allStats[i].total);
                    }

                }
            }
        }
        return allStats;
    }

    private _updateGraph(allStats: StatsObj[]): void {
        let yMaxes: number[] = [];
        let units: string[] = [];
        let sizeOption = {base2: true};
        let memYMax: number = Math.max(allStats[this._memIndex].total, allStats[this._swapIndex].total);
        let memYVal = xcHelper.sizeTranslator(memYMax, true, null, sizeOption);
        for (let i = 0; i < this._datasets.length; i++) {
            let xVal = allStats[i].used;
            let yMax: number;
            if (i === this._cpuIndex) {
                // cpu %
                xVal = Math.min(100, xVal);
                yMax = 100;
            } else {
                // memory
                yMax = parseFloat(memYVal[0]);
                let unit = memYVal[1];
                xVal = xcHelper.sizeTranslator(xVal, true, unit, sizeOption)[0];
                units.push(unit);
            }
            this._datasets[i].push(xVal);
            yMaxes.push(yMax);
        }
        this._redraw(this._newWidth, this._gridRight, yMaxes, units);

        let $graph = this._getGraph();
        $graph.find(".xLabelsWrap").width(this._newWidth);
        this._svgWrap.attr("width", this._newWidth);
        this._newWidth += this._shiftWidth;
        this._gridRight += this._shiftWidth;

        if (this._timeStamp) {
            $graph.find('.xLabels').append(this._timeStamp);
            this._timeStamp = null;
        }

        let $graphWrap = this._getGraphWrap();
        if ($graphWrap.scrollLeft() >=
            (this._newWidth - $graphWrap.width() - this._xGridWidth)
        ) {
            $graphWrap.scrollLeft(this._newWidth);
        }
    }

    private _redraw(
        newWidth: number,
        gridRight: number,
        yMaxes: number[],
        units: string[]
    ): void {
        if (this._freshData) {
            this._drawMemYAxes(yMaxes[this._memIndex], units[this._memIndex]);
            this._freshData = false;
        }

        let height = this._height;
        let xScale = this._xScale;
        let yScale = this._yScale;
        let datasets = this._datasets;
        for (let i = 0; i < datasets.length; i++) {
            let tempYScale = d3.scale
                            .linear()
                            .domain([0, yMaxes[i]])
                            .range([height, 0]);

            let line = d3.svg.line()
                            .x(function(_d, j) {
                                return xScale(j);
                            })
                            .y(function(d) {
                                return tempYScale(d);
                            });

            let area = d3.svg.area()
                            .x(function(_d, j) {
                                return xScale(j);
                            })
                            .y0(height)
                            .y1(function(d) {
                                return tempYScale(d);
                            });

            this._svg.selectAll(".line" + i)
               .data([datasets[i]])
               .attr("d", line);

            this._svg.selectAll(".area" + i)
               .data([datasets[i]])
               .attr("d", area);
        }

        let timeScale = d3.scale.linear()
                          .domain([0, newWidth])
                          .range([0, newWidth]);

        let xGridVals = this._xGridVals;
        let xAxis = d3.svg.axis()
                          .scale(timeScale)
                          .orient("bottom")
                          .innerTickSize(-height)
                          .tickValues(xGridVals);

        this._svg.selectAll(".x")
            .call(xAxis);

        let yAxis = d3.svg.axis()
                          .scale(yScale)
                          .orient("left")
                          .innerTickSize(-newWidth);

        this._svg.selectAll(".y")
           .call(yAxis);

        this._getGraph().find('.gridSvg').css('right', gridRight + 'px');
    }

    private _drawMemYAxes(yMax: number, unit: string): void {
        let $memYAxis = this._getMemYAxis();
        $memYAxis.empty();
        let height: number = this._height;
        let yScale = d3.scale.linear()
                        .domain([0, yMax])
                        .range([height, 0]);

        let yAxisStart: number = yMax / 5;
        let yAxisMax: number = yMax + 1;
        let yAxisSteps: number = yMax / 5;

        let yAxis = d3.svg.axis()
                        .scale(yScale)
                        .orient("left")
                        .innerTickSize(0)
                        .tickValues(d3.range(yAxisStart, yAxisMax, yAxisSteps));
        d3.select("#memYAxis").append("div")
                                .attr("class", "memYAxisWrap")
                                .append("svg")
                                .attr("width", 40)
                                .attr("height", height + 30)
                                .attr("class", "")
                                .append("g")
                                .attr("transform", "translate(28,8)")
                                .call(yAxis);
        $memYAxis.find(".memYAxisWrap")
                .append('<span class="unit">0 (' + unit + ')</span>')
                .append('<span class="type"><span>Memory' +
                        '</span> / <span>Swap</span></span>');
    }

    private _toggleErrorScreen(
        show: boolean,
        error: {error: string, status: StatusT}
    ): void {
        let $errorScreen = this._getPanel().find(".statsErrorContainer");
        if (show) {
            $errorScreen.removeClass("xc-hidden");
            let msg: string;
            // if no error, or error.error doesn't exist, or error.error is
            // udf execute failed, change msg to custom message
            if (!error ||
                !error.error ||
                error.status === StatusT.StatusUdfExecuteFailed
            ) {
                msg = MonitorTStr.StatsFailed;
            } else {
                msg = error.error;
            }
            $errorScreen.text(msg);
        } else { // hide the error screen
            $errorScreen.empty().addClass("xc-hidden");
        }
    }
}
