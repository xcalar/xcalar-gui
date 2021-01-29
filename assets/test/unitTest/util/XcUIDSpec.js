describe("XcUID Test", () => {
    let uid;
    
    before(() => {
        uid = new XcUID("test");
    });

    it("should get count", () => {
        expect(uid.count).to.equal(0);
    });

    it("should generate id", () => {
        const id = uid.gen();
        expect(id.startsWith("test_")).to.be.true;
        const activeWKBNK = WorkbookManager.getActiveWKBK();
        const workbook = WorkbookManager.getWorkbook(activeWKBNK);
        if (workbook != null) {
            expect(id.includes(workbook.sessionId)).to.be.true;
        }
        expect(uid.count).to.equal(1);
    });

    it("should overwrite id", () => {
        uid.setGenerator(() => 1);
        expect(uid.gen()).to.equal(1);
    });
});