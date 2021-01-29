// DagList controls the panel Dataflow List.
class DagList extends Durable {
    private static _instance: DagList;
    public static SQLPrefix = ".tempSQL";

    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    /**
     * DagList.getAppPath
     * @param dagTab
     */
    public static getAppPath(dagTab: DagTab): string {
        const app = dagTab.getApp();
        if (app == null) {
            return dagTab.getName();
        } else {
            return AppList.Instance.getAppPath(app, dagTab.getName());
        }
    }

    private _dags: Map<string, DagTab>;
    private _setup: boolean;
    private _stateOrder = {};

    private constructor() {
        super(null);
        this._initialize();
        this._setupActionMenu();
        this._addEventListeners();
        this._getDagListSection().find(".dfModuleList").addClass("active");

        this._stateOrder[QueryStateTStr[QueryStateT.qrCancelled]] = 2;
        this._stateOrder[QueryStateTStr[QueryStateT.qrNotStarted]] = 3;
        this._stateOrder[QueryStateTStr[QueryStateT.qrProcessing]] = 4;
        this._stateOrder[QueryStateTStr[QueryStateT.qrFinished]] = 0;
        this._stateOrder[QueryStateTStr[QueryStateT.qrError]] = 1;
    }

    /**
     * DagList.Instance.setup
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        if (this._setup) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let needReset: boolean = true;

        this._checkIfNeedReset()
        .then((res) => {
            needReset = res;
            return this._restoreLocalDags(needReset);
        })
        .then(() => {
            return this._restoreSQLFuncDag(needReset);
        })
        .then(() => {
            return this._restoreOptimizedDags();
        })
        .then(() => {
            return this._fetchXcalarQueries();
        })
        .then(() => {
            // for dag list, it's a render of whole thing,
            // for sql menu, it's only for table function
            ResourceMenu.Instance.render();
            this._setup = true;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * DagList.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        let $dagList: JQuery = this._geContainer();
        if (disable) {
            $dagList.addClass("xc-disabled");
        } else {
            $dagList.removeClass("xc-disabled");
        }
    }

    /**
     * Get a list of all dags
     */
    public getAllDags(): Map<string, DagTab> {
        return this._dags;
    }

    public getDagTabById(id: string | number): DagTab {
        if (typeof id === "number") {
            id = String(id);
        }
        return this._dags.get(id);
    }

    public listUserDagAsync(): XDPromise<{dags: DagListTabDurable[]}> {
        return this._getUserDagKVStore().getAndParse();
    }

    public listSQLFuncAsync(): XDPromise<{dags: DagListTabDurable[]}> {
        return this._getSQLFuncKVStore().getAndParse();
    }

    public listOptimizedDagAsync(): XDPromise<{dags: DagListTabDurable[]}> {
        return this._getOptimizedDagKVStore().getAndParse();
    }

    /**
     * DagList.Instance.saveUserDagList
     */
    public saveUserDagList(): XDPromise<void> {
        return this._saveUserDagList();
    }

    /**
     * DagList.Instance.saveSQLFuncList
     */
    public saveSQLFuncList(): XDPromise<void> {
        return this._saveSQLFuncList();
    }

    /**
     * DagList.Instance.refresh
     */
    public refresh(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const promise: XDPromise<void> = deferred.promise();
        const $dagList: JQuery = this._geContainer();
        // delete shared dag and optimized list first
        const oldUserDags: Map<string, DagTabUser> = new Map();
        const oldOptimizedDags: Map<string, DagTabOptimized> = new Map();
        const oldQueryDags: Map<string, DagTabQuery> = new Map();
        for (let [id, dagTab] of this._dags) {
            if (dagTab instanceof DagTabOptimized) {
                oldOptimizedDags.set(dagTab.getName(), dagTab);
                this._dags.delete(id);
            } else if (dagTab instanceof DagTabQuery) {
                oldQueryDags.set(dagTab.getQueryName(), dagTab);
                this._dags.delete(id);
            } else if (dagTab instanceof DagTabUser) {
                oldUserDags.set(dagTab.getId(), dagTab);
                // do not delete old ones
            }
        }

        xcUIHelper.showRefreshIcon($dagList, false, promise, true);

        this._refreshUserDags(oldUserDags)
        .then(() => {
            return this._restoreOptimizedDags(oldOptimizedDags);
        })
        .then(() => {
            return this._fetchXcalarQueries(oldQueryDags, true);
        })
        .then(() => {
            return SQLResultSpace.Instance.refreshTables(true);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            TblSource.Instance.refresh();
            ResourceMenu.Instance.render(ResourceMenu.KEY.App);
        });
        return promise;
    }

    /**
     * Adds a new dataflow.
     * @param dagTab The instance of the new dataflow
     */
    public addDag(dagTab: DagTab): boolean {
        if (!this._setup) {
            return false;
        }

        if (this._isForSQLFolder(dagTab) && this._isHideSQLFolder()) {
            return false;
        }

        if (dagTab instanceof DagTabSQLFunc ||
            dagTab instanceof DagTabUser ||
            dagTab instanceof DagTabOptimized
        ) {
            this._dags.set(dagTab.getId(), dagTab);
            this._saveDagList(dagTab);
        }
        if (dagTab instanceof DagTabSQLFunc) {
            ResourceMenu.Instance.render(ResourceMenu.KEY.TableFunc);
        } else {
            ResourceMenu.Instance.render(ResourceMenu.KEY.DF);
        }
        return true;
    }

    /**
     * DagList.Instance.addUserDags
     * @param dagTabs
     */
    public addUserDags(dagTabs: DagTabUser[]): boolean {
        if (!this._setup) {
            return false;
        }

        dagTabs.forEach((dagTab) => {
            if (dagTab.getType() !== DagTabType.User) {
                // in case of error
                throw new Error("Wrong type of plan to add");
            }
            this._dags.set(dagTab.getId(), dagTab);
        });
        this._saveUserDagList();
    }

    /**
     * Changes the name of a Dataflow in the user's data flows.
     * @param newName the new name
     * @param id The dataflow we change.
     */
    public changeName(newName: string, id: string): void {
        const $li: JQuery = this._getListElById(id);
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return;
        }

        if (dagTab instanceof DagTabSQLFunc ||
            dagTab instanceof DagTabUser ||
            dagTab instanceof DagTabOptimized
        ) {
            // this is a rename of SQL Function
            dagTab.setName(newName);
            this._saveDagList(dagTab);
            if (dagTab instanceof DagTabSQLFunc) {
                $li.find(".name").text(newName + ".tf");
            } else {
                $li.find(".name").text(newName);
            }
        }
        // not support rename published df now
        ResourceMenu.Instance.render(ResourceMenu.KEY.DF);
    }

    /**
     * Changes the list item to be open or not
     * @param id
     */
    public updateDagState(id): void {
        const $li: JQuery = this._getListElById(id);
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return;
        }
        if (dagTab.isOpen()) {
            $li.addClass("open");
            $li.find(".canBeDisabledIconWrap").removeClass("xc-disabled");
            $li.find(".xi-duplicate").removeClass("xc-disabled");
        } else {
            $li.removeClass("open");
            $li.find(".canBeDisabledIconWrap").addClass("xc-disabled");
            $li.find(".xi-duplicate").addClass("xc-disabled");
        }
        if (dagTab instanceof DagTabQuery || (dagTab instanceof DagTabOptimized &&
            dagTab.isFromSDK())) {
            const state: string = dagTab.getState();
            const $statusIcon: JQuery = $li.find(".statusIcon");
            const html = '<div class="statusIcon state-' + state +
                '" ' + xcTooltip.Attrs + ' data-original-title="' +
                xcStringHelper.camelCaseToRegular(state.slice(2)) + '"></div>'
            if ($statusIcon.length) {
                $statusIcon.replaceWith(html);
            } else {
                $li.find(".gridIcon").after(html);
                $li.addClass("abandonedQuery");
            }
        }
    }

    /**
     * DagList.Instance.clearFocusedTable
     */
    public clearFocusedTable(): void {
        $("#dagListSection .tableList .table.active").removeClass("active");
    }

    /**
     * DagList.Instance.isUniqueName
     * Returns if the user has used this name for a dag graph or not.
     * @param name The name we want to check
     * @returns {string}
     */
    public isUniqueName(name: string, app: string | null): boolean {
        for (let [_key, dagTab] of this._dags) {
            if (app != null && dagTab.getApp() !== app) {
                continue;
            }
            if (dagTab.getName() == name) {
                return false;
            }
        }
        return true;
    }

    /**
     * DagList.Instance.getValidName
     * Return a valid name for new dafaflow tab
     */
    public getValidName(
        prefixName?: string,
        hasBracket?: boolean,
        isSQLFunc?: boolean,
        isOptimizedDag?: boolean,
        app?: string
    ): string {
        const prefix: string = prefixName || (isSQLFunc ? "fn" : "Untitled");
        const nameSet: Set<string> = new Set();
        let cnt: number = 1;
        this._dags.forEach((dagTab) => {
            if (app != null && dagTab.getApp() !== app) {
                // if app id is specified, check app id match first
                return;
            }
            nameSet.add(dagTab.getName());
            if (!isSQLFunc &&
                !isOptimizedDag &&
                dagTab instanceof DagTabUser &&
                !(dagTab instanceof DagTabSQLFunc)
            ) {
                if (!this._isForSQLFolder(dagTab)) {
                    cnt++;
                }
            } else if (isSQLFunc && dagTab instanceof DagTabSQLFunc) {
                cnt++;
            } else if (isOptimizedDag && dagTab instanceof DagTabOptimized) {
                cnt++;
            }
        });
        if (hasBracket) {
            cnt = 0;
        }
        let name: string;
        if (isSQLFunc) {
            name = prefixName ? prefix : `${prefix}${cnt}`;
        } else {
            name = prefixName ? prefix : `${prefix} ${cnt}`;
        }
        while(nameSet.has(name)) {
            cnt++;
            if (isSQLFunc) {
                name = `${prefix}${cnt}`;
            } else {
                name = hasBracket ? `${prefix}(${cnt})` : `${prefix} ${cnt}`;
            }
        }
        return name;
    }

    /**
     * DagList.Instance.validateName
     * @param name
     * @param isSQLFunc
     */
    public validateName(
        name: string,
        isSQLFunc: boolean,
        app?: string | null
    ): string | null {
        if (!name) {
            return ErrTStr.NoEmpty;
        }

        if (!this.isUniqueName(name, app)) {
            return isSQLFunc ? SQLTStr.DupFuncName : DFTStr.DupDataflowName;
        }

        const category = isSQLFunc ? PatternCategory.SQLFunc : PatternCategory.Dataflow;
        if (!xcHelper.checkNamePattern(category, PatternAction.Check, name)) {
            return isSQLFunc ? ErrTStr.SQLFuncNameIllegal : ErrTStr.DFNameIllegal;
        }
        return null;
    }

    /**
     * DagList.Instance.deleteDataflowsByApp
     * @param appId
     */
    public deleteDataflowsByApp(appId: string): void {
        const toDelete: string[] = [];
        this.getAllDags().forEach((dagTab) => {
            if (dagTab.getApp() === appId) {
                toDelete.push(dagTab.getId());
            }
        });

        toDelete.forEach((id) => this.deleteDataflow(id));
    }

    /**
     * DagList.Instance.deleteDataflow
     * Deletes the dataflow represented by dagListItem from the dagList
     * Also removes from dagTabs if it is active.
     * @param $dagListItem Dataflow we want to delete.
     * @returns {XDPromise<void>}
     */
    public deleteDataflow(id: string): XDPromise<void> {
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const name: string = dagTab.getName();
        let removal: {success: boolean, error?: string} = DagTabManager.Instance.removeTab(id);
        if (!removal.success) {
            return deferred.reject({error: removal.error});
        }

        dagTab.delete()
        .then(() => {
            $('#dagListSection .dagListDetail[data-id="' +id + '"]').remove();
            this._dags.delete(id);
            this._saveDagList(dagTab);
            if (dagTab instanceof DagTabSQLFunc) {
                ResourceMenu.Instance.render(ResourceMenu.KEY.TableFunc);
            } else {
                ResourceMenu.Instance.render(ResourceMenu.KEY.DF);
            }
            Log.add(DagTStr.DeleteDataflow, {
                "operation": SQLOps.DeleteDataflow,
                "id": id,
                "dataflowName": name
            });

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public addDataflow(dagTab: DagTab) : void{
        this._dags.set(dagTab.getId(), dagTab);
    }

    public removeDataflow(id: string): void {
        this._dags.delete(id);
    }

    /**
     * DagList.Instance.switchActiveDag
     * Switches the active dagList dag to the one with key.
     * @param id Dag id we want to note as active
     */
    public switchActiveDag(id: string): void {
        this._focusOnDagList(id);
        const $dagListSection: JQuery = this._getDagListSection();
        $dagListSection.find(".dagListDetail").removeClass("active");
        this._getListElById(id).addClass("active");
    }

    /**
     * DagList.Instance.markToResetDags
     */
    public markToResetDags(): XDPromise<void> {
        const kvStore = this._getResetMarkKVStore();
        return kvStore.put("reset", false, true);
    }

    /**
     * Resets keys and tabs in the case of error.
     * Also used for testing.
     */
    public reset(): void {
        this._dags = new Map();
        this._getDagListSection().find(".dagListDetails ul").empty();
        DagTabManager.Instance.reset();
        this._saveUserDagList();
        this._saveSQLFuncList();
    }

    public serialize(dags: DagListTabDurable[]): string {
        let json = this._getDurable(dags);
        return JSON.stringify(json);
    }

    protected _getDurable(dags: DagListTabDurable[]): DagListDurable {
        return {
            version: this.version,
            dags: dags
        }
    }

    private _initialize(): void {
        this._dags = new Map();
        this._setup = false;
    }

    private _getUserDagKVStore(): KVStore {
        return this._getKVStore("gDagListKey");
    }

    private _getSQLFuncKVStore(): KVStore {
        return this._getKVStore("gSQLFuncListKey");
    }

    private _getOptimizedDagKVStore(): KVStore {
        return this._getKVStore("gOptimizedDagListKey");
    }

    private _getKVStore(keyword: string): KVStore {
        let key: string = KVStore.getKey(keyword);
        return new KVStore(key, gKVScope.WKBK);
    }

    private _iconHTML(type: string, icon: string, title: string): HTML {
        const tooltip: string = 'data-toggle="tooltip" ' +
                                'data-container="body" ' +
                                'data-title="' + title + '"';
        return `<i class="${type} ${icon} icon xc-icon-action" ${tooltip}></i>`;
    }

    private _togglLoadState(dagTab: DagTab, isLoading: boolean): void {
        try {
            let tabId = dagTab.getId();
            let $dagListItem = this._getListElById(tabId);
            if (isLoading) {
                this._addLoadingStateOnList($dagListItem);
            } else {
                this._removeLoadingStateOnList($dagListItem);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _addLoadingStateOnList($dagListItem: JQuery): void {
        xcUIHelper.disableElement($dagListItem);
        if ($dagListItem.find(".loadingSection").length === 0) {
            let html: HTML = xcUIHelper.getLoadingSectionHTML("Loading", "loadingSection ellipsisSpace");
            $dagListItem.find(".name").append(html);
        }
    }

    private _removeLoadingStateOnList($dagListItem: JQuery): void {
        $dagListItem.find(".loadingSection").remove();
        xcUIHelper.enableElement($dagListItem);
    }

    private _loadErrorHandler(dagTab: DagTab, noAlert: boolean): void {
        try {
            let tabId = dagTab.getId();
            let $dagListItem = this._getListElById(tabId);
            let icon: HTML = this._iconHTML("error", "gridIcon xi-critical", DFTStr.LoadErr);
            $dagListItem.find(".xc-action:not(.deleteDataflow)").addClass("xc-disabled"); // disable all icons
            $dagListItem.find(".gridIcon").remove();
            let $icon = $(icon);
            $icon.removeClass("xc-action");
            $dagListItem.prepend($icon);
            if (!noAlert) {
                StatusBox.show(DFTStr.LoadErr, $dagListItem);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _restoreLocalDags(needReset: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userDagTabs: DagTabUser[] = [];

        this.listUserDagAsync()
        .then((res: DagListDurable) => {
            let dags: DagListTabDurable[] = [];
            if (res && res.dags) {
                dags = res.dags;
                if (needReset) {
                    dags.forEach((dagInfo) => {
                        dagInfo.reset = true;
                    });
                }
            }
            return DagTabUser.restore(dags);
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            userDagTabs = dagTabs;
            if (this._isHideSQLFolder()) {
                userDagTabs = userDagTabs.filter((dagTab) => !this._isForSQLFolder(<DagTab>dagTab));
            }

            userDagTabs.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), <DagTab>dagTab);
            });
            if (metaNotMatch || needReset) {
                // if not match, commit sycn up dag list
                return this._saveUserDagList();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _restoreSQLFuncDag(needReset: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let sqFuncDagTabs: DagTab[] = [];

        this.listSQLFuncAsync()
        .then((res: {dags: DagListTabDurable[]}) => {
            let dags: DagListTabDurable[] = [];
            if (res && res.dags) {
                dags = res.dags;
                if (needReset) {
                    dags.forEach((dagInfo) => {
                        dagInfo.reset = true;
                    });
                }
            }
            return DagTabSQLFunc.restore(dags);
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            sqFuncDagTabs = <DagTab[]>dagTabs;
            sqFuncDagTabs.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), dagTab);
            });
            if (metaNotMatch || needReset) {
                // if not match, commit sycn up dag list
                return this._saveSQLFuncList();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _refreshUserDags(oldDags) {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userDagTabs: DagTabUser[] = [];
        let newIds = new Set();
        let needsReset = false;
        this.listUserDagAsync()
        .then((res: DagListDurable) => {
            let dags: DagListTabDurable[] = [];
            if (res && res.dags) {
                dags = res.dags;
                dags.forEach((dagInfo) => {
                    if (!oldDags.has(dagInfo.id)) {
                        dagInfo.reset = true;
                        needsReset = true;
                    }
                    newIds.add(dagInfo.id);
                });
            }
            return DagTabUser.restore(dags);
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            userDagTabs = dagTabs;
            userDagTabs.forEach((dagTab) => {
                let tabId = dagTab.getId();
                if (oldDags.has(tabId)) {
                    if (!DagTabManager.Instance.getTabById(tabId)) {
                        this._dags.set(tabId, dagTab);
                    } else {
                        // leave tab as is, difficult to sync up an open tab
                    }
                } else {
                    this._dags.set(tabId, <DagTab>dagTab);
                }
            });
            oldDags.forEach(oldDag => {
                let id = oldDag.getId();
                if (!newIds.has(id) && !DagTabManager.Instance.getTabById(id)) {
                    this._dags.delete(id);
                    needsReset = true;
                }
            });
            if (metaNotMatch || needsReset) {
                // if not match, commit sycn up dag list
                return this._saveUserDagList();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _restoreOptimizedDags(
        oldOptimizedDags?: Map<string, DagTabOptimized>
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.listOptimizedDagAsync()
        .then((res) => {
            return PromiseHelper.convertToJQuery(DagTabOptimized.restore(res ? res.dags : []));
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            const oldDags: Map<string, DagTabOptimized> = oldOptimizedDags || new Map();
            dagTabs.forEach((dagTab) => {
                let tabId = dagTab.getId();
                if (oldDags.has(tabId) &&
                    DagTabManager.Instance.getTabById(tabId)
                ) {
                    const oldDagTab: DagTabOptimized = oldDags.get(tabId);
                    this._dags.set(oldDagTab.getId(), oldDagTab);
                    if (oldDagTab.isFocused()) {
                        // restarts status check
                        oldDagTab.unfocus();
                        oldDagTab.focus();
                    }
                } else {
                    let queryName = dagTab.getName();
                    const oldDagTab: DagTabOptimized= oldDags.get(queryName);
                    if (oldDags.has(queryName) &&
                        DagTabManager.Instance.getTabById(oldDagTab.getId())) {
                        oldDagTab.setState(dagTab.getState());
                        this._dags.set(oldDagTab.getId(), oldDagTab);
                        if (oldDagTab.isFocused()) {
                            // restarts status check
                            oldDagTab.unfocus();
                            oldDagTab.focus(true);
                        }
                    } else {
                        this._dags.set(dagTab.getId(), dagTab);
                    }
                }
            });

            if (metaNotMatch) {
                return this._saveOptimizedDagList();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _fetchXcalarQueries(
        oldQueryDags?: Map<string, DagTabQuery>,
        refresh?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarQueryList("*")
        .then((queries) => {
            const activeWKBNK: string = WorkbookManager.getActiveWKBK();
            const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
            const abandonedQueryPrefix: string = "table_DF2_" + workbook.sessionId + "_";
            const sdkPrefix = XcUID.SDKPrefix + workbook.sessionId + "-";

            const oldQueries: Map<string, DagTabQuery> = oldQueryDags || new Map();
            queries.forEach((query) => {
                let displayName: string;
                if (query.name.startsWith("table_published_")) {
                    displayName = query.name.slice("table_".length);
                    displayName = displayName.slice(0, displayName.lastIndexOf("_dag"));
                } else if (query.name.startsWith(sdkPrefix)) {
                    displayName = query.name.slice(sdkPrefix.length);
                } else if (query.name.startsWith(abandonedQueryPrefix)) {
                    // strip the query name to find the tabId of the original dataflow
                    // so we can get use that dataflow's name
                    displayName = query.name.slice("table_".length);
                    let firstNamePart = displayName.slice(0, ("DF2_" + workbook.sessionId + "_").length)
                    let secondNamePart = displayName.slice(("DF2_" + workbook.sessionId + "_").length);
                    let splitName = secondNamePart.split("_");
                    let tabId = firstNamePart + splitName[0] + "_" + splitName[1];
                    let origTab = this._dags.get(tabId);
                    if (origTab) {
                        displayName = origTab.getName()
                    } else {
                        displayName = secondNamePart;
                    }
                } else { // sdk optimized queries are handled in _restoreOptimizedDags
                    return;
                }

                let newTab = true;
                if (oldQueries.has(query.name)) {
                    const oldDagTab: DagTabQuery = oldQueries.get(query.name);
                    oldDagTab.setState(query.state);
                    if (DagTabManager.Instance.getTabById(oldDagTab.getId())) {
                        newTab = false;
                        this._dags.set(oldDagTab.getId(), oldDagTab);
                        if (oldDagTab.isFocused()) {
                            // restarts status check
                            oldDagTab.unfocus();
                            oldDagTab.focus(true);
                        }
                    }
                } else if (refresh && query.name.startsWith(abandonedQueryPrefix)) {
                    // if we're refreshing the list and a new abandoned query appears
                    // then do not show it because we don't want to show XD
                    // queries that were created after a page refresh
                    return;
                }
                if (newTab) {
                    const queryTabId = DagTab.generateId();
                    const queryTab = new DagTabQuery({
                                            id: queryTabId,
                                            name: displayName,
                                            queryName: query.name,
                                            state: query.state
                                        });
                    this._dags.set(queryTabId, queryTab);
                }

            });
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _getResetMarkKVStore(): KVStore {
        let key: string = KVStore.getKey("gDagResetKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private _checkIfNeedReset(): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const kvStore = this._getResetMarkKVStore();
        let reset: boolean = false;

        kvStore.get()
        .then((val) => {
            if (val != null) {
                // when has val, it's a rest case
                reset = true;
                return kvStore.delete(); // delete the key
            }
        })
        .then(() => {
            deferred.resolve(reset);
        })
        .fail(() => {
            deferred.resolve(reset); // still resolve it
        });

        return deferred.promise();
    }

    private _saveDagList(dagTabToChange: DagTab): XDPromise<void> {
        if (dagTabToChange instanceof DagTabSQLFunc) {
            return this._saveSQLFuncList();
        } else if (dagTabToChange instanceof DagTabUser) {
            return this._saveUserDagList();
        } else if (dagTabToChange instanceof DagTabOptimized) {
            return this._saveOptimizedDagList();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _saveUserDagList(): XDPromise<void> {
        const dags: DagListTabDurable[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabUser &&
                !(dagTab instanceof DagTabSQLFunc) &&
                !this._isForSQLFolder(dagTab)
            ) {
                dags.push(this._getSerializableDagList(dagTab));
            }
        });
        const jsonStr: string = this.serialize(dags);
        const kvStore = this._getUserDagKVStore();
        const promise = kvStore.put(jsonStr, true, true);
        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            workbook.update();
        }
        return promise;
    }

    private _saveSQLFuncList(): XDPromise<void> {
        const dags: DagListTabDurable[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabSQLFunc) {
                dags.push(this._getSerializableDagList(dagTab));
            }
        });
        const jsonStr: string = this.serialize(dags);
        const kvStore = this._getSQLFuncKVStore();
        return kvStore.put(jsonStr, true, true);
    }

    private _saveOptimizedDagList(): XDPromise<void> {
        const dags: DagListTabDurable[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabOptimized && !dagTab.isFromSDK()) {
                dags.push(this._getSerializableDagList(dagTab));
            }
        });
        const jsonStr: string = this.serialize(dags);
        const kvStore = this._getOptimizedDagKVStore();
        return kvStore.put(jsonStr, true, true);
    }

    private _getSerializableDagList(dagTab: DagTab): DagListTabDurable {
        return {
            name: dagTab.getName(),
            id: dagTab.getId(),
            reset: dagTab.needReset(),
            createdTime: dagTab.getCreatedTime(),
            type: dagTab.getType(),
            app: dagTab.getApp()
        }
    }

    private _geContainer(): JQuery {
        return $("#dagList");
    }

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
    }

    private _getMenu(): JQuery {
        return $("#dagListMenu");
    }

    private _getListElById(id: string): JQuery {
        return this._getDagListSection().find('.dagListDetail[data-id="' + id + '"]');
    }

    private _focusOnDagList(id: string): void {
        try {
            const $li = this._getListElById(id);
            ResourceMenu.Instance.focusOnList($li);
        } catch (e) {
            console.error(e);
        }
    }

    private _setupActionMenu(): void {
        const $menu: JQuery = this._getMenu();
        $menu.on("click", ".deleteDataflow", () => {
            const tabId: string = $menu.data("id");
            const $dagListItem = this._getListElById(tabId);
            Alert.show({
                title: DFTStr.DelDF,
                msg: xcStringHelper.replaceMsg(DFTStr.DelDFMsg, {
                    dfName: $menu.data("name")
                }),
                onConfirm: () => {
                    xcUIHelper.disableElement($dagListItem);
                    this.deleteDataflow($dagListItem.data("id"))
                    .fail((error) => {
                        let log = error && typeof error === "object" ? error.log : null;
                        if (!log && error && error.error) {
                            log = error.error;
                        }
                        // need to refetch dagListItem after list is updated
                        let $dagListItem = this._getListElById(tabId);
                        StatusBox.show(DFTStr.DelDFErr, $dagListItem, false, {
                            detail: log
                        });
                    })
                    .always(() => {
                        // need to refetch dagListItem after list is updated
                        let $dagListItem = this._getListElById(tabId);
                        xcUIHelper.enableElement($dagListItem);
                    });
                }
            });
        });

        $menu.on("click", ".duplicateDataflow", () => {
            const dagTab: DagTab = this.getDagTabById($menu.data("id"));
            this._loadUnOpenTab(dagTab)
            .then(() => {
                DagTabManager.Instance.duplicateTab(dagTab);
            })
            .fail((error) => {
                let $el = this._getListElById(dagTab.getId());
                StatusBox.show(xcHelper.parseError(error), $el);
            });
        });

        $menu.on("click", ".downloadDataflow", () => {
            const dagTab: DagTab = this.getDagTabById($menu.data("id"));
            DFDownloadModal.Instance.show(dagTab);
        });
    }

    private _loadUnOpenTab(dagTab: DagTab): XDPromise<void> {
        if (!dagTab.isLoaded()) {
            return dagTab.load();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _isForSQLFolder(dagTab: DagTab): boolean {
        return DagTabUser.isForSQLFolder(dagTab);
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        const $container: JQuery = this._geContainer();

        $container.find(".refreshBtn").click(() => {
            this.refresh();
        });

        $container.find(".uploadBtn").click(() => {
            DFUploadModal.Instance.show();
        });

        $dagListSection.on("click", ".dagListDetail .name", (event) => {
            const $dagListItem: JQuery = $(event.currentTarget).parent();
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
            DagTabManager.Instance.loadTab(dagTab);
        });


        DagTabManager.Instance
        .on("beforeLoad", (dagTab: DagTab) => {
            this._togglLoadState(dagTab, true);
        })
        .on("afterLoad", (dagTab: DagTab) => {
            this._togglLoadState(dagTab, false);
        })
        .on("loadFail", (dagTab: DagTab, noAlert: boolean) => {
            this._loadErrorHandler(dagTab, noAlert);
        });
    }

    private _isHideSQLFolder(): boolean {
        return (typeof gShowSQLDF === "undefined" || !gShowSQLDF);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagList = DagList;
}

if (typeof runEntity !== "undefined") {
    runEntity.DagList = DagList;
}
