describe("DagNodeDatasetInput Test", function() {
    it("should be the correct instance", function() {
        let input = new DagNodeDatasetInput();
        expect(input).to.be.an.instanceof(DagNodeDatasetInput);
    });

    it("hasParametersChanges should work", function() {
        let param1 = {
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: ""
        };
        let input = new DagNodeDatasetInput({});
        input.setInput(param1);
        let res = input.hasParametersChanges();
        expect(res).to.be.true;

        // case 2
        let param2 = {
            source: "dataset1",
            prefix: "test",
            synthesize: false,
            loadArgs: "abc"
        };
        input.setInput(param2);
        res = input.hasParametersChanges();
        expect(res).to.be.false;

        // case 3
        input.setInput(null);
        res = input.hasParametersChanges();
        expect(res).to.be.true;
    });
});