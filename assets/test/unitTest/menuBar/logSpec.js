describe("Xcalar Log Test", function() {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("Basic Function Test", function() {
        it("isBackendOperation should work", function() {
            var isBackendOperation = Log.__testOnly__.isBackendOperation;

            var testCases = [{
                "operation": SQLOps.DestroyDS,
                "expect": true
            },{
                "operation": "Invalid operation",
                "expect": null
            }];

            testCases.forEach(function(test) {
                var args = {
                    "options": {
                        "operation": test.operation
                    }
                };
                var log = new XcLog(args);
                var res = isBackendOperation(log);
                expect(res).to.equal(test.expect);
            });
        });

        it("getUndoType should work", function() {
            var getUndoType = Log.__testOnly__.getUndoType;
            var UndoType = Log.__testOnly__.UndoType;
            var testCases = [{
                "operation": null,
                "expect": UndoType.Invalid
            },{
                "operation": SQLOps.RemoveDagTab,
                "expect": UndoType.Invalid
            },{
                "operation": SQLOps.PreviewDS,
                "expect": UndoType.Skip
            }];

            testCases.forEach(function(test) {
                var args = {
                    "options": {
                        "operation": test.operation
                    }
                };
                var xcLog = new XcLog(args);
                var res = getUndoType(xcLog);
                expect(res).to.equal(test.expect);
            });
        });
    });

    describe("Public API Test", function() {
        it("Log.getCursor should work", function() {
            var res = Log.getCursor();
            expect(typeof res).to.equal("number");
        });

        it("Log.getLogs should work", function() {
            var res = Log.getLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("Log.getErrorLogs should work", function() {
            var res = Log.getErrorLogs();
            expect(res instanceof Array).to.be.true;
        });

        it("Log.getAllLogs should work", function() {
            var res = Log.getAllLogs();
            expect(res).to.an("object");
            expect(res.logs).to.equal(Log.getLogs());
            expect(res.errors).to.equal(Log.getErrorLogs());
        });

        it("Log.getLocalStorage should work", function() {
            var cachedLog = Log.getLocalStorage();
            expect(cachedLog == null || typeof cachedLog === "string");
        });

        it("should backup log", function() {
            Log.backup();
            var cachedLog = Log.getBackup();
            expect(cachedLog).not.to.be.null;
            expect(typeof cachedLog === "string");
        });
    });

    describe("Clean, Add, Restore Log Test", function() {
        before(function() {
            // should not have any auto commit during test
            XcSupport.stopHeartbeatCheck();
        });

        it("Log.add should work", function() {
            var logs = Log.getLogs();
            var len = logs.length;
            // error case
            Log.add("test", {}, "testCli", true);
            expect(logs.length - len).to.equal(0);

        });

        it("Log.errorLog should work", function() {
            var errors = Log.getErrorLogs();
            var len = errors.length;

            Log.errorLog("test", null, "testCli", "testError");
            expect(errors.length - len).to.equal(1);
        });

        after(function() {
            XcSupport.restartHeartbeatCheck();
        });
    });

    describe("Undo Redo Api Test", function() {
        var oldUndo;
        var oldRedo;

        before(function() {
            oldUndo = Undo.run;
            oldRedo = Redo.run;

            Undo.run = function() {
                return PromiseHelper.resolve();
            };

            Redo.run = function() {
                return PromiseHelper.resolve();
            };

            XcSupport.stopHeartbeatCheck();
            Log.add("test", {"operation": SQLOps.MinimizeCols}, "testCli", true);
        });

        it("should click to trigger undo", function() {
            var curUndo = Log.undo;
            var oldGetDag = DagViewManager.Instance.getActiveDag;
            var $undo = $("#undo");
            var isDisabled = $undo.hasClass("unavailable");
            var isLocked = $undo.hasClass("locked");
            var called = 0;

            Log.undo = function() {
                called++;
            };

            DagViewManager.Instance.getActiveDag = function() {
                called++;
                return new DagGraph();
            };

            $undo.addClass("unavailable");
            $undo.click();
            expect(called).to.equal(0);
            // case 2
            $undo.removeClass("unavailable");
            $undo.removeClass("locked");
            $undo.click();
            expect(called).to.equal(2);

            if (isDisabled) {
                $undo.addClass("unavailable");
            }
            if (isLocked) {
                $undo.addClass("locked");
            }
            Log.undo = curUndo;
            DagViewManager.Instance.getActiveDag = oldGetDag;
        });

        it("should click to trigger redo", function() {
            var curRedo = Log.redo;
            var $redo = $("#redo");
            var isDisabled = $redo.hasClass("unavailable");
            var called = 0;
            var oldGetDag = DagViewManager.Instance.getActiveDag;

            Log.redo = function() {
                called++;
            };

            DagViewManager.Instance.getActiveDag = function() {
                called++;
                return new DagGraph();
            };

            $redo.addClass("unavailable");
            $redo.click();
            expect(called).to.equal(0);
            // case 2
            $redo.removeClass("unavailable");
            $redo.click();
            expect(called).to.equal(2);

            if (isDisabled) {
                $redo.addClass("unavailable");
            }

            Log.redo = curRedo;
            DagViewManager.Instance.getActiveDag = oldGetDag;
        });

        it("Should lock and unlock undo redo", function() {
            var $undo = $("#undo");
            var $redo = $("#redo");
            Log.lockUndoRedo();
            expect($undo.hasClass("unavailable")).to.be.true;
            Log.unlockUndoRedo();
            expect($redo.hasClass("unavailable")).to.be.true;
        });

        it("Should not undo in error case", function(done) {
            Undo.run = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            Log.undo()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                expect(error.error).to.equal("test");
                done();
            });
        });

        it("Should undo in normal case", function(done) {
            Undo.run = function() {
                return PromiseHelper.resolve();
            };

            var cursor = Log.getCursor();
            Log.undo()
            .then(function() {
                expect(Log.getCursor()).to.equal(cursor - 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not redo in error case", function(done) {
            Redo.run = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            Log.redo()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.null;
                expect(error.error).to.equal("test");
                done();
            });
        });

        it("Should redo in normal case", function(done) {
            Redo.run = function() {
                return PromiseHelper.resolve();
            };

            var cursor = Log.getCursor();
            Log.redo()
            .then(function() {
                expect(Log.getCursor()).to.equal(cursor + 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            xcTooltip.hideAll();
            Undo.run = oldUndo;
            Redo.run = oldRedo;
            XcSupport.restartHeartbeatCheck();
        });
    });
});