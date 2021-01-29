 interface ProfileOptions extends ProfileDurable {
    frontColName: string;
 }

 class ProfileInfo extends Durable {
    public colName: string; // column's name
    public type: string; // column's type
    public aggInfo: ProfileAggDurable; // agg info
    public statsInfo: ProfileStatsDurable; // stats info
    public groupByInfo: ProfileGroupbyDurable; // groupBy info

    private id: string; // uniquely identify the obj
    public frontColName: string; // column's front name
   
    constructor(options: ProfileOptions) {
        options = options || <ProfileOptions>{};
        super(options.version);
      
        this.id = options.id || xcHelper.randName("stats");
        this.colName = options.colName;
        this.frontColName = options.frontColName || null; // placeholder
        this.type = options.type;
        this.aggInfo = xcHelper.deepCopy(options.aggInfo) || <ProfileAggDurable>{};
        this.statsInfo = xcHelper.deepCopy(options.statsInfo) || <ProfileStatsDurable>{};
        this.groupByInfo = xcHelper.deepCopy(options.groupByInfo) || <ProfileGroupbyDurable>{buckets: {}};
    }

    public addBucket(bucketNum: number, options: ProfileBucketDurable): void {
        this.groupByInfo.buckets[bucketNum] = options;
    }

    public getId(): string {
        return this.id;
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }
}