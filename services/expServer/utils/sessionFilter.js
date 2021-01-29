var xcConsole = require('./expServerXcConsole.js').xcConsole;

module.exports = function(options) {
    var opts = options || {};

    var filterPaths = opts.paths || [];
    var sessionMiddleware = opts.sessionMiddleware;

    return function(req, res, next) {
        if (filterPaths.indexOf(req.url) > -1) {
            //xcConsole.log(`No session disk access for url ${req.url} on ${process.pid}!`);
            next();
        } else {
            sessionMiddleware(req, res, next);
        }
    };
}
