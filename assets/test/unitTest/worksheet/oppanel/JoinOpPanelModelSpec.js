describe("JoinOpPanelModel Test", () => {
    const preset = {};

    before(() => {
        preset.leftPrefixedCount = 2;
        preset.leftDerivedCount = 2;
        preset.rightPrefixedCount = 3;
        preset.rightDerivedCount = 3;
        preset.leftColumns = genProgCols('leftCol', preset.leftDerivedCount)
            .concat(genProgCols('left::col', preset.leftPrefixedCount));
        preset.rightColumns = genProgCols('rightCol', preset.rightDerivedCount)
            .concat(genProgCols('right::col', preset.rightPrefixedCount));
        preset.leftTable = 'leftTable';
        preset.rightTable = 'rightTable';
        preset.pseudoParents = [
            {
                getLineage: () => ({ getColumns: () => preset.leftColumns }),
                getTable: () => preset.leftTable
            },
            {
                getLineage: () => ({ getColumns: () => preset.rightColumns }),
                getTable: () => preset.rightTable
            },
        ]
    });

    it("_getColumnsFromDagNode should work", () => {
        const node = new DagNodeJoin();
        node.getLineage().setColumns(preset.leftColumns.concat(preset.rightColumns));

        expect(JoinOpPanelModel._getColumnsFromDagNode(node).length)
            .to.equal(preset.leftColumns.length + preset.rightColumns.length);
    });

    it("getColumnsFromDag should work", () => {
        const node = new DagNodeJoin();
        node.parents = preset.pseudoParents;

        const { left, right } = JoinOpPanelModel.getColumnsFromDag(node);
        expect(left.length).to.equal(preset.leftColumns.length);
        expect(right.length).to.equal(preset.rightColumns.length);
    });

    it("getPreviewTableNamesFromDag should work", () => {
        const node = new DagNodeJoin();
        node.parents = preset.pseudoParents;

        expect(JoinOpPanelModel.getPreviewTableNamesFromDag(node)).to.deep.equal({
            left: preset.leftTable,
            right: preset.rightTable
        });
    });

    it("fromDagInput should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.leftColumns[0].getBackColName()];
        const leftColsKeep = preset.leftColumns.map((v) => v.getBackColName());
        const rightColsKeep = preset.leftColumns.map((v) => v.getBackColName());
        const leftRenames = genRenames(preset.leftColumns, 'lrn');
        const rightRenames = genRenames(preset.leftColumns, 'rrn');

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
            keepAllColumns: true,
        };

        const model = JoinOpPanelModel.fromDagInput(
            preset.leftColumns,
            preset.leftColumns,
            inputStruct,
            preset.leftTable,
            preset.rightTable,
            {
                currentStep: 1,
                isAdvMode: false,
                isNoCast: true,
                isFixedType: false
            }
        );

        // Check UI states
        expect(model._currentStep).to.equal(1);
        expect(model._isAdvMode).to.equal(false);
        expect(model._isNoCast).to.equal(true);
        expect(model._isFixedType).to.equal(false);

        // Check column metadata
        expect(model._columnMeta.left.length).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.leftMap.size).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.right.length).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.rightMap.size).to.equal(preset.leftColumns.length);

        // Check prefix metadata
        expect(model._prefixMeta.left.length).to.equal(1);
        expect(model._prefixMeta.leftMap.size).to.equal(1);
        expect(model._prefixMeta.right.length).to.equal(1);
        expect(model._prefixMeta.rightMap.size).to.equal(1);

        // Check join type
        expect(model._joinType).to.equal(inputStruct.joinType);

        // Check Eval String
        expect(model._evalString).to.equal(inputStruct.evalString);

        // Check KeepAllColumns flag
        expect(model._keepAllColumns).to.equal(undefined);

        // Check join clauses
        expect(model._joinColumnPairs.length).to.equal(
            Math.max(leftJoinOn.length, rightJoinOn.length));

        // Check selected columns
        // joinOn columns will be excluded, as it is not selectable/unselectable
        expect(model._selectedColumns.left.length).to.equal(leftColsKeep.length - 1);
        expect(model._selectedColumns.right.length).to.equal(rightColsKeep.length - 1);

        // Check renames
        expect(model._columnRename.left.length).to.equal(preset.leftDerivedCount + 1);
        expect(model._columnRename.right.length).to.equal(preset.leftDerivedCount + 1);

        // Check table names
        expect(model._previewTableNames).to.deep.equal({
            left: preset.leftTable, right: preset.rightTable
        });
    });

    it("fromDag should work", () => {
        const leftJoinOn = [preset.leftColumns[0].getBackColName()];
        const rightJoinOn = [preset.leftColumns[0].getBackColName()];
        const leftColsKeep = preset.leftColumns.map((v) => v.getBackColName());
        const rightColsKeep = preset.leftColumns.map((v) => v.getBackColName());
        const leftRenames = genRenames(preset.leftColumns, 'lrn');
        const rightRenames = genRenames(preset.leftColumns, 'rrn');

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
            keepAllColumns: true,
        };

        const node = new DagNodeJoin();
        node.setParam(inputStruct);
        node.parents = [preset.pseudoParents[0], preset.pseudoParents[0]];

        const model = JoinOpPanelModel.fromDag(node, {
            currentStep: 1,
            isAdvMode: false,
            isNoCast: true
        })

        // Check UI states
        expect(model._currentStep).to.equal(1);
        expect(model._isAdvMode).to.equal(false);
        expect(model._isNoCast).to.equal(true);
        expect(model._isFixedType).to.equal(false);

        // Check column metadata
        expect(model._columnMeta.left.length).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.leftMap.size).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.right.length).to.equal(preset.leftColumns.length);
        expect(model._columnMeta.rightMap.size).to.equal(preset.leftColumns.length);

        // Check prefix metadata
        expect(model._prefixMeta.left.length).to.equal(1);
        expect(model._prefixMeta.leftMap.size).to.equal(1);
        expect(model._prefixMeta.right.length).to.equal(1);
        expect(model._prefixMeta.rightMap.size).to.equal(1);

        // Check join type
        expect(model._joinType).to.equal(inputStruct.joinType);

        // Check Eval String
        expect(model._evalString).to.equal(inputStruct.evalString);

        // Check KeepAllColumns flag
        expect(model._keepAllColumns).to.equal(undefined);

        // Check join clauses
        expect(model._joinColumnPairs.length).to.equal(
            Math.max(leftJoinOn.length, rightJoinOn.length));

        // Check selected columns
        // joinOn columns will be excluded, as they are not selectable/unselectable
        expect(model._selectedColumns.left.length).to.equal(leftColsKeep.length - 1);
        expect(model._selectedColumns.right.length).to.equal(rightColsKeep.length - 1);

        // Check renames
        expect(model._columnRename.left.length).to.equal(preset.leftDerivedCount + 1);
        expect(model._columnRename.right.length).to.equal(preset.leftDerivedCount + 1);

        // Check table names
        expect(model._previewTableNames).to.deep.equal({
            left: preset.leftTable, right: preset.leftTable
        });
    });

    it("fromDag(error handling) should work", () => {
        const model = JoinOpPanelModel.fromDag(null, null);
        expect(model != null).to.equal(true);
    });

    describe("toDag should work", () => {
        let inputStruct;

        before(() => {
            const leftJoinOn = [preset.leftColumns[0].getBackColName()];
            const rightJoinOn = [preset.leftColumns[0].getBackColName()];
            const leftColsKeep = preset.leftColumns.map((v) => v.getBackColName());
            const rightColsKeep = preset.leftColumns.slice(1).map((v) => v.getBackColName()); // Same columns, so that renaming will work
            const leftRenames = genRenames(preset.leftColumns, 'lrn');
            const rightRenames = genRenames(preset.leftColumns, 'rrn');

            inputStruct = {
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
            };
        });

        it("Regular case", () => {
            const fromDagData = xcHelper.deepCopy(inputStruct);

            const model = JoinOpPanelModel.fromDagInput(
                preset.leftColumns, preset.leftColumns,
                fromDagData,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            const dagData = model.toDag();

            // Join Type
            expect(dagData.joinType).to.equal(fromDagData.joinType);
            // Left join on
            expect(dagData.left.columns.length).to.equal(fromDagData.left.columns.length);
            // Right join on
            expect(dagData.right.columns.length).to.equal(fromDagData.right.columns.length);
            // Left columnsToKeep
            expect(dagData.left.keepColumns.length).to.equal(fromDagData.left.keepColumns.length);
            // Right columnsToKeep
            expect(dagData.right.keepColumns.length).to.equal(fromDagData.right.keepColumns.length + 1);
            // Left renames(derivedCount - 1 + prefixCount)
            expect(dagData.left.rename.length).to.equal(preset.leftDerivedCount + 1);
            // Right renames(derivedCount - 1 + prefixCount)
            expect(dagData.right.rename.length).to.equal(preset.leftDerivedCount + 1);
            // Eval string
            expect(dagData.evalString).to.equal(fromDagData.evalString);
            // KeepAllColumns flag
            expect(dagData.keepAllColumns).to.equal(fromDagData.keepAllColumns);
        });

        it("CrossJoin case", () => {
            const fromDagData = xcHelper.deepCopy(inputStruct);
            fromDagData.joinType = JoinOperatorTStr[JoinOperatorT.CrossJoin];

            const model = JoinOpPanelModel.fromDagInput(
                preset.leftColumns, preset.leftColumns,
                fromDagData,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            const dagData = model.toDag();

            // Join Type
            expect(dagData.joinType).to.equal(fromDagData.joinType);
            // Join on should be an empty list
            expect(dagData.left.columns.length).to.equal(0);
            expect(dagData.right.columns.length).to.equal(0);
        });

        // it("KeepAllColumns case", () => {
        //     const fromDagData = xcHelper.deepCopy(inputStruct);
        //     fromDagData.keepAllColumns = true;

        //     const model = JoinOpPanelModel.fromDagInput(
        //         preset.leftColumns, preset.leftColumns,
        //         fromDagData,
        //         preset.leftTable, preset.rightTable,
        //         {
        //             currentStep: 1,
        //             isAdvMode: false,
        //             isNoCast: true,
        //             isFixedType: false
        //         }
        //     );
        //     const dagData = model.toDag();

        //     // KeepAllColumns flag check
        //     expect(dagData.keepAllColumns).to.equal(fromDagData.keepAllColumns);
        //     // Selected columns should be empty
        //     expect(dagData.left.keepColumns.length).to.equal(0);
        //     expect(dagData.right.keepColumns.length).to.equal(0);
        // });
    });

    it("_applyColumnRename should work", () => {
        const columnMetaMap = new Map();
        columnMetaMap.set('col1', { name: 'col1', type: ColumnType.string, isPrefix: false, prefix: '' });
        columnMetaMap.set('col2', { name: 'col2', type: ColumnType.string, isPrefix: false, prefix: '' });
        columnMetaMap.set('col3', { name: 'col3', type: ColumnType.string, isPrefix: false, prefix: '' });
        columnMetaMap.set('tb::col1', { name: 'tb::col1', type: ColumnType.string, isPrefix: true, prefix: 'tb' });
        const colRename = { 'col1': 'rcol1', 'col2': 'rcol2' };

        const model = new JoinOpPanelModel();

        let result;
        // Case #1: sort by resultant column name
        result = model._applyColumnRename(columnMetaMap, colRename);
        expect(result.length).to.equal(3);
        expect(result[0]).to.deep.equal({ source: 'col3', dest: '', key: 'col3'});
        expect(result[1]).to.deep.equal({ source: 'col1', dest: 'rcol1', key: 'rcol1'});
        expect(result[2]).to.deep.equal({ source: 'col2', dest: 'rcol2', key: 'rcol2'});

        // Case #2: sort by source column name
        result = model._applyColumnRename(columnMetaMap, colRename, false);
        expect(result.length).to.equal(3);
        expect(result[0]).to.deep.equal({ source: 'col1', dest: 'rcol1', key: 'col1'});
        expect(result[1]).to.deep.equal({ source: 'col2', dest: 'rcol2', key: 'col2'});
        expect(result[2]).to.deep.equal({ source: 'col3', dest: '', key: 'col3'});
    });

    it("_applyPrefixRename should work", () => {
        const prefixMetaMap = new Map();
        prefixMetaMap.set('prefix1', 'prefix1');
        prefixMetaMap.set('prefix2', 'prefix2');
        prefixMetaMap.set('prefix3', 'prefix3');
        const prefixRename = { 'prefix1': 'rprefix1', 'prefix2': 'rprefix2' };

        const model = new JoinOpPanelModel();

        let result;
        // Case #1: sort by resultant prefix
        result = model._applyPrefixRename(prefixMetaMap, prefixRename);
        expect(result.length).to.equal(3);
        expect(result[0]).to.deep.equal({ source: 'prefix3', dest: '', key: 'prefix3'});
        expect(result[1]).to.deep.equal({ source: 'prefix1', dest: 'rprefix1', key: 'rprefix1'});
        expect(result[2]).to.deep.equal({ source: 'prefix2', dest: 'rprefix2', key: 'rprefix2'});

        // Case #2: sort by original prefix
        result = model._applyPrefixRename(prefixMetaMap, prefixRename, false);
        expect(result.length).to.equal(3);
        expect(result[0]).to.deep.equal({ source: 'prefix1', dest: 'rprefix1', key: 'prefix1'});
        expect(result[1]).to.deep.equal({ source: 'prefix2', dest: 'rprefix2', key: 'prefix2'});
        expect(result[2]).to.deep.equal({ source: 'prefix3', dest: '', key: 'prefix3'});
    });

    it("_checkCollisionInListByKey should work", () => {
        const list = [{key: 'col1'}, {key: 'col2'}];
        const model = new JoinOpPanelModel();

        let result;
        // Case #1: no conflict
        result = model._checkCollisionInListByKey(list);
        expect(result.size).to.equal(0);
        // Case #2: has conflict
        list.push({key: 'col1'});
        result = model._checkCollisionInListByKey(list);
        expect(result.size).to.equal(1);
        expect(result.has('col1')).to.equal(true);
        const indexList = result.get('col1');
        expect(indexList.length).to.equal(2);
        expect(indexList.includes(0)).to.equal(true);
        expect(indexList.includes(2)).to.equal(true);
    });

    it("_checkCollision should work", () => {
        const list1 = [{v: 'col1'},{v: 'col2'},{v: 'col3'}];
        const list2 = [{v: 'col2'},{v: 'col3'},{v: 'col4'}];
        const model = new JoinOpPanelModel();

        const result = model._checkCollision(list1, list2, (a, b) => {
            if (a.v === b.v) {
                return {eq: true, d1: 1, d2: 1};
            } else if (a.v > b.v) {
                return {eq: false, d1: 0, d2: 1};
            } else {
                return {eq: false, d1: 1, d2: 0};
            }
        });
        expect(result.length).to.equal(2);
        expect(result[0]).to.deep.equal({i1: 1, i2: 0});
        expect(result[1]).to.deep.equal({i1: 2, i2: 1});
    });

    it("_checkCollisionByKey should work", () => {
        const list1 = [{key: 'col1'},{key: 'col2'},{key: 'col3'},{key: 'col5'},{key: 'col6'}];
        const list2 = [{key: 'col2'},{key: 'col3'},{key: 'col4'},{key: 'col6'}];
        const model = new JoinOpPanelModel();

        const result = model._checkCollisionByKey(list1, list2);
        expect(result.length).to.equal(3);
        expect(result[0]).to.deep.equal({i1: 1, i2: 0});
        expect(result[1]).to.deep.equal({i1: 2, i2: 1});
        expect(result[2]).to.deep.equal({i1: 4, i2: 3});
    });

    describe("_getMetaAfterColumnSelection should work", () => {
        let inputStruct;
        let leftColumns;
        let rightColumns;

        before(() => {
            const leftDerivedColumns = genProgCols('leftCol', 3);
            const leftPrefixedColumns = genProgCols('left::col', 3);
            const rightDerivedColumns = genProgCols('rightCol', 4);
            const rightPrefixedColumns = genProgCols('right::col', 4);
            leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
            rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

            const leftJoinOn = [
                leftDerivedColumns[0].getBackColName(),
                leftPrefixedColumns[0].getBackColName()
            ];
            const rightJoinOn = [
                rightDerivedColumns[0].getBackColName(),
                rightPrefixedColumns[0].getBackColName()
            ];

            inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: leftJoinOn,
                    keepColumns: [],
                    rename: []
                },
                right: {
                    columns: rightJoinOn,
                    keepColumns: [],
                    rename: []
                },
                evalString: 'evalString',
                keepAllColumns: true,
            };
        });

        it("keepAllColumns == true case", () => {
            const dagInput = xcHelper.deepCopy(inputStruct);
            dagInput.keepAllColumns = true;

            const {
                leftColMetaMap, rightColMetaMap,
                leftPrefixMetaMap, rightPrefixMetaMap
            } = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            )._getMetaAfterColumnSelection();

            expect(leftColMetaMap.size).to.equal(6);
            expect(rightColMetaMap.size).to.equal(8);
            expect(leftPrefixMetaMap.size).to.equal(1);
            expect(rightPrefixMetaMap.size).to.equal(1);
        });

        it("keepAllColumns == false; column selected == []; case", () => {
            const dagInput = xcHelper.deepCopy(inputStruct)
            dagInput.keepAllColumns = false;

            const {
                leftColMetaMap, rightColMetaMap,
                leftPrefixMetaMap, rightPrefixMetaMap
            } = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            )._getMetaAfterColumnSelection();

            expect(leftColMetaMap.size).to.equal(2);
            expect(rightColMetaMap.size).to.equal(2);
            expect(leftPrefixMetaMap.size).to.equal(1);
            expect(rightPrefixMetaMap.size).to.equal(1);
        });

        it("keepAllColumns == false; column seletect != []; case", () => {
            const dagInput = xcHelper.deepCopy(inputStruct)
            dagInput.keepAllColumns = false;
            dagInput.left.keepColumns = [leftColumns[1].getBackColName()];
            dagInput.right.keepColumns = [rightColumns[1].getBackColName()];

            const {
                leftColMetaMap, rightColMetaMap,
                leftPrefixMetaMap, rightPrefixMetaMap
            } = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            )._getMetaAfterColumnSelection();

            expect(leftColMetaMap.size).to.equal(3);
            expect(rightColMetaMap.size).to.equal(3);
            expect(leftPrefixMetaMap.size).to.equal(1);
            expect(rightPrefixMetaMap.size).to.equal(1);
        });
    });

    describe("_buildRenameInfo should work", () => {
        let inputStruct;
        let leftColumns;
        let rightColumns;

        before(() => {
            const leftDerivedColumns = genProgCols('leftCol', 3);
            const leftPrefixedColumns = genProgCols('left::col', 3);
            const rightDerivedColumns = genProgCols('rightCol', 4);
            const rightPrefixedColumns = genProgCols('right::col', 4);
            leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
            rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

            inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: [],
                    keepColumns: [],
                    rename: []
                },
                right: {
                    columns: [],
                    keepColumns: [],
                    rename: []
                },
                evalString: 'evalString',
                keepAllColumns: true,
            };
        });

        it("Case: no conflict", () => {
            const dagInput = xcHelper.deepCopy(inputStruct)
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._buildRenameInfo({
                colDestLeft: {},
                colDestRight: {},
                prefixDestLeft: {},
                prefixDestRight: {},
            })

            let leftColRenameCount = 0;
            let leftPrefixRenameCount = 0;
            model._columnRename.left.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? leftPrefixRenameCount ++ : leftColRenameCount ++;
            });
            let rightColRenameCount = 0;
            let rightPrefixRenameCount = 0;
            model._columnRename.right.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? rightPrefixRenameCount ++ : rightColRenameCount ++;
            });

            expect(leftColRenameCount).to.equal(0);
            expect(leftPrefixRenameCount).to.equal(0);
            expect(rightColRenameCount).to.equal(0);
            expect(rightPrefixRenameCount).to.equal(0);
        });

        it("Case: no conflict in source; conflict after rename", () => {
            const dagInput = xcHelper.deepCopy(inputStruct);
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._buildRenameInfo({
                colDestLeft: {},
                colDestRight: {'rightCol#1': 'leftCol#1', 'rightCol#2': 'leftCol#2'},
                prefixDestLeft: {},
                prefixDestRight: {'right': 'left'},
            })

            let leftColRenameCount = 0;
            let leftPrefixRenameCount = 0;
            model._columnRename.left.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? leftPrefixRenameCount ++ : leftColRenameCount ++;
            });
            let rightColRenameCount = 0;
            let rightPrefixRenameCount = 0;
            model._columnRename.right.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? rightPrefixRenameCount ++ : rightColRenameCount ++;
            });

            expect(leftColRenameCount).to.equal(0);
            expect(leftPrefixRenameCount).to.equal(0);
            expect(rightColRenameCount).to.equal(2);
            expect(rightPrefixRenameCount).to.equal(1);
        });

        it("Case: conflict in source", () => {
            const dagInput = xcHelper.deepCopy(inputStruct)
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, leftColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._buildRenameInfo({
                colDestLeft: {},
                colDestRight: {},
                prefixDestLeft: {},
                prefixDestRight: {},
            })

            let leftColRenameCount = 0;
            let leftPrefixRenameCount = 0;
            model._columnRename.left.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? leftPrefixRenameCount ++ : leftColRenameCount ++;
            });
            let rightColRenameCount = 0;
            let rightPrefixRenameCount = 0;
            model._columnRename.right.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? rightPrefixRenameCount ++ : rightColRenameCount ++;
            });

            expect(leftColRenameCount).to.equal(3);
            expect(leftPrefixRenameCount).to.equal(1);
            expect(rightColRenameCount).to.equal(3);
            expect(rightPrefixRenameCount).to.equal(1);
        });

        it("Case: optional columns/prefixes", () => {
            const dagInput = xcHelper.deepCopy(inputStruct);
            dagInput.left.keepColumns = ['left::col#1'];
            dagInput.right.keepColumns = ['rightCol#1'];
            dagInput.keepAllColumns = false;
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._buildRenameInfo({
                colDestLeft: {},
                colDestRight: {'rightCol#1': 'renamed'},
                prefixDestLeft: {'left': 'renamed'},
                prefixDestRight: {},
            })

            let leftColRenameCount = 0;
            let leftPrefixRenameCount = 0;
            model._columnRename.left.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? leftPrefixRenameCount ++ : leftColRenameCount ++;
            });
            let rightColRenameCount = 0;
            let rightPrefixRenameCount = 0;
            model._columnRename.right.forEach(({ source, dest, isPrefix }) => {
                isPrefix ? rightPrefixRenameCount ++ : rightColRenameCount ++;
            });

            expect(leftColRenameCount).to.equal(0);
            expect(leftPrefixRenameCount).to.equal(1);
            expect(rightColRenameCount).to.equal(1);
            expect(rightPrefixRenameCount).to.equal(0);
        });
    });

    describe("updateRenameInfo should work", () => {
        let inputStruct;
        let leftColumns;
        let rightColumns;

        before(() => {
            const leftDerivedColumns = genProgCols('Col', 3);
            const leftPrefixedColumns = genProgCols('tb::col', 3);
            const rightDerivedColumns = genProgCols('Col', 4);
            const rightPrefixedColumns = genProgCols('tb::col', 4);
            leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
            rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

            inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: [leftDerivedColumns[0].getBackColName()],
                    keepColumns: [],
                    rename: []
                },
                right: {
                    columns: [rightDerivedColumns[0].getBackColName()],
                    keepColumns: [],
                    rename: []
                },
                evalString: 'evalString',
                keepAllColumns: true,
            };
        });

        it("Case: need rename by joinType", () => {
            const dagInput = xcHelper.deepCopy(inputStruct);
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, leftColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );

            model.updateRenameInfo();

            expect(model._columnRename.left.length).to.gt(1);
            expect(model._columnRename.right.length).to.gt(1);
        });

        it("Case: don't need rename by joinType", () => {
            const dagInput = xcHelper.deepCopy(inputStruct);
            dagInput.joinType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, leftColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );

            model.updateRenameInfo();

            expect(model._columnRename.left.length).to.equal(0);
            expect(model._columnRename.right.length).to.equal(0);
        });
    });

    describe("updateRenameInfo should work with removeSet", () => {
        let inputStruct;
        let leftColumns;
        let rightColumns;

        before(() => {
            const leftDerivedColumns = genProgCols('Col', 2); // Col#1, Col#2
            const leftPrefixedColumns = genProgCols('P1::a', 1); // P1::a#1
            const rightDerivedColumns = genProgCols('Col', 2); // Col#1, Col#2
            const rightPrefixedColumns = genProgCols('P1::b', 1); // P1::b#1
            leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
            rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

            inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: [leftDerivedColumns[0].getBackColName()],
                    keepColumns: [],
                    rename: []
                },
                right: {
                    columns: [rightDerivedColumns[0].getBackColName()],
                    keepColumns: [],
                    rename: []
                },
                evalString: 'evalString',
                keepAllColumns: true,
            };
        });

        it("Case: derived column", () => {
            // left table: Col#1, Col#2, P1::a#1
            // right table: Col#1, Col#2, P1::b#1
            // JoinOn: left.Col#1 == right.Col#1

            // Init state:
            // keepLeft: Col#1, Col#2, P1::a#1
            // keepRight: Col#1, Col#2, P1::b#1
            // renameLeft: Col#1, Col#2, P1
            // renameRight: Col#1, Col#2, P1
            const dagInput = xcHelper.deepCopy(inputStruct);
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );

            // Action: Unselect rightTable.Col#2
            model.removeSelectedColumn({ right: 'Col#2' });
            model.updateRenameInfo({ removeSet: new Set(['Col#2'])});

            // The state should be:
            // keepLeft: Col#1, Col#2, P1::a#1
            // keepRight: Col#1, P1::b#1
            // renameLeft: Col#1, P1
            // renameRight: Col#1, P1
            expect(model._columnRename.left.length).to.equal(2);
            expect(model._columnRename.right.length).to.equal(2);
            expect(model._columnRename.left.filter((renameInfo) => {
                if (renameInfo.source === "Col#1" && renameInfo.isPrefix === false) {
                    return true;
                }
                if (renameInfo.source === "P1" && renameInfo.isPrefix === true) {
                    return true;
                }
                return false;
            }).length).to.equal(2);
            expect(model._columnRename.right.filter((renameInfo) => {
                if (renameInfo.source === "Col#1" && renameInfo.isPrefix === false) {
                    return true;
                }
                if (renameInfo.source === "P1" && renameInfo.isPrefix === true) {
                    return true;
                }
                return false;
            }).length).to.equal(2);
        });

        it("Case: prefixed column", () => {
            // left table: Col#1, Col#2, P1::a#1
            // right table: Col#1, Col#2, P1::b#1
            // JoinOn: left.Col#1 == right.Col#1

            // Init state:
            // keepLeft: Col#1, Col#2, P1::a#1
            // keepRight: Col#1, Col#2, P1::b#1
            // renameLeft: Col#1, Col#2, P1
            // renameRight: Col#1, Col#2, P1
            const dagInput = xcHelper.deepCopy(inputStruct);
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );

            // Action: Unselect rightTable.P1::b#1
            model.removeSelectedColumn({ right: 'P1::b#1' });
            model.updateRenameInfo({ removeSet: new Set(['P1::b#1'])});

            // The state should be:
            // keepLeft: Col#1, Col#2, P1::a#1
            // keepRight: Col#1, Col#2
            // renameLeft: Col#1, Col#2
            // renameRight: Col#1, Col#2
            expect(model._columnRename.left.length).to.equal(2);
            expect(model._columnRename.right.length).to.equal(2);
            expect(model._columnRename.left.filter((renameInfo) => {
                if (renameInfo.source === "Col#1" && renameInfo.isPrefix === false) {
                    return true;
                }
                if (renameInfo.source === "Col#2" && renameInfo.isPrefix === false) {
                    return true;
                }
                return false;
            }).length).to.equal(2);
            expect(model._columnRename.right.filter((renameInfo) => {
                if (renameInfo.source === "Col#1" && renameInfo.isPrefix === false) {
                    return true;
                }
                if (renameInfo.source === "Col#2" && renameInfo.isPrefix === false) {
                    return true;
                }
                return false;
            }).length).to.equal(2);
        });
    });

    describe("getResolvedNames should work", () => {
        let model;

        before(() => {
            const leftDerivedColumns = genProgCols('leftCol', 3);
            const leftPrefixedColumns = genProgCols('left::col', 3);
            const rightDerivedColumns = genProgCols('rightCol', 4);
            const rightPrefixedColumns = genProgCols('right::col', 4);
            const leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
            const rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

            const inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: [],
                    keepColumns: [],
                    rename: genRenames(leftColumns)
                },
                right: {
                    columns: [],
                    keepColumns: [],
                    rename: genRenames(rightColumns)
                },
                evalString: 'evalString',
                keepAllColumns: true,
            };

            model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                inputStruct,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
        });

        it("Case: prefix rename", () => {
            const { left, right } = model.getResolvedNames(true);
            expect(left.length).to.equal(1);
            expect(right.length).to.equal(1);
        });

        it("Case: column rename", () => {
            const { left, right } = model.getResolvedNames(false);
            expect(left.length).to.equal(3);
            expect(right.length).to.equal(4);
        });
    });

    it("getCollisionNames should work", () => {
        const leftDerivedColumns = genProgCols('leftCol', 3);
        const leftPrefixedColumns = genProgCols('left1::col', 1)
            .concat(genProgCols('left2::col', 1))
            .concat(genProgCols('left3::col', 1));
        const rightDerivedColumns = genProgCols('rightCol', 3);
        const rightPrefixedColumns = genProgCols('right1::col', 1)
            .concat(genProgCols('right2::col', 1))
            .concat(genProgCols('right3::col', 1));
        const leftColumns = leftDerivedColumns.concat(leftPrefixedColumns);
        const rightColumns = rightDerivedColumns.concat(rightPrefixedColumns);

        const inputStruct = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: [leftDerivedColumns[0].getBackColName()],
                keepColumns: [],
                rename: []
            },
            right: {
                columns: [rightDerivedColumns[0].getBackColName()],
                keepColumns: [],
                rename: []
            },
            evalString: 'evalString',
            keepAllColumns: true,
        };

        const renameInfo = {
            left: [
                { source: 'leftCol#1', dest: 'leftCol', isPrefix: false },
                { source: 'leftCol#2', dest: 'leftCol', isPrefix: false },
                { source: 'leftCol#3', dest: 'commonCol', isPrefix: false },
                { source: 'left1', dest: 'left', isPrefix: true },
                { source: 'left2', dest: 'left', isPrefix: true },
                { source: 'left3', dest: 'commonTb', isPrefix: true },
            ],
            right: [
                { source: 'rightCol#1', dest: 'rightCol', isPrefix: false },
                { source: 'rightCol#2', dest: 'rightCol', isPrefix: false },
                { source: 'rightCol#3', dest: 'commonCol', isPrefix: false },
                { source: 'right1', dest: 'right', isPrefix: true },
                { source: 'right2', dest: 'right', isPrefix: true },
                { source: 'right3', dest: 'commonTb', isPrefix: true },
            ]
        };

        // Case: joinType which doesn't need rename
        {
            const dagInput = xcHelper.deepCopy(inputStruct);
            dagInput.joinType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._columnRename = renameInfo;
            const {
                columnLeft, columnRight, prefixLeft, prefixRight
            } = model.getCollisionNames();

            expect(columnLeft.size).to.equal(0);
            expect(columnRight.size).to.equal(0);
            expect(prefixLeft.size).to.equal(0);
            expect(prefixRight.size).to.equal(0);
        }

        // Case: regular case
        {
            const dagInput = xcHelper.deepCopy(inputStruct);
            dagInput.joinType = JoinOperatorTStr[JoinOperatorT.InnerJoin];
            const model = JoinOpPanelModel.fromDagInput(
                leftColumns, rightColumns,
                dagInput,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );
            model._columnRename = renameInfo;
            const {
                columnLeft, columnRight, prefixLeft, prefixRight
            } = model.getCollisionNames();

            expect(columnLeft.size).to.equal(3);
            expect(columnRight.size).to.equal(3);
            expect(prefixLeft.size).to.equal(3);
            expect(prefixRight.size).to.equal(3);
        }
    });

    it("batchRename should work", () => {
        const renameInfo = {
            left: [
                { source: 'leftCol1', dest: '', isPrefix: false },
                { source: 'leftCol2', dest: '', isPrefix: false },
                { source: 'leftPrefix1', dest: '', isPrefix: true },
                { source: 'leftPrefix2', dest: '', isPrefix: true },
            ],
            right: [
                { source: 'rightCol1', dest: '', isPrefix: false },
                { source: 'rightCol2', dest: '', isPrefix: false },
                { source: 'rightPrefix1', dest: '', isPrefix: true },
                { source: 'rightPrefix2', dest: '', isPrefix: true },
            ]
        };

        const model = new JoinOpPanelModel();

        // Case: left, not prefix
        model._columnRename = xcHelper.deepCopy(renameInfo);
        model.batchRename({ isLeft: true, isPrefix: false, suffix: '2' });
        expect(model._columnRename.left[0]).to.deep.equal({
            source: 'leftCol1', dest: 'leftCol12', isPrefix: false
        });
        expect(model._columnRename.left[1]).to.deep.equal({
            source: 'leftCol2', dest: 'leftCol22', isPrefix: false
        });

        // Case: left, prefix
        model._columnRename = xcHelper.deepCopy(renameInfo);
        model.batchRename({ isLeft: true, isPrefix: true, suffix: '2' });
        expect(model._columnRename.left[2]).to.deep.equal({
            source: 'leftPrefix1', dest: 'leftPrefix12', isPrefix: true
        });
        expect(model._columnRename.left[3]).to.deep.equal({
            source: 'leftPrefix2', dest: 'leftPrefix22', isPrefix: true
        });

        // Case: right, not prefix
        model._columnRename = xcHelper.deepCopy(renameInfo);
        model.batchRename({ isLeft: false, isPrefix: false, suffix: '2' });
        expect(model._columnRename.right[0]).to.deep.equal({
            source: 'rightCol1', dest: 'rightCol12', isPrefix: false
        });
        expect(model._columnRename.right[1]).to.deep.equal({
            source: 'rightCol2', dest: 'rightCol22', isPrefix: false
        });

        // Case: right, prefix
        model._columnRename = xcHelper.deepCopy(renameInfo);
        model.batchRename({ isLeft: false, isPrefix: true, suffix: '2' });
        expect(model._columnRename.right[2]).to.deep.equal({
            source: 'rightPrefix1', dest: 'rightPrefix12', isPrefix: true
        });
        expect(model._columnRename.right[3]).to.deep.equal({
            source: 'rightPrefix2', dest: 'rightPrefix22', isPrefix: true
        });
    });

    describe('selected columns functions should work', () => {
        let model;
        const expected = {
            numLeftSelectableCols: 0, numRightSelectableCols: 0,
            numLeftFixedCols: 0, numRightFixedCols: 0,
            numLeftUnselected: 0, numRightUnselected: 0
        };

        before(() => {
            const leftJoinOn = [preset.leftColumns[0].getBackColName()];
            const rightJoinOn = [preset.rightColumns[0].getBackColName()];
            const leftColsKeep = preset.leftColumns.slice(2).map((v) => v.getBackColName());
            const rightColsKeep = preset.rightColumns.slice(2).map((v) => v.getBackColName());

            expected.numLeftUnselected = 1;
            expected.numRightUnselected = 1;
            expected.numLeftSelectableCols = leftColsKeep.length;
            expected.numRightSelectableCols = rightColsKeep.length;
            expected.numLeftFixedCols = leftJoinOn.length;
            expected.numRightFixedCols = rightJoinOn.length;

            const inputStruct = {
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                left: {
                    columns: leftJoinOn,
                    keepColumns: leftColsKeep,
                    rename: []
                },
                right: {
                    columns: rightJoinOn,
                    keepColumns: rightColsKeep,
                    rename: []
                },
                evalString: 'evalString',
                keepAllColumns: false,
            };

            model = JoinOpPanelModel.fromDagInput(
                preset.leftColumns, preset.rightColumns,
                inputStruct,
                preset.leftTable, preset.rightTable,
                {
                    currentStep: 1,
                    isAdvMode: false,
                    isNoCast: true,
                    isFixedType: false
                }
            );

        });

        it("getSelectedColumns test", () => {
            const {
                leftSelectable, rightSelectable,
                leftFixed, rightFixed
            } = model.getSelectedColumns();
            expect(leftSelectable.length).to.equal(expected.numLeftSelectableCols);
            expect(leftFixed.length).to.equal(expected.numLeftFixedCols);
            expect(rightSelectable.length).to.equal(expected.numRightSelectableCols);
            expect(rightFixed.length).to.equal(expected.numRightFixedCols);
        });

        it("getUnSelectedColumns test", () => {
            const {
                leftSelectable: leftUnselected, rightSelectable: rightUnselected
            } = model.getUnSelectedColumns();
            expect(leftUnselected.length).to.equal(expected.numLeftUnselected);
            expect(rightUnselected.length).to.equal(expected.numRightUnselected);
        });

        it("addSelectedColumn/removeSelectedColumn test", () => {
            const colToUnselect = {
                left: model._selectedColumns.left[model._selectedColumns.left.length - 1],
                right: model._selectedColumns.right[model._selectedColumns.right.length - 1]
            };
            const originLength = {
                left: model._selectedColumns.left.length,
                right: model._selectedColumns.right.length
            };

            // Case: remove
            model.removeSelectedColumn(colToUnselect);
            expect(model._selectedColumns.left.length).to.equal(originLength.left - 1);
            expect(model._selectedColumns.right.length).to.equal(originLength.right - 1);

            // Case: add
            model.addSelectedColumn(colToUnselect);
            expect(model._selectedColumns.left.length).to.equal(originLength.left);
            expect(model._selectedColumns.right.length).to.equal(originLength.right);
        });

        it("_getUnselectableColumns test", () => {
            const leftJoinOn = ['leftJoinOn'];
            const rightJoinOn = ['rightJoinOn'];
            const model = new JoinOpPanelModel();

            let result;
            // Case: rightOuterJoin
            // result = model._getUnselectableColumns({
            //     joinType: JoinOperatorTStr[JoinOperatorT.RightOuterJoin],
            //     leftJoinOn: leftJoinOn,
            //     rightJoinOn: rightJoinOn
            // });
            // expect(result.left.length).to.equal(0);
            // expect(result.right.length).to.equal(1);

            // Case: other joinType
            result = model._getUnselectableColumns({
                joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
                leftJoinOn: leftJoinOn,
                rightJoinOn: rightJoinOn
            });
            expect(result.left.length).to.equal(1);
            expect(result.right.length).to.equal(1);
        });
    });

    describe("column pair functions should work", () => {
        const initPairs = [1,2,3,4].map((v) => ({
            leftName: `left${v}`,
            leftCast: ColumnType.undefined,
            rightName: `right${v}`,
            rightCast: ColumnType.undefined
        }));
        const leftColumns = initPairs.map((pair) => ({
            name: pair.leftName, type: pair.leftCast, isPrefix: false, prefix: ''
        })).concat([{ name: 'newLeft', type: ColumnType.string, isPrefix: false, prefix: '' }]);
        const rightColumns = initPairs.map((pair) => ({
            name: pair.rightName, type: pair.rightCast, isPrefix: false, prefix: ''
        })).concat([{ name: 'newRight', type: ColumnType.string, isPrefix: false, prefix: '' }]);

        const model = new JoinOpPanelModel();
        model._columnMeta.left = leftColumns;
        model._columnMeta.leftMap = leftColumns.reduce((map, col) => {
            map.set(col.name, col);
            return map;
        }, new Map());
        model._columnMeta.right = rightColumns;
        model._columnMeta.rightMap = rightColumns.reduce((map, col) => {
            map.set(col.name, col);
            return map;
        }, new Map());

        it("addColumnPair test", () => {
            // Case: empty column pair
            model._joinColumnPairs = [];
            model.addColumnPair();
            expect(model._joinColumnPairs.length).to.equal(1);
            expect(model._joinColumnPairs[0]).to.deep.equal(model._getDefaultColumnPair());

            // Case: regular column pair
            const pair = {
                leftName: 'leftName',
                leftCast: ColumnType.undefined,
                rightName: 'rightName',
                rightCast: ColumnType.undefined
            };
            model._joinColumnPairs = [];
            model.addColumnPair(Object.assign({}, pair));
            expect(model._joinColumnPairs.length).to.equal(1);
            expect(model._joinColumnPairs[0]).to.deep.equal(pair);
        });

        it("removeColumnPair test", () => {
            model._joinColumnPairs = initPairs.map((v) => Object.assign({}, v));
            model.removeColumnPair(1);
            expect(model._joinColumnPairs[1]).to.deep.equal(initPairs[2]);
        });

        it("getColumnPairsLength test", () => {
            model._joinColumnPairs = initPairs.map((v) => Object.assign({}, v));
            expect(model.getColumnPairsLength()).to.equal(initPairs.length);
        });

        it("getColumnPairs test", () => {
            model._joinColumnPairs = initPairs.map((v) => Object.assign({}, v));
            const pairs = model.getColumnPairs();
            expect(pairs.length).to.equal(initPairs.length);
            for (let i = 0; i < pairs.length; i ++) {
                expect(pairs[i]).to.deep.equal(initPairs[i]);
            }
        });

        it("modifyColumnPairName test", () => {
            model._joinColumnPairs = initPairs.map((v) => Object.assign({}, v));

            // Case: Index out of range
            model.modifyColumnPairName(100, { left: 'left', right: 'right' });
            const pairs = model.getColumnPairs();
            for (let i = 0; i < pairs.length; i ++) {
                expect(pairs[i]).to.deep.equal(initPairs[i]);
            }

            // Case: regular input
            model.modifyColumnPairName(1, { left: 'newLeft', right: 'newRight' });
            expect(model._joinColumnPairs[1].leftName).to.equal('newLeft');
            expect(model._joinColumnPairs[1].rightName).to.equal('newRight');
        });

    });

    describe("joinType functions should work", () => {
        const model = new JoinOpPanelModel();
        const oldFunc = {
            _buildRenameInfo: model._buildRenameInfo,
            _clearRenames: model._clearRenames
        }

        it("setJoinTypeAndRebuild test", () => {
            let isBuildRenameInfoCalled = false;
            let isClearRenamesCalled = false;
            model._buildRenameInfo = () => { isBuildRenameInfoCalled = true; };
            model._clearRenames = () => { isClearRenamesCalled = true; };

            let newType;

            // Case #1
            newType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];
            isBuildRenameInfoCalled = false;
            isClearRenamesCalled = false;

            model.setJoinTypeAndRebuild(newType);
            expect(model._joinType).to.equal(newType);
            expect(isClearRenamesCalled).to.equal(true);
            expect(isBuildRenameInfoCalled).to.equal(false);

            // Case #2
            newType = JoinOperatorTStr[JoinOperatorT.InnerJoin];
            isBuildRenameInfoCalled = false;
            isClearRenamesCalled = false;
            model._joinType = JoinOperatorTStr[JoinOperatorT.LeftOuterJoin];

            model.setJoinTypeAndRebuild(newType);
            expect(model._joinType).to.equal(newType);
            expect(isClearRenamesCalled).to.equal(false);
            expect(isBuildRenameInfoCalled).to.equal(false);

            // Case #3
            newType = JoinOperatorTStr[JoinOperatorT.InnerJoin];
            isBuildRenameInfoCalled = false;
            isClearRenamesCalled = false;
            model._joinType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];

            model.setJoinTypeAndRebuild(newType);
            expect(model._joinType).to.equal(newType);
            expect(isClearRenamesCalled).to.equal(false);
            expect(isBuildRenameInfoCalled).to.equal(true);

            // Restore functions
            model._buildRenameInfo = oldFunc._buildRenameInfo;
            model._clearRenames = oldFunc._clearRenames;
        });

        it("isLeftColumnsOnly test", () => {
            // Types require left columns only
            model._joinType = JoinOperatorTStr[JoinOperatorT.LeftSemiJoin];
            expect(model.isLeftColumnsOnly()).to.equal(true);
            model._joinType = JoinOperatorTStr[JoinOperatorT.LeftAntiJoin];
            expect(model.isLeftColumnsOnly()).to.equal(true);

            // Types require both left and right
            model._joinType = JoinOperatorTStr[JoinOperatorT.InnerJoin];
            expect(model.isLeftColumnsOnly()).to.equal(false);
            model._joinType = JoinOperatorTStr[JoinOperatorT.LeftOuterJoin];
            expect(model.isLeftColumnsOnly()).to.equal(false);
            model._joinType = JoinOperatorTStr[JoinOperatorT.RightOuterJoin];
            expect(model.isLeftColumnsOnly()).to.equal(false);
            model._joinType = JoinOperatorTStr[JoinOperatorT.FullOuterJoin];
            expect(model.isLeftColumnsOnly()).to.equal(false);
            model._joinType = JoinOperatorTStr[JoinOperatorT.CrossJoin];
            expect(model.isLeftColumnsOnly()).to.equal(false);

        });

        it("_needRenameByType test", () => {
            // Types need rename
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.LeftSemiJoin])
            ).to.equal(false);
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.LeftAntiJoin])
            ).to.equal(false);
            // Types dont need rename
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.InnerJoin])
            ).to.equal(true);
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.LeftOuterJoin])
            ).to.equal(true);
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.RightOuterJoin])
            ).to.equal(true);
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.FullOuterJoin])
            ).to.equal(true);
            expect(
                model._needRenameByType(JoinOperatorTStr[JoinOperatorT.CrossJoin])
            ).to.equal(true);
        });
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

    function genRenames(progCols, surfix = 'rn') {
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
                destColumn: `${colName}_${surfix}`,
                prefix: false
            });
        }
        for (const prefix of prefixes) {
            renames.push({
                sourceColumn: prefix,
                destColumn: `${prefix}_${surfix}`,
                prefix: true
            });
        }
        return renames;
    }
});