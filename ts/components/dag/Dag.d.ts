type DagNodeId = string;
type CommentNodeId = string;

interface DagNodeDisplayInfo {
    coordinates: Coordinate;
    icon: string;
    description: string;
    isHidden?: boolean;
}

interface DagNodeCopyInfo extends DagNodeInfo {
    nodeId?: string;
}

interface DagLineageChange {
    columns: ProgCol[];
    changes: DagColumnChange[]
}

interface DagColumnChange {
    from: ProgCol,
    to: ProgCol,
    parentIndex?: number,
    hidden?: boolean,
    hiddenCol?: ProgCol
}

interface BackTraceInfo {
    map: Map<DagNodeId, DagNode>,
    startingNodes: DagNodeId[],
    error?: string
}

/* ==== Interfaces related to Export Drivers (Used in export Node) ==== */
interface ExportParam {
    description: string,
    name: string,
    pretty_print: string,
    optional: boolean,
    secret: boolean,
    type: string,
    defArg?: string
}

interface ExportDriver {
    name: string,
    pretty_name?: string,
    description: string
    params: ExportParam[]
}

interface ExportDriverArg {
    name: string,
    type: string,
    optional: boolean,
    value: string | boolean | number
}

/* ==== End of interfaces related to Export Drivers ==== */


/* ==== Interfaces related to DagList and DagTabs ==== */
declare type NodeIOPort = {
    node: DagNode, portIdx: number
}

interface NodeConnection {
    parentId?: DagNodeId,
    childId?: DagNodeId,
    pos: number
}

interface RemovedNodeDetails {
    node: DagNode,
    childIndices: {}
}

interface PublishTable {
    updates: PublishTableUpdateInfo[];
    name: string;
    values: PublishTableCol[],
    oldestBatchId: number,
    active: boolean,
    sizeTotal: number,
    keys: XcalarApiColumnInfoT[],
    indices: XcalarApiIndexInfoT[],
    numRowsTotal: number
}

interface PublishTableUpdateInfo {
    startTS: number;
    batchId: number;
    numRows: number;
    numDeletes: number;
    numInserts: number;
    numUpdates: number;
    source: string;
}

interface PublishTableCol {
    name: string;
    type: string;
}

interface RefreshColInfo {
    sourceColumn: string,
    destColumn: string,
    columnType: string
}


interface DagTblCacheInfo {
    name: string;
    clockCount: number;
    locked: boolean;
    markedForDelete: boolean;
    markedForReset: boolean;
    timestamp: number;
}

interface DagTblManagerPromiseInfo {
    succeed: boolean;
    error: ThriftError;
}

interface CommentInfo {
    id?: string;
    text?: string;
    display?: {x: number, y: number, height?: number, width?: number}
}

interface DagCategoryNodeInfo {
    key: string,
    type: DagCategoryType,
    subType: string,
    node: DagNodeInfo,
    hidden: boolean
}

declare type DagSubGraphConnectionInfo = {
    inner: NodeConnection[],
    in: NodeConnection[],
    out: NodeConnection[],
    openNodes: DagNodeId[],
    endSets: { in: Set<DagNodeId>, out: Set<DagNodeId> },
    dfIOSets: { in: Set<DagNodeId>, out: Set<DagNodeId> },
    noViewOutput: boolean
}

interface TableRunStats {
    state: DgDagStateT,
    startTime: number,
    pct: number,
    numRowsTotal: number,
    numWorkCompleted: number,
    numWorkTotal: number,
    skewValue: number,
    elapsedTime: number,
    size: number,
    rows: number[],
    hasStats: boolean
    name?: string,
    index?: number,
    type?: number
}

interface LogParam {
    title: string,
    options: any
}

declare type NodeMoveInfo = {
    id: DagNodeId | CommentNodeId,
    type: string,
    position: Coordinate,
    oldPosition?: Coordinate
}

declare type SubgraphContainerNode = DagNodeCustom | DagNodeSQL

interface DagRuntimeAccessible {
    getRuntime: () => DagRuntime;
}