describe("UserSettings Test", function() {
    describe("Baisc User Setting API Test", function() {
        it("UserSettings.Instance.getAllPrefs should work", function() {
            var res = UserSettings.Instance.getAllPrefs();
            expect(res).to.be.instanceof(UserPref);
        });

        it("UserSettings.Instance.getPref should work", function() {
            var res = UserSettings.Instance.getPref("dfAutoExecute");
            expect(res).not.to.be.null;
        });

        it("UserSettings.Instance.setPref should work", function() {
            var oldCache = UserSettings.Instance.getPref("dfAutoExecute");
            UserSettings.Instance.setPref("dfAutoExecute", true, false);
            var res = UserSettings.Instance.getPref("dfAutoExecute");
            expect(res).to.equal(true);
            // change back
            UserSettings.Instance.setPref("dfAutoExecute", oldCache, false);

            // case 2
            oldCache = UserSettings.Instance.getPref("general");
            UserSettings.Instance.setPref("key", "test2", true);
            res = UserSettings.Instance.getPref("general");
            expect(res).to.have.property("key").and.to.equal("test2");
            UserSettings.Instance.setPref("general", oldCache);
        });
    });

    describe("UserSettings Commit Test", function() {
        var oldPut;
        var oldShowSuccess;
        var testKey;
        var successMsg;

        before(function() {
            oldPut =  KVStore.prototype.put;
            oldPutMutex =  KVStore.prototype.putWithMutex;
            oldShowSuccess = xcUIHelper.showSuccess;

            KVStore.prototype.put = function() {
                testKey = this.key;
                return PromiseHelper.resolve();
            };

            KVStore.prototype.putWithMutex = function() {
                testKey = this.key;
                return PromiseHelper.resolve();
            };

            xcUIHelper.showSuccess = function(input) {
                successMsg = input;
            };
        });

        beforeEach(function() {
            testKey = null;
            successMsg = null;
        });

        it("should commit change", function(done) {
            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = () => false;
            UserSettings.Instance.commit(true)
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gUserKey"));
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        it("should not commit again if no change", function(done) {
            UserSettings.Instance.commit(true)
            .then(function() {
                expect(testKey).to.be.null;
                expect(successMsg).to.equal(SuccessTStr.SaveSettings);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("should handle fail case", function(done) {
            var oldFunc =  KVStore.prototype.put;
            var oldFail = xcUIHelper.showFail;
            var test = null;

            KVStore.prototype.put = function() {
                return PromiseHelper.reject("test");
            };

            xcUIHelper.showFail = function(input) {
                test = input;
            };

            UserSettings.Instance.commit(true, true)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(test).to.equal(FailTStr.SaveSettings);
                expect(error).to.equal("test");
                done();
            })
            .always(function() {
                KVStore.prototype.put = oldFunc;
                xcUIHelper.showFail = oldFail;
            });
        });

        it("should commit admin settings", function(done) {
            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = () => true;

            UserSettings.Instance.commit(false, true)
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gUserKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
            });
        });

        it("should commit prefChange in Admin case", function(done) {
            let autoPreview = UserSettings.Instance.getPref("dfAutoPreview");
            UserSettings.Instance.setPref("dfAutoPreview", !autoPreview);

            var oldFunc = Admin.isAdmin;
            Admin.isAdmin = () => true;

            UserSettings.Instance.commit()
            .then(function() {
                expect(testKey).to.equal(KVStore.getKey("gSettingsKey"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                Admin.isAdmin = oldFunc;
                UserSettings.Instance.setPref("dfAutoPreview", autoPreview);
            });
        });

        after(function() {
            KVStore.prototype.put = oldPut;
            KVStore.prototype.putWithMutex = oldPutMutex;
            xcUIHelper.showSuccess = oldShowSuccess;
        });
    });

    describe("UserSettings UI Test", function() {
        it("should toggle showDataColBox", function() {
            var hideDataCol = UserSettings.Instance.getPref("hideDataCol");
            var $btn = $("#showDataColBox");
            // case 1
            $btn.click();
            expect(UserSettings.Instance.getPref("hideDataCol")).to.equal(!hideDataCol);
            // case 2
            $btn.click();
            expect(UserSettings.Instance.getPref("hideDataCol")).to.equal(hideDataCol);
        });

        it("should reveal the right value on the slider", function() {
            var $bar = $("#commitIntervalSlider").find(".ui-resizable-e").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX + 300, pageY: pageY});

            expect($("#commitIntervalSlider").find(".value").val()).to.equal("600");

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX - 500, pageY: pageY});

            expect($("#commitIntervalSlider").find(".value").val()).to.equal("10");

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
        });

        it("should click save button to save", function() {
            var oldFunc = UserSettings.Instance.commit;
            var test = false;
            UserSettings.Instance.commit = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            $("#userSettingsSave").click();
            expect(test).to.be.true;
            UserSettings.Instance.commit = oldFunc;
        });

        it("revert Default settings should work", function() {
            var $button = $("#showDataColBox");
            var checked = $button.hasClass("checked");
            $button.click();
            expect($button.hasClass("checked")).to.equal(!checked);
            $("#userSettingsDefault").click();

            var oldFunc = UserSettings.Instance.commit;
            UserSettings.Instance.commit = function() {
                return PromiseHelper.resolve();
            };
            expect($button.hasClass("checked")).to.equal(checked);

            UserSettings.Instance.commit = oldFunc;
        });
    });
});