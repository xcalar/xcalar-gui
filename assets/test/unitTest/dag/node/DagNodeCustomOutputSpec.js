describe("DagNodeCustomOutput Test", () => {
    describe('constructor() should work', () => {
        it("default values", () => {
            const node = new DagNodeCustomOutput({});
            expect(node.getType()).to.equal(DagNodeType.CustomOutput);
            expect(node.maxParents).to.equal(1);
            expect(node.minParents).to.equal(1);
            expect(node.maxChildren).to.equal(0);
        });
    });

    describe('setter/getter should work', () => {
        it('getPortName', () => {
            const node = new DagNodeCustomOutput({});
            expect(node.getPortName()).to.equal('Output');
        });

        it('isConfigured', () => {
            const node = new DagNodeCustomOutput({});
            // All parents are configured
            node.getParents = () => ([1,2,3].map(() => ({
                isConfigured: () => true
            })));
            expect(node.isConfigured()).to.equal(true);
            // Some parents are not configured
            node.getParents = () => ([1,2,3].map((v) => ({
                isConfigured: () => (v !== 2)
            })));
            expect(node.isConfigured()).to.equal(false);
            // Some parents are null
            node.getParents = () => ([1,2,3].map((v) => {
                return v === 2? null: { isConfigured: () => true };
            }));
            expect(node.isConfigured()).to.equal(false);
        });

        it('getState', () => {
            const node = new DagNodeCustomOutput();
            // No parents
            expect(node.getState()).to.equal(DagNodeState.Unused);
            // Has parent
            const expectedState = DagNodeState.Running;
            node.getParents = () => ([{
                getState: () => expectedState
            }]);
            expect(node.getState()).to.equal(expectedState);
        });
    });

    describe('lineageChange() should work', () => {
        it('test', () => {
            const node = new DagNodeCustomOutput();
            const columns = [1,2,3,4,5];
            expect(node.lineageChange(columns)).to.deep.equal({
                columns: columns, changes: []
            });
        });
    });
});