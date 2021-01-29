module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Dataflow-3',
        validation: [
            {dfName: 'DF Test(result)', nodeName: 'validation1'}
        ]
    },
    ["workbook replay3", "dataflowTest3", "allTestsSkipped"]
);