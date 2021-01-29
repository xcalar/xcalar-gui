const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const { ErrorType, status } = require('xcalarsdk').Error;
const SessionScope = require('xcalarsdk').Session.SCOPE;
const DatasetScope = require('xcalarsdk').Dataset.SCOPE;
const QueryScope = require('xcalarsdk').Query.SCOPE;
exports.testSuite = function(QueryService, SessionService, DatasetService) {
    let userName, workbookName, SESSIONSCOPE, DATASETSCOPE, QUERYSCOPE, scopeInfo, sessionId;

    describe("QueryService test: ", function () {
        this.timeout(60000);
        before( async function () {
            userName = "QueryServiceTestUser_" + new Date().getTime();
            workbookName = "QueryServiceTestSession_" + new Date().getTime();
            SESSIONSCOPE = SessionScope.WORKBOOK;
            DATASETSCOPE = DatasetScope.WORKBOOK;
            QUERYSCOPE = QueryScope.WORKBOOK;
            scopeInfo = {
                userName: userName,
                workbookName: undefined
            };
            sessionId = await SessionService.create({
                sessionName: workbookName,
                fork: false,
                forkedSessionName: "",
                scope: SESSIONSCOPE,
                scopeInfo: scopeInfo});
            await SessionService.activate({
                sessionName: workbookName,
                scope: SESSIONSCOPE,
                scopeInfo: scopeInfo});
        });

        it("list() should work", async function () {
            try {
                const listArray = await QueryService.list({ namePattern: "*" });
                // The list is not always empty, in case we already executed a query
                // For now we only test if the API call succeeds
                // XXX TODO: clear and create quries before running the test, so that we can check the count
                expect(listArray != null).to.be.true;
            } catch(err) {
                console.log("list should return an array");
                expect.fail(err);
            }
        });

        it("execute() should work", async function () {
            let datasetName = userName + ".region";
            let bulkLoadName = ".XcalarDS." + datasetName;
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
            let bulkLoadArgs = {
                parseArgs: {
                    allowFileErrors: false,
                    allowRecordErrors: false,
                    fileNameFieldName: "",
                    parserArgJson: "{\"recordDelim\":\"\\n\",\"fieldDelim\":\"\|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}",
                    parserFnName: "default:parseCsv",
                    recordNumFieldName: "",
                    schema: [
                        {columnType: "DfInt64",
                        destColumn: "R_REGIONKEY",
                        sourceColumn: "R_REGIONKEY"},
                        {columnType: "DfString",
                        destColumn: "R_NAME",
                        sourceColumn: "R_NAME"},
                        {columnType: "DfString",
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
            let bulkLoadStruct = {
                operation: "XcalarApiBulkLoad",
                args: {
                    dest: bulkLoadName,
                    loadArgs: bulkLoadArgs,
                    dagNodeId: null
                }
            }
            scopeInfo = {
                userName: userName,
                workbookName: workbookName
            };
            try {
                DatasetService.create({
                    datasetName: datasetName,
                    loadArgs: loadArgs,
                    scope: DATASETSCOPE,
                    scopeInfo: scopeInfo
                });
                const executeName = await QueryService.execute({
                    queryName: "testQuery_" + new Date().getTime(),
                    queryString: JSON.stringify([bulkLoadStruct]),
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isAsync: false
                    }});

                expect(executeName).to.not.equal("");
            } catch (err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("execute() should return error message on failure", async function () {
            let datasetName = userName + ".region2";
            let bulkLoadName = ".XcalarDS." + datasetName;
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
            let bulkLoadArgs = {};
            let bulkLoadStruct = {
                operation: "XcalarApiBulkLoad",
                args: {
                    dest: bulkLoadName,
                    loadArgs: bulkLoadArgs,
                    dagNodeId: null
                }
            }
            scopeInfo = {
                userName: userName,
                workbookName: workbookName
            };
            try {
                DatasetService.create({
                    datasetName: datasetName,
                    loadArgs: loadArgs,
                    scope: DATASETSCOPE,
                    scopeInfo: scopeInfo
                });
                const executeName = await QueryService.execute({
                    queryName: "testQuery",
                    queryString: JSON.stringify([bulkLoadStruct]),
                    scope: QUERYSCOPE,
                    scopeInfo: scopeInfo,
                    options: {
                        isAsync: false
                    }});

                expect.fail("Bulk load without loadArgs should fail");
            } catch (err) {
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_JSON_QUERY_PARSE_ERROR);
            }
        });
    });
}