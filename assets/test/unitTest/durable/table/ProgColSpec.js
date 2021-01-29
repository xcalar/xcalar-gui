describe("ProgCol constructor test", function() {
    it("should have 16 attributes", function() {
        let progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol).to.be.an.instanceof(ProgCol);
        expect(Object.keys(progCol).length).to.equal(16);
        expect(progCol).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(progCol).to.have.property("name")
        .and.to.equal("test");
        expect(progCol).to.have.property("backName")
        .and.to.equal("prefix::backTest");
        expect(progCol).to.have.property("prefix")
        .and.to.equal("prefix");
        expect(progCol).to.have.property("immediate")
        .and.to.be.false;
        expect(progCol).to.have.property("type")
        .and.to.equal(ColumnType.float);
        expect(progCol).to.have.property("knownType")
        .and.to.be.false;
        expect(progCol).to.have.property("isNewCol")
        .and.to.be.false;
        expect(progCol).to.have.property("isMinimized")
        .and.to.be.false;
        expect(progCol).to.have.property("width")
        .and.to.equal(100);
        expect(progCol).to.have.property("format")
        .and.to.be.null;
        expect(progCol).to.have.property("sizedTo")
        .and.to.equal("auto");
        expect(progCol).to.have.property("textAlign")
        .and.to.equal(ColTextAlign.Left);
        expect(progCol).to.have.property("userStr")
        .and.to.equal("");
        expect(progCol).to.have.property("func")
        .and.to.be.instanceof(ColFunc);
        expect(progCol).to.have.property("sortedColAlias")
        .and.to.be.equal("prefix::backTest");
    });

    it("should set type", function() {
        var progCol = new ProgCol({
            "name": "DATA",
            "type": ColumnType.integer,
            "func": {
                "name": "raw"
            }
        });
        progCol.setType(ColumnType.string);
        expect(progCol.getType()).to.equal(ColumnType.string);
    });

    it("Should know if is data col", function() {
        var progCol = new ProgCol({
            "name": "DATA",
            "type": ColumnType.object,
            "func": {
                "name": "raw"
            }
        });
        expect(progCol.isDATACol()).to.be.true;

        // case 2
        var progCol2 = new ProgCol({
            "name": "test",
            "type": ColumnType.object,
            "func": {
                "name": "pull"
            }
        });
        expect(progCol2.isDATACol()).to.be.false;
    });

    it("Should know if is number col", function() {
        var progCol1 = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float
        });

        var progCol2 = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.integer
        });

        var progCol3 = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.string
        });

        expect(progCol1.isNumberCol()).to.be.true;
        expect(progCol2.isNumberCol()).to.be.true;
        expect(progCol3.isNumberCol()).to.be.false;
    });

    it("Should know if is empty col", function() {
        var progCol1 = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false
        });

        var progCol2 = new ProgCol({
            "name": "",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": true
        });

        expect(progCol1.isEmptyCol()).to.be.false;
        expect(progCol2.isEmptyCol()).to.be.true;
    });

    it("Should set and get front col name", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": "float",
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getFrontColName()).to.equal("test");
        expect(progCol.getFrontColName(true)).to.equal("prefix::test");

        progCol.setFrontColName("test2");
        expect(progCol.getFrontColName()).to.equal("test2");
    });

    it("Should get and update type", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.integer,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getType()).to.equal(ColumnType.integer);
        progCol.updateType(1.2);
        expect(progCol.getType()).to.equal(ColumnType.float);

        // case 2
        progCol = new ProgCol({
            "name": "",
            "backName": "",
            "isNewCol": true
        });

        expect(progCol.getType()).to.equal(null);
        progCol.updateType(1.2);
        // cannot change empty col
        expect(progCol.getType()).to.equal(null);

        // case 3
        progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.integer,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        progCol.immediate = true;
        progCol.knownType = true;
        expect(progCol.getType()).to.equal(ColumnType.integer);
        progCol.updateType(1.2);
        // cannot change known type
        expect(progCol.getType()).to.equal(ColumnType.integer);

    });

    it("Should get and set width", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getWidth()).to.equal(100);
        progCol.setWidth(150);
        expect(progCol.getWidth()).to.equal(150);
    });

    it("Should get display width", function() {
        // case 1
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getDisplayWidth()).to.equal(100);

        // case 2
        progCol.isMinimized = true;
        expect(progCol.getDisplayWidth()).to.equal(15);
    });

    it("Should minimize and maximize column", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });
        expect(progCol.hasMinimized()).to.be.false;

        progCol.minimize();
        expect(progCol.hasMinimized()).to.be.true;
        progCol.maximize();
        expect(progCol.hasMinimized()).to.be.false;
    });

    it("Should get and set text align", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getTextAlign()).to.equal(ColTextAlign.Left);
        // error case
        progCol.setTextAlign(null);
        expect(progCol.getTextAlign()).to.equal(ColTextAlign.Left);
        // valid case
        progCol.setTextAlign(ColTextAlign.Center);
        expect(progCol.getTextAlign()).to.equal(ColTextAlign.Center);
    });

    it("Should getPrefix", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getPrefix()).to.equal("prefix");
    });

    it("Should get and set back col name", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "prefix::backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.getBackColName()).to.equal("prefix::backTest");
        // case 1
        progCol.setBackColName();
        expect(progCol.getBackColName()).to.equal("prefix::backTest");
        // case 2
        progCol.setBackColName("prefix2::test2");
        expect(progCol.getBackColName()).to.equal("prefix2::test2");
        expect(progCol.getPrefix()).to.equal("prefix2");
        // case 3
        progCol.setBackColName("test3");
        expect(progCol.getBackColName()).to.equal("test3");
        expect(progCol.getPrefix()).to.equal("");
    });

    it("Should set immediates type", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.isImmediate()).to.be.false;
        // error case
        progCol.setImmediateType();

        var testCases = [{
            "typeId": DfFieldTypeT.DfString,
            "boolean": true,
            "type": "string",
        },{
            "typeId": DfFieldTypeT.DfUnknown,
            "boolean": true,
            "type": "unknown"
        },{
            "typeId": DfFieldTypeT.DfInt32,
            "boolean": true,
            "type": "integer"
        },{
            "typeId": DfFieldTypeT.DfFloat64,
            "boolean": true,
            "type": "float"
        },{
            "typeId": DfFieldTypeT.DfBoolean,
            "boolean": true,
            "type": "boolean"
        },{
            "typeId": DfFieldTypeT.DfMixed,
            "boolean": true,
            "type": "mixed"
        },{
            "typeId": DfFieldTypeT.DfFatptr,
            "boolean": false,
            "type": ""
        },{
            "typeId": DfFieldTypeT.DfScalarObj,
            "boolean": true,
            "type": "mixed"
        }];

        testCases.forEach(function(testCase) {
            progCol.immediate = false;
            progCol.type = "";
            progCol.setImmediateType(testCase.typeId);
            expect(progCol.isImmediate()).to.equal(testCase.boolean);
            expect(progCol.getType()).to.equal(testCase.type);

            var isKnownType = (testCase.boolean && testCase.type) ? true :
                                                                    false;
            expect(progCol.isKnownType()).to.equal(isKnownType);
        });
    });

    it("Should get and set format", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "width": 100,
            "decimal": 10,
            "func": {
                "name": "pull"
            }
        });

        expect(progCol.format).to.be.null;
        expect(progCol.getFormat()).to.equal(ColFormat.Default);
        progCol.setFormat(ColFormat.Percent);
        expect(progCol.format).to.equal(ColFormat.Percent);
        expect(progCol.getFormat()).to.equal(ColFormat.Percent);

        progCol.setFormat(ColFormat.Default);
        expect(progCol.format).to.be.null;
        expect(progCol.getFormat()).to.equal(ColFormat.Default);
    });

    it("Should stringify func", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var res = progCol.stringifyFunc();
        expect(res).to.equal("pull()");

        // case 2
        progCol2 = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false,
            "func": {
                "name": "map",
                "args": [{
                    "args": ["a::b"],
                    "name": "absInt"
                }]
            }
        });

        res = progCol2.stringifyFunc();
        expect(res).to.equal("map(absInt(a::b))");
    });

    it("Should parse func", function() {
        var progCol = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false
        });

        // case 1
        progCol.userStr = "";
        progCol.parseFunc();
        expect(progCol.func.name).not.to.exist;
        // case 2
        progCol.userStr = "map(absInt(a::b))";
        progCol.parseFunc();
        expect(progCol.func.name).to.equal("map");
    });

    it('parseFuncString(str, func) should work', function() {
        // functions that call ColManager.parseFuncString already
        // make sure the params are validated
        let tests = [{
            "str": "add(1,2)",
            "expected": '{"version":1,"name":"add","args":[1,2]}'
        }, {
            "str": "add  (1,3)",
            "expected": '{"version":1,"name":"add","args":[1,3]}'
        }, {
            "str": "add(1  ,4)",
            "expected": '{"version":1,"name":"add","args":[1,4]}'
        }, {
            "str": "add ( 1  , 5  )",
            "expected": '{"version":1,"name":"add","args":[1,5]}'
        }, {
            "str": 'concat ("wo rd",5)',
            "expected": '{"version":1,"name":"concat","args":["\\\"wo rd\\\"",5]}'
        }, {
            "str": 'concat (\'wo"r"a"d\',5)',
            "expected": '{"version":1,"name":"concat","args":["\'wo\\\"r\\\"a\\\"d\'",5]}'
        }, {
            "str": 'con\\"c\\,at (\'w\\,o"r\\\'d\',5)',
            "expected": '{"version":1,"name":"con\\\\\\"c\\\\,at","args":["\'w\\\\,o\\"r\\\\\'d\'",5]}'
        }, {
            "str": 'concat ("wo\\"rd",6)',
            "expected": '{"version":1,"name":"concat","args":["\\"wo\\\\\\"rd\\"",6]}'
        }, {
            "str": 'concat ("w\'o\\"rd",7)',
            "expected": '{"version":1,"name":"concat","args":["\\"w\'o\\\\\\"rd\\"",7]}'
        }, {
            "str": 'add(1e2,7)',
            "expected": '{"version":1,"name":"add","args":["1e2",7]}'
        }, {
            "str": 'add(0xFF,8)',
            "expected": '{"version":1,"name":"add","args":["0xFF",8]}'
        }, {
            "str": 'add(null,9)',
            "expected": '{"version":1,"name":"add","args":["null",9]}'
        }, {
            "str": "map(add()",
            "expected": '{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[]}]}'
        }, {
            "str": "map(add( , )",
            "expected": '{"version":1,"name":"map","args":[{"version":1,"name":"add","args":["",""]}]}'
        }, {
            "str": "map(add(,)",
            "expected": '{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[]}]}'
        }, {
            "str": "map(add(1,)",
            "expected": '{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[1]}]}'
        }, {
            "str": "map(add(1,,2)",
            "expected": '{"version":1,"name":"map","args":[{"version":1,"name":"add","args":[1,2]}]}'
        }, {
            "str": 'map( add(1,con cat ("ab", "cd" )) )',
            "expected": '{"version":1,"name":"map","args":' +
                            '[{"version":1,"name":"add","args":' +
                                '[1,{"version":1,"name":"con cat","args":["\\"ab\\"","\\"cd\\""]}]' +
                            '}]' +
                        '}'
        }];

        let progCol = new ProgCol({
            "name": "test",
            "backName": "backTest",
            "type": ColumnType.float,
            "isNewCol": false
        });
        tests.forEach(function(test) {
            let func = progCol._parseFuncString(test.str);
            let expected = JSON.stringify(func);
            if (expected !== test.expected) {
                console.error(test, "is wrong");
            }
            expect(expected).to.equal(test.expected);
        });
    });
});