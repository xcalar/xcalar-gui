describe('XcUser Test', () => {
    it('should get current user', () => {
        let user = XcUser.CurrentUser;
        expect(user).to.be.instanceof(XcUser);
    });

    it('should get current user name', () => {
        let username = XcUser.getCurrentUserName();
        expect(username).to.equal(XcUser.CurrentUser.getName());
    });

    it('should set and reset user session', () => {
        let username = xcHelper.randName('test');
        let user = new XcUser(username);
        XcUser.setUserSession(user);
        expect(userIdName).not.to.equal(XcUser.getCurrentUserName());

        // reset
        XcUser.resetUserSession();
        expect(userIdName).to.equal(XcUser.getCurrentUserName());
    });

    it('set user session should throw error', (done) => {
        try {
            let user = new XcUser(null);
            XcUser.setUserSession(user);
            done('fail');
        } catch (e) {
            expect(e).to.equal('Invalid User');
            done();
        }
    });

    it('should create a user', () => {
        let user = new XcUser('test');
        expect(user).to.be.instanceof(XcUser);
    });

    it('should catch error case', () => {
        let user = new XcUser(null, true, true);
        expect(user.getFullName()).to.be.null;
    });

    it('should get and set name', () => {
        let user = new XcUser('test/a@test.com');
        expect(user.getName()).to.equal('test/a@test.com');
        // case 2
        user = new XcUser('test/a@test.com');
        user.setName(true);
        expect(user.getName()).to.equal('test/a');
        // case 3
        user = new XcUser('test/a@test.com');
        user.setName(true, true);
        expect(user.getName()).to.equal('test');
    });

    it('should get full name', () => {
        let user = new XcUser('test/a@test.com');
        user.setName(true, true);
        expect(user.getName()).to.equal('test');
        expect(user.getFullName()).to.equal('test/a@test.com');
    });

    it("should get is admin or not", () => {
        let user = new XcUser('test');
        expect(user.isAdmin()).to.be.false;
        // case 2
        user = new XcUser('test', true);
        expect(user.isAdmin()).to.be.true;
    });

    it('should logout', () => {
        const oldUnlod = xcManager.unload;
        const oldAjax = HTTPService.Instance.ajax;
        const oldSocket = XcSocket.Instance.sendMessage;
        let test = false;
        xcManager.unload = () => {
            return PromiseHelper.resolve();
        };
        HTTPService.Instance.ajax = () => { test = true; };
        XcSocket.Instance.sendMessage = () => {};

        XcUser.CurrentUser.logout();
        expect(test).to.be.true;
        xcManager.unload = oldUnlod;
        HTTPService.Instance.ajax = oldAjax;
        XcSocket.Instance.sendMessage = oldSocket;
    });

    it('should throw error of invalid logout', (done) => {
        try {
            let user = new XcUser('test');
            user.logout();
            done('fail');
        } catch (e) {
            expect(e).to.equal('Invalid User');
            done();
        }
    });

    it('should get memory usage', (done) => {
        let oldFunc = XcalarGetMemoryUsage;
        XcalarGetMemoryUsage = (name, id) => PromiseHelper.resolve(name, id);

        let user = new XcUser('test');
        user.getMemoryUsage()
            .then((name, id) => {
                expect(name).to.equal(user.getName());
                expect(id).to.equal(user._userIdUnique);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarGetMemoryUsage = oldFunc;
            });
    });

    it('should hold session', (done) => {
        const user = XcUser.CurrentUser;
        const oldCommitFlag = user._commitFlag;
        const oldRemovItem = xcSessionStorage.removeItem;
        const oldSet = user.setCommitFlag;
        let test = false;

        xcSessionStorage.removeItem = () => { test = true };
        user.setCommitFlag = () => PromiseHelper.resolve();

        XcUser.CurrentUser.holdSession('test', true)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                user._commitFlag = oldCommitFlag;
                xcSessionStorage.removeItem = oldRemovItem;
                user.setCommitFlag = oldSet;
            });
    });

    it('hold session shold handle no workbookId', (done) => {
        const oldRemovItem = xcSessionStorage.removeItem;
        let test = false;

        xcSessionStorage.removeItem = () => { test = true };

        XcUser.CurrentUser.holdSession(null)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                xcSessionStorage.removeItem = oldRemovItem;
            });
    });

    it('should throw hold session error', (done) => {
        try {
            let user = new XcUser('test');
            user.holdSession();
            done('fail');
        } catch (e) {
            expect(e).to.equal('Invalid User');
            done();
        }
    });

    it('should release session', (done) => {
        const user = XcUser.CurrentUser;
        const oldCommit = KVStore.commit;
        const oldSet = user.setCommitFlag;
        const oldStopHeartbeat = XcSupport.stopHeartbeatCheck;

        KVStore.commit = () => PromiseHelper.resolve();
        user.setCommitFlag = () => {
            test = true;
            return PromiseHelper.resolve();
        };
        XcSupport.stopHeartbeatCheck = () => {};

        XcUser.CurrentUser.releaseSession()
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                KVStore.commit = oldCommit;
                user.setCommitFlag = oldSet;
                XcSupport.stopHeartbeatCheck = oldStopHeartbeat
            });
    });

    it('should throw release session error', (done) => {
        try {
            let user = new XcUser('test');
            user.releaseSession();
            done('fail');
        } catch (e) {
            expect(e).to.equal('Invalid User');
            done();
        }
    });

    it('should trigger sessionHoldAlert', (done) => {
        UnitTest.onMinMode();

        const def = XcUser.CurrentUser.sessionHoldAlert(true);
        UnitTest.hasAlertWithText(WKBKTStr.HoldMsg, { confirm: true });

        def
            .then(() => {
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                UnitTest.offMinMode();
            });
    });

    it('sessionHoldAlert should resolve if it\'s a refresh case', (done) => {
        const oldFunc = xcSessionStorage.getItem;
        let test = false;
        xcSessionStorage.getItem = () => {
            test = true;
            return new Date().getTime();
        };

        XcUser.CurrentUser.sessionHoldAlert(true)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                xcSessionStorage.getItem = oldFunc;
            });
    });

    it("XcUser.setCurrentUser should fail when already set", (done) => {
        XcUser.setCurrentUser()
        .then(() => {
            done("fail");
        })
        .fail((error) => {
            expect(error).to.equal("Current user already exists");
            done();
        });
    });

    describe('Commit Check Test', () => {
        let oldStopHeartbeat;
        let oldLookup;
        let oldRemoveItem;
        let oldAlert;

        before(() => {
            oldLookup = XcalarKeyLookup;
            oldStopHeartbeat = XcSupport.stopHeartbeatCheck;
            oldRemoveItem = xcSessionStorage.removeItem;
            oldAlert = Alert.show;

            XcalarKeyLookup = () => PromiseHelper.resolve();
            XcSupport.stopHeartbeatCheck = () => { };
            xcSessionStorage.removeItem = () => { };
            Alert.show = () => { };
        });

        it('should throw release session error', (done) => {
            try {
                let user = new XcUser('test');
                user.commitCheck();
                done('fail');
            } catch (e) {
                expect(e).to.equal('Invalid User');
                done();
            }
        });

        it('should resolve if no commit key yet', (done) => {
            const oldFunc = KVStore.getKey;
            let test = false;
            KVStore.getKey = () => {
                test = true;
                return null;
            };

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    KVStore.getKey = oldFunc;
                });
        });

        it('should resolve if no active workbook', (done) => {
            const oldFunc = WorkbookManager.getActiveWKBK;
            let test = false;
            WorkbookManager.getActiveWKBK = () => {
                test = true;
                return null;
            };

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    WorkbookManager.getActiveWKBK = oldFunc;
                });
        });

        it('should resolve if no workbook', (done) => {
            const oldFunc = WorkbookManager.getWorkbook;
            let test = false;
            WorkbookManager.getWorkbook = () => {
                test = true;
                return null;
            };

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    expect(test).to.be.true;
                    done();
                })
                .fail(() => {
                    done('fail');
                })
                .always(() => {
                    WorkbookManager.getWorkbook = oldFunc;
                });
        });

        it('should reject if no heart beat', (done) => {
            const oldFunc = XcSupport.hasHeartbeatCheck;
            XcSupport.hasHeartbeatCheck = () => false;

            XcUser.CurrentUser.commitCheck(true)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('cancel check');
                    done();
                })
                .always(() => {
                    XcSupport.hasHeartbeatCheck = oldFunc;
                });
        });

        it('should reject if val mismatch', (done) => {
            XcalarKeyLookup = () => PromiseHelper.resolve(null);

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('commit key not match');
                    done();
                });
        });

        it('should resolve match case', (done) => {
            XcalarKeyLookup = () => PromiseHelper.resolve({
                value: XcUser.CurrentUser._commitFlag
            });

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    done();
                })
                .fail(() => {
                    done('fail');
                });
        });

        it('should reject if error but no heart beat', (done) => {
            const oldFunc = XcSupport.hasHeartbeatCheck;
            XcSupport.hasHeartbeatCheck = () => false;
            XcalarKeyLookup = () => PromiseHelper.reject();

            XcUser.CurrentUser.commitCheck(true)
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('cancel check');
                    done();
                })
                .always(() => {
                    XcSupport.hasHeartbeatCheck = oldFunc;
                });
        });

        it('should reject if session not found', (done) => {
            XcalarKeyLookup = () => PromiseHelper.reject({
                status: StatusT.StatusSessionNotFound
            });

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('commit key not match');
                    done();
                });
        });

        it('should reject normal error', (done) => {
            XcalarKeyLookup = () => PromiseHelper.reject({
                error: 'test'
            });

            XcUser.CurrentUser.commitCheck()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error.error).to.equal('test');
                    done();
                });
        });

        after(() => {
            XcalarKeyLookup = oldLookup;
            XcSupport.stopHeartbeatCheck = oldStopHeartbeat;
            xcSessionStorage.removeItem = oldRemoveItem;
            Alert.show = oldAlert;
        });
    });

    describe('XcUser IdleCheck and Cookies Test', () => {
        it('should throw error when extending cookies', (done) => {
            try {
                let user = new XcUser('test');
                user.extendCookies();
                done('fail');
            } catch (e) {
                expect(e).to.equal('Invalid User');
                done();
            }
        });
        it('should throw error when updating checkTime', (done) => {
            try {
                let user = new XcUser('test');
                user.updateLogOutInterval(10);
                done('fail');
            } catch (e) {
                expect(e).to.equal('Invalid User');
                done();
            }
        });
        it('should be equal for default timeout settings ' +
        'for values in both xcUser and UserSettings', () => {
            var logOutInterval = UserSettings.Instance.getPref("logOutInterval");
            expect(logOutInterval).to.not.be.undefined;
            var defaultVal = 25 * 60 * 1000;
            XcUser.CurrentUser.updateLogOutInterval(undefined);
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.equal(defaultVal);
        })
        it('should be equal for remembered timeout settings' +
        'for values in both xcUser and UserSettings', () => {
            UserSettings.Instance.setPref("logOutInterval", 120, true);
            var logOutInterval = UserSettings.Instance.getPref("logOutInterval");
            expect(logOutInterval).to.be.a('number');
            XcUser.CurrentUser.updateLogOutInterval(logOutInterval);
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.equal(logOutInterval * 60 * 1000);

        })
        it('should update checkTime with an integer', () => {
            XcUser.CurrentUser.updateLogOutInterval(10);
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.be.a("number");
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.equal(10 * 60 * 1000);

        });
        after(() => {
            UserSettings.Instance.revertDefault();
        });
    });
});