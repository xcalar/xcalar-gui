// sets up monitor panel and system menubar
namespace MonitorPanel {
    let monitorDonuts: MonitorDonuts;
    let monitorGraph: MonitorGraph;
    const tabToPanelMap = {
        systemButton: "systemSubPanel",
        queriesButton: "queriesSubPanel",
    };

    /**
     * MonitorPanel.setup
     */
    export function setup(): void {
        monitorDonuts = new MonitorDonuts("monitor-donuts");
        _setupMonitorGraph();

        QueryManager.setup();

        _renderNodeInformation();
        _setupViewToggling();
        _addEventListeners();
    }

    /**
     * MonitorPanel.getGraph
     */
    export function getGraph(): MonitorGraph {
        return monitorGraph;
    }

    /**
     * MonitorPanel.getDounts
     */
    export function getDounts(): MonitorDonuts {
        return monitorDonuts;
    }

    // XXX move to system panel
    /**
     * MonitorPanel.active
     */
    export function active(): void {
        monitorGraph.start();
        QueryManager.showLogs();
        const curTab: string = $('#monitorTab').find('.subTab.active').attr("id");
        let title = MonitorTStr.System + ': ';

        switch (curTab) {
            case ("systemButton"):
                title += MonitorTStr.Monitor;
                break;
            case ("queriesButton"):
                title += MonitorTStr.Queries;
                break;
            default:
                break;
        }
        $("#container").addClass(tabToPanelMap[curTab] + "-active");
        $("#mainTopBar").find(".panelName").text(title);
    }

    // XXX move to system panel
    /**
     * MonitorPanel.inActive
     */
    export function inActive(): void {
        monitorGraph.clear();
        const $container = $("#container");
        for (let i in tabToPanelMap) {
            $container.removeClass(tabToPanelMap[i] + "-active");
        }
    }

    /**
     * MonitorPanel.stop
     */
    export function stop(): void {
        monitorGraph.stop();
    }

    /**
     * MonitorPanel.updateSetting
     * @param graphInterval
     */
    export function updateSetting(graphInterval: number): void {
        monitorGraph.updateInterval(graphInterval);
    }

    /**
     * MonitorPanel.tableUsageChange
     */
    export function tableUsageChange(): void {
        if (monitorGraph) {
            monitorGraph.tableUsageChange();
        }
    }

    function _getPanel(): JQuery {
        return $("#monitor-system");
    }

    function _setupMonitorGraph(): void {
        monitorGraph = new MonitorGraph("monitor-graphCard");
        monitorGraph
        .on("update", function(allStats, apiTopResult) {
            monitorDonuts.update(allStats);
            MemoryAlert.Instance.detectUsage(apiTopResult);
        });
    }

    function _renderNodeInformation(): void {
        if (typeof hostname !== "undefined") {
            $("#phyNode").text(hostname);
        }
        // Insert information here regarding virtual nodes next time
    }

    function _setupViewToggling() {
        let $monitorPanel = $("#monitorPanel");

        // main menu
        $('#monitorTab').find('.subTab').click(function() {
            let $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }
            $monitorPanel.find(".monitorSection.active").removeClass("active");
            let title = MonitorTStr.System + ': ';
            $monitorPanel.find(".mainContent").scrollTop(0);
            const $container = $("#container");
            for (let i in tabToPanelMap) {
                $container.removeClass(tabToPanelMap[i] + "-active");
            }
            const curTab: string = $button.attr("id");

            switch (curTab) {
                case ("systemButton"):
                    $("#monitor-system").addClass("active");
                    title += MonitorTStr.Monitor;
                    break;
                default:
                    break;
            }
            $container.addClass(tabToPanelMap[curTab] + "-active");
            $("#mainTopBar").find(".panelName").text(title);
        });
    }

    function _addEventListeners(): void {
        xcUIHelper.expandListEvent($("#monitorMenu-sys"));

        $("#monitorMenu-sys").find('.graphSwitch').click((e) => {
            let $switch = $(e.currentTarget);
            let index = $switch.index();
            $switch.find(".switch").toggleClass("on");
            let $monitorPanel = _getPanel();
            if (index === 1) {
                $monitorPanel.find(".graphSection").toggleClass("hideSwap");
            } else if (index === 2) {
                $monitorPanel.find(".graphSection").toggleClass("hideCPU");
            } else {
                $monitorPanel.find(".graphSection").toggleClass("hideRam");
            }

            // move graphs in front of others
            if ($switch.find(".switch").hasClass("on")) {
                let $graph = $monitorPanel.find('.line' + index + ', .area' + index);
                $monitorPanel.find('.mainSvg').children()
                            .append($graph, $graph);
            }
        });
    }
}
