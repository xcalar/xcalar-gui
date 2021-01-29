describe("DagCategoryNode Test", function() {
    before(function() {
        console.log("DagCategoryNode Test");
    });

    describe("general category node properties", function() {
        let node;
        let mapNode;
        before(function() {
            mapNode = new DagNodeMap({});
            node = new DagCategoryNode(mapNode, DagCategoryType.ColumnOps);

        });

        it("get Category type should work", function() {
            expect(node.getCategoryType()).to.equal(DagCategoryType.ColumnOps);
        });

        it("get node should work", function() {
            expect(node.getNode() instanceof DagNodeMap).to.be.true;
        });

        it("get node type should work", function() {
            expect(node.getNodeType()).to.equal(DagNodeType.Map);
        });

        it("should show correct display type", function() {
            node = new DagCategoryNode(new DagNodeSQL({}));
            expect(node.getDisplayNodeType()).to.equal("SQL");

            node = new DagCategoryNode(new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName"}));
            expect(node.getDisplayNodeType()).to.equal("testName");

            node = new DagCategoryNode(new DagNodeCustomInput({}));
            expect(node.getDisplayNodeType()).to.equal("Input");

            node = new DagCategoryNode(new DagNodeSQLFuncIn({}));
            expect(node.getDisplayNodeType()).to.equal("Input Table");

            node = new DagCategoryNode(new DagNodeSQLFuncOut({}));
            expect(node.getDisplayNodeType()).to.equal("Output    Table");

            node = new DagCategoryNode(new DagNodeIMDTable({}));
            expect(node.getDisplayNodeType()).to.equal("Source Table");

            node = new DagCategoryNode(new DagNodeGroupBy({}));
            expect(node.getDisplayNodeType()).to.equal("Group By");

            node = new DagCategoryNode(new DagNodeAggregate({}));
            expect(node.getDisplayNodeType()).to.equal("Single Value");

            node = new DagCategoryNode(new DagNodeFilter({}));
            expect(node.getDisplayNodeType()).to.equal("Filter");
        });

        it("should get subType", function() {
            mapNode = new DagNodeMap({subType: DagNodeSubType.Cast});
            node = new DagCategoryNode(mapNode, DagCategoryType.ColumnOps);
            expect(node.getNodeSubType()).to.equal("cast");
        });

        it("should get display sub type", function() {
            expect(node.getDisplayNodeSubType()).to.equal("Cast");
        });

        it("should get hidden property", function() {
            expect(node.isHidden()).to.be.false;
            mapNode = new DagNodeMap({subType: DagNodeSubType.Cast});
            node = new DagCategoryNode(mapNode, DagCategoryType.ColumnOps, true);
            expect(node.isHidden()).to.be.true;
        });

        it("should get color", function() {
            expect(node.getColor()).to.equal("#F8A296");
        });

        it("should getIcon", function() {
            expect(node.getIcon()).to.equal("&#xe9da;");
        });

        it("should get description", function() {
            expect(node.getDescription()).to.equal("Changes the data type of a column");
        });

        it("should getJSON", function() {
            expect(node.getJSON()).to.deep.equal({
                type: DagCategoryType.ColumnOps,
                subType: DagNodeSubType.Cast,
                node: mapNode.getSerializableObj(),
                hidden: true,
                key: ""
            });
        });

        it("initFromJSON should work", function() {
            node.initFromJSON({
                type: "a",
                subType: "b",
                hidden: "c",
                node: mapNode,
                key: "e"
            });
            expect(node.categoryType).to.equal("a");
            expect(node.nodeSubType).to.equal("b");
            expect(node.hidden).to.equal("c");
            expect(node.key).to.equal("e");
        });

        it("isPersistable should work", function() {
            expect(node.isPersistable()).to.be.false;
        });
    });

    describe("different category node types", function() {
        let mapNode;
        let node;
        before(function() {
            mapNode = new DagNodeMap({subType: DagNodeSubType.Cast});
        });

        it("category in should work", function() {
            node = new DagCategoryNodeIn(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.In);
            expect(node.getColor()).to.equal("#F4B48A");
        });

        it("category out should work", function() {
            node = new DagCategoryNodeOut(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.Out);
            expect(node.getColor()).to.equal("#E7DC98");
        });

        it("category SQL should work", function() {
            node = new DagCategoryNodeSQL(mapNode, true);
            expect(node.getCategoryType()).to.equal(DagCategoryType.SQL);
            expect(node.getColor()).to.equal("#AACE8F");
            expect(node.isHidden()).to.be.true;

            node = new DagCategoryNodeSQL(mapNode);
            expect(node.isHidden()).to.be.false;
        });

        it("category column ops should work", function() {
            node = new DagCategoryNodeColumnOps(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.ColumnOps);
            expect(node.getColor()).to.equal("#89D0E0");
        });

        it("category rowops should work", function() {
            node = new DagCategoryNodeRowOps(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.RowOps);
            expect(node.getColor()).to.equal("#7FD4B5");
        });

        it("category join should work", function() {
            node = new DagCategoryNodeJoin(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.Join);
            expect(node.getColor()).to.equal("#92B1DA");
        });

        it("category set should work", function() {
            node = new DagCategoryNodeSet(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.Set);
            expect(node.getColor()).to.equal("#CCAADD");
        });

        it("category aggregates should work", function() {
            node = new DagCategoryNodeAggregates(mapNode);
            expect(node.getCategoryType()).to.equal(DagCategoryType.Aggregates);
            expect(node.getColor()).to.equal("#F896A9");
        });

        it("category custom should work", function() {
            node = new DagCategoryNodeCustom(mapNode, true);
            expect(node.getCategoryType()).to.equal(DagCategoryType.Custom);
            expect(node.getColor()).to.equal("#F8A296");
            expect(node.isPersistable()).to.be.true;
            expect(node.isHidden()).to.be.true;
            expect(node.key.length).to.be.gt(1);
        });
    });

    describe("dag category node factory", function() {
        let mapNode;
        before(function() {
            mapNode = new DagNodeMap({subType: DagNodeSubType.Cast});
        });
        it("should create node", () => {
            let node = DagCategoryNodeFactory.create({
                dagNode: mapNode,
                categoryType: DagCategoryType.Custom,
                isHidden: false
            });
            expect(node instanceof DagCategoryNodeCustom).to.be.true;
        });

        it("should create from json", () => {
            let node = DagCategoryNodeFactory.createFromJSON({
                type: DagCategoryType.Custom,
                subType: DagNodeSubType.Cast,
                hidden: true,
                node: mapNode,
                key: "e"
            });
            expect(node instanceof DagCategoryNodeCustom).to.be.true;
            expect(node.categoryType).to.equal(DagCategoryType.Custom);
            expect(node.nodeSubType).to.equal(DagNodeSubType.Cast);
            expect(node.hidden).to.equal(true);
            expect(node.key).to.equal("e");
        });
    });
});