class StatsObjNetwork extends StatsObj {
    public constructor() {
        super();
    }
    
    /**
     * @override
     * @param node
     */
    public addNodeStats(
        node: {
            networkSendInBytesPerSec: number,
            networkRecvInBytesPerSec: number
        },
        nodeIndex: number
    ): void {
        let networkUsed = node.networkSendInBytesPerSec;
        let networkTotal = node.networkRecvInBytesPerSec;
        this.used += networkUsed;
        this.total += networkTotal;
        this.nodes.push({
            node: nodeIndex,
            used: networkUsed,
            total: networkTotal
        });
    }

    public updateOverallStats(): void {}
}