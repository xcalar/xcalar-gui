module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Dataflow-2',
        validation: [
            {dfName: 'DF Test(result)', nodeName: 'validation1'},
            {dfName: 'DF Test(result)', nodeName: 'validation2'},
        ]
    },
    ["workbook replay2", "dataflowTest2", "allTests"]
);