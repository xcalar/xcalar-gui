describe("DFNodeLineagePopup Test", function() {
    let $popup;
    let destTab;
    let destNode;
    let sourceTab;
    let sourceNode;
    let oldGetTab;

    let hackGetTabById = function(tabId) {
        if (tabId === destTab.getId()) {
            return destTab;
        } else if (tabId === sourceTab.getId()) {
            return sourceTab;
        } else {
            throw new Error("Unsupported test case");
        }
    };

    let generateTabAndNode = function() {
        let tab = new DagTabUser({
            name: xcHelper.randName("test")
        });
        let graph = new DagGraph();
        graph.setTabId(tab.getId());
        let node = new DagNodeFilter({});
        graph.addNode(node);
        tab.setGraph(graph);
        return {
            tab,
            node
        };
    };

    before(function() {
        $popup = $("#dfNodeLineagePopup");
        const destNodeAndTab = generateTabAndNode();
        destTab = destNodeAndTab.tab;
        destNode = destNodeAndTab.node;
        const sourceNodeAndTab = generateTabAndNode();
        sourceTab = sourceNodeAndTab.tab;
        sourceNode = sourceNodeAndTab.node;

        destNode.tag = [{tabId: sourceTab.getId(), nodeId: sourceNode.getId()}];

        oldGetTab = DagTabManager.Instance.getTabById;
        DagTabManager.Instance.getTabById = hackGetTabById;
    });

    it("should show the pop up", function() {
        // act
        DFNodeLineagePopup.Instance.show({tabId: destTab.getId(), nodeId: destNode.getId()});
        // assert
        assert.isTrue($popup.is(":visible"));
    });

    it("should render the lineage info correct", function() {
        expect($popup.find(".row").length).to.equal(2);
    });

    it("should close the pop up", function() {
        // act
        $popup.find(".close").click();
        // assert
        assert.isFalse($popup.is(":visible"));
    });

    after(function() {
        DagTabManager.Instance.getTabById = oldGetTab;
    });
});