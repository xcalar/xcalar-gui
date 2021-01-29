namespace Log {
    let $undo: JQuery; // $("#undo");
    let $redo: JQuery; // $("#redo");

    // keep in sync with initialize
    let logCursor: number = -1;
    let logCache: {
        logs: XcLog[],
        errors: XcLog[],
        overwrittenLogs: XcLog[],
        version?: string
    } = {
        "logs": [],
        "errors": [],
        "overwrittenLogs": [] // stores logs overwritten after an undo
    };
    let logs: XcLog[] = logCache.logs;
    let errors: XcLog[] = logCache.errors;
    let overwrittenLogs: XcLog[] = logCache.overwrittenLogs;
    // mark if it's in a undo redo action
    let _isUndo: boolean = false;
    let _isRedo: boolean = false;
    let shouldOverWrite: boolean = false;
    let lastRestoreCursor: number = logCursor;

    // constant
    let logLocalStoreKey: string = "xcalar-query";
    let UndoType = {
        "Valid": 0,   // can undo/redo
        "Skip": 1,   // should skip undo/redo
        "Invalid": 2    // cannot undo/redo
    };
    let isOverflow: boolean = false;

    /**
     * Log.setup
     */
    export function setup(): void {
        $undo = $("#undo");
        $redo = $("#redo");

        initialize();
        updateUndoRedoState();
    }

    /**
     * Log.add
     * @param title
     * @param options
     * @param cli
     * @param willCommit
     */
    export function add(title: string, options: any, cli?: string): void {
        options = options || {};

        if ($.isEmptyObject(options)) {
            console.warn("Options for" + title + "is empty!");
            return;
        }

        if (_isUndo || _isRedo) {
            return;
        }

        let xcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli
        });

        addLog(xcLog);
        updateUndoRedoState();

        if (typeof mixpanel !== "undefined") {
            xcMixpanel.transactionLog(xcLog);
        }
    }

    /**
     * Log.errorLog
     * @param title
     * @param options
     * @param cli
     * @param error
     */
    export function errorLog(title, options, cli, error) {
        let xcLog: XcLog = new XcLog({
            "title": title,
            "options": options,
            "cli": cli,
            "error": error
        });
        errors.push(xcLog);
        localCommit();
    }

    /**
     * Log.getCursor
     */
    export function getCursor(): number {
        return logCursor;
    }

    /**
     * Log.getLogs
     */
    export function getLogs(): XcLog[] {
        return logs;
    }

    /**
     * Log.getErrorLogs
     * @param condensed
     */
    export function getErrorLogs(condensed?: boolean): XcLog[] {
        if (condensed) {
            return getCondensedErrors();
        } else {
            return errors;
        }
    }

    /**
     * Log.getAllLogs
     * @param condensed
     */
    export function getAllLogs(condensed?: boolean): {
        logs: XcLog[],
        errors: XcLog[],
        overwrittenLogs: XcLog[],
        version?: string
    } {
        if (condensed) {
            return {"logs": logs,
                    "errors": getCondensedErrors(),
                    "overwrittenLogs": overwrittenLogs,
                    "version": XVM.getVersion(true)
                };
        } else {
            return logCache;
        }
    }

    /**
     * Log.getLocalStorage
     */
    export function getLocalStorage(): string {
        return xcLocalStorage.getItem(logLocalStoreKey);
    }

    /**
     * Log.getBackup
     */
    export function getBackup(): string {
        let key = logLocalStoreKey + "-backup";
        return xcLocalStorage.getItem(key);
    }

    /**
     * Log.backup
     */
    export function backup(): void {
        if (xcManager.isInSetup() || isOverflow) {
            // start up time error don't trigger backup
            // or it may overwrite old log backup
            return;
        }

        let key: string = logLocalStoreKey + "-backup";
        if (!xcLocalStorage.setItem(key, JSON.stringify(logCache))) {
            isOverflow = true;
            // Remove logCache from local storage because
            // it's no longer up to date and may be misleading
            // but takes up memory which may affect other storage
            xcLocalStorage.removeItem(key);
        }
    }

    /**
     * Log.undo
     * @param step
     * @param inBackground, to do it behind the scenes without user knowing
     */
    export function undo(step?: number, inBackground?: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcAssert((_isUndo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        let c: number = logCursor;
        let promises: XDPromise<void>[] = [];

        for (let i = 0; i < step; i++) {
            if (c < 0) {
                // cannot undo anymore
                break;
            }

            // find the first log that can undo/redo
            while (c >= 0 && getUndoType(logs[c]) === UndoType.Skip) {
                c--;
            }

            if (c < 0) {
                // this is an error case
                console.warn("Cannot find log to undo");
                break;
            }

            let xcLog = logs[c];
            if (getUndoType(xcLog) !== UndoType.Valid) {
                // cannot undo
                break;
            }

            promises.push(undoLog.bind(this, xcLog, c));
            c--;
        }

        _isUndo = true;
        lockUndoRedo();
        let passed: boolean = false;
        PromiseHelper.chain(promises)
        .then(function() {
            // cursor in the current position
            logCursor = c;
            passed = true;
        })
        .fail(function(error) {
            console.error("undo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            _isUndo = false;
            unlockUndoRedo();
            updateUndoRedoState();
            if (!inBackground) {
                refreshTooltip($undo);
            }

            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    /**
     * Log.repeat
     */
    export function repeat(): XDPromise<void> {
        if ($("#redo").hasClass("locked")) {
            return PromiseHelper.reject();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let logLen: number = logs.length;
        if (!logLen || logCursor !== logLen - 1) {
            return PromiseHelper.resolve();
        } else {
            let xcLog: XcLog = logs[logCursor];
            Repeat.run(xcLog)
            .then(deferred.resolve)
            .fail(deferred.reject);
            // if fails do nothing
            return deferred.promise();
        }
    }

    /**
     * Log.redo
     * @param step
     */
    export function redo(step?: number): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcAssert((_isRedo === false), "Doing other undo/redo operation?");

        if (step == null) {
            step = 1;
        }

        let logLen: number = logs.length;
        let c: number = logCursor + 1;
        let promises: XDPromise<void>[] = [];

        for (let i = 0; i < step; i++) {
            if (c >= logLen) {
                // cannot redo anymore
                break;
            }

            let xcLog: XcLog = logs[c];
            if (getUndoType(xcLog) !== UndoType.Valid) {
                console.warn("Invalid log to redo", xcLog);
                break;
            }

            promises.push(redoLog.bind(this, xcLog, c));
            c++;

            // also get back the skipped log
            while (c < logLen && getUndoType(logs[c]) === UndoType.Skip) {
                c++;
            }
        }

        _isRedo = true;
        lockUndoRedo();
        let passed: boolean = false;
        PromiseHelper.chain(promises)
        .then(function() {
            logCursor = c - 1;
            passed = true;
        })
        .fail(function(error) {
            console.error("redo failed", error);
            deferred.reject(error);
        })
        .always(function() {
            _isRedo = false;
            unlockUndoRedo();
            updateUndoRedoState();
            refreshTooltip($redo);
            if (passed) {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    /**
     * Log.lockUndoRedo
     */
    export function lockUndoRedo(msg?: string): void {
        $undo.addClass("unavailable locked");
        xcTooltip.changeText($undo, msg || TooltipTStr.LockedTableUndo);

        $redo.addClass("unavailable locked");
        xcTooltip.changeText($redo, msg || TooltipTStr.LockedTableRedo);
    }

    /**
     * Log.unlockUndoRedo
     */
    export function unlockUndoRedo(): void {
        let lastUndoMessage: string = $undo.data("lastmessage");
        let lastUndoState: string = $undo.data("laststate");
        $undo.removeClass("locked");
        $redo.removeClass("locked");
        if (lastUndoState !== "disabled") {
            $undo.removeClass("unavailable");
        }

        xcTooltip.changeText($undo, lastUndoMessage);

        let lastRedoMessage: string = $redo.data("lastmessage");
        let lastRedoState: string = $redo.data("laststate");
        if (lastRedoState !== "disabled") {
            $redo.removeClass("unavailable");
        }

        xcTooltip.changeText($redo, lastRedoMessage);
    }

    function initialize(): void {
        logCursor = -1;
        logCache = {
            "logs": [],
            "errors": [],
            "overwrittenLogs": [],
            "version": XVM.getVersion(true)
        };

        // a quick reference
        logs = logCache.logs;
        errors = logCache.errors;
        overwrittenLogs = logCache.overwrittenLogs;

        _isUndo = false;
        _isRedo = false;
    }

    // if restore, log is an array
    function addLog(log: XcLog): void {
        // normal log
        if (shouldOverWrite || logCursor !== logs.length - 1) {
            // when user do a undo before
            for (let i = logCursor + 1; i < logs.length; i++) {
                overwrittenLogs.push(logs[i]);
            }

            logCursor++;
            logs[logCursor] = log;
            logs.length = logCursor + 1;

            localCommit();
            // must set to "" before async call, other wise KVStore.commit
            // may mess it up
            DagTabManager.Instance.deleteHiddenTabs();
        } else {
            logCursor++;
            logs[logCursor] = log;
            // XXX FIXME: uncomment it if commit on errorLog only has bug
            // localCommit();
        }
    }

    function getUndoType(xcLog: XcLog): number {
        let operation: string = xcLog.getOperation();
        if (operation == null) {
            console.error("Invalid log", xcLog);
            return UndoType.Invalid;
        }
        // XXX temp hack to prevent undoing in dataflow2.0 on refresh
        if (xcLog.options.noUndo) {
            return UndoType.Invalid;
        }

        switch (operation) {
            case SQLOps.RemoveDagTab:
            case SQLOps.DeleteDataflow:
            case SQLOps.DebugPlan:
                return UndoType.Invalid;
            case SQLOps.DSImport:
            case SQLOps.TableFromDS:
            case SQLOps.RestoreTable:
            case SQLOps.DestroyDS:
            case SQLOps.DeleteTable:
            case SQLOps.DeleteAgg:
            case SQLOps.PreviewDS:
            case SQLOps.DestroyPreviewDS:
            case SQLOps.Profile:
            case SQLOps.ProfileSort:
            case SQLOps.ProfileBucketing:
            case SQLOps.ProfileAgg:
            case SQLOps.ProfileStats:
            case SQLOps.QuickAgg:
            case SQLOps.Corr:
            case SQLOps.Aggr:
            case "roundToFixed": // this is a deprecated op in Chronos Patch Set 1
                return UndoType.Skip;
            default:
                let options = xcLog.getOptions();
                if (options && options.tableName) {
                    if (DagTable.Instance.getTable() !== options.tableName) {
                        if (options.newTableName && // sort case
                            DagTable.Instance.getTable() === options.newTableName) {
                            return UndoType.Valid;
                        } else {
                            return UndoType.Skip;
                        }
                    }
                }

                return UndoType.Valid;
        }
    }

    function undoLog(xcLog: XcLog, cursor: number): XDPromise<number> {
        xcAssert((xcLog != null), "invalid log");

        let deferred: XDDeferred<number> = PromiseHelper.deferred();

        let logLen: number = logs.length;
        let isMostRecent: boolean = (cursor === (logLen - 1));
        Undo.run(xcLog, isMostRecent)
        .then(function() {
            if (logs.length !== logLen) {
                // XXX debug use
                console.error("log length should not change during undo!");
            }
            // update cursor, so intermediate undo fail doest have side effect
            logCursor = cursor - 1; // update cursor
            deferred.resolve(cursor);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function redoLog(xcLog, cursor): XDPromise<number>  {
        xcAssert((xcLog != null), "invalid log");

        let deferred: XDDeferred<number> = PromiseHelper.deferred();

        let logLen: number = logs.length;
        Redo.run(xcLog)
        .then(function() {
            if (logs.length !== logLen) {
                // XXX debug use
                console.error("log lenght should not change during undo!");
            }
            // update cursor, so intermediate redo fail doest have side effect
            logCursor = cursor;
            deferred.resolve(cursor);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    export function updateUndoRedoState(): void {
        xcTooltip.hideAll();

        // check redo
        let next: number = logCursor + 1;
        while (next < logs.length && getUndoType(logs[next]) === UndoType.Skip) {
            next++;
        }

        if (next === logs.length) {
            // when nothing to redo
            let tooltip: string = TooltipTStr.NoRedo;
            $redo.addClass("unavailable")
                 .data("lastmessage", tooltip)
                 .data("laststate", "disabled");
            xcTooltip.changeText($redo, tooltip);

        } else if (getUndoType(logs[next]) !== UndoType.Valid) {
            console.error("Have invalid log to redo", logs[next]);
            $redo.addClass("unavailable")
                 .data("lastmessage", TooltipTStr.NoRedo)
                 .data("laststate", "disabled");
            xcTooltip.changeText($redo, TooltipTStr.NoRedo);
        } else {
            // when can redo
            let redoTitle: string = xcStringHelper.replaceMsg(TooltipTStr.Redo, {
                "op": logs[next].getTitle()
            });

            $redo.removeClass("unavailable")
                 .data("lastmessage", redoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($redo, redoTitle);
        }

        // check undo
        let cur: number = logCursor;
        while (cur >= 0 &&
            cur > lastRestoreCursor &&
            getUndoType(logs[cur]) === UndoType.Skip
        ) {
            cur--;
        }

        let undoTitle;
        if (cur === -1 || cur === lastRestoreCursor) {
            // when no operation to undo
            $undo.addClass("unavailable")
                 .data("lastmessage", TooltipTStr.NoUndoNoOp)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, TooltipTStr.NoUndoNoOp);
        } else if (getUndoType(logs[cur]) !== UndoType.Valid) {
            // when cannot undo
            undoTitle = xcStringHelper.replaceMsg(TooltipTStr.NoUndo, {
                "op": logs[cur].getTitle()
            });

            $undo.addClass("unavailable")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "disabled");
            xcTooltip.changeText($undo, undoTitle);
        } else {
            // when can undo
            undoTitle = xcStringHelper.replaceMsg(TooltipTStr.Undo, {
                "op": logs[cur].getTitle()
            });
            $undo.removeClass("unavailable")
                 .data("lastmessage", undoTitle)
                 .data("laststate", "enabled");
            xcTooltip.changeText($undo, undoTitle);
        }
    }

    function resetLoclStore(): void {
        xcLocalStorage.removeItem(logLocalStoreKey);
    }

    function localCommit(): void {
        setTimeout(() => { // writing to storage may be slow
            if (!isOverflow) {
                if (!xcLocalStorage.setItem(logLocalStoreKey, JSON.stringify(logCache))) {
                    isOverflow = true;
                    resetLoclStore();
                }
            }
        });
    }

    function getCondensedErrors(): XcLog[] {
        let condErrors: XcLog[]  = [];
        let lastError: XcLog;
        let diffFound: boolean;
        let numRepeats: number = 0;
        let currError: XcLog;

        for (let i = 0; i < errors.length; i++) {
            currError = errors[i];
            diffFound = false;
            if (lastError && currError.getTitle() === lastError.getTitle()) {
                for (let prop in currError) {
                    if (prop !== "timestamp") {
                        if (typeof currError[prop] === "object") {
                            if (typeof lastError[prop] === "object") {
                                if (!xcHelper.deepCompare(currError[prop],
                                                          lastError[prop])) {
                                    diffFound = true;
                                    break;
                                }
                            } else {
                                diffFound = true;
                                break;
                            }
                        } else if (currError[prop] !== lastError[prop]) {
                            diffFound = true;
                            break;
                        }
                    }
                }
                if (diffFound) {
                    addError();
                } else {
                    numRepeats++;
                }
            } else {
                addError();
            }
            lastError = currError;
        }

        addError();

        function addError(): void {
            if (!$.isEmptyObject(lastError)) {
                if (numRepeats) {
                    lastError["errorRepeated"] = numRepeats;
                }
                condErrors.push(lastError);
            }

            numRepeats = 0;
        }
        return condErrors;
    }

    function isBackendOperation(xcLog: XcLog): boolean {
        let operation: string = xcLog.getOperation();

        switch (operation) {
            // front end opeartion
            case (SQLOps.HideCol):
            case (SQLOps.ReorderCol):
            case (SQLOps.AddNewCol):
            case (SQLOps.PullCol):
            case (SQLOps.PullMultipleCols):
            case (SQLOps.RenameCol):
            case (SQLOps.TextAlign):
            case (SQLOps.MinimizeCols):
            case (SQLOps.MaximizeCols):
            case (SQLOps.SortTableCols):
            case (SQLOps.ResizeTableCols):
            case (SQLOps.DragResizeTableCol):
            case (SQLOps.DragResizeRow):
            case (SQLOps.ChangeFormat):
            case (SQLOps.ConnectOperations):
            case (SQLOps.DisconnectOperations):
            case (SQLOps.RemoveOperations):
            case (SQLOps.AddOperation):
            case (SQLOps.CopyOperations):
            case (SQLOps.PasteOperations):
            case (SQLOps.MoveOperations):
            case (SQLOps.NewDagTab):
            case (SQLOps.RemoveDagTab):
            case (SQLOps.DeleteDataflow):
            case (SQLOps.DupDagTab):
            case (SQLOps.EditDescription):
            case (SQLOps.NewComment):
            case (SQLOps.EditComment):
            case (SQLOps.EditNodeTitle):
            case (SQLOps.DagBulkOperation):
                return false;
            // thrift operation
            case (SQLOps.DestroyDS):
            case (SQLOps.PreviewDS):
            case (SQLOps.DestroyPreviewDS):
            case (SQLOps.DeleteTable):
            case (SQLOps.DeleteAgg):
            case (SQLOps.DSImport):
            case (SQLOps.Filter):
            case (SQLOps.Sort):
            case (SQLOps.Join):
            case (SQLOps.Aggr):
            case (SQLOps.Map):
            case (SQLOps.GroupBy):
            case (SQLOps.QuickAgg):
            case (SQLOps.Corr):
            case (SQLOps.SplitCol):
            case (SQLOps.ChangeType):
            case (SQLOps.Round):
            case (SQLOps.Profile):
            case (SQLOps.ProfileSort):
            case (SQLOps.ProfileBucketing):
            case (SQLOps.ProfileAgg):
            case (SQLOps.ProfileStats):
            case (SQLOps.Project):
                return true;
            default:
                console.warn("XXX! Operation unexpected", operation);
                return null;
        }
    }

    function refreshTooltip($button: JQuery) {
        $button = $button.filter((_index, el) => {
            return $(el).is(":visible");
        });
        xcTooltip.refresh($button, 2000);
    }

    // /* Unit Test Only */
    if (window["unitTestMode"]) {
        Log["__testOnly__"] = {
            isBackendOperation: isBackendOperation,
            getUndoType: getUndoType,
            UndoType: UndoType
        };
    }
    // /* End Of Unit Test Only */
}
