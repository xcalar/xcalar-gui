const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class DeleteFirstWorkbook extends EventEmitter {
    command() {
        const self = this;
        const user = this.api.globals.currentUsername || this.api.globals.user;

        this.api.ensureHomeScreenOpen();
        this.api.execute(execFunctions.getFirstWorkbookName, [], (result) => {
            self.api.deleteWorkbook(result.value, user);
        });

        this.emit('complete');
        return this;
    }
}

module.exports = DeleteFirstWorkbook;