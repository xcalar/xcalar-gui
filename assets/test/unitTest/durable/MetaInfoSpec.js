describe("MetaInfo Constructor Test", function() {
    var metaInfos;

    it("should have 4 attributs", function() {
        var table = new TableMeta({
            "tableId": "test",
            "tableName": "testTable"
        });

        var profile = new ProfileInfo({
            "id": "testId"
        });

        var query = new XcQuery({
            "name": "testQuery"
        });

        metaInfos = new MetaInfo({
            "TILookup": {"test": table},
            "statsCols": {"testTable": {"testCol": profile}},
            "query": [query]
        });

        expect(metaInfos).to.be.an.instanceof(MetaInfo);
        expect(Object.keys(metaInfos).length).to.equal(4);
        expect(metaInfos.version).to.equal(Durable.Version);
    });

    it("should get table meta", function() {
        var tableMeta = metaInfos.getTableMeta();
        expect(tableMeta["test"]).to.exist;
    });

    it("should get stats meta", function() {
        var profileMeta = metaInfos.getStatsMeta();
        expect(profileMeta["testTable"]["testCol"]).to.exist;
    });

    it("should get query meta", function() {
        var queryList = metaInfos.getQueryMeta();
        expect(queryList.length).to.equal(1);
        expect(queryList[0].name).to.equal("testQuery");
    });

    it("should serialize", function() {
        let res = metaInfos.serialize();
        let parsed = JSON.parse(res);
        let newMetaInfo = new MetaInfo(parsed);
        expect(newMetaInfo.getTableMeta()).not.to.have.property("test");
        expect(newMetaInfo.getStatsMeta()).not.to.have.property("testTable");
        expect(newMetaInfo.getQueryMeta().length).to.equal(0);
    });
});