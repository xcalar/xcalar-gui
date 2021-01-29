describe('ExpServer Installer Test', function() {
    // Test setup
    var expect = require('chai').expect;
    var path = require("path");
    var request = require('request');
    var expServer = require(__dirname + '/../expServer.js');
    var installer = require(__dirname + '/../route/installer.js');
    var installerManager = require(__dirname + '/../controllers/'+
        'installerManager.js').default;
    var support = require(__dirname + '/../utils/expServerSupport.js').default;
    var licenseLocation;
    var hostnameLocation;
    var privHostnameLocation;
    var ldapLocation;
    var credentialLocation;
    var discoveryResultLocation;
    var credentialsOption1, credentialsOption2, credentialsOption3;
    var nfsOption1, nfsOption2, nfsOption3;
    var ldapOption1, ldapOption2;
    var testPwd;
    var testCredArray;
    var testScript1, testScript2, testScript3;
    var testData;
    var testInput;
    var emptyPromise;
    var succPromise;
    var oldSlaveExec;
    this.timeout(10000);

    function getCurStepStatus() {
        return installerManager._curStep.curStepStatus;
    }
    function getCurStepStepString() {
        return installerManager._curStep.stepString;
    }
    function setTestVariables(opts) {
        if (opts.hostnameLocation) {
            installerManager._hostnameLocation = opts.hostnameLocation;
        }
        if (opts.privHostnameLocation) {
            installerManager._privHostnameLocation = opts.privHostnameLocation;
        }
        if (opts.ldapLocation) {
            installerManager._ldapLocation = opts.ldapLocation;
        }
        if (opts.discoveryResultLocation) {
            installerManager._discoveryResultLocation = opts.discoveryResultLocation;
        }
        if (opts.licenseLocation) {
            installerManager._licenseLocation = opts.licenseLocation;
        }
        if (opts.credentialLocation) {
            installerManager._credentialLocation = opts.credentialLocation;
        }
    }
    function fakeCheckLicense(func) {
        installerManager.checkLicense = func;
    }
    function fakeInstallUpgradeUtil(func) {
        installerManager.installUpgradeUtil = func;
    }
    function fakeDiscoverUtil(func) {
        installerManager.discoverUtil = func;
    }
    function fakeCreateStatusArray(func) {
        installerManager.createStatusArray = func;
    }
    // Test begins
    before(function() {
        hostnameLocation = path.join(__dirname, "/config/hosts.txt");
        licenseLocation = path.join(__dirname, "/config/license.txt");
        failLicenseLocation = path.join(__dirname, "/config/failLicense.txt");
        hostnameLocation = path.join(__dirname, "/config/hosts.txt");
        privHostnameLocation = path.join(__dirname, "/config/privHosts.txt");
        ldapLocation = path.join(__dirname, "/config/ldapConfig.json");
        credentialLocation = path.join(__dirname, "/config/key.txt");
        discoveryResultLocation=path.join(__dirname, "/config/result.json");

        credentialsOption1 = {
            "password": "test"
        };
        credentialsOption2 = {
            "sshKey": "test"
        };
        credentialsOption3 = {
            "sshUserSettings": "test"
        };
        nfsOption1 = {
            option: "customerNfs",
            nfsUsername: "test",
            nfsGroup: "test",
            copy: true
        };
        nfsOption2 = {
            option: "readyNfs"
        };
        nfsOption3 = {
            option: "xcalarNfs"
        };
        ldapOption1 = {
            // xcalarInstall: "test",
            // password: testPwd
            deployOption: "xcalarLdap",
            domainName: "testDomain",
            companyName: "testCompany",
            password: "test"
        };
        ldapOption2 = {
            deployOption: "customerLdap"
        };
        ldapOption2 = {};
        testCredArray = {
            credentials: undefined,
            username: "testUser",
            port: "testPort",
            nfsOption: undefined,
            installationDirectory: "testDir",
            ldap: undefined,
                // "ldap_uri": "ldap://openldap1-1.xcalar.net:389",
                // "userDN": "mail=%username%,ou=People,dc=int,dc=xcalar,dc=com",
                // "useTLS": "false",
                // "searchFilter": "(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)",
                // "activeDir": "false",
                // "serverKeyFile": "/etc/ssl/certs/ca-certificates.crt",
                // "ldapConfigEnabled": true
            // },
            defaultAdminConfig: {
                defaultAdminEnabled: true,
                username: "testUser",
                email: "testEmail",
                password: "test"
            },
            serializationDirectory: "testSerDes",
            preConfig: false,
            supportBundles: true,
            enableHotPatches: true,
            hostnames: ["testhost1", "testhost2"],
            privHostNames: ["testhost3", "testhost4"],
            licenseKey: "H4sIANdv+1oAA6tWUEpJLElUslJQCvHwDFYAIkeFENfgECWFWi4Aa4s/Vh0AAAA="
        };

        testInput = {
            hasPrivHosts: true,
            credArray: testCredArray
        };
        testScript1 = "cat " + licenseLocation;
        testScript2 = "echo SUCCESS";
        testScript3 = "cat " + failLicenseLocation;
        testData = {};
        testPwd = "test";

        var opts = {
            hostnameLocation: hostnameLocation,
            privHostnameLocation: privHostnameLocation,
            ldapLocation: ldapLocation,
            discoveryResultLocation: discoveryResultLocation,
            licenseLocation: licenseLocation,
            credentialLocation: credentialLocation
        };
        setTestVariables(opts);
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        };
        succPromise = function() {
            return jQuery.Deferred().resolve({status: 200}).promise();
        };
        oldSlaveExec = support.slaveExecuteAction;
        installer.fakeSlaveExecuteAction(succPromise);
        support.slaveExecuteAction = succPromise;
    });

    after(function() {
        support.slaveExecuteAction = oldSlaveExec;
    });

    after(function() {
        installer.fakeSlaveExecuteAction(oldSlaveExec);
    });

    it("encryptPassword should work", function() {
        expect(installerManager.encryptPassword(testPwd)).to.include("{SSHA}");
    });

    it("genExecString should work", function() {
        testInput.credArray.credentials = credentialsOption1;
        testInput.credArray.nfsOption = nfsOption1;
        testInput.credArray.ldap = ldapOption1;
        expect(installerManager.genExecString(testInput)).to.be.a("String");

        testInput.credArray.credentials = credentialsOption2;
        testInput.credArray.nfsOption = nfsOption2;
        testInput.credArray.ldap = ldapOption2;
        expect(installerManager.genExecString(testInput)).to.be.a("String");

        testInput.credArray.credentials = credentialsOption3;
        testInput.credArray.nfsOption = nfsOption3;
        expect(installerManager.genExecString(testInput)).to.be.a("String");
    });

    it("checkLicense should fail when error, e.g. data has no SUCCESS or FAILURE", function(done) {
        installerManager.checkLicense(testCredArray, testScript1)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });

    it("checkLicense should fail when error, e.g. data has FAILURE", function(done) {
        installerManager.checkLicense(testCredArray, testScript3)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.verified).to.equal(false);
            done();
        });
    });

    it("checkLicense should work", function(done) {
        installerManager.checkLicense(testCredArray, testScript2)
        .then(function(ret) {
            expect(ret.verified).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("installUpgradeUtil should fail when error, e.g. invalid command", function(done) {
        installerManager.installUpgradeUtil(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(getCurStepStatus()).to.equal(-1);
            done();
        });
    });

    it("discoverUtil should fail when error, e.g. invalid command", function(done) {
        installerManager.discoverUtil(testCredArray)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error.status).to.equal(500);
            done();
        });
    });

    it("installUpgradeUtil should work", function(done) {
        testCredArray.credentials = {"sshKey": "test"};
        testCredArray.privHostNames = [];
        installerManager.installUpgradeUtil(testCredArray,"","echo Step \[Success\]")
        .then(function() {
            expect(getCurStepStatus()).to.equal(2);
            expect(getCurStepStepString()).to.equal("Step [Success]");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("discoverUtil should work", function(done) {
        testCredArray.credentials = {"sshKey": "test"};
        testCredArray.privHostNames = [];
        installerManager.discoverUtil(testCredArray,"","echo Success")
        .then(function(ret) {
            expect(ret.test).to.equal("success");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("createStatusArray should work", function(done) {
        var oldFunc = support.masterExecuteAction;
        installerManager.createStatusArray(testCredArray)
        .then(function(ret) {
            expect(ret.status).to.equal(200);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("Checking license router should work", function(done) {
        var oldFunc = installerManager.checkLicense;
        fakeCheckLicense(succPromise);
        var data = {
            url: 'http://localhost:12224/xdp/license/verification',
            json: testData
        }
        request.post(data, function (err, res, body){
            console.log("res is: " + JSON.stringify(res));
            fakeCheckLicense(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking install status router should work", function(done) {
        var oldFunc = installerManager.createStatusArray;
        fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12224/xdp/installation/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking upgrade status router should work", function(done) {
        var oldFunc = installerManager.createStatusArray;
        fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12224/xdp/upgrade/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Checking uninstall status router should work", function(done) {
        var oldFunc = installerManager.createStatusArray;
        fakeCreateStatusArray(succPromise);
        var data = {
            url: 'http://localhost:12224/xdp/uninstallation/status',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeCreateStatusArray(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Discovering router should work", function(done) {
        var oldFunc = installerManager.discoverUtil;
        fakeDiscoverUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12224/xdp/discover',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeDiscoverUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Installing router should work", function(done) {
        var oldFunc = installerManager.installUpgradeUtil;
        fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12224/xdp/installation/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Upgrading router should work", function(done) {
        var oldFunc = installerManager.installUpgradeUtil;
        fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12224/xdp/upgrade/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Uninstalling router should work", function(done) {
        var oldFunc = installerManager.installUpgradeUtil;
        fakeInstallUpgradeUtil(emptyPromise);
        var data = {
            url: 'http://localhost:12224/xdp/uninstallation/start',
            json: testData
        }
        request.post(data, function (err, res, body){
            fakeInstallUpgradeUtil(oldFunc);
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Canceling router should work", function(done) {
        var data = {
            url: 'http://localhost:12224/xdp/installation/cancel',
            json: testData
        }
        request.post(data, function (err, res, body){
            expect(res.body.status).to.equal(200);
            done();
        });
    });

    it("Fetching log router should work", function(done) {
        var data = {
            url: 'http://localhost:12224/installationLogs/slave',
        }
        request.get(data, function (err, res, body){
            console.log("res is: " + JSON.stringify(res));
            expect(JSON.parse(res.body).status).to.equal(200);
            done();
        });
    });


});