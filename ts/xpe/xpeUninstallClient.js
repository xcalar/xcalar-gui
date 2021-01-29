var xpeServerUrl = global.xpeServerUrl;
if (xpeServerUrl === 'undefined') {
    console.log("ERROR: xpeServerUrl undefined in global " +
        " (are you running from nwjs entrypoint?)");
}

var $uninstallerProgressBar;
var $uninstallerProgressBarSection;
var $uninstallerProgressDescription;
var $uninstallerStepPercent;
var $uninstallerTotalPercent;
var $uninstallFailureInfoDisplay;
var $uninstallStepProgresss;

var $uninstallBtn;
var $prevBtn;
var $closeBtn;

var currStepClassName = "currentStep";

$(document).ready(function () {
    if (typeof nw !== 'undefined') {
        XpeSharedContextUtils.nwjsSetup("uninstall");
    }

    $uninstallerProgressBar = $("#progressBar");
    $uninstallerProgressBarSection = $("#progressBarSection");
    $uninstallerProgressDescription = $(".processStepDescription");
    $uninstallerStepPercent = $(".stepPercent");
    $uninstallerTotalPercent = $(".totalPercent");
    $uninstallFailureInfoDisplay = $(".failBox");
    $uninstallStepProgresss = $(".stepProgressDisplays");
    $uninstallBtn = $("#uninstall");
    $prevBtn = $("#prev");
    $closeBtn = $("#close");

    setup();
    openUninstallOptionsPage();
});
function setup() {
    $uninstallBtn.click(function () {
        // this is essentially the 'next' btn since only 2 steps
        // can be clicked from either page (as 'uninstall' on initial page or
        // 'retry uninstall' on uninstall page if uninstall failed)
        // so don't rely on which page opened when calling switchStep; directly
        // open uninstall page if clicked
        switchStep(undefined, 2);
    });
    $prevBtn.click(function() {
        switchStep(false);
    });
    xcUIHelper.optionButtonEvent($("#uninstalltype")); // switches radio button
    $closeBtn.click(closeButtonAction); // 'Close' button on last page after uninstall
}
function closeButtonAction() {
    var currWindow = nw.Window.get();
    currWindow.close();
}

function openUninstallOptionsPage() {
    $("#uninstallOptionsStep").addClass(currStepClassName);
    $(".uninstallOptions").show();
    $uninstallBtn.removeClass("btn-disabled");
    $prevBtn.hide(); // in case page opened after an uninstall failure
    $uninstallBtn.show();
}

function openUninstallPage() {
    // new uninstall should start every time this page opens;
    // clear data from previous uninstall failure, if any
    ProcessEngineUtil.resetProcess($uninstallerProgressBar, $uninstallerProgressBarSection,
        $uninstallerStepPercent, $uninstallerTotalPercent,
        $uninstallerProgressDescription);
    XpeCommonUtils.pendStep("uninstallStep");
    $("#uninstallStep").addClass(currStepClassName);
    $uninstallFailureInfoDisplay.hide();
    $(".uninstall").show();

    $uninstallBtn.addClass("btn-disabled");
    $prevBtn.addClass("btn-disabled");
    uninstallXPE()
    .then(function () {
        XpeCommonUtils.completeStep("uninstallStep");
        $uninstallBtn.hide();
        $closeBtn.show();
    })
    .fail(function (error) {
        XpeCommonUtils.failStep("uninstallStep");
        $uninstallBtn.removeClass("btn-disabled");
        $uninstallBtn.text("RETRY UNINSTALL");
        $prevBtn.show();
        $prevBtn.removeClass("btn-disabled");
        // put failure reason in to scrolling div below
        var errDisplay = "Failure reason: " + error;
        if (global.hasOwnProperty("serverLogPath")) {
            errDisplay += "<br><br>For more information, see the log at " +
                global.serverLogPath;
        }
        $uninstallFailureInfoDisplay.html(errDisplay);
        $uninstallFailureInfoDisplay.show();
    });
}

function openStep(stepNumber) {
    switch (stepNumber) {
        case 1:
            openUninstallOptionsPage();
            break;
        case 2:
            openUninstallPage();
            break;
        default:
            console.log("invalid step!");
    }
}
/**
 * called on nav button click; determine which page to open
 */
function switchStep(forward, specificStep) {
    // deactiavte current step (if any) and mark complete
    var currStepObj = $("." + currStepClassName);
    currStepObj.removeClass(currStepClassName);
    // close current content div
    var currPage = null;
    $(".stepContent:visible").each(function () {
        currStepNumber = $(this).attr("id");
        $(this).hide();
    });
    if (currStepNumber) {
        currStepNumber = parseInt(currStepNumber);
        if (forward || specificStep > currStepNumber) {
            XpeCommonUtils.completeStep(currStepObj.attr('id'));
        }
        if (specificStep) {
            openStep(specificStep);
        } else {
            if (forward) {
                openStep(currStepNumber + 1);
            } else {
                openStep(currStepNumber - 1);
            }
        }
    }
    $prevBtn.blur();
}

function uninstallXPE() {
    var deferred = jQuery.Deferred();
    var fullUninstall = false;
    $('.radioButton.active').filter(function() {
        if ($(this).attr('data-option') === "full") {
            fullUninstall = true;
        }
    });

    /**
        Check if Docker running, if not, start; can not
        get time est for uninstall process unless Docker is up
    */
    var numUninstallSteps = 1;
    var stepNum = 0;
    XpeSharedContextUtils.dockerStatus()
    .then(function(res) {
        if (res === dockerStatusStates.UP) {
            return PromiseHelper.resolve("Docker daemon already up; " +
                " bypass starting Docker daemon");
        } else if (res === dockerStatusStates.DOWN) {
            // will need to do a process just for Docker
            numUninstallSteps++;
            stepNum++;
            var dockerStartEstimate = 60;
            var steps = [
                [dockerStartEstimate, "Starting Docker",
                    XpeCommonUtils.handleDocker.bind(
                        this, false, dockerStartEstimate, undefined, undefined, "waitDots")
                ]
            ];
            return ProcessEngineUtil.doProcess(steps, $uninstallerProgressBar,
                $uninstallerProgressBarSection, $uninstallerProgressDescription,
                $uninstallerStepPercent, $uninstallerTotalPercent, true, stepNum,
                numUninstallSteps);
        } else {
            return PromiseHelper.reject("Could not resolve Docker status");
        }
    })
    .then(function(res) {
        // uninstall time a function of num of docker images; get num images
        // before setting time est
        return XpeSharedContextUtils.sendViaHttp("GET", xpeServerUrl + "/getImages/xdpce");
    })
   .then(function(res) {
        if (res.hasOwnProperty('images')) {
            stepNum++;
            var timeEst = 30*Object.keys(res.images).length; // 30 secs per image
            var uninstallFunction = XpeSharedContextUtils.sendViaHttp.bind(
                this, "POST", xpeServerUrl + "/uninstall", JSON.stringify({"fullUninstall": fullUninstall}));
            var steps = [
                [timeEst, "Uninstalling " + XPEStr.prodname, uninstallFunction]
            ];
            return ProcessEngineUtil.doProcess(steps, $uninstallerProgressBar,
                $uninstallerProgressBarSection, $uninstallerProgressDescription,
                $uninstallerStepPercent, $uninstallerTotalPercent, true, stepNum,
                numUninstallSteps);
        } else {
            return PromiseHelper.reject("The return data from getImages/xdpce was not in the expected format; couldn't get a time estimate");
        }
    })
    .then(function () {
        // unmark the install, so that installer would run again if you ran the app
        return XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/unmarkInstalled");
    })
    .then(function() {
        ProcessEngineUtil.finishProcess($uninstallerProgressBar, $uninstallerProgressBarSection,
            $uninstallerStepPercent, $uninstallerTotalPercent,
            $uninstallerProgressDescription, XPEStr.prodname + " has been successfully uninstalled.");
        $uninstallStepProgresss.hide();
        deferred.resolve("UnInstall completed!");
    })
    .fail(function (error) {
        var errorMsg = "Un-installation has failed!";
        if (error.hasOwnProperty("errorLog")) {
            errorMsg += "\n" + error.errorLog;
        }
        deferred.reject(errorMsg);
    });
    return deferred.promise();
}
