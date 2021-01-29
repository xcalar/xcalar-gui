const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class ExecuteAll extends EventEmitter {
    command(time, cb) {
        // execute all nodes
        this.api
        .moveToElement("#dagGraphBar .topButton.run .icon", 1, 1)
        .mouseButtonClick('left')
        .waitForElementPresent(".dataflowArea.active.locked")
        .execute(execFunctions.clearConsole, [], () => {})
        .waitForElementNotPresent(".dataflowArea.active.locked", time || 100000)
        // .getLog("browser", function(result){console.log(result)})
        .elements('css selector','.dataflowArea.active .operator.state-Running', (result) => {
            console.log("after unlock, should not have running nodes", result.value);
            if (result.value.length) {
                let found = false;
                this.api.getLog("browser", function(result){
                    result.forEach((log) => {
                        if (found) {
                            let message = log.message;
                            let index = message.indexOf("\"{\\");
                            if (index > -1) {
                                message = message.slice(index);
                            }
                            try {
                                message = JSON.parse(message);
                            } catch (e) {
                                console.log("did not parse querystateoutput correctly");
                            }
                            console.log(message);
                        }
                        if (log.message.includes("queryStateOutput error")) {
                            found = true;
                        }
                    });
                });
            }
        })
        .waitForElementNotPresent(".dataflowArea.active .operator.state-Running", 100000);
        this.emit('complete');
        return this;
    }
}

module.exports = ExecuteAll;