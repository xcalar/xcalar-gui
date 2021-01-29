const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const { ErrorType, status } = require('xcalarsdk').Error;
const sessionScope = require('xcalarsdk').Session.SCOPE;
const targetScope = require('xcalarsdk').Target.SCOPE;
exports.testSuite = function(TargetService, SessionService) {
    let userName, workbookName, SESSIONSCOPE, TARGETSCOPE, scopeInfo, sessionId;

    describe("TargetService test: ", function () {
        this.timeout(60000);
        before( async function () {
            userName = "TargetServiceTestUser_" + new Date().getTime();
            workbookName = "TargetServiceTestSession_" + new Date().getTime();
            SESSIONSCOPE = sessionScope.WORKBOOK;
            TARGETSCOPE = targetScope.WORKBOOK;
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

        it("run should work", async function () {
            const targetType = "sharednothingsingle";
            const targetName = "test";
            const targetParams = {};
            const addObj = {"func": "addTarget",
                            "targetTypeId": targetType,
                            "targetName": targetName,
                            "targetParams": targetParams};
            const deleteObj = {func: "deleteTarget",
                               targetName: targetName};
            const listObj = {func: "listTargets"};
            const listTypeObj = {func: "listTypes"};
            try {
                const listTypeRes = await TargetService.run({
                    inputJson: listTypeObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(listTypeRes).to.not.equal("");
                const listResBefore = await TargetService.run({
                    inputJson: listObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                const addRes = await TargetService.run({
                    inputJson: addObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(addRes).to.equal('{"status": "success"}');
                const listRes = await TargetService.run({
                    inputJson: listObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(JSON.parse(listRes).length).to.equal(JSON.parse(listResBefore).length + 1);
                const deleteRes = await TargetService.run({
                    inputJson: deleteObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(deleteRes).to.equal('{"status": "success"}');
                const listResAfter = await TargetService.run({
                    inputJson: listObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect(JSON.parse(listResAfter).length).to.equal(JSON.parse(listResBefore).length);
                // XXX Session delete is not wired in so this session would be left there
            } catch(err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("run should return error message on failure", async function () {
            const badObj = {"func": "NotExist"};
            try {
                const targetRes = await TargetService.run({
                    inputJson: badObj,
                    scope: TARGETSCOPE,
                    scopeInfo: scopeInfo
                });
                expect.fail("Target service should fail on method not exist");
            } catch(err) {
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_UDF_EXECUTE_FAILED);
            }
        });
    });
}