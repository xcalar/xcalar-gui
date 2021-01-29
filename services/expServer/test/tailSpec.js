describe('ExpServer Tail Test', function() {
    // Test setup
    var expect = require('chai').expect;

    var tail = require(__dirname + '/../utils/tail.js');
    var testFilePath;
    var testFileName;
    var testLineNum;
    var testLastMonitor;
    this.timeout(10000);
    // Test begins
    before(function() {
        testFilePath = __dirname + '/config/';
        testFileName = "node.0.out";
        testLineNum = 10;
        testLastMonitor = 1;
        tail.fakeGetNodeId();
    });

    it("isLogNumValid should work", function() {
        expect(tail.isLogNumValid(testLineNum)).to.be.true;
        expect(tail.isLogNumValid("notNum")).to.be.false;
    });
    it("readFileStat should work", function(done) {
        tail.readFileStat(testFilePath + testFileName)
        .then(function(ret) {
            expect(ret.stat).to.exist;
            done();
        })
        .fail(function() {
            done("fail");
        })
    });
    it("readFileStat should fail when error, e.g. invalid file path", function(done) {
        tail.readFileStat("invalid Path")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500)
            done();
        })
    });
    it("getFileName should work", function(done) {
        var out = "node.*.out";
        var err = "node.*.err";
        var log = "node.*.log";
        tail.getFileName(out)
        .then(function(ret) {
            expect(ret).to.include("out");
            return tail.getFileName(err);
        })
        .then(function(ret) {
            expect(ret).to.include("err");
            return tail.getFileName(log);
        })
        .then(function(ret) {
            expect(ret).to.include("log");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("getPath should work", function(done) {
        tail.getPath(testFilePath, testFileName)
        .then(function(ret) {
            expect(ret.stat).to.exist;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("getCurrentTime should work", function() {
        expect(tail.getCurrentTime()).to.match(/^"\d{4}\-/);
    });
    it("tailLog should work", function(done) {
        tail.tailLog(testLineNum, testFilePath, testFileName)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("tailLog should fail when error, e.g. invalid line number", function(done) {
        tail.tailLog("invalidNum", testFilePath,testFileName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(400);
            done();
        });
    });
    it("sinceLastMonitorLog should work", function(done) {
        tail.sinceLastMonitorLog(testLastMonitor, testFilePath, testFileName)
        .then(function(ret) {
            expect(ret.lastMonitor).to.not.be.empty;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("tailLog should fail when error, e.g. fail to open log file", function(done) {
        tail.fakeGetPath();
        tail.tailLog(testLastMonitor, testFilePath, testFileName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });
    it("sinceLastMonitorLog should fail when error, e.g. fail to open log file", function(done) {
        tail.sinceLastMonitorLog(testLastMonitor, testFilePath, testFileName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(403);
            done();
        });
    });
    it("monitorLog should work", function(done) {
        tail.fakeTailLog();
        tail.fakeSinceLastMonitorLog();
        tail.monitorLog(testLastMonitor, testFilePath, testFileName)
        .then(function(ret) {
            expect(ret).to.equal("success");
            return tail.monitorLog(-1, testFilePath, testFileName);
        })
        .then(function(ret) {
            expect(ret).to.equal("success");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
    it("getNodeId should work", function(done) {
        tail.getNodeId()
        .always(function() {
            // It is a command that depends on the machine it is running on
            // So either resolve or reject should work
            done();
        });
    });
});