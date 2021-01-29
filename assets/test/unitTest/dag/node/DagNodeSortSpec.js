describe("Sort Dag Node Test", () => {
    let node;

    before(() => {
        console.log("Sort node test");
        node = new DagNodeSort({});
    });

    it("should be a sort node", () => {
        expect(node.getType()).to.equal(DagNodeType.Sort);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            "columns": [],
            "newKeys": [],
            outputTableName: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            "columns": ["test"],
            "newKeys": ["test1"],
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    describe("lineageChange", function() {
        before(() => {
            node = new DagNodeSort({});
        });

        it("normal lineage change should return 1 columns", function() {
            const testParam = {
                "columns": [{
                    "columnName": "col1",
                    "ordering": "Ascending"
                }],
                "newKeys": ["col1Renamed"],
                outputTableName: ""
            };
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            node.setParam(testParam);
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1Renamed");

            expect(res.changes.length).to.equal(1);
            expect(res.changes[0].from.getBackColName()).to.equal("col1");
            expect(res.changes[0].to.getBackColName()).to.equal("col1Renamed");
        });

        it("normal lineage change should return 1 columns", function() {
            const testParam = {
                "columns": [{
                    "columnName": "col1",
                    "ordering": "Ascending"
                }],
                "newKeys": ["col1"],
                outputTableName: ""
            };
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            node.setParam(testParam);
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1");

            expect(res.changes.length).to.equal(0);
        });

        it("normal lineage change should return 1 columns", function() {
            const testParam = {
                "columns": [{
                    "columnName": "col1",
                    "ordering": "Ascending"
                }],
                "newKeys": [""],
                outputTableName: ""
            };
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            node.setParam(testParam);
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1");

            expect(res.changes.length).to.equal(0);
        });

        it("normal lineage change should return 1 columns", function() {
            const testParam = {
                "columns": [{
                    "columnName": "prefix::col1",
                    "ordering": "Ascending"
                }],
                "newKeys": [""],
                outputTableName: ""
            };
            var progCol1 = new ProgCol({
                "backName": "prefix::col1",
                "type": "string"
            });
            node.setParam(testParam);
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1");

            expect(res.changes.length).to.equal(1);
            expect(res.changes[0].from.getBackColName()).to.equal("prefix::col1");
            expect(res.changes[0].to.getBackColName()).to.equal("col1");
        });

        it("normal lineage change should return 2 columns", function() {
            const testParam = {
                "columns": [{
                    "columnName": "prefix::col1",
                    "ordering": "Ascending"
                }],
                "newKeys": [""],
                outputTableName: ""
            };
            var progCol1 = new ProgCol({
                "backName": "prefix::col1",
                "type": "string"
            });
            var progCol2 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            node.setParam(testParam);
            let parentNode = new DagNodeMap({});
            node.parents = [parentNode]
            parentNode.getLineage = () => {
                return {
                    getColumns: () => [progCol1, progCol2]
                }
            };
            const res = node.lineageChange([progCol1, progCol2]);
            expect(res.columns.length).to.equal(2);

            expect(res.columns[0].getBackColName()).to.equal("prefix-col1");
            expect(res.columns[1].getBackColName()).to.equal("col1");

            expect(res.changes.length).to.equal(1);
            expect(res.changes[0].from.getBackColName()).to.equal("prefix::col1");
            expect(res.changes[0].to.getBackColName()).to.equal("prefix-col1");
        });
    });

    describe("applyColumnMapping", function() {
        it("column name should change", function() {
            node = new DagNodeSort({});
            const testParam = {
                "columns": [{
                    "columnName": "prefix::col1",
                    "ordering": "Ascending"
                }],
                "newKeys": [""],
                outputTableName: ""
            };
            node.setParam(testParam);

            node.applyColumnMapping({columns: {
                "prefix::col1": "renamedPrefix::col1"
            }});

            param = node.getParam();
            expect(param.columns.length).to.equal(1);
            expect(param.columns[0].columnName).to.equal("renamedPrefix::col1");
        });
        it("column name should not change", function() {
            node = new DagNodeSort({});
            const testParam = {
                "columns": [{
                    "columnName": "col1",
                    "ordering": "Ascending"
                }],
                "newKeys": ["col2"],
                outputTableName: ""
            };
            node.setParam(testParam);

            node.applyColumnMapping({columns: {
                "col2": "renamedCol"
            }});

            param = node.getParam();
            expect(param.columns.length).to.equal(1);
            expect(param.columns[0].columnName).to.equal("col1");
            expect(param.newKeys[0]).to.equal("col2");
        });
    });


    describe("other functions", function() {
        it("genParamHint should work", function() {
            const res = node._genParamHint();
            expect(res).to.equal("col1: Ascending");
        });
    });
});