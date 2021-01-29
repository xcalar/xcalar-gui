class DagParamManager {
    private static _instance = null;
    private parameters = {};
    private sqlNodesParamMap: {[nodeId: string]: Set<string>} = {};
    private sqlNodesMap: {[nodeId: string]: DagNodeSQL} = {};

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gDagParamKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then((info) => {
            if (info) {
                try {
                    this.parameters = JSON.parse(info);
                } catch (err) {
                    console.error(err);
                    this.parameters = {};
                }
            } else {
                this.parameters = {};
            }
            deferred.resolve();
        })
        .fail((err) => {
            console.error(err);
            deferred.reject();
        });
        return deferred.promise();
    }

    public getParamMap() {
        return this.parameters;
    }

    public updateParamMap(params: {paramName: string}): XDPromise<void> {
        const changedParams: Set<string> = new Set();
        for (const key in params) {
            if (!this.parameters.hasOwnProperty(key) ||
                this.parameters[key] !== params[key]) {
                changedParams.add(key);
            }
        }
        for (const key in this.parameters) {
            if (!params.hasOwnProperty(key)) {
                changedParams.add(key);
            }
        }
        for (const nodeId in this.sqlNodesParamMap) {
            if (this.sqlNodesParamMap[nodeId]) {
                let toReset = false;
                for (const param of this.sqlNodesParamMap[nodeId].entries()) {
                    if (changedParams.has(param[0]) &&
                        this.sqlNodesMap[nodeId]) {
                        // when it's changed, reset SQL nodes that are using it
                        toReset = true;
                        break;
                    }
                }
                if (toReset) {
                    this.sqlNodesMap[nodeId].setXcQueryString(null);
                    this.sqlNodesMap[nodeId].setRawXcQueryString(null);
                }
            }
        }
        this.parameters = params;
        let key: string = KVStore.getKey("gDagParamKey");
        const kvstore = new KVStore(key, gKVScope.WKBK);
        return kvstore.put(JSON.stringify(this.parameters), true, true);
    }

    public updateSQLParamMap(node: DagNodeSQL, params?: string[]): void {
        const nodeId = node.getId();
        if (params && params.length > 0) {
            this.sqlNodesParamMap[nodeId] = new Set(params);
            this.sqlNodesMap[nodeId] = node;
        } else {
            delete this.sqlNodesParamMap[nodeId];
            delete this.sqlNodesMap[nodeId];
        }
    }

    public checkParamInUse(_paramName) {
        //XXX may not need to implement
    }
}

if (typeof exports !== 'undefined') {
    exports.DagParamManager = DagParamManager;
};
