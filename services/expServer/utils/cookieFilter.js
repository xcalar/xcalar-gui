const cookie = require("cookie");

module.exports = function(options) {
    var opts = options || {};

    var filterPaths = opts.paths || [];
    var filterCookieNames = opts.cookieNames || [];

    return function(req, res, next) {
        if (req.headers.cookie) {
            var cookies = cookie.parse(req.headers.cookie);
            var newCookies = {};

            if ((cookies != null) &&
                (filterPaths.indexOf(req.path) > -1)) {

                for (var prop in cookies) {
                    if (filterCookieNames.indexOf(prop) <= -1) {
                        newCookies[prop] = cookies[prop];
                    }
                }

                var serializedCookies = [];
                for (var prop in newCookies) {
                    serializedCookies.push(cookie.serialize(prop, newCookies[prop]));
                }

                if (serializedCookies.length === 0) {
                    delete req.headers.cookie;
                } else {
                    req.headers.cookie = serializedCookies.join('; ');
                }
            }
        }
        next();
    };
}
