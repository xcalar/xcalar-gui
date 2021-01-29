describe("SQL Compiler Test", function() {
    it("should get function name", function() {
        let output = SQLCompiler._getSparkExpression("test");
        expect(output).to.equal("test");
    });

    it("should get column type from node", function() {
        let node1 = {colType: "string"};
        let node2 = {};
        let type = SQLCompiler.getColType(node1);
        expect(type).to.equal("string");
        type = SQLCompiler.getColType(node2);
        expect(type).to.equal(undefined);
    });

    it("should get column type from string", function() {
        expect(SQLCompiler.getColTypeFromString({})).to.be.null;
        expect(SQLCompiler.getColTypeFromString("sql:test(a)")).to.equal("string");
        expect(SQLCompiler.getColTypeFromString("*cumeDist(col)")).to.equal("float");
        expect(SQLCompiler.getColTypeFromString("*rank(col)")).to.equal("int");
        expect(SQLCompiler.getColTypeFromString("abs(col)")).to.equal("float");
        expect(SQLCompiler.getColTypeFromString("*first(addNumeric(col1, col2))")).to.equal("money");
    });

    it("getCurrentName should work", function() {
        expect(SQLCompiler.getCurrentName({colName: "test"})).to.equal("test");
        expect(SQLCompiler.getCurrentName({colName: "test", rename: "test2"})).to.equal("test2");
    });

    it("convertSparkTypeToXcalarType should work", function() {
        expect(SQLCompiler.convertSparkTypeToXcalarType(1)).to.equal("string");
        expect(SQLCompiler.convertSparkTypeToXcalarType("decimal(10,2)")).to.equal("money");
        expect(SQLCompiler.convertSparkTypeToXcalarType("double")).to.equal("float");
        expect(SQLCompiler.convertSparkTypeToXcalarType("long")).to.equal("int");
        expect(SQLCompiler.convertSparkTypeToXcalarType("null")).to.equal("int");
        expect(SQLCompiler.convertSparkTypeToXcalarType("byte")).to.equal("int");
        expect(SQLCompiler.convertSparkTypeToXcalarType("boolean")).to.equal("bool");
        expect(SQLCompiler.convertSparkTypeToXcalarType("string")).to.equal("string");
        expect(SQLCompiler.convertSparkTypeToXcalarType("date")).to.equal("timestamp");
    });

    it("pushUpCols should work", function() {
        let node1 = {};
        SQLCompiler.pushUpCols(node1);
        expect(node1).to.deep.equal({});
        let node2 = {value: {class: "test"},
                     dupCols: {1: 1}};
        let node3 = {parent: node2,
                     usrCols: ["usr"],
                     xcCols: ["xc"],
                     sparkCols: ["spark"],
                     renamedCols: {0: "newname"},
                     orderCols: ["order"],
                     dupCols: {0: 1}};
        SQLCompiler.pushUpCols(node3);
        expect(node2.usrCols).to.deep.equal(["usr"]);
        expect(node2.xcCols).to.deep.equal(["xc"]);
        expect(node2.sparkCols).to.deep.equal(["spark"]);
        expect(node2.renamedCols).to.deep.equal({0: "newname"});
        expect(node2.orderCols).to.deep.equal(["order"]);
        expect(node2.dupCols).to.deep.equal({0: 1, 1: 1});
    });

    it("genTree should work", function() {
        let oldTreeNode = TreeNodeFactory.getGeneralNode;
        let oldPushUp = SQLCompiler.pushUpCols;
        let plan = "";
        let prefix = "";
        let parent = {};
        TreeNodeFactory.getGeneralNode = function(v, p) {
            plan = v;
            prefix = p;
            return {value: {class: "test", "num-children": 0}}
        }
        SQLCompiler.pushUpCols = function() {};
        let newNode = SQLCompiler.genTree(parent, ["testPlan"], "testPrefix");
        expect(plan).to.equal("testPlan");
        expect(prefix).to.equal("testPrefix");
        expect(newNode.parent).to.equal(parent);
        expect(newNode.value).to.deep.equal({class: "test", "num-children": 0});
        TreeNodeFactory.getGeneralNode = oldTreeNode;
        SQLCompiler.pushUpCols = oldPushUp;
    });

    it("getCli should work", function() {
        let node1 = {value: {class: "org.apache.spark.sql.catalyst.plans.logical.Aggregate"},
                     xcCli: '{"operation":"XcalarApiGroupBy","args":{"source":"sqlTable50851#t_1590635776030_4","dest":"sqlTable50851-GB#t_1590635776572_5","eval":[{"evalString":"count(1)","newField":"COUNT_1"}],"newKeyField":"","includeSample":false,"icv":false,"groupAll":true}},'};
        let node2 = {value: {class: "org.apache.spark.sql.catalyst.plans.logical.Project"},
                     xcCli: ""};
        let node3 = {value: {class: "org.apache.spark.sql.execution.LogicalRDD"}};
        let cliArray = [];
        node1.children = [node2];
        node2.children = [node3];
        node3.children = [];
        SQLCompiler.getCli(node1, cliArray);
        expect(cliArray).to.deep.equal(['{"operation":"XcalarApiGroupBy","args":{"source":"sqlTable50851#t_1590635776030_4","dest":"sqlTable50851-GB#t_1590635776572_5","eval":[{"evalString":"count(1)","newField":"COUNT_1"}],"newKeyField":"","includeSample":false,"icv":false,"groupAll":true}},']);
    });

    it("handleDupCols should work", function(done) {
        let oldGetId = xcHelper.getTableId;
        let oldMap = SQLSimulator.map;
        let str = "";
        let newColNames;
        xcHelper.getTableId = function() {
            return 1;
        }
        SQLSimulator.map = function(a, b, c) {
            str = a;
            newColNames = c;
            return PromiseHelper.resolve({
                newTableName: b + "test",
                cli: "testCli"
            })
        }
        let node = {
            "usrCols": [
                {
                    "colName": "R_REGIONKEY",
                    "colId": 43,
                    "colType": "int"
                }
            ],
            "xcCols": [],
            "sparkCols": [],
            "renamedCols": {},
            "orderCols": [],
            "dupCols": {
                "43": 1
            },
            "usedColIds": [],
            "newTableName": "sqlTable25935",
            "xcCli": "beforeTest,"
        };
        SQLCompiler.handleDupCols(node)
        .then(function () {
            expect(node.newTableName).to.equal("sqlTable25935test");
            expect(node.xcCli).to.equal("beforeTest,testCli");
            expect(node.usrCols.length).to.equal(2);
            expect(str).to.deep.equal(["int(R_REGIONKEY)"]);
            expect(newColNames).to.deep.equal(["R_REGIONKEY_1"]);
            xcHelper.getTableId = oldGetId;
            SQLSimulator.map = oldMap;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("resolveCollision should work", function() {
        let oldGetId = xcHelper.getTableId;
        xcHelper.getTableId = function() {
            return 1;
        }
        let leftCols = [
            {
                "colName": "R_REGIONKEY",
                "colId": 54,
                "colType": "int"
            },
            {
                "colName": "R_NAME",
                "colId": 55,
                "colType": "string"
            },
            {
                "colName": "R_COMMENT",
                "colId": 56,
                "colType": "string"
            }
        ];
        let rightCols = [
            {
                "colName": "R_REGIONKEY",
                "colId": 54,
                "colType": "int"
            },
            {
                "colName": "R_NAME",
                "colId": 61,
                "colType": "string",
                "rename": "R_NAME_1"
            },
            {
                "colName": "R_COMMENT",
                "colId": 62,
                "colType": "string"
            }
        ];
        let leftRename = [];
        let rightRename = [];
        let leftTableName = "notUsed";
        let RightTableName = "testTable";
        let newRenames = SQLCompiler.resolveCollision(leftCols, rightCols,
                leftRename, rightRename, leftTableName, RightTableName, true);
        expect(leftRename).to.deep.equal([{"orig":"R_REGIONKEY","new":"R_REGIONKEY","type":4},{"orig":"R_NAME","new":"R_NAME","type":1},{"orig":"R_COMMENT","new":"R_COMMENT","type":1}]);
        expect(rightRename).to.deep.equal([{"orig":"R_NAME_1","new":"R_NAME_1","type":1},{"orig":"R_COMMENT","new":"R_COMMENT_E1","type":1}]);
        expect(newRenames).to.deep.equal({62: "R_COMMENT_E1"});
        xcHelper.getTableId = oldGetId;
    });

    it("combineRenameMaps should work", function() {
        let map1 = {1: "test1-1", 2: "test1-2"};
        let map2 = {0: "test2-0", 1: "test2-1"};
        let retMap = SQLCompiler.combineRenameMaps([map1, map2]);
        expect(retMap["0"]).to.equal("test2-0");
        expect(retMap["1"]).to.equal("test2-1");
        expect(retMap["2"]).to.equal("test1-2");
        expect(retMap).to.equal(map1);
    });

    it("assertCheckCollision should work", function() {
        let oldAssert = SQLUtil.assert;
        let oldErrStr = SQLErrTStr.NameCollision;
        let val1 = true;
        let val2 = "";
        SQLUtil.assert = function(arg1, arg2) {
            val1 = arg1;
            val2 = arg2;
        }
        SQLErrTStr.NameCollision = "test";
        let cols = [{colName: "col1"}, {colName: "col1", rename: "col1_1"}];
        SQLCompiler.assertCheckCollision(cols);
        expect(val1).to.be.true;
        expect(val2).to.equal("");
        cols.push({colName: "col1"});
        SQLCompiler.assertCheckCollision(cols);
        expect(val1).to.be.false;
        expect(val2).to.equal("testcol1");
        val1 = true;
        val2 = "";
        cols[2].rename = "col1_1";
        SQLCompiler.assertCheckCollision(cols);
        expect(val1).to.be.false;
        expect(val2).to.equal("testcol1_1");
        SQLUtil.assert = oldAssert;
        SQLErrTStr.NameCollision = oldErrStr;
    });

    it("genSQLColumn should work", function() {
        let oldAssert = SQLUtil.assert;
        let oldClean = SQLCompiler.cleanseColName;
        let oldGetType = SQLCompiler.convertSparkTypeToXcalarType;
        let str = "";
        SQLUtil.assert = function(p1, p2) {
            if (p1) {
                str = str + p2 + "testTrue";
            } else {
                str = str + p2 + "testFalse";
            }
        };
        SQLCompiler.cleanseColName = function (a, b, c) {
            if (c) {
                return a + "true";
            } else {
                return a + "false";
            }
        }
        SQLCompiler.convertSparkTypeToXcalarType = function(input) {
            return input;
        }
        let value = {
            "class": "org.apache.spark.sql.catalyst.expressions.Alias",
            "name": "a",
            "exprId": {
                "id": 91
            },
            "dataType": "integer"
        };
        let options = {"renamedCols":{}};
        expect(SQLCompiler.genSQLColumn(value, options)).to.deep.equal({"colName":"afalse","colId":91,"rename":"atrue","colType":"integer"});
        SQLUtil.assert = oldAssert;
        SQLCompiler.cleanseColName = oldClean;
        SQLCompiler.convertSparkTypeToXcalarType = oldGetType;
    });

    it("deleteIdFromColInfo should work", function() {
        let cols = [
            {
                "colName": "R_REGIONKEY",
                "colId": 54,
                "colType": "int"
            },
            {
                "colName": "R_NAME",
                "colId": 55,
                "colType": "string",
                "rename": "R_NAME_RENAME"
            },
            {
                "colName": "R_COMMENT"
            }
        ];
        expect(SQLCompiler.deleteIdFromColInfo(cols)).to.deep.equal([{"colName":"R_REGIONKEY","colType":"int"},{"colName":"R_NAME_RENAME","colType":"string"},{"colName":"R_COMMENT","colType":undefined}]);
    });

    it("findColIds should work", function() {
        let node = {"value":{"class":"org.apache.spark.sql.catalyst.expressions.And"},"children":[{"value":{"class":"org.apache.spark.sql.catalyst.expressions.IsNotNull"},"children":[{"value":{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","exprId":{"id":103}},"children":[]}]},{"value":{"class":"org.apache.spark.sql.catalyst.expressions.EqualTo"},"children":[{"value":{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","exprId":{"id":104}},"children":[]},{"value":{"class":"org.apache.spark.sql.catalyst.expressions.Literal"},"children":[]}]}]};
        let colIds = [];
        SQLCompiler.findColIds(node, colIds);
        expect(colIds).to.deep.equal([104]);
    });

    it("extractUsedCols should work", function() {
        let oldGenTree = SQLCompiler.genTree;
        let oldFindId = SQLCompiler.findColIds;
        let input1 = "";
        let inputCond;
        let inputPrefix;
        SQLCompiler.genTree = function(a, b, c) {
            input1 = a;
            inputCond = b;
            inputPrefix = c;
            return "test";
        }
        SQLCompiler.findColIds = function(tree, ids) {
            ids.push(tree);
        }
        let node = {
            value: {
                condition: ["testCondition"]
            },
            usedColIds: [],
            tablePrefix: "testPrefix"
        }
        SQLCompiler.extractUsedCols(node);
        expect(input1).to.equal(undefined);
        expect(inputCond).to.deep.equal(["testCondition"]);
        expect(inputPrefix).to.equal("testPrefix");
        expect(node.usedColIds).to.deep.equal(["test"]);
        SQLCompiler.genTree = oldGenTree;
        SQLCompiler.findColIds = oldFindId;
    });

    it("trackRenamedUsedCols should work", function() {
        let node = {usedColIds:[181],value:{"class":"org.apache.spark.sql.catalyst.plans.logical.Project","projectList":[[{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","exprId":{"id":175}}],[{"class":"org.apache.spark.sql.catalyst.expressions.Alias","exprId":{"id":181}},{"class":"org.apache.spark.sql.catalyst.expressions.AttributeReference","exprId":{"id":176}}]]}};
        SQLCompiler.trackRenamedUsedCols(node);
        expect(node.usedColIds).to.deep.equal([181,176]);
    });

    it("prepareUsedColIds should work", function() {
        let oldExt = SQLCompiler.extractUsedCols;
        let oldTrRe = SQLCompiler.trackRenamedUsedCols;
        let flag = 0;
        SQLCompiler.extractUsedCols = function() {
            flag = 1;
        }
        SQLCompiler.trackRenamedUsedCols = function() {
            flag = -1;
        }
    
        let node = {"value":{"class":"org.apache.spark.sql.catalyst.plans.logical.Project"},"children":[{"value":{"class":"org.apache.spark.sql.catalyst.plans.logical.SomethingElse"},"children":[]}]};
        SQLCompiler.prepareUsedColIds(node);
        expect(flag).to.equal(-1);
        expect(node.usedColIds.length).to.equal(0);

        node = {"value":{"class":"org.apache.spark.sql.catalyst.plans.logical.Join"},"usedColIds":["test"],"children":[{"value":{"class":"org.apache.spark.sql.catalyst.plans.logical.SomethingElse"},"children":[]}]};
        SQLCompiler.prepareUsedColIds(node);
        expect(flag).to.equal(1);
        expect(node.usedColIds).to.deep.equal(["test"]);
        expect(node.children[0].usedColIds).to.deep.equal(["test"]);
    
        SQLCompiler.extractUsedCols = oldExt;
        SQLCompiler.trackRenamedUsedCols = oldTrRe;
    });

    it("getXcAggType should work", function() {
        let oldAssert = SQLUtil.assert;
        let oldGetLen = SQLCompiler.getProjectListLen;
        let oldGenTree = SQLCompiler.genExpressionTree;
        let oldGetType = SQLCompiler.getColType;
        let oldGenMap = SQLCompiler.genMapArray;
        let str = "";
        SQLUtil.assert = function(p1, p2) {
            if (p1) {
                str = str + p2 + "testTrue";
            } else {
                str = str + p2 + "testFalse";
            }
        };
        SQLCompiler.getProjectListLen = function() {
            return 1;
        }
        SQLCompiler.genExpressionTree = function() {
            return "testTree";
        };
        SQLCompiler.getColType = function(input) {
            return input;
        };
        SQLCompiler.genMapArray = function(p1, p2) {
            p2.push({colType: p1[0].name});
        };
        let node = {
            "value": {
                "class": "org.apache.spark.sql.catalyst.plans.logical.Intersect"
            },
            "children": [
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
                        "projectList": [
                            {
                                "name": "R_REGIONKEY"
                            }
                        ]
                    },
                    "children": []
                },
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
                        "projectList": [
                            {
                                "name": "R_REGIONKEY"
                            }
                        ]
                    },
                    "children": []
                }
            ]
        };
        expect(SQLCompiler.getXcAggType(node)).to.equal("R_REGIONKEY");
        expect(str).to.equal("XcAggregate node should only have 1 column. Instead it has: 1testTrueScalarSubquery operates on more than one child, the root can't be: org.apache.spark.sql.catalyst.plans.logical.ProjecttestFalseScalarSubquery should produce only 1 column. Instead it has: 1testTrue");

        str = "";
        node = {
            "value": {
                "class": "org.apache.spark.sql.catalyst.plans.logical.XcAggregate",
                "aggregateExpressions": [
                    [
                        {
                            "class": "org.apache.spark.sql.catalyst.expressions.Alias"
                        },
                        {
                            "class": "org.apache.spark.sql.catalyst.expressions.aggregate.AggregateExpression"
                        }
                    ]
                ]
            },
            "children": [
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.plans.logical.Project"
                    }
                }
            ]
        }
        expect(SQLCompiler.getXcAggType(node)).to.equal("testTree");
        expect(str).to.equal("ScalarSubquery should produce only 1 column. Instead it has: 1testTrue");

        SQLUtil.assert = oldAssert;
        SQLCompiler.getProjectListLen = oldGetLen;
        SQLCompiler.genExpressionTree = oldGenTree;
        SQLCompiler.getColType = oldGetType;
        SQLCompiler.genMapArray = oldGenMap;
    });

    it("getProjectListLen should work", function() {
        let node = {
            "value": {
                "class": "org.apache.spark.sql.catalyst.plans.logical.Intersect"
            },
            "children": [
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
                        "projectList": [
                            {
                                "name": "R_REGIONKEY"
                            }
                        ]
                    }
                },
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
                        "projectList": [
                            {
                                "name": "R_REGIONKEY"
                            }
                        ]
                    }
                }
            ]
        };
        expect(SQLCompiler.getProjectListLen(node)).to.equal(2);
    });

    it("getAttributeReferences should work", function() {
        let oldClean = SQLCompiler.cleanseColName;
        let called = false;
        SQLCompiler.cleanseColName = function (input) {
            called = true;
            return input;
        }
        let node = {
            "value": {
                "class": "org.apache.spark.sql.catalyst.expressions.EqualTo",
                "num-children": 2
            },
            "children": [
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                        "num-children": 0,
                        "name": "R_REGIONKEY",
                        "dataType": "long",
                        "exprId": {
                            "id": 2469
                        }
                    },
                    "children": [],
                    "colType": "int"
                },
                {
                    "value": {
                        "class": "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                        "num-children": 0,
                        "name": "N_REGIONKEY",
                        "dataType": "long",
                        "exprId": {
                            "id": 2481
                        }
                    },
                    "children": [],
                    "colType": "int"
                }
            ],
            "colType": "bool"
        };
        let options = {renamedCols: {2481: "test"}};
        let arr = [];
        SQLCompiler.getAttributeReferences(node, arr, options);
        expect(arr.length).to.equal(2);
        expect(arr[0]).to.equal("R_REGIONKEY");
        expect(arr[1]).to.equal("test");
        expect(called).to.be.true;
        SQLCompiler.cleanseColName = oldClean;
    });

    it("cleanseColName should work", function() {
        let oldClean = xcHelper.cleanseSQLColName;
        let oldStrip = xcHelper.stripPrefixInColName;
        let oldLen = XcalarApisConstantsT.XcalarApiMaxFieldNameLen;
        let called = false;
        XcalarApisConstantsT.XcalarApiMaxFieldNameLen = 10;
        xcHelper.stripPrefixInColName = function(input) {
            called = true;
            return input;
        }
        xcHelper.cleanseSQLColName = function(input) {
            return "test000";
        }
        expect(SQLCompiler.cleanseColName("a", true)).to.equal("TEST000");
        expect(called).to.be.true;
        expect(SQLCompiler.cleanseColName("a", false, true)).to.equal("ST000");
        xcHelper.cleanseSQLColName = oldClean;
        xcHelper.stripPrefixInColName = oldStrip;
        XcalarApisConstantsT.XcalarApiMaxFieldNameLen = oldLen;
    });

    it("replaceUDFName should work", function() {
        let oldAssert = SQLUtil.assert;
        let str = "";
        SQLUtil.assert = function(p1, p2) {
            if (!p1) {
                str = p2;
            } else {
                str = "";
            }
        };
        expect(SQLCompiler.replaceUDFName("XCEPASSTHROUGH(XCEPASSTHROUGH(1))", ["test", "test2"])).to.equal("test(test2(1))");
        SQLCompiler.replaceUDFName("XCEPASSTHROUGH(XCEPASSTHROUGH(1))", ["test"]);
        expect(str).to.equal(SQLErrTStr.UDFColumnMismatch);
        SQLUtil.assert = oldAssert;
    });

    it("replaceParamName should work", function() {
        let oldAssert = SQLUtil.assert;
        let str = "";
        SQLUtil.assert = function(p1, p2) {
            if (!p1) {
                str = p2;
            } else {
                str = "";
            }
        };
        expect(SQLCompiler.replaceParamName("XCEPARAMETER", ["<test>"])).to.equal("<test>");
        SQLCompiler.replaceParamName("XCEPARAMETER", []);
        expect(str).to.equal(SQLErrTStr.ParameterMismatch);
        SQLUtil.assert = oldAssert;
    });

    it("parseError should work", function() {
        expect(SQLCompiler.parseError("test")).to.equal("test");
        expect(SQLCompiler.parseError({1: 2})).to.equal('{"1":2}');
        let e = new Error("test");
        expect(SQLCompiler.parseError(e)).to.equal(e.stack);
    });

    // XXX complicated functions need test
    /*it("compile should work", function() {});
    it("secondTraverse should work", function() {});
    it("traverse should work", function() {});
    it("pushDown should work", function() {});
    it("genEvalStringRecur should work", function() {});
    it("genMapArray should work", function() {});
    it("produceSubqueryCli should work", function() {});
    it("produceAggregateCli should work", function() {});*/
    // genExpressionTree, traverseAndPushDown just call other functions so no test for them
});