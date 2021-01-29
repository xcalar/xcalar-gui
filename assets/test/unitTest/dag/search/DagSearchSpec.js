describe("DagSearch Test", function() {
    before(function(done) {
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    it("should show the search pop up", function() {
        // act
        DagSearch.Instance.show();
        // assert
        expect($("#dagSearch").is(":visible")).to.be.true;
    });

    it("should close the pop up", function() {
        // act
        $("#dagSearch").find(".close").click();
        // assert
        expect($("#dagSearch").is(":visible")).to.be.false;
    });

    after(function() {
        UnitTest.offMinMode();
    });
});