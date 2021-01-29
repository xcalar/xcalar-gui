class DagNodeDFIn extends DagNodeIn {
    public static readonly SELF_ID: string = "self";

    protected input: DagNodeDFInInput;
    protected _graph: DagGraph; // non-persistent

    public constructor(options: DagNodeDFInInfo, runtime?: DagRuntime) {
        super(<DagNodeInInfo>options, runtime);
        this.type = DagNodeType.DFIn;
        this.display.icon = "&#xe952;"; // XXX TODO: UI design
        this.input = this.getRuntime().accessible(new DagNodeDFInInput(options.input));
        this._graph = options.graph == null ? null : this.getRuntime().accessible(options.graph);
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 0,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    public setParam(input: DagNodeDFInInputStruct = <DagNodeDFInInputStruct>{}, noAutoExecute?: boolean): void {
        let dataflowId: string = input.dataflowId;
        if (this._graph && dataflowId === this._graph.getTabId()) {
            dataflowId = DagNodeDFIn.SELF_ID;
        }
        this.input.setInput({
            dataflowId: dataflowId || "",
            linkOutName: input.linkOutName,
            source: input.source || ""
        });
        super.setParam(null, noAutoExecute);
    }

    public getLinkedTabId(): string {
        const param: DagNodeDFInInputStruct = this.input.getInput(true);
        return param.dataflowId;
    }

    public hasAcceessToLinkedGraph(): boolean {
        const tabId = this.getLinkedTabId();
        if (tabId === DagNodeDFIn.SELF_ID) {
            return true;
        }
        const candidateGraphs: DagGraph[] = this._findLinkedGraph(tabId);
        if (candidateGraphs.length === 0) {
            return false;
        } else {
            return true;
        }
    }

    public getLinkedNodeAndGraph(skipSelfSearch?: boolean): {graph: DagGraph, node: DagNodeDFOut} {
        const param: DagNodeDFInInputStruct = this.input.getInput(true);
        const linkOutName: string = param.linkOutName;
        let dataflowId: string = param.dataflowId;
        if (skipSelfSearch && dataflowId === DagNodeDFIn.SELF_ID) {
            dataflowId = this._graph.getTabId();
        }
        const candidateGraphs: DagGraph[] = this._findLinkedGraph(dataflowId);
        if (candidateGraphs.length === 0) {
            throw new Error(DagNodeLinkInErrorType.NoGraph);
        }
        let dfOutNodes: DagNode[] = [];
        let resGraph: DagGraph = null;
        candidateGraphs.forEach((dagGraph) => {
            const resNodes = this._findLinkedOutNodeInGraph(dagGraph, linkOutName);
            if (resNodes.length > 0) {
                resGraph = dagGraph;
            }
            dfOutNodes = dfOutNodes.concat(resNodes);
        });
        if (dfOutNodes.length === 0) {
            throw new Error(DagNodeLinkInErrorType.NoLinkInGraph);
        }
        if (dfOutNodes.length > 1) {
            throw new Error(DagNodeLinkInErrorType.MoreLinkGraph);
        }
        return {
            graph: resGraph,
            node: <DagNodeDFOut>dfOutNodes[0]
        };
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const columns: ProgCol[] = this.getSchema().map((col) => {
            const fontName: string = xcHelper.parsePrefixColName(col.name).name;
            return ColManager.newPullCol(fontName, col.name, col.type);
        });

        let hiddenColumns = this.lineage.getHiddenColumns();
        let allCols = [];
        columns.forEach((col) => {
            if (!hiddenColumns.has(col.getBackColName())) {
                allCols.push(col);
            }
        })
        return {
            columns: allCols,
            changes: []
        };
    }

    public isLinkingError(): boolean {
        const error: string = this.getError();
        for (let key in DagNodeLinkInErrorType) {
            if (error === DagNodeLinkInErrorType[key]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Function Input";
    }

    public getSource(): string {
        const input: DagNodeDFInInputStruct = this.getParam(true);
        return input.source;
    }

    public setSource(source: string): void {
        const input: DagNodeDFInInputStruct = this.getParam();
        input.source = source;
        this.setParam(input);
    }

    public hasSource(): boolean  {
        const input: DagNodeDFInInputStruct = this.getParam();
        return (input.source != "" && input.source != null);
    }

    public getGraph(): DagGraph {
        return this._graph;
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
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeDFInInputStruct = this.getParam();
        if (input.source) {
            hint = `Ref result: ${input.source}`;
        } else if (input.linkOutName) {
            hint = `Ref: ${input.linkOutName}`;
        }
        return hint;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    /* @override */
    protected _validateConfiguration(): {error: string} {
        const error = super._validateConfiguration();
        if (error != null) {
            return error;
        }

        if (this.hasSource()) {
            // skip error check when has source
            return null;
        }

        try {
            this.getLinkedNodeAndGraph();
        } catch (e) {
            return {error: e.message};
        }
    }

    private _findLinkedGraph(dataflowId: string): DagGraph[] {
        const dagTabService = this.getRuntime().getDagTabService();
        let candidateTabs: DagTab[] = [];
        const candidateGraphs: DagGraph[] = [];
        if (dataflowId === DagNodeDFIn.SELF_ID) {
            return this._graph ? [this._graph] : [];
        } else if (dataflowId != null && dataflowId != "") {
            candidateTabs = [dagTabService.getTabById(dataflowId)];
        } else {
            candidateTabs = dagTabService.getActiveUserTabs();
        }
        candidateTabs.forEach((dagTab) => {
            if (dagTab != null) {
                const graph: DagGraph = dagTab.getGraph();
                if (graph != null) {
                    candidateGraphs.push(graph);
                }
            }
        });
        return candidateGraphs;
    }

    private _findLinkedOutNodeInGraph(graph: DagGraph, linkOutName: string): DagNode[] {
        if (graph == null) {
            throw new Error(DagNodeErrorType.NoGraph);
        }
        const dfOutNodes: DagNode[] = graph.filterNode((node) => {
            if (node.getType() === DagNodeType.DFOut) {
                const dfOutNode = <DagNodeDFOut>node;
                if (dfOutNode.getParam().name === linkOutName) {
                    return true;
                }
            } else {
                return false;
            }
        });
        return dfOutNodes;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeDFIn = DagNodeDFIn;
};
