describe("XcLog Constructor Test", function() {
    it("Should have 5 attributes", function() {
        var log = new XcLog({
            "title": "test1",
            "cli": "cliTest",
            "options": {
                "operation": "foo"
            }
        });

        expect(log).to.be.an.instanceof(XcLog);
        expect(Object.keys(log).length).to.equal(5);

        expect(log).to.have.property("version").and.to.equal(Durable.Version);
        expect(log).to.have.property("cli").and.to.equal("cliTest");
        expect(log).to.have.property("timestamp")
        .and.to.be.a("number");
    });

    it("Should know if is error log", function() {
        var log1 = new XcLog({
            "title": "test1",
            "cli": "cliTest",
            "options": {
                "operation": "foo"
            }
        });

        var log2 = new XcLog({
            "title": "test2",
            "cli": "cliTest2",
            "error": "testError",
            "options": {
                "operation": "bar"
            }
        });

        expect(log1.isError()).to.be.false;
        expect(log2.isError()).to.be.true;
    });

    it("Should get operation", function() {
        var log = new XcLog({
            "title": "test1",
            "cli": "cliTest",
            "options": {
                "operation": "foo"
            }
        });
        expect(log.getOperation()).to.equal("foo");
    });

    it("Shoult get title", function() {
        var log = new XcLog({
            "title": "test1",
            "cli": "cliTest",
            "options": {
                "operation": "foo"
            }
        });
        expect(log.getTitle()).to.equal("test1");
    });

    it("Should get options", function() {
        var log = new XcLog({
            "title": "test1",
            "cli": "cliTest",
            "options": {
                "operation": "foo"
            }
        });
        expect(log.getOptions()).to.be.an("object");
    });
});