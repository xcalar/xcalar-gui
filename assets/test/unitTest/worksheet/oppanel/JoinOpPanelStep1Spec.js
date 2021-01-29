describe('JoinOpPanelStep1 Test', () => {
    let component;
    before(() => {
        component = new JoinOpPanelStep1({
            container: cloneContainer()
        });
    });

    describe('constructor() should work', () => {
        it('test', () => {
            expect(component._$elem.length).to.gt(0);
            expect(component._$elemInstr.length).to.gt(0);
            expect(component._$elemPreview.length).to.gt(0);
            expect(component._componentJoinTypeDropdown != null).to.be.true;
            expect(component._templateMgr._nodeDefMap[JoinOpPanelStep1._templateIdClasue] != null).to.be.true;
            expect(component._templateMgr._nodeDefMap[JoinOpPanelStep1._templateIdCast] != null).to.be.true;
            expect(component._componentFactory != null).to.be.true;
        });
    });

    describe('_updateJoinOptionsSection() should work', () => {
        let advancedSection;
        before(() => {
            advancedSection = BaseOpPanel.findXCElement(component._$elem, 'advancedSection');
        });

        it('nullSafe', () => {
            component._modelRef = createDefaultModel();
            const nullSafeCheckbox = BaseOpPanel.findXCElement(
                BaseOpPanel.findXCElement(advancedSection, 'nullSafeOption'),
                'nullSafeCheckbox'
            );

            // Set to true
            component._modelRef.setNullSafe(true);
            component._updateJoinOptionsSection();
            expect(nullSafeCheckbox.hasClass('checked')).to.be.true;

            // Set to false
            component._modelRef.setNullSafe(false);
            component._updateJoinOptionsSection();
            expect(nullSafeCheckbox.hasClass('checked')).to.be.false;
        });
    });

    describe('_updatePreview() should work', () => {
        it('joinType test', () => {
            const cases = [
                { type: JoinOperatorTStr[JoinOperatorT.InnerJoin], expected: JoinTStr.joinTypeInner },
                { type: JoinOperatorTStr[JoinOperatorT.LeftOuterJoin], expected: JoinTStr.joinTypeLeft },
                { type: JoinOperatorTStr[JoinOperatorT.RightOuterJoin], expected: JoinTStr.joinTypeRight },
                { type: JoinOperatorTStr[JoinOperatorT.LeftSemiJoin], expected: JoinTStr.joinTypeLeftSemi },
                { type: JoinOperatorTStr[JoinOperatorT.LeftAntiJoin], expected: JoinTStr.joinTypeLeftAnti },
                { type: JoinOperatorTStr[JoinOperatorT.CrossJoin], expected: JoinTStr.joinTypeCross },
            ];
            for (const { type, expected } of cases) {
                component._modelRef.setJoinType(type);
                component._updatePreview();
                expect(component._$elemPreview.html().indexOf(expected), type).to.gt(0);
            }
        });

        it('join on clauses test', () => {
            const cases = [
                { type: JoinOperatorTStr[JoinOperatorT.InnerJoin], expected: true },
                { type: JoinOperatorTStr[JoinOperatorT.LeftOuterJoin], expected: true },
                { type: JoinOperatorTStr[JoinOperatorT.RightOuterJoin], expected: true },
                { type: JoinOperatorTStr[JoinOperatorT.LeftSemiJoin], expected: true },
                { type: JoinOperatorTStr[JoinOperatorT.LeftAntiJoin], expected: true },
                { type: JoinOperatorTStr[JoinOperatorT.CrossJoin], expected: false },
            ];
            for (const { type, expected } of cases) {
                component._modelRef.setJoinType(type);
                component._updatePreview();
                expect(
                    component._$elemPreview.html().indexOf('>ON <') > 0,
                    type
                ).to.equal(expected);
            }
        });

        it('Eval string test', () => {
            const expectedString = '>WHERE <';
            // Empty eval string, no show
            component._modelRef.setEvalString('');
            component._updatePreview();
            expect(component._$elemPreview.html().indexOf(expectedString)).to.equal(-1);
            // Normal eval string, show
            component._modelRef.setEvalString('test eval string');
            component._updatePreview();
            expect(component._$elemPreview.html().indexOf(expectedString)).to.gt(0);
        });
    });

    describe('_updateJoinClauseUI() should work', () => {
        it('column dropdowns', () => {
            const oldFunc = component._createColumnHintDropdown;
            const dropdownCount = { left: 0, right: 0 };
            component._createColumnHintDropdown = (props) => {
                const { isLeft } = props;
                if (isLeft) {
                    dropdownCount.left ++;
                } else {
                    dropdownCount.right ++;
                }
                return [];
            };

            component._updateJoinClauseUI();
            expect(dropdownCount.left).to.equal(2);
            expect(dropdownCount.right).to.equal(2);

            component._createColumnHintDropdown = oldFunc;
        });

        it('type cast', () => {
            const oldFunc = component._createTypeCastDropdown;
            const dropdownCount = { left: 0, right: 0 };
            component._createTypeCastDropdown = (props) => {
                const { isLeft } = props;
                if (isLeft) {
                    dropdownCount.left ++;
                } else {
                    dropdownCount.right ++;
                }
                return [];
            }

            component._modelRef.setNoCast(false);
            component._modelRef.modifyColumnPairCast(0, { left: ColumnType.float });
            component._updateJoinClauseUI();
            expect(dropdownCount.left).to.equal(1);
            expect(dropdownCount.right).to.equal(1);

            // Restore
            component._modelRef.setNoCast(true);
            component._modelRef.modifyColumnPairCast(0, { left: ColumnType.string });
            component._createTypeCastDropdown = oldFunc;
        });
    });

    describe('_createColumnHintDropdown() should work', () => {
        it('component properties test', () => {
            const oldFunc = component._componentFactory.createHintDropdown;
            let compProps;
            component._componentFactory.createHintDropdown = (props) => {
                compProps = props;
            }

            component._createColumnHintDropdown({
                colNames: ['col1', 'col2'], colTypes: [ColumnType.float, ColumnType.float],
                colSelected: 'col2', pairIndex: 1, isLeft: true,
                smartSuggestParam: {}
            });
            expect(compProps.inputVal).to.equal('col2');
            expect(compProps.menuList.length).to.equal(2);

            component._componentFactory.createHintDropdown = oldFunc;
        });

        it('events test', () => {
            const oldCreateFunc = component._componentFactory.createHintDropdown;
            let onChangeHandler;
            component._componentFactory.createHintDropdown = (props) => {
                onChangeHandler = props.onDataChange;
            };

            const oldOnDataChange = component._onDataChange;
            component._onDataChange = () => {};

            const oldmodifyColumnPair = component._modifyColumnPair;
            let testChangeData = {};
            component._modifyColumnPair = (isLeft, pairIndex, colName) => {
                testChangeData.isLeft = isLeft;
                testChangeData.pairIndex = pairIndex;
                testChangeData.colName = colName;
            }

            component._createColumnHintDropdown({
                colNames: ['col1', 'col2'], colTypes: [ColumnType.float, ColumnType.float],
                colSelected: 'col2', pairIndex: 1, isLeft: true,
                smartSuggestParam: {}
            });
            onChangeHandler('newName');
            expect(testChangeData).to.deep.equal({
                isLeft: true, pairIndex: 1, colName: 'newName'
            });

            // Restore
            component._componentFactory.createHintDropdown = oldCreateFunc;
            component._onDataChange = oldOnDataChange;
            component._modifyColumnPair = oldmodifyColumnPair;
        });
    });

    describe('_isEnableAddClause() should work', () => {
        afterEach(() => {
            component._modelRef = createDefaultModel();
        });

        it('Case: normal case', () => {
            expect(component._isEnableAddClause()).to.be.true;
        });

        it('Case: No left columns spare', () => {
            const oldList = component._modelRef._columnMeta.left;
            component._modelRef._columnMeta.left = [oldList[0]];
            expect(component._isEnableAddClause()).to.be.false;
        });

        it('Case: No right columns spare', () => {
            const oldList = component._modelRef._columnMeta.right;
            component._modelRef._columnMeta.right = [oldList[0]];
            expect(component._isEnableAddClause()).to.be.false;
        });
    });

    describe('_updateUI() should work', () => {
        afterEach(() => {
            component._modelRef = createDefaultModel();
        });

        it('joinType dropdown', () => {
            const oldFunc = component._componentJoinTypeDropdown.updateUI;
            let dropdownProps;
            component._componentJoinTypeDropdown.updateUI = (props) => {
                dropdownProps = props;
            };

            // Dropdown items
            component._updateUI();
            expect(dropdownProps.menuItems.length).to.equal(8);

            // Disabled for fixed type
            component._modelRef.setFixedType(true);
            component._updateUI();
            expect(dropdownProps.isDisabled).to.be.true;
            component._modelRef.setFixedType(false);

            // Restore
            component._componentJoinTypeDropdown.updateUI = oldFunc;
        });

        it('joinOn sub component', () => {
            const oldFunc = component._updateJoinClauseUI;
            let called = false;
            component._updateJoinClauseUI = () => { called = true; };

            // Normal case
            called = false;
            component._updateUI();
            expect(called).to.be.true;
            
            // Cross join
            called = false;
            component._modelRef.setJoinType(JoinOperatorTStr[JoinOperatorT.CrossJoin]);
            component._updateUI();
            expect(called).to.be.false;

            // Restore
            component._updateJoinClauseUI = oldFunc;
        });

        it('preview sub component', () => {
            let called;
            const oldFunc = component._updatePreview;
            component._updatePreview = () => { called = true; };

            component._updateUI();
            expect(called).to.be.true;

            // Restore
            component._updatePreview = oldFunc;
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

    function cloneContainer() {
        return $($('#joinOpPanel').html());
    }

    function createDefaultModel() {
        const leftColumns = genProgCols('left::col', 2).concat(genProgCols('lcol', 2));
        const rightColumns = genProgCols('right::col', 2).concat(genProgCols('rcol', 2));
        const config = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: ['left::col#1', 'lcol#1'],
                keepColumns: ['left::col#1', 'lcol#1'],
                rename: []
            },
            right: {
                columns: ['right::col#1', 'rcol#1'],
                keepColumns: ['right::col#1', 'rcol#1'],
                rename: []
            },
            evalString: 'eq(lcol2, 1)',
            keepAllColumns: false,
            nullSafe: false    
        };

        return JoinOpPanelModel.fromDagInput(
            leftColumns, rightColumns, config, '', '', {
                currentStep: 1, isAdvMode: false, isNoCast: true, isFixedType: false
            }
        );
    }
});