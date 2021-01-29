describe("StatsObjMem Test", function() {
    it("should be the correct instance", function() {
        let statsObj = new StatsObjMem();
        expect(statsObj).to.be.an.instanceof(StatsObj);
        expect(statsObj.used).to.equal(0);
        expect(statsObj.total).to.equal(0);
        expect(statsObj.nodes.length).to.equal(0);
        expect(statsObj.datasetUsage).to.equal(0);
        expect(statsObj.xdbUsed).to.equal(0);
        expect(statsObj.xdbTotal).to.equal(0);
        expect(statsObj.memUsedInBytes).to.equal(0);
        expect(statsObj.sysMemUsed).to.equal(0);
        expect(statsObj.pubTableUsage).to.equal(0);
        expect(statsObj.userTableUsage).to.equal(0);
        expect(statsObj.otherTableUsage).to.equal(0);
    });

    it("addNodeStats should work", function() {
        let statsObj = new StatsObjMem();
        statsObj.addNodeStats({
            memUsedInBytes: 10,
            sysMemUsedInBytes: 20,
            datasetUsedBytes: 30,
            publishedTableUsedBytes: 40,
            xdbUsedBytes: 50,
            xdbTotalBytes: 60,
            totalAvailableMemInBytes: 70
        }, 0);
        expect(statsObj.used).to.equal(50);
        expect(statsObj.total).to.equal(70);
        expect(statsObj.nodes.length).to.equal(1);
        expect(statsObj.nodes[0].node).to.equal(0);

        expect(statsObj.memUsedInBytes).to.equal(10);
        expect(statsObj.sysMemUsed).to.equal(20);
        expect(statsObj.datasetUsage).to.equal(30);
        expect(statsObj.pubTableUsage).to.equal(40);
        expect(statsObj.xdbUsed).to.equal(50);
        expect(statsObj.xdbTotal).to.equal(60);
    });

    it("updateOverallStats should work", function() {
        let statsObj = new StatsObjMem();
        statsObj.addNodeStats({
            memUsedInBytes: 10,
            sysMemUsedInBytes: 20,
            datasetUsedBytes: 30,
            publishedTableUsedBytes: 40,
            xdbUsedBytes: 100,
            xdbTotalBytes: 160,
            totalAvailableMemInBytes: 500
        }, 0);
        statsObj.updateOverallStats(10);
        expect(statsObj.otherTableUsage).to.equal(20);
        expect(statsObj.xdbFree).to.equal(60);
        expect(statsObj.nonXdb).to.equal(340);
        expect(statsObj.sysMemFree).to.equal(490);
    });
});