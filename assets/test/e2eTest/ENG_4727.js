module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_4727',
       validation: [
		  {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["nanTest", "allTests"]
);