describe("StatsObjCPU Test", function() {
    it("should be the correct instance", function() {
        let statsObj = new StatsObjCPU();
        expect(statsObj).to.be.an.instanceof(StatsObj);
        expect(statsObj.used).to.equal(0);
        expect(statsObj.total).to.equal(0);
        expect(statsObj.nodes.length).to.equal(0);
    });

    it("addNodeStats should work", function() {
        let statsObj = new StatsObjCPU();
        statsObj.addNodeStats({cpuUsageInPercent: 10}, 1);
        expect(statsObj.used).to.equal(10);
        expect(statsObj.total).to.equal(100);
        expect(statsObj.nodes.length).to.equal(1);
    });

    it("updateOverallStats should work", function() {
        let statsObj = new StatsObjCPU();
        statsObj.addNodeStats({cpuUsageInPercent: 10});
        statsObj.addNodeStats({cpuUsageInPercent: 20});
        statsObj.updateOverallStats(2);
        expect(statsObj.used).to.equal(15);
        expect(statsObj.total).to.equal(100);
    });
});