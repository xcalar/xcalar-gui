const EventEmitter = require('events');

class WaitWorkbookReady extends EventEmitter {
    command(_b) {
        this.api.isVisible("#alertModal", results => {
            if (results.value) {
                /* is visible */
                this.api.click("#alertModal .cancel");
                this.api.pause(1000)
            } else {
            }

            this.emit("complete");
        });

        return this;
    }
}

module.exports = WaitWorkbookReady;