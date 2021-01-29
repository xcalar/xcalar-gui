var DagGraph = require("../../dagHelper/DagGraph.js").DagGraph;
var DagRuntime = require("../../dagHelper/DagRuntime.js").DagRuntime;

class DagHelper {
    static convertKvs(kvsStrList, dataflowName, optimized, listXdfsOutput, userName,
            sessionId, workbookName, parameterMap) {
        if (typeof kvsStrList !== "object" || kvsStrList === 0) {
            return PromiseHelper.reject( {error: "KVS list not provided"});
        }
        if (typeof listXdfsOutput !== "string" || listXdfsOutput.length === 0) {
            return PromiseHelper.reject( {error: "listXdfsOutput string not provided"});
        }
        if (typeof userName !== "string" || userName.length === 0) {
            return PromiseHelper.reject({ error: "userName string not provided" });
        }
        if (typeof sessionId !== "string" || sessionId.length === 0) {
            return PromiseHelper.reject({ error: "sessionId string not provided" });
        }
        if (typeof workbookName !== "string" || workbookName.length === 0) {
            return PromiseHelper.reject({ error: "workbookName string not provided" });
        }
        if (parameterMap == null) {
            parameterMap = new Map();
        }
        try {
            // Create xcrpc client
            const url = "https://localhost/app/service/xce";
            Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);
            var dagRuntime = new DagRuntime();
            var targetDag;
            // Register all dataflows for linkin/out lookup
            for (var ii = 0; ii < kvsStrList.length; ii++){
                var parsedVal = JSON.parse(kvsStrList[ii]);
                dagRuntime.getDagTabService().addActiveUserTabFromJSON(parsedVal);
                // Figure out the dataflow we are going to run
                if (parsedVal.name === dataflowName) {
                    targetDag = parsedVal.dag;
                }
            }
            var parsedXdfs = JSON.parse(listXdfsOutput);

            // Setup XDF, which is required by some nodes(such as Map, GroupBy)
            dagRuntime.getXDFService().setup({
                userName: userName, sessionId: sessionId, listXdfsObj: parsedXdfs
            });

            // Setup parameters
            dagRuntime.getDagParamService().initParameters(parameterMap);

            // Convert dataflow JSON to Xcalar queries
            var graph = dagRuntime.accessible(new DagGraph());
            graph.create(targetDag);
            // Preprocess the linkIn nodes, it will
            // 1. Detect missing dataflows(python SDK will handle the error and make another call with comprehensive
            // dataflows)
            // 2. Apply linkOut's resultant table to linkIn's source, to avoid real query execution
            graph.processLinkedNodes();
            if (optimized) {
                return graph.getRetinaArgs(null, false);
            } else {
                let deferred = PromiseHelper.deferred();
                graph.getQuery()
                .then((ret) => deferred.resolve(ret.queryStr))
                .fail(deferred.reject);
                return deferred.promise();
            }
        }
        catch (err) {
            console.log(err);
            return PromiseHelper.reject(err);
        }
    }
}

exports.DagHelper = DagHelper;
