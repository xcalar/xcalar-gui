describe("DSDBConfig Test", function() {
    let $card;
    let $dropdown;

    before(function() {
        $card = $("#dsForm-dbConfig");
        $dropdown = $card.find(".dropDownList.connector");
    });

    it("should show the card", function() {
        DSDBConfig.Instance.show();
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

    it("should browse", function() {
        var called = false;
        var oldFunc = FileBrowser.show;
        FileBrowser.show = function() {
            called = true;
        };

        $dropdown.find("input").val("connector");
        $card.find(".path input").val("path");
        $card.find(".browse").click();

        expect(called).to.equal(true);
        FileBrowser.show = oldFunc;
    });

    it("back from file browser should restore form", function() {
        var oldFunc = FileBrowser.show;
        FileBrowser.show = function(_connector, _path, _restore, options) {
            options.backCB();
        };

        $dropdown.find("input").val("connector");
        $card.find(".path input").val("path");
        $card.find(".browse").click();

        expect($card.find(".path input").val()).to.equal("path");
        FileBrowser.show = oldFunc;
    });

    it("back from preview should restore form", function() {
        var oldFunc = DSConfig.show;
        DSConfig.show = function(_arg, cb) {
            cb();
        };

        $dropdown.find("input").val("connector");
        $card.find(".path input").val("path");
        $card.find(".confirm").click();

        expect($card.find(".path input").val()).to.equal("path");
        DSConfig.show = oldFunc;
    });

    it("should go back", function() {
        let oldFunc = DataSourceManager.startImport;
        let called;
        DataSourceManager.startImport = (arg) => called = arg;
        $card.find(".path input").eq(0).val("path");
        $card.find(".back").click();
        expect(called).to.equal(null);
        expect($card.find(".path input").val()).to.equal("");

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