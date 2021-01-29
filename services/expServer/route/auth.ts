import * as xcConsole from "../utils/expServerXcConsole";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import support from "../utils/expServerSupport";
import * as cookieParser from "cookie-parser";
import { Router } from "express"
export const router = Router();
import authManager from "../controllers/authManager";
import { cloudMode } from "../expServer";


router.post('/auth/azureIdToken', function(req, res) {
    xcConsole.log("Authenticaking Azure Id Token");
    var idToken = req.body.token;
    var user = req.body.user;
    var admin = req.body.admin;
    var headerBuf = new Buffer(idToken.split('.')[0], 'base64');
    var header = JSON.parse(headerBuf.toString());
    var retMsg = { status: httpStatus.OK, data: null, success: true, message: null };

    if (! header.kid) {
        retMsg = { status: httpStatus.InternalServerError,
                   data: null,
                   success: false,
                   message: 'Token header does not contain a key id'};
        res.status(retMsg.status).send(retMsg);
    }

    authManager.processToken(idToken)
    .always(function(msg) {
        if (msg.status) {
            req.session.loggedIn = user;
            req.session.loggedInAdmin = admin;

            support.create_login_jwt(req, res);
        }
        retMsg = { status: (msg.status) ? httpStatus.OK : httpStatus.Unauthorized,
                   data: msg.data,
                   success: msg.status,
                   message: msg.message };
        res.status(retMsg.status).send(retMsg);
    });
});

router.get('/auth/sessionStatus', function(req, res) {
    // XXX a hack way to extend the session, it should
    // be replacted with a better method
    if (cloudMode) {
        try {
            req.session.touch();
        } catch (e) {
            console.error("extend session error", e);
        }
    }
    var message = { user: false,
                    admin: false,
                    loggedIn: false,
                    emailAddress: null,
                    firstName: null,
                    username: null,
                    timeout: 0 };
    var expirationDate = (new Date(req.session.cookie.expires)).getTime();
    var now = (new Date).getTime();

    if (req.session.hasOwnProperty('loggedIn') &&
        req.session.hasOwnProperty('loggedInAdmin') &&
        req.session.hasOwnProperty('loggedInUser') &&
        req.session.hasOwnProperty('firstName') &&
        req.session.hasOwnProperty('emailAddress') &&
        req.session.hasOwnProperty('username')) {

        message = {
            user: req.session.loggedInUser,
            admin: req.session.loggedInAdmin,
            loggedIn: req.session.loggedIn &&
                (now <= expirationDate),
            emailAddress: req.session.emailAddress,
            firstName: req.session.firstName,
            username: req.session.username,
            timeout: support.sessionAges['interactive']/1000
        }

        if (req.session.hasOwnProperty('timeout')) {
            message.timeout = req.session.timeout;
        }

        support.create_login_jwt(req, res);
    }

    res.status(httpStatus.OK).send(message);
});

router.get('/auth/getSessionId',
           [support.checkAuth], function(req, res) {
    var message = {data: null};

    message.data = support.rawSessionCookie(req);

    res.status(httpStatus.OK).send(message);
});

router.post('/auth/serviceSession', function(req, res) {
    if (! req.body.hasOwnProperty('token')) {
        res.status(httpStatus.BadRequest).send("token not properly specified");
        return;
    }

    var token = cookieParser.signedCookie(decodeURIComponent(req.body.token), req.secret);
    var sessionType = req.body.hasOwnProperty('sessionType') ?
        req.body.sessionType : support.defaultSessionAge;


    req.sessionStore.get(token, function(err, sess) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(httpStatus.Unauthorized).send("session not found");
            } else {
                xcConsole.error("serviceSession: session store error", err);
                res.status(httpStatus.InternalServerError).send("session store error");
            }
            return;
        }
        if (!sess) {
            res.status(httpStatus.Unauthorized).send("session not found");
            return;
        }

        var expirationDate = (new Date(sess.cookie.expires)).getTime();
        var now = (new Date).getTime();

        if (now > expirationDate) {
            res.status(httpStatus.Unauthorized).send("session is expired");
            return;
        }

        if (! sess.loggedIn) {
            res.status(httpStatus.Unauthorized).send("user is not logged in");
        }

        var array = ['loggedIn', 'loggedInAdmin', 'loggedInUser', 'username',
                     'firstName', 'emailAddress'];
        for (var i = 0; i < array.length; i++) {
            req.session[array[i]] = sess[array[i]];
        }

        req.session.timeout = support.sessionAges[sessionType]/1000;
        req.session.cookie.maxAge = support.sessionAges[sessionType];

        req.session.save(function(err) {
            res.status(httpStatus.OK).send("service session created");
        });
    });
});

router.post('/auth/setCredential',
            [support.checkAuth], function(req, res) {
    var message = {valid: false, status: httpStatus.BadRequest};

    if (req.body.hasOwnProperty('key') &&
        req.body.hasOwnProperty('data')) {

        if (! req.session.credentials) {
            req.session.credentials = {};
        }

        req.session.credentials[req.body.key] = req.body.data;
        message['valid'] = true;
        message['status'] = httpStatus.OK;
    }

    res.status(message.status).send(message);
});

router.post('/auth/getCredential',
           [support.checkAuth], function(req, res) {
    var message = { valid: false, status: httpStatus.BadRequest, data: null };

    if (req.body.hasOwnProperty('key')) {
        message['valid'] = true;

        if (req.session.credentials &&
            req.session.credentials[req.body.key]) {
            message['status'] = httpStatus.OK;

            message['data'] = req.session.credentials[req.body.key];
        }
    }

    res.status(message.status).send(message);
});

router.post('/auth/delCredential',
           [support.checkAuth], function(req, res) {
    var message = { valid: false, status: httpStatus.BadRequest };

    if (req.body.hasOwnProperty('key')) {
        message['valid'] = true;

        if (req.session.credentials &&
            req.session.credentials[req.body.key]) {
            delete req.session.credentials[req.body.key];

            message['status'] = httpStatus.OK;
        }
    }

    res.status(message.status).send(message);
});

router.get('/auth/clearCredentials',
           [support.checkAuth], function(req, res) {
    var message = { valid: true, status: httpStatus.BadRequest };

    if (req.session.credentials) {
        req.session.credentials = {};

        message['status'] = httpStatus.OK;
    }

    res.status(message.status).send(message);
});

router.get('/auth/listCredentialKeys',
           [support.checkAuth], function(req, res) {
    var message = { valid: true, status: httpStatus.BadRequest, data: []};

    if (req.session.credentials) {
        message['status'] = httpStatus.OK;
        message['data'] = Object.keys(req.session.credentials);
    }

    res.status(message.status).send(message);
});