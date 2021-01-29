const EventEmitter = require('events');

class CancelTooltipWalkthrough extends EventEmitter {
    command() {
        this.api.isPresent("#intro-popover", (isPresent) => {
            if (isPresent) {// close intro popup if visible
                this.api.click("#intro-popover .close")
                this.api.waitForElementNotPresent("#intro-popover")
                this.api.waitForElementNotPresent("#intro-visibleOverlay")
            }

            this.emit('complete');
        });

        return this;
    }
}

module.exports = CancelTooltipWalkthrough;