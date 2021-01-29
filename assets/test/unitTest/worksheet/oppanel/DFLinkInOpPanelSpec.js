describe("DFLinkInOpPanel Test", function() {
    let oldGetTabs;
    let panel;
    let dagNode;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            let createTab = (tabName, dfOutName) => {
                let dfOutNode = new DagNodeDFOut({});
                dfOutNode.setParam({"name": dfOutName});
                let graph = new DagGraph();
                graph.addNode(dfOutNode);
                let tab = new DagTabUser({name: tabName});
                tab.setGraph(graph);
                tab.setApp(null)
                return tab;
            };
            oldGetTabs = DagTabManager.Instance.getTabs;
            DagTabManager.Instance.getTabs = oldGetTabs;

            let fakeTabs = [new DagTabUser(), new DagTabSQL({}),
                createTab("df1", "test1"), createTab("df2", "test2")];
            DagTabManager.Instance.getTabs = () => fakeTabs;

            panel = DFLinkInOpPanel.Instance;
            dagNode = new DagNodeDFIn({});
            done();
        });
    });

    it("should show panel", function(done) {
        panel.show(dagNode, {app: null})
        .then(function() {
            expect(panel._dataflows.length).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should initialize link out nodes", function() {
        panel._initializeLinkOutNodes("error case");
        expect(panel._linkOutNodes.length).to.equal(0);

        // case 2
        panel._initializeLinkOutNodes("test1");
        expect(panel._linkOutNodes.length).to.equal(0);
    });

    it("should switch mode", function() {
        let res = panel._switchMode(true);
        expect(res).to.equal(null);
        res = panel._switchMode(false);
        expect(res).to.equal(null);
    });

    describe("Detect Schema Test", function() {
        let $dfInput;
        let $linkOutInput;

        before(function() {
            $dfInput = panel._getDFDropdownList().find("input");
            $linkOutInput = panel._getLinkOutDropdownList().find("input");
        });

        it("should return no DF error", function() {
            $dfInput.val("");
            let res = panel._autoDetectSchema();
            expect(res.error).to.equal(OpPanelTStr.DFLinkInNoDF);
        });

        it("should return no link out error", function() {
            $dfInput.val("df1");
            $linkOutInput.val("");
            panel._schemaSection.render([]);
            let res = panel._autoDetectSchema();
            expect(res.error).to.equal(OpPanelTStr.DFLinkInNoOut);
        });

        it("should get schema for valid case", function() {
            $dfInput.val("df1");
            $linkOutInput.val("test1");
            let res = panel._autoDetectSchema();
            expect(res.error).to.equal(DagNodeLinkInErrorType.NoGraph);
        });
    });

    describe("Detect Schema From Source Test", function() {
        it("should get schema from node", function(done) {
            let oldGetTab = DagTabManager.Instance.getTabById;
            let node = new DagNodeDataset({});
            node.setSchema([{name: "col0", type: ColumnType.string}]);

            panel._source = "test_" + DagTab.KEY + "_" + node.getId() + "#abc";

            DagTabManager.Instance.getTabById = () => {
                let graph = new DagGraph();
                graph.addNode(node);
                let tab = new DagTabUser();
                tab.setGraph(graph);
                return tab;
            };

            panel._autoDetectSchemaFromSource()
            .then(function(schema) {
                expect(schema.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DagTabManager.Instance.getTabById = oldGetTab;
            });
        });

        after(function() {
            panel._source = "";
        });
    });

    describe("Submit Test", function() {
        it("should submit form", function() {
            let $dfInput = panel._getDFDropdownList().find("input");
            let $linkOutInput = panel._getLinkOutDropdownList().find("input");
            $dfInput.val("df1");
            $linkOutInput.val("test1");
            panel._schemaSection.render([]);
            panel._submitForm();
            // error case
            expect(dagNode.isConfigured()).to.be.false;
            // valid case
            panel._schemaSection.render([{"name": "test", "type": ColumnType.string}]);
            panel._submitForm();
            expect(dagNode.isConfigured()).to.be.true;
        });
    });

    describe("Result set name", () => {
        it("should show result set name", (done) => {
            dagNode.input.input.source = "testTable#1";
            let $panel = panel._getPanel();
            expect($panel.hasClass("withSource")).to.be.false;
            panel.show(dagNode, {})
            .then(function() {
                expect($panel.hasClass("withSource")).to.be.true;
                let $radio = $panel.find(".radioButton.active");
                expect($radio.length).to.equal(1);
                expect($radio.data("option")).to.equal("table");
                $panel.find(".close").click();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    })

    after(function() {
        DagTabManager.Instance.getTabs = oldGetTabs;
    });
});