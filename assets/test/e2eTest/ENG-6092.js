const testConfig = {
    user: 'dftest',
    workbook: 'ENG-6092'
}
const tags = ["linkInAgg", "allTestsSkipped"];

const execFunctions = require('./lib/execFunctions');
module.exports = {
    '@tags': tags,

    before: function(browser) {
        browser
            .url(browser.globals.buildTestUrl(browser, testConfig.user))
            .waitForElementVisible('#container', 1000 * 60 * 2)
            .waitForElementVisible('#container.noWorkbook', 1000 * 60 * 2);
    },

    after: function(browser) {
        browser.deleteWorkbook(browser.globals.finalWorkbookName, browser.globals.user);
    },

    'upload and enter workbook': function(browser) {
        browser.uploadAndEnterWorkbook(testConfig.workbook);
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
        browser.switchTab("Module 1");
    },

    'clearAggs': function(browser) {
        browser.clearAggregates();
    },

    'restore dataset': function(browser) {
        browser.restoreDataset(".dataflowArea.active .dataset .main");
    },

    'execute aggregate': function(browser) {
        browser
        .executeNode('.operator[data-type="singleValue"] .main')
        .moveToElement(`.dataflowArea.active .operator[data-type="singleValue"] .mainTableIcon`, 10, 20)
        .mouseButtonClick('right')
        .waitForElementVisible("#dagTableNodeMenu", 1000)
        .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
        .mouseButtonClick('left')
        .waitForElementVisible('#alertModal', 20000);

        browser.getText('#alertContent .text', ({value}) => {
            browser.assert.equal(value, `{"Value": 6}`);
        });
        browser.click('#alertModal .close')
            .waitForElementNotVisible("#modalBackground", 10000);
    },

    'execute link in': function(browser) {
        browser.switchTab("Module 2")
        .executeNode('.operator.link.in .main')
        .moveToElement(`.dataflowArea.active .operator.link.in .mainTableIcon`, 10, 20)
        .mouseButtonClick('right')
        .waitForElementVisible("#dagTableNodeMenu", 1000)
        .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
        .mouseButtonClick('left')
        .waitForElementVisible('#sqlTableArea .totalRows', 20000)
        .pause(1000)
        .getText('#sqlTableArea .totalRows', ({value}) => {
            browser.assert.equal(value, "6");
        });
    }
}