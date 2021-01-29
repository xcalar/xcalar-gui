class DagNodeSplit extends DagNodeMap {

    public constructor(options: DagNodeMapInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Split;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = "&#xe993;"
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeSplit = DagNodeSplit;
};
