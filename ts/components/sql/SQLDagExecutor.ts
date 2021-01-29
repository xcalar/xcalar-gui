class SQLDagExecutor {
    private static _tabs: Map<string, DagTabSQLExecute> = new Map();

    public static getTab(tabId: string): DagTabSQLExecute {
        return SQLDagExecutor._tabs.get(tabId);
    }

    public static setTab(tabId: string, dagTab: DagTabSQLExecute): void {
        SQLDagExecutor._tabs.set(tabId, dagTab);
    }

    public static deleteTab(tabId: string): void {
        SQLDagExecutor._tabs.delete(tabId);
    }

    /**
     * SQLDagExecutor.generateTabName
     */
    public static generateTabName(): string {
        return "SQL " + moment(new Date()).format("YYYY-MM-DD HHmmss");
    }

    private _sql: string;
    private _newSql: string;
    private _sqlNode: DagNodeSQL;
    private _tempTab: DagTabUser;
    private _tempGraph: DagGraph;
    private _identifiers: {};
    private _identifiersOrder: number[];
    private _schema: {};
    private _batchId: {};
    private _sessionTables: Map<string, string>;
    private _status: SQLStatus;
    private _sqlTabCached: boolean;
    private _sqlFunctions: {};
    private _publishName: string;
    private _options: {compileOnly?: boolean, schemas?: {}, sqlStatementName?: string,
    snippetId?: string};
    private _commandType: string;
    private _SFTableList: string[];
    private _SFTableAliasList: string[];
    private _predicateTargets: any;


    public constructor(
        sqlStruct: SQLParserStruct,
        options?: {
            compileOnly?: boolean,
            schemas?: any,
            sqlStatementName?: string,
            snippetId?: string
        }
    ) {

        this._options = options || {compileOnly: false, schemas: {}, sqlStatementName: ""};
        this._sql = sqlStruct.sql.replace(/;+$/, "");
        this._newSql = sqlStruct.newSql ? sqlStruct.newSql.replace(/;+$/, "") :
                                                                     this._sql;
        this._sqlFunctions = sqlStruct.functions;
        this._identifiersOrder = [];
        this._identifiers = {};
        this._schema = {};
        this._batchId = {};
        this._status = SQLStatus.None;
        this._sqlTabCached = false;
        this._publishName = undefined;
        this._sessionTables = new Map();
        this._commandType = sqlStruct.command.type;
        this._SFTableList = [];
        this._SFTableAliasList = [];
        this._predicateTargets = sqlStruct.predicateTargets;

        const tables: string[] = sqlStruct.identifiers || [];
        const identifierMap = sqlStruct.identifierMap;
        const tableMap = PTblManager.Instance.getTableMap();
        tables.forEach((identifier, idx) => {
            let pubTableName = identifier.toUpperCase();
            let connector = "native";
            if(sqlStruct.connector){
                connector = sqlStruct.connector;
            }
            // pub table name can't have backticks. If see backticks, it must be for escaping in SQL
            if (connector === "native") {
                if (pubTableName[0] === "`" && pubTableName[identifier.length - 1] === "`") {
                    pubTableName = pubTableName.slice(1, -1);
                }
                if (tableMap.has(pubTableName)) {
                    const columns = [];
                    tableMap.get(pubTableName).columns.forEach((column) => {
                        if (!xcHelper.isInternalColumn(column.name)) {
                            columns.push(column);
                        }
                    });
                    this._schema[pubTableName] = columns;
                    this._batchId[pubTableName] = tableMap.get(pubTableName).batchId;
                } else {
                    let tableName = identifier;
                    if (sqlStruct.newIdentifiers && sqlStruct.newIdentifiers[tableName]) {
                        tableName = sqlStruct.newIdentifiers[tableName];
                    }
                    if (DagTblManager.Instance.hasTable(tableName) ||
                        (tableName.includes("#") && this._sql.includes("`" + tableName + "`"))) {
                        this._sessionTables.set(identifier.toUpperCase(), tableName);
                    } else if (this._options.schemas && this._options.schemas[identifier.toUpperCase()]) {
                        this._schema[identifier.toUpperCase()] = this._options.schemas[identifier.toUpperCase()];
                    } else if (identifierMap[tableName].target &&
                        identifierMap[tableName].target !== "Xcalar") {
                        // XXX This is a workaround when we only support 1 Snowflake connector
                        this._SFTableList.push(identifierMap[tableName].sourceList[1]);
                        this._SFTableAliasList.push(tableName);
                    } else {
                        throw new Error("Cannot find published table: " + pubTableName);
                    }
                }
                if(!this._SFTableAliasList.includes(pubTableName)){
                    this._identifiersOrder.push(idx + 1);
                    this._identifiers[idx + 1] = pubTableName;
                }
            } else {
                // XXX This is a workaround when we only support 1 Snowflake connector
                this._SFTableList.push(
                    identifierMap[pubTableName].sourceList.length === 0 ?
                    pubTableName : identifierMap[pubTableName].sourceList[1]);
                this._SFTableAliasList.push(pubTableName);
            }
        });

        this._sqlNode = <DagNodeSQL>DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        if (sqlStruct.command.type === "createTable") {
            this._publishName = sqlStruct.command.args[0].trim().toUpperCase();
            if (!xcHelper.checkNamePattern(PatternCategory.PTbl, PatternAction.Check, this._publishName)) {
                throw ErrTStr.InvalidPublishedTableName + ": " + this._publishName;
            }
            this._sqlNode.setSQLQuery({statementType: SQLStatementType.Create});
        }

        if (this._options.compileOnly) { // for table functions
            this._tempGraph = new DagGraph();
            this._tempTab = new DagTabUser({name: "temp"});
            this._tempTab.setGraph(this._tempGraph);
            this._tempGraph.addNode(this._sqlNode);
        } else {
            this._sqlNode.subscribeHistoryUpdate();
            this._appendSQLNodeToDataflow(this._options.sqlStatementName, this._options.snippetId);
        }
    }

    public setSessionTableSchema(tableName: string, tableName2): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XIApi.getTableMeta(tableName)
        .then((ret) => {
            let columns = ret.valueAttrs;
            this._schema[tableName2.toUpperCase()] = columns.map((col) => {
                return {
                    name: col.name,
                    type: xcHelper.convertFieldTypeToColType(col.type)
                }
            });
            this._schema[tableName] = this._schema[tableName2.toUpperCase()];
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public getGraph(): DagGraph {
        return this._tempGraph;
    }

    public getStatus(): SQLStatus {
        return this._status;
    }

    public setStatus(status: SQLStatus): void {
        if (this._status === SQLStatus.Done ||
            this._status === SQLStatus.Failed ||
            this._status === SQLStatus.Cancelled) {
            return;
        }
        if (status === SQLStatus.Cancelled && this._status === SQLStatus.Running) {
            this._tempGraph.cancelExecute();
        }
        this._status = status;
    }

    /**
     * returns nodes expanded from sql node
     */
    public compile(callback): XDPromise<DagNode[]> {
        const deferred: XDDeferred<DagNode[]> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();
        if (!this._options.compileOnly) {
            SQLDagExecutor.setTab(tabId, this._tempTab);
        }

        let finish = () => {
            if (!this._options.compileOnly) {
                SQLDagExecutor.deleteTab(tabId);
            }
            if (this._status === SQLStatus.Done) {
                this._updateStatus(SQLStatus.Done);
            } else if (this._status === SQLStatus.Cancelled) {
                this._updateStatus(SQLStatus.Cancelled);
            } else {
                this._status = SQLStatus.Failed;
                this._updateStatus(SQLStatus.Failed);
            }
            if (typeof callback === "function") {
                callback();
            }
        };

        if (this._status === SQLStatus.Cancelled) {
            finish();
            return PromiseHelper.reject(SQLStatus.Cancelled);
        }

        this._configureSQLNode()
        .then(() => {
            if (this._status === SQLStatus.Cancelled) {
                return PromiseHelper.reject(SQLStatus.Cancelled);
            }
            if (!this._options.compileOnly) {
                SQLDagExecutor.setTab(tabId, this._tempTab);
                DagTabManager.Instance.addTabCache(this._tempTab);
                this._sqlTabCached = true;
                return DagView.expandSQLNodeAndHide(this._sqlNode.getId(), this._tempTab.getId());
            }
        })
        .then(deferred.resolve)
        .fail((e) => {
            this._status = SQLStatus.Failed;
            finish();
            deferred.reject(e);
        })
        return deferred.promise();
    }

    public execute(callback: (outputNode: DagNode, tabId: string, suceed: boolean, options: any) => void): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();
        SQLDagExecutor.setTab(tabId, this._tempTab);
        this._refreshResult(true);

        let succeed: boolean = false;
        let columns: {name: string, backName: string, type: ColumnType}[];
        let finish = () => {
            SQLDagExecutor.deleteTab(tabId);
            const outputNodes: DagNode[] = this._sqlNode.getSubGraphOutputNodes();

            this._tempGraph.removeNode(this._sqlNode.getId(), false, false);
            if (this._status === SQLStatus.Done) {
                this._sqlNode.setSQLQuery({newTableName: this._sqlNode.getNewTableName()});
                this._updateStatus(SQLStatus.Done, undefined, new Date());
            } else if (this._status === SQLStatus.Cancelled) {
                this._updateStatus(SQLStatus.Cancelled, undefined, new Date());
            } else {
                this._status = SQLStatus.Failed;
                this._updateStatus(SQLStatus.Failed, undefined, new Date());
            }
            if (typeof callback === "function") {
                const options = {columns: columns, show: "resultTable"};
                if (this._publishName) {
                    options.show = "tableList";
                }
                callback(outputNodes[0], this._tempTab.getId(), succeed, options);
            }
            if (this._publishName) {
                TblManager.deleteTables([xcHelper.getTableId(this._sqlNode.getNewTableName())],
                                        TableType.Active, true, false);
            }
        };

        if (this._status === SQLStatus.Cancelled ||
            this._status === SQLStatus.Failed
        ) {
            finish();
            return PromiseHelper.reject(this._status);
        }

        this._status = SQLStatus.Running;

        this._tempGraph.execute([this._sqlNode.getId()])
        .then(() => {
            columns = this._sqlNode.getColumns();

            DagTabManager.Instance.removeTabCache(this._tempTab);
            succeed = true;
            if (this._publishName) {
                const newTableName: string = this._sqlNode.getNewTableName();
                let tableCols: ProgCol[] = [];
                columns.forEach((col) => {
                    tableCols.push(ColManager.newPullCol(col.name,
                                         col.backName, col.type));
                });
                return PTblManager.Instance.createTableFromView([], tableCols, newTableName, this._publishName);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            this._status = SQLStatus.Done;
            finish();
            deferred.resolve();
        })
        .fail((err) => {
            const sqlQuery = this._sqlNode.getSQLQuery();
            sqlQuery.errorMsg = sqlQuery.errorMsg || JSON.stringify(err);
            this._sqlNode.setSQLQuery(sqlQuery);
            if (!this._sqlTabCached) {
                DagTabManager.Instance.addTabCache(this._tempTab);
            }
            finish();
            deferred.reject(err);
        });

        return deferred.promise();
    }

   // being used by column menu to create dataflow nodes
    public restoreDataflow(): XDPromise<DagNode[]> {
        const deferred: XDDeferred<DagNode[]> = PromiseHelper.deferred();

        this._configureSQLNode(true)
        .then(() => {
            return DagView.expandSQLNodeAndHide(this._sqlNode.getId(), this._tempTab.getId());
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            this._tempGraph.removeNode(this._sqlNode.getId(), false, false);
        });

        return deferred.promise();
    }

    public getPublishName(): string {
        return this._publishName;
    }

    public convertToSQLFunc(): {
        graph: DagGraph,
        numInput: number,
        sqlNode: DagNodeSQL
    } {
        const clonedGraph: DagGraph = this._tempGraph.clone();
        const sqlNode: DagNodeSQL = <DagNodeSQL>clonedGraph.getNode(this._sqlNode.getId());
        for (let idx of this._identifiersOrder) {
            const tableName = this._identifiers[idx];
            const schema = this._schema[tableName];
            const sqlFuncIn = <DagNodeSQLFuncIn>DagNodeFactory.create({
                type: DagNodeType.SQLFuncIn
            });
            sqlFuncIn.setParam({source: tableName}, true);
            sqlFuncIn.setSchema(schema);
            sqlFuncIn.beConfiguredState();
            sqlFuncIn.setOrder(idx - 1);
            clonedGraph.addNode(sqlFuncIn);
            clonedGraph.connect(sqlFuncIn.getId(), sqlNode.getId(), idx - 1);
        }

        // add out node
        const sqlFuncOut = <DagNodeSQLFuncOut>DagNodeFactory.create({
            type: DagNodeType.SQLFuncOut
        });
        clonedGraph.addNode(sqlFuncOut);
        clonedGraph.connect(sqlNode.getId(), sqlFuncOut.getId());
        sqlFuncOut.beConfiguredState();
        sqlFuncOut.updateSchema();
        return {
            graph: clonedGraph,
            numInput: this._identifiersOrder.length,
            sqlNode
        }
    }

    private _appendSQLNodeToDataflow(sqlStatementName?: string, snippetId?: string): void {
        this._tempTab = DagTabManager.Instance.openAndResetExecuteOnlyTab(new DagTabSQLExecute(sqlStatementName, snippetId));
        this._tempGraph = this._tempTab.getGraph();
        this._sqlNode.hide();
        this._tempGraph.addNode(this._sqlNode);
        DagViewManager.Instance.newComment({
            text: "Original SQL Statement:\n" + this._sql,
            display: {
                x: 200,
                y: 200,
                height: 100,
                width: 220
            }
        }, null, this._tempTab.getId());
    }

    private _configureSQLNode(noStatusUpdate: boolean = false): XDPromise<any> {
        let identifiersArray = [];
        for (let i in this._identifiers) {
            identifiersArray.push({
                key: parseInt(i),
                value: this._identifiers[i]
            });
        }
        identifiersArray.sort((a, b) => {
            return a.key - b.key
        });
        const sourceMapping = [];
        identifiersArray.forEach((identifier, i) => {
            sourceMapping.push({
                "identifier": identifier.value,
                "source": (i + 1)
            });
        });
        this._sqlNode.setParam({
            sqlQueryStr: this._sql,
            identifiers: this._identifiers,
            mapping: sourceMapping,
            dropAsYouGo: null
        }, true);
        const queryId = xcHelper.randName("sqlQuery", 8);
        const identifiers = new Map<number, string>();
        const pubTablesInfo = {};
        this._identifiersOrder.forEach((idx) => {
            const pubTableName = this._identifiers[idx]
            identifiers.set(idx, pubTableName);
            pubTablesInfo[pubTableName] = {
                schema: this._schema[pubTableName.toUpperCase()],
                batchId: this._batchId[pubTableName]
            };
        });
        if (!noStatusUpdate) {
            this._status = SQLStatus.Compiling;
            this._updateStatus(SQLStatus.Compiling, new Date());
        }
        const options = {
            identifiers: identifiers,
            sqlMode: true,
            pubTablesInfo: pubTablesInfo,
            sqlFunctions: this._sqlFunctions,
            noPushToSelect: true ,// XXX hack to prevent pushDown
            sessionTables: this._sessionTables,
            schema: this._schema,
            sourceMapping: sourceMapping,
            SFTables: this._SFTableList,
            SFTableAlias: this._SFTableAliasList,
            commandType: this._commandType,
            predicateTargets: this._predicateTargets
        }
        return this._sqlNode.compileSQL(this._newSql, queryId, options);
    }

    private _updateStatus(
        status: SQLStatus,
        startTime?: Date,
        endTime?: Date
    ): void {
        const queryObj = {
            queryString: this._sql,
            dataflowId: this._tempTab.getId(),
            status: status
        }
        if (startTime) {
            queryObj["startTime"] = startTime;
        }
        if (endTime) {
            queryObj["endTime"] = endTime;
        }
        this._sqlNode.setSQLQuery(queryObj);
        this._sqlNode.updateSQLQueryHistory(true);
    }

    private _refreshResult(loadingState: boolean): void {
        if (typeof TableTabManager !== 'undefined') {
            TableTabManager.Instance.refreshTab(loadingState);
        }
    }
}

if (typeof exports !== "undefined") {
    exports.SQLDagExecutor = SQLDagExecutor;
}