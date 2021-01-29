const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class NewNode extends EventEmitter {
    command(selector, x, y, cb) {
        const commandResult = { ELEMENT: null, nodeId: null };
        this.api
            .execute(execFunctions.getDagViewScroll, [], ({value: scroll}) => {
                this.api.execute(execFunctions.scrollIntoView, [selector], () => {})
                this.api.moveToElement(selector, 0, 10)
                    .mouseButtonDown("left")
                    .moveToElement('#dagView .dataflowMainArea',
                        x - scroll.left,
                        y - scroll.top
                    )
                    .mouseButtonUp("left");
                this.api
                    .waitForElementPresent('.dataflowArea.active .operator.selected', 10);

                    this.api.element(
                        'css selector',
                        '.dataflowArea.active .operator.selected',
                        (element) => {
                            commandResult.ELEMENT = element.value.ELEMENT;
                        }
                    )
                    .perform(() => {
                        this.api.elementIdAttribute(commandResult.ELEMENT, 'data-nodeid', ({value}) => {
                            commandResult.nodeId = value;
                        });
                    });
            });

        this.api.perform(() => {
            if (cb) {
                cb(commandResult);
            }
        })
        this.emit('complete');

        return this;
    }
}

module.exports = NewNode;