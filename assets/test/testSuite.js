window.TestSuite = (function($, TestSuite) {
    if (!jQuery || typeof PromiseHelper.deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    var defaultCheckTimeout = 120000; // 2min
    var disableIsPass = true;

    // constructor
    function TestRunner() {
        this.slowInternetFactor = gLongTestSuite || 1;
                            // Change this to 2, 3, etc if you have a slow
                            // internet
        this.testCases = [];
        this.testDS = [];
        this.testPbTables = [];

        this.passes = 0;
        this.fails = 0;
        this.skips = 0;
        this.failReason = null;

        this.startTime = 0;
        this.totTime = 0;
        this.mode = "";

        // For assert to use
        this.curTestNumber;
        this.curTestName;
        this.curDeferred;

        return this;
    }

    TestRunner.prototype = {
        add: function(testFn, testName, timeout, testCaseEnabled) {
            this.testCases.push({
                "testFn": testFn,
                "testName": testName,
                "timeout": timeout,
                "testCaseEnabled": testCaseEnabled
            });
        },

        pass: function(deferred, testName, currentTestNumber) {
            if (deferred.state() === "pending") {
                this.passes++;
                var d = new Date();
                var milli = d.getTime() - this.startTime;

                console.log("ok ", currentTestNumber + " - Test \"" + testName +
                            "\" passed");
                console.log("Time taken: " + milli / 1000 + "s");
                this.totTime += milli;
                deferred.resolve();
            } else {
                console.error("Invalid state", deferred.state());
            }
        },

        fail: function(deferred, testName, currentTestNumber, reason) {
            if (deferred.state() === "pending") {
                this.fails++;
                console.warn("Test " + testName + " failed -- " + reason);
                console.warn("not ok " + currentTestNumber + " - Test \"" +
                             testName + "\" failed (" + reason + ")");
                this.failReason = reason;
                deferred.reject();
            } else {
                console.error("Invalid state", deferred.state());
            }
        },

        skip: function(deferred, testName, currentTestNumber) {
            console.log("====== Skipping " + testName + " ======");
            console.log("ok " + currentTestNumber + " - Test \"" + testName +
                        "\" disabled # SKIP");
            this.skips++;

            if (disableIsPass) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        },

        run: function(hasAnimation, toClean, noPopup, timeDilation) {
            XcUser.CurrentUser.disableIdleCheck();
            var self = this;
            self.noPopup = noPopup;
            console.info("If you are on VPN / slow internet,",
                        "please set gLongTestSuite = 2");
            if (timeDilation) {
                self.slowInternetFactor = parseInt(timeDilation);
            }

            var finalDeferred = PromiseHelper.deferred();
            var errorCatchDeferred = PromiseHelper.deferred();
            var minModeCache = gMinModeOn;
            var oldWindowErrFunc = window.onerror;

            var finish = function() {
                window.onerror = oldWindowErrFunc;
                gMinModeOn = minModeCache;
                var res = self._finish();
                if (res.fail === 0 && res.pass > 0) {
                    $("body").append('<div id="testFinish" style="display:none">PASSED</div>');
                } else {
                    $("body").append('<div id="testFinish" style="display:none">' +
                        "Passes: " + res.pass + ", Fails: " + res.fail +
                        ", Skips: " + res.skip + '</div>');
                }

                finalDeferred.resolve(res);
            };

            var endRun = function() {
                if (toClean) {
                    cleanup(self)
                    .always(finish);
                } else {
                    finish();
                }
            };

            // XXX use min mode for testing to get around of
            // animation crash test problem
            // may have better way
            gMinModeOn = hasAnimation ? false : true;

            window.onerror = function(message, url, line, column, error) {
                self.fail(errorCatchDeferred, null, null, error.stack);
            };

            console.log(self.slowInternetFactor);
            var deferred = PromiseHelper.resolve();
            // Start PromiseHelper.chaining the callbacks
            try {
                var testCases = self.testCases;
                for (var ii = 0; ii < testCases.length; ii++) {
                    deferred = deferred.then(
                        // Need to trap the value of testCase and ii
                        (function trapFn(testCase, currentTestNumber) {
                            return (function() {
                                var localDeferred = PromiseHelper.deferred();
                                if (testCase.testCaseEnabled) {
                                    console.log("====================Test ",
                                    currentTestNumber, " Begin====================");
                                    console.log("Testing: ", testCase.testName);
                                    setTimeout(function() {
                                        if (localDeferred.state() === "pending") {
                                            var reason = "Timed out after " +
                                                 (testCase.timeout / 1000) + " seconds";
                                            self.fail(localDeferred,
                                                    testCase.testName,
                                                    currentTestNumber, reason);
                                        }
                                    }, testCase.timeout);

                                    self.startTime = new Date().getTime();
                                    self.curDeferred = localDeferred;
                                    self.curTestName = testCase.testName;
                                    self.curTestNumber = currentTestNumber;

                                    testCase.testFn(localDeferred, testCase.testName,
                                                    currentTestNumber);
                                } else {
                                    self.skip(localDeferred, testCase.testName,
                                                currentTestNumber);
                                }

                                return localDeferred.promise();
                            });
                        })(testCases[ii], ii + 1) // Invoking trapFn
                    );
                }
            } catch (err) {
                if (err === "testSuite bug") {
                    endRun();
                }
            }

            deferred.fail(function() {
                returnValue = 1;
            });

            deferred.always(endRun);

            errorCatchDeferred.fail(endRun);

            return finalDeferred.promise();
        },

        _finish: function() {
            var passes = this.passes;
            var fails = this.fails;
            var skips = this.skips;

            console.log("# pass", passes);
            console.log("# fail", fails);
            console.log("# skips", skips);
            console.log("==========================================");
            console.log("1.." + this.testCases.length + "\n");
            var timeMsg = "";
            var oldTime = "";
            var totTime = this.totTime;

            if (fails === 0 && passes > 5) {
                var bestTime = xcLocalStorage.getItem("time");
                bestTime = parseFloat(bestTime);
                if (isNaN(bestTime)) {
                    bestTime = 1000;
                }

                if ((totTime / 1000) < bestTime) {
                    xcLocalStorage.setItem("time", totTime / 1000);
                    timeMsg = " New best time!";
                    if (bestTime === 1000) {
                        oldTime = " Old time: N/A";
                    } else {
                        oldTime = " Old time: " + bestTime + "s.";
                    }
                } else {
                    if (bestTime !== 1000) {
                        oldTime = " Current best time: " + bestTime +
                                  "s";
                    }
                }
            }
            var alertMsg = "Passes: " + passes + ", Fails: " + fails +
                            ", Time: " +
                            totTime / 1000 + "s." + timeMsg + oldTime;
            console.log(alertMsg); // if pop ups are disabled
            if (!this.noPopup) {
                alert(alertMsg);
            }

            return {
                "pass": passes,
                "fail": fails,
                "skip": skips,
                "time": totTime / 1000,
                "error": this.failReason
            };
        },

        setMode: function(mode) {
            if (mode) {
                if (mode === "ten") {
                    mode = "ten/";
                    console.log("Running 10X dataset");
                } else if (mode === "hundred") {
                    mode = "hundred/";
                    console.log("Running 100X dataset");
                } else {
                    mode = "";
                    console.log('Running regular dataset');
                }
            } else {
                console.log('Running regular dataset');
            }
        },

        assert: function(statement, reason) {
            if (this.mode) {
                return true;
            }

            reason = reason || this.assert.caller.name;
            if (!statement) {
                console.log("Assert failed!", reason);
                this.fail(this.curDeferred, this.curTestName,
                            this.curTestNumber, reason);
                return false;
            }
            return true;
        },

        loadTable: async function(tableName, filePath, check, addRowNum) {
            try {
                console.log("start load table " + tableName);
                // open load screen
                $("#loadScreenBtn").click();
                await this.checkExists("#loadScreen:visible");
                console.log("in load screen");
                // switch to import panel
                $("#loadScreen .sourceList li[data-tab=import]").click();
                this.assert($("#dsForm-path").is(":visible"), "The import form should be visible");
                console.log("in import panel");
                // fill in connector and file path
                $("#dsForm-target input").val(gDefaultSharedRoot);
                $("#filePath").val(filePath);
                // go to the next step, the source configuration
                $("#dsForm-path").find(".confirm").click();
                await this.checkExists(check);
                // configurtion
                console.log("in configuration panel");
                $("#importDataForm").find(".dsName").eq(0).val(tableName);
                // auto detect should fill in the form
                var empties = $("#previewTable .editableHead[value='']");
                var rand = Math.floor(Math.random() * 10000);
                for (var i = 0; i < empties.length; i++) {
                    empties.eq(i).val("Unused_" + rand + "_" + (i+1));
                }
                if (addRowNum) {
                    $("#importDataForm .extraCols .rowNumber .xi-ckbox-selected").click();
                    $("#importDataForm .extraCols .rowNumber :input").val("ROWNUM");
                }

                $("#importDataForm .buttonSection .createTable").click();
                // confirm
                console.log("confirm in configuration panel");
                if ($("#alertModal").is(":visible") &&
                    $("#alertHeader").text().trim() === DSTStr.DetectInvalidCol) {
                    $("#alertModal").find(".confirm").click();
                }
                // wait for table to loaded
                await this.waitUntil(() => {
                    const $li = $("#dagListSection .tableList li:not(.loading)").filter((_index, el) => {
                        return $(el).find(".name").text() === tableName;
                    });
                    return $li.length === 1;
                }, 1000);
                console.log("table " + tableName + " loaded");
                this.testPbTables.push(tableName);
                $("#homeBtn").click();
                this.assert($("#homeScreen").is(":visible"), "Should back to home screen");
                $("#notebookScreenBtn").click();
                this.assert($("#sqlWorkSpacePanel").is(":visible"), "Should show notebook screen");
            } catch (e) {
                console.error("load table error", e);
                throw e;
            }
        },

        createNode: function(type, subType) {
            var node = DagViewManager.Instance.newNode({
                type: type,
                subType: subType || null,
                display: {
                    x: 0,
                    y: 0
                }
            });
            var $node = $('#dagView .operatorSvg [data-nodeid="' + node.getId() + '"]');
            this.assert($node.length === 1);
            return $node;
        },

        nodeMenuAction($node, action) {
            // select node
            $node.find(".main").trigger(fakeEvent.mousedown);
            $node.find(".main").trigger(fakeEvent.mouseup);
            if (action === "viewResult") {
                $node.find(".table").trigger("contextmenu");
                $("#dagTableNodeMenu").find("." + action).trigger(fakeEvent.mouseup);
            } else {
                $node.find(".main").trigger("contextmenu");
                $("#dagNodeMenu").find("." + action).trigger(fakeEvent.mouseup);
            }

        },

        hasNodeWithState(nodeId, state) {
            var stateClass = ".state-" + state;
            var idSelector = '[data-nodeid="' + nodeId + '"]';
            return this.checkExists('#dagView .operatorSvg ' + stateClass + idSelector);
        },

        createDatasetNode: function(dsName, prefix) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var nodeId = self.createNodeAndOpenPanel(null, DagNodeType.Dataset);
            var $panel = $("#datasetOpPanel");
            self.assert($panel.hasClass("xc-hidden") === false);

            var selector = '#datasetOpPanel .fileName :contains(' + dsName + ')';

            self.checkExists(selector)
            .then(function() {
                var $grid = $(selector).closest(".fileName");
                $grid.click();
                $panel.find(".datasetPrefix input").val(prefix);
                $panel.find(".bottomSection .submit").click();
                return self.hasNodeWithState(nodeId, DagNodeState.Configured);
            })
            .then(function() {
                deferred.resolve(nodeId);
            })
            .fail(function() {
                console.error("could not create dataset node");
                deferred.reject.apply(this, arguments);
            });

            return deferred.promise();
        },

        createTableNode: async function(tableName) {
            try {
                // create a source table opeator and open the panel
                var nodeId = this.createNodeAndOpenPanel(null, DagNodeType.IMDTable);
                var $panel = $("#IMDTableOpPanel");
                this.assert($panel.hasClass("xc-hidden") === false, "table panel should show");
                $("#pubTableList").find(".iconWrapper").click(); // open list
                // check that the table is under the list
                const $li = $("#pubTableList li").filter((_index, e) => $(e).text() === tableName);
                if ($li.length !== 1) {
                    const list = [];
                    $("#pubTableList li").each((_index, e) => list.push($(e).text()));
                    console.log("#pubTableList li:", JSON.stringify(list));
                }
                this.assert($li.length === 1, "the table to select is under Table panel's list");

                // select the table
                $li.trigger(fakeEvent.mouseup)
                this.assert($("#pubTableList .pubTableInput").val() === tableName, "correct table should be selected in the list");
                if ($panel.hasClass("loading")) {
                    this.waitUntil(() => !$panel.hasClass("loading"));
                }
                // save the configuration
                $panel.find(".bottomSection .submit").click();
                await this.hasNodeWithState(nodeId, DagNodeState.Configured);
                return nodeId;
            } catch (e) {
                console.error("create table node failed");
                throw e;
            }
        },

        wait: function(time) {
            time = time || 0;
            var deferred = PromiseHelper.deferred();
            setTimeout(() => {
                deferred.resolve();
            }, time);
            return deferred.promise();
        },

        waitUntil: function(checkFunc, interval) {
            var deferred = PromiseHelper.deferred();
            var checkTime = interval || 200;
            checkTime = checkTime * this.slowInternetFactor;
            var outCnt = 80;
            var timeCnt = 0;
    
            var timer = setInterval(function() {
                var res = checkFunc();
                if (res === true) {
                    // make sure graphisc shows up
                    clearInterval(timer);
                    deferred.resolve();
                } else if (res === null) {
                    clearInterval(timer);
                    deferred.reject("Check Error!");
                } else {
                    console.info("check not pass yet!");
                    timeCnt += 1;
                    if (timeCnt > outCnt) {
                        clearInterval(timer);
                        console.error("Time out!", checkFunc, JSON.stringify(checkFunc));
                        deferred.reject("Time out");
                    }
                }
            }, checkTime);
    
            window.onbeforeunload = function() {
                return;
           };
    
            return deferred.promise();
        },

        // elemSelectors
        /**
         * checkExists
         * @param  {string or array}    elemSelectors can be a string or array
         *                              of element selectors example: ".xcTable"
         *                              or ["#xcTable-ex1", "#xcTable-ex2"]
         *                              can use :contains for
         *
         * @param  {integer} timeLimit  length of time to search for before
         *                              giving up
         *
         * @param  {object} options     notExist - boolean, if true, we want to
         *                              check that this element doesn't exist
         *
         *                              optional - boolean, if true, existence
         *                              of element is optional and we return
         *                              deferred.resolve regardless
         *                              (example: a confirm box that appears
         *                              in some cases)
         *
         *                              noDilute - boolean, if true, does not
         *                              dilute the time according to the
         *                              gLongTestSuite factor
         *
         *                              asserts - array, for each value in the
         *                              array, it asserts that the element
         *                              exists
         */
        checkExists: function(elemSelectors, timeLimit, options) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var noDilute = options && options.noDilute;
            if (noDilute) {
                timeLimit = timeLimit || defaultCheckTimeout;
            } else {
                timeLimit = (timeLimit || defaultCheckTimeout) * self.slowInternetFactor;
            }
            options = options || {};

            var intervalTime = 100;
            var timeElapsed = 0;
            var notExist = options.notExist; // if true, we're actualy doing a
            // check to make sure the element DOESN'T exist
            var optional = options.optional; // if true, existence of element is
            // optional and we return deferred.resolve regardless
            // (example: a confirm box that appears in some cases)
            if (typeof elemSelectors === "string") {
                elemSelectors = [elemSelectors];
            }
            var consoleUpdateTime = 0;

            var caller = self.checkExists.caller.name;
            var interval = setInterval(function() {
                var numItems = elemSelectors.length;
                var allElemsPresent = true;
                var $elem;
                for (var i = 0; i < numItems; i++) {
                    $elem = $(elemSelectors[i]);
                    if (notExist) {
                        if ($elem.length !== 0) {
                            allElemsPresent = false;
                            break;
                        }
                    } else if ($elem.length === 0) {
                        allElemsPresent = false;
                        break;
                    } else if ($('#modalWaitingBG').length) {
                        allElemsPresent = false;
                    }
                }
                if (allElemsPresent) {
                    if (options.asserts) {
                        i = 0;
                        for (; i< options.asserts.length; i++) {
                            self.assert($(options.asserts[i]).length > 0);
                        }
                    }
                    clearInterval(interval);
                    deferred.resolve(true);
                } else if (timeElapsed >= timeLimit) {
                    var found;
                    if (notExist) {
                        found = "found";
                    } else {
                        found = "not found";
                    }
                    var error = "time limit of " + timeLimit +
                                "ms exceeded in function: " + caller +
                                "; element " + elemSelectors[0] + " " + found;
                    clearInterval(interval);
                    if (!optional) {
                        console.log(elemSelectors, options);
                        console.warn(error);
                        deferred.reject(error);
                    } else {
                        deferred.resolve();
                    }
                }
                timeElapsed += intervalTime;

                // every 10 seconds, console log what is being searched for
                consoleUpdateTime += intervalTime;
                if (consoleUpdateTime > 10000) {
                    console.log("waiting for " + elemSelectors + " to " + (notExist ? "not" : "") + " be found");
                    consoleUpdateTime = 0;
                }
            }, intervalTime);

            return (deferred.promise());
        },

        // ==================== COMMON ACTION TRIGGERS ===================== //
        createNodeAndOpenPanel(parentNodeIds, nodeType, subType) {
            var self = this;
            var $node = self.createNode(nodeType, subType);
            var nodeId = $node.data("nodeid");
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            if (parentNodeIds != null) {
                parentNodeIds = (parentNodeIds instanceof Array) ?
                parentNodeIds : [parentNodeIds];


                parentNodeIds.forEach((parentNodeId, index) => {
                    DagViewManager.Instance.connectNodes(parentNodeId, nodeId, index, tabId);
                });
            }
            DagViewManager.Instance.autoAlign(tabId);
            self.nodeMenuAction($node, "configureNode");
            return nodeId;
        },

        executeNode(nodeId) {
            var self = this;
            const deferred = PromiseHelper.deferred();
            const $node = DagViewManager.Instance.getNode(nodeId);
            const dfId = $node.closest(".dataflowArea").data("id");
            this.nodeMenuAction($node, "executeNode");

            this.hasNodeWithState(nodeId, DagNodeState.Complete)
            .then(() => {
                return self.checkExists('.dataflowArea[data-id="' + dfId + '"]:not(.locked)');
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }
    };


    TestSuite.createTest = function() {
        xcMixpanel.off();
        return new TestRunner();
    };

    TestSuite.printResult = function(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    };

    TestSuite.run = function(hasAnimation, toClean, noPopup, mode, timeDilation) {
        return FlightTest.run(hasAnimation, toClean, noPopup, mode, timeDilation);
    };

    // this is for unit test
    TestSuite.unitTest = function() {
        // free this session and then run unit test
        var promise = TblManager.freeAllResultSetsSync();
        PromiseHelper.alwaysResolve(promise)
        .then(function() {
            return XcUser.CurrentUser.releaseSession();
        })
        .then(function() {
            xcManager.removeUnloadPrompt();
            var curURL = new URL(window.location.href);
            var url = new URL(paths.testAbsolute, window.location.href);
            for (var p of curURL.searchParams) {
                url.searchParams.set(p[0], p[1]);
            }
            window.location.href = url.href;
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    function cleanup(test) {
        const promise = deletePbTables(test);
        return PromiseHelper.convertToJQuery(promise);
    }

    function deletePbTables(test) {
        const promise = test.testPbTables.map((tableName) => {
            console.log("delete tableName");
            return XcalarUnpublishTable(tableName, false);
        });
        return Promise.all(promise);
    }

    return (TestSuite);
}(jQuery, {}));
