// XXX this modal is deprecated since notebook change
describe.skip("JupyterUDFModal Test", function() {
    var $modal;
    var tableId;
    var tableName;
    var tableName2;
    var tableId2;
    var activeWKBNK;
    var workbook;
    var dfTablePrefix;
    var cachedDetDagTabById;
    let oldgTables;

    before(function(done) {
        oldgTables = gTables;
        gTables = [];
        $modal = $("#jupyterUDFTemplateModal");
        UnitTest.onMinMode();
        activeWKBNK = WorkbookManager.getActiveWKBK();
        workbook = WorkbookManager.getWorkbook(activeWKBNK);
        dfTablePrefix = "table_DF2_" + workbook.sessionId + "_";
        cachedDetDagTabById = DagList.Instance.getDagTabById;

        DagTblManager.Instance.setup()
        .always(() => {
            DagList.Instance.getDagTabById = function() {
                return {
                    getName: () => "test dataflow",
                }
            }

            // create some fake tables and fake columns
            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "testCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "testCol2",
                "backName": "prefix::testCol2",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol3 = new ProgCol({
                "name": "testCol3",
                "backName": "prefix::testCol3",
                "type": "array",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol4 = new ProgCol({
                "name": "DATA",
                "backName": "DATA",
                "isNewCol": false,
                "func": {
                    "name": "raw"
                }
            });

            tableName = "fakeTable#zz999";
            tableId = "zz999";
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": [progCol1, progCol2, progCol3, progCol4]
            });
            gTables[tableId] = table;
            oldTableCache = DagTblManager.Instance.cache;
            DagTblManager.Instance.cache = {};
            DagTblManager.Instance.addTable(tableName);

            tableName2 = dfTablePrefix + "1_0_dag_5C2E5E0B0EF91A85_1_36#t_1_3";
            tableId2 = "t_1_3";
            table = new TableMeta({
                "tableId": tableId2,
                "tableName": tableName2,
                "status": TableType.Active,
                "tableCols": [progCol1, progCol2, progCol3, progCol4]
            });
            gTables[tableId2] = table;
            DagTblManager.Instance.addTable(tableName2);
            $("#jupyterTab .mainTab").click();

            done();
        });
    });

    describe("Modal open test", function() {
        it ("map modal should show", function() {
            JupyterUDFModal.Instance.show("map");
            expect($modal.hasClass("type-map")).to.be.true;
            expect($modal.hasClass("type-newImport")).to.be.false;
            expect($modal.find(".mapForm .moduleName").val()).to.equal("");
            $modal.find(".close").click();
        });

        it ("import modal should show", function() {
            JupyterUDFModal.Instance.show("newImport", {target: "someTarget", filePath: "test"});
            expect($modal.hasClass("type-map")).to.be.false;
            expect($modal.hasClass("type-newImport")).to.be.true;
            expect($modal.find(".newImportForm .target").val()).to.equal("someTarget");
            expect($modal.find(".newImportForm .url").val()).to.equal("test");
            $modal.find(".close").click();
        });
    });

    describe("Import modal test", function() {
        before(function(done) {
            JupyterUDFModal.Instance.show("newImport");

            DSTargetManager.refreshTargets()
            .always(() => {
                done();
            });
        });

        it ("target list should work", function() {
            $modal.find(".targetList").click();
            expect($modal.find(".targetList .list").is(":visible")).to.be.true;
            expect($modal.find(".target").val()).to.equal("");
            $modal.find(".targetList li:contains('Default Shared Root')")
                  .trigger(fakeEvent.mouseup);
            expect($modal.find(".target").val()).to.equal("Default Shared Root");
        });

        it("submit should fail if there are blank vals", function() {
            $modal.find(".confirm").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it ("should check valid module name", function() {
            var called = false;
            var cacheCheck = xcHelper.checkNamePattern;
            xcHelper.checkNamePattern = function(category, action, name) {
                expect(category).to.equal("udf");
                expect(action).to.equal("check");
                expect(name).to.equal("testModule");
                called = true;
                return false;
            };

            var jupCache = JupyterPanel.appendStub;
            var appendStubCalled = false;
            JupyterPanel.appendStub = function() {
                appendStubCalled = true;
            };

            $modal.find(".newImportForm .url").val("testurl");
            $modal.find(".newImportForm .moduleName").val("testModule");
            $modal.find(".newImportForm .fnName").val("testFunction");

            $modal.find(".confirm").click();

            expect(called).to.be.true;
            expect(appendStubCalled).to.be.fales;
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidName);
            xcHelper.checkNamePattern = cacheCheck;

            JupyterPanel.appendStub = jupCache;
        });

        it("should check valid function name", function() {
            var called = false;
            var cacheCheck = xcHelper.checkNamePattern;
            var checkNum = 0;
            xcHelper.checkNamePattern = function(category, action, name) {
                checkNum++;
                if (checkNum === 1) {
                    return true;
                }
                expect(category).to.equal("udfFn");
                expect(action).to.equal("check");
                expect(name).to.equal("testFunction");
                called = true;
                return false;
            };

            var jupCache = JupyterPanel.appendStub;
            var appendStubCalled = false;
            JupyterPanel.appendStub = function() {
                appendStubCalled = true;
            };

            $modal.find(".newImportForm .url").val("testurl");
            $modal.find(".newImportForm .moduleName").val("testModule");
            $modal.find(".newImportForm .fnName").val("testFunction");

            $modal.find(".confirm").click();

            expect(called).to.be.true;
            expect(appendStubCalled).to.be.fales;
            UnitTest.hasStatusBoxWithError(UDFTStr.InValidFnName);
            xcHelper.checkNamePattern = cacheCheck;

            JupyterPanel.appendStub = jupCache;
        });

        it("valid submit should work", function() {
            var jupCache = JupyterPanel.appendStub;
            var appendStubCalled = false;
            JupyterPanel.appendStub = function(type, options) {
                expect(type).to.equal("importUDF");
                expect(options.fnName).to.equal("testFunction");
                expect(options.moduleName).to.equal("testModule");
                expect(options.includeStub).to.equal(true);
                expect(options.target).to.equal("Default Shared Root");
                expect(options.url).to.equal("testurl");
                appendStubCalled = true;
            };

            $modal.find(".newImportForm .url").val("testurl");
            $modal.find(".newImportForm .moduleName").val("testModule");
            $modal.find(".newImportForm .fnName").val("testFunction");

            $modal.find(".confirm").click();

            expect(appendStubCalled).to.be.true;
            JupyterPanel.appendStub = jupCache;
        });

        after(function() {
            $modal.find(".close").click();
        });
    });

    describe("Map modal test", function() {
        before(function() {
            JupyterUDFModal.Instance.show("map");
        });

        it("table list should work", function() {
            $modal.find(".tableList").click();
            expect($modal.find(".tableList .list").is(":visible")).to.be.true;
            expect($modal.find(".tableName").val()).to.equal("");
            expect($modal.find(".columnsList li").length).to.equal(0);
            $modal.find(".tableList li:contains('test dataflow')").eq(0)
                  .trigger(fakeEvent.mouseup);

            expect($modal.find(".tableName").val()).to.equal("test dataflow (inactive module) " + tableName2);
            expect($modal.find(".columnsList li").length).to.equal(3);
            expect($modal.find(".columnsList li").eq(0).text()).to.equal("testCol");
            expect($modal.find(".columnsList li").eq(1).text()).to.equal("prefix::testCol2");
            expect($modal.find(".columnsList li").eq(2).text()).to.equal("prefix::testCol3");
            expect($modal.find(".columnsList li.unavailable").length).to.equal(1);
            expect($modal.find(".columnsList li").eq(2).hasClass("unavailable")).to.be.true;
        });

        it("column list should work", function() {
            $modal.find(".columnsList").click();
            expect($modal.find(".columnsList .list").is(":visible")).to.be.true;
            expect($modal.find(".columns").val()).to.equal("");

            $modal.find(".columnsList li").eq(0).trigger(fakeEvent.mouseup);
            expect($modal.find(".columnsList .list").is(":visible")).to.be.true;
            expect($modal.find(".columns").val()).to.equal("testCol");

            $modal.find(".columnsList li").eq(1).trigger(fakeEvent.mouseup);
            expect($modal.find(".columnsList .list").is(":visible")).to.be.true;
            expect($modal.find(".columns").val()).to.equal("testCol, prefix::testCol2");

            $modal.find(".columnsList li").eq(0).trigger(fakeEvent.mouseup);
            expect($modal.find(".columnsList .list").is(":visible")).to.be.true;
            expect($modal.find(".columns").val()).to.equal("prefix::testCol2");
        });

        it("submit should fail if there are blank vals", function() {
            $modal.find(".confirm").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("valid submit should work", function() {
            var jupCache = JupyterPanel.appendStub;
            var appendStubCalled = false;
            JupyterPanel.appendStub = function(type, options) {
                expect(type).to.equal("basicUDF");
                expect(options.fnName).to.equal("testFunction");
                expect(options.moduleName).to.equal("testModule");
                expect(options.includeStub).to.equal(true);
                expect(options.tableName).to.equal(tableName2);
                expect(options.columns.length).to.equal(1);
                expect(options.columns[0]).to.equal("prefix::testCol2");
                appendStubCalled = true;
            };

            $modal.find(".mapForm .moduleName").val("testModule");
            $modal.find(".mapForm .fnName").val("testFunction");

            $modal.find(".confirm").click();

            expect(appendStubCalled).to.be.true;
            JupyterPanel.appendStub = jupCache;
        });
    });

    after(function() {
        $modal.find(".close").click();
        UnitTest.offMinMode();
        delete gTables[tableId];
        delete gTables[tableId2];
        delete oldTableCache[tableName];
        delete oldTableCache[tableName2];
        DagTblManager.Instance.cache = oldTableCache;
        gTables = oldgTables;
        DagList.Instance.getDagTabById = cachedDetDagTabById;
    });
});