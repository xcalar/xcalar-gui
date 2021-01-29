const EventEmitter = require('events');

class TooltipTest extends EventEmitter {
    command(highlightedElement, elementToClick, doubleClick) {
        const toClick = elementToClick || "#intro-popover .next";

        this.api.pause(1000);
        this.api.assert.cssClassPresent(highlightedElement, "intro-highlightedElement");
        doubleClick ?
            this.api.moveToElement(toClick, undefined, undefined).doubleClick() :
            this.api.click(toClick);

        this.emit('complete');
        return this;
    }
}

module.exports = TooltipTest;