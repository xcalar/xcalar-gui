const EventEmitter = require('events');

class ActivateDataflowWorkbook extends EventEmitter {
    command(isUpgrade, workbookSelector) {
        this.api
            .activateWorkbook(workbookSelector)
            .cancelTooltipWalkthrough()
            .cancelAlert()

        if (isUpgrade) {
            this.api.waitForElementVisible("#dagListSection .dagListDetail .name", 2 * 60 * 1000)
            .click("#dagListSection .dagListDetail .name");

            this.api
            .waitForElementVisible('.dataflowArea:not(:first-child).active.rendered', 100000);
        } else {
            this.api
            .waitForElementVisible('.dataflowArea.active.rendered', 100000);
        }

        this.emit('complete');
        return this;
    }
}

module.exports = ActivateDataflowWorkbook;