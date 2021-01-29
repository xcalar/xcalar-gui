var cp = require("child_process");
var aws = require('aws-sdk');

exports.handler = function(event, context) {
    console.log("Received get request for ticket list");
    console.log(JSON.stringify(event));
    var contents = JSON.stringify(event, null, 4);
    getTickets(contents, context);
};

function getTickets(contents, context) {
    var contentsObj = JSON.parse(contents);
    console.log(contents);
    var customerId = contentsObj.userId;
    var ticketId = contentsObj.ticketId;

    var cmd;
    if (ticketId) {
        cmd = 'curl https://myxcalar.zendesk.com/api/v2/tickets/' + ticketId + '/comments.json' +
                    ' -H "Content-Type: application/json"' +
                    ' -v -u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej';
    } else {
        cmd = 'curl https://myxcalar.zendesk.com/api/v2/search.json' +
                    ' -G --data-urlencode "query=type:ticket tags:xcuser-' + customerId + '"' +
                    ' -v -u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej';
    }
    var out = cp.exec(cmd);
    console.log(cmd);
    var success = false;
    var stringifiedStruct = "";
    out.stdout.on("data", function(data) {
        console.log(data);
        stringifiedStruct += data;
    });
    out.on('close', function() {
        console.log("closed");

        var jstruct = JSON.parse(stringifiedStruct);
        console.log(stringifiedStruct);
        if (jstruct) {
            console.log("Success!");
            console.log(jstruct);
            var res = {};
            if (ticketId) { // getting comments
                res.type = "comments";
                var comments = jstruct.comments;
                var commentList = [];
                for (var i = 0; i < comments.length; i++) {
                    var comment = decodeURIComponent(comments[i].body);
                    var from = "xcalar";
                    try {
                        var tempComment = JSON.parse(comment);
                        if (tempComment.comment) {
                            comment = tempComment.comment;
                            from = "user";
                        }
                    } catch (err) {
                        console.log("error", err);
                    }
                    commentList.push({
                        author_id: comments[i].author_id,
                        comment: comment,
                        created_at: comments[i].created_at,
                        from: from
                    });
                }
                res.comments = commentList;
            } else {
                res.type = "tickets";
                var tickets = jstruct.results;
                var ticketList = [];
                for (var i = 0; i < tickets.length; i++) {
                    var comment = decodeURIComponent(tickets[i].description);
                    var subject = decodeURIComponent(tickets[i].subject);
                    var severity = getSeverity(tickets[i].priority);
                    try {
                        var tempComment = JSON.parse(comment);
                        if (tempComment.comment) {
                            comment = tempComment.comment;
                        }
                    } catch (err) {
                        console.log("error", err);
                    }
                    ticketList.push({
                        created_at: tickets[i].created_at,
                        comment: comment,
                        id: tickets[i].id,
                        subject: subject,
                        status: tickets[i].status,
                        submitter_id: tickets[i].submitter_id,
                        updated_at: tickets[i].updated_at,
                        severity: severity
                    });
                }
                res.tickets = ticketList;
            }
            context.done(null, res);
            return;
        } else {
            if (jstruct.error) {
                console.log("Error:");
                context.done(null, {result: jstruct});
            }
        }
    });
}

function getSeverity(priority) {
    var severityMap = {
        "urgent": 1,
        "high": 2,
        "normal": 3,
        "low": 4,
    };
    if (severityMap[priority]) {
        return severityMap[priority];
    } else {
        return null;
    }
}
