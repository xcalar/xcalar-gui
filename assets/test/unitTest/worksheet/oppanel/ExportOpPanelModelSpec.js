describe("ExportOpPanelModel Test", function() {

    var model;
    var oldDriverList;
    var calledDriverList = false;
    var drivers;
    var cols;
    var node;


    before(function () {
        model = new ExportOpPanelModel();
        oldDriverList = XcalarDriverList;
        node = new DagNodeExport({});
        const parentNode = new DagNodeFilter({});
        cols = [new ProgCol({
            backName: xcHelper.getPrefixColName(null, 't1'),
            type: "number"
        }),
        new ProgCol({
            backName: xcHelper.getPrefixColName(null, 't2'),
            type: "string"
        })];
        parentNode.getLineage = function() {
            return {getColumns: function() {
                return cols;
            }}
        };
        node.getParents = function() {
            return [parentNode];
        }
        drivers = [
            {
                "name": "test1",
                "params" : [
                    {
                        "name": "param1",
                        "type": "string",
                        "description": "desc",
                        "secret": false,
                        "defArg": "notstri",
                        "optional": false
                    }
                ]
            },
            {
                "name": "test2",
                "params" : [
                    {
                        "name": "param1",
                        "type": "integer",
                        "description": "desc",
                        "secret": false,
                        "optional": false
                    }
                ]
            },
            {
                "name": "full test driver",
                "params" : [
                    {
                        "name": "str param",
                        "type": "string",
                        "description": "desc",
                        "secret": false,
                        "defArg": "default",
                        "optional": false
                    },
                    {
                        "name": "int param",
                        "type": "integer",
                        "description": "desc",
                        "secret": false,
                        "optional": false
                    },
                    {
                        "name": "bool param",
                        "type": "boolean",
                        "description": "desc",
                        "secret": false,
                        "optional": false
                    },
                    {
                        "name": "secret optional param",
                        "type": "string",
                        "description": "desc",
                        "secret": true,
                        "optional": true
                    },
                    {
                        "name": "target param",
                        "type": "target",
                        "description": "desc",
                        "secret": false,
                        "optional": false
                    },
                ]
            },
        ]
        XcalarDriverList = function() {
            calledDriverList = true;
            return PromiseHelper.deferred().resolve(drivers);
        };
    });

    describe("Should be created correctly from prior info", function () {
        it("Should be created from a dag input", () => {
            var colMap = new Map();
            colMap.set("t1",cols[0]);
            colMap.set("t2",cols[1]);
            var checkModel = ExportOpPanelModel.fromDagInput( {
                    columns: [{sourceColumn: "t1", destColumn: "t1"}],
                    driver: "test1",
                    driverArgs: {"param1": "stri"}
                },
                colMap,
                drivers
            );
            expect(checkModel.loadedName).to.equal("test1");
            expect(checkModel.driverArgs.length).to.equal(1);
            expect(checkModel.columnList.length).to.equal(2);
        });

        it("should be created from a dagnode", () => {
            var checkModel = ExportOpPanelModel.fromDag(node);
            expect(checkModel.loadedName).to.equal('');
            expect(checkModel.driverArgs).to.equal(undefined);
            expect(checkModel.columnList.length).to.equal(2);
        });
    });

    it("Should load drivers correctly", function () {
        calledDriverList = false;
        model.loadDrivers();
        expect(calledDriverList).to.be.true;
        expect(model.exportDrivers.length).to.equal(3);
    });

    it("Should convert to the export input struct correctly", function () {
        var colMap = new Map();
        colMap.set("t1",cols[0]);
        colMap.set("t2",cols[1]);
        let exportInput = {
            columns: [{sourceColumn: "t1", destColumn: "t1"}],
            driver: "test1",
            driverArgs: {"param1": "stri"}
        }
        model = ExportOpPanelModel.fromDagInput( 
            exportInput,
            colMap,
            drivers
        );
        expect(model.toDag()).to.deep.equal(exportInput);
    });

    it("Should construct parameters correctly", function () {
        var params = model.constructParams(drivers[2]);
        expect(params.length).to.equal(5);
        expect(params[0]).to.deep.equal({
            "name": "str param",
            "type": "string",
            "optional": false,
            "value": "default"
        });
    });

    it("Should construct parameters correctly given old parameters", function () {
        var params = model.constructParams(drivers[0], {"param1": "stri"});
        expect(params.length).to.equal(1);
        expect(params[0]).to.deep.equal({
            "name": "param1",
            "type": "string",
            "optional": false,
            "value": "stri"
        });
    });

    it("Should set up params correctly", function() {
        model.setUpParams(drivers[2], $("#exportSQLTableModal"));
        expect(model.driverArgs.length).to.equal(5);
        expect(model.driverArgs[0]).to.deep.equal({
            "name": "str param",
            "type": "string",
            "optional": false,
            "value": "default"
        });
    });

    it("Should set a parameters value correctly", function () {
        model.setUpParams(drivers[2], $("#exportSQLTableModal"));
        expect(model.driverArgs[0]).to.deep.equal({
            "name": "str param",
            "type": "string",
            "optional": false,
            "value": "default"
        });
        model.setParamValue("cat",0);
        expect(model.driverArgs[0]["value"]).to.equal("cat");
        model.setParamValue("",0);
        expect(model.driverArgs[0]["value"]).to.be.null;

        model.setUpParams(drivers[1], $("#exportSQLTableModal"));
        expect(model.driverArgs[0]).to.deep.equal({
            "name": "param1",
            "type": "integer",
            "optional": false,
            "value": null
        });
        model.setParamValue(5,0);
        expect(model.driverArgs[0]["value"]).to.equal(5);
        model.setParamValue("2",0);
        expect(model.driverArgs[0]["value"]).to.equal(2);
        model.setParamValue("",0);
        expect(model.driverArgs[0]["value"]).to.be.null;
    });

    describe("Verify export input tests", function () {
        it("Should return error if no column list", function () {
            var res = model.verifyDagInput({
                columns: null,
                driver: null,
                driverArgs: null
            });
            expect(res).to.equal("Input must have column list.");
        });

        it("Should return error if no driver", function () {
            var res = model.verifyDagInput({
                columns: [],
                driver: null,
                driverArgs: null
            });
            expect(res).to.equal("Input must have associated driver.");
        });

        it("Should return error if no columns", function () {
            var res = model.verifyDagInput({
                columns: [],
                driver: "invalid",
                driverArgs: null
            });
            expect(res).to.equal("Cannot export empty result.");
        });

        it("Should return error if driver invalid", function () {
            var res = model.verifyDagInput({
                columns: [{sourceColumn: "t1", destColumn: "t1"}],
                driver: "invalid",
                driverArgs: null
            });
            expect(res).to.equal('Invalid driver specified: "invalid"');
        });

        it("Should return error if too many or too few params", function () {
            var res = model.verifyDagInput({
                columns: [{sourceColumn: "t1", destColumn: "t1"}],
                driver: "test1",
                driverArgs: {}
            });
            expect(res).to.equal("Invalid number of parameters for driver specified");
            res = model.verifyDagInput({
                columns: [{sourceColumn: "t1", destColumn: "t1"}],
                driver: "test1",
                driverArgs: {"param1": "stri", "param2": "stri"}
            });
            expect(res).to.equal("Invalid number of parameters for driver specified");
        });

        it("Should return error if invalid param specified", function () {
            var res = model.verifyDagInput({
                columns: [{sourceColumn: "t1", destColumn: "t1"}],
                driver: "test1",
                driverArgs: {"invalid": "stri"}
            });
            expect(res).to.equal('Parameter "invalid" is not a driver parameter');
        });

        it("Should return nothing if valid", function () {
            var res = model.verifyDagInput({
                columns: [{sourceColumn: "t1", destColumn: "t1"}],
                driver: "test1",
                driverArgs: {"param1": "stri"}
            });
            expect(res).to.equal("");
        });

    });

    it("Should set all columns correctly", function() {
        model.setAllCol(false);
        expect(model.columnList[0].isSelected).to.be.false;
        expect(model.columnList[1].isSelected).to.be.false;
        model.setAllCol(true);
        expect(model.columnList[0].isSelected).to.be.true;
        expect(model.columnList[1].isSelected).to.be.true;
        model.setAllCol(false);
        expect(model.columnList[0].isSelected).to.be.false;
        expect(model.columnList[1].isSelected).to.be.false;
    });

    it("Should toggle columns correctly", function() {
        model.setAllCol(false);
        expect(model.columnList[0].isSelected).to.be.false;
        model.toggleCol(0);
        expect(model.columnList[0].isSelected).to.be.true;
        model.toggleCol(0);
        expect(model.columnList[1].isSelected).to.be.false;
    });

    it("Should hide columns correctly", function() {
        expect(model.columnList[0].isHidden).to.be.false;
        expect(model.columnList[1].isHidden).to.be.false;
        model.hideCols("a");
        expect(model.columnList[0].isHidden).to.be.true;
        expect(model.columnList[1].isHidden).to.be.true;
        model.hideCols("t");
        expect(model.columnList[0].isHidden).to.be.false;
        expect(model.columnList[1].isHidden).to.be.false;
        model.hideCols("t1");
        expect(model.columnList[0].isHidden).to.be.false;
        expect(model.columnList[1].isHidden).to.be.true;
        model.hideCols("");
    });

    it("Should only set all non hidden columns correctly", function() {
        model.hideCols("t2");
        expect(model.columnList[0].isHidden).to.be.true;
        model.setAllCol(true);
        expect(model.columnList[0].isSelected).to.be.false;
        expect(model.columnList[1].isSelected).to.be.true;
        model.setAllCol(false);
    });

    it("Should set and check if advanced mode correctly", function() {
        model.setAdvMode(false);
        expect(model.isAdvMode()).to.be.false;
        model.setAdvMode(true);
        expect(model.isAdvMode()).to.be.true;
    });

    after(function() {
        XcalarDriverList = oldDriverList;
    });
});
