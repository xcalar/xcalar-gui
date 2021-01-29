// XXX it's broken, temporaily disable it
describe.skip("Dataset-DSTable Test", function() {
    var testDS;
    var testDSObj;
    var testDSId;

    var $dsTableContainer;

    var $mainTabCache;

    before(function(done){
        $dsTableContainer = $("#dsTableContainer");

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();

        UnitTest.addDS(testDatasets.fakeYelp, "unitTestDsTable")
        .then(function(dsName) {
            testDS = dsName;
            var $grid = DS.getGridByName(testDS);
            testDSId = $grid.data("dsid");
            testDSObj = DS.getDSObj(testDSId);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Module API Test", function() {
        it("Should focus on and show the ds table", function(done) {
            expect(testDSObj).not.to.be.null;

            var checkFunc = function() {
                return DSTable.getId() === testDSId;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                assert.isTrue($("#dsTableView").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should hide the ds table view", function() {
            DSTable.hide();
            assert.isFalse($("#dsTableView").is(":visible"));
            expect(DSTable.getId()).to.be.null;
        });

        it("Should show dsTable in load status", function(done) {
            var isLoading = true;
            DSTable.show(testDSId, isLoading)
            .then(function() {
                // XX loading icon during sample load breaks this test
                assert.isTrue($dsTableContainer.is(":visible"));
                assert.isTrue($dsTableContainer.hasClass("loading"));

                var loadText = $dsTableContainer.find(".loadSection .text").text();
                expect(loadText).to.equal("Please wait");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not show dsTable when dsId is wrong", function(done) {
            var dsId = xcHelper.randName("test");

            DSTable.show(dsId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("No DS");
                done();
            });
        });

        it("Should clear the dsTable", function() {
            DSTable.clear();
            let $tableWrap = DSTable._getTableWrapEl();
            expect($tableWrap.html()).to.be.empty;
        });

        it("Should show data sample table", function(done) {
            DSTable.show(testDSId)
            .then(function() {
                assert.isTrue($dsTableContainer.is(":visible"));
                assert.isFalse($dsTableContainer.hasClass("loading"));
                expect(DSTable._viewer.getId()).to.equal(testDSId);

                // ds name matches
                expect($("#dsInfo-title").text()).to.equal(testDS);
                // it should be created by current user
                expect($("#dsInfo-author").text()).to.equal(XcUser.getCurrentUserName());
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_toggleButtonInDisplay should work", function() {
            let $btn = $("#createDF");
            DSTable._toggleButtonInDisplay(false);
            expect($btn.hasClass("xc-disabled")).to.be.true;
            DSTable._toggleButtonInDisplay(true);
            expect($btn.hasClass("xc-disabled")).to.be.false;
        });
    });

    describe("Error Case Test", function() {
        var cache;
        var $errorSection;

        before(function() {
            cache = XcalarFetchData;
            $errorSection = $dsTableContainer.find(".errorSection");
            testDSObj.numErrors = 1;
        });

        beforeEach(function() {
            $errorSection.find(".error").text("");
        });

        it("Should not show error directly if id is null", function() {
            DSTable.showError(null, "test");
            expect($errorSection.find(".error").text()).to.equal("");
        });

        it("Should show error directly", function() {
            DSTable.showError(testDSId, "test");
            expect($errorSection.find(".error").text()).to.contain("test");
        });

        it("Should show error of object directly", function() {
            var error = {"error": "test"};
            DSTable.showError(testDSId, error, false, false ,true);
            expect($errorSection.find(".error").text())
            .to.contain(StatusMessageTStr.ImportDSFailed + ". " + error.error);
        });

        it("Should handle not last error", function(done) {
            var notLastDSError = "not last ds";

            XcalarFetchData = function() {
                return PromiseHelper.reject(notLastDSError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(notLastDSError);
                expect($errorSection.find(".error").text()).to.equal("");
                done();
            });
        });

        it("Should handle error of object", function(done) {
            var dsError = {"error": "objectError"};

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("objectError");
                done();
            });
        });

        it("Should handle error of type Error", function(done) {
            var dsError = new Error("errorTypeError");

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("errorTypeError");
                done();
            });
        });

        it("Should handle error of object", function(done) {
            var dsError = "stringError";

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(dsError);
                expect($errorSection.find(".error").text())
                .to.contain("stringError");
                done();
            });
        });

        it("Should test file error icon appearing", function(done) {
            var dsError = "fileError";

            XcalarFetchData = function() {
                return PromiseHelper.reject(dsError);
            };

            DSTable.show(testDSId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                assert.isTrue($("#dsInfo-error").hasClass("type-file"));
                done();
            });
        });

        after(function() {
            XcalarFetchData = cache;
            testDSObj.numErrors = 0;
        });
    });

    describe("Basic Behavior Test", function() {
        before(function(done) {
            DSTable.show(testDSId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should animate the ds path container", function() {
            $("#dsInfo-path").trigger(fakeEvent.click);
            assert.isTrue($('#dsInfo-pathContainer').hasClass("copiableText"));
        });

        it("Should show file path modal", function() {
            var oldFunc = DS.getDSObj;
            DS.getDSObj = function(id) {
                return testDSObj;
            }

            $("#showFileListBtn").click();
            assert.isTrue($("#fileListModal").is(":visible"));
            $("#fileListModal").find(".xi-close").click();

            DS.getDSObj = oldFunc;
        });

        it("Should show the error detail modal", function() {
            $("#dsInfo-error").removeClass("xc-hidden");
            $("#dsInfo-error").click();
            assert.isTrue($("#dsImportErrorModal").is(":visible"));

             $("#dsImportErrorModal").find(".xi-close").click();
        });

        it("should click retry button to retry", function() {
            var oldGetError = DS.getErrorDSObj;
            var oldRemove = DS.removeErrorDSObj;
            var oldPreview = DSConfig.show;
            var test = false;
            var oldId = $dsTableContainer.data("id");
            var $dsTableView = $("#dsTableView");

            DS.getErrorDSObj = function() {
                return new DSObj({
                    sources: [{}]
                });
            };

            DS.removeErrorDSObj = function() {
                test = true;
            };

            DSConfig.show = function() {};

            // case 1
            $dsTableContainer.data("id", null);
            $dsTableView.find(".errorSection .retry").click();
            expect(test).to.be.false;

            // case 2
            $dsTableContainer.data("id", "testId");
            $dsTableView.find(".errorSection .retry").click();
            expect(test).to.be.true;

            DS.getErrorDSObj = oldGetError;
            DS.removeErrorDSObj = oldRemove;
            $dsTableContainer.data(oldId);
            DSConfig.show = oldPreview;
        });

        it("should update format info", function(done) {
            $("#dsInfo-format").text("");
            let dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "format": "CSV",
                "parentId": DSObjTerm.homeParentId
            });
            DSTable._updateFormatInfo(dsObj)
            .then(() => {
                expect($("#dsInfo-format").text()).to.equal("CSV");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should update format info case2", function(done) {
            let oldFunc = DS.getFormatFromDS;
            DS.getFormatFromDS = () => PromiseHelper.resolve("JSON");

            $("#dsInfo-format").text("");
            let dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });
            DSTable._updateFormatInfo(dsObj)
            .then(() => {
                expect($("#dsInfo-format").text()).to.equal("JSON");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DS.getFormatFromDS = oldFunc;
            });
        });
    });

    after(function(done) {
        UnitTest.deleteDS(testDS)
        .always(function() {
            if (Alert.isOpen()) {
                Alert.forceClose()
            }
            $mainTabCache.click();
            UnitTest.offMinMode();
            done();
        });
    });
});
