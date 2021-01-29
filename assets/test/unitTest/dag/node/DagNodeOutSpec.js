describe("DagNodeOut Test", function() {
    it("should be the correct instance", function() {
        let node = new DagNodeOut();
        expect(node).to.be.an.instanceof(DagNodeOut);
    });

    it("lineageChange should work", function() {
        let col = new ProgCol();
        let node = new DagNodeOut();
        let res = node.lineageChange([col]);
        expect(res.columns.length).to.equal(1);
        expect(res.columns[0]).to.equal(col);
        expect(res.changes.length).to.equal(0);
    });
});