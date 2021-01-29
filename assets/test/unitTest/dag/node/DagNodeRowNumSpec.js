describe("RowNum Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeRowNum({});
        const columns = genProgCols('prefix::col', 3).concat(genProgCols('col', 3));
        node.parents = [{
            getLineage: () => ({ getColumns: () => columns })
        }];
    });

    it("should be a rowNum node", () => {
        expect(node.getType()).to.equal(DagNodeType.RowNum);
    });

    it("setParam() should work", () => {
        const testParam = {
            newField: 'rowNumColumn',
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should work", () => {
        node.setParam({
            newField: 'rowNumColumn',
            outputTableName: ""
        });

        const result = node.lineageChange();
        expect(result.columns.length).to.equal(7);
        expect(result.changes.length).to.equal(1);
    });

    it('_genParamHint() should work', () => {
        node.setParam({
            newField: 'rowNumColumn',
            outputTableName: ""
        });
        expect(node._genParamHint()).to.equal('Row Num In Field: rowNumColumn');
    });

    function genProgCols(colPrefix, count) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});