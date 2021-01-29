/* visit testSuite.html
 *  params:
 *      user: userName to use, default will be testSuite + random suffix
 *      test: only set to y then can we trigger teststuite
 *      delay:  dealy time before running test suite
 *      animation: if testsuite should run with animation
 *      clean: if teststuite should clean table after finishing
 *      close: y or force. if y, window closes after successful run. if
 *        force, window closes after all runs regardless of success or failure
 *      id: id of current run. For reporting back to testSuiteManager
 *      noPopup: y to suppress alert with final results
 *      mode: nothing, ten or hundred - ds size
 *      type: string, type of test "testsuite"
 * example:
 *  http://localhost:8888/testSuite.html?test=y&delay=2000&user=test&clean=y&close=y
 */
window.TestSuiteSetup = (function(TestSuiteSetup) {
    var testSuiteKey = "autoTestsuite";
    var hasUser = true;

    TestSuiteSetup.setup = function() {
        var params = getUrlParameters();
        var user = params.user;
        if (user == null) {
            hasUser = false;
        } else {
            autoLogin(user);
        }
    };

    TestSuiteSetup.initialize = function() {
        var deferred = PromiseHelper.deferred();
        // in case of the auto login trigger of short cuts
        xcLocalStorage.removeItem("autoLogin");
        xcLocalStorage.setItem("xcalar-noModeSwitchAlert", "true");
        var params = getUrlParameters();
        var runTest = hasUser && parseBooleanParam(params.test);
        var testType = params.type;
        var createWorkbookOnly = params.createWorkbook;
        var toTest = xcSessionStorage.getItem(testSuiteKey);

        if (toTest) {
            heartBeat();
        }
        xcManager.setup()
        .then(function() {
            if (!runTest) {
                if (!hasUser) {
                    document.write("Please specify a user name");
                }
                return;
            }
            // make sure it's in the notebook screen
            HomeScreen.switch(UrlToTab.notebook);
            if (toTest != null) {
                // set the 2 options to false first
                UserSettings.Instance.setPref("dfAutoExecute", false, false);
                UserSettings.Instance.setPref("dfAutoPreview", false, false);
                // next time not auto run it
                xcSessionStorage.removeItem(testSuiteKey);
                if (testType === "sql") {
                    return autoRunSQLTest();
                } else {
                    return autoRunTestSuite();
                }
            } else {
                return autoCreateWorkbook();
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (runTest && error === WKBKTStr.NoWkbk || createWorkbookOnly) {
                autoCreateWorkbook()
                .then(deferred.resolve)
                .fail(function(err) {
                    err = wrapFailError(err);
                    reportResults(err);
                    deferred.reject(err);
                });
            } else {
                error = wrapFailError(error);
                reportResults(error);
                deferred.reject(error);
            }
        });
        return deferred.promise();
    };

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

    function heartBeat() {
        var connectionCheck = true;
        var interval = 60 * 1000; // 1min
        var timer = setInterval(function() {
            XcalarGetVersion(connectionCheck)
            .fail(function() {
                clearInterval(timer);
                reportResults({"error": "Connection issue"});
            });
        }, interval);
    }

    function autoLogin(user) {
        // XXX this may need to be replace after we have authentiaction
        xcSessionStorage.setItem("xcalar-username", user);
    }

    function autoCreateWorkbook() {
        xcSessionStorage.setItem(testSuiteKey, "true");
        return createWorkbook();
    }

    function createWorkbook() {
        gMinModeOn = true;
        var deferred = PromiseHelper.deferred();
        var count = 0;
        var params = getUrlParameters();
        var wbInterval = setInterval(function() {
            if ($('#workbookPanel').is(':visible')) {
                var wbName = params.createWorkbook;
                if (!wbName || wbName == "y") {
                    var num = Math.ceil(Math.random() * 1000);
                    wbName = "WB" + num;
                }
                WorkbookPanel.createNewWorkbook(wbName);
                clearInterval(wbInterval);

                activateWorkbook(wbName)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject("creeate workbook timeout");
                }
            }
        }, 300);

        return deferred.promise();
    }

    function activateWorkbook(wbName) {
        var deferred = PromiseHelper.deferred();
        var count = 0;
        var innerDeferred = jQuery.Deferred();
        var timeOutCnt = 50;

        var wbInterval = setInterval(function() {
            var $wkbkBox = $('.workbookBox[data-workbook-id*="' + wbName + '"]');
            if ($wkbkBox.length > 0) {
                clearInterval(wbInterval);
                $wkbkBox.find('.activate').click();
                innerDeferred.resolve(wbName);
            } else {
                count++;
                if (count > timeOutCnt) {
                    clearInterval(wbInterval);
                    innerDeferred.reject();
                    deferred.reject("active workbook time out");
                }
            }
        }, 300);

        innerDeferred
        .then(function(wbName) {
            var deactivateInterval = setInterval(function() {
                var $alertBox = $("#alertModal");
                if ($alertBox.is(":visible")) {
                    $alertBox.find(".confirm").click();
                    clearInterval(deactivateInterval);
                    deferred.resolve(wbName);
                } else {
                    count++;
                    if (count > timeOutCnt) {
                        clearInterval(deactivateInterval);
                        deferred.resolve(wbName);
                    }
                }
            }, 300);
        });

        return deferred.promise();
    }

    function autoRunTestSuite() {
        var deferred = PromiseHelper.deferred();
        var params = getUrlParameters();
        var delay = Number(params.delay);

        if (isNaN(delay)) {
            delay = 0;
        }
        var clean = parseBooleanParam(params.cleanup);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var timeDilation = params.timeDilation;

        // console.log("delay", delay, "clean", clean, "animation", animation)
        setTimeout(function() {
            TestSuite.run(animation, clean, noPopup, mode, timeDilation)
            .then(function(res) {
                console.info(res);
                reportResults(res);
                deferred.resolve();
            })
            .fail(deferred.reject);
        }, delay);

        return deferred.promise();
    }

    function autoRunSQLTest() {
        var deferred = PromiseHelper.deferred();
        var params = getUrlParameters();
        var delay = Number(params.delay);

        if (isNaN(delay)) {
            delay = 0;
        }
        var clean = parseBooleanParam(params.cleanup);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var timeDilation = params.timeDilation;

        // console.log("delay", delay, "clean", clean, "animation", animation)
        setTimeout(function() {
            var def = SqlTestSuite.runSqlTests(undefined, animation, clean,
                                        noPopup, mode, timeDilation);
            def
            .then(function(res) {
                console.info(res);
                reportResults(res);
                deferred.resolve();
            })
            .fail(deferred.reject);
        }, delay);

        return deferred.promise();
    }

    function reportResults(res) {
        var params = getUrlParameters();
        var close = params.close;
        var id = Number(params.id);
        if (isNaN(id)) {
            id = 0;
        }

        if (window.opener) {
            window.opener.reportResults(id, res);
            if (close) {
                if (close === "force") {
                    window.close();
                } else {
                    if (res.fail === 0) {
                        window.close();
                    }
                }
            }
        }
    }

    function parseBooleanParam(param) {
        if (param === "y") {
            return true;
        } else {
            return false;
        }
    }

    function getUrlParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
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

    return (TestSuiteSetup);
}({}));
