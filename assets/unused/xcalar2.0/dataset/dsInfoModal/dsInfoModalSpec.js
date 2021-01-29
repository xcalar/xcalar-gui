// this modal is deprecated since the data mart change
describe.skip("DSInfoModal Test", function() {
    var $modal;
    var oldGetDSUsers;
    var ds;
    var dsId;

    before(function() {
        $modal = $("#dsInfoModal");
        var testName = xcHelper.randName("testUser.testDS");
        ds = DS.addCurrentUserDS(testName, {
            "format": "CSV",
            "path": "testPath"
        });
        dsId = ds.getId();
        oldGetDSUsers = XcalarGetDatasetUsers;
    });

    it("should show the ds info with used by info", function(done) {
        XcalarGetDatasetUsers = function() {
            return PromiseHelper.resolve([{
                "userId": {
                    "userIdName": "testName"
                }
            }]);
        };

        showModal()
        .then(function() {
            // assert.isTrue($modal.is(":visible"));
            expect($modal.find(".name .content").text())
            .to.equal(ds.getName());

            expect($modal.find(".owner .content").text())
            .to.equal(ds.getUser());

            expect($modal.find(".user .content").text())
            .to.contains("testName");

            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should show the ds info with empty used by info", function(done) {
        XcalarGetDatasetUsers = function() {
            return PromiseHelper.resolve([]);
        };

        showModal()
        .then(function() {
            assert.isTrue($modal.is(":visible"));
            expect($modal.find(".name .content").text())
            .to.equal(ds.getName());

            expect($modal.find(".owner .content").text())
            .to.equal(ds.getUser());

            expect($modal.find(".user .content").text())
            .to.contains("--");

            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should show the ds when get user has error", function(done) {
        XcalarGetDatasetUsers = function() {
            return PromiseHelper.reject("test");
        };

        showModal()
        .then(function() {
            assert.isTrue($modal.is(":visible"));
            expect($modal.find(".name .content").text())
            .to.equal(ds.getName());

            expect($modal.find(".owner .content").text())
            .to.equal(ds.getUser());

            expect($modal.find(".user .content").text())
            .to.equal("N/A");

            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should close modal", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should close modal by click other place", function(done) {
        showModal()
        .then(function() {
            $(document).mouseup();
            assert.isFalse($modal.is(":visible"));
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    after(function() {
        DS.__testOnly__.removeDS(dsId);
        XcalarGetDatasetUsers = oldGetDSUsers;
    });

    function showModal() {
        $modal.addClass("fetching");
        DSInfoModal.Instance.show(dsId);

        var checkFunc = function() {
            return !$modal.hasClass("fetching");
        };

        return UnitTest.testFinish(checkFunc);
    }
});