
module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Dataflow-Join',
        validation: [
            {dfName: 'DF Test (result)', nodeName: 'validation1'}
        ]
    },
    ["join dataflow replay", "dataflowTest1", "allTests"]
);