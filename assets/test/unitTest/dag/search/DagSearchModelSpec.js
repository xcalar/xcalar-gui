describe("DagSearchModel Test", function() {
    let searchModel;

    before(function() {
        const statusOptions = [
            {
                key: "Unconfigured",
                default: true,
                checked: false,
                filter: (node) => node.getState() === DagNodeState.Unused
            }
        ];
        const typeOptions = [
            {
                key: "Node Labels",
                default: true,
                checked: false,
                selector: (keyword, node) => {
                    if (node.getTitle().toLowerCase().includes(keyword)
                    ) {
                        return ($node) => $node.find(".nodeTitle");
                    } else {
                        return null;
                    }
                }
            }
        ];

        searchModel = new DagSearchModel({
            statusOptions,
            typeOptions
        });
    });

    it("should intialize statusOptions and typeOptions correctly", function() {
        // assert
        expect(searchModel.statusOptions.length).to.equal(1);
        expect(searchModel.typeOptions.length).to.equal(1);
    });

    it("should by default not global search", function() {
        // assert
        expect(searchModel.isGlobalSearch()).to.be.false;
    });

    it("should set scope to be global serach", function() {
        // act
        searchModel.setScope("all");
        // assert
        expect(searchModel.isGlobalSearch()).to.be.true;
    });

    it("should return true for hasStatusFilter if search model no status filter checked", function() {
        // act
        searchModel.statusOptions[0].checked = false;
        // assert
        expect(searchModel.hasStatusFilter()).to.be.false;
    });

    it("should return false for hasStatusFilter if search model has status filter checked", function() {
        // act
        searchModel.statusOptions[0].checked = true;
        // assert
        expect(searchModel.hasStatusFilter()).to.be.true;
    });

    it("should rest modifed options to default", function() {
        // arrange
        searchModel.statusOptions[0].checked = false;
        // act
        searchModel.reset(searchModel.statusOptions);
        // assert
        expect(searchModel.statusOptions[0].checked).to.be.true;
    });

    describe("Search Function Test", function() {
        let oldGetTab;
        let testTab;
        let nodeToTest1;
        let nodeToTest2;

        before(function() {
            searchModel.statusOptions[0].checked = true;
            searchModel.typeOptions[0].checked = true;
            // set to local scope
            searchModel.setScope("current");

            nodeToTest1 = new DagNodeDataset({title: "test1"});
            nodeToTest2 = new DagNodeFilter({title: "test2"});

            const graph = new DagGraph();
            graph.addNode(nodeToTest1);
            graph.addNode(nodeToTest2);

            testTab = new DagTabUser({dagGraph: graph});
            
            oldGetTab = DagViewManager.Instance.getActiveTab;
            DagViewManager.Instance.getActiveTab = () => testTab;
        });

        beforeEach(function() {
            searchModel.clearMatches();
        });

        it("should search keyword `test` and get two result", function() {
            // act
            searchModel.search("test");
            // assert
            expect(searchModel.getMatchedEntry(0).nodeId).to.equal(nodeToTest1.getId());
            expect(searchModel.getMatchedEntry(1).nodeId).to.equal(nodeToTest2.getId());
        });

        it("should search keyword `test1` and get one result", function() {
            // arrganet
            searchModel.clearMatches();
            // act
            searchModel.search("test1");
            // assert
            expect(searchModel.getMatchedEntry(0).nodeId).to.equal(nodeToTest1.getId());
            expect(searchModel.getMatchedEntry(1)).to.equal(undefined);
        });

        it("should search keyword `test2` and get one result", function() {
            // arrganet
            searchModel.clearMatches();
            // act
            searchModel.search("test2");
            // assert
            expect(searchModel.getMatchedEntry(0).nodeId).to.equal(nodeToTest2.getId());
            expect(searchModel.getMatchedEntry(1)).to.equal(undefined);
        });

        it("should get no result if search keyword `test1` but node1 is running", function() {
            // arrganet
            searchModel.clearMatches();
            nodeToTest1.beRunningState();
            // act
            searchModel.search("test1");
            // assert
            expect(searchModel.getMatchedEntry(0)).to.equal(undefined);
        });

        after(function() {
            DagViewManager.Instance.getActiveTab = oldGetTab;
        });
    });
});