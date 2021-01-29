window.FlightTest = (function(FlightTest, $) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 720000; // 12min

    const MultiJoin = "Multi Join";
    const MultiGroupBy = "Multi GroupBy";

    FlightTest.run = function(hasAnimation, toClean, noPopup, mode, timeDilation) {
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        return test.run(hasAnimation, toClean, noPopup, timeDilation);
    };

    // =============== ADD TESTS TO ACTIVATE THEM HERE ===================== //
    function initializeTests() {
        test.add(flightTest, "FlightTest", defaultTimeout, TestCaseEnabled);
        test.add(linkInLinkOutTest, "Link In, Link Out Test", defaultTimeout, TestCaseEnabled);
        test.add(multiGroupByTest, "MultiGroupByTest", defaultTimeout, TestCaseEnabled);
        test.add(multiJoinTest, "MultiJoinTest", defaultTimeout, TestCaseEnabled);
        test.add(profileTest, "ProfileTest", defaultTimeout, TestCaseEnabled);
        test.add(corrAndQuickAggTest, "CorrelationAndQuickAggTest", defaultTimeout, TestCaseEnabled);
        test.add(jsonModalTest, "JsonModalTest", defaultTimeout, TestCaseEnabled);
    }

    async function flightTest(deferred, testName, currentTestNumber) {
        /** This test replicates a simple version of Cheng's flight demo
        This tests all major functionality
        TEST MUST BE DONE ON A CLEAN BACKEND!
        It does the following:
        2. Loads 2 datasets (flight and airports)
        3. Maps flight:delay str to int
        4. Filter delay_int by > 0
        5. Upload custom n clause cat pyExec
        6. Run pyExec on year month and day columns
        7. Join with airports table
        8. Index on airlines
        9. GroupBy average on delay
        10. Aggregate on groupBy table to count number of unique airlines
        */

        const flightTable = ("flight" + randInt()).toUpperCase();
        const airpotTable = ("airport" + randInt()).toUpperCase();

        try {
            await flightTestPart1();
            let nodeId = await flightTestPart2(flightTable);
            nodeId = await flightTestPart3(nodeId);
            nodeId = await flightTestPart4(nodeId);
            await flightTestPart5();
            nodeId = await flightTestPart6(nodeId);
            nodeId = await flightTestPart7(nodeId, airpotTable);
            nodeId = await flightTestPart8(nodeId);
            nodeId = await flightTestPart9(nodeId);
            await flightTestPart10(nodeId);
            console.log("flightTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("flightTest failed", e);
            test.fail(deferred, testName, currentTestNumber, e);
        }

        // Import table
        async function flightTestPart1() {
            console.log("start flightTestPart1: load flight and airpot table");
            try {
                await flightTestPart1Load1();
                await flightTestPart1Load2();
                console.log("flightTestPart1 finished");
            } catch (e) {
                console.error("flightTestPart1 failed", e);
                throw e;
            }
        }

        async function flightTestPart1Load1() {
            try {
                console.log("load flight table");
                const check = "#previewTable td:eq(1):contains(19403)";
                const url = testDataLoc + "flight/" + test.mode + "airlines";
                await test.loadTable(flightTable, url, check);
                console.log("flightTestPart1Load1 finished");
            } catch (e) {
                console.error("flightTestPart1Load1 failed", e);
                throw e;
            }
        }

        async function flightTestPart1Load2() {
            try {
                console.log("load airport table");
                const check = "#previewTable td:eq(1):contains(00M)";
                const url = testDataLoc + "flight/" + test.mode + "airports.csv";
                await test.loadTable(airpotTable, url, check);
                console.log("flightTestPart1Load2 finished");
            } catch (e) {
                console.error("flightTestPart1Load2 failed", e);
                throw e;
            }
        }

        // create table node
        async function flightTestPart2(tableName) {
            try {
                console.log("start flightTestPart2: create table node");
                createNewTab();
                const nodeId = await test.createTableNode(tableName);
                console.log("flightTestPart2 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart2 failed", e);
                throw e;
            }
        }

        // Change column type
        async function flightTestPart3(parentNodeId) {
            try {
                console.log("start flightTestPart3", "change column type");
                const colName = "ARRDELAY";
                const nodeId = await changeTypeToInteger(parentNodeId, colName);
                const nextNodeId = await flightTestPart3_2(nodeId);
                console.log("flightTestPart3 finished");
                return nextNodeId;
            } catch (e) {
                console.error("flightTestPart3 failed", e);
                throw e;
            }
        }

        // Add genUnique (map to get uniqueNum)
        async function flightTestPart3_2(parentNodeId) {
            try {
                console.log("start flightTestPart3_2: map to get uniqueNum");
                // create a map opeator and open the configuration panel
                const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Map);
                const $panel = $("#mapOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                // select genUnique function
                $panel.find(".functionsMenu input").val('genUnique').trigger("change");
                // save configuration
                fillArgInPanel($panel.find(".colNameSection .arg"), "uniqueNum");
                $panel.find(".submit").click();

                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                return nodeId;
            } catch (e) {
                console.error("flightTestPart3_2 failed", e);
                throw e;
            }
        }

        // Filter flight table
        async function flightTestPart4(parentNodeId) {
            try {
                console.log("start flightTestPart4: filter flight table");
                // create a filter opeator and open the panel
                const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Filter);
                const $panel = $("#filterOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                // select gt function
                $panel.find(".functionsList input").val("gt")
                    .trigger(fakeEvent.enterKeydown);
                // filter gt(ARRDELAY, 0)
                const $args = $panel.find(".arg");
                fillArgInPanel($args.eq(0), "$ARRDELAY");
                fillArgInPanel($args.eq(1), "0");
                // save the configuration
                $panel.find(".submit").click();

                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                console.log("flightTestPart4 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart4 failed", e);
                throw e;
            }
        }

        // Upload custom scalar function
        async function flightTestPart5() {
            try {
                console.log("start flightTestPart5: upload python custom scalar function");
                if (!$("#udfViewContainer").is(":visible")) {
                    $("#udfTab").click();
                }
                test.assert($("#udfViewContainer").is(":visible"), "show cusotm scalar function editor");
                await test.checkExists("#udf-fnSection .xc-waitingBG", null, {notExist: true})
                var udfDisplayName = "ymd.py";
                var selector = '#dagListSection .udf.listWrap .udf .name:contains(' + udfDisplayName +')';
                if (!$(selector).length) {
                    // add ymd.py if not exist
                    $("#udfTabView .addTab").click();
                    var editor = UDFPanel.Instance.getEditor();
                    editor.setValue('def ymd(year, month, day):\n' +
                        '    if int(month) < 10:\n' +
                        '        month = "0" + str(month)\n' +
                        '    if int(day) < 10:\n' +
                        '        day = "0" + str(day)\n' +
                        '    return str(year) + str(month) + str(day)');
                    // save ymd.py
                    $("#udfSection").find(".saveFile").click();
                    $("#fileManagerSaveAsModal .saveAs input").val("ymd.py");
                    $("#fileManagerSaveAsModal .modalBottom .save").click();
                    await test.checkExists(selector);
                }
                console.log("flightTestPart5 finished");
            } catch (e) {
                console.error("flightTestPart5 failed", e);
                throw e;
            }
        }

        // Custom scalar function on flight table
        async function flightTestPart6(parentNodeId) {
            try {
                console.log("start flightTestPart6: map on flight table with custom scalar function");
                // create a map opeartor for custom scalar function and open the panel
                const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Map);
                await test.wait(5000);
                const $panel = $("#mapOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                // select ymd function
                $panel.find(".functionsMenu input").val('ymd:ymd').trigger("change");
                const year = "YEAR";
                const month = "MONTH";
                const day = "DAYOFMONTH";
                let $args = $panel.find(".arg");
                fillArgInPanel($args.eq(0), gColPrefix + year);
                $args = $panel.find(".arg");
                fillArgInPanel($args.eq(1), gColPrefix + month);
                fillArgInPanel($args.eq(2), gColPrefix + day);
                fillArgInPanel($args.eq(3), "YearMonthDay");
                // save the configuration
                $panel.find(".submit").click();
                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                console.log("flightTestPart6 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart6 failed", e);
                throw e;
            }
        }

        // Join flight table with airport table
        async function flightTestPart7(parentNodeId, tableToJoin) {
            try {
                console.log("start flightTestPart7: join flight and airport table");
                // XXX TODO: @Liang, I don't know why I have to do this dealy
                // but without it the column selection doesn't work

                // Liang: Init function of column dropdown is executed in async way(setTimout(0))
                // So we have to push the UI check to the next event loop
                // The in-depth reason is described in OpPanelComponentFactory.createHintDropdown()
                // create table node for airport table
                const parentNodeId2 = await test.createTableNode(tableToJoin)
                const parents = [parentNodeId, parentNodeId2];
                // create a join opeator and open the configuration
                const nodeId = test.createNodeAndOpenPanel(parents, DagNodeType.Join);
                const $panel = $("#joinOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                await test.wait(1000);
                // await test.checkExists("#joinOpPanel #formWaitingBG", null, {notExist: true});

                // Open the dropdown, so that all left list are filled
                const $dropdownLeft = $panel.find('.mainTable .joinClause .col-left .hintDropdown');
                $dropdownLeft.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                await test.wait(10);
                // Click a certain LI
                $dropdownLeft.find("li:contains(DEST)").trigger(fakeEvent.mouseup);
                await test.wait(10);

                // Open the dropdown, so that all right list are filled
                const $dropdownRight = $panel.find('.mainTable .joinClause .col-right .hintDropdown');
                $dropdownRight.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                await test.wait(10);
                // Click a certain LI
                $dropdownRight.find("li:contains(IATA)").trigger(fakeEvent.mouseup);
                await test.wait(10);

                // save configuration
                $panel.find(".bottomSection .btn:contains(Next)").click();
                $panel.find(".bottomSection .btn:contains(Save)").click();
                await test.wait(10);

                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                console.log("flightTestPart7 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart7 failed", e);
                throw e;
            }
        }

        // Group by
        async function flightTestPart8(parentNodeId) {
            try {
                console.log("start flightTestPart8: groupby joined table");
                // create a groupBy opeator and open the configuration panel
                const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.GroupBy);
                const $panel = $("#groupByOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                // select column to do agg aggreation
                const gbColName = "UNIQUECARRIER";
                fillArgInPanel($panel.find(".gbOnArg"), gColPrefix + gbColName);
                $panel.find(".functionsList .functionsInput").val("avg")
                            .trigger(fakeEvent.enterKeydown);
                // select column to group by
                fillArgInPanel($panel.find(".colNameSection .arg"), "uniqueNum");
                const $args = $panel.find(".arg");
                // give new column the name
                fillArgInPanel($args.eq(1), gColPrefix + "ARRDELAY");
                fillArgInPanel($panel.find(".colNameSection .arg"), "AvgDelay");
                // save the configuration
                $panel.find(".submit").click();

                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                console.log("flightTestPart8 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart8 failed", e);
                throw e;
            }
        }

        // Aggregate
        async function flightTestPart9(parentNodeId) {
            try {
                console.log("start flightTestPart9: aggregate the groupBy table on avg of AvgDelay");
                // create a Single value operator and open the configuration panel
                const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Aggregate);
                const $panel = $("#aggOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                // select avg function
                $panel.find(".functionsList .functionsInput").val("avg")
                            .trigger(fakeEvent.enterKeydown);
                const $args = $panel.find(".arg");
                // select AvgDelay column
                fillArgInPanel($args.eq(0), gColPrefix + "AvgDelay");
                // create a testAgg constant
                const aggName = gAggVarPrefix + xcHelper.randName("testAgg");
                fillArgInPanel($args.eq(1), aggName);
                // save configuration
                $panel.find(".submit").click();

                await test.hasNodeWithState(nodeId, DagNodeState.Configured);
                console.log("flightTestPart9 finished");
                return nodeId;
            } catch (e) {
                console.error("flightTestPart9 failed", e);
                throw e;
            }
        }

        // execute the dataflow
        async function flightTestPart10(finalNodeId) {
            try {
                console.log("start flightTestPart10: execute the dataflow");
                // execute the last node
                const $node = DagViewManager.Instance.getNode(finalNodeId);
                test.nodeMenuAction($node, "executeNode");
                await test.executeNode(finalNodeId);
                await test.wait(3000); // wait for aggregate to finish fetching
                // check result
                test.nodeMenuAction($node, "viewResult");
                await test.checkExists("#alertHeader:visible .text:contains(Agg)");
                test.assert($("#alertContent .text").html().split(":")[1].trim().indexOf("32.398") > -1);
                // close the modal
                $("#alertActions .cancel").click();
                console.log("flightTestPart10 finished");
            } catch (e) {
                console.error("flightTestPart10 failed", e);
                throw e;
            }
        }
    }

    async function linkInLinkOutTest(deferred, testName, currentTestNumber) {
        // Tests add new dataflow and run using link in link out
        console.log("linkInLinkOutTest starts");
        try {
            console.log("find the map node before join")
            const $dagView = $("#dagView .dataflowArea.active");
            const $joinNode = $dagView.find("g.operator.join.state-Complete");
            test.assert($joinNode.length === 1, "find only one join node");

            const joinNodeId = $joinNode.data("nodeid");
            const mapNode = DagViewManager.Instance.getActiveDag().getNode(joinNodeId).getParents()[0];
            const mapNodeId = mapNode.getId();
            const $mapNode = DagViewManager.Instance.getNode(mapNodeId);
            test.assert($mapNode.hasClass("map"), "find the map node");

            const dfName = $("#dagTabView .dagTab.active .name").text();
            console.log("add link out node for map");
            const linkOutName = await createLinkOutNode(mapNodeId, "mapNodeId");

            console.log("create new tab for multi join and link map node");
            createNewTab();
            await renameTab($("#dagTabView .dagTab.active"), MultiJoin);
            await createLinkInNode(dfName, linkOutName);
            console.log("create new tab for multi groupBy and link map node");
            createNewTab();
            await renameTab($("#dagTabView .dagTab.active"), MultiGroupBy);
            await createLinkInNode(dfName, linkOutName);
            console.log("linkInLinkOutTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("linkInLinkOutTest failed", e);
            test.fail(deferred, testName, currentTestNumber, "linkInLinkOutTest failed");
        }
    }

    async function multiGroupByTest(deferred, testName, currentTestNumber) {
        try {
            console.log("multiGroupByTest starts");
            // focus on multi groupBy Tab
            focusOnTab(MultiGroupBy);
            console.log("find the link in node");
            const $dagView = $("#dagView .dataflowArea.active");
            const $linInNode = $dagView.find("g.operator.link.state-Complete");
            test.assert($linInNode.length === 1);
            const linkInNodeId = $linInNode.data("nodeid");

            console.log("create groupBy operator and open the configuration");
            const nodeId = test.createNodeAndOpenPanel(linkInNodeId, DagNodeType.GroupBy);
            const $panel = $("#groupByOpPanel");
            console.log("choose DEST col as first group on field");

            const col1 = "DEST";
            fillArgInPanel($panel.find(".gbOnRow.original input"), gColPrefix + col1);

            const col2 = "AIRTIME";
            console.log("choose AIRTIME col as first group on field");
            $panel.find(".addGroupArg").click();
            fillArgInPanel($panel.find(".gbOnRow.extraArg input"), gColPrefix + col2);

            console.log("count on ARRDELAY");
            $panel.find(".functionsList .functionsInput").val("count").trigger(fakeEvent.enterKeydown);
            fillArgInPanel($panel.find(".gbAgg"), gColPrefix + "ARRDELAY");
            fillArgInPanel($panel.find(".colNameSection .arg"), "ArrDelay_count");
            $panel.find(".submit").click();

            await test.hasNodeWithState(nodeId, DagNodeState.Configured);

            console.log("execute group By");
            await test.executeNode(nodeId);

            console.log("multiGroupByTest finsihed");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("multiGroupByTest failed", e);
            test.fail(deferred, testName, currentTestNumber, e);
        }
    }

    async function multiJoinTest(deferred, testName, currentTestNumber) {
        try {
            console.log("multiJoinTest starts");
            // load schedule table
            console.log("load schedule table");
            const scheduleTable = "SCHEDULE" + Math.floor(Math.random() * 1000);
            const url = testDataLoc + "indexJoin/schedule/schedule.json";
            const check = "#previewTable td:eq(1):contains(1)";
            await test.loadTable(scheduleTable, url, check);

            // focus on multi join tab
            focusOnTab(MultiJoin);
            // create table operator
            const scheduleNodeId = await test.createTableNode(scheduleTable);

            console.log("find the link in node")
            const $dagView = $("#dagView .dataflowArea.active");
            const $linInNode = $dagView.find("g.operator.link.state-Complete");
            test.assert($linInNode.length === 1);
            const linkInNodeId = $linInNode.data("nodeid");

            console.log("cast DAYOFMONTH into integer");
            const castNodeId = await changeTypeToInteger(linkInNodeId, "DAYOFMONTH");

            console.log("cast DAYOFWEEK into integer");
            const flightNodeId = await changeTypeToInteger(castNodeId, "DAYOFWEEK");

            console.log("multi join with schedule and flight");
            // join CLASS_ID, TEACHER_ID with DAYOFMONTH, DAYOFWEEK
            const lCol1 = "CLASS_ID";
            const lCol2 = "TEACHER_ID";
            const lCols = [lCol1, lCol2];
            const rCols = ["DAYOFMONTH", "DAYOFWEEK"];
            const joinNodeId = await mutiJoinHelper(scheduleNodeId, lCols, flightNodeId, rCols);
            console.log("execute multi join");
            await test.executeNode(joinNodeId);

            console.log("preview multi join result");
            const $node = DagViewManager.Instance.getNode(joinNodeId);
            test.nodeMenuAction($node, "viewResult");
            await test.checkExists("#sqlTableArea:visible .xcTableWrap");
            test.assert($("#sqlTableArea .totalRows").text().indexOf("1,953") > -1);
            console.log("multiJoinTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("multiJoinTest failed", e);
            test.fail(deferred, testName, currentTestNumber, e);
        }
    }

    async function mutiJoinHelper(lNodeId, lCols, rNodeId, rCols) {
        try {
            // create a join operator and open the configuration panel
            const nodeId = test.createNodeAndOpenPanel([lNodeId, rNodeId], DagNodeType.Join);
            const $panel = $("#joinOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);

            console.log("add multi clause");
            for (let i = 1; i < lCols.length; i++) {
                $panel.find(".addClause button").click();
            }

            const selectDropdown = async function(i) {
                const $dropdownLeft = $panel.find('.mainTable .joinClause .col-left .hintDropdown').eq(i)
                $dropdownLeft.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                await test.wait(10);

                $dropdownLeft.find(`li:contains(${lCols[i]})`).trigger(fakeEvent.mouseup);
                await test.wait(10);

                const $dropdownRight = $panel.find('.mainTable .joinClause .col-right .hintDropdown').eq(i)
                $dropdownRight.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                await test.wait(10);

                $dropdownRight.find(`li:contains(${rCols[i]})`).trigger(fakeEvent.mouseup);
                await test.wait(10);
            };

            for (let i = 0; i< lCols.length; i++) {
                await selectDropdown(i);
            }

            // save configuration
            $panel.find(".bottomSection .btn:contains(Next)").click();
            $panel.find(".bottomSection .btn:contains(Save)").click();
            await test.wait(10);
            await test.hasNodeWithState(nodeId, DagNodeState.Configured);
            return nodeId;
        } catch (e) {
            console.error("mutiJoinHelper failed", e);
            throw e;
        }
    }

    async function profileTest(deferred, testName, currentTestNumber) {
        console.log("profileTest Test");
        try {
            const $table = $("#sqlTableArea .xcTable");
            const $header = $table.find(".flexWrap.flex-mid input[value='MONTH']");
            $header.parent().parent().find(".flex-right .innerBox").click();
            $("#colMenu .profile").trigger(fakeEvent.mouseup);
            await test.checkExists([".modalHeader .text:contains('Profile')",
                            "#profileModal[data-state='finished']"], null,
                            {"asserts": [".barChart .area .xlabel:contains('205')"]})

            test.assert($(".barChart .area").length === 8);
            test.assert($(".barChart .area .xlabel:contains('205')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('207')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('193')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('626')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('163')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('134')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('153')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('272')").length > 0);

            console.log("check genAgg")
            $("#profileModal .genAgg").click();
            await test.checkExists("#profileModal .genAgg:not(:visible)");

            test.assert($("#profileModal .infoSection .min").eq(0).text() ===
                        Number(1).toLocaleString());
            test.assert($("#profileModal .infoSection .count").text() ===
                        Number(1953).toLocaleString());
            test.assert($("#profileModal .infoSection .average").text() ===
                        Number(6.506912).toLocaleString());
            test.assert($("#profileModal .infoSection .sum").text() ===
                        Number(12708).toLocaleString());
            test.assert($("#profileModal .infoSection .max").eq(0).text() ===
                        Number(12).toLocaleString());

            console.log("check sort");
            $("#profileModal .sortSection .asc").click();
            await test.checkExists("#profileModal[data-state='finished']", null, {
                "asserts": [".barChart .area:first-child .xlabel:contains('134')"]
            });
            test.assert($(".barChart .area .xlabel").eq(0).text() === "134");
            test.assert($(".barChart .area .xlabel").eq(7).text() === "626");
            $("#profileModal .close").click();
            console.log("profileTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("profileTest failed", e);
            test.fail(deferred, testName, currentTestNumber, error);
        }
    }

    async function corrAndQuickAggTest(deferred, testName, currentTestNumber) {
        console.log("corrAndQuickAggTest starts");
        try {
            await corrTest();
            await quickAggTest();
            console.log("corrAndQuickAggTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("corrAndQuickAggTest failed", e);
            test.fail(deferred, testName, currentTestNumber, error);
        }
    }

    async function corrTest() {
        console.log("corrTest starts");
        try {
            $("#sqlTableArea .tableMenu").click();
            $("#tableMenu .corrAgg").trigger(fakeEvent.mouseup);
            await test.checkExists("#aggModal-corr[data-state='finished']",
                            defaultTimeout, {"asserts": [".aggTableField:contains('-0.4')"]})
            console.log("corrTest finished");
        } catch (e) {
            console.error("corrTest failed", e);
            throw e;
        }
    }

    async function quickAggTest() {
        console.log("quickAggTest starts");
        try {
            $("#aggTab").click();
            await test.checkExists("#aggModal .spinny", null, {notExist: true});

            test.assert($(".aggTableField:contains('4574')").length);
            test.assert($(".aggTableField:contains('334')").length);
            $("#aggModal .close").click();
            console.log("quickAggTest finished");
        } catch (e) {
            console.error("quickAggTest failed", e);
            throw e;
        }
    }

    async function jsonModalTest(deferred, testName, currentTestNumber) {
        console.log("jsonModalTest starts");
        try {
            if ($("#alertActions").is(":visible")) {
                $("#alertActions button:visible").click();
            }
            const $jsonModal = $("#jsonModal");
            const $activeTable = $("#sqlTableArea .xcTable");
            $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
            $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
            $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
            $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
            await test.checkExists('.xcTable:visible');
            await test.checkExists(['#jsonModal .jsonWrap:eq(0)', '#jsonModal .jsonWrap:eq(1)']);

            // compare matches on 2 data browser columns
            $jsonModal.find('.compareIcon').eq(0).trigger(fakeEvent.click);
            $jsonModal.find('.compareIcon').eq(1).trigger(fakeEvent.click);
            test.assert($jsonModal.find('.matched').eq(0).text() ===
                        $jsonModal.find('.matched').eq(1).text());
            // click on a 3rd column and compare matches
            $activeTable.find('.jsonElement').eq(2).trigger(fakeEvent.mousedown);
            $activeTable.find('.jsonElement').eq(2).trigger(fakeEvent.mousedown);
            $('#jsonModal .compareIcon').eq(2).trigger(fakeEvent.click);
            test.assert($jsonModal.find('.matched').eq(0).text() ===
                        $jsonModal.find('.matched').eq(2).text() &&
                        $jsonModal.find('.matched').eq(1).text() ===
                        $jsonModal.find('.matched').eq(2).text());
            test.assert($jsonModal.find('.partial:eq(0)').text() !==
                        $jsonModal.find('.partial:eq(1)').text());
            test.assert($jsonModal.find('.partial:eq(0) > div').length ===
                        $jsonModal.find('.partial:eq(1) > div').length);

            // generate new column in table
            const $div = $jsonModal.find(".matched:eq(2) > div .jKey").eq(0);
            const clickedName = $div.text();
            $div.trigger(fakeEvent.click);
            const $newTh = $('.xcTable:visible').eq(0).find('.th.selectedCell');

            const colName = $newTh.find('.editableHead').val();
            test.assert(colName.length > 1, "assert colname exists");
            test.assert(clickedName.indexOf(colName) > -1, "assert colName match in json modal");
            console.log("jsonModalTest finished");
            test.pass(deferred, testName, currentTestNumber);
        } catch (e) {
            console.error("jsonModalTest failed", e);
            test.fail(deferred, testName, currentTestNumber, error);
        }
    }

    // ================ HELPER FUNCTION =====================================//
    function randInt(numDigits) {
        if (numDigits) {
            return (Math.floor(Math.random() * Math.pow(10, numDigits)));
        }
        return (Math.floor(Math.random() * 10000));
    }

    function fillArgInPanel($arg, val) {
        $arg.val(val).trigger("change");
    }

    function changeTypeToInteger(parentNodeId, colName) {
        const deferred = PromiseHelper.deferred();
        const nodeId = test.createNodeAndOpenPanel([parentNodeId], DagNodeType.Map, DagNodeSubType.Cast);
        const $panel = $("#castOpPanel");
        test.assert($panel.hasClass("xc-hidden") === false);

        // select column
        const $li = $panel.find(".candidateSection .listSection .lists").eq(0).find(".inputCol").filter(function() {
            return $(this).find(".colName").text() === colName;
        });

        test.assert($li.length === 1);
        $li.click();
        // select integer type
        $panel.find(".resultSection .typeList li:contains(integer)").trigger(fakeEvent.mouseup);
        $panel.find(".submit").click();

        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            deferred.resolve(nodeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    async function createLinkOutNode(parentNodeId, name) {
        try {
            // create a link out opeator and open configuration
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.DFOut);
            const $panel = $("#dfLinkOutPanel");
            const linkOutName = xcHelper.randName(name);
            $panel.find(".linkOutName input").val(linkOutName);
            $panel.find(".checkbox").click(); // check the checkbox
            // save configuratiaon
            $panel.find(".submit").click();
            await test.hasNodeWithState(nodeId, DagNodeState.Configured);
            await test.executeNode(nodeId); // execute link out
            return linkOutName;
        } catch (e) {
            console.error("create link out node failed");
            throw e;
        }
    }

    async function createLinkInNode(dfName, linkOutName) {
        try {
            // create a link in opeator and open the configuration panel
            const nodeId = test.createNodeAndOpenPanel(null, DagNodeType.DFIn);
            const $panel = $("#dfLinkInPanel");
            fillArgInPanel($panel.find(".dataflowName input"), dfName);
            fillArgInPanel($panel.find(".linkOutNodeName input"), linkOutName);
            $panel.find(".bottomSection .submit").click();

            await test.hasNodeWithState(nodeId, DagNodeState.Configured);
            await test.executeNode(nodeId);
            return nodeId;
        } catch (e) {
            console.error("createLinkInNode failed", e);
            throw e;
        }
    }

    async function renameTab($tab, newName) {
        // XXX TODO not sure why but run in sync way sometimes fail to rename
        // maybe related to the slowness of event propogation
        try {
            $tab.find(".dragArea").dblclick();
            await test.wait(500);
            $tab.find(".xc-input").text(newName);
            await test.wait(500);
            $tab.find(".xc-input").focusout();
            await test.wait(500);
        } catch (e) {
            console.error("reaname moduel failed", e);
            throw e;
        } finally {
            if (test.assert($tab.find(".name").text().includes(newName))) {
                console.log("rename module finished");
                return;
            } else {
                throw new Error("reaname moduel failed");
            }
        }
    }

    function createNewTab() {
        $("#tabButton").click();
    }

    function focusOnTab(tabName) {
        console.log(`focus on the ${tabName} tab`);
        const $tab = $("#dagTabView .dagTab").filter((_index, el) => {
            return $(el).find(".name").text() === tabName;
        });
        test.assert($tab.length === 1);
        if (!$tab.hasClass("active")) {
            $tab.click();
        }
    }
    return FlightTest;
}({}, jQuery));
