describe("Authentication Test", function() {

    describe("Basic API Test", function() {
        it("should get hash id", function() {
            var res = Authentication.getHashId();
            expect(res.startsWith("#t")).to.equal(true);
            res = Authentication.getHashId(true);
            expect(res.startsWith("t")).to.equal(true);
        });
    });
});
