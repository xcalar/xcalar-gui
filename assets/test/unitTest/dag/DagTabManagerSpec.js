describe("DagTabManager Test", () => {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("undo a new tab", () => {
        let numTabs;
        let newTabId;
        let node;
        before(() => {
            numTabs = DagTabManager.Instance.getNumTabs();
        })
        it("should create a new tab", () => {
            newTabId = DagTabManager.Instance.newTab();
            expect(DagTabManager.Instance.getNumTabs()).to.equal(numTabs + 1);
        });
        it("should undo after adding a node", (done) => {
            const newNodeInfo = {
                type: "dataset",
                display: {
                    x: 20,
                    y: 40
                }
            };
            node = DagViewManager.Instance.newNode(newNodeInfo);
            expect(DagViewManager.Instance.getActiveDag().getNode(node.getId()).getId()).to.equal(node.getId());
            Log.undo()
            .then(() => {
                expect(DagTabManager.Instance.getNumTabs()).to.equal(numTabs + 1);
                expect(DagTabManager.Instance._hiddenDags.size).to.equal(0);
                expect(DagList.Instance._dags.has(newTabId)).to.be.true;
                expect(DagViewManager.Instance.getActiveDag().getNode(node.getId())).to.be.null;
                return Log.undo();
            })
            .then(() => {

                expect(DagTabManager.Instance.getNumTabs()).to.equal(numTabs);
                expect(DagTabManager.Instance._hiddenDags.size).to.equal(1);
                expect(DagTabManager.Instance._hiddenDags.has(newTabId)).to.be.true;
                expect(DagList.Instance._dags.has(newTabId)).to.be.false;
                DagViewManager.Instance.getActiveDag().getNode()
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should redo and include node", (done) => {
            expect(DagTabManager.Instance.getNumTabs()).to.equal(numTabs);
            expect(DagTabManager.Instance._hiddenDags.size).to.equal(1);
            expect(DagTabManager.Instance._hiddenDags.has(newTabId)).to.be.true;
            expect(DagList.Instance._dags.has(newTabId)).to.be.false;
            Log.redo()
            .then(() => {
                expect(DagTabManager.Instance.getNumTabs()).to.equal(numTabs + 1);
                expect(DagTabManager.Instance._hiddenDags.size).to.equal(0);
                expect(DagList.Instance._dags.has(newTabId)).to.be.true;
                expect(DagViewManager.Instance.getActiveDag().getNode(node.getId())).to.be.null;
                return Log.redo();
            })
            .then(() => {
                expect(DagViewManager.Instance.getActiveDag().getNode(node.getId()).getId()).to.equal(node.getId());
                done();
            })
            .fail(() => {
                done("fail");
            });
        });
    });

    it("should register event", function() {
        let called = false;
        DagTabManager.Instance.on("test", function() {
            called = true;
        });

        expect(DagTabManager.Instance._event._events.hasOwnProperty("test")).to.be.true;
        DagTabManager.Instance._event.dispatchEvent("test");
        expect(called).to.be.true;
        delete DagTabManager.Instance._event._events["test"];
    });
});