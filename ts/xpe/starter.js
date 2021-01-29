// nwjs entrypoint for Xcalar Design EE
// set nwjs package.json 'main' attr to this file and run nwjs
// runs in node context; there are no Windows open when this file runs

        // step 1:: set vars that need to be accessible to all js during nwjs process
        // ('global' var accessible to all js running both in node and browser context)

// all the env vars here are set by app's bash entrypoint
global.dev = process.env.XPE_IS_DEV || true;
global.grafana = process.env.INSTALL_GRAFANA || false;

// set path to curr server log if created in app entrypoint,
// so can print in failure msgs
if (process.env.XPE_CURR_LOG_PATH_SERVER) {
    global.serverLogPath = process.env.XPE_CURR_LOG_PATH_SERVER
}

var xpeServerPort = process.env.XPE_SERVER_PORT || "8388";
var xpeServerHostname = process.env.XPE_SERVER_HOSTNAME || "127.0.0.1";
var xpeServerProtocol = process.env.XPE_SERVER_PROTOCOL || "http";
var xpeServerUrl = xpeServerProtocol + "://" + xpeServerHostname + ":" + xpeServerPort;
global.xpeServerUrl = xpeServerUrl;
// keep track if XD window has been auto-maximized
// (only want to maximize index/login on initial app open, not on refresh, etc.)
global.maximized = false;

/**
    need to globally keep track of which windows are opened,
    so can check before opening new windows if they are already open,
    and can focus in that case instead of opening a new one.
    Each GUI has xpeSharedContextUtils.js running in browser;
    opened windows added to this var in XpeSharedContextUtils.launch
*/
global.nwWindows = {};

// URLs for known sections; should be abs URL or
// path rel nwjs' root (where package.json is run)
global.installerURL = process.env.XPE_INSTALLER_URL || "xpe/xpeInstaller.html";
global.uninstallerURL = process.env.XPE_UNINSTALLER_URL || "xpe/xpeUninstaller.html";
global.xdURL = process.env.XD_URL || "index.html";
global.grafanaURL = process.env.GRAFANA_URL || "http://127.0.0.1:8082";
global.revertURL = process.env.XPE_IMT_URL || "xpe/xpeImageManagementTool.html";
global.dockerStarterURL = process.env.DOCKER_STARTER_URL || "xpe/xpeDockerStarter.html";
// nwjs window configs; second arg to nw.Window.open
global.dockerStarterWindowConfig = {
    "width": 350,
    "height": 87,
    "position": "center",
    "resizable": true
};
global.xpeWindowConfig = {
    width: 804,
    height: 526,
    position: "center",
    resizable: false
};
global.xdWindowConfig = {
    "min_width": 1024,
    "min_height": 768
};
global.grafanaWindowConfig = {
    "min_width": 880,
    "min_height": 620,
};
global.revertWindowConfig = {
    "width": 1100,
    "height": 650
};

var jQuery = require("jquery"); // need for the next 2 imports
var PromiseHelper = require('./assets/js/promiseHelper.js');
var XpeSharedContextUtils = require('./assets/js/xpe/xpeSharedContextUtils.js');

            // step 2:: open initial Window

/**
    app's bash entrypoint emits env var XPESTARTACTION
    gets set to specific value (install, uninstall, etc.) on initial app open
    (or if cmd param passed to app entrypoint), but full URL for restarts done
    via launchfile.
    install, uninstall, etc., have specific configurations to how those windows
    should open, so handle these cases individually
    if no env var open to XD. (@TODO - get rid of individual functions for the
    specific cases (openXD, openInstaller, etc.), and just make general method
    (launchInitialWindow) handle?
*/
var windowPromise;
if (process.env.XPESTARTACTION) {
    console.log("xpestartaction set");
    switch (process.env.XPESTARTACTION) {
        case ("install"):
            windowPromise = XpeSharedContextUtils.openInstaller();
            break;
        case ("uninstall"):
            windowPromise = XpeSharedContextUtils.openUninstaller();
            break;
        case ("revert"):
            windowPromise = XpeSharedContextUtils.openReverter();
            break;
        case ("xd"):
            windowPromise = XpeSharedContextUtils.openXD();
            break;
        default:
            // no specific direction; this should be an URL or path
            // rel to nwjs; if so will launch it
            console.log("couldn't determine pre-defined section; launch general " + process.env.XPESTARTACTION);
            windowPromise = XpeSharedContextUtils.launchInitialWindow(process.env.XPESTARTACTION);
            break;
    }
} else {
    console.log("open xd (no start action set)");
    windowPromise = XpeSharedContextUtils.openXD();
}

// quit the app by killing nwjs process if was not able
// to open a Window, else app will stay running even though
// no GUI and no indication what's going on, and user will
// have to kill app themself in dock/force stop
if (typeof windowPromise === 'undefined') {
    console.log("No promise for initial nwjs Window open - this is a bug");
    XpeSharedContextUtils.quitNwjs();
} else {
    windowPromise
    .fail(function(res) {
        console.log("Nwjs failed to open window!");
        console.log(res);
        XpeSharedContextUtils.quitNwjs();
    });
}
