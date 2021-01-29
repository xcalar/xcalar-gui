describe("SqlQueryHistoryPanel Test", function() {
    // let kvMap = {};
    // const keySqlList = 'gSQLQuery-1';
    // const fakeApi = {
    //     getKey: function() {
    //         return  keySqlList;
    //     },
    //     get: function() {
    //         return PromiseHelper.resolve(kvMap[this.key]);
    //     },
    //     put: function(content) {
    //         kvMap[this.key] = content;
    //         return PromiseHelper.resolve();
    //     },
    //     append: function(content) {
    //         const value = kvMap[this.key] || '';
    //         kvMap[this.key] = `${value}${content}`;
    //         return PromiseHelper.resolve();
    //     }
    // };
    // const oldApi = {};
    // const replaceApi = function() {
    //     for (const fname of Object.keys(fakeApi)) {
    //         oldApi[fname] = KVStore.prototype[fname];
    //         KVStore.prototype[fname] = fakeApi[fname];
    //     }
    // }
    // const restoreApi = function() {
    //     for (const fname of Object.keys(oldApi)) {
    //         KVStore.prototype[fname] = oldApi[fname];
    //     }
    // }

    // const clearMap = function() {
    //     kvMap = {};
    // }

    // const makeupQueryMap = function(count) {
    //     const statusList = [
    //         SQLStatus.Running,
    //         SQLStatus.Compiling,
    //         SQLStatus.Failed,
    //         SQLStatus.Done,
    //         SQLStatus.Cancelled,
    //     ];
    //     const queryMap = {};
    //     for (let i = 0; i < count; i ++) {
    //         const queryInfo = new SqlQueryHistory.QueryInfo();
    //         queryInfo.queryId = `sql#${i}`;
    //         queryInfo.status = statusList[i % statusList.length];
    //         queryInfo.queryString = `query#${i}`;
    //         queryInfo.startTime = Date.now();
    //         if (queryInfo.status !== SQLStatus.Running && queryInfo.status !== SQLStatus.Compiling) {
    //             queryInfo.endTime = queryInfo.startTime + 1000 * i;
    //         }
    //         if (queryInfo.status === SQLStatus.Failed) {
    //             queryInfo.errorMsg = `error#${i}`;
    //         } else {
    //             queryInfo.tableName = `table#${i}`;
    //         }

    //         queryMap[queryInfo.queryId] = queryInfo;
    //     }
    //     return queryMap;
    // }

    // before( function() {
    //     UnitTest.onMinMode();
    //     replaceApi();
    // });

    // after( function() {
    //     restoreApi();
    //     UnitTest.offMinMode();
    // });

    describe('SqlQueryHistoryPanel Common Function Test', () => {
        it('sortFunctions should work', () => {
            let list = [];

            // Sort duration
            const sortDuration = SqlQueryHistoryPanel.sortFunctions.sortDuration;
            for (let i = 0; i < 5; i ++) {
                list.push({ startTime: 0, endTime: 100 - i, id: i});
            }
            list.sort(sortDuration);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort start time
            list = [];
            const sortStartTime = SqlQueryHistoryPanel.sortFunctions.sortStartTime;
            for (let i = 0; i < 5; i ++) {
                list.push({ startTime: 10 - i, id: i});
            }
            list.sort(sortStartTime);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort Status
            list = [];
            const sortStatus = SqlQueryHistoryPanel.sortFunctions.sortStatus;
            for (let i = 0; i < 5; i ++) {
                list.push({ status: `${9 - i}`, id: i});
            }
            list.sort(sortStatus);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort rows
            list = [];
            const sortRows = SqlQueryHistoryPanel.sortFunctions.sortRows;
            for (let i = 0; i < 5; i ++) {
                list.push({ rows: 10 - i, id: i});
            }
            list.sort(sortRows);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }

            // Sort skew
            list = [];
            const sortSkew = SqlQueryHistoryPanel.sortFunctions.sortSkew;
            for (let i = 0; i < 5; i ++) {
                list.push({ skew: 10 - i, id: i});
            }
            list.sort(sortSkew);
            for (let i = 0; i < list.length; i ++) {
                expect(list[i].id).to.equal(list.length - 1 - i);
            }
        });

        it('formatDateTime should work', () => {
            const date = new Date('2019-01-07 15:46:20');
            const expectedString = '15:46:20 01/07/2019';

            // Input is Date object
            expect(SqlQueryHistoryPanel.formatDateTime(date)).to.equal(expectedString);
            // Input is timestamp
            expect(SqlQueryHistoryPanel.formatDateTime(date.getTime())).to.equal(expectedString);
        });

        it('formatNumber should work', () => {
            // Error handling
            expect(SqlQueryHistoryPanel.formatNumber(null)).to.equal('N/A');
            expect(SqlQueryHistoryPanel.formatNumber('abcd')).to.equal('N/A');
            // Regular input
            expect(SqlQueryHistoryPanel.formatNumber(1234)).to.equal(Number(1234).toLocaleString());
        })
    });

    describe('SqlQueryHistoryPanel.DynaTable Test', () => {
        const funcValue = {
            keySelected: null,
            queryClicked: null,
            actionClicked: null,
            tableClicked: null,
        };

        describe('constructor() should work', () => {
            it('test', () => {
                const table = new SqlQueryHistoryPanel.DynaTable({
                    columnsToShow: createColumnsToShow(),
                    tableDef: createTableDef(),
                    numRowsToShow: 100,
                    defaultSorting: { sortBy: 'STATUS', sortOrder: 0 },
                    container: getContainer()
                });
                expect(table._columnsToShow.length).to.equal(9);
                expect(Object.keys(table._tableDef.columns).length).to.equal(9);
                expect(table._defaultSorting.sortBy).to.equal('STATUS');
                expect(table._defaultSorting.sortOrder).to.equal(0);
                expect(table._currentSorting.sortBy).to.equal('STATUS');
                expect(table._currentSorting.sortOrder).to.equal(0);
                expect(table._numRowsToShow).to.equal(100);
                expect(table._container != null).to.be.true;
            });
        });

        describe('show() should work', () => {
            it('Case: normal case', () => {
                const table = new SqlQueryHistoryPanel.DynaTable({
                    columnsToShow: createColumnsToShow(),
                    tableDef: createTableDef(),
                    numRowsToShow: 100,
                    defaultSorting: { sortBy: 'STATUS', sortOrder: 0 },
                    container: getContainer()
                });

                table.show(createData(10));
                expect($(table._container).html().length).to.gt(0);
            });

            it('Case: limit num of rows', () => {
                const table = new SqlQueryHistoryPanel.DynaTable({
                    columnsToShow: createColumnsToShow(),
                    tableDef: createTableDef(),
                    numRowsToShow: 100,
                    defaultSorting: { sortBy: 'STATUS', sortOrder: 0 },
                    container: getContainer()
                });

                table.show(createData(100));
                const html100 = $(table._container).html();

                table.show(createData(200));
                const html200 = $(table._container).html();

                expect(html100).to.equal(html200);
            });
        });

        describe('test sub components', () => {
            const oldFuncs = new Map();
            const elemProps = new Map();
            let table;
            before(() => {
                table = new SqlQueryHistoryPanel.DynaTable({
                    columnsToShow: createColumnsToShow(),
                    tableDef: createTableDef(),
                    numRowsToShow: 100,
                    defaultSorting: { sortBy: 'STATUS', sortOrder: 0 },
                    container: getContainer()
                });
                oldFuncs.set('createElements', table._templateMgr.createElements);
                table._templateMgr.createElements = (id, props) => {
                    if (!elemProps.has(id)) {
                        elemProps.set(id, []);
                    }
                    elemProps.get(id).push(props);
                    return oldFuncs.get('createElements').bind(table._templateMgr)(id, props);
                }
            });
            afterEach(() => {
                elemProps.clear();
            });
            after(() => {
                table._templateMgr.createElements = oldFuncs.get('createElements');
            })

            it('_createBodyColumnCheckbox()', () => {
                // Checked
                {
                    const comp = table._createBodyColumnCheckbox({
                        category: 'QUERY', isChecked: true, width: 20
                    });
                    expect(comp != null).to.be.true;
                    const propsList = elemProps.get('bodyColumnCheckbox');
                    expect(propsList != null).to.be.true;
                    const props = propsList.pop();
                    delete props.onClick;
                    expect(props).to.deep.equal({
                        cssClass: 'col-query', cssStyle: 'flex-basis:20', cssChecked: 'checked'
                    });
                }

                // Un-checked
                {
                    const comp = table._createBodyColumnCheckbox({
                        category: 'QUERY', isChecked: false, width: 20
                    });
                    expect(comp != null).to.be.true;
                    const propsList = elemProps.get('bodyColumnCheckbox');
                    expect(propsList != null).to.be.true;
                    const props = propsList.pop();
                    delete props.onClick;
                    expect(props).to.deep.equal({
                        cssClass: 'col-query', cssStyle: 'flex-basis:20', cssChecked: ''
                    });
                }
            });

            it('_createBodyColumnStatus()', () => {
                const statusIconMap = Object.assign({}, table._statusMapping);
                const statusTextMap = Object.assign({}, table._sqlStatusString);

                for (const status of Object.keys(statusIconMap)) {
                    const comp = table._createBodyColumnStatus({
                        category: 'STATUS', status: status, width: 20
                    });
                    expect(comp != null, status).to.be.true;
                    expect(elemProps.has('bodyColumnStatus'), status).to.be.true;
                    const props = elemProps.get('bodyColumnStatus').pop();
                    expect(props).to.deep.equal({
                        cssClass: 'col-status', iconClass: statusIconMap[status],
                        text: statusTextMap[status], cssStyle: 'flex-basis:20'
                    }, status);
                }
            });

            it('_createBodyColumnText(): ellispsis + tooltip', () => {
                const comp = table._createBodyColumnText({
                    isEllipsis: true, tooltip: 'testTooltip', category: 'QUERY',
                    style: 'style1:1', width: 20, text: 'testText'
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnElpsTextTooltip')).to.be.true;
                const props = elemProps.get('bodyColumnElpsTextTooltip')[0];
                expect(props).to.deep.equal({
                    cssClass: 'col-query', cssStyle: 'style1:1;flex-basis:20',
                    text: 'testText', tooltip: 'testTooltip'
                });
            });

            it('_createBodyColumnText(): ellispsis + no tooltip', () => {
                const comp = table._createBodyColumnText({
                    isEllipsis: true, category: 'QUERY',
                    style: 'style1:1', width: 20, text: 'testText'
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnElpsText')).to.be.true;
                const props = elemProps.get('bodyColumnElpsText')[0];
                expect(props).to.deep.equal({
                    cssClass: 'col-query', cssStyle: 'style1:1;flex-basis:20',
                    text: 'testText', tooltip: undefined
                });
            });

            it('_createBodyColumnText(): no ellispsis + tooltip', () => {
                const comp = table._createBodyColumnText({
                    isEllipsis: false, tooltip: 'testTooltip', category: 'QUERY',
                    style: 'style1:1', width: 20, text: 'testText'
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnTextTooltip')).to.be.true;
                const props = elemProps.get('bodyColumnTextTooltip')[0];
                expect(props).to.deep.equal({
                    cssClass: 'col-query', cssStyle: 'style1:1;flex-basis:20',
                    text: 'testText', tooltip: 'testTooltip'
                });
            });

            it('_createBodyColumnText(): no ellispsis + no tooltip', () => {
                const comp = table._createBodyColumnText({
                    isEllipsis: false, category: 'QUERY',
                    style: 'style1:1', width: 20, text: 'testText'
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnText')).to.be.true;
                const props = elemProps.get('bodyColumnText')[0];
                expect(props).to.deep.equal({
                    cssClass: 'col-query', cssStyle: 'style1:1;flex-basis:20',
                    text: 'testText', tooltip: undefined
                });
            });

            it('_createBodyColumnTextLink()', () => {
                const comp = table._createBodyColumnTextLink({
                    category: 'DURATION', text: 'testText', isError: true, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnElpsTextLink')).to.be.true;
                const props = elemProps.get('bodyColumnElpsTextLink')[0];
                delete props.onLinkClick;
                expect(props).to.deep.equal({
                    cssClass: 'col-duration error', cssStyle: 'flex-basis:20', text: 'testText'
                });
            });

            it('_createBodyColumnIconLink()', () => {
                const comp = table._createBodyColumnIconLink({
                    category: 'QUERY', text: 'testText', iconClass: 'iconClass', width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('bodyColumnIconLink')).to.be.true;
                const props = elemProps.get('bodyColumnIconLink')[0];
                delete props.onLinkClick;
                expect(props).to.deep.equal({
                    cssClass: 'col-query', cssStyle: 'flex-basis:20',
                    iconClass: 'iconClass', text: 'testText'
                });
            });

            it('_createHeaderRegularColumn()', () => {
                const comp = table._createHeaderRegularColumn({
                    cssClass: 'testClass', title: 'testTitle', width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnRegular')).to.be.true;
                const props = elemProps.get('headerColumnRegular')[0];
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', title: 'testTitle'
                });
            });

            it('_createHeaderCheckboxColumn(): unchecked', () => {
                const comp = table._createHeaderCheckboxColumn({
                    cssClass: 'testClass', isChecked: false, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnCheckbox')).to.be.true;
                const props = elemProps.get('headerColumnCheckbox')[0];
                delete props.onClick;
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', cssChecked: ''
                });
            });

            it('_createHeaderCheckboxColumn(): checked', () => {
                const comp = table._createHeaderCheckboxColumn({
                    cssClass: 'testClass', isChecked: true, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnCheckbox')).to.be.true;
                const props = elemProps.get('headerColumnCheckbox')[0];
                delete props.onClick;
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', cssChecked: 'checked'
                });
            });

            it('_createHeaderSortableColumn(): SORT_NONE', () => {
                const comp = table._createHeaderSortableColumn({
                    cssClass: 'testClass', title: 'testTitle',
                    sortOrder: 0, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnSortableNoSort')).to.be.true;
                const props = elemProps.get('headerColumnSortableNoSort')[0];
                delete props.onClickSort;
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', title: 'testTitle'
                });
            });

            it('_createHeaderSortableColumn(): SORT_ASC', () => {
                const comp = table._createHeaderSortableColumn({
                    cssClass: 'testClass', title: 'testTitle',
                    sortOrder: 1, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnSortable')).to.be.true;
                const props = elemProps.get('headerColumnSortable')[0];
                delete props.onClickSort;
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', title: 'testTitle',
                    sortOrderClass: 'xi-arrow-up'
                });
            });

            it('_createHeaderSortableColumn(): SORT_DESC', () => {
                const comp = table._createHeaderSortableColumn({
                    cssClass: 'testClass', title: 'testTitle',
                    sortOrder: 2, width: 20
                });
                expect(comp != null).to.be.true;
                expect(elemProps.has('headerColumnSortable')).to.be.true;
                const props = elemProps.get('headerColumnSortable')[0];
                delete props.onClickSort;
                expect(props).to.deep.equal({
                    cssClass: 'testClass', cssStyle: 'flex-basis:20', title: 'testTitle',
                    sortOrderClass: 'xi-arrow-down'
                });
            });
        });

        describe('select/unselect should work', () => {
            it('select/unselect row', () => {
                const table = new SqlQueryHistoryPanel.DynaTable({
                    columnsToShow: createColumnsToShow(),
                    tableDef: createTableDef(),
                    numRowsToShow: 100,
                    defaultSorting: { sortBy: 'STATUS', sortOrder: 0 },
                    container: getContainer()
                });
                table.show(createData(10));

                // Test select
                for (let i = 0; i < 10; i ++) {
                    const key = `key-${i}`;
                    table._selectRow(key, true);
                    expect(funcValue.keySelected.size).to.equal(i + 1);
                }

                // Test unselect
                for (let i = 0; i < 10; i ++) {
                    const key = `key-${i}`;
                    table._selectRow(key, false);
                    expect(funcValue.keySelected.size).to.equal(10 - i - 1);
                }
            });
        });

        function createColumnsToShow() {
            return ['SELECT', 'STATUS', 'QUERY', 'STARTTIME', 'DURATION', 'ROWS', 'SKEW', 'ACTION', 'TABLE'];
        }

        function createTableDef() {
            const def = {
                onSelectChange: (keySet) => { funcValue.keySelected = keySet },
                getKeyFunction: (testData) => `key-${testData}`,
                columns: {
                    'SELECT': { type: 2 },
                    'STATUS': {
                        type: 1,
                        sortFunction: (a, b) => (a - b),
                        convertFunc: (data) => ({ category: 'STATUS', status: 'Done' })
                    },
                    'QUERY': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'QUERY',
                            text: `query-${data}`,
                            onLinkClick: () => {funcValue.queryClicked = data}
                        })
                    },
                    'STARTTIME': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'STARTTIME', isEllipsis: false, text: `starttime-${data}`
                        })
                    },
                    'DURATION': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'DURATION', isEllipsis: false, text: `duration-${data}`
                        })
                    },
                    'ROWS': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'ROWS', isEllipsis: true, text: `rows-${data}`
                        })
                    },
                    'SKEW': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'SKEW', isEllipsis: true, text: `skew-${data}`
                        })
                    },
                    'ACTION': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'ACTION', text: `action-${data}`, iconClass: 'xi-search',
                            onLinkClick: () => { funcValue.actionClicked = data }
                        })
                    },
                    'TABLE': {
                        type: 0,
                        convertFunc: (data) => ({
                            category: 'TABLE', text: `table-${data}`, isError: data % 2 === 0,
                            onLinkClick: () => { funcValue.tableClicked = data }
                        })
                    }
                }
            };
            return def;
        }

        function createData(num) {
            const data = [];
            for (let i = 0; i < num; i ++) {
                data.push(i);
            }
            return data;
        }

        function getContainer() {
            return $('<div></div>')[0];
        }
    });

    describe('SqlQueryHistoryPanel.ExtCard Test', () => {
        let containerHTML;
        before(() => {
            containerHTML = `<div>${$('#sqlWorkSpacePanel').html()}</div>`;
        });

        it('Check table definition', () => {
            const comp = new SqlQueryHistoryPanel.ExtCard();
            comp.setup({
                $container: createContainer(),
                isShowAll: true,
                checkContainerVisible: () => false
            });

            const tableDef = comp.getTableDefinition();
            const definedColumns = new Set(Object.keys(tableDef.columns));

            for (const column of comp.getColumnsToShow()) {
                expect(definedColumns.has(column), column).to.be.true;
            }
        });

        it('Check convert functions', () => {
            const comp = new SqlQueryHistoryPanel.ExtCard();
            comp.setup({
                $container: createContainer(),
                isShowAll: true,
                checkContainerVisible: () => false
            });

            const tableDef = comp.getTableDefinition();
            const now = Date.now();
            const queryInfo = {
                queryId: 'testId', status: 'Done', queryString: 'testQueryString',
                startTime: now, endTime: now + 1000, tableName: 'testTableName',
                rows: 10, skew: 20
            };

            let columnProps;
            // Status
            columnProps = tableDef.columns['STATUS'].convertFunc(queryInfo);
            expect(columnProps).to.deep.equal({
                category: 'STATUS', status: queryInfo.status
            });
            // Query
            columnProps = tableDef.columns['QUERY'].convertFunc(queryInfo);
            delete columnProps.onLinkClick;
            expect(columnProps).to.deep.equal({
                category: 'QUERY', text: queryInfo.queryString
            });
            // StartTime
            columnProps = tableDef.columns['STARTTIME'].convertFunc(queryInfo);
            expect(columnProps).to.deep.equal({
                category: 'STARTTIME', isEllipsis: false,
                text: SqlQueryHistoryPanel.formatDateTime(queryInfo.startTime)
            });
            // Duration
            columnProps = tableDef.columns['DURATION'].convertFunc(queryInfo);
            expect(columnProps).to.deep.equal({
                category: 'DURATION', isEllipsis: true,
                text: xcTimeHelper.getElapsedTimeStr(1000, false)
            });
            // Table
            columnProps = tableDef.columns['TABLE'].convertFunc(queryInfo);
            delete columnProps.onLinkClick;
            expect(columnProps).to.deep.equal({
                category: 'TABLE', text: 'View', isError: false
            });
            // Rows
            columnProps = tableDef.columns['ROWS'].convertFunc(queryInfo);
            expect(columnProps).to.deep.equal({
                category: 'ROWS', isEllipsis: false,
                text: SqlQueryHistoryPanel.formatNumber(queryInfo.rows)
            });
            // Skew
            columnProps = tableDef.columns['SKEW'].convertFunc(queryInfo);
            expect(columnProps).to.deep.equal({
                category: 'SKEW', isEllipsis: false,
                text: SqlQueryHistoryPanel.formatNumber(queryInfo.skew),
                style: SqlQueryHistoryPanel.genSkewStyle(queryInfo.skew)
            });
            // Action: Done
            // columnProps = tableDef.columns['ACTION'].convertFunc(queryInfo);
            // delete columnProps.onLinkClick;
            // expect(columnProps).to.deep.equal({
            //     category: 'ACTION',
            //     text: SQLTStr.queryTableBodyTextPreview,
            //     iconClass: 'xi-dfg2'
            // });
            // // Action: Running
            // queryInfo.status = 'Running';
            // columnProps = tableDef.columns['ACTION'].convertFunc(queryInfo);
            // delete columnProps.onLinkClick;
            // expect(columnProps).to.deep.equal({
            //     category: 'ACTION',
            //     text: SQLTStr.queryTableBodyTextProgress,
            //     iconClass: 'xi-dfg2'
            // });
        });

        function createContainer() {
            return $(containerHTML);
        }
    });
});