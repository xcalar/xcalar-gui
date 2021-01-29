describe("DagNodeOutOptimizable Test", () => {
    let node;

    before(() => {
        console.log("Dag Node Out Optimizable test");
        node = new DagNodeDFOut({subType: DagNodeSubType.DFOutOptimized});
    });

    it("should be an optimized node", () => {
        expect(node.isOptimized()).to.be.true;
    });

    it("should delete retina when in error state", () => {
        var called = false;

        node.registerEvents(DagNodeEvents.RetinaRemove, (info) => {
           called = true;
        })

        node.beErrorState("some error");
        expect(called).to.be.true;
    });
    it("should have option to not delete retina when in error state", () => {
        var called = false;
        node = new DagNodeDFOut({subType: DagNodeSubType.DFOutOptimized});
        node.registerEvents(DagNodeEvents.RetinaRemove, (info) => {
            debugger;
           called = true;
        })

        node.beErrorState("some error", true);
        expect(called).to.be.false;
    });
});