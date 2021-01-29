interface TableMetaOptions extends TableDurable {
    isLocked?: boolean;
    backTableMeta?: any;
}

class TableMeta extends Durable {
    public static readonly NumEntriesPerPage: number = 20;

    public tableName: string; // table's name
    public tableId: TableId; // table's id
    public tableCols: ProgCol[];
    public backTableMeta: any; // (obj) backTableMeta, not persistent
    public status: TableType; // enums of TableType
    public highlightedCells: object;
    public currentRowNumber: number; // (integer, not persist) current row number
    public resultSetCount: number; // (integer) total row num
    public resultSetMax: number; // (integer, not persist) last row able to fetch
    public resultSetId: string; // result id
    public rowHeights: any; // row height cache
    public allImmediates: boolean;
    public scrollMeta: {isTableScrolling: boolean, isBarScrolling: boolean, base: number, scale: number};

    private isLocked: boolean; // if table is locked
    private timeStamp: number; // (date) last change time
    private icv: string; // icv table
    private skewness: number; // (num), not persistent
    private keyName: string[]; // (not persist) column on index
    private keys: {name: string, ordering: string}[];
    private ordering: XcalarOrderingT;
    private numPages: number; // (integer, not persist) num of pages
    private indexTables: object; // (obj) cache column's indexed table
    private complement: string; // complement table
    private colTypeCache: Map<string, ColumnType>; // (obj) cache known column type, not persist
    private hiddenSortCols: object; // (obj) a {derivedColName: prefixColName} map of columns to be hidden from the data browser modal

    constructor(options: TableMetaOptions) {
        options = options || <TableMetaOptions>{};
        super(options.version);

        if (!options.tableName || !options.tableId) {
            throw new Error("error table meta!");
        }

        this.tableName = options.tableName;
        this.tableId = options.tableId;
        this.isLocked = options.isLocked || false;
        this.status = options.status || TableType.Active;
        this.timeStamp = options.timeStamp || xcTimeHelper.getCurrentTimeStamp();

        this.rowHeights = options.rowHeights || {}; // a map

        this.currentRowNumber = -1;
        if (options.resultSetId) {
            this.resultSetId = options.resultSetId;
        } else {
            this.resultSetId = null;
        }

        if (options.resultSetCount != null) {
            this.resultSetCount = options.resultSetCount;
        } else {
            this.resultSetCount = -1; // placeholder
        }

        this.icv = options.icv || "";
        this.keyName = []; // placeholder
        this.keys = []; // placeholder
        this.ordering = null; // placeholder
        this.backTableMeta = null; // placeholder
        this.resultSetMax = -1; // placeholder
        this.numPages = -1; // placeholder

        this.tableCols = this._restoreProgCol(<ProgColDurable[]>options.tableCols);
        this.complement = options.complement || "";

        this.backTableMeta = options.backTableMeta || null;
        this.colTypeCache = new Map();
        this.hiddenSortCols = {};
    }

    public getId(): TableId {
        return this.tableId;
    }

    public getName(): string {
        return this.tableName;
    }

    public getTimeStamp(): number {
        return this.timeStamp;
    }

    public updateTimeStamp(): void {
        this.timeStamp = xcTimeHelper.getCurrentTimeStamp();
    }

    public lock(): void {
        this.isLocked = true;
    }

    public unlock(): void {
        this.isLocked = false;
    }

    public hasLock(): boolean {
        return this.isLocked;
    }

    public getMeta(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        XIApi.getTableMeta(this.tableName)
        .then((tableMeta) => {
            if (tableMeta == null || tableMeta.valueAttrs == null) {
                console.error("backend return error");
                deferred.resolve();
                return;
            }

            this.backTableMeta = tableMeta;
            this.ordering = tableMeta.ordering;
            this.keyName = xcHelper.getTableKeyFromMeta(tableMeta);
            this.keys = xcHelper.getTableKeyInfoFromMeta(tableMeta);
            this._setSkewness();
            // update immediates
            let valueAttrs = [];
            if (tableMeta.valueAttrs != null) {
                valueAttrs = tableMeta.valueAttrs;
            }
            if (tableMeta.numValues === tableMeta.numImmediates) {
                this.allImmediates = true;
            }

            valueAttrs.forEach((valueAttr) => {
                if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                    // fat pointer
                    return;
                }
                let progCol = this.getColByBackName(xcHelper.escapeColName(valueAttr.name));
                if (progCol != null) {
                    progCol.setImmediateType(valueAttr.type);
                }
            });

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getAllCols(onlyValid: boolean = false): ProgCol[] {
        if (onlyValid) {
            // ignores datacol and empty cols
            return this.tableCols.filter((col) => {
                let name = col.backName.trim();
                return name.length && !col.isDATACol();
            });
        } else {
            return this.tableCols;
        }
    }

    public addAllCols(columns: ProgCol[]): boolean {
        if (columns == null || columns.length === 0) {
            return false;
        }
        let progCols: ProgCol[] = [];
        columns.forEach((progCol) => {
            if (!progCol.isDATACol() && !progCol.isEmptyCol()) {
                let colName = progCol.getBackColName();
                this.colTypeCache.set(colName, progCol.getType());
            }
            progCols.push(progCol);
        });
        this.tableCols = progCols;
        return true;
    }

    public addToColTypeCache(colMap: Map<string, ProgCol>) {
        for (let [colName, progCol] of colMap) {
            if (!this.colTypeCache.get(colName)) {
                this.colTypeCache.set(colName, progCol.getType());
            }
        }
    }

    public addCol(colNum: number, progCol: ProgCol): boolean {
        let index: number = colNum - 1;
        if (index < 0 || !progCol) {
            return false;
        }

        this.tableCols.splice(index, 0, progCol);
        let backColName = progCol.getBackColName();
        if (progCol.getType() == null) {
            progCol.setType(this.colTypeCache.get(backColName) || null);
        }

        if (this.backTableMeta != null) {
            let valueAttrs = this.backTableMeta.valueAttrs || [];
            valueAttrs.some((valueAttr) => {
                if (valueAttr.name === backColName &&
                    valueAttr.type !== DfFieldTypeT.DfFatptr) {
                    progCol.setImmediateType(valueAttr.type);
                    // end loop
                    return true;
                }
            });
        } else {
            console.error("no table meta!");
        }
    }

    public removeCol(colNum: number): ProgCol | null {
        let index: number = colNum - 1;
        if (index < 0 || this.tableCols[index] == null) {
            return null;
        }

        let removed = this.tableCols[index];
        this.tableCols.splice(index, 1);
        return removed;
    }

    public sortCols(sortKey: ColumnSortType, order: ColumnSortOrder): void {
        sortKey = sortKey || ColumnSortType.name;

        this.tableCols.sort((a, b) => {
            let aVal: string;
            let bVal: string;
            if (sortKey === ColumnSortType.type) {
                aVal = a.getType();
                bVal = b.getType();
            } else if (sortKey === ColumnSortType.prefix) {
                aVal = a.getPrefix();
                bVal = b.getPrefix();
            } else {
                // sort by name
                aVal = a.getFrontColName();
                bVal = b.getFrontColName();
            }

            let res = xcHelper.sortVals(aVal, bVal, order);
            if (res === 0 && sortKey !== ColumnSortType.name) {
                // when equal, sort by name
                aVal = a.getFrontColName();
                bVal = b.getFrontColName();
                res = xcHelper.sortVals(aVal, bVal, order);
            }

            return res;
        });
    }

    public updateResultset(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        PromiseHelper.alwaysResolve(this.freeResultset())
        .then(() => {
            return XcalarMakeResultSetFromTable(this.tableName);
        })
        .then((resultSet) => {
            this.resultSetId = resultSet.resultSetId;
            this.resultSetCount = resultSet.numEntries;
            this.resultSetMax = resultSet.numEntries;
            this.numPages = Math.ceil(this.resultSetCount / TableMeta.NumEntriesPerPage);

            deferred.resolve();
        })
        .fail((error) => {
            if (error && typeof error === "object") {
                let errMsg: string = error.log || error.error;
                if (error.status === StatusT.StatusDagNodeNotFound) {
                    errMsg = "table is deleted, please re-run the query to generate the table.";
                }
                errMsg = "View result error: " + errMsg;
                deferred.reject(errMsg);
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    public getMetaAndResultSet(): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();

        this.updateResultset()
        .then(() => {
            return this.getMeta();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    public freeResultset(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (this.resultSetId == null) {
            deferred.resolve();
        } else {
            XcalarSetFree(this.resultSetId)
            .then(() => {
                this.resultSetId = null;
                deferred.resolve();
            })
            .fail(deferred.reject);
        }

        return deferred.promise();
    }

    public getType(): TableType {
        return this.status;
    }

    public getKeyName(): string[] {
        return this.keyName;
    }

    public getKeys(): {name: string, ordering: string}[] {
        return this.keys;
    }

    public getOrdering(): XcalarOrderingT {
        return this.ordering;
    }

    public getImmediates(): any[] {
        return this._getColMeta(true, null);
    }

    public getFatPtr(): any[] {
        return this._getColMeta(false, null);
    }

    public getImmediateNames(): any[] {
        return this._getColMeta(true, "name");
    }

    public getFatPtrNames(): any[] {
        return this._getColMeta(false, "name");
    }

    public showIndexStyle(): boolean {
        let order = this.ordering;
        if (order !== XcalarOrderingT.XcalarOrderingAscending &&
            order !== XcalarOrderingT.XcalarOrderingDescending) {
            return false;
        } else {
            return true;
        }
    }

    // XXX TODO: remove it
    public beOrphaned(): TableMeta {
        this.status = TableType.Orphan;
        return this;
    }

    // XXX TODO: remove it
    public beDropped(): TableMeta {
        this.status = TableType.Dropped;
        var table = this;

        delete table.backTableMeta;
        delete table.currentRowNumber;
        delete table.highlightedCells;
        delete table.indexTables;
        delete table.isLocked;
        delete table.keyName;
        delete table.keys;
        delete table.numPages;
        delete table.ordering;
        delete table.resultSetId;
        delete table.resultSetMax;
        delete table.rowHeights;
        delete table.scrollMeta;
        delete table.skewness;
        delete table.timeStamp;

        if (!table.complement) {
            delete table.complement;
        }
        if (!table.icv) {
            delete table.icv;
        }
        // keeping resultSetCount, status, tableCols, tableId, tableName

        var col;
        for (var i = 0; i < table.tableCols.length; i++) {
            col = table.tableCols[i];
            delete col.decimal;
            delete col.format;
            delete col.isMinimized;
            delete col.knownType;
            delete col.sizedTo;
            delete col.textAlign;
            delete col.userStr;
            delete col.width;
            if (!col.immediate) { // delete if false
                delete col.immediate;
            }
            // keep "isNewCol" property or it later gets set to true
            // keeping prefix, name, backname, func, type, isNewCol
        }
        return this;
    }

    public isDropped(): boolean {
        return (this.status === TableType.Dropped);
    }

    public getCol(colNum: number): ProgCol | null {
        let tableCols: ProgCol[] = this.tableCols || [];
        if (colNum < 1 || colNum > tableCols.length) {
            return null;
        }

        return tableCols[colNum - 1];
    }

    public setCol(col: ProgCol, colNum: number): void {
        let tableCols: ProgCol[] = this.tableCols || [];
        tableCols[colNum - 1] = col;
    }

    public getNumCols(): number {
        let tableCols: ProgCol[] = this.tableCols || [];
        return tableCols.length;
    }

    public getColNumByBackName(backColName: string): number {
        let tableCols: ProgCol[] = this.tableCols || [];
        for (let i = 0, len = tableCols.length; i < len; i++) {
            let progCol = tableCols[i];
            if (progCol.getBackColName() === backColName) {
                return (i + 1);
            }
        }
        return -1;
    }

    public getColNumByFrontName(frontColName: string): number {
        let tableCols: ProgCol[] = this.tableCols || [];
        let res = xcHelper.parsePrefixColName(frontColName);
        let prefix = res.prefix;
        let colName = res.name;

        for (let i = 0, len = tableCols.length; i < len; i++) {
            let progCol = tableCols[i];
            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (progCol.getPrefix() === prefix &&
                progCol.getFrontColName() === colName)
            {
                // check fronColName
                return (i + 1);
            }
        }
        return -1;
    }

    public getColByBackName(backColName: string): ProgCol | null {
        // get progCol from backColName
        let tableCols: ProgCol[] = this.tableCols || [];
        for (let i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isNewCol || progCol.isDATACol()) {
                // skip new column and DATA column
                continue;
            } else if (progCol.getBackColName() === backColName) {
                return progCol;
            }
        }

        return null;
    }

    public getColByFrontName(frontColName: string): ProgCol | null {
        let tableCols: ProgCol[] = this.tableCols || [];
        let res = xcHelper.parsePrefixColName(frontColName);
        let prefix = res.prefix;
        let colName = res.name;

        for (let i = 0, len = tableCols.length; i < len; i++) {
            let progCol = tableCols[i];
            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (progCol.getPrefix() === prefix &&
                progCol.getFrontColName() === colName
            ) {
                // check fronColName
                return progCol;
            }
        }
        return null;
    }

    public hasColWithBackName(
        backColName: string,
        includeMeta?: boolean
    ): boolean {
        // this check if table has the backCol,
        // it does not check frontCol
        let tableCols: ProgCol[] = this.tableCols || [];
        for (let i = 0, len = tableCols.length; i < len; i++) {
            let progCol = tableCols[i];
            if (progCol.isNewCol || progCol.isDATACol()) {
                // skip new column and DATA column
                continue;
            } else if (progCol.getBackColName() === backColName) {
                return true;
            }
        }
        if (includeMeta && this.backTableMeta &&
            this.backTableMeta.valueAttrs) {
            let derivedFields = this.backTableMeta.valueAttrs;
            for (let i = 0, len = derivedFields.length; i < len; i++) {
                if (derivedFields[i].type !== DfFieldTypeT.DfFatptr) {
                    if (derivedFields[i].name === backColName) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public hasCol(
        colName: string,
        prefix: string,
        onlyCheckPulledCol: boolean
    ): boolean {
        // check both fronName and backName
        let tableCols: ProgCol[] = this.tableCols || [];
        let hasBackMeta: boolean = (this.backTableMeta != null && this.backTableMeta.valueAttrs != null);
        if (!onlyCheckPulledCol && prefix === "" && hasBackMeta) {
            // when it's immediates, when use backMeta to check
            let valueAttrs = this.backTableMeta.valueAttrs;
            let found: boolean = valueAttrs.some((valueAttr) => {
                if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                    // fat pointer
                    return false;
                }
                if (colName === valueAttr.name) {
                    return true;
                }
            });

            return found;
        }

        // when it's fatPtr or no back meta to check
        for (let i = 0, len = tableCols.length; i < len; i++) {
            let progCol = tableCols[i];

            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (prefix != null && progCol.getPrefix() !== prefix) {
                continue;
            }

            if (!progCol.isNewCol && progCol.getBackColName() === colName) {
                // check backColName
                return true;
            }

            if (progCol.getFrontColName() === colName) {
                // check fronColName
                return true;
            }
        }

        return false;
    }

    public getColContents(colNum: number): string[] | null {
        // Returns JSON array containing the current contents of the column
        // colName is front or back name
        // Returns null if column does not exist
        let curId = this.getId();
        var $curTable = $("#xcTable-" + curId);
        if (this.getCol(colNum) === null) {
            return null;
        }

        let colContents: string[] = [];
        $curTable.find("td.col" + colNum).each(function() {
            let $textDiv = $(this).find(".originalData");
            colContents.push($textDiv.text());
        });

        return colContents;
    }

    public getRowDistribution(): number[] {
        return this.backTableMeta.metas.map((meta) => meta.numRows);
    }

    public getSkewness(): number {
        return this.skewness;
    }

    public getSize(): number {
        let sizes: number[] = this.backTableMeta.metas.map((meta) => meta.size);
        let totalSize = sizes.reduce((sum, value) => {
            return sum + value;
        }, 0);
        return totalSize;
    }

    public setHiddenSortCols(cols: object) {
        this.hiddenSortCols = cols;
    }

    public getHiddenSortCols(): object {
        return this.hiddenSortCols;
    }

    // for new prog cols, sets an alias if the prog col's column name
    // is found in this.hiddenSortCols
    public updateSortColAlias(progCol: ProgCol): void {
        let backName: string = progCol.getBackColName();
        for (let colName in this.hiddenSortCols) {
            if (this.hiddenSortCols[colName] === backName) {
                progCol.setSortedColAlias(colName);
                return;
            }
        }
    }

    // not used
    public serialize(): string {
        return null;
    }

    /**
     * getColNameMap
     * @param tableId
     */
    public getColNameMap(): object {
        const colNameMap: object = {};
        const cols: ProgCol[] = this.getAllCols(true);

        for (let i = 0; i < cols.length; i++) {
            const name: string = cols[i].backName.trim();
            colNameMap[name.toLowerCase()] = name;
        }
        return colNameMap;
    }


    /**
     * getColNameList
     * @param tableId
     */
    public getColNameList(): string[] {
        const colNameList: string[] = [];
        const cols: ProgCol[] = this.getAllCols(true);

        for (let i = 0; i < cols.length; i++) {
            const name: string = cols[i].backName.trim();
            colNameList.push(name);
        }
        return colNameList;
    }

    // not used
    protected _getDurable() {
        return null;
    }

    private _restoreProgCol(oldCols: ProgColDurable[]): ProgCol[] | null {
        if (oldCols == null || !(oldCols instanceof Array)) {
            return null;
        }
        let tableCols: ProgCol[] = oldCols.map((col) => new ProgCol(col));
        return tableCols;
    }

    private _getColMeta(isImmediate: boolean, meta: any): any[] {
        let res: string[] = [];
        if (this.backTableMeta != null &&
            this.backTableMeta.hasOwnProperty("valueAttrs")
        ) {
            this.backTableMeta.valueAttrs.forEach((attr) => {
                var isTypeImmediate = (attr.type !== DfFieldTypeT.DfFatptr);
                var shouldAddMeta = (isImmediate && isTypeImmediate)
                                    || (!isImmediate && !isTypeImmediate);
                if (shouldAddMeta) {
                    if (meta == null) {
                        res.push(attr);
                    } else {
                        res.push(attr[meta]);
                    }
                }
            });
        }

        return res;
    }

    private _setSkewness(): void {
        let rows: number[] = this.getRowDistribution();
        this.skewness = xcHelper.calculateSkew(rows);
    }

}