module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_5123',
       validation: [
		  {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["moneyJoinTest", "allTestsSkipped"]
);