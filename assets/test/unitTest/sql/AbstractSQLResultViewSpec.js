describe("AbstractSQLResultView Test", function() {
    let id;
    let $div;
    let resultView

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
        resultView = new AbstractSQLResultView(id);
    });

    it("should be a instanceof AbstractSQLResultView", function() {
        expect(resultView).to.be.instanceof(AbstractSQLResultView);
    });

    it("should get container", function() {
        let $container = resultView._getContainer();
        expect($container.length).to.equal(1);
    });

    it("should get top section", function() {
        let $topSection = resultView._getTopSection();
        expect($topSection.length).to.equal(1);
    });

    it("should get main section", function() {
        let $mainSection = resultView._getMainSection();
        expect($mainSection.length).to.equal(1);
    });

    it("should get main content", function() {
        let $mainContent = resultView._getMainContent();
        expect($mainContent.length).to.equal(1);
    });

    it("should get search input", function() {
        let $input = resultView._getSearchInput();
        expect($input.length).to.equal(1);
    });

    it("should filter tables", function() {
        let $input = resultView._getSearchInput();
        let $row = resultView._getMainContent().find(".row");
        expect($row.length).to.equal(1);
        // should hide
        $input.val("random");
        resultView._filterTables();
        expect($row.hasClass("xc-hidden")).to.be.true;
        // should display
        $input.val("t");
        resultView._filterTables();
        expect($row.hasClass("xc-hidden")).to.be.false;
        // should display
        $row.addClass("xc-hidden");
        $input.val("");
        resultView._filterTables();
        expect($row.hasClass("xc-hidden")).to.be.false;
    });

    it("should getColumnsWidth", function() {
        let $row = $("<div></div>");
        let res = resultView._getColumnsWidth($row);
        expect(res).to.equal(null);
        
        $row = $("<div><div>test</div></div>");
        res = resultView._getColumnsWidth($row);
        expect(res).to.be.an("array");
        expect(res.length).to.equal(1);
    });

    after(function() {
        $div.remove();
    });
});