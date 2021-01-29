describe("ExtCategorySet Constructor Test", function() {
    var extItem;

    before(function() {
        extItem = new ExtItem({
            "appName": "testItem",
            "version": "2.0",
            "description": "test",
            "author": "test user",
            "image": "testImage",
            "category": "test",
            "main": "main"
        });
    });

    it("ExtCategorySet should be constructor", function() {
        var extSet = new ExtCategorySet();

        expect(extSet).to.be.an("object");
        expect(Object.keys(extSet).length).to.equal(1);

        expect(extSet.has("test")).to.be.false;
        extSet.addExtension(extItem);
        expect(extSet.get("test").getName()).to.equal("test");

        var item2 = new ExtItem({
            "appName": "marketTestItem",
            "installed": false,
            "category": "marketTest",
            "repository": {
                "type": "market"
            }
        });

        expect(extSet.has("marketTest")).to.be.false;
        extSet.addExtension(item2);
        expect(extSet.has("marketTest")).to.be.true;
        expect(extSet.get("marketTest").getName()).to.equal("marketTest");
        var ext = extSet.getExtension("wrong category", "test");
        expect(ext).to.be.null;
        ext = extSet.getExtension("marketTest", "marketTestItem");
        expect(ext).not.to.be.null;
        expect(ext.getName()).to.equal("marketTestItem");

        var list = extSet.getList(true);
        expect(list.length).to.equal(2);
        expect(list[0].getName()).to.equal("marketTest");
        expect(list[1].getName()).to.equal("test");
    });
});