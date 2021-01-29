class SkewInfoModal {
    private static _instance: SkewInfoModal;

    private _modalHelper: ModalHelper;
    private _activeTable: TableMeta;
    private _percentageLabel: boolean = false;
    private _instanceOptions;

    public static get Instance(): SkewInfoModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            sizeToDefault: true,
            resizeCallback: () => {
                this._drawDistributionGraph();
            }
        });

       this._addEventListeners();
    };

    /**
     * SkewInfoModal.Instance.show
     * @param tableId
     */
    public show(table: TableMeta, options?: {tableInfo?: any}) {
        this._instanceOptions = options || {};
        if (table == null && !this._instanceOptions.tableInfo) {
            // error case which should never happen
            Alert.error(AlertTStr.Error, AlertTStr.ErrorMsg);
            return;
        }

        this._activeTable = table;
        this._percentageLabel = false;
        this._modalHelper.setup();

        this._showTableInfo();
        this._drawDistributionGraph();
    }

    private _getModal(): JQuery {
        return $("#skewInfoModal");
    }

    private _close(): void {
        this._modalHelper.clear();
        this._activeTable = null;
    }

    private _showTableInfo(): void {
        if (this._activeTable == null && !this._instanceOptions.tableInfo) {
            // error case
            return;
        }

        let size: number;
        let totalRows: number;
        let skewValue: string;
        let skewColor: string;
        let tableName: string;
        if (this._instanceOptions.tableInfo) {
            size = this._instanceOptions.tableInfo.size;
            totalRows = this._instanceOptions.tableInfo.totalRows;
            skewValue = this._instanceOptions.tableInfo.skewValue;
            skewColor = this._instanceOptions.tableInfo.skewColor;
            tableName = this._instanceOptions.tableInfo.tableName;
        } else {
            const table: TableMeta = this._activeTable;
            const $skew: JQuery = $("#sqlTableArea .skewInfoArea .text");
            size = table.getSize();
            totalRows = table.resultSetCount;
            skewValue = $skew.text();
            skewColor = $skew.css("color");
            tableName = table.getName();
        }

        const sizeStr: string = <string>xcHelper.sizeTranslator(size);
        const $modal: JQuery = this._getModal();
        $modal.find(".size .text").text(sizeStr);
        $modal.find(".totalRows .text").text(xcStringHelper.numToStr(totalRows));
        $modal.find(".skew .text").text(skewValue)
                                  .css("color", skewColor);
        $modal.find(".tableName .text").text(tableName);
    }

    private _drawDistributionGraph(): void {
        let totalRows: number;
        let rows: number[];
        if (this._activeTable == null && !this._instanceOptions.tableInfo) {
            // error case
            return;
        }
        if (this._instanceOptions.tableInfo) {
            totalRows = this._instanceOptions.tableInfo.totalRows;
            rows = this._instanceOptions.tableInfo.rows;
        } else {
            const table = this._activeTable;
            totalRows = table.resultSetCount;
            rows = table.getRowDistribution();
        }


        const percentageLabel: boolean = this._percentageLabel;

        const data = rows.map((d, i) => {
            const row = percentageLabel ? d / totalRows : d;
            return {"row": row, "node": "Cluster Node " + i};
        });

        const $svg: JQuery = this._getModal().find(".chart").empty();
        const svg = d3.select($svg.get(0));

        const margin = {top: 15, right: 20, bottom: 70, left: 70};
        const width = $svg.width() - margin.left - margin.right;
        const height = $svg.height() - margin.top - margin.bottom;

        const xDomain = data.map(function(d) {return d.node; });
        const max: number = d3.max(data, function(d) { return d.row; });
        const x = d3.scale.ordinal().rangeBands([0, width], 0.5)
                .domain(xDomain);
        const y = d3.scale.linear().rangeRound([height, 0])
                .domain([0, max]);

        const w = Math.min(x.rangeBand(), 70);

        const xTicks = data.length < 50
                     ? xDomain
                     : xDomain.filter(function(_v, i) { return i % 10 === 0; });

        const xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickValues(xTicks);

        const yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(!percentageLabel && max <= 10 ? max : 10, percentageLabel ? "%" : null);

        const g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        g.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
        .selectAll("text")
            .attr("dx", "-.8em")
            .attr("dy", "-.7em")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-90)" );

        g.append("g")
            .attr("class", "y axis")
            .call(yAxis)
        .append("text")
            .attr("y", 6)
            .attr("dy", "-1.2em")
            .attr("dx", "-2em")
            .text(percentageLabel ? CommonTxtTstr.percentage : CommonTxtTstr.rows);

        g.selectAll(".bar")
            .data(data)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) {
                return x(d.node) + (x.rangeBand() - w) / 2;
            })
            .attr("width", w)
            .attr("y", function(d) { return y(d.row); })
            .attr("height", function(d) { return height - y(d.row); });

        this._addTooltipToChart();
    }

    private _addTooltipToChart(): void {
        const $modal: JQuery = this._getModal();
        const self = this;
        d3.select($modal.find(".chart").get(0))
        .selectAll(".bar").each(function(d) {
            const row: string = self._percentageLabel
                      ? Math.round(d.row * 100 * 100) / 100 + "%" // 2 digits
                      : xcStringHelper.numToStr(d.row);
            $(this).tooltip(<any>{
                trigger: "maunal",
                animation: false,
                placement: "top",
                container: "body",
                title: d.node + ": " + row
            });
        });
    }

    private _resetTooltip($ele): void {
        this._getModal().find(".bar").tooltip("hide");
        if ($ele != null) {
            $ele.tooltip("show");
        }
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });

        $modal.on("mouseover", ".bar", (event) => {
            event.stopPropagation();
            this._resetTooltip($(event.currentTarget));
        });

        $modal.on("mouseover", () => {
            this._resetTooltip(null);
        });

        $modal.on("click", ".chart", () => {
            this._percentageLabel = !this._percentageLabel;
            xcTooltip.hideAll();
            this._drawDistributionGraph();
        });
    }
}