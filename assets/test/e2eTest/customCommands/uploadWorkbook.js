const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class UploadWorkbook extends EventEmitter {
    command(fileName, isUpgrade,  cb) {
        const self = this;
        let extension;
        if (isUpgrade) {
            extension = ".tar.gz";
        } else {
            extension = '.xlrwb.tar.gz';
        }
        let path = require('path').resolve(__dirname + '/../../../dev/e2eTest/workbooks/'
        + fileName + extension);
        console.log("uploading workbook " + path);
        let numStartWorkbooks = -1;
        let numEndWorkbooks = -1;
        this.api.execute(execFunctions.getNumElements, [".workbookBox"], (result) => {
            numStartWorkbooks = result.value;
        });

        // upload workbook
        this.api.perform(() => {
            this.api
            .ensureHomeScreenOpen()
            .setValue('input#WKBK_uploads', path);
            this.api.execute(execFunctions.getNumElements, [".workbookBox"], (result) => {
                numEndWorkbooks = result.value;
            });
        });

        this.api.perform(() => {
            if (numEndWorkbooks !== (numStartWorkbooks + 1)) {
                console.log("workbook upload had an issue", numEndWorkbooks, numStartWorkbooks);
                this.api.execute(execFunctions.getText, ["#alertModal .content"], result => {
                    console.log("alertModal text: " + result.value);
                })
                .execute(execFunctions.getText, ["#statusBox"], result => {
                    console.log("status box text: " + result.value);
                })
                .getLog('browser', function(logEntriesArray) {
                    if (logEntriesArray.length) {
                      console.log('Log length: ' + logEntriesArray.length);
                      logEntriesArray.forEach(function(log) {
                        console.log(
                          '[' + log.level + '] ' + log.timestamp + ' : ' + log.message
                        );
                      });
                    }
                });
            } else {
                console.log("workbook is succesfully uploading");
            }
        });

        this.api.perform(() => {
            this.api.waitForElementVisible('.workbookBox.noResource .name input', 2 * 60 * 1000);

            this.api.execute(execFunctions.getFinalWorkbookName, [], (result) => {
                console.log("workbook name: " + result.value);
                self.api.globals.finalWorkbookName = result.value;
            });
        });


        this.emit('complete');

        return this;
    }
}

module.exports = UploadWorkbook;