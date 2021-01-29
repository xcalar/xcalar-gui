class Upgrader {
    private _globalCache: Map<string, any>;
    private _userCache: Map<string, any>;
    private _wkbksCache: Map<string, any>;
    private _version: number;

    constructor(version) {
        this._version = version;
        this._initialize();
    }

    /**
     * Upgrader.exec
     */
    public exec(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const version: number = this._version;

        WorkbookManager.getWKBKsAsync()
            .then((info) => {
                const {sessionInfo, refreshing} = info;
                if (refreshing) {
                    // wrong node don't do upgrade
                    return;
                } else {
                    const currentKeys: object = WorkbookManager.getKeysForUpgrade(sessionInfo, version);
                    const upgradeKeys: object = WorkbookManager.getKeysForUpgrade(sessionInfo, Durable.Version);
                    return this._execUpgrade(currentKeys, upgradeKeys);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    };

    private _initialize(): void {
        this._globalCache = new Map();
        this._userCache = new Map();
        this._wkbksCache = new Map();
    }

    private _execUpgrade(currentKeys: object, upgradeKeys: object): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $text: JQuery = $("#initialLoadScreen .text");
        const oldText: string = $text.text();
        $text.text(CommonTxtTstr.Upgrading);
        console.log("upgrade workbook", currentKeys, upgradeKeys);
        // step 1. read and upgrade old data
        this._readAndUpgrade(currentKeys)
            .then(() => {
                // step 2. write new data
                return this._writeToNewVersion(upgradeKeys);
            })
            .then(() => {
                // bump up version
                return XVM.commitKVVersion();
            })
            .then(() => {
                console.log("upgrade success", this._globalCache,
                    this._userCache, this._wkbksCache);
                deferred.resolve();
            })
            .fail((error) => {
                // XXX now just let the whole setup fail
                // may have a better way to handle it
                xcConsole.error(error);
                deferred.reject(error);
            })
            .always(() => {
                $text.text(oldText);
            });

        return deferred.promise();
    }

    /* ===================== Start of read and upgrade part ================= */
    private _upgradeHelper(
        key: string,
        scope: number,
        consctorName: string,
        wkbkName?: string
    ): XDPromise<object> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(key, scope);
        const currentSession: string = sessionName;

        if (wkbkName != null) {
            setSessionName(wkbkName);
        }

        kvStore.getAndParse()
            .then((meta) => {
                try {
                    let newMeta: object = KVStore.upgrade(meta, consctorName);
                    deferred.resolve(newMeta);
                } catch (error) {
                    let err: Error = error.stack || error;
                    console.error(error.stack || error);
                    deferred.reject(err);
                }
            })
            .fail(deferred.reject);

        setSessionName(currentSession);

        return deferred.promise();
    }

    private _upgradeGenSettings(gSettingsKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._upgradeHelper(gSettingsKey, gKVScope.GLOB, 'GenSetting')
            .then((genSettings) => {
                this._globalCache.set('genSettings', genSettings);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * global keys:
     *  gSettingsKey, for GenSettings
     */
    private _upgradeGlobalInfos(globalKeys: GlobalKVKeySet): XDPromise<void> {
        const def2: XDPromise<void> = this._upgradeGenSettings(globalKeys.gSettingsKey);
        return PromiseHelper.when(def2);
    }

    private _upgradeUserSettings(gUserKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._upgradeHelper(gUserKey, gKVScope.USER, 'UserInfo')
            .then((userSettings) => {
                // if (userSettings != null) {
                //     const oldDS: object = userSettings["gDSObj"];
                //     userSettings["gDSObj"] = DS.upgrade(oldDS);
                // }

                this._userCache.set('userSettings', userSettings);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _upgradeWKBkSet(wkbkKey: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkStore: KVStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkStore.getAndParse()
            .then((oldWkbks) => {
                try {
                    const wkbks: object = WorkbookManager.upgrade(oldWkbks);
                    this._userCache.set('wkbks', wkbks);
                    deferred.resolve();
                } catch (error) {
                    console.error(error.stack);
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * User keys:
     *  gUserKey, for UserInfo
     *  wkbkKey, for WKBK
     */
    private _upgradeUserInfos(userKeys: UserKVKeySet): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeUserSettings(userKeys.gUserKey);
        const def2: XDPromise<void> = this._upgradeWKBkSet(userKeys.wkbkKey);
        return PromiseHelper.when(def1, def2);
    }

    private _upgradeStorageMeta(
        gStorageKey: string,
        wkbkName: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkContainer: Map<string, any> = this._wkbksCache.get(wkbkName);
        this._upgradeHelper(gStorageKey, gKVScope.WKBK, 'MetaInfo', wkbkName)
            .then((meta) => {
                wkbkContainer.set('meta', meta);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /*
     * Wkbk keys:
     *  gStorageKey, for MetaInfo
     */
    private _upgradeOneWkbk(
        wkbkInfoKeys: WkbkKVKeySet,
        wkbkName: string
    ): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeStorageMeta(wkbkInfoKeys.gStorageKey, wkbkName);
        return PromiseHelper.when(def1);
    }

    private _upgradeWkbkInfos(wkbks: object) {
        const defArray: XDPromise<void>[] = [];
        for (let wkbkName in wkbks) {
            const wkbkInfoKeys: WkbkKVKeySet = wkbks[wkbkName];
            this._wkbksCache.set(wkbkName, new Map());
            defArray.push(this._upgradeOneWkbk(wkbkInfoKeys, wkbkName));
        }

        return PromiseHelper.when.apply(this, defArray);
    }

    private _readAndUpgrade(currentKeys: object): XDPromise<void> {
        const def1: XDPromise<void> = this._upgradeGlobalInfos(currentKeys['global']);
        const def2: XDPromise<void> = this._upgradeUserInfos(currentKeys['user']);
        const def3: XDPromise<void> = this._upgradeWkbkInfos(currentKeys['wkbk']);
        return PromiseHelper.when(def1, def2, def3);
    }

    /* ================== end of read and upgrade part ====================== */

    /* ======================== Write part ================================== */
    private _writeHelper(
        key: string,
        value: string | object,
        scope: number,
        alreadyStringify: boolean = false,
        needMutex: boolean = false,
        wkbkName?: string
    ): XDPromise<void> {
        if (value == null) {
            // skip null value
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const stringified: string = alreadyStringify ?
            <string>value : JSON.stringify(value);
        const currentSession: string = sessionName;
        if (wkbkName != null) {
            setSessionName(wkbkName);
        }
        const kvStore: KVStore = new KVStore(key, scope);
        let promise: XDPromise<void>;
        if (needMutex) {
            promise = kvStore.putWithMutex(stringified, true, true);
        } else {
            promise = kvStore.put(stringified, true, true);
        }

        promise
            .then(deferred.resolve)
            .fail(deferred.reject);

        setSessionName(currentSession);

        return deferred.promise();
    }

    private _checkAndWrite(key, value, scope, needMutex): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const kvStore: KVStore = new KVStore(key, scope);
        kvStore.get()
            .then((oldValue) => {
                if (oldValue != null) {
                    console.log("info of new version already exist");
                } else {
                    return this._writeHelper(key, value, scope, null, needMutex);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    private _writeGlobalInfos(globalKeys: GlobalKVKeySet): XDPromise<void> {
        const genSettingsKey: string = globalKeys.gSettingsKey;
        const genSettings: string = this._globalCache.get('genSettings');

        return this._checkAndWrite(genSettingsKey, genSettings, gKVScope.GLOB, true);
    }

    private _writeUserInfos(userKeys: UserKVKeySet): XDPromise<void> {
        const userSettingsKey: string = userKeys.gUserKey;
        const userSettings: object = this._userCache.get('userSettings');

        const wkbksKey: string = userKeys.wkbkKey;
        const wkbks: object = this._userCache.get('wkbks');

        const def1: XDPromise<void> = this._writeHelper(userSettingsKey,
            userSettings,
            gKVScope.USER);
        const def2: XDPromise<void> = this._writeHelper(wkbksKey,
            wkbks,
            gKVScope.USER);
        return PromiseHelper.when(def1, def2);
    }

    private _writeOneWkbk(
        wkbkInfoKeys: WkbkKVKeySet,
        wkbkName: string
    ): XDPromise<void> {
        const wkbkContainer: Map<string, any> = this._wkbksCache.get(wkbkName);
        const metaKey: string = wkbkInfoKeys.gStorageKey;
        const meta: object = wkbkContainer.get('meta');


        const def1: XDPromise<void> = this._writeHelper(metaKey, meta,
            gKVScope.WKBK, false, false, wkbkName);
        return PromiseHelper.when(def1);
    }

    private _writeWkbkInfo(wkbks: object): XDPromise<void> {
        const defArray: XDPromise<void>[] = [];
        for (let wkbkName in wkbks) {
            let wkbkInfoKeys: WkbkKVKeySet = wkbks[wkbkName];
            defArray.push(this._writeOneWkbk(wkbkInfoKeys, wkbkName));
        }
        return PromiseHelper.when.apply(this, defArray);
    }

    private _writeToNewVersion(upgradeKeys: object): XDPromise<void> {
        const def1: XDPromise<void> = this._writeGlobalInfos(upgradeKeys['global']);
        const def2: XDPromise<void> = this._writeUserInfos(upgradeKeys['user']);
        const def3: XDPromise<void> = this._writeWkbkInfo(upgradeKeys['wkbk']);
        return PromiseHelper.when(def1, def2, def3);
    }
    /* =========================== end of write part ======================== */
}
