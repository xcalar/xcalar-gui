window.SqlTestSuite = (function($, SqlTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 7200000; // 120min
    var sqlTestCases;
    var sqlTestAnswers;
    var tpchCases;
    var tpchAnswers;
    var tableauCases;
    var tableauAnswers;
    var customTables;
    var tpchTables;
    var tpcdsTables;
    var tableauTables;
    var tableNodesMap = [];
    var sqlNode;
    var sqlNodeElement;
    $.getJSON("assets/test/json/SQLTest-a.json", function(data) {
        sqlTestCases = data.xcTest.testCases;
        sqlTestAnswers = data.xcTest.answers;
        tpchCases = data.tpchTest.testCases;
        tpchAnswers = data.tpchTest.answers;
        tableauCases = data.tableauTPCHTest.testCases;
        tableauAnswers = data.tableauTPCHTest.answers;
        customTables = data.xcTest.tables;
        tpchTables = data.tpchTest.tables;
        tpcdsTables = data.tpcdsTest.tables;
        tableauTables = data.tableauTPCHTest.tables;
    });

    SqlTestSuite.runSqlTests = function(testName, hasAnimation, toClean, noPopup, mode, timeDilation) {
        console.log("runSqlTest: " + userIdName + "::" + sessionName);
        console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + timeDilation);
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests(testName)
        return test.run(hasAnimation, toClean, noPopup, timeDilation);

    };
    function initializeTests(testName) {
        // Add all test cases here
        if (!testName) {
            console.log("Running default test cases");
        }
        return sqlTest(testName);
    }
    function sqlTest(testType) {
        var dataSource;
        var tableNames;
        var queries;
        var isTPCH = false;
        testType = testType ? testType.toLowerCase() : "";
        if (!testType) {
            dataSource = customTables.dataSource;
            tableNames = customTables.tableNames;
            queries = sqlTestCases;
            isTPCH = true;
        } else if (testType === "tpch") {
            dataSource = tpchTables.dataSource;
            tableNames = tpchTables.tableNames;
            queries = tpchCases;
            isTPCH = true;
        } else if (testType === "tpcds") {
            dataSource = tpcdsTables.dataSource;
            tableNames = tpcdsTables.tableNames;
            // XXX TO-DO create TPC-DS test cases
            // queries = tpcdsCases;
        } else if (testType === "tableau") {
            dataSource = tableauTables.dataSource;
            tableNames = tableauTables.tableNames;
            queries = tableauCases;
            isTPCH = true;
        } else {
            var error = "Test case doesn't exist";
            console.error(error);
        }
        test.add(setUpTpchDatasets, "loading data", defaultTimeout, TestCaseEnabled);
        if (isTPCH) {
            runAllQueries(queries, testType);
        } else {
            // XXX TO-DO run TPC-DS queries here
        }
        function setUpTpchDatasets(deferred, testName, currentTestNumber) {
            if (!dataSource) {
                var error = "Test case doesn't exist";
                test.fail(deferred, testName, currentTestNumber, error);
            }
            console.log("set up tables: " + tableNames.join(", "));
            var checkList = [];
            for (var i = 0; i < tableNames.length; i++) {
                checkList.push("#previewTable td:eq(1):contains('')");
            }
            var randId = Math.floor(Math.random() * 1000);
            var promiseArray = [];
            UserSettings.Instance.setPref("dfAutoPreview", false);
            UserSettings.Instance.setPref("dfAutoExecute", false);
            $("#dagView .newTab").click();
            for (var i = 0; i < tableNames.length; i++) {
                var dataPath = dataSource + tableNames[i];
                var tableName = tableNames[i].substring(0, tableNames[i].indexOf("."));
                var check = checkList[i];
                promiseArray.push(prepareData.bind(window, test, tableName,
                                                   randId, dataPath, check, i));
            }
            // Remove all immediates
            PromiseHelper.chain(promiseArray)
            .then(function() {
                console.log("start prepare SQL Node");
                try {
                    prepareSQLNode();
                } catch (e) {
                    console.error(e.message);
                    console.error("prepare sql node error " + JSON.stringify(e));
                    return PromiseHelper.reject(e);
                }
            })
            .then(function() {
                console.log("setUpTpchDatasets complete");
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, " failed");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }
    }
    // All helper functions
    function runAllQueries(queries, testType) {
        var answerSet;
        if (!testType) {
            answerSet = sqlTestAnswers;
        } else if (testType === "tpch") {
            answerSet = tpchAnswers;
        } else if (testType === "tableau") {
            answerSet = tableauAnswers;
        }

        function runQuery(deferred, testName, currentTestNumber) {
            var outerPromise;
            // XXX This is a workaround because current auto memory free dosen't handle sql temp tables
            if ($("#alertModal").is(":visible") && $("#alertHeader .text").text() === "Low Memory Warning") {
                $("#alertActions .cancel").click();
                for (name in tableNodesMap) {
                    var datasetNode = DagViewManager.Instance.getActiveDag().getNode(tableNodesMap[name]);
                    if (!DagTblManager.Instance.isPinned(datasetNode.table)) {
                        DagTblManager.Instance.pinTable(datasetNode.table);
                    }
                }
                outerPromise = DagTblManager.Instance.emptyCache(false);
            } else {
                outerPromise = PromiseHelper.resolve();
            }
            console.log("Query name: " + testName);
            var sqlString = queries[testName][0]["query"];
            var enforce = true;
            if (queries[testName][0].xcalarOpts && queries[testName][0].xcalarOpts.enforce === false) {
                enforce = false;
            }
            console.log("SQL: " + sqlString);
            outerPromise.then(function() {
                if (testType === "tableau") {
                    var curPromise = PromiseHelper.resolve();
                    var index = 0;
                    for (var i = 0; i < sqlString.length; i++) {
                        curPromise = curPromise.then(function() {
                            var query = sqlString[index];
                            console.log("Tableau subquery " + (index + 1) + ": " + query);
                            // sqlNode.setSqlQueryString(query);
                            showSQLPanel(sqlNode, query);
                            // $("#sqlOpPanel .submit").click();
                            return SQLOpPanel.Instance.configureSQL(query)
                            .then(function() {
                                SQLOpPanel.Instance.close();
                                return test.executeNode(sqlNode.getId());
                            })
                            .then(function() {
                                return checkConfigure();
                            })
                            .fail(function(error) {
                                console.error(error, "runQuery");
                                test.fail(deferred, testName, currentTestNumber, error);
                            });
                        })
                        .then(function() {
                            index++;
                        });
                    }
                    curPromise = curPromise.then(function() {
                        if (checkResult(answerSet, testName) || !enforce) {
                            test.pass(deferred, testName, currentTestNumber);
                        } else {
                            test.fail(deferred, testName, currentTestNumber, "WrongAnswer");
                        }
                    })
                    .fail(function(error) {
                        console.error(error, "runQuery");
                        test.fail(deferred, testName, currentTestNumber, error);
                    });
                } else if (testName === "cancelQuery") {
                    sqlNode.setSqlQueryString(sqlString);
                    showSQLPanel(sqlNode, sqlString);
                    $("#SQLOpPanel .submit").click();
                    test.hasNodeWithState(sqlNode.getId(), DagNodeState.Configured)
                    .then(function() {
                        setTimeout(function() {
                            $("#monitor-queryList .query .cancelIcon").last().click();
                        }, 1000);
                        return test.executeNode(sqlNode.getId());
                    })
                    .then(function() {
                        return checkConfigure();
                    })
                    .then(function() {
                        test.fail(deferred, testName, currentTestNumber, "Unable to cancel query, query resolved");
                    })
                    .fail(function() {
                        if (sqlCom.getStatus() === SQLStatus.Cancelled) {
                            test.pass(deferred, testName, currentTestNumber);
                        } else {
                            test.fail(deferred, testName, currentTestNumber, "Unable to cancel query, status is: " + sqlCom.getStatus());
                        }
                    });
                } else {
                    // sqlNode.setSqlQueryString(sqlString);
                    showSQLPanel(sqlNode, sqlString);
                    // $("#sqlOpPanel .submit").click();
                    // test.hasNodeWithState(sqlNode.getId(), DagNodeState.Configured)
                    return SQLOpPanel.Instance.configureSQL(sqlString)
                    .then(function() {
                        SQLOpPanel.Instance.close();
                        return test.executeNode(sqlNode.getId());
                    })
                    .then(function() {
                        return checkConfigure();
                    })
                    .then(function() {
                        if ($("#sqlTableArea").hasClass("xc-hidden")) {
                            return DagViewManager.Instance.viewResult(sqlNode);
                        } else {
                            return PromiseHelper.resolve();
                        }
                    })
                    .then(function() {
                        if (testType === "tpch" ||
                            checkResult(answerSet, testName) || !enforce) {
                            test.pass(deferred, testName, currentTestNumber);
                        } else {
                            test.fail(deferred, testName, currentTestNumber, "WrongAnswer");
                        }
                    })
                    .fail(function(error) {
                        console.error(error, "runQuery");
                        test.fail(deferred, testName, currentTestNumber, error);
                    });
                }
            })
            .fail(function(error) {
                console.error(error, "dropTempTables");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        for (var queryName in queries) {
            if (!(queries[queryName][0].xcalarOpts
                && queries[queryName][0].xcalarOpts.enable === false)) {
                var sqlString = queries[queryName][0]["query"];
                test.add(runQuery, queryName, defaultTimeout, TestCaseEnabled);
            }
        }
    }

    function showSQLPanel(sqlNode, sqlQueryStr) {
        let i = 0;
        let mapping = [];
        for (let table in tableNodesMap) {
            mapping.push({
                identifier: table,
                source: i + 1
            });
            i++;
        }
        sqlNode.setParam({
            sqlQueryStr: sqlQueryStr,
            dropAsYouGo: true,
            mapping: mapping,
            identifiers: sqlNode.getParam().identifiers
        }, true);
        SQLOpPanel.Instance.show(sqlNode);
    }

    function checkResult(answerSet, queryName) {
        var table = "#sqlTableArea table";
        for (var row in answerSet[queryName]) {
            if (row === "numOfRows") {
                if (answerSet[queryName][row] !==
                    $("#numPages").text().split(" ")[1]) {
                    console.log(row + ": expect " + answerSet[queryName][row]
                        + ", get " + $("#numPages").text().split(" ")[1]);
                    test.assert(0);
                    return false;
                }
            } else if (row === "columns") {
                var answers = answerSet[queryName][row];
                for (var i = 0; i < answers.length; i++) {
                    var col = "col" + (i + 1);
                    var res = $(table + " thead" + " ." + col
                                + " .flex-mid input").attr('value');
                    if (answers[i] !== res) {
                        console.log(row + ": expect " + answers[i]
                                    + ", get " + res);
                        test.assert(0);
                        return false;
                    }
                }
            } else {
                var answers = answerSet[queryName][row];
                for (var i = 0; i < answers.length; i++) {
                    var col = "col" + (i + 1);
                    var res = $(table + " ." + row + " ." + col)
                                .find(".originalData").text();
                    if (typeof answers[i] === "number") {
                        // TPCH takes two decimal places in all float
                        // number cases. Xcalar does not gurantee this.
                        // So we allow a minor difference.
                        if (Math .abs(answers[i].toFixed(2) -
                                      parseFloat(res).toFixed(2))
                                 .toFixed(2) > 0.01) {
                            console.log(row + ": expect " + answers[i]
                                        + ", get " + res);
                            test.assert(0);
                            return false;
                        }
                    } else if (answers[i] === null) {
                        if (res !== "FNF") {
                            console.log(row + ": expect FNF, get " + res);
                            test.assert(0);
                            return false;
                        }
                    } else {
                        if (answers[i] !== res) {
                            console.log(row + ": expect " + answers[i]
                                        + ", get " + res);
                            test.assert(0);
                            return false;
                        }
                    }
                }
            }
        }
        console.log("Case " + queryName + "  pass!");
        return true;
    }

    function prepareData(test, tableName, randId, dataPath, check, index) {
        const deferred = PromiseHelper.deferred();
        const sourcTableName = (tableName + "_" + randId).toUpperCase();
        console.log("load table " + sourcTableName + " from " + dataPath);
        PromiseHelper.convertToJQuery(test.loadTable(sourcTableName, dataPath, check))
        .then(() => {
            console.log("Table " + sourcTableName + " is loaded")
            return PromiseHelper.convertToJQuery(test.createTableNode(sourcTableName))
        })
        .then((nodeId) => {
            console.log("Table node for " + sourcTableName + " added");
            tableNodesMap[tableName] = nodeId;
            deferred.resolve();
        })
        .fail((e) => {
            console.error("prepareData failed", e);
            deferred.reject(e);
        });
        return deferred.promise();
    }

    function prepareSQLNode() {
        sqlNodeElement = test.createNode(DagNodeType.SQL);
        var sqlNodeId = sqlNodeElement.data("nodeid");
        console.log("create sql node: " + sqlNodeId);
        var testDagGraph = DagViewManager.Instance.getActiveDag();
        console.log("test dag graph", testDagGraph);
        sqlNode = testDagGraph.getNode(sqlNodeId);
        console.log("find sql node");

        var i = 0;
        var identifiers = new Map();
        let mapping = [];
        for (var table in tableNodesMap) {
            testDagGraph.connect(tableNodesMap[table], sqlNode.id, i);
            identifiers.set(i + 1, table);
            i++;
            mapping.push({
                identifier: table,
                source: i
            });
        }
        console.log("set identifiers")
        sqlNode.setIdentifiers(identifiers);
        sqlNode.input.input.mapping = mapping;
        console.log("sql node added");
    }
    function checkConfigure() {
        var deferred = PromiseHelper.deferred();
        var totalTime = 0;
        function checkUnlock() {
            setTimeout(function() {
                if ($("#dagNodeMenu .configureNode").hasClass("unavailable")) {
                    totalTime += 500;
                    if (totalTime > 30000) {
                        deferred.reject();
                    } else {
                        checkUnlock();
                    }
                } else {
                    deferred.resolve();
                }
            }, 500);
        }
        checkUnlock();
        return deferred.promise();
    }

    return (SqlTestSuite);
}(jQuery, {}));