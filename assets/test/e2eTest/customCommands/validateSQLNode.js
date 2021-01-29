const EventEmitter = require('events');

class ValidateSQLNode extends EventEmitter {
    command(nodeId, _cb) {
        let sqlNodeSelector;
        if (nodeId == null) {
            sqlNodeSelector = ".operator.sql"
        } else {
            sqlNodeSelector = '.operator[data-nodeid="' + nodeId + '"]'
        }
        const self = this;
        this.api
            .moveToElement(`.dataflowArea.active ${sqlNodeSelector} .main`, 10, 20)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagTableNodeMenu", 1000)
            .moveToElement("#dagTableNodeMenu li.viewResult", 10, 1)
            .mouseButtonClick('left')
            .waitForElementVisible('#sqlTableArea .totalRows', 20000)
            .getText('#sqlTableArea .totalRows', ({value}) => {
                self.api.assert.equal(value, "0");
            });
        this.emit('complete');
        return this;
    }
}

module.exports = ValidateSQLNode;