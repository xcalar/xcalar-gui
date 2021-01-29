namespace WorkbookManager {
    let wkbkStore: KVStore;
    let activeWKBKId: string;
    let lastActiveWKBKId: string; // last workbook before switching
    let wkbkSet: WKBKSet;
    let checkInterval: number = 2000; // progress bar check time
    let progressTimeout: any;
    const descriptionKey: string = "workBookDesc-1";
    const sysWkbkNamePattern: string = ".system_workbook_";
    const xdInternalWkbkName: string = sysWkbkNamePattern + "xd";
    let _isSetup = false;
    let _currentSession: string;

    /**
    * WorkbookManager.setup
    * initial setup
    */
    export function setup(): XDPromise<string> {
        initializeVariable();
        setupSessionCancel();
        KVStore.setupWKBKKey();
        return setupWorkbooks();
    }

    /**
     * WorkbookManager.hasSetup
     */
    export function hasSetup(): boolean {
        return _isSetup;
    }

    function setupWorkbooks(refreshing?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        WorkbookManager.getWKBKsAsync(refreshing)
        .then(syncSessionInfo)
        .then(function(wkbkId) {
            _isSetup = true;
            if (wkbkId == null) {
                setURL(null, true);
                deferred.reject(WKBKTStr.NoWkbk);
            } else {
                setActiveWKBK(wkbkId);
                setURL(wkbkId, true);
                deferred.resolve(wkbkId);
            }
        })
        .fail(function(error) {
            if (error !== WKBKTStr.NoWkbk) {
                console.error("Setup Workbook fails!", error);
            } else {
                _isSetup = true;
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
    * WorkbookManager.upgrade
    * upgrades the list of workbooks to newer versions
    * @param oldWkbks - the current set of workbooks
    */
    export function upgrade(oldWkbks: object): object {
        if (oldWkbks == null) {
            return null;
        }

        const newWkbks: object = {};
        for (let wkbkId in oldWkbks) {
            const wkbk: WKBK = oldWkbks[wkbkId];
            newWkbks[wkbkId] = KVStore.upgrade(wkbk, "WKBK");
        }

        return newWkbks;
    };

    /**
    * WorkbookManager.commit
    * Commits the active workbook and saves it
    */
    export function commit(): XDPromise<void> {
        // if activeWKBK is null, then it's creating a new WKBK
        if (activeWKBKId != null) {
            const wkbk: WKBK = wkbkSet.get(activeWKBKId);
            if (wkbk != null) {
                wkbk.update();
            }
        }

        return saveWorkbook();
    };

    /**
    * WorkbookManager.getWorkbooks
    * Returns the set of workbooks
    */
    export function getWorkbooks(): object {
        return wkbkSet.getAll();
    };

    /**
    * WorkbookManager.getWorkbook
    * Returns a workbook based on id
    * @param workbookId - id of the target workbook
    */
    export function getWorkbook(workbookId: string): WKBK | null {
        return wkbkSet && wkbkSet.get(workbookId) || null;
    };

    /**
    * WorkbookManager.getWKBKsAsync
    * gets workbook based on id asyncronously
    * @param refreshing - boolean, if only refreshing perform no modifications
    */
    export function getWKBKsAsync(refreshing?: boolean): XDPromise<{oldWorkbooks: any, sessionInfo: any, refreshing: boolean}> {
        const deferred: XDDeferred<{oldWorkbooks: any, sessionInfo: any, refreshing: boolean}> = PromiseHelper.deferred();
        let sessionInfo: object[];

        XcalarListWorkbooks("*", true)
        .then(function(sessionRes) {
            sessionInfo = sessionRes;
            return wkbkStore.getAndParse();
        })
        .then(function(wkbks) {
            deferred.resolve({oldWorkbooks: wkbks, sessionInfo: sessionInfo, refreshing: refreshing});
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    export function updateMemUsage(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        Admin.getMemUsage(XcUser.getCurrentUserName())
        .then((res) => {
            res = res || {};
            const wkbks = wkbkSet.getAll();
            for (let id in wkbks) {
                const wkbk = wkbks[id];
                const stats = res[wkbk.getName()];
                if (stats) {
                    wkbk.setMemUsed(stats["Total Memory"]);
                }
            }
            deferred.resolve(res);
        })
        .fail((e) => {
            deferred.reject(e);
        });
        return deferred.promise();
    }

    /**
    * WorkbookManager.getActiveWKBK
    * gets active workbook
    */
    export function getActiveWKBK(): string {
        return activeWKBKId;
    };

    // returns the last active workbook before a switch wkbk was made
    export function getLastActiveWKBK(): string {
        return lastActiveWKBKId || activeWKBKId;
    }

    function setActiveWKBK(workbookId: string): boolean {
        let name: string = "N/A";

        if (workbookId == null) {
            activeWKBKId = null;
            setSessionName(null);
            $("#mainTopBar .wkbkName").text(name);
            return true;
        }

        const wkbk: WKBK = wkbkSet.get(workbookId);
        if (wkbk == null) {
            // error case
            return false;
        }

        lastActiveWKBKId = activeWKBKId;
        activeWKBKId = workbookId;
        name = wkbk.getName()
        setSessionName(name);
        $("#mainTopBar .wkbkName").text(name);
        return true;
    }

    function setURL(workbookId: string, replace: boolean, newTab: boolean = false): void {
        try {
            const curHref: string = window.location.href;
            let workbookName: string = null;
            let newHref: string;
            if (workbookId != null && wkbkSet.has(workbookId)) {
                workbookName = wkbkSet.get(workbookId).getName();
                newHref = xcHelper.setURLParam("project", workbookName);
            } else {
                newHref = xcHelper.deleteURLParam("project");
            }

            if (newTab) {
                const win: Window = window.open(newHref, '_blank');
                if (win) {
                    win.focus();
                }
                return;
            }

            if (!curHref.endsWith(newHref)) {
                if (replace) {
                    window.history.replaceState(window.history.state, workbookName, newHref);
                } else {
                    window.history.pushState("view project", workbookName, newHref);
                }
            }
        } catch (e) {
            console.error("set url error", e);
        }
    }

    /**
    * WorkbookManager.newWKBK
    * creates a new workbook
    * @param wkbkName - name of the new workbook
    * @param scrWKBKId - if duplicating a workbook, the source workbook, optional
    */
    export function newWKBK(wkbkName: string, srcWKBKId?: string): XDPromise<string> {
        if (!wkbkName) {
            return PromiseHelper.reject("Invalid name");
        }

        const isCopy: boolean = (srcWKBKId != null);
        let copySrc: WKBK = null;

        if (isCopy) {
            copySrc = wkbkSet.get(srcWKBKId);
            if (copySrc == null) {
                // when the source workbook's meta not exist
                return PromiseHelper.reject("missing workbook meta");
            }
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const copySrcName: string = isCopy ? copySrc.getName() : null;

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            return finishCreatingWKBK(wkbkName, isCopy, copySrc);
        })
        .then(function(wkbkId) {
            deferred.resolve(wkbkId);
        })
        .fail(function(error) {
            console.error("Create workbook failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.switchWKBK
    * switches between workbooks
    * @param wkbkId - id of the workbook to switch to
    * @param newTab - should the workbook be opened in a new tab, by default false
    * @param workbookBox - if opening in a new tab, the workbook card that should be updated to active, optional
    */
    export function switchWKBK(wkbkId: string, newTab: boolean = false, $workbookBox?: JQuery): XDPromise<void> {
        // validation
        if (wkbkId === activeWKBKId) {
            return PromiseHelper.reject({
                "error": "Cannot switch to the same project"
            });
        }

        const toWkbk: WKBK = wkbkSet.get(wkbkId);
        if (toWkbk == null) {
            return PromiseHelper.reject({
                "error": "Invalid notebook Id"
            });
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (!newTab) {
            $("#initialLoadScreen").show();
        } else {
            if ($workbookBox.hasClass("active")) {
                setURL(wkbkId, false, true);
                deferred.resolve();
                return deferred.promise();
            }

            $workbookBox.addClass("loading");
        }
        const promise: XDPromise<void> = (!newTab && activeWKBKId != null) ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        XcSupport.stopHeartbeatCheck();
        promise
        .then(function() {
            return switchWorkBookHelper(toWkbk);
        })
        .then(function() {
            if (!newTab) {
                setActiveWKBK(wkbkId);
                return switchWorkbookAnimation();
            } else {
                setURL(wkbkId, false, true);
                $workbookBox.addClass("active");
                $workbookBox.find(".state").text(WKBKTStr.Active);
                deferred.resolve();
            }
        })
        .then(function() {
            if (!newTab) {
                WorkbookManager.gotoWorkbook(wkbkId);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            error = error || {error: "Error occurred while switching workbooks"};
            if (!newTab) {
                $("#initialLoadScreen").hide();
                $("#container").removeClass("switchingWkbk");
            }
            endProgressCycle();
            deferred.reject(error);
        })
        .always(function() {
            if (newTab) {
                $workbookBox.removeClass("loading");
            }
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    }

    /**
    * WorkbookManager.gotoWorkbook
    * navigates the browser to a workbook
    * @param workbookId - id of the workbook
    * @param replaceURL - bool, should the current url be replaced
    */
    export function gotoWorkbook(workbookId: string, replaceURL: boolean = false): void {
        setURL(workbookId, replaceURL);
        // PanelHistory.Instance.deletePanelParam();
        xcManager.reload();
    }

    /**
     * WorkbookManager.hasLoadingWKBK
     */
    export function hasLoadingWKBK(): boolean {
        return $("#initialLoadScreen").is(":visible") ||
        $("#workbookPanel .workbookBox").hasClass("loading")
    }

    function countdown(): XDPromise<void> {
        if (!$("#monitorTopBar").find(".wkbkTitle").is(":visible")) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let time: number = 3;
        const msg: string = xcStringHelper.replaceMsg(WKBKTStr.Refreshing, {
            time: time
        });
        $("#monitorTopBar").find(".wkbkTitle").text(msg);

        const interval: NodeJS.Timer = setInterval(function() {
            time--;
            if (time > 0) {
                const msg: string = xcStringHelper.replaceMsg(WKBKTStr.Refreshing, {
                    time: time
                });
                $("#monitorTopBar").find(".wkbkTitle").text(msg);
            } else {
                clearInterval(interval);
                deferred.resolve();
            }
        }, 1000);

        return deferred.promise();
    }

    /**
     * WorkbookManager.getXDInternalSessionName
     */
    export function getXDInternalSessionName(): string {
        return xdInternalWkbkName;
    }

    /**
     * WorkbookManager.switchToXDInternalSession
     */
    export function switchToXDInternalSession(): void {
        // only set when no current session
        if (!sessionName) {
            _currentSession = sessionName;
            setSessionName(xdInternalWkbkName);
        }
    }

    /**
     * WorkbookManager.resetXDInternalSession
     */
    export function resetXDInternalSession(): void {
        // only reset when current session it not null
        if (_currentSession) {
            setSessionName(_currentSession);
            _currentSession = undefined;
        }
    }

    function isActiveWorkbook(workbookName: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();

        XcalarListWorkbooks(workbookName, true)
        .then(function(ret) {
            const session: any = ret.sessions[0];
            const isActive: boolean = (session.state === "Active");
            deferred.resolve(isActive);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function switchWorkBookHelper(wkbk: WKBK): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const wkbkName: string = wkbk.getName();
        const queryName: string = XcUser.getCurrentUserName() + ":" + wkbkName;

        $("#initialLoadScreen").data("curquery", queryName);
        $("#container").addClass("switchingWkbk");

        cleanProgressCycle(queryName)
        .then(() => {
            progressCycle(queryName, checkInterval);
            $("#initialLoadScreen").data("curquery", queryName);
            $("#container").addClass("switchingWkbk");
            return XcalarActivateWorkbook(wkbkName);
        })
        .then(() => {
            if (!wkbk.hasResource()) {
                return writeResetDagFlag(wkbkName);
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error && error.canceled) {
                deferred.reject(error);
                return;
            }
            console.error(error);

            isActiveWorkbook(wkbkName)
            .then(function(isActive) {
                if (isActive) {
                    // when it's active
                    deferred.resolve();
                } else {
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);
        })
        .always(function() {
            $("#initialLoadScreen").removeClass("canceling")
                                   .removeData("canceltime");
            $("#initialLoadScreen").find(".animatedEllipsisWrapper .text")
                                    .text(StatusMessageTStr.PleaseWait);
            $("#container").removeClass("switchingWkbk");
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "activate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        });

        return deferred.promise();
    }

    function writeResetDagFlag(workbookName: string): XDPromise<void> {
        const currentSession: string = sessionName;
        setSessionName(workbookName);
        const promise = DagList.Instance.markToResetDags();
        setSessionName(currentSession);
        return PromiseHelper.alwaysResolve(promise);
    }

    /**
    * WorkbookManager.copyWKBK
    * copies a workbook
    * @param srcWKBKId - id of the workbook to be copied
    * @param wkbkName - name of the new workbook
    */
    export function copyWKBK(srcWKBKId: string, wkbkName: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const promise: XDPromise<void> = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return WorkbookManager.newWKBK(wkbkName, srcWKBKId);
        })
        .then(function(newId) {
            if (copyHelper(srcWKBKId, newId)) {
                deferred.resolve(newId);
            } else {
                deferred.reject("Error when copy workbook meta data");
            }
        })
        .fail(function(error) {
            console.error("Copy Workbook fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.downloadWKBK
    * downloads a workbook
    * @param workbookName - name of the workbook to be downloaded
    */
    export function downloadWKBK(workbookName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $bg: JQuery = $("#initialLoadScreen");
        let timer = null;
        timer = setTimeout(() => {
            $bg.show();
        }, 1000);

        // XXX TODO: We should deal with load udfs in api layer,
        // so that we don't have to dupe. this code in
        // 1. Download project
        // 2. Download App
        // 3. Download Module
        // 4. Python SDK
        // Eventually this will be moved into expServer and be a part of a new "download" api
        let cleanupIntUDFs = async () => {};
        PromiseHelper.convertToJQuery(copyLoadUDFsToWB(workbookName))
        .then((cleanupFunc) => {
            cleanupIntUDFs = cleanupFunc;
        })
        .then(function() {
            return XcalarDownloadWorkbook(workbookName, "");
        })
        .then(function(file) {
            xcHelper.downloadAsFile(workbookName + ".xlrwb.tar.gz", file.sessionContent, "application/gzip");
            deferred.resolve();
        })
        .fail(function(err) {
            deferred.reject(err);
        })
        .always(() => {
            clearTimeout(timer);
            $bg.hide();
            cleanupIntUDFs();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.uploadWKBK
    * uploads a workbook from a file
    * @param workbookName - name of the workbook to upload
    * @param workbookContent - the file being uploaded
    * @param parsed? - byte string of the workbook's contents.
    *     Ignores workbookContent if specified, optional
    */
    export function uploadWKBK(workbookName: string, workbookContent: File, parsed?: string): XDPromise<string> {
        let deferred: XDDeferred<string> = PromiseHelper.deferred();

        let promise;
        if (parsed) {
            promise = PromiseHelper.resolve(parsed);
        } else {
            promise = xcHelper.readFile(workbookContent);
        }

        promise
        .then(function(res) {
            let parsedWorkbookContent = res;
            return XcalarUploadWorkbook(workbookName, parsedWorkbookContent, "");
        })
        .then(function() {
            return finishCreatingWKBK(workbookName, null, null);
        })
        .then(function(wkbkId) {
            deferred.resolve(wkbkId);
        })
        .fail(function(err) {
            deferred.reject(err);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.deactivate
    * deactivate a workbook by id
    * @param workbookId - id of the workbook to be deactivated
    */
    export function deactivate(workbookId: string): XDPromise<void> {
        const wkbk: WKBK = wkbkSet.get(workbookId);
        if (wkbk == null) {
            return PromiseHelper.reject(WKBKTStr.DeactivateErr);
        }

        // should stop check since seesion is released
        XcSupport.stopHeartbeatCheck();

        $("#initialLoadScreen").show();
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isCurrentWKBK: boolean = (workbookId === activeWKBKId);
        const promise: XDPromise<void> = isCurrentWKBK ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        promise
        .then(function() {
            return XcalarDeactivateWorkbook(wkbk.getName());
        })
        .then(function() {
            // no need to save as resource will be synced in setup
            wkbk.setResource(false);
            wkbk.setMemUsed(0);

            if (isCurrentWKBK) {
                setActiveWKBK(null);
                setURL(null, true);
            }
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(workbookId);
            xcSocket.sendMessage("refreshWorkbook", {
                "action": "deactivate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": workbookId
            });
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $("#initialLoadScreen").hide();
            endProgressCycle();
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.inActiveAllWKBK
    * deactivate all workbooks
    */
    export function inActiveAllWKBK(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promises: XDPromise<void>[] = [];

        XcalarListWorkbooks("*", true)
        .then(function(output) {
            const numSessions: number = output.numSessions;
            const sessions: any = output.sessions;
            for (let i: number = 0; i < numSessions; i++) {
                const session: any = sessions[i];
                if (session.state === "Active") {
                    promises.push(XcalarDeactivateWorkbook.bind(this,
                                                                session.name));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            setActiveWKBK(null);
            WorkbookManager.gotoWorkbook(null, true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
    * WorkbookManager.updateDescription
    * update the description of a workbook
    * @param wkbkId - id of the workbook to be updated
    * @param description - new description
    */
    export function updateDescription(wkbkId: string, description: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const wkbk: WKBK = wkbkSet.get(wkbkId);
        wkbk.setDescription(description);
        wkbk.update();

        saveDescription(wkbk.getName(), description)
        .then(function() {
            return saveWorkbook();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "description",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": wkbkId
            });
            deferred.resolve(wkbkId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
    * WorkbookManager.renameWKBK
    * update the name of a workbook
    * @param srcWKBKId - id of the workbook to be updated
    * @param newName - new name for the workbook
    * @param description - description of the workbook
    */
    export function renameWKBK(srcWKBKId: string, newName: string, description: string): XDPromise<string> {
        newName = newName.trim();
        const newWKBKId: string = getWKBKId(newName);
        if (wkbkSet.has(newWKBKId)) {
            let errStr: string = xcStringHelper.replaceMsg(ErrTStr.WorkbookExists, {
                workbookName: newName
            });
            return PromiseHelper.reject(errStr);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const isCurrentWKBK: boolean = (srcWKBKId === activeWKBKId);
        const srcWKBK: WKBK = wkbkSet.get(srcWKBKId);

        // should follow following order:
        // 1. stop heart beat check (in case key is changed)
        // 2. copy meta to new wkbkb,
        // 3. rename wkbk
        // 4. delete meta in current wkbk
        // 5. update wkbkSet meta
        // 6. reset KVStore and change active key if change current wkbk's name
        // 7. restart heart beat check
        XcSupport.stopHeartbeatCheck();

        const promise: XDPromise<void> = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // when no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return XcalarRenameWorkbook(newName, srcWKBK.getName());
        })
        .then(function() {
            const options: WKBKOptions = {
                "id": newWKBKId,
                "name": newName,
                "description": description || srcWKBK.getDescription(),
                "created": srcWKBK.getCreateTime(),
                "resource": srcWKBK.hasResource(),
                "sessionId": srcWKBK.sessionId,
                "modified": undefined,
                "noMeta": false
            };

            const newWkbk: WKBK = new WKBK(options);
            wkbkSet.put(newWKBKId, newWkbk);
            wkbkSet.delete(srcWKBK.getId());
            return saveWorkbook();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "rename",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": srcWKBKId,
                "oldName": srcWKBK.getName(),
                "newName": newName
            });
            if (isCurrentWKBK) {
                /// Change workbookname in status bar
                $("#mainTopBar .wkbkName").text(newName);
                return resetActiveWKBK(newWKBKId);
            }
        })
        .then(function() {
            deferred.resolve(newWKBKId);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.deleteWKBK
    * deletes a given workbook
    * @param workbookId - id of the workbook to be deleted
    */
    export function deleteWKBK(workbookId: string): XDPromise<any> {
        const workbook: WKBK = wkbkSet.get(workbookId);

        if (workbook == null) {
            return PromiseHelper.reject(WKBKTStr.DelErr);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        // 1. Stop heart beat check (Heartbeat key may change due to active
        //                           worksheet changing)
        // 2. Delete workbook form backend
        // 3. Delete the meta data for the current workbook
        // 4. Restart heart beat check
        XcSupport.stopHeartbeatCheck();

        XcalarDeleteWorkbook(workbook.getName())
        .then(function() {
            wkbkSet.delete(workbook.getId());
            return WorkbookManager.commit();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "delete",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk":workbookId
            });
            deferred.resolve.apply(this, arguments);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.getIDfromName
    * constructs a workbook id based on name
    * @param name - name of the workbook
    */
    export function getIDfromName(name: string): string {
        return getWKBKId(name);
    };

    function initializeVariable(): void {
        // key that stores all workbook infos for the user
        const wkbkKey: string = getWKbkKey(Durable.Version);
        wkbkStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkSet = new WKBKSet();
    }

    function setupSessionCancel(): void {
        const $loadScreen: JQuery = $("#initialLoadScreen");
        $loadScreen.find(".cancel").click(function() {
            if ($loadScreen.hasClass("canceling")) {
                return;
            }
            $loadScreen.addClass("canceling");
            const time: number = Date.now();
            $loadScreen.data('canceltime', time);
            $loadScreen.addClass("alertOpen");

            Alert.show({
                "title": WKBKTStr.CancelTitle,
                "msg": WKBKTStr.CancelMsg,
                "hideButtons": ["cancel"],
                "buttons": [{
                    "name": AlertTStr.Close,
                    "className": "btn-cancel",
                    func: function() {
                        $loadScreen.removeClass("canceling alertOpen");
                    }
                }, {
                    "name": AlertTStr.Confirm,
                    func: cancel
                }],
                "onCancel": function() {
                    $loadScreen.removeClass("canceling alertOpen");
                },
                "ultraHighZindex": true
            });

            function cancel(): void {
                $loadScreen.removeClass("alertOpen");
                if ($loadScreen.data("canceltime") !== time ||
                    !$loadScreen.hasClass("canceling")) {
                    return;
                }
                endProgressCycle();

                $loadScreen.find(".animatedEllipsisWrapper .text")
                           .text(StatusMessageTStr.Canceling);
                const queryName: string = $loadScreen.data("curquery");
                XcalarQueryCancel(queryName)
                .always(function() {
                    $loadScreen.removeClass("canceling")
                               .removeData("canceltime");
                    $loadScreen.find(".animatedEllipsisWrapper .text")
                               .text(StatusMessageTStr.PleaseWait);
                });
            }
        });
    }

    function getWKbkKey(version: number): string {
        const username: string = XcUser.getCurrentUserName();
        return generateKey(username, "workbookInfos", version);
    }

    /**
    * WorkbookManager.getGlobalScopeKeys
    * gets global scope keys
    * @param version - version number
    */
    export function getGlobalScopeKeys(version: number): any {
        const gSettingsKey: string = generateKey("", "gSettings", version);
        const gShareUDFKey: string = generateKey("", "gShareUDF", version);
        const gLoadHistoryListPrefix: string = generateKey("/XD/LoadLog", version);
        const gLoadHistoryArchivePrefix: string = generateKey("/XD/LoadArchive", version);

        return {
            gSettingsKey,
            gShareUDFKey,
            gLoadHistoryListPrefix,
            gLoadHistoryArchivePrefix
        };
    }

    /**
    * WorkbookManager.getUserScopeKeys
    * gets user scope keys
    * @param version - version number
    */
    export function getUserScopeKeys(version: number): any {
        const username: string = XcUser.getCurrentUserName();
        const gUserKey: string = generateKey(username, "gUser", version);
        const gUserCustomOpKey: string = generateKey(username, 'gUserCustomOp', version);
        const gUserTooltipKey: string = generateKey(username, 'gUserTooltip', version);

        return {
            "gUserKey": gUserKey,
            "gUserCustomOpKey": gUserCustomOpKey,
            "gUserTooltipKey": gUserTooltipKey,
        };
    }

    /**
    * WorkbookManager.getWkbkScopeKeys
    * gets workbook scope keys
    * @param version - version number
    */
    export function getWkbkScopeKeys(version: number): any {
        const gStorageKey: string = generateKey("gInfo", version);
        const gQueryListPrefix: string = generateKey("/XD/QueryLog", version);
        const gQueryArchivePrefix: string = generateKey("/XD/QueryArchive", version);
        const gSQLManagerKey: string = generateKey("gSQLManagerKey", version);
        const gDagManagerKey: string = generateKey("gDagManagerKey", version);
        const gUDFManagerKey: string = generateKey("gUDFManagerKey", version);
        const gUDFSnippetQuery: string = generateKey('gUDFSnippetQuery', version);
        const gTableManagerKey: string = generateKey("gTableManagerKey", version);
        const gDagTableManagerKey: string = generateKey("gDagTableManagerKey", version);
        const gDagAggKey: string = generateKey("gDagAggKey", version);
        const gAppListKey: string = generateKey("gAppListKey", version);
        const gDagListKey: string = generateKey("gDagListKey", version);
        const gSQLFuncListKey: string = generateKey("gSQLFuncListKey", version);
        const gOptimizedDagListKey: string = generateKey("gOptimizedDagListKey", version);
        const gDagResetKey: string = generateKey("gDagResetKey", version);
        const gDagParamKey: string = generateKey("gDagParamKey", version);
        const gSQLQueryKey: string = generateKey("gSQLQuery", version);
        const gSQLQueriesKey: string = generateKey("gSQLQueries", version);
        const gSQLSnippetQuery: string = generateKey("gSQLSnippetQuery", version);
        const gStoredDatasetsKey: string = generateKey("gStoredDatasetsKey", version);
        const gIdCountKey: string = generateKey("gIdCount", version);
        const gPopupManagerKey: string = generateKey("gPopupManagerKey", version);

        return {
            "gStorageKey": gStorageKey,
            "gQueryListPrefix": gQueryListPrefix,
            "gQueryArchivePrefix": gQueryArchivePrefix,
            "gSQLQuery": gSQLQueryKey,
            "gSQLQueries": gSQLQueriesKey,
            "gSQLManagerKey": gSQLManagerKey,
            "gDagManagerKey": gDagManagerKey,
            "gUDFManagerKey": gUDFManagerKey,
            "gUDFSnippetQuery": gUDFSnippetQuery,
            "gTableManagerKey": gTableManagerKey,
            "gDagTableManagerKey": gDagTableManagerKey,
            "gDagAggKey": gDagAggKey,
            "gAppListKey": gAppListKey,
            "gDagListKey": gDagListKey,
            "gSQLFuncListKey": gSQLFuncListKey,
            "gOptimizedDagListKey": gOptimizedDagListKey,
            "gDagResetKey": gDagResetKey,
            "gDagParamKey": gDagParamKey,
            "gSQLSnippetQuery": gSQLSnippetQuery,
            "gStoredDatasetsKey": gStoredDatasetsKey,
            "gIdCountKey": gIdCountKey,
            "gPopupManagerKey": gPopupManagerKey
        };
    }

    // sync sessionInfo with wkbkInfo
    function syncSessionInfo(info: {oldWorkbooks: object, sessionInfo: any, refreshing: boolean}): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const {oldWorkbooks, sessionInfo, refreshing} = info;
        const promise = PromiseHelper.convertToJQuery(syncWorkbookMeta(oldWorkbooks, sessionInfo, refreshing));

        promise
        .then(function() {
            const activeWorkbooks: string[] = getActiveWorkbooks(sessionInfo);
            const activeId: string = getActiveWorkbookId(activeWorkbooks);
            deferred.resolve(activeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getActiveWorkbooks(sessionInfo: any): string[] {
        const numSessions: number = sessionInfo.numSessions;
        const sessions: any = sessionInfo.sessions;
        const activeWorkbooks: string[] = [];
        for (let i: number = 0; i < numSessions; i++) {
            if (sessions[i].state === "Active") {
                activeWorkbooks.push(sessions[i].name);
            }
        }
        return activeWorkbooks;
    }

    function getActiveWorkbookId(activeWorkbooks: string[]): string {
        const params: object = xcHelper.decodeFromUrl(window.location.href);
        const activeWKBKName: string = params["project"];
        if (activeWKBKName && activeWorkbooks.includes(activeWKBKName)) {//XXX includes does exist on array
            return getWKBKId(activeWKBKName);
        } else {
            return null;
        }
    }

    function checkResource(sessionInfo: string): boolean {
        return (sessionInfo.toLowerCase() === "has resources");
    }

    async function syncWorkbookMeta(oldWorkbooks: object, sessionInfo: any, refreshing: boolean): Promise<void> {
        try {
            if (oldWorkbooks == null) {
                oldWorkbooks = {};
            }
            const numSessions: number = sessionInfo.numSessions;
            const sessions: any = sessionInfo.sessions;
            if  (refreshing) {
                initializeVariable();
            }

            let loadSessionName = '.XcalarLoad';
            try {
                loadSessionName = XcalarLoad.workSessionName;
            } catch(_) {
                // Ignore errors;
            }
            let xdInternalSession: any;
            for (let i: number = 0; i < numSessions; i++) {
                const wkbkName: string = sessions[i].name;
                if (wkbkName === loadSessionName) {
                    // Hide wkbk for load
                    continue;
                }
                // Hide wkbk for system session usage: SDK-826
                if (wkbkName.startsWith(sysWkbkNamePattern)) {
                    if (wkbkName === xdInternalWkbkName) {
                        xdInternalSession = sessions[i];
                    }
                    continue;
                }
                const hasResouce: boolean = checkResource(sessions[i].info);
                const wkbkId: string = getWKBKId(wkbkName);
                let wkbk: WKBK;

                if (oldWorkbooks.hasOwnProperty(wkbkId)) {
                    wkbk = new WKBK(oldWorkbooks[wkbkId]);
                    delete oldWorkbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    wkbk = new WKBK({
                        "id": wkbkId,
                        "name": wkbkName,
                        "noMeta": true
                    });
                }

                const session = sessions[i];
                let description = session.description;
                // Note: this is only for upgrade
                const oldDescription = wkbk.getDescription();
                if (oldDescription && !description) {
                    description = oldDescription;
                    saveDescription(wkbkName, description);
                }
                wkbk.setSessionId(session.sessionId);
                wkbk.setResource(hasResouce);
                wkbk.setDescription(description);
                wkbkSet.put(wkbkId, wkbk);
            }

            for (let oldWkbkId in oldWorkbooks) {
                console.warn("Error!", oldWkbkId, "is missing.");
            }

            await activateXDInternalSession(xdInternalSession);

            if (refreshing) {
                return;
            } else {
                await saveWorkbook();
                return;
            }
        } catch (error) {
            console.error(error);
            throw new Error("error");
        }
    }

    async function activateXDInternalSession(xdInternalSession): Promise<void> {
        try {
            if (xdInternalSession == null) {
                await XcalarNewWorkbook(xdInternalWkbkName, false, undefined);
                await XcalarActivateWorkbook(xdInternalWkbkName);
                // console.log("create and activate",xdInternalWkbkName)
            } else if (xdInternalSession.state !== "Active") {
                await XcalarActivateWorkbook(xdInternalWkbkName);
                // console.log("activate",xdInternalWkbkName);
            }
        } catch (e) {
            console.error("activate xd internal session failed", e);
        }
    }
    /**
    * WorkbookManager.getKeysForUpgrade
    * gets all relevant keys when performing an upgrade
    * @param sessionInfo - information about the current session
    * @param version - version number
    */
    export function getKeysForUpgrade(sessionInfo: any, version: number): any {
        const globalKeys: any = WorkbookManager.getGlobalScopeKeys(version);
        const userKeys: any = getUserScopeKeysForUpgrade(version);
        const wkbkKeys: any = getWkbkScopeKeysForUpgrade(sessionInfo, version);

        return {
            "global": globalKeys,
            "user": userKeys,
            "wkbk": wkbkKeys
        };
    };

    /**
    * WorkbookManager.getStorageKey
    * gets storage key
    */
    export function getStorageKey(): string {
        return WorkbookManager.getWkbkScopeKeys(Durable.Version).gStorageKey;
    };

    /**
    * WorkbookManager.updateWorkbooks
    * updates workbook info from socket
    * @param info - info from socket containing operation, workbook id and new value
    */
    export function updateWorkbooks(info: any): void {
        if (!_isSetup) {
            return;
        }
        const activeWkbk: string = WorkbookManager.getActiveWKBK();
        if (info.action === "deactivate" &&
            activeWkbk && activeWkbk === info.triggerWkbk) {
            XcSupport.stopHeartbeatCheck();
            const wkbk: WKBK = wkbkSet.get(activeWkbk);
            wkbk.setResource(false);
            setActiveWKBK(null);
            setURL(null, true);
            WorkbookPanel.show();
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(activeWkbk);
            $("#container").addClass("noWorkbook");

            return;
        }
        setupWorkbooks(true)
        .always(function() {
            if (info.action === "rename") {
                if (activeWkbk && activeWkbk === info.triggerWkbk) {
                    $("#mainTopBar .wkbkName").text(info.newName);
                    const newWKBKId: string = getWKBKId(info.newName);
                    resetActiveWKBK(newWKBKId);
                }
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            } else if (info.action === "delete") {
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            }
            WorkbookPanel.listWorkbookCards();
        });
    };

    function getUserScopeKeysForUpgrade(version: number): any {
        let keys: any = WorkbookManager.getUserScopeKeys(version);
        const wkbkKeyOfVersion: string = getWKbkKey(version);

        keys = $.extend(keys, {
            "wkbkKey": wkbkKeyOfVersion
        });

        return keys;
    }

    function getWkbkScopeKeysForUpgrade(sessionInfo:any, version: number): any {
        const wkbks: any = {};
        const numSessions: number = sessionInfo.numSessions;
        const sessions: any = sessionInfo.sessions;

        for (let i: number = 0; i < numSessions; i++) {
            let wkbkName: string = sessions[i].name;
            const key: any = WorkbookManager.getWkbkScopeKeys(version);
            wkbks[wkbkName] = key;
        }

        return wkbks;
    }

    function saveWorkbook(): XDPromise<void> {
        return wkbkStore.put(wkbkSet.getWithStringify(), true);
    }

    function resetActiveWKBK(newWKBKId: string): XDPromise<void> {
        setActiveWKBK(newWKBKId);
        setURL(newWKBKId, true);
        // rehold the session as KVStore's key changed
        return XcUser.CurrentUser.holdSession(newWKBKId, true);
    }

    function saveDescription(workbookName: string, description: string): XDPromise<void> {
        const key: string = descriptionKey;
        const kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        const currentSession: string = sessionName;
        setSessionName(workbookName);
        const promise = kvStore.put(description, true, true);
        setSessionName(currentSession);
        return PromiseHelper.alwaysResolve(promise);
    }

    function finishCreatingWKBK(wkbkName: string, isCopy: boolean, copySrc: WKBK): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        // XXX for uploads, we should include description
        const options: WKBKOptions = {
            "id": getWKBKId(wkbkName),
            "name": wkbkName,
            "resource": false
        };

        if (isCopy) {
            options.modified = copySrc.getModifyTime();
        }

        let wkbk: WKBK = new WKBK(options);
        wkbkSet.put(wkbk.getId(), wkbk);

        saveWorkbook()
        .then(function() {
            // If workbook is active, make it inactive so that our UX is linear
            return XcalarListWorkbooks(wkbkName, true);
        })
        .then(function(retStruct) {
            if (retStruct.numSessions !== 1) {
                let error: string;
                if (retStruct.numSessions === 0) {
                    error = ErrTStr.NoWKBKErr;
                } else {
                    error = ErrTStr.MultipleWKBKErr;
                }
                console.error(error);
                deferred.reject(error);
            } else {
                try {
                    const session = retStruct.sessions[0];
                    wkbk.setSessionId(session.sessionId);
                    wkbk.setDescription (session.description);
                } catch (e) {
                    console.error(e);
                }

                if (retStruct.sessions[0].state === "Active") {
                    // This happens when there are no active sessions. The
                    // first one we create gets auto activated
                    xcAssert(!WorkbookManager.getActiveWKBK());
                    XcalarDeactivateWorkbook(retStruct.sessions[0].name)
                    .always(function() {
                        broadCast();
                        deferred.resolve(wkbk.getId());
                        // XXX Handle failure here separately! It should never
                        // happen...
                    });
                } else {
                    broadCast();
                    deferred.resolve(wkbk.getId());
                }
            }
        })
        .fail(deferred.reject);

        function broadCast(): void {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "newWorkbook",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        }

        return deferred.promise();
    }

    // helper for WorkbookManager.copyWKBK
    function copyHelper(srcId: string, newId: string): boolean {
        const oldWKBK: WKBK = wkbkSet.get(srcId);
        const newWKBK: WKBK = wkbkSet.get(newId);
        if (oldWKBK == null || newWKBK == null) {
            return false;
        }
        return true;
    }

    function commitActiveWkbk(): XDPromise<void> {
        // to switch workbook, should release all ref count first
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        PromiseHelper.alwaysResolve(TblManager.freeAllResultSetsSync())
        .then(function() {
            return KVStore.commit();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // generate key for KVStore use
    function generateKey(...args: any[]): string {
        // currently just cat all arguments as a key
        let key: string;
        for (let i: number = 0; i < args.length; i++) {
            if (args[i]) {
                if (!key) {
                    key = args[i];
                } else {
                    key += "-" + args[i];
                }
            }
        }
        return (key);
    }

    function getWKBKId(wkbkName: string): string {
        const username: string = XcUser.getCurrentUserName();
        return generateKey(username, "wkbk", wkbkName);
    }

    function switchWorkbookAnimation(failed: boolean = false): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!failed) {
            progressComplete();
        }
        const $loadScreen: JQuery = $("#initialLoadScreen");
        $loadScreen.removeClass("canceling").removeData("canceltime");
        $loadScreen.find(".animatedEllipsisWrapper .text")
                   .text(StatusMessageTStr.PleaseWait);
        countdown()
        .always(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    // Note: due to bug 12614, we need to delete the queryName first
    function cleanProgressCycle(queryName: string): XDPromise<void> {
        return PromiseHelper.alwaysResolve(XcalarQueryDelete(queryName));
    }

    function progressCycle(queryName: string, adjustTime?: number, retry: boolean = false): void {
        let intTime: number = checkInterval;
        if (adjustTime) {
            intTime = Math.max(200, checkInterval - adjustTime);
        }

        progressTimeout = <any>setTimeout(function() {
            const timeoutNum: number = progressTimeout;
            const startTime: number = Date.now();
            getProgress(queryName)
            .then(function(progress) {
                if (timeoutNum !== progressTimeout || progress.numTotal < 1) {
                    return;
                }

                const $loadScreen: JQuery = $("#initialLoadScreen");
                const $bar: JQuery = $loadScreen.find(".progressBar");
                const $numSteps: JQuery = $loadScreen.find(".numSteps");
                const $progressNode: JQuery = $loadScreen.find(".progressNode");
                if (!$loadScreen.hasClass("sessionProgress")) {
                    $loadScreen.addClass("sessionProgress");
                    $bar.stop().width(0).data("pct", 0);
                    $progressNode.text("").data("node", "");
                }
                $bar.data("totalsteps", progress.numTotal);
                $numSteps.text(progress.numCompleted + "/" + progress.numTotal);

                const prevNode: any = $progressNode.data("node");
                const curNode: any = progress.processingNode;
                let pct: number;
                if (curNode) {
                    $progressNode.text(StatusMessageTStr.CurrReplay + ": " +
                                        XcalarApisTStr[curNode.api])
                                 .data("node", curNode);
                    pct = Math.round(100 * curNode.numWorkCompleted /
                                           curNode.numWorkTotal);
                } else if (prevNode) {
                    $progressNode.text(StatusMessageTStr.CompReplay + ": " +
                                       XcalarApisTStr[prevNode.api]);
                    pct = 100;
                } else {
                    pct = 0;
                }
                pct = Math.max(pct, 0);
                pct = Math.min(pct, 100); // between 0 and 100

                if (prevNode && curNode &&
                    prevNode.dagNodeId !== curNode.dagNodeId) {
                    // new node so reset width
                    $bar.stop().width(0).data("pct", 0);
                }

                if (pct && pct >= $bar.data("pct")) {
                    let animTime: number = checkInterval;
                    if (pct === 100) {
                        animTime /= 2;
                    }
                    $bar.animate({"width": pct + "%"}, animTime, "linear");
                    $bar.data("pct", pct);
                }

                if (progress.numCompleted !== progress.numTotal) {
                    const elapsedTime: number = Date.now() - startTime;
                    progressCycle(queryName, elapsedTime);
                }
            })
            .fail(function() {
                if (timeoutNum !== progressTimeout) {
                    return;
                }
                if (!retry) {
                    progressCycle(queryName, null, true);
                }
            });
        }, intTime);
    }

    function getProgress(queryName: string): XDPromise<any> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        XcalarQueryState(queryName)
        .then(function(ret) {
            let state: any;
            let numCompleted: number = 0;
            let processingNode: string;
            for (let i: number = 0; i < ret.queryGraph.numNodes; i++) {
                state = ret.queryGraph.node[i].state;
                if (state === DgDagStateT.DgDagStateReady) {
                    numCompleted++;
                } else if (state === DgDagStateT.DgDagStateProcessing) {
                    processingNode = ret.queryGraph.node[i];
                }
            }
            const progress: any = {
                numCompleted: numCompleted,
                numTotal: ret.queryGraph.numNodes,
                processingNode: processingNode
            };
            deferred.resolve(progress);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function progressComplete(): void {
        const $loadScreen: JQuery = $("#initialLoadScreen");
        const $bar: JQuery = $loadScreen.find(".progressBar");
        const $numSteps: JQuery = $loadScreen.find(".numSteps");
        $bar.stop().width("100%").data('pct', 100);
        const numSteps: string = $bar.data("totalsteps");
        $numSteps.text(numSteps + "/" + numSteps);
        clearTimeout(progressTimeout);
    }

    function endProgressCycle(): void {
        clearTimeout(progressTimeout);
        progressTimeout += "canceled";
        $("#initialLoadScreen").removeClass("sessionProgress");
    }

    async function copyUDFsToWorkbook(udfs: Map<string, string>, workbookName: string): Promise<Array<() => Promise<void>>> {
        const cleanupTasks: Array<() => Promise<void>> = [];

        if (udfs.size === 0) {
            return cleanupTasks;
        }

        const copyUDF = async (udfPath: string, moduleName: string): Promise<() => Promise<void>> => {
            // Get UDF content
            const udfStr: string = await XIApi.callApiInSession(
                workbookName,
                () => XcalarDownloadPython(udfPath)
            );
            if (udfStr == null) {
                // Nothing to cleanup
                return async () => {};
            }

            // Upload to workbook
            await XIApi.callApiInSession(
                workbookName,
                () => XcalarUploadPython(moduleName, udfStr)
            );

            // Cleanup function: delete the udf from workbook
            return () => XIApi.callApiInSession(
                workbookName,
                () => XcalarDeletePython(moduleName, false)
            );
        };

        try {
            for (const [moduleName, udfPath] of udfs) {
                const cleanupTask = await copyUDF(udfPath, moduleName);
                cleanupTasks.push(cleanupTask);
            }
        } catch(e) {
            console.error('WorkbookManager.copyUDFsToWorkbook error: ', e);
            // Cleanup
            for (const cleanupTask of cleanupTasks) {
                try {
                    await cleanupTask();
                } catch(_) {
                    // Ignore errors
                }
            }
            // Throw error to notify caller
            throw e;
        }

        return cleanupTasks;
    }

    async function filterSharedUDFs(udfNames: Set<string>, workbookName: string): Promise<Map<string, string>> {
        const sharedUDFPrefix = xcHelper.constructUDFSharedPrefix();

        const sharedUDFs: Map<string, string> = new Map();
        for (const moduleName of udfNames) {
            try {
                const udfPath: string = await XIApi.callApiInSession(
                    workbookName,
                    () => XcalarUdfGetRes(XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession, moduleName)
                );
                if (udfPath.indexOf(sharedUDFPrefix) === 0) {
                    sharedUDFs.set(moduleName, udfPath);
                }
            } catch(e) {
                // There might happen when an invalid udf(ex. wrong module name) is used in a dag node
                // We just ignore bad guys, because it's user's responsibility to fix it
                console.error('WorkbookManager.filterSharedUDFs: ', e);
            }
        }

        return sharedUDFs;
    }

    async function copyLoadUDFsToWB(workbookName: string): Promise<() => Promise<void>> {
        // Activate seesion first
        try {
            await PromiseHelper.convertToNative(XcalarActivateWorkbook(workbookName))
        } catch(_) {
            // Ignore errors
        }

        // Read dag(graph) list
        const dagList = await XIApi.callApiInSession(
            workbookName,
            () => DagList.Instance.listUserDagAsync()
        );

        // Find out load UDFs
        const loadUDFs: Set<string> = new Set();
        for (const {id, type} of dagList.dags) {
            if (type != DagTabType.User) {
                continue;
            }

            try {
                // Read dag from kvstore
                const dagStore = new KVStore(id, gKVScope.WKBK);
                const dagJson = await XIApi.callApiInSession(
                    workbookName,
                    () => dagStore.getAndParse()
                );

                // Construct graph & get load udf path
                const graph = new DagGraph();
                graph.create(dagJson.dag);
                for (const moduleName of graph.getUsedLoaderUDFModules()) {
                    loadUDFs.add(moduleName);
                }
            } catch(e) {
                // Ignore a single error and try to load as much as possible
                console.error(`WorkbookManager.copyLoadUDFsToWB(id=${id}): `, e);
            }
        }

        // Find out all the shared load UDFs
        const sharedLoadUDFs = await filterSharedUDFs(loadUDFs, workbookName);

        // copy udfs to workkbook
        const cleanupUDFs = await copyUDFsToWorkbook(sharedLoadUDFs, workbookName);

        // Return a function that will do the cleanup job
        return async () => {
            for (const task of cleanupUDFs) {
                try {
                    await task();
                } catch(_) {
                    // Ignore errors
                }
            }
        };
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        let cacheActiveWKBKId: string = undefined;
        WorkbookManager["__testOnly__"] = {
            setAcitiveWKBKId: function(id) {
                cacheActiveWKBKId = activeWKBKId;
                activeWKBKId = id;
            },
            restoreWKBKId: function() {
                if (cacheActiveWKBKId !== undefined) {
                    activeWKBKId = cacheActiveWKBKId;
                    cacheActiveWKBKId = undefined;
                }
            },
            generateKey: generateKey,
            getWKBKId: getWKBKId,
            copyHelper: copyHelper,
            resetActiveWKBK: resetActiveWKBK,
            saveWorkbook: saveWorkbook,
            syncSessionInfo: syncSessionInfo,
            switchWorkBookHelper: switchWorkBookHelper,
            changeIntTime: function(time) {
                checkInterval = time;
            },
            progressCycle: progressCycle,
            endProgressCycle: endProgressCycle,
            countdown: countdown,
            setupWorkbooks: setupWorkbooks
        }
    }
    /* End Of Unit Test Only */
}
