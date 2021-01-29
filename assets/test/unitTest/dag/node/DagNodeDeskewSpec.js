describe("DagNodeDeskew Test", function() {
    it("should set column", function() {
        let node = new DagNodeDeskew({});
        node.setParam({"column": "test"});
        let input = node.getParam();
        expect(input.column).to.equal("test");
        expect(input.newKey).to.equal("");
    });

    it("should have lineage change", function() {
        let node = new DagNodeDeskew({});
        let col = new ProgCol({"backName": "prefix::test"});
        let res = node.lineageChange([col]);
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(0);
        // case 2
        let node2 = new DagNodeDeskew({});
        node2.setParam({"column": "prefix::test"});
        res = node2.lineageChange([col]);
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(1);
    });

    it("updateNewKey should work", function() {
        let node = new DagNodeDeskew({});
        expect(node.updateNewKey("test1")).to.equal("test1");
        // case 2
        node.setParam({"column": "prefix::test2"});
        expect(node.updateNewKey()).to.equal("test2");
        // case 3
        node.setParam({"column": "test3"});
        expect(node.updateNewKey()).to.equal("test3");
    });

    it("applyColumnMapping should work", function() {
        let node = new DagNodeDeskew({});
        node.setParam({"column": "prefix::test"});
        node.applyColumnMapping({columns: {"prefix::test": "prefix2::test"}});
        let param = node.getParam();
        expect(param.column).to.equal("prefix2::test");
    });

    it("_genParamHint should work", function() {
        let node = new DagNodeDeskew({});
        node.setParam({"column": "test"});
        let hint = node._genParamHint();
        expect(hint).to.equal("Index on: test");
        // case 2
        let node2 = new DagNodeIndex({});
        hint = node2._genParamHint();
        expect(hint).to.equal("");
    });

    it("_getColumnsUsedInInput should work", function() {
        let node = new DagNodeDeskew({});
        node.setParam({"column": "test"});
        expect(node._getColumnsUsedInInput().has("test")).to.equal(true);
    });
});