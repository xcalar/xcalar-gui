describe('SortOpPanelModel Test', () => {
    before((done) => {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });
    describe('fromDag() should work', () => {
        it('Case: invalid input', () => {
            let error = null;
            try {
                const testModel = SortOpPanelModel.fromDag(null);
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
                const testModel = SortOpPanelModel.fromDag(dagNode);
                expect(testModel != null).to.equal(true);
                expect(testModel._allColMap.size).to.equal(allColumns.length);
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });
    });

    describe('fromDagInput() should work', () => {
        it('Case: regular column', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const expectedModel = createDefaultModel(columns);
            const testDagInput = {
                "columns": columns,
                "newKeys": [],
                outputTableName: ""
            };

            const testModel = SortOpPanelModel.fromDagInput(
                expectedModel._allColMap, testDagInput
            );
            expect(testModel._sortedColumns).to.deep.equal(expectedModel._sortedColumns);

        });
        it('Case: invalid input', () => {
            const testDagInput = createDefaultDagInput();
            let error = null;
            try {
                const testModel = SortOpPanelModel.fromDagInput(
                    createDefaultColumns().reduce((map, progCol) => {
                        map.set(progCol.getBackColName(), progCol);
                        return map;
                    }, new Map()),
                    testDagInput
                );
                expect(testModel._sortedColumns).to.deep.equal([{columnName: "", ordering: "Ascending"}]);
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });
    });

    describe('toDagInput() should work', () => {
        it('Case: regular column', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const testModel = createDefaultModel(columns);
            const testDagInput = {
                "columns": columns,
                "newKeys": [],
                outputTableName: ""
            };
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });

        it('Case: regular column with new keys', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const testModel = createDefaultModel(columns, ["test"]);
            const testDagInput = {
                "columns": columns,
                "newKeys": ["test"],
                outputTableName: ""
            };
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });


        it('Case: multiple columns with new keys', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {
                    "columnName": "students::student_id",
                    "ordering": "Descending"
                }
            ];
            const testModel = createDefaultModel(columns, ["test", "test2"]);
            const testDagInput = {
                "columns": columns,
                "newKeys": ["test", "test2"],
                outputTableName: ""
            };
            expect(testModel.toDagInput()).to.deep.equal(testDagInput);
        });
    });

    describe('validateInputData() should work', () => {
        it('Case: valid data', () => {
            let error = null;
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            try {
                const model = createDefaultModel(columns);
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error == null).to.equal(true);
        });

        it('Case: duplicate columns', () => {
            let error = null;
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {
                    "columnName": "students::student_name",
                    "ordering": "Descending"
                }
            ];
            try {
                const model = createDefaultModel(columns);
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Duplicate column names are not allowed: students::student_name');
        });

        it('Case: duplicate key names', () => {
            let error = null;
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {
                    "columnName": "students::student_id",
                    "ordering": "Descending"
                }
            ];
            try {
                const model = createDefaultModel(columns, ["test", "test"]);
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Duplicate new key names are not allowed: test');
        });

        it('Case: invalid key name', () => {
            let error = null;
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            try {
                const model = createDefaultModel(columns, ["te.st"]);
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal(ColTStr.ColNameInvalidCharSpace);
        });

        it('Case: columns already has key name', () => {
            let error = null;
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            try {
                const model = createDefaultModel(columns, ["col#1"]);
                model.validateInputData();
            } catch(e) {
                error = e;
            }
            expect(error != null).to.equal(true);
            expect(error.message).to.equal('Field with same name already exists: col#1');
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

        it('getSortedColumns', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {
                    "columnName": "students::student_id",
                    "ordering": "Descending"
                }
            ];
            const model = createDefaultModel(columns);
            expect(model.getSortedColumns()).to.equal(columns)
            expect(model.getSortedColumn(1)).to.deep.equal(columns[1]);
        });

        it('setSortedColumn', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const model = createDefaultModel(columns);
            model.setSortedColumn(1, {
                "columnName": "students::student_id",
                "ordering": "Descending"
            });
            expect(model.getSortedColumn(1)).to.deep.equal({
                "columnName": "students::student_id",
                "ordering": "Descending"
            });
        });

        it('setColumnName', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const model = createDefaultModel(columns);
            model.setColumName(0, "newName");
            expect(model.getSortedColumn(0)).to.deep.equal({
                "columnName": "newName",
                "ordering": "Ascending"
            });
        });

        it('setColumnOrdering', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const model = createDefaultModel(columns);
            model.setColumnOrdering(0, "Descending");
            expect(model.getSortedColumn(0)).to.deep.equal({
                "columnName": "students::student_name",
                "ordering": "Descending"
            });
        });

        it('addColumn', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                }
            ];
            const model = createDefaultModel(columns);
            model.addColumn();
            expect(model.getSortedColumns()).to.deep.equal([{
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {columnName: "",
                    ordering: "Ascending"
                }]
            );
        });

        it('getSortedColumns', () => {
            let columns = [
                {
                    "columnName": "students::student_name",
                    "ordering": "Ascending"
                },
                {
                    "columnName": "students::student_id",
                    "ordering": "Descending"
                }
            ];
            const model = createDefaultModel(columns);
            model.removeColumn(0);
            expect(model.getSortedColumns()).to.deep.equal([{
                    "columnName": "students::student_id",
                    "ordering": "Descending"
                }]
            );
        });
    });

    function createDefaultColumns() {
        return genProgCols('prefix::col', 2).concat(genProgCols('col', 2));
    }

    function createDefaultDagInput() {
        return {
            "columns": [],
            "newKeys": []
        };
    }

    function createDefaultModel(columns, newKeys) {
        const allColumns = createDefaultColumns().reduce((map, progCol) => {
            map.set(progCol.getBackColName(), progCol);
            return map;
        }, new Map());
        const model = new SortOpPanelModel();
        model._allColMap = allColumns;
        model._sortedColumns = columns;
        model._newKeys = newKeys || [];
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