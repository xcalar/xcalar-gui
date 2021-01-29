describe("TblFunc Test", function() {
    it("TblFunc.lockTable and TblFunc.unlockTable should work", function() {
        gTables["xcTest"] = new TableMeta({
            "tableId": "xcTest",
            "tableName": "test"
        });

        TblFunc.lockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.true;

        TblFunc.unlockTable("xcTest");
        expect(gTables["xcTest"].hasLock()).to.be.false;

        delete gTables["xcTest"];
    });

});