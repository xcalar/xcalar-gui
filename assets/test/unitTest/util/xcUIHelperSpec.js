describe("xcUIHelper Test", function() {
    it("xcUIHelper.hasSelection should work", function() {
        xcUIHelper.removeSelectionRange();
        expect(xcUIHelper.hasSelection()).to.be.false;
        var $input = $("<input style='position:fixed; top: 0px; left:0px; z-index:99999;'>");
        $("body").append($input);
        $input.val(123);
        $input.focus().range(0,2);
        expect(xcUIHelper.hasSelection()).to.be.true;
        xcUIHelper.removeSelectionRange();
        expect(xcUIHelper.hasSelection()).to.be.false;
        $input.remove();
    });

    it("xcUIHelper.getValueFromCell should work", function() {
        // case 1
        const $header = $('<div class="header">' +
                        '<div class="test">' +
                            '<input class="editableHead" value="test">' +
                        '</div>' +
                    '</div>');

        expect(xcUIHelper.getValueFromCell($header.find(".test"), gColPrefix)).to.equal(gColPrefix + "test");

        // case 2
        const $table = $('<table>' +
                        '<td class="col1">' +
                            '<div class="test">' +
                                '<input class="editableHead col1" value="t2">' +
                            '</div>' +
                        '</td>' +
                    '</table>');

        expect(xcUIHelper.getValueFromCell($table.find(".test"),gColPrefix)).to.equal(gColPrefix + "t2");

        // case 3
        expect(xcUIHelper.getValueFromCell(null, gColPrefix)).to.equal("");

        // case 4
        expect(xcUIHelper.getValueFromCell($header.find(".notexist"), gColPrefix)).to.equal("");
    });

    it("xcUIHelper.fillInputFromCell should work", function() {
        // case 1
        var $header = $('<div class="header">' +
                        '<div class="test">' +
                            '<input class="editableHead" value="test">' +
                        '</div>' +
                    '</div>');

        var $input = $('<input class="argument" type="text">');
        $("body").append($input);
        xcUIHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal(gColPrefix + "test");

        // case 2
        var $table = $('<table>' +
                        '<td class="col1">' +
                            '<div class="test">' +
                                '<input class="editableHead col1" value="t2">' +
                            '</div>' +
                        '</td>' +
                    '</table>');

        xcUIHelper.fillInputFromCell($table.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal(gColPrefix + "t2");
        $input.remove();
        // case 3
        $input = $("<input>");
        $("body").append($input);
        xcUIHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $input.remove();
        // case 4
        $input = $('<input class="argument">');
        $("body").append($input);
        xcUIHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $input.remove();
        // case 5
        var $container = $('<div class="colNameSection">' +
                    '<input class="argument" type="text">' +
                    '</div>');
        $input = $container.find("input");
        $("body").append($container);
        xcUIHelper.fillInputFromCell($header.find(".test"), $input, gColPrefix);
        expect($input.val()).to.equal("");
        $container.remove();
    });

    it("xcUIHelper.disableMenuItem should work", function() {
        var $li = $('<li></li>');
        xcUIHelper.disableMenuItem($li);
        expect($li.hasClass('unavailable')).to.be.true;
    });

    it("xcUIHelper.styleNewLineChar should work", function() {
        expect(xcUIHelper.styleNewLineChar('\n\r'))
        .to.equal('<span class="newLine lineChar">\\n</span><span class="carriageReturn lineChar">\\r</span>');
    });

    describe("boldSuggest test", function() {
        it("should bold simple text correctly", function() {
            var htmlstr = "<li>Cats and Dogs</li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "and");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("Cats <strong>and</strong> Dogs");
            $html.remove();
        });

        it("should not bold unmatching text", function() {
            var htmlstr = "<li>Cats and Dogs</li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "you");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("Cats and Dogs");
            $html.remove();
        });

        it("should bold text without removing other tags", function() {
            var htmlstr = "<li><i></i>Cats and Dogs<i></i></li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "and");
            expect($html.text()).to.equal("Cats and Dogs");
            expect($html.html()).to.equal("<i></i>Cats <strong>and</strong> Dogs<i></i>");
            $html.remove();
        });

        it("should bold text without modifying other tags", function() {
            var htmlstr = "<li><i></i>newImd<i></i></li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "i");
            expect($html.text()).to.equal("newImd");
            expect($html.html()).to.equal("<i></i>new<strong>I</strong>md<i></i>");
            $html.remove();
        });

        it("should handle input text with erroneous characters", function() {
            var htmlstr = "<li><i></i>new/////)(I////\\md<i></i></li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "/////)(i////\\");
            expect($html.text()).to.equal("new/////)(I////\\md");
            expect($html.html()).to.equal("<i></i>new<strong>/////)(I////\\</strong>md<i></i>");
            $html.remove();
        });

        it("should handle input text with special characters", function() {
            var htmlstr = "<li><i></i>/workbook/user/[a].py<i></i></li>";
            var $html = $(htmlstr);
            xcUIHelper.boldSuggestedText($html, "/[a].");
            expect($html.text()).to.equal("/workbook/user/[a].py");
            expect($html.html()).to.equal("<i></i>/workbook/user<strong>/[a].</strong>py<i></i>");
            $html.remove();
        });
    });

    it("xcUIHelper.getLockIconHtml should work", function() {
        var loadWithStepHtml = xcUIHelper.getLockIconHtml(1, 1, false, true);
        var loadWithTextHtml = xcUIHelper.getLockIconHtml(1, 1, true, false);
        var searchHtml = xcUIHelper.getLockIconHtml(undefined, undefined, false,
                                                  false, true);
        expect(loadWithStepHtml.indexOf("cancelLoad")).to.be.gt(-1);
        expect(loadWithStepHtml.indexOf("stepText")).to.be.gt(-1);
        expect(loadWithTextHtml.indexOf("pctText")).to.be.gt(-1);
        expect(searchHtml.indexOf("cancelSearch")).to.be.gt(-1);
    });

        // XXX fails in jenkins
    it.skip("xcUIHelper.getTextWidth should work", function() {
        var res = xcUIHelper.getTextWidth(null, "test");
        expect(res).to.equal(72);

        // case 2
        res = xcUIHelper.getTextWidth(null, "testtest");
        expect(res).to.equal(96);

        // case 3
        // this don't have the 48px padding
        var $e = $("<input>");
        $e.css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcUIHelper.getTextWidth($e, "test");
        expect(res).to.equal(24);

        // case 4
        $e.val("test");
        res = xcUIHelper.getTextWidth($e);
        expect(res).to.equal(24);

        // case 5
        $e = $("<div>test</div>");
        $e.css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcUIHelper.getTextWidth($e);
        expect(res).to.equal(24);

        // case 6
        $e = $('<div class="truncated">' +
                '<div class="displayedData">test</div>' +
                '</div>');
        $e.find(".displayedData").css({
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600"
        });
        res = xcUIHelper.getTextWidth($e);
        expect(res).to.equal(24);
    });


    it("xcUIHelper.getColTypeIcon should work", function() {
        var func = xcUIHelper.getColTypeIcon;
        expect(func(DfFieldTypeT.DfInt64)).to.equal('xi-integer');
        expect(func(DfFieldTypeT.DfFloat64)).to.equal('xi-float');
        expect(func(DfFieldTypeT.DfString)).to.equal('xi-string');
        expect(func(DfFieldTypeT.DfBoolean)).to.equal('xi-boolean');
        expect(func(DfFieldTypeT.DfTimespec)).to.equal('xi-timestamp');
        expect(func(DfFieldTypeT.DfMoney)).to.equal('xi-money');
        expect(func(DfFieldTypeT.DfScalarObj)).to.equal('xi-mixed');
        expect(func(DfFieldTypeT.DfUnknown)).to.equal('xi-unknown');
    });

    it("xcUIHelper.getTypeIconFromColumnType should work", function() {
        var func = xcUIHelper.getTypeIconFromColumnType;
        expect(func(ColumnType.integer)).to.equal('xi-integer');
        expect(func(ColumnType.float)).to.equal('xi-float');
        expect(func(ColumnType.string)).to.equal('xi-string');
        expect(func(ColumnType.boolean)).to.equal('xi-boolean');
        expect(func(ColumnType.timestamp)).to.equal('xi-timestamp');
        expect(func(ColumnType.money)).to.equal('xi-money');
        expect(func(ColumnType.mixed)).to.equal('xi-mixed');
        expect(func("abc")).to.equal('xi-unknown');
    });

    it("xcUIHelper.showSuccess should work", function(done) {
        xcUIHelper.showSuccess("Hello");
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .msg").eq(0).text()).to.equal("Hello");
        done();
    });

    it("xcUIHelper.showSuccess should reset text", function(done) {
        xcUIHelper.showSuccess();
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .msg").eq(0).text()).to.not.equal("Hello");
        done();
    });

    it("xcUIHelper.showFail should work", function(done) {
        xcUIHelper.showFail("World");
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .msg").eq(1).text()).to.equal("World");
        done();
    });

    it("xcUIHelper.showFail should reset text", function(done) {
        xcUIHelper.showFail();
        assert.isTrue($("#successMessageWrap").is(":visible"));
        expect($("#successMessageWrap .msg").eq(1).text()).to.not.equal("World");
        done();
    });


    it("xcUIHelper.toggleListGridBtn should work", function() {
        var $btn = $('<button class="gridView">' +
                        '<i class="icon"></i>' +
                     '</button>');
        var listIcon = "xi-view-as-list-2";
        var gridIcon = "xi-grid-view";
        var $icon = $btn.find(".icon");
        xcUIHelper.toggleListGridBtn($btn, true);
        expect($btn.hasClass("gridView")).to.be.false;
        expect($btn.hasClass("listView")).to.be.true;
        expect($icon.hasClass(gridIcon)).to.be.true;
        expect($icon.hasClass(listIcon)).to.be.false;

        xcUIHelper.toggleListGridBtn($btn, false, false);
        expect($btn.hasClass("gridView")).to.be.true;
        expect($btn.hasClass("listView")).to.be.false;
        expect($icon.hasClass(gridIcon)).to.be.false;
        expect($icon.hasClass(listIcon)).to.be.true;

        // case 2
        $btn = $('<button class="gridView icon"></button>');
        xcUIHelper.toggleListGridBtn($btn, true);
        expect($btn.hasClass("gridView")).to.be.false;
        expect($btn.hasClass("listView")).to.be.true;
        expect($btn.hasClass(gridIcon)).to.be.true;
        expect($btn.hasClass(listIcon)).to.be.false;

        xcUIHelper.toggleListGridBtn($btn, false, false);
        expect($btn.hasClass("gridView")).to.be.true;
        expect($btn.hasClass("listView")).to.be.false;
        expect($btn.hasClass(gridIcon)).to.be.false;
        expect($btn.hasClass(listIcon)).to.be.true;
    });

    it("xcUIHelper.showRefreshIcon should work", function(done) {
        var $location = $("<div></div>");
        xcUIHelper.showRefreshIcon($location);
        expect($location.find(".refreshIcon").length).to.equal(1);
        setTimeout(function() {
            expect($location.find(".refreshIcon").length).to.equal(0);
            done();
        }, 2000);
    });

    it("xcUIHelper.toggleBtnInProgress should work", function() {
        var $btn = $("<button>test</button>");
        xcUIHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal("test........");
        expect($btn.find("icon").length).to.equal(0);
        xcUIHelper.toggleBtnInProgress($btn);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal("test");
        // true
        $btn = $('<button>' +
                    '<i class="icon"></i>' +
                    '<span class="text">test</span>' +
                '</button>');
        xcUIHelper.toggleBtnInProgress($btn, false);
        expect($btn.hasClass("btnInProgress")).to.be.true;
        expect($btn.text()).to.equal("test........");
        expect($btn.find(".icon").length).to.equal(0);
        xcUIHelper.toggleBtnInProgress($btn, false);
        expect($btn.hasClass("btnInProgress")).to.be.false;
        expect($btn.text()).to.equal("test");
        expect($btn.find(".icon").length).to.equal(1);
    });

    it("xcUIHelper.optionButtonEvent should work", function() {
        var test = null;
        var $container = $('<div>' +
                            '<button class="radioButton" data-option="test"></button>' +
                          '</div>');
        xcUIHelper.optionButtonEvent($container, function(option) {
            test = option;
        });
        var $radioButton = $container.find(".radioButton");
        $radioButton.click();
        expect($radioButton.hasClass("active")).to.be.true;
        expect(test).to.be.equal("test");
        // should ignore active event
        test = null;
        $radioButton.click();
        expect($radioButton.hasClass("active")).to.be.true;
        expect(test).to.be.null;
    });

    it("xcUIHelper.scrollToBottom should work", function() {
        var html = '<div id="scrollTest" style="position:fixed; top:0px; left:0px; z-index:999999; height:100px; width: 20px; overflow:hidden; overflow-y:scroll">' +
                        '<div id="scrollTest1" style="height:200px;"></div>' +
                        '<div id="scrollTest2" style="height:10px;"></div>' +
                    '</div>';
        $("body").append(html);
        var $outerDiv = $("#scrollTest");
        expect($outerDiv.scrollTop()).to.equal(0);
        expect($outerDiv.height()).to.equal(100);
        var el = document.elementFromPoint(1, 99);
        expect($(el).attr("id")).to.equal("scrollTest1");

        xcUIHelper.scrollToBottom($outerDiv);
        expect($outerDiv.scrollTop()).to.equal(110);
        el = document.elementFromPoint(1, 99);
        expect($(el).attr("id")).to.equal("scrollTest2");

        $("#scrollTest").remove();
    });

    it("xcUIHelper.disableTextSelection and xcUIHelper.reenableTextSelection should work", function() {
        xcUIHelper.disableTextSelection();
        expect($("#disableSelection").length).to.equal(1);
        xcUIHelper.reenableTextSelection();
        expect($("#disableSelection").length).to.equal(0);
    });


    it("xcUIHelper.enableSubmit and xcUIHelper.disableSubmit should work", function() {
        var $button = $("<button></button>");
        xcUIHelper.disableSubmit($button);
        expect($button.prop("disabled")).to.be.true;

        xcUIHelper.enableSubmit($button);
        expect($button.prop("disabled")).to.be.false;
    });

    it("xcUIHelper.insertText should work", function() {
        if (isBrowserMicrosoft) {
            return;
        }
        // case 1
        var $input = $("<input>");
        xcUIHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("");

        // case 2
        $input = $('<input type="number">');
        xcUIHelper.insertText($input, 5);
        expect($input.val()).to.be.equal("");

        // case 3
        $input = $('<input type="text">');
        xcUIHelper.insertText($input, "test");
        expect($input.val()).to.be.equal("test");

        // case 4
        $input = $('<input type="text" value="a">');
        xcUIHelper.insertText($input, "b");
        expect($input.val()).to.be.equal("b");

        // rest of test cases will use "append" option

        // case 5
        $input = $('<input type="text" value="a">');
        xcUIHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("b, a");

        // case 6
        $input = $('<input type="text" value=", a">');
        xcUIHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("b, a");

        // case 7
        $input = $('<input type="text">');
        xcUIHelper.insertText($input, "a", true);
        expect($input.val()).to.be.equal("a");

        // case 8
        $input = $('<input type="text" value="a">');
        // set cursor to end
        $input.focus().val("a").caret(1);
        xcUIHelper.insertText($input, "b", true);
        expect($input.val()).to.be.equal("a, b");

        // case 9
        $input = $('<input type="text" value="ab">');
        // set cursor to between a & b
        $input.focus().caret(1);
        xcUIHelper.insertText($input, "c", true);
        expect($input.val()).to.be.equal("ac, b");
    });

    it("xcUIHelper.sortHTML should work", function() {
        var a = '<div>a</div>';
        var b = '<div>b</div>';
        expect(xcUIHelper.sortHTML(a, b)).to.equal(-1);
        expect(xcUIHelper.sortHTML(b, a)).to.equal(1);

        // XXX case 2, it's actually weird
        a = '<div>c</div>';
        b = '<div>c</div>';
        expect(xcUIHelper.sortHTML(a, b)).to.equal(-1);
    });

    it("xcUIHelper.enableMenuItem should work", function() {
        var $li = $('<li class="unavailable"></li>');
        xcUIHelper.enableMenuItem($li);
        expect($li.hasClass('unavailable')).to.be.false;
    });

    it("xcUIHelper.getLoadingSectionHTML should work", function() {
        let html = xcUIHelper.getLoadingSectionHTML("test", "test2");
        expect(html).to.contains("test");
        expect(html).to.contains("test2");
    });

    it("xcUIHelper.expandListEvent should work", function() {
        let $list = $('<div class="listWrap">' +
                        '<div class="test">' +
                            '<div class="listInfo">' +
                                '<div class="expand"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
        $("#container").append($list);
        xcUIHelper.expandListEvent($list.find(".test"));
        let $expand = $list.find(".expand");
        $expand.click();
        expect($list.hasClass("active")).to.be.true;
        $expand.click();
        expect($list.hasClass("active")).to.be.false;
        $list.remove();
    });
});