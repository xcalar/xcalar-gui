// Warning, this class should only be used in the DagGraph.
// To interact with DagNode, use the public API in DagGraph.
abstract class DagNode extends Durable {
    public static readonly KEY: string = "dag";
    private static uid: XcUID;

    private id: DagNodeId;
    private parents: DagNode[];
    private children: DagNode[];
    protected description: string;
    protected title: string;
    protected table: string;
    private state: DagNodeState;
    protected error: string;
    private configured: boolean;
    private numParent: number; // non-persisent
    protected events: {_events: object, trigger: Function}; // non-persistent;
    protected type: DagNodeType;
    protected subType: DagNodeSubType;
    protected lineage: DagLineage; // XXX persist or not TBD
    protected input: DagNodeInput; // will be overwritten by subClasses
    protected columnDeltas: Map<string, any>; // persist
    protected columnOrdering: string[]; // persist
    protected minParents: number; // non-persistent
    protected maxParents: number; // non-persistent
    protected maxChildren: number; // non-persistent
    protected aggregates: string[];
    protected allowAggNode: boolean; // non-persistent
    protected display: DagNodeDisplayInfo; // coordinates are persistent
    protected tag: DagTagInfo[]; // query node tag
    protected runStats: {
        nodes: {[key: string]: TableRunStats},
        hasRun: boolean,
        needsClear: boolean // set to true when the node stats should be cleared
        // on the next stats update. We don't clear stats immediately because
        // we try to retain the old stats for as long as possible
    };
    protected _udfError: MapUDFFailureInfo;
    protected _complementNodeId;

    public static generateId(): string {
        this.uid = this.uid || new XcUID(DagNode.KEY, true);
        return this.uid.gen();
    }

    public constructor(options: DagNodeInfo = <DagNodeInfo>{}, runtime?: DagRuntime) {
        super(options.version);
        if (runtime != null) {
            runtime.accessible(this);
        }
        this.id = options.id || DagNode.generateId();
        this.type = options.type;
        this.subType = options.subType || null;

        this.parents = [];
        this.children = [];

        this.description = options.description || "";
        this.title = options.title || "";
        this.table = options.table;
        this.state = options.state || DagNodeState.Unused;
        if (this.state === DagNodeState.Running) {
            // cannot be running state when create
            this.state = DagNodeState.Configured;
        }
        const coordinates = options.display || {x: -1, y: -1};
        this.display = {coordinates: coordinates, icon: "", description: ""};
        this.input = this.getRuntime().accessible(new DagNodeInput({}));
        this.error = options.error;
        this.aggregates = options.aggregates || [];
        this.display.isHidden = options.isHidden;
        this._udfError = options.udfError;

        this.numParent = 0;
        this.maxParents = 1;
        this.maxChildren = -1;
        this.allowAggNode = false;
        this.lineage = new DagLineage(this);
        this.columnDeltas = new Map();
        this.tag = options.tag || <any>[];
        this._complementNodeId = options.complementNodeId;
        if (options.columnDeltas) { // turn array into map
            options.columnDeltas.forEach((columnDelta) => {
                let modifiedColumnDelta = $.extend({}, columnDelta);
                delete modifiedColumnDelta.name;
                this.columnDeltas.set(columnDelta.name, modifiedColumnDelta);
            });
        }
        this.columnOrdering = options.columnOrdering || [];
        this._setupEvents();

        // const displayType = this.subType || this.type; // XXX temporary
        let nodeTooltip: string = this.subType ? DagNodeTooltip[this.subType] : DagNodeTooltip[this.type];
        this.display.description = nodeTooltip || "";
        this.runStats = {
            hasRun: false,
            nodes: {},
            needsClear: false
        };
        if (options.stats && !$.isEmptyObject(options.stats)) {
            this.runStats.nodes = options.stats;
            this.runStats.hasRun = true;
        }
        this.configured = this.configured || options.configured || false;
        if (this.configured && this.state === DagNodeState.Unused) {
            this.state = DagNodeState.Configured;
        } else if (this.state !== DagNodeState.Unused &&
                this.state !== DagNodeState.Error) {
            this.configured = true;
        }
        if (this.aggregates.length > 0 && options.graph != null &&
                options.graph.getTabId() != null &&
                !DagTabUser.idIsForSQLFolder(options.graph.getTabId())) {
            const namedAggs = this.getRuntime().getDagAggService().getAggMap();
            const self = this;
            let errorAggs = [];
            this.aggregates.forEach((aggregateName: string) => {
                if (!namedAggs[aggregateName]) {
                    errorAggs.push(aggregateName);
                }
            });
            if (errorAggs.length) {
                self.beErrorState(StatusMessageTStr.AggregateNotExist + errorAggs);
            }
        }
    }

    public clone(): DagNode {
        return DagNodeFactory.create(this.getNodeInfo(), this.getRuntime());
    }

    /**
     * Get the columns after apply the node's operation
     * @param columns {ProgCol[]} parent columns
     */
    abstract lineageChange(columns: ProgCol[], replaceParameters?: boolean): DagLineageChange;

    protected abstract _getColumnsUsedInInput(): Set<string>;

    /**
     * add events to the dag node
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public registerEvents(event: DagNodeEvents, callback: Function): DagNode {
        this.events._events[event] = callback;
        return this;
    }

    /**
     * remove an event from the node
     * @param event {string} event name
     */
    public unregisterEvent(event: DagNodeEvents) {
        delete this.events._events[event];
    }

    /**
     *
     * @returns {string} return the id of the dag node
     */
    public getId(): DagNodeId {
        return this.id;
    }

    /**
     * @returns {DagNodeType} node's type
     */
    public getType(): DagNodeType {
        return this.type;
    }

    /**
     * @returns {DagNodeSubType} node's subtype
     */
    public getSubType(): DagNodeSubType {
        return this.subType;
    }

    /**
     *
     * @returns {number} return how many parents the node can have valid values are: 0, 1, 2, -1, where -1 means unlimited parents
     */
    public getMaxParents(): number {
        return this.maxParents;
    }

    /**
     *
     * @returns {number} return the minimum number of parents the node is required to have
     */
    public getMinParents(): number {
        return this.minParents;
    }

    /**
     *
     * @return {number} return how many children the node can have valid values are 0 and -1, where -1 means unlimited children
     */
    public getMaxChildren(): number {
        return this.maxChildren;
    }

    /**
     * @returns {DagNode[]} return all parent nodes
     */
    public getParents(): DagNode[] {
        return this.parents;
    }

    /**
     * @returns {number} current number of connected parent
     */
    public getNumParent(): number {
        return this.numParent;
    }

    /**
     * @returns {DagNode[]} return all child nodes
     */
    public getChildren(): DagNode[] {
        return this.children;
    }

    /**
     * @returns {Coordinate} the position of the node
     */
    public getPosition(): Coordinate {
        return this.display.coordinates;
    }

    /**
     *
     * @param position new position of the node in canvas
     */
    public setPosition(position: Coordinate): void {
        this.display.coordinates.x = position.x;
        this.display.coordinates.y = position.y;
    }

    /**
     * @return {string}
     */
    public getIcon(): string {
        return this.display.icon;
    }

    /**
     * @return {string}
     */
    public getNodeDescription(): string {
        return this.display.description;
    }

    /**
     *
     * @returns {string} return user's description
     */
    public getDescription(): string {
        return this.description;
    }

    /**
     *
     * @param description user description for the node
     */
    public setDescription(description: string, noPopupEvent: boolean = false): void {
        this.description = description;
        if (!noPopupEvent) {
            this.events.trigger(DagNodeEvents.DescriptionChange, {
                id: this.getId(),
                text: this.description
            });
        }
    }

    /**
     * remove description
     */
    public removeDescription(): void {
        delete this.description;
    }

    /**
     * @return {string} get error string
     */
    public getError(): string {
        return this.error
    }

    /**
     *
     * @param title
     */
    public setTitle(title: string, isChange?: boolean): void {
        const oldTitle = this.title;
        this.title = title;
        if (isChange) { // prevents event from firing when title is set when
            // new node is created
            this.events.trigger(DagNodeEvents.TitleChange, {
                id: this.getId(),
                node: this,
                title: title,
                oldTitle: oldTitle
            });
        }
    }

    public getTitle(): string {
        return this.title;
    }

    public getTag(): DagTagInfo[] {
        return this.tag;
    }

    /**
     *
     * @returns {DagNodeState} return the state of the node
     */
    public getState(): DagNodeState {
        return this.state;
    }

    /**
     * switch from configured/complete/error state to other configured/error state
     */
    public switchState(): void {
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
            this.beConfiguredState();
        }
    }

     /**
     * Change node to configured state
     */
    public beConfiguredState(): void {
        this.configured = true;
        this._setState(DagNodeState.Configured);
        this._clearConnectionMeta();
    }

    /**
     * Change node to running state
     */
    public beRunningState(noClear: boolean = false): void {
        this.configured = true;
        this._setState(DagNodeState.Running);
        this._removeTable();
        if (!noClear) {
            this.runStats.needsClear = true;
        }
    }

    /**
     * Change node to complete state
     */
    public beCompleteState(): void {
        this.configured = true;
        this._setState(DagNodeState.Complete);
    }

    /**
     * Change to error state
     */
    public beErrorState(error?: string): void {
        try {
            if (error && this instanceof DagNodeAggregate
                && error.match(ErrWRepTStr.AggConflict.replace('<aggPrefix>"<name>"',".*")) == null
                && error !== StatusTStr[StatusT.StatusDgDagAlreadyExists]) {
                DagAggManager.Instance.removeValue(this.getAggName(), true);
            }
        } catch (e) {
            console.error("Invalid error setting state: ", e);
        }
        this.error = error || this.error;
        this._setState(DagNodeState.Error);
        this._clearConnectionMeta();
    }

    /**
     * Get Param
     */
    public getParam(replaceParameters?: boolean) {
        return this.input.getInput(replaceParameters);
    }

    /**
     * Return a short hint of the param, it should be one line long
     */
    public getParamHint(_inheritHint?: boolean): {hint: string, fullHint: string} {
        let hint: string = "";
        let ellipsis: string[] = [];
        try {
            hint = this._genParamHint();
            const maxLen: number = 20;
            // each line cannot be more than maxLen
            ellipsis = hint.split("\n").map((str) => {
                if (str.length > maxLen) {
                    str = str.substring(0, maxLen) + "...";
                }
                return str;
            });
        } catch (e) {
            console.error(e);
        }
        return {
            hint: ellipsis.join("\n"),
            fullHint: hint
        };
    }

    /**
     * @returns {Table} return id of the table that associated with the node
     */
    public getTable(): string {
        return this.table;
    }

    /**
     * attach table to the node
     * @param tableName the name of the table associated with the node
     */
    public setTable(tableName: string, popupEvent: boolean = false) {
        let oldResult: string = this.table;
        this.table = tableName;
        if (popupEvent) {
            this.events.trigger(DagNodeEvents.ResultSetChange, {
                nodeId: this.getId(),
                oldResult: oldResult,
                result: tableName,
                node: this
            });
        }
    }

    public hasResult(): boolean {
        const table = this.getTable();
        if (this.getState() != DagNodeState.Complete) {
            return false;
        }

        if (this.getType() != DagNodeType.Aggregate) {
            if (table == null || !DagTblManager.Instance.hasTable(table)) {
                return false;
            }
        }
        return true;
    }

    /**
     *
     * @param parentNode parent node to connected to
     * @param pos 0 based, the position where to connect with parentNode
     */
    public connectToParent(
        parentNode: DagNode,
        pos: number = 0,
        spliceIn?: boolean
    ): void {
        if (this.parents[pos] != null && !spliceIn) {
            throw new Error("Pos " + pos + " already has parent")
        } else if (parentNode.getType() === DagNodeType.Aggregate) {
            if (!this.allowAggNode) {
                throw new Error("This node cannot connect with agg node");
            }
        } else {
            const maxParents: number = this.getMaxParents();
            if (!this._canHaveMultiParents() && this._getNonAggParents().length >= maxParents) {
                throw new Error("Node has maximum parents connected");
            }
        }
        if (spliceIn) {
            this.parents.splice(pos, 0, parentNode);
        } else {
            this.parents[pos] = parentNode;
        }

        this.numParent++;
    }

    /**
     *
     * @param childNode child node to connected to
     */
    public connectToChild(childNode: DagNode): void {
        if (this.getMaxChildren() === 0) {
            throw new Error("Node has maximum children connected");
        }

        this.children.push(childNode);
    }

    /**
     *
     * @param pos the index of the parent node that will be disconnected
     * @returns whether the index was spliced
     */
    public disconnectFromParent(parentNode: DagNode, pos: number): boolean {
        if (this.parents[pos] == null) {
            throw new Error("Parent in pos " + pos + " is empty");
        }
        if (this.parents[pos] !== parentNode) {
            throw new Error("Parent in pos " + pos + " is not " + parentNode.getId());
        }

        let spliced = false;
        if (this._canHaveMultiParents()) {
            this.parents.splice(pos, 1);
            spliced = true;
        } else if (this.minParents === 1 && this.maxParents === 1) {
            this.parents.splice(pos, 1);
            // no need to track if only has 1 parent
        } else {
            // We use delete in order to preserve left/right parent for a Join node.
            // The undefined shows up in serialization, but it is not connected to
            // upon deserialization.
            delete this.parents[pos];
        }

        this.numParent--;
        if (this.numParent === 0) {
            this.parents = []; // in case of join where we delete instead of splice
        }
        return spliced;
    }

    /**
     * Disconnect from children, if node connect to the same children more than
     * once (e.g. self-join, union...), remove the first occurred one
     * @param pos the index of the child node that will be disconnected
     */
    public disconnectFromChild(childNode: DagNode): void {
        for (let i = 0; i < this.children.length; i++) {
            if (this.children[i] === childNode) {
                this.children.splice(i, 1);
                return;
            }
        }
        throw new Error("Dag " + childNode.getId() + " is not child of " + this.getId());
    }

    public getIdentifiers(): Map<number, string> {
        return;
    }
    public setIdentifiers(_identifiers: Map<number, string>): void {
        return;
    }

    public getSerializableObj(includeStats?: boolean): DagNodeInfo {
        return this.getNodeInfo(includeStats);
    }

    /**
     * Generates JSON representing this node
     * @returns JSON object
     */
    public getNodeInfo(includeStats?: boolean): DagNodeInfo {
        return this._getNodeInfoWithParents(includeStats);
    }

    /**
     * Generate JSON representing this node, for use in copying a node
     * @param clearState used when copying table to remove table reference
     * and ensure copy does't have a running or complete state
     */
    public getNodeCopyInfo(
        clearState: boolean = false,
        includeStats: boolean = false,
        forCopy: boolean = false
    ): DagNodeCopyInfo {
        const nodeInfo = <DagNodeCopyInfo>this._getNodeInfoWithParents(includeStats, forCopy);
        if (!forCopy) {
            nodeInfo.nodeId = nodeInfo.id;
            delete nodeInfo.id;
        }
        if (clearState) {
            delete nodeInfo.table;
            if (nodeInfo.state === DagNodeState.Complete ||
                nodeInfo.state === DagNodeState.Running
            ) {
                nodeInfo.state = DagNodeState.Configured;
            }
        }
        return nodeInfo;
    }

    /**
     * @returns {boolean} return true if allow connect aggregate node,
     * return false otherwise
     */
    public isAllowAggNode(): boolean {
        return this.allowAggNode;
    }

    /**
     * @returns {boolean} return true if it's a source node (datasets/IMD)
     * return false otherwise
     */
    public isSourceNode(): boolean {
        return this.maxParents === 0;
    }

     /**
     * @returns {boolean} return true if out Node (export/ link out / publishIMD / updateIMD)
     * return false otherwise
     */
    public isOutNode(): boolean {
        return this.maxChildren === 0;
    }

    /**
     * @returns {boolean} return true if has no children
     * return false otherwise
     */
    public hasNoChildren(): boolean {
        return this.children.length === 0;
    }

    /**
     * @return {number} finds the first parent index that is empty
     */
    public getNextOpenConnectionIndex(): number {
        let limit;
        if (this._canHaveMultiParents()) {
            limit = this.parents.length + 1;
        } else {
            limit = this.maxParents;
        }
        for (let i = 0; i < limit; i++) {
            if (this.parents[i] == null) {
                return i;
            }
        }
        return -1;
    }

    /**
     * @returns {DagLineage} return dag lineage information
     */
    public getLineage(): DagLineage {
        return this.lineage;
    }

    public resetLineage(): void {
        this.lineage.reset();
        this.events.trigger(DagNodeEvents.LineageReset, {
            node: this
        });
    }

    public setParam(_param?: any, noAutoExecute?: boolean): boolean | void {
        if ((this.type !== DagNodeType.SQL || this.state !== DagNodeState.Error)
            && !this.input.hasParametersChanges() && this.configured) {
            // when there is no change
            if (!noAutoExecute) { // trigger autoexecute even if no change
                this.confirmSetParam();
            }
            return false;
        }
        this._setParam(noAutoExecute);
        return true;
    }

    protected _setParam(noAutoExecute: boolean): void {
        this.configured = true;
        this.events.trigger(DagNodeEvents.ParamChange, {
            id: this.getId(),
            params: this.getParam(),
            type: this.getType(),
            node: this,
            hasParameters: this.input.hasParameters(),
            noAutoExecute: noAutoExecute
        });
    }

    public hasParameters(): boolean {
        return this.input.hasParameters();
    }

    public getParameters(): any[] {
        return this.input.getParameters();
    }

    public confirmSetParam(): void {
        // this is just to trigger AutoExecute event
        // so auto execution can be triggered
        this.events.trigger(DagNodeEvents.AutoExecute, {
            node: this
        });
    }

    /**
     * @returns {string[]} used aggregates
     */
    public getAggregates(): string[] {
        return this.aggregates;
    }

    /**
     * Triggers an event to update this node's aggregates.
     * Primarily used by Map and Filter Nodes
     * @param aggregates: string[]
     */
    public setAggregates(aggregates: string[]): void {
        let aggSet: Set<string> = new Set();
        let finalAggs: string[] = [];
        for(let i = 0; i < aggregates.length; i++) {
            let agg: string = aggregates[i];
            if (aggSet.has(agg)) {
                continue;
            } else {
                finalAggs.push(agg);
                aggSet.add(agg);
            }
        }
        this.aggregates = finalAggs;
        this.events.trigger(DagNodeEvents.AggregateChange, {
            id: this.getId(),
            aggregates: finalAggs
        });
    }

    public pinTable(): XDPromise<any> {
        if (!DagTblManager.Instance.hasTable(this.table)) {
            return PromiseHelper.reject("Table not found");
        }
        const deferred = PromiseHelper.deferred();

        this.events.trigger(DagNodeEvents.PreTablePin, {
            id: this.getId(),
            lock: true
        });

        DagTblManager.Instance.pinTable(this.table)
        .then(() => {
            this.events.trigger(DagNodeEvents.PostTablePin, {
                id: this.getId()
            });
            deferred.resolve();
        })
        .fail((e) => {
            this.events.trigger(DagNodeEvents.PostTablePin, {
                id: this.getId(),
                error: e || {}
            });
            deferred.reject(e);
        });

        return deferred.promise();
    }

    public unpinTable(): XDPromise<any> {
        if (!DagTblManager.Instance.hasTable(this.table)) {
            return PromiseHelper.reject("Table not found");
        }

        const deferred = PromiseHelper.deferred();

        this.events.trigger(DagNodeEvents.PreTableUnpin, {
            id: this.getId(),
            lock: true
        });

        DagTblManager.Instance.unpinTable(this.table)
        .then(() => {
            this.events.trigger(DagNodeEvents.PostTableUnpin, {
                id: this.getId()
            });
            deferred.resolve();
        })
        .fail((e) => {
            this.events.trigger(DagNodeEvents.PostTableUnpin, {
                id: this.getId(),
                error: e || {}
            });
            deferred.reject(e);
        });

        return deferred.promise();
    }

    /**
     * Get a list of index of the given parent node
     * @param parentNode
     * @returns A list of index(Empty list if the node is not a parent)
     */
    public findParentIndices(parentNode: DagNode): number[] {
        const result: number[] = [];
        const parents = this.getParents();
        for (let i = 0; i < parents.length; i ++) {
            if (parents[i] === parentNode) {
                result.push(i);
            }
        }
        return result;
    }

    public initializeProgress(tableNames: string[]) {
        const nodes: {[key: string]: TableRunStats} = {};
        tableNames.forEach((tableName: string) => {
            const tableRunStats: TableRunStats = {
                startTime: null,
                pct: 0,
                state: DgDagStateT.DgDagStateQueued,
                numRowsTotal: 0,
                numWorkCompleted: 0,
                numWorkTotal: 0,
                skewValue: 0,
                elapsedTime: 0,
                size: 0,
                rows: [],
                hasStats: false
            }
            nodes[tableName] = tableRunStats;
        });
        this.runStats.nodes = nodes;
        this.runStats.needsClear = false;
    }

    /**
     *
     * @param tableInfoMap: map<TableName, XcalarApiDagNodeT>
     * @param includesAllTables in the case of optimized dataflows and other subGraphs(SQL),
     * we know tableNameMap has the progress information for every node/table in the execution
     * but for regular execution, the tableInfoMap may only contain 1 of the operations
     * in a multi-operation node - includesAllTables would be false in this case so that we
     * don't set the node to completed if there are other operations that will occur for that node
     * @param trustIndex use the index provided
     */
    public updateProgress(
        tableInfoMap: Map<string, XcalarApiDagNodeT>,
        includesAllTables?: boolean,
        trustIndex?: boolean
    ): void {
        let triggerEvent = true;
        if (this.getState() === DagNodeState.Complete || this.getState() ===
            DagNodeState.Error) {
            triggerEvent = false;
        }
        const errorStates: Set<DgDagStateT> = new Set([DgDagStateT.DgDagStateUnknown,
                             DgDagStateT.DgDagStateError,
                             DgDagStateT.DgDagStateArchiveError]);
        const incompleteStates: Set<DgDagStateT> = new Set([DgDagStateT.DgDagStateQueued,
                            DgDagStateT.DgDagStateProcessing])
        let isComplete: boolean = true;
        let errorState: DgDagStateTStr = null;
        let error: string = null;
        this.runStats.hasRun = true;
        if (this.state === DagNodeState.Configured) {
            // when restoring dataflow, state might by configured, set to running
            // do this before anything else
            this.beRunningState();
        }
        if (this.runStats.needsClear) {
            this.runStats.nodes = {};
            this.runStats.needsClear = false;
        }

        let tableCount: number = Object.keys(this.runStats.nodes).length;
        const queryNodes: XcalarApiDagNodeT[] = [];
        tableInfoMap.forEach((queryNode, tableName) => {
            queryNodes.push(queryNode);
            let tableRunStats: TableRunStats = this.runStats.nodes[tableName];
            if (!tableRunStats) {
                let index: number;
                if (trustIndex) {
                    index = queryNode["index"];
                } else {
                    index = tableCount;
                }
                tableRunStats = {
                    startTime: null,
                    pct: 0,
                    state: DgDagStateT.DgDagStateQueued,
                    numRowsTotal: 0,
                    numWorkCompleted: 0,
                    numWorkTotal: 0,
                    skewValue: 0,
                    elapsedTime: 0,
                    size: 0,
                    rows: [],
                    index: index,
                    hasStats: true
                };
                this.runStats.nodes[tableName] = tableRunStats;
                tableCount++;
            }

            if (queryNode.state === DgDagStateT.DgDagStateProcessing &&
                tableRunStats.state !== DgDagStateT.DgDagStateProcessing) {
                tableRunStats.startTime = Date.now();
            }
            tableRunStats.name = tableName;
            tableRunStats.type = queryNode.api;
            tableRunStats.state = queryNode.state;
            tableRunStats.hasStats = true;
            if (tableRunStats.index == null) {
                // if tableRunStats already has index, then the one it has
                // is more reliable
                tableRunStats.index = queryNode["index"];
            }

            tableRunStats.numWorkTotal = queryNode.numWorkTotal;
            if (queryNode.state === DgDagStateT.DgDagStateReady) {
                // if node is finished, numWorkCompleted should be equal
                // to numWorkTotal even if backend doesn't return the correct value
                tableRunStats.numWorkCompleted = queryNode.numWorkTotal;
            } else {
                tableRunStats.numWorkCompleted = queryNode.numWorkCompleted;
            }

            tableRunStats.elapsedTime = queryNode.elapsed.milliseconds;
            let progress: number = 0;
            if (queryNode.state === DgDagStateT.DgDagStateProcessing ||
                queryNode.state === DgDagStateT.DgDagStateReady) {
                progress = tableRunStats.numWorkCompleted / tableRunStats.numWorkTotal;
            }
            if (isNaN(progress)) {
                progress = 0;
            }
            // if table has 0 rows, but is completed, progress should be 1
            if (tableRunStats.numWorkTotal === 0 &&
                queryNode.state === DgDagStateT.DgDagStateReady) {
                progress = 1;
            }

            const pct: number = Math.round(100 * progress);
            tableRunStats.pct = pct;
            let rows = queryNode.numRowsPerNode.map(numRows => numRows);
            tableRunStats.skewValue = this._getSkewValue(rows);
            tableRunStats.numRowsTotal = queryNode.numRowsTotal;

            tableRunStats.rows = rows;
            tableRunStats.size = queryNode.inputSize;

            if (errorStates.has(queryNode.state)) {
                errorState = queryNode.state;
                if (queryNode.log) {
                    error = queryNode.log;
                } else if (queryNode.status != null) {
                    error = StatusTStr[queryNode.status];
                }
                isComplete = false;
            } else if (progress !== 1 || incompleteStates.has(queryNode.state)) {
                isComplete = false;
            }
        });

        if (errorState != null) {
            if (this.state !== DagNodeState.Error ||
                this.error !== DgDagStateTStr[errorState]) {
                error = error || DgDagStateTStr[errorState];
                this.beErrorState(error);
                if (this instanceof DagNodeSQL) {
                    this.setSQLQuery({
                        endTime: new Date(),
                        status: SQLStatus.Failed,
                        errorMsg: error
                    });
                }
            }
        } else if (isComplete && includesAllTables &&
                    this.state !== DagNodeState.Complete) {
            this.beCompleteState();
            if (this instanceof DagNodeSQL) {
                this.setSQLQuery({
                    endTime: new Date(),
                    status: SQLStatus.Done,
                    newTableName: this.getNewTableName()
                });
            } else if (this instanceof DagNodePublishIMD) {
                if (!(typeof PTblManager === "undefined")) {
                    let tableName = this.getParam(true).pubTableName;
                    PTblManager.Instance.addTable(tableName);
                }
            }
        }

        this._updateSubGraphProgress(queryNodes);

        if (triggerEvent) {
            this.events.trigger(DagNodeEvents.UpdateProgress, {
                node: this,
                overallStats: this.getOverallStats(),
                nodeStats: this.getIndividualStats()
            });
        }
    }

    protected _updateSubGraphProgress(_queryNodes: XcalarApiDagNodeT[]) {
        // to be overwritten by custom/sql node
    }

    public getOverallStats(formatted?: boolean): {
        pct: number,
        time: number,
        rows: number,
        skewValue: number,
        size: number,
        curStep: number,
        curStepPct: number,
        state: DgDagStateT,
        started?: boolean,
    } {
        let numWorkCompleted: number = 0;
        let numWorkTotal: number = 0;
        let rows = 0;
        let size = 0;
        let skew = 0;
        let tables = [];
        let curStep: number;
        let curStepProgress: number;
        let hasProcessingNode: boolean;
        let totalProgress: number;
        let step: number = 0;
        let stateCounts = {};
        let state: DgDagStateT;
        for (let name in this.runStats.nodes) {
            const node = this.runStats.nodes[name];
            tables.push(node);
        }
        tables.sort((a,b) => {
            if (a.index > b.index) {
                return 1;
            } else {
                return -1;
            }
        });

        tables.forEach((table) => {
            if (!table.name || !table.name.startsWith("deleteObj-")) {
                // this is a delete job which will cause row num to be 0
                step++;
            }
            if (!stateCounts[table.state]) {
                stateCounts[table.state] = 0;
            }
            stateCounts[table.state]++;
            if (table.state === DgDagStateT.DgDagStateProcessing ||
                table.state === DgDagStateT.DgDagStateReady) {
                numWorkCompleted += table.numWorkCompleted;
                numWorkTotal += table.numWorkTotal;
                if (!table.name || !table.name.startsWith("deleteObj-")) {
                    // this is a delete job which will cause row num to be 0
                    rows = table.numRowsTotal;
                }
            }
            if (table.state !== DgDagStateT.DgDagStateReady) {
                if (table.state === DgDagStateT.DgDagStateProcessing ||
                    table.state === DgDagStateT.DgDagStateError) {
                    if (!hasProcessingNode) {
                        hasProcessingNode = true; // prevents queued node from
                        // getting assigned as the processing state
                        curStep = step;
                        if (table.state === DgDagStateT.DgDagStateError) {
                            curStepProgress = 0;
                        } else {
                            curStepProgress = table.numWorkCompleted / table.numWorkTotal;
                        }
                    }
                } else if (!hasProcessingNode && curStep == null) {
                    // queued
                    curStep = step;
                    curStepProgress = 0;
                }
            }
            if (table.skewValue != null && !isNaN(table.skewValue)) {
                skew = Math.max(skew, table.skewValue);
            }
            size = table.size;
        });
        if (stateCounts[DgDagStateT.DgDagStateError] > 0) {
            state = DgDagStateT.DgDagStateError;
        } else if (stateCounts[DgDagStateT.DgDagStateProcessing] > 0 ||
            (stateCounts[DgDagStateT.DgDagStateQueued] > 0 &&
             stateCounts[DgDagStateT.DgDagStateReady] > 0)) {
            state = DgDagStateT.DgDagStateProcessing;
        } else if (tables.length > 0 && tables.length ===
            stateCounts[DgDagStateT.DgDagStateReady]) {
            state = DgDagStateT.DgDagStateReady;
        } else {
            state = DgDagStateT.DgDagStateQueued;
        }

        if (curStep == null) {
            curStep = 1;
            curStepProgress = 0;
        }
        if (isNaN(curStepProgress)) {
            curStepProgress = 1;
        }
        if (state === DgDagStateT.DgDagStateReady) {
            curStep = step;
            curStepProgress = 1;
        }
        curStepProgress = Math.max(0, Math.min(1, curStepProgress));
        const curStepPct: number = Math.round(100 * curStepProgress);

        totalProgress = numWorkCompleted / numWorkTotal;
        if (isNaN(totalProgress)) {
            totalProgress = 0;
        }
        // if table has 0 rows, but is completed, progress should still be 1
        if (state === DgDagStateT.DgDagStateReady) {
            totalProgress = 1;
        }

        const pct: number = Math.round(100 * totalProgress);
        const stats = {
            pct: pct,
            time: this._getElapsedTime(),
            rows: rows,
            skewValue: skew,
            size: size,
            curStep: curStep,
            curStepPct: curStepPct,
            state: state
        };
        if (!formatted) {
            stats["started"] = tables.length > 0 && state !== DgDagStateT.DgDagStateQueued;
        }

        return stats;
    }

    public getIndividualStats(formatted?: boolean): any[] {
        let tables = [];
        for (let name in this.runStats.nodes) {
            const table = this.runStats.nodes[name];
            if (table.hasStats) {
                tables.push(table);
            }
        }
        tables.sort((a,b) => {
            if (a.index > b.index) {
                return 1;
            } else {
                return -1;
            }
        });
        if (formatted) {
            tables = xcHelper.deepCopy(tables);
            tables.forEach((table) => {
                table.state = DgDagStateTStr[table.state];
                table.type = XcalarApisTStr[table.type];
                delete table.startTime;
                delete table.index;
                delete table.hasStats;
            });
        }

        return tables;
    }

    // in case total rows are incorrect when previewing table
    public syncStats(numRows): boolean {
        if (!this.runStats || !this.runStats.nodes) {
            return false;
        }
        let nodesArray = [];
        for (let name in this.runStats.nodes) {
            const node = this.runStats.nodes[name];
            if (node.hasStats) {
                nodesArray.push(node);
            }
        }
        nodesArray.sort((a,b) => {
            if (a.index > b.index) {
                return 1;
            } else {
                return -1;
            }
        });
        let lastNode = nodesArray[nodesArray.length - 1];
        if (lastNode && lastNode.numRowsTotal !== numRows) {
            lastNode.numRowsTotal = numRows;
            return true;
        }
    }

    /**
     * Check if number of parents is unlimited
     */
    public canHaveMultiParents(): boolean {
        return this._canHaveMultiParents();
    }

    /**
     * @returns the text displayed in the center of the node
     */
    public getDisplayNodeType(): string {
        const nodeType: string = this.type;
        let displayNodeType = xcStringHelper.capitalize(nodeType);
        if (this.subType) {
            let nodeSubType: string = this.getSubType() || "";
            nodeSubType = xcStringHelper.capitalize(nodeSubType);
            if (nodeSubType) {
                displayNodeType = nodeSubType;
            }
        }
        return displayNodeType;
    }

    public columnChange(type: DagColumnChangeType, columnNames: string[], info?) {
        if (type === DagColumnChangeType.Reorder) {
            this.columnOrdering = columnNames;
        } else {
            columnNames.forEach((colName, i) => {
                let colInfo = this.columnDeltas.get(colName) || {};
                switch (type) {
                    case (DagColumnChangeType.Hide):
                        if (colInfo.isPulled) {
                            colInfo = {};
                        } else {
                            colInfo.isHidden = true;
                            colInfo.type = info[i].type;
                            // when pulling a column, we currently don't restore
                            // the column width, alignment, or order
                            delete colInfo.widthChange;
                            delete colInfo.textAlign;
                        }
                        let index = this.columnOrdering.indexOf(colName);
                        if (index > -1) {
                            this.columnOrdering.splice(index, 1);
                        }
                        break;
                    case (DagColumnChangeType.Pull):
                        let wasHidden: boolean = colInfo.isHidden;
                        // info is used to restore colInfo when undoing a hide
                        if (info && info[i]) {
                            colInfo = info[i];
                            let order = colInfo.order;
                            delete colInfo.order;
                            // restore order when undoing a hide
                            if (order != null && this.columnOrdering.length &&
                                this.columnOrdering.indexOf(colName) === -1) {
                                this.columnOrdering.splice(order, 0, colName);
                            }
                            if (info[i].type != null) {
                                colInfo.type = info[i].type;
                            }
                        }
                        if (wasHidden) {
                            delete colInfo.isHidden;
                            delete colInfo.type;
                        } else {
                            colInfo.isPulled = true;
                        }
                        break;
                    case (DagColumnChangeType.Resize):
                        colInfo.widthChange = info[i];
                        break;
                    case (DagColumnChangeType.TextAlign):
                        colInfo.textAlign = info.alignment;
                        break;
                    default:
                        break;
                }
                // remove colInfo if empty
                if (Object.keys(colInfo).length) {
                    this.columnDeltas.set(colName, colInfo);
                } else {
                    this.columnDeltas.delete(colName);
                }
            });
        }

        this.events.trigger(DagNodeEvents.LineageChange, {
            node: this,
            columnDeltas: this.columnDeltas,
            columnOrdering: this.columnOrdering
        });
    }

    public getColumnDeltas(): Map<string, any> {
        return this.columnDeltas;
    }

    public getColumnOrdering(): string[] {
        return this.columnOrdering;
    }

    public resetColumnDeltas(): void {
        this.columnDeltas = new Map();
        this.events.trigger(DagNodeEvents.LineageChange, {
            node: this,
            columnDeltas: this.columnDeltas,
            columnOrdering: this.columnOrdering
        });
    }

    public resetColumnOrdering(): void {
        this.columnOrdering = [];
        this.events.trigger(DagNodeEvents.LineageChange, {
            node: this,
            columnDeltas: this.columnDeltas,
            columnOrdering: this.columnOrdering
        });
    }

    public isDeprecated(): boolean {
        return false;
    }

    public static readonly schema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "title": "The Root Schema",
        "additionalProperties": true,
        "required": [
          "type",
          "input",
          "parents",
          "configured",
          "display",
          "id"
        ],
        "properties": {
          "type": {
            "$id": "#/properties/type",
            "type": "string",
            "default": "",
            "pattern": "^(.*)$"
          },
          "subType": {
            "$id": "#/properties/subType",
            "type": ["string", "null"],
            "pattern": "^(.*)$"
          },
          "table": {
            "$id": "#/properties/table",
            "type": ["string", "null"],
            "pattern": "^(.*)$"
          },
          "display": {
            "$id": "#/properties/display",
            "type": ["object", "null"],
            "additionalProperties": true,
            "required": [
              "x",
              "y"
            ],
            "properties": {
              "x": {
                "$id": "#/properties/display/properties/x",
                "type": "integer",
                "minimum": 0
              },
              "y": {
                "$id": "#/properties/display/properties/y",
                "type": "integer",
                "minimum": 0
              }
            }
          },
          "description": {
            "$id": "#/properties/description",
            "type": "string",
          },
          "title": {
            "$id": "#/properties/title",
            "type": "string"
          },
          "input": {
            "$id": "#/properties/input",
            "type": "object",
            "additionalProperties": true
          },
          "state": {
            "$id": "#/properties/state",
            "type": "string",
            "enum": Object.values(DagNodeState),
            "pattern": "^(.*)$"
          },
          "error": {
            "$id": "#/properties/error",
            "type": "string"
          },
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "items": {
              "$id": "#/properties/parents/items",
              "type": ["string", "null"],
              "pattern": "^(.*)$"
            }
          },
           "id": {
            "$id": "#/properties/id",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "nodeId": {
            "$id": "#/properties/nodeId",
            "type": "string",
            "pattern": "^(.*)$"
          },
          "configured": {
            "$id": "#/properties/configured",
            "type": "boolean",
          },
          "aggregates": {
            "$id": "#/properties/aggregates",
            "type": "array",
            "items": {
              "$id": "#/properties/aggregates/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          },
          "columnDeltas": {
            "$id": "#/properties/columnDeltas",
            "type": "array",
            "items": {
                "$id": "#/properties/columnDeltas/items",
                "type": "object",
                "required": [
                    "name"
                ],
                "additionalProperties": true,
                "properties": {
                    "name": {
                      "$id": "#/properties/ColumnDeltas/items/properties/name",
                      "type": "string"
                    },
                    "textAlign": {
                        "$id": "#/properties/ColumnDeltas/items/properties/textAlign",
                        "type": "string",
                        "enum": Object.values(ColTextAlign)
                    },
                    "isHidden": {
                        "$id": "#/properties/ColumnDeltas/items/properties/isHidden",
                        "type": "boolean"
                    },
                    "isPulled": {
                        "$id": "#/properties/ColumnDeltas/items/properties/isPulled",
                        "type": "boolean"
                    },
                    "type": {
                        "$id": "#/properties/ColumnDeltas/items/properties/type",
                        "type": ["string", "null"],
                        "enum": Object.values(ColumnType).concat([null])
                    },
                    "widthChange": {
                        "$id": "#/properties/ColumnDeltas/items/properties/widthChange",
                        "type": "object",
                        "additionalProperties": false,
                        "properties": {
                            "width": {
                                "$id": "#/properties/ColumnDeltas/items/properties/widthChange/properties/width",
                                "type": "integer",
                                "minimum": 15,
                            },
                            "isMinimized": {
                                "$id": "#/properties/ColumnDeltas/items/properties/widthChange/properties/isMinimized",
                                "type": "boolean"
                            },
                            "sizedTo": {
                                "$id": "#/properties/ColumnDeltas/items/properties/widthChange/properties/sizedTo",
                                "type": "string",
                                "enum": Object.values(ColSizeTo)
                            }
                        }
                    }
                }
            }
          },
          "columnOrdering": {
            "$id": "#/properties/columnOrdering",
            "type": "array",
            "items": {
                "$id": "#/properties/columnOrdering/items",
                "type": "string"
            }
          }
        }
    };

    // template
    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [],
        "properties": {}
    };

    /**
     * @returns schema with id replaced with nodeId (used for validating copied nodes)
     */
    public static getCopySchema() {
        let schema = xcHelper.deepCopy(DagNode.schema);
        schema.required.splice(schema.required.indexOf("id"), 1);
        return schema;
    }

    public static parseValidationErrMsg(node: DagNodeInfo, errorObj, isComment?: boolean) {
        let path = errorObj.dataPath;
        if (path[0] === ".") {
            path = path.slice(1);
        }
        if (!path) {
            if (isComment) {
                path = "Comment";
            } else {
                path = "Node";
            }
        }
        let msg = path + " " + errorObj.message;
        switch (errorObj.keyword) {
            case ("enum"):
                msg += ": " + errorObj.params.allowedValues.join(", ");
                break;
            case ("additionalProperties"):
                msg += ": " + errorObj.params.additionalProperty;
                break;
            default:
            // do nothing
        }
        if (node.type) {
            msg = xcStringHelper.capitalize(node.type) + " node: " + msg;
        }
        return msg;
    }

    private _getElapsedTime(): number {
        let cummulativeTime = 0;
        for (let i in this.runStats.nodes) {
            const tableRunStats = this.runStats.nodes[i];
            cummulativeTime += tableRunStats.elapsedTime;
        }
        return cummulativeTime;
    }

    protected _getSkewValue(rows) {
        return xcHelper.calculateSkew(rows);
    }

    protected _clearConnectionMeta(): void {
        if (DagTblManager.Instance.isPinned(this.table)) {
            return;
        }
        this._removeTable();
        this.resetLineage(); // lineage will change
    }

    // Custom dagNodes will have their own serialize/deserialize for
    // Their dagGraphs
    protected _getSerializeInfo(includeStats?: boolean, _forCopy?: boolean): DagNodeInfo {
        const info: DagNodeInfo = {
            version: this.version,
            type: this.type,
            subType: this.subType,
            table: this.table,
            display: xcHelper.deepCopy(this.display.coordinates),
            description: this.description,
            title: this.title,
            input: xcHelper.deepCopy(this.input.getInput()),
            id: this.id,
            state: this.state,
            error: this.error,
            configured: this.configured,
            aggregates: this.aggregates,
            stats: null,
            tag: this.tag,
            isHidden: this.display.isHidden,
            udfError: this._udfError
        };
        if (!_forCopy) {
            info.complementNodeId = this._complementNodeId
        }
        if (includeStats) {
            if (this.runStats.hasRun) {
                info.stats = this.runStats.nodes;
            } else {
                info.stats = {};
            }
        } else {
            delete info.stats;
        }
        if (this.columnDeltas.size > 0) {
            let columnDeltas = [];
            this.columnDeltas.forEach((colInfo, colName) => {
                columnDeltas.push($.extend({name: colName}, colInfo));
            });
            info.columnDeltas = columnDeltas;
        }
        if (this.columnOrdering.length) {
            info.columnOrdering = this.columnOrdering;
        }
        return info;
    }

    protected _genParamHint(): string {
        return "";
    }

    // not used
    protected _getDurable(): string {
        return null;
    }

    // not used
    public serialize(): string {
        return null;
    }

    // validates a given input, if no input given, will validate
    // it's own input
    public validateParam(input?: any): {error: string} {
        return this.input.validate(input);
    }

    private _getNodeInfoWithParents(includeStats?: boolean, forCopy?: boolean): DagNodeInfo {
        const parents: DagNodeId[] = this.parents.map((parent) => parent.getId());
        const seriazliedInfo = this._getSerializeInfo(includeStats, forCopy);
        seriazliedInfo["parents"] = parents;
        return seriazliedInfo;
    }

    private _getNonAggParents(): DagNode[] {
        return this.parents.filter((parent) => parent.getType() !== DagNodeType.Aggregate);
    }

    // set can have multi parents (unlimited), join cannot (limited to 2)
    private _canHaveMultiParents() {
        return this.maxParents === -1;
    }

    protected _setState(state: DagNodeState): void {
        const oldState: DagNodeState = this.state;
        this.state = state;
        if (state !== DagNodeState.Complete &&
            state !== DagNodeState.Running &&
            !(state === DagNodeState.Error && oldState === DagNodeState.Running)) {
            // only keep tableRunStats if state is completed, running, or
            // if it was running but switched to error
            this.runStats.hasRun = false;
            this.runStats.nodes = {};
            this.runStats.needsClear = false;
        }
        this.events.trigger(DagNodeEvents.StateChange, {
            id: this.getId(),
            oldState: oldState,
            state: state,
            node: this
        });
    }

    private _setupEvents(): void {
        this.events = {
            _events: {},
            trigger: (event, ...args) => {
                if (typeof this.events._events[event] === 'function') {
                    this.events._events[event].apply(this, args);
                }
            }
        };
    }

    protected _removeTable(): void {
        this.setUDFError(null);
        if (this.table) {
            let tableName: string = this.table;
            delete this.table;
            this.events.trigger(DagNodeEvents.TableRemove, {
                table: tableName,
                nodeId: this.getId(),
                node: this
            });
        }
    }

    protected _validateConfiguration(): {error: string} {
        try {
            let error: {error: string} = this._validateParents();
            if (error == null) {
                error = this.validateParam();
            }
            if (error == null) {
                error = this._validateLineage();
            }
            return error;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    private _validateParents(): {error: string} {
        const maxParents = this.getMaxParents();
        const numParent = this.getNumParent();
        if (maxParents === -1) {
            const minParents = this.getMinParents();
            if (numParent < minParents) {
                let error: string = "Requires at least " + minParents + " parents";
                return {error: error};
            }
        } else if (numParent !== this.getMaxParents()) {
            let error: string = "Requires " + maxParents + " parents";
            return {error: error};
        }
        return null;
    }

    private _validateLineage(): {error: string} {
        const colMaps: {[key: string]: ProgCol} = {};
        this.getParents().forEach((parentNode) => {
            parentNode.lineage.getColumns(false, true).forEach((progCol) => {
                colMaps[progCol.getBackColName()] = progCol;
            });
        });

        const colNameSet: Set<string> = this._getColumnsUsedInInput();
        const invalidColNames: string[] = [];
        if (colNameSet != null) {
            // there is check of brack validation before this check
            // so here we just check if has <, then it's paramters and skip it
            colNameSet.forEach((colName) => {
                if (colName &&
                    colName != "null" && colName != "FNF" &&
                    !colName.includes("<") &&
                    !colMaps.hasOwnProperty(colName)) {
                    invalidColNames.push(colName);
                }
            });
        }
        if (invalidColNames.length > 0) {
            const error: string = (invalidColNames.length === 1) ?
            DagNodeErrorType.NoColumn : DagNodeErrorType.NoColumns
            return {
                error: error + invalidColNames.join(", ")
            };
        }
        return null;
    }

    public isConfigured(): boolean {
        return this.configured && this.input.isConfigured();
    }

    public applyColumnMapping(_map, _index: number): void {
        if (this.isConfigured()) {
            return;
        }
        this.setParam(null, true);
    }

    // helper function
    protected _getColumnFromEvalArg(arg: object, set: Set<string>) {
        if (arg["args"] != null) {
            arg["args"].forEach((subArg) => {
                if (subArg.type === "fn") {
                    // recusrive check the arg
                    this._getColumnFromEvalArg(subArg, set);
                } else if (subArg.type === "columnArg") {
                    set.add(subArg.value)
                }
            });
        }
    }

    protected _replaceColumnInEvalStr(evalStr: string, columnMap: any): string {
        const parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(evalStr);
        if (parsedEval.error) {
            return evalStr;
        }
        recursiveTraverse(parsedEval);
        return DagNodeInput.stringifyEval(parsedEval);

        function recursiveTraverse(evalStruct) {
            evalStruct.args.forEach((arg: ParsedEvalArg) => {
                if (arg.type === "columnArg") {
                    if (columnMap[arg.value]) {
                        arg.value = columnMap[arg.value];
                    }
                } else if (arg.type === "fn") {
                    recursiveTraverse(arg);
                }
            });
        }
    }

    protected getRuntime(): DagRuntime {
        // In expServer execution, this function is overridden by DagRuntime.accessible() and should never be invoked.
        // In XD execution, this will be invoked in case the DagNode instance
        // is not decorated by DagRuntime.accessible(). Even the decoration happens,
        // the return object will always be DagRuntime._defaultRuntime, which is the same
        // object as we return in this function.
        return DagRuntime.getDefaultRuntime();
    }

    // any concrete node that need to maunally update
    // progess should overwrite it
    public async updateStepThroughProgress(): Promise<void> {
        return Promise.resolve();
    }


    public hide(): void {
        this.display.isHidden = true;
        this.display.coordinates.x = 0;
        this.display.coordinates.y = 0;
        this.events.trigger(DagNodeEvents.Hide, {
            id: this.getId(),
            node: this
        });
    }

    public isHidden(): boolean {
        return this.display.isHidden;
    }

    public hasStats(): boolean {
        return this.runStats.hasRun;
    }

    public hasUDFError(): boolean {
        return this._udfError != null;
    }

    public setUDFError(udfError): void {
        if (this._udfError === udfError) {
            return; // do not trigger event if nothing is changed
        }
        this._udfError = udfError;
        this._cleanUDFError();
        this.events.trigger(DagNodeEvents.UDFErrorChange, {
            node: this
        });
    }

    public getUDFError(): MapUDFFailureInfo {
        return this._udfError;
    }

    public setComplementNodeId(nodeId): void {
        this._complementNodeId = nodeId;
    }

    public getComplementNodeId(): DagNodeId {
        return this._complementNodeId;
    }

    private _cleanUDFError() {
        if (this._udfError && this._udfError.opFailureSummary) {
            let newFailureSummary = [];
            this._udfError.opFailureSummary.forEach((summary) => {
                if (!(summary.failureSummInfo && !summary.failureSummName)) {
                    newFailureSummary.push(summary);
                }
            });
            this._udfError.opFailureSummary = newFailureSummary;
        }
    }

    protected async _updateProgressFromTable(
        apiType: number,
        elapsedTime: number
    ): Promise<void> {
        try {
            if (xcHelper.isNodeJs()) {
                // headless runtime don't update
                return;
            }
            const tableName = this.getTable();
            const res: XcalarApiGetTableMetaOutputT = await XIApi.getTableMeta(tableName);

            this.runStats.hasRun = true;
            this.runStats.nodes = {};
            this.runStats.needsClear = false;

            let numRows = 0;
            let inputSize = 0;
            let rows: number[] = [];
            res.metas.forEach((meta) => {
                numRows += meta.numRows;
                inputSize += meta.size;
                rows.push(meta.numRows);
            });

            let tableRunStats: TableRunStats = {
                startTime: Date.now(),
                pct: 100,
                state: DgDagStateT.DgDagStateReady,
                numRowsTotal: numRows,
                numWorkCompleted: numRows,
                numWorkTotal: numRows,
                skewValue: this._getSkewValue(rows),
                elapsedTime: elapsedTime,
                size: inputSize,
                rows: rows,
                index: 0,
                hasStats: true,
                name: tableName,
                type: apiType
            };
            this.runStats.nodes[tableName] = tableRunStats;

            this.events.trigger(DagNodeEvents.ProgressChange, {
                node: this
            });
        } catch (e) {
            console.error(e);
        }
    }

    static _convertOp(op: string): string {
        if (op && op.length) {
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
        }
        return op;
    }

    /**
     * Creates evalString for groupby aggregate
     * @param aggArg the groupy aggregate argument we want to make the string of.
     */
    static getGroupByAggEvalStr(aggArg: AggColInfo): string {
        let evalStr = null;
        const op: string = this._convertOp(aggArg.operator);
        const colName = aggArg.aggColName;
        // XXX currently don't support Multi-operation in multi-evalgroupBy
        if (op === "stdevp") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName})))`;
        } else if (op === "stdev") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1)))`;
        } else if (op === "varp") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName}))`;
        } else if (op === "var") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1))`;
        } else {
            evalStr = `${op}(${colName})`;
        }
        return evalStr;
    }

    static getAggsFromEvalStrs(evalStrs) {
        const aggs = [];
        for (let i = 0; i < evalStrs.length; i++) {
            const parsedEval = XDParser.XEvalParser.parseEvalStr(evalStrs[i].evalString);
            if (!parsedEval.args) {
                parsedEval.args = [];
            }
            getAggs(parsedEval);
        }
        function getAggs(parsedEval) {
            for (let i = 0; i < parsedEval.args.length; i++) {
                if (parsedEval.args[i].type === "aggValue") {
                    aggs.push(parsedEval.args[i].value);
                } else if (parsedEval.args[i].type === "fn") {
                    getAggs(parsedEval.args[i]);
                }
            }
        }
        return aggs;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNode = DagNode;
};