describe("DagParamManager Test", function() {
    before(function() {
        console.log("DagParamManager Test");
    });
    it("setup should work", function() {
        var called = false;
        var cachedFn = XcalarKeyLookup;
        XcalarKeyLookup = (key, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(scope).to.equal(3);
            called = true;
            return PromiseHelper.resolve({value: '{"a":"b"}'});
        };

        DagParamManager.Instance.setup();
        expect(called).to.be.true;
        expect(DagParamManager.Instance.parameters).to.deep.equal({
            "a": "b"
        });
        XcalarKeyLookup = cachedFn;
    });

    it('setup with no params should work', function() {
        var called = false;
        var cachedFn = XcalarKeyLookup;
        XcalarKeyLookup = (key, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(scope).to.equal(3);
            called = true;
            return PromiseHelper.resolve({value: ""});
        };

        DagParamManager.Instance.setup();
        expect(called).to.be.true;
        expect(DagParamManager.Instance.parameters).to.deep.equal({});
        XcalarKeyLookup = cachedFn;
    });

    it('setup with invalid json should work', function() {
        var called = false;
        var cachedFn = XcalarKeyLookup;
        XcalarKeyLookup = (key, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(scope).to.equal(3);
            called = true;
            return PromiseHelper.resolve({value: "a"});
        };

        DagParamManager.Instance.setup();
        expect(called).to.be.true;
        expect(DagParamManager.Instance.parameters).to.deep.equal({});
        XcalarKeyLookup = cachedFn;
    });

    it('setup with failed kvstore should work', function() {
        var called = false;
        var cachedFn = XcalarKeyLookup;
        XcalarKeyLookup = (key, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(scope).to.equal(3);
            called = true;
            return PromiseHelper.reject({value: '{"a":"b"}'});
        };

        DagParamManager.Instance.setup();
        expect(called).to.be.true;
        expect(DagParamManager.Instance.parameters).to.deep.equal({});
        XcalarKeyLookup = cachedFn;
    });

    it("getParamMap should work", function() {
        var called = false;
        var cachedFn = XcalarKeyLookup;
        XcalarKeyLookup = (key, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(scope).to.equal(3);
            called = true;
            return PromiseHelper.resolve({value: '{"c":"d"}'});
        };
        DagParamManager.Instance.setup();
        expect(called).to.be.true;
        expect(DagParamManager.Instance.getParamMap()).to.deep.equal({
            "c": "d"
        });
        XcalarKeyLookup = cachedFn;
    });

    it("updateParamMap should work", function() {
        var called = false;
        var cachedFn = XcalarKeyPut;
        XcalarKeyPut = (key, value, scope) => {
            expect(key).to.equal("gDagParamKey-1");
            expect(value).to.equal('{"e":"f"}');
            called = true;
            return PromiseHelper.resolve();
        };

        DagParamManager.Instance.updateParamMap({"e": "f"});
        expect(called).to.be.true;
        expect(DagParamManager.Instance.getParamMap()).to.deep.equal({
            "e": "f"
        });
        XcalarKeyPut = cachedFn;
    });

});