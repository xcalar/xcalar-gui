describe('ExplodeOpPanel Test', () => {
    let explodeNode;
    let opPanel;

    before(() => {
        const inputColumns = genProgCols('col', 4, ColumnType.string);
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        explodeNode = {
            getParents: () => ([parentNode]),
            getType: () => (DagNodeType.Explode),
            getParam: () => ({
                eval: [
                    { evalString: 'explodeString(col#1,",")', newField: 'col#1-explode-1' },
                ],
                icv: false
            }),
            getTitle: () => "Node 1",
            getId:() => "Node1",
            validateParam: () => true,
            isConfigured: () => true,
            beErrorState: () => true
        };

        ExplodeOpPanel.Instance.show(explodeNode, {});
        if ($("#explodeOpPanel").find(".advancedEditor").is(":visible")) {
            $("#explodeOpPanel .bottomSection .xc-switch").click();
        }
        opPanel = ExplodeOpPanel.Instance;
    });

    describe('_getArgs() should work', () => {
        it('test return value', () => {
            const args = opPanel._getArgs();

            // 4 sections
            expect(args.length).to.equal(4);

            // section#1: column to explode
            const sourceDropdownProps = args[0];
            expect(sourceDropdownProps.type).to.equal('column');
            expect(sourceDropdownProps.inputVal).to.equal('col#1');
            expect(sourceDropdownProps.menuList.length).to.equal(4);

            // section#2: delimiter
            const delimiterProps = args[1];
            expect(delimiterProps.type).to.equal('string');
            expect(delimiterProps.inputVal).to.equal(',');
            expect(delimiterProps.valueCheck).to.deep.equal({checkType: 'stringNoTrimNoEmptyValue', args: []});

            // section#3: dest column
            const destColProps = args[2];
            expect(destColProps.type).to.equal('string');
            expect(destColProps.inputVal).to.equal('col#1-explode-1');
            expect(destColProps.valueCheck.checkType).to.equal('stringColumnNameNoEmptyPrefixValue');
            expect(destColProps.valueCheck.args()[0].size).to.gt(0);

            // section#4: icv
            const icvProps = args[3];
            expect(icvProps.type).to.equal('boolean');
            expect(icvProps.isChecked).to.equal(false);
        });
    });

    describe('_submitForm() should work', () => {
        afterEach(() => {
            StatusBox.forceHide();
        });

        it('Basic form', (done) => {
            let setParamCalled = false;
            let closeCalled = false;
            explodeNode.setParam = () => { setParamCalled = true };
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

            // Case: valid parameters - space as delimiter
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                opPanel._dataModel.setDelimiter(' ');
                opPanel._updateUI();
                setTimeout(() => {
                    opPanel._submitForm();
                    expect(setParamCalled).to.equal(true);
                    expect(closeCalled).to.equal(true);
                    setParamCalled = false; // restore
                    closeCalled = false; // restore
                    deferred.resolve();
                }, 0);
                return deferred.promise();
            });

            // Case: invalid parameters
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                opPanel._dataModel.setDelimiter('');
                opPanel._updateUI();
                setTimeout(() => {
                    opPanel._submitForm();
                    expect(setParamCalled).to.equal(false);
                    expect(closeCalled).to.equal(false);
                    setParamCalled = false; // restore
                    closeCalled = false; // restore
                    deferred.resolve();
                }, 0);
                return deferred.promise();
            });

            // Restore the form
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                opPanel.close = oldClose;
                opPanel._dataModel.setDelimiter(',');
                opPanel._updateUI();
                setTimeout(() => {
                    deferred.resolve();
                }, 0);
                return deferred.promise();
            });

            PromiseHelper.chain(testList).always(() => done());
        });

        it('Advanced from', () => {
            const oldValue = JSON.stringify(opPanel._dataModel.toDagInput(), null, 4);
            const oldClose = opPanel.close;
            const oldValidateParam = explodeNode.validateParam;

            let setParamCalled = false;
            let closeCalled = false;
            explodeNode.setParam = () => { setParamCalled = true };
            explodeNode.validateParam = () => null;
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
            explodeNode.validateParam = oldValidateParam;
            opPanel.close = oldClose;
            opPanel._editor.setValue(oldValue);
            opPanel._switchMode(false);
            opPanel._updateMode(false);
        });
    });

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