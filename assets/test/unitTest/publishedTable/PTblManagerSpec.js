
describe("PTblManager Test", function() {
    before(function() {
        console.clear();
        console.log("PTblManager Test");
    });

    it("createTableInfo should work", function() {
        let tableInfo = PTblManager.Instance.createTableInfo("test");
        expect(tableInfo).to.be.an.instanceof(PbTblInfo);
        expect(tableInfo.name).to.equal("test");
    });

    it("addTable should work", function(done) {
        let oldAddOneTable = PTblManager.Instance._addOneTable;
        let oldSocket = XcSocket.Instance.sendMessage;
        let testName;
        let called = false;
        PTblManager.Instance._addOneTable = (tableName) => {
            testName = tableName;
            return PromiseHelper.resolve();
        }
        XcSocket.Instance.sendMessage = () => {
            called = true;
        };

        PTblManager.Instance.addTable("test")
        .then(function() {
            expect(testName).to.equal("test");
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcSocket.Instance.sendMessage = oldSocket;
            PTblManager.Instance._addOneTable = oldAddOneTable;
        });
    });

    it("addTable still resolve in error case", function(done) {
        let oldAddOneTable = PTblManager.Instance._addOneTable;
        let oldSocket = XcSocket.Instance.sendMessage;
        let called = false;
        PTblManager.Instance._addOneTable = () => PromiseHelper.reject();
        XcSocket.Instance.sendMessage = () => {
            called = true;
        };

        PTblManager.Instance.addTable("test")
        .then(function() {
            expect(called).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcSocket.Instance.sendMessage = oldSocket;
            PTblManager.Instance._addOneTable = oldAddOneTable;
        });
    });

    it("getTableMap should work", function() {
        let map = PTblManager.Instance.getTableMap();
        expect(map).to.be.an.instanceof(Map);
    });

    it("getTables should work", function() {
        let tables = PTblManager.Instance.getTables();
        expect(tables).to.be.an("array");
    });

    it("getAvailableTables should work", function() {
        let tables = PTblManager.Instance.getAvailableTables();
        expect(tables).to.be.an("array");
    });

    it("getTableName should work", function() {
        let tableName = xcHelper.randName("test");
        let tableInfo = PTblManager.Instance.createTableInfo(tableName);
        let res;

        // case 1
        PTblManager.Instance._tableMap.set(tableName, tableInfo);
        res = PTblManager.Instance.getTableByName(tableName);
        expect(res).to.equal(tableInfo);
        PTblManager.Instance._tableMap.delete(tableName);

        // case 2
        PTblManager.Instance._loadingTables[tableName] = tableInfo;
        res = PTblManager.Instance.getTableByName(tableName);
        expect(res).to.equal(tableInfo);
        delete PTblManager.Instance._loadingTables[tableName];

        // case 3
        PTblManager.Instance._datasetTables[tableName] = tableInfo;
        res = PTblManager.Instance.getTableByName(tableName);
        expect(res).to.equal(tableInfo);
        delete PTblManager.Instance._datasetTables[tableName];

        // case 4
        res = PTblManager.Instance.getTableByName(tableName);
        expect(res).to.equal(null);
    });

    it("hasTable should work", function() {
        let tableName = xcHelper.randName("test");
        let tableInfo = PTblManager.Instance.createTableInfo(tableName);
        let res;

        // case 1
        PTblManager.Instance._tableMap.set(tableName, tableInfo);
        res = PTblManager.Instance.hasTable(tableName);
        expect(res).to.equal(true);
        // case 2
        PTblManager.Instance._tableMap.delete(tableName);
        res = PTblManager.Instance.hasTable(tableName);
        expect(res).to.equal(false);
    });

    it("getTablesAsync should work", function(done) {
        let oldInitialized = PTblManager.Instance._initizlied;
        let oldListTables = PTblManager.Instance._listTables;
        let called = false;
        PTblManager.Instance._initizlied = false;
        PTblManager.Instance._listTables = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        PTblManager.Instance.getTablesAsync(true)
        .then(function(res) {
            expect(called).equal(true);
            expect(res).to.be.an("array");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._initizlied = oldInitialized;
            PTblManager.Instance._listTables = oldListTables;
        });
    });

    it("getTablesAsync use cached result", function(done) {
        let oldInitialized = PTblManager.Instance._initizlied;
        let oldListTables = PTblManager.Instance._listTables;
        let called = false;
        PTblManager.Instance._initizlied = true;
        PTblManager.Instance._listTables = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        PTblManager.Instance.getTablesAsync(false)
        .then(function(res) {
            expect(called).equal(false);
            expect(res).to.be.an("array");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._initizlied = oldInitialized;
            PTblManager.Instance._listTables = oldListTables;
        });
    });

    it("getTableDisplayInfo should work", function() {
        let tableInfo = PTblManager.Instance.createTableInfo("test");
        let res = PTblManager.Instance.getTableDisplayInfo(tableInfo);
        expect(res.name).to.equal("test");
    });

    it("getTableDisplayInfo should handle error case", function() {
        let res = PTblManager.Instance.getTableDisplayInfo(null);
        expect(res.name).to.equal(null);
    });

    it("getTableSchema should work", function() {
        let tableInfo = PTblManager.Instance.createTableInfo("test");
        let res = PTblManager.Instance.getTableSchema(tableInfo);
        expect(res).to.be.an("array");
    });

    it("getSchemaArrayFromDataset should work", function(done) {
        let oldFunc = PTblManager.Instance._getSchemaArrayFromDataset;
        let res;
        PTblManager.Instance._getSchemaArrayFromDataset = (dsName) => {
            res = dsName;
            return PromiseHelper.resolve();
        };

        PTblManager.Instance.getSchemaArrayFromDataset("test")
        .then(function() {
            expect(res).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._getSchemaArrayFromDataset = oldFunc;
        });
    });

    it("getTableSchema should handle empty input", function() {
        let res = PTblManager.Instance.getTableSchema(null);
        expect(res).to.be.an("array");
    });

    describe("createTableFromSource Test", function() {
        let tableInfo;
        let oldRefresh;
        let oldCreateDS;
        let oldCheckSchema;
        let oldCreateTable;
        let oldAdd;
        let oldTransaction;

        before(function() {
            let tableName = xcHelper.randName("TABLE");
            tableInfo = PTblManager.Instance.createTableInfo(tableName);

            oldRefresh = PTblManager.Instance._refreshTblView;
            oldCreateDS = PTblManager.Instance._createDataset;
            oldCheckSchema = PTblManager.Instance._checkSchemaInDatasetCreation;
            oldCreateTable = PTblManager.Instance._createTable;
            oldAdd = PTblManager.Instance.addTable;
            oldTransaction = Transaction;

            PTblManager.Instance._refreshTblView = () => {};
            PTblManager.Instance._createDataset = () => PromiseHelper.resolve();
            PTblManager.Instance._checkSchemaInDatasetCreation = () => PromiseHelper.resolve([]);
            PTblManager.Instance._createTable = () => PromiseHelper.resolve();
            PTblManager.Instance.addTable = () => PromiseHelper.resolve();

            Transaction = {
                "start": () => {},
                "done": () => {},
                "fail": () => {},
                "checkCanceled": () => {}
            };
        });

        it("should create a table from source", function(done) {
            PTblManager.Instance.createTableFromSource(tableInfo, {})
            .then(function(tableName) {
                expect(tableName).to.equal(tableInfo.name);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject create dataset error", function(done) {
            PTblManager.Instance._createDataset = () => PromiseHelper.reject("test");
            PTblManager.Instance.createTableFromSource(tableInfo, {})
            .then(function() {
                done("fail");
            })
            .fail(function({error, hasDataset}) {
                expect(error).to.equal("test");
                expect(hasDataset).to.be.false;
                done();
            });
        });

        it("should reject schema error", function(done) {
            PTblManager.Instance._createDataset = () => PromiseHelper.resolve();
            PTblManager.Instance._checkSchemaInDatasetCreation = () => PromiseHelper.reject({error: "test2", fromDatasetCreation: true});

            let oldFunc = PTblManager.Instance.addDatasetTable;
            let called = false;
            PTblManager.Instance.addDatasetTable = () => { called = true; };

            PTblManager.Instance.createTableFromSource(tableInfo, {})
            .then(function() {
                done("fail");
            })
            .fail(function(ret) {
                const error = ret.error;
                const hasDataset = ret.hasDataset;
                expect(error).to.equal("test2");
                expect(hasDataset).to.be.true;
                expect(called).to.be.true;
                done();
            })
            .always(function() {
                PTblManager.Instance.addDatasetTable = oldFunc;
            });
        });

        it("should reject create table error", function(done) {
            PTblManager.Instance._checkSchemaInDatasetCreation = () => PromiseHelper.resolve();
            PTblManager.Instance._createTable = () => PromiseHelper.reject("test3");

            let oldFunc = XIApi.deleteDataset;
            let called = false;
            XIApi.deleteDataset = () => { called = true; };

            PTblManager.Instance.createTableFromSource(tableInfo, {})
            .then(function() {
                done("fail");
            })
            .fail(function({error, hasDataset}) {
                expect(error).to.equal("test3");
                expect(hasDataset).to.be.true;
                expect(called).to.be.true;
                done();
            })
            .always(function() {
                XIApi.deleteDataset = oldFunc;
            });
        });

        after(function() {
            PTblManager.Instance._refreshTblView = oldRefresh;
            PTblManager.Instance._createDataset = oldCreateDS;
            PTblManager.Instance._checkSchemaInDatasetCreation = oldCheckSchema;
            PTblManager.Instance._createTable = oldCreateTable;
            PTblManager.Instance.addTable = oldAdd;
            Transaction = oldTransaction;
        });
    });

    describe("createTableFromView Test", function() {
        let viewName;
        let tableName;
        let oldCreateTable;
        let oldAdd;
        let oldTransaction;

        before(function() {
            viewName = xcHelper.randName("ds");
            tableName = xcHelper.randName("TABLE");

            oldCreateTable = XIApi.publishTable;
            oldAdd = PTblManager.Instance.addTable;
            oldTransaction = Transaction;

            XIApi.publishTable = () => PromiseHelper.resolve();
            PTblManager.Instance.addTable = () => PromiseHelper.resolve();

            Transaction = {
                "start": () => {},
                "done": () => {},
                "fail": () => {}
            };
        });

        it("should create a table from dataset", function(done) {
            PTblManager.Instance.createTableFromView([], [], viewName, tableName)
            .then(function(res) {
                expect(res).to.equal(undefined);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject error case", function(done) {
            XIApi.publishTable = () => PromiseHelper.reject("test");
            PTblManager.Instance.createTableFromView([], [], viewName, tableName)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        after(function() {
            XIApi.publishTable = oldCreateTable;
            PTblManager.Instance.addTable = oldAdd;
            Transaction = oldTransaction;
        });
    });

    it("addDatasetTable should work", function() {
        let oldDSTables = PTblManager.Instance._datasetTables;
        PTblManager.Instance._datasetTables = {};

        let dsName = xcHelper.randName("ds") + PTblManager.DSSuffix;
        PTblManager.Instance.addDatasetTable(dsName);
        let numDSTables = Object.keys(PTblManager.Instance._datasetTables).length;
        expect(numDSTables).to.equal(1);
        PTblManager.Instance._datasetTables = oldDSTables;
    });

    it("addDatasetTable should not handle non pbTable DSS", function() {
        let oldDSTables = PTblManager.Instance._datasetTables;
        PTblManager.Instance._datasetTables = {};

        let dsName = xcHelper.randName("ds");
        PTblManager.Instance.addDatasetTable(dsName);
        let numDSTables = Object.keys(PTblManager.Instance._datasetTables).length;
        expect(numDSTables).to.equal(0);
        PTblManager.Instance._datasetTables = oldDSTables;
    });

    describe("activateTables Test", function() {
        let oldGetDependency;
        let oldActivate;
        let oldAlert;
        let oldSocket;
        let called;

        before(function() {
            oldGetDependency = PTblManager.Instance._getIMDDependency;
            oldActivate = PTblManager.Instance._activateOneTable;
            oldAlert = Alert.error;
            oldSocket = XcSocket.Instance.sendMessage;

            PTblManager.Instance._getIMDDependency =
            PTblManager.Instance._activateOneTable = () => {
                called++;
                return PromiseHelper.resolve();
            };

            Alert.error =
            XcSocket.Instance.sendMessage = () => { called++; };

        });

        beforeEach(function() {
            called = 0;
        });

        it("should work for normal case", function(done) {
            PTblManager.Instance.activateTables(["A"])
            .then(function() {
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle failure case", function(done) {
            PTblManager.Instance._activateOneTable = (tabale, succeeds, failures) => {
                called++;
                failures.push("A");
                return PromiseHelper.resolve();
            };

            PTblManager.Instance.activateTables(["A"])
            .then(function() {
                expect(called).to.equal(4);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle fail case", function(done) {
            PTblManager.Instance._getIMDDependency = () => {
                called++;
                return PromiseHelper.reject("test");
            };
            PTblManager.Instance.activateTables(["A"])
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect(called).to.equal(2);
                done()
            });
        });

        after(function() {
            PTblManager.Instance._getIMDDependency = oldGetDependency;
            PTblManager.Instance._activateOneTable = oldActivate;
            Alert.error = oldAlert;
            XcSocket.Instance.sendMessage = oldSocket;
        });
    });

    describe("deactivateTables Test", function() {
        let oldDeactivate;
        let oldAlertShow;
        let oldAlert;
        let oldSocket;
        let called;

        before(function() {
            oldDeactivate = PTblManager.Instance._deactivateTables;
            oldAlertShow = Alert.show;
            oldAlert = Alert.error;
            oldSocket = XcSocket.Instance.sendMessage;

            PTblManager.Instance._deactivateTables = () => {
                called++;
                return PromiseHelper.resolve({succeeds:[], failures: []});
            };

            Alert.show = (options) => {
                options.onConfirm();
                called++;
            };

            Alert.error =
            XcSocket.Instance.sendMessage = () => { called++; };
        });

        beforeEach(function() {
            called = 0;
        });

        it("should work for normal case", function(done) {
            PTblManager.Instance.deactivateTables(["A"])
            .then(function() {
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle has failure case", function(done) {
            PTblManager.Instance._deactivateTables = () => {
                called++;
                return PromiseHelper.resolve({succeeds: [], failures: ["A"]});
            };

            PTblManager.Instance.deactivateTables(["A"])
            .then(function() {
                expect(called).to.equal(4);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle fail case", function(done) {
            PTblManager.Instance._deactivateTables = () => {
                called++;
                return PromiseHelper.reject("test");
            };
            PTblManager.Instance.deactivateTables(["A"])
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect(called).to.equal(3);
                done()
            });
        });

        it("should hanndle cancel", function(done) {
            Alert.show = (options) => {
                options.onCancel();
                called++;
            };
            PTblManager.Instance.deactivateTables(["A"])
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(undefined);
                expect(called).to.equal(1);
                done()
            });
        });

        after(function() {
            PTblManager.Instance._deactivateTables = oldDeactivate;
            Alert.show = oldAlertShow;
            Alert.error = oldAlert;
            XcSocket.Instance.sendMessage = oldSocket;
        });
    });

    describe("deleteTables Test", function() {
        let oldDelete;
        let oldAlertShow;
        let oldAlert;
        let oldSocket;
        let called;

        before(function() {
            oldDelete = PTblManager.Instance._deleteTables;
            oldAlertShow = Alert.show;
            oldAlert = Alert.error;
            oldSocket = XcSocket.Instance.sendMessage;

            PTblManager.Instance._deleteTables = () => {
                called++;
                return PromiseHelper.resolve({succeeds: [], failures: []});
            };

            Alert.show = (options) => {
                if (options.onConfirm) {
                    options.onConfirm();
                }
                called++;
            };

            Alert.error =
            XcSocket.Instance.sendMessage = () => { called++; };
        });

        beforeEach(function() {
            called = 0;
        });

        it("should work for normal case", function(done) {
            PTblManager.Instance.deleteTables(["A"])
            .then(function() {
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle has failure case", function(done) {
            PTblManager.Instance._deleteTables = () => {
                called++;
                return PromiseHelper.resolve({succeeds: [], failures: ["A"]});
            };

            PTblManager.Instance.deleteTables(["A"])
            .then(function() {
                expect(called).to.equal(4);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should hanndle fail case", function(done) {
            PTblManager.Instance._deleteTables = () => {
                called++;
                return PromiseHelper.reject("test");
            };
            PTblManager.Instance.deleteTables(["A"])
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect(called).to.equal(3);
                done()
            });
        });

        it("should hanndle cancel", function(done) {
            Alert.show = (options) => {
                options.onCancel();
                called++;
            };
            PTblManager.Instance.deleteTables(["A"])
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(undefined);
                expect(called).to.equal(1);
                done()
            });
        });

        after(function() {
            PTblManager.Instance._deleteTables = oldDelete;
            Alert.show = oldAlertShow;
            Alert.error = oldAlert;
            XcSocket.Instance.sendMessage = oldSocket;
        });
    });

    it("selectTable should work", function() {
        let res;
        let tableInfo = {
            viewResultSet: (limitedRows) => { res = limitedRows; }
        };

        PTblManager.Instance.selectTable(tableInfo, 10);
        expect(res).to.equal(10);
    });

    describe("updateInfo Test", function() {
        it("should update activate", function() {
            let oldFunc = PTblManager.Instance._updateActivated;
            let res;
            let test = ["A"];
            PTblManager.Instance._updateActivated = (tables) => {
                res = tables;
            };

            PTblManager.Instance.updateInfo({
                action: "activate",
                tables: test
            });
            expect(res).to.equal(test);

            PTblManager.Instance._updateActivated = oldFunc;
        });

        it("should update deactivate", function() {
            let oldFunc = PTblManager.Instance._updateDeactivated;
            let res;
            let test = ["A"];
            PTblManager.Instance._updateDeactivated = (tables) => {
                res = tables;
            };

            PTblManager.Instance.updateInfo({
                action: "deactivate",
                tables: test
            });
            expect(res).to.equal(test);

            PTblManager.Instance._updateDeactivated = oldFunc;
        });

        it("should update delete", function() {
            let oldFunc = PTblManager.Instance._updateDeleted;
            let res;
            let test = ["A"];
            PTblManager.Instance._updateDeleted = (tables) => {
                res = tables;
            };

            PTblManager.Instance.updateInfo({
                action: "delete",
                tables: test
            });
            expect(res).to.equal(test);

            PTblManager.Instance._updateDeleted = oldFunc;
        });

        it("should update add", function() {
            let oldFunc = PTblManager.Instance._updateAdded;
            let res;
            let test = ["A"];
            PTblManager.Instance._updateAdded = (tables) => {
                res = tables;
            };

            PTblManager.Instance.updateInfo({
                action: "add",
                tables: test
            });
            expect(res).to.equal(test);

            PTblManager.Instance._updateAdded = oldFunc;
        });

        it("should handle other options", function() {
            let res = PTblManager.Instance.updateInfo({
                action: "test"
            });
            expect(res).to.equal(undefined);
        });

        it("should handle invald cases", function() {
            let res = PTblManager.Instance.updateInfo(null);
            expect(res).to.equal(undefined);
        });
    });

    it("_updateActivated should work", function(done) {
        let oldList = PTblManager.Instance._listOneTable;
        let oldRefresh = TblSource.Instance.refresh;
        let called = false;

        PTblManager.Instance._listOneTable = () => PromiseHelper.resolve();
        TblSource.Instance.refresh = () => { called = true; };

        PTblManager.Instance._updateActivated(["A"])
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._listOneTable = oldList;
            TblSource.Instance.refresh = oldRefresh;
        });
    });

    it("_updateDeactivated should work", function() {
        let oldRefresh = TblSource.Instance.refresh;
        let called = false;
        let tableName = xcHelper.randName("TABLE");

        TblSource.Instance.refresh = () => { called = true; };

        PTblManager.Instance._updateDeactivated([tableName]);
        expect(called).to.be.true;
        TblSource.Instance.refresh = oldRefresh;
    });

    it("_updateDeactivated should deactivate table", function() {
        let oldRefresh = TblSource.Instance.refresh;
        let called = false;
        let tableName = xcHelper.randName("TABLE");
        let tableInfo = PTblManager.Instance.createTableInfo(tableName);
        tableInfo.active = true;
        PTblManager.Instance._tableMap.set(tableName, tableInfo);

        TblSource.Instance.refresh = () => { called = true; };

        PTblManager.Instance._updateDeactivated([tableName]);
        expect(called).to.be.true;
        expect(tableInfo.active).to.be.false;
        TblSource.Instance.refresh = oldRefresh;
        PTblManager.Instance._tableMap.delete(tableName);
    });

    it("_updateDeleted should work", function() {
        let oldRefresh = TblSource.Instance.refresh;
        let called = false;
        let tableName = xcHelper.randName("TABLE");
        let tableInfo = PTblManager.Instance.createTableInfo(tableName);
        PTblManager.Instance._tableMap.set(tableName, tableInfo);

        TblSource.Instance.refresh = () => { called = true; };

        PTblManager.Instance._updateDeleted([tableName]);
        expect(called).to.be.true;
        expect(PTblManager.Instance._tableMap.has(tableName)).to.be.false;
        TblSource.Instance.refresh = oldRefresh;
    });

    it("_updateAdded should work", function() {
        let oldAdd = PTblManager.Instance._addOneTable;
        let oldRefresh = TblSource.Instance.refresh;
        let called = 0;

        PTblManager.Instance._addOneTable =
        TblSource.Instance.refresh = () => { called++; };

        PTblManager.Instance._updateAdded(["A"]);
        expect(called).to.equal(2);
        PTblManager.Instance._addOneTable = oldAdd;
        TblSource.Instance.refresh = oldRefresh;
    });

    it("_addOneTable should work", function(done) {
        let oldList = PTblManager.Instance._listOneTable;
        let res;

        PTblManager.Instance._listOneTable = (tableName) => {
            res = tableName;
            return PromiseHelper.resolve();
        };

        let name = xcHelper.randName("test");
        PTblManager.Instance._addOneTable(name)
        .then(function() {
            expect(res).to.equal(name.toUpperCase());
            expect(PTblManager.Instance._tableMap.has(res)).to.be.true;
            PTblManager.Instance._tableMap.delete(res);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._listOneTable = oldList;
        });
    });

    it("_deactivateTables should work", function(done) {
        let oldFunc = PTblManager.Instance._deactivateOneTable;

        PTblManager.Instance._deactivateOneTable = () => {
            return PromiseHelper.resolve();
        };

        PTblManager.Instance._deactivateTables(["A"])
        .then(function({succeeds, failures}) {
            expect(succeeds).to.be.an("array");
            expect(failures).to.be.an("array");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._deactivateOneTable = oldFunc;
        });
    });

    describe("_deactivateOneTable Test", function() {
        let tableName;
        let tableInfo;
        let succeeds;
        let failures;

        before(function() {
            tableName = xcHelper.randName("TABLE");
            tableInfo = {
                active: true,
                deactivate: () => PromiseHelper.resolve()
            };
            PTblManager.Instance._tableMap.set(tableName, tableInfo);
        });

        beforeEach(function() {
            succeeds = [];
            failures = [];
        });

        it("_deactivateOneTable should work", function(done) {
            PTblManager.Instance._deactivateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(1);
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deactivateOneTable should handle fail case", function(done) {
            tableInfo.deactivate = () => PromiseHelper.reject("test");
            PTblManager.Instance._deactivateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deactivateOneTable should handle invalide case", function(done) {
            tableInfo.active = false;
            PTblManager.Instance._deactivateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            PTblManager.Instance._tableMap.delete(tableName);
        });
    });

    describe("_activateOneTable Test", function() {
        let tableName;
        let tableInfo;
        let succeeds;
        let failures;
        let oldMark;
        let oldList;

        before(function() {
            tableName = xcHelper.randName("TABLE");
            tableInfo = {
                active: false,
                activate: () => PromiseHelper.resolve()
            };
            PTblManager.Instance._tableMap.set(tableName, tableInfo);

            oldMark = TblSource.Instance.markActivating;
            oldList = PTblManager.Instance._listOneTable;
            TblSource.Instance.markActivating = () => {};
            PTblManager.Instance._listOneTable = () => PromiseHelper.resolve();
        });

        beforeEach(function() {
            succeeds = [];
            failures = [];
        });

        it("_activateOneTable should work", function(done) {
            PTblManager.Instance._activateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(1);
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_activateOneTable should handle fail case", function(done) {
            tableInfo.activate = () => PromiseHelper.reject("test");
            PTblManager.Instance._activateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_activateOneTable should handle invalide case", function(done) {
            tableInfo.active = true;
            PTblManager.Instance._activateOneTable(tableName, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            PTblManager.Instance._tableMap.delete(tableName);
            TblSource.Instance.markActivating = oldMark;
            PTblManager.Instance._listOneTable = oldList;
        });
    });

    it("_deleteTables should work", function(done) {
        let oldFunc = PTblManager.Instance._deleteOneTable;

        PTblManager.Instance._deleteOneTable = () => {
            return PromiseHelper.resolve();
        };

        PTblManager.Instance._deleteTables(["A"])
        .then(function({succeeds, failures}) {
            expect(succeeds).to.be.an("array");
            expect(failures).to.be.an("array");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance._deleteOneTable = oldFunc;
        });
    });

    describe("_deleteOneTable Test", function() {
        let tableName;
        let tableInfo;
        let succeeds;
        let failures;
        let oldCheck;

        before(function() {
            tableName = xcHelper.randName("TABLE");
            tableInfo = {
                delete: () => PromiseHelper.resolve()
            };

            oldCheck = PTblManager.Instance._checkDeleteDependency;
            PTblManager.Instance._checkDeleteDependency = () => PromiseHelper.resolve();
        });

        beforeEach(function() {
            succeeds = [];
            failures = [];
            PTblManager.Instance._tableMap.set(tableName, tableInfo);
        });

        it("_deleteOneTable should work", function(done) {
            PTblManager.Instance._deleteOneTable(tableName, false, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(1);
                expect(failures.length).to.equal(0);
                expect(PTblManager.Instance._tableMap.has(tableName)).to.be.false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deleteOneTable should handle fail case", function(done) {
            tableInfo.delete = () => PromiseHelper.reject("test");
            PTblManager.Instance._deleteOneTable(tableName, false, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deleteOneTable should delete ds", function(done) {
            let name = xcHelper.randName("TABLE2");
            let oldFunc = PTblManager.Instance._deleteDSTable;
            PTblManager.Instance._deleteDSTable = () => PromiseHelper.resolve();

            PTblManager.Instance._deleteOneTable(name, false, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                PTblManager.Instance._deleteDSTable = oldFunc;
            });
        });

        it("_deleteOneTable should fail in checkDeleteDependency if not force delete", function(done) {
            PTblManager.Instance._checkDeleteDependency = () => PromiseHelper.reject("test check");
            tableInfo.delete = () => PromiseHelper.reject("test delete");
            PTblManager.Instance._deleteOneTable(tableName, false, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(1);
                expect(failures[0]).contains("test check");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deleteOneTable should not fail in checkDeleteDependency if force deleted", function(done) {
            PTblManager.Instance._checkDeleteDependency = () => PromiseHelper.reject("test check");
            tableInfo.delete = () => PromiseHelper.reject("test delete");
            PTblManager.Instance._deleteOneTable(tableName, true, succeeds, failures)
            .then(function() {
                expect(succeeds.length).to.equal(0);
                expect(failures.length).to.equal(1);
                expect(failures[0]).contains("test delete");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            PTblManager.Instance._tableMap.delete(tableName);
            PTblManager.Instance._checkDeleteDependency = oldCheck;
        });
    });

    it("_getTablesToForceDelete should work", function() {
        let tableNames = ["a", "b"];
        let succedTables = ["b"];
        let res = PTblManager.Instance._getTablesToForceDelete(tableNames, succedTables);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal("a");
    });

    describe("_handleDeleteTableFailures Test", function() {
        let oldAlert;
        let calledAlert;

        before(function() {
            oldAlert = Alert.show;
            Alert.show = () => {
                calledAlert = true;
            };
        });

        beforeEach(function() {
            calledAlert = false;
        });

        it("should show error if it's normal error case", function() {
            PTblManager.Instance._handleDeleteTableFailures("test", null);
            expect(calledAlert).to.be.true;
        });

        it("should show error if no tables to force delete", function() {
            PTblManager.Instance._handleDeleteTableFailures("test", []);
            expect(calledAlert).to.be.true;
        });

        it("should show alert and let user force delete tables", function() {
            let called = 0;
            Alert.show = (options) => {
                calledAlert = true;
                options.buttons[0].func();
            };

            let oldDelete = PTblManager.Instance.deleteTablesOnConfirm;
            let oldRefresh = TblSource.Instance.refresh;
            PTblManager.Instance.deleteTablesOnConfirm = () => {
                called++;
                return PromiseHelper.resolve();
            };

            TblSource.Instance.refresh = () => {
                called++;
            };

            PTblManager.Instance._handleDeleteTableFailures("test", ["A"]);
            expect(calledAlert).to.be.true;
            expect(called).to.equal(2);

            PTblManager.Instance.deleteTablesOnConfirm = oldDelete;
            TblSource.Instance.refresh = oldRefresh;
        });

        after(function() {
            Alert.show = oldAlert;
        });
    });

    describe("_deleteDSTable Test", function() {
        let tableName;
        let tableInfo;
        let failures;

        before(function() {
            tableName = xcHelper.randName("TABLE");
            tableInfo = {
                delete: () => PromiseHelper.resolve()
            };
        });

        beforeEach(function() {
            failures = [];
            PTblManager.Instance._datasetTables[tableName] = tableInfo;
        });

        it("_deleteDSTable should work", function(done) {
            PTblManager.Instance._deleteDSTable(tableName, failures)
            .then(function() {
                expect(failures.length).to.equal(0);
                expect(PTblManager.Instance._datasetTables[tableName]).to.be.undefined;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deleteOneTable should handle fail case", function(done) {
            tableInfo.delete = () => PromiseHelper.reject("test");
            PTblManager.Instance._deleteDSTable(tableName, failures)
            .then(function() {
                expect(failures.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("_deleteOneTable should handle invalid case", function(done) {
            delete PTblManager.Instance._datasetTables[tableName];

            PTblManager.Instance._deleteDSTable(name, failures)
            .then(function() {
                expect(failures.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            delete PTblManager.Instance._datasetTables[tableName];
        });
    });

    it("_getDSNameFromTableName should work", function() {
        let res = PTblManager.Instance._getDSNameFromTableName("test");
        expect(res).contains("test");
        expect(res.endsWith(PTblManager.DSSuffix)).to.be.true;
    });

    it("_getTableNameFromDSName should work", function() {
        let tableName = PTblManager.Instance._getDSNameFromTableName("test");
        let dsName = PTblManager.Instance._getTableNameFromDSName(tableName);
        expect(dsName).to.equal("test");
    });

    describe("_createDataset Test", function() {
        let oldLoad;

        before(function() {
            oldLoad = XIApi.loadDataset;
        });

        it("should work for normal case", function(done) {
            XIApi.loadDataset = () => PromiseHelper.resolve("test");

            PTblManager.Instance._createDataset(1, "test")
            .then(function(res) {
                expect(res).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject with error", function(done) {
            XIApi.loadDataset = () => PromiseHelper.reject("test");

            PTblManager.Instance._createDataset(1, "test")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                done();
            });
        });

        after(function() {
            XIApi.loadDataset = oldLoad;
        });
    });

    describe("_checkSchemaInDatasetCreation Test", function() {
        let oldGetSchema;

        before(function() {
            oldGetSchema = PTblManager.Instance._getSchemaArrayFromDataset;
        });

        it("should resolve if has schema", function(done) {
            let schema = [{name: "test", type: ColumnType.string}];
            PTblManager.Instance._checkSchemaInDatasetCreation("ds", schema)
            .then(function(res) {
                expect(res).to.equal(schema);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should work for normal case", function(done) {
            let schema = [{name: "test", type: ColumnType.string}];
            PTblManager.Instance._getSchemaArrayFromDataset = () => PromiseHelper.resolve({schemaArray: [schema], hasMultipleSchema: false});

            PTblManager.Instance._checkSchemaInDatasetCreation("ds")
            .then(function(res) {
                expect(res).not.to.equal(schema);
                expect(res).to.deep.equal(schema);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject with multi schema", function(done) {
            PTblManager.Instance._getSchemaArrayFromDataset = () => PromiseHelper.resolve({schemaArray: [], hasMultipleSchema: true});

            PTblManager.Instance._checkSchemaInDatasetCreation("ds")
            .then(function() {
                done("fail");
            })
            .fail(function({error, fromDatasetCreation}) {
                expect(error).to.equal('Multiple Schemas are detected when creating table "ds", please select the schema for the table.');
                expect(fromDatasetCreation).to.be.true;
                done();
            });
        });

        it("should reject with error", function(done) {
            PTblManager.Instance._getSchemaArrayFromDataset = () => PromiseHelper.reject({error: "test"});

            PTblManager.Instance._checkSchemaInDatasetCreation("ds")
            .then(function() {
                done("fail");
            })
            .fail(function({error, fromDatasetCreation}) {
                expect(error).to.equal("test");
                expect(fromDatasetCreation).to.be.false;
                done();
            });
        });

        after(function() {
            PTblManager.Instance._getSchemaArrayFromDataset = oldGetSchema;
        });
    });

    describe("_getSchemaArrayFromDataset Test", function() {
        let oldGetDSInfo;

        before(function() {
            oldGetDSInfo = XcalarGetDatasetsInfo;
        });

        it("should resolve correct schema array", function(done) {
            XcalarGetDatasetsInfo = () => {
                return PromiseHelper.resolve({
                    datasets: [{
                        columns: [{
                            name: "a.b",
                            type: "DfString"
                        }]
                    }]
                });
            };

            PTblManager.Instance._getSchemaArrayFromDataset("ds")
            .then(function({schemaArray, hasMultipleSchema}) {
                expect(schemaArray.length).to.equal(1);
                expect(schemaArray[0].length).to.equal(1);
                expect(hasMultipleSchema).to.be.false;

                let schema = schemaArray[0][0];
                expect(schema.name).to.equal("a\\.b");
                expect(schema.type).to.equal(ColumnType.string);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should resolve multiple schema case", function(done) {
            XcalarGetDatasetsInfo = () => {
                return PromiseHelper.resolve({
                    datasets: [{
                        columns: [{
                            name: "test",
                            type: "DfString"
                        }, {
                            name: "test",
                            type: "DfBoolean"
                        }]
                    }]
                });
            };

            PTblManager.Instance._getSchemaArrayFromDataset("ds")
            .then(function({schemaArray, hasMultipleSchema}) {
                expect(schemaArray.length).to.equal(1);
                expect(schemaArray[0].length).to.equal(2);
                expect(hasMultipleSchema).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject invalid case", function(done) {
            XcalarGetDatasetsInfo = () => {
                return PromiseHelper.resolve(null);
            };

            PTblManager.Instance._getSchemaArrayFromDataset("ds")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                done();
            });
        });

        after(function() {
            XcalarGetDatasetsInfo = oldGetDSInfo;
        });
    });

    it("_createTable should work", function(done) {
        let called = 0;
        let oldSynthesize = XIApi.synthesize;
        let oldPublish = XIApi.publishTable;
        let oldDeleteDS = XIApi.deleteDataset;
        let oldDeleteTable = XIApi.deleteTable;

        XIApi.synthesize =
        XIApi.publishTable =
        XIApi.deleteDataset =
        XIApi.deleteTable = () => {
            called++;
            return PromiseHelper.resolve("test");
        };

        PTblManager.Instance._createTable(1, "ds", "table", [], null, false)
        .then(function() {
            expect(called).to.equal(4);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XIApi.synthesize = oldSynthesize;
            XIApi.publishTable = oldPublish;
            XIApi.deleteDataset = oldDeleteDS;
            XIApi.deleteTable = oldDeleteTable;
        });
    });

    describe("_listOneTable Test", function() {
        let oldMap;
        let oldTables;
        let oldList;

        before(function() {
            oldMap = PTblManager.Instance._tableMap;
            oldTables = PTblManager.Instance._tables;
            oldList = XcalarListPublishedTables;
        });

        beforeEach(function() {
            PTblManager.Instance._tableMap = new Map();
            PTblManager.Instance._tables = [];
        });

        it("should work for normal case", function(done) {
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve({
                    tables: [{
                        name: "test",
                        updates: [],
                        values: [],
                        keys: []
                    }]
                });
            };

            PTblManager.Instance._listOneTable("test")
            .then(function() {
                expect(PTblManager.Instance._tableMap.size).to.equal(1);
                expect(PTblManager.Instance._tables.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should work for invalide case", function(done) {
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve(null);
            };

            PTblManager.Instance._listOneTable("test")
            .then(function() {
                expect(PTblManager.Instance._tableMap.size).to.equal(0);
                expect(PTblManager.Instance._tables.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            PTblManager.Instance._tableMap = oldMap;
            PTblManager.Instance._tables = oldTables;
            XcalarListPublishedTables = oldList;
        });
    });

    describe("_listTables Test", function() {
        let oldMap;
        let oldTables;
        let oldList;

        before(function() {
            oldMap = PTblManager.Instance._tableMap;
            oldTables = PTblManager.Instance._tables;
            oldList = XcalarListPublishedTables;
        });

        beforeEach(function() {
            PTblManager.Instance._tableMap = new Map();
            PTblManager.Instance._tables = [];
        });

        it("should work for normal case", function(done) {
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve({
                    tables: [{
                        name: "test",
                        updates: [],
                        values: [],
                        keys: []
                    }]
                });
            };

            PTblManager.Instance._listTables("test")
            .then(function(res) {
                expect(res.length).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should work for invalide case", function(done) {
            XcalarListPublishedTables = () => {
                return PromiseHelper.resolve(null);
            };

            PTblManager.Instance._listTables("test")
            .then(function(res) {
                expect(res.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            PTblManager.Instance._tableMap = oldMap;
            PTblManager.Instance._tables = oldTables;
            XcalarListPublishedTables = oldList;
        });
    });

    it("_updateTablesInAction should work", function() {
        let tableName = xcHelper.randName("TABLE");
        let oldTableInfo = PTblManager.Instance.createTableInfo(tableName);
        let tableInfo = PTblManager.Instance.createTableInfo(tableName);
        PTblManager.Instance._tableMap.set(tableName, tableInfo);
        // case 1
        tableInfo.state = null;
        oldTableInfo.state = PbTblState.Activating;
        PTblManager.Instance._updateTablesInAction([oldTableInfo]);
        expect(tableInfo.state).to.equal(PbTblState.Activating);

        // case 2
        oldTableInfo.state = PbTblState.Deactivating;
        PTblManager.Instance._updateTablesInAction([oldTableInfo]);
        expect(tableInfo.state).to.equal(PbTblState.Deactivating);

        PTblManager.Instance._tableMap.delete(tableName);
    });

    it("_updateTableMap should work", function() {
        let oldMap = PTblManager.Instance._tableMap;
        let oldTables = PTblManager.Instance._tables;

        let tableInfo = PTblManager.Instance.createTableInfo("TEST");
        PTblManager.Instance._tables = [tableInfo];

        PTblManager.Instance._updateTableMap();
        expect(PTblManager.Instance._tableMap.size).to.equal(1);
        expect(PTblManager.Instance._tableMap.get(tableInfo.name)).to.equal(tableInfo);

        PTblManager.Instance._tableMap = oldMap;
        PTblManager.Instance._tables = oldTables;
    });

    it("_tableInfoAdapter should work", function() {
        let table = {
            name: "TEST",
            updates: [],
            values: [],
            keys: []
        };

        let tableInfo = PTblManager.Instance._tableInfoAdapter(table, 1);
        expect(tableInfo.name).to.equal("TEST");
        expect(tableInfo.index).to.equal(1);
    });

    it("_refreshTblView should work", function() {
        let oldFunc = TblSourcePreview.Instance.refresh;
        let called = false;
        TblSourcePreview.Instance.refresh = () => { called = true; };

        // case 1
        PTblManager.Instance._refreshTblView(null);
        expect(called).to.equal(false);

        // case 2
        PTblManager.Instance._refreshTblView({}, "test", 1, 1);
        expect(called).to.equal(true);


        TblSourcePreview.Instance.refresh = oldFunc;
    });

    it("_getErrorMsg should work", function() {
        let res;

        // case 1
        res = PTblManager.Instance._getErrorMsg("T", {"error": "test"});
        expect(res).to.equal("T: test");
        // case 2
        res = PTblManager.Instance._getErrorMsg("T", {"log": "test2", "error": "test"});
        expect(res).to.equal("T: test2");
        // case 1
        res = PTblManager.Instance._getErrorMsg("T", "test3");
        expect(res).to.equal("T: test3");
        // case 1
        res = PTblManager.Instance._getErrorMsg("T");
        expect(res).to.equal("T: " + ErrTStr.Unknown);
    });

    it("_getIMDDependencyKVStore should work", function() {
        let kvStore = PTblManager.Instance._getIMDDependencyKVStore();
        expect(kvStore).to.be.an.instanceof(KVStore);
    });

    it("_getIMDDependency should work", function(done) {
        let oldGet = KVStore.prototype.getAndParse;
        KVStore.prototype.getAndParse = () => PromiseHelper.resolve("test");

        PTblManager.Instance._getIMDDependency()
        .then(function(res) {
            expect(res).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            KVStore.prototype.getAndParse = oldGet;
        });
    });

    it("_getIMDDependency should handle fail case", function(done) {
        let oldGet = KVStore.prototype.getAndParse;
        KVStore.prototype.getAndParse = () => PromiseHelper.reject();

        PTblManager.Instance._getIMDDependency()
        .then(function(res) {
            expect(res).to.deep.equal({});
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            KVStore.prototype.getAndParse = oldGet;
        });
    });

    describe("_checkDeleteDependency Test", function() {
        let oldGetDependency;

        before(function() {
            oldGetDependency = PTblManager.Instance._getIMDDependency;
        });

        it("should resolve with no dependency case", function(done) {
            PTblManager.Instance._getIMDDependency = () => PromiseHelper.resolve({});

            PTblManager.Instance._checkDeleteDependency("TEST")
            .then(function(res) {
                expect(res).to.equal(undefined);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should resolve in invalid case", function(done) {
            PTblManager.Instance._getIMDDependency = () => {
                return PromiseHelper.resolve({"TEST": null})
            };

            PTblManager.Instance._checkDeleteDependency("TEST")
            .then(function(res) {
                expect(res).to.equal(undefined);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should reject if has children", function(done) {
            PTblManager.Instance._getIMDDependency = () => {
                return PromiseHelper.resolve({
                    "TEST": {"children": {"A": true}}
                });
            };

            PTblManager.Instance._checkDeleteDependency("TEST")
            .then(function(res) {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                done();
            });
        });

        after(function() {
            PTblManager.Instance._getIMDDependency = oldGetDependency;
        });
    });

    it("_checkActivateDependency should work", function() {
        let tests = [
            {
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {}}
            },
            expected: ["A"]
        }, {
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {}}
            },
            expected: ["B", "A"]
        }, {
            // Related Dependency like a tree
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true, "C": true}},
                "B": {"parents": {"C": true}},
                "C": {"parents": {}}
            },
            expected: ["C", "B", "A"]
        }, {
            // Related Dependency like a tree,
            // reverse the dependcy order of the previous test
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true, "C": true}},
                "B": {"parents": {}},
                "C": {"parents": {"B": true}}
            },
            expected: ["B", "C", "A"]
        }, {
            // cyclic case 1
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {"C": true}},
                "C": {"parents": {"B": true}}
            },
            expected: ["A"]
        }, {
            // cyclic case 2
            tableName: "A",
            imdDenendencies: {
                "A": {"parents": {"B": true}},
                "B": {"parents": {"A": true}},
            },
            expected: ["A"]
        }];

        tests.forEach(function(test) {
            let res = PTblManager.Instance._checkActivateDependency(test.tableName, test.imdDenendencies);
            expect(res).to.deep.equal(test.expected);
        });
    });

});