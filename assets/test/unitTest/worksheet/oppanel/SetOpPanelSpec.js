describe("SetOpPanel Test", function() {
    let setNode;
    let opPanel;

    before(() => {
        const inputColumns = genProgCols('fcol', 5, ColumnType.float).concat(genProgCols('scol', 4, ColumnType.string));
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        setNode = {
            getParents: () => ([parentNode]),
            getParam: () => ({
                eval: [{
                    evalString: 'set(fcol#1,1)',
                    newField: 'newCol'
                }],
                icv: false,
                columns: []
            }),
            getTitle: () => "Node 1",
            validateNodes: () => null,
            getType: () => DagNodeType.Set,
            getSubType: () => DagNodeSubType.Intersect,
            getId:() => "Node1"
        };
    });

    it('show should work', (done) => {
        opPanel = SetOpPanel.Instance;
        opPanel._updateMode(true);
        DagConfigNodeModal.Instance.show(setNode, null, $(), {});

        // in case or the async call of SetOpPanel.show
        UnitTest.testFinish(() => $("#setOpPanel").is(":visible"))
        .then(() => {
            setTimeout(() => {
                done();
            }, 1000);
        });
    })

    it('close should work', () => {
        opPanel.close();
        expect($("#setOpPanel").is(":visible")).to.equal(false);
    });

    it('_submitForm will not submit with invalid parameters', () => {
        submitCalled = false;
        opPanel.setOpData.submit = () => { submitCalled = true };
        opPanel._submitForm();
        expect(submitCalled).to.equal(false);
    });

    it('refreshColumns should work', () => {
        refreshColumnsCalled = false;
        opPanel.setOpData.refreshColumns = () => { refreshColumnsCalled = true };
        opPanel.refreshColumns();
        expect(refreshColumnsCalled).to.equal(true);
    })

    it('_validate should work', () => {
        opPanel.advancedMode = true;
        opPanel._validate();
    });

    it('_switchMode should work', () => {
        switchModeCalled = false;
        opPanel.setOpData.switchMode = () => { switchModeCalled = true };
        opPanel._switchMode();
        expect(switchModeCalled).to.equal(true);
    })

    it('_restoreBasicModeParams should work', () => {
        restoreBasicModeParamsCalled = false;
        opPanel.setOpData.restoreBasicModeParams = () => { restoreBasicModeParamsCalled = true };
        opPanel._restoreBasicModeParams();
        expect(restoreBasicModeParamsCalled).to.equal(true);
    })

    after(() => {
        StatusBox.forceHide();
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