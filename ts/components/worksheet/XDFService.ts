// Dependencies
// require('./dagHelper/xcHelper');

class XDFService {
    private _operatorsMap = {};

    public setup(options: {userName: string, sessionId: string, listXdfsObj}): void {
        const { userName, sessionId, listXdfsObj} = options;
        const fns = xcHelper.filterUDFsByUserSession(
            listXdfsObj.fnDescs, userName, sessionId
        );
        for (const fn of fns) {
            if (fn.displayName == null) {
                fn.displayName = fn.fnName.split('/').pop();
            }
        }
        this._setupOperatorsMap(fns);
    }

    public getOperatorsMap() {
        if (typeof XDFManager !== 'undefined') {
            return XDFManager.Instance.getOperatorsMap();
        } else {
            return this._operatorsMap;
        }
    }

    private _setupOperatorsMap(opArray) {
        this._operatorsMap = {};
        opArray.forEach((op) => {
            if (this._operatorsMap[op.category] == null) {
                this._operatorsMap[op.category] = {};
            }
            this._operatorsMap[op.category][op.displayName] = op;
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.XDFService = XDFService;
}