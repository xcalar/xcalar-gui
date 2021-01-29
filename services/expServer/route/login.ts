import * as xcConsole from "../utils/expServerXcConsole";
import support from "../utils/expServerSupport";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import * as crypto from "crypto";
import atob = require("atob");
import { cloudMode, sessionSecret, getNodeCloudOwner } from "../expServer";
import * as request from "request";
import * as url from "url";
import * as signature from "cookie-signature";
import * as cookie from "cookie";

import { Router } from "express"
export const router: any = Router()

import loginManager from "../controllers/loginManager"

var cloudAdminUser = process.env.XCE_CLOUD_ADMIN_USER ?
    process.env.XCE_CLOUD_ADMIN_USER : "xdpadmin";

// Start of LDAP calls
/*
Example AD settings (now gotten from ldapConfig.json)
var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';

Example OpenLDAP Settings (now gotten from ldapConfig.json)

var ldap_uri = 'ldap://ldap.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt';
*/

var loginPathFunc = function(req, res, next) {
    xcConsole.log("Login process");
    var credArray = req.body;
    res.locals.sessionType = JSON.stringify(support.defaultSessionAge);
    if (credArray.hasOwnProperty('sessionType')) {
        if (!support.sessionAges.hasOwnProperty(credArray.sessionType)) {
            var message = {
                'status': httpStatus.BadRequest,
                'message': 'Unknown session type'
            }
            return res.status(message.status).send(message);
        }
        res.locals.sessionType = JSON.stringify(credArray.sessionType);
    }
    loginManager.loginAuthentication(credArray)
        .always(function(message) {
            res.locals.message = JSON.stringify(message);
            next();
        });
};

var logoutPathFunc = function(req, res) {
    var username = req.session.username;
    var message = {
        'status': httpStatus.OK,
        'message': 'User ' + username + ' is logged out'
    }

    loginManager.vaultLogout(req.session)
        .always(function() {
            req.session.destroy(function(err) {
                if (err) {
                    message = {
                        'status': httpStatus.BadRequest,
                        'message': 'Error logging out user ' + username + ' :' + JSON.stringify(err)
                    }
                }

                xcConsole.log("logging out user " + username);

                res.status(message.status).send(message);
            });
        });
};

var cloudLoginPathFunc = function(req, res, next) {
    var message = {
        'status': httpStatus.Unauthorized,
        'message': 'Authentication failure',
        'isValid': false
    }

    if (req.body.xiusername && req.body.xipassword) {
        var nodeCloudOwner = getNodeCloudOwner();

        if ((req.body.xiusername != nodeCloudOwner) &&
            (req.body.xiusername != cloudAdminUser)) {
            res.status(message.status).send(message);
            return next('router');
        }

        if (!process.env.XCE_SAAS_AUTH_LAMBDA_URL) {
            message["message"] = "XCE_SAAS_AUTH_LAMBDA_URL is not set";
            res.status(message.status).send(message);
            return next('router');
        }

        var loginURL = process.env.XCE_SAAS_AUTH_LAMBDA_URL;
        loginURL = loginURL.replace(/\/?$/, '/');
        loginURL += 'login';

        request.post(loginURL, {
            "json": {
                "username": req.body.xiusername,
                "password": req.body.xipassword,
            }
        }, (err, postRes, body) => {
            if (err || body.message !== 'Authentication successful') {
                xcConsole.log(`Login request error ${err}`);
                xcConsole.log(`Login request body ${body}`);
                message['message'] = `Login error: ${JSON.stringify(err)} body ${JSON.stringify(body)}`;
                res.status(message.status).send(message);
                return;
            }

            var cookies = postRes['headers']['set-cookie'];
            var outCookies = [];
            for (var idx in cookies) {
                var domainField = false;
                var sessionCookie = false;
                var cookieParts = cookies[idx].split('; ');
                // the auth lambda sends back two connect.sid cookies (one with
                // a domain one without) but sqldf only expects one -- so only
                // pass on the one with the domain
                for (var idx2 in cookieParts) {
                    if (cookieParts[idx2].toLowerCase().startsWith('domain')) {
                        cookieParts[idx2] = `Domain=${req.hostname}`;
                        domainField = true;
                    }
                    if (cookieParts[idx2].toLowerCase().startsWith('connect.sid')) {
                        sessionCookie = true;
                    }
                }
                if ((!sessionCookie) || (sessionCookie && domainField)) {
                    outCookies.push(cookieParts.join('; '));
                }
            }
            res.setHeader('Set-Cookie', outCookies);
            message = {
                'status': httpStatus.OK,
                'message': "Authentication successful",
                'isValid': true

            };
            res.status(message.status).send(message);
            return;
        });

    } else if (req.body.sessionId) {
        var sessionId = Buffer.from(req.body.sessionId, 'base64').toString('utf8');

        req.sessionStore.get(sessionId, function(err, sess) {
            if (err) {
                xcConsole.log(`Login request error ${err}`);
                message['message'] = `Session store error: ${JSON.stringify(err)}`;
                res.status(message.status).send(message);
                return;
            }

            var nodeCloudOwner = getNodeCloudOwner();

            if ((sess.username != nodeCloudOwner) &&
                (sess.username != cloudAdminUser)) {
                res.status(message.status).send(message);
                return next('router');
            }

            if (sess && sess.loggedIn === true) {
                var signed = 's:' + signature.sign(sessionId, sessionSecret);
                var data = cookie.serialize('connect.sid', signed, req.session.cookie.data);

                support.create_login_jwt(req, res);

                var prev = res.getHeader('Set-Cookie') || []
                var header = Array.isArray(prev) ? prev.concat(data) : [prev, data];
                res.setHeader('Set-Cookie', header)

                message = {
                    'status': httpStatus.OK,
                    'message': "Authentication successful",
                    'isValid': true
                };
            }

            res.status(message.status).send(message);
        });


    } else {
        res.status(message.status).send(message);
    }
};

var cloudLogoutPathFunc = function(req, res, next) {
    var message = {
        'status': httpStatus.Unauthorized,
        'message': 'Authentication failure'
    }

    if (!process.env.XCE_SAAS_AUTH_LAMBDA_URL) {
        message["message"] = "XCE_SAAS_AUTH_LAMBDA_URL is not set";
        res.status(message.status).send(message);
        return next('router');
    }

    console.log(`session $req.session`);

    if (req.session.loggedIn !== true) {
        message["message"] = "User is not logged in";
        res.status(message.status).send(message);
        return next('router');
    }

    var j = request.jar();
    var logoutURL = process.env.XCE_SAAS_AUTH_LAMBDA_URL;
    logoutURL = logoutURL.replace(/\/?$/, '/');
    logoutURL += 'logout';

    var signed = 's:' + signature.sign(req.sessionID, sessionSecret);
    var reqCookie = request.cookie('connect.sid' + '=' + signed);
    j.setCookie(reqCookie, logoutURL);

    request.get(logoutURL, {
        "json": true,
        "jar": j
    }, (reqErr, getRes, body) => {
        if (reqErr || body.message !== 'Logout successful') {
            xcConsole.log(`Logout request error ${reqErr}`);
            xcConsole.log(`Logout request body ${body}`);
            message['message'] = `Login error: ${JSON.stringify(reqErr)} body: ${JSON.stringify(body)}`;
            res.status(message.status).send(message);
            return;
        }

        // even though the lambda should destroy the
        // session record, destroy it here too to remove
        // all traces
        req.session.destroy(function(sessionErr) {
            if (res.statusCode != httpStatus.OK) {
                message = {
                    'status': res.statusCode,
                    'message': `Auth lambda returned status ${res.statusCode}`
                };
            } else {
                message = {
                    'status': httpStatus.OK,
                    'message': body.message
                };
            }

            res.clearCookie('connect.sid');
            res.clearCookie('jwt_token', { httpOnly: true, signed: false });

            res.status(message.status).send(message);
        });
    });
}


var loginActions = [loginPathFunc, support.loginAuth];
var logoutActions = [support.checkAuth, logoutPathFunc];

if (cloudMode === 1) {
    loginActions = [cloudLoginPathFunc];
    logoutActions = [cloudLogoutPathFunc];
}

router.post('/login', loginActions);

router.post('/logout', logoutActions);

router.post('/login/with/HttpAuth', function(req, res) {
    xcConsole.log("Login with http auth");
    const credBuffer = new Buffer(req.body.credentials, 'base64');
    var credString = credBuffer.toString();
    var delimitPos = credString.indexOf(":");
    var errMsg = "";

    if (delimitPos !== -1) {
        var credArray = {
            "xiusername": credString.substring(0, delimitPos),
            "xipassword": credString.substring(delimitPos + 1)
        }

        if (credArray['xiusername'].length > 0) {
            loginManager.loginAuthentication(credArray)
                .then(function(message) {
                    // Add in token information for SSO access
                    message.timestamp = Date.now();
                    message.signature = crypto.createHmac("sha256", "xcalar-salt2")
                        .update(
                            JSON.stringify(userInfo, Object.keys(userInfo).sort()))
                        .digest("hex");
                    delete message.status;

                    if (message.isValid) {
                        req.session.loggedIn = (message.isSupporter ||
                            message.isAdmin);

                        req.session.loggedInAdmin = message.isAdmin;
                        req.session.loggedInUser = message.isSupporter;

                        req.session.firstName = message.firstName;
                        req.session.emailAddress = message.mail;

                        support.create_login_jwt(req, res);
                    }

                    const tokenBuffer = new Buffer(JSON.stringify(message));
                    res.status(httpStatus.OK).send(tokenBuffer.toString('base64'));
                    return;
                })
                .fail(function(message) {
                    res.status(httpStatus.Forbidden).send("Invalid credentials");
                    return
                });
        } else {
            errMsg = 'no username provided';
        }
    } else {
        errMsg = 'no username or password provided';
    }

    res.status(httpStatus.BadRequest).send("Malformed credentials: " + errMsg)
});

router.post('/login/verifyToken', function(req, res) {
    xcConsole.log("Verify token");
    try {
        var userInfo = JSON.parse(atob(req.body.token));
        var userInfoSignature = userInfo.signature;
        delete userInfo.signature;

        var computedSignature = crypto.createHmac("sha256", "xcalar-salt2")
            .update(JSON.stringify(userInfo, Object.keys(userInfo).sort()))
            .digest("hex");

        if (userInfoSignature != computedSignature) {
            throw new Error("Token has been tampered with!");
        }

        var currTime = Date.now();
        if (currTime > (userInfo.timestamp + (1000 * 60 * 5))) {
            res.status(403).send({ "errorMsg": "Token has expired" });
            return;
        }

        delete userInfo.timestamp;

        support.create_login_jwt(req, res);
        res.status(200).send(userInfo);
    } catch (err) {
        res.status(400).send({ "errorMsg": "Malformed token: " + err });
    }
});

router.post('/login/msalConfig/get',
    function(req, res) {
        xcConsole.log("Getting msal config");
        loginManager.getMsalConfig()
            .then(function(message) {
                res.status(message.status).send(message.data);
            }, function(message) {
                res.status(message.status).send(message);
            });
    });


router.post('/login/msalConfig/set',
    [support.checkAuthAdmin], function(req, res) {
        xcConsole.log("Setting msal config");
        var credArray = req.body;
        loginManager.setMsalConfig(credArray)
            .always(function(message) {
                res.status(message.status).send(message);
            });
    });


router.post('/login/defaultAdmin/get',
    [support.checkAuth], function(req, res) {
        xcConsole.log("Getting default admin");
        loginManager.getDefaultAdmin()
            .then(function(message) {
                delete message.data.password;
                res.status(message.status).send(message.data);
            }, function(message) {
                res.status(message.status).send(message);
            });
    });


router.post('/login/defaultAdmin/set',
    [loginManager.securitySetupAuth], loginManager.setupDefaultAdmin);

router.post('/login/defaultAdmin/setup',
    [loginManager.securitySetupAuth], loginManager.setupDefaultAdmin);

router.post('/login/ldapConfig/get',
    [support.checkAuth], function(req, res) {
        xcConsole.log("Getting ldap config");
        loginManager.getLdapConfig()
            .then(function(message) {
                res.status(message.status).send(message.data);
            }, function(message) {
                res.status(message.status).send(message);
            });
    });


router.post('/login/ldapConfig/set',
    [support.checkAuthAdmin], function(req, res) {
        xcConsole.log("Setting ldap config");
        var credArray = req.body;
        loginManager.setLdapConfig(credArray)
            .always(function(message) {
                res.status(message.status).send(message);
            });
    });

if (process.env.NODE_ENV === "test") {
    router.post('/login/test/user',
        [support.checkAuth], function(req, res) {
            xcConsole.log("testing user auth");
            res.status(httpStatus.OK).send("user auth successful");
        });

    router.post('/login/test/admin',
        [support.checkAuthAdmin], function(req, res) {
            xcConsole.log("testing admin auth");
            res.status(httpStatus.OK).send("admin auth successful");
        });
}
