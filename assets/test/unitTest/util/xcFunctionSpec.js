describe("xcFunction Test", function () {
    const tableId = 'a';
    const tableName = 't#' + tableId;
    let oldRefreshTable;
    let oldSetMeta;
    let oldTranStart;
    let oldTranDone;
    let oldTranFail;
    let oldTranCancel;
    let oldGetHashId;

    before(() => {
        const progCol1 = ColManager.newPullCol('col1', 'col1', ColumnType.integer);
        const progCol2 = ColManager.newPullCol('prefix::col2', 'prefix::col2', ColumnType.integer);
        const table = new TableMeta({
            tableId: tableId,
            tableName: tableName,
            tableCols: [progCol1, progCol2, ColManager.newDATACol()]
        });
        gTables[tableId] = table;

        oldRefreshTable = TblManager.refreshTable;
        oldSetMeta = TblManager.setOrphanTableMeta;
        oldTranStart = Transaction.start;
        oldTranDone = Transaction.done;
        oldTranFail = Transaction.fail;
        oldTranCancel = Transaction.cancel;
        oldGetHashId = Authentication.getHashId;

        TblManager.refreshTable = (finalName) => {
            const table = new TableMeta({
                tableId: "test",
                tableName: finalName,
                tableCols: [progCol1, progCol2, ColManager.newDATACol()]
            });
            gTables["test"] = table;
            return PromiseHelper.resolve();
        };
        TblManager.setOrphanTableMeta = () => { };
        Transaction.start = () => 1.5; // simulate id will skip the getUnsortedTableName
        Transaction.done = () => { };
        Transaction.fail = () => { };
        Transaction.cancel = () => { };
        Authentication.getHashId = () => '#1';
    });

    describe('xcFunction.sort Test', () => {
        let oldSort;
        const ordering = XcalarOrderingT.XcalarOrderingAscending;

        before(() => {
            oldSort = XIApi.sort;
        });

        it('xcFunction.sort should work', (done) => {
            const oldMap = XIApi.map;
            let test = false;
            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            XIApi.sort = () => PromiseHelper.resolve({newTableName: 'testSort#test'});

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then((finalTableName) => {
                    expect(test).to.be.false;
                    expect(finalTableName).to.equal('testSort#test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('xcFunction.sort should cast prefix column', (done) => {
            const oldMap = XIApi.map;
            let test = false;

            XIApi.map = () => {
                test = true;
                return PromiseHelper.resolve('testMap');
            };

            XIApi.sort = () => PromiseHelper.resolve({newTableName: 'testSort#test'});

            const colInfos = [{
                colNum: 1,
                ordering: ordering
            }, {
                name: 'prefix::col2',
                ordering: ordering,
                typeToCast: ColumnType.string
            }];
            xcFunction.sort(tableId, colInfos)
                .then((finalTableName) => {
                    expect(test).to.be.true;
                    expect(finalTableName).to.equal('testSort#test');
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    XIApi.map = oldMap;
                });
        });

        it('xcFunction.sort should handle fail case', (done) => {
            XIApi.sort = () => PromiseHelper.reject('test');

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('test');
                    done();
                });
        });

        it('xcFunction.sort should handle cancel case', (done) => {
            XIApi.sort = () => PromiseHelper.reject({ 'error': SQLType.Cancel });

            const colInfos = [{ colNum: 1, ordering: ordering }];
            xcFunction.sort(tableId, colInfos)
                .then(() => {
                    done();
                })
                .fail(() => {
                    done('fail');
                });
        });

        after(() => {
            XIApi.sort = oldSort;
        });
    });

    after(() => {
        TblManager.refreshTable = oldRefreshTable;
        TblManager.setOrphanTableMeta = oldSetMeta;
        Transaction.start = oldTranStart;
        Transaction.done = oldTranDone;
        Transaction.fail = oldTranFail;
        Transaction.cancel = oldTranCancel;
        Authentication.getHashId = oldGetHashId;
        delete gTables[tableId];
        delete gTables["test"];
    });
});