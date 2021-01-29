describe("UDFFileManager Test", function() {
    var waitTime = 200;
    var sharedUDFsDir = "sharedUDFs";
    var defaultModuleFilename = "default.py";
    var defaultNsPath = defaultUDFPath;
    var $monitorFileManager;
    var $addressContent;
    var $uploadButton;
    var $searchInput;
    var $titleSection;
    var $titleSectionCheckBox;
    var $fileManagerSaveAsModal;
    var $modalSaveButton;
    var $modalAddressContent
    var $modalSaveAsInput;

    var getFileRowSelector = (filename, $manager) => {
        $manager = $manager || $monitorFileManager;
        return $manager.find(".row:contains('" + filename + "')");
    }
    var selectFileRow = (filename, $manager) => {
        $manager = $manager || $monitorFileManager;
        var fileRowSelector = getFileRowSelector(filename, $manager);
        var checkBox = fileRowSelector.children(".checkBox");
        if (checkBox.children(".icon").hasClass("xi-ckbox-empty")) {
            checkBox.mouseup();
        }
        // This tests that select icon is working.
        expect(checkBox.children(".icon").hasClass("xi-ckbox-selected"))
        .to.be.true;
    }
    var switchPath = (path, $manager) => {
        $manager = $manager || $monitorFileManager;
        var $addressContent = $manager.find(".addressArea .addressContent");
        $addressContent.val(path);
        $addressContent.trigger(fakeEvent.enterKeydown);
    }
    var clickAction = (action) => {
        $monitorFileManager.find(".actionIcon").mouseup();
        var $actionMenu = $monitorFileManager.find(".actionMenu");
        var $actionMenuSection = $actionMenu
        .find(".actionMenuSection:contains('" + action + "')");
        expect($actionMenuSection.hasClass("btn-disabled")).to.be.false;
        $actionMenuSection.mouseup();
    }
    var goBack = (times, $manager) => {
        times = times || 1;
        $manager = $manager || $monitorFileManager;
        var $previousButton = $manager.find(".navigationButton:has('.xi-previous2')");
        while (times-- !== 0) {
            $previousButton.mouseup();
        }
    }
    var goForward = (times, $manager) => {
        times = times || 1;
        $manager = $manager || $monitorFileManager;
        var $nextButton = $manager.find(".navigationButton:has('.xi-next2')");
        while (times-- !== 0) {
            $nextButton.mouseup();
        }
    }

    before(function(done) {
        var $udfTab = $("#udfTab");
        var $toManager = $("#udfButtonWrap .toManager");
        $monitorFileManager = $("#monitorFileManager");
        $addressContent = $monitorFileManager.find(".addressArea .addressContent");
        $uploadButton = $monitorFileManager.find(".operationAreaUpload .operationContent");
        $searchInput = $monitorFileManager
        .find(".fileManagerSearchBar .searchBox .searchInput");
        $titleSection = $monitorFileManager.find(".titleSection");
        $titleSectionCheckBox = $titleSection.find(".checkBox");
        $fileManagerSaveAsModal = $("#fileManagerSaveAsModal");
        $modalSaveButton = $fileManagerSaveAsModal.find(".save");
        $modalAddressContent = $fileManagerSaveAsModal
        .find(".addressArea .addressContent");
        $modalSaveAsInput = $fileManagerSaveAsModal.find(".saveAs input");
        UnitTest.onMinMode();
        UDFFileManager.Instance.setupTest();

        if (!$udfTab.hasClass("active")) {
            $toManager.click();
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                $udfTab.click();
                $toManager.click();
                return (UnitTest.testFinish(function() {
                    return !$("#menuBar").hasClass("animating");
                }));
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done(); // still let the test go
            });
        } else {
            $toManager.click();
            done();
        }
    });

    describe("UDF setup check", () => {
        it("should initialize", (done) => {
            UnitTest.testFinish(() => {
                return !$("#udf-fnSection").hasClass("xc-disabled");
            })
            .then(() => {
                var udfs = UDFFileManager.Instance.getUDFs();
                expect(udfs.has(defaultNsPath)).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    // These tests are stateful, later tests may depend on previous tests.
    // XXX fails jenkins test
    describe.skip("Functional test", () => {
        // Should open file manager panel and go to cur workbook dir. This also
        // tests that a fake workbook dir is created even if there's no UDF.
        it("should open file manager panel", () => {
            expect($("#monitorPanel").hasClass("active")).to.be.true;
            expect($addressContent.val())
            .to.equal(UDFFileManager.Instance.getCurrWorkbookDisplayPath());
        });

        it("should go to root path by pressing navigation button", () => {
            goBack(3);
            goForward();
            goBack();
            expect($addressContent.val())
            .to.equal("/");
        });

        it("should disable uploading to invalid folder", () => {
            expect($uploadButton.hasClass("btn-disabled")).to.be.true;
        });

        it("should cleanup UDFs for later tests", (done) => {
            $searchInput.val("test_udf_*");
            $searchInput.trigger(fakeEvent.enterKeydown);

            $titleSectionCheckBox.mouseup(); // Select all
            // If search result is empty, the check box will be empty.
            if (!$titleSectionCheckBox.children(".icon").hasClass("xi-ckbox-empty")) {
                clickAction("Delete");
                UnitTest.hasAlertWithTitle(FileManagerTStr.DelTitle, {
                    "confirm": true,
                    "nextAlert": true
                });
            }
            UnitTest.testFinish(() => {
                $searchInput.trigger(fakeEvent.enterKeydown);
                return $titleSectionCheckBox.children(".icon").hasClass("xi-ckbox-empty");
            })
            .then(() => {
                // This also tests that you should be able to go to another
                // address from search result using the address bar.
                switchPath("/");
                expect(getFileRowSelector(sharedUDFsDir).length).to.equal(1);
                done();
            })
            .fail(() => {
                done("fail");
            })
        });

        it("should go to shared folder and select default UDF", () => {
            getFileRowSelector(sharedUDFsDir).find(".field").dblclick();
            selectFileRow(defaultModuleFilename);
        });

        it("should open the copy to modal", () => {
            clickAction("Copy to...");

            expect($fileManagerSaveAsModal.is(":visible")).to.be.true;
            // This tests that the file name is auto filled.
            expect($modalSaveAsInput.val()).to.equal(defaultModuleFilename);
        });

        it("should not allow copy to an invalid folder", () => {
            // Should not be able to create a file under root dir
            switchPath("/", $fileManagerSaveAsModal);

            expect($modalAddressContent.val()).to.equal("/");
            $modalSaveButton.click();
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidPath);
        });

        it("should not allow copy to a new file with an invalid name", () => {
            switchPath(UDFFileManager.Instance.getCurrWorkbookDisplayPath(), $fileManagerSaveAsModal);

            expect($modalAddressContent.val()).to.equal(
                UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            );
            // Name should not start with number
            $modalSaveAsInput.val("1a.py");
            $modalSaveButton.click();
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidName);
        });

        it("should copy the original file to the new folder with a new name", (done) => {
            // This also tests that file extension should be auto appended if
            // missing.
            var newModuleName = "test_udf_2";
            var newModuleFilename = "test_udf_2.py";
            $modalSaveAsInput.val(newModuleName);
            $modalSaveButton.click();
            expect($fileManagerSaveAsModal.is(":visible")).to.be.false;
            switchPath(UDFFileManager.Instance.getCurrWorkbookDisplayPath());

            UnitTest.testFinish(() => {
                return getFileRowSelector(newModuleFilename).length === 1;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should duplicate the file just created", (done) => {
            var newModuleFilename = "test_udf_2.py";
            var newModuleFilename1 = "test_udf_2_1.py";
            selectFileRow(newModuleFilename);
            clickAction("Duplicate");
            UnitTest.testFinish(() => {
                return getFileRowSelector(newModuleFilename1).length === 1;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should duplicate the file again and resolve name conflict", (done) => {
            var newModuleFilename1 = "test_udf_2_1.py";
            // No need to select again, it's already selected.
            clickAction("Duplicate");
            UnitTest.testFinish(() => {
                return getFileRowSelector(newModuleFilename1).length === 1;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should delete the file created", (done) => {
            // This also tests that selection is preserved after an action
            clickAction("Delete");
            UnitTest.hasAlertWithTitle(FileManagerTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });
            UnitTest.testFinish(() => {
                var newModuleFilename = "test_udf_2.py";
                return getFileRowSelector(newModuleFilename).length === 0;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should share the file just duplicated", (done) => {
            var newModuleFilename1 = "test_udf_2_1.py";
            selectFileRow(newModuleFilename1);
            clickAction("Share");
            switchPath(sharedUDFPath);

            UnitTest.testFinish(() => {
                return getFileRowSelector(newModuleFilename1).length === 1;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should search for the file just shared", (done) => {
            $searchInput.val("t*t_udf_?_*.*");
            $searchInput.trigger(fakeEvent.enterKeydown);

            // Search is actually sync. In the future, it may become async.
            UnitTest.testFinish(() => {
                var newModuleFilename1 = "test_udf_2_1.py";
                return getFileRowSelector(newModuleFilename1).length === 2;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should preserve select status in search results", () => {
            expect($titleSectionCheckBox.children(".icon")
            .hasClass("xi-checkbox-select")).to.be.true;
        });

        it("should duplicate the files in search results", (done) => {
            $titleSectionCheckBox.mouseup(); // Clear partial select
            var newModuleFilename1 = UDFFileManager.Instance
            .getCurrWorkbookDisplayPath() + "test_udf_2_1.py";
            var newModuleFilename1_1 = UDFFileManager.Instance
            .getCurrWorkbookDisplayPath() + "test_udf_2_1_1.py";
            selectFileRow(newModuleFilename1);
            clickAction("Duplicate");

            UnitTest.testFinish(() => {
                // Should not need this, see bug 13797
                $searchInput.trigger(fakeEvent.enterKeydown);
                return getFileRowSelector(newModuleFilename1_1).length === 1;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should delete the files in search results", (done) => {
            $titleSectionCheckBox.mouseup();
            var newModuleFilename1 = UDFFileManager.Instance
            .getCurrWorkbookDisplayPath() + "test_udf_2_1.py";
            selectFileRow(newModuleFilename1);
            clickAction("Delete")
            UnitTest.hasAlertWithTitle(FileManagerTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });

            UnitTest.testFinish(() => {
                $searchInput.trigger(fakeEvent.enterKeydown);
                return getFileRowSelector(newModuleFilename1).length === 0
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should copy the file in search results", (done) => {
            var newModuleFilename1_1 = "test_udf_2_1_1.py";
            selectFileRow(newModuleFilename1_1);
            clickAction("Copy to...");

            // This also tests that saveAsModal navigation works after popped
            // up from search result.
            goBack(3, $fileManagerSaveAsModal);
            // This also tests that single click the row so that row is in
            // pressed status. The file should be saved to the pressed folder.
            getFileRowSelector(sharedUDFsDir, $fileManagerSaveAsModal)
            .children(".field").mousedown();
            $modalSaveButton.click();

            UnitTest.testFinish(() => {
                // Should not need this, see bug 13797
                $searchInput.trigger(fakeEvent.enterKeydown);
                return getFileRowSelector(newModuleFilename1_1).length === 2;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should copy the file again and ask whether to overwrite", (done) => {
            var newModuleFilename1_1 = "test_udf_2_1_1.py";
            clickAction("Copy to...");

            goBack(3, $fileManagerSaveAsModal);
            getFileRowSelector(sharedUDFsDir, $fileManagerSaveAsModal)
            .children(".field").dblclick();
            $modalSaveButton.click();

            UnitTest.hasAlertWithTitle(FileManagerTStr.ReplaceTitle, {
                "confirm": true,
                "nextAlert": true
            });
            UnitTest.testFinish(() => {
                // Should not need this, see bug 13797
                $searchInput.trigger(fakeEvent.enterKeydown);
                return getFileRowSelector(newModuleFilename1_1).length === 2;
            })
            .then(done)
            .fail(() => {done("fail");});
        });

        it("should go back to previous folder from search results", () => {
            goBack();

            expect($addressContent.val())
            .to.equal(sharedUDFPath);
            goBack();

            expect($addressContent.val())
            .to.equal(UDFFileManager.Instance.getCurrWorkbookDisplayPath());
        });

        it("should delete files created during the tests in the workbook folder", (done) => {
            var testFileList = ["test_udf_2_1_1.py", "test_udf_2_2.py"];
            testFileList.forEach((testFile) => {selectFileRow(testFile)});
            clickAction("Delete");
            UnitTest.hasAlertWithTitle(FileManagerTStr.DelTitle, {
                "confirm": true,
                "nextAlert": true
            });
            UnitTest.testFinish(() => {
                return getFileRowSelector("test_udf_").length === 0;
            })
            .then(done, () => {done("fail");});
        });
    });

    // These tests should be stateless, i.e., no test should depend on previous
    // tests, and changing the order should not break the tests.
    describe("Public method test", () => {
        var testUDFString = "def a():\n    return 1";
        var testUDFModuleName = "test_udf_a";
        var testUDFNsPath;
        var testUDFDisplayPath;

        before((done) => {
            UDFFileManager.Instance.initialize()
            .then(() => {
                testUDFNsPath = UDFFileManager.Instance.getCurrWorkbookPath() +
                testUDFModuleName;
                testUDFDisplayPath = UDFFileManager.Instance.nsPathToDisplayPath(
                    testUDFNsPath
                );
                done();
            })
            .fail(() => {
                done("fail");
            });
        })

        it("tests open", (done) => {
            UDFFileManager.Instance.add(testUDFDisplayPath, testUDFString)
            .then(() => {
                UDFFileManager.Instance.open(testUDFDisplayPath)
                return UnitTest.testFinish(() => {
                    return UDFPanel.Instance.getEditor().getValue() === testUDFString;
                })
            })
            .then(done, () => {done("fail")});
        });

        it("tests getDefaultUDFPath", () => {
            expect(UDFFileManager.Instance.getDefaultUDFPath()).to.equal(defaultNsPath);
        });

        it("tests getSharedUDFPath", () => {
            expect(UDFFileManager.Instance.getSharedUDFPath()).to.equal(sharedUDFPath);
        });

        it("tests getCurrWorkbookPath", () => {
            expect(UDFFileManager.Instance.getCurrWorkbookPath()).to.startWith("/workbook/");
            expect(UDFFileManager.Instance.getCurrWorkbookPath()).to.endWith("/udf/");
        });

        it("tests getCurrWorkbookDisplayPath", () => {
            var currWorkbookDisplayPath = UDFFileManager.Instance.getCurrWorkbookDisplayPath();
            expect(currWorkbookDisplayPath).to.startWith("/workbook/");
            expect(currWorkbookDisplayPath).to.not.endWith("/udf/");
            var currWorkbookDisplayPathSplit = currWorkbookDisplayPath.split("/");
            var currWorkbookName = currWorkbookDisplayPathSplit[3];
            expect(currWorkbookName[0] >= '0' && currWorkbookName[0] <= '9').to.be.false;
        });

        it("tests nsPathToDisplayPath", () => {
            var testNsPath = UDFFileManager.Instance.getCurrWorkbookPath() + "test_udf_a";
            var testDisplayPath = UDFFileManager.Instance.nsPathToDisplayPath(testNsPath);
            expect(testDisplayPath).to.endWith(UDFFileManager.Instance.fileExtension());
            var testDisplayPathSplit = testDisplayPath.split("/");
            expect(testDisplayPathSplit.length === 5).to.be.true;
        });

        it("tests displayPathToNsPath", () => {
            var testNsPath = UDFFileManager.Instance.getCurrWorkbookPath() + "tets_a";
            var testNsPathRecovered = UDFFileManager.Instance.displayPathToNsPath(
                UDFFileManager.Instance.nsPathToDisplayPath(testNsPath)
            );
            expect(testNsPathRecovered).to.equal(testNsPath)
        });

        it("tests getUDFs", () => {
            var storedUDF = UDFFileManager.Instance.getUDFs();
            expect(storedUDF).to.be.a("Map");
            expect(storedUDF.has(defaultNsPath)).to.be.true;

        })

        it("tests storePython", () => {
            var moduleName = xcHelper.randName("unittest");
            UDFFileManager.Instance.storePython(moduleName, "test");
            var storedUDF = UDFFileManager.Instance.getUDFs();
            expect(storedUDF.has(moduleName)).to.be.true;
        });

        it("tests that refresh should return error and not clear editor", (done) => {
            var oldFunc = XcalarListXdfs;
            var editor = UDFPanel.Instance.getEditor();
            editor.setValue("test");
            XcalarListXdfs = function() {
                return PromiseHelper.reject("reject");
            };

            UDFFileManager.Instance.refresh()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(editor.getValue()).to.equal("test");
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("tests initialize", (done) => {
            UDFFileManager.Instance.initialize()
            .then(function() {
                var storedUDF = UDFFileManager.Instance.getUDFs();
                expect(storedUDF.has(defaultNsPath)).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("tests that initialize should handle error case", function(done) {
            var oldFunc = XcalarListXdfs;
            XcalarListXdfs = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            UDFFileManager.Instance.initialize()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            })
            .always(function() {
                XcalarListXdfs = oldFunc;
            });
        });

        it("tests list", function(done) {
            UDFFileManager.Instance.list()
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res).to.have.property("fnDescs");
                expect(res).to.have.property("numXdfs");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("tests getEntireUDF", (done) => {
            UDFFileManager.Instance.add(testUDFDisplayPath, testUDFString)
            .then(() => {
                return UDFFileManager.Instance.getEntireUDF(testUDFNsPath);
            })
            .then((entireUDF) => {
                expect(entireUDF).to.equal(testUDFString);
                done();
            })
            .fail((error) => {
                done(error);
            })
        });

        it("tests that getEntireUDF should handle error", function(done) {
            UDFFileManager.Instance.getEntireUDF("unitTestErrorModule")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("tests delete", (done) => {
            UDFFileManager.Instance.add(testUDFDisplayPath, testUDFString)
            .then(() => {
                return UDFFileManager.Instance.delete([testUDFDisplayPath]);
            })
            .then(() => {
                expect(UDFFileManager.Instance.getUDFs().has(testUDFNsPath))
                .to.be.false;
                done();
            })
            .fail((error) => {
                done(error);
            })
        });

        it("tests that delete should handle errors", (done) => {
            var oldDelete = XcalarDeletePython;
            var oldList = XcalarListXdfs;

            var deleteTaskFailed = () => {
                var deferred = PromiseHelper.deferred();
                UDFFileManager.Instance.delete([testUDFDisplayPath])
                .then(() => {
                    deferred.reject();
                })
                .fail(() => {
                    UnitTest.hasAlertWithTitle(UDFTStr.DelFail);
                    deferred.resolve();
                })
                return deferred.promise();
            };

            UDFFileManager.Instance.add(testUDFDisplayPath, testUDFString)
            .then(() => {
                XcalarDeletePython = function() {
                    test = true;
                    return PromiseHelper.reject({"error": "test"});
                };
                return deleteTaskFailed();
            })
            .then(() => {
                XcalarDeletePython = function() {
                    test = true;
                    return PromiseHelper.reject({
                        "status": StatusT.StatusUdfModuleNotFound
                    });
                };
                XcalarListXdfs = function() {
                    return PromiseHelper.reject("test");
                };
                return deleteTaskFailed();
            })
            .then(() => {
                XcalarDeletePython = function() {
                    test = true;
                    return PromiseHelper.reject({
                        "status": StatusT.StatusUdfModuleNotFound
                    });
                };
                XcalarListXdfs = function() {
                    return PromiseHelper.resolve({
                        "numXdfs": 1,
                        "fnDescs": []
                    });
                };
                return deleteTaskFailed();
            })
            .then(() => {
                XcalarListXdfs = oldList;
                return UDFFileManager.Instance.initialize()
            })
            .then(done)
            .fail(() => {done("fail");})
            .always(() => {
                XcalarDeletePython = oldDelete;
                XcalarListXdfs = oldList;
            });
        })

        it("tests download", (done) => {
            var oldFunc = xcHelper.downloadAsFile;
            var test = null;
            xcHelper.downloadAsFile = (_moduleName, testUDFString) => {
                test = testUDFString;
            };

            UDFFileManager.Instance
            .download([UDFFileManager.Instance.nsPathToDisplayPath(defaultNsPath)])
            .then(function() {
                expect(test).not.to.be.null;
                expect(test).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcHelper.downloadAsFile = oldFunc;
            });
        });

        it("tests that download should handle error", function(done) {
            UDFFileManager.Instance.download(["unitTestErrorModule"])
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.DownloadError);
                done();
            });
        });

        it("tests add and upload", (done) => {
            UDFFileManager.Instance.add(testUDFDisplayPath, testUDFString)
            .then(() => {
                expect(UDFFileManager.Instance.getUDFs().has(testUDFNsPath)).to.be.true;
                done();
            })
            .fail((error) => {done(error);});
        });

        it("tests that upload should handle normal error", (done) => {
            var oldFunc = XcalarUploadPython;
            XcalarUploadPython = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            var moduleName = xcHelper.randName("unittest");
            UDFFileManager.Instance.upload(moduleName, "test", "UDF")
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
                done();
            })
            .always(() => {
                XcalarUploadPython = oldFunc;
            });
        });

        it("tests canDelete", () => {
            var displayPath1 = "/sharedUDFs/default.py";
            var displayPath2 = "/sharedUDFs/default1.py";
            var displayPath3 = UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
            "test_udf_a.py";
            expect(UDFFileManager.Instance.canDelete([displayPath1])).to.be.false;
            expect(UDFFileManager.Instance.canDelete([displayPath1, displayPath2])).to.be.false;
            expect(UDFFileManager.Instance.canDelete([displayPath2])).to.be.true;
            expect(UDFFileManager.Instance.canDelete([displayPath3])).to.be.true;
        });

        it("tests canDuplicate", () => {
            var displayPath1 = "/sharedUDFs/default.py";
            var displayPath2 = "/sharedUDFs/default1.py";
            var displayPath3 = UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
            "test_udf_a.py";
            expect(UDFFileManager.Instance.canDuplicate(displayPath1)).to.be.true;
            expect(UDFFileManager.Instance.canDuplicate(displayPath2)).to.be.true;
            expect(UDFFileManager.Instance.canDuplicate(displayPath3)).to.be.true;
        });

        it("tests canAdd", () => {
            var currWorkbookDisplayPath = UDFFileManager.Instance.
            getCurrWorkbookDisplayPath();
            var validDisplayPath1 = "/sharedUDFs/default.py";
            var validDisplayPath2 = currWorkbookDisplayPath + "test_udf_a.py";
            var emptyDisplayPath = currWorkbookDisplayPath;
            var invalidDisplayPath1 = currWorkbookDisplayPath + "1test_udf_a.py";
            var invalidDisplayPath2 = "/sharedUDF/test_udf_a.py";
            var longDisplayPath = currWorkbookDisplayPath +
            new Array(XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen + 2).join("a") +
            ".py"
            var $actionIcon = $monitorFileManager.find(".actionIcon");
            expect(UDFFileManager.Instance.canAdd(validDisplayPath1, $actionIcon, $actionIcon))
            .to.be.true;
            expect(UDFFileManager.Instance.canAdd(validDisplayPath2, $actionIcon, $actionIcon))
            .to.be.true;
            expect(UDFFileManager.Instance.canAdd(emptyDisplayPath, $actionIcon, $actionIcon))
            .to.be.false;
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidFileName);
            expect(UDFFileManager.Instance.canAdd(invalidDisplayPath1, $actionIcon, $actionIcon))
            .to.be.false;
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidName);
            expect(UDFFileManager.Instance.canAdd(invalidDisplayPath2, $actionIcon, $actionIcon))
            .to.be.false;
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidPath);
            expect(UDFFileManager.Instance.canAdd(longDisplayPath, $actionIcon, $actionIcon))
            .to.be.false;
            UnitTest.hasStatusBoxWithError(ErrTStr.LongFileName);
        });

        it("tests canShare", () => {
            var displayPath1 = "/sharedUDFs/test_udf_a.py";
            var displayPath2 = UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
            "test_udf_a.py";
            expect(UDFFileManager.Instance.canShare(displayPath1)).to.be.false;
            expect(UDFFileManager.Instance.canShare(displayPath2)).to.be.true;
        });

        it("hasUDF should work", function() {
            let res = UDFFileManager.Instance.hasUDF(UDFFileManager.Instance.getDefaultUDFPath());
            expect(res).to.be.true;
            // case 2
            res = UDFFileManager.Instance.hasUDF(xcHelper.randName("test"));
            expect(res).to.be.false;
        });

        it("tests copy", () => {
            // tested in functional tests
        });

        it("tests shares", () => {
            // tested in functional tests
        });

        it("tests fileIcon", () => {
            expect(UDFFileManager.Instance.fileIcon()).to.equal("xi-menu-udf");
        });

        it("tests fileExtension", () => {
            expect(UDFFileManager.Instance.fileExtension()).to.equal(".py");
        });

        it("tests registerPanel", () => {
            // tested by functional tests
        });

        after("cleanup", (done) => {
            var cleanup = () => {
                var deferred = PromiseHelper.deferred();
                if (getFileRowSelector(tmpFile).length === 1) {
                    selectFileRow(tmpFile);
                    clickAction("Delete");
                    UnitTest.hasAlertWithTitle(FileManagerTStr.DelTitle, {
                        "confirm": true,
                        "nextAlert": true
                    })
                    UnitTest.testFinish(() => {
                        return getFileRowSelector(tmpFile).length === 0;
                    })
                    .then(deferred.resolve, deferred.reject);
                } else {
                    deferred.resolve();
                }
                return deferred.promise();
            };

            var tmpFile = "test_udf_a.py"
            cleanup().then(done, () => {done("fail");});
        })
    });

    describe("Private method test", () => {
        it("tests _parseSyntaxError", function() {
            var _parseSyntaxError = UDFFileManager.Instance.__testOnly__.parseSyntaxError;
            // case 1
            var res = _parseSyntaxError(null);
            expect(res).to.be.null;
            // case 2
            res = _parseSyntaxError({"error": "abc"});
            expect(res).to.be.null;
            // case 3
            res = _parseSyntaxError({"error": "a,b,c,d"});
            expect(res).to.be.null;
            // case 4
            res = _parseSyntaxError({"error": "(a,b,c,d)"});
            expect(res).to.be.null;

            res = _parseSyntaxError({"error": "error: 'invalid syntax' at line 12 column 1"});
            expect(res).to.be.an("object");
            expect(res.reason).to.equal("invalid syntax");
            expect(res.line).to.equal(12);
        });

        it("_hasDatasetWithUDF should work", function() {
            let udf = "test";
            let dsObj = new DSObj();
            dsObj.moduleName = UDFFileManager.Instance.getCurrWorkbookPath() + udf;
            let oldFunc = DS.getHomeDir;
            DS.getHomeDir = () => {
                return {eles: [dsObj]};
            };
            expect(UDFFileManager.Instance._hasDatasetWithUDF(udf)).to.be.true;
            // case 2
            DS.getHomeDir = () => {
                return {eles: []};
            };
            expect(UDFFileManager.Instance._hasDatasetWithUDF(udf)).to.be.false;
            // case 3
            DS.getHomeDir = () => null;
            expect(UDFFileManager.Instance._hasDatasetWithUDF(udf)).to.be.false;

            DS.getHomeDir = oldFunc;
        });
    });

    it("listLocalAndSharedUDFs test", function() {
        const oldKV = UDFFileManager.Instance.kvStoreUDF;
        const testKV = new Map();
        testKV.set("a", {});
        testKV.set(`${UDFFileManager.Instance.getSharedUDFPath()}/a`, {});
        testKV.set(`${UDFFileManager.Instance._newPrefix}/a`, {});
        testKV.set(`${UDFFileManager.Instance._unsavedPrefix    }/a`, {});
        UDFFileManager.Instance.kvStoreUDF = testKV;

        const res = UDFFileManager.Instance.listLocalAndSharedUDFs();
        expect(res.length).to.equal(2);
        expect(res[0].displayName).to.equal('a.py');
        expect(res[1].displayName).to.equal(`${UDFFileManager.Instance.getSharedUDFPath()}/a.py`);
        UDFFileManager.Instance.kvStoreUDF = oldKV;
    });

    it("_normalizeBackUDFWithKV should create new UDF if not exist", function() {
        const oldKV = UDFFileManager.Instance.kvStoreUDF;
        const testKV = new Map();
        UDFFileManager.Instance.kvStoreUDF = testKV;

        UDFFileManager.Instance._normalizeBackUDFWithKV("a.py", "test");
        expect(testKV.size).to.equal(1);
        expect(testKV.has('a')).to.be.true;
        const snippetObj = testKV.get('a');
        expect(snippetObj.name).to.equal('a');
        expect(snippetObj.snippet).to.equal('test');

        UDFFileManager.Instance.kvStoreUDF = oldKV;
    });

    it("_normalizeBackUDFWithKV should overwrite UDF if not match", function() {
        const oldKV = UDFFileManager.Instance.kvStoreUDF;
        const testKV = new Map();
        UDFFileManager.Instance.kvStoreUDF = testKV;
        testKV.set('a', {name: 'a', snippet: "test1"});
        UDFFileManager.Instance._normalizeBackUDFWithKV("a.py", "test2");
        expect(testKV.size).to.equal(1);
        expect(testKV.has('a')).to.be.true;
        const snippetObj = testKV.get('a');
        expect(snippetObj.name).to.equal('a');
        expect(snippetObj.snippet).to.equal('test2');

        UDFFileManager.Instance.kvStoreUDF = oldKV;
    });

    it("getNSPathFromModuleName should work", function() {
        // case 1
        let moduleName = `${UDFFileManager.Instance.getSharedUDFPath()}/a`;
        let res = UDFFileManager.Instance.getNSPathFromModuleName(moduleName);
        expect(res).to.equal(moduleName);
        // case 2
        moduleName = 'a';
        res = UDFFileManager.Instance.getNSPathFromModuleName(moduleName);
        expect(res).not.to.equal(moduleName);
    });

    it('getDisplayNameFromNSPath should work', function() {
        // case 1
        let nsPath = `${UDFFileManager.Instance.getSharedUDFPath()}/a`;
        let res = UDFFileManager.Instance.getDisplayNameFromNSPath(nsPath);
        expect(res).to.equal(`${nsPath}.py`);
        // case 2
        nsPath = UDFFileManager.Instance.getNSPathFromModuleName('a');
        res = UDFFileManager.Instance.getDisplayNameFromNSPath(nsPath);
        expect(res).to.equal('a.py');
    });

    it('parseModuleNameFromFileName should work', function() {
        // case 1
        let res = UDFFileManager.Instance.parseModuleNameFromFileName('a.py');
        expect(res).to.equal('a');
    });

    // describe("_warnDatasetUDF test", function() {
    //     let testUDF;
    //     let testUDFPath;

    //     before(function() {
    //         testUDF = xcHelper.randName("test");
    //         testUDFPath = UDFFileManager.Instance.getSharedUDFPath() + testUDF;
    //         UDFFileManager.Instance.storedUDF.set(testUDFPath, null);
    //     });

    //     it("should resolve if it's shared UDF", function(done) {
    //         UDFFileManager.Instance._warnDatasetUDF("default", "test")
    //         .then(function(res) {
    //             expect(res).to.equal(false);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("should resolve if UDF not exist in shared space", function(done) {
    //         let udf = xcHelper.randName("nonExistTest");
    //         UDFFileManager.Instance._warnDatasetUDF(udf, "test")
    //         .then(function(res) {
    //             expect(res).to.equal(false);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("should resolve if no dataset UDF", function(done) {
    //         let oldFunc = UDFFileManager.Instance._hasDatasetWithUDF;
    //         UDFFileManager.Instance._hasDatasetWithUDF = () => false;

    //         UDFFileManager.Instance._warnDatasetUDF(testUDF, "test")
    //         .then(function(res) {
    //             expect(res).to.equal(false);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         })
    //         .always(function() {
    //             UDFFileManager.Instance._hasDatasetWithUDF = oldFunc;
    //         });
    //     });

    //     it("should resolve true if has Dataset UDF and apply", function(done) {
    //         let oldFunc = UDFFileManager.Instance._hasDatasetWithUDF;
    //         let oldAlert = Alert.show;
    //         UDFFileManager.Instance._hasDatasetWithUDF = () => true;
    //         Alert.show = (options) => { options.buttons[1].func(); }

    //         UDFFileManager.Instance._warnDatasetUDF(testUDF, "test")
    //         .then(function(res) {
    //             expect(res).to.equal(true);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         })
    //         .always(function() {
    //             Alert.show = oldAlert;
    //             UDFFileManager.Instance._hasDatasetWithUDF = oldFunc;
    //         });
    //     });

    //     it("should resolve false if has Dataset UDF and not apply", function(done) {
    //         let oldFunc = UDFFileManager.Instance._hasDatasetWithUDF;
    //         let oldAlert = Alert.show;
    //         UDFFileManager.Instance._hasDatasetWithUDF = () => true;
    //         Alert.show = (options) => { options.buttons[0].func(); }

    //         UDFFileManager.Instance._warnDatasetUDF(testUDF, "test")
    //         .then(function(res) {
    //             expect(res).to.equal(false);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         })
    //         .always(function() {
    //             Alert.show = oldAlert;
    //             UDFFileManager.Instance._hasDatasetWithUDF = oldFunc;
    //         });
    //     });

    //     it("should reject if has Dataset UDF but cancel by user", function(done) {
    //         let oldFunc = UDFFileManager.Instance._hasDatasetWithUDF;
    //         let oldAlert = Alert.show;
    //         UDFFileManager.Instance._hasDatasetWithUDF = () => true;
    //         Alert.show = (options) => { options.onCancel(); }

    //         UDFFileManager.Instance._warnDatasetUDF(testUDF, "test")
    //         .then(function() {
    //             done("fail");
    //         })
    //         .fail(function(error) {
    //             expect(error).to.be.undefined;
    //             done();
    //         })
    //         .always(function() {
    //             Alert.show = oldAlert;
    //             UDFFileManager.Instance._hasDatasetWithUDF = oldFunc;
    //         });
    //     });

    //     after(function() {
    //         UDFFileManager.Instance.storedUDF.delete(testUDFPath); 
    //     });
    // });

    after(function(done) {
        $("#udfTab").click();
        UnitTest.offMinMode();
        // wait for menu bar to open
        setTimeout(function() {
            done();
        }, waitTime);
    });
});