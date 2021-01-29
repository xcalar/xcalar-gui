describe("AbstractCharBuilderSpec Test", function() {
    it("should be the correct instance", function() {
        let chartBuilder = new AbstractChartBuilder();
        expect(chartBuilder).to.be.an.instanceof(AbstractChartBuilder);
    });

    it("should have options", function() {
        let chartBuilder = new AbstractChartBuilder("test", {type: "string"});
        let options = chartBuilder._options;
        expect(options).to.be.an("object");
    });

    it("_getModal should work", function() {
        let chartBuilder = new AbstractChartBuilder("profileModal");
        let $modal = chartBuilder._getModal();
        expect($modal.attr("id")).to.equal("profileModal");
    });

    it("_getSection should work", function() {
        let chartBuilder = new AbstractChartBuilder("profileModal");
        let $section = chartBuilder._getSection();
        expect($section.length).to.equal(1);
    });

    it("_getChartSelector should work", function() {
        let chartBuilder = new AbstractChartBuilder("test");
        let selector = chartBuilder._getChartSelector();
        expect(selector).to.equal("#test .groupbyChart");
    });

    it("_getLabel should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {
            percentage: true,
            nullCount: 10,
            sum: 90,
            yName: "y"
        });

        let res = chartBuilder._getLabel({"y": 10}, 3);
        expect(res).to.equal("10.0%");

        // case 2
        chartBuilder = new AbstractChartBuilder("test", {
            yName: "y"
        });

        res = chartBuilder._getLabel({"y": 1.2345}, 5);
        expect(res).to.equal("1.234..");

        // case 3
        res = chartBuilder._getLabel({"y": 1.2345}, 6);
        expect(res).to.equal("1.2345");
    });

    it("_getXAxis should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {
            bucketSize: 10,
            sorted: true,
            decimal: 0,
            xName: "x"
        });

        let res = chartBuilder._getXAxis({x: 10});
        expect(res).to.equal("10-20");
        // case 2
        res = chartBuilder._getXAxis({x: 10}, 3);
        expect(res).to.equal("10-..");
    });

    it("_getTooltpAndClass should work", function() {
        let ele = $('<div></div>').get(0);
        let getTitle = function(element) {
            return $(element).data("bs.tooltip").options.title;
        };
        let chartBuilder = new AbstractChartBuilder("test", {
            percentage: true,
            xName: "x",
            yName: "y",
            decimal: 0,
            sum: 90,
            nullCount: 10
        });

        let res = chartBuilder._getTooltpAndClass(ele, {
            y: 10,
            section: "other"
        });
        expect(res).to.equal("area");
        expect(getTitle(ele))
        .to.equal("Value: Other<br>Percentage: 10.000%");

        // case 2
        chartBuilder = new AbstractChartBuilder("test", {
            bucketSize: 0,
            xName: "x",
            yName: "y",
            decimal: 0,
            sum: 1,
            nullCount: 0,
            percentage: true
        });
        chartBuilder._getTooltpAndClass(ele, {
            y: 0.000001,
            x: "xLabel"
        });

        expect(getTitle(ele))
        .to.equal("Value: \"xLabel\"<br>Percentage: 1.00e-4%");

        // case 3
        chartBuilder = new AbstractChartBuilder("test", {
            bucketSize: 10,
            xName: "x",
            yName: "y",
            decimal: 0,
        });
        chartBuilder._getTooltpAndClass(ele, {
            y: 50,
            x: 10
        });
        expect(getTitle(ele)).to.equal("Value: [10, 20)<br>Frequency: 50");
    });

    it("_getNumInScale should work", function() {
        let chartBuilder = new AbstractChartBuilder("test");
        // case 1
        let res = chartBuilder._getNumInScale(1);
        expect(res).to.equal(1);
        // case 2
        res = chartBuilder._getNumInScale(0, true);
        expect(res).to.equal(0);
        // case 3
        res = chartBuilder._getNumInScale(2, true);
        expect(res).to.equal(10);
        // case 4
        res = chartBuilder._getNumInScale(-2, true);
        expect(res).to.equal(-10);
    });

    it("_formatNumber should work", function() {
        let chartBuilder = new AbstractChartBuilder("test");
        let res = chartBuilder._formatNumber(null);
        expect(res).to.equal("");
        // case 2
        res = chartBuilder._formatNumber("1");
        expect(res).to.equal("\"1\"");
        // case 3
        res = chartBuilder._formatNumber(true);
        expect(res).to.equal(true);
        // case 4
        var obj = {};
        res = chartBuilder._formatNumber(obj);
        expect(res).to.equal(JSON.stringify(obj));
        // case 5
        res = chartBuilder._formatNumber(1);
        expect(res).to.equal("1");
        // case 6
        res = chartBuilder._formatNumber(1, true);
        expect(res).to.equal(1);
        // case 7
        res = chartBuilder._formatNumber(2, true);
        expect(res).to.equal("2e+0");
        // case 8
        res = chartBuilder._formatNumber(1, false, 2);
        expect(res).to.equal("1.00");

        // case 9
        res = chartBuilder._formatNumber("FNF", null, null, true);
        expect(res).to.equal("FNF");
    });

    it("getType should work", function() {
        let chartBuilder = new AbstractChartBuilder("test");
        var res = chartBuilder.getType();
        expect(res).to.equal(undefined);
    });

    it("getXName should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {xName: "testX"});
        let res = chartBuilder.getXName();
        expect(res).to.equal("testX");
    });

    it("getYName should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {yName: "testY"});
        let res = chartBuilder.getYName();
        expect(res).to.equal("testY");
    });

    it("getBuckSize should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {bucketSize: 1});
        let res = chartBuilder.getBuckSize();
        expect(res).to.equal(1);
    });

    it("getData should work", function() {
        let data = [1, 2];
        let chartBuilder = new AbstractChartBuilder("test", {data: data});
        let res = chartBuilder.getData();
        expect(res).to.equal(data);
    });

    it("isSorted should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {sorted: true});
        let res = chartBuilder.isSorted();
        expect(res).to.be.true;
    });

    it("isNoBucket should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {bucketSize: 0});
        let res = chartBuilder.isNoBucket();
        expect(res).to.be.true;

        // case 2
        chartBuilder = new AbstractChartBuilder("test", {bucketSize: 1});
        res = chartBuilder.isNoBucket();
        expect(res).to.be.false;
    });

    it("getLowerBound should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {bucketSize: 10});
        let res = chartBuilder.getLowerBound(10);
        expect(res).to.equal(10);
    });

    it("getUpperBound should work", function() {
        let chartBuilder = new AbstractChartBuilder("test", {bucketSize: 10});
        let res = chartBuilder.getUpperBound(10);
        expect(res).to.equal(20);
    });
});