// XXX currently just testing dropdown positionings
describe("SchemaSelectionModal Test", function() {
    let $modal;
    before(function() {
        $modal =  $("#schemaSelectionModal");
    })
    it("should show", function(done) {
        expect($modal.is(":visible")).to.be.false;
        SchemaSelectionModal.Instance.show([{name: "test1", type: "string"}],
        [{name: "test1", type: "string"}], ()=>{});
        expect($modal.is(":visible")).to.be.true;
        setTimeout(function() {
            done();
        }, 300);
    });
    it("should have 1 row", function() {
        expect($modal.find(".content .part").length).to.equal(1);
        expect($modal.find(".part").find(".name input").eq(0).val()).to.equal("test1");
        expect($modal.find(".part").find(".type .text").eq(0).text()).to.equal("string");
    });
    it("column name dropdown should be positioned correctly", function() {
        let $list = $modal.find(".name.dropDownList .list");
        expect($list.is(":visible")).to.be.false;
        $modal.find(".name.dropDownList").eq(0).click();

        expect($list.is(":visible")).to.be.true;
        let rect = $modal.find(".name.dropDownList input")[0].getBoundingClientRect();
        expect($list[0].getBoundingClientRect().left).to.equal(rect.left);
        expect($list[0].getBoundingClientRect().top).to.equal(rect.top + rect.height);
        expect($list[0].getBoundingClientRect().right).to.equal(rect.right);
        expect($list[0].getBoundingClientRect().width).to.equal(rect.width);
    });

    it("dropdown should close", function() {
        let $list = $modal.find(".name.dropDownList .list");
        expect($list.is(":visible")).to.be.true;
        $(document).trigger(fakeEvent.mousedown);
        expect($list.is(":visible")).to.be.false;
    });

    it("type dropdown should be positioned correctly", function() {
        let $list = $modal.find(".type.dropDownList .list");
        expect($list.is(":visible")).to.be.false;
        $modal.find(".type.dropDownList").eq(0).click();

        expect($list.is(":visible")).to.be.true;
        let rect = $modal.find(".type.dropDownList .text")[0].getBoundingClientRect();
        expect($list[0].getBoundingClientRect().left).to.equal(rect.left);
        expect($list[0].getBoundingClientRect().top).to.equal(rect.top + rect.height);
        expect($list[0].getBoundingClientRect().right).to.equal(rect.right - 26);
        expect($list[0].getBoundingClientRect().width).to.equal(rect.width - 26);
    });

    it("dropdown should close", function() {
        let $list = $modal.find(".type.dropDownList .list");
        expect($list.is(":visible")).to.be.true;
        $(document).trigger(fakeEvent.mousedown);
        expect($list.is(":visible")).to.be.false;
    });

    after(function() {
        SchemaSelectionModal.Instance._close();
    });
});