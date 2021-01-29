describe("DagNodeSplit Test", () => {
    let node;

    before(() => {
        node = new DagNodeSplit({});
    });

    it("should be a split node", () => {
        expect(node.getType()).to.equal(DagNodeType.Split);
    });
});