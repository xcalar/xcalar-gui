class StatsObjSwap extends StatsObj {
    public constructor() {
        super();
    }

    /**
     * @override
     * @param node
     */
    public addNodeStats(
        node: {
            sysSwapUsedInBytes: number,
            sysSwapTotalInBytes: number
        },
        nodeIndex: number
    ): void {
        this.used += node.sysSwapUsedInBytes;
        this.total += node.sysSwapTotalInBytes;
        this.nodes.push({
            node: nodeIndex,
            used: node.sysSwapUsedInBytes,
            total: node.sysSwapTotalInBytes
        });
    }

    public updateOverallStats(): void {}
}