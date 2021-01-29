describe("Join Dag Node Test", () => {
    let preset = {};

    before(() => {
        preset.leftColumns = genProgCols('leftCol', 2).concat(genProgCols('left::col', 2));
        preset.rightColumns = genProgCols('rightCol', 3).concat(genProgCols('right::col', 3));
        preset.pseudoParents = [
            { getLineage: () => ({ getColumns: () => preset.leftColumns, getHiddenColumns: ()=> new Map() }) },
            { getLineage: () => ({ getColumns: () => preset.rightColumns, getHiddenColumns: ()=> new Map() }) },
        ]
    });

    it("should be a join node", () => {
        expect((new DagNodeJoin()).getType()).to.equal(DagNodeType.Join);
    });

    it("should handle normal parameter", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.rightColumns[0].getBackColName()];
        const leftColsKeep = preset.leftColumns.map((v) => v.getBackColName());
        const rightColsKeep = preset.rightColumns.map((v) => v.getBackColName());
        const leftRenames = genRenames(preset.leftColumns);
        const rightRenames = genRenames(preset.rightColumns);

        const inputStruct = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: leftJoinOn,
                keepColumns: leftColsKeep,
                rename: leftRenames
            },
            right: {
                columns: rightJoinOn,
                keepColumns: rightColsKeep,
                rename: rightRenames
            },
            evalString: 'evalString',
            keepAllColumns: false,
            nullSafe: false,
            outputTableName: ""
        };

        // const nodeInput = new DagNodeJoinInput(inputStruct);
        const node = new DagNodeJoin();

        node.setParam(inputStruct);
        expect(node.getParam()).to.deep.equal(inputStruct);
    });

    it("should handle null parameter", () => {
        const node = new DagNodeJoin();
        expect(node.getParam()).to.deep.equal({
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: [''],
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            right: {
                columns: [''],
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            evalString: '',
            keepAllColumns: true,
            nullSafe: false,
            outputTableName: ""
        });
    });

    it("lineageChange(joinType) should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.rightColumns[0].getBackColName()];
        const param = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: leftJoinOn,
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            right: {
                columns: rightJoinOn,
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            evalString: '',
            keepAllColumns: true,
            nullSafe: false,
            outputTableName: ""
        };

        const node = new DagNodeJoin();
        node.parents = preset.pseudoParents;
        let changes;

        const allColumnCount = preset.leftColumns.length + preset.rightColumns.length;
        // Inner Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.InnerJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(allColumnCount);
        expect(changes.changes.length).to.equal(0);

        // Left Outer Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.LeftOuterJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(allColumnCount);
        expect(changes.changes.length).to.equal(0);

        // Right Outer Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.RightOuterJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(allColumnCount);
        expect(changes.changes.length).to.equal(0);

        // Full Outer Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.FullOuterJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(allColumnCount);
        expect(changes.changes.length).to.equal(0);

        // Left Semi Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(preset.leftColumns.length);
        expect(changes.changes.length).to.equal(0);

        // Left Anti-Semi Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.LeftAntiJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(preset.leftColumns.length);
        expect(changes.changes.length).to.equal(0);

        // Cross Join
        param.joinType = JoinOperatorTStr[JoinOperatorT.CrossJoin];
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(allColumnCount);
        expect(changes.changes.length).to.equal(0);

        // Error case
        node.parents = [];
        changes = node.lineageChange([]);

        expect(changes.columns.length).to.equal(0);
        expect(changes.changes.length).to.equal(0);
    });

    it("lineageChange(rename columns) should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.rightColumns[0].getBackColName()];
        const param = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: leftJoinOn,
                keepColumns: [],
                rename: genRenames(preset.leftColumns)
            },
            right: {
                columns: rightJoinOn,
                keepColumns: [],
                rename: genRenames(preset.rightColumns)
            },
            evalString: '',
            keepAllColumns: true,
            nullSafe: false,
            outputTableName: ""
        };

        const node = new DagNodeJoin();
        node.setParam(param);
        node.parents = preset.pseudoParents;
        const { columns, changes } = node.lineageChange([]);

        expect(columns.length).to.equal(preset.leftColumns.length + preset.rightColumns.length);
        expect(changes.length).to.equal(preset.leftColumns.length + preset.rightColumns.length);
    });

    it("lineageChange(keep columns) should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.rightColumns[0].getBackColName()];
        const param = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: leftJoinOn,
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            right: {
                columns: rightJoinOn,
                keepColumns: [],
                rename: [{sourceColumn: "", destColumn: "", prefix: false}]
            },
            evalString: '',
            keepAllColumns: false,
            nullSafe: false,
            outputTableName: ""
        };

        const node = new DagNodeJoin();
        node.parents = preset.pseudoParents;

        let changes;
        // JoinOn columns only
        param.left.keepColumns = leftJoinOn;
        param.right.keepColumns = rightJoinOn;
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(2);
        expect(changes.changes.length).to.equal(8);

        // Keep some columns
        param.left.keepColumns = preset.leftColumns
            .filter((v, i) => (i < 2))
            .map((v) => v.getBackColName());
        param.right.keepColumns = preset.rightColumns
            .filter((v, i) => (i < 2))
            .map((v) => v.getBackColName());
        node.setParam(param);
        changes = node.lineageChange([]);
        expect(changes.columns.length).to.equal(4);
        expect(changes.changes.length).to.equal(6);
    });

    it("_getColumnsFromJoinTableInput should work", () => {
        const node = new DagNodeJoin();
        let tableInput
        let set;

        // Invalid input case
        set = new Set();
        node._getColumnsFromJoinTableInput(null, set);
        expect(set.size).to.equal(0);

        // Normal case#1 derived column
        tableInput = {
            columns: ['col1'],
            rename: [{sourceColumn: "col2", destColumn: "col2", prefix: false}]
        };
        set = new Set();
        node._getColumnsFromJoinTableInput(tableInput, set);
        expect(set.size).to.equal(2);

        // Normal case#2 prefixed column
        tableInput = {
            columns: ['col1'],
            rename: [{sourceColumn: "col2", destColumn: "col2", prefix: true}]
        };
        set = new Set();
        node._getColumnsFromJoinTableInput(tableInput, set);
        expect(set.size).to.equal(1);
    });

    it("_getColumnsUsedInInput should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.rightColumns[0].getBackColName()];
        const param = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: leftJoinOn,
                keepColumns: [],
                rename: genRenames(preset.leftColumns)
            },
            right: {
                columns: rightJoinOn,
                keepColumns: [],
                rename: genRenames(preset.rightColumns)
            },
            evalString: '',
            keepAllColumns: true,
            nullSafe: false,
            outputTableName: ""
        };

        const node = new DagNodeJoin();
        node.setParam(param);

        expect(node._getColumnsUsedInInput().size).to.equal(
            param.left.rename.filter((v) => !v.prefix).length +
            param.right.rename.filter((v) => !v.prefix).length
        );
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

    function genRenames(progCols) {
        const renames = [];
        const prefixes = new Set();
        for (const col of progCols) {
            const prefix = col.getPrefix();
            if (prefix.length > 0) {
                prefixes.add(prefix);
                continue;
            }
            const colName = col.getBackColName();
            renames.push({
                sourceColumn: colName,
                destColumn: `${colName}_rn`,
                prefix: false
            });
        }
        for (const prefix of prefixes) {
            renames.push({
                sourceColumn: prefix,
                destColumn: `${prefix}_rn`,
                prefix: true
            });
        }
        return renames;
    }
});