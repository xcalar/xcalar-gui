describe('RowNumOpPanelModel Test', () => {
    before((done) => {
        UnitTest.testFinish(() => {
            return DagTabManager.Instance._hasSetup;
        }).then(() => {
            done();
        });
    });
    describe('fromDag() should work', () => {
        it('Case: invalid input', () => {
            let error = null;
            try {
                const testModel = RowNumOpPanelModel.fromDag(null);
                expect(testModel != null).to.equal(true);
            } catch(e) {
                error = e;
            }
            expect(error.message).to.equal("Cannot read property \'getParents\' of null");
        });

        it('Case: normal case', () => {
            const allColumns = createDefaultColumns();
            const dagNode = {
                getParents: () => ([{
                    getLineage: () => ({ getColumns: () => allColumns })
                }, null]),
                getParam: () => createDefaultDagInput()
            };

            let error = null;
            try {
                const testModel = RowNumOpPanelModel.fromDag(dagNode);
                expect(testModel != null).to.equal(true);
                expect(testModel._allColMap.size).to.equal(allColumns.length);
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });
    });

    describe('fromDagInput() should work', () => {
        it('Case: invalid input', () => {
            let error;
            try {
                const testModel = RowNumOpPanelModel.fromDagInput(
                    createDefaultColumnMap(), {}
                );
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
        });

        it('Case: valid input', () => {
            const destColumn = 'rowNumColumn';
            const expectedModel = createDefaultModel(destColumn);
            const testDagInput = createDefaultDagInput(destColumn);

            const testModel = RowNumOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._destColumn).to.equal(expectedModel._destColumn);
        })
    });

    describe('toDagInput() should work', () => {
        it('test', () => {
            const destColumn = 'rowNumColumn';
            const testDagInput = createDefaultModel(destColumn).toDagInput();
            const expectedDagInput = createDefaultDagInput(destColumn);

            expect(testDagInput).to.deep.equal(expectedDagInput);
        });
    });

    describe('validateInputData() should work', () => {
        it('Case: empty new column', () => {
            let error;

            try {
                error = null;
                createDefaultModel(null).validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('New column name cannot be empty');

            try {
                error = null;
                createDefaultModel('').validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('New column name cannot be empty');
        });

        it('Case: prefixed new column', () => {
            let error;

            try {
                error = null;
                createDefaultModel('anyPrefix::anyColumn').validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('New column name cannot have prefix');
        });

        it('Case: Dup new column', () => {
            let error;

            try {
                error = null;
                createDefaultModel('col#1').validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Duplicate column col#1');
        });

        it('Case: valid data', () => {
            let error;

            try {
                error = null;
                createDefaultModel().validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });
    });

    describe('setter/getter should work', () => {
        it('getTitle', () => {
            const model = createDefaultModel();
            const expectTitle = 'test title';
            model._title = expectTitle;
            expect(model.getTitle()).to.equal(expectTitle);
        });

        it('getInstrStr', () => {
            const model = createDefaultModel();
            const expectInstrStr = 'test instruction';
            model._instrStr = expectInstrStr;
            expect(model.getInstrStr()).to.equal(expectInstrStr);
        });

        it('getColNameSet', () => {
            const model = createDefaultModel();
            expect(model.getColNameSet().size).to.equal(model._allColMap.size);
        });

        it('getColumnMap', () => {
            const model = createDefaultModel();
            expect(model.getColumnMap().size).to.equal(model._allColMap.size);
        });

        it('get/setDestColumn', () => {
            const model = createDefaultModel();
            const expectDestColumn = 'expected column name';
            model.setDestColumn(expectDestColumn);
            expect(model._destColumn).to.equal(expectDestColumn);
            expect(model.getDestColumn()).to.equal(expectDestColumn);
        });
    });

    function genProgCols(colPrefix, count, sep='#') {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}${sep}${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }

    function createDefaultColumns() {
        return genProgCols('prefix::col', 2).concat(genProgCols('col', 2));
    }

    function createDefaultColumnMap() {
        return createDefaultColumns().reduce((map, progCol) => {
            map.set(progCol.getBackColName(), progCol);
            return map;
        }, new Map());
    }

    function createDefaultModel(destColumn = 'rowNumColumn') {
        const model = new RowNumOpPanelModel();
        model._destColumn = destColumn;
        model._allColMap = createDefaultColumnMap();
        model._outputTableName = "";
        return model;
    }

    function createDefaultDagInput(destColumn = 'rowNumColumn') {
        return {
            newField: destColumn,
            "outputTableName":""
        };
    }
});