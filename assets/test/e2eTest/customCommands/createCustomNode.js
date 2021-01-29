const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class CreateCustomNode extends EventEmitter {
    command(nodes) {
        console.log("Custom");
        console.log(nodes);
        this.api.execute(execFunctions.clearConsole, [], () => {});

        // Deselect any prior node:
        this.api
                .execute(execFunctions.scrollIntoView, ['.dataflowArea.active [data-nodeid="' + nodes[0] + '"]'], () => {})
                .moveToElement('.dataflowArea.active [data-nodeid="' + nodes[0] + '"]', 30, 15)
                .mouseButtonClick('left')
        // select each node
        this.api.keys([this.api.Keys.SHIFT]);
        nodes.forEach((id) => {
            this.api
                .execute(execFunctions.scrollIntoView, ['.dataflowArea.active [data-nodeid="' + id + '"]'], () => {})
                .moveToElement('.dataflowArea.active [data-nodeid="' + id + '"]', 30, 15)
                .mouseButtonClick('left')
        });
        this.api
            .keys([this.api.Keys.NULL])
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.createCustom", 10, 1)
            .mouseButtonClick('left');
        setTimeout(() => {
            this.api.elements('css selector','.dataflowArea.active .operator.category-custom', function (result) {
                console.log("custom node created: " + result.value.length);
            });
            this.emit('complete');
        }, 2000);

        return this;
    }
}

module.exports = CreateCustomNode;