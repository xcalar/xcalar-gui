const execFunctions = require('./lib/execFunctions');

module.exports = {
    '@tags': ["cloudLogin", "allTests"],
    'Simple cloud login page test': function (browser) {
        browser
            .url(`${browser.globals.launchUrl}cloudLogin/cloudLogin.html`)
            .waitForElementVisible("#loginButton", 20 * 1000)
            .click("#loginButton")
            .waitForElementVisible("#loginFormMessage")
            .assert.containsText("#loginFormMessage", "Fields missing or incomplete.");
    }
};
