interface DSObjOptions extends DSDurable {
    sources?: any[];
    columns?: ColSchema[];
    activated?: boolean;
}

interface DSSources {
    path: string;
    fileNamePattern: string;
    targetName: string;
    recursive: boolean;
}

// XXX TODO: remove the DS dependency
class DSObj extends Durable {
    public id: string; // uniquely identify dsObj
    private name: string; // ds/folder's name
    private user: string; // the user that creates it
    private fullName: string; // fullName for ds, user.name,
                              // for folder, equal to name
    public parentId: string; // parent folder's id
    private isFolder: boolean; // folder or ds
    private uneditable: boolean; // if set true, no action for it
    public eles: DSObj[]; // its children DSObj
    private totalChildren: number; // (integer) total nummber of children

    // ds only attr:
    private format: string; // data foramt of ds
    private size: number; // ds's size
    private numEntries: number; // (integer) total records in ds
    private resultSetId: string; // ds' resultId
    public fieldDelim: string; // field delim
    public lineDelim: string; // line delim
    public hasHeader: boolean; // promote header or not
    public moduleName: string; // udf's module
    public funcName: string; // udf's func
    public quoteChar: string; // ds's quoteChar
    public skipRows: number; // (integer) how many rows to skip
    public advancedArgs: {allowFileErrors: boolean, allowRecordErrors: boolean}; // termination condition + extra cols
    private error: string; // ds's error
    public udfQuery: object; // extra udf args,
    public typedColumns: {colType: ColumnType, colName: string}[];
    private sources: DSSources[];
    private date: number; // created date timestamp
    public numErrors: number; // number of record errors
    public activated: boolean; // if the dataset is activated or not
    private columns: ColSchema[];
    public cachedLoadArgs: string;

    constructor(options: DSObjOptions) {
        options = options || <DSObjOptions>{};
        super(options.version);

        this.id = options.id;
        this.name = options.name;
        this.user = options.user;
        this.fullName = options.fullName;
        this.parentId = options.parentId;
        this.isFolder = options.isFolder || false;
        this.uneditable = options.uneditable;

        // initially, dataset count itself as one child,
        // folder has no child;
        if (this.isFolder) {
            this.eles = [];
            this.totalChildren = 0;
        } else {
            this.totalChildren = 1;
            this.format = options.format;
            this.size = options.size || null;
            this.numEntries = options.numEntries || null;
            this.resultSetId = options.resultSetId;

            // args to point to dataset
            this.fieldDelim = options.fieldDelim;
            this.lineDelim = options.lineDelim;
            this.hasHeader = options.hasHeader;
            this.moduleName = options.moduleName;
            this.funcName = options.funcName;
            this.quoteChar = options.quoteChar;
            this.skipRows = options.skipRows;

            if (options.error != null) {
                this.error = options.error;
            }
        }

        if (options.udfQuery) {
            this.udfQuery = options.udfQuery;
        }
        if (options.typedColumns != null) {
            this.typedColumns = options.typedColumns;
        }
        if (options.advancedArgs != null) {
            this.advancedArgs = options.advancedArgs;
        }
        if (options.sources != null) {
            this.sources = options.sources;
        }
        if (options.date != null) {
            this.date = options.date;
        }
        if (options.numErrors != null) {
            this.numErrors = options.numErrors;
        }
        if (options.columns != null) {
            this.columns = options.columns;
        }
        this.activated = options.activated || false;
    }

    public addToParent(): void {
        if (this.parentId !== DSObjTerm.homeParentId) {
            let parent: DSObj = DS.getDSObj(this.parentId);
            parent.eles.push(this);
            // update totalChildren of all ancestors
            this.updateDSCount(false);
        }
    }

    public getId(): string {
        return this.id;
    }

    public getParentId(): string {
        return this.parentId;
    }

    public getName(): string {
        return this.name;
    }

    public getUser(): string {
        return this.user;
    }

    public getFullName(): string {
        return this.fullName;
    }

    public getFormat(): string {
        return this.format;
    }

    public setFormat(format: string): void {
        this.format = format;
    }

    public getPathWithPattern(): string {
        let firstSource = this.sources[0];
        if (firstSource == null) {
            return "";
        }
        let path = firstSource.path;
        if (firstSource.fileNamePattern) {
            path += " | " + DSFormTStr.Pattern + ": " + firstSource.fileNamePattern;
        }
        return path;
    }

    public getTargetName(): string {
        if (this.sources[0] == null) {
            return "";
        }
        return this.sources[0].targetName;
    }

    public getSources() {
        return this.sources;
    }

    public getImportOptions(): XcalarLoadInputOptions {
        return {
            "sources": this.sources,
            "format": this.format,
            "fieldDelim": this.fieldDelim,
            "recordDelim": this.lineDelim,
            "hasHeader": this.hasHeader,
            "moduleName": this.moduleName,
            "funcName": this.funcName,
            "quoteChar": this.quoteChar,
            "skipRows": this.skipRows,
            "udfQuery": this.udfQuery,
            "typedColumns": this.typedColumns,
            "advancedArgs": this.advancedArgs,
        };
    }

    public getNumEntries(): number {
        return this.numEntries;
    }

    public getSize(): number {
        return this.size;
    }

    public getDisplaySize(): string {
        if (this.size == null) {
            return CommonTxtTstr.NA;
        } else {
            return <string>xcHelper.sizeTranslator(this.size);
        }
    }

    public getDate(): string {
        if (this.date == null) {
            return CommonTxtTstr.NA;
        } else {
            let date = new Date(this.date);
            return moment(date).format('Y-M-D');
        }
    }

    public setSize(size: number): void {
        this.size = size;
    }

    public setColumns(columns: ColSchema[]): void {
        this.columns = columns;
    }

    public getColumns(): ColSchema[] {
        return this.columns;
    }

    public setNumErrors(numErrors: number): void {
        this.numErrors = numErrors;
    }

    public getError(): string {
        return this.error;
    }

    public setError(error: string): void {
        this.error = error;
    }

    public beFolder(): boolean {
        return this.isFolder;
    }

    public beFolderWithDS(): boolean {
        return this.isFolder && this.totalChildren > 0;
    }

    public isEditable(): boolean {
        return !this.uneditable;
    }

    public isActivated(): boolean {
        return this.activated;
    }

    public activate(): void {
        this.activated = true;
    }

    public deactivate(): void {
        this.activated = false;
    }

    public fetch(rowToGo: number, rowsToFetch: number): XDPromise<{jsons: any[], jsonKeys: any[]}> {
        // rowToGo stats from 0
        let deferred: XDDeferred<{jsons: any[], jsonKeys: any[]}> = PromiseHelper.deferred();
        this._fetch(rowToGo, rowsToFetch)
        .then((data) => {
            if (!data) {
                return PromiseHelper.reject({"error": DSTStr.NoRecords});
            }

            try {
                let jsons: any[];
                let jsonKeys: string[];
                [jsons, jsonKeys] = this._parseFetchedData(data);
                deferred.resolve({jsons, jsonKeys});
            } catch (e) {
                console.error(e);
                deferred.reject(e);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // rename of dsObj
    public rename(newName: string): boolean {
        newName = newName.trim();

        if (newName === "") {
            // not allow empty name
            return false;
        }

        let parent: DSObj = DS.getDSObj(this.parentId);
        let error = xcStringHelper.replaceMsg(ErrWRepTStr.FolderConflict, {
            "name": newName
        });
        //check name confliction
        let id = this.id;
        let isFolder = this.isFolder;
        let isValid = xcHelper.validate([
            {
                "$ele": $(),
                "error": ErrTStr.NoSpecialChar,
                "check": function() {
                    return !xcHelper.checkNamePattern(PatternCategory.Folder, PatternAction.Check, newName);
                }
            },
            {
                "$ele": $(),
                "error": error,
                "check": function() {
                    return parent.checkNameConflict(id, newName, isFolder);
                }
            },
            {
                "$ele": $(),
                "error": ErrTStr.PreservedName,
                "check": function() {
                    return newName === DSObjTerm.SharedFolder;
                }
            }
        ]);

        if (isValid) {
            this.name = newName;
            this.fullName = newName;
            return true;
        } else {
            return false;
        }
    }

    // Remove dsObj from parent
    public removeFromParent(): DSObj {
        let parent: DSObj = DS.getDSObj(this.parentId);
        let index = parent.eles.indexOf(this);

        parent.eles.splice(index, 1);    // remove from parent
        // update totalChildren count of all ancestors
        this.updateDSCount(true);
        //  this.parentId = -1;
        this.parentId = null;

        return this;
    }

     // update ancestors totlal children
     public updateDSCount(isMinus: boolean): void {
        let parent: DSObj = DS.getDSObj(this.parentId);
        while (parent != null) {
            if (isMinus) {
                parent.totalChildren -= this.totalChildren;
            } else {
                parent.totalChildren += this.totalChildren;
            }
            parent = DS.getDSObj(parent.parentId);
        }
    }

    // Move dsObj to new parent (insert or append when index < 0)
    // return true/false: Whether move succeed
    public moveTo(newParent: DSObj, index: number): boolean {
        // not append to itself
        if (this.id === newParent.id) {
            return false;
        }

        // not append to same parent again, but can insert
        if (index < 0 && this.parentId === newParent.id) {
            return false;
        }

        // not append or insert to its own child
        let ele: DSObj = newParent;
        while (ele != null && ele !== this) {
            ele = DS.getDSObj(ele.parentId);
        }
        if (ele === this) {
            return false;
        }

        // check name conflict
        if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
            return false;
        }

        this.removeFromParent();
        this.parentId = newParent.id;

        if ((index != null) && (index >= 0)) {
            newParent.eles.splice(index, 0, this);  // insert to parent
        } else {
            newParent.eles.push(this);  // append to parent
        }

        // update totalChildren of all ancestors
        this.updateDSCount(false);
        return true;
    }

    // Check if a dsObj's name has conflict in current folder
    public checkNameConflict(
        id: string,
        name: string,
        isFolder: boolean
    ): boolean {
        // now only support check of folder

        // when this is not a folder
        if (!this.isFolder) {
            console.error("Error call, only folder can call this function");
            return false;
        }

        let eles: DSObj[] = this.eles;
        for (let i = 0; i < eles.length; i++) {
            let dsObj: DSObj = eles[i];

            if (dsObj.isFolder &&
                dsObj.name === name &&
                dsObj.id !== id &&
                dsObj.isFolder === isFolder) {
                return true;
            }
        }

        return false;
    }

    // used if advancedArgs property is missing
    public addAdvancedArgs(): XDPromise<void> {
        // XXX TODO: use XcalarDatasetGetLoadArgs
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarGetDag(gDSPrefix + this.fullName)
        .then((result) => {
            let node = result.node[0];
            let loadArgs = node.input.loadInput.loadArgs;
            this.advancedArgs = {
                allowFileErrors: loadArgs.parseArgs.allowFileErrors,
                allowRecordErrors: loadArgs.parseArgs.allowRecordErrors,
            };
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }

    private _fetch(rowToGo: number, rowsToFetch: number): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._makeResultSet()
        .then(() => {
            if (this.numEntries <= 0) {
                return PromiseHelper.resolve(null);
            }

            rowsToFetch = Math.min(this.numEntries, rowsToFetch);
            return XcalarFetchData(this.resultSetId, rowToGo, rowsToFetch, this.numEntries, [], 0, 0);
        })
        .then((res) => {
            this._release()
            .always(() => {
                deferred.resolve(res);
            });
        })
        .fail((error) => {
            this._release()
            .always(() => {
                deferred.reject(error);
            });
        });

        return deferred.promise();
    }

    private _makeResultSet(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarMakeResultSetFromDataset(this.fullName)
        .then((result) => {
            this.resultSetId = result.resultSetId;
            this.numEntries = result.numEntries;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _release(): XDPromise<void> {
        let resultSetId = this.resultSetId;
        if (resultSetId == null) {
            return PromiseHelper.resolve();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarSetFree(resultSetId)
        .then(() => {
            this.resultSetId = null;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _parseFetchedData(data: string[]): [any[], string[]] {
        let uniqueJsonKey = {}; // store unique Json key
        let jsonKeys: string[] = [];
        let jsons: any[] = [];  // store all jsons

        for (let i = 0, len = data.length; i < len; i++) {
            let value = data[i];
            let json = JSON.parse(value);
            jsons.push(json);
            // get unique keys
            for (let key in json) {
                uniqueJsonKey[key] = true;
            }
        }

        for (let uniquekey in uniqueJsonKey) {
            jsonKeys.push(uniquekey);
        }

        jsonKeys = this._preserveHeaderOrder(jsonKeys);
        return [jsons, jsonKeys];
    }

    // Step 1. check if all headers exist in jsonKeys
    // Step 2. check if any extra headers in jsonKeys but not in headers
    private _preserveHeaderOrder(jsonKeys: string[]): string[] {
        if (!jsonKeys) {
            return jsonKeys;
        }

        let columns: ColSchema[] = this.columns;
        if (columns == null) {
            return jsonKeys;
        }

        let jsonKeyMap = {};
        let headerMap = {};
        let newHeaders: string[] = [];

        jsonKeys.forEach(function(key) {
            jsonKeyMap[key] = true;
        });

        // Step 1. check if all headers exist in jsonKeys
        columns.forEach(function(column) {
            let header = column.name;
            if (jsonKeyMap.hasOwnProperty(header)) {
                newHeaders.push(header);
                headerMap[header] = true;
            }
        });

        // Step 2. check if any extra headers in jsonKeys but not in headers
        jsonKeys.forEach(function(key) {
            if (!headerMap.hasOwnProperty(key)) {
                newHeaders.push(key);
            }
        });

        return newHeaders;
    }
}
