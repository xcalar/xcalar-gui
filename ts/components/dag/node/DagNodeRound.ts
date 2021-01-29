class DagNodeRound extends DagNodeMap {

    public constructor(options: DagNodeMapInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Round;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = "&#xe943;"
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeRound = DagNodeRound;
};
