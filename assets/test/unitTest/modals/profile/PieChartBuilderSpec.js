describe("PieChartBuilder Test", function() {
    before(function() {
        $("#profileModal").show();
    });

    it("should be the correct instance", function() {
        let chartBuilder = new PieChartBuilder();
        expect(chartBuilder).to.be.an.instanceof(PieChartBuilder);
    });

    it("should getType", function() {
        let chartBuild = new PieChartBuilder();
        expect(chartBuild.getType()).to.equal("pie");
    });

    it("should get and set radius", function() {
        let chartBuilder = new PieChartBuilder("profileModal");
        chartBuilder._setRadius(1);
        expect(chartBuilder.getRadius()).to.equal(1);
    });

    it("_getColorClass should work", function() {
        let chartBuilder = new PieChartBuilder("profileModal");
        let res = chartBuilder._getColorClass(1);
        expect(res).to.equal("color-1");
    });

    it("_midAngle should work", function() {
        let chartBuilder = new PieChartBuilder("profileModal");
        let res = chartBuilder._midAngle({
            startAngle: 10,
            endAngle: 20
        });
        expect(res).to.equal(15);
    });

    it("should build pie chart", function() {
        let chartBuilder = new PieChartBuilder("profileModal", {
            data: [{"x": 1, "y": 10}],
            bucketSize: 1,
            xName: "x",
            yName: "y",
            nullCount: 0,
            max: 10,
            sum: 10,
            decimal: 0
        });
        chartBuilder.build();

        let $section = $("#profileModal .groupbyChart");
        expect($section.find(".area").length).to.equal(1);
    });

    after(function() {
        $("#profileModal").hide();
        $("#profileModal .groupbyChart").empty();
    });
});