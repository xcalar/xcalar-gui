describe("DeskewOpPanel Test", function() {
    var panel;
    var $panel;
    var node;
    var openOptions = {};
    let cachedGetDagFn;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeDeskew({});
            const parentNode = new DagNodeFilter({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: "prefix::name",
                        type: "string"
                    }),
                    new ProgCol({
                        backName: "prefix_name",
                        type: "string"
                    }),new ProgCol({
                        backName: "name",
                        type: "string"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            }

            panel = DeskewOpPanel.Instance;
            $panel = $('#deskewOpPanel');
            let graph = new DagGraph();
            cachedGetDagFn = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => graph;
            graph.hasNode = () => true;
            done();
        });
    });

    describe("Basic UI Tests", function() {
        it ("should be hidden at start", function () {
            panel.close();
            expect($panel.hasClass("xc-hidden")).to.be.true;
        });

        it ("should be visible when show is called", function () {
            panel.show(node, openOptions);
            expect($panel.hasClass("xc-hidden")).to.be.false;
        });

        it ("should be hidden when close is clicked", function () {
            panel.show(node, openOptions);
            $panel.find('.close').click();
            expect($panel.hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Basic Function Test", function() {
        before(function() {
            panel.show(node, openOptions);
        });

        it("_populateHintDropdown should work", function() {
            let $dropdown = $('<div><ul><ul></div>');
            panel._populateHintDropdown($dropdown);
            expect($dropdown.find("li").length).to.equal(3);
            // case 2
            panel._populateHintDropdown($dropdown, "not exist");
            expect($dropdown.find("li").length).to.equal(1);
        });

        it("_switchMode should work", function() {
            panel._switchMode(true);
            let val = JSON.parse(panel._editor.getValue());
            expect(val).to.deep.equal({"column": "", "newKey": "", "outputTableName": ""});

            // case 2
            const paramStr = JSON.stringify({
                "column": "test",
                "newKey": ""
            }, null, 4);
            panel._editor.setValue(paramStr);
            panel._switchMode(false);
            expect($panel.find(".dropDownList input").val()).to.equal("test");
        });

        it("_submitForm should work", function() {
            panel._submitForm();
            expect(node.getParam()).to.deep.equal({
                "column": "test",
                "newKey": "",
                "outputTableName": ""
            });
        });

        after(function() {
            panel.close();
        });
    });


    after(function() {
        panel.close();
        DagViewManager.Instance.getActiveDag = cachedGetDagFn;
    });
});