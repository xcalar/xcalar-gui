// Specify dependencies here:
// const DagTab = require("./DagTab");

class DagListService {
    public getDagTabById(id: string): DagTab {
        if (typeof DagList !== 'undefined') {
            return DagList.Instance.getDagTabById(id);
        } else {
            // expServer goes here
            return null;
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagListService = DagListService;
}