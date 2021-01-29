const expect = require('chai').expect;
const {PythonShell} = require('python-shell');
exports.testSuite = function(PublishedTableService, SCOPE, STATUS) {
    let sessionName;
    const tableName = "REGION";
    const userName = "admin"
    let selectInfo = [];
    const schema = [
        {columnType: 4,
        sourceColumn: "R_REGIONKEY",
        destColumn:  "R_REGIONKEY"},
        {columnType: 1,
        destColumn: "R_NAME",
        sourceColumn: "R_NAME"},
        {columnType: 1,
        destColumn: "R_COMMENT",
        sourceColumn: "R_COMMENT"}
    ]
    describe("PublishedTableService test: ", function () {
        before(function(done){
            this.timeout(9000);
            PythonShell.run('publishTable.py', null, function(err,result) {
                if(err) throw err;
                sessionName = result[0];
                done()
            });
        });
        //TODO backend not implement yet
        it("select() should work with simple case", async function () {
            let responseTable;
            let srcTable = tableName
            let dstTable = srcTable + new Date().getTime();
            let minBatchId = -1;
            let maxBatchId = -1;
            let filterString = "";
            let limitRows = 40;
            let columnsInfo = schema;
            let scopeInfo = {
                userName : userName,
                workbookName: sessionName
            }
            try {
                responseTable = await PublishedTableService.select ({
                    srcTable: srcTable, destTable: dstTable, minBatchId: minBatchId, maxBatchId: maxBatchId, filterString: filterString,
                    limitRows:limitRows, columnArray: columnsInfo, scopeInfo:scopeInfo, scope: SCOPE.WORKBOOK
                });
            } catch (err) {
                console.log("select() should work");
                expect.fail(null, null, err.error);
            }
            expect(responseTable).to.equal(dstTable);
            selectInfo.push({source: srcTable, dest: dstTable, minBatchId: 0, maxBatchId:0});
        });

        it("select() should work with filter string", async function () {
            let responseTable;

            let srcTable = tableName
            let dstTable = srcTable + new Date().getTime();
            let minBatchId = -1;
            let maxBatchId = -1;
            let filterString = "le(R_REGIONKEY, 2)";
            let limitRows = 40;
            let columnsInfo = schema;
            let scopeInfo = {
                userName : userName,
                workbookName: sessionName
            }
            try {
                responseTable = await PublishedTableService.select ({
                    srcTable: srcTable, destTable: dstTable, minBatchId: minBatchId, maxBatchId: maxBatchId, filterString: filterString,
                    limitRows:limitRows, columnArray: columnsInfo, scopeInfo:scopeInfo, scope: SCOPE.WORKBOOK
                });
            } catch (err) {
                console.log("select() with filterString should work");
                expect.fail(null, null, err.error);
            }
            expect(responseTable).to.equal(dstTable);
            selectInfo.push({source: srcTable, dest: dstTable, minBatchId: 0, maxBatchId:0});
        });

        it("select() should handle the error when the scopeinfo is not correct ", async function () {
            let srcTable = tableName
            let dstTable = srcTable + new Date().getTime();
            let minBatchId = -1;
            let maxBatchId = -1;
            let filterString = "";
            let limitRows = 40;
            let columnsInfo = schema
            let scopeInfo = {
                userName : userName,
                workbookName: "notVaildSession"
            }
            try {
                responseTable = await PublishedTableService.select ({
                    srcTable: srcTable, destTable: dstTable, minBatchId: minBatchId, maxBatchId: maxBatchId, filterString: filterString,
                    limitRows:limitRows, columnArray: columnsInfo, scopeInfo:scopeInfo, scope: SCOPE.WORKBOOK
                });
                expect.fail(null, null, "Should return error when scopeinfo is not correct")
            } catch (err) {
                expect(err.status).to.equal(STATUS.STATUS_SESSION_NOT_FOUND);
            }
        });

        it("select() should handle the error when the BatchId is not correct", async function() {
            let srcTable = tableName
            let dstTable = srcTable + new Date().getTime();
            let minBatchId = 1;
            let maxBatchId = -2;
            let filterString = "";
            let limitRows = 40;
            let columnsInfo = schema
            let scopeInfo = {
                userName : userName,
                workbookName: sessionName
            };
            try {
                responseTable = await PublishedTableService.select ({
                    srcTable: srcTable, destTable: dstTable, minBatchId: minBatchId, maxBatchId: maxBatchId, filterString: filterString,
                    limitRows:limitRows, columnArray: columnsInfo, scopeInfo:scopeInfo, scope: SCOPE.WORKBOOK
                });
                expect.fail(null, null, "Should return error when scopeinfo is not correct")
            } catch (err) {
                expect(err.status).to.equal(STATUS.STATUS_INVAL);
            }
        })

        it("listTables() should work", async function () {
            let response = {};
            let numTables;
            let tables;
            try {
                response = await PublishedTableService.listTables({
                    patternStr: tableName,
                    getSelects: true,
                    getUpdates: true,
                    updateStartBatchId: -1
                });
                numTables = response.numTables;
                tables = response.tables;
            } catch (err) {
                console.log("listTables() should work");
                expect.fail(null, null, err.error);
            }
            expect(Number.isInteger(numTables)).to.be.true;
            expect(Array.isArray(tables)).to.be.true;
            expect(tables.length).to.equal(1);

            const table = tables[0];
            expect(table.name).to.equal(tableName);
            expect(table.sessionName).to.equal(sessionName);
            expect(table.userIdName).to.equal(userName);
            expect(table.updates.length).to.equal(1);

            // test to make sure update has the correct attribute
            const update = table.updates[0];
            expect(update).to.have.property("source");
            expect(update).to.have.property("batchId");
            expect(update).to.have.property("numRows");
            expect(update).to.have.property("numInsterts");
            expect(update).to.have.property("numUpdated");
            expect(update).to.have.property("numDeletes");
            expect(update).to.have.property("size");
            expect(update).to.have.property("startTS");
        });

        it("listTables() with select should work", async function () {
            let response = {};
            let tables;
            try {
                response = await PublishedTableService.listTables({ patternStr: tableName, updateStartBatchId: 0,
                    getUpdates: false, getSelects: true});
                tables = response.tables;
            } catch (err) {
                expect.fail(null, null, err.error);
            }
            expect(tables[0].selects).to.include(selectInfo[0]);
            expect(tables[0].selects).to.include(selectInfo[1]);
        });

    });
}