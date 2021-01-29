describe("KVVersion Test", function() {
    it("should be the correct instance", function() {
        let kvVersion = new KVVersion();
        expect(kvVersion.version).to.equal(Durable.Version);
        expect(kvVersion.shouldStrimEmail()).to.equal(false);
    });

    it("should restore from durable meta", function() {
        let kvVersion = new KVVersion({version: 100, stripEmail: true});
        expect(kvVersion.version).to.equal(100);
        expect(kvVersion.shouldStrimEmail()).to.equal(true);
    });

    it("should serialize", function() {
        let kvVersion = new KVVersion();
        let res = kvVersion.serialize();
        let json = JSON.parse(res);
        expect(json.version).to.equal(Durable.Version);
        expect(json.stripEmail).to.be.undefined;
    });

    it("should serialize case 2", function() {
        let kvVersion = new KVVersion({version: 100, stripEmail: true});
        let res = kvVersion.serialize();
        let json = JSON.parse(res);
        expect(json.version).to.equal(100);
        expect(json.stripEmail).to.be.true;
    });
});