describe("ExtItem Constructor Test", function() {
    var extItem;

    beforeEach(function() {
        extItem = new ExtItem({
            "appName": "testItem",
            "version": "2.0",
            "XDVersion": "2.1",
            "maxXDVersion": "2.2",
            "description": "test",
            "author": "test user",
            "image": "testImage",
            "category": "test",
            "main": "main",
            "website": "http://test.com"
        });
    });

    it("should be a constructor", function() {
        expect(extItem).to.be.an.instanceof(ExtItem);
        expect(Object.keys(extItem).length).to.equal(9);
    });

    it("should get name", function() {
        expect(extItem.getName()).to.equal("testItem");
    });

    it("should get main name", function() {
        expect(extItem.getMainName()).to.equal("main");
        // empty main
        extItem.main = "";
        expect(extItem.getMainName()).to.equal("testItem");
    });

    it("should get category", function() {
        expect(extItem.getCategory()).to.equal("test");
    });

    it("should get author", function() {
        expect(extItem.getAuthor()).to.equal("test user");
    });

    it("should get description", function() {
        expect(extItem.getDescription()).to.equal("test");
    });

    it("should get version", function() {
        expect(extItem.getVersion()).to.equal("2.0");
    });

    it("should get XDversion", function() {
        expect(extItem.getMinXDVersion()).to.equal("2.1");
    });

    it("should get XDversion", function() {
        expect(extItem.getMaxXDVersion()).to.equal("2.2");
    });


    it("should get image", function() {
        let tests = [{
            "category": "System",
            "expect": "xi-system"
        }, {
            "category": "Imports",
            "expect": "xi-data-in"
        }, {
            "category": "Export/Publish",
            "expect": "xi-data-out"
        }, {
            "category": "SQL Mode",
            "expect": "xi-SQLworkspace"
        }, {
            "category": "Developer Mode",
            "expect": "xi-dfg2"
        }, {
            "category": "",
            "expect": "xi-power"
        }];
        tests.forEach((test) => {
            extItem.category = test.category;
            let image = extItem.getImage();
            if (image !== test.expect) {
                console.error("fail test", test);
            }
            expect(image).to.equal(test.expect);
        });
    });
});