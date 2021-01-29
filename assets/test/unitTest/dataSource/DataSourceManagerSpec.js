// XXX the test is broken
describe.skip("DataSourceManager Test", function() {
    var $mainTabCache;

    before(function() {
        // go to the datasets tab,
        // or some UI effect like :visible cannot test
        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });

    it("should go to create target view", function() {
        $("#targetButton").click();
        assert.isFalse($("#datastore-in-view").is(":visible"));
        assert.isTrue($("#datastore-target-view").is(":visible"));
    });

    it("Should go to import view", function() {
        $("#inButton").click();
        assert.isTrue($("#datastore-in-view").is(":visible"));
        assert.isFalse($("#datastore-target-view").is(":visible"));
    });

    it("should switch view", function() {
        // error case
        DataSourceManager.switchView(null);
        var tests = [{
            "view": DataSourceManager.View.Browser,
            "$ele": $("#fileBrowser")
        }, {
            "view": DataSourceManager.View.Preview,
            "$ele": $("#dsForm-config")
        }, {
            "view": DataSourceManager.View.Path,
            "$ele": $("#dsForm-path")
        }];

        tests.forEach(function(test) {
            DataSourceManager.switchView(test.view);
            assert.isTrue(test.$ele.is(":visible"));
        });
    });

    it("DataSourceManager.setMode should work", function() {
        let $tab = $("#datastore-in-view-topBar").find(".tab.result");
        let wasCreateMode = $tab.text() === "Table";
        // case 1
        DataSourceManager.setMode(true);
        expect($tab.text()).to.equal("3. Table");
        // case 2
        DataSourceManager.setMode(false);
        expect($tab.text()).to.equal("3. Dataset");

        // restore
        DataSourceManager.setMode(wasCreateMode);
    });

    it("DataSourceManager.switchStep should work", function() {
        // case 1
        let $panel = $("#datastore-in-view");
        let $topBar = $("#datastore-in-view-topBar");
        for (let key in DataSourceManager.ImportSteps) {
            let step = DataSourceManager.ImportSteps[key];
            DataSourceManager.switchStep(step);
            if (!$topBar.find(".tab." + step).hasClass("active")) {
                console.error("switch", step, "fails");
            }
            expect($topBar.find(".tab." + step).hasClass("active")).to.be.true;
            expect($panel.hasClass("import")).to.be.true;
        }

        // null case
        DataSourceManager.switchStep(null);
        expect($panel.hasClass("import")).to.be.false;
    });

    it("DataSourceManager.startImport should work", function() {
        let oldFunc = DSForm.show;
        let called = false;
        DSForm.show = () => called = true;

        DataSourceManager.startImport(true);
        expect(called).to.be.true;

        DSForm.show = oldFunc;
    });

    after(function() {
        // restore to initial screen
        DataSourceManager.startImport(true);
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });
});