class MetaInfo extends Durable {
    private TILookup: {[key: string]: TableDurable}; // table meta
    private statsCols: any; // profile meta
    private query: XcQueryDurable[]; // query meta

    constructor(options?: MetaInfDurable) {
        options = options || <MetaInfDurable>{};
        super(options.version);

        this.TILookup = options.TILookup || {};
        this.statsCols = options.statsCols;
        // QueryManager is maintaining the query load/commit
        // but we still keep it here for backward compatible
        this.query = options.query || [];
    }

    public getTableMeta() {
        return this.TILookup;
    }

    public getStatsMeta() {
        return this.statsCols;
    }

    public getQueryMeta() {
        return this.query;
    }

    public serialize(): string {
        let json = this._getDurable();
        return JSON.stringify(json);
    }

    protected _getDurable(): MetaInfDurable {
        return {
            "version": this.version,
            "TILookup": this._saveTables(),
            "statsCols": Profile.getCache()
        }
    }

    // XXX TODO: use serialize function in TableMeta
    private _saveTables() {
        let persistTables = xcHelper.deepCopy(gTables);
        for (var tableId in persistTables) {
            var table = persistTables[tableId];
            if (table.status === TableType.Active) {
                // only store undone/dropped tables and they
                // will be dropped on page refresh
                delete persistTables[tableId];
                continue;
            }
            delete table.currentRowNumber;
            delete table.keyName;
            delete table.keys;
            delete table.resultSetMax;
            delete table.numPages;
            delete table.ordering;
            delete table.scrollMeta;
            if (table.backTableMeta) {
                var metas = table.backTableMeta.metas;
                for (var i = 0; i < metas.length; i++) {
                    delete metas[i].numPagesPerSlot;
                    delete metas[i].numRowsPerSlot;
                }
            }
            delete table.colTypeCache;
            delete table.hiddenSortCols;
            table.tableCols = [];
        }

        $.extend(persistTables, gDroppedTables);
        return persistTables;
    }
}