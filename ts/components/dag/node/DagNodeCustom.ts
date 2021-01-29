class DagNodeCustom extends DagNode {
    protected _subGraph: DagSubGraph;
    protected _input: DagNodeCustomInput[]; // _input is supposed to have the same length as parents
    protected _output: DagNodeCustomOutput[];
    protected _customName: string = 'Custom';

    public constructor(
        options?: DagNodeCustomInfo, runtime?: DagRuntime
    ) {
        super(options, runtime);

        this.type = DagNodeType.Custom;
        this._subGraph = this.getRuntime().accessible(new DagSubGraph());
        this._input = [];
        this._output = [];
        this.maxParents = 0; // default to 0, will change when adding inputs
        this.minParents = 0; // default to 0, will change when adding inputs
        this.maxChildren = 0; // default to 0, will change when adding outputs
        this.display.icon = "&#xea5f;";

        if (options != null && options.subGraph != null
            && options.inPorts != null && options.outPorts != null
            && options.customName != null
        ) {
            // Deserialize sub graph
            const subGraph = this.getSubGraph();
            const nodeIdMap = subGraph.initFromJSON(options.subGraph);

            // Setup inputs
            for (const connection of options.inPorts) {
                const inputNodeId = nodeIdMap.has(connection.parentId)
                    ? nodeIdMap.get(connection.parentId)
                    : connection.parentId;
                const inputNode: DagNodeCustomInput
                    = <DagNodeCustomInput>subGraph.getNode(inputNodeId);
                if (inputNode != null) {
                    this._setInputPort(inputNode, connection.pos);
                }
            }

            // Setup outputs
            for (const connection of options.outPorts) {
                const outputNodeId = nodeIdMap.has(connection.childId)
                    ? nodeIdMap.get(connection.childId)
                    : connection.childId;
                const outputNode: DagNodeCustomOutput
                    = <DagNodeCustomOutput>this._subGraph.getNode(outputNodeId);
                if (outputNode != null) {
                    this._setOutputPort(outputNode, connection.pos);
                }
            }

            // Setup name
            this.setCustomName(options.customName);
        }

        this._setupSubgraphEvents();
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents",
          "inPorts",
          "outPorts",
          "customName",
          "subGraph"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "items": {
              "$id": "#/properties/parents/items",
              "type": ["string", "null"],
              "pattern": "^(.*)$"
            }
          },
          "inPorts": {
            "$id": "#/properties/inPorts",
            "type": "array",
            "items": {
              "$id": "#/properties/inPorts/items",
              "type": "object",
              "required": [
                "parentId",
                "pos"
              ],
              "properties": {
                "parentId": {
                  "$id": "#/properties/inPorts/items/properties/parentId",
                  "type": "string",
                  "pattern": "^(.*)$"
                },
                "pos": {
                  "$id": "#/properties/inPorts/items/properties/pos",
                  "type": "integer"
                }
              }
            }
          },
          "outPorts": {
            "$id": "#/properties/outPorts",
            "type": "array",
            "items": {
              "$id": "#/properties/outPorts/items",
              "type": "object",
              "required": [
                "childId",
                "pos"
              ],
              "properties": {
                "childId": {
                  "$id": "#/properties/outPorts/items/properties/childId",
                  "type": "string",
                  "pattern": "^(.*)$"
                },
                "pos": {
                  "$id": "#/properties/outPorts/items/properties/pos",
                  "type": "integer"
                }
              }
            }
          },
          "customName": {
            "$id": "#/properties/customName",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "subGraph": {
            "$id": "#/properties/subGraph",
            "type": "object",
            "required": [
              "nodes",
              "comments",
              "display"
            ],
            "properties": {
                "nodes": {
                  "$id": "#/properties/subGraph/properties/nodes",
                  "type": "array",
                  "items": {
                    "$id": "#/properties/subGraph/properties/nodes/items",
                    "type": "object",
                    "required": [
                        "type",
                        "input",
                        "id",
                        "parents",
                        "configured",
                        "display"
                    ],
                    "properties": {
                        "type": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/type",
                        "type": "string",
                        "pattern": "^(.*)$"
                        },
                        "subType": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/subType",
                        "type": ["string", "null"],
                        "pattern": "^(.*)$"
                        },
                        "table": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/table",
                        "type": ["string", "null"],
                        "pattern": "^(.*)$"
                        },
                        "display": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/display",
                        "type": ["object", "null"],
                        "additionalProperties": true,
                        "required": [
                            "x",
                            "y"
                        ],
                        "properties": {
                            "x": {
                            "$id": "#/properties/subGraph/properties/nodes/items/properties/display/properties/x",
                            "type": "integer",
                            "minimum": 0
                            },
                            "y": {
                            "$id": "#/properties/subGraph/properties/nodes/items/properties/display/properties/y",
                            "type": "integer",
                            "minimum": 0
                            }
                        }
                        },
                        "description": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/description",
                        "type": "string",
                        },
                        "title": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/title",
                        "type": "string"
                        },
                        "input": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/input",
                        "type": "object",
                        "additionalProperties": true
                        },
                        "state": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/state",
                        "type": "string",
                        "enum": Object.values(DagNodeState),
                        "pattern": "^(.*)$"
                        },
                        "error": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/error",
                        "type": "string"
                        },
                        "parents": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/parents",
                        "type": "array",
                        "items": {
                            "$id": "#/properties/subGraph/properties/nodes/items/properties/parents/items",
                            "type": ["string", "null"],
                            "pattern": "^(.*)$"
                        }
                        },
                        "nodeId": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/nodeId",
                        "type": "string",
                        "pattern": "^(.*)$"
                        },
                        "id": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/id",
                        "type": "string",
                        "pattern": "^(.*)$"
                        },
                        "configured": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/configured",
                        "type": "boolean",
                        },
                        "aggregates": {
                        "$id": "#/properties/subGraph/properties/nodes/items/properties/aggregates",
                        "type": "array",
                        "items": {
                            "$id": "#/properties/subGraph/properties/nodes/items/properties/aggregates/items",
                            "type": "string",
                            "pattern": "^(.*)$"
                        }
                        }
                    }
                },
                "comments": {
                    "$id": "#/properties/subGraph/properties/comments",
                    "type": "array",
                    "required": [
                        "nodeId",
                        "dimensions",
                        "text"
                    ],
                    "properties": {
                        "nodeId": {
                          "$id": "#/properties/subGraph/properties/comments/properties/nodeId",
                          "type": "string",
                          "pattern": "^(.*)$"
                        },
                        "display": {
                          "$id": "#/properties/subGraph/properties/comments/properties/display",
                          "type": "object",
                          "additionalProperties": true,
                          "required": [
                            "x",
                            "y"
                          ],
                          "properties": {
                            "x": {
                              "$id": "#/properties/subGraph/properties/comments/properties/display/properties/x",
                              "type": "integer",
                              "minimum": 0
                            },
                            "y": {
                              "$id": "#/properties/subGraph/properties/comments/properties/display/properties/y",
                              "type": "integer",
                              "minimum": 0
                            }
                          }
                        },
                        "dimensions": {
                          "$id": "#/properties/subGraph/properties/comments/properties/dimensions",
                          "type": "object",
                          "additionalProperties": true,
                          "required": [
                            "width",
                            "height"
                          ],
                          "properties": {
                            "width": {
                              "$id": "#/properties/subGraph/properties/comments/properties/dimensions/properties/width",
                              "type": "integer",
                              "minimum": 20.0,
                              "maximum": 2000.0
                            },
                            "height": {
                              "$id": "#/properties/subGraph/properties/comments/properties/dimensions/properties/height",
                              "type": "integer",
                              "minimum": 20.0,
                              "maximum": 2000.0
                            }
                          }
                        },
                        "text": {
                          "$id": "#/properties/subGraph/properties/comments/properties/text",
                          "type": "string",
                        }
                    }
                },
                "display": {
                    "$id": "#/properties/subGraph/properties/display",
                    "type": "object",
                    "required": [
                        "width",
                        "height"
                    ],
                    "properties": {
                        "width": {
                        "$id": "#/properties/subGraph/properties/display/properties/width",
                        "type": "integer"
                        },
                        "height": {
                        "$id": "#/properties/subGraph/properties/display/properties/height",
                        "type": "integer"
                        }
                    }
                }
            }
          }
        }
        }
    };

     /**
     * @returns schema with id replaced with nodeId (used for validating copied nodes)
     */
    public static getCopySpecificSchema() {
        let schema = xcHelper.deepCopy(DagNodeCustom.specificSchema);
        const required = schema.properties.subGraph.properties.nodes.items.required;
        required.splice(required.indexOf("id"), 1);
        return schema;
    }

    public static createCustomNode(
        dagNodeInfos,
        connection: DagSubGraphConnectionInfo,
        nodeTitle: string
    ): {
            node: DagNodeCustom,
            connectionIn: NodeConnection[],
            connectionOut: NodeConnection[]
        } {
        const customNode = new DagNodeCustom();
        const nodeIdMap = new Map<DagNodeId, DagNodeId>();

        // Set custom node title
        customNode.setTitle(nodeTitle);

        // Create sub graph
        const dagNodes = dagNodeInfos.map((nodeInfo) => {
            nodeInfo = xcHelper.deepCopy(nodeInfo);
            const newNode = customNode.getSubGraph().newNode(nodeInfo);
            nodeIdMap.set(nodeInfo.nodeId, newNode.getId());
            return newNode;
        });

        const dagMap = new Map<string, DagNode>();
        for (const dagNode of dagNodes) {
            dagMap.set(dagNode.getId(), dagNode);
        }

        // Restore internal connections
        const newInnerConnection = connection.inner.map((connection) => {
            return {
                parentId: nodeIdMap.get(connection.parentId),
                childId: nodeIdMap.get(connection.childId),
                pos: connection.pos
            };
        });
        customNode.getSubGraph().restoreConnections(newInnerConnection);

        // Setup input
        const inputConnection: NodeConnection[] = [];
        for (const connectionInfo of connection.in) {
            const inPortIdx = customNode.addInputNode({
                node: dagMap.get(nodeIdMap.get(connectionInfo.childId)),
                portIdx: connectionInfo.pos
            });
            if (connectionInfo.parentId != null) {
                // parentId could be null, in case the connection has been deleted
                inputConnection.push({
                    parentId: connectionInfo.parentId,
                    childId: customNode.getId(),
                    pos: inPortIdx
                });
            }
        }
        // Assign input ports to input ends. One port per parent.
        for (const inNodeId of connection.endSets.in) {
            const node = dagMap.get(nodeIdMap.get(inNodeId));
            // if multi-parents case, assign one port by default
            const numMaxParents = node.getMaxParents() < 0 ? 1 : node.getMaxParents();
            let pos = node.getNextOpenConnectionIndex();
            while (pos >= 0 && pos < numMaxParents) {
                customNode.addInputNode({
                    node: node,
                    portIdx: pos
                });
                pos = node.getNextOpenConnectionIndex();
            }
        }

        // Setup output
        const outputConnection: NodeConnection[] = [];
        if (connection.out.length > 0) {
            // Output nodes with children outside
            const outConnection = connection.out[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(outConnection.parentId)),
                0 // We dont support multiple output now, so set to zero
            );
            outputConnection.push({
                parentId: customNode.getId(),
                childId: outConnection.childId,
                pos: outConnection.pos
            });
        } else if (connection.endSets.out.size > 0) {
            // Potential output nodes without child
            const nodeId = Array.from(connection.endSets.out)[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(nodeId)),
                0 // We dont support multiple output now, so set to zero
            );
        }

        return {
            node: customNode,
            connectionIn: inputConnection,
            connectionOut: outputConnection
        };
    }

    /**
     * Link an input node(in the sub graph) to a custom node's inPort. Call this method when expanding the input ports.
     * @param inNodePort The node & port to link
     * @param inPortIdx The index of the input port. If not specified, a new inPort will be assigned
     * @returns index of the inPort
     * @description
     * 1. Create a new DagNodeCustomInput node, if it doesn't exist
     * 2. Add the DagNodeCustomInput node to _input list
     * 3. Connect DagNodeCustomInput node to the acutal DagNode in subGraph
     */
    public addInputNode(inNodePort: NodeIOPort, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this._input.length) {
            inPortIdx = this._input.length;
        }

        const subGraph = this.getSubGraph();

        // Create a new input node if it doesn't exist
        const inputNode = this._getInputPort(inPortIdx) || new DagNodeCustomInput();
        this._setInputPort(inputNode, inPortIdx);

        // Link the node in sub graph with input node
        if (inNodePort.node != null) {
            const inputNode = this._input[inPortIdx];
            subGraph.connect(
                inputNode.getId(),
                inNodePort.node.getId(),
                inNodePort.portIdx,
                false, // allowCyclic?
                false // switchState?
            );
        }
        return inPortIdx;
    }

    /**
     * Link an output node(in the sub graph) to a custom node's outPort. Call this method when expanding the output ports.
     * @param outNode The node to link
     * @param outPortIdx The index of the output port. If not specified, a new outPort will be assigned
     * @returns index of the outPort
     * @description
     * 1. Create a new DagNodeCustomOutput node, if it doesn't exist
     * 2. Add the DagNodeCustomOutput node to _output list
     * 3. Connect DagNodeCustomOutput node to the acutal DagNode in subGraph
     */
    public addOutputNode(outNode: DagNode, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this._output.length) {
            outPortIdx = this._output.length;
        }

        // Create a new output node if it doesn't exist
        const outputNode = this._getOutputPort(outPortIdx) || new DagNodeCustomOutput();
        this._setOutputPort(outputNode, outPortIdx);

        // Link the node in sub graph with output node
        if (outNode != null) {
            this.getSubGraph().connect(
                outNode.getId(),
                outputNode.getId(),
                0, // output node has only one parent
                false, // allowCyclic?
                false // switchState?
            );
        }
        return outPortIdx;
    }

    /**
     * Get the list of input nodes
     */
    public getInputNodes(): DagNodeCustomInput[] {
        return this._input;
    }

    /**
     * Get the list of output nodes
     */
    public getOutputNodes(): DagNodeCustomOutput[] {
        return this._output;
    }

    /**
     * Find the index of input port associated to a given input node
     * @param inputNode
     */
    public getInputIndex(inputNode: DagNodeCustomInput): number {
        for (let i = 0; i < this._input.length; i ++) {
            if (this._input[i] === inputNode) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Find the parent node of a input port
     * @param inputNode
     */
    public getInputParent(inputNode: DagNodeCustomInput): DagNode {
        const inPortIdx = this.getInputIndex(inputNode);
        if (inPortIdx < 0) {
            return null;
        }
        const parents = this.getParents();
        if (inPortIdx >= parents.length) {
            return null;
        }
        return parents[inPortIdx];
    }

    /**
     * Get the positions of all the nodes in the sub graph
     */
    public getSubNodePositions(): Coordinate[] {
        const posList: Coordinate[] = [];
        this.getSubGraph().getAllNodes().forEach((node) => {
            posList.push(node.getPosition());
        });
        return posList;
    }

    /**
     * Modify the postion of all the node in sub graph with a certain value
     * @param delta The value to be added to the position
     */
    public changeSubNodePostions(delta: Coordinate): void {
        this.getSubGraph().getAllNodes().forEach((node) => {
            const pos = node.getPosition();
            pos.x += delta.x;
            pos.y += delta.y;
            node.setPosition(pos);
        });
    }

    /**
     * @override
     * @param parentNode
     * @param pos
     */
    public connectToParent(parentNode: DagNode, pos: number = 0): void {
        if (this._getInputPort(pos) == null) {
            throw new Error("No avaliable input port");
        }
        super.connectToParent(parentNode, pos);
    }

    /**
     * @override
     * Get output node's table
     * @returns {Table} return id of the table of output node
     * @description We support only one output for now, so always set portIdx to 0
     */
    // public getTable(portIdx: number = 0): string {
    //     // XXX TODO: Uncomment the following line, when we support multiple outputs
    //     portIdx = 0; // Hardcoded to 0 for now

    //     if (portIdx >= this._output.length) {
    //         console.error('DagNodeCustom.getTable: output out of range');
    //         return null;
    //     }

    //     return this._getOutputPort(portIdx).getTable();
    // }

    /**
     * @override
     * @return {string}
     */
    public getNodeDescription(): string {
        return this.getCustomName();
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return this.getCustomName();
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    public lineageChange(_: ProgCol[]): DagLineageChange {
        const columns = [];
        for (const outputNode of this._output) {
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
            break; // We support only one output for now
        }
        // XXX TODO: Compare parent's columns with the result columns to find out changes
        return {
            columns: columns,
            changes: []
        };
    }

    /**
     * Get the nested sub graph
     */
    public getSubGraph(): DagSubGraph {
        return this._subGraph;
    }

    /**
     * Set the custom operator's name, which will be displayed on UI
     * @param name
     */
    public setCustomName(name: string): void {
        this._customName = name;
    }

    /**
     * Get the custom operator's name, which will be displayed on UI
     */
    public getCustomName(): string {
        return this._customName;
    }

    /**
     * Get the count of input/output ports
     */
    public getNumIOPorts(): { input: number, output: number } {
        return {
            input: this._input.length,
            output: this._output.length
        };
    }

    /**
     * @override
     * Check if the sub graph is configured
     */
    public isConfigured(): boolean {
        for (const node of this.getSubGraph().getAllNodes().values()) {
            if (!node.isConfigured()) {
                return false;
            }
        }
        return true;
    }

    /**
     * @override
     * validates a given input, if no input given, will validate, it's own input
     * @param input
     */
    public validateParam(_input?: any): {error: string} {
        for (const node of this.getSubGraph().getAllNodes().values()) {
            const error = node.validateParam();
            if (error != null) {
                return error;
            }
        }
        return null;
    }

    /**
     * @override
     * Generates JSON representing this node
     * @returns JSON object
     */
    public getNodeInfo(includeStats: boolean): DagNodeCustomInfo {
        const nodeInfo = <DagNodeCustomInfo>super.getNodeInfo(includeStats);
        nodeInfo.subGraph = this._subGraph.getGraphInfo();
        return nodeInfo;
    }

    /**
     * @override
     * Generate JSON representing this node(w/o ids), for use in copying a node
     */
    public getNodeCopyInfo(
        clearState: boolean = false,
        includeStats: boolean = false,
        forCopy: boolean = false
    ): DagNodeCustomInfo {
        const copyInfo = <DagNodeCustomInfo>super.getNodeCopyInfo(clearState, includeStats, forCopy);
        copyInfo.subGraph = this._subGraph.getGraphCopyInfo();
        return copyInfo;
    }

    /**
     * @override
     * Change node to configured state
     * @param isUpdateSubgraph set to false, when triggered by subGraph event
     */
    public beConfiguredState(isUpdateSubgraph: boolean = true): void {
        super.beConfiguredState();
        if (isUpdateSubgraph) {
            const excludeNodeSet: Set<string> = new Set();
            for (const inputNode of this.getInputNodes()) {
                if (inputNode != null) {
                    if (inputNode.isConfigured()) {
                        inputNode.beConfiguredState();
                    }
                    excludeNodeSet.add(inputNode.getId());
                }
            }
            // Update the state of nodes in subGraph
            this.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                if (!excludeNodeSet.has(nodeId)) {
                    node.beConfiguredState();
                }
            });
        }
    }

    /**
     * @override
     */
    public switchState(isUpdateSubgraph: boolean = true): void {
        if (DagTblManager.Instance.isPinned(this.table)) {
            return;
        }
        if (!this.isConfigured()) {
            // it's in unsed state, but it may still has caches of lineage
            this._clearConnectionMeta();
            return;
        }
        let error: {error: string} = this._validateConfiguration();

        if (error != null) {
            // when it's not source node but no parents, it's in error state
            this.beErrorState(error.error);
        } else {
            this.beConfiguredState(isUpdateSubgraph);
        }
    }

    /**
     * @override
     * Change to error state
     * @param error
     * @param isUpdateSubgraph set to false, when triggered by subGraph event
     */
    public beErrorState(error?: string, isUpdateSubgraph: boolean = true): void {
        super.beErrorState(error);
        if (isUpdateSubgraph) {
            this.getInputNodes().forEach((node) => {
                if (this.getInputParent(node) == null) {
                    node.beErrorState(error);
                }
            });
        }
    }

    /**
     * @override
     * Change node to complete state
     */
    public beCompleteState(): void {
        super.beCompleteState();
        for (const inputNode of this.getInputNodes()) {
            if (inputNode != null) {
                inputNode.beCompleteState();
            }
        }
    }

       /**
        * @override
     * attach table to the node
     * @param tableName the name of the table associated with the node
     */
    public setTable(tableName: string, popupEvent: boolean = false) {
        super.setTable(tableName, popupEvent);
        // if we're setting tableName to "" or null, then we should
        // do so for the subGraph nodes as well
        // TODO: we may want to set the actual table for the last node
        // of the subGraph
        if (!tableName) {
            this.getSubGraph().getAllNodes().forEach((node, nodeId) => {
                node.setTable(tableName, popupEvent);
            });
        }
    }

    /**
     * @override
     */
    protected _updateSubGraphProgress(queryNodes: XcalarApiDagNodeT[]): void {
        const subGraph = this.getSubGraph();
        if (!subGraph) {
            return;
        }
        subGraph.updateProgress(queryNodes);
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeCustomInfo {
        const nodeInfo = super._getSerializeInfo(includeStats) as DagNodeCustomInfo;
        // Input ports
        nodeInfo.inPorts = this._input.map((inputNode, portIdx) => {
            return {
                parentId: (inputNode == null ? null : inputNode.getId()),
                pos: portIdx
            }
        });
        // Output port
        nodeInfo.outPorts = this._output.map((outputNode, portIdx) => ({
            childId: (outputNode == null ? null : outputNode.getId()),
            pos: portIdx
        }));
        // name
        nodeInfo.customName = this.getCustomName();

        return nodeInfo;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    private _setInputPort(inputNode: DagNodeCustomInput, inPortIdx?: number): number {
        if (inPortIdx == null || inPortIdx >= this._input.length) {
            inPortIdx = this._input.length;
        }

        if (this._input[inPortIdx] == null) {
            inputNode.setContainer(this);
            this._input[inPortIdx] = inputNode;
            if (!this.getSubGraph().hasNode(inputNode.getId())) {
                this.getSubGraph().addNode(inputNode);
            }
        }

        const inputLen = this._input.length;
        this.maxParents = inputLen;
        this.minParents = inputLen;

        return inPortIdx;
    }

    private _setOutputPort(outputNode: DagNodeCustomOutput, outPortIdx?: number): number {
        if (outPortIdx == null || outPortIdx >= this._output.length) {
            outPortIdx = this._output.length;
        }
        if (this._output[outPortIdx] == null) {
            this._output[outPortIdx] = outputNode;
            if (!this.getSubGraph().hasNode(outputNode.getId())) {
                this.getSubGraph().addNode(outputNode);
            }
        }

        // This is not an export node, because it has output ports
        this.maxChildren = -1;

        return outPortIdx;
    }

    private _getInputPort(inPortIdx): DagNodeCustomInput {
        return this._input[inPortIdx];
    }

    private _getOutputPort(outPortIdx: number): DagNodeCustomOutput {
        return this._output[outPortIdx];
    }

    private _setupSubgraphEvents() {
        // Listen to sub graph changes
        const subGraph = this.getSubGraph();
        subGraph.events.on(DagNodeEvents.SubGraphConfigured, () => {
            if (this.isConfigured()) {
                this.beConfiguredState(false);
            }
        });
        subGraph.events.on(DagNodeEvents.SubGraphError, ({error}) => {
            this.beErrorState(error, false);
        })
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeCustom = DagNodeCustom;
};
