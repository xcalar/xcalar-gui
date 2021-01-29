var jsdom = require("jsdom");
jsdom.env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
    var express = require('express');
    var app = express();
    var path = require('path');
    var http = require('http');
    var bodyParser = require("body-parser");
    app.use(express.static(path.join(__dirname + '/static')));
    app.use(express.static(path.join(__dirname + '/node_modules')));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    // Invoke the Tutorial router
    app.use(require('./route/tutorial.js').router);
    app.get('/extmgmt', (req, res) => {
        res.sendFile(path.join(__dirname + '/static/assets/html/extmgmt.html'));
    })
    var httpServer = http.createServer(app);
    httpServer.listen(12124, function() {
        var hostname = process.env.DEPLOY_HOST;
        if (!hostname) {
            hostname = "localhost";
        }
        console.log("All ready");
    });

});
