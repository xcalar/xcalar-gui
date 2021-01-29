const EventEmitter = require('events');

class ConnectNodes extends EventEmitter {
    command(childNodeId, parentNodeId, index,  _cb) {
        if (index == null) {
            index = 0;
        }
        this.api
            .moveToElement('.dataflowArea.active .operator[data-nodeid="' + childNodeId + '"] .connector.in', 2, 2)
            .mouseButtonDown("left")
            .moveToElement('.dataflowArea.active .operator[data-nodeid="' + parentNodeId + '"]', 20, 10)
            .mouseButtonUp("left")
            .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                + `[data-childnodeid="${childNodeId}"]`
                + `[data-parentnodeid="${parentNodeId}"]`
                + `[data-connectorindex="${index}"]`,
                10);

        this.emit('complete');
        return this;
    }
}

module.exports = ConnectNodes;