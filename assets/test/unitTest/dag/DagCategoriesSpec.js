describe("DagCategories Test", function() {
    let dagCategories;
    before(function() {
        console.log("DagCategories Test");
        dagCategories = new DagCategories();
    });

    describe("DagCategories", function() {
        it("get categories should work", function() {
            let categories = dagCategories.getCategories();

            expect(categories.length).to.equal(10);
            expect(categories[0] instanceof DagCategory).to.be.true;

            expect(categories[0].type).to.equal(DagCategoryType.In);
            expect(categories[1].type).to.equal(DagCategoryType.Out);
            expect(categories[2].type).to.equal(DagCategoryType.SQL);
            expect(categories[3].type).to.equal(DagCategoryType.ColumnOps);
            expect(categories[4].type).to.equal(DagCategoryType.RowOps);
            expect(categories[5].type).to.equal(DagCategoryType.Join);
            expect(categories[6].type).to.equal(DagCategoryType.Set);
            expect(categories[7].type).to.equal(DagCategoryType.Aggregates);
            expect(categories[8].type).to.equal(DagCategoryType.Custom);
            expect(categories[9].type).to.equal(DagCategoryType.Hidden);

            expect(categories[0].operators.length).to.equal(3);
            // in data mart DagNodeDataset is removed
            expect(categories[0].operators[0].node instanceof DagNodeIMDTable).to.be.true;
            expect(categories[0].operators[1].node instanceof DagNodeDFIn).to.be.true;
            expect(categories[0].operators[2].node instanceof DagNodeSQL).to.be.true;


            expect(categories[1].operators.length).to.equal(3);
            expect(categories[1].operators[0].node instanceof DagNodeExport).to.be.true;
            expect(categories[1].operators[1].node instanceof DagNodeDFOut).to.be.true;
            expect(categories[1].operators[2].node instanceof DagNodePublishIMD).to.be.true;

            expect(categories[2].operators.length).to.equal(3);
            expect(categories[2].operators[0].node instanceof DagNodeSQL).to.be.true;
            expect(categories[2].operators[1].node instanceof DagNodeSQLSubInput).to.be.true;
            expect(categories[2].operators[2].node instanceof DagNodeSQLSubOutput).to.be.true;


            expect(categories[3].operators.length).to.equal(6);
            expect(categories[3].operators[0].node instanceof DagNodeMap).to.be.true;
            expect(categories[3].operators[1].node instanceof DagNodeMap).to.be.true;
            expect(categories[3].operators[2].node instanceof DagNodeSplit).to.be.true;

            expect(categories[3].operators[3].node instanceof DagNodeRound).to.be.true;
            expect(categories[3].operators[4].node instanceof DagNodeRowNum).to.be.true;
            expect(categories[3].operators[5].node instanceof DagNodeProject).to.be.true;

            expect(categories[4].operators.length).to.equal(4);
            expect(categories[4].operators[0].node instanceof DagNodeSort).to.be.true;
            expect(categories[4].operators[1].node instanceof DagNodeFilter).to.be.true;
            expect(categories[4].operators[2].node instanceof DagNodeExplode).to.be.true;
            expect(categories[4].operators[3].node instanceof DagNodeDeskew).to.be.true;

            expect(categories[5].operators.length).to.equal(3);
            expect(categories[5].operators[0].node instanceof DagNodeJoin).to.be.true;
            expect(categories[5].operators[1].node instanceof DagNodeJoin).to.be.true;
            expect(categories[5].operators[2].node instanceof DagNodeJoin).to.be.true;

            expect(categories[6].operators.length).to.equal(3);
            expect(categories[6].operators[0].node instanceof DagNodeSet).to.be.true;
            expect(categories[6].operators[1].node instanceof DagNodeSet).to.be.true;
            expect(categories[6].operators[2].node instanceof DagNodeSet).to.be.true;

            expect(categories[7].operators.length).to.equal(2);
            expect(categories[7].operators[0].node instanceof DagNodeAggregate).to.be.true;
            expect(categories[7].operators[1].node instanceof DagNodeGroupBy).to.be.true;

            expect(categories[8].operators.length).to.equal(3);
            expect(categories[8].operators[0].node instanceof DagNodeCustom).to.be.true;
            expect(categories[8].operators[1].node instanceof DagNodeCustomInput).to.be.true;
            expect(categories[8].operators[2].node instanceof DagNodeCustomOutput).to.be.true;

            // hidden categiries
            expect(categories[9].operators.length).to.equal(9);
            expect(categories[9].operators[0].node instanceof DagNodeIndex).to.be.true;
            expect(categories[9].operators[1].node instanceof DagNodeSynthesize).to.be.true;
            expect(categories[9].operators[2].node instanceof DagNodePlaceholder).to.be.true;
            expect(categories[9].operators[3].node instanceof DagNodeInstruction).to.be.true;
            expect(categories[9].operators[4].node instanceof DagNodeDFOut).to.be.true;
            expect(categories[9].operators[5].node instanceof DagNodeExport).to.be.true;
            expect(categories[9].operators[6].node instanceof DagNodeModule).to.be.true;
            expect(categories[9].operators[7].node instanceof DagNodeDataset).to.be.true;
            expect(categories[9].operators[8].node instanceof DagNodeDataset).to.be.true;
        });

        it("update for sqlFunc should work", function() {
            dagCategories.update(true);
            let categories = dagCategories.getCategories();

            expect(categories.length).to.equal(9);
            expect(categories[0] instanceof DagCategory).to.be.true;
            expect(categories[0].type).to.equal(DagCategoryType.In);
            expect(categories[1].type).to.equal(DagCategoryType.Out);
            expect(categories[2].type).to.equal(DagCategoryType.SQL);
            expect(categories[3].type).to.equal(DagCategoryType.ColumnOps);
            expect(categories[4].type).to.equal(DagCategoryType.RowOps);
            expect(categories[5].type).to.equal(DagCategoryType.Join);
            expect(categories[6].type).to.equal(DagCategoryType.Set);
            expect(categories[7].type).to.equal(DagCategoryType.Aggregates);
            expect(categories[8].type).to.equal(DagCategoryType.Hidden);

            expect(categories[0].operators.length).to.equal(1);
            expect(categories[0].operators[0].node instanceof DagNodeSQLFuncIn).to.be.true;


            expect(categories[1].operators.length).to.equal(1);
            expect(categories[1].operators[0].node instanceof DagNodeSQLFuncOut).to.be.true;

            expect(categories[2].operators.length).to.equal(3);
            expect(categories[2].operators[0].node instanceof DagNodeSQL).to.be.true;
            expect(categories[2].operators[1].node instanceof DagNodeSQLSubInput).to.be.true;
            expect(categories[2].operators[2].node instanceof DagNodeSQLSubOutput).to.be.true;

            expect(categories[3].operators.length).to.equal(6);
            expect(categories[3].operators[0].node instanceof DagNodeMap).to.be.true;
            expect(categories[3].operators[1].node instanceof DagNodeMap).to.be.true;
            expect(categories[3].operators[2].node instanceof DagNodeSplit).to.be.true;
            expect(categories[3].operators[3].node instanceof DagNodeRound).to.be.true;
            expect(categories[3].operators[4].node instanceof DagNodeRowNum).to.be.true;
            expect(categories[3].operators[5].node instanceof DagNodeProject).to.be.true;

            expect(categories[4].operators.length).to.equal(4);
            expect(categories[4].operators[0].node instanceof DagNodeSort).to.be.true;
            expect(categories[4].operators[1].node instanceof DagNodeFilter).to.be.true;
            expect(categories[4].operators[2].node instanceof DagNodeExplode).to.be.true;
            expect(categories[4].operators[3].node instanceof DagNodeDeskew).to.be.true;

            expect(categories[5].operators.length).to.equal(3);
            expect(categories[5].operators[0].node instanceof DagNodeJoin).to.be.true;
            expect(categories[5].operators[1].node instanceof DagNodeJoin).to.be.true;
            expect(categories[5].operators[2].node instanceof DagNodeJoin).to.be.true;

            expect(categories[6].operators.length).to.equal(3);
            expect(categories[6].operators[0].node instanceof DagNodeSet).to.be.true;
            expect(categories[6].operators[1].node instanceof DagNodeSet).to.be.true;
            expect(categories[6].operators[2].node instanceof DagNodeSet).to.be.true;

            expect(categories[7].operators.length).to.equal(2);
            expect(categories[7].operators[0].node instanceof DagNodeAggregate).to.be.true;
            expect(categories[7].operators[1].node instanceof DagNodeGroupBy).to.be.true;

            expect(categories[8].operators.length).to.equal(13);
            expect(categories[8].operators[0].node instanceof DagNodeIndex).to.be.true;
            expect(categories[8].operators[1].node instanceof DagNodeSynthesize).to.be.true;
            expect(categories[8].operators[2].node instanceof DagNodePlaceholder).to.be.true;
            expect(categories[8].operators[3].node instanceof DagNodeInstruction).to.be.true;
            expect(categories[8].operators[4].node instanceof DagNodeDFOut).to.be.true;
            expect(categories[8].operators[5].node instanceof DagNodeExport).to.be.true;
        });

        it("should switch back to advanced mode", function(){
            dagCategories.update();
            let categories = dagCategories.getCategories();

            expect(categories.length).to.equal(10);
        });

        it("should load categories", function(done) {
            let categories = dagCategories.getCategories();
            let called = false;
            categories[9].loadCategory = function() { // custom category
                called = true;
                return PromiseHelper.resolve();
            };
            dagCategories.loadCategories()
            .then(function() {
                expect(called).to.be.true;
                done();
            })
            .fail(function() {
                done("fail")
            });
        });

        it("should save categories", function(done) {
            let categories = dagCategories.getCategories();
            let called = false;
            categories[9].saveCategory = function() { // custom category
                called = true;
                return PromiseHelper.resolve();
            };
            dagCategories.saveCategories()
            .then(function() {
                expect(called).to.be.true;
                done();
            })
            .fail(function() {
                done("fail")
            });
        });

        it("should get category by node id", function() {
            let categories = dagCategories.getCategories();
            const splitNodeId = categories[3].operators[1].getNode().getId();

            let res = dagCategories.getCategoryByNodeId(splitNodeId);
            expect(res.getType()).to.equal(DagCategoryType.ColumnOps);
        });
    });

    describe("DagCategory", function() {
        let inCategory;
        let rowOpsCategory;
        let sqlCategory;

        before(function(){
            inCategory = new DagCategory(DagCategoryType.In, [
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.Dataset
                })),
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.IMDTable
                })),
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.DFIn
                })),
            ]);

            rowOpsCategory = new DagCategory(DagCategoryType.RowOps, [
                new DagCategoryNodeRowOps(DagNodeFactory.create({
                    type: DagNodeType.Sort
                })),
                new DagCategoryNodeRowOps(DagNodeFactory.create({
                    type: DagNodeType.Filter
                })),
                new DagCategoryNodeRowOps(DagNodeFactory.create({
                    type: DagNodeType.Explode
                })),
            ]);

            sqlCategory = new DagCategory(DagCategoryType.SQL, [
                new DagCategoryNodeSQL(DagNodeFactory.create({
                    type: DagNodeType.SQL
                })),
                new DagCategoryNodeSQL(DagNodeFactory.create({
                    type: DagNodeType.SQLSubInput
                }), true),
                new DagCategoryNodeSQL(DagNodeFactory.create({
                    type: DagNodeType.SQLSubOutput
                }), true),
            ]);

        });

        it("get type should work", function() {
            expect(inCategory.getType()).to.equal(DagCategoryType.In);
        });

        it("get name should work", function() {
            expect(inCategory.getName()).to.equal("In");
            expect(rowOpsCategory.getName()).to.equal("Row Ops");
            expect(sqlCategory.getName()).to.equal("SQL");
        });

        it("add should work", function() {
            expect(inCategory.operators.length).to.equal(3);
            inCategory.add(new DagCategoryNodeIn(DagNodeFactory.create({
                type: DagNodeType.Map
            })));
            expect(inCategory.operators.length).to.equal(4);
        });

        it("get operators should work", function() {
            expect(inCategory.getOperators().length).to.equal(4);
            expect(inCategory.getOperators()[0].node.getType()).to.equal(DagNodeType.Dataset);
        });

        it("get sorted operators should work", function() {
            expect(inCategory.getOperators()[0].node.getType()).to.equal(DagNodeType.Dataset);
            expect(inCategory.getOperators()[1].node.getType()).to.equal(DagNodeType.IMDTable);
            expect(inCategory.getOperators()[2].node.getType()).to.equal(DagNodeType.DFIn);
            expect(inCategory.getOperators()[3].node.getType()).to.equal(DagNodeType.Map);
        });

        it("isExistOperatorName", function() {
            expect(inCategory.isExistOperatorName("Function Input")).to.be.true;
            expect(inCategory.isExistOperatorName("FunctionInput")).to.be.false;
        });

        it('removeOperatorById', function() {
            let mapId = inCategory.getOperators()[3].node.getId();
            expect(inCategory.isExistOperatorName("Scalar Function")).to.be.true;
            expect(inCategory.getOperators().length).to.equal(4);
            inCategory.removeOperatorById(mapId);
            expect(inCategory.getOperators().length).to.equal(3);
            expect(inCategory.isExistOperatorName("Scalar Function")).to.be.false;
        });

        it("rename should work", function() {
            let customNode = new DagCategoryNodeIn(new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName"}));
            let mapNode = new DagCategoryNodeIn(new DagNodeMap({}));
            inCategory.add(customNode);
            inCategory.add(mapNode);
            expect(inCategory.renameOperatorById(mapNode.getNode().getId(), "newname")).to.be.false;
            expect(inCategory.renameOperatorById(customNode.getNode().getId(), "newname")).to.be.true;
            expect(customNode.getNode().getCustomName()).to.equal("newname");
        });

        it("load", function(done) {
            inCategory.loadCategory()
            .then(function(){
                done();
            })
            .fail(function(){
                done("fail");
            })
        });

        it("save", function(done) {
            inCategory.loadCategory()
            .then(function(){
                done();
            })
            .fail(function(){
                done("fail");
            });
        });

        it("get description", function(){
            expect(inCategory.getDescription()).to.equal("These operators provide the plan's input data");
        });

        it("clear should work", function() {
            expect(inCategory.getOperators().length).to.equal(5);
            inCategory.clear();
            expect(inCategory.getOperators().length).to.equal(0);
        });
    });

    describe("Dag Category Custom", function() {
        let customCategory;
        let addedNode;
        let addedKey;

        before(function(){
            customCategory = new DagCategoryCustom([
                new DagCategoryNode(DagNodeFactory.create({
                    type: DagNodeType.Custom
                }), DagCategoryType.Custom, true),
                new DagCategoryNode(DagNodeFactory.create({
                    type: DagNodeType.CustomInput
                }), DagCategoryType.Custom, true),
                new DagCategoryNode(DagNodeFactory.create({
                    type: DagNodeType.CustomOutput
                }), DagCategoryType.Custom, true)
            ], 'gUserCustomOpKey');
        });

        it("should loadCategory", function(done) {
            let called1 = false;
            let called2 = false;
            let kvstoreListCache = KVStore.list;
            let XcalarKeyLookupCache = XcalarKeyLookup;

            KVStore.list = function() {
                called1 = true;
                return PromiseHelper.resolve({
                    keys: ["e"]
                });
            };
            XcalarKeyLookup = function() {
                called2 = true;
                return PromiseHelper.resolve({value: JSON.stringify({
                    type: DagCategoryType.Custom,
                    subType: DagNodeSubType.Cast,
                    hidden: true,
                    node: {type: DagNodeType.Map},
                    key: "e"
                })})
            }
            customCategory.loadCategory()
            .then(function() {
                expect(customCategory.getOperators().length).to.equal(4);
                expect(customCategory.getOperators()[3].key).to.equal("e");
                expect(customCategory.getOperators()[3].node.getType()).to.equal(DagNodeType.Map);
                expect(called1).to.be.true;
                expect(called2).to.be.true;
                KVStore.list = kvstoreListCache;
                XcalarKeyLookup = XcalarKeyLookupCache;
                done();
            })
            .fail(function() {
                done("fail");
            })
        });

        it("should not save category if nothing to save", function(done) {
            let called1 = false;
            let called2 = false;
            let XcalarKeyPutCache = XcalarKeyPut;
            let XcalarKeyDeleteCache = XcalarKeyDelete;
            XcalarKeyPut = function(key) {

                called1 = true;
                return PromiseHelper.resolve();
            }
            XcalarKeyDelete = function(res) {
                called2 = true;
                return PromiseHelper.resolve();
            }
            customCategory.saveCategory()
            .then(function() {
                expect(called1).to.be.false;
                expect(called2).to.be.false;
                XcalarKeyPut = XcalarKeyPutCache;
                XcalarKeyDelete = XcalarKeyDeleteCache;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // it("should save category if 1 item added", function(done) {
        //     addedNode = new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName"});
        //     let customNode = new DagCategoryNodeCustom(addedNode);
        //     customCategory.add(customNode);
        //     let called1 = false;
        //     let called2 = false;
        //     let XcalarKeyPutCache = XcalarKeyPut;
        //     let XcalarKeyDeleteCache = XcalarKeyDelete;
        //     XcalarKeyPut = function(key, data) {
        //         addedKey = key;
        //         expect(JSON.parse(data).node.customName).to.equal("testName");
        //         called1 = true;
        //         return PromiseHelper.resolve();
        //     }
        //     XcalarKeyDelete = function(res) {
        //         called2 = true;
        //         return PromiseHelper.resolve();
        //     }
        //     customCategory.saveCategory()
        //     .then(function() {
        //         expect(called1).to.be.true;
        //         expect(called2).to.be.false;
        //         XcalarKeyPut = XcalarKeyPutCache;
        //         XcalarKeyDelete = XcalarKeyDeleteCache;
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     });
        // });

        // it("should save category if 1 item deleted", function(done) {
        //     customCategory.removeOperatorById(addedNode.getId());

        //     let called1 = false;
        //     let called2 = false;
        //     let XcalarKeyPutCache = XcalarKeyPut;
        //     let XcalarKeyDeleteCache = XcalarKeyDelete;
        //     XcalarKeyPut = function(res) {
        //         called1 = true;
        //         return PromiseHelper.resolve();
        //     }
        //     XcalarKeyDelete = function(key) {
        //         called2 = true;
        //         expect(key).to.equal(addedKey);
        //         return PromiseHelper.resolve();
        //     }
        //     customCategory.saveCategory()
        //     .then(function() {
        //         expect(called1).to.be.false;
        //         expect(called2).to.be.true;
        //         XcalarKeyPut = XcalarKeyPutCache;
        //         XcalarKeyDelete = XcalarKeyDeleteCache;
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     });
        // });

        it("genOperatorName", function() {
            let a = customCategory.genOperatorName("testName");
            expect(a).to.equal("testName-1");

            addedNode = new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName-1"});
            customNode = new DagCategoryNodeCustom(addedNode);
            customCategory.add(customNode);

            let b = customCategory.genOperatorName("testName");
            expect(b).to.equal("testName-2");
        });

        it("renameOperatorById should work", function() {
            let customNode = new DagCategoryNodeIn(new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName"}));
            customCategory.add(customNode);
            expect(customCategory.renameOperatorById(customNode.getNode().getId(), "newname")).to.be.true;
            expect(customNode.getNode().getCustomName()).to.equal("newname");
            expect(customCategory._dirtyData.update.has(customNode.getKey()));
        });

        it("get sorted operators should work", function() {
            let operators = customCategory.getSortedOperators();
            let opNames = operators.map((op) => {
                return op.getDisplayNodeType()
            });
            expect(opNames).to.deep.equal(["Custom", "CustomOutput", "Input", "newname", "Scalar Function", "testName-1"]);
        });
    });

});