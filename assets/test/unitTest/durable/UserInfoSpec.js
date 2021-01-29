describe("UserInfo Constructor Test", function() {
    var userInfos;

    before(function() {
        userInfos = new UserInfo();
    });

    it("Should have 2 attributes", function() {
        var userPref = new UserPref();

        userInfos = new UserInfo({
            "userpreference": userPref
        });

        expect(userInfos).to.be.an.instanceof(UserInfo);
        expect(Object.keys(userInfos).length).to.equal(2);
        expect(userInfos.version).to.equal(Durable.Version);
        expect(userInfos.userpreference).to.exist;
    });


    it("Should get pref info", function() {
        expect(userInfos.getPrefInfo().dfAutoExecute).to.equal(true);
    });
});