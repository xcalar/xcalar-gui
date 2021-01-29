// Specify dependencies here:
// const DagTabService = require('./DagTabService.js');
// const DagListService = require('./DagListService.js');

// XXX TODO: This should be replaced by DagRuntime
class DagServiceFactory {

    // private static _dagTabService: DagTabService = new DagTabService();
    private static _dagListService: DagListService = new DagListService();

    // public static getDagTabService(): DagTabService {
    //     return this._dagTabService;
    // }

    public static getDagListService(): DagListService {
        return this._dagListService;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagServiceFactory = DagServiceFactory;
}