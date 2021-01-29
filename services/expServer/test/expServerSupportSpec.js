describe('ExpServer Support Test', function() {
    // Test setup
    var expect = require('chai').expect;
    require(__dirname + '/../expServer.js');

    var support = require(__dirname + '/../utils/expServerSupport.js').default;
    var path = require("path");
    var cfgDir = __dirname + '/config';
    var testHostsFile;
    var testHosts;
    var testAction;
    var testSlaveUrl;
    var testContent;
    var testEmail;
    var testResults;
    var testLogOpts;
    var defaultXcalarDir;
    var testDir;
    var oldCheckAuth;
    var oldCheckAuthAdmin;
    this.timeout(10000);

    function fakeExecuteCommand(func) {
        support.executeCommand = func;
    }
    function fakeReadHostsFromFile(func) {
        support.readHostsFromFile = func;
    }
    function fakeSendCommandToSlaves(func) {
        support.sendCommandToSlaves = func;
    }
    function fakeGetXlrRoot(func) {
        support.getXlrRoot = func;
    }

    // Test begins
    before(function() {
        testDir = __dirname;
        testHostsFile = __dirname + "/config/hosts.cfg";
        testHosts = ["testHost"];
        testAction = "GET";
        testSlaveUrl = "/service/logs/slave";
        testContent = {
            hosts: testHosts,
            isMonitoring: "true",
            requireLineNum: 10,
            lastMonitorMap: "{}"
        };
        testEmail = "test@xcalar.com";
        testResults = {
            "testHost": {
                "status": 200,
                "logs": "Success",
                "lastMonitor": true
            }
        }
        testLogOpts = {
            requireLineNum: 1,
            filePath: __dirname + "/config",
            fileName: "logs"
        }
        testPath = __dirname + "/config/logs";
        testCfg = __dirname + "/config/hosts.cfg";
        testLicense = __dirname + "/config/license.txt";

        defaultXcalarDir = process.env.XLRDIR || "/opt/xcalar";
        testStartCommand = defaultXcalarDir + "/bin/xcalarctl start";
        testStopCommand = defaultXcalarDir + "/bin/xcalarctl stop";
        testStartData = "xcmgmtd started";
        testStopData = "Stopped Xcalar";
        support._defaultHostsFile = __dirname + "/config/test.cfg";
        oldCheckAuth = support.checkAuthImpl;
        oldCheckAuthAdmin = support.checkAuthAdminImpl;
        support.checkAuthImpl = (req, res, next) => { next(); }
        support.checkAuthAdminImpl = (req, res, next) => { next(); }
    });

    after(function() {
        support.checkAuthImpl = oldCheckAuth;
        support.checkAuthAdminImpl = oldCheckAuthAdmin;
    });

    it('executeCommand should work', function(done) {
        support.executeCommand(" ")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('executeCommand should work even if timeout', function(done) {
        var timeout = support._timeout;
        support._timeout = 1;
        support.executeCommand("sleep 1")
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            support._timeout = timeout;
        });
    });

    it("readHostsFromFile should work", function(done) {
        support.readHostsFromFile(testHostsFile)
        .then(function(ret) {
            expect(ret.hosts).to.be.an("Array");
            expect(ret.nodeIds).to.be.an("Array");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("readHostsFromFile should fail when error, e.g. no such file", function(done) {
        var fakeHostsFile = "noSuchFile.cfg";
        support.readHostsFromFile(fakeHostsFile)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.be.an("Error");
            done();
        });
    });
    it('sendCommandToSlaves should fail when error', function(done) {
        support.sendCommandToSlaves(testAction, testSlaveUrl, testContent, testHosts)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error[testHosts[0]].status).to.equal(500);
            done();
        });
    });
    // This is actually testing RESTful API calls. So the promise can be either
    // resolved or rejected based on the status of the server running on the slave.
    // Instead of expecting 200 all the time, we expect it to gracefully handle
    // success and failure.
    it('sendCommandToSlaves should work', function(done) {
        testSlaveUrl = "/service/status/slave";
        testHosts = ["localhost"];
        support.sendCommandToSlaves(testAction, testSlaveUrl, testContent, testHosts)
        .then(function(ret) {
            expect(ret[testHosts[0]].status).to.equal(200);
            done();
        })
        .fail(function(err) {
            expect(err[testHosts[0]].status).to.equal(500);
            done();
        });
    });

    it('slaveExecuteAction should work', function(done) {
        var oldFunc = support.executeCommand;
        var fakeFunc =  function(command) {
            return jQuery.Deferred().resolve(command + " succeeds").promise();
        }
        fakeExecuteCommand(fakeFunc);
        support.slaveExecuteAction("", "/service/start/slave", testContent)
        .then(function() {
            return support.slaveExecuteAction("", "/service/stop/slave", testContent);
        })
        .then(function() {
            return support.slaveExecuteAction("", "/service/status/slave", testContent);
        })
        .then(function() {
            return support.slaveExecuteAction("", "/service/logs/slave", testLogOpts);
        })
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function(err) {
            console.log(JSON.stringify(err));
            done("fail");
        })
        .always(function() {
            fakeExecuteCommand(oldFunc);
        });
    });

    it('generateLogs should work', function(done) {
        expect(support.generateLogs(testAction, testSlaveUrl, testResults)).to.include("Success");
        done();
    });

    it('masterExecuteAction should work with/without given host', function(done) {
        var oldRead = support.readHostsFromFile;
        var oldSend = support.sendCommandToSlaves;
        var fakeRead = function() {
            return jQuery.Deferred().resolve(
                {hosts: ["bellman.int.xcalar.com"], nodeIds: [0]}).promise();
        };
        var fakeSend = function() {
            return jQuery.Deferred().resolve().promise();
        };
        fakeReadHostsFromFile(fakeRead);
        fakeSendCommandToSlaves(fakeSend);
        support.masterExecuteAction(testAction, testSlaveUrl, testContent, true)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            return support.masterExecuteAction(testAction, testSlaveUrl, testContent);
        })
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeReadHostsFromFile(oldRead);
            fakeSendCommandToSlaves(oldSend);
        });
    });

    it('getXlrRoot should work', function(done) {
        support.getXlrRoot(testCfg)
        .then(function(ret) {
            expect(ret).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getXlrRoot should work and return a default result when input is invalid', function(done) {
        support.getXlrRoot("invalidPath")
        .then(function(ret) {
            expect(ret).to.equal("/mnt/xcalar");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('removeSessionFiles should work', function(done) {
        var oldFunc = support.getXlrRoot;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve(testDir).promise();
        };
        fakeGetXlrRoot(fakeFunc);
        // It should catch 'undefined' and handle it correctly
        // support.removeSessionFiles(undefined)
        support.removeSessionFiles('nonFile')
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeGetXlrRoot(oldFunc);
        });
    });

    it('getLicense should work', function(done) {
        var oldFunc = support.getXlrRoot;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve(cfgDir).promise();
        };
        fakeGetXlrRoot(fakeFunc);
        support.getLicense()
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeGetXlrRoot(oldFunc);
        });
    });

    it('generateLastMonitorMap should work', function() {
        expect(support.generateLastMonitorMap(testResults)).to.not.be.empty;
    });

    it('getMatchedHosts should work', function(done) {
        console.log("XCE_CONFIG: " + process.env.XCE_CONFIG);
        console.log("defaultHostsFile: " + support._defaultHostsFile);
        support.getMatchedHosts({hostnamePattern: ".*"})
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getMatchedHosts should work given not pattern', function(done) {
        support.getMatchedHosts({hostnamePattern: ""})
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('getMatchedHosts should fail when error, e.g. invalid pattern', function(done) {
        support.getMatchedHosts({hostnamePattern: "*"})
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(404);
            done();
        });
    });
    it('readInstallerLog should work', function(done) {
        support.readInstallerLog(testPath)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('readInstallerLog should fail when error, e.g. invalid path', function(done) {
        support.readInstallerLog("invalidPath")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });

    it('hasLogFile should work', function(done) {
        support.hasLogFile(testPath)
        .then(function(ret) {
            expect(ret).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it('hasLogFile should fail when error, e.g. invalid path', function(done) {
        support.hasLogFile("invalidPath")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            done();
        });
    });

    it('isComplete should work', function() {
        expect(support.isComplete(testStartCommand, "")).to.equal(false);
        expect(support.isComplete(testStartCommand, testStartData)).to.equal(true);
        expect(support.isComplete(testStopCommand, "")).to.equal(false);
        expect(support.isComplete(testStopCommand, testStopData)).to.equal(true);
    });

    it('removeSHM should work', function(done) {
        var oldFunc = support.executeCommand;
        var fakeFunc =  function(command) {
            return jQuery.Deferred().resolve(command + " succeeds").promise();
        }
        fakeExecuteCommand(fakeFunc);
        support.removeSHM()
        .then(function(ret) {
            expect(ret).to.include("succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeExecuteCommand(oldFunc);
        });
    });

    it('getOperatingSystem should work', function(done) {
        var oldFunc = support.executeCommand;
        var fakeFunc =  function(command) {
            return jQuery.Deferred().resolve(command + " succeeds").promise();
        }
        fakeExecuteCommand(fakeFunc);
        support.getOperatingSystem()
        .then(function(ret) {
            expect(ret).to.include("succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeExecuteCommand(oldFunc);
        });
    });

    it('setHotPatch should work', function(done) {
        var oldFunc = support.getXlrRoot;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve(testDir).promise();
        };
        fakeGetXlrRoot(fakeFunc);
        var enableHotPatches = true;
        support.setHotPatch(enableHotPatches)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeGetXlrRoot(oldFunc);
        });
    });

    it('getHotPatch should work', function(done) {
        var oldFunc = support.getXlrRoot;
        var fakeFunc = function() {
            return jQuery.Deferred().resolve(testDir).promise();
        };
        fakeGetXlrRoot(fakeFunc);
        support.getHotPatch()
        .then(function(ret) {
            expect(ret.hotPatchEnabled).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeGetXlrRoot(oldFunc);
        });
    });

    it('makeFileCopy should work', function(done) {
        support.makeFileCopy(testHostsFile)
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
});
