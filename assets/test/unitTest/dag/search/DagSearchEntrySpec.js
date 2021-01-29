describe("DagSearchEntry Test", function() {
    it("should initialize correctly when pass in correct args in constructor", function() {
        // arrange
        const selector = () => {};
        // act
        const searchEntry = new DagSearchEntry({
            tabId: "testTab",
            nodeId: "testNode",
            selector: selector
        });
        // assert
        expect(searchEntry).to.be.an.instanceof(DagSearchEntry);
        expect(searchEntry.tabId).to.equal("testTab");
        expect(searchEntry.nodeId).to.equal("testNode");
        expect(searchEntry.selector).to.equal(selector);
    });

    it("should return cached $el when call getMatchElement if has cache", function() {
        // arrange
        const searchEntry = new DagSearchEntry({});
        const $fakeEl = $();
        searchEntry.$el = $fakeEl;
        // act
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el).to.equal($fakeEl);
    });

    it("should return empty jQuery element when no related dagView", function() {
        // arrange
        const oldFunc = DagViewManager.Instance.getDagViewById;
        DagViewManager.Instance.getDagViewById = () => null;
        // act
        const searchEntry = new DagSearchEntry({});
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el.get(0)).to.equal(undefined);

        DagViewManager.Instance.getDagViewById = oldFunc;
    });

    it("should return empty jQuery element when selector is not specified", function() {
        // arrange
        const oldFunc = DagViewManager.Instance.getDagViewById;
        const $fakeEl = $();
        DagViewManager.Instance.getDagViewById = () => {
            return {
                getNodeElById: () => $fakeEl
            }
        };
        // act
        const searchEntry = new DagSearchEntry({});
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el.get(0)).to.equal(undefined);
        expect($el).not.to.equal($fakeEl);

        DagViewManager.Instance.getDagViewById = oldFunc;
    });

    it("should return but not cache the result when matched element is empty", function() {
        // arrange
        const oldFunc = DagViewManager.Instance.getDagViewById;
        const $fakeEl = $();
        DagViewManager.Instance.getDagViewById = () => {
            return {
                getNodeElById: () => $fakeEl
            }
        };
        // act
        const searchEntry = new DagSearchEntry({
            selector: () => $fakeEl
        });
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el).to.equal($fakeEl);
        expect(searchEntry.$el).to.equal(undefined);

        DagViewManager.Instance.getDagViewById = oldFunc;
    });

    it("should return and cache the result when matched element found", function() {
        // arrange
        const oldFunc = DagViewManager.Instance.getDagViewById;
        const $fakeEl = $("<div></div>");
        DagViewManager.Instance.getDagViewById = () => {
            return {
                getNodeElById: () => $fakeEl
            }
        };
        // act
        const searchEntry = new DagSearchEntry({
            selector: () => $fakeEl
        });
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el).to.equal($fakeEl);
        expect(searchEntry.$el).to.equal($fakeEl);

        DagViewManager.Instance.getDagViewById = oldFunc;
    });

    it("should return empty jQuery element when in eror case", function() {
        // arrange
        const oldFunc = DagViewManager.Instance.getDagViewById;
        DagViewManager.Instance.getDagViewById = () => {
            throw new Error("test");
        };
        // act
        const searchEntry = new DagSearchEntry({});
        const $el = searchEntry.getMatchElement();
        // assert
        expect($el.get(0)).to.equal(undefined);

        DagViewManager.Instance.getDagViewById = oldFunc;
    });
});