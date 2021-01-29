const EventEmitter = require('events');

class ConnectAndConfigSQLNode extends EventEmitter {
    command(nodeToTestId, datasetNodeId, sqlNodeId, _cb) {
        let input = {
            "sqlQueryStr": "SELECT * FROM testResults EXCEPT SELECT * FROM correctResults\nUNION\nSELECT * FROM correctResults EXCEPT SELECT * FROM testResults",
            "identifiers": {
                "1": "testResults",
                "2": "correctResults"
            },
            "identifiersOrder": [
                1,
                2
            ],
            "dropAsYouGo": true
        };
        this.api.connectNodes(sqlNodeId, nodeToTestId);
        this.api.connectNodes(sqlNodeId, datasetNodeId, 1);

        this.api
        .openOpPanel('.operator[data-nodeid="' + sqlNodeId + '"] .main')
        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), 20000);

        this.emit('complete');
        return this;
    }
}

module.exports = ConnectAndConfigSQLNode;