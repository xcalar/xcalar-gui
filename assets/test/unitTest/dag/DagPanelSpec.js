describe("DagPanel Test", function() {
    before(function(done) {
        // wait the initialize setup finish first
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    it("hasSetup should work", function() {
        DagPanel.Instance._setup = false;
        expect(DagPanel.Instance.hasSetup()).to.be.false
    });

    it("should alert error setup", function(done) {
        let oldFunc = DagAggManager.Instance.setup;
        let oldAlert = Alert.show;
        let called = false;
        DagAggManager.Instance.setup = () => PromiseHelper.reject("test");
        Alert.show = () => { called = true; };

        DagPanel.Instance._setup = false;
        DagPanel.Instance.setup()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(called).to.be.true;
            expect(error).to.equal("test");
            expect(DagPanel.Instance.hasSetup()).to.be.true;
            done();
        })
        .always(function() {
            Alert.show = oldAlert;
            DagAggManager.Instance.setup = oldFunc;
        });
    });

    it("should setup", function(done) {
        DagPanel.Instance._setup = false;
        DagPanel.Instance.setup()
        .then(function() {
            expect(DagPanel.Instance.hasSetup()).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        DagPanel.Instance._setup = true;
    });
});