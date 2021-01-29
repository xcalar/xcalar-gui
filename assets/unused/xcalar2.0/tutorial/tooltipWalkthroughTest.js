module.exports = {
    '@tags': ["tooltip walkthrough test", "allTestsDisabled"],

    before: function(browser) {
        // to auto start first-time user tooltip walkthrougs
        randomUsername = 'tooltiptest' + Math.random().toString(36).substring(2, 15);
        browser.globals.currentUsername = randomUsername;

        browser
            .url(browser.globals.buildTestUrl(browser, randomUsername))
            .waitForElementVisible('#container', 10 * 1000)
            .waitForElementVisible('#container.noWorkbook', 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 2 * 60 * 1000);
    },

    after: function(browser) {
        browser.deleteFirstWorkbook();
    },

    'should auto start and do project walkthrough ': function(browser) {
        browser
            .waitForElementVisible("#intro-popover")
            .pause(1000)

            //learning Xcalar tip
            .expect.element('#intro-popover .title').text.to.equal('Welcome to Xcalar Design!')
        browser
            .tooltipTest(".tutBox")
            .tooltipTest("#createWKBKbtn", "#createWKBKbtn")
            .pause(5000)

            //newly created project tip
            .waitForElementVisible(".lastCreate")
            .click("#intro-popover .close")
            .waitForElementNotVisible("#modalBackground")
            .waitForElementNotPresent("#intro-visibleOverlay")
            .deleteFirstWorkbook();
    },

    'tooltip modal can be opened from learning Xcalar in Project Browser': function(browser) {
        browser
            .waitForElementVisible(".tutBox .tooltipBtn")
            .click(".tutBox .tooltipBtn")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'tooltip modal can be opened from top right user menu': function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'only project tooltip walkthrough is enabled if no active Projects': function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser.assert.cssClassPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'upload and enter a new project': function(browser) {
        browser.createAndEnterWorkbook();
    },

    "should auto start and do the entire Sql mode walkthrough for on prem successfully": function(browser) {
        browser
            .waitForElementVisible("#intro-popover")

            .tooltipTest("#helpArea")
            .tooltipTest("#menuBar")
            .tooltipTest("#dataStoresTab")
            .tooltipTest("#sqlTab")
            .tooltipTest("#monitorTab")
            .tooltipTest("#dataStoresTab", "#dataStoresTab .mainTab")
            .tooltipTest("#sourceTblButton", "#sourceTblButton")
            .tooltipTest("#dsForm-target")
            .tooltipTest("#filePath")
            .tooltipTest("#dsForm-path .cardMain .browse")
            .tooltipTest("#dsForm-path .btn-submit")
            .tooltipTest("#dsForm-path")
            .tooltipTest("#sqlWorkSpace", "#sqlWorkSpace")
            .tooltipTest("#sqlEditorSpace")
            .tooltipTest("#sqlTableListerArea")
            .tooltipTest("#sqlWorkSpacePanel .historySection")
            .tooltipTest("#helpArea")

            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'all tooltip walkthroughs are enabled if there is an active project': function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#modalBackground")
    },

    'should start project walkthrough successfully': function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(1) .tooltipName').text.to.equal('Project Browser')
        browser
            .assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(1) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(1) button')
            .waitForElementVisible("#intro-popover")
            .expect.element('#intro-popover .title').text.to.equal('Welcome to Xcalar Design!')
        browser
            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'should do the entire developer mode walkthrough successfully': function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(3) .tooltipName').text.to.equal('Developer Mode')
        browser
            .assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(3) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(3) button')
            .waitForElementVisible("#intro-popover")

            .tooltipTest("#helpArea")
            .tooltipTest("#tabButton", "#tabButton")
            .tooltipTest(".dataflowMainArea")
            .tooltipTest("#dagView .categoryBar")
            .tooltipTest("#dagView .operatorBar")
            .tooltipTest("#dagView .operatorBar")
            .tooltipTest(
                "#dagView .operatorWrap .active .operator:first-of-type",
                "#dagView .operatorWrap .active .operator:first-of-type rect.main",
                true
            )
            .tooltipTest(".dataflowArea.active rect.main")
            .tooltipTest(
                "#dagView .operatorWrap .active .operator:first-of-type",
                "#dagView .operatorWrap .active .operator:first-of-type rect.main",
                true
            )
            .tooltipTest("#dagView", "#intro-popover .next")
            .tooltipTest("#helpArea")

            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    "should start Sql mode walkthrough for on prem successfully": function(browser) {
        browser
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .walkthroughs")
            .click("#helpAreaMenu .walkthroughs")
            .waitForElementVisible("#tooltipModal")
            .expect.element('#tooltipModal .item:nth-of-type(2) .tooltipName').text.to.equal('SQL Mode')
        browser.assert.cssClassNotPresent('#tooltipModal .item:nth-of-type(2) button', 'xc-disabled')
            .pause(1000)
            .click('#tooltipModal .item:nth-of-type(2) button')
            .waitForElementVisible("#intro-popover")

            .click("#intro-popover .close")
            .waitForElementNotPresent("#intro-popover")
            .waitForElementNotPresent("#intro-visibleOverlay")
    },

    'switching to sql mode automatically shows no messageModal after clicking dont show in developer mode': function(browser) {
        browser
            .pause(2000)
            .waitForElementNotVisible("#messageModal")
    },

    'switching to developer mode after clicking dont show again shows no messageModal': function(browser) {
        browser
            .pause(2000)
            .waitForElementNotVisible("#messageModal")
    },
}