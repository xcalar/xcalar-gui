const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class AddSQLNode extends EventEmitter {
    command(testConfig, nodes, testDatasetId, cb) {
        const self = this;
        const node = {
            "type": "sql",
            "subType": null
        };

        let nodeCategoryClass = '';
        let nodeCategorySelector = '';
        this.api.execute(execFunctions.getNodeFromCategoryBar, [node], ({value}) => {
            nodeCategoryClass = value.categoryClass;
            nodeCategorySelector = value.nodeSelector;
        });

        let sqlNodeId;
        // Select the operation category
        this.api.perform(() => {
            self.api
                .execute(execFunctions.scrollIntoView, [".category." + nodeCategoryClass], () => {})
                .moveToElement(".category." + nodeCategoryClass, 1, 1)
                .mouseButtonDown("left");

            // create and configure the new sql node
            self.api.newNode(
                nodeCategorySelector + ' .main', 320, 220,
                ({ELEMENT, nodeId}) => {
                    sqlNodeId = nodeId;

                    let nodeToTest = nodes.find((node) => {
                        return node.title === testConfig.finalNodeName;
                    });
                    self.api.connectAndConfigSQLNode(nodeToTest.nodeId, testDatasetId, sqlNodeId);

                    self.api.perform(() => {
                        if (cb) {
                            cb(sqlNodeId);
                        }
                    });
                }
            );
        });


        this.emit('complete');
        return this;
    }
}

module.exports = AddSQLNode;