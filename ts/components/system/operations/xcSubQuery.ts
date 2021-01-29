/* sub query */

/* Attr:
    name: (string) subQuery's name
    time: (date) craeted time
    query: (string) query
    dstTable: (string) dst table
    id: (integer) subQuery's id
    index: (integer) subQuery's index
    queryName: (string) query name
    state: (string) enums in QueryStateT
    exportFileName: (string, optional) export's file
    retName: (string, optional) retName
*/

interface XcSubQueryOptions {
    dstTable?: string;
    queryName?: string;
    retName?: string;
    index?: number;
    name?: string;
    time?: number;
    query?: string;
    id?: number;
    exportFileName?: string;
    state?: QueryStatus | QueryStateT;
}

class XcSubQuery {
    public dstTable: string;
    public state: QueryStatus | QueryStateT;
    public queryName: string;
    public retName: string;
    public index: number;
    public name: string;
    public query: string;

    private time: number;
    private id: number;
    public exportFileName: string;

    public constructor(options: XcSubQueryOptions) {
        options = options || {};
        this.name = options.name;
        this.time = options.time;
        this.query = options.query;
        this.dstTable = options.dstTable;
        this.id = options.id;
        this.index = options.index;
        this.queryName = options.queryName;

        if (options.state == null) {
            this.state = QueryStateT.qrNotStarted;
        } else {
            this.state = options.state;
        }
        if (options.exportFileName) {
            this.exportFileName = options.exportFileName;
        }
        this.retName = options.retName || "";
    }

    public getName(): string {
        return this.name;
    }

    public getId(): number {
        return this.id;
    }

    public getTime(): number {
        return this.time;
    }

    public getQuery(): string {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        return this.query;
    }

    public getState(): QueryStatus | QueryStateT {
        return this.state;
    }

    public setState(state: QueryStatus | QueryStateT) {
        this.state = state;
    }

    public getStateString(): string {
        return QueryStateTStr[this.state];
    }

    public getProgress(): XDPromise<number> {
        const self: XcSubQuery = this;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        if (!self.dstTable || self.name.startsWith("drop") || self.name.startsWith("Destroy")) {
            // XXX This happens if the call is a "drop"
            // Since we don't have a dstDag call, we will just return 50%
            deferred.resolve(50);
            // xcAssert(self.dstTable, "Unexpected operation! " + self.name);
        } else {
            XcalarGetOpStats(self.dstTable)
            .then(function(ret: OpStatsOutput) {
                const stats: OpStatsDetails = ret.opDetails;
                let pct: number = stats.numWorkCompleted / stats.numWorkTotal;
                if (isNaN(pct)) {
                    pct = 0;
                } else {
                    pct = Math.max(0, pct);
                    pct = parseFloat((100 * pct).toFixed(2));
                }
                deferred.resolve(pct);
            })
            .fail(function(error) {
                console.error(error, self.dstTable, self.name);
                deferred.reject(error);
            });
        }

        return deferred.promise();
    }
}
/* end of sub query */
