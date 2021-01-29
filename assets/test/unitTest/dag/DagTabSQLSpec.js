describe("DagTabSQL Test", function() {
    let SQLNode;
    let sqlTab;

    before(function() {
        SQLNode = new DagNodeSQL({});
        sqlTab = new DagTabSQL({
            SQLNode
        });
    });

    it("should save", function() {
        let oldFunc = DagTabManager.Instance.saveParentTab;
        let called = false;
        DagTabManager.Instance.saveParentTab = () => { called = true; };
        sqlTab.save();
        expect(called).to.be.true;
        DagTabManager.Instance.saveParentTab = oldFunc;
    });

    it("should getGraph", function() {
        let oldFunc = SQLNode.getSubGraph;
        let called = false;
        SQLNode.getSubGraph = () => { called = true; };
        sqlTab.getGraph();
        expect(called).to.be.true;
        SQLNode.getSubGraph = oldFunc;
    });

    it("load should do nothing", function(done) {
        sqlTab.load()
        .then((res) => {
            expect(res).to.be.undefined;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("delete should do nothing", function(done) {
        sqlTab.delete()
        .then((res) => {
            expect(res).to.be.undefined;
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("download should reject", function(done) {
        sqlTab.download()
        .then(() => {
            done("fail");
        })
        .fail((error) => {
            expect(error).not.to.be.empty;
            done();
        });
    });

    it("upload should reject", function(done) {
        sqlTab.upload()
        .then(() => {
            done("fail");
        })
        .fail((error) => {
            expect(error).not.to.be.empty;
            done();
        });
    });
});