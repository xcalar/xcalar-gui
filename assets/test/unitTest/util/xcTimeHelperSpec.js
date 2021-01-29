describe("xcTimeHelper Test", function() {
    it("xcTimeHelper.getCurrentTimeStamp should work", function() {
        var res = xcTimeHelper.getCurrentTimeStamp();
        var d = new Date().getTime();
        expect((res - d) < 100).to.be.true;
    });

    it("xcTimeHelper.timeStampConvertSeconds should work", function() {
        expect(xcTimeHelper.timeStampConvertSeconds(100000))
        .to.equal("1 day, 3 hours, 46 minutes, 40 seconds");

        expect(xcTimeHelper.timeStampConvertSeconds(100000, true))
        .to.equal("1 day, 3 hours, 46 minutes, 40 seconds");

        expect(xcTimeHelper.timeStampConvertSeconds(10000))
        .to.equal("0 days, 2 hours, 46 minutes, 40 seconds");

        expect(xcTimeHelper.timeStampConvertSeconds(10000, true))
        .to.equal("2 hours, 46 minutes, 40 seconds");
    });

    describe('xcTimeHelper.getElapsedTimeStr())', function() {
        it("xcTimeHelper.getElapsedTimeStr should work", function() {
            var func = xcTimeHelper.getElapsedTimeStr;
            expect(func(999)).to.equal('999ms');
            expect(func(1000)).to.equal('1.00s');
            expect(func(1999)).to.equal('1.99s');
            expect(func(1099)).to.equal('1.09s');
            expect(func(19999)).to.equal('19.9s');
            expect(func(69000)).to.equal('1m 9s');
            expect(func(699900)).to.equal('11m 39s');
            expect(func(5000000)).to.equal('1h 23m 20s');
            expect(func(105000000)).to.equal('29h 10m 0s');
        });
    });

    it("xcTimeHelper.getDate should work", function() {
        // case 1
        var d = new Date("01/01/2001");
        var res = xcTimeHelper.getDate(undefined, d);
        expect(res).to.equal(d.toLocaleDateString().replace(/\//g, "-"));
        // case 2
        res = xcTimeHelper.getDate("/", d);
        expect(res).to.equal(d.toLocaleDateString());
        // case 3
        var time = d.getTime();
        res = xcTimeHelper.getDate("/", null, time);
        expect(res).to.equal(d.toLocaleDateString());
    });
});