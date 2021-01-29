// XXX TODO: resuse with DagParamPopup
class DagAggPopup {
    protected $panel: JQuery;
    private $retLists: JQuery;
    private $aggManagerPopup: JQuery;
    private $btn: JQuery;
    private modalHelper: ModalHelper;

    private aggRowLen: number = 5;
    private aggRowTemplate: HTML = '<div class="row unfilled">' +
        '<div class="cell aggNameWrap textOverflowOneLine">' +
            '<div class="aggName textOverflowOneLine"></div>' +
        '</div>' +
        '<div class="cell aggGraphNameWrap textOverflowOneLine">' +
            '<div class="aggGraphName textOverflowOneLine"></div>' +
        '</div>' +
        '<div class="cell aggValWrap textOverflowOneLine">' +
            '<div class="aggVal" spellcheck="false"/>' +
        '</div>' +
        '<div class="cell aggNoValueWrap">' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-15"></i>' +
                '<i class="icon xi-ckbox-selected fa-15"></i>' +
            '</div>' +
        '</div>' +
        '<div class="cell aggActionWrap">' +
            '<i class="aggDelete icon xi-close fa-15 xc-action xc-hidden">' +
            '</i>' +
        '</div>' +
    '</div>';

    constructor($panel: JQuery, $btn: JQuery) {
        this.$panel = $panel;
        this.$aggManagerPopup = $("#aggManagerPopup");
        this.$retLists = this.$aggManagerPopup.find(".aggList");
        this.$btn = $btn;
        this._setupListeners();
        this.modalHelper = new ModalHelper(this.$aggManagerPopup, {
            noBackground: true
        });
    }

    private _setupListeners(): void {
        const self = this;

         // toggle open retina pop up
        this.$btn.click(() => {
            this.show();
        });

        const $aggManagerPopup = $("#aggManagerPopup");

        $aggManagerPopup.on("click", ".close", () => {
           self.closePopup();
        });


        // delete retina para
        $aggManagerPopup.on("click", ".aggDelete",  function (event) {
            event.stopPropagation();
            var $row: JQuery = $(this).closest(".row");
            self.deleteAgg($row);
        });

        $aggManagerPopup.on("mouseup", ".aggNameWrap .copy", function() {
            if ($(this).closest($aggManagerPopup).length) {
                xcUIHelper.copyToClipboard($(this).closest(".aggName").text());
            }
        });

        $aggManagerPopup.on("mouseup", ".aggNameWrap .find", function() {
            const $findIcon = $(this);
            if (!$findIcon.closest(".noDataflow").length) {
                const $row = $findIcon.closest(".row");
                const nodeId = $row.data("nodeid");
                const tabId = $row.data("dataflowid");

                const aggName: string = $row.find(".aggName").text();

                DagViewManager.Instance.focusOnNode(nodeId, tabId)
                .then(($node) => {
                    StatusBox.show(aggName, $node, false, {type: "info", title: "Aggregate"});
                })
                .fail(() => {
                    StatusBox.show(aggName + " could not be found.", $aggManagerPopup);
                });
            }
        });

        // XXX buggy
        // this.$aggManagerPopup.resizable({
        //     "handles": "w, s, sw",
        //     "minWidth": 558,
        //     "minHeight": 210
        // });
    }

    private show(): void {
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            xcTooltip.add($(this), {"title": TooltipTStr.OnlyInOpMode});
            xcTooltip.refresh($(this));
        }

        xcMenu.close();
        StatusBox.forceHide();

        if (!this.$aggManagerPopup.hasClass("active")) {
            this.initializeList();
            this.$aggManagerPopup.addClass("active");
            $("#container").on("mousedown.aggPopup", (event) => {
                const $target: JQuery = $(event.target);
                if (this.$aggManagerPopup.hasClass("active") &&
                    !$target.closest(".tabWrap").length &&
                    !$target.closest(".retTab").length &&
                    !$target.closest(this.$aggManagerPopup).length) {
                    this.closePopup();
                    return false;
                }
            });
            this.modalHelper.setup();
        } else {
            this.closePopup();
        }
    }

    private initializeList(): void {
        const aggs: {[key: string]: AggregateInfo} = DagAggManager.Instance.getAggMap();
        let html: string = "";
        for (let i = 0; i < this.aggRowLen; i++) {
            html += this.aggRowTemplate;
        }
        this.$retLists.html(html);
        let aggArray: any[] = [];

        for (let i in aggs) {
            aggArray.push({
                name: aggs[i].aggName,
                value: aggs[i].value,
                notRun: !aggs[i].value,
                graph: aggs[i].graph,
                node: aggs[i].node
            });
        }
        aggArray = aggArray.sort(sortAggs);
        for (let i = 0; i < aggArray.length; i++) {
            this.addAggToList(aggArray[i].name,
                                aggArray[i].value,
                                aggArray[i].notRun,
                                aggArray[i].node,
                                aggArray[i].graph);
        }

        function sortAggs(a, b) {
            return xcHelper.sortVals(a.name, b.name);
        }
    }

    private addAggToList(
        name: string,
        val: number | string,
        isEmpty: boolean,
        node?: DagNodeId,
        graph?: string
    ): void {
        let $row: JQuery = this.$retLists.find(".unfilled:first");

        if (!$row.length) {
            $row = $(this.aggRowTemplate);
            this.$retLists.append($row);
            xcUIHelper.scrollToBottom(this.$retLists.closest(".tableContainer"));
        }

        let graphName = "";
        if (graph) {
            let tab = DagList.Instance.getDagTabById(graph);
            if (tab != null) {
                graphName = tab.getName();
            }
        }

        $row.find(".aggName").text(name);

        let findText = "";
        if (node && graph) {
            findText = "Find aggregate node";
            $row.data("nodeid", node);
            $row.data("dataflowid", graph);
        } else {
            findText = "Aggregate node cannot be found";
            $row.find(".aggNameWrap").addClass("noDataflow");
        }
        let iconHtml = '<i class="icon find xi-search" ' + xcTooltip.Attrs + ' data-original-title="' + findText + '"></i>' +
            '<i class="icon copy xi-copy-clipboard" ' + xcTooltip.Attrs + ' data-original-title="Copy aggregate name"></i>';
        $row.find(".aggName").append(iconHtml);

        if (graphName != "") {
            $row.find(".aggGraphName").val(graphName);
            $row.find(".aggGraphName").text(graphName);

        }

        if (val != null) {
            $row.find(".aggVal").val(val);
            $row.find(".aggVal").text(val);
        } else if (isEmpty) {
            $row.find(".aggNoValueWrap .checkbox").addClass("checked");
        }

        $row.removeClass("unfilled");

        if (val == null) { // empty
            $row.find(".aggNoValueWrap .checkbox").removeClass("xc-disabled");
        } else {
            $row.find(".aggNoValueWrap .checkbox").removeClass("checked")
                                                    .addClass("xc-disabled");
        }

        $row.find(".aggActionWrap .aggDelete").removeClass("xc-hidden");
    }

    private closePopup(): void {
        this.$aggManagerPopup.removeClass("active");
        StatusBox.forceHide();
        $("#container").off("mousedown.aggPopup");
        $(window).off(".aggPopup");
        this.modalHelper.clear();
    }

    private deleteAgg($row: JQuery): void {
        var self = this;
        const $aggName: JQuery = $row.find(".aggName");
        const aggName: string = $aggName.text();
        const nodeId = $row.data("nodeid");
        const graphId = $row.data("dataflowid");
        this.$aggManagerPopup.find(".aggDelete").addClass("xc-disabled");
        const backName = aggName;

        DagAggManager.Instance.removeAgg(backName)
        .then(() => {
            this.$aggManagerPopup.find(".aggDelete").removeClass("xc-disabled");

            $row.remove();
            if (self.$retLists.find(".row").length < this.aggRowLen) {
                self.$retLists.append(this.aggRowTemplate);
            }

            let tab: DagTab = DagList.Instance.getDagTabById(graphId);
            if (!tab) {
                return;
            }
            let graph: DagGraph = tab.getGraph();
            // if the tab isn't loaded, we cant reset the node.
            if (graph && nodeId) {
                graph.reset([nodeId]);
            }
        })
        .fail((err) => {
            console.error(err);
            this.$aggManagerPopup.find(".aggDelete").removeClass("xc-disabled");
        });
    }

}