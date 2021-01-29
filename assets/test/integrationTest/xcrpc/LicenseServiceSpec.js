// const ApiStatus = require('xcalarsdk').Error.status;
const expect = require('chai').expect;
exports.testSuite = function(LicenseService) {
    describe("LicenseService: ", function () {
        it("getLicense() should work", async function () {
            try {
                const result = await LicenseService.getLicense();
                const expectedFields = [
                    'isLoaded', 'isExpired', 'platform', 'product', 'productFamily', 'productVersion', 'expiration',
                    'nodeCount', 'userCount', 'attributes', 'licensee', 'compressedLicenseSize', 'compressedLicense'
                ];
                for (const fieldName of expectedFields) {
                    expect(result.hasOwnProperty(fieldName), `Missing field "${fieldName}"`).to.be.true;
                }
                expect(result.licensee).to.equal("Xcalar, Inc");
            } catch(err) {
                console.log("getLicense fails");
                expect.fail(err);
            }
        });

        it("updateLicense() should handle the invalid input", async function () {
            try {
                await LicenseService.updateLicense({ newLicense: null });
                expect.fail("updateLicense cannot handle invalid input");
            } catch(err) {
                // XXX TODO: Compare with ApiStatus.STATUS_LIC_SIGNATURE_INVALID,
                // once the Status_pb is wired in
                expect(err.status).to.equal(367);
            }
        });
    });
}
