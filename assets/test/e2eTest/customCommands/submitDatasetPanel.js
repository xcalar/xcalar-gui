const EventEmitter = require('events');

class SubmitDatasetPanel extends EventEmitter {
    command(_b) {
        this.api.isVisible("#datasetOpPanel .modalTopMain", results => {
            if (results.value) {
                /* is visible */
            } else {
                this.api.click("#datasetOpPanel .bottomSection .switch");
            }

            this.api.waitForElementVisible("#datasetOpPanel .modalTopMain", 1000)
            .click("#datasetOpPanel .next")
            .waitForElementVisible("#datasetOpPanel .listSection .name")
            .click("#datasetOpPanel .submit")
            .waitForElementNotVisible("#datasetOpPanel", 2000);

            this.api.isVisible("#alertModal", results => {
                if (results.value) {
                    /* is visible */
                    this.api.click("#alertModal .cancel");
                    this.api.pause(1000);
                }
                this.emit("complete");
            });
        });

        return this;
    }
}

module.exports = SubmitDatasetPanel;