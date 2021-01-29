class StatsObjMem extends StatsObj {
    public nodes: {node: number, used: number, total: number, xdbUsed: number, xdbTotal: number}[];

    public datasetUsage: number;
    public xdbUsed: number;
    public xdbTotal: number;
    public memUsedInBytes: number;
    public sysMemUsed: number;
    public pubTableUsage: number;

    public userTableUsage: number;
    public otherTableUsage: number;
    public xdbFree: number;
    public nonXdb: number;
    public sysMemFree: number;

    public constructor() {
        super();
        this.datasetUsage = 0;
        this.xdbUsed = 0;
        this.xdbTotal = 0;
        this.memUsedInBytes = 0;
        this.sysMemUsed = 0;
        this.pubTableUsage = 0;

        this.userTableUsage = 0;
        this.otherTableUsage = 0;
    }

    /**
     * Formula #0: totalAvailableMemInBytes = xdbUsed + sysMemUsedInBytes + sysMemFree
     * Formula #1: xdbTotal (highest xcalar can use) = xdbUsedBytes + xdb free
     * Formula #2: memUsedInBytes = xdbUsed + sysMemUsedInBytes
     * Formula #3: xdbUsedBytes = 4 other categories on the chart
     * @override
     * @param node
     * @param nodeIndex
     */
    public addNodeStats(
        node: {
            memUsedInBytes: number,
            sysMemUsedInBytes: number,
            datasetUsedBytes: number,
            publishedTableUsedBytes: number,
            xdbUsedBytes: number,
            xdbTotalBytes: number,
            totalAvailableMemInBytes: number
        },
        nodeIndex: number
    ): void {
        this.memUsedInBytes += node.memUsedInBytes;
        this.sysMemUsed += node.sysMemUsedInBytes;
        this.datasetUsage += node.datasetUsedBytes;
        this.pubTableUsage += node.publishedTableUsedBytes;
        this.xdbUsed += node.xdbUsedBytes;
        this.xdbTotal += node.xdbTotalBytes;
        this.used += node.xdbUsedBytes;
        this.total += node.totalAvailableMemInBytes;

        this.nodes.push({
            node: nodeIndex,
            xdbUsed: node.xdbUsedBytes,
            xdbTotal: node.xdbTotalBytes,
            used: node.xdbUsedBytes,
            total: node.totalAvailableMemInBytes
        });
    }

    public updateOverallStats(tableUsage: number): void {
        this.userTableUsage = tableUsage;
        this._updateOtherTableUsage();
        this._updateXDBFree();
        this._updateNoneXDB();
        this._updateSysMemFree();
    }

    private _updateOtherTableUsage(): void {
        this.otherTableUsage = Math.max(0, this.xdbUsed - this.userTableUsage -
                                    this.datasetUsage - this.pubTableUsage);
    }

    private _updateXDBFree(): void {
        this.xdbFree = this.xdbTotal - this.xdbUsed;
    }

    private _updateNoneXDB(): void {
        this.nonXdb = this.total - this.xdbTotal;
    }

    private _updateSysMemFree(): void {
        this.sysMemFree = Math.max(0, this.total - this.memUsedInBytes);
    }
}