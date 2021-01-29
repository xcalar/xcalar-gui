describe("Dataset-DSConfig Test", function() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var $previewCard;
    var $previewTable;
    var $previewWrap;
    var $form;
    var $formatText;

    var $fieldText;
    var $lineText;

    var $udfModuleList;
    var $udfFuncList;

    var $headerCheckBox; // promote header checkbox

    var $skipInput;
    var $quoteInput;

    var loadArgs;

    before(function() {
        $previewCard = $("#dsForm-config");
        $previewTable = $("#previewTable");
        $previewWrap = $("#dsPreviewWrap");
        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox

        $skipInput = $("#dsForm-skipRows");
        $quoteInput = $("#dsForm-quote");
        loadArgs = DSConfig.__testOnly__.get().loadArgs;

        UnitTest.onMinMode();
    });

    describe("Basic Preview Function Test", function() {
        it("parseTdHelper should work", function() {
            var parseTdHelper = DSConfig.__testOnly__.parseTdHelper;
            var testCases = [{
                // test1: when not th, has delimiter
                "delimiter": ",",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h' +
                                '</div>' +
                            '</td>' +
                            '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'i' +
                                '</div>' +
                            '</td>'
            },{
                // test2: when not th, no delimiter
                "delimiter": "",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    '<span class="td">h</span>' +
                                    '<span class="td has-margin has-comma">' +
                                        ',' +
                                    '</span>' +
                                    '<span class="td">i</span>' +
                                '</div>' +
                             '</td>'
            },{
                // test3: when not th, other delimiter
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h,i' +
                                '</div>' +
                            '</td>'
            },{
                // test4: when is th, has delimiter
                "delimiter": ",",
                "isTh": true,
                "data": ["h", ",", "i"],
                "expectRes": '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">h</div>' +
                                '</div>' +
                            '</th>' +
                            '<th>' +
                                '<div class="header">' +
                                    '<div class="colGrab"' +
                                    ' data-sizedtoheader="false"></div>' +
                                    '<div class="text cell">i</div>' +
                                '</div>' +
                            '</th>'
            },{
                // test5: when not th, delimiter ",", data has backslash
                "delimiter": "\t",
                "isTh": false,
                "data": ["h", "\\", ",", "i"],
                "expectRes": '<td class="cell">' +
                                '<div class="innerCell">' +
                                    'h\\,i' +
                                '</div>' +
                            '</td>'
            }];

            testCases.forEach(function(testCase) {
                var td = parseTdHelper(testCase.data, testCase.delimiter,
                                        testCase.isTh);
                expect(td).to.equal(testCase.expectRes);
            });
        });

        it("parseTdHelper should work for editable case", () => {
            const parseTdHelper = DSConfig.__testOnly__.parseTdHelper;
            const res = parseTdHelper('h, i', ',', true, true);
            expect(res).to.contains('editable');
        });

        it("getTbodyHTML() shoud work", function() {
            var getTbodyHTML = DSConfig.__testOnly__.getTbodyHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["t", "e", "s", "t"]],
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">' +
                                        '1' +
                                    '</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">t</span>' +
                                            '<span class="td">e</span>' +
                                            '<span class="td">s</span>' +
                                            '<span class="td">t</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            },{
                // test2: when has header
                "datas": [["t", "e", "s", "t"], ["h", "i"]],
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<tbody>' +
                                '<tr>' +
                                    '<td class="lineMarker">1</td>' +
                                    '<td class="cell">' +
                                        '<div class="innerCell">' +
                                            '<span class="td">h</span>' +
                                            '<span class="td">i</span>' +
                                        '</div>' +
                                    '</td>' +
                                '</tr>' +
                            '</tbody>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);
                var tbody = getTbodyHTML(testCase.datas, delimiter);
                expect(tbody).to.equal(testCase.expectRes);
            });

            DSConfig.__testOnly__.set();
        });

        it("getTheadHTML should work", function() {
            var getTheadHTML = DSConfig.__testOnly__.getTheadHTML;

            var testCases = [{
                // test1: when no header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": false,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="colGrab" data-sizedtoheader="false"></div>' +
                                            '<div class="text">column0</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            },{
                // test2: when has header
                "datas": [["h", "i"]],
                "tdLen": 2,
                "delimiter": "",
                "hasHeader": true,
                "expectRes": '<thead>' +
                                '<tr>' +
                                    '<th class="rowNumHead">' +
                                        '<div class="header"></div>' +
                                    '</th>' +
                                    '<th>' +
                                        '<div class="header">' +
                                            '<div class="text cell">' +
                                                '<span class="td">h</span>' +
                                                '<span class="td">i</span>' +
                                            '</div>' +
                                        '</div>' +
                                    '</th>' +
                                '</tr>' +
                              '</thead>'
            }];

            testCases.forEach(function(testCase) {
                var delimiter = testCase.delimiter;
                loadArgs.setHeader(testCase.hasHeader);
                loadArgs.setFieldDelim(delimiter);

                var tHead = getTheadHTML(testCase.datas, delimiter, testCase.tdLen);
                expect(tHead).to.equal(testCase.expectRes);
            });

            DSConfig.__testOnly__.set();
        });

        it("highlightHelper() should work", function() {
            var $cell = $('<div class="text cell">'+
                            '<span class="td">h</span>' +
                            '<span class="td">,</span>' +
                            '<span class="td">i</span>' +
                        '</div>');
            DSConfig.__testOnly__.highlightHelper($cell, ",");

            expect($cell.html()).to.equal('<span class="td">h</span>' +
                                '<span class="td highlight">,</span>' +
                                '<span class="td">i</span>');
        });

        it("getPreviewName() should work", function() {
            var getPreviewTableName = DSConfig.__testOnly__.getPreviewTableName;
            var res = getPreviewTableName("test");
            expect(res.indexOf("test-") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;

            res = getPreviewTableName();
            expect(res.indexOf("previewTable") > 0).to.be.true;
            expect(res.endsWith("-xcalar-preview")).to.be.true;
        });

        it("toggleHeader() should workh", function() {
            var data = "line1\nline2";
            var $checkbox = $headerCheckBox.find(".checkbox");
            var toggleHeader = DSConfig.__testOnly__.toggleHeader;

            loadArgs.reset();
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();
            // has 2 rows
            expect($previewTable.find("tbody tr").length).to.equal(2);

            // toggle to have header
            toggleHeader(true, true);
            expect($checkbox.hasClass("checked")).to.be.true;
            expect(loadArgs.useHeader()).to.be.true;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // toggle to remove header
            toggleHeader(false, true);
            expect($checkbox.hasClass("checked")).to.be.false;
            expect(loadArgs.useHeader()).to.be.false;
            // has 1 row
            expect($previewTable.find("tbody tr").length).to.equal(2);
        });

        it("getDataFromLoadUDF() should fail", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve("test");
            };

            DSConfig.__testOnly__.getDataFromLoadUDF()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal(DSTStr.NoParse);
                done();
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getDataFromLoadUDF() should work", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 0
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            DSConfig.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
            });
        });

        it("getDataFromLoadUDF() should work 2", function(done) {
            var oldMakeResultSet = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            var oldSetFree = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var oldFetch = XcalarFetchData;
            XcalarFetchData = function() {
                return PromiseHelper.resolve(['{"column10":"Opportunity Source"}']);
            };

            DSConfig.__testOnly__.getDataFromLoadUDF()
            .then(function(res) {
                expect(res).to.equal('[{"column10":"Opportunity Source"}]');
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetFree = oldSetFree;
                XcalarMakeResultSetFromDataset = oldMakeResultSet;
                XcalarFetchData = oldFetch;
            });
        });

        it("getURLToPreview should work", function(done) {
            var meta = DSConfig.__testOnly__.get();
            meta.loadArgs.set({
                targetName: gDefaultSharedRoot,
                files: [{
                    path: "/url",
                }]
            });
            DSConfig.__testOnly__.set(null, null);
            var oldList = XcalarListFiles;
            XcalarListFiles = function() {
                return PromiseHelper.resolve({
                    numFiles: 1,
                    files: [{
                        name: "test",
                        attr: {
                            isDirectory: false
                        }
                    }]
                });
            };

            DSConfig.__testOnly__.getURLToPreview()
            .then(function({sourceIndex, url}) {
                expect(sourceIndex).to.equal(0);
                expect(url).to.equal("/url/test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListFiles = oldList;
                DSConfig.__testOnly__.set(null, null);
            });
        });

        describe('invalidHeaderDetection Test', () => {
            let invalidHeaderDetection;
            let loadArgs;

            before(() => {
                invalidHeaderDetection = DSConfig.__testOnly__.invalidHeaderDetection;
                loadArgs = DSConfig.__testOnly__.get().loadArgs;
                loadArgs.setFormat("JSON");
            });


            it("invalidHeaderDetection should handle no header case", (done) => {
                invalidHeaderDetection(null)
                .then(() => {
                    assert.isFalse($("#alertModal").is(":visible"));
                    done();
                })
                .fail(() => {
                    done("fail");
                });
            });

            it("invalidHeaderDetection should handle invalid case", (done) => {
                const def = invalidHeaderDetection(["abc"]);
                UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol, {
                    confirm: true
                });
                def
                .then(() => {
                    assert.isFalse($("#alertModal").is(":visible"));
                    done();
                })
                .fail(() => {
                    done("fail");
                });
            });

            it("invalidHeaderDetection should handle invalid case 2", (done) => {
                const def = invalidHeaderDetection(["a.b"]);
                UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol);
                def
                .then(() => {
                    done("fail");
                })
                .fail(() => {
                    assert.isFalse($("#alertModal").is(":visible"));
                    done();
                });
            });

            it("invalidHeaderDetection should handle invalid case 3", (done) => {
                loadArgs.setFormat("CSV");
                const def = invalidHeaderDetection(["a.b"]);
                UnitTest.hasAlertWithTitle(DSTStr.DetectInvalidCol);
                def
                .then(() => {
                    done("fail");
                })
                .fail(() => {
                    assert.isFalse($("#alertModal").is(":visible"));
                    done();
                });
            });
        });

        it("changePreviewFile should work", function() {
            var oldPreviewSource = loadArgs.getPreviewingSource();
            loadArgs.setPreviewingSource(0, "test");
            DSConfig.__testOnly__.changePreviewFile(0, "test2");
            expect(loadArgs.getPreviewFile()).to.equal("test2");
            if (oldPreviewSource != null) {
                loadArgs.setPreviewingSource(oldPreviewSource.index, oldPreviewSource.file);
            }
        });

        it("getTerminationOptions should work", function() {
            var getTerminationOptions = DSConfig.__testOnly__.getTerminationOptions;
            var $btns = $form.find(".advanceSection .termOptions .radioButton");
            var tests = [{
                option: "stop",
                allowRecordErrors: false,
                allowFileErrors: false
            }, {
                option: "continue",
                allowRecordErrors: true,
                allowFileErrors: true
            }, {
                option: "stoprecord",
                allowRecordErrors: false,
                allowFileErrors: true
            }];

            tests.forEach(function(test) {
                var option = test.option;
                $btns.removeClass("active");
                $btns.filter(function() {
                    return $(this).data("option") === option;
                }).addClass("active");

                var res = getTerminationOptions();
                expect(res).to.be.an("object");
                expect(res.allowRecordErrors).to.equal(test.allowRecordErrors);
                expect(res.allowFileErrors).to.equal(test.allowFileErrors);
            });
        });

        it('errorHandler should work', () => {
            const errorHandler = DSConfig.__testOnly__.errorHandler;
            const $errorSection = $previewWrap.find('.errorSection');
            const $content = $errorSection.find('.content');
            const $bottomSection = $errorSection.find('.bottomSection');
            // case 1
            let error = {
                status: StatusT.StatusNoEnt,
                error: 'Error: test'
            };
            errorHandler(error, false, false);
            expect($content.text().startsWith('test')).to.be.true;
            expect($errorSection.hasClass('cancelState')).to.be.false;
            expect($bottomSection.hasClass('xc-hidden')).to.be.true;
            expect($errorSection.hasClass('hidden')).to.be.false;
            // case 2
            error = {
                status: StatusT.StatusUdfExecuteFailed,
                error: 'udf test'
            };
            errorHandler(error, true, false);
            expect($content.text().startsWith(DSFormTStr.UDFError)).to.be.true;
            expect($errorSection.hasClass('cancelState')).to.be.false;
            expect($bottomSection.hasClass('xc-hidden')).to.be.false;
            // case 3
            error = {
                status: StatusT.StatusAlready,
                error: 'test'
            };
            errorHandler(error, false, true);
            expect($content.text().startsWith('test')).to.be.false;
            expect($errorSection.hasClass('cancelState')).to.be.true;
            expect($bottomSection.hasClass('xc-hidden')).to.be.true;

            // reset
            $errorSection.addClass('hidden').removeClass('cancelState');
            $errorSection.find(".content").empty();
        });

        describe('previewData Test', () => {
            let previewData;
            let loadArgs;
            let oldTranStart;
            let oldTransDone;
            let oldTransFail;
            let $errorSection;
            let oldList;

            before(() => {
                previewData = DSConfig.__testOnly__.previewData;
                loadArgs = DSConfig.__testOnly__.get().loadArgs;
                $errorSection = $previewWrap.find('.errorSection');

                oldList = XcalarListFiles;

                oldTranStart = Transaction.start;
                oldTransDone = Transaction.done;
                oldTransFail = Transaction.fail;

                Transaction.start = () => 1;
                Transaction.done = () => null;
                Transaction.fail = () => null;
            });

            beforeEach(() => {
                $errorSection.find('.content').empty();
            });

            it('should handle invalid case', (done) => {
                previewData({udfModule: 'module', udfFunc: null})
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect(error).to.equal('Error Case!');
                    done();
                });
            });

            it('should handle oldPreviewError', (done) => {
                XcalarListFiles = () => PromiseHelper.reject({
                    error: 'old preview error'
                });

                previewData()
                .then(() => {
                    done('fail');
                })
                .fail((error) => {
                    expect($errorSection.find('.contenet').text()).to.equal('');
                    done();
                });
            });

            it('should handle excel case', (done) => {
                const oldLoad = XcalarDatasetLoad
                XcalarDatasetLoad = () => PromiseHelper.reject('test');

                loadArgs.setPreviewingSource(1, 'test.xlsx');
                loadArgs.setFormat('Excel')
                const options = {
                    isRestore: true,
                    typedColumns: ['a'],
                    isFirstTime: true
                };
                previewData(options)
                .then(() => {
                    done('fail');
                })
                .fail(() => {
                    expect(loadArgs.getPreviewHeaders()).to.be.an('array');
                    done();
                })
                .always(() => {
                    XcalarDatasetLoad = oldLoad;
                });
            });

            describe('validateParquetArg Test', () => {
                let oldImport;
                let loadArgs;
                let validateParquetArgs;

                before(() => {
                    oldImport = DS.load;
                    DS.load = (args) => PromiseHelper.resolve(args);

                    loadArgs = DSConfig.__testOnly__.get().loadArgs;
                    validateParquetArgs = DSConfig.__testOnly__.validateParquetArgs;
                });

                it('should get parquetArgs', () => {
                    let oldIsParquet = DSTargetManager.isSparkParquet;
                    DSTargetManager.isSparkParquet = () => true;
                    const $partitionList = $previewCard.find(".parquetSection .partitionAdvanced .partitionList");
                    $partitionList.append('<div class="row">' +
                                            '<label>col1:</label>' +
                                            '<input value="test">' +
                                        '</div>');
                    const $partitionSelectColList = $previewCard.find(".parquetSection .selectedColSection .colList");
                    $partitionSelectColList.append('<li class="mustSelect">' +
                                                        '<span class="colName">col1</span>' +
                                                    '</li>');
                    $partitionSelectColList.append('<li>' +
                                                        '<span class="colName">col2</span>' +
                                                    '</li>');
                    const $partitionAvialableColList = $previewCard.find(".parquetSection .availableColSection .colList");
                    $partitionAvialableColList.append('<li>' +
                                                        '<span class="colName">col1</span>' +
                                                    '</li>');

                    loadArgs.files = [{path: 'path'}];
                    loadArgs.multiDS = false;
                    let parquetArgs = validateParquetArgs();
                    expect(parquetArgs.partitionKeys).to.deep.equal({'col1':['test']});
                    expect(parquetArgs.columns).to.deep.equal(['col1', 'col2']);
                    DSTargetManager.isSparkParquet = oldIsParquet;
                    $partitionList.empty();
                    $partitionSelectColList.empty();
                    $partitionAvialableColList.empty();
                });

                after(() => {
                    Transaction.start = oldTranStart;
                    Transaction.done = oldTransDone;
                    Transaction.fail = oldTransFail;
                    XcalarListFiles = oldList;
                    DS.load = oldImport;
                    loadArgs.reset();
                    DSConfig.__testOnly__.resetForm();
                });
            });

            describe('importDataHelper Test', () => {
                let importDataHelper;
                let oldImport;
                let loadArgs;

                before(() => {
                    importDataHelper = DSConfig.__testOnly__.importDataHelper;
                    oldImport = DS.load;
                    DS.load = (args) => PromiseHelper.resolve(args);

                    loadArgs = DSConfig.__testOnly__.get().loadArgs;
                });

                it('should work for parquet case', (done) => {
                    let oldIsParquet = DSTargetManager.isSparkParquet;
                    DSTargetManager.isSparkParquet = () => true;
                    const $partionList = $previewCard.find(".parquetSection .partitionAdvanced .partitionList");
                    $partionList.append('<div class="row">' +
                                            '<label>col1</label>' +
                                            '<input value="test">' +
                                        '</div>');

                    loadArgs.files = [{path: 'path'}];
                    loadArgs.multiDS = false;
                    const dsArgs = {format: "PARQUET"}

                    importDataHelper(['ds'], dsArgs, [])
                    .then((multiLoadArgs) => {
                        expect(multiLoadArgs.sources[0].path).to.equal('path');
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    })
                    .always(() => {
                        DSTargetManager.isSparkParquet = oldIsParquet;
                        $partionList.empty();
                    });
                });

                it('should work for auto detect', (done) => {
                    const file = {path: 'path', autoCSV: true};
                    loadArgs.files = [file];
                    loadArgs.multiDS = false;
                    loadArgs.setPreviewingSource(0, file);
                    const dsArgs = {format: "CSV"};

                    importDataHelper(['ds'], dsArgs, [])
                    .then((multiLoadArgs) => {
                        expect(multiLoadArgs.sources[0].udfQuery).not.to.be.null;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
                });

                it('should work for multi DS case', (done) => {
                    loadArgs.files = [{path: 'path'}];
                    loadArgs.multiDS = true;
                    const dsArgs = {format: "JSON"};

                    importDataHelper(['ds'], dsArgs, [])
                    .then((arg) => {
                        expect(arg).not.to.be.null;
                        done();
                    })
                    .fail(() => {
                        done('fail');
                    });
                });

                after(() => {
                    DS.load = oldImport;
                    loadArgs.reset();
                });
            });

            after(() => {
                Transaction.start = oldTranStart;
                Transaction.done = oldTransDone;
                Transaction.fail = oldTransFail;
                XcalarListFiles = oldList;
                loadArgs.reset();
                DSConfig.__testOnly__.resetForm();
            });
        });

        it("delimiterTranslate should work", function() {
            let delimiterTranslate = DSConfig.__testOnly__.delimiterTranslate;
            // case 1
            var $input = $('<input class="nullVal">');
            var res = delimiterTranslate($input);
            expect(res).to.equal("");

            // case 2
            $input = $("<input>").val('"');
            res = delimiterTranslate($input);
            expect(res).to.equal('"');

            // case 3
            $input = $("<input>").val("\\t");
            res = delimiterTranslate($input);
            expect(res).to.equal("\t");
        });
    });

    describe("Preview Public API Test", function() {
        it("DSConfig.clear shoule resolve if view is hidden", function(done) {
            var isHidden = $previewCard.hasClass("xc-hidden");
            $previewCard.addClass("xc-hidden");

            DSConfig.clear()
            .then(function(res) {
                expect(res).to.equal(null);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                if (!isHidden) {
                    $previewCard.removeClass("xc-hidden");
                }
            });
        });

        it("DSPReview.getFormatFromParserFnName should work", function() {
            let tests = [{
                fn: "default:parseCsv",
                expect: "CSV"
            }, {
                fn: "default:parseJson",
                expect: "JSON"
            }, {
                fn: "default:extractJsonRecords",
                expect: "JSON"
            }, {
                fn: "default:openExcel",
                expect: "Excel"
            }, {
                fn: "default:xmlToJsonWithExtraKeys",
                expect: "XML"
            }, {
                fn: "default:parseParquet",
                expect: "PARQUET"
            }, {
                fn: "default:ingestFromDatabase",
                expect: "DATABASE"
            }, {
                fn: "test:test",
                expect: "UDF"
            }, {
                fn: "",
                expect: null
            }];

            tests.forEach((test) => {
                let res = DSConfig.getFormatFromParserFnName(test.fn);
                if (res !== test.expect) {
                    console.error("fail test", test);
                }
                expect(res).to.equal(test.expect);
            });
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Suggest Test", function() {
        before(function() {
            loadArgs.reset();
        });

        it("Should detect correct format", function() {
            var detectFormat = DSConfig.__testOnly__.detectFormat;
            loadArgs.setPreviewingSource(0, "test.xlsx");
            expect(detectFormat()).to.equal("Excel");
            loadArgs.setPreviewingSource(0, "test");
            var data = "[{\"test\"}";
            expect(detectFormat(data, "\n")).to.equal("JSON");

            data = "{\"test\": \"val\"}";
            expect(detectFormat(data, "\n")).to.equal(DSFormat.SpecialJSON);

            data = "abc";
            expect(detectFormat(data, "\n")).to.equal("CSV");
        });

        it("Should detect correct header", function() {
            var detectHeader = DSConfig.__testOnly__.detectHeader;

            // when nothing to delimit
            var linDelim = "\n";
            var fieldDelim = "";
            var data = "";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            // when is not header
            data = "Col0\nCol1";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;


            data = "\t\t\n\tCol1";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            data = "1\t2\nCol1\tCol2";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.false;

            // has header
            data = "ThisisHeader1\tThisisHeader2\n" +
                    "1\t2\n" +
                    "3\t4";
            fieldDelim = "\t";
            expect(detectHeader(data, linDelim, fieldDelim)).to.be.true;
        });

        it("Should detect excel header", function() {
            var detectExcelHeader = DSConfig.__testOnly__.detectExcelHeader;

            // has header case
            var obj = [{"col0": "test"}, {"col0": 1}, {"col0": 2}];
            var data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.true;

            // no header case
            obj = [{"col0": 0}, {"col0": 1}, {"col0": 2}];
            data = JSON.stringify(obj);
            expect(detectExcelHeader(data)).to.be.false;

            // error case
            data = "invalid json data";
            expect(detectExcelHeader(data)).to.be.false;
        });
    });

    describe("Get Preview Table Test", function() {
        before(function() {
            $previewTable.html("");
            loadArgs.reset();
        });

        it ("Should get a table from raw data", function() {
            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");

            var data = "h,i\nte,st";
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();

            // has 2 rows and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.false;

            loadArgs.setFieldDelim(",");
            DSConfig.__testOnly__.getPreviewTable();
            // has 2 rows and 3 columns
            expect($previewTable.find("th").length).to.equal(3);
            expect($previewTable.find("tbody tr").length).to.equal(2);
            expect($previewTable.hasClass("has-delimiter")).to.be.true;

            // error json
            loadArgs.setFormat("JSON");
            DSConfig.__testOnly__.getPreviewTable();
            var res = $previewWrap.find(".errorSection .topSection .content").text();
            expect(res).to.equal("Your file cannot be parsed as JSON. We recommend you use the CSV format instead.");

            // valid json
            data = '{"a": "b"}';
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);

            // valid json2
            data = '{"a": "{b"}';
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();
            // has 1 row and 2 columns(include lineMaker)
            expect($previewTable.find("th").length).to.equal(2);
            expect($previewTable.find("tbody tr").length).to.equal(1);
        });

        it("Should highlight delimiter", function() {
            var data = "h,i";
            var $highLightBtn = $("#dsForm-highlighter .highlight");
            var $rmHightLightBtn = $("#dsForm-highlighter .rmHightLight");

            loadArgs.setFormat("CSV");
            loadArgs.setFieldDelim("");
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();

            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
            // can highlight
            DSConfig.__testOnly__.applyHighlight(",");
            expect(DSConfig.__testOnly__.get().highlighter).to.equal(",");
            expect($previewTable.find(".highlight").length).to.equal(1);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.false;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.false;

            // can remove highlight
            DSConfig.__testOnly__.applyHighlight("");
            expect(DSConfig.__testOnly__.get().highlighter).to.equal("");
            expect($previewTable.find(".highlight").length).to.equal(0);
            expect($highLightBtn.hasClass("xc-disabled")).to.be.true;
            expect($rmHightLightBtn.hasClass("xc-disabled")).to.be.true;
        });

        it("Should clear preview table", function(done) {
            var data = "h,i";
            DSConfig.__testOnly__.set(data);
            DSConfig.__testOnly__.getPreviewTable();
            var tName = DSConfig.__testOnly__.get().tableName;
            DSConfig.__testOnly__.clearPreviewTable(tName)
            .then(function(hasDestroyTable) {
                expect(hasDestroyTable).to.be.false;
                var res = DSConfig.__testOnly__.get();
                expect(res.highlighter).to.equal("");
                expect($previewTable.html()).to.equal("");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            DSConfig.__testOnly__.set("");
            $previewTable.empty();
        });
    });

    describe("Preview with UDF Function Test", function() {
        var oldLoad;
        var oldMakeResultSet;
        var oldFetch;
        var oldSetFree;

        before(function() {
            oldLoad = XcalarDatasetLoad;
            oldMakeResultSet = XcalarMakeResultSetFromDataset;
            oldSetFree = XcalarSetFree;
            oldFetch = XcalarFetchData;
        });

        it("should loadDataWithUDF handle error case", function(done) {
            let called = false;
            XcalarDatasetLoad = function() {
                called = true;
                return PromiseHelper.reject("test");
            };

            DSConfig.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.be.true;
                expect(error).to.equal("test");
                done();
            });
        });

        it("should loadDataWithUDF handle parse error", function(done) {
            let called = 0;
            loadArgs.set({"path": "test"});
            XcalarDatasetLoad = function() {
                called++;
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                called++;
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                return PromiseHelper.resolve(["test"]);
            };

            DSConfig.__testOnly__.loadDataWithUDF(1, "test", "ds",{
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.equal(2);
                expect(error).to.equal(DSTStr.NoParse);
                done();
            });
        });

        it("should loadDataWithUDF", function(done) {
            loadArgs.set({"path": "test"});
            let called = 0;
            XcalarDatasetLoad = function() {
                called++;
                return PromiseHelper.resolve();
            };

            XcalarMakeResultSetFromDataset = function() {
                called++;
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 1
                });
            };

            XcalarFetchData = function() {
                called++;
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            XcalarSetFree = function() {
                called++;
                return PromiseHelper.resolve();
            };

            DSConfig.__testOnly__.loadDataWithUDF(1, "test", "ds", {
                "moduleName": "module",
                "funcName": "func"
            })
            .then(function(buffer) {
                expect(called).to.equal(4);
                expect(buffer).not.to.be.null;
                expect(buffer).contains("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should fetch more rows with UDF load", function(done) {
            var test = false;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 40
                });
            };

            XcalarFetchData = function() {
                test = true;
                var val = JSON.stringify({"a": "test"});
                return PromiseHelper.resolve([val]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should clear the table", function(done) {
            var oldDestory = XIApi.deleteDataset;
            var called = 0;
            XIApi.deleteDataset = function() {
                called++;
                return PromiseHelper.resolve();
            };
            var tName = DSConfig.__testOnly__.get().tableName;
            DSConfig.__testOnly__.clearPreviewTable(tName)
            .then(function(hasDestroyTable) {
                expect(called).to.equal(1);
                expect(hasDestroyTable).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XIApi.deleteDataset = oldDestory;
            });
        });

        after(function() {
            XcalarDatasetLoad = oldLoad;
            XcalarSetFree = oldSetFree;
            XcalarMakeResultSetFromDataset = oldMakeResultSet;
            XcalarFetchData = oldFetch;
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Basic form functionality test", function() {
        it("Should reset form", function() {
            $("#dsForm-skipRows").val(1);
            loadArgs.setFieldDelim("test..");
            DSConfig.__testOnly__.resetForm();

            expect($("#dsForm-skipRows").val()).to.equal("0");
            expect(loadArgs.getFieldDelim()).to.equal("");
        });

        it("getNameFromPath should work", function() {
            var getNameFromPath = DSConfig.__testOnly__.getNameFromPath;

            var testName = xcHelper.randName("testName").toUpperCase();
            var oldFunc = PTblManager.Instance.getUniqName;

            // basic
            var res = getNameFromPath(testName);
            expect(res).to.equal(testName);

            var test2 = testName + ".test";
            res = getNameFromPath(test2);
            expect(res).to.equal(testName);

            var test3 = "/var/yelpUnittest/";
            res = getNameFromPath(test3);
            expect(res).to.equal("YELPUNITTEST");

            var test4 = "/var/gdeltUnittest.csv";
            res = getNameFromPath(test4);
            expect(res).to.equal("GDELTUNITTEST");

            var test5 = "/var/123";
            res = getNameFromPath(test5);
            expect(res).to.equal("VAR123");

            var test6 = "/123";
            res = getNameFromPath(test6);
            expect(res).to.equal("SOURCE123");

            PTblManager.Instance.getUniqName = function() {
                return testName + "1";
            };

            // names can be reused
            res = getNameFromPath(testName);
            expect(res).to.equal(testName + "1");
            PTblManager.Instance.getUniqName = oldFunc;
        });

        it("getSkipRows() should work", function() {
            var $input = $("#dsForm-skipRows");
            var getSkipRows = DSConfig.__testOnly__.getSkipRows;
            // test1
            $input.val("2");
            expect(getSkipRows()).to.equal(2);

            // test2
            $input.val("");
            expect(getSkipRows()).to.equal(0);

            // test3
            $input.val("abc");
            expect(getSkipRows()).to.equal(0);

            // test4
            $input.val("-1");
            expect(getSkipRows()).to.equal(0);

            $input.val("");
        });

        it("applyQuote() should work", function() {
            var applyQuote = DSConfig.__testOnly__.applyQuote;
            var $quote = $("#dsForm-quote");

            applyQuote("\'");
            expect($quote.val()).to.equal("\'");
            expect(loadArgs.getQuote()).to.equal("\'");

            // error case
            applyQuote("test");
            expect(loadArgs.getQuote()).not.to.equal("test");
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Delimiter Selection Test", function() {
        before(function() {
            DSConfig.__testOnly__.toggleFormat("CSV");
        });

        it("applyFieldDelim() should work", function() {
            var applyFieldDelim = DSConfig.__testOnly__.applyFieldDelim;

            // test1
            applyFieldDelim("");
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            //test 2
            applyFieldDelim(",");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            //test 3
            applyFieldDelim("\t");
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("applyLineDelim() should work", function() {
            var applyLineDelim = DSConfig.__testOnly__.applyLineDelim;

            // test1
            applyLineDelim("");
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            //test 2
            applyLineDelim("\n");
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select line delim", function() {
            var $ele = $("#lineDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.true;
            expect($lineText.val()).to.equal("Null");
            expect(loadArgs.getLineDelim()).to.equal("");

            // test2
            $ele.find('li[name="CRLF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r\\n");
            expect(loadArgs.getLineDelim()).to.equal("\r\n");

            // test3
            $ele.find('li[name="CR"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\r");
            expect(loadArgs.getLineDelim()).to.equal("\r");

            // test4
            $ele.find('li[name="LF"]').trigger(fakeEvent.mouseup);
            expect($lineText.hasClass("nullVal")).to.be.false;
            expect($lineText.val()).to.equal("\\n");
            expect(loadArgs.getLineDelim()).to.equal("\n");
        });

        it("should select field delim", function() {
            var $ele = $("#fieldDelim");
            $ele.find('li[name="null"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.true;
            expect($fieldText.val()).to.equal("Null");
            expect(loadArgs.getFieldDelim()).to.equal("");

            // test2
            $ele.find('li[name="comma"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal(",");
            expect(loadArgs.getFieldDelim()).to.equal(",");

            // test 3
            $ele.find('li[name="tab"]').trigger(fakeEvent.mouseup);
            expect($fieldText.hasClass("nullVal")).to.be.false;
            expect($fieldText.val()).to.equal("\\t");
            expect(loadArgs.getFieldDelim()).to.equal("\t");
        });

        it("should input line delim", function() {
            $lineText.val(",").trigger("input");
            expect(loadArgs.getLineDelim()).to.equal(",");
        });

        it("should input field delim", function() {
            $fieldText.val(",").trigger("input");
            expect(loadArgs.getFieldDelim()).to.equal(",");
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Format Change Test", function() {
        before(function() {
            $previewCard.removeClass("xc-hidden")
                        .siblings().addClass("xc-hidden");
        });

        beforeEach(function() {
            DSConfig.__testOnly__.resetForm();
        });

        it("Format Should be CSV", function() {
            DSConfig.__testOnly__.toggleFormat("CSV");
            expect($formatText.data("format")).to.equal("CSV");
        });

        it("Format Should be JSON", function() {
            DSConfig.__testOnly__.toggleFormat("JSON");
            expect($formatText.data("format")).to.equal("JSON");
        });

        it("Format Should be Text", function() {
            DSConfig.__testOnly__.toggleFormat("Text");
            expect($formatText.data("format")).to.equal("TEXT");
        });

        it("Format Should be Excel", function() {
            DSConfig.__testOnly__.toggleFormat("Excel");
            expect($formatText.data("format")).to.equal("EXCEL");
        });

        it("Format Should be UDF", function() {
            DSConfig.__testOnly__.toggleFormat("UDF");
            expect($formatText.data("format")).to.equal("UDF");
        });

        it("Format Should be XML", function() {
            DSConfig.__testOnly__.toggleFormat("XML");
            expect($formatText.data("format")).to.equal("XML");
        });

        it("Format should be PARQUET", function() {
            var loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
            var oldFunc = XcalarAppExecute;
            XcalarAppExecute = function() { return PromiseHelper.reject("test") };
            $previewCard.removeClass("format-parquet");
            DSConfig.__testOnly__.toggleFormat("PARQUET");
            expect($previewCard.hasClass("format-parquet")).to.be.treu;
            UnitTest.hasAlertWithTitle("Error Parsing Parquet Dataset");
            loadArgs.reset();
            XcalarAppExecute = oldFunc;
        });

        // it("Format should be PARQUETFILE", function() {
        //     assert.isFalse($("#dsForm-parquetParser").is(":visible"), "should not see parquet parser dropdown");
        //     DSConfig.__testOnly__.toggleFormat("PARQUETFILE");
        //     assert.isTrue($("#dsForm-parquetParser").is(":visible"), "should see parquet parser dropdown");
        // });

        // it("Format Should be DATABASE", function() {
        //     DSConfig.__testOnly__.toggleFormat("DATABASE");
        //     expect($formatText.data("format")).to.equal("DATABASE");
        // });

        // it("Format Should be CONFLUENT", function() {
        //     DSConfig.__testOnly__.toggleFormat("CONFLUENT");
        //     expect($formatText.data("format")).to.equal("CONFLUENT");
        // });

        after(function() {
            DSConfig.__testOnly__.resetForm();
            DSForm.show();
        });
    });

    describe("UDF Func Test", function() {
        var isUseUDFWithFunc;

        before(function(done) {
            $previewCard.removeClass("xc-hidden")
                        .siblings().addClass("xc-hidden");
            isUseUDFWithFunc = DSConfig.__testOnly__.isUseUDFWithFunc;
            // UDF module&Function dropdowns get rendered in asyn manner
            // so all tests beblow should not start until the dropdowns are ready
            DSConfig.__testOnly__.listUDFSection().always(done);
        });

        it("Should toggle UDF format", function() {
            var isUseUDF = DSConfig.__testOnly__.isUseUDF;
            // test 1
            DSConfig.__testOnly__.toggleFormat("UDF");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.false;
            expect(isUseUDF()).to.be.true;
            expect(isUseUDFWithFunc()).to.be.false;

            // test 2
            DSConfig.__testOnly__.toggleFormat("CSV");
            expect($form.find(".format.udf").hasClass("xc-hidden")).to.be.true;
            expect(isUseUDF()).to.be.false;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should have default UDF", function() {
            DSConfig.__testOnly__.toggleFormat("UDF");
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;

            // module default:openExcel should exists
            expect($udfModuleList.find("li:contains(default)")).not.to.be.empty;
            expect($udfFuncList.find("li:contains(openExcel)")).not.to.be.empty;
        });

        it("Should select a UDF module", function() {
            DSConfig.__testOnly__.selectUDFModule(null);
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSConfig.__testOnly__.selectUDFModule(defaultUDFPath);
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;
        });

        it("Should select a UDF func", function() {
            DSConfig.__testOnly__.selectUDFFunc(null);
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect(isUseUDFWithFunc()).to.be.false;

            DSConfig.__testOnly__.selectUDFFunc("openExcel");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");
            expect(isUseUDFWithFunc()).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFModule = DSConfig.__testOnly__.validateUDFModule;
            expect(validateUDFModule(defaultUDFPath + "invalidModule")).to.be.false;
            expect(validateUDFModule(defaultUDFPath)).to.be.true;
        });

        it("Should validate UDF module", function() {
            var validateUDFFunc = DSConfig.__testOnly__.validateUDFFunc;
            expect(validateUDFFunc(defaultUDFPath, "invalidFunc")).to.be.false;
            expect(validateUDFFunc(defaultUDFPath, "openExcel")).to.be.true;
        });

        it("Should reset UDF case 1", function() {
            let udfQuery = {"test": "a"};
            DSConfig.__testOnly__.resetUdfSection({
                "udfQuery": udfQuery
            });
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
            expect($("#dsForm-udfExtraArgs").val()).to.equal(JSON.stringify(udfQuery));
        });

        it("Should reset UDF case 2", function() {
            DSConfig.__testOnly__.resetUdfSection();
            expect($udfModuleList.find("input").val()).to.be.empty;
            expect($udfFuncList.find("input").val()).to.be.empty;
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe('Parquet File Test', () => {
        it("shoiuld select parquet option", () => {
            const $dropdownList = $("#dsForm-parquetParser");

            $dropdownList.find("li").each(function() {
                const $li = $(this);
                $li.trigger(fakeEvent.mouseup);
                const $input = $dropdownList.find("input.text");
                expect($input.val()).to.equal($li.text());
                expect($input.data("name")).not.to.be.undefined;
                expect($input.data("name")).to.equal($li.attr("name"));
            });
        });
    });

    describe('Parquet Func Test', () => {
        let $parquetSection;
        let $partitionList;
        let $availableColList;
        let $selectedColList;

        before(() => {
            $parquetSection = $form.find(".parquetSection");
            $partitionList = $parquetSection.find(".partitionList");
            $availableColList = $parquetSection.find(".availableColSection " +
                                      ".colList");
            $selectedColList = $parquetSection.find(".selectedColSection " +
                                     ".colList");
        });

        it('getParquetInfo should work', (done) => {
            const oldAppExecute = XcalarAppExecute;
            const outRes = {
                validParquet: true,
                partitionKeys: ['key'],
                schema: {}
            };
            const outStr = JSON.stringify([[JSON.stringify(outRes)]]);
            XcalarAppExecute = () => PromiseHelper.resolve({outStr});

            const getParquetInfo = DSConfig.__testOnly__.getParquetInfo;
            getParquetInfo('path', 'target')
            .then((res) => {
                expect(res).to.be.an('object');
                expect(res.partitionKeys[0]).to.equal('key');
                expect(res.schema).to.be.an('object');
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarAppExecute = oldAppExecute;
            });
        });

        it('getParquetInfo should handle fail case', (done) => {
            const oldAppExecute = XcalarAppExecute;
            const outRes = {
                validParquet: false
            };
            const outStr = JSON.stringify([[JSON.stringify(outRes)]]);
            XcalarAppExecute = () => PromiseHelper.resolve({outStr});

            const getParquetInfo = DSConfig.__testOnly__.getParquetInfo;
            getParquetInfo('path', 'target')
            .then(() => {
                done('fail');
            })
            .fail(() => {
                done();
            })
            .always(() => {
                XcalarAppExecute = oldAppExecute;
            });
        });

        it('initParquetForm should handle fail case', (done) => {
            const oldAppExecute = XcalarAppExecute;
            const oldError = Alert.error;
            XcalarAppExecute = () => PromiseHelper.reject({
                output: {
                    errStr: 'test'
                }
            });

            let test = false;
            Alert.error = () => { test = true; }

            const initParquetForm = DSConfig.__testOnly__.initParquetForm;
            initParquetForm('path', 'target')
            .then(() => {
                done('fail');
            })
            .fail(() => {
                expect(test).to.be.true;
                done();
            })
            .always(() => {
                XcalarAppExecute = oldAppExecute;
                Alert.error = oldError;
            });
        });

        it('initParquetForm should work', (done) => {
            const oldAppExecute = XcalarAppExecute;
            const outRes = {
                validParquet: true,
                partitionKeys: ['a'],
                schema: {
                    'a': {xcalarType: 'DfString'},
                    'b': {xcalarType: 'DfObject'},
                    'c': {xcalarType: 'DfArray'}
                }
            };
            const outStr = JSON.stringify([[JSON.stringify(outRes)]]);
            XcalarAppExecute = () => PromiseHelper.resolve({outStr});

            const initParquetForm = DSConfig.__testOnly__.initParquetForm;
            initParquetForm('path', 'target')
            .then(() => {
                expect($availableColList.find('li').length).to.equal(2);
                expect($selectedColList.find('li').length).to.equal(1);
                expect($partitionList.find('.row').length).to.equal(1);
                done();
            })
            .fail(() => {
                done('fail');
            })
            .always(() => {
                XcalarAppExecute = oldAppExecute;
            });
        });

        it('should toggle parquet Section', () => {
            const $listWrap = $parquetSection.find('.listWrap');
            const isActive = $parquetSection.hasClass('active');
            $listWrap.click();
            expect($parquetSection.hasClass('active')).to.equal(!isActive);
            // toggle back
            $listWrap.click();
            expect($parquetSection.hasClass('active')).to.equal(isActive);
        });

        it('should search column', () => {
            const $search = $parquetSection.eq(0).find('.columnSearch');
            const $input = $search.find('input');
            $input.val('a').trigger('input');
            expect($search.hasClass('hasVal')).to.be.true;
            $input.val('').trigger('input');
            expect($search.hasClass('input')).to.be.false;
        });

        it('should blur search column', () => {
            const $search = $parquetSection.eq(0).find('.columnSearch');
            const $input = $search.find('input');
            $input.val('a').blur();
            expect($search.hasClass('hasVal')).to.be.true;
            $input.val('').blur();
            expect($search.hasClass('input')).to.be.false;
        });

        it('should clear search', () => {
            const $search = $parquetSection.eq(0).find('.columnSearch');
            const $input = $search.find('input');
            $input.val('a').addClass('hasVal');
            $search.find('.clear').trigger('mousedown');
            expect($search.hasClass('hasVal')).to.be.false;
        });

        it('should add column', () => {
            const oldAva = $availableColList.find('li').length;
            const oldSelected = $selectedColList.find('li').length;
            $availableColList.find('li .colName').eq(0).click();
            expect($availableColList.find('li').length).to.equal(oldAva - 1);
            expect($selectedColList.find('li').length).to.equal(oldSelected + 1);
        });

        it('should remove column', () => {
            const oldAva = $availableColList.find('li').length;
            const oldSelected = $selectedColList.find('li').length;
            $selectedColList.find('li .xi-minus').eq(0).before('.colName').click();
            expect($availableColList.find('li').length).to.equal(oldAva + 1);
            expect($selectedColList.find('li').length).to.equal(oldSelected - 1);
        });

        it('should trigger add all', () => {
            $parquetSection.find('.addAllCols').click();
            expect($availableColList.find('li').length).to.equal(0);
            expect($selectedColList.find('li').length).to.equal(3);
        });

        it('should trigger remove all', () => {
            // key cannot be remvoed
            $parquetSection.find('.removeAllCols').click();
            expect($availableColList.find('li').length).to.equal(2);
            expect($selectedColList.find('li').length).to.equal(1);
        });

        after(() => {
            $partitionList.empty();
            $availableColList.empty();
            $selectedColList.empty();
        });
    });

    describe("Validate Form Test", function() {
        var validateForm;
        var loadArgs;
        var oldValidateSchema;

        before(function() {
            oldValidateSchema = DataSourceSchema.prototype.validate;
            DataSourceSchema.prototype.validate = () => { return {}; };
            validateForm = DSConfig.__testOnly__.validateForm;

            loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
        });

        it("should validate table names", function() {
            loadArgs.setFormat("CSV");

            // test1
            var $dsName = $form.find(".dsName").eq(0);
            $dsName.val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // test2
            var name = new Array(350).join("a");
            $dsName.val(name);
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.TooLong);

            // test3
            $dsName.val("1test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.TableStartsWithLetter);

            // test4
            var oldhas = PTblManager.Instance.hasTable;
            PTblManager.Instance.hasTable = function() {return true; };
            $dsName.val("test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.TableConflict);
            PTblManager.Instance.hasTable = oldhas;

            // test5
            $dsName.val("test*test");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.InvalidPublishedTableName);

            // test6
            $dsName.val("TEST_TEST");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.dsNames[0]).to.equal("TEST_TEST");

            // restore
            $dsName.val(xcHelper.randName("TEST"));
        });

        it("should validate format", function() {
            loadArgs.setFormat(null);
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            loadArgs.setFormat("CSV");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.be.equal("CSV");
        });

        it("should validate UDF", function() {
            DSConfig.__testOnly__.toggleFormat("UDF");
            $udfModuleList.find("input").val("");
            $udfModuleList.find("input").data("module", "");

            // empty module test
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // empty func test
            $udfModuleList.find("input").val("default").data("module", defaultUDFPath);
            $udfFuncList.find("input").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // valid test
            $udfFuncList.find("input").val("openExcel");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("UDF");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("openExcel");

            // remove UDF checkbox
            $udfModuleList.find("input").val("").data("module", "");
            $udfFuncList.find("input").val("");
            DSConfig.__testOnly__.toggleFormat("CSV");
        });

        it("should validate delimiter", function() {
            // invalid field delimiter
            $fieldText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);
            $fieldText.val(",");

            // invalid line delimiter
            $lineText.removeClass("nullVal").val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidDelim);

            // invalid line delimiter
            $lineText.val("ab");
            loadArgs.setLineDelim("ab");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidLineDelim);

            $lineText.val("\r\n");
            loadArgs.setLineDelim("\r\n");

            // invalid quote
            $quoteInput.val("\\");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(DSFormTStr.InvalidQuote);

            // valid case
            $quoteInput.val("\"");
            expect(validateForm()).not.to.be.null;
        });

        it("should validate Excel case", function() {
            loadArgs.set({format: "Excel"});

            // test1
            $("#dsForm-skipRows").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test2
            $("#dsForm-skipRows").val("-1");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoNegativeNumber);

            //test3
            $("#dsForm-skipRows").val("0");
            $("#dsForm-excelIndex").val("");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test4
            $("#dsForm-excelIndex").val("-1");
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoNegativeNumber);

            //test5
            $("#dsForm-excelIndex").val("1");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("Excel");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("openExcel");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.skipRows).to.equal(0);
            expect(res.udfQuery.sheetIndex).to.equal(1);
            expect(res.udfQuery.withHeader).to.equal(loadArgs.useHeader());
            // restore
            $("#dsForm-excelIndex").val("0");
        });

        it("should validate XML case", function(done) {
            const componentXmlFormat = DSConfig.__testOnly__.componentXmlFormat();
            const testHelper = componentXmlFormat.getTestHelper();
            loadArgs.set({format: "XML"});

            // Test default state
            testHelper.setState(testHelper.getDefaultState());
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // Test normal case
            testHelper.setState({
                xPaths: [
                    {
                        xPath: { name: 'test_xPath1_name', value: 'test_xPath1' },
                        extraKeys: [
                            { name: 'extName11', value: 'extValue11' },
                            { name: 'extName12', value: 'extValue12' }
                        ]
                    },
                    {
                        xPath: { name: 'test_xPath2_name', value: 'test_xPath2' },
                        extraKeys: [
                            { name: 'extName21', value: 'extValue21' },
                            { name: 'extName22', value: 'extValue22' }
                        ]
                    },
                ],
                isWithPath: true,
                isMatchedPath: true,
                delimiter: 'delim',
            }).then( () => {
                const res = validateForm();
                expect(res).to.be.an("object");
                expect(res.format).to.equal("XML");
                expect(res.udfModule).to.equal(defaultUDFPath);
                expect(res.udfFunc).to.equal("xmlToJsonWithExtraKeys");
                expect(res.udfQuery).to.be.an("object");
                expect(res.udfQuery.allPaths).to.be.an("array");
                expect(res.udfQuery.allPaths.length).to.equal(2);

                expect(res.udfQuery.allPaths[0]).to.have.property("xPath");
                expect(res.udfQuery.allPaths[0].xPath.name).to.equal("test_xPath1_name");
                expect(res.udfQuery.allPaths[0].xPath.value).to.equal("test_xPath1");
                expect(res.udfQuery.allPaths[0].extraKeys).to.be.an("object");
                expect(res.udfQuery.allPaths[0].extraKeys).to.have.property("extName11");
                expect(res.udfQuery.allPaths[0].extraKeys.extName11).to.equal("extValue11");
                expect(res.udfQuery.allPaths[0].extraKeys).to.have.property("extName12");
                expect(res.udfQuery.allPaths[0].extraKeys.extName12).to.equal("extValue12");

                expect(res.udfQuery.allPaths[1]).to.have.property("xPath");
                expect(res.udfQuery.allPaths[1].xPath.name).to.equal("test_xPath2_name");
                expect(res.udfQuery.allPaths[1].xPath.value).to.equal("test_xPath2");
                expect(res.udfQuery.allPaths[1].extraKeys).to.be.an("object");
                expect(res.udfQuery.allPaths[1].extraKeys).to.have.property("extName21");
                expect(res.udfQuery.allPaths[1].extraKeys.extName21).to.equal("extValue21");
                expect(res.udfQuery.allPaths[1].extraKeys).to.have.property("extName22");
                expect(res.udfQuery.allPaths[1].extraKeys.extName22).to.equal("extValue22");

                expect(res.udfQuery).to.have.property("matchedPath");
                expect(res.udfQuery.matchedPath).to.equal(true);
                expect(res.udfQuery).to.have.property("withPath");
                expect(res.udfQuery.withPath).to.equal(true);
                expect(res.udfQuery).to.have.property("delimiter");
                expect(res.udfQuery.delimiter).to.equal("delim");

                done();
            }).fail( () => {
                done('fail');
            }).always( () => {
                // restore
                testHelper.setState(testHelper.getDefaultState());
            })
        });

        it("should validate DATABASE case", function() {
            loadArgs.set({format: "DATABASE"});

            // Test for normal output
            $("#dsForm-dbSQL").val("test_sql");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("DATABASE");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("ingestFromDatabase");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.query).to.equal("test_sql");
            // restore
            $("#dsForm-dbSQL").val("");
        });

        it("should validate CONFLUENT case", function() {
            loadArgs.set({format: "CONFLUENT"});

            // Test for normal output
            // $("#dsForm-cfNumRows").val("5");
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("CONFLUENT");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("ingestFromConfluent");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.numRows).to.equal(-1);
            // restore
            $("#dsForm-cfNumRows").val("");
        });

        it("should validate JSON case", function() {
            loadArgs.set({format: "JSON"});
            let validateResult;

            // No UDF case
            $("#dsForm-jsonJmespath").val('');
            validateResult = validateForm();
            expect(validateResult).to.be.an("object");
            expect(validateResult.format).to.equal("JSON");
            expect(validateResult.udfModule).to.equal("");
            expect(validateResult.udfFunc).to.equal("");
            expect(validateResult.udfQuery).to.be.null;

            // Use UDF case
            $("#dsForm-jsonJmespath").val('test_path');
            validateResult = validateForm();
            expect(validateResult).to.be.an("object");
            expect(validateResult.format).to.equal("JSON");
            expect(validateResult.udfModule).to.equal(defaultUDFPath);
            expect(validateResult.udfFunc).to.equal("extractJsonRecords");
            expect(validateResult.udfQuery).to.be.an("object");
            expect(validateResult.udfQuery.structsToExtract).to.equal("test_path");

            // restore
            $("#dsForm-jsonJmespath").val("");
        });

        it("should validte PARQUET case", function() {
            var $parquetSection = $form.find(".parquetSection");
            var $selectedColList = $parquetSection.find(".selectedColSection .colList");
            var $partiontoinList = $parquetSection.find(".partitionList");
            var $availableColList = $parquetSection.find(".availableColSection .colList");
            loadArgs.set({format: "PARQUET"});

            // test1
            $selectedColList.html('<li class="mustSelect"></li>');
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.ParquetMustSelectNonPartitionCol);

            // test2
            $selectedColList.html('<li><div class="colName">test1</div></li>');
            $partiontoinList.html('<input value="">');
            expect(validateForm()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            // test3
            $partiontoinList.html('<input value="test1">');
            $availableColList.html('<li></li>');
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUET");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("parseParquet");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.columns).to.be.an("array");
            expect(res.udfQuery.columns.length).to.equal(1);
            expect(res.udfQuery.columns[0]).to.equal("test1");

            // restore
            $selectedColList.empty();
            $partiontoinList.empty();
            $availableColList.empty();
        });

        it("should validte PARQUETFILE case", function() {
            loadArgs.set({format: "PARQUETFILE"});
            $("#dsForm-parquetParser").find("li").eq(0).trigger(fakeEvent.mouseup);
            var res = validateForm();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUETFILE");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("parseParquet");
            expect(res.udfQuery).to.deep.equal({
                parquetParser: "native"
            });
        });

        it("should validate invalid col name in advanced section case 1", function(done) {
            var $advanceSection = $form.find(".advanceSection");
            var $fileName = $advanceSection.find(".fileName");
            var oldFunc = xcHelper.validateColName;
            var oldShow = StatusBox.show;
            var called = false;

            $fileName.find(".checkbox").addClass("checked");
            xcHelper.validateColName = function() {
                return "test error";
            };
            StatusBox.show = () => called = true;
            var res = validateForm();

            UnitTest.testFinish(function() {
                // it has dealy
                return called === true;
            })
            .then(function() {
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $fileName.find(".checkbox").removeClass("checked");
                xcHelper.validateColName = oldFunc;
                StatusBox.show = oldShow;
            });
        });

        it("should validate invalid col name in advanced section case 2", function(done) {
            var $advanceSection = $form.find(".advanceSection");
            var $rowNum = $advanceSection.find(".rowNumber");
            var oldFunc = xcHelper.validateColName;
            var oldShow = StatusBox.show;
            var called = false;

            $rowNum.find(".checkbox").addClass("checked");
            $rowNum.find("input").val("test");
            $("#previewTable").html('<input class="editableHead" value="test">');

            StatusBox.show = () => called = true;
            var res = validateForm();

            UnitTest.testFinish(function() {
                // it has dealy
                return called === true;
            })
            .then(function() {
                expect(res).to.be.null;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                $("#previewTable").empty();
                $rowNum.find(".checkbox").removeClass("checked");
                xcHelper.validateColName = oldFunc;
                StatusBox.show = oldShow;
            });
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
            DataSourceSchema.prototype.validate = oldValidateSchema;
        });
    });

    describe("Validate Preview Test", function() {
        var validatePreview;
        var loadArgs;

        before(function() {
            validatePreview = DSConfig.__testOnly__.validatePreview;
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.set({files: [{}]});
        });

        it("should validate format", function() {
            loadArgs.setFormat(null);
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            loadArgs.setFormat("CSV");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.be.equal("CSV");
        });

        it("should validate UDF", function() {
            DSConfig.__testOnly__.toggleFormat("UDF");
            $udfModuleList.find("input").val("").data("module", "");

            // empty module test
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyList);

            // empty func test
            $udfModuleList.find("input").val("default").data("module", defaultUDFPath);
            $udfFuncList.find("input").val("openExcel");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("UDF");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("openExcel");

            // remove UDF checkbox
            $udfModuleList.find("input").val("");
            $udfFuncList.find("input").val("");
            DSConfig.__testOnly__.toggleFormat("CSV");
        });

        it("should validate Excel case", function() {
            loadArgs.set({format: "Excel"});

            // test1
            $("#dsForm-skipRows").val("");
            expect(validatePreview()).to.be.null;
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);

            //test2
            $("#dsForm-skipRows").val("0");
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("Excel");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("openExcel");
            expect(res.udfQuery).to.be.an("object");
            expect(res.udfQuery.skipRows).to.equal(0);
        });

        it("should validte PARQUETFILE case", function() {
            loadArgs.set({format: "PARQUETFILE"});
            var res = validatePreview();
            expect(res).to.be.an("object");
            expect(res.format).to.equal("PARQUETFILE");
            expect(res.udfModule).to.equal(defaultUDFPath);
            expect(res.udfFunc).to.equal("parseParquet");
        });
    });

    describe("Restore Form Test", function() {
        var resetForm;
        var loadArgs;

        before(function() {
            DSConfig.__testOnly__.resetForm();
            resetForm = DSConfig.__testOnly__.restoreForm;
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
        });

        it("should restore form with UDF format", function() {
            resetForm({
                dsName: "test",
                moduleName: defaultUDFPath,
                funcName: "openExcel",
                format: "UDF",
                hasHeader: true,
                fieldDelim: "",
                lineDelim: "\n",
                quoteChar: "\"",
                skipRows: 1
            });

            expect($form.find(".dsName").eq(0).val()).to.equal("test");
            expect($udfModuleList.find("input").val()).to.equal("default");
            expect($udfFuncList.find("input").val()).to.equal("openExcel");

            expect($formatText.data("format")).to.equal("UDF");
            expect($headerCheckBox.find(".checkbox").hasClass("checked"))
            .to.be.true;

            expect($lineText.val()).to.equal("\\n");
            expect($fieldText.val()).to.equal("Null");
            expect($("#dsForm-skipRows").val()).to.equal("1");
        });

        it("should restore excel", function() {
            resetForm({
                dsName: "test",
                moduleName: defaultUDFPath,
                funcName: "openExcel",
                format: "Excel",
                udfQuery: {
                    sheetIndex: 1,
                    skipRows: 1
                }
            });

            expect(loadArgs.getFormat()).to.equal("Excel");
            expect($("#dsForm-excelIndex").val()).to.equal("1");
            expect($("#dsForm-skipRows").val()).to.equal("1");

            // restore
            $("#dsForm-excelIndex").val("");
            $("#dsForm-skipRows").val("");
        });

        it("should restore XML", function() {
            const componentXmlFormat = DSConfig.__testOnly__.componentXmlFormat();
            const testHelper = componentXmlFormat.getTestHelper();

            resetForm({
                dsName: "test",
                format: "XML",
                udfQuery: {
                    allPaths: [{
                        xPath: { name: 'test_xPath_name', value: 'test_xPath' },
                        extraKeys: { extName1: 'extValue1' }
                    }],
                    withPath: true,
                    matchedPath: true,
                    delimiter: 'delim',
                }
            });


            const state = testHelper.getState();
            expect(loadArgs.getFormat()).to.equal("XML");
            expect($form.find('[data-xcid="xml.matchedPath"]').hasClass("checked"));
            expect($form.find('[data-xcid="xml.xml.withPath"]').hasClass("checked"));
            expect($form.find('[data-xcid="xml.delimiter"]').val()).to.equal('delim');

            expect(state.xPaths).to.be.an('array');
            expect(state.xPaths.length).to.equal(1);
            expect(state.xPaths[0]).to.be.an('object');
            expect(state.xPaths[0]).to.have.property('xPath');
            expect(state.xPaths[0].xPath.name).to.equal('test_xPath_name');
            expect(state.xPaths[0].xPath.value).to.equal('test_xPath');
            expect(state.xPaths[0]).to.have.property('extraKeys');
            expect(state.xPaths[0].extraKeys).to.be.an('array');
            expect(state.xPaths[0].extraKeys.length).to.equal(1);
            expect(state.xPaths[0].extraKeys[0]).to.be.an('object');
            expect(state.xPaths[0].extraKeys[0]).to.have.property('name');
            expect(state.xPaths[0].extraKeys[0].name).to.equal('extName1');
            expect(state.xPaths[0].extraKeys[0]).to.have.property('value');
            expect(state.xPaths[0].extraKeys[0].value).to.equal('extValue1');

            // restore
            testHelper.setState(testHelper.getDefaultState());
        });

        it("should restore DATABASE", function() {
            resetForm({
                dsName: "test",
                format: "DATABASE",
                udfQuery: {
                    query: "test_sql"
                }
            });

            expect(loadArgs.getFormat()).to.equal("DATABASE");
            expect($("#dsForm-dbSQL").val()).to.equal("test_sql");

            // restore
            $("#dsForm-dbSQL").val("");
        });

        it("should restore CONFLUENT", function() {
            resetForm({
                dsName: "test",
                format: "CONFLUENT",
                udfQuery: {
                    numRows: 5
                }
            });

            expect(loadArgs.getFormat()).to.equal("CONFLUENT");
            // expect($("#dsForm-cfNumRows").val()).to.equal("5");

            // restore
            // $("#dsForm-cfNumRows").val("");
        });

        it("should restore JSON", function() {
            // [*] ==> ''
            resetForm({
                dsName: "test",
                format: "JSON",
                udfQuery: {
                    structsToExtract: "[*]"
                }
            });
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#dsForm-jsonJmespath").val().length).to.equal(0);

            // Code protective test1
            resetForm({
                dsName: "test",
                format: "JSON",
                udfQuery: {}
            });
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#dsForm-jsonJmespath").val().length).to.equal(0);

            // Code protective test2
            resetForm({
                dsName: "test",
                format: "JSON",
                udfQuery: null
            });
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#dsForm-jsonJmespath").val().length).to.equal(0);

            // Normal case
            resetForm({
                dsName: "test",
                format: "JSON",
                udfQuery: {
                    structsToExtract: "test_path"
                }
            });
            expect(loadArgs.getFormat()).to.equal("JSON");
            expect($("#dsForm-jsonJmespath").val()).to.equal("test_path");

            // restore
            $("#dsForm-jsonJmespath").val("");
        });

        it("should restore PARQUET", function() {
            var oldFunc = XcalarAppExecute;
            window.a = true
            XcalarAppExecute = function() { return PromiseHelper.reject("test") };
            resetForm({
                dsName: "test",
                format: "PARQUET",
                files: [{path: "test?abc"}],
            });

            expect(loadArgs.getFormat()).to.equal("PARQUET");

            UnitTest.hasAlertWithTitle("Error Parsing Parquet Dataset");
            XcalarAppExecute = oldFunc;
        });

        it("should restore PARQUETFILE", function() {
            var $input = $("#dsForm-parquetParser").find("input.text");
            $input.removeData("name");
            var parser = "parquetTools";
            resetForm({
                dsName: "test",
                format: "PARQUETFILE",
                udfQuery: {
                    parquetParser: parser
                }
            });

            expect(loadArgs.getFormat()).to.equal("PARQUETFILE");
            expect($input.data("name"))
            .to.equal(parser);
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
            loadArgs.reset();
        });
    });

    describe("Error Section Test", function() {
        var loadArgs;

        before(function() {
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
        });

        it("should click suggest to change format", function() {
            var $errorSection = $previewCard.find(".errorSection");
            DSConfig.__testOnly__.toggleFormat("TEXT");
            $errorSection.find(".content").html('<div class="suggest" data-format="CSV"></div>');
            $errorSection.find(".suggest").click();
            expect(loadArgs.getFormat()).to.equal("CSV");
            $errorSection.find(".content").empty();
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe('Advanced Section Test', () => {
        let $advanceSection;
        let loadArgs;

        before(() => {
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.setFormat('CSV');
            $advanceSection = $form.find(".advanceSection");
            const table = '<thead><tr><td>H1</td></tr></thead>' +
                            '<tbody><tr><td>cell</td></tr></tbody>';
            $previewTable.html(table);
        });

        it("should click to toggle advanced section", function() {
            const $button = $advanceSection.find(".listWrap");
            expect($advanceSection.hasClass("active")).to.be.false;
            // open advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.true;
            // close advance option
            $button.click();
            expect($advanceSection.hasClass("active")).to.be.false;
        });

        it("should add file name", () => {
            const $fileName = $advanceSection.find(".fileName");
            $fileName.find('.checkboxSection').click();
            expect($fileName.hasClass('active')).to.be.true;
            expect($previewTable.find('tbody .extra').length).to.equal(1);
        });

        it('should input file name header', () => {
            const $fileName = $advanceSection.find(".fileName");
            $fileName.find('input').val('fileName').trigger('input');
            const text = $previewTable.find(".extra.fileName .text").text();
            expect(text).to.equal('fileName');
        });

        it('should remvoe file name', () => {
            const $fileName = $advanceSection.find(".fileName");
            $fileName.find('.checkboxSection').click();
            expect($fileName.hasClass('active')).to.be.false;
            expect($previewTable.find('tbody .extra').length).to.equal(0);
        });

        it("should add row number", () => {
            const $rowNumber = $advanceSection.find(".rowNumber");
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.true;
            expect($previewTable.find('tbody .extra').length).to.equal(1);
        });

        it('should input row number header', () => {
            const $rowNumber = $advanceSection.find(".rowNumber");
            $rowNumber.find('input').val('rowNumber').trigger('input');
            const text = $previewTable.find(".extra.rowNumber .text").text();
            expect(text).to.equal('rowNumber');
        });

        it("should remove row number", () => {
            const $rowNumber = $advanceSection.find(".rowNumber");
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.false;
            expect($previewTable.find('tbody .extra').length).to.equal(0);
        });

        it("should not add row number in error case", () => {
            const $errorSection = $previewWrap.find(".errorSection");
            $errorSection.removeClass('hidden');

            const $rowNumber = $advanceSection.find(".rowNumber");
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.true;
            expect($previewTable.find('tbody .extra').length).to.equal(0);
            // toggle back
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.false;
            expect($previewTable.find('tbody .extra').length).to.equal(0);

            // reset
            $errorSection.addClass('hidden');
        });

        it("should not add row number in xml case", () => {
            loadArgs.setFormat('XML');

            const $rowNumber = $advanceSection.find(".rowNumber");
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.true;
            expect($previewTable.find('tbody .extra').length).to.equal(0);
            // toggle back
            $rowNumber.find('.checkboxSection').click();
            expect($rowNumber.hasClass('active')).to.be.false;
            expect($previewTable.find('tbody .extra').length).to.equal(0);

            // reset
            loadArgs.setFormat('CSV');
        });

        after(function() {
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Preview UI Behavior Test", function() {
        before(function() {
            DSConfig.__testOnly__.restoreForm({
                "dsName": "test",
                "moduleName": "default",
                "funcName": "openExcel",
                "format": "TEXT",
                "hasHeader": true,
                "fieldDelim": "",
                "lineDelim": "\n",
                "quoteChar": "\"",
                "skipRows": 1
            });
            // selection of range needs it to be visible
            DataSourceManager.switchView(DataSourceManager.View.Preview);
           $("#dsForm-config").removeClass("hidingPreview");
        });

        // it("should apply highligher", function() {
        //     var highlighter;
        //     // case 1
        //     $previewTable.addClass("has-delimiter");
        //     $previewTable.mouseup();
        //     highlighter = DSConfig.__testOnly__.get().highlighter;
        //     expect(highlighter).to.be.empty;

        //     // case 2
        //     $previewTable.removeClass("has-delimiter").addClass("truncMessage");
        //     $previewTable.mouseup();
        //     highlighter = DSConfig.__testOnly__.get().highlighter;
        //     expect(highlighter).to.be.empty;

        //     // case 3
        //     $previewTable.removeClass("truncMessage");

        //     $previewTable.html("a");

        //     var range = document.createRange();
        //     range.setStart($previewTable[0].childNodes[0], 0);
        //     range.setEnd($previewTable[0].childNodes[0], 1);
        //     var sel = window.getSelection();
        //     sel.removeAllRanges();
        //     sel.addRange(range);

        //     $previewTable.mouseup();
        //     highlighter = DSConfig.__testOnly__.get().highlighter;
        //     expect(highlighter).to.equal("a");

        //     $previewTable.empty();
        // });

        // it("should remove highlighter", function() {
        //     $previewCard.find(".rmHightLight").click();
        //     var highlighter = DSConfig.__testOnly__.get().highlighter;
        //     expect(highlighter).to.be.empty;
        // });

        it("should apply highlighter to delimiter", function() {
            DSConfig.__testOnly__.set(null, "a");
            $previewCard.find(".highlight").click();
            expect(loadArgs.getFieldDelim()).to.equal("a");
        });

        it("should input to set quote", function() {
            $quoteInput.val("a").focus().trigger("input");
            expect(loadArgs.getQuote()).to.equal("a");
        });

        it("should click header box to toggle promote header", function() {
            var $checkbox = $headerCheckBox.find(".checkbox");
            var hasHeader = $checkbox.hasClass("checked");

            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(!hasHeader);
            expect(loadArgs.useHeader()).to.equal(!hasHeader);

            // toggle back
            $headerCheckBox.click();
            expect($checkbox.hasClass("checked")).to.equal(hasHeader);
            expect(loadArgs.useHeader()).to.equal(hasHeader);
        });

        it("should click colGrab to trigger col resize", function() {
            var oldFunc = TblAnim.startColResize;
            var test = false;
            TblAnim.startColResize = function() {
                test = true;
            };

            var $ele = $('<div class="colGrab"></div>');
            $previewTable.append($ele);
            // nothing happen
            $ele.mousedown();
            expect(test).to.be.false;
            // trigger resize
            $ele.trigger(fakeEvent.mousedown);
            expect(test).to.be.true;

            $ele.remove();
            TblAnim.startColResize = oldFunc;
        });

        it("should click to fetch more rows", function(done) {
            DSConfig.__testOnly__.set("abc");
            $("#dsForm-skipRows").val("0");
            var test = false;
            var oldFunc = XcalarPreview;
            XcalarPreview = function() {
                test = true;
                return PromiseHelper.resolve([{
                    buffer: "efg"
                }]);
            };

            var $section = $previewTable.closest(".datasetTbodyWrap");
            var $previewBottom = $section.find(".previewBottom");
            $previewBottom.addClass("load");
            $previewBottom.find(".action").click();

            UnitTest.testFinish(function() {
                return !$previewBottom.hasClass("load");
            })
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldFunc;
            });
        });

        it("should click .tooltipOverflow to trigger auto tooltip", function() {
            var $fakeDiv = $('<div class="tooltipOverflow"></div>');
            var oldAdd = xcTooltip.add;
            var oldAuto = xcTooltip.auto;
            var test1 = false;
            var test2 = false;
            xcTooltip.add = function() {
                test1 = true;
            };
            xcTooltip.auto = function() {
                test2 = true;
            };
            $previewWrap.append($fakeDiv);
            $fakeDiv.trigger(fakeEvent.mouseenter);
            expect(test1).to.be.true;
            expect(test2).to.be.true;

            $fakeDiv.remove();
            xcTooltip.add = oldAdd;
            xcTooltip.auto = oldAuto;
        });

        it("should click .cancelLoad to cancel preview load", function() {
            var $fakeBtn = $('<div class="cancelLoad"></div>');
            var oldFunc = QueryManager.cancelQuery;
            var test = false;
            QueryManager.cancelQuery = function() {
                test = true;
            };
            $previewWrap.append($fakeBtn);
            $fakeBtn.click();
            expect(test).to.be.true;

            $fakeBtn.remove();
            QueryManager.cancelQuery = oldFunc;
        });

        it("should change format", function() {
            loadArgs.set({format: "CSV"});
            $("#fileFormat .text").data('format', 'CSV');

            $("#fileFormatMenu").find("li[name=TEXT]").trigger(fakeEvent.mouseup);
            expect(loadArgs.getFormat()).to.equal("TEXT");
            expect($("#fileFormat input").val()).to.equal("Text");
            // clear up
            loadArgs.set({format: "CSV"});
            $("#fileFormat .text").data('format', 'CSV');
        });

        it("should click confirm to submit the form", function() {
            // make an error case
            $form.find(".dsName").eq(0).val("");
            $form.find(".confirm:not(.creatTable)").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("should click cancel to back to form", function() {
            var $button = $form.find(".cancel");
            var oldForm = DataSourceManager.startImport;
            var test1 = test2 = false;

            DataSourceManager.startImport = function() { test1 = true; };
            var cb = () => test2 = true;

            // case 1
            DSConfig.__testOnly__.setCB(null);
            $button.click();
            expect(test1).to.be.true;
            expect(test2).to.be.false;

            // case 2
            test1 = false;
            DSConfig.__testOnly__.setCB(cb);
            $button.click();
            expect(test1).to.be.false;
            expect(test2).to.be.true;

            DSConfig.__testOnly__.setCB(null);
            DataSourceManager.startImport = oldForm;
        });

        it('should click label to copy dataset name', () => {
            const oldFunc = xcUIHelper.copyToClipboard;
            let test = false;
            xcUIHelper.copyToClipboard = () => { test = true };
            $("#importDataForm-content").find('.inputPart .row label').click();
            expect(test).to.be.true;
            xcUIHelper.copyToClipboard = oldFunc;
        });

        after(function() {
            DSConfig.__testOnly__.set();
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("Preview file change Test", function() {
        var oldHTML;
        var $previewFile;
        var $ul;
        var loadArgs;
        var oldPreview;
        var oldListFile;
        var listTest;

        before(function() {
            $previewFile = $("#preview-file");
            $ul = $previewFile.find("ul");
            oldHTML = $ul.html();
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.set();
            loadArgs.files = [{path: "path1"}, null, {path: "path4"}];


            var fakeHtml = '<li class="hint active">Hint</li>' +
                            '<li class="mainPath test1" data-path="path1" data-index="0">path1</li>' +
                            '<li class="mainPath singlePath test2" data-index="1">path2</li>' +
                            '<div class="subPathList test3" data-index="0"></div>' +
                            '<div class="subPathList" data-index="2">' +
                                '<li class="test4">path4</li>' +
                            '</div>';
            $ul.html(fakeHtml);
            loadArgs.setPreviewingSource(0, "path1");

            oldPreview = XcalarPreview;
            oldListFile = XcalarListFiles;
            XcalarPreview = function() {
                return PromiseHelper.reject();
            };
            XcalarListFiles = function() {
                listTest = true;
                return PromiseHelper.resolve({
                    numFiles: 1,
                    files: [{
                        name: "test",
                        attr: {
                            isDirectory: false
                        }
                    }]
                });
            };
        });

        it("open menu should set active preview file", function() {
            $previewFile.click();
            expect($ul.find(".test1").hasClass("active")).to.be.true;
            // close menu
            $previewFile.click();
        });

        it("click hint should have nothing happens", function() {
            $ul.find(".active").removeClass("active");
            $ul.find(".hint").trigger(fakeEvent.mouseup);
            expect($ul.find(".active").length).to.equal(0);
        });

        if ("should collapse main path", function() {
            var $li = $ul.find(".test1");
            $li.trigger(fakeEvent.mouseup);
            expect($li.hasClass("collapse")).to.be.true;
        });

        it("should select main path", function(done) {
            var $li = $ul.find(".test1").addClass("collapse");
            $li.trigger(fakeEvent.mouseup);
            expect($li.hasClass("collapse")).to.be.false;

            UnitTest.testFinish(function() {
                return listTest === true;
            })
            .then(function() {
                expect($ul.find(".test3").text()).not.to.be.empty;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should select single path", function() {
            $ul.find(".test2").trigger(fakeEvent.mouseup);
            expect(loadArgs.getPreivewIndex()).to.equal(1);
        });

        it("should select sub path", function() {
            $ul.find(".test4").trigger(fakeEvent.mouseup);
            expect(loadArgs.getPreivewIndex()).to.equal(2);
        });

        after(function() {
            $ul.html(oldHTML);
            loadArgs.reset();
            XcalarPreview = oldPreview;
            XcalarListFiles = oldListFile;
        });
    });

    describe("csv column renaming and type casting", function() {
        before(function(done) {
            DSConfig.show({
                "targetName": testDatasets.sp500.targetName,
                "files": [{path: testDatasets.sp500.path}]
            }, null)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("rename input should show", function(done) {
            expect($previewTable.find(".editableHead").length).to.equal(2);
            expect($("#importColRename").length).equal(0);

            $previewTable.find(".editableHead").eq(0).trigger(fakeEvent.mousedown);
            expect($("#importColRename").length).equal(1);
            expect($("#importColRename").width()).to.be.gt(40);
            expect($("#importColRename").width()).to.be.lt(140);
            UnitTest.wait()
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("rename input should show error for if starts with number", function() {
            var cachedFn = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect(options.title).to.equal("Invalid name: a name can only begin with a letter or underscore(_).");
                called = true;
            };

            $("#importColRename").val("5");
            $("#importColRename").trigger("blur").blur();

            expect($("#importColRename").length).equal(1);
            expect(called).to.be.true;
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("COLUMN0");

            xcTooltip.transient = cachedFn;
        });

        it("rename input should show error for if duplicate name", function() {
            var cachedFn = xcTooltip.transient;
            var called = false;
            xcTooltip.transient = function($el, options) {
                expect(options.title).to.equal("A column with the same name already exists. Please choose another name.");
                called = true;
            };

            $("#importColRename").val("column1");
            $("#importColRename").trigger("blur").blur();

            expect($("#importColRename").length).equal(1);
            expect(called).to.be.true;
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("COLUMN0");

            xcTooltip.transient = cachedFn;
        });

        it("rename input blur with invalid should not change column name", function () {
            $("#importColRename").val("5b");
            expect($("#importColRename").length).equal(1);
            $previewCard.find(".previewSection").scrollLeft(1).scroll();
            expect($("#importColRename").length).equal(0);
            expect($previewTable.find(".editableHead").eq(0).val()).to.equal("COLUMN0");
        });

        // it("rename input with valid name should change column name", function () {
        //     expect($("#importColRename").length).equal(1);
        //     expect($previewTable.find(".editableHead").eq(0).val()).to.equal("column0");
        //     $("#importColRename").val("renamed");
        //     expect($("#importColRename").length).equal(1);
        //     $("#importColRename").trigger("blur").blur();
        //     expect($("#importColRename").length).equal(0);
        //     expect($previewTable.find(".editableHead").eq(0).val()).to.equal("renamed");
        //     $previewTable.find(".editableHead").eq(0).val("COLUMN0");
        // });

        // it("cast dropdown should show on click", function() {
        //     expect($previewCard.find(".castDropdown").is(":visible")).to.be.false;
        //     $previewTable.find(".editable").eq(0).find(".flex-left").click();
        //     expect($previewCard.find(".castDropdown").is(":visible")).to.be.true;
        // });

        // it("cast dropdown li should work", function() {
        //     expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.true;
        //     expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.false;
        //     $previewCard.find(".castDropdown").find(".type-boolean").trigger(fakeEvent.mouseup);
        //     expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.false;
        //     expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.true;

        //     $previewCard.find(".castDropdown").find(".type-integer").trigger(fakeEvent.mouseup);
        //     expect($previewTable.find(".header").eq(1).hasClass("type-integer")).to.be.true;
        //     expect($previewTable.find(".header").eq(1).hasClass("type-boolean")).to.be.false;
        // });

        it("check bulkduplicate names should work", function(done) {
            var fn = DSConfig.__testOnly__.checkBulkDuplicateNames;
            var headers = [{colName: "AA"}, {colName: "BB"}, {colName: "CC"}];
            var firstPass = false;
            fn(headers)
            .then(function() {
                firstPass = true;
                var headers = [{colName: "AA"}, {colName: "BB"}, {colName: "BB"}];
                setTimeout(function() {
                    UnitTest.hasAlertWithText(ErrTStr.DuplicateColNames + ":NameColumn Nos.BB2,3", {confirm: true});
                });
                return fn(headers);
            })
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(firstPass).to.be.true;
                done();
            });
        });

        after(function() {
            DSConfig.__testOnly__.set();
            DSConfig.__testOnly__.resetForm();
        });
    });

    describe("resizing bottomcard", function() {
        it("should resize", function() {
            var $bar = $previewCard.find(".cardBottom .ui-resizable-n").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY + 30 });

            expect($bar.offset().top > pageY);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY + 30});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
            expect($bar.offset().top === pageY);
        });
    });

    describe("Smart Detect Test", function() {
        let loadArgs;

        before(function() {
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
        });

        describe("suggestDetect test", function() {
            let suggestDetect;
            let oldAlert;
            let msg;

            before(function() {
                suggestDetect = DSConfig.__testOnly__.suggestDetect;
                oldAlert = Alert.show;
                Alert.show = (options) => {
                    msg = options.msgTemplate;
                    options.buttons[0].func();
                };
            });

            beforeEach(function() {
                msgTemplate = "";
            });

            it("should detect different format", function(done) {
                loadArgs.setFormat("JSON");
                suggestDetect({format: DSFormat.SpecialJSON})
                .then(function(res) {
                    expect(res).to.equal(false);
                    expect(msg).to.contains("format");
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should detect different header", function(done) {
                loadArgs.setFormat("JSON");
                loadArgs.setHeader(true);
                suggestDetect({
                    format: "JSON",
                    hasHeader: false
                })
                .then(function(res) {
                    expect(res).to.equal(false);
                    expect(msg).to.contains("header promotion");
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should detect line delimiter", function(done) {
                loadArgs.setFormat("CSV");
                loadArgs.setHeader(false);
                loadArgs.setLineDelim("\r");
                suggestDetect({
                    format: "CSV",
                    hasHeader: false,
                    lineDelim: "\n"
                })
                .then(function(res) {
                    expect(res).to.equal(false);
                    expect(msg).to.contains("line delimiter");
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should detect line delimiter", function(done) {
                loadArgs.setFormat("CSV");
                loadArgs.setHeader(false);
                loadArgs.setLineDelim("\n");
                loadArgs.setFieldDelim(",");
                suggestDetect({
                    format: "CSV",
                    hasHeader: false,
                    lineDelim: "\n",
                    fieldDelim: "\t"
                })
                .then(function(res) {
                    expect(res).to.equal(false);
                    expect(msg).to.contains("field delimiter");
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should resolve with apply new change", function(done) {
                Alert.show = (options) => {
                    options.buttons[1].func();
                };
                loadArgs.setFormat("JSON");
                suggestDetect({
                    format: "CSV"
                })
                .then(function(res) {
                    expect(res).to.equal(true);
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            it("should resolve if no change", function(done) {
                loadArgs.setFormat("JSON");
                suggestDetect({
                    format: "JSON",
                    hasHeader: false,
                })
                .then(function(res) {
                    expect(res).to.equal(undefined);
                    done();
                })
                .fail(function() {
                    done("fail");
                });
            });

            after(function() {
                Alert.show = oldAlert;
            });
        });

        after(function() {
            loadArgs.reset();
        });
    });

    describe("Auto Header Check Test", function() {
        var loadArgs;

        before(function() {
            loadArgs = DSConfig.__testOnly__.get().loadArgs;
            loadArgs.set();
        });

        it("slowPreviewCheck should alert when too many files", function(done) {
            loadArgs.files = new Array(20);
            var def = DSConfig.__testOnly__.slowPreviewCheck();
            UnitTest.hasAlertWithTitle(DSFormTStr.ImportMultiple);
            def
            .then(function() {
                done("fail");
            })
            .fail(function() {
                done();
            });
        });

        it("slowPreviewCheck should alert when it's slow target", function(done) {
            var oldFunc = DSTargetManager.isSlowPreviewTarget;
            var test = false;
            DSTargetManager.isSlowPreviewTarget = function() {
                test = true;
                return true;
            };

            loadArgs.files = [];
            var def = DSConfig.__testOnly__.slowPreviewCheck();
            UnitTest.hasAlertWithTitle(DSFormTStr.ImportMultiple, {confirm: true});
            def
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DSTargetManager.isSlowPreviewTarget = oldFunc;
            });
        });

        it("slowPreviewCheck should not alert in normal case", function(done) {
            loadArgs.files = [];
            var def = DSConfig.__testOnly__.slowPreviewCheck();
            def
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("autoDetectSourceHeaderTypes should work", function(done) {
            var oldPreview = XcalarPreview;
            var typedColumnsList = [];
            var dsArgs = {
                lineDelim: "\n",
                fieldDelim: ",",
                hasHeader: true,
                quoteChar: "\""
            };
            XcalarPreview = function() {
                var buffer = 'header\n1\n1\n2\n3';
                return PromiseHelper.resolve({buffer: buffer});
            };

            DSConfig.__testOnly__.autoDetectSourceHeaderTypes({}, "testTarget", dsArgs, typedColumnsList, 0)
            .then(function() {
                expect(typedColumnsList.length).to.equal(1);
                var typedColumns = typedColumnsList[0];
                expect(typedColumns).to.be.an("array");
                expect(typedColumns.length).to.equal(1);
                var colInfo = typedColumns[0];
                expect(colInfo.colName).to.equal("header");
                expect(colInfo.colType).to.equal(ColumnType.integer);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        it("autoDetectSourceHeaderTypes should handle fail case", function(done) {
            var oldPreview = XcalarPreview;
            var typedColumnsList = [];
            var dsArgs = {
                lineDelim: "\n",
                fieldDelim: ",",
                hasHeader: true,
                quoteChar: "\""
            };
            XcalarPreview = function() {
                return PromiseHelper.reject("test");
            };

            DSConfig.__testOnly__.autoDetectSourceHeaderTypes({}, "testTarget", dsArgs, typedColumnsList, 0)
            .then(function() {
                expect(typedColumnsList.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        it("getTypedColumnsList should resolve with non CSV format", function(done) {
            var dsArgs = {format: "JSON"};
            DSConfig.__testOnly__.getTypedColumnsList([], dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getTypedColumnsList should resolve with non multi source case", function(done) {
            var typedColumns = [{colName: "test", colType: ColumnType.integer}];
            var dsArgs = {format: "CSV"};
            loadArgs.multiDS = false;

            DSConfig.__testOnly__.getTypedColumnsList(typedColumns, dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(1);
                expect(typedColumnsList[0][0].colName).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("getTypedColumnsList should auto detect", function(done) {
            var typedColumns = [{colName: "test", colType: ColumnType.integer}];
            var dsArgs = {format: "CSV"};
            loadArgs.multiDS = true;
            loadArgs.setPreviewingSource(0, "testFile");
            loadArgs.headersList[1] = [{colName: "test2", colType: ColumnType.integer}];
            loadArgs.files = [{}, {}, {}];

            var oldPreview = XcalarPreview;
            XcalarPreview = function() {
                return PromiseHelper.reject("test");
            };

            DSConfig.__testOnly__.getTypedColumnsList(typedColumns, dsArgs)
            .then(function(typedColumnsList) {
                expect(typedColumnsList).to.be.an("array");
                expect(typedColumnsList.length).to.equal(2);
                expect(typedColumnsList[0][0].colName).to.equal("test");
                expect(typedColumnsList[1][0].colName).to.equal("test2");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarPreview = oldPreview;
            });
        });

        after(function() {
            loadArgs.reset();
        });
    });

    describe("Show Preview and Submit Test", function() {
        before(function() {
            DSConfig.__testOnly__.resetForm();
            DSForm.show();
        });

        it("DSConfig.show() should work", function(done) {
            DSConfig.show({
                "targetName": testDatasets.sp500.targetName,
                "files": [{path: testDatasets.sp500.path}]
            }, null)
            .then(function() {
                expect($previewTable.html()).not.to.equal("");
                expect($formatText.data("format")).to.equal("CSV");
                expect($headerCheckBox.find(".checkbox").hasClass("checked"))
                .to.be.false;
                expect($lineText.val()).to.equal("\\n");
                expect($fieldText.val()).to.equal("\\t");
                expect($quoteInput.val()).to.equal("\"");
                expect($skipInput.val()).to.equal("0");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    after(function() {
        StatusBox.forceHide();

        UnitTest.offMinMode();
    });
});
