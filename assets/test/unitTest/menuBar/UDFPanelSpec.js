// TODO: Doesn't work. Pending Editor UX change.
describe("UDFPanel Test", function() {
    var waitTime = 200;
    var defaultModule = 'default';
    var defaultModulePath = defaultUDFPath;
    var syntaxErrror = 'Error: File "xcalar-udf-bd6bdef94f7eab4", line 14\ntest="a"\n    ^\nSyntaxError: invalid character in identifier';
    var $udfSection;

    before(function(done) {
        var udfTab = $("#udfTab");
        $udfSection = $("#udfSection");

        UnitTest.onMinMode();

        if (!udfTab.hasClass("active")) {
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                udfTab.click();
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
            done();
        }
    });

    describe("checkErrorUDF Test", function() {
        it("should not check when is new UDF", function() {
            const res = UDFPanel.Instance.checkErrorUDF("a", true);
            expect(res).to.be.false;
        });

        it("should not check when is unsaved UDF", function() {
            let oldFunc = UDFFileManager.Instance.getUnsavedSnippet;
            let called = false;
            UDFFileManager.Instance.getUnsavedSnippet = () => {
                called = true;
                return {};
            };
            const res = UDFPanel.Instance.checkErrorUDF("a", false);
            expect(res).to.be.false;
            expect(called).to.be.true;

            UDFFileManager.Instance.getUnsavedSnippet = oldFunc;
        });

        it("should return false when it's not error UDF", function() {
            let oldUnsaved = UDFFileManager.Instance.getUnsavedSnippet;
            let oldIsError = UDFFileManager.Instance.isErrorSnippet;
            let called = false;
            UDFFileManager.Instance.getUnsavedSnippet = () => null;
            UDFFileManager.Instance.isErrorSnippet = () => {
                called = true;
                return false;
            };
            const res = UDFPanel.Instance.checkErrorUDF("a", false);
            expect(res).to.be.false;
            expect(called).to.be.true;

            UDFFileManager.Instance.getUnsavedSnippet = oldUnsaved;
            UDFFileManager.Instance.isErrorSnippet = oldIsError;
        });

        it("should return true when it's error UDF", function(done) {
            let oldUnsaved = UDFFileManager.Instance.getUnsavedSnippet;
            let oldIsError = UDFFileManager.Instance.isErrorSnippet;
            let oldSave = UDFPanel.Instance._saveUDF;
            let called = false;
            UDFFileManager.Instance.getUnsavedSnippet = () => null;
            UDFFileManager.Instance.isErrorSnippet = () => true;
            UDFPanel.Instance._saveUDF = () => { called = true; };

            const res = UDFPanel.Instance.checkErrorUDF("a", false);

            UnitTest.testFinish(() => called === true)
            .then(() => {
                expect(res).to.be.true;
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                UDFFileManager.Instance.getUnsavedSnippet = oldUnsaved;
                UDFFileManager.Instance.isErrorSnippet = oldIsError;
                UDFPanel.Instance._saveUDF = oldSave;
            });
        });
    });

    describe("Basic Function Test", function() {
        // it("readUDFFromFile should work", function() {
        //     var readUDFFromFile = UDFPanel.Instance.__testOnly__.readUDFFromFile;
        //     var oldReader = FileReader;

        //     FileReader = function() {
        //         this.onLoad = function() {};
        //         this.readAsText = function() {};
        //     };

        //     readUDFFromFile("testFile", "testModule");
        //     expect($("#udf-fnName").val()).to.equal("testModule");
        //     // clear up
        //     $("#udf-fnName").val("");
        //     FileReader = oldReader;
        // });
    });

    // describe("Upload Error Handling Test", function() {
    //     var uploadUDF;
    //     var oldUploadFunc;

    //     before(function() {
    //         uploadUDF = UDFFileManager.Instance.__testOnly__.upload;
    //         oldUploadFunc = XcalarUploadPython;
    //     });

    //     it("Should handle uneditable error", function(done) {
    //         uploadUDF(defaultModule, "test", "UDF")
    //         .then(function() {
    //             done("fail");
    //         })
    //         .fail(function(error) {
    //             expect(error).to.equal(SideBarTStr.OverwriteErr);
    //             UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
    //             done();
    //         });
    //     });

    //     it("Should handle syntax error", function(done) {
    //         if (isBrowserMicrosoft) {
    //             done();
    //             return;
    //         }
    //         XcalarUploadPython = function() {
    //             return PromiseHelper.reject({
    //                 "error": syntaxErrror
    //             });
    //         };

    //         var moduleName = xcHelper.randName("unittest");
    //         uploadUDF(moduleName, "test", "UDF")
    //         .then(function() {
    //             done("fail");
    //         })
    //         .fail(function() {
    //             expect($udfSection.find(".lint-error").length)
    //             .to.above(0);
    //             UnitTest.hasAlertWithTitle(SideBarTStr.UploadError);
    //             done();
    //         });
    //     });

    //     after(function() {
    //         XcalarUploadPython = oldUploadFunc;
    //     });
    // });

    describe("UDF Public API Test", function() {
        it("UDFPanel.Instance.getEditor should work", function() {
            var editor = UDFPanel.Instance.getEditor();
            expect(editor instanceof CodeMirror).to.be.true;
        });
    });

    // describe("Upload and Delete UDF Test", function() {
    //     var $fnName;
    //     var uploadModule;
    //     var editor;
    //     var func = "def test():\n" +
    //                "\treturn \"a\"";

    //     before(function() {
    //         $fnName = $("#udf-fnName");
    //         uploadModule = xcHelper.randName("unittest");
    //         editor = UDFPanel.Instance.getEditor();
    //     });

    //     it("should in a workbook", function() {
    //         var wkbk = WorkbookManager.getWorkbook(WorkbookManager.getActiveWKBK());
    //         expect(wkbk).not.to.be.null;
    //         var wkbkName = wkbk.getName();
    //         if (sessionName !== wkbkName) {
    //             console.warn("wrong session name");
    //             setSessionName(wkbkName);
    //         }
    //     });

    //     it("Should not upload with empty module name", function() {
    //         editor.setValue(func);
    //         $fnName.val("");
    //         $("#udf-fnUpload").click();

    //         UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
    //     });

    //     it("Should not upload with invalid module name", function() {
    //         editor.setValue(func);
    //         $fnName.val("123ab");
    //         $("#udf-fnUpload").click();

    //         UnitTest.hasStatusBoxWithError(UDFTStr.InValidName);
    //     });

    //     it("Should not upload with long module name", function() {
    //         editor.setValue(func);
    //         $fnName.val(new Array(XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen + 2).join("a"));
    //         $("#udf-fnUpload").click();

    //         UnitTest.hasStatusBoxWithError(ErrTStr.LongFileName);
    //     });

    //     it("Should not upload empty module", function() {
    //         editor.setValue("");
    //         $fnName.val(uploadModule);
    //         $("#udf-fnUpload").click();

    //         UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyFn);
    //     });

    //     it("Should not upload with long module", function() {
    //         var oldLen = XcalarApisConstantsT.XcalarApiMaxUdfSourceLen;
    //         XcalarApisConstantsT.XcalarApiMaxUdfSourceLen = 10;

    //         editor.setValue("a".repeat(11));
    //         $fnName.val(uploadModule);
    //         $("#udf-fnUpload").click();

    //         UnitTest.hasStatusBoxWithError(ErrTStr.LargeFile);
    //         XcalarApisConstantsT.XcalarApiMaxUdfSourceLen = oldLen;
    //     });

    //     it("Should upload udf", function(done) {
    //         editor.setValue(func);
    //         $fnName.val(uploadModule);
    //         $("#udf-fnName").trigger(fakeEvent.enter);

    //         var checkFunc = function() {
    //             var $udf = $udfManager.find(".udf:contains(" + uploadModule + ")");
    //             return $udf.length > 0;
    //         };

    //         var numUDF = Number($udfManager.find(".numUDF").text());

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             var curNum = Number($udfManager.find(".numUDF").text());
    //             expect(curNum).to.equal(numUDF + 1);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should update with new func", function(done) {
    //         var oldFunc = XcalarUpdatePython;
    //         var updated = false;
    //         XcalarUpdatePython = function() {
    //             updated = true;
    //             return PromiseHelper.resolve();
    //         };
    //         editor.setValue(func);
    //         $fnName.val(uploadModule);
    //         $("#udf-fnUpload").click();

    //         var checkFunc = function() {
    //             return updated === true;
    //         };

    //         UnitTest.hasAlertWithTitle(SideBarTStr.DupUDF, {"confirm": true});
    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             XcalarUpdatePython = oldFunc;
    //             done();
    //         });
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