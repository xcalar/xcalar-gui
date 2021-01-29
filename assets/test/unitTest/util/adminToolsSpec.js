describe("adminTools Test", function() {
    describe("adminTools Send Request Test", function() {
        it("prePraseSendData should work", function() {
            var prePraseSendData = adminTools.__testOnly__.prePraseSendData;
            var res = prePraseSendData("GET");
            expect(res).to.be.an("object");

            // case 2
            res = prePraseSendData("PUT", "test");
            expect(res).to.be.a("string");
            expect(res).contains("test");
        });

        it("parseSuccessData should work", function() {
            var parseSuccessData = adminTools.__testOnly__.parseSuccessData;
            var res = parseSuccessData("test");
            expect(res).to.equal("test");
            // case 2
            res = parseSuccessData({
                "logs": btoa("test")
            });
            expect(res).to.be.an("object");
            expect(res.logs).to.equal("test");
        });

        it("parseErrorData should work", function() {
            var parseErrorData = adminTools.__testOnly__.parseErrorData;
            var res = parseErrorData({
                "status": 1,
                "statusText": "test"
            });

            expect(res).to.be.an("object");
            expect(res.status).to.equal(1);
            expect(res.logs).to.equal("test");
            expect(res.unexpectedError).to.be.true;

            // case 2
            res = parseErrorData({
                "responseJSON": {
                    "logs": btoa("test")
                }
            });

            expect(res).to.be.an("object");
            expect(res.logs).to.equal("test");
        });
    });

    describe("adminTools API Test", function() {
        it("adminTools.getRecentLogs should work", function(done) {
            adminTools.__testOnly__.setSendRequest();

            adminTools.getRecentLogs(10, "path", "file", {"hostA": true})
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(res.requireLineNum).to.equal(10);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should get monitor log", function(done) {
            var ret = {"updatedLastMonitorMap": "test"};
            adminTools.__testOnly__.setSendRequest(ret);
            var lasMonitorMap = adminTools.__testOnly__.getMonitorMap();
            // clean first
            adminTools.stopMonitorLogs();
            expect(lasMonitorMap.size === 0).to.be.true;

            var checkFunc = function() {
                var map = adminTools.__testOnly__.getMonitorMap();
                return map.size > 0;
            };

            var test = false;
            var successCallback = function() {
                test = true;
            };

            adminTools.monitorLogs("testPath", "testFile", {"hostA": true},
                                        null, successCallback);

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect(test).to.be.true;
                adminTools.stopMonitorLogs();
                lasMonitorMap = adminTools.__testOnly__.getMonitorMap();
                expect(lasMonitorMap.size === 0).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle fail monitor case", function(done) {
            adminTools.__testOnly__.setSendRequest({}, true);
            var lasMonitorMap = adminTools.__testOnly__.getMonitorMap();
            lasMonitorMap["test"] = "testVal";

            var checkFunc = function() {
                var map = adminTools.__testOnly__.getMonitorMap();
                return map.size === 0;
            };

            var test = false;
            var errCallback = function() {
                test = true;
            };

            adminTools.monitorLogs("testPath", "testFile", {"hostA": true},
                                        errCallback);

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect(test).to.be.true;
                lasMonitorMap = adminTools.__testOnly__.getMonitorMap();
                expect(lasMonitorMap.size === 0).to.be.true;
                adminTools.stopMonitorLogs();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.clusterStart should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.clusterStart()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.clusterStop should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.clusterStop()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.clusterRestart should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.clusterRestart()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.clusterStatus should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.clusterStatus()
            .then(function(res) {
                expect(res).to.be.an("object");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.removeSessionFiles should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.removeSessionFiles("testFile")
            .then(function(res) {
                expect(res).to.be.a("string");
                expect(res).to.contains("testFile");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.removeSHM should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.removeSHM()
            .then(function(res) {
                expect(res).to.be.a("string");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.getLicense should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.getLicense()
            .then(function(res) {
                expect(res).to.be.an("object");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("adminTools.fileTicket should work", function(done) {
            adminTools.__testOnly__.setSendRequest();
            adminTools.fileTicket("testStr")
            .then(function(res) {
                expect(res).to.be.a("string");
                expect(res).to.contains("testStr");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            adminTools.__testOnly__.resetSendRequest();
        });
    });
});