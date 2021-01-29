describe("DagNodeIndex Test", function() {
    let node;

    before(function() {
        node = new DagNodeIndex({});
    });

    it("should have lineage change", function() {
        let col = new ProgCol({"backName": "test"});
        let res = node.lineageChange([col]);
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(0);
    });

    it("getSerializableObj should include columns", function() {
        let col = new ProgCol({"backName": "test"});
        node.columns = [col];
        let res = node.getSerializableObj();
        expect(res.columns.length).to.equal(1);
    });

    it("_genParamHint should work", function() {
        let hint = node._genParamHint();
        expect(hint).to.equal("");
        // case 2
        let node2 = new DagNodeIndex({
            input: {
                columns: ["test`"]
            }
        });
        hint = node2._genParamHint();
        expect(hint).to.contains("test");
    });

    it("_getColumnsUsedInInput should work", function() {
        expect(node._getColumnsUsedInInput()).to.equal(null);
    });
});