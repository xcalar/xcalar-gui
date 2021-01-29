describe("AggOpPanelModel Test", function() {
    var aggOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeAggregate({});
            const parentNode = new DagNodeAggregate({});
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
            aggOpPanel = AggOpPanel.Instance;
            done();
        });
    });

    describe("Aggregate Panel Model Tests", function() {
        let model;
        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), $.extend({}, openOptions, {autofillColumnNames: [prefixCol]}));
            model = aggOpPanel.model;
        });

        describe("various functions", function() {
        });

        describe('initialize function', function() {
            it("_initialize with args should work", function() {
                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"^agg"
                });
                expect(model.groups.length).to.equal(1);
                expect(model.groups[0].operator).to.equal("count");
                expect(model.groups[0].args.length).to.equal(1);
                expect(model.groups[0].args[0].formattedValue).to.equal("prefix::average_stars");
                expect(model.groups[0].args[0].isValid).to.equal(true);
            });

            it("_initialize with invalid func should produce error", function() {
                expect(model._initialize.bind(model, {
                    "evalString":" add(prefix::average_stars)",
                    "dest":"^agg"
                })).to.throw({error: "\"add\" is not a valid aggregate function."});
            });

            it("_initialize with too many args should produce error", function() {
                expect(model._initialize.bind(model, {
                    "evalString":"count(prefix::average_stars, 3)",
                    "dest":"^agg"
                })).to.throw({error: "\"eq\" only accepts 1 argument."});
            });
        });

        describe("validate function", function() {
            it("invalid config should be caught", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                    "evalString":"blah(prefix::average_stars)",
                    "dest":"^agg"
                }));
                expect(ret.error).to.equal('Error: "blah" is not a valid aggregate function.');
            });
            it("param in fn name should be ok", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                    "evalString":"b<la>h(prefix::average_stars)",
                    "dest":"^agg"
                }), true);
                expect(ret).to.equal(null);
            });
            it("param in fn name should error when not saving", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                    "evalString":"b<la>h(prefix::average_stars)",
                    "dest":"^agg"
                }));
                expect(ret.error).to.equal('Error: "b<la>h" is not a valid aggregate function.');
            });
        });

        describe("validateAggName function", function() {
            it("does not have prefix", function() {
                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"agg"
                });
                const res = model.validateAggName();
                expect(res).to.deep.equal({
                    arg: -1,
                    error: "Aggregate name must be prefixed with ^",
                    group: 0,
                    type: "aggName"
                });
            });
            it("does not have valid characters", function() {
                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"^ag#g"
                });
                const res = model.validateAggName();
                expect(res).to.deep.equal({
                    arg: -1,
                    error: "Aggregate name should start with a letter and contain only letters, digits, hyphens(-) or underscores(_)",
                    group: 0,
                    type: "aggName"
                });
            });
            it("does not have valid length", function() {
                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"^"
                });
                const res = model.validateAggName();

                expect(res).to.deep.equal({
                    arg: -1,
                    error: "Aggregate name must be prefixed with ^ and followed by the name",
                    group: 0,
                    type: "aggName"
                });
            });
            it("name conflict", function() {
                let cacheFn = DagAggManager.Instance.hasAggregate;
                let oldGetAgg = DagAggManager.Instance.getAgg;
                DagAggManager.Instance.hasAggregate = function() {
                    return true;
                };
                DagAggManager.Instance.getAgg = function() {
                    return DagNodeFactory.create({type: DagNodeType.Aggregate});
                };

                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"^a"
                });
                const res = model.validateAggName();

                expect(res).to.deep.equal({
                    arg: -1,
                    error: 'Aggregate "^a" already exists. Please choose another name.',
                    group: 0,
                    type: "aggName"
                });
                DagAggManager.Instance.hasAggregate = cacheFn;
                DagAggManager.Instance.getAgg = oldGetAgg;
            });
            it("valid name", function() {
                model._initialize({
                    "evalString":"count(prefix::average_stars)",
                    "dest":"^a" + Date.now()
                });
                const res = model.validateAggName();

                expect(res).to.be.null;
            });
        });
    });

    after(function() {
        aggOpPanel.close();
    });
});
