describe('JoinOpPanel Test', () => {
    let component;
    before((done) => {
        component = JoinOpPanel.Instance;
        UnitTest.testFinish(() => {
            return DagTabManager.Instance._hasSetup;
        })
        .then(() => {
            done();
        });
    });

    describe('show()/close() should work', () => {
        const oldFunc = {};
        const called = {
            _updateColumns: false,
            _updateUI: false,
        };
        before(() => {
            oldFunc._updateColumns = component._updateColumns;
            component._updateColumns = () => {
                called._updateColumns = true;
                return oldFunc._updateColumns.bind(component)();
            };
            oldFunc._updateUI = component._updateUI;
            component._updateUI = () => {
                called._updateUI = true;
                return oldFunc._updateUI.bind(component)();
            };
        });
        after(() => {
            component._updateColumns = oldFunc._updateColumns;
            component._updateUI = oldFunc._updateUI;
        });
        afterEach(() => {
            for (const key of Object.keys(called)) {
                called[key] = false;
            }
        });

        it('show()', () => {
            const node = createDefaultNode();
            component.show(node);
            expect(component._dataModel != null).to.be.true;
            expect(component._dagNode).to.equal(node);
            expect(called._updateColumns).to.be.true;
            expect(called._updateUI).to.be.true;
        });

        it('close()', () => {
            component.close();
            expect(component._dagNode == null).to.be.true;
            expect(component._dataModel == null).to.be.true;
            expect(component._cachedBasicModeParam == null).to.be.true;
        });
    });

    describe('_updateUI() should work', () => {
        const oldFunc = {};
        const called = {
            step1_updateUI: false,
            step2_updateUI: false,
            _updateUINavButtons: false
        };
        before(() => {
            oldFunc.step1_updateUI = component._componentFirstStep.updateUI;
            component._componentFirstStep.updateUI = (props) => {
                called.step1_updateUI = true;
                return oldFunc.step1_updateUI.bind(component._componentFirstStep)(props);
            };
            oldFunc.step2_updateUI = component._componentSecondStep.updateUI;
            component._componentSecondStep.updateUI = (props) => {
                called.step2_updateUI = true;
                return oldFunc.step2_updateUI.bind(component._componentSecondStep)(props);
            };
            oldFunc._updateUINavButtons = component._updateUINavButtons;
            component._updateUINavButtons = () => {
                called._updateUINavButtons = true;
                return oldFunc._updateUINavButtons.bind(component)();
            };
        });
        after(() => {
            component._componentFirstStep.updateUI = oldFunc.step1_updateUI;
            component._componentSecondStep.updateUI = oldFunc.step2_updateUI;
            component._updateUINavButtons = oldFunc._updateUINavButtons;
        });
        afterEach(() => {
            for (const key of Object.keys(called)) {
                called[key] = false;
            }
        });

        it('test', () => {
            component._dataModel = createDefaultModel();
            component._updateUI();
            expect(called.step1_updateUI).to.be.true;
            expect(called.step2_updateUI).to.be.true;
            expect(called._updateUINavButtons).to.be.true;
        });
    });

    describe('_updateUINavButtons() should work', () => {
        const oldFunc = {};
        const called = {
            _buildAdvancedButtons: false,
            _buildJoinClauseNavButtons: false,
            _buildRenameNavButtons: false
        };
        before(() => {
            oldFunc._buildAdvancedButtons = component._buildAdvancedButtons;
            component._buildAdvancedButtons = () => {
                called._buildAdvancedButtons = true;
                return oldFunc._buildAdvancedButtons.bind(component)();
            };
            oldFunc._buildJoinClauseNavButtons = component._buildJoinClauseNavButtons;
            component._buildJoinClauseNavButtons = () => {
                called._buildJoinClauseNavButtons = true;
                return oldFunc._buildJoinClauseNavButtons.bind(component)();
            };
            oldFunc._buildRenameNavButtons = component._buildRenameNavButtons;
            component._buildRenameNavButtons = () => {
                called._buildRenameNavButtons = true;
                return oldFunc._buildRenameNavButtons.bind(component)();
            };
        });
        after(() => {
            component._buildAdvancedButtons = oldFunc._buildAdvancedButtons;
            component._buildJoinClauseNavButtons = oldFunc._buildJoinClauseNavButtons;
            component._buildRenameNavButtons = oldFunc._buildRenameNavButtons;
        });
        afterEach(() => {
            for (const key of Object.keys(called)) {
                called[key] = false;
            }
        });

        it('Case: advanced form', () => {
            component._dataModel = createDefaultModel();
            component._dataModel.setAdvMode(true);

            component._updateUINavButtons();
            expect(called._buildAdvancedButtons).to.be.true;
            expect(called._buildJoinClauseNavButtons).to.be.false;
            expect(called._buildRenameNavButtons).to.be.false;
        });

        it('Case: step1', () => {
            component._dataModel = createDefaultModel();
            component._dataModel.setCurrentStep(1);

            component._updateUINavButtons();
            expect(called._buildAdvancedButtons).to.be.false;
            expect(called._buildJoinClauseNavButtons).to.be.true;
            expect(called._buildRenameNavButtons).to.be.false;
        });

        it('Case: step2', () => {
            component._dataModel = createDefaultModel();
            component._dataModel.setCurrentStep(2);

            component._updateUINavButtons();
            expect(called._buildAdvancedButtons).to.be.false;
            expect(called._buildJoinClauseNavButtons).to.be.false;
            expect(called._buildRenameNavButtons).to.be.true;
        });
    });

    describe('_buildAdvancedButtons() should work', () => {
        const oldFunc = {};
        let buttonProps = [];
        before(() => {
            oldFunc._buildNavButton = component._buildNavButton;
            component._buildNavButton = (props) => {
                buttonProps.push(props);
                return oldFunc._buildNavButton.bind(component, props)();
            }
        });
        after(() => {
            component._buildNavButton = oldFunc._buildNavButton;
        });
        afterEach(() => {
            buttonProps = null;
        });

        it('test', () => {
            const advButtons = component._buildAdvancedButtons();
            expect(advButtons != null).to.be.true;
            expect(advButtons.length).to.gt(0);
            // Check save button
            expect(buttonProps[0] != null).to.be.true;
            expect(buttonProps[0].type).to.equal('submit');
            expect(buttonProps[0].text).to.equal(CommonTxtTstr.Save);
            // preview button
            expect(buttonProps[1] != null).to.be.true;
            expect(buttonProps[1].type).to.equal('preview');
            expect(buttonProps[1].text).to.equal(CommonTxtTstr.Preview);
        });
    });

    describe('_buildRenameNavButtons() should work', () => {
        const oldFunc = {};
        const buttonProps = [];
        before(() => {
            oldFunc._buildNavButton = component._buildNavButton;
            component._buildNavButton = (props) => {
                buttonProps.push(props);
                return oldFunc._buildNavButton.bind(component, props)();
            }
        });
        after(() => {
            component._buildNavButton = oldFunc._buildNavButton;
        });
        afterEach(() => {
            while (buttonProps.length > 0) {
                buttonProps.pop();
            }
        });

        it('test', () => {
            const renameButtons = component._buildRenameNavButtons();
            expect(renameButtons != null).to.be.true;
            expect(renameButtons.length).to.gt(0);
            // Check save button
            const saveProps = buttonProps[0];
            expect(saveProps != null).to.be.true;
            expect(saveProps.type).to.equal('submit');
            expect(saveProps.disabled).to.be.false;
            expect(saveProps.text).to.equal(CommonTxtTstr.Save);
            // Check back button
            const backProps = buttonProps[2];
            expect(backProps != null).to.be.true;
            expect(backProps.type).to.equal('back');
            expect(backProps.text).to.equal(CommonTxtTstr.Back);
        });
    });

    describe('_buildJoinClauseNavButtons() should work', () => {
        const oldFunc = {};
        let buttonProps = null;
        before(() => {
            oldFunc._buildNavButton = component._buildNavButton;
            component._buildNavButton = (props) => {
                buttonProps = props;
                return oldFunc._buildNavButton.bind(component, props)();
            }
            oldFunc._isEnableNextToRename = component._isEnableNextToRename;
            component._isEnableNextToRename = () => true;
        });
        after(() => {
            component._buildNavButton = oldFunc._buildNavButton;
            component._isEnableNextToRename = oldFunc._isEnableNextToRename;
        });
        afterEach(() => {
            buttonProps = null;
        });

        it('test', () => {
            expect(component._buildJoinClauseNavButtons() != null).to.be.true;
            expect(buttonProps != null).to.be.true;
            expect(buttonProps.type).to.equal('next');
            expect(buttonProps.disabled).to.be.false;
            expect(buttonProps.text).to.equal(CommonTxtTstr.Next);
        });
    });

    describe('_buildNavButton() should work', () => {
        const oldFunc = {};
        const elemProps = new Map();
        before(() => {
            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                elemProps.set(id, props);
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }
        });
        after(() => {
            component._templateMgr.createElements = oldFunc.createElements;
        });
        afterEach(() => {
            elemProps.clear();
        });

        it('Case: button enabled', () => {
            expect(component._buildNavButton({
                type: 'next', disabled: false, text: 'NextButton'
            }) != null).to.be.true;
            // Check props sent to component engine
            const props = elemProps.get(JoinOpPanel._templateIDs.navButton);
            expect(props != null).to.be.true;
            expect(props.cssType).to.equal('btn-next');
            expect(props.cssDisabled).to.equal('');
            expect(props.btnText).to.equal('NextButton');
        });

        it('Case: button disabled', () => {
            expect(component._buildNavButton({
                type: 'next', disabled: true, text: 'NextButton'
            }) != null).to.be.true;
            // Check props sent to component engine
            const props = elemProps.get(JoinOpPanel._templateIDs.navButton);
            expect(props != null).to.be.true;
            expect(props.cssType).to.equal('btn-next');
            expect(props.cssDisabled).to.equal('btn-disabled');
            expect(props.btnText).to.equal('NextButton');
        });
    });

    describe('_switchMode() should work', () => {
        const oldFunc = {};
        const called = {
            _updateUI: false,
        };
        before(() => {
            oldFunc._updateUI = component._updateUI;
            component._updateUI = () => {
                called._updateUI = true;
                return oldFunc._updateUI.bind(component)();
            };
        });
        after(() => {
            component._updateUI = oldFunc._updateUI;
        });
        afterEach(() => {
            for (const key of Object.keys(called)) {
                called[key] = false;
            }
        });

        it('Case: to advanced form', () => {
            component._dataModel = createDefaultModel();
            const ret = component._switchMode(true);
            expect(ret == null).to.be.true;
            expect(called._updateUI).to.be.true;
            expect(component._editor.getValue()).to.equal(JSON.stringify(component._dataModel.toDag(), null, 4));
        });

        it('Case: to basic form', () => {
            component._dataModel = createDefaultModel();
            component._dagNode = createDefaultNode();
            component._dagNode.validateParam = () => null;
            component._cachedBasicModeParam = null;

            const ret = component._switchMode(false);
            expect(ret == null).to.be.true;
            expect(called._updateUI).to.be.true;
            expect(component._dataModel.toDag()).to.deep.equal(JSON.parse(component._editor.getValue()));
        });
    });

    describe('_validateJoinClauses() should work', () => {
        it('Case: invalid eval string', () => {
            const model = createDefaultModel();
            model.setEvalString('abc');

            let error = null;
            try {
                component._validateJoinClauses(model);
            } catch(e) {
                error = e;
            }

            expect(error != null).to.be.true;
            expect(error.message).to.equal(JoinOpError.InvalidEvalString);
        });

        it('Case: No join on clause', () => {
            const model = createDefaultModel();
            while (model.getColumnPairsLength() > 0) {
                model.removeColumnPair(0);
            }

            let error = null;
            try {
                component._validateJoinClauses(model);
            } catch(e) {
                error = e;
            }

            expect(error != null).to.be.true;
            expect(error.message).to.equal(JoinOpError.InvalidJoinClause);
        });
    });

    describe('_validateRenames() should work', () => {
        it('Case: dup prefix', () => {
            const model = createDefaultModel(true, false);
            let error = null;
            try {
                component._validateRenames(model);
            } catch(e) {
                error = e;
            }

            expect(error == null).to.be.true;
            // Should not have any errors because dups will be auto renamed
        });

        it('Case: dup derived', () => {
            const model = createDefaultModel(false, true);
            let error = null;
            try {
                component._validateRenames(model);
            } catch(e) {
                error = e;
            }

            expect(error == null).to.be.true;
            // Should not have any errors because dups will be auto renamed
        });

        it('Case: invalid prefix name', () => {
            const model = createDefaultModel(false, false);
            model._buildRenameInfo({
                colDestLeft: {}, colDestRight: {},
                prefixDestLeft: {'left': 'left--new'}, prefixDestRight: {}
            });

            let error = null;
            try {
                component._validateRenames(model);
            } catch(e) {
                error = e;
            }

            expect(error != null).to.be.true;
            expect(error.message).to.equal(ErrTStr.PrefixNoDoubleHyphen);
        });

        it('Case: invalid derived name', () => {
            const model = createDefaultModel(false, false);
            model._buildRenameInfo({
                colDestLeft: {'lcol#1': 'lcol--new'}, colDestRight: {},
                prefixDestLeft: {}, prefixDestRight: {}
            });

            let error = null;
            try {
                component._validateRenames(model);
            } catch(e) {
                error = e;
            }

            expect(error != null).to.be.true;
            console.log(error.message);
            expect(error.message).to.equal(xcStringHelper.replaceMsg(ErrWRepTStr.PreservedString, {
                "char": '--'
            }));
        })
    });

    describe('_getErrorMessage() should work', () => {
        const errorMapping = {};
        before(() => {
            errorMapping[JoinOpError.ColumnTypeLenMismatch] = JoinTStr.InvalidClause;
            errorMapping[JoinOpError.InvalidJoinClause] = JoinTStr.InvalidClause;
            errorMapping[JoinOpError.ColumnNameConflict] = ErrTStr.ColumnConflict2;
            errorMapping[JoinOpError.InvalidEvalString] = ErrTStr.InvalidEvalStr;
            errorMapping[JoinOpError.NeedTypeCast] = JoinTStr.TypeMistch;
            errorMapping[JoinOpError.PrefixConflict] = ErrTStr.PrefixConflict;
            errorMapping[JoinOpError.InvalidJoinType] = JoinTStr.InvalidJoinType;
        });

        it('Case: pre-defined errors', () => {
            for (const error of Object.keys(errorMapping)) {
                const expectText = errorMapping[error];
                expect(component._getErrorMessage(new Error(error)), error).to.equal(expectText);
            }
        });

        it('Case: un-defined error', () => {
            const error = 'Some Random Errors';
            expect(component._getErrorMessage(new Error(error))).to.equal(error);
        });

        it('Case: invalid error format', () => {
            expect(component._getErrorMessage(null)).to.equal('');
            expect(component._getErrorMessage({})).to.equal('');
        })
    });

    describe('_updateColumns() should work', () => {
        it('test', () => {
            component._dagNode = createDefaultNode();
            component._updateColumns();
            expect(component.allColumns.length).to.equal(10);
            expect((new Set(component.allColumns.map((v) => v.getBackColName()))).size).to.equal(10);
        });
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

    function createDefaultModel(hasDupPrefix = false, hasDupDerived = false) {
        const { leftColumns, rightColumns } = createDefaultColumns();
        const config = createDefaultConfig(hasDupPrefix, hasDupDerived);
        return JoinOpPanelModel.fromDagInput(
            leftColumns, rightColumns, config, '', '', {
                currentStep: 1, isAdvMode: false, isNoCast: true, isFixedType: false
            }
        );
    }

    function createDefaultColumns() {
        const leftColumns = genProgCols('left::col', 2).concat(genProgCols('lcol', 2))
            .concat(genProgCols('prefix::col', 1)).concat(genProgCols('col', 1));
        const rightColumns = genProgCols('right::col', 2).concat(genProgCols('rcol', 2))
            .concat(genProgCols('prefix::col', 1)).concat(genProgCols('col', 1));
        return { leftColumns: leftColumns, rightColumns: rightColumns };
    }

    function createDefaultConfig(hasDupPrefix = false, hasDupDerived = false) {
        const leftKeepColumns = ['left::col#1', 'lcol#1'];
        const rightKeepColumns = ['right::col#1', 'rcol#1'];
        if (hasDupPrefix) {
            leftKeepColumns.push('prefix::col#1');
            rightKeepColumns.push('prefix::col#1');
        }
        if (hasDupDerived) {
            leftKeepColumns.push('col#1');
            rightKeepColumns.push('col#1');
        }
        const config = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: ['left::col#1', 'lcol#1'],
                keepColumns: leftKeepColumns,
                rename: []
            },
            right: {
                columns: ['right::col#1', 'rcol#1'],
                keepColumns: rightKeepColumns,
                rename: []
            },
            evalString: 'eq(lcol2, 1)',
            keepAllColumns: false,
            nullSafe: false
        };
        return config;
    }

    function createDefaultNode() {
        const node = new DagNodeJoin();
        const { leftColumns, rightColumns } = createDefaultColumns();

        node.input = createDefaultConfig();
        node.parents = [
            {
                getLineage: () => ({ getColumns: () => leftColumns }),
                getTable: () => 'leftTable'
            },
            {
                getLineage: () => ({ getColumns: () => rightColumns }),
                getTable: () => 'rightTable'
            }
        ];
        return node;
    }
});