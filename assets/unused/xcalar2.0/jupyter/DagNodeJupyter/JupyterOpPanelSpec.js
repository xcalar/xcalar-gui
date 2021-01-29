// jupyter related functions are deprecated
describe.skip("JupyterOpPanel Test", function() {
    var jupyterOpPanel;
    var $jupyterOpPanel;
    var node;
    var openOptions = {};
    let cachedGetDagFn;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .then(function() {
            return XDFManager.Instance.waitForSetup();
        })
        .always(function() {
            MainMenu.openPanel("sqlPanel");
            node = new DagNodeJupyter({subType: DagNodeSubType.Jupyter});
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
            jupyterOpPanel = JupyterOpPanel.Instance;
            editor = jupyterOpPanel.getEditor();
            $jupyterOpPanel = $('#jupyterOpPanel');
            let graph = new DagGraph();
            cachedGetDagFn = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => graph;
            graph.hasNode = () => true;

            done();
        });
    });

    describe("Basic JupyterPanel UI Tests", function() {
        it ("Should be hidden at start", function () {
            jupyterOpPanel.close();
            expect($('#jupyterOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {
            jupyterOpPanel.show(node, openOptions);
            expect($('#jupyterOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            jupyterOpPanel.show(node, openOptions);
            jupyterOpPanel.close();
            expect($('#jupyterOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            jupyterOpPanel.show(node, openOptions);
            if ($("#jupyterOpPanel").find(".advancedEditor").is(":visible")) {
                $("#jupyterOpPanel .bottomSection .xc-switch").click();
            }
            $('#jupyterOpPanel .close').click();
            expect($('#jupyterOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("correct display", () => {
        it("should have correct number of rows", () => {
            jupyterOpPanel.show(node, openOptions);
            expect($jupyterOpPanel.find(".selInput").length).to.equal(1);
            expect($jupyterOpPanel.find(".selInput").val()).to.equal("1000");
        });
        it("should have correct rename rows", () => {
            expect($jupyterOpPanel.find(".row-rename").length).to.equal(3);
            expect($jupyterOpPanel.find(".row-rename").eq(0).find("input").val()).to.equal("prefix::name");
            expect($jupyterOpPanel.find(".row-rename").eq(1).find("input").val()).to.equal("prefix_name");
            expect($jupyterOpPanel.find(".row-rename").eq(2).find("input").val()).to.equal("name");

            expect($jupyterOpPanel.find(".row-rename").eq(0).find(".selTo").val()).to.equal("name1");
            expect($jupyterOpPanel.find(".row-rename").eq(1).find(".selTo").val()).to.equal("prefix_name");
            expect($jupyterOpPanel.find(".row-rename").eq(2).find(".selTo").val()).to.equal("name");
        });
    });


    describe('_getArgs() should work', () => {
        it('test return value', () => {
            const args = jupyterOpPanel._getArgs();
            // 1 section
            expect(args.length).to.equal(2);

            // section#1: dest column
            const numberRowsProps = args[0];
            expect(numberRowsProps.type).to.equal('number');
            expect(numberRowsProps.inputVal).to.equal(1000);
            expect(numberRowsProps.valueCheck.checkType).to.equal('integerRange');
            expect(numberRowsProps.valueCheck.args.length).to.equal(1);
            expect(numberRowsProps.valueCheck.args[0].min).to.equal(1);
            expect(numberRowsProps.valueCheck.args[0].max).to.equal(1000);

            const columnsProps = args[1];
            expect(columnsProps.type).to.equal('renameList');
            expect(columnsProps.renames.length).to.equal(3);
            expect(columnsProps.renames[0].valueCheck.checkType).to.equal('stringColumnNameNoEmptyPrefixValue');
            expect(columnsProps.renames[0].valueCheck.args()[0].size).to.equal(2);
            expect(columnsProps.renames[0].colTo).to.equal("name1");
            expect(columnsProps.renames[0].colFrom).to.deep.equal({
                colName: "prefix::name",
                colType: "string"
            });
        });
    });

    describe('_submitForm() should work', () => {
        afterEach(() => {
            StatusBox.forceHide();
        });

        it('Basic form', (done) => {
            let setParamCalled = false;
            let closeCalled = false;
            node.setParam = () => { setParamCalled = true };
            const oldClose = jupyterOpPanel.close;
            jupyterOpPanel.close = () => { closeCalled = true };

            const testList = [];

            // Case: valid parameters
            testList.push(() => {
                jupyterOpPanel._submitForm();
                console.log("a", setParamCalled, closeCalled)
                expect(setParamCalled).to.equal(true);
                expect(closeCalled).to.equal(true);
                setParamCalled = false; // restore
                closeCalled = false; // restore
                return PromiseHelper.resolve();
            });

            // Case: invalid parameters
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                jupyterOpPanel._dataModel.setNumExportRows(-1);
                jupyterOpPanel._updateUI();
                setTimeout(() => {
                    setParamCalled = false; // restore
                    closeCalled = false; // restore
                    jupyterOpPanel._submitForm();
                    console.log("b", setParamCalled, closeCalled)
                    expect(setParamCalled).to.equal(false);
                    expect(closeCalled).to.equal(false);
                    setParamCalled = false; // restore
                    closeCalled = false; // restore
                    deferred.resolve();
                }, 0);
                return deferred.promise();
            });

            // Restore the form
            testList.push(() => {
                const deferred = PromiseHelper.deferred();
                jupyterOpPanel.close = oldClose;
                jupyterOpPanel._dataModel.setNumExportRows(1000);
                jupyterOpPanel._updateUI();
                setTimeout(() => {
                    deferred.resolve();
                }, 0);
                return deferred.promise();
            });

            PromiseHelper.chain(testList).always(() => done());
        });

        it('Advanced from', () => {
            const oldValue = JSON.stringify(jupyterOpPanel._dataModel.toDagInput(), null, 4);
            const oldClose = jupyterOpPanel.close;
            const oldValidateParam = node.validateParam;

            let setParamCalled = false;
            let closeCalled = false;
            node.setParam = () => { setParamCalled = true };
            node.validateParam = () => null;
            jupyterOpPanel.close = () => { closeCalled = true };
            jupyterOpPanel._switchMode(true);
            jupyterOpPanel._updateMode(true);

            // Case: valid input
            jupyterOpPanel._submitForm();
            expect(setParamCalled).to.equal(true);
            expect(closeCalled).to.equal(true);
            setParamCalled = false; // restore
            closeCalled = false; // restore

            // Case: invalid input
            jupyterOpPanel._editor.setValue('{}');
            jupyterOpPanel._submitForm();
            expect(setParamCalled).to.equal(false);
            expect(closeCalled).to.equal(false);
            setParamCalled = false; // restore
            closeCalled = false; // restore

            // Restore
            node.validateParam = oldValidateParam;
            jupyterOpPanel.close = oldClose;
            jupyterOpPanel._editor.setValue(oldValue);
            jupyterOpPanel._switchMode(false);
            jupyterOpPanel._updateMode(false);
        });
    });

    after(function() {
        jupyterOpPanel.close();
        DagViewManager.Instance.getActiveDag = cachedGetDagFn;
    });
});
