/**
 * util to perform a sequential set of steps, and animate progress bar
 * and step/total percentages.
 *
 * Example:
 * var steps = [
 *      [20, "Do something", <function>],
 *      [10, "Do something else", <function2>]
 * ];
 * doProcess(steps, [<jQuery elements>])
 * .then(function(res) {
 *       finishProcess(<jQuery elements>);
 *  });
 *
 */

var ProcessEngineUtil = (function(ProcessEngineUtil) {

    /**
     * main process driver.
     * @steps: array of arrays.  Each inner array represents a step in the process, as:
     *    [ <step time est (in seconds)>, <description of step>, <async function to call when step begins>]
     * @progressBar: jquery object for progress bar to animate
     * @progressBarSection: jQuery object for progress bar's section wrapper which
     *    determines it's type (processing, failed, completed, etc.)
     * @progressDescription: jQuery object to update with description, step num, etc.
     * @stepPercent: jQuery object for displaying % of step complete
     * @totalPercent: jQuery object for displaying % of process that's completed
     * @fillEachStep: should progress bar iterate to 100% for each step, or should
     *    only go to percent of entire process that step
     * @startStepCountAt: start numbering the steps at this value
     * @forceTotalSteps: uses as total num steps regardless how many steps there are
     *    (each 'doStep' updates $progressDescription w/ <step #>/<total # steps>)
     *    in case need to call doProcess more than once, but look like one process
     * @longStep: if provided, will display <longStep> <stepNum>/<total Steps> when
     *    updating the step description
     * @displayWaitDots: display animated ... after step descriptions
     */
    ProcessEngineUtil.doProcess = function(steps, $progressBar, $progressBarSection,
        $progressDescription, $stepPercent, $totalPercent, fillEachStep=false,
        startStepCountAt=1, forceTotalSteps, longStep="Step ", displayWaitDots=false) {

        // time est is first element in each step array
        var totalTimeEst = 0;
        var numSteps = 0;
        for (var i=0; i<steps.length; i++) {
            numSteps++;
            totalTimeEst = totalTimeEst + steps[i][0];
        }
        // everything after this will be in milliseconds
        totalTimeEst = totalTimeEst*1000;
        if (forceTotalSteps) {
            numSteps = forceTotalSteps;
        }

        // create a function for each of these steps and then call PromiseHelper.chain
        var chainFunctions = [];
        var stepNum = startStepCountAt - 1;
        for (var i=0; i<steps.length; i++) {
            stepNum++;
            var currStep = steps[i];
            var stepTimeEst = currStep[0]*1000;
            var stepDesc = currStep[1];
            var stepFunction = currStep[2];
            chainFunctions.push(doStep.bind(this, stepFunction, stepDesc,
                stepTimeEst, totalTimeEst, stepNum, numSteps, longStep,
                $progressBar, $progressBarSection, $progressDescription,
                $stepPercent, $totalPercent, fillEachStep, displayWaitDots));
        }
        return PromiseHelper.chain(chainFunctions);
    };

    /**
     * Call when entire process is completed, sets progress bar and all
     * percents to 100 and marks progress bar as complete.
     * @progressBar: jQuery object for the progress bar
     * @progressBarSection: jQuery object for section parent of progress bar
     * @stepPercent: jQuery object for step % info
     * @totalPercent: jQuery object for displayl total process %
     * @progressDescription: jQuery object for updating information on progress
     * @finishmsg: if supplied will update $progressDescription with this msg
     */
    ProcessEngineUtil.finishProcess = function($progressBar, $progressBarSection,
            $stepPercent, $totalPercent, $progressDescription, finishMsg) {
        if (typeof finishMsg !== 'undefined') {
            $progressDescription.html(finishMsg);
        }
        setProgressBarTypeComplete($progressBarSection);
        updatePercentObj($stepPercent, 100);
        updatePercentObj($totalPercent, 100);
        updateProgressBarPercent($progressBar, 100, 200);
    };

    /**
     * resets progress bar and step/total percents back to 0 and
     * sets progress bar in a processing state
     * @progressBar: jQuery object for the progress bar
     * @progressBarSection: jQuery object for section parent of progress bar
     * @stepPercent: jQuery object for displaying % of step completed
     * @totalPercent: jQuery object for displaying total % of process completed
     * @progressDescription: jQuery object for displaying info about progress
     */
    ProcessEngineUtil.resetProcess = function($progressBar, $progressBarSection,
            $stepPercent, $totalPercent, $progressDescription) {
        $progressDescription.html("");
        setProgressBarTypeProcessing($progressBarSection);
        updatePercentObj($stepPercent, 0);
        updatePercentObj($totalPercent, 0);
        updateProgressBarPercent($progressBar, 0);
    };

    function getPercent($percent) {
        var currPercent = parseFloat($percent.attr("value"));
        return currPercent;
    }

    /**
     * @$percent jQuery object to update
     * @updatePercent: float (10, 95, etc., not .1, .9)
     *  (if not supplied will clear html and value for the object)
     */
    function updatePercentObj($percent, updatePercent="") {
        if (typeof $percent === 'undefined') {
            console.log("Won't update percent; percent object undefined");
        } else {
            if ($percent.length) {
                var htmlValue = "";
                var argType = typeof updatePercent;
                if (argType === 'number') {
                    htmlValue = updatePercent.toFixed(2) + "%";
                } else {
                    console.log("WARNING: updatePercent in updatePercentObj is NaN " +
                        " (it is " + argType + "); html will update to empty string");
                }
                $percent.html(htmlValue);
                $percent.attr("value", updatePercent);
            } else {
                console.log("Won't update percent; jQuery $percent obj has " +
                    " no matches");
            }
        }
    }

    /**
     * returns current % progreess bar is filled
     */
    function getProgressBarPercent($progressBar) {
        // width() will return px, need to calc based on parent width
        var currProgressBarPercent = $progressBar.width() / $progressBar.parent().width() * 100;
        return currProgressBarPercent;
    }

    /**
     * updates progress bar to given % at specified speed
     * @progressBar: jQuery object for the progress bar
     * @updatePercent: number - % to fill progress
     * @animationSpeed: time (in milliseconds) to complete fill.  If not supplied
     *   will statically update to updatePercent (no animation)
     */
    function updateProgressBarPercent($progressBar, updatePercent, animationSpeed) {
        var deferred = PromiseHelper.deferred();
        var percentStr = updatePercent.toString();
        var percentStrSym = updatePercent.toString() + "%";
        if (animationSpeed) {
            $progressBar.animate({"width": percentStrSym}, {
                'duration': animationSpeed,
                'done': function(res) {
                    deferred.resolve("ok");
                }
            });
        } else {
            // set width statically
            $progressBar.width(percentStrSym);
            deferred.resolve("ok");
        }
        return deferred.promise();
    }

    /**
     * Performs a single step in the process.
     * @stepFunction: async function to execute.  When function completes
     *   step is done.
     * @description: description of the step
     * @stepTimeEst: int - estimated time (in ms) step will run for
     * @totalTimeEst: int - estimated time (in ms) entire process runs
     * @stepNum: (optional) int - what num this step is in the process
     *    (if supplied with @totalNumSteps, will display <step>/<total> in desc.)
     * @totalNumSteps: (optional) int - total num steps in the process
     *  (if supplied with @stepNum, will display  <step>/<total> in step desc.)
     * @prependToStepDescription: an optional string to prepend to the step desc.
     *  if supplied with @stepNum and @totalNumSteps, will prepend to <step>/<total>
     *  i.e., @prependToStepDescription="Step #" results in
     *  (Step # <step>/<total>):) in the step description html
     * @progressBar: jQquery object for the progress bar
     * @progressbarSection: jQuery object for progress bar's section wrapper
     *    (determines progress bar type, completed, processing, failed, etc.)
     * @progressDescription: jQuery object for displaying step description/info
     * @stepPercent: jQuery object for displaying % of step completed
     * @totalPercent: jQuery object for displaying % of total process completed
     * @fillProgressBarEachStep: fill progress bar entirely for each step, instead
     *    of % of total process
     * @displayWaitDots: display animated ... after step descriptions and clear when
     *    step ends (success or failure)
     */
    function doStep(stepFunction, description, stepTimeEst, totalTimeEst,
            stepNum, totalNumSteps, prependToStepDescription,
            $progressBar, $progressBarSection, $progressDescription,
            $stepPercent, $totalPercent, fillProgressBarEachStep, displayWaitDots) {

        console.log("\n## doStep:\n\t" + stepNum + "/" + totalNumSteps +
            "\n\tdescription: " + description + "\n\t step time est (ms): " +
            stepTimeEst + "\n\ttotal time est (ms): " + totalTimeEst +
            "\n\tFill each step?  " + fillProgressBarEachStep);

        var deferred = PromiseHelper.deferred();

        // reset from previous step
        resetStep($progressBar, $stepPercent, $totalPercent, fillProgressBarEachStep);
        // what % should progreess bar/total process % go to when step is complete?
        var totalPercentStepEnd = 100;
        if (!fillProgressBarEachStep) {
            // curr % of process completed at step start
            var totalPercentCompleteCurr = getPercent($totalPercent);
            console.log("\t\t% total process complete at step start: " + totalPercentCompleteCurr);

            // % of total progress this step should take
            var stepPercentOfTotal = (stepTimeEst/totalTimeEst)*100;
            console.log("\t\t% of process this step represents : " + stepPercentOfTotal);
            var totalPercentStepEnd = totalPercentCompleteCurr + stepPercentOfTotal;
        }

        // if we know how many steps, add this in to the description
        var stepDescription = description;
        if (typeof stepNum !== 'undefined' && typeof totalNumSteps !== 'undefined') {
            var prependDescription = stepNum + "/" + totalNumSteps + ": ";
            if (typeof prependToStepDescription !== 'undefined') {
                prependDescription = prependToStepDescription + prependDescription;
            }
            stepDescription = prependDescription + stepDescription;
        }

        var [stepPromise, stepPercentIntervalId, totalPercentIntervalId] = startStep(
            stepFunction, stepDescription, displayWaitDots, stepTimeEst, totalPercentStepEnd,
            $progressBar, $progressDescription, $stepPercent, $totalPercent);

        // wait for the step process to resolve
        stepPromise
        .then(function(res) {
            // clear intervlas for updating %s before finishing or %s will get jumbled
            clearInterval(stepPercentIntervalId);
            clearInterval(totalPercentIntervalId);
            return finishStep($progressBar, $stepPercent, $totalPercent, totalPercentStepEnd);
        })
        .always(function(res) {
            // set step descr as just description text, to clear any wait dots
            $progressDescription.html(stepDescription);
        })
        .then(function(res) {
            deferred.resolve("done");
        })
        .fail(function(res) {
            $progressBar.stop();
            // clear out the precentage interval running for this step
            clearInterval(stepPercentIntervalId);
            clearInterval(totalPercentIntervalId);
            setProgressBarTypeFailure($progressBarSection);
            deferred.reject(res);
        });

        return deferred.promise();
    }

    /**
     * start the step: execute the async function supplied for this step,
     * begin animating the progress bar and updating percentages
     * @stepFunction: an async function that returns a promise, representing the actual
     *        step logic for this step (see 'doProcess')
     * @desc: String; a description of the step
     * @displayWaitDots: (boolean) display animated ... after step description
     * @stepTimeEst: time (in milliseconds) step is estimated to take
     * @totalPercentStepEnd: float - % progress bar should be filled to when step ends
     * @progressDescription, $stepPercent, $totalPercent - jQuery objs for progress
     *      description, total percent display and step percent display
     */
    function startStep(stepFunction, desc, displayWaitDots, stepTimeEst, totalPercentStepEnd,
        $progressBar, $progressDescription, $stepPercent, $totalPercent) {

        // start the step itself
        var stepPromise = stepFunction();

        // update html w/ step description and add wait dots if requested
        $progressDescription.html(desc);
        if (displayWaitDots) {
            addWaitDots($progressDescription);
        }

        // kick of animation of the progress bar and percent updates
        updateProgressBarPercent($progressBar, totalPercentStepEnd, stepTimeEst);
        var stepPercentUpdateIntervalId = startPercentAnimation(
            $stepPercent, 100, stepTimeEst, 100); // update step % each 10th second
        var totalPercentUpdateIntervalId = startPercentAnimationProgressBar(
            $progressBar, $totalPercent, 1000); // update total only each sec, based on progress bar so they are in sync

        return [stepPromise, stepPercentUpdateIntervalId, totalPercentUpdateIntervalId];
    }

    /**
     * finishes a step by setting step % to 100, completing progress bar animation
     * to a specified fill %, and updates totalPercent.  Resolves once progress bar
     * has filled to requested %.
     */
    function finishStep($progressBar, $stepPercent, $totalPercent, totalPercentStepEnd) {
        var deferred = PromiseHelper.deferred();
        $progressBar.stop();
        updateProgressBarPercent($progressBar, totalPercentStepEnd, 200)
        .then(function(res) {
            updatePercentObj($stepPercent, 100);
            // progress bar might not have gotten updated to exact percent
            // requested, and might have been rounded down slightly.  So update
            // total % to what progress bar actually is right now - not totalPercentStepEnd,
            // else, total % could get set to totalPercentStepEnd here, and then
            // end up decreasing on the first update of the next step (total %
            // gets updated during steps based on progress bar's curr %, not any
            // static value, and the progress bar's % would actually be lower
            // than totalPercentStepEnd when the first update is done.)
            // this will not happen on 100% so no issue of not displaying 100%
            //updatePercentObj($totalPercent, totalPercentStepEnd);
            updatePercentObj($totalPercent, getProgressBarPercent($progressBar));
            deferred.resolve("ok");
        });
        return deferred.promise();
    }

    /**
     * reset for next step; step % back to 0, and total % and progress bar back to 0
     * if process is set to iterate through progress bar each step
     */
    function resetStep($progressBar, $stepPercent, $totalPercent, resetTotal) {
        updatePercentObj($stepPercent, 0);
        if (resetTotal) {
            updatePercentObj($totalPercent, 0);
            updateProgressBarPercent($progressBar, 0);
        }
    }

    /**
     * starts incrementing % value displayed in a div, but does so based on
     * current % progress bar is filled to. (for updating total % of process and
     * keeping it in sync with the progress bar)
     * @progressBar: jQuery object for progress bar to get filled % from
     * @percent: jQuery object for updating the %
     * @updateInterval: how often (in milliseconds) to update $percent
     * @stopAt: stop updating $percent once you get here
     */
    function startPercentAnimationProgressBar($progressBar, $percent,
        updateInterval, stopAt=98) {

        var interval = setInterval(function() {
            var value = getProgressBarPercent($progressBar);
            updatePercentObj($percent, value);
            if(value >= stopAt) {
                clearInterval(interval);
            }
        }, updateInterval);
        return interval;
    }

    /**
     * takes a div displaying some percentage value, and starts incrementing that
     * value up to some requested value over regular intervals
     * @percent: jQuery object for div to display % in
     * @endPercent: what % to increment up to
     * @duration: time (in milliseconds) to increment to endPercent
     * @updateInterval: how often to update percent (in milliseconds)
     * @stopAt: stop incrementing at this % (even if it is less than endPercent)
     */
    function startPercentAnimation($percent, endPercent, duration, updateInterval, stopAt=98) {
        var percentStart = getPercent($percent);
        var incrementBy = endPercent - percentStart;
        var maxNumIntervals = duration/updateInterval;
        var percentIncEachInterval = incrementBy/maxNumIntervals;

        var value = percentStart;
        var interval = setInterval(function() {
            value = value + percentIncEachInterval;
            updatePercentObj($percent, value);
            if(value >= stopAt) {
                clearInterval(interval);
            }
        }, updateInterval);
        return interval;
    }

    /**
     * adds wait dots to a dom object and returns the curr html in the dom obj.
     * (clear the waitDots by setting the html back to that returned value)
     */
    function addWaitDots($domObj) {
        var currHtml = $domObj.html();
        var dotHtml = "<div class='animatedEllipsisWrapper'>" +
                "<div class='text'>" +
                currHtml +
                "</div>" +
                "<div class='animatedEllipsis'>" +
                // following 3 divs req newlines between for styling to work
                "<div>.</div>\n" +
                "<div>.</div>\n" +
                "<div>.</div>\n" +
                "</div>" +
                "</div>";
        $domObj.html(dotHtml);
        return currHtml
    }

    // sets progress bar to various states by changing class in
    // parent section

    function setProgressBarType($progressBarSection, type) {
        $progressBarSection.removeClass("error");
        $progressBarSection.removeClass("processing");
        $progressBarSection.removeClass("done");
        $progressBarSection.addClass(type);
    }

    function setProgressBarTypeFailure($progressBarSection) {
        setProgressBarType($progressBarSection, "error");
    }

    function setProgressBarTypeProcessing($progressBarSection) {
        setProgressBarType($progressBarSection, "processing");
    }

    function setProgressBarTypeComplete($progressBarSection) {
        setProgressBarType($progressBarSection, "done");
    }

    return ProcessEngineUtil;

})({});


