describe("PbTblInfo Test", function() {
    it("should create an instance", function() {
        let tableInfo = new PbTblInfo();
        expect(tableInfo).to.be.an.instanceof(PbTblInfo);
        expect(Object.keys(tableInfo).length).to.equal(11);
        expect(tableInfo.keys).to.be.an("array");
        expect(tableInfo.columns).to.be.an("array");
        expect(tableInfo.updates).to.be.an("array");
    });

    it("should restore from meta", function() {
        let table = {
            name: "test",
            updates: [],
            keys: [],
            values: [{
                name: "col",
                type: "DfString"
            }]
        };
        let tableInfo = new PbTblInfo();
        tableInfo.restoreFromMeta(table);
        expect(tableInfo.name).to.equal("test");
        expect(tableInfo.columns).to.deep.equal([{"name": "col", "type": ColumnType.string}]);
    });

    it("restore from meta should catach error", function() {
        let table = {
            name: "test",
            updates: [],
            keys: [],
            values: null
        };
        let tableInfo = new PbTblInfo();
        tableInfo.restoreFromMeta(table);
        expect(tableInfo.name).to.equal("test");
        expect(tableInfo.columns.length).to.equal(0);
    });

    it("should get schema", function() {
        let tableInfo = new PbTblInfo({
            keys: ["key"],
            columns: [{"name": "key", "type": ColumnType.string}]
        });
        let schema = tableInfo.getSchema();
        expect(schema).to.deep.equal([{
            "name": "key",
            "type": ColumnType.string,
            "primaryKey": "Y"
        }]);
    });

    it("getSchema should catch error", function() {
        let tableInfo = new PbTblInfo();
        tableInfo.keys = null;
        let schema = tableInfo.getSchema();
        expect(schema.length).to.equal(0);
    });

    it("should viewResultSet", function(done) {
        let tableInfo = new PbTblInfo();
        let res;
        tableInfo._selectTable = function(numRows) {
            res = numRows;
            return PromiseHelper.resolve();
        };

        tableInfo.viewResultSet(10)
        .then(function() {
            expect(res).to.equal(10);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("viewResultSet should delete cached result", function(done) {
        let oldDelete = XIApi.deleteTable;
        let called = 0;
        let tableInfo = new PbTblInfo();

        XIApi.deleteTable = function() {
            called++;
            return PromiseHelper.resolve();
        };
        tableInfo._selectTable = function() {
            called++;
            return PromiseHelper.resolve("testTable2");
        };

        tableInfo._cachedSelectResultSet = "testTable";
        tableInfo.viewResultSet(10)
        .then(function(res) {
            expect(called).to.equal(2);
            expect(res).to.equal("testTable2");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XIApi.deleteTable = oldDelete;
        });
    });

    it("should delete can call XcalarUnpublishTable", function(done) {
        let oldFunc = XcalarUnpublishTable;
        let called = false;
        XcalarUnpublishTable = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.delete()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUnpublishTable = oldFunc;
        });
    });

    it("should delete a dataset state table", function(done) {
        let oldFunc = XIApi.deleteDataset;
        let called = false;
        XIApi.deleteDataset = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.state = PbTblState.BeDataset;
        tableInfo.delete()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XIApi.deleteDataset = oldFunc;
        });
    });

    it("should handle delete a dataset state table fail case", function(done) {
        let oldFunc = XIApi.deleteDataset;
        let called = false;
        XIApi.deleteDataset = function() {
            called = true;
            return PromiseHelper.reject("test");
        };

        let tableInfo = new PbTblInfo();
        tableInfo.state = PbTblState.BeDataset;
        tableInfo.delete()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(called).to.be.true;
            expect(error).to.equal("test");
            done();
        })
        .always(function() {
            XIApi.deleteDataset = oldFunc;
        });
    });

    it("should activate", function(done) {
        let oldFunc = XcalarRestoreTable;
        let called = false;
        XcalarRestoreTable = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.active = false;
        tableInfo.state = PbTblState.BeDataset;

        tableInfo.activate()
        .then(function() {
            expect(called).to.be.true;
            expect(tableInfo.active).to.be.true;
            expect(tableInfo.state).to.be.null;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarRestoreTable = oldFunc;
        });
    });

    it("activate should handle fail case", function(done) {
        let oldFunc = XcalarRestoreTable;
        let called = false;
        XcalarRestoreTable = function() {
            called = true;
            return PromiseHelper.reject("test");
        };

        let tableInfo = new PbTblInfo();
        tableInfo.active = false;
        tableInfo.state = null;

        tableInfo.activate()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(called).to.be.true;
            expect(error).to.equal("test");
            expect(tableInfo.active).to.be.false;
            expect(tableInfo.state).to.be.null;
            done();
        })
        .always(function() {
            XcalarRestoreTable = oldFunc;
        });
    });

    it("should beActivated", function() {
        let tableInfo = new PbTblInfo();
        tableInfo.active = false;
        tableInfo.state = PbTblState.BeDataset;

        tableInfo.beActivated();
        expect(tableInfo.active).to.be.true;
        expect(tableInfo.state).to.be.null;
    });

    it("should cancel activating", function(done) {
        let oldFunc = XcalarUnpublishTable;
        let called = false;
        XcalarUnpublishTable = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.state = PbTblState.Activating;

        tableInfo.cancel()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUnpublishTable = oldFunc;
        });
    });

    it("should cancel loading", function(done) {
        let oldFunc = QueryManager.cancelQuery;
        let called = false;
        QueryManager.cancelQuery = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.loadMsg = TblTStr.Importing;
        tableInfo.txId = 1;

        tableInfo.cancel()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            QueryManager.cancelQuery = oldFunc;
        });
    });

    it("cancel should handle invalid case", function(done) {
        let tableInfo = new PbTblInfo();

        tableInfo.cancel()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.be.undefined;
            done();
        });
    });

    it("should deactivate", function(done) {
        let oldFunc = XcalarUnpublishTable;
        let called = false;
        XcalarUnpublishTable = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo();
        tableInfo.active = true;
        tableInfo.state = PbTblState.Activating;

        tableInfo.deactivate()
        .then(function() {
            expect(called).to.be.true;
            expect(tableInfo.active).to.equal(false);
            expect(tableInfo.state).to.be.null;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUnpublishTable = oldFunc;
        });
    });

    it("should beDeactivated", function() {
        let tableInfo = new PbTblInfo();
        tableInfo.active = true;
        tableInfo.state = PbTblState.BeDataset;

        tableInfo.beDeactivated();
        expect(tableInfo.active).to.be.false;
        expect(tableInfo.state).to.be.null;
    });

    it("should beDatasetState", function() {
        let tableInfo = new PbTblInfo();
        tableInfo.beDatasetState("test");
        expect(tableInfo.dsName).to.equal("test");
        expect(tableInfo.state).to.equal(PbTblState.BeDataset);
    });

    it("should getRowCountStr", function() {
        let tableInfo = new PbTblInfo;

        // case 1
        tableInfo.active = false;
        tableInfo.rows = null;
        expect(tableInfo.getRowCountStr()).to.equal("N/A");

        // case 2
        tableInfo.active = true;
        expect(tableInfo.getRowCountStr()).to.equal("N/A");

        // case 3
        tableInfo.rows = 0;
        expect(tableInfo.getRowCountStr()).to.equal("0");

        // case 4
        tableInfo.rows = 1000;
        expect(tableInfo.getRowCountStr()).to.equal("1,000");

        // case 5
        tableInfo.updates = null;
        expect(tableInfo.getRowCountStr()).to.equal("1,000");

        // case 6
        tableInfo.updates = ["a"];
        expect(tableInfo.getRowCountStr()).to.equal("1,000");

        // case 7
        tableInfo.updates = ["a", "b"];
        expect(tableInfo.getRowCountStr()).to.equal("~1,000");
    });

    it("should getColCountStr", function() {
        let tableInfo = new PbTblInfo;

        // case 1
        tableInfo.active = false;
        tableInfo.columns = null;
        expect(tableInfo.getColCountStr()).to.equal("N/A");

        // case 2
        tableInfo.active = true;
        expect(tableInfo.getColCountStr()).to.equal("N/A");

        // case 3
        tableInfo.columns = [];
        expect(tableInfo.getColCountStr()).to.equal("0");

        // case 4
        tableInfo.columns = [{"name": "col", "type": ColumnType.string},
            {"name": "col", "type": ColumnType.string}];
        expect(tableInfo.getColCountStr()).to.equal("2");
    });


    it("_selectTable should work", function(done) {
        let oldFunc = DagGraph.prototype.execute;
        let called = false;
        DagGraph.prototype.execute = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        let tableInfo = new PbTblInfo({"name": "test"});
        tableInfo._selectTable()
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            DagGraph.prototype.execute = oldFunc;
        });
    });
});