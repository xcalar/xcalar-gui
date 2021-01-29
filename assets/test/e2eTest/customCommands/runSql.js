const EventEmitter = require('events');

class RunSQL extends EventEmitter {
    command(sql, result, noRowCheck, cb) {
        const self = this;
        self.api
            .click("#resourcesTab")
            .execute(function(sql) {
                SQLEditorSpace.Instance.clearSQL();
                SQLEditorSpace.Instance.newSQL(sql);
            }, [sql])
            .click("#sqlEditorSpace .execute")
            .waitForElementVisible("#sqlTableArea", 600000)
            .execute(function(result, noRowCheck) {
                const $tableArea = $("#sqlTableArea").eq(0);
                for (let row in result) {
                    let answers = result[row];
                    if (row === "numOfRows") {
                        const numOfRows = $tableArea.find(".totalRows").text();
                        if (numOfRows !== answers) {
                            return false;
                        }
                    } else if (!noRowCheck) {
                        for (let i = 0; i < answers.length; i++) {
                            const col = "col" + (i + 1);
                            const res = $tableArea.find("." + row + " ." + col +
                                                        " .originalData").text();
                            if (typeof answers[i] === "number") {
                                if (Math.abs(answers[i].toFixed(2) -
                                    parseFloat(res).toFixed(2))
                                    .toFixed(2) > 0.01) {
                                    return false;
                                }
                            } else if (answers[i] === null) {
                                if (res !== "FNF") {
                                    return false;
                                }
                            } else {
                                if (answers[i] !== res) {
                                    return false;
                                }
                            }
                        }
                    }
                }
                return true;
            }, [result, noRowCheck], ({value}) => {
                if (value) {
                    self.api.expect(value).to.be.true;
                } else {
                    self.api.pause(60000)
                }
            });
        this.emit('complete');
        return this;
    }
}

module.exports = RunSQL;