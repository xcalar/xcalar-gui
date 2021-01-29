describe("Dag Node Basic Test", () => {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });
    it("should get id", () => {
        const node = new DagNode({id: "test"});
        expect(node.getId()).to.be.equal("test");
    });

    it("should auto generate id", () => {
        const node = new DagNode();
        expect(node.getId().startsWith("dag_")).to.be.true;
    });

    it("should get node type", () => {
        const node = new DagNode({type: DagNodeType.Filter});
        expect(node.getType()).to.equal(DagNodeType.Filter);
    });

    it("should get node's max parent that can have", () => {
        const node = new DagNode({});
        expect(node.getMaxParents()).to.equal(1);
    });

    it("should get node's max children that can have", () => {
        const node = new DagNode({});
           expect(node.getMaxChildren()).to.equal(-1);
    });

    it("should get all parents", () => {
        const node = new DagNode();
        expect(node.getParents()).to.be.an("array");
    });

    it("should get current number of parent", () => {
        const node = new DagNode();
        expect(node.getNumParent()).to.equal(0);
    });

    it("should get all children", () => {
        const node = new DagNode();
        expect(node.getChildren()).to.be.an("array");
    });

    it("should get position", () => {
        const node = new DagNode();
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: -1, y: -1});
    });

    it("should set position", () => {
        const node = new DagNode();
        node.setPosition({x: 1, y: 2});
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: 1, y: 2});
    });

    it("should get description", () => {
        const node = new DagNode();
        expect(node.getDescription()).to.equal("");
    });

    it("should set description", () => {
        const node = new DagNode();
        node.setDescription("test");
        expect(node.getDescription()).to.equal("test");
    });

    it("should remove description", () => {
        const node = new DagNode();
        node.setDescription("test");
        node.removeDescription();
        expect(node.getDescription()).to.be.undefined;
    });

    it("should get state", () => {
        const node = new DagNode();
        expect(node.getState()).to.equal(DagNodeState.Unused);
    });

    it("should change state", () => {
        const node = new DagNode();

        node.beCompleteState();
        expect(node.getState()).to.equal(DagNodeState.Complete);

        node.beErrorState();
        expect(node.getState()).to.equal(DagNodeState.Error);

        node.beRunningState();
        expect(node.getState()).to.equal(DagNodeState.Running);
    });

    it("should get table", () => {
        const node = new DagNode();
        expect(node.getTable()).to.be.undefined;
    });

    it("should set tabble", () => {
        const node = new DagNode();
        node.setTable("testName");
        expect(node.getTable()).to.equal("testName");
    });

    it("set table should pop up event", () => {
        const node = new DagNode();
        node.registerEvents(DagNodeEvents.ResultSetChange, (info) => {
            expect(node.getId()).to.equal(info.nodeId);
            expect(info.oldResult).to.be.empty;
            expect(info.result).to.equal("testName");
            expect(info.node).to.equal(node);
        });

        node.setTable("testName", true);
        expect(node.getTable()).to.equal("testName");
    });

    it("should remove table when running", () => {
        const node = new DagNode();
        node.setTable("testName");
        node.beRunningState();
        expect(node.getTable()).to.be.undefined;
    });

    it("hasResult should work", () => {
        const node = new DagNode();
        expect(node.hasResult()).to.be.false;

        node.beCompleteState();
        expect(node.hasResult()).to.be.false;

        node.setTable("testTable");
        expect(node.hasResult()).to.be.false;

        let oldFunc = DagTblManager.Instance.hasTable;
        DagTblManager.Instance.hasTable = () => true;
        expect(node.hasResult()).to.be.true;
        DagTblManager.Instance.hasTable = oldFunc;
    });

    it("should get parameters", () => {
        const node = new DagNode({type: DagNodeType.Map});
        expect(node.getParam()).to.be.an("object");
    });

    it("should set parameters", () => {
        const node = new DagNodeMap({});
        expect(node.configured).to.be.false;
        let called = false;
        node.registerEvents(DagNodeEvents.ParamChange, (info) => {
            expect(node.getId()).to.equal(info.id);
            expect(info.node).to.equal(node);
            expect(info.hasParameters).to.be.false;
            expect(info.type).to.equal("map");
            expect(info.noAutoExecute).to.be.undefined;
            expect(info.params).to.deep.equal({
                eval: "testEval",
                icv: true,
                outputTableName: ""
            });
            called = true;
        });

        node.setParam({
            eval: "testEval",
            icv: true
        });
        expect(node.configured).to.be.true;
        expect(node.getParam()).to.deep.equal({
            eval: "testEval",
            icv: true,
            outputTableName: ""
        });
        expect(called).to.be.true;
    });

    it("should connect to parent", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(1);
    });

    it("should throw error when already has parent but connect", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.connectToParent(parentNode, 0);
            // error case
            node.connectToParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should throw error when add agg node to wrong kinds of node", () => {
        const node = new DagNode({type: DagNodeType.Join});
        const aggNode = new DagNode({type: DagNodeType.Aggregate});
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error connect to node that has max parents", () => {
        const node = new DagNode({type: DagNodeType.Dataset});
        const aggNode = new DagNode();
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should connect to children", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);
        expect(node.getChildren().length).to.equal(1);
    });

    it("should throw error connect to invalid node", () => {
        const node = new DagNode({type: DagNodeType.Export});
        const childNode = new DagNode();
        try {
            node.connectToChild(childNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(0);
        }
    });

    it("should disconnect from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        node.disconnectFromParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(0);
    });

    it("should throw error when disconnect at wrong position from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.disconnectFromParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error when disconnect at wrong parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        try {
            node.disconnectFromParent(node, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should disconnect from child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);

        node.disconnectFromChild(childNode);
        expect(node.getChildren().length).to.equal(0);
    });

    it("should throw error when disconnect wrong child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);

        try {
            node.disconnectFromChild(node);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(1);
        }
    });

    it("should serialize correctly", () => {
        const node = new DagNode();
        const secondParentNode = new DagNode();
        const childNode = new DagNodeJoin();
        childNode.connectToParent(node);
        childNode.connectToParent(secondParentNode, 1);
        const serializable = childNode.getSerializableObj();
        expect(serializable).not.to.equal(childNode);
    });

    it("should not be depreacated by default", () => {
        const node = new DagNode();
        expect(node.isDeprecated()).to.be.false;
    });

    it("should get lineage", () => {
        const node = new DagNode();
        expect(node.getLineage()).to.be.instanceof(DagLineage);
    });

    describe("DagNodeInput.stringifyEval()", function() {
        var func;
        before(function() {
            func = DagNodeInput.stringifyEval;
        })
        it("should work if no args", function() {
            var fn = {fnName: "a", args:[]};
            expect(func(fn)).to.equal('a()');

            fn = {fnName: "a", args:[{type: "fn", fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(b())');

            fn = {fnName: "a", args:[{value: 1}, {type: "fn", fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(1,b())');
        });
        it("nested should work", function() {
            var fn = {fnName:"a", args:[{value: 1}, {value: 2}, {value: 3}]};
            expect(func(fn)).to.equal('a(1,2,3)');

            var fn = {fnName:"a", args:[{value: "1"}, {value: '2'}, {value: '"3"'}]};
            expect(func(fn)).to.equal('a(1,2,"3")');

            var fn = {fnName:"a", args:[{value: 1}, {type: "fn", fnName:"b", args:[{value: 4}, {value: 5}, {value: 6}]}, {value: 3}]};
            expect(func(fn)).to.equal('a(1,b(4,5,6),3)');

            var fn = {fnName:"a", args:[{type: "fn", fnName:"b", args:[{value: 2}, {value: 3}, {value: 4}]}, {value: 1}]};
            expect(func(fn)).to.equal('a(b(2,3,4),1)');

            var fn = {fnName:"a", args:[{type: "fn", fnName:"b", args:[{value: 2}, {type: "fn", fnName:"c", args:[{value: 3}, {value: 4}]}]}, {value: 1}]};
            expect(func(fn)).to.equal('a(b(2,c(3,4)),1)');
        });
    });

    describe("column changes", () => {
        let node;
        before(() => {
            node = new DagNode({type: DagNodeType.Map});
        });
        it("DagNode.ColumnChange ordering should work", function() {
            let called = false;
            node.registerEvents(DagNodeEvents.LineageChange, (info) => {
                called = true;
            })
            node.columnChange(DagColumnChangeType.Reorder, ["test1", "test2"]);
            expect(node.getColumnOrdering()).to.deep.equal(["test1", "test2"]);
            expect(called).to.be.true;
        });
        it("DagNode.ColumnChange resize should work", function() {
            node.columnChange(DagColumnChangeType.Resize, ["test1"], [{width: 20, sizeTo: "header", isMinimized: false}]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({widthChange: {width: 20, sizeTo: "header", isMinimized: false}});
        });
        it("DagNode.ColumnChange textAlign should work", function() {
            node.columnChange(DagColumnChangeType.TextAlign, ["test1"], {alignment: "Right"});
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({widthChange: {width: 20, sizeTo: "header", isMinimized: false}, textAlign: "Right"});
        });

        it("DagNode.ColumnChange hide should work", function() {
            node.columnChange(DagColumnChangeType.Hide, ["test1"], [{type: "string"}]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({isHidden: true, type: "string"});
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);
        });

        it("DagNode.ColumnChange pull on hidden column should work", function() {
            node.columnChange(DagColumnChangeType.Pull, ["test1"]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(0);
            expect(res.has("test1")).to.be.false;
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);
        });

        it("DagNode.ColumnChange hide and undo should work", function() {
            node = new DagNode({type: DagNodeType.Map});
            node.columnChange(DagColumnChangeType.Reorder, ["test1", "test2"]);

            // change text align and then hide
            node.columnChange(DagColumnChangeType.TextAlign, ["test1"], {alignment: "Right"});
            node.columnChange(DagColumnChangeType.Hide, ["test1"], [{type: "string"}]);
            let res = node.getColumnDeltas();
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({isHidden: true, type: "string"});
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);

            // simulate an undo of hide
            let columnDeltas = [{textAlign: "Right", order: 0}];
            node.columnChange(DagColumnChangeType.Pull, ["test1"], columnDeltas);
            res = node.getColumnDeltas();
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({textAlign: "Right"});
            expect(node.getColumnOrdering()).to.deep.equal(["test1", "test2"]);
        });
    });

    it('getGroupByAggEvalStr should work', () => {
        const colName = 'a';
        const tests = [{
            op: 'stdevp',
            expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), count(a)))'
        }, {
            op: 'stdev',
            expect: 'sqrt(div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1)))'
        }, {
            op: 'varp',
            expect: 'div(sum(pow(sub(a, avg(a)), 2)), count(a))'
        }, {
            op: 'var',
            expect: 'div(sum(pow(sub(a, avg(a)), 2)), sub(count(a), 1))'
        }, {
            op: 'min',
            expect: 'min(a)'
        }];

        tests.forEach((test) => {
            const evalStr = DagNode.getGroupByAggEvalStr({
                aggColName: colName,
                operator: test.op
            });
            expect(evalStr).to.equal(test.expect);
        });
    });

    it('getAggsFromEvalStrs should work', () => {
        const tests = [{
            op: [{evalString: 'add(^a)'}],
            expect: ['^a']
        }, {
            op: [{evalString: 'add(3, ^a)'}],
            expect: ['^a']
        }, {
            op: [{evalString: 'add(^a,^b)'}],
            expect: ['^a','^b']
        }, {
            op: [{evalString: 'add(a,b)'}],
            expect: []
        }, {
            op: [{evalString: 'add(^a, eq(c, ^b, gt(^d, ^e, f)))'}],
            expect: ['^a', '^b', '^d', '^e']
        }];

        tests.forEach((test) => {
            const aggs = DagNode.getAggsFromEvalStrs(test.op);
            expect(aggs).to.deep.equal(test.expect);
        });
    });

    it("set title should work", () => {
        const node = new DagNode();
        node.registerEvents(DagNodeEvents.TitleChange, (info) => {
            expect(node.getId()).to.equal(info.id);
            expect(info.title).to.equal("testTitle")
            expect(info.node).to.equal(node);
        });

        node.setTitle("testTitle", true);
        expect(node.getTitle()).to.equal("testTitle");
    });

    it

    describe("column deltas", () => {
        let node;
        before(() => {
            let nodeInfo = {
                "version": 1,
                "type": "filter",
                "subType": null,
                "display": {
                    "x": 200,
                    "y": 40
                },
                "description": "",
                "title": "classes#3",
                "input": {
                    "evalString": "neq(classes::class_id, 6)"
                },
                "id": "XcalarSDK-_1564530357771_3187",
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "columnDeltas": [
                    {
                        "name": "classes::class_name",
                        "widthChange": {
                            "width": 196,
                            "sizedTo": "auto",
                            "isMinimized": false
                        }
                    }
                ],
                "columnOrdering": [
                    "classes::class_name",
                    "classes::class_id",
                    "DATA"
                ],
                "parents": []
            };
            node = new DagNode(nodeInfo);
        });
        it("should getColumnDeltas and reset", () => {
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.get("classes::class_name").widthChange).to.deep.equal({width: 196, sizedTo: "auto", isMinimized: false});

            let called = false;
            node.registerEvents(DagNodeEvents.LineageChange, (info) => {
                expect(node).to.equal(node);
                expect(info.columnDeltas.size).to.equal(0);
                called = true;
            });

            node.resetColumnDeltas();
            expect(called).to.be.true;

        });
        it("should getColumnOrdering and reset", () => {
            let res = node.getColumnOrdering();
            expect(res).to.deep.equal(["classes::class_name", "classes::class_id", "DATA"]);

            let called = false;
            node.registerEvents(DagNodeEvents.LineageChange, (info) => {
                expect(node).to.equal(info.node);
                expect(info.columnOrdering).to.deep.equal([]);
                called = true;
            });

            node.resetColumnOrdering();
            expect(called).to.be.true;
        });
    });

    it("should get minParents", () => {
        let node = new DagNode();
        expect(node.getMinParents()).to.be.undefined;
        node.minParents = 1;
        expect(node.getMinParents()).to.equal(1);
    });

    it("isSourceNode should work", () => {
        let node = new DagNode();
        node.maxParents = 0;
        expect(node.isSourceNode()).to.be.true;
        node.maxParents = -1;
        expect(node.isSourceNode()).to.be.false;
        node.maxParents = 1;
        expect(node.isSourceNode()).to.be.false;
    });

    it("isOutNode should work", () => {
        let node = new DagNode();
        node.maxChildren = 0;
        expect(node.isOutNode()).to.be.true;
        node.maxChildren = -1;
        expect(node.isOutNode()).to.be.false;
        node.maxChildren = 1;
        expect(node.isOutNode()).to.be.false;
    });


    it("hasNoChildren should work", () => {
        let node = new DagNode();
        node.children = [];
        expect(node.hasNoChildren()).to.be.true;
        node.children = ["test"];
        expect(node.hasNoChildren()).to.be.false;
    });

    it("getNextOpenConnectionIndex", () => {
        let node = new DagNode();

        node.parents = ["test1", "test2"];
        node._canHaveMultiParents = () => true;
        expect(node.getNextOpenConnectionIndex()).to.equal(2);

        node.parents = ["test1", null, "test2"];
        expect(node.getNextOpenConnectionIndex()).to.equal(1);

        node.parents = [];
        expect(node.getNextOpenConnectionIndex()).to.equal(0);

        node.parents = ["test1", "test2"];
        node.maxParents = 2;
        node._canHaveMultiParents = () => false;
        expect(node.getNextOpenConnectionIndex()).to.equal(-1);

        node.parents = ["test1"];
        node.maxParents = 2;
        node._canHaveMultiParents = () => false;
        expect(node.getNextOpenConnectionIndex()).to.equal(1);


        node.parents = ["test1"];
        node.maxParents = 1;
        node._canHaveMultiParents = () => false;
        expect(node.getNextOpenConnectionIndex()).to.equal(-1);
    });

    describe("execution progress", () => {
        let node;
        before(() => {
            node = new DagNode();
        });
        it("initialize progress should work", () => {
            node.initializeProgress(["tableA"]);
            expect(true).to.be.true;
            expect(node.runStats).to.deep.equal({
                "hasRun": false,
                "nodes": {
                    "tableA": {
                        "startTime": null,
                        "pct": 0,
                        "state": 2,
                        "numRowsTotal": 0,
                        "numWorkCompleted": 0,
                        "numWorkTotal": 0,
                        "skewValue": 0,
                        "elapsedTime": 0,
                        "size": 0,
                        "rows": [],
                        "hasStats": false
                    }
                },
                "needsClear": false
            });
        });
        it("update progress should work", () => {
            let map = new Map();
            map.set("tableA", {
                "name": {
                    "name": "tableA"
                },
                "tag": "dag_5D40D6B4265E6B2C_1564623650068_37",
                "comment": "",
                "dagNodeId": "113436",
                "api": 24,
                "state": 5,
                "numWorkCompleted": 6,
                "numWorkTotal": 6,
                "elapsed": {
                    "milliseconds": 7
                },
                "inputSize": 49953,
                "input": {
                    "mapInput": {
                        "source": "sourceTable",
                        "dest": "tableA",
                        "eval": [
                            {
                                "evalString": "add(1,2)",
                                "newField": "a"
                            }
                        ],
                        "icv": false
                    }
                },
                "numRowsTotal": 6,
                "numNodes": 2,
                "numRowsPerNode": [
                    3,
                    3
                ],
                "sizeTotal": 0,
                "sizePerNode": [],
                "status": 0,
                "index": 113436
            });
            node.updateProgress(map, true, true);
            expect(true).to.be.true;
            expect(node.getState()).to.equal("Complete");
            expect(node.runStats.hasRun).to.be.true;
            let tableStats = node.runStats.nodes["tableA"];
            expect(tableStats.elapsedTime).to.equal(7);
            expect(tableStats.numRowsTotal).to.equal(6);
            expect(tableStats.numWorkCompleted).to.equal(6);
            expect(tableStats.numWorkTotal).to.equal(6);
            expect(tableStats.pct).to.equal(100);
            expect(tableStats.state).to.equal(5);
            expect(tableStats.skewValue).to.equal(0);
        });
        it("get overall stats should work", () => {
            let res = node.getOverallStats();
            expect(res).to.deep.equal({
                curStep: 1,
                curStepPct: 100,
                pct: 100,
                rows: 6,
                size: 49953,
                skewValue: 0,
                started: true,
                state: 5,
                time: 7
            });
        });
        it("get individual stats should work", () => {
            let res = node.getIndividualStats();

            expect(res).to.deep.equal([
                {
                    "startTime": null,
                    "pct": 100,
                    "state": 5,
                    "numRowsTotal": 6,
                    "numWorkCompleted": 6,
                    "numWorkTotal": 6,
                    "skewValue": 0,
                    "elapsedTime": 7,
                    "size": 49953,
                    "rows": [
                        3,
                        3
                    ],
                    "index": 113436,
                    "hasStats": true,
                    "name": "tableA",
                    "type": 24
                }
            ]);
        });

        it("update progress with error should work", () => {
            let node = new DagNode();
            node.state = DagNodeState.Running;
            let map = new Map();
            map.set("tableA", {
                    "name": {
                        "name": "tableA"
                    },
                    "tag": "dag_5D40D6B4265E6B2C_1564623650068_37",
                    "comment": "",
                    "dagNodeId": "113436",
                    "api": 24,
                    "state": DgDagStateT.DgDagStateError,
                    "numWorkCompleted": 6,
                    "numWorkTotal": 6,
                    "elapsed": {
                        "milliseconds": 7
                    },
                    "inputSize": 49953,
                    "input": {
                        "mapInput": {
                            "source": "sourceTable",
                            "dest": "tableA",
                            "eval": [
                                {
                                    "evalString": "add(1,2)",
                                    "newField": "a"
                                }
                            ],
                            "icv": false
                        }
                    },
                    "numRowsTotal": 6,
                    "numNodes": 2,
                    "numRowsPerNode": [
                        3,
                        3
                    ],
                    "sizeTotal": 0,
                    "sizePerNode": [],
                    "status": 0,
                    "index": 113436
                }
            );
            node.updateProgress(map, true, true);

            expect(true).to.be.true;
            expect(node.getState()).to.equal("Error");
            expect(node.runStats.hasRun).to.be.true;
            let tableStats = node.runStats.nodes["tableA"];
            expect(tableStats.elapsedTime).to.equal(7);
            expect(tableStats.numRowsTotal).to.equal(6);
            expect(tableStats.numWorkCompleted).to.equal(6);
            expect(tableStats.numWorkTotal).to.equal(6);
            expect(tableStats.pct).to.equal(0);
            expect(tableStats.state).to.equal(7);
            expect(tableStats.skewValue).to.equal(0);
        });
    });

    it("parseValidationErrMsg", () => {
        let node = new DagNode();
        let res = DagNode.parseValidationErrMsg(node, {
            dataPath: ".path/columns",
            message: "error occurred",
            keyword: "enum",
            params: {allowedValues: ["allowedValue"]}
        });
        expect(res).to.equal("path/columns error occurred: allowedValue");

        res = DagNode.parseValidationErrMsg(node, {
            dataPath: "",
            message: "error occurred",
            keyword: "additionalProperties",
            params: {additionalProperty: "additionalProperty"}
        });
        expect(res).to.equal("Node error occurred: additionalProperty");


        res = DagNode.parseValidationErrMsg(node, {
            dataPath: "",
            message: "error occurred",
            keyword: "none",
            params: {additionalProperty: "additionalProperty"}
        }, true);
        expect(res).to.equal("Comment error occurred");
    });

    it("findParentIndices", () => {
        let node = new DagNode();
        let parentNode = new DagNode();
        let otherParentNode = new DagNode();
        node.getParents = () => [parentNode, otherParentNode, otherParentNode];
        expect(node.findParentIndices(new DagNode())).to.deep.equal([]);
        expect(node.findParentIndices(parentNode)).to.deep.equal([0]);
        expect(node.findParentIndices(otherParentNode)).to.deep.equal([1,2]);
    });

    it("replaceColumnInEvalStr", () => {
        let node = new DagNode();
        let res = node._replaceColumnInEvalStr("add(colA)", {"colA": "colB"});
        expect(res).to.equal("add(colB)");

        res = node._replaceColumnInEvalStr("add(colA)", {"colB": "colC"});
        expect(res).to.equal("add(colA)");

        res = node._replaceColumnInEvalStr("add(colA, eq(colB, colC))", {"colA": "colB", "colC": "colD"});
        expect(res).to.equal("add(colB,eq(colB,colD))");

        res = node._replaceColumnInEvalStr("add(1,2)",{"colA": "colB", "colC": "colD"});
        expect(res).to.equal("add(1,2)");
    });
});
