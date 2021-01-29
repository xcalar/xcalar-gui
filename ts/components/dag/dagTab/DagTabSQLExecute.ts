// a read only tab to test SQL's execution plan
class DagTabSQLExecute extends DagTabExecuteOnly {
    public static readonly ID = "DF_SQLExecute";
    public static readonly Name = "SQL Graph";
    private _sqlStatementName: string;
    private _snippetId: string;

    public constructor(sqlStatementName?: string, snippetId?: string) {
        super(DagTabSQLExecute.ID, DagTabSQLExecute.Name, "noDagTabSQLExecuteAlert");
        this._type = DagTabType.SQLExecute;
        this._sqlStatementName = sqlStatementName;
        this._snippetId = snippetId;
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((ret) => {
            let { graph, dagInfo } = ret;
            if (dagInfo && dagInfo.sqlStatementName) {
                this._sqlStatementName = dagInfo.sqlStatementName;
                this._snippetId = dagInfo.snippetId;
            }
            this.setGraph(graph);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public getIcon(): string {
        return 'xi-menu-sql';
    }

    public getSQLStatementName(){
        return this._sqlStatementName;
    }

    public setSQLStatementName(sqlStatementName: string){
        this._sqlStatementName = sqlStatementName;
    }

    public getSnippetId(){
        return this._snippetId;
    }

    public setSnippetId(snippetId: string){
        this._snippetId = snippetId;
    }

    protected _getDurable(includeStats?: boolean): DagTabSQLExecuteDurable {
        let dag = this._dagGraph ? this._dagGraph.getSerializableObj(includeStats) : null;
        return {
            name: this._name,
            id: this._id,
            sqlStatementName: this._sqlStatementName,
            snippetId: this._snippetId,
            app: this._app,
            appSourceTab: this._appSourceTab,
            dag,
        };
    }
}