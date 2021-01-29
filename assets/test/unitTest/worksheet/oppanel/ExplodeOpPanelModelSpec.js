describe('ExplodeOpPanelModel Test', () => {

    describe('fromDag() should work', () => {
        it('Case: invalid input', () => {
            let error = null;
            try {
                const testModel = ExplodeOpPanelModel.fromDag(null);
                expect(testModel != null).to.equal(true);
            } catch(e) {
                error = e;
            }
            expect(error.message).to.equal("Cannot read property 'getParents' of null");
        });

        it('Case: normal case', () => {
            const allColumns = createDefaultColumns();
            const dagNode = {
                getParents: () => {
                    return [
                        {
                            getLineage: () => {
                                return {
                                    getColumns: () => allColumns
                                }
                            }
                        },
                        null
                    ];
                },
                getParam: () => createDefaultDagInput()
            };

            let error = null;
            try {
                const testModel = ExplodeOpPanelModel.fromDag(dagNode);
                expect(testModel != null).to.equal(true);
                expect(testModel._allColMap.size).to.equal(allColumns.length);
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });
    });

    describe('fromDagInput() should work', () => {
        it('Case: regular delimiter', () => {
            const delimiter = ',';
            const expectedModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);

            const testModel = ExplodeOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColumn).to.equal(expectedModel._sourceColumn);
            expect(testModel._destColumn).to.equal(expectedModel._destColumn);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });
        it('Case: special delimiter', () => {
            const delimiter = '\\"';
            const expectedModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);

            const testModel = ExplodeOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColumn).to.equal(expectedModel._sourceColumn);
            expect(testModel._destColumn).to.equal(expectedModel._destColumn);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });
        it('Case: invalid input', () => {
            const testDagInput = createDefaultDagInput();
            testDagInput.eval[0].evalString = 'invalid eval string';

            let error = null;
            try {
                const testModel = ExplodeOpPanelModel.fromDagInput(
                    createDefaultColumns().reduce((map, progCol) => {
                        map.set(progCol.getBackColName(), progCol);
                        return map;
                    }, new Map()),
                    testDagInput
                );
                expect(testModel._delimiter).to.equal('');
                expect(testModel._sourceColumn).to.equal('');
                expect(testModel._destColumn).to.equal('');
                expect(testModel._includeErrRow).to.equal(false);
            } catch(e) {
                error = e;
            }
            expect(error).to.equal("line 1:19 no viable alternative at input 'invalid eval string'");
        });
    });

    describe('toDagInput() should work', () => {
        it('Case: regular delimiter', () => {
            const delimiter = ',';
            const testModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });

        it('Case: " delimiter', () => {
            const delimiter = '"';
            const testModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });

        it('Case: \\ delimiter', () => {
            const delimiter = '\\';
            const testModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });
    });

    describe('autofillEmptyDestColumn() should work', () => {
        it('Case: source name is empty', () => {
            const expectedModel = createDefaultModel();
            const testModel = createDefaultModel();
            testModel._sourceColumn = '';
            expectedModel._sourceColumn = '';
            testModel.autofillEmptyDestColumn();
            // Nothing will happen
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColumn).to.equal(expectedModel._sourceColumn);
            expect(testModel._destColumn).to.equal(expectedModel._destColumn);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });

        it('Case: no change has been made', () => {
            const expectedModel = createDefaultModel();
            const testModel = createDefaultModel();
            testModel._destColumn = 'new_dest_name';
            testModel._destColumnChanged = true;
            testModel.autofillEmptyDestColumn();
            // Nothing will happen
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColumn).to.equal(expectedModel._sourceColumn);
            expect(testModel._destColumn).to.equal('new_dest_name');
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });

        it('Case: change has been made', () => {
            const expectedModel = createDefaultModel();
            const testModel = createDefaultModel();
            testModel._destColumn = 'new_dest_name';
            testModel._destColumnChanged = false;
            testModel.autofillEmptyDestColumn();
            // Dest column will be auto-generated
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColumn).to.equal(expectedModel._sourceColumn);
            expect(testModel._destColumn).to.equal(expectedModel._destColumn);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });
    });

    describe('validateInputData() should work', () => {
        it('Case: valid data', () => {
            let error = null;
            try {
                const model = createDefaultModel();
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });

        it('Case: invalid source column', () => {
            let error = null;

            // null
            try {
                const model = createDefaultModel();
                model._sourceColumn = null;
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Source column cannot be empty');

            // ''
            try {
                error = null;
                const model = createDefaultModel();
                model._sourceColumn = '';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Source column cannot be empty');

            // Not exist
            try {
                error = null;
                const model = createDefaultModel();
                model._sourceColumn = 'columnNotExist';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Source column does not exist');
        });

        it('Case: invalid dest column name', () => {
            let error = null;

            // null
            try {
                error = null;
                const model = createDefaultModel();
                model._destColumn = null;
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Dest column cannot be empty');

            // ''
            try {
                error = null;
                const model = createDefaultModel();
                model._destColumn = '';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Dest column cannot be empty');

            // prefixed
            try {
                error = null;
                const model = createDefaultModel();
                model._destColumn = 'anyPrefix::anyColumn';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Dest column cannot have prefix');

            // Dup column name
            try {
                error = null;
                const model = createDefaultModel();
                model._destColumn = 'col#1';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Duplicate column "col#1"');
        });

        it('Case: empty delimiter', () => {
            let error = null;

            // null
            try {
                error = null;
                const model = createDefaultModel();
                model._delimiter = null;
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Delimiter cannot be empty');

            // ''
            try {
                error = null;
                const model = createDefaultModel();
                model._delimiter = '';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Delimiter cannot be empty');
        });
    });

    describe('setter/getter should work', () => {
        it('getColNameSet', () => {
            const model = createDefaultModel();
            expect(model.getColNameSet().size).to.equal(model._allColMap.size);
        });

        it('getTitle', () => {
            const model = createDefaultModel();
            expect(model.getTitle()).to.equal(model._title);
        });

        it('getInstrStr', () => {
            const model = createDefaultModel();
            expect(model.getInstrStr()).to.equal(model._instrStr);
        });

        it('set/getSourceColumn', () => {
            const model = createDefaultModel();
            const expectedName = 'expectedColumnName';
            model.setSourceColumn(expectedName);
            expect(model._sourceColumn).to.equal(expectedName);
            expect(model.getSourceColumn()).to.equal(expectedName);
        });

        it('set/getDelimiter', () => {
            const model = createDefaultModel();
            const expectedDelimiter = 'expected delimiter';
            model.setDelimiter(expectedDelimiter);
            expect(model._delimiter).to.equal(expectedDelimiter);
            expect(model.getDelimiter()).to.equal(expectedDelimiter);
        });

        it('set/isIncludeErrRow', () => {
            const model = createDefaultModel();
            model.setIncludeErrRow(true);
            expect(model._includeErrRow).to.equal(true);
            expect(model.isIncludeErrRow()).to.equal(true);
            model.setIncludeErrRow(false);
            expect(model._includeErrRow).to.equal(false);
            expect(model.isIncludeErrRow()).to.equal(false);
        });
    });

    function createDefaultColumns() {
        return genProgCols('prefix::col', 2).concat(genProgCols('col', 2));
    }

    function createDefaultDagInput(delimiter = ',') {
        delimiter = delimiter.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        return {
            eval: [
                { evalString: `explodeString(col#1,"${delimiter}")`, newField: 'col#1-explode-1' },
            ],
            icv: false,
            "outputTableName":""
        };
    }

    function createDefaultModel(delimiter = ',') {
        const allColumns = createDefaultColumns().reduce((map, progCol) => {
            map.set(progCol.getBackColName(), progCol);
            return map;
        }, new Map());
        const model = new ExplodeOpPanelModel();
        model._allColMap = allColumns;
        model._sourceColumn = 'col#1';
        model._destColumn = 'col#1-explode-1';
        model._delimiter = delimiter;
        model._includeErrRow = false;
        model._outputTableName = "";
        return model;
    }

    function genProgCols(colPrefix, count, sep='#') {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}${sep}${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});