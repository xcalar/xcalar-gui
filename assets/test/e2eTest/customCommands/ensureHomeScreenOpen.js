const EventEmitter = require('events');

class EnsureHomeScreenOpen extends EventEmitter {
    command() {
        this.api.isVisible('#workbookPanel', results => {
            if (results.value) {
                console.log("ensure home screen is open: Workbook Panel is visible");
                /* is visible */
            } else {
                this.api
                    .waitForElementNotVisible("#modalBackground", 30000)
                    .moveToElement("#projectTab", 0, 0)
                    .mouseButtonClick("left")
                    .waitForElementNotVisible("#modalBackground", 120000)
                    .waitForElementVisible("#workbookPanel", 120000);
                    console.log("Navigated to Workbook Panel");
            }
            this.emit('complete');
            return this;
        });
    }
}

module.exports = EnsureHomeScreenOpen;