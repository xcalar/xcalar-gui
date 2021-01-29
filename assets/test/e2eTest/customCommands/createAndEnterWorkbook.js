const EventEmitter = require('events');

class CreateAndEnterWorkbook extends EventEmitter {
    //TODO: to use workbookName param
    command(workbookName) {
        this.api
            .createNewWorkbook(workbookName)
            .activateWorkbook('.lastCreate.workbookBox .name.activate');

        this.emit('complete');
        return this;
    }
}

module.exports = CreateAndEnterWorkbook;