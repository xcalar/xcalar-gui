const expect = require('chai').expect;
const XcrpcSDK = require('xcalarsdk');
const createDatasetHelper = require('./common/DatasetHelper');
const createQueryHelper = require('./common/QueryHelper');
const createSessionHelper = require('./common/SessionHelper');
const { PythonShell } = require('python-shell');

exports.testSuite = function(dataflowService) {
    const sdkClient = XcrpcSDK.getClient(XcrpcSDK.DEFAULT_CLIENT_NAME);

    // Random id for the current test
    const testId = Math.floor(Math.random()*90000) + 10000;

    // userName and sessionName for the current test
    const testUserName = "testUserDataflow";
    const testSessionName = "testSessionDataflow" + testId;

    // dataset helper
    const testDSKey = 'nation';
    const datasetHelper = createDatasetHelper({
        sdkClient: sdkClient,
        userName: testUserName,
        sessionName: testSessionName,
        dsKey: testDSKey,
        dsPrefix: `${testUserName}.${testSessionName}`
    });
    // query helper
    const queryHelper = createQueryHelper({
        sdkClient: sdkClient,
        userName: testUserName,
        sessionName: testSessionName,
        objectPrefix: `${testUserName}_${testSessionName}`
    });
    // session helper
    const sessionHelper = createSessionHelper({
        sdkClient: sdkClient,
        userName: testUserName,
        sessionName: testSessionName
    });

    describe("DataflowService test: ", function() {
        const retinaPrefix = `xcRet_${testUserName}_${testSessionName}`;
        let retinaId = 0;
        function genRetinaName() {
            return `${retinaPrefix}_${Date.now()}_${retinaId ++}`;
        }

        before(async () => {
            try {
                await sessionHelper.createAndActivate();
            } catch(e) {
                expect.fail(null, null, `Test preparation failed: ${e}`);
            }
        });

        describe("executeOptimized() test", function() {
            let testDSName;

            before(async () => {
                // Prepare the dataset
                testDSName = await datasetHelper.createDS();
            });

            after(async () => {
                // XXX TODO: cleanup resources
                // Delete retina
                // Delete dataset
            });

            it('Case: regular input', async () => {
                // Query string for bulkLoad and index dataset
                const { queryString, table } = queryHelper.genLoadDSQuery(
                    queryHelper.getOptimizedDSName(testDSName),
                    datasetHelper.getLoadArgs(),
                    testDSKey, new Set(['N_NATIONKEY'])
                );

                // Import retina from query string
                const retinaName = genRetinaName();
                const retinaJson = JSON.stringify({
                    query: queryString,
                    tables: [table]
                });
                // console.log(testDSName, retinaName, retinaJson);
                await importRetina(testUserName, testSessionName, retinaName, retinaJson);

                // Execute the retina
                let res = null;
                let error = null;
                try {
                    res = await dataflowService.executeOptimized({
                        dataflowName: retinaName,
                        scope: XcrpcSDK.Dataflow.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    })
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error).to.be.null;
                // Result check
                expect(res).to.not.be.null;
            });

            it('Case: with tableName & queryName', async () => {
                // Query string for bulkLoad and index dataset
                const { queryString, table } = queryHelper.genLoadDSQuery(
                    queryHelper.getOptimizedDSName(testDSName),
                    datasetHelper.getLoadArgs(),
                    testDSKey, new Set(['N_NATIONKEY'])
                );

                // Import retina from query string
                const retinaName = genRetinaName();
                const retinaJson = JSON.stringify({
                    query: queryString,
                    tables: [table]
                });
                // console.log(testDSName, retinaName, retinaJson);
                await importRetina(testUserName, testSessionName, retinaName, retinaJson);

                // Execute the retina
                const destTableName = queryHelper.genTableName()
                const queryName = queryHelper.getQueryName(destTableName);
                let res = null;
                let error = null;
                try {
                    res = await dataflowService.executeOptimized({
                        dataflowName: retinaName,
                        scope: XcrpcSDK.Dataflow.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        },
                        options: {
                            queryName: queryName,
                            isExportToActiveSession: true,
                            destTableName: destTableName,
                            udfUserName: testUserName,
                            udfSessionName: testSessionName,
                        }
                    })
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error).to.be.null;
                // Result check
                expect(res).to.equal(queryName);
                // XXX TODO: Check destTable existence
            });

            it('Case: with parameters', async () => {
                // Setup parameters
                const loadArgs = datasetHelper.getLoadArgs();
                loadArgs.sourceArgsList[0].targetName = '<target_name>';
                const parameters = new Map();
                parameters.set('targetName', 'Default Shared Root');

                // Query string for bulkLoad and index dataset
                const { queryString, table } = queryHelper.genLoadDSQuery(
                    queryHelper.getOptimizedDSName(testDSName),
                    datasetHelper.getLoadArgs(),
                    testDSKey, new Set(['N_NATIONKEY'])
                );

                // Import retina from query string
                const retinaName = genRetinaName();
                const retinaJson = JSON.stringify({
                    query: queryString,
                    tables: [table]
                });
                // console.log(testDSName, retinaName, retinaJson);
                await importRetina(testUserName, testSessionName, retinaName, retinaJson);

                // Execute the retina
                let res = null;
                let error = null;
                try {
                    res = await dataflowService.executeOptimized({
                        dataflowName: retinaName,
                        scope: XcrpcSDK.Dataflow.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        },
                        parameters: parameters
                    })
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error).to.be.null;
                // Result check
                expect(res).to.not.be.null;
            });

            // XXX TODO: This should be replaced by importRetina API
            function importRetina(userName, sessionName, retinaName, retinaJson) {
                return new Promise((resolve, reject) => {
                    PythonShell.run(
                        'importRetina.py',
                        { args: [`-s${sessionName}`, `-u${userName}`, `-r${retinaName}`, `-j${retinaJson}`] },
                        function(err, result) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        }
                    );
                });
            }
        });
    });

}
