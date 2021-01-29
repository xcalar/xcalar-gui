class SharedDSInfo extends Durable {
    private DS: DSDurable; // datasets meta
    private VersionId: number; // number to represent ds meta's version
    
    constructor(options: SharedDSInfoDurable) {
        options = options || <SharedDSInfoDurable>{};
        super(options.version);
        this.DS = options.DS || <DSDurable>{};
        this.VersionId = options.VersionId || 0;
    }

    public getDSInfo(): DSDurable {
        return this.DS;
    }

    public updateDSInfo(sharedDS: DSDurable) {
        this.DS = sharedDS;
    }

    public getVersionId(): number {
        return this.VersionId;
    }

    public setVersionId(id: number): void {
        if (typeof(id) !== "number" ||
            !Number.isInteger(id) ||
            id <= this.VersionId
        ) {
            console.error("error in set version id");
        } else {
            this.VersionId = id;
        }
    }

    public updateVersionId(): number {
        this.VersionId++;
        return this.VersionId;
    }

    public serialize(): string {
        let json = this._getDurable();
        return JSON.stringify(json);
    }

    protected _getDurable(): SharedDSInfoDurable {
        return {
            version: this.version,
            DS: this.DS,
            VersionId: this.VersionId
        }
    }
}
