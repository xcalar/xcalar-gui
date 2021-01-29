module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_4864',
       validation: [
           {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["predicatesTest", "allTestsSkipped"]
);