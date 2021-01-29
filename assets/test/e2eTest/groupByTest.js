module.exports = require('./baseReplayTestFast.js').replay(
   {
       user: 'dftest',
       workbook: 'GroupBy2',
       validation: [
		  {dfName: 'Dataflow 1 (result)', nodeName: 'finalnode'},
		  {dfName: 'distinct (result)', nodeName: 'finalnode'},
		  {dfName: 'joinback (result)', nodeName: 'finalnode'},
		  {dfName: 'distinct joinback (result)', nodeName: 'finalnode'},
		  {dfName: 'include sample (result)', nodeName: 'finalnode'},
		  {dfName: 'include sample distinct (result)', nodeName: 'finalnode'},
		  {dfName: 'cast (result)', nodeName: 'finalnode'},
       ]
   },
   ["groupByTest"]
);