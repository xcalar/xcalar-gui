const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
exports.testSuite = function(GetQueryService) {
     describe("GetQueryService test: ", function () {
        it("getAggregate should work", function () {
            try {
                const queryStr = GetQueryService.getAggregate("source", "dest", "max(col)");
                expect(queryStr).to.equal('{"operation":"XcalarApiAggregate","args":{"source":"source","dest":"dest","eval":[{"evalString":"max(col)","newField":""}]}}');
            } catch(err) {
                console.log("getAggregate should return a string");
                expect.fail(err);
            }
        });

        it("getIndex should work", function () {
            try {
                const queryStr = GetQueryService.getIndex("t1", "t2", [{name: "col", type: proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_INT64, ordering: proto.xcalar.compute.localtypes.XcalarEnumType.XcalarOrdering.XCALAR_ORDERING_ASCENDING}], "prefix", "someName", false, true);
                expect(queryStr).to.equal('{"operation":"XcalarApiIndex","args":{"source":"t1","dest":"t2","prefix":"prefix","dhtName":"someName","delaySort":false,"broadcast":true,"key":[{"name":"col","type":"DfInt64","keyFieldName":"","ordering":"Ascending"}]}}');
            } catch(err) {
                console.log("getIndex should return a string");
                expect.fail(err);
            }
        });

        it("getProject should work", function () {
            try {
                const queryStr = GetQueryService.getProject("t1","t2",["col1","col2","col3"]);
                expect(queryStr).to.equal('{"operation":"XcalarApiProject","args":{"source":"t1","dest":"t2","columns":["col1","col2","col3"]}}');
            } catch(err) {
                console.log("getProject should return a string");
                expect.fail(err);
            }
        });

        it("getGetRowNum should work", function () {
            try {
                const queryStr = GetQueryService.getGetRowNum("t1","t2","newCOLUMN");
                expect(queryStr).to.equal('{"operation":"XcalarApiGetRowNum","args":{"source":"t1","dest":"t2","newField":"newCOLUMN"}}');
            } catch(err) {
                console.log("getGetRowNum should return a string");
                expect.fail(err);
            }
        });

        it("getFilter should work", function () {
            try {
                const queryStr = GetQueryService.getFilter("t1","t2","eq(col1,1)");
                expect(queryStr).to.equal('{"operation":"XcalarApiFilter","args":{"source":"t1","dest":"t2","eval":[{"evalString":"eq(col1,1)","newField":""}]}}');
            } catch(err) {
                console.log("getFilter should return a string");
                expect.fail(err);
            }
        });

        it("getJoin should work", function () {
            try {
                const queryStr = GetQueryService.getJoin(["t1","t3"],"t2",proto.xcalar.compute.localtypes.XcalarEnumType.JoinOperator.INNER_JOIN,[[{sourceColumn:"c1",destColumn:"c2",columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_INT64}],[{sourceColumn:"c4",destColumn:"c6",columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_STRING}]],"gt(c1,c4)", true);
                expect(queryStr).to.equal('{"operation":"XcalarApiJoin","args":{"dest":"t2","joinType":"innerJoin","evalString":"gt(c1,c4)","keepAllColumns":true,"source":["t1","t3"],"columns":[[{"sourceColumn":"c1","destColumn":"c2","columnType":"DfInt64"}],[{"sourceColumn":"c4","destColumn":"c6","columnType":"DfString"}]]}}');
            } catch(err) {
                console.log("getJoin should return a string");
                expect.fail(err);
            }
        });

        it("getMap should work", function () {
            try {
                const queryStr = GetQueryService.getMap("t1","t2",[{evalString: "add(1,2)",newField:"c1"},{evalString: "add(4,2)",newField:"c2"}], true);
                expect(queryStr).to.equal('{"operation":"XcalarApiMap","args":{"source":"t1","dest":"t2","icv":true,"evals":[{"evalString":"add(1,2)","newField":"c1"},{"evalString":"add(4,2)","newField":"c2"}]}}');
            } catch(err) {
                console.log("getMap should return a string");
                expect.fail(err);
            }
        });

        it("getGroupBy should work", function () {
            try {
                const queryStr = GetQueryService.getGroupBy("t1","t2",[{evalString: "sum(1)",newField:"c1"},{evalString: "avgNumeric(col)",newField:"c2"}], "someName",false,false,true);
                expect(queryStr).to.equal('{"operation":"XcalarApiGroupBy","args":{"source":"t1","dest":"t2","newKeyField":"someName","includeSample":false,"icv":false,"groupAll":true,"evals":[{"evalString":"sum(1)","newField":"c1"},{"evalString":"avgNumeric(col)","newField":"c2"}]}}');
            } catch(err) {
                console.log("getGroupBy should return a string");
                expect.fail(err);
            }
        });

        it("getUnion should work", function () {
            try {
                const queryStr = GetQueryService.getUnion(["t1","t3"],"t2",proto.xcalar.compute.localtypes.XcalarEnumType.UnionOperator.UNION_INTERSECT,[[{sourceColumn:"c1",destColumn:"c2",columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_BOOLEAN}],[{sourceColumn:"c4",destColumn:"c6",columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_INT64}]],true);
                expect(queryStr).to.equal('{"operation":"XcalarApiUnion","args":{"dest":"t2","dedup":true,"unionType":"unionIntersect","source":["t1","t3"],"columns":[[{"sourceColumn":"c1","destColumn":"c2","columnType":"DfBoolean"}],[{"sourceColumn":"c4","destColumn":"c6","columnType":"DfInt64"}]]}}');
            } catch(err) {
                console.log("getUnion should return a string");
                expect.fail(err);
            }
        });

        it("getBulkLoad should work", function () {
            try {
                const queryStr = GetQueryService.getBulkLoad("dataset",{sourceArgsList:[{targetName:"tName",path:"/a/b/c",fileNamePattern:"*",recursive: true}],parseArgs:{parserFnName:"pName",parserArgJson:"json",fileNameFieldName:"FNFN",recordNumFieldName:"RNFN",allowRecordErrors:true,allowFileErrors:false,schema:[{sourceColumn:"s",destColumn:"d",columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_INT64}]},size:9},"NodeId");
                expect(queryStr).to.equal('{"operation":"XcalarApiBulkLoad","args":{"dest":"dataset","loadArgs":{"parseArgs":{"parserFnName":"pName","parserArgJson":"json","fileNameFieldName":"FNFN","recordNumFieldName":"RNFN","allowRecordErrors":true,"allowFileErrors":false,"schema":[{"sourceColumn":"s","destColumn":"d","columnType":"DfInt64"}]},"size":9,"sourceArgsList":[{"targetName":"tName","path":"/a/b/c","fileNamePattern":"*","recursive":true}]},"dagNodeId":"NodeId"}}');
            } catch(err) {
                console.log("getBulkLoad should return a string");
                expect.fail(err);
            }
        });

        it("getExport should work", function () {
            try {
                const queryStr = GetQueryService.getExport("t1","target",[{columnName:"col",headerName:"test"}],"driver","p");
                expect(queryStr).to.equal('{"operation":"XcalarApiExport","args":{"source":"t1","dest":"target","driverName":"driver","driverParams":"p","columns":[{"columnName":"col","headerName":"test"}]}}');
            } catch(err) {
                console.log("getExport should return a string");
                expect.fail(err);
            }
        });

        it("getDeleteObjects should work", function () {
            try {
                const queryStr = GetQueryService.getDeleteObjects("*","table",true);
                expect(queryStr).to.equal('{"operation":"XcalarApiDeleteObjects","args":{"namePattern":"*","deleteCompletely":true}}');
            } catch(err) {
                console.log("getDeleteObjects should return a string");
                expect.fail(err);
            }
        });

        it("getRenameNode should work", function () {
            try {
                const queryStr = GetQueryService.getRenameNode("a","b");
                expect(queryStr).to.equal('{"operation":"XcalarApiRenameNode","args":{"oldName":"a","newName":"b"}}');
            } catch(err) {
                console.log("getRenameNode should return a string");
                expect.fail(err);
            }
        });

        it("getSynthesize should work", function () {
            try {
                const queryStr = GetQueryService.getSynthesize("t1","t2",[{destColumn:"col1"},{columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_MONEY},{sourceColumn:"col3"}],true);
                expect(queryStr).to.equal('{"operation":"XcalarApiSynthesize","args":{"source":"t1","dest":"t2","sameSession":true,"columns":[{"sourceColumn":"","destColumn":"col1","columnType":"DfUnknown"},{"sourceColumn":"","destColumn":"","columnType":"DfMoney"},{"sourceColumn":"col3","destColumn":"","columnType":"DfUnknown"}]}}');
            } catch(err) {
                console.log("getSynthesize should return a string");
                expect.fail(err);
            }
        });

        it("getSelect should work", function () {
            try {
                const queryStr = GetQueryService.getSelect("t1","t2",0,-1,{Filter:"gt(c1,c2)", Maps:[{evalString:"asdf", newField:"newf"}],GroupByKeys:["gbcol"],GroupBys:[{func:"max",arg:"col",newField:"newf2"}]},[{destColumn:"col1"},{columnType:proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType.DF_STRING},{sourceColumn:"col3"}],true);
                expect(queryStr).to.equal('{"operation":"XcalarApiSelect","args":{"source":"t1","dest":"t2","minBatchId":0,"maxBatchId":-1,"eval":{"Maps":[{"evalString":"asdf","newField":"newf"}],"Filter":"gt(c1,c2)","GroupByKeys":["gbcol"],"GroupBys":[{"func":"max","arg":"col","newField":"newf2"}]},"limitRows":true,"columns":[{"sourceColumn":"","destColumn":"col1","columnType":"DfUnknown"},{"sourceColumn":"","destColumn":"","columnType":"DfString"},{"sourceColumn":"col3","destColumn":"","columnType":"DfUnknown"}]}}');
            } catch(err) {
                console.log("getSelect should return a string");
                expect.fail(err);
            }
        });
    });
}