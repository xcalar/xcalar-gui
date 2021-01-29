describe("xcStringHelper Test", function() {
    it("xcStringHelper.replaceInsideQuote should work", function() {
        expect(xcStringHelper.replaceInsideQuote('a"b"c', '"')).to.equal("ac");
        expect(xcStringHelper.replaceInsideQuote("e'd\nf'g", "'")).to.equal("eg");
    });

    it("xcStringHelper.fullTextRegExKey should work", function() {
        var res = xcStringHelper.fullTextRegExKey("test");
        expect(res).to.equal("test$");
    });

    it("xcStringHelper.containRegExKey should work", function() {
        var res = xcStringHelper.containRegExKey("test");
        expect(res).to.equal(".*test.*");
    });

    it("xcStringHelper.getFileNamePattern should work", function() {
        // case 1
        var res = xcStringHelper.getFileNamePattern(null);
        expect(res).to.equal("");

        // case 2
        res = xcStringHelper.getFileNamePattern("test", false);
        expect(res).to.equal("test");

        // case 3
        res = xcStringHelper.getFileNamePattern("test", true);
        expect(res).to.equal("re:test");
    });

    it("xcStringHelper.listToEnglish should work", function() {
        var testCases = [{
            "list": ["a"],
            "expect": "a"
        }, {
            "list": ["a", "b"],
            "expect": "a and b",
        }, {
            "list": ["a", "b", "c"],
            "expect": "a, b, and c",
        }, {
            "list": [],
            "expect": ""
        }];

        testCases.forEach(function(testCase) {
            var res = xcStringHelper.listToEnglish(testCase.list);
            expect(res).to.equal(testCase.expect);
        });
    });

    it("xcStringHelper.capitalize should work", function() {
        // case 1
        var res = xcStringHelper.capitalize("test");
        expect(res).to.equal("Test");
        // case 2
        res = xcStringHelper.capitalize();
        expect(res).to.be.undefined;
    });

    it("xcStringHelper.replaceMsg should work", function() {
        // case 1
        var res = xcStringHelper.replaceMsg("<foo>", {
            "foo": "bar"
        });
        expect(res).to.equal("bar");
        // case 2
        res = xcStringHelper.replaceMsg("<foo>");
        expect(res).to.equal("<foo>");
        // case 3
        res = xcStringHelper.replaceMsg("<foo>", {
            "foo": null
        });
        expect(res).to.equal("<foo>");
    });

    it("xcStringHelper.replaceTemplate should work", function() {
        // Global replace
        expect(
            xcStringHelper.replaceTemplate('<1>abc<1>', {'<1>': '2'}, false)
        ).to.equal('2abc<1>');
        // First match replace
        expect(
            xcStringHelper.replaceTemplate('<1>abc<1>', {'<1>': '2'}, true)
        ).to.equal('2abc2');
        // Multiple replaces
        expect(
            xcStringHelper.replaceTemplate('<1>a<2>a<1>a<2>', {'<1>': '-1', '<2>': '-2'}, true)
        ).to.equal('-1a-2a-1a-2');
        // Regex replace
        expect(
            xcStringHelper.replaceTemplate('a12b45c0', {'[0-9]': 'D'}, true)
        ).to.equal('aDDbDDcD');
        // Invalid input
        expect(
            xcStringHelper.replaceTemplate('<1>abc<1>', {'<1>': null}, true)
        ).to.equal('<1>abc<1>');
        expect(
            xcStringHelper.replaceTemplate('<1>abc<1>', {'<1>': undefined}, true)
        ).to.equal('<1>abc<1>');
    });

    it("xcStringHelper.escapeDblQuoteForHtml should work", function() {
        var res = xcStringHelper.escapeDblQuoteForHTML('te"st\'ing"');
        expect(res).to.equal('te&quot;st\'ing&quot;');
    });

    it("xcStringHelper.escapeDblQuote should work", function() {
        var res = xcStringHelper.escapeDblQuote('te"st\'ing"');
        expect(res).to.equal('te\\"st\'ing\\"');
    });

    it('xcStringHelper.escapeNonPrintableChar should work', function() {
        var res = xcStringHelper.escapeNonPrintableChar(String.fromCharCode('feff'), '.');
        expect(res).to.equal('.');
        // case 2
        res = xcStringHelper.escapeNonPrintableChar('test', '.');
        expect(res).to.equal('test');
        // case 3
        res = xcStringHelper.escapeNonPrintableChar(null, '.');
        expect(res).to.equal(null);
    });

    it('xcStringHelper.escapeHTMLSpecialChar should work', function() {
        var res = xcStringHelper.escapeHTMLSpecialChar('&<>\tabc', false);
        expect(res).to.equal("&amp;&lt;&gt;	abc");
        // case 2
        res = xcStringHelper.escapeHTMLSpecialChar(null, false);
        expect(res).to.equal(null);
    });

    it("xcStringHelper.escapeRegExp should work", function() {
        // case 1
        var res = xcStringHelper.escapeRegExp("]");
        expect(res).to.equal("\\]");
        // case 2
        res = xcStringHelper.escapeRegExp("a");
        expect(res).to.equal("a");
    });

    it("xcStringHelper.isStartWithLetter should work", function() {
        // case 1
        var res = xcStringHelper.isStartWithLetter("12a");
        expect(res).to.be.false;
        // case 2
        res = xcStringHelper.isStartWithLetter("abc");
        expect(res).to.be.true;
        // case 3
        res = xcStringHelper.isStartWithLetter(null);
        expect(res).to.be.false;
        // case 4
        res = xcStringHelper.isStartWithLetter("");
        expect(res).to.be.false;
    });

    it("xcStringHelper.camelCaseToRegular should work", function() {
        var func = xcStringHelper.camelCaseToRegular;
        expect(func("a")).to.equal("A");
        expect(func("aB")).to.equal("A B");
        expect(func("ab")).to.equal("Ab");
        expect(func("AB")).to.equal("A B");
        expect(func("Ab")).to.equal("Ab");
        expect(func("AaBbC")).to.equal("Aa Bb C");
    });

    it("xcStringHelper.numToStr should work", function() {
        expect(xcStringHelper.numToStr(5)).to.equal("5");
        expect(xcStringHelper.numToStr(1234)).to.equal("1,234");
        expect(xcStringHelper.numToStr("1234")).to.equal("1,234");
        expect(xcStringHelper.numToStr(1.12345)).to.equal("1.123");
        expect(xcStringHelper.numToStr(1.12345, 5)).to.equal("1.12345");
        expect(xcStringHelper.numToStr(0.001, 2)).to.equal("1e-3");
        expect(xcStringHelper.numToStr(-0.001, 2)).to.equal("-1e-3");
        expect(xcStringHelper.numToStr(0, 2)).to.equal("0");
        expect(xcStringHelper.numToStr(null)).to.equal(null);
        expect(xcStringHelper.numToStr(undefined)).to.equal(undefined);
        expect(xcStringHelper.numToStr("not a num")).to.equal("not a num");
    });


});