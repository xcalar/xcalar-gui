describe('JoinOpPanelStep2 Test', () => {
    let component;
    before(() => {
        component = new JoinOpPanelStep2({
            container: cloneContainer()
        });
    });

    describe('constructor() should work', () => {
        it('test', () => {
            expect(component._$elem.length).to.gt(0);
            const templateIds = JoinOpPanelStep2._templateIds;
            for (const templateName of Object.keys(templateIds)) {
                expect(component._templateMgr._nodeDefMap[templateIds[templateName]] != null, templateName).to.be.true;
            }
            expect(component._componentFactory != null).to.be.true;
        });
    });

    describe('updateUI() should work', () => {
        const oldFunc = {};
        const called = {
            _updateUI: false,
        };
        before(() => {
            oldFunc._updateUI = component._updateUI;
            component._updateUI = () => {
                called._updateUI = true;
            };
        });
        after(() => {
            component._updateUI = oldFunc._updateUI;
        });
        afterEach(() => {
            called._updateUI = false;
        });

        it('test', () => {
            const dataModel = createDefaultModel();
            component.updateUI({
                modelRef: dataModel,
                onDataChange: 'onDataChange',
                onError: 'onError'
            });
            expect(component._modelRef).to.equal(dataModel);
            expect(component._onDataChange).to.equal('onDataChange');
            expect(component._onError).to.equal('onError');
            expect(called._updateUI).to.equal(true);
        });
    });

    describe('_updateUI() should work', () => {
        const oldFunc = {};
        const called = {
            _createColumnSelectSection: false,
            _createColumnRenameSection: false
        };
        before(() => {
            oldFunc._createColumnSelectSection = component._createColumnSelectSection;
            component._createColumnSelectSection = () => {
                called._createColumnSelectSection = true;
                return [$('<div></div>')[0]];
            };
            oldFunc._createColumnRenameSection = component._createColumnRenameSection;
            component._createColumnRenameSection = () => {
                called._createColumnRenameSection = true;
                return [$('<div></div>')[0]];
            };
        });
        after(() => {
            component._createColumnSelectSection = oldFunc._createColumnSelectSection;
            component._createColumnRenameSection = oldFunc._createColumnRenameSection;
        });
        afterEach(() => {
            called._createColumnSelectSection = false;
            called._createColumnRenameSection = false;
        });

        it('Case: current != 2', () => {
            component._modelRef = createDefaultModel();
            component._modelRef.setCurrentStep(1);
            component._updateUI();
            // Nothing should happen
            expect(called._createColumnSelectSection).to.be.false;
            expect(called._createColumnRenameSection).to.be.false;
        });

        it('Case: advanced form', () => {
            component._modelRef = createDefaultModel();
            component._modelRef.setAdvMode(true);
            component._updateUI();
            // Nothing should happen
            expect(called._createColumnSelectSection).to.be.false;
            expect(called._createColumnRenameSection).to.be.false;
        });

        it('Case: normal case', () => {
            component._modelRef = createDefaultModel();
            component._modelRef.setCurrentStep(2);
            component._modelRef.setAdvMode(false);
            component._updateUI();
            // DOM should be re-build
            expect(called._createColumnSelectSection).to.be.true;
            expect(called._createColumnRenameSection).to.be.true;
        });
    });

    describe('_createPrefixRenameTable() should work', () => {
        const oldFunc = {};
        let elemProps = new Map();
        let createRenameListProps = [];
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                if (!elemProps.has(id)) {
                    elemProps.set(id, []);
                }
                elemProps.get(id).push(props);
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }

            oldFunc._createRenameList = component._createRenameList;
            component._createRenameList = (props) => {
                createRenameListProps.push(props);
                return null;
            }
        });
        after(() => {
            component._templateMgr.createElements = oldFunc.createElements;
            component._createRenameList = oldFunc._createRenameList;
        });
        afterEach(() => {
            while (createRenameListProps.length > 0) {
                createRenameListProps.pop();
            }
            elemProps.clear();
        });

        it('test', () => {
            expect(component._createPrefixRenameTable(new Set(), new Set()) != null).to.be.true;
            // Left prefix
            const leftProps = createRenameListProps[0];
            expect(leftProps != null).to.be.true;
            expect(leftProps.isLeft).to.equal(true);
            expect(leftProps.isPrefix).to.equal(true);
            expect(leftProps.renameInfoList.length).to.equal(1);
            expect(leftProps.collisionNames.size).to.equal(0);
            // Right prefix
            const rightProps = createRenameListProps[1];
            expect(rightProps != null).to.be.true;
            expect(rightProps.isLeft).to.equal(false);
            expect(rightProps.isPrefix).to.equal(true);
            expect(rightProps.renameInfoList.length).to.equal(1);
            expect(rightProps.collisionNames.size).to.equal(0);
            // Table props
            const tableProps = elemProps.get(JoinOpPanelStep2._templateIds.renameTable);
            expect(tableProps != null).to.be.true;
            expect(tableProps[0].renameHeader).to.equal(OpPanelTStr.JoinPanelRenameTitlePrefix);
        });
    });

    describe('_createDerivedRenameTable() should work', () => {
        const oldFunc = {};
        let elemProps = new Map();
        let createRenameListProps = [];
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                if (!elemProps.has(id)) {
                    elemProps.set(id, []);
                }
                elemProps.get(id).push(props);
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }

            oldFunc._createRenameList = component._createRenameList;
            component._createRenameList = (props) => {
                createRenameListProps.push(props);
                return null;
            }
        });
        after(() => {
            component._templateMgr.createElements = oldFunc.createElements;
            component._createRenameList = oldFunc._createRenameList;
        });
        afterEach(() => {
            while (createRenameListProps.length > 0) {
                createRenameListProps.pop();
            }
            elemProps.clear();
        });

        it('test', () => {
            expect(component._createDerivedRenameTable(new Set(), new Set()) != null).to.be.true;
            // Left prefix
            const leftProps = createRenameListProps[0];
            expect(leftProps != null).to.be.true;
            expect(leftProps.isLeft).to.equal(true);
            expect(leftProps.isPrefix).to.equal(false);
            expect(leftProps.renameInfoList.length).to.equal(1);
            expect(leftProps.collisionNames.size).to.equal(0);
            // Right prefix
            const rightProps = createRenameListProps[1];
            expect(rightProps != null).to.be.true;
            expect(rightProps.isLeft).to.equal(false);
            expect(rightProps.isPrefix).to.equal(false);
            expect(rightProps.renameInfoList.length).to.equal(1);
            expect(rightProps.collisionNames.size).to.equal(0);
            // Table props
            const tableProps = elemProps.get(JoinOpPanelStep2._templateIds.renameTable);
            expect(tableProps != null).to.be.true;
            expect(tableProps[0].renameHeader).to.equal("");
        });

    });

    describe('_createColumnRenameSection() should work', () => {
        const oldFunc = {};
        let elemProps = new Map();
        let prefixCollisionLeft;
        let prefixCollisionRight;
        let derivedCollisionLeft;
        let derivedCollisionRight;
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                if (!elemProps.has(id)) {
                    elemProps.set(id, []);
                }
                elemProps.get(id).push(props);
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }

            oldFunc._createPrefixRenameTable = component._createPrefixRenameTable;
            component._createPrefixRenameTable = (prefixLeft, prefixRight) => {
                prefixCollisionLeft = prefixLeft;
                prefixCollisionRight = prefixRight;
                return [$('<div></div>')[0]];
            };
            oldFunc._createDerivedRenameTable = component._createDerivedRenameTable;
            component._createDerivedRenameTable = (derivedLeft, derivedRight) => {
                derivedCollisionLeft = derivedLeft;
                derivedCollisionRight = derivedRight;
                return [$('<div></div>')[0]];
            };
        });
        after(() => {
            component._templateMgr.createElements = oldFunc.createElements;
            component._createPrefixRenameTable = oldFunc._createPrefixRenameTable;
            component._createDerivedRenameTable = oldFunc._createDerivedRenameTable;
        });
        afterEach(() => {
            component._modelRef._buildRenameInfo({
                colDestLeft: {},
                prefixDestLeft: {},
                colDestRight: {},
                prefixDestRight: {}
            })
            prefixCollisionLeft = null;
            prefixCollisionRight = null;
            derivedCollisionLeft = null;
            derivedCollisionRight = null;
            elemProps.clear();
        });

        it('case: no collision', () => {
            // We don't have collisions(on dest name) after auto-renaming
            expect(component._createColumnRenameSection() != null).to.be.true;
            // Check prefix rename props
            expect(prefixCollisionLeft != null).to.be.true;
            expect(prefixCollisionLeft.size).to.equal(0);
            expect(prefixCollisionRight != null).to.be.true;
            expect(prefixCollisionRight.size).to.equal(0);
            // Check derived rename props
            expect(derivedCollisionLeft != null).to.be.true;
            expect(derivedCollisionLeft.size).to.equal(0);
            expect(derivedCollisionRight != null).to.be.true;
            expect(derivedCollisionRight.size).to.equal(0);
            // Check rename section props
            const sectionProps = elemProps.get(JoinOpPanelStep2._templateIds.renameSection);
            expect(sectionProps != null).to.be.true;
            expect(sectionProps[0]['APP-PREFIXRENAME'] != null).to.be.true;
            expect(sectionProps[0]['APP-DERIVEDRENAME'] != null).to.be.true;
        });

        it('case: name collision between tables', () => {
            // Revert the auto-rename, so that we have collisions on:
            // prefix: prefix
            // derived: col#1
            component._modelRef._columnRename.left.forEach((renameInfo) => {
                renameInfo.dest = renameInfo.source;
            });
            component._modelRef._columnRename.right.forEach((renameInfo) => {
                renameInfo.dest = renameInfo.source;
            });
            expect(component._createColumnRenameSection() != null).to.be.true;
            // Check prefix rename props
            expect(prefixCollisionLeft != null).to.be.true;
            expect(prefixCollisionLeft.size).to.equal(1); // prefix
            expect(prefixCollisionRight != null).to.be.true;
            expect(prefixCollisionRight.size).to.equal(1);// col#1
            // Check derived rename props
            expect(derivedCollisionLeft != null).to.be.true;
            expect(derivedCollisionLeft.size).to.equal(1); // prefix
            expect(derivedCollisionRight != null).to.be.true; // col#1
            expect(derivedCollisionRight.size).to.equal(1);
            // Check rename section props
            const sectionProps = elemProps.get(JoinOpPanelStep2._templateIds.renameSection);
            expect(sectionProps != null).to.be.true;
            expect(sectionProps[0]['APP-PREFIXRENAME'] != null).to.be.true;
            expect(sectionProps[0]['APP-DERIVEDRENAME'] != null).to.be.true;
        });

        it('case: name collision in a table', () => {
            // Create collisions in left table, so that we have collisions on:
            // prefix: left, prefix
            // derived: lcol#1, col#1
            component._modelRef._columnRename.left.forEach((renameInfo) => {
                if (renameInfo.isPrefix) {
                    renameInfo.dest = 'left';
                } else {
                    renameInfo.dest = 'lcol#1';
                }
            });
            expect(component._createColumnRenameSection() != null).to.be.true;
            // Check prefix rename props
            expect(prefixCollisionLeft != null).to.be.true;
            expect(prefixCollisionLeft.size).to.equal(2);
            expect(prefixCollisionRight != null).to.be.true;
            expect(prefixCollisionRight.size).to.equal(0);
            // Check derived rename props
            expect(derivedCollisionLeft != null).to.be.true;
            expect(derivedCollisionLeft.size).to.equal(2);
            expect(derivedCollisionRight != null).to.be.true;
            expect(derivedCollisionRight.size).to.equal(0);
            // Check rename section props
            const sectionProps = elemProps.get(JoinOpPanelStep2._templateIds.renameSection);
            expect(sectionProps != null).to.be.true;
            expect(sectionProps[0]['APP-PREFIXRENAME'] != null).to.be.true;
            expect(sectionProps[0]['APP-DERIVEDRENAME'] != null).to.be.true;
        });
    });

    describe('_createRenameList() should work', () => {
        const oldFunc = {};
        let elemProps = new Map();
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                if (!elemProps.has(id)) {
                    elemProps.set(id, []);
                }
                elemProps.get(id).push(props);
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }
        });
        after(() => {
            component._templateMgr.createElements = oldFunc.createElements;
        });
        afterEach(() => {
            elemProps.clear();
        });

        it('Case: prefixed', () => {
            const prefixedList = component._modelRef.getRenames({
                isLeft: true, isPrefix: true
            });
            // The List element shoudld not be null
            expect(component._createRenameList({
                isLeft: true, isPrefix: true,
                renameInfoList: prefixedList,
                collisionNames: new Set()
            }) != null).to.be.true;
            // Check what's in the rename list
            const rowProps = elemProps.get(JoinOpPanelStep2._templateIds.renameRow);
            expect(rowProps != null).to.be.true;
            expect(rowProps.length).to.equal(1);
            expect(rowProps[0].oldName).to.equal('prefix');
            // Check table element props
            const tableProps = elemProps.get(JoinOpPanelStep2._templateIds.renameList);
            expect(tableProps != null).to.be.true;
            expect(tableProps[0].oldColTitle).to.equal(OpPanelTStr.JoinPanelRenameColOldLeft);
            expect(tableProps[0].newColTitle).to.equal(OpPanelTStr.JoinPanelRenameColNew);
            expect(tableProps[0]['APP-RENAMES'] != null).to.be.true;
        });

        it('Case: derived', () => {
            const derivedList = component._modelRef.getRenames({
                isLeft: true, isPrefix: false
            });
            // The List element shoudld not be null
            expect(component._createRenameList({
                isLeft: true, isPrefix: false,
                renameInfoList: derivedList,
                collisionNames: new Set()
            }) != null).to.be.true;
            // Check what's in the rename list
            const rowProps = elemProps.get(JoinOpPanelStep2._templateIds.renameRow);
            expect(rowProps != null).to.be.true;
            expect(rowProps.length).to.equal(1);
            expect(rowProps[0].oldName).to.equal('col#1');
            // Check table element props
            const tableProps = elemProps.get(JoinOpPanelStep2._templateIds.renameList);
            expect(tableProps != null).to.be.true;
            expect(tableProps[0].oldColTitle).to.equal(OpPanelTStr.JoinPanelRenameColOldLeft);
            expect(tableProps[0].newColTitle).to.equal(OpPanelTStr.JoinPanelRenameColNew);
            expect(tableProps[0]['APP-RENAMES'] != null).to.be.true;
        });

        it('Case: prefixed with invalid name', () => {
            const prefixedList = [{
                source: 'left', dest: 'left--new', isPrefix: true
            }]
            // The List element shoudld not be null
            expect(component._createRenameList({
                isLeft: true, isPrefix: true,
                renameInfoList: prefixedList,
                collisionNames: new Set()
            }) != null).to.be.true;
            // Check what's in the rename list
            const rowProps = elemProps.get(JoinOpPanelStep2._templateIds.renameRow);
            expect(rowProps != null).to.be.true;
            expect(rowProps.length).to.equal(1);
            expect(rowProps[0]['APP-ERRMSG'] != null).to.be.true;
        });

        it('Case: derived with invalid name', () => {
            const derivedList = [{
                source: 'lcol#1', dest: 'lcol--new', isPrefix: false
            }]
            // The List element shoudld not be null
            expect(component._createRenameList({
                isLeft: true, isPrefix: false,
                renameInfoList: derivedList,
                collisionNames: new Set()
            }) != null).to.be.true;
            // Check what's in the rename list
            const rowProps = elemProps.get(JoinOpPanelStep2._templateIds.renameRow);
            expect(rowProps != null).to.be.true;
            expect(rowProps.length).to.equal(1);
            expect(rowProps[0]['APP-ERRMSG'] != null).to.be.true;
        });
    });

    describe('_createColumnRow() should work', () => {
        let oldCreateElements;
        let elemProps = null;
        before(() => {
            oldCreateElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                elemProps = props;
                return oldCreateElements.bind(component._templateMgr, id, props)();
            }
        });
        after(() => {
            component._templateMgr.createElements = oldCreateElements;
        });
        afterEach(() => {
            elemProps = null;
        });

        it('Case: null props', () => {
            expect(component._createColumnRow(null) == null).to.be.true;
        });

        it('Case: not clickable', () => {
            const props = {
                actionType: 'none',
                columnProps: { colName: 'testColumn', colType: ColumnType.string }
            };
            expect(component._createColumnRow(props) != null).to.be.true;
            expect(elemProps != null).to.be.true;
            expect(elemProps.cssClickable.length).to.equal(0);
            expect(elemProps.cssActionType.length).to.equal(0);
            expect(elemProps.cssColType).to.equal(`type-${ColumnType.string}`);
            expect(elemProps.colType).to.equal(ColumnType.string);
            expect(elemProps.colName).to.equal('testColumn');
        });

        it('Case: clickable(add)', () => {
            const props = {
                actionType: 'add',
                columnProps: { colName: 'testColumn', colType: ColumnType.string }
            };
            expect(component._createColumnRow(props) != null).to.be.true;
            expect(elemProps != null).to.be.true;
            expect(elemProps.cssClickable).to.equal('column-clickable');
            expect(elemProps.cssActionType).to.equal('xi-plus');
            expect(elemProps.cssColType).to.equal(`type-${ColumnType.string}`);
            expect(elemProps.colType).to.equal(ColumnType.string);
            expect(elemProps.colName).to.equal('testColumn');
        });

        it('Case: clickable(remove)', () => {
            const props = {
                actionType: 'remove',
                columnProps: { colName: 'testColumn', colType: ColumnType.string }
            };
            expect(component._createColumnRow(props) != null).to.be.true;
            expect(elemProps != null).to.be.true;
            expect(elemProps.cssClickable).to.equal('column-clickable');
            expect(elemProps.cssActionType).to.equal('xi-close-no-circle');
            expect(elemProps.cssColType).to.equal(`type-${ColumnType.string}`);
            expect(elemProps.colType).to.equal(ColumnType.string);
            expect(elemProps.colName).to.equal('testColumn');
        });
    });

    describe('_createColumnList() should work', () => {
        let oldCreateElements;
        let elemProps = null;
        before(() => {
            oldCreateElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                elemProps = props;
                return oldCreateElements.bind(component._templateMgr, id, props)();
            }
        });
        after(() => {
            component._templateMgr.createElements = oldCreateElements;
        });
        afterEach(() => {
            elemProps = null;
        });

        it('Case: null props', () => {
            expect(component._createColumnList(null) == null).to.be.true;
        });

        it('Case: normal case', () => {
            const props = {
                title: 'testTitle',
                columnList: [1,2,3].map((v) => ({
                    actionType: 'none',
                    columnProps: { colName: `col${v}`, colType: ColumnType.string }
                })),
                cssExtra: 'testCssExtra',
                allColumnAction: {
                    cssActionIcon: 'testCssActionIcon',
                    actionTitle: 'testActionTitle',
                    isDisabled: true,
                }
            };

            expect(component._createColumnList(props) != null).to.be.true;
            expect(elemProps.title).to.equal('testTitle');
            expect(elemProps.cssExtra).to.equal('testCssExtra');
            expect(elemProps.actionTitle).to.equal('testActionTitle');
            expect(elemProps.cssActionDisabled).to.equal('xc-disabled');
            expect(elemProps.cssActionIcon).to.equal('testCssActionIcon');
            expect(elemProps['APP-COLUMNS'].length).to.gt(0);
        });
    });

    describe('_createColumnTable() should work', () => {
        const oldFunc = {};
        const columnListParams = [];
        let elemProps = null;
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc._createColumnList = component._createColumnList;
            component._createColumnList = (props) => {
                columnListParams.push(props);
                return null;
            };

            oldFunc.createElements = component._templateMgr.createElements;
            component._templateMgr.createElements = (id, props) => {
                elemProps = props;
                return oldFunc.createElements.bind(component._templateMgr, id, props)();
            }
        });
        after(() => {
            component._createColumnList = oldFunc._createColumnList;
            component._templateMgr.createElements = oldFunc.createElements;
        });
        afterEach(() => {
            while(columnListParams.length > 0) {
                columnListParams.pop();
            }
            elemProps = null;
        });

        it('Case: Selected columns', () => {
            const props = { isSelected: true };

            expect(component._createColumnTable(props) != null).to.be.true;

            // Verify props to create left columns
            const leftProps = columnListParams[0];
            expect(leftProps != null).to.be.true;
            expect(leftProps.title).to.equal(OpPanelTStr.JoinPanelColumnListTitleLeft);
            expect(leftProps.allColumnAction != null).to.be.true;
            expect(leftProps.allColumnAction.cssActionIcon).to.equal('xi-select-none');
            expect(leftProps.allColumnAction.actionTitle).to.equal(OpPanelTStr.JoinPanelColumnListActionDropAll);
            expect(leftProps.columnList.length).to.equal(4);

            // Verify props to create right columns
            const rightProps = columnListParams[1];
            expect(rightProps != null).to.be.true;
            expect(rightProps.title).to.equal(OpPanelTStr.JoinPanelColumnListTitleRight);
            expect(rightProps.allColumnAction != null).to.be.true;
            expect(rightProps.allColumnAction.cssActionIcon).to.equal('xi-select-none');
            expect(rightProps.allColumnAction.actionTitle).to.equal(OpPanelTStr.JoinPanelColumnListActionDropAll);
            expect(rightProps.columnList.length).to.equal(4);

            // Verify props to create the table
            expect(elemProps != null).to.be.true;
            expect(elemProps.tableTitle).to.equal(OpPanelTStr.JoinPanelColumnTableTitleKeep);
        });

        it('Case: Dropped columns', () => {
            const props = { isSelected: false };

            expect(component._createColumnTable(props) != null).to.be.true;

            // Verify props to create left columns
            const leftProps = columnListParams[0];
            expect(leftProps != null).to.be.true;
            expect(leftProps.title).to.equal(OpPanelTStr.JoinPanelColumnListTitleLeft);
            expect(leftProps.allColumnAction != null).to.be.true;
            expect(leftProps.allColumnAction.cssActionIcon).to.equal('xi-select-all');
            expect(leftProps.allColumnAction.actionTitle).to.equal(OpPanelTStr.JoinPanelColumnListActionKeepAll);
            expect(leftProps.columnList.length).to.equal(2);

            // Verify props to create right columns
            const rightProps = columnListParams[1];
            expect(rightProps != null).to.be.true;
            expect(rightProps.title).to.equal(OpPanelTStr.JoinPanelColumnListTitleRight);
            expect(rightProps.allColumnAction != null).to.be.true;
            expect(rightProps.allColumnAction.cssActionIcon).to.equal('xi-select-all');
            expect(rightProps.allColumnAction.actionTitle).to.equal(OpPanelTStr.JoinPanelColumnListActionKeepAll);
            expect(rightProps.columnList.length).to.equal(2);

            // Verify props to create the table
            expect(elemProps != null).to.be.true;
            expect(elemProps.tableTitle).to.equal(OpPanelTStr.JoinPanelColumnTableTitleDrop);
        });
    });

    describe('_createColumnSelectSection() should work', () => {
        const oldFunc = {};
        const called = { selectedColumns: false, droppedColumns: false };
        before(() => {
            component._modelRef = createDefaultModel();

            oldFunc._createColumnTable = component._createColumnTable;
            component._createColumnTable = ({ isSelected }) => {
                if (isSelected) {
                    called.selectedColumns = true;
                } else {
                    called.droppedColumns = true;
                }
            };
        });
        after(() => {
            component._createColumnTable = oldFunc._createColumnTable;
        });
        afterEach(() => {
            called.selectedColumns = false;
            called.droppedColumns = false;
        });

        it('test', () => {
            expect(component._createColumnSelectSection() != null).to.be.true;
            expect(called.selectedColumns).to.be.true;
            expect(called.droppedColumns).to.be.true;
        });
    });

    describe('data model manupilating functions should work', () => {
        it('_renameColumn()', () => {
            const testRenameInfo = {
                source: 'sourceName', dest: 'destName', isPrefix: false
            };
            component._renameColumn(testRenameInfo, 'newName');
            expect(testRenameInfo).to.deep.equal({
                source: 'sourceName', dest: 'newName', isPrefix: false
            });
        });

        it('_autoRenameColumn()', () => {
            component._modelRef = createDefaultModel();
            const testRenameInfo = {
                source: 'col#1', dest: 'renamed', isPrefix: false
            };
            // Rename list column
            component._autoRenameColumn(testRenameInfo, 'col#1', true);
            expect(testRenameInfo).to.deep.equal({
                source: 'col#1', dest: 'col#1', isPrefix: false
            });
            component._modelRef._columnRename.left[0] = Object.assign({}, testRenameInfo); // mimic renaming the left column
            // Rename right column
            component._autoRenameColumn(testRenameInfo, 'col#1', false);
            expect(testRenameInfo).to.deep.equal({
                source: 'col#1', dest: 'col#11', isPrefix: false
            });
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
        const leftColumns = genProgCols('left::col', 2).concat(genProgCols('lcol', 2))
            .concat(genProgCols('prefix::col', 1)).concat(genProgCols('col', 1));
        const rightColumns = genProgCols('right::col', 2).concat(genProgCols('rcol', 2))
            .concat(genProgCols('prefix::col', 1)).concat(genProgCols('col', 1));
        const config = {
            joinType: JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: {
                columns: ['left::col#1', 'lcol#1'],
                keepColumns: ['left::col#1', 'lcol#1', 'prefix::col#1', 'col#1'],
                rename: []
            },
            right: {
                columns: ['right::col#1', 'rcol#1'],
                keepColumns: ['right::col#1', 'rcol#1', 'prefix::col#1', 'col#1'],
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