describe("ExpServer Socket Test", function() {
    var io = require(__dirname + '/../node_modules/socket.io-client');
    var options = {
        transports: ['websocket'],
        'force new connection': true
    }
    var expect = require('chai').expect;
    require(__dirname + '/../expServer.js');
    this.timeout(10000);
    var client;
    var peerClient;
    var testUserOption;
    var testDF;
    var testAlertOpts;
    var testRefreshUDFOption;
    var testRefreshDagCategory;

    before(function(done) {
        testUserOption = {
            user: "testUser",
            id: "testId"
        };
        testDF = "testDF";
        testRefreshUDFOption = {
            isUpdate: true,
            isDelete: true
        };
        testAlertOpts = {};
        testWkbk = "testWkbk";
        testIMD = "testIMD";
        testRefreshDagCategory = 'testRefreshDagCategory';
        client = io('http://localhost:12224', options);
        client.on("connect", function() {
            peerClient = io('http://localhost:12224', options);
            peerClient.on("connect", function() {
                done();
            });
        });
    });


    it("socket should handle registerUser", function(done) {
        var expectedRes = {
            testUser: {
                count: 1,
                workbooks: {}
            }
        }
        var first = true;
        client.emit("registerBrowserSession", testUserOption.user, function() {});
        client.emit("registerUserSession", testUserOption, function() {});
        client.on("system-allUsers", function(users) {
            if (first) {
                expect(users).to.deep.equal(expectedRes);
                first = false;
                peerClient.emit("registerBrowserSession", testUserOption.user, function() {});
                peerClient.emit("registerUserSession", testUserOption, function() {});
            } else {
                expectedRes.testUser.count += 1;
                expectedRes.testUser.workbooks.testId = 1;
                expect(users).to.deep.equal(expectedRes);
                done();
            }
        });
    });

    it("socket should checkUserSession", function(done) {
        client.emit("checkUserSession", testUserOption, function() {
            done();
        });
    });

    it("socket should unregisterUserSession", function(done) {
        client.emit("unregisterUserSession", testUserOption, function() {
            done();
        })
    });

    it("socket should handle refreshUDF", function(done) {
        client.emit("refreshUDF", testRefreshUDFOption);
        peerClient.on("refreshUDF", function(refreshOption) {
            expect(JSON.stringify(refreshOption))
            .to.equal(JSON.stringify(testRefreshUDFOption));
            done();
        });
    });

    it("socket should handle adminAlert", function(done) {
        client.emit("adminAlert", testAlertOpts);
        peerClient.on("adminAlert", function(alertOptions) {
            expect(alertOptions).to.be.empty;
            done();
        });
    });

    it("socket should handle refreshWorkbook", function(done) {
        client.emit("refreshWorkbook", testWkbk);
        peerClient.on("refreshWorkbook", function(res) {
            expect(res).to.equal(testWkbk);
            done();
        });
    });

    it("socket should handle refreshUserSettings", function(done) {
        client.emit("refreshUserSettings");
        peerClient.on("refreshUserSettings", function() {
            done();
        });
    });

    it("socket should handle refreshIMD", function(done) {
        client.emit("refreshIMD", testIMD);
        peerClient.on("refreshIMD", function(res) {
            expect(res).to.equal(testIMD);
            done();
        });
    });

    it("socket should handle refreshDagCategory", function(done) {
        client.emit('refreshDagCategory', testRefreshDagCategory);
        peerClient.on('refreshDagCategory', function(res) {
            expect(res).to.equal(testRefreshDagCategory);
            done();
        });
    });

    it("socket should disconnect", function(done) {
        var expectedRes = {
            testUser: {
                count: 1,
                workbooks: {}
            }
        }
        client.disconnect();
        expect(client.connected).to.equal(false);
        peerClient.on("system-allUsers", function(users) {
            expect(users).to.deep.equal(expectedRes);
            done();
        });
    });

});
