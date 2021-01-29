/**
 * Testing for tutorial projects page in general:
 * can be open
 * has the right structure
 * has search bar
 * download button works
 */

module.exports = {
    '@tags': ["tutorial project general test", "allTestsDisabled"],

    before: function(browser) {
        browser
            .url(browser.globals.buildTestUrl(browser, browser.globals.user))
            .waitForElementVisible('#container', 10000)
            .cancelAlert()
            .cancelTooltipWalkthrough()
    },

    after: function(browser) {
        browser
            .deleteWorkbook(browser.globals.finalWorkbookName, browser.globals.user);
    },

    'tutorial project can be opened from learning Xcalar in Project Browser': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible(".tutBox .tutorialBtn")
            .click(".tutBox .tutorialBtn")
            .waitForElementVisible("#helpTopBar .title")
            .expect.element("#helpTopBar .title").text.to.equal(`HELP & SUPPORT: TUTORIALS`)
    },

    'tutorial project can be opened from top right user menu': function(browser) {
        browser
            .ensureHomeScreenOpen()
            .waitForElementVisible("#helpArea")
            .click("#helpArea")
            .waitForElementVisible("#helpAreaMenu .tutorials")
            .click("#helpAreaMenu .tutorials")
            .waitForElementVisible("#helpTopBar .title")
            .expect.element("#helpTopBar .title").text.to.equal(`HELP & SUPPORT: TUTORIALS`)
    },

    'tutorial project should have the right structure': function(browser) {
        browser
            .pause(3000)
            .waitForElementVisible("#help-tutorial .category")
            .elements('css selector', '#help-tutorial .category', function(result) {
                browser
                    .assert.ok(result.value.length > 1)
            })
            .expect.element("#help-tutorial .category").text.to.contain(`Category: `)
        browser
            .elements('css selector', '#help-tutorial .category .item', function(result) { // how to run for each category separately?
                browser
                    .assert.ok(result.value.length > 0)
            })
            .waitForElementVisible("#help-tutorial .category .item .icon")
            .waitForElementVisible("#help-tutorial .category .item .tutorialName")
            .waitForElementVisible("#help-tutorial .category .item .detail")
            .waitForElementVisible("#help-tutorial .category .item button.download")
            .expect.element("#help-tutorial .category .item button.download").text.to.equal(`Download`)
        browser
            .assert.cssClassNotPresent('#help-tutorial .category .item button.download', 'xc-disabled')
    },

    'tutorial project should have a search bar': function(browser) {
        browser
            .waitForElementVisible("#tutorial-search")
            .waitForElementVisible("#tutorial-search input[placeholder='Search for Tutorials...']")

        let beforeItems;
        let afterItems;
        browser.elements('css selector', '#help-tutorial .category .item' ,function(result) {
            beforeItems = result.value.length
            browser
                .click("#tutorial-search")
                .keys("a")
                .elements('css selector', '#help-tutorial .category .item' ,function(result) {
                    afterItems = result.value.length
                    browser.assert.ok(beforeItems > afterItems)
                })
                .keys("\uE003") // backspace
                .elements('css selector', '#help-tutorial .category .item' ,function(result) {
                    browser.assert.equal(beforeItems, result.value.length)
                })
        });
    },

    'first tutorial project can be downloaded and opened': function(browser) {
        browser
            .waitForElementVisible("#help-tutorial .category.Applications .item:first-of-type .tutorialName")
            .pause(3000)
            .waitForElementVisible("#help-tutorial .category.Applications .item:first-of-type button.download")
            .click("#help-tutorial .category.Applications .item:first-of-type button.download")
            .pause(10000)
            .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
            .pause(3000)
        browser
            .ensureHomeScreenOpen()
    }
};