/*
This file defines the base class for us to run the XD Func Test

Notice: activate a workbook will cause a hard-reloading and wipe all the
state info out. We use sessionStorage here to store the corresponding
test state info.

visit funTest.html
params:
    user: userName to use, default will be admin
    mode: nothing, ten or hundred - ds size
    animation: if testsuite should run with animation, y to show
    clean: if teststuite should clean table after finishing, y to clean
    noPopup: y to suppress alert with final results
    timeDilations: slow internet factor
    verbosity: "Verbose" to output the log
    iterations: iterations for the test
    seed: set a seed for all random function, default would be Date.now()
example:
    http://localhost:8888/funcTest.html?user=test&clean=y&close=y
    http://localhost:8888/funcTest.html?user=admin&iterations=120&seed=1553718544442

*/
window.FuncTestSuite = (function(FuncTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var defaultTimeout = 72000000; // 1200min
    var verbosity = "Verbose"; // Verbose or Silent
    var stateMachine;

    FuncTestSuite.setup = function() {
        var params = getUrlParameters();
        var user = params.user || 'admin';
        autoLogin(user);
        // Append a suffix to the seed to avoid using the same seed
        // when launching a multi-user xd func test
        var seed = params.seed || Date.now().toString() + Math.floor(Math.random()*100);
        if (!xcSessionStorage.getItem('xdFuncTestInitSeed')) {
            xcSessionStorage.setItem("xdFuncTestInitSeed", seed);
            xcSessionStorage.setItem("xdFuncTestSeed", seed);
        }
        if (!xcSessionStorage.getItem('xdFuncTestStatus')) {
            xcSessionStorage.setItem('xdFuncTestStatus', "running");
        }
        var iterations = getIterations(params);
        if (!xcSessionStorage.getItem('xdFuncTestTotalRun')) {
            xcSessionStorage.setItem('xdFuncTestTotalRun', iterations);
        }
        if (!xcSessionStorage.getItem('xdFuncTestStartTime')) {
            var d = new Date();
            xcSessionStorage.setItem('xdFuncTestStartTime', d.getTime());
        }
        if (verbosity) {
            this.verbosity = verbosity;
        }
        xcSessionStorage.setItem('xdFuncTestIterations', iterations);
    };

    FuncTestSuite.run = async function() {
        try {
            await xcManager.setup();
            await runFuncTest();
        } catch (err) {
            if (err === WKBKTStr.NoWkbk) {
                // No workbook should be fine
                await runFuncTest();
            } else {
                err = wrapFailError(err);
                throw err
            }
        }
        return;
    }

    async function runFuncTest() {
        var params = getUrlParameters();

        var clean = parseBooleanParam(params.cleanup);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var timeDilation = params.timeDilation;
        var verbosity = params.verbosity || "Verbose";

        test = TestSuite.createTest();
        test.setMode(mode);
        if (WorkbookManager.getActiveWKBK() != null) {
            await test.waitUntil(() => {
                return DagPanel.Instance.hasSetup();
            });
        }
        initializeTests();
        var iterations = getIterations(params);
        if (!xcSessionStorage.getItem('xdFuncTestTotalRun')) {
            xcSessionStorage.setItem('xdFuncTestTotalRun', iterations);
        }
        if (!xcSessionStorage.getItem('xdFuncTestStartTime')) {
            var d = new Date();
            xcSessionStorage.setItem('xdFuncTestStartTime', d.getTime());
        }
        stateMachine = new StateMachine(verbosity, iterations, test);
        return test.run(animation, clean, noPopup, timeDilation);
    }

    function initializeTests() {
        // add tests
        test.add(funcTest, "XD Func Tests", defaultTimeout, TestCaseEnabled);
    }

    async function funcTest(deferred, testName, currentTestNumber) {
        try {
            await stateMachine.run();
            var currentRun = parseInt(xcSessionStorage.getItem('xdFuncTestIterations'));
            var totalRun = parseInt(xcSessionStorage.getItem('xdFuncTestTotalRun'));
            test.startTime = parseInt(xcSessionStorage.getItem('xdFuncTestStartTime'));
            if (currentRun == 0) {
                console.log(`XD Functests passed with " ${totalRun} " runs ! The seed is ${xcSessionStorage.getItem('xdFuncTestInitSeed')}`);
                totalRun = null;
                xcSessionStorage.setItem("xdFuncTestStatus", 'pass');
                cleanupSessionStorage();
                test.pass(deferred, testName, totalRun);
            }
        } catch (error) {
            var currentRun = parseInt(xcSessionStorage.getItem('xdFuncTestIterations'));
            var totalRun = parseInt(xcSessionStorage.getItem('xdFuncTestTotalRun'));
            test.startTime = parseInt(xcSessionStorage.getItem('xdFuncTestStartTime'));
            console.log(`XD Functests failed in " ${totalRun-currentRun} " runs ! The seed is ${xcSessionStorage.getItem('xdFuncTestInitSeed')}`);
            let errorMsg = error;
            if (typeof errorMsg === "object") {
                if (errorMsg instanceof Error) {
                    errorMsg = errorMsg.stack;
                } else if (errorMsg.error instanceof Error) {
                    errorMsg = errorMsg.error.stack;
                } else {
                    errorMsg = JSON.stringify(errorMsg);
                }
            }
            console.log("======================XDFuncTest Fatal Error===========================");
            console.log("Error:", errorMsg);
            console.log("Whole Error:", JSON.stringify(error));
            console.log("======================XDFuncTest Fatal Error Ends=======================");
            xcSessionStorage.setItem("xdFuncTestStatus", 'fail');
            cleanupSessionStorage();
            test.fail(deferred, testName, totalRun-currentRun, errorMsg);
        }
    }

    function wrapFailError(error) {
        if (typeof error !== "object") {
            error = {"error": error};
        }
        if (error.fail == null) {
            error.fail = 1;
        }
        if (error.pass == null) {
            error.pass = 0;
        }
        return error;
    }

    /* -------------------------------Helper Function------------------------------- */
    function getIterations(params) {
        var defaultIterations = 150;
        var iterations = xcSessionStorage.getItem('xdFuncTestIterations') || params.iterations;
        if (iterations) {
            return parseInt(iterations);
        }
        return defaultIterations;
    }

    function autoLogin(user) {
        xcSessionStorage.setItem("xcalar-username", user);
    }

    function getUrlParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
    }

    function parseBooleanParam(param) {
        if (param === "y") {
            return true;
        } else {
            return false;
        }
    }

    function transformToAssocArray(prmstr) {
        var params = {};
        var prmarr = prmstr.split("&");
        for ( var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params[tmparr[0]] = tmparr[1];
        }
        return params;
    }

    function cleanupSessionStorage() {
        xcSessionStorage.removeItem('xdFuncTestTotalRun');
        xcSessionStorage.removeItem('xdFuncTestIterations');
        xcSessionStorage.removeItem('xdFuncTestStartTime');
        xcSessionStorage.removeItem('xdFuncTestFirstTimeInit');
        xcSessionStorage.removeItem('xdFuncTestStatus');
        xcSessionStorage.removeItem('xdFuncTestSeed');
        xcSessionStorage.removeItem('xdFuncTestInitSeed');
    }
    /* -------------------------------Helper Function------------------------------- */

    return (FuncTestSuite);
}({}));
