describe("xcHelper Test", function() {
    it("xcHelper.parseError should work", function() {
        var obj = {"test": "a"};
        expect(xcHelper.parseError(obj)).to.equal(JSON.stringify(obj));
        // case 2
        expect(xcHelper.parseError("test")).to.equal("test");
        // case 3
        expect(xcHelper.parseError(null)).to.equal(ErrTStr.Unknown);
        // case 4
        expect(xcHelper.parseError(new Error("test"))).to.equal("test");
    });

    it("xcHelper.parseJsonValue should work", function() {
        // case 1
        var res = xcHelper.parseJsonValue("test", true);
        expect(res.includes("undefined")).to.be.true;
        // case 2
        res = xcHelper.parseJsonValue(null);
        expect(res).to.equal('<span class="null">null</span>');
        // case 3
        res = xcHelper.parseJsonValue(undefined);
        expect(res).to.equal('<span class="blank">undefined</span>');
        // case 4
        res = xcHelper.parseJsonValue({});
        expect(res).to.equal('');
        // case 5
        res = xcHelper.parseJsonValue({"a": 1});
        expect(res).to.equal('{"a":1}');
        // case 6
        res = xcHelper.parseJsonValue(["a", "b"]);
        expect(res).to.equal('["a","b"]');
        // case 7
        res = xcHelper.parseJsonValue("test<>");
        expect(res).to.equal('test&lt;&gt;');
        // case 8
        res = xcHelper.parseJsonValue('{"a":{"b":"ABC, Inc."}}');
        expect(res).to.equal('{"a":{"b":"ABC, Inc."}}');
    });

    it("xcHelper.parseListDSOutput should work", function() {
        var datasets = [{
            "name": ".XcalarLRQ.test0"
        }, {
            "name": ".XcalarDS.test1"
        }];

        var res = xcHelper.parseListDSOutput(datasets);
        expect(res.length).to.equal(1);
        expect(res[0].name).to.equal("test1");
    });

    it("xcHelper.parseColType should work", function() {
        // case 1
        var res = xcHelper.parseColType(1);
        expect(res).to.equal("integer");
        // case 2
        res = xcHelper.parseColType(1.23);
        expect(res).to.equal("float");
        // case 3
        res = xcHelper.parseColType(1, "float");
        expect(res).to.equal("float");
        // case 4
        res = xcHelper.parseColType(true);
        expect(res).to.equal("boolean");
        // case 5
        res = xcHelper.parseColType("123");
        expect(res).to.equal("string");
        // case 6
        res = xcHelper.parseColType({"a": 1});
        expect(res).to.equal("object");
        // case 7
        res = xcHelper.parseColType([1, 2, 3]);
        expect(res).to.equal("array");
        // case 8
        res = xcHelper.parseColType(1, "mixed");
        expect(res).to.equal("mixed");
        // case 9
        res = xcHelper.parseColType(1, "string");
        expect(res).to.equal("mixed");
        // case 10
        res = xcHelper.parseColType(null, "string");
        expect(res).to.equal("mixed");
    });

    it("xcHelper.getJoinRenameMap should work", function() {
        var res = xcHelper.getJoinRenameMap("oldName", "newName");
        expect(res).to.be.an("object");
        expect(Object.keys(res).length).to.equal(3);
        expect(res).to.have.property("orig").and.to.equal("oldName");
        expect(res).to.have.property("new").and.to.equal("newName");
        expect(res).to.have.property("type").and
        .to.equal(DfFieldTypeT.DfUnknown);

        // case 2
        res = xcHelper.getJoinRenameMap("oldName2", "newName2", DfFieldTypeT.DfString);
        expect(res.orig).to.equal("oldName2");
        expect(res.new).to.equal("newName2");
        expect(res.type).to.equal(DfFieldTypeT.DfString);
    });

    it("xcHelper.convertColTypeToFieldType should work", function() {
        var func = xcHelper.convertColTypeToFieldType;
        expect(func(ColumnType.string)).to.equal(DfFieldTypeT.DfString);
        expect(func(ColumnType.integer)).to.equal(DfFieldTypeT.DfInt64);
        expect(func(ColumnType.float)).to.equal(DfFieldTypeT.DfFloat64);
        expect(func(ColumnType.boolean)).to.equal(DfFieldTypeT.DfBoolean);
        expect(func(ColumnType.timestamp)).to.equal(DfFieldTypeT.DfTimespec);
        expect(func(ColumnType.money)).to.equal(DfFieldTypeT.DfMoney);
        expect(func(ColumnType.mixed)).to.equal(DfFieldTypeT.DfUnknown);
    });

    it("xcHelper.convertFieldTypeToColType should work", function() {
        var func = xcHelper.convertFieldTypeToColType;
        expect(func(DfFieldTypeT.DfUnknown)).to.equal(ColumnType.unknown);
        expect(func(DfFieldTypeT.DfInt64)).to.equal(ColumnType.integer);
        expect(func(DfFieldTypeT.DfFloat64)).to.equal(ColumnType.float);
        expect(func(DfFieldTypeT.DfString)).to.equal(ColumnType.string);
        expect(func(DfFieldTypeT.DfBoolean)).to.equal(ColumnType.boolean);
        expect(func(DfFieldTypeT.DfTimespec)).to.equal(ColumnType.timestamp);
        expect(func(DfFieldTypeT.DfMoney)).to.equal(ColumnType.money);
        expect(func(DfFieldTypeT.DfMixed)).to.equal(ColumnType.mixed);
        expect(func(DfFieldTypeT.DfScalarObj)).to.equal(ColumnType.mixed);
        expect(func(DfFieldTypeT.DfFatptr)).to.equal(null);
        expect(func(DfFieldTypeT.DfArray)).to.equal(ColumnType.array);
        expect(func(DfFieldTypeT.DfObject)).to.equal(ColumnType.object);
        expect(func(DfFieldTypeT.DfNull)).to.equal(null);
        expect(func(null)).to.equal(null);
    });

    it("xcHelper.getFilterOptions should work", function() {
        // error case
        var res = xcHelper.getFilterOptions(null);
        expect(res).to.be.null;
        // filter case 1
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true});
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("eq(test, 1)");
        // filter case 2
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("or(eq(test, a), eq(test, b))");
        // filter case 3
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", null, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("not(exists(test))");
        // filter case 4
        res = xcHelper.getFilterOptions(FltOp.Filter, "test", {1: true}, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Filter);
        expect(res.filterString).to.be.equal("or(eq(test, 1), not(exists(test)))");

        // exclude case 1
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true});
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("neq(test, 1)");
        // exclude case 2
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {"a": true, "b": true});
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("and(neq(test, a), neq(test, b))");
        // exclude case 3
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", null, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("exists(test)");
        // exclude case 4
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {1: true}, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("and(neq(test, 1), exists(test))");
        // exclued case 5
        res = xcHelper.getFilterOptions(FltOp.Exclude, "test", {}, false, true);
        expect(res).to.be.an("object");
        expect(res.operator).to.be.equal(FltOp.Exclude);
        expect(res.filterString).to.be.equal("not(isNull(test))");
    });

    it("xcHelper.getUserPrefix should work", function() {
        var res = xcHelper.getUserPrefix();
        expect(res).to.equal(XcUser.getCurrentUserName());
    });

    it("xcHelper.wrapDSName should work", function() {
        var res = xcHelper.wrapDSName("test");
        var nameParts = res.split(".");
        var randId = nameParts[nameParts.length - 2];
        var expected = XcUser.getCurrentUserName() + "." + randId + ".test";
        expect(res).to.equal(expected);
        expect(("" + randId).length).to.equal(5);
    });

    it("xcHelper.parseDSName should work", function() {
        // case 1
        var res = xcHelper.parseDSName("test");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal(DSTStr.UnknownUser);
        expect(res.randId).to.be.equal(undefined);
        expect(res.dsName).to.be.equal("test");
        // case 2
        res = xcHelper.parseDSName("user.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user");
        expect(res.randId).to.be.equal(DSTStr.UnknownId);
        expect(res.dsName).to.be.equal("test2");
        // case 3
        res = xcHelper.parseDSName("user.36472.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
        // case 4
        res = xcHelper.parseDSName("user.user.36472.test2");
        expect(res).to.be.an("object");
        expect(res.user).to.be.equal("user.user");
        expect(("" + res.randId).length).to.be.equal(5);
        expect(res.dsName).to.be.equal("test2");
    });

    it("xcHelper.getUniqColName should work", function() {
        // case 1
        var res = xcHelper.getUniqColName(null, null);
        expect(res.includes("NewCol")).to.be.true;
        // case 2
        res = xcHelper.getUniqColName(null, "test");
        expect(res).to.be.equal("test");
        // case 3
        var progCol = ColManager.newCol({
            "backName": "test",
            "name": "test",
            "isNewCol": false,
            "userStr": '"test" = pull(test)',
            "func": {
                "name": "pull",
                "args": ["test"]
            }
        });
        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol]
        });

        // case 4
        res = xcHelper.getUniqColName("xc-Test", "t2");
        expect(res).to.be.equal("t2");
        // case 5
        res = xcHelper.getUniqColName("xc-Test", "test");
        expect(res).to.be.equal("test_1");
        delete gTables["xc-Test"];
    });

    it("xcHelper.getTableKeyFromMeta should work", function() {
        var tableMeta = {
            "keyAttr": [{
                "name": "user::test",
                "valueArrayIndex": 0
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        var res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal("user::test");
        // case 2
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": 0
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal("test");

        // case 3
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": -1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.be.null;
    });

    it("xcHelper.getTableKeyInfoFromMeta should work", function() {
        var tableMeta = {
            "keyAttr": [{
                "name": "user::test",
                "valueArrayIndex": 0,
                "ordering": 1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfFatptr
            }]
        };

        var res = xcHelper.getTableKeyInfoFromMeta(tableMeta);
        expect(res.length).to.equal(1);
        expect(res[0]).to.be.an("object");
        expect(res[0].name).to.equal("user::test");
        expect(res[0].ordering).to.equal(1);

        // case 2
        tableMeta = {
            "keyAttr": [{
                "name": "test",
                "valueArrayIndex": -1
            }],
            "valueAttrs": [{
                "name": "user",
                "type": DfFieldTypeT.DfString
            }]
        };

        res = xcHelper.getTableKeyInfoFromMeta(tableMeta);
        expect(res.length).to.equal(0);
    });

    it("xcHelper.deepCopy should work", function() {
        var obj = {"a": 1, "b": "test"};
        var res = xcHelper.deepCopy(obj);
        expect(res).to.deep.equal(obj);

        // test it's a copy, not reference
        res.a = 2;
        expect(obj.a).to.equal(1);
    });

    // it("xcHelper.middleEllipsis should work", function() {
    //     // don't know how to test yet...
    // });
    //
    it("xcHelper.getMaxTextLen should work", function() {
        var canvas = $("<canvas></canvas>")[0];
        var ctx = canvas.getContext("2d");
        expect(xcHelper.getMaxTextLen(ctx, "hello", 100, 0, 5)).to.equal(4);
        expect(xcHelper.getMaxTextLen(ctx, "hello", 10, 0, 5)).to.be.lt(4);
    });

    it("xcHelper.mapColGenerate should work", function() {
        var progCol = ColManager.newCol({
            "backName": "test",
            "name": "test",
            "isNewCol": false,
            "userStr": '"test" = pull(test)',
            "func": {
                "name": "pull",
                "args": ["test"]
            }
        });
        // case 1
        var resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)", [progCol]);
        expect(resCols).to.be.an("array");
        expect(resCols.length).to.equal(2);
        expect(resCols[0]).to.be.an("object");
        expect(resCols[0].name).to.equal("mapCol");
        expect(resCols[0].userStr).to.equal('"mapCol" = map(abs(test))');
        expect(resCols[1].name).to.equal("test");
        // case 2
        var options = {"replaceColumn": true};
        resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)",
                                            [progCol], options);
        expect(resCols.length).to.equal(1);
        expect(resCols[0].name).to.equal("mapCol");
        // case 3
        options = {"replaceColumn": true, "width": 100};
        resCols = xcHelper.mapColGenerate(1, "mapCol", "abs(test)",
                                            [progCol], options);
        expect(resCols.length).to.equal(1);
        expect(resCols[0].name).to.equal("mapCol");
        // xx temp disabled
        // expect(resCols[0].width).to.equal(100);
    });

    // XXX fails jenkins
    it.skip("xcHelper.getDefaultColWidth should work", function() {
        var testCases = [{
            "colName": "a",
            "prefix": "b",
            "width": 56
        }, {
            "colName": "a",
            "prefix": "bc",
            "width": 63
        }, {
            "colName": "bc",
            "prefix": "a",
            "width": 63
        }, {
            "colName": "a",
            "width": 130
        }, {
            "colName": "a",
            "prefix": "",
            "width": 130
        }];

        testCases.forEach(function(testCase) {
            var colName = testCase.colName;
            var prefix = testCase.prefix;
            var res = xcHelper.getDefaultColWidth(colName, prefix);
            expect(res).to.equal(testCase.width);
        });
    });

    it("xcHelper.randName should work", function() {
        // case 1
        var res = xcHelper.randName("test", 2);
        expect(res.length).to.equal(6);
        expect(res.startsWith("test")).to.be.true;
        // case 2
        res = xcHelper.randName("test");
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.uniqueName should work", function() {
        // case 1
        var res = xcHelper.uniqueName("test");
        expect(res).to.equal("test");

        // case 2
        var validFunc = function(name) { return name !== "test"; };
        res = xcHelper.uniqueName("test", validFunc);
        expect(res).to.equal("test_1");

        // case 3
        validFunc = function(name) { return name !== "test"; };
        var nameGenFunc = function(cnt) { return "test-" + cnt; };
        res = xcHelper.uniqueName("test", validFunc, nameGenFunc);
        expect(res).to.equal("test-1");

        // case 3
        validFunc = function() { return false; };
        res = xcHelper.uniqueName("test", validFunc, null, 5);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.uniqueRandName should work", function() {
        // case 1
        var res = xcHelper.uniqueRandName("test");
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;
        // case 2
        var validFunc = function() { return true; };
        res = xcHelper.uniqueRandName("test", validFunc, 1);
        expect(res.length).to.equal(9);
        expect(res.startsWith("test")).to.be.true;

        // case 3
        validFunc = function() { return false; };
        res = xcHelper.uniqueRandName("test", validFunc);
        expect(res.length).to.equal(14);
        expect(res.startsWith("test")).to.be.true;
    });

    it("xcHelper.arraySubset should work", function() {
        expect(xcHelper.arraySubset([1, 2], [3, 1, 4, 2])).to.be.true;
        expect(xcHelper.arraySubset([1, 2], [3, 1, 4])).to.be.false;
    });

    it("xcHelper.arrayUnion should work", function() {
        var res = xcHelper.arrayUnion([1, 2], [1, 3, 4]);
        expect([1,2,3,4]).to.deep.equal([1, 2, 3, 4]);
    });

    it("xcHelper.getApiUrl should work", function() {
        // Backup variables
        const [oldHostname, oldexpHost] = [window['expHost'], hostname];

        // Case: on production
        hostname = 'http://clusterhost';
        window['expHost'] = undefined;
        expect(xcHelper.getApiUrl()).to.equal('http://clusterhost/app/service/xce');

        // Case: on dev machine
        hostname = oldHostname;
        window['expHost'] = 'http://myvm';
        expect(xcHelper.getApiUrl()).to.equal('http://myvm/app/service/xce');

        // Restore variables
        [window['expHost'], hostname] = [oldHostname, oldexpHost];
    });

    it("xcHelper.downloadAsFile should work", function() {
        var fileName = "fileName";
        var fileContent = "test";
        let called = false;
        let cached = window.saveAs;
        window.saveAs = (blob, fName) => {
            expect(blob.size).to.equal(4);
            expect(fName).to.equal(fileName);
            called = true;
        }
        xcHelper.downloadAsFile(fileName, fileContent);

        expect(called).to.be.true;
        window.saveAs = cached;
    });

    it("xcHelper.downloadAsFile with raw data should work", function() {
        var fileName = "fileName";
        var fileContent = "test";
        let called = false;
        let cached = window.saveAs;
        window.saveAs = (blob, fName) => {
            expect(blob.size).to.equal(4);
            expect(fName).to.equal(fileName);
            called = true;
        }
        xcHelper.downloadAsFile(fileName, fileContent, "application/gzip");

        expect(called).to.be.true;
        window.saveAs = cached;
    });

    it("xcHelper.sizeTranslator should work", function() {
        // case 1
        var res = xcHelper.sizeTranslator(1);
        expect(res).to.equal("1B");
        // case 2
        res = xcHelper.sizeTranslator(1024);
        expect(res).to.equal("1.00KB");
        // case 3
        res = xcHelper.sizeTranslator(10241);
        expect(res).to.equal("10.0KB");
        // case 4
        res = xcHelper.sizeTranslator(1024, false, "B");
        expect(res).to.equal("1024B");
        // case 5
        res = xcHelper.sizeTranslator(1, true);
        expect(res).to.be.an("array");
        expect(res.length).to.equal(2);
        expect(res[0]).to.equal("1");
        expect(res[1]).to.equal("B");

        // case 6 (rounding)
        res = xcHelper.sizeTranslator(25.3);
        expect(res).to.equal("25B");
    });

    it("xcHelper.textToBytesTranslator should work", function() {
        var res = xcHelper.textToBytesTranslator("1KB");
        expect(res).to.equal(1024);

        res = xcHelper.textToBytesTranslator("1.0KB");
        expect(res).to.equal(1024);
    });

    it("xcHelper.validate should work", function() {
        var cacheMinMode = gMinModeOn;
        gMinModeOn = true;

        // case 1
        var $e = $("<div></div>");
        var res = xcHelper.validate({
            "$ele": $e
        });
        expect(res).to.be.false;
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.NoEmpty);

        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 2
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return false; }
        });
        expect(res).to.be.true;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 3
        res = xcHelper.validate([{
            "$ele": $e,
            "check": function() { return false; }
        },{
            "$ele": $e,
            "check": function() { return true; },
            "quite": true
        }]);
        expect(res).to.be.false;
        assert.isFalse($("#statusBox").is(":visible"));

        // case 4
        var test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return true; },
            "callback": function() { test = "test"; }
        });
        expect(res).to.be.false;
        expect(test).to.be.equal("test");
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.InvalidField);
        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        // case 5
        test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "isAlert": true,
            "error": "test error"
        });
        expect(res).to.be.false;
        assert.isTrue($("#alertModal").is(":visible"));
        var text = $("#alertContent .text").text();
        assert.equal(text, "test error");
        $("#alertModal .close").click();
        assert.isFalse($("#alertModal").is(":visible"));

        // case 6
        test = null;
        res = xcHelper.validate({
            "$ele": $e,
            "check": function() { return true; },
            "onErr": function() { test = "test"; }
        });
        expect(res).to.be.false;
        expect(test).to.be.equal("test");
        assert.isTrue($("#statusBox").is(":visible"));
        assert.equal($("#statusBox .message").text(), ErrTStr.InvalidField);
        $("#statusBox").find(".close").mousedown();
        assert.isFalse($("#statusBox").is(":visible"));

        gMinModeOn = cacheMinMode;
    });

    it("xcHelper.tableNameInputChecker should work", function() {
        var $statusBox = $("#statusBox");
        var $input = $('<input type="text">');
        $("body").append($input);

        var onErrTrigger = false;
        var testCases = [{
            "val": "TESTTABLE",
            "valid": true
        }, {
            "val": "testTable",
            "valid": false,
            "error": ErrTStr.InvalidPublishedTableName
        }, {
            "val": "",
            "valid": false,
            "error": ErrTStr.NoEmpty
        }, {
            "val": "AB:C",
            "valid": false,
            "error": ErrTStr.InvalidPublishedTableName
        }, {
            "val": "AB#C",
            "valid": false,
            "error": ErrTStr.InvalidPublishedTableName
        }, {
            "val": "AB-C", // no hyphen
            "valid": false,
            "error": ErrTStr.InvalidPublishedTableName
        }, {
            "val": new Array(300).join("A"),
            "valid": false,
            "error": ErrTStr.TooLong
        }, {
            "val": "TESTDUPNAME",
            "valid": true
        }];

        testCases.forEach(function(testCase) {
            $input.val(testCase.val);
            var res = xcHelper.tableNameInputChecker($input, testCase.options);
            expect(res).to.equal(testCase.valid);

            if (!testCase.valid) {
                assert.isTrue($statusBox.is(":visible"));
                expect($statusBox.find(".message").text())
                .to.equal(testCase.error);

                if (testCase.options && testCase.options.onErr) {
                    expect(onErrTrigger).to.be.true;
                }

                StatusBox.forceHide();
            }
        });

        $input.remove();
    });

    it("xcHelper.getTableName should work", function() {
        // case 1
        var res = xcHelper.getTableName("test#hd1");
        expect(res).to.equal("test");
        // case 2
        res = xcHelper.getTableName("test");
        expect(res).to.equal("test");
    });

    it("xcHelper.getTableId should work", function() {
        // case 1
        var res = xcHelper.getTableId("test#hd1");
        expect(res).to.equal("hd1");
        // case 2
        res = xcHelper.getTableId("test");
        expect(res[0]).to.equal("t");
        // case
        res = xcHelper.getTableId();
        expect(res).to.be.null;
    });

    it("xcHelper.createNextName should work", function() {
        var res = xcHelper.createNextName("abc", "-");
        expect(res).to.equal("abc-1");
        // case 2
        res = xcHelper.createNextName("abc-1", "-");
        expect(res).to.equal("abc-2");
    });

    it("xcHelper.createNextColumnName should work", function() {
        var allNames = ["test_2_cd1", "test_cd1", "test_asdf_awet_cd1",
                        "_2djt4_cd2", "_awwet_215_cd1"];
        // case 1
        var res = xcHelper.createNextColumnName(allNames, "hello", "cd1");
        expect(res).to.equal("hello_cd1");
        // case 2
        res = xcHelper.createNextColumnName(allNames, "test", "cd1");
        expect(res).to.equal("test_3_cd1");
        // case 3
        res = xcHelper.createNextColumnName(allNames, "test_a", "cd1");
        expect(res).to.equal("test_a_cd1");
        // case 4
        res = xcHelper.createNextColumnName(allNames, "_a", "cd1");
        expect(res).to.equal("_a_cd1");
        // case 5
        res = xcHelper.createNextColumnName(allNames, "_a_1_cd1", "cd1");
        expect(res).to.equal("_a_cd1");
        // case 6
        allNames.push("_a_cd1");
        res = xcHelper.createNextColumnName(allNames, "_a_1_cd1", "cd1");
        expect(res).to.equal("_a_2_cd1");
        // case 7
        res = xcHelper.createNextColumnName(allNames, "test_483_cd1", "cd1");
        expect(res).to.equal("test_484_cd1");
        // case 8
        res = xcHelper.createNextColumnName(allNames, "test_a_cd1", "cd1");
        expect(res).to.equal("test_a_1_cd1");

    });

    it("xcHelper.checkNamePattern should work", function() {
        var testCases = [{
            "category": "dataset",
            "action": "fix",
            "name": "a(F-_&$38",
            "replace": "0",
            "expect": "a0F-_0038"
        }, {
            "category": "folder",
            "action": "fix",
            "name": "a(F-_ &$38)",
            "replace": "0",
            "expect": "a(F-_ 0038)"
        }, {
            "category": "param",
            "action": "fix",
            "name": "a(F-_ &$38)",
            "replace": "",
            "expect": "aF_38"
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a(F-_ &$38)",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a012345678901234567890123456789a",
            "expect": false
        }, {
            "category": "prefix",
            "action": "check",
            "name": "a01234568901234567890123456789a",
            "expect": true
        }, {
            "category": "udf",
            "action": "check",
            "name": "9ab",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "-ab",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "_ab9-c.",
            "expect": false
        }, {
            "category": "udf",
            "action": "check",
            "name": "_ab9_c",
            "expect": true
        }, {
            "category": "workbook",
            "action": "check",
            "name": "ab9 --c",
            "expect": true
        }, {
            "category": "workbook",
            "action": "check",
            "name": "_ab9c",
            "expect": false
        }, {
            "category": "workbook",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        }, {
            "category": "target",
            "action": "check",
            "name": "ab9 --c",
            "expect": true
        }, {
            "category": "target",
            "action": "check",
            "name": "_ab9c",
            "expect": false
        }, {
            "category": "target",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        },
        {
            "category": "export",
            "action": "check",
            "name": "ab*9c",
            "expect": false
        },
        {
            "category": "export",
            "action": "check",
            "name": "ab/9c",
            "expect": true
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "",
            "expect": false
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "AB_C1",
            "expect": true
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "Ab",
            "expect": false
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "AB#C",
            "expect": false
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "AB-C",
            "expect": false
        },
        {
            "category": "publishedTable",
            "action": "check",
            "name": "_ABC",
            "expect": false
        }
    ];

        testCases.forEach(function(test) {
            var res = xcHelper.checkNamePattern(test.category, test.action,
                                                test.name, test.replace);
            if (res !== test.expect) {
                console.error("test", test, "failed");
            }
            expect(res).to.equal(test.expect);
        });

        function regexEqual(x, y) {
            return (x instanceof RegExp) && (y instanceof RegExp) &&
                   (x.source === y.source) && (x.global === y.global) &&
                   (x.ignoreCase === y.ignoreCase) &&
                   (x.multiline === y.multiline);
        }
        var res = xcHelper.checkNamePattern("doesNotExit", "get");
        expect(regexEqual(res, /^[a-zA-Z0-9_-]+$/)).to.be.true;
    });

    it("xcHelper.isValidTableName should work", function() {
        var res = xcHelper.isValidTableName("");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName(null);
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("a");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("abc1");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab1c");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("ab#c1");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("a_b");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("a-b");
        expect(res).to.be.true;

        res = xcHelper.isValidTableName("1a");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("_a");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName("-abc");
        expect(res).to.be.false;

        res = xcHelper.isValidTableName(".abc");
        expect(res).to.be.false;
    });


    it("xcHelper.hasInvalidCharInCol should work", function() {
        var testCases = [
            {
                "str": "abc^",
                "res": true
            },
            {
                "str": "ab(c",
                "res": true
            },
            {
                "str": "ab[c",
                "res": true
            },
            {
                "str": "ab]c",
                "res": true
            },
            {
                "str": "ab:c",
                "res": true
            },
            {
                "str": "ab:c",
                "res": true
            },
            {
                "str": "ab\'c",
                "res": true
            },
            {
                "str": "ab\"c",
                "res": true
            },
            {
                "str": "abc",
                "res": false
            },
            {
                "str": "ab!c",
                "res": false
            },
            {
                "str": "ab@c",
                "res": false
            },
            {
                "str": "ab#c",
                "res": false
            },
            {
                "str": "ab$c",
                "res": false
            },
            {
                "str": "ab}c",
                "res": true
            },
            {
                "str": "ab::c",
                "options": [false, true],
                "res": true
            },
            {
                "str": "ab:c",
                "options": [false, true],
                "res": false
            },
        ];

        testCases.forEach(function(test) {
            var res = (test.options == null)
                ? xcHelper.hasInvalidCharInCol(test.str)
                : xcHelper.hasInvalidCharInCol(test.str, ...test.options);
            expect(res, JSON.stringify(test)).to.equal(test.res);
        });
    });

    it("xcHelper.isColNameStartValid should work", function() {
        expect(xcHelper.isColNameStartValid("")).to.be.false;
        expect(xcHelper.isColNameStartValid(" ")).to.be.false;
        expect(xcHelper.isColNameStartValid("1ab")).to.be.false;
        expect(xcHelper.isColNameStartValid("_ab")).to.be.true;
        expect(xcHelper.isColNameStartValid("abc")).to.be.true;
        expect(xcHelper.isColNameStartValid("<abc")).to.be.false;
        expect(xcHelper.isColNameStartValid("<abc", true)).to.be.true;
    });

    it("xcHelper.validateColName should work", function() {
        var testCases = [
            {
                "str": "",
                "res": ErrTStr.NoEmpty
            },
            {
                "str": "\t",
                "res": ErrTStr.NoEmpty
            },
            {
                "str": "a".repeat(256),
                "res": ColTStr.LongName
            },
            {
                "str": "ab[c",
                "res": ColTStr.ColNameInvalidChar
            },
            {
                "str": "DATA",
                "res": ErrTStr.PreservedName
            },
            {
                "str": "test--test",
                "res": xcStringHelper.replaceMsg(ErrWRepTStr.PreservedString, {
                    "char": '--'
                })
            },
            {
                "str": "data",
                "res": null
            },
            {
                "str": "Data",
                "res": null
            },
            {
                "str": "false",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "False",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "fAlse",
                "res":  ErrTStr.PreservedName
            },
            {
                "str": "0test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "$test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "_test",
                "res": null
            },
            {
                "str": "-test",
                "res": ColTStr.RenameStartInvalid
            },
            {
                "str": "abc",
                "res": null
            }
        ];

        testCases.forEach(function(test) {
            var res = xcHelper.validateColName(test.str);
            expect(res).to.equal(test.res);
        });
    });

    it("xcHelper.validatePrefixName should work", function() {
        var testCases = [
            {
                "str": "1test",
                "res": ErrTStr.PrefixStartsWithLetter
            },
            {
                "str": "a".repeat(32),
                "res": ErrTStr.PrefixTooLong
            },
            {
                "str": "ab[c",
                "res": ColTStr.PrefixInValid
            },
            {
                "str": "ab-c",
                "res": null
            },
            {
                "str": "ab_c",
                "res": null
            },{
                "str": "ab--c",
                "res": ErrTStr.PrefixNoDoubleHyphen
            }
        ];

        testCases.forEach(function(test) {
            var res = xcHelper.validatePrefixName(test.str);
            expect(res).to.equal(test.res);
        });
    });

    it("xcHelper.escapeColName should work", function() {
        // case 1
        var res = xcHelper.escapeColName("a.b");
        expect(res).to.equal("a\\.b");
        // case 2
        res = xcHelper.escapeColName("a\\b");
        expect(res).to.equal("a\\\\b");
        // case 3
        res = xcHelper.escapeColName("a[b]");
        expect(res).to.equal("a\\[b\\]");
    });

    it("xcHelper.unescapeColName should work", function() {
        // case 1
        var res = xcHelper.unescapeColName("a\\.b");
        expect(res).to.equal("a.b");
        // case 2
        res = xcHelper.unescapeColName("a\\\\b");
        expect(res).to.equal("a\\b");
        // case 3
        res = xcHelper.unescapeColName("a\\[b\\]");
        expect(res).to.equal("a[b]");
    });

    it("xcHelper.stripColName should work", function() {
        var res = xcHelper.stripColName("votes.funny");
        expect(res).to.equal("votes_funny");

        res = xcHelper.stripColName("a[b]");
        expect(res).to.equal("a_b");

        res = xcHelper.stripColName("[b]");
        expect(res).to.equal("b");

        res = xcHelper.stripColName("a\\.b");
        expect(res).to.equal("a_b");

        res = xcHelper.stripColName("9b");
        expect(res).to.equal("_9b");

        res = xcHelper.stripColName("^b");
        expect(res).to.equal("b");

        // don't strip ::
        res = xcHelper.stripColName("a::b");
        expect(res).to.equal("a::b");

        // strip ::
        res = xcHelper.stripColName("a::b", false, true);
        expect(res).to.equal("a_b");
    });

    it("xcHelper.cleanseSQLColName should work", function() {
        var res = xcHelper.cleanseSQLColName("a/b");
        expect(res).to.equal("a_b");

        var res = xcHelper.cleanseSQLColName("a/^]::b");
        expect(res).to.equal("a_b");

        var res = xcHelper.cleanseSQLColName("a/:/b");
        expect(res).to.equal("a___b");
    });

    it("xcHelper.castStrHelper should work", function() {
        // case 1
        var res = xcHelper.castStrHelper("test", ColumnType.boolean);
        expect(res).to.equal("bool(test)");
        // case 2
        res = xcHelper.castStrHelper("test", ColumnType.float);
        expect(res).to.equal("float(test)");
        // case 3
        res = xcHelper.castStrHelper("test", ColumnType.integer);
        expect(res).to.equal("int(test, 10)");
        // case 4
        res = xcHelper.castStrHelper("test", ColumnType.string);
        expect(res).to.equal("string(test)");
        // case 5
        res = xcHelper.castStrHelper("test", ColumnType.timestamp);
        expect(res).to.equal("timestamp(test)");
        // case 6
        res = xcHelper.castStrHelper("test", ColumnType.money);
        expect(res).to.equal("money(test)");
        // case 7
        res = xcHelper.castStrHelper("test", "test");
        expect(res).to.equal("test(test)");
    });

    it("xcHelper.isCharEscaped should work", function() {
        // case 1
        var res = xcHelper.isCharEscaped("\\.", 1);
        expect(res).to.be.true;
        res = xcHelper.isCharEscaped("\\\\.", 2);
        expect(res).to.be.false;
    });

    it("xcHelper.deepCompare should work", function() {
        // case 1
        var a = {"a": {"b": 1}};
        var b = {"a": {"b": 1}};
        var res = xcHelper.deepCompare(a, b);
        expect(res).to.be.true;
        // case 2
        a = {"a": 1};
        b = {"a": 2};
        res = xcHelper.deepCompare(a, b);
        expect(res).to.be.false;
        // case 3
        res = xcHelper.deepCompare("a", "a");
        expect(res).to.be.true;
        // case 4
        res = xcHelper.deepCompare("a", "b");
        expect(res).to.be.false;
        // case 5
        res = xcHelper.deepCompare(1, "b");
        expect(res).to.be.false;
        // case 6
        res = xcHelper.deepCompare(1, 1);
        expect(res).to.be.true;
        // case 7
        res = xcHelper.deepCompare(1, 2);
        expect(res).to.be.false;
        // case 8
        res = xcHelper.deepCompare(NaN, NaN);
        expect(res).to.be.true;
        // case 9
        res = xcHelper.deepCompare([1,2,3], [1, 2, 3]);
        expect(res).to.be.true;
        // case 10
        res = xcHelper.deepCompare([1,2,3], [3, 2, 1]);
        expect(res).to.be.false;
        // case 11
        a = {"a": "b", "b": {"b": 1}};
        b = {"a": "b", "b": {"b": 2}};
        res = xcHelper.deepCompare(a, b);
        expect(res).to.be.false;
        // case 12
        res = xcHelper.deepCompare(1);
        expect(res).to.be.true;
        // case 13
        a = {"a": 1};
        b = {"a": 1};
        a["b"] = a;
        b["b"] = a;
        res = xcHelper.deepCompare(1);
        expect(res).to.be.true;
    });

    it("xcHelper.getFormat should work", function() {
        var getFormat = xcHelper.getFormat;
        expect(getFormat("a")).to.be.null;
        expect(getFormat(34)).to.be.null; // 6311
        expect(getFormat("a.json")).to.equal("JSON");
        expect(getFormat("b.csv")).to.equal("CSV");
        expect(getFormat("c.tsv")).to.equal("CSV");
        expect(getFormat("d.xlsx")).to.equal("Excel");
        expect(getFormat("e.txt")).to.equal("TEXT");
        expect(getFormat("f.test")).to.be.null;
    });

    it("xcHelper.autoName should work", function() {
        // case 1
        var res = xcHelper.autoName("test", {});
        expect(res).to.equal("test");

        // case 2
        res = xcHelper.autoName("test", {"test": true});
        expect(res).to.equal("test1");

        // case 3
        res = xcHelper.autoName("test", {"test": true}, 0);
        // should be test + 5digits
        expect(res.length).to.equal(9);
    });

    it("xcHelper.sortVals should work", function() {
        var func = xcHelper.sortVals;
        var asc = ColumnSortOrder.ascending;
        var desc = ColumnSortOrder.descending;
        // to.equal(1) if order is 1 and arg1 < arg2
        // to.equal(-1) if order is 1 and arg1 > arg2
        expect(func("a", "a")).to.equal(0);
        expect(func("a", "b")).to.equal(-1);
        expect(func("a", "b", desc)).to.equal(1);
        expect(func("b", "a", desc)).to.equal(-1);
        expect(func("a", "b", asc)).to.equal(-1);
        expect(func("b", "a", asc)).to.equal(1);

        expect(func("a6", "a50", desc)).to.equal(1);
        expect(func("a60", "a50", desc)).to.equal(-1);

        expect(func("a6z", "a50z", desc)).to.equal(-1);
        expect(func("a6z5", "a50z3", desc)).to.equal(-1);

        expect(func("a6z5", "a6z3", desc)).to.equal(-1);
        expect(func("a6z3", "a6z5", desc)).to.equal(1);


        expect(func("a6z3", "a6z5", desc)).to.equal(1);
        expect(func("a7z3", "a6z5", desc)).to.equal(-1);
    });

    // XXX fails jenkins test
    it.skip("xcHelper.getUDFList should work", function(done) {
        UDFFileManager.Instance.list()
        .then(function(ret) {
            expect(ret).to.be.an("object");
            expect(ret).to.have.all.keys("numXdfs", "fnDescs");

            var udfObj = xcHelper.getUDFList(ret);

            expect(udfObj).to.be.an("object");
            expect(udfObj).to.have.all.keys("moduleLis", "fnLis");

            var $moduleLis = $(udfObj.moduleLis);
            var $fnLis = $(udfObj.fnLis);

            expect($moduleLis.length).to.be.gt(1);
            expect($fnLis.length).to.be.gt(5);
            expect($fnLis.length).to.be.gte($moduleLis.length);
            $fnLis.each(function() {
                var $li = $(this);
                var module = $li.data("module");
                var $moduleLi = $moduleLis.filter(function() {
                    return $(this).data("module") === module;
                });
                expect($moduleLi.length).to.equal(1);
            });
            done();
        });
    });

    // difficult to test this without rewriting the entire function in here...
    it("ModalHelper.repositionModalOnWinResize should work", function () {
        var $modal = $('<div id="unitTestModal" style="' +
                        'width:50px;height:50px;position:absolute;"></div>');
        $("#container").prepend($modal);
        var left = 50;
        var top = 50;
        $modal.css({"top": top, "left": left});
        var modalSpecs = {$modal: $modal, top: top, left: left};
        var windowSpecs = {winWidth: 200, winHeight: 200};
        // assuming prev win dimensions were 200 x 200, the modal would be 25%
        // from the top and 25% from the left

        var curWinHeight = $(window).height();
        var curWinWidth = $(window).width();

        ModalHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);

        if (curWinWidth > windowSpecs.winWidth) {
            expect($modal.css("left")).to.be.gt(curWinWidth * .25);
            expect($modal.css("left")).to.be.lt(curWinWidth * .50);
        } else if (curWinWidth < windowSpecs.winWidth) {
            expect($modal.css("left")).to.be.lt(curWinWidth * .25);
        }
        if (curWinHeight > windowSpecs.winHeight) {
            expect($modal.css("top")).to.be.gt(curWinHeight * .25);
            expect($modal.css("top")).to.be.lt(curWinHeight * .50);
        } else if (curWinHeight < windowSpecs.winHeight) {
            expect($modal.css("top")).to.be.lt(curWinHeight * .25);
        }

        $modal.height(10000);
        $modal.width(10000);
        $modal.css({"top": top, "left": left});

        ModalHelper.repositionModalOnWinResize(modalSpecs, windowSpecs);
        expect($modal.css("top")).to.equal("0px");
        expect($modal.css("left")).to.equal(curWinWidth - 10000 + "px");

        $modal.remove();
    });

    it("xcHelper.hasValidColPrefix should work", function() {
        var func = xcHelper.hasValidColPrefix;
        expect(func(gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix)).to.equal(false);
        expect(func('\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func('a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(',a\\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix+ 'blah,   \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, a' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, \\' + gColPrefix + 'blah')).to.equal(false);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl,ah')).to.equal(false);

        expect(func(gColPrefix + 'blah blah')).to.equal(true); // allow column names with spaces
        expect(func(gColPrefix + 'blah' + gColPrefix + 'blah')).to.equal(true); // allow column name to have $ in middle of name
        expect(func(gColPrefix + 'a')).to.equal(true);
        expect(func(gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah,   ' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + '\\' + gColPrefix + 'blah')).to.equal(true);
        expect(func(gColPrefix + 'blah, ' + gColPrefix + 'bl\\,ah, ' + gColPrefix + 'blah')).to.equal(true);

    });

    it("xcHelper.getPrefixColName should work", function() {
        // case 1
        var res = xcHelper.getPrefixColName(null, "test");
        expect(res).to.equal("test");
        // case 2
        res = xcHelper.getPrefixColName("", "test");
        expect(res).to.equal("test");
        // case 3
        res = xcHelper.getPrefixColName("prefix", "test");
        expect(res).to.equal("prefix::test");
    });

    it("xcHelper.parsePrefixColName should work", function() {
        // case 1
        var res = xcHelper.parsePrefixColName("test");
        expect(res).to.be.an("object");
        expect(res).to.have.property("prefix").to.equal("");
        expect(res).to.have.property("name").to.equal("test");

        // case 2
        res = xcHelper.parsePrefixColName("prefix::test");

        expect(res.prefix).to.equal("prefix");
        expect(res.name).to.equal("test");
    });

    it("xcHelper.stripPrefixInColName should work", function() {
        // case 1
        var res = xcHelper.stripPrefixInColName("a::b");
        expect(res).to.equal("a-b");
        // case 2
        res = xcHelper.stripPrefixInColName("ab");
        expect(res).to.equal("ab");
    });

    it("xcHelper.convertPrefixName should work", function() {
        // case 1
        var res = xcHelper.convertPrefixName("a", "b");
        expect(res).to.equal("a-b");
    });

    it("xcHelper.normalizePrefix should work", function() {
        // case 1
        var res = xcHelper.normalizePrefix("abc");
        expect(res).to.equal("abc");
        // case 2
        res = xcHelper.normalizePrefix(new Array(32).join("a"));
        expect(res.length).to.equal(gPrefixLimit);
        // case 3
        res = xcHelper.normalizePrefix("a:b");
        expect(res).to.equal("a_b");
        // case 4
        res = xcHelper.normalizePrefix("a-b");
        expect(res).to.equal("a_b");
    });

    it("xcHelper.getColNameList should work", function() {
        var progCol1 = ColManager.newCol({
            "backName": "Test",
            "name": "undfCol",
            "isNewCol": false
        });

        var progCol2 = ColManager.newCol({
            "backName": "test2",
            "name": "stringCol",
            "isNewCol": false
        });

        var progCol3 = ColManager.newCol({
            "backName": "",
            "name": "",
            "isNewCol": false
        });

        var progCol4 = ColManager.newDATACol();

        gTables["xc-Test"] = new TableMeta({
            "tableId": "xc-Test",
            "tableName": "test",
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });
        let table = gTables["xc-Test"];
        var colNameList = table.getColNameList();
        expect(colNameList.length).to.equal(2);
        expect(colNameList[0]).to.equal("Test");
        expect(colNameList[1]).to.equal("test2");

        delete gTables["xc-Test"];
    });

    it("xcHelper.getPromiseWhenError should work", function() {
        // case 1
        var args = [{"error": "test1"}, "test"];
        var res = xcHelper.getPromiseWhenError(args);
        expect(res.error).to.equal("test1");

        // case 2
        args = ["test", {"error": "test2"}];
        res = xcHelper.getPromiseWhenError(args);
        expect(res.error).to.equal("test2");

        // case 3
        args = ["test", "test"];
        res = xcHelper.getPromiseWhenError(args);
        expect(res).to.be.null;
    });

    it("xcHelper.addAggInputEvents should work", function() {
        var $input = $('<input val="">');
        $('body').append($input);

        BaseOpPanel.addAggInputEvents($input);
        // XXX FIXME: when window defocus this test will fail
        // $input.focus();
        // expect($input.val()).to.equal(gAggVarPrefix);
        $input.blur();
        expect($input.val()).to.equal("");
        $input.val("^abc").trigger(fakeEvent.enterKeydown);
        expect($input.val()).to.equal("^abc");
        $input.val("test").trigger(fakeEvent.input);
        expect($input.val()).to.equal("^test");

        $input.remove();
    });

    describe("xcHelper.getKeyInfos", function() {
        it("xcHelper.getKeyInfos on regular table should work", function(done) {
            var table = new TableMeta({
                "tableId": "fakeId",
                "tableName": "test#fakeId"
            });
            table.backTableMeta = {
                valueAttrs: [{
                    name: "prefix",
                    type: DfFieldTypeT.DfFatptr
                }, {
                    name: "col",
                    type: DfFieldTypeT.DfString
                }, {
                    name: "test",
                    type: DfFieldTypeT.DfFloat64
                }, {
                    name: "prefix-test",
                    type: DfFieldTypeT.DfFloat64
                }]
            };
            gTables["fakeId"] = table;

            var keys = [{
                name: "col",
                ordering: 0
            }, {
                name: "prefix::a",
                ordering: 0,
            }, {
                name: "prefix::col",
                ordering: 0,
            }, {
                name: "prefix::test",
                ordering: 0
            }];

            var expectedArray = [{
                name: "col",
                type: DfFieldTypeT.DfString,
                keyFieldName: "col",
                ordering: 0
            }, {
                name: "prefix::a",
                type: DfFieldTypeT.DfUnknown,
                keyFieldName: "a",
                ordering: 0
            }, {
                name: "prefix::col",
                type: DfFieldTypeT.DfUnknown,
                keyFieldName: "prefix-col",
                ordering: 0
            }];

            xcHelper.getKeyInfos(keys, "test#fakeId")
            .then(function(keyArray) {
                expect(keyArray).to.be.an("array");
                expect(keyArray.length).to.equal(4);

                expectedArray.forEach(function(expected, index) {
                    var keyRes = keyArray[index];
                    expect(keyRes.name).to.equal(expected.name);
                    expect(keyRes.type).to.equal(expected.type);
                    expect(keyRes.keyFieldName).to.equal(expected.keyFieldName);
                });

                var specialRes = keyArray[3];
                expect(specialRes.keyFieldName).not.to.equal("prefix-test");
                expect(specialRes.keyFieldName).to.contains("prefix-test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                delete gTables["fakeId"];
            });
        });

        it("xcHelper.getKeyInfos on missing table meta should work", function(done) {
            var oldFunc = XIApi.getTableMeta;
            XIApi.getTableMeta = function() {
                return PromiseHelper.resolve({
                    valueAttrs: [{
                        name: "col",
                        type: DfFieldTypeT.DfString
                    }]
                });
            };

            xcHelper.getKeyInfos([{name: "col", ordering: 3}], "test#fakeId")
            .then(function(res) {
                expect(res.length).to.equal(1);
                expect(res[0].type).to.equal(DfFieldTypeT.DfString);
                expect(res[0].keyFieldName).to.equal("col");
                expect(res[0].ordering).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.getTableMeta = oldFunc;
            });
        });

        it("xcHelper.getKeyInfos on missing table meta should work case2", function(done) {
            var oldFunc = XIApi.getTableMeta;
            XIApi.getTableMeta = function() {
                return PromiseHelper.reject();
            };

            xcHelper.getKeyInfos([{name: "col", ordering: 5}], "test#fakeId")
            .then(function(res) {
                expect(res.length).to.equal(1);
                expect(res[0].type).to.equal(DfFieldTypeT.DfUnknown);
                expect(res[0].keyFieldName).to.equal("col");
                expect(res[0].ordering).to.equal(5);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.getTableMeta = oldFunc;
            });
        });
    });

    it("xcHelper.formatAsUrl should work", function() {
        var res = xcHelper.formatAsUrl({"a": 1, "b": "c"});
        expect(res).to.equal("?a=1&b=c");
    });

    describe("MenuHelper.dropdownOpen", function() {
        describe("Basic Test", function() {
            var $icon, $menu;

            before(function() {
                $icon = $('<div id="unitTestIcon">Icon</div>');
                $menu = $('<div id="unitTestMenu">Menu</div>');
                $("body").append($icon)
                        .append($menu);
            });

            beforeEach(function() {
                $menu.hide();
            });

            it("Should open the menu", function() {
                MenuHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
            });

            it("Should toggle the menu", function() {
                MenuHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
                // toggle the menu
                MenuHelper.dropdownOpen($icon, $menu, {
                    "toggle": true
                });
                assert.isFalse($menu.is(":visible"));
            });

            it("Should close the menu with toClose option", function() {
                MenuHelper.dropdownOpen($icon, $menu);
                assert.isTrue($menu.is(":visible"));
                // toggle the menu
                MenuHelper.dropdownOpen($icon, $menu, {
                    "toClose": function() { return false; }
                });
                assert.isTrue($menu.is(":visible"));

                MenuHelper.dropdownOpen($icon, $menu, {
                    "toClose": function() { return true; }
                });
                assert.isFalse($menu.is(":visible"));
            });

            after(function() {
                $icon.remove();
                $menu.remove();
            });
        });

        describe("hasMixedCells test", function() {
            var tableId = "ZZ1";
            var $table;

            before(function() {
                var progCol1 = new ProgCol({
                    "name": "testCol",
                    "backName": "testCol",
                    "isNewCol": false,
                    "type": "mixed",
                    "func": {
                        "name": "pull"
                    }
                });

                var progCol2 = new ProgCol({
                    "name": "DATA",
                    "backName": "DATA",
                    "isNewCol": false,
                    "func": {
                        "name": "raw"
                    }
                });
                var table = new TableMeta({
                    "tableName": "unitTest#ZZ1",
                    "tableId": tableId,
                    "tableCols": [progCol1, progCol2],
                    "isLocked": false
                });

                gTables[tableId] = table;

                var html = '<table id="xcTable-ZZ1">'+
                                '<tr class="row0">' +
                                    '<td class="col1"><div>3</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":3}</div></td>' +
                                '</tr>' +
                                '<tr class="row1">' +
                                    '<td class="col1"><div class="undefined">FNF</div></td>' +
                                    '<td class="col2"><div class="originalData">{"a":"b"}</div></td>' +
                                '</tr>' +
                                '<tr class="row2">' +
                                    '<td class="col1"><div>4</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":4}</div></td>' +
                                '</tr>' +
                                '<tr class="row3">' +
                                    '<td class="col1"><div>{"key":"val"}</div></td>' +
                                    '<td class="col2"><div class="originalData">{"testCol":{"key":"val"}}</div></td>' +
                                '</tr>' +
                            +'<table>';
                $("#container").append(html);
                $table = $("#xcTable-ZZ1");
            });

            it("hasMixedCells() should work", function() {
                var fn = MenuHelper.isInvalidMixed;
                var hightlightBox = '<div class="highlightBox"></div>';
                expect($table.length).to.equal(1);
                expect($table.find("td").length).to.equal(8);

                var cells = [];
                cells.push({
                    isMixed: true,
                    isUndefined: true,
                    type: "undefined"
                });

                $table.find("td").eq(2).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.false;

                cells.push({isMixed: true, type: "integer"});

                $table.find("td").eq(0).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.false;

                cells.shift();
                cells.push({isMixed: true, type: "integer"});
                $table.find("td").eq(2).find(".highlightBox").remove();
                $table.find("td").eq(4).append(hightlightBox);
                console.log(cells);
                expect(fn("mixed", cells)).to.be.false;

                cells = [];
                cells.push({isMixed: true, type: "object"});
                $table.find("td").eq(6).append(hightlightBox);
                expect(fn("mixed", cells)).to.be.true;

                $table.find(".highlightBox").remove();

            });
            after(function() {
                $table.remove();
                delete gTables[tableId];
            });
        });

        describe("toggle json options test", function() {
            var tableId;
            var $table;

            before(function() {
                UnitTest.onMinMode();
                tableId = xcHelper.randName("test");
                let tableCols = [];
                tableCols.push(ColManager.newPullCol("col1", "col1", ColumnType.mixed));
                tableCols.push(ColManager.newDATACol());
                gTables[tableId] = new TableMeta({
                    tableId: tableId,
                    tableName: "test#" + tableId,
                    tableCols: tableCols
                });
                var fakeHTML = '<table id="xcTable-' + tableId + '" class="xcTable">' +
                                    '<tr class="row0">' +
                                        '<td class="col11">' +
                                            '<div class="originalData"></div>' +
                                        '<td>' +
                                    '</tr>' +
                                '</table>';
                $table = $(fakeHTML);
                $("#container").append($table);
            });

            it ("toggleUnnestandJsonOptions should work", function() {
                var fn = MenuHelper.toggleUnnestandJsonOptions;
                var $menu = $("#cellMenu");
                var $unnestLi = $menu.find(".tdUnnest");
                var $jsonModalLi = $menu.find(".tdJsonModal");
                var $div = $table.find(".row0 .col11 .originalData");
                var multiCell = false;
                var notAllowed = $div.find(".null, .blank").length;
                var columnType = ColumnType.mixed;
                var options = {rowNum: 1, colNum: 1};

                // initial state
                expect($unnestLi.length).to.equal(1);
                expect($jsonModalLi.length).to.equal(1);

                $div.html("string");
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.html('{"a":"b"}');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                // test notAllowed, multiCell, and undefined with object val

                notAllowed = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                notAllowed = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                multiCell = true;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                multiCell = false;
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.find(".undefined").remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                notAllowed = true;
                multiCell = true;
                $div.append('<div class="undefined"></div>');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                notAllowed = false;
                multiCell = false;
                $div.find(".undefined").remove();
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;


                // test array
                $div.html('["a","b"]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.false;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;

                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.true;

                $div.parent().addClass("truncated");
                $div.html('["a", invalid]');
                fn($menu, $div, columnType, multiCell, notAllowed, options, tableId);
                expect($unnestLi.hasClass("hidden")).to.be.true;
                expect($jsonModalLi.hasClass("hidden")).to.be.false;
                $div.parent().removeClass("truncated");
            });

            after(function() {
                $table.remove();
                delete gTables[tableId];
                UnitTest.offMinMode();
            });
        });
    });


    it("xcHelper.roundToSignificantFigure should work", function() {
        expect(xcHelper.roundToSignificantFigure(1234, 5, 100, 1))
        .to.equal(1000);
    });

    it("setURLParam should work", function() {
        var curHref = window.location.href;
        var res = xcHelper.setURLParam("xyz", "abc");
        expect(res.indexOf("xyz=abc")).to.equal(curHref.length + 1);
    });


    it("deleteURLParam should work", function() {
        var curHref = window.location.href;
        expect(curHref.indexOf("project")).to.be.gt(-1);
        var res = xcHelper.deleteURLParam("project");
        expect(res.indexOf("project=")).to.equal(-1);
    });

    // XXX now located in extensionApi_Operations.js
    // describe("xcHelper.createJoinedColumns", () => {
    //     let createJoinedColumns;
    //     const tableId = 'a';
    //     const tableName = 'testTable#' + tableId;

    //     before(() => {
    //         createJoinedColumns = xcHelper.createJoinedColumns;

    //         const progCols = []
    //         progCols.push(ColManager.newPullCol('a'));
    //         progCols.push(ColManager.newPullCol('prefix::b'));
    //         progCols.push(ColManager.newDATACol());
    //         let table = new TableMeta({
    //             tableId: tableId,
    //             tableName: tableName,
    //             tableCols: progCols
    //         });

    //         gTables[tableId] = table;
    //     });

    //     it('should return DATA col only when no table meta', () => {
    //         const cols = createJoinedColumns('a', 'b', [], [], [], []);
    //         expect(cols.length).to.equal(1);
    //         expect(cols[0].backName).to.equal("DATA");
    //     });

    //     it('should return all cols when no pulled cols specified', () => {
    //         const cols = createJoinedColumns(tableName, 'b', null, [], [], []);
    //         expect(cols.length).to.equal(3);
    //         expect(cols[0].backName).to.equal("a");
    //         expect(cols[1].backName).to.equal("prefix::b");
    //         expect(cols[2].backName).to.equal("DATA");
    //     });

    //     it('should return cols and replace name', () => {
    //         const lPulledColNames = ['a', 'prefix::b'];
    //         const lRenames = [{
    //             type: ColumnType.integer,
    //             orig: 'a',
    //             new: 'newA'
    //         }, {
    //             type: DfFieldTypeT.DfFatptr,
    //             orig: 'prefix',
    //             new: 'newPrefix'
    //         }];
    //         const cols = createJoinedColumns(tableName, 'b',
    //             lPulledColNames, [], lRenames, []);
    //         expect(cols.length).to.equal(3);
    //         expect(cols[0].backName).to.equal("newA");
    //         expect(cols[1].backName).to.equal("newPrefix::b");
    //         expect(cols[2].backName).to.equal("DATA");
    //     });

    //     after(() => {
    //         delete gTables[tableId];
    //     });
    // });

    describe("xcHelper.createGroupByColumns", () => {
        const tableId = 'a'
        const tableName = 'testTable#' + tableId;
        let createGroupByColumns;

        before(() => {
            createGroupByColumns = xcHelper.createGroupByColumns;
            const table = new TableMeta({
                tableId: tableId,
                tableName: tableName,
                tableCols: [ColManager.newPullCol('colA'), ColManager.newDATACol()]
            });
            gTables[tableId] = table;
        });

        it('should handle normal case', () => {
            const groupByCols = ['groupByCol'];
            const aggArgs = [{ newColName: 'aggCol' }];
            const newProgCols = createGroupByColumns(
            'test#c', groupByCols, aggArgs, null);
            expect(newProgCols.length).to.equal(3);
            expect(newProgCols[0].backName).to.equal('aggCol');
            expect(newProgCols[1].backName).to.equal('groupByCol');
            expect(newProgCols[2].backName).to.equal('DATA');
        });

        it('should handle include sample column case', () => {
            const groupByCols = ['colA'];
            const aggArgs = [{ newColName: 'aggCol' }];
            const newProgCols = createGroupByColumns(
            tableName, groupByCols, aggArgs, [0])
            expect(newProgCols[0].backName).to.equal('aggCol');
            expect(newProgCols[1].backName).to.equal('colA');
            expect(newProgCols[2].backName).to.equal('DATA');
        });

        after(() => {
            delete gTables[tableId];
        });
    });

    it("xcHelper.zip should work", function() {
        // case 1
        var res = xcHelper.zip([1, 2, 3], ["a", "b", "c"]);
        expect(res).to.eql([[1,"a"],[2, "b"],[3, "c"]]);

        // case 2
        res = xcHelper.zip();
        expect(res).to.eql([]);
    });

    it("xcHelper.readFile should work", function(done) {
        let oldFileReader = FileReader;
        FileReader = function() {
            this.readAsBinaryString = (file) => this.onload({
                target: {
                    result: file
                }
            });
            return this;
        };

        xcHelper.readFile("test")
        .then(function(res) {
            expect(res).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            FileReader = oldFileReader;
        });
    });

    it("xcHelper.readFile reject invalid case", function(done) {
        xcHelper.readFile(null)
        .then(function() {
            done("fail");
        })
        .fail(function(res) {
            expect(res).to.be.undefined;
            done();
        });
    });

    it("xcHelper.readFile should handle error case", function(done) {
        let oldFileReader = FileReader;
        FileReader = function() {
            this.readAsBinaryString = (file) => this.onloadend({
                target: {
                    error: "testError"
                }
            });
            return this;
        };

        xcHelper.readFile("test")
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("testError");
            done();
        })
        .always(function() {
            FileReader = oldFileReader;
        });
    });

    it("xcHelper.calculateSkew should work", function() {
        var tests = [{
            "rows": [0, 100],
            "expect": 100
        }, {
            "rows": [0, 1],
            "expect": 0
        }, {
            "rows": [100],
            "expect": 0
        }, {
            "rows": [0, 0, 100],
            "expect": 100
        }, {
            "rows": [10, 10, 10],
            "expect": 0
        }, {
            "rows": [36, 46, 47],
            "expect": 8
        }];

        tests.forEach(function(test) {
            let skew = xcHelper.calculateSkew(test.rows);
            if (skew !== test.expect) {
                console.error("test fail", JSON.stringify(test));
            }
            expect(skew).to.equal(test.expect);
        });
    });

    describe("xcHelper.addNodeLineageToQueryComment test", function() {
        it("xcHelper.addNodeLineageToQueryComment should ingore delete query", function() {
            // arrange
            const query = {
                operation: XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]
            };
            const parentNodeInfos = [{nodeId: "a0", tabId: "tabA0"}];
            const currentNodeInfo = {nodeId: "b0", tabId: "tabB0"};
            // act
            const res = xcHelper.addNodeLineageToQueryComment(query, parentNodeInfos, currentNodeInfo);
            // assert
            expect(res).to.deep.equal(query);
        });

        it("xcHelper.addNodeLineageToQueryComment should return intial query when has error", function() {
            // arrange
            const query = {
                operation: "filter",
                comment: JSON.stringify({graph_node_locator: []})
            };
            // act
            const res = xcHelper.addNodeLineageToQueryComment(query, null, null);
            // assert
            expect(res).to.deep.equal(query);
        });

        it("xcHelper.addNodeLineageToQueryComment should append lineage info to comment", function() {
            // arrange
            const query = {
                operation: "filter",
                comment: JSON.stringify({graph_node_locator: [{nodeId: "c2", tabId: "tabC2"}]})
            };

            const parentNodeInfos = [{nodeId: "a2", tabId: "tabA2"}];
            const currentNodeInfo = {nodeId: "b2", tabId: "tabB2"};
            // act
            const res = xcHelper.addNodeLineageToQueryComment(query, parentNodeInfos, currentNodeInfo);
            // assert
            expect(res).to.deep.equal({
                operation: "filter",
                comment: JSON.stringify({graph_node_locator: [
                    {nodeId: "a2", tabId: "tabA2"},
                    {nodeId: "b2", tabId: "tabB2"},
                    {nodeId: "c2", tabId: "tabC2"}
                ]})
            });
        });
    });

    it("xcHelper.getBasicColTypes should work", function() {
        expect(xcHelper.getBasicColTypes(false).length).to.equal(6);
        expect(xcHelper.getBasicColTypes(true).length).to.equal(7);
        expect(xcHelper.getBasicColTypes(true)).to.includes(ColumnType.mixed);
    });

    after(function() {
        StatusBox.forceHide();
    });
});

