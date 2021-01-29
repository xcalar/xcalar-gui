class Mutex {
    public key: string;
    public scope: number;

    public constructor(key: string, scope: number) {
        if (!key || !(typeof(key) === "string")) {
            console.warn("No/Illegal mutex key, generating a random one.");
            key = xcHelper.randName("mutex", 5);
        }
        this.key = key;
        if (!scope) {
            scope = XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal;
        }
        this.scope = scope;
    }
}
