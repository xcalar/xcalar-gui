describe("Jupyter Dag Node Test", () => {
    let node;

    before(() => {
        console.log("Jupyter node test");
        node = new DagNodeJupyter({});
    });

    it("should be a jupyter node", () => {
        expect(node.getType()).to.equal(DagNodeType.Jupyter);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            numExportRows: 1000,
            renames: []
        });
    });

    it("should set parameter", () => {
        const testParam = {
            numExportRows: 500,
            renames: [{
                "sourceColumn": "a",
                "destColumn": "a_out"
            }]
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    describe("lineageChange", function() {
        before(() => {
            node = new DagNodeJupyter({});
        });

        it("normal lineage change should return 2 columns", function() {
            const testParam = {
                numExportRows: 500,
                renames: [{
                        "sourceColumn": "a",
                        "destColumn": "a_out"
                    },
                    {
                        "sourceColumn": "b",
                        "destColumn": "b"
                    }
                ]
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "a",
                "type": "float"
            });
            var progCol2 = new ProgCol({
                "backName": "b",
                "type": "string"
            });
            var progCol3 = new ProgCol({
                "backName": "c",
                "type": "boolean"
            });
            const res = node.lineageChange([progCol1, progCol2, progCol3]);
            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].getBackColName()).to.equal("a_out");
            expect(res.columns[0].getType()).to.equal("float");
            expect(res.columns[1].getBackColName()).to.equal("b");
            expect(res.columns[1].getType()).to.equal("string");

            expect(res.changes.length).to.equal(2);
            expect(res.changes[0].from.getBackColName()).to.equal("a");
            expect(res.changes[0].to.getBackColName()).to.equal("a_out");
            expect(res.changes[1].from.getBackColName()).to.equal("b");
            expect(res.changes[1].to.getBackColName()).to.equal("b");
        });


    });

    describe("show jupyter notebook", () => {
        before(() => {
            node = new DagNodeJupyter({});
        });
        it("should handle no table", () => {
            let cache = JupyterPanel.publishTable;
            let called = false;
            JupyterPanel.publishTable = () => {
                called = true;
            }
            node.showJupyterNotebook();
            expect(called).to.be.false;
            JupyterPanel.publishTable = cache;
        });
        it("should publish table when table is found", () => {
            let cache = JupyterPanel.publishTable;
            let called = false;
            JupyterPanel.publishTable = () => {
                called = true;
            };
            let cache2 = XcDagTableViewer.getTableFromDagNode;
            let called2 = false;
            XcDagTableViewer.getTableFromDagNode = () => {
                called2 = true;
            };

            node.getTable = () => {
                return "a";
            }

            node.showJupyterNotebook();

            expect(called).to.be.true;
            expect(called2).to.be.true;
            JupyterPanel.publishTable = cache;
            XcDagTableViewer.getTableFromDagNode = cache2;
        });
    });


    describe("other functions", function() {
        it("genParamHint should work", function() {
            let res = node._genParamHint();
            expect(res).to.equal("");

            const testParam = {
                numExportRows: 500,
                renames: [{
                        "sourceColumn": "a",
                        "destColumn": "a_out"
                    },
                    {
                        "sourceColumn": "b",
                        "destColumn": "b"
                    }
                ]
            };
            node.setParam(testParam);
            res = node._genParamHint();
            expect(res).to.equal("Columns: a,b");
        });
    });
});