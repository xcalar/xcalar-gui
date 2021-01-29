# passport-cognito

[Passport](http://passportjs.org/) strategy for authenticating with a username
and password using an AWS Cognito account.

This module lets you authenticate using a username and password with an AWS 
Cognito account in your Node.js applications.  By plugging into Passport, AWS
Congito authentication can be easily and unobtrusively integrated into any 
application or framework that supports 
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Install

```bash
$ npm install passport-cognito
```

## Usage

#### Configure Strategy

The cognito authentication strategy authenticates users using a username and
password with AWS Cognito.  The strategy requires a cognito
`verify` callback, which accepts these credentials and calls `done` providing a user
profile.

```js
passport.use(new CognitoStrategy({
    userPoolId: 'us-west-2_GAGlspY12',
    clientId: '4ueg9b4v9gf0vnumh1h63c5v49k,
    keysUrl: null,
    region: 'us-west-2',
    identityPoolId: 'us-west-2:30c1e896-7142-4574-b4c2-cf1e78881588',
    loggingLevel: 'info',
    passReqToCallback: false,
},
function(iss, sub, profile, accessToken, refreshToken, awsConfig, done) {
    if (!profile.id) {
        return done(new Error("No id found"), null);
    }

    // asynchronous verification, for effect...
    process.nextTick(function () {
        findById(profile.id, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                // "Auto-registration"
                users.push( { 'profile': profile,
                              'accessToken': accessToken,
                              'refreshToken': refreshToken,
                              'awsConfig': awsConfig });
                return done(null, profile);
            }
            return done(null, user.profile);
        });
    });
}));
```

##### Available Options

This strategy takes several options hash before the function, e.g. `new ButtercupStrategy({/* options */, callback})`.

The available options are:

*   `userPoolId` field name where the authentication User Pool can be found
*   `clientId` field name of the ClientId for the application/service the user wants to access
*   `keysUrl` field name of the URI where JWT validation keys can be found
*   `region` field name of the AWS region where the user pool used to authenticate is located
*   `identityPoolId` field name specifying the id of an identity pool for additional identity checks
*   `usernameField`  field name where the username is found, defaults to _username_
*   `passwordField`  field name where the password is found, defaults to _password_
*   `passReqToCallback`  when `true`, `req` is the first argument to the verify callback (default: `false`)

The usernameField and passwordField fields define the name of the properties in the POST body that are sent to the server.

#### Parameters

By default, `CognitoStrategy` expects to find credentials in the UserPool
defined by `userPoolId` and `clientId`. It also expects to find credentials in parameters
named username and password within req.body. If your site prefers to
name these fields differently, options are available to change the defaults.

```
passport.use(new CognitoStrategy({
    userPoolId: 'us-west-2_GAGlspY12',
    clientId: '4ueg9b4v9gf0vnumh1h63c5v49k,
    keysUrl: null,
    region: 'us-west-2',
    identityPoolId: 'us-west-2:30c1e896-7142-4574-b4c2-cf1e78881588',
    loggingLevel: 'info',
    passReqToCallback: false,
    usernameField: 'appUsername',
    passwordField: 'appPassword'
},
function(iss, sub, profile, accessToken, refreshToken, awsConfig, done) {	
...
});
```

The verify callback can be supplied with the `req` object by setting
the `passReqToCallback` option to true, and changing callback arguments
accordingly.

```
passport.use(new CognitoStrategy({
    userPoolId: 'us-west-2_GAGlspY12',
    clientId: '4ueg9b4v9gf0vnumh1h63c5v49k,
    keysUrl: null,
    region: 'us-west-2',
    identityPoolId: 'us-west-2:30c1e896-7142-4574-b4c2-cf1e78881588',
    loggingLevel: 'info',
    passReqToCallback: false,
    usernameField: 'appUsername',
    passwordField: 'appPassword',
    passReqToCallback: true
},
function(req, iss, sub, profile, accessToken, refreshToken, awsConfig, done) {	
    // request object is now first argument
...
});
```

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'cognito'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```js
app.post('/login',
  passport.authenticate('cognito', { failureRedirect: '/login', session: true }),
  function(req, res) {
    res.redirect('/');
  });
```

## Examples

Developers using the popular [Express](http://expressjs.com/) web framework can
refer to an [example](https://github.com/passport/express-4.x-local-example)
as a starting point for their own web applications.

## Tests

```bash
$ npm install
$ npm test
```

## Credits

- [Ted Haining]

## License

[The MIT License](http://opensource.org/licenses/MIT)

