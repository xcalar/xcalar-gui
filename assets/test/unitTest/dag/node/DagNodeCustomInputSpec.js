describe("DagNodeCustomInput Test", () => {
    describe('constructor() should work', () => {
        it("default values", () => {
            const node = new DagNodeCustomInput({});
            expect(node.getType()).to.equal(DagNodeType.CustomInput);
            expect(node.maxParents).to.equal(0);
            expect(node.minParents).to.equal(0);
        });
    });

    describe('setter/getter should work', () => {
        it('set/getContainer', () => {
            const node = new DagNodeCustomInput({});
            const expectedContainer = {};
            node.setContainer(expectedContainer);
            expect(node._container).to.equal(expectedContainer);
            expect(node.getContainer()).to.equal(expectedContainer);
        });

        it('getPortName', () => {
            const node = new DagNodeCustomInput({});
            // no container
            expect(node.getPortName()).to.equal('Input');
            // has container
            node.setContainer({
                getInputIndex: () => 1
            });
            expect(node.getPortName()).to.equal('Input#2');
        });

        it('isConfigured', () => {
            const node = new DagNodeCustomInput({});
            node.configured = false;
            // should always be true
            expect(node.isConfigured()).to.equal(true);
        });
    });

    describe('lineageChange() should work', () => {
        it('Case: no input parent', () => {
            const node = new DagNodeCustomInput({});
            node.setContainer({
                getInputParent: () => null
            });
            expect(node.lineageChange()).to.deep.equal({
                columns: [], changes: []
            });
        });

        it('Case: no lineage of input parent', () => {
            const node = new DagNodeCustomInput({});
            node.setContainer({
                getInputParent: () => ({
                    getLineage: () => null
                })
            });
            expect(node.lineageChange()).to.deep.equal({
                columns: [], changes: []
            });
        });

        it('Case: normal case', () => {
            const columns = [1,2,3,4];
            const node = new DagNodeCustomInput({});
            node.setContainer({
                getInputParent: () => ({
                    getLineage: () => ({ getColumns: () => columns })
                })
            });
            expect(node.lineageChange()).to.deep.equal({
                columns: columns, changes: []
            });
        });
    });
});