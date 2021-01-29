const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class RestoreIMDTable extends EventEmitter {
    command(selector, sourceName, cb) {

        this.api
            .moveToElement(selector, 0, 10)
            .mouseButtonClick("right")
            .waitForElementVisible("#dagNodeMenu", 1000);
        let needRestore = false;
        this.api.isVisible("#dagNodeMenu li.restoreSource", (result) => {
            needRestore = result.value;
        });

        this.api.perform(() => {
            if (needRestore) {
                console.log("restoring imdTable");
                this.api.execute(execFunctions.scrollIntoView, ["#dagNodeMenu li.restoreSource"], () => {})
                this.api
                    .moveToElement("#dagNodeMenu li.restoreSource", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementPresent('#dagListSection .table[data-name="' + sourceName + '"]', 1000 * 30);
                    if (cb) {
                        cb();
                    }
                    this.emit('complete');
            } else {
                if (cb) {
                    cb();
                }
                this.emit('complete');
            }
        });


        return this;
    }
}

module.exports = RestoreIMDTable;