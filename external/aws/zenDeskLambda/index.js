var cp = require("child_process");
var aws = require('aws-sdk');
var request = require("request");
var zendeskToken = "ZHNoZXR0eUB4Y2FsYXIuY29tL3Rva2VuOjViNE5vSmt3YzM2dzJCUnd3MEg5RlFqZGhYYlpwbmFMZnJyN29aZWo=";

exports.handler = function(event, context) {
    console.log("Received ticket");
    console.log(JSON.stringify(event));
    var contents = JSON.stringify(event, null, 4);
    helper(contents, context);
};

function stripLogsAndKey(c) {
    c = JSON.parse(c);
    if (c.hasOwnProperty("xiLog") && c.xiLog.hasOwnProperty("logs")) {
        c.xiLog.logs = ["Refer to email for full dump"];
    }
    if (c.hasOwnProperty("xiLog")) {
        if (c.xiLog.hasOwnProperty("logs")) {
            c.xiLog.logs = ["Refer to email for full dump"];
        }
        if (c.xiLog.hasOwnProperty("errors")) {
            var xiLogs = c.xiLog;
            var errStr = JSON.stringify(c.xiLog.errors);
            var errorLimit = 50 * 1024;
            if (errStr.length > errorLimit) {
                var strErrors = "";
                // Note: XD has reverse the log order, so the first error
                // should be most recent one
                for (var i = 0; i < xiLogs.errors.length; i++) {
                    var strError = JSON.stringify(xiLogs.errors[i]);
                    if (strErrors.length + strError.length < errorLimit) {
                        if (strErrors.length) {
                            strErrors += ",";
                        }
                        strErrors += strError;
                    } else {
                        break;
                    }
                }
                strErrors = "[" + strErrors + "]";
                c.xiLog.errors = JSON.parse(strErrors);
            }
        }
        if (c.xiLog.hasOwnProperty("overwrittenLogs")) {
            c.xiLog.overwrittenLogs = ["Refer to email for full dump"];
        }
    }
    if (c.hasOwnProperty("license") && c.license && c.license.hasOwnProperty("key")) {
        delete c.license.key;
    }
    return c;
}

function helper(contents, ctx) {
    var contentsObj = JSON.parse(contents);
    var license = contentsObj.license;
    console.log("license", license);
    var isNew = (contentsObj.ticketId === null);
    if (!isNew && contentsObj.needsOrgCheck) {
        // calls fetch admin then submitTicket if there are no errors
        organizationCheck(contents, ctx, contentsObj);
    } else {
        if (license && license.organization) {
            // calls submitTicket if there are no errors
            fetchAdmin(contents, ctx, contentsObj, license.organization);
        } else {
            submitTicket(contents, ctx, contentsObj);
        }
    }
}

// fetches ticket to get the organization id, then calls
// organizationCheckPartTwo to get the organization info and compares it to
// the organization the user is under
function organizationCheck(contents, ctx, contentsObj) {
    if (!contentsObj.license || !contentsObj.license.organization) {
        ctx.done(null, {error: "User did not provide organization."});
        return;
    }

    var ticketId = contentsObj.ticketId;
    var cmd = {
        method: "GET",
        uri: `https://myxcalar.zendesk.com/api/v2/tickets/${ticketId}.json`,
        headers: {
            "Authorization": `Basic ${zendeskToken}`
        }
    };

    console.log("cmd", cmd);

    request(cmd, function(error, res, body) {
        console.log("ticket fetching completes", body);
        if (error) {
            console.log("ticket fetching  error", error);
            ctx.done(null, {error: "Error: Fetching previous ticket failed."});
            return;
        }
        try {
            var jstruct = JSON.parse(body);
            console.log("jstruct", jstruct);
            if (jstruct.ticket && jstruct.ticket.organization_id) {
                var orgId = jstruct.ticket.organization_id;
                console.log("orgId", orgId);
                organizationCheckPartTwo(contents, ctx, contentsObj, orgId);
            } else {
                if (jstruct.error) {
                    console.log("fetching fails", jstruct.error);
                }
                ctx.done(null, {error: "Ticket could not be found."});
            }
        } catch (error) {
            console.log("fetching ticket error", error);
            ctx.done(null, {error: "Fetching ticket failed."});
        }
    });
}

// get the organization info and compares it to
// the user's organization and submits ticket if successful
function organizationCheckPartTwo(contents, ctx, contentsObj, orgId) {
    var userOrgName = contentsObj.license.organization;
    var cmd = {
        method: "GET",
        uri: `https://myxcalar.zendesk.com/api/v2/organizations/${orgId}.json`,
        headers: {
            "Authorization": `Basic ${zendeskToken}`
        }
    };
    console.log("org info cmd", cmd);

    request(cmd, function(error, res, body) {
        console.log("org fetching completes", body);
        if (error) {
            console.log("org fetching error", error);
            ctx.done(null, {error: "Error: Fetching organization failed."});
            return;
        }

        try {
            var jstruct = JSON.parse(body);
            console.log("jstruct", jstruct);
            if (jstruct.organization && jstruct.organization.name) {
                var tickOrgName = jstruct.organization.name;
                console.log(tickOrgName, userOrgName);
                if (tickOrgName === userOrgName) {
                    console.log("ticket organization name matches user organization name");
                    fetchAdmin(contents, ctx, contentsObj, userOrgName);
                } else {
                    ctx.done(null, {error: "User does not belong to ticket organization."});
                }
            } else {
                ctx.done(null, {error: "Fetching organization failed."});
            }
        } catch (error) {
            console.log("fetching ticket error", error);
            ctx.done(null, {error: "Fetching organization failed."});
        }
    });
}

function fetchAdmin(contents, ctx, contentsObj, organizationName) {
    var url = "https://myxcalar.zendesk.com/api/v2/organizations/autocomplete.json?";
    var cmd = {
        method: "GET",
        uri: `${url}name=${encodeURI(organizationName)}`,
        headers: {
            "Authorization": `Basic ${zendeskToken}`
        }
    };

    console.log("fetch org cmd", cmd);
    request(cmd, function(error, res, body) {
        console.log("fetching organization completes", body);
        if (error) {
            console.log("fetching organization error", error);
            ctx.done(null, {error: "Error: Fetching organization failed."});
            return;
        }
        var stringifiedStruct = body;
        try {
            var jstruct = JSON.parse(stringifiedStruct);
            console.log("jstruct", jstruct);
            var organizationId = null;
            if (jstruct.organizations) {
                for (var i = 0; i < jstruct.organizations.length; i++) {
                    if (jstruct.organizations[i].name === organizationName) {
                        organizationId = jstruct.organizations[i].id;
                        break;
                    }
                }

                if (organizationId) {
                    getAdminFromOrganizationId(organizationName, organizationId);
                } else {
                    submitTicket(contents, ctx, contentsObj);
                }
            } else {
                if (jstruct.error) {
                    ctx.done(null, {error: "Fetching organization failed."});
                    console.log("fetching organization fails", jstruct.error);
                } else {
                    submitTicket(contents, ctx, contentsObj);
                }
            }
        } catch (error) {
            console.log("fetching organization error", error);
            ctx.done(null, {error: "Error: Fetching organization failed."});
        }
    });

    function getAdminFromOrganizationId(organizationName, organizationId) {
        var url = "https://myxcalar.zendesk.com/api/v2/search.json?";
        var cmd = {
            method: "GET",
            uri: `${url}${encodeURI('query=type:user tags:admin organization:\\"' + organizationName + '\\"')}`,
            headers: {
                "Authorization": `Basic ${zendeskToken}`
            }
        };
        console.log("orgAdmin cmd", cmd);
        request(cmd, function(error, res, body) {
            console.log("fetching org admin completes");
            if (error) {
                console.log("fetching organization error", error);
                ctx.done(null, {error: "Error: Fetching organization failed."});
                return;
            }
            var stringifiedStruct = body;
            try {
                var jstruct = JSON.parse(stringifiedStruct);
                console.log("jstruct", jstruct);
                if (jstruct.results && jstruct.results.length > 0) {
                    var admin;
                    for (var i = 0; i < jstruct.results.length; i++) {
                        if (jstruct.results[i].organization_id === organizationId) {
                            admin = {
                                name: jstruct.results[i].name,
                                email: jstruct.results[i].email
                            };
                            break;
                        }
                    }

                    if (admin) {
                        submitTicket(contents, ctx, contentsObj, admin);
                    } else {
                        submitTicket(contents, ctx, contentsObj);
                    }
                } else {
                    if (jstruct.error) {
                        ctx.done(null, {error: "Fetching admin failed."});
                        console.log("fetching fails");
                    } else {
                        submitTicket(contents, ctx, contentsObj);
                    }
                }
            } catch (error) {
                console.log("fetching admin error", error);
                ctx.done(null, {error: "Error: Fetching admin failed."});
            }
        });
    }
}


function submitTicket(contents, ctx, contentsObj, admin) {
    var customerName = contentsObj.userIdName;
    var customerId = contentsObj.userIdUnique;
    var subject = getContentSubject(contentsObj);
    var isNew = (contentsObj.ticketId === null);
    var trunContents = stripLogsAndKey(contents); // Remove logs to make ticket smaller
    trunContents = JSON.stringify(trunContents,null, 2);
    var email = "xi@xcalar.com";

    if (admin && admin.email) {
        email = admin.email;
    }
    if (contentsObj.isDataMart && contentsObj.email) {
        email = contentsObj.email;
        customerName = contentsObj.email;
    }
    var url;
    var method;
    if (isNew) {
        url = "https://myxcalar.zendesk.com/api/v2/tickets.json";
        method = "POST";
    } else {
        url = "https://myxcalar.zendesk.com/api/v2/tickets/" + contentsObj.ticketId + ".json";
        method = "PUT";
    }
    var severity = getSeverity(contentsObj.severity);

    var body = {
        ticket: {
            requester: {
                name: customerName,
                email: email
            },
            priority: severity,
            tags: ["xcuser-" + customerId],
             // use the tag xcuser-{customerId} so that we can search for all the tickets
            // from this user in zenDeskGetLambda
            comment: {
                body: trunContents
            }
        }
    };
    if (isNew) {
        body.ticket.subject = subject;
    }

    var cmd = {
        method: method,
        uri: `${url}`,
        headers: {
            "Authorization": `Basic ${zendeskToken}`
        },
        body: body,
        json: true
    };

    console.log(JSON.stringify(cmd, null, 2));

    request(cmd, function(error, res, body) {
        console.log("ticket sent");
        if (error) {
            console.log("sending ticket error", error);
            ctx.done(null, {error: "Error: Creating ticket failed."});
            return;
        }

        try {
            var jstruct = body;
            if (jstruct.ticket) {
                console.log("Success!");
                pushToSNS(contents, ctx, jstruct.ticket, admin);
                return;
            } else {
                if (jstruct.error) {
                    console.log("Error:");
                    pushToSNS(contents, ctx, "Failed");
                    ctx.done(null, {error: "Creating ticket failed."});
                }
            }
        } catch (error) {
            console.log("ticket creation error");
            console.log(error);
            ctx.done(null, {error: "Creating ticket failed."});
        }
    });
}

function pushToSNS(contents, ctx, ticket, admin) {
    var sns = new aws.SNS();
    var message;
    if(ticket == "Failed") {
        message = "Ticket creation failed. Here is the content of your ticket:\n" + contents;
    } else {
        message = "To reply to ticket, go to: https://myxcalar.zendesk.com/agent/tickets/" + ticket.id + "\n" + contents;
    }
    /*sns.publish({
        Message: message,
        TopicArn: 'arn:aws:sns:us-west-2:559166403383:zendesk-topic'
    }, function (err, data) {
        if (err) {
            console.log(err.stack);
            ctx.done(err, "Finished with Errors when pushing to SNS!");
            return;
        }
        console.log("push sent");
        console.log(data);
        if(ticket == "Failed") {
            ctx.done(null, {error: "Creating ticket failed."});
        } else {
            fetchAdmins(ticket, ctx);
        }
    });*/
    if (admin && admin.hasOwnProperty("email")) {
        ctx.done(null, {ticketId: ticket.id, admin: admin.email});
    } else {
        ctx.done(null, {ticketId: ticket.id, admin: "No admin"});
    }
}

function getSeverity(severity) {
    switch (severity) {
        case (1):
            return "urgent";
        case (2):
            return "high";
        case (3):
            return "normal";
        case (4):
            return "low";
        default:
            return "low"
    }
}

function getContentSubject(contentsObj) {
    var subject = "Ticket from " + contentsObj.userIdName;
    if (contentsObj.fromChat) {
        if (contentsObj.triggerPd) {
            subject = "LiveChat " + subject;
        } else {
            subject = "LiveChat(noPD) " + subject;
        }
    } else {
        if (contentsObj.subject && contentsObj.subject.length) {
            subject = contentsObj.subject;
        }
    }
    console.log("subject", subject);
    return subject;
}