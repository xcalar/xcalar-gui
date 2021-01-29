const fs = require('fs');
const path = require('path');
const corsProxy = require('../lib/cors-anywhere');

// Listen on a specific host via the XDEV_PROXY_HOST environment variable
const host = process.env.XDEV_PROXY_HOST || 'localhost';
// Listen on a specific port via the XDEV_PROXY_PORT environment variable
const port = process.env.XDEV_PROXY_PORT || 8899;
// Force not checking self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Self-signed certificates to start https
const keyFileName = path.resolve(__dirname, '../cert/key.pem');
const certFileName = path.resolve(__dirname, '../cert/cert.pem');

corsProxy.createServer({
    originWhitelist: [], // Allow all origins
    // requireHeader: ['origin', 'x-requested-with'], // Allow only cross domain requests
    removeHeaders: ['cookie', 'cookie2'],
    httpProxyOptions: {
        secure: false
    },
    httpsOptions: {
        key: fs.readFileSync(keyFileName),
        cert: fs.readFileSync(certFileName),
    }
}).listen(port, host, function() {
    console.log('Running xdev-proxy on ' + host + ':' + port);
});
