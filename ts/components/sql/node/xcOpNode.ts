class XcOpNode {
    public name: string;
    public value: XcOperator;
    public parents: XcOpNode[];
    public children: XcOpNode[];
    public sources: string[];
    public toDrop: string[];
    public replaceWith: XcOpNode;
    public dupOf: XcOpNode;
    public indexOn: string[];
    public colNameMaps: {[key: string]: string}[];
    public projectListCopy: string[];
    public crossCheckMap: {};

    constructor(dest: string, operator: XcOperator, sources: string[]) {
        this.name = dest;
        this.value = operator;
        this.parents = [];
        this.children = [];
        this.sources = sources;
        this.colNameMaps = [{}];
    }
}

if (typeof exports !== "undefined") {
    exports.XcOpNode = XcOpNode;
}