class XcDatasetViewer extends XcViewer {
    private dataset: DSObj;
    private currentRow: number;
    private totalRows: number;
    private colStrLimit: number;
    private readonly defaultColWidth: number = 130;
    private readonly initialNumRowsToFetch: number = 40;
    private _schemaArray: ColSchema[][];
    private _dispalySchema: ColSchema[];
    private events: {_events: object, trigger: Function};

    public constructor(dataset: DSObj) {
        super(dataset.getFullName()); // use ds full name as id
        this.dataset = dataset;
        this.currentRow = 0;
        this.totalRows = 0;
        this.$view.addClass("datasetTableWrap");
        this._addEventListeners();
        this._setupEvents();
    }

    public getTitle(): string {
        return this.dataset.getName();
    }

    public getSchemaArray(): ColSchema[][] {
        return this._schemaArray;
    }

    /**
     * add events to the dag node
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public registerEvents(event, callback): XcDatasetViewer {
        this.events._events[event] = callback;
        return this;
    }

    /**
     * Clear Dataset Preview
     */
    public clear(): XDPromise<void> {
        super.clear();
        return PromiseHelper.resolve();
    }

     /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        super.render($container);

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.alwaysResolve(this._fetchSchema())
        .then(() => {
            return this.dataset.fetch(0, this.initialNumRowsToFetch);
        })
        .then((ret) => {
            try {
                const {jsons, jsonKeys} = ret;
                this.totalRows = this.dataset.getNumEntries();
                this._getSampleTable(jsonKeys, jsons);
                deferred.resolve();
            } catch (e) {
                deferred.reject(e.message);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Set the schema in dispaly, specially for TblSourcePreview
     */
    public setDisplaySchema(schema: ColSchema[]): void {
        this._dispalySchema = schema;
        this._synceResultWithDisplaySchema();
    }

    public resize(): void {
        this._sizeColumns();
    }

    private _getTableEle(): JQuery {
        return this.$view.find("table");
    }

    private _addEventListeners(): void {
        // resize column
        let $view = this.$view;
        let self = this;
        $view.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                onResize: function() {
                    self.events.trigger("onResize", $view);
                },
                minWidth: 25
            });
        });

        $view.scroll((event) => {
            $(event.target).scrollTop(0);
            TblFunc.moveFirstColumn(this._getTableEle());
        });
    }

    private _fetchSchema(): XDPromise<void> {
        if (this._schemaArray != null) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PTblManager.Instance.getSchemaArrayFromDataset(this.dataset.getFullName())
        .then((res) => {
            this._schemaArray = res.schemaArray;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getSchemaFromSchemaArray(): ColSchema[] | null {
        if (!this._schemaArray) {
            return null;
        }

        let schema: ColSchema[] = this._schemaArray.map((schemas) => {
            if (schemas.length === 0) {
                return null;
            } else if (schemas.length === 1) {
                return schemas[0];
            } else {
                return {
                    name: schemas[0].name,
                    type: ColumnType.mixed
                }
            }
        });
        return this._getOrderedSchema(schema);
    }

    // XXX TODO: remove this temp fix when XC-270 is fixed
    private _getOrderedSchema(schema: ColSchema[]): ColSchema[] {
        try {
            let typedColumns = this.dataset.typedColumns;
            if (!typedColumns) {
                return schema;
            }
            let map: Map<string, ColSchema> = new Map();
            schema.forEach((col) => map.set(col.name, col));
            let orderedSchema: ColSchema[] = [];
            // use typedColumns as a reference of order
            typedColumns.forEach((col) => {
                let name: string = col.colName;
                if (map.has(name)) {
                    orderedSchema.push(map.get(name));
                    map.delete(name);
                }
            });
            // add any remaining columns
            schema.forEach((col) => {
                if (map.has(col.name)) {
                    orderedSchema.push(col);
                }
            });

            return orderedSchema;
        } catch (e) {
            console.error(e);
            return schema;
        }
    }

    private _getSampleTable(jsonKeys: string[], jsons: object[]): void {
        const html: string = this._getSampleTableHTML(jsonKeys, jsons);
        this.$view.html(html);
        this._sizeColumns();
        TblFunc.moveFirstColumn(this._getTableEle());

        // scroll cannot use event bubble so we have to add listener
        // to .datasetTbodyWrap every time it's created
        this.$view.find(".datasetTbodyWrap").scroll((event) => {
            this._dataStoreTableScroll($(event.target));
        });
    }

    private _setColStrLimie(numKeys: number): void {
        this.colStrLimit = 250;
        if (numKeys < 5) {
            this.colStrLimit = Math.max(1000 / numKeys, this.colStrLimit);
        }
    }

    private _getSampleTableHTML(jsonKeys: string[], jsons: object[]): string {
        // validation check
        if (!jsonKeys || !jsons) {
            return "";
        }

        let tr: string = "";
        let th: string = "";

        let schema: ColSchema[] = this._getSchemaFromSchemaArray();
        let knownTypes: ColumnType[] = [];
        if (schema && schema.length) {
            jsonKeys = schema.map((colInfo) => {
                let name = xcHelper.unescapeColName(colInfo.name);
                knownTypes.push(colInfo.type);
                return name;
            });
        }

        let columnsType: ColumnType[] = [];  // track column type
        let numKeys: number = Math.min(1000, jsonKeys.length); // limit to 1000 ths
        this._setColStrLimie(numKeys);
        this.currentRow = 0;

        jsonKeys.forEach(function() {
            columnsType.push(undefined);
        });

        // table rows
        tr = this._getTableRowsHTML(jsonKeys, jsons, columnsType);
        if (numKeys > 0) {
            th += '<th class="rowNumHead" title="select all columns"' +
                    ' data-toggle="tooltip" data-placement="auto top"' +
                    ' data-container="body"><div class="header">' +
                  '</div></th>';
        }

        // table header
        for (var i = 0; i < numKeys; i++) {
            var key = jsonKeys[i].replace(/\'/g, '&#39');
            var thClass = "th col" + (i + 1);
            var type = knownTypes[i] || columnsType[i];
            th += this._getTh(key, type, thClass);
        }

        const html: string =
            '<div class="datasetTbodyWrap">' +
                '<table class="datasetTable dataTable" ' +
                        'data-dsid="' + this.dataset.getId() + '">' +
                    '<thead>' +
                        '<tr>' + th + '</tr>' +
                    '</thead>' +
                    '<tbody>' + tr + '</tbody>' +
                '</table>' +
            '</div>';

        return html;
    }

    private _getTableRowsHTML(
        jsonKeys: string[],
        jsons: object[],
        columnsType: ColumnType[]
    ): string {
        let tr: string = "";
        let i: number = 0;
        let knf: boolean = false;
        jsons.forEach((json) => {
            tr += '<tr>';
            tr += '<td class="lineMarker"><div class="idSpan">' +
                    (this.currentRow + i + 1) + '</div></td>';
            // loop through each td, parse object, and add to table cell
            const numKeys: number = Math.min(jsonKeys.length, 1000); // limit to 1000 ths
            for (let j = 0; j < numKeys; j++) {
                const key: string = jsonKeys[j];
                const val: any = json[key];
                knf = false;
                // Check type
                columnsType[j] = xcHelper.parseColType(val, columnsType[j]);

                if (val === undefined) {
                    knf = true;
                }
                let parsedVal: any = xcHelper.parseJsonValue(val, knf);
                if (this.colStrLimit) {
                    let hiddenStrLen = parsedVal.length - this.colStrLimit;
                    if (hiddenStrLen > 0) {
                        parsedVal = parsedVal.slice(0, this.colStrLimit) +
                                    "...(" +
                                    xcStringHelper.numToStr(hiddenStrLen) + " " +
                                    TblTStr.Truncate + ")";
                    }
                }
                if (typeof parsedVal === "string") {
                    parsedVal = xcUIHelper.styleNewLineChar(parsedVal);
                }

                tr += '<td class="col' + (j + 1) + '">' +
                        '<div class="tdTextWrap">' +
                            '<div class="tdText">' +
                                parsedVal +
                            '</div>' +
                        '</div>' +
                      '</td>';
            }

            tr += this._addExtraRows(jsonKeys);
            tr += '</tr>';
            i++;
        });

        return tr;
    }

    private _addExtraRows(jsonKeys: string[]): HTML {
        let displaySchema: ColSchema[] = this._dispalySchema || [];
        if (displaySchema == null || displaySchema.length === 0) {
            return "";
        }
        let set: Set<string> = new Set();
        jsonKeys.forEach((key) => {
            set.add(key);
        });

        let tr: HTML = "";
        displaySchema.forEach((schema) => {
            let name = schema.name;
            if (!set.has(name)) {
                tr += this._getTd("Unavailable in preview", "newAdded")
            }
        });
        return tr;
    }

    private _dataStoreTableScroll($tableWrapper: JQuery): XDPromise<void> {
        const numRowsToFetch: number = 20;
        if (this.currentRow + this.initialNumRowsToFetch >= this.totalRows) {
            return PromiseHelper.resolve();
        }

        const $table = this._getTableEle();
        if ($table.hasClass("fetching")) {
            // when still fetch the data, no new trigger
            console.info("Still fetching previous data!");
            return PromiseHelper.reject("Still fetching previous data!");
        }

        if ($tableWrapper[0].scrollHeight - $tableWrapper.scrollTop() -
                   $tableWrapper.outerHeight() <= 1) {
            if (this.currentRow === 0) {
                this.currentRow += this.initialNumRowsToFetch;
            } else {
                this.currentRow += numRowsToFetch;
            }

            $table.addClass("fetching");
            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            this._scrollSampleAndParse(this.currentRow, numRowsToFetch)
            .then(deferred.resolve)
            .fail(function(error) {
                deferred.reject(error);
                console.error("Scroll data sample table fails", error);
            })
            .always(function() {
                // so this is the only place the needs to remove class
                $table.removeClass("fetching");
            });

            return deferred.promise();
        } else {
            return PromiseHelper.reject("no need to scroll");
        }
    }

    private _scrollSampleAndParse(
        rowToGo: number,
        rowsToFetch: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dataset.fetch(rowToGo, rowsToFetch)
        .then(({jsons}) => {
            const $table = this._getTableEle();
            const jsonKeys: string[] = [];

            $table.find("th.th").each(function(index) {
                // when scroll, it should follow the order of current header
                const header: string = $(this).find(".editableHead").val();
                jsonKeys[index] = header;
            });

            const tr: string = this._getTableRowsHTML(jsonKeys, jsons, []);
            $table.append(tr);
            TblFunc.moveFirstColumn($table);
            this._synceResultWithDisplaySchema();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _sizeColumns(): void {
        const destWidth: number = this.$view.parent().width() - 40;
        const $headers: JQuery = this._getTableEle().find("th:gt(0)");
        let bestFitWidths: number[] = [];
        let totalWidths: number = 0;
        const needsExpanding: boolean[] = [];
        let numStaticWidths: number = 0;
        let expandWidths: number = 0;

        // track which columns will expand and which will remain at
        // default colwidth
        $headers.each((_index, el) => {
            let width: number = TblFunc.getWidestTdWidth($(el), {
                "includeHeader": true,
                "fitAll": true,
                "datastore": true
            });
            let expanding: boolean = false;
            if (width > this.defaultColWidth) {
                expanding = true;
            } else {
                numStaticWidths++;
            }
            needsExpanding.push(expanding);
            width = Math.max(width, this.defaultColWidth);
            bestFitWidths.push(width);
            totalWidths += width;
            if (expanding) {
                expandWidths += width;
            }
        });

        let ratio: number = destWidth / totalWidths;
        if (ratio < 1) {
            // extra width is the remainining width that the larger columns
            // can take up
            const remainingWidth: number = destWidth - (numStaticWidths *
                                              this.defaultColWidth);
            ratio = remainingWidth / expandWidths;

            bestFitWidths = bestFitWidths.map((width, i) => {
                if (needsExpanding[i]) {
                    return Math.max(this.defaultColWidth, Math.floor(width * ratio));
                } else {
                    return width;
                }
            });
        }

        $headers.each(function(i) {
            $(this).outerWidth(bestFitWidths[i]);
        });
    }

    private _synceResultWithDisplaySchema(): void {
        let $table = this._getTableEle();
        $table.find(".unused").removeClass("unused");
        $table.find(".newAdded").remove();

        let schema = this._dispalySchema;
        if (schema == null || schema.length === 0) {
            return;
        }

        let set: Set<string> = new Set();
        schema.forEach((colInfo) => {
            set.add(colInfo.name);
        });
        let $ths = $table.find("th");
        let $trs = $table.find("tbody tr");
        $ths.each((index, el) => {
            let $th = $(el);
            if ($th.hasClass("rowNumHead")) {
                // skip row num
                return;
            }
            let colName = $th.find("input").val();
            if (set.has(colName)) {
                set.delete(colName);
            } else {
                $ths.eq(index).addClass("unused");
                $trs.each((_i, el) => {
                    $(el).find("td").eq(index).addClass("unused");
                });
            }
        });

        let extraSchema: ColSchema[] = schema.filter((colInfo) => {
            let colName = colInfo.name;
            return set.has(colName);
        });

        this._addExtraColumns(extraSchema);
    }

    private _addExtraColumns(schema: ColSchema[]): void {
        if (schema.length === 0) {
            return;
        }
        let extraTh: HTML = "";
        let extraTd: HTML = "";
        schema.forEach((colInfo) => {
            extraTh += this._getTh(colInfo.name, colInfo.type, "newAdded");
            extraTd += this._getTd("Unavailable in preview", "newAdded");
        });

        let $table = this._getTableEle();
        $table.find("thead tr").append(extraTh);
        $table.find("tbody tr").each((_index, el) => {
            $(el).append(extraTd);
        });
    }

    private _getTh(key: string, type: string, thClass: string): HTML {
        var width = xcUIHelper.getTextWidth(null, key);
        width += 2; // text will overflow without it
        width = Math.max(width, this.defaultColWidth); // min of 130px

        let th: HTML =
        '<th class="' + thClass + '" style="width:' + width + 'px;">' +
            '<div class="header type-' + type + '" ' +
                    'data-type=' + type + '>' +
                '<div class="colGrab"></div>' +
                '<div class="flexContainer flexRow">' +
                    '<div class="flexWrap flex-left" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="auto top" ' +
                        'data-container="body" ' +
                        'title="' + type + '">' +
                        '<span class="iconHidden"></span>' +
                        '<span class="type icon"></span>' +
                    '</div>' +
                    '<div class="flexWrap flex-mid">' +
                        '<input spellcheck="false"' +
                            'class="tooltipOverflow editableHead ' +
                            'shoppingCartCol ' +
                            thClass + '" value=\'' + key + '\' ' +
                            'disabled ' +
                            'data-original-title="' + key + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-container="body" ' +'>' +
                    '</div>' +
                    '<div class="flexWrap flex-right">' +
                        '<i class="icon xi-tick fa-8"></i>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</th>';
        return th;
    }

    private _getTd(text: string, classes: string): HTML {
        let td: HTML =
        '<td class="cell ' + classes + '">' +
            '<div class="innerCell">' +
                text +
            '</div>' +
        '</td>';
        return td;
    }

    private _setupEvents(): void {
        this.events = {
            _events: {},
            trigger: (event, ...args) => {
                if (typeof this.events._events[event] === 'function') {
                    this.events._events[event].apply(this, args);
                }
            }
        };
    }
}