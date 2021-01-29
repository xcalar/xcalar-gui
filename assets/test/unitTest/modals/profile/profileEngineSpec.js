describe("ProfileEngine Test", function() {
    var sortMap = {
        "asc": "asc",
        "origin": "origin",
        "desc": "desc",
        "ztoa": "ztoa"
    };

    var oldIndex;
    var oldGetNumRows;
    var oldGroupBy;
    var oldDelete;
    var oldSort;
    var oldAgg;
    var oldGetTables;
    var oldSetFree;
    var oldMakeResultSet;
    var oldFetch;
    var oldMap;
    var oldFilter;

    var profileEngine;

    before(function() {
        oldFilter = XIApi.filter;
        XIApi.filter = function() {
            return PromiseHelper.resolve("testtable#test");
        };

        oldIndex = XIApi.index;
        XIApi.index = function() {
            return PromiseHelper.resolve({});
        };

        oldGetNumRows = XIApi.getNumRows;
        XIApi.getNumRows = function() {
            return PromiseHelper.resolve(100);
        };

        oldGroupBy = XIApi.groupBy;
        XIApi.groupBy = () => PromiseHelper.resolve({});

        oldDelete = XIApi.deleteTable;
        XIApi.deleteTable = function() {
            return PromiseHelper.resolve();
        };

        oldSort = XIApi.sort;
        XIApi.sort = function() {
            return PromiseHelper.resolve({newTableName: "test", newKeys: []});
        };

        oldAgg = XIApi.aggregateWithEvalStr;
        XIApi.aggregateWithEvalStr = function() {
            return PromiseHelper.resolve({value: 30});
        };

        oldGetTables = XcalarGetTables;
        XcalarGetTables = function() {
            return PromiseHelper.resolve({numNodes: 1});
        };

        oldSetFree = XcalarSetFree;
        XcalarSetFree = function() {
            return PromiseHelper.resolve();
        };

        oldMakeResultSet = XcalarMakeResultSetFromTable;
        XcalarMakeResultSetFromTable = function() {
            return PromiseHelper.resolve({
                resultSetId: "testResult",
                numEntries: 100
            });
        };

        oldFetch = XcalarFetchData;
        XcalarFetchData = function() {
            var d = JSON.stringify({a: 1});
            return PromiseHelper.resolve([d]);
        };

        oldMap = XIApi.map;
        XIApi.map = function() {
            return PromiseHelper.resolve();
        };

        // constants
        var aggKeys = ["min", "average", "max", "count", "sum", "sd"];

        var statsKeyMap = {
            "zeroQuartile": "zeroQuartile",
            "lowerQuartile": "lowerQuartile",
            "median": "median",
            "upperQuartile": "upperQuartile",
            "fullQuartile": "fullQuartile"
        };
        var sortMap = {
            "asc": "asc",
            "origin": "origin",
            "desc": "desc",
            "ztoa": "ztoa"
        };
        var statsColName = "statsGroupBy";
        var bucketColName = "bucketGroupBy";

        profileEngine = new ProfileEngine({
            "sortMap": sortMap,
            "aggKeys": aggKeys,
            "statsKeyMap": statsKeyMap,
            "statsColName": statsColName,
            "bucketColName": bucketColName
        });
    });

    it("genProfile should work", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        var table = new TableMeta({
            tableName: "testTable#ti1",
            tableId: "ti1"
        });
        table.resultSetCount = 150;

        var cacheIndex = XIApi.index;
        XIApi.index = function() {
            return PromiseHelper.resolve("testTable2#ti2", {hasIndexed: true});
        };

        profileEngine.genProfile(profileInfo, table)
        .then(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.true;
            expect(profileInfo.groupByInfo.nullCount).to.equal(50);
            expect(profileInfo.groupByInfo.buckets[0]).not.to.be.null;
            XIApi.index = cacheIndex;
            done();
        })
        .fail(function() {
            XIApi.index = cacheIndex;
            done("fail");
        });
    });

    it("genProfile should handle fail case", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        var table = new TableMeta({
            tableName: "testTable#ti1",
            tableId: "ti1"
        });

        var cacheIndex = XIApi.index;
        XIApi.index = function() {
            return PromiseHelper.reject();
        };

        profileEngine.genProfile(profileInfo, table)
        .then(function() {
            XIApi.index = cacheIndex;
            done("fail");
        })
        .fail(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.false;
            XIApi.index = cacheIndex;
            done();
        });
    });

    it("checkProfileTable should work", function(done) {
        profileEngine.checkProfileTable()
        .then(function(res) {
            expect(res).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should fetch nothing before set profile table", function(done) {
        profileEngine.fetchProfileData()
        .then(function(res) {
            expect(res.length).to.equal(0);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("setProfileTable should work", function(done) {
        profileEngine.setProfileTable("testTable", 10)
        .then(function(res) {
            expect(res.length).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("fetchProfileData should handle error case", function(done) {
        var cacheFetch = XcalarFetchData;
        XcalarFetchData = function() {
            return PromiseHelper.resolve(["invalid thing to parse"]);
        };

        profileEngine.fetchProfileData(0, 1)
        .then(function() {
            XcalarFetchData = cacheFetch;
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.to.be.null;
            XcalarFetchData = cacheFetch;
            done();
        });
    });

    it("getTableRowNum should work", function() {
        // define by the result from XcalarMakeResultSetFromTable in before()
        var res = profileEngine.getTableRowNum();
        expect(res).to.equal(100);
    });

    it("sort should resolve if it's origin sort", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        profileEngine.sort(sortMap.origin, 0, profileInfo)
        .then(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("sort should work", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });
        profileInfo.addBucket(0, {
            bucketSize: 0,
            colName: "test",
            table: "testTable"
        });

        profileEngine.sort(sortMap.asc, 0, profileInfo)
        .then(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("sort should handle invalide case", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        profileEngine.sort("invalid", 0, profileInfo)
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.false;
            done();
        });
    });

    it("bucket should work", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });
        profileInfo.addBucket(0, {
            bucketSize: 0,
            colName: "test",
            table: "testTable"
        });
        profileEngine.bucket(null, "testTable", profileInfo, true)
        .then(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("bucket should handle invalide case", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        profileEngine.bucket("invalid", "testTable", profileInfo)
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(profileInfo.groupByInfo.isComplete).to.be.false;
            done();
        });
    });

    it("genAggs should work", function(done) {
        var oldRefresh = Profile.refreshAgg;
        Profile.refreshAgg = function() {};
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });
        var aggKeys = ["min", "average", "max", "count", "sum", "sd"];
        profileInfo.aggInfo.min = -100;
        profileInfo.aggInfo.max = null;

        profileEngine.genAggs("testTable", aggKeys, profileInfo)
        .then(function() {
            expect(profileInfo.aggInfo.min).to.equal(-100);
            expect(profileInfo.aggInfo.max).not.to.be.null;

            Profile.refreshAgg = oldRefresh;
            done();
        })
        .fail(function() {
            Profile.refreshAgg = oldRefresh;
            done("fail");
        });
    });

    it("genAggs should handle fail case", function(done) {
        var oldRefresh = Profile.refreshAgg;
        var cacheAgg = XIApi.aggregate;
        XIApi.aggregate = function() {
            return PromiseHelper.reject();
        };
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });

        profileInfo.aggInfo.min = null;
        var aggKeys = ["min", "average", "max", "count", "sum", "sd"];
        profileEngine.genAggs("testTable", aggKeys, profileInfo)
        .then(function() {
            expect(profileInfo.aggInfo.min).to.equal("--");

            XIApi.aggregate = cacheAgg;
            Profile.refreshAgg = oldRefresh;
            done();
        })
        .fail(function() {
            XIApi.aggregate = cacheAgg;
            Profile.refreshAgg = oldRefresh;
            done("fail");
        });
    });

    it("should resolve for unsorted case in genStats", function(done) {
        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });
        profileInfo.statsInfo.unsorted = true;
        profileInfo.statsInfo.zeroQuartile = null;

        profileEngine.genStats("testTable", profileInfo)
        .then(function() {
            expect(profileInfo.statsInfo.zeroQuartile).to.be.null;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should resolve for unsorted case in genStats test 2", function(done) {
        var oldCheckOrder = XIApi.checkOrder;
        XIApi.checkOrder = function() {
            return PromiseHelper.resolve({tableOrder: XcalarOrderingT.XcalarOrderingUnordered});
        };

        var profileInfo = new ProfileInfo({
            colName: "test",
            type: ColumnType.integer
        });
        profileInfo.statsInfo.unsorted = false;
        profileInfo.statsInfo.zeroQuartile = null;

        profileEngine.genStats("testTable", profileInfo)
        .then(function() {
            expect(profileInfo.statsInfo.zeroQuartile).to.be.null;

            XIApi.checkOrder = oldCheckOrder;
            done();
        })
        .fail(function() {
            XIApi.checkOrder = oldCheckOrder;
            done("fail");
        });
    });

    it("genStats should work", function(done) {
        var oldCheckOrder = XIApi.checkOrder;
        XIApi.checkOrder = function() {
            return PromiseHelper.resolve({tableOrder: XcalarOrderingT.XcalarOrderingAscending,
                                        tableKeys: [{name: "sortCol"}]});
        };

        var oldSortAsc = XIApi.sortAscending;
        XIApi.sortAscending = function() {
            return PromiseHelper.resolve({newTableName: "sort table", newKeys: [{name: "sortCol"}]});
        };

        var profileInfo = new ProfileInfo({
            colName: "sortCol",
            type: ColumnType.integer
        });
        profileInfo.statsInfo.unsorted = false;
        profileInfo.statsInfo.zeroQuartile = null;

        profileEngine.genStats("testTable", profileInfo, true)
        .then(function() {
            expect(profileInfo.statsInfo.zeroQuartile).not.to.be.null;

            XIApi.sortAscending = oldSortAsc;
            XIApi.checkOrder = oldCheckOrder;
            done();
        })
        .fail(function() {
            XIApi.sortAscending = oldSortAsc;
            XIApi.checkOrder = oldCheckOrder;
            done("fail");
        });
    });

    it("genStats should work handle fail case", function(done) {
        var oldSortAsc = XIApi.sortAscending;
        XIApi.sortAscending = function() {
            return PromiseHelper.reject("test error");
        };

        var profileInfo = new ProfileInfo({
            colName: "sortCol",
            type: ColumnType.integer
        });

        profileEngine.genStats("testTable", profileInfo, true)
        .then(function() {
            XIApi.sortAscending = oldSortAsc;
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("test error");
            XIApi.sortAscending = oldSortAsc;
            done();
        });
    });

    it("clear should work", function(done) {
        profileEngine.clear()
        .then(function() {
            var res = profileEngine.getTableRowNum();
            expect(res).to.equal(0);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("calcFitAllBucketSize should return correct bucket size", function() {
        // function parameters are: numRowsToFetch, max, min
        var func = profileEngine._calcFitAllBucketSize;
        var bucketSize = func(20, 600, 100);
        expect(bucketSize).to.equal(30);

        bucketSize = func(20, 2700, -2700);
        expect(bucketSize).to.equal(300);

        bucketSize = func(10, 50000, 46000);
        expect(bucketSize).to.equal(400);

        bucketSize = func(10, 50000, 46064);
        expect(bucketSize).to.equal(400);

        bucketSize = func(10, 50000, 45950);
        expect(bucketSize).to.equal(500);

        bucketSize = func(20, 2700000, 100);
        expect(bucketSize).to.equal(200000);
    });

    after(function() {
        XIApi.index = oldIndex;
        XIApi.getNumRows = oldGetNumRows;
        XIApi.groupBy = oldGroupBy;
        XIApi.sort = oldSort;
        XIApi.deleteTable = oldDelete;
        XIApi.aggregateWithEvalStr = oldAgg;
        XcalarGetTables = oldGetTables;
        XcalarSetFree = oldSetFree;
        XcalarMakeResultSetFromTable = oldMakeResultSet;
        XcalarFetchData = oldFetch;
        XIApi.map = oldMap;
        XIApi.filter = oldFilter;
    });
});