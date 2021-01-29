/**
 *  Functions used by XPE which run sometimes in the browser,
 *  and sometimes in node context (as a result of being called by
 *  nwjs' entrypoint)
 */
var XpeSharedContextUtils = (function(XpeSharedContextUtils) {

    // URL for sending the API requests
    var xpeServerUrl = global.xpeServerUrl;
    if (typeof xpeServerUrl === 'undefined') {
        console.log("ERROR: xpeServerUrl has not been set in global");
    }

    var dockerWaitDefault = 60; // secs to wait before timing out waiting for Docker to come up
    XpeSharedContextUtils.DOCKER_TIMEOUT = dockerWaitDefault;

    // window will always be defined in nwjs, even if this is running in node context,
    // but in node context, the attrs (window.dockerStatusStates, etc.) won't be defined
    // and must be required
    var dockerStatusStates = ((typeof window === 'undefined' || typeof window.dockerStatusStates === 'undefined') && typeof require !== 'undefined') ? require('./xpeServerResponses.js').dockerStatusStates : window.dockerStatusStates;
    var httpStatus = ((typeof window === 'undefined' || typeof window.httpStatus === 'undefined') && typeof require !== 'undefined') ? require('./../httpStatus.js').httpStatus : window.httpStatus;
    var XPEStr = ((typeof window === 'undefined' || typeof window.XPEStr === 'undefined') && typeof require !== 'undefined') ? require('./xpeJsStrs.js').XPEStr : window.XPEStr;

    /**
     * close all windows and quit the nwjs processes.
     * (nwjs has a 'quit' api for this, but it has a bug where
     * it fails to work if there are no windows open.
     * workaround is to open a hidden window before giving quit.)
     */
    XpeSharedContextUtils.quitNwjs = function() {
        nw.Window.open('', { show: false });
        nw.App.quit();
    };

    /**
        'global' vars used in this script are set up in nwjs
        entrypoint starter.js
    */

    XpeSharedContextUtils.dockerStatus = function() {
        var deferred = jQuery.Deferred();
        XpeSharedContextUtils.sendViaHttp("GET", xpeServerUrl + "/dockerStatus")
        .then(function(data) {
            if (typeof data === 'undefined') {
                deferred.reject("/dockerStatus resolved, but no data was " +
                    " returned by the server");
            } else {
                if (data.daemon) {
                    if (data.daemon === dockerStatusStates.UP ||
                        data.daemon === dockerStatusStates.DOWN) {
                        deferred.resolve(data.daemon);
                    } else {
                        deferred.reject("Not a valid response from Docker daemon: " +
                            data.daemon);
                    }
                } else {
                    deferred.reject("Did not receive expected value 'daemon' " +
                        " in server response." +
                        "\nResponse: " +
                        JSON.stringify(data) +
                        "\nExpected responses:" +
                        JSON.stringify(dockerStatusStates) +
                        "\nThis indicates bug in XPE. Please contact administrator");
                }
            }
        })
        .fail(function(error) {
            // right now this should only fail if Docker is not installed
            var errorMsg = JSON.stringify(error);
            if (error.errorLog) {
                errorMsg = error.errorLog;
            }
            deferred.reject(errorMsg);
        });
        return deferred.promise();
    };

    XpeSharedContextUtils.nwjsSetup = function(guiType="xd") {
        var ngui = require('nw.gui');
        var nwin = ngui.Window.get();

        // if nwjs window opened previously, use its custom menubar instead of
        // of recreating, unless XD - don't want installer's menu)
        if (!global.nwMenu || guiType === 'xd') {
            global.nwMenu = XpeSharedContextUtils.customizeNwjsMenus(guiType);
        }
        nwin.menu = global.nwMenu;

        // add shortcut keys for browser refresh and hard refresh
        document.onkeyup = function (e) {
            if (e.ctrlKey && e.which == 87) { // CTRL+w
                nwin.reloadIgnoringCache();
            } else if (e.ctrlKey && e.which == 88) { // CTRL+x
                nwin.reload();
            } else if (e.ctrlKey && e.which == 68) { // CTRL+d
                nwin.showDevTools();
            }
        };

        // remove right click context menu if non-dev build
        if (!global.dev) {
            document.oncontextmenu = function() {
                return false;
            }
        }
    };

    XpeSharedContextUtils.openGrafana = function() {
        return launch(global.grafanaURL, global.grafanaWindowConfig,
            false, false, false, false);
    };

    XpeSharedContextUtils.openInstaller = function(viaRestart=false, suppressWarning=false, closeCurr=false) {
        return launch(global.installerURL, global.xpeWindowConfig,
            closeCurr, false, viaRestart, suppressWarning);
    };

    XpeSharedContextUtils.openUninstaller = function(viaRestart=false, suppressWarning=false, closeCurr=false) {
        return launch(global.uninstallerURL, global.xpeWindowConfig,
            closeCurr, false, viaRestart, suppressWarning);
    };

    XpeSharedContextUtils.openReverter = function(viaRestart=false, suppressWarning=false, closeCurr=false) {
        return launch(global.revertURL, global.revertWindowConfig,
            closeCurr, false, viaRestart, suppressWarning);
    };

    XpeSharedContextUtils.openXD = function(viaRestart=false, suppressWarning=false, closeCurr=false) {
        return launch(global.xdURL, global.xdWindowConfig,
            closeCurr, true, viaRestart, suppressWarning);
    };

    XpeSharedContextUtils.launchInitialWindow = function(
        url, windowOptions, closeOpened, useDockerAssistGui,
        openViaRestart=false, restartConfirmation=false, force=false) {

        /**
            The method 'launch' is what ultimately handles launching a Window.
            Some known URLs have some configurations already handled
            (ex, opening XD want to use Docker gui, but installer and uninstaller would not.
            Installer and uninstaller should open via restart, but not XD,
            these all have window configs as well.)
            These known URLs have wrapper functions which call 'launch' with their predefined
            configurations.
            Check if this is a known URL - and call its wrapper function if so.
            force will override.
        */
        if (!force) {
            switch (url) {
                case (global.xdURL):
                    return XpeSharedContextUtils.openXD();
                    break;
                case (global.installerURL):
                    return XpeSharedContextUtils.openInstaller();
                    break;
                case (global.uninstallerURL):
                    return XpeSharedContextUtils.openUninstaller();
                    break;
                case (global.revertURL):
                    return XpeSharedContextUtils.openReverter();
                    break;
                default:
                    console.log("can not determine a config for " + url + "; open default");
                    return launch(url, windowOptions, closeOpened, useDockerAssistGui, openViaRestart, restartConfirmation);
                    break;
            }
        }
    };

    function openWindow(url, config, closeOpened=false) {
        var deferred = jQuery.Deferred();
        // if current window should close after
        var startWindow = null;
        try {
            startWindow = nw.Window.get(); // to shut after new Window opened
        } catch (e) {
            console.log("caught error: " + e);
        };
        // check if requested url already opened; if so, just focus it
        if (url && global.nwWindows.hasOwnProperty(url)) {
            console.log("Requested URL " + url + " already open; focus it");
            global.nwWindows[url].focus();
            deferred.resolve("ok");
        } else {
            nw.Window.open(url, config, function(win) {
                console.log("created a new window: " + url);
                global.nwWindows[url] = win;

                // listen for window closed so can delete it from global
                win.on('closed', function() {
                    delete global.nwWindows[url];
                });

                // close curr one if requested
                if (closeOpened) {
                    startWindow.close();
                }
                deferred.resolve("made a window for " + url);
            });
        }
        return deferred.promise();
    }

    /**
        Set launch mark to given URL and exit nwjs
        (this will trigger main app to exit, and the launch
        mark will alert it to restart, on the restart will open
        to the url specified to launchMark)
    */
    function restartWithUrl(url) {
        XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/launchMark", JSON.stringify({"url": url}))
        .then(function () {
            XpeSharedContextUtils.quitNwjs(); // nwjs processes killed; app will quit
        });
    }

    /**
     * Open a new Window
     * Default behavior opens with default nwjs window configs.
     * @url (required): filepath (rel. nwjs process root) or URL to open
     * @windowOptions: window attributes to open window with
     *  see: http://docs.nwjs.io/en/latest/References/Manifest%20Format/#window-subfields
     * @useDockerAssistGui: do a Docker check when new window opens using the
     *  Docker start GUI
     * @openViaRestart: open window by restarting the app, and opening it to url
     *   MAKE SURE DEFAULT IS FALSE.(app is initially launched via this method.
     *   If default is marked as true, then will keep restarting infinitely)
     * @noConfirmation: suppress 'are you sure you want to quit' alert message
     *   before closing the window
     */
    function launch(url, windowOptions, closeOpened=false,
        useDockerAssistGui=false, openViaRestart=false, noConfirmationMsg=false) {

        var deferred = jQuery.Deferred();

        // if requested url already opened, just focus it
        // do here instead of detecting at window open time, to avoid restart in this case
        if (url && global.nwWindows.hasOwnProperty(url)) {
            console.log("Requested URL " + url + " already open; focus it");
            global.nwWindows[url].focus();
            deferred.resolve("ok");
            return deferred.promise();
        }

        // some URLs have known window options; use if not supplied
        if (!windowOptions) {
            switch (url) {
                case (global.xdURL):
                    windowOptions = global.xdWindowConfig;
                    break;
                case (global.installerURL):
                case (global.uninstallerURL):
                    windowOptions = global.xpeWindowConfig;
                    break;
                case (global.revertURL):
                    windowOptions = global.revertWindowConfig;
                    break;
                default:
                    console.log("can not determine a config for " + url + "; open default");
                    break;
            }
        }

        /**
            If there are no windows open and launch is called,
            if a restart has been given this will cause the app to
            keep restarting over and over.
            Check if those settings and if so overwrite with a debug msg
        */
        if (openViaRestart && !global.nwWindows) {
            console.log("tried to open via a restart, " +
                " but there are no windows open yet - this is a logic bug");
        }

        console.log("Start new GUI.." +
            "\nurl to open in new Window (rel nwjs root): " + url +
            "\nopen via restart?" + openViaRestart);

        if (openViaRestart && global.nwWindows) {
            console.log("open via a restart");
            if (noConfirmationMsg) {
                restartWithUrl(url);
            } else {
                var confirmationMsg = "Are you sure you want to continue? This will restart the app.";
                if (confirm(confirmationMsg)) {
                    restartWithUrl(url);
                } else {
                    deferred.resolve("ok");
                }
            }
        } else {
            if (useDockerAssistGui) {
                // open blank window in bg in case user closes Docker start GUI
                // before Docker starts up (else app would terminate due to last
                // window closing).  Will close the bg window once next window opens
                nw.Window.open("blank.html", {"show": false}, function(bgWin) {
                    XpeSharedContextUtils.dockerStatus()
                    .then(function(res) {
                        if (res === dockerStatusStates.UP) {
                            console.log("Docker already up; don't use GUI runner");
                            return PromiseHelper.resolve("ok");
                        } else if (res === dockerStatusStates.DOWN) {
                            return XpeSharedContextUtils.dockerGuiRunner();
                        } else {
                            // in XD case, no Window open yet at this point;
                            // console.log else app will fail to open initial
                            // window and might be no indication what is going on
                            // if you're not running from nwjs entrypoint
                            var errMsg = "ERROR: Cound not determine " +
                                "Docker status state." +
                                "Docker status state." +
                                "\nResponse: " +
                                res +
                                "\nExpected responses: " +
                                JSON.stringify(dockerStatusStates);
                            console.log(errMsg);
                            return PromiseHelper.reject(errMsg);
                        }
                    })
                    .then(function(res) {
                        openWindow(url, windowOptions, closeOpened); // open the new Window before closing the bg one in always
                    })
                    .then(function(res) {
                        deferred.resolve("ok");
                    })
                    .fail(function(error) {
                        deferred.reject(error);
                    })
                    .always(function() {
                        bgWin.close();
                    });
                });
            } else {
                console.log("do not use Docker gui to open this window");
                openWindow(url, windowOptions, closeOpened)
                .then(function(res) {
                    deferred.resolve("ok");
                })
                .fail(function(error) {
                    deferred.reject(error);
                });
            }
        }
        return deferred.promise();
    }

    XpeSharedContextUtils.dockerGuiRunner = function() {
        var deferred = jQuery.Deferred();
        // the Docker GUI window will call API to start Docker, and close
        // automatically once Docker has started
        nw.Window.open(global.dockerStarterURL, global.dockerStarterWindowConfig, function(win) {
            win.on("close", function() {
                console.log("close event");
                /**
                    this close event will get triggered only if the user has
                    clicked the close button, or if Docker has successfully started.
                    since we're listening for the close
                    event, it will prevent the window from actually closing.
                    Once Docker is up will give a force close to close the window.
                    but if Docker is in the progress of coming up, it could take
                    a minute or so to get to that force close and the app will
                    seem like its stuck; so hide the window until the force close
                */
                win.hide();
                // wait for Docker to be running - in case they close the window
                console.log("wait for docker");
                XpeSharedContextUtils.sendViaHttp(
                    "POST", xpeServerUrl + "/dockerWait",
                    JSON.stringify({"timeout": dockerWaitDefault}))
                .then(function(res) {
                    deferred.resolve("docker is up");
                })
                .fail(function(error) {
                    deferred.reject("Encountered error getting Docker " +
                        " status after close event");
                })
                .always(function() {
                    if(win) {
                        win.close(true);
                    }
                });
            });

            win.on("closed", function() {
                // this should fire on a force close of the Window which should
                // not be happening (if Docker fails to come up,
                // Docker starter should gracefully terminate nwjs)
                deferred.reject("Docker starter Window was force closed; " +
                    " this should not happen and indicates docker starter js " +
                    " has changed - logic might need to be updated.");
            });
        });
        return deferred.promise();
    }

    XpeSharedContextUtils.stopXcalar = function() {
        return XpeSharedContextUtils.sendViaHttp(
            "POST", xpeServerUrl + "/stopXcalar");
    }
    XpeSharedContextUtils.startXcalar = function() {
        return XpeSharedContextUtils.sendViaHttp(
            "POST", xpeServerUrl + "/startXcalar");
    }

    /**
        @guitype:
            install, xd, uninstall, revert
    */
    XpeSharedContextUtils.customizeNwjsMenus = function(guiType) {
        if (typeof guiType === typeof undefined) {
            guiType = 'xd';
        }
        // main menu bar
        var xce_menu = new nw.Menu({ type: 'menubar' });
        // single drop down for main menubar
        var submenu = new nw.Menu();
        // create items for dropdown in main menubar; bind events
        var mainProgramItem = nw.MenuItem({
            label: XPEStr.prodname,
            click: function () {
                var closeCurr = false;
                if (guiType === 'uninstall') {
                    closeCurr = true;
                }
                XpeSharedContextUtils.openXD(false, false, closeCurr);
            },
        });

        // want to do restarts on a few non-XD items.
        // suppress those warnings if not in XD when those are clicked

        var installItem = nw.MenuItem({
            label: "Re-install",
            click: function () {
                // suppress the restart warning if you're in the installer
                var suppressWarning = false;
                if (guiType === 'install') {
                    suppressWarning = true;
                }
                XpeSharedContextUtils.openInstaller(true, suppressWarning, true);
            },
        });
        var upgradeItem = nw.MenuItem({
            label: "Check for upgrades",
            click: function () {
                console.log("Not yet implemented");
            },
            enabled: false,
        });
        var revertItem = nw.MenuItem({
            label: "Image Manager",
            click: function () {
                XpeSharedContextUtils.openReverter();
            },
            enabled: true,
        });
        var uninstallItem = nw.MenuItem({
            label: "Uninstall",
            click: function () {
                XpeSharedContextUtils.openUninstaller(true);
            },
        });
        var stopXcalarItem = nw.MenuItem({
            label: "Stop Xcalar",
            click: function () {
                XpeSharedContextUtils.stopXcalar();
            },
        });
        var startXcalarItem = nw.MenuItem({
            label: "Start Xcalar",
            click: function () {
                XpeSharedContextUtils.startXcalar();
            },
        });
        var grafanaItem = nw.MenuItem({
            label: "Grafana",
            click: function() {
                XpeSharedContextUtils.openGrafana(); // only opens in new window
            },
        });
        if (guiType === 'install') {
            mainProgramItem.enabled = false;
            grafanaItem.enabled = false;
            stopXcalarItem.enabled = false;
            startXcalarItem.enabled = false;
        } else if (guiType === 'uninstall') {
            stopXcalarItem.enabled = false;
            startXcalarItem.enabled = false;
        } else if (guiType === 'xd') {
            revertItem.enabled = true;
        } else if (guiType === 'revert') {
            // placeholder
        }
        submenu.append(mainProgramItem);
        // add Grafana only in dev builds
        if (global.grafana) {
            submenu.append(grafanaItem);
        }
        if (guiType !== 'install') {
            submenu.append(installItem);
        }
        submenu.append(upgradeItem);
        submenu.append(revertItem);
        if (guiType !== 'uninstall') {
            submenu.append(uninstallItem);
        }
        submenu.append(new nw.MenuItem({ type: 'separator' }));
        submenu.append(stopXcalarItem);
        submenu.append(startXcalarItem);
        // append the dropdown on to main menu
        xce_menu.append(new nw.MenuItem({
            label: 'First Menu',
            submenu: submenu
        }));
        // must add native Mac edit menu for keyboard shortcuts to work on OSX
        if (process.platform === "darwin") {
            xce_menu.createMacBuiltin(XPEStr.prodname);
        }
        return xce_menu;
   }

    /**
     * make ajax call
     * @action: type of call (GET, POST, DELETE, etc)
     * @url: endpoint valid for the server
     * @jsonToSend: stringified json (for example in POST request)
     * @timeout: timeout in milliseconds after which to reject.
     *  defualt is no timeout. (from jQuery docs: 0 means no timeout)
     * ** WARNING:: The timeout of the server being called supercedes this.
     *    Right now, the xpeServer timeout is set at 10 minutes (600000ms).
     *    If you are calling an xpeServer URL and setting a large timeout,
     *    but your API is still failing prior to that, ensure the
     *    .timeout attr of the server obj in xpeServer.js is sufficient!
     *  example:
     *  sendViaHttp("GET", "/hostSettings");
     *  sendViaHttp("POST", "/install", JSON.stringify({'installStep': 'xdpce'}));
     */
    XpeSharedContextUtils.sendViaHttp = function(action, url, jsonToSend, timeout=0) {
        var deferred = jQuery.Deferred();
        try {
            var ajaxCallConfig = {
                method: action,
                url: url,
                data: jsonToSend,
                contentType: "application/json",
                success: function (ret) {
                    deferred.resolve(ret);
                },
                error: function (xhr, textStatus, errorThrown) {
                    console.log("Error on Ajax call to " + url + "; json " +
                        JSON.stringify(jsonToSend) +
                        ";  text status: " + textStatus +
                        "; error thrown: " + JSON.stringify(xhr));
                    // check if it was a timeout
                    if (textStatus === 'timeout') {
                        // mimic the server JSON format;
                        // the guis will rely on these attrs
                        deferred.reject({
                            "status": httpStatus.RequestTimeout,
                            "errorLog": "Timed out waiting for API to complete"
                        });
                    } else {
                        if (xhr.responseJSON) {
                            // under this case, server sent the response and set
                            // the status code
                            deferred.reject(xhr.responseJSON);
                        } else {
                            // under this case, the error status is not set by
                            // server, it may due to other reasons
                            deferred.reject("Connection Error: " +
                                " Connection to server cannot be established");
                        }
                    }
                }
            };
            if (typeof timeout !== 'undefined') {
                ajaxCallConfig.timeout = timeout;
            }
            jQuery.ajax(ajaxCallConfig);
        } catch (e) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "Caught exception running api call to " +
                    url + ": " + e
            });
        }
        return deferred.promise();
    };

    return XpeSharedContextUtils;
})({});

if (typeof exports !== "undefined") {
    if (typeof module !== "undefined" && module.exports) {
        exports = module.exports = XpeSharedContextUtils;
    }
    exports.XpeSharedContextUtils = XpeSharedContextUtils;
}
