describe("FileInfoModal Test", function() {
    var $modal;
    var modal;

    before(function() {
        $modal = $("#fileInfoModal");
        modal = FileInfoModal.Instance;
        UnitTest.onMinMode();
    });

    it("should show file info", function() {
        modal.show({
            name: "test.csv",
            attr: {
                size: 123,
                mtime: 456,
                isDirectory: false
            }
        });
        expect($modal.find(".modalHeader .text").text()).to.equal("test.csv");
        expect($modal.find(".fileIcon").hasClass("xi-csv-file")).to.be.true;
    });

    it("should show folder info", function() {
        modal.show({
            name: "test",
            attr: {
                size: 123,
                mtime: 456,
                isDirectory: true
            }
        });
        expect($modal.find(".modalHeader .text").text()).to.equal("test");
        expect($modal.find(".fileIcon").hasClass("xi-folder")).to.be.true;
    });

    it("should close modal", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
        expect($modal.find(".modalHeader .text").text()).to.equal("");
    });

    after(function() {
        UnitTest.offMinMode();
    });
});