// DS is deprecated after notebook
describe.skip("Dataset-DS Test", function() {
    var $mainTabCache;
    var $gridView;
    var $dsListFocusTrakcer;
    var $statusBox;

    var testFolder;
    var testDS;
    var user;
    var oldKVPut;

    var verifyCurrentNum = (testNum) => {
        var currentNum = Number($(".numDataStores").eq(0).text());
        expect(currentNum).to.equal(testNum);
    };

    before(function(done){
        UnitTest.onMinMode();
        console.clear();
        $gridView = $("#dsListSection").find(".gridItems");
        $dsListFocusTrakcer = $("#dsListFocusTrakcer");
        $statusBox = $("#statusBox");
        user = XcUser.getCurrentUserName();
        oldKVPut = XcalarKeyPut;
        XcalarKeyPut = () => PromiseHelper.resolve();

        $mainTabCache = $(".topMenuBarTab.active");
        UnitTest.testFinish(function() {
            return !$("#menuBar").hasClass("animating");
        })
        .then(function() {
            $("#dataStoresTab").click();
            return (UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            }));
        })
        .then(function() {
            if (!$("#inButton").hasClass("active")) {
                $("#inButton").click();
            }
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Basic Function Test", function() {
        it("Should get home folder", function() {
            var homeFolder = DS.getHomeDir();
            expect(homeFolder).to.be.an("object");
            expect(homeFolder).to.have.property("id").to.equal(".");
            expect(homeFolder).to.have.property("name").to.equal(".");
            expect(homeFolder).to.have.property("user").to.equal(user);
            expect(homeFolder).to.have.property("parentId").to.equal(".parent");
            expect(homeFolder).to.have.property("isFolder").to.be.true;
            expect(homeFolder).to.have.property("uneditable").to.be.false;
            expect(homeFolder).to.have.property("eles")
                                .to.be.instanceof(Array)
                                .to.have.length.of.at.least(0);
            expect(homeFolder).to.have.property("totalChildren")
                                .to.be.at.least(0);
        });

        it('shoud get persist home dir', () => {
            const copy = DS.getHomeDir();
            const homeDir = DS.getHomeDir(true);
            expect(copy).not.to.equal(homeDir);
        });

        it("should get shared dir", function() {
            var persistSharedDir = DS.getSharedDir(true);
            expect(persistSharedDir).to.be.an("object");
            expect(persistSharedDir).not.to.be.instanceof(DSObj);

            var nonPersistSharedDir = DS.getSharedDir(false);
            expect(nonPersistSharedDir).to.be.an("object");
            expect(nonPersistSharedDir).to.be.instanceof(DSObj);
        });

        it("Should get dsObj", function() {
            expect(DS.getDSObj(".").parentId).to.equal(".parent");
        });

        it("Should get error dsobj", function() {
            expect(DS.getErrorDSObj()).to.be.null;
        });

        it("DS.getGrid should work", function() {
            // edge case
            var res = DS.getGrid();
            expect(res).to.be.null;

            // home folder case
            res = DS.getGrid(".");
            expect(res).not.to.be.empty;
        });

        it("DS.getUniqueName should work", function() {
            var name = xcHelper.randName("test");
            var dsName = DS.getUniqueName(name);
            expect(name).to.equal(dsName);

            var oldFunc = DS.has;
            DS.has = function() {
                return true;
            };
            dsName = DS.getUniqueName(name);
            expect(name).not.to.equal(dsName);
            DS.has = oldFunc;
        });

        it("DS.has should work", function() {
            var testName = DS.getUniqueName("testSuites-dsObj");
            expect(DS.has(testName)).to.be.false;
            expect(DS.has(null)).to.be.false;
        });

        it("DS.cancel should work", function(done) {
            var $grid = $('<div class="active" data-txid="test"></div>');
            var oldFunc = QueryManager.cancelQuery;
            QueryManager.cancelQuery = function() {
                return PromiseHelper.reject("test");
            };
            DS.cancel($grid)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect($grid.hasClass("active")).to.be.false;
                expect($grid.hasClass("inactive")).to.be.true;
                expect($grid.hasClass("deleting")).to.be.true;
                done();
            })
            .always(function() {
                QueryManager.cancelQuery = oldFunc;
            });
        });

        it("DS.resize should work", function() {
            var $menu = $("#datastoreMenu");
            var isListView = $gridView.hasClass("listView");
            var isActive = $menu.hasClass("active");
            var name = new Array(100).fill("a").join(""); // a long name
            var $testLabel = $('<div class="label" data-dsname="' + name + '"></div>');
            $testLabel.text(name).appendTo($gridView);
            $gridView.addClass("listView");
            $menu.addClass("active");
            DS.resize();
            expect($testLabel.text()).to.contains("."); // has ellipsis

            $testLabel.remove();
            if (!isListView) {
                $gridView.removeClass("listView");
            }
            if (!isActive) {
                $menu.removeClass("active");
            }
        });

        it("Should add current user's ds", function() {
            var user = XcUser.getCurrentUserName();
            var dsName = DS.getUniqueName("testDS");
            var testName = user + "." + dsName;
            var ds = DS.addCurrentUserDS(testName, {
                format: "CSV",
                path: "testPath"
            });

            expect(ds).not.to.be.null;
            expect(ds.getName()).to.equal(dsName);
            expect(ds.getFormat()).to.equal("CSV");
            var dsId = ds.getId();
            DS.__testOnly__.removeDS(dsId);
            expect(DS.getDSObj(dsId)).to.be.null;
        });

        it("should cache error ds", function() {
            expect(DS.getErrorDSObj("test")).to.be.null;
            DS.__testOnly__.cacheErrorDS("test", "testDSObj");
            expect(DS.getErrorDSObj("test")).to.equal("testDSObj");
        });

        it("should remoe cache error ds", function() {
            DS.removeErrorDSObj("test");
            expect(DS.getErrorDSObj("test")).to.be.null;
        });

        // it("createTableHelper should work", function(done) {
        //     var $grid = $("<div></div>");
        //     var dsObj = {
        //         fetch: function() { return PromiseHelper.resolve(null, []); },
        //         getName: function() { return "test"; },
        //         getId: function() { return "test"; }
        //     };
        //     var oldAddCart = DSCart.addCart;
        //     var oldCreateTable = DSCart.createTable;
        //     var test = false;
        //     DSCart.addCart = function() {};
        //     DSCart.createTable = function() {
        //         test = true;
        //         return PromiseHelper.resolve();
        //     };

        //     DS.__testOnly__.createTableHelper($grid, dsObj)
        //     .then(function() {
        //         expect(test).to.equal(true);
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     })
        //     .always(function() {
        //         DSCart.addCart = oldAddCart;
        //         DSCart.createTable = oldCreateTable;
        //     });
        // });

        it('DS.toggleSharing should toggle sharing', () => {
            const disable = $gridView.hasClass('disableShare');
            // case 1
            DS.toggleSharing(false);
            expect($gridView.hasClass('disableShare')).to.be.false;
            // case 2
            DS.toggleSharing(true);
            expect($gridView.hasClass('disableShare')).to.be.true;

            // restore
            if (!disable) {
                DS.toggleSharing(false);
            }
        });

        it('should alert sample size limit', () => {
            const oldAlert = Alert.show;
            let test = false;
            Alert.show = () => { test = true };
            DS.__testOnly__.alertSampleSizeLimit('test');
            expect(test).to.be.true;
            Alert.show = oldAlert;
        });

        it("Should update num of datasets", function() {
            DS.updateNumDS(3);
            verifyCurrentNum(3);
        });

        it("Should update num of datasets to right num", function() {
            var originNum = $("#dsListSection .gridItems .ds").length;
            DS.updateNumDS();
            verifyCurrentNum(originNum);
        });

        it("DS.getFormatFromDS should work", function(done) {
            let oldGet = DS.getLoadArgsFromDS;
            let oldCommit = UserSettings.commit;
            let ds = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });
            let loadArgs = JSON.stringify({
                "args": {
                    "loadArgs": {
                        "parseArgs": {
                            "parserFnName": "default:parseCsv"
                        }
                    }
                }
            });
            DS.getLoadArgsFromDS = () => PromiseHelper.resolve(loadArgs);

            UserSettings.commit = () => {};

            DS.getFormatFromDS(ds)
            .then(function(format) {
                expect(format).to.equal("CSV");
                expect(ds.getFormat()).to.equal("CSV");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DS.getLoadArgsFromDS = oldGet;
                UserSettings.commit = oldCommit;
            });
        });

        it("DS.getFormatFromDS should handle error case", function(done) {
            let oldGet = DS.getLoadArgsFromDS;
            let ds = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });

            DS.getLoadArgsFromDS = () => PromiseHelper.resolve(null);

            DS.getFormatFromDS(ds)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).not.to.be.empty;
                expect(ds.getFormat()).to.equal(undefined);
                done();
            })
            .always(function() {
                DS.getLoadArgsFromDS = oldGet;
            });
        });
    });

    describe('share ds Test', () => {
        let disableShare;
        let dsId;
        let dsName;

        before(() => {
            disableShare = $gridView.hasClass('disableShare');
            addDS();
        });

        function addDS() {
            dsName = xcHelper.randName('testDS');
            const ds = DS.addCurrentUserDS(dsName);
            dsId = ds.getId();
        }

        it('should not share ds when disabled', () => {
            const oldAlert = Alert.show;
            let test = false;
            Alert.show = () => { test = true; };
            DS.toggleSharing(true);

            DS.__testOnly__.shareDS(dsId);

            expect(test).to.be.false;
            Alert.show = oldAlert;
        });

        it('should share ds', () => {
            const oldAlert = Alert.show;
            let test = false;
            Alert.show = () => { test = true; };

            const $grid = $('<div class="grid-unit shared" ' +
                            'data-dsname="' + dsName + '"></div>');
            $gridView.append($grid);
            // on prem deployment
            DS.toggleSharing(false);
            DS.__testOnly__.shareDS(dsId);
            expect(test).to.be.true;

            Alert.show = oldAlert;
            $grid.remove();
        });

        it('unshareDS should work', () => {
            const oldAlert = Alert.show;
            let test = false;
            Alert.show = () => { test = true; };

            const $grid = $('<div class="grid-unit" ' +
                            'data-dsname="' + dsName + '"></div>');
            $gridView.append($grid);

            DS.__testOnly__.unshareDS(dsId);

            expect(test).to.be.true;
            Alert.show = oldAlert;
            $grid.remove();
        });

        it('shareAndUnshareHelper should handle work for unshare case', (done) => {
            const xcSocket = XcSocket.Instance;
            const oldSendMessage = xcSocket.sendMessage;
            const oldRestore = DS.restore;

            xcSocket.sendMessage = (name, arg, callback) => {
                if (typeof callback === 'function') {
                    callback(false);
                }
            };

            DS.restore = () => PromiseHelper.reject('test');

            const shareAndUnshareHelper = DS.__testOnly__.shareAndUnshareHelper;
            const dsObj = DS.getDSObj(dsId);
            shareAndUnshareHelper(dsId, dsObj.getName(), true)
            .then(() => {
                done('fail');
            })
            .fail(() => {
                const ds = DS.getDSObj(dsId);
                expect(ds).not.to.be.null;
                done();
            })
            .always(() => {
                xcSocket.sendMessage = oldSendMessage;
                DS.restore = oldRestore;
            });
        });

        it('shareAndUnshareHelper should handle work for share case', (done) => {
            const xcSocket = XcSocket.Instance;
            const oldSendMessage = xcSocket.sendMessage;
            const oldLogChange = UserSettings.logChang;
            const oldCommit = UserSettings.commit;
            const oldFocusOn = DS.focusOn;

            xcSocket.sendMessage = (name, arg, callback) => {
                if (typeof callback === 'function') {
                    callback(true);
                }
            };

            UserSettings.logChang = () => {};
            UserSettings.commit =  () => {};
            DS.focusOn = () => {};

            const shareAndUnshareHelper = DS.__testOnly__.shareAndUnshareHelper;
            const dsObj = DS.getDSObj(dsId);
            shareAndUnshareHelper(dsId, dsObj.getName(), false)
            .then(() => {
                const ds = DS.getDSObj(dsId);
                expect(ds).not.to.be.null;
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                xcSocket.sendMessage = oldSendMessage;
                UserSettings.logChang = oldLogChange;
                UserSettings.commit = oldCommit;
                DS.focusOn = oldFocusOn;
            });
        });

        it('DS.updateDSInfo should work for add case', () => {
            const oldAlert = Alert.show;
            let test = false;
            Alert.show = () => { test = true; };

            const ds = new DSObj(DS.getDSObj(dsId));
            ds.parentId = DSObjTerm.homeDirId;
            const arg = {
                action: 'add',
                ds: ds
            };
            DS.updateDSInfo(arg);
            expect(DS.getDSObj(dsId)).not.to.be.null;
            expect(test).to.be.true;

            Alert.show = oldAlert;
        });

        it('DS.updateDSInfo should work for rename case', () => {
            const oldRename = DS.rename;
            let test = false;
            DS.rename = () => { test = true; };

            const ds = DS.getDSObj(dsId);
            const arg = {
                action: 'rename',
                ds: ds
            };
            DS.updateDSInfo(arg);
            expect(test).to.be.true;

            DS.rename = oldRename;
        });

        it('DS.updateDSInfo should work for drop case', () => {
            const oldGet = DS.getDSObj;
            let test = false;
            DS.getDSObj = () => { test = true; };

            const arg = {
                action: 'drop',
                dsId: null,
                targetId: null
            };
            DS.updateDSInfo(arg);
            expect(test).to.be.true;

            DS.getDSObj = oldGet;
        });

        it('DS.updateDSInfo should work for delete case', () => {
            const arg = {
                action: 'delete',
                dsIds: [dsId]
            };
            DS.updateDSInfo(arg);
            expect(DS.getDSObj(dsId)).to.be.null;
        });

        after(() => {
            DS.toggleSharing(disableShare);
            DS.__testOnly__.removeDS(dsId);
        });
    });

    describe("Hide unlistable DS Test", function() {
        var $grid;
        var dsId;
        var oldGetDSNode;
        var dsSet;
        var checkUnlistableDS;

        before(function() {
            dsId = xcHelper.randName("test");
            $grid = $('<div class="grid-unit" data-dsid="' + dsId + '"></div>');
            $grid.appendTo($gridView);
            oldGetDSNode = XcalarGetDSNode;

            checkUnlistableDS = DS.__testOnly__.checkUnlistableDS;
            dsSet = {};
            dsSet[dsId] = true;
        });

        it("should handle empty unlistable ds case", function(done) {
            checkUnlistableDS({})
            .then(function() {
                expect($grid.css("display")).to.equal("block");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle fail case", function(done) {
            XcalarGetDSNode = function() {
                return PromiseHelper.reject("test");
            };

            checkUnlistableDS(dsSet)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        it("should hide unlistable ds", function(done) {
            XcalarGetDSNode = function() {
                return PromiseHelper.resolve({
                    numNodes: 0,
                    nodeInfo: []
                });
            };

            checkUnlistableDS(dsSet)
            .then(function() {
                expect($grid.css("display")).to.equal("none");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should not hide unlistable ds that has table associated to it", function(done) {
            XcalarGetDSNode = function() {
                return PromiseHelper.resolve({
                    numNodes: 1,
                    nodeInfo: [{name: dsId}]
                });
            };
            $grid.show();
            checkUnlistableDS(dsSet)
            .then(function() {
                expect($grid.css("display")).to.equal("block");
                expect(dsSet.hasOwnProperty(dsId)).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            XcalarGetDSNode = oldGetDSNode;
            $grid.remove();
        });
    });

    describe("Grid View Event Test", function() {
        var $folder;

        before(function() {
            // test is on home folder
            DS.goToDir(DSObjTerm.homeDirId);
        });

        it("Should click toggle view button to toggle the view", function() {
            var isListView = $gridView.hasClass("listView");
            $("#dataViewBtn").click();
            expect($gridView.hasClass("listView")).to.equal(!isListView);

            // switch back to old view
            $("#dataViewBtn").click();
            expect($gridView.hasClass("listView")).to.equal(isListView);
        });

        it("Should add folder by clicking addFolderBtn", function() {
            var homeFolder = DS.getDSObj(DSObjTerm.homeDirId);
            var numEles = homeFolder.eles.length;
            $("#addFolderBtn").click();

            $folder = $gridView.find(".grid-unit.folder.active");
            expect($folder.length).to.equal(1);
            var newNumEles = homeFolder.eles.length;
            expect(newNumEles - numEles).to.equal(1);
        });

        it("Should click on folder to focus on it", function() {
            $folder.click();
            expect($folder.hasClass("active")).to.be.true;
        });

        it("Should dbclick a folder to enter", function() {
            var e = jQuery.Event("dblclick");
            $folder.trigger(e);
            expect($folder.hasClass("xc-hidden")).to.be.true;
        });

        it("Should click backFolderBtn to go back", function() {
            $("#backFolderBtn").click();
            expect($folder.hasClass("xc-hidden")).to.be.false;
        });

        it("Should click forwardFolderBtn to go forward", function() {
            $("#forwardFolderBtn").click();
            expect($folder.hasClass("xc-hidden")).to.be.true;
        });

        it("Should go to home via path section", function() {
            var $path = $('#dsListSection .path[data-dir="' +
                            DSObjTerm.homeDirId + '"]');
            expect($path.length).to.equal(1);
            $path.click();
            expect($folder.hasClass("xc-hidden")).to.be.false;
        });

        // it("Should edit the folder's name", function() {
        //     $folder.find(".edit").click();
        //     var $label = $folder.find("> .label");
        //     expect($label.hasClass("focused")).to.be.true;
        //     var $textarea = $label.find("textarea");
        //     expect($textarea.length).to.equal(1);

        //     // should click on textarea
        //     $textarea.click();
        //     expect($label.hasClass("focused")).to.be.true;

        //     var newName = xcHelper.randName("folder");
        //     $textarea.text(newName);
        //     $textarea.trigger(fakeEvent.enter);
        //     if ($label.hasClass("focused")) {
        //         $textarea.blur();
        //     }
        //     expect($label.data("dsname")).to.equal(newName);
        // });

        it("should trigger delete from grid view use keyboard", function() {
            var id = xcHelper.randName("test");
            var $grid = $('<div class="grid-unit selected" data-dsid="' + id + '"></div>');
            $grid.appendTo($gridView);
            var oldRemove = DS.remove;
            var test = false;
            DS.remove = function() { test = true; };
            var e = jQuery.Event("keydown", {which: keyCode.Delete});
            $dsListFocusTrakcer.trigger(e);
            expect(test).to.equal(true);
            // clear up
            $grid.remove();
            DS.remove = oldRemove;
        });
    });

    describe("New Folder Test", function() {
        it("Should create new folder", function() {
            testFolder = DS.newFolder();

            expect(testFolder).to.be.instanceof(DSObj);
            expect(testFolder).to.have.property("id");
            expect(testFolder).to.have.property("name");
            expect(testFolder).to.have.property("user").to.equal(user);
            expect(testFolder).to.have.property("parentId");
            expect(testFolder).to.have.property("eles");
            expect(testFolder).to.have.property("totalChildren");
            expect(testFolder).to.have.property("isFolder").to.be.true;
            expect(testFolder).to.have.property("uneditable").to.be.false;

            // should blur it first, otherwise rename will have bug
            var $grid = DS.getGrid(testFolder.getId());
            $grid.find(".label textarea").blur();
        });

        it("Should get testFolder from id", function() {
            var dsId = testFolder.getId();
            expect(DS.getDSObj(dsId)).to.equal(testFolder);
            var $grid = DS.getGrid(dsId);
            expect($grid).not.to.be.empty;
        });

        it("Should rename the folder", function() {
            var newName = xcHelper.uniqueRandName("testFolder");
            newName = DS.getUniqueName(newName);
            var isRenamed = DS.rename(testFolder.getId(), newName);
            expect(isRenamed).to.be.true;
            expect(testFolder.getName()).to.equal(newName);
        });

        it("Should not renmae to old name", function() {
            var oldName = testFolder.getName();
            var isRenamed = DS.rename(testFolder.getId(), oldName);
            expect(isRenamed).to.be.false;
            expect(testFolder.getName()).to.equal(oldName);
        });

        it("Should not rename folder to invalid name", function() {
            var oldName = testFolder.getName();
            var newName = xcHelper.uniqueRandName("test*folder");
            newName = DS.getUniqueName(newName);
            var isRenamed = DS.rename(testFolder.getId(), newName);
            expect(isRenamed).to.be.false;
            expect(testFolder.getName()).to.equal(oldName);

            assert.isTrue($statusBox.is(":visible"), "see statux box");
            $("#statusBoxClose").mousedown();
            assert.isFalse($statusBox.is(":visible"), "no statux box");
        });

        it("Should go to and out of folder", function() {
            var dsId = testFolder.getId();
            var $grid = DS.getGrid(dsId);
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");

            // error case
            DS.goToDir(null);
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");

            DS.goToDir(dsId);
            assert.isTrue($grid.hasClass("xc-hidden"), "cannot see folder");

            DS.upDir();
            assert.isFalse($grid.hasClass("xc-hidden"), "see folder");
        });
    });

    describe("New Dataset Test", function() {
        it("should handle DS.load error", function(done) {
            var oldFunc = DS.focusOn;
            DS.focusOn = function() {
                return PromiseHelper.reject("test");
            };

            var name = DS.getUniqueName("test");
            var dataset = testDatasets.sp500;
            var dsArgs = $.extend({}, dataset, {"name": name});
            DS.load(dsArgs)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                UnitTest.hasAlertWithTitle(StatusMessageTStr.ImportDSFailed);
                done();
            })
            .always(function() {
                DS.focusOn = oldFunc;
            });
        });

        it("Should import ds", function(done) {
            var name = DS.getUniqueName("testSuites-dsObj-sp500");
            var dataset = testDatasets.sp500;
            var dsArgs = $.extend({}, dataset, {"name": name});
            var oldCreate = XcalarDatasetCreate;
            var oldActivate = XcalarDatasetActivate;
            XcalarDatasetCreate = () => PromiseHelper.resolve();
            XcalarDatasetActivate = () => PromiseHelper.resolve();
            DS.load(dsArgs)
            .then(function(dsObj) {
                testDS = dsObj;

                expect(testDS).to.be.instanceof(DSObj);
                expect(testDS).to.have.property("id");
                expect(testDS).to.have.property("name").to.equal(name);
                expect(testDS).to.have.property("format").to.equal(dataset.format);
                expect(testDS).to.have.property("sources").be.an("array");
                expect(testDS.sources).to.equal(dataset.sources);
                expect(testDS).to.have.property("size");
                expect(testDS).to.have.property("numEntries");
                expect(testDS).to.have.property("parentId");
                expect(testDS).not.to.have.property("eles");
                expect(testDS).to.have.property("totalChildren").to.equal(1);
                expect(testDS).to.have.property("isFolder").to.false;
                done();
                // setTimeout(function() {
                //     // wait for sample table to load
                //     done();
                // }, 2000);
            })
            .fail(function() {
                done("fail");
            })
            .always(() => {
                XcalarDatasetCreate = oldCreate;
                XcalarDatasetActivate = oldActivate;
            });
        });

        it("Should get testDS from name/id", function() {
            var dsId = testDS.getId();
            var dsName = testDS.getName();

            expect(DS.getGridByName(dsName)).not.to.be.empty;
            expect(DS.getDSObj(dsId)).to.equal(testDS);
            var $grid = DS.getGrid(dsId);
            expect($grid).not.to.be.empty;
            expect(DS.has(dsName)).to.be.true;
        });

        it("Should not multi focs on fetching grid", function(done) {
            var $grid = DS.getGrid(testDS.getId());
            expect($grid.hasClass("active")).to.be.true;
            expect($grid.hasClass("fetching")).to.be.false;

            $grid.addClass("fetching");
            DS.focusOn($grid)
            .then(function() {
                // if code trigger DSTable.show, should remove the fetching
                // class later
                expect($grid.hasClass("fetching")).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $grid.removeClass("fetching");
            });
        });

        it("DS.isLoading should work", function() {
            var $grid = DS.getGrid(testDS.getId());
            $grid.addClass("loading");
            expect(DS.isLoading(testDS.getId())).to.be.true;
            expect(DS.isLoading("")).to.be.false;
            $grid.removeClass("loading");
        })
    });

    describe("Grid Menu Test", function() {
        var $wrap;
        var $gridMenu;
        var $ds;
        var $folder;
        var $subMenu;

        before(function() {
            $wrap = $("#dsListSection .gridViewWrapper");
            $gridMenu = $("#gridViewMenu");
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
            $subMenu = $("#gridViewSubMenu");

            if (!$("#datastoreMenu").hasClass("active")) {
                $("#inButton").click();
            }
        });

        afterEach(function() {
            $gridMenu.hide();
        });

        it("Should open menu on background", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $("#dsListSection").get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.true;
        });

        it("Should open menu on folder", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $folder.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.false;
            expect($gridMenu.hasClass("folderOpts")).to.be.true;
        });

        it("Should open menu on ds", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("bgOpts")).to.be.false;
            expect($gridMenu.hasClass("dsOpts")).to.be.true;
        });

        it("should open with multiple grid unit selected", function() {
            $ds.addClass("selected");
            $folder.addClass("selected");
            var e = jQuery.Event("contextmenu", {
                "target": $folder.get(0)
            });
            $wrap.trigger(e);
            expect($gridMenu.hasClass("multiOpts")).to.be.true;
            $ds.removeClass("selected");
            $folder.removeClass("selected");
        });

        it("Should open menu with the right class", function() {
            $ds.addClass("unlistable").addClass("noAction");
            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("unlistable")).to.be.true;
            expect($gridMenu.hasClass("noAction")).to.be.true;
            $ds.removeClass("unlistable").removeClass("noAction");
        });

        it("Should click .newFolder to create new folder", function() {
            var oldFunc = DS.newFolder;
            var test = false;
            DS.newFolder = function() {
                test = true;
            };

            var $li = $gridMenu.find(".newFolder");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.newFolder = oldFunc;
        });

        it("Should click .back to up folder", function() {
            var oldFunc = DS.upDir;
            var test = false;
            DS.upDir = function() {
                test = true;
            };

            var $li = $gridMenu.find(".back");
            var isDisabled = $li.hasClass("disabled");
            $li.removeClass("disabled");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.upDir = oldFunc;

            if (isDisabled) {
                $li.addClass("disabled");
            }
        });

        it("Should click .refresh to refresh ds/folder", function() {
            var oldFunc = DS.restore;
            var test = false;
            DS.restore = function() {
                test = true;
                // reject to not trigger UserSettings.commit
                return PromiseHelper.reject();
            };

            var $li = $gridMenu.find(".refresh");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.restore = oldFunc;
        });

        it("Should click .open to open folder/ds", function() {
            var oldFunc =DS.goToDir;
            var test = false;
            DS.goToDir = function() {
                test = true;
            };

            var $li = $gridMenu.find(".open");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.goToDir = oldFunc;
        });

        it("Should click .moveUp to drop grid to parent", function() {
            var oldFunc = DS.dropToParent;
            var test = false;
            DS.dropToParent = function() {
                test = true;
            };

            var $li = $gridMenu.find(".moveUp");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.dropToParent = oldFunc;
        });

        it("Should click .rename to rename foler", function() {
            var e = jQuery.Event("contextmenu", {
                "target": $folder.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("folderOpts")).to.be.true;

            var $li = $gridMenu.find(".rename");
            // simple mouse up not work
            $li.mouseup();
            expect($folder.find("textarea").length).to.equal(0);
            $li.trigger(fakeEvent.mouseup);
            expect($folder.find("textarea").length).to.equal(1);

            $folder.find("textarea").blur();
        });

        it("Should click .preview to preview ds", function() {
            var oldFunc = DS.focusOn;
            var test = false;
            DS.focusOn = function() {
                test = true;
            };

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            assert.isTrue($gridMenu.is(":visible"));
            expect($gridMenu.hasClass("dsOpts")).to.be.true;

            var $li = $gridMenu.find(".preview");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.focusOn = oldFunc;
        });

        it("Should click .delete to delete folder/ds", function() {
            var oldFunc = DS.remove;
            var test = false;
            DS.remove = function() {
                test = true;
            };

            var $li = $gridMenu.find(".delete");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.remove = oldFunc;
        });

        it("Should click .multiDelete to delete folder/ds", function() {
            var oldFunc = DS.remove;
            var test = false;
            DS.remove = function() {
                test = true;
            };

            var $li = $gridMenu.find(".multiDelete");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DS.remove = oldFunc;
        });

        it("should click .getInfo to get ds info", function() {
            var oldFunc = DSInfoModal.Instance.show;
            var test = false;
            DSInfoModal.Instance.show = function() {
                test = true;
            };

            var $li = $gridMenu.find(".getInfo");
            // simple mouse up not work
            $li.mouseup();
            expect(test).to.be.false;
            $li.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;

            DSInfoModal.Instance.show = oldFunc;
        });

        it("should click .deactivate to deactivate ds", function() {
            var oldDeleteLoadNode = XcalarDatasetDeleteLoadNode;
            var oldGetDSUsers = XcalarGetDatasetUsers;
            var oldFunc = XcalarDatasetDeactivate;
            var test = false;
            XcalarDatasetDeactivate = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            XcalarDatasetDeleteLoadNode = function() {
                return PromiseHelper.resolve();
            };
            XcalarGetDatasetUsers = function() {
                return PromiseHelper.resolve([]);
            };
            var $li = $gridMenu.find(".deactivate");
            $li.mouseup(); // simple mouse up not work
            expect(test).to.be.false;

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            $li.trigger(fakeEvent.mouseup);
            UnitTest.hasAlertWithTitle(DSTStr.DeactivateDS, {
                confirm: true
            });
            expect(test).to.be.true;

            XcalarDatasetDeactivate = oldFunc;
            XcalarDatasetDeleteLoadNode = oldDeleteLoadNode;
            XcalarGetDatasetUsers = oldGetDSUsers;
        });

        it("should click .activate to activate ds", function() {
            var oldFunc = XcalarDatasetActivate;
            var test = false;
            XcalarDatasetActivate = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            var $li = $gridMenu.find(".activate");
            $li.mouseup();  // simple mouse up not work
            expect(test).to.be.false;

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            $li.trigger(fakeEvent.mouseup);
            UnitTest.hasAlertWithTitle(DSTStr.ActivateDS, {
                confirm: true
            });
            expect(test).to.be.true;

            XcalarDatasetActivate = oldFunc;
        });

        it("should click to multi deactivate ds", function() {
            $ds.addClass("selected");
            var oldDeleteLoadNode = XcalarDatasetDeleteLoadNode;
            var oldGetDSUsers = XcalarGetDatasetUsers;
            var oldFunc = XcalarDatasetDeactivate;
            var test = false;
            XcalarDatasetDeactivate = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            XcalarDatasetDeleteLoadNode = function() {
                return PromiseHelper.resolve();
            };
            XcalarGetDatasetUsers = function() {
                return PromiseHelper.resolve([]);
            };
            var $li = $gridMenu.find(".multiDeactivate");
            $li.mouseup();  // simple mouse up not work
            expect(test).to.be.false;

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            $li.trigger(fakeEvent.mouseup);
            UnitTest.hasAlertWithTitle(DSTStr.DeactivateDS, {
                confirm: true
            });
            expect(test).to.be.true;

            XcalarDatasetDeactivate = oldFunc;
            XcalarDatasetDeleteLoadNode = oldDeleteLoadNode;
            XcalarGetDatasetUsers = oldGetDSUsers;
            $ds.removeClass("selected");
        });

        it("should click to multi activate ds", function(done) {
            $ds.addClass("selected");
            var oldFunc = XcalarDatasetActivate;
            var test = false;
            XcalarDatasetActivate = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            var $li = $gridMenu.find(".multiActivate");
            $li.mouseup();  // simple mouse up not work
            expect(test).to.be.false;

            var e = jQuery.Event("contextmenu", {
                "target": $ds.get(0)
            });
            $wrap.trigger(e);
            $li.trigger(fakeEvent.mouseup);
            UnitTest.hasAlertWithTitle(DSTStr.ActivateDS, {
                confirm: true
            });
            expect(test).to.be.true;

            UnitTest.testFinish(() => {
                return test === true
            })
            .then(() => {
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(() => {
                XcalarDatasetActivate = oldFunc;
                $ds.removeClass("selected");
            });
        });

        it("should click to sort ds by name", function() {
            DS.__testOnly__.setSortKey("none");
            var $li = $subMenu.find('.sort li[name="name"]');
            // simple mouse up not work
            $li.mouseup();
            var sortKey = DS.__testOnly__.getSortKey();
            expect(sortKey).to.equal(null);

            $li.trigger(fakeEvent.mouseup);
            sortKey = DS.__testOnly__.getSortKey();
            expect(sortKey).to.equal("name");
            // trigger again has no side effect
            $li.trigger(fakeEvent.mouseup);
            sortKey = DS.__testOnly__.getSortKey();
            expect(sortKey).to.equal("name");

            $gridMenu.find(".sort").mouseenter();
            expect($li.hasClass("select")).to.be.true;
        });

        it("should click to sort ds by type", function() {
            var $option = $('#dsListSection .sortOption[data-key="type"]');
            $option.click();
            var sortKey = DS.__testOnly__.getSortKey();
            expect(sortKey).to.equal("type");
            expect($option.hasClass("key")).to.be.true;
        });

        it("should click to disable sort", function() {
            var $li = $subMenu.find('.sort li[name="none"]');
            $li.trigger(fakeEvent.mouseup);
            var sortKey = DS.__testOnly__.getSortKey();
            expect(sortKey).to.equal(null);
        });
    });

    // XXX fails in jenkins, it's string
    describe.skip("Create Selection Test", function() {
        var $ds;
        var $wrap;

        before(function() {
            $wrap = $("#dsListSection .gridViewWrapper");
            $ds = DS.getGrid(testDS.getId());
        });

        it("should create selection", function() {
            // invalid case 1
            $wrap.mousedown();
            expect($("#gridView-rectSelection").length).to.equal(0);
            // invalid case 2
            var e = jQuery.Event("mousedown", {
                "which": 1,
                "target": $('<div class="gridIcon"></div>').get(0),
                "pageX": 0,
                "pageY": 0
            });

            $wrap.trigger(e);
            expect($("#gridView-rectSelection").length).to.equal(0);

            // valid case
            e = jQuery.Event("mousedown", {
                "which": 1,
                "pageX": 0,
                "pageY": 0
            });

            $wrap.trigger(e);
            expect($("#gridView-rectSelection").length).to.equal(1);
        });

        it("should create selection to select ds", function() {
            var offsest = $ds.offset();
            var e = jQuery.Event("mousemove", {
                "pageX": offsest.left + 25,
                "pageY": offsest.top + 100
            });
            // need to trigger twice mousemove
            $(document).trigger(e);
            expect($gridView.hasClass("drawing")).to.be.true;
            $(document).trigger(e);
            expect($ds.hasClass("selecting")).to.be.true;
            $(document).trigger("mouseup");
            expect($ds.hasClass("selected")).to.be.true;
            expect($gridView.hasClass("drawing")).to.be.false;
        });
    });

    describe("Drag and Drop test", function() {
        var $ds;
        var $folder;

        before(function() {
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
            DS.__testOnly__.setSortKey("none");
        });

        it("Baisc Drag getter and setter should work", function() {
            // initially has no drag ds
            expect(DS.__testOnly__.getDragDS()).to.not.exist;

            DS.__testOnly__.setDragDS($ds);
            expect(DS.__testOnly__.getDragDS().get(0)).to.equal($ds.get(0));

            DS.__testOnly__.resetDragDS();
            expect(DS.__testOnly__.getDragDS()).to.be.undefined;
        });

        it("Baisc Drop getter and setter should work", function() {
            // initially has no drop ds
            expect(DS.__testOnly__.getDropTarget()).to.not.exist;

            DS.__testOnly__.setDropTraget($folder);
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal($folder.get(0));

            DS.__testOnly__.resetDropTarget();
            expect(DS.__testOnly__.getDropTarget()).to.be.undefined;
        });

        it("Should insert ds", function() {
            DS.insert($ds, $folder, true);
            // ds now is on the left of folder
            expect($folder.prev().get(0)).to.equal($ds.get(0));

            DS.insert($ds, $folder, false);
            // ds now is on the right of folder
            expect($folder.next().get(0)).to.equal($ds.get(0));
        });

        it("Should drop to folder", function() {
            DS.dropToFolder($ds, $folder);
            expect($ds.data("dsparentid")).to.equal($folder.data("dsid"));

            DS.dropToParent($ds);
            expect($ds.data("dsparentid")).not.to.equal($folder.data("dsid"));
        });

        it("DS.onDragStart should work", function() {
            // fake event
            var target = $ds.get(0);
            var e = jQuery.Event("dragstart", {"target": target});
            e.dataTransfer = {
                "effectAllowed": "",
                "setData": function() {}
            };
            DS.onDragStart(e);
            expect(DS.__testOnly__.getDragDS().get(0)).to.equal(target);
            expect($ds.find("> .dragWrap").hasClass("xc-hidden")).to.be.true;
            expect($gridView.hasClass("drag")).to.be.true;
        });

        it("Should allow drop", function() {
            var e = jQuery.Event("dragenter");
            expect(e.isDefaultPrevented()).to.be.false;
            DS.allowDrop(e);
            expect(e.isDefaultPrevented()).to.be.true;
        });

        it("Should drag enter a folder", function() {
            var $dragWrap = $folder.find(".leftTopDragWrap");
            var target = $dragWrap.get(0);
            var e = jQuery.Event("dragenter", {"target": target});
            DS.onDragEnter(e);
            expect(e.isDefaultPrevented()).to.be.true;
            expect($dragWrap.hasClass("active")).to.be.true;
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal(target);
        });

        it("Should drag enter middle wrap of folder", function() {
            var $dragWrap = $folder.find(".midDragWrap");
            var target = $dragWrap.get(0);
            var e = jQuery.Event("dragenter", {"target": target});

            DS.onDragEnter(e);
            expect($folder.find(".leftTopDragWrap").hasClass("active"))
            .to.be.false;
            expect($folder.hasClass("entering")).to.be.true;
            expect(DS.__testOnly__.getDropTarget().get(0)).to.equal(target);
        });

        it("Should on drop to the folder", function() {
            var e = jQuery.Event("drop");
            DS.onDrop(e);
            expect($ds.data("dsparentid")).to.equal($folder.data("dsid"));

            DS.dropToParent($ds);
            expect($ds.data("dsparentid")).not.to.equal($folder.data("dsid"));
        });

        it("should end the drop event", function() {
            // fake event
            var target = $ds.get(0);
            var e = jQuery.Event("dragstart", {"target": target});
            DS.onDragEnd(e);
            expect(DS.__testOnly__.getDragDS()).not.to.exist;
            expect($ds.find("> .dragWrap").hasClass("xc-hidden")).to.be.false;
            expect($gridView.hasClass("drag")).to.be.false;
        });
    });

    describe("Activate/Deactivate ds test", function() {
        var activateDS;
        var deactivateDS;
        var oldCommit;
        var oldLoad;
        var oldUnload;
        var oldActivate;

        before(function() {
            activateDS = DS.__testOnly__.activateDS;
            deactivateDS = DS.__testOnly__.deactivateDS;
            oldCommit = UserSettings.commit;
            oldLoad = XIApi.loadDataset;
            oldUnload = XcalarDatasetDeactivate;
            oldActivate = XcalarDatasetActivate;

            UserSettings.commit = function() { return PromiseHelper.resolve(); };
        });

        it("should handle deactivate fail case", function(done) {
            XcalarDatasetDeactivate = function() {
                return PromiseHelper.reject({error: "test"});
            };
            deactivateDS([testDS.getId()])
            .then(function() {
                UnitTest.hasAlertWithTitle(AlertTStr.Error);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should deactivate the dataset", function(done) {
            var oldDeleteLoadNode = XcalarDatasetDeleteLoadNode;
            var oldGetDSUsers = XcalarGetDatasetUsers;
            XcalarDatasetDeleteLoadNode = function() {
                return PromiseHelper.resolve();
            };
            XcalarGetDatasetUsers = function() {
                return PromiseHelper.resolve([]);
            };
            XcalarDatasetDeactivate = function() {
                return PromiseHelper.resolve();
            };
            var dsId = testDS.getId();
            deactivateDS([dsId])
            .then(function() {
                expect(DS.getDSObj(dsId).isActivated()).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDatasetDeleteLoadNode = oldDeleteLoadNode;
                XcalarGetDatasetUsers = oldGetDSUsers;
            });
        });

        it("should handle activate fail case", function(done) {
            XcalarDatasetActivate = function() {
                return PromiseHelper.reject({error: "test"});
            };
            activateDS([testDS.getId()])
            .then(function() {
                UnitTest.hasAlertWithTitle(AlertTStr.Error);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should activate the dataset", function(done) {
            XcalarDatasetActivate = function() {
                return PromiseHelper.resolve();
            };
            var dsId = testDS.getId();
            activateDS([dsId])
            .then(function() {
                expect(DS.getDSObj(dsId).isActivated()).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            UserSettings.commit = oldCommit;

            XIApi.loadDataset = oldLoad;
            XcalarDatasetDeactivate = oldUnload;
            XcalarDatasetActivate = oldActivate;
        });
    });

    describe("Delete DS Test", function() {
        var $ds;
        var $folder;
        var $alertModal;

        before(function() {
            $ds = DS.getGrid(testDS.getId());
            $folder = DS.getGrid(testFolder.getId());
            $alertModal = $("#alertModal");
        });

        it("should not delete uneditable folder", function() {
            var folder = DS.getDSObj($folder.data("dsid"));
            folder.uneditable = true;
            DS.remove($folder);
            UnitTest.hasAlertWithTitle(AlertTStr.NoDel);
            folder.uneditable = false;
        });

        it("Should not delete folder with ds", function() {
            DS.dropToFolder($ds, $folder);
            expect($ds.data("dsparentid")).to.equal($folder.data("dsid"));

            DS.remove($folder);
            // see alert
            assert.isTrue($alertModal.is(":visible"), "see alert");
            $alertModal.find(".close").click();
            assert.isFalse($alertModal.is(":visible"), "no see alert");

            // folder is still there
            expect(DS.getGrid(testFolder.getId())).not.to.be.empty;
        });

        it("Should delete empty folder", function() {
            var dsId = testFolder.getId();
            // drop back to parent
            DS.dropToParent($ds);
            expect($ds.data("dsparentid")).not.to.equal($folder.data("dsid"));

            DS.remove($folder);
            // not alert
            assert.isFalse($alertModal.is(":visible"), "no alert");
            // folder is deleted
            expect(DS.getGrid(dsId)).have.length(0);
            expect(DS.getDSObj(dsId)).not.to.exist;
        });

        it("should not delete activated dataset", function() {
            DS.remove($ds);
            UnitTest.hasAlertWithTitle(AlertTStr.NoDel);
        });

        it("should deactivate ds", function(done) {
            var oldCommit = UserSettings.commit;
            var oldDeleteLoadNode = XcalarDatasetDeleteLoadNode;
            var oldGetDSUsers = XcalarGetDatasetUsers;
            XcalarGetDatasetUsers = function() {
                return PromiseHelper.resolve([]);
            };
            XcalarDatasetDeactivate = function() {
                return PromiseHelper.resolve();
            };
            UserSettings.commit = function() {};
            var dsId = testDS.getId();
            DS.__testOnly__.deactivateDS([testDS.getId()])
            .then(function() {
                expect(DS.getDSObj(dsId).isActivated()).to.be.false;
                UserSettings.commit = oldCommit;
                done();
            })
            .fail(function() {
                UserSettings.commit = oldCommit;
                done("fail");
            })
            .always(function() {
                XcalarDatasetDeleteLoadNode = oldDeleteLoadNode;
                XcalarGetDatasetUsers = oldGetDSUsers;
            });
        });

        it("should cancel ds", function() {
            var oldCancel = DS.cancel;
            var test = false;
            DS.cancel = function() {
                test = true;
                return PromiseHelper.resolve();
            };
            $ds.data("txid", "test");
            DS.remove($ds);
            UnitTest.hasAlertWithTitle(DSTStr.CancelPoint, {
                "confirm": true
            });
            expect(test).to.be.true;
            $ds.removeData("txid");
            DS.cancel = oldCancel;
        });

        it("should trigger ds and see alert", function() {
            DS.remove($ds);
            UnitTest.hasAlertWithTitle(DSTStr.DelDS);
        });

        it("should handle delete error", function(done) {
            var oldFunc = XcalarDatasetDelete;
            XcalarDatasetDelete = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            var def = DS.remove($ds);
            UnitTest.hasAlertWithTitle(DSTStr.DelDS, {
                "confirm": true,
                "nextAlert": true
            });

            def
            .then(function() {
                UnitTest.hasAlertWithTitle(AlertTStr.NoDel);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDatasetDelete = oldFunc;
            });
        });

        it("Should delete ds", function(done) {
            var oldFunc = XcalarDatasetDelete;
            XcalarDatasetDelete = function() {
                return PromiseHelper.resolve();
            };
            var dsId = testDS.getId();
            var def = DS.remove($ds);
            UnitTest.hasAlertWithTitle(DSTStr.DelDS, {
                "confirm": true
            });

            def
            .then(function() {
                // ds is deleted
                expect(DS.getGrid(dsId)).have.length(0);
                expect(DS.getDSObj(dsId)).not.to.exist;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarDatasetDelete = oldFunc;
            });
        });
    });

    after(function() {
        xcTooltip.hideAll(); // toggle list view test may have tooltip
        $mainTabCache.click();
        XcalarKeyPut = oldKVPut;
        UnitTest.offMinMode();
    });
});
