/**
 * Module dependencies.
 */
var passport = require('passport-strategy')
  , util = require('util')
  , Buttercup = require('buttercup');


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
 *   - `usernameField`  field name where the username is found, defaults to _username_
 *   - `passwordField`  field name where the password is found, defaults to _password_
 *   - `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)
 *
 * Examples:
 *
 *     passport.use(new LocalStrategy(
 *       function(username, password, done) {
 *         User.findOne({ username: username, password: password }, function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
    if ((!options) || (typeof options !== 'object')) {
        { throw new TypeError('ButtercupStrategy has required arguments'); }
    }
    if (!verify) { throw new TypeError('ButtercupStrategy requires a verify callback'); }

    this._usernameField = options.usernameField || 'username';
    this._passwordField = options.passwordField || 'password';
    this._filename = options.filename || '/tmp/passwdVault';
    this._masterPassword = options.masterPassword || 'password';
    this._passwordGroup = options.passwordGroup || 'admin';

    passport.Strategy.call(this);
    this.name = 'buttercup';
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/**
 * Authenticate request based on the contents of a form submission.
 *
 * @param {Object} req
 * @api protected
 */
Strategy.prototype.authenticate = function(req, options) {
    options = options || {};
    var username = req.body[this._usernameField] || req.query[this._usernameField];
    var password = req.body[this._passwordField] || req.query[this._passwordField];

    if (!username || !password) {
        return this.fail({ message: options.badRequestMessage || 'Missing credentials' }, 401);
    }

    var self = this;

    function verified(err, user, info) {
        if (err) { return self.error(err); }
        if (!user) { return self.fail(info); }
        self.success(user, info);
    }

    const { FileDatasource, createCredentials } = Buttercup;
    const ds = new FileDatasource(this._filename);

    ds.load(createCredentials.fromPassword(this._masterPassword))
        .then(function(archive) {
            var userEntryStr = null;
            var regexp = new RegExp('^' + username + '$');

            console.log("username: " + username);
            console.log("password: " + password);

            archive
                .findEntriesByProperty("username", regexp)
                .forEach(function(entryStr) {
                    // Do something with entry

                    if (JSON.parse(entryStr).properties.password === password) {
                        userEntryStr = entryStr;
                    }
                });

            if (!userEntryStr) { return verified(null, false, { message: "Authentication failure" }) };

            var userEntry = JSON.parse(userEntryStr);
            if (self._passReqToCallback) {
                self._verify(req, userEntry, verified);
            } else {
                self._verify(userEntry, verified);
            }
        })
        .catch(function(err) {
            return self.fail({ message: "Error while opening " + this._fileName + ":" + err.message }, 401)
        });
};


/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
