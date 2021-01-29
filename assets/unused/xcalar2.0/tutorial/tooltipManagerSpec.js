describe.skip("Tooltip Manager Test", function() {
    let basicTest;
    let basicInfo;

    before(function(done) {
        basicTest = [{
            highlight_div: "#homeBtn",
            text: "test",
            type: TooltipType.Text
        }];
        basicInfo = {
            tooltipTitle: "SQL Mode",
            background: true,
            startScreen: TooltipStartScreen.SQLWorkspace
        };
        done();
    });

    it("Should Display a tooltip without a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-visibleOverlay").length).to.equal(0);
        basicInfo.background = false;
        TooltipManager.start(basicInfo, basicTest, 0);
        expect($("#intro-visibleOverlay").length).to.equal(0);
        expect($("#intro-popover").length).to.equal(1);
        TooltipManager.closeWalkthrough();
    });

    it("Should Display a tooltip with a background", function() {
        expect($("#intro-popover").length).to.equal(0);
        expect($("#intro-visibleOverlay").length).to.equal(0);
        basicInfo.background = true;
        TooltipManager.start(basicInfo, basicTest, 0);
        expect($("#intro-visibleOverlay").length).to.equal(1);
        expect($("#intro-popover").length).to.equal(1);
        TooltipManager.closeWalkthrough();
    });

    describe("Tooltip Types", function() {
        it("Should support no-interaction tooltips", function(done) {
            let textTest = [{
                highlight_div: "#homeBtn",
                text: "test",
                type: "text"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.false;
            $("#intro-popover .next").click();
            UnitTest.testFinish(()=>$("#intro-popover .textContainer").text() === "test2")
            .then(() => {
                expect($("#intro-popover .textContainer").text()).to.equal("test2");
                TooltipManager.closeWalkthrough();
                return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            }).then(() => {
                done();
            });
        });


        it("Should support click-interaction tooltips", function(done) {
            let textTest = [{
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab",
                text: "test",
                type: "click"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.true;
            var e = jQuery.Event("click.tooltip");
            $("#dataStoresTab").trigger(e);
            UnitTest.testFinish(()=>$("#intro-popover .textContainer").text() === "test2")
            .then(() => {
                expect($("#intro-popover .textContainer").text()).to.equal("test2");
                TooltipManager.closeWalkthrough();
                return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            }).then(() => {
                done();
            });
        });

        it("Should support doubleclick-interaction tooltips", function(done) {
            let html = "<div id='hiddentooltipobject' class='xc-hidden'></div>"
            $("#container").append(html);
            let textTest = [{
                highlight_div: "#dataStoresTab",
                interact_div: "#hiddentooltipobject",
                text: "test",
                type: "doubleclick"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.true;
            var e = jQuery.Event("dblclick.tooltip");
            $("#hiddentooltipobject").trigger(e);
            UnitTest.testFinish(()=>$("#intro-popover .textContainer").text() === "test2")
            .then(() => {
                expect($("#intro-popover .textContainer").text()).to.equal("test2");
                $("#hiddentooltipobject").remove();
                TooltipManager.closeWalkthrough();
                return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            }).then(() => {
                done();
            });
        });

        it("Should support value-interaction tooltips", function(done) {
            $('body').append("<input id='tooltipSpecTestInput' type='text'></input>");
            let textTest = [{
                highlight_div: "#tooltipSpecTestInput",
                interact_div: "#tooltipSpecTestInput",
                text: "test",
                type: "value",
                value: "a"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            TooltipManager.start(basicInfo, textTest, 0);
            expect($("#intro-popover .textContainer").text()).to.equal("test");
            expect($("#intro-popover .next").hasClass("unavailable")).to.be.true;
            $("#tooltipSpecTestInput").val("a");
            var e = jQuery.Event("keyup");
            $("#tooltipSpecTestInput").trigger(e);
            UnitTest.testFinish(()=>$("#intro-popover .textContainer").text() === "test2")
            .then(() => {
                expect($("#intro-popover .textContainer").text()).to.equal("test2");
                TooltipManager.closeWalkthrough();
                $("#tooltipSpecTestInput").remove();
                return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            }).then(() => {
                done();
            });
        });
    });

    describe("Switch screens", function() {
        it("Should be able to switch to sql mode from adv mode", function(done) {
            expect($("#sqlTab").is(":visible")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.SQLWorkspace;
            TooltipManager.start(basicInfo, basicTest, 0);
            expect($("#sqlTab").is(":visible")).to.be.true;
            TooltipManager.closeWalkthrough();
            UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            .then(() => {
                done();
            });
        });

        it("Should open the dataflow screen", function(done) {
            $("#monitorTab").click();
            expect($("#sqlTab").is(":visible")).to.be.false;
            basicInfo.startScreen = TooltipStartScreen.SQLWorkspace;
            TooltipManager.start(basicInfo, basicTest, 0);
            UnitTest.testFinish(()=>$("#sqlTab").is(":visible"))
            .then(() => {
                expect($("#sqlTab").is(":visible")).to.be.true;
                TooltipManager.closeWalkthrough();
                return UnitTest.testFinish(()=>$("#intro-popover").length === 0)
            }).then(() => {
                done();
            });
        });
    });

    describe("Reliability/emergency Tests", function() {
        var oldEmergencyStart;
        before(function() {
            oldEmergencyStart = TooltipWalkthroughs.emergencyPopup;
        });
        it("should open the emergency popup when the next highlighted element cannot be found", function () {
            var called = false;
            TooltipWalkthroughs.emergencyPopup = function() {
                called = true;
            }
            var invalidElement = [{
                highlight_div: "#nonExistBtn",
                text: "test",
                type: TooltipType.Text
            }];
            TooltipManager.start(basicInfo, invalidElement, 0);
            expect(called).to.be.true;
            TooltipManager.closeWalkthrough();
        });

        it("should open the emergency popup if the next highlighted element does not have a size", function () {
            var called = false;
            TooltipWalkthroughs.emergencyPopup = function() {
                called = true;
            }
            let html = "<div id='hiddentooltipobject' class='xc-hidden'></div>"
            $("#container").append(html);
            var invalidElement = [{
                highlight_div: "#hiddentooltipobject",
                text: "test",
                type: TooltipType.Text
            }];
            TooltipManager.start(basicInfo, invalidElement, 0);
            $("#hiddentooltipobject").remove();
            expect(called).to.be.true;
            TooltipManager.closeWalkthrough();
        });
        after(function() {
            TooltipWalkthroughs.emergencyPopup = oldEmergencyStart;
        });
    });

    describe("Should ensure open screens and panels", function() {
        before(function () {
            basicInfo.startScreen = null;
        });
        it("Should open the dataset screen and panel when the dataset button is clicked", function(done) {
            var buttonClick = [{
                highlight_div: "#inButton",
                interact_div: "#inButton",
                text: "test",
                type: "click"
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            // Ensure datastores tab is open
            MainMenu.openPanel("datastorePanel");
            // hide everything
            DSForm.hide();
            TooltipManager.start(basicInfo, buttonClick, 0)
            .always(() => {
                expect($("#dsFormView").hasClass("xc-hidden")).to.be.true;
                var e = jQuery.Event("click.tooltip");
                $("#inButton").trigger(e);
                UnitTest.wait(1)
                .then(() => {
                    expect($("#dsFormView").hasClass("xc-hidden")).to.be.false;
                    TooltipManager.closeWalkthrough();
                    UnitTest.testFinish(()=>$("#intro-popover").length === 0)
                    .then(() => {
                        done();
                    });
                });
            });
        });

        it("Should open the table screen and panel when the table button is clicked", function(done) {
            var buttonClick = [{
                highlight_div: "#sourceTblButton",
                interact_div: "#sourceTblButton",
                text: "test",
                type: TooltipType.Click
            },{
                highlight_div: "#homeBtn",
                text: "test2",
                type: "text"
            }];
            // Ensure datastores tab is open
            MainMenu.openPanel("datastorePanel");
            // hide everything
            DSForm.hide();
            TooltipManager.start(basicInfo, buttonClick, 0)
            .always(() => {

                expect($("#dsFormView").hasClass("xc-hidden")).to.be.true;
                var e = jQuery.Event("click.tooltip");
                $("#sourceTblButton").trigger(e);
                UnitTest.wait(1)
                .then(() => {
                    expect($("#dsFormView").hasClass("xc-hidden")).to.be.false;
                    TooltipManager.closeWalkthrough();
                    UnitTest.testFinish(()=>$("#intro-popover").length === 0)
                    .then(() => {
                        done();
                    });
                });
            });
        });
    });
});