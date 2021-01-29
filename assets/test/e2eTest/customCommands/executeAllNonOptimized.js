const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class ExecuteAllNonOptimized extends EventEmitter {
    command(time, cb) {
        this.api.execute(execFunctions.executeAllNonOptimized);
        this.api.waitForElementPresent(".dataflowArea.active.locked")
        .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000);

        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteAllNonOptimized;