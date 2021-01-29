var socketio = require("socket.io");
module.exports = function(httpServer) {
    function sendToSlack(action, url, msg, callback) {
        jQuery.ajax({
            "type": action,
            "data": jQuery.param(msg, false),
            "contentType": "application/x-www-form-urlencoded",
            "url": url,
            success: function(ret) {
                if (callback) {
                    callback(ret.ts);
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    }
    function sendToPagerDuty(opts) {
        var mailOpts = {
            from: opts.email,
            to: 'zendesk-pagerduty@xcalar.pagerduty.com',
            subject: 'LiveChat request from ' + opts.fullName + '(' + opts.userName + ')',
            text: "This is a test to make sure livechat request is delivered."
        };
        transporter.sendMail(mailOpts, function(error, info) {
            if(error) {
                console.log(error);
            } else {
                console.log('Email sent to PagerDuty: ' + info.response);
            }
        });
    }
    // Setup node mailer
    var nodemailer = require('nodemailer');
    try {
        var aws = require("aws-sdk");
        aws.config.update({
            accessKeyId: 'AKIAJ74PQDYLUDUK3LAQ',
            secretAccessKey: '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',
            region: 'us-west-2'
        });
        var ses = new aws.SES();
    } catch (error) {
        console.log("Failure: set up AWS! " + error);
    }
    var transporter = nodemailer.createTransport({"SES": ses});

    // Websocket for Live Help
    var io = socketio(httpServer);

    io.sockets.on("connection", function(socket) {
        socket.on("liveHelpConn", function(opts) {
            console.log("User :" + opts.userName + " registered");
            var attachments = [{
                "fields": [
                    {
                        "title": "Username",
                        "value": opts.userName,
                        "short": true
                    },
                    {
                        "title": "Email",
                        "value": opts.email,
                        "short": true

                    }
                ],
                "fallback": "You are unable to display the message",
                "callback_id": "support_requeset",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "yes",
                        "text": "Accept",
                        "type": "button",
                        "value": "yes"
                    }
                ]
            }]
            var msg = {
                "token": "xoxb-253880496849-rxXqzBqi08LySHxnZnFQS4fj",
                "channel": "#live_chat_test",
                "text": "*Customer Support Request*",
                "as_user": true,
                "attachments": JSON.stringify(attachments)
            }
            sendToSlack("POST", "https://slack.com/api/chat.postMessage", msg,
                function(thread) {
                    socket.join(thread);
                    socket.emit("joinRoom", thread);
                    //sendToPagerDuty(opts);
                    console.log("user " + opts.userName + " joined room: " + thread);
                });
        });
        socket.on("liveHelpMsg", function(message) {
            var msg = {
                "token": "xoxb-253880496849-rxXqzBqi08LySHxnZnFQS4fj",
                "channel": "#live_chat_test",
                "text": message.content,
                "as_user": true,
                "thread_ts": message.room
            }
            sendToSlack("POST", "https://slack.com/api/chat.postMessage", msg);
        });
        socket.on("sendEmail", function(mailOpts, callback) {
            transporter.sendMail(mailOpts, function(error, info) {
                if(error) {
                    console.log(error);
                } else {
                    console.log('Email sent to: ' + info.response);
                    callback();
                }
            });
        });
    });
    return io;
};
