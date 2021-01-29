class DagTabQuery extends DagTabProgress {
    public static readonly PATH = "Abandoned executions/";
    public static readonly SDKPATH = "SDK Apps/";
    private static _abandonedQueryPrefix;
    private _isSDK: boolean;
    protected _state: string;
    protected _isStatsGraph: boolean;

    constructor(options: {
        id: string,
        name: string,
        queryName: string,
        state: string,
        isStatsGraph?: boolean
    }) {
        super(options);
        this._queryName = options.queryName;
        this._state = options.state;
        this._type = DagTabType.Query;
        if (this._queryName.startsWith(DagTabQuery.abandonedQueryPrefix) ||
            this._queryName.startsWith("table_published_")) {
            let timeStr: string = this._queryName.slice(this._queryName.lastIndexOf("#t_") + 3);
            timeStr = timeStr.slice(0, timeStr.indexOf("_"));
            if (timeStr.length) {
                let time = parseInt(timeStr);
                if (!isNaN(time)) {
                    this._createdTime = time;
                }
            }
            this._isSDK = false;
        } else {
            this._isSDK = true;
        }
    }

    public static get abandonedQueryPrefix() {
        return this._abandonedQueryPrefix || (this._abandonedQueryPrefix = this._getAbandonedQueryPrefix())
    }

    private static _getAbandonedQueryPrefix() {
        const activeWKBNK: string = WorkbookManager.getActiveWKBK();
        const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
        return "table_DF2_" + workbook.sessionId + "_";
    }

    public getPath(): string {
        if (this._isSDK) {
            return DagTabQuery.SDKPATH + this.getName();
        } else {
            return DagTabQuery.PATH + this.getName();
        }
    }

    public getState(): string {
        return this._state;
    }

    public setState(state: string) {
        this._state = state;
    }

    public isSDK(): boolean {
        return this._isSDK;
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._isDoneExecuting = false;

        XcalarQueryState(this._queryName)
        .then((graph) => {
            this._dagGraph = this._constructGraphFromQuery(graph.queryGraph.node);
            this._dagGraph.startExecution(graph.queryGraph.node, null);
            this.setGraph(this._dagGraph);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public delete(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._isDeleted = true;
        this._queryCheckId++;

        XcalarQueryDelete(this._queryName)
        .then(deferred.resolve)
        .fail((error) => {
            if (error && error.status === StatusT.StatusQrQueryNotExist) {
                deferred.resolve();
            } else {
                this._isDeleted = false;
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public isStatsGraph() {
        return this._isStatsGraph;
    }
}

if (typeof runEntity !== "undefined") {
    runEntity.DagTabQuery = DagTabQuery;
}