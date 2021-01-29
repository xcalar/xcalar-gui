describe("GeneralOpPanelModel Test", function() {
    var mapOpPanel;
    var node;
    var prefix = "prefix";
    var openOptions = {};
    var columns;

    before(function(done) {
        node = new DagNodeMap({});
        const parentNode = new DagNodeMap({});
        columns = [new ProgCol({
            backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
            type: "number"
        }), new ProgCol({
            backName: xcHelper.getPrefixColName(prefix, 'mixed'),
            type: "mixed"
        })];
        parentNode.getLineage = function() {
            return {getColumns: function() {
                return columns;
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

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("General Panel Model Tests", function() {
        let model;
        before(function (done) {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
            mapOpPanel.show(node, options)
            .always(function() {
                model = mapOpPanel.model;
                done();
            });
        });

        it("validateColInputType should work", function() {
            var fn = model._validateColInputType;
            expect(fn([ColumnType.float], "newColumn")).to.equal(ErrTStr.InvalidOpNewColumn);
            expect(fn([ColumnType.mixed], "mixed")).to.be.null;
            expect(fn([ColumnType.integer], "integer")).to.be.null;
            expect(fn([ColumnType.float], "number")).to.be.null;
            expect(fn([ColumnType.integer], "number")).to.be.null;
            expect(fn([ColumnType.string], "number")).to.equal("Data type is invalid. Expected: string, Entered: number.");
            expect(fn([ColumnType.string, ColumnType.boolean], "number")).to.equal("Data type is invalid. Expected: string/boolean, Entered: number.");
        });

        it("get columnNumByName should work", function() {
            expect(model.getColumnNumByName("prefix::average_stars")).to.equal(0);
            expect(model.getColumnNumByName("average_stars")).to.equal(-1);
        });

        it("function isBoolInQuotes", function() {
            var fn = GeneralOpPanelModel.isBoolInQuotes.bind(GeneralOpPanelModel);
            expect(fn("'true'")).to.be.true;
            expect(fn("'true")).to.be.false;
            expect(fn("\"true\"")).to.be.true;
            expect(fn("\"False\"")).to.be.true;
            expect(fn("\"False")).to.be.false;
            expect(fn("'Falsez'")).to.be.false;
        });

        it('isNumberInQuotes() should return correctly', function() {
            var func = GeneralOpPanelModel.isNumberInQuotes;
            expect(func('"3"')).to.be.true;
            expect(func("'3'")).to.be.true;
            expect(func("'3.342'")).to.be.true;

            expect(func("'3")).to.be.false;
            expect(func("3'")).to.be.false;
            expect(func('"3')).to.be.false;
            expect(func(3)).to.be.false;
            expect(func("3")).to.be.false;
            expect(func("''3")).to.be.false;
            expect(func("'3''")).to.be.false;
            expect(func("'3t'")).to.be.false;
            expect(func("'3.342t'")).to.be.false;
            expect(func('"1184166469145378821"')).to.be.true;
            expect(func('"00123"')).to.be.true;
        });

        it ('hasFuncFormat(arg) should return correctly', function() {
            var func = GeneralOpPanelModel.hasFuncFormat;
            expect(func(5543)).to.equal(false);
            expect(func('()')).to.equal(false);
            expect(func('add(x,1)')).to.equal(true);
            expect(func('a(()x,(1))')).to.equal(true);
            expect(func('a("((("x,1)')).to.equal(true);
            expect(func('a(""x,1)')).to.equal(true);
            expect(func('a(x,1)')).to.equal(true);
            expect(func('a("\\"",1)')).to.equal(true);

            expect(func('add(x,1')).to.equal(false);
            expect(func('add(x,1\"')).to.equal(false);
            expect(func('a("\"",1)')).to.equal(false);
            expect(func('add(x,1")')).to.equal(false);
            expect(func('(xwf,1)')).to.equal(false);
            expect(func('add(xwf,1)x')).to.equal(false);
            expect(func('(xwf,1)x')).to.equal(false);
            expect(func('a(x,1))')).to.equal(false);
            expect(func('a((x,1)')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()"("x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
        });

        it("formatArgToUi should return correctly", () => {
            var func = model.formatArgToUI.bind(model);
            // 2 == string
            // 508  = integer
            // 527358 = multiple i.e. eq()
            expect(func('col', 2)).to.equal('$col');
            expect(func('^col', 2)).to.equal('^col');
            expect(func('"col"', 2)).to.equal('col');
            expect(func('"col"', 508)).to.equal('col');
            expect(func('"col"', 527358)).to.equal('col');
            expect(func("'col'", 2)).to.equal('col');
            expect(func('"123"', 2)).to.equal('123');
            expect(func('"123"', 508)).to.equal('"123"');
            expect(func('"123"', 527358)).to.equal('"123"');
        });

        it("function isActualPrefix", function() {
            var fn = GeneralOpPanelModel.isActualPrefix;
            expect(fn("te,st", 3)).to.be.true;
            expect(fn("te(st", 3)).to.be.true;
            expect(fn("test", 3)).to.be.false;
        });

        describe("check arg types", function() {
            var fn;
            var parseTypeCache;
            before(function() {
                fn = model._checkArgTypes.bind(model);
                parseTypeCache = GeneralOpPanelModel.parseType;
            });

            it("test when only strings are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["string"];
                };

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only mixed is valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["mixed"];
                };

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only booleans are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["boolean"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["boolean"]);

                expect(fn("TrUe")).to.equal(null);

                expect(fn("5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("2.5")).to.equal(null);
            });

            it("test when only strings and booleans are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["string", "boolean"];
                };

                expect(fn("test")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("false")).to.equal(null);
            });

            it("test when only ints are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["integer"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["integer"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["integer"]);

                expect(fn("5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
                expect(fn("5.5").currentType).to.equal("float");
                expect(fn("5.5").validType).to.deep.equal(["integer"]);
            });

            it("test when only floats are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["float"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["float"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["float"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only floats and ints are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["float", "integer"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["float", "integer"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["float", "integer"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only booleans and ints are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["boolean", "integer"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["boolean", "integer"]);

                expect(fn("true")).to.equal(null);

                expect(fn("5")).to.equal(null);

                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only booleans floats and ints are valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["boolean", "float", "integer"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["boolean", "float", "integer"]);

                expect(fn("true")).to.equal(null);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
                expect(fn("0")).to.equal(null);
                expect(fn("-1")).to.equal(null);
            });

            it("test when only undefined is valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["undefined"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["undefined"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["undefined"]);

                expect(fn("5").currentType).to.equal("string/boolean/integer/float");
                expect(fn("5").validType).to.deep.equal(["undefined"]);

                expect(fn("5.5").currentType).to.equal("string/boolean/integer/float");
                expect(fn("5.5").validType).to.deep.equal(["undefined"]);

                expect(fn("-1").currentType).to.equal("string/boolean/integer/float");
                expect(fn("-1").validType).to.deep.equal(["undefined"]);
            });

            it("test when only somthing weird is valid", function() {
                GeneralOpPanelModel.parseType= function() {
                    return ["newType"];
                };

                expect(fn("test").currentType).to.equal("string");
                expect(fn("test").validType).to.deep.equal(["newType"]);

                expect(fn("true").currentType).to.equal("string/boolean/integer/float");
                expect(fn("true").validType).to.deep.equal(["newType"]);

                expect(fn("5")).to.equal(null);
                expect(fn("5.5")).to.equal(null);
            });

            after(function() {
                GeneralOpPanelModel.parseType = parseTypeCache;
            });
        });

        describe("validate groups", function() {
            var fn;
            before(function() {
                fn = model.validateGroups.bind(model);
            });

            it("should check invalid operator", function() {
                model.groups = [
                    {operator: "addx"}
                ];
                expect(fn()).to.deep.equal({error: ErrTStr.NoSupportOp,
                    group: 0,
                    arg: -1,
                    type: "function"
                });
            });

            it("should check invalid number of args", function() {
                model.groups = [
                    {operator: "add",
                        args: ["one", "two"]
                    },
                    {operator: "eq",
                        args: ["one"]
                    }
                ];
                expect(fn()).to.deep.equal({
                    error: "\"eq\" expects 2 arguments.",
                    group: 1,
                    arg: -1,
                    type: "missingFields"
                });
            });

            it("should check blank inputs", function() {
                model.groups = [
                    {operator: "eq",
                        args: [{checkIsValid:()=>true}, {checkIsValid: () => false, getError: ()=>"No value"}]
                    }
                ];
                expect(fn()).to.deep.equal({error: "No value",
                    group: 0,
                    arg: 1,
                    type: "blank"});
            });

            it("should check other errors", function() {
                model.groups = [
                    {operator: "eq",
                        args: [{checkIsValid:()=>true}, {checkIsValid: () => false, getError: ()=>"something else"}]
                    }
                ];
                expect(fn()).to.deep.equal({error: "something else",
                    group: 0,
                    arg: 1,
                    type: "other"});
            });

            it("should check column type errors", function() {
                model.groups = [
                    {operator: "eq",
                        args: [{checkIsValid:()=>true},
                            {checkIsValid: () => false,
                            getType: () => "column",
                            getError: ()=>ErrWRepTStr.InvalidOpsType}]
                    }
                ];
                expect(fn()).to.deep.equal({error: ErrWRepTStr.InvalidOpsType,
                    group: 0,
                    arg: 1,
                    type: "columnType"});
            });

            it("should check value type errors", function() {
                model.groups = [
                    {operator: "eq",
                        args: [{checkIsValid:()=>true},
                            {checkIsValid: () => false,
                            getType: () => "value",
                            getError: ()=>ErrWRepTStr.InvalidOpsType}]
                    }
                ];
                expect(fn()).to.deep.equal({error: ErrWRepTStr.InvalidOpsType,
                    group: 0,
                    arg: 1,
                    type: "valueType"});
            });

            it("should check type mismatch error: string-number", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => false
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "3",
                            getFormattedValue: () => "3",
                            isCast:() => false,
                        }
                        ]
                    }
                ];

                expect(fn()).to.deep.equal({error: "Arguments should be of the same type. Expected test (string) to match 3 (number).",
                    group: 0,
                    arg: 1,
                    type: "mismatchType"});
            });
            it("should check type mismatch error: number-string", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "3",
                            getFormattedValue: () => "3",
                            isCast:() => false
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => false,
                        }
                        ]
                    }
                ];
                expect(fn()).to.deep.equal({error: "Arguments should be of the same type. Expected 3 (number) to match test (string).",
                    group: 0,
                    arg: 1,
                    type: "mismatchType"});
            });

            it("should check type mismatch error: boolean-string", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "false",
                            getFormattedValue: () => "false",
                            isCast:() => false
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => false,
                        }
                        ]
                    }
                ];
                expect(fn()).to.deep.equal({error: "Arguments should be of the same type. Expected false (boolean) to match test (string).",
                    group: 0,
                    arg: 1,
                    type: "mismatchType"});
            });

            it("should ignore type mismatch error: boolean-string if casted", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "false",
                            getFormattedValue: () => "false",
                            isCast:() => false
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => true,
                            getCast:() => "boolean"
                        }
                        ]
                    }
                ];
                expect(fn()).to.deep.equal(null);
            });


            it("should ignore type mismatch error: boolean-mixed-string", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "false",
                            getFormattedValue: () => "false",
                            isCast:() => false
                        },
                        {checkIsValid: () => true,
                            getType: () => "column",
                            getError: ()=>null,
                            getValue: () => "$prefix::mixed",
                            getFormattedValue: () => 'prefix::mixed',
                            isCast:() => false,
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => false,
                        }
                        ]
                    }
                ];
                expect(fn()).to.deep.equal(null);
            });

            it("should check type mismatch error: column:number-string", function() {
                model.groups = [
                    {operator: "gt",
                        args: [{checkIsValid:()=>true,
                            getType: () => "column",
                            getError: ()=>null,
                            getValue: () => "$prefix::average_stars",
                            getFormattedValue: () => "prefix::average_stars",
                            isCast:() => false
                        },
                            {checkIsValid: () => true,
                            getType: () => "value",
                            getError: ()=>null,
                            getValue: () => "test",
                            getFormattedValue: () => '"test"',
                            isCast:() => false,
                        }
                        ]
                    }
                ];
                expect(fn()).to.deep.equal({error: "Arguments should be of the same type. Expected $prefix::average_stars (number) to match test (string).",
                    group: 0,
                    arg: 1,
                    type: "mismatchType"});
            });
        });

        describe('function hasUnescapedParens', function() {
            var func;
            before(function() {
                func = model._hasUnescapedParens.bind(model);
            });

            it ('hasUnescapedParens(arg) should return correctly', function() {
                expect(func('(')).to.equal(true);
                expect(func(')')).to.equal(true);
                expect(func('"")')).to.equal(true);
                expect(func('"\\"")')).to.equal(true);
                expect(func(')(')).to.equal(true);

                expect(func('")"')).to.equal(false);
                expect(func('")\\)"')).to.equal(false);
                expect(func('\\)')).to.equal(false);
                expect(func('"\\")')).to.equal(false);
            });
        });

        describe ("validate eval", function() {
            var parseTypeCache;
            var fn;
            before(function() {
                parseTypeCache = GeneralOpPanelModel.parseType;
                fn = model._validateEval.bind(model);
            });

            it("invalid input should be caught by parser", function() {
                const parsedEval = XDParser.XEvalParser.parseEvalStr("a");
                expect(fn(parsedEval)).to.equal("line 1:1 no viable alternative at input \'a\'");
            });

            it("invalid function should be caught", function() {
                const parsedEval = XDParser.XEvalParser.parseEvalStr("xx(a)");
                expect(fn(parsedEval)).to.equal("\"xx\" is not a supported function.");
            });

            it("invalid string type should be caught", function() {
                GeneralOpPanelModel.parseType= () => ["integer", "float", "boolean"]; // the type that the eval string should output
                // output type === "float"
                const parsedEval = XDParser.XEvalParser.parseEvalStr("add(1, 'a')");
                expect(fn(parsedEval)).to.equal("Data type is invalid. Expected: integer/float/boolean, Entered: string.");
            });

            it("invalid string type should be caught", function() {
                GeneralOpPanelModel.parseType= () => ["integer", "float", "boolean"];
                const parsedEval = XDParser.XEvalParser.parseEvalStr("add(1, add(2,'a'))");
                expect(fn(parsedEval)).to.equal("Data type is invalid. Expected: integer/float/boolean, Entered: string.");
            });

            it("invalid integer type should be caught", function() {
                GeneralOpPanelModel.parseType= () => ["string"];
                const parsedEval = XDParser.XEvalParser.parseEvalStr("concat(1, 3)");
                expect(fn(parsedEval)).to.equal("Data type is invalid. Expected: string, Entered: integer.");
            });

            it("invalid float type should be caught", function() {
                GeneralOpPanelModel.parseType= () => ["string"];
                const parsedEval = XDParser.XEvalParser.parseEvalStr("concat(3.2, 1)");
                expect(fn(parsedEval)).to.equal("Data type is invalid. Expected: string, Entered: float.");
            });

            it("invalid colArg(int) type should be caught", function() {
                GeneralOpPanelModel.parseType= () => ["string"];
                const parsedEval = XDParser.XEvalParser.parseEvalStr("concat(prefix::average_stars, 3)");
                expect(fn(parsedEval)).to.equal("Data type is invalid. Expected: string, Entered: number.");
            });

            after(function() {
                GeneralOpPanelModel.parseType = parseTypeCache;
            });
        });

    });

    after(function() {
        mapOpPanel.close();
    });
});
