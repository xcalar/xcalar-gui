namespace SqlQueryHistoryPanel {
    export class DynaTable<TData> {
        protected _container: HTMLElement;
        protected _columnsToShow: TableColumnCategory[];
        protected _tableDef: TableDefinition<TData>;
        protected _defaultSorting: TableSortMethod;
        protected _numRowsToShow: number;
        protected _enableAutoRefresh: () => boolean;
        protected _msRefreshDuration: number;

        protected _data: TData[] = [];
        protected _selectSet: Set<string> = new Set();
        protected _currentSorting: TableSortMethod;
        protected _refreshTimer;
        protected _resizeState: {
            headerWidth: number[],
            bodyWidth: number[]
        };
        protected _resizeHandlers: (()=>void)[][];
        protected _getSizeHandlers: { header: ()=>number, body: ()=>number }[];

        protected _templateMgr = new OpPanelTemplateManager();
        protected _templates = {
            table:
                `<div class="flexTable">
                    <APP-HEADER></APP-HEADER>
                    <APP-BODY></APP-BODY>
                </div>`,
            headerColumnRegular:
                `<div class="col {{cssClass}}" style="{{cssStyle}}"><span class="label">{{title}}</span></div>`,
            headerColumnSortable:
                `<div class="col col-sort {{cssClass}}" (click)="onClickSort" style="{{cssStyle}}"><span class="label">{{title}}</span><div class="sort"><i class="icon fa-8 {{sortOrderClass}}"></i></div></div>`,
            headerColumnCheckbox:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">
                    <div class="checkbox {{cssChecked}}" (click)="onClick">
                        <i class="icon xi-ckbox-empty fa-15"></i>
                        <i class="icon xi-ckbox-selected fa-15"></i>
                    </div>
                </div>`,
            headerColumnSortableNoSort:
                `<div class="col col-sort {{cssClass}}" (click)="onClickSort" style="{{cssStyle}}"><span class="label">{{title}}</span><div class="sort sort-none">
                    <span class="sortIconWrap"><i class="icon fa-7 xi-arrow-up"></i></span>
                    <span class="sortIconWrap"><i class="icon fa-7 xi-arrow-down"></i></span>
                </div></div>`,
            header:
                `<div class="row row-header"><APP-HEADERCOLUMNS></APP-HEADERCOLUMNS></div>`,
            bodyColumnStatus:
                `<div class="col {{cssClass}}" style="{{cssStyle}}"><i class="icon xi-solid-circle {{iconClass}}"></i>{{text}}</div>`,
            bodyColumnText:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">{{text}}</div>`,
            bodyColumnTextTooltip:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">
                    <span data-toggle="tooltip" data-placement="auto top" data-container="body" data-original-title="{{tooltip}}">{{text}}</span>
                </div>`,
            bodyColumnElpsText:
                `<div class="col {{cssClass}}" style="{{cssStyle}}"><span class="elps-text">{{text}}</span></div>`,
            bodyColumnElpsTextTooltip:
                `<div class="col {{cssClass}}">
                    <span class="elps-text" style="{{cssStyle}}" data-toggle="tooltip" data-placement="auto top" data-container="body" data-original-title="{{tooltip}}">{{text}}</span>
                </div>`,
            bodyColumnElpsTextLink:
                `<div class="col link {{cssClass}}" style="{{cssStyle}}"><span class="elps-text" (click)="onLinkClick">{{text}}</span></div>`,
            bodyColumnIconLink:
                `<div class="col link {{cssClass}}" style="{{cssStyle}}">
                    <span class="iconLinkWrap" (click)="onLinkClick" data-toggle="tooltip" data-placement="auto top" data-container="body" data-original-title="{{text}}"><i class="icon {{iconClass}}"></i></span>
                </div>`,
            bodyColumnCheckbox:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">
                    <div class="checkbox {{cssChecked}}" (click)="onClick">
                        <i class="icon xi-ckbox-empty fa-15"></i>
                        <i class="icon xi-ckbox-selected fa-15"></i>
                    </div>
                </div>`,
            bodyRow:
                `<div class="row"><APP-BODYCOLUMNS></APP-BODYCOLUMNS></div>`,
            body:
                `<div class="body"><APP-BODYROWS></APP-BODYROWS></div>`
        };

        protected _sortOrderMapping = {};
        protected _headerTitleMapping = {};
        protected _headerCssMapping = {};
        protected _statusMapping = {};
        protected _bodyColumnBuilder = {};
        protected _sqlStatusString = {};
        protected _columnResizeDef: Map<string, { minWidth: number }> = new Map();

        /**
         * Constructor
         * @param columnsToShow Columns will be shown in the list order
         * @param tableDef Definition of each columns(such as how to sort a column, how to convert the data to the value being shown in the table ...)
         * @param defaultSorting
         * @param numRowsToShow Number of rows to show in the table. -1 = no limit
         * @param container The container HTML element in which the table will be rendered
         */
        constructor(props: {
            columnsToShow: TableColumnCategory[],
            tableDef: TableDefinition<TData>,
            defaultSorting: TableSortMethod,
            numRowsToShow?: number,
            enableAutoRefresh?: () => boolean,
            msRefreshDuration?: number,
            container: HTMLElement
        }) {
            this._setupStaticMapping();
            this._setupColumnMapping();

            const {
                columnsToShow, tableDef, container, defaultSorting,
                numRowsToShow = 200, enableAutoRefresh, msRefreshDuration = 2000
            } = props;
            this._columnsToShow = columnsToShow;
            this._tableDef = tableDef;
            this._defaultSorting = defaultSorting;
            this._currentSorting = defaultSorting;
            this._numRowsToShow = numRowsToShow;
            this._enableAutoRefresh = enableAutoRefresh;
            this._msRefreshDuration = msRefreshDuration;

            this._resizeState = {
                headerWidth: new Array(columnsToShow.length),
                bodyWidth: new Array(columnsToShow.length)
            };
            this._resizeHandlers = new Array(columnsToShow.length);
            this._getSizeHandlers = new Array(columnsToShow.length);

            this._container = container;
        }

        /**
         * Show the table UI according to the data passed in
         * @param data A list of data to be shown in the table
         * @param options
         */
        public show(data: TData[], options?: {
            isClearSorting?: boolean
        }) {
            const { isClearSorting = false } = options || {};

            // Setup the sorting
            if (isClearSorting) {
                this._currentSorting = this._defaultSorting;
            }

            // Store the raw data
            this._data = data.filter((v) => (v != null))
                .map((v) => xcHelper.deepCopy(v));

            // Update the UI
            this._updateUI();

            // Setup auto refresh
            if (this._enableAutoRefresh != null) {
                // if (this._refreshTimer == null) {
                //     this._refreshTimer = setInterval( () => {
                //         if (this._enableAutoRefresh()) {
                //             this._updateUI();
                //         }
                //     }, this._msRefreshDuration);
                // }
            }
        }

        protected _updateUI() {
            // Get the current column size && clean up the handlers
            this._updateColumnSize();
            this._clearGetSizeHandlers();

            // Clean up the resize handlers
            this._clearResizeHandlers();

            // Determine sort order of each columns, according to the current sorting
            const sorting = this._currentSorting;
            const columnSortOrders = this._getColumnSortOrders(sorting, this._columnsToShow);

            // Create sort index (a index list of this._data)
            // Ex. [3,2,4,1]
            const sortIndex = this._getSortIndex(
                this._data,
                sorting.sortOrder,
                this._tableDef.columns[sorting.sortBy].sortFunction,
                this._numRowsToShow
            );

            // Update the selected list
            const newSelectSet = this._removeSelectNotShown(
                this._data, sortIndex, this._tableDef.getKeyFunction , this._selectSet
            );
            this._setSelectSet(newSelectSet);

            // Create table header model
            const headerProp: TableHeaderColumnProp[] = this._columnsToShow.map((category) => {
                const columnDef = this._tableDef.columns[category];
                const prop: TableHeaderColumnProp = {
                    type: columnDef.type,
                    category: category
                };
                if (columnDef.type === TableHeaderColumnType.SORTABLE) {
                    prop.sortOrder = columnSortOrders.get(category);
                    prop.onClickSort = (currentOrder: SortOrder) => {
                        this._currentSorting = this._getNextSorting(
                            currentOrder,
                            category
                        );
                        this._updateUI();
                    };
                } else if (columnDef.type === TableHeaderColumnType.SELECTABLE) {
                    const isSelectAll = newSelectSet.size === 0
                        ? false
                        : newSelectSet.size === sortIndex.length;
                    prop.isSelected = isSelectAll;
                    prop.onClickSelect = () => {
                        if (isSelectAll) {
                            this._setSelectSet(new Set());
                        } else {
                            this._setSelectSet(new Set(
                                sortIndex.map((dataIndex) => this._tableDef.getKeyFunction(this._data[dataIndex]))
                            ));
                        }
                        this._updateUI();
                    };
                }
                return prop;
            });

            // Create table body model
            const bodyProp: TableBodyColumnProp[][] = [];
            for (const dataIndex of sortIndex) {
                const data = this._data[dataIndex];
                if (data == null) {
                    continue;
                }
                const rowProp: TableBodyColumnProp[] = this._columnsToShow.map((category) => {
                    const colDef = this._tableDef.columns[category];
                    if (colDef.type === TableHeaderColumnType.SELECTABLE) {
                        const dataKey = this._tableDef.getKeyFunction(data);
                        const isSelected = this._selectSet.has(dataKey);
                        const columnProp: TableBodyColumnCheckboxProp = {
                            category: category,
                            isChecked: isSelected,
                            onClickCheck: () => {
                                this._selectRow(dataKey, !isSelected);
                                this._updateUI();
                            }
                        }
                        return columnProp;
                    } else {
                        return colDef.convertFunc(data);
                    }
                });
                bodyProp.push(rowProp);
            }

            // Create component DOM
            const tableElement = this._createTable({
                headerProp: headerProp,
                bodyProp: bodyProp
            });

            // Cache the column width when UI rendering is done
            const renderDone: XDPromise<void>[] = [];
            for (const elem of tableElement) {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                renderDone.push(deferred.promise());
                OpPanelTemplateManager.setNodeMountDoneListener([elem], () => {
                    deferred.resolve();
                });
            }
            PromiseHelper.when(...renderDone).then(() => {
                this._updateColumnSize();
            });

            // Call templateMgr to update UI
            this._templateMgr.updateDOM(this._container, tableElement);
        }

        protected _createTable(props: {
            headerProp: TableHeaderColumnProp[],
            bodyProp: TableBodyColumnProp[][]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { headerProp, bodyProp } = props;

            const templateId = 'table';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                'APP-HEADER': this._createHeader({ columnProps: headerProp }),
                'APP-BODY': this._createBody({ rowProps: bodyProp })
            });
        }

        protected _createHeader(props?: {
            columnProps: TableHeaderColumnProp[]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { columnProps } = props;

            const templateId = 'header';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const columns = [];
            columnProps.forEach((
                { type, category, sortOrder, onClickSort, isSelected, onClickSelect },
                colIndex
            ) => {
                let elems = null;
                // when return 0, make it to be null
                const columnWidth = this._getHeaderColumnWidth(colIndex) || null;
                const widthWithUnit = columnWidth == null ? null : `${columnWidth}px`;

                if (type === TableHeaderColumnType.REGULAR) {
                    // Regular header column
                    elems = this._createHeaderRegularColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        title: this._getHeaderColumnTitle(category),
                        width: widthWithUnit
                    });
                } else if (type === TableHeaderColumnType.SORTABLE) {
                    // Sortable header column
                    elems = this._createHeaderSortableColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        title: this._getHeaderColumnTitle(category),
                        sortOrder: sortOrder,
                        onClickSort: onClickSort,
                        width: widthWithUnit
                    });
                } else if (type === TableHeaderColumnType.SELECTABLE) {
                    // Checkbox header column
                    elems = this._createHeaderCheckboxColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        isChecked: isSelected,
                        onClick: onClickSelect,
                        width: widthWithUnit
                    });
                } else {
                    console.error(`Unsupported column type ${type}`);
                }

                if (elems != null) {
                    elems.forEach((e) => {
                        columns.push(e);
                    });
                }
            });

            // Setup resizable once UI rendering is done
            const columnList: HTMLElement[] = new Array(columns.length);

            const allMountDone: XDPromise<void>[] = [];
            columns.forEach((column, colIndex) => {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                allMountDone.push(deferred.promise());

                OpPanelTemplateManager.setNodeMountDoneListener([column], (elem) => {
                    columnList[colIndex] = elem;
                    deferred.resolve();
                });
            });

            PromiseHelper.when(...allMountDone).then(() => {
                this._setupResizable(columnList, true);
            });

            return this._templateMgr.createElements(templateId, {
                'APP-HEADERCOLUMNS': columns
            });
        }

        protected _createBody(props?: {
            rowProps: TableBodyColumnProp[][]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { rowProps } = props;

            const templateId = 'body';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const bodyRows = [];
            rowProps.forEach((columnProps) => {
                const rowElems = this._createBodyRow({
                    columnProps: columnProps
                });
                if (rowElems != null) {
                    rowElems.forEach((elem) => {
                        bodyRows.push(elem);
                    });
                }
            });

            return this._templateMgr.createElements(templateId, {
                'APP-BODYROWS': bodyRows
            });
        }

        protected _createBodyRow(props: {
            columnProps: TableBodyColumnProp[]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { columnProps } = props;

            const templateId = 'bodyRow';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const columns = [];
            columnProps.forEach((columnProp, colIndex) => {
                // when return 0, make it to be null
                const columnWidth = this._getBodyColumnWidth(colIndex) || null;
                if (columnWidth != null) {
                    columnProp.width = `${this._getBodyColumnWidth(colIndex)}px`;
                }
                const elems = this._getBodyColumnBuilder(columnProp.category)(columnProp);
                if (elems != null) {
                    elems.forEach((e) => {
                        columns.push(e);
                    })
                }
            });

            // Setup resizable once UI rendering is done
            const columnList: HTMLElement[] = new Array(columns.length);

            const allMountDone: XDPromise<void>[] = [];
            columns.forEach((column, colIndex) => {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                allMountDone.push(deferred.promise());

                OpPanelTemplateManager.setNodeMountDoneListener([column], (elem) => {
                    columnList[colIndex] = elem;
                    deferred.resolve();
                });
            });

            PromiseHelper.when(...allMountDone).then(() => {
                this._setupResizable(columnList, false);
            });

            return this._templateMgr.createElements(templateId, {
                'APP-BODYCOLUMNS': columns
            });
        }

        protected _setupResizable(columnList: HTMLElement[], isHeader: boolean) {
            const getColumnWidth: (colIndex: number) => number
                = isHeader
                    ? this._getHeaderColumnWidth.bind(this)
                    : this._getBodyColumnWidth.bind(this);
            const getOtherColumnWidth: (colIndex: number) => number
                = isHeader
                    ? this._getBodyColumnWidth.bind(this)
                    : this._getHeaderColumnWidth.bind(this);
            const setColumnWidth: (colIndex: number, width: number) => void
                = isHeader
                    ? this._setHeaderColumnWidth.bind(this)
                    : this._setBodyColumnWidth.bind(this);
            const setOtherColumnWidth: (colIndex: number, width: number) => number
                = isHeader
                    ? this._setBodyColumnWidth.bind(this)
                    : this._setHeaderColumnWidth.bind(this);
            for (let colIndex = 0; colIndex < columnList.length; colIndex ++) {
                const $elem = $(columnList[colIndex]);

                // Initialize the column width, if it hasn't been set
                if (getColumnWidth(colIndex) == null) {
                    setColumnWidth(colIndex, $elem.outerWidth());
                }

                // Turn off resizable if it's already on
                if ($elem.resizable('instance')) {
                    $elem.resizable('destroy');
                }

                // Register column resize handler
                this._addResizeHandler(colIndex, () => {
                    const width = getColumnWidth(colIndex);
                    $elem.css('flex-basis', `${width}px`);
                    $elem.css('left', 0);
                });

                // Register column getSize handler
                if (isHeader) {
                    this._setGetSizeHandler(colIndex, {
                        header: () => $elem.outerWidth()
                    });
                } else {
                    this._setGetSizeHandler(colIndex, {
                        body: () => $elem.outerWidth()
                    });
                }

                // Current column's resize config
                const resizeConfig = this._getResizeConfig(colIndex);
                if (resizeConfig == null) {
                    // This column is not resizable
                    continue;
                }
                const { minWidth } = resizeConfig;

                // Previous(might not be adjacent) resizable column
                const prevResizeConfig = this._getPreviousResizable(colIndex);
                if (prevResizeConfig == null) {
                    // If there is no previous column resizable, this column is not resizable either
                    continue;
                }
                const { index: prevIndex, config: prevConfig } = prevResizeConfig;
                const { minWidth: prevMinWidth } = prevConfig;

                // Setup resizable
                let lastLeft = 0;
                $elem.resizable({
                    handles: 'w',
                    minWidth: minWidth,
                    start: (_e, ui) => {
                        $(this._container).addClass('resizing');
                        lastLeft = ui.position.left;
                        this._updateColumnSize();
                        this._resizeAllColumns();
                    },
                    resize: (_e, ui) => {
                        // Figure out the moving distance since last resize event
                        const left = ui.position.left;
                        const delta = left - lastLeft;
                        lastLeft = left;
                        // Calculate the current&previous columns' width
                        const width = getColumnWidth(colIndex) - delta;
                        const prevWidth = getColumnWidth(prevIndex) + delta;
                        if (width >= minWidth && prevWidth >= prevMinWidth) {
                            setColumnWidth(colIndex, width);
                            setColumnWidth(prevIndex, prevWidth);
                            setOtherColumnWidth(colIndex, getOtherColumnWidth(colIndex) - delta);
                            setOtherColumnWidth(prevIndex, getOtherColumnWidth(prevIndex) + delta);

                        }
                        // Resize columns
                        this._resizeColumn(prevIndex);
                        this._resizeColumn(colIndex);
                    },
                    stop: () => {
                        // $elem.resizable('option', 'maxWidth', null);
                        $(this._container).removeClass('resizing');
                    }
                });
            }
        }

        protected _createBodyColumnCheckbox(
            props?: TableBodyColumnCheckboxProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, isChecked, onClickCheck, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'bodyColumnCheckbox';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                cssStyle: cssStyle,
                cssChecked: isChecked ? 'checked': '',
                onClick: onClickCheck
            });
        }

        protected _createBodyColumnStatus(
            props?: TableBodyColumnStatusProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, status, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'bodyColumnStatus';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                iconClass: this._getBodyColumnStatusIconCss(status),
                text: this._getBodyColumnStatusText(status),
                cssStyle: cssStyle
            });
        }

        protected _createBodyColumnText(
            props?: TableBodyColumnTextProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { isEllipsis, tooltip, category, text, style, width } = props;
            const widthStyle = width == null ? null : `flex-basis:${width}`;
            const cssStyle = [style, widthStyle].filter((v)=>v!=null).join(';');

            const templateId = isEllipsis
                ? (tooltip != null ? 'bodyColumnElpsTextTooltip' : 'bodyColumnElpsText')
                :  (tooltip != null ? 'bodyColumnTextTooltip' : 'bodyColumnText');
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                text: text,
                tooltip: tooltip,
                cssStyle: cssStyle.length === 0 ? null : cssStyle
            });
        }

        protected _createBodyColumnTextLink(
            props?: TableBodyColumnTextLinkProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, text, isError = false, onLinkClick = () => {}, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'bodyColumnElpsTextLink';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: `${this._getBodyColumnCss(category)}${isError ? ' error' : ''}`,
                cssStyle: cssStyle,
                text: text,
                onLinkClick: onLinkClick
            });
        }

        protected _createBodyColumnIconLink(
            props?: TableBodyColumnIconLinkProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, text, iconClass, onLinkClick = () => {}, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'bodyColumnIconLink';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                cssStyle: cssStyle,
                iconClass: iconClass,
                text: text,
                onLinkClick: onLinkClick
            });
        }

        protected _createHeaderRegularColumn(props?: {
            cssClass: string,
            title: string,
            width?: string
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, title, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'headerColumnRegular';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: cssClass,
                cssStyle: cssStyle,
                title: title
            });
        }

        protected _createHeaderCheckboxColumn(props?: {
            cssClass: string,
            isChecked: boolean,
            onClick: () => void,
            width?: string
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, isChecked, onClick = () => {}, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const templateId = 'headerColumnCheckbox';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: cssClass,
                cssStyle: cssStyle,
                cssChecked: isChecked ? 'checked': '',
                onClick: onClick
            });
        }

        protected _createHeaderSortableColumn(props?: {
            cssClass: string,
            title: string,
            sortOrder: SortOrder,
            onClickSort: (currnetOrder: SortOrder) => void,
            width?: string
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, title, sortOrder, onClickSort = () => {}, width } = props;
            const cssStyle = width == null ? null : `flex-basis:${width}`;

            const currentOrder = sortOrder;
            if (sortOrder == SortOrder.NONE) {
                const templateId = 'headerColumnSortableNoSort';
                this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

                return this._templateMgr.createElements(templateId, {
                    cssClass: cssClass,
                    cssStyle: cssStyle,
                    title: title,
                    onClickSort: () => {
                        onClickSort(currentOrder);
                    }
                });

            } else {
                const templateId = 'headerColumnSortable';
                this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

                return this._templateMgr.createElements(templateId, {
                    cssClass: cssClass,
                    cssStyle: cssStyle,
                    title: title,
                    sortOrderClass: this._getSortOrderClass(sortOrder),
                    onClickSort: () => {
                        onClickSort(currentOrder);
                    }
                });
            }
        }

        // *** Mapping functions - start ***
        protected _setupColumnMapping() {
            // TableColumnCategory => header title
            this._headerTitleMapping[TableColumnCategory.STATUS] = SQLTStr.queryTableColumnStatus;
            this._headerTitleMapping[TableColumnCategory.QUERY] = SQLTStr.queryTableColumnQuery;
            this._headerTitleMapping[TableColumnCategory.STARTTIME] = SQLTStr.queryTableColumnSTime;
            this._headerTitleMapping[TableColumnCategory.DURATION] = SQLTStr.queryTableColumnDuration;
            this._headerTitleMapping[TableColumnCategory.TABLE] = SQLTStr.queryTableColumnTable;
            this._headerTitleMapping[TableColumnCategory.ROWS] = SQLTStr.queryTableColumnNumRows;
            this._headerTitleMapping[TableColumnCategory.SKEW] = SQLTStr.queryTableColumnSkew;
            this._headerTitleMapping[TableColumnCategory.ACTION] = SQLTStr.queryTableColumnAction;
            // TableColumnCategory => header css
            this._headerCssMapping[TableColumnCategory.SELECT] = 'col-select';
            this._headerCssMapping[TableColumnCategory.STATUS] = 'col-status';
            this._headerCssMapping[TableColumnCategory.QUERY] = 'col-query';
            this._headerCssMapping[TableColumnCategory.STARTTIME] = 'col-time';
            this._headerCssMapping[TableColumnCategory.DURATION] = 'col-duration';
            this._headerCssMapping[TableColumnCategory.TABLE] = 'col-table';
            this._headerCssMapping[TableColumnCategory.ROWS] = 'col-rows';
            this._headerCssMapping[TableColumnCategory.SKEW] = 'col-skew';
            this._headerCssMapping[TableColumnCategory.ACTION] = 'col-action';
            // TableColumnCategory => DOM builder for body column
            this._bodyColumnBuilder[TableColumnCategory.SELECT] = this._createBodyColumnCheckbox.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.STATUS] = this._createBodyColumnStatus.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.QUERY] = this._createBodyColumnTextLink.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.STARTTIME] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.DURATION] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.TABLE] = this._createBodyColumnTextLink.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.ROWS] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.SKEW] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.ACTION] = this._createBodyColumnIconLink.bind(this);
            // TableColumnCategory => resize definition
            this._columnResizeDef.set(TableColumnCategory.STATUS, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.QUERY, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.STARTTIME, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.DURATION, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.TABLE, { minWidth: 75 });
            this._columnResizeDef.set(TableColumnCategory.ROWS, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.SKEW, { minWidth: 50 });
            this._columnResizeDef.set(TableColumnCategory.ACTION, { minWidth: 50 });
        }

        protected _setupStaticMapping() {
            // SortOrder => sort icon
            this._sortOrderMapping[SortOrder.ASC] = 'xi-arrow-up';
            this._sortOrderMapping[SortOrder.DESC] = 'xi-arrow-down';
            this._sortOrderMapping[SortOrder.NONE] = '';
            // SQLStatus => status icon
            this._statusMapping[SQLStatus.Cancelled] = 'icon-cancel';
            this._statusMapping[SQLStatus.Compiling] = 'icon-compile';
            this._statusMapping[SQLStatus.Done] = 'icon-done';
            this._statusMapping[SQLStatus.Failed] = 'icon-fail';
            this._statusMapping[SQLStatus.Running] = 'icon-run';
            this._statusMapping[SQLStatus.Interrupted] = 'icon-cancel';
            // SQL Status => status string
            this._sqlStatusString[SQLStatus.Running] = SQLTStr.queryHistStatusRun;
            this._sqlStatusString[SQLStatus.Done] = SQLTStr.queryHistStatusDone;
            this._sqlStatusString[SQLStatus.Failed] = SQLTStr.queryHistStatusFail;
            this._sqlStatusString[SQLStatus.Cancelled] = SQLTStr.queryHistStatusCancel;
            this._sqlStatusString[SQLStatus.Compiling] = SQLTStr.queryHistStatusCompile;
            this._sqlStatusString[SQLStatus.None] = SQLTStr.queryHistStatusNone;
            this._sqlStatusString[SQLStatus.Interrupted] = SQLTStr.queryHistStatusInterrupt;
        }

        protected _getSortOrderClass(sortOrder: SortOrder): string {
            return this._sortOrderMapping[sortOrder] || '';
        }

        protected _getHeaderColumnTitle(category: TableColumnCategory): string {
            return this._headerTitleMapping[category] || '';
        }

        protected _getHeaderColumnCss(category: TableColumnCategory): string {
            return this._headerCssMapping[category] || '';
        }

        protected _getBodyColumnCss(category: TableColumnCategory): string {
            return this._headerCssMapping[category] || '';
        }

        protected _getBodyColumnStatusText(status: SQLStatus): string {
            return this._sqlStatusString[status] || '';
        }

        protected _getBodyColumnStatusIconCss(status: SQLStatus): string {
            return this._statusMapping[status] || '';
        }

        protected _getBodyColumnBuilder(category: TableColumnCategory): (any) => any {
            return this._bodyColumnBuilder[category] || (() => null);
        }
        // *** Mapping functions - end ***

        // *** Resize related functions - start ***
        protected _getHeaderColumnWidth(colIndex: number): number {
            return this._resizeState.headerWidth[colIndex];
        }
        protected _setHeaderColumnWidth(colIndex: number, width: number) {
            this._resizeState.headerWidth[colIndex] = width;
        }
        protected _getBodyColumnWidth(colIndex: number): number {
            return this._resizeState.bodyWidth[colIndex];
        }
        protected _setBodyColumnWidth(colIndex: number, width: number) {
            this._resizeState.bodyWidth[colIndex] = width;
        }

        protected _getResizeConfig(colIndex: number): { minWidth: number } {
            const columnCategory = this._columnsToShow[colIndex];
            if (columnCategory == null) {
                return null;
            }
            const columnDef = this._columnResizeDef.get(columnCategory);
            if (columnDef == null) {
                return null;
            }

            return { minWidth: columnDef.minWidth };
        }

        protected _getPreviousResizable(
            currentIndex: number
        ): {
            index: number,
            config: { minWidth: number }
        } {
            for (let i = currentIndex - 1; i >=0; i --) {
                const resizeConfig = this._getResizeConfig(i)
                if (resizeConfig != null) {
                    return {
                        index: i,
                        config: { minWidth: resizeConfig.minWidth }
                    };
                }
            }
            return null;
        }

        protected _clearGetSizeHandlers(): void {
            for (let i = 0; i < this._getSizeHandlers.length; i ++) {
                this._getSizeHandlers[i] = { header: null, body: null };
            }
        }

        protected _setGetSizeHandler(colIndex: number, handler: {
            header?: () => number,
            body?: () => number
        }): void {
            if (colIndex < 0 || colIndex >= this._getSizeHandlers.length) {
                return;
            }
            const { header, body } = handler;
            const handlers = this._getSizeHandlers[colIndex];
            if (header) {
                handlers.header = header;
            }
            if (body) {
                handlers.body = body;
            }
        }

        protected _updateColumnSize(): void {
            for (let colIndex = 0; colIndex < this._getSizeHandlers.length; colIndex ++) {
                const { header = null, body = null } = this._getSizeHandlers[colIndex] || {};
                if (header) {
                    this._setHeaderColumnWidth(colIndex, header());
                }
                if (body) {
                    this._setBodyColumnWidth(colIndex, body());
                }
            }
        }

        protected _clearResizeHandlers(): void {
            for (let i = 0; i < this._resizeHandlers.length; i ++) {
                this._resizeHandlers[i] = [];
            }
        }

        protected _addResizeHandler(colIndex: number, handler: () => void): void {
            if (colIndex < 0 || colIndex >= this._resizeHandlers.length) {
                return;
            }
            this._resizeHandlers[colIndex].push(handler);
        }

        protected _resizeColumn(colIndex: number): void {
            const columnResizers = this._resizeHandlers[colIndex];
            if (columnResizers == null) {
                return;
            }
            for (const resizeHandler of columnResizers) {
                resizeHandler();
            }
        }

        protected _resizeAllColumns(): void {
            for (let i = 0; i < this._resizeHandlers.length; i ++) {
                this._resizeColumn(i);
            }
        }
        // *** Resize related functions - end ***

        // *** Helper functions - start ***
        protected _getColumnSortOrders(
            currentSorting: TableSortMethod,
            columns: TableColumnCategory[]
        ): Map<TableColumnCategory, SortOrder> {
            const sortOrders: Map<TableColumnCategory, SortOrder> = new Map();
            for (const column of columns) {
                if (currentSorting == null || currentSorting.sortBy !== column) {
                    sortOrders.set(column, SortOrder.NONE);
                } else {
                    sortOrders.set(column, currentSorting.sortOrder);
                }
            }
            return sortOrders;
        }

        protected _getSortIndex(
            data: TData[],
            order: SortOrder = SortOrder.NONE,
            sortFunction: (a: TData, b: TData) => number,
            numRows: number
        ): number[] {
            const sortList = data.map((_, i) => i);
            if (order !== SortOrder.NONE) {
                sortList.sort( (a, b) => {
                    let gt = sortFunction(data[a], data[b]);
                    return order === SortOrder.ASC? gt: -gt;
                });
            }
            if (numRows < 0) {
                return sortList;
            } else {
                return sortList.slice(0, numRows);
            }
        }

        protected _getNextSorting(
            currentOrder: SortOrder,
            currentColumn: TableColumnCategory,
        ): TableSortMethod {
            const stateTransit = {};
            stateTransit[SortOrder.NONE] = SortOrder.ASC;
            stateTransit[SortOrder.ASC] = SortOrder.DESC;
            stateTransit[SortOrder.DESC] = SortOrder.NONE;

            return {
                sortBy: currentColumn, sortOrder: stateTransit[currentOrder]
            };
        }

        protected _removeSelectNotShown(
            dataList: TData[],
            dataIndexShown: number[],
            getKeyFunc: (data: TData) => string,
            selectSet: Set<string>
        ): Set<string> {
            const allRowsSet = new Set();
            for (const dataIndex of dataIndexShown) {
                allRowsSet.add(getKeyFunc(dataList[dataIndex]));
            }
            const newSelectSet: Set<string> = new Set();
            for (const key of selectSet) {
                if (allRowsSet.has(key)) {
                    newSelectSet.add(key);
                }
            }
            return newSelectSet;
        }

        protected _setSelectSet(newSelectSet: Set<string>): void {
            let isChanged = newSelectSet.size !== this._selectSet.size;
            if (!isChanged) {
                for (const key of newSelectSet.keys()) {
                    if (!this._selectSet.has(key)) {
                        isChanged = true;
                        break;
                    }
                }
            }
            if (isChanged) {
                this._selectSet = newSelectSet;
                this._tableDef.onSelectChange(new Set(newSelectSet));
            }
        }

        protected _selectRow(dataKey: string, isSelect: boolean): void {
            if (isSelect) {
                if (!this._selectSet.has(dataKey)) {
                    this._selectSet.add(dataKey);
                    this._tableDef.onSelectChange(new Set(this._selectSet));
                }
            } else {
                if (this._selectSet.has(dataKey)) {
                    this._selectSet.delete(dataKey);
                    this._tableDef.onSelectChange(new Set(this._selectSet));
                }
            }
        }
        // *** Helper functions - end ***

        public static SortOrder = {}
    }

    export enum TableHeaderColumnType {
        REGULAR, SORTABLE, SELECTABLE
    }

    export enum TableColumnCategory {
        SELECT = 'SELECT',
        STATUS = 'STATUS',
        QUERY = 'QUERY',
        STARTTIME = 'STARTTIME',
        DURATION = 'DURATION',
        TABLE = 'TABLE',
        ROWS = 'ROWS',
        SKEW = 'SKEW',
        ACTION = 'ACTION'
    }

    export enum SortOrder {
        NONE, ASC, DESC
    }

    export interface TableSortMethod {
        sortBy: TableColumnCategory,
        sortOrder: SortOrder
    }

    export interface TableHeaderColumnProp {
        type: TableHeaderColumnType, // Basic
        category: TableColumnCategory, // Basic
        sortOrder?: SortOrder, // SORT
        onClickSort?: (currentOrder: SortOrder) => void, // SORT
        isSelected?: boolean, // SELECTABLE
        onClickSelect?: () => void // SELECTABLE
    }

    export interface TableBodyColumnProp {
        category: TableColumnCategory
        width?: string
    }

    export interface TableBodyColumnCheckboxProp extends TableBodyColumnProp {
        isChecked: boolean,
        onClickCheck: () => void
    }

    export interface TableBodyColumnStatusProp extends TableBodyColumnProp {
        // cssClass: string,
        status: SQLStatus
    }

    export interface TableBodyColumnTextProp extends TableBodyColumnProp {
        isEllipsis: boolean,
        text: string,
        tooltip?: string,
        style?: string
    }

    export interface TableBodyColumnTextLinkProp extends TableBodyColumnProp {
        // cssClass: string,
        text: string,
        isError?: boolean,
        onLinkClick: () => void
    }

    export interface TableBodyColumnIconLinkProp extends TableBodyColumnProp {
        text: string,
        iconClass: string,
        onLinkClick: () => void,
    }

    export type TableDefinition<TData> = {
        onSelectChange?: (keySet: Set<string>) => void, // Callback function when selected rows being changed
        getKeyFunction?: (data: TData) => string, // The function the get the key of data
        columns: { [key: string]: { // Key is TableColumnCategory
            type: TableHeaderColumnType, // Type of the column (sortable, selectable, regular)
            sortFunction?: (a: TData, b: TData) => number, // The function to help sorting the data(similar to the compare function of Array.sort)
            convertFunc?: (data: TData) => TableBodyColumnProp // The function to convert the data to the value shown in the table
        }}
    }
}
