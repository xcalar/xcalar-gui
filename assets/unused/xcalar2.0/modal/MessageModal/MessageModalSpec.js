describe("MessageModal Test", function() {
    let messageModal;
    let $modal;
    
    before(function() {
        UnitTest.onMinMode();
        messageModal = MessageModal.Instance;
        $modal = $("#messageModal");
    });

    it("should show modal", function() {
        messageModal.show({
            title: "title",
            msg: "msg",
            isAlert: true,
            isCheckBox: true
        });

        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".title .text").text()).to.equal("title");
        expect($modal.find(".message").text()).to.equal("msg");

        assert.isTrue($modal.find(".checkboxSection").is(":visible"));
        assert.isFalse($modal.find(".confirm").is(":visible"));
    });

    it("should toggle checkbox", function() {
        let $checkbox = $modal.find(".checkboxSection .checkbox");
        // default is unchecked
        expect($checkbox.hasClass("checked")).to.be.false;
        // to check
        $checkbox.click();
        expect($checkbox.hasClass("checked")).to.be.true;
        // to uncheck
        $checkbox.click();
        expect($checkbox.hasClass("checked")).to.be.false;
    });

    it("shoul close modal", function() {
        $modal.find(".cancel").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should call callback when close", function() {
        let called = false;
        messageModal.show({
            title: "title",
            msg: "msg",
            onConfirm: (hasChecked) => { called = hasChecked; }
        });

        let $confirm = $modal.find(".confirm");
        assert.isTrue($modal.find(".confirm").is(":visible"));
        // check checkbox
        let $checkbox = $modal.find(".checkboxSection .checkbox").click();
        $confirm.click();
        assert.isFalse($modal.find(".confirm").is(":visible"));
        expect(called).to.be.true;
    });

    after(function() {
        UnitTest.offMinMode();
    });
});