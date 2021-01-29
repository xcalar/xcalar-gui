const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class RunSQLFunction extends EventEmitter {
    command(query, cb) {
        const self = this;
        const exec = execFunctions;
        this.api.execute(function(query) {
            const $allRecords = $(".historySection .body .row");
            for (let i = 0; i < $allRecords.length; i++) {
                const $row = $allRecords.eq(i);
                const queryStr = $row.find(".col-query").text();
                if (query.sql === queryStr) {
                    return i + 1;
                }
            }
        }, [query], ({value}) => {
            if (value == null) return;
            let childId;
            let parentId;
            // XXX this is broken in notebook
            self.api
                .click(".historySection .body .row .col-action .xi-search:nth-child(" + value + ")")
                .waitForElementVisible("#sqlDataflowArea .dataflowArea", 10000)
                .click("#sqlDataflowArea .analyze")
                .waitForElementVisible("#alertModal", 1000)
                .click("#alertModal .confirm")
                .waitForElementNotVisible("#initialLoadScreen", 600000)
                .click("#dagGraphBar .xi-setting")
                .execute(function() {
                    if ($("#userSettingsModal .dfAutoExecute .checkbox.checked").length > 0) {
                        $("#userSettingsModal .dfAutoExecute .checkbox.checked").click();
                    }
                })
                .click("#userSettingsModal .confirm")
                .pause(2000)
                .execute(function() {
                    const tabId = DagViewManager.Instance.getActiveDag().getTabId();
                    const dagTab = DagTabManager.Instance.getTabById(tabId);
                    const copiedNodes = dagTab.getGraph().getSortedNodes()
                                    .map((node) => node.getNodeCopyInfo(true));
                    return copiedNodes;
                }, [], ({value}) => {
                    // XXX the button is removed
                    self.api
                        .click("#tabSQLFuncButton")
                        .waitForElementVisible("#sqlFuncSettingModal", 1000)
                        .clearValue("#sqlFuncSettingModal .xc-input")
                        .setValue("#sqlFuncSettingModal .xc-input",
                                  Object.keys(query.sqlFuncInfo.tables).length)
                        .click("#sqlFuncSettingModal .confirm")
                        .execute(function(value) {
                            DagViewManager.Instance.getActiveDagView()
                                                   .pasteNodes(value);
                        }, [value]);
                })
                .getAttribute(".dataflowArea.active .SQLFuncOut",
                                "data-nodeid", ({value}) => {
                        childId = value;
                })
                .getAttribute(".dataflowArea.active .sort",
                                    "data-nodeid", ({value}) => {
                        parentId = value;
                })
                .perform(() => {
                    self.api
                        .execute(exec.connectNodes, [childId, parentId])
                        .execute(exec.openOpPanel, [childId])
                        .pause(1000)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", null, 20000)
                })
            let index = 1;
            for (const table in query.sqlFuncInfo.tables) {
                const input = {
                    "source": table.toUpperCase(),
                    "schema": query.sqlFuncInfo.tables[table]
                }
                if (table === "customer") {
                    self.api
                        .getAttribute(".dataflowArea.active .SQLFuncIn:nth-child(" +
                                    index + ")", "data-nodeid", ({value}) => {
                            parentId = value;
                            self.api
                                .execute(exec.openOpPanel, [parentId])
                                .pause(1000)
                                .submitAdvancedPanel(".opPanel:not(.xc-hidden)",
                                        JSON.stringify(input, null, 4), 20000)
                                .execute(function() {
                                    return $(".dataflowArea.active .filter:eq(0)")
                                                            .attr("data-nodeid");
                                }, [], ({value}) => {
                                    self.api
                                        .execute(exec.connectNodes,
                                                [value, parentId, 0]);
                                })
                                .execute(function() {
                                    return $(".dataflowArea.active .filter:eq(1)")
                                                            .attr("data-nodeid");
                                }, [], ({value}) => {
                                    self.api
                                        .execute(exec.connectNodes,
                                                [value, parentId, 0]);
                                });
                        });
                } else if (table === "orders") {
                    self.api
                        .getAttribute(".dataflowArea.active .SQLFuncIn:nth-child(" +
                                    index + ")", "data-nodeid", ({value}) => {
                            parentId = value;
                            self.api
                                .execute(exec.openOpPanel, [parentId])
                                .pause(1000)
                                .submitAdvancedPanel(".opPanel:not(.xc-hidden)",
                                        JSON.stringify(input, null, 4), 20000)
                                .execute(function() {
                                    return $(".dataflowArea.active .synthesize" +
                                    " [data-original-title='Columns: O_CUSTKEY']")
                                    .closest(".synthesize").attr("data-nodeid");
                                }, [], ({value}) => {
                                    self.api
                                        .execute(exec.connectNodes,
                                                [value, parentId, 0]);
                                });
                        });
                }
                index += 1;
            }
        });
        // self.api
        //     .click("#dagViewBar .xi-setting")
        //     .click("#dfSettingsModal .dfAutoExecute .checkbox")
        //     .click("#dfSettingsModal .confirm");
        // self.api
        //     .click("#modeArea")
        //     .pause(1000);
        this.emit('complete');
        return this;
    }
}

module.exports = RunSQLFunction;