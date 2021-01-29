const EventEmitter = require('events');

class CancelAlert extends EventEmitter {
    command() {
        this.api.isVisible("#alertModal", results => {
            if (results.value) { // close alert modal if visible
                this.api
                    .click("#alertModal #alertHeader .close")
            }
            this.api
                .waitForElementNotVisible("#modalBackground", 10 * 1000)
                .pause(3000);

            this.emit('complete');
        });

        return this;
    }
}

module.exports = CancelAlert;