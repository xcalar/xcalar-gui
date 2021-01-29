const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const { ErrorType, status } = require('xcalarsdk').Error;
const errorStr = require('xcalarsdk').EnumMap.StatusToStr;
const SessionScope = require('xcalarsdk').Session.SCOPE;
const DatasetScope = require('xcalarsdk').Dataset.SCOPE;
const ResultSetScope = require('xcalarsdk').ResultSet.SCOPE;
const QueryScope = require('xcalarsdk').Query.SCOPE;
const OperatorScope = require('xcalarsdk').Operator.SCOPE;
exports.testSuite = function(ResultSetService, SessionService, DatasetService, QueryService, OperatorService) {
    let userName, workbookName, SESSIONSCOPE, DATASETSCOPE, RESULTSETSCOPE, QUERYSCOPE, OPERATORSCOPE, scopeInfo, sessionId, datasetName, bulkLoadName, resultSetId;

    describe("ResultSetService test: ", function () {
        this.timeout(60000);
        before( async function () {
            userName = "ResultSetServiceTestUser_" + new Date().getTime();
            workbookName = "ResultSetServiceTestSession_" + new Date().getTime();
            SESSIONSCOPE = SessionScope.WORKBOOK;
            DATASETSCOPE = DatasetScope.WORKBOOK;
            RESULTSETSCOPE = ResultSetScope.WORKBOOK;
            QUERYSCOPE = QueryScope.WORKBOOK;
            OPERATORSCOPE = OperatorScope.WORKBOOK;
            scopeInfo = {
                userName: userName,
                workbookName: undefined
            };
            datasetName = userName + ".region";
            bulkLoadName = ".XcalarDS." + datasetName;
            let loadArgs = {
                parseArgs: {
                    allowFileErrors: false,
                    allowRecordErrors: false,
                    fileNameFieldName: "",
                    parserArgJson: "{\"recordDelim\":\"\\n\",\"fieldDelim\":\"\|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}",
                    parserFnName: "default:parseCsv",
                    recordNumFieldName: "",
                    schema: [
                        {columnType: 4,
                        destColumn: "R_REGIONKEY",
                        sourceColumn: "R_REGIONKEY"},
                        {columnType: 1,
                        destColumn: "R_NAME",
                        sourceColumn: "R_NAME"},
                        {columnType: 1,
                        destColumn: "R_COMMENT",
                        sourceColumn: "R_COMMENT"}
                    ]
                },
                size: 10737418240,
                sourceArgsList: [
                    {fileNamePattern: "",
                    path: "/netstore/datasets/tpch_sf1_notrail/region.tbl",
                    recursive: false,
                    targetName: "Default Shared Root"}
                ]
            };
            try {
                sessionId = await SessionService.create({
                    sessionName: workbookName,
                    fork: false,
                    forkedSessionName: "",
                    scope: SESSIONSCOPE,
                    scopeInfo: scopeInfo
                });
                await SessionService.activate({
                    sessionName: workbookName,
                    scope: SESSIONSCOPE,
                    scopeInfo: scopeInfo
                });
                scopeInfo = {
                    userName: userName,
                    workbookName: workbookName
                };
                DatasetService.create({
                    datasetName: datasetName,
                    loadArgs: loadArgs,
                    scope: DATASETSCOPE,
                    scopeInfo: scopeInfo
                });
                await OperatorService.opBulkLoad({
                    datasetName: bulkLoadName,
                    loadArgs: loadArgs,
                    scope: OPERATORSCOPE,
                    scopeInfo: scopeInfo
                });
            } catch (err) {
                console.log(err);
                expect.fail(null, null, "Failed to initialize session and datasets for resultSetService test");
            }
        });

        it("make from dataset and release should work", async function () {
            try {
                const resultSetRes = await ResultSetService.make({
                    name: bulkLoadName,
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.DATASET,
                    scopeInfo: scopeInfo
                });
                expect(resultSetRes.num_rows).to.equal(5);
                expect(resultSetRes.id).to.not.equal(undefined);
                resultSetId = resultSetRes.id;
                await ResultSetService.release({
                    result_set_id: resultSetId,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
            } catch (err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("make should return error message on failure", async function () {
            scopeInfo = {
                userName: userName,
                workbookName: workbookName
            };
            try {
                await ResultSetService.make({
                    name: "DatasetNotExist",
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.DATASET,
                    scopeInfo: scopeInfo
                });
                expect.fail("make result set should fail when dataset not exist");
            } catch (err) {
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_DS_NOT_FOUND);
                expect(err.error).to.equal(errorStr[status.STATUS_DS_NOT_FOUND]);
            }
        });

        it("result set seek and next should work", async function () {
            try {
                const resultSetRes = await ResultSetService.make({
                    name: bulkLoadName,
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.DATASET,
                    scopeInfo: scopeInfo
                });
                resultSetId = resultSetRes.id;
                const position = 0;
                const numEntries = 5;
                await ResultSetService.seek({
                    result_set_id: resultSetId,
                    row_index: position,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                const nextRes = await ResultSetService.next({
                    result_set_id: resultSetId,
                    num_rows: numEntries,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(nextRes.metas.length).to.equal(5);
                expect(nextRes.rows.length).to.equal(5);
                expect(nextRes.metas[0][0].length).to.equal(3);
                await ResultSetService.release({
                    result_set_id: resultSetId,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
            } catch (err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("result set seek should return error message on failure", async function () {
            try {
                const resultSetRes = await ResultSetService.make({
                    name: bulkLoadName,
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.DATASET,
                    scopeInfo: scopeInfo
                });
                resultSetId = resultSetRes.id;
                const position = 9;
                await ResultSetService.seek({
                    result_set_id: resultSetId,
                    row_index: position,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect.fail("should reject seek with invalid position");
            } catch (err) {
                await ResultSetService.release({
                    result_set_id: resultSetId,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_POSITION_EXCEED_RESULT_SET_SIZE);
                expect(err.error).to.equal(errorStr[status.STATUS_POSITION_EXCEED_RESULT_SET_SIZE]);
            }
        });

        it("result set next should return error message on failure", async function () {
            try {
                const resultSetRes = await ResultSetService.make({
                    name: bulkLoadName,
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.DATASET,
                    scopeInfo: scopeInfo
                });
                resultSetId = resultSetRes.id;
                const invalidRSId = 0;
                const position = 0;
                const numEntries = 5;
                await ResultSetService.seek({
                    result_set_id: resultSetId,
                    row_index: position,
                    scope: RESULTSETSCOPE,

                    scopeInfo: scopeInfo
                });
                const nextRes = await ResultSetService.next({
                    result_set_id: invalidRSId,
                    num_rows: numEntries,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect.fail("should reject next with invalid numEntries");
            } catch (err) {
                await ResultSetService.release({
                    result_set_id: resultSetId,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_INVALID_RESULT_SET_ID);
                expect(err.error).to.equal(errorStr[status.STATUS_INVALID_RESULT_SET_ID]);
            }
        });

        it("make from table should work", async function () {
            const tableName = "ResultSetServiceTestTable#t_" + new Date().getTime();
            const queryStruct = [{
                operation: "XcalarApiIndex",
                args: {
                    source: bulkLoadName,
                    dest: tableName,
                    prefix: "region",
                    dhtName: "",
                    broadcast: false,
                    delaySort: false,
                    key: [{
                        keyFieldName: "",
                        name: "xcalarRecordNum",
                        ordering: "Unordered",
                        type: "DfUnknown"
                    }]
                }
            }];
            const dropQueryName = "Drop_" + new Date().getTime();
            const dropStruct = [{
                operation: "XcalarApiDeleteObjects",
                args: {
                    namePattern: tableName,
                    srcType: "Table"
                }
            }];
            try {
                const queryRes = await QueryService.execute({
                    queryName: tableName,
                    queryString: JSON.stringify(queryStruct),
                    scheduledName: "",
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isBailOnError: true,
                        isAsync: false
                    }
                });
                expect(queryRes).to.equal(tableName);
                const resultSetRes = await ResultSetService.make({
                    name: tableName,
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.TABLE,
                    scopeInfo: scopeInfo
                });
                expect(resultSetRes.num_rows).to.equal(5);
                expect(resultSetRes.id).to.not.equal(undefined);
                expect(resultSetRes.tableMeta.datasets[0]).to.equal(bulkLoadName);
                expect(resultSetRes.tableMeta.columnsAttributes.length).to.equal(1);
                resultSetId = resultSetRes.id;
                await ResultSetService.release({
                    result_set_id: resultSetId,
                    scope: RESULTSETSCOPE,
                    scopeInfo: scopeInfo
                });
                await QueryService.execute({
                    queryName: dropQueryName,
                    queryString: JSON.stringify(dropStruct),
                    scheduledName: "",
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isBailOnError: false,
                        isAsync: false
                    }
                });
            } catch (err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("make from table should return error message on failure", async function () {
            const tableName = "ResultSetServiceTestTable#t_" + new Date().getTime();
            const queryStruct = [{
                operation: "XcalarApiIndex",
                args: {
                    source: bulkLoadName,
                    dest: tableName,
                    prefix: "region",
                    dhtName: "",
                    broadcast: false,
                    delaySort: false,
                    key: [{
                        keyFieldName: "",
                        name: "xcalarRecordNum",
                        ordering: "Unordered",
                        type: "DfUnknown"
                    }]
                }
            }];
            const dropQueryName = "Drop_" + new Date().getTime();
            const dropStruct = [{
                operation: "XcalarApiDeleteObjects",
                args: {
                    namePattern: tableName,
                    srcType: "Table"
                }
            }];
            try {
                await QueryService.execute({
                    queryName: tableName,
                    queryString: JSON.stringify(queryStruct),
                    scheduledName: "",
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isBailOnError: true,
                        isAsync: false
                    }
                });
                await ResultSetService.make({
                    name: "tableNotExist",
                    scope: RESULTSETSCOPE,
                    error_dataset: false,
                    make_type: proto.xcalar.compute.localtypes.ResultSet.MakeType.TABLE,
                    scopeInfo: scopeInfo
                });
                expect.fail("should fail result set make when table name invalid");
            } catch (err) {
                await QueryService.execute({
                    queryName: dropQueryName,
                    queryString: JSON.stringify(dropStruct),
                    scheduledName: "",
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isBailOnError: false,
                        isAsync: false
                    }
                });
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_DAG_NODE_NOT_FOUND);
                expect(err.error).to.equal(errorStr[status.STATUS_DAG_NODE_NOT_FOUND]);
            }
        });
    });
}