const execFunctions = require('./lib/execFunctions');

module.exports = {
    '@tags': ["login", "allTests"],
    'Simple login page test': function (browser) {
        browser
            .url(`${browser.globals.launchUrl}assets/htmlFiles/login.html`)
            .execute(execFunctions.enableLogin, [], ()=>{})
            .waitForElementVisible("#loginButton", 20 * 1000)
            .click("#loginButton")
            .waitForElementVisible("#statusBox")
            .assert.containsText("#statusBox", "Please fill out this field.");
    }
};
