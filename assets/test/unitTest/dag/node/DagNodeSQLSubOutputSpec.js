describe("DagNodeSQLSubOutput Test", function() {
    let node;
    let parentNode;

    before(function() {
        node = new DagNodeSQLSubOutput({});
        parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.beCompleteState();
        parentNode.setTable("testTable");
    });

    it("lineageChange should work", function() {
        let progCol = new ProgCol({});
        let res = node.lineageChange([progCol]);
        expect(res.columns.length).to.equal(1);
        expect(res.columns[0]).to.equal(progCol);
        expect(res.changes.length).to.equal(0);
    });

    it("getPortName should work", function() {
        expect(node.getPortName()).to.equal("Output");
    });

    it("getTable should work", function() {
        // case 1
        let res = node.getTable();
        expect(res).to.equal(null);
        // case 2
        node.connectToParent(parentNode, 0);
        res = node.getTable();
        expect(res).to.equal("testTable");

        node.disconnectFromParent(parentNode, 0);
    });

    it("getState should work", function() {
        // case 1
        let res = node.getState();
        expect(res).to.equal(DagNodeState.Unused);
        // case 2
        node.connectToParent(parentNode, 0);
        res = node.getState();
        expect(res).to.equal(DagNodeState.Complete);

        node.disconnectFromParent(parentNode, 0);
    });

    it("isConfigured should work", function() {
        // case 1
        let res = node.isConfigured();
        expect(res).to.equal(true);
        // case 2
        node.connectToParent(parentNode, 0);
        res = node.isConfigured();
        expect(res).to.equal(false);

        node.disconnectFromParent(parentNode, 0);
    });

    it("_getColumnsUsedInInput should work", function() {
        expect(node._getColumnsUsedInInput()).to.equal(null);
    });
});