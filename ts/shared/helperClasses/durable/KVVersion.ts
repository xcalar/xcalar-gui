class KVVersion extends Durable {
    private _stripEmail: boolean;

    constructor(options?: KVVersionDurable) {
        let version: number = options && options.version || undefined;
        super(version);
        this._stripEmail = options && options.stripEmail || false;
    }

    public serialize(): string {
        let json = this._getDurable();
        return JSON.stringify(json);
    }

    public shouldStrimEmail(): boolean {
        // will only be true for an old version
        return (this._stripEmail === true);
    }

    protected _getDurable(): KVVersionDurable {
        let json: KVVersionDurable = {
            version: this.version
        };
        if (this._stripEmail === true) {
            json.stripEmail = this._stripEmail;
        }
        return json;
    }
}