/**
 * Module dependencies.
 */
global.fetch = require('node-fetch');
var passport = require('passport-strategy')
, util = require('util')
, jose = require('@panva/jose')
, request = require('request')
, base64url = require('base64url')
, AmazonCognitoIdentity = require('amazon-cognito-identity-js')
, AWS = require('aws-sdk')
, bunyan = require('bunyan');

const log = bunyan.createLogger({
    name: 'cognito-auth',
    streams: [{
        stream: process.stderr,
        level: 'error',
        name: 'error',
    }, {
        stream: process.stdout,
        level: 'warn',
        name: 'console',
    }],
});

function errMsgHandler(err, msg) {

    // if err is an Error or a string, handle it
    if (typeof err === 'string')
        return ({ message: `${msg}: ${err}`,
                  code: 'InternalServiceException',
                  object: null });

    if (err && err.message && err.code)
        return ({ message: `${msg}: ${err.message}`,
                  code: err.code,
                  object: null });

    if (err instanceof Error)
        return ({ message: `${msg}: ${err.message}`,
                  code: err.name,
                  object: null });

    // if err is something else, try to stringify it
    var str;
    try {
        str = JSON.stringify(err);
    } catch (ex) {
        return ({ message: `${msg}: <object>`,
                  code: null,
                  object: err });
    }

    return ({ message: `${msg}: ${str}`,
              code: null,
              object: null });
};

/**
 * `Strategy` constructor.
 *
 * The local authentication strategy authenticates requests based on the
 * credentials submitted through an HTML-based login form.
 *
 * Applications must supply a `verify` callback which accepts `username` and
 * `password` credentials, and then calls the `done` callback supplying a
 * `user`, which should be set to `false` if the credentials are not valid.
 * If an exception occurred, `err` should be set.
 *
 * Optionally, `options` can be used to change the fields in which the
 * credentials are found.
 *
 * Options:
 *   - `userPoolId` field name where the authentication User Pool can be found
 *   - `clientId` field name of the ClientId for the application/service the user wants to access
 *   - `keysUrl` field name of the URI where JWT validation keys can be found
 *   - `region` field name of the AWS region where the user pool used to authenticate is located
 *   - `identityPoolId` field name specifying the id of an identity pool for additional identity checks
 *   - `usernameField`  field name where the username is found, defaults to _username_
 *   - `passwordField`  field name where the password is found, defaults to _password_
 *   - `idTokenField`  field name where the idToken is found, defaults to idToken
 *   - `accessTokenField`  field name where the accessToken is found, defaults to accessToken
 *   - `refreshTokenField`  field name where the refreshToken is found, defaults to refreshToken
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Examples:
 *
 *  passport.use(new CognitoStrategy({
 *      userPoolId: config.creds.userPoolId,
 *      clientId: config.creds.clientId,
 *      keysUrl: config.creds.keysUrl,
 *      region: config.creds.region,
 *      identityPoolId: config.creds.identityPoolId,
 *      passReqToCallback: config.creds.passReqToCallback,
 *  },
 *  function(iss, sub, profile, accessToken, refreshToken, awsConfig, done) {
 *      if (!profile.id) {
 *          return done(new Error("No id found"), null);
 *      }
 *
 *      // asynchronous verification, for effect...
 *      process.nextTick(function () {
 *          findById(profile.id, function(err, user) {
 *              if (err) {
 *                  return done(err);
 *              }
 *              if (!user) {
 *                  // "Auto-registration"
 *                  users.push( { 'profile': profile,
 *                                'accessToken': accessToken,
 *                                'refreshToken': refreshToken,
 *                                'awsConfig': awsConfig });
 *                  return done(null, profile);
 *              }
 *              return done(null, user.profile);
 *          });
 *      });
 *  }));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
    if ((!options) || (typeof options !== 'object')) {
        { throw new TypeError('Cognito has required arguments'); }
    }
    if (!verify) {
        { throw new TypeError('Cognito requires a verify callback'); }
    }

    passport.Strategy.call(this);

    this._options = options;
    this.name = 'cognito';
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;

    this._options.usernameField = options.usernameField || 'username';
    this._options.passwordField = options.passwordField || 'password';

    this._options.idTokenField = options.idTokenField || 'idToken';
    this._options.accessTokenField = options.accessTokenField || 'accessToken';
    this._options.refreshTokenField = options.refreshTokenField || 'refreshToken';

    // if logging level specified, switch to it.
    if (options.loggingLevel) { log.levels('console', options.loggingLevel); }
    this.log = log;

    if (! options.userPoolId) {
        throw new TypeError(`CognitoStrategy requires a user pool id to function`);
    }

    if (! options.region) {
        throw new TypeError(`CognitoStrategy requires an AWS user pool region to function`);
    }

    if (! options.clientId) {
        throw new TypeError(`CognitoStrategy requires a clientId to function`);
    }

    this._options.keysUrl = options.keysUrl || `https://cognito-idp.${options.region}.amazonaws.com/${options.userPoolId}/.well-known/jwks.json`;

    this._options.keysReq = { method: 'GET',
                              uri: this._options.keysUrl,
                              json: true
                            };
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);


function makeProfileObject(src, raw) {
    var profile = {
        sub: src.sub,
        id: src.event_id,
        email: src.email,
        cognito: {},
        custom: {},
        _raw: raw,
        _json: src,
    };

    if (src.name) {
        profile.name = src.name;
    }

    if (src.given_name) {
        profile.givenName = src.given_name;
    }

    for (key in src) {
        log.info(`key name: ${key}`);
        if (key.startsWith('cognito:')) {
            profile.cognito[key.substr(key.indexOf(':') + 1)] = src[key];
        }
        if (key.startsWith('custom:')) {
            profile.custom[key.substr(key.indexOf(':') + 1)] = src[key];
        }
    }

    return profile;
}

function onProfileLoaded(strategy, args) {
    function verified(err, user, info) {
        if (err) {
            return strategy.error(err);
        }
        if (!user) {
            return strategy.failWithLog(info);
        }
        return strategy.success(user, info);
    }

    /* three prototypes are currently supported:
     * - one with just OAuth token claim information
     * - one with token claim information and an awsConfig pointer to perform logout
     * - one with token claim info, an awsConfig pointer, and Cognito authentication info
     */
    const verifyArityArgsMap = {
        3: 'iss sub profile',
        7: 'iss sub profile accessToken refreshToken awsConfig',
        11: 'iss sub profile accessToken refreshToken awsConfig idToken region identityPoolId awsLoginString',
        12: 'iss sub profile accessToken refreshToken awsConfig idToken region identityPoolId awsLoginString identityId'
    };

    const arity = (strategy._passReqToCallback) ? strategy._verify.length - 1 : strategy._verify.length;

    let verifyArgs = [args.profile, verified];

    if (verifyArityArgsMap[arity]) {
        verifyArgs = verifyArityArgsMap[arity]
            .split(' ')
            .map((argName) => {
                return args[argName];
            })
            .concat([verified]);
    }

    if (strategy._passReqToCallback) {
        verifyArgs.unshift(args.req);
    }

    return strategy._verify.apply(strategy, verifyArgs);
}

Strategy.prototype._validateResponse = function validateResponse(idTokenString, validateOptions, req, callback) {

    try {
        var verifyOptions = { 'audience': this._options.clientId,
                              'issuer': `https://cognito-idp.${this._options.region}.amazonaws.com/${this._options.userPoolId}`
                            };

        log.info(`verifying token using options: ${JSON.stringify(verifyOptions)}`);
        var validToken = jose.JWT.verify(idTokenString, validateOptions.jweKeyStore, verifyOptions);

        if (validToken.sub !== validToken['cognito:username']) {
            var errMsg = `Id token subject ${validToken.sub} does not match cognito username ${validToken['cognito:username']}`;
            throw new Error(errMsg);
        }

        var idTokenSegments = idTokenString.split('.');
        var jwtTokenClaimStr = base64url.decode(idTokenSegments[1]);
        return callback(jwtTokenClaimStr, validToken);

    } catch (validateErr) {
        log.error(validateErr);
        throw validateErr;
    }
};


Strategy.prototype._idTokenHandler = function idTokenHandler(idTokenString, validateOptions, req, callback) {

    const self = this;

    var parts = idTokenString.split('.');
    log.info("idTokenString length: " + parts.length);
    if (parts.length === 3) {
        log.info('Validating plain JWT');
        return self._validateResponse(idTokenString, validateOptions, req, callback);

    } else if (parts.length === 5) {
        log.info('Validating encrypted JWT');
        var decryptedTokenString = jose.JWE.decrypt(idTokenString, validateOptions.jweKeyStore);

        return self._validateResponse(decryptedTokenString, validateOptions, req, callback);
    } else {
        var errMsg = `idTokenString has ${parts.length} parts and it is neither jwe nor jws`;
        throw new Error(errMsg);
    }
};

Strategy.prototype._authFlowHandler = function authFlowHandler(params, validateOptions, req) {

    const self = this;

    return self._idTokenHandler(params.idToken, validateOptions, req,
                                (jwtClaimsStr, jwtClaims) => {
        const sub = jwtClaims.sub;
        const iss = jwtClaims.iss;

        var reqInfo = {
            req,
            sub,
            iss,
            profile: makeProfileObject(jwtClaims, jwtClaimsStr),
            idToken: params.idToken,
            accessToken: params.accessToken,
            refreshToken: params.refreshToken,
            awsConfig: params.awsConfig,
            region: params.region,
            identityPoolId: params.identityPoolId,
            awsLoginString: params.awsLoginString,
            identityId: params.identityId
        };

        log.info('reqInfo profile: ' + JSON.stringify(reqInfo.profile));

        return onProfileLoaded(self, reqInfo);
    });
};

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
    options = options || {};

    var username = req.body[this._options.usernameField] || req.query[this._options.usernameField];
    var password = req.body[this._options.passwordField] || req.query[this._options.passwordField];

    var idToken = req.body[this._options.idTokenField] || req.query[this._options.idTokenField];
    var accessToken = req.body[this._options.accessTokenField] || req.query[this._optionsaccessTokenField];
    var refreshToken = req.body[this._options.refreshTokenField] || req.query[this._optionsrefreshTokenField];

    if (!(username && password) && !(idToken && accessToken && refreshToken)) {
        return this.fail({ message: options.badRequestMessage || 'Missing credentials' }, 401);
    }

    var self = this;

    function verified(err, user, info) {
        if (err) { return self.error(err); }
        if (!user) { return self.fail(info); }
        self.success(user, info);
    }

    function identityPoolAuth(params, validateOptions) {
        log.info('Cognito user pool authentication part 2 successful');

        // get the no identity pool case out of the way right now
        if (! self._options.identityPoolId) {
            log.info('Verifying id token without identity pool');
            try {
                self._authFlowHandler(params, validateOptions, req);
                return true;
            } catch (authErr) {
                return (self.failWithLog(
                    errMsgHandler(authErr, 'Error during id token validation')
                ));
            }

        } else {
            // Add the User's Id Token to the Cognito credentials login map.
            var awsLoginStruct = {};
            var awsLoginString = `cognito-idp.${self._options.region}.amazonaws.com/${self._options.userPoolId}`;
            awsLoginStruct[awsLoginString] = params.idToken;
            AWS.config.region = self._options.region;
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                IdentityPoolId: self._options.identityPoolId,
                Logins: awsLoginStruct
            });

            params.awsConfig = AWS.config;
            params.identityPoolId = self._options.identityPoolId;
            params.awsLoginString = awsLoginString;

            //refreshes credentials using AWS.CognitoIdentity.getCredentialsForIdentity()
            AWS.config.credentials.refresh((error) => {
                if (error) {
                    return (self.failWithLog(
                        errMsgHandler('Cognito identity pool credentials refresh error: ' + error)
                    ));
                } else {
                    params.identityId = AWS.config.credentials.identityId;

                    log.info('Verifying id token with identity pool');
                    try {
                        self._authFlowHandler(params, validateOptions, req);
                        return true;
                    } catch (authErr) {
                        return (self.failWithLog(
                            errMsgHandler(authErr, 'Error during id token validation')
                        ));
                    }
                }
            });
        }
    };

    function userPoolAuth(upUsername, upPassword) {
        var authenticationData = {
            Username : upUsername,
            Password : upPassword
        };

        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        var poolData = { UserPoolId : self._options.userPoolId,
                         ClientId : self._options.clientId };

        var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

        var userData = {
            Username : upUsername,
            Pool : userPool
        };

        var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        log.info('Starting authentication');
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                accessToken = result.getAccessToken().getJwtToken();
                refreshToken = result.getRefreshToken().getToken();
                idToken = result.getIdToken().getJwtToken();

                log.info('Cognito user pool authentication part 1 successful');
                var cognitoUser = userPool.getCurrentUser();
                if (cognitoUser != null) {

                    log.info('Cognito user pool get current user successful');
                    cognitoUser.getSession(function(err, result) {
                        if (err) {
                            return (self.failWithLog(
                                errMsgHandler(err, 'Cognito session retrieval error')
                            ));
                        }

                        var validateOptions = {
                            jweKeyStore: self._jweKeyStore
                        };

                        var params = {
                            'idToken': idToken,
                            'accessToken': accessToken,
                            'refreshToken': refreshToken,
                            'awsConfig': null,
                            'region': self._options.region,
                            'identityPoolId': null,
                            'awsLoginString': null,
                            'identityId': null
                        };

                        if (result) {
                            identityPoolAuth(params, validateOptions);
                        }
                    });
                }
            },

            onFailure: function(err) {
                return (self.failWithLog(
                    errMsgHandler(err, 'Cognito authentication failure')
                ));
            },

        });
    };

    // we need to make the auth request inside the request for keys
    // because it creates a race in the constructor
    request(self._options.keysReq, (error, response, body) => {
        if (error) {
            var errMsg = 'Unable to retrieve JWT verification keys';
            return (self.failWithLog(errMsgHandler(error, errMsg)));
        }

        try {
            log.info('keystore body: ' + JSON.stringify(body));
            self._jweKeyStore = jose.JWKS.asKeyStore(body);

            if (username && password) {
                userPoolAuth(username, password);

            } else if (idToken && accessToken && refreshToken) {
                var params = {
                    'idToken': idToken,
                    'accessToken': accessToken,
                    'refreshToken': refreshToken,
                    'awsConfig': null,
                    'region': self._options.region,
                    'identityPoolId': null,
                    'awsLoginString': null,
                    'identityId': null
                };

                var validateOptions = {
                    jweKeyStore: self._jweKeyStore
                };

                identityPoolAuth(params, validateOptions);
            }
        } catch (err) {
            var errMsg2 = 'Unable to load JWT verification keys into key store';
            return (self.failWithLog(errMsgHandler(err, errMsg2)));
        }
    });
}

Strategy.prototype.failWithLog = function(message) {
  this.log.info(`authentication failed due to: ${JSON.stringify(message)}`);
  return this.fail(message);
};

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
