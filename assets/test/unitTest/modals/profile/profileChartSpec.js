describe("ProfileChart Test", function() {
    it("should get bar chart builder", function() {
        let chartBuilder = ProfileChart.get("bar");
        expect(chartBuilder).to.be.an.instanceof(BarChartBuilder);
    });

    it("should get pie chart builder", function() {
        let chartBuilder = ProfileChart.get("pie");
        expect(chartBuilder).to.be.an.instanceof(PieChartBuilder);
    });

    it("should not get unsupport builder", function() {
        try {
            ProfileChart.get("test");
        } catch (e) {
            expect(e.message).not.to.be.empty;
        }
    });
});