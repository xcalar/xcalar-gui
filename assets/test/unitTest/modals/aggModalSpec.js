describe("AggModal Test", function() {
    var table;
    var $aggModal;
    var $quickAgg;
    var $corr;

    before(function() {
        console.clear();
        console.log("AggModal Test");
        $aggModal = $("#aggModal");
        $quickAgg = $("#aggModal-quickAgg");
        $corr = $("#aggModal-corr");

        const tableId = xcHelper.randName("test");
        const cols = [
            {name: "col1", type: ColumnType.integer},
            {name: "col2", type: ColumnType.integer},
            {name: "col3", type: ColumnType.float},
            {name: "col4", type: ColumnType.string},
            {name: "col5", type: ColumnType.boolean},
            {name: "col6", type: ColumnType.money}
        ];
        const progCols = cols.map((col) => ColManager.newPullCol(col.name, col.name, col.type));
        progCols.push(ColManager.newDATACol());
        table = new TableMeta({
            tableId,
            tableName: "test",
            tableCols: progCols
        });
        
        gTables[tableId] = table;

        UnitTest.onMinMode();
    });

    beforeEach(function() {
        // in case it's auto removed by garbage collection
        gTables[table.getId()] = table;
    });

    it("AggModal.Instance.corrAgg should work", async function(done) {
        const oldFunc = XIApi.aggregateWithEvalStr;
        let called = 0;
        XIApi.aggregateWithEvalStr = () => {
            called++;
            return PromiseHelper.resolve({"value": 0.5});
        };

        try {
            await AggModal.Instance.corrAgg(table.getId());
            expect(called).to.equal(3);
            expect($corr.is(":visible")).to.be.true;
            $aggModal.find(".close").click();
            expect($corr.is(":visible")).to.be.false;
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.aggregateWithEvalStr = oldFunc;
        }
    });

    it("AggModal.Instance.corrAgg should handle error case", async function(done) {
        const oldFunc = XIApi.aggregateWithEvalStr;
        let called = 0;
        XIApi.aggregateWithEvalStr = () => {
            called++;
            return PromiseHelper.reject({status: StatusT.StatusXdfDivByZero});
        };

        // clear cache
        AggModal.Instance._corrCache = {};
        try {
            await AggModal.Instance.corrAgg(table.getId());
            expect(called).to.equal(3);
            expect($corr.is(":visible")).to.be.true;
            expect($corr.find("span:contains(--)").length).to.be.at.least(1);
            $aggModal.find(".close").click();
            expect($corr.is(":visible")).to.be.false;
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.aggregateWithEvalStr = oldFunc;
        }
    });

    it("AggModal.Instance.quickAgg should work", async function(done) {
        const oldFunc = XIApi.aggregate;
        let called = 0;
        XIApi.aggregate = () => {
            called++;
            return PromiseHelper.resolve({"value": 10});
        };

        try {
            await AggModal.Instance.quickAgg(table.getId(), [1, 2, 3, 4, 5]);
            expect(called).to.equal(15);
            expect($quickAgg.is(":visible")).to.be.true;
            $aggModal.find(".close").click();
            expect($quickAgg.is(":visible")).to.be.false;
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.aggregate = oldFunc;
        }
    });

    it("AggModal.Instance.quickAgg should handle error case", async function(done) {
        const oldFunc = XIApi.aggregate;
        let called = 0;
        XIApi.aggregate = () => {
            called++;
            return PromiseHelper.reject({status: StatusT.StatusXdfDivByZero});
        };

        // clear cache
        AggModal.Instance._aggCache = {};
        try {
            await AggModal.Instance.quickAgg(table.getId(), [1, 2, 3, 4, 5]);
            expect(called).to.equal(15);
            expect($quickAgg.is(":visible")).to.be.true;
            expect($quickAgg.find("span:contains(--)").length).to.be.at.least(1);
            $aggModal.find(".close").click();
            expect($quickAgg.is(":visible")).to.be.false;
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.aggregate = oldFunc;
        }
    });

    after(function() {
        delete gTables[table.getId()];
        UnitTest.offMinMode();
    });
});