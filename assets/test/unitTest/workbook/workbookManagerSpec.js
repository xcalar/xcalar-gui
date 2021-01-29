describe("WorkbookManager Test", function() {
    var oldKVGet, oldCommitCheck;
    var oldXcalarPut, oldXcalarDelete;
    var fakeMap = {};
    var oldXcalarUploadWorkbook;

    before(function() {
        console.clear();
        UnitTest.onMinMode();
        oldKVGet = KVStore.prototype.get;
        oldCommitCheck = XcUser.CurrentUser.commitCheck;
        oldXcalarPut = XcalarKeyPut;
        oldXcalarDelete = XcalarKeyDelete;
        oldXcalarUploadWorkbook = XcalarUploadWorkbook;

        XcalarKeyPut = function(key, value) {
            fakeMap[key] = value;
            return PromiseHelper.resolve();
        };

        XcalarKeyDelete = function(key) {
            delete fakeMap[key];
            return PromiseHelper.resolve();
        };

        XcalarUploadWorkbook = function() {
            return PromiseHelper.resolve();
        }

        KVStore.prototype.get = function(key) {
            return PromiseHelper.resolve(fakeMap[key]);
        };

        XcUser.CurrentUser.commitCheck = function() {
            return PromiseHelper.resolve();
        };

        generateKey = WorkbookManager.__testOnly__.generateKey;
    });

    beforeEach(function() {
        fakeMap = {};
    });

    describe("Basic Function Test", function() {
        var generateKey;

        before(function() {
            generateKey = WorkbookManager.__testOnly__.generateKey;
        });

        it("setupWorkbooks should handle error case", function(done) {
            var oldFunc = WorkbookManager.getWKBKsAsync;
            WorkbookManager.getWKBKsAsync = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookManager.__testOnly__.setupWorkbooks()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                WorkbookManager.getWKBKsAsync = oldFunc;
            });
        });

        it("generateKey should work", function() {
            var res = generateKey();
            expect(res).not.to.exist;
            // case 2
            res = generateKey("a", "b");
            expect(res).to.equal("a-b");
        });

        it("getWKBKId should work", function() {
            var res = WorkbookManager.__testOnly__.getWKBKId("test");
            expect(res).to.equal(XcUser.getCurrentUserName() + "-wkbk-test");
        });

        it("copyHelper should work", function() {
            var oldId = "oldId";
            var newId = "newId";
            var workbooks = WorkbookManager.getWorkbooks();
            workbooks[oldId] = new WKBK({id: oldId, name: "old"});
            workbooks[newId] = new WKBK({id: newId, name: "new"});

            const res = WorkbookManager.__testOnly__.copyHelper(oldId, newId);
            expect(res).to.equal(true);
        });

        it("copyHelper should work handle error case", function() {
            const res = WorkbookManager.__testOnly__.copyHelper()
            expect(res).to.equal(false);
        });

        it("resetActiveWKBK should work", function(done) {
            var oldSetup = KVStore.setupWKBKKey;
            var oldHold = XcUser.CurrentUser.holdSession;
            var test = false;

            KVStore.setupWKBKKey = function() {};

            XcUser.CurrentUser.holdSession = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            // use the current workbook id
            // to make sure actieve workbook has no chagne
            var wkbkId = WorkbookManager.getActiveWKBK();
            WorkbookManager.__testOnly__.resetActiveWKBK(wkbkId)
            .then(function() {
                expect(test).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.setupWKBKKey = oldSetup;
                XcUser.CurrentUser.holdSession = oldHold;
            });
        });

        it("saveWorkbook should work", function(done) {
            WorkbookManager.__testOnly__.saveWorkbook()
            .then(function() {
                var keys = Object.keys(fakeMap);
                expect(keys.length).to.equal(1);
                fakeMap = {};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("syncSessionInfo should handle error case", function(done) {
            WorkbookManager.__testOnly__.syncSessionInfo({oldWorkbooks: null, sessionInfo: null})
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("syncSessionInfo should handle no workbok case", function(done) {
            var sessionInfo = {
                "numSessions": 0,
                "sessions": []
            };
            WorkbookManager.__testOnly__.syncSessionInfo({oldWorkbooks: null, sessionInfo: sessionInfo})
            .then(function(storedActiveId) {
                expect(storedActiveId).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("switchWorkBookHelper should handle fail case", function(done) {
            var oldActivate = XcalarActivateWorkbook;
            var oldList = XcalarListWorkbooks;

            XcalarActivateWorkbook = function() {
                return PromiseHelper.reject("test");
            };

            XcalarListWorkbooks = function() {
                return PromiseHelper.resolve({
                    "sessions": [{
                        "state": "Active",
                        "info": "has resources"
                    }]
                });
            };

            let wkbk = new WKBK({name: "to", id: "to", resource: "true"});
            WorkbookManager.__testOnly__.switchWorkBookHelper(wkbk)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarActivateWorkbook = oldActivate;
                XcalarListWorkbooks = oldList;
            });
        });

        it("progressCycle should work", function(done) {
            var fnCalled = false;
            var cachedQueryState = XcalarQueryState;
            XcalarQueryState = function() {
                fnCalled = true;
                return PromiseHelper.resolve({
                    numCompletedWorkItem: 2,
                    queryGraph: {
                        numNodes: 4,
                        node: [{
                            state: DgDagStateT.DgDagStateReady
                        }, {
                            state: DgDagStateT.DgDagStateReady
                        }, {
                            state: DgDagStateT.DgDagStateProcessing,
                            api: 15,
                            numWorkCompleted: 2,
                            numWorkTotal: 5
                        }, {
                            state: 0
                        }]
                    }
                });
            };
            WorkbookManager.__testOnly__.changeIntTime(200);
            var cycle = WorkbookManager.__testOnly__.progressCycle;
            cycle("testName", 200);

            UnitTest.testFinish(function() {
                return fnCalled === true;
            })
            .then(function() {
                expect($("#initialLoadScreen").hasClass("sessionProgress")).to.be.true;
                expect($("#initialLoadScreen .numSteps").text()).to.equal("2/4");
                expect($("#initialLoadScreen .progressBar").data("pct")).to.equal(40);

                XcalarQueryState = cachedQueryState;
                WorkbookManager.__testOnly__.endProgressCycle();
                expect($("#initialLoadScreen").hasClass("sessionProgress")).to.be.false;
                WorkbookManager.__testOnly__.changeIntTime(2000);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("count down should work", function(done) {
            var $topBar = $("#monitorTopBar");
            $topBar.attr("id", "monitorTopBar2");
            $fakeBar = $('<div id="monitorTopBar"><div class="wkbkTitle"></div></div>');
            $fakeBar.appendTo($("body"));
            expect($("#monitorTopBar").find(".wkbkTitle").is(":visible"));

            WorkbookManager.__testOnly__.countdown()
            .always(function() {
                var msg = xcStringHelper.replaceMsg(WKBKTStr.Refreshing, {
                    time: 1
                });
                expect($("#monitorTopBar").find(".wkbkTitle").text())
                .to.equal(msg);
                done();
            });

            // clear up
            $fakeBar.remove();
            $topBar.attr("id", "monitorTopBar");
        });
    });

    describe("Basic Public Api Test", function() {
        it("WorkbookManager.getWorkbooks should work", function() {
            var workbooks = WorkbookManager.getWorkbooks();
            expect(workbooks).to.be.an("object");
        });

        it("WorkbookManager.getWorkbook should work", function() {
            // error case
            var res = WorkbookManager.getWorkbook(null);
            expect(res).to.be.null;
            // normal
            var wkbkId = WorkbookManager.getActiveWKBK();
            res = WorkbookManager.getWorkbook(wkbkId);
            expect(res).not.to.be.null;
        });

        it("WorkbookManager.getWKBKsAsync should work", function(done) {
            var oldFunc = KVStore.prototype.get;
            KVStore.prototype.get = oldKVGet;

            WorkbookManager.getWKBKsAsync()
            .then(function(wkbk, sessionInfo) {
                expect(wkbk).not.to.be.null;
                expect(sessionInfo).not.to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.prototype.get = oldFunc;
            });
        });

        it("WorkbookManager.getActiveWKBK should work", function() {
            var wkbkId = WorkbookManager.getActiveWKBK();
            expect(wkbkId).to.be.a("string");
        });

        it("WorkbookManager.updateDescription should work", function(done) {
            var wkbkId = WorkbookManager.getActiveWKBK();
            var workbook = WorkbookManager.getWorkbook(wkbkId);
            var oldDescription = workbook.description;
            var description = xcHelper.randName("description");

            WorkbookManager.updateDescription(wkbkId, description)
            .then(function() {
                expect(workbook.description).to.equal(description);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                workbook.description = oldDescription;
            });
        });

        it("WorkbookManager.getStorageKey should work", function() {
            var res = WorkbookManager.getStorageKey();
            expect(res).to.equal("gInfo-" + Durable.Version);
        });
    });

    describe("Upgrade API Test", function() {
        it("WorkbookManager.getGlobalScopeKeys should work", function() {
            var res = WorkbookManager.getGlobalScopeKeys();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(4);
            expect(res).to.ownProperty("gSettingsKey");
            expect(res).to.ownProperty("gShareUDFKey");
        });

        it("WorkbookManager.upgrade should work", function() {
            // case 1
            var res = WorkbookManager.upgrade(null);
            expect(res).to.be.null;

            // case 2
            var wkbks = WorkbookManager.getWorkbooks();
            res = WorkbookManager.upgrade(wkbks);
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).
            to.equal(Object.keys(wkbks).length);
        });

        it("WorkbookManager.getKeysForUpgrade should work", function() {
            var version = Durable.Version;
            var sessionInfo = {
                "numSessions": 1,
                "sessions": [{
                    "name": "test"
                }]
            };

            var res = WorkbookManager.getKeysForUpgrade(sessionInfo, version);
            expect(res).to.be.an("object");
            expect(res).to.have.property("global");
            expect(res).to.have.property("user");
            expect(res).to.have.property("wkbk");
        });
    });

    describe("Cancel Workbook Replay Test", function() {
        var $loadScreen;
        before(function() {
            $loadScreen = $("#initialLoadScreen");
        });

        it("should not show alert if already canceling", function() {
            $loadScreen.addClass("canceling");
            $loadScreen.find(".cancel").click();
            assert.isFalse($("#alertModal").is(":visible"));
            $loadScreen.removeClass("canceling");
        });

        it("should show alert", function() {
            $loadScreen.find(".cancel").click();
            UnitTest.hasAlertWithTitle(WKBKTStr.CancelTitle);
        });

        it("should show alert and confirm", function() {
            var oldCancel = XcalarQueryCancel;
            var test = false;
            XcalarQueryCancel = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            $loadScreen.find(".cancel").click();
            UnitTest.hasAlertWithTitle(WKBKTStr.CancelTitle, {
                "confirm": true
            });

            expect(test).to.equal(true);
            XcalarQueryCancel = oldCancel;
        });
    });

    describe("Advanced API Test", function() {
        var testWkbkName;
        var testWkbkId;
        var oldActiveWkbkId;

        var oldRemoveUnload;
        var oldReload;
        var oldActivate;
        var oldDeactive;

        before(function() {
            testWkbkName = xcHelper.randName("testWkbk");
            oldActiveWkbkId = WorkbookManager.getActiveWKBK();

            oldRemoveUnload = xcManager.removeUnloadPrompt;
            oldReload = xcManager.reload;
            // switch is slow, so use a fake one
            oldActivate = XcalarActivateWorkbook;
            oldDeactive = XcalarDeactivateWorkbook;
            xcManager.removeUnloadPrompt = function() {};
            xcManager.reload = function() {};
            XcalarActivateWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarDeactivateWorkbook = function() {
                return PromiseHelper.resolve();
            };
        });

        it("Should not new workbook with invalid name", function(done) {
            WorkbookManager.newWKBK(null, "testId")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("Invalid name");
                done();
            });
        });

        it("Should not new workbook with invalid srcId", function(done) {
            var srcId = xcHelper.randName("errorId");
            WorkbookManager.newWKBK(testWkbkName, srcId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("missing workbook meta");
                done();
            });
        });

        it("Should reject if new workbook error", function(done) {
            var oldFunc = XcalarNewWorkbook;
            XcalarNewWorkbook = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            WorkbookManager.newWKBK(testWkbkName)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.be.equal("test");
                done();
            })
            .always(function() {
                XcalarNewWorkbook = oldFunc;
            });
        });

        it("Should create new workbook", function(done) {
            var wkbkSet = WorkbookManager.getWorkbooks();
            var len = Object.keys(wkbkSet).length;

            WorkbookManager.newWKBK(testWkbkName)
            .then(function(id) {
                expect(id).not.to.be.null;
                testWkbkId = id;

                var newLen = Object.keys(wkbkSet).length;
                expect(newLen).to.equal(len + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("uploadWKBK should work", function(done) {

            var oldList = XcalarListWorkbooks;

            XcalarListWorkbooks = function() {
                return PromiseHelper.resolve({
                    "sessions": [{
                        "state": "inActive",
                        "info": "has resources"
                    }],
                    "numSessions": 1
                });
            };

            var wkbkSet = WorkbookManager.getWorkbooks();
            var len = Object.keys(wkbkSet).length;

            var file = new Blob(["Test"], {type : "text/plain"});
            WorkbookManager.uploadWKBK("Uploaded WKBK", file)
            .then(function(id) {
                expect(id).not.to.be.null;

                var newLen = Object.keys(wkbkSet).length;
                expect(newLen).to.equal(len + 1);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListWorkbooks = oldList;
            });
        });

        it("copy workbook should handle fail case", function(done) {
            var oldFunc = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.reject("test");
            };
            WorkbookManager.copyWKBK()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.commit = oldFunc;
            });
        });

        it("Should copy workbook", function(done) {
            var oldNewWorkbook = WorkbookManager.newWKBK;
            var oldDLPython = XcalarDownloadPython;
            var oldUploadPython = XcalarUploadPython;
            var oldListXdfs = XcalarListXdfs;
            var oldId = "oldId";
            var newId = "newId";
            var workbooks = WorkbookManager.getWorkbooks();
            workbooks[oldId] = new WKBK({id: oldId, name: "old"});
            workbooks[newId] = new WKBK({id: newId, name: "new"});

            WorkbookManager.newWKBK = function() {
                return PromiseHelper.resolve(newId);
            };

            XcalarDownloadPython = function() {
                return PromiseHelper.resolve(true);
            };

            XcalarUploadPython = function() {
                return PromiseHelper.resolve();
            };

            XcalarListXdfs = function() {
                var ret = {
                    "fnDescs": [
                        {"fnName": "test"}
                    ]
                };
                return PromiseHelper.resolve(ret);
            };

            WorkbookManager.copyWKBK(oldId, 'new')
            .then(function(id) {
                expect(id).to.equal(newId);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                WorkbookManager.newWKBK = oldNewWorkbook;
                XcalarDownloadPython = oldDLPython;
                XcalarUploadPython = oldUploadPython;
                XcalarListXdfs = oldListXdfs;
                delete workbooks[oldId];
                delete workbooks[newId];
            });
        });

        it("Should not rename if newId exists", function(done) {
            var activeWkbkId = WorkbookManager.getActiveWKBK();
            var activeWkbk = WorkbookManager.getWorkbook(activeWkbkId);
            var newName = activeWkbk.getName();

            WorkbookManager.renameWKBK(testWkbkId, newName)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                var errStr = xcStringHelper.replaceMsg(ErrTStr.WorkbookExists,
                                             {'workbookName': newName});
                expect(error).to.equal(errStr);
                done();
            });
        });

        it("Should rename workbook", function(done) {
            var newName = xcHelper.randName("newName");
            WorkbookManager.renameWKBK(testWkbkId, newName)
            .then(function(newId) {
                expect(WorkbookManager.getWorkbook(testWkbkId)).to.be.null;
                expect(newId).not.to.be.null;
                var workbook = WorkbookManager.getWorkbook(newId);
                expect(workbook).not.to.be.null;
                expect(workbook.getName()).to.equal(newName);
                testWkbkId = newId;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should reject if switch with wrong id", function(done) {
            WorkbookManager.switchWKBK(null)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("Invalid notebook Id");
                done();
            });
        });

        it("Should reject if switch to active workbook", function(done) {
            var activeWkbk = WorkbookManager.getActiveWKBK();
            WorkbookManager.switchWKBK(activeWkbk)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("Cannot switch to the same project");
                done();
            });
        });

        it("should reject if have error case", function(done) {
            var oldCommit = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal("test");
                done();
            })
            .always(function() {
                KVStore.commit = oldCommit;
            });
        });

        it("should hand switch fail case", function(done) {
            var oldFunc = XcalarActivateWorkbook;
            XcalarActivateWorkbook = function() {
                return PromiseHelper.reject("test");
            };
            WorkbookManager.__testOnly__.setAcitiveWKBKId(null);

            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                XcalarActivateWorkbook = oldFunc;
                WorkbookManager.__testOnly__.restoreWKBKId();
            });
        });

        it("Should switch workbook", function(done) {
            WorkbookManager.switchWKBK(testWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(testWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should inactive all workbook", function(done) {
            WorkbookManager.inActiveAllWKBK()
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should switch back of workbook", function(done) {
            WorkbookManager.switchWKBK(oldActiveWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(oldActiveWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not delete workbook in error case", function(done) {
            var errorId = xcHelper.randName("errorId");

            WorkbookManager.deleteWKBK(errorId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(WKBKTStr.DelErr);
                done();
            });
        });

        it("Should delete workbook", function(done) {
            var wkbkSet = WorkbookManager.getWorkbooks();
            var len = Object.keys(wkbkSet).length;

            WorkbookManager.deleteWKBK(testWkbkId)
            .then(function() {
                var newLen = Object.keys(wkbkSet).length;
                expect(newLen).to.equal(len - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject deactivate workbbok inn error", function(done) {
            WorkbookManager.deactivate("test")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(WKBKTStr.DeactivateErr);
                done();
            });
        });

        it("Should deactivate workbook", function(done) {
            WorkbookManager.deactivate(oldActiveWkbkId)
            .then(function() {
                var wkbk = WorkbookManager.getWorkbook(oldActiveWkbkId);
                expect(wkbk.hasResource()).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should switch back of workbook", function(done) {
            WorkbookManager.switchWKBK(oldActiveWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(oldActiveWkbkId);
                assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                var wkbk = WorkbookManager.getWorkbook(activeWkbkId);
                wkbk.setResource(true);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            xcManager.removeUnloadPrompt = oldRemoveUnload;
            xcManager.reload = oldReload;
            XcalarActivateWorkbook = oldActivate;
            XcalarDeactivateWorkbook = oldDeactive;
        });
    });

    describe("Socket deactivate tests", function() {
        var oldXcSocket;
        var oldUpdateFolderName;
        var oldActiveWkbkId;

        var oldRemoveUnload;
        var oldReload;
        var oldActivate;
        var oldDeactive;

        before(function() {
            oldActiveWkbkId = WorkbookManager.getActiveWKBK();

            oldXcSocket = XcSocket.unregisterUserSession;
            XcSocket.unregisterUserSession = function() {};

            oldRemoveUnload = xcManager.removeUnloadPrompt;
            oldReload = xcManager.reload;
            // switch is slow, so use a fake one
            oldActivate = XcalarActivateWorkbook;
            oldDeactive = XcalarDeactivateWorkbook;

            xcManager.removeUnloadPrompt = function() {};
            xcManager.reload = function() {};
            XcalarActivateWorkbook = function() {
                return PromiseHelper.resolve();
            };

            XcalarDeactivateWorkbook = function() {
                return PromiseHelper.resolve();
            };
        });

        it("Should deactivate workbook from socket", function() {
            var info = {};
            info.user = XcUser.getCurrentUserName();
            info.action = "deactivate";
            info.triggerWkbk = WorkbookManager.getActiveWKBK();

            WorkbookManager.updateWorkbooks(info);
            var wkbk = WorkbookManager.getWorkbook(info.triggerWkbk);
            expect(wkbk.hasResource()).to.be.false;
        });

        it("Should switch back of workbook", function(done) {
            WorkbookManager.switchWKBK(oldActiveWkbkId)
            .then(function() {
                activeWkbkId = WorkbookManager.getActiveWKBK();
                expect(activeWkbkId).to.equal(oldActiveWkbkId);
                // assert.isTrue($("#initialLoadScreen").is(":visible"));
                $("#initialLoadScreen").hide();
                var wkbk = WorkbookManager.getWorkbook(activeWkbkId);
                wkbk.setResource(true);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            XcSocket.unregisterUserSession = oldXcSocket;
            xcManager.removeUnloadPrompt = oldRemoveUnload;
            xcManager.reload = oldReload;
            XcalarActivateWorkbook = oldActivate;
            XcalarDeactivateWorkbook = oldDeactive;
        });
    });
    describe("socket update test", function() {
        var oldUpdateFolderName;
        var oldGetWKBK;
        var oldWKBKAsync;
        var oldHoldSession;
        var oldUpdateWorkbooks;
        var oldName;
        var wkbkId;

        var passed;

        before(function() {
            wkbkId = WorkbookManager.getActiveWKBK();
            oldName = WorkbookManager.getWorkbook(wkbkId).getName();

            passed = false;
            oldGetWKBK = WorkbookManager.getWorkbook;
            oldWKBKAsync = WorkbookManager.getWKBKsAsync;
            oldHoldSession = XcUser.CurrentUser.holdSession;
            oldUpdateWorkbooks = WorkbookPanel.updateWorkbooks;
            WorkbookManager.getWorkbook = function() {
                return {};
            };
            WorkbookManager.getWKBKsAsync = function() {
                return PromiseHelper.reject();
            };
            WorkbookPanel.updateWorkbooks = function() {};
            XcUser.CurrentUser.holdSession = function(){};
            WorkbookInfoModal.update = () => { passed = true; }
        });

        beforeEach(function() {
            passed = false;
        });

        it("Should rename workbook through socket", function(done) {
            var info = {};
            info.user = XcUser.getCurrentUserName();
            info.action = "rename";
            info.newName = xcHelper.randName("newName");
            info.triggerWkbk = wkbkId;

            var checkFunc = function() {
                return passed;
            };

            WorkbookManager.updateWorkbooks(info);
            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($("#mainTopBar .wkbkName").text()).to.equal(info.newName);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should rename workbook back to old name", function(done) {
            var info = {};
            info.user = XcUser.getCurrentUserName();
            info.action = "rename";
            info.newName = oldName;
            info.triggerWkbk = wkbkId;

            var checkFunc = function() {
                return passed;
            };

            WorkbookManager.updateWorkbooks(info);
            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($("#mainTopBar .wkbkName").text()).to.equal(oldName);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            WorkbookManager.getWorkbook = oldGetWKBK;
            WorkbookManager.getWKBKsAsync = oldWKBKAsync;
            XcUser.CurrentUser.holdSession = oldHoldSession;
            WorkbookPanel.updateWorkbooks = oldUpdateWorkbooks;
        });
    });


    after(function() {
        KVStore.prototype.get = oldKVGet;
        XcUser.CurrentUser.commitCheck = oldCommitCheck;
        XcalarKeyPut = oldXcalarPut;
        XcalarKeyDelete = oldXcalarDelete;
        XcalarUploadWorkbook = oldXcalarUploadWorkbook;
        $("#container").removeClass("noWorkbook noMenuBar");
        WorkbookPanel.hide(true);
        UnitTest.offMinMode();
    });
});
