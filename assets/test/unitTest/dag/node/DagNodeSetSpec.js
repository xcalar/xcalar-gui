describe("DagNodeSet Test", function() {
    let node;

    before(() => {
        node = new DagNodeSet({});
    });

    it("should be a set node", function() {
        expect(node.getType()).to.equal(DagNodeType.Set);
    });

    it("should get parameter", function() {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: [],
            dedup: false,
            outputTableName: ""
        });
    });

    it("should set parameter", function() {
        const testParam = {
            columns: [
                [{sourceColumn: "col1", destColumn: "union1", columnType: "string"},
                 {sourceColumn: "col2", destColumn: "union2", columnType: "string"}
                ],
            ],
            dedup: true,
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should work", function() {
        let parent = new DagNodeDataset({});
        parent.setSchema([
            {name: "col1", type: "string"},
            {name: "col3", type: "string"}
        ]);
        node.connectToParent(parent);

        let res = node.lineageChange();
        expect(res.columns.length).to.equal(2);
        expect(res.changes.length).to.equal(3);
    });

    it("applyColumnMapping should work", function() {
        let renameMap = {
            columns: {"col1": "newCol1"}
        };
        node.applyColumnMapping(renameMap, 0);
        let columns = node.getParam().columns;
        expect(columns[0][0].sourceColumn).to.equal("newCol1");
    });

    it("disconnectFromParent should work", function() {
        let parent = node.getParents()[0];
        node.disconnectFromParent(parent, 0);
        expect(node.getParam().columns.length).to.equal(0);
    });

    it("reinsertColumn should work", function() {
        node.reinsertColumn([{sourceColumn: "col1", destColumn: "union1", columnType: "string"}], 0);
        expect(node.getParam().columns.length).to.equal(1);
    });

    it("_genParamHint should work", function() {
        let hint = node._genParamHint();
        expect(hint).contains("1");
    });

    it("_getColumnsUsedInInput should work", function() {
        let set = node._getColumnsUsedInInput();
        expect(set.size).to.equal(1);
    });
});