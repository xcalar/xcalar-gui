describe("Durable Constructor Test", function() {
    it("should be the correct instance", function() {
        let instance = new Durable();
        expect(instance.getVersion()).to.equal(Durable.Version);
    });

    it("should restore with version", function() {
        let instance = new Durable(100);
        expect(instance.getVersion()).to.equal(100);
    });
});