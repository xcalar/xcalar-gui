
describe('DagTab Test', function() {
    var $dagTabs;
    var $newTabButton;
    var oldPut;
    var oldDown;
    var oldGetAndParse
    var graph;
    var tab;

    before(function(done) {
        console.log("Dag Tab Test");
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        oldGetAndParse = KVStore.getAndParse;
        oldDown = xcHelper.downloadAsFile;
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            var dagTabManager = DagTabManager.Instance;
            dagTabManager.newTab();
            dagTabManager.newTab();
            $dagTabArea = $("#dagTabSectionTabs");
            $newTabButton = $("#tabButton");
            $dagTabs = $("#dagTabSectionTabs .dagTab");
            dagGraph = new DagGraph();
            dagGraph.setTabId("gId");
            tab = new DagTab(
            {
                name: "cat",
                id: "myId",
                dagGraph: dagGraph
            })

            done();
        });

    });

    describe("DagTab Test", function() {
        it("Should have constructed correctly", function() {
            expect(tab._name).to.equal("cat");
            expect(tab._id).to.equal("myId");
            expect(tab._dagGraph).to.be.not.null;
        });

        it("Should generate a UID correctly", function() {
            var name = DagTab.generateId();
            expect(name.split("_")[0]).to.equal("DF2");
        });

        it("Should get and set name correctly", function() {
            tab.setName("test");
            expect(tab.getName()).to.equal("test");
            tab.setName("test2");
            expect(tab.getName()).to.equal("test2");
        });

        it("Should get and set graph correctly", function() {
            var g = new DagGraph();
            g.setTabId("testgId");
            tab._id = "otherId";
            tab.setGraph(g);
            expect(tab.getGraph().getTabId()).to.equal("otherId");
        });

        it("Should get id correctly", function() {
            tab._id = "newId";
            expect(tab.getId()).to.equal("newId");
        });

        it("Should get short name correctly", function() {
            tab._name = "na/me";
            expect(tab.getShortName()).to.equal("me");
        });

        it("Should trigger a download correctly", function() {
            var called = false;
            xcHelper.downloadAsFile = function(arg1, arg2) {
                if (arg1 === "me.json") {
                    called = true;
                }
            }
            tab._name = "na/me";
            tab.downloadStats();
            expect(called).to.be.true;
        });

        it("Should open and close correctly", function() {
            tab.setClosed();
            expect(tab.isOpen()).to.be.false;
            tab.setOpen();
            expect(tab.isOpen()).to.be.true;
            tab.setClosed();
            expect(tab.isOpen()).to.be.false;
        });

        it("Should return null for serialization", function() {
            expect(tab.serialize()).to.be.null;
        });
    });

    describe("DagTab protected functions tests", function() {
        it("Should return the correct errors for validate kv store info",
                function() {
            var dagInfo = "not an object";
            expect(tab._validateKVStoreDagInfo(dagInfo).error).to.equal("Invalid plan information");
            dagInfo = {
                name: 5,
                id: "kvTab",
                dag: {
                    constructor: {},
                    nodes: [],
                    comments: []
                },
            }
            expect(tab._validateKVStoreDagInfo(dagInfo).error).to.equal("Invalid plan name");
            dagInfo = {
                name: "kvstore",
                id: 5,
                dag: {
                    constructor: {},
                    nodes: [],
                    comments: []
                },
            }
            expect(tab._validateKVStoreDagInfo(dagInfo).error).to.equal("Invalid plan ID");
            dagInfo = {
                name: "kvstore",
                id: "kvTab",
                dag: null,
            }
            expect(tab._validateKVStoreDagInfo(dagInfo).error).to.equal("Invalid plan");
        });

        it("Should load from kv store correctly", function(done) {
            var info = {
                name: "kvstore",
                id: "kvTab",
                dag: {
                    constructor: Object,
                    nodes: [],
                    comments: []
                }
            };
            tab._dagGraph = null;
            tab._kvStore = {
                    getAndParse: function() {
                        return PromiseHelper.resolve(info);
                }
            }
            tab._loadFromKVStore()
            .then(({ dagInfo, graph }) => {
                expect(graph).to.not.be.null;
                expect(graph.getTabId()).to.equal("newId");
                expect(dagInfo).to.deep.equal(info);
                done();
            })
            .fail(() => {
                done("fail");
            })
        });
    })

    describe('Dag Tabs UI Test', function() {

        describe("dagTabManager should note active tabs", function() {
            it("Should activate a clicked tab", function() {
                var $firstTab = $($dagTabs.get(0));
                var $firstDataflow = $($(".dataflowArea").get(0));
                // Remove active classes if they exist.
                $firstTab.removeClass("active");
                $firstDataflow.removeClass("active");
                $($firstTab).click();
                expect($firstTab.hasClass("active")).to.be.true;
                expect($firstDataflow.hasClass("active")).to.be.true;
            });

            it("Should unactivate old active tabs", function() {
                var $firstTab = $($dagTabs.get(0));
                // Remove active classes if they exist
                var $firstDataflow = $($(".dataflowArea").get(0));
                $($firstTab).click();
                // Show they have an active state now
                expect($firstTab.hasClass("active")).to.be.true;
                expect($firstDataflow.hasClass("active")).to.be.true;
                $($dagTabs.get(1)).click();
                // And now they don't
                expect($firstTab.hasClass("active")).to.be.false;
                expect($firstDataflow.hasClass("active")).to.be.false;
            });

        });

        describe("dagTabManager should handle new tabs", function() {
            it("Should create a new tab when prompted", function(){
                var prior_len = $dagTabs.size();
                $newTabButton.click();
                expect($(".dagTab").size()).to.equal(prior_len + 1);
            });

            it("Should create a new dataflow view when prompted", function() {
                var prior_len = $(".dataflowArea").size();
                $newTabButton.click();
                expect($(".dataflowArea").size()).to.equal(prior_len + 1);
            });
        });

        describe("dagTabManager should handle tab deletion", function() {
            it("Should handle tab deletion", function(){
                $newTabButton.click();
                $dagTabs = $(".dagTab");
                var prior_len = $dagTabs.length;
                $dagTabs.last().find(".after").click();
                expect($(".dagTab").length).to.equal(prior_len - 1);
                expect($(".dataflowArea").length).to.equal(prior_len - 1);
            });
        });
    });

    after(function() {
        XcalarKeyPut = oldPut;
        xcHelper.downloadAsFile = oldDown;
        KVStore.getAndParse = oldGetAndParse;
    });
});
