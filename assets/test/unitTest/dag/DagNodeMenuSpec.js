// XXX enable after fixing table node menu
describe("DagNodeMenu Test", function() {
    let $menu;
    let tabId;
    let cachedUserPref;
    let $dfArea;
    let $dfWrap;

    before(function(done) {
        $menu = $("#dagNodeMenu");
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {

            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            cachedUserPref = UserSettings.Instance.getPref;
            UserSettings.Instance.getPref = function(val) {
                if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                    return false;
                } else {
                    return cachedUserPref(val);
                }
            };
            done();
        });
    });

    describe("show correct menu options depending on situation", function() {
        let $dfWrap;
        let $dfArea;
        before(function() {
            $dfWrap = $("#dagView").find(".dataflowWrap");
            $dfArea = $dfWrap.find(".dataflowArea.active");
        });

        it("should show correct options on empty dataflow", function() {
            $dfWrap.contextmenu();
            expect($menu.find("li:visible").length).to.equal(9);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(5);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "deleteAllTables unavailable",
                "pasteNodes",
                "selectAll unavailable",
                "newComment",
                "restoreAllSource",
                "autoAlign unavailable",
                "download",
                "duplicateDf",
                "removeAllNodes unavailable",
            ]);
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("background click with 1 node", function() {
            const newNodeInfo = {
                type: DagNodeType.IMDTable,
                display: {
                    x: 20,
                    y: 40
                }
            };
            DagViewManager.Instance.newNode(newNodeInfo);
            $dfWrap.contextmenu();
            expect($menu.find("li:visible").length).to.equal(10);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(9);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "executeNode unavailable",
                "copyNodes",
                "cutNodes",
                "selectAll",
                "viewSchemaChanges",
                "createCustom",
                "autoAlign",
                "description",
                "removeNode"
              ]);
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("click on source node", function() {
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            expect($menu.find("li:visible").length).to.equal(8);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(7);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "executeNode unavailable",
                "copyNodes",
                "cutNodes",
                "viewSchemaChanges",
                "createCustom",
                "description",
                "removeNode"
            ]);
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("click on 1 node when 2 are selected", function() {
            const newNodeInfo = {
                type: "map",
                display: {
                    x: 140,
                    y: 40
                }
            };
            DagViewManager.Instance.newNode(newNodeInfo);
            DagView.selectNode($dfArea.find(".operator"));

            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(5);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(5);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });;
            expect(classes).to.deep.equal([
                "executeNode",
                "copyNodes",
                "cutNodes",
                "createCustom",
                "removeNode"
            ]);
            $("#container").trigger(fakeEvent.mousedown);
            DagViewManager.Instance.deselectNodes();
        });

        it("connection menu", function() {
            DagViewManager.Instance.connectNodes(
                $dfArea.find(".operator.IMDTable").data("nodeid"),
                $dfArea.find(".operator.map").data("nodeid"),
                0,
                tabId
            );
            $dfArea.find(".edge").click();
            expect($menu.find("li:visible").length).to.equal(1);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(1);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "removeInConnection",
            ]);
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("comment menu", function() {
            DagViewManager.Instance.newComment({display:{x: 40, y: 40}});
            $dfArea.find(".comment").contextmenu();
            expect($menu.find("li:visible").length).to.equal(3);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(3);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "copyNodes",
                "cutNodes",
                "removeNode",
            ]);
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("locked node", function() {
            DagView.selectNode($dfArea.find(".operator.map"));
            DagViewManager.Instance.getActiveDagView().lockNode($dfArea.find(".operator.map").data("nodeid"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(8);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(3);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });

            expect(classes).to.deep.equal([
                "configureNode unavailable",
                "executeNode unavailable",
                "copyNodes",
                "cutNodes unavailable",
                "viewSchemaChanges",
                "createCustom unavailable",
                "description",
                "removeNode unavailable"
            ]);

            $("#container").trigger(fakeEvent.mousedown);
            DagViewManager.Instance.getActiveDagView().unlockNode($dfArea.find(".operator.map").data("nodeid"), tabId);
            DagViewManager.Instance.deselectNodes();
        });

        it("locked config node", function() {
            DagView.selectNode($dfArea.find(".operator.map"));
            DagViewManager.Instance.lockConfigNode($dfArea.find(".operator.map").data("nodeid"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(8);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(7);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "executeNode unavailable",
                "copyNodes",
                "cutNodes",
                "viewSchemaChanges",
                "createCustom",
                "description",
                "removeNode"
            ]);
            $("#container").trigger(fakeEvent.mousedown);
            DagViewManager.Instance.unlockConfigNode($dfArea.find(".operator.map").data("nodeid"), tabId);
            DagViewManager.Instance.deselectNodes();
        });

        it("config panel open", function() {
            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();
            $menu.find(".configureNode").trigger(fakeEvent.mouseup);

            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(9);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(8);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "executeNode unavailable",
                "copyNodes",
                "cutNodes",
                "viewSchemaChanges",
                "createCustom",
                "description",
                "removeNode",
                "exitOp exitMap"
            ]);
            $("#container").trigger(fakeEvent.mousedown);
            MapOpPanel.Instance.close();
            DagViewManager.Instance.deselectNodes();
        });

        it("node with a table", function() {
            DagView.selectNode($dfArea.find(".operator.map"));
            let nodeId = $dfArea.find(".operator.map").data("nodeid");
            let node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
            node.beCompleteState();

            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(8);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(8);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "reexecuteNode",
                "copyNodes",
                "cutNodes",
                "viewSchemaChanges",
                "createCustom",
                "description",
                "removeNode"
            ]);
            DagViewManager.Instance.deselectNodes();
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("disabled dataflow", function() {
            var cachedFn = DagViewManager.Instance.isDisableActions;
            DagViewManager.Instance.isDisableActions = () => true;

            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(5);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(5);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "reexecuteNode",
                "copyNodes",
                "viewSchemaChanges",
                "description"
            ])

            DagViewManager.Instance.isDisableActions = cachedFn;
            DagViewManager.Instance.deselectNodes();
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("view only, click node", function() {
            var cachedFn = DagViewManager.Instance.isViewOnly;
            DagViewManager.Instance.isViewOnly = () => true;

            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(0);
            DagViewManager.Instance.isViewOnly = cachedFn;
            DagViewManager.Instance.deselectNodes();
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("view only, click background", function() {
            var cachedFn = DagViewManager.Instance.isViewOnly;
            DagViewManager.Instance.isViewOnly = () => true;

            DagViewManager.Instance.deselectNodes();
            $dfWrap.contextmenu();

            expect($menu.find("li:visible").length).to.equal(3);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(3);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "selectAll",
                "autoAlign",
                "download",
            ]);

            DagViewManager.Instance.isViewOnly = cachedFn;
             DagViewManager.Instance.deselectNodes();
             $("#container").trigger(fakeEvent.mousedown);
        });

        it("tab is sql", function() {
            var cachedFn1 = DagViewManager.Instance.isDisableActions;
            DagViewManager.Instance.isDisableActions = () => true;
            var cachedFn = DagViewManager.Instance.getActiveTab;
            DagViewManager.Instance.getActiveTab = () => {
                return new DagTabSQL({name: "someName"});
            };

            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(1);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(1);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "viewSchemaChanges"
            ]);

            DagViewManager.Instance.getActiveTab = cachedFn;
            DagViewManager.Instance.deselectNodes();
            DagViewManager.Instance.isDisableActions = cachedFn1;
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("tab is sqlFunc", function() {
            var cachedFn = DagViewManager.Instance.getActiveTab;
            DagViewManager.Instance.getActiveTab = () => {
                return new DagTabSQLFunc({name: "someName"});
            };

            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(7);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(7);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "reexecuteNode",
                "copyNodes",
                "cutNodes",
                "viewSchemaChanges",
                "description",
                "removeNode"
            ]);

            DagViewManager.Instance.getActiveTab = cachedFn;
            DagViewManager.Instance.deselectNodes();
            $("#container").trigger(fakeEvent.mousedown);
        });

        it("tab is custom", function() {
            var cachedFn1 = DagViewManager.Instance.isDisableActions;
            DagViewManager.Instance.isDisableActions = () => true;
            var cachedFn = DagViewManager.Instance.getActiveTab;
            DagViewManager.Instance.getActiveTab = () => {
                return new DagTabCustom({name: "someName"});
            };

            DagView.selectNode($dfArea.find(".operator.map"));
            $dfArea.find(".operator.map .main").contextmenu();

            expect($menu.find("li:visible").length).to.equal(5);
            expect($menu.find("li:visible:not(.unavailable)").length).to.equal(5);
            let classes = [];
            $menu.find("li:visible").each(function() {
                classes.push($(this).attr("class"));
            });
            expect(classes).to.deep.equal([
                "configureNode",
                "reexecuteNode",
                "viewSchemaChanges",
                "createCustom",
                "description"
            ]);

            DagViewManager.Instance.getActiveTab = cachedFn;
            DagViewManager.Instance.deselectNodes();
            DagViewManager.Instance.isDisableActions = cachedFn1;
            $("#container").trigger(fakeEvent.mousedown);
        });

        after(function(done) {
            UnitTest.deleteTab(tabId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("execution tests", function() {
        let node;
        before(function() {
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
        });

        it("should configure imd table", function() {
            const newNodeInfo = {type: DagNodeType.IMDTable};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = IMDTableOpPanel.Instance.show;
            var called = false;
            IMDTableOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            IMDTableOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });


        it("should configure aggregate", function() {
            const newNodeInfo = {type: "singleValue"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = AggOpPanel.Instance.show;
            var called = false;
            AggOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            AggOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure export", function() {
            const newNodeInfo = {type: "export"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = ExportOpPanel.Instance.show;
            var called = false;
            ExportOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            ExportOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure filter", function() {
            const newNodeInfo = {type: "filter"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = FilterOpPanel.Instance.show;
            var called = false;
            FilterOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            FilterOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure join", function() {
            const newNodeInfo = {type: "join"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = JoinOpPanel.Instance.show;
            var called = false;
            JoinOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            JoinOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure map", function() {
            const newNodeInfo = {type: "map"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = MapOpPanel.Instance.show;
            var called = false;
            MapOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            MapOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure cast", function() {
            const newNodeInfo = {type: "map", subType: "cast"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = CastOpPanel.Instance.show;
            var called = false;
            CastOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            CastOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure split", function() {
            const newNodeInfo = {type: "split"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SplitOpPanel.Instance.show;
            var called = false;
            SplitOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SplitOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure Round", function() {
            const newNodeInfo = {type: "round"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = RoundOpPanel.Instance.show;
            var called = false;
            RoundOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            RoundOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure groupby", function() {
            const newNodeInfo = {type: "groupBy"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = GroupByOpPanel.Instance.show;
            var called = false;
            GroupByOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            GroupByOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure Project", function() {
            const newNodeInfo = {type: "project"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = ProjectOpPanel.Instance.show;
            var called = false;
            ProjectOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            ProjectOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure Explode", function() {
            const newNodeInfo = {type: "explode"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = ExplodeOpPanel.Instance.show;
            var called = false;
            ExplodeOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            ExplodeOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure Set", function() {
            const newNodeInfo = {type: "set"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SetOpPanel.Instance.show;
            var called = false;
            SetOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SetOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure DFIn", function() {
            const newNodeInfo = {type: "link in"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = DFLinkInOpPanel.Instance.show;
            var called = false;
            DFLinkInOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            DFLinkInOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure DFOut", function() {
            const newNodeInfo = {type: "link out"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = DFLinkOutOpPanel.Instance.show;
            var called = false;
            DFLinkOutOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            DFLinkOutOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure PublishIMD", function() {
            const newNodeInfo = {type: "publishIMD"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = PublishIMDOpPanel.Instance.show;
            var called = false;
            PublishIMDOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            PublishIMDOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure IMDTable", function() {
            const newNodeInfo = {type: "IMDTable"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = IMDTableOpPanel.Instance.show;
            var called = false;
            IMDTableOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            IMDTableOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure SQL", function() {
            const newNodeInfo = {type: "sql"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SQLOpPanel.Instance.show;
            var called = false;
            SQLOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SQLOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure RowNum", function() {
            const newNodeInfo = {type: "rowNum"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = RowNumOpPanel.Instance.show;
            var called = false;
            RowNumOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            RowNumOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure Sort", function() {
            const newNodeInfo = {type: "sort"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SortOpPanel.Instance.show;
            var called = false;
            SortOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SortOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure SQLFuncIn", function() {
            const newNodeInfo = {type: "SQLFuncIn"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SQLFuncInOpPanel.Instance.show;
            var called = false;
            SQLFuncInOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SQLFuncInOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        it("should configure synthesize", function() {
            const newNodeInfo = {type: "synthesize"};
            node = DagViewManager.Instance.newNode(newNodeInfo);

            var cacheFn = SynthesizeOpPanel.Instance.show;
            var called = false;
            SynthesizeOpPanel.Instance.show = function() {
                called = true;
            }
            DagNodeMenu.execute("configureNode", {
                node: node
            });
            expect(called).to.be.true;
            SynthesizeOpPanel.Instance.show = cacheFn;
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            DagViewManager.Instance.removeNodes([node.getId()], tabId);
        });

        after(function(done) {
            UnitTest.deleteTab(tabId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe.skip("test menu actions", function() {
        let node;
        before(function() {
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            const newNodeInfo = {type: DagNodeType.IMDTable};
            node = DagViewManager.Instance.newNode(newNodeInfo);
            $dfWrap = $("#dagView").find(".dataflowWrap");
            $dfArea = $dfWrap.find(".dataflowArea.active");
        });

        it("should remove node", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.removeNodes;
            DagViewManager.Instance.removeNodes = function(nodeIds, _tabId) {
                expect(nodeIds.length).to.equal(1);
                expect(nodeIds[0]).to.equal(node.getId());
                expect(_tabId).to.equal(tabId);
                called = true;
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".removeNode").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.removeNodes = cachedFn;
        });

        it("remove all nodes", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.removeNodes;
            DagViewManager.Instance.removeNodes = function(nodeIds, _tabId) {
                expect(nodeIds.length).to.equal(1);
                expect(nodeIds[0]).to.equal(node.getId());
                expect(_tabId).to.equal(tabId);
                called = true;
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".removeAllNodes").trigger(fakeEvent.mouseup);
            $("#alertModal").find(".confirm").click();
            expect(called).to.be.true;
            DagViewManager.Instance.removeNodes = cachedFn;
        });

        it("select all nodes", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.selectNodes;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.selectNodes = function(_tabId) {
                expect(_tabId).to.equal(tabId);
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".selectAll").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.selectNodes = cachedFn;
        });

        it("download", function() {
            var called = false;
            var cachedFn = DFDownloadModal.Instance.show;

            DagView.selectNode($dfArea.find(".operator"));

            DFDownloadModal.Instance.show = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".download").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DFDownloadModal.Instance.show = cachedFn;
        });

        it("should find linkOut node", function() {
            DagViewManager.Instance.deselectNodes();
            let newNodeInfo = {type: "link out"};
            let linkOutNode = DagViewManager.Instance.newNode(newNodeInfo);
            newNodeInfo = {type: "link in"};
            let linkInNode = DagViewManager.Instance.newNode(newNodeInfo);
            linkInNode.getLinkedNodeAndGraph = () => {
                return {
                    graph: DagViewManager.Instance.getActiveDag(),
                    node: linkOutNode
                }
            }
            var called = false;
            var cachedFn = DagUtil.scrollIntoView;
            DagUtil.scrollIntoView = function($node, $container) {
                expect($node.hasClass("link")).to.be.true;
                called = true;
            };
            DagView.selectNode($dfArea.find(".operator.link.in"));
            $dfArea.find(".operator.link.in .main").contextmenu();
            $menu.find(".findLinkOut").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagUtil.scrollIntoView = cachedFn;
            DagViewManager.Instance.removeNodes([linkOutNode.getId(), linkInNode.getId()], tabId);
            $("#container").mousedown();
        });

        it("findOptimizedSource node", function() {
            let oldGet = DagList.Instance.getDagTabById;
            let oldAlert = Alert.show;
            let called = false;
            DagList.Instance.getDagTabById = () => {
                return {
                    getSourceTab: () => new DagTabOptimized({name: "test"})
                }
            };
            Alert.show = () => called = true;

            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".findOptimizedSource").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            DagList.Instance.getDagTabById = oldGet;
            Alert.show = oldAlert;
        });

        it("findOptimizedSource node -- cannot find source case", function() {
            let oldGet = DagList.Instance.getDagTabById;
            let oldAlert = Alert.error;
            let called = false;
            DagList.Instance.getDagTabById = () => {
                return {
                    getSourceTab: () => null
                }
            };
            Alert.error = () => called = true;

            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".findOptimizedSource").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            DagList.Instance.getDagTabById = oldGet;
            Alert.error = oldAlert;
        });

        it.skip("restoreDatasetFrom Node", function() {
            var called = false;
            var cachedFn = DS.restoreSourceFromDagNode;
            node.getLoadArgs = () => "something";
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {
                expect(nodes.length).to.equal(1);
                expect(shareDS).to.equal(false);
                called = true;
                return PromiseHelper.resolve();
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".restoreSource").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DS.restoreSourceFromDagNode = cachedFn;
        });

        it.skip("restoreDatasetFrom Node should fail", function() {
            var called = false;
            var cachedFn = DS.restoreSourceFromDagNode;
            node.getLoadArgs = () => false;
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {

                called = true;
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".restoreSource").trigger(fakeEvent.mouseup);
            UnitTest.hasStatusBoxWithError(ErrTStr.RestoreDSNoLoadArgs);
            expect(called).to.be.false;
            DS.restoreSourceFromDagNode = cachedFn;
        });

        it.skip("restoreDatasetFrom Node should handle errors", function() {
            var called = false;
            var cachedFn = DS.restoreSourceFromDagNode;
            node.getLoadArgs = () => {
                throw "oops";
            };
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {

                called = true;
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".restoreSource").trigger(fakeEvent.mouseup);
            UnitTest.hasStatusBoxWithError("");
            expect(called).to.be.false;
            DS.restoreSourceFromDagNode = cachedFn;
        });

        it.skip("restoreAllSource", function() {
            var called = false;
            var cachedFn = DS.restoreSourceFromDagNode;
            node.getLoadArgs = () => "something";
            node.getDSName = () => "x" + Math.random();
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {
                expect(nodes.length).to.equal(1);
                expect(shareDS).to.equal(false);
                called = true;
                return PromiseHelper.resolve();
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".restoreAllSource").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DS.restoreSourceFromDagNode = cachedFn;
        });

        it.skip("restoreAllSource fail", function() {
            var called = false;
            var cachedFn = DS.restoreSourceFromDagNode;
            node.getLoadArgs = () => "something";
            node.getDSName = () => "x" + Math.random();
            var cachedFn2 = DS.getDSObj;
            DS.getDSObj = () => true;
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {
                called = true;
                return PromiseHelper.resolve();
            };
            DagView.selectNode($dfArea.find(".operator"));
            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".restoreAllSource").trigger(fakeEvent.mouseup);
            expect(called).to.be.false;
            UnitTest.hasAlertWithTitle(AlertTStr.Title);
            DS.restoreSourceFromDagNode = cachedFn;
            DS.getDSObj = cachedFn2;
        });

        it("duplicateDf", function() {
            var called = false;
            var cachedFn = DagTabManager.Instance.duplicateTab;

            DagView.selectNode($dfArea.find(".operator"));

            DagTabManager.Instance.duplicateTab = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".duplicateDf").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagTabManager.Instance.duplicateTab = cachedFn;
        });

        it("executeNode", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.run;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.run = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".executeNode").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.run = cachedFn;
        });

        // it("executeAllNodes", function() {
        //     var called = false;
        //     var cachedFn = DagViewManager.Instance.run;

        //     DagView.selectNode($dfArea.find(".operator"));

        //     DagViewManager.Instance.run = function() {
        //         called = true;
        //     };

        //     $dfArea.find(".operator .main").contextmenu();
        //     $menu.find(".executeAllNodes").trigger(fakeEvent.mouseup);
        //     expect(called).to.be.true;
        //     DagViewManager.Instance.run = cachedFn;
        // });

        it("executeNodesOptimized", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.run;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.run = function(ids, optimized) {
                expect(optimized).to.be.true;
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".executeNodeOptimized").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.run = cachedFn;
        });

        it("createNodeOptimized", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.generateOptimizedDataflow;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.generateOptimizedDataflow = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".createNodeOptimized").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.generateOptimizedDataflow = cachedFn;
        });

        // remove all unavailable classes here
        it("resetNode", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.reset;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.reset = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".resetNode").trigger(fakeEvent.mouseup);
            expect(called).to.be.false;
            $menu.find("li").removeClass('unavailable');
            $menu.find(".resetNode").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.reset = cachedFn;
        });

        it("resetAllNodes", function() {
            var called = false;
            var cachedFn = DagViewManager.Instance.reset;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.reset = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".resetAllNodes").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.reset = cachedFn;
        });

        it("configure node", function(){
            var called = false;
            var cachedFn = DatasetOpPanel.Instance.show;

            DagView.selectNode($dfArea.find(".operator"));

            DatasetOpPanel.Instance.show = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".configureNode").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DatasetOpPanel.Instance.show = cachedFn;

            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            Log.unlockUndoRedo();
            DagTabManager.Instance.unlockTab(tabId);
        });

        it("view result", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.viewResult;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.viewResult = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find("li").removeClass('unavailable');
            $menu.find(".viewResult").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.viewResult = cachedFn;
        });

        it("generate result", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.run;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.run = function() {
                called = true;
                return PromiseHelper.reject();
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".generateResult").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.run = cachedFn;
        });

        it("view optimized", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.viewOptimizedDataflow;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.viewOptimizedDataflow = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".viewOptimizedDataflow").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.viewOptimizedDataflow = cachedFn;
        });

        it("description", function(){
            var called = false;
            var cachedFn = DagDescriptionModal.Instance.show;

            DagView.selectNode($dfArea.find(".operator"));

            DagDescriptionModal.Instance.show = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".description").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagDescriptionModal.Instance.show = cachedFn;
        });

        it("comment", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.newComment;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.newComment = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".newComment").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.newComment = cachedFn;
        });

        it("autoalign", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.autoAlign;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.autoAlign = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".autoAlign").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.autoAlign = cachedFn;
        });

        it("viewSchemaChanges", function(){

            DagView.selectNode($dfArea.find(".operator"));

            let dagView = DagViewManager.Instance.getActiveDagView();
            var called = false;
            var cachedFn = dagView.addSchemaPopup;

            dagView.addSchemaPopup = (schemaPopup) => {
                schemaPopup.remove();
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".viewSchemaChanges").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            dagView.addSchemaPopup = cachedFn;
        });

        it("exitOpPanel", function(){
            var called = false;
            var cachedFn = MainMenu.closeForms;

            DagView.selectNode($dfArea.find(".operator"));

            MainMenu.closeForms = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find("li").removeClass('unavailable');
            $menu.find(".exitOp").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            MainMenu.closeForms = cachedFn;
        });

        it("createCustom", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.wrapCustomOperator;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.wrapCustomOperator = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".createCustom").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.wrapCustomOperator = cachedFn;
        });

        it("editCustom", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.editCustomOperator;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.editCustomOperator = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".editCustom").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.editCustomOperator = cachedFn;
        });

        it("shareCustom", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.shareCustomOperator;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.shareCustomOperator = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".shareCustom").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.shareCustomOperator = cachedFn;
        });

        it("inspectSQL", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.inspectSQLNode;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.inspectSQLNode = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".inspectSQL").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.inspectSQLNode = cachedFn;
        });

        it("expandSQL", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.expandSQLNode;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.expandSQLNode = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".expandSQL").trigger(fakeEvent.mouseup);
            $("#alertModal").find(".confirm").click();
            expect(called).to.be.true;
            DagViewManager.Instance.expandSQLNode = cachedFn;
        });

        it("expandCustom", function(){
            var called = false;
            var cachedFn = DagViewManager.Instance.expandCustomNode;

            DagView.selectNode($dfArea.find(".operator"));

            DagViewManager.Instance.expandCustomNode = function() {
                called = true;
            };

            $dfArea.find(".operator .main").contextmenu();
            $menu.find(".expandCustom").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagViewManager.Instance.expandCustomNode = cachedFn;
        });

        it("lockTable", function(){
            var called = false;
            DagView.selectNode($dfArea.find(".operator"));
            node.pinTable = function() {
                called = true;
            }
            $dfArea.find(".operator .main").contextmenu();
            $menu.find("li").removeClass('unavailable');
            $menu.find(".lockNodeTable").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
        });

        it("unlockTable", function(){
            var called = false;
            DagView.selectNode($dfArea.find(".operator"));
            node.unpinTable = function() {
                called = true;
            }
            $dfArea.find(".operator .main").contextmenu();
            $menu.find("li").removeClass('unavailable');
            $menu.find(".unlockNodeTable").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
        });

        after(function(done) {
            UnitTest.deleteTab(tabId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function() {
        UserSettings.Instance.getPref = cachedUserPref;
    });
});