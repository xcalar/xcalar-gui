interface DagTabOptions {
    version?: number;
    name: string;
    id?: string;
    dagGraph?: DagGraph;
    app?: string;
    appSourceTab?: string;
}

// dagTabs hold a user's dataflows and kvStore.
abstract class DagTab extends Durable {
    public static readonly KEY: string = "DF2";
    protected static uid: XcUID;

    private _events: object;
    protected _name: string;
    protected _id: string;
    protected _type: DagTabType;
    protected _dagGraph: DagGraph;
    protected _kvStore: KVStore;
    protected _disableSaveLock: number;
    protected _isOpen: boolean;
    protected _isHidden: boolean;
    protected _saveCheckTimer: any; // ensures save not locked for more than 60 seconds
    protected _createdTime: number;
    protected _app: string;
    protected _appSourceTab: string;

    public static generateId(): string {
        this.uid = this.uid || new XcUID(DagTab.KEY);
        return this.uid.gen();
    }

    public constructor(options: DagTabOptions) {
        options = options || <DagTabOptions>{};
        super(options.version);
        this._name = options.name;
        this._id = options.id || DagTab.generateId();
        this._dagGraph = options.dagGraph || null;
        this._app = options.app || null;
        this._appSourceTab = options.appSourceTab || null;
        if (this._dagGraph != null) {
            this._dagGraph.setTabId(this._id);
        }
        this._disableSaveLock = 0;
        this._events = {};
    }

    public abstract load(reset?: boolean): XDPromise<void>
    public abstract save(delay?: boolean): XDPromise<void>
    public abstract delete(): XDPromise<void>
    public abstract download(name: string, optimized?: boolean): XDPromise<void>
    public abstract upload(fileContent: string, overwriteUDF: boolean): XDPromise<{tabUploaded: DagTab, alertOption?: Alert.AlertOptions}>;
    /**
     * Get Tab's name
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Changes the name of a tab to newName
     * @param {string} newName The tab's new name.
     */
    public setName(newName: string): void {
        this._name = newName;
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._dagGraph;
    }

    /**
     * Gets the ID for this tab
     * @returns {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * return an id that represent the app
     * @returns {string}
     */
    public getApp(): string {
        return this._app;
    }

    public setApp(app: string): void {
        this._app = app;
    }

    public getAppSourceTab(): string {
        return this._appSourceTab;
    }

    public setAppSourceTab(tabId: string): void {
        this._appSourceTab = tabId;
    }

    /**
     * get tab's type specify by DagTabType
     * @returns {DagTabType}
     */
    public getType(): DagTabType {
        return this._type;
    }

    /**
     * return true if the tab is editable
     */
    public isEditable(): boolean {
        return true;
    }

    /**
     * For Bulk Operation only
     */
    public turnOffSave(): void {
        this._disableSaveLock++;
        if (this._disableSaveLock === 1) {
            // if lock has not decreased back to 0 after 60 seconds,
            // remove the lock
            this._saveCheckTimer = setTimeout(() => {
                console.error("save lock stuck, turn off");
                this.forceTurnOnSave();
            }, 60000);
        }

    }

    /**
     * For Bulk Operation only
     */
    public turnOnSave(): void {
        if (this._disableSaveLock === 0) {
            console.error("error case to turn on");
        } else {
            this._disableSaveLock--;
            if (this._disableSaveLock === 0) {
                clearTimeout(this._saveCheckTimer);
            }
        }
    }

    public forceTurnOnSave(): void {
        this._disableSaveLock = 0;
        clearTimeout(this._saveCheckTimer);
    }

    /**
     * add events to the DagTab
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public on(event, callback): DagTab {
        this._events[event] = callback;
        return this;
    }

    // links tab to graph and vice versa
    public setGraph(graph: DagGraph): void {
        this._dagGraph = graph;
        this._dagGraph.setTabId(this._id);
    }

    public getShortName(): string {
        const name: string = this.getName();
        const splits: string[] = name.split("/");
        return splits[splits.length - 1];
    }

    public downloadStats(name: string): XDPromise<void> {
        let fileName: string = name || this.getShortName();
        fileName += ".json";
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const statsJson = this.getGraph().getStatsJson();

        xcHelper.downloadAsFile(fileName, JSON.stringify(statsJson, null, 4));
        deferred.resolve();

        return deferred.promise();
    }

    public setOpen(): void {
        this._isOpen = true;
    }

    public setClosed(): void {
        this._isOpen = false;
    }

    public isOpen(): boolean {
        return this._isOpen;
    }

    public isLoaded(): boolean {
        return this._dagGraph != null;
    }

    public needReset(): boolean {
        return false;
    }

    public getPath(): string {
        return "";
    }

    // not used
    public serialize(): string {
        return null;
    }

    public getCreatedTime(): number {
        return this._createdTime;
    }

    public resetNodes(nodeIds: DagNodeId[]): void {
        if (this._dagGraph != null) {
            this.turnOffSave();
            this._dagGraph.reset(nodeIds);
            this.turnOnSave();
            this.save();
        }
    }

    protected getRuntime(): DagRuntime {
        // In expServer execution, this function is overridden by DagRuntime.accessible() and should never be invoked.
        // In XD execution, this will be invoked in case the DagNode instance
        // is not decorated by DagRuntime.accessible(). Even the decoration happens,
        // the return object will always be DagRuntime._defaultRuntime, which is the same
        // object as we return in this function.
        return DagRuntime.getDefaultRuntime();
    }

    // the save version of meta
    protected _loadFromKVStore(): XDPromise<{dagInfo: any, graph: DagGraph}> {
        if (this._kvStore == null) {
            return PromiseHelper.reject("Initialize error");
        }
        const deferred: XDDeferred<{dagInfo: any, graph: DagGraph}> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((dagInfo) => {
            try {
                const { graph } = this._loadFromJSON(dagInfo);
                deferred.resolve({dagInfo, graph});
            } catch(e) {
                console.error(e);
                deferred.reject({ error: e.message });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Construct a graph from JSON
     * @param dagInfo
     * @throws Error
     */
    protected _loadFromJSON(dagInfo): { dagInfo: any, graph: DagGraph } {
        if (dagInfo == null) {
            throw new Error(DFTStr.InvalidDF);
        }

        const valid = this._validateKVStoreDagInfo(dagInfo);
        if (valid.error) {
            console.error(valid.error);
            throw new Error(valid.error);
        }

        const graph: DagGraph = this.getRuntime().accessible(new DagGraph());
        try {
            graph.setTabId(this._id);
            graph.create(dagInfo.dag);
        } catch (e) {
            // return an empty graph
            console.error(e);
        }
        return { dagInfo, graph };
    }

    // save meta
    protected _writeToKVStore(json: object): XDPromise<void> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const serializedJSON: string = JSON.stringify(json);
        return this._kvStore.put(serializedJSON, true, true);
    }

    protected _getDurable(includeStats?: boolean): DagTabDurable {
        let dag = this._dagGraph ? this._dagGraph.getSerializableObj(includeStats) : null;
        return {
            name: this._name,
            id: this._id,
            app: this._app,
            appSourceTab: this._appSourceTab,
            dag,
        };
    }

    protected _deleteTableHelper(): XDPromise<void> {
        try {
            if (this._dagGraph != null) {
                this._dagGraph.getAllNodes().forEach((node) => {
                    const tableName = node.getTable();
                    if (tableName) {
                        DagTblManager.Instance.deleteTable(tableName, true);
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
        return PromiseHelper.alwaysResolve(DagTblManager.Instance.forceDeleteSweep());
    }

    protected _deleteAggregateHelper(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagAggManager.Instance.graphRemoval(this._id)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _trigger(event, ...args): void {
        if (typeof this._events[event] === "function") {
            this._events[event].apply(this, args);
        }
    }

    protected _validateKVStoreDagInfo(dagInfo) {
        if (typeof dagInfo !== "object") {
            return {error: "Invalid plan information"}
        }
        if (typeof dagInfo.name !== "string") {
            return {error: "Invalid plan name"}
        }
        if (typeof dagInfo.id !== "string") {
            return {error: "Invalid plan ID"}
        }
        if (!dagInfo.dag  || typeof dagInfo.dag !== "object" ||
            dagInfo.dag.constructor !== Object) {
            return {error: "Invalid plan"}
        }

        return {}
    }

    protected _resetHelper(serializableGraph: DagGraphInfo): DagGraph {
        const graph: DagGraph = new DagGraph();
        graph.createWithValidate(serializableGraph);
        return graph;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagTab = DagTab;
};
