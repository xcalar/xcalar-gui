module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Empty-Project',
        validation: [
            {dfName: 'DF Test (result)', nodeName: 'validation1'}
        ]
    },
    ["empty project dataflow replay", "dataflowEmptyProjectTest", "allTestsSkipped"]
);