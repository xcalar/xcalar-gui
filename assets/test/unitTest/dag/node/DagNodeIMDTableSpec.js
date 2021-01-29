describe("DagNodeIMDTable Test", () => {
    let node;

    before(() => {
        node = new DagNodeIMDTable({});
    });

    it("should be an imd table node", () => {
        expect(node.getType()).to.equal(DagNodeType.IMDTable);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            source: "",
            version: -1,
            schema: [],
            filterString: "",
            limitedRows: null,
            outputTableName: ""
        });
    });

    it("should set parameter", () => {

        const testParam = {
            source: "imdsource",
            version: 5,
            schema: [{
                "name": "ANIMAL",
                "type": "string"
            }],
            filterString: "map()",
            limitedRows: 100,
            outputTableName: ""
        };
        node.setParam(testParam)
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("getSource should work", () => {
        const testParam = {
            source: "imdsource",
            version: 5,
            schema: [{
                "name": "ANIMAL",
                "type": "string"
            }],
            filterString: "map()",
            limitedRows: 100,
            outputTableName: ""
        };
        node.setParam(testParam)
        expect(node.getSource()).to.equal(testParam.source);
    });

    it("when select table node call updateStepThroughProgress(), it should update stats with table meta", async function(done) {
        // arrange
        const oldFunc = XIApi.getTableMeta;
        const node = new DagNodeIMDTable({});
        node.setTable(xcHelper.randName("test"));

        const numRows = Math.floor(Math.random() * 1000) + 1;
        const size = Math.floor(Math.random() * 1000) + 1;
        const elelapsedTime = Math.floor(Math.random() * 1000) + 1;
        node.setElapsedTime(elelapsedTime);

        XIApi.getTableMeta = () => {
            return Promise.resolve({
                metas: [{
                    numRows,
                    size
                }]
            });
        };

        try {
            // act
            await node.updateStepThroughProgress();
            const stats = node.getIndividualStats();
            // assert
            expect(stats.length).to.equal(1);
            expect(stats[0].type).to.equal(XcalarApisT.XcalarApiSelect);
            expect(stats[0].elapsedTime).to.equal(elelapsedTime);
            expect(stats[0].size).to.equal(size);
            expect(stats[0].rows).to.deep.equal([numRows]);
            done();
        } catch (e) {
            done(e);
        } finally {
            XIApi.getTableMeta = oldFunc;
        }
    });
});