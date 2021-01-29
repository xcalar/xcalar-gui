describe.skip("Tooltip Flight Test", function() {

    before((done) => {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(() => {
            done();
        });
    });

    // flight tests for the built in tooltip walkthroughs
    it("should do the entire developer mode walkthrough successfully", function(done) {
        TooltipWalkthroughs.startWalkthrough("Developer Mode");

        UnitTest.testFinish(()=>$("#modeArea").hasClass("intro-highlightedElement"))
        .then(() => {
            //mode tip
            expect($("#modeArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#helpArea").hasClass("intro-highlightedElement"))
        }).then(() => {
            //user tip
            expect($("#helpArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#tabButton").hasClass("intro-highlightedElement"))
        }).then(() => {

            //tab tip click
            expect($("#tabButton").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#tabButton").click();

            return UnitTest.testFinish(()=>$(".dataflowMainArea").hasClass("intro-highlightedElement"))
        }).then(() => {

            // canvas tip
            expect($(".dataflowMainArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dagView .categoryBar").hasClass("intro-highlightedElement"))
        }).then(() => {

            // category bar tip
            expect($("#dagView .categoryBar").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dagView .operatorBar").hasClass("intro-highlightedElement"))
        }).then(() => {

            // operator bar tip 1
            expect($("#dagView .operatorBar").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dagView .operatorBar").hasClass("intro-highlightedElement"))
        }).then(() => {
            // operator bar tip 2
            expect($("#dagView .operatorBar").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dagView .operatorWrap .active .operator").eq(0).hasClass("intro-highlightedElement"))
        }).then(() => {

            // dataset node tip doubleclick
            expect($("#dagView .operatorWrap .active .operator").eq(0).hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#dagView .operatorWrap .active .operator .main").eq(0).dblclick();

            return UnitTest.testFinish(()=>$(".dataflowArea.active rect.main").hasClass("intro-highlightedElement"))
        }).then(() => {

            // view tip
            expect($(".dataflowArea.active rect.main").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dagView .operatorWrap .active .operator").eq(0).hasClass("intro-highlightedElement"))
        }).then(() => {

            // sort node tip doubleclick
            expect($("#dagView .operatorWrap .active .operator").eq(0).hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#dagView .operatorWrap .active .operator .main").eq(0).dblclick();

            return UnitTest.testFinish(()=>$("#dagView").hasClass("intro-highlightedElement"))
        }).then(() => {

            // view tip2
            expect($("#dagView").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#helpArea").hasClass("intro-highlightedElement"))
        }).then(() => {

            // help button tip
            expect($("#helpArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>!$("#intro-popover").is(":visible"))
        }).then(() => {

            expect($("#intro-popover").is(":visible")).to.be.false;

            return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
        }).then(() => {
            done();
        });
    });

    it("should do the entire Sql mode walkthrough for on prem successfully", function(done) {
        TooltipWalkthroughs.startWalkthrough("SQL Mode")

        UnitTest.testFinish(()=>$("#modeArea").hasClass("intro-highlightedElement"))
        .then(() => {
            //home tip
            expect($("#modeArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#helpArea").hasClass("intro-highlightedElement"))
        }).then(() => {
            //user tip
            expect($("#helpArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#menuBar").hasClass("intro-highlightedElement"))
        }).then(() => {

            //MenuBar tip
            expect($("#menuBar").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dataStoresTab").hasClass("intro-highlightedElement"))
        }).then(() => {

            //datastore tip
            expect($("#dataStoresTab").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#sqlTab").hasClass("intro-highlightedElement"))
        }).then(() => {

            //sqltab tip
            expect($("#sqlTab").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#monitorTab").hasClass("intro-highlightedElement"))
        }).then(() => {

            //monitor tip
            expect($("#monitorTab").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dataStoresTab").hasClass("intro-highlightedElement"))
        }).then(() => {

            //datastore click tip
            expect($("#dataStoresTab").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#dataStoresTab .mainTab").click();

            return UnitTest.testFinish(()=>$("#sourceTblButton").hasClass("intro-highlightedElement"))
        }).then(() => {

            //sourcetbl click tip
            expect($("#sourceTblButton").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#sourceTblButton").click();

            return UnitTest.testFinish(()=>$("#dsForm-target").hasClass("intro-highlightedElement"))
        }).then(() => {

            //dsform target tip
            expect($("#dsForm-target").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#filePath").hasClass("intro-highlightedElement"))
        }).then(() => {

            //filepath value tip
            expect($("#filePath").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dsForm-path .cardMain .browse").hasClass("intro-highlightedElement"))
        }).then(() => {

            //dsform browse tip
            expect($("#dsForm-path .cardMain .browse").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dsForm-path .btn-submit").hasClass("intro-highlightedElement"))
        }).then(() => {

            //dsformButton
            expect($("#dsForm-path .btn-submit").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#dsForm-path").hasClass("intro-highlightedElement"))
        }).then(() => {

            //dsform tip 2
            expect($("#dsForm-path").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#sqlWorkSpace").hasClass("intro-highlightedElement"))
        }).then(() => {

            // sql workspace tip
            expect($("#sqlWorkSpace").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#sqlWorkSpace").click();

            return UnitTest.testFinish(()=>$("#sqlEditorSpace").hasClass("intro-highlightedElement"))
        }).then(() => {

            //sql editor
            expect($("#sqlEditorSpace").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#sqlTableListerArea").hasClass("intro-highlightedElement"))
        }).then(() => {

            //sql table tip
            expect($("#sqlTableListerArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#sqlWorkSpacePanel .historySection").hasClass("intro-highlightedElement"))
        }).then(() => {

            //sql history tip
            expect($("#sqlWorkSpacePanel .historySection").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>$("#helpArea").hasClass("intro-highlightedElement"))
        }).then(() => {

            // help button tip
            expect($("#helpArea").hasClass("intro-highlightedElement")).to.be.true;
            expect($("#intro-popover").is(":visible")).to.be.true;
            $("#intro-popover .next").click();

            return UnitTest.testFinish(()=>!$("#intro-popover").is(":visible"))
        }).then(() => {

            expect($("#intro-popover").is(":visible")).to.be.false;

            return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
        }).then(() => {
            done();
        });
    });
});
