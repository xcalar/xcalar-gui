describe("FilterOpPanelModel Test", function() {
    var filterOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions;

    before(function() {
        node = new DagNodeFilter({});
        const parentNode = new DagNodeFilter({});
        parentNode.getLineage = function() {
            return {getColumns: function() {
                return [new ProgCol({
                    backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                    type: "number"
                })]
            }}
        };
        node.getParents = function() {
            return [parentNode];
        }

        openOptions = {udfDisplayPathPrefix: UDFFileManager.Instance.getCurrWorkbookDisplayPath()};

        oldJSONParse = JSON.parse;
        filterOpPanel = FilterOpPanel.Instance;
    });

    describe("Filter Panel Model Tests", function() {
        let model;
        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            filterOpPanel.show(node, $.extend({}, openOptions, {autofillColumnNames: [prefixCol]}));
            model = filterOpPanel.model;
        });

        describe("various functions", function() {
            it ("isValidAndOr should work", function() {
                const parsedEval = XDParser.XEvalParser.parseEvalStr("or(eq(1,2), eq(3,4))");
                expect(model._isValidAndOr(parsedEval, "or")).to.not.be.false;
                const parsedEval2 = XDParser.XEvalParser.parseEvalStr("or(eq(1,2), bool(3,4))");
                expect(model._isValidAndOr(parsedEval2, "or")).to.be.null;
            });
        });

        describe('initialize function', function() {
            it("_initialize with args should work", function() {
                model._initialize({
                    "evalString": "eq(1,\"2\")"
                });
                expect(model.groups.length).to.equal(1);
                expect(model.groups[0].operator).to.equal("eq");
                expect(model.groups[0].args.length).to.equal(2);
                expect(model.groups[0].args[0].formattedValue).to.equal("1");
                expect(model.groups[0].args[0].isValid).to.equal(true);
                expect(model.groups[0].args[1].formattedValue).to.equal('"2"');
                expect(model.groups[0].args[1].isValid).to.equal(true);
            });

            it("_initialize with invalid func should produce error", function() {
                expect(model._initialize.bind(model, {
                    "evalString": "add(1,\"2\")"
                })).to.throw({error: "\"add\" is not a valid filter function."});
            });

            it("_initialize with too many args should produce error", function() {
                expect(model._initialize.bind(model, {
                    "evalString": "eq(1,2,3)"
                })).to.throw({error: "\"eq\" only accepts 2 arguments."});
            });

            it("_initialize with 'or' should work", function() {
                model.andOrOperator = "";
                expect(model.andOrOperator).to.equal("");
                model._initialize({
                    "evalString": "or(eq(1,2), eq(3,4))"
                });
                expect(model.andOrOperator).to.equal("or");
            });
        });

        describe("validate function", function() {
            it("invalid config should be caught", function() {
                let ret = model.validateAdvancedMode('{"evalString": "blah(1,2)"}');
                expect(ret.error).to.equal('Error: "blah" is not a valid filter function.');
            });
            it("param in fn name should be ok", function() {
                let ret = model.validateAdvancedMode('{"evalString": "b<la>h(1,2)"}', true);
                expect(ret).to.equal(null);
            });
            it("param in fn name should error when not saving", function() {
                let ret = model.validateAdvancedMode('{"evalString": "b<la>h(1,2)"}');
                expect(ret.error).to.equal('Error: "b<la>h" is not a valid filter function.');
            });
        });
    });

    after(function() {
        filterOpPanel.close();
    });
});
