class DagTabSQL extends DagTab {
    public static PATH = "SQL/";
    private _SQLNode: DagNodeSQL;

    constructor(options: {
        id: string,
        name: string,
        SQLNode: DagNodeSQL
    }) {
        super(options);
        this._SQLNode = options.SQLNode;
        this._type = DagTabType.SQL;
    }

    /**
     * Saves this Tab in the kvStore
     */
    public save(): XDPromise<void> {
        return DagTabManager.Instance.saveParentTab(this.getId());
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._SQLNode.getSubGraph();
    }

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    // do nothing
    public load(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public delete(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    // do nothing
    public download(): XDPromise<void> {
        return PromiseHelper.reject({error: "Not support"});
    }

    // do nothing
    public upload(): XDPromise<{tabUploaded: DagTab, alertOption?: Alert.AlertOptions}> {
        return PromiseHelper.reject({error: "Not support"});
    }
}