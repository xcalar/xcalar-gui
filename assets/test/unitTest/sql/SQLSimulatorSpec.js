describe("SQLSimulator Test", function() {
    let oldStart;
    let oldEnd;
    let oldFail;
    let called = false;
    before(function() {
        oldStart = Transaction.start;
        oldEnd = Transaction.done;
        oldFail = Transaction.fail;
        Transaction.start = function() { return 1.5; };
        Transaction.done = function(id) { return "test done:" + id; };
        Transaction.fail = function(id) { called = true; return; };
    });
    describe("Transaction functions Test", function() {
        it("start should work", function() {
            let txId = SQLSimulator.start();
            expect(txId).to.equal(1.5);
        });
        it("end should work", function() {
            let query = SQLSimulator.end(1.5);
            expect(query).to.equal("test done:1.5");
        });
        it("fail should work", function() {
            SQLSimulator.fail(1.5);
            expect(called).to.be.true;
        });
    });
    describe("Static Function Test", function() {
        it("addSynthesize should work", function(done) {
            let oldSynthesize = XIApi.synthesize;
            let testColName;
            XIApi.synthesize = function(txId, colInfos) {
                testColName = colInfos[1].new;
                return PromiseHelper.resolve("testTable");
            };
            SQLSimulator.addSynthesize("[testCli]", "testInputTable",
                                    [{colName: "testCol", colId: 1}],
                                    [{colName: "testCol2",
                                    rename: "testCol2_something",
                                    colId: 2,
                                    udfColName: "testCol"}])
            .then(function(res) {
                expect(res.allColumns.length).to.equal(1);
                expect(testColName).to.equal("testCol_1");
                expect(res.newTableName).to.equal("testTable");
                expect(res.xcQueryString).to.equal("[testCli,test done:1.5]");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.synthesize = oldSynthesize;
            });
        });
        it("project should work", function(done) {
            let oldProject = XIApi.project;
            let testColName;
            XIApi.project = function(txId, colInfos) {
                testColName = colInfos[0];
                return PromiseHelper.resolve("testTable");
            };
            SQLSimulator.project([{colName: "testCol", colType: "int"}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(testColName).to.equal("testCol");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.project = oldProject;
            });
        });
        it("aggregate should work", function(done) {
            let oldAgg = XIApi.aggregate;
            XIApi.aggregate = function() {
                return PromiseHelper.resolve({value: "testVal", aggName: "testTable"});
            };
            SQLSimulator.aggregate()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.val).to.equal("testVal");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.aggregate = oldAgg;
            });
        });
        it("aggregateWithEvalStr should work", function(done) {
            let oldAggWES = XIApi.aggregateWithEvalStr;
            XIApi.aggregateWithEvalStr = function() {
                return PromiseHelper.resolve({value: "testVal", aggName: "testTable"});
            };
            SQLSimulator.aggregateWithEvalStr()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.val).to.equal("testVal");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.aggregateWithEvalStr = oldAggWES;
            });
        });
        it("sort should work", function(done) {
            let oldSort = XIApi.sort;
            XIApi.sort = function() {
                return PromiseHelper.resolve({newTableName: "testTable"});
            };
            SQLSimulator.sort([{name: "testName", ordering: "testOrder"}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                expect(res.sortColName).to.equal("testName");
                expect(res.order).to.equal("testOrder");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.sort = oldSort;
            });
        });
        it("sort should work for multisort case", function(done) {
            let oldMultiSort = XIApi.sort;
            XIApi.sort = function() {
                return PromiseHelper.resolve({
                    newTableName: "testTable",
                    sortColName: "testName"
                });
            };
            SQLSimulator.sort([{name: "testName1", ordering: "testOrder1"},
                               {name: "testName2", ordering: "testOrder2"}])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                expect(res.sortColName).to.equal("testName1");
                expect(res.order).to.equal("testOrder1");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.sort = oldMultiSort;
            });
        });
        it("map should work", function(done) {
            let oldMap = XIApi.map;
            XIApi.map = function() {
                return PromiseHelper.resolve("testTable");
            };
            SQLSimulator.map()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.map = oldMap;
            });
        });
        it("filter should work", function(done) {
            let oldFilter = XIApi.filter;
            XIApi.filter = function() {
                return PromiseHelper.resolve("testTable");
            };
            SQLSimulator.filter()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.filter = oldFilter;
            });
        });
        it("join should work", function(done) {
            let oldJoin = XIApi.join;
            XIApi.join = function() {
                return PromiseHelper.resolve({newTableName: "testTable", tempCols: "testCols"});
            };
            SQLSimulator.join()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.tempCols).to.equal("testCols");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.join = oldJoin;
            });
        });
        it("union should work", function(done) {
            let oldUnion = XIApi.union;
            let oldNewPull = ColManager.newPullCol;
            let oldNewData = ColManager.newDATACol;
            XIApi.union = function() {
                return PromiseHelper.resolve({newTableName: "testTable",
                    newTableCols: [{rename: "testCols", type: "testType"}]});
            };
            ColManager.newPullCol = function(frontName, backName, type) {
                return frontName + "-" + backName + "-" + type;
            };
            ColManager.newDATACol = function() {
                return "newData";
            };
            SQLSimulator.union()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.newColumns.length).to.equal(2);
                expect(res.newColumns[0]).to.equal("testCols-null-testType");
                expect(res.newColumns[1]).to.equal("newData");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.union = oldUnion;
                ColManager.newPullCol = oldNewPull;
                ColManager.newDATACol = oldNewData;
            });
        });
        it("groupBy should work", function(done) {
            let oldGroupBy = XIApi.groupBy;
            let options = {};
            XIApi.groupBy = function(a, b, c, d, e) {
                options = e;
                return PromiseHelper.resolve({finalTable: "testTable", tempCols: "testCols"});
            };
            SQLSimulator.groupBy([])
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.tempCols).to.equal("testCols");
                expect(res.cli).to.equal("test done:1.5");
                expect(options).to.deep.equal({icvMode: false, groupAll: true});
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.groupBy = oldGroupBy;
            });
        });
        it("genRowNum should work", function(done) {
            let oldGenRowNum = XIApi.genRowNum;
            XIApi.genRowNum = function() {
                return PromiseHelper.resolve("testTable");
            };
            SQLSimulator.genRowNum()
            .then(function(res) {
                expect(res).to.an("object");
                expect(res.newTableName).to.equal("testTable");
                expect(res.cli).to.equal("test done:1.5");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.genRowNum = oldGenRowNum;
            });
        });
    });
    after(function() {
        Transaction.start = oldStart;
        Transaction.done = oldEnd;
        Transaction.fail = oldFail;
    });
});
