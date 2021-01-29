describe("SQLOpPanel Test", function() {
    var sqlOpPanel;
    var $sqlOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions = {};
    var parentNode;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeSQL({});
            parentNode = new DagNodeSQL({
                title: "Label 1"
            });
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                        type: "number"
                    }), new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'stringCol'),
                        type: "string"
                    })]
                }}
            };

            openOptions = {
                udfDisplayPathPrefix : UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            };

            sqlOpPanel = SQLOpPanel.Instance;
            editor = sqlOpPanel._editor;
            $sqlOpPanel = $('#sqlOpPanel');
            done();
        });

    });

    describe("Basic SQL Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            sqlOpPanel.close();
            expect($('#sqlOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            expect($('#sqlOpPanel').hasClass("xc-hidden")).to.be.false;
            if ($sqlOpPanel.find(".advancedEditor").is(":visible")) {
                $("#sqlOpPanel .bottomSection .xc-switch").click();
            }
        });

        it ("Should be hidden when close is called after showing", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            sqlOpPanel.close();
            $('#formWaitingBG').remove();
            expect($('#sqlOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $('#sqlOpPanel .close').click();
            $('#formWaitingBG').remove();
            expect($('#sqlOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("SQL Panel Tests", function() {

        before(function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $('#formWaitingBG').remove();
        });

        describe("initial state", function() {
            it("should have 0 identifiers", function() {
                expect($sqlOpPanel.find(".identifiersList .source").length).to.equal(0);
                expect($sqlOpPanel.find(".identifiersList .dest").length).to.equal(0);
                expect($sqlOpPanel.find(".tableInstruction").is(":visible")).to.be.true;
                expect($sqlOpPanel.find(".noTableHint").is(":visible")).to.be.true;
            });
            it("drop as you go should be checked", function() {
                expect($sqlOpPanel.find(".dropAsYouGo .checkbox.checked").length).to.equal(1);
            });

        });

        describe("table mapping", function() {
            it("should have identifiers after connection changes", function() {
                node.connectToParent(parentNode, 0);
                expect($sqlOpPanel.find(".identifiersList .source").length).to.equal(1);
                expect($sqlOpPanel.find(".identifiersList .dest").length).to.equal(1);
                expect($(".identifiersList").find(".source").text().trim()).to.equal("Not Found");
                expect($(".identifiersList").find(".dest .text").text().trim()).to.equal("Label 1");
                expect($sqlOpPanel.find(".noTableHint").is(":visible")).to.be.true;
                node.disconnectFromParent(parentNode, 0);
                expect($sqlOpPanel.find(".identifiersList .source").length).to.equal(0);
                expect($sqlOpPanel.find(".identifiersList .dest").length).to.equal(0);
                expect($sqlOpPanel.find(".noTableHint").is(":visible")).to.be.true;
            });
        });
    });

    describe("submit", function() {
        it("should submit", function(done) {
            node.connectToParent(parentNode, 0);
            SQLEditorSpace.Instance.getEditor().setValue("Select * FROM test");

            let called = false;
            node.compileSQL = () => {
                called = true;
                node.setXcQueryString("queryString");
                return PromiseHelper.resolve({newTableName: "newName", allCols: [], xcQueryString: "queryString", tableSrcMap: new Map()});
            };
            UnitTest.testFinish(() => {
                return $(".identifiersList").find(".source input").length &&
                        $(".identifiersList").find(".source input").val().trim().toUpperCase() === "TEST";
            })
            .then(() => {
                $sqlOpPanel.find(".submit").click();
                return  UnitTest.testFinish(()=> {
                    return !$sqlOpPanel.is(":visible");
                })
            })
            .then(() => {
                expect(called).to.be.true;
                expect(node.getIdentifiers().size).to.equal(1);
                expect(node.getIdentifiers().get(1).toUpperCase()).to.equal("TEST");
                expect(node.xcQueryString).to.equal("queryString");
                expect(node.configured).to.be.true;
                expect(node.getParam().sqlQueryStr).to.equal("Select * FROM test");
                done();
            })
        });
    });

    describe("Advanced Mode related SQL Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $('#formWaitingBG').remove();
            if (!sqlOpPanel._isAdvancedMode()) {
                $("#sqlOpPanel .bottomSection .xc-switch").click();
            }
            editor.setValue(JSON.stringify({}, null, 4));
            $("#sqlOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            UnitTest.hasStatusBoxWithError("Configuration should have required property 'sqlQueryStr'");
            sqlOpPanel.close();
        });

        it("should submit", function(done) {
            Alert.hide();
            let struct = {
                "sqlQueryStr": "Select * FROM a",
                "mapping": [{
                    identifier: "a",
                    source: 1
                }],
                "dropAsYouGo": true
            };
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $('#formWaitingBG').remove();
            if (!sqlOpPanel._isAdvancedMode()) {
                $("#sqlOpPanel .bottomSection .xc-switch").click();
            }

            editor.setValue(JSON.stringify(struct, null, 4));
            $("#sqlOpPanel .bottomSection .btn-submit").click();
            if ($("#alertModal").is(":visible")) {
                console.log($("#alertModal").text().trim());
            }

            expect($("#alertModal").is(":visible")).to.be.false;

            node.compileSQL = () => {
                return PromiseHelper.resolve({newTableName: "newName", allCols: [], xcQueryString: "queryString", tableSrcMap: new Map()});
            };

            UnitTest.testFinish(()=> {
                return !$sqlOpPanel.is(":visible");
            })
            .then(() => {
                expect(node.getIdentifiers().size).to.equal(1);
                expect(node.getIdentifiers().get(1).toUpperCase()).to.equal("A");
                expect(node.configured).to.be.true;
                expect(node.getParam().sqlQueryStr).to.equal("Select * FROM a");
                done();
            })
        });
    });

    after(function() {
        sqlOpPanel.close();
    });
});
