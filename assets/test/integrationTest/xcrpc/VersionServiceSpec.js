const expect = require('chai').expect;
const ProtoTypes = require('xcalar');

exports.testSuite = function(VersionService, ProtoAPIVersionSignature) {
     describe("VersionService test: ", function () {
        it("GetVersion() should work", async function () {
            try {
                const result = await VersionService.getVersion();
                expect(result).to.have.property("version");
                expect(result).to.have.property("thriftVersionSignatureFull");
                expect(result).to.have.property("thriftVersionSignatureShort");
                expect(result).to.have.property("xcrpcVersionSignatureFull");
                expect(result).to.have.property("xcrpcVersionSignatureShort");
                console.log(JSON.stringify(result));
            } catch(err) {
                console.log("getVersion() not work");
                expect.fail(err);
            }
        });
        it("GetVersion() should return correct version", async function() {
            try {
                const result = await VersionService.getVersion();
                expect(result.version).to.be.a('string');
                expect(result.xcrpcVersionSignatureShort).to.equal(ProtoAPIVersionSignature);
            } catch(err) {
                console.log("getVersion() not work");
                expect.fail(err);
            }
        });
    });
}
