describe('XVM Test', () => {
    before(() => {
        console.log("XVM Test");
    });

    describe('Basic Function Test', () => {
        it('showInvalidLicenseAlert should work', () => {
            const oldFunc = Alert.show;
            let testArg;
            Alert.show = (arg) => { testArg = arg };
            XVM.__testOnly__.showInvalidLicenseAlert('test', 'detail');
            expect(testArg).to.be.an('object');
            expect(Object.keys(testArg).length).to.equal(4);
            expect(testArg.title).to.equal(ErrTStr.LicenseErr);
            expect(testArg.isAlert).to.be.true;
            expect(testArg.msg).to.equal('test');
            expect(testArg.detail).to.equal("detail");
            Alert.show = oldFunc;
        });

        it('parseLicense should catch error case', () => {
            const parseLicense = XVM.__testOnly__.parseLicense;
            expect(parseLicense(null)).to.equal(ThriftTStr.Update);
        });

        it('parseKVStoreVersionInfo should work', function() {
            const parseKVStoreVersionInfo = XVM.__testOnly__.parseKVStoreVersionInfo;
            // case 1
            expect(parseKVStoreVersionInfo(null)).to.equal(null);
            // case 2
            expect(parseKVStoreVersionInfo('error case')).to.equal(null);
            // case 3
            let test = JSON.stringify({"version": 1, "stripEmail": true});
            const res = parseKVStoreVersionInfo(test);
            expect(res).to.be.an('object');
            expect(res.version).to.equal(1);
            expect(res.stripEmail).to.be.true;

            // case 4
            const kvVersion = new KVVersion();
            const res2 = parseKVStoreVersionInfo(kvVersion.serialize());
            expect(res2).to.be.an('object');
            expect(res2.version).to.equal(kvVersion.version);
        });
    });

    describe('Public Function Test', () => {
        it('XVM.getVersion should work', () => {
            const version = XVM.getVersion();
            expect(version).to.be.a('string');
            // format is like 1.3.1-git
            expect(/\d.\d.\d-.*/.test(version)).to.be.true;
        });

        it('XVM.compareVersions should work', () => {
            expect(XVM.compareVersions('', '')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareVersions('1.2.3', '')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareVersions('1.2.3', '1.a.3')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareVersions(1.2, '1.a.3')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareVersions('1', '1')).to.equal(VersionComparison.Equal);
            expect(XVM.compareVersions('1', '1.2')).to.equal(VersionComparison.Equal);
            expect(XVM.compareVersions('1.2.3', '1.2')).to.equal(VersionComparison.Equal);
            expect(XVM.compareVersions('1.2.3', '1.2.3')).to.equal(VersionComparison.Equal);
            expect(XVM.compareVersions('1.2.3', '1.2.4')).to.equal(VersionComparison.Smaller);
            expect(XVM.compareVersions('1.2.3', '1.22')).to.equal(VersionComparison.Smaller);
            expect(XVM.compareVersions('1.9.3', '2.0')).to.equal(VersionComparison.Smaller);
            expect(XVM.compareVersions('2', '1.9')).to.equal(VersionComparison.Bigger);
            expect(XVM.compareVersions('2.1', '2.0')).to.equal(VersionComparison.Bigger);
        });

        it('XVM.compareToCurrentVersion should work', () => {
            const oldGetVersion = XVM.getVersion;
            XVM.getVersion = () => "2.1.0-git";

            expect(XVM.compareToCurrentVersion('')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareToCurrentVersion('a')).to.equal(VersionComparison.Invalid);
            expect(XVM.compareToCurrentVersion('2')).to.equal(VersionComparison.Equal);
            expect(XVM.compareToCurrentVersion('2.1')).to.equal(VersionComparison.Equal);
            expect(XVM.compareToCurrentVersion('2.1.0')).to.equal(VersionComparison.Equal);
            expect(XVM.compareToCurrentVersion('2.0')).to.equal(VersionComparison.Smaller);
            expect(XVM.compareToCurrentVersion('2.2')).to.equal(VersionComparison.Bigger);

            XVM.getVersion = oldGetVersion
        });

        it('XVM.getVersion with patch version inculde should work', () => {
            let temp;
            if (typeof gPatchVersion !== "undefined") {
                temp = gPatchVersion;
            }
            gPatchVersion = 1;
            const version = XVM.getVersion(true);
            // format is like 1.3.1-git
            expect(/\d.\d.\d-.*P1/.test(version)).to.be.true;
            gPatchVersion = temp;
        });

        it('XVM.getSHA should work', () => {
            const sha = XcalarApiVersionTStr[XcalarApiVersionT.XcalarApiVersionSignature];
            expect(XVM.getSHA()).to.equal(sha);
        });

        it('XVM.getBackendVersion should work', () => {
            expect(XVM.getBackendVersion()).to.be.a('string');
        });

        it('XVM.getLicenseExipreInfo should work', () => {
            expect(XVM.getLicenseExipreInfo()).to.be.a('string');
        });

        it('XVM.getLicenseMode should work', () => {
            const mode = XVM.getLicenseMode();
            let found = false;
            for (let key in XcalarMode) {
                if (mode === XcalarMode[key]) {
                    found = true;
                    break;
                }
            }
            expect(found).to.be.true;
        });

        it('XVM.getMaxUsers should work', () => {
            expect(XVM.getMaxUsers()).to.be.a('number');
        });

        it('XVM.getMaxNodes should work', () => {
            expect(XVM.getMaxNodes()).to.be.a('number');
        });

        it('XVM.checkMaxUsers should work', () => {
            let isSingleUser = XVM.isSingleUser;
            XVM.isSingleUser = () => false;
            // case 1
            expect(XVM.checkMaxUsers()).to.be.false;
            XVM.isSingleUser = () => false;
            // case 2
            const oldAdmin = Admin.isAdmin;
            Admin.isAdmin = () => true;
            expect(XVM.checkMaxUsers({})).to.be.false;
            // case 3
            const userInfos = {};
            expect(XVM.checkMaxUsers(userInfos)).to.be.false;
            // case 4
            const numUsers = XVM.getMaxUsers();
            const oldAlert = Alert.error;
            let test = false;
            Alert.error = () => { test = true };
            Admin.isAdmin = () => false;
            if (numUsers >= 0) {
                for (let i = 0; i < numUsers; i++) {
                    userInfos[i] = true;
                }
                expect(XVM.checkMaxUsers(userInfos)).to.be.true;
                expect(test).to.be.false;

                // make curNumUsers >= numUsers * 2
                for (let i = numUsers; i < numUsers * 2; i++) {
                    userInfos[i] = true;
                }
                expect(XVM.checkMaxUsers(userInfos)).to.be.true;
                expect(test).to.be.true;
            }
            // case 5
            XVM.isSingleUser = () => true;
            expect(XVM.checkMaxUsers({})).to.be.false;

            Alert.error = oldAlert;
            Admin.isAdmin = oldAdmin;
            XVM.isSingleUser = isSingleUser;
        });

        it('XVM.commitKVVersion should work', () => {
            const oldFunc = KVStore.prototype.put;
            let test = false;
            KVStore.prototype.put = () => { test = true };
            XVM.commitKVVersion();
            expect(test).to.be.true;
            KVStore.prototype.put = oldFunc;
        });

        it('XVM.getFrontBuildNumber should work', () => {
            const res = XVM.getFrontBuildNumber();
            expect(res).to.be.a("string");
        });

        it('XVM.getFrontBuildNumber should work', () => {
            const res = XVM.getBackBuildNumber();
            expect(res).to.be.a("string");
        });

        it('XVM.getBuildNumber should work', () => {
            const res = XVM.getBuildNumber();
            expect(res).to.be.a("string");
        });

        it('XVM.getPatchVersion should work', () => {
            expect(XVM.getPatchVersion()).to.be.a("string");
            const temp = gPatchVersion;
            gPatchVersion = 1;
            expect(XVM.getPatchVersion()).to.equal("P1");
            gPatchVersion = temp;
        });
    });

    describe('check buld number test', () => {
        let oldGetFrontBuldNumber;
        let oldGetBackBuildNumber;
        let oldReload;
        let test;

        before(() => {
            oldGetFrontBuldNumber = XVM.getFrontBuildNumber;
            oldGetBackBuildNumber = XVM.getBackBuildNumber;
            oldReload = xcManager.reload;

            xcManager.reload = (t) => { test = t };
        });

        beforeEach(() => {
            test = undefined;
        });

        it('should be valid if front build is git', () => {
            XVM.getFrontBuildNumber = () => "git";
            const res = XVM.checkBuildNumber();
            expect(res).to.be.true;
        })

        it('should be valid if buld number match', () => {
            XVM.getFrontBuildNumber = () => "123";
            XVM.getBackBuildNumber = () => "123";
            const res = XVM.checkBuildNumber();
            expect(res).to.be.true;
        });

        it("should realod if build number not match", () => {
            xcLocalStorage.removeItem("buildNumCheck");
            XVM.getFrontBuildNumber = () => "123";
            XVM.getBackBuildNumber = () => "456";
            const res = XVM.checkBuildNumber();
            expect(res).to.be.false;
            expect(test).to.be.true;
        });

        it("should not realod if not match but has realoded", () => {
            const res = XVM.checkBuildNumber();
            expect(res).to.be.false;
            expect(test).to.be.undefined;
        });

        it("should handle error case", () => {
            xcLocalStorage.removeItem("buildNumCheck");
            xcManager.reload = () => { throw "test"; };
            const res = XVM.checkBuildNumber();
            expect(res).to.be.true;
        });

        after(() => {
            xcLocalStorage.removeItem("buildNumCheck");
            XVM.getFrontBuildNumber = oldGetFrontBuldNumber;
            XVM.getBackBuildNumber = oldGetBackBuildNumber;
            xcManager.reload = oldReload;
        });
    });
});