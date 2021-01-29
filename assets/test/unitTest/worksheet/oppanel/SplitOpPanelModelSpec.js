describe('SplitOpPanelModel Test', () => {
    describe('fromDag() sould work', () => {
        it('Case: invalid input', () => {
            let error = null;
            try {
                const testModel = SplitOpPanelModel.fromDag(null);
                expect(testModel != null).to.equal(true);
            } catch(e) {
                error = e;
            }
            expect(error.message).to.equal("Cannot read property \'getParents\' of null");
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
                const testModel = SplitOpPanelModel.fromDag(dagNode);
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

            const testModel = SplitOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColName).to.equal(expectedModel._sourceColName);
            expect(testModel._destColNames.length).to.equal(expectedModel._destColNames.length);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
        });
        it('Case: special delimiter', () => {
            const delimiter = '\\"';
            const expectedModel = createDefaultModel(delimiter);
            const testDagInput = createDefaultDagInput(delimiter);

            const testModel = SplitOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._delimiter).to.equal(expectedModel._delimiter);
            expect(testModel._sourceColName).to.equal(expectedModel._sourceColName);
            expect(testModel._destColNames.length).to.equal(expectedModel._destColNames.length);
            expect(testModel._includeErrRow).to.equal(expectedModel._includeErrRow);
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

    describe('getColNameSetWithNew() should work', () => {
        it('Case: all columns + dest columns', () => {
            const model = createDefaultModel();
            const nameSet = model.getColNameSetWithNew(-1);
            const expectedSize = model._allColMap.size + model._destColNames.length;
            expect(nameSet.size).to.equal(expectedSize);
        });

        it('Case: all columns except the first dest column', () => {
            const model = createDefaultModel();
            const nameSet = model.getColNameSetWithNew(0);
            const expectedSize = model._allColMap.size + model._destColNames.length - 1;
            expect(nameSet.size).to.equal(expectedSize);
        });
    });

    describe('validateInputData() should work', () => {
        it('Case: valid data', () => {
            const model = createDefaultModel();
            let error = null;
            try {
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });

        it('Case: empty source column', () => {
            const model = createDefaultModel();
            let error;

            try {
                error = null;
                model._sourceColName = null;
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal('Source column cannot be empty');

            try {
                error = null;
                model._sourceColName = '';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal('Source column cannot be empty');
        });

        it('Case: source column not exist', () => {
            const model = createDefaultModel();
            let error;

            try {
                error = null;
                model._sourceColName = 'colNotInColMap';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal(`Source column(${model._sourceColName}) does not exist`);
        });

        it('Case: empty delimiter', () => {
            const model = createDefaultModel();
            let error;

            try {
                error = null;
                model._delimiter = null;
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal('Delimiter cannot be empty');

            try {
                error = null;
                model._delimiter = '';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal('Delimiter cannot be empty');
        });

        it('Case: invalid dest column name', () => {
            const model = createDefaultModel();
            let error;

            // Prefixed column name
            try {
                error = null;
                model._destColNames[0] = 'testPrefix::col-split';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal(`Dest column(${model._destColNames[0]}) cannot have prefix`);

            // Dup column name
            try {
                error = null;
                model._destColNames[0] = 'col#1';
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true)
            expect(error.message).to.equal(`Duplicate column "${model._destColNames[0]}"`);
        });
    });

    describe('autofillEmptyColNames() should work', () => {
        it('Case: all dest names are empty', () => {
            const model = createDefaultModel();
            for (let i = 0; i < model._destColNames.length; i ++) {
                model._destColNames[i] = '';
            }
            model.autofillEmptyColNames();
            for (const name of model._destColNames) {
                expect(name.length > 0).to.equal(true);
            }
        });

        it ('Case: some of dest names are empty', () => {
            const model = createDefaultModel();
            model._destColNames[0] = '';
            model.autofillEmptyColNames();
            for (const name of model._destColNames) {
                expect(name.length > 0).to.equal(true);
            }
        });
    });

    describe('setter/getter should work', () => {
        let testModel;
        before(() => {
            testModel = createDefaultModel();
        });
        afterEach(() => {
            testModel = createDefaultModel();
        });
        it('title', () => {
            testModel._title = 'test title';
            expect(testModel.getTitle()).to.equal('test title');
        });

        it('instrStr', () => {
            testModel._instrStr = 'test instr';
            expect(testModel.getInstrStr()).to.equal('test instr');
        });

        it('delimiter', () => {
            testModel.setDelimiter('test delimiter');
            expect(testModel._delimiter).to.equal('test delimiter');
            expect(testModel.getDelimiter()).to.equal('test delimiter');
        });

        it('column map', () => {
            expect(testModel.getColumnMap().size).to.equal(testModel._allColMap.size);
        });

        it('source column name', () => {
            testModel.setSourceColName('test col name');
            expect(testModel._sourceColName).to.equal('test col name');
            expect(testModel.getSourceColName()).to.equal(testModel._sourceColName);
        });

        it('dest column names', () => {
            // Get number
            expect(testModel.getNumDestCols()).to.equal(testModel._destColNames.length);

            const originDestNames = testModel._destColNames.map((v) => v);

            // Set new number == current number
            testModel.setNumDestCols(originDestNames.length);
            expect(testModel.getNumDestCols()).to.equal(originDestNames.length);
            for (let i = 0; i < originDestNames.length; i ++) {
                expect(testModel._destColNames[i]).to.equal(originDestNames[i]);
            }
            testModel._destColNames = originDestNames.map((v) => v);

            // Set new number < current number
            testModel.setNumDestCols(originDestNames.length - 1);
            expect(testModel.getNumDestCols()).to.equal(originDestNames.length - 1);
            for (let i = 0; i < originDestNames.length - 1; i ++) {
                expect(testModel._destColNames[i]).to.equal(originDestNames[i]);
            }
            testModel._destColNames = originDestNames.map((v) => v);

            // Set new number > current number
            testModel.setNumDestCols(originDestNames.length + 1);
            expect(testModel.getNumDestCols()).to.equal(originDestNames.length + 1);
            for (let i = 0; i < originDestNames.length; i ++) {
                expect(testModel._destColNames[i]).to.equal(originDestNames[i]);
            }
            testModel._destColNames = originDestNames.map((v) => v);

            // Get by index
            for (let i = 0; i < originDestNames.length; i ++) {
                expect(testModel.getDestColNameByIndex(i)).to.equal(testModel._destColNames[i]);
            }
            testModel._destColNames = originDestNames.map((v) => v);

            // Get all dest names
            const allDestNames = testModel.getDestColNames();
            expect(allDestNames.length).to.equal(testModel._destColNames.length);
            for (let i = 0; i < allDestNames.length; i ++) {
                expect(allDestNames[i]).to.equal(testModel._destColNames[i]);
            }
            allDestNames[0] = allDestNames[0] + "mod";
            expect(allDestNames[0]).to.not.equal(testModel._destColNames[0]);
            testModel._destColNames = originDestNames.map((v) => v);

            // Set one column name
            const oneColName = testModel._destColNames[0];
            testModel.setDestColName(0, oneColName + 'mod');
            expect(testModel._destColNames[0]).to.equal(oneColName + 'mod');
            for (let i = 1; i < originDestNames.length; i ++) {
                expect(testModel._destColNames[i]).to.equal(originDestNames[i]);
            }
            testModel._destColNames = originDestNames.map((v) => v);
        });

        it('icv', () => {
            testModel.setIncludeErrRow(true);
            expect(testModel.isIncludeErrRow()).to.equal(true);
            testModel.setIncludeErrRow(false);
            expect(testModel.isIncludeErrRow()).to.equal(false);
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

    function createDefaultModel(delimiter = '/') {
        const allColumns = createDefaultColumns().reduce((map, progCol) => {
            map.set(progCol.getBackColName(), progCol);
            return map;
        }, new Map());
        const model = new SplitOpPanelModel();
        model._delimiter = delimiter;
        model._sourceColName = 'col#1';
        model._destColNames = ['col-split-1', 'col-split-2'];
        model._allColMap = allColumns;
        return model;
    }

    function createDefaultDagInput(delimiter = '/') {
        delimiter = delimiter.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
        return {
            eval: [
                { evalString: `cut(col#1,1,"${delimiter}")`, newField: 'col-split-1' },
                { evalString: `cut(col#1,2,"${delimiter}")`, newField: 'col-split-2' },
            ],
            icv: false,
            "outputTableName":""
        };
    }
});