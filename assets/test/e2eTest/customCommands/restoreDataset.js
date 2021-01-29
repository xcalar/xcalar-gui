const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class RestoreDataset extends EventEmitter {
    command(selector, cb) {
        const commandResult = {datasetId: null};

        this.api
            .moveToElement(selector, 0, 10)
            .mouseButtonClick('right')
            .waitForElementVisible("#dagNodeMenu", 1000);
        let needRestore = false;
        this.api.isVisible("#dagNodeMenu li.restoreSource", (result) => {
            needRestore = result.value;
        });
        this.api.perform(() => {
            throw "this test restoreDataset is broken"
            let datasetId = "";
            if (needRestore) {
                console.log("restoring dataset");
                this.api.execute(execFunctions.scrollIntoView, ["#dagNodeMenu li.restoreSource"], () => {})
                this.api.moveToElement("#dagNodeMenu li.restoreSource", 10, 1)
                    .mouseButtonClick('left')
                    .waitForElementVisible("#dsListSection")
                    .pause(1000)
                    .execute(execFunctions.getRestoredDatasetId, [], (result) => {
                        datasetId = result.value;
                        commandResult.datasetId = datasetId;
                        this.api.moveToElement(`#dsListSection .grid-unit[data-dsid="${datasetId}"]`, 10, 10)
                        .mouseButtonClick('left')
                        // .saveScreenshot("nw1.png")
                        .waitForElementVisible('#dsTableContainer .datasetTable', 100000)
                        .moveToElement('#resourcesTab', 1, 1)
                        .mouseButtonClick('left');
                        if (cb) {
                            cb(commandResult);
                        }
                        this.emit('complete');
                    });
            } else {
                if (cb) {
                    cb(commandResult);
                }
                this.emit('complete');
            }
        });

        return this;
    }
}

module.exports = RestoreDataset;