const EventEmitter = require('events');

class ConfirmAlert extends EventEmitter {
    command() {
        this.api.isVisible("#alertModal", results => {
            if (results.value) { // close alert modal if visible
                this.api
                    .waitForElementVisible("#alertModal #alertActions button.confirm")
                    .click("#alertModal #alertActions button.confirm")
            }
            this.api
                .waitForElementNotVisible("#modalBackground", 10 * 1000)
                .pause(1000);

            this.emit('complete');
        });

        return this;
    }
}

module.exports = ConfirmAlert;