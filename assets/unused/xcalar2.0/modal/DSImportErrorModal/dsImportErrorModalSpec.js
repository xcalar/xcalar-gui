describe("DSImportErrorModal Test", function() {
    var $modal;
    var XcalarMakeResultSetFromDatasetCache;
    var XcalarFetchDataCache;
    before(function() {
        $modal = $("#dsImportErrorModal");
        UnitTest.onMinMode();
        XcalarMakeResultSetFromDatasetCache = XcalarMakeResultSetFromDataset;
        XcalarFetchDataCache = XcalarFetchData;
    });

    describe("DSImportErrorModal General Test", function() {
        it("should fetch initial rows when opening", function() {
            var called = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({resultSetId: 99, numEntries: 1});
            };

            XcalarFetchData = function() {
                called = true;
                return  PromiseHelper.resolve(['{"fullPath": "a", "numErrors": 1, "errors": [{"error": "fakeError", "recordNumber": 3}]}']);
            };

            DSImportErrorModal.Instance.show("testName", 1);
            expect(called).to.be.true;

            var scrollMeta = DSImportErrorModal.Instance._scrollMeta;
            expect(scrollMeta.currentRowNumber).to.equal(1);
            expect(scrollMeta.numRecords).to.equal(1);

            expect($modal.find(".errorFileList .row").length).to.equal(1);
            expect($modal.find(".errorFileList .row.active.row0").length).to.equal(1);
            expect($modal.find(".errorFileList .row").text()).to.equal("aa"); // has a hidden char

            expect($modal.find(".recordMessageList .row").length).to.equal(1);
            expect($modal.find(".recordMessageList .row.row0.collapsed").length).to.equal(1);
            expect($modal.find(".recordMessageList .row .num").text()).to.equal("3");
            expect($modal.find(".recordMessageList .row .errorMsg").text()).to.equal("fakeError");

            $modal.find(".close").click();
        });

        // if we fetch 20 but some rows have no errors, should fetch more until there's 20
        it("should show 20 rows even if additional fetch is required", function() {
            var count = 0;
            var called = false;
            var calledAgain = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({resultSetId: 99, numEntries: 100});
            };

            XcalarFetchData = function(id, startIndex, numRowsToAdd, total) {
                console.log(startIndex, numRowsToAdd, total);
                expect(id).to.equal(99);
                if (called) {
                    expect(startIndex).to.equal(20);
                    expect(numRowsToAdd).to.equal(10);
                } else {
                    expect(startIndex).to.equal(0);
                    expect(numRowsToAdd).to.equal(20);
                }

                expect(total).to.equal(100);
                if (called) {
                    calledAgain = true;
                }
                called = true;
                var list = [];
                for (var i = 0; i < numRowsToAdd; i++) {
                    var numErrors;
                    if (calledAgain) {
                        numErrors = 1;
                    } else {
                        numErrors = i % 2; // half will be 0, half will be 1
                    }
                    var path = {"fullPath": "path" + count,
                        "numErrors": numErrors,
                        "errors": [{"error": "fakeError", "recordNumber": count}]
                    };
                    list.push(JSON.stringify(path));
                    count++;
                }

                return  PromiseHelper.resolve(list);
            };

            DSImportErrorModal.Instance.show("testName", null);
            expect(called).to.be.true;
            expect(calledAgain).to.be.true;

            scrollMeta = DSImportErrorModal.Instance._scrollMeta;
            expect(scrollMeta.currentRowNumber).to.equal(30);
            expect(scrollMeta.numRecords).to.equal(100);

            expect($modal.find(".errorFileList .row").length).to.equal(20);
            expect($modal.find(".errorFileList .row.active.row0").length).to.equal(1);
            expect($modal.find(".errorFileList .row0").text()).to.equal("apath1"); // has a hidden char
            expect($modal.find(".errorFileList .row19").text()).to.equal("apath29"); // has a hidden char

            expect($modal.find(".recordMessageList .row").length).to.equal(1);
            expect($modal.find(".recordMessageList .row.row0.collapsed").length).to.equal(1);
            expect($modal.find(".recordMessageList .row .num").text()).to.equal("1");
            expect($modal.find(".recordMessageList .row .errorMsg").text()).to.equal("fakeError");
            $modal.find(".close").click();
        });

        it("should fetch no more than 20 rows when opening", function() {
            var called = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                return PromiseHelper.resolve({resultSetId: 99, numEntries: 100});
            };

            XcalarFetchData = function(id, startIndex, numRowsToAdd, total) {
                expect(id).to.equal(99);
                expect(startIndex).to.equal(0);
                expect(numRowsToAdd).to.equal(20);
                expect(total).to.equal(100);

                called = true;
                var list = [];
                for (var i = 0; i < numRowsToAdd; i++) {
                    var path = {"fullPath": "path" + i,
                        "numErrors": 1,
                        "errors": [{"error": "fakeError", "recordNumber": i}]
                    };
                    list.push(JSON.stringify(path));
                }

                return  PromiseHelper.resolve(list);
            };

            DSImportErrorModal.Instance.show("testName", null);
            expect(called).to.be.true;

            scrollMeta = DSImportErrorModal.Instance._scrollMeta;
            expect(scrollMeta.currentRowNumber).to.equal(20);
            expect(scrollMeta.numRecords).to.equal(100);

            expect($modal.find(".errorFileList .row").length).to.equal(20);
            expect($modal.find(".errorFileList .row.active.row0").length).to.equal(1);
            expect($modal.find(".errorFileList .row0").text()).to.equal("apath0"); // has a hidden char
            expect($modal.find(".errorFileList .row19").text()).to.equal("apath19"); // has a hidden char

            expect($modal.find(".recordMessageList .row").length).to.equal(1);
            expect($modal.find(".recordMessageList .row.row0.collapsed").length).to.equal(1);
            expect($modal.find(".recordMessageList .row .num").text()).to.equal("0");
            expect($modal.find(".recordMessageList .row .errorMsg").text()).to.equal("fakeError");

        });

        it("clicking file path should work", function() {
            expect($modal.find(".errorFileList .row.active.row0").length).to.equal(1);
            expect($modal.find(".errorFileList .row.active.row1").length).to.equal(0);

            $modal.find(".errorFileList .row1").click();

            expect($modal.find(".errorFileList .row.active.row0").length).to.equal(0);
            expect($modal.find(".errorFileList .row.active.row1").length).to.equal(1);
        });

        it("clicking on expand icon should work",function() {
            expect($modal.find(".recordMessageList .row").hasClass("collapsed")).to.be.true;
            expect($modal.find(".recordMessageList .row").hasClass("expanded")).to.be.false;

            $modal.find(".recordMessageList .recordNum").click();

            expect($modal.find(".recordMessageList .row").hasClass("collapsed")).to.be.false;
            expect($modal.find(".recordMessageList .row").hasClass("expanded")).to.be.true;

            $modal.find(".recordMessageList .recordNum").click();

            expect($modal.find(".recordMessageList .row").hasClass("collapsed")).to.be.true;
            expect($modal.find(".recordMessageList .row").hasClass("expanded")).to.be.false;
        });

        it("download should work", function() {
            var called = false;
            var resultSetCalled = false;
            XcalarMakeResultSetFromDataset = function(dsName, forErrors) {
                resultSetCalled = true;
                return PromiseHelper.resolve({resultSetId: 99, numEntries: 100});
            };

            XcalarFetchData = function(id, startIndex, numRowsToAdd, total) {
                expect(startIndex).to.equal(0);
                expect(numRowsToAdd).to.equal(100);
                expect(total).to.equal(100);

                called = true;
                var list = [];
                for (var i = 0; i < numRowsToAdd; i++) {
                    var path = {"fullPath": "path" + i,
                        "numErrors": 1,
                        "errors": [{"error": "fakeError", "recordNumber": i}]
                    };
                    list.push(JSON.stringify(path));
                    list.push(JSON.stringify(path)); // 2 errors per row
                }

                return  PromiseHelper.resolve(list);
            };

            var cachedHelper = xcHelper.downloadAsFile;
            var downloaded = false;
            xcHelper.downloadAsFile = function(name, data) {
                var parsedData = JSON.parse(data);
                expect(parsedData.length).to.equal(200);
                expect(parsedData[0].fileName).to.equal("path0")
                expect(parsedData[0].recordNumber).to.equal(0)
                expect(parsedData[0].error).to.equal("fakeError");
                expect(parsedData[199].fileName).to.equal("path99")
                expect(parsedData[199].recordNumber).to.equal(99)
                expect(parsedData[199].error).to.equal("fakeError");
                downloaded = true;
            };

            $modal.find(".downloadErrorModal").click();
            expect(called).to.be.true;
            expect(resultSetCalled).to.be.true;
            expect(downloaded).to.be.true;

            xcHelper.downloadAsFile = cachedHelper;
        });
    });

    // XXX scrolling tests tend to fail so will only include those that don't
    // involve listening to scroll event
    describe("scrolling", function() {
        it("scrolling down should work", function() {
            var called = false;
            XcalarFetchData = function(id, startIndex, numRowsToAdd, total) {
                expect(startIndex).to.equal(20);
                expect(numRowsToAdd).to.equal(10);
                expect(total).to.equal(100);

                called = true;
                var list = [];
                for (var i = startIndex; i < startIndex + numRowsToAdd; i++) {
                    var path = {"fullPath": "path" + i,
                        "numErrors": 1,
                        "errors": [{"error": "fakeError", "recordNumber": i}]
                    };
                    list.push(JSON.stringify(path));
                }

                return PromiseHelper.resolve(list);
            };
            DSImportErrorModal.Instance._fetchRows(20, 10);

            expect(called).to.be.true;
            var scrollMeta = DSImportErrorModal.Instance._scrollMeta;
            expect(scrollMeta.currentRowNumber).to.equal(30);
            expect($modal.find(".errorFileList .row").length).to.equal(30);
            expect($modal.find(".errorFileList .row").first().hasClass("row0")).to.be.true;
            expect($modal.find(".errorFileList .row").last().hasClass("row29")).to.be.true;
            expect($modal.find(".tempRow").length).to.equal(1);
        });
    });


    after(function() {
        $modal.find(".close").click();
        UnitTest.offMinMode();
        XcalarMakeResultSetFromDataset = XcalarMakeResultSetFromDatasetCache;
        XcalarFetchData = XcalarFetchDataCache;
    });
});
