// workbookManager.js
class WKBKSet {
    private set: {[wkbkId: string]: WKBK};
    public constructor() {
        this.set = {};
    }
    public get(wkbkId: string): WKBK {
        return this.set[wkbkId];
    }

    public getWithStringify(): string {
        return JSON.stringify(this.set);
    }

    public getAll(): {[wkbkId: string]: WKBK} {
        return this.set;
    }

    public put(wkbkId: string, wkbk: WKBK): void {
        this.set[wkbkId] = wkbk;
    }

    public has(wkbkId: string): boolean {
        return this.set.hasOwnProperty(wkbkId);
    }

    public delete(wkbkId: string): void {
        delete this.set[wkbkId];
    }
}