interface XcQueryOptions extends XcQueryDurable {
    name: string;
    fullName: string;
    id: number;
    type: string;
    numSteps: number;
    srcTables: string[];
    state: string | QueryStateT;
    cancelable: boolean;
    dataflowId: string;
}

class XcQuery extends Durable {
    public fullName: string;
    public name: string;
    public currStep: number; // (integer) current step
    public outputTableState: string | number; // output table state
    public state: string | QueryStateT;
    public subQueries: XcSubQuery[];
    public numSteps: number; // (integer) total steps in query
    public error: string;
    public id: number; // (integer) query id
    public cancelable: boolean; // can cancel or not
    public srcTables: string[];
    public sqlNum: number;

    private time: number // date
    private elapsedTime: number; //(integer) time used,
    private opTime: number; // (integer) backend time used,
    private opTimeAdded: boolean;
    private type: string; // query type
    private outputTableName: string; // output table
    private queryStr: string; // query string
    private indexTables: string[]; // used to hold reused indexed tables
    private queryMeta: string;

    constructor(options: XcQueryOptions) {
        options = options || <XcQueryOptions>{};
        super(options.version);
        this.name = options.name;
        this.time = options.time;
        this.elapsedTime = options.elapsedTime || 0;
        this.fullName = options.fullName; // real name for backend
        this.type = options.type;
        this.id = options.id;
        this.numSteps = options.numSteps;
        this.currStep = 0;
        this.outputTableName = options.outputTableName || "";
        this.outputTableState = options.outputTableState || "";
        this.queryStr = options.queryStr || "";
        this.subQueries = [];
        this.srcTables = options.srcTables || null;
        this.queryMeta = options.queryMeta || "";

        if (options.state == null) {
            this.state = QueryStateT.qrNotStarted;
        } else {
            this.state = options.state;
        }
        if (options.cancelable == null) {
            this.cancelable = true;
        } else {
            this.cancelable = options.cancelable;
        }

        this.opTime = options.opTime || 0;
        this.opTimeAdded = options.opTimeAdded || false;
        this.error = options.error;
        this.indexTables = [];
    }

    public getName(): string {
        return this.name;
    }

    public getFullName(): string {
        return this.fullName;
    }

    public getId(): number {
        return this.id;
    }

    public getTime(): number {
        return this.time;
    }

    public getElapsedTime(): number {
        return this.elapsedTime;
    }

    public setElapsedTime(): void {
        this.elapsedTime = Date.now() - this.time;
    }

    public addOpTime(time): void {
        this.opTimeAdded = true;
        this.opTime += time;
    }

    public setOpTime(time: number): void {
        this.opTimeAdded = true;
        this.opTime = time;
    }

    public getOpTime(): string | number {
        if (this.opTimeAdded) {
            return this.opTime;
        } else {
            return CommonTxtTstr.NA;
        }
    }

    public getQuery(): string {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        if (this.queryStr) {
            return this.queryStr;
        }

        if (this.subQueries.length) {
            var queries = "";
            for (var i = 0; i < this.subQueries.length; i++) {
                queries += this.subQueries[i].query;
                if (i + 1 != this.subQueries.length) {
                    queries += ",";
                }
            }
            return queries;
        } else {
            return "";
        }
    }

    public getQueryMeta(): string {
        return this.queryMeta;
    }

    public getOutputTableName(): string {
        let subQueries = this.subQueries;
        if (this.state === QueryStatus.Done) {
            if (this.outputTableName) {
                return this.outputTableName;
            }
            if (!subQueries.length) {
                return null;
            } else {
                var lastSubQuery = subQueries[subQueries.length - 1];
                if (this.outputTableState === "exported") {
                    this.outputTableName = lastSubQuery.exportFileName;
                    return this.outputTableName;
                } else {
                    for (var i = subQueries.length - 1; i >= 0; i--) {
                        if (subQueries[i].name && subQueries[i].name.indexOf("drop") !== 0) {
                            this.outputTableName = subQueries[i]
                                                        .dstTable;
                            return this.outputTableName;
                        }
                    }
                    return null;
                }
            }
        } else {
            return null;
        }
    }

    // excludes src tables
    public getAllTableNames(force: boolean): string[] {
        let tables: string[] = [];
        let subQueries = this.subQueries;
        if (force || this.state === QueryStatus.Done) {
            let droppedTables: string[] = [];
            let finalTable: string = this.getOutputTableName();
            for (let i = subQueries.length - 1; i >= 0; i--) {
                if (!subQueries[i].dstTable) {
                    continue;
                }
                if (subQueries[i].name && subQueries[i].name.indexOf("drop") !== 0) {
                    tables.push(subQueries[i].dstTable);
                } else {
                    droppedTables.push(subQueries[i].dstTable);
                }
            }
            // XXX will not need to do this check once backend allows
            // tagging of dropped tables
            for (let i = 0; i < droppedTables.length; i++) {
                let droppedTable: string = droppedTables[i];
                if (droppedTable.endsWith("drop")) {
                    droppedTable = droppedTable.slice(0,
                                                droppedTable.length - 4);
                }
                let indexOfDropped: number = tables.indexOf(droppedTable);
                if (indexOfDropped !== -1) {
                    tables.splice(indexOfDropped, 1);
                }
            }
            let indexOfFinalTable: number = tables.indexOf(finalTable);
            if (indexOfFinalTable !== -1) {
                tables.splice(indexOfFinalTable, 1);
                tables.splice(0, 0, finalTable);
            }
        }
        return tables;
    }

    public addIndexTable(tableName: string): void {
        if (this.indexTables.indexOf(tableName) === -1) {
            this.indexTables.push(tableName);
        }
    }

    public getIndexTables(): string[] {
        return this.indexTables;
    }

    public getOutputTableState(): string | number | null {
        if (this.state === QueryStatus.Done) {
            return this.outputTableState;
        } else {
            return null;
        }
    }

    public addSubQuery(subQuery: XcSubQuery): void {
        this.subQueries.push(subQuery);
    }

    public setState(state:  string | QueryStateT): void {
        this.state = state;
    }

    public getState(): string | QueryStateT {
        return this.state;
    }

    public getStateString(): string {
        return QueryStateTStr[this.state];
    }

    public check(): XDPromise<any> {
        if (this.type === "xcQuery") {
            return XcalarQueryState(this.fullName);
        } else {
            return PromiseHelper.resolve();
        }
    }

    public run(): XDPromise<any> {
        if (this.state === QueryStateT.qrNotStarted) {
            return XcalarQuery(this.fullName, this.getQuery());
        } else {
            let error = "cannot run query that with state:" + this.getStateString();
            return PromiseHelper.reject({
                "error": error,
                "state": this.state
            });
        }
    }

    // not used
    public serialize(): string {
        return null;
    }

    public getDurable(): [XcQueryDurable, string] {
        return this._getDurable();
    }

    public static parseTimeFromKey(durableKey: string): number {
        try {
            const parts = durableKey.split('-');
            if (parts.length === 1) {
                return Number.NaN; // No sepatator found
            }
            return Number.parseInt(parts[0]);
        } catch(e) {
            console.warn(e);
            return Number.NaN;
        }
    }

    protected _getDurable(): [XcQueryDurable, string] {
        let abbrQueryObj: XcQueryDurable = null;
        let key: string = null;
        let state = this.state;
        if (state === QueryStatus.Done ||
            state === QueryStatus.Cancel ||
            state === QueryStatus.Error
        ) {
            abbrQueryObj = {
                "version": this.version,
                "sqlNum": null,
                "time": this.time || Date.now(),
                "elapsedTime": this.elapsedTime,
                "opTime": this.opTime,
                "opTimeAdded": this.opTimeAdded,
                "outputTableName": this.getOutputTableName(),
                "outputTableState": this.getOutputTableState(),
                "state": this.state
            };

            // Optional fields
            if (this.name != null) {
                abbrQueryObj.name = this.name;
            }
            if (this.fullName != null) {
                abbrQueryObj.fullName = this.fullName;
            }
            if (this.queryMeta != null) {
                abbrQueryObj.queryMeta = this.queryMeta;
            }
            if (state === QueryStatus.Error) {
                abbrQueryObj.error = this.error;
            }
            const queryStr = this.getQuery();
            if (queryStr != null && queryStr.length > 0) {
                abbrQueryObj.queryStr = queryStr;
            }

            // Prefix the key with time, so that we can fetch keys in order
            key = this.fullName == null
                ? null
                : `${this.time}-${this.fullName}`;
        }

        return [abbrQueryObj, key];
    }
}