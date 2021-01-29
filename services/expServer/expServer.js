// This is the service that is run anywhere so most of the time there will be
// calls that aren't used

// Start of generic setup stuff
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
    var fs = require("fs");
    var dns = require("dns");
    var dgram = require('dgram');
    var path = require("path");

    var cloudInstanceId;
    var cloudMode = process.env.XCE_CLOUD_MODE == 1 ?
        parseInt(process.env.XCE_CLOUD_MODE) : 0;
    // XXX tempoary put export here due to file require order issue
    // as a refactor, this should be put to a separate module
    exports.cloudMode = cloudMode;
    if (process.env.NODE_ENV !== "test") {
        require('console-stamp')(console, { pattern: "yyyy/mm/dd'T'HH:MM:ss.l'Z'o", labelPrefix: "[Xcalar ExpServer ", labelSuffix: "]" });
    }
    var xcConsole = require('./utils/expServerXcConsole.js');
    var cookieFilter = require('./utils/cookieFilter.js');
    var sessionFilter = require('./utils/sessionFilter.js');

    var xlrRoot = null;

    bootstrapXlrRoot();

    var session = require('express-session');
    var sessionAges = require('./utils/expServerSupport.js').default.sessionAges;
    var defaultSessionAge = require('./utils/expServerSupport.js').default.defaultSessionAge;
    var sessionOpts = {};

    var awsEc2MetadataAddr = 'http://169.254.169.254/latest/dynamic/instance-identity/document';
    var nodeCloudOwner = null;

    var sessionSecret = 'keyboard cat';
    // XXX tempoary put export here due to file require order issue
    // as a refactor, this should be put to a separate module
    exports.sessionSecret = sessionSecret;
    var userActivityManager = require("./controllers/userActivityManager").default;
    var cloudManager = require("./controllers/cloudManager").default;

    if (cloudMode === 0) {
        var FileStore = require('session-file-store')(session);

        var fileStoreOptions = {
            path: path.join(xlrRoot, 'auth'),
            secret: sessionSecret
        };

        sessionOpts = {
            saveUninitialized: false,
            resave: false,
            rolling: true,
            store: new FileStore(fileStoreOptions),
            secret: fileStoreOptions.secret,
            cookie: { maxAge: sessionAges[defaultSessionAge] }
        };
    } else {
        var AWS = require('aws-sdk');
        var DynamoDBStore = require('connect-dynamodb')(session);

        var cloudSessionTable = process.env.XCE_CLOUD_SESSION_TABLE ?
            process.env.XCE_CLOUD_SESSION_TABLE : 'SessionTable';
        var cloudRegion = process.env.XCE_CLOUD_REGION ?
            process.env.XCE_CLOUD_REGION : 'us-west-2';
        var cloudPrefix = process.env.XCE_CLOUD_PREFIX ?
            process.env.XCE_CLOUD_PREFIX : 'xc';
        var cloudHashKey = process.env.XCE_CLOUD_HASH_KEY ?
            process.env.XCE_CLOUD_HASH_KEY : 'id';

        var dynamoDbOpts = {
            table: cloudSessionTable,
            AWSRegion: cloudRegion,
            hashKey: cloudHashKey,
            prefix: cloudPrefix,
            readCapacityUnits: 5,
            writeCapacityUnits: 5
        };

        sessionOpts = {
            saveUninitialized: false,
            resave: false,
            rolling: true,
            store: new DynamoDBStore(dynamoDbOpts),
            secret: sessionSecret,
            cookie: { maxAge: sessionAges[defaultSessionAge] }
        };
    }
    var cookieFilterOptions = {
        paths: [ '/login',
                 '/auth/serviceSession' ],
        cookieNames: [ 'connect.sid', 'jwt_token' ]
    };

    var express = require('express');
    var bodyParser = require("body-parser");
    var cookieParser = require('cookie-parser');
    var serverCookieParser = cookieParser(sessionOpts.secret);
    var session = require('express-session');
    var serverSession = session(sessionOpts);
    var http = require("http");
    var httpProxy = require('http-proxy');
    require("shelljs/global");
    var exec = require("child_process").exec;
    var proxy = require('express-http-proxy');
    var url = require('url');
    var socket = require('./controllers/socket.js').default.socketIoServer;
    var Xcrpc = require('xcalarsdk');

    var serverPort = process.env.XCE_EXP_PORT ?
        parseInt(process.env.XCE_EXP_PORT) : 12124;
    if (process.env.NODE_ENV === "test") {
        // For expServer test
        serverPort = 12224;
    }

    var thriftPort = process.env.XCE_THRIFT_PORT ?
        parseInt(process.env.XCE_THRIFT_PORT) : 9090;
    var jupyterPort = process.env.XCE_JUPYTER_PORT ?
        parseInt(process.env.XCE_JUPYTER_PORT) : 8890;

    var support = require('./utils/expServerSupport.js').default;
    if(process['env']['NODE_ENV'] == 'dev') {
        support.checkAuthImpl = (req, res, next) => {next();}
        support.checkAuthAdminImpl = (req, res, next) => {next();}
        support.checkProxyAuthImpl = (req, res) => {return true;}
    }

    var sessionFilterOptions = {
        paths: [ '/service/xce' ],
        sessionMiddleware: serverSession
    };
    var serverSessionFilter = sessionFilter(sessionFilterOptions);

    var payloadSizeLimit = '25mb';
    var app = express();
    var appJupyter = express();

    app.use(cookieFilter(cookieFilterOptions));
    app.use(serverCookieParser);
    app.use(serverSessionFilter);

    // these header modifications must come before the
    // thrift proxy because a filter failure sends a
    // a completed response that can't be modified
    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, OPTIONS");
        res.header("Access-Control-Allow-Credentials", "true");
        next();
    });

    // proxy thrift requests to mgmtd
    // must be after the serverSession so the proxy
    // can filter using the session data
    app.use('/thrift/service', proxy('localhost:' + thriftPort, {
        filter: function(req, res) {
            return support.checkProxyAuth(req, res, 'thrift');
        },
        proxyReqPathResolver: function(req) {
            req.setTimeout(14400000);  // set socket timeoout (timeout does not work)
            return url.parse(req.url).path;
        },
        proxyErrorHandler: function(err, res, next) {
            switch (err && err.code) {
               case 'ECONNRESET': {
                  xcConsole.error('ECONNRESET error on proxy', err);
                  return res.status(502).send('ECONNRESET proxy error causing 502');
               }
               case 'ECONNREFUSED': {
                  xcConsole.error('ECONNREFUSED error on proxy', err);
                  return res.status(502).send('ECONNREFUSED proxy error causing 502');
               }
            }
            xcConsole.error('error on proxy', err);
        },
        limit: payloadSizeLimit ,
        parseReqBody: true  // GUI-13416 - true is necessary for thrift to work
    }));

    if (process.env.XCE_CORS === "1") {
        var cors = require('cors');
        app.use(cors({ "origin": true, "credentials": true }));
    }

    // increase default limit payload size of 100kb
    // must be after thrift proxy; the body parser
    // parses the thrift if it is not
    app.use(bodyParser.urlencoded({extended: false, limit: payloadSizeLimit}));
    app.use(bodyParser.json({limit: payloadSizeLimit}));
    // End of generic setup stuff

    // Invoke the Installer router
    app.use(require('./route/installer.js').router);

    // Invoke the Service router
    app.use(require('./route/service.js').router);

    // Invoke the Tutorial router
    app.use(require('./route/tutorial.js').router);

    // Invoke the Login router
    app.use(require('./route/login.js').router);

    // Invoke the Authentication router
    app.use(require('./route/auth.js').router);

    appJupyter.use(serverCookieParser);
    appJupyter.use(serverSession);

    // proxy jupyter requests
    appJupyter.use('/jupyter', proxy('localhost:' + jupyterPort, {
        filter: function(req, res) {
            return support.checkProxyAuth(req, res, 'jupyter');
        },
        proxyReqPathResolver: function(req) {
            req.setTimeout(14400000);  // set socket timeoout (timeout does not work)
            return req.originalUrl;
        },
        proxyErrorHandler: function(err) {
            switch (err && err.code) {
               case 'ECONNRESET': {
                  xcConsole.error('ECONNRESET error on proxy', err);
                  return res.status(502).send('ECONNRESET proxy error causing 502');
               }
               case 'ECONNREFUSED': {
                  xcConsole.error('ECONNREFUSED error on proxy', err);
                  return res.status(502).send('ECONNREFUSED proxy error causing 502');
               }
            }
            xcConsole.error('error on proxy', err);
        },
        limit: payloadSizeLimit
    }));

    function bootstrapXlrRoot() {
        var cfgLocation =  process.env.XCE_CONFIG ?
        process.env.XCE_CONFIG : '/etc/xcalar/default.cfg';
        xlrRoot = process.env.XCE_INSTALLER_ROOT ?
            process.env.TMPDIR : '/mnt/xcalar';
        var cfgExists = fs.existsSync(cfgLocation);
        var xlrRootFound = false;
        var rePattern = new RegExp(/^Constants.XcalarRootCompletePath\s*=\s*(.*)$/);

        if (cfgExists) {
            var buf = fs.readFileSync(cfgLocation, 'utf-8');
            var lines = buf.split("\n");
            for (var i = 0; i<lines.length; i++) {
                var res = lines[i].trim().match(rePattern);
                if (res != null) {
                    xlrRoot = res[1];
                    xlrRootFound = true;
                    break;
                }
            }
        }

        if (!cfgExists || !xlrRootFound) {
            console.log(xcConsole);
            xcConsole.error('Config file ' + cfgLocation + 'does not exist or XcalarRootCompletePath not found');
            xcConsole.error('Using default XcalarRootCompletePath ' + xlrRoot);
        }
    }

    // Invoke the sqlApi router
    app.use(require('./route/sql.js').router);

    // Invoke the xcrpc router
    app.use(require('./route/xcrpc.js').router);

    require('./utils/dag/dagUtils.js');

    function getOperatingSystem() {
        var deferred = jQuery.Deferred();
        var out = exec("cat /etc/*release");
        var output = "";
        out.stdout.on('data', function(data) {
            output += data;
        });
        out.stderr.on('data', function(err) {
            xcConsole.log("Failure: Get OS information " + err);
            deferred.reject("Fail to get OS info");
        });
        out.on('close', function(code) {
            if (code) {
                xcConsole.log("Failure: Get OS information " + code);
                deferred.reject("Fail to get OS info");
            } else {
                deferred.resolve(output);
            }
        });
        return deferred.promise();
    }

    function getCloudIdentity() {
        if (cloudMode == 0) {
            return jQuery.Deferred().resolve().promise();
        }

        var request = require('request-promise-native');
        var deferred = jQuery.Deferred();

        request.get(awsEc2MetadataAddr, function(err, res, body) {
            if (err) {
                xcConsole.log(`Failure: Get cloud identity ${err}`);
                return deferred.reject("Failed to get cloud identity");
            }

            return deferred.resolve(JSON.parse(body));
        });

        return deferred.promise();
    }

    function getCloudTags(ec2Data) {
        if (cloudMode == 0) {
            return jQuery.Deferred().resolve().promise();
        }

        xcConsole.log(`EC2 data: ${JSON.stringify(ec2Data)}`);

        var deferred = jQuery.Deferred();

        AWS.config.credentials = new AWS.EC2MetadataCredentials();
        cloudInstanceId = ec2Data.instanceId;
        var ec2 = new AWS.EC2({region: ec2Data.region});

        var params = {
            InstanceIds: [
                ec2Data.instanceId
            ],
            Filters: [
                { Name: "tag-key",
                  Values: [ "Owner" ] }
            ]
        };

        ec2.describeInstances(params, function(err, data) {

            if (err) {
                xcConsole.log(`Failure: Get owner tag ${err}`);
                deferred.reject("Failed to get owner tag");
                return;
            }

            //xcConsole.log(`Tag data: ${JSON.stringify(data)}`);

            if (data && data.Reservations && data.Reservations[0] &&
                data.Reservations[0].Instances && data.Reservations[0].Instances[0] &&
                data.Reservations[0].Instances[0].Tags) {
                var ownerTag = null;
                var tags = data.Reservations[0].Instances[0].Tags;
                for (idx in tags) {
                    if (tags[idx].Key == "Owner") {
                        ownerTag = tags[idx].Value;
                    }
                }

                if (!ownerTag) {
                    xcConsole.log(`Got tag data but could not find owner tag: ${JSON.stringify(data)}`);
                    deferred.reject("Failed to find owner tag in tag data");
                }

                nodeCloudOwner = ownerTag;
                xcConsole.log(`Cloud owner is ${nodeCloudOwner}`);
                deferred.resolve();
            } else {
                xcConsole.log(`Got owner tag but could not find owner name: ${JSON.stringify(data)}`);
                deferred.reject("Failed to find owner name in owner tag data");
            }
        });

        return deferred.promise();
    }

    function getNodeCloudOwner() {
        return nodeCloudOwner;
    }

    function getExpServerPort() {
        return serverPort;
    }

    function getThriftPort() {
        return thriftPort;
    }

    function getJupyterPort() {
        return jupyterPort;
    }

    function getCertificate(data) {
        var ca = '';
        if (data.indexOf("centos") > -1) {
            xcConsole.log("Operation System: CentOS");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("ubuntu") > -1) {
            xcConsole.log("Operation System: Ubuntu");
            ca = '/etc/ssl/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("red hat") > -1 || data.indexOf("redhat") > -1) {
            xcConsole.log("Operation System: RHEL");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        } else if (data.indexOf("oracle linux") > -1) {
            xcConsole.log("Operation System: Oracle Linux");
            ca = '/etc/pki/tls/certs/XcalarInc_RootCA.pem';
        }
        if (ca !== '' && fs.existsSync(ca)) {
            xcConsole.log('Loading trusted certificates from ' + ca);
            try {
                require('ssl-root-cas').addFile(ca).inject();
                xcConsole.log("Success: Loaded CA");
            } catch (e) {
                xcConsole.log("Failure: Loaded ca: " + ca + " !" +
                    "https will not be enabled!");
            }
        } else {
            xcConsole.log('Xcalar trusted certificate not found');
        }
        return ca;
    }

    getCloudIdentity()
    .then(function(data) {
        return getCloudTags(data);
    })
    .then(function() {
        return getOperatingSystem();
    })
    .always(function(data) {
        data = data.toLowerCase();
        // This is helpful for test and variable can be used in future development
        var ca = getCertificate(data);

        var httpServer = http.createServer(app);
        socket(httpServer, serverSession, serverCookieParser);
        var port = serverPort;

        httpServer.on('clientError', function(err, httpSocket){
            function replaceErrors(key, value) {
                if (value instanceof Error) {
                    var error = {};

                    Object.getOwnPropertyNames(value).forEach(function (key) {
                        error[key] = value[key];
                    });

                    return error;
                }

                return value;
            }

            xcConsole.error('error on error handler', err);
            message = JSON.stringify({'error': err }, replaceErrors);
            httpSocket.end('HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n' + message + '\r\n');
        });

        httpServer.listen(port, function() {
            var hostname = process.env.DEPLOY_HOST;
            if (!hostname) {
                hostname = "localhost";
            }
            xcConsole.log("All ready, Listen on port " + port);
            process.env.XCE_EXP_PORT = port;

            // Create local xcrpc client
            const url = "http://" + hostname + ":" + port + "/service/xce";
            Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);
            if (cloudMode) {
                cloudManager.setup(getNodeCloudOwner(), cloudInstanceId);
                userActivityManager.updateUserActivity();
            }

            if (process.env.NODE_ENV === "test") {
                exports.server = httpServer;
            }
        });


        var httpServerJupyter = http.createServer(appJupyter);
        var proxyServer = httpProxy.createProxyServer({
           target: {
              host: 'localhost',
              port: jupyterPort
           }
        });
        httpServerJupyter.listen((port + 1), function() {
            xcConsole.log("All ready, Listen on port " + (port + 1));
        });
        httpServerJupyter.on('upgrade', function(req, socket, head) {
            xcConsole.log('ws upgrade request', req.url);
            proxyServer.ws(req, socket, head);
        });
    });

    process.on('uncaughtException', function(err) {
        xcConsole.error('process.on handler', err);
    });

    function fakeBootstrapXlrRoot(func) {
        bootstrapXlrRoot = func;
    }

    exports.getNodeCloudOwner = getNodeCloudOwner;
    exports.getExpServerPort = getExpServerPort;
    exports.getThriftPort = getThriftPort;
    exports.getJupyterPort = getJupyterPort;

    if (process.env.NODE_ENV === "test") {
        exports.getOperatingSystem = getOperatingSystem;
        exports.getCertificate = getCertificate;
        exports.bootstrapXlrRoot = bootstrapXlrRoot;
        exports.fakeBootstrapXlrRoot = fakeBootstrapXlrRoot;
        exports.xlrRoot = xlrRoot;
    }
});
