describe("xcSuggest", function() {
    describe("Suggest Join Key Test", function() {
        it("contextCheck should work", function() {
            var contextCheck = xcSuggest.__testOnly__.contextCheck;
            function contextEq(context1, context2) {
                var maxEq = (context1.max === context2.max);
                var minEq = (context1.min === context2.min);
                var avgEq = (context1.avg === context2.avg);
                var sig2Eq = (context1.sig2 === context2.sig2);
                var valLenEq = (context1.vals.length === context2.vals.length);
                var valsEq = valLenEq;
                if (valsEq) {
                    for (var i = 0; i < context1.vals.length; i++) {
                        // Won't work for objects
                        if (context1.vals[i] !== context2.vals[i]) {
                            valsEq = false;
                            break;
                        }
                    }

                }
                return (maxEq && minEq && avgEq &&
                        sig2Eq && valLenEq && valsEq);
            }

            var nullContext = {
                "max": 0,
                "min": 0,
                "avg": 0,
                "sig2": 0,
                "vals": []
            };

            // ContextCheck takes requiredInfo, uses RI.type and RI.data
            var emptyArrayIntRI = {
                "type": ColumnType.integer,
                "data": []
            };
            var emptyArrayIntCX = contextCheck(emptyArrayIntRI);

            var zeroIntRI = {
                "type": ColumnType.integer,
                "data": ["0"]
            };
            var zeroIntCX = contextCheck(zeroIntRI);

            var singletonNonZeroIntRI = {
                "type": ColumnType.integer,
                "data": ["1"]
            };
            var singletonNonZeroIntCX = contextCheck(singletonNonZeroIntRI);

            var nonZeroIntRI = {
                "type": ColumnType.integer,
                "data": ["1", "2"]
            };
            var nonZeroIntCX = contextCheck(nonZeroIntRI);

            var nonZeroAltIntRI = {
                "type": ColumnType.integer,
                "data": ["1", "3"]
            };

            var nonZeroAltIntCX = contextCheck(nonZeroAltIntRI);

            var mixedNullIntRI = {
                "type": ColumnType.integer,
                "data": ["1", null, "2"]
            };
            var mixedNullIntCX = contextCheck(mixedNullIntRI);


            var emptyArrayStringRI = {
                "type": ColumnType.string,
                "data": []
            };
            var emptyArrayStringCX = contextCheck(emptyArrayStringRI);


            var emptyStringRI = {
                "type": ColumnType.string,
                "data": [""]
            };
            var emptyStringCX = contextCheck(emptyStringRI);


            var nonEmptySingletonStringRI = {
                "type": ColumnType.string,
                "data": ["a"]
            };
            var nonEmptySingletonStringCX = contextCheck(nonEmptySingletonStringRI);


            var nonEmptyStringRI = {
                "type": ColumnType.string,
                "data": ["a", "b"]
            };
            var nonEmptyStringCX = contextCheck(nonEmptyStringRI);


            var diffLenStringRI = {
                "type": ColumnType.string,
                "data": ["a", "bcdefghij"]
            };
            var diffLenStringCX = contextCheck(diffLenStringRI);


            var mixedEmptyStringRI = {
                "type": ColumnType.string,
                "data": ["a", "", "b"]
            };
            var mixedEmptyStringCX = contextCheck(mixedEmptyStringRI);


            var invalidTypeRI = {
                "type": ColumnType.object,
                "data": []
            };
            var invalidTypeCX = contextCheck(invalidTypeRI);

            expect(contextEq(emptyArrayIntCX, nullContext)).to.be.true;
            expect(contextEq(zeroIntCX, nullContext)).to.be.false;
            expect(contextEq(singletonNonZeroIntCX, zeroIntCX)).to.be.false;
            expect(contextEq(singletonNonZeroIntCX, nonZeroIntCX)).to.be.false;
            expect(contextEq(nonZeroAltIntCX, nonZeroIntCX)).to.be.false;
            // Should skip null entries
            expect(contextEq(mixedNullIntCX, nonZeroIntCX)).to.be.true;

            expect(contextEq(emptyArrayStringCX, nullContext)).to.be.true;
            expect(contextEq(emptyStringCX, nullContext)).to.be.true;
            expect(contextEq(nonEmptySingletonStringCX, nullContext)).to.be.false;
            expect(contextEq(nonEmptySingletonStringCX, nonEmptyStringCX)).to.be.false;
            expect(contextEq(diffLenStringCX, nonEmptyStringCX)).to.be.false;
            // Should skip null entries
            expect(contextEq(mixedEmptyStringCX, nonEmptyStringCX)).to.be.true;

            // Invalid type
            expect(contextEq(invalidTypeCX, nullContext)).to.be.true;
        });

        it("getScore should work", function() {
            var getScore = xcSuggest.__testOnly__.getScore;
            // case 1
            var feature = {
                "type": "string",
                "match": 1,
                "maxDiff": 2,
                "minDiff": 3,
                "avgDiff": 4,
                "sig2Diff": 5,
                "titleDist": 6
            };
            expect(getScore(feature)).to.equal(-77);
            // case 2
            feature = {
                "maxDiff": 2,
                "minDiff": 3,
                "avgDiff": 4,
                "sig2Diff": 5,
                "titleDist": 6
            };
            expect(getScore(feature)).to.equal(-286);
        });

        it("calcSim should work", function() {
            var calcSim = xcSuggest.__testOnly__.calcSim;
            // case 1
            var res = calcSim(0, 0);
            expect(res).to.equal(0);
            // case 2
            res = calcSim(1, -1);
            expect(res).to.equal(1);
            // case 3
            res = calcSim(2, 3);
            expect(res).to.equal(0.2);
            // case 4
            res = calcSim(3, 2);
            expect(res).to.equal(0.2);
        });

        it("getTitleDistance should work", function() {
            var getTitleDistance = xcSuggest.__testOnly__.getTitleDistance;
            // case 1
            var res = getTitleDistance("columnAG", "test");
            expect(res).to.equal(0);

            // case 2
            res = getTitleDistance("test", "test");
            expect(res).to.equal(0);

            // case 3 (not prefix or case sensitive)
            res = getTitleDistance("prefix::test", "TEST");
            expect(res).to.equal(0);

            // case 4
            res = getTitleDistance("start_test", "start");
            expect(res).to.equal(2);

            // case 5
            res = getTitleDistance("start", "start_test");
            expect(res).to.equal(2);

            // case 6
            res = getTitleDistance("long_string", "string");
            expect(res).to.equal(5);

            // case 7
            res = getTitleDistance("string", "long_string");
            expect(res).to.equal(5);
        });

        it("suggestJoinKey should work", function() {
            var emptyColInfoNum = {
                "type": ColumnType.integer,
                "name": "",
                "data": [""]
            };

            var emptyColInfoTitleNum = {
                "type": ColumnType.integer,
                "name": "numcol1",
                "data": [""]
            };

            var singletonColInfoNum = {
                "type": ColumnType.integer,
                "name": "numcol2",
                "data": ["0"]
            };

            var colInfoNum = {
                "type": ColumnType.integer,
                "name": "numcol3",
                "data": ["0", "1"]
            };

            var colHasEmptyInfoNum = {
                "type": ColumnType.integer,
                "name": "numcol4",
                "data": ["0", "", "1"]
            };

            var colHasEmptyDisorderInfoNum = {
                "type": ColumnType.integer,
                "name": "numcol5",
                "data": ["1", "", "0"]
            };

            var colHasNullDisorderInfoNum = {
                "type": ColumnType.integer,
                "name": "numcol6",
                "data": ["1", null, "0"]
            };

            var emptyColInfoStr = {
                "type": ColumnType.string,
                "name": "",
                "data": [""]
            };

            var emptyColInfoTitleStr = {
                "type": ColumnType.string,
                "name": "strcol1",
                "data": [""]
            };

            var singletonColInfoStr = {
                "type": ColumnType.string,
                "name": "strcol2",
                "data": ["0"]
            };

            var colInfoStr = {
                "type": ColumnType.string,
                "name": "strcol3",
                "data": ["0", "1"]
            };

            var colHasEmptyInfoStr = {
                "type": ColumnType.string,
                "name": "strcol4",
                "data": ["0", "", "1"]
            };

            var colHasEmptyDisorderInfoStr = {
                "type": ColumnType.string,
                "name": "strcol5",
                "data": ["1", "", "0"]
            };

            var colHasNullDisorderInfoStr = {
                "type": ColumnType.string,
                "name": "strcol6",
                "data": ["1", null, "0"]
            };

            var singletonColInfoChaStr = {
                "type": ColumnType.string,
                "name": "chastrcol2",
                "data": ["a"]
            };

            var colInfoChaStr = {
                "type": ColumnType.string,
                "name": "chastrcol3",
                "data": ["a", "b"]
            };

            var colHasEmptyInfoChaStr = {
                "type": ColumnType.string,
                "name": "chastrcol4",
                "data": ["a", "", "b"]
            };

            var colHasEmptyDisorderInfoChaStr = {
                "type": ColumnType.string,
                "name": "chastrcol5",
                "data": ["b", "", "a"]
            };

            var colHasNullDisorderInfoChaStr = {
                "type": ColumnType.string,
                "name": "chastrcol6",
                "data": ["b", null, "a"]
            };

            // TODO: double check that is format that obj strings
            // come in as
            var colInfoObject = {
                "type": ColumnType.object,
                "name": "objcol1",
                "data": ["{hehe: hoho}"]
            };

            function mkIn(srcCol, destCols) {
                function infoDeepCpy(colInfo) {
                    var retObj = {
                        "type": colInfo.type,
                        "name": colInfo.name,
                        "data": colInfo.data
                    };
                    return retObj;
                }
                var srcInfo = infoDeepCpy(srcCol);
                srcInfo.uniqueIdentifier = -1;
                var destInfos = [];
                for (i = 0; i < destCols.length; i++) {
                    destInfos.push(infoDeepCpy(destCols[i]));
                    destInfos[i].uniqueIdentifier = i;
                }
                return {"srcColInfo": srcInfo, "destColsInfo": destInfos};
            }

            // Check against empty dest table.
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoTitleNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoTitleStr,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[])).colToSugg)
            .to.be.null;


            // Check that types must match
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[emptyColInfoNum])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[emptyColInfoStr])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[colInfoObject])).colToSugg)
            .to.be.null;

            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[emptyColInfoStr])).colToSugg)
            .to.be.equal(0); // ML Fails this
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[emptyColInfoNum])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[colInfoObject])).colToSugg)
            .to.be.null;

            // Check basic similarity and that empty elements don't cause regression
            // (Bug 6784)
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[singletonColInfoNum])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasEmptyInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasEmptyDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasNullDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoNum,[
                singletonColInfoNum,
                colHasEmptyDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoNum,[
                singletonColInfoNum,
                colHasNullDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(1);

            ///// BEGIN ML FAIL BLOCK /////
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[singletonColInfoStr])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasEmptyInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasEmptyDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasNullDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoStr,[
                singletonColInfoStr,
                colHasEmptyDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoStr,[
                singletonColInfoStr,
                colHasNullDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(1);

            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[singletonColInfoChaStr])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasNullDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoChaStr,[
                singletonColInfoChaStr,
                colHasNullDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(1);
            ///// END ML FAIL BLOCK /////

            // Multitype tests
            expect(xcSuggest.suggestJoinKey(mkIn(colInfoNum,[
                colHasEmptyDisorderInfoNum,
                colInfoStr,
                colInfoChaStr,
                colHasNullDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
        });
    });

    describe("Join Key Data Submission Test", function() {
        it("should check suggest data match", function() {
            checkSuggestDataPortionsMatch = xcSuggest.__testOnly__.checkSuggestDataPortionsMatch;
            var tests = [{
                "input": null,
                "expect": false
            }, {
                "input": {"features": [], "labels": null},
                "expect": false
            }, {
                "input": {"features": [], "labels": [1, 2]},
                "expect": false
            }, {
                "input": {"features": [1, 1], "labels": [1, 1]},
                "expect": false
            }, {
                "input": {"features": [1], "labels": [2]},
                "expect": false
            }, {
                "input": {"features": [1], "labels": [1]},
                "expect": true
            }, {
                "input": {"features": [1, 2], "labels": [1, 2]},
                "expect": true
            }];

            tests.forEach(function(test) {
                var res = checkSuggestDataPortionsMatch(test.input);
                expect(res).to.equal(test.expect);
            });
        });

        it("xcSuggest.processJoinKeyData", function() {
            /* sample
            {
                "features": [{
                    "avgDiff": 0.76,
                    "match": 0,
                    "maxDiff": 0.98,
                    "minDiff": 0.6,
                    "sig2Diff": 1,
                    "titleDist": 0,
                    "type": "integer",
                    "uniqueIdentifier": "prefix::test"
                }],
                "isValid": true,
                "labels": [1],
                "metaData": {
                    "srcColName": "prefix1::test1",
                    "timeOfJoin": "Wed Mar 29 2017 11:03:16 GMT-0700 (PDT)"
                }
            }
             */
            var curDestName = "prefix::test1";
            var joinKeyData = {
                "destColsInfo": [{
                    "data": ["1"],
                    "name": "count1",
                    "type": "integer",
                    "uniqueIdentifier": curDestName
                }],
                "srcColInfo": {
                    "data": ["8"],
                    "name": "count2",
                    "type": "integer",
                    "uniqueIdentifier": "prefix::test2"
                }
            };
            var res = xcSuggest.processJoinKeyData(joinKeyData, curDestName);
            expect(res).to.be.an("object");
            expect(res).to.have.property("features")
            .and.to.be.an("array");
            expect(res).to.have.property("isValid")
            .and.to.be.true;
            expect(res).to.have.property("labels")
            .and.to.be.an("array");
            expect(res).to.have.property("metaData")
            .and.to.be.an("object");

            expect(res.labels.length).to.equal(1);
            expect(res.labels[0]).to.equal(1);
            expect(res.metaData).to.have.property("srcColName")
            .and.to.equal("prefix::test2");
            expect(res.metaData).to.have.property("timeOfJoin")
            .and.to.be.a("string");
        });
    });

    describe("Preview Data Detection Test", function() {
        it("xcSuggest.detectFormat should work", function() {
            var tests = [{
                "data": ["[{\"test\"}"],
                "expect": DSFormat.JSON
            }, {
                "data": ["[", "{\"test\"}"],
                "expect": DSFormat.JSON
            }, {
                "data": ["{\"test\": \"val\"}"],
                "expect": DSFormat.SpecialJSON
            }, {
                "data": ["", "{\"test\": \"val\"}"],
                "expect": DSFormat.SpecialJSON
            }, {
                "data": ["abc"],
                "expect": DSFormat.CSV
            }];

            tests.forEach(function(test) {
                var rawRows = test.data;
                expect(xcSuggest.detectFormat(rawRows)).to.equal(test.expect);
            });
        });

        it("xcSuggest.detectLineDelimiter should work", function() {
            var tests = [{
                "data": "a\r\nb\r\nc\r\nd",
                "expect": "\r\n"
            }, {
                "data": "a\nb\nc\re",
                "expect": "\n"
            }, {
                "data": "a\rb\rc\r\nd",
                "expect": "\r"
            }, {
                "data": "a\r\nb\nc\rd",
                "expect": "\r\n"
            }, {
                "data": "a,b|c,d",
                "expect": ""
            }];

            tests.forEach(function(test) {
                var rawStr = test.data;
                expect(xcSuggest.detectLineDelimiter(rawStr, "\""))
                .to.equal(test.expect);
            });
        });

        it("xcSuggest.detectFieldDelimiter should work", function() {
            // Take two lines as sample since we now compute variance as score
            var tests = [{
                "data": "a,b,c,d\na,b,c,d",
                "expect": ","
            }, {
                "data": "a\tb\tc\te\na\tb\tc\td",
                "expect": "\t"
            }, {
                "data": "a,b,c\td\na,b,c|d",
                "expect": ","
            }, {
                "data": "a\tb\tc,d\na\tb\tc:d",
                "expect": "\t"
            }, {
                "data": "a\tb|c,d\na,b|c\td",
                "expect": ","
            }, {
                "data": "a|b|c,d\na|b|c.d",
                "expect": "|"
            }, {
                "data": "a:b:c,d\na:b-c:d",
                "expect": ":"
            }, {
                "data": "a;b;c,d\na.b;c;d",
                "expect": ";"
            }, {
                "data": "abcd\nabcd",
                "expect": ""
            }, {
                "data": "col1\tcol2\tcol3\tcol4\tcol5\n" +
                        "a\tb\tc\td\t,e\n" +
                        "1\t2\t3\t4\t5,6",
                "expect": "\t"
            }, {
                "data": "col1\tcol2\tcol3\tcol4\tcol5\n" +
                        "a\tb\tc\td\t,e\n" +
                        "1\t2\t3\t4\t|5,6",
                "expect": "\t"
            }, {
                "data": "col1,col2,col3,col4,col5\n" +
                        "a,b,c,d,e\n" +
                        "\"1,1\n1\",'2,2\n2',3,4,5\n" +
                        "h,i,\tj\t,k,\tl\n",
                "expect": ","
            }];

            tests.forEach(function(test) {
                var rawStr = test.data;
                var res = xcSuggest.detectFieldDelimiter(rawStr, "\n", "\"");
                expect(res).to.equal(test.expect);
            });
        });

        it("xcSuggest.detectHeader should work", function() {
            var tests = [{
                "data": [],
                "expect": false
            }, {
                "data": [["Col0"], ["Col1"]],
                "expect": false
            }, {
                "data": [["1", "2"], ["Col1", "Col2"]],
                "expect": false
            }, {
                "data": [["", "Col1"], ["1", "2"]],
                "expect": false
            }, {
                "data": [["Col1", "Col2"], ["1", "2"]],
                "expect": true
            }, {
                "data": [["Header1", "Header2"], ["a", "b"], ["a", "b"]],
                "expect": true
            }, {
                "data": [["a", "b"], ["a", "b"], ["a", "b"]],
                "expect": false
            }];

            tests.forEach(function(test) {
                var parsedRows = test.data;
                expect(xcSuggest.detectHeader(parsedRows))
                .to.equal(test.expect);
            });
        });
    });

    describe("Suggest Type Test", function() {
        it("xcSuggest.suggestType should work", function() {
            var tests = [{
                "datas": null,
                "type": ColumnType.integer,
                "expect": ColumnType.integer
            }, {
                "datas": null,
                "type": ColumnType.float,
                "expect": ColumnType.float
            }, {
                "datas": "1",
                "type": ColumnType.string,
                "expect": ColumnType.integer
            }, {
                "datas": ["1", null, ""],
                "type": ColumnType.string,
                "expect": ColumnType.integer
            }, {
                "datas": ["1.1", "2"],
                "type": ColumnType.string,
                "expect": ColumnType.float
            }, {
                "datas": null,
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["1", "a"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["1", "a"],
                "type": ColumnType.string,
                "confidentRate": 0.1,
                "expect": ColumnType.integer
            }, {
                "datas": ["t", "False"],
                "type": ColumnType.string,
                "confidentRate": 0.1,
                "expect": ColumnType.boolean
            }, {
                "data": ["CVX", "CVX", "BRK-A", "GOOG", "CSCO", "AAPL", "INTC", "INTC", "INTC", "DIS", "GE", "GE", "GE", "UTX", "UTX", "T", "WFC", "WFC"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["1", "0X123"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["1", "1e23"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["0123", "123"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }, {
                "datas": ["0.1", "1.0"],
                "type": ColumnType.string,
                "expect": ColumnType.float
            }, {
                "datas": ["-0.1", "-1.0"],
                "type": ColumnType.string,
                "expect": ColumnType.float
            }, {
                "datas": ["1.0"],
                "type": ColumnType.string,
                "expect": ColumnType.float
            }, {
                "datas": ["1970-01-01T00:00:00.000Z", "1993-10-01"],
                "type": ColumnType.string,
                "expect": ColumnType.timestamp
            }, {
                // 1993-10-1 is not ISO 8601
                "datas": ["1970-01-01T00:00:00.000Z", "1993-10-1"],
                "type": ColumnType.string,
                "expect": ColumnType.string
            }];

            tests.forEach(function(test) {
                var res = xcSuggest.suggestType(test.datas, test.type,
                                                test.confidentRate);
                expect(res).to.equal(test.expect);
            });
        });
    });
});
