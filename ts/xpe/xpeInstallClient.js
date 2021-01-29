var installed = false;
var xpeServerUrl = global.xpeServerUrl;
var waitingForRetryInstallTrigger = false; // allow to navigate back and change settings before retrying
var requirementsChecked = false;
var waitingForRetryRequirementsTrigger = false; // allow to naviate back to page before hitting retry
var userLicense = {
    "accepted": false, // in case currently input and valid but not accepted
    "compressed": "",
    "uncompressed": "",
}
var numInstallSteps = 6;
var installGrafana = false;
if (global.grafana) { // gets set in nwjs entrypoint, starter.js
    installGrafana = true;
    numInstallSteps++;
}
var MIN_RAM = 8; // GB
var MIN_CORES = 2;

var $installerProgressBar;
var $installerProgressBarSection;
var $installerProgressDescription;
var $installerStepPercent;
var $installerTotalPercent;
var $stepProgress;
var $installFailureInfoDisplay;
var $retryBtn;
var $nextBtn;
var $prevBtn;
var $launchBtn;
var $recheckBtn;

// kill any current running shell process still active when Installer runs
// @TODO: Might want to only kill install processes? what about leftover revert/delete? Things from other guis?
XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/killRunningShellProcs");

$(document).ready(function() {
    if (typeof nw !== typeof undefined) {
        XpeSharedContextUtils.nwjsSetup("install");
    }

    setup();
    openRequirementsPage();
});
// behavior of prev/ next buttons diff on some pages
// so each page clear current listener and add in a requested on for that page
function setNextAction(myfun) {
    $nextBtn.off("click");
    $nextBtn.on("click", myfun);
}
function nextDefault() {
    switchStep(true);
}

function setup() {
    $installerProgressBar = $("#progressBar");
    $installerProgressBarSection = $("#progressBarSection");
    $installerProgressDescription = $(".processStepDescription");
    $installerStepPercent = $(".stepPercent");
    $installerTotalPercent = $(".totalPercent");
    $stepProgress = $(".stepProgressDisplays");
    $installFailureInfoDisplay = $(".failBox");
    $retryBtn = $("#retry");
    $nextBtn = $("#next");
    $prevBtn = $("#prev");
    $launchBtn = $("#launch");
    $recheckBtn = $("#recheck");

    setNextAction(nextDefault);
    $prevBtn.click(function() {
        switchStep(false);
    });
    $launchBtn.click(setLaunch);
    $retryBtn.click(retryInstall);
    $recheckBtn.click(retryRequirements);
    $("#eulaTick").click(eulaToggle);
    $("#licenseText").on('input', function() {
        if (!$("#licenseText").val()) {
            $nextBtn.addClass("btn-disabled");
        } else {
            $nextBtn.removeClass("btn-disabled");
        }
        unfailLicense();
        XpeCommonUtils.pendStep("licenseStep");
    });
}

function openRequirementsPage() {
    setNextAction(nextDefault);
    if (waitingForRetryRequirementsTrigger) {
        $nextBtn.hide();
        $recheckBtn.show();
    }
    $prevBtn.hide();
    $("#requirementsStep").addClass("currentStep");
    $(".requirements").show();
    if (!requirementsChecked && !waitingForRetryRequirementsTrigger) {
        $nextBtn.addClass("btn-disabled");
        handleSystemRequirements().then(function(res) {
            XpeCommonUtils.completeStep("requirementsStep");
            $nextBtn.removeClass("btn-disabled");
            $('#requirementsMsg').text("All requirements were met");
            requirementsChecked = true;
        })
        .fail(function(error) {
            XpeCommonUtils.failStep("requirementsStep");
            // display failure to user
            $("#requirementsMsg").text(error);
            $("#requirementsRetryInstructions").show();
            retryRequirements = true;
            $nextBtn.hide();
            $recheckBtn.show();
        });
    }
}

function openLicenseInputPage() {
    $("#licenseStep").addClass("currentStep");
    $(".licenseInputPage").show();
    if (!$("#licenseText").val()) {
        $nextBtn.addClass("btn-disabled");
    }

    var mustRedoLicense = false;
    // next button acts as license validation trigger on this page
    // only validate if textfield diff from current
    setNextAction(function() {
        // get current text in the field
        var userLicenseInput = $("#licenseText").val();
        if (!userLicenseInput) {
            // @TODO: when Azure login: let them bypass to EULA page
            // (not nextDefault)
            alert("Please input a license key in to the box.");
        } else {
            if (mustRedoLicense && userLicenseInput === userLicense.compressed) {
                alert("Please input a new license before re-validation");
            } else {
                if (userLicenseInput !== userLicense.compressed) {
                    clearUserLicenseData();
                    userLicense.compressed = userLicenseInput;
                    licenseCheck(userLicenseInput)
                    .then(function(res) {
                        userLicense.uncompressed = res;
                        unfailLicense(); // in case of previous failure
                        nextDefault();
                    })
                    .fail(function() {
                        mustRedoLicense = true;
                        failLicense();
                    });
                } else {
                    // they've a previousy accepted license; display that same summary
                    nextDefault();
                }
            }
        }
    });

    /**
        @TODO:
        Once Azure ad b2c is available,
        should allow user to bypass license.  If they do,
        give alert that they will not have full functionality
        (Until then, force them to give a valid license)
    */
}

function openLicenseSummaryPage() {
    $("#licenseStep").addClass("currentStep");
    $(".licenseSummaryPage").show();
    $nextBtn.removeClass("btn-disabled");

    if (!userLicense.compressed || !userLicense.uncompressed) {
        console.log("logic error: lacking either compressed or uncompressed " +
            " license even though in summary page");
    }
    $("#licenseSummaryBox").text(userLicense.uncompressed);
    $("#licenseSummary").show();
    setNextAction(function() {
        XpeCommonUtils.completeStep("license");
        userLicense.accepted = true;
        nextDefault();
    });
}


function openEULAPage() {
    setNextAction(nextDefault);
    $("#eulaStep").addClass("currentStep");
    $(".eula").show();
    if (!$("#eulaTick").hasClass("checked")) {
        $nextBtn.addClass("btn-disabled");
    }
}

function openConfigurationPage() {
    setNextAction(nextDefault);
    $("#configurationStep").addClass("currentStep");
    $(".configuration").show();
}

// once install complete this will disable forms/buttons that
// user should no longer be able to modify
function disableDivsAfterInstall() {
    $(".licenseBox").addClass("divDisabler");
    $("#eulaTick").addClass("divDisabler");
}

function openInstallPage() {
    setNextAction(nextDefault);
    $("#installStep").addClass("currentStep");
    $(".install").show();
    if (waitingForRetryInstallTrigger) {
        $nextBtn.hide();
        $retryBtn.show();
    }
    if (!installed && !waitingForRetryInstallTrigger) {
        $prevBtn.addClass("btn-disabled");
        $nextBtn.addClass("btn-disabled");
        installXPE()
        .then(function() {
            console.log("done installing xpe");
            $prevBtn.removeClass("btn-disabled");
            $nextBtn.removeClass("btn-disabled");
            XpeCommonUtils.completeStep("installStep");
            $stepProgress.hide();
            installed = true;
            disableDivsAfterInstall();
        })
        .fail(function(error) {
            // @TODO: cleanup step on failure
            console.log("failed install");
            XpeCommonUtils.failStep("installStep");
            $nextBtn.hide();
            $retryBtn.show();
            $prevBtn.removeClass("btn-disabled");

            // put failure reason in to scrolling div below
            var errDisplay = "";
            if (error) {
                errDisplay += "Install failure: " + error;
            }
            // if this was run via the app, and starter.js is nwjs entrypoint,
            // the current server file started by app entrypoint should have been
            // set in 'global' via starter.js
            if (global.hasOwnProperty("serverLogPath")) {
                errDisplay += "<br><br>For more information, see the log at " +
                    global.serverLogPath;
            }
            $installFailureInfoDisplay.html(errDisplay);
            $installFailureInfoDisplay.show();
            waitingForRetryInstallTrigger = true;
            // kill any shell process still running
            XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/killRunningInstallProcs");
        });
    }
}

function openFinalPage() {
    setNextAction(nextDefault);
    $(".final").show();
    $prevBtn.hide();
    $nextBtn.hide();
    $launchBtn.show();
}

function openStep(stepNumber) {
    switch (stepNumber) {
        case 1:
            openRequirementsPage();
            break;
        case 2:
            openLicenseInputPage();
            break;
        case 3:
            openLicenseSummaryPage();
            break;
        case 4:
            openEULAPage();
            break;
        case 5:
            openConfigurationPage();
            break;
        case 6:
            openInstallPage();
            break;
        case 7:
            openFinalPage();
            break;
        default:
            console.log("invalid step!");
    }
}

// when user clicks 'next' or 'prev' button
function switchStep(forward, subStepSwitch) {
    $prevBtn.show();
    $nextBtn.show();
    $launchBtn.hide();
    $retryBtn.hide();
    $prevBtn.removeClass("btn-disabled");
    $nextBtn.removeClass("btn-disabled");

    // deactiavte current step (if any) and mark complete
    $(".currentStep").each(function() {
        if (forward && !(userLicense.compressed && !userLicense.accepted)) {
            XpeCommonUtils.completeStep($(this).attr('id'));
        }
        $(this).removeClass("currentStep");
    });
    // close current content div
    var currPage = null;
    $(".stepContent:visible").each(function() {
        currStepNumber = $(this).attr("id");
        $(this).hide();
    });
    if (currStepNumber) {
        currStepNumber = parseInt(currStepNumber);
        if (forward) {
            openStep(currStepNumber + 1);
        } else {
            openStep(currStepNumber - 1);
        }
    }
    $nextBtn.blur();
    $prevBtn.blur();
}

function handleSystemRequirements() {
    var deferred = jQuery.Deferred();
    checkPreReqs()
    .then(function(data) {
        console.log("checked pre reqs; now check requirements");
        return checkRequirements();
    })
    .then(function(data) {
        deferred.resolve("Pre-requisites and requirements passed");
    })
    .fail(function(error) {
        deferred.reject(error);
    });
    return deferred.promise();
}

// checks for system pre-reqs which can be handled such as starting Docker
function checkPreReqs() {
    var deferred = jQuery.Deferred();
    try {
        console.log("in check pre-reqs");
        // checks if Docker running, if not, runs
        // if Docker is not installed, it will fail with that reason
        XpeCommonUtils.handleDockerStatusWrapper(false, 60, "requirementsMsg", true, "Docker started... checking further system requirements...")
        .then(function(data) {
            deferred.resolve("Docker pre-req in good shape.");
        })
        .fail(function(error) {
            deferred.reject(error);
        });
    }
    catch (e) {
        deferred.reject("Encountered error trying to handle failed pre-requirements " + JSON.stringify(e));
    }
    return deferred.promise();
}

function checkRequirements() {
    var deferred = jQuery.Deferred();
    try {
        XpeSharedContextUtils.sendViaHttp("GET", xpeServerUrl + "/hostSettings")
        .then(function(data) {
            var myJSONText = JSON.stringify(data);
            var failmsg = "";
            var macVersion = data.system.os;
            if (macVersion) { // @TODO add the specific mac version check
            } else {
                failmsg = failmsg + "\nYour Mac OS version, " +
                    macVersion + ", does not meet requirements";
            }

            var dockerVersion = data.docker.version;
            var versionGrep = "Docker version ([0-9]+)";
            if (dockerVersion) {
                var found = dockerVersion.match(versionGrep);
                if (!found || (found[1] < 18)) {
                    failmsg = failmsg = "\n" + XPEStr.prodname +
                        " requires Docker versions 18.XX.XX. or higher " +
                        "Please upgrade Docker for Mac. " +
                        "(Click your Docker icon, and then select " +
                        " 'Check for Updates')";
                }
            } else {
                failmsg = failmsg + "\nCould not retrieve a Docker version; " +
                    "do you have Docker installed?";
            }

            var maxRam = data.docker.maxRam;
            var maxCores = data.docker.maxCores;
            if (maxRam < MIN_RAM || maxCores < MIN_CORES) {
                failmsg = failmsg + "\nYour Docker Preferences must be set " +
                    "to at least " + MIN_RAM + " GB memory, " +
                    "and " + MIN_CORES + " cores.\n" +
                    "To change your Docker preferences, click the " +
                    "Docker icon, go to 'Preferences', 'Advanced tab' " +
                    " increase the slider values, " +
                    "and then click 'Apply & Restart'";
            } else {
                makeRangeSliders(maxRam, maxCores);
                //setConfigSliders(maxRam, maxCores);
            }

            if (failmsg) {
                deferred.reject(failmsg);
            } else {
                deferred.resolve("All requirements checked out");
            }
        })
        .fail(function(error) {
            console.log("/hostSettings API failed.  Error: " + JSON.stringify(error));
            var rejectMsg = "";
            if (error.errorLog) { // the server APIs should all be rejecting with errorLog attr
                rejectMsg = error.errorLog;
            } else {
                rejectMsg = "Encountered error when trying to gather host settings. " + JSON.stringify(error);
            }
            deferred.reject(rejectMsg);
        });
    } catch (e) {
        deferred.reject("Encountered error trying to check requirements" + e);
    }
    return deferred.promise();
}

/** license helper functions */

function clearUserLicenseData() {
    userLicense = {
        "accepted": false,
        "compressed": "",
        "uncompressed": "",
    };
}
function licenseCheck(compressedLicenseString) {
    var deferred = jQuery.Deferred();
    // strip off newline/whitespace
    compressedLicenseString = compressedLicenseString.trim();
    XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/license/uncompressed", JSON.stringify({"license": compressedLicenseString}))
    .then(function(res) {
        deferred.resolve(res.license);
    })
    .fail(function(error) {
        deferred.reject(error.errorLog);
    });
    return deferred.promise();
}
function failLicense() {
    $("#licenseFailure").show();
}
function unfailLicense() {
    $("#licenseFailure").hide();
}

function eulaToggle() {
    if ($("#eulaTick").hasClass("checked")) {
        $("#eulaTick").removeClass("checked");
        $nextBtn.addClass("btn-disabled");
        XpeCommonUtils.pendStep("eulaStep");
    } else {
        $("#eulaTick").addClass("checked");
        $nextBtn.removeClass("btn-disabled");
        XpeCommonUtils.completeStep("eulaStep");
    }
}

function installXPE() {
    var deferred = jQuery.Deferred();
    var completedInstall = false;
    var installError;

    // put together array of steps for the full install process,
    // in order, where each entry is array of est. time, description,
    // and function you'd call for that step
    var steps = [];

    // the functions for each step
    var cleanupFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/cleanup");
    var initializeFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/clear", undefined, 30000); // timeout is ms
    var setupFunction =    XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/setup");
    var unpackImagesFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/upload");
    var createGrafanaFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/createGrafana");
    // creating Xcalar container reqs. extra post data
    var installArgs = {};
    installArgs.ram = $("#ram").attr("value");
    installArgs.cores = $("#cores").attr("value");
    if (userLicense.uncompressed && userLicense.accepted) {
        installArgs.license = userLicense.uncompressed;
    }
    var createXcalarContainerFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/createXdpce", JSON.stringify(installArgs));
    var startXcalarFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/startXcalar", JSON.stringify({"install": true}), 120000);
    var verifyFunction = XpeSharedContextUtils.sendViaHttp.bind(this, "POST",
        xpeServerUrl + "/install/verify");

    steps = [
        [5, "Clear existing containers", initializeFunction],
        [20, "Setup", setupFunction],
        [300, "Unpack images", unpackImagesFunction],
    ];
    if (installGrafana) {
        steps.push([15, "Create Grafana container", createGrafanaFunction]);
    }
    steps = steps.concat([
        [10, "Create Xcalar container", createXcalarContainerFunction],
        [30, "Start the Xcalar service", startXcalarFunction],
        [15, "Verify installation", verifyFunction],
        [15, "Cleanup from installation...", cleanupFunction]
    ]);

    ProcessEngineUtil.doProcess(steps, $installerProgressBar, $installerProgressBarSection, $installerProgressDescription,
        $installerStepPercent, $installerTotalPercent, false)
    .then(function() {
        // mark the install so app will run XD next time
        ProcessEngineUtil.finishProcess($installerProgressBar, $installerProgressBarSection,
            $installerStepPercent, $installerTotalPercent,
            $installerProgressDescription, "Installation Complete!");
        return XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/markInstalled");
    })
    .then(function(res) {
        deferred.resolve("installation completed");
    })
    .fail(function(error) {
        deferred.reject(error.errorLog);
    });

    return deferred.promise();
}

/**
 * resets state such that if you open install page again a new
 * install will kick off, sets UI elements to match
 */
function retryInstall() {
    $retryBtn.hide();
    $nextBtn.show();
    $installFailureInfoDisplay.hide();
    XpeCommonUtils.pendStep("installStep");
    $stepProgress.show();
    ProcessEngineUtil.resetProcess($installerProgressBar, $installerProgressBarSection,
        $installerStepPercent, $installerTotalPercent,
        $installerProgressDescription);
    waitingForRetryInstallTrigger = false; // sets up page for a new install
    openInstallPage();
}

function retryRequirements() {
    $recheckBtn.hide();
    $("#requirementsRetryInstructions").hide();
    $nextBtn.show();
    XpeCommonUtils.pendStep("requirementsStep");
    requirementsChecked = false; // sets up page so it'll check fresh
    openRequirementsPage();
}

function setLaunch() {
    XpeSharedContextUtils.openXD(false, false, true);
}

function makeRangeSliders(maxRam, maxCores) {
    ramSlider = new RangeSlider($("#ramSlider"), {
            minVal: MIN_RAM,
            maxVal: parseInt(maxRam),
            onChangeEnd: function(val) {
                $("#ram").attr("value", val);
             }
    });
    coresSlider = new RangeSlider($("#coresSlider"), {
            minVal: MIN_CORES,
            maxVal: maxCores,
            onChangeEnd: function(val) {
                $("#cores").attr("value", val);
             }
    });
}

function RangeSlider($rangeSliderWrap, options) {
    options = options || {};
    var self = this;
    this.minVal = options.minVal || 0;
    this.maxVal = options.maxVal || 0;
    this.halfSliderWidth = Math.round($rangeSliderWrap.find('.slider').width() / 2);
    this.minWidth = options.minWidth || this.halfSliderWidth;
    this.maxWidth = options.maxWidth || $rangeSliderWrap.find('.rangeSlider').width();
    this.valRange = this.maxVal - this.minVal;
    this.widthRange = this.maxWidth - this.minWidth;
    this.$rangeSliderWrap = $rangeSliderWrap;
    this.$rangeInput = $rangeSliderWrap.find('input');
    this.$rangeInput.val(this.maxVal);
    this.$rangeInput.attr("value", this.maxVal);
    this.options = options;

    $rangeSliderWrap.find(".leftArea").resizable({
        "handles": "e",
        "minWidth": 10, // if 0, circle's rightmost edge can touch slider leftmost edge
        "maxWidth": self.maxWidth + 10, // similar; want it to be able to go slightly right
        "stop": function(event, ui) {
            var val = self.updateInput(ui.size.width);
            if (options.onChangeEnd) {
                options.onChangeEnd(val);
            }
        },
        "resize": function(event, ui) {
            self.updateInput(ui.size.width);
        }
    });
    $rangeSliderWrap.find('.leftArea').on('mousedown', function(event) {
        if (!$(event.target).hasClass('leftArea')) {
            // we don't want to respond to slider button being clicked
            return;
        }
        self.handleClick(event);
    });

    $rangeSliderWrap.find('.rightArea').on('mousedown', function(event) {
        self.handleClick(event);
    });

    $rangeSliderWrap.find('input').on('input', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        self.updateSlider(val);
    });

    $rangeSliderWrap.find('input').on('change', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        $(this).val(val);
        if (options.onChangeEnd) {
            options.onChangeEnd(val);
        }
    });

    $rangeSliderWrap.find('input').on('keydown', function(event) {
        if (event.which === keyCode.Enter) {
            $(this).blur();
        }
    });
}

RangeSlider.prototype = {
    updateInput: function(uiWidth) {
        var width = uiWidth - this.minWidth;
        var val = (width / this.widthRange) * this.valRange + this.minVal;
        val = Math.round(val);
        this.$rangeInput.val(val);
        return val;
    },
    updateSlider: function(val) {
        var width = ((val - this.minVal) / this.valRange) * this.widthRange +
                    this.minWidth;

        width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
        this.$rangeSliderWrap.find('.leftArea').width(width);
    },
    handleClick: function(event) {
        if (event.which !== 1) {
            return;
        }
        var self = this;
        var $rangeSlider = $(event.target).closest('.rangeSlider');
        var mouseX = event.pageX - $rangeSlider.offset().left +
                     self.halfSliderWidth;
        mouseX = Math.min(self.maxWidth, Math.max(self.minWidth, mouseX));
        var val = self.updateInput(mouseX);
        self.updateSlider(val);
        if (self.options.onChangeEnd) {
            self.options.onChangeEnd(val);
        }
    },
    setSliderValue: function(val) {
        this.updateSlider(val);
        this.$rangeInput.val(val);
    }
};
