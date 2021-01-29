/*
 * Module for management of dsObj
 */
namespace DS {
    let homeDirId: string; // DSObjTerm.homeDirId

    let curDirId: string;       // current folder id
    let dsLookUpTable: {[key: string]: DSObj} = {};  // find DSObj by dsId
    let homeFolder;
    let errorDSSet = {}; // UI cache only
    /**
     * DS.setup
     */
    export function setup(): void {
        homeDirId = DSObjTerm.homeDirId;
    }

    /**
     * DS.restore
     * Restore dsObj
     * @param oldHomeFolder
     * @param atStartUp
     */
    export function restore(
        oldHomeFolder: DSDurable,
        atStartUp: boolean
    ): XDPromise<void> {
        // data mart doesn't restore
        return PromiseHelper.resolve();

        return restoreDS(oldHomeFolder, atStartUp);
    }

    /**
     * DS.isAccessible
     */
    export function isAccessible(dsName: string): boolean {
        let parsedRes = xcHelper.parseDSName(dsName);
        if (parsedRes.user === XcUser.getCurrentUserName()) {
            return true;
        }
        // if not the user, the dataset need to be shared
        let dsObj = DS.getDSObj(dsName);
        if (dsObj == null) {
            return false;
        }
        return false;
    }

    /**
     * Get home folder
     * DS.getHomeDir
     */
    export function getHomeDir(toPersist: boolean): DSDurable {
        // XXX disabled in data mart
        return homeFolder;

        if (toPersist) {
            let copy = removeNonpersistDSObjAttributes(homeFolder);
            for (var i = 0, len = copy.eles.length; i < len; i++) {
                if (copy.eles[i].id === DSObjTerm.SharedFolderId) {
                    copy.totalChildren -= copy.eles[i].totalChildren;
                    copy.eles.splice(i, 1);
                    break;
                }
            }
            return copy;
        } else {
            return homeFolder;
        }
    }

    /**
     * DS.getLoadArgsFromDS
     * @param dsName
     */
    export function getLoadArgsFromDS(dsName: string): XDPromise<string> {
        let dsObj = DS.getDSObj(dsName);
        if (dsObj == null) {
            return PromiseHelper.reject();
        }

        if (dsObj.cachedLoadArgs) {
            return PromiseHelper.resolve(dsObj.cachedLoadArgs);
        }

        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        let datasetName = dsObj.getFullName();
        XcalarDatasetGetLoadArgs(datasetName)
        .then((loadArgs) => {
            dsObj.cachedLoadArgs = loadArgs;
            deferred.resolve(loadArgs);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function removeNonpersistDSObjAttributes(folder: DSObj): DSDurable {
        let folderCopy = xcHelper.deepCopy(folder);
        let cache = [folderCopy];
        // restore the ds and folder
        while (cache.length > 0) {
            let obj = cache.shift();
            if (obj == null) {
                console.error("error case");
                continue;
            } else if (obj.isFolder) {
                if (obj.eles != null) {
                    $.merge(cache, obj.eles);
                }
            } else {
                // remove non-persisted attr in dsObj
                delete obj.activated;
                delete obj.columns;
            }
        }
        return folderCopy;
    }

    /**
     * Get dsObj by dsId
     * DS.getDSObj
     * @param dsId
     */
    export function getDSObj(dsId: string): DSObj | null {
        if (dsId == null) {
            return null;
        }
        return dsLookUpTable[dsId] || null;
    }

    /**
     * DS.getErrorDSObj
     * @param dsId
     */
    export function getErrorDSObj(dsId: string): DSObj | null {
        return errorDSSet[dsId] || null;
    }

    /**
     * DS.removeErrorDSObj
     * @param dsId
     */
    export function removeErrorDSObj(dsId: string): void {
        delete errorDSSet[dsId];
    }

    /**
     * DS.addCurrentUserDS
     */
    export function addCurrentUserDS(
        fullDSName: string,
        options: any
    ): DSObj | null {
        let parsedRes = xcHelper.parseDSName(fullDSName);
        let user = parsedRes.user;
        let dsName = parsedRes.dsName;
        options = $.extend({}, options, {
            "id": fullDSName, // user the fulldsname as a unique id
            "name": dsName,
            "user": user,
            "fullName": fullDSName,
            "isFolder": false
        });

        return createDS(options);
    }

   /**
    * Import dataset, promise returns dsObj
    * DS.load
    */
    export function load(
        dsArgs: any,
        options: {
            restoreArgs?: object
        }
    ): XDPromise<DSObj> {
        options = options || {};
        // Here null means the attr is a placeholder, will
        // be update when the sample table is loaded
        dsArgs.date = new Date().getTime();
        if (options.restoreArgs != null) {
            // restore from loadArgs case
            curDirId = homeDirId;
            dsArgs.parentId = curDirId;
        }
        let dsObj = createDS(dsArgs);
        let sql = {
            "operation": SQLOps.DSImport,
            "args": dsArgs,
            "options": options
        };
        return importHelper(dsObj, sql, options.restoreArgs);
    }

    /**
     * DS.getSchema
     */
    export function getSchema(source: string): {
        schema: ColSchema[],
        error?: string
    } {
        let dsObj = DS.getDSObj(source);
        if (dsObj == null) {
            return {
                schema: null,
                error: "Dataset not found"
            };
        }
        let sourceHasParams = DagNodeInput.checkValidParamBrackets(source, true);
        if (sourceHasParams) {
            return {
                schema: []
            };
        }

        let columns = dsObj.getColumns();
        if (columns == null) {
            console.error("Cannot get schema from the dataset");
            return {
                schema: []
            };
        } else {
            return {
                schema: columns
            };
        }
    }

    /**
     * DS.cancel
     * @param $grid
     */
    export function cancel($grid: JQuery): XDPromise<void> {
        if ($grid == null || $grid.length === 0) {
            return PromiseHelper.reject("invalid args");
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if ($grid.hasClass("active")) {
            focusOnForm();
        }
        if (!$grid.hasClass("inActivated")) {
            $grid.removeClass("active").addClass("inactive deleting");
        }

        let txId = $grid.data("txid");
        // if cancel success, it will trigger fail in DS.load, so it's fine
        QueryManager.cancelQuery(txId)
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            // if cancel fails, transaction fail handler will delete the ds
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * DS.activate
     * @param dsIds
     * @param noAlert
     * @param txId optional, ex. used for tracking progress in dataflow execution
     */
    export function activate(dsIds: string[], noAlert: boolean, txId?: number): XDPromise<void> {
        return activateDS(dsIds, noAlert, txId);
    }

    /**
     * DS.listDatasets
     * returns an array of all visible datasets
     * @param sharedOnly
     */
    export function listDatasets(
        sharedOnly: boolean
    ): {
        path: string,
        suffix: string,
        id: string,
        options: {
            inActivated: boolean,
            size: number
        }
    }[] {
        let list: {
            path: string,
            suffix: string,
            id: string,
            options: {
                inActivated: boolean,
                size: number
            }
        }[] = [];
        let path: string[] = [];
        let folder: DSObj = sharedOnly ? DS.getDSObj(DSObjTerm.SharedFolderId) : homeFolder;
        let isSingleUser: boolean = XVM.isSingleUser();
        populate(folder, path);

        function populate(el: DSObj, path: string[]) {
            if (el.beFolder()) {
                let name: string = el.getName();
                if (name === ".") {
                    name = "";
                }
                if (isSingleUser && name === DSObjTerm.SharedFolder) {
                    return;
                }
                path.push(name);
                el.eles.forEach(function(el) {
                    populate(el, path);
                });
                path.pop();
            } else {
                let suffix: string = "";
                if (path[1] === DSObjTerm.SharedFolder) {
                    suffix = el.getUser();
                }
                list.push({
                    path: path.join("/") + "/" + el.getName(),
                    suffix: suffix,
                    id: el.id,
                    options: {
                        inActivated: !el.isActivated(),
                        size: el.getSize()
                    }
                });
            }
        }
        return list;
    }

    /**
     * DS.getDSBasicInfo
     * @param datasetName
     */
    export function getDSBasicInfo(datasetName: string): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarGetDatasetsInfo(datasetName)
        .then((res) => {
            try {
                var dsInfos = {};
                res.datasets.forEach(function(dataset) {
                    let fullName: string = dataset.datasetName;
                    if (fullName.startsWith(gDSPrefix)) {
                        let name: string = fullName.substring(gDSPrefix.length);
                        dsInfos[name] = {
                            size: dataset.datasetSize,
                            columns: getSchemaMeta(dataset.columns),
                            totalNumErrors: dataset.totalNumErrors,
                            downSampled: dataset.downSampled
                        };
                    }
                });
                deferred.resolve(dsInfos);
            } catch (e) {
                console.error(e);
                deferred.resolve({}); // still resolve
            }
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve({}); // still resolve
        });

        return deferred.promise();
    }

    /**
     * DS.clear
     * Clear dataset/folder in gridView area
     */
    export function clear(): void {
        // reset home folder
        curDirId = homeDirId;
        dsLookUpTable = {};

        homeFolder = createHomeFolder();
        dsLookUpTable[homeFolder.getId()] = homeFolder;
    }

    // Create dsObj for new dataset/folder
    function createDS(options: any): DSObj | null {
        // this will make sure option is a diffent copy of old option
        options = $.extend({}, options);
        // validation check
        if (options.name == null) {
            console.error("Invalid Parameters");
            return null;
        }
        // pre-process
        options.name = options.name.trim();
        options.user = options.user || getCurrentUserName();
        options.parentId = options.parentId || curDirId;
        options.isFolder = options.isFolder || false;
        options.uneditable = options.uneditable || false;

        let parent = DS.getDSObj(options.parentId);
        delete options.unlistable; // unlistable is not part of ds attr

        if (options.isFolder) {
            var i = 1;
            var name = options.name;
            var validName = name;
            // only check folder name as ds name cannot confilct
            while (parent.checkNameConflict(options.id, validName, true))
            {
                validName = name + ' (' + i + ')';
                ++i;
            }
            options.name = validName;
            options.fullName = options.fullName || options.name;
            options.id = options.id;
        } else {
            options.fullName = options.fullName ||
                                xcHelper.wrapDSName(options.name);
            // for dataset, use it's full name as id
            options.id = options.id || options.fullName;
            options.activated = options.activated || false;
        }
        let dsObj = new DSObj(options);;
        // cached in lookup table
        dsLookUpTable[dsObj.getId()] = dsObj;

        return dsObj;
    }

    function createHomeFolder(): DSObj {
        return new DSObj({
            "id": homeDirId,
            "name": DSObjTerm.homeDir,
            "fullName": DSObjTerm.homeDir,
            "user": getCurrentUserName(),
            "parentId": DSObjTerm.homeParentId,
            "uneditable": false,
            "isFolder": true
        });
    }

    function createDSHelper(
        txId: number,
        dsObj: DSObj,
        restoreArgs: object
    ): XDPromise<void> {
        let datasetName = dsObj.getFullName();
        let def: XDPromise<void>;
        if (restoreArgs) {
            def = XcalarDatasetRestore(datasetName, restoreArgs);
        } else {
            let options = dsObj.getImportOptions();
            def = XcalarDatasetCreate(datasetName, options);
        }
        let hasCreate: boolean = false;
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        def
        .then(() => {
            hasCreate = true;
            // only when there is active workbook will activate the ds
            if (WorkbookManager.getActiveWKBK() != null) {
                return activateHelper(txId, dsObj);
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (typeof error !== "object") {
                error = {"error": error};
            }
            error.created = hasCreate;
            if (error.status === StatusT.StatusExist) {
                // special case, need refresh to verify
                deferred.resolve();
            } else {
                // if already created, remove the dataset from backend
                // as the creation failed
                if (hasCreate) {
                    XcalarDatasetDelete(datasetName);
                }
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function updateDSMetaHelper(dsMeta, ds) {
        dsMeta = dsMeta || {};
        ds.setSize(dsMeta.size);
        ds.setColumns(dsMeta.columns);
        ds.setNumErrors(dsMeta.totalNumErrors);
    }

    function importHelper(
        dsObj: DSObj,
        sql: object,
        restoreArgs: object
    ): XDPromise<DSObj> {
        let deferred: XDDeferred<DSObj> = PromiseHelper.deferred();
        let dsName = dsObj.getName();
        let datasetName = dsObj.getFullName();

        let txId = Transaction.start({
            "msg": StatusMessageTStr.ImportDataset + ": " + dsName,
            "operation": SQLOps.DSImport,
            "sql": sql,
            "track": true,
            "steps": 1
        });

        createDSHelper(txId, dsObj, restoreArgs)
        .then(() => {
            return DS.getDSBasicInfo(datasetName);
        })
        .then((dsInfos) => {
            let dsInfo = dsInfos[datasetName];
            updateDSMetaHelper(dsInfo, dsObj);

            if (dsInfo && dsInfo.downSampled === true) {
                alertSampleSizeLimit(datasetName);
            }

            let msgOptions = {
                "datasetId": dsObj.getId()
            };
            Transaction.done(txId, {
                msgOptions: msgOptions
            });
            deferred.resolve(dsObj);
        })
        .fail((error) => {
            let created = false;
            let displayError = null;
            if (typeof error === "object") {
                created = error.created;
                displayError = error.error;
            }

            if (typeof error === "object" &&
                error.status === StatusT.StatusCanceled)
            {
                if (!created) {
                    removeDS(dsObj.getId());
                }
            } else {
                handleImportError(dsObj, displayError, created);
            }

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ImportDSFailed,
                "error": displayError
            });

            deferred.reject(error);
        })
        .always(() => {
            loadCleanup();
        });

        return deferred.promise();
    }

    function alertSampleSizeLimit(dsName: string): void {
        let msg = xcStringHelper.replaceMsg(DSTStr.OverSampleSize , {
            name: dsName,
            size: xcHelper.sizeTranslator(gMaxSampleSize)
        })
        Alert.show({
            title: AlertTStr.Title,
            msg: msg,
            isAlert: true
        });
    }

    function loadCleanup(): void {
        xcTooltip.hideAll();
    }

    function handleImportError(
        dsObj: DSObj,
        error: string,
        created: boolean
    ): void {
        let dsId = dsObj.getId();
        dsObj.setError(error);
        cacheErrorDS(dsId, dsObj);
        if (!created) {
            removeDS(dsId);
        }
    }

    function cacheErrorDS(dsId: string, dsObj: DSObj): void {
        errorDSSet[dsId] = dsObj;
    }

    // Helper function to remove ds
    function removeDS(dsId) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case;
            return;
        }
        dsObj.removeFromParent();
        removeDSMeta(dsId);
    }

    function removeDSMeta(dsId) {
        // delete ds
        delete dsLookUpTable[dsId];
    }

    function focusOnForm(): void {
        DataSourceManager.startImport(false);
    }

    function restoreDS(
        oldHomeFolder: DSDurable,
        atStartUp: boolean
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let datasets;
        let dsBasicInfo;

        DS.clear();

        XcalarGetDatasets()
        .then((res) => {
            datasets = res;
            return DS.getDSBasicInfo(null);
        })
        .then((res) => {
            dsBasicInfo = res;
            let datasetsSet = getDSBackendMeta(datasets, dsBasicInfo, atStartUp);
            restoreHelper(oldHomeFolder, datasetsSet);
            deferred.resolve();
        })
        .fail((error) => {
            console.error("Restore DS fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * DS.getSchemaMeta
     * @param schemaArray
     */
    export function getSchemaMeta(
        schemaArray: {name: string, type: string}[]
    ): ColSchema[] {
        let columns: ColSchema[] = [];
        let indexMap = {};
        schemaArray.forEach((colInfo) => {
            // if the col name is a.b, in XD it should be a\.b
            let name = xcHelper.escapeColName(colInfo.name);
            let type = xcHelper.convertFieldTypeToColType(DfFieldTypeT[colInfo.type]);
            let index = indexMap[name];
            if (index == null) {
                // new columns
                index = columns.length;
                indexMap[name] = index;
                columns.push({
                    name: name,
                    type: type
                });
            } else {
                // that's a mixed column
                columns[index].type = ColumnType.mixed;
            }
        });
        return columns;
    }

    function getDSBackendMeta(
        datasets: any,
        basicDSInfo: any,
        atStartUp: boolean
    ): any {
        let numDatasets: number = datasets.numDatasets;
        let userPrefix = xcHelper.getUserPrefix();
        let datasetsSet = {};

        for (let i = 0; i < numDatasets; i++) {
            let dataset = datasets.datasets[i];
            let dsName: string = dataset.name;

            if (dsName.endsWith("-xcalar-preview")) {
                if (!atStartUp) {
                    // if not the start up time, not deal with it
                    continue;
                }
                // other users don't deal with it
                if (xcHelper.parseDSName(dsName).user !== userPrefix) {
                    continue;
                }
                // deal with preview datasets,
                // if it's the current user's preview ds,
                // then we delete it on start up time
                let sql = {
                    "operation": SQLOps.DestroyPreviewDS,
                    "dsName": dsName
                };
                let txId = Transaction.start({
                    "operation": SQLOps.DestroyPreviewDS,
                    "sql": sql,
                    "track": true,
                    "steps": 1
                });

                XIApi.deleteDataset(txId, dsName, true)
                .then(() => {
                    Transaction.done(txId, {
                        "noCommit": true,
                        "noLog": true
                    });
                })
                .fail((error) => {
                    Transaction.fail(txId, {
                        "error": error,
                        "noAlert": true
                    });
                });

                continue;
            } else if (dsName.endsWith(PTblManager.DSSuffix)) {
                // other users don't deal with it
                if (xcHelper.parseDSName(dsName).user !== userPrefix) {
                    continue;
                } else if (dataset.loadIsComplete) {
                    PTblManager.Instance.addDatasetTable(dsName);
                } else {
                    deleteTempDS(dsName);
                }
                continue;
            }

            if (!dataset.isListable) {
                // skip unlistable ds
                continue;
            }

            dataset.activated = dataset.loadIsComplete;

            if (basicDSInfo.hasOwnProperty(dsName)) {
                dataset.size = basicDSInfo[dsName].size;
                dataset.columns = basicDSInfo[dsName].columns;
                dataset.numErrors = basicDSInfo[dsName].totalNumErrors;
            }

            datasetsSet[dsName] = dataset;
        }
        return datasetsSet;
    }

    function restoreDir(oldFolder: DSDurable, datasetsSet: any): void {
        let cache = $.isEmptyObject(oldFolder) ? [] : oldFolder.eles;
        // restore the ds and folder
        while (cache.length > 0) {
            let obj: any = cache.shift();
            if (obj == null) {
                console.error("error case");
                continue;
            }
            if (obj.id === DSObjTerm.SharedFolderId) {
                // restore of shared folder will be taken cared by
                // restoreSharedDS
                continue;
            }
            if (obj.id === ".other") {
                // old structure, not restore
                continue;
            }

            if (obj.isFolder) {
                // restore a folder
                createDS(obj);
                if (obj.eles != null) {
                    $.merge(cache, obj.eles);
                }
            } else {
                if (datasetsSet.hasOwnProperty(obj.fullName)) {
                    // restore a ds
                    let ds = datasetsSet[obj.fullName];
                    let backOptions = getDSOptions(ds);
                    let sources = obj.sources;
                    if (!sources || sources.length === 0) {
                        sources = backOptions.sources;
                    }
                    obj = $.extend(obj, backOptions, {
                        "sources": sources
                    });
                    createDS(obj);
                    // mark the ds to be used
                    delete datasetsSet[obj.fullName];
                } else {
                    // when ds has front meta but no backend meta
                    // this is a case when front end meta not sync with
                    // backend meta correctly
                    console.error(obj, "has meta but no backend info!");
                }
            }
        }

        return datasetsSet;
    }

    function getDSOptions(ds) {
        return {
            // format should come from kvStore, not from backend
            "sources": ds.loadArgs.sourceArgsList,
            "unlistable": !ds.isListable,
            "activated": ds.activated,
            "size": ds.size,
            "columns": ds.columns,
            "numErrors": ds.numErrors
        };
    }

    function restoreHelper(oldHomeFolder, datasetsSet) {
        datasetsSet = restoreDir(oldHomeFolder, datasetsSet);
        // add ds that is not in oldHomeFolder
        restoreNoMetaDS(datasetsSet);
    }

    function restoreNoMetaDS(datasetsSet) {
        var userPrefix = xcHelper.getUserPrefix();
        var promises = [];
        for (var dsName in datasetsSet) {
            var ds = datasetsSet[dsName];
            if (ds != null) {
                var options = getDSOptions(ds);
                if (xcHelper.parseDSName(dsName).user === userPrefix) {
                    DS.addCurrentUserDS(ds.name, options);
                }
                // if it's not this user's ds, don't handle it
            }
        }
        PromiseHelper.chain(promises);
    }

    function activateDS(dsIds: string[], noAlert: boolean, txId?: number): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let failures: string[] = [];
        let datasets: string[] = [];
        let promises = dsIds.map((dsId) => {
            return activateOneDSHelper(dsId, failures, datasets, noAlert, txId);
        });

        PromiseHelper.when(...promises)
        .then(() => {
            if (failures.length && !noAlert) {
                Alert.show({
                    "title": AlertTStr.Error,
                    "msg": failures.join("\n"),
                    "isAlert": true,
                });
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function activateOneDSHelper(
        dsId: string,
        failures: string[],
        datasets: string[],
        noAlert: boolean,
        txId?: number
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let dsObj = DS.getDSObj(dsId);
        if (dsObj == null || dsObj.beFolder()) {
            return PromiseHelper.resolve();
        }
        if (txId == null) {
            txId = noAlert ? null : Transaction.start({
                "operation": SQLOps.DSImport,
                "track": true,
                "steps": 1
            });
        }

        let datasetName = dsObj.getFullName();
        activateHelper(txId, dsObj)
        .then(() => {
            return DS.getDSBasicInfo(datasetName);
        })
        .then((dsMeta) => {
            updateDSMetaHelper(dsMeta[datasetName], dsObj);
            datasets.push(dsId);
            if (txId != null) {
                Transaction.done(txId, {});
            }
            // clear error
            dsObj.setError(undefined);
            deferred.resolve();
        })
        .fail((error) => {
            try {
                let displayError = error.error || error.log;
                let errorMsg = xcStringHelper.replaceMsg(DSTStr.FailActivateDS, {
                    "ds": dsObj.getName(),
                    "error": displayError
                });
                failures.push(errorMsg);

                if (!noAlert) {
                    handleImportError(dsObj, displayError, true);
                }

                if (txId != null) {
                    Transaction.fail(txId, {
                        error: error,
                        noAlert: true
                    });
                }
            } catch (e) {
                console.error(e);
            }
            // need to remove ahead of time to ensure consistent isLoading behavior
            deferred.resolve(); // still resolve it
        })
        .always(() => {
            loadCleanup();
        });

        return deferred.promise();
    }

    function activateHelper(txId: number, dsObj: DSObj): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let datasetName = dsObj.getFullName();

        XcalarDatasetActivate(datasetName, txId)
        .then(() => {
            activateDSObj(dsObj);
            deferred.resolve();
        })
        .fail((error) => {
            if (error && error.status === StatusT.StatusDatasetNameAlreadyExists) {
                // this error usually mean dataset is already active
                XcalarGetDatasetsInfo(datasetName)
                .then(() => {
                    // if XcalarGetDatasetsInfo works, then dataset is activated
                    activateDSObj(dsObj);
                    deferred.resolve();
                })
                .fail(() => {
                    deferred.reject(error);
                });
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function activateDSObj(dsObj: DSObj): void {
        dsObj.activate();
    }

    function deleteTempDS(dsName: string): void {
        XcalarDatasetDelete(dsName)
        .fail(() => {
            try {
                clearLoadNodeInAllWorkbooks(dsName)
                .always(() => {
                    XcalarDatasetDelete(dsName);
                });
            } catch (e) {
                console.error(e);
            }
        });
    }

    // XXX TODO: this is a try to remove all the load nodes
    // across a user's all workbooks,
    // but finally backend should remove the load node and
    // we should not use this workaround
    function clearLoadNodeInAllWorkbooks(datasetName: string): XDPromise<void> {
        let clearLoadNodeHelper = function(dsName, wkbkName) {
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            XcalarDatasetDeleteLoadNode(dsName, wkbkName)
            .then(deferred.resolve)
            .fail((error) => {
                if (error.status === StatusT.StatusDsDatasetInUse) {
                    let msg = xcStringHelper.replaceMsg(DSTStr.InUseErr, {
                        name: wkbkName
                    });
                    error.error = msg
                }
                deferred.reject(error);
            });

            return deferred.promise();
        }
        let workbooks = WorkbookManager.getWorkbooks();
        let promises = [];
        for (let id in workbooks) {
            let wkbk = workbooks[id];
            if (wkbk.hasResource()) {
                // when it's active workbook
                promises.push(clearLoadNodeHelper.bind(this, datasetName, wkbk.getName()));
            }
        }
        return PromiseHelper.chain(promises);
    }

    function getCurrentUserName(): string {
        return XcUser.getCurrentUserName();
    }
}
