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
    var socket = require("./socket.js");
    var bodyParser = require("body-parser");
    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
        next();
    });
    app.use(express.static(path.join(__dirname + '/node_modules')));
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.get('/', (req, res) => {
        res.send("Hello");
    })
    app.post('/slack/accept-request', (req, res) => {
        var payload = JSON.parse(req.body.payload);
        var msg = payload.original_message;
        var user = payload.user.name;
        var thread = payload.message_ts;
        // REMOVE "thread" LATER
        io.to(thread).emit("readyToChat",{supportName:"Xcalar", thread:thread});
        msg.attachments[0].footer = ":white_check_mark:<@" + user + "> accepted";
        msg.attachments[0].ts = payload.action_ts;
        delete msg.attachments[0]["actions"];
        console.log("msg_ts: "+thread);
        console.log("act_ts: "+payload.action_ts);
        res.jsonp(msg);
    });
    app.post('/slack/event', (req, res) => {
        console.log(req.body);
        var event = req.body.event;
        // It will listen to all message events, including messages from customer
        // We don't want them to be sent back
        if (event && event.user != event.parent_user_id) {
            if (event.hasOwnProperty("thread_ts")) {
                var thread = event.thread_ts;
                console.log("send to: "+thread);
                console.log("content: "+event.text);
                io.to(thread).emit("liveChatMsg", {content:event.text,sender:"Xcalar"})
            }
        }
        res.send(req.body.challenge);
    });
    var httpServer = http.createServer(app);
    var io = socket(httpServer);
    httpServer.listen(12124, function() {
        var hostname = process.env.DEPLOY_HOST;
        if (!hostname) {
            hostname = "localhost";
        }
        console.log("All ready");
    });

});


