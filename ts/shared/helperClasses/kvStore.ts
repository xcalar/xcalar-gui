class KVStore {
    /* ============== Static Properties and Methods ========= */
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    private static keys: Map<string, string> = new Map();

    /**
     * KVStore.setupUserAndGlobalKey
     * keys: gUserKey, gSettingsKey,
     */
    public static setupUserAndGlobalKey(): void {
        const globlKeys: any = WorkbookManager.getGlobalScopeKeys(Durable.Version);
        const userScopeKeys: any = WorkbookManager.getUserScopeKeys(Durable.Version);
        const keys: string[] = $.extend({}, globlKeys, userScopeKeys);
        for (var key in keys) {
            KVStore.keys.set(key, keys[key]);
        }
    }

    /**
     * KVStore.setupWKBKKey
     * keys: gStorageKey, commitKey
     * @param keys
     */
    public static setupWKBKKey() {
        const wkbkScopeKeys: any = WorkbookManager.getWkbkScopeKeys(Durable.Version);
        const keys: string[] = $.extend({}, wkbkScopeKeys);
        for (var key in keys) {
            KVStore.keys.set(key, keys[key]);
        }
        let commitKey: string = KVStore.getKey("gStorageKey");
        if (commitKey != null) {
            commitKey +=  "-" + "commitKey";
            KVStore.keys.set("commitKey", commitKey);
        }
    }

    /**
     * KVStore.getKey
     * @param key
     */
    public static getKey(key: string) {
        return KVStore.keys.get(key);
    }

    /**
     * KVStore.list
     * @param keyRegex
     * @param scope
     */
    public static list(keyRegex: string, scope: number): XDPromise<{numKeys: number, keys: string[]}> {
        return XcalarKeyList(keyRegex, scope);
    }

    /**
     * KVStore.commit
     */
    public static commit(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        XcSupport.stopHeartbeatCheck();

        this._commitWKBKInfo()
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            console.error("commit fails!", error);
            deferred.reject(error);
        })
        .always(() => {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    }

    /**
     * KVStore.restoreUserAndGlobalInfo
     */
    public static restoreUserAndGlobalInfo(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let gInfosUser: UserInfoDurable = <UserInfoDurable>{};
        let gInfosSetting: GenSettingsDurable = <any>{};

        KVStore.getUserInfo()
        .then((userMeta) => {
            gInfosUser = userMeta;
            return KVStore.getSettingInfo();
        })
        .then((settingMeta) => {
            gInfosSetting = settingMeta;
            return this._restoreUserAndGlobalInfoHelper(gInfosUser, gInfosSetting);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("KVStore restore user info fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * KVStore.restoreWKBKInfo
     */
    public static restoreWKBKInfo(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._getMetaInfo()
        .then((meta: MetaInfDurable) => {
            return this._restoreWKBKInfoHelper(meta);
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error("KVStore restore fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * KVStore.genMutex
     * @param kvKey
     * @param scope
     */
    public static genMutex(kvKey: string, scope: number): Mutex {
        const mutexKey: string = kvKey + "-mutex";
        return new Mutex(mutexKey, scope);
    }

    /**
     * KVStore.update
     * @param oldMeta
     * @param constorName
     */
    public static upgrade(oldMeta: any, constorName: string): object {
        if (oldMeta == null) {
            return null;
        }

        const persistedVersion: number = oldMeta.version;
        xcAssert((persistedVersion != null) && (constorName != null));

        let newMeta: any = oldMeta;
        for (let i = 0; i < Durable.Version - persistedVersion; i++) {
            const versionToBe: number = (persistedVersion + (i + 1));
            const ctor: string = constorName + "V" + versionToBe;

            xcAssert(window[ctor] != null &&
                    typeof window[ctor] === "function");
            newMeta = new window[ctor](newMeta);
        }
        return newMeta;
    }

    /**
     * KVStore.getUserInfo
     */
    public static getUserInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gUserKey");
        const kvStore = new KVStore(key, gKVScope.USER);
        return kvStore.getInfo();
    }

    /**
     * KVStore.getSettingInfo
     */
    public static getSettingInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gSettingsKey");
        const kvStore = new KVStore(key, gKVScope.GLOB);
        return kvStore.getInfo();
    }

    private static _getMetaInfo(): XDPromise<any> {
        const key: string = KVStore.getKey("gStorageKey");
        const kvStore = new KVStore(key, gKVScope.WKBK);
        return kvStore.getInfo();
    }

    private static _restoreUserAndGlobalInfoHelper(
        gInfosUser: UserInfoDurable,
        gInfosSetting: GenSettingsDurable,
    ): XDPromise<void> {
        const userInfos: UserInfo = new UserInfo(gInfosUser);
        return UserSettings.Instance.restore(userInfos, gInfosSetting);
    }

    private static _restoreWKBKInfoHelper(gInfosMeta: MetaInfDurable): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isEmpty: boolean = $.isEmptyObject(gInfosMeta);
        let metaInfo: MetaInfo;


        try {
            metaInfo = new MetaInfo(gInfosMeta);
            TblManager.restoreTableMeta(metaInfo.getTableMeta());
            Profile.restore(metaInfo.getStatsMeta());
        } catch (error) {
            console.error(error);
            return PromiseHelper.reject(error);
        }

        let promise: XDPromise<void>;
        if (isEmpty) {
            console.info("KVStore is empty!");
            promise = PromiseHelper.resolve();
        } else {
            promise = PromiseHelper.resolve();
        }

        promise
        .then(() => {
            // must come after Log.restore
            try {
                QueryManager.upgrade(metaInfo.getQueryMeta());
            } catch (e) {
                console.error(e);
            }
        })
        // remove any unnecessary orphan tables
        .then(() => TblManager.refreshOrphanList(true))
        .then(() => {
            if (gOrphanTables.length) {
                TblManager.deleteTables(gOrphanTables, TableType.Orphan, true, false);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private static _commitWKBKInfo(): XDPromise<void> {
        if (WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let metaInfo: MetaInfo = new MetaInfo();

        const storageStore = new KVStore(KVStore.getKey("gStorageKey"), gKVScope.WKBK);
        storageStore.put(metaInfo.serialize(), true)
        .then(() => {
            return QueryManager.commit();
        })
        .then(() => {
            return WorkbookManager.commit();
        })
        .then(() => {
            var wkbkId = WorkbookManager.getActiveWKBK();
            var workbook = WorkbookManager.getWorkbook(wkbkId);
            if (workbook != null) {
                // just an error handler
                var wkbkName = workbook.name;
                return XcalarSaveWorkbooks(wkbkName);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* ============ End of Static Properties and Methods ======= */

    /* ============ Instance Properties and Methods ========== */
    private key: string;
    private keys: string[];
    private scope: number;

    /**
     * constructor
     * @param key
     * @param scope
     */
    public constructor(key: string | string[], scope: number) {
        if (Array.isArray(key)) {
            this.keys = key.map(v => v);
            this.key = this.keys[0];
        } else {
            this.key = key;
            this.keys = [key];
        }
        this.scope = scope;
    }

    /**
     * get
     */
    public get(): XDPromise<string> {
        const deferred: XDDeferred<string | null> = PromiseHelper.deferred();

        XcalarKeyLookup(this.key, this.scope)
        .then(function(value) {
            if (value != null && value.value != null) {
                deferred.resolve(value.value);
            } else {
                deferred.resolve(null);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public multiGet(): XDPromise<Map<string, string>> {
        // XXX TODO: replace with new API KvStoreService.multiGet
        const result = new Map<string, string>();
        const deferred: XDDeferred<Map<string, string>> = PromiseHelper.deferred();

        // Create a promise list for every keys
        const getKeys = this.keys.map((key) => {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const kvStore = new KVStore(key, this.scope);
            kvStore.get()
            .then((value) => {
                result.set(key, value);
            })
            .always(() => {
                deferred.resolve();
            });
            return deferred.promise();
        });

        // Run/Resolve the promises in batch
        PromiseHelper.when(...getKeys)
        .always(() => {
            deferred.resolve(result);
        });

        return deferred.promise();
    }

    /**
     * getAndParse
     */
    public getAndParse(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = this.key;

        this.get()
        .then(function(value: string) {
            // "" can not be JSON.parse
            if (value != null && value !== "") {
                let passed: boolean = false;
                let error: Error;
                let parsedVal: any;

                try {
                    parsedVal = JSON.parse(value);
                    passed = true;
                } catch (err) {
                    console.error(err, value, key);
                    error = err;
                }

                if (passed) {
                    deferred.resolve(parsedVal);
                } else {
                    deferred.reject(error);
                }
            } else {
                deferred.resolve(null);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * put
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public put(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false,
        scopeInfo?:{userName:string, workbookName: string}
    ): XDPromise<void> {
        const key: string = this.key;
        const scope: number = this.scope;

        if (noCommitCheck) {
            return XcalarKeyPut(key, value, persist, scope);
        } else {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            this.commitCheck(noCommitCheck)
            .then(function() {
                return XcalarKeyPut(key, value, persist, scope, scopeInfo);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }
    }

    /**
     * multiPut
     * @param values
     * @param persist
     * @param noCommitCheck
     * @param scopeInfo
     */
    public multiPut(
        values: string[],
        persist: boolean,
        noCommitCheck: boolean = false,
        scopeInfo?:{userName:string, workbookName: string}
    ): XDPromise<any> {
        const scope: number = this.scope;
        const kvMap: Map<string, string> = this.keys.reduce((map, key, index) => {
            const value = values[index];
            if (value != null) {
                map.set(key, value);
            }
            return map;
        }, new Map<string, string>());

        if (scope === gKVScope.GLOB) {
            let promises = [];
            kvMap.forEach((value, key) => {
                if (noCommitCheck) {
                    promises.push(XcalarKeyPut(key, value, persist, scope));
                } else {
                    promises.push((() => {
                        const d = PromiseHelper.deferred();
                        this.commitCheck(noCommitCheck)
                        .then(() => {
                            return XcalarKeyPut(key, value, persist, scope);
                        })
                        .then(d.resolve)
                        .fail(d.reject);
                        return d.promise();
                    })());
                }
            });

            const deferred = PromiseHelper.deferred();
            PromiseHelper.when.apply(this, promises)
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        } else {
            if (noCommitCheck) {
                return XcalarKeyMultiPut(kvMap, persist, scope, scopeInfo);
            } else {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                this.commitCheck(noCommitCheck)
                .then(function() {
                    return XcalarKeyMultiPut(kvMap, persist, scope, scopeInfo);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);

                return deferred.promise();
            }
        }


    }

    /**
     * putWithMutex
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public putWithMutex(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;
        const lock = KVStore.genMutex(key, scope);
        const concurrency: Concurrency = new Concurrency(lock);

        function lockAndPut(): XDPromise<void> {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();

            concurrency.tryLock()
            .then(function() {
                return XcalarKeyPut(key, value, persist, scope);
            })
            .then(function() {
                return concurrency.unlock();
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                console.error("Put to KV Store with mutex fails!", error);
                if (concurrency.isLocked()) {
                    concurrency.unlock()
                    .always(function() {
                        innerDeferred.reject(error);
                    });
                } else {
                    innerDeferred.reject(error);
                }
            });

            return innerDeferred.promise();
        }

        this.commitCheck(noCommitCheck)
        .then(function() {
            return lockAndPut();
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error === ConcurrencyEnum.NoKVStore) {
                // XXX it's an error handling code, fix me if not correct
                concurrency.initLock()
                .then(lockAndPut)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public setIfEqual(
        oldValue: string,
        newValue: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<{noKV: boolean}> {
        const deferred: XDDeferred<{noKV: boolean}> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;

        this.commitCheck(noCommitCheck)
        .then(function() {
            return XcalarKeySetIfEqual(scope, persist, key, oldValue, newValue);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * append
     * @param value
     * @param persist
     * @param noCommitCheck
     */
    public append(
        value: string,
        persist: boolean,
        noCommitCheck: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = this.key;
        const scope: number = this.scope;

        this.commitCheck(noCommitCheck)
        .then(function() {
            return XcalarKeyAppend(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * delete
     */
    public delete(): XDPromise<void> {
       return XcalarKeyDelete(this.key, this.scope);
    }

    public getInfo(ignoreFail: boolean = false): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = this.key;
        this.getAndParse()
        .then(function(info) {
            if (typeof(info) === "object") {
                deferred.resolve(info);
            } else {
                var error = "Expect info of" + key +
                            "to be an object but it's a " +
                            typeof(info) + " instead. Not restoring.";
                xcConsole.log(error);
                deferred.resolve({});
            }
        })
        .fail(function(error) {
            xcConsole.log("get meta of", key, "fails", error);
            if (ignoreFail) {
                deferred.resolve({});
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    private commitCheck(noCommitCheck: boolean): XDPromise<void> {
        if (noCommitCheck) {
            return PromiseHelper.resolve();
        } else {
            return XcUser.CurrentUser.commitCheck();
        }
    }
    /* ============ End of Instance Properties and Methods ========== */
}
if (typeof exports !== "undefined") {
    exports.KVStore = KVStore;
}

if (typeof runEntity !== "undefined") {
    runEntity.KVStore = KVStore;
}