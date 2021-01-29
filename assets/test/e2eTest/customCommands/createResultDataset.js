const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class CreateResultDataset extends EventEmitter {
    command(csvPath, cb) {
        let datasetNodeId;
        const node = {
                "type": "dataset",
                "subType": null,
                "display": {
                    "x": 100,
                    "y": 300
                },
                "description": "exportedDataset",
                "input": {
                    "source": this.api.globals.user + ".01359.testDataset",
                    "prefix": "testDataset",
                    "synthesize": false,
                    "loadArgs": `{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"${this.api.globals.user}.01359.testDataset\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"${csvPath}",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseCsv\",\n                \"parserArgJson\": \"{\\\"recordDelim\\\":\\\"\\\\r\\\\n\\\",\\\"fieldDelim\\\":\\\",\\\",\\\"isCRLF\\\":false,\\\"linesToSkip\\\":1,\\\"quoteDelim\\\":\\\"\\\\\\\"\\\",\\\"hasHeader\\\":true,\\\"schemaFile\\\":\\\"\\\",\\\"schemaMode\\\":\\\"loadInput\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n            \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}`
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "parents": [],
                "nodeId": "1"
        };

        this.api.execute(execFunctions.pasteNode, [[node]], (value) => {
            datasetNodeId = value.value[0];
        });
        this.api.perform(() => {
            this.api
                .restoreDataset('.dataflowArea.active .operator[data-nodeid="' + datasetNodeId + '"] .main')
                .openOpPanel('.operator[data-nodeid="' + datasetNodeId + '"] .main')
                .submitDatasetPanel();
        });
        this.api.perform(() => {
            if (cb) {
                cb(datasetNodeId);
            }
        })
        this.emit('complete');
        return datasetNodeId;
    }
}

module.exports = CreateResultDataset;