class DagView {
    private $dfArea: JQuery;
    private dagTab: DagTab;
    private tabId: string;
    private graph: DagGraph;

    public static readonly horzPadding = 200; // padding around edges of dataflow
    public static readonly vertPadding = 100;
    public static readonly nodeHeight = 26;
    public static readonly nodeWidth = 80;
    public static readonly tableWidth = 25;
    public static readonly tableHeight = 25;
    public static readonly nodeAndTableWidth = DagView.nodeWidth + DagView.tableWidth + 32;
    public static readonly gridSpacing = 20;
    public static zoomLevels = [.25, .5, .75, .9, 1, 1.1, 1.25, 1.5, 2];
    public static iconOrder = ["tableIcon", "columnIcon", "descriptionIcon", "lockIcon", "aggregateIcon", "paramIcon", "udfErrorIcon"];
    public static iconMap = {
        "descriptionIcon": "\ue966", // xi-info-no-bg
        "lockIcon": "\ue940", // xi-lock
        "aggregateIcon": "\ue939", // xi-aggregate
        "paramIcon": "\uea69", // xi-parameter
        "tableIcon": "\ue920", // xi-show
        "columnIcon": "c",
        "udfErrorIcon": "\ue9c8"
    };

    private containerSelector: string = "#dagView";
    private static $dagView: JQuery;
    private static $dfWrap: JQuery;
    private static _$operatorBar: JQuery;

    private static horzNodeSpacing = 180;// spacing between nodes when auto-aligning
    private static vertNodeSpacing = 60;
    private static gridLineSize = 12;
    private static titleLineHeight = 11;
    public static inConnectorWidth = 6;
    private lockedNodeIds = {};
    private configLockedNodeIds: Set<DagNodeId> = new Set();
    private static dagEventNamespace = 'DagView';
    private static udfErrorColor = "#F15840";
    // private static mapNodeColor = "#89D0E0";
    private static textColor = "#000000";
    private static edgeColor = "#627483";
    private static iconColor = "#00000";
    private static dataflowNodeLimit = 1000; // point where dataflow starts to lag
    private static _nodeCache: Map<string, JQuery> = new Map(); // used to store nodes for drawing

    private isSqlPreview: boolean = false;
    private _isFocused: boolean;
    private schemaPopups: Map<DagNodeId, DagSchemaPopup> = new Map();
    private _hasInstructionNode: boolean = false;

    constructor($dfArea: JQuery, graph: DagGraph, containerSelector: string) {
        this.$dfArea = $dfArea;
        this.graph = graph;
        this.dagTab = DagTabManager.Instance.getTabById(graph.getTabId());
        this.containerSelector = containerSelector;
    }

    public static setup() {
        DagView.$dagView = $("#dagView");
        DagView.$dfWrap = DagView.$dagView.find(".dataflowWrap .innerDataflowWrap");
        DagView._$operatorBar = DagView.$dagView.find(".operatorWrap");
        if (xcGlobal.darkMode) {
            DagView.textColor = "#FFFFFF";
            DagView.edgeColor = "#c9c9c9";
            DagView.iconColor = "#FFFFFF";
        }
    }

    private static lineFunction: Function = d3.svg.line()
                                            .x(function (d) { return d.x; })
                                            .y(function (d) { return d.y; })
                                            .interpolate("cardinal");

    public static getAutoAlignPositions(graph: DagGraph): {
        nodeInfos: NodeMoveInfo[],
        maxX: number,
        maxY: number
    } {
        const trees = graph.getDisjointGraphs();

        let startingWidth: number = 0;
        const allNodeInfos = [];
        let overallMaxDepth = 0;

        trees.forEach((tree) => {
            const nodes = {};
            let showingProgressTips: boolean = false;
            tree.forEach(node => {
                if (node.getChildren().length === 0) {
                    if (!showingProgressTips) {
                        showingProgressTips = DagView.$dagView.hasClass("showProgressTips") && searchForTooltip(node, new Set());
                        if (showingProgressTips && startingWidth > 0) { // don't adjust the first row of nodes
                            startingWidth += (1/3); // must be divisible by 3 because vertNodeSpacing == 60
                        }
                    }
                    DagView._alignNodes(node, nodes, startingWidth, showingProgressTips);
                }
            });

            tree.forEach(node => {
                if (node.getParents().length === 0) {
                    // adjust positions of nodes so that children will never be
                    // to the left of their parents
                    DagView._adjustPositions(node, nodes, new Set());
                }
            });

            let maxDepth = 0;
            let maxWidth = 0;
            let minDepth = 0;
            for (let j in nodes) {
                maxDepth = Math.max(nodes[j].depth, maxDepth);
                minDepth = Math.min(nodes[j].depth, minDepth);
                maxWidth = Math.max(nodes[j].width, maxWidth);
            }
            overallMaxDepth = Math.max(maxDepth - minDepth, overallMaxDepth);

            for (let j in nodes) {
                allNodeInfos.push({
                    type: "dagNode",
                    id: j,
                    position: {
                        x: ((maxDepth - nodes[j].depth) * DagView.horzNodeSpacing) + (DagView.gridSpacing * 2),
                        y: Math.round((nodes[j].width * DagView.vertNodeSpacing) / DagView.gridSpacing) * DagView.gridSpacing + (DagView.gridSpacing * 3)
                    }
                });
            }

            startingWidth = (maxWidth + 1);
        });

        const graphHeight = DagView.vertNodeSpacing * (startingWidth - 1) + DagView.gridSpacing;
        const graphWidth = DagView.horzNodeSpacing * overallMaxDepth + DagView.gridSpacing;
        let maxX = graphWidth;
        let maxY = graphHeight;
        const comments = graph.getAllComments();
        comments.forEach((comment) => {
            const pos = comment.getPosition();
            const dimensions = comment.getDimensions();
            maxX = Math.max(maxX, pos.x + dimensions.width);
            maxY = Math.max(maxY, pos.y + dimensions.height);
        });
        return {
            nodeInfos: allNodeInfos,
            maxX: Math.round(maxX),
            maxY: Math.round(maxY)
        }

        function searchForTooltip(node: DagNode, seen: Set<DagNodeId>) {
            if (node.getState() === DagNodeState.Complete) {
                return true;
            }
            if (seen.has(node.getId())) {
                return false;
            }
            seen.add(node.getId());
            let parents = node.getParents();
            for (let i = 0; i < parents.length; i++) {
                let parent = parents[i];
                if (!parent) {
                    return;
                }
                let hasTooltip = searchForTooltip(parent, seen);
                if (hasTooltip) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * DagView.newSQLFunc
     * @param name
     * @param numInput
     */
    public static async newSQLFunc(name: string, numInput: number): Promise<void> {
        DagPanel.Instance.toggleDisplay(true);
        DagTabManager.Instance.newSQLFunc(name);

        // add instruction
        const commentBase: number = 20;
        DagViewManager.Instance.newComment({
            text: SQLTStr.FuncInstr,
            display: {
                x: commentBase,
                y: commentBase,
                width: 450,
                height: 80
            }
        }, false);

        // add input
        const xBase: number = commentBase;
        const yBase: number = commentBase + 100;
        const inc: number = 80;

        for (let i = 0; i < numInput; i++) {
            let x: number = xBase;
            let y: number = yBase + (i * inc);
            await DagViewManager.Instance.autoAddNode(DagNodeType.SQLFuncIn, null, null, null, {x: x, y: y});
        }

        // add output
        const numIncSpace = 10;
        let x = xBase + (inc * numIncSpace);
        let y = yBase + (inc * (numInput - 1) / 2);
        const viewPortWidth = DagView.$dagView.outerWidth() - 120;
        const maxX = Math.round(viewPortWidth / 20) * 20;
        x = Math.max(xBase + inc, Math.min(maxX, x));
        await DagViewManager.Instance.autoAddNode(DagNodeType.SQLFuncOut, null, null, null, {x, y});
        DagNodeInfoPanel.Instance.hide(); // not show info panel
    }

    /**
     * DagView.newTabFromSource
     * @param type
     * @param config
     */
    public static async newTabFromSource(type: DagNodeType, config: any): Promise<void> {
        DagPanel.Instance.toggleDisplay(true);
        try {
            DagTabManager.Instance.newTab();
            let position: number = DagView.gridSpacing * 2;
            let node: DagNode = await DagViewManager.Instance.autoAddNode(type, null, null, config,
                {x: position, y: position});
            if (node != null) {
                DagNodeMenu.execute("configureNode", {
                    node: node,
                    exitCallback: () => {
                        node.setParam({}, true);
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    public static getSkewText(skew) {
        return ((skew == null || isNaN(skew))) ? "N/A" : String(skew);
    }

        /**
     * Cleanup job after a tab is closed
     * @param graph
     * @description
     * #1 Remove all event handlers listening on the DagGraph associated with the closed tab
     * #2 ...
     */
    public static cleanupClosedTab(graph: DagGraph) {
        try {
            if (graph != null) {
                graph.events.off(`.${DagView.dagEventNamespace}`);
            }
        } catch(e) {
            console.error(e);
        }
    }

    // ok to pass in multiple nodes
    public static selectNode($node: JQuery, onTableIcon?: boolean): JQuery {
        $node.addClass("selected");
        if (onTableIcon) {
            $node.addClass("tableSelected");
        }
        if ($node.hasClass("operator")) {
            DagView._setSelectedStyle($node, onTableIcon);
        }
        return $node;
    }

    public static deselectNode($node) {
        $node.removeClass("selected tableSelected");
        $node.find(".selection").remove();
    }

    /**
     * DagView.addNodeIcon adds a small icon and reorders other icons to fit the new one in
     * @param $node
     * @param iconType
     * @param tooltip
     */
    public static addNodeIcon($node: JQuery, iconType: string, tooltip: string) {
        let top: number;

        let icons;
        if ($node.attr("data-icons")) {
            icons = $node.attr("data-icons").split(",");
        } else {
            icons = [];
        }
        if (icons.indexOf(iconType) > -1) {
            return;
        } else {
            icons.push(iconType);
        }
        // sort icons in order of DagView.iconOrder
        icons.sort(function(a, b) {
            return DagView.iconOrder.indexOf(a) - DagView.iconOrder.indexOf(b);
        });
        $node.find(".bottomNodeIcon").remove();
        // store the icon order
        $node.attr("data-icons", icons);
        top = DagView.nodeHeight + 1;
        for (let i = 0; i < icons.length; i++) {
            if (icons[i] === iconType) {
                drawIcon(icons[i], false, (i * 15 ) + 12, top, DagView.iconMap[iconType], xcStringHelper.escapeDblQuoteForHTML(tooltip), i);
                $node.attr("data-" + iconType.toLowerCase(), tooltip);
            } else {
                let tip: string = $node.data(icons[i].toLowerCase())
                drawIcon(icons[i], false, (i * 15 ) + 12, top, DagView.iconMap[icons[i]], tip, i);
            }
        }


        function drawIcon(iconType, isTopIcon, left, top, icon, tooltip, index) {
            let fontSize: number = 7;
            let iconLeft: number = 0;
            let iconTop: number = 3;
            let tipClasses: string = "";
            let fontFamily: string = "icomoon";
            if (iconType === "paramIcon") {
                iconTop = 4;
                iconLeft = -1;
                fontSize = 9;
            } else if (iconType === "aggregateIcon") {
                fontSize = 6;
            }
            let topClass = isTopIcon ? " topNodeIcon " : " bottomNodeIcon ";

            const g = d3.select($node.get(0)).append("g")
            .attr("class", iconType + topClass + " nodeIcon index" + index)
            .attr("transform", `translate(${left}, ${top})`);
            g.append("circle")
                .attr("cx", 3.5)
                .attr("cy", 0)
                .attr("r", 6)
                .style("stroke", "white")
                .style("fill", "black");
            g.append("text")
                .attr("font-family", fontFamily)
                .attr("font-size", fontSize)
                .attr("fill", "white")
                .attr("x", iconLeft)
                .attr("y", iconTop)
                .text(function (_d) {return icon});

            xcTooltip.add($node.find("." + iconType), {
                title: tooltip,
                classes: tipClasses
            });
        }
    }

    /**
     * removes icon and repositions other icons
     * @param $node
     * @param iconType
     */
    public static removeNodeIcon($node: JQuery, iconType: string) {
        const $icon: JQuery = $node.find("." + iconType);
        if (!$icon.length) {
            return;
        }
        let iconStr = $node.attr("data-icons");
        let icons: string[] = iconStr.split(",");
        let index = icons.indexOf(iconType);
        $icon.remove();

        $node.removeAttr("data-" + iconType.toLowerCase());

        // shift all following icons to the left;
        for (let i = index + 1; i < icons.length; i++) {
            let left = ((i - 1) * 15) + 22;
            d3.select($node.find(`.nodeIcon.index${i}`).get(0))
                .attr("transform", `translate(${left}, ${DagView.nodeHeight})`)
                .attr("class", icons[i] + " bottomNodeIcon nodeIcon index" + (i - 1));
        }

        icons.splice(index, 1);
        $node.attr("data-icons", <any>icons);
    }

    public static addTableIcon($node: JQuery, iconType: string, tooltip: string) {
        let left: number;
        let top: number;
        if (iconType !== "lockIcon") {
            top = DagView.nodeHeight - 2;
            if (iconType === "columnIcon") {
                left =  DagView.nodeAndTableWidth - 35;
            } else {
                left =  DagView.nodeAndTableWidth - 15;
            }
            $node.find("." + iconType).remove();
            drawIcon(iconType, false, left, top, DagView.iconMap[iconType], tooltip, 0);
        } else {
            let icons;
            if ($node.attr("data-toptableicons")) {
                icons = $node.attr("data-toptableicons").split(",");
            } else {
                icons = [];
            }

            if (icons.indexOf(iconType) > -1) {
                return;
            } else {
                icons.push(iconType);
            }
            icons.sort(function(a, b) {
                return DagView.iconOrder.indexOf(a) - DagView.iconOrder.indexOf(b);
            });
            $node.find(".topTableIcon").remove();
            $node.attr("data-toptableicons", icons);
            top = 3;
            left = DagView.nodeAndTableWidth - 15;

            for (let i = 0; i < icons.length; i++) {
                if (icons[i] === iconType) {
                    drawIcon(icons[i], true, left - (i * 15 ), top, DagView.iconMap[iconType], xcStringHelper.escapeDblQuoteForHTML(tooltip), i);
                    $node.attr("data-" + iconType.toLowerCase(), tooltip);
                } else {
                    let tip: string = $node.attr("data-" + icons[i].toLowerCase());
                    drawIcon(icons[i], true, left - (i * 15 ), top, DagView.iconMap[icons[i]], tip, i);
                }
            }
        }

        function drawIcon(iconType, isTopIcon, left, top, icon, tooltip, index) {
            let fontSize: number = 8;
            let iconLeft: number = -0.5;
            let iconTop: number = 3;
            let tipClasses: string = "";
            let fontFamily: string = "icomoon";
            if (iconType === "tableIcon") {
                iconLeft = -1;
                iconTop = 4;
                fontSize = 9;
            }  else if (iconType === "columnIcon") {
                tipClasses = "preWrap leftAlign wide";
                fontSize = 12;
                fontFamily = "open sans";
            }
            let topClass = isTopIcon ? " topTableIcon " : " bottomTableIcon ";

            const g = d3.select($node.get(0)).append("g")
            .attr("class", iconType + topClass + " tblIcon index" + index)
            .attr("transform", `translate(${left}, ${top})`);
            g.append("circle")
                .attr("cx", 3.5)
                .attr("cy", 0)
                .attr("r", 6)
                .style("stroke", "black")
                .style("fill", DagView.iconColor);
            g.append("text")
                .attr("font-family", fontFamily)
                .attr("font-size", fontSize)
                .attr("fill", "black")
                .attr("x", iconLeft)
                .attr("y", iconTop)
                .text(function (_d) {return icon});

            xcTooltip.add($node.find("." + iconType), {
                title: tooltip,
                classes: tipClasses
            });
        }
    }

       /**
     * removes icon and repositions other icons
     * @param $node
     * @param iconType
     */
    public static removeTableIcon($node: JQuery, iconType: string) {
        const $icon: JQuery = $node.find("." + iconType);
        if (!$icon.length) {
            return;
        }
        let isTopIcon: boolean = true;
        if (iconType !== "lockIcon") {
            isTopIcon = false;
        }

        $node.removeAttr("data-" + iconType.toLowerCase());

        if (isTopIcon) {
            let iconStr = isTopIcon ? $node.attr("data-toptableicons") : $node.attr("data-bottomtableicons");
            let icons: string[] = iconStr.split(",");
            let index = icons.indexOf(iconType);
            $icon.remove();
            let offset = DagView.nodeWidth - 19;
            // shift all following icons to the right;
            for (let i = index + 1; i < icons.length; i++) {
                let left = offset - ((i - 1) * 15);
                d3.select($node.find(`.nodeIcon.index${i}`).get(0))
                    .attr("transform", `translate(${left}, 1)`)
                    .attr("class", icons[i] + " topTableIcon tblIcon index" + (i - 1));
            }
            icons.splice(index, 1);
            $node.attr("data-toptableicons", <any>icons)
        } else {
            $icon.remove();
        }
    }

    private static _dagLineageTipTemplate(x, y, text): HTML {
        return '<div class="dagTableTip lineageTip" ' +
            'style="left:' + x + 'px;top:' + y + 'px;">' +
            '<div>' + text + '</div>' +
            '</div>';
    }

    private static _getSkewInfo(name, rows, skew, totalRows, inputSize): {
        name: string,
        value: number,
        text: string,
        color: string,
        rows: number[],
        totalRows: number,
        size: number
    } {
        const skewText = DagView.getSkewText(skew);
        const skewColor = DagView.getSkewColor(skewText);
        return {
            name: name,
            value: skew,
            text: skewText,
            color: skewColor,
            rows: rows,
            totalRows: totalRows,
            size: inputSize
        };
    }

    public static getSkewColor(skewText: string) {
        if (skewText === "N/A") {
            return "";
        }
        const skew: number = Number(skewText);
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h = 104;
        let s = 83;
        let l = 67;
        if (skew <= 25) {
            h = 104 - 54 / 25 * skew;
        } else if (skew <= 50) {
            h = 50 - 2 * (skew - 25);
        } else {
            h = 0;
        }
        return `hsl(${h}, ${s}%, ${l}%)`;
    }


    private static _getGeometryInfo(posList: Coordinate[]): {
        centroid: Coordinate,
        max: Coordinate,
        min: Coordinate
    } {
        const centroid = { x: 0, y: 0 };
        const max = { x: 0, y: 0 };
        const min = { x: null, y: null };

        if (posList == null || posList.length === 0) {
            return {
                centroid: centroid, max: max, min: min
            };
        }

        let sumX = 0;
        let sumY = 0;
        for (const { x, y } of posList) {
            max.x = Math.max(max.x, x);
            max.y = Math.max(max.y, y);
            min.x = min.x == null ? x : Math.min(min.x, x);
            min.y = min.y == null ? y : Math.min(min.y, y);
            sumX += x;
            sumY += y;
        }
        const len = posList.length;
        centroid.x = Math.floor(sumX / len);
        centroid.y = Math.floor(sumY / len);

        return {
            centroid: centroid, max: max, min: min
        }
    }

    /**
     * DagView.addSelection
     * @param $operator
     */
    public static addSelection($operator: JQuery, className: string, onTableIcon?: boolean): void {
        const rect = d3.select($operator[0]).insert('rect', ':first-child');

        if (onTableIcon) {
            rect.attr('x', DagView.nodeWidth + 15)
            .attr('y', '-6')
            .attr('width', DagView.tableWidth + 17)
            .attr('height', DagView.tableHeight + 13)
            .attr('rx', '12')
            .attr('ry', '13');

        } else {
            rect.attr('x', '-2')
            .attr('y', '-5')
            .attr('width', DagView.nodeWidth + 3)
            .attr('height', DagView.nodeHeight + 10)
            .attr('rx', '16')
            .attr('ry', '43');
        }

        rect.classed(className, true);
        rect.attr('fill', 'rgba(150, 225, 255, 0.2)')
        .attr('stroke', 'rgba(0, 188, 255, 0.78)')
        .attr('stroke-width', '1');
    }

    private static _setSelectedStyle($operators: JQuery, onTableIcon?: boolean): void {
        $operators.each(function() {
            const $operator = $(this);
            let $selection = $operator.find(".selection");
            if ($selection.length > 0) {
                if ($selection.hasClass("selection-table")) {
                    if (onTableIcon) {
                        return;
                    } else {
                        $selection.remove();
                    }
                } else if (onTableIcon) {
                    $selection.remove();
                } else {
                    return;
                }
            }
            let className = "selection";
            if (onTableIcon) {
                className += " selection-table";
            }
            DagView.addSelection($operator, className, onTableIcon);
        });
    }

    private static _calculateDimensions(
        dimensions: Dimensions, elCoors: Coordinate
    ): Dimensions {
        return {
            width: Math.max(elCoors.x + DagView.horzPadding, dimensions.width),
            height: Math.max(elCoors.y + DagView.vertPadding, dimensions.height)
        };
    }

    // sets endpoint to have depth:0, width:0. If endpoint is a join,
    // then left parent will have depth:1, width:0 and right parent will have
    // depth: 1, width: 1 and so on. In other words, x coor = depth, y coor = width
    private static _alignNodes(
        node: DagNode,
        seen: {[key: string]: {depth: number, width: number}},
        width: number,
        showingProgressTips: boolean
    ): void {
        let greatestWidth = width;
        let takenCoors = new Map();
        let widthUnit = 1;
        if (showingProgressTips) {
            widthUnit += (1/3); // must be divisible by 3 because vertNodeSpacing == 60
        }
        _alignHelper(node, 0, width);

        function _alignHelper(node: DagNode, depth: number, width: number) {
            const nodeId = node.getId();
            if (seen[nodeId] != null) {
                return;
            }
            const parents = node.getParents();
            const children = node.getChildren();

            checkForWidthCondense(parents);

            seen[nodeId] = {
                depth: depth,
                width: width
            };
            let depthAtTakenWidth = takenCoors.get(width);
            if (depthAtTakenWidth != null) {
                takenCoors.set(width, Math.min(depth, depthAtTakenWidth));
            } else {
                takenCoors.set(width, depth);
            }

            greatestWidth = Math.max(width, greatestWidth);


            let sameWidthParentDrawn = false;
            // check if parent on save level has already been drawn
            parents.forEach(parent => {
                if (parent != null && seen[parent.getId()] != null && seen[parent.getId()].width === width) {
                    sameWidthParentDrawn = true;
                }
            });

            // loop through each parent and increment that node's width/depth
            // and add extra if tooltips are showing
            parents.forEach((parent) => {
                if (parent != null && seen[parent.getId()] == null) {
                    let parentWidth;
                    if (!sameWidthParentDrawn) {
                        parentWidth = width;
                    } else {
                        parentWidth = greatestWidth + widthUnit;
                    }
                    _alignHelper(parent, depth + 1, parentWidth);
                    sameWidthParentDrawn = true;
                }
                width = seen[nodeId].width;
            });

            let sameWidthChildDrawn = false;
            // check if child on save level has already been drawn
            children.forEach(child => {
                if (seen[child.getId()] != null && seen[child.getId()].width === width) {
                    sameWidthChildDrawn = true;
                }
            });

            // loop through each child and increment that node's width/depth
            // and add extra if tooltips are showing
            children.forEach(child => {
                if (seen[child.getId()] == null) {
                    let childWidth;
                    if (!sameWidthChildDrawn) {
                        childWidth = width;
                    } else {
                        childWidth = greatestWidth + widthUnit;
                    }
                    _alignHelper(child, depth - 1, childWidth);
                    sameWidthChildDrawn = true;
                }
                width = seen[nodeId].width;
            });

            // reduce width coordinates if there's space
            function checkForWidthCondense(parents) {
                if (!parents.length ||
                    (parents.length === 1 &&
                        parents[0] !== null &&
                        seen[parents[0].getId()] != null &&
                        seen[parents[0].getId()].width !== width) ) {

                    let depthAtTakenWidth = takenCoors.get(width - widthUnit);
                    if (takenCoors.get(width + widthUnit) == null) { // nothing below this node
                        let oldWidth = width;
                        let greatestWidthAdjusted = false;
                        while (depthAtTakenWidth != null) {
                            if (depthAtTakenWidth > depth) {
                                if (!greatestWidthAdjusted && greatestWidth === oldWidth) {
                                    greatestWidth -= widthUnit;
                                    takenCoors.delete(oldWidth);
                                }
                                greatestWidthAdjusted = true;
                                width -= widthUnit;
                            } else {
                                break;
                            }
                            depthAtTakenWidth = takenCoors.get(width - widthUnit);
                        }
                        if (oldWidth != width) {
                            widthCondense(node, oldWidth, width);
                        }
                    }
                }
            }
        }

        function widthCondense(node, oldWidth, width) {
            let children = node.getChildren();
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (seen[child.getId()] != null && seen[child.getId()].width === oldWidth) {
                    seen[child.getId()].width = width;
                    let depthAtTakenWidth = takenCoors.get(width);
                    if (depthAtTakenWidth != null) {
                        takenCoors.set(width, Math.min( seen[child.getId()].depth, depthAtTakenWidth));
                    }

                    widthCondense(child, oldWidth, width);
                    break;
                }
            }
        }
    }


    // adjust positions of nodes so that children will never be
    // to the left of their parents: ex. if map and filter lead into join node
    //   map ---join                          map ----------------- join
    //     \ project-- filter/                  \ project-- filter/
    private static _adjustPositions(node: DagNode, nodes, seen: Set<DagNodeId>) {
        seen.add(node.getId());
        node.getChildren().forEach(child => {
            let diff = nodes[node.getId()].depth - nodes[child.getId()].depth;
            let adjustmentNeeded = false;
            if (diff <= 0) {
                let adjustment = diff - 1;
                nodes[child.getId()].depth += adjustment;
                adjustmentNeeded = true;
            }
            if (adjustmentNeeded || !seen.has(child.getId())) {
                this._adjustPositions(child, nodes, seen);
            }
        });
    }

     /**
     * DagView.render
     *
     *  // restore/dredraw dataflow dimensions and nodes,
        // add connections separately after so all node elements already exist
        // adds event listeners
     */
    public render(): void {
        if (this.$dfArea.closest("#dagView").length && this.$dfArea.hasClass("rendered")) {
            return;
        }

        this.tabId = this.graph.getTabId();
        this.$dfArea.empty().html(
            '<div class="dataflowAreaWrapper">' +
            '<div class="commentArea"></div>' +
            '<svg class="edgeSvg"></svg>' +
            '<svg class="operatorSvg"></svg>' +
            '</div>'
        );
        const dimensions = this.graph.getDimensions();
        const scale = this.graph.getScale();
        const $wrapper: JQuery = this.$dfArea.find(".dataflowAreaWrapper");
        if (dimensions.width > -1) {
            $wrapper.css("min-height", dimensions.height * scale);
            $wrapper.css("min-width", dimensions.width * scale);
            $wrapper.css("background-size", DagView.gridLineSize * scale);
        }
        $wrapper.children().css("transform", "scale(" + scale + ")");

        const nodes: Map<DagNodeId, DagNode> = this.graph.getAllNodes();
        if (nodes.size > DagView.dataflowNodeLimit) {
            let text: string = xcStringHelper.replaceMsg(DagTStr.LargeDataflowMsg, {
                "num": xcStringHelper.numToStr(nodes.size)
            });
            let largeMsg: HTML = `<div class="largeMsg">
                                    <div class="innerContent">${text}
                                        <button class="btn" data-mixpanel-id="ViewDataflowBtn">View Module</button>
                                    </div>
                                </div>`;
            this.$dfArea.append(largeMsg);
            let $largeMsg: JQuery = this.$dfArea.find(".largeMsg");

            $largeMsg.find(".btn").click(() => {
                $largeMsg.find(".btn").off();
                xcUIHelper.showRefreshIcon($largeMsg, true, null);
                setTimeout(() => { // allow refresh icon to start spinning
                    this.$dfArea.find(".largeMsg").remove();
                    this._drawConnectionArea(nodes, $wrapper);
                    this.$dfArea.removeClass("largeHidden");
                    this.$dfArea.find(".refreshIcon").remove();
                }, 500);
            });
            this.$dfArea.addClass("largeHidden");

            // if lots of node, delay the rendering by a split second
            // so that we can show .largeMsg
            setTimeout(() => {
                this._renderAllNodes(nodes);
            });
        } else {
            this.$dfArea.removeClass("largeHidden");
            this._drawConnectionArea(nodes, $wrapper);
            this._renderAllNodes(nodes);
        }

        this.graph.getAllComments().forEach((commentNode: CommentNode) => {
            DagComment.Instance.drawComment(commentNode, this.$dfArea);
        });

        this._setupGraphEvents();

        this.$dfArea.addClass("rendered");
        if (this.dagTab instanceof DagTabUser) {
            this._checkLoadedTabHasQueryInProgress();
        }
    }

    public rerender(): void {
        this.$dfArea.removeClass('rendered');
        this.render();
    }

    public addInstructionNode() {
        let nodeInfo: DagNodeInfo = {
            type: DagNodeType.Instruction,
            subType: null,
            input: null,
            display: {x: 100, y: 100},
            state: undefined
        };
        const node: DagNode = DagNodeFactory.create(nodeInfo);
        this._addNodeNoPersist(node, { isNoLog: true });
        this.deselectNodes();
        DagNodeInfoPanel.Instance.hide();
        this._hasInstructionNode = true;
    }

    public removeInstructionNode(replacementNodeInfo?: any): DagNode {
        const $instructionNode = this.$dfArea.find(".operator.instruction");
        let x: number = null;
        let y: number = null;
        if ($instructionNode.length) {
            const containerRect = this.$dfArea.find(".operatorSvg")[0].getBoundingClientRect();
            const nodeRect = $instructionNode[0].getBoundingClientRect();
            x = Math.round((nodeRect.left  - containerRect.left) / DagView.gridSpacing) * 20;
            y = Math.round((nodeRect.top  - containerRect.top) / DagView.gridSpacing) * 20;
            $instructionNode.remove();
        }
        this._hasInstructionNode = false;
        if (replacementNodeInfo) {
            return this.autoAddNode(replacementNodeInfo.type, replacementNodeInfo.subType, null, null, {x, y});
        }
    }

    private _renderAllNodes(nodes) {
        let $nodes = $();
        let maxX = 0
        let maxY = 0;
        nodes.forEach((node: DagNode) => {
            this._addProgressTooltips(node);
            $nodes = $nodes.add(this._drawNode(node, false, true));
            let coors = node.getPosition();
            maxX = Math.max(coors.x, maxX);
            maxY = Math.max(coors.y, maxY);
        });

        $nodes.appendTo(this.$dfArea.find(".operatorSvg"));
        this._setGraphDimensions({x: maxX, y: maxY});
    }

    private _drawConnectionArea(nodes:  Map<DagNodeId, DagNode>, $wrapper: JQuery) {
        const scale = this.graph.getScale();
        const $svg = $(`<svg class="edgeSvg" style="transform:scale(${scale});"/>`);
        const svg = d3.select($svg[0]);
        nodes.forEach((node: DagNode, nodeId: DagNodeId) => {
            node.getParents().forEach((parentNode, index) => {
                const parentId: DagNodeId = parentNode.getId();
                this._drawConnection(parentId, nodeId, index, node.canHaveMultiParents(), svg, false, true);
            });
        });
        $wrapper.find(".edgeSvg").replaceWith($svg);
    }

    // resume progress checking
    private _checkLoadedTabHasQueryInProgress() {
        const queryPrefix: string = "table_" + this.graph.getTabId();
        XcalarQueryList(queryPrefix + "*")
        .then((ret) => {
            let latestTime = 0;
            let latestQuery;
            ret.forEach((query) => {
                let timeStr: string = query.name.slice(query.name.lastIndexOf("#t_") + 3);
                timeStr = timeStr.slice(0, timeStr.indexOf("_"));
                let time = parseInt(timeStr);
                if (isNaN(time)) {
                    time = 1;
                }
                if (time > latestTime) {
                    latestTime = time;
                    latestQuery = query;
                }
            });

            if (latestQuery) {
                this.graph.restoreExecution(latestQuery.name);
            }
        })
        .fail(() => {
            console.error("query list failed");
        });
    }

    /**
     * DagView.addBackNodes
     * @param nodeIds
     * @param tabId
     * @param sliceInfo?
     * used for undoing/redoing operations
     */
    public addBackNodes(
        nodeIds: DagNodeId[],
        spliceInfo?,
        identifiers?
    ): XDPromise<void> {
        spliceInfo = spliceInfo || {};
        identifiers = identifiers || {};

        this.dagTab.turnOffSave();
        // need to add back nodes in the reverse order they were deleted
        this.deselectNodes();
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const nodes = [];
        let hasLinkOut: boolean = false;
        this.graph.turnOnBulkStateSwitch();
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            let node;
            if (!nodeId.startsWith("comment")) {
                node = this.graph.addBackNode(nodeId, spliceInfo[nodeId]);
                const childrenNodes = node.getChildren();
                childrenNodes.forEach((childNode) => {
                    childNode.setIdentifiers(identifiers[childNode.getId()]);
                });
                if (node instanceof DagNodeDFOut) {
                    hasLinkOut = true;
                }
                const coors = node.getPosition();
                maxXCoor = Math.max(coors.x, maxXCoor);
                maxYCoor = Math.max(coors.y, maxYCoor);
            } else if (nodeId.startsWith("comment")) {
                node = this.graph.addBackComment(nodeId);
                const coors = node.getPosition();
                const dimensions = node.getDimensions();
                maxXCoor = Math.max(coors.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(coors.y + dimensions.height, maxYCoor);
            }
            nodes.push(node);
        }
        this.graph.turnOffBulkStateSwitch();
        const dagNodes = nodes.filter(node => {
            return !node.getId().startsWith("comment");
        });

        const comments = nodes.filter(node => {
            return node.getId().startsWith("comment");
        });

        this._drawAndConnectNodes(dagNodes);

        for (let i = 0; i < comments.length; i++) {
            DagComment.Instance.drawComment(comments[i], this.$dfArea, true);
        }

        this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });

        if (hasLinkOut) {
            this.checkLinkInNodeValidation();
        }
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    private _rerunOptimized() {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        (this.graph as DagOptimizedGraph).reexecute()
        .then(() => {
            deferred.resolve();
        })
        .fail((e) => {
            Alert.error("Optimized Execution Error", e);
            deferred.reject(e);
        });
        return deferred.promise();
    }

    /**
     * DagView.run
     * // run the entire dag,
     * // if no nodeIds passed in then it will execute all the nodes
     */
    public run(
        nodeIds?: DagNodeId[],
        optimized?: boolean,
        generateOptimizedDataflow?: boolean,
        noAutoPreview?: boolean,
        rerun?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (this.dagTab instanceof DagTabOptimized) {
            return this._rerunOptimized();
        }
        let tabsToLoad: DagTabUser[] = [];

        PromiseHelper.convertToJQuery(this._openLinkedTabs(this.graph, nodeIds, optimized))
            .then(() => {
                return this._runValidation(nodeIds, optimized);
            })
            .then((ret) => {
                if (ret && ret.optimized) {
                    optimized = true;
                }
                return this._loadMainModuleNeededTabsBeforeRun();
            })
            .then((res) => {
                tabsToLoad = res;
                tabsToLoad.forEach((tab) => DagTabManager.Instance.addTabCache(tab));
                return this.graph.execute(nodeIds, optimized, null,
                    generateOptimizedDataflow, rerun);
            })
            .then(() => {
                if (!noAutoPreview && UserSettings.Instance.getPref("dfAutoPreview") === true &&
                    nodeIds != null &&
                    nodeIds.length === 1 &&
                    !generateOptimizedDataflow
                ) {
                    const node: DagNode = this.graph.getNode(nodeIds[0]);
                    if (node != null &&
                        (!node.isOutNode() || node instanceof DagNodeAggregate) &&
                        node.getState() === DagNodeState.Complete
                    ) {
                        DagViewManager.Instance.viewResult(node, this.tabId);
                    }
                }
                deferred.resolve();
            })
            .fail((error) => {
                deferred.reject(this._handleExecutionError(error));
            })
            .always(() => {
                tabsToLoad.forEach((tab) => DagTabManager.Instance.removeTabCache(tab));
            });

        return deferred.promise();
    }

    private _handleExecutionError(error: any): any {
        if (error && error.error === "cancel" || error === StatusTStr[StatusT.StatusCanceled]) {
            return error;
        }
        let $node: JQuery;
        if (error && error.hasError && error.node) {
            const nodeId: DagNodeId = error.node.getId();
            $node = this._getNode(nodeId);
        }
        if ($node && $node.length) {
            DagTabManager.Instance.switchTab(this.tabId);
            StatusBox.show(error.type, $node);
        } else if (error) {
            DagTabManager.Instance.switchTab(this.tabId);
            if (error.hasError && error.type) {
                error = error.node != null
                ? error.node.title + " (" + error.node.type + ") - " + error.type
                : error.type;
            }
            delete error.node;
            console.log(error);
            if (error === DFTStr.AllExecuted) {
                Alert.error("Error", error, {
                    buttons: [{
                        name: "Re-execute All",
                        func: () => {
                            this.reset(null, true)
                            .then(() => {
                                this.run();
                            });
                        }
                    }]
                });
            } else {
                Alert.error("Error", error);
            }
        }
        return error;
    }

    /**
     * DagView.unlockNode
     * @param nodeId
     */
    public unlockNode(nodeId: DagNodeId): void {
        this._getNode(nodeId).removeClass("locked");
        delete this.lockedNodeIds[nodeId];
        if (this.graph != null && (!Object.keys(this.lockedNodeIds).length && !this.configLockedNodeIds.size) ) {
            this.graph.unsetGraphNoDelete();
        }
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
    }

    /**
     * DagView.lockNode
     * @param nodeId
     */
    public lockNode(nodeId: DagNodeId): string {
        this._getNode(nodeId).addClass("locked");
        this.lockedNodeIds[nodeId] = true;
        this.graph.setGraphNoDelete();
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
        return this.tabId;
    }


    /**
     * DagView.lockConfigNode
     * @param nodeId
     */
    public lockConfigNode(nodeId: DagNodeId): string {
        this.configLockedNodeIds.add(nodeId);
        this.graph.setGraphNoDelete();
        this.$dfArea.addClass("configLocked");

        const $node = this._getNode(nodeId);
        $node.addClass("configLocked");

        const g = d3.select($node.get(0)).append("g")
            .attr("class", "configIcon")
            .attr("transform", `translate(${DagView.nodeWidth - 22}, 8)`);
        g.append("text")
            .attr("font-family", "icomoon")
            .attr("font-size", 12)
            .attr("fill", "white")
            .text(_d => "\ue9a7");
        return this.tabId;
    }


    /**
     * DagView.unlockConfigNode
     * @param nodeId
     */
    public unlockConfigNode(nodeId: DagNodeId): void {
        this.configLockedNodeIds.delete(nodeId);
        if (this.graph != null && (!Object.keys(this.lockedNodeIds).length && !this.configLockedNodeIds.size) ) {
            this.graph.unsetGraphNoDelete();
            this.$dfArea.removeClass("configLocked");
        }
        const $node = this._getNode(nodeId);
        $node.removeClass("configLocked");
        $node.find(".configIcon").remove();
    }

    /**
     * DagView.isNodeLocked
     * @param nodeId
     * @param tabId
     */
    public isNodeLocked(nodeId: DagNodeId): boolean {
        return this.lockedNodeIds[nodeId];
    }

    /**
     * DagView.isNodeConfigLocked
     * @param nodeId
     * @param tabId
     */
    public isNodeConfigLocked(nodeId: DagNodeId): boolean {
        return this.configLockedNodeIds.has(nodeId);
    }

    /**
     * DagView.pasteNodes
     *  finds new position for cloned nodes, adds to dagGraph and UI
     */
    public pasteNodes(nodeInfos): any[] {
        if (!nodeInfos.length) {
            return;
        }
        if (this.dagTab instanceof DagTabExecuteOnly) {
            // cannot modify sql execute tab
            this.dagTab.viewOnlyAlert();
            return;
        }
        if (this._hasInstructionNode) {
            this.removeInstructionNode();
        }
        this.deselectNodes();

        let minXCoor: number = nodeInfos[0].display.x;
        let minYCoor: number = nodeInfos[0].display.y;
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        let upperLeftMostNode = null;
        // find the upperLeft-most node and min and max x/y coordinates
        // of the group of nodes being pasted
        nodeInfos.forEach((nodeInfo) => {
            minYCoor = Math.min(nodeInfo.display.y, minYCoor);
            if (nodeInfo.display.y === minYCoor) {
                minXCoor = Math.min(nodeInfo.display.x, minXCoor);
                if (nodeInfo.display.x === minXCoor) {
                    upperLeftMostNode = nodeInfo;
                }
            }

            if (nodeInfo.display.height && nodeInfo.display.width) {
                maxXCoor = Math.max(nodeInfo.display.x + nodeInfo.display.width, maxXCoor);
                maxYCoor = Math.max(nodeInfo.display.y + nodeInfo.display.height, maxYCoor);
            } else {
                maxXCoor = Math.max(nodeInfo.display.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.display.y, maxYCoor);
            }
        });

        const scale = this.graph.getScale();
        let origMinXCoor = upperLeftMostNode.display.x;
        let origMinYCoor = upperLeftMostNode.display.y;
        minXCoor = Math.max(origMinXCoor, Math.round((this.$dfArea.scrollLeft() + 60) /
        scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing);
        minYCoor = Math.max(origMinYCoor, Math.round((this.$dfArea.scrollTop() + 60) /
        scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing);
        const nextAvailablePosition = this._getNextAvailablePosition(null,
            minXCoor, minYCoor);
        let xDelta = nextAvailablePosition.x - origMinXCoor;
        let yDelta = nextAvailablePosition.y - origMinYCoor;
        maxXCoor += xDelta;
        maxYCoor += yDelta;

        const newNodeIds: DagNodeId[] = [];
        const allNewNodeIds: DagNodeId[] = [];
        const oldNodeIdMap = new Map();
        const allNewNodes = [];
        const nodeToRemove: boolean[] = [];
        const newLinkOutNodes: DagNodeDFOut[] = [];
        const newAggNodes: DagNodeAggregate[] = [];
        this.dagTab.turnOffSave();
        const svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');

        try {
            let isSQLFunc = (this.dagTab instanceof DagTabSQLFunc);
            nodeInfos.forEach((nodeInfo) => {
                if (nodeInfo.id) {
                    // replace id with nodeId so node doesn't get created
                    // with that id and cause duplicates
                    nodeInfo.nodeId = nodeInfo.id;
                    delete nodeInfo.id;
                }
                nodeInfo = xcHelper.deepCopy(nodeInfo);
                nodeInfo.display.x += xDelta;
                nodeInfo.display.y += yDelta;
                if (nodeInfo.hasOwnProperty("text")) {
                    const commentInfo = {
                        text: nodeInfo.text,
                        display: nodeInfo.display
                    };
                    const commentNode = this.graph.newComment(commentInfo);
                    allNewNodeIds.push(commentNode.getId());
                    DagComment.Instance.drawComment(commentNode, this.$dfArea, true);
                    allNewNodes.push(commentNode);
                } else if (nodeInfo.hasOwnProperty("input")) {
                    // remove parents so that when creating
                    // the new node, we don't provide a parent that doesn't exist or
                    // the parentId of the original node
                    // since this is a deep copy, nodeInfos still has the parents
                    delete nodeInfo.parents;
                    delete nodeInfo.subGraphNodeIds;
                    if (isSQLFunc) {
                        nodeInfo = this._convertInNodeForSQLFunc(nodeInfo);
                    }
                    const newNode: DagNode = this.graph.newNode(nodeInfo);
                    if (newNode.getState() === DagNodeState.Unused && !newNode.isConfigured()) {
                        // check if really unused
                        let input = newNode.getParam();
                        let baseNode = DagNodeFactory.create({
                            type: nodeInfo.type,
                            subType: nodeInfo.subType
                        });
                        if (!xcHelper.deepCompare(input, baseNode.getParam())) {
                            newNode.beConfiguredState();
                        }
                    }

                    let nodeType: DagNodeType = newNode.getType();
                    if (newNode instanceof DagNodeAggregate) {
                        newAggNodes.push(newNode);
                    }
                    const newNodeId: DagNodeId = newNode.getId();
                    if (nodeInfo.nodeId) {
                        oldNodeIdMap.set(nodeInfo.nodeId, newNodeId);
                    }
                    newNodeIds.push(newNodeId);
                    allNewNodeIds.push(newNodeId);
                    allNewNodes.push(newNode);
                    if (newNode instanceof DagNodeDFOut) {
                        newLinkOutNodes.push(newNode);
                    }
                    // filter out invalid case
                    let toRemove: boolean = false;
                    if (isSQLFunc) {
                        if (!DagTabSQLFunc.isValidNode(newNode)) {
                            toRemove = true;
                        }
                    } else {
                        if (nodeType === DagNodeType.SQLFuncIn ||
                            nodeType === DagNodeType.SQLFuncOut
                        ) {
                            toRemove = true;
                        }
                    }

                    if (toRemove) {
                        this.graph.removeNode(newNode.getId(), false);
                    } else {
                        this._drawNode(newNode, true);
                    }
                    nodeToRemove.push(toRemove);
                }
            });
            if (!allNewNodeIds.length) {
                this.dagTab.turnOnSave();
                return;
            }

            // restore connection to parents
            const nodesMap: Map<DagNodeId, DagNode> = new Map();
            allNewNodeIds.forEach((newNodeId: DagNodeId, i) => {
                if (newNodeId.startsWith("comment")) {
                    return;
                }
                if (nodeInfos[i].parents && !nodeToRemove[i]) {
                    const newNode = allNewNodes[i];
                    nodeInfos[i].parents.forEach((parentId, j) => {
                        if (parentId == null) {
                            return; // skip empty parent slots
                        }
                        const newParentId: DagNodeId = oldNodeIdMap.get(parentId);
                        if (newParentId && this.graph.hasNode(newParentId) &&
                            newParentId !== newNodeId
                        ) {
                            try {
                                this.graph.connect(newParentId, newNodeId, j, false, false);
                                nodesMap.set(newNode.getId(), newNode);
                                this._drawConnection(newParentId, newNodeId, j, newNode.canHaveMultiParents(), svg);
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    });

                    nodesMap.set(newNode.getId(), newNode);
                }
            });

            this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });
            if (this.dagTab instanceof DagTabSQLFunc) {
                let sqlFuncInNodes = this.dagTab.resetInputOrder();
                this._updateTitleForNodes(sqlFuncInNodes);
            }
            let updatedLinkOutNodes: DagNodeDFOut[] = this.graph.resolveNodeConflict(newLinkOutNodes);
            if (updatedLinkOutNodes.length) {
                this._updateTitleForNodes(updatedLinkOutNodes);
            }
            let updatedAggNodes: DagNodeAggregate[] = this.graph.resolveAggConflict(newAggNodes);
            if (updatedAggNodes.length) {
                this._updateTitleForNodes(updatedAggNodes);
            }
            const newParentId: DagNodeId = oldNodeIdMap.get(upperLeftMostNode.nodeId);
            let $node = this._getNode(newParentId);
            if ($node.length) {
                $node.scrollintoview({duration: 0});
            }
            // call this after resolving node conflicts so we don't reset the
            // original nodes' tables
            this.graph.checkNodesState(nodesMap);
            this.graph.updateHeads();

            Log.add(SQLTStr.PasteOperations, {
                "operation": SQLOps.PasteOperations,
                "dataflowId": this.tabId,
                "nodeIds": allNewNodeIds
            });
            this.dagTab.turnOnSave();
            this.dagTab.save();
            return allNewNodes;
        } catch (error) {
            this.dagTab.turnOnSave();
            throw(error);
        }
    }

    public deselectNodes(): void {
        const $selected = this.$dfArea.find(".selected");
        $selected.removeClass("selected tableSelected");
        $selected.find(".selection").remove();
    }


    /**
     * DagView.newNode
     * @param dagId
     * @param nodeInfo
     */
    public newNode(nodeInfo: DagNodeInfo): DagNode {
        this.dagTab.turnOffSave();

        const node: DagNode = this.graph.newNode(nodeInfo);
        this._addNodeNoPersist(node);

        this.dagTab.turnOnSave();
        this.dagTab.save();
        return node;
    }


    /**
     * DagView.newComment
     */
    public newComment(
        commentInfo: CommentInfo,
        isFocus?: boolean
    ): XDPromise<void> {
        this.dagTab.turnOffSave();
        commentInfo.display.x = Math.max(DagView.gridSpacing,
            Math.round(commentInfo.display.x / DagView.gridSpacing) * DagView.gridSpacing);
        commentInfo.display.y = Math.max(DagView.gridSpacing,
            Math.round(commentInfo.display.y / DagView.gridSpacing) * DagView.gridSpacing);
        const commentNode = this.graph.newComment(commentInfo);
        let isSelect = false;
        if (isFocus) {
            isSelect = true;
        }
        DagComment.Instance.drawComment(commentNode, this.$dfArea, isSelect, isFocus);
        const dimensions = {
            x: commentNode.getPosition().x + commentNode.getDimensions().width,
            y: commentNode.getPosition().y + commentNode.getDimensions().height
        };
        this._setGraphDimensions(dimensions);
        Log.add(SQLTStr.NewComment, {
            "operation": SQLOps.NewComment,
            "dataflowId": this.tabId,
            "commentId": commentNode.getId()
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }



    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    public removeNodes(nodeIds: DagNodeId[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.dagTab.turnOffSave();
        const nodeIdsMap = this.lockedNodeIds || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        //always resolves
        this._removeNodesNoPersist(nodeIds)
        .then((ret) => {
            let promise = PromiseHelper.resolve();
            let shouldSave: boolean = false;
            if (ret == null) {
                promise = PromiseHelper.reject();
            } else {
                if (ret.hasLinkOut) {
                    this.checkLinkInNodeValidation();
                }
                shouldSave = true;
            }
            this.dagTab.turnOnSave();
            if (shouldSave) {
                return this.dagTab.save();
            } else {
                return promise;
            }
        })
        .then(deferred.resolve)
        .then(deferred.reject);

        return deferred.promise();
    }



    /**
     * DagView.copyNodes
     * @param nodeIds
     */
    public copyNodes(nodeIds: DagNodeId[]): string {
        if (!nodeIds.length) {
            return "";
        }
        return JSON.stringify(this._createNodeInfos(nodeIds, null, {
            clearState: true,
            includeTitle: false,
            forCopy: true
        }), null, 4);
    }

     /**
     * DagView.cutNodes
     * @param nodeIds
     */
    public cutNodes(nodeIds: DagNodeId[]): string {
        const nodeIdsMap = this.lockedNodeIds || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        if (!nodeIds.length) {
            return;
        }

        const nodesStr = JSON.stringify(this._createNodeInfos(nodeIds, null, {
            clearState: true,
            includeTitle: false,
            forCopy: true
        }), null, 4);
        this.removeNodes(nodeIds);
        return nodesStr;
    }

    /**
     * @deprecated
     */
    public hasOptimizedNode(nodeIds?: DagNodeId[]): boolean {
        if (nodeIds) {
            for (let i = 0; i < nodeIds.length; i++) {
                const $node = this._getNode(nodeIds[i]);
                if ($node.data("subtype") === DagNodeSubType.DFOutOptimized ||
                    $node.data("subtype") === DagNodeSubType.ExportOptimized) {
                    return true;
                }
            }
        } else {
            if (this.$dfArea.find('.operator[data-subtype="' + DagNodeSubType.DFOutOptimized + '"]').length > 0 ||
                this.$dfArea.find('.operator[data-subtype="' + DagNodeSubType.ExportOptimized + '"]').length > 0) {
                return true;
            }
        }

        return false;
    }

    public hasOptimzableNode(nodeIds?: DagNodeId[]): boolean {
        if (nodeIds) {
            for (let i = 0; i < nodeIds.length; i++) {
                const $node = this._getNode(nodeIds[i]);
                if ($node.data("type") === DagNodeType.DFOut ||
                    $node.data("type") === DagNodeType.Export) {
                    return true;
                }
            }
        } else {
            if (this.$dfArea.find('.operator[data-type="' + DagNodeType.DFOut + '"]').length > 0 ||
                this.$dfArea.find('.operator[data-type="' + DagNodeType.Export + '"]').length > 0) {
                return true;
            }
        }

        return false;
    }


    /**
   * DagView.disconnect
   * @param parentNodeId
   * @param childNodeId
   * removes connection from DagGraph, connection line, updates connector classes
   */
    public disconnectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number
    ): XDPromise<void> {
        this.dagTab.turnOffSave();

        const $edge: JQuery = this.$dfArea.find('.edge[data-parentnodeid="' +
            parentNodeId +
            '"][data-childnodeid="' +
            childNodeId +
            '"][data-connectorindex="' +
            connectorIndex + '"]');

        // Currently only used by SQL node but can be extended for other nodes
        const childNode = this.graph.getNode(childNodeId);
        if (childNode == null) {
            return PromiseHelper.reject();
        }
        const identifiers = childNode.getIdentifiers();
        let setNodeConfig;
        if (childNode.getType() === DagNodeType.Set) {
            let param = childNode.getParam();
            setNodeConfig = param.columns[connectorIndex];
        }
        const wasSpliced = this.graph.disconnect(parentNodeId, childNodeId, connectorIndex);
        this._removeConnection($edge, childNodeId);
        Log.add(SQLTStr.DisconnectOperations, {
            "operation": SQLOps.DisconnectOperations,
            "dataflowId": this.tabId,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex,
            "wasSpliced": wasSpliced,
            "identifiers": identifiers,
            "setNodeConfig": setNodeConfig
        });

        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }


    public autoAlign(options?: { isNoLog: boolean }): void {
        const nodePositionInfo = DagView.getAutoAlignPositions(this.graph);

        const { isNoLog = false } = options || {};
        this.moveNodes(nodePositionInfo.nodeInfos, {
            x: nodePositionInfo.maxX + DagView.horzPadding,
            y: nodePositionInfo.maxY + DagView.vertPadding
        }, { isNoLog: isNoLog });
    }


    /**
     * DagView.autoAddNode
     * @param parentNodeId
     * @param newType
     * @description
     * adds node to dataflow graph by automatically determining position
     * 1. get parent node to determine position of new node
     * 2. use DagView.newNode to create the new node
     * 3. connect new node to parent node
     */
    public autoAddNode(
        newType: DagNodeType,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
        input?: object,
        options: {
            nodeTitle?: string
            configured?: boolean
            forceAdd?: boolean
            autoConnect?: boolean
            x?: number,
            y?: number
        } = {}
    ): DagNode {
        let logActions = [];
        let parentNode: DagNode;
        let nextAvailablePosition: Coordinate;
        let connectToParent: boolean = false;
        let {x, y} = options;
        let originalCoorsProvided = (x != null && y != null);
        let originalCoors = {
            x: x || DagView.gridSpacing,
            y: y || DagView.gridSpacing
        };
        let nodeInfo: DagNodeInfo = {
            type: newType,
            subType: subType,
            input: input,
            display: originalCoors,
            state: options.configured ? DagNodeState.Configured : undefined
        };
        if (options.nodeTitle) {
            nodeInfo.title = options.nodeTitle;
        }
        if (!parentNodeId && options.autoConnect) {
            parentNodeId = DagViewManager.Instance.getSelectedNodeIds(true)[0];
        }

        this.dagTab.turnOffSave();
        const node: DagNode = this.graph.newNode(nodeInfo);
        const addLogParam: LogParam = this._addNodeNoPersist(node, { isNoLog: true });
        logActions.push(addLogParam.options);

        if (parentNodeId) {
            parentNode = this.graph.getNode(parentNodeId);
            if (parentNode == null) {
                this.dagTab.turnOnSave();
                this.dagTab.save();
                return null;
            }
            if (parentNode.getMaxChildren() !== 0 && !node.isSourceNode() &&
                !(parentNode.getType() === DagNodeType.Custom &&
                  parentNode.getChildren().length)) {
                connectToParent = true;
            }
            if (!options.forceAdd &&
                parentNode.getType() === DagNodeType.Sort &&
                (newType !== DagNodeType.Export &&
                    newType !== DagNodeType.PublishIMD)) {
                // do not encourage connecting to sort node if next node
                // is not an export or publish
                connectToParent = false;
            }
        }
        if (!originalCoorsProvided) {
            if (connectToParent) {
                const position: Coordinate = parentNode.getPosition();
                x = x || (position.x + DagView.horzNodeSpacing);
                y = y || (position.y + DagView.vertNodeSpacing * parentNode.getChildren().length);
            } else {
                const scale = this.graph.getScale();
                x = x || Math.round((this.$dfArea.scrollLeft() + 100) /
                    scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing;
                y = y || Math.round((this.$dfArea.scrollTop() + 100) /
                    scale / DagView.gridSpacing) * DagView.gridSpacing - DagView.gridSpacing;
            }
        }
        nextAvailablePosition = this._getNextAvailablePosition(node.getId(), x, y);

        if (nextAvailablePosition.x !== originalCoors.x ||
            nextAvailablePosition.y !== originalCoors.y) {
            const nodeMoveInfo: NodeMoveInfo[] = [{
                id: node.getId(),
                type: "dagNode",
                position: nextAvailablePosition,
                oldPosition: originalCoors
            }];
            const moveLogParam = this._moveNodesNoPersist(
                nodeMoveInfo,
                null,
                { isNoLog: true }
            );
            logActions.push(moveLogParam.options);
        }

        if (connectToParent) {
            const connectLogParam = this._connectNodesNoPersist(
                parentNodeId,
                node.getId(),
                0,
                { isNoLog: true}
            );
            logActions.push(connectLogParam.options);
        }
        Log.add("Add Operation", {
            operation: SQLOps.DagBulkOperation,
            actions: logActions,
            dataflowId: this.tabId,
            nodeId: node.getId()
        });

        const $node = this.getNodeElById(node.getId());
        $node.scrollintoview({duration: 0});

        this.dagTab.turnOnSave();
        this.dagTab.save();
        return node;
    }

    public getAllNodes(includeComments?: boolean): JQuery {
        let $nodes = this.$dfArea.find(".operator");
        if (includeComments) {
            $nodes = $nodes.add(this.$dfArea.find(".comment"));
        }
        return $nodes;
    }

    public getNodeElById(nodeId: DagNodeId): JQuery {
        return this._getNode(nodeId);
    }

    public getSelectedNodes(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): JQuery {
        let selector = ".operator.selected:not(.instruction)";
        if (includeSelecting) {
            selector += ", .operator.selecting";
        }
        if (includeComments) {
            selector += ", .comment.selected";
            if (includeSelecting) {
                selector += ", .comment.selecting";
            }
        }
        return this.$dfArea.find(selector);
    }


    public getSelectedNodeIds(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): DagNodeId[] {
        const $nodes: JQuery = this.getSelectedNodes(includeSelecting,
            includeComments);
        const nodeIds = [];
        $nodes.each(function () {
            nodeIds.push($(this).data("nodeid"));
        });
        return nodeIds;
    }


    public viewOptimizedDataflow(dagNode: DagNode): XDPromise<void> {
        if (!dagNode || !(dagNode instanceof DagNodeOutOptimizable)) {
            return PromiseHelper.reject("Invalid node");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const retinaId: string = DagTabOptimized.getId_deprecated(this.tabId, dagNode.getId());
        if (DagTabManager.Instance.getTabById(retinaId)) {
            DagTabManager.Instance.switchTab(retinaId);
            deferred.resolve();
        } else {
            const tabName = this.dagTab.getName();
            let dfOutName: string = dagNode instanceof DagNodeDFOut ?
                            dagNode.getParam().name : "export";
            let newTabName: string = tabName + " " + dfOutName + " optimized";
            const retinaTab = new DagTabOptimized({id: retinaId, name: newTabName});
            DagTabManager.Instance.loadTab(retinaTab)
            .then(() => {
                DagTabManager.Instance.switchTab(retinaId);
                deferred.resolve();
            })
            .fail((e) => {
                if (typeof e === "object" && e.status === StatusT.StatusRetinaNotFound) {
                    e = DFTStr.OptimizedDFNotExist;
                }
                Alert.error(DFTStr.OptimizedDFUnavailable, e);
                deferred.reject(e);
            });
        }

        return deferred.promise();
    }


    /**
     *
     * @param nodeIds
     * if no nodeIds passed, will reset all
     */
    public reset(nodeIds?: DagNodeId[], bypassResetAlert?: boolean, tableMsg?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const self = this;
        if (bypassResetAlert) {
            resolve();
            return deferred.promise();
        }

        let msg: string = nodeIds ? DagTStr.ResetMsg : DagTStr.ResetAllMsg;
        let title: string = DagTStr.Reset;
        if (tableMsg) {
            if (!nodeIds) {
                msg = DagTStr.DeleteTablesMsg;
                title = DagTStr.DeleteTables;
            } else {
                msg = DagTStr.DeleteTableMsg;
                title = DagTStr.DeleteTable;
            }
        }
        Alert.show({
            title: title,
            msg: msg,
            onConfirm: () => {
                resolve();
            },
            onCancel: () => {
                deferred.reject();
            }
        });

        function resolve() {
            self.dagTab.resetNodes(nodeIds);
            deferred.resolve();
        }
        return deferred.promise();
    }

     /**
     *
     * @param $node
     * @param text
     */
    public editDescription(
        nodeId: DagNodeId,
        text: string
    ): XDPromise<void> {
        const node: DagNode = this.graph.getNode(nodeId);
        if (node == null) {
            return PromiseHelper.reject();
        }
        const oldText: string = node.getDescription();
        this.dagTab.turnOffSave();

        node.setDescription(text);
        // event will trigger a description UI

        Log.add(SQLTStr.EditDescription, {
            "operation": SQLOps.EditDescription,
            "dataflowId": this.tabId,
            "oldDescription": oldText,
            "newDescription": text,
            "nodeId": nodeId
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

      /**
     * DagView.cancel
     * // cancel entire run or execution
     */
    public cancel() {
        this.graph.cancelExecute();
    }

    public highlightLineage(
        nodeId: DagNodeId,
        childNodeId?: DagNodeId,
        type?: "add" | "rename" | "remove" | "hide" | "pull"
    ): void {
        const $node = this._getNode(nodeId);
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }

        $node.addClass("lineageSelected");
        if (childNodeId) {
            const $edge: JQuery = this.$dfArea.find('.edge[data-parentnodeid="' +
                nodeId +
                '"][data-childnodeid="' +
                childNodeId +
                '"]');
            $edge.addClass("lineageSelected");
        }
        let tipText = "";
        if (type === "rename") {
            tipText = CommonTxtTstr.Renamed;
        } else if (type === "hide") {
            tipText = "Hidden";
        } else if (type === "add" || node.getNumParent() === 0) {
            tipText = CommonTxtTstr.Created;
        } else if (type === "remove") {
            tipText = CommonTxtTstr.Removed;
        } else if (type === "pull") {
            tipText = "Pulled";
        }
        if (tipText) {
            const scale = this.graph.getScale();
            const pos = node.getPosition();
            const x = scale * (pos.x + 45) - 27;
            const y = Math.max(1, scale * pos.y - 25);
            let tip: HTML = DagView._dagLineageTipTemplate(x, y, tipText);
            this.$dfArea.append(tip);
            $("#dagView").addClass("hideProgressTips");
        }
    }


    /**
     * Replace a group of nodes with a custom operator
     * @param nodeIds list of nodeIds need to be nested in the custom operator
     * @returns Promise with void
     * @description
     * 1. Create a custom operator with deep copies of the selected nodes
     * 2. Delete the selected nodes from current graph
     * 3. Add the custom operator to current graph
     * 4. Restore the connections
     * 5. Position the custom operator & update UI
     * 6. Persist the change to KVStore
     */
    public wrapCustomOperator(nodeIds: DagNodeId[]): XDPromise<void> {
        const connectionInfo: DagSubGraphConnectionInfo
            = this.graph.getSubGraphConnection(nodeIds);
        // Validate the sub graph
        if (connectionInfo.openNodes.length > 0) {
            // The selected node set cannot build a close sub graph
            const errNodeId = connectionInfo.openNodes[0];
            StatusBox.show(DagTStr.CustomOpIncomplete, this._getNode(errNodeId));
            return PromiseHelper.reject('Selected operator set is open');
        }
        if ((connectionInfo.out.length + connectionInfo.endSets.out.size) > 1) {
            // We only support one output for now
            const errNodeId = connectionInfo.out.length > 0
                ? connectionInfo.out[0].parentId
                : Array.from(connectionInfo.endSets.out)[0];
            StatusBox.show(DagTStr.CustomOpTooManyOutput, this._getNode(errNodeId));
            return PromiseHelper.reject('too many output');
        }
        const excludeNodeTypes = new Set([DagNodeType.DFIn, DagNodeType.DFOut,
                DagNodeType.CustomInput, DagNodeType.CustomOutput]);
        for (const nodeId of nodeIds) {
            // Cannot wrap these types of nodes inside a custom operator
            let node: DagNode = this.graph.getNode(nodeId);
            if (node != null &&
                (excludeNodeTypes.has(node.getType()) ||
                node instanceof DagNodeOutOptimizable
            )) {
                StatusBox.show(DagTStr.CustomOpTypeNotSupport, this._getNode(nodeId));
                return PromiseHelper.reject('Type not support');
            }
        }
        try {
            // Turn off KVStore saving for better performance
            this.dagTab.turnOffSave();

            // Create customNode from selected nodes
            const nodeInfos = this._createNodeInfos(nodeIds);
            const {
                node: customNode,
                connectionIn: newConnectionIn,
                connectionOut: newConnectionOut
            } = DagNodeCustom.createCustomNode(nodeInfos, connectionInfo, this.getGraph().generateNodeTitle());

            // Position custom operator
            const nodePosList = nodeInfos.map((nodeInfo) => ({
                x: nodeInfo.display.x,
                y: nodeInfo.display.y
            }));
            const geoInfo = DagView._getGeometryInfo(nodePosList);
            customNode.setPosition(geoInfo.centroid);
            // Position custom OP input nodes
            for (const inputNode of customNode.getInputNodes()) {
                const childGeoInfo = DagView._getGeometryInfo(
                    inputNode.getChildren().map((child) => child.getPosition())
                );
                inputNode.setPosition({
                    x: childGeoInfo.min.x - DagView.horzNodeSpacing,
                    y: childGeoInfo.centroid.y
                });
            }
            // Position custom OP output nodes
            for (const outputNode of customNode.getOutputNodes()) {
                const parentGeoInfo = DagView._getGeometryInfo(
                    outputNode.getParents().reduce((res, parent) => {
                        if (parent != null) {
                            res.push(parent.getPosition());
                        }
                        return res;
                    }, [])
                );
                outputNode.setPosition({
                    x: parentGeoInfo.max.x + DagView.horzNodeSpacing,
                    y: parentGeoInfo.centroid.y
                });
            }
            // Re-position all nodes in sub graph
            const subNodeGeoInfo = DagView._getGeometryInfo(customNode.getSubNodePositions());
            const deltaPos = {
                x: DagView.gridSpacing * 2 - subNodeGeoInfo.min.x,
                y: DagView.gridSpacing * 2 - subNodeGeoInfo.min.y
            };
            customNode.changeSubNodePostions(deltaPos);

            // Re-calculate sub graph dimensions
            let graphDimensions = customNode.getSubGraph().getDimensions();
            for (const nodePos of customNode.getSubNodePositions()) {
                graphDimensions = DagView._calculateDimensions(graphDimensions, nodePos);
            }
            customNode.getSubGraph().setDimensions(
                graphDimensions.width, graphDimensions.height);

            // Add customNode to DagView
            const customLogParam: LogParam = {
                title: SQLTStr.CreateCustomOperation,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: this.tabId
                }
            };
            this.graph.addNode(customNode);
            const addLogParam = this._addNodeNoPersist(customNode, { isNoLog: true, noViewOutput: connectionInfo.noViewOutput });
            customLogParam.options.actions.push(addLogParam.options);

            // Delete selected nodes
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            // always resolves
            this._removeNodesNoPersist(nodeIds,
                { isNoLog: true, isSwitchState: false, clearMeta: false}
            )
            .then(({logParam: removeLogParam, spliceInfos}) => {
                DagGraphBar.Instance.updateNumNodes(this.dagTab);

                customLogParam.options.actions.push(removeLogParam.options);

                // Create a set, which contains all nodes splicing parent index
                const splicingNodeSet: Set<string> = new Set();
                Object.keys(spliceInfos).forEach((removedNodeId) => {
                    const relatedSpliceInfo = spliceInfos[removedNodeId];
                    Object.keys(relatedSpliceInfo).forEach((relatedNodeId) => {
                        const spliceList = relatedSpliceInfo[relatedNodeId];
                        if (Array.isArray(spliceList) && spliceList.indexOf(true) >= 0) {
                            // This child node supports index splicing
                            splicingNodeSet.add(relatedNodeId);
                        }
                    });
                });

                // Connections to customNode
                for (const { parentId, childId, pos } of newConnectionIn) {
                    const connectLogParam = this._connectNodesNoPersist(
                        parentId,
                        childId,
                        pos,
                        { isNoLog: true, isSwitchState: false }
                    );
                    customLogParam.options.actions.push(connectLogParam.options);
                }
                for (const { parentId, childId, pos } of newConnectionOut) {
                    const needSplice = splicingNodeSet.has(childId);
                    const connectLogParam = this._connectNodesNoPersist(
                        parentId,
                        childId,
                        pos,
                        { isNoLog: true, isSwitchState: false, spliceIn: needSplice }
                    );
                    customLogParam.options.actions.push(connectLogParam.options);
                }

                // Restore the state
                const nodeStates: Map<string, number> = new Map();
                for (const nodeInfo of nodeInfos) {
                    const state = nodeInfo.state || DagNodeState.Unused;
                    const count = nodeStates.get(state) || 0;
                    nodeStates.set(state, count + 1);
                }
                const completeCount = nodeStates.get(DagNodeState.Complete) || 0;
                if (completeCount > 0 && completeCount === nodeInfos.length) {
                    // All nodes are in complete state, so set the CustomNode to complete
                    customNode.beCompleteState();
                    let outNodes = customNode.getOutputNodes();
                    if (outNodes[0]) {
                        let tailNode = outNodes[0].getParents()[0];
                        if (tailNode && tailNode.getTable()) {
                            customNode.setTable(tailNode.getTable(), true);
                        }
                    }
                } else {
                    customNode.switchState(false);
                }

                Log.add(customLogParam.title, customLogParam.options);

                // Turn on KVStore saving
                this.dagTab.turnOnSave();
                return this.dagTab.save();
            })
            .then(() => {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            this.dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

    /**
     * Expand the Custom node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandCustomNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeCustom) {
            return this._expandSubgraphNode({
                containerNode: dagNode,
                logTitle: SQLTStr.ExpandCustomOperation,
                getInputParent: (node) => dagNode.getInputParent(node),
                isInputNode: (node) => (node instanceof DagNodeCustomInput),
                isOutputNode: (node) => (node instanceof DagNodeCustomOutput)
            });
        } else {
            return PromiseHelper.reject(`${nodeId} is not a Custom operator`);
        }
    }

    private _expandSubgraphNode(args: {
        containerNode: SubgraphContainerNode,
        logTitle: string,
        getInputParent: (node: any) => DagNode,
        isInputNode: (node: DagNode) => boolean,
        isOutputNode: (node: DagNode) => boolean
        preExpand?: () => void,
        isPreAutoAlign?: boolean,
    }): XDPromise<void> {
        const {
            containerNode, logTitle, getInputParent, isInputNode, isOutputNode,
            preExpand = () => { }, isPreAutoAlign = false,
        } = args;

        if (this.dagTab == null) {
            return PromiseHelper.reject(`DagTab(${this.tabId}) not exist`);
        }

        try {
            this.dagTab.turnOffSave();
            preExpand();
            const subGraph = containerNode.getSubGraph();
            const allSubNodes = subGraph.getAllNodes();
            const expandNodeIds: string[] = [];
            const expandLogParam: LogParam = {
                title: logTitle,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: this.tabId
                }
            };
            const dagIds = [];
            allSubNodes.forEach(dagNode => {
                dagIds.push(dagNode.getId());
            });
            const connections: NodeConnection[] = [];
            const dagInfoList = this._createNodeInfos(dagIds, subGraph, {includeStats: true});
            const oldNodeIdMap = {};
            const newAggregates: AggregateInfo[] = [];

            dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
                if (dagNodeInfo.type == DagNodeType.Aggregate) {
                    let aggParam = <DagNodeAggregateInputStruct>dagNodeInfo.input;
                    if (aggParam.dest != "" && !DagAggManager.Instance.hasAggregate(aggParam.dest)) {
                        let agg: string = aggParam.dest;
                        if (agg[0] == gAggVarPrefix) {
                            agg = agg.substr(1);
                        }
                        newAggregates.push({
                            value: null,
                            dagName: agg,
                            aggName: aggParam.dest,
                            tableId: null,
                            backColName: null,
                            op: null,
                            node: null,
                            graph: this.tabId
                        });
                    }
                }
            });

            DagAggManager.Instance.bulkAdd(newAggregates);
            const aggNodeUpdates: Map<string, string> = new Map<string, string>();
            const $svg = this.$dfArea.find(".operatorSvg").remove();
            dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
                const parents: DagNodeId[] = dagNodeInfo.parents;
                const oldNodeId = dagNodeInfo["nodeId"];
                dagNodeInfo.graph = this.graph;
                const node: DagNode = DagNodeFactory.create(dagNodeInfo);
                const nodeId: string = node.getId();
                oldNodeIdMap[oldNodeId] = nodeId;
                // Figure out connections
                if (isInputNode(node)) {
                    return;
                } else if (isOutputNode(node)) {
                    containerNode.getChildren().forEach((child) => {
                        child.findParentIndices(containerNode).forEach((i) => {
                            connections.push({
                                parentId: parents[0],
                                childId: child.getId(),
                                pos: i
                            });
                        });
                    });
                    return;
                } else {
                    for (let i = 0; i < parents.length; i++) {
                        let parentNode = subGraph.getNode(parents[i]);
                        if (isInputNode(parentNode)) {
                            parentNode = getInputParent(parentNode);
                        }
                        if (parentNode == null) {
                            continue;
                        }
                        connections.push({
                            parentId: parentNode.getId(),
                            childId: nodeId,
                            pos: i
                        });
                    }
                }
                // Add sub nodes to graph
                expandNodeIds.push(nodeId);
                this.graph.addNode(node);

                if (node.getType() == DagNodeType.Aggregate) {
                    // Update agg dagId
                    aggNodeUpdates.set(node.getParam().dest, node.getId());
                }
                const addLogParam = this._addNodeNoPersist(node, {
                    isNoLog: true,
                    $svg: $svg
                });
                expandLogParam.options.actions.push(addLogParam.options);
                this._addProgressTooltips(node);
            });

            this.$dfArea.find(".edgeSvg").after($svg);
            DagAggManager.Instance.updateNodeIds(aggNodeUpdates);
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            // remove the container node from graph
            // always resolves
            this._removeNodesNoPersist(
                [containerNode.getId()],
                { isNoLog: true, isSwitchState: false, clearMeta: false })
            .then(({ logParam: removeLogParam, spliceInfos }) => {
                expandLogParam.options.actions.push(removeLogParam.options);
                // Create a set, which contains all nodes splicing parent index
                const splicingNodeSet: Set<string> = new Set();
                Object.keys(spliceInfos).forEach((removedNodeId) => {
                    const relatedSpliceInfo = spliceInfos[removedNodeId];
                    Object.keys(relatedSpliceInfo).forEach((relatedNodeId) => {
                        const spliceList = relatedSpliceInfo[relatedNodeId];
                        if (Array.isArray(spliceList) && spliceList.indexOf(true) >= 0) {
                            // This child node supports index splicing
                            splicingNodeSet.add(relatedNodeId);
                        }
                    });
                });
                const $svg = this.$dfArea.find(".edgeSvg").remove();
                const svg = d3.select($svg[0]);
                // restore edges
                for (const { parentId, childId, pos } of connections) {
                    const newParentId = oldNodeIdMap[parentId] || parentId;
                    const needSplice = splicingNodeSet.has(childId);
                    const connectLogParam = this._connectNodesNoPersist(
                        newParentId,
                        childId,
                        pos,
                        { isNoLog: true, spliceIn: needSplice, isSwitchState: false,
                         svg: svg}
                    );
                    expandLogParam.options.actions.push(connectLogParam.options);
                }
                this.$dfArea.find(".operatorSvg").before($svg);
                // Stretch the graph to fit the expanded nodes
                const autoAlignPos: Map<string, Coordinate> = new Map();
                if (isPreAutoAlign) {
                    for (const posInfo of DagView.getAutoAlignPositions(subGraph).nodeInfos) {
                        const nodeId = oldNodeIdMap[posInfo.id];
                        if (nodeId != null) {
                            autoAlignPos.set(nodeId, Object.assign({}, posInfo.position));
                        }
                    }
                }
                const moveInfo = this._getExpandPositions(
                    containerNode.getPosition(),
                    expandNodeIds,
                    autoAlignPos
                );
                const moveLogParam = this._moveNodesNoPersist(
                    moveInfo.nodePosInfos,
                    null,
                    { isNoLog: true }
                );
                expandLogParam.options.actions.push(moveLogParam.options);

                Log.add(expandLogParam.title, expandLogParam.options);
                DagGraphBar.Instance.updateNumNodes(this.dagTab);
                this.dagTab.turnOnSave();
                return this.dagTab.save();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        } catch (e) {
            console.error(e);
            this.dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

    private _getExpandPositions(
        sourceNodeCoord: Coordinate,
        expandNodeIds: (DagNodeId | CommentNodeId)[],
        prePositionMap: Map<string, Coordinate> = new Map()
    ): {
            nodePosInfos: NodeMoveInfo[], maxX: number, maxY: number
        } {
        const result = { nodePosInfos: [], maxX: 0, maxY: 0 };
        const expandNodeIdSet = new Set(expandNodeIds);

        // Get all the nodes' position info in the target graph
        const allNodePosInfos: NodeMoveInfo[] = [];
        const origNodePositions: Coordinate[] = [];
        const expandNodePositions: Coordinate[] = [];
        this.graph.getAllNodes().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'dagNode',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });
        this.graph.getAllComments().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'comment',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });

        // Calculate geometry information before expanding
        const origGeoInfo = DagView._getGeometryInfo(
            [sourceNodeCoord].concat(origNodePositions)
        );

        // Calculate geometry infomation of expanded nodes
        const expandGeoInfo = DagView._getGeometryInfo(expandNodePositions);

        const expandDimensions: Dimensions = {
            width: expandGeoInfo.max.x - expandGeoInfo.min.x,
            height: expandGeoInfo.max.y - expandGeoInfo.min.y
        };

        // Calculate the new positions
        const expandDeltaX = sourceNodeCoord.x - expandGeoInfo.centroid.x;
        const expandDeltaY = sourceNodeCoord.y - expandGeoInfo.centroid.y;
        const deltaX = Math.floor(expandDimensions.width / 2);
        const deltaY = Math.floor(expandDimensions.height / 2);
        for (const posInfo of allNodePosInfos) {
            const newPosInfo: NodeMoveInfo = {
                id: posInfo.id, type: posInfo.type, position: {
                    x: 0, y: 0
                }
            };
            if (expandNodeIdSet.has(posInfo.id)) {
                // Position the expand nodes according to the position of source node
                newPosInfo.position.x = posInfo.position.x + expandDeltaX;
                newPosInfo.position.y = posInfo.position.y + expandDeltaY;
            } else {
                // Position other nodes according to the geometry size of expaned nodes
                if (posInfo.position.x >= sourceNodeCoord.x) {
                    newPosInfo.position.x = posInfo.position.x + deltaX;
                } else {
                    newPosInfo.position.x = posInfo.position.x - deltaX;
                }
                if (posInfo.position.y >= sourceNodeCoord.y) {
                    newPosInfo.position.y = posInfo.position.y + deltaY;
                } else {
                    newPosInfo.position.y = posInfo.position.y - deltaY;
                }
            }
            result.nodePosInfos.push(newPosInfo);
        }

        // Shift the positions, so that nobody is out of bound
        const newGeoInfo = DagView._getGeometryInfo(result.nodePosInfos.map((info) => info.position));
        const shiftDeltaX = origGeoInfo.min.x - newGeoInfo.min.x;
        const shiftDeltaY = origGeoInfo.min.y - newGeoInfo.min.y;
        for (const posInfo of result.nodePosInfos) {
            posInfo.position.x += shiftDeltaX;
            posInfo.position.y += shiftDeltaY;
        }

        // Calculate the screen dimension
        result.maxX = newGeoInfo.max.x + shiftDeltaX;
        result.maxY = newGeoInfo.max.y + shiftDeltaY;

        return result;
    }


    /**
     * Share a custom operator(node). Called by the node popup menu.
     * @param nodeId
     * @description
     * 1. Find the DagNode needs to be shared in the active DagGraph
     * 2. Make a deep copy of the node
     * 3. Call DagCategoryBar to add the copy to the category bar(and extra actions, such as persisting)
     * 4. Change the display name of the node
     * 5. Persist the tab to KVStore
     */
    public shareCustomOperator(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`Node(${nodeId}) not found`);
        }
        const newNode = DagNodeFactory.create(dagNode.getNodeCopyInfo());
        if (newNode instanceof DagNodeCustom) {
            newNode.getSubGraph().reset();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        DagCategoryBar.Instance.addOperator({
            categoryType: DagCategoryType.Custom,
            dagNode: newNode,
            isFocusCategory: true
        })
            .then((newName) => {
                if (dagNode instanceof DagNodeCustom) {
                    dagNode.setCustomName(newName);
                    const $opTitle = this._getNode(dagNode.getId()).find('.opTitle');
                    $opTitle.text(dagNode.getCustomName());
                }
            })
            .then(() => this.dagTab.save())
            .then(() => deferred.resolve())
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Open a tab to show customOp's sub graph for editing
     * @param nodeId
     */
    public editCustomOperator(nodeId: DagNodeId): void {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return;
        }
        if (dagNode instanceof DagNodeCustom) {
            DagTabManager.Instance.newCustomTab(dagNode);
        }
    }

    /**
     * Open a tab to show SQL sub graph for viewing purpose
     * @param nodeId
     */
    public static inspectSQLNode(
        nodeId: DagNodeId,
        tabId: string
    ): XDPromise<string> {
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();
        const dagNode = graph.getNode(nodeId);
        if (dagNode == null || !(dagNode instanceof DagNodeSQL)) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let subGraph = dagNode.getSubGraph();
        let promise = PromiseHelper.resolve();

        if (!subGraph) {
            const params: DagNodeSQLInputStruct = dagNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const queryId = xcHelper.randName("sql", 8);
            promise = dagNode.compileSQL(params.sqlQueryStr, queryId);
        }
        promise
            .then(() => {
                const tabId: string = DagTabManager.Instance.newSQLTab(dagNode);
                const newDagView: DagView = DagViewManager.Instance.getActiveDagView();
                if (newDagView != null) {
                    newDagView.autoAlign({ isNoLog: true });
                }
                deferred.resolve(tabId);
            })
            .fail(deferred.reject);
        return deferred.promise();
    }

      /**
     * Expand the SQL node into a sub graph but keep the sql node
     * used when executing from sql editor to show progress on subgraph
     * while sql node is executing
     * @param nodeId
     */
    public static expandSQLNodeAndHide(
        nodeId: DagNodeId,
        tabId: string
    ): XDPromise<DagNode[]> {
        DagPanel.Instance.toggleDisplay(true);
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();
        const sqlNode = graph.getNode(nodeId);
        if (sqlNode == null || !(sqlNode instanceof DagNodeSQL)) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<DagNode[]> = PromiseHelper.deferred();
        let subGraph = sqlNode.getSubGraph();
        let promise = PromiseHelper.resolve();

        if (!subGraph) {
            const params: DagNodeSQLInputStruct = sqlNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const queryId = xcHelper.randName("sql", 8);
            promise = sqlNode.compileSQL(params.sqlQueryStr, queryId);
        }
        promise
            .then(() => {
                subGraph = sqlNode.getSubGraph();
                subGraph.setTabId(tabId);
                let subGraphNodes = subGraph.getAllNodes();
                sqlNode.getOutputNodes().forEach(node => {
                    if (node) {
                        subGraph.removeNode(node.getId(), false, false);
                    }
                });

                const dagView = DagViewManager.Instance.getDagViewById(tabId);

                // add the sub graph nodes to the graph
                const nodesArray: DagNode[] = [];
                subGraphNodes.forEach(node => {
                    graph.addNode(node);
                    nodesArray.push(node);
                    if (node instanceof DagNodeIMDTable) {
                        node.fetchAndSetSubgraph(node.getParam().source);
                    }
                });

                // auto align the sub graph nodes
                let positionInfos = DagView.getAutoAlignPositions(subGraph).nodeInfos;

                let upperLeftMostNode = null;
                let minXCoor: number = 0;
                let minYCoor: number = 0;

                positionInfos.forEach((nodeInfo, i) => {
                    const coors = nodeInfo.position;
                    if (i === 0) {
                        minXCoor = coors.x;
                        minYCoor = coors.y;
                    }
                    minYCoor = Math.min(coors.y, minYCoor);
                    if (coors.y === minYCoor) {
                        minXCoor = Math.min(coors.x, minXCoor);
                        if (coors.x === minXCoor) {
                            upperLeftMostNode = nodeInfo;
                        }
                    }
                });
                if (positionInfos.length) {
                        // move the sub graph nodes where there's open space
                    const nextAvailablePosition = dagView._getNextAvailablePosition(null,
                        upperLeftMostNode.position.x, upperLeftMostNode.position.y, {vertSpacing: 80});

                    let xDelta = nextAvailablePosition.x - upperLeftMostNode.position.x;
                    let yDelta = nextAvailablePosition.y - upperLeftMostNode.position.y;

                    for (const posInfo of positionInfos) {
                        posInfo.position.x += xDelta;
                        posInfo.position.y += yDelta;
                        subGraph.getNode(posInfo.id).setPosition(posInfo.position);
                    }
                }

                // draw the nodes
                let $svg = dagView.$dfArea.find(".operatorSvg").remove();
                subGraphNodes.forEach(node => {
                    dagView._addNodeNoPersist(node, {
                        isNoLog: true,
                        $svg: $svg,
                        notSelected: true
                    });
                });
                dagView.$dfArea.find(".edgeSvg").after($svg);

                // draw the edges
                $svg = dagView.$dfArea.find(".edgeSvg").remove();
                const svg = d3.select($svg[0]);
                subGraphNodes.forEach((node: DagNode, nodeId: DagNodeId) => {
                    node.getParents().forEach((parentNode, index) => {
                        const parentId: DagNodeId = parentNode.getId();
                        dagView._drawConnection(parentId, nodeId, index, node.canHaveMultiParents(), svg, false, true);
                    });
                });
                dagView.$dfArea.find(".operatorSvg").before($svg);

                DagGraphBar.Instance.updateNumNodes(dagTab);
                dagView.deselectNodes();
                deferred.resolve(nodesArray);
            })
            .fail(deferred.reject);
        return deferred.promise();
    }

     /**
     * Expand the SQL node into a sub graph in place for editing purpose
     * @param nodeId
     */
    public expandSQLNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = this.graph.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeSQL) {
            return this.expandSQLNodeInTab(dagNode);
        } else {
            return PromiseHelper.reject(`${nodeId} is not a SQL operator`);
        }
    }

      /**
     * DagView.expandSQLNodeInTab
     */
    public expandSQLNodeInTab(
        sqlNode: DagNodeSQL,
        rawXcQuery: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let promise = PromiseHelper.resolve();
        let subGraph = sqlNode.getSubGraph();
        if (!subGraph) {
            const params: DagNodeSQLInputStruct = sqlNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const queryId = xcHelper.randName("sql", 8);
            promise = sqlNode.compileSQL(params.sqlQueryStr, queryId);
        }
        promise
            .then(() => {
                if (rawXcQuery) {
                    // give the partially optimized subgraph
                    sqlNode.updateSubGraph(null, true);
                }
                return this._expandSubgraphNode({
                    containerNode: sqlNode,
                    logTitle: SQLTStr.ExpandSQLOperation,
                    getInputParent: (node) => sqlNode.getInputParent(node),
                    isInputNode: (node) => (node instanceof DagNodeSQLSubInput),
                    isOutputNode: (node) => (node instanceof DagNodeSQLSubOutput),
                    preExpand: () => {
                    },
                    isPreAutoAlign: true
                });
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                if (rawXcQuery) {
                    // restore the fully optimized subgraph
                    sqlNode.updateSubGraph(null, false);
                }
            });

        return deferred.promise();
    }

    /**
     * Change the zoom level (scale) of the active graph
     * @param isZoomIn
     * @description
     * 1. find the next zoom level
     * 2. store the change in scale
     * 3. set the scale in graph
     * 4. adjust dataflowAreaWrapper min-height and min-width
     * 5. adjust scrollbar
     */
    public zoom(isZoomIn: boolean, newScale?: number): void {
        const prevScale: number = this.graph.getScale();
        let scaleIndex: number = DagView.zoomLevels.indexOf(prevScale);
        let scale: number;
        if (scaleIndex == -1 && newScale == null) {
            for (let i = 0; i < DagView.zoomLevels.length; i++) {
                if (DagView.zoomLevels[i] > prevScale) {
                    if (isZoomIn) {
                        scaleIndex = i
                    } else {
                        scaleIndex = i-1;
                    }
                    break;
                }
            }
        }
        else if (isZoomIn) {
            scaleIndex++;
        } else {
            scaleIndex--;
        }

        if (newScale != null) {
            scale = newScale;
        }
        else if (scaleIndex < 0 || scaleIndex >= DagView.zoomLevels.length) {
            return;
        } else {
            scale = DagView.zoomLevels[scaleIndex];
        }

        this.graph.setScale(scale);
        const deltaScale: number = scale / prevScale;
        const $dfAreaWrap: JQuery = this.$dfArea.find(".dataflowAreaWrapper");
        const prevScrollTop: number = this.$dfArea.scrollTop();
        const prevScrollLeft: number = this.$dfArea.scrollLeft();
        const prevMidHeight: number = this.$dfArea.height() / 2;
        const prevMidWidth: number = this.$dfArea.width() / 2;

        $dfAreaWrap.children().css("transform", "scale(" + scale + ")");
        const dimensions = this.graph.getDimensions();
        if (dimensions.width > -1) {
            $dfAreaWrap.css("min-width", dimensions.width * scale);
            $dfAreaWrap.css("min-height", dimensions.height * scale);
        }
        $dfAreaWrap.css("background-size", DagView.gridLineSize * scale);
        // do not adjust scrolltop or scrollLeft if at 0
        if (this.$dfArea.scrollTop()) {
            const midHeight = this.$dfArea.height() / 2;
            const scrollTop = deltaScale * (prevScrollTop + prevMidHeight) -
                midHeight;
                this.$dfArea.scrollTop(scrollTop);
        }
        if (this.$dfArea.scrollLeft()) {
            const midWidth = this.$dfArea.width() / 2;
            const scrollLeft = deltaScale * (prevScrollLeft + prevMidWidth) -
                midWidth;
                this.$dfArea.scrollLeft(scrollLeft);
        }
        this.graph.getAllNodes().forEach((node) => {
            const nodeInfo = {
                position: node.getPosition()
            };
            this._repositionProgressTooltip(nodeInfo, node.getId());
        });
    }

     /**
     * Check if modification to graph/nodes should be disabled, Ex. it's showing the subGraph of a customNode
     */
    public isDisableActions(showAlert: boolean = false): boolean {
        if (showAlert && this.dagTab instanceof DagTabExecuteOnly) {
            this.dagTab.viewOnlyAlert();
        } else if (showAlert && this.dagTab instanceof DagTabUser && !this.dagTab.isEditable()) {
            // when it's inside an app, not editable
            DagTabUser.viewOnlyAlert(this.dagTab);
        }
        return (
                !this.dagTab.isEditable() ||
                (this.$dfArea && this.$dfArea.hasClass("largeHidden"))
            );
    }

    public isViewOnly(): boolean {
        return this.$dfArea.hasClass("viewOnly");
    }

    public isProgressGraph(): boolean {
        return this.$dfArea.hasClass("progressGraph");
    }

    public isLocked(): boolean {
        return this.$dfArea.hasClass("locked");
    }

    public updateOperationTime(isCurrent: boolean = false): void {
        if (!this.isFocused()) {
            return;
        }

        const timeStr: string = this._getOperationTime();
        let text: string = "";
        if (timeStr != null) {
            let title: string = CommonTxtTstr.LastOperationTime;
            if (isCurrent || this.graph.getExecutor() != null) {
                title = CommonTxtTstr.OperationTime;
            }
            text = title + ": " + timeStr;
        }
        StatusMessage.updateLocation(true, text); // update operation time
    }

    // for tooltip above the operator node - shows time and %
    private _addOperatorProgressTooltip(nodeId: DagNodeId, pct?: number, step?: number, times?: number[], state?: any, noPct?: boolean): void {
        const node: DagNode = this.graph.getNode(nodeId);
        if (!node) return;
        if (node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput ||
            node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput ||
            node instanceof DagNodePublishIMD
        ) {
            return;
        }
        if (node.isHidden()) {
            return;
        }

        this.updateOperationTime(true);
        this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]').remove();
        this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
        let tip: HTML = this._nodeProgressTemplate(this.graph, node, times, state, pct, step, noPct);

        const $tip = $(tip);
        this.$dfArea.append($tip);
        this._showRunningNode($tip);
    }

    /**
     * DagView.removeProgress
     * @param nodeId
     */
    public removeProgressPct(nodeId: DagNodeId): void {
        const $operatorStats = this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]');
        $operatorStats.find(".progress").remove();
    }

      /**
     * _updateNodeProgress
     * @param dagNode
     * @param tabId
     * @param progress
     * @param skewInfos
     * @param timeStrs
     * @param broadcast
     */
    private _updateNodeProgress(
        node: DagNode,
        tabId: string,
        stats: any,
        skewInfos?: any[],
        times?: number[]
    ): void {
        if (!stats.started || !node) {
            return;
        }
        let pct: number = (stats.state === DgDagStateT.DgDagStateReady) ? 100 : stats.curStepPct;
        let step = (stats.curStep > 1) ? stats.curStep : null;// do not show step if on step 1

        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        let nodeId: string = node.getId();
        const graph = dagTab.getGraph();


        const noPct = (node.getState() === DagNodeState.Complete ||
                        node.getState() === DagNodeState.Error);

        // for the tooltip above the operator node icon
        this._addOperatorProgressTooltip(nodeId, pct, step, times, stats.state, noPct);

        if (!skewInfos) {
            return;
        }

        this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
        this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
        if (dagTab == null) {
            // sql graph may not have tab registered with dagTabManager
            return;
        }

        this._addTableTooltip(graph, node, this.$dfArea, skewInfos, stats.state);

        if (stats.state !== DgDagStateT.DgDagStateReady) {
            return;
        }
        const totalTime: number = times.reduce((a, b) => a + b, 0);
        let shouldUpdate: boolean = false;
        if (node instanceof DagNodeCustom) {
            // custom node need to update till all is done
            let subNodeCnt: number = 0;
            node.getSubGraph().getAllNodes().forEach((node) => {
                if (!(node instanceof DagNodeCustomInput) &&
                    !(node instanceof DagNodeCustomOutput)
                ) {
                    subNodeCnt++;
                }
            });
            if (subNodeCnt === times.length) {
                shouldUpdate = true;
            }
        } else {
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            graph.updateOperationTime(totalTime);
            const dagView: DagView = DagViewManager.Instance.getDagViewById(tabId);
            if (dagView) {
                dagView.updateOperationTime(true);
            }
        }
    }

    // for dataset activation
    public updateDatasetProgress(
        stats: {elapsedTime: number, progress: number, dsName: string, finished?: boolean},
        nodeId: DagNodeId): void {

        let node: DagNode = this.graph.getNode(nodeId);
        if (!node) return;
        if (stats.finished || node.getState() !== DagNodeState.Running) {
            this.$dfArea.find('.datasetActivateTip[data-id="' + nodeId + '"]').remove();
            return;
        }
        let nodeY = node.getPosition().y;
        let nodeX = node.getPosition().x + 5;
        const scale = this.graph.getScale();
        const rowHeight = 10;
        const tooltipPadding = 5;
        const tooltipMargin = 5;
        const y = Math.max(1, (scale * nodeY) - (rowHeight * 2 + tooltipPadding + tooltipMargin));
        const left = scale * nodeX;
        this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
        this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
        let html = `<div data-id="${nodeId}" class="runStats dagTableTip datasetActivateTip"
                style="left:${left}px;top:${y}px;">
                <table>
                 <thead>
                    <th colspan="2">Recreating Dataset</th>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="dsName">${stats.dsName}</div>
                        </td>
                        <td>${Math.floor(stats.progress)}%</td>
                    </tr>
                </tbody>
                </table>
            </div>`;
        this.$dfArea.append(html);
    }

    private _activatingTable(node: DagNode) {
        const nodeId: DagNodeId = node.getId();
        const pos = node.getPosition();
        const nodeX: number = pos.x;
        const nodeY: number = pos.y;
        const tooltipMargin = 6;
        const tooltipPadding = 2;
        const rowHeight = 10;
        const scale = this.graph.getScale();
        const nodeCenter = scale * (nodeX + (DagView.nodeWidth / 2));
        const left = nodeCenter - (84 / 2);
        const y = Math.max(1, (scale * nodeY) - (rowHeight * 2 + tooltipPadding + tooltipMargin));
        let html = `<div data-id="${nodeId}" class="activatingTableTip dagTableTip" style="left:${left}px;top:${y}px;">
                ${xcUIHelper.getLoadingSectionHTML("Recreating Table", "ellipsisSpace")}
            </div>`;
         this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
        const $tip = $(html);
        this.$dfArea.append($tip);
    }

    private _doneActivatingTable(nodeId: string) {
        this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
    }

    public focus(): void {
        this._isFocused = true;
        this.schemaPopups.forEach(schemaPopup => {
            schemaPopup.show();
        });
    }

    public unfocus(): void {
        this._isFocused = false;
        this.schemaPopups.forEach(schemaPopup => {
            schemaPopup.hide();
        });
    }

    public isFocused(): boolean {
        return this._isFocused;
    }

    public close(): void {
        this.schemaPopups.forEach(schemaPopup => {
            schemaPopup.remove();
        });
    }

    public getSchemaPopup(id: DagNodeId, fromTable: boolean): DagSchemaPopup {
        return this.schemaPopups.get(id + fromTable);
    }

    public getGraph(): DagGraph {
        return this.graph;
    }

    public getTab(): DagTab {
        return this.dagTab;
    }

    public resetColumnDeltas(nodeId: DagNodeId): void {
        const node: DagNode = this.graph.getNode(nodeId);
        node.resetColumnDeltas();
        let tableViewerNode: DagNode = DagTable.Instance.getBindNode();
        if (tableViewerNode && tableViewerNode.getId() === nodeId) {
            DagTable.Instance.refreshTable();
        }
    }

    public resetColumnOrdering(nodeId: DagNodeId): void {
        const node: DagNode = this.graph.getNode(nodeId);
        node.resetColumnOrdering();
        let tableViewerNode: DagNode = DagTable.Instance.getBindNode();
        if (tableViewerNode && tableViewerNode.getId() === nodeId) {
            DagTable.Instance.refreshTable();
        }
    }

    public addSchemaPopup(schemaPopup: DagSchemaPopup, fromTable: boolean = false): void {
        this.schemaPopups.set(schemaPopup.getId() + fromTable, schemaPopup);
    }

    public removeSchemaPopup(id: DagNodeId, fromTable: boolean = false): void {
        this.schemaPopups.delete(id + fromTable);
    }

    private _getOperationTime(): string {
        const time: number = this.graph.getOperationTime();
        if (time === 0) {
            return null;
        } else {
            return xcTimeHelper.getElapsedTimeStr(time);
        }
    }

    // for the tooltip above the table icon
    private _addTableTooltip(
        graph: DagGraph,
        node: DagNode,
        $dfArea: JQuery,
        skewInfos: any[],
        state: DgDagStateT
    ): void {
        if (node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput ||
            node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput ||
            node instanceof DagNodePublishIMD ||
            node instanceof DagNodeExport ||
            node instanceof DagNodeDFOut
        ) {
            return;
        }
        if (node.isHidden()) {
            return;
        }
        if (node instanceof DagNodeModule && !this._shouldShowModuleTableIcon(node)) {
            return;
        }

        let tip: HTML = this._tableInfoTooltipTemplate(graph, node, skewInfos, state);
        const $tip = $(tip);
        $dfArea.append($tip);
        let maxSkew: number = 0;
        let skewData = {};
        skewInfos.forEach((skewInfo, i) => {
            const skew: number = skewInfo.value;
            if (i === 0 || !(skew == null || isNaN(skew))) {
                if (i === 0 || skew >= maxSkew) {
                    if (!(skew == null || isNaN(skew))) {
                        maxSkew = skew;
                    }
                    skewData = {
                        rows: skewInfo.rows,
                        totalRows: skewInfo.totalRows,
                        size: skewInfo.size,
                        skewValue: skewInfo.value,
                        skewColor: skewInfo.color,
                        tableName: skewInfo.name
                    };
                }
            }
        });
        $tip.data("skewinfo", skewData);
    }

    // for both tooltips above the operator and table icons
    private _addProgressTooltips(
        node: DagNode
    ): void {
        try {
            const nodeStats = node.getIndividualStats();
            const overallStats = node.getOverallStats();
            if (nodeStats.length) {
                const skewInfos = [];
                const times: number[] = [];
                nodeStats.forEach((nodeStat) => {
                    if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                        const skewInfo = DagView._getSkewInfo(nodeStat.name, nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                        skewInfos.push(skewInfo);
                    }
                    if (nodeStat.elapsedTime != null) {
                        times.push(nodeStat.elapsedTime);
                    }
                });
                this._addTableTooltip(this.graph, node, this.$dfArea, skewInfos, overallStats.state);
                this._addOperatorProgressTooltip(node.getId(), null, null, times, overallStats.state, true);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _nodeProgressTemplate(
        graph: DagGraph,
        node: DagNode,
        times: number[],
        state: DgDagStateT,
        pct: number,
        step: number,
        noPct: boolean
    ): HTML {
        const nodeId: DagNodeId = node.getId();
        const pos = node.getPosition();
        const nodeX: number = pos.x;
        const nodeY: number = pos.y;
        const tooltipMargin = 11;
        const tooltipPadding = 2;
        let rowHeight = 10;
        if (!noPct) {
            rowHeight = 20;
        }
        const scale = graph.getScale();
        const y = Math.max(1, (scale * nodeY) - (rowHeight + tooltipPadding + tooltipMargin));
        let totalTime: number;
        if (times && times.length) {
            totalTime = times.reduce((total, num) => {
                return total + num;
            });
        } else {
            totalTime = 0;
        }

        let progressDiv = "";
        let progressText = "";
        if (noPct) {
            progressDiv = "";
        } else {
            if (pct != null) {
                let pctText = pct + "%";
                if (step != null) {
                    progressText = "Step " + step + " " + pctText;
                } else {
                    progressText = pctText;
                }
            } else {
                progressText = "0%";
            }
            progressDiv = `<div class="progress">${progressText}</div>`;
        }
        const totalTimeStr = "Time: " + xcTimeHelper.getElapsedTimeStr(totalTime);
        let stateClass: string = DgDagStateTStr[state];
        const left: number = this._getProgressTooltipLeftPosition(totalTimeStr, graph, nodeX, progressText);

        let html = `<div data-id="${nodeId}" class="nodeStats dagTableTip ${stateClass}" style="left:${left}px;top:${y}px;">
                        <div class="time">${totalTimeStr}</div>
                        ${progressDiv}
                    </div>`;

        return html;
    }

    private _tableInfoTooltipTemplate(
        graph: DagGraph,
        node: DagNode,
        skewInfos: any[],
        state: DgDagStateT
    ): HTML {
        const nodeId: DagNodeId = node.getId();
        const pos = node.getPosition();
        const nodeX: number = pos.x;
        const nodeY: number = pos.y;
        const tooltipMargin = 6;
        const tooltipPadding = 2;
        const rowHeight = 10;
        const scale = graph.getScale();
        const y = Math.max(1, (scale * nodeY) - (rowHeight * 2 + tooltipPadding + tooltipMargin));

        let hasSkewValue: boolean = false;
        let maxSkew: number | string = 0;
        skewInfos.forEach((skewInfo) => {
            const skew: number = skewInfo.value;
            if (!(skew == null || isNaN(skew))) {
                hasSkewValue = true;
                maxSkew = Math.max(skew, <number>maxSkew);
            }
        });
        if (!hasSkewValue) {
            maxSkew = "N/A";
        } else {
            maxSkew = String(maxSkew);
        }
        let skewColor: string = DagView.getSkewColor(maxSkew);
        let colorStyle = "";
        if (skewColor) {
            colorStyle = "color:" + skewColor;
        }
        let skewRows: string = "N/A";
        if (skewInfos.length) {
            skewRows = xcStringHelper.numToStr(skewInfos[skewInfos.length - 1].totalRows);
        }

        let stateClass: string = DgDagStateTStr[state];
        let skewClass: string = "";
        if (skewRows === "N/A") {
            skewClass = "skewUnavailable";
        }
        const left: number = this._getTableTooltipLeftPosition(skewRows, graph, nodeX);
        let html = `<div data-left="${left}" data-id="${nodeId}" class="runStats dagTableTip ${stateClass}" style="left:${left}px;top:${y}px;">`;
        html += `<table>
                 <thead>
                    <th>Rows</th>
                    <th class="skewTh ${skewClass}">Skew</th>
                </thead>
                <tbody>
                    <tr>
                        <td class="rows">${skewRows}</td>
                        <td class="skewTd ${skewClass}" ><span class="value" style="${colorStyle}">${maxSkew}</span></td>
                    </tr>
                </tbody>
                </table>
            </div>`;

        return html;
    }


      // we're estimating the width of the tooltip because calculating
    // the exact width is too slow
    private _getProgressTooltipLeftPosition(
        totalTimeStr: string,
        graph: DagGraph,
        nodeX: number,
        progressText: string
    ): number {
        let outerPadding = 3;
        let baseWidth = outerPadding * 2;
        let topRowWidth = totalTimeStr.length * 4.8;
        let bottomRowWidth = progressText.length * 4.8;
        let rowWidth = Math.max(topRowWidth, bottomRowWidth);
        let width = rowWidth + baseWidth;
        const nodeCenter = graph.getScale() * (nodeX + (DagView.nodeWidth / 2));
        return nodeCenter - (width / 2);
    }

    // we're estimating the width of the tooltip because calculating
    // the exact width is too slow
    private _getTableTooltipLeftPosition(
        numRows: string,
        graph: DagGraph,
        nodeX: number
    ): number {
        let cellPadding = 2;
        let numCells = 2;
        let outerPadding = 2;
        let baseWidth = (cellPadding * 2) * numCells + (outerPadding * 2);
        let rowHeadingWidth = 23;
        let firstColWidth = Math.max(numRows.length * 4.5, rowHeadingWidth);
        let secondColWidth = 23;
        let width = firstColWidth + secondColWidth + baseWidth;
        const nodeCenter = graph.getScale() * (nodeX + DagView.nodeAndTableWidth - 19);
        return nodeCenter - (width / 2);
    }

    private _repositionProgressTooltip(nodeInfo, nodeId: DagNodeId): void {
        const $tableStats = this.$dfArea.find('.runStats[data-id="' + nodeId + '"]');
        if ($tableStats.length) {
            $tableStats.addClass("visible"); // in case we can't get the dimensions
            // because user is hiding tips by default
            const infoRect = $tableStats[0].getBoundingClientRect();
            let width: number;
            if (infoRect.width === 0) {
                let cellPadding = 2;
                let numCells = 2;
                let outerPadding = 2;
                let baseWidth = (cellPadding * 2) * numCells + (outerPadding * 2);
                let rowHeadingWidth = 23;
                let firstColWidth = Math.max($tableStats.find(".rows").text().length * 4.5, rowHeadingWidth);
                let secondColWidth = 23;
                width = firstColWidth + secondColWidth + baseWidth;
            } else {
                width = infoRect.width;
            }
            const rectWidth = Math.max(width, 60); // width can be 0 if tab is not visible
            const rectHeight = Math.max(infoRect.height, 25);
            const scale = this.graph.getScale();
            // const nodeCenter = nodeInfo.position.x + 1 + (DagView.nodeAndTableWidth - 12);
            const nodeCenter = nodeInfo.position.x + (DagView.nodeAndTableWidth - 18);
            $tableStats.css({
                left: scale * nodeCenter - (rectWidth / 2),
                top: Math.max(1, (scale * nodeInfo.position.y) - (rectHeight + 2))
            });
            $tableStats.removeClass("visible");
        }
        const $operatorStats = this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]');
        if ($operatorStats.length) {
            $operatorStats.addClass("visible"); // in case we can't get the dimensions
            // because user is hiding tips by default
            const infoRect = $operatorStats[0].getBoundingClientRect();
            const rectWidth = Math.max(infoRect.width, 50); // width can be 0 if tab is not visible
            const rectHeight = Math.max(infoRect.height, 14);
            const scale = this.graph.getScale();
            const nodeCenter = nodeInfo.position.x + 1 + (DagView.nodeWidth / 2);
            $operatorStats.css({
                left: scale * nodeCenter - (rectWidth / 2),
                top: Math.max(1, (scale * nodeInfo.position.y) - (rectHeight + 5))
            });
            $operatorStats.removeClass("visible");
        }
    }

    // always resolves
    private _removeNodesNoPersist(
        nodeIds: DagNodeId[],
        options?: {
            isSwitchState?: boolean,
            isNoLog?: boolean,
            clearMeta?: boolean
        }
    ): XDPromise<{
        logParam: LogParam,
        hasLinkOut: boolean,
        spliceInfos: {[nodeId: string]: {[childNodeId: string]: boolean[]}}
    }> {
        const { isSwitchState = true, isNoLog = false, clearMeta = true} = options || {};
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        if (!nodeIds.length) {
            return PromiseHelper.resolve();
        }
        let aggregates: string[] = [];
        const dagNodeIds: DagNodeId[] = [];
        const commentNodeIds: CommentNodeId[] = [];
        const allIdentifiers = {};
        const spliceInfos = {};
        const removedNodeIds: string[] = [];
        const self = this;
        nodeIds.forEach((nodeId) => {
            if (!nodeId.startsWith("comment")) {
                dagNodeIds.push(nodeId);
            } else {
                commentNodeIds.push(nodeId);
            }
        });

        let hasLinkOut: boolean = false;
        // XXX TODO: check the slowness and fix the performance
        if (isSwitchState) {
            // isSwitchState is a flag indicating the caller is handling the state switch explicitly
            // In some cases(such as creating custom node), extra nodes need to be involved in bulkStateSwitch,
            // and special requirements need to be implemented(such as maintaining running state for custom node)
            // so make this optional
            this.graph.turnOnBulkStateSwitch();
        }
        nodeIds.forEach((nodeId) => {
            if (!nodeId.startsWith("comment")) {
                // Remove tabs for custom OP
                const dagNode = this.graph.getNode(nodeId);
                if (dagNode == null) {
                    return;
                }
                if (dagNode instanceof DagNodeCustom ||
                    dagNode instanceof DagNodeSQL
                ) {
                    DagTabManager.Instance.removeTabByNode(dagNode);
                } else if (dagNode instanceof DagNodeAggregate) {
                    let input: DagNodeAggregateInputStruct = dagNode.getParam();
                    if (input.dest != null) {
                        let aggName = dagNode.getAggName();
                        if (DagAggManager.Instance.hasAggregate(aggName)) {
                            let agg = DagAggManager.Instance.getAgg(aggName);
                            if (agg.graph === this.graph.getTabId()) {
                                aggregates.push(aggName);
                            }
                        }
                    }
                }
                dagNodeIds.push(nodeId);
                const childrenNodes = dagNode.getChildren();
                childrenNodes.forEach((childNode) => {
                    allIdentifiers[childNode.getId()] = childNode.getIdentifiers();
                });
                const spliceInfo = this.graph.removeNode(nodeId, isSwitchState, clearMeta);
                const $node = this._getNode(nodeId);
                if ($node.data("type") === DagNodeType.DFOut) {
                    hasLinkOut = true;
                }
                $node.remove();
                let schemaPopup: DagSchemaPopup = this.schemaPopups.get(nodeId + "false");
                if (schemaPopup) {
                    schemaPopup.remove();
                }
                schemaPopup = this.schemaPopups.get(nodeId + "true");
                if (schemaPopup) {
                    schemaPopup.remove();
                }
                this.removeSchemaPopup(nodeId, false);
                this.removeSchemaPopup(nodeId, true);
                this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
                this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]').remove();
                this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
                this.$dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                this.$dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                    const childNodeId = $(this).attr("data-childnodeid");
                    self._removeConnection($(this), childNodeId);
                });
                spliceInfos[nodeId] = spliceInfo;
                if (DagNodeInfoPanel.Instance.getActiveNode() &&
                    DagNodeInfoPanel.Instance.getActiveNode().getId() === nodeId) {
                    DagNodeInfoPanel.Instance.hide();
                }
                if (DagUDFErrorModal.Instance.getNode() === dagNode) {
                    DagUDFErrorModal.Instance.close();
                }
            } else {
                this.graph.removeComment(nodeId);
                DagComment.Instance.removeComment(nodeId);
            }
            removedNodeIds.push(nodeId);
        });
        if (isSwitchState) {
            this.graph.turnOffBulkStateSwitch();
        }
        DagAggManager.Instance.bulkNodeRemoval(aggregates);

        const logParam: LogParam = {
            title: SQLTStr.RemoveOperations,
            options: {
                "operation": SQLOps.RemoveOperations,
                "dataflowId": this.tabId,
                "nodeIds": removedNodeIds,
                "spliceInfo": spliceInfos,
                "identifiers": allIdentifiers
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }
        deferred.resolve({
            logParam: logParam,
            hasLinkOut: hasLinkOut,
            spliceInfos: spliceInfos
        });
        return deferred.promise();
    }


      /**
     * @description
     * listens events for 1 dag graph. This function is called for each dag graph.
     * Make sure all events listening are also registered in cleanupClosedTab !!!
     */
    private _setupGraphEvents(): void {
        // when a graph gets locked during execution
        this._registerGraphEvent(this.graph, DagGraphEvents.LockChange, (info) => {
            this.lockUnlockHelper(info);
            DagGraphBar.Instance.setState(this.dagTab); // refresh the stop button status
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.StateChange, (info) => {
            this.updateNodeState(info);
            const $node: JQuery = this.getNodeElById(info.node.getId());
            this._updateTableNameText($node, info.node);
            DagNodeInfoPanel.Instance.update(info.id, "stats");
            if (info.state !== DagNodeState.Running) {
                const isDelay: boolean = (info.oldState === DagNodeState.Running &&
                                          info.state === DagNodeState.Complete);
                this.dagTab.save(isDelay);
                this.removeProgressPct(info.id);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ConnectionChange, (info) => {
            if (info.descendents.length) {
                // XXX TODO only update if nodes involved in form are affected
                FormHelper.updateColumns(info);
            }
            if (info.addInfo) {
                this._onAddConnection(info.addInfo);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ParamChange, (info) => {
            const $node: JQuery = this._getNode(info.id);

            if (info.node.getParam().icv) {
                $node.addClass("icv");
            } else {
                $node.removeClass("icv");
            }
            this._drawTitleText($node, info.node);
            this._setParameterIcon($node, info.node);
            if (info.node instanceof DagNodeDFOut) {
                this.checkLinkInNodeValidation();
            }
            DagNodeInfoPanel.Instance.update(info.id, "params");
            this.$dfArea.find('.runStats[data-id="' + info.id + '"]').remove();
            this.$dfArea.find('.nodeStats[data-id="' + info.id + '"]').remove();
            this.$dfArea.find('.activatingTableTip[data-id="' + info.id + '"]').remove();

            this.dagTab.save();

            if (!info.noAutoExecute) {
                this._autoExecute(info.node);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.AutoExecute, (info) => {
            this._autoExecute(info.node);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.LineageSourceChange, (info) => {
            this.dagTab.save();

            if (DagTable.Instance.isTableFromTab(this.tabId)) {
                const node: DagNode = info.node;
                const set = this.graph.traverseGetChildren(node);
                set.add(node);

                const bindNodeId: DagNodeId = DagTable.Instance.getBindNodeId();
                let nodeInPreview: DagNode = null;
                set.forEach((dagNode) => {
                    dagNode.getLineage().reset(); // reset all columns' lineage
                    if (dagNode.getId() === bindNodeId) {
                        nodeInPreview = dagNode;
                    }
                });
                // XXX TODO use better way to refresh the viewer
                if (nodeInPreview != null) {
                    DagTable.Instance.close();
                    DagViewManager.Instance.viewResult(nodeInPreview);
                }
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.LineageChange, (info) => {
            this.dagTab.save();
            this._columnChange(info);
            DagNodeInfoPanel.Instance.update(info.node.getId(), "columnChange");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.AggregateChange, (info) => {
            this._editAggregates(info.id, info.aggregates);
            DagNodeInfoPanel.Instance.update(info.id, "aggregates");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.PreTablePin, (info) => {
            this.lockNode(info.id);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.PreTableUnpin, (info) => {
            this.lockNode(info.id);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.PostTablePin, (info) => {
            this.unlockNode(info.id);
            if (!info.error) {
                this._editTableLock(this._getNode(info.id), true);
            } else {
                Alert.error("Pin table failed", info.error);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.PostTableUnpin, (info) => {
            this.unlockNode(info.id);
            if (!info.error) {
                this._editTableLock(this._getNode(info.id), false);
            } else {
                Alert.error("Unpin table failed", info.error);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.TableRemove, (info) => {
            // table deletion occurs in DagGraph.ts
            const nodeId: DagNodeId = info.nodeId;
            if (DagTable.Instance.getBindNodeId() === nodeId) {
                DagTable.Instance.close();
                TableTabManager.Instance.refreshTab();
            }
            const $node: JQuery = this.getNodeElById(nodeId);
            this._updateTableNameText($node, info.node);
            DagNodeInfoPanel.Instance.update(nodeId, "params");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ResultSetChange, (info) => {
            const nodeId: DagNodeId = info.nodeId;
            const $node: JQuery = this.getNodeElById(nodeId);
            this._updateTableNameText($node, info.node);
            DagNodeInfoPanel.Instance.update(nodeId, "params");
        });

        // XXX deprecated
        this._registerGraphEvent(this.graph, DagNodeEvents.RetinaRemove, (info) => {
            const retinaName: string = DagTabOptimized.getId_deprecated(this.tabId, info.nodeId);
            XcalarDeleteRetina(retinaName)
            .then(() => {
                // remove optimized dataflow tab if opened
                DagTabManager.Instance.removeTab(retinaName);
                let tableName: string = DagTabOptimized.getOutputTableName(retinaName);
                DagUtil.deleteTable(tableName);
            })
            .fail((error) => {
                // most likely failed due to connectionMeta reset being called
                // twice -- first call deletes, 2nd call produces an error
                console.error(error);
            });
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.TitleChange, (info) => {
            // update table preview if node's title changes
            if (DagTable.Instance.isTableFromTab(this.tabId)) {
                const tableId = DagTable.Instance.getBindNodeId();
                if (tableId === this.tabId) {
                    DagTable.Instance.updateTableName(info.tabId);
                }
            }
            DagNodeInfoPanel.Instance.update(info.id, "title");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.HeadChange, (info) => {
            info.nodes.forEach((node) => {
                const $node: JQuery = this._getNode(node.getId());
                this._drawHeadText($node, node);
            });
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.DescriptionChange, (info) => {
            const $node: JQuery = this._getNode(info.id);
            DagView.removeNodeIcon($node, "descriptionIcon");
            if (info.text.length) {
                $node.addClass("hasDescription");
                DagView.addNodeIcon($node, "descriptionIcon", info.text);
            } else {
                $node.removeClass("hasDescription");
            }
            DagNodeInfoPanel.Instance.update(info.id, "description");
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.TurnOffSave, (_info) => {
            this.dagTab.turnOffSave();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.TurnOnSave, (_info) => {
            this.dagTab.turnOnSave();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.Save, (_info) => {
            this.dagTab.save();
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.AddSQLFuncInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                this.dagTab.addInput(info.node);
            }
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.RemoveSQLFucInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = this.dagTab.removeInput(info.order);
                this._updateTitleForNodes(changedNodes);
            }
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.AddBackSQLFuncInput, (info) => {
            if (this.dagTab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = this.dagTab.addBackInput(info.order);
                this._updateTitleForNodes(changedNodes);
            }
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.StartSQLCompile,(_info) => {
            this._toggleCompileLock(true);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.EndSQLCompile, (_info) => {
            this._toggleCompileLock(false);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ProgressChange, (info) => {
            this._addProgressTooltips(info.node);
            DagNodeInfoPanel.Instance.update(info.node.getId(), "stats");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.UDFErrorChange, (info) => {
            const node: DagNode = info.node;
            const $node: JQuery = this._getNode(node.getId());
             if (node instanceof DagNodeSQL) {
                let udfErrors = node.getUDFErrors();
                if (Object.keys(udfErrors).length) {
                    this._updateNodeUDFErrorIcon($node, node);
                } else {
                    this._removeNodeUDFErrorIcon($node);
                }
            } else {
                if (node.hasUDFError()) {
                    this._updateNodeUDFErrorIcon($node, node);
                } else {
                    this._removeNodeUDFErrorIcon($node);
                    if (DagUDFErrorModal.Instance.getNode() === node) {
                        DagUDFErrorModal.Instance.close();
                    }
                }
            }
            this.dagTab.save();
        });

        let updateNumNodesTimeout;
        this._registerGraphEvent(this.graph, DagGraphEvents.NewNode, (info) => {
            clearTimeout(updateNumNodesTimeout);
            updateNumNodesTimeout = setTimeout(() => {
                DagGraphBar.Instance.updateNumNodes(this.dagTab);
            }, 0);
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.RemoveNode, (info) => {
            clearTimeout(updateNumNodesTimeout);
            updateNumNodesTimeout = setTimeout(() => {
                DagGraphBar.Instance.updateNumNodes(this.dagTab);
            }, 0);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.Hide, (info) => {
            const $node = this._getNode(info.nodeId);
            $node.remove();
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.UpdateProgress, (info) => {
            const times: number[] = [];
            const skewInfos = [];
            info.nodeStats.forEach((nodeStat) => {
                if (nodeStat.type !== XcalarApisT.XcalarApiDeleteObjects) {
                    const skewInfo = DagView._getSkewInfo(nodeStat.name,
                                                            nodeStat.rows,
                                                            nodeStat.skewValue,
                                                            nodeStat.numRowsTotal,
                                                            nodeStat.size);
                    skewInfos.push(skewInfo);
                }
                if (nodeStat.elapsedTime != null) {
                    times.push(nodeStat.elapsedTime);
                }
            });
            this._updateNodeProgress(info.node, this.tabId, info.overallStats, skewInfos, times);
            DagNodeInfoPanel.Instance.update(info.node.getId(), "stats");
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.ActivatingTable, (info) => {
            this._activatingTable(info.node);
        });

        this._registerGraphEvent(this.graph, DagNodeEvents.DoneActivatingTable, (info) => {
            this._doneActivatingTable(info.node.getId());
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.Rerender, (info) => {
            this.rerender();
            DagGraphBar.Instance.setState(this.dagTab);
        });

        this._registerGraphEvent(this.graph, DagGraphEvents.ReexecuteStart, (info) => {
            this.dagTab.unfocus();
            this.dagTab.focus(true);
        });
    }

    private _onAddConnection(addInfo: {node: DagNode}): void {
        try {
            const {node} = addInfo;
            node.getChildren().forEach((childNode) => {
                if (childNode instanceof DagNodeSQLFuncOut) {
                    childNode.updateSchema();
                }
            });
        } catch (e) {
            console.error("add connection event error", e);
        }
    }

    private _registerGraphEvent(
        graph: DagGraph, event: DagGraphEvents|DagNodeEvents, handler: Function
    ): void {
        if (graph == null) {
            return;
        }
        graph.events.on(`${event}.${DagView.dagEventNamespace}`, handler);
    }

    private _drawConnection(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isMultiParent: boolean, // if childNode can have multiple (> 2) parents
        svg: d3,
        newConnection?: boolean,
        bulk?: boolean
    ): void {
        const self = this;
        const $childNode: JQuery = this._getNode(childNodeId);
        const $childConnector: JQuery = this._getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
            .addClass("hasConnection");

        if (isMultiParent && !bulk) {
            // if re-adding an edge from a multichildnode then increment all
            // the edges that have a greater or equal index than the removed one
            // due to splice action on children array
            this.$dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index >= connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index + 1, svg);
                } else if (newConnection) {
                    // only need to readjust if doing a new connection, rather
                    // than restoring connections
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index, svg);
                }
            });
        }

        return this._drawLineBetweenNodes(parentNodeId, childNodeId, connectorIndex, svg);
    }

    private _drawNode(node: DagNode, select?: boolean, bulk?: boolean, noViewOutput?: boolean): JQuery {
        if (node.isHidden()) {
            return $();
        }
        const pos = node.getPosition();
        let type = node.getType();
        let subType = node.getSubType() || "";
        const nodeId = node.getId();
        let $categoryBarNode;
        let cache = DagView._nodeCache.get(`${type}#${subType}`)
        if (cache) {
            $categoryBarNode = cache;
        } else {
            $categoryBarNode = DagView._$operatorBar.find('.operator[data-type="' + type + '"]' +
                '[data-subtype="' + subType + '"]').first();
            DagView._nodeCache.set(`${type}#${subType}`, $categoryBarNode);
        }

        const $node = $categoryBarNode.clone();

        if (noViewOutput) {
            $node.find(".table").remove();
        } else {
            $node.find(".connOut").removeAttr("transform");
            $node.find(".table").removeAttr("display");
        }
        if ($categoryBarNode.closest(".category-hidden").length &&
            type !== DagNodeType.Synthesize &&
            type !== DagNodeType.DFOut &&
            type !== DagNodeType.Export
        ) {
            $node.addClass("configDisabled");
        } else {
            $node.removeClass("configDisabled");
        }

        $node.attr("transform", "translate(" + pos.x + "," + pos.y + ")");
        this._setTooltip($node, node);
        const description = node.getDescription();
        if (description) {
            $node.addClass("hasDescription");
            DagView.addNodeIcon($node, "descriptionIcon", description);
        }
        let aggs: string[] = node.getAggregates();
        if (aggs.length) {
            DagView.addNodeIcon($node, "aggregateIcon", aggs.toString());
        }
        const columnDeltas = node.getColumnDeltas();
        const columnOrdering = node.getColumnOrdering();
        this._columnChange({node, $node, columnDeltas, columnOrdering});

        if (DagTblManager.Instance.isPinned(node.getTable()) &&
            (!(node instanceof DagNodeExport) &&
            !(node instanceof DagNodePublishIMD) &&
            !(node instanceof DagNodeInstruction) &&
            !(node instanceof DagNodeDFOut))) {
            this._editTableLock($node, true);
        }

        this._drawTitleText($node, node);
        this._updateTableNameText($node, node);
        this._updateOpTitle($node, node);

        if (!(this.dagTab instanceof DagTabSQLFunc) &&
             node instanceof DagNodeIn
        ) {
            this._drawHeadText($node, node);
        }

        if (node.getParam().icv) {
            $node.addClass("icv");
        } else {
            $node.removeClass("icv");
        }

        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("state-" + node.getState());
        if (select) {
            DagView.selectNode($node);
        }
        // Set the node display title
        const $opTitle = $node.find('.opTitle');
        $node.removeClass("xc-hidden");
        if (node instanceof DagNodeCustom) {
            $opTitle.text(node.getCustomName());
            // The custom op is hidden in the category bar, so show it in the diagram
        } else if (node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput ||
            node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput
        ) {
            $opTitle.text(node.getPortName(this.isSqlPreview));
            // The custom input/output is hidden in the category bar, so show it in the diagram
        }

         // XXX TODO: deprecated
        if (node.isDeprecated()) {
            xcTooltip.add($node.find(".main"), {title: DFTStr.Deprecated});
        }

        if (node.hasUDFError()) {
            this._updateNodeUDFErrorIcon($node, node);
        }

        if (node instanceof DagNodeSQL && Object.keys(node.getUDFErrors()).length) {
            this._updateNodeUDFErrorIcon($node, node);
        }

        // Update connector UI according to the number of I/O ports
        if (node instanceof DagNodeCustom) {
            const { input, output } = node.getNumIOPorts();
            this._updateConnectorIn($node, input);
            this._updateConnectorOut($node, output);
        }

        if (!bulk) {
            $node.appendTo(this.$dfArea.find(".operatorSvg"));
        }
        return $node;
    }

    private _updateNodeUDFErrorIcon($node: JQuery, node: DagNode) {
        $node.addClass("hasUdfError");
        let tooltip;
        if (node instanceof DagNodeSQL) {
            let numFailed = xcStringHelper.numToStr(Object.keys(node.getUDFErrors()).length);
            tooltip =  numFailed + " map operator(s) with errors. Inspect to view details.";
        } else {
            let numFailed = xcStringHelper.numToStr(node.getUDFError().numRowsFailedTotal);
            tooltip = numFailed + " rows failed. Click to view details.";
        }
        xcTooltip.add($node.find(".iconArea"), {title: tooltip});

        let iconType = "udfErrorIcon";
        let fontSize: number = 13;
        let iconLeft: number = 10;
        let iconTop: number = 6;
        let left = 0;
        let tipClasses: string = "";
        let fontFamily: string = "icomoon";
        let topClass = " topNodeIcon ";

        const g = d3.select($node.get(0)).append("g")
        .attr("class", iconType + topClass + " nodeIcon");

        g.append("circle")
            .attr("cx", 16)
            .attr("cy", 0)
            .attr("r", 5)
            .style("stroke", "black")
            .style("fill", "black");
        g.append("text")
            .attr("font-family", fontFamily)
            .attr("font-size", fontSize)
            .attr("fill", DagView.udfErrorColor)
            .attr("x", iconLeft)
            .attr("y", iconTop)
            .text(function (_d) {return DagView.iconMap[iconType]});

        xcTooltip.add($node.find("." + iconType), {
            title: tooltip,
            classes: tipClasses
        });
    }

    private _removeNodeUDFErrorIcon($node: JQuery): void {
        $node.removeClass("hasUdfError");
        $node.find(".udfErrorIcon").remove();
        // $node.find(".iconArea").remove();
        // $node.find(".icon").remove();
    }

    private _updateConnectorIn($node: JQuery, numInputs: number) {
        const g = d3.select($node[0]);
        DagCategoryBar.Instance.updateNodeConnectorIn(numInputs, g);
    }

    private _updateConnectorOut($node: JQuery, numberOutputs: number) {
        const g = d3.select($node[0]);
        DagCategoryBar.Instance.updateNodeConnectorOut(numberOutputs, g);
    }

    public updateNodeState(nodeInfo: {
        id: DagNodeId,
        node: DagNode,
        oldState: DagNodeState,
        state: DagNodeState
    }
    ): void {
        const node = nodeInfo.node;
        const nodeId: DagNodeId = nodeInfo.id;
        const $node: JQuery = this._getNode(nodeId);
        for (let i in DagNodeState) {
            $node.removeClass("state-" + DagNodeState[i]);
        }
        $node.addClass("state-" + nodeInfo.state);
        if (nodeInfo.oldState === DagNodeState.Error ||
            nodeInfo.state === DagNodeState.Error
        ) {
            // when switch from error state to other state
            this._setTooltip($node, nodeInfo.node);
        }
        if (nodeInfo.state !== DagNodeState.Complete &&
            !(nodeInfo.state === DagNodeState.Error &&
                nodeInfo.oldState === DagNodeState.Running)) {
            // don't remove tooltip upon completion or if the node went from
            // running to an errored state
            this.$dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
            this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]').remove();
            this.$dfArea.find('.activatingTableTip[data-id="' + nodeId + '"]').remove();
        }
         if (node.getType() === DagNodeType.SQL) {
            if (Object.keys((<DagNodeSQL>node).getUDFErrors()).length) {
                this._updateNodeUDFErrorIcon($node, <DagNodeSQL>node);
            } else {
                this._removeNodeUDFErrorIcon($node);
            }
        } else {
            if (node.hasUDFError()) {
                this._updateNodeUDFErrorIcon($node, node);
            } else {
                this._removeNodeUDFErrorIcon($node);
            }
        }
        DagNodeInfoPanel.Instance.update(nodeId, "status");
    }

   public lockUnlockHelper(info: {
        nodeIds: DagNodeId[],
        lock: boolean
    }): void {
        if (info.lock) {
            this.$dfArea.addClass("locked");
            info.nodeIds.forEach((nodeId) => {
                this.lockNode(nodeId);
            });
        } else {
            this.$dfArea.removeClass("locked");
            info.nodeIds.forEach((nodeId) => {
                this.unlockNode(nodeId);
            });
        }
    }

    private _updateTitleForNodes(nodes: DagNode[]): void {
        nodes.forEach((node) => {
            const nodeId = node.getId();
            const $node = this._getNode(nodeId);
            this._drawTitleText($node, node);
        });
    }

    private _toggleCompileLock(lock: boolean) {
        if (lock) {
            xcUIHelper.disableScreen(this.$dfArea, {id: "compileBackground", styles: {
                width: this.$dfArea.find(".dataflowAreaWrapper").width(),
                height: this.$dfArea.find(".dataflowAreaWrapper").height()
            }});
        } else {
            xcUIHelper.enableScreen($("#compileBackground"));
        }
    }

    /**
     *
     * @param nodeId
     * returns $(".operator") element
     */
    private _getNode(
        nodeId: DagNodeId
    ): JQuery {
        return this.$dfArea.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    private _drawTitleText($node: JQuery, node: DagNode): void {
        const g = d3.select($node.get(0));
        // draw node title
        let title: string = node.getTitle();
        if (title === "") {
            // if no title, use blank space so there's clickable width
            title = " ".repeat(20);
        }
        const titleLines: string[] = title.split("\n");
        const titleHeight: number = DagView.nodeHeight + 14;
        g.select(".nodeTitle").remove();

        const textSvg = g.append("text")
            .attr("class", "nodeTitle")
            .attr("fill", DagView.textColor)
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((DagView.nodeWidth / 2) + 1) + "," +
                titleHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        titleLines.forEach((line, i) => {
            textSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * DagView.titleLineHeight);
        });

        // draw param title
        g.select(".paramTitle").remove();
        const paramHintObj: { hint: string, fullHint: string } = node.getParamHint(this.isSqlPreview);
        const paramHint = paramHintObj.hint;
        const fullParamHint = paramHintObj.fullHint;
        const parmLines: string[] = paramHint.split("\n");
        const paramHeight: number = titleHeight + 1 + titleLines.length * DagView.titleLineHeight;
        const paramTextSvg: d3 = g.append("text")
            .attr("class", "paramTitle")
            .attr("fill", DagView.textColor)
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((DagView.nodeWidth / 2) + 1) + "," +
                paramHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        parmLines.forEach((line, i) => {
            paramTextSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * DagView.titleLineHeight);
        });
        xcTooltip.add(<any>paramTextSvg, { title: fullParamHint, placement: "bottom auto" });
    }

    private _updateOpTitle($node, node) {
        if (node.getType() === DagNodeType.Module) {
            let {moduleName} = node.getFnName(true);
            if (!moduleName) {
                moduleName = DagNodeType.Module;
            }
            let fontSize = 10;
            if (moduleName.length > 10) {
                fontSize = 9;
                moduleName = moduleName.slice(0, 13);
            }

            const g = d3.select($node.find('.opTitleWrap')[0]);
            g.selectAll("*").remove();
            g.append("text")
                .attr("class", "opTitle")
                .attr("x", "50%")
                .attr("y", "50%")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("font-family", "Open Sans")
                .attr("font-size", fontSize)
                .attr("fill", DagView.textColor)
                .text(moduleName);
        }

    }

    private _drawHeadText($node: JQuery, node: DagNodeIn): void {
        const g = d3.select($node.get(0));
        const head: string = node.getHead();
        g.select(".graphHead").remove();
        if (!head) {
            return;
        }
        const outer = g.append("foreignObject")
            .attr({
                x: 2,
                y: -50,
                style: "overflow: visible"
            })
            .append('xhtml:div')
            .attr("class", "graphHead")
            .attr({
                "data-toggle": "tooltip",
                "data-container": "body",
                "data-placement": "auto top",
                "data-title": head
            });

            outer
            .append("div")// keeps the size of the outer div
            .attr("class", "hiddenGraphHead")
            .html(head);

            outer
            .append("div")
            .attr("class", "graphHeadInner")
            .html(head);


            outer.append("i")
            .attr("class", "icon xi-edit");
    }

    private _updateTableNameText($node: JQuery, node: DagNode) {
        let fullTableName: string = node.getTable() || "";
        if (node.getParam().icv && node.getComplementNodeId()) {
            const complementNodeId = node.getComplementNodeId();
            const complementNode = this.graph.getNode(complementNodeId);
            if (complementNode && complementNode.getTable()) {
                fullTableName = complementNode.getTable();
                const prefix = xcHelper.getTableName(fullTableName);
                const suffix = xcHelper.getTableId(fullTableName);
                fullTableName = prefix + "_ERRORS#" + suffix;
            }
        }
        let tableName: string;
        if (fullTableName.length > 14) {
            tableName = fullTableName.slice(0, 7) + "..." + fullTableName.slice(-7);
        } else {
            tableName = fullTableName;
        }
        const $tableName = $node.find(".tableName");
        $tableName.text(tableName);
        xcTooltip.add(<any>$tableName, { title: fullTableName, placement: "bottom auto" });
    }

        /**
     * Adds or removes a lock icon to the node
     * @param $node: JQuery node
     * @param lock: true if we add a lock, false otherwise
     */
    private _editTableLock(
        $node: JQuery, lock: boolean
    ): void {
        if (lock) {
            DagView.addTableIcon($node, "lockIcon", TooltipTStr.PinnedTable);
        } else {
            DagView.removeTableIcon($node, "lockIcon");
        }
    }


    /**
     *
     * @param nodeId
     * @param aggregates
     */
    private _editAggregates(
        nodeId: DagNodeId,
        aggregates: string[]
    ): void {
        const $node = this._getNode(nodeId);
        DagView.removeNodeIcon($node, "aggregateIcon");
        if (aggregates.length) {
            $node.addClass("hasAggregates");
            DagView.addNodeIcon($node, "aggregateIcon", aggregates.toString());
        } else {
            $node.removeClass("hasAggregate");
        }
    }

    private _columnChange(info: {node: DagNode, $node?: JQuery, columnDeltas: Map<string, any>, columnOrdering: string[]}): void {
        const $node: JQuery = info.$node || this._getNode(info.node.getId());
        DagView.removeTableIcon($node, "columnIcon");
        if (info.columnDeltas.size || info.columnOrdering.length) {
            $node.addClass("hasColumnChange");
            let colObj = {};
            let colStr: string = "";
            info.columnDeltas.forEach((colInfo, colName) => { // map to obj
                colObj[colName] = colInfo;
            });
            if (info.columnDeltas.size) {
                colStr = JSON.stringify(colObj, null, 2);
                colStr = colStr.slice(2, -1); // remove { }
                colStr = "Column changes: \n" + colStr;
            }
            if (info.columnOrdering.length) {
                let orderStr = "";
                if (info.columnDeltas.size) {
                    colStr += "\n"; // space between sections
                    orderStr = JSON.stringify(info.columnOrdering);
                } else {
                    orderStr = JSON.stringify(info.columnOrdering, null, 2);
                }
                colStr += "Column reordering: \n" + orderStr;
            }

            DagView.addTableIcon($node, "columnIcon", colStr);
        } else {
            $node.removeClass("hasColumnChange");
        }
    }

    private _setTooltip($node: JQuery, node: DagNode): void {
        if (node.getState() !== DagNodeState.Error) {
            xcTooltip.remove($node.find(".main"));
        } else {
            const title: string = (node.getState() === DagNodeState.Error) ?
                node.getError() : this._formatTooltip(node.getParam());

            xcTooltip.add($node.find(".main"), {
                title: title,
                classes: "preWrap leftAlign wide"
            });
        }

        this._setParameterIcon($node, node);
    }

    private _setParameterIcon($node: JQuery, node: DagNode): void {
        DagView.removeNodeIcon($node, "paramIcon");
        if (node.hasParameters()) {
            let tooltip: string = DFTStr.ParamInUse;
            try {
                tooltip += ": " + node.getParameters().join(", ");
            } catch (e) {
                console.error(e);
            }
            DagView.addNodeIcon($node, "paramIcon", tooltip);
        }
    }

    // for param tooltip
    private _formatTooltip(param): string {
        let title = xcStringHelper.escapeHTMLSpecialChar(JSON.stringify(param, null, 2));
        if (title === "{}") {
            title = "empty";
        } else {
            if (title.indexOf("{\n") === 0 && title.lastIndexOf("}") === title.length - 1) {
                title = title.slice(2, -1);
            }
        }
        return title;
    }

    private _autoExecute(dagNode: DagNode): void {
        if (UserSettings.Instance.getPref("dfAutoExecute") === true) {
            if (dagNode.getState() == DagNodeState.Configured ||
                dagNode.getState() == DagNodeState.Error) {
                const optimized: boolean = (dagNode instanceof DagNodeOutOptimizable &&
                                           dagNode.isOptimized());
                this.run([dagNode.getId()], optimized);
            }
        }
    }

    public checkLinkInNodeValidation(): void {
        if (this.graph == null) {
            return;
        }
        this.graph.getAllNodes().forEach((node) => {
            if (node instanceof DagNodeDFIn) {
                const state: DagNodeState = node.getState();
                if (state === DagNodeState.Configured ||
                    state === DagNodeState.Error && node.isLinkingError()
                ) {
                    node.switchState();
                }
            }
        });
    }

    private async _openLinkedTabs(
        graph: DagGraph,
        nodeIdsToRun?: DagNodeId[],
        optimized?: boolean
    ): Promise<void> {
        let destNodes: DagNode[];
        if (nodeIdsToRun == null) {
            destNodes = graph.getNodesByType(DagNodeType.DFIn);
        } else {
            destNodes = nodeIdsToRun.map((nodeId) => graph.getNode(nodeId));
        }
        const stopAtExistingResult: boolean = !optimized;
        const funcInNodes = DagGraph.getFuncInNodesFromDestNodes(destNodes, stopAtExistingResult);
        await this._recursiveOpenLinkedGraph(graph.getTabId(), funcInNodes, stopAtExistingResult);
    }

    // find the linked graph and function output of
    // the starting function input nodes
    // and if the graph is not open, open it
    private async _recursiveOpenLinkedGraph(
        startTabId: string,
        startFuncInNodes: DagNodeDFIn[],
        stopAtExistingResult: boolean
    ): Promise<void> {
        const stack: {tabId: string, node: DagNodeDFIn}[] = startFuncInNodes.map((node) => {
            return {
                tabId: startTabId,
                node
            };
        });

        const visited = {}; // visited[tabId][nodeId] = true
        while (stack.length > 0) {
            const {node, tabId} = stack.pop();
            const nodeId: DagNodeId = node.getId();
            if (visited[tabId] && visited[tabId][nodeId]) {
                // already visited
                continue;
            }
            visited[tabId] = visited[tabId] || {};
            visited[tabId][node.getId()] = true;

            if (!node.hasAcceessToLinkedGraph()) {
                const tabToOpen = DagList.Instance.getDagTabById(node.getLinkedTabId());
                if (tabToOpen != null) {
                    await DagTabManager.Instance.loadTab(tabToOpen, false, false);
                }
            }
            const res = node.getLinkedNodeAndGraph();
            const linkedTabId: string = res.graph.getTabId();
            let funcOutNode: DagNodeDFOut = res.node;
            const headFuncInNodes: DagNodeDFIn[] = DagGraph.getFuncInNodesFromDestNodes([funcOutNode], stopAtExistingResult);
            headFuncInNodes.forEach((funcInNode) => {
                stack.push({
                    tabId: linkedTabId,
                    node: funcInNode
                });
            });
        }

    }

    // a check that is done right before execution to allow users to confirm
    // and continue if an error is found - one case is if a parameter with no
    // value is found -- we can prompt the user to continue or abandon the execution
    private _runValidation(nodeIds: DagNodeId[], optimized: boolean): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const ret = this.graph.executionPreCheck(nodeIds, optimized)
        if (!ret) {
            if (nodeIds == null && !optimized && DagViewManager.Instance.hasOptimizedNode()) {
                Alert.show({
                    "title": "Confirmation",
                    "msgTemplate": DFTStr.OptimizedOnlyWarn,
                    "onConfirm": function() {
                        deferred.resolve({optimized: true});
                    },
                    "onCancel": function() {
                        deferred.reject({
                            error: "cancel"
                        });
                    }
                });
            } else {
                return PromiseHelper.resolve();
            }
        } else if (ret.status === "confirm" && ret.msg) {
            Alert.show({
                "title": "Confirmation",
                "msgTemplate": ret.msg + "\n Do you wish to continue?",
                "onConfirm": function() {
                    deferred.resolve();
                },
                "onCancel": function() {
                    deferred.reject({
                        error: "cancel"
                    });
                }
            });
        } else {
            deferred.reject(ret);
        }

        return deferred.promise();
    }

    // now only for DagTabMain to use
    private _loadMainModuleNeededTabsBeforeRun(): XDPromise<DagTabUser[]> {
        const tab = this.getTab();
        if (tab.getType() !== DagTabType.Main) {
            return PromiseHelper.resolve([]);
        }
        const tabIdSet: Set<string> = new Set();
        try {
            tab.getGraph().getAllNodes().forEach((node) => {
                if (node instanceof DagNodeModule) {
                    const tab = node.getTab();
                    if (tab == null) {
                        const tabId = node.getTabId();
                        tabIdSet.add(tabId);
                    }
                }
            });
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject({error: e.message});
        }

        return this._loadNeedeTabs(tabIdSet, false);
    }

    private _loadNeedeTabs(tabIdSet: Set<string>, openTab: boolean): XDPromise<DagTabUser[]> {
        const tabs: DagTabUser[] = [];
        tabIdSet.forEach((tabId) => {
            const tabToLoad: DagTabUser = <DagTabUser>DagList.Instance.getDagTabById(tabId);
            if (tabToLoad != null) {
                tabs.push(tabToLoad);
            }
        });
        const promises = tabs.map((tab) => {
            if (openTab) {
                return DagTabManager.Instance.loadTab(tab, false, )
            } else {
                return tab.load();
            }
        });
        const deferred: XDDeferred<DagTabUser[]> = PromiseHelper.deferred();
        PromiseHelper.when(...promises)
        .then(() => {
            deferred.resolve(tabs);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getNextAvailablePosition(nodeId: DagNodeId, x: number, y: number, options?: {vertSpacing?: number}): Coordinate {
        x = Math.max(x, DagView.gridSpacing);
        y = Math.max(y, DagView.gridSpacing);
        let positions: Map<number, Set<number>> = new Map();

        options = options || {};
        let vertSpacing = options.vertSpacing || DagView.gridSpacing;

        this.graph.getAllNodes().forEach(node => {
            if (node.getId() === nodeId) {
                return;
            }
            const pos: Coordinate = node.getPosition();
            if (!positions.has(pos.x)) {
                positions.set(pos.x, new Set());
            }
            positions.get(pos.x).add(pos.y);
        });

        let positionConflict = true;
        while (positionConflict) {
            positionConflict = false;
            if (positions.has(x) && positions.get(x).has(y)) {
                positionConflict = true;
                x += DagView.gridSpacing;
                y += vertSpacing;
                // XXX to do, better checking when using vertSpacing
            }
        }
        return {
            x: x,
            y: y
        }
    }

    private _getChildConnector($childNode: JQuery, index: number): JQuery {
        let $childConnector: JQuery;
        let $childConnectors = $childNode.find(".connector.in");
        if ($childConnectors.hasClass("multi")) {
            $childConnector = $childConnectors.eq(0);
        } else {
            $childConnector = $childConnectors.eq(index);
            if (!$childConnector.length) {
                // in case more connections exist than number of connection
                // divs
                $childConnector = $childConnectors.last();
            }
        }
        return $childConnector;
    }

    private _drawLineBetweenNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        svg: d3
    ): void {
        const parentNode: DagNode = this.graph.getNode(parentNodeId);
        const childNode: DagNode = this.graph.getNode(childNodeId);
        if (parentNode == null || childNode == null) {
            return;
        }
        let numParents = childNode.getMaxParents();
        let numConnections = connectorIndex;
        let isMulti = false;
        if (numParents === -1 || numParents > 1 ||
            childNode instanceof DagNodeModule) {
            if (!(childNode instanceof DagNodeJoin)) {
                numParents = childNode.getNumParent();
            }
            isMulti = true;
        }

        const parentCoors: Coordinate = {
            x: parentNode.getPosition().x + DagView.nodeAndTableWidth,
            y: parentNode.getPosition().y + (DagView.nodeHeight / 2)
        };

        let childX = childNode.getPosition().x;
        if (childNode instanceof DagNodeModule) {
            childX += 7;
        }
        const childCoors: Coordinate = {
            x: childX,
            y: childNode.getPosition().y + 2 +
                ((DagView.nodeHeight - 4) / (Math.max(numParents, 1) + 1) * (1 + numConnections))
        };
        let edgeClass = "edge";

        const edge = svg.append("g")
            .attr("class", edgeClass)
            .attr("data-childnodeid", childNodeId)
            .attr("data-parentnodeid", parentNodeId)
            .attr("data-connectorindex", connectorIndex.toString());

        edge.append("path")
            .attr("class", "visibleLine")
            .attr("d", DagView.lineFunction([parentCoors, childCoors]));
        edge.append("path")
            .attr("class", "invisibleLine")
            .attr("d", DagView.lineFunction([parentCoors, childCoors]));
        if (isMulti || childNode.getType() === DagNodeType.Custom) {
            // stagger the numbers
            const midX = ((3 * parentCoors.x + ((connectorIndex + 1) *
                childCoors.x)) / (4 + connectorIndex));
            const midY = (2 * parentCoors.y + ((connectorIndex * .5 + 1) *
                childCoors.y)) / (3 + (connectorIndex * .5));
            edge.append("text")
                .attr("class", "connectorIndex")
                .attr("fill", DagView.edgeColor)
                .attr("font-size", "12px")
                .attr("letter-spacing", "-2")
                .attr("x", midX + "px")
                .attr("y", (midY - 2) + "px")
                .text("#" + (connectorIndex + 1))
        }
    }

    private _deselectAllNodes(): void {
        const $selected = DagView.$dfWrap.find(".selected");
        $selected.removeClass("selected tableSelected");
        $selected.find(".selection").remove();
    }

    private _setGraphDimensions(elCoors: Coordinate, force?: boolean) {
        if (this.graph == null) {
            return;
        }
        let height: number;
        let width: number;

        if (force) {
            this.graph.setDimensions(elCoors.x, elCoors.y);
            width = elCoors.x;
            height = elCoors.y;
        } else {
            const dimensions = DagView._calculateDimensions(this.graph.getDimensions(), elCoors);
            width = dimensions.width;
            height = dimensions.height;
            this.graph.setDimensions(width, height);
        }

        const scale = this.graph.getScale();
        this.$dfArea.find(".dataflowAreaWrapper").css("min-width", width * scale);
        this.$dfArea.find(".dataflowAreaWrapper").css("min-height", height * scale);
        this.$dfArea.find(".dataflowAreaWrapper").css("background-size", DagView.gridLineSize * scale);
    }

    private _createNodeInfos(
        nodeIds: DagNodeId[],
        graph?: DagGraph,
        options: {
            clearState?: boolean // true if we're copying nodes
            includeStats?: boolean,
            includeTitle?: boolean, // indicates we're doing a cut/copy and paste
            forCopy?: boolean
        } = {}
    ): any[] {
        graph = graph || this.graph;
        // check why we need it
        const clearState: boolean = options.clearState || false;
        const includeStats: boolean = options.includeStats || false;
        const forCopy: boolean = options.forCopy || false;
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
            if (!nodeId.startsWith("comment")) {
                const node: DagNode = graph.getNode(nodeId);
                if (node == null) {
                    return;
                }
                let parentIds: DagNodeId[] = [];
                let minParents: number = node.getMinParents();
                let parents = node.getParents();
                // if node requires at least 2 parents, and a parent isn't found
                // then we push in a null, but if the node requires 1 parent
                // we can just not push anything and keep parents == []
                for (let i = 0; i < parents.length; i++) {
                    const parent = parents[i];
                    if (parent) {
                        const parentId: DagNodeId = parent.getId();

                        if (nodeIds.indexOf(parentId) === -1) {
                            if (minParents > 1) {
                                parentIds.push(null);
                            }
                        } else {
                            parentIds.push(parentId);
                        }
                    } else {
                        if (minParents > 1) {
                            parentIds.push(null);
                        }
                    }
                }

                const nodeInfo = node.getNodeCopyInfo(clearState, includeStats, forCopy);
                nodeInfo.parents = parentIds;
                nodeInfos.push(nodeInfo);
            } else if (nodeId.startsWith("comment")) {
                const comment: CommentNode = graph.getComment(nodeId);
                nodeInfos.push({
                    nodeId: nodeId,
                    display: xcHelper.deepCopy(comment.getDisplay()),
                    text: comment.getText()
                });
            }
        });

        return nodeInfos;
    }

    public validateAndPaste(content: string): any[] {
        let parsed = false;
        try {
            if (!content) {
                return;
            }
            const nodesArray = JSON.parse(content);
            parsed = true;
            if (!Array.isArray(nodesArray)) {
                throw ("Module nodes must be in an array.");
            }
            let nodeSchema = DagNode.getCopySchema();
            let nodeSchemaValidateFn = (new Ajv()).compile(nodeSchema);
            let commentSchema = CommentNode.getCopySchema();
            let commentSchemaValidateFn = (new Ajv()).compile(commentSchema);
            for (let i = 0; i < nodesArray.length; i++) {
                const node = nodesArray[i];
                let valid;
                let validate;
                if (node.hasOwnProperty("text")) {
                    validate = commentSchemaValidateFn;
                } else {
                    validate = nodeSchemaValidateFn;
                }
                valid = validate(node);
                if (!valid) {
                    // only saving first error message
                    const msg = DagNode.parseValidationErrMsg(node, validate.errors[0], node.hasOwnProperty("text"));
                    throw (msg);
                }

                if (!node.hasOwnProperty("text")) {
                    // validate based on node type
                    const nodeClass = DagNodeFactory.getNodeClass(node);
                    let nodeSpecificSchema;
                    if (node.type === DagNodeType.Custom) {
                        nodeSpecificSchema = DagNodeCustom.getCopySpecificSchema();
                    } else {
                        nodeSpecificSchema = nodeClass.specificSchema;
                    }
                    if (!nodeClass["validateFn"]) {
                        // cache the validation function within the nodeClass
                        let ajv = new Ajv();
                        nodeClass["validateFn"] = ajv.compile(nodeSpecificSchema);
                    }
                    valid = nodeClass["validateFn"](node);
                    if (!valid) {
                        // only saving first error message
                        const msg = DagNode.parseValidationErrMsg(node, nodeClass["validateFn"].errors[0]);
                        throw (msg);
                    }
                }
            }
            return this.pasteNodes(nodesArray);
        } catch (err) {
            console.error(err);
            let errStr: string;
            if (!parsed) {
                errStr = "Cannot paste invalid format. Nodes must be in a valid JSON format."
            } else if (typeof err === "string") {
                errStr = err;
            } else {
                errStr = xcHelper.parseJSONError(err).error;
            }
            StatusBox.show(errStr, DagView.$dfWrap);
        }
    }

    private _removeConnection(
        $edge: JQuery,
        childNodeId: DagNodeId
    ): void {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();
        const $childNode: JQuery = this._getNode(childNodeId);
        const $childConnector: JQuery = this._getChildConnector($childNode, connectorIndex);
        const self = this;
        if ($childConnector.hasClass("multi")) {
            // if removing an edge from a multichildnode then decrement all
            // the edges that have a greater index than the removed one
            // due to splice action on children array
            const svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');
            this.$dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!self._getNode(parentNodeId).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        $curEdge.attr("data-connectorindex", index - 1);
                        return true;
                    }
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index - 1, svg);
                } else {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!self._getNode(parentNodeId).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        return true;
                    }
                    $curEdge.remove();
                    self._drawLineBetweenNodes(parentNodeId, childNodeId, index, svg);
                }
            });
        } else  {
            let node: DagNode = self.graph.getNode(childNodeId);
            if (node != null && node.getNumParent() === 0) {
                $childConnector.removeClass("hasConnection")
                .addClass("noConnection");
            }
        }
    }

       /**
     * DagView.moveNodes
     * @param dagId
     * @param nodeInfos
     * @param graphDimensions
     * @param options
     */
    public moveNodes(
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate,
        options?: {
            isNoLog?: boolean
        }
    ): XDPromise<void> {
        const { isNoLog = false } = options || {};
        this.dagTab.turnOffSave();
        this._moveNodesNoPersist(nodeInfos, graphDimensions, { isNoLog: isNoLog });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    private _moveNodesNoPersist(
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate,
        options?: {
            isNoLog?: boolean
        }
    ): LogParam {
        const { isNoLog = false } = (options || {});
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        let $edgeSvg =  this.$dfArea.find(".edgeSvg").remove();
        let edgeSvg: d3 = d3.select($edgeSvg[0]);
        const $operatorArea = this.$dfArea.find(".operatorSvg").remove();
        const $commentArea: JQuery = this.$dfArea.find(".commentArea");
        const self = this;

        nodeInfos.forEach((nodeInfo, i) => {
            if (nodeInfo.type === "dagNode") {
                const nodeId = nodeInfo.id;
                const $el = $operatorArea.find('.operator[data-nodeid="' + nodeId + '"]');
                const node: DagNode = this.graph.getNode(nodeId);
                if (node == null) {
                    return;
                }
                nodeInfos[i].oldPosition = xcHelper.deepCopy(node.getPosition())
                this.graph.moveNode(nodeId, {
                    x: nodeInfo.position.x,
                    y: nodeInfo.position.y,
                });

                $el.attr("transform", "translate(" + nodeInfo.position.x + "," +
                    nodeInfo.position.y + ")");

                maxXCoor = Math.max(nodeInfo.position.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y, maxYCoor);

                // positions this element in front
                $el.appendTo($operatorArea);

                // redraw all paths that go out from this node
                $edgeSvg.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                    const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                    let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    self._drawLineBetweenNodes(nodeId, childNodeId, connectorIndex, edgeSvg);
                });

                // redraw all paths that lead into this node
                $edgeSvg.find('.edge[data-childnodeid="' + nodeId + '"]').each(function () {
                    const parentNodeId = $(this).attr("data-parentnodeid");
                    let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    self._drawLineBetweenNodes(parentNodeId, nodeId, connectorIndex, edgeSvg);
                });
                // move runStats if it has one
                this._repositionProgressTooltip(nodeInfo, nodeId);
            } else {
                // comment node
                const id = nodeInfo.id;
                const comment = this.graph.getComment(id);
                nodeInfos[i].oldPosition = xcHelper.deepCopy(comment.getPosition());
                comment.setPosition(nodeInfo.position);
                const $el = this.$dfArea.find('.comment[data-nodeid="' + id + '"]');
                $el.css({
                    left: nodeInfo.position.x,
                    top: nodeInfo.position.y
                });
                const dimensions = comment.getDimensions();
                maxXCoor = Math.max(nodeInfo.position.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y + dimensions.height, maxYCoor);

                $el.appendTo($commentArea);
            }
        });
        this.$dfArea.find(".commentArea").after($edgeSvg);
        this.$dfArea.find(".edgeSvg").after($operatorArea);

        if (graphDimensions) {
            this._setGraphDimensions(graphDimensions, true);
        } else {
            this._setGraphDimensions({ x: maxXCoor, y: maxYCoor });
        }

        const logParam: LogParam = {
            title: SQLTStr.MoveOperations,
            options: {
                "operation": SQLOps.MoveOperations,
                "dataflowId": this.tabId,
                "nodeInfos": nodeInfos
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, logParam.options);
        }

        return logParam;
    }

    // handles drag n drop
    public operatorMousedown(event, $opMain: JQuery, noDragDrop?: boolean) {
        let $operator = $opMain.closest(".operator");
        let isDagNode = true;
        if (!$operator.length) {
            $operator = $opMain;
            isDagNode = false;
        }
        const $eventTarget = $(event.target);
        const isTableNode = $eventTarget.closest(".table").length > 0 ||
                            $eventTarget.closest(".tblIcon").length > 0;

        // if not shift clicking, deselect other nodes
        // if shiftx clicking, and this is selected, then deselect it
        // but don't allow dragging on deselected node
        if (!$operator.hasClass("selected") && !event.shiftKey) {
            this.deselectNodes();
        } else if ($operator.hasClass("selected") && (event.shiftKey ||
            (isSystemMac && event.metaKey || !isSystemMac && event.ctrlKey))) {
            DagView.deselectNode($operator);
            DagNodeInfoPanel.Instance.hide();
            return;
        }

        DagView.selectNode($operator, isTableNode);

        const nodeId: DagNodeId = $operator.data("nodeid");
        if (isDagNode) {
            const node: DagNode = this.graph.getNode(nodeId);
            DagNodeInfoPanel.Instance.show(node, false);
            const $tip = this.$dfArea.find('.runStats[data-id="' + nodeId + '"]');
            this.$dfArea.append($tip);

            const $nodeTip = this.$dfArea.find('.nodeStats[data-id="' + nodeId + '"]');
            this.$dfArea.append($nodeTip);
            this.$dfArea.find(".operatorSvg").append($operator);
        }

        if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
            return;
        }
        if ($eventTarget.closest(".ui-resizable-handle").length ||
            $eventTarget.is("textarea")) {
            if (!event.shiftKey) {
                this.deselectNodes();
                DagView.selectNode($operator, isTableNode);
            }
            return;
        }

        if (noDragDrop) { // dragdrop disabled in sql panel
            dragFail.bind(this)();
            return;
        }

        const $elements = $operator.add(this.$dfArea.find(".selected"));

        // the description icon and large node title cause the
        // desired dimensions of the operator element to be altered so we
        // undo its effects by using offsets
        const elOffsets = [];
        $elements.find(".graphHead").hide();
        $elements.each(function () {
            const $el = $(this);
            const elOffset = { x: 0, y: 0 };
            if ($el.is(".operator")) {
                const outerLeft = this.getBoundingClientRect().left;
                const innerLeft = $(this).find('.main')[0].getBoundingClientRect().left;
                elOffset.x = (innerLeft - DagView.inConnectorWidth) - outerLeft;
            }
            elOffsets.push(elOffset);
        });
        $elements.find(".graphHead").show();
        let padding = DagView.gridSpacing;
        if ($elements.filter(".comment").length === $elements.length) {
            // only  comments
            padding = 0;
        }

        new DragHelper({
            event: event,
            $element: $operator,
            $elements: $elements,
            $container: $(this.containerSelector),
            $dropTarget: this.$dfArea.find(".dataflowAreaWrapper"),
            round: DagView.gridSpacing,
            padding: padding,
            scale: this.graph.getScale(),
            elOffsets: elOffsets,
            onDragStart: (_$els) => {},
            onDragEnd: ($els, _event, data) => {
                let nodeInfos = [];
                $els.each(function (i) {
                    const id = $(this).data("nodeid");
                    if ($(this).hasClass("operator")) {
                        nodeInfos.push({
                            type: "dagNode",
                            id: id,
                            position: data.coors[i]
                        });
                    } else if ($(this).hasClass("comment")) {
                        nodeInfos.push({
                            type: "comment",
                            id: id,
                            position: data.coors[i]
                        });
                    }
                });
                this.moveNodes(nodeInfos);
            },
            onDragFail: (wasDragged: boolean) => {
                if (!wasDragged) { // did not drag
                    dragFail.bind(this)();
                }
            },
            move: true
        });

        function dragFail() {
            if (!event.shiftKey) {
                this._deselectAllNodes();
                DagView.selectNode($operator, isTableNode);
            }
            // if no drag, treat as right click and open menu
            if (!event.shiftKey && !$opMain.hasClass("comment")) {
                if ($opMain.hasClass("iconArea")) {
                    if ($opMain.closest(".hasUdfError").length) {
                        DagUDFErrorModal.Instance.show(nodeId);
                    } else if ($opMain.closest(".sql").length) {
                        DagViewManager.Instance.inspectSQLNode(nodeId, this.tabId);
                    }
                } else {
                    let contextMenuEvent = $.Event("contextmenu", {
                        pageX: event.pageX,
                        pageY: event.pageY
                    });
                    $opMain.trigger(contextMenuEvent);
                }
            }
        }

    }

     // connecting 2 nodes dragging the parent's connector
    public connectorOutMousedown(event, $parentConnector) {
        const self = this;
        if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
            return;
        }
        const $parentNode = $parentConnector.closest(".operator");
        const parentNodeId: DagNodeId = $parentNode.data("nodeid");

        if (self.isNodeLocked(parentNodeId)) {
            return;
        }

        let $candidates: JQuery;
        let path;
        let parentCoors;
        let scale: number = self.graph.getScale();
        // connector's clone position is fixed in css file
        new DragHelper({
            event: event,
            $element: $parentConnector.parent(),
            $container: DagView.$dagView,
            $dropTarget: self.$dfArea.find(".dataflowAreaWrapper"),
            offset: {
                x: 0,
                y: -2
            },
            scale: scale,
            isDragginNodeConnector: true,
            noCursor: true,
            onDragStart: (_$el: JQuery, _e: JQueryEventObject) => {
                const $operators: JQuery = self.$dfArea.find(".operator");
                $candidates = $operators.filter(function () {
                    const childNodeId = $(this).data("nodeid");
                    if (childNodeId === parentNodeId) {
                        return false;
                    }
                    let node: DagNode = self.graph.getNode(childNodeId);
                    if (node == null) {
                        return false;
                    }
                    let index = node.getNextOpenConnectionIndex();
                    if (index === -1) {
                        return false;
                    } else {
                        return self.graph.canConnect(parentNodeId, childNodeId, index, true);
                    }
                });
                $operators.addClass("noDrop");
                $candidates.removeClass("noDrop").addClass("dropAvailable");
                const offset = self._getDFAreaOffset();
                const rect = $parentConnector[0].getBoundingClientRect();
                parentCoors = {
                    x: (rect.right + offset.left) - 6,
                    y: (rect.top + offset.top) + 12
                };
                // setup svg for temporary line
                self.$dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + self.tabId + '"] .secondarySvg');

                const edge: d3 = svg.append("g")
                    .attr("class", "edge tempEdge");

                path = edge.append("path");
                path.attr("class", "visibleLine");
            },
            onDrag: (coors) => {
                const offset = self._getDFAreaOffset();
                const childCoors = {
                    x: (coors.x + offset.left) + 2,
                    y: (coors.y + offset.top) + 14
                };
                path.attr("d", DagView.lineFunction([parentCoors, childCoors]));
            },
            onDragEnd: (_$el, event) => {
                let $childNode: JQuery;
                $candidates.removeClass("dropAvailable noDrop");

                self.$dfArea.find(".secondarySvg").remove();
                // check if location of drop matches position of a valid
                // $operator
                $candidates.each(function () {
                    const rect: ClientRect = this.getBoundingClientRect();
                    const left: number = rect.left;
                    const right: number = rect.right;
                    const top: number = rect.top;
                    const bottom: number = rect.bottom;
                    if (event.pageX >= left && event.pageX <= right &&
                        event.pageY >= top && event.pageY <= bottom) {
                        $childNode = $(this);
                        return false;
                    }
                });

                if (!$childNode) {
                    console.error("invalid connection");
                    return;
                }

                // Figure out the connectorIn element of the child node
                let $childConnectorIn: JQuery = null;
                $childNode.find('.connector.in').each((_index, elem) => {
                    const rect: ClientRect = elem.getBoundingClientRect();
                    if (event.pageX >= rect.left && event.pageX <= rect.right &&
                        event.pageY >= rect.top && event.pageY <= rect.bottom) {
                        $childConnectorIn = $(elem);
                        return false;
                    }
                });

                const childNodeId: DagNodeId = $childNode.data("nodeid");
                const childNode: DagNode = self.graph.getNode(childNodeId);
                if (childNode == null) {
                    return;
                }
                const connectorIndex: number = $childConnectorIn == null
                    ? childNode.getNextOpenConnectionIndex() // drop in the area other than connectors, connect to the next available input
                    : (childNode.canHaveMultiParents() // drop in one of the connectors
                        ? childNode.getNextOpenConnectionIndex() // it's a multi-connection(such as Set) node, connect to the next available input
                        : parseInt($childConnectorIn.data('index'))); // it's a normal node, connect to the corresponding input
                if (!self.graph.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                    StatusBox.show(DagTStr.CycleConnection, $childNode);
                    return;
                }
                const warning = self._connectionWarning(childNodeId, parentNodeId);
                if (warning) {
                    if (warning.msg === DagTStr.CustomOpTooManyConnections) {
                        Alert.error(warning.title, warning.msg);
                    } else {
                        Alert.show({
                            title: warning.title,
                            msg: warning.msg,
                            onConfirm: () => {
                                self.connectNodes(parentNodeId, childNodeId, connectorIndex);
                            }
                        });
                    }
                } else {
                    self.connectNodes(parentNodeId, childNodeId,
                        connectorIndex);
                }
            },
            onDragFail: (wasDragged: boolean) => {
                if (wasDragged) {
                    $candidates.removeClass("dropAvailable noDrop");
                    self.$dfArea.find(".secondarySvg").remove();
                }
            },
            copy: true
        });

    }

    // connecting 2 nodes dragging the child's connector
    public connectorInMousedown(event, $childConnector) {
        const self = this;
        if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
            return;
        }
        if (self.dagTab instanceof DagTabExecuteOnly) {
            return;
        }
        const $childNode = $childConnector.closest(".operator");
        const childNodeId: DagNodeId = $childNode.data("nodeid");
        if (self.isNodeLocked(childNodeId)) {
            return;
        }
        let $candidates: JQuery;
        let path;
        let childCoors;
        let otherParentId;

        const childNode = self.graph.getNode(childNodeId);
        if (childNode == null) {
            return;
        }
        const canHaveMultiParents: boolean = childNode.canHaveMultiParents();
        const connectorIndex = canHaveMultiParents
            ? childNode.getNextOpenConnectionIndex()
            : parseInt($childConnector.data("index"));
        // if child connector is in use, when drag finishes we will remove
        // this connection and replace with a new one
        const isReconnecting = childNode.getParents()[connectorIndex] != null;

        let scale = self.graph.getScale();
        new DragHelper({
            event: event,
            $element: $childConnector.parent(),
            $container: DagView.$dagView,
            $dropTarget: self.$dfArea.find(".dataflowAreaWrapper"),
            offset: {
                x: 5,
                y: 3
            },
            scale: scale,
            isDragginNodeConnector: true,
            noCursor: true,
            onDragStart: (_$el: JQuery, _e: JQueryEventObject) => {
                if (isReconnecting) {
                    // connection already taken, temporarily remove connection
                    // and create a new one when drop finishes or add it back
                    // if drop fails
                    const $curEdge = self.$dfArea.find('.edge[data-childnodeid="' +
                        childNodeId +
                        '"][data-connectorindex="' +
                        connectorIndex + '"]');
                    otherParentId = $curEdge.data("parentnodeid");
                    self.graph.disconnect(otherParentId, childNodeId,
                        connectorIndex, false);
                }
                const $operators: JQuery = self.$dfArea.find(".operator");
                $candidates = $operators.filter(function () {
                    const parentNodeId = $(this).data("nodeid");
                    if (childNodeId === parentNodeId) {
                        return false;
                    }

                    return self.graph.canConnect(parentNodeId, childNodeId,
                        connectorIndex, true);
                });

                $operators.addClass("noDrop");
                $candidates.removeClass("noDrop").addClass("dropAvailable");
                const offset = self._getDFAreaOffset();
                const rect = $childConnector.parent()[0].getBoundingClientRect();
                childCoors = {
                    x: (rect.left + offset.left) + 4,
                    y: (rect.top + offset.top) + 6
                };
                if (canHaveMultiParents) {
                childCoors.y += 5;
                }
                // setup svg for temporary line
                self.$dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + self.tabId + '"] .secondarySvg');

                const edge = svg.append("g")
                    .attr("class", "edge tempEdge");

                path = edge.append("path");
                path.attr("class", "visibleLine");
            },
            onDrag: (coors) => {
                const offset = self._getDFAreaOffset();
                const parentCoors = {
                    x: (coors.x + offset.left) + 3,
                    y: (coors.y + offset.top) + 4
                };
                if (canHaveMultiParents) {
                    parentCoors.y += 5;
                }
                path.attr("d", DagView.lineFunction([childCoors, parentCoors]));
            },
            onDragEnd: (_$el, event) => {
                let $parentNode: JQuery;
                $candidates.removeClass("dropAvailable noDrop");

                self.$dfArea.find(".secondarySvg").remove();
                // check if location of drop matches position of a valid
                // $operator
                $candidates.each(function () {
                    const rect: ClientRect = this.getBoundingClientRect();
                    const left: number = rect.left;
                    const right: number = rect.right;
                    const top: number = rect.top;
                    const bottom: number = rect.bottom;
                    if (event.pageX >= left && event.pageX <= right &&
                        event.pageY >= top && event.pageY <= bottom) {
                        $parentNode = $(this);
                        return false;
                    }
                });

                if (!$parentNode) {
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                    return;
                }

                const parentNodeId: DagNodeId = $parentNode.data("nodeid");

                if (!self.graph.canConnect(parentNodeId, childNodeId,
                    connectorIndex)) {
                    StatusBox.show(DagTStr.CycleConnection, $childNode);
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                    return;
                }
                if (isReconnecting) {
                    self.graph.connect(otherParentId, childNodeId,
                        connectorIndex, true, false);
                }

                const warning = self._connectionWarning(childNodeId, parentNodeId);
                if (warning) {
                    const key = "noConnectAlert";
                    const noAlert = xcLocalStorage.getItem(key) === "true";
                    if (warning.msg === DagTStr.CustomOpTooManyConnections) {
                        Alert.error(warning.title, warning.msg);
                    } else if (noAlert) {
                        self.connectNodes(parentNodeId, childNodeId,
                            connectorIndex, isReconnecting);
                    } else {
                        const writeChecked = (hasChecked) => {
                            if (hasChecked) {
                                xcLocalStorage.setItem(key, "true");
                            }
                        };
                        Alert.show({
                            title: warning.title,
                            msg: warning.msg,
                            isCheckBox: true,
                            onConfirm: (hasChecked) => {
                                writeChecked(hasChecked);
                                self.connectNodes(parentNodeId, childNodeId, connectorIndex, isReconnecting);
                            },
                            onCancel: (hasChecked) => {
                                writeChecked(hasChecked);
                            }
                        });
                    }
                } else {
                    self.connectNodes(parentNodeId, childNodeId,
                        connectorIndex, isReconnecting);
                }
            },
            onDragFail: (wasDragged: boolean) => {
                if (wasDragged) {
                    $candidates.removeClass("dropAvailable noDrop");
                    self.$dfArea.find(".secondarySvg").remove();
                    if (isReconnecting) {
                        self.graph.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }
                }
            },
            copy: true
        });
    }

    public nodeTitleEditMode($origTitle): void {
        if (this.dagTab instanceof DagTabExecuteOnly) {
            return;
        }
        const $operator = $origTitle.closest(".operator")
        const nodeId: DagNodeId = $operator.data("nodeid");
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }
        if (node instanceof DagNodeSQLFuncIn) {
            // not allow modify input node in sql mode
            return;
        }

        const origVal = node.getTitle();
        const onChange = (newVal) => {
            if (this.graph.hasNodeTitle(newVal)) {
                StatusBox.show(DagTStr.LabelTaken, $operator);
            } else {
                this.editNodeTitle(nodeId, newVal);
            }
        };
        this._editMode($origTitle, origVal, [], onChange);
    }

    public graphHeadEditMode($origTitle): void {
        const $operator = $origTitle.closest(".operator")
        const nodeId: DagNodeId = $operator.data("nodeid");
        const node:DagNodeIn = <DagNodeIn>this.graph.getNode(nodeId);
        if (node == null) {
            return;
        }

        if (!(node instanceof DagNodeIn)) {
            return;
        }
        const origVal = node.getHead();
        const onChange = (newVal) => {
            newVal = newVal.trim();
            if (!newVal) {
                StatusBox.show(ErrTStr.NoEmpty, $operator);
            } else if (this.graph.hasHead(newVal)) {
                StatusBox.show(DagTStr.HeadTaken, $operator);
            } else {
                node.setHead(newVal, true);
            }
        };
        this._editMode($origTitle, origVal, ["graphHeadEdit"], onChange);
    }

    private _editMode($origTitle: JQuery, origVal: string, classes: string[], onChange: Function): void {
        const rect = $origTitle[0].getBoundingClientRect();
        const offset = this._getDFAreaOffset();
        let left;
        let minWidth;
        let maxWidth;
        if (classes.indexOf("graphHeadEdit") > -1) {
            left = rect.left + offset.left;
            minWidth = 20;
            maxWidth = 164;
        } else {
            left = rect.left + offset.left + (rect.width / 2);
            minWidth = DagView.nodeWidth - 20;
        }
        const top = rect.top + offset.top;
        const classNames = classes.join(" ");
        let html: HTML = `<textarea class="editableNodeTitle ${classNames}" spellcheck="false"
                    style="top:${top}px;left:${left}px;">${origVal}</textarea>`;
        let $textArea = $(html);
        $origTitle.closest(".dataflowAreaWrapper").append($textArea);
        sizeInput();
        $textArea.focus()
        $textArea.selectAll();
        $origTitle.hide();

        $textArea.blur(() => {
            handleClose();
        });

        $textArea.on("input", sizeInput);
        $textArea.on("keydown", (event) => {;
            if (event.which === keyCode.Enter) {
                if (classes.indexOf("graphHeadEdit") > -1) {
                    handleClose();
                }
            }
        });
        function handleClose() {
            const newVal: string = $textArea.val().trim();
            $textArea.remove();
            $origTitle.show();

            if (!newVal || newVal === origVal) {
                return;
            }
            onChange(newVal);
        }
        function sizeInput() {
            if (!$textArea.is(":visible")) return; // ENG-8642
            $textArea.height(DagView.titleLineHeight);
            $textArea.width(minWidth);
            if ($textArea[0].scrollWidth > $textArea.width()) {
                let width = $textArea[0].scrollWidth + 1;
                if (maxWidth) {
                    width = Math.min(width, maxWidth);
                }
                $textArea.width(width);
            }
            if ($textArea[0].scrollHeight > $textArea.height()) {
                $textArea.height($textArea[0].scrollHeight);
            }
        }
    }

    /**
     *
     * @param nodeId
     * @param title
     */
    public editNodeTitle(
        nodeId: DagNodeId,
        title: string
    ): XDPromise<void> {
        const node = this.graph.getNode(nodeId);
        if (node == null) {
            return PromiseHelper.reject();
        }
        const oldTitle = node.getTitle();
        const $node = this._getNode(nodeId);
        this.dagTab.turnOffSave();

        node.setTitle(title, true);
        this._drawTitleText($node, node);

        // XXX TODO: update paramTitle's height
        Log.add(SQLTStr.EditNodeTitle, {
            "operation": SQLOps.EditNodeTitle,
            "dataflowId": this.tabId,
            "oldTitle": oldTitle,
            "newTitle": title,
            "nodeId": nodeId
        });

        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    // show warning if connecting to sort node and sort node is not terminal node
    private _connectionWarning(childNodeId: DagNodeId, parentNodeId: DagNodeId): {
        title: string,
        msg: string
    } {
        const childNode = this.graph.getNode(childNodeId);
        const parentNode = this.graph.getNode(parentNodeId);
        if (childNode == null || parentNode == null) {
            return null;
        }
        const childType = childNode.getType();

        if (parentNode.getType() === DagNodeType.Sort &&
            (childType !== DagNodeType.Export &&
                childType !== DagNodeType.PublishIMD)) {
            return {
                title: DagTStr.SortConnectWarningTitle,
                msg: DagTStr.SortConnectWarning
            }
        // }else if (childNode.getMaxParents() !== 1 && childNode.getParents().length > 1) {
        //     return {
        //         title: "Combine Graph",
        //         msg: "Unifying functions will result in a single function name."
        //     }
        } else if (parentNode.getType() === DagNodeType.Custom &&
                   parentNode.getChildren().length) {
            return {
                title: ErrorMessageTStr.title,
                msg: DagTStr.CustomOpTooManyConnections
            }
        } else {
            return null;
        }
    }

    private _getDFAreaOffset() {
        const containerRect = this.$dfArea[0].getBoundingClientRect();
        const offsetTop = this.$dfArea.scrollTop() - containerRect.top;
        const offsetLeft = this.$dfArea.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }


    /**
     * DagView.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * @param isReconnect
     * connects 2 nodes and draws line
     */
    public connectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isReconnect?: boolean,
        spliceIn?: boolean,
        identifiers?: Map<number, string>,
        setNodeConfig?: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[]
    ): XDPromise<void> {
        if (this.dagTab instanceof DagTabExecuteOnly) {
            return PromiseHelper.reject();
        }
        this.dagTab.turnOffSave();
        this._connectNodesNoPersist(parentNodeId, childNodeId, connectorIndex,  {
            isReconnect: isReconnect,
            spliceIn: spliceIn,
            identifiers: identifiers,
            setNodeConfig: setNodeConfig
        });
        this.dagTab.turnOnSave();
        return this.dagTab.save();
    }

    private _connectNodesNoPersist(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        options?: {
            isReconnect?: boolean,
            spliceIn?: boolean,
            isSwitchState?: boolean,
            isNoLog?: boolean,
            identifiers?: Map<number, string>,
            setNodeConfig?: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[],
            svg?: d3
        }
    ): LogParam {
        const {
            isReconnect = false, isSwitchState = true, isNoLog = false,
            spliceIn = false, svg = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg')
        } = options || {};
        let prevParentId = null;
        if (isReconnect) {
            const $curEdge = this.$dfArea.find('.edge[data-childnodeid="' +
                childNodeId +
                '"][data-connectorindex="' +
                connectorIndex + '"]');
            prevParentId = $curEdge.data("parentnodeid");
            this.graph.disconnect(prevParentId, childNodeId, connectorIndex);

            this._removeConnection($curEdge, childNodeId);
        }

        this.graph.connect(parentNodeId, childNodeId, connectorIndex, false, isSwitchState,
            spliceIn);
        const childNode = this.graph.getNode(childNodeId);
        this._drawConnection(parentNodeId, childNodeId, connectorIndex, childNode.canHaveMultiParents(), svg, true);
        childNode.setIdentifiers(options.identifiers);
        if (options.setNodeConfig && childNode != null) {
            (<DagNodeSet> childNode).reinsertColumn(options.setNodeConfig, connectorIndex);
        }

        const logParam: LogParam = {
            title: SQLTStr.ConnectOperations,
            options: {
                "operation": SQLOps.ConnectOperations,
                "dataflowId": this.tabId,
                "parentNodeId": parentNodeId,
                "childNodeId": childNodeId,
                "connectorIndex": connectorIndex,
                "prevParentNodeId": prevParentId,
                "spliceIn": spliceIn
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    // draws node, does not affect the DagGraph
    private _addNodeNoPersist(
        node,
        options?: {
            isNoLog?: boolean,
            $svg?: JQuery,
            noViewOutput?: boolean,
            notSelected?: boolean
        }
    ): LogParam {
        options = options || {};
        let isNoLog = options.isNoLog || false;

        if (this._hasInstructionNode) {
            this.$dfArea.find(".operator.instruction").remove();
            this._hasInstructionNode = false;
        }
        let select = true;
        if (options.notSelected) {
            select = false;
        }

        this._deselectAllNodes();
        const nodeId = node.getId();
        const $node = this._drawNode(node, select, options.$svg != null, options.noViewOutput);
        if (options.$svg) {
            $node.appendTo(options.$svg);
        }
        if (!options.notSelected) {
            DagNodeInfoPanel.Instance.show(node);
        }
        this._setGraphDimensions(xcHelper.deepCopy(node.getPosition()))

        const logParam: LogParam = {
            title: SQLTStr.AddOperation,
            options: {
                "operation": SQLOps.AddOperation,
                "dataflowId": this.tabId,
                "nodeId": nodeId
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }


    private _drawAndConnectNodes(
        nodes: DagNode[]
    ): void {
        for (let i = 0; i < nodes.length; i++) {
            this._drawNode(nodes[i]);
        }
        this._drawAllNodeConnections(nodes);
    }

    private _drawAllNodeConnections(nodes: DagNode[]): void {
        const drawnConnections = {};
        const svg: d3 = d3.select(this.containerSelector + ' .dataflowArea[data-id="' + this.tabId + '"] .edgeSvg');
        nodes.forEach((node) => {
            const nodeId = node.getId();
            node.getParents().forEach((parentNode, index) => {
                const connectionId = parentNode.getId() + "-" + nodeId + "-" + index;
                if (drawnConnections[connectionId]) {
                    return;
                }
                drawnConnections[connectionId] = true;
                this._drawConnection(parentNode.getId(), nodeId, index, node.canHaveMultiParents(), svg);
            });

            const seen = {};
            node.getChildren().forEach((childNode) => {
                const childNodeId = childNode.getId();
                if (seen[childNodeId]) {
                    // node's child will connect to all indices of parent
                    // so don't repeat if we see this child again
                    return;
                }
                seen[childNodeId] = true;
                childNode.getParents().forEach((parent, index) => {
                    if (parent === node) {
                        const connectionId = nodeId + "-" + childNode.getId() + "-" + index;
                        if (drawnConnections[connectionId]) {
                            return;
                        }
                        drawnConnections[connectionId] = true;
                        this._drawConnection(nodeId, childNode.getId(), index, childNode.canHaveMultiParents(), svg);
                    }
                });
            });
        });
    }

    private _convertInNodeForSQLFunc(nodeInfo: DagNodeCopyInfo): DagNodeCopyInfo {
        try {
            let dagNode: DagNode = DagNodeFactory.create({
                type: nodeInfo.type,
                id: nodeInfo.nodeId,
                input: nodeInfo.input
            });
            if (dagNode.isSourceNode()) {
                let sqlFuncIn: DagNodeSQLFuncIn = <DagNodeSQLFuncIn>DagNodeFactory.create({
                    type: DagNodeType.SQLFuncIn,
                    id: dagNode.getId(),
                    display: nodeInfo.display
                });
                if (dagNode instanceof DagNodeIMDTable) {
                    let source = dagNode.getSource();
                    if (source) {
                        sqlFuncIn.setParam({source: source}, true);
                    }
                }
                return sqlFuncIn.getNodeCopyInfo();
            } else {
                return nodeInfo;
            }
        } catch (e) {
            console.error(e);
            return nodeInfo;
        }
    }
    // in case tooltip rows are incorrect when previewing table
    public syncProgressTip(nodeId: string, numRows: number) {
        let node = this.graph.getNode(nodeId);
        if (node && node.syncStats(numRows)) {
            this.$dfArea.find('.runStats[data-id="' + nodeId + '"]')
                        .find(".rows")
                        .text(xcStringHelper.numToStr(numRows));
            const nodeInfo = {
                position: node.getPosition()
            };
            this._repositionProgressTooltip(nodeInfo, node.getId());
            this.dagTab.save();
        }
    }

    private _showRunningNode($tip: JQuery): void {
        try {
            // if (DagViewManager.Instance.getActiveDagView() !== this) {
            //     DagGraphBar.Instance.setRunningNode(null, null, null);
            //     return;
            // }
            if (!$tip.hasClass(DgDagStateTStr[DgDagStateT.DgDagStateProcessing])) {
                DagGraphBar.Instance.setRunningNode(null, null, null);
                return;
            }
            const nodeId = $tip.data("id");
            const tab = this.getTab();
            const tabId = tab.getId();
            const node = tab.getGraph().getNode(nodeId);
            const label = node.getTitle();
            DagGraphBar.Instance.setRunningNode(tabId, nodeId, label);
        } catch (e) {
            console.error("focus on running operator error", e);
            DagGraphBar.Instance.setRunningNode(null, null, null);
        }
    }

    private _shouldShowModuleTableIcon(node: DagNodeModule) {
        let tailNodes = node.getTailNodes();
        if (tailNodes.length === 1 && tailNodes[0] instanceof DagNodeExport) {
            return false;
        }
        return true;
    }
}