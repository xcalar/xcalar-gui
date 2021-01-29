const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class ExecuteNode extends EventEmitter {
    command(selector, time, cb) {
        // execute all nodes
        this.api
            .execute(execFunctions.scrollIntoView, [".dataflowArea.active " + selector], () => {})
            .moveToElement(".dataflowArea.active " + selector, 30, 15)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000)
            .moveToElement("#dagNodeMenu li.executeNode", 10, 1)
            .waitForElementNotPresent(".dataflowArea.active.locked")
            .mouseButtonClick('left')
            .waitForElementPresent(".dataflowArea.active.locked", 20000)
            .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000)

        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteNode;