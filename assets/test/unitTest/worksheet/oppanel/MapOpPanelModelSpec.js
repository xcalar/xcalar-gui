describe("MapOpPanelModel Test", function() {
    var mapOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions = {};

    before(function() {
        node = new DagNodeMap({});
        const parentNode = new DagNodeMap({});
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

        oldJSONParse = JSON.parse;
        mapOpPanel = MapOpPanel.Instance;
        openOptions = {
            udfDisplayPathPrefix : UDFFileManager.Instance.getCurrWorkbookDisplayPath()
        };
    });

    describe("Map Panel Model Tests", function() {
        let model;
        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
            mapOpPanel.show(node, options);
            model = mapOpPanel.model;
        });

        describe("various functions", function() {

        });

        describe('initialize function', function() {
            it("_initialize with args should work", function() {
                model._initialize({
                    eval: [{evalString: "eq(1,\"2\")", newField: "colOutput"}]
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
                    eval: [{evalString: "adda(1,2)", newField: "colOutput"}]
                })).to.throw({error: "\"adda\" is not a valid map function."});
            });

            it("_initialize with too many args should produce error", function() {
                expect(model._initialize.bind(model, {
                    eval: [{evalString: "eq(1,2,3)", newField: "colOutput"}]
                })).to.throw({error: "\"eq\" only accepts 2 arguments."});
            });
        });

        describe("validate function", function() {
            it("missing icv should be caught", function() {
                let ret = model.validateAdvancedMode('{"eval":[{"evalString": "blah(1,2)", "newField": "colOutput"}]}');
                expect(ret.error).to.equal("Configuration should have required property \'icv\'");
            });
            it("invalid config should be caught", function() {
                let ret = model.validateAdvancedMode('{"eval":[{"evalString": "blah(1,2)", "newField": "colOutput"}], "icv": false}');
                expect(ret.error).to.equal('Error: "blah" is not a valid map function.');
            });
            it("param in fn name should be ok", function() {
                let ret = model.validateAdvancedMode('{"eval":[{"evalString": "b<la>h(1,2)", "newField": "colOutput"}], "icv": false}', true);
                expect(ret).to.equal(null);
            });
            it("param in fn name should error when not saving", function() {
                let ret = model.validateAdvancedMode('{"eval":[{"evalString": "b<la>h(1,2)", "newField": "colOutput"}], "icv": false}');
                expect(ret.error).to.equal('Error: "b<la>h" is not a valid map function.');
            });
        });
    });

    after(function() {
        mapOpPanel.close();
    });
});
