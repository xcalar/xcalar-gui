describe('RowNumOpPanel Test', () => {
    let rowNumNode;
    let opPanel;

    before(() => {
        const inputColumns = genProgCols('col', 4, ColumnType.string);
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        rowNumNode = {
            getParents: () => ([parentNode]),
            getType: () => (DagNodeType.RowNum),
            getParam: () => ({ newField: 'rowNumColumn' }),
            getTitle: () => "Node 1",
            getId:() => "Node1",
            validateParam: () => true,
            isConfigured: () => true,
            beErrorState: () => true
        };

        RowNumOpPanel.Instance.show(rowNumNode, {});
        if ($("#rownumOpPanel").find(".advancedEditor").is(":visible")) {
            $("#rownumOpPanel .bottomSection .xc-switch").click();
        }

        opPanel = RowNumOpPanel.Instance;
    });

    describe('_getArgs() should work', () => {
        it('test return value', () => {
            const args = opPanel._getArgs();

            // 1 section
            expect(args.length).to.equal(1);

            // section#1: dest column
            const destColProps = args[0];
            expect(destColProps.type).to.equal('string');
            expect(destColProps.inputVal).to.equal('rowNumColumn');
            expect(destColProps.valueCheck.checkType).to.equal('stringColumnNameNoEmptyValue');
            expect(destColProps.valueCheck.args()[0].size).to.gt(0);
        });
    });

    describe('_submitForm() should work', () => {
        afterEach(() => {
            StatusBox.forceHide();
        });

        it('Basic form', (done) => {
            let setParamCalled = false;
            let closeCalled = false;
            rowNumNode.setParam = () => { setParamCalled = true };
            const oldClose = opPanel.close;
            opPanel.close = () => { closeCalled = true };

            const testList = [];

            // Case: valid parameters
            testList.push(() => {
                opPanel._submitForm();
                expect(setParamCalled).to.equal(true);
                expect(closeCalled).to.equal(true);
                setParamCalled = false; // restore
                closeCalled = false; // restore
                return PromiseHelper.resolve();
            });

            // Case: invalid parameters
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                opPanel._dataModel.setDestColumn('');
                opPanel._updateUI();
                setTimeout(() => {
                    opPanel._submitForm();
                    expect(setParamCalled).to.equal(false);
                    expect(closeCalled).to.equal(false);
                    setParamCalled = false; // restore
                    closeCalled = false; // restore
                    deferred.resolve();
                }, 1);
                return deferred.promise();
            });

            // Restore the form
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                opPanel.close = oldClose;
                opPanel._dataModel.setDestColumn('rowNumColumn');
                opPanel._updateUI();
                setTimeout(() => {
                    deferred.resolve();
                }, 1);
                return deferred.promise();
            });

            PromiseHelper.chain(testList).always(() => done());
        });

        it('Advanced from', () => {
            const oldValue = JSON.stringify(opPanel._dataModel.toDagInput(), null, 4);
            const oldClose = opPanel.close;
            const oldValidateParam = rowNumNode.validateParam;

            let setParamCalled = false;
            let closeCalled = false;
            rowNumNode.setParam = () => { setParamCalled = true };
            rowNumNode.validateParam = () => null;
            opPanel.close = () => { closeCalled = true };
            opPanel._switchMode(true);
            opPanel._updateMode(true);

            // Case: valid input
            opPanel._submitForm();
            expect(setParamCalled).to.equal(true);
            expect(closeCalled).to.equal(true);
            setParamCalled = false; // restore
            closeCalled = false; // restore

            // Case: invalid input
            opPanel._editor.setValue('{}');
            opPanel._submitForm();
            expect(setParamCalled).to.equal(false);
            expect(closeCalled).to.equal(false);
            setParamCalled = false; // restore
            closeCalled = false; // restore

            // Restore
            rowNumNode.validateParam = oldValidateParam;
            opPanel.close = oldClose;
            opPanel._editor.setValue(oldValue);
            opPanel._switchMode(false);
            opPanel._updateMode(false);
        });
    });

    after(() => {
       opPanel.close();
    })

    function genProgCols(colPrefix, count, columnType) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, columnType);
        }
        return cols;
    }
});