module.exports = {
    '@tags': ["project browser test", "allTestsDisabled"],

    before: function(browser) {
        browser.globals.currentUsername = browser.globals.user;
        browser
            .url(browser.globals.buildTestUrl(browser, browser.globals.currentUsername))
            .waitForElementVisible('#container', 10 * 1000)
            .waitForElementNotVisible("#modalBackground", 2 * 60 * 1000)
            .cancelTooltipWalkthrough()
            .cancelAlert()
            .deleteWorkbook("tst", browser.globals.currentUsername)
            .deleteWorkbook("tst_1", browser.globals.currentUsername)
            .deleteWorkbook("mytst", browser.globals.currentUsername)
            .deleteWorkbook("tstUpload", browser.globals.currentUsername)
    },

    // after: function(browser) {
    //     browser.deleteFirstWorkbook();
    // },

    'should have top section with three main parts': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible(".topSection .welcomeBox")
            .waitForElementVisible(".topSection .tutBox")
            // .waitForElementVisible(".topSection .monitorBox")
    },

    'welcome box should have right contents': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .expect.element('#workbookPanel .welcomeBox .heading').text.to.equal(`Hello ${browser.globals.currentUsername}!`)
        browser
            .expect.element('#workbookPanel .welcomeBox .subHeading').text.to.equal(`Welcome to Xcalar Design`)
        browser
            .expect.element('#workbookPanel .welcomeBox .description').text.to.contain(`To get started with Xcalar Design,`)
    },

    'learning xcalar box should have right contents': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .expect.element('#workbookPanel .tutBox .subHeading').text.to.equal(`Learning Xcalar`)
        browser
            .expect.element('#workbookPanel .tutBox .helpText').text.to.equal(`Learn more about Xcalar Design`)
        browser
            .expect.element("#workbookPanel .tutBox .docsBtn").text.to.equal(`Xcalar Design Documentation`)
        browser
            .click("#workbookPanel .tutBox .docsBtn")
            .windowHandles(function (result) {
                handle = result.value[1];
                browser.switchWindow(handle);
            })
            .assert.urlContains('/assets/help/XD/Content/Home.htm')
            .waitForElementVisible(".main-text-section h1")
            .expect.element(".main-text-section h1").text.to.equal(`Welcome to Xcalar Design's online help`)
        browser
            .closeWindow()
            .windowHandles(function (result) {
                handle = result.value[0];
                browser.switchWindow(handle);
            })
            .waitForElementVisible('#workbookPanel')
            .expect.element("#workbookPanel .tutBox .tutorialBtn").text.to.equal(`Tutorials To Get You Started`)
        browser
            .click("#workbookPanel .tutBox .tutorialBtn")
            .waitForElementVisible("#helpPanel .topBar .title")
            .pause(5000)
            .expect.element("#helpPanel .topBar .title").text.to.equal(`HELP & SUPPORT: TUTORIALS`)
        browser
            .click("#projectTab")
            .waitForElementVisible('#workbookPanel')
            .expect.element("#workbookPanel .tutBox .tooltipBtn .tutText").text.to.equal(`Step-by-Step Walkthroughs`)
        browser
            .click("#workbookPanel .tutBox .tooltipBtn")
            .waitForElementVisible("#tooltipModal")
            .click("#tooltipModal .close")
            .waitForElementNotVisible("#tooltipModal")
            .waitForElementNotVisible("#modalBackground")
    },

    // 'monitor/news box should have right contents': function(browser) {
    //     browser
    //         .ensureHomeScreenOpen()
    //         .expect.element('#workbookPanel .monitorBox .section:nth-of-type(1) .subHeading').text.to.equal(`Monitor`)
    //     browser
    //         .expect.element('#workbookPanel .monitorBox .section:nth-of-type(1) .helpText a').text.to.equal(`Monitor the status of your Xcalar Cluster`)
    //     browser
    //         .click('#workbookPanel .monitorBox .section:nth-of-type(1) .helpText a')
    //         .pause(3000)
    //         .waitForElementVisible("#monitorPanel .topBar .title")
    //         .expect.element("#monitorPanel .topBar .title").text.to.equal(`SYSTEM: MONITOR`)
    //     browser
    //         .click("#projectTab")
    //         .waitForElementVisible('#workbookPanel')
    //         .expect.element("#workbookPanel .monitorBox .monitorBtn").text.to.equal(`Monitor Cluster Health`)
    //     browser
    //         .click("#workbookPanel .monitorBox .monitorBtn")
    //         .waitForElementVisible("#monitorPanel .topBar .title")
    //         .expect.element("#monitorPanel .topBar .title").text.to.equal(`SYSTEM: MONITOR`)
    //     browser
    //         .click("#projectTab")
    //         .waitForElementVisible('#workbookPanel')
    //         .expect.element('#workbookPanel .monitorBox .section:nth-of-type(2) .subHeading').text.to.equal(`News`)
    //     browser
    //         .expect.element('#workbookPanel .monitorBox .section:nth-of-type(2) .helpText a').text.to.equal(`View Xcalar's most recent announcements`)
    //     browser
    //         .click('#workbookPanel .monitorBox .section:nth-of-type(2) .helpText a')
    //         .windowHandles(function (result) {
    //             handle = result.value[1];
    //             browser.switchWindow(handle);
    //         })
    //         .assert.urlEquals(`https://xcalar.com/news/`)
    //         .waitForElementVisible("h1")
    //         .expect.element("h1").text.to.equal(`News`)
    //     browser
    //         .closeWindow()
    //         .windowHandles(function (result) {
    //             handle = result.value[0];
    //             browser.switchWindow(handle);
    //         })
    //         .waitForElementVisible('#workbookPanel')
    // },

    'should have new workbook section with new and upload sections': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible("#workbookPanel .actionSection")
        browser
            .expect.element('#workbookPanel .actionSection .btn-submit').text.to.equal(`Create New Project`)
        browser
            .expect.element('#workbookPanel .actionSection .btn-secondary').text.to.equal(`Upload`)
    },

    'should create new project': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .createNewWorkbook()
            .waitForElementVisible(".workbookBox.lastCreate input.focused")
            .keys('t')
            .keys('s')
            .keys('t')
            .click('.welcomeBox')
            .assert.value(".workbookBox.lastCreate input", "tst")
            .activateWorkbook('.lastCreate')
            // .waitForElementVisible("#modeArea", 30000)
            .cancelTooltipWalkthrough()
            // .click("#modeArea")
            // .cancelMessageModal()
            .waitForElementVisible(".dataflowWrapBackground button", 30000)
            .click('.dataflowWrapBackground button')
            .moveToElement('#dagView .operatorWrap .active .operator:nth-of-type(1)', undefined, undefined)
            .doubleClick()
            .waitForElementVisible(".dataflowArea.active rect.main", 20000)
            .click("#projectTab")
            .waitForElementVisible('#workbookPanel')
    },

    // TODO: add test for downloading  a project
    // Seems like there might be no way to do it in nightwatch
    // Brent proposed to dump project download to an invisible input and then check it

    // 'should download project': function(browser) {
    // },

    'should upload new project': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .uploadWorkbook('tstUpload')
            .waitForElementVisible('.workbookBox[data-workbook-id="' + browser.globals.currentUsername + '-wkbk-tstUpload"]', 30000)
            .activateWorkbook('.workbookBox[data-workbook-id="' + browser.globals.currentUsername + '-wkbk-tstUpload"]')
            .expect.element('#mainTopBar .wkbkName').text.to.equal(`tstUpload`)
        browser
            .elements('css selector', '.dataflowArea.active rect.main' ,function(result) {
                browser
                    .assert.equal(result.value.length, 1)
                    .expect.element('.dataflowArea.active text tspan').text.to.equal(`tstUploadNode`)
            })
            .ensureHomeScreenOpen()
            .assert.value('.workbookBox[data-workbook-id="' + browser.globals.currentUsername + '-wkbk-tstUpload"] input', "tstUpload")
            .deleteWorkbook("tstUpload", browser.globals.currentUsername)
    },

    'should duplicate project': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .elements('css selector', '.workbookBox' ,function(result) {
                beforeWorkbooks = result.value.length
                browser
                    .waitForElementVisible("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
                    .click("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
                    .waitForElementVisible("#wkbkMenu .duplicate")
                    .click("#wkbkMenu .duplicate")
                    .pause(5000)

                    browser.elements('css selector', '.workbookBox' ,function(result) {
                        afterWorkbooks = result.value.length
                        browser.assert.equal(beforeWorkbooks + 1, afterWorkbooks)
                    });
            })
            .assert.value("#workbookPanel .workbookBox:nth-of-type(3) .workbookName", "tst_1") // should be nth-of-type(2) ?
            .activateWorkbook('#workbookPanel .workbookBox:nth-of-type(3)')
            .waitForElementVisible(".dataflowArea.active rect.main", 20000)
            .elements('css selector', '.dataflowArea.active rect.main' ,function(result) {
                browser
                    .assert.equal(result.value.length, 1)
                    .expect.element('.dataflowArea.active text tspan').text.to.equal(`Node 1`)
            })
            .ensureHomeScreenOpen()
            .deleteWorkbook("tst_1", browser.globals.currentUsername)
    },

    'should open activated project on click': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .activateWorkbook('#workbookPanel .workbookBox.active')
    },

    'open project in new tab option is inactive if the project is open': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .pause(5000)
            .click("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .waitForElementVisible("#wkbkMenu .newTab")
            .assert.cssClassPresent('#wkbkMenu .newTab', 'inActive')
            .click('.welcomeBox')
            .waitForElementNotVisible("#wkbkMenu")
    },

    'should open project in new tab if project isn’t open': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .click("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .waitForElementVisible("#wkbkMenu .duplicate")
            .click("#wkbkMenu .duplicate")
            .pause(10000)
            .assert.value("#workbookPanel .workbookBox:nth-of-type(3) input", "tst_1")
            .waitForElementVisible("#workbookPanel .workbookBox:nth-of-type(3) i.dropDown")
            .pause(5000)
            .click("#workbookPanel .workbookBox:nth-of-type(3) i.dropDown")
            .waitForElementVisible("#wkbkMenu .newTab")
            .assert.cssClassNotPresent('#wkbkMenu .newTab', 'inActive')
            .click("#wkbkMenu .newTab")
            .confirmAlert()
            .windowHandles(function (result) {
                handle = result.value[1];
                browser.switchWindow(handle);
            })
            .url(function (response) {
                url = new URL(response.value)
                workbookName = url.searchParams.get("workbook")
                browser.assert.equal(workbookName, "tst_1")
            });
        browser
            .closeWindow()
            .windowHandles(function (result) {
                handle = result.value[0];
                browser.switchWindow(handle);
            })
            .waitForElementVisible('#workbookPanel')
    },

    'should open edit project modal': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .assert.value("#workbookPanel .workbookBox:nth-of-type(2) input", "tst")
            .waitForElementVisible("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .pause(5000)
            .click("#workbookPanel .workbookBox:nth-of-type(2) i.dropDown")
            .waitForElementVisible("#wkbkMenu .modify")
            .click("#wkbkMenu .modify")
            .waitForElementVisible("#workbookInfoModal")
            .expect.element('#workbookInfoModal header .text').text.to.equal(`Edit Project`)
        browser
            .expect.element('#workbookInfoModal .modalMain .name').text.to.equal(`Project Name`)
        browser
            .assert.value("#workbookInfoModal .modalMain .name input", "tst")
            .expect.element('#workbookInfoModal .modalMain .description').text.to.equal(`Project Description`)
        browser
            .assert.value("#workbookInfoModal .modalMain .description input", "")
            .waitForElementVisible("#workbookInfoModal .modalBottom button.confirm")
            .waitForElementVisible("#workbookInfoModal .modalBottom button.cancel")
    },

    // 'should save new project name and description': function(browser) {
    //     browser
    //         .keys('m')
    //         .keys('y')
    //         .keys('t')
    //         .keys('s')
    //         .keys('t')
    //         .click("#workbookInfoModal .modalBottom button.confirm")
    //         .waitForElementNotVisible("#modalBackground")
    //         .assert.value("#workbookPanel .workbookBox:nth-of-type(2) input", "mytst")
    // },

    // 'should deactivate and delete project': function(browser) {
    //     browser
    //         .deleteWorkbook('mytst', browser.globals.currentUsername);
    // },
}