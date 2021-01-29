describe('RowManager Test', function() {
    before(function() {
        console.clear();
        console.log("RowManager Test");
    });

    it("RowManager.parseRowNum should work", function() {
        // case 1
        var $el = $('<div class="row1"></div>');
        var res = RowManager.parseRowNum($el);
        expect(res).to.equal(1);
         // case 2
        var $el = $('<div class="row2 tempRow"></div>');
        var res = RowManager.parseRowNum($el);
        expect(res).to.equal(2);
        // case 3 (normal to see the console.error)
        $el = $("<div></div>");
        res = RowManager.parseRowNum($el);
        expect(res).to.be.null;
        // case 4
        $el = $('<div class="column1"></div>');
        res = RowManager.parseRowNum($el);
        expect(res).to.be.null;
    });

    it("setAlert should work", function() {
        const rowManager = new RowManager();
        expect(rowManager.alert).to.be.true;
        rowManager.setAlert(false);
        expect(rowManager.alert).to.be.false;
    });

    describe("getFirstPage test", function() {
        let table;
        let rowManager;
        let oldXcalarSetAbsolute;
        let oldXcalarGetNextPage;
        
        before(function() {
            table = new TableMeta({
                tableId: "test",
                tableName: "test"
            });
            rowManager = new RowManager(table, $());
            oldXcalarSetAbsolute = XcalarSetAbsolute;
            oldXcalarGetNextPage = XcalarGetNextPage;
        });

        it("should return empty result if the rows to fetch is 0", async function(done) {
            table.resultSetCount = 0;
            try {
                const res = await rowManager.getFirstPage();
                expect(res.length).to.equal(0);
                done();
            } catch (e) {
                done(e);
            }
        });

        it("should fetch first page", async function(done) {
            let callSetAbsolute = false;
            let callGetNextPage = false;

            XcalarSetAbsolute = () => {
                callSetAbsolute = true;
                return PromiseHelper.resolve();
            };

            XcalarGetNextPage = () => {
                callGetNextPage = true;
                return PromiseHelper.resolve({
                    numValues: 1,
                    values: ["test"]
                });
            };

            table.resultSetCount = 10;
            try {
                const res = await rowManager.getFirstPage();
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal("test");
                expect(callSetAbsolute).to.be.false;
                expect(callGetNextPage).to.be.true;
                done();
            } catch (e) {
                done(e);
            }
        });

        it("should fetch first page with retry logic if failed", async function(done) {
            const oldXcalarMakeResultSetFromTable = XcalarMakeResultSetFromTable;
            let secondTry = false;

            XcalarGetNextPage = () => {
                if (secondTry) {
                    return PromiseHelper.resolve({
                        numValues: 1,
                        values: ["test"]
                    });
                } else {
                    return PromiseHelper.reject({
                        status: StatusT.StatusInvalidResultSetId
                    });
                }
            };

            XcalarMakeResultSetFromTable = () => {
                secondTry = true;
                return PromiseHelper.resolve({
                    resultSetId: "resultSetId",
                    resultSetCount: 1,
                    resultSetMax: 1
                });
            };
            
            table.resultSetCount = 10;
            try {
                const res = await rowManager.getFirstPage();
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal("test");
                done();
            } catch (e) {
                done(e);
            } finally {
                XcalarMakeResultSetFromTable = oldXcalarMakeResultSetFromTable;
            }
        });

        it("should show alert if fetch first page failed with unretryable error", async function(done) {
            let oldAlert = Alert.error;
            let called = false;
            Alert.error = () => { called = true; };
            XcalarGetNextPage = () => {
                return PromiseHelper.reject({
                    status: "testStatus"
                });
            };
            
            table.resultSetCount = 1;
            try {
                await rowManager.getFirstPage();
                done("fail");
            } catch (e) {
                expect(called).to.be.true;
                done();
            } finally {
                Alert.error = oldAlert;
            }
        });

        it("should not show alert if fetch first page failed but alert is turned off", async function(done) {
            let oldAlert = Alert.error;
            let called = false;
            Alert.error = () => { called = true; };
            XcalarGetNextPage = () => {
                return PromiseHelper.reject({
                    status: "testStatus"
                });
            };
            
            table.resultSetCount = 1;
            rowManager.setAlert(false);
            try {
                await rowManager.getFirstPage();
                done("fail");
            } catch (e) {
                expect(called).to.be.false;
                done();
            } finally {
                Alert.error = oldAlert;
            }
        });

        it("should fetch half rows if no buffer", async function(done) {
            let cnt = 0;
            XcalarGetNextPage = () => {
                cnt++;
                if (cnt === 1) {
                    return PromiseHelper.reject({
                        status: StatusT.StatusNoBufs
                    });
                } else {
                    return PromiseHelper.resolve({
                        numValues: 1,
                        values: ["test"]
                    });
                }
                
            };
            
            table.resultSetCount = 2;
            rowManager.setAlert(false);
            try {
                const res = await rowManager.getFirstPage();
                expect(res.length).to.equal(1);
                expect(res[0]).to.equal("test");
                expect(cnt).to.equal(2);
                done();
            } catch (e) {
                done(e);
            }
        });

        after(function() {
            XcalarSetAbsolute = oldXcalarSetAbsolute;
            XcalarGetNextPage = oldXcalarGetNextPage;
        });
    });

    describe("addRows Test", function() {
        let table;
        let rowManager;
        let oldXcalarSetAbsolute;
        let oldXcalarGetNextPage;
        
        before(function() {
            table = new TableMeta({
                tableId: "test",
                tableName: "test",
                tableCols: [],
            });
            rowManager = new RowManager(table, $());
            oldXcalarSetAbsolute = XcalarSetAbsolute;
            oldXcalarGetNextPage = XcalarGetNextPage;

            XcalarSetAbsolute = () => PromiseHelper.resolve();
            XcalarGetNextPage = () => PromiseHelper.resolve({
                numValues: 1,
                values: [JSON.stringify({"col": "test"})]
            });
        });

        it("should return null if start position is more than total rows", async function(done) {
            try {
                table.resultSetCount = 1;
                const res = await rowManager.addRows(10, 1, RowDirection.Top, {});
                expect(res).to.equal(null);
                done();
            } catch (e) {
                done(e);
            }
        });

        it("should add rows", async function(done) {
            try {
                table.resultSetCount = 100;
                table.scrollMeta = {base: 0}
                const res = await rowManager.addRows(10, 1, RowDirection.Top, {bulk: false});
                expect(res.numRowsToAdd).to.equal(1);
                expect(res.numRowsAdded).to.equal(1);
                done();
            } catch (e) {
                done(e);
            }
        });

        after(function() {
            XcalarSetAbsolute = oldXcalarSetAbsolute;
            XcalarGetNextPage = oldXcalarGetNextPage;
        });
    });

    it("canScroll should return false if no table", function() {
        const rowManager = new RowManager();
        expect(rowManager.canScroll()).to.be.false;
    });

    it("canScroll should return false if table is locked", function() {
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        table.isLocked = true;
        const rowManager = new RowManager(table);
        expect(rowManager.canScroll()).to.be.false;
    });

    it("canScroll should return false is scrolling", function() {
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        const $view = $('<div><div class="xcTable scrolling"></div></div>')
        const rowManager = new RowManager(table, $view);
        expect(rowManager.canScroll()).to.be.false;
    });

    it("canScroll should return true for normal case", function() {
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        const $view = $('<div><div class="xcTable"></div></div>')
        const rowManager = new RowManager(table, $view);
        expect(rowManager.canScroll()).to.be.true;
    });

    it("normalizeRowNum should work on NaN case", function() {
        const rowManager = new RowManager(null, $());
        expect(rowManager.normalizeRowNum("abc")).to.deep.equal([null, false]);
    });

    it("normalizeRowNum should work on non-integer case", function() {
        const rowManager = new RowManager(null, $());
        expect(rowManager.normalizeRowNum(1.1)).to.deep.equal([null, false]);
    });

    it("normalizeRowNum should on non-scroll and 0 row case", function() {
        const oldFunc = TblFunc.isTableScrollable;
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        const rowManager = new RowManager(table, $());
        TblFunc.isTableScrollable = () => false;
        table.resultSetMax = 0;
        expect(rowManager.normalizeRowNum(1)).to.deep.equal([0, false]);

        TblFunc.isTableScrollable = oldFunc;
    });

    it("normalizeRowNum should on non-scroll and 10 row case", function() {
        const oldFunc = TblFunc.isTableScrollable;
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        const rowManager = new RowManager(table, $());
        TblFunc.isTableScrollable = () => false;
        table.resultSetMax = 10;
        expect(rowManager.normalizeRowNum(1)).to.deep.equal([1, false]);

        TblFunc.isTableScrollable = oldFunc;
    });

    it("normalizeRowNum should work", function() {
        const oldFunc = TblFunc.isTableScrollable;
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        const rowManager = new RowManager(table, $());
        TblFunc.isTableScrollable = () => true;
        table.resultSetMax = 10;
        table.resultSetCount = 10;
        expect(rowManager.normalizeRowNum(5)).to.deep.equal([5, true]);

        TblFunc.isTableScrollable = oldFunc;
    });

    it("skipToRow should work", async function(done) {
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        table.resultSetCount = 1000;
        table.resultSetMax = 1000;
        const rowManager = new RowManager(table, $());
        const oldFunc = rowManager.addRows;
        let called = false;
        rowManager.addRows = (backRow, numRowsToAdd) => {
            called = true;
            expect(backRow).to.equal(30);
            expect(numRowsToAdd).to.equal(60);
            return PromiseHelper.resolve();
        };
        try {
            await rowManager.skipToRow(5, 10, 100, true);
            expect(called).to.be.true;
            done();
        } catch (e) {
            done(e);
        } finally {
            rowManager.addRows = oldFunc;
        }
    });

    it("getRowsAboveHeight work", function() {
        // rowheight change at row 2,4, and 43
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        table.rowHeights = {0: {2: 100, 4: 200}, 2: {43: 400}};
        const rowManager = new RowManager(table, $());
        expect(rowManager.getRowsAboveHeight(200)).to.equal((200 * 21) + (79 + 179 + 379));
        expect(rowManager.getRowsAboveHeight(40)).to.equal((40 * 21) + (79 + 179));
        expect(rowManager.getRowsAboveHeight(42)).to.equal((42 * 21) + (79 + 179));
        expect(rowManager.getRowsAboveHeight(43)).to.equal((43 * 21) + (79 + 179 + 379));
        expect(rowManager.getRowsAboveHeight(44)).to.equal((44 * 21) + (79 + 179 + 379));
    });

    it("getTotalRowNum should work", function() {
        const table = new TableMeta({
            tableId: "test",
            tableName: "test"
        });
        table.resultSetCount = 10;
        const rowManager = new RowManager(table, $());
        expect(rowManager.getTotalRowNum()).to.equal(10);
    });
});