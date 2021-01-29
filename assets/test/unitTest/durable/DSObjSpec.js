describe("DSObj Constructor Test", function() {
    it("Should have 11 attributes for ds", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "user": "testUser",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": true
        });

        expect(dsObj).to.be.instanceof(DSObj);
        expect(Object.keys(dsObj).length).to.equal(11);
        expect(dsObj).to.have.property("version")
        .and.to.equal(Durable.Version);
    });

    it("Should have 22 attributes for ds", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "user": "testUser",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "uneditable": false,
            "sources": [{
                "targetName": "test target",
                "path": "/netstore/datasets/gdelt/",
                "fileNamePattern": "abc.csv",
            }],
            "format": "CSV",
            "numEntries": 1000,
            "locked": true
        });

        expect(dsObj).to.be.instanceof(DSObj);
        expect(Object.keys(dsObj).length).to.equal(22);
        expect(dsObj).to.have.property("version")
        .and.to.equal(Durable.Version);
    });

    it("Should get id", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId
        });

        expect(dsObj.getId()).to.equal("testId");
    });

    it("Should get parent id", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId
        });

        expect(dsObj.getParentId()).to.equal(DSObjTerm.homeParentId);
    });

    it("Should get name", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId
        });

        expect(dsObj.getName()).to.equal("testName");
    });

    it("Should get full name", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "fullName": "testFullName"
        });

        expect(dsObj.getFullName()).to.equal("testFullName");
    });

    it("Should get user", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "user": "testUser",
            "parentId": DSObjTerm.homeParentId
        });

        expect(dsObj.getUser()).to.equal("testUser");
    });

    it("Should get format", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "format": "CSV",
            "parentId": DSObjTerm.homeParentId
        });

        expect(dsObj.getFormat()).to.equal("CSV");
    });

    it("Should set format", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "format": "CSV",
            "parentId": DSObjTerm.homeParentId
        });
        dsObj.setFormat("JSON")
        expect(dsObj.getFormat()).to.equal("JSON");
    });

    it("should get target name", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "sources": [{
                "targetName": "test target"
            }]
        });

        expect(dsObj.getTargetName()).to.equal("test target");
    });

    it("Should get path with pattern", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "sources": [{
                "targetName": "test target",
                "path": "/netstore/datasets/gdelt/",
                "fileNamePattern": "abc.csv"
            }]
        });

        expect(dsObj.getPathWithPattern())
        .to.equal("/netstore/datasets/gdelt/ | Pattern: abc.csv");
    });

    it("Should get num entries", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "numEntries": 1000
        });
        expect(dsObj.getNumEntries()).to.equal(1000);
    });

    it("Should know if is folder or not", function() {
        var dsObj1 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": true,
        });

        var dsObj2 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": false,
        });

        expect(dsObj1.beFolder()).to.be.true;
        expect(dsObj2.beFolder()).to.be.false;
    });

    it("Should know if dsObj is folder with ds", function() {
        var dsObj1 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": true,
        });

        dsObj1.totalChildren = 1;

        var dsObj2 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": true,
        });

        var dsObj3 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": false,
        });

        var dsObj4 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": true,
        });
        dsObj4.totalChildren = 0;
        dsObj4.eles.push("test");

        expect(dsObj1.beFolderWithDS()).to.be.true;
        expect(dsObj2.beFolderWithDS()).to.be.false;
        expect(dsObj3.beFolderWithDS()).to.be.false;
        expect(dsObj4.beFolderWithDS()).to.be.false;
    });

    it("Should know if is editable", function() {
        var dsObj1 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "uneditable": false,
        });

        var dsObj2 = new DSObj({
            "id": "testId",
            "name": "testName",
            "parentId": DSObjTerm.homeParentId,
            "uneditable": true
        });

        expect(dsObj1.isEditable()).to.be.true;
        expect(dsObj2.isEditable()).to.be.false;
    });

    it("Should get point args", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "pattern": "re:test",
            "user": "testUser",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "sources": [{
                "targetName": "test target",
                "path": "/netstore/datasets/gdelt/",
            }],
            "format": "CSV",
            "numEntries": 1000,
            "udfQuery": {"a": 1}
        });

        var res = dsObj.getImportOptions();
        expect(res).to.be.an("object");
        expect(res.sources).to.equal(dsObj.sources);
        expect(res.format).to.equal("CSV");
        expect(res.udfQuery).to.be.an("object");
        expect(res.udfQuery).to.have.property("a")
        .and.to.equal(1);
    });

    it("Should get and set size", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "size": 123
        });

        expect(dsObj.getSize()).to.equal(123);
        expect(dsObj.getDisplaySize()).to.equal("123B")
        dsObj.setSize(456);
        expect(dsObj.getSize()).to.equal(456);
        expect(dsObj.getDisplaySize()).to.equal("456B")
        dsObj.setSize(null);
        expect(dsObj.getSize()).to.be.null;
        expect(dsObj.getDisplaySize()).to.equal(CommonTxtTstr.NA);
    });

    it("Should get and set error", function() {
        // case 1
        var dsObj = new DSObj({"parentId": DSObjTerm.homeParentId});
        expect(dsObj.getError()).to.be.undefined;
        dsObj.setError("test");
        expect(dsObj.getError()).to.equal("test");
        // case 2
        dsObj = new DSObj({
            "parentId": DSObjTerm.homeParentId,
            "error": "test2"
        });
        expect(dsObj.getError()).to.equal("test2");
    });

    it("Should preserve order", function() {
        // XXX temp fix to preserve CSV header order
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": false
        });

        // when no headers
        var res = dsObj._preserveHeaderOrder(null);
        expect(res).to.be.null;

        res = dsObj._preserveHeaderOrder(["e", "f"]);
        expect(res[0]).to.equal("e");
        expect(res[1]).to.equal("f");

        // when has headers
        dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": false,
        });

        dsObj.columns = [{name: "a"}, {name: "b"}, {name: "c"}];

        res = dsObj._preserveHeaderOrder(["c", "b", "e"]);
        expect(res[0]).to.equal("b");
        expect(res[1]).to.equal("c");
        expect(res[2]).to.equal("e");
    });

    it("should activate/deactivate ds", function() {
        var dsObj = new DSObj({
            "id": "testId",
            "name": "testName",
            "fullName": "testFullName",
            "parentId": DSObjTerm.homeParentId,
            "isFolder": false
        });

        expect(dsObj.isActivated()).to.be.false;
        // activate
        dsObj.activate();
        expect(dsObj.isActivated()).to.be.true;

        // deactivate
        dsObj.deactivate();
        expect(dsObj.isActivated()).to.be.false;
    });

    describe("Fetch data test", function() {
        var oldMakeResult;
        var oldRelease;
        var oldFetch;
        var dsObj;

        before(function() {
            oldFetch = XcalarFetchData;
            oldMakeResult = XcalarMakeResultSetFromDataset;
            oldRelease = XcalarSetFree;
            dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false
            });

            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };
        });

        it("should makeResultSet", function(done) {
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 123
                });
            };

            dsObj._makeResultSet()
            .then(function() {
                expect(dsObj.resultSetId).to.equal(1);
                expect(dsObj.numEntries).to.equal(123);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should release dsObj", function(done) {
            dsObj._release()
            .then(function() {
                expect(dsObj.resultSetId).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should return null in invalid case", function(done) {
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": -1
                });
            };

            dsObj.fetch(1, 10)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal(DSTStr.NoRecords);
                done();
            });
        });

        it("should fetch data", function(done) {
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1000
                });
            };

            XcalarFetchData = function() {
                var json = JSON.stringify({"a": "b"});
                return PromiseHelper.resolve([json]);
            };

            dsObj.fetch(1, 10)
            .then(function({jsons, jsonKeys}) {
                expect(jsons).to.be.an("array");
                expect(jsonKeys).to.be.an("array");
                expect(jsonKeys[0]).to.equal("a");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("Should handle normal fail case", function(done) {
            XcalarFetchData = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            dsObj.fetch(1, 10)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.an("object");
                expect(error.error).to.equal("test");
                done();
            });
        });

        after(function() {
            XcalarFetchData = oldFetch;
            XcalarMakeResultSetFromDataset = oldMakeResult;
            XcalarSetFree = oldRelease;
        });
    });
});