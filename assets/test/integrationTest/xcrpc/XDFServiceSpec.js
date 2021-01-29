const expect = require('chai').expect;
const XDF = require('xcalarsdk').XDF;
exports.testSuite = function(XDFService) {
     describe("XDFService test: ", function () {
        it("listXdfs should work", async function() {
            let response = null;
            let error = null;

            try {
                response = await XDFService.listXdfs({
                    fnNamePattern: "*", categoryPattern: "*", scope: XDF.SCOPE.GLOBAL
                });
            } catch(err) {
                error = err;
            }

            // Error test
            expect(error == null).to.be.true;

            // General response test
            expect(response == null).to.be.false;
            expect(Array.isArray(response)).to.be.true;
            expect(response.length).to.gt(0);

            // function description structure test
            const expectedFunctionFields = ['argDescs', 'category', 'displayName', 'fnDesc', 'fnName', 'isSingletonOutput', 'numArgs', 'outputType'];
            const functionDesc = response[0];
            for (const field of expectedFunctionFields) {
                expect(functionDesc.hasOwnProperty(field), `fnDesc is missing field "${field}"`).to.be.true;
            }

            // argument description structure test
            const expectedArgFields = ['argDesc', 'argType', 'isSingletonValue', 'maxArgs', 'minArgs', 'typesAccepted'];
            expect(Array.isArray(functionDesc.argDescs)).to.be.true;
            const argumentDesc = functionDesc.argDescs[0];
            for (const field of expectedArgFields) {
                expect(argumentDesc.hasOwnProperty(field), `argDesc is missing field "${field}"`).to.be.true;
            }

            // findMinIdx should be ignored
            for (const { fnName } of response) {
                expect(fnName !== 'findMinIdx').to.be.true;
            }
        });
    });
}