describe('RoundOpPanel Test', () => {
    let roundNode;
    let opPanel;
    let oldGetActiveDag;

    before((done) => {
        const inputColumns = genProgCols('fcol', 5, ColumnType.float).concat(genProgCols('scol', 4, ColumnType.string));
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        roundNode = {
            getParents: () => ([parentNode]),
            getType: () => (DagNodeType.Round),
            getParam: () => ({
                eval: [{
                    evalString: 'round(fcol#1,1)',
                    newField: 'newCol'
                }],
                icv: false
            }),
            getTitle: () => "Node 1",
            validateParam: () => null,
            getId:() => "Node1",
            isConfigured: () => true
        };

        oldGetActiveDag = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => {
                return new DagGraph();
        };

        BaseOpPanel.isLastModeAdvanced = false;

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            RoundOpPanel.Instance.show(roundNode, {});
            if ($("#roundOpPanel").find(".advancedEditor").is(":visible")) {
                $("#roundOpPanel .bottomSection .xc-switch").click();
            }

            opPanel = RoundOpPanel.Instance;
            done();
        });
    });


    after(() => {
        DagViewManager.Instance.getActiveDag = oldGetActiveDag;
    });

    it('_getArgs() should work', () => {
        const args = opPanel._getArgs();

        // 4 sections
        expect(args.length).to.equal(4);

        // section#1: column to round
        const sourceDropdownProps = args[0];
        expect(sourceDropdownProps.type).to.equal('column');
        expect(sourceDropdownProps.inputVal).to.equal('fcol#1');
        expect(sourceDropdownProps.menuList.length).to.equal(5);

        // section#2: number of decimals
        const numDecimalsProps = args[1];
        expect(numDecimalsProps.type).to.equal('number');
        expect(numDecimalsProps.inputVal).to.equal(1);
        expect(numDecimalsProps.valueCheck).to.deep.equal({checkType: 'integerRange', args: [{min:0}]});

        // section#3: dest column
        const destColProps = args[2];
        expect(destColProps.type).to.equal('string');
        expect(destColProps.inputVal).to.equal('newCol');
        expect(destColProps.valueCheck.checkType).to.equal('stringColumnNameNoEmptyPrefixValue');
        expect(destColProps.valueCheck.args()[0].size).to.equal(0);

        // section#4: icv
        const icvProps = args[3];
        expect(icvProps.type).to.equal('boolean');
        expect(icvProps.isChecked).to.equal(false);
    });

    describe('_submitForm() should work', () => {
        after(() => {
            StatusBox.forceHide();
        });

        it('Basic form', (done) => {
            let setParamCalled = false;
            let closeCalled = false;
            roundNode.setParam = () => {
                setParamCalled = true
            };
            const oldClose = opPanel.close;
            opPanel.close = () => { closeCalled = true };

            // Case: valid parameters
            opPanel._submitForm();
            expect(setParamCalled).to.equal(true);
            expect(closeCalled).to.equal(true);
            setParamCalled = false; // restore
            closeCalled = false; // restore

            // Case: invalid parameters
            opPanel._dataModel.setNumDecimals(-1);
            opPanel._updateUI();
            setTimeout(() => {
                opPanel._submitForm();
                expect(setParamCalled).to.equal(false);
                expect(closeCalled).to.equal(false);
                setParamCalled = false; // restore
                closeCalled = false; // restore
            }, 0);

            // Restore the form
            setTimeout(() => {
                opPanel.close = oldClose;
                opPanel._dataModel.setNumDecimals(1);
                opPanel._updateUI();
                done();
            }, 1);
        });

        it('Advanced from', () => {
            const oldValue = JSON.stringify(opPanel._dataModel.toDagInput(), null, 4);
            const oldClose = opPanel.close;
            const oldValidateParam = roundNode.validateParam;

            let setParamCalled = false;
            let closeCalled = false;
            roundNode.setParam = () => { setParamCalled = true };
            roundNode.validateParam = () => null;
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
            roundNode.validateParam = oldValidateParam;
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