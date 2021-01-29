describe("DagNodeSQLSubInput Test", function() {
    let node;
    let sqlNode1;
    let sqlNode2;
    let parentNode;

    before(function() {
        node = new DagNodeSQLSubInput({});
        parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([{name: "test", type: ColumnType.string}]);
        parentNode.getParamHint = () => {
            return {hint: "test", fullHint: "test"}
        };
        parentNode.beCompleteState();
        parentNode.setTable("testTable");
        sqlNode1 = {
            getInputParent: () => null
        };
        sqlNode2 = {
            getInputParent: () => parentNode,
            getInputIndex: () => 0,
        };
    });

    it("lineageChange should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.lineageChange();
        expect(res).to.deep.equal({columns: [], changes: []});
        // case 2
        node.setContainer(sqlNode1);
        res = node.lineageChange();
        expect(res).to.deep.equal({columns: [], changes: []});
        // case 3
        node.setContainer(sqlNode2);
        res = node.lineageChange();
        expect(res.columns.length).to.equal(1);
    });

    it("getHiddenColumns should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.getHiddenColumns();
        expect(res.size).to.equal(0);
        // case 2
        node.setContainer(sqlNode1);
        res = node.getHiddenColumns();
        expect(res.size).to.equal(0);
        // case 3
        node.setContainer(sqlNode2);
        res = node.getHiddenColumns();
        expect(res.size).to.equal(0);
    });

    it("getPortName should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.getPortName();
        expect(res).to.equal("Input");
        // case 2
        node.setContainer(sqlNode2);
        res = node.getPortName(true);
        expect(res).to.equal("Dataset");
        // case 3
        node.setContainer(sqlNode2);
        res = node.getPortName();
        expect(res).to.equal("Input#1");
    });

    it("getParamHint should work", function() {
        // case 1
        node.setContainer(sqlNode2);
        let res = node.getParamHint(true);
        expect(res).to.deep.equal({"hint": "test", "fullHint": "test"});

        // case 2
        res = node.getParamHint(false);
        expect(res).to.deep.equal({"hint": "", "fullHint": ""});
    });

    it("getInputParent should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.getInputParent();
        expect(res).to.equal(null);
        // case 2
        node.setContainer(sqlNode2);
        res = node.getInputParent();
        expect(res).to.equal(parentNode);
    });

    it("getTable should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.getTable();
        expect(res).to.equal(null);
        // case 2
        node.setContainer(sqlNode1);
        res = node.getTable();
        expect(res).to.equal(null);
        // case 3
        node.setContainer(sqlNode2);
        res = node.getTable();
        expect(res).to.equal("testTable");
    });

    it("getState should work", function() {
        // case 1
        node.setContainer(null);
        let res = node.getState();
        expect(res).to.equal(DagNodeState.Unused);
        // case 2
        node.setContainer(sqlNode1);
        res = node.getState();
        expect(res).to.equal(DagNodeState.Unused);
        // case 3
        node.setContainer(sqlNode2);
        res = node.getState();
        expect(res).to.equal(DagNodeState.Complete);
    });

    it("_getColumnsUsedInInput should work", function() {
        let res = node._getColumnsUsedInInput();
        expect(res).to.equal(null);
    });
});