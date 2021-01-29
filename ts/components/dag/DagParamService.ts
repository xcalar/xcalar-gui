class DagParamService {
    private _paramMap: Map<string, string> = new Map();

    public initParameters(params: Map<string, string>): void {
        this._paramMap.clear();
        params.forEach((value, key) => {
            this._paramMap.set(key, value);
        });
    }

    public getParamMap() {
        if (this._hasManager()) {
            return DagParamManager.Instance.getParamMap();
        }
        const plainMap = {};
        this._paramMap.forEach((value, key) => {
            plainMap[key] = value;
        });
        return plainMap;
    }

    private _hasManager(): boolean {
        return typeof DagParamManager !== 'undefined';
    }
}

if (typeof exports !== 'undefined') {
    exports.DagParamService = DagParamService;
};
