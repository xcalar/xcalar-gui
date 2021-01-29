const XcrpcSDK = require('xcalarsdk');
const { QueryState } = XcrpcSDK.XcalarEnum;
const { QueryStateFromStr } = XcrpcSDK.EnumMap;
const { ErrorType, status: ErrorStatus, isXcalarError } = XcrpcSDK.Error;

function createQueryHelper({ sdkClient, userName, sessionName, objectPrefix }) {
    let _tableId = 0;
    const _tablePrefix = `table_${objectPrefix}`;
    const _getQueryService = sdkClient.getGetQueryService();
    const _queryService = sdkClient.getQueryService();
    const _operatorService = sdkClient.getOperatorService();

    async function _indexDataset(loadDSName, columnPrefix) {
        const queryList = [];

        // construct index query
        const indexTableName = _genTableName();
        const indexQueryString = _getQueryService.getIndex(
            loadDSName,
            indexTableName,
            [{
                name: 'xcalarRecordNum',
                type: 'DfUnknown',
                keyFieldName: '',
                ordering: 'Unordered'
            }],
            columnPrefix, '', false, false
        );
        queryList.push(indexQueryString);

        // Execute query
        const queryName = _getQueryName(indexTableName);
        const queryString = `[${queryList.join(',')}]`;
        await _queryService.execute({
            queryName: queryName,
            queryString: queryString,
            scope: XcrpcSDK.Query.SCOPE.WORKBOOK,
            scopeInfo: {
                userName: userName,
                workbookName: sessionName
            }
        });
        // Wait for query done
        if (!await _waitForQuery(queryName)) {
            throw new Error('query exec failed');
        }

        return indexTableName;
    }

    async function _activateDataset(dsName) {
        const loadDSName = _getLoadDSName(dsName);
        try {
            await _operatorService.opBulkLoad({
                datasetName: loadDSName,
                scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: userName, workbookName: sessionName
                }
            });
            return loadDSName;
        } catch(e) {
            if (isXcalarError(e) && e.status === ErrorStatus.STATUS_DATASET_NAME_ALREADY_EXISTS) {
                return loadDSName;
            }
            throw e;
        }
    }

    function _genLoadDSQuery(dsName, loadArgs, columnPrefix, columnNameSet) {
        const tableName = _genTableName();

        const queryList = [];
        queryList.push(_getQueryService.getBulkLoad(
            dsName, loadArgs, null
        ));
        // queryList.push({
        //     operation: "XcalarApiBulkLoad",
        //     args: {
        //         dest: dsName,
        //         loadArgs: loadDSArgs,
        //         dagNodeId: null
        //     }
        // });
        queryList.push(_getQueryService.getIndex(
            _getLoadDSName(dsName),
            tableName,
            [{
                name: 'xcalarRecordNum',
                type: 'DfUnknown',
                keyFieldName: '',
                ordering: 'Unordered'
            }],
            columnPrefix, '', false, false
        ));

        // queryList.push({
        //     operation: "XcalarApiIndex",
        //     args: {
        //         source: _getLoadDSName(dsName),
        //         dest: tableName,
        //         key: [{
        //             name: "xcalarRecordNum",
        //             type: "DfUnknown",
        //             keyFieldName: "",
        //             ordering: "Unordered"
        //         }],
        //         prefix: columnPrefix,
        //         dhtName: "",
        //         delaySort: false,
        //         broadcast: false
        //     }
        // });

        return {
            queryString: `[${queryList.join(',')}]`,
            // queryString: JSON.stringify(queryList),
            table: {
                name: tableName,
                columns: loadArgs.parseArgs.schema.reduce((result, { destColumn }) => {
                    if (columnNameSet.has(destColumn)) {
                        result.push({
                            columnName: `${columnPrefix}::${destColumn}`,
                            headerAlias: `${columnPrefix}_${destColumn}`
                        });
                    }
                    return result;
                }, [])
                // columns: [{columnName: `${columnPrefix}::N_NATIONKEY`, headerAlias: `${columnPrefix}_N_NATIONKEY`}]
            }
        };
    }

    async function _waitForQuery(queryName) {
        try {
            let retryCount = 10;
            const duration = 100;

            for (let i = 0; i < retryCount; i ++) {
                const { done, success } = await _checkQueryState(queryName);
                if (done) {
                    return success;
                }
                await _waitTimeout(duration);
            }

            return false;
        } catch(e) {
            return false;
        }
    }

    function _waitTimeout(duration) {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(); }, duration);
        });
    }

    async function _checkQueryState(queryName) {
        try {
            const doneStates = new Set([QueryState.QR_FINISHED, QueryState.QR_ERROR, QueryState.QR_CANCELLED]);
            const successStates = new Set([QueryState.QR_FINISHED]);

            const queryList = await _queryService.list({ namePattern: queryName });
            for (const { name, state } of queryList) {
                if (name === queryName) {
                    const stateEnum = QueryStateFromStr[state];
                    return { done: doneStates.has(stateEnum), success: successStates.has(stateEnum) };
                }
            }
            return { done: true, success: false };
        } catch(e) {
            return { done: true, success: false };
        }
    }

    function _getOptimizedDSName(dsName) {
        return `Optimized.${dsName}`;
    }

    function _getLoadDSName(dsName) {
        return `.XcalarDS.${dsName}`;
    }

    function _genTableName() {
        return `${_tablePrefix}_${Date.now()}${_tableId ++}`;
    }

    function _getQueryName(tableName) {
        return `query_${tableName}`;
    }

    return {
        activateDataset: (dsName) => _activateDataset(dsName),
        indexDataset: (loadDSName, prefix) => _indexDataset(loadDSName, prefix),
        genLoadDSQuery: (dsName, loadArgs, columnPrefix, columnNameSet) => _genLoadDSQuery(dsName, loadArgs, columnPrefix, columnNameSet),
        getLoadDSName: (dsName) => _getLoadDSName(dsName),
        getOptimizedDSName: (dsName) => _getOptimizedDSName(dsName),
        genTableName: () => _genTableName(),
        getQueryName: (tableName) => _getQueryName(tableName)
    };
}

module.exports = createQueryHelper;