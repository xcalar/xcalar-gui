describe("MonitorGraph Test", function() {
    let monitorGraph;
    let $monitorPanel;

    before(function() {
        $monitorPanel = $("#monitor-system");
        monitorGraph = MonitorPanel.getGraph();
    });

    it("should be the correct instance", function() {
        expect(monitorGraph).to.be.an.instanceof(MonitorGraph);
    });

    it("should add event listeners", function() {
        let called = false;
        monitorGraph.on("test", function() {
            called = true;
        });
        monitorGraph._event.dispatchEvent("test");
        expect(called).to.equal(true);
        delete monitorGraph._event._events["test"];
    });

    it("clear should work", function() {
        monitorGraph._datasets = [[0], [0]];
        monitorGraph.clear();
        expect(monitorGraph._datasets.length).to.equal(0);
    });

    it("start should work", function() {
        let oldFunc = monitorGraph._oneCycleUpdate;
        let called = false;
        monitorGraph._oneCycleUpdate = () => { called = true; };
        
        monitorGraph.start();
        expect(called).to.be.true;

        monitorGraph._oneCycleUpdate = oldFunc;
    });

    it("stop should work", function() {
        monitorGraph._graphCycle = 1;
        monitorGraph.stop();
        expect(monitorGraph._graphCycle).to.be.undefined;
    });

    it('_getStatsAndUpdateGraph should work', function(done) {
        var cachedTopFn = XcalarApiTop;
        XcalarApiTop = function() {
            var stats = {
                numNodes: 1,
                topOutputPerNode: [{
                    "childrenCpuUsageInPercent": 5,
                    "cpuUsageInPercent": 10,
                    "parentCpuUsageInPercent": 10,

                    "memUsageInPercent": 60,
                    "totalAvailableMemInBytes": 200 * GB,

                    "xdbUsedBytes": 40 * GB,
                    "xdbTotalBytes": 50 * GB,
                    "networkRecvInBytesPerSec": 0,
                    "networkSendInBytesPerSec": 0,

                    "datasetUsedBytes": 1 * MB,

                    "sysSwapUsedInBytes": 5 * GB,
                    "sysSwapTotalInBytes": 10 * GB
                }]
            };

            return PromiseHelper.resolve(stats);
        };
        var cachedGetMemUsage = XcalarGetMemoryUsage;
        XcalarGetMemoryUsage = function() {
            return PromiseHelper.resolve({
                userMemory: {
                    numSessions: 1,
                    sessionMemory: [{
                        numTables: 1,
                        tableMemory: [{
                            totalBytes: 1000
                        }]
                    }]
                }
            });
        };


        var dataset = [[0],[0],[0]];
        monitorGraph._freshData = false;
        monitorGraph._datasets = dataset;

        monitorGraph._getStatsAndUpdateGraph()
        .then(function() {
            expect(dataset[0][1]).to.equal("40.0");
            expect(dataset[1][1]).to.equal("5.00");
            expect(dataset[2][1]).to.equal(10);

            expect($monitorPanel.find(".line").length).to.equal(3);
            expect($monitorPanel.find(".area").length).to.equal(3);
            // console.log($monitorPanel.find(".line0").attr("d"), $monitorPanel.find(".line1").attr("d"), $monitorPanel.find(".line2").attr("d"))
            expect($monitorPanel.find(".line0").attr("d")).to.equal("M0,210L6,168");
            expect($monitorPanel.find(".line1").attr("d")).to.equal("M0,210L6,204.75");
            expect($monitorPanel.find(".line2").attr("d")).to.equal("M0,210L6,189");

            // labels should be 40, 80, 120, 160, 200
            // expect($monitorPanel.find(".memYAxisWrap text").text()).to.equal("4080120160200");
            // expect($monitorPanel.find(".memYAxisWrap .unit").text()).to.equal("0 (GiB)");

            // order changes when clicked
            $monitorPanel.find(".area").eq(0).click();
            expect($monitorPanel.find(".area").last().css("opacity")).to.equal("0.4");
            $monitorPanel.find(".area").last().click();
            expect($monitorPanel.find(".area").last().css("opacity")).to.equal("0.8");

            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarApiTop = cachedTopFn;
            XcalarGetMemoryUsage = cachedGetMemUsage;
        })
    });

    it("_toggleErrorScreen should work", function() {
        monitorGraph._toggleErrorScreen(true);
        var $errorScreen = monitorGraph._getPanel().find(".statsErrorContainer");
        expect($errorScreen.hasClass("xc-hidden")).to.be.false;
        expect($errorScreen.text()).to.equal(MonitorTStr.StatsFailed);

        monitorGraph._toggleErrorScreen(true, {error: "test"});
        expect($errorScreen.text()).to.equal("test");

        monitorGraph._toggleErrorScreen(false);
        expect($errorScreen.hasClass("xc-hidden")).to.be.true;
    });

    after(function() {
        monitorGraph.clear();
    });
});
