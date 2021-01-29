const EventEmitter = require('events');

class ActivateWorkbook extends EventEmitter {
    command(workbookSelector) {
        this.api
            .pause(2000)
            .click("#workbookPanel") // produce a needed blur on the workbook input
            .click(workbookSelector || ".workbookBox:first-child .name.activate")
            .pause(500)
            .confirmAlert()
            .pause(2000)
            .waitForElementNotVisible("#initialLoadScreen", 5 * 60 * 1000)
            .pause(3000);

        this.emit('complete');
        return this;
    }
}

module.exports = ActivateWorkbook;