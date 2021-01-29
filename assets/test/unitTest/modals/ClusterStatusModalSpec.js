describe("ClusterStatusModal Test", function() {
    let $modal;
    let modal;

    before(function() {
        UnitTest.onMinMode();
        modal = ClusterStatusModal.Instance;
        $modal = $("#clusterStatusModal");
    });

    it("should show", function() {
        let logs = `Execute GET /service/status for all Nodes:

        Host: holmes.int.xcalar.com
        Return Status: 401
        Host: skywalker.int.xcalar.com
        Return Status: 200
        Logs:
        Node ID: 0
        Getting Xcalar Status
        Usrnodes started (1 / 1 instances on this host)
        2 total usrnode instances configured in the cluster
        19 childnodes started
        xcmonitor started
        Supervisord started (pid: 28102)
        Mgmtd started
        expServer started
        sqldf started
        caddy started`;
        modal.show(logs);
        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".section").length).to.equal(2);
    });

    it("should handle invalid case", function() {
        modal.show("test");
        expect($modal.find(".section").length).to.equal(0);
    });

    it("should close", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    after(function() {
        UnitTest.offMinMode();
    });
});