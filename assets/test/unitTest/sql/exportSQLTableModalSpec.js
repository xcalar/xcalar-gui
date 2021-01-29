describe("Export SQL Table Modal Test", function() {
    var $modal;
    var columns;
    var oldDriverList;
    var calledDriverList = false;


    before(function() {
        UnitTest.onMinMode();
        $modal = $("#exportSQLTableModal");
        columns = [
            {name: "col1", getBackColName: function() {return "col1";}, getType: function() {return "integer";}},
            {name: "col2", getBackColName: function() {return "col2";}, getType: function() {return "string";}},
            {name: "col3", getBackColName: function() {return "col3";}, getType: function() {return "integer";}},
            {name: "col4", getBackColName: function() {return "col4";}, getType: function() {return "integer";}}]
        oldDriverList = XcalarDriverList;
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
    });

    it("Should open the modal", function() {
        ExportSQLTableModal.Instance.show("testTable", columns);
        assert.isTrue($modal.is(":visible"));
        $("#exportSQLTableModal .close").click();
    });

    it("Should display columns correctly",  function() {
        ExportSQLTableModal.Instance.show("testTable", columns);
        expect($("#exportSQLTableColumns .col").length).to.equal(4);
        $("#exportSQLTableModal .close").click();
    })

    it("Should have correct checkbox behavior",  function() {
        ExportSQLTableModal.Instance.show("testTable", columns);
        var $box = $("#exportSQLTableColumns .col .checkbox").eq(0);
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.parent().hasClass("checked"));
        $box.click();
        assert.isTrue($box.hasClass("checked"));
        assert.isTrue($box.parent().hasClass("checked"));
        $box.click();
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.parent().hasClass("checked"));
        $("#exportSQLTableModal .close").click();
    })

    it("Should have correct select all checkbox behavior",  function() {
        ExportSQLTableModal.Instance.show("testTable", columns);
        var $box = $("#exportSQLTableColumns .selectAllWrap .checkbox");
        expect($("#exportSQLTableColumns .col .checkbox.checked").length).to.equal(0);
        $box.click();
        expect($("#exportSQLTableColumns .col .checkbox.checked").length).to.equal(4);
        $box.click();
        expect($("#exportSQLTableColumns .col .checkbox.checked").length).to.equal(0);
        $("#exportSQLTableModal .close").click();
    })

    describe("Column Filtering related Export Modal Tests", function() {
        it("should hide columns when an input is specified", function() {
            ExportSQLTableModal.Instance.show("testTable", columns);
            $('#exportSQLTableColumns .searchInput').val("col1").trigger("input");
            expect($('#exportSQLTableColumns .col.xc-hidden').length).to.equal(3);
            $('#exportSQLTableColumns .searchInput').val("").trigger("input");
            expect($('#exportSQLTableColumns .col.xc-hidden').length).to.equal(0);
            $("#exportSQLTableModal .close").click();
        });

        it("should only select all of the filtered columns", function() {
            ExportSQLTableModal.Instance.show("testTable", columns);
            $('#exportSQLTableColumns .searchInput').val("col1").trigger("input");
            $('#exportSQLTableModal .selectAllWrap .checkbox').trigger("click");
            expect($('#exportSQLTableModal .col.checked').length).to.equal(1);
            $('#exportSQLTableModal .selectAllWrap .checkbox').trigger("click");
            $("#exportSQLTableModal .close").click();
        });

        it("should change the select all checkbox depending on what's selected", function() {
            ExportSQLTableModal.Instance.show("testTable", columns);
            $('#exportSQLTableModal .searchInput').val("col1").trigger("input");
            $('#exportSQLTableModal .selectAllWrap .checkbox').trigger("click");
            expect($('#exportSQLTableModal .selectAllWrap .checkbox').hasClass("checked")).to.be.true;
            $('#exportSQLTableModal .searchInput').val("").trigger("input");
            expect($('#exportSQLTableModal .selectAllWrap .checkbox').hasClass("checked")).to.be.false;
            $('#exportSQLTableModal .searchInput').val("col1").trigger("input");
            expect($('#exportSQLTableModal .selectAllWrap .checkbox').hasClass("checked")).to.be.true;
            $("#exportSQLTableModal .close").click();
        });
    });

    // Tests for errors and driver parameters coming with the unit test for exportoppanel, since
    // Many will be similar.

    after(function() {
        UnitTest.offMinMode();
        XcalarDriverList = oldDriverList;
    });
});