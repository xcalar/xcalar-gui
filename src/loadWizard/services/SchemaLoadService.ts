import * as Path from 'path'
import { LoadSession, IXcalarSession } from './sdk/Session'
import { Table, Cursor } from './sdk/Table'
import { SharedTable } from './sdk/SharedTable'
import { Schema, InputSerialization } from './SchemaService'

type ProgressCallback = (progress?: number) => void;
const JobCancelExeption = new Error('Job Cancelled');
const defaultConnector = "Xcalar S3 Connector";

async function executeSchemaLoadApp(jsonStr: string) {
    const response = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSchemaLoadService().appRun(jsonStr);

    try {
        return JSON.parse(response);
    } catch(_) {
        return {};
    }
}

function convertLoadId(loadId: string): string {
    return loadId;
    // "LOAD_WIZARD_5F454B190E0DFF06_1599241301_119471
    function randomNumber(numDigits) {
        let result = '';
        for (let i = 0; i < numDigits; i ++) {
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }

    const t = `${Date.now()}`;
    const part1 = t.substr(0, 10);
    const part2 = t.substr(10) + randomNumber(6 - (t.length - 10));

    const list = loadId.split('_');
    list[list.length - 1] = part2;
    list[list.length - 2] = part1;
    return list.join('_');
}

async function createLoadId(session: IXcalarSession) {
    const appInput = {
        func: 'get_load_id',
        session_name: session.sessionName
    };
    const loadId: string = await executeSchemaLoadApp(JSON.stringify(appInput));
    return loadId;
}

function createDiscoverNames(appId) {
    return {
        loadPrefix: `xl_${appId}_load`,
        compPrefix: `xl_${appId}_comp`,
        dataPrefix: `xl_${appId}_data`
    };
}

function updateProgress(cb: ProgressCallback, startProgress: number, endProgress: number) {
    if (typeof cb !== "function") {
        throw new Error('cb is not a function');
    }
    let currentProgress = startProgress;
    let timer = setInterval(() => {
        if (currentProgress < endProgress - 1) {
            cb(currentProgress);
            currentProgress++;
        } else {
            if (timer != null) {
                clearInterval(timer);
            }
            timer = null;
        }
    }, 5000);
    cb(currentProgress);

    return {
        done: () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
            cb(endProgress);
        },
        stop: () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
        }
    };
}

async function callInTransaction<T>(
    operation: string,
    runTask: () => Promise<T>
): Promise<T> {
    const txId = Transaction.start({
        "msg": 'SchemaLoadApp',
        "operation": operation,
        "track": false
    });

    try {
        const returnVal = await runTask();
        Transaction.done(txId);
        return returnVal;
    } catch(e) {
        Transaction.fail(txId, {
            noAlert: true, noNotification: true
        });
        throw e;
    }
}

async function initSession(session) {
    try {
        await session.create();
    } catch(_) {
        // Skip error
    }

    try {
        await session.activate();
    } catch(_) {
        // Skip error
    }
}

async function initApp() {
    // Load session
    const loadSession = new LoadSession();
    await initSession(loadSession);
    // Load Id
    const loadId = await createLoadId(loadSession);
    // Table names
    const names = createDiscoverNames(loadId);

    return {
        session: loadSession,
        appId: loadId,
        names: names
    };
}

function combineQueries(loadQuery, tableQuery, params = new Map()) {
    // Remove the leading synthesize, which is not necessary in regular execution
    tableQuery = removeSynthesize(tableQuery);

    // Remove export from the query string
    const excludeSet = new Set([
        Xcrpc.EnumMap.XcalarApisToStr[Xcrpc.EnumMap.XcalarApisToInt.XcalarApiExport]
    ]);
    const queryList = JSON.parse(loadQuery).concat(JSON.parse(tableQuery));
    let queryString = JSON.stringify(
        queryList.filter(({ operation }) => !excludeSet.has(operation))
    );

    for (const [key, value] of params) {
        const replacementKey = `<${key}>`;
        queryString = queryString.replace(replacementKey, value);
    }

    return queryString;
}

function removeSynthesize(query) {
    const queryList = JSON.parse(query);
    if (queryList.length < 2) {
        return query;
    }
    if (queryList[0].operation === Xcrpc.EnumMap.XcalarApisToStr[Xcrpc.EnumMap.XcalarApisToInt.XcalarApiSynthesize]) {
        const synthesizeOp = queryList.shift();
        queryList[0].args.source = synthesizeOp.args.source;
    }

    return JSON.stringify(queryList);
}

function getIntermidateResource(query: string) {
    const loadUDF = new Set<string>();
    let queryList = JSON.parse(query);
    if (queryList.query != null) {
        // Retina query format
        queryList = JSON.parse(queryList.query);
    }

    const loadWizardFuncName = 'get_load_wizard_plan';
    for (const queryJson of queryList) {
        if (queryJson.operation === Xcrpc.EnumMap.XcalarApisToStr[Xcrpc.EnumMap.XcalarApisToInt.XcalarApiBulkLoad]) {
            // "LOAD_PLAN_UDF_5F454B190E0DFF06_1599591750_267983:get_load_wizard_plan"
            const [udfModule, udfFunc] = queryJson.args.loadArgs.parseArgs.parserFnName.split(':');
            if (udfFunc === loadWizardFuncName) {
                loadUDF.add(udfModule);
            }
        }
    }

    return loadUDF;
}

const discoverApps = new Map<string, App>();
async function createDiscoverApp(params: {
    targetName: string,
}): Promise<App> {
    const { targetName } = params;
    const { appId, session, names } = await initApp();

    async function deleteTempTables() {
        const tempTablePrefix = '_xl_temp_';
        await session.deleteTables({
            namePattern: `${tempTablePrefix}*`
        });
    }

    function runTableQueryWithCancel(query, progressCB: ProgressCallback = () => {}) {
        let runningQuery = null;
        const setRunningQuery = (queryName) => { runningQuery = queryName };
        let cancel = false;

        const job = {
            cancel: async () => {
                cancel = true;
                if (runningQuery != null) {
                    try {
                        await session.callLegacyApi(() => XcalarQueryCancel(runningQuery));
                    } catch(_) {
                        // Ignore errors
                    }
                }
            },
            done: () => callInTransaction('Create tables', () => runTableQuery(query, progressCB, {
                isCancelled: () => cancel,
                setRunningQuery: setRunningQuery
            }))
        };

        return job;
    }

    async function runTableQuery(query, progressCB: ProgressCallback = () => {}, options?: {
        isCancelled?: () => boolean,
        setRunningQuery?: (queryName?: string) => void
    }) {
        /**
         * Do not delete the result table of each dataflow execution here,
         * or IMD table will persist an incomplete dataflow to its metadata
         * thus table restoration will fail
         */
        const {loadQueryOpt, tableNames, loadId} = query;
        const { isCancelled = () => false, setRunningQuery = () => {} } = options || {};

        const failCleanupJobs = [];
        try {
            // Execute Load DF
            const loadQuery = JSON.parse(loadQueryOpt).retina;
            const loadProgress = updateProgress((p) => progressCB(p), 0, 99);
            try {
                const loadQueryName = `q_${loadId}_load`;
                const loadJob = session.executeQueryOptimized({
                    queryStringOpt: loadQuery,
                    queryName: loadQueryName,
                    tableName: tableNames.load,
                    params: new Map([
                        ['session_name', session.sessionName],
                        ['user_name', session.user.getUserName()]
                    ])
                });
                setRunningQuery(loadQueryName);
                await loadJob;
                loadProgress.done();
            } catch(e) {
                if (isCancelled()) {
                    console.log('Cancel: load excution');
                    throw JobCancelExeption;
                } else {
                    throw e;
                }
            } finally {
                setRunningQuery(null);
                loadProgress.stop();
            }
            const loadTable = new Table({
                session: session,
                tableName: tableNames.load
            });
            failCleanupJobs.push(() => loadTable.destroy());
            if (isCancelled()) {
                console.log('Cancel: post load excution');
                throw JobCancelExeption;
            }

            // Extract load UDF name from bulkLoad
            // Note: the load UDF needs to be deleted after a temporary load, ex. preview
            const loadUDFs = getIntermidateResource(loadQuery);

            // Execute Data DF
            // const dataQuery = JSON.parse(dataQueryOpt).retina;
            // const dataProgress = updateProgress((p) => progressCB(p), 60, 80);
            // try {
            //     const dataQueryName =  `q_${loadId}_data`;
            //     const dataJob = session.executeQueryOptimized({
            //         queryStringOpt: dataQuery,
            //         queryName: dataQueryName,
            //         tableName: tableNames.data
            //     });
            //     setRunningQuery(dataQueryName);
            //     await dataJob;
            //     dataProgress.done();
            // } catch(e) {
            //     if (isCancelled()) {
            //         console.log('Cancel: data excution');
            //         throw JobCancelExeption;
            //     } else {
            //         throw e;
            //     }
            // } finally {
            //     setRunningQuery(null);
            //     dataProgress.stop();
            // }
            // const dataTable = new Table({
            //     session: session, tableName: tableNames.data
            // });
            // failCleanupJobs.push(() => dataTable.destroy());
            // if (isCancelled()) {
            //     console.log('Cancel: post data excution');
            //     throw JobCancelExeption;
            // }

            // Execute ICV DF
            // let compTable = null;
            // const numRowsTotal = await getNumRows(loadTable);
            // const numRowsData = await getNumRows(dataTable);
            // if (numRowsData != numRowsTotal) {
            //     const compQuery = JSON.parse(compQueryOpt).retina;
            //     const compProgress = updateProgress((p) => progressCB(p), 80, 99);
            //     try {
            //         const icvQueryName = `q_${loadId}_comp`;
            //         const icvJob = session.executeQueryOptimized({
            //             queryStringOpt: compQuery,
            //             queryName: icvQueryName,
            //             tableName: tableNames.comp
            //         });
            //         setRunningQuery(icvQueryName);
            //         await icvJob;
            //         compProgress.done();
            //     } catch(e) {
            //         if (isCancelled()) {
            //             console.log('Cancel: icv excution');
            //             throw JobCancelExeption;
            //         } else {
            //             throw e;
            //         }
            //     } finally {
            //         setRunningQuery(null);
            //         compProgress.stop();
            //     }
            //     compTable = new Table({
            //         session: session,
            //         tableName: tableNames.comp
            //     });
            //     failCleanupJobs.push(() => compTable.destroy());
            //     if (isCancelled()) {
            //         console.log('Cancel: post icv excution');
            //         throw JobCancelExeption;
            //     }
            // }

            // Delete Load XDB but keep lineage
            // await loadTable.destroy({ isCleanLineage: false });
            // if (isCancelled()) {
            //     console.log('Cancel: post delete load lineage');
            //     throw JobCancelExeption;
            // }

            // Return the session tables created from those 3 DFs
            return {
                // data: dataTable,
                // comp: compTable,
                load: loadTable,
                loadUDFs: loadUDFs
            };
        } catch(e) {
            try {
                await Promise.all(failCleanupJobs.map(job => job()));
            } catch(_) {
                // Ignore errors
            }
            throw e;
        } finally {
            progressCB(100);
        }
    }

    async function deleteLoadUDFs(loadUDFs: Set<string>): Promise<void> {
        const sharedUDFPrefix = xcHelper.constructUDFSharedPrefix();
        for (const udf of loadUDFs) {
            try {
                await session.callLegacyApi(
                    () => XcalarDeletePython(sharedUDFPrefix + udf, true)
                );
                console.info('Delete LoadUDF: ', udf);
            } catch(_) {
                // Ignore errors
            }
        }
    }

    async function getNumRows(table: Table) {
        const cursor = table.createCursor(false);
        try {
            await cursor.open();
            return cursor.getNumRows();
        } catch(e) {
            console.log('getNumRow: ', e);
            return 0;
        } finally {
            await cursor.close();
        }
    }

    const app: App = {
        appId: appId,
        getSession: () => session,
        shareResultTables: async (tables, sharedNames) => {
            const { data: dataName, comp: compName } = sharedNames;

            // Publish data table
            const dataTable = await tables.data.share();

            // Publish comp table
            const compHasData = tables.comp != null;
            let icvTable = null;
            if (compHasData) {
                icvTable = await tables.comp.share();
            }

            return {
                data: dataTable,
                icv: icvTable
            };
        },
        // publishResultTables: async (tables, pubNames, dataflows) => {
        //     const { data: dataName, comp: compName } = pubNames;
        //     const { dataQueryComplete = '[]', compQueryComplete = '[]' } = dataflows || {};

        //     // Publish data table
        //     await tables.data.publishWithQuery(dataName, JSON.parse(dataQueryComplete), {
        //         isDropSrc: true
        //     });

        //     // Publish comp table
        //     const compHasData = tables.comp != null;
        //     if (compHasData) {
        //         await tables.comp.publishWithQuery(compName, JSON.parse(compQueryComplete), {
        //             isDropSrc: true
        //         });
        //     }

        //     return compHasData;
        // },
        createResultTables: async (query, progressCB: ProgressCallback = () => {}) => {
            return await callInTransaction('Create tables', () => runTableQuery(query, progressCB));
        },
        createResultTablesWithCancel: (query, progressCB: ProgressCallback = () => {}) => {
            return runTableQueryWithCancel(query, progressCB);
        },
        createICVTable: async (loadTableName: string) => {
            const icvFlagColumn = 'XCALAR_ICV';
            const systemColumns = ['XCALAR_ICV', 'XCALAR_FILE_RECORD_NUM', 'XCALAR_SOURCEDATA', 'XCALAR_PATH'];
            const sqlQuery = `select ${systemColumns.join(',')} from ${loadTableName} where ${icvFlagColumn} != ""`;
            const icvTable = await session.executeSql(sqlQuery);
            if ((await getNumRows(icvTable)) == 0) {
                await icvTable.destroy();
                return null;
            }
            return icvTable;
        },
        openICVTable: async (icvTableName: string) => {
            const table = new Table({ session: session, tableName: icvTableName });
            const cursor = table.createCursor();
            await cursor.open();
            return {
                table: table,
                cursor: cursor
            };
        },
        getCreateTableQueryWithCancel: (param: getCreateTableQueryInput) => {
            console.log('param', param)
            let cancel = false;
            let loadUDFs = null;
            return {
                cancel: () => { cancel = true },
                done: async () => {
                    const result = await app.getCreateTableQueryWithSchema(param);
                    loadUDFs = getIntermidateResource(JSON.parse(result.loadQueryOpt).retina);
                    if (cancel) {
                        console.log('Cancel: getQuery')
                        throw JobCancelExeption;
                    }
                    return result;
                },
                cleanup: async () => {
                    if (loadUDFs != null) {
                        try {
                            await deleteLoadUDFs(loadUDFs);
                        } catch(_) {
                            // Ignore errors
                        }
                    }
                }
            };
        },
        getCreateTableQueryWithSchema: async (param: getCreateTableQueryInput): Promise<getCreateTableQueryResult> => {
            const { path, filePattern, inputSerialization, schema, numRows = -1, progressCB = () => {}, isRecursive = false } = param;
            const delProgress = updateProgress((p) => {
                progressCB(p);
            }, 0, 10);
            try {
                await deleteTempTables();
                delProgress.done();
            } finally {
                delProgress.stop();
            }

            const getQueryProgress = updateProgress((p) => {
                progressCB(p);
            }, 10, 100);
            try {
                const schemaJsonStr = JSON.stringify(schema);
                const loadId = convertLoadId(appId);
                const names = createDiscoverNames(loadId);
                const tableNames = {
                    load: names.loadPrefix,
                    data: names.dataPrefix,
                    comp: names.compPrefix
                };
                const appInput = {
                    func: 'get_dataflows_with_schema',
                    session_name: session.sessionName,
                    source_args_json: JSON.stringify([{
                        targetName: targetName,
                        path: Path.join(path, '/'),
                        fileNamePattern: filePattern,
                        recursive: isRecursive
                    }]),
                    input_serial_json: JSON.stringify(inputSerialization),
                    schema_json: schemaJsonStr,
                    num_rows: numRows > 0 ? numRows : null,
                    load_table_name: tableNames.load,
                    comp_table_name: tableNames.comp,
                    data_table_name: tableNames.data
                };
                console.log('get_dataflows_with_schema: ', appInput);
                const response = await executeSchemaLoadApp(JSON.stringify(appInput));
                getQueryProgress.done();

                return {
                    loadQuery: combineQueries(response.load_df_query_string, '[]'),
                    loadQueryOpt: response.load_df_optimized_query_string,
                    // dataQuery: combineQueries(response.data_df_query_string, '[]'),
                    // dataQueryOpt: response.data_df_optimized_query_string,
                    // compQuery: combineQueries(response.comp_df_query_string, '[]'),
                    // compQueryOpt: response.comp_df_optimized_query_string,
                    tableNames: tableNames,
                    loadId: loadId,
                    dataQueryComplete: combineQueries(response.load_df_query_string, '[]'),
                    // dataQueryComplete: combineQueries(response.load_df_query_string, response.data_df_query_string),
                    // compQueryComplete: combineQueries(response.load_df_query_string, response.comp_df_query_string)
                };
            } finally {
                getQueryProgress.stop();
            }
        },
        previewFile: async (params: previewFileInput): Promise<previewFileResult> => {
            const { path, filePattern, inputSerialization, numRows = 20 } = params;
            const appInput = {
                func: 'preview_rows',
                load_id: convertLoadId(appId),
                session_name: session.sessionName,
                target_name: targetName,
                path: Path.join(path, filePattern),
                input_serial_json: JSON.stringify(inputSerialization),
                num_rows: numRows
            };
            console.log('App.previewFile: ', appInput);

            const { rows = [], schemas = [], statuses = [], global_status = {} } = await executeSchemaLoadApp(JSON.stringify(appInput));

            return {
                status: { errorMessage: global_status.error_message },
                lines: rows.map((line, i) => {
                    const schema = schemas[i];
                    const status = statuses[i] || { error_message: null, unsupported_columns: [] };
                    return {
                        data: line,
                        schema: schema || {},
                        status: {
                            hasError: status.unsupported_columns.length > 0,
                            errorMessage: status.error_message,
                            unsupportedColumns: status.unsupported_columns.map(({message, name, mapping}) => ({
                                message: message, name: name, mapping: mapping
                            }))
                        }
                    };
                })
            };
        },
        createPreviewTable: async function(params: createPreviewTableInput): Promise<Table> {
            const { path, filePattern, isRecursive = false, inputSerialization, schema, numRows = 100 } = params;

            const query = await app.getCreateTableQueryWithSchema({
                path: path, filePattern: filePattern,
                inputSerialization: inputSerialization,
                isRecursive: isRecursive,
                schema: schema,
                numRows: numRows
            });
            // Create data/comp session tables
            const results = await app.createResultTables(query);
            // Remove unused tables
            try {
                await Promise.all([
                    // results.load.destroy(),
                    // results.comp.destroy(),
                    deleteLoadUDFs(results.loadUDFs)
                ]);
            } catch(_) {
                // Ignore errors
            }

            return results.load;
        }
    };

    discoverApps.set(appId, app);
    return app;
}

type getCreateTableQueryInput = {
    path: string, filePattern: string,
    inputSerialization: InputSerialization,
    schema: Schema,
    numRows?: number,
    progressCB?: ProgressCallback,
    isRecursive?: boolean
};

type getCreateTableQueryResult = {
    loadQuery:string,
    loadQueryOpt: string,
    // dataQuery: string,
    // dataQueryOpt: string,
    // compQuery: string,
    // compQueryOpt: string,
    tableNames: {
        load: string, data: string, comp: string
    },
    loadId: string,
    dataQueryComplete: string,
    // compQueryComplete: string
};

type previewFileInput = {
    path: string, filePattern: string,
    inputSerialization: InputSerialization,
    numRows?: number
};

type previewFileResult = {
    status: { errorMessage?: string },
    lines: Array<{
        data: any,
        schema: Schema | {},
        status: {
            hasError: boolean,
            errorMessage: string,
            unsupportedColumns: Array<{
                message: string,
                name: string,
                mapping: string
            }>
        }
    }>
};

type createPreviewTableInput = {
    path: string, filePattern: string,
    isRecursive?: boolean,
    inputSerialization: InputSerialization,
    schema: Schema,
    numRows?: number
};

type App = {
    appId: string,
    getSession: () => IXcalarSession,
    shareResultTables: (tables: any, sharedNames: any) => Promise<{
        data: SharedTable,
        icv?: SharedTable
    }>,
    // publishResultTables: (tables: any, pubNames: any, dataflows: any) => Promise<boolean>,
    createResultTables: (query: any, progressCB?: ProgressCallback) => Promise<{
        load: Table,
        loadUDFs: Set<string>
    }>,
    createResultTablesWithCancel: (query, progressCB?: ProgressCallback) => {
        cancel: () => Promise<void>,
        done: () => Promise<{
            load: Table,
            loadUDFs: Set<string>
        }>
    },
    getCreateTableQueryWithCancel: (params: getCreateTableQueryInput) => {
        cancel: () => void,
        done: () => Promise<getCreateTableQueryResult>,
        cleanup: () => Promise<void>
    },
    getCreateTableQueryWithSchema: (params: getCreateTableQueryInput) => Promise<getCreateTableQueryResult>,
    previewFile: (params: previewFileInput) => Promise<previewFileResult>,
    createPreviewTable: (params: createPreviewTableInput) => Promise<Table>,
    createICVTable: (loadTableName: string) => Promise<Table>,
    openICVTable: (icvTableName: string) => Promise<{table: Table, cursor: Cursor}>
}

function getDiscoverApp(appId) {
    if (appId == null) {
        return null;
    }
    return discoverApps.get(appId);
}

export { App, createDiscoverApp, getDiscoverApp, JobCancelExeption, defaultConnector }
