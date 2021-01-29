var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var exec = require('child_process').exec;
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// app.get('/*', function(req, res) {
//     res.send('Please use post instead');
// });

function parseData(data) {
    console.log("start");
    console.log(data);
    console.log("end");
}

function redirect(url, textToDisplay) {
    return '<html><head><meta http-equiv="refresh" content="0; url=' + url +
            '" /></head><body>' + textToDisplay + '</body></html>';
}

app.get("/stop/:vmname", function(req, res) {
    console.log("Stopping: " + req.params.vmname);
    if (!req.params.vmname.startsWith("preview-")) {
        res.send("Cannot shut down non preview vm " + req.params.vmname);
    } else {
        var out = exec("gce-control.sh stop " + req.params.vmname + " 2>&1");
        var logs = "";
        out.stdout.on("data", function(d) {
            logs += d;
        });
        out.on("close", function(code) {
            console.log("Closed");
            res.send({"exitCode": code,
                      "output": logs});
        });
    }
});

app.get("/start/:vmname", function(req, res) {
    console.log("Starting: " + req.params.vmname);
    if (!req.params.vmname.startsWith("preview-")) {
        res.send("Cannot start up non preview vm " + req.params.vmname);
    } else {
    vmStatus[req.params.vmname] = {complete: false};
        var out = exec("gce-control.sh start " + req.params.vmname + " 2>&1");
        var logs = "";
        res.send(redirect("https://zd.xcalar.net/rest/block/" +
                          req.params.vmname, "Starting VM, please wait... " +
                          "(approximately 2 minutes). Please do not refresh " +
                          "your browser."));

        out.stdout.on("data", function(d) {
            logs += d;
        });
        out.on("close", function(code) {
            if (vmStatus && vmStatus[req.params.vmname]) {
                if (vmStatus[req.params.vmname].resObj) {
                    var blockRes = vmStatus[req.params.vmname].resObj;
                    if (code) {
                        console.log("Failed");
                        blockRes.send({"exitCode": code,
                                   "output": logs});
                    } else {
                        console.log("Redirecting");
                        try {
                            blockRes.send(redirect("https://" +
                                          req.params.vmname +
                                          ".xcalar.cloud/", "Please wait, " +
                                          "redirecting..."));
                        } catch (e) {
                            console.log(e);
                        }
                    }
                } else {
                    console.log("Already completed");
                    vmStatus[req.params.vmname].complete = true;
                }
            }
        });
    }
});

app.get("/block/:vmname", function(req, res) {
    console.log("Blocking");
    if (vmStatus && vmStatus[req.params.vmname] && vmStatus[req.params.vmname].complete) {
        console.log("Already complete");
        res.send(redirect("https://" + req.params.vmname + ".xcalar.cloud/",
                          "Please wait, redirecting..."));
    } else {
        console.log("Not yet complete");
        if (!vmStatus || !vmStatus[req.params.vmname]) {
            res.send(redirect("https://zd.xcalar.net/rest/start/" +
                              req.params.vmname + "/",
                              "Starting VM, please wait... "));
        } else {
            vmStatus[req.params.vmname].resObj = res;
        }
    }
});

var vmStatus = {};
var httpServer = http.createServer(app);
var port = 12126;
httpServer.listen(port, function() {
    console.log("All ready");
});
