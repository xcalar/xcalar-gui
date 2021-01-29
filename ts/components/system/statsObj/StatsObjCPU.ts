class StatsObjCPU extends StatsObj {
    public constructor() {
        super();
    }

    /**
     * @override
     * @param node
     */
    public addNodeStats(
        node: {
            cpuUsageInPercent: number,
        },
        nodeIndex: number
    ): void {
        let usrCpuPct: number = node.cpuUsageInPercent;
        this.used += usrCpuPct;
        this.total += 100;
        this.nodes.push({
            node: nodeIndex,
            used: Math.round(usrCpuPct * 100) / 100,
            total: 100
        });
    }

    public updateOverallStats(numNodes: number): void {
        this.used /= numNodes;
        this.total /= numNodes;
    }
}