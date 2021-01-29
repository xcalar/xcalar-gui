describe("XcQuery Test", function() {
    it("Should have 22 attributes", function() {
        var xcQuery = new XcQuery({
            "name": "test",
            "fullName": "full test",
            "time": 123,
            "type": "xcFunction",
            "id": 1,
            "numSteps": 2
        });

        expect(xcQuery).to.be.an.instanceof(XcQuery);
        expect(Object.keys(xcQuery).length).to.equal(21);
        expect(xcQuery).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(xcQuery).to.have.property("name")
        .and.to.equal("test");
        expect(xcQuery).to.have.property("time")
        .and.to.equal(123);
        expect(xcQuery).to.have.property("elapsedTime")
        .and.to.equal(0);
        expect(xcQuery).to.have.property("fullName")
        .and.to.equal("full test");
        expect(xcQuery).to.have.property("type")
        .and.to.equal("xcFunction");
        expect(xcQuery).to.have.property("subQueries")
        .and.to.be.an("array");
        expect(xcQuery).to.have.property("id")
        .and.to.equal(1);
        expect(xcQuery).to.have.property("numSteps")
        .and.to.equal(2);
        expect(xcQuery).to.have.property("currStep")
        .and.to.equal(0);
        expect(xcQuery).to.have.property("outputTableName")
        .and.to.equal("");
        expect(xcQuery).to.have.property("outputTableState")
        .and.to.equal("");
        expect(xcQuery).to.have.property("queryStr")
        .and.to.equal("");
        expect(xcQuery).to.have.property("srcTables")
        .and.to.be.null;
        expect(xcQuery).to.have.property("state")
        .and.to.equal(QueryStateT.qrNotStarted);
        expect(xcQuery).to.have.property("cancelable")
        .and.to.be.true;
        expect(xcQuery).to.have.property("opTime")
        .and.to.equal(0);
        expect(xcQuery).to.have.property("opTime")
        .and.to.equal(0);
        expect(xcQuery).to.have.property("opTimeAdded")
        .and.to.be.false;
        expect(xcQuery).to.have.property("error");
        expect(xcQuery).to.have.property("indexTables");
        expect(xcQuery).to.have.property("queryMeta");
    });

    it("XcQuery OOP function should work", function() {
        var xcQuery = new XcQuery({
            "name": "test2",
            "fullName": "full test2",
            "time": 456,
            "state": QueryStateT.qrProcessing,
            "queryMeta": "test"
        });

        expect(xcQuery.getName()).to.equal("test2");
        expect(xcQuery.getFullName()).to.equal("full test2");
        expect(xcQuery.getTime()).to.equal(456);
        expect(xcQuery.getState()).to.equal(QueryStateT.qrProcessing);
        expect(xcQuery.getStateString()).to.equal("qrProcessing");
        expect(xcQuery.getQueryMeta()).to.equal("test");
    });

    it("XcQuery.parseTimeFromKey should work", function() {
        const now = Date.now();
        // Valide key
        let key = `${now}-testName`;
        expect(XcQuery.parseTimeFromKey(key)).to.be.equal(now);
        // Invalid format
        key = 'testName';
        expect(Number.isNaN(XcQuery.parseTimeFromKey(key))).to.be.true;
        // Invalid time
        key = 'invalidTime-testName';
        expect(Number.isNaN(XcQuery.parseTimeFromKey(key))).to.be.true;
        // Something would cause exception
        expect(Number.isNaN(XcQuery.parseTimeFromKey())).to.be.true;
    });
});