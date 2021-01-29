describe("ProfileInfo Constructor Test", function() {
    it("should have 8 attributes", function() {
        var profileInfo = new ProfileInfo({
            "id": "testModal",
            "colName": "testCol",
            "frontColName": "testFrontCol",
            "type": "integer"
        });

        expect(profileInfo).to.be.an.instanceof(ProfileInfo);
        expect(Object.keys(profileInfo).length).to.equal(8);
        expect(profileInfo).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(profileInfo).to.have.property("id")
        .and.to.equal("testModal");
        expect(profileInfo).to.have.property("colName")
        .and.to.equal("testCol");
        expect(profileInfo).to.have.property("frontColName")
        .and.to.equal("testFrontCol");
        expect(profileInfo).to.have.property("type")
        .and.to.equal("integer");
        expect(profileInfo).to.have.property("aggInfo")
        .and.to.be.an("object");
        expect(profileInfo).to.have.property("statsInfo")
        .and.to.be.an("object");
        expect(profileInfo).to.have.property("groupByInfo")
        .and.to.be.an("object");
    });

    it("should have aggInfo", function() {
        var aggInfo = {
            "max": 1,
            "min": 1,
            "count": 1,
            "sum": 1,
            "average": 1,
            "sd": 0
        };
        var profileInfo = new ProfileInfo({
            "aggInfo": aggInfo
        });
        expect(profileInfo.aggInfo).not.to.equal(aggInfo);
        expect(profileInfo.aggInfo).deep.to.equal(aggInfo);
    });

    it("should have statsInfo", function() {
        var statsInfo = {
            key: "test",
            unsorted: false,
            zeroQuartile: 2,
            lowerQuartile: 2,
            median: 3,
            upperQuartile: 2,
            fullQuartile: 4
        };
        var profileInfo = new ProfileInfo({
            "statsInfo": statsInfo
        });
        expect(profileInfo.statsInfo).not.to.equal(statsInfo);
        expect(profileInfo.statsInfo).deep.to.equal(statsInfo);
    });

    it("should have groupByInfo", function() {
        var bucketInfo = {
            "bucketSize": 0,
            "table": "testTable",
            "colName": "testCol",
            "max": 1,
            "sum": 1
        };

        var groupByInfo = {
            "allNull": true,
            "buckets": {
                0: bucketInfo
            }
        };
        var profileInfo = new ProfileInfo({
            "groupByInfo": groupByInfo
        });
        expect(profileInfo.groupByInfo).not.to.equal(groupByInfo);
        expect(profileInfo.groupByInfo).deep.to.equal(groupByInfo);
    });

    it("should get id", function() {
        var profileInfo = new ProfileInfo({
            "id": "testModal",
            "colName": "testCol",
            "type": "integer"
        });
        expect(profileInfo.getId()).to.equal("testModal");
    });

    it("should add bucket", function() {
        var profileInfo = new ProfileInfo({
            "id": "testModal",
            "colName": "testCol",
            "type": "integer"
        });
        profileInfo.addBucket(0, {
            "bucketSize": 0,
            "table": "testTable"
        });
        expect(profileInfo.groupByInfo.buckets).to.have.property(0);
    });
});