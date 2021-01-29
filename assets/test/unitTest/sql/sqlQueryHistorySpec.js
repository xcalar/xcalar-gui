describe("SqlQueryHistory Test", function() {
    const QueryInfo = SqlQueryHistory.QueryInfo;
    const sqlKeyRoot = 'gSQLQueries';

    let kvMap = {};
    const fakePut = function(value) {
        kvMap[this.key] = value;
        return PromiseHelper.resolve();
    };
    const fakeGet = function() {
        return PromiseHelper.resolve(kvMap[this.key]);
    };
    const fakeGetKey = function(key) {
        return `${key}-abc`;
    }

    const fakeAppend = function(input) {
        const content = kvMap[this.key] || '';
        kvMap[this.key] = `${content}${input}`;
        return PromiseHelper.resolve();
    }

    const fakeList = function(keyRegx) {
        const matchedKeys = Object.keys(kvMap).filter((key) => {
            return key.match(keyRegx) != null;
        });
        return PromiseHelper.resolve({ keys: matchedKeys });
    }

    const fakeDelete = function() {
        delete kvMap[this.key];
        return PromiseHelper.resolve();
    }

    const replaceApi = function() {
        const old = {
            getKey: KVStore.getKey,
            get: KVStore.prototype.get,
            put: KVStore.prototype.put,
            append: KVStore.prototype.append,
            delete: KVStore.prototype.delete,
            list: KVStore.list
        }
        KVStore.getKey = fakeGetKey;
        KVStore.prototype.get = fakeGet;
        KVStore.prototype.put = fakePut;
        KVStore.prototype.append = fakeAppend;
        KVStore.prototype.delete = fakeDelete;
        KVStore.list = fakeList;
        return old;
    }

    const restoreApi = function(oldApi) {
        KVStore.getKey = oldApi.getKey;
        KVStore.prototype.get = oldApi.get;
        KVStore.prototype.put = oldApi.put;
        KVStore.prototype.append = oldApi.append;
        KVStore.prototype.delete = oldApi.delete;
        KVStore.list = oldApi.list;
    }

    before( function() {
        const oldApi = replaceApi();
        SqlQueryHistory._instance = null;
        SqlQueryHistory.getInstance();
        restoreApi(oldApi);
    });

    after( function() {
        SqlQueryHistory._instance = null;
    });

    it('SqlQueryHistory.getQueryMap should work', function() {
        const queryInfo = new QueryInfo();
        queryInfo.queryId = 'sql#1';
        const mapExpected = {};
        mapExpected[queryInfo.queryId] = queryInfo;
        const mapExpectedStr = JSON.stringify(mapExpected);

        SqlQueryHistory.getInstance()._queryMap = mapExpected;
        const returnMap = SqlQueryHistory.getInstance().getQueryMap();
        // Check return value
        expect(JSON.stringify(returnMap)).to.equal(mapExpectedStr);
        // Check return value is a copy
        returnMap['testSql'] = 'testSql';
        expect(SqlQueryHistory.getInstance()._queryMap['testSql']).to.be.undefined;
    });

    it('SqlQueryHistory.mergeQuery should work', function() {

        const defaultInfo = new QueryInfo();
        const cases = [
            {
                name: 'case #1',
                input: () => (Object.assign({}, defaultInfo)),
                update: () => ({ queryId: 'newQueryId'}),
                expect: () => {
                    const info = Object.assign({}, defaultInfo);
                    info.queryId = 'newQueryId';
                    return info;
                }
            },
            {
                name: 'case #2',
                input: () => (Object.assign({}, defaultInfo)),
                update: () => ({
                    queryId: 'newQueryId',
                    status: 'newStatus',
                    queryString: 'newQueryString',
                    startTime: 123,
                    endTime: 456,
                    newTableName: 'newTable',
                    errorMsg: 'errorMessage',
                    dataflowId: 'dfId',
                    rows: 'rows',
                    skew: 5,
                    columns: 'columns',
                    statementType: 'Select'
                }),
                expect: () => ({
                    queryId: 'newQueryId',
                    status: 'newStatus',
                    queryString: 'newQueryString',
                    startTime: 123,
                    endTime: 456,
                    tableName: 'newTable',
                    errorMsg: 'errorMessage',
                    dataflowId: 'dfId',
                    rows: 'rows',
                    skew: 5,
                    columns: 'columns',
                    statementType: 'Select'
                })
            }
        ];

        for (const tcase of cases) {
            const result = tcase.input();
            SqlQueryHistory.mergeQuery(result, tcase.update());
            const expected = tcase.expect();
            for (const key of Object.keys(result)) {
                expect(result[key], `${tcase.name}:${key}`).to.equal(expected[key]);
            }
        }
    });

    it('SqlQueryHistory.writeQueryStore should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        const queryInfo = new SqlQueryHistory.QueryInfo();
        const queryId = 'qID';

        SqlQueryHistory.getInstance().writeQueryStore(queryId, queryInfo)
        .then( () => {
            let key = KVStore.getKey(sqlKeyRoot) + "/" + queryId;
            expect(JSON.stringify(queryInfo)).to.equal(kvMap[key]);
        })
        .fail( (e) => {
            expect('No error').to.equal(undefined);
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            done();
        });
    });

    it('SqlQueryHistory.readStore(normal) should work', function(done) {
        kvMap = {};
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        const idList = 'sql1,sql2,sql3,sql4,sql5,sql6,sql7,sql8,sql9,sql10';
        for (const sqlId of idList.split(',')) {
            const key = `${KVStore.getKey(sqlKeyRoot)}/${sqlId}`;
            kvMap[key] = JSON.stringify({query: `${sqlId}_query`, queryId: sqlId});
        }

        SqlQueryHistory.getInstance().readStore()
        .then( () => {
            expect(SqlQueryHistory.getInstance().isLoaded()).to.be.true;
            for (const sqlId of idList.split(',')) {
                const query = JSON.stringify({query: `${sqlId}_query`, queryId: sqlId});
                expect(JSON.stringify(SqlQueryHistory.getInstance()._queryMap[sqlId])).to.equal(query);
            }
        })
        .fail( (e) => {
            assert.fail('Should be no error');
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            done();
        });
    });

    it('SqlQueryHistory.readStore(first time user) should work', function(done) {
        kvMap = {};
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};

        SqlQueryHistory.getInstance().readStore()
        .then( () => {
            expect(SqlQueryHistory.getInstance().isLoaded()).to.be.true;
        })
        .fail( (e) => {
            assert.fail('Should be no error');
        })
        .always( () => {
            restoreApi(oldApi);
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            done();
        })
    });

    it('SqlQueryHistory.upsertQuery(new query) should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};
        kvMap = {};

        const updateInfo = {
            queryId: 'sql#1',
            status: 'status',
            queryString: 'queryString',
            startTime: Date.now(),
            endTime: Date.now(),
            newTableName: 'table#1',
        };
        const queryExpected = new QueryInfo();
        SqlQueryHistory.mergeQuery(queryExpected, updateInfo);

        SqlQueryHistory.getInstance().upsertQuery(updateInfo)
        .then( (res) => {
            // Check return value
            expect(res.isNew).to.be.true;
            expect(JSON.stringify(res.queryInfo)).to.equal(JSON.stringify(queryExpected));
            // Check queryMap
            const mapValue = SqlQueryHistory.getInstance().getQuery(updateInfo.queryId);
            expect(mapValue).to.not.be.undefined;
            expect(mapValue).to.not.be.null;
            expect(JSON.stringify(mapValue)).to.equal(JSON.stringify(queryExpected));
            // Check KVStore
            expect(kvMap[`${KVStore.getKey(sqlKeyRoot)}/${updateInfo.queryId}`]).to.equal(JSON.stringify(queryExpected));
        })
        .fail( () => {
            assert.fail('Should be no error');
        }).
        always( () => {
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            restoreApi(oldApi);
            done();
        });
    });

    it('SqlQueryHistory.upsertQuery(existing query) should work', function(done) {
        const oldApi = replaceApi();
        SqlQueryHistory.getInstance()._queryMap = {};
        kvMap = {};

        const updateInfo = {
            queryId: 'sql#1',
            status: 'status',
            queryString: 'queryString',
            startTime: Date.now(),
            endTime: Date.now(),
            newTableName: 'table#1',
        };
        const queryExpected = new QueryInfo();
        SqlQueryHistory.mergeQuery(queryExpected, updateInfo);

        // Setup queryMap & KVStore
        const queryInfo = new QueryInfo();
        queryInfo.queryId = updateInfo.queryId;
        SqlQueryHistory.getInstance().setQuery(queryInfo);
        const key = `${KVStore.getKey(sqlKeyRoot)}/${queryInfo.queryId}`;
        kvMap[key] = JSON.stringify(queryInfo);

        SqlQueryHistory.getInstance().upsertQuery(updateInfo)
        .then( (res) => {
            // Check return value
            expect(res.isNew).to.be.false;
            expect(JSON.stringify(res.queryInfo)).to.equal(JSON.stringify(queryExpected));
            // Check queryMap
            const mapValue = SqlQueryHistory.getInstance().getQuery(updateInfo.queryId);
            expect(mapValue).to.not.be.undefined;
            expect(mapValue).to.not.be.null;
            expect(JSON.stringify(mapValue)).to.equal(JSON.stringify(queryExpected));
            // Check KVStore
            expect(kvMap[key]).to.equal(JSON.stringify(queryExpected));
        })
        .fail( () => {
            assert.fail('Should be no error');
        }).
        always( () => {
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};
            restoreApi(oldApi);
            done();
        });
    });

    describe('KVStore upgrade should work', () => {
        let oldApi;
        const sqlIdList = ['sql1', 'sql2', 'sql3', 'sql4', 'sql5'];
        const numSqls = 2;
        before(() => {
            oldApi = replaceApi();
        });

        after(() => {
            restoreApi(oldApi);
        });

        it('SqlQueryHist.convertKVStore should work', (done) => {
            SqlQueryHistory.getInstance()._queryMap = {};
            kvMap = {};

            // Setup old KVStore structure
            constructOldKVStore().then(() => {
                // Convert to new KVStore structure
                return SqlQueryHistory.getInstance().convertKVStore();
            })
            .then(({keys: newKeys}) => {
                // New keys should be created
                expect(newKeys.length).to.equal(numSqls);
            })
            .then(() => {
                // Old keys should be deleted
                return getOldList()
                .then((data) => {
                    expect(data == null).to.equal(true);
                });
            })
            .fail(() => {
                assert.fail('Should be no error');
            })
            .always(() => {
                SqlQueryHistory.getInstance()._queryMap = {};
                kvMap = {};
                done();    
            });
        });
        
        it('SqlQueryHistory.converKVStore should be properly called', (done) => {
            let isCalled = false;
            let xcalarVersion = '';
            const oldConverKVStore = SqlQueryHistory.prototype.convertKVStore;
            SqlQueryHistory.prototype.convertKVStore = () => {
                isCalled = true;
                return PromiseHelper.resolve({ keys: [] });
            };
            const oldGetVersion = XVM.getVersion;
            XVM.getVersion = () => xcalarVersion;

            PromiseHelper.resolve()
            .then(() => {
                // Case #1: Need upgrade, new key not exists and version is 2.0.0
                isCalled = false;
                // Setup trigger conditions
                kvMap = {}; // New key not exists
                xcalarVersion = '2.0.0'; // Major version is 2
                // Test
                return SqlQueryHistory.getInstance().readStore()
                .then(() => {
                    expect(isCalled).to.equal(true);
                })
                .fail(() => {
                    assert.fail('Should be no error');
                })
                .always(() => {
                    SqlQueryHistory.getInstance()._queryMap = {};
                    kvMap = {};
                });
            })
            .then(() => {
                // Case #1: Need upgrade, new key not exists and version is 2.0.1
                isCalled = false;
                // Setup trigger conditions
                kvMap = {}; // New key not exists
                xcalarVersion = '2.0.1'; // Major version is 2.0.1
                // Test
                return SqlQueryHistory.getInstance().readStore()
                .then(() => {
                    expect(isCalled).to.equal(true);
                })
                .fail(() => {
                    assert.fail('Should be no error');
                })
                .always(() => {
                    SqlQueryHistory.getInstance()._queryMap = {};
                    kvMap = {};
                });
            })
            .then(() => {
                // Case #2: Don't upgrade, new key exists and version is 2.0.0
                isCalled = false;
                // Setup trigger conditions
                kvMap[`${KVStore.getKey(sqlKeyRoot)}/anyId`] = JSON.stringify({
                    queryId: 'anyId', query: 'any query'
                }); // New key existes
                xcalarVersion = '2.0.0'; // Major version is 2
                // Test
                return SqlQueryHistory.getInstance().readStore()
                .then(() => {
                    expect(isCalled).to.equal(false);
                })
                .fail(() => {
                    assert.fail('Should be no error');
                })
                .always(() => {
                    SqlQueryHistory.getInstance()._queryMap = {};
                    kvMap = {};
                });
            })
            .then(() => {
                // Case #3: Don't upgrade, new key not exists and version = 3.2.0
                isCalled = false;
                // Setup trigger conditions
                kvMap = {} // New key not exists
                xcalarVersion = '3.2.0'; // Major version is not 3.2.0
                // Test
                return SqlQueryHistory.getInstance().readStore()
                .then(() => {
                    expect(isCalled).to.equal(false);
                })
                .fail(() => {
                    assert.fail('Should be no error');
                })
                .always(() => {
                    SqlQueryHistory.getInstance()._queryMap = {};
                    kvMap = {};
                });
            })
            .always(() => {
                SqlQueryHistory.prototype.convertKVStore = oldConverKVStore;
                XVM.getVersion = oldGetVersion;
                SqlQueryHistory.getInstance()._queryMap = {};
                kvMap = {};
                done();
            });
        });

        function constructOldKVStore() {
            const oldListKey = KVStore.getKey('gSQLQuery');
            return new KVStore(oldListKey).put(sqlIdList.join(','))
            .then(() => {
                const writeSqls = sqlIdList.filter((_, i) => i < numSqls).map((sqlId) => {
                    return new KVStore(sqlId)
                    .put(JSON.stringify({
                        queryId: sqlId,
                        query: `query-${sqlId}`
                    }));
                });
                return PromiseHelper.when(...writeSqls);
            });
        }

        function getOldList() {
            const oldListKey = KVStore.getKey('gSQLQuery');
            return new KVStore(oldListKey).get();
        }
    });

});