describe("ColFunc Constructor Test", function() {
    it("should have 3 attributes", function() {
        let colFunc = new ColFunc({
            "name": "test",
            "args": "pull(test)"
        });

        expect(colFunc).to.be.an.instanceof(ColFunc);
        expect(Object.keys(colFunc).length).to.equal(3);
        expect(colFunc).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(colFunc).to.have.property("name")
        .and.to.equal("test");
        expect(colFunc).to.have.property("args")
        .and.to.equal("pull(test)");
    });
});