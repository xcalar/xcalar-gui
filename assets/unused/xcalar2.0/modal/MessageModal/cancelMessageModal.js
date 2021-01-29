const EventEmitter = require('events');

class CancelMessageModal extends EventEmitter {
    command() {
        this.api.isVisible("#messageModal", results => {
            if (results.value) {
                this.api
                .click("#messageModal .close")
            }
            this.api
            .waitForElementNotVisible("#modalBackground")

            this.emit('complete');
        });

        return this;
    }
}

module.exports = CancelMessageModal;