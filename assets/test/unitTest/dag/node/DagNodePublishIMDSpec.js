describe("PublishIMD Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodePublishIMD({});
    });

    it("should be a PublishIMD node", () => {
        expect(node.getType()).to.equal(DagNodeType.PublishIMD);
    });

    it("PublishIMD node should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            pubTableName: "",
            primaryKeys: [],
            operator: "",
            columns: [],
            overwrite: false
        });
    });

    it("PublishIMD node should set parameter", () => {
        const testParam = {
            pubTableName: "testTable2",
            primaryKeys: ["pk"],
            operator: "testCol",
            columns: ["test"],
            overwrite: true
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should return empty", () => {
        let res = node.lineageChange();
        expect(res.columns.length).to.equal(0);
        expect(res.changes.length).to.equal(0);
    });

    it("_genParamHint should work", function() {
        let hint = node._genParamHint();
        expect(hint).contains("testTable2");
    });

    it("_getColumnsUsedInInput returns null", function() {
        const columnsUsed = node._getColumnsUsedInInput();
        expect(columnsUsed).to.be.a('null');
    });
});