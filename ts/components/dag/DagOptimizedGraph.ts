class DagOptimizedGraph extends DagSubGraph {
    private _queryName: string;
    constructor() {
        super();
    }
    public setTableNodeIdMaps(tableNameToDagIdMap, dagIdToTableNamesMap) {
        this._tableNameToDagIdMap = tableNameToDagIdMap;
        this._dagIdToTableNamesMap = dagIdToTableNamesMap;
    }

    public reexecute(): XDPromise<any> {
        if (this.currentExecutor != null) {
            return PromiseHelper.reject(ErrTStr.DFInExecution);
        }
        let lastNode = this.getTerminalNodes()[0];
        let outputTable;
        let isActiveSession = true;
        if (lastNode) {
            outputTable = lastNode.getTable();
            if (lastNode instanceof DagNodeExport) {
                isActiveSession = false;
            }
        }
        this.unsetNoTableDelete();
        this.reset();

        let executor = new DagGraphExecutor(null, this, {
            optimized: true,
            hasProgressGraph: true,
            queryName: this._queryName
        });

        this.setExecutor(executor);
        executor._isOptimizedActiveSession = isActiveSession;

        this.lockGraph(null, this.currentExecutor);
        const deferred = PromiseHelper.deferred();

        XcalarGetRetinaJson(this._queryName)
        .then((_retina) => {
            return PromiseHelper.alwaysResolve(XcalarQueryDelete(this._queryName))
        })
        .then(() => {
            this.getAllNodes().forEach((node) => {
                node.beRunningState();
            });
            this.setNoTableDelete();
            // this triggers the tab to check progress on the execution
            this.events.trigger(DagGraphEvents.ReexecuteStart, {});

            const dagTab: DagTabOptimized = DagTabManager.Instance.getTabById(this.parentTabId) as DagTabOptimized;

            return executor.executeRetina(dagTab, this._queryName, outputTable);
        })
        .then(()=> {
            if (outputTable) {
                DagTblManager.Instance.addTable(outputTable);
            }
            deferred.resolve(outputTable);
        })
        .fail(deferred.reject)
        .always(() => {
            this.unlockGraph();
        })

        return deferred.promise();
    }

    public setQueryName(queryName) {
        this._queryName = queryName;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagOptimizedGraph = DagOptimizedGraph;
}