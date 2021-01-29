describe("Synthesize Dag Node Test", () => {
    it("should set parameter", () => {
        let node = new DagNodeSynthesize({});
        const testParam = {
            colsInfo: [
                {
                    sourceColumn: 'mySourceColumn',
                    destColumn: 'myDestColumn',
                    columnType: 'myColumnType'
                }
            ],
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("should get parameter", function() {
        let node = new DagNodeSynthesize({});
        const param = node.getParam();
        expect(param).to.deep.equal({
            colsInfo: [],
            outputTableName: ""
        });
    });

    it("lineageChange should work with different columns", function() {
        let node = new DagNodeSynthesize({});
        let parent = new DagNodeDataset({});
        const testParam = {
            colsInfo: [
                {
                    sourceColumn: 'mySourceColumn',
                    destColumn: 'myDestColumn',
                    columnType: 'myColumnType'
                }
            ],outputTableName: ""
        };
        node.setParam(testParam);
        parent.setSchema([
            {name: "col1", type: "string"},
            {name: "col3", type: "string"}
        ]);
        node.connectToParent(parent);

        let res = node.lineageChange();
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(3);
    });

    it("lineageChange should work with overlapping columns", function() {
        let node = new DagNodeSynthesize({});
        let parent = new DagNodeDataset({});
        const testParam = {
            colsInfo: [
                {
                    sourceColumn: 'col1',
                    destColumn: 'myDestColumn',
                    columnType: 'myColumnType'
                }
            ],
            outputTableName: ""
        };
        node.setParam(testParam);
        parent.setSchema([
            {name: "col1", type: "string"},
            {name: "col3", type: "string"}
        ]);
        node.connectToParent(parent);

        let res = node.lineageChange();
        expect(res.columns.length).to.equal(1);
        expect(res.changes.length).to.equal(2);
    });

    it("_genParamHint should work", function() {
        let node = new DagNodeSynthesize({});
        const testParam = {
            colsInfo: [
                {
                    sourceColumn: 'mySourceColumn',
                    destColumn: 'myDestColumn',
                    columnType: 'myColumnType'
                }
            ],
            outputTableName: ""
        };
        node.setParam(testParam);
        let hint = node._genParamHint();
        expect(hint).contains("mySourceColumn");
    });

    it("_getColumnsUsedInInput returns null", function() {
        let node = new DagNodeSynthesize({});
        columnsUsed = node._getColumnsUsedInInput();
        expect(columnsUsed).to.be.a('null');
    });
});