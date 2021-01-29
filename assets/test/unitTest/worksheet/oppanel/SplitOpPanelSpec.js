describe('SplitOpPanel Test', () => {
    let splitNode;
    let opPanel;

    before(() => {
        const inputColumns = genProgCols('col', 4, ColumnType.string);
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        splitNode = {
            getParents: () => ([parentNode]),
            getType: () => (DagNodeType.Split),
            getParam: () => ({
                eval: [
                    { evalString: 'cut(col#1,1,",")', newField: 'col#1-split-1' },
                    { evalString: 'cut(col#1,2,",")', newField: 'col#1-split-2' },
                    { evalString: 'cut(col#1,3,",")', newField: 'col#1-split-3' },
                ],
                icv: false
            }),
            getTitle: () => "Node 1",
            validateParam: () => null,
            getId:() => "Node1",
            beErrorState: () => {},
            isConfigured: () => true
        };

        SplitOpPanel.Instance.show(splitNode, {});
        if ($("#splitOpPanel").find(".advancedEditor").is(":visible")) {
            $("#splitOpPanel .bottomSection .xc-switch").click();
        }
        opPanel = SplitOpPanel.Instance;
    });

    describe('_getArgs() should work', () => {
        it('test return value', () => {
            const args = opPanel._getArgs();

            // 7 sections
            expect(args.length).to.equal(7);

            // section#1: column to split
            const sourceDropdownProps = args[0];
            expect(sourceDropdownProps.type).to.equal('column');
            expect(sourceDropdownProps.inputVal).to.equal('col#1');
            expect(sourceDropdownProps.menuList.length).to.equal(4);

            // section#2: delimiter
            const delimiterProps = args[1];
            expect(delimiterProps.type).to.equal('string');
            expect(delimiterProps.inputVal).to.equal(',');
            expect(delimiterProps.valueCheck).to.deep.equal({checkType: 'stringNoTrimNoEmptyValue', args: []});

            // section#3: dest column count
            const destCountProps = args[2];
            expect(destCountProps.type).to.equal('number');
            expect(destCountProps.inputVal).to.equal(3);
            expect(destCountProps.valueCheck).to.deep.equal({checkType: 'integerRange', args: [{ min: 1 }]});

            // // section#4,5,6: dest columns
            for (let i = 1; i <= 3; i ++) {
                const destColProps = args[2 + i];
                expect(destColProps.type).to.equal('string');
                expect(destColProps.inputVal).to.equal(`col#1-split-${i}`);
                expect(destColProps.valueCheck.checkType).to.equal('stringColumnNameNoEmptyValue');
                expect(destColProps.valueCheck.args()[0].size).to.gt(0);
            }

            // section#4: icv
            const icvProps = args[6];
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
            splitNode.setParam = () => { setParamCalled = true };
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
            const oldValidateParam = splitNode.validateParam;

            let setParamCalled = false;
            let closeCalled = false;
            splitNode.setParam = () => { setParamCalled = true };
            splitNode.validateParam = () => null;
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
            splitNode.validateParam = oldValidateParam;
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