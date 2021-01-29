class XcUID {
    public static SDKPrefix: string = "XcalarSDK-";
    public static SDKPrefixOpt: string = "XcalarSDKOpt-";
    private _prefix: string;
    private _keepPrefix: boolean;
    private _count: number;
    private _generator: (prefix: string, count: number, keepPrefix?: boolean) => string;

    /**
     * keepPrefix: if true, will use prefix regardless if xcHelper.isNodeJs is true
     */
    public constructor(prefix: string, keepPrefix: boolean = false) {
        this._prefix = prefix;
        this._keepPrefix = keepPrefix;
        this._count = 0;
        this._generator = this._defaultGenerator;
    }

    get count(): number {
        return this._count;
    }

    /**
     * Generate new id
     */
    public gen(): string {
        const id: string = this._generator(this._prefix, this._count, this._keepPrefix);
        this._count++;
        return id;
    }

    /**
     * To Overwrite the default generator
     * @param func
     */
    public setGenerator(func: (prefix: string, count: number) => string): void {
        this._generator = func;
    }

    private _defaultGenerator(prefix: string, count: number, keepPrefix: boolean = false): string {
        var id: string;
        if (xcHelper.isNodeJs()) {
            if (prefix && keepPrefix) {
                id = prefix;
            } else {
                id = XcUID.SDKPrefix;
            }
        } else {
            const activeWKBNK: string = WorkbookManager.getActiveWKBK();
            const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
            id = (workbook == null) ? null : workbook.sessionId;
            id = id || xcHelper.randName("id");
            if (prefix) {
                id = prefix + "_" + id;
            }
        }
        return id + "_" + new Date().getTime() + "_" + count;
    }
}

if (typeof exports !== 'undefined') {
    exports.XcUID = XcUID;
};
