describe("Map Dag Node Test", () => {
    let node;

    before(() => {
        console.log("Map node test");
        node = new DagNodeMap({});
    });

    it("should be a map node", () => {
        expect(node.getType()).to.equal(DagNodeType.Map);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            eval: [{evalString: "", newField: ""}],
            icv: false,
            outputTableName: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            eval: [
                {evalString: "add(col1, 1)", newField: "co1_add"},
                {evalString: "abs(col2)", newField: "co1_abs"}
            ],
            icv: true,
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });

    describe("lineageChange", function() {
        before(() => {
            node = new DagNodeMap({});
        });

        it("normal lineage change should return 2 columns", function() {
            const testParam = {
                eval: [
                    {evalString: "add(col1, 1)", newField: "col1_add"},
                    {evalString: "string(abs(col2), 10)", newField: "col2_abs"}
                ],
                icv: true
            };
            node.setParam(testParam);
            const res = node.lineageChange([]);
            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].getBackColName()).to.equal("col1_add");
            expect(res.columns[0].getType()).to.equal("float");
            expect(res.columns[1].getBackColName()).to.equal("col2_abs");
            expect(res.columns[1].getType()).to.equal("string");

            expect(res.changes.length).to.equal(2);
            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getBackColName()).to.equal("col1_add");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to.getBackColName()).to.equal("col2_abs");
        });

        it("map on 1 column nshould show correct change", function() {
            const testParam = {
                eval: [
                    {evalString: "add(col1, 1)", newField: "col1_add"}
                ],
                icv: true
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(2);
            expect(res.columns[0].getBackColName()).to.equal("col1");
            expect(res.columns[0].getType()).to.equal("string");
            expect(res.columns[1].getBackColName()).to.equal("col1_add");
            expect(res.columns[1].getType()).to.equal("float");

            expect(res.changes.length).to.equal(1);

            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getType()).to.equal("float");
            expect(res.changes[0].to.getBackColName()).to.equal("col1_add");
        });

        it("reusing column name should show correct change", function() {
            const testParam = {
                eval: [
                    {evalString: "add(col1, 1)", newField: "col1"}
                ],
                icv: true
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1");
            expect(res.columns[0].getType()).to.equal("float");

            expect(res.changes.length).to.equal(1);

            expect(res.changes[0].from.getBackColName()).to.equal("col1");
            expect(res.changes[0].from.getType()).to.equal("string");
            expect(res.changes[0].to.getBackColName()).to.equal("col1");
            expect(res.changes[0].to.getType()).to.equal("float");
        });

        it("cast with reusing name should show correct change", function() {
            node = new DagNodeMap({subType: DagNodeSubType.Cast});
            const testParam = {
                eval: [
                    {evalString: "money(col1)", newField: "col1"}
                ],
                icv: true
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1");
            expect(res.columns[0].getType()).to.equal("money");

            expect(res.changes.length).to.equal(1);

            expect(res.changes[0].from.getBackColName()).to.equal("col1");
            expect(res.changes[0].from.getType()).to.equal("string");
            expect(res.changes[0].to.getBackColName()).to.equal("col1");
            expect(res.changes[0].to.getType()).to.equal("money");
        });

        it("cast with new output name should show correct change", function() {
            node = new DagNodeMap({subType: DagNodeSubType.Cast});
            const testParam = {
                eval: [
                    {evalString: "timestamp(col1)", newField: "col1_ts"}
                ],
                icv: true
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            const res = node.lineageChange([progCol1]);
            expect(res.columns.length).to.equal(1);
            expect(res.columns[0].getBackColName()).to.equal("col1_ts");
            expect(res.columns[0].getType()).to.equal("timestamp");

            expect(res.changes.length).to.equal(1);

            expect(res.changes[0].from.getBackColName()).to.equal("col1");
            expect(res.changes[0].from.getType()).to.equal("string");
            expect(res.changes[0].to.getBackColName()).to.equal("col1_ts");
            expect(res.changes[0].to.getType()).to.equal("timestamp");
        });
    });

    describe("applyColumnMapping", function() {
        it("column name should change", function() {
            node = new DagNodeMap({});
            const testParam = {
                eval: [
                    {evalString: "add(prefix::average_stars,1)", newField: "col1"}
                ],
                icv: false
            };
            node.setParam(testParam);

            let param = node.getParam();
            expect(param.eval.length).to.equal(1);
            expect(param.eval[0].evalString).to.equal("add(prefix::average_stars,1)");

            node.applyColumnMapping({columns: {
                "prefix::average_stars": "renamedPrefix::renamedCol"
            }});

            param = node.getParam();
            expect(param.eval.length).to.equal(1);
            expect(param.eval[0].evalString).to.equal("add(renamedPrefix::renamedCol,1)");

        });
    });

    describe("udf related functions", function() {
        it("getUsedUDFModules should work", function() {
            node = new DagNodeMap({});
            const testParam = {
                eval: [
                    {evalString: "my:udf(5, another:one(1))", newField: "col1"}
                ],
                icv: false
            };
            node.setParam(testParam);
            const udfs = node.getUsedUDFModules();
            expect(udfs.size).to.equal(2);
            expect(udfs.has("my")).to.be.true;
            expect(udfs.has("another")).to.be.true;
        });

        it("getModuleResolutions should work", function(done) {
            let cachedFn = XcalarUdfGetRes;
            XcalarUdfGetRes = function() {
                return PromiseHelper.resolve({
                    name: "one",
                    resolution: "resolution1"
                })
            }
            node.getModuleResolutions()
            .then((ret) => {
                expect(ret.size).to.equal(2);
                expect(ret.get("my").name).to.equal("one");
                expect(ret.get("my").resolution).to.equal("resolution1");
                expect(ret.get("another").name).to.equal("one");
                expect(ret.get("another").resolution).to.equal("resolution1");
                done();
            })
            .fail(() => {
                done("fail");
            })
            .always(function() {
                XcalarUdfGetRes = cachedFn;
            });
        });
    });

    describe("other functions", function() {
        it("genParamHint should work", function() {
            const res = node._genParamHint();
            expect(res).to.equal("my:udf(5, another:one(1))");
        });
    });
});