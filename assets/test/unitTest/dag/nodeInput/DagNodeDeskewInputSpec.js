describe("DagNodeDeskewtInput Test", function() {
    let input;

    before(function() {
        input = new DagNodeDeskewInput();
    });

    it("getInput should work", function() {
        expect(input.getInput()).to.deep.equal({
            "column": "",
            'newKey': "",
            "outputTableName": ""
        });
        input.setInput({"column": "test", "newKey": "test2"});
        expect(input.getInput()).to.deep.equal({
            "column": "test",
            "newKey": "test2",
            "outputTableName": ""
        });
    });
});