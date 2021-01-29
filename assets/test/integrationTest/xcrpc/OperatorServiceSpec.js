const expect = require('chai').expect;
const XcrpcSDK = require('xcalarsdk');
const { ErrorType, status: ErrorStatus } = XcrpcSDK.Error;
const createDatasetHelper = require('./common/DatasetHelper');
const createQueryHelper = require('./common/QueryHelper');
const createSessionHelper = require('./common/SessionHelper');

exports.testSuite = function(operatorService) {
    const sdkClient = XcrpcSDK.getClient(XcrpcSDK.DEFAULT_CLIENT_NAME);

    // Random id for the current test
    const testId = Math.floor(Math.random()*90000) + 10000;

    // userName and sessionName for the current test
    const testUserName = "testUserOperator";
    const testSessionName = "testSessionOperator" + testId;

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

    describe("OperatorService test: ", function() {

        before(async () => {
            try {
                await sessionHelper.createAndActivate();
            } catch(e) {
                expect.fail(null, null, `Test preparation failed: ${e}`);
            }
        });

        after(async () => {
            // XXX TODO: delete dataset and session/workbook
        });

        describe("opBulkLoad() test", function() {
            it("Case: w/o loadArgs on existing DS", async () => {
                // Prepare the test dataset
                const testDSName = await datasetHelper.createDS();

                // Call service to activate a DS
                let res = null;
                let error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});
            });

            // XXX TODO: equal to createDataset() ?
            it("Case: with loadArgs on new DS", async () => {
                // Call service to create a DS
                let res = null;
                let error = null;
                try {
                    res = await operatorService.opBulkLoad({
                        datasetName: datasetHelper.genDSName(),
                        loadArgs: datasetHelper.getLoadArgs(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});
            });

            // XXX TODO: Not sure what's the expected behavior, disable for now
            // it("Case: with loadArgs on existing DS", async () => {
            //     // Prepare the test dataset
            //     const testDSName = await datasetHelper.createDS();

            //     // Call service with the same DS name
            //     let res = null;
            //     let error = null;
            //     try {
            //         res = await operatorService.opBulkLoad({
            //             datasetName: testDSName,
            //             loadArgs: datasetHelper.getLoadArgs(),
            //             scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
            //             scopeInfo: {
            //                 userName: testUserName, workbookName: testSessionName
            //             }
            //         });
            //     } catch(e) {
            //         error = e;
            //     }

            //     // Expect error "Dataset name already exists"
            //     expect(error).to.not.be.null;
            //     expect(error.type).to.equal(ErrorType.XCALAR);
            //     expect(error.status).to.equal(ErrorStatus.STATUS_DATASET_NAME_ALREADY_EXISTS);
            // });

            // Activate twice
            it("Case: w/o loadArgs multiple times on existing DS", async () => {
                // Prepare the test dataset
                const testDSName = await datasetHelper.createDS();

                // Call service to activate a DS
                let res = null;
                let error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});

                // Call service the second time
                res = null;
                error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // Expect error "Dataset name already exists"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_DATASET_NAME_ALREADY_EXISTS);
            });
        });

        describe("export() test", function() {
            let indexTableName;
            before(async () => {
                // Prepare the dataset
                const datasetName = await datasetHelper.createDS();
                // Activate the dataset
                const loadDSName = await queryHelper.activateDataset(datasetName);
                // Prepare the index table from dataset
                indexTableName = await queryHelper.indexDataset(loadDSName, testDSKey);
            });

            it("Case: regular", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {
                            target: 'Default Shared Root',
                            file_path: '/tmp/testOperator.csv',
                            header: true,
                            field_delim: '\t',
                            record_delim: '\n',
                            quote_delim: '"'
                        },
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // No error expected
                expect(error, JSON.stringify(error)).to.be.null;
                // Result should be {}
                expect(res).to.deep.equal({});
            });

            it("Case: no access permission", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {
                            target: 'Default Shared Root',
                            file_path: '/testOperator.csv',
                            header: true,
                            field_delim: '\t',
                            record_delim: '\n',
                            quote_delim: '"'
                        },
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // Expect error "Failed to execute user-defined function/application"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_UDF_EXECUTE_FAILED);
            });

            it("Case: invalid parameter", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {},
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // Expect error "Failed to execute user-defined function/application"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_UDF_EXECUTE_FAILED);
            });
        });
    });
}