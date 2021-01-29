class TutorialPanel {
    private static _instance: TutorialPanel;
    private _$panel: JQuery;    // $("#tutorialDownloadPanel");
    private _tutSet: ExtCategorySet;
    private _isFirstTouch: boolean = true;
    private _categoryOrder: Map<string, number>;
    private _orderedCatLength: number;
    private tutorialObject = <any>{};

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): void {
        this._tutSet = new ExtCategorySet();
        this._$panel = $("#tutorialDownloadPanel");
        const self = this;

        this._$panel.on("click", ".item .download", function() {
            let tut: ExtItem = self._getTutorialFromEle($(this).closest(".item"));
            self._downloadTutorial(tut, $(this));
        });

        $("#tutorial-search").on("input", "input", function() {
            let searchKey = $(this).val().trim();
            self._refreshTutorial(searchKey);
        });

        this._setupCategoryOrder();
    };

    public active(): XDPromise<any> {
        if (this._isFirstTouch) {
            this._isFirstTouch = false;
            return this._fetchData();
        }
    }

    public request(json: {}): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        HTTPService.Instance.ajax(json)
        .then(function(res) {
            try {
                if (res.status === Status.Error) {
                    deferred.reject(res.error);
                } else {
                    deferred.resolve.apply(this, arguments);
                }
            } catch (e) {
                console.error(e);
                deferred.resolve.apply(this, arguments);
            }
        })
        .fail(function(error) {
            deferred.reject(JSON.stringify(error));
        });

        return deferred.promise();
    }

    public isTutorialWorkbook(): XDPromise<boolean> {
        // No tutorial in data mart
        return PromiseHelper.resolve(false);

        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        let key: string = KVStore.getKey("gTutorialKey");
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then((savedTutorialObject) => {
            try {
                this.tutorialObject = JSON.parse(savedTutorialObject);
            } catch (e) {
                console.error(e);
            }
            deferred.resolve(savedTutorialObject !== null);
        })
        .fail((err) => {
            console.error(err);
            return deferred.resolve(false); // still resolve it
        });
        return deferred.promise();
    }

    public setupTutorial(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(this.processTutorialHelper())
    }

    /**
     * This function allows you to set a workbook such that it is dealt with
     * as a "tutorial workbook" upon upload/being switched to.
     * @param flag
     */
    public setTutorialFlag(flag: boolean) {
        let key: string = KVStore.getKey("gTutorialKey");
        let _kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        _kvStore.put(flag.toString(), true);
    }

    /**
    * This function allows you to specify a dataflow that will be
    * auto executed on tutorial workbook download
    * @param dagId
    * @param nodeIds
    */
    public setTutorialNodesToAutoExecute(dagId: string, nodeIds: string[], optimized?: boolean) {
        let dagNodesObjectStr: string = JSON.stringify(
            {
                dagId: dagId,
                nodeIds: nodeIds,
                optimized: optimized
            }
        );
        this.setTutorialParameter("nodesToAutoExecute", dagNodesObjectStr);
    }

   /**
    * This function allows you specify a connector that will be
    * auto created on tutorial workbook download
    * @param targetType
    * @param targetName
    * @param targetParams optional
    */
    public setTutorialConnectorToAutoCreate(targetType: string, targetName: string, targetParams = {}) {
        let targetObjectStr: string = JSON.stringify(
            {
                targetType: targetType,
                targetName: targetName,
                targetParams: targetParams
            }
        );
        this.setTutorialParameter("connectorToAutoCreate", targetObjectStr);
    }

    /**
     * Allows for storing dataset load arguments within the kvstore,
     * for later use. Should not be used outside of console (for now).
     * Also allows for specifying which datasets should automatically create published tables
     * @param dsInfos: Object list specifying the datasets we want to load and if they have an
     *    associated publish table
     */
    public storeDatasets(dsInfos: {name: string, publish?: boolean,
            pubName?: string, primaryKeys: string[], deleteDataset?: boolean}[]) {
        const promises: XDPromise<void>[] = [];
        const loadArgs: object = {};
        loadArgs["size"] = dsInfos.length;


        for (let i = 0; i < dsInfos.length; i++) {
            promises.push(DS.getLoadArgsFromDS(dsInfos[i].name).then((res) => {
                if (dsInfos[i].publish) {
                    loadArgs[i] = {
                        loadArgs: res,
                        publish: {
                            pubName: dsInfos[i].pubName,
                            pubKeys: dsInfos[i].primaryKeys,
                            deleteDataset: dsInfos[i].deleteDataset
                        }
                    };
                } else {
                    loadArgs[i] = {
                        loadArgs: res
                    };
                }
            }));
        }

        PromiseHelper.when(...promises)
        .then(() => {
            let dataKey: string = KVStore.getKey("gStoredDatasetsKey");
            let _dataKVStore: KVStore = new KVStore(dataKey, gKVScope.WKBK);
            return _dataKVStore.put(JSON.stringify(loadArgs), true);
        })
        .fail((err) => {
            console.error(err);
        });
    }

    /**
     * This function allows you to save a key-value pair to KVstore
     * to be used by tutorial
     * @param key
     * @param value
     */
    private setTutorialParameter(
        key: string,
        value: string
    ) {
        let KVStoreKey: string = KVStore.getKey("gTutorialKey");
        let _kvStore: KVStore = new KVStore(KVStoreKey, gKVScope.WKBK);
        PromiseHelper.alwaysResolve(_kvStore.get())
        .then((tutorialObjectString: string) => {
            let tutorialObject = {};
            if (tutorialObjectString) {
                try {
                    const parsedObject = JSON.parse(tutorialObjectString);
                    if (typeof parsedObject === "object") {
                        tutorialObject = parsedObject;
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            if (value === "{}") {
                delete tutorialObject[key];
            } else {
                tutorialObject[key] = value;
            }
            _kvStore.put(JSON.stringify(tutorialObject), true);
        })
        .fail((error) => {
            console.error(error);
        })
    }

    private processTutorialHelper(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const tutTarget: string = "Tutorial Dataset Target";
        let datasetSources: Set<string> = new Set<string>();
        let dataKey: string = KVStore.getKey("gStoredDatasetsKey");
        let _dataKVStore: KVStore = new KVStore(dataKey, gKVScope.WKBK);
        let walkthroughKey: string = KVStore.getKey("gStoredWalkthroughKey");
        let _walkthroughKVStore: KVStore = new KVStore(walkthroughKey, gKVScope.WKBK);
        let pubTables: StoredPubInfo[] = [];
        let promise: XDPromise<void>;

        // XXX TODO: remove this target and use Public S3 connector instead
        // First, set up the tutorial data target if it doesnt exist
        if (DSTargetManager.getTarget(tutTarget) != null) {
            promise = PromiseHelper.resolve();
        } else {
            promise = XcalarTargetCreate("s3environ", tutTarget,
                {authenticate_requests: "false"})
                .then(() => {
                    return DSTargetManager.refreshTargets(true);
                });
        }
        promise
        .then(() => {
            // Then, load the stored datasets, if they exist
            return PromiseHelper.alwaysResolve(_dataKVStore.getAndParse())
        })
        .then((datasets: {[key: number]: StoredDataset}) => {
            if (datasets == null) {
                // This tutorial workbook doesn't have any stored datasets
                return PromiseHelper.resolve();
            }

            // Figure out what datasets already exist
            let existingDatasets: ListDSInfo[] = DS.listDatasets(false);
            let names: Set<string> = new Set<string>();
            let inactiveNames: Set<string> = new Set<string>();
            for(let i = 0; i < existingDatasets.length; i++) {
                let eDs = existingDatasets[i];
                if (eDs.options && eDs.options.inActivated) {
                    // need to reactivate inactive datasets
                    inactiveNames.add(eDs.id);
                } else {
                    names.add(eDs.id);
                }
            }
            // only load the needed datasets
            let loadArgs: OperationNode[] = [];
            let reactivateIds: string[] = [];
            try {
                for(let i = 0; i < datasets["size"]; i++) {
                    let node: OperationNode = JSON.parse(datasets[i].loadArgs)
                    let parsedName = xcHelper.parseDSName(node.args["dest"]);
                    parsedName.randId = parsedName.randId || "";
                    node.args["dest"] = xcHelper.wrapDSName(parsedName.dsName, parsedName.randId)
                    if (!names.has(node.args["dest"])) {
                        if (inactiveNames.has(node.args["dest"])) {
                            reactivateIds.push(node.args["dest"]);
                        } else {
                            loadArgs.push(node);
                        }
                    }
                    datasetSources.add(parsedName.randId + "." + parsedName.dsName);
                    // Prepare needed published tables
                    let pubInfo = datasets[i].publish;
                    if (pubInfo != null) {
                        pubInfo.dsName = node.args["dest"];
                        pubTables.push(pubInfo);
                    }
                }
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject();
            }

            let promises = [];
            for(let i = 0; i < loadArgs.length; i++) {
                promises.push(DS.restoreTutorialDS(loadArgs[i]));
            }
            if (reactivateIds.length > 0) {
                promises.push(DS.activate(reactivateIds, true));
            }
            return PromiseHelper.when(...promises);
        })
        .then(() => {
            // We need to cast old dataset node sources
            if (datasetSources.size == 0) {
                return PromiseHelper.resolve();
            }
            try {
                let dagTabs: DagTab[] = DagTabManager.Instance.getTabs();
                let graphs: DagGraph[] = dagTabs.map((tab: DagTab) => {
                    return tab.getGraph();
                });
                for (let i = 0; i < graphs.length; i++) {
                    let graph = graphs[i];
                    if (graph == null) {
                        continue;
                    }
                    graph.reConfigureDatasetNodes(datasetSources);
                }
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject();
            }
        })
        .then(() => {
            if (pubTables.length == 0) {
                return PromiseHelper.resolve([]);
            } else {
                return PTblManager.Instance.getTablesAsync();
            }
        })
        .then((tables: PbTblInfo[]) => {
            let pubNames: Set<string> = new Set<string>();
            for (let i = 0; i < tables.length; i++) {
                let table: PbTblInfo = tables[i];
                if (table == null) { continue };
                pubNames.add(table.name);
            }
            // Time to publish tutorial workbook tables
            let promises = [];
            for (let i = 0; i < pubTables.length; i++) {
                let info = pubTables[i];
                if (pubNames.has(info.pubName)) {
                    continue;
                }
                let schema = DS.getSchema(info.dsName);
                if (schema.error != null) {
                    continue;
                }
                promises.push(PTblManager.Instance.createTableFromDataset(info.dsName,
                    info.pubName, schema.schema,
                    info.pubKeys, !info.deleteDataset));
            }
            return PromiseHelper.when(...promises);
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(DS.refresh())
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(_walkthroughKVStore.get());
        })
        .then((walkthrough: string) => {
            if (walkthrough) {
                try {
                    TooltipWalkthroughs.setWorkbookWalkthrough(JSON.parse(walkthrough));
                } catch (e) {
                    console.error(e);
                    // Although we hit an error, this is a non-issue and could be rectified on reload.
                }
            }
            return PromiseHelper.resolve();
        })
        .then(() => {
            return this.autoExecuteNodes();
        })
        .then(() => {
            return this.autoCreateConnector();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)

        return deferred.promise();
    }

    private autoExecuteNodes(): XDPromise<void> {
        if (this.tutorialObject.nodesToAutoExecute) {
            try {
                let {dagId, nodeIds, optimized} = JSON.parse(this.tutorialObject.nodesToAutoExecute);
                const dagTab = DagList.Instance.getDagTabById(dagId);
                return DagTabManager.Instance.loadTab(dagTab)
                .then(() => {
                    const graph = DagViewManager.Instance.getActiveDagView().getGraph();
                    if (nodeIds) {
                        nodeIds = nodeIds.filter(nodeId => graph.getNode(nodeId).getNodeInfo().state === "Configured");
                    }
                    return DagViewManager.Instance.run(nodeIds, optimized);
                })
                .fail((error) => {
                    console.error(error);
                    return PromiseHelper.reject();
                })
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject();
            }
        }
        else {
            return PromiseHelper.resolve();
        }
    }

    private autoCreateConnector(): XDPromise<void> {
        if (this.tutorialObject.connectorToAutoCreate) {
            try {
                const {targetType, targetName, targetParams} = JSON.parse(this.tutorialObject.connectorToAutoCreate);
                if (DSTargetManager.getTarget(targetName) == null) {
                    XcalarTargetCreate(targetType, targetName, targetParams)
                    .then(() => {
                        return DSTargetManager.refreshTargets(true);
                    })
                    .fail((error) => {
                        console.error(error);
                        return PromiseHelper.reject();
                    })
                }
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject();
            }
        }
        else {
            return PromiseHelper.resolve();
        }
    }

    private _fetchData(): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._$panel.addClass("wait");
        const self = this;
        let url = xcHelper.getAppUrl();
        this.request({
            "type": "GET",
            "dataType": "JSON",
            "url": url + "/tutorial/listPackage"
        })
        .then(function(data) {
            self._$panel.removeClass("wait");
            try {
                let d = data;
                self._initializeTutCategory(d);
            } catch (error) {
                self._handleError(error);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            self._handleError(error);
            return deferred.reject();
        });
        return deferred.promise();
    }

    private _handleError(error): void {
        console.error("get tutorial error", error);
        this._$panel.removeClass("wait").removeClass("hint").addClass("error");
    }

    private _initializeTutCategory(tutorials): void {
        tutorials = tutorials || [];

        for (let i = 0, len = tutorials.length; i < len; i++) {
            // XXX remove this hack
            if (XVM.isSingleUser() && tutorials[i].appName === "ExportDrivers") {
                continue;
            }
            this._tutSet.addExtension(tutorials[i]);
        }

        this._refreshTutorial();
    }

    private _refreshTutorial(searchKey?: string): void {
        let categoryList: ExtCategory[] = this._tutSet.getList();
        categoryList.sort((firstCat: ExtCategory, secondCat: ExtCategory) => {
            let firstName = firstCat.getName();
            let secName = secondCat.getName();
            let firstVal: number;
            if (this._categoryOrder.has(firstName)) {
                firstVal = this._categoryOrder.get(firstName);
            } else {
                firstVal = this._orderedCatLength;
            }
            let secVal: number;
            if (this._categoryOrder.has(secName)) {
                secVal = this._categoryOrder.get(secName);
            } else {
                secVal = this._orderedCatLength;
            }
            return (firstVal - secVal);
        });
        this._generateTutView(categoryList, searchKey);
    }

    private _downloadTutorial(tut: ExtItem, $submitBtn: JQuery): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let url: string = xcHelper.getAppUrl();
        $submitBtn.text("Downloading");
        xcUIHelper.toggleBtnInProgress($submitBtn, true);
        let name: string = WorkbookPanel.wbDuplicateName(tut.getName(),
            WorkbookManager.getWorkbooks(), 0);
        this.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/tutorial/download",
            "data": {name: tut.getName(), version: tut.getVersion()},
        })
        .then((res) => {
            return WorkbookPanel.createNewWorkbook(name, null, null, atob(res.data));
        })
        .then(() => {
            return WorkbookManager.switchWKBK(WorkbookManager.getIDfromName(name), false);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            xcUIHelper.toggleBtnInProgress($submitBtn, true);
            $submitBtn.text("Download");
            Alert.error(ErrTStr.TutDownloadFailure, error);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private _getTutorialFromEle($tut: JQuery): ExtItem {
        let tutName: string = $tut.find(".tutorialName").data("name");
        let category: string = $tut.closest(".category").find(".categoryName").text();
        category = category.split("Category: ")[1];
        let tut: ExtItem = this._tutSet.getExtension(category, tutName);
        return tut;
    }

    private _generateTutView(categoryList: ExtCategory[], searchKey?: string): void {
        let html: string = "";

        for (let i = 0, len = categoryList.length; i < len; i++) {
            html += this._getTutViewHTML(categoryList[i], searchKey);
        }

        if (html === "") {
            this._$panel.addClass("hint");
        } else {
            this._$panel.removeClass("hint").find(".category").remove()
                .end()
                .append(html);
        }
    }

    private _getTutViewHTML(category: ExtCategory, searchKey?: string): string {
        let tutorials = category.getExtensionList(searchKey);
        let tutLen = tutorials.length;

        let html = "";

        for (let i = 0; i < tutLen; i++) {
            let tut = tutorials[i];

            const minXDVersion = tut.getMinXDVersion();
            const maxXDVersion = tut.getMaxXDVersion();
            if (minXDVersion) {
                const comparedToCurrent = XVM.compareToCurrentVersion(minXDVersion);
                if (comparedToCurrent === VersionComparison.Invalid || comparedToCurrent === VersionComparison.Bigger) {
                    continue;
                }
            }
            if (maxXDVersion) {
                const comparedToCurrent = XVM.compareToCurrentVersion(maxXDVersion);
                if (comparedToCurrent === VersionComparison.Invalid || comparedToCurrent === VersionComparison.Smaller) {
                    continue;
                }
            }

            let btnText = "Download";
            let btnClass: string = "download";

            let showDocLink = tut.getLink() && tut.getLink() !== "https://www.xcalar.com"
            let docLink = showDocLink ? '<a href="' + tut.getLink() + '" target="_blank">Documentation</a>' : ''

            let image = tut.getImage();
            html += '<div class="item ' + tut.getName() + '">' +
                        '<section class="mainSection">' +
                        '<div class="leftPart">' +
                            '<div class="logoArea ' + image + '">' +
                                '<i class="icon ' + image + '"></i>' +
                            '</div>' +
                            '<div class="instruction">' +
                                '<div class="tutorialName textOverflowOneLine"' +
                                ' data-name="' + tut.getName() + '">' +
                                    tut.getMainName() +
                                '</div>' +
                                '<div class="detail textOverflow">' +
                                    tut.getDescription() +
                                '</div>' +
                            '</div>' +
                        '</div>'+
                        '<div class="rightPart">' +
                            '<div class="buttonArea">' +
                                '<button class="btn btn-submit install ' + btnClass + '">' +
                                    btnText +
                                '</button>' +
                            '</div>' +
                            '<div class="linkArea">' +
                                docLink +
                            '</div>' +
                        '</div>' +
                        '</section>' +
                    '</div>';
        }

        if (html !== "") {
            html = '<div class="category cardContainer ' + category.getName() + '">' +
                        '<header class="cardHeader">' +
                            '<div class="title textOverflowOneLine categoryName">' +
                                "Category: " + category.getName() +
                            '</div>' +
                        '</header>' +
                        '<div class="cardMain items">' +
                        html +
                    '</div></div>';
        }

        return html;
    }

    // Reorders the categories. If it is not in this map, it will be ordered alphabetically.
    private _setupCategoryOrder() {
        this._categoryOrder = new Map<string, number>();
        this._categoryOrder.set("Applications", 0);
        this._categoryOrder.set("How-to", 1);
        this._categoryOrder.set("Imports", 2);
        this._categoryOrder.set("SQL Mode", 3);
        this._categoryOrder.set("Developer Mode", 4);
        this._categoryOrder.set("Export/Publish", 5);
        this._categoryOrder.set("System", 6);
        this._orderedCatLength = 7;
    }
}
