class DagTabSQLFunc extends DagTabUser {
    public static KEY: string = "SQLFunc";
    public static HOMEDIR: string = "Table Functions";

    /**
     * DagTabSQLFunc.generateId
     */
    public static generateId(): string {
        if (this.uid == null || this.uid === DagTab.uid) {
            this.uid = new XcUID(this.KEY);
        }
        return this.uid.gen();
    }

    /**
     * DagTabSQLFunc.listFuncs
     */
    public static listFuncs(): string[] {
        let dagTabs: Map<string, DagTab> = DagList.Instance.getAllDags();
        let funcs: string[] = [];
        dagTabs.forEach((dagTab) => {
            let name: string = dagTab.getName();
            if (dagTab instanceof DagTabSQLFunc) {
                funcs.push(name);
            }
        });
        return funcs;
    }

    /**
     * DagTabSQLFunc.hasFunc
     */
    public static hasFunc(name: string): boolean {
        let dag = DagTabSQLFunc.getFunc(name);
        return (dag != null);
    }

    /**
     * DagTabSQLFunc.getFunc
     */
    public static getFunc(name: string): DagTabSQLFunc {
        name = name.toLowerCase();
        let dagTabs: Map<string, DagTab> = DagList.Instance.getAllDags();
        for (let [id, dagTab] of dagTabs) {
            let dagName: string = dagTab.getName().toLowerCase();
            if (name === dagName && id.startsWith(DagTabSQLFunc.KEY)) {
                return <DagTabSQLFunc>dagTab;
            }
        }

        return null;
    }

    public static async getFuncInputNum(name: string): Promise<number> {
        const dagTab: DagTabSQLFunc = this.getFunc(name);
        if (dagTab == null) {
            return 0;
        }
        if (!dagTab.isLoaded()) {
            await dagTab.load();
        }
        return dagTab.getGraph().getNodesByType(DagNodeType.SQLFuncIn).length;
    }

    /**
     * DagTabSQLFunc.isValidNode
     * @param node
     */
    public static isValidNode(node: DagNode): boolean {
        if (node == null) {
            return false;
        }
        let nodeType = node.getType();
        if (node.getMaxParents() === 0 && nodeType !== DagNodeType.SQLFuncIn) {
            return false;
        }

        if (node.isOutNode()) {
            if (nodeType !== DagNodeType.SQLFuncOut &&
                nodeType !== DagNodeType.Aggregate
            ) {
                return false;
            }
        }

        if (nodeType === DagNodeType.Custom) {
            return false;
        }
        return true;
    }

    /**
     * @override
     * @param name
     * @param id
     */
    protected static _createTab(name: string, id: string): DagTabSQLFunc {
        return new DagTabSQLFunc({
            name: name,
            id: id,
            createdTime: xcTimeHelper.now()
        });
    }

    public constructor(options: DagTabUserOptions) {
        options = options || <DagTabUserOptions>{};
        options.id = options.id || DagTabSQLFunc.generateId();
        super(options);
        this._type = DagTabType.SQLFunc;
    }

    public getPath(): string {
        return "/" + DagTabSQLFunc.HOMEDIR + "/" + this.getName();
    }

    public getQuery(inputs: string[]): XDPromise<{queryStr: string, destTable: string}> {
        const deferred: XDDeferred<{queryStr: string, destTable: string}> = PromiseHelper.deferred();
        this._loadGraph()
        .then(() => {
            let clonedGraph: DagGraph;
            let outNodes: DagNodeSQLFuncOut[];
            [clonedGraph, outNodes] = this._configureQueryInput(inputs);
            if (outNodes.length === 1) {
                return clonedGraph.getQuery(outNodes[0].getId(), false, false);
            } else {
                return PromiseHelper.reject({
                    hasError: true,
                    type: DagNodeErrorType.InvalidSQLFunc
                });
            }
        })
        .then((ret: any) => {
            let {queryStr, destTables} = ret;
            let desTable: string = destTables[destTables.length - 1];
            deferred.resolve({queryStr: queryStr, destTable: desTable});
        })
        .fail((result) => {
            if (result &&
                typeof result === "object" &&
                result.hasError
            ) {
                deferred.reject({
                    error: result.type
                });
            } else {
                deferred.reject(result);
            }
        });

        return deferred.promise();
    }

    public getSchema(): XDPromise<ColSchema[]> {
        const deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        this._loadGraph()
        .then(() => {
            const nodes: DagNodeSQLFuncOut[] = this._getOutputNode();
            let schema: ColSchema[] = [];
            if (nodes.length === 1) {
                // invalid case
                schema = nodes[0].getSchema().map((col: ColSchema) => {
                    col.name = col.name.toUpperCase();
                    return col;
                });
            }
            deferred.resolve(schema);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public addInput(dagNode: DagNodeSQLFuncIn): void {
        if (dagNode == null) {
            return;
        }
        const inputs = this._getInputNodes();
        dagNode.setOrder(inputs.length);
    }

    public removeInput(order: number): DagNodeSQLFuncIn[] {
        if (order == null) {
            return [];
        }

        const inputs = this._getInputNodes();
        let changeNodes: DagNodeSQLFuncIn[] = [];
        for (let i = order; i < inputs.length; i++) {
            if (inputs[i] != null) {
                inputs[i].setOrder(i - 1);
                changeNodes.push(inputs[i]);
            }
        }
        return changeNodes;
    }

    public addBackInput(order: number): DagNodeSQLFuncIn[] {
        if (order == null) {
            return [];
        }

        const inputs = this._getInputNodes();
        let changeNodes: DagNodeSQLFuncIn[] = [];
        for (let i = order; i < inputs.length; i++) {
            if (inputs[i] != null) {
                inputs[i].setOrder(i + 1);
                changeNodes.push(inputs[i]);
            }
        }
        return changeNodes;
    }

    public resetInputOrder(): DagNodeSQLFuncIn[] {
        try {
            let nodes: DagNodeSQLFuncIn[] = <DagNodeSQLFuncIn[]>this.getGraph().getNodesByType(DagNodeType.SQLFuncIn);
            nodes.sort((node1, node2) => {
                return node1.getOrder() - node2.getOrder();
            });
            nodes.forEach((node, i) => {
                node.setOrder(i);
            });
            return nodes;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    /**
     * @override
     */
    public clone(): DagTabSQLFunc {
        const clonedGraph: DagGraph = this.getGraph().clone();
        const clonedTab = new DagTabSQLFunc({
            name: this.getName(),
            dagGraph: clonedGraph,
            createdTime: xcTimeHelper.now()
        });
        return clonedTab;
    }

    /**
     * @override
     */
    protected _getTempName(): string {
        // format is .temp/SQLFunc/randNum/fileName
        const tempName: string = ".temp/" + DagTabSQLFunc.KEY + "/" + xcHelper.randName("rand") + "/" + this.getName();
        return tempName;
    }

    private _loadGraph(): XDPromise<void> {
        if (this._dagGraph == null) {
            return this.load();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _getOutputNode(): DagNodeSQLFuncOut[] {
        let nodes: DagNodeSQLFuncOut[] = [];
        this._dagGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncOut) {
                nodes.push(dagNode);
            }
        });
        return nodes;
    }

    private _getInputNodes(): DagNodeSQLFuncIn[] {
        let nodes: DagNodeSQLFuncIn[] = [];
        this._dagGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncIn) {
                let order = dagNode.getOrder();
                if (order != null) {
                    nodes[order] = dagNode;
                }

            }
        });
        return nodes;
    }

    private _configureQueryInput(input: string[]): [DagGraph, DagNodeSQLFuncOut[]] {
        const clonedGraph: DagGraph = this._dagGraph.clone();
        let outNodes: DagNodeSQLFuncOut[] = [];
        clonedGraph.getAllNodes().forEach((dagNode) => {
            if (dagNode instanceof DagNodeSQLFuncIn) {
                let index: number = dagNode.getOrder();
                let source: string = index == null ? "" : input[index];
                dagNode.setParam({
                    source: source
                }, true);
            } else if (dagNode instanceof DagNodeSQLFuncOut) {
                outNodes.push(dagNode);
            }
        });

        return [clonedGraph, outNodes];
    }
}