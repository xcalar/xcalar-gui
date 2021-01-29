class DagNodeExplode extends DagNodeMap {

    public constructor(options: DagNodeMapInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Explode;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = '&#xe9d7;';
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeExplode = DagNodeExplode;
}