describe("Filter Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeFilter({});
    });

    it("should be an filter node", () => {
        expect(node.getType()).to.equal(DagNodeType.Filter);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            evalString: "",
            "outputTableName": ""
        });
    });

    it("should set parameter", () => {
        const testParam = {evalString: "eq(column, 1)",  "outputTableName": ""};
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should work", function() {
        var progCol1 = new ProgCol({
            "backName": "col1",
            "type": "string"
        });
        const res = node.lineageChange([progCol1]);
        expect(res.columns).to.deep.equal([progCol1]);
        expect(res.changes.length).to.equal(0);
    });

    it("genParamHint should work", function() {
        const res = node._genParamHint();
        expect(res).to.equal("eq(column, 1)");
    });


    it("applyColumnMapping should work", function() {
        node = new DagNodeFilter({});
        const testParam = {evalString: "eq(column, 1)"};
        node.setParam(testParam);

        let param = node.getParam();
        expect(param.evalString).to.equal("eq(column, 1)");

        node.applyColumnMapping({columns: {
            "column": "renamed"
        }});

        param = node.getParam();
        expect(param.evalString).to.equal("eq(renamed,1)");
    });

    it("getColumnUsedInInput should work", function(){
        const res = node._getColumnsUsedInInput();
        expect(res.size).to.equal(1);
        expect(res.has("renamed")).to.be.true;
    });
});