module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_4912',
       validation: [
           {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["equikeyTest", "allTestsSkipped"]
);