describe('ExpServer Auth Test', function() {
    var expect = require('chai').expect;
    var path = require("path");
    // var request = require('request');
    var expServer = require(__dirname + '/../expServer.js');
    var authManager = require(__dirname + '/../controllers/authManager.js').default;
    var support = require(__dirname + '/../utils/expServerSupport.js').default;
    var cfgFile = __dirname + '/config/test.cfg';
    var jwt = require('jsonwebtoken');
    var fs = require('fs');
    var rsaPemToJwk = require('rsa-pem-to-jwk');
    var kids;
    var payload1, payload2, payload3;
    var key1, key2, key3;
    var token1, token2, token3;
    var certArray, certArray1 = {}, certArray2, certArray3;
    var urlRefCount;
    var jwks_url = "http://something.else.where/some/document/here";
    var oldHostsFile;
    var oldCheckAuth;
    var oldCheckAuthAdmin;

    this.timeout(10000);

    function postRequest(url, str) {
        var deferred = jQuery.Deferred();
        jQuery.ajax({
            "type": "POST",
            "data": JSON.stringify(str),
            "contentType": "application/json",
            "url": "http://localhost:12224" + url,
            "async": true,
            success: function(data) {
                deferred.resolve(data);
            },
            error: function(error) {
                deferred.reject(error);
            }
        });
        return deferred.promise();
    }

    function dummyGetUrl(url) {
        var retMsg = { status: false, url: url, data: null, error: null };
        var oldRefCount = urlRefCount;
        urlRefCount++;

        if (oldRefCount%2 === 0) {
            retMsg.data = { jwks_uri: jwks_url };
            retMsg.status = true;
            return jQuery.Deferred().resolve(retMsg).promise();
        } else if (oldRefCount%2 === 1) {
            retMsg.data = certArray;
            retMsg.status = true;
            return jQuery.Deferred().resolve(retMsg).promise();
        }

        retMsg.error = "Something bad occurred in getUrl";
        return jQuery.Deferred().reject(retMsg).promise();
    }

    function dummyBootstrapXlrRoot() {
        expServer.xlrRoot = '/tmp';
    }

    function fakeGetUrl(func) {
        authManager.getUrl = func;
    }

    /* key gen commands:
       openssl genrsa -out privateKey1.pem 2048
       openssl rsa -in privateKey1.pem -pubout -out certificate1.pem
       openssl genrsa -out privateKey2.pem 2048
       openssl rsa -in privateKey2.pem -pubout -out certificate2.pem
       openssl genrsa -out privateKey3.pem 2048
       openssl rsa -in privateKey3.pem -pubout -out certificate3.pem
    */

    before(function() {
        keyFile1 = path.join(__dirname, '/config/privateKey1.pem');
        keyFile2 = path.join(__dirname, '/config/privateKey2.pem');
        keyFile3 = path.join(__dirname, '/config/privateKey3.pem');

        kids = [
            "i2VgXP9RZ0",
            "kkTCETX2nM",
            "b4IZKtkInN"
        ];

        payload1 = {
            "iss": "http://www.xcalar.com",
            "sub": "mailto: thaining@xcalar.com",
            "nbf": 1526430993,
            "iat": 1526430993,
            "jti": "id123456"
        };

        payload2 = {
            "iss": "http://www.notxcalar.com",
            "sub": "mailto: blim@xcalar.com",
            "nbf": 1526434256,
            "iat": 1526434256,
            "jti": "id654321"
        };

        payload3 = {
            "iss": "http://www.alsonotxcalar.com",
            "sub": "mailto: jyang@xcalar.com",
            "nbf": 1526434931,
            "iat": 1526434931,
            "jti": "id654321"
        };

        key1 = fs.readFileSync(keyFile1);
        token1 = jwt.sign(payload1, key1, { expiresIn: '3650d', algorithm: 'RS256', header: { kid: kids[0] } });

        key2 = fs.readFileSync(keyFile2);
        token2 = jwt.sign(payload2, key2, { expiresIn: '3650d', algorithm: 'RS256', header: { kid: kids[1] } });

        key3 = fs.readFileSync(keyFile3);
        token3 = jwt.sign(payload3, key3, { expiresIn: '3650d', algorithm: 'RS256', header: { kid: kids[2] } });

        token4 = jwt.sign(payload3, key2, { expiresIn: '3650d', algorithm: 'RS256' });

        token5 = jwt.sign(payload3, key3, { expiresIn: '3650d', algorithm: 'RS256', header: { kid: kids[1] } });

        certArray1.keys = [
            rsaPemToJwk(key1, {use: 'sig'}, 'public'),
            rsaPemToJwk(key2, {use: 'sig'}, 'public')
        ];
        certArray1.keys[0].kid = kids[0];
        certArray1.keys[1].kid = kids[1];

        certArray2 = certArray1.keys;

        certArray3 = null;

        expServer.fakeBootstrapXlrRoot(dummyBootstrapXlrRoot);
        function fakeCheck(req, res, next) {
            next();
        }
        oldHostsFile = support._defaultHostsFile
        oldCheckAuth = support.checkAuthImpl;
        oldCheckAuthAdmin = support.checkAuthAdminImpl;
        support._defaultHostsFile = cfgFile;
        support.checkAuthImpl = fakeCheck;
        support.checkAuthAdminImpl = fakeCheck;
    });

    after(function() {
        expServer.fakeBootstrapXlrRoot(expServer.bootstrapXlrRoot);
        support._defaultHostsFile = oldHostsFile;
        support.checkAuthImpl = oldCheckAuth;
        support.checkAuthAdminImpl = oldCheckAuthAdmin;
    });

    it("getUrl should work", function(done) {

        authManager.getUrl('https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration')
        .then(function(ret) {
            expect(ret.status).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("azureIdToken should work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray1;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token1,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.status).to.equal(200);
            expect(ret.message).to.equal('Success');
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("azureIdToken with bad key array should not work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray2;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token1,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            done("fail");
        })
        .fail(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.responseJSON.status).to.equal(401);
            expect(ret.responseJSON.message).to.equal("Keys not found in retrieved for url: " + jwks_url);
            done();
       });
    });

    it("azureIdToken with null key array should not work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray3;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token1,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            done("fail");
        })
        .fail(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.responseJSON.status).to.equal(401);
            expect(ret.responseJSON.message).to.equal("Key retrieval error for url: " + jwks_url);
            done();
       });
    });

    it("azureIdToken with unknown kid should not work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray1;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token3,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            done("fail");
        })
        .fail(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.responseJSON.status).to.equal(401);
            expect(ret.responseJSON.message).to.equal("Key not present in returned keys");
            done();
       });
    });

    it("azureIdToken with kid-less token header should not work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray1;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token4,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            done("fail");
        })
        .fail(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.responseJSON.status).to.equal(500);
            expect(ret.responseJSON.message).to.equal("Token header does not contain a key id");
            done();
        });
    });

    it("azureIdToken with incorrect kid should not work", function(done) {
        var oldGetUrl = authManager.getUrl;

        certArray = certArray1;
        urlRefCount = 0;
        fakeGetUrl(dummyGetUrl);

        var body = { token: token5,
                     user: "true",
                     admin: "false" };

        postRequest("/auth/azureIdToken", body)
        .then(function(ret) {
            done("fail");
        })
        .fail(function(ret) {
            fakeGetUrl(oldGetUrl);
            authManager._msKeyCache.flushAll();
            expect(ret.responseJSON.status).to.equal(401);
            expect(ret.responseJSON.message).to.equal("Error during web token verification: invalid signature");
            done();
        });
    });
});
