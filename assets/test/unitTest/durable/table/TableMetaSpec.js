describe("Table Constructor Test", function() {
    it("Should have 21 attributes", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        expect(table).to.be.an.instanceof(TableMeta);
        expect(Object.keys(table).length).to.equal(21);
        expect(table).have.property("version").and
        .to.equal(Durable.Version);
        expect(table).have.property("tableName").and
        .to.equal("test#a1");
        expect(table).have.property("tableId").and
        .to.equal("a1");
        expect(table).have.property("isLocked").and
        .to.be.false;
        expect(table).have.property("status").and
        .to.equal(TableType.Active);
        expect(table).have.property("timeStamp").and
        .to.be.a("number");
        expect(table).have.property("tableCols").and
        .to.be.null;
        expect(table).have.property("rowHeights").and
        .to.be.an("object");
        expect(table).have.property("resultSetId").and
        .to.be.equal(null);
        expect(table).have.property("icv").and
        .to.be.equal("");
        expect(table).have.property("complement").and
        .to.be.equal("");
        expect(table).have.property("keyName").and
        .to.be.an("array");
        expect(table).have.property("keys").and
        .to.be.an("array");
        expect(table).have.property("ordering").and
        .to.be.null;
        expect(table).have.property("backTableMeta").and
        .to.be.null;
        expect(table).have.property("resultSetCount").and
        .to.be.equal(-1);
        expect(table).have.property("resultSetMax").and
        .to.be.equal(-1);
        expect(table).have.property("numPages").and
        .to.be.equal(-1);
        expect(table).have.property("colTypeCache").and
        .to.be.a("map");
        expect(table).have.property("hiddenSortCols").and
        .to.be.an("object");
    });

    it("TableMeta Constructor should handle error case", function() {
        try {
            new TableMeta();
        } catch (error) {
            expect(error).not.to.be.null;
        }
    });

    it("Should get id", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        expect(table.getId()).to.equal("a1");
    });

    it("Should get name", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        expect(table.getName()).to.equal("test#a1");
    });

    it("Table should update timestamp", function(done) {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var time = table.getTimeStamp();
        expect(time).to.be.a("number");

        setTimeout(function() {
            table.updateTimeStamp();
            expect(table.getTimeStamp()).not.to.equal(time);
            done();
        }, 50);
    });

    it("Table should get keyName", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });
        var testVal = "testKey";
        var keys = table.getKeyName();
        expect(keys.length).to.equal(0);

        table.keyName = [testVal];
        var keys = table.getKeyName();
        expect(keys.length).to.equal(1);
        expect(keys[0]).to.equal(testVal);
    });

    it("Table should get ordering", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });
        expect(table.getOrdering()).to.be.null;

        var testVal = "testOrder";
        table.ordering = testVal;

        expect(table.getOrdering()).to.equal(testVal);
    });

    it("Table getColNameMap should work", function() {
        var progCol1 = ColManager.newCol({
            "backName": "Test",
            "name": "undfCol",
            "isNewCol": false
        });

        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name": "stringCol",
            "isNewCol": false
        });

        var progCol3 = ColManager.newCol({
            "backName": "",
            "name": "",
            "isNewCol": false
        });

        var progCol4 = ColManager.newDATACol();

        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });
        let table = gTables["xc-Test"];
        var colNameMap = table.getColNameMap();
        expect(Object.keys(colNameMap).length).to.equal(2);
        expect(colNameMap["test"]).to.equal("Test");
        expect(colNameMap["test2"]).to.equal("test2");

        delete gTables["xc-Test"];
    });

    it("Table should lock and unlock", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        expect(table.hasLock()).to.be.false;
        table.lock();
        expect(table.hasLock()).to.be.true;
        table.unlock();
        expect(table.hasLock()).to.be.false;
    });

    it("Table should change status", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });
        expect(table.getType()).to.equal(TableType.Active);

        table.beOrphaned();
        expect(table.getType()).to.equal(TableType.Orphan);
    });

    it("Table should get col info", function() {
        var progCol = new ProgCol({
            "name": "testCol",
            "backName": "prefix::backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol, dataCol],
            "isLocked": false
        });

        expect(table.getNumCols()).to.equal(2);
        expect(table.getAllCols()).to.be.an("array");
        expect(table.getCol(0)).to.be.null;
        expect(table.getCol(1).getFrontColName()).to.be.equal("testCol");
        expect(table.getCol(3)).to.be.null;

        expect(table.getColByFrontName("prefix::testCol").getBackColName())
        .to.equal("prefix::backTestCol");
        expect(table.getColByFrontName("errorCol")).to.be.null;

        expect(table.hasColWithBackName("prefix::backTestCol")).to.be.true;
        expect(table.hasColWithBackName("errorCol")).to.be.false;
    });

    it("should getColNumByBackName", function() {
        var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "prefix::backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, dataCol],
            "isLocked": false
        });

        expect(table.getColNumByBackName("prefix::backTestCol"))
        .to.equal(1);
        expect(table.getColNumByBackName("errorCol")).to.equal(-1);
    });

    it("should getColByBackName", function() {
        var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "prefix::backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, dataCol],
            "isLocked": false
        });

        expect(table.getColByBackName("prefix::backTestCol")
        .getFrontColName()).to.equal("testCol");
        expect(table.getColByBackName("errorCol")).to.be.null;
    });

    it("Should check if has column", function() {
        var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "prefix::backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "testCol2",
            "backName": "backTestCol2",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var dataCol = ColManager.newDATACol();

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [dataCol, progCol1, progCol2],
            "isLocked": false
        });

        // test without backMeta
        expect(table.hasCol("testCol", "")).to.be.false;
        expect(table.hasCol("testCol")).to.be.true;
        expect(table.hasCol("testCol", "prefix")).to.be.true;
        expect(table.hasCol("prefix::backTestCol", "")).to.be.false;
        expect(table.hasCol("prefix::backTestCol")).to.be.true;
        expect(table.hasCol("prefix::backTestCol", "prefix")).to.be.true;
        expect(table.hasCol("errorCol")).to.be.false;

        // test with backMeta
        table.backTableMeta = {
            valueAttrs: [{
                "type": DfFieldTypeT.DfFatptr,
                "name": "backTestCol"
            },
            {
                "type": DfFieldTypeT.DfString,
                "name": "backTestCol2"
            },
            {
                "type": DfFieldTypeT.DfString,
                "name": "backTestCol3"
            }]
        };

        expect(table.hasCol("backTestCol2", "")).to.be.true;
        expect(table.hasCol("backTestCol2", "", true)).to.be.true;
        expect(table.hasCol("backTestCol3", "")).to.be.true;
        expect(table.hasCol("backTestCol3", "", true)).to.be.false;
    });

    it("should add all cols", function() {
        var progCol = new ProgCol({
            "name": "testCol",
            "backName": "backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });
        table.addAllCols([progCol]);
        expect(table.tableCols.length).to.equal(1);
        expect(table.colTypeCache.size).to.equal(1);
    });

    it("Should add and remove col", function() {
        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [dataCol],
            "isLocked": false
        });

        var progCol = new ProgCol({
            "name": "testCol",
            "backName": "backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        // add col case 1
        table.addCol(-1, progCol);
        expect(table.tableCols.length).to.equal(1);
        // add col case 2
        table.addCol(1);
        expect(table.tableCols.length).to.equal(1);
        // add col case 3
        table.addCol(1, progCol);
        expect(table.tableCols.length).to.equal(2);
        expect(table.getCol(1)).to.equal(progCol);

        // remove col case 1
        table.removeCol(-1);
        expect(table.tableCols.length).to.equal(2);
        // remove col case 2
        table.removeCol(3);
        expect(table.tableCols.length).to.equal(2);
        // remove col case 3
        var col = table.removeCol(1);
        expect(table.tableCols.length).to.equal(1);
        expect(col).to.equal(progCol);
    });

    it("Should add col and check immediate type", function() {
        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [dataCol],
            "isLocked": false
        });

        table.backTableMeta = {
            "valueAttrs": [{
                "name": "testImmeidate",
                "type": DfFieldTypeT.DfString
            }]
        };

        var progCol = new ProgCol({
            "name": "testImmeidate",
            "backName": "testImmeidate",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        table.addCol(1, progCol);
        expect(table.tableCols.length).to.equal(2);
        var col = table.getCol(1);
        expect(col.getType()).to.equal(ColumnType.string);
    });

    it("Should sort columns by name", function() {
        var progCol1 = new ProgCol({
            "name": "b",
            "backName": "b",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "a",
            "backName": "a",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, progCol2],
            "isLocked": false
        });

        // case 1
        table.sortCols(ColumnSortType.name, ColumnSortOrder.ascending);
        expect(table.getCol(1).getFrontColName()).to.equal("a");

        // case 2
        table.sortCols(ColumnSortType.name, ColumnSortOrder.descending);
        expect(table.getCol(1).getFrontColName()).to.equal("b");
    });

    it("Should sort columns by type", function() {
        var progCol1 = new ProgCol({
            "name": "a",
            "backName": "a",
            "type": ColumnType.string,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "b",
            "backName": "b",
            "type": ColumnType.array,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, progCol2],
            "isLocked": false
        });

        // case 1
        table.sortCols(ColumnSortType.type, ColumnSortOrder.ascending);
        expect(table.getCol(1).getFrontColName()).to.equal("b");

        // case 2
        table.sortCols(ColumnSortType.type, ColumnSortOrder.descending);
        expect(table.getCol(1).getFrontColName()).to.equal("a");
    });

    it("Should sort columns by prefix", function() {
        var progCol1 = new ProgCol({
            "name": "a",
            "backName": "prefix2::a",
            "type": ColumnType.string,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "b",
            "backName": "prefix1::b",
            "type": ColumnType.array,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, progCol2],
            "isLocked": false
        });

        // case 1
        table.sortCols(ColumnSortType.prefix, ColumnSortOrder.ascending);
        expect(table.getCol(1).getFrontColName()).to.equal("b");

        // case 2
        table.sortCols(ColumnSortType.prefix, ColumnSortOrder.descending);
        expect(table.getCol(1).getFrontColName()).to.equal("a");
    });

    it("Should sort by name when have same prefix", function() {
        var progCol1 = new ProgCol({
            "name": "b",
            "backName": "prefix::b",
            "type": ColumnType.string,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "a",
            "backName": "prefix::a",
            "type": ColumnType.array,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol1, progCol2],
            "isLocked": false
        });

        table.sortCols(ColumnSortType.prefix, ColumnSortOrder.ascending);
        expect(table.getCol(1).getFrontColName()).to.equal("a");
    });

    it("table should get immediates", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var res = table.getImmediates();
        expect(res).to.be.an("array").and.to.have.length(0);

        table.backTableMeta = {
            "valueAttrs": [{
                "name": "test",
                "type": DfFieldTypeT.DfString
            },
            {
                "name": "test2",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        res = table.getImmediates();
        expect(res).to.be.an("array").and.to.have.length(1);
        expect(res[0].name).to.equal("test");
    });

    it("table should get fatPtrs", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var res = table.getFatPtr();
        expect(res).to.be.an("array").and.to.have.length(0);

        table.backTableMeta = {
            "valueAttrs": [{
                "name": "test",
                "type": DfFieldTypeT.DfString
            },
            {
                "name": "test2",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        res = table.getFatPtr();
        expect(res).to.be.an("array").and.to.have.length(1);
        expect(res[0].name).to.equal("test2");
    });


    it("table should get immediates names", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var res = table.getImmediateNames();
        expect(res).to.be.an("array").and.to.have.length(0);

        table.backTableMeta = {
            "valueAttrs": [{
                "name": "test",
                "type": DfFieldTypeT.DfString
            },
            {
                "name": "test2",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        res = table.getImmediateNames();
        expect(res).to.be.an("array").and.to.have.length(1);
        expect(res[0]).to.equal("test");
    });

    it("table should get fatPtr names", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var res = table.getFatPtrNames();
        expect(res).to.be.an("array").and.to.have.length(0);

        table.backTableMeta = {
            "valueAttrs": [{
                "name": "test",
                "type": DfFieldTypeT.DfString
            },
            {
                "name": "test2",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        res = table.getFatPtrNames();
        expect(res).to.be.an("array").and.to.have.length(1);
        expect(res[0]).to.equal("test2");
    });

    it("table should show indexed style", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });

        expect(table.showIndexStyle()).to.be.false;
        table.ordering = XcalarOrderingT.XcalarOrderingAscending;
        expect(table.showIndexStyle()).to.be.true;
    });

    it("Should get meta test1", function(done) {
        var oldFunc = XIApi.getTableMeta;
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });

        XIApi.getTableMeta = function() {
            return PromiseHelper.resolve();
        };

        table.getMeta()
        .then(function() {
            expect(table.backTableMeta).not.to.exists;
            done();
        })
        .fail(function() {
            throw "error case";
        })
        .always(function() {
            XIApi.getTableMeta = oldFunc;
        });
    });

    it("Should get meta test2", function(done) {
        var oldFunc = XIApi.getTableMeta;
        var progCol = new ProgCol({
            "name": "testCol",
            "backName": "prefix::backTestCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var dataCol = ColManager.newDATACol();
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "tableCols": [progCol, dataCol]
        });

        XIApi.getTableMeta = function() {
            return PromiseHelper.resolve({
                "keyAttr": [{
                    "name": "xcalarRecordNum",
                    "type": 5,
                    "valueArrayIndex": 2
                }],
                "ordering": 1,
                "valueAttrs": [{
                    "name": "test",
                    "type": DfFieldTypeT.DfFatptr,
                    "valueArrayIndex": 0
                },{
                    "name": "prefix::backTestCol",
                    "type": DfFieldTypeT.DfBoolean,
                    "valueArrayIndex": 1
                }, {
                    "name": "xcalarRecordNum",
                    "type": DfFieldTypeT.DfUInt64,
                    "valueArrayIndex": 2
                }],
                "metas": [{"numRows": 1}]
            });
        };

        table.getMeta()
        .then(function() {
            expect(table.backTableMeta).to.exists;
            expect(table.ordering).to.equal(1);
            var keys = table.getKeyName();
            expect(keys.length).to.equal(1);
            expect(keys[0]).to.equal("xcalarRecordNum");
            var col = table.getColByBackName("prefix::backTestCol");
            expect(col).not.to.be.null;
            expect(col.getType()).to.equal(ColumnType.boolean);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XIApi.getTableMeta = oldFunc;
        });
    });

    it("Should update result set", function(done) {
        var oldFunc = XcalarMakeResultSetFromTable;
        XcalarMakeResultSetFromTable = function() {
            return PromiseHelper.resolve({
                "resultSetId": 1,
                "numEntries": 10
            });
        };

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });

        table.updateResultset()
        .then(function() {
            expect(table.resultSetId).to.equal(1);
            expect(table.resultSetMax).to.equal(10);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarMakeResultSetFromTable = oldFunc;
        });
    });

    it("getMetaAndResultSet should work", function(done) {
        var test1 = null;
        var test2 = null;
        var oldMakeResult = XcalarMakeResultSetFromTable;
        var oldGetMeta = XIApi.getTableMeta;

        XcalarMakeResultSetFromTable = function() {
            test1 = true;
            return PromiseHelper.resolve({
                "resultSetId": 1,
                "numEntries": 10
            });
        };

        XIApi.getTableMeta = function() {
            test2 = true;
            return PromiseHelper.resolve();
        };

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });

        table.getMetaAndResultSet()
        .then(function() {
            expect(test1).to.be.true;
            expect(test2).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarMakeResultSetFromTable = oldMakeResult;
            XIApi.getTableMeta = oldGetMeta;
        });
    });

    it("table should free result set test1", function(done) {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });
        table.freeResultset()
        .then(function() {
            expect(table.resultSetId).to.equal(null);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("table should free result set test2", function(done) {
        var oldFunc = XcalarSetFree;
        XcalarSetFree = function() {
            return PromiseHelper.resolve();
        };

        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1"
        });

        table.resultSetId = 1;

        table.freeResultset()
        .then(function() {
            expect(table.resultSetId).to.equal(null);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarSetFree = oldFunc;
        });
    });
    it("table should get column contents", function() {
        var tableId = "unitTest-exportHelper";
        var colCont0 = "record0";

        var progCol = new ProgCol({
            "name": "test",
            "backName": "test",
            "isNewCol": false,
            "type": "string",
            "func": {
                "name": "pull"
            }
        });

        var table = new TableMeta({
            "tableName": "test#" + tableId,
            "tableId": tableId,
            "tableCols": [progCol],
            "isLocked": false
        });
        var fakeHtml =
            '<div id="xcTable-' + tableId + '">' +
                '<table>' +
                    '<tr>' +
                        '<td class="col1">' +
                            '<div class="originalData">' +
                                colCont0 +
                            '</div>' +
                        '</td>' +
                    '</tr>' +
                '</table>' +
            '</div>';
        $(fakeHtml).appendTo("body");
        succCont = table.getColContents(1);
        expect(succCont.length).to.equal(1);
        expect(succCont[0]).to.equal(colCont0);
        expect(table.getColContents(0)).to.equal(null);
        expect(table.getColContents(2)).to.equal(null);

        $("#xcTable-" + tableId).remove();
    });

    it("should get row distributon", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        table.backTableMeta = {
            "metas": [{ "numRows": 1 }, { "numRows": 2 }]
        };

        var res = table.getRowDistribution();
        expect(res).to.be.an("array");
        expect(res[0]).to.equal(1);
        expect(res[1]).to.equal(2);
    });

    it("should get and set skew", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        var tests = [{
            "metas": [{ "numRows": 0 }, { "numRows": 100 }],
            "expect": 100
        }, {
            "metas": [{ "numRows": 0 }, { "numRows": 1 }],
            "expect": 0
        }, {
            "metas": [{ "numRows": 100 }],
            "expect": 0
        }, {
            "metas": [{ "numRows": 0 }, { "numRows": 0 }, { "numRows": 100 }],
            "expect": 100
        }, {
            "metas": [{ "numRows": 10 }, { "numRows": 10 }, { "numRows": 10 }],
            "expect": 0
        }];

        tests.forEach(function(test) {
            table.backTableMeta = {
                "metas": test.metas
            };
            table._setSkewness();
            let skew = table.getSkewness();
            if (skew !== test.expect) {
                console.error("test fail", JSON.stringify(test));
            }
            expect(skew).to.equal(test.expect);
        });
    });

    it("should get size", function() {
        var table = new TableMeta({
            "tableName": "test#a1",
            "tableId": "a1",
            "isLocked": false
        });

        table.backTableMeta = {
            "metas": [{ "size": 1 }, { "size": 2,}]
        };

        expect(table.getSize()).to.equal(3);
    });
});