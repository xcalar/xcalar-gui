const EventEmitter = require('events');

class CreateNewWorkbook extends EventEmitter {
    command() {
        const self = this;
        let beforeWorkbooks;
        let afterWorkbooks;
        this.api.elements('css selector', '.workbookBox' ,function(result) {
            beforeWorkbooks = result.value.length
            self.api
                .waitForElementVisible('#createWKBKbtn')
                .click('#createWKBKbtn')
                .waitForElementVisible('.lastCreate', 10 * 1000)

                self.api.elements('css selector', '.workbookBox' ,function(result) {
                    afterWorkbooks = result.value.length
                    self.api.assert.equal(beforeWorkbooks + 1, afterWorkbooks)
                });
        });
        this.emit('complete');
        return this;
    }
}

module.exports = CreateNewWorkbook;