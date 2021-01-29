interface WKBKOptions extends WKBKDurable {
    sessionId?: string;
    memUsed?: number;
}

class WKBK extends Durable {
    public sessionId: string; // backend id, not persisted
    public name: string; // workbook name

    private id: string; // workbook id
    private noMeta: boolean; // has meta or not
    private created: number; // create time
    private modified: number; // last modified time
    private resource: boolean; // true if it has resource,
    private description: string; // workbook description
    private memUsed: number;

    constructor(options: WKBKOptions) {
        options = options || <WKBKOptions>{};
        super(options.version);
        if (options.name == null || options.id == null) {
            throw "Invalid notebook info!";
        }

        let time = xcTimeHelper.getCurrentTimeStamp();

        this.name = options.name;
        this.id = options.id;
        this.noMeta = options.noMeta || false;
        this.created = options.created || time;
        this.modified = options.modified || time;
        this.resource = options.resource || false;
        this.memUsed = null;
        if (options.description) {
            this.description = options.description;
        }
        if (options.sessionId) {
            this.sessionId = options.sessionId;
        }
    }

    public update(): void {
        this.noMeta = false;
        // store modified data
        this.modified = xcTimeHelper.getCurrentTimeStamp();
    }

    public setSessionId(sessinId: string): void {
        this.sessionId = sessinId;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getDescription(): string {
        return this.description;
    }

    public setDescription(description: string): void {
        this.description = description;
    }

    public getCreateTime(): number {
        return this.created;
    }

    public getModifyTime(): number {
        return this.modified;
    }

    public isNoMeta(): boolean {
        return this.noMeta;
    }

    public hasResource(): boolean {
        return this.resource;
    }

    public setResource(resource: boolean): void {
        this.resource = resource;
    }

    // not used
    public serialize(): string {
        return null;
    }

    public setMemUsed(memUsed: number): void {
        this.memUsed = memUsed;
    }

    public getMemUsed(): number {
        return this.memUsed;
    }

    // not used
    protected _getDurable() {
        return null;
    }
}