describe("DSS3Config Test", function() {
    let $card;
    let $dropdown;

    before(function() {
        $card = $("#dsForm-s3Config");
        $dropdown = $card.find(".dropDownList.connector");
    });

    it("should show the card", function() {
        DSS3Config.Instance.show();
        UnitTest.assertDisplay($card);
    });

    it("should click the dropdown to show the list", function() {
        $dropdown.find(".iconWrapper").click();
        let $lis = $dropdown.find(".list li");
        expect($lis.length).to.be.at.least(1);
        expect($lis.eq(0).hasClass("createNew")).to.be.true;
    });

    it("should click create new to create new s3 connector", function() {
        let oldFunc = ConnectorConfigModal.Instance.show;
        let called = false;
        ConnectorConfigModal.Instance.show = () => called = true;
        $dropdown.find(".list li.createNew").trigger(fakeEvent.mouseup);
        expect(called).to.be.true;

        ConnectorConfigModal.Instance.show = oldFunc;
    });

    it("should validate error case", function() {
        let oldStatus = StatusBox.show;
        let called = 0;
        StatusBox.show = () => called++;

        $dropdown.find("input").val("");
        $card.find(".confirm").click();
        expect(called).to.equal(1);

        // case 2
        $dropdown.find("input").val("test");
        $card.find(".path input").val("");
        $card.find(".confirm").click();
        expect(called).to.equal(2);

        StatusBox.show = oldStatus;
    });

    it("should add path", function() {
        $card.find(".addPath").click();
        expect($card.find(".path input").length).to.equal(2);
    });

    it("should toggle switch multiDS", function() {
        let $switch = $card.find(".multiDS .switch");
        let hasOn = $switch.hasClass("on");
        $switch.click();
        expect($switch.hasClass("on")).to.equal(!hasOn);
        // case 2
        $switch.click();
        expect($switch.hasClass("on")).to.equal(hasOn);
    });

    it("should submit", function() {
        let oldFunc = DSConfig.show;
        let test = null;
        DSConfig.show = (arg) => { test = arg; };

        $dropdown.find("input").val("target");
        $card.find(".path input").eq(0).val("path");
        $card.find(".confirm").click();

        expect(test).to.deep.equal({
            targetName: "target",
            files: [{path: "path"}],
            multiDS: false
        });
        expect($card.find(".path input").eq(0).val()).to.equal("");
        DSConfig.show = oldFunc;
    });

    it("back from preview should restore form", function() {
        var oldFunc = DSConfig.show;
        DSConfig.show = function(_arg, cb) {
            cb();
        };

        $dropdown.find("input").val("target");
        $card.find(".path input").eq(0).val("path");
        $card.find(".confirm").click();

        expect($card.find(".path input").eq(0).val()).to.equal("path");
        DSConfig.show = oldFunc;
    });

    it("should go back", function() {
        let oldFunc = DataSourceManager.startImport;
        let called;
        DataSourceManager.startImport = (arg) => called = arg;
        $card.find(".path input").eq(0).val("path");
        $card.find(".back").click();
        expect(called).to.equal(null);
        expect($card.find(".path input").eq(0).val()).to.equal("");

        DataSourceManager.startImport = oldFunc;
    });

    it("should close", function() {
        DataSourceManager.startImport(true);
        UnitTest.assertHidden($card);
    });

    after(function() {
        $dropdown.find("input").val("");
    });
});