const EventEmitter = require('events');

class UploadAndEnterWorkbook extends EventEmitter {
    command(workbookName, isUpgrade) {
        this.api.isVisible("#homeScreen", results => {
            if (results.value) {
                this.api.click("#notebookScreenBtn");
            }

            this.api
            .cancelTooltipWalkthrough()
            .waitForElementNotVisible("#initialLoadScreen", 2 * 60 * 1000)
            .waitForElementNotVisible("#modalBackground", 10 * 1000)
            .uploadWorkbook(workbookName, isUpgrade)
            .waitForWorkbookReady()
            .activateDataflowWorkbook(isUpgrade)
            this.emit('complete');
        });

        return this;
    }
}

module.exports = UploadAndEnterWorkbook;