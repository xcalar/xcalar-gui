describe.skip("Admin Test", function() {
    var cachedGetItem;
    var $userList;
    var oldSend;
    var oldIsAdmin;

    before(function() {
        UnitTest.onMinMode();
        cachedGetItem = xcLocalStorage.getItem;
        $userList = $("#monitorMenu-setup .userList");
        oldIsAdmin = Admin.isAdmin;
        Admin.isAdmin = () => true;

        // function hashFnv32a(str, asString, seed) {
        //     /*jshint bitwise:false */
        //     var i, l,
        //         hval = (seed === undefined) ? 0x811c9dc5 : seed;

        //     for (i = 0, l = str.length; i < l; i++) {
        //         hval ^= str.charCodeAt(i);
        //         hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) +
        //                 (hval << 24);
        //     }
        //     if (asString) {
        //         // Convert to 8 digit hex string
        //         return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
        //     }
        //     return hval >>> 0;
        // }

        function isAdmin() {
            return XcUser.CurrentUser.isAdmin();
        }

        // function setAdmin(userId) {
        //     var key = hashFnv32a(userId, true, 0xdeadbeef);
        //     xcLocalStorage.setItem("admin" + key, "true");
        // }

        // function clearAdmin() {
        //     var userId = xcSessionStorage.getItem("xcalar-username");
        //     var key = hashFnv32a(userId, true, 0xdeadbeef);
        //     xcLocalStorage.removeItem("admin" + key);
        // }

        var wasAdmin = isAdmin();

        xcSessionStorage.setItem("usingAs", XcUser.getCurrentUserName());
        if (!wasAdmin) {
            let oldHasSetup = Admin.hasSetup;
            Admin.hasSetup = () => false;
            Admin.setup();
            Admin.hasSetup = oldHasSetup;
        } else {
            Admin.__testOnly__.setPosingAs();
        }

        oldSend = XcSocket.Instance.sendMessage;
        XcSocket.Instance.sendMessage = function(){};
        Admin.showModal();
    });

    describe("check initial state", function() {
        it("container should have admin class", function() {
            expect($("#container").hasClass("admin")).to.be.true;
        });
        // XXX fails jenkins
        it.skip("adminbar should toggle", function() {
            expect($("#adminStatusBar").hasClass("active")).to.be.true;
            $("#adminStatusBar .pulloutTab").click();
            expect($("#adminStatusBar").hasClass("active")).to.be.false;
            $("#adminStatusBar .pulloutTab").click();
            expect($("#adminStatusBar").hasClass("active")).to.be.true;
        });
    });

    describe("user list", function() {
        it("getUserList should work", function(done) {
            Admin.__testOnly__.refreshUserList()
            .always(function() {
                var list = Admin.getUserList();
                var ownName = XcUser.getCurrentUserName();
                expect(list.length).to.be.gt(0);
                expect(list.indexOf(ownName)).to.be.gt(-1);
                done();
            });
        });

        it("adding user should work", function(done) {
            var cachedGet = KVStore.prototype.get;
            var cachedAppend = XcalarKeyAppend;
            var cachedGetUser = XcUser.getCurrentUserName;
            var userName = "randTest" + Date.now();
            var cachedList = xcHelper.deepCopy(Admin.getUserList());

            KVStore.prototype.get = function() {
                return PromiseHelper.resolve('"fakeUser,"') ;
            };
            XcUser.getCurrentUserName = function() {
                return userName;
            };

            var appendCalled = false;
            XcalarKeyAppend = function() {
                appendCalled = true;
                return PromiseHelper.resolve();
            };

            Admin.addNewUser()
            .then(function() {
                expect(appendCalled).to.be.true;
                var list = Admin.getUserList();
                expect(list.indexOf(userName)).to.be.gt(-1);

                list.length = 0;
                for (var i = 0; i < cachedList.length; i++) {
                    list.push(cachedList[i]);
                }
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.prototype.get = cachedGet;
                XcUser.getCurrentUserName = cachedGetUser;
                XcalarKeyAppend = cachedAppend;
            });
        });

        it("filtering userlist should work", function() {
            var listLen = $userList.find(".userLi").length;
            expect(listLen).to.be.gt(0);
            var ownName = XcUser.getCurrentUserName();
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });
            expect($ownLi.length).to.equal(1);
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            $("#adminUserSearch input").val("@@@@@@").trigger(fakeEvent.input);
            expect($ownLi.hasClass("xc-hidden")).to.be.true;
            $("#adminUserSearch input").val(ownName).trigger(fakeEvent.input);
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            $("#adminUserSearch .closeBox").click();
            expect($("#adminUserSearch input").val()).to.equal("");
            expect($ownLi.hasClass("xc-hidden")).to.be.false;
            expect($userList.find(".userLi.xc-hidden").length).to.equal(0);
        });

        it("switch user should work", function() {
            var oldSet = xcSessionStorage.setItem;
            var oldGet = xcSessionStorage.getItem;
            var oldRemove = xcSessionStorage.removeItem;
            var storage = {};
            xcSessionStorage.setItem = (k, v) => { storage[k] = String(v) };
            xcSessionStorage.getItem = (k) => storage[k];
            xcSessionStorage.removeItem = (k) => {delete storage[k] };
            var cachedunload = xcManager.unload;
            xcManager.unload = function() { return null; };
            var ownName = XcUser.getCurrentUserName();
            var oldGetCurrent = XcUser.getCurrentUserName;
            var fakeCurrentUser = xcHelper.randName(ownName);
            XcUser.getCurrentUserName = () => fakeCurrentUser;
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });
            $ownLi.find(".useAs").click();
            expect(xcSessionStorage.getItem("usingAs")).to.not.equal("true");
            expect($ownLi.hasClass("self")).to.be.true;
            $ownLi.removeClass("self");
            $ownLi.find(".useAs").click();

            UnitTest.hasAlertWithTitle(MonitorTStr.UseXcalarAs, {confirm: true});
            expect(xcSessionStorage.getItem("usingAs")).to.equal(ownName);
            expect(xcSessionStorage.getItem("adminName")).to.equal(fakeCurrentUser);

            // switch back
            $("#adminStatusBar").find(".xi-close").click();
            expect(xcSessionStorage.getItem("usingAs")).to.be.undefined;
            expect(xcSessionStorage.getItem("adminName")).to.be.undefined;
            xcManager.unload = cachedunload;
            $ownLi.addClass("self");
            xcSessionStorage.setItem = oldSet;
            xcSessionStorage.getItem = oldGet;
            xcSessionStorage.removeItem = oldRemove;
            XcUser.getCurrentUserName = oldGetCurrent;
        });

        it("get memory should work", function(done) {
            var cachedFn = XcalarGetMemoryUsage;
            XcalarGetMemoryUsage = function() {
                return PromiseHelper.resolve({fakeData: "test"});
            };
            var ownName = XcUser.getCurrentUserName();
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });

            expect($("#userMemPopup").is(":visible")).to.be.false;
            $ownLi.find(".memory").click();

            expect($("#userMemPopup").is(":visible")).to.be.true;
            UnitTest.testFinish(function() {
                return ($("#userMemPopup").find(".content").text()
                                    .indexOf('"fakeData": "test"') > 0);
            })
            .then(function() {
                var text = $("#userMemPopup").find(".content").text();
                expect(text.indexOf('Breakdown')).to.equal(-1);
                XcalarGetMemoryUsage = function() {
                    var data = {
                        userMemory: {
                            sessionMemory: [{
                                sessionName: 'sessA',
                                tableMemory: [{
                                    totalBytes: 1,
                                    tableName: 'tableA'
                                }, {
                                    totalBytes: 2,
                                    tableName: 'tableB'
                                }]
                            }]
                        }
                    };
                    return PromiseHelper.resolve(data);
                };
                $ownLi.find(".memory").mousedown(); // off handler
                $ownLi.find(".memory").click();
                expect($("#userMemPopup").is(":visible")).to.be.true;
                return UnitTest.testFinish(function() {
                    return ($("#userMemPopup").find(".content").text()
                                    .indexOf("sessA") > 0);
                });
            })
            .then(function() {
                var text = $("#userMemPopup").find(".content").text();
                expect(text.indexOf("tableMemory")).to.equal(-1);
                expect(text.indexOf('"Total Memory": "3B"')).to.be.gt(-1);
                expect(text.indexOf('Breakdown')).to.be.gt(-1);
                expect($ownLi.find(".memory").data("originalTitle")).to.equal("Memory usage: 3 B");
                expect($("#userMemPopup").find(".breakdown .jObj").css("display")).to.equal("none");
                $("#userMemPopup").find(".toggleBreakdown").click();

                expect($("#userMemPopup").find(".breakdown .jObj").css("display")).to.equal("inline");

                $(document).mousedown();
                expect($("#userMemPopup").is(":visible")).to.be.false;
                expect($("#userMemPopup").find(".content").text()).to.equal("");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetMemoryUsage = cachedFn;
            });
        });

        it("get memory with failure should work", function(done) {
            var cachedFn = XcalarGetMemoryUsage;
            var cachedUserId = userIdName;
            userIdName = "unitTestUserName";
            XcalarGetMemoryUsage = function() {
                return PromiseHelper.reject({error: "testError", status: StatusT.StatusSessionNotFound});
            };
            var ownName = XcUser.getCurrentUserName();
            var $ownLi = $userList.find(".userLi").filter(function() {
                return $(this).find(".text").text() === ownName;
            });

            expect($("#userMemPopup").is(":visible")).to.be.false;
            $ownLi.find(".memory").click();
            expect($("#userMemPopup").is(":visible")).to.be.true;
            UnitTest.testFinish(function() {
                return ($("#userMemPopup").find(".content").text() === "testError");
            })
            .then(function() {
                expect($ownLi.hasClass("notExists")).to.be.true;
                $("#userMemPopup").find(".close").click();
                expect($("#userMemPopup").is(":visible")).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarGetMemoryUsage = cachedFn;
                userIdName = cachedUserId;
            });
        });

        it("sorting user list by name should work", function() {
            var userName = '\b0000';
            var fakeLi = '<li><div class="text">' + userName + '</div><div class="memory" data-title"5 MB"></div></li>';
            $userList.find("ul").append(fakeLi);
            expect($userList.find("li").eq(0).find(".text").text()).to.not.equal(userName);
            expect($userList.find("li").last().find(".text").text()).to.equal(userName);
            expect($userList.hasClass("sortedByName")).to.be.true;
            expect($userList.hasClass("sortedByUsage")).to.be.false;

            $userList.find(".sortName").click();
            expect($userList.find("li").eq(0).find(".text").text()).to.not.equal(userName);
            expect($userList.find("li").last().find(".text").text()).to.equal(userName);

            $userList.removeClass("sortedByName").addClass("sortedByUsage");
            $userList.find(".sortName").click();
            expect($userList.find("li").eq(0).find(".text").text()).to.equal(userName);
            expect($userList.find("li").last().find(".text").text()).to.not.equal(userName);
            expect($userList.hasClass("sortedByName")).to.be.true;
        });

        it("sorting user list by memory should work", function() {
            var cachedGet = KVStore.prototype.get;
            var getCalled = false;
            KVStore.prototype.get = function() {
                getCalled = true;
                return PromiseHelper.reject();
            };
            $userList.find(".sortUsage").click();
            expect(getCalled).to.be.true;
            getCalled = false;
            $userList.find(".sortUsage").click();
            expect($userList.hasClass("sortedByUsage")).to.be.true;
            expect($userList.hasClass("sortedByName")).to.be.false;
            KVStore.prototype.get = cachedGet;
        });
        it("refreshUserList button should work", function() {
            var cachedFn = KVStore.prototype.get;
            KVStore.prototype.get = function() {
                return PromiseHelper.resolve(null);
            };
            $("#adminUserSearch").find("input").val("test");

            $("#monitorMenu-setup").find(".refreshUserList").click();
            expect($("#adminUserSearch").find("input").val()).to.equal("");
            expect(Admin.getUserList.length).to.equal(0);

            KVStore.prototype.get = cachedFn;
        });
    });

    describe("admin only settings test", function() {
        before(function() {
            var $settings = $("#settingsButton");
            if (!$settings.hasClass("active")) {
                $("#monitorTab").click();
                $settings.click();
            };
        });

        it("should reveal the right value on the slider and update in XcUser", function() {
            var $silder = $("#logOutIntervalSlider");
            if (!$silder.length) {
                // non-admin don't have this
                return;
            }
            var $bar = $silder.find(".ui-resizable-e").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;
            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX + 300, pageY: pageY});

            expect($silder.find(".value").val()).to.equal("120");
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.equal(120 * 60 * 1000);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX + 300, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX - 500, pageY: pageY});

            expect($silder.find(".value").val()).to.equal("10");
            expect(XcUser.CurrentUser.getLogOutTimeoutVal())
            .to.equal(10 * 60 * 1000);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX - 500, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
        });
    });

    describe("admin functions", function() {
        var oldAlert;
        var title;
        var msg;

        before(function() {
            oldAlert = Alert.show;
            Alert.show = function(options) {
                msg = options.msg;
                title = options.title;
                if (options.onConfirm) {
                    options.onConfirm();
                }
            };
        });

        beforeEach(function() {
            msg = null;
            title = null;
        });

        it("startNode when node already start should work", function(done) {
            var cached = XVM.checkVersion;
            XVM.checkVersion = function() {
                return PromiseHelper.resolve();
            };

            var startNode = Admin.__testOnly__.startNode;

            startNode()
            .then(function() {
                expect(msg).to.equal(AlertTStr.AlreadyStart);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XVM.checkVersion = cached;
            });
        });

        it("startNode should work", function(done) {
            var cachedClusterStart = adminTools.clusterStart;
            adminTools.clusterStart = function() {
                return PromiseHelper.resolve({status: Status.Ok, logs: "already running"});
            };
            var cachedCheckVersion = XVM.checkVersion;
            XVM.checkVersion = function() {
                return PromiseHelper.reject();
            };

            var startNode = Admin.__testOnly__.startNode;
            startNode()
            .then(function() {
                expect(msg).to.equal("already running");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                adminTools.clusterStart = cachedClusterStart;
                XVM.checkVersion = cachedCheckVersion;
            });
        });

        it("startNode fail should work", function(done) {
            var cachedClusterStart = adminTools.clusterStart;
            adminTools.clusterStart = function() {
                return PromiseHelper.reject({});
            };
            var cachedCheckVersion = XVM.checkVersion;
            XVM.checkVersion = function() {
                return PromiseHelper.reject();
            };

            var startNode = Admin.__testOnly__.startNode;
            startNode()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(title).to.equal(MonitorTStr.StartNodeFailed);
                done();
            })
            .always(function() {
                adminTools.clusterStart = cachedClusterStart;
                XVM.checkVersion = cachedCheckVersion;
            });
        });

        it("stopNode should work", function(done) {
            var cached = adminTools.clusterStop;
            adminTools.clusterStop = function() {
                return PromiseHelper.reject({});
            };

            var stopNode = Admin.__testOnly__.stopNode;
            stopNode()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(title).to.equal(MonitorTStr.StopNodeFailed);
                done();
            })
            .always(function() {
                adminTools.clusterStop = cached;
            });
        });

        it("restartNode should fail", function(done) {
            var cachedClusterStart = adminTools.clusterStart;
            adminTools.clusterStart = function() {
                return PromiseHelper.reject({});
            };
            var cachedClusterStop = adminTools.clusterStop;
            adminTools.clusterStop = function() {
                return PromiseHelper.resolve({});
            };

            var restartNode = Admin.__testOnly__.restartNode;
            restartNode()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(title).to.equal(MonitorTStr.RestartFailed);
                done();
            })
            .always(function() {
                adminTools.clusterStart = cachedClusterStart;
                adminTools.clusterStop = cachedClusterStop;
            });
        });

        it("get status should work", function(done) {
            var cached = adminTools.clusterStatus;
            adminTools.clusterStatus = function() {
                return PromiseHelper.resolve({logs: "test"});
            };
            var getStatus = Admin.__testOnly__.getStatus;
            var oldFunc = ClusterStatusModal.Instance.show;
            var called = false;
            ClusterStatusModal.Instance.show = function() {
                called = true;
            };

            getStatus()
            .then(function() {
                expect(called).to.equal(true);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                adminTools.clusterStatus = cached;
                ClusterStatusModal.Instance.show = oldFunc;
            });
        });

        it("get status fail should work", function(done) {
            var cached = adminTools.clusterStatus;
            adminTools.clusterStatus = function() {
                return PromiseHelper.reject({logs: "logs"});
            };

            var getStatus = Admin.__testOnly__.getStatus;
            getStatus()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(title).to.equal(MonitorTStr.ClusterStatus);
                done();
            })
            .always(function() {
                adminTools.clusterStatus = cached;
            });
        });

        after(function() {
            Alert.show = oldAlert;
        })
    });

    describe("disallowed functions", function() {
        var cached;
        before(function() {
            cached = Admin.isAdmin;
            Admin.isAdmin = function() {
                return false;
            };
            xcSessionStorage.removeItem("usingAs");
        });

        it("get user list should be blank", function() {
            expect(Admin.getUserList().length).to.equal(0);
        });

        it("switch user should not be allowed", function() {
            Admin.switchUser();
            expect(xcSessionStorage.getItem("usingAs")).to.be.null;
        });

        it("usertoadmin should not be allowed", function() {
            Admin.userToAdmin();
            expect(xcSessionStorage.getItem("usingAs")).to.be.null;
        });

        it("admin.updateloggedinUsers should not be allowed", function() {
            var $loggedIn = $("#monitorMenu-setup .userLi.loggedIn");
            // expect($loggedIn.length).to.be.gt(0);
            $("#monitorMenu-setup .userLi.loggedIn").removeClass("loggedIn");
            Admin.updateLoggedInUsers();
            expect($("#monitorMenu-setup .userLi.loggedIn").length).to.equal(0);
            $loggedIn.addClass("loggedIn");
        });

        after(function() {
            Admin.isAdmin = cached;
        });
    });

    after(function() {
        $("#adminSetupModal").find(".close").click();
        xcLocalStorage.getItem = cachedGetItem;
        $("#container").removeClass("admin posingAsUser");
        xcSessionStorage.removeItem("usingAs");
        UnitTest.offMinMode();
        XcSocket.Instance.sendMessage = oldSend;
        Admin.isAdmin = oldIsAdmin;
    });
});