const EventEmitter = require('events');

class RedoAll extends EventEmitter {
    command(testTabs, testTabMapping, cb) {
        // execute all nodes
        const browser = this.api;
          for (const tabName of Object.keys(testTabs)) {
            let numActions = 0;
            testTabs[tabName].nodes.forEach((node) => {
                node.parents.forEach((parent) => {
                    if (parent != null) {
                        numActions++; // action to remove connection
                    }
                });
                numActions++; // action to remove node
            });
            for (let i = 0; i < numActions; i++) {
                browser.waitForElementNotPresent("#redo.locked")
                browser.waitForElementNotPresent("#redo.disabled")
                       .click("#redo");
            }
        }

        for (const tabName of Object.keys(testTabs)) {
            const newTabName = testTabMapping.get(tabName);
            browser.switchTab(newTabName);
            browser.elements('css selector','.dataflowArea.active .operator', function (result) {
                browser.assert.ok(result.value.length > 0);
                browser.assert.ok(result.value.length === testTabs[tabName].nodes.length);
            });
        }
        this.emit('complete');
        return this;
    }
}

module.exports = RedoAll;