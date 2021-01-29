describe("LicenseModal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#licenseModal");
        UnitTest.onMinMode();
    });

    it("should show modal", function() {
        LicenseModal.Instance.show();
        assert.isTrue($modal.is(":visible"));
    });

    it("should submit form", function(done) {
        var testUpdate;
        var oldUpdate = XcalarUpdateLicense;
        var oldSuccess = xcUIHelper.showSuccess;

        XcalarUpdateLicense = function(input) {
            testUpdate = input;
            return PromiseHelper.resolve();
        };

        xcUIHelper.showSuccess = function() {};

        $modal.find(".newLicenseKey").val("test");
        LicenseModal.Instance._submitForm()
        .then(function() {
            expect(testUpdate).to.equal("test");
            assert.isFalse($modal.is(":visible"));
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUpdateLicense = oldUpdate;
            xcUIHelper.showSuccess = oldSuccess;
        });
    });

    it("should show fail message when submit fails", function(done) {
        var testFail;
        var oldUpdate = XcalarUpdateLicense;
        var oldFail = xcUIHelper.showFail;
        var testObj = {"error": "test"};

        XcalarUpdateLicense = function() {
            return PromiseHelper.reject(testObj);
        };

        xcUIHelper.showFail = function(input) {
            testFail = input;
        };

        LicenseModal.Instance._submitForm()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(testObj).to.equal(error);
            expect(testFail).to.contains(JSON.stringify(error));
            assert.isFalse($modal.is(":visible"));
            done();
        })
        .always(function() {
            XcalarUpdateLicense = oldUpdate;
            xcUIHelper.showFail = oldFail;
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});
