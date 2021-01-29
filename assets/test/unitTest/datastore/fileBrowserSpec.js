// temporary disable it
describe.skip("Dataset-File Browser Test", function() {
    var $fileBrowser;
    var $pathLists;
    var $pathSection;
    var $mainTabCache;
    var $pickedFileList;
    var testFiles;

    before(function(){
        $fileBrowser = $("#fileBrowser");
        $pathLists = $("#fileBrowserPathMenu");
        $pathSection = $("#fileBrowserPath");
        $pickedFileList = $("#fileInfoContainer .pickedFileList").eq(0);

        $mainTabCache = $(".topMenuBarTab.active");
        $("#dataStoresTab").click();
        UnitTest.onMinMode();

        testFiles = [{
            "name": "test1.csv",
            "attr": {
                "isDirectory": false,
                "mtime": 1434159233,
                "size": 1
            }
        },
        {
            "name": "test2.json",
            "attr": {
                "isDirectory": false,
                "mtime": 1451005071,
                "size": 3
            }
        },
        {
            "name": "test3",
            "attr": {
                "isDirectory": true,
                "mtime": 1458167245,
                "size": 2
            }
        }
        ];
    });

    describe("Basic function test", function() {
        var $testGrid;
        var testHtml;

        before(function(){
            testHtml = '<div class="grid-unit">' +
                            '<div class="label" data-name="test"></div>' +
                        '</div>';
            $testGrid = $(testHtml);
        });

        it("should get current target", function() {
            var $section = $pathSection.find(".targetName");
            var oldVal = $section.text();
            $section.text("testTarget");
            var res = FileBrowser.__testOnly__.getCurrentTarget();
            expect(res).to.equal("testTarget");
            $section.text(oldVal);
        });

        it("should set current target", function() {
            var $section = $pathSection.find(".targetName");
            var oldVal = $section.text();
            FileBrowser.__testOnly__.setTarget("testTarget2");
            var res = FileBrowser.__testOnly__.getCurrentTarget();
            expect(res).to.equal("testTarget2");
            $section.text(oldVal);
        });

        it("should get current path", function() {
            $pathLists.prepend('<li id="fileBrowserTestLi">test</li>');
            var res = FileBrowser.__testOnly__.getCurrentPath();
            expect(res).to.equal("test");
            $pathLists.find("li:first-of-type").remove();
        });

        it("should get grid's name", function() {
            var res = FileBrowser.__testOnly__.getGridUnitName($testGrid);
            expect(res).to.equal("test");
        });

        it("should focus on grid", function() {
            var $container = $("#fileBrowserContainer");
            $container.append($testGrid);
            FileBrowser.__testOnly__.focusOn(null);
            expect($testGrid.hasClass("active")).to.be.false;

            FileBrowser.__testOnly__.focusOn("test", true);
            expect($testGrid.hasClass("active")).to.be.true;
        });

        it("should append path", function() {
            var testPath =  "/test";
            FileBrowser.__testOnly__.appendPath(testPath);
            var $li = $pathLists.find("li:first-of-type");
            var $pathText = $("#fileBrowserPath .text");
            expect($li.text()).to.equal(testPath);
            expect($pathText.val()).to.equal("/test");
            $li.remove();
            $pathText.val("");
        });

        it("should filter files", function() {
            var regEx = new RegExp("json");
            var res = FileBrowser.__testOnly__.filterFiles(testFiles, regEx);
            // have test2.jsons
            expect(res.length).to.equal(1);
            expect(res[0].name).to.equal("test2.json");
        });

        it("should sort files", function() {
            var sortFiles = FileBrowser.__testOnly__.sortFiles;
            var res;

            // test sort by size
            res = sortFiles(testFiles, "size");
            // folder comes first no matter the size
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");

            // test sort by date
            res = sortFiles(testFiles, "date");
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");

            // test sort by name
            res = sortFiles(testFiles, "name");
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");


            // test sort by type
            res = sortFiles(testFiles, "type");
            expect(res[0].name).to.equal("test3");
            expect(res[1].name).to.equal("test1.csv");
            expect(res[2].name).to.equal("test2.json");
        });

        it("should handle redirect error", function(done) {
            FileBrowser.__testOnly__.redirectHandler("testPath")
            .then(function() {
                var error = xcStringHelper.replaceMsg(ErrWRepTStr.NoPath, {
                    "path": "testPath"
                });
                UnitTest.hasStatusBoxWithError(error);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("isDS() should work", function() {
            var isDS = FileBrowser.__testOnly__.isDS;
            var $grid = $('<div></div>');
            expect(isDS($grid)).to.be.false;
            // case 2
            $grid = $('<div class="ds"></div>');
            expect(isDS($grid)).to.be.true;
        });

        it("previewDS() should work", function() {
            var oldFunc = RawFileModal.Instance.show;
            var previewDS = FileBrowser.__testOnly__.previewDS;
            var test = null;

            RawFileModal.Instance.show = function(options) {
                test = options;
            };

            previewDS("");
            expect(test).to.be.null;
            // case 2
            previewDS("test");
            expect(test.fileName).to.equal("test");

            RawFileModal.Instance.show = oldFunc;
        });

        it("findVerticalIcon should work", function() {
            var findVerticalIcon = FileBrowser.__testOnly__.findVerticalIcon;
            var $curIcon = $(testHtml);
            $curIcon.after($testGrid);

            var $res = findVerticalIcon($curIcon, keyCode.Up);
            expect($res).to.equal($curIcon);

            // case 2
            $curIcon.before($testGrid);
            $res = findVerticalIcon($curIcon, keyCode.Down);
            expect($res.length).to.equal(0);
        });

        it("showScrolledFiles should work", function() {
            var showScrolledFiles = FileBrowser.__testOnly__.showScrolledFiles;
            var $fileBrowserMain = $("#fileBrowserMain");
            var $sizer = $('<div class="sizer"></div>');
            $("#fileBrowserContainer").append($sizer);
            var isGridView = $fileBrowserMain.hasClass("gridView");
            // case 1
            $fileBrowserMain.addClass("gridView");
            $sizer.hide();
            showScrolledFiles();
            expect($sizer.css("display")).to.equal("block");
            // case 2
            $fileBrowserMain.removeClass("gridView");
            $sizer.hide();
            showScrolledFiles();
            expect($sizer.css("display")).to.equal("block");

            // clear up
            $sizer.remove();
            if (isGridView) {
                $fileBrowserMain.addClass("gridView");
            }
        });

        it("showPathError should work", function() {
            FileBrowser.__testOnly__.showPathError();
            UnitTest.hasStatusBoxWithError(ErrTStr.InvalidFilePath);
        });

        it("oversizeHandler should work", function() {
            FileBrowser.__testOnly__.oversizeHandler();
            expect($("#innerFileBrowserContainer").text())
            .to.contains(DSTStr.FileOversize);
        });

        after(function() {
            $testGrid.remove();
        });
    });
    describe("File Selection Test", function() {
        var $firstGrid;
        var $lastGrid;
        var submitForm;
        var oldFunc;
        var test;
        var $infoContainer;

        before(function() {
            FileBrowser.__testOnly__.setCurFiles(testFiles);
            FileBrowser.__testOnly__.getHTMLFromFiles(testFiles);
            $firstGrid = $fileBrowser.find(".grid-unit").eq(0);
            $lastGrid = $fileBrowser.find(".grid-unit").eq(testFiles.length - 1);
            submitForm = FileBrowser.__testOnly__.submitForm;
            oldFunc = DSConfig.show;
            test = null;
            DSConfig.show = function(options) {
                test = options;
            };
            $infoContainer = $("#fileInfoContainer");
        });

        it("submitForm should fail when no file is selected", function() {
            // error case
            // use default path
            $pathLists.prepend("<li>/</li>");
            submitForm();
            expect(test).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.InvalidFile);
        });

        it("clicking to select a file should work", function() {
            $firstGrid.click();
            expect($firstGrid.hasClass("selected")).to.be.true;
        });

        it("ctrl-clicking to select more files should work", function() {
            var event = jQuery.Event("click", {"ctrlKey": true, "metaKey": true});
            $lastGrid.trigger(event);
            expect($fileBrowser.find(".grid-unit.selected").length)
                                                .to.equal(testFiles.length - 1);
        });

        it("shift-clicking to select multiple files should work", function() {
            var event = jQuery.Event("click", {"shiftKey": true});
            $firstGrid.trigger(event);
            expect($fileBrowser.find(".grid-unit.selected").length)
                                                    .to.equal(testFiles.length);
        });

        it("should toggle to pick all selected files", function() {
            FileBrowser.__testOnly__.togglePickedFiles($lastGrid);
            // Should give ".picked" to left part
            expect($fileBrowser.find(".grid-unit.picked").length)
                                                    .to.equal(testFiles.length);
            FileBrowser.__testOnly__.updatePickedFilesList();
            // Should add files to right part
            expect($pickedFileList.find("li").length).to.equal(testFiles.length);
        });

        it("unselectSingleFile should work", function() {
            var event = jQuery.Event("click", {"ctrlKey": true, "metaKey": true});
            $firstGrid.trigger(event);
            // Unselect also unpick the file
            expect($firstGrid.hasClass("selected")).to.be.false;
            expect($firstGrid.hasClass("picked")).to.be.false;
            expect($pickedFileList.find("li").length)
                                                .to.equal(testFiles.length - 1);
        });

        it("add regex should work", function() {
            $infoContainer.find(".addRegex").click();
            expect($pickedFileList.find("li").last().hasClass("regex"));
        })

        it("submitForm should work", function() {
            $pathSection.find(".targetName").text(gDefaultSharedRoot);
            // submit by double-clicking a file
            submitForm($firstGrid);
            expect(test).to.be.an("object");
            expect(test.targetName).to.equal(gDefaultSharedRoot);
            expect(test.files.length).to.equal(1);
            expect(test.files[0].path).to.equal("/test1.csv");

            // submit by the added file list
            submitForm();
            expect(test).to.be.an("object");
            expect(test.targetName).to.equal(gDefaultSharedRoot);
            expect(test.files.length).to.equal(testFiles.length);
        });

        it("should toggle to remove and unpick all selected", function() {
            $pickedFileList.find("li.regex .close").click();
            // Toggle to remove all
            FileBrowser.__testOnly__.togglePickedFiles($lastGrid);
            FileBrowser.__testOnly__.updatePickedFilesList(null,
                                                           {isRemove: true});
            expect($fileBrowser.find(".grid-unit.picked").length).to.equal(0);
            expect($pickedFileList.find("li").length).to.equal(0);
        });

        it("hovering/unhovering should work", function() {
            $firstGrid.trigger("mouseenter");
            expect($firstGrid.hasClass("hovering")).to.be.true;
            $firstGrid.trigger("mouseleave");
            expect($firstGrid.hasClass("hovering")).to.be.false;
        });

        it("unpicking in fileInfo should swork", function() {
            // First, toggle to pick all
            $firstGrid.click();
            var event = jQuery.Event("click", {"shiftKey": true});
            $lastGrid.trigger(event);
            FileBrowser.__testOnly__.togglePickedFiles($lastGrid);
            FileBrowser.__testOnly__.updatePickedFilesList();
            expect($fileBrowser.find(".grid-unit.picked").length)
                                                    .to.equal(testFiles.length);
            $infoContainer.find(".pickedFileList .close").eq(0).click();
            expect($fileBrowser.find(".pickedFileList li").length)
                                                .to.equal(testFiles.length - 1);
        });

        it("toggling 'recursive' flag should work", function() {
            // Only one clickable bc there is only one folder
            expect($infoContainer.find(".fileList .checkbox:not(.checked):not(.xc-disabled)").length)
                                                    .to.equal(1);
            var $folder = $infoContainer
                               .find(".fileList .checkbox:not(.checked):not(.xc-disabled)").eq(0);
            $folder.click();
            expect($infoContainer.find(".fileList .checkbox.checked").length).to.equal(1);
            $folder.click();
            expect($infoContainer.find(".fileList .checkbox.checked").length).to.equal(0);

            $infoContainer.find(".selectAll").click();
            expect($infoContainer.find(".fileList .checkbox.checked").length).to.equal(1);
            $infoContainer.find(".selectAll").click();
            expect($infoContainer.find(".fileList .checkbox.checked").length).to.equal(0);
        });

        it("toggle single/multi ds switch should work", function() {
            var $swtich = $infoContainer.find(".switch").eq(0);
            // Click on switch
            $swtich.click();
            expect($swtich.hasClass("on")).to.be.true;
            $swtich.click();
            expect($swtich.hasClass("on")).to.be.false;
            // Click on label
            var $label = $infoContainer.find(".switchLabel");
            expect($label.length).to.equal(2);
            $label.eq(1).click();
            expect($swtich.hasClass("on")).to.be.true;
            $label.eq(0).click();
            expect($swtich.hasClass("on")).to.be.false;
        })
        it("clearAll should work", function() {
            $infoContainer.find(".clearAll").click();
            expect($fileBrowser.find(".pickedFileList li").length).to.equal(0);
        });
        after(function() {
            DSConfig.show = oldFunc;
        })
    })

    describe("Go To Path Test", function() {
        var oldFunc;
        var goToPath;
        var $li;

        before(function() {
            oldFunc = XcalarListFiles;
            goToPath = FileBrowser.__testOnly__.goToPath;
            $li = $('<li>' + "/netstore/datasets/" + '</li>');
        });

        it('Should go to path', function(done) {
            goToPath($li)
            .then(function() {
                assert.isTrue($li.hasClass("select"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not go to path with empty value", function(done) {
            FileBrowser.__testOnly__.goToPath()
            .then(function() {
                assert.isFalse($("#alertModal").is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should handle go to path error", function(done) {
            XcalarListFiles = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            FileBrowser.__testOnly__.goToPath($li)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isTrue($("#alertModal").is(":visible"));
                $("#alertModal").find(".cancel").click();
                done();
            });
        });

        after(function() {
            XcalarListFiles = oldFunc;
        });
    });

    describe("Error Case Test", function() {
        var oldFunc;

        before(function() {
            oldFunc = XcalarListFiles;
        });

        it("Should handle old browser error", function(done) {
            var oldBrowserErr = "Deferred From Old Browser";
            XcalarListFiles = function() {
                return PromiseHelper.reject({error: oldBrowserErr});
            };

            FileBrowser.show(null, "")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal(oldBrowserErr);
                done();
            });
        });

        it("Should handle normal fail case", function(done) {
            var errorMsg = "test";
            XcalarListFiles = function() {
                return PromiseHelper.reject({"error": errorMsg});
            };

            FileBrowser.show(gDefaultSharedRoot, "")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal(errorMsg);

                expect($("#innerFileBrowserContainer").find(".error").text())
                .not.to.equal("");
                done();
            });
        });

        it("Should handle normal fail case when browser other path", function(done) {
            var errorMsg = "test2";
            XcalarListFiles = function() {
                return PromiseHelper.reject({"error": errorMsg});
            };

            FileBrowser.show(gDefaultSharedRoot, "/test/")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal(errorMsg);

                expect($("#innerFileBrowserContainer").find(".error").text())
                .not.to.equal("");
                done();
            });
        });

        after(function() {
            XcalarListFiles = oldFunc;
        });
    });

    describe("Public API and basic behavior test", function() {
        it("should clear filebrrowser", function() {
            $("#fileBrowserUp").removeClass("disabled");
            FileBrowser.clear();
            expect($("#fileBrowserUp").hasClass("disabled"));
        });

        it('Should show the filebrowser', function(done) {
            FileBrowser.show(gDefaultSharedRoot, "")
            .then(function() {
                var $li = $pathLists.find("li:first-of-type");
                expect($li.text()).to.equal("/");
                assert.isTrue($fileBrowser.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it('Should click to toggle view', function() {
            var $fileBrowserMain = $("#fileBrowserMain");
            var isListView = $fileBrowserMain.hasClass("listView");

            // change view
            $("#fileBrowserGridView").click();
            expect($fileBrowserMain.hasClass("listView"))
            .to.equal(!isListView);

            // change view again
            $("#fileBrowserGridView").click();
            expect($fileBrowserMain.hasClass("listView"))
            .to.equal(isListView);

            StatusBox.forceHide();
        });

        it("Should click focus and deFocus a grid", function() {
            var $grid = findGrid("netstore");
            expect($grid.hasClass("active")).to.be.false;
            // focus
            $grid.click();
            expect($grid.hasClass("active")).to.be.true;
            // deFocus
            $("#fileBrowserContainer").click();
            expect($grid.hasClass("active")).to.be.false;
        });

        it("Should dbclick to enter a folder", function(done) {
            var $grid = findGrid("netstore");
            $grid.trigger(jQuery.Event("dblclick"));

            expect($fileBrowser.hasClass("loadMode")).to.be.true;

            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $datasets = findGrid("datasets");
                expect($datasets.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should alert in dblclick of folder when error", function(done) {
            var $datasets = findGrid("datasets");
            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            var oldFunc = XcalarListFiles;

            XcalarListFiles = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            $datasets.trigger(jQuery.Event("dblclick"));

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $alertModal = $("#alertModal");
                assert.isTrue($alertModal.is(":visible"));
                expect($("#alertHeader").find(".text").text())
                .to.equal(ThriftTStr.ListFileErr);
                $alertModal.find(".cancel").click();
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListFiles = oldFunc;
            });
        });

        it("Should click up button to go back", function(done) {
            $("#fileBrowserUp").click();

            expect($fileBrowser.hasClass("loadMode")).to.be.true;

            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $grid = findGrid("netstore");
                expect($grid.length).to.equal(1);

                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("FileBrowser.addFileToUpload should work", function() {
            let file = xcHelper.randName("test");
            FileBrowser.addFileToUpload(file);
            let $grid = findGrid(file);
            expect($grid.length).to.equal(1);
            expect($grid.hasClass("loading")).to.be.true;
        });

        it("Should click refresh button to refresh", function(done) {
            $("#fileBrowserRefresh").click();
            expect($fileBrowser.hasClass("loadMode")).to.be.true;

            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $grid = findGrid("netstore");
                expect($grid.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click cancel button to back to form", function() {
            $fileBrowser.find(".cancel").click();
            assert.isFalse($fileBrowser.is(":visible"));
            assert.isTrue($("#dsFormView").is(":visible"));
        });
    });

    describe("Confirm Behavior Test", function() {
        var oldFunc;
        var test = null;

        before(function() {
            oldFunc = DSConfig.show;
            DSConfig.show = function(options) {
                test = options;
            };
        });

        it("Should click confirm to submitForm", function(done) {
            FileBrowser.show(gDefaultSharedRoot, "")
            .then(function() {
                var $grid = findGrid("netstore");
                $grid.click(); // focus on it
                $grid.find(".checkBox .icon").click();
                $fileBrowser.find(".confirm").click();
                expect(test).to.be.an("object");
                expect(test.files.length).to.equal(1);
                expect(test.files[0].path).contain("netstore");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should dblclick a dataset to submitForm", function(done) {
            var sp500 = testDatasets.sp500;
            FileBrowser.show(sp500.targetName, sp500.path)
            .then(function() {
                var $grid = findGrid("sp500.csv");
                $grid.trigger(jQuery.Event("dblclick"));
                expect(test).to.be.an("object");
                expect(test.files.length).to.equal(1);
                expect(test.files[0].path).contain("sp500.csv");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            DSConfig.show = oldFunc;
            $fileBrowser.find(".cancel").click();
        });
    });

    describe("Sort Behavior Test", function() {
        before(function(done) {
            // not using the cached history
            FileBrowser.show(gDefaultSharedRoot, "/netstore")
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should click sort button to open sort menu", function() {
            var $sortBtn = $("#fileBrowserSort");
            var $menu = $("#fileBrowserSortMenu");

            assert.isFalse($menu.is(":visible"));
            // click not open the menu
            $sortBtn.click();
            assert.isFalse($menu.is(":visible"));
            // normal mouse up not open the menu
            $sortBtn.mouseup();
            assert.isFalse($menu.is(":visible"));
            // unsortable case not show it
            $fileBrowser.addClass("unsortable");
            $sortBtn.trigger(fakeEvent.mouseup);
            assert.isFalse($menu.is(":visible"));
            // left mouse up open the menu
            $fileBrowser.removeClass("unsortable");
            $sortBtn.trigger(fakeEvent.mouseup);
            assert.isTrue($menu.is(":visible"));
            // close it
            $sortBtn.trigger(fakeEvent.mouseup);
            assert.isFalse($menu.is(":visible"));
        });

        it("Should use sort menu to sort", function() {
            var $li = $("#fileBrowserSortMenu").find('li[data-sortkey="size"]');
            expect($li.hasClass("select")).to.be.false;
            // when not left click
            $li.mouseup();
            expect($li.hasClass("select")).to.be.false;

            $li.trigger(fakeEvent.mouseup);
            expect($li.hasClass("select")).to.be.true;
        });

        it("Should sort using title label", function() {
            var $fileBrowserMain = $("#fileBrowserMain");
            var isListView = $fileBrowserMain.hasClass("listView");

            if (!isListView) {
                // change to list view
                $("#fileBrowserGridView").click();
            }
            var $grid = findGrid("netstore");
            // make it active
            $grid.click();
            expect($grid.hasClass("active")).to.be.true;

            // sort by name
            var $nameTitle = $fileBrowserMain.find(".title.fileName");
            var $nameLabel = $nameTitle.find(".label");
            // cannot sort if unsortable
            $fileBrowser.addClass("unsortable");
            $nameLabel.click();
            expect($nameTitle.hasClass("select")).to.be.false;
            // sort
            $fileBrowser.removeClass("unsortable");
            $nameLabel.click();
            expect($nameTitle.hasClass("select")).to.be.true;
            var $curGrid = findGrid("netstore");
            expect($curGrid.hasClass("active")).to.be.true;
            var index = $curGrid.index();
            var $nextGrid = $curGrid.next();
            // var nextGridIndex = $nextGrid.index();
            var nextGridName = $nextGrid.find('.label').data("name");
            // reverse
            $nameLabel.click();
            expect($nameTitle.hasClass("select")).to.be.true;
            $curGrid = findGrid("netstore");
            expect($curGrid.hasClass("active")).to.be.true;

            if ($curGrid.index() === index) { // if grid is right in the middle
                $nextGrid = findGrid(nextGridName);
                expect($nextGrid.index()).to.equal(index - 1);
            } else {
                expect($curGrid.index()).not.to.equal(index);
            }

            if (!isListView) {
                // change back the view
                $("#fileBrowserGridView").click();
            }
        });

        after(function() {
            $fileBrowser.find(".cancel").click();
        });
    });

    describe("Search Behavior Test", function() {
        var $searchSection = $("#fileBrowserSearch");
        var $searchDropdown = $("#fileSearchDropdown");
        var $input = $searchSection.find("input");

        before(function(done) {
            // not using the cached history
            FileBrowser.show(gDefaultSharedRoot, "/netstore/datasets/tpch/")
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should show search dropdown", function() {
            $input.val("region.tbl").trigger("input");
            expect($("#fileSearchDropdown").hasClass("openList")).to.be.true;
        });

        // XXX temporary disabl this test
        it.skip("Should search files", function(done) {
            // we want files called "region.tbl"
            FileBrowser.__testOnly__.searchFiles("region.tb")
            .then(function() {
                var $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should clear search", function() {
            $searchSection.find(".clear").mousedown();
            var $grids = $("#innerFileBrowserContainer").find(".grid-unit");
            expect($grids.length).to.be.above(2);
        });

        it("Should do regex(match) search", function(done) {
            // we want files called "region.tbl"
            $input.val("ion.*").trigger("input");
            var $grids;
            FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(0))
            .then(function() {
                $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(0);
                $input.val(".*re.*tbl").trigger("input");
                return FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(0))
            })
            .then(function() {
                $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should do regex(contains) search", function(done) {
            // we want files called "region.tbl"
            $input.val("gio.*tb").trigger("input");
            var $grids;
            FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(1))
            .then(function() {
                $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should do glob(match) search", function(done) {
            // we want files called "region.tbl"
            $input.val("*gion.tbl").trigger("input");
            FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(2))
            .then(function() {
                $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should do glob(contains) search", function(done) {
            // we want files called "region.tbl"
            $input.val("g*tb").trigger("input");
            FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(3))
            .then(function() {
                $grids = $("#innerFileBrowserContainer").find(".grid-unit");
                expect($grids.length).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should hanld invalid search", function(done) {
            $searchSection.find("input").val("*").trigger("input");
            FileBrowser.__testOnly__.applySearchPattern(
                                              $searchDropdown.find("li").eq(0))
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.equal(ErrTStr.InvalidRegEx);
                expect($input.hasClass("error")).to.be.true;
                done();
            });
        });

        it("Should clear search to remove and restore", function() {
            $searchSection.find(".clear").mousedown();
            var $grids = $("#innerFileBrowserContainer").find(".grid-unit");
            expect($grids.length).to.be.above(2);
            expect($input.hasClass("error")).to.be.false;
        });

        it("Should cancel search", function(done) {
            // Go to a path where search takes longer time
            FileBrowser.show(gDefaultSharedRoot, "/netstore/datasets/")
            .then(function() {
                var len = $grids.length;
                var event = jQuery.Event("keyup", {"which": 13});
                $input.val("region.tbl").trigger(event);
                setTimeout(function() {
                    expect($fileBrowser.find(".searchLoadingSection")
                                       .is(":visible")).to.be.true;
                    $fileBrowser.find(".cancelSearch .xi-close").click();
                    expect($fileBrowser.find(".searchLoadingSection")
                                       .is(":visible")).to.be.false;
                    expect($grids.length).to.equal(len);
                    done();
                }, 500);
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            $fileBrowser.find(".cancel").click();
        });
    });

    describe("Path Behavior Test", function() {
        var $pathSection;

        before(function(done) {
            $pathSection = $("#fileBrowserPath");
            // not using the cached history
            FileBrowser.show(gDefaultSharedRoot, "/netstore")
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should not tigger anything when using invalid key", function() {
            var $input = $pathSection.find(".text");
            var $grid = findGrid("netstore");
            $grid.click();

            var e = jQuery.Event("keyup", {"which": keyCode.Up});
            $input.trigger(e);
            expect($fileBrowser.hasClass("loadMode")).to.be.false;
        });

        it("Should go into folder when enter on path", function(done) {
            var $input = $pathSection.find(".text");
            $input.val("netstore");

            var e = jQuery.Event("keyup", {"which": keyCode.Enter});
            $input.trigger(e);
            expect($fileBrowser.hasClass("loadMode")).to.be.true;

            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                expect($input.val()).to.equal("/netstore/");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should retrive path by input", function(done) {
            var $input = $pathSection.find(".text");
            $input.val("/").trigger("keyup");

            var checkFunc = function() {
                var $grid = findGrid("netstore");
                return $grid.length > 0;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $grid = findGrid("netstore");
                expect($grid.length).to.be.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            $fileBrowser.find(".cancel").click();
        });
    });

    describe("KeyBoard Behavior Test", function() {
        before(function(done) {
            $pathSection = $("#fileBrowserPath");
            // not using the cached history
            FileBrowser.show(gDefaultSharedRoot, "/netstore")
            .then(function() {
                // remove active focus
                $("#innerFileBrowserContainer").click();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should have nothing happen if has invalid last target", function() {
            gMouseEvents.setMouseDownTarget($("body"));
            $("#fileBrowserSearch").find("input").focus().trigger("focus");
            triggerKeyBoradEvent(78); // 78 = "n"

            var $grids = $fileBrowser.find(".grid-unit.active");
            expect($grids.length).to.equal(0);
        });

        it("Should have nothing happen if tareget is input", function() {
            var target = $("#fileBrowserPath").find(".text").get(0);

            gMouseEvents.setMouseDownTarget(null);
            triggerKeyBoradEvent(78, target); // 78 = "n"

            var $grids = $fileBrowser.find(".grid-unit.active");
            expect($grids.length).to.equal(0);
        });

        it("Should focus on grid start with n", function() {
            gMouseEvents.setMouseDownTarget(null);
            triggerKeyBoradEvent(78); // 78 = "n"

            var $grids = $fileBrowser.find(".grid-unit.active");
            expect($grids.length).to.equal(1);
            expect($grids.eq(0).find(".fileName").data("name"))
            .to.contain("n");
        });

        it("Should go left and right using keyboard", function() {
            var isGrid = !$("#fileBrowserMain").hasClass("listView");

            if (!isGrid) {
                // change to grid view
                $("#fileBrowserGridView").click();
            }

            var $grid = findGrid("netstore");
            $grid.click(); // focus on it

            var index = $grid.index();
            // move left
            triggerKeyBoradEvent(keyCode.Left);
            var $activeGrid = $fileBrowser.find(".grid-unit.active");
            expect($activeGrid.index()).to.equal(index - 1);
            // move right
            triggerKeyBoradEvent(keyCode.Right);
            $activeGrid = $fileBrowser.find(".grid-unit.active");
            expect($activeGrid.index()).to.equal(index);

            if (!isGrid) {
                // change back
                $("#fileBrowserGridView").click();
            }
        });

        it("Should go up and down in list view", function() {
            var isListView = $("#fileBrowserMain").hasClass("listView");

            if (!isListView) {
                // change to list view
                $("#fileBrowserGridView").click();
            }

            var $grid = findGrid("netstore");
            $grid.click(); // focus on it

            var index = $grid.index();
            // move left
            triggerKeyBoradEvent(keyCode.Up);
            var $activeGrid = $fileBrowser.find(".grid-unit.active");
            expect($activeGrid.index()).to.equal(index - 1);
            // move right
            triggerKeyBoradEvent(keyCode.Down);
            $activeGrid = $fileBrowser.find(".grid-unit.active");
            expect($activeGrid.index()).to.equal(index);

            if (!isListView) {
                // change back
                $("#fileBrowserGridView").click();
            }
        });

        it("Should enter to go into folder", function(done) {
            var $grid = findGrid("netstore");
            $grid.click(); // focus on it

            triggerKeyBoradEvent(keyCode.Enter);

            expect($fileBrowser.hasClass("loadMode")).to.be.true;

            var checkFunc = function() {
                return !$fileBrowser.hasClass("loadMode");
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $input = $("#fileBrowserPath").find(".text");
                expect($input.val()).to.equal("/netstore/");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should backsape to go back", function(done) {
            triggerKeyBoradEvent(keyCode.Backspace);

            var checkFunc = function() {
                var $grid = findGrid("netstore");
                return $grid.length > 0;
            };

            UnitTest.testFinish(checkFunc)
            .then(function() {
                var $grid = findGrid("netstore");
                expect($grid.length).to.be.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            $fileBrowser.find(".cancel").click();
        });

        function triggerKeyBoradEvent(keyBoradCode, target) {
            if (target == null) {
                target = $("#innerFileBrowserContainer").get(0);
            }

            var e = jQuery.Event("keydown", {
                "which": keyBoradCode,
                "target": target
            });
            $(document).trigger(e);
        }
    });

    // XXX onColResize should work keep failing in
    // expect($header.outerWidth()).to.equal(80);
    // which turns out to be 0 when running the whole tests
    describe.skip("Resize Column Test", function() {
        var $titleRow;
        var $header;
        var $headerSiblings;
        var startWidth;
        var startX;
        var totalPadding;

        before(function(done) {
            $pathSection = $("#fileBrowserPath");
            // not using the cached history
            FileBrowser.show(gDefaultSharedRoot, "/netstore")
            .then(function() {
                // remove active focus
                $("#innerFileBrowserContainer").click();
                $("#fileBrowserGridView").click(); // list view
                $titleRow = $fileBrowser.find(".titleSection");
                $header = $fileBrowser.find(".title.fileName");
                $headerSiblings = $fileBrowser.find(".title.mDate, .title.fileSize");
                startWidth = $header.outerWidth();
                startX = 0;
                totalPadding = 60;

                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("start column resize should work", function() {
            var dragInfo = FileBrowser.__testOnly__.getDragInfo();
            var initialWidth = $header.width();
            expect(dragInfo).to.be.empty;

            var e = $.Event('mousedown', {pageX: startX});
            FileBrowser.__testOnly__.startColResize($header.find(".colGrab"), e);

            expect(dragInfo.startWidth).to.equal(startWidth);
            expect($('#resizeCursor').length).to.equal(1);
        });

        it('onColResize should work', function() {
            expect($header.outerWidth()).to.equal(startWidth);
            // moving mouse all the way to left edge of cell
            // should hit a minimum width
            var newX = -startWidth;
            var e = $.Event('mousemove', {pageX: newX});
            FileBrowser.__testOnly__.onColResize(e);

            // because siblings are twice as small, dividing odd width by 2
            // will generate a rounded number and we can't predict if it's
            // rounded down or up
            expect($header.outerWidth()).to.equal(80);
            expect($headerSiblings.outerWidth() + 1).to.be.gt(($titleRow.width() - (80 + totalPadding)) / 2);
            expect($headerSiblings.outerWidth() - 1).to.be.lt(($titleRow.width() - (80 + totalPadding)) / 2);

            newX = 10000;
            e = $.Event('mousemove', {pageX: newX});
            FileBrowser.__testOnly__.onColResize(e);
            expect($header.outerWidth()).to.equal($titleRow.width() - 200);
            expect($headerSiblings.outerWidth() + 1).to.be.gt((200 - totalPadding) / 2);
            expect($headerSiblings.outerWidth() - 1).to.be.lt((200 - totalPadding) / 2);

            // increasing width by 10px
            newX = 10;
            e = $.Event('mousemove', {pageX: newX});
            FileBrowser.__testOnly__.onColResize(e);
            expect($header.outerWidth()).to.equal(startWidth + newX);
            expect($headerSiblings.outerWidth() + 1).to.gt((($titleRow.width() - (startWidth + newX)) - totalPadding) / 2);
            expect($headerSiblings.outerWidth() - 1).to.lt((($titleRow.width() - (startWidth + newX)) - totalPadding) / 2);
        });

        it('endColResize should work', function() {
            expect($('#resizeCursor').length).to.equal(1);

            FileBrowser.__testOnly__.endColResize();
            var dragInfo = FileBrowser.__testOnly__.getDragInfo();
            expect(dragInfo).to.be.empty;

            // based on onColResize width
            expect($header.outerWidth()).to.equal(startWidth + 10);
            expect($('#resizeCursor').length).to.equal(0);
        });

        after(function() {
            $fileBrowser.find(".cancel").click();
        });
    });

    after(function() {
        // go back to previous tab
        $mainTabCache.click();
        UnitTest.offMinMode();
    });

    function findGrid(name) {
        var selector = '.grid-unit .fileName[data-name="' + name + '"]';
        var $grid = $fileBrowser.find(selector).closest(".grid-unit");
        return $grid;
    }
});