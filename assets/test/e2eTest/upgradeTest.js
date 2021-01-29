
const testConfig = {
    workbook: 'Test-Dataflow-Upgrade',
    isUpgrade: true,
    validation: [
        {dfName: 'DF Test (result)', nodeName: 'validation1'}
    ]
};

const execFunctions = require('./lib/execFunctions');
let datasetNodeId;

let testTabs = {}; // { id: string, nodes: [] }
module.exports = {
    '@tags': ["upgradeTest", "allTestsSkipped"],

    before: function(browser) {
        console.log(browser.globals.buildTestUrl(browser, browser.globals.user));
        browser
            .url(browser.globals.buildTestUrl(browser, browser.globals.user))
            .waitForElementVisible('#container', 10 * 1000)
            .waitForElementVisible('#container.noWorkbook', 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 2 * 60 * 1000);
    },

    after: function(browser) {
        if (testConfig.IMDNames && testConfig.IMDNames.length) {

            browser.click("#dagList .refreshBtn")
            .waitForElementNotPresent("#dagList .refreshIcon", 50000)
            .waitForElementPresent('#dagList .tableList .table[data-name="' + testConfig.IMDNames[0] + '"]', 10000)

            testConfig.IMDNames.forEach((IMDName) => {
                browser
                    .execute(execFunctions.scrollIntoView, ['#dagList .tableList .table[data-name="' + IMDName + '"]'], () => {})
                    .moveToElement('#dagList .tableList .table[data-name="' + IMDName + '"]', 30, 4)
                    .moveToElement('#dagList .tableList .table[data-name="' + IMDName + '"] .dropDown', 4, 4)
                    .mouseButtonClick("left")
                    .moveToElement("#dagListMenu li.tableDelete", 10, 10)
                    .mouseButtonClick("left")
                    .click("#alertModal .confirm")
                    .waitForElementNotPresent('#dagList .tableList .table[data-name="' + IMDName + '"]', 10000);
            });
        }
        /* clean up and delete dataset */
        /* disabled due to backend bug where dataset cannot be deactivated */
        // browser
        // .click("#dataStoresTab");
        // browser.isVisible("#datastoreMenu .menuSection.in", (results) => {
        //     if (results.value) {
        //         /* is visible, good */
        //     } else {
        //         browser.click("#inButton");
        //     }
        //     browser
        //     .execute(execFunctions.scrollIntoView, ["#dsListSection .grid-unit:last-child"], () => {})
        //     .moveToElement("#dsListSection .grid-unit:last-child", 10, 10)
        //     .mouseButtonClick('right')
        //     .waitForElementVisible("#gridViewMenu", 1000)
        //     .pause(1000 * 50)
        //     .click("#gridViewMenu .deactivate")
        //     .waitForElementVisible("#alertModal", 10000)
        //     .click("#alertModal .confirm")
        //     .waitForElementVisible("#dsListSection .grid-unit:last-child.inActivated", 60000)
        //     .moveToElement("#dsListSection .grid-unit:last-child", 10, 10)
        //     .mouseButtonClick('right')
        //     .waitForElementVisible("#gridViewMenu", 1000)
        //     .click("#gridViewMenu .delete")
        //     .waitForElementVisible("#alertModal", 10000)
        //     .click("#alertModal .confirm")
        //     .waitForElementNotVisible("#modalBackground", 10000)
        //     .pause(3000);
        // });

        browser.deleteWorkbook(browser.globals.finalWorkbookName, testConfig.user);
    },

    'upload and enter workbook': function(browser) {
        browser.uploadAndEnterWorkbook(testConfig.workbook, testConfig.isUpgrade);
        // prevent dfAutoPreview from showing table automatically
        browser.execute(function() {
                let cachedUserPref = UserSettings.Instance.getPref;
                UserSettings.Instance.getPref = function(val) {
                    if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                        return false;
                    } else {
                        return cachedUserPref(val);
                    }
                };
            }, [])
    },

    'change settings': function(browser) {
        browser.execute(execFunctions.disableAutoExec, []);
        browser.execute(execFunctions.enableOperatorBar, []);
        browser.execute(execFunctions.stackDataflow, []);
        browser.execute(execFunctions.disableSqlPanelAlert, []);
    },

    'get tabs and nodes': function(browser) {
        browser.execute(execFunctions.getDataflowInfo, [], function(result) {
            testTabs = result.value;
        });
    },

    'clearAggs': function(browser) {
        browser.clearAggregates();
    },

    'addPublishIMDNode': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const parentNodes = testTabs[tabName].nodes.filter((node) => {
                return node.title === "b#52";
            });
            const nodes =[
                {
                    "type": "publishIMD",
                    "subType": null,
                    "display": {
                        "x": 1540,
                        "y": 140
                    },
                    "description": "",
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "parents": [parentNodes[0].id],
                    "id": "dag_5C747F5F163D7BE2_1551162688304_36"
                }
            ];
            browser.switchTab(newTabName);

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .execute(execFunctions.scrollIntoView, [".category." + nodeCategoryClass], () => {})
                    .moveToElement("#dagView .categorySection", 1, 1)
                    .moveToElement(".category." + nodeCategoryClass + " .innerCategory", 1, 1)
                    .mouseButtonDown("left")
                    .mouseButtonUp();
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                    }
                );


            });
            browser.perform(() => {
                let input = {
                    "pubTableName": "PUBTESTE2E",
                    "primaryKeys": [
                        "$CLASS_ID_MAXINTEGER"
                    ],
                    "operator": "$CLASS_ID_MAXINTEGER",
                    "columns": [
                        "CLASS_ID_CONCAT",
                        "CLASS_ID_MAXINTEGER",
                        "CLASS_ID"
                    ]
                };

                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + parentNodes[0].nodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${parentNodes[0].nodeId}"]`
                    + `[data-connectorindex="0"]`,
                    10);

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));

            });
        }
    },


    'config dataset schema': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const datasetNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "dataset";
            });

            datasetNodes.forEach((datasetNode, i) => {
                if (i < 2) { // only do top 2 datasets
                    browser.executeNode('.operator[data-nodeid="' + datasetNode.nodeId + '"] .main');
                }

            });


            browser.perform(() => {

                datasetNodes.forEach((nodeInfo, i) => {
                    if (i > 1) { // only do top 2 datasets
                        return;
                    }
                    input = nodeInfo.input;
                    if (input.prefix === "classes") {
                        input.schema = [
                            {
                                "name": "class_name",
                                "type": "string"
                            },
                            {
                                "name": "class_id",
                                "type": "integer"
                            }
                        ];
                    } else if (input.prefix === "schedule") {
                        input.schema =   [
                            {
                                "name": "class_id",
                                "type": "integer"
                            },
                            {
                                "name": "days",
                                "type": "array"
                            },
                            {
                                "name": "time",
                                "type": "string"
                            },
                            {
                                "name": "duration",
                                "type": "string"
                            },
                            {
                                "name": "teacher_id",
                                "type": "integer"
                            },
                            {
                                "name": "student_ids",
                                "type": "array"
                            }
                        ];
                    }

                    if (!nodeInfo.schema || !nodeInfo.schema.length) {
                        nodeInfo.schema = input.schema;
                        browser
                        .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"] .main')
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                        // .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + nodeInfo.nodeId + '"] .main');
                    }
                });
            });
        }
    },

      // imdTable nodes depend on publishedIMD node to be executed first
    'config imdTable nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            browser.switchTab(newTabName);
            browser.executeNode(".operator.publishIMD .main");
            testConfig.IMDNames = ["PUBTESTE2E"];
            browser
            .pause(2000) // don't know why but need to wait for modalbackground to fade out

            // alert modal may be showing saying that published table already
            // exists. If it does, good -- close modal and don't create
            browser.isVisible("#alertModal", results => {
                if (results.value) { // close alert modal if visible
                    browser
                    .click("#alertModal .cancel")
                    .pause(2000);
                } else {
                    browser
                    .click("#dataStoresTab")
                    .click("#sourceTblButton")
                    .click("#datastoreMenu .table .iconSection .refresh")
                    .waitForElementNotPresent("#datastoreMenu .refreshIcon", 50000)
                    .waitForElementPresent('#datastoreMenu .grid-unit[data-id="' + testConfig.IMDNames[0] + '"]', 10000)
                    .click("#resourcesTab");
                }

                const imdNodes = testTabs[tabName].nodes.filter((node) => {
                    return node.type === "IMDTable";
                });
                imdNodes.forEach((nodeInfo) => {
                    input = nodeInfo.input;
                    input.schema = [
                        {
                            "name": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XcalarRankOver",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarOpCode",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarBatchId",
                            "type": "integer"
                        }
                    ];

                    browser
                    .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"] .main')
                    .clearValue("#IMDTableOpPanel .pubTableInput")
                    .setValue("#IMDTableOpPanel .pubTableInput", input.source)
                    .moveToElement("#pubTableList li:not(.xc-hidden)", 2, 2)
                    .mouseButtonUp("left")
                    .submitAdvancedPanel("#IMDTableOpPanel", JSON.stringify(input, null, 4));
                });
            });


        }
    },

    // 1.4.1 publish does a weird cast, so the fix is to turn a float into integer
    'config union nodes': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const unionNodes = testTabs[tabName].nodes.filter((node) => {
                return node.type === "set";
            });
            unionNodes.forEach((nodeInfo) => {
                let input = nodeInfo.input;
                input.columns[0][1].columnType = "integer";
                input.columns[1][1].columnType = "integer";
                browser
                .openOpPanel('.operator[data-nodeid="' + nodeInfo.nodeId + '"] .main')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
            });

        }
    },

    'execute top and bottom graphs': function(browser) {

        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const numOfNodes = testTabs[tabName].nodes.length;
            browser
                .switchTab(newTabName);
            browser.waitForElementNotPresent(".dataflowArea.active.locked");

            const finalNode = testTabs[tabName].nodes.find((node) => {
                return node.title === "union#76";
            });

            const linkOutNode = testTabs[tabName].nodes.find((node) => {
                return node.type === "link out";
            });

            browser
                .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                    browser.assert.ok(result.value.length > 0);
                })
                .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                    browser.assert.ok(result.value.length < numOfNodes);
                });


            browser.executeNode('.operator[data-nodeid="' + finalNode.nodeId + '"] .main');

            // let selector = '.operator[data-nodeid="' + linkOutNode.nodeId + '"]';
            // XXX optimized execution failing due to udf

            // browser
            //     .moveToElement(".dataflowArea.active " + selector, 30, 15)
            //     .mouseButtonClick('right')
            //     .waitForElementVisible("#dagNodeMenu", 1000)
            //     .moveToElement("#dagNodeMenu li.executeNodeOptimized", 10, 1)
            //     .waitForElementNotPresent(".dataflowArea.active.locked")
            //     .mouseButtonClick('left')
            //     .waitForElementPresent('.dataflowArea .operator[data-nodeid="' + linkOutNode.nodeId + '"].state-Complete', 50000);
        }
    },


    'loadExportedDataset': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const nodes = [
                {
                    "version": 1,
                    "type": "dataset",
                    "subType": null,
                    "display": {
                        "x": 2160,
                        "y": 140
                    },
                    "description": "exportedDataset",
                    "title": "Node 1",
                    "input": {
                        "source": "dftest3.35829.upgradeTest",
                        "prefix": "upgradeTest",
                        "synthesize": false,
                        "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"dftest3.35829.upgradeTest\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/tmp/export_test/upgradeTest2.csv\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\n\\\",\\\"fieldDelim\\\":\\\"\\\\t\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"columnType\": \"DfFloat64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID\",\n                        \"destColumn\": \"CLASS_ID\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarOpCode\",\n                        \"destColumn\": \"XcalarOpCode\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_CONCAT\",\n                        \"destColumn\": \"CLASS_ID_CONCAT\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarRankOver\",\n                        \"destColumn\": \"XcalarRankOver\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER_udf\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER_udf\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_udf\",\n                        \"destColumn\": \"CLASS_ID_udf\",\n                        \"columnType\": \"DfString\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                    },
                    "id": "dag_5D0326270431FEE7_1560487772757_42",
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "schema": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarOpCode",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XcalarRankOver",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_MAXINTEGER_udf",
                            "type": "string"
                        },
                        {
                            "name": "CLASS_ID_udf",
                            "type": "string"
                        }
                    ],
                    "parents": []
                }
            ];
            browser
                .waitForElementNotVisible("#modalBackground", 300000)
                .switchTab(newTabName)
                .cancelAlert()

            let commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';

            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                        datasetNodeId = nodeId;
                    }
                );
            });

            browser.perform(() => {
                let input = {
                    "source": "dftest3.35829.upgradeTest",
                    "prefix": "upgradeTest",
                    "synthesize": false,
                    "schema": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XcalarOpCode",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XcalarRankOver",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_MAXINTEGER_udf",
                            "type": "string"
                        },
                        {
                            "name": "CLASS_ID_udf",
                            "type": "string"
                        }
                    ],
                    "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"dftest3.35829.upgradeTest\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/tmp/export_test/upgradeTest2.csv\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\n\\\",\\\"fieldDelim\\\":\\\"\\\\t\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": [\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER\",\n                        \"columnType\": \"DfFloat64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID\",\n                        \"destColumn\": \"CLASS_ID\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarOpCode\",\n                        \"destColumn\": \"XcalarOpCode\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_CONCAT\",\n                        \"destColumn\": \"CLASS_ID_CONCAT\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"XcalarRankOver\",\n                        \"destColumn\": \"XcalarRankOver\",\n                        \"columnType\": \"DfInt64\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_MAXINTEGER_udf\",\n                        \"destColumn\": \"CLASS_ID_MAXINTEGER_udf\",\n                        \"columnType\": \"DfString\"\n                    },\n                    {\n                        \"sourceColumn\": \"CLASS_ID_udf\",\n                        \"destColumn\": \"CLASS_ID_udf\",\n                        \"columnType\": \"DfString\"\n                    }\n                ]\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                }

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main', (res) => {
                    // console.log("dataset: " + res);
                });
            });
        }
    },

    // validate top dataflow
    'addSQLNode': function(browser) {
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            const firstParent = testTabs[tabName].nodes.find((node) => {
                return node.title === "union#76";
            });
            const nodes = [
                {
                    "type": "sql",
                    "subType": null,
                    "display": {
                        "x": 2300,
                        "y": 140
                    },
                    "description": "",
                    "input": {
                        "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                        "identifiers": {
                            "1": "testResults",
                            "2": "correctResults"
                        },
                        "identifiersOrder": [
                            1,
                            2
                        ],
                        "dropAsYouGo": true
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "tableSrcMap": {
                        "table_DF2_1551256519225_1_dag_1551256519261_43#t_1551258098932_50": 1,
                        "table_DF2_1551256519225_1_dag_5C764BC624079350_1551258374774_81#t_1551258519644_55": 2
                    },
                    "columns": [
                        {
                            "name": "CLASS_ID_MAXINTEGER",
                            "backName": "CLASS_ID_MAXINTEGER",
                            "type": "float"
                        },
                        {
                            "name": "CLASS_ID",
                            "backName": "CLASS_ID",
                            "type": "integer"
                        },
                        {
                            "name": "XCALAROPCODE",
                            "backName": "XCALAROPCODE",
                            "type": "integer"
                        },
                        {
                            "name": "CLASS_ID_CONCAT",
                            "backName": "CLASS_ID_CONCAT",
                            "type": "string"
                        },
                        {
                            "name": "XCALARRANKOVER",
                            "backName": "XCALARRANKOVER",
                            "type": "integer"
                        }
                    ],
                    "parents": [firstParent.nodeId, datasetNodeId],
                    "nodeId": "dag_5C764BC624079350_1551258719473_82"
                }
            ];
            browser.switchTab(newTabName)

            const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            // Drag&Drop to create node
            browser.perform(() => {
                // Select the operation category
                browser
                    .execute(execFunctions.scrollIntoView, [".category." + nodeCategoryClass], () => {})
                    .moveToElement("#dagView .categorySection", 1, 1)
                    .moveToElement(".category." + nodeCategoryClass + " .innerCategory", 1, 1)
                    .mouseButtonDown("left")
                    .mouseButtonUp();
                // Create the node
                browser.newNode(
                    nodeCategorySelector + ' .main',
                    nodes[0].display.x, nodes[0].display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                    }
                );


            });
            browser.perform(() => {
                let input = {
                    "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
                    "identifiers": {
                        "1": "testResults",
                        "2": "correctResults"
                    },
                    "identifiersOrder": [
                        1,
                        2
                    ],
                    "dropAsYouGo": true
                };

                // connect to first parent which is a map node
                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + firstParent.nodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${firstParent.nodeId}"]`
                    + `[data-connectorindex="0"]`,
                    10);
                // connect to 2nd parent which is a cast node from the dataset node
                browser
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
                .mouseButtonDown("left")
                .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"]', 20, 10)
                .mouseButtonUp("left")
                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                    + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
                    + `[data-parentnodeid="${datasetNodeId}"]`
                    + `[data-connectorindex="1"]`,
                    10);

                browser
                .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main')
                .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

            });
        }
    },

    'validate': function(browser) {
        // The validation nodes must be DFLinkOut
        for (const tabName of Object.keys(testTabs)) {
            const newTabName = tabName;
            browser
                .switchTab(newTabName)
                .executeNode(".operator.sql .main")
                .moveToElement(`.dataflowArea.active .operator.sql .mainTableIcon`, 4, 4)
                .mouseButtonClick('right')
                .waitForElementVisible("#dagTableNodeMenu", 1000)
                .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
                .mouseButtonClick('left')
                .waitForElementVisible('#sqlTableArea .totalRows', 20000);

            browser.getText('#sqlTableArea .totalRows', ({value}) => {
                browser.assert.equal(value, "0");
            });
            // reset the dataset node so we can delete the dataset at cleanup
            browser
            .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"] .main', 30, 15)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.resetNode", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#alertModal', 10000)
            .click('#alertModal .confirm')
            .waitForElementNotVisible("#modalBackground", 10000)
            .pause(3000);
        }


    },

    //validate bottom dataflow which came from embedded retina
    // 'add2ndSQLNode': function(browser) {
    //     for (const tabName of Object.keys(testTabs)) {
    //         const newTabName = tabName;
    //         const firstParent = testTabs[tabName].nodes.filter((node) => {
    //             return node.title === "union#76";
    //         })[1];
    //         const nodes =[
    //             {
    //                 "type": "sql",
    //                 "subType": null,
    //                 "display": {
    //                     "x": 2300,
    //                     "y": 540
    //                 },
    //                 "description": "",
    //                 "input": {
    //                     "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
    //                     "identifiers": {
    //                         "1": "testResults",
    //                         "2": "correctResults"
    //                     },
    //                     "identifiersOrder": [
    //                         1,
    //                         2
    //                     ],
    //                     "dropAsYouGo": true
    //                 },
    //                 "state": "Configured",
    //                 "configured": true,
    //                 "aggregates": [],
    //                 "tableSrcMap": {
    //                     "table_DF2_1551256519225_1_dag_1551256519261_43#t_1551258098932_50": 1,
    //                     "table_DF2_1551256519225_1_dag_5C764BC624079350_1551258374774_81#t_1551258519644_55": 2
    //                 },
    //                 "columns": [
    //                     {
    //                         "name": "CLASS_ID_MAXINTEGER",
    //                         "backName": "CLASS_ID_MAXINTEGER",
    //                         "type": "float"
    //                     },
    //                     {
    //                         "name": "CLASS_ID",
    //                         "backName": "CLASS_ID",
    //                         "type": "integer"
    //                     },
    //                     {
    //                         "name": "XCALAROPCODE",
    //                         "backName": "XCALAROPCODE",
    //                         "type": "integer"
    //                     },
    //                     {
    //                         "name": "CLASS_ID_CONCAT",
    //                         "backName": "CLASS_ID_CONCAT",
    //                         "type": "string"
    //                     },
    //                     {
    //                         "name": "XCALARRANKOVER",
    //                         "backName": "XCALARRANKOVER",
    //                         "type": "integer"
    //                     }
    //                 ],
    //                 "parents": [firstParent.id, datasetNodeId],
    //                 "nodeId": "dag_5C764BC624079350_1551258719473_82"
    //             }
    //         ];
    //         browser.switchTab(newTabName)

    //         const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

    //         let nodeCategoryClass = '';
    //         let nodeCategorySelector = '';
    //         browser.execute(execFunctions.getNodeFromCategoryBar, nodes, ({value}) => {
    //             nodeCategoryClass = value.categoryClass;
    //             nodeCategorySelector = value.nodeSelector;
    //         });

    //         // Drag&Drop to create node
    //         browser.perform(() => {
    //             // Select the operation category
    //             browser
    //                 .moveToElement(".category." + nodeCategoryClass, 1, 1)
    //                 .mouseButtonDown("left");
    //             // Create the node
    //             browser.newNode(
    //                 nodeCategorySelector + ' .main',
    //                 nodes[0].display.x, nodes[0].display.y,
    //                 ({ELEMENT, nodeId}) => {
    //                     commandResult.nodeElemIDs.push(ELEMENT);
    //                     commandResult.nodeIDs.push(nodeId);
    //                     secondSqlNodeId = nodeId;
    //                 }
    //             );


    //         });
    //         browser.perform(() => {
    //             let input = {
    //                 "sqlQueryString": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
    //                 "identifiers": {
    //                     "1": "testResults",
    //                     "2": "correctResults"
    //                 },
    //                 "identifiersOrder": [
    //                     1,
    //                     2
    //                 ],
    //                 "dropAsYouGo": true
    //             };

    //             browser
    //             .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
    //             .mouseButtonDown("left")
    //             .moveToElement('.dataflowArea.active .operator[data-nodeid="' + firstParent.nodeId + '"]', 20, 10)
    //             .mouseButtonUp("left")
    //             .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
    //                 + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
    //                 + `[data-parentnodeid="${firstParent.nodeId}"]`
    //                 + `[data-connectorindex="0"]`,
    //                 10);

    //             browser
    //             .moveToElement('.dataflowArea.active .operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .connector.in', 2, 2)
    //             .mouseButtonDown("left")
    //             .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"]', 20, 10)
    //             .mouseButtonUp("left")
    //             .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
    //                 + `[data-childnodeid="${commandResult.nodeIDs[0]}"]`
    //                 + `[data-parentnodeid="${datasetNodeId}"]`
    //                 + `[data-connectorindex="1"]`,
    //                 10);

    //             browser
    //             .openOpPanel('.operator[data-nodeid="' + commandResult.nodeIDs[0] + '"] .main')
    //             .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

    //         });
    //     }
    // },

    // 'validate2ndSQL': function(browser) {
    //     // The validation nodes must be DFLinkOut
    //     for (const tabName of Object.keys(testTabs)) {
    //         const newTabName = tabName;
    //         browser
    //             .switchTab(newTabName)
    //             .executeNode('.operator[data-nodeid="' + secondSqlNodeId + '"]')
    //             .moveToElement(`.dataflowArea.active ${'.operator[data-nodeid="' + secondSqlNodeId + '"]'} .main`, 10, 20)
    //             .mouseButtonClick('right')
    //             .waitForElementVisible("#dagNodeMenu", 1000)
    //             .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
    //             .mouseButtonClick('left')
    //             .waitForElementVisible('#sqlTableArea .totalRows', 20000)
    //             .getText('#sqlTableArea .totalRows', ({value}) => {
    //                 browser.assert.equal(value, "0");
    //             });
    //     }
    // }

}