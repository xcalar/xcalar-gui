describe('ExpServer Service Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var support = require(__dirname + '/../../expServer/utils/expServerSupport.js').default;
    var service = require(__dirname + '/../../expServer/route/service.js');
    var serviceManager = require(__dirname +
            '/../../expServer/controllers/serviceManager.js').default;
    var cloudManager = require(__dirname + "/../../expServer/controllers/cloudManager.js").default;
    var userActivityManager = require(__dirname + "/../../expServer/controllers/userActivityManager.js").default;

    var oldMasterExec;
    var oldSlaveExec;
    var oldRemoveSession;
    var oldRemoveSHM;
    var oldGetLic;
    var oldSubTicket;
    var oldGetMatch;
    var oldCheckAuth;
    var oldCheckAuthAdmin;
    var oldDisableUserActivity;
    var oldEnableUserActivity;
    var oldStopCluster;
    var oldUpdateLogoutInterval;
    this.timeout(10000);

    // Test begins
    before(function() {
        testStr = "test";
        fakeFunc = function() {
            return jQuery.Deferred().resolve({status: 200}).promise();
        }
        fakeCheck = function(req, res, next) {
            next();
        }
        oldMasterExec = support.masterExecuteAction;
        oldSlaveExec = support.slaveExecuteAction;
        oldRemoveSession = support.removeSessionFiles;
        oldRemoveSHM = support.removeSHM;
        oldGetLic = support.getLicense;
        oldSubTicket = support.submitTicket;
        oldGetMatch = support.getMatchedHosts;
        oldGetTickets = support.getTickets;
        oldGetPatch = support.getHotPatch;
        oldSetPatch = support.setHotPatch;
        oldCheckAuth = support.checkAuthImpl;
        oldCheckAuthAdmin = support.checkAuthAdminImpl;
        oldDisableUserActivity = userActivityManager.disableIdleCheck;
        oldEnableUserActivity = userActivityManager.enableIdleCheck;
        oldStopCluster = cloudManager.stopCluster;
        oldUpdateLogoutInterval = userActivityManager.updateLogoutInterval;

        support.masterExecuteAction = fakeFunc;
        support.slaveExecuteAction = fakeFunc;
        support.removeSessionFiles = fakeFunc;
        support.removeSHM = fakeFunc;
        support.getLicense = fakeFunc;
        support.submitTicket = fakeFunc;
        support.getMatchedHosts = fakeFunc;
        support.getTickets = fakeFunc;
        support.getHotPatch = fakeFunc;
        support.setHotPatch = fakeFunc;
        support.checkAuthImpl = fakeCheck;
        support.checkAuthAdminImpl = fakeCheck;
        userActivityManager.disableIdleCheck = fakeFunc;
        userActivityManager.enableIdleCheck = fakeFunc;
        cloudManager.stopCluster = fakeFunc;
        userActivityManager.updateLogoutInterval = fakeFunc;
    });

    after(function() {
        support.masterExecuteAction = oldMasterExec;
        support.slaveExecuteAction = oldSlaveExec;
        support.removeSessionFiles = oldRemoveSHM;
        support.removeSHM = oldRemoveSHM;
        support.getLicense = oldGetLic;
        support.submitTicket = oldSubTicket;
        support.getMatchedHosts = oldGetMatch;
        support.getTickets = oldGetTickets;
        support.getHotPatch = oldGetPatch;
        support.setHotPatch = oldSetPatch;
        support.checkAuthImpl = oldCheckAuth;
        support.checkAuthAdminImpl = oldCheckAuthAdmin;
        userActivityManager.disableIdleCheck = oldDisableUserActivity;
        userActivityManager.enableIdleCheck = oldEnableUserActivity;
        cloudManager.stopCluster = oldStopCluster;
        userActivityManager.updateLogoutInterval = oldUpdateLogoutInterval;
    });

    it("service.convertToBase64 should work", function() {
        expect(serviceManager.convertToBase64(testStr)).to
            .equal(Buffer.from(testStr).toString("base64"));
    });

    it('Start router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/start'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Stop router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/stop'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(JSON.parse(res.body).status)).to.equal(200);
            done();
        });
    });

    it('Restart router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/restart'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(JSON.parse(res.body).status)).to.equal(200);
            done();
        });
    });

    it('Status router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/status'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Start Slave router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/start/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Stop Slave router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/stop/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Slave Status router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/status/slave'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Remove Session Files router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/sessionFiles'
        }
        request.delete(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Remove SHM Files router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/SHMFiles'
        }
        request.delete(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get License router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/license'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('File ticket router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/ticket'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Logs router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/logs'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Slave Logs router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/logs/slave'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Matched Host router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/matchedHosts'
        }
        request.get(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Generate Support Bundle router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/bundle'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Generate Slave Support Bundle router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/bundle/slave'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Get Ticket router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/gettickets'
        }
        request.post(data, function (err, res, body){
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Find Hot Patch router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/hotPatch'
        }
        request.get(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });

    it('Set Hot Patch router should work', function(done) {
        var data = {
            url: 'http://localhost:12224/service/hotPatch'
        }
        request.post(data, function (err, res, body){
            console.log("res is:" + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });


    it("disable idle check should work", function(done) {
        var data = {
            url: 'http://localhost:12224/service/disableIdleCheck'
        };
        request.post(data, function (err, res, body){
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it("enable idle check should work", function(done) {
        var data = {
            url: 'http://localhost:12224/service/enableIdleCheck'
        };
        request.post(data, function (err, res, body){
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it("updateLogoutInterval should work", function(done) {
        var data = {
            url: 'http://localhost:12224/service/updateLogoutInterval',
        };
        request.post(data, function (err, res, body){
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it("update stop cloud should work", function(done) {
        var data = {
            url: 'http://localhost:12224/service/stopCloud'
        };
        request.post(data, function (err, res, body){
            expect(res.statusCode).to.equal(200);
            done();
        });
    });
    it("get credits should work", function(done) {
        var data = {
            url: 'http://localhost:12224/service/getCredits'
        };
        request.get(data, function (err, res, body){
            expect(res.statusCode).to.equal(200);
            done();
        });
    });
});
