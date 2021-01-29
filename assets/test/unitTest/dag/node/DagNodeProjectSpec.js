describe("Project Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeProject({});
    });

    it("should be a project node", () => {
        expect(node.getType()).to.equal(DagNodeType.Project);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            columns: [],
            outputTableName: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            columns: ["column1", "prefix:noExistColToProjectPrefix"],
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    it("lineageChange should work", () => {
        const columns = genProgCols('prefix::col', 3).concat(genProgCols('col', 3));
        node.setParam({
            columns: ['prefix::col#1', 'col#1'],
            outputTableName: ""
        });

        const result = node.lineageChange(columns);
        expect(result.columns.length).to.equal(2);
        expect(result.changes.length).to.equal(4);
    });

    it("lineageChange with hidden columns should work", () => {
        const columns = genProgCols('prefix::col', 3).concat(genProgCols('col', 3));
        node.setParam({
            columns: ['prefix::col#1', 'col#1'],
            outputTableName: ""
        });
        const lineage = node.getLineage();
        lineage.getHiddenColumns = () => {
            let map = new Map();
            map.set("a", ColManager.newPullCol("a", "a", ColumnType.string));
            return map;
        };
        const result = node.lineageChange(columns);
        expect(result.columns.length).to.equal(2);
        expect(result.changes.length).to.equal(5);
        expect(result.changes[2].from.getBackColName()).to.equal("col#2");
        expect(result.changes[2].to).to.be.null;
        expect(result.changes[4].hidden).to.be.true;
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