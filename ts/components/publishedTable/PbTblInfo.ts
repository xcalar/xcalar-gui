class PbTblInfo {
    public static KVPATH = "/ui/tblMeta/";

    public batchId: number;
    public index: number;
    public keys: string[];
    public columns: ColSchema[];
    public name: string;
    public rows: number;
    public size: number;
    public createTime: number;
    public active: boolean;
    public updates: PublishTableUpdateInfo[];
    public state: PbTblState;
    public errorMsg: string;
    public loadMsg: string;
    public loadApp: LoadApp;
    public dsName: string;
    public txId: number;

    private _cachedSelectResultSet: string;

    public constructor(options) {
        options = options || <any>{};
        this.batchId = options.batchId;
        this.index = options.index;
        this.keys = options.keys || [];
        this.columns = options.columns || [];
        this.name = options.name;
        this.rows = options.rows;
        this.size = options.size;
        this.createTime = options.createTime;
        this.active = options.active;
        this.updates = options.updates || [];
        this.state = options.state;
    }

    /**
     * Restore the table info from backend meta
     * @param table
     */
    public restoreFromMeta(table: PublishTable): void {
        try {
            this.name = table.name;
            this.active = table.active;
            this.rows = table.numRowsTotal;
            this.size = table.sizeTotal;
            this.createTime = table.updates[0] ? table.updates[0].startTS : null;
            this.columns = table.values.map((value) => {
                const type: DfFieldTypeT = <any>DfFieldTypeT[value.type];
                return {
                    name: value.name,
                    type: xcHelper.convertFieldTypeToColType(type)
                }
            });
            this.keys = table.keys.map((key) => key.name);
            this.updates = table.updates;
            let lastUpdate = table.updates[table.updates.length - 1];
            this.batchId = lastUpdate ? lastUpdate.batchId : null;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Get column schema
     */
    public getSchema(): PbTblColSchema[] {
        let columns: PbTblColSchema[] = [];
        try {
            const keySet: Set<string> = new Set();
            this.keys.forEach((key) => {
                keySet.add(key);
            });
            this.columns.forEach((col: ColSchema) => {
                const name: string = col.name;
                if (!PTblManager.InternalColumns.includes(name) &&
                    !PTblManager.LoadColumns.includes(name) &&
                    !name.startsWith(PTblManager.PKPrefix)
                ) {
                    columns.push({
                        name: xcHelper.escapeColName(name),
                        type: col.type,
                        primaryKey: keySet.has(name) ? "Y" : "N"
                    });
                }
            });
        } catch (e) {
            console.error(e);
        }
        return columns;
    }

    /**
     * View select result
     * @param numRows
     */
    public viewResultSet(numRows: number): XDPromise<string> {
        let cachedResult: string = this._cachedSelectResultSet;
        if (cachedResult != null) {
            XIApi.deleteTable(null, cachedResult);
            this._cachedSelectResultSet = undefined;
        }

        return this._selectTable(numRows);
    }

    /**
     * Delete Published Table
     */
    public delete(): XDPromise<void> {
        if (this.state === PbTblState.BeDataset) {
            return this._deleteDataset();
        } else {
            return this._delete();
        }
    }

    /**
     * Activate published table
     */
    public activate(): XDPromise<void> {
        this.state = PbTblState.Activating;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarRestoreTable(this.name)
        .then(() => {
            this.beActivated();
            deferred.resolve();
        })
        .fail((error) => {
            this.state = null;
            deferred.reject(error);
        });
        return deferred.promise();
    }

    public beActivated(): void {
        this.state = null;
        this.active = true;
    }

    public cancel(): XDPromise<void> {
        if (this.state === PbTblState.Activating) {
            return XcalarUnpublishTable(this.name, true);
        } else if (this.loadMsg &&
            this.loadMsg.includes(TblTStr.Importing) &&
            this.txId != null
        ) {
            // when it's creating dataset
            return QueryManager.cancelQuery(this.txId);
        } else {
            return PromiseHelper.reject();
        }
    }

    /**
     * Deactivate published table
     */
    public deactivate(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(this.name, true)
        .then(() => {
            this.beDeactivated();
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public beDeactivated(): void {
        this.state = null;
        this.active = false;
    }

    /**
     * When be dataset state, it means it's a half load table
     * that is still a dataset
     * @param dsName
     */
    public beDatasetState(dsName: string): void {
        this.state = PbTblState.BeDataset;
        this.dsName = dsName;
    }

    public getRowCountStr(): string {
        let rows: string;
        if (this.active && this.rows != null) {
            rows = xcStringHelper.numToStr(this.rows);
            if (this.updates && this.updates.length > 1) {
                rows = "~" + rows;
            }
        } else {
            rows = "N/A";
        }
        return rows;
    }

    public getColCountStr(): string {
        let cols: string;
        if (this.active && this.columns != null) {
            let columns = this.columns.filter((col) => {
                return !PTblManager.InternalColumns.includes(col.name);
            });
            cols = xcStringHelper.numToStr(columns.length);
        } else {
            cols = "N/A";
        }
        return cols;
    }

    public async saveXcalarQuery(query: Array<any>): Promise<void> {
        await this._getKVStore().put(JSON.stringify(query), true);
    }

    public async saveDataflowFromQuery(query: Array<any>, addSchemaToSource: boolean = false): Promise<void> {
        const subGraphInfo = await this._convertQueryToGraph(query, addSchemaToSource);
        const serializedStr: string = JSON.stringify(subGraphInfo);
        await this._getKVStore().put(serializedStr, true);
    }

    public async saveDataflow(resultSetName: string, addSchemaToSource: boolean = false): Promise<void> {
        const dag: {node: any[]} = await XcalarGetDag(resultSetName);
        await this.saveDataflowFromQuery(dag.node, addSchemaToSource);
    }

    private async _convertQueryToGraph(query: Array<any>, addSchemaToSource: boolean = false): Promise<DagGraphInfo> {
        try {
            const convert = new DagQueryConverter({query: query});
            let subGraph: DagSubGraph = convert.convertToSubGraph();
            if (addSchemaToSource) {
                this._addSchemaToSourceNode(subGraph);
            }
            subGraph = await this._normalizeSubgraph(subGraph);
            return subGraph.getSerializableObj();
        } catch(e) {
            console.error('PbTblInfo._convertQueryToGraph error: ', e);
            return null;
        }
    }

    private _addSchemaToSourceNode(graph: DagGraph): void {
        try {
            const nodes = graph.getAllNodes();
            for (let [nodeId, node] of nodes) {
                if (node instanceof DagNodeDataset) {
                    const childNode: DagNode = node.getChildren()[0];
                    if (childNode instanceof DagNodeSynthesize) {
                        const params: DagNodeSynthesizeInputStruct = <DagNodeSynthesizeInputStruct>childNode.getParam();
                        const colInfos = params.colsInfo;
                        const schema: ColSchema[] = colInfos.map((colInfo) => {
                            const dfField = DfFieldTypeT[colInfo.columnType];
                            const columnType: ColumnType = dfField ? xcHelper.convertFieldTypeToColType(dfField) : <ColumnType>colInfo.columnType;
                            return {
                                name: colInfo.sourceColumn,
                                type: columnType
                            };
                        });
                        node.setSchema(schema)
                    }
                    break;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _isRawQuery(query: any): boolean {
        return Array.isArray(query);
    }

    public async getDataflow(): Promise<DagGraphInfo> {
        const query = await this._getKVStore().getAndParse();
        if (this._isRawQuery(query)) {
            // Convert xcalar query to DF2 dataflow
            return await this._convertQueryToGraph(query, true);
        } else {
            // It's already a DF2 dataflow
            return query;
        }
    }

    public async deleteDataflow(): Promise<void> {
        return await this._getKVStore().delete();
    }

    private _getKVStore(): KVStore {
        const key = `${PbTblInfo.KVPATH}${this.name}`;
        return new KVStore(key, gKVScope.GLOB);
    }

    // 1. add link out node to the end
    // 2. replace all DagNodeIMDTable to table's dataflow
    // Example of a special case:
    // Table1 = Dataset1 -> filter1
    // Table2 = Table1 -> filter2 = Dataset1 -> filter1 -> filtet2
    // Table 3 = Table1 -> Join
    //           Table2-/
    // In this case, because all node id doesn't change when source graph is expanded
    // Table3 will looks like this:
    // Table3 = Dataset1 -> filter1 -> filter2-join
    //                             \----------/
    // Aka, Table3 will deduplicate the duplicated nodes
    private async _normalizeSubgraph(subGraph: DagSubGraph): Promise<DagSubGraph> {
        const tableNodeSet: Set<DagNodeIMDTable> = new Set();
        let lastNode: DagNode = null;
        subGraph.getAllNodes().forEach((node) => {
            if (node instanceof DagNodeIMDTable) {
                tableNodeSet.add(node);
            }
            if (node.hasNoChildren()) {
                lastNode = node;
            }
        });

        const promises = [];
        tableNodeSet.forEach((tableNode) => promises.push(this._expandTableNode(subGraph, tableNode)));
        await Promise.all(promises);
        this._addLinkOutNodeToGraph(subGraph, lastNode);
        return subGraph;
    }

    private async _expandTableNode(
        graph: DagSubGraph,
        tableNode: DagNodeIMDTable
    ): Promise<void> {
        const source: string = tableNode.getParam().source;
        const sourcePTblInfo = new PbTblInfo({name: source});
        const sourceGraphInfo: DagGraphInfo = await sourcePTblInfo.getDataflow();
        graph.initFromJSON(sourceGraphInfo);
        // find the end node (link out node) of the source graph
        let lastSourceNodeId: DagNodeId;
        for (let node of sourceGraphInfo.nodes) {
            if (node.type === DagNodeType.DFOut) {
                lastSourceNodeId = node.id;
            }
        }
        const lastSourceNode: DagNode = graph.getNode(lastSourceNodeId);
        // replace tableNode to use the source graph
        const parentNode: DagNode = lastSourceNode.getParents()[0];
        const nextNode: DagNode = tableNode.getChildren()[0];
        let pos: number = nextNode.getParents().findIndex((node) => node === tableNode);
        graph.removeNode(lastSourceNodeId, false);
        graph.removeNode(tableNode.getId(), false);
        graph.connect(parentNode.getId(), nextNode.getId(), pos, true, false);
    }

    private _addLinkOutNodeToGraph(graph: DagGraph, lastNode: DagNode): void {
        const linkOutNode: DagNodeDFOut = <DagNodeDFOut>DagNodeFactory.create({
            type: DagNodeType.DFOut,
            input: {name: "pbTableOut"},
            state: DagNodeState.Configured,
            display: {x: 0, y: 0}
        });

        graph.addNode(linkOutNode);
        graph.connect(lastNode.getId(), linkOutNode.getId(), 0, true, false);
    }

    private _selectTable(limitedRows: number): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const graph: DagGraph = new DagGraph();
        const node: DagNodeIMDTable = <DagNodeIMDTable>DagNodeFactory.create({
            type: DagNodeType.IMDTable
        });
        const tableName: string = this.name;
        graph.addNode(node);
        node.setParam({
            source: tableName,
            version: -1,
            schema: this.columns,
            limitedRows: limitedRows
        });
        graph.execute([node.getId()])
        .then(() => {
            let result = node.getTable();
            this._cachedSelectResultSet = result;
            deferred.resolve(result);
        })
        .fail((error) => {
            if (error && typeof error === "object" && error.hasError) {
                error = error.type;
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _delete(): XDPromise<void> {
        return XcalarUnpublishTable(this.name, false)
                .then(() => {
                    const promise = PromiseHelper.convertToJQuery(this.deleteDataflow());
                    return PromiseHelper.alwaysResolve(promise);
                });
    }

    private _deleteDataset(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let txId = Transaction.start({
            "operation": SQLOps.DestroyPreviewDS,
            "track": true
        });
        XIApi.deleteDataset(txId, this.dsName, true)
        .then(() => {
            Transaction.done(txId, {
                "noCommit": true,
                "noLog": true
            });
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });
            deferred.reject(error);
        });
        return deferred.promise();
    }
}

if (typeof exports !== 'undefined') {
    exports.PbTblInfo = PbTblInfo;
}