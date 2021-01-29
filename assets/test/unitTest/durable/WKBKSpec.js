describe("WKBK Constructor Test", function() {
    it("should hanlde create error", function() {
        try {
            new WKBK();
        } catch (error) {
            expect(error).not.to.be.null;
        }
    });

    it("should have 10 attributes", function() {
        let wkbk = new WKBK({
            "name": "test",
            "id": "testId",
            "created": 1234,
            "modified": 2234,
            "resource": true,
            "description": "testDescription",
            "sessionId": 'testSessionId'
        });

        expect(Object.keys(wkbk).length).to.equal(10);
        expect(wkbk).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(wkbk).to.have.property("name")
        .and.to.equal("test");
        expect(wkbk).to.have.property("id")
        .and.to.equal("testId");
        expect(wkbk).to.have.property("noMeta")
        .and.to.be.false;
        expect(wkbk).to.have.property("created")
        .and.to.equal(1234);
        expect(wkbk).to.have.property("modified")
        .and.to.equal(2234);
        expect(wkbk).to.have.property("resource")
        .and.to.be.true;
        expect(wkbk).to.have.property("description")
        .and.to.equal("testDescription");
        expect(wkbk).to.have.property("sessionId")
        .and.to.equal("testSessionId");
    });

    it("WKBK Basic function should work", function() {
        let wkbk = new WKBK({
            "name": "test",
            "id": "testId",
            "noMeta": false,
            "created": 1234,
            "modified": 2234,
            "description": "testDescription"
        });

        expect(wkbk.getId()).to.equal("testId");
        expect(wkbk.getName()).to.equal("test");
        expect(wkbk.getCreateTime()).to.equal(1234);
        expect(wkbk.getModifyTime()).to.equal(2234);
        expect(wkbk.isNoMeta()).to.be.false;
        expect(wkbk.getDescription()).to.equal("testDescription");
    });

    it("should set description", function() {
        let wkbk = new WKBK({
            "name": "test",
            "id": "testId"
        });
        wkbk.setDescription("test");
        expect(wkbk.getDescription()).to.equal("test");
    });

    it("should set resource", function() {
        let wkbk = new WKBK({
            "name": "test",
            "id": "testId"
        });

        expect(wkbk.hasResource()).to.be.false;
        wkbk.setResource(true);
        expect(wkbk.hasResource()).to.be.true;
    });

    it("should update", function() {
        let wkbk = new WKBK({
            "name": "test",
            "id": "testId",
            "modified": 2234
        });
        wkbk.noMeta = true;
        expect(wkbk.isNoMeta()).to.be.true;

        wkbk.update();
        expect(wkbk.noMeta).to.be.false;
        expect(wkbk.getModifyTime()).not.to.equal(2234);
    });
});