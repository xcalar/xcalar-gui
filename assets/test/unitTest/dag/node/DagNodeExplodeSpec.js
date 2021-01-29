describe("DagNodeExplode Test", () => {
    let node;

    before(() => {
        node = new DagNodeExplode({});
    });

    it("should be a explode node", () => {
        expect(node.getType()).to.equal(DagNodeType.Explode);
    });
});