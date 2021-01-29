describe("ConnectorConfigModal Test", function() {
    let oldList;
    let oldRender;
    let oldCreate;
    let test;
    let $modal;

    before(function() {
        oldList = DSTargetManager.getTargetTypeList;
        oldRender = DSTargetManager.renderConnectorConfig;
        oldCreate = DSTargetManager.createConnector;
        DSTargetManager.getTargetTypeList = () => PromiseHelper.resolve();
        DSTargetManager.renderConnectorConfig = () => "test";

        test = undefined;
        $modal = ConnectorConfigModal.Instance._getModal();
    });

    it("should show modal", function() {
        ConnectorConfigModal.Instance.show("test", "test", (connector) => {
            test = connector
        });
        expect($modal.is(":visible")).to.be.true;
        expect($modal.find(".formContent").text()).to.equal("test");
    });

    it("submit should handle error", function(done) {
        DSTargetManager.createConnector = () => PromiseHelper.reject({log: "test"});
        let oldStatus = StatusBox.show;
        let called = false;
        StatusBox.show = () => called = true;

        ConnectorConfigModal.Instance._submitForm()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(called).to.be.true;
            expect(test).to.equal(undefined);
            expect(error).not.to.equal(undefined);
            done();
        })
        .always(function() {
            StatusBox.show = oldStatus;
        });
    });

    it("submit should work", function(done) {
        DSTargetManager.createConnector = () => PromiseHelper.resolve("test");
        ConnectorConfigModal.Instance._submitForm()
        .then(function() {
            expect(test).to.equal("test");
            // modal should be closed
            expect($modal.is(":visible")).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        DSTargetManager.getTargetTypeList = oldList;
        DSTargetManager.renderConnectorConfig = oldRender;
        DSTargetManager.createConnector = oldCreate;
    });
});