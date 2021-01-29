module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_4841',
       validation: [
           {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["udfTest", "allTestsSkipped"]
);