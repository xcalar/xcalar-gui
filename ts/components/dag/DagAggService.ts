class DagAggService {
    private _aggregates: Map<string, AggregateInfo> = new Map();

    public getAgg(aggName: string): AggregateInfo {
        if (this._hasManager()) {
            return DagAggManager.Instance.getAgg(aggName);
        } else {
            return this._aggregates.get(aggName);
        }
    }

    /**
     * Adds/replaces an aggregate represented by aggName and aggInfo
     * @param aggName
     * @param aggInfo
     */
    public addAgg(aggName: string, aggInfo: AggregateInfo): XDPromise<void> {
        if (this._hasManager()) {
            return DagAggManager.Instance.addAgg(aggName, aggInfo);
        } else {
            this._aggregates.set(aggName, aggInfo);
            return PromiseHelper.resolve();
        }
    }

    /**
     * Returns if aggName exists yet
     * @param aggName
     */
    public hasAggregate(aggName: string): boolean {
        if (this._hasManager()) {
            return DagAggManager.Instance.hasAggregate(aggName);
        } else {
            return (this._aggregates.has(aggName));
        }
    }

    /** Returns the map of aggregates */
    public getAggMap(): {[key: string]: AggregateInfo} {
        if (this._hasManager()) {
            return DagAggManager.Instance.getAggMap();
        } else {
            const result = {};
            this._aggregates.forEach((aggInfo, aggName) => {
                result[aggName] = aggInfo;
            });
            return result;
        }
    }

    /** Finds the source node of an aggregate.
     * Throws an error if it cant find it.
     * @param fullAggName: string
    */
    public findAggSource(fullAggName: string): DagNodeAggregate {
        if (!this.hasAggregate(fullAggName)) {
            return null;
        }
        let agg: AggregateInfo = this.getAgg(fullAggName);
        if (agg.node == '' || agg.graph == '') {
            throw new Error(DagNodeErrorType.NoGraph);
        }

        const dagTab: DagTab = this.getRuntime().getDagTabService().getTabById(agg.graph);
        if (dagTab == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const graph: DagGraph = dagTab.getGraph();
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const node: DagNodeAggregate = <DagNodeAggregate>graph.getNode(agg.node);
        if (node == null) {
            throw new Error(DagNodeErrorType.NoAggNode);
        }
        return node;
    }

    private _hasManager(): boolean {
        return typeof DagAggManager !== 'undefined';
    }
    protected getRuntime(): DagRuntime {
        return DagRuntime.getDefaultRuntime();
    }
}

if (typeof exports !== 'undefined') {
    exports.DagAggService = DagAggService;
}