describe("xcManager Test", function() {
    before(function() {
        console.log("xcManager Test");
        console.clear();
    });

    describe("Setup Fail Hanlder Test", function() {
        var handleSetupFail;
        var oldAlert;
        var oldAlertError;
        var title;
        var oldSocketInit;
        var oldStartWorkbookBrowserWalkthrough;

        before(function() {
            handleSetupFail = xcManager.__testOnly__.handleSetupFail;
            oldAlert = Alert.show;
            oldAlertError = Alert.error;
            oldSocketInit = XcSocket.prototype.setup;
            oldStartWorkbookBrowserWalkthrough = TooltipWalkthroughs.startWorkbookBrowserWalkthrough;
            Alert.show = function(options) {
                title = options.title;
            };

            Alert.error = function(error) {
                title = error;
            };

            XcSocket.prototype.setup = function(){};
        });

        it("should handle no wkbk error", function(done) {
            var oldFunc = WorkbookPanel.forceShow;
            var test = false;
            WorkbookPanel.forceShow = function() { test = true; };
            var oldHold = XcUser.CurrentUser.holdSession;
            XcUser.CurrentUser.holdSession = function() {
                return PromiseHelper.resolve();
            };

            handleSetupFail(WKBKTStr.NoWkbk, true);
            UnitTest.testFinish(function() {
                return !$("#initialLoadScreen").hasClass("full");
            })
            .then(function() {
                expect(test).to.be.true;
                WorkbookPanel.forceShow = oldFunc;
                XcUser.CurrentUser.holdSession = oldHold;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle session not found error", function() {
            handleSetupFail({"status": StatusT.StatusSessionNotFound});
            expect(title).to.equal(WKBKTStr.NoOldWKBK);
            expect($("#viewLocation").text().includes(WKBKTStr.NoOldWKBK))
            .to.be.true;
        });

        it("should hanlde active else where error", function() {
            handleSetupFail({
                "status": StatusT.StatusSessionUsrAlreadyExists
            });
            expect(title).to.equal(ThriftTStr.SessionElsewhere);
            expect($("#viewLocation").text().includes(ThriftTStr.SessionElsewhere))
            .to.be.true;
        });

        it("should hanlde random error", function() {
            handleSetupFail("test");
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde expire error", function() {
            handleSetupFail({"error": "expired"});
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde update error", function() {
            handleSetupFail({"error": "Update required"});
            expect(title).to.equal(ThriftTStr.UpdateErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde connection error", function() {
            handleSetupFail({"error": "Connection"});
            expect(title).to.equal(ThriftTStr.CCNBEErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        it("should hanlde other error from backend", function() {
            handleSetupFail({"error": "test"});
            expect(title).to.equal(ThriftTStr.SetupErr);
            expect($("#viewLocation").text().includes(StatusMessageTStr.Error))
            .to.be.true;
        });

        after(function() {
            Alert.show = oldAlert;
            Alert.error = oldAlertError;
            XcSocket.prototype.setup = oldSocketInit;
            TooltipWalkthroughs.startWorkbookBrowserWalkthrough = oldStartWorkbookBrowserWalkthrough;
        });
    });

    describe("Basic Function Test", function() {
        it("window.error should work", function() {
            var oldFunc = Log.errorLog;
            var $target = $('<div>testDiv</div>');
            gMouseEvents.setMouseDownTarget($target);
            var info = null;
            Log.errorLog = function(arg1, arg2, arg3, arg4) {
                info = arg4;
            },
            window.onerror("test");
            expect(info).to.be.an("object");
            expect(info.error).to.be.equal("test");
            expect(info.lastMouseDown).not.to.be.null;
            // clear up
            Log.errorLog = oldFunc;
        });
    });

    describe("Public API Test", function() {
        it("xcManager.isInSetup should work", function() {
            $("body").addClass("xc-setup");
            expect(xcManager.isInSetup()).to.be.true;
            $("body").removeClass("xc-setup");
            expect(xcManager.isInSetup()).to.be.false;
        });

        it("xcManager.getStatus should work", function() {
            expect(xcManager.getStatus()).to.equal("Success");
        });

        it("xcManager.isStatusFail should work", function() {
            expect(xcManager.isStatusFail()).to.be.false;
        });

        it("xcManager.removeUnloadPrompt should work", function() {
            var beforunload = window.onbeforeunload;
            var unload = window.onunload;

            xcManager.removeUnloadPrompt();
            expect(window.onbeforeunload).not.to.equal(beforunload);
            expect(window.onunload).not.to.equal(unload);

            window.onbeforeunload = beforunload;
            window.onunload = unload;
        });

        it("xcManager.unload should work in async case", function(done) {
            xcManager.unload(true)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                done();
            });
        });

        it("xcManager.unload should work in sync case", function(done) {
            xcManager.__testOnly__.fakeLogoutRedirect();

            var oldRelease =  XcUser.CurrentUser.releaseSession;
            var oldRemove = xcManager.removeUnloadPrompt;
            var test3, test4;
            XcUser.CurrentUser.releaseSession = function() {
                test3 = true;
                return PromiseHelper.resolve();
            };
            xcManager.removeUnloadPrompt = function() { test4 = true; };

            xcManager.unload(false, false);

            UnitTest.testFinish(function() {
                return test4 === true;
            })
            .then(function() {
                expect(test3).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcUser.CurrentUser.releaseSession = oldRelease;
                xcManager.removeUnloadPrompt = oldRemove;
                xcManager.__testOnly__.resetLogoutRedirect();
                Alert.forceClose();
            });
        });

        it("xcManager.forceLogout should work", function() {
            xcManager.__testOnly__.fakeLogoutRedirect();
            var oldFunc = xcManager.removeUnloadPrompt;
            var test = false;
            xcManager.removeUnloadPrompt = function() { test = true; };

            xcManager.forceLogout();
            expect(test).to.be.true;

            // clear up
            xcManager.removeUnloadPrompt = oldFunc;
            xcManager.__testOnly__.resetLogoutRedirect();
        });
    });

    describe("Global Keydown Event Test", function() {
        var key, flag;
        var oldTableScroll;

        before(function() {
            oldTableScroll = TblFunc.scrollTable;
            TblFunc.scrollTable = function(_id, arg1, arg2) {
                key = arg1;
                flag = arg2;
                return true;
            };
        });

        beforeEach(function() {
            key = flag = null;
        });

        it("should trigger page up", function() {
            var e = {type: "keydown", which: keyCode.PageUp};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.true;
        });

        it("should trigger space", function() {
            var e = {type: "keydown", which: keyCode.Space};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.false;
        });

        it("should trigger page down", function() {
            var e = {type: "keydown", which: keyCode.PageDown};
            $(document).trigger(e);
            expect(key).to.equal("pageUpdown");
            expect(flag).to.be.false;
        });

        it("should trigger up", function() {
            var e = {type: "keydown", which: keyCode.Up};
            $(document).trigger(e);
            expect(key).to.equal("updown");
            expect(flag).to.be.true;
        });

        it("should trigger down", function() {
            var e = {type: "keydown", which: keyCode.Down};
            $(document).trigger(e);
            expect(key).to.equal("updown");
            expect(flag).to.be.false;
        });

        it("should trigger home", function() {
            var e = {type: "keydown", which: keyCode.Home};
            $(document).trigger(e);
            expect(key).to.equal("homeEnd");
            expect(flag).to.be.true;
        });

        it("should trigger home", function() {
            var e = {type: "keydown", which: keyCode.End};
            $(document).trigger(e);
            expect(key).to.equal("homeEnd");
            expect(flag).to.be.false;
        });

        after(function() {
            TblFunc.scrollTable = oldTableScroll;
        });
    });

    describe("Mouse Wheel Reimplement Test", function() {
        var reImplementMouseWheel;
        var $e;

        before(function() {
            reImplementMouseWheel = xcManager.__testOnly__.reImplementMouseWheel;
            var text = "a".repeat(50);
            $e = $('<div id="test">' + text + '</div>');
            $e.css({
                "width": "10px",
                "height": "10px",
                "white-space": "nowrap",
                "overflow": "scroll"
            }).prependTo($("#container"));
        });

        afterEach(function() {
            $e.scrollLeft(0);
            $e.scrollTop(0);
        });

        it("should scroll left and top", function() {
            var e = {
                "originalEvent": {
                    "wheelDeltaX": -10,
                    "wheelDeltaY": -5
                },
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(10);
            expect($e.scrollTop()).to.equal(5);
        });

        // it("should scroll left and top test 2", function() {
        //     $e.scrollLeft(10);
        //     $e.scrollTop(10);

        //     var e = {
        //         "originalEvent": {
        //             "wheelDeltaX": "test",
        //             "wheelDeltaY": "test"
        //         },
        //         "deltaX": -5,
        //         "deltaY": 3,
        //         "target": $e.get(0)
        //     };
        //     reImplementMouseWheel(e);
        //     expect($e.scrollLeft()).to.equal(5);
        //     expect($e.scrollTop()).to.equal(7);
        // });

        it("should scroll when is dataTable", function() {
            $e.addClass("dataTable");
            var e = {
                "originalEvent": {
                    "wheelDeltaX": -10,
                    "wheelDeltaY": -5
                },
                "target": $e.get(0)
            };
            reImplementMouseWheel(e);
            expect($e.scrollLeft()).to.equal(0);
            expect($e.scrollTop()).to.equal(0);
        });

        // it("should scroll when is dataTable test 2", function() {
        //     $e.addClass("dataTable");
        //     var e = {
        //         "originalEvent": {
        //             "wheelDeltaX": -10,
        //             "wheelDeltaY": -20
        //         },
        //         "target": $e.get(0)
        //     };
        //     reImplementMouseWheel(e);
        //     expect($e.scrollLeft()).to.equal(0);
        //     expect($e.scrollTop()).to.equal(9);
        // });

        after(function() {
            $e.remove();
        });
    });

    describe.skip("oneTimeSetup Test", function() {
        var oldAlert;
        var alertFuncs;
        var hasAlert;
        var oldKeyLookup;
        var oldKeyPut;
        var oldInitLock;
        var oldTryLock;
        var oldUnLock;
        var oneTimeSetup;
        var keyMap = {};

        before(function() {
            oldAlert = Alert.show;
            oldKeyLookup = XcalarKeyLookup;
            oldKeyPut = XcalarKeyPut;
            oldInitLock = Concurrency.prototype.initLock;
            oldTryLock = Concurrency.prototype.tryLock;
            oldUnLock = Concurrency.prototype.unlock;
            oneTimeSetup = xcManager.__testOnly__.oneTimeSetup;
            UnitTest.onMinMode();
            XcSupport.stopHeartbeatCheck();

            Alert.show = function(options) {
                options = options || {};
                hasAlert = true;
                if (options.buttons) {
                    alertFuncs = options.buttons;
                }
            };

            XcalarKeyPut = function(key, value) {
                keyMap[key] = value;
                return PromiseHelper.resolve();
            };

            Concurrency.prototype.initLock = function() {
                return PromiseHelper.resolve();
            };

            Concurrency.prototype.tryLock = function() {
                return PromiseHelper.resolve("testLockStr");
            };

            Concurrency.prototype.unlock = function() {
                return PromiseHelper.resolve();
            };
        });

        beforeEach(function() {
            hasAlert = false;
            alertFuncs = null;
            keyMap = {}; // reset
        });

        it("should resolve if already initialized", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.resolve({
                    "value": InitFlagState.AlreadyInit
                });
            };

            oneTimeSetup()
            .then(function() {
                // nothing happened
                expect(Object.keys(keyMap).length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should still resolve in fail case", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.reject("test");
            };

            oneTimeSetup()
            .then(function() {
                // nothing happened
                expect(Object.keys(keyMap).length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should go through normal setup case", function(done) {
            XcalarKeyLookup = function() {
                return PromiseHelper.resolve();
            };

            oneTimeSetup()
            .then(function() {
                expect(Object.keys(keyMap).length).to.equal(1);
                expect(keyMap[GlobalKVKeys.InitFlag])
                .to.equal(InitFlagState.AlreadyInit);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should force unlock", function(done) {
            var curTryLock = Concurrency.prototype.tryLock;
            Concurrency.prototype.tryLock = function() {
                return PromiseHelper.reject(ConcurrencyEnum.OverLimit);
            };

            oneTimeSetup()
            .then(function() {
                expect(Object.keys(keyMap).length).to.equal(2);
                expect(keyMap[GlobalKVKeys.InitFlag])
                .to.equal(InitFlagState.AlreadyInit);
                expect(keyMap[GlobalKVKeys.XdFlag]).to.equal("0");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Concurrency.prototype.tryLock = curTryLock;
                $("#initialLoadScreen").hide();
            });
        });

        after(function() {
            XcalarKeyLookup = oldKeyLookup;
            XcalarKeyPut = oldKeyPut;
            Concurrency.prototype.initLock = oldInitLock;
            Concurrency.prototype.tryLock = oldTryLock;
            Concurrency.prototype.unlock = oldUnLock;
            Alert.show = oldAlert;

            UnitTest.offMinMode();
            XcSupport.restartHeartbeatCheck();
        });
    });
});
