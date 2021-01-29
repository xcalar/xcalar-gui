const testConfig = require("./cloudConfig.js")
const waitTime = testConfig.waitTime;
const pauseTime = testConfig.pauseTime;
const progressWaitTimeMax = testConfig.progressWaitTimeMax;
module.exports = {
    "@tags": ["Cloud Deployment Test"],

    "visit log in page": function(browser) {
        browser
            .url(testConfig.loginURL)
            .waitForElementVisible('#loginTitle', waitTime)
            .pause(pauseTime)
        
        browser.expect.element("#loginNameBox").to.be.visible
        browser.expect.element("#loginPasswordBox").to.be.visible;
    },

    "login": function(browser) {
        browser
            .setValue("input#loginNameBox", testConfig.userName)
            .setValue("input#loginPasswordBox", testConfig.password)
            .click("#loginButton")
            .waitForElementVisible("#clusterForm", waitTime);
    },

    "select cluster size": function(browser) {
        browser
            .click("#clusterForm .choice:first-child .radio")
            .pause(pauseTime);
        
        browser.expect.element("#clusterForm .choice:first-child.active").to.be.visible;
    },

    "deploy": function(browser) {
        browser
            .click("#deployBtn")
            .waitForElementVisible("#loadingForm", waitTime)
            .waitForElementNotVisible("#loginContainer", progressWaitTimeMax)
            .pause(pauseTime);
        
        browser.expect.element("#homeBtn").to.be.visible;
    },

    "XD be responsive": function(browser) {
        browser
            .waitForElementNotVisible("#initialLoadScreen", waitTime)
            .waitForElementNotVisible("#alertModal", waitTime)
            .pause(pauseTime)
            .waitForElementNotVisible("#initialLoadScreen", waitTime)
            .pause(pauseTime)
            .element("css selector", "#intro-popover", function(result){
                if (result.status != -1) {
                    // when element exist
                    browser.click("#intro-popover .close")
                    .pause(pauseTime);

                    browser.expect.element("#intro-popover").not.to.be.present;
                }
            });
    },

    "log out": function(browser) {
        browser
            .pause(pauseTime)
            .click("#userNameArea")
            .pause(pauseTime)
            .verify.visible("#logout")
            .moveToElement("#logout", 10, 1)
            .mouseButtonClick("left")
            .pause(pauseTime);

        browser.expect.element("#logoutModal").to.be.visible;
    },

    "stop cluster": function(browser) {
        browser
            .verify.visible("#logoutModal .radioButton:first-child.active")
            .click("#logoutModal .confirm")
            .waitForElementVisible("#loginTitle", progressWaitTimeMax);
    }
}