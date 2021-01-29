// monitor panel is not used in new notebook UX
describe.skip("MonitorPanel Test", function() {
    var $mainTabCache;
    var $monitorPanel;
    var $monitorMenu;

    before(function() {
        $mainTabCache = $(".topMenuBarTab.active");
        $monitorPanel = $("#monitor-system");
        $monitorMenu = $("#monitorMenu-sys");
        if (!$("#monitorTab").hasClass("active")) {
            $("#monitorTab .mainTab").click();
        }

        $("#systemButton").click();
    });

    describe("toggling graph switches", function() {
        it("switching should work", function() {
            var $area0 = $monitorPanel.find(".area0");
            var $area1 = $monitorPanel.find(".area1");

            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(0).click();
            expect($area0.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area0)).to.be.gt(
                                $monitorPanel.find(".area").index($area1));


            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.equal("none");
            $monitorMenu.find(".graphSwitch").eq(1).click();
            expect($area1.css("display")).to.not.equal("none");
            expect($monitorPanel.find(".area").index($area1)).to.be.gt(
                                $monitorPanel.find(".area").index($area0));
        });
    });

    describe("list interactions", function() {
        it("toggling monitor system lists should work", function() {
            var $listInfo = $("#monitorMenu-sys").find(".listInfo").eq(0);
            var wasActive = $listInfo.closest(".listWrap").hasClass("active");
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.not.equal(wasActive);
            $listInfo.find(".expand").click();
            expect($listInfo.closest(".listWrap").hasClass("active")).to.equal(wasActive);
        });
    });


    it("MonitorPanel.inActive should work", function() {
        var monitorGraph = MonitorPanel.getGraph();
        var cache = monitorGraph.clear;
        var called = false;
        monitorGraph.clear = function() {
            called = true;
        };

        MonitorPanel.inActive();
        expect(called).to.be.true;
        monitorGraph.clear = cache;
    });

    after(function() {
        $mainTabCache.click();
    });
});