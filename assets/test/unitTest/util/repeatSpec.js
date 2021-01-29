// XXX TODO: move to functional test
// describe("Repeat Test", function() {
//     var testDs;
//     var tableName;
//     var prefix;
//     var tableId;
//     var $table;

//     var testDs2;
//     var tableName2;
//     var prefix2;
//     var tableId2;
//     var $table2;

//     var newWSId;
//     var secondWSId;

//     before(function(done) {
//         UnitTest.onMinMode();

//         var testDSObj = testDatasets.fakeYelp;
//         UnitTest.addAll(testDSObj, "unitTestFakeYelp")
//         .then(function(ds, tName, tPrefix) {
//             testDs = ds;
//             tableName = tName;
//             tableId = xcHelper.getTableId(tableName);
//             prefix = tPrefix;
//             $table = $("#xcTable-" + tableId);
//             done();
//         })
//         .fail(function() {
//             done("fail");
//         });
//     });

//     describe("Column operations", function() {
//         it("sort should work", function(done) {
//             var cachedIndexFn = XIApi.sort;
//             var cachedRefreshFn = TblManager.refreshTable;
//             var indexCalled = false;
//             XIApi.sort = function() {
//                 indexCalled = true;
//                 return PromiseHelper.resolve(null, []);
//             };
//             TblManager.refreshTable = function() {
//                 return PromiseHelper.resolve();
//             };

//             xcFunction.sort(tableId, [{colNum: 4, ordering: XcalarOrderingT.XcalarOrderingDescending}])
//             .then(function() {
//                 indexCalled = false;
//                 TblManager.highlightColumn($table.find("th.col4"));
//                 return Log.repeat();
//             })
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(indexCalled).to.be.true;
//                 expect(lastLog.title).to.equal("Sort");
//                 expect(lastLog.options.colNums[0]).to.equal(4);
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             })
//             .always(function() {
//                 XIApi.sort = cachedIndexFn;
//                 TblManager.refreshTable = cachedRefreshFn;
//             });
//         });

//         it("sort on object should not work", function(done) {
//             var cachedSortFn = xcFunction.sort;
//             var sortCalled = false;
//             xcFunction.sort = function() {
//                 sortCalled = true;
//                 return PromiseHelper.resolve();
//             };

//             TblManager.highlightColumn($table.find("th.col2"));
//             Log.repeat()
//             .then(function() {
//                 expect(sortCalled).to.be.false;
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             })
//             .always(function() {
//                 xcFunction.sort = cachedSortFn;
//             });
//         });

//         it("sort when multiple columns selected should not work", function(done) {
//             var cachedSortFn = xcFunction.sort;
//             var sortCalled = false;
//             xcFunction.sort = function() {
//                 sortCalled = true;
//                 return PromiseHelper.resolve();
//             };

//             TblManager.highlightColumn($table.find("th.col1"));
//             TblManager.highlightColumn($table.find("th.col4"), true);

//             Log.repeat()
//             .then(function() {
//                 expect(sortCalled).to.be.false;
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             })
//             .always(function() {
//                 xcFunction.sort = cachedSortFn;
//             });
//         });

//         it("column operation without selected column should not work", function(done) {
//             $(".selectedCell").removeClass("selectedCell");
//             var logsLen = Log.getLogs().length;
//             Log.repeat()
//             .then(function() {
//                 done("failed");
//             })
//             .fail(function() {
//                 expect(Log.getLogs().length).to.equal(logsLen);
//                 done();
//             })
//             .always(function() {
//             });
//         });


//         it("split col on multiple cols should not work", function(done) {
//             var cachedMapFn = XIApi.map;
//             var mapCalled = false;
//             XIApi.map = function() {
//                 mapCalled = true;
//                 return PromiseHelper.resolve();
//             };

//             TblManager.highlightColumn($table.find("th.col7"));
//             TblManager.highlightColumn($table.find("th.col10"), true);
//             Log.repeat()
//             .then(function() {
//                 expect(mapCalled).to.be.false;
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             })
//             .always(function() {
//                 XIApi.map = cachedMapFn;
//             });
//         });

//         it("minimize cols should work", function(done) {
//             ColManager.minimizeCols([1, 2], tableId)
//             .then(function() {
//                 TblManager.highlightColumn($table.find("th.col3"));
//                 TblManager.highlightColumn($table.find("th.col4"), true);
//                 return Log.repeat();
//             })
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Minimize Columns");
//                 expect(lastLog.options.colNums[0]).to.equal(3);
//                 expect(lastLog.options.colNums[1]).to.equal(4);
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });

//         it("maximize cols should work", function(done) {
//             ColManager.maximizeCols([1, 2], tableId)
//             .then(function() {
//                 TblManager.highlightColumn($table.find("th.col3"));
//                 TblManager.highlightColumn($table.find("th.col4"), true);
//                 return Log.repeat();
//             })
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Unminimize Columns");
//                 expect(lastLog.options.colNums[0]).to.equal(3);
//                 expect(lastLog.options.colNums[1]).to.equal(4);
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });

//         it("add new col should work", function(done) {
//             ColManager.addNewCol(1, tableId, 1);
//             TblManager.highlightColumn($table.find("th.col2"));
//             Log.repeat()
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Add New Column");
//                 expect(lastLog.options.colNum).to.equal(2);
//                 expect(lastLog.options.direction).to.equal(1);
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });

//         it("hide col should work", function(done) {
//             ColManager.hideCol([3], tableId)
//             .then(function() {
//                 TblManager.highlightColumn($table.find("th.col2"));
//                 Log.repeat();
//             })
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Delete Column");
//                 expect(lastLog.options.colNums[0]).to.equal(2);

//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });

//         it("text align should work", function(done) {
//             ColManager.textAlign([1], tableId, "rightAlign");

//             TblManager.highlightColumn($table.find("th.col2"));

//             Log.repeat()
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Text Align");
//                 expect(lastLog.options.alignment).to.equal("Right");

//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });

//         it("change format should work", function(done) {
//             ColManager.format([1], tableId, ["percent"]);

//             TblManager.highlightColumn($table.find("th.col2"));

//             Log.repeat()
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Change Format");
//                 expect(lastLog.options.formats[0]).to.equal("percent");
//                 done();
//             })
//             .fail(function() {
//                 done("failed");
//             });
//         });
//     });

//     describe("table operations", function() {
//         before(function(done) {
//             var testDSObj = testDatasets.fakeYelp;
//             UnitTest.addAll(testDSObj, "unitTestFakeYelp")
//             .always(function(ds, tName, tPrefix) {
//                 testDs2 = ds;
//                 tableName2 = tName;
//                 tableId2 = xcHelper.getTableId(tableName2);
//                 prefix2 = tPrefix;
//                 $table2 = $("#xcTable-" + tableId2);
//                 done();
//             });
//         });


//         it("table operation without focuse table should not  work", function(done) {
//             var logsLen = Log.getLogs().length;
//             $(".tblTitleSelected").removeClass("tblTitleSelected");

//             Log.repeat()
//             .then(function(){
//                 done("fail");
//             })
//             .fail(function() {
//                 expect(Log.getLogs().length).to.equal(logsLen);
//                 done();
//             });
//         });
//         it("sort table cols should work", function(done) {
//             TblManager.sortColumns(tableId, "name", "reverse");
//             Log.repeat()
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Sort Table Columns");
//                 expect(lastLog.options.tableId).to.equal(tableId2);
//                 expect(lastLog.options.sortKey).to.equal("name");
//                 expect(lastLog.options.direction).to.equal("reverse");
//                 done();
//             })
//             .fail(function() {
//                 done("fail");
//             });
//         });

//         it("resize table cols should work", function(done) {
//             TblManager.resizeColumns(tableId, "contents");
//             $(".selectedCell").removeClass("selectedCell");

//             Log.repeat()
//             .then(function() {
//                 var lastLog = Log.viewLastAction(true);
//                 expect(lastLog.title).to.equal("Resize Columns");
//                 expect(lastLog.options.tableId).to.equal(tableId2);
//                 expect(lastLog.options.sizeTo).to.equal("contents");
//                 done();
//             })
//             .fail(function() {
//                 done("fail");
//             });
//         });
//     });
//     after(function(done) {
//         UnitTest.deleteAllTables()
//         .then(function() {
//             UnitTest.deleteDS(testDs)
//             .then(function() {
//                 UnitTest.deleteDS(testDs2)
//                 .always(function() {
//                     done();
//                 });
//             })
//             .fail(function() {
//                 done();
//             });
//         })
//         .fail(function() {
//             done("fail");
//         });
//     });
// });