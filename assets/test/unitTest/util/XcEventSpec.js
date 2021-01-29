describe("XcEvent Test", function() {
    it("should be the correct instance", function() {
        let xcEvent = new XcEvent();
        expect(xcEvent).to.be.an.instanceof(XcEvent);
    });

    it("should add and siaplatch event", function() {
        let xcEvent = new XcEvent();
        xcEvent.addEventListener("test", function(arg) {
            return arg;
        });

        let res = xcEvent.dispatchEvent("test", "arg");
        expect(res).to.equal("arg");
    });

    it("should handle invalid case", function() {
        let xcEvent = new XcEvent();
        xcEvent.addEventListener("test", "invalid event");

        let res = xcEvent.dispatchEvent("test", "arg");
        expect(res).to.equal(null);
    });
});