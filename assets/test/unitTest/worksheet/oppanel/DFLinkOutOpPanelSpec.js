describe("DFLinkOutOpPanel Test", function() {
    var dfLinkOutPanel;
    var $dfLinkOutPanel;
    var node;
    var openOptions = {};
    let cachedGetDagFn;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .then(function() {
            return XDFManager.Instance.waitForSetup();
        })
        .always(function() {
            node = new DagNodeDFOut({subType: DagNodeSubType.DFOutOptimized});
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

            oldJSONParse = JSON.parse;
            dfLinkOutPanel = DFLinkOutOpPanel.Instance;
            $dfLinkOutPanel = $('#dfLinkOutPanel');
            let graph = new DagGraph();
            cachedGetDagFn = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => graph;
            graph.hasNode = () => true;

            done();
        });
    });

    describe("Basic DFOutPanel UI Tests", function() {
        it ("should be hidden at start", function () {
            dfLinkOutPanel.close();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("should be visible when show is called", function () {
            dfLinkOutPanel.show(node, openOptions);
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("should be hidden when close is called after showing", function () {
            dfLinkOutPanel.show(node, openOptions);
            dfLinkOutPanel.close();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("should be hidden when close is clicked", function () {
            dfLinkOutPanel.show(node, openOptions);
            $('#dfLinkOutPanel .close').click();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("switching modes", function() {
        it("should switch mode", function() {
            let res = dfLinkOutPanel._switchMode(true);
            expect(res).to.equal(null);
            res = dfLinkOutPanel._switchMode(false);
            expect(res).to.equal(null);
        });
    });

    describe("submit advanced mode", () => {
        it("should submit", () => {
            dfLinkOutPanel._switchMode(true);
            dfLinkOutPanel._updateMode(true);
            dfLinkOutPanel._editor.setValue(JSON.stringify({
                name: "out",
                linkAfterExecution: true
            }));
            dfLinkOutPanel._submitForm();
            expect(node.getParam()).to.deep.equal({
                name: "out",
                linkAfterExecution: true
            });
        });
    });

    after(function() {
        dfLinkOutPanel.close();
        DagViewManager.Instance.getActiveDag = cachedGetDagFn;
    });
});
