describe("DagNodePlaceholder Test", function() {
    let node;

    before(function() {
        node = new DagNodePlaceholder({name: "test"});
    });

    it("should handle lineage change", function() {
        let columns = [];
        let res = node.lineageChange(columns);
        expect(res.columns).to.equal(columns);
        expect(res.changes.length).to.equal(0);
    });

    it("serialize info should include name", function() {
        let info = node.getSerializableObj();
        expect(info.name).to.equal("test");
    });

    it("_getColumnsUsedInInput should work", function() {
        expect(node._getColumnsUsedInInput()).to.equal(null);
    });
});