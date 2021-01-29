/**
 * DagTabPublished used to be a read/execute only and shared dataflow tab
 * but since 2.2, the feature is removed and it is only used for the use of
 * dataflow upload/download
 */
class DagTabPublished extends DagTab {
    public static readonly PATH = "/Published/";
    // XXX TODO: encrypt it
    private static readonly _secretUser: string = ".xcalar.published.df";
    private static readonly _delim: string = "_Xcalar_";
    private static readonly _dagKey: string = "DF2";
    private static _currentSession: string;

    private _editVersion: number;

    private static _switchSession(sessionToSwitch: string): void {
        this._currentSession = sessionName;
        const user: XcUser = new XcUser(this._secretUser);
        XcUser.setUserSession(user);
        setSessionName(sessionToSwitch);
    }

    private static _resetSession(): void {
        XcUser.resetUserSession();
        setSessionName(this._currentSession);
    }

    public constructor(options: DagTabOptions) {
        options = options || <DagTabOptions>{};
        if (options.name) {
            options.name = options.name.replace(new RegExp(DagTabPublished._delim, "g"), "/");
        }
        if (options.dagGraph != null) {
            // should be a deep copy
            options.dagGraph = options.dagGraph.clone();
        }
        super(options);
        this._kvStore = new KVStore(DagTabPublished._dagKey, gKVScope.WKBK);
        this._editVersion = 0;
    }

    public load(reset?: boolean): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let dagInfoRes: any;

        this._loadFromKVStore()
        .then((ret) => {
            const {dagInfo, graph} = ret;
            dagInfoRes = dagInfo;
            this._editVersion = dagInfo.editVersion;
            if (reset) {
                this._resetHelper(graph);
            }
            this.setGraph(graph);
            if (reset) {
                return this._writeToKVStore();
            }
        })
        .then(() => {
            deferred.resolve(dagInfoRes);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public delete(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._deleteTableHelper()
        .then(() => {
            return this._deleteWKBK();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (error && typeof error === "object" && error.status === StatusT.StatusSessionNotFound) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public upload(content: string): XDPromise<{tabUploaded: DagTab, alertOption?: Alert.AlertOptions}> {
        const deferred: XDDeferred<{tabUploaded: DagTab, alertOption?: Alert.AlertOptions}> = PromiseHelper.deferred();
        DagTabPublished._switchSession(null);
        XcalarUploadWorkbook(this._getWKBKName(), content, "")
        .then((sessionId) => {
            this._id = sessionId;
            deferred.resolve({tabUploaded: this});
        })
        .fail(deferred.reject);

        DagTabPublished._resetSession();
        return deferred.promise();
    }

    public downloadApp(name: string): XDPromise<void> {
        return this._downloadHelper(name + gAppSuffix);
    }

    public exportAppToS3(name, bucketPath: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const appName = "NotebookApp";
        const path = bucketPath + name + gAppSuffix;
        const inStr = JSON.stringify({
            "op": "download_to_target",
            "notebook_name": this._getWKBKName(),
            "connector_name": "Xcalar S3 Connector",
            "notebook_path": path,
            "user_name": DagTabPublished._secretUser,
        });
        XcalarAppExecute(appName, false, inStr)
        .then(deferred.resolve)
        .fail((error) => {
            let errorStr = "";
            if (error.output && error.output.errStr) {
                errorStr = error.output.errStr;
                if (errorStr.includes('AccessDenied')) {
                    errorStr = 'Access Denied';
                }
            } else {
                errorStr = error.log || error.error;
            }
            deferred.reject(errorStr);
        });

        return deferred.promise();
    }

    public download(name: string): XDPromise<void> {
        let fileName: string = name || this.getShortName();
        fileName += gDFSuffix;
        return this._downloadHelper(fileName);
    }

    public async publishApp(appId: string): Promise<void> {
        let hasCreatWKBK: boolean = false;
        try {
            const sessionId = await this._createWKBK();
            hasCreatWKBK = true;
            this._id = sessionId;
            await this._activateWKBK();
            await this._copyLoaderUDFFromSharedToLocal(appId);
            await this._uploadAppModules(appId);
        } catch (e) {
            if (hasCreatWKBK) {
                // if fails and workbook has created
                // delete it as a rollback
                this._deleteWKBK();
            }
            throw e;
        }
    }

    public publish(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasCreatWKBK: boolean = false;
        this._createWKBK()
        .then((sessionId: string) => {
            hasCreatWKBK = true;
            this._id = sessionId;
            return this._activateWKBK();
        })
        .then(() => {
            return this._writeToKVStore();
        })
        .then(() => {
            const udfSet: Set<string> = this._dagGraph.getUsedUDFModules();
            return this._uploadLocalUDFToShared(udfSet);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (typeof error === "string") {
                error = {log: error};
            }
            if (hasCreatWKBK) {
                // if fails and workbook has created
                // delete it as a rollback
                this._deleteWKBK();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public copyUDFToLocal(overwrite: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const id: string = this._id;
        let udfPathPrefix: string = `/workbook/${DagTabPublished._secretUser}/${id}/udf/`;
        const udfPattern: string = udfPathPrefix + "*";

        XcalarListXdfs(udfPattern, "User*")
        .then((res) => {
            const udfAbsolutePaths = {};
            const prefixLen: number = udfPathPrefix.length;
            res.fnDescs.forEach((fnDesc) => {
                const path = fnDesc.fnName.split(":")[0];
                const moduelName = path.substring(prefixLen);
                udfAbsolutePaths[path] = moduelName;
            });
            return this._downloadSharedUDFToLocal(udfAbsolutePaths, overwrite)
        })
        .then(() => {
            UDFFileManager.Instance.refresh(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _loadFromKVStore(): XDPromise<any> {
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = super._loadFromKVStore();
        DagTabPublished._resetSession();
        return promise;
    }

    // save meta
    // XXX TODO: add socket to lock other users
    protected _writeToKVStore(): XDPromise<any> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const json = this._getDurable();
        if (json == null) {
            return PromiseHelper.reject("Invalid plan structure");
        }
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = super._writeToKVStore(json);
        DagTabPublished._resetSession();
        return promise;
    }

    protected _getDurable(): DagTabPublishedDurable {
        const json: DagTabPublishedDurable = <DagTabPublishedDurable>super._getDurable();
        json.editVersion = this._editVersion;
        return json;
    }

    private _getWKBKName(name?: string): string {
        name = name || this._name;
        return name.replace(/\//g, DagTabPublished._delim);
    }

    private _createWKBK(): XDPromise<string> {
        DagTabPublished._switchSession(null);
        const promise = XcalarNewWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _activateWKBK(): XDPromise<void> {
        DagTabPublished._switchSession(null);
        const promise = XcalarActivateWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _deleteWKBK(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // XXX TODO Should not require deactivate (bug 14090)
        PromiseHelper.alwaysResolve(this._deactivateHelper())
        .then(() => {
            DagTabPublished._switchSession(null);
            const promise = XcalarDeleteWorkbook(this._getWKBKName());
            DagTabPublished._resetSession();
            return promise;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deactivateHelper(): XDPromise<void> {
        DagTabPublished._switchSession(null);
        const promise = XcalarDeactivateWorkbook(this._getWKBKName());
        DagTabPublished._resetSession();
        return promise;
    }

    private _transferUDF(moduleName: string): XDPromise<void> {
        let downloadHelper = (moduleName: string): XDPromise<string> => {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const udfPath = UDFFileManager.Instance.getCurrWorkbookPath() + moduleName;
            UDFFileManager.Instance.getEntireUDF(udfPath)
            .then((udfStr: string) => {
                deferred.resolve(udfStr);
            })
            .fail((error, isDownloadErr) => {
                if (isDownloadErr) {
                    // when download udf has error
                    deferred.reject(error);
                } else {
                    // when the local udf not exist, it should be a gloal one
                    deferred.resolve(null);
                }
            });

            return deferred.promise();
        };

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        downloadHelper(moduleName)
        .then((udfStr) => {
            if (udfStr == null) {
                // nothing to upload
                return;
            }
            // XXX TODO: use absolute path
            DagTabPublished._switchSession(this._getWKBKName());
            const promise = XcalarUploadPython(moduleName, udfStr);
            DagTabPublished._resetSession();
            return promise;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _downloadHelper(fileName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabPublished._switchSession(null);
        const promise = XcalarDownloadWorkbook(this._getWKBKName(), "");
        DagTabPublished._resetSession();

        promise
        .then((file) => {
            xcHelper.downloadAsFile(fileName, file.sessionContent, "application/gzip");
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private async _uploadAppModules(appId: string): Promise<void> {
        const udfSet: Set<string> = new Set();
        const promises = [];
        DagList.Instance.getAllDags().forEach((tab) => {
            if (tab.getApp() === appId) {
                if (tab instanceof DagTabUser) {
                    promises.push(this._writeModuleToWKBKKVStore(tab, udfSet));
                } else {
                    // current valid tab in app is DagTabUser or DagTabMain
                    throw new Error("Invalid type of plan exist in the app");
                }
            }
        });
        await Promise.all(promises);
        await this._uploadLocalUDFToShared(udfSet);
    }

    private async _copyLoaderUDFFromSharedToLocal(appId: string): Promise<void> {
        const udfAbsolutePaths = {};
        const promises = [];
        DagList.Instance.getAllDags().forEach((tab) => {
            if (tab.getApp() === appId) {
                if (tab instanceof DagTabUser) {
                    promises.push(this._findLoaderUDFs(tab, udfAbsolutePaths));
                } else {
                    // current valid tab in app is DagTabUser or DagTabMain
                    throw new Error("Invalid type of plan exist in the app");
                }
            }
        });
        await Promise.all(promises);
        await this._downloadSharedUDFToLocal(udfAbsolutePaths, true)
        await UDFFileManager.Instance.refresh(true);

    }
    private async _findLoaderUDFs(
        tab: DagTabUser,
        udfAbsolutePaths: object
    ): Promise<void> {
        const sharedUDFsPrefix = xcHelper.constructUDFSharedPrefix()
        if (tab.getGraph() == null) {
            await tab.load();
        }
        tab.getGraph().getUsedLoaderUDFModules().forEach((moduleName) => {
            udfAbsolutePaths[sharedUDFsPrefix + moduleName] = moduleName;
        });
    }


    private async _writeModuleToWKBKKVStore(
        tab: DagTabUser,
        udfSet: Set<string>
    ): Promise<void> {
        if (tab.getGraph() == null) {
            await tab.load();
        }
        const tabUDFSet = tab.getGraph().getUsedUDFModules();
        tabUDFSet.forEach((moduleName) => udfSet.add(moduleName));

        const loaderUDFSet = tab.getGraph().getUsedLoaderUDFModules();
        loaderUDFSet.forEach((moduleName) => udfSet.add(moduleName));

        const cloned = tab.clone();
        DagTabPublished._switchSession(this._getWKBKName());
        const promise = cloned.save();
        DagTabPublished._resetSession();
        await promise;
    }

    private _uploadLocalUDFToShared(udfSet: Set<string>): XDPromise<void> {
        const promises: XDPromise<void>[] = [];
        udfSet.forEach((moduleName) => {
            // console.log("_uploadLocalUDFToShare(" + moduleName + ")");
            if (moduleName !== "default") {
                promises.push(this._transferUDF(moduleName));
            }
        });
        return PromiseHelper.when(...promises);
    }

    private _downloadSharedUDFToLocal(
        udfAbsolutePaths: object,
        overwrite: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const failures: string[] = [];

        let upload = (udfPath: string, moduleName: string): XDPromise<void> => {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let udfStr: string = null;
            XcalarDownloadPython(udfPath)
            .then((res) => {
                udfStr = res;
                if (udfStr == null) {
                    // nothing to upload
                    return;
                }

                let promise = null;
                if (overwrite) {
                    promise = XcalarUploadPython(moduleName, udfStr);
                } else {
                    promise = XcalarUploadPythonRejectDuplicate(moduleName, udfStr);
                }
                return promise;
            })
            .then(() => {
                innerDeferred.resolve();
            })
            .fail((error) => {
                console.error("Upload UDF to local fails", error);
                let errorMsg: string = error.log || error.error;
                failures.push(moduleName + ": " + errorMsg);
                innerDeferred.resolve(); // still resolve it
            });

            return innerDeferred.promise();
        }

        const promises: XDPromise<void>[] = [];
        for (let path in udfAbsolutePaths) {
            promises.push(upload(path, udfAbsolutePaths[path]));
        }

        PromiseHelper.when(...promises)
        .then(() => {
            if (failures.length > 0) {
                deferred.reject({
                    error: failures.join("\n")
                });
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject)
        return deferred.promise();
    }
}
