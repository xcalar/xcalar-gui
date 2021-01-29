describe('IMDTableOpPanel Test', () => {
    var oldPut;

    before(function(done) {
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .then(function() {
            return XDFManager.Instance.waitForSetup();
        })
        .always(function() {
            done();
        });
    });

    describe('IMD Table Panel Test', () => {
        let opPanel;
        let $panel;
        let node;
        let editor;
        let oldGetTables;
        let $tableList;

        before(() => {
            oldGetTables = PTblManager.Instance.getAvailableTables;
            PTblManager.Instance.getAvailableTables = function() {
                return [new PbTblInfo({
                    name: "A",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [{
                        startTS: 1,
                        batchId: 0,
                    }],
                    active: true
                }),
                new PbTblInfo({
                    name: "B",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [{
                        startTS: 1,
                        batchId: 0,
                    }, {
                        startTS: 2,
                        batchId: 1,
                    }],
                    active: true
                }),
                new PbTblInfo({
                    name: "C",
                    columns: [{
                        name: "COL",
                        type: "integer"
                    }],
                    keys: ["COL"],
                    updates: [],
                    active: false
                })];
            };
            node = new DagNodeIMDTable({});
            IMDTableOpPanel.Instance.show(node, {});
            $panel = $("#IMDTableOpPanel");
            opPanel = IMDTableOpPanel.Instance;
            editor = opPanel.getEditor();
            $tableList = $("#pubTableList");
        });

        describe('Basic UI Tests', () => {
            it('Published Table Dropdown', () => {
                // open dropdown list
                $tableList.find(".iconWrapper").click();
                expect($tableList.find("li").length).to.equal(3);
                // close dropdown list
                $tableList.find(".iconWrapper").click();
            });

            it ("Should be hidden at start", function () {
                opPanel.close();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });

            it ("Should be visible when show is called", function () {

                opPanel.show(node, {});
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.false;
            });

            it ("Should be hidden when close is called after showing", function () {
                opPanel.show(node, {});
                opPanel.close();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });

            it ("Should be hidden when close is clicked", function () {
                opPanel.show(node, {});
                $('#IMDTableOpPanel .close').click();
                expect($('#IMDTableOpPanel').hasClass("xc-hidden")).to.be.true;
            });
        });

        describe("Advanced Mode related IMD Table Op Panel Tests", function() {
            it("Should show statusbox error if not all fields are there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify({}, null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });
            it("Should show statusbox error if source is not there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"version": -1, "schema": [{"name": "COL", "type": "integer"}]},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });

            it("Should show statusbox error if schema is not there", function() {
                opPanel.show(node, {});
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                editor.setValue(JSON.stringify(
                    {"source": "B", "version": -1},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .btn-submit").click();
                expect($("#statusBox").hasClass("active")).to.be.true;
                opPanel.close();
            });

            it("Should switch back correctly with updated fields", function() {
                opPanel.show(node, {});
                editor.setValue(JSON.stringify(
                    {"source": "B", "version": 0, "schema": [{"name": "COL", "type": "integer"}], "filterString": "123"},
                    null, 4));
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                expect($panel.find(".pubTableInput").val()).to.equal("B");
                opPanel.close();
            });
        });

        describe("Final output", function() {
            it ("final node should have correct input", function() {
                opPanel.show(node, {});
                expect(JSON.stringify(node.getParam())).to.equal('{"source":"","version":-1,"filterString":"","schema":[],"limitedRows":null,"outputTableName":""}');
                $("#IMDTableOpPanel .bottomSection .xc-switch").click();
                var input = JSON.stringify(
                    {"source": "B", "version": -1, "schema": [{"name": "COL", "type": "integer"}]},
                    null, 4);
                editor.setValue(input);
                $panel.find(".submit").click();
                expect(JSON.stringify(node.getParam())).to.equal('{"source":"B","version":-1,"filterString":"","schema":[{"name":"COL","type":"integer"}],"limitedRows":null,"outputTableName":""}');
            });
        });

        after(() => {
            PTblManager.Instance.getAvailableTables = oldGetTables;
        });
    });

    after(function() {
        XcalarKeyPut = oldPut;
        UnitTest.offMinMode();
    });
});