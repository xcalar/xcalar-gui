describe("GroupByOpPanelModel Test", function() {
    var groupByOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions = {};

    before(function() {
        node = new DagNodeGroupBy({});
        const parentNode = new DagNodeGroupBy({});
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
        groupByOpPanel = GroupByOpPanel.Instance;

        openOptions = {udfDisplayPathPrefix: UDFFileManager.Instance.getCurrWorkbookDisplayPath()};
    });

    describe("Group By Panel Model Tests", function() {
        let model;
        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
            groupByOpPanel.show(node, options);
            model = groupByOpPanel.model;
        });

        describe("various functions", function() {

        });

        describe('initialize function', function() {
            it("_initialize with args should work", function() {
                model._initialize({
                    "groupBy": [
                        xcHelper.getPrefixColName(prefix, 'average_stars')
                    ],
                    "aggregate": [
                        {
                            "operator": "maxTimestamp",
                            "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                            "destColumn": "destCol",
                            "distinct": true,
                            "cast": "string"
                        }
                    ],
                    "icv": true,
                    "groupAll": false,
                    "includeSample": false,
                    "joinBack": true,
                    "newKeys": ["avgStars"],
                    "dhtName": ""
                });
                expect(model.groups.length).to.equal(1);
                expect(model.groups[0].operator).to.equal("maxTimestamp");
                expect(model.groups[0].distinct).to.equal(true);
                expect(model.groups[0].newFieldName).to.equal("destCol");
                expect(model.groups[0].args.length).to.equal(1);
                expect(model.groups[0].args[0].formattedValue).to.equal(xcHelper.getPrefixColName(prefix, 'average_stars'));
                expect(model.groups[0].args[0].value).to.equal(gColPrefix + xcHelper.getPrefixColName(prefix, 'average_stars'));
                expect(model.groups[0].args[0].isValid).to.equal(true);
                expect(model.groups[0].args[0].isNone).to.equal(false);
                expect(model.groups[0].args[0].error).to.equal(null);
                expect(model.groups[0].args[0].cast).to.equal("string");
                expect(model.groups[0].args[0].isEmptyString).to.equal(false);
                expect(model.groups[0].args[0].isOptional).to.equal(false);
                expect(model.groups[0].args[0].isRegex).to.equal(false);
                expect(model.groups[0].args[0].typeid).to.equal(512);

                expect(model.groupOnCols.length).to.equal(1);
                expect(model.groupOnCols[0]).to.equal(xcHelper.getPrefixColName(prefix, 'average_stars'));
                expect(model.groupAll).to.equal(false);
                expect(model.dhtName).to.equal("");
                expect(model.icv).to.equal(true);
                expect(model.includeSample).to.equal(false);
                expect(model.newKeys.length).to.equal(1);
                expect(model.newKeys[0]).to.equal("avgStars");

            });

            it("_initialize with invalid func should produce error", function() {
                expect(model._initialize.bind(model, {
                    "groupBy": [
                        xcHelper.getPrefixColName(prefix, 'average_stars')
                    ],
                    "aggregate": [
                        {
                            "operator": "xx",
                            "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                            "destColumn": "destCol",
                            "distinct": true,
                            "cast": "string"
                        }
                    ],
                    "icv": true,
                    "groupAll": false,
                    "includeSample": false,
                    "joinBack": true,
                    "newKeys": ["avgStars"],
                    "dhtName": ""
                })).to.throw({error: "\"xx\" is not a valid groupby function."});
            });
        });

        describe("validate function", function() {
            it("missing icv should be caught", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars')
                        ],
                        "aggregate": [
                            {
                                "operator": "count",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "destCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        // "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars"],
                        "dhtName": ""
                }));
                expect(ret.error).to.equal("Configuration should have required property \'icv\'");
            });
            it("invalid config should be caught", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars')
                        ],
                        "aggregate": [
                            {
                                "operator": "blah",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "destCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars"],
                        "dhtName": ""
                }));
                expect(ret.error).to.equal('Error: "blah" is not a valid group by function.');
            });
            it("param in fn name should be ok", function() {
                    let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars')
                        ],
                        "aggregate": [
                            {
                                "operator": "<oun>",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "destCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars"],
                        "dhtName": ""
                 }), true);
                expect(ret).to.equal(null);
            });
            it("param in fn name should error when not saving", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars')
                        ],
                        "aggregate": [
                            {
                                "operator": "b<la>h",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "destCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars"],
                        "dhtName": ""
                }));
                expect(ret.error).to.equal('Error: "b<la>h" is not a valid group by function.');
            });

            it("duplicate new field name should error", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars'),
                            xcHelper.getPrefixColName(prefix, 'stringCol'),
                        ],
                        "aggregate": [
                            {
                                "operator": "count",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "destCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars", "avgStars"],
                        "dhtName": ""
                }));
                expect(ret.error).to.equal('newKeys should NOT have duplicate items (items ## 0 and 1 are identical)');
            });

            it("duplicate dest column  should error", function() {
                let ret = model.validateAdvancedMode(JSON.stringify({
                        "groupBy": [
                            xcHelper.getPrefixColName(prefix, 'average_stars'),
                            xcHelper.getPrefixColName(prefix, 'stringCol'),
                        ],
                        "aggregate": [
                            {
                                "operator": "count",
                                "sourceColumn": xcHelper.getPrefixColName(prefix, 'average_stars'),
                                "destColumn": "stringCol",
                                "distinct": true,
                                "cast": "string"
                            }
                        ],
                        "icv": true,
                        "groupAll": false,
                        "includeSample": false,
                        "joinBack": true,
                        "newKeys": ["avgStars", "stringCol"],
                        "dhtName": ""
                }));
                expect(ret.error).to.equal('Error in newKeys: stringCol is already in use');
            });
        });
    });

    after(function() {
        groupByOpPanel.close();
    });
});
