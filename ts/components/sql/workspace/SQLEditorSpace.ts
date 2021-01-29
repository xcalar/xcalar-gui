class SQLEditorSpace {
    private static _instance: SQLEditorSpace;

    private _sqlEditor: SQLEditor;
    public static minWidth: number = 200;
    private _executers: SQLDagExecutor[];
    private _currentSnippetId: string;
    private _popup: PopupPanel;
    private _connector: string = "native";
    private _connectorTypesSupported: string[] = ["snowflake"];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._executers = [];
        this._updateExecutor();
    }

    public setup(): void {
        this._setupSQLEditor();
        this._addEventListeners();
        this._loadSnippet();
        this.toggleSyntaxHighlight(!UserSettings.Instance.getPref("hideSyntaxHiglight"));
    }

    /**
     * SQLEditorSpace.Instance.refresh
     */
    public refresh(): void {
        if (this._sqlEditor) { // may not exist if called on startup
            this._sqlEditor.refresh();
        }
    }

    public clearSQL(): void {
        this._sqlEditor.setValue("");
        this._saveSnippetChange();
    }

    public getEditor(): SQLEditor {
        return this._sqlEditor;
    }

    public getCurrentSnippetId(): string {
        return this._currentSnippetId;
    }

    /**
     * SQLEditorSpace.Instance.newSQL
     * @param sql
     * @param msg //optional status box message to display
     */
    public newSQL(sql: string, msg?: string): void {
        let val: string = this._sqlEditor.getValue();
        if (val) {
            if (!val.trim().endsWith(";")) {
                val += ";";
            }
            const delimiter: string = val.endsWith("\n") ? "" : "\n";
            val += delimiter + sql;
        } else {
            val = sql;
        }
        if (SQLTabManager.Instance.getNumTabs() === 0) {
            SQLTabManager.Instance.newTab();
        }
        this._sqlEditor.setValue(val);
        this._sqlEditor.refresh();
        const code_mirror_editor: CodeMirror.Editor = this._sqlEditor.getEditor();
        code_mirror_editor.focus();
        // scroll to the last line
        code_mirror_editor.setCursor({ line: code_mirror_editor.lineCount() });
        const coords = code_mirror_editor.cursorCoords(true);
        if (msg) {
            StatusBox.show(msg, null, false, {
                coordinates: coords,
                type: "info"
            });
        }

        this._saveSnippetChange();
    }

    /**
     * SQLEditorSpace.Instance.execute
     * @param sqls
     */
    public execute(sqls: string): void {
        if (!DagPanel.Instance.hasSetup()) {
            Alert.error(AlertTStr.Error, DFTStr.NotSetup);
            return;
        }
        return this._executeSQL(sqls);
    }

    public cancelExecution(): void {
        this._executers.forEach((executor, i) => {
            if (executor.getStatus() != SQLStatus.Done &&
                executor.getStatus() != SQLStatus.Cancelled &&
                executor.getStatus() != SQLStatus.Failed
            ) {
                this._executers[i] = null;
                executor.setStatus(SQLStatus.Cancelled);
            }
        });

        this._executers = this._executers.filter((executor) => {
            return executor != null;
        });
    }

    /**
     * SQLEditorSpace.Instance.deleteSnippet
     * @param sqls
     */
    public deleteSnippet(id: string): void {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj == null) {
            return;
        }
        let msg = xcStringHelper.replaceMsg(SQLTStr.DeleteSnippetMsg, {
            name: snippetObj.name
        });
        Alert.show({
            title: SQLTStr.DeleteSnippet,
            msg: msg,
            onConfirm: () => {
                SQLSnippet.Instance.delete(id);
            }
        });
    }

    /**
     * SQLEditorSpace.Instance.openSnippet
     * @param name
     */
    public openSnippet(id: string): boolean {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(id);
        if (snippetObj == null) {
            return false;
        }
        const snippet = SQLSnippet.Instance.getSnippetText(snippetObj, true);
        this._currentSnippetId = snippetObj.id;
        this._setSnippet(snippet, snippetObj.temp);
        if (snippetObj.temp) {
            this._getEditorSpaceEl().addClass("hasTempTab");
        } else {
            this._getEditorSpaceEl().removeClass("hasTempTab");
        }

        return true;
    }

    /**
     * SQLEditorSpace.Instance.toggleSyntaxHighlight
     * @param on
     */
    public toggleSyntaxHighlight(on: boolean): void {
        if (this._sqlEditor != null) {
            this._sqlEditor.toggleSyntaxHighlight(on);
        }
    }

    private _setSnippet(snippet: string, isTempTab?: boolean): void {
        if (!snippet) {
            if (isTempTab) {
                this._setPlaceholder(SQLTStr.TempSnippetHint);
            } else {
                this._setPlaceholder(SQLTStr.SnippetHint);
            }

        }
        this._sqlEditor.setValue(snippet || "");
        this._sqlEditor.refresh();
    }

    private _setPlaceholder(placeholder: string): void {
        this._sqlEditor.setPlaceholder(placeholder);
        this._sqlEditor.refresh();
    }

    private _setupSQLEditor(): void {
        const self = this;
        this._sqlEditor = new SQLEditor("sqlEditorSpace-editor");
        this._sqlEditor
        .on("execute", () => {
            this._getEditorSpaceEl().find(".execute").click();
        })
        .on("cancelExecute", () => {
            // XXX need to unfreeze execute button in the future
            this.cancelExecution();
        })
        .on("autoComplete", (editor: CodeMirror.Editor) => {
            const hasHint = this._sqlEditor.showHintMenu(editor);
            if (!hasHint) {
                editor.execCommand("autocompleteSQLInVDW");
            }
        })
        .on("quickChange", () => { // fired before "change" without any delay
            // show dot icon before we actually save to kvstore
            const snippet = this._sqlEditor.getValue() || "";
            const snippetObj = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            const lastSnippet = SQLSnippet.Instance.getSnippetText(snippetObj);
            SQLTabManager.Instance.toggleUnSaved(this._currentSnippetId, (snippet !== lastSnippet));
        })
        .on("change", () => { // fired after a delay when user stops typing
            this._saveSnippetChange(true);
            const snippetObj: SQLSnippetDurable = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            if (snippetObj && snippetObj.temp) {
                SQLOpPanel.Instance.updateSnippet(this._currentSnippetId);
            }
        });

        CodeMirror.commands.autocompleteSQLInVDW = function(cmeditor) {
            let acTables = self._getAutoCompleteHint();
            CodeMirror.showHint(cmeditor, CodeMirror.hint.sql, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true,
                tables: acTables
            });
        }
    }

    private _getAutoCompleteHint(): any {
        let arcTables = {};
        try {

            let tables: PbTblInfo[] = SQLResultSpace.Instance.getAvailableTables();
            tables.forEach((table) => {
                arcTables[table.name] = [];
                table.columns.forEach((col) => {
                    if (col.name != "DATA" &&
                        !xcHelper.isInternalColumn(col.name)) {
                        arcTables[table.name].push(col.name);
                        if (!arcTables[col.name]) { // prevent table/column name collision
                            arcTables[col.name] = [];
                        }
                    }
                });
            });
            if (SQLOpPanel.Instance.isOpen()) {
                let sqlOpPanelTables = SQLOpPanel.Instance.getAutoCompleteList();
                arcTables = {...arcTables, ...sqlOpPanelTables};
            }

            const sqlFuncs = DagTabSQLFunc.listFuncs();
            sqlFuncs.forEach((sqlFunc) => {
                arcTables[sqlFunc + "()"] = [];
            });
            arcTables = this._dedupeWordsList(arcTables);
        } catch (e) {
            console.error(e);
        }
        return arcTables;
    }

    private _dedupeWordsList(wordsList) {
        let dedupList = {};
        let set = new Set();
        for (let word in wordsList) {
            if (!set.has(word.toUpperCase())) {
                set.add(word.toUpperCase());
                dedupList[word] = wordsList[word];
            }
        }
        return dedupList;
    }

    private _getEditorSpaceEl(): JQuery {
        return $("#sqlEditorSpace");
    }

    private async _loadSnippet(): Promise<void> {
        const deferred = PromiseHelper.deferred();
        const timer = this._startLoad(deferred.promise());
        const loadRes = await SQLSnippet.Instance.load();
        await SQLTabManager.Instance.setup();
        deferred.resolve();
        this._stopLoad(timer);
        ResourceMenu.Instance.render(ResourceMenu.KEY.SQL);
        if (loadRes === false) {
            // when it's the new workbook
            SQLTabManager.Instance.newTab();
        }
    }

    private _startLoad(promise: XDPromise<any>): any {
        const timer = setTimeout(() => {
            let $section = this._getEditorSpaceEl();
            $section.addClass("loading");
            xcUIHelper.showRefreshIcon($section, true, promise);
        }, 500);
        return timer;
    }

    private _stopLoad(timer: any): void {
        let $section = this._getEditorSpaceEl();
        clearTimeout(timer);
        $section.removeClass("loading");
    }

    private _getSQLs(): string {
        let sqls: string = this._sqlEditor.getSelection() ||
                               this._sqlEditor.getValue();
        return sqls;
    }

    private _getNumSQLStatements(sqls: string): number {
        const validSQLs = sqls.split(";").filter((sql) => {
           const trimmedStr = sql.trim();
           // not empty and not a comment
           return trimmedStr !== "" && !trimmedStr.startsWith("--");
        });
        return validSQLs.length;
    }

    private _executeAction(): void {
        if (this._executers.length === 0) {
            let sqls: string = this._getSQLs();
            let snippetObj = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            this._executeSQL(sqls, snippetObj);
        } else {
            Alert.show({
                "title": SQLTStr.Execute,
                "msgTemplate": xcStringHelper.replaceMsg(SQLTStr.InExecute,
                    {link: '<span class="actionLink" data-name="sqlHistory">View executing SQL</span>'}),
                "isAlert": true,
                "links": {
                    "sqlHistory": () => {
                        if (!DebugPanel.Instance.isVisible()) {
                            DebugPanel.Instance.toggleDisplay();
                        }
                        DebugPanel.Instance.switchTab("sqlHistory");
                        $(".sqlQueryHist .flexTable .body").scrollTop(0);
                    }
                }
            });
        }
    }

    private _dropTable(tableName: string, queryString: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const historyObj = {
            queryId: xcHelper.randName("sql", 8) + Date.now(),
            status: SQLStatus.Running,
            queryString: queryString,
            startTime: new Date(),
            statementType: SQLStatementType.Drop
        };
        let found = false;
        let tableInfos: PbTblInfo[] = PTblManager.Instance.getTables();
        for (let i = 0; i < tableInfos.length; i++) {
            if (tableInfos[i].name === tableName) {
                found = true;
                break;
            }
        }
        if (!found) {
            // Table not found
            historyObj["status"] = SQLStatus.Failed;
            historyObj["errorMsg"] = "Table not found: " + tableName;
            SQLHistorySpace.Instance.update(historyObj);
            return PromiseHelper.resolve();
        }
        SQLHistorySpace.Instance.update(historyObj);
        PTblManager.Instance.deleteTablesOnConfirm([tableName])
        .then(() => {
            historyObj["status"] = SQLStatus.Done;
            historyObj["endTime"] = new Date();
        })
        .fail((error) => {
            historyObj["status"] = SQLStatus.Failed;
            historyObj["errorMsg"] = error;
        })
        .always(() => {
            SQLHistorySpace.Instance.update(historyObj);
            // always resolve
            deferred.resolve();
        });
        return deferred.promise();
    }

    // used to convert statement into table function
    private async _compileSingleSQL(sql: string): Promise<SQLDagExecutor | null> {
        if (!sql || !sql.trim()) {
            return null;
        }

        try {
            const struct = {
                sqlQuery: sql,
                ops: ["identifier", "sqlfunc", "parameters"],
                isMulti: true
            };
            const ret = await SQLUtil.sendToPlanner("", "parse", struct)
            const sqlParseRet = JSON.parse(ret).ret;
            let sqlStructArray: SQLParserStruct[];
            if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                if (sqlParseRet.errorMsg) {
                    throw new Error(sqlParseRet.errorMsg);
                }
                sqlStructArray = sqlParseRet.parseStructs;
            } else {
                sqlStructArray = sqlParseRet;
            }
            if (sqlStructArray.length > 1) {
                throw new Error(SQLErrTStr.MultiQueries);
            }

            const sqlStruct: SQLParserStruct = sqlStructArray[0];
            if (sqlStruct.nonQuery) {
                throw new Error(SQLErrTStr.NoSupport + sqlStruct.sql);
            }
            const snippetObj = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            let schemas;
            if (snippetObj.temp) {
                schemas = this._getSchemaFromSQLOpPanel(sqlStruct.identifiers);
            }
            const executor: SQLDagExecutor = new SQLDagExecutor(sqlStruct, {
                compileOnly: true,
                schemas
            });
            for (let i = 0; i < sqlStruct.identifiers.length; i++) {
                let identifier = sqlStruct.identifiers[i];
                let tableName = identifier;
                if (sqlStruct.newIdentifiers && sqlStruct.newIdentifiers[tableName]) {
                    tableName = sqlStruct.newIdentifiers[tableName];
                }
                if (executor._sessionTables.has(identifier.toUpperCase())) {
                    await executor.setSessionTableSchema(tableName, identifier);
                }
            }
            await executor.compile(null);
            return executor;
        } catch (e) {
            this._throwError(e);
            return null;
        }
    }

    private _executeSQL(sqls: string, snippetObj?: SQLSnippetDurable): void {
        if (!sqls || !sqls.trim()) {
            return
        }

        try {
            let selectArray: SQLParserStruct[] = [];
            let lastShow: any = {type: "select"};
            let executorArray: SQLDagExecutor[] = [];
            let compilePromiseArray: XDPromise<any>[] = [];
            let executePromiseArray: XDPromise<any>[] = [];
            let schemaPromiseArray: XDPromise<any>[] = [];
            let self: SQLEditorSpace = this;
            const struct = {
                sqlQuery: sqls,
                ops: ["identifier", "sqlfunc", "parameters"],
                isMulti: true
            };
            let sqlStructArray: SQLParserStruct[];
            let snippetName, snippetId;
            if (snippetObj) {
                snippetName = snippetObj.name;
                snippetId = snippetObj.id;
            }

            SQLUtil.sendToPlanner("", "parse", struct)
            .then((ret) => {
                const sqlParseRet = JSON.parse(ret).ret;
                if (!(sqlParseRet instanceof Array)) { // Remove this after parser change in
                    if (sqlParseRet.errorMsg) {
                        return PromiseHelper.reject(sqlParseRet.errorMsg);
                    }
                    sqlStructArray = sqlParseRet.parseStructs;
                } else {
                    sqlStructArray = sqlParseRet;
                }
                if (sqlStructArray.length > 1) {
                    return PromiseHelper.reject(SQLErrTStr.MultiQueries);
                }
                return this._validateParameters(sqlStructArray);
            })
            .then(function(){
                return XcalarTargetList();
            })
            .then(function (res) {
                let snowflakeParams: any = {};
                let targetAliases = [];
                let targetAliasMap = {};
                sqlStructArray[0].predicateTargets = {};
                for (var r in res) {
                    if (res[r]["type_id"] == "snowflake"){
                        snowflakeParams = res[r]["params"];
                        targetAliases.push(snowflakeParams.alias);
                        targetAliasMap[snowflakeParams.alias] = res[r];
                    }
                }
                if (sqlStructArray[0].command.type !== "select"
                    && self._connector !== "native") {
                    sqlStructArray[0].predicateTargets[self._connector]
                                            = targetAliasMap[self._connector];
                }
                for (let tbl in sqlStructArray[0].identifierMap) {
                    let sourceList =
                        sqlStructArray[0].identifierMap[tbl].sourceList;
                    if (sourceList.length === 0) {
                        if (self._connector === "native") {
                            sqlStructArray[0].identifierMap[tbl].target = "Xcalar";
                        } else {
                            // We only support one target currently
                            for (let alias in sqlStructArray[0].predicateTargets) {
                                if (alias !== self._connector) {
                                    return PromiseHelper.reject(
                                            "Multiple target not supported!");
                                }
                            }
                            // Here _connector should be in target alias list
                            sqlStructArray[0].predicateTargets[self._connector]
                                            = targetAliasMap[self._connector];
                        }
                    } else if (targetAliases.indexOf(sourceList[0]) !== -1) {
                        sqlStructArray[0].identifierMap[tbl].target = sourceList[0];
                        // We only support one target currently
                        for (let alias in sqlStructArray[0].predicateTargets) {
                            if (alias !== sourceList[0]) {
                                return PromiseHelper.reject(
                                        "Multiple target not supported!");
                            }
                        }
                        sqlStructArray[0].predicateTargets[sourceList[0]]
                                                = targetAliasMap[sourceList[0]];
                    } else {
                        return PromiseHelper.reject("Cannot find source " +
                            sourceList[0] + " for table " +
                            sqlStructArray[0].identifierMap[tbl].rawName);
                    }
                }
                if (!struct.isMulti && sqlStructArray.length === 1 &&
                    Object.keys(sqlStructArray[0].functions).length === 0 &&
                    sqlStructArray[0].command.type !== "createTable") {
                    // when it's single statement and doesn't have SQL function
                    // use original sql which contains newline characters
                    sqlStructArray[0].sql = sqlStructArray[0].newSql = sqls;
                }
                for (let sqlStruct of sqlStructArray) {
                    if (self._connector === "native") {
                        if (sqlStruct.command.type === "dropTable") {
                            const tableName = sqlStruct.command.args[0];
                            executePromiseArray.push(this._dropTable.bind(this, tableName, sqlStruct.sql));
                        }
                        else if (sqlStruct.command.type === "createTable") {
                            if (sqlStructArray.length > 1) {
                                return PromiseHelper.reject(SQLErrTStr.MultiCreate);
                            }
                            selectArray.push(sqlStruct);
                        }
                        else if (sqlStruct.command.type === "showTables"
                            || sqlStruct.command.type === "describeTable") {
                            lastShow = sqlStruct.command;
                        }
                        else if (sqlStruct.nonQuery) {
                            return PromiseHelper.reject(SQLErrTStr.NoSupport + sqlStruct.sql);
                        }
                        else {
                            selectArray.push(sqlStruct);
                        }
                    } else {
                        if (sqlStruct.command.type === "showTables"
                            || sqlStruct.command.type === "describeTable") {
                            lastShow = sqlStruct.command;
                        }
                        else if (sqlStruct.nonQuery) {
                            return PromiseHelper.reject(SQLErrTStr.NoSupport + sqlStruct.sql);
                        }
                        selectArray.push(sqlStruct);
                    }
                }
                if (self._connector == "native") {
                    // Basic show tables and describe table
                    // If there are multiple queries they are ignored
                    if (sqlStructArray.length === 1 && lastShow.type === "showTables") {
                        SQLResultSpace.Instance.showTables(true);
                    } else if (sqlStructArray.length === 1 &&
                            lastShow.type === "describeTable") {
                        let tableInfos: PbTblInfo[] = PTblManager.Instance.getTables();
                        const targetTableName: string = lastShow.args[0];
                        for (let i = 0; i < tableInfos.length; i++) {
                            if (tableInfos[i].name === targetTableName) {
                                SQLResultSpace.Instance.showSchema(tableInfos[i]);
                                return;
                            }
                        }
                        // Table not found
                        console.error("Table not found: " + targetTableName);
                        SQLResultSpace.Instance.showSchemaError("Table not found: "
                                                                + targetTableName);
                    }
                }
                for (let i = 0; i < selectArray.length; i++) {
                    const sqlStruct: SQLParserStruct = selectArray[i];
                    let executor: SQLDagExecutor;
                    try {
                        sqlStruct.connector = self._connector;
                        executor = new SQLDagExecutor(sqlStruct, {
                            sqlStatementName: snippetName + ".sql",
                            snippetId: snippetId
                        });
                    } catch (e) {
                        console.error(e);
                        return PromiseHelper.reject(e);
                    }
                    executorArray.push(executor);
                }
                if (selectArray[0]) {
                    selectArray[0].identifiers.forEach((identifier) => {
                        let tableName = identifier;
                        if (selectArray[0].newIdentifiers && selectArray[0].newIdentifiers[tableName]) {
                            tableName = selectArray[0].newIdentifiers[tableName];
                        }
                        if (executorArray[0]._sessionTables.has(identifier.toUpperCase())) {
                            schemaPromiseArray.push(executorArray[0].setSessionTableSchema(tableName, identifier));
                        }
                    });
                }

                return PromiseHelper.when.apply(this, schemaPromiseArray);
            })
            .then(() => {
                for (let i = 0; i< executorArray.length; i++) {
                    this._addExecutor(executorArray[i]);
                    compilePromiseArray.push(this._compileStatement(executorArray[i]));
                    executePromiseArray.push(this._executeStatement.bind(this,
                                      executorArray[i], i, selectArray.length));
                }
                return PromiseHelper.when.apply(this, compilePromiseArray);
            })
            .then(() => {
                return PromiseHelper.chain(executePromiseArray)
            })
            .then(() => {
                SQLResultSpace.Instance.refreshTables();
            })
            .fail((e) => {
                this._throwError(e);
            });
        } catch (e) {
            this._throwError(e);
        }
    }

    private _throwError(error: any): void {
        if (error instanceof Array) {
            let errorMsg = null;
            for (let i = 0; i < error.length; i++) {
                if (error[i] != null) {
                    errorMsg = error[i];
                    break;
                }
            }
            error = errorMsg;
        }
        if (!error) {
            // if error is null, it should have an alert in sql node
            return;
        }
        console.error(error);
        let errorMsg: string;
        let detail: string;
        try {
            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "string") {
                errorMsg = error;
            } else if (error.status != null) {
                errorMsg = error.error;
                detail = error.log;
                if (error.status === StatusT.StatusAstNoSuchFunction) {
                    errorMsg = (error.error.startsWith("Error: ") ?
                               error.error.substring(7) : error.error) +
                               "\nVerify, that the function exists or that " +
                               "the function name is correct.";
                } else if (error.status === StatusT.StatusInval) {
                    let logLines = error.log.split("\n");
                    let tempIndex = logLines[0].search(/Line [0-9]+:/);
                    let lineStr = logLines[0].substring(tempIndex);
                    detail = lineStr.substring(lineStr.lastIndexOf(":") + 2);
                    if (logLines[1].startsWith("Operation: ")) {
                        detail = detail + ", " + logLines[1];
                    }
                }
            } else {
                errorMsg = JSON.stringify(error);
            }
        } catch (e) {
            console.error(e);
            errorMsg = JSON.stringify(error);
        }
        Alert.show({
            title: SQLErrTStr.Err,
            msg: errorMsg,
            detail: detail,
            isAlert: true,
            align: "left",
            preSpace: true,
            sizeToText: true
        });
    }
    private _compileStatement(curExecutor: SQLDagExecutor) {
        try {
            let callback = null;
            let deferred: XDDeferred<any> = PromiseHelper.deferred();
            callback = () => {
                this._removeExecutor(curExecutor);
            };
            curExecutor.compile(callback)
            .then(deferred.resolve)
            .fail((err) => {
                deferred.reject(err);
                // XXX not sure why we were resolving sometimes
                // if (curExecutor.getPublishName()) {
                //     deferred.reject(err);
                // } else {
                //     deferred.resolve(err);
                // }
            });
            return deferred.promise();
        } catch (e) {
            this._throwError(e);
        }
    }

    private _executeStatement(curExecutor: SQLDagExecutor,
                              i: number, statementCount: number) {
        try {
            let callback = null;
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            if (i === statementCount - 1) {
                callback = (outputNode: DagNode, tabId: string, succeed, options) => {
                    this._removeExecutor(curExecutor);
                    if (succeed && options.show === "resultTable" && outputNode) {
                        DagViewManager.Instance.viewResult(outputNode, tabId);
                    } else if (succeed && options.show === "tableList") {
                        SQLResultSpace.Instance.showTables(true);
                    }
                };
            } else {
                callback = () => {
                    this._removeExecutor(curExecutor);
                };
            }
            curExecutor.execute(callback)
            .then(deferred.resolve)
            .fail((err) => {
                deferred.reject(err);
                 // XXX not sure why we were resolving sometimes
                // if (curExecutor.getPublishName()) {
                //     deferred.reject(err);
                // } else {
                //     deferred.resolve(err);
                // }
            });
            return deferred.promise();
        } catch (e) {
            this._throwError(e);
        }
    }

    private _validateParameters(sqlStructArray) {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const allParameters = DagParamManager.Instance.getParamMap();
        const noValues = [];
        const seen = new Set();

        sqlStructArray.forEach((struct) => {
            struct.parameters.forEach((parameter) => {
                // Parser not return parameter names in upper case as requested
                let found: boolean = false;
                if (seen.has(parameter)) {
                    return;
                }
                for (const curParam in allParameters) {
                    if (curParam.toUpperCase() === parameter.toUpperCase()) {
                        found = true;
                    }
                }
                if (!found) {
                    noValues.push(parameter);
                }
                seen.add(parameter);
            })
        });

        if (noValues.length) {
            let msg = `The following parameters do not have a value assigned: ${noValues.join(", ")}.`;

            msg += `\n Note: Creating SQL parameters in uppercase is recommended.`;
            msg += `\n Do you want to continue?`;
            Alert.show({
                "title": "Confirmation",
                "msgTemplate": msg,
                "onConfirm": function() {
                    deferred.resolve();
                },
                "onCancel": function() {
                    deferred.reject(null); // should not show error
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    private _addExecutor(executor: SQLDagExecutor): void {
        this._executers.push(executor);
        this._updateExecutor();
    }

    private _removeExecutor(executor: SQLDagExecutor): void {
        for (let i = 0; i< this._executers.length; i++) {
            if (this._executers[i] === executor) {
                this._executers.splice(i, 1);
                break;
            }
        }
        this._updateExecutor();
    }

    private _updateExecutor() {
        let $cancelButton = $("#sqlWorkSpacePanel .selQueryHistCard .selCancelQueryHist").addClass("xc-disabled");
        if (this._executers.length === 0) {
            $cancelButton.addClass("xc-disabled");
        } else {
            $cancelButton.removeClass("xc-disabled");
        }
    }


    private _fileOption(action: string): void {
        switch (action) {
            case "download":
                this._downlodSnippet();
                break;
            case "showTables":
                SQLResultSpace.Instance.showTables(false);
                break;
            case "addUDF":
                UDFPanel.Instance.loadSQLUDF();
                break;
            case "history":
                DebugPanel.Instance.toggleDisplay(true);
                DebugPanel.Instance.switchTab("sqlHistory");
                break;
            case "convertToSQLFuc":
                this._convertToSQLFunc();
                break;
            case "addToModule":
                this._addToModule();
                break;
            case "viewShortcuts":
                // handled in SQLEditorShortcutsModal
                break;
            default:
                break;
        }
    }

    private async _saveSnippet(
        id: string,
        snippet: string,
        tempSave: boolean
    ): Promise<void> {
        let $section = this._getEditorSpaceEl();
        if (!tempSave) {
            $section.addClass("saving");
        }
        let startTime = Date.now();
        await SQLSnippet.Instance.update(id, snippet, tempSave);
        let endTime = Date.now();
        if (!tempSave) {
            setTimeout(() => {
                $section.removeClass("saving");
            }, Math.max(0, 1000 - (endTime - startTime)));
        }
    }

    private _downlodSnippet(): void {
        const fileName: string = "snippet.sql";
        const content = this._sqlEditor.getValue();
        xcHelper.downloadAsFile(fileName, content);
    }

    public setupPopup(): void {
        this._popup = new PopupPanel("sqlViewContainer", {
            draggableHeader: ".draggableHeader"
        });
        this._popup
        .on("Undock", () => {
            this.refresh();
        })
        .on("Dock", () => {
            this.refresh();
        })
        .on("Resize", () => {
            this.refresh();
        })
        .on("Show", () => {
            this.toggleDisplay(true);
        });
    }

    public bringToFront() {
        this._popup.bringToFront();
    }

    public toggleDisplay(display?: boolean): void {
        const $container = $("#sqlViewContainer").parent();
        if (display == null) {
            display = $container.hasClass("xc-hidden");
        }

        const $tab = $("#sqlEditorTab");
        if (display) {
            $tab.addClass("active");
            $container.removeClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Show_BroadCast");
            this.refresh();
        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Hide_BroadCast");
        }
    }

    private _addEventListeners(): void {
        const $container = this._getEditorSpaceEl();
        const $header = $container.find("header");
        $header.on("click", ".execute", (event) => {
            $(event.currentTarget).blur();
            this._executeAction();
        });

        $header.on("click", ".saveFile", () => {
            this._saveSnippetChange();
        });

        $header.on("click", ".showTables", (event) => {
            $(event.currentTarget).blur();
            SQLResultSpace.Instance.showTables(true);
        });

        let selector: string = `#${this._getEditorSpaceEl().attr("id")}`;
        new MenuHelper($header.find(".btn.more"), {
            onOpen: ($dropdown) => {
                this._onDropdownOpen($dropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("unavailable")) {
                    this._fileOption($li.data("action"));
                }
            },
            container: selector,
            bounds: selector,
            fixedPosition: {selector: ".xc-action", float: true}

        }).setupListeners();

        this._setupConnectorDropdown($("#sqlEditorConnectorMenu"), selector);

        $container.find(".close").click(() => {
            this.toggleDisplay(false);
        });

        const $editArea: JQuery = $container.find(".editSection .editArea");
        $editArea.keydown((event) => {
            if (xcHelper.isCMDKey(event) && event.which === keyCode.S) {
                // ctl + s to save
                event.preventDefault();
                event.stopPropagation(); // Stop propagation, otherwise will clear StatusBox.
                this._saveSnippetChange();
            }
        });
    }

    private _onDropdownOpen($dropdown: JQuery): void {
        const $li = $dropdown.find('li[data-action="convertToSQLFuc"]');
        const sqls = this._getSQLs();
        let unavailableTip = null;
        if (!sqls || !sqls.trim()) {
            unavailableTip = SQLTStr.CreateFuncEmptyHint;
        } else if (this._getNumSQLStatements(sqls) > 1) {
            unavailableTip = SQLTStr.CreateFuncMultipHint
        }
        if (unavailableTip == null) {
            $li.removeClass("unavailable");
            xcTooltip.remove($li);
        } else {
            $li.addClass("unavailable");
            xcTooltip.add($li, {
                title: unavailableTip
            });
        }
        const snippetObj: SQLSnippetDurable = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
        const $addToModuleLi = $dropdown.find('li[data-action="addToModule"]');
        if (snippetObj.temp) {
            $addToModuleLi.addClass("unavailable");
            xcTooltip.add($addToModuleLi, {
                title: "Already editing SQL node"
            });
        } else {
            $addToModuleLi.removeClass("unavailable");
            xcTooltip.remove($addToModuleLi);
        }
    }

    private _saveSnippetChange(tempSave: boolean = false): void {
        try {
            const snippet: string = this._sqlEditor.getValue() || "";
            const snippetObj: SQLSnippetDurable = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
            const lastSnippet: string = tempSave ? SQLSnippet.Instance.getSnippetText(snippetObj) : (snippetObj.snippet || "");
            if (snippet !== lastSnippet) {
                this._saveSnippet(this._currentSnippetId, snippet, tempSave);
            }
        } catch (e) {
            console.error("save snippet change failed", e);
        }
    }

    private async _convertToSQLFunc(): Promise<void> {
        if (!SQLSnippet.Instance.hasSnippetWithId(this._currentSnippetId)) {
            return;
        }
        const sql = this._getSQLs();
        const executor: SQLDagExecutor = await this._compileSingleSQL(sql);
        if (executor == null) {
            // error case
            return;
        }
        const {graph, numInput} = executor.convertToSQLFunc();
        const onSubmit = (name) => {
            DagTabManager.Instance.newSQLFunc(name, graph);
            DagViewManager.Instance.getActiveDagView().autoAlign({isNoLog: true});
            // XXX uncomment it if need to expand the sql node
            // DagViewManager.Instance.expandSQLNode(sqlNode.getId());
        };
        SQLFuncSettingModal.Instance.show(onSubmit, () => {}, numInput);
    }

    private _getSchemaFromSQLOpPanel(parsedIdentifiers) {
        const parents = SQLOpPanel.Instance._dagNode.getParents();
        const sourceMapping = SQLOpPanel.Instance.getSourceMapping();
        let panelIdentifiers = new Map();
        sourceMapping.forEach((connector) => {
            if (connector.identifier) {
                panelIdentifiers.set(connector.identifier, connector.source);
            }
        });
        let schemas = {};
        parsedIdentifiers.forEach((parsedIdentifier) => {
            if (!panelIdentifiers.has(parsedIdentifier)) {
                throw(`Specify a corresponding table for '${parsedIdentifier}'`);
            }
            let panelIdentifierIndex = panelIdentifiers.get(parsedIdentifier);
            if (panelIdentifierIndex && parents[panelIdentifierIndex - 1]) {
                let parent = parents[panelIdentifierIndex - 1];
                let columns =  parent.getLineage().getColumns();
                schemas[parsedIdentifier.toUpperCase()] = columns.map((col) => {
                    return {
                        name: col.name,
                        type: col.type
                    }
                });
            }
        });
        return schemas;
    }

    private _addToModule() {
        if (DagTabManager.Instance.getNumTabs() === 0) {
            DagTabManager.Instance.newTab();
        }
        DagPanel.Instance.toggleDisplay(true);
        const dagTab = DagViewManager.Instance.getActiveTab();
        if (dagTab.getType() !== "Normal") {
            if (dagTab instanceof DagTabExecuteOnly) {
                dagTab.viewOnlyAlert()
                .then(() => {
                    this._addSQLNodeToModule();
                });
            } else {
                Alert.error(ErrTStr.Error, "Cannot add SQL node to this type of plan.");
            }
            return;
        } else {
            this._addSQLNodeToModule();
        }
    }

    private async _addSQLNodeToModule() {
        const snippetObj = SQLSnippet.Instance.getSnippetObj(this._currentSnippetId);
        if (snippetObj == null) {
            return;
        }
        const sql = this._getSQLs();

        const input: DagNodeSQLInputStruct = {
            sqlQueryStr: sql,
            identifiers: {},
            dropAsYouGo: true,
            mapping: []
        };
        const identifiersMap = new Map();
        SQLUtil.lockProgress();
        try {
            let sqlStruct =  await SQLUtil.getSQLStruct(sql);
            sqlStruct.identifiers.forEach((identifier, index) => {
                identifiersMap.set(index + 1, identifier);
                input.identifiers[index + 1] = identifier;
                input.mapping.push({
                    identifier: identifier,
                    source: null
                })
            });
            let node: DagNodeSQL = <DagNodeSQL>await DagViewManager.Instance.autoAddNode(DagNodeType.SQL,
                null, null, input, {
                    configured: true,
                    forceAdd: true,
                    autoConnect: true
            });
            node.setIdentifiers(identifiersMap);
        } catch (e) {
            Alert.error(ErrTStr.Error, e);
        }

        SQLUtil.resetProgress();
    }

    private _setupConnectorDropdown($dropdown: JQuery, selector: string): void {
        const $subMenu = $("#sqlEditorSnowflakeSubMenu")
        xcMenu.add($dropdown);
        let $menus =  $dropdown.add($subMenu)
        $menus.on("mouseup", "li", (e) => {
            const $li = $(e.currentTarget);
            if ($li.hasClass('hint') || $li.hasClass("active")) {
                return;
            }
            this._selectConnector($menus, $header.find(".engine .text span"), $li);
        });

        this._renderConnectorDropdown($subMenu);

        const $container = this._getEditorSpaceEl();
        const $header = $container.find("header");

        $header.find(".engine").click((event) => {
            MenuHelper.dropdownOpen($(event.target), $dropdown, {
                mouseCoors: {x: event.pageX, y: event.pageY},
                offsetY: 8,
                floating: true,
                classes: ""
            });
        });
    }

    // XXX @Mingke, please make sure:
    // 1) the type_id is correct
    // 2) the data-act1 `ion part is the correct value, it will be the value passed _changeConnector
    private _renderConnectorDropdown($dropdown: JQuery): void {
        let html = "";
        const targets = DSTargetManager.getAllTargets()
        for (let key in targets) {
            const target = targets[key];
            if (this._connectorTypesSupported.indexOf(target.type_id) !== -1) {
                html += '<li data-action="' + target.params.alias
                        + '">' + target.params.alias + '</li>';
            }
        };
        $dropdown.find("ul").html(html);
    }

    private _selectConnector($menus: JQuery, $textArea, $li: JQuery): void {
        const connector = $li.data("action");
        $textArea.text($li.text());
        $menus.find("li.active").removeClass("active");
        $li.add("active");
        this._changeConnector(connector);
    }

    private _changeConnector(connector: string): void {
        console.log("connector has changed to", connector);
        this._connector = connector;
    }
}

if (typeof window !== undefined) {
    window["SQLEditorSpace"] = SQLEditorSpace;
}