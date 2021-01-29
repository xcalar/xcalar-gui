describe('RoundOpPanelModel Test', () => {
    const preset = {
        columns: null,
        columnMap: null,
        parentNode: null
    };

    before(() => {
        preset.columns = genProgCols('myPrefix::col', 5)
            .concat(genProgCols('col', 4))
            .concat(genProgCols('col-round', 10, '-'));
        preset.columnMap = preset.columns.reduce((map, col) => {
            map.set(col.getBackColName(), col);
            return map;
        }, new Map());
        preset.parentNode = {
            getLineage: () => ({
                getColumns: () => preset.columns
            })
        };
    });

    describe('fromDagInput() should work', () => {
        it('Case: null eval', () => {
            let error = '';
            try {
                RoundOpPanelModel.fromDagInput(preset.columnMap, {});
            } catch(e) {
                error = e.message;
            }
            expect(error).to.equal('Eval string cannot be null');
        });

        it('Case: invalid eval', () => {
            let error;
            let model;
            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: 1});
            } catch (e) {
                error = e;
            }
            expect(model == null).to.equal(true);
        });

        it('Case: wrong function name', () => {
            let model;
            let error;
            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: [{
                    evalString: 'func(abc,1)', newField: 'newCol'
                }]});
            } catch (e) {
                error = e;
            }

            expect(model == null).to.equal(true);
            expect(error.message).to.equal("Invalid function name(func)");
        });

        it('Case: invalid function arguments', () => {
            let error;
            let model;
            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: [{
                    evalString: 'round()', newField: 'newCol'
                }]});
            } catch(e) {
                error = e;
            }
            expect(model == null).to.equal(true);
            expect(error.message).to.equal("Invalid column name");
        });

        it('Case: invalid column name', () => {
            let error;
            let model;
            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: [{
                    evalString: 'round(func(abc),1)', newField: 'newCol'
                }]});
            } catch(e){error = e}
            expect(model == null).to.equal(true);
            expect(error.message).to.equal("Invalid column name");
        });

        it('Case: invalid numDecimals', () => {
            let error;
            let model;
            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: [{
                    evalString: 'round(abc,func(1))', newField: 'newCol'
                }]});
            } catch(e){error = e}
            expect(model == null).to.equal(true);
            expect(error.message).to.equal("Invalid num decimals");

            try {
                model = RoundOpPanelModel.fromDagInput(preset.columnMap, {eval: [{
                    evalString: 'round(abc,"aaa")', newField: 'newCol'
                }]});
            } catch(e){error = e}
            expect(model == null).to.equal(true);
            expect(error.message).to.equal("Invalid num decimals");
        });

        it('Case: valid input', () => {
            const model = RoundOpPanelModel.fromDagInput(preset.columnMap, {
                eval: [{
                    evalString: 'round(abc,1)', newField: 'newCol'
                }],
                icv: true
            });
            expect(model == null).to.equal(false);
            expect(model._allColMap.size).to.equal(preset.columnMap.size);
            expect(model._sourceColumn).to.equal('abc');
            expect(model._numDecimals).to.equal(1);
            expect(model._destColumn).to.equal('newCol');
            expect(model._includeErrRow).to.equal(true);
        });

        function checkDefaultModel(model, testName) {
            expect(model._sourceColumn, testName).to.equal('');
            expect(model._numDecimals, testName).to.equal(0);
            expect(model._destColumn, testName).to.equal('');
            expect(model._includeErrRow, testName).to.equal(false);
        }
    });

    describe('fromDag() should work', () => {
        it('Case: invalid input', () => {
            let model;
            try {
                model = RoundOpPanelModel.fromDag(null);
            } catch (e) {

            }

            expect(model).to.be.undefined;
        });

        it('Case: normal input', () => {
            const dagNode = {
                getParents: () => [preset.parentNode],
                getParam: () => ({
                    eval: [{
                        evalString: 'round(abc,1)',
                        newField: 'newCol'
                    }],
                    icv: true
                })
            }
            const model = RoundOpPanelModel.fromDag(dagNode);
            expect(model).to.not.be.null;
            expect(model._allColMap.size).to.not.equal(0);
        });
    });

    describe('toDagInput() should work', () => {
        it('normal case', () => {
            const inputParam = {
                eval: [{
                    evalString: 'round(abc,1)',
                    newField: 'newCol'
                }],
                icv: true,
                "outputTableName":""
            };
            const model = RoundOpPanelModel.fromDagInput(new Map(), inputParam);
            expect(model.toDagInput()).to.deep.equal(inputParam);
        });
    });

    describe('validateInputData() should work', () => {
        it('Case: invalid data', () => {
            const checkList = [
                {
                    name: '_sourceColumn is null',
                    modify: (model) => {model._sourceColumn = null},
                    expected: 'Source column cannot be empty'
                },
                {
                    name: '_sourceColumn is empty',
                    modify: (model) => {model._sourceColumn = ''},
                    expected: 'Source column cannot be empty'
                },
                {
                    name: '_sourceColumn not exists',
                    modify: (model) => {model._sourceColumn = 'notExistColumn'},
                    expected: 'Source column does not exist'
                },
                {
                    name: '_numDecimals is null',
                    modify: (model) => {model._numDecimals = null},
                    expected: 'Invalid num of decimals'
                },
                {
                    name: '_numDecimals is less than 0',
                    modify: (model) => {model._numDecimals = -1},
                    expected: 'Invalid num of decimals'
                },
                {
                    name: '_destColumn is null',
                    modify: (model) => {model._destColumn = null},
                    expected: 'Dest column cannot be empty'
                },
                {
                    name: '_destColumn is empty',
                    modify: (model) => {model._destColumn = ''},
                    expected: 'Dest column cannot be empty'
                },
                {
                    name: '_destColumn is prefixed',
                    modify: (model) => {model._destColumn = 'prefix::col'},
                    expected: 'Dest column cannot have prefix'
                },
                {
                    name: '_destColumn is dup',
                    modify: (model) => {model._destColumn = 'col#1'},
                    expected: 'No Error'
                },
            ];

            const param = {
                eval: [{
                    evalString: 'round(col#2,1)',
                    newField: 'newCol'
                }],
                icv: true
            };
            for (const { name, modify, expected } of checkList) {
                const model = RoundOpPanelModel.fromDagInput(preset.columnMap, param);
                let error = 'No Error';
                try {
                    modify(model);
                    model.validateInputData();
                } catch(e) {
                    error = e.message;
                }
                expect(error, name).to.equal(expected);
            }
        });
    });

    describe('Gen column name functions should work', () => {
        // it('_genColName', () => {
        //     const model = RoundOpPanelModel.fromDagInput(preset.columnMap, {
        //         eval: [{ evalString: 'round(abc,1)', newField: 'newCol' }],
        //         icv: false
        //     });
        //     const newColumn = model._genColName('col');
        //     expect(newColumn).to.equal('col-round-11');
        // });

        it('autofillEmptyDestColumn', () => {
            const model = RoundOpPanelModel.fromDagInput(preset.columnMap, {
                eval: [{ evalString: 'round(abc,1)', newField: '' }],
                icv: false
            });
            model._destColumn = '';

            // Case: Normal case(derived column)
            model.autofillEmptyDestColumn();
            expect(model._destColumn).to.equal('abc');
            model._destColumn = '';

            // Case: Normal case(prefixed column)
            model._sourceColumn = 'prefix::abc';
            model.autofillEmptyDestColumn();
            expect(model._destColumn).to.equal('abc');
            model._destColumn = '';

            // Case: Empty source column
            model._sourceColumn = '';
            model.autofillEmptyDestColumn();
            expect(model._destColumn.length).to.equal(0);
            model._sourceColumn = 'abc';

            // Case: Dest column not empty
            model._destColumn = 'newCol';
            model.autofillEmptyDestColumn();
            expect(model._destColumn).to.equal('newCol');
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
});