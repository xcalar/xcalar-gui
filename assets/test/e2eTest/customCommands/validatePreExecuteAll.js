const EventEmitter = require('events');

class ValidatePreExecuteAll extends EventEmitter {
    command(nodes, _cb) {
        const self = this;
        this.api
        .elements('css selector','.dataflowArea.active .operator.state-Configured', function (result) {
            self.api.assert.ok(result.value.length > 0);
        })
        .elements('css selector','.dataflowArea.active .operator.state-Complete', function (result) {
            self.api.assert.ok(result.value.length < nodes.length);
        })
        this.emit('complete');
        return this;
    }
}

module.exports = ValidatePreExecuteAll;