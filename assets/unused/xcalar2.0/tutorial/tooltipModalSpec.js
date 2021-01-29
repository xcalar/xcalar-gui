describe("TooltipModal Test", function() {
    var $modal;
    var oldWalkthroughs;
    var oldStart;

    before(function() {
        oldWalkthroughs = TooltipWalkthroughs.getAvailableWalkthroughs;
        oldStart = TooltipWalkthroughs.startWalkthrough;

        TooltipWalkthroughs.getAvailableWalkthroughs = function() {
            return [];
        }

        $modal = $("#tooltipModal");
        UnitTest.onMinMode();
    });


    it("should show available tooltips", function() {
        TooltipWalkthroughs.getAvailableWalkthroughs = function() {
            return [{
                name: "test1",
                description: "T1"
            }, {
                name: "test2",
                description: "T2"
            }];
        }
        TooltipModal.Instance.show();
        assert.isTrue($modal.is(":visible"));
        expect($modal.find(".item").length).to.equal(2);
        expect($modal.find("[data-name='test1']").eq(0).text()).to.equal("test1");
        expect($modal.find(".detail").eq(1).text()).to.equal("T2");
        expect($modal.find(".confirm").length).to.equal(2);
    });

    it("should close modal", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    it("should 'start' a walkthrough", function(done) {
        TooltipWalkthroughs.getAvailableWalkthroughs = function() {
            return [{
                name: "test1",
                description: "T1"
            }];
        }
        TooltipWalkthroughs.startWalkthrough = function(name) {
            expect(name).to.equal("test1");
            assert.isFalse($modal.is(":visible"));
            done();
        }
        TooltipModal.Instance.show();
        assert.isTrue($modal.is(":visible"));
        $modal.find(".confirm").click();
    });


    after(function() {
        TooltipWalkthroughs.getAvailableWalkthroughs = oldWalkthroughs;
        TooltipWalkthroughs.startWalkthrough = oldStart;
        UnitTest.offMinMode();
    });
});