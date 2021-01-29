describe("ExtCategory Constructor Test", function() {
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

    it("ExtCategory should be a constructor", function() {
        var extCategory = new ExtCategory("test category");

        expect(extCategory).to.be.an("object");
        expect(Object.keys(extCategory).length).to.equal(2);

        expect(extCategory.getName()).to.equal("test category");
        var res = extCategory.addExtension(extItem);
        expect(res).to.be.true;
        // cannot add the same extension twice
        res = extCategory.addExtension(extItem);
        expect(res).to.be.false;

        expect(extCategory.getExtension("testItem").getName()).to.equal("testItem");
        expect(extCategory.hasExtension("testItem")).to.equal(true);

        var list = extCategory.getExtensionList();
        expect(list.length).to.equal(1);
        expect(list[0].getName()).to.equal("testItem");
        list = extCategory.getExtensionList("noResultKey");
        expect(list.length).to.equal(0);
    });
});