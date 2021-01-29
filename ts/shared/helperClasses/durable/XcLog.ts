// XXX TODO: rename sqlType to logType
class XcLog extends Durable {
    private title: string; // log's title,
    public options: any; // log's options
    public cli: string; // (optional) cli log
    public error: string; // (optional) error log
    private sqlType: string; // (optional) log's type
    public timestamp: number; // time
    public version: number;

    constructor(options: XcLogDurable) {
        options = options || <XcLogDurable>{};
        super(options.version);
        this.title = options.title;
        this.options = options.options || {};

        if (options.cli != null) {
            this.cli = options.cli;
        }

        if (options.error != null) {
            this.sqlType = SQLType.Error;
            this.error = options.error;
        }

        this.timestamp = options.timestamp || new Date().getTime();
    }

    public isError(): boolean {
        if (this.sqlType === SQLType.Error) {
            return true;
        } else {
            return false;
        }
    }

    public getOperation(): string {
        return this.options.operation;
    }

    public getTitle(): string {
        return this.title;
    }

    public getOptions(): any {
        return this.options;
    }

    public getSQLType(): string {
        return this.sqlType;
    }

    public getCli(): string {
        return this.cli;
    }

    // not used
    public serialize(): string {
        return null;
    }

    protected _getDurable() {
        return null;
    }

}