describe("LogoutModal Test", function() {
    let modal;
    let $modal;

    before(function() {
        UnitTest.onMinMode();
        modal = LogoutModal.Instance;
        $modal = $("#logoutModal");
    });

    it("should show modal", function() {
        modal.show();

        assert.isTrue($modal.is(":visible"));
        // assert.isTrue($modal.find(".radioButton").is(":visible"));
        assert.isTrue($modal.find(".confirm").is(":visible"));
        assert.isTrue($modal.find(".cancel").is(":visible"));
    });

    // it("should toggle radio button", function() {
    //     let $radios = $modal.find(".radioButton");
    //     expect($radios.length).to.equal(2);
    //     // default is first radio checked
    //     expect($radios.eq(0).hasClass("active")).to.be.true;
    //     expect($radios.eq(1).hasClass("active")).to.be.false;

    //     $radios.eq(1).click();
    //     expect($radios.eq(0).hasClass("active")).to.be.false;
    //     expect($radios.eq(1).hasClass("active")).to.be.true;

    //     $radios.eq(0).click();
    //     expect($radios.eq(0).hasClass("active")).to.be.true;
    //     expect($radios.eq(1).hasClass("active")).to.be.false;
    // });

    it("should close modal", function() {
        $modal.find(".cancel").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should shut down cluster and logout", function() {
        let oldRequest = xcHelper.sendRequest;
        let requestCalled = false;
        xcHelper.sendRequest = () => {
            requestCalled = true;
            return PromiseHelper.resolve({status: 0});
        }
        let oldCheckVersion = XVM.checkVersion;
        let checkVersionCalled = false;
        XVM.checkVersion = () => {
            checkVersionCalled = true;
            return PromiseHelper.resolve();
        };

        let oldLogout = XcUser.CurrentUser.logout;
        let logoutCalled = false;
        XcUser.CurrentUser.logout = () => {
            logoutCalled = true;
        };

        modal.show();

        // let $radios = $modal.find(".radioButton");
        // expect($radios.eq(0).hasClass("active")).to.be.true;

        $modal.find(".confirm").click();
        expect(requestCalled).to.be.true;
        expect(checkVersionCalled).to.be.false;
        expect(logoutCalled).to.be.true;
        assert.isFalse($modal.is(":visible"));

        xcHelper.sendRequest = oldRequest;
        XVM.checkVersion = oldCheckVersion;
        XcUser.CurrentUser.logout = oldLogout;
    });

    it("should handle cluster stop failure", function() {
        let oldRequest = xcHelper.sendRequest;
        let requestCalled = false;
        xcHelper.sendRequest = () => {
            requestCalled = true;
            return PromiseHelper.resolve();
        }
        let oldCheckVersion = XVM.checkVersion;
        let checkVersionCalled = false;
        XVM.checkVersion = () => {
            checkVersionCalled = true;
            return PromiseHelper.resolve();
        };

        let oldLogout = XcUser.CurrentUser.logout;
        let logoutCalled = false;
        XcUser.CurrentUser.logout = () => {
            logoutCalled = true;
        };

        modal.show();

        // let $radios = $modal.find(".radioButton");
        // expect($radios.eq(0).hasClass("active")).to.be.true;

        $modal.find(".confirm").click();
        expect(requestCalled).to.be.true;
        expect(checkVersionCalled).to.be.true;
        expect(logoutCalled).to.be.false;
        assert.isFalse($modal.is(":visible"));

        UnitTest.hasAlertWithTitle("Stop Cluster Failed");

        xcHelper.sendRequest = oldRequest;
        XVM.checkVersion = oldCheckVersion;
        XcUser.CurrentUser.logout = oldLogout;
    });

    it("should handle cluster stop failure with backend failure", function() {
        let oldRequest = xcHelper.sendRequest;
        let requestCalled = false;
        xcHelper.sendRequest = () => {
            requestCalled = true;
            return PromiseHelper.resolve();
        }
        let oldCheckVersion = XVM.checkVersion;
        let checkVersionCalled = false;
        XVM.checkVersion = () => {
            checkVersionCalled = true;
            return PromiseHelper.reject();
        };

        let oldLogout = XcUser.CurrentUser.logout;
        let logoutCalled = false;
        XcUser.CurrentUser.logout = () => {
            logoutCalled = true;
        };

        modal.show();

        // let $radios = $modal.find(".radioButton");
        // expect($radios.eq(0).hasClass("active")).to.be.true;

        $modal.find(".confirm").click();
        expect(requestCalled).to.be.true;
        expect(checkVersionCalled).to.be.true;
        expect(logoutCalled).to.be.true;
        assert.isFalse($modal.is(":visible"));

        xcHelper.sendRequest = oldRequest;
        XVM.checkVersion = oldCheckVersion;
        XcUser.CurrentUser.logout = oldLogout;

    });

    // it("should logout if shut down not selected", function() {
    //     let oldRequest = xcHelper.sendRequest;
    //     let requestCalled = false;
    //     xcHelper.sendRequest = (type, url) => {
    //         debugger;
    //         requestCalled = true;
    //         return PromiseHelper.resolve();
    //     }
    //     let oldCheckVersion = XVM.checkVersion;
    //     let checkVersionCalled = false;
    //     XVM.checkVersion = () => {
    //         checkVersionCalled = true;
    //         return PromiseHelper.reject();
    //     };

    //     let oldLogout = XcUser.CurrentUser.logout;
    //     let logoutCalled = false;
    //     XcUser.CurrentUser.logout = () => {
    //         logoutCalled = true;
    //     };

    //     modal.show();

    //     let $radios = $modal.find(".radioButton");
    //     $radios.eq(1).click();
    //     expect($radios.eq(1).hasClass("active")).to.be.true;

    //     $modal.find(".confirm").click();
    //     expect(requestCalled).to.be.false;
    //     expect(checkVersionCalled).to.be.false;
    //     expect(logoutCalled).to.be.true;
    //     assert.isFalse($modal.is(":visible"));

    //     xcHelper.sendRequest = oldRequest;
    //     XVM.checkVersion = oldCheckVersion;
    //     XcUser.CurrentUser.logout = oldLogout;
    // });

    after(function() {
        UnitTest.offMinMode();
    });
});