class DagCategoryBar {
    private static _instance: DagCategoryBar;
    private _isSQLFunc: boolean;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $dagView: JQuery;
    private $categoryBar: JQuery;
    private $operatorBar: JQuery;
    private dagCategories: DagCategories;
    private currentCategory: DagCategoryType;
    private _listScrollers: ListScroller[] = [];
    private selectedOpId: string;
    private _closeBarTimer: NodeJS.Timeout;
    private _selectCategoryTimer: NodeJS.Timeout;
    private _showBarTimer: NodeJS.Timeout;
    private _textColor = "#000000";
    private _edgeColor = "#627483";
    private _borderColor = "#849CB0";
    private _selectedColor = "#EAF9FF";
    private _selectedBorderColor = "#EAF9FF";
    private _connectorColor = "#BBC7D1";
    private _nodeFillColor = "#FFFFFF";
    private _tableBackColor = "#FFFFFF";

    constructor() {
        this.$dagView = $("#dagView");
        this.$categoryBar = this.$dagView.find(".categorySection");
        this.$operatorBar = this.$dagView.find(".operatorWrap");
        this._isSQLFunc = false;
        if (xcGlobal.darkMode) {
            this._textColor = "#FFFFFF";
            this._nodeFillColor = "#424242";
            this._tableBackColor = "#181818";
            this._borderColor = "#C9C9C9";
            this._edgeColor = "#C9C9C9";
            this._selectedColor = "rgba(150, 225, 255, 0.2)";
            this._selectedBorderColor = "rgba(0, 188, 255, 0.78)";
            this._connectorColor = "#181818";
        }
    }

    public setup(): void {
        this.dagCategories = new DagCategories();
        this._setupCategoryBar();
        this._setupDragDrop();
        this._setupScrolling();
        this._setupSearch();
        this._setupOperatorBar();
        // Activate the favorites category by default
        this._focusOnCategory(DagCategoryType.In);
        this.showOrHideArrows();
    }

    public updateCategories(dagTab: DagTab): void {
        let heading
        if (dagTab instanceof DagTabProgress ||
            dagTab instanceof DagTabExecuteOnly  ||
            dagTab instanceof DagTabSQL) {
            heading = "Physical Plan";
        } else {
            heading = "Logical Plan";
        }
        this.$dagView.find(".categoryBar .sectionHeader").text(heading);

        let sqlFunc: boolean = (dagTab instanceof DagTabSQLFunc);
        if (this._isSQLFunc === sqlFunc) {
            // no need to update
            return;
        }
        this._isSQLFunc = sqlFunc;
        this.dagCategories.update(sqlFunc);
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);

    }

    public loadCategories(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.dagCategories.loadCategories()
        .then(() => {
            this._renderOperatorBar();
            this._focusOnCategory(this.currentCategory);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public showOrHideArrows(): void {
        const $catWrap: JQuery = this.$dagView.find(".categoryWrap");
        if ($catWrap.width() < $catWrap[0].scrollWidth) {
            this.$categoryBar.addClass("scrollable");
        } else {
            this.$categoryBar.removeClass("scrollable");
        }
    }

    /**
     * Add a operator on-the-fly
     * @param categoryName category type
     * @param dagNode DagNode object of the operator
     * @param isHidden OPTIONAL(default = false). Hide/Show in the category bar.
     * @param isFocusCategory OPTIONAL(default = true). If set focus to the category, which the newly added operator belongs to.
     * @returns Display name of the operator
     */
    public addOperator(props: {
        categoryType: DagCategoryType,
        dagNode: DagNode,
        isHidden?: boolean,
        isFocusCategory?: boolean
    }): XDPromise<string> {
        const { categoryType, dagNode, isHidden = false, isFocusCategory = true } = props;

        // Find the category data structure
        const targetCategory = this._getCategoryByType(categoryType);
        if (targetCategory == null) {
            return PromiseHelper.reject(`Category ${categoryType} not found`);
        }

        // Add operater to category
        targetCategory.add(DagCategoryNodeFactory.create({
            dagNode: dagNode, categoryType: categoryType, isHidden: isHidden
        }));

        // Defaut name
        let newName: string = dagNode.getType();
        if (targetCategory instanceof DagCategoryCustom) {
            if (dagNode instanceof DagNodeCustom) {
                newName = targetCategory.genOperatorName(dagNode.getCustomName());
                dagNode.setCustomName(newName);
            }
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(isFocusCategory? categoryType: this.currentCategory);

        // Persist the change
        return this._saveCategories()
        .then(() => {
            DagNodeMenu.updateCategories();
           return newName
        });
    }

    /**
     * Update the connectorIn UI of a node
     * @param numParents
     * @param rect
     */
    public updateNodeConnectorIn(numParents: number, elemNode: d3): void {
        const params = this._getConnectorInParams(numParents);
        const elemConnIn = elemNode.select('.connInGroup');
        elemConnIn.select("g").remove(); // .empty doesnt work for some reason

        for (const param of params) {
            let g = elemConnIn.append('g');
            g.attr("class", "connIn");

            let square = param.largeSquare;
            let elemRect = g.append('rect');
            elemRect.attr('class', square.class.join(' '));
            for (const attrName of Object.keys(square.attrs)) {
                const attrValue = square.attrs[attrName];
                elemRect.attr(attrName, attrValue);
            }

            square = param.smallSquare;
            elemRect = g.append('rect');
            elemRect.attr('class', square.class.join(' '));
            for (const attrName of Object.keys(square.attrs)) {
                const attrValue = square.attrs[attrName];
                elemRect.attr(attrName, attrValue);
            }
        }
    }

    /**
     * Update the connectorOut UI of a node
     * @param numOutput
     * @param elemNode
     */
    public updateNodeConnectorOut(numOutput: number, elemNode: d3): void {
        const params = this._getConnectorOutParams(numOutput, true);
        const elemConnOut = elemNode.select('.connOut');

        elemConnOut.empty();
        for (const param of params) {
            let triangle = param.largeTriangle;
            let elemPolygon = elemConnOut.append('polygon');
            elemPolygon.attr('class', triangle.class.join(' '));
            for (const attrName of Object.keys(triangle.attrs)) {
                const attrValue = triangle.attrs[attrName];
                elemPolygon.attr(attrName, attrValue);
            }

            triangle = param.smallTriangle;
            elemPolygon = elemConnOut.append('polygon');
            elemPolygon.attr('class', triangle.class.join(' '));
            for (const attrName of Object.keys(triangle.attrs)) {
                const attrValue = triangle.attrs[attrName];
                elemPolygon.attr(attrName, attrValue);
            }
        }
    }

    public getCategories(): DagCategories {
        return this.dagCategories;
    }

    private _setupCategoryBar(): void {
        const self = this;
        this._renderCategoryBar();
        this._renderOperatorBar();

        this.$dagView.find(".categories").on("mousedown", ".category", (event) => {
            const $category: JQuery = $(event.currentTarget);
            const category: string = $category.data("category");
            clearTimeout(this._selectCategoryTimer);
            this._focusOnCategory(category);
            clearTimeout(self._closeBarTimer);
            clearTimeout(self._showBarTimer);
            this.showOperatorBar();
        });

        this.$dagView.find(".categories").on("mouseenter", ".category", (event) => {
            const $category: JQuery = $(event.currentTarget);
            const category: string = $category.data("category");
            clearTimeout(this._selectCategoryTimer);
            let delayTime: number;
            if (this.$dagView.hasClass("showingOperatorBar")) {
                delayTime = 250;
            } else {
                delayTime = 400;
            }
            this._selectCategoryTimer = setTimeout(() => {
                this._focusOnCategory(category);
            }, delayTime);
        });

        this.$dagView.find(".categories").on("mouseleave", ".category", () => {
            clearTimeout(this._selectCategoryTimer);
        });

        this.$categoryBar.mouseenter(() => {
            clearTimeout(self._closeBarTimer);
            clearTimeout(self._showBarTimer);
            this._showBarTimer = setTimeout(() => {
                this.showOperatorBar();
            }, 400);
        });

        this.$categoryBar.mouseleave(() => {
            clearTimeout(self._closeBarTimer);
            clearTimeout(self._showBarTimer);
            this._closeBarTimer = setTimeout(() => {
                this.hideOperatorBar();
            }, 500);
        });

        this.$dagView.find(".operatorBar").mouseenter(function() {
            clearTimeout(self._closeBarTimer);
            clearTimeout(self._showBarTimer);
            const index = $(this).find(".category").index($(this).find(".category.active"));
            self._showOrHideScrollers(index);
        });

        this.$dagView.find(".operatorBar").mouseleave(() => {
            clearTimeout(self._closeBarTimer);
            clearTimeout(self._showBarTimer);
            self._closeBarTimer = setTimeout(() => {
                this.hideOperatorBar();
            }, 500);
        });
    }

    public showOperatorBar() {
        this.$dagView.addClass("showingOperatorBar");
    }

    public hideOperatorBar() {
        this.$dagView.removeClass("showingOperatorBar");
    }

    public getCategoryIconMap() {
        const iconMap = {};
        iconMap[DagCategoryType.In] = "xi-data-in";
        iconMap[DagCategoryType.Out] = "xi-data-out";
        iconMap[DagCategoryType.SQL] = "xi-menu-sql";
        iconMap[DagCategoryType.ColumnOps] = "xi-tables-columnsicon";
        iconMap[DagCategoryType.RowOps] = "xi-server";
        iconMap[DagCategoryType.Join] = "xi-join-inner";
        iconMap[DagCategoryType.Set] = "xi-union";
        iconMap[DagCategoryType.Aggregates] = "xi-aggregate";
        iconMap[DagCategoryType.Custom] = "xi-custom";
        return iconMap;
    }

    private _renderCategoryBar() {
        let html: HTML = "";

        this.dagCategories.getCategories().forEach((category: DagCategory) => {
            const categoryType: DagCategoryType = category.getType();
            const categoryName: string = category.getName();
            const description: string = category.getDescription();
            html += `<div class="category category-${categoryType}"
                data-category="${categoryType}" ${xcTooltip.Attrs} data-original-title="${description}">
                <div class="innerCategory">
                    <span class="text">${categoryName}</span>
                </div>
            </div>`;
        });
        html += '<div class="spacer"></div>'; // adds right padding
        this.$dagView.find(".categories").html(html);
    }

    private _renderOperatorBar(): void {
        const self = this;
        let html: HTML = "";
        this.dagCategories.getCategories().forEach((category: DagCategory) => {
            const categoryType: string = category.getType();
            const operators: DagCategoryNode[] = category.getSortedOperators();

            let index = 0;
            let operatorHtml: HTML = "";
            operators.forEach((categoryNode: DagCategoryNode) => {
                operatorHtml += this._genOperatorHTML(categoryNode, {
                    x: 10 + index * (DagView.nodeWidth + 16),
                    y: 8
                });
                if (!categoryNode.isHidden()) {
                    index ++;
                }
            });
            const width = 10 + index * (DagView.nodeWidth + 16);
            html += `<div class="category category-${categoryType}">
                        <div class="svgWrap">
                            <svg version="1.1" height="100%" width="${width}">
                            ${operatorHtml}
                            </svg>
                        </div>
                        <div class="scrollArea top">
                            <i class="arrow icon xi-arrow-left"></i>
                        </div>
                        <div class="scrollArea bottom">
                            <i class="arrow icon xi-arrow-right"></i>
                        </div>
                    </div>`;
        });

        this.$operatorBar.html(html);
        this._listScrollers = [];
        this.$operatorBar.find(".category").each(function() {
            self._listScrollers.push(new ListScroller($(this),
                $(this).find(".svgWrap"), false, {
                    noPositionReset: true
                }));
        });
        if (this.selectedOpId != null) {
            this._setSelectedStyle(
                this.$operatorBar.find(`.operator[data-opid="${this.selectedOpId}"]`)
            );
        }
    }

    private _getConnectorOutParams(numOutput: number, hasTable: boolean) {
        let offset: number = hasTable ? DagView.nodeAndTableWidth : DagView.nodeWidth;
        offset -= 10;
        const params: {
            largeTriangle: {class: string[], attrs: {[attrName: string]: string}},
            smallTriangle: {class: string[], attrs: {[attrName: string]: string}},
        }[] = [];
        // ('<polygon class="connector out" ' +
        // 'points="95,8 103,14 95,20" fill="#BBC7D1" ' +
        // 'stroke="#849CB0" stroke-width="1" ry="1" rx="1" />')
        for (let i = 0; i < numOutput; i ++) {
            params.push({
                largeTriangle: {
                    class: ['connector', 'out'],
                    attrs: {
                        'points': `${offset},1 ${offset + 16},8, ${offset + 16},18, ${offset},${DagView.nodeHeight - 2}`,
                        'fill': 'transparent',
                        'stroke': 'transparent'
                    }
                },
                smallTriangle: {
                    class: ['connectorOutVisible'],
                    attrs: {
                        'points': `${offset + 2},7 ${offset + 10},13 ${offset + 2},19`,
                        'fill': this._connectorColor,
                        'stroke': this._borderColor, 'stroke-width': '1',
                        'rx': '1', 'ry': '1'
                    }
                }
            });
        }
        return params;
    }

    private _getConnectorInParams(numParents: number) {
        const params: {
            smallSquare: {class: string[], attrs: {[attrName: string]: string}},
            largeSquare?: {class: string[], attrs: {[attrName: string]: string}}
        }[] = [];

        if (numParents === 0) {
            // if no connector, still needs something that gives width
            // for positioning when dragging
            params.push({largeSquare: {
                    class: ['connectorSpace'],
                    attrs: {
                        'x': '0', 'y': '11', 'fill': 'none', 'stroke': 'none',
                        'width': '7', 'height': '7'
                    }
                },
                smallSquare: {
                    class: ['connectorInVisible'],
                    attrs: {
                        'x': '0', 'y': '10', 'fill': 'none', 'stroke': 'none',
                        'width': '7', 'height': '7'
                    }
                }
            });
        } else if (numParents === -1) {
            params.push({largeSquare: {
                    class: ['connector', 'in', 'noConnection', 'multi'],
                    attrs: {
                        'x': '-4', 'y': '2', 'fill': 'transparent', 'stroke': 'transparent',
                        'stroke-width': '1', 'rx': '1', 'ry': '1',
                        'width': '11', 'height': '24',
                        'data-index': '0',
                    }
                },
                smallSquare: {
                    class: ['connectorInVisible'],
                    attrs: {
                        'x': '0', 'y': '4', 'fill': this._connectorColor, 'stroke': this._borderColor,
                        'stroke-width': '1', 'rx': '1', 'ry': '1',
                        'width': '7', 'height': '18',
                        'data-index': '0',
                    }
                }
            });
        } else {
            for (let j = 0; j < numParents; j++) {
                const y = (((DagView.nodeHeight + 2) / (numParents + 1)) * (1 + j)) - 4.5;
                params.push({largeSquare: {
                    class: ['connector', 'in', 'noConnection'],
                    attrs: {
                        'x': '-4', 'y': `${y - 3}`, 'fill': 'transparent',
                        'stroke': 'transparent', 'stroke-width': '1',
                        'rx': '1', 'ry': '1', 'width': '11', 'height': '13',
                        'data-index': `${j}`,
                    }
                },
                smallSquare: {
                    class: ['connectorInVisible'],
                    attrs: {
                        'x': '0', 'y': `${y}`, 'fill': this._connectorColor,
                        'stroke': this._borderColor, 'stroke-width': '1',
                        'rx': '1', 'ry': '1', 'width': '7', 'height': '7',
                        'data-index': `${j}`,
                    }
                }
            });
            }
        }
        return params;
    }

    private _genConnectorInHTML(numParents: number): HTML {
        const params = this._getConnectorInParams(numParents);

        let html = '';
        for (const param of params) {
            html = `${html}<g class="connIn">`;
            let square = param.largeSquare;
            let classes = square.class.join(' ');
            let attrs = Object.keys(square.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${square.attrs[attrName]}"`),
                '');
            html = `${html}<rect class="${classes}" ${attrs}></rect>`;

            square = param.smallSquare;
            classes = square.class.join(' ');
            attrs = Object.keys(square.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${square.attrs[attrName]}"`),
                '');
            html = `${html}<rect class="${classes}" ${attrs}></rect></g>`;
        }
        return html;
    }

    private _genConnectorOutHTML(numOutput: number, hasTable: boolean): HTML {
        const params = this._getConnectorOutParams(numOutput, hasTable);

        let html = '';
        for (const param of params) {
            let triangle = param.largeTriangle;
            let classes = triangle.class.join(' ');
            let attrs = Object.keys(triangle.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${triangle.attrs[attrName]}"`),
                '');
            html = `${html}<polygon class="${classes}" ${attrs}></polygon>`;

            triangle = param.smallTriangle;
            classes = triangle.class.join(' ');
            attrs = Object.keys(triangle.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${triangle.attrs[attrName]}"`),
                '');
            html = `${html}<polygon class="${classes}" ${attrs}></polygon>`;
        }

        return html;
    }

    private _genOperatorHTML(categoryNode: DagCategoryNode, pos: { x, y }): string {
        const categoryName: DagCategoryType = categoryNode.getCategoryType();
        const operator: DagNode = categoryNode.getNode();
        let numParents: number = operator.getMaxParents();
        let numChildren: number = operator.getMaxChildren();
        const operatorName: string = categoryNode.getNodeType();
        let opDisplayName: string = categoryNode.getDisplayNodeType();
        const subType: string = categoryNode.getNodeSubType();
        const subTypeDisplayName: string = categoryNode.getDisplayNodeSubType();
        // const color: string = categoryNode.getColor();
        // const icon: string = categoryNode.getIcon();
        const description: string = categoryNode.getDescription();

        let table = "";
        let hasTable: boolean = false;
        if (!(operator instanceof DagNodeExport) &&
            !(operator instanceof DagNodePublishIMD) &&
            !(operator instanceof DagNodeInstruction) &&
            !(operator instanceof DagNodeDFOut)
        ) {
            hasTable = true;
            table = '<g class="table" transform="translate(' + (DagView.nodeWidth + 24) + ', 0)" display="none">' +
                        '<path class="tableLine" stroke="' + this._edgeColor + '" stroke-width="1px" fill="none" stroke-linecap="round" d="M-35,14L16,14"></path>' +
                        '<rect x="-1" y="1" width="25" height="25" fill=" ' + this._tableBackColor + '" ry="1" rx="1" />'+
                        '<text class="mainTableIcon" font-family="icomoon" font-size="27" x="-2" y="' + (DagView.nodeHeight - 1) + '" ' + xcTooltip.Attrs + ' data-original-title="Click to view options">\uea81</text>' +
                        '<text class="tableName" x="12" y="37" ' +
                        'text-anchor="middle" alignment-baseline="middle" font-family="Open Sans" ' +
                        'font-size="10" fill="' + this._textColor + '">' +
                        '</text>' +
                    '</g>';
        }
        if (subType) {
            opDisplayName = subTypeDisplayName;
        }

        if (numChildren === -1) {
            numChildren = 1;
        }

        const inConnector = this._genConnectorInHTML(numParents);
        const outConnector = this._genConnectorOutHTML(numChildren, hasTable);

        const opTitleHtml = this._formatOpTitle(opDisplayName);
        let connectorInClass = "";
        if (numParents === 0) {
            connectorInClass = " noIn";
        }

        const html = '<g class="operator ' + operatorName + ' ' +
            (categoryNode.isHidden() ? 'xc-hidden ' : '') +
            'category-' + categoryName + '" ' +
                'data-category="' + categoryName + '" ' +
                'data-type="' + operatorName + '" ' +
                'data-subtype="' + subType + '" ' +
                'data-opid="' +  operator.getId() + '" ' +
                'data-icons="" ' +
                'data-topicons="" ' +
                'transform="translate(' + pos.x + ',' + pos.y + ')" >' +
                '<g class="connInGroup ' + connectorInClass + '">' + inConnector + '</g>' +
                '<g class="connOut" transform="translate(-58,0)">' + outConnector + '</g>' +
                table +
            '<rect class="main" x="6" y="0" width="' + (DagView.nodeWidth - 13) + '" height="' + DagView.nodeHeight + '" ' +
                'fill="' + this._nodeFillColor + '" stroke="' + this._borderColor + '" stroke-width="1" ' +
                'ry="' + DagView.nodeHeight + '" rx="11" ' +
                xcTooltip.Attrs + ' data-original-title="' + description + '" />'+
            '<svg class="opTitleWrap" width="' + (DagView.nodeWidth - 2) + '" height="' + DagView.nodeHeight + '" x="1" y="1">' +
                opTitleHtml + '</svg>' +
            '<circle class="statusIcon" cx="' + (DagView.nodeWidth - 12) + '" cy="' + (DagView.nodeHeight - 2) + '" r="2.5" ' +
                'stroke="' + this._borderColor + '" stroke-width="0.5" fill="white" />' +
            '</g>';

        return html;
    }

    private _formatOpTitle(name): HTML {
        let html: HTML;
        // XXX arbritrary way to decide if name is too long for 1 line
        if (name.length > 9 && name.indexOf(" ") > -1) {
            const namePart1 = name.substring(0, name.lastIndexOf(" "));
            const namePart2 = name.slice(name.lastIndexOf(" ") + 1);
            html = '<text class="opTitle" x="50%" y="40%" ' +
            'text-anchor="middle"  font-family="Open Sans" ' +
            'font-size="10" fill="' + this._textColor + '">' + namePart1 +
            '</text>' +
            '<text class="opTitle" x="50%" y="80%" ' +
            'text-anchor="middle" font-family="Open Sans" ' +
            'font-size="10" fill="' + this._textColor + '">' + namePart2 +
            '</text>';

        } else {
            html = '<text class="opTitle" x="50%" y="60%" ' +
            'text-anchor="middle" font-family="Open Sans" ' +
            'font-size="10" fill="' + this._textColor + '">' + name +
            '</text>';
        }
        return html;
    }

    private _setupDragDrop(): void {
        const self = this;
        // dragging operator bar node into dataflow area
        this.$operatorBar.on("mousedown", ".operator .main", function(event) {
            if (DagViewManager.Instance.isDisableActions(true)) {
                return;
            }
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            const activeDag: DagGraph = DagViewManager.Instance.getActiveDag();
            if (activeDag == null) {
                return;
            }
            const $operator = $(this).closest(".operator");
            new DragHelper({
                event: event,
                $element: $operator,
                $container: self.$dagView,
                $dropTarget: self.$dagView.find(".dataflowArea.active .dataflowAreaWrapper"),
                round: DagView.gridSpacing,
                scale: activeDag.getScale(),
                padding: DagView.gridSpacing,
                onDragEnd: function(_$newNode, _event, data) {
                    const newNodeInfo: DagNodeInfo = self.getOperatorInfo(
                        $operator.data('opid')
                    );
                    newNodeInfo.display = {
                        x: data.coors[0].x,
                        y: data.coors[0].y
                    };
                    DagViewManager.Instance.newNode(newNodeInfo);
                },
                onDragFail: function(_wasDragged) {

                },
                copy: true
            });
        });

        this.$operatorBar.on("dblclick", ".operator .main", function() {
            if (DagViewManager.Instance.isDisableActions(true)) {
                return;
            }
            const $operator: JQuery = $(this).closest(".operator");

            const newNodeInfo: DagNodeCopyInfo = self.getOperatorInfo(
                $operator.data('opid')
            );
            const type: DagNodeType = newNodeInfo.type;
            const subType: DagNodeSubType = newNodeInfo.subType;
            DagViewManager.Instance.autoAddNode(type, subType, null, null, {
                autoConnect: true
            });
        });
    }

    private _setupOperatorBar(): void {
        this.$operatorBar.on('click', '.operator .main', (event) => {
            const $operator: JQuery = $(event.target).closest(".operator");
            const opInfo: DagNodeCopyInfo = this.getOperatorInfo(
                $operator.data('opid'));
            this._focusOnOperator(opInfo.id || opInfo.nodeId);

            if (opInfo.type === DagNodeType.Custom) {
                // Enable the action section
                this._enableActionSection(this.selectedOpId);
            }

            return false;
        });

        this.$operatorBar.on('click', () => {
            // Clear the current selection
            this._focusOnOperator(null);
            if (this.currentCategory === DagCategoryType.Custom) {
                // Disable the action section
                this._disableActionSection();
            }
        });

        this.$dagView.find(".operatorBar .unpin").on("click", () => {
            UserSettings.Instance.setPref("dfPinOperatorBar", false);
            UserSettings.Instance.commit(false);
            DagViewManager.Instance.pinOperatorBar(false);
            this.hideOperatorBar();
        });
        this.$dagView.find(".operatorBar .pin").on("click", () => {
            UserSettings.Instance.setPref("dfPinOperatorBar", true);
            UserSettings.Instance.commit(false);
            DagViewManager.Instance.pinOperatorBar(true);
        });
    }

    private _getNodeFromOpId(id: string): JQuery {
        return this.$operatorBar.find(`.operator[data-opid="${id}"]`)
    }

    private _setSelectedStyle($operator: JQuery): void {
        // '<rect class="selection" x="-4" y="-8" width="111" height="43" ' +
        // 'fill="#EAF9FF" stroke="#38CBFF" stroke-width="1" ' +
        // 'ry="43" rx="16" />';
        if ($operator.find('.selection').length > 0) {
            return;
        }
        const rect = d3.select($operator[0]).insert('rect', ':first-child');
        rect.classed('selection', true);
        rect.attr('x', '-4').attr('y', '-4')
            .attr('width', DagView.nodeWidth + 8).attr('height', DagView.nodeHeight + 8)
            .attr('fill', this._selectedColor).attr('stroke', this._selectedBorderColor).attr('stroke-width', '1')
            .attr('rx', '16').attr('ry', DagView.nodeHeight+ 8);
    }

    private _clearSelectedStyle($operator: JQuery): void {
        d3.select($operator[0]).selectAll('.selection').remove();
    }

    private _showActionSection(): void {
        const $elemAction = this.$dagView.find('.actionWrap');
        $elemAction.removeClass('xc-hidden');
    }

    private _hideActionSection(): void {
        const $elemAction = this.$dagView.find('.actionWrap');
        if (!$elemAction.hasClass('xc-hidden')) {
            $elemAction.addClass('xc-hidden');
        }
    }

    private _enableActionSection(opId: string): void {
        const category = this.dagCategories.getCategoryByNodeId(opId);

        // Enable the buttons
        const $elemActions = this.$dagView.find('.actionWrap .actions');
        $elemActions.removeClass('disabled');

        // Setup action button event listeners
        const $elemActionRename = $elemActions.find('.selRename');
        $elemActionRename.off();
        if (category != null) {
            $elemActionRename.on('click', () => {
                DagCustomRenameModal.Instance.show({
                    name: category.getOperatorById(opId).getDisplayNodeType(),
                    validateFunc: (newName) => {
                        return this._isValidOperatorName(category, newName);
                    },
                    onSubmit: (newName) => {
                        this._renameOperator(opId, newName);
                    }
                });
            });
        }

        const $elemActionDel = $elemActions.find('.selDel');
        $elemActionDel.off();
        $elemActionDel.on('click', () => {
            Alert.show({
                title: AlertTStr.SharedCustomOpDeleteTitle,
                msg: AlertTStr.ShardCustomOpDeleteMsg,
                onConfirm: () => {
                    this._deleteOperator(opId);
                }
            });
        });
    }

    private _disableActionSection(): void {
        // Diable the buttons
        const $elemActions = this.$dagView.find('.actionWrap .actions');
        if (!$elemActions.hasClass('disabled')) {
            $elemActions.addClass('disabled');
        }

        // Clear event listeners
        $elemActions.find('.selRename').off();
        $elemActions.find('.selDel').off();
    }

    private _setupScrolling(): void {
        const self = this;
        this.$dagView.find(".categoryScroll .arrow").mouseup(function() {
            const $catWrap = self.$dagView.find(".categoryWrap .categories");
            let $categories = self.$dagView.find(".categoryWrap .categories .category");
            if ($(this).hasClass("left")) {
                let $category = $categories.last();
                if ($category.data("category") === DagCategoryType.Hidden) {
                    // skip the hidden category
                    $catWrap.prepend($category.detach());
                }
                $categories = self.$dagView.find(".categoryWrap .categories .category");
                $category = $categories.last();
                $catWrap.prepend($category.detach());
            } else {
                let $category = $categories.eq(0);
                $catWrap.find(".spacer").before($category.detach());

                // skip the hidden category
                $categories = self.$dagView.find(".categoryWrap .categories .category");
                $category = $categories.eq(0);
                if ($category.data("category") === DagCategoryType.Hidden) {
                    // skip the hidden category
                    $catWrap.find(".spacer").before($category.detach());
                }
            }
        });
    }

    private _setupSearch(): void {
        const $seachArea: JQuery = this.$dagView.find(".categoryBar .searchArea");
        const $input: JQuery = $seachArea.find(".searchInput");
        const $ul: JQuery = $seachArea.find("ul");
        let operatorBarTimer: NodeJS.Timeout;
        const menuHelper: MenuHelper = new MenuHelper($seachArea, {
            bounds: '#' + this.$dagView.attr("id"),
            bottomPadding: 5
        });

        $input.on("input", () =>{
            if (!$input.is(":visible")) return; // ENG-8642
            const keyword = $input.val();
            if (keyword) {
                this._renderSearchList(keyword, $ul);
                menuHelper.openList();
                this._addMenuEvent(menuHelper);
            } else {
                menuHelper.hideDropdowns();
            }
            return false;
        });

        $ul.on("click", "li", (event) =>  {
            const $li: JQuery = $(event.currentTarget);
            const category = $li.data("category");
            const opId = $li.data("opid");
            menuHelper.hideDropdowns();
            this._focusOnCategory(category);
            this._focusOnOperator(opId);
            this.$dagView.addClass("operatorBarLocked");
            clearTimeout(operatorBarTimer);
            operatorBarTimer = setTimeout(() => {
                this.$dagView.removeClass("operatorBarLocked");
            }, 3000);
        });
    }

    private _addMenuEvent(menuHelper: MenuHelper): void {
        $(document).off("click.CategoryBarSearch");
        $(document).on('click.CategoryBarSearch', (event) => {
            if ($(event.currentTarget).closest(".searchArea").length === 0) {
                menuHelper.hideDropdowns();
                $(document).off("click.CategoryBarSearch");
            }
        });
    }

    private _renderSearchList(keyword: string, $ul: JQuery): void {
        keyword = keyword.toLowerCase();

        let html: HTML = "";
        this.dagCategories.getCategories().forEach((category) => {
            if (category.getType() === DagCategoryType.Hidden) {
                return;
            }
            category.getOperators().forEach((categoryNode) => {
                if (categoryNode.isHidden()) {
                    return;
                }
                const text: string = categoryNode.getDisplayNodeSubType() ||
                categoryNode.getDisplayNodeType();
                if (text.toLowerCase().includes(keyword)) {
                    const categoryType = categoryNode.getCategoryType();
                    const opId = categoryNode.getNode().getId();
                    html += `<li data-category="${categoryType}" data-opid="${opId}">${text}</li>`;
                }
            });
        });

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $ul.html(html);
    }

    public getOperatorInfo(nodeId: string): DagNodeCopyInfo {
        for (const category of this.dagCategories.getCategories()) {
            for (const categoryNode of category.getOperators()) {
                if (categoryNode.getNode().getId() === nodeId) {
                    return categoryNode.getNode().getNodeCopyInfo();
                }
            }
        }
        return null;
    }

    public deleteOperator(nodeId: DagNodeId): XDPromise<void> {
        return this._deleteOperator(nodeId);
    }

    private _deleteOperator(nodeId: DagNodeId): XDPromise<void> {
        // Delete from categories
        for (const category of this.dagCategories.getCategories()) {
            if (category.removeOperatorById(nodeId)) {
                break;
            }
        }

        // Clear the current selection
        if (nodeId === this.selectedOpId) {
            this.selectedOpId = null;
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);
        DagNodeMenu.updateCategories();
        // Persist the change
        return this._saveCategories();
    }

    public isValidOperatorName(category: DagCategory, newName: string): boolean {
        return this._isValidOperatorName(category, newName);
    };

    private _isValidOperatorName(category: DagCategory, newName: string): boolean {
        // Validate inputs
        if (category == null || newName == null || newName.length === 0) {
            console.error(`Invalid inputs: "${category}", "${newName}"`);
            return false;
        }

        // Validate name
        if (category.isExistOperatorName(newName)) {
            return false;
        }

        return true;
    }

    public renameOperator(nodeId: DagNodeId, newName: string): XDPromise<void> {
        return this._renameOperator(nodeId, newName);
    }

    private _renameOperator(nodeId: DagNodeId, newName: string): XDPromise<void> {
        const targetCategory = this.dagCategories.getCategoryByNodeId(nodeId);
        if (targetCategory == null) {
            return PromiseHelper.reject('Category not found');
        }

        // Validate name
        if (!this._isValidOperatorName(targetCategory, newName)) {
            return PromiseHelper.reject('Invalid name');
        }

        // Rename
        if (!targetCategory.renameOperatorById(nodeId, newName)) {
            return PromiseHelper.reject('Rename failed');
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);
        DagNodeMenu.updateCategories();
        // Persist the change
        return this._saveCategories();
    }

    private _saveCategories(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dagCategories.saveCategories()
        .then(() => {
            XcSocket.Instance.sendMessage("refreshDagCategory");
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _getCategoryByType(categoryType: DagCategoryType): DagCategory {
        let targetCategory = null;
        for (const category of this.dagCategories.getCategories()) {
            if (category.getType() === categoryType) {
                targetCategory = category;
                break;
            }
        }
        return targetCategory;
    }

    private _focusOnCategory(category: string) {
        this.currentCategory = <DagCategoryType>category;
        if (category === DagCategoryType.Custom) {
            this._showActionSection();

            let isCustom: boolean = false;
            if (this.selectedOpId != null) {
                const $operator: JQuery = this._getNodeFromOpId(this.selectedOpId);
                if ($operator.length && $operator.data("type") === DagNodeType.Custom) {
                    isCustom = true;
                }
            }

            if (isCustom) {
                this._enableActionSection(this.selectedOpId);
            } else {
                this._disableActionSection();
            }
        } else {
            this._hideActionSection();
        }
        const $categories: JQuery = this.$dagView.find(".categories");
        $categories.find(".category").removeClass("active");
        $categories.find(".category.category-" + category).addClass("active");
        this.$operatorBar.find(".category").removeClass("active");
        const $category = this.$operatorBar.find(".category.category-" + category);
        $category.addClass("active");
        const index = this.$operatorBar.find(".category").index($category);
        this._showOrHideScrollers(index);
    }

    private _focusOnOperator(opId: string): void {
        // Clear the current selection
        if (this.selectedOpId != null) {
            this._clearSelectedStyle(
                this._getNodeFromOpId(this.selectedOpId)
            );
            this.selectedOpId = null;
        }

        // Select the node clicked on
        if (opId != null) {
            this.selectedOpId = opId;
            this._setSelectedStyle(this._getNodeFromOpId(opId));
        }
    }

    private _showOrHideScrollers(index: number): void {
        if (this._listScrollers[index]) {
            this._listScrollers[index].showOrHideScrollers();
        }
    }
}


if (typeof exports !== 'undefined') {
    exports.DagCategoryBar = DagCategoryBar;
};

if (typeof runEntity !== "undefined") {
    runEntity.DagCategoryBar = DagCategoryBar;
}