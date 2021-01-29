// setup should happen before load test files
// --badil: will stop when first test fails
mocha.setup({
    "ui": "bdd",
    "bail": true,
    // must include Setup Test and optionally include other test
    // e.g. /Mocha Setup Test|Workbook Test/
    // default:
    // "grep": /Mocha Setup Test|.*/
    "grep": getTestNameRegex()
});
// global
expect = chai.expect;
assert = chai.assert;

function getTestNameRegex() {
    var urlArgs = xcHelper.decodeFromUrl(window.location.href);
    var test = urlArgs.test || ".*";
    var testNameRegex = new RegExp("Mocha Setup Test|" + test);
    return testNameRegex;
}

var testDatasets;
var sharedUDFPath = "/sharedUDFs/";
// Should be equal to `UDFFileManager.Instance.getDefaultUDFPath()`, but should
// not use it directly.
var defaultUDFPath = sharedUDFPath + "default"; // /sharedUDFs/default

window.UnitTest = (function(UnitTest, $) {
    var minModeCache;
    var test;
    var resultsSent = false;

    function sendResultsToParent() {
        resultsSent = true;
        var urlArgs = xcHelper.decodeFromUrl(window.location.href);
        var request = {
            testId: urlArgs.testId,
            testName: urlArgs.test,
            pass: parseInt($("#mocha-stats").find(".passes em").text()),
            fail: parseInt($("#mocha-stats").find(".failures em").text()),
            time: parseInt($("#mocha-stats").find(".duration em").text())
        };
        parent.postMessage(JSON.stringify(request), "*");
    }

    function inlineReporter(runner) {
        try {
            const testPrefix = 'XDUnitTest';
            const testTitles = [];
            const stats = {
                fail: new Set(), pass: new Set()
            };
            let index = 0;

            // Test suite start
            runner.on('suite', (suite) => {
                testTitles.push(suite.title);
            });

            // Test suite end
            runner.on('suite end', (suite) => {
                testTitles.pop();
            });

            // Test case start
            let testStartTime = null;
            runner.on('test', (test) => {
                testStartTime = Date.now();
                index ++;
                console.log(`[${testPrefix}] (${index}) ${getTestTitle(test)}: begin`);
            });

            // Test case fail
            runner.on('fail', (test) => {
                const testEndTime = Date.now();
                const testTitle = getTestTitle(test);
                stats.fail.add(testTitle);
                console.log(`[${testPrefix}] (${index}) ${testTitle}: fail(${getDuration(testStartTime, testEndTime)}s)`);
            });

            // Test case pass
            runner.on('pass', (test) => {
                const testEndTime = Date.now();
                const testTitle = getTestTitle(test);
                stats.pass.add(testTitle);
                console.log(`[${testPrefix}] (${index}) ${testTitle}: pass(${getDuration(testStartTime, testEndTime)}s)`);
            });

            // Root test suite end
            runner.on('end', () => {
                const statsShown = {
                    fail: stats.fail.size,
                    pass: stats.pass.size
                }
                console.log(`[${testPrefix}] stats=${JSON.stringify(statsShown)}`);
            })

            function getTestTitle(test) {
                return `${testTitles.join('/')}/${test.title}`;
            }

            function getDuration(startTime, endTime) {
                if (!Number.isInteger(startTime) || !Number.isInteger(endTime)) {
                    return -1;
                }
                return Math.ceil((endTime - startTime)/100)/10;
            }
        } catch(e) {
            console.error(`[${testPrefix}] exception: `, e);
        }
    }

    UnitTest.setup = function() {
        $(document).ready(function() {
            xcMixpanel.off();
            loginMixpanel.off();
            xcGlobal.setup();
            setupTestDatasets();
            const runner = mocha.run(function() {
                // used for puppeteer
                $("body").append('<div id="testFinish">' +
                                    getTestResult() +
                                '</div>');
                if (window.location.search.indexOf("noPopup=y") < 0) {
                    console.log("Test Exited");
                    alert("Test Exited");
                }
                if (!resultsSent) {
                    sendResultsToParent();
                    removeUserFromKVStore();
                }
            });
            inlineReporter(runner);
            window.onbeforeunload = function() {
                return;
            };
            test = TestSuite.createTest();

            $(".operatorBar").attr("style", "display: block !important;");
            $(".categorySection").attr("style", "display: flex !important;");
        });

        $("#toggleXC").click(function() {
            $("#xc").toggle();
        });

        $("#toggleTest").click(function() {
            $("#unitTestBody").toggleClass("hideTest");
        });

        $("#toggleCoverage").click(function() {
            $("#unitTestBody").toggleClass("hideCoverage");
        });

        $('#backXC').click(function() {
            var promise = TblManager.freeAllResultSetsSync();
            PromiseHelper.alwaysResolve(promise)
            .then(function() {
                return XcUser.CurrentUser.releaseSession();
            })
            .then(function() {
                xcManager.removeUnloadPrompt();
                window.location = paths.indexAbsolute;
            })
            .fail(function(error) {
                console.error(error);
            });
        });

        $('#toggleTestSize').click(function() {
            $('#mocha').toggleClass('small');
        });

        $('#toggleXCSize').click(function() {
            $('#xc').toggleClass('large');
        });

        xcMixpanel = window.xcMixpanel || {};
        xcMixpanel.errorEvent = () => {};
        xcMixpanel.transactionLog = () => {};
        xcMixpanel.menuItemClick = () => {};
        xcMixpanel.pageUnloadEvent = () => {};
        xcMixpanel.track = () => {};

        var prevPct = null;
        window.mochaPct = 0;
        consolePct();

        function consolePct() {
            setTimeout(function() {
                if (!ifvisible.now()) {
                    if (prevPct === window.mochaPct) {
                        console.info("Test is still " + window.mochaPct + "% completed");
                    } else {
                        console.info(window.mochaPct + "% completed");
                    }
                }
                prevPct = window.mochaPct;
                if (window.mochaPct === 100) {
                    if (!resultsSent) {
                        sendResultsToParent();
                        removeUserFromKVStore();
                    }
                    console.info("TEST FINISHED");
                } else {
                    if (parseInt($("#mocha-stats").find(".failures em").text()) > 0) {
                        sendResultsToParent();
                        removeUserFromKVStore();
                    } else {
                        consolePct();
                    }
                }
            }, 10000);
        }
    };

    function getTestResult() {
        var fails = [];
        $('.test.fail').each(function() {
            fails.push($(this).text());
        });
        return fails.length ? fails.join("\n") : "PASSED";
    }

    function setupTestDatasets() {
        testDatasets = {
            "sp500": {
                "targetName": gDefaultSharedRoot,
                "path": "/netstore/datasets/sp500.csv",
                "url": "netstore/datasets/sp500.csv",
                "sources": [{
                    "targetName": gDefaultSharedRoot,
                    "path": "/netstore/datasets/sp500.csv"
                }],
                "format": "CSV",
                "fieldDelim": "\t",
                "lineDelim": "\n",
                "hasHeader": false,
                "moduleName": "",
                "funcName": "",
                "quoteChar": "",
                "skipRows": 0,
                "pointCheck": ".datasetTbodyWrap:not(.hidden) #previewTable td:contains(20041101)"
            },

            "schedule": {
                "targetName": gDefaultSharedRoot,
                "path": "/netstore/datasets/indexJoin/schedule/",
                "url": "netstore/datasets/indexJoin/schedule/",
                "sources": [{
                    "targetName": gDefaultSharedRoot,
                    "path": "/netstore/datasets/indexJoin/schedule/"
                }],
                "format": "JSON",
                "moduleName": "",
                "funcName": "",
                "pointCheck": ".datasetTbodyWrap:not(.hidden) #previewTable td:contains(1)"
            },

            "fakeYelp": {
                "targetName": gDefaultSharedRoot,
                "path": "/netstore/datasets/unittest/test_yelp.json",
                "url": "netstore/datasets/unittest/test_yelp.json",
                "sources": [{
                    "targetName": gDefaultSharedRoot,
                    "path": "/netstore/datasets/unittest/test_yelp.json"
                }],
                "format": "JSON",
                "moduleName": "",
                "funcName": "",
                "pointCheck": ".datasetTbodyWrap:not(.hidden) #previewTable th:eq(1):contains(yelping_since)"
            }
        }
    }


    function removeUserFromKVStore() {
        var urlArgs = xcHelper.decodeFromUrl(window.location.href);
        var username = urlArgs.user;
        if (!username) {
            return;
        }
        var kvStore = new KVStore("gUserListKey", gKVScope.GLOB);

        kvStore.get()
        .then(function(value) {
            if (value != null) {
                var len = value.length;
                var userList = value.split(",");
                var newList = userList.filter(function(user) {
                    return ('"' + user + '"' !== username);
                });
                var newListStr = newList.join(",");
                kvStore.put(newListStr, true, true);
            }
        });
    }


    UnitTest.testFinish = function(checkFunc, interval) {
        var deferred = PromiseHelper.deferred();
        var checkTime = interval || 200;
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
    };

    UnitTest.addDS = function(testDSObj, dsName) {
        throw "this function addDS is broken"
        console.clear();
        var deferred = PromiseHelper.deferred();
        if (dsName == null) {
            dsName = "uniteTest";
        }

        dsName = dsName + Math.floor(Math.random() * 10000);

        var url = testDSObj.url;
        var pointCheck = testDSObj.pointCheck || "";
        $("#dataStoresTab").click();
        if (!$("#inButton").hasClass('active')) {
            $("#inButton").click();
        }

        test.loadDS(dsName, url, pointCheck)
        .then(function() {
            deferred.resolve(dsName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    UnitTest.addTable = function(dsName) {
        throw "this function is broken"
        var deferred = PromiseHelper.deferred();

        if (!$("#dataStoresTab").hasClass("active")) {
            $("#dataStoresTab").click();
            if (!$("#inButton").hasClass('active')) {
                $("#inButton").click();
            }
        }

        // XXX this create table way doesn't make sure
        // creating process is finishing
        // need to refine

        var sortColumnsAtoZ = true;
        test.createTable(dsName, sortColumnsAtoZ)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    // add both ds and table
    // deferred dsName, tableName
    UnitTest.addAll = function(testDSObj, dsName) {
        var deferred = PromiseHelper.deferred();
        var testDS;

        UnitTest.addDS(testDSObj, dsName)
        .then(function(res) {
            testDS = res;
            return UnitTest.addTable(res);
        })
        .then(function(tableName, prefix, nodeId, tabId) {
            deferred.resolve(testDS, tableName, prefix, nodeId, tabId);
        })
        .fail(function(error) {
            console.error("Add fail", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UnitTest.deleteTable = function(table, type) {
        type = type || TableType.Active;
        var tableId;
        if (type === TableType.Orphan) {
            tableId = table;
        } else {
            tableId = xcHelper.getTableId(table);
        }
        return TblManager.deleteTables(tableId, type, true);
    };

    UnitTest.deleteDS = function(dsName) {
        throw "UnitTest.deleteDS is broken"
        var deferred = PromiseHelper.deferred();
        var $grid = DS.getGridByName(dsName);
        var dsId = $grid.data("dsid");
        var dsObj = DS.getDSObj(dsId);

        DS.__testOnly__.deactivateDS([dsId])
        .then(function() {
            return DS.__testOnly__.delDSHelper($grid, dsObj, {"failToShow": true});
        })
        .then(deferred.resolve)
        .fail(function() {
            // now seems we have issue to delete ds because of ref count,
            // this should be reolsved with now backend way to hanld ds
            deferred.resolve();
        });

        return deferred.promise();
    };

    UnitTest.deleteAll = function(table, ds) {
        var deferred = PromiseHelper.deferred();

        UnitTest.deleteTable(table)
        .then(function() {
            return UnitTest.deleteDS(ds);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Delete fail", error);
            deferred.reject(error);
        });
        return deferred.promise();
    };

    UnitTest.deleteAllTables = function() {
        var deferred = PromiseHelper.deferred();
        $("#monitor-delete").click();
        UnitTest.testFinish(() => $('#deleteTableModal').is(":visible"))
        .then(function() {
            return UnitTest.testFinish(() => !$('#deleteTableModal').hasClass("load"))
        })
        .then(function() {
            $('#deleteTableModal').find('.titleSection .checkbox').click();
            if ($("#deleteTableModal .confirm").hasClass("xc-disabled")) {
                return PromiseHelper.resolve();
            }
            $('#deleteTableModal .confirm').click();
            return UnitTest.testFinish(() => $("#alertModal").is(":visible"));
        })
        .then(function() {
            $("#alertModal .confirm").click();
            $('#deleteTableModal .close').click();
            return UnitTest.testFinish(() => !$('#deleteTableModal').is(":visible"))
        })
        .then(deferred.resolve)
        .fail(function(e) {
            console.error(e);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    };

    UnitTest.deleteTab = function(tabId) {
        var deferred = PromiseHelper.deferred();
        $("#dagListSection").find('li[data-id="' + tabId + '"] .deleteDataflow').click();
        $("#alertModal").find(".confirm").click();
        UnitTest.testFinish(function() {
            return  $("#dagListSection").find('li[data-id="' + tabId + '"]').length === 0;
        })
        .always(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    UnitTest.onMinMode = function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    };

    UnitTest.offMinMode = function() {
        gMinModeOn = minModeCache;
        minModeCache = null;
    };

    UnitTest.hasStatusBoxWithError = function(error) {
        var $statusBox = $("#statusBox");
        assert.isTrue($statusBox.is(":visible"));
        var text = $statusBox.find(".message").text();
        if (text != error) {
            console.error(text, error);
        }
        expect(text).to.equal(error);
        StatusBox.forceHide();
    };

    UnitTest.hasAlertWithTitle = function(title, options) {
        options = options || {};
        var $alertModal = $("#alertModal");
        assert.isTrue($alertModal.is(":visible"));
        title = title.toLowerCase();
        if ($("#alertHeader .text").text().toLowerCase() != title) {
            console.error($("#alertHeader .text").text().toLowerCase(), title);
        }
        expect($("#alertHeader .text").text().toLowerCase()).to.equal(title);
        if (options.inputVal != null) {
            $alertModal.find('input').val(options.inputVal);
        }
        if (options.confirm) {
            $alertModal.find(".confirm").eq(0).click();
        } else {
            $alertModal.find(".cancel").click();
        }

        if (!options.nextAlert) {
            assert.isFalse($alertModal.is(":visible"));
        }
    };

    UnitTest.hasAlertWithText = function(text, options) {
        options = options || {};
        var $alertModal = $("#alertModal");
        assert.isTrue($alertModal.is(":visible"));
        expect($("#alertContent .text").text()).to.equal(text);
        if (options.inputVal != null) {
            $alertModal.find('input').val(options.inputVal);
        }
        if (options.confirm) {
            $alertModal.find(".confirm").eq(0).click();
        } else {
            $alertModal.find(".cancel").click();
        }

        if (!options.nextAlert) {
            assert.isFalse($alertModal.is(":visible"));
        }
    };

    UnitTest.wait = function(amtTime) {
        var waitTime = amtTime || 1000;
        var deferred = PromiseHelper.deferred();
        setTimeout(function() {
            deferred.resolve();
        }, waitTime);
        return deferred;
    };

    UnitTest.assertDisplay = function($el) {
        expect($el.css("display")).not.to.equal("none");
    };

    UnitTest.assertHidden = function($el) {
        expect($el.css("display")).to.equal("none");
    };

    UnitTest.getCoverage = function() {
        var res = "";
        $("#blanket-main").find(".blanket:not(.bl-title)").each(function() {
            var $div = $(this);
            var $children = $div.find("> .bl-cl");
            var title = $children.eq(0).text();
            var perCentage = $children.eq(1).text().split("%")[0].trim();
            var cover = $children.eq(2).text();
            // pass limit or not
            var isSuccess = $div.hasClass("bl-success");
            res += title + "\t" + cover + "\t" + perCentage + "\t" +
                   isSuccess + "\n";
        });
        xcHelper.downloadAsFile("unitTestReport", res);
        return res;
    };

    return (UnitTest);
}({}, jQuery));
