class SQLQuery {
    public queryId: string;
    public queryString: string;
    public logicalPlan: any;
    public optimizations: SQLOptimization;
    public xcQueryString?: string;
    public newTableName?: string;
    public runTxId?: number;
    public allColumns?: SQLColumn[];
    public orderColumns?: SQLColumn[];
    public predicateTargets?: any;
    // For sql history
    public status?: SQLStatus;
    public startTime?: Date;
    public endTime?: Date;
    public errorMsg?: string;
    public dataflowId?: string;
    public dataSkew?: string;
    // For ExpServer invocation
    public fromExpServer?: boolean;
    public tablePrefix?: string;
    public checkTime?: number;

    constructor(
        queryId: string,
        queryString: string,
        logicalPlan: any,
        optimizations: SQLOptimization,
    ) {
        this.queryId = queryId || xcHelper.randName("sql", 8);
        this.queryString = queryString;
        this.logicalPlan = logicalPlan;
        this.optimizations = optimizations;
    }

    // A special setter for status
    public setStatus(status): XDPromise<any> {
        if (this.status === SQLStatus.Done ||
            this.status === SQLStatus.Cancelled ||
            this.status === SQLStatus.Failed) {
            return PromiseHelper.resolve();
        }
        if (status === SQLStatus.Cancelled && this.status === SQLStatus.Running) {
            this.status = status;
            this.endTime = new Date();
            if (!this.fromExpServer) {
                return QueryManager.cancelQuery(this.runTxId);
            } else {
                return XcalarQueryCancel(this.queryId);
            }
        }
        if (!this.status && status === SQLStatus.Running) {
            this.startTime = new Date();
        } else if (this.startTime && status === SQLStatus.Done ||
            status === SQLStatus.Cancelled ||
            status === SQLStatus.Failed) {
            this.endTime = new Date();
        }
        this.status = status;
        return PromiseHelper.resolve();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLQuery = SQLQuery;
}