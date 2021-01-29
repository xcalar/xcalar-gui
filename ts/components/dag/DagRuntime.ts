// Dependencies
// const DagTabService = require('./DagTabService').DagTabService;
// const XDFService = require('./XDFService').XDFService;
// const DagAggService = require('./DagAggService').DagAggService;

/**
 * DagRuntime consists of all runtime variables/services(such as userName, sessionId ...)
 * Usage:
 * 1. Create a DagRuntime instance
 * 2. Call instance.accessible(obj) on any object who wants to access the runtime
 * 3. In the object code, call this.getRuntime() to access the runtime instance
 * @description For now, it is only leveraged in the expServer code path, but it will be applied to all XD codebase to replace some singletons/globals.
 */
class DagRuntime {
    private _dagTabService: DagTabService;
    private _xdfService: XDFService;
    private _dagAggService: DagAggService;
    private _dagParamService: DagParamService;

    public constructor() {
        // Caution: all services should be initialized seperately with the runtime data at some point
        // In expServer, DagHelperIndex.js is the place
        // In XD, we don't do service init for now, instead it's services' responsibility
        // to get the runtime data from other classes/instances. See DagTabService as an example.
        this._dagTabService = this.accessible(new DagTabService());
        this._xdfService = this.accessible(new XDFService());
        this._dagAggService = this.accessible(new DagAggService());
        this._dagParamService = this.accessible(new DagParamService());
    }

    public getDagTabService(): DagTabService {
        return this._dagTabService;
    }

    public getXDFService(): XDFService {
        return this._xdfService;
    }

    public getDagAggService(): DagAggService {
        return this._dagAggService;
    }

    public getDagParamService(): DagParamService {
        return this._dagParamService;
    }

    // === Decorator functions: begin ===
    public accessible<T>(obj: T): T {
        try {
            (<any>obj).getRuntime = () => (this);
        } catch(e) {
            console.error(e);
        }
        return obj;
    }

    public static isAccessible(obj: any): obj is DagRuntimeAccessible {
        try {
            return typeof obj.getRuntime === 'function';
        } catch(e) {
            console.error(e);
            return false;
        }
    }
    // === Decorator functions: end ===

    // XXX TODO: this will be removed once XD is fully ready for accessing real runtime data
    // === Hack for XD: begin ===
    private static _defaultRuntime: DagRuntime = null;
    public static getDefaultRuntime(): DagRuntime {
        if (this._defaultRuntime == null) {
            this._defaultRuntime = new this();
        }
        return this._defaultRuntime;
    }
    // === Hack for XD: end ===
}

if (typeof exports !== 'undefined') {
    exports.DagRuntime = DagRuntime;
}