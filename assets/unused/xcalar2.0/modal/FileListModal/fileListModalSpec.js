describe("FileListModal Test", function() {
    var $modal;
    var XcalarMakeResultSetFromDatasetCache;
    var XcalarFetchDataCache;
    before(function() {
        $modal = $("#fileListModal");
        UnitTest.onMinMode();
        XcalarMakeResultSetFromDatasetCache = XcalarMakeResultSetFromDataset;
        XcalarFetchDataCache = XcalarFetchData;
    });

    describe("FileListModal General Test", function() {
        it("should show the modal with error if resultset data fails", function(done) {
            var called = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                var deferred = PromiseHelper.deferred();
                expect(dsName).to.equal("dsId");
                expect(forErrors).to.equal(true);


                setTimeout(function() {
                    called = true;
                    deferred.reject("test");
                }, 1);
                return deferred.promise();
            };


            FileListModal.Instance.show("dsId", null);
            assert.isTrue($modal.is(":visible"));
            expect($modal.hasClass("load"));
            UnitTest.testFinish(function() {
                return called === true;
            })
            .then(function() {
                expect($modal.hasClass("load")).to.be.false;
                expect($modal.hasClass("hasError")).to.be.true;
                expect($modal.find(".errorSection").text()).to.equal("test. ");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should close", function() {
            assert.isTrue($modal.is(":visible"));
            expect($modal.find(".close").length).to.equal(1);
            $modal.find(".close").click();
            expect($modal.is(":visible")).to.be.false;
        });

        it("should show the modal with error if fetch data fails", function(done) {
            var called = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({});
            };

            XcalarFetchData = function() {
                var deferred = PromiseHelper.deferred();
                setTimeout(function() {
                    called = true;
                    deferred.reject({error:"test2", log: "logs"});
                }, 1);
                return deferred.promise();
            };


            FileListModal.Instance.show("dsId", null);
            assert.isTrue($modal.is(":visible"));
            expect($modal.hasClass("load"));
            UnitTest.testFinish(function() {
                return called === true;
            })
            .then(function() {
                expect($modal.hasClass("load")).to.be.false;
                expect($modal.hasClass("hasError")).to.be.true;
                expect($modal.find(".errorSection").text()).to.equal("test2. logs");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getList should work", function() {
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({});
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve(['{"fullPath": "a"}','{"fullPath": "b"}']);
            };

            FileListModal.Instance._getList()
            .then(function(list) {
                expect(list.length).to.equal(2);
                expect(list[0]).to.equal("a");
                expect(list[1]).to.equal("b");
            })
            .fail(function(){
                expect("fail").to.equal("pass");
            });

            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({});
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve([]);
            };

            FileListModal.Instance._getList()
            .then(function(list) {
                expect("pass").to.equal("fail");
            })
            .fail(function(err) {
                expect(err).to.equal(AlertTStr.FilePathError);
            });
        });

        it("constructTree should work", function(){
            FileListModal.Instance._constructTree(["/a"], "testName");
            var nodesMap = FileListModal.Instance._nodesMap;
            expect(Object.keys(nodesMap).length).to.equal(2);
            expect(nodesMap.hasOwnProperty("testName")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a")).to.be.true;

            expect(nodesMap["testName"].children.length).to.equal(1);
            expect(nodesMap["testName"].value.type).to.equal("folder");
            expect(nodesMap["testName"].value.name).to.equal("testName");
            expect(nodesMap["testName"].value.isRoot).to.be.true;
            expect(nodesMap["testName"].children[0].value.fullPath).to.equal("testName/a");

            expect(nodesMap["testName/a"].children.length).to.equal(0);
            expect(nodesMap["testName/a"].value.type).to.equal("file");
            expect(nodesMap["testName/a"].value.name).to.equal("a");
            expect(nodesMap["testName/a"].value.isRoot).to.be.false;


            FileListModal.Instance._constructTree(["/a/b.txt", "/a/c.txt", "/a/b/c.txt"], "testName");
            var nodesMap = FileListModal.Instance._nodesMap;

            expect(Object.keys(nodesMap).length).to.equal(6);
            expect(nodesMap.hasOwnProperty("testName")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a/b")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a/b.txt")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a/c.txt")).to.be.true;
            expect(nodesMap.hasOwnProperty("testName/a/b/c.txt")).to.be.true;

            expect(nodesMap["testName"].children.length).to.equal(1);
            expect(nodesMap["testName"].value.type).to.equal("folder");
            expect(nodesMap["testName"].value.name).to.equal("testName");
            expect(nodesMap["testName"].value.isRoot).to.be.true;

            expect(nodesMap["testName/a"].children.length).to.equal(3);
            expect(nodesMap["testName/a"].value.type).to.equal("folder");
            expect(nodesMap["testName/a"].value.name).to.equal("a");
            expect(nodesMap["testName/a"].value.isRoot).to.be.false;

            expect(nodesMap["testName/a/b"].children.length).to.equal(1);
            expect(nodesMap["testName/a/b"].value.type).to.equal("folder");
            expect(nodesMap["testName/a/b"].value.name).to.equal("b");
            expect(nodesMap["testName/a/b"].value.isRoot).to.be.false;
            expect(nodesMap["testName/a/b"].children[0].value.fullPath).to.equal("testName/a/b/c.txt");

            expect(nodesMap["testName/a/b.txt"].children.length).to.equal(0);
            expect(nodesMap["testName/a/b.txt"].value.type).to.equal("file");
            expect(nodesMap["testName/a/b.txt"].value.name).to.equal("b.txt");
            expect(nodesMap["testName/a/b.txt"].value.isRoot).to.be.false;

            expect(nodesMap["testName/a/b/c.txt"].children.length).to.equal(0);
            expect(nodesMap["testName/a/b/c.txt"].value.type).to.equal("file");
            expect(nodesMap["testName/a/b/c.txt"].value.name).to.equal("c.txt");
            expect(nodesMap["testName/a/b/c.txt"].value.isRoot).to.be.false;

            expect(Object.keys(FileListModal.Instance._roots).length).to.equal(1);
            expect(FileListModal.Instance._roots.hasOwnProperty("testName")).to.be.true;
        });

        // using FileListModal.Instance.show to create the whole thing
        it("draw tree should work", function() {
            $modal.find(".close").click();
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({});
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve(['{"fullPath": "/a/d.txt"}','{"fullPath": "/a/b.txt"}', '{"fullPath": "/c.txt"}']);
            };

            FileListModal.Instance.show("dsId", null);
            expect($modal.height()).to.equal(400);
            expect($modal.width()).to.equal(500);


            expect($modal.find(".folder").length).to.equal(2); // dataset and "a" have folder class
            var $btxtLabel = $modal.find(".name").filter(function() {
                return $(this).text() === "b.txt";
            });
            expect($btxtLabel.length).to.equal(1);
            expect($btxtLabel.closest("li").siblings().length).to.equal(1);

            expect($btxtLabel.closest("li").siblings().find(".name").filter(function() {
                return $(this).text() === "d.txt";
            }).length).to.equal(1);

            expect($modal.find(".datasetIcon").length).to.equal(1);
        });

        // using previous tree
        // XXX fails jenkins: should not text UI
        it.skip("collapse and expand should work", function() {
            expect($modal.find(".treeWrap").find(".label:visible").length).to.equal(5);
            var $folderIcon = $modal.find(".treeWrap").find(".name").filter(function() {
                return $(this).text() === "a";
            }).closest(".label");
            expect($folderIcon.length).to.equal(1);
            expect($folderIcon.next("ul").is(":visible")).to.be.true;
            expect($folderIcon.parent().hasClass("collapsed")).to.be.false;

            $folderIcon.click();
            expect($folderIcon.next("ul").is(":visible")).to.be.false;
            expect($folderIcon.parent().hasClass("collapsed")).to.be.true;
            expect($modal.find(".treeWrap").find(".label:visible").length).to.equal(3);

            $folderIcon.click();
            expect($folderIcon.next("ul").is(":visible")).to.be.true;
            expect($folderIcon.parent().hasClass("collapsed")).to.be.false;
            expect($modal.find(".treeWrap").find(".label:visible").length).to.equal(5);
        });

        it("search should work", function() {
            $modal.find(".searchbarArea input").val("x").trigger("input");
            expect($modal.find(".highlightedText").length).to.equal(3);
            expect($modal.find(".highlightedText.selected").length).to.equal(1);

            expect($modal.find(".highlightedText.selected").parent().text().endsWith(".txt")).to.be.true;

            $modal.find(".searchbarArea").find(".closeBox").click(); // clear
            $modal.find(".searchbarArea").find(".closeBox").click(); //close
            expect($modal.find(".highlightedText").length).to.equal(0);
            expect($modal.find(".searchbarArea input").val()).to.equal("");
        });

        // XXX fails jenkins: should not text UI
        it.skip("resize modal should work", function() {
            $modal.find(".treeWrap").height(500);
            $modal.find(".treeWrap").width(500);
            expect($modal.height()).to.equal(400);
            expect($modal.width()).to.equal(400);

            FileListModal.Instance._resizeModal();

            expect($modal.height()).to.equal(554);
            expect($modal.width()).to.equal(580);
        });
    });

    after(function() {
        $modal.find(".close").click();
        UnitTest.offMinMode();
        XcalarMakeResultSetFromDataset = XcalarMakeResultSetFromDatasetCache;
        XcalarFetchData = XcalarFetchDataCache;
    });
});