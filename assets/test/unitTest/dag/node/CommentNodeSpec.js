describe("Comment Node Test", () => {
    let node;

    before(() => {
        console.log("Comment node test");
        node = new CommentNode({});
    });

    it("should have default properties", function() {
        expect(node.text).to.equal("");
        expect(node.display).to.deep.equal({
            x: -1,
            y: -1,
            width: 180,
            height: 80
        });
    });

    it("get id should work", function() {
        expect(node.getId().startsWith("comment")).to.be.true;
    });

    it("get/set text should work", function() {
        node.setText("test");
        expect(node.getText()).to.equal("test");
    });

    it('clear should work', function() {
        node.clear();
        expect(node.getText()).to.equal("");
    });

    it("get/set position", function() {
        node.setPosition({x: 100, y: 100});
        expect(node.getPosition()).to.deep.equal({
            x: 100,
            y: 100
        });
    });

    it("get/set dimension", function() {
        node.setDimensions({width: 200, height: 200});
        expect(node.getDimensions()).to.deep.equal({
            width: 200,
            height: 200
        });
    });

    it("get display should work", function() {
        expect(node.getDisplay()).to.deep.equal({
            x: 100,
            y: 100,
            width: 200,
            height: 200
        });
    });

    it("getSerializeObj should work", function() {
        node.setText("blah")
        expect(node.getSerializableObj()).to.deep.equal({
            id: node.getId(),
            text: "blah",
            display: {
                x: 100,
                y: 100,
                width: 200,
                height: 200
            }
        })
    });

    it("schema should flag negative coordinates", function() {
        let ajv = new Ajv();
        let validate = ajv.compile(CommentNode.schema);
        node.setPosition({
            x: -1,
            y: -1
        });
        let valid = validate(node.getSerializableObj());

        expect(valid).to.be.false;
        expect(validate.errors.length).to.equal(1);
        expect(validate.errors[0].keyword).to.equal("minimum");
        expect(validate.errors[0].message).to.equal("should be >= 0");
        expect(validate.errors[0].dataPath).to.equal(".display.x");

        node.setPosition({
            x: 0,
            y: 0
        });
        valid = validate(node.getSerializableObj());
        expect(valid).to.be.true;
        expect(validate.errors).to.be.null;
    });

});