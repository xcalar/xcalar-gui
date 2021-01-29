describe.skip('ExpServer Tutorial Test', function() {
    // Test setup
    var expect = require('chai').expect;
    require(__dirname + '/../expServer.js');
    var tutorialManager = require(__dirname + '/../controllers/tutorialManager.js').default;
    var testVersion;
    var oldGetObject;
    this.timeout(10000);

    function fakeGetObject(func) {
        tutorialManager._s3.getObject = func;
    }
    function fakeProcessItem(func) {
        tutorialManager.processItem = func;
    }

    // Test begins
    before(function() {
        testTargz = "test";
        testName = "test";
        testVersion = "1.0.0";
        testData = {
            "name": "test",
            "version": "1.0.0"
        };
        testType = "test";
        testDownloadName = "test";
        testFileName = "extensions/distinct/1.0.0/distinct-1.0.0.tar.gz";
        oldGetObject = tutorialManager._s3.getObject;
        emptyPromise = function() {
            return jQuery.Deferred().resolve().promise();
        }

    });

    after(function() {

    });


    it("tutorialManager.downloadTutorial should fail when error", function(done) {
        var fakeFunc = function(data, callback) {
            callback("fail");
        }
        fakeGetObject(fakeFunc);
        tutorialManager.downloadTutorial(testDownloadName, testVersion)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            fakeGetObject(oldGetObject);
        });
    });

    it("tutorialManager.downloadTutorial should work", function(done) {
        testDownloadName = "simpleTutorial";
        var fakeFunc = function(data, callback) {
            callback(null, {Body: {msg: "success"}});
        }
        fakeGetObject(fakeFunc);
        tutorialManager.downloadTutorial(testDownloadName, testVersion)
        .then(function(ret) {
            expect(ret.status).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            fakeGetObject(oldGetObject);
        })
    });

    it("tutorialManager.processItem should fail when error", function(done) {
        tutorialManager.processItem([], "notExist.txt")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            console.log()
            expect(error).to.not.equal(null);
            done();
        });
    });

    it("tutorialManager.processItem should work", function(done) {
        tutorialManager.processItem([], testFileName)
        .then(function(ret) {
            expect(ret).to.equal("processItem succeeds");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("tutorialManager.fetchAllTutorials should work", function(done) {
        tutorialManager.fetchAllTutorials()
        .then(function(ret) {
            expect(ret).to.be.an.instanceof(Array);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("tutorialManager.fetchAllTutorials should fail when error", function(done) {
        var oldFunc = tutorialManager.processItem;
        var fakeFunc = function() {
            return jQuery.Deferred().reject("processItem fails").promise();
        }
        fakeProcessItem(fakeFunc);
        tutorialManager.fetchAllTutorials()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.not.equal(null);
            done();
        })
        .always(function() {
            fakeProcessItem(oldFunc);
        });
    });

    after(function() {

    });
});
