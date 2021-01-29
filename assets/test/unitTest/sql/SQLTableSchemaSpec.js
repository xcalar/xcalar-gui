describe("SQL Table Schema Test", function() {
    let id;
    let $div;
    let tableSchema;

    before(function() {
        id = xcHelper.randName("test");
        let div =
        '<div id="' + id + '">' +
            '<div class="topSection">' +
                '<div class="searchbarArea">' +
                    '<input>' +
                '</div>' +
            '</div>' +
            '<div class="mainSection">' +
                '<div class="content">' +
                    '<div class="row">' +
                        '<div class="name">test</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '<div>';
        $div = $(div);
        $("#container").append($div);
        tableSchema = new SQLTableSchema(id);
    });

    it("should be a correct instance", function() {
        expect(tableSchema).to.be.an.instanceof(SQLTableSchema);
    });

    it("should show", function() {
        $div.addClass("xc-hidden");
        let tableInfo = new PbTblInfo({
            name: "test",
            columns: [{"name": "col", "type": ColumnType.string}]
        });
        tableSchema.show(tableInfo);
        expect($div.hasClass("xc-hidden")).to.be.false;
        expect($div.find(".content .row").length).to.equal(1);
    });

    it("should show error", function() {
        $div.addClass("xc-hidden");
        tableSchema.showError("test");
        expect($div.hasClass("xc-hidden")).to.be.false;
        expect($div.find(".content .row").length).to.equal(0);
        expect($div.find(".content .error").text()).to.equal("test");
    });

    it("should close", function() {
        tableSchema.close();
        expect($div.hasClass("xc-hidden")).to.be.true;
    });

    after(function() {
        $div.remove();
    });
});