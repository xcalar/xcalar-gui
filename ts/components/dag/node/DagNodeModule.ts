interface DagNodeModuleOptions extends DagNodeModuleInfo {
    headNode: DagNodeIn,
    tab: DagTabUser
}

class DagNodeModule extends DagNode {
    public linkIns: Map<DagNodeId, DagNodeDFIn>;
    public linkOuts: Map<DagNodeId, DagNodeDFOut>;
    public headNode: DagNodeIn;
    public tab: DagTabUser;
    private _headNodeId: DagNodeId;
    private _tabId: DagNodeId;
    private _moduleName: string;
    private _fnName: string;

    public constructor(options: DagNodeModuleOptions, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Module;
        this.maxParents = -1;
        this.minParents = 0;
        this.input = this.getRuntime().accessible(new DagNodeModuleInput(options.input));
        this.linkIns = new Map();
        this.linkOuts = new Map();
        this._tabId = options.tabId;
        this._headNodeId = options.headNodeId;
        this._moduleName = options.moduleName;
        this._fnName = options.fnName;
        this.tab = options.tab || <DagTabUser>this._findTab(options.tabId);
        this.headNode = options.headNode || this._findHeadNodeFromTab(this.tab, options.headNodeId);
    }

    public getMaxParents(): number {
        for (let [_nodeId, node] of this.linkIns) {
            if (!node.hasSource()) {
                return -1; // has linking
            }
        }
        return 0; // no linking
    }

    // public lineageChange(columns: ProgCol[]): DagLineageChange {
    public lineageChange(_: ProgCol[]): DagLineageChange {
        let columns = [];
        // TODO: doesn't really handle multiple outputNodes well
        this.getTailNodes().forEach((outputNode) => {
            const lineage = outputNode.getLineage();
            if (lineage != null) {
                for (const col of lineage.getColumns()) {
                    const newCol = ColManager.newPullCol(
                        xcHelper.parsePrefixColName(col.getBackColName()).name,
                        col.getBackColName(),
                        col.getType()
                    );
                    columns.push(newCol);
                }
            }
        });

        // XXX TODO: Compare parent's columns with the result columns to find out changes
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getColumnsUsedInInput(): Set<string> {
        return null;
    }

    /**
     * @override
     */
    protected _genParamHint(withModuleName?: boolean): string {
        let hint: string = "";
        try {
            if (withModuleName) {
                hint = this._getModuleName() + "." + this._getFnName();
            } else {
                hint = this._getFnName();
            }
        } catch (e) {
            console.error(e);
        }
        return hint;
    }

    public getFnName(separate?: boolean): string | {moduleName: string, fnName: string} {
        if (separate) {
            let moduleName = "";
            let fnName = "";
            try {
                moduleName = this._getModuleName();
                fnName = this._getFnName();
            } catch (e) {
                console.error(e);
            }
            return {
                moduleName,
                fnName
            };
        } else {
            return this._genParamHint(true) || "";
        }
    }

    // may not have tab if it was loaded before other tabs
    public getTab(): DagTabUser {
        if (!this.tab) {
            this.tab = <DagTabUser>this._findTab(this._tabId);
        }
        return this.tab;
    }

    public getTabId(): string {
        return this._tabId;
    }

    public getHeadNode(): DagNodeIn {
        const tab = this.getTab();
        if (tab && !this.headNode) {
            this.headNode = this._findHeadNodeFromTab(this.tab, this._headNodeId);
        }
        return this.headNode;
    }


    /*
        XXX BUG only searches descendants of headNode, does not handle the
        case where another source node has many branches and joins up with a descendant
        of the headNode -- those other branches are not counted
    */


    public getTailNodes(): DagNode[] {
        const tailNodes: DagNode[] = [];
        let headNode: DagNodeIn;
        try {
            headNode = this.getHeadNode();
        } catch (e) {
            console.error(e);
        }

        if (!headNode) {
            return tailNodes;
        }

        const seen = new Set();
        traverse(headNode);
        function traverse(node) {
            if (seen.has(node.getId())) {
                return;
            }
            seen.add(node.getId());
            const children =  node.getChildren();
            if (!children.length) {
                tailNodes.push(node);
            } else {
                children.forEach(child => {
                    traverse(child);
                });
            }
        }
        return tailNodes;
    }

    public updateInnerNodeTables() {
        const tab = this.getTab();
        if (!tab) return;
        const graph = tab.getGraph();
        if (!graph) return;

        const linkInNodes = <DagNodeDFIn[]>graph.getNodesByType(DagNodeType.DFIn);
        linkInNodes.forEach((node) => {
            let destTable: string;
            if (node.hasSource()) {
                destTable = node.getSource();
            } else {
                const res = node.getLinkedNodeAndGraph();
                const linkOutNode: DagNodeDFOut = res.node;
                destTable = linkOutNode.getTable();
                if (!destTable && !linkOutNode.shouldLinkAfterExecution()) {
                    // edge case where linkIn node uses a cached
                    // table that's created by another linkIn node
                    destTable = linkOutNode.getStoredQueryDest(tab.getId());
                }
            }
            if (destTable) {
                node.setTable(destTable, true);
                node.beCompleteState();
            }
        });

        const linkOutNodes = <DagNodeDFIn[]>graph.getNodesByType(DagNodeType.DFOut);
        linkOutNodes.forEach((node) => {
            let destTable;
            if (node.getNumParent() === 1) {
                destTable = node.getParents()[0].getTable();
            }
            if (destTable) {
                node.setTable(destTable, true);
                node.updateStepThroughProgress();
                node.beCompleteState();
            }
        })
    }

     /**
     * @override
     */
    protected _getSerializeInfo(includeStats?: boolean): DagNodeModuleInfo {
        const serializedInfo = <DagNodeModuleInfo>super._getSerializeInfo(includeStats);
        serializedInfo.tabId = this._tabId
        serializedInfo.headNodeId = this._headNodeId;
        serializedInfo.moduleName = this._moduleName;
        serializedInfo.fnName = this._fnName;
        return serializedInfo;
    }

    /**
     * For link in with source and link in with execution case to use
     * @override
     */
    public updateStepThroughProgress(): Promise<void> {
        return super._updateProgressFromTable(null, null);
    }


       /**
     * @override
     */
    protected _updateSubGraphProgress(queryNodes: XcalarApiDagNodeT[]): void {
        const tab = this.getTab();
        if (tab) {
            const graph = tab.getGraph();
            if (graph) {
                graph.updateSQLSubGraphProgress(queryNodes);
            }
        }
    }


    private _findTab(dataflowId: string): DagTab {
        const dagTabService = this.getRuntime().getDagTabService();
        if (dataflowId != null && dataflowId != "") {
            return dagTabService.getTabById(dataflowId);
        }
        return null;
    }

    private _findHeadNodeFromTab(dagTab: DagTabUser, nodeId: DagNodeId): DagNodeIn {
        if (dagTab == null) {
            return null;
        }
        const graph = dagTab.getGraph();
        if (graph) {
            return <DagNodeIn>graph.getNode(nodeId);
        }
        return null;
    }

    private _getModuleName(): string {
        const tab = this.getTab();
        if (tab != null) {
            const moduleName = tab.getName() || "";
            this._moduleName = moduleName;
            return moduleName;
        } else {
            return this._moduleName; // use old cache if tab is not open
        }
    }

    private _getFnName(): string {
        const headNode = this.getHeadNode();
        if (headNode != null) {
            const fnName = headNode.getHead() || "";
            this._fnName = fnName;
            return fnName;
        } else {
            return this._fnName; // use old cache if tab is not open
        }
    }
}