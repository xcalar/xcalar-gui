describe("BarChartBuilder Test", function() {
    before(function() {
        $("#profileModal").show();
    });

    it("should be the correct instance", function() {
        let chartBuild = new BarChartBuilder();
        expect(chartBuild).to.be.an.instanceof(BarChartBuilder);
    });

    it("should getType", function() {
        let chartBuild = new BarChartBuilder();
        expect(chartBuild.getType()).to.equal("bar");
    });

    it("should build bar chart", function() {
        let chartBuilder = new BarChartBuilder("profileModal", {
            data: [{"x": "xLabel", "y": 10}],
            bucketSize: 0,
            xName: "x",
            yName: "y",
            nullCount: 0,
            max: 10,
            sum: 10,
            decimal: 0,
            initial: true,
        });
        chartBuilder.build();

        let $section = $("#profileModal .groupbyChart");
        expect($section.find(".area").length).to.equal(1);
        expect($section.find(".tick").length).to.equal(1);
        expect($section.find(".xlabel").length).to.equal(1);
    });

    it("should update bar chart", function() {
        let chartBuilder = new BarChartBuilder("profileModal", {
            data: [{x: "xLabel", y: 10}, {x: "xLabel2", y: 20}],
            bucketSize: 0,
            xName: "x",
            yName: "y",
            nullCount: 0,
            max: 10,
            sum: 10,
            decimal: 0,
        });
        chartBuilder.build();

        let $section = $("#profileModal .groupbyChart");
        expect($section.find(".area").length).to.equal(2);
        expect($section.find(".tick").length).to.equal(2);
        expect($section.find(".xlabel").length).to.equal(2);
    });

    it("should build bar chart with bucket", function() {
        let chartBuilder = new BarChartBuilder("profileModal", {
            data: [{"x": 1, "y": 10}],
            bucketSize: 1,
            xName: "x",
            yName: "y",
            nullCount: 0,
            max: 10,
            sum: 10,
            decimal: 0,
            initial: true
        });
        chartBuilder.build();

        let $section = $("#profileModal .groupbyChart");
        expect($section.find(".area").length).to.equal(1);
        expect($section.find(".tick").length).to.equal(2);
        expect($section.find(".xlabel").length).to.equal(1);
    });

    it("should build bar chart in resize case", function() {
        let chartBuilder = new BarChartBuilder("profileModal", {
            data: [{"x": 1, "y": 10}],
            bucketSize: 1,
            xName: "x",
            yName: "y",
            nullCount: 0,
            max: 10,
            sum: 10,
            decimal: 0,
            resize: true,
            resizeDelay: 0
        });
        chartBuilder.build();

        let $section = $("#profileModal .groupbyChart");
        expect($section.find(".area").length).to.equal(1);
        expect($section.find(".tick").length).to.equal(2);
        expect($section.find(".xlabel").length).to.equal(1);
    });

    after(function() {
        $("#profileModal").hide();
        $("#profileModal .groupbyChart").empty();
    });
});
