describe("Export Operator Panel Test", function() {
    var exportOpPanel;
    var oldDriverList;
    var oldDatTargetList;
    var oldJSONParse;
    var calledDriverList = false;
    var calledTargetList = false;
    var node;
    var editor;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            oldDriverList = XcalarDriverList;
            node = new DagNodeExport({});
            XcalarDriverList = function() {
                calledDriverList = true;
                return PromiseHelper.deferred().resolve([
                    {
                        "name": "test1",
                        "params" : [
                            {
                                "name": "param1",
                                "type": "string",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            }
                        ]
                    },
                    {
                        "name": "test2",
                        "params" : [
                            {
                                "name": "param1",
                                "type": "integer",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            }
                        ]
                    },
                    {
                        "name": "full test driver",
                        "params" : [
                            {
                                "name": "str param",
                                "type": "string",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            },
                            {
                                "name": "int param",
                                "type": "integer",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            },
                            {
                                "name": "bool param",
                                "type": "boolean",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            },
                            {
                                "name": "secret optional param",
                                "type": "string",
                                "description": "desc",
                                "secret": true,
                                "optional": true
                            },
                            {
                                "name": "target param",
                                "type": "target",
                                "description": "desc",
                                "secret": false,
                                "optional": false
                            },
                        ]
                    },
                ]);
            };

            oldDatTargetList = DSTargetManager.getAllTargets;
            DSTargetManager.getAllTargets = function() {
                calledTargetList = true;
                return [
                    {"name": "target1"},
                    {"name": "target2"},
                ];
            };
            oldJSONParse = JSON.parse;
            exportOpPanel = ExportOpPanel.Instance;
            editor = exportOpPanel.getEditor();
            done();
        });
    });

    describe("Basic Export Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            exportOpPanel.close();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            exportOpPanel.close();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $('#exportOpPanel .close').click();
            expect($('#exportOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Standard View Driver related Export Panel Tests", function() {

        it ("Should populate driver list", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect(calledDriverList).to.be.true;
            expect($("#exportDriverList .exportDriver").length).to.equal(3);
        });

        it ("Should display parameters when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("test1");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .exportArg").length).to.equal(1);
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .exportArg").length).to.equal(5);
        });

        it ("Should display text params correctly when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .str_param").length).to.equal(1);
            var $param = $("#exportOpPanel .str_param").eq(0);
            expect($param.find(".label").text()).to.equal("Str param:");
            expect($param.find("input").attr("type")).to.equal("text");
        });

        it ("Should display integer params correctly when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .int_param").length).to.equal(1);
            var $param = $("#exportOpPanel .int_param").eq(0);
            expect($param.find(".label").text()).to.equal("Int param:");
            expect($param.find("input").attr("type")).to.equal("number");
        });

        it ("Should display boolean params correctly when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .bool_param").length).to.equal(1);
            var $param = $("#exportOpPanel .bool_param").eq(0);
            expect($param.find(".label").text()).to.equal("Bool param:");
        });

        it ("Should display secret/optional params correctly when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .secret_optional_param").length).to.equal(1);
            var $param = $("#exportOpPanel .secret_optional_param").eq(0);
            expect($param.find(".label").text()).to.equal("(Optional) Secret optional param:");
            expect($param.find("input").attr("type")).to.equal("password");
        });

        it ("Should display target params correctly when a driver is selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("full test driver");
            exportOpPanel.renderDriverArgs();
            expect($("#exportOpPanel .target_param").length).to.equal(1);
            var $param = $("#exportOpPanel .target_param").eq(0);
            expect($param.find(".label").text()).to.equal("Target param:");
            expect($param.find(".exportDrivers li").length).to.equal(2);
        });

        it ("Should show statusbox error if a non optional param isn't filled", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportDriver").val("test1");
            exportOpPanel.renderDriverArgs();
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it ("Should save correctly", function (done) {
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName("prefix", 'a'),
                        type: "number"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            };

           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            if (exportOpPanel._isAdvancedMode()) {
                $("#exportOpPanel .bottomSection .xc-switch").click();
                exportOpPanel._switchMode(false);
            }
            UnitTest.testFinish(function() {
                return $("#exportOpPanel .xc-waitingBG").length === 0;
            })
            .then(function() {
                $("#exportOpPanel .col").eq(0).click();
                $("#exportDriver").val("test1");
                $("#exportDriver").change();
                exportOpPanel.renderDriverArgs();
                $("#exportOpPanel .exportArg").eq(0).find('input').val("demo");
                $("#exportOpPanel .exportArg").eq(0).find('input').change();
                $("#exportOpPanel .bottomSection .btn-submit").click();
                var params = node.getParam().driverArgs;
                var keys = Object.keys(params);
                expect(keys.length).to.equal(1);
                expect(keys[0]).to.equal("param1");
                expect(params["param1"]).to.equal("demo");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Advanced View Driver related Export Panel Tests", function() {
        before(function() {
            node = new DagNodeExport({});
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(null, 'a'),
                        type: "number"
                    }),
                    new ProgCol({
                        backName: xcHelper.getPrefixColName(null, 'b'),
                        type: "number"
                    }),
                    new ProgCol({
                        backName: xcHelper.getPrefixColName(null, 'c'),
                        type: "number"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            };
        })
        it("Should show statusbox error if columns isnt a field", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({}, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver is null", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }]
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver is not real", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "unreal"
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if there arent enough arguments specified", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "test1",
                    "driverArgs": {}
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if driver arguments don't match up", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "test1",
                    "driverArgs": {"invalidArg": null}
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it("Should show statusbox error if integer argument is invalid", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "test2",
                    "driverArgs": {"param1": "123a"}
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it ("Should show statusbox error if a non optional param isn't filled", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "test1",
                    "driverArgs": {"param1": null}
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            exportOpPanel.close();
        });

        it ("Should save correctly if JSON is correct", function () {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $("#exportOpPanel .bottomSection .xc-switch").click();
            exportOpPanel._switchMode(true);
            editor.setValue(JSON.stringify({
                    "columns": [{
                        "sourceColumn": "a",
                        "destColumn": "a"
                    }],
                    "driver": "test1",
                    "driverArgs": {"param1": "demo"}
                }, null, 4));
            $("#exportOpPanel .bottomSection .btn-submit").click();
            var params = node.getParam().driverArgs;
            var keys = Object.keys(params);
            expect(keys.length).to.equal(1);
            expect(keys[0]).to.equal("param1");
            expect(params["param1"]).to.equal("demo");
            exportOpPanel.close();
        });
    });

    describe("Column Filtering related Export Panel Tests", function() {
        before(function() {
            node = new DagNodeExport({});
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName("prefix", 'a'),
                        type: "number"
                    }),
                    new ProgCol({
                        backName: xcHelper.getPrefixColName("prefix", 'b'),
                        type: "number"
                    }),
                    new ProgCol({
                        backName: xcHelper.getPrefixColName("prefix", 'c'),
                        type: "number"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            };
        })

        it("should hide columns when an input is specified", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $('#exportOpColumns .searchInput').val("a").trigger("input");
            expect($('#exportOpColumns .col.xc-hidden').length).to.equal(2);
            $('#exportOpColumns .searchInput').val("").trigger("input");
            expect($('#exportOpColumns .col.xc-hidden').length).to.equal(0);
            exportOpPanel.close(node);
        });

        it("should only select all of the filtered columns", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $('#exportOpColumns .searchInput').val("a").trigger("input");
            $('#exportOpColumns .selectAllWrap').click();
            expect($('#exportOpColumns .col.checked').length).to.equal(1);
            exportOpPanel.close(node);
        })

        it("should change the select all checkbox depending on what's selected", function() {
           DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $('#exportOpColumns .searchInput').val("a").trigger("input");
            $('#exportOpColumns .selectAllWrap').click();
            expect($('#exportOpColumns .selectAllWrap .checkbox').hasClass("checked")).to.be.true;
            $('#exportOpColumns .searchInput').val("").trigger("input");
            expect($('#exportOpColumns .selectAllWrap .checkbox').hasClass("checked")).to.be.false;
            $('#exportOpColumns .searchInput').val("a").trigger("input");
            expect($('#exportOpColumns .selectAllWrap .checkbox').hasClass("checked")).to.be.true;
            exportOpPanel.close(node);
        });
    });

    after(function() {
        exportOpPanel.close();
        XcalarDriverList = oldDriverList;
        DSTargetManager.getAllTargets = oldDatTargetList;
        JSON.parse = oldJSONParse;
    });
});