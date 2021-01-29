describe("Dataset-DSForm Test", function() {
    var $statusBox;
    var $filePath;
    var $pathCard;

    before(function(){
        $statusBox = $("#statusBox");
        $filePath = $("#filePath");
        $pathCard = $("#dsForm-path");

        // turn off min mode, as it affectes DOM test
        UnitTest.onMinMode();
    });

    describe("Basic APi Test", function() {
        it("Should not see form", function() {
            DSForm.hide();
            UnitTest.assertHidden($("#dsFormView"));
        });

        it("Should see form", function() {
            DSForm.show();
            UnitTest.assertDisplay($("#dsFormView"));
            expect($("#dsForm-path").hasClass("xc-hidden")).to.be.false;
        });

        it("should reset form when call resetForm()", function() {
            $filePath.val("test");
            DSForm.__testOnly__.resetForm();
            expect($filePath.val()).to.be.empty;
        });

        it("DSForm.getDBConnectorPath should work", function() {
            expect(DSForm.getDBConnectorPath("test")).to.equal("/test/");
        });
    });

    describe("Inner getter and setter test", function() {
        it("Should get file path", function() {
            $filePath.val("testPath");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/");

            $filePath.val("/testPath");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/");

            $filePath.val("/testPath/a/b.csv");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/a/b.csv");

            $filePath.val("testPath/a/b.csv");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/a/b.csv");

            $filePath.val("/testPath.csv");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath.csv");

            $filePath.val("testPath.csv");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath.csv");

            $filePath.val("/testPath/a/b");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/a/b/");


            $filePath.val("testPath/a/b");
            var val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("/testPath/a/b/");

            // case two
            var oldFunc = DSTargetManager.isGeneratedTarget;
            DSTargetManager.isGeneratedTarget = function() {
                return true;
            };
            val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("testPath/a/b"); // Should be same as input
            // Cannot have / prepended and appended
            DSTargetManager.isGeneratedTarget = oldFunc;

            // case confluent kafka connector
            var oldFunc = DSTargetManager.isConfluentTarget;
            DSTargetManager.isConfluentTarget = function() {
                return true;
            };
            val = DSForm.__testOnly__.getFilePath();
            expect(val).to.equal("testPath/a/b"); // Should be same as input
            // Cannot have / prepended and appended
            DSTargetManager.isConfluentTarget = oldFunc;
        });

        it("Should get and set protocol", function() {
            var cache = DSForm.__testOnly__.getDataTarget();
            var test = "testTarget";
            DSForm.__testOnly__.setDataTarget(test);
            var val = DSForm.__testOnly__.getDataTarget();
            expect(val).to.equal(test);

            // change back
            DSForm.__testOnly__.setDataTarget(cache);
            val = DSForm.__testOnly__.getDataTarget();
            expect(val).to.equal(cache);
        });
    });

    describe("Allow Browse and Preview Test", function() {
        it("should not allow empty target", function() {
            $("#dsForm-target .text").val("");
            var isValid = DSForm.__testOnly__.isValidPathToBrowse();
            expect(isValid).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should not allow preivew of empty path", function() {
            $("#dsForm-target .text").val("test");
            $filePath.val("");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("Should be valid with non-empty path", function() {
            $filePath.val("test");
            var isValid = DSForm.__testOnly__.isValidToPreview();
            expect(isValid).to.be.true;
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    describe("UI Behavior Test", function() {
        it("should set the history path dropdown to empty", function() {
            $filePath.trigger(fakeEvent.click);
            expect($filePath.closest(".dropDownList").closest(".list").text()).to.equal("");
        });

        it("Should click browse button to trigger browse", function() {
            var oldFunc = FileBrowser.show;
            var test = false;
            FileBrowser.show = function() {
                test = true;
            };

            $filePath.val("test");
            $pathCard.find(".browse").click();
            expect(test).to.be.true;
            FileBrowser.show = oldFunc;
        });

        it("Should click preview button to trigger preview", function() {
            var oldFunc = DSConfig.show;
            var test = false;
            DSConfig.show = function() {
                test = true;
            };

            $filePath.val("test");
            $pathCard.find(".confirm").click();
            expect(test).to.be.true;
            expect($filePath.val()).to.equal(""); // form will be clear
            DSConfig.show = oldFunc;
        });

        it("back from preview should restore form", function() {
            var oldFunc = DSConfig.show;
            DSConfig.show = function(_arg, cb) {
                cb();
            };

            $filePath.val("test");
            $pathCard.find(".confirm").click();
            expect($filePath.val()).to.equal("/test/");
            DSConfig.show = oldFunc;
        });

        it("Should use the previously set history path dropdown", function() {
            //Two clicks required to toggle off empty list
            //  then second click to fill history list
            $filePath.click();
            $filePath.click();
            expect($filePath.closest(".dropDownList").find("li").eq(0).text()).to.equal("/test/");
        });

        it("should go to start import step when click back", function() {
            let oldFunc = DataSourceManager.startImport;
            let called;
            DataSourceManager.startImport = (arg) => called = arg;
            $filePath.val("test");
            $pathCard.find(".back").click();
            expect(called).to.equal(null);
            expect($filePath.val()).to.equal("");

            DataSourceManager.startImport = oldFunc;
        });

        after(function() {
            DSForm.__testOnly__.resetForm();
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});
