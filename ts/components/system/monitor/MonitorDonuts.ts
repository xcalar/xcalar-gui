class MonitorDonuts {
    private _id: string;
    private readonly _diameter: number = 110; // for donuts
    private readonly _donutThickness: number = 20;
    private readonly _defDurationForD3Anim: number = 800;
    private readonly _memIndex: number = 0; // the index of the ram or memUsed donut
    private readonly _cpuIndex: number = 2;
    private readonly _networkIndex: number = 3;
    private readonly _numDonuts: number = 3;
    private readonly _numMemItems: number = 7;
    private readonly _xdbIndex: number = 2;

    private _ramData: number[];
    private _xdbData: number[];
    private _ramTotal: number;

    public constructor(id: string) {
        this._id = id;
        this._ramData = [];
        this._xdbData = [];
        this._ramTotal = 0;
        this._initializeDonuts();
        this._addEventListeners();
    }

    public update(allStats: StatsObj[]): void {
        let $panel = this._getPanel();
        $panel.find(".donut").each((index, el) => {
            if (index === this._networkIndex) {
                this._updateDonutMidText('#donut3 .userSize .num',
                                allStats[index].used,
                                this._defDurationForD3Anim, index, false);

                this._updateDonutMidText('#donut3 .totalSize .num',
                                allStats[index].total,
                                this._defDurationForD3Anim, index, false);
            } else {
                this._updateOneDonut(el, index, allStats[index]);
            }

            this._updateDonutStatsSection(el, index, allStats[index]);
        });
    }


    private _getPanel(): JQuery {
        return $(`#${this._id}`);
    }

    private _getDount(index): JQuery {
        return $("#donut" + index);
    }

    private _toggleDisplay($section: JQuery): void {
        if ($section.hasClass('open')) {
            $section.removeClass('open')
                    .next().children()
                    .slideUp(200)
                    .removeClass('open');
        } else {
            $section.addClass('open')
                    .next().children()
                    .slideDown(200)
                    .addClass('open');
        }
    }

    private _toggleDountPctMode($el: JQuery): void {
        $el.closest(".donutSection").toggleClass("pctMode");
    }

    private _addEventListeners(): void {
        let $panel = this._getPanel();
        $panel.find('.statsHeadingBar').click((e) => {
            this._toggleDisplay($(e.currentTarget));
        });

        $panel.find(".donut").click((e) => {
            this._toggleDountPctMode($(e.currentTarget));
        });

        $panel.find(".statsSection .listWrap").click((e) => {
            this._toggleDountPctMode($(e.currentTarget));
        });

        this._addRamDountEventListeners();
    }

    private _addRamDountEventListeners(): void {
        let $ramDount = this._getPanel().find(".ramDonut");
        $ramDount.on("mouseenter", ".legend li", (e) => {
            let $li = $(e.currentTarget);
            let listIndex = $li.index();
            let pathIndex = this._numMemItems - 1 - listIndex;
            let isXdb: boolean = false;
            if (listIndex <= this._xdbIndex) {
                // because list index doesn't match path index due to
                // xdb being in another donut
                if (listIndex === this._xdbIndex) {
                    isXdb = true;
                } else {
                    pathIndex--;
                }
            }
            this._ramDonutMouseEnter(pathIndex, listIndex, isXdb);
        });

        $ramDount.on("mouseleave", ".legend li", () => {
            this._ramDonutMouseLeave();
        });

        $ramDount.on("mouseenter", ".thick path", (e) => {
            let pathIndex = $(e.currentTarget).index();
            let listIndex = this._numMemItems - 1 - pathIndex;
            this._ramDonutMouseEnter(pathIndex, listIndex, false);
        });
        $ramDount.on("mouseleave", ".thick path", () => {
            this._ramDonutMouseLeave();
        });
        $ramDount.on("mouseenter", ".xdbDonut path", (e) => {
            this._ramDonutMouseEnter($(e.currentTarget).index(), this._xdbIndex, true);
        });
        $ramDount.on("mouseleave", ".xdbDonut path", () => {
            this._ramDonutMouseLeave();
        });
    }

     // pathIndex and listItem index are inverted
     private _ramDonutMouseEnter(
        pathIndex: number,
        listIndex: number,
        isXdb: boolean
    ): void {
        let val: number;
        if (isXdb) {
            val = this._xdbData[1];
        } else {
            val = this._ramData[pathIndex];
        }
        let rawVal: number = val;
        let size = xcHelper.sizeTranslator(val, true, null, {base2: true});
        let $panel = this._getPanel();
        $panel.find(".donutLegendInfo").removeClass("xc-hidden");
        $panel.find(".donutLegendInfo .unitSize .num").text(size[0]);
        $panel.find(".donutLegendInfo .unitSize .unit").text(size[1]);
        let pct = Math.round(rawVal * 100 / this._ramTotal) || 0;
        $panel.find(".donutLegendInfo .pctSize .num").text(pct);

        if (isXdb) { // xdb has it's own svg
            $panel.find(".ramDonut").find("svg").eq(1)
                                    .find("path")
                                    .eq(1).attr("class", "hover");
        } else if (listIndex === 0) { // OS free has it's own svg
            $panel.find(".ramDonut").find("svg").eq(2)
                                    .find("path")
                                    .eq(1).attr("class", "hover");
        } else {
            $panel.find(".ramDonut").find("svg").eq(0)
                                    .find("path")
                                    .eq(pathIndex).attr("class", "hover");
        }
        // visibility:hidden
        $panel.find(".ramDonut").find(".donutInfo")
                                .addClass("hidden");
        $panel.find(".ramDonut").find(".legend li")
                                .eq(listIndex)
                                .addClass("hover");
    }

    private _ramDonutMouseLeave(): void {
        let $panel = this._getPanel();
        $panel.find(".ramDonut").find(".legend li")
                                .removeClass("hover");
        $panel.find(".donutLegendInfo").addClass("xc-hidden");
        $panel.find(".ramDonut").find("path").attr("class", "");
        $panel.find(".ramDonut").find(".donutInfo")
                                .removeClass("hidden");
    }

    private _initializeDonuts(): void {
        let radius: number = this._diameter / 2;
        let smallRadius: number = radius - 2;
        let arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - this._donutThickness);

        let pie = d3.layout.pie()
                .sort(null);

        // thick ring
        for (let i = 0; i < this._numDonuts; i++) {
            let svg = this._makeSvg("#donut" + i, this._diameter, radius, "thick");
            this._drawPath(svg, pie, arc, i);
        }

        // for thicker xdb ring
        arc = d3.svg.arc()
                .innerRadius(radius + 4)
                .outerRadius(radius - this._donutThickness + 14);

        let svg = this._makeSvg("#donut0", this._diameter, radius, "thicker xdbDonut");
        this._drawPath(svg, pie, arc, -1);


        // thin gray background donut
        arc = d3.svg.arc()
                    .innerRadius(smallRadius)
                    .outerRadius(smallRadius - 6);

        for (let i = 0; i < this._numDonuts; i++) {
            svg = this._makeSvg("#donut" + i, this._diameter, radius, "thin");
            this._drawPath(svg, pie, arc, null);
        }
    }

    private _makeSvg(
        selector: string,
        diam: number,
        rad: number,
        className: string
    ): d3 {
        let svg = d3.select(selector).append("svg")
                    .attr("width", diam)
                    .attr("height", diam)
                    .attr("class", className)
                    .append("g")
                    .attr("transform", "translate(" + rad + "," + rad + ") rotate(180, 0,0)");
        return svg;
    }

    private _drawPath(svg: d3, pie, arc2, index: number): void {
        let data: number[];
        if (index === this._memIndex) {
            data = [5, 5, 5, 5, 30, 10];
            this._ramData = data;
        } else if (index === -1) { // xdb is given -1 index
            data = [20, 20, 60];
            this._xdbData = data;
        } else {
            data = [0, 100];
        }
        svg.selectAll("path")
            .data(pie(data))
            .enter()
            .append("path")
            .attr("d", arc2)
            .each(function(d) {
                this._current = d; // store the initial angles
            });
        if (index === this._memIndex) {
            this._getDount(this._memIndex).find("path").each((i, el) => {
                xcTooltip.add($(el), {
                    title: "donut " + i
                });
            });
        }
    }

    private _addPathTransition(paths, arc): void {
        let arcTween = function(a) {
            let i = d3.interpolate(this._current, a);
            this._current = i(0);
            return (function(t) {
                return (arc(i(t)));
            });
        };

        paths.transition()
             .duration(this._defDurationForD3Anim)
             .attrTween("d", arcTween);
    }

    private _updateOneDonut(
        el: Element,
        index: number,
        stats: any
    ): void {
        let pie = d3.layout.pie().sort(null);
        let data: any[];
        if (index === this._memIndex) {
            data = [stats.datasetUsage, stats.pubTableUsage,
                    stats.userTableUsage, stats.otherTableUsage,
                    stats.sysMemUsed, stats.sysMemFree];
            this._ramData = data;
            this._ramTotal = stats.total;
        } else {
            data = [stats.used, stats.total - stats.used];
            if (stats.total - stats.used === 0) {
                data[1] = 1;
            }
        }
        let donut: d3 = d3.select(el);
        let paths = donut.selectAll("path").data(pie(data));
        let radius = this._diameter / 2;
        let arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - this._donutThickness);

        this._addPathTransition(paths, arc);

        if (index === this._memIndex) {
            this._updateXDBDonut(stats, donut);

            let tooltips = [MonitorTStr.Datasets, MonitorTStr.PubTables,
                            MonitorTStr.YourTables, MonitorTStr.OtherUsers,
                            MonitorTStr.UsedSysMem,
                            MonitorTStr.FreeSysMem];
            this._getDount(this._memIndex).find("svg").first().find("path").each((i, el) => {
                xcTooltip.add($(el), {
                    title: tooltips[i] + "<br/>" +
                    xcHelper.sizeTranslator(data[i], null, null, {space: true})
                });
            });
        }

        this._updateDonutMidText("#donut" + index + " .userSize .num", stats.used,
        this._defDurationForD3Anim, index, false);

        if (index !== this._cpuIndex) {
            this._updateDonutMidText('#donut' + index + ' .totalSize .num', stats.total,
            this._defDurationForD3Anim, index, false);
            this._updateDonutMidText("#donut" + index + " .pctSize .num",
                                    Math.round(stats.used * 100 / stats.total),
                                    this._defDurationForD3Anim, index, true);
        }
    }

    // updates the large text in the middle of the donut
    private _updateDonutMidText(
        selector: string,
        num: number,
        duration: number,
        index: number,
        pct: boolean
    ): void {
        num = num || 0;
        let $sizeType: JQuery = $(selector).next();
        let type: string = $sizeType.text();

        let sizeOption: any = {base2: true};
        if (index === this._networkIndex) {
            sizeOption = {base3: true};
        }

        let self = this;
        d3.select(selector)
            .transition()
            .duration(duration)
            .tween("text", function() {
                let startNum = this.textContent;
                let size = xcHelper.sizeTranslator(num, true, null, sizeOption);
                let i;

                if (index !== self._cpuIndex && !pct) {
                    startNum = xcHelper.textToBytesTranslator(startNum + type,
                                                              sizeOption);
                    i = d3.interpolate(startNum, num);
                } else {
                    i = d3.interpolate(startNum, size[0]);
                }

                return (function(t) {
                    let size = xcHelper.sizeTranslator(i(t), true, null, sizeOption);
                    num = size[0];
                    if (index === self._cpuIndex || pct) {
                        num = Math.round(num);
                    } else if (index !== self._cpuIndex && !pct) {
                        $sizeType.html(size[1]);
                    }
                    this.textContent = num;
                });
            });
    }

    private _updateDonutStatsSection(el: Element, index: number, stats): void {
        // this is for the list of stats located below the donut
        let numNodes: number = stats.nodes.length;
        let $statsSection: JQuery = $(el).next();
        let listHTML: HTML = "";

        if (index === this._cpuIndex) {
            let avgUsed = stats.used.toPrecision(3);
            if (avgUsed < 1) {
                avgUsed = parseFloat(avgUsed).toFixed(2);
            }

            $statsSection.find('.statsHeadingBar .avgNum').text(avgUsed);

            for (let i = 0; i < numNodes; i++) {
                let bars = this._getPctBarHtml(stats.nodes[i].used);
                listHTML +=
                    '<li>' +
                        bars +
                        '<span class="name">' +
                            'Node ' + i +
                        '</span>' +
                        '<span class="statsNum">' +
                            stats.nodes[i].used + '%' +
                        '</span>' +
                    '</li>';
            }
        } else {
            let sizeOption: any = {base2: true};
            if (index === this._networkIndex) {
                sizeOption = {base3: true};
            }
            let usedRaw = stats.used;
            let sumTotal = xcHelper.sizeTranslator(stats.total, true, null, sizeOption);
            let sumUsed = xcHelper.sizeTranslator(usedRaw, true, null, sizeOption);
            let separator: string = "";

            if (index === this._networkIndex) {
                $statsSection.find('.statsHeadingBar .totNum')
                             .text(sumTotal[0] + " " + sumTotal[1] + "/s");
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + " " + sumUsed[1] + "/s");
                separator = "&nbsp;";
            } else {
                $statsSection.find('.statsHeadingBar .totNum')
                         .text(sumTotal[0] + " " + sumTotal[1]);
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + " " + sumUsed[1]);
                separator = "/";
            }

            let max: number = 0;
            for (let i = 0; i < stats.nodes.length; i++) {
                max = Math.max(stats.nodes[i].total, max);
            }

            for (let i = 0; i < numNodes; i++) {
                let usedNum = stats.nodes[i].used;
                let total = xcHelper.sizeTranslator(stats.nodes[i].total, true, null, sizeOption);
                let used = xcHelper.sizeTranslator(usedNum, true, null, sizeOption);
                let usedUnits: string;
                let totalUnits: string;
                if (index === this._networkIndex) {
                    usedUnits = used[1] + "/s";
                    totalUnits = total[1] + "/s";
                } else {
                    usedUnits = used[1];
                    totalUnits = total[1];
                }

                let pct: number = (usedNum / max) * 100 || 0;
                let pctStr: string = pct.toPrecision(3);
                if (pct < 1) {
                    pctStr = parseFloat(pctStr).toFixed(2);
                }

                listHTML += 
                '<li>' +
                    this._getPctBarHtml(pctStr) +
                    '<div class="name">' +
                        'Node ' + stats.nodes[i].node +
                    '</div>' +
                    '<div class="values">' +
                        '<span class="userSize">' +
                            used[0] + " " + usedUnits +
                        '</span>' +
                        '<span class="separator">' +
                            '&nbsp;' + separator + '&nbsp;' +
                        '</span>' +
                        '<span class="totalSize">' +
                            total[0] + " " + totalUnits +
                        '</span>' +
                        '<span class="pct">' +
                            pctStr +
                        '%</span>' +
                    '</div>' +
                '</li>';
            }
        }
        $statsSection.find('ul').html(listHTML);
    }

    private _getPctBarHtml(pct: string): HTML {
        let bars = '<div class="bars">' +
                        '<div class="bar" style="width:' + pct + '%;"></div>' +
                    '</div>';
        return bars;
    }

    private _updateXDBDonut(stats: any, donut: d3): void {
        let pie = d3.layout.pie().sort(null);
        let radius = this._diameter / 2;
        this._xdbData = [stats.xdbUsed, stats.xdbFree, stats.nonXdb];
        let paths = donut.select(".xdbDonut")
                        .selectAll("path")
                        .data(pie(this._xdbData));

        let arc = d3.svg.arc()
                .innerRadius(radius + 4)
                .outerRadius(radius - this._donutThickness + 14);
        this._addPathTransition(paths, arc);

        let xdbPath = this._getDount(this._memIndex).find("svg").eq(1).find("path").eq(1);
        xcTooltip.add(xdbPath, {
            title: MonitorTStr.FreeXcalarMem + "<br/>" +
            xcHelper.sizeTranslator(stats.xdbFree, null, null, {space: true})
        });
    }
}
