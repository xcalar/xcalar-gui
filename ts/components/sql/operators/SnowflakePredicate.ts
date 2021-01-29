// XXX This may need rename when other databases supported
class SnowflakePredicate {
    static compile(node: TreeNode): XDPromise<any>  {

        const deferred = PromiseHelper.deferred();

        let schema = [];
        let newTableName: string = XIApi.getNewTableName("XCPUSHDOWN");
        let columns = [];
        let retStruct = SQLCompiler.genMapArray(node.value.plan[0].output,
                                                columns, [], [], {}, []);
        node.dupCols = retStruct.dupCols;
        const renames = SQLCompiler.resolveCollision(node.usrCols, columns,
                                            [], [], "", newTableName, true);
        node.renamedCols = renames;
        node.usrCols = columns;
        if (node.value.plan[0].aliasList.length === 0) {
            for (let i = 0; i < columns.length; i++) {
                for (let j = 0; j < node.value.plan[0].output.length; j++) {
                    if (columns[i].colId ===
                        node.value.plan[0].output[j][0].exprId.id) {
                        let colInfo = {
                            'sourceColumn': node.value.plan[0].output[j][0].name,
                            'destColumn': columns[i].rename || columns[i].colName,
                            'columnType': DfFieldTypeTStr[
                                xcHelper.convertColTypeToFieldType(
                                    xcHelper.convertSQLTypeToColType(
                                        columns[i].colType))]
                        }
                        schema.push(colInfo);
                        break;
                    }
                }
            }
        } else {
            for (let i = 0; i < columns.length; i++) {
                for (let j = 0; j < node.value.plan[0].aliasList.length; j++) {
                    if (columns[i].colId ===
                        node.value.plan[0].aliasList[j][0].exprId.id) {
                        let colInfo = {
                            'sourceColumn': node.value.plan[0].aliasList[j][0].name,
                            'destColumn': columns[i].rename || columns[i].colName,
                            'columnType': DfFieldTypeTStr[
                                xcHelper.convertColTypeToFieldType(
                                    xcHelper.convertSQLTypeToColType(
                                        columns[i].colType))]
                        }
                        schema.push(colInfo);
                        break;
                    }
                }
            }
        }
        let key = xcHelper.randName("sfPredicateQuery_");
        let query = node.value.plan[0].query;
        let parserArgs;
        let maxQueryLen = XcalarApisConstantsT.XcalarApiMaxFileNameLen + XcalarApisConstantsT.XcalarApiMaxUrlLen;
        if (JSON.stringify({"query": query, "kvstoreKey": key}).length >= maxQueryLen) {
            // Store query in KV store
            XcalarKeyPutXcrpc(key, query, false,  gKVScope.GLOB);
            parserArgs = JSON.stringify({"query": "<Query size too large to display>", "kvstoreKey": key})
        } else {
            parserArgs = JSON.stringify({"query": query, "kvstoreKey": ""})
        }
        let datasetName = xcHelper.randName('.XcalarDS.Optimized.ds_')

        // XXX Make this generic so other components can also call
        let bulkload = {
                'operation': 'XcalarApiBulkLoad',
                'comment': '', 'tag': '',
                'args': {
                    'dest': datasetName,
                    'loadArgs': {
                        'sourceArgsList': [
                            {
                                'targetName': node.targetName,
                                'path': '', 'fileNamePattern': '',
                                'recursive': false}
                            ],
                        'parseArgs': {
                            'parserFnName': '/sharedUDFs/default:snowflakePredicateLoad',
                            'parserArgJson': parserArgs,
                            'fileNameFieldName': '',
                            'recordNumFieldName': '',
                            'allowFileErrors': false,
                            'allowRecordErrors': false,
                            'schema': schema
                        },
                        'size': 10737418240
                    },
                    "sourceType": "Snowflake"
                },
                'annotations': {}
            }
        let index = {
                'operation': 'XcalarApiSynthesize',
                'args': {
                    'source': datasetName,
                    'dest': newTableName,
                    'columns': schema,
                    'sameSession': true,
                    'numColumns': 1
                },
                'tag': ''
            };
        node.newTableName = newTableName;
        deferred.resolve({
            "newTableName": newTableName,
            "cli": JSON.stringify(bulkload) + "," + JSON.stringify(index) + ","
        });
        return deferred.promise();
    }
}

if (typeof exports !== "undefined") {
    exports.SnowflakePredicate = SnowflakePredicate;
}