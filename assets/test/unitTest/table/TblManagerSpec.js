// XXX temporary disable it
describe.skip("TableManager Test", function() {
    let tabId;
    before(function() {
        console.clear();
        UnitTest.onMinMode();
    });

    describe("Basic Function Test", function() {
        it("TblManager.refreshTable should handle transaction error", function(done) {
            var oldFunc = Transaction.checkCanceled;
            Transaction.checkCanceled = function() {
                return true;
            };

            TblManager.refreshTable("test", null, null, "testTxId")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(StatusTStr[StatusT.StatusCanceled]);
                done();
            })
            .always(function() {
                Transaction.checkCanceled = oldFunc;
            });
        });

        it("TblManager.parseTableId should work", function() {
            // case 1
            var id = "test-id";
            var res = TblManager.parseTableId(id);
            expect(res).to.equal("id");

            // case 2 (normal to see the console.error)
            id = "test";
            res = TblManager.parseTableId(id);
            expect(res).to.be.null;

            // case 3
            var $ele = $('<div id="test-id"></div>');
            res = TblManager.parseTableId($ele);
            expect(res).to.equal("id");
            // case 4
            var ele = $('<div id="test-id"></div>').get(0);
            res = TblManager.parseTableId(ele);
            expect(res).to.equal("id");
            // case 5
            var $ele = $();
            res = TblManager.parseTableId($ele);
            expect(res).to.be.null;
        });

        it("TblManager.getBackTableSet should work", function(done) {
            TblManager.getBackTableSet()
            .then(function(backTableSet) {
                expect(backTableSet).to.be.an("object");
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("TblManager.setOrphanedList should work", function() {
            var cache = gOrphanTables;
            TblManager.setOrphanedList({"a": true});
            expect(gOrphanTables).to.be.an("array");
            expect(gOrphanTables.length).to.equal(1);
            expect(gOrphanTables[0]).to.equal("a");

            // clear up
            gOrphanTables = cache;
        });

        it("TblManager.setOrphanTableMeta should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);

            TblManager.setOrphanTableMeta(tableName);
            expect(gTables).to.ownProperty(tableId);
            var table = gTables[tableId];
            expect(table.getType()).to.equal(TableType.Orphan);
            delete gTables[tableId];
        });

        it("verifyTableType should work", function() {
            var vefiryTableType = TblManager.__testOnly__.vefiryTableType;
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active
            });

            gTables[tableId] = table;
            // case 1
            var res = vefiryTableType(tableName, TableType.Orphan);
            expect(res).to.be.false;
            // case 2
            res = vefiryTableType(tableId, TableType.Active);
            expect(res).to.be.true;

            delete gTables[tableId];

            // case 3
            res = vefiryTableType(tableName, TableType.Orphan);
            expect(res).to.be.true;
        });

        it("TblManager.restoreTableMeta should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active
            });
            table.lock();

            var oldgTables = {};
            oldgTables[tableId] = table;

            TblManager.restoreTableMeta(oldgTables);
            expect(gTables).to.ownProperty(tableId);
            // gTables[tableId] is being written
            table = gTables[tableId];
            expect(table.hasLock()).to.be.false;
            expect(table.getType()).to.equal(TableType.Orphan);

            delete gTables[tableId];
        });

        it("TblManager.getColHeadHTML should work", function() {
            var tableName = xcHelper.randName("test_table#ab");
            var tableId = xcHelper.getTableId(tableName);
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": [ColManager.newDATACol]
            });

            gTables[tableId] = table;

            var progCol = ColManager.newPullCol("test", "test", "string");
            progCol.minimize();
            table.addCol(1, progCol);
            // case 1 hidden column
            var th = TblManager.getColHeadHTML(1, tableId);
            var $th = $(th);
            expect($th.hasClass("userHidden")).to.be.true;
            // case 2 index column
            table.keyName = "test";
            table.keys = [{name: "test", ordering: "Ascending"}];
            th = TblManager.getColHeadHTML(1, tableId);
            $th = $(th);
            expect($th.hasClass("indexedColumn")).to.be.true;
            // case 3 empty column
            var progCol2 = ColManager.newPullCol("", "");
            table.addCol(2, progCol2);
            th = TblManager.getColHeadHTML(2, tableId);
            $th = $(th);
            expect($th.find(".header").hasClass("editable")).to.be.true;

            delete gTables[tableId];
        });

        it("TblManager.adjustRowHeights should work", function() {
            var $trs = $('<tr class="row0"><td class="col0"></td></tr>');
            var tableId = xcHelper.randName("testTable");
            var table = new TableMeta({
                tableName: tableId,
                tableId: tableId
            });

            table.rowHeights = [{1: 100}];
            gTables[tableId] = table;

            TblManager.adjustRowHeights($trs, 0, tableId);
            expect($trs.hasClass("changedHeight")).to.be.true;

            // clear up
            delete gTables[tableId];
        });

        it("setTablesToReplace should work", function() {
            var setTablesToReplace = TblManager.__testOnly__.setTablesToReplace;
            var oldTableNames = ["test#wrongId1"];
            var tablesToReplace = [];
            var tablesToRemove = [];
            setTablesToReplace(oldTableNames, tablesToReplace, tablesToRemove);
            expect(tablesToReplace.length).to.equal(1);
            expect(tablesToReplace[0]).to.equal("test#wrongId1");
            expect(tablesToRemove.length).to.equal(1);
            expect(tablesToRemove[0]).to.equal("wrongId1");

            oldTableNames = ["test#wrongId1", "test#wrongId2"];
            try {
                setTablesToReplace(oldTableNames, [], []);
            } catch (e) {
                expect(e.message).to.equal("Cannot repalce multiple tables when refresh");
            }
        });

        it("TblManager.highlightColumn should highlight modal", function() {
            var id = xcHelper.randName("testId");
            var $wrap = $('<table id="xcTable-' + id + '" class="dataTable">' +
                            '<th class="col1"></th>' +
                            '<tr class="col1"></tr>' +
                          '</table>');
            $("body").append($wrap);
            var $el = $wrap.find("tr.col1");
            TblManager.highlightColumn($el, true, true);
            expect($wrap.find("th").hasClass("modalHighlighted"));

            $wrap.remove();
        });

        it("should add and remove waiting cursor should work", function() {
            var id = xcHelper.randName("testId");
            var $wrap = $('<div id="xcTableWrap-' + id + '"></div>');
            $("body").append($wrap);
            TblManager.addWaitingCursor(id);
            expect($wrap.find(".tableCoverWaiting").length).to.equal(1);

            TblManager.removeWaitingCursor(id);
            expect($wrap.find(".tableCoverWaiting").length).to.equal(0);
            // clear up
            $wrap.remove();
        });

        it("TblManager.freeAllResultSetsSync should work", function(done) {
            var oldTables = gTables;
            gTables = {};
            var id1 = xcHelper.randName("testTable");
            var id2 = xcHelper.randName("testTable2");

            [id1, id2].forEach(function(id) {
                var table = new TableMeta({
                    tableName: id,
                    tableId: id
                });
                table.resultSetId = 1;
                gTables[id] = table;
            });

            var oldGet = TblManager.getBackTableSet;
            var oldFree = XcalarSetFree;

            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            TblManager.getBackTableSet = function() {
                var set = {};
                set[id1] = true;
                return PromiseHelper.resolve(set);
            };

            TblManager.freeAllResultSetsSync()
            .then(function() {
                expect(gTables[id1].resultSetId).to.equal(null);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                gTables = oldTables;
                XcalarSetFree = oldFree;
                TblManager.getBackTableSet = oldGet;
            });
        });

        it("tagOldTables should work", function() {
            var tagOldTables = TblManager.__testOnly__.tagOldTables;
            var id = xcHelper.randName("test");
            var $wrap = $('<div id="xcTableWrap-' + id + '"></div>');
            $("body").append($wrap);

            tagOldTables(null);
            expect($wrap.hasClass("tableToRemove")).to.be.false;

            // case 2
            tagOldTables([id]);
            expect($wrap.hasClass("tableToRemove")).to.be.true;
            // clear up
            $wrap.remove();
        });

        it("removeOldTables should work", function() {
            var removeOldTables = TblManager.__testOnly__.removeOldTables;
            var id = xcHelper.randName("test");
            var $wrap = $('<div id="xcTableWrap-' + id + '"></div>');
            $("body").append($wrap);

            removeOldTables(null);
            expect($("#xcTableWrap-" + id).length).to.equal(1);

            // case 2
            removeOldTables([id]);
            expect($("#xcTableWrap-" + id).length).to.equal(0);
            // clear up
            $wrap.remove();
        });
    });

    describe("TblManager.deleteTables Test", function() {
        var oldFunc;
        var oldSingelDelete;
        var tableName;
        var tableId;
        var table;
        var tableName2;
        var tableId2;
        var table2;

        before(function() {
            oldFunc = XIApi.deleteTables;
            oldSingelDelete = XIApi.deleteTable;
        });

        beforeEach(function() {
            tableName = xcHelper.randName("test_table#ab");
            tableId = xcHelper.getTableId(tableName);

            table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": []
            });

            gTables[tableId] = table;

            tableName2 = xcHelper.randName("test_table#ab");
            tableId2 = xcHelper.getTableId(tableName2);

            table2 = new TableMeta({
                "tableId": tableId2,
                "tableName": tableName2,
                "status": TableType.Active,
                "noDelete": true,
                "tableCols": []
            });
            table2.lock();
            gTables[tableId2] = table2;

            XIApi.deleteTables = function() {
                return PromiseHelper.resolve.apply(null, [null]);
            };

            XIApi.deleteTable = () => PromiseHelper.resolve();
        });

        it("Should delete active table", function(done) {
            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should delete orphaned table", function(done) {
            table.beOrphaned();
            expect(table.getType()).to.equal(TableType.Orphan);
            gOrphanTables.push(tableName);

            TblManager.deleteTables(tableName, TableType.Orphan)
            .then(function() {
                expect(gTables).not.to.ownProperty(tableId);
                expect(gOrphanTables.includes(tableName)).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should handle fails", function(done) {
            XIApi.deleteTable = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.exist;
                UnitTest.hasAlertWithTitle(StatusMessageTStr.DeleteResultSets);
                delete gTables[tableId];
                done();
            });
        });

        it("Should handle partial fail", function(done) {
            XIApi.deleteTable = function() {
                return PromiseHelper.reject(null);
            };

            TblManager.deleteTables(tableId, TableType.Active)
            .then(function() {
                UnitTest.hasAlertWithTitle(StatusMessageTStr.PartialDeleteResultSetFail);
                delete gTables[tableId];
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should handle fail with locked table", function(done) {
            XIApi.deleteTable = () => PromiseHelper.reject(null);

            TblManager.deleteTables([tableId2], TableType.Active)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithText("Table " + tableName2 + " was locked.\n");
                delete gTables[tableId2];
                done();
            });
        });

        it("Should handle partial fail with locked table", function(done) {
            XIApi.deleteTables = () => PromiseHelper.reject(null);

            TblManager.deleteTables([tableId, tableId2], TableType.Active)
            .then(function() {
                UnitTest.hasAlertWithText("Table " + tableName2 + " was locked.\n");
                delete gTables[tableId];
                delete gTables[tableId2];
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should handle full fail with locked table", function(done) {
            var deleteCalled = false;
            XIApi.deleteTable = function() {
                deleteCalled = true;
                return PromiseHelper.reject({
                    error: "Error: failll",
                    status: StatusT.StatusDagNodeNotFound
                });
            };

            TblManager.deleteTables([tableId, tableId2], TableType.Active)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(deleteCalled).to.be.true;
                UnitTest.hasAlertWithText("Table " + tableName2 + " was locked.\n" +
                    "Error: failll." +
                    " Table " + tableName + " was not deleted.");
                delete gTables[tableId];
                delete gTables[tableId2];
                done();
            });
        });

        after(function() {
            XIApi.deleteTables = oldFunc;
            XIApi.deleteTable = oldSingelDelete;
        });
    });

    describe("TblManager.restoreTableMeta Test", function() {
        it("should clean up tables exceeding size limit", function() {
            var cache = gDroppedTables;
            gDroppedTables = {};
            var tableName = "fakeTable#zz999";
            var tableId = "zz999";
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Dropped,
                "tableCols": [1, 2]
            });
            gDroppedTables[tableId] = table;

            var tableName2 = "x".repeat(1 * MB) + "fakeTable#zz9992";
            var tableId2 = "zz9992";
            var table2 = new TableMeta({
                "tableId": tableId2,
                "tableName": tableName2,
                "status": TableType.Dropped,
                "tableCols": [1,2]
            });
            gDroppedTables[tableId2] = table2;

            expect(Object.keys(gDroppedTables).length).to.equal(2);
            TblManager.restoreTableMeta(gDroppedTables);
            expect(Object.keys(gDroppedTables).length).to.equal(1);

            gDroppedTables = cache;
        });
    });

    describe("Table Related Api Test", function() {
        var dsName, tableName, tableId, nodeId;

        before(function(done){
            UnitTest.addAll(testDatasets.sp500, "sp500_tableManager_test")
            .then(function(resDS, resTable, tPrefix, _nodeId, _tabId) {
                dsName = resDS;
                tableName = resTable;
                tableId = xcHelper.getTableId(tableName);
                tabId = _tabId;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("TblManager.sortColumns should work", function() {
            var table = gTables[tableId];
            var colName = table.getCol(1).getFrontColName();
            TblManager.sortColumns(tableId, ColumnSortType.name, "reverse");
            var curColName = table.getCol(1).getFrontColName();
            expect(curColName).not.to.equal(colName);
        });

        it("Should reorder columns", function() {
            // it's hard coded
            var order = [1, 0, 2];
            var table = gTables[tableId];
            var colName = table.getCol(1).getFrontColName();
            TblManager.orderAllColumns(tableId, order);
            var curColName = table.getCol(1).getFrontColName();
            expect(curColName).not.to.equal(colName);
        });

        it("Should resize colum to content", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            // default to be true
            expect(progCol.sizedTo).to.be.equal("header");
            TblManager.resizeColumns(tableId, "contents", 1);
            expect(progCol.sizedTo).to.equal("header");
            progCol = table.getCol(1);
            expect(progCol.sizedTo).to.equal("contents");
        });

        it("Should resize column to header", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            TblManager.resizeColumns(tableId, "header");
            progCol = table.getCol(1);
            expect(progCol.sizedTo).to.equal("header");
        });

        it("Should resize column to fit all", function() {
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            progCol.sizedTo = "contents";
            TblManager.resizeColumns(tableId, "all", 1);
            progCol = table.getCol(1);
            expect(progCol.sizedTo).to.equal("all");
        });

        it("Should throw error in invalid resize", function() {
            try {
                TblManager.resizeColumns(tableId, "all", 1);
            } catch (error) {
                expect(error).to.exist;
            }
        });

        it("TblManager.resizeColsToWidth should work", function(done) {
            // use undo/redo to test it
            var table = gTables[tableId];
            var progCol = table.getCol(1);
            expect(progCol.sizedTo).to.equal("all");
            TblManager.resizeColumns(tableId, "contents", 1);
            progCol = table.getCol(1);
            expect(progCol.sizedTo).to.equal("contents");

            Log.undo()
            .then(function() {
                progCol = table.getCol(1);
                expect(progCol.sizedTo).to.equal("all");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        describe("Thead Listener Test", function() {
            it("Should open tableMenu", function() {
                var $menu = $("#tableMenu");
                $("#sqlTableArea .tableMenu").click();
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea .tableMenu").click();
                assert.isFalse($menu.is(":visible"));
            });
        });

        describe("Table Listener Test", function() {
            var $xcTableWrap;

            before(function() {
                $xcTableWrap = $("#xcTableWrap-" + tableId);
            });

            it("Should mousedown lockedTableIcon to cancel query", function() {
                var test = null;
                var oldFunc = QueryManager.cancelQuery;
                QueryManager.cancelQuery = function() {
                    test = true;
                };
                TblFunc.lockTable(tableId);

                var $icon = $xcTableWrap.find(".lockedTableIcon");
                expect($icon.length).to.equal(1);
                $icon.mousedown();
                expect(test).to.be.true;

                QueryManager.cancelQuery = oldFunc;
                TblFunc.unlockTable(tableId);
                expect($xcTableWrap.find(".lockedTableIcon").length)
                .to.equal(0);
            });

            // The following test is failing nondeterministically.
            // The non-ui based sort functionality is tested above.
            it.skip("Should Sort", function(done) {
                var hashVersion = $xcTableWrap.attr("data-id");
                var $sortIcon = $xcTableWrap.find(".sortAsc");

                $sortIcon.mousedown();
                $sortIcon.click();

                var checkFunc = function() {
                    return !$("#xcTableWrap-" + tableId).length && $(".xcTable").is(":visible");
                };
                UnitTest.testFinish(checkFunc)
                .then(function() {
                    $xcTableWrap = $(".xcTableWrap");
                    expect(hashVersion).not.to.equal($xcTableWrap.attr("data-id"));
                    tableId = $xcTableWrap.attr("data-id");
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("Should open dropdown on indexed column", function() {
                var oldOpen = MenuHelper.dropdownOpen;
                var opened = false;
                MenuHelper.dropdownOpen = function($el, $menu, options) {
                    opened = true;
                }
                const $table = $("#xcTable-" + tableId);
                var $th = $xcTableWrap.find("th.col1");
                var $dropdown = $th.find(".dropdownBox");
                var dropboxClickHandler = TblManager.__testOnly__.dropboxClickHandler;
                dropboxClickHandler($dropdown, $table, tableId, true)
                assert.isTrue(opened);
                $("#sqlTableArea").mousedown();
                MenuHelper.dropdownOpen = oldOpen;

            });

            after(function() {
                xcTooltip.hideAll();
            });
        });

        describe("Col Listener Test", function() {
            var $thead;

            before(function() {
                $thead = $("#xcTable-" + tableId).find("thead tr");
            });

            it("Should open menu by right click", function() {
                var $menu = $("#colMenu");
                // .eq(0) is empty
                $thead.find(".header").eq(1).contextmenu();
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should mousedown header to select a column", function() {
                var $header = $thead.find(".flexContainer").eq(1);
                $header.mousedown();
                expect($thead.find(".selectedCell").length).to.equal(1);
            });

            it("Should shift select column", function() {
                var $header = $thead.find(".flexContainer").eq(0);
                var e = jQuery.Event("mousedown", {"shiftKey": true});
                // unselect
                $header.trigger(e);
                expect($thead.find(".selectedCell").length).to.equal(2);
                // select
                $header.trigger(e);
                expect($thead.find(".selectedCell").length).to.equal(1);
            });

            it("Should mousedown dragArea to start drag", function() {
                var test = null;
                var oldFunc = TblAnim.startColDrag;
                TblAnim.startColDrag = function() {
                    test = true;
                };

                var $dragArea = $thead.find(".dragArea").eq(0);
                expect($dragArea.length).to.equal(1);
                $dragArea.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $dragArea.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;
                TblAnim.startColDrag = oldFunc;
            });

            it("Should mousedown editableHead to start drag", function() {
                var test = null;
                var oldFunc = TblAnim.startColDrag;
                TblAnim.startColDrag = function() {
                    test = true;
                };

                var $editableHead = $thead.find(".editableHead").eq(0);
                expect($editableHead.length).to.equal(1);
                $editableHead.mousedown();
                // only left mouse down works
                expect(test).to.be.null;

                $editableHead.trigger(fakeEvent.mousedown);
                expect(test).to.be.true;
                TblAnim.startColDrag = oldFunc;
            });
        });

        describe("Tbody Listener Test", function() {
            var $tbody;

            before(function() {
                $tbody = $("#xcTable-" + tableId).find("tbody");
            });

            it("Should mousedown on td to remove highlightBox", function() {
                var $td = $tbody.find(".row0 td.col1");
                var $menu = $("#cellMenu");
                // only left mouse down works
                $td.mousedown();
                assert.isFalse($menu.is(":visible"));
                $td.trigger(fakeEvent.mousedown);
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));

                var e = jQuery.Event("mousedown", {
                    "which": 1,
                    "shiftKey": true
                });
                $td.trigger(e);
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));

                // click on jsonElement should work
                $td = $tbody.find("td.jsonElement").eq(0);
                $td.trigger(fakeEvent.mousedown);
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should open dropdown", function() {
                var $td = $tbody.find(".row0 td.col1");

                var $menu = $("#cellMenu");
                var e = jQuery.Event("contextmenu", {"target": $td.get(0)});

                $tbody.trigger(e);
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("Should right click to open menu on multiple rows", function() {
                var $td = $tbody.find(".row0 td.col1");
                var $td2 = $tbody.find(".row0 td.col2");
                $td.click();
                var e = jQuery.Event("mousedown", {
                    "which": 1,
                    "shiftKey": true
                });
                $td2.trigger(e);
                var $menu = $("#cellMenu");
                e = jQuery.Event("contextmenu", {"target": $td.get(0)});

                $tbody.trigger(e);
                assert.isTrue($menu.is(":visible"));
                $("#sqlTableArea").mousedown();
                assert.isFalse($menu.is(":visible"));
            });

            it("TblManager.rehighlightCells should work.", function() {
                var $td = $tbody.find(".row0 td.col1");
                var $td2 = $tbody.find(".row3 td.col1");

                TblManager.highlightCell($td, tableId, 0, 1);
                TblManager.highlightCell($td2, tableId, 3, 1, {isShift: true});
                assert.isTrue($td.hasClass("highlightedCell") && $td2.hasClass("highlightedCell"));

                TblManager.rehighlightCells(tableId);
                assert.isTrue($td.hasClass("highlightedCell") && $td2.hasClass("highlightedCell"));
                TblManager.unHighlightCells();
            });

            it("TblManager.highlightCell should work", function() {
                TblManager.unHighlightCells();
                var $td = $tbody.find(".row0 td.col1");
                TblManager.highlightCell($td, tableId, 0, 1);

                expect($td.hasClass("highlightedCell")).to.be.true;
                expect($td.find(".highlightBox").length).to.equal(1);
                expect(gTables[tableId].highlightedCells[0][1]).to.be.an.object;
            });
        });

        after(function(done) {
            UnitTest.deleteTab(tabId)
            .then(function() {
                return  UnitTest.deleteAll(tableName, dsName);
            })
            .always(function() {
                Alert.forceClose();
                done();
            });
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});