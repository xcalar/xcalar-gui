describe('ProjectOpPanelModel Test', () => {
    const preset = {
        inputColumns: null,
        parentNode: null
    };

    before(() => {
        preset.inputColumns = genProgCols('myPrefix::col', 5).concat(genProgCols('col', 4));
        preset.parentNode = {
            getLineage: () => ({
                getColumns: () => preset.inputColumns
            })
        };
    });

    describe('_createColMap() should work', () => {
        it('Case: parent list is null', () => {
            const projectNode = {
                getParents: () => null
            };
            const colMap = ProjectOpPanelModel._createColMap(projectNode);
            expect(colMap.size).to.equal(0);
        });

        it('Case: parent list is empty', () => {
            const projectNode = {
                getParents: () => []
            };
            const colMap = ProjectOpPanelModel._createColMap(projectNode);
            expect(colMap.size).to.equal(0);
        });

        it('Case: parent is null', () => {
            const projectNode = {
                getParents: () => [null]
            };
            const colMap = ProjectOpPanelModel._createColMap(projectNode);
            expect(colMap.size).to.equal(0);
        });

        it('Case: normal case', () => {
            const { inputColumns, parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode]
            };
            const colMap = ProjectOpPanelModel._createColMap(projectNode);
            expect(colMap.size).to.equal(inputColumns.length);
            for (const col of inputColumns) {
                const colName = col.getBackColName();
                expect(
                    colMap.get(colName), `colMap should has "${colName}"`
                ).to.deep.equal(col);
            }
        });
    });

    describe('fromDagInput() should work', () => {
        let columnMap;
        before(() => {
            columnMap = ProjectOpPanelModel._createColMap({
                getParents: () => [preset.parentNode]
            });
        });

        it('Case: no projected columns', () => {
            const dagInput = {
                columns: []
            };
            const model = ProjectOpPanelModel.fromDagInput(columnMap, dagInput);

            // Check columnMap
            expect(model.columnMap.size).to.equal(columnMap.size);

            // Check derived columns
            expect(model.derivedList.length).to.equal(4);
            for (const { name, isSelected } of model.derivedList) {
                expect(isSelected, `${name} should not be selected`).to.equal(false);
            }

            // Check prefixed columns
            expect(model.prefixedList.length).to.equal(1);
            expect(model.prefixedList[0].columnList.length).to.equal(5);
            expect(model.prefixedList[0].prefix).to.equal('myPrefix');
            expect(model.prefixedList[0].isSelected).to.equal(false);
        });

        it('Case: columns not in colMap', () => {
            const dagInput = {
                columns: ['newPrefix::col', 'newCol']
            };
            const model = ProjectOpPanelModel.fromDagInput(columnMap, dagInput);

            // Check columnMap
            expect(model.columnMap.size).to.equal(columnMap.size);

            // Check derived columns
            expect(model.derivedList.length).to.equal(5);
            for (const { name, isSelected } of model.derivedList) {
                if (name === 'newCol') {
                    expect(isSelected, `${name} should be selected`).to.equal(true);
                } else {
                    expect(isSelected, `${name} should not be selected`).to.equal(false);
                }
            }

            // Check prefixed columns
            expect(model.prefixedList.length).to.equal(2);
            expect(model.prefixedList[0].columnList.length).to.equal(5);
            expect(model.prefixedList[0].prefix).to.equal('myPrefix');
            expect(model.prefixedList[0].isSelected).to.equal(false);
            expect(model.prefixedList[1].columnList.length).to.equal(1);
            expect(model.prefixedList[1].prefix).to.equal('newPrefix');
            expect(model.prefixedList[1].isSelected).to.equal(true);
        });

        it('Case: normal case', () => {
            const dagInput = {
                columns: ['myPrefix::col#1', 'col#2']
            };
            const model = ProjectOpPanelModel.fromDagInput(columnMap, dagInput);

            // Check columnMap
            expect(model.columnMap.size).to.equal(columnMap.size);

            // Check derived columns
            expect(model.derivedList.length).to.equal(4);
            for (const { name, isSelected } of model.derivedList) {
                if (name === 'col#2') {
                    expect(isSelected, `${name} should be selected`).to.equal(true);
                } else {
                    expect(isSelected, `${name} should not be selected`).to.equal(false);
                }
            }

            // Check prefixed columns
            expect(model.prefixedList.length).to.equal(1);
            expect(model.prefixedList[0].columnList.length).to.equal(5);
            expect(model.prefixedList[0].prefix).to.equal('myPrefix');
            expect(model.prefixedList[0].isSelected).to.equal(true);
        });
    });

    describe('fromDag() should work', () => {
        it('Case: invalid input', () => {
            const { parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode],
                getParam: () => null
            };
            let model;
            let error;
            try {
                const model = ProjectOpPanelModel.fromDag(projectNode);
            } catch (e) {
                error = e;
            }

            expect(model).to.equal(undefined);
            expect(error.message).to.equal("Cannot read property \'outputTableName\' of null");
        });

        it('Case: normal case', () => {
            const { parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode],
                getParam: () => ({ columns: ['col#1'] })
            };
            const model = ProjectOpPanelModel.fromDag(projectNode);
            expect(model).to.not.equal(null);
        });
    });

    describe('toDag() should work', () => {
        it('Case: derived columns', () => {
            const { parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode],
                getParam: () => ({ columns: ['col#1'] , "outputTableName": ""})
            };
            const model = ProjectOpPanelModel.fromDag(projectNode);
            const param = model.toDag();
            expect(param).to.deep.equal(projectNode.getParam());
        });

        it('Case: prefixed columns', () => {
            const { parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode],
                getParam: () => ({ columns: ['myPrefix::col#1'], "outputTableName": "" })
            };
            const model = ProjectOpPanelModel.fromDag(projectNode);
            const param = model.toDag();
            expect(param.columns.length).to.equal(5);
        });
    });

    describe('setter/getter functions should work', () => {
        it('Case: isAllDerivedSelected', () => {
            const model = new ProjectOpPanelModel();
            model.derivedList = [1,2,3].map((v) => ({
                name: `col${v}`, isSelected: true
            }));
            expect(model.isAllDerivedSelected).to.equal(true);

            model.derivedList[0].isSelected = false;
            expect(model.isAllDerivedSelected).to.equal(false);
        });

        it('Case: selectAllDerived()', () => {
            const model = new ProjectOpPanelModel();
            model.derivedList = [1,2,3].map((v) => ({
                name: `col${v}`, isSelected: false
            }));

            model.selectAllDerived(true);
            for (const { name, isSelected } of model.derivedList) {
                expect(isSelected, `${name} is selected`).to.equal(true);
            }

            model.selectAllDerived(false);
            for (const { name, isSelected } of model.derivedList) {
                expect(isSelected, `${name} is not selected`).to.equal(false);
            }
        });

        it('Case: getSelectedCount()', () => {
            const model = new ProjectOpPanelModel();
            model.derivedList = [1,2,3].map((v) => ({
                name: `col${v}`, isSelected: true
            }));
            model.derivedList[0].isSelected = false;
            model.prefixedList = [1,2].map((pv) => {
                return {
                    prefix: `prefix${pv}`,
                    isSelected: true,
                    columnList: [{name: 'col'}]
                }
            });
            model.prefixedList[0].isSelected = false;

            expect(model.getSelectedCount()).to.deep.equal({
                derived: 2, prefixed: 1
            });
        });

        it('Case: getColumnType()', () => {
            const { parentNode } = preset;
            const projectNode = {
                getParents: () => [parentNode],
                getParam: () => ({ columns: ['col#1'], "outputTableName": "" })
            };
            const model = ProjectOpPanelModel.fromDag(projectNode);

            expect(model.getColumnType('col#1')).to.equal(ColumnType.string);
            expect(model.getColumnType('nonExistColumn')).to.equal(ColumnType.unknown);
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
});