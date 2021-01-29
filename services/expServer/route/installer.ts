import { Router } from "express";
export const router = Router();
import * as xcConsole from "../utils/expServerXcConsole";
import { httpStatus } from "../../../assets/js/httpStatus";
import installerManager from "../controllers/installerManager";
import support from "../utils/expServerSupport";

router.post('/xdp/license/verification', function(req, res) {
    xcConsole.log("Checking License");
    let credArray = req.body;
    installerManager.checkLicense(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/installation/status", function(req, res) {
    xcConsole.log("Checking Install Status");
    let credArray = req.body;
    installerManager.createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/installation/start", function(req, res) {
    xcConsole.log("Installing Xcalar");
    let credArray = req.body;
    installerManager.installXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});


router.post("/xdp/discover", function(req, res) {
    xcConsole.log("Discovering Xcalar");
    let credArray = req.body;
    let copied = JSON.parse(JSON.stringify(credArray));
    delete copied.credentials;
    xcConsole.log(JSON.stringify(copied));
    installerManager.discoverXcalar(credArray)
    .fail(function (message) {
        res.status(message.status).send(message);
    })
    .done(function (discoveryResult) {
        let msg = {
            "status": httpStatus.OK,
            "discoverResult": discoveryResult
        };
        res.status(msg.status).send(msg);
    });
});

router.post("/xdp/upgrade/status", function(req, res) {
    xcConsole.log("Checking Upgrade Status");
    let credArray = req.body;
    installerManager.createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/upgrade/start", function(req, res) {
    xcConsole.log("Upgrading Xcalar");
    let credArray = req.body;
    installerManager.upgradeXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});

router.post("/xdp/uninstallation/status", function(req, res) {
    xcConsole.log("Checking Uninstall Status");
    let credArray = req.body;
    installerManager.createStatusArray(credArray)
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

router.post("/xdp/uninstallation/start", function(req, res) {
    xcConsole.log("Uninstalling Xcalar");
    let credArray = req.body;
    installerManager.uninstallXcalar(credArray);
    // Immediately ack after starting
    res.send({"status": httpStatus.OK});
    xcConsole.log("Immediately acking runInstaller");
});

router.post("/xdp/installation/cancel", function(req, res) {
    xcConsole.log("Cancelled installation");
    res.send({"status": httpStatus.OK});
});

router.get("/installationLogs/slave", function(req, res) {
    xcConsole.log("Fetching Installation Logs as Slave");
    support.slaveExecuteAction("GET", "/installationLogs/slave")
    .always(function(message) {
        res.status(message.status).send(message);
    });
});

//Below part is only for Unit Test
function fakeSlaveExecuteAction(func) {
    support.slaveExecuteAction = func;
}
if (process.env.NODE_ENV == "test") {
    exports.fakeSlaveExecuteAction = fakeSlaveExecuteAction;
}
