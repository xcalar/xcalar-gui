/**
 * Base test for testing a specific tutorial project.
 * The testing steps are:
 * 1. open tutorial projects page
 * 2. download the specified tuturial project
 * 3. for each dataflow/module in the workbook:
 * 3.1. switch to the tab
 * 3.2. restore dataset nodes
 * 3.3. execute the dataflow
 * 3.4. check the result value to be as specified
 */

const execFunctions = require('./lib/execFunctions');

function replay(testConfig, tags) {
    return {
        '@tags': tags,

        before: function(browser) {
            browser
                .url(browser.globals.buildTestUrl(browser, browser.globals.user))
                .waitForElementVisible('#container', 10000)
                .cancelAlert()
                .cancelTooltipWalkthrough()
                .deleteWorkbook(testConfig.workbook)
        },

        after: function(browser) {
            browser
                .deleteWorkbook(browser.globals.finalWorkbookName, browser.globals.user);
        },

        'tutorial project can be downloaded and opened': function(browser) {
            browser
                .ensureHomeScreenOpen()
                .waitForElementVisible("#helpArea")
                .click("#helpArea")
                .waitForElementVisible("#helpAreaMenu .tutorials")
                .click("#helpAreaMenu .tutorials")
                .waitForElementVisible("#helpTopBar .title")
                .expect.element("#helpTopBar .title").text.to.equal(`HELP & SUPPORT: TUTORIALS`)
            browser
                .waitForElementVisible("#help-tutorial .category.Applications .item." + testConfig.workbook + " .tutorialName", 60000)
                .pause(3000)
                .expect.element("#help-tutorial .category.Applications .item." + testConfig.workbook + " .tutorialName").text.to.contain(`Word Count`)
            browser
                .waitForElementVisible("#help-tutorial .category.Applications .item." + testConfig.workbook + " button.download")
                .click("#help-tutorial .category.Applications .item." + testConfig.workbook + " button.download")
                .pause(10000)
                .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
                .url(function (response) {
                    url = new URL(response.value)
                    workbookName = url.searchParams.get("workbook")
                    browser.assert.equal(workbookName, testConfig.workbook)
                });
        },

        'word count tutorial project should have the right structure': function(browser) {
            for (const {
                    dfName,
                    resultNodeName,
                    resultType,
                    resultValue,
                    expectedNodes,
                    expectedComments
                } of testConfig.validation) {
                browser
                    .switchTab(dfName)
                    .execute(execFunctions.getTabElements, [], function(result) {
                        // optionally check for exact comment matching
                        if (expectedComments) {
                            comments = result.value.comments.map(comment => comment.text).sort();
                            expectedComments.sort();
                            browser
                                .assert.equal(JSON.stringify(expectedComments), JSON.stringify(comments))
                        }

                        const nodes = result.value.nodes;
                        const nodeTypes = nodes.map(node => node.type).sort();
                        expectedNodes.sort();
                        browser
                            .assert.equal(JSON.stringify(expectedNodes), JSON.stringify(nodeTypes))

                        let resultNodeId;
                        nodes.forEach((node) => {
                            if (node.type === "dataset") {
                                browser
                                    .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + node.id + '"] .main');
                            }
                            if (node.title === resultNodeName) {
                                resultNodeId = node.id;
                            }
                        });

                        browser
                            .validatePreExecuteAll(nodes)
                            .executeAll(nodes.length * 10000)

                        browser
                            .pause(10000)
                            .waitForElementVisible(`.dataflowArea.active .operator[data-nodeid="${resultNodeId}"] .main`)
                            .moveToElement(`.dataflowArea.active .operator[data-nodeid="${resultNodeId}"] .main`, 10, 20)
                            .mouseButtonClick('right')
                            .waitForElementVisible("#dagNodeMenu")
                            .click('#dagTableNodeMenu li.viewResult')
                        if (resultType === 'single value') {
                            browser
                                .waitForElementVisible("#alertModal")
                                .waitForElementVisible("#alertContent .text")
                                .expect.element("#alertContent .text").text.to.equal(resultValue)
                            browser
                                .cancelAlert()
                        } else if (resultType === 'table value') {
                            let columnIndex;
                            browser
                                .waitForElementVisible("#sqlTableArea table")
                                .execute(execFunctions.getColumnIndex, [resultValue.column], function(result) {
                                    columnIndex = result.value;
                                    const cellsInResultColumn = "td[contains(@class, 'col" + columnIndex + "')]";
                                    const cellsWithResultValue = "div[contains(@class, 'displayedData') and text()='" + resultValue.value + "']";
                                    const resultCellXpath = "//" + cellsInResultColumn + "/" + cellsWithResultValue;
                                    browser
                                        .useXpath()
                                        .waitForElementVisible(resultCellXpath)
                                        .useCss()
                                });
                        }
                    })
            }
        },
    };
}

module.exports = {
    replay: replay
};
