describe("GroupBy Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeGroupBy({});
    });

    it("should be an group by node", () => {
        expect(node.getType()).to.equal(DagNodeType.GroupBy);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            groupBy: [""],
            aggregate: [{operator: "", sourceColumn: "", destColumn: "", distinct: false, cast: null}],
            includeSample: false,
            icv: false,
            groupAll: false,
            newKeys: [],
            dhtName: "",
            joinBack: false,
            outputTableName: ""
        });
    });

    it("should set parameter", () => {
        const testParam = {
            groupBy: ["groupOnCol"],
            aggregate: [{operator: "count", sourceColumn: "aggCol", destColumn: "count_agg", distinct: false, cast: null}],
            includeSample: true,
            icv: false,
            groupAll: false,
            newKeys: ["count_agg"],
            dhtName: "",
            joinBack: false,
            outputTableName: ""
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });


    describe("lineageChange", function() {
        before(() => {
            node = new DagNodeGroupBy({});
        });

        it("normal lineage change should return 2 columns", function() {
            const testParam = {
                "groupBy": [
                    "column1",
                    "column2"
                ],
                "aggregate": [
                    {
                        "operator": "count",
                        "sourceColumn": "column3",
                        "destColumn": "a",
                        "distinct": false,
                        "cast": null
                    },
                    {
                        "operator": "avg",
                        "sourceColumn": "column4",
                        "destColumn": "b",
                        "distinct": false,
                        "cast": null
                    }
                ],
                "includeSample": false,
                "joinBack": false,
                "icv": false,
                "groupAll": false,
                "newKeys": [],
                "dhtName": "",
                "outputTableName": ""
            };
            node.setParam(testParam);
            const res = node.lineageChange([]);

            expect(res.columns.length).to.equal(2);
            console.log(res);
            expect(res.columns[0].getBackColName()).to.equal("a");
            expect(res.columns[0].getType()).to.equal("integer");
            expect(res.columns[1].getBackColName()).to.equal("b");
            expect(res.columns[1].getType()).to.equal("float");

            expect(res.changes.length).to.equal(2);
            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getBackColName()).to.equal("a");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to.getBackColName()).to.equal("b");
        });

        it("groupby on 2 columns should show correct change", function() {
            const testParam = {
                "groupBy": [
                    "col1",
                    "col2",
                ],
                "aggregate": [
                    {
                        "operator": "count",
                        "sourceColumn": "col3",
                        "destColumn": "a",
                        "distinct": false,
                        "cast": null
                    },
                    {
                        "operator": "avg",
                        "sourceColumn": "col4",
                        "destColumn": "b",
                        "distinct": false,
                        "cast": null
                    }
                ],
                "includeSample": false,
                "joinBack": false,
                "icv": false,
                "groupAll": false,
                "newKeys": [],
                "dhtName": "",
                outputTableName: ""
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            var progCol2 = new ProgCol({
                "backName": "col2",
                "type": "string"
            });
            var progCol3 = new ProgCol({
                "backName": "col3",
                "type": "string"
            });
            var progCol4 = new ProgCol({
                "backName": "col4",
                "type": "string"
            });
            const res = node.lineageChange([progCol1, progCol2, progCol3, progCol4]);

            expect(res.columns.length).to.equal(4);
            expect(res.columns[0].getBackColName()).to.equal("a");
            expect(res.columns[0].getType()).to.equal("integer");
            expect(res.columns[1].getBackColName()).to.equal("b");
            expect(res.columns[1].getType()).to.equal("float");
            expect(res.columns[2].getBackColName()).to.equal("col1");
            expect(res.columns[2].getType()).to.equal("string");
            expect(res.columns[3].getBackColName()).to.equal("col2");
            expect(res.columns[3].getType()).to.equal("string");

            expect(res.changes.length).to.equal(4);

            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getType()).to.equal("integer");
            expect(res.changes[0].to.getBackColName()).to.equal("a");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to.getType()).to.equal("float");
            expect(res.changes[1].to.getBackColName()).to.equal("b");
            expect(res.changes[2].from.getType()).to.equal("string");
            expect(res.changes[2].from.getBackColName()).to.equal("col3");
            expect(res.changes[2].to).to.be.null;
            expect(res.changes[3].from.getType()).to.equal("string");
            expect(res.changes[3].from.getBackColName()).to.equal("col4");
            expect(res.changes[3].to).to.be.null;
        });

        it("groupby on 2 columns with new keys should show correct change", function() {
            const testParam = {
                "groupBy": [
                    "col1",
                    "col2",
                ],
                "aggregate": [
                    {
                        "operator": "count",
                        "sourceColumn": "col3",
                        "destColumn": "a",
                        "distinct": false,
                        "cast": null
                    },
                    {
                        "operator": "avg",
                        "sourceColumn": "col4",
                        "destColumn": "b",
                        "distinct": false,
                        "cast": null
                    }
                ],
                "includeSample": false,
                "joinBack": false,
                "icv": false,
                "groupAll": false,
                "newKeys": ["col1a", "col2a"],
                "dhtName": "",
                outputTableName: ""
            };
            node.setParam(testParam);
            var progCol1 = new ProgCol({
                "backName": "col1",
                "type": "string"
            });
            var progCol2 = new ProgCol({
                "backName": "col2",
                "type": "string"
            });
            var progCol3 = new ProgCol({
                "backName": "col3",
                "type": "string"
            });
            var progCol4 = new ProgCol({
                "backName": "col4",
                "type": "string"
            });
            const res = node.lineageChange([progCol1, progCol2, progCol3, progCol4]);

            expect(res.columns.length).to.equal(4);
            expect(res.columns[0].getBackColName()).to.equal("a");
            expect(res.columns[0].getType()).to.equal("integer");
            expect(res.columns[1].getBackColName()).to.equal("b");
            expect(res.columns[1].getType()).to.equal("float");
            expect(res.columns[2].getBackColName()).to.equal("col1a");
            expect(res.columns[2].getType()).to.equal("string");
            expect(res.columns[3].getBackColName()).to.equal("col2a");
            expect(res.columns[3].getType()).to.equal("string");

            expect(res.changes.length).to.equal(6);

            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getType()).to.equal("integer");
            expect(res.changes[0].to.getBackColName()).to.equal("a");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to.getType()).to.equal("float");
            expect(res.changes[1].to.getBackColName()).to.equal("b");
            expect(res.changes[2].from.getType()).to.equal("string");
            expect(res.changes[2].from.getBackColName()).to.equal("col1");
            expect(res.changes[2].to.getType()).to.equal("string");
            expect(res.changes[2].to.getBackColName()).to.equal("col1a");
            expect(res.changes[3].from.getType()).to.equal("string");
            expect(res.changes[3].from.getBackColName()).to.equal("col2");
            expect(res.changes[3].to.getType()).to.equal("string");
            expect(res.changes[3].to.getBackColName()).to.equal("col2a");

            expect(res.changes[4].from.getType()).to.equal("string");
            expect(res.changes[4].from.getBackColName()).to.equal("col3");
            expect(res.changes[4].to).to.be.null;
            expect(res.changes[5].from.getType()).to.equal("string");
            expect(res.changes[5].from.getBackColName()).to.equal("col4");
            expect(res.changes[5].to).to.be.null
        });

        it("lineage change with joinBack = true and prefixed column", function() {
            const testParam = {
                "groupBy": [
                    "prefix::column1",
                    "column2"
                ],
                "aggregate": [
                    {
                        "operator": "count",
                        "sourceColumn": "column3",
                        "destColumn": "a",
                        "distinct": false,
                        "cast": null
                    },
                    {
                        "operator": "avg",
                        "sourceColumn": "column4",
                        "destColumn": "b",
                        "distinct": false,
                        "cast": null
                    }
                ],
                "includeSample": false,
                "joinBack": true,
                "icv": false,
                "groupAll": false,
                "newKeys": [],
                "dhtName": "",
                outputTableName: ""
            };
            node.setParam(testParam);

            var progCol1 = new ProgCol({
                "backName": "prefix::column1",
                "type": "string"
            });
            var progCol2 = new ProgCol({
                "backName": "column5",
                "type": "string"
            });
            const res = node.lineageChange([progCol1, progCol2]);

            expect(res.columns.length).to.equal(4);
            expect(res.columns[0].getBackColName()).to.equal("a");
            expect(res.columns[0].getType()).to.equal("integer");
            expect(res.columns[1].getBackColName()).to.equal("b");
            expect(res.columns[1].getType()).to.equal("float");
            expect(res.columns[2].getBackColName()).to.equal("column1");
            expect(res.columns[2].getType()).to.equal("string");
            expect(res.columns[3].getBackColName()).to.equal("column5");
            expect(res.columns[3].getType()).to.equal("string");

            expect(res.changes.length).to.equal(3);
            expect(res.changes[0].from).to.be.null;
            expect(res.changes[0].to.getBackColName()).to.equal("a");
            expect(res.changes[1].from).to.be.null;
            expect(res.changes[1].to.getBackColName()).to.equal("b");
            expect(res.changes[2].from.getBackColName()).to.equal("prefix::column1");
            expect(res.changes[2].to.getBackColName()).to.equal("column1");



        });

        it("update new keys should work", function() {
            let param = node.getParam();
            expect(param.newKeys.length).to.equal(0);

            const keys = node.updateNewKeys([]);

            expect(keys.length).to.equal(2);
            expect(keys[0]).to.equal("column1");
            expect(keys[1]).to.equal("column2");
        });
    });

    describe("applyColumnMapping", function() {
        it("column name should change", function() {
            node = new DagNodeGroupBy({});
            const testParam = {
                "groupBy": [
                    "prefix::column1",
                ],
                "aggregate": [
                    {
                        "operator": "count",
                        "sourceColumn": "column3",
                        "destColumn": "a",
                        "distinct": false,
                        "cast": null
                    }
                ],
                "includeSample": false,
                "joinBack": true,
                "icv": false,
                "groupAll": false,
                "newKeys": [],
                "dhtName": "",
                outputTableName: ""
            };
            node.setParam(testParam);

            node.applyColumnMapping({columns: {
                "prefix::column1": "renamedPrefix::renamedCol",
                "column3": "newColumn3",
                "a": "newColumn4"
            }});

            param = node.getParam();
            expect(param.groupBy.length).to.equal(1);
            expect(param.groupBy[0]).to.equal("renamedPrefix::renamedCol");
            expect(param.aggregate[0].sourceColumn).to.equal("newColumn3");
            expect(param.aggregate[0].destColumn).to.equal("a");
        });
    });

    describe("other functions", function() {
        it("genParamHint should work", function() {
            const res = node._genParamHint();
            expect(res).to.equal("Group by renamedPrefix::renamedCol\nhaving count(newColumn3)");
        });
    });
});