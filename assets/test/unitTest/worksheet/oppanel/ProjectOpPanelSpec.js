describe('ProjectOpPanel Test', () => {
    let projectNode;
    let opPanel;
    let $derivedContainer;
    let $prefixedContainer;

    before(() => {
        const inputColumns = genProgCols('myPrefix::col', 5).concat(genProgCols('col', 4));
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        projectNode = {
            getParents: () => ([parentNode]),
            getParam: () => ({ columns: ['myPrefix::col#1', 'col#1'] }),
            getTitle: () => "Node 1",
            getId:() => "Node1",
            validateParam: () => true,
            isConfigured: () => true,
            beErrorState: () => true
        };

        ProjectOpPanel.Instance.show(projectNode, {});
        if ($("#projectOpPanel").find(".advancedEditor").is(":visible")) {
            $("#projectOpPanel .bottomSection .xc-switch").click();
        }
        opPanel = ProjectOpPanel.Instance;
        $derivedContainer = ProjectOpPanel.findXCElement(opPanel._$elemPanel, 'derivedContainer');
        $prefixedContainer = ProjectOpPanel.findXCElement(opPanel._$elemPanel, 'prefixContainer');
    });

    describe('UI elements check', () => {
        it('Derived columns', () => {
            const $selectAllWrap = opPanel._$elemDeriveSelectAllWrap;
            expect($selectAllWrap.find('.checkbox').length).to.equal(1);
            expect($selectAllWrap.find('.checkbox.checked').length).to.equal(0);
            expect($derivedContainer.find('li .checkbox').length).to.equal(4);
            expect($derivedContainer.find('li .checkbox.checked').length).to.equal(1);
        });

        it('Prefixed columns', () => {
            const $selectAllWrap = $prefixedContainer.find('.selectAllWrap');
            const $columnsContainer = ProjectOpPanel.findXCElement($prefixedContainer, 'columnContainer');
            expect($selectAllWrap.find('.checkbox.checked').length).to.equal(1);
            expect($columnsContainer.find('li').length).to.equal(5);
        });
    });

    describe('Function test', () => {
        it('_onDerivedColumnClick', () => {
            // Case: select a column
            opPanel._onDerivedColumnClick(1)();
            expect(opPanel._dataModel.derivedList[1].isSelected).to.equal(true);

            // Case: unselect a column
            opPanel._onDerivedColumnClick(1)();
            expect(opPanel._dataModel.derivedList[1].isSelected).to.equal(false);
        });

        it('_onSelectAllClick', () => {
            // Case: select all
            opPanel._onSelectAllClick()();
            expect(opPanel._dataModel.isAllDerivedSelected).to.equal(true);

            // Case: unselect all
            opPanel._onSelectAllClick()();
            expect(opPanel._dataModel.isAllDerivedSelected).to.equal(false);

            // Restore
            opPanel._onDerivedColumnClick(0)();
        });

        it('_onPrefixSelectClick', () => {
            // Case: unselect a prefix
            opPanel._onPrefixSelectClick(0)();
            expect(opPanel._dataModel.prefixedList[0].isSelected).to.equal(false);

            // Case: select a prefix
            opPanel._onPrefixSelectClick(0)();
            expect(opPanel._dataModel.prefixedList[0].isSelected).to.equal(true);
        });

        describe('_submitForm', () => {
            after(() => {
                StatusBox.forceHide();
            });

            it('Basic form', () => {
                let setParamCalled = false;
                projectNode.setParam = () => { setParamCalled = true };

                // Case: valid parameters
                expect(opPanel._submitForm(projectNode)).to.equal(true);
                expect(setParamCalled).to.equal(true);
                setParamCalled = false; // restore

                // Case: invalid parameters
                opPanel._onDerivedColumnClick(0)(); // Unselect derived columns
                opPanel._onPrefixSelectClick(0)(); // Unselect prefixed columns
                expect(opPanel._submitForm(projectNode)).to.equal(false);
                expect(setParamCalled).to.equal(false);
                setParamCalled = false; // restore
                opPanel._onDerivedColumnClick(0)(); // restore
                opPanel._onPrefixSelectClick(0)(); // restore
            });

            it('Advanced from', () => {
                const oldValue = JSON.stringify(opPanel._dataModel.toDag(), null, 4);
                let setParamCalled = false;
                projectNode.setParam = () => { setParamCalled = true };
                projectNode.validateParam = () => null;
                opPanel._switchMode(true);
                opPanel._updateMode(true);

                // Case: valid input
                expect(opPanel._submitForm(projectNode)).to.equal(true);
                expect(setParamCalled).to.equal(true);
                setParamCalled = false; // restore

                // Case: invalid input
                opPanel._editor.setValue('{}');
                expect(opPanel._submitForm(projectNode)).to.equal(false);
                expect(setParamCalled).to.equal(false);
                setParamCalled = false; // restore

                // Restore
                opPanel._editor.setValue(oldValue);
                opPanel._switchMode(false);
                opPanel._updateMode(false);
                opPanel.close();
            })
        })
    });

    function genProgCols(colPrefix, count) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});