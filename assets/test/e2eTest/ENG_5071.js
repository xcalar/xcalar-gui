module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_5071',
       validation: [
		  {dfName: 'Dataflow 5', nodeName: 'finalnode'}
       ]
   },
   ["dedupingTest", "allTestsSkipped"]
);