describe("Dataset Dag Node Test", () => {
    it("should be a dataset node", () => {
        let node = new DagNodeDataset({});
        expect(node.getType()).to.equal(DagNodeType.Dataset);
    });

    it("should get parameter", () => {
        let node = new DagNodeDataset({});
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            prefix: "",
            synthesize: false,
            loadArgs: ""
        });
    });

    it("should set parameter", () => {
        let node = new DagNodeDataset({});
        const testParam = {
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("Should get DSName correctly", () => {
            let node = new DagNodeDataset({});
            const testParam = {
                source: "datasetName",
                prefix: "test",
                synthesize: false,
                loadArgs: ""
            };
            node.setParam(testParam);
            expect(node.getDSName()).to.equal("datasetName");
    });

    it("Should get loadArgs correctly", () => {
        let node = new DagNodeDataset({});
        const testParam = {
            source: "datasetName",
            prefix: "test",
            synthesize: false,
            loadArgs: "loadArgs"
        };
        node.setParam(testParam);
        expect(node.getLoadArgs()).to.equal("loadArgs");
    });


    it("_genParamHint should work", function() {
        let node = new DagNodeDataset({});
        node.setParam({
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: ""
        });
        let res = node._genParamHint();
        expect(res).include("dataset1");
    });

    it("_getColumnsUsedInInput should work", function() {
        let node = new DagNodeDataset({});
        expect(node._getColumnsUsedInInput()).to.be.null;
    });

    it("Should get schema correctly", () => {
        let node = new DagNodeDataset({});
        let res = node.getSchema();
        expect(res).to.deep.equal([]);
    });

    it("Should set schema correctly", () => {
        let node = new DagNodeDataset({});
        node.setSchema([{name: "test", type: ColumnType.string}]);
        let res = node.getSchema();
        expect(res).to.deep.equal([{name: "test", type: ColumnType.string}]);
    });

    it("lineageChange should work", function() {
        let node = new DagNodeDataset({});
        node.setSchema([{name: "test", type: ColumnType.string}]);
        let res = node.lineageChange();
        expect(res.columns.length).to.equal(1);
        expect(res.columns[0].getBackColName()).to.equal("test");
        expect(res.changes.length).to.equal(0);
    });
});