describe("GenSettings Constructor Test", function() {
    it("Should have 4 attributes", function() {
        var genSettings = new GenSettings();

        expect(genSettings).to.be.an.instanceof(GenSettings);
        expect(Object.keys(genSettings).length).to.equal(4);
        expect(genSettings).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(genSettings).to.have.property("adminSettings");
        expect(genSettings).to.have.property("xcSettings");
        expect(genSettings).to.have.property("baseSettings");
    });

    it("Should get baseSettings", function() {
        var genSettings = new GenSettings();
        var baseSettings = genSettings.getBaseSettings();

        expect(Object.keys(baseSettings).length).to.equal(4);
        expect(baseSettings).to.have.property("hideDataCol")
        .and.to.be.false;
        expect(baseSettings).to.have.property("monitorGraphInterval")
        .and.to.equal(3);
        expect(baseSettings).to.have.property("commitInterval")
        .and.to.equal(120);
        expect(baseSettings).to.have.property("logOutInterval")
        .and.to.equal(25);
    });

    it("GenSettings heirarchy should work", function() {
        var testSettings = {
            "adminSettings": {},
            "xcSettings": {
                "monitorGraphInterval": 9
            }
        };
        var userConfigParams = {
            "commitInterval": 600
        };
        // modified base settings should be
        // {monitorGraphInterval: 9, hideDataCol: false}

        var genSettings = new GenSettings(userConfigParams, testSettings);

        var adminAndXc = genSettings.getAdminAndXcSettings();
        expect(Object.keys(adminAndXc.adminSettings)).to.have.length(0);
        expect(Object.keys(adminAndXc.xcSettings)).to.have.length(1);

        var baseSettings = genSettings.getBaseSettings();
        expect(Object.keys(baseSettings)).to.have.length(4);
        expect(baseSettings["hideDataCol"]).to.be.false;
        expect(baseSettings["monitorGraphInterval"]).to.equal(9);
        expect(baseSettings["commitInterval"]).to.equal(600);
    });

    it("Should update adminSettings", function() {
        var genSettings = new GenSettings();
        genSettings.updateAdminSettings({"a": 1});
        expect(genSettings.adminSettings).to.exist;
        expect(genSettings.adminSettings.a).to.equal(1);
    });

    it("Should update xcSettings", function() {
        var genSettings = new GenSettings();
        genSettings.updateXcSettings({"a": 1});
        expect(genSettings.xcSettings).to.exist;
        expect(genSettings.xcSettings.a).to.equal(1);
    });
});