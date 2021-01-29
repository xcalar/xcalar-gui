describe("StatsObjSwap Test", function() {
    it("should be the correct instance", function() {
        let statsObj = new StatsObjSwap();
        expect(statsObj).to.be.an.instanceof(StatsObj);
        expect(statsObj.used).to.equal(0);
        expect(statsObj.total).to.equal(0);
        expect(statsObj.nodes.length).to.equal(0);
    });

    it("addNodeStats should work", function() {
        let statsObj = new StatsObjSwap();
        statsObj.addNodeStats({
            sysSwapUsedInBytes: 10,
            sysSwapTotalInBytes: 20
        }, 1);
        expect(statsObj.used).to.equal(10);
        expect(statsObj.total).to.equal(20);
        expect(statsObj.nodes.length).to.equal(1);
    });
});