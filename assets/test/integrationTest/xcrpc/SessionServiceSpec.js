const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const { ErrorType, status } = require('xcalarsdk').Error;
const errorStr = require('xcalarsdk').EnumMap.StatusToStr;
const sessionScope = require('xcalarsdk').Session.SCOPE;
exports.testSuite = function(SessionService) {
    let userName;

    describe("SessionService test: ", function () {
        this.timeout(60000);
        before(function () {
            userName = "SessionServiceTestUser_" + new Date().getTime();
        });

        it("new should work", async function () {
            let sessionName = "SessionServiceTestNew_" + new Date().getTime();
            try {
                let SCOPE = sessionScope.WORKBOOK;
                let scopeInfo = {
                    userName: userName,
                    workbookName: undefined
                };
                const sessionId = await SessionService.create({
                    sessionName: sessionName,
                    fork: false,
                    forkedSessionName: "",
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                expect(sessionId).to.not.equal("");
                // Session delete is not wired in so this session would be left there
            } catch(err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("new should work with fork", async function () {
            let sessionName1 = "SessionServiceTestNewFork_" + new Date().getTime();
            let sessionName2 = "SessionServiceTestNewFork2_" + new Date().getTime();
            try {
                let SCOPE = sessionScope.WORKBOOK;
                let scopeInfo = {
                    userName: userName,
                    workbookName: undefined
                };
                const sessionId = await SessionService.create({
                    sessionName: sessionName1,
                    fork: false,
                    forkedSessionName: "",
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                const sessionId2 = await SessionService.create({
                    sessionName: sessionName2,
                    fork: true,
                    forkedSessionName: sessionName1,
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                expect(sessionId).to.not.equal("");
                expect(sessionId2).to.not.equal("");
                // Session delete is not wired in so this session would be left there
            } catch(err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("new should return error message on failure", async function () {
            let sessionName = "SessionServiceTestNewNeg_" + new Date().getTime();
            let errorName = "SessionNotExist_" + new Date().getTime();
            try {
                let SCOPE = sessionScope.WORKBOOK;
                let scopeInfo = {
                    userName: userName,
                    workbookName: undefined
                };
                const sessionId = await SessionService.create({
                    sessionName: sessionName,
                    fork: true,
                    forkedSessionName: errorName,
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                expect.fail("Session create should fail with invalid fork session name");
                // Session delete is not wired in so this session would be left there
            } catch(err) {
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_SESSION_NOT_FOUND);
                expect(err.error).to.equal(errorStr[status.STATUS_SESSION_NOT_FOUND]);
            }
        });

        it("activate should work", async function () {
            let sessionName = "SessionServiceTestActivate_" + new Date().getTime();
            try {
                let SCOPE = sessionScope.WORKBOOK;
                let scopeInfo = {
                    userName: userName,
                    workbookName: undefined
                };
                const sessionId = await SessionService.create({
                    sessionName: sessionName,
                    fork: false,
                    forkedSessionName: "",
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                const response = await SessionService.activate({
                    sessionName: sessionName,
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                // Session delete is not wired in so this session would be left there
            } catch(err) {
                console.log(err);
                expect.fail(err);
            }
        });

        it("activate should return error message on failure", async function () {
            let errorName = "SessionNotExist_" + new Date().getTime();
            try {
                let SCOPE = sessionScope.WORKBOOK;
                let scopeInfo = {
                    userName: userName,
                    workbookName: undefined
                };
                const response = await SessionService.activate({
                    sessionName: errorName,
                    scope: SCOPE,
                    scopeInfo: scopeInfo});
                expect.fail("Session activate should fail with invalid session name");
                // Session delete is not wired in so this session would be left there
            } catch(err) {
                expect(err.type).to.equal(ErrorType.XCALAR);
                expect(err.status).to.equal(status.STATUS_SESSION_NOT_FOUND);
                expect(err.error).to.equal(errorStr[status.STATUS_SESSION_NOT_FOUND]);
            }
        });
    });
}