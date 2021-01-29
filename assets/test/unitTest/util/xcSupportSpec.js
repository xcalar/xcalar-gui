describe('XcSupport Test', () => {
    it('check connection should work', (done) => {
        const oldCheckVersion = XVM.checkVersion;
        const oldReload = xcManager.reload;
        const oldAlert = Alert.error;
        const oldUpdate = Alert.updateMsg;
        let test = false;
        let cnt = 0;
        XVM.checkVersion = () => {
            cnt++;
            if (cnt === 3) {
                return PromiseHelper.resolve();
            } else {
                return PromiseHelper.reject();
            }
        };
        xcManager.reload = () => { test = true };
        Alert.error = () => {};
        Alert.updateMsg = () => true;
        UnitTest.onMinMode();

        XcSupport.checkConnection();
        UnitTest.testFinish(() => test === true)
        .then(() => {
            done();
        })
        .fail(() => {
            done('fail');
        })
        .always(() => {
            XVM.checkVersion = oldCheckVersion;
            xcManager.reload = oldReload;
            Alert.error = oldAlert;
            Alert.updateMsg = oldUpdate;
        });
    });

    describe('Heartbeat check Test', () => {
        it ('checkXcalarState should work', (done) => {
            const checkXcalarState = XcSupport.__testOnly__.checkXcalarState;
            const oldCommitCheck = XcUser.CurrentUser.commitCheck;
            const oldMemCheck = MemoryAlert.Instance.check;
            let test = false;

            XcUser.CurrentUser.commitCheck = () => PromiseHelper.resolve();
            MemoryAlert.Instance.check = () => {
                test = true;
                return PromiseHelper.resolve();
            };

            checkXcalarState()
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcUser.CurrentUser.commitCheck = oldCommitCheck;
                MemoryAlert.Instance.check = oldMemCheck;
            });
        });

        it('has heart beat by default', () => {
            const res = XcSupport.hasHeartbeatCheck();
            if (res === false) {
                console.error("error heart beat case");
                for (let i = 0; i < 100; i++) {
                    if (XcSupport.restartHeartbeatCheck()) {
                        console.error("restarted heart beat after", i, "tries");
                        break;
                    }
                    res = XcSupport.hasHeartbeatCheck();
                }
            }
            expect(res).to.be.true;
        });

        it('should not restart if already restart', () => {
            const res = XcSupport.restartHeartbeatCheck();
            expect(res).to.be.false;
        });

        it('should stop heart beat', () => {
            XcSupport.stopHeartbeatCheck();
            const res = XcSupport.hasHeartbeatCheck();
            expect(res).to.be.false;
        });

        it('shold not restart heart beat if locket', () => {
            // lock again
            XcSupport.stopHeartbeatCheck();
            const res = XcSupport.restartHeartbeatCheck();
            expect(res).to.be.false;
        });

        it('should restart heart beat', () => {
            const res = XcSupport.restartHeartbeatCheck();
            expect(res).to.be.true;
        });

        it('heartbeatCheck should work if no active workbook', () => {
            const oldFunc = WorkbookManager.getActiveWKBK;
            WorkbookManager.getActiveWKBK = () => null;
            const res = XcSupport.heartbeatCheck();
            expect(res).to.be.true;
            WorkbookManager.getActiveWKBK = oldFunc;
        });
    });

    it('XcSupport.connectionError should work', () => {
        const oldFunc = Alert.error;
        let testTitle;
        Alert.error = (title) => {
            testTitle = title;
            return 'testId';
        };

        const res = XcSupport.connectionError();
        expect(res.id).to.equal('testId');
        expect(testTitle).to.equal(ThriftTStr.CCNBEErr);
        Alert.error = oldFunc;
    });

    it('XcSupport.downloadLRQ should work', (done) => {
        const oldExportRetina = XcalarExportRetina;
        const oldDownload = xcHelper.downloadAsFile;
        let test = false;
        XcalarExportRetina = () => PromiseHelper.resolve({});
        xcHelper.downloadAsFile = () => { test = true };

        XcSupport.downloadLRQ('test')
        .then(() => {
            expect(test).to.be.true;
            done();
        })
        .fail(() => {
            done('fail');
        })
        .always(() => {
            XcalarExportRetina = oldExportRetina;
            xcHelper.downloadAsFile = oldDownload;
        });
    });

    it('XcSupport.downloadLRQ should handle fail case', (done) => {
        const oldExportRetina = XcalarExportRetina;
        UnitTest.onMinMode();
        XcalarExportRetina = () => PromiseHelper.reject('test');

        XcSupport.downloadLRQ('test')
        .then(() => {
            done('fail');
        })
        .fail((error) => {
            expect(error).to.equal('test');
            UnitTest.hasAlertWithTitle(DFTStr.DownloadErr);
            done();
        })
        .always(() => {
            XcalarExportRetina = oldExportRetina;
            UnitTest.offMinMode();
        });
    });

    it('XcSupport.getRunTimeBreakdown should work', (done) => {
        const oldFunc = XcalarQueryState;
        let test = false;
        XcalarQueryState = () => {
            test = true;
            return PromiseHelper.resolve({
                queryGraph: {
                    node: [{
                        api: 1,
                        name: {name: 'test'},
                        elapsed: {milliseconds: '1'}
                    }]
                }
            });
        }
        XcSupport.getRunTimeBreakdown('test')
        .then(() => {
            expect(test).to.be.true;
            done();
        })
        .fail(() => {
            done('fail');
        })
        .always(() => {
            XcalarQueryState = oldFunc;
        });
    });
});