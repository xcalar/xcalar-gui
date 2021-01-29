const EventEmitter = require('events');

// used after a undo/redo to restore config
class ReconfigureNodes extends EventEmitter {
    command(nodeInfos, dfId, dfIdMapping, cb) {
        const self = this;
        const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

        nodeInfos.forEach((nodeInfo, i) => {
            // Re-configure the node
            this.api.perform(() => {
                const input = JSON.parse(JSON.stringify(nodeInfo.input));
                const pause = 1;
                // Preprocess the input structure
                if (nodeInfo.type === "dataset") {
                    input.schema = nodeInfo.schema;
                } else if (nodeInfo.type === "link in") {
                    const oldId = input.dataflowId === 'self'
                        ? dfId : input.dataflowId;
                    input.dataflowId = dfIdMapping.has(oldId)
                        ? dfIdMapping.get(oldId) : oldId;
                    input.schema = nodeInfo.schema;

                } else if (nodeInfo.type === "sql") {
                    input.sqlQueryString = input.sqlQueryStr;
                }

                // Config the node via opPanel
                if (nodeInfo.type === "dataset") {
                    // no need to reconfigure

                } else if (nodeInfo.type === "link out") {
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ") .main")
                        .pause(pause)
                        .clearValue("#dfLinkOutPanel .linkOutName .inputWrap input")
                        .setValue("#dfLinkOutPanel .linkOutName .inputWrap input", input.name)
                        .click('#dfLinkOutPanel .submit')
                        .waitForElementNotVisible('#dfLinkOutPanel');
                } else if (nodeInfo.type === "publishIMD") {
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ") .main")
                        .pause(pause)
                        .clearValue("#publishIMDOpPanel .IMDNameInput")
                        .setValue("#publishIMDOpPanel .IMDNameInput", input.pubTableName)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                        .executeNode(".operator:nth-child(" + (i + 1) + ") .main")
                } else if (nodeInfo.type !== "IMDTable" && nodeInfo.type !== "export") {
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ") .main")
                        .pause(pause)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
                }
            });

        });

        this.api.perform(() => {
            if (cb != null) {
                cb(commandResult);
            }
        });
        this.emit('complete');

        return this;
    }
}

module.exports = ReconfigureNodes;