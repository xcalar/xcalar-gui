module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest',
       workbook: 'ENG_5321',
       validation: [
		  {dfName: 'Dataflow 3', nodeName: 'finalnode'}
       ]
   },
   ["interactiveTest", "allTestsSkipped"]
);