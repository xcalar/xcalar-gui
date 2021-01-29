describe("Workbook Info Modal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#workbookInfoModal");
        UnitTest.onMinMode();
    });

    it("should open modal", function() {
        var workbookId = WorkbookManager.getActiveWKBK();
        var workbook = WorkbookManager.getWorkbook(workbookId);
        WorkbookInfoModal.show(workbookId);

        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".description input").val())
        .to.equal(workbook.getDescription() || "");
    });

    it("should click cancel to close modal", function() {
        $modal.find(".cancel").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should click confirm to submit", function() {
        var workbookId = WorkbookManager.getActiveWKBK();
        WorkbookInfoModal.show(workbookId);
        assert.isTrue($modal.is(":visible"));

        var test = false;
        var oldFunc = WorkbookPanel.edit;
        WorkbookPanel.edit = function() {
            test = true;
        };

        $modal.find(".confirm").click();
        expect(test).to.be.true;
        assert.isFalse($modal.is(":visible"));
        WorkbookPanel.edit = oldFunc;
    });

    after(function() {
        UnitTest.onMinMode();
    });
});