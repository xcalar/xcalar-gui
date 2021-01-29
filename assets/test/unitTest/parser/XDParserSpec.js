describe("XDParser Test", function() {
    let parse;
    let testCases;
    let failTestCases;
    before(() => {
        console.log("XDParser Test");
        parse = XDParser.XEvalParser.parseEvalStr;
    });

    it("testing general parser", () => {
        testCases = {
            "a()": {
                fnName: "a",
                type: "fn",
                args: [],
            },
            "add()": {
                fnName: "add",
                type: "fn",
                args: [],
            },
            "add(1)": {
                fnName: "add",
                type: "fn",
                args: [{
                    value: "1",
                    type: "integerLiteral"
                }]
            },
            "add(1,2)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: "1",
                        type: "integerLiteral"
                    },
                    {
                        value: "2",
                        type: "integerLiteral"
                    }
                ]
            },
            "add( 1 )": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: "1",
                        type: "integerLiteral"
                    }
                ]
            },
            "add( 1, 2)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: "1",
                        type: "integerLiteral"
                    },
                    {
                        value: "2",
                        type: "integerLiteral"
                    }
                ]
            },
            "add( 1, 2 )": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: "1",
                        type: "integerLiteral"
                    },
                    {
                        value: "2",
                        type: "integerLiteral"
                    }
                ]
            },
            'add( "a", "b")': {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: '"a"',
                        type: "stringLiteral"
                    },
                    {
                        value: '"b"',
                        type: "stringLiteral"
                    }
                ]
            },
            'add( "a\\c", "b")': {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        value: '"a\\c"',
                        type: "stringLiteral"
                    },
                    {
                        value: '"b"',
                        type: "stringLiteral"
                    }
                ]
            },
            'add("1")': {
                fnName: "add",
                type: "fn",
                args: [{
                    value: '"1"',
                    type: "stringLiteral"
                }]
            },
            "add('1')": {
                fnName: "add",
                type: "fn",
                args: [{
                    value: "'1'",
                    type: "stringLiteral"
                }]
            },
            "add:udf(1)": {
                fnName: "add:udf",
                type: "fn",
                args: [{
                    value: "1",
                    type: "integerLiteral"
                }]
            },
            "a:b(1)": {
                fnName: "a:b",
                type: "fn",
                args: [{
                    value: "1",
                    type: "integerLiteral"
                }]
            },
            "a:b(\"fake(func)\")": {
                fnName: "a:b",
                type: "fn",
                args: [{
                    value: "\"fake(func)\"",
                    type: "stringLiteral"
                }]
            },
            "recursive(add(3,\"word\"))": {
                fnName: "recursive",
                type: "fn",
                args: [
                    {
                        fnName: "add",
                        type: "fn",
                        args: [
                            {
                                value: "3",
                                type: "integerLiteral"
                            },
                            {
                                value: "\"word\"",
                                type: "stringLiteral"
                            },
                        ],
                    }
                ]
            },
            "recursive(4, add(3,\"word\"))": {
                fnName: "recursive",
                type: "fn",
                args: [
                    {
                        value: "4",
                        type: "integerLiteral"
                    },
                    {
                        fnName: "add",
                        type: "fn",
                        args: [
                            {
                                value: "3",
                                type: "integerLiteral"
                            },
                            {
                                value: "\"word\"",
                                type: "stringLiteral"
                            },
                        ],
                    }
                ]
            }
        };

        for (let testCase in testCases) {
            let res = parse(testCase);
            if (JSON.stringify(res).length !== JSON.stringify(testCases[testCase]).length) {

                console.log("******* " + testCase + " has parsing error");
                console.log(res, testCases[testCase]);
            }
            // console.log(testCase);
            expect(res).to.deep.equal(testCases[testCase]);
            expect(res.error).to.be.undefined;
        }
    });

    it("testing column names", () => {
        testCases = {
            "add(colName)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "colName"
                    }
                ]
            },
            "add(colName2)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "colName2"
                    }
                ]
            },
            "add(col_Name3)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "col_Name3"
                    }
                ]
            },
            "add(prefix::colName)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName"
                    }
                ]
            },
            "add(prefix::colName2)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName2"
                    }
                ]
            },
            "add(prefix::colName_3)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName_3"
                    }
                ]
            },
            "add(prefix::colName[0])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0]"
                    }
                ]
            },
            "add(prefix::colName[0][1])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0][1]"
                    }
                ]
            },
            "add(prefix::colName[0][1].test)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0][1].test"
                    }
                ]
            },
            "add(prefix::colName[0][1].test.dot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0][1].test.dot"
                    }
                ]
            },
            "add(prefix::colName[0].test)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0].test"
                    }
                ]
            },
            "add(prefix::colName[0].test[2])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[0].test[2]"
                    }
                ]
            },
            "add(prefix::colName.dot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot"
                    }
                ]
            },
            "add(prefix::colName.dot.second)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot.second"
                    }
                ]
            },
            "add(prefix::colName.dot[1])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1]"
                    }
                ]
            },
            "add(prefix::colName.dot[1].dot[2])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1].dot[2]"
                    }
                ]
            },
            "add(prefix::colName.dot[1].dot.dot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1].dot.dot"
                    }
                ]
            },
            "add(prefix::colName.dot[1].dot.dot.last)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1].dot.dot.last"
                    }
                ]
            },
            "add(prefix::colName[1].dot.dot.last)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName[1].dot.dot.last"
                    }
                ]
            },
            "add(prefix::colName.dot[1].dot.dot[2])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1].dot.dot[2]"
                    }
                ]
            },
            "add(prefix::colName.dot[1])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot[1]"
                    }
                ]
            },
            "add(prefix::colName\\.dot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName\\.dot"
                    }
                ]
            },
            "add(prefix::colName\\.dot.otherdot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName\\.dot.otherdot"
                    }
                ]
            },
            "add(prefix::colName.dot\\.otherdot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot\\.otherdot"
                    }
                ]
            },
            "add(prefix::colName.dot\\.otherdot[0])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot\\.otherdot[0]"
                    }
                ]
            },
            "add(prefix::colName.dot\\.otherdot[0].a\\.b)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName.dot\\.otherdot[0].a\\.b"
                    }
                ]
            },
            "add(prefix::colName\\[3\\])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName\\[3\\]"
                    }
                ]
            },
            "add(prefix::colName\\[3\\].dot)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName\\[3\\].dot"
                    }
                ]
            },
            "add(prefix::colName\\[3\\].dot[2])": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "prefix::colName\\[3\\].dot[2]"
                    }
                ]
            },
        };

        for (let testCase in testCases) {
            let res = parse(testCase);
            if (JSON.stringify(res).length !== JSON.stringify(testCases[testCase]).length) {

                console.log("******* " + testCase + " has parsing error");
                console.log("result:", res, "expected:", testCases[testCase]);
            }
            // console.log(testCase);
            expect(res).to.deep.equal(testCases[testCase]);
            expect(res.error).to.be.undefined;
        }
    })

    it("testing params", () => {
        testCases = {
            "param(<test>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "paramArg",
                        value: "<test>"
                    }
                ]
            },
            "param(2, <test>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "paramArg",
                        value: "<test>"
                    }
                ]
            },
            "param(2, a<test>b)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "paramArg",
                        value: "a<test>b"
                    }
                ]
            },
            "param(2, col.<test>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "paramArg",
                        value: "col.<test>"
                    }
                ]
            },
            "param(2, <test2>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "paramArg",
                        value: "<test2>"
                    }
                ]
            },
            "param(2, <test_b2>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "paramArg",
                        value: "<test_b2>"
                    }
                ]
            },
            "<param>(test)": {
                fnName: "<param>",
                type: "fn",
                args: [
                    {
                        type: "columnArg",
                        value: "test"
                    }
                ]
            },
            "param(2, <test>(\"hey\"))": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "fn",
                        fnName: "<test>",
                        args: [
                            {
                                type: "stringLiteral",
                                value: '"hey"'
                            }
                        ]
                    }
                ]
            },
            "test(2, add(3, <nest>))": {
                fnName: "test",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "fn",
                        fnName: "add",
                        args: [
                            {
                                type: "integerLiteral",
                                value: '3'
                            },
                            {
                                type: "paramArg",
                                value: '<nest>'
                            }
                        ]
                    }
                ]
            },
            "test(2, add(<nest>))": {
                fnName: "test",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "fn",
                        fnName: "add",
                        args: [
                            {
                                type: "paramArg",
                                value: '<nest>'
                            }
                        ]
                    }
                ]
            },
            "<param>(2, add(<nest>))": {
                fnName: "<param>",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "fn",
                        fnName: "add",
                        args: [
                            {
                                type: "paramArg",
                                value: '<nest>'
                            }
                        ]
                    }
                ]
            },
            "param(2, <test>(<nest>))": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "integerLiteral",
                        value: "2"
                    },
                    {
                        type: "fn",
                        fnName: "<test>",
                        args: [
                            {
                                type: "paramArg",
                                value: '<nest>'
                            }
                        ]
                    }
                ]
            },
            "param(3.4, <test2>)": {
                fnName: "param",
                type: "fn",
                args: [
                    {
                        type: "decimalLiteral",
                        value: "3.4"
                    },
                    {
                        type: "paramArg",
                        value: "<test2>"
                    }
                ]
            }
        };

        for (let testCase in testCases) {
            let res = parse(testCase);
            if (JSON.stringify(res).length !== JSON.stringify(testCases[testCase]).length) {

                console.log("******* " + testCase + " has parsing error");
                console.log("result:", res, "expected:", testCases[testCase]);
            }
            // console.log(testCase);
            expect(res).to.deep.equal(testCases[testCase]);
            expect(res.error).to.be.undefined;
        }
    });

    it("testing aggs", () => {
        testCases = {
            "add(^agg)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "aggValue",
                        value: "^agg"
                    }
                ]
            },
            "add(^agg_agg)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "aggValue",
                        value: "^agg_agg"
                    }
                ]
            },
            "add( ^agg_agg )": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "aggValue",
                        value: "^agg_agg"
                    }
                ]
            },
            "add(^agg, ^secondAgg)": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "aggValue",
                        value: "^agg"
                    },
                    {
                        type: "aggValue",
                        value: "^secondAgg"
                    }
                ]
            },
            "add(^agg, nested(^agg2))": {
                fnName: "add",
                type: "fn",
                args: [
                    {
                        type: "aggValue",
                        value: "^agg"
                    },
                    {
                        fnName: "nested",
                        type: "fn",
                        args: [
                            {
                                type: "aggValue",
                                value: "^agg2"
                            }
                        ]
                    }
                ]
            },

        };

        for (let testCase in testCases) {
            let res = parse(testCase);
            if (JSON.stringify(res).length !== JSON.stringify(testCases[testCase]).length) {

                console.log("******* " + testCase + " has parsing error");
                console.log("result:", res, "expected:", testCases[testCase]);
            }
            // console.log(testCase);
            expect(res).to.deep.equal(testCases[testCase]);
            expect(res.error).to.be.undefined;
        }
    });

    it("testing invalid cases", () => {
        failTestCases = [
            "nothing",
            "add::twocolons(1)",
            "add::",
            "^agg(1,2)",
            "1(2,3)",
            "add(2(col))",
            "add(noLeftParenthesis",
            "add(())",
            // "add(prefix::colName.[1])"
        ]
        failTestCases.forEach((evalString) => {
            let res = parse(evalString);
            if (!res.error) {
                console.log("******* " + evalString + " should be invalid");
                console.log(res);
            }
            expect(res.error.length).to.be.gt(1);
        });
    });
});