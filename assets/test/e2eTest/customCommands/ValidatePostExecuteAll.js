const EventEmitter = require('events');

class ValidatePostExecuteAll extends EventEmitter {
    command(nodes, _cb) {
        const self = this;
        this.api
        .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
            self.api.assert.equal(result.value.length, 0);
        })
        .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
            self.api.assert.equal(result.value.length, nodes.length + 2); // original nodes + datasetNode + sqlNode
        });
        this.emit('complete');
        return this;
    }
}

module.exports = ValidatePostExecuteAll;