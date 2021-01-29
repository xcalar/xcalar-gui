describe("UserPref Constructor Test", function() {
    it("should have 9 attributes", function() {
        var userPref = new UserPref();

        expect(userPref).to.be.an.instanceof(UserPref);
        expect(Object.keys(userPref).length).to.equal(10);
        expect(userPref).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(userPref).to.have.property("general").and.to.be.empty;
        expect(userPref).to.have.property("dfAutoExecute").and.to.be.true;
        expect(userPref).to.have.property("dfAutoPreview").and.to.be.true;
        expect(userPref).to.have.property("dfProgressTips").and.to.be.true;
        expect(userPref).to.have.property("dfConfigInfo").and.to.be.true;
        expect(userPref).to.have.property("dfPreviewLimit").and.to.equal(1000);
    });
});