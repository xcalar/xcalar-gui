var XpeCommonUtils = (function(XpeCommonUtils) {

    // URL for sending the API requests
    var xpeServerUrl = global.xpeServerUrl;
    if (typeof xpeServerUrl === 'undefined') {
        console.log("ERROR: xpeServerUrl has not been set in global");
    }

    function setStepClass(stepId, newClass) {
        var $step = $("#" + stepId);
        // clear out any previous classes for states that were set
        $step.removeClass("fail");
        $step.removeClass("complete");
        $step.addClass(newClass);
    }
    function setStepIconClass(stepId, newClass) {
        var $step = $("#" + stepId);
        var $stepIcon = $($step).find("i");
        // need to clear any classes used to set state, but keep base icon class
        $stepIcon.attr("class", "icon");
        $stepIcon.addClass(newClass);
    }
    XpeCommonUtils.failStep = function(stepId) {
        setStepClass(stepId, "fail");
        setStepIconClass(stepId, "xi-installerscreen-failedicon");
    };

    XpeCommonUtils.pendStep = function(stepId) {
        setStepClass(stepId, "pend");
        setStepIconClass(stepId, "xi-installerscreen-opencircle");
    };

    XpeCommonUtils.completeStep = function(stepId) {
        setStepClass(stepId, "complete");
        setStepIconClass(stepId, "xi-success");
    };

    /**
     * Brings up Docker daemon and optionally Xcalar containers, if not up
     * Optionally updates GUI with progress messages
     * @containers: optional bool - bring up xcalar container once Docker up?
     * @timeout: optional int - secs to wait for Docker to come up before timeout
     * @progressMsgDomId: If supplied, will update HTML of this dom id each step
     * @successMsg: msg to update progressMsgDomIt on final step success
     * @failMsg: msg to update progressMsgDomId on failure
     * @displayWaitDots: if true display animated ... beside progress messages
     *
     * If you call this method and do not supply the div ids,
     *   handleDockerStatusWrapper(<containers>);
     *   It will simply bring up Docker silently in the background,
     *   no GUI need be involved
     */
    XpeCommonUtils.handleDockerStatusWrapper = function(containers=false,
        timeout=XpeSharedContextUtils.DOCKER_TIMEOUT, progressMsgDomId, displayWaitDots,
        successMsg="", failMsg="") {

        var deferred = jQuery.Deferred();

        // check first if Docker up
        XpeSharedContextUtils.dockerStatus()
        .then(function(res) {
            if (res === dockerStatusStates.UP) {
                deferred.resolve("Docker daemon is already up.");
                return deferred.promise();
            } else if (res === dockerStatusStates.DOWN) {
                return XpeCommonUtils.handleDocker(containers, timeout,
                    progressMsgDomId, displayWaitDots, successMsg, failMsg);
            } else {
                deferred.reject("Could not determine Docker status. " +
                    "\nStatus returned: " +
                    res +
                    "\nExpected status states: " +
                    JSON.stringify(dockerStatusStates));
            }
        })
        .then(function(res) {
            deferred.resolve(res);
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    };

    function updateWaitMsg(msgDomId, waitMsg, displayWaitDots) {
        if (typeof msgDomId !== 'undefined') {
            var $msgDomObj = $("#" + msgDomId);
            if ($msgDomObj.length > 0) {
                if (displayWaitDots) {
                    XpeCommonUtils.countDownDotAnimation(msgDomId, waitMsg);
                } else {
                    $msgDomObj.html(waitMsg);
                }
            } else {
                console.log("Can not update wait msg; jquery dom object isn't valid");
            }
        }
    }

    /**
     * starts Docker daemon and optionally Xcalar containers;
     * does not check if up before starting
     * (see header of 'handleDockerStatusWrapper' for description of options)
     *
     * (Broken in to two sep.. methods because sometimes want to check status
     * before trying to start Docker. Example - when updating progress messages
     * in a GUI, only want to display initial 'Docker starting' message if
     * daemon is actually unavailable. But when not dealing with a GUI, don't
     * need to check first and can just call this method.)
     */
    XpeCommonUtils.handleDocker = function(containers=false, timeout=XpeSharedContextUtils.DOCKER_TIMEOUT,
        progressMsgDomId, displayWaitDots, successMsg="", failMsg="") {

        var $progressInfo;
        if (progressMsgDomId) {
            $progressInfo = $("#" + progressMsgDomId);
            if ($progressInfo.length === 0) {
                console.log("ERROR: specified dom id " + progressMsgDomId +
                    " for progress messages, but can't get jquery element " +
                    " by this id");
            }
        }

        updateWaitMsg(
            progressMsgDomId, "Starting Docker.  Please wait", displayWaitDots);

        var deferred = jQuery.Deferred();
        XpeCommonUtils.bringUpDocker(timeout)
        .then(function() {
            // cancel the docker count down and start bringing up containers
            if (containers) {
                updateWaitMsg(progressMsgDomId,
                        "Bringing up the Xcalar containers", displayWaitDots);
                return XpeCommonUtils.bringUpContainers();
            } else {
                return PromiseHelper.resolve("ok");
            }
        })
        .then(function(res) {
            updateWaitMsg(progressMsgDomId, successMsg, false);
            deferred.resolve("ok");
        })
        .fail(function(error) {
            var errMsg = JSON.stringify(error);
            if (error.errorLog) {
                errMsg = error.errorLog;
            }
            updateWaitMsg(progressMsgDomId, failMsg, false);
            deferred.reject(errMsg);
        });
        return deferred.promise();
    };

    XpeCommonUtils.bringUpDocker = function(timeout) {
        if (typeof timeout === 'undefined') {
            timeout = XpeSharedContextUtils.DOCKER_TIMEOUT;
        }
        return XpeSharedContextUtils.sendViaHttp("POST",
            xpeServerUrl + "/startDocker", JSON.stringify({"timeout": timeout}));
    };

    XpeCommonUtils.bringUpContainers = function() {
        return XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/bringupcontainers");
    };

    /**
     * starts animated ... animation in given dom id;
     * optionally displays a wait test in front of the dots.
     * Uses classes defined in basic.less
     */
    XpeCommonUtils.countDownDotAnimation = function(domId, waitText="") {
        var $domForDots = $("#" + domId);
        var html = "<div class='animatedEllipsisWrapper'>" +
                "<div class='text'>" +
                waitText +
                "</div>" +
                "<div class='animatedEllipsis'>" +
                // following 3 divs req newlines between for styling to work
                "<div>.</div>\n" +
                "<div>.</div>\n" +
                "<div>.</div>\n" +
                "</div>" +
                "</div>";
        $domForDots.html(html);
    };

    return XpeCommonUtils;
})({});


