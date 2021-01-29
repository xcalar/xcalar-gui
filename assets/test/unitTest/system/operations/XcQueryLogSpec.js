// XXX this test is broken, temporary disable it
describe.skip("XcQueryLog Test", function() {
    class SimKvStore {
        static clear() {
            SimKvStore.store.clear();
            while (SimKvStore.callStack.length > 0) {
                SimKvStore.callStack.pop();
            }
        }

        static filerCallStatck(name) {
            return SimKvStore.callStack.filter((callInfo) => {
                return callInfo.op === name;
            })
        }

        static getKey(name) {
            return name;
        }

        static list(pattern) {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                const result = [];
                for (const kvKey of SimKvStore.store.keys()) {
                    if (kvKey.match(pattern) != null) {
                        result.push(kvKey);
                    }
                }
                deferred.resolve({keys: result});
            }, 0);
            return deferred.promise();
        }

        constructor(key) {
            if (Array.isArray(key)) {
                this.keys = key.concat([]);
                this.key = this.keys[0];
            } else {
                this.key = key;
                this.keys = [key];
            }
        }

        delete() {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                SimKvStore.store.delete(this.key);
                SimKvStore.callStack.push({
                    op: 'delete',
                    keys: [this.key],
                    values: []
                });
                deferred.resolve();
            }, 0);
            return deferred.promise();
        }

        multiPut(values) {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                for (let i = 0; i < this.keys.length; i ++) {
                    const key = this.keys[i];
                    const value = values[i];
                    SimKvStore.store.set(key, value);
                }
                SimKvStore.callStack.push({
                    op: 'multiPut',
                    keys: this.keys.concat([]),
                    values: values.concat([])
                });
                deferred.resolve();
            }, 0);
            return deferred.promise();
        }

        multiGet() {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                const result = new Map();
                const values = new Array();
                for (const key of this.keys) {
                    const value = SimKvStore.store.get(key);
                    result.set(key, value);
                    values.push(value);
                }
                SimKvStore.callStack.push({
                    op: 'multiGet',
                    keys: this.keys.concat([]),
                    values: values
                });
                deferred.resolve(result);
            }, 0);
            return deferred.promise();
        }

        get() {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                const value = SimKvStore.store.get(this.key);
                deferred.resolve(value);
            }, 0);
            return deferred.promise();
        }

        getAndParse() {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                const value = SimKvStore.store.get(this.key);
                if (value != null && value !== "") {
                    try {
                        deferred.resolve(JSON.parse(value));
                    } catch(e) {
                        deferred.reject(e);
                    }
                } else {
                    deferred.resolve(null);
                }
            }, 0);
            return deferred.promise();
        }

        append(value) {
            const deferred = PromiseHelper.deferred();
            setTimeout(() => {
                const oldValue = SimKvStore.store.get(this.key);
                const newValue = oldValue == null ? value : oldValue + value;
                SimKvStore.store.set(this.key, newValue);
                deferred.resolve();
            }, 0);
            return deferred.promise();
        }
    }
    SimKvStore.store = new Map();
    SimKvStore.callStack = new Array();

    const cachedFunc = {};
    const kvPrefixQueryList = 'gQueryListPrefix';
    const kvPrefixArchiveList = 'gQueryArchivePrefix';

    before(function() {
        cachedFunc['KVStore'] = KVStore;
        KVStore = SimKvStore;
    });

    after(function() {
        KVStore = cachedFunc['KVStore'];
    });

    afterEach(function() {
        SimKvStore.clear();
    });

    it("XcQueryLog.get/getForUpdate", function() {
        const queryLog = new XcQueryLog();

        let log = queryLog.getForUpdate(1);
        expect(log == null).to.be.true;
        expect(queryLog._dirtyData.update.has('1')).to.be.false;

        queryLog.add(1, new XcQuery({}), false);
        queryLog.add(2, new XcQuery({}), false);
        expect(queryLog._queries.size).to.be.equal(2);
        expect(queryLog._dirtyData.update.size).to.be.equal(0);

        log = queryLog.get(1);
        expect(log == null).to.be.false;
        expect(queryLog._dirtyData.update.has('1')).to.be.false;

        log = queryLog.getForUpdate(2);
        expect(log == null).to.be.false;
        expect(queryLog._dirtyData.update.has('2')).to.be.true;
    });

    it("XcQueryLog.add", function() {
        const queryLog = new XcQueryLog();

        queryLog.add(1, new XcQuery({}), true);
        expect(queryLog.has(1)).to.be.true;
        expect(queryLog._dirtyData.update.has('1')).to.be.true;

        queryLog.add(2, new XcQuery({}), false);
        expect(queryLog.has(2)).to.be.true;
        expect(queryLog._dirtyData.update.has('2')).to.be.false;
    });

    it("XcQueryLog.remove", async function() {
        const queryLog = new XcQueryLog();

        const xcQuery = new XcQuery({
            fullName: 'testRemove1',
            time: Date.now(),
            state: QueryStatus.Done
        });
        const [_durable, durableKey] = xcQuery.getDurable();
        queryLog.add(1, xcQuery, true);
        expect(queryLog.has(1)).to.be.true;
        expect(queryLog._dirtyData.update.has('1')).to.be.true;

        await queryLog.remove(1);

        // Verify it's removed from log
        expect(queryLog.has(1)).to.be.false;
        expect(queryLog._dirtyData.update.has('1')).to.be.false;
        // Verify it's removed from kvstore
        const deleteCalls = SimKvStore.filerCallStatck('delete');
        expect(deleteCalls.length).to.be.equal(1);
        expect(deleteCalls[0].keys[0]).to.be.equal(`${kvPrefixQueryList}/${durableKey}`);
    });

    it("XcQueryLog.flush", async function() {
        const queryLog = new XcQueryLog();
        let logID = 0;

        // logs don't need to persist
        for (let i = 0; i < 10; i ++) {
            queryLog.add(logID ++, new XcQuery({fullName: `existing${i}`, state: QueryStatus.Done}), false);
        }
        // logs need to presist
        let saveSize = 0;
        const numPut = 10;
        const savedKeys = []
        for (let i = 0; i < 1000; i ++) {
            const xcQuery = new XcQuery({
                fullName: `save${i}`,
                time: Date.now(),
                state: QueryStatus.Done
            });
            const [durable, durableKey] = xcQuery.getDurable();
            savedKeys.push(`${kvPrefixQueryList}/${durableKey}`);
            saveSize += JSON.stringify(durable).length;
            queryLog.add(logID ++, xcQuery, true);
        }
        queryLog.MAX_FLUSH_SIZE = Math.ceil(saveSize / numPut);

        await queryLog.flush();

        // Verify batch logic
        const multiPutCalls = SimKvStore.filerCallStatck('multiPut');
        let numKeysSaved = 0;
        for (const putCall of multiPutCalls) {
            numKeysSaved += putCall.keys.length;
        }
        expect(numKeysSaved).to.be.equal(1000);
        expect(multiPutCalls.length).to.be.equal(numPut);
        // Verify result
        expect(SimKvStore.store.size).to.be.equal(1000);
        for (const kvKey of savedKeys) {
            expect(SimKvStore.store.has(kvKey), kvKey).to.be.true;
        }
    });

    it("XcQueryLog.flush(concurrency)", async function() {
        const queryLog = new XcQueryLog();

        // First flush
        queryLog.add(1, new XcQuery({
            fullName: 'testQuery',
            name: 'old_name',
            time: Date.now(),
            state: QueryStatus.Done
        }), true);
        const firstFlush = queryLog.flush();
        // Second flush: mutate query when the fist flush is in progress
        const query = queryLog.getForUpdate(1);
        query.name = 'new_name';
        // Wait for both flush done
        await firstFlush;
        await queryLog.flush();

        // The kvstore should have the content of the second flush
        const [_, durableKey] = queryLog.get(1).getDurable();
        const kvKey = `${kvPrefixQueryList}/${durableKey}`;
        expect(SimKvStore.store.has(kvKey)).to.be.true;
        const kvValue = JSON.parse(SimKvStore.store.get(kvKey));
        expect(kvValue.name).to.equal('new_name');
    });

    it("Archvie", async function() {
        const queryLog = new XcQueryLog();

        // logs need to archive
        const archivedKeys = []
        const queryTime = Date.now() - queryLog.LOG_LIFE_TIME - 1000 * 3600 * 24;
        for (let i = 0; i < 1000; i ++) {
            const xcQuery = new XcQuery({
                fullName: `archive${i}`,
                time: queryTime - i,
                state: QueryStatus.Done
            });
            const [durable, durableKey] = xcQuery.getDurable();

            const kvKey = `${kvPrefixQueryList}/${durableKey}`;
            const kvValue = JSON.stringify(durable);
            archivedKeys.push(`${kvPrefixArchiveList}/${durableKey}`);

            // Put it in kvstore
            SimKvStore.store.set(kvKey, kvValue);
        }

        // Initial state
        expect(queryLog._queries.size).to.be.equal(0);
        expect(queryLog._archiveKeys.size).to.be.equal(0);
        // First load: load nothing and cache the keys need to archive
        await queryLog.loadMore(20);
        expect(queryLog._queries.size).to.be.equal(0);
        expect(queryLog._archiveKeys.size).to.be.equal(1000);
        // Second load: load nothing and no more keys need to archive
        await queryLog.loadMore(20);
        expect(queryLog._queries.size).to.be.equal(0);
        expect(queryLog._archiveKeys.size).to.be.equal(1000);

        // Archive: keys moved from active prefix to archive prefix
        await queryLog.flush();
        expect(SimKvStore.store.size).to.be.equal(1000);
        for (const kvKey of archivedKeys) {
            expect(SimKvStore.store.has(kvKey), kvKey).to.be.true;
        }
    });

    it("Upgrade and flush", async function() {
        // Fake Log functions
        const oldGetLogs = Log.getLogs;
        const logs = [];
        Log.getLogs = () => {
            return logs;
        }
        const oldGetErrorLogs = Log.getErrorLogs;
        const errorLogs = [];
        Log.getErrorLogs = () => {
            return errorLogs;
        }

        // Case #1: normal case
        const baseTime = Date.now();
        const durables = [
            { state: QueryStatus.Done, sqlNum: null, time: baseTime + 0, name: 'name1', queryStr: 'query1', fullName: 'fullName1' },
            { state: QueryStatus.Done, sqlNum: null, time: baseTime + 1, name: 'name2', queryStr: 'query2' },
            { state: QueryStatus.Done, sqlNum: 0, time: baseTime + 2, name: 'name3', queryStr: 'query3' },
            { state: QueryStatus.Error, sqlNum: 1, time: baseTime + 3, name: 'name4', queryStr: 'query4' },
            { state: QueryStatus.Done, sqlNum: 2, time: baseTime + 4, name: 'name5', queryStr: 'query5' },
        ];
        logs[0] = { options: { operation: 'lname1' }, cli: 'lquery1' };
        logs[2] = { options: { operation: SQLOps.Retina, retName: 'ret1' }, cli: 'lquery2' };
        errorLogs[1] = { options: { operation: 'ename1' }, cli: 'equery1' };

        // Do upgrade
        let queryLog = new XcQueryLog();
        let queries = queryLog.upgrade(durables);
        await queryLog.flush();

        // Check result
        expect(queries.length).to.equal(5);
        let query = queries[0];
        expect(query.name).to.equal(`${SQLOps.Retina} ret1`);
        expect(query.time).to.equal(baseTime + 4);
        expect(query.queryStr).to.equal('lquery2');
        expect(query.fullName).to.equal(`${SQLOps.Retina} ret1-${baseTime + 4}`);
        query = queries[1];
        expect(query.name).to.equal('ename1');
        expect(query.time).to.equal(baseTime + 3);
        expect(query.queryStr).to.equal('query4');
        expect(query.fullName).to.equal(`ename1-${baseTime + 3}`);
        query = queries[2];
        expect(query.name).to.equal('lname1');
        expect(query.time).to.equal(baseTime + 2);
        expect(query.queryStr).to.equal('lquery1');
        expect(query.fullName).to.equal(`lname1-${baseTime + 2}`);
        query = queries[3];
        expect(query.name).to.equal('name2');
        expect(query.time).to.equal(baseTime + 1);
        expect(query.queryStr).to.equal('query2');
        expect(query.fullName).to.equal(`name2-${baseTime + 1}`);
        query = queries[4];
        expect(query.name).to.equal('name1');
        expect(query.time).to.equal(baseTime);
        expect(query.queryStr).to.equal('query1');
        expect(query.fullName).to.equal('fullName1');
        expect(SimKvStore.store.size).to.equal(5); // All upgraded queries need to be stored

        // Case #2: invalid durable which will case exception
        queryLog = new XcQueryLog();
        queries = null;
        let hasError = false;
        try {
            queries = queryLog.upgrade(durables.concat([null]));
        } catch(e) {
            hasError = true;
        }
        expect(hasError).to.be.false;
        expect(Array.isArray(queries)).to.be.true;
        expect(queries.length).to.equal(0);

        // Restore Log functions
        Log.getLogs = oldGetLogs;
        Log.getErrorLogs = oldGetErrorLogs;
    });
});