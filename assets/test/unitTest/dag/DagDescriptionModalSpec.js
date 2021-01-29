describe("DagDescriptionModal Test", function() {
    var $modal;
    var dagViewCache;
    var fakeNode;

    before(function() {
        UnitTest.onMinMode();
        $modal = $("#dagDescriptionModal");

        dagViewCache = DagViewManager.Instance.getActiveDag;
        fakeNode = {
            getDescription: function(){return ""},
            getId: function(){return "someId"}
        };
        DagViewManager.Instance.getActiveDag = function() {
            return {
                getNode: function() {
                    return fakeNode;
                }
            };
        };
    });
    describe("testing show and initial state", function() {

        it("should show with no description", function() {
            DagDescriptionModal.Instance.show("someId");
            $modal.find(".close").click();
        });
        it("should show with description", function() {
            fakeNode = {
                getDescription: function(){return "something"},
                getId: function(){return "someId"}
            };
            DagDescriptionModal.Instance.show("someId");
            expect($modal.find("textarea").val()).to.equal("something");

        });
        it("should not open if already open", function() {
            fakeNode = {
                getDescription: function(){return "somethingElse"},
                getId: function(){return "someId"}
            };
            DagDescriptionModal.Instance.show("someId");
            expect($modal.find("textarea").val()).to.equal("something");
            fakeNode = {
                getDescription: function(){return "something"},
                getId: function(){return "someId"}
            };
        });
        it("clear should work", function() {
            expect($modal.find("textarea").val()).to.equal("something");
            $modal.find(".clear").click();
            expect($modal.find("textarea").val()).to.equal("");
        });
    });

    describe("submitting", function() {
        it("should validate length", function() {
            var cachedFn = DagViewManager.Instance.editDescription;
            var called = false;
            DagViewManager.Instance.editDescription = function() {
                called = true;
                return PromiseHelper.reject();
            };
            var text = "a".repeat(XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen + 1);

            $modal.find("textarea").val(text);
            $modal.find(".confirm").click();
            UnitTest.hasStatusBoxWithError('The maximum allowable description length is ' +
            XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen +
            ' but you provided ' + (XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen + 1) + ' characters.');
            expect(called).to.be.false;
            DagViewManager.Instance.editDescription = cachedFn;
        });

        it("valid description should work", function() {
            var cachedFn = DagViewManager.Instance.editDescription;
            var called = false;
            DagViewManager.Instance.editDescription = function(nodeId, text) {
                expect(nodeId).to.equal("someId");
                expect(text).to.equal("a".repeat(XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen));
                called = true;
                return PromiseHelper.resolve();
            };

            var text = "a".repeat(XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen);
            $modal.find("textarea").val(text);
            $modal.find(".confirm").click();

            expect(called).to.be.true;

            DagViewManager.Instance.editDescription = cachedFn;
        });

        it("no description should work", function() {
            DagDescriptionModal.Instance.show("someId");
            var cachedFn = DagViewManager.Instance.editDescription;
            var called = false;
            DagViewManager.Instance.editDescription = function(nodeId, text) {
                expect(nodeId).to.equal("someId");
                expect(text).to.equal("");
                called = true;
                return PromiseHelper.resolve();
            };

            $modal.find("textarea").val("");
            $modal.find(".confirm").click();

            expect(called).to.be.true;

            DagViewManager.Instance.editDescription = cachedFn;
        });
    });

    after(function() {
        UnitTest.offMinMode();
        DagViewManager.Instance.getActiveDag = dagViewCache;
    });
});