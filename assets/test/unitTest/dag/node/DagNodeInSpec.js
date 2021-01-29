describe("DagNodeIn Test", function() {
    it("should be the correct instance", function() {
        let node = new DagNodeIn();
        expect(node).to.be.an.instanceof(DagNodeIn);
    });

    it("should initialize schema", function() {
        let node = new DagNodeIn();
        expect(node.getSchema().length).to.equal(0);

        // case 2
        let schema = [{"name": "a", "columnType": ColumnType.string}];
        node = new DagNodeIn({"schema": schema});
        expect(node.getSchema()).to.equal(schema);
    });

    it("should set schema", function() {
        let node = new DagNodeIn();
        let schema = [{"name": "a", "columnType": ColumnType.string}];
        let called = false;
        node.registerEvents(DagNodeEvents.LineageSourceChange, function(info) {
            called = true;
            expect(info.node).to.equal(node);
        });

        node.setSchema(schema, true);
        expect(called).to.equal(true);
        expect(node.getSchema()).to.equal(schema);
    });

    it("should set param", function() {
        let node = new DagNodeIn();
        // first time set param
        let res = node.setParam();
        expect(res).to.equal(true);

        // set again should do nothing
        res = node.setParam();
        expect(res).to.equal(false);

        // set with schema change
        let schema = [{"name": "a", "columnType": ColumnType.string}];
        node.setSchema(schema);
        res = node.setParam();
        expect(res).to.equal(true);
    });

    it("should get lineage change", function() {
        let schema = [{"name": "a", "columnType": ColumnType.string}];
        let node = new DagNodeIn({"schema": schema});
        let change = node.lineageChange();
        expect(change.columns.length).to.equal(1);
        expect(change.columns[0].getBackColName()).to.equal("a");
        expect(change.changes.length).to.equal(0);
    });

    it("_getSerializeInfo should work", function() {
        let schema = [{"name": "a", "columnType": ColumnType.string}];
        let node = new DagNodeIn({"schema": schema});
        let res =  node._getSerializeInfo();
        expect(res.schema).to.equal(schema);
    });
});