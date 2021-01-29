describe("XcAssert Test", function() {
    it("Should pass correct statement", function() {
        try {
            xcAssert(1 === 1);
            // mark as pass
            expect(true).to.be.true;
        } catch (error) {
            // mark as fail
            expect(true).to.be.false;
        }
    });

    it("Should throw error when has wrong statement", function() {
        try {
            xcAssert(1 === 2);
        } catch (error) {
            expect(error).to.equal("Assert failed");
        }
    });

    it("Should throw error and include error message", function() {
        try {
            xcAssert(1 === 2, "test error");
        } catch (error) {
            expect(error).to.equal("test error");
        }
    });

    it("Should not throw error if log only", function() {
        try {
            xcAssert(1 === 2, "test error", true);
            // mark as pass
            expect(true).to.be.true;
        } catch (error) {
            // mark as fail
            expect(true).to.be.false;
        }
    });
});