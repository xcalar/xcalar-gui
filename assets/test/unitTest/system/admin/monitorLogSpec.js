describe("MonitorLog Test", function() {
    let $card;
    let monitorLogCard;
    let retHosts;
    let recentLog;
    let monitorLog;
    let unknowError;

    before(function() {
        let id = xcHelper.randName("test");
        $card = $("#systemLogCard").clone();
        $card.attr("id", id);
        $("#container").append($card);
        monitorLogCard = new SystemLog(id);
        monitorLogCard._clearAll();

        retHosts = {
            matchHosts: ["testHost1", "testHost2", "testHost3"],
            matchNodeIds: ["0", "1", "2"]
        };

        recentLog = {
            results: {
                testHost1: {
                    status: 200,
                    logs: "success"
                }
            }
        };
        monitorLog = {
            results: {
                testHost1: {
                    status: 200,
                    logs: "success"
                },
                testHost2: {
                    status: 500,
                    error: "error"
                },
                testHost3: {}
            }
        };
        unknowError = {logs: "unknown error"};
    });

    it("should be the correct instance", function() {
        expect(monitorLogCard).to.be.an.instanceof(SystemLog);
    });

    it("adjustTabNumber should work", function() {
        let oldFunc = monitorLogCard._tabAreaPositionCheck;
        monitorLogCard._tabAreaPositionCheck = () => {
            return {canLeft: false};
        };

        let $tab = $('<div class="tab"></div>');
        $card.append($tab);
        $card.find(".leftEnd").removeClass("xc-disabled");
        monitorLogCard.adjustTabNumber();
        expect($card.find(".leftEnd").hasClass("xc-disabled")).to.be.true;

        monitorLogCard._tabAreaPositionCheck = oldFunc;
        $tab.remove();
    });

    it("_addTabs should work", function() {
        monitorLogCard._clearAll();
        expect($card.find(".tab").length).to.equal(0);

        monitorLogCard._hosts = {"test1": 1, "test0": 0}
        monitorLogCard._addTabs();
        expect($card.find(".tab").length).to.equal(2);

        monitorLogCard._clearAll();
    });

    it("_closeTab should work", function() {
        monitorLogCard._hosts = {"test1": 1, "test0": 0}
        monitorLogCard._addTabs();

        monitorLogCard._closeTab($card.find(".tab").eq(0));
        expect($card.find(".tab").length).to.equal(1);

        monitorLogCard._clearAll();
    });

    it("_clearLogs should work", function() {
        monitorLogCard._logs["test"] = "test";
        monitorLogCard._clearLogs();
        expect(monitorLogCard._logs["test"]).to.equal("");
    });

    it("_getHost should work", function(done) {
        let oldFunc = adminTools.getMatchHosts;
        adminTools.getMatchHosts = function() {
            return PromiseHelper.resolve({
                matchHosts: ["testHost"],
                matchNodeIds: [0]
            });
        };
        monitorLogCard._getHost()
        .then(function() {
            expect(monitorLogCard._hosts).to.have.property("testHost");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            monitorLogCard._hosts = {};
            adminTools.getMatchHosts = oldFunc;
        });
    });

    it("_getHost should reject non host case", function(done) {
        let oldFunc = adminTools.getMatchHosts;
        adminTools.getMatchHosts = function() {
            return PromiseHelper.resolve({
                matchHosts: [],
                matchNodeIds: []
            });
        };
        monitorLogCard._getHost()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.logs).to.equal(MonitorTStr.GetHostsFail);
            done();
        })
        .always(function() {
            monitorLogCard._hosts = {};
            adminTools.getMatchHosts = oldFunc;
        });
    });

    it("_getHost should handle fail case", function(done) {
        let oldFunc = adminTools.getMatchHosts;
        adminTools.getMatchHosts = function() {
            return PromiseHelper.reject("test");
        };
        monitorLogCard._hosts = {"test": {}};
        monitorLogCard._getHost()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(monitorLogCard._hosts).to.be.empty;
            expect(error).to.equal("test");
            done();
        })
        .always(function() {
            monitorLogCard._hosts = {};
            adminTools.getMatchHosts = oldFunc;
        });
    });

    it("_validate should work", function() {
        let $inputSection = monitorLogCard._getInputSection();
        let $fileName = $inputSection.find(".logName .dropDownList .text");
        let $lastNRow = $inputSection.find(".numLogs .xc-input");
        // case 1
        $fileName.text("");
        $fileName.data("option", "");
        let res = monitorLogCard._validate();
        expect(res).to.equal(null);
        // case 2
        $fileName.text("node");
        $fileName.data("option", "node");
        $lastNRow.val("");
        res = monitorLogCard._validate();
        expect(res).to.equal(null);
        // case 3
        $lastNRow.val("-1");
        res = monitorLogCard._validate();
        expect(res).to.equal(null);
        // case 4
        $lastNRow.val("502");
        res = monitorLogCard._validate();
        expect(res).to.equal(null);
        // case 5
        $lastNRow.val("100");

        res = monitorLogCard._validate();
        expect(res).to.deep.equal({
            lastNRow: 100,
            fileName: "node.*.log"
        });

        $fileName.text("");
        $fileName.data("option", "");
        $lastNRow.val("");
        StatusBox.forceHide();
    });

    it("_flushLog should work", function(done) {
        let oldFunc = XcalarLogLevelSet;
        let called = false;
        XcalarLogLevelSet = () => {
            called = true;
            return PromiseHelper.resolve();
        };
        monitorLogCard._flushLog()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarLogLevelSet = oldFunc;
        });
    });

    describe("_getRecentLogs test", function() {
        let oldFlush;
        let oldGetHost;
        let oldGetLogs;
        let oldValidate;

        before(function() {
            oldFlush = monitorLogCard._flushLog;
            oldGetHost = monitorLogCard._getHost;
            oldValidate = monitorLogCard._validate;
            oldGetLogs = adminTools.getRecentLogs;

            monitorLogCard._flushLog =
            monitorLogCard._getHost = () => PromiseHelper.resolve();
            monitorLogCard._hosts = {"testHost1": 0}
        });

        it("should reject invalid case", function(done) {
            monitorLogCard._validate = () => null;
            monitorLogCard._getRecentLogs()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                done();
            });
        });

        it("_getRecentLogs should work", function(done) {
            monitorLogCard._validate = () => {
                return {};
            };

            adminTools.getRecentLogs = function() {
                return PromiseHelper.resolve(recentLog);
            };

            let oldFunc = xcUIHelper.showSuccess;
            let called = false;
            xcUIHelper.showSuccess = () => { called = true; };
            monitorLogCard._getRecentLogs()
            .then(function() {
                expect(called).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcUIHelper.showSuccess = oldFunc;
            });
        });

        it("_getRecentLogs should fail but show logs is has", function(done) {
            monitorLogCard._validate = () => {
                return {};
            };

            adminTools.getRecentLogs = function() {
                return PromiseHelper.reject({
                    results: {}
                });
            };

            let oldFunc = xcUIHelper.showSuccess;
            let called = false;
            xcUIHelper.showSuccess = () => { called = true; };
            monitorLogCard._getRecentLogs()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.be.true;
                done();
            })
            .always(function() {
                xcUIHelper.showSuccess = oldFunc;
            });
        });

        it("_getRecentLogs should fail in error case", function(done) {
            monitorLogCard._validate = () => {
                return {};
            };

            adminTools.getRecentLogs = function() {
                return PromiseHelper.reject(unknowError);
            };

            let oldFunc = Alert.error;
            let called = false;
            Alert.error = () => { called = true; };
            monitorLogCard._getRecentLogs()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.be.true;
                done();
            })
            .always(function() {
                Alert.error = oldFunc;
            });
        });

        after(function() {
            monitorLogCard._flushLog = oldFlush;
            monitorLogCard._getHost = oldGetHost;
            monitorLogCard._validate = oldValidate;
            adminTools.getRecentLogs = oldGetLogs;

            monitorLogCard._clearAll();
        });
    });

    describe("_startMonitorLog test", function() {
        let oldFlush;
        let oldGetHost;
        let oldValidate;
        let oldMonitorLogs;

        before(function() {
            oldFlush = monitorLogCard._flushLog;
            oldGetHost = monitorLogCard._getHost;
            oldValidate = monitorLogCard._validateFileName;
            oldMonitorLogs = adminTools.monitorLogs;

            monitorLogCard._flushLog =
            monitorLogCard._getHost = () => PromiseHelper.resolve();
            monitorLogCard._hosts = {"testHost1": 0}
        });

        it("should reject invalid case", function(done) {
            monitorLogCard._validateFileName = () => null;
            monitorLogCard._startMonitorLog()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                done();
            });
        });

        it("_startMonitorLog should work", function(done) {
            monitorLogCard._validateFileName = () => {
                return {};
            };

            let called = false;
            adminTools.monitorLogs = () => { called = true; };

            monitorLogCard._startMonitorLog()
            .then(function() {
                expect(called).to.be.true;
                expect(monitorLogCard._flushIntervalId).to.be.a("number");
                monitorLogCard._stopMonitorLog();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_startMonitorLog should fail", function(done) {
            monitorLogCard._validate = () => {
                return {};
            };

            let testError = {logs: "test"};
            monitorLogCard._flushLog = () => PromiseHelper.reject(testError);

            let oldFunc = Alert.error;
            let called = false;
            Alert.error = () => { called = true; };
            monitorLogCard._getRecentLogs()
            .then(function() {
                done("fail");
            })
            .fail(function(err) {
                expect(called).to.be.true;
                expect(err).to.equal(testError);
                expect(monitorLogCard._flushIntervalId).to.be.null;
                done();
            })
            .always(function() {
                Alert.error = oldFunc;
            });
        });

        after(function() {
            monitorLogCard._flushLog = oldFlush;
            monitorLogCard._getHost = oldGetHost;
            monitorLogCard._validateFileName = oldValidate;
            adminTools.monitorLogs = oldMonitorLogs;

            monitorLogCard._clearAll();
        });
    });

    it("_onMonitorError should work", function() {
        monitorLogCard._hosts = {
            "testHost1": 0,
            "testHost2": 1,
            "testHost3": 2
        };
        monitorLogCard._logs = {
            "testHost1": "",
            "testHost2": "",
            "testHost3": ""
        };
        monitorLogCard._onMonitorError(monitorLog);
        expect($card.find(".tab").length).equal(3);
        monitorLogCard._clearAll();
    });

    it("_onMonitorError should work case2", function() {
        let oldAlert = Alert.error;
        let called = false;
        Alert.error = () => { called = true; };
        monitorLogCard._onMonitorError({"logs": "test"});
        expect(called).equal(true);
        Alert.error = oldAlert;
    });

    it("_onMonitorSuccess should work", function() {
        monitorLogCard._hosts = {
            "testHost1": 0,
            "testHost2": 1,
            "testHost3": 2
        };
        monitorLogCard._logs = {
            "testHost1": "",
            "testHost2": "",
            "testHost3": ""
        };
        monitorLogCard._onMonitorSuccess(monitorLog);
        expect($card.find(".tab").length).equal(3);
        monitorLogCard._clearAll();
    });

    it("_appendResultToFocusTab should work", function() {
        monitorLogCard._hosts = {
            "testHost1": 0
        };
        monitorLogCard._logs = {
            "testHost1": ""
        };

        let $tab = $('<div class="tab focus" data-original-title="testHost1"></div>')
        $card.append($tab);
        monitorLogCard._appendResultToFocusTab(monitorLog.results);
        expect($card.find(".msgRow").length).equal(1);
        expect($card.find(".msgRow.error").length).equal(0);
        $tab.remove();
        monitorLogCard._clearAll();
    });

    it("_appendResultToFocusTab should work case 2", function() {
        monitorLogCard._hosts = {
            "testHost2": 0
        };
        monitorLogCard._logs = {
            "testHost2": ""
        };

        let $tab = $('<div class="tab focus" data-original-title="testHost2"></div>')
        $card.append($tab);
        monitorLogCard._appendResultToFocusTab(monitorLog.results);
        expect($card.find(".msgRow.error").length).equal(1);
        $tab.remove();
        monitorLogCard._clearAll();
    });

    after(function() {
        $card.remove();
    });
});