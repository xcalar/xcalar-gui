describe("SQLSnippet Test", function() {
    let oldSnippets;
    let oldFetched;

    before(function() {
        sqlSnippet = SQLSnippet.Instance;
        oldSnippets = SQLSnippet.Instance._snippets;
        oldFetched = SQLSnippet.Instance._fetched;

        SQLSnippet.Instance._snippets = [{id: "id", name: "test", snippet: "val", app: "app"}];
    });

    it("should be a correct instance", function() {
        expect(SQLSnippet.Instance).to.be.an.instanceof(SQLSnippet);
    });

    it("list should work", function() {
        let res = SQLSnippet.Instance.list();
        expect(res).to.be.an("array");
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(SQLSnippet.Instance._snippets[0]);
    });

    it("getSnippet should work", function() {
        let res = SQLSnippet.Instance.getSnippetObj("id");
        expect(res.snippet).to.equal("val");
    });

    it("hasSnippet should work", function() {
        let res = SQLSnippet.Instance.hasSnippetWithName("test");
        expect(res).to.equal(true);
        res = SQLSnippet.Instance.hasSnippetWithName("test2");
        expect(res).to.equal(false);
    });

    it("update should work", async function(done) {
        let oldFunc = SQLSnippet.Instance._updateSnippets;
        let called = false;
        SQLSnippet.Instance._updateSnippets = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        try {
            await SQLSnippet.Instance.update("id", "new");
            expect(called).to.be.true;
            expect(SQLSnippet.Instance.getSnippetObj("id").snippet).to.equal("new");
            done();
        } catch (e) {
            done(e);
        } finally {
            SQLSnippet.Instance._updateSnippets = oldFunc;
        }
    });

    it("should delete snippet", async function(done) {
        let oldFunc = SQLSnippet.Instance._updateSnippets;
        let called = false;
        SQLSnippet.Instance._updateSnippets = () => {
            called = true;
        };

        try {
            await SQLSnippet.Instance._deleteSnippet("id");
            expect(called).to.be.true;
            expect(SQLSnippet.Instance.getSnippetObj("id")).to.be.null;
            done();
        } catch (e) {
            done(e);
        } finally {
            SQLSnippet.Instance._updateSnippets = oldFunc;
        }
    });

    it("should handle delete non existing snippet case", async function(done) {
        let oldFunc = SQLSnippet.Instance._updateSnippets;
        let called = false;
        SQLSnippet.Instance._updateSnippets = () => {
            called = true;
        };

        try {
            await SQLSnippet.Instance._deleteSnippet("id2");
            expect(called).to.be.false;
            done();
        } catch (e) {
            done(e);
        } finally {
            SQLSnippet.Instance._updateSnippets = oldFunc;
        }
    });

    it("_getKVStore should work", function() {
        let kvStore = SQLSnippet.Instance._getKVStore();
        expect(kvStore).to.be.an.instanceof(KVStore);
    });

    after(function() {
        SQLSnippet.Instance._snippets = oldSnippets;
        SQLSnippet.Instance._fetched = oldFetched;
    });
});