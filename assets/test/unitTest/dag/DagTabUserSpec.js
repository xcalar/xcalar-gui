
describe("DagTabUser Test", function() {
    let userTab;
    var oldPut;
    var oldDel;
    var oldList;
    var oldUpld;

    before(function() {
        console.log("Dag Tab User Test");
        oldPut = XcalarKeyPut;
        oldDel = XcalarKeyDelete;
        oldList = KVStore.list;
        oldUpld = XcalarUploadWorkbook;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        XcalarKeyDelete = function() {
            return PromiseHelper.resolve();
        };
        XcalarUploadWorkbook = function () {
            return PromiseHelper.resolve("sessID");
        }
        KVStore.list = function() {
            return PromiseHelper.resolve({
                numKeys: 2,
                keys: ["DF2_1","DF2_2","restored"]
            });
        }
        userTab = new DagTabUser();
        userTab._dagGraph = new DagGraph();
    });

    it("should save", function(done) {
        called = false;
        XcalarKeyPut = function() {
            called = true;
            return PromiseHelper.resolve();
        };
        userTab.save()
        .then((res) => {
            expect(called).to.be.true;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("Should set name", function() {
        userTab.setName("newName");
        expect(userTab._name).to.equal("newName");
    });

    it("should load", function(done) {
        called = false;
        var info = {
            name: "kvstore",
            id: "kvTab",
            dag: {
                constructor: Object,
                nodes: [],
                comments: []
            }
        };
        userTab._dagGraph = null;
        userTab._kvStore = {
            getAndParse: function() {
                called = true;
                return PromiseHelper.resolve(info);
            }
        }
        userTab.load()
        .then(() => {
            expect(userTab._dagGraph).to.not.be.null;
            var dagId = userTab._dagGraph.getTabId()
            expect(dagId.split("_")[0]).to.equal("DF2");
            done();
        })
        .fail(() => {
            done("fail");
        })
    });

    it("should delete for DagTabUser", function(done) {
        called = false;
        userTab._kvStore = {
            delete: function() {
                called = true;
                return PromiseHelper.resolve();
            }
        }
        userTab.delete()
        .then((res) => {
            expect(called).to.be.true;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("Should clone", function() {
        var newTab = userTab.clone();
        expect(newTab.getName()).to.equal(userTab.getName());
        expect(newTab._dagGraph.getTabId()).to.not.equal(userTab._dagGraph.getTabId());
    });

    it("Should report if it needs to be reset", function() {
        userTab._reset = true;
        expect(userTab.needReset()).to.be.true;
        userTab._reset = false;
        expect(userTab.needReset()).to.be.false;
    });

    it("Should get created time", function() {
        expect(userTab.getCreatedTime()).to.be.not.null;
    });

    it("Should restore correctly", function(done) {
        userTab._kvStore = {
            getAndParse: function() {
                return PromiseHelper.resolve(null);
            }
        }
        DagTabUser.restore([{
            name: "restore",
            id: "DF2_1",
            reset: false,
            createdTime: 5
        }])
        .then((res) => {
            var tabs = res.dagTabs;
            expect(tabs.length).to.equal(1);
            expect(tabs[0].getId()).to.equal("DF2_1");
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("Should check if it has an async dataflow", function(done) {
        DagTabUser.hasDataflowAsync("DF2_1")
        .then((res) => {
            expect(res).to.be.true;
            return DagTabUser.hasDataflowAsync("none")
        })
        .then((res) => {
            expect(res).to.be.false;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("Should check if its for a sql folder", function() {
        userTab._id = "cat.sql";
        expect(DagTabUser.isForSQLFolder(userTab)).to.be.true;
        userTab._id = "cat";
        expect(DagTabUser.isForSQLFolder(userTab)).to.be.false;
    });

    it("Should check if the id is a sql dataflow", function() {
        expect(DagTabUser.idIsForSQLFolder("cat.sql")).to.be.true;
        expect(DagTabUser.idIsForSQLFolder("cat")).to.be.false;
    });

    after(function() {
        XcalarKeyPut = oldPut;
        XcalarKeyDelete = oldDel;
        KVStore.list = oldList;
        XcalarUploadWorkbook = oldUpld;
    });
});