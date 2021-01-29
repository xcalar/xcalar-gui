class XcOpGraph {
    public root: XcOpNode;
    public aggregateNameMap;
    public nodeHashMap;
    public aggregates: string[];
    constructor() {
        this.root = null;
        this.aggregateNameMap = {}; // Depends on how the graph looks like (link from agg node to others or not)
        this.nodeHashMap = {};
        this.aggregates = [];
    }
}

if (typeof exports !== "undefined") {
    exports.XcOpGraph = XcOpGraph;
}