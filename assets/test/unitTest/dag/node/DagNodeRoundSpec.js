describe("DagNodeRound Test", () => {
    let node;

    before(() => {
        node = new DagNodeRound({});
    });

    it("should be a round node", () => {
        expect(node.getType()).to.equal(DagNodeType.Round);
    });
});