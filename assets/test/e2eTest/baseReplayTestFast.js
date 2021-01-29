/*
    Fast because this replay does not recreate nodes from the workbook,
    instead it just executes the nodes
*/
const execFunctions = require('./lib/execFunctions');

function replay(testConfig, tags) {
    let testTabs = new Map(); // { id: string, nodes: [] }
    const testTabMapping = new Map(); // WB tabName => newTabName
    const testDfIdMapping = new Map(); // WB df_id => new df_id
    const testTabDfMapping = new Map(); // tabName => dfId
    const testNodeIdMapping = new Map(); // tabName => nodeMap
    let linkOutOptimizedTable;


    function buildTestUrl(browser, testConfig) {
        let user = testConfig.user || browser.globals.user;
        return `${browser.globals.launchUrl}testSuite.html?test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${user}&id=0`
    }

    return {
        '@tags': tags,

        before: function(browser) {
            browser
                .url(buildTestUrl(browser, testConfig))
                .waitForElementVisible('#container', 1000 * 30)
                .waitForElementVisible('#container.noWorkbook', 1000 * 60 * 2);
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
            // if (testConfig.datasets && testConfig.datasets.length) {
            if (false) { // XXX disabled due to backend bug where dataset
                // cannot be deactivated
                browser.perform(() => {
                    browser.click("#dataStoresTab");
                    browser.isVisible("#datastoreMenu .menuSection.in", (results) => {
                        if (results.value) {
                            /* is visible, good */
                        } else {
                            browser.click("#inButton");
                        }
                        browser
                        .execute(execFunctions.scrollIntoView, ["#dsListSection .grid-unit:last-child"], () => {})
                            testConfig.datasets.forEach(datasetId => {
                                browser
                                .execute(execFunctions.scrollIntoView, [`#dsListSection .grid-unit[data-dsid="${datasetId}"]`], () => {})
                                .moveToElement(`#dsListSection .grid-unit[data-dsid="${datasetId}"]`, 10, 10)
                                .mouseButtonClick('right')
                                .waitForElementVisible("#gridViewMenu", 1000)
                                .click("#gridViewMenu .deactivate")
                                .waitForElementVisible("#alertModal", 10000)
                                .click("#alertModal .confirm")
                                .waitForElementVisible(`#dsListSection .grid-unit[data-dsid="${datasetId}"].inActivated`, 20000)
                                .moveToElement(`#dsListSection .grid-unit[data-dsid="${datasetId}"]`, 10, 10)
                                .mouseButtonClick('right')
                                .waitForElementVisible("#gridViewMenu", 1000)
                                .click("#gridViewMenu .delete")
                                .waitForElementVisible("#alertModal", 10000)
                                .click("#alertModal .confirm")
                                .waitForElementNotVisible("#modalBackground", 10000);
                            });

                    });
                });
            }
            let user = testConfig.user || browser.globals.user;
            browser.deleteWorkbook(browser.globals.finalWorkbookName, user);
        },

        'upload and enter workbook': function(browser) {
            browser.uploadAndEnterWorkbook(testConfig.workbook);
        },

        // this changes XcalarQueryCheck so that we can console.error
        // the error in case it fails
        'hackXcalarQueryCheck': function(browser) {
            browser.execute(execFunctions.hackXcalarQueryCheck, []);
        },

        'disable auto exec': function(browser) {
            browser.execute(execFunctions.disableAutoExec, []);
            browser.execute(execFunctions.enableOperatorBar, []);
        },

        'get tabs and nodes': function(browser) {
            browser.execute(execFunctions.getDataflowInfo, [], function(result) {
                let arr = [];
                let map = result.value;
                for (let i in result.value) {
                    arr.push({
                        name: i,
                        value: result.value[i]
                    });
                }
                arr.sort((a,b) => {
                    return a.value.order - b.value.order
                });
                arr.forEach(el => {
                    testTabs.set(el.name, el.value);
                    const nodeIdMap = {};
                    el.value.nodes.forEach(node => {
                        nodeIdMap[node.nodeId] = node.nodeId; // TODO fix the need for this
                    });
                    testNodeIdMapping.set(el.name, nodeIdMap);
                });
            });
        },

        'new tabs': function(browser) {
            browser.waitForElementNotVisible("#initialLoadScreen", 100000);
            // close intro popup if visible

            browser.isPresent("#intro-popover", (isPresent) => {
                if (isPresent) {
                    browser.click("#intro-popover .cancel");
                    browser.pause(1000);
                }
                const tabNames = testTabs.keys();
                let newTabIndex = tabNames.length + 1;
                for (const tabName of tabNames) {
                    // testDfIdMapping.set(testTabs[tabName].id, result.value);
                    testTabDfMapping.set(tabName, testTabs.get(tabName).id); // uploaded df
                    // testTabDfMapping.set(testTabMapping.get(tabName), result.value); // replayed df



                    // const selector = `#dagTabSectionTabs .dagTab:nth-child(${newTabIndex}).active`;
                    // browser
                    //     .click('#tabButton')
                    //     .waitForElementPresent(selector, 2000)
                    //     .getText(`${selector} div.name`, function(result) {
                    //         testTabMapping.set(tabName, result.value);
                    //     })
                    //     .execute(function(tabIndex) {
                    //         const tab = DagTabManager.Instance.getTabByIndex(tabIndex);
                    //         return tab.getId();
                    //     }, [newTabIndex - 1], function(result) {
                    //         testDfIdMapping.set(testTabs[tabName].id, result.value);
                    //         testTabDfMapping.set(tabName, testTabs[tabName].id); // uploaded df
                    //         testTabDfMapping.set(testTabMapping.get(tabName), result.value); // replayed df
                    //     });

                    // newTabIndex ++;
                }
            });

        },

        'clearAggs': function(browser) {
            browser.execute(function() {
                let aggs = DagAggManager.Instance.getAggMap();
                for (agg in aggs) {
                    DagAggManager.Instance.removeAgg(agg);
                }
                setInterval(function() {

                })
                return true;
            }, [], null);
        },

        'restore dataset': function(browser) {
            for (const tabName of testTabs.keys()) {
                browser.switchTab(tabName);
                browser.restoreDataset(".dataflowArea.active .dataset .main");
            }
        },

        // 'execute optimized nodes first': function(browser) {
        //     for (const tabName of Object.keys(testTabs)) {
        //         const newTabName = testTabMapping.get(tabName);
        //         const numOfNodes = testTabs[tabName].nodes.length;

        //         const linkOutOptimizedNode = testTabs[tabName].nodes.find((node) => {
        //             return node.type === "link out" &&
        //                 node.title === "optimized";
        //         });
        //         if (linkOutOptimizedNode) {
        //             browser.switchTab(newTabName);
        //             browser.waitForElementNotPresent(".dataflowArea.active.locked");
        //             let linkOutNodeId = testNodeIdMapping.get(newTabName)[linkOutOptimizedNode.nodeId];

        //             let selector = '.operator[data-nodeid="' + linkOutNodeId + '"]';
        //             browser
        //                 .moveToElement(".dataflowArea.active " + selector, 30, 15)
        //                 .mouseButtonClick('right')
        //                 .waitForElementVisible("#dagNodeMenu", 1000)
        //                 .moveToElement("#dagNodeMenu li.createNodeOptimized", 10, 1)
        //                 .waitForElementNotPresent(".dataflowArea.active.locked")
        //                 .mouseButtonClick('left')
        //                 .waitForElementNotPresent('.dataflowArea ' + selector + '.locked', numOfNodes * 20000)
        //                 .waitForElementNotPresent(".dataflowArea.active .operator.state-Running", 100000)
        //                 .waitForElementNotPresent(".dataflowArea.active .operator.locked", 10000);

        //             browser.execute(execFunctions.getTableNameFromOptimizedGraph, [], ({value}) => {
        //                 linkOutOptimizedTable = value;
        //             });
        //         }
        //     }
        // },

        'execute': function(browser) {
            // let linkOutOptimizedTable;
            for (const tabName of testTabs.keys()) {
                browser.perform(() => {
                    browser.execute(execFunctions.clearConsole, [], () => {});
                    // const newTabName = testTabMapping.get(tabName);
                    const newTabName = tabName;
                    const numOfNodes = testTabs.get(tabName).nodes.length;
                    // used for checking completed nodes
                    const numOfCustomNodes = testTabs.get(tabName).nodes.filter((node) => {
                        return node.type === "custom";
                    }).length;
                    console.log("numOfCustomNodes: " + numOfCustomNodes);
                    console.log(newTabName);
                    browser
                    .switchTab(newTabName);

                    const linkInOptimizedNode = testTabs.get(tabName).nodes.find((node) => {
                        return node.type === "link in" &&
                            node.title === "optimized";
                    });

                    if (linkInOptimizedNode && linkOutOptimizedTable) {
                        let linkInNodeId = testNodeIdMapping.get(newTabName)[linkInOptimizedNode.nodeId];
                        const input = JSON.parse(JSON.stringify(linkInOptimizedNode.input));
                        const schema = linkInOptimizedNode.schema;
                        input.source = linkOutOptimizedTable;
                        input.schema = schema;
                        browser
                        .openOpPanel('.operator[data-nodeid="' + linkInNodeId + '"] .main')
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 100000);
                    }

                    browser
                    .elements('css selector','.dataflowArea.active .operator', function (result) {
                        console.log("second--result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                        browser.assert.ok(result.value.length > 0);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                        browser.assert.ok(result.value.length < numOfNodes);
                    })
                    .executeAll(numOfNodes * 20000)
                    .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
                        browser.assert.equal(result.value.length, 0); // link out optimized not executed
                    })
                    .saveScreenshot("nwscreenshot1.png")
                    .elements('css selector','.dataflowArea.active .operator.state-Error', function (result) {
                        console.log("should not have error nodes");
                        browser.assert.equal(result.value.length, 0);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Running', function (result) {
                        console.log("should not have running nodes");
                        browser.assert.equal(result.value.length, 0);
                    })
                    .elements('css selector','.dataflowArea.active .operator', function (result) {
                        console.log("third--result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                    })
                    .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
                        console.log("result: " + result.value.length, "customNodes: " + numOfCustomNodes, " numOfNode: " + numOfNodes);
                        browser.assert.equal(result.value.length - numOfCustomNodes, numOfNodes);
                    });

                    browser.waitForElementNotPresent(".dataflowArea.active.locked");
                });
            }
        },

        'validate': function(browser) {
            // The validation nodes must be DFLinkOut
            for (const {dfName, nodeName} of testConfig.validation) {
                // const newTabName = testTabMapping.get(dfName);
                const newTabName = dfName;

                const linkOutNode = testTabs.get(dfName).nodes.find((node) => {
                    return node.type === "link out" &&
                           node.input.name === nodeName;
                });

                let parentNodeId = linkOutNode.parents[0];

                let linkOutNodeId = testNodeIdMapping.get(newTabName)[parentNodeId];

                browser
                    .switchTab(newTabName)
                    .moveToElement(`.dataflowArea.active .operator[data-nodeid="${linkOutNodeId}"] .mainTableIcon`, 10, 20)
                    .mouseButtonClick('right')
                    .waitForElementVisible("#dagTableNodeMenu", 1000)
                    .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible('#sqlTableArea .totalRows', 20000)
		    .pause(1000)
                    .getText('#sqlTableArea .totalRows', ({value}) => {
                        browser.assert.equal(value, "0");
                    });
            }
        },

        'resetDatasetNodes': function(browser) {
            // The validation nodes must be DFLinkOut
            for (const tabName of testTabs.keys()) {
                browser.perform(() => {
                    // const newTabName = testTabMapping.get(tabName);
                    const newTabName = tabName;
                    browser.switchTab(newTabName);

                    const datasetNodes = testTabs.get(tabName).nodes.filter((node) => {
                        return node.type === "dataset";
                    });
                    datasetNodes.forEach((datasetNode) => {
                        let datasetNodeId = testNodeIdMapping.get(newTabName)[datasetNode.nodeId];
                        // reset the dataset node so we can delete the dataset at cleanup
                        browser
                        .moveToElement('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"] .main', 30, 15)
                        .mouseButtonClick('right')
                        .waitForElementVisible("#dagNodeMenu", 1000)
                        .moveToElement("#dagNodeMenu li.resetNode", 10, 1)
                        .mouseButtonClick('left')
                        .waitForElementVisible('#alertModal', 10000)
                        .click('#alertModal .confirm')
                        .waitForElementNotVisible("#modalBackground", 10000);
                    });
                });
            }
            browser.pause(3000); // wait for tables to be deleted
        }
    };
}

module.exports = {
    replay: replay
};
