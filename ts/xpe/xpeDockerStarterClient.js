var $progressBar;
var $progressBarSection;
var $progressDescription;
var $stepPercent;
var $totalPercent;
var $stepProgress;

$(document).ready(function () {

    $progressBar = $("#progressBar");
    $progressBarSection = $("#progressBarSection");
    $progressDescription = $(".processStepDescription");
    $stepPercent = $(".stepPercent");
    $totalPercent = $(".totalPercent");
    $stepProgress = $(".stepProgressDisplays");

    /**
        (This Window will need to be closed once Docker comes up/fails to come
        up; Window close needs to be handled by nwjs APi; read:

        This window is opened if Docker is not running when XD app starts, and
        handles starting Docker.  It will be the only visible nwjs Window open
        while Docker is starting; it should close (and XD opened) only once
        Docker has started (if Docker fails to start, application should close).
        If last nwjs Window closes then nwjs will terminate, but if user closes
        this Window before Docker comes up, nwjs should keep running and XD should
        open only once Docker is up.
        If Window close is done via nwjs's close api (instead of regular js
        window.close), and listening for close event on that Window, then the
        Window will not actually close; instead the listener will fire (force
        option overrides this behavior.)

        Therefore, in the main program runner that opens this Window, a listener
        will get set for the close event of this Window.
        If window closes, the listener function will hide this Window, wait for
        Docker to come up and then actually close the window once its up.
        If Docker fails here, nwjs force close the window - then the window will
         actually close and program will terminate.
    */

    var alertMsg = "";
    var failed = false;
    var steps = [
        [45, "Starting Docker", XpeCommonUtils.bringUpDocker.bind(this, 200)],
        [20, "Bringing up Xcalar containers", XpeCommonUtils.bringUpContainers.bind(this)],
    ];
    // hiding step percent and using what's normal total percent display,
    // for the step percent display
    $stepProgress.hide();
    ProcessEngineUtil.doProcess(steps, $progressBar, $progressBarSection,
        $progressDescription, $totalPercent, undefined, true, undefined, undefined, "", true)
    .then(function() {
        ProcessEngineUtil.finishProcess($progressBar, $progressBarSection,
            $totalPercent, undefined,
            $progressDescription, "Docker started");
        alertMsg = "Docker started successfully!";
    })
    .fail(function(error) {
        var errDisplay = error;
        if (typeof error !== 'undefined' && error.errorLog) {
            errDisplay = error.errorLog;
        }
        alertMsg = "Could not start docker!  Reason:\n" + errDisplay +
            "\nPlease check your Docker installation and re-run";
        // sometimes err too long for display; put in log
        console.log("\nDOCKER STARTER GUI FAILURE: " + alertMsg);
        failed = true;
    })
    .always(function() {
        // using setTimeout because otherwise the alert was firing prior
        // to the jquery setters, not sure why
        setTimeout(function() {
            alert(alertMsg);
            if (failed) {
                // quit app gracefully; if just force close window nwjs will crash
                XpeSharedContextUtils.quitNwjs();
            } else {
                // use nwjs close method; there's a listener that does
                // cleanup and it won't fire if regular window.close used
                var currWindow = nw.Window.get();
                currWindow.close();
            }
        }, 500);
    });
});
