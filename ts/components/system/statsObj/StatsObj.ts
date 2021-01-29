abstract class StatsObj {
    public used: number;
    public total: number;
    public nodes: {node: number, used: number, total: number}[];

    public constructor() {
        this.used = 0;
        this.total = 0;
        this.nodes = [];
    }

    abstract addNodeStats(node: any, nodeIndex: number): void
    abstract updateOverallStats(arg?: any): void
}