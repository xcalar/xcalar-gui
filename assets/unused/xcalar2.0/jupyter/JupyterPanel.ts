namespace JupyterPanel {
    let $jupyterPanel: JQuery;
    let jupyterMeta: JupyterMeta;
    let msgId: number = 0;
    let msgPromises = {};
    let promiseTimeLimit: number = 8000; // 8 seconds
    let jupyterLoaded: boolean = false;

    class JupyterMeta {
        private currentNotebook: string;
        private folderName: string;
        constructor(currentNotebook?: string, folderName?: string) {
            this.currentNotebook = currentNotebook || null;
            this.folderName = folderName || null;
        }

        public setCurrentNotebook(currentNotebook) {
            this.currentNotebook = currentNotebook;
        }

        public getCurrentNotebook(): string {
            return this.currentNotebook;
        }

        public setFolderName(folderName): void {
            this.folderName = folderName;
        }

        public getFolderName(): string {
            return this.folderName;
        }

        public getMeta(): {currentNotebook: string, folderName: string} {
            return {
                currentNotebook: this.currentNotebook,
                folderName: this.folderName
            };
        }

        public hasFolder(): boolean {
            return (this.folderName != null);
        }
    }

    export function setup(): void {
        $jupyterPanel = $("#jupyterPanel");
        JupyterStubMenu.setup();
    };

    export function initialize(noRestore?: boolean): XDPromise<void> {
        // XXX disabled in data mart
        return PromiseHelper.resolve();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (window["jupyterNode"] == null || window["jupyterNode"] === "") {
            window["jupyterNode"] = hostname + '/jupyter';
        }

        window.addEventListener("message", function(event) {
            let struct = event.data;
            try {
                if (typeof struct !== "string") {
                    // this is not the message for jupyter
                    return;
                }
                let s = JSON.parse(struct);
                switch (s.action) {
                    case ("alert"):
                        if ($jupyterPanel.is(":visible")) {
                            $("#alertModal").height(300);
                            Alert.show(s.options);
                        }
                        break;
                    case ("autofillImportUdf"):
                        // comes from xcalar.js if initial autofillimportudf
                        // call occurs in the notebook list view
                        if (s.includeStub === "true") {
                            s.includeStub = true;
                        } else if (s.includeStub === "false") {
                            s.includeStub = false;
                        } else {
                            console.error(s);
                        }
                        s.url = s.filePath;
                        if (s.includeStub) {
                            showImportUdfModal(s.target, s.filePath);
                        } else {
                            JupyterPanel.appendStub("importUDF", s);
                            UDFPanel.Instance.openUDF(s.udfPanelModuleName);
                        }
                        break;
                    case ("enterExistingNotebook"):
                    case ("enterNotebookList"):
                        JupyterPanel.sendInit();
                        break;
                    case ("mixpanel"):
                        try {
                            if (xcMixpanel.forDev()) {
                                xcMixpanel.track(s.event, s.property);
                            }
                        } catch (error) {
                            console.log("mixpanel is not loaded");
                        }
                        break;
                    case ("newUntitled"):
                        JupyterPanel.sendInit(true, s.publishTable, s.tableName,
                                              s.numRows,
                                              {noRenamePrompt: s.noRename});
                        break;
                    case ("toggleMenu"):
                        JupyterStubMenu.toggleAllow(s.allow);
                        break;
                    case ("udfToMapForm"):
                        UDFFileManager.Instance.refresh(false, false)
                        .then(function() {
                            showMapForm(s.tableName, s.columns, s.moduleName,
                                        s.fnName);
                        })
                        .fail(udfRefreshFail);
                        break;
                    case ("udfToDSPreview"):
                        UDFFileManager.Instance.refresh(false, false)
                        .then(function() {
                            showDSForm(s.moduleName, s.fnName);
                        })
                        .fail(udfRefreshFail);
                        break;
                    case ("updateLocation"):
                        storeCurrentNotebook(s);
                        break;
                    case ("resolve"):
                        if (msgPromises[s.msgId]) {
                            msgPromises[s.msgId].resolve(s);
                            delete msgPromises[s.msgId];
                        }
                        break;
                    case ("reject"):
                        if (msgPromises[s.msgId]) {
                            msgPromises[s.msgId].reject(s);
                            delete msgPromises[s.msgId];
                        }
                        break;
                    default:
                        // XXX temp fix until 11588 is fixed
                        if (s.action === "returnFolderName") {
                            for (let i in msgPromises) {
                                msgPromises[i].resolve(s);
                                delete msgPromises[i];
                            }
                        }
                        console.error("Unsupported action from Jupyter:" + s.action);
                        break;
                }
            } catch (e) {
                console.error("Illegal message sent:" + event.data, e);
            }
        });

        const $tab = $("#jupyterTab");
        $tab.addClass("xc-disabled");
        if (noRestore) {
            jupyterMeta = new JupyterMeta();
            loadJupyterNotebook()
            .always(() => {
                $tab.removeClass("xc-disabled");
                deferred.resolve();
            });
        } else {
            restoreMeta()
            .always(() => {
                loadJupyterNotebook()
                .always(() => {
                    $tab.removeClass("xc-disabled");
                    deferred.resolve();
                });
            });
        }

        return deferred.promise();
    };

    export function sendInit(
        newUntitled?: boolean,
        publishTable?: string,
        tableName?: string,
        numRows?: number,
        options?
    ): void {
        let colNames: string[] = [];
        if (publishTable && tableName) {
            colNames = getCols(tableName);
        }
        options = options || {};
        let noRenamePrompt: boolean = options.noRenamePrompt || false;
        let activeWBId: string = WorkbookManager.getActiveWKBK();
        let wbName: string = null;
        if (activeWBId && WorkbookManager.getWorkbook(activeWBId)) {
            wbName = WorkbookManager.getWorkbook(activeWBId).name;
        }
        let workbookStruct = {action: "init",
                newUntitled: newUntitled,
                noRenamePrompt: noRenamePrompt,
                publishTable: publishTable,
                tableName: tableName,
                colNames: colNames,
                numRows: numRows,
                username: userIdName,
                userid: userIdUnique,
                sessionname: wbName,
                sessionid: activeWBId,
                folderName: jupyterMeta.getFolderName()
        };
        sendMessageToJupyter(workbookStruct);
    };

    /**
     * JupyterPanel.publishTable
     * @param tableName
     * @param numRows
     */
    export function publishTable(
        tableName: string,
        numRows: number
    ): void {
        let colNames: string[] = getCols(tableName);
        MainMenu.openPanel("jupyterPanel");
        let tableStruct = {action: "publishTable",
                        tableName: tableName,
                        colNames: colNames,
                        numRows: numRows};
        // this message gets sent to either the notebook or list view
        // (which every is currently active)
        // if list view receives it, it will create a new notebook and
        // redirect to it and xcalar.js will send a message back to this
        // file with a "newUntitled" action, which prompts
        // JupyterPanel.sendInit to send a message back to the notebook
        // with session information
        sendMessageToJupyter(tableStruct);
    }

    export function autofillImportUdfModal(
        target: string,
        filePath: string,
        includeStub: boolean,
        moduleName: string,
        functionName: string,
        udfPanelModuleName: string
    ): void {

        MainMenu.openPanel("jupyterPanel");

        if (!jupyterMeta.getCurrentNotebook()) {
            let msgStruct = {
                action: "autofillImportUdf",
                target: target,
                filePath: filePath,
                includeStub: includeStub,
                moduleName: moduleName,
                fnName: functionName,
                udfPanelModuleName: udfPanelModuleName
            };
            sendMessageToJupyter(msgStruct);
            // custom.js will create a new notebook and xcalar.js will
            // send a message back to here with an autofillImportUdf action
        } else {
            if (includeStub) {
                showImportUdfModal(target, filePath);
            } else {
                JupyterPanel.appendStub("importUDF", {
                    fnName: functionName,
                    target: target,
                    url: filePath,
                    moduleName: moduleName,
                    includeStub: false,
                });

                UDFPanel.Instance.openUDF(udfPanelModuleName);
            }
        }
    };

    // called when we create a new xcalar workbook
    // will create a new jupyter folder dedicated to this workbook
    export function newWorkbook(wkbkName: string): XDPromise<string> {
        // XXX disabled in data mart
        return PromiseHelper.resolve();
        let deferred: XDDeferred<string> = PromiseHelper.deferred();

        let folderName: string = XcUser.getCurrentUserName() + "-" + wkbkName;
        let msgStruct = {
            action: "newWorkbook",
            folderName: folderName
        };

        sendMessageToJupyter(msgStruct, true)
        .then(function(result: {newName: string}) {
            deferred.resolve(result.newName);
        })
        .fail(function(err) {
            console.error(err.error);
            deferred.resolve(err); // resolve anyways without folder
        });

        return deferred.promise();
    };

    export function renameWorkbook(oldFolderName: string, newWkbkName: string): XDPromise<string> {
        // XXX disabled in data mart
        return PromiseHelper.resolve();

        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        let newFolderName: string = XcUser.getCurrentUserName() + "-" + newWkbkName;
        let msgStruct = {
            action: "renameWorkbook",
            newFolderName: newFolderName,
            oldFolderName: oldFolderName,
            sessionId: WorkbookManager.getActiveWKBK(),
            sessionname: newWkbkName
        };

        sendMessageToJupyter(msgStruct, true)
        .then(function(result: {newName: string}) {
            if (jupyterMeta.getFolderName() === oldFolderName) {
                jupyterMeta.setFolderName(result.newName);
            }
            deferred.resolve(result.newName);
        })
        .fail(function(err) {
            console.error(err.error);
            deferred.resolve(err); // resolve anyways without folder
        });
        return deferred.promise();
    }

    export function copyWorkbook(oldFolder: string, newFolder: string): void {
        // XXX disabled in data mart
        return;
        let msgStruct = {
            action: "copyWorkbook",
            oldFolder: oldFolder,
            newFolder: newFolder
        };

        sendMessageToJupyter(msgStruct);
    }

    export function deleteWorkbook(wkbkId: string): void {
        // XXX disabled in data mart
        return;
        let folderName: string = WorkbookManager.getWorkbook(wkbkId).jupyterFolder;

        if (folderName) {
            let msgStruct = {
                action: "deleteWorkbook",
                folderName: folderName
            };
            sendMessageToJupyter(msgStruct);
        }
    };

    // when name change was triggered from another workbook
    export function updateFolderName(newFolderName: string): void {
        // XXX disabled in data mart
        return;
        let oldFolderName: string = jupyterMeta.getFolderName();
        let sessionId: string = WorkbookManager.getActiveWKBK();
        let sessionName: string = WorkbookManager.getWorkbook(sessionId).getName();
        jupyterMeta.setFolderName(newFolderName);

        let msgStruct = {
            action: "updateFolderName",
            oldFolderName: oldFolderName,
            newFolderName: newFolderName,
            sessionId: sessionId,
            sessionname: sessionName
        };

        sendMessageToJupyter(msgStruct);
    };

    function showImportUdfModal(target: string, filePath: string): void {
        let params = {
            target: target,
            filePath: filePath
        }
        return JupyterUDFModal.Instance.show("newImport", params);
    }

    function getCols(tableName: string): string[] {
        let tableId: TableId = xcHelper.getTableId(tableName);
        let columns: ProgCol[] = gTables[tableId].getAllCols(true);
        let colNames = [];
        for (let i = 0; i < columns.length; i++) {
            colNames.push(columns[i].backName.replace("\\",""));
        }
        return colNames;
    }

    function loadJupyterNotebook(): XDPromise<void> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();

        $("#jupyterNotebook").on("load", function() {
            jupyterLoaded = true;
        });

        let url: string;
        let treeUrl: string = window["jupyterNode"] + "/tree";
        let currNotebook: string = jupyterMeta.getCurrentNotebook();
        let folderName: string = jupyterMeta.getFolderName();
        // try folder/currnotebook, else just go to the folder else root
        // we do not send the user to a notebook that's not in their folder
        if (currNotebook && folderName) {
            url = window["jupyterNode"] + "/notebooks/" + folderName + "/" +
                  currNotebook + ".ipynb?kernel_name=python3#";
        } else if (folderName) {
            url = treeUrl + "/" + folderName;
        } else {
            url = treeUrl;
        }

        goToLocation(url)
        .then(deferred.resolve)
        .fail(function() {
            if (currNotebook && folderName) {
                // notebook path failed, try to go to folder path
                let folderPath: string = treeUrl + "/" + folderName
                goToLocation(folderPath)
                .then(deferred.resolve)
                .fail(function() {
                    goToLocation(treeUrl).always(deferred.resolve);
                });
            } else if (url !== treeUrl) {
                goToLocation(treeUrl).always(deferred.resolve);
            } else {
                deferred.resolve();
            }
        });

        function goToLocation(location: string): XDPromise<void> {
            let innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            $.ajax({
                url: location,
                dataType: "json",
                timeout: promiseTimeLimit,
                success: function() {
                    $("#jupyterNotebook").attr("src", location);
                    innerDeferred.resolve();
                },
                error: function(err) {
                    if (err.status === 200) {
                        $("#jupyterNotebook").attr("src", location);
                        innerDeferred.resolve();
                    } else {
                        console.error("Jupyter load failed", err);
                        innerDeferred.reject(err);
                    }
                }
            });

            return innerDeferred.promise();
        }

        return deferred.promise();
    }

    function restoreMeta(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        let wkbk: WKBK = WorkbookManager.getWorkbook(WorkbookManager.getActiveWKBK());
        let promise: XDPromise<void> = PromiseHelper.resolve();
        let folderName: string = wkbk.jupyterFolder;
        if (!folderName) {
            folderName = XcUser.getCurrentUserName() + "-" + wkbk.getName();
            wkbk.setJupyterFolder(folderName);
            promise = WorkbookManager.commit();
        }
        promise.always(() => {
            let key: string = KVStore.getKey("gNotebookKey");
            let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
            kvStore.get()
            .then(function(jupMeta) {
                let lastNotebook = null;

                if (jupMeta) {
                    try {
                        lastNotebook = $.parseJSON(jupMeta);
                    } catch (err) {
                        console.error(err);
                    }
                }

                jupyterMeta = new JupyterMeta(lastNotebook, folderName);
                deferred.resolve();
            })
            .fail(function() {
                jupyterMeta = new JupyterMeta(null, folderName);
                deferred.reject.apply(null, arguments);
            });
        });

        return deferred.promise();
    }

    function storeCurrentNotebook(info): XDPromise<void> {
        let currNotebook: string;
        if (info.location === "notebook") {
            currNotebook = info.lastNotebook;
        } else { // location is tree and we leave null
            currNotebook = null;
        }

        jupyterMeta.setCurrentNotebook(currNotebook);
        JupyterStubMenu.toggleVisibility(jupyterMeta.getCurrentNotebook() != null);

        let kvsKey: string = KVStore.getKey("gNotebookKey");
        if (kvsKey == null) {
            // when not set up yet
            return PromiseHelper.resolve();
        }
        let kvStore: KVStore = new KVStore(kvsKey, gKVScope.WKBK);
        return kvStore.put(JSON.stringify(currNotebook), true);
    }

    export function appendStub(stubName: string, args?: any) {
        let stubStruct = {action: "stub", stubName: stubName, args: args};
        sendMessageToJupyter(stubStruct);
    };

    // XXX TODO: update it
    async function showMapForm(tableName: string, columns: string[], moduleName: string, fnName: string): Promise<void> {
        let tabId: string = null;
        let dagNode: DagNode = null;
        try {
            let tabs: DagTab[] = DagTabManager.Instance.getTabs();
            tabs.forEach((tab) => {
               let graph: DagGraph = tab.getGraph();
               if (graph != null) {
                   for (let node of graph.getAllNodes().values()) {
                       if (node.getTable() === tableName) {
                           tabId = tab.getId();
                           dagNode = node;
                           break; // stop loop
                       }
                   }
               }

               if (dagNode != null) {
                   return false;
               }
            });
        } catch (e) {
            tabId = null;
            dagNode = null;
            console.error(e);
        }

        if (tabId == null) {
            Alert.show({
                title: "Error",
                msg: "Table " + tableName + " is not present in any active modules.",
                isAlert: true
            });
        } else {
            MainMenu.openPanel("sqlPanel");
            DagTabManager.Instance.switchTab(tabId);
            let input = {
                eval: [{
                    evalString: `${moduleName}:${fnName}(${columns.join(",")})`,
                    newField: ""
                }],
                icv: false
            };
            let mapNode: DagNodeMap = <DagNodeMap> await DagViewManager.Instance.autoAddNode(DagNodeType.Map, null, dagNode.getId(), input);
            if (mapNode != null) {
                DagNodeMenu.execute("configureNode", {
                    node: mapNode
                });
            }
        }
    }

    function showDSForm(moduleName: string, fnName: string): void {
        let formatVal: string = $("#fileFormat .text").val();
        if (!$("#dsForm-config").hasClass("xc-hidden") &&
            formatVal === $("#fileFormatMenu").find('li[name="UDF"]').text()) {

            MainMenu.openPanel("datastorePanel", "inButton");
            $("#udfArgs-moduleList").find("li").filter(function() {
                return $(this).text() === moduleName;
            }).trigger(fakeEvent.mouseup);

            $("#udfArgs-funcList").find("li").filter(function() {
                return $(this).text() === fnName;
            }).trigger(fakeEvent.mouseup);

            $("#dsForm-applyUDF").click();
        } else {
            Alert.show({
                title: ErrorMessageTStr.title,
                msg: JupyterTStr.DSFormInactive,
                isAlert: true
            });
        }
    }

    function udfRefreshFail(): void {
        Alert.show({
            title: ErrorMessageTStr.title,
            msg: "Could not update UDF list.",
            isAlert: true
        });
    }

    function sendMessageToJupyter(msgStruct, isAsync?: boolean): XDPromise<{newName?: string}> {
        let deferred: XDDeferred<{newName?: string}> = PromiseHelper.deferred();
        if (!jupyterLoaded) {
            return PromiseHelper.reject({error: "Jupyter not loaded"});
        }

        // Prepare token to send to Jupyter
        let innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
        jQuery.ajax({
            type: "GET",
            contentType: "application/json",
            url: xcHelper.getAppUrl() + "/auth/getSessionId",
            success: function(retJson: {data: string}) {
                let token: string;
                if (!retJson || !retJson.data) {
                    token = "";
                } else {
                    token = retJson.data;
                }
                msgStruct.token = token;
                innerDeferred.resolve();
            },
            error: function() {
                console.error(arguments);
                innerDeferred.resolve();
            }
        });

        innerDeferred
        .always(function() {
            let messageInfo = {
                fromXcalar: true,
            };
            if (isAsync) {
                prepareAsyncMsg(messageInfo, deferred);
            } else {
                deferred.resolve();
            }
            msgStruct = $.extend(messageInfo, msgStruct);
            let msg: string = JSON.stringify(msgStruct);

            (<HTMLIFrameElement>$("#jupyterNotebook")[0]).contentWindow.postMessage(msg, "*");
        });

        return deferred.promise();
    }

    function prepareAsyncMsg(messageInfo: any, deferred: XDDeferred<{newName?: string}>) {
        messageInfo.msgId = msgId;
        msgPromises[msgId] = deferred;
        let cachedId = msgId;
        setTimeout(function() {
            if (msgPromises[cachedId]) {
                msgPromises[cachedId].reject({error: "timeout"});
                delete msgPromises[cachedId];
            }
        }, promiseTimeLimit);
        msgId++;
    }

        /* Unit Test Only */
    if (window["unitTestMode"]) {
        JupyterPanel["__testOnly__"] = {
            showMapForm: showMapForm,
            showDSForm: showDSForm,
            getCurNB: function() {
                return jupyterMeta.getCurrentNotebook();
            },
            setCurNB: function(nb) {
                jupyterMeta.setCurrentNotebook(nb);
            }
        };
    }
    /* End Of Unit Test Only */

}
