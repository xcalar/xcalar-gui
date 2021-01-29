describe("DagLineage Test", () => {
    it("should create an instanceof DagLineage", () => {
        let lineage = new DagLineage(null);
        expect(lineage).to.be.instanceof(DagLineage);
    });

    it("should set columns", () => {
        let lineage = new DagLineage(null);
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        lineage.setColumns([progCol]);
        let columns = lineage.getColumns(false);
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal(progCol);
    });

    it("should reset columns", () => {
        let node = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        node.setSchema([]);
        let lineage = new DagLineage(node);
        let progCol = ColManager.newPullCol("test", "test", ColumnType.integer);
        lineage.setColumns([progCol]);
        // reset
        lineage.reset();
        let columns = lineage.getColumns(false);
        expect(columns.length).to.equal(0);
    });

    it("should get prefix columns", () => {
        let lineage = new DagLineage(null);
        let progCol1 = ColManager.newPullCol("test", "a::test", ColumnType.integer);
        let progCol2 = ColManager.newPullCol("test2", "test2", ColumnType.integer);
        lineage.setColumns([progCol1, progCol2]);
        let columns = lineage.getPrefixColumns();
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal("a::test");
    });

    it("should get derived columns", () => {
        let lineage = new DagLineage(null);
        let progCol1 = ColManager.newPullCol("test", "a::test", ColumnType.integer);
        let progCol2 = ColManager.newPullCol("test2", "test2", ColumnType.integer);
        lineage.setColumns([progCol1, progCol2]);
        let columns = lineage.getDerivedColumns();
        expect(columns.length).to.equal(1);
        expect(columns[0]).to.equal("test2");
    });


    it("should get column from lineage", () => {
        let node = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        node.setSchema([{name: "test", type: ColumnType.integer}]);
        let lineage = new DagLineage(node);
        let columns = lineage.getColumns();
        expect(columns.length).to.equal(1);
        let progCol = columns[0];
        expect(progCol.getBackColName()).to.equal("test");
        expect(progCol.getType()).to.equal(ColumnType.integer);
    });

    it("should get changes", () => {
        let parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([]);
        let node = DagNodeFactory.create({
            type: DagNodeType.Map
        });
        node.connectToParent(parentNode);
        node.setParam({
            eval: [{
                evalString: "add(1, 1)",
                newField: "test"
            }],
            icv: false
        })
        let lineage = new DagLineage(node);
        let changes = lineage.getChanges();
        expect(changes.length).to.equal(1);
    });

    it("should get column history", () => {
        let parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([]);
        let node = DagNodeFactory.create({
            type: DagNodeType.Map
        });
        node.connectToParent(parentNode);
        node.setParam({
            eval: [{
                evalString: "add(1, 1)",
                newField: "test"
            }],
            icv: false
        })
        let lineage = new DagLineage(node);
        let history = lineage.getColumnHistory("test");
        expect(history.length).to.equal(1);
        expect(history[0].type).to.equal("add");
        expect(history[0].colName).to.equal("test");
        expect(history[0].childId).to.equal(null);
        expect(history[0].change).to.equal(null);
        expect(history[0].id).to.equal(node.getId());
    });

    it("should get hidden columns", () => {
        let parentNode;
        let node;
        let lineage;
        parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([{name: "test1", type: ColumnType.integer}, {name: "test2", type: ColumnType.string}]);
        node = DagNodeFactory.create({
            type: DagNodeType.Map
        });
        node.connectToParent(parentNode);
        node.setParam({
            eval: [{
                evalString: "add(test1, 1)",
                newField: "test3"
            }],
            icv: false
        });
        lineage = new DagLineage(node);

        node.getColumnDeltas = () => {
            return new Map([["test1", {isHidden: true, type: ColumnType.integer}]])
        };
        let res = lineage.getHiddenColumns();
        expect(res.size).to.equal(1);
        expect(res.get("test1").getType()).to.equal(ColumnType.integer);
    });

    it("should get hidden columns in linked in node", () => {
        let parentNode;
        let node;
        let childNode;
        let lineage;
        parentNode = DagNodeFactory.create({
            type: DagNodeType.Dataset
        });
        parentNode.setSchema([{name: "test1", type: ColumnType.integer}, {name: "test2", type: ColumnType.string}]);
        node = DagNodeFactory.create({
            type: DagNodeType.DFOut
        });
        node.connectToParent(parentNode);
        node.setParam({
            name: "a",
            linkAfterExecution: true,
            columns: []
        });

        childNode = DagNodeFactory.create({
            type: DagNodeType.DFIn
        });

        childNode.setParam({
            dataflowId: "self",
            linkOutName: "a",
            source: "",
            schema: [{name: "test1", type: ColumnType.integer}, {name: "test2", type: ColumnType.string}]
        });
        childNode.getLinkedNodeAndGraph = () => {
            return {node};
        };
        lineage = new DagLineage(childNode);

        node.getColumnDeltas = () => {
            return new Map([["test1", {isHidden: true, type: ColumnType.integer}]])
        };
        let res = lineage.getHiddenColumns();
        expect(res.size).to.equal(1);
        expect(res.get("test1").getType()).to.equal(ColumnType.integer);
    });

    describe("_update", () => {
        let parentNode;
        let node;
        let lineage;
        before(() => {
            parentNode = DagNodeFactory.create({
                type: DagNodeType.Dataset
            });
            parentNode.setSchema([{name: "test1", type: ColumnType.integer}, {name: "test2", type: ColumnType.string}]);
            node = DagNodeFactory.create({
                type: DagNodeType.Map
            });
            node.connectToParent(parentNode);
            node.setParam({
                eval: [{
                    evalString: "add(test1, 1)",
                    newField: "test3"
                }],
                icv: false
            });
            lineage = new DagLineage(node);
        });
        it("_update with hidden column should work", () => {
            node.getColumnDeltas = () => {
                return new Map([["test1", {isHidden: true, type: ColumnType.integer}]])
            };
            let res = lineage._update();

            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].getBackColName()).to.equal("test2");
            expect(res.columns[1].getBackColName()).to.equal("test3");
            expect(res.changes.length).to.equal(2);
            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getBackColName()).to.equal("test3");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to).to.be.null;
            expect(res.changes[1].hidden).to.be.true;
            expect(res.changes[1].hiddenCol.getBackColName()).to.equal("test1");
        });

        it("_update with pulled column should work", () => {
            parentNode.getLineage().reset();
            parentNode.getColumnDeltas = () => {
                return new Map([["test1", {isHidden: true, type: ColumnType.integer}]])
            };
            node.getColumnDeltas = () => {
                return new Map([["test1", {isPulled: true}]])
            };
            let res = lineage._update();

            expect(res.columns.length).to.equal(3);
            expect(res.columns[0].getBackColName()).to.equal("test2");
            expect(res.columns[1].getBackColName()).to.equal("test3");
            expect(res.columns[2].getBackColName()).to.equal("test1");
            expect(res.changes.length).to.equal(1);
            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getBackColName()).to.equal("test3");
        });
        it("_update with column reordering should work", () => {
            parentNode.getLineage().reset();
            lineage.reset();
            parentNode.getColumnDeltas = () => {
                return new Map();
            };
            node.getColumnDeltas = () => {
                return new Map();
            };
            node.getColumnOrdering = () => {
                return ["test3", "test2", "test1"];
            };
            let res = lineage._update();

            expect(res.columns.length).to.equal(3);
            expect(res.columns[0].getBackColName()).to.equal("test3");
            expect(res.columns[1].getBackColName()).to.equal("test2");
            expect(res.columns[2].getBackColName()).to.equal("test1");
        });
    });
});