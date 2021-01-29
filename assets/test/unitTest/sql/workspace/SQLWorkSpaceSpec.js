describe("SQLWorkSpace Test", () => {
    it("should be a singleton instance", () => {
        expect(SQLWorkSpace.Instance).to.be.instanceof(SQLWorkSpace);
    });

    it("should refresh", () => {
        let oldEditorRefresh = SQLEditorSpace.Instance.refresh;
        let oldHistoryRefresh = SQLHistorySpace.Instance.refresh;
        let called = 0;
        SQLEditorSpace.Instance.refresh = () => { called++; };
        SQLHistorySpace.Instance.refresh = () => { called++; };

        SQLWorkSpace.Instance.refresh();
        expect(called).to.equal(2);
        SQLEditorSpace.Instance.refresh = oldEditorRefresh;
        SQLHistorySpace.Instance.refresh = oldHistoryRefresh;
    });

    it("should focus", () => {
        let oldRefresh = SQLWorkSpace.Instance.refresh;
        let oldShow = SQLResultSpace.Instance.showTables;
        let called = 0;
        SQLWorkSpace.Instance.refresh = () => { called++; };
        SQLResultSpace.Instance.showTables = () => {};

        SQLWorkSpace.Instance.focus();
        expect(called).not.to.equal(2);

        SQLWorkSpace.Instance.refresh = oldRefresh;
        SQLResultSpace.Instance.showTables = oldShow;
    });
});