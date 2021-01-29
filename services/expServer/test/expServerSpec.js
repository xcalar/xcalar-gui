describe('ExpServer General Test', function() {
    // Test setup
    var expect = require('chai').expect;

    var expServer = require(__dirname + '/../expServer.js');
    var XcConsole = require(__dirname + '/../utils/expServerXcConsole.js');
    var supportStatusFile = require(__dirname + '/../utils/supportStatusFile.js');
    this.timeout(10000);
    // Test begins
    it("supportStatusFile.getStatus should work", function() {
        expect(supportStatusFile.getStatus(-1)).to.equal("Error");
        expect(supportStatusFile.getStatus(1)).to.equal("Ok");
    });
    it("expServer.getOperatingSystem should work", function(done) {
        expServer.getOperatingSystem()
        .always(function(ret) {
            expect(ret).to.not.be.empty;
            done();
        });
    });
    it("expServer.getCertificate should work", function() {
        var centos = expServer.getCertificate("centos");
        var ubuntu = expServer.getCertificate("ubuntu");
        var redhat = expServer.getCertificate("redhat");
        var oracle = expServer.getCertificate("oracle linux");
        expect(centos).to.include("pem");
        expect(ubuntu).to.include("pem");
        expect(redhat).to.include("pem");
        expect(oracle).to.include("pem");
    })
    it("XcConsole.getTimeStamp should work", function() {
        expect(XcConsole.getTimeStamp()).to.not.be.empty;
    });
});