describe("SharedDSInfo Constructor Test", function() {
    it("should have 3 attributes", function() {
        let sharedDSInfo = new SharedDSInfo();
        expect(sharedDSInfo).to.be.an.instanceof(SharedDSInfo);
        expect(Object.keys(sharedDSInfo).length).to.equal(3);
        expect(sharedDSInfo.version).to.equal(Durable.Version);        
    });

    it("should getDSInfo", function() {
        let dsObj = new DSObj();
        let sharedDSInfo = new SharedDSInfo({
            "DS": dsObj
        });
        expect(sharedDSInfo.getDSInfo()).to.equal(dsObj);
    });

    it("should updateDSInfo", function() {
        let dsObj = new DSObj();
        let sharedDSInfo = new SharedDSInfo();
        expect(sharedDSInfo.getDSInfo()).to.deep.equal({});

        sharedDSInfo.updateDSInfo(dsObj);
        expect(sharedDSInfo.getDSInfo()).to.equal(dsObj);
    });

    it("should get version id", function() {
        let sharedDSInfo = new SharedDSInfo({
            "VersionId": 10
        });
        expect(sharedDSInfo.getVersionId()).to.equal(10);
    });

    it("should set version id", function() {
        let sharedDSInfo = new SharedDSInfo({
            "VersionId": 1
        });
        expect(sharedDSInfo.getVersionId()).to.equal(1);

        sharedDSInfo.setVersionId(2);
        expect(sharedDSInfo.getVersionId()).to.equal(2);
    });

    it("should handle case in set version id", function() {
        let sharedDSInfo = new SharedDSInfo({
            "VersionId": 10
        });
        expect(sharedDSInfo.getVersionId()).to.equal(10);

        sharedDSInfo.setVersionId(2);
        expect(sharedDSInfo.getVersionId()).to.equal(10);

        // case 2
        sharedDSInfo.setVersionId("11");
        expect(sharedDSInfo.getVersionId()).to.equal(10);

        // case 3
        sharedDSInfo.setVersionId(1 / 0);
        expect(sharedDSInfo.getVersionId()).to.equal(10);
    });

    it("should update version id", function() {
        let sharedDSInfo = new SharedDSInfo({
            "VersionId": 1
        });
        expect(sharedDSInfo.getVersionId()).to.equal(1);

        sharedDSInfo.updateVersionId();
        expect(sharedDSInfo.getVersionId()).to.equal(2);
    });

    it("should serialize", function() {
        let options = {
            version: 1,
            DS: {},
            VersionId: 10
        };
        let sharedDSInfo = new SharedDSInfo(options);
        let res = sharedDSInfo.serialize();
        expect(JSON.parse(res)).to.deep.equal(options);
    });
});