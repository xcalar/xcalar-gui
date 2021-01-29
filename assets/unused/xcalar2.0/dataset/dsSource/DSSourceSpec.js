describe("DSSource Test", function() {
    let $card;

    before(function() {
        $card = $("#dsForm-source");
    });

    it("should switch to form panel if it's on prem", function() {
        let oldFormShow = DSForm.show;
        let oldSwitch = DataSourceManager.switchView;
        let test1 = false, test2 = false;
        DSForm.show = () => test1 = true;
        DataSourceManager.switchView = () => test2 = true;

        DSSource.show();
        expect(test1).to.be.true;
        expect(test2).to.be.false;

        DSForm.show = oldFormShow;
        DataSourceManager.switchView = oldSwitch;
    });

    it("should show form if click more", function() {
        let oldFormShow = DSForm.show;
        let called = false;
        DSForm.show = () => called = true;

        $card.find(".more").click();
        expect(called).to.be.true;

        DSForm.show = oldFormShow;
    });

    it("should show s3 config panel if click s3 part", function() {
        let oldFunc = DSS3Config.Instance.show;
        let called = false;
        DSS3Config.Instance.show = () => called = true;

        $card.find(".location.s3").click();
        expect(called).to.be.true;

        DSS3Config.Instance.show = oldFunc;
    });

    it("should show db config panel if click db part", function() {
        let oldFunc = DSDBConfig.Instance.show;
        let called = false;
        DSDBConfig.Instance.show = () => called = true;

        $card.find(".location.database").click();
        expect(called).to.be.true;

        DSDBConfig.Instance.show = oldFunc;
    });
});