import { expect } from 'chai'
import * as SchemaService from './SchemaService'
import { createDiscoverApp, defaultConnector } from './SchemaLoadService'
import { LoadSession, RandomSession, LoginSession, CurrentSession } from './sdk/Session'
import { Table } from './sdk/Table'
import { randomName } from './sdk/Api'

describe.skip('SchemaLoadService Test', function() {
    let app = null;
    let tableQuery = null;
    let resultTables = null;
    const publishedTables = {
        data: null, icv: null
    };
    const filePath = '/xcfield/instantdatamart/mdmdemo/000fccb/c86cc8b/969cffb/fec195e/3c7bbdf/4d93b0a/a9f7e3e/';
    const fileNamePattern = '24fb51.csv';
    const inputSerialization = SchemaService.defaultInputSerialization.get(SchemaService.FileType.CSV);
    const dataSchema = {
        "rowpath":"$",
        "columns":[
            {"name":"R","mapping":"$.\"R\"","type":"DfString"},
            {"name":"C","mapping":"$.\"C\"","type":"DfString"},
            {"name":"E","mapping":"$.\"E\"","type":"DfString"},
            {"name":"I","mapping":"$.\"I\"","type":"DfString"},
            {"name":"J","mapping":"$.\"J\"","type":"DfString"}
        ]
    };
    const tableSchema = [
        { "name": "R", "type": "string" },
        { "name": "C", "type": "string" },
        { "name": "E", "type": "string" },
        { "name": "I", "type": "string" },
        { "name": "J", "type": "string" },
        { "name": "XCALAR_PATH", "type": "string" }
    ];

    before(async () => {
        await cleanupLoadSession();
    });

    after(async () => {
        await cleanupLoadSession();
        await deleteResultTables();
    });

    it('Create Load App', async () => {
        app = await createDiscoverApp({
            targetName: defaultConnector,
        });
        expect(app != null, 'Check Load App').to.be.true;
    });

    it('Schema detect', async () => {
        const { lines } = await app.previewFile({
            path: filePath, filePattern: fileNamePattern,
            inputSerialization: inputSerialization
        });
        expect(Array.isArray(lines)).to.be.true;
        const { schema } = lines[0];
        expect(schema.columns.length).to.equal(dataSchema.columns.length);
    });

    /**
     * Check query strings returned by get_dataflow
     */
    it('Dataflow to create table', async () => {
        let cleanup = async () => {};
        try {
            const {
                cancel: getQueryCancel,
                done: getQueryDone,
                cleanup: getQueryCleanup
            } = app.getCreateTableQueryWithCancel({
                path: filePath, filePattern: fileNamePattern,
                inputSerialization: inputSerialization,
                isRecursive: false,
                schema: dataSchema
            });
            cleanup = getQueryCleanup;

            // Generate DFs
            tableQuery = await getQueryDone();
            expect(tableQuery != null, 'Check Table Queries').to.be.true;
        } catch(e) {
            try {
                await cleanup();
            } catch(_) {

            }
            throw e;
        }
    });

    /**
     * Check dataflow execution for creating final tables
     * Note: the execution must be kind of drop-as-you-go
     * which means the intermediate datasets/tables will be deleted during execution
     */
    it('DF execution', async () => {
        const session = app.getSession();
        const numTablesBefore = (await session.listTables({
            namePattern: '*', isGlobal: false
        })).length;
        const numDatasetsBefore = (await session.callLegacyApi(
            () => XcalarGetDatasets()
        )).datasets.length;

        // Execute DFs and create tables
        const { cancel: createCancel, done: createDone } = app.createResultTablesWithCancel(tableQuery);
        resultTables = await createDone();

        // Validation
        // Verify existence of load/data/comp tables
        expect(resultTables != null).to.be.true;
        let isICVExist = false;
        try {
            await resultTables.comp.getInfo();
            isICVExist = true;
        } catch(_) {
            isICVExist = false;
        }
        expect(isICVExist, 'Check ICV table existence').to.be.false;

        let isDataExist = false;
        try {
            await resultTables.data.getInfo();
            isDataExist = true;
        } catch(_) {
            isDataExist = false;
        }
        expect(isDataExist, 'Check Data table existence').to.be.true;

        let isLoadExist = false;
        try {
            await resultTables.load.getInfo();
            isLoadExist = true;
        } catch(_) {
            isLoadExist = false;
        }
        // Load table: XDB should be deleted, but dag should be there
        expect(isLoadExist, 'Check Load table existence').to.be.false;

        // Verify temp. table cleanup
        const numTablesAfter = (await session.listTables({
            namePattern: '*', isGlobal: false
        })).length;
        expect(numTablesAfter).to.equal(numTablesBefore + 1);

        // Verify datasets
        const numDatasetsAfter = (await session.callLegacyApi(
            () => XcalarGetDatasets()
        )).datasets.length;
        expect(numDatasetsBefore).to.equal(numDatasetsAfter);
    });


    describe('IMD Test', function() {
        /**
         * Check IMD tables created on top of final tables
         */
        it('Publish tables', async () => {
            const baseName = `TEST_LOAD_${randomName().toUpperCase()}`;
            const dataName = `${baseName}_DATA`;
            const icvName = `${baseName}_ICV`;

            // Publish tables
            const compHasData = await app.publishResultTables(
                resultTables,
                { data: dataName, comp: icvName },
                tableQuery
            );

            // Validation
            // Verify existence of IMD tables
            const dataTable = await app.getSession().getPublishedTable({ name: dataName });
            expect(dataTable != null, 'Check Data table exists').to.be.true;
            const icvTable = await app.getSession().getPublishedTable({ name: icvName });
            if (compHasData) {
                expect(icvTable != null, 'Check ICV table exists').to.be.true;
            } else {
                expect(icvTable == null, 'Check ICV table not exists').to.be.true;
            }

            publishedTables.data = dataName;
            publishedTables.icv = compHasData ? icvName : null;
        });

        /**
         * Check IMD's native restoration
         */
        it('Restore IMD table', async () => {
            const tableName = publishedTables.data;
            await deactivateIMD(tableName);
            await activateIMD(tableName);

            // Validation
            const imdTable = await app.getSession().getPublishedTable({
                name: tableName
            });
            expect(imdTable != null, 'Check Data table exists').to.be.true;
            expect(imdTable.isActive(), 'Check Data table active').to.be.true;
        });

        /**
         * Check XD's restoration
         */
        it('Restore IMD table from source node', async ()=> {
            const imdNode = await createSourceNode();
            const tableName = publishedTables.data;

            // Delete IMD table
            await deleteIMD(tableName);
            // Restore from source node
            await PTblManager.Instance.restoreTableFromNode(imdNode);

            // Validation
            const imdTable = await app.getSession().getPublishedTable({
                name: tableName
            });
            expect(imdTable != null, 'Check Data table exists').to.be.true;
            expect(imdTable.isActive(), 'Check Data table active').to.be.true;
        });

        after(async () => {
            await deleteResultTables();
        });
    });

    describe('Portability Test', function() {
        let loadUDFs = null;

        before(async () => {
            await createResultTables();
            const graph = await createLoadGraph();
            const moduleNames = graph.getUsedLoaderUDFModules();
            loadUDFs = await getUDFContent(sessionName, moduleNames);
        });

        after(async () => {
            await deleteResultTables();
        });

        afterEach(async () => {
            await removeUDFs(sessionName, loadUDFs.keys());
            await restoreLoadUDFs(loadUDFs);
        });

        /**
         * Check download app -> execute app
         */
        it('Execute Data App', async () => {
            const oldSaveFile = xcHelper.downloadAsFile;

            const randName = randomName();
            const moduleName = `test_module_${randName}`;
            const moduleId = `DF2_${randName}`;
            const appId = AppList.generateId();

            try {
                const getDownloadContent = (() => {
                    let sessionContent = null;
                    xcHelper.downloadAsFile = (_, content) => {
                        sessionContent = content;
                    };
                    return () => sessionContent;
                })();

                // Create dataflow/module with IMD node
                try {
                    await createModule({
                        moduleName: moduleName,
                        moduleId: moduleId,
                        appId: appId
                    })
                } catch(e) {
                    expect(true, e).to.be.false;
                }

                // Download App
                try {
                    const fakeTab = new DagTabPublished({
                        name: xcHelper.randName("App"),
                        dagGraph: null
                    });
                    await fakeTab.publishApp(appId);
                    await fakeTab.downloadApp('testApp')
                } catch(e) {
                    expect(true, 'Download app failed').to.be.false;
                }
                const sessionContent = getDownloadContent();
                expect(sessionContent != null).to.be.true;

                // Delete shared load udfs
                // to make sure uploaded app only calls workbook udfs
                try {
                    await removeUDFs(sessionName, loadUDFs.keys(), true);
                } catch(e) {
                    expect(true, 'Delete streaming udf failed').to.be.false;
                }
                // const xdfs = await XcalarListXdfs("*get_load_wizard_plan*", "User*");
                // console.log(xdfs);

                // Upload and execute
                try {
                    const isDataExist = await uploadAndExecute({
                        dataSchema: tableSchema,
                        sessionContent: sessionContent,
                        getModuleKey: async (execSession) => {
                            const keyList = await execSession.callLegacyApi(
                                () => XcalarKeyList('DF2_', gKVScope.WKBK)
                            );
                            return keyList.keys[0];
                        },
                    });
                    expect(isDataExist, 'Check data table existance').to.be.true;
                } catch(e) {
                    expect(true, e).to.be.false;
                }
            } finally {
                xcHelper.downloadAsFile = oldSaveFile;
                try {
                    await DagList.Instance.deleteDataflow(moduleId);
                } catch(_) {
                    // Ignore errors
                }
            }
        });

        /**
         * Check download project -> upload project -> execute DF
         */
        it('Download Project', async () => {
            const oldSaveFile = xcHelper.downloadAsFile;

            const randName = randomName();
            const moduleName = `test_module_${randName}`;
            const moduleId = `DF2_${randName}`;

            try {
                const getDownloadContent = (() => {
                    let sessionContent = null;
                    xcHelper.downloadAsFile = (_, content) => {
                        sessionContent = content;
                    };
                    return () => sessionContent;
                })();

                // Create dataflow/module with IMD node
                try {
                    await createModule({
                        moduleName: moduleName,
                        moduleId: moduleId,
                        appId: null
                    })
                } catch(e) {
                    expect(true, e).to.be.false;
                }

                // Download project
                expect(getDownloadContent() == null, 'Pre-download check').to.be.true;
                try {
                    await WorkbookManager.downloadWKBK(sessionName);
                } catch(e) {
                    console.error(e);
                    expect(true, 'Download project failed').to.be.false;
                }
                const sessionContent = getDownloadContent();
                expect(sessionContent != null, 'Post-download check').to.be.true;

                // Delete shared load udfs
                // to make sure uploaded app only calls workbook udfs
                try {
                    await removeUDFs(sessionName, loadUDFs.keys(), true);
                } catch(e) {
                    expect(true, 'Delete streaming udf failed').to.be.false;
                }
                // const xdfs = await XcalarListXdfs("*get_load_wizard_plan*", "User*");
                // console.log(xdfs);

                // Upload and execute
                try {
                    const isDataExist = await uploadAndExecute({
                        getModuleKey: async () => moduleId,
                        dataSchema: tableSchema,
                        sessionContent: sessionContent
                    });
                    expect(isDataExist, 'Check data table existance').to.be.true;
                } catch(e) {
                    expect(true, e).to.be.false;
                }
            } finally {
                xcHelper.downloadAsFile = oldSaveFile;
                try {
                    await DagList.Instance.deleteDataflow(moduleId);
                } catch(_) {
                    // Ignore errors
                }
            }

        });
    });

    // Helper Functions
    async function cleanupLoadSession() {
        try {
            const loadSession = new LoadSession();
            await loadSession.destroy();
        } catch(_) {
            // Ignore errors
        }
    }

    async function deactivateIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.deactivate();
    }

    async function activateIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.activate();
    }

    async function deleteIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.delete();
    }

    function createUserTab({ name, id, app, dagGraph }) {
        return new DagTabUser({
            name: name, id: id, app: app, dagGraph: dagGraph,
            type: 'Normal', createdTime: Date.now(),
        });
    }

    async function createResultTables() {
        const baseName = `TEST_LOAD_${randomName().toUpperCase()}`;
        const dataName = `${baseName}_DATA`;
        const icvName = `${baseName}_ICV`;

        // Create App
        app = await createDiscoverApp({
            targetName: defaultConnector,
        });

        // Get DFs
        const {
            cancel: getQueryCancel,
            done: getQueryDone,
            cleanup: getQueryCleanup
        } = app.getCreateTableQueryWithCancel({
            path: filePath, filePattern: fileNamePattern,
            inputSerialization: inputSerialization,
            isRecursive: false,
            schema: dataSchema
        });

        // Generate DFs
        const queries = await getQueryDone();

        const { cancel: createCancel, done: createDone } = app.createResultTablesWithCancel(queries);
        resultTables = await createDone();

        // Publish tables
        const compHasData = await app.publishResultTables(
            resultTables,
            { data: dataName, comp: icvName },
            queries
        );

        publishedTables.data = dataName;
        publishedTables.icv = compHasData ? icvName : null;
    }

    async function deleteResultTables() {
        try {
            if (publishedTables.data != null) {
                const pbTblInfo = new PbTblInfo({name: publishedTables.data});
                await pbTblInfo.delete();
            }
        } catch(_) {
            // Just a cleanup, ignore any errors
        }
        try {
            if (publishedTables.icv != null) {
                const pbTblInfo = new PbTblInfo({name: publishedTables.icv});
                await pbTblInfo.delete();
            }
        } catch(_) {
            // Just a cleanup, ignore any errors
        }
    }

    async function getUDFContent(workbookName, moduleNames) {
        const session = new LoginSession({ sessionName: workbookName });
        const result = new Map();
        for (const moduleName of moduleNames) {
            const udfPath = await session.callLegacyApi(
                () => XcalarUdfGetRes(XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession, moduleName)
            );
            const udfStr = await session.callLegacyApi(
                () => XcalarDownloadPython(udfPath)
            );
            result.set(moduleName, udfStr);
        }
        return result;
    }

    async function removeUDFs(workbookName, moduleNames, sharedOnly = false) {
        const sharedUDFPrefix = xcHelper.constructUDFSharedPrefix();
        const session = new LoginSession({ sessionName: workbookName });
        for (const moduleName of moduleNames) {
            const udfPaths = [{
                path: sharedUDFPrefix + moduleName,
                isAbsolute: true
            }];
            if (!sharedOnly) {
                udfPaths.push({
                    path: moduleName, isAbsolute: false
                });
            }
            for (const { path, isAbsolute } of udfPaths) {
                try {
                    await session.callLegacyApi(
                        () => XcalarDeletePython(path, isAbsolute)
                    );
                } catch(_) {
                    // Ignore error
                }
            }
        }
    }

    async function restoreLoadUDFs(udfs) {
        const sharedUDFPrefix = xcHelper.constructUDFSharedPrefix();
        const session = new CurrentSession();
        for (const [moduleName, udfStr] of udfs) {
            await session.callLegacyApi(
                () => XcalarUploadPython(sharedUDFPrefix + moduleName, udfStr, true, true)
            );
        }
    }

    async function createSourceNode() {
        const tableName = publishedTables.data;
        const imdNode = new DagNodeIMDTable({
            schema: tableSchema.map((s) => ({...s}))
        });
        imdNode.setParam({
            source: tableName,
            schema: tableSchema.map((s) => ({...s}))
        });
        await imdNode.fetchAndSetSubgraph(tableName);

        return imdNode;
    }

    async function createLoadGraph() {
        const imdNode = await createSourceNode();
        const dagGraph = new DagGraph();

        dagGraph.initialize();
        dagGraph.addNode(imdNode);
        const outNode = dagGraph.newNode({
            type: DagNodeType.DFOut
        });
        outNode.setParam({
            name: `test_out_${randomName()}`,
            linkAfterExecution: false
        });
        dagGraph.connect(imdNode.getId(), outNode.getId());

        return dagGraph;
    }

    async function uploadAndExecute({ getModuleKey, dataSchema, sessionContent }) {
        const randName = randomName();

        // Upload project
        const execSession = new RandomSession();
        try {
            await execSession.callLegacyApi(
                () => XcalarUploadWorkbook(execSession.sessionName, sessionContent, '')
            );
        } catch(e) {
            console.error(e);
            throw 'Upload app failed';
        }

        try {
            try {
                await execSession.activate();
            } catch(e) {
                console.error(e);
                throw 'Activate execution session failed';
            }

            // Get graph to execute
            const execGraph = new DagGraph();
            try {
                const moduleKey = await getModuleKey(execSession);
                const execSerializedGraph = (await execSession.callLegacyApi(
                    () => XcalarKeyLookup(moduleKey, gKVScope.WKBK)
                )).value;
                execGraph.create(JSON.parse(execSerializedGraph).dag);
            } catch(e) {
                console.error(e);
                throw 'Create graph failed';
            }

            // Optimized execute
            let destTable;
            try {
                const retinaInfo = (await execGraph.getRetinaArgs()).retina;
                const tables = JSON.parse(retinaInfo.retina).tables;
                destTable = tables[tables.length - 1].name;

                await execSession.executeQueryOptimized({
                    queryStringOpt: retinaInfo.retina,
                    queryName: `ret_${randName}`,
                    tableName: destTable
                });
            } catch(e) {
                console.error(e);
                throw 'Execute app failed';
            }

            // Validation
            const dataTable = new Table({ session: execSession, tableName: destTable });
            let isDataExist = false;
            try {
                const tableInfo = await dataTable.getInfo();
                expect(tableInfo.columns.length, 'Validate table metadata').to.equal(dataSchema.length);
                isDataExist = true;
            } catch(_) {
                isDataExist = false;
            }

            return isDataExist;
        } finally {
            // Cleanup
            await execSession.destroy();
        }
    }

    async function createModule({ moduleName, moduleId, appId}) {
        // Create dataflow with IMD node
        let dagGraph = null;
        try {
            dagGraph = await createLoadGraph();
        } catch(e) {
            console.error(e);
            throw 'Create dataflow failed';
        }

        // Create Module
        try {
            const moduleTab = createUserTab({
                name: moduleName,
                id: moduleId,
                app: appId,
                dagGraph: dagGraph
            });
            DagList.Instance.addDag(moduleTab);
            await DagList.Instance.saveUserDagList();
            moduleTab.forceTurnOnSave(); // Make sure the save is happening right now
            await moduleTab.save();
        } catch(e) {
            console.error(e);
            throw 'Create module failed';
        }
    }
});